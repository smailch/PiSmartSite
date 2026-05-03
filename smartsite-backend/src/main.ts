import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bodyParser from 'body-parser';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module';
import { HUMAN_UPLOAD_DIR } from './human-resources/multer-human.config';
import { PROGRESS_UPLOAD_DIR } from './jobs/multer-progress.config';

/** Diagnostics Railway : rejets / exceptions hors try/catch visibles dans les logs. */
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

/** Aide diagnostic Railway : quelle clé d’environnement porte l’URI Mongo (valeur jamais loggée). */
function mongoEnvKeyHint(): string {
  const keys = [
    'MONGO_URL',
    'MONGO_URI',
    'MONGODB_URI',
    'SMARTSITE_MONGODB_URI',
  ] as const;
  for (const k of keys) {
    if (process.env[k]?.trim()) return k;
  }
  const d = process.env.DATABASE_URL?.trim();
  if (
    d?.startsWith('mongodb://') ||
    d?.startsWith('mongodb+srv://')
  ) {
    return 'DATABASE_URL';
  }
  return '(aucune URI Mongo détectée dans process.env)';
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log(
    `Bootstrap: démarrage — cwd=${process.cwd()} NODE_ENV=${process.env.NODE_ENV ?? 'unset'} PORT=${process.env.PORT ?? 'unset'} mongo_env=${mongoEnvKeyHint()}`,
  );
  const uploadsRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  if (!existsSync(PROGRESS_UPLOAD_DIR)) {
    mkdirSync(PROGRESS_UPLOAD_DIR, { recursive: true });
  }
  if (!existsSync(HUMAN_UPLOAD_DIR)) {
    mkdirSync(HUMAN_UPLOAD_DIR, { recursive: true });
  }
  const progressPhotosDir = join(process.cwd(), 'uploads', 'progress-photos');
  if (!existsSync(progressPhotosDir)) {
    mkdirSync(progressPhotosDir, { recursive: true });
  }

  const isProd = process.env.NODE_ENV === 'production';
  logger.log(
    'Bootstrap: NestFactory.create(AppModule) — étape critique (ConfigModule / validateGroqEnv / MongooseModule)',
  );
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] : undefined,
  });
  logger.log(
    'Bootstrap: contexte Nest chargé (modules initialisés, y compris ConfigModule)',
  );

  try {
    const cfg = app.get(ConfigService);
    logger.log(
      `Bootstrap: ConfigService OK — ignoreEnvFile(prod)=${isProd} GROQ_MODEL=${cfg.get<string>('GROQ_MODEL') ?? 'unset'}`,
    );
  } catch (e) {
    logger.warn(
      `Bootstrap: ConfigService non lisible (inattendu): ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  try {
    const conn = app.get<Connection>(getConnectionToken());
    const state = conn.readyState;
    const stateLabel =
      state === 1
        ? 'connected'
        : state === 2
          ? 'connecting'
          : state === 0
            ? 'disconnected'
            : String(state);
    logger.log(`MongoDB: readyState=${state} (${stateLabel})`);
    if (state !== 1) {
      conn.once('connected', () =>
        logger.log('MongoDB: événement connected — pool prêt'),
      );
    }
    conn.on('error', (err: Error) => {
      logger.error(`MongoDB: erreur driver — ${err.message}`, err.stack);
    });
  } catch (e) {
    logger.warn(
      `Bootstrap: suivi connexion Mongo indisponible: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];
  const normalizeOrigin = (o: string) => o.trim().replace(/\/$/, '');
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowAllWildcard =
    fromEnv.length === 1 && (fromEnv[0] === '*' || fromEnv[0] === '**');
  const explicitAllowed = [
    ...new Set(
      fromEnv.filter((o) => o !== '*' && o !== '**').map(normalizeOrigin),
    ),
  ];
  const devAllowed = new Set(devOrigins.map(normalizeOrigin));

  if (isProd && allowAllWildcard) {
    logger.warn(
      'CORS_ORIGINS=* : toutes les origines navigateur sont acceptées. Préférez une liste d’URLs en production.',
    );
  }
  if (isProd && !fromEnv.length) {
    logger.warn(
      'CORS_ORIGINS vide en production — les clients navigateur seront refusés tant qu’aucune origine n’est définie.',
    );
  }
  if (isProd) {
    logger.log(
      `CORS (prod) : ${allowAllWildcard ? 'wildcard (*)' : `${explicitAllowed.length} origine(s)`}`,
    );
  }

  /**
   * Callback `origin` : compatible `credentials: true` (réflexion de l’origine autorisée).
   * Ne pas ajouter un 2e middleware qui force `Access-Control-Allow-Origin: *` : interdit avec credentials.
   */
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const n = normalizeOrigin(origin);
      if (allowAllWildcard) {
        return callback(null, true);
      }
      if (!isProd) {
        if (devAllowed.has(n) || explicitAllowed.includes(n)) {
          return callback(null, true);
        }
        return callback(null, false);
      }
      if (explicitAllowed.includes(n)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  });

  app.use('/payments/webhook', bodyParser.raw({ type: 'application/json' }));

  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  /** Railway injecte `PORT` : ne pas forcer 3200 (le proxy ne joindrait pas le process). */
  const rawPort = process.env.PORT;
  const parsed = rawPort ? Number.parseInt(rawPort, 10) : NaN;
  const port =
    Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
  logger.log(`Bootstrap: app.listen(0.0.0.0, ${port}) — en attente du bind TCP…`);
  await app.listen(port, '0.0.0.0');
  logger.log(
    `Bootstrap: serveur HTTP à l’écoute sur 0.0.0.0:${port} — prêt pour le proxy Railway`,
  );
}
bootstrap().catch((err: unknown) => {
  const bootLogger = new Logger('Bootstrap');
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  bootLogger.error(
    `Bootstrap: échec avant ou pendant app.listen — le proxy Railway renverra 502 / connection refused. Cause: ${msg}`,
    stack,
  );
  console.error('Bootstrap fatal:', msg);
  if (stack) console.error(stack);
  process.exit(1);
});
