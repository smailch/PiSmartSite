import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';
import { isValidObjectId } from 'mongoose';
import { AnalysisAiService } from '../analysis-ai/analysis-ai.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import type { Project } from '../projects/schemas/project.schema';
import type { TaskDocument } from '../tasks/schemas/task.schema';

function mongoId(p: Project): string {
  const id = (p as unknown as { _id?: { toString(): string } })._id;
  return id != null ? String(id) : '';
}

const TASKS_PAGE_SIZE = 6;
const PROJECT_LIST_PAGE_SIZE = 8;
const CB_TASK = 't:';
const CB_BACK_PROJECT = 'pb:';
const CB_PAGE = 'pp:';
const CB_PROJECT_OPEN = 'pj:';
const CB_PROJECT_LIST = 'pl:';
/** Mode questions — même métier que POST .../analysis/assistant/chat (sans casser le front). */
const CB_IA_CHAT = 'iq:';

const TELEGRAM_TEXT_MAX = 4080;
/** Garde une marge sous la limite du DTO (14 messages). */
const MAX_CHAT_HISTORY_MESSAGES = 12;
const MAX_QUESTION_LENGTH = 8000;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type TelegramSession = {
  projectId: string;
  mode: 'browse' | 'chat';
  messages: ChatTurn[];
};

function truncate(text: string, max: number): string {
  const s = text.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function splitTelegramChunks(text: string, max = TELEGRAM_TEXT_MAX): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + max));
    i += max;
  }
  return chunks;
}

function fmtDate(d: unknown): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
}

function assigneeLabel(task: TaskDocument): string | undefined {
  const a = task.assignedTo as unknown;
  if (!a || typeof a !== 'object') return undefined;
  const name = (a as { name?: string }).name;
  return typeof name === 'string' && name.trim() ? name.trim() : undefined;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;
  /** Session par chat (privé) — indépendante du front. */
  private readonly sessions = new Map<string, TelegramSession>();

  constructor(
    private readonly config: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly analysisAiService: AnalysisAiService,
  ) {}

  private chatIdFromCtx(chatId: number | undefined): string {
    return String(chatId ?? '');
  }

  private setBrowse(chatId: string, projectId: string) {
    this.sessions.set(chatId, {
      projectId,
      mode: 'browse',
      messages: [],
    });
  }

  private setChat(chatId: string, projectId: string) {
    this.sessions.set(chatId, {
      projectId,
      mode: 'chat',
      messages: [],
    });
  }

  private clearSession(chatId: string) {
    this.sessions.delete(chatId);
  }

  async onModuleInit(): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN absent — bot Telegram non démarré');
      return;
    }

    const bot = new Bot(token);
    this.bot = bot;

    bot.catch((err) => {
      this.logger.error('Erreur Telegram', err);
    });

    bot.command('start', async (ctx) => {
      const chatId = this.chatIdFromCtx(ctx.chat?.id);
      const text = ctx.message?.text ?? '';
      const parts = text.trim().split(/\s+/);
      const payload = parts.length > 1 ? parts[1] : undefined;

      try {
        if (!payload) {
          this.clearSession(chatId);
          const { text: msg, keyboard } = await this.buildProjectListView(0);
          await ctx.reply(msg, { reply_markup: keyboard });
          return;
        }

        if (!isValidObjectId(payload)) {
          await ctx.reply('ID projet invalide (lien QR ou /start).');
          return;
        }

        this.setBrowse(chatId, payload);
        const { text: msg, keyboard } = await this.buildProjectView(payload, 0);
        await ctx.reply(msg, { reply_markup: keyboard });
      } catch (e: unknown) {
        if (e instanceof NotFoundException) {
          await ctx.reply('Projet introuvable.');
          return;
        }
        this.logger.warn(e);
        await ctx.reply('Erreur lors du chargement.');
      }
    });

    bot.command('taches', async (ctx) => {
      const chatId = this.chatIdFromCtx(ctx.chat?.id);
      const session = this.sessions.get(chatId);
      if (!session?.projectId) {
        await ctx.reply('Ouvre d’abord un projet via /start.');
        return;
      }
      try {
        this.setBrowse(chatId, session.projectId);
        const { text: msg, keyboard } = await this.buildProjectView(session.projectId, 0);
        await ctx.reply(msg, { reply_markup: keyboard });
      } catch (e: unknown) {
        if (e instanceof NotFoundException) {
          await ctx.reply('Projet introuvable.');
          return;
        }
        this.logger.warn(e);
        await ctx.reply('Erreur lors du chargement des tâches.');
      }
    });

    bot.on('message:text', async (ctx) => {
      const chatId = this.chatIdFromCtx(ctx.chat?.id);
      const raw = ctx.message?.text ?? '';
      if (raw.trimStart().startsWith('/')) return;

      const session = this.sessions.get(chatId);
      if (!session || session.mode !== 'chat') return;

      const question = truncate(raw, MAX_QUESTION_LENGTH);
      if (!question) return;

      try {
        const nextMessages: ChatTurn[] = [
          ...session.messages,
          { role: 'user', content: question },
        ];
        const { reply } = await this.analysisAiService.chatProject(session.projectId, {
          messages: nextMessages.slice(-MAX_CHAT_HISTORY_MESSAGES),
        });

        const withReply: ChatTurn[] = [
          ...nextMessages,
          { role: 'assistant', content: reply },
        ];
        session.messages = withReply.slice(-MAX_CHAT_HISTORY_MESSAGES);

        const chunks = splitTelegramChunks(reply);
        const retourKb = new InlineKeyboard().text(
          '📋 Retour aux tâches',
          `${CB_BACK_PROJECT}${session.projectId}`,
        );
        for (let i = 0; i < chunks.length; i++) {
          const prefix =
            chunks.length > 1 ? `( ${i + 1}/${chunks.length} )\n\n` : '';
          await ctx.reply(prefix + chunks[i], {
            reply_markup: i === chunks.length - 1 ? retourKb : undefined,
          });
        }
      } catch (e: unknown) {
        this.logger.warn(e);
        let userMsg =
          'L’assistant est temporairement indisponible. Réessaie dans un instant.';
        if (e instanceof HttpException) {
          if (e.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
            userMsg = 'Trop de demandes API. Patientes une minute puis réessaie.';
          }
        }
        await ctx.reply(userMsg);
      }
    });

    bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const chatId = this.chatIdFromCtx(ctx.chat?.id);
      await ctx.answerCallbackQuery();

      try {
        if (data.startsWith(CB_IA_CHAT)) {
          const pid = data.slice(CB_IA_CHAT.length);
          if (!isValidObjectId(pid)) {
            await ctx.reply('Action invalide.');
            return;
          }
          this.setChat(chatId, pid);
          const keyboard = new InlineKeyboard().text(
            '📋 Retour aux tâches',
            `${CB_BACK_PROJECT}${pid}`,
          );
          await ctx.reply(
            [
              '💬 Mode questions — même assistant que sur le tableau projet (web).',
              '',
              'Écris ta question : planning, budget, tâches, risques…',
              'Réponses basées uniquement sur les données SmartSite.',
              '',
              'Pour revenir aux boutons tâches : /taches ou le bouton ci-dessous.',
            ].join('\n'),
            { reply_markup: keyboard },
          );
          return;
        }

        if (data.startsWith(CB_TASK)) {
          const id = data.slice(CB_TASK.length);
          if (!isValidObjectId(id)) {
            await ctx.reply('Action invalide.');
            return;
          }
          const task = await this.tasksService.findOne(id);
          const pid = String(task.projectId);
          this.setBrowse(chatId, pid);
          const lines = [
            `📌 ${task.title}`,
            `Statut : ${task.status} — ${task.progress ?? 0}%`,
            `Priorité : ${task.priority} — durée : ${task.duration} j.`,
            `Début : ${fmtDate(task.startDate)} — fin : ${fmtDate(task.endDate)}`,
          ];
          const who = assigneeLabel(task as TaskDocument);
          if (who) lines.push(`Assigné : ${who}`);
          if (task.description?.trim()) {
            lines.push('', truncate(task.description, 800));
          }
          const keyboard = new InlineKeyboard().text(
            '← Retour au projet',
            `${CB_BACK_PROJECT}${pid}`,
          );
          await ctx.editMessageText(lines.join('\n'), { reply_markup: keyboard });
          return;
        }

        if (data.startsWith(CB_BACK_PROJECT)) {
          const pid = data.slice(CB_BACK_PROJECT.length);
          if (!isValidObjectId(pid)) {
            await ctx.reply('Action invalide.');
            return;
          }
          this.setBrowse(chatId, pid);
          const { text: msg, keyboard } = await this.buildProjectView(pid, 0);
          await ctx.editMessageText(msg, { reply_markup: keyboard });
          return;
        }

        if (data.startsWith(CB_PAGE)) {
          const rest = data.slice(CB_PAGE.length);
          const lastColon = rest.lastIndexOf(':');
          if (lastColon <= 0) {
            await ctx.reply('Action invalide.');
            return;
          }
          const pid = rest.slice(0, lastColon);
          const pageRaw = rest.slice(lastColon + 1);
          const page = Number.parseInt(pageRaw, 10);
          if (!isValidObjectId(pid) || !Number.isFinite(page) || page < 0) {
            await ctx.reply('Action invalide.');
            return;
          }
          this.setBrowse(chatId, pid);
          const { text: msg, keyboard } = await this.buildProjectView(pid, page);
          await ctx.editMessageText(msg, { reply_markup: keyboard });
          return;
        }

        if (data.startsWith(CB_PROJECT_OPEN)) {
          const pid = data.slice(CB_PROJECT_OPEN.length);
          if (!isValidObjectId(pid)) {
            await ctx.reply('Action invalide.');
            return;
          }
          this.setBrowse(chatId, pid);
          const { text: msg, keyboard } = await this.buildProjectView(pid, 0);
          await ctx.editMessageText(msg, { reply_markup: keyboard });
          return;
        }

        if (data.startsWith(CB_PROJECT_LIST)) {
          const pageRaw = data.slice(CB_PROJECT_LIST.length);
          const page = Number.parseInt(pageRaw, 10);
          if (!Number.isFinite(page) || page < 0) {
            await ctx.reply('Action invalide.');
            return;
          }
          this.clearSession(chatId);
          const { text: msg, keyboard } = await this.buildProjectListView(page);
          await ctx.editMessageText(msg, { reply_markup: keyboard });
          return;
        }
      } catch (e: unknown) {
        if (e instanceof NotFoundException) {
          await ctx.editMessageText('Projet ou tâche introuvable.');
          return;
        }
        this.logger.warn(e);
        await ctx.editMessageText('Une erreur est survenue. Réessayez plus tard.');
      }
    });

    void bot
      .start({
        onStart: (me) =>
          this.logger.log(`Telegram bot @${me.username} — polling démarré`),
      })
      .catch((err) => this.logger.error('Échec du démarrage du bot', err));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot?.isRunning()) {
      await this.bot.stop();
      this.logger.log('Telegram bot arrêté');
    }
    this.bot = null;
    this.sessions.clear();
  }

  private async buildProjectView(
    projectId: string,
    page: number,
  ): Promise<{ text: string; keyboard: InlineKeyboard }> {
    const project = await this.projectsService.findOne(projectId);
    let tasks = await this.tasksService.findByProject(projectId);
    tasks = [...tasks].sort((a, b) => {
      const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return tb - ta;
    });

    const header = [
      `📋 ${project.name}`,
      `Statut : ${project.status} — type : ${project.type}`,
      project.location ? `Lieu : ${project.location}` : '',
      typeof project.budget === 'number' ? `Budget : ${project.budget}` : '',
      `Période : ${fmtDate(project.startDate)} → ${fmtDate(project.endDate)}`,
      project.description?.trim()
        ? `\n${truncate(project.description, 500)}`
        : '',
      '',
      `Tâches (${tasks.length}) — ou pose une question à l’assistant :`,
    ]
      .filter(Boolean)
      .join('\n');

    const totalPages = Math.max(1, Math.ceil(tasks.length / TASKS_PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const slice = tasks.slice(
      safePage * TASKS_PAGE_SIZE,
      safePage * TASKS_PAGE_SIZE + TASKS_PAGE_SIZE,
    );

    const taskLines = slice.map((t) => {
      const st = String(t.status ?? '');
      return `• ${truncate(t.title, 60)} (${st})`;
    });
    const body =
      taskLines.length > 0
        ? taskLines.join('\n')
        : '(Aucune tâche pour ce projet.)';

    const footer =
      totalPages > 1
        ? `\n\nPage ${safePage + 1}/${totalPages}`
        : '';

    const text = `${header}\n${body}${footer}`;

    const keyboard = new InlineKeyboard();

    const iaCb = `${CB_IA_CHAT}${projectId}`;
    if (isValidObjectId(projectId) && Buffer.byteLength(iaCb, 'utf8') <= 64) {
      keyboard.text('💬 Question à l’assistant (IA)', iaCb).row();
    }

    for (const t of slice) {
      const id = String(t._id);
      const cb = `${CB_TASK}${id}`;
      if (Buffer.byteLength(cb, 'utf8') > 64) {
        continue;
      }
      keyboard.text(truncate(t.title, 40), cb).row();
    }

    if (totalPages > 1) {
      if (safePage > 0) {
        keyboard.text(
          '◀ Préc.',
          `${CB_PAGE}${projectId}:${safePage - 1}`,
        );
      }
      if (safePage < totalPages - 1) {
        keyboard.text(
          'Suiv. ▶',
          `${CB_PAGE}${projectId}:${safePage + 1}`,
        );
      }
    }

    keyboard.row().text('🏠 Tous les projets', `${CB_PROJECT_LIST}0`);

    return { text, keyboard };
  }

  private async buildProjectListView(
    page: number,
  ): Promise<{ text: string; keyboard: InlineKeyboard }> {
    const all = await this.projectsService.findAll();
    const sorted = [...all].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }),
    );

    if (sorted.length === 0) {
      const keyboard = new InlineKeyboard();
      return {
        text: 'Aucun projet en base pour le moment.',
        keyboard,
      };
    }

    const totalPages = Math.max(1, Math.ceil(sorted.length / PROJECT_LIST_PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const slice = sorted.slice(
      safePage * PROJECT_LIST_PAGE_SIZE,
      safePage * PROJECT_LIST_PAGE_SIZE + PROJECT_LIST_PAGE_SIZE,
    );

    const lines = [
      '📁 Choisissez un projet :',
      '',
      ...slice.map((p) => {
        const st = p.status ?? '';
        return `• ${truncate(p.name, 45)} — ${st}`;
      }),
    ];
    if (totalPages > 1) {
      lines.push('', `Page ${safePage + 1}/${totalPages}`);
    }

    const keyboard = new InlineKeyboard();
    for (const p of slice) {
      const id = mongoId(p);
      const cb = `${CB_PROJECT_OPEN}${id}`;
      if (!isValidObjectId(id) || Buffer.byteLength(cb, 'utf8') > 64) {
        continue;
      }
      const label = `${truncate(p.name, 36)} (${p.status ?? '—'})`;
      keyboard.text(label, cb).row();
    }

    if (totalPages > 1) {
      if (safePage > 0) {
        keyboard.text('◀ Projets', `${CB_PROJECT_LIST}${safePage - 1}`);
      }
      if (safePage < totalPages - 1) {
        keyboard.text('Projets ▶', `${CB_PROJECT_LIST}${safePage + 1}`);
      }
    }

    return { text: lines.join('\n'), keyboard };
  }
}
