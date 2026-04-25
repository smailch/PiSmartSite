import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
const Groq = require('groq-sdk');

// ══════════════════════════════════════════════════════════════════
//  SMARTSITE APP KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════════
const SMARTSITE_KNOWLEDGE = `
You are the SmartSite AI Assistant — a helpful chatbot for the SmartSite construction management platform.

## About SmartSite
SmartSite is a construction site management platform that helps teams manage projects, tasks, budgets, resources, and teams efficiently using AI.

## App Pages & Features
- **Dashboard (/)** → Overview of all projects, key metrics, and activity feed
- **Projects (/projects)** → Create, view, edit, and delete construction projects. Each project has a name, type, budget, location, start/end dates, and status. You can also:
  - Generate AI tasks automatically with Gemini AI (✨ button)
  - Get AI project analysis with Groq (🧠 button)
  - Chat with the project AI assistant (💬 button)
  - View Gantt chart for timeline visualization
- **Jobs (/jobs)** → Manage job positions and assignments on construction sites
- **Tasks (/tasks)** → View and manage tasks in Kanban board or list view. Tasks have priority, status, duration, and dependencies
- **Reports (/reports)** → View project reports and analytics
- **Team (/team)** → Manage team members and their roles
- **Budget (/budget)** → Track project budgets and spending
- **Alerts (/alerts-log)** → [Admin only] View security audit logs and suspicious activity detected by AI
- **Users (/users)** → [Admin only] Create, edit, delete user accounts and assign roles
- **Profile (/profile)** → Edit your personal information, change password, and register Face ID

## User Roles
- **Admin** → Full access to everything including user management and security alerts
- **Director** → Can view all projects, respond to client questions, access reports
- **Site Engineer** → Manages jobs, tasks, and resources on construction sites
- **Accountant** → Manages budgets and financial reports
- **Client** → Can view their assigned projects and ask questions via AI assistant

## Authentication Features
- Email + password login
- Face ID login (AI facial recognition — must first register in Profile page)
- Forgot password via email reset link

## AI Features in SmartSite
- **Gemini AI Task Generator** → Auto-generates tasks from project description
- **Groq Project Analyzer** → Analyzes budget, delays, and risks
- **Groq Project Assistant** → Chat about specific project details
- **Face ID** → AI facial recognition for secure login
- **Security AI** → Detects suspicious login patterns automatically
- **SmartSite AI Assistant (this chatbot)** → Answers your questions about the app

## IMPORTANT TRANSFER RULE
When the client mentions a complaint, urgent problem, contract modification, legal issue, safety emergency, or asks to speak with a human:
1. Write ONLY this exact tag on the first line: [TRANSFER_TO_DIRECTOR]
2. Then write a SHORT message telling the client their request is being forwarded.
DO NOT simulate a Director response. DO NOT roleplay as the Director.

For all other questions, answer helpfully in English.
`;

@Injectable()
export class MessagingService {
    private groq: any;

    constructor(
        @InjectModel(Message.name)
        private messageModel: Model<MessageDocument>,
    ) {
        this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }

    // ── Client envoie une question ────────────────────────────────
    async askQuestion(
        clientId: string,
        clientName: string,
        question: string,
        conversationId: string,
        sessionHistory: Array<{ role: string; content: string }>,
    ) {
        // 1. Appel Groq avec contexte
        const messages = [
            { role: 'system', content: SMARTSITE_KNOWLEDGE },
            ...sessionHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user' as const, content: `Client name: ${clientName}\n\nQuestion: ${question}` },
        ];

        let aiResponse = '';
        try {
            const response = await this.groq.chat.completions.create({
                model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                messages,
                max_tokens: 300,
            });
            aiResponse = response.choices[0]?.message?.content?.trim() || 'I could not process your request.';
        } catch {
            aiResponse = 'AI service temporarily unavailable. Your message will be forwarded to the Director.';
        }

        // 2. Vérifier si transfert nécessaire
        const transferKeywords = [
            '[TRANSFER_TO_DIRECTOR]',
            'TRANSFERING CALL TO DIRECTOR',
            'TRANSFER COMPLETE',
            'transferring you to the Director',
            'connect you with the Director',
            'transfer',
        ];
        const needsTransfer =
            aiResponse.includes('[TRANSFER_TO_DIRECTOR]') ||
            transferKeywords.some(kw => aiResponse.toLowerCase().includes(kw.toLowerCase()));

        if (needsTransfer) {
            // Nettoyer la réponse
            const cleanResponse = aiResponse.replace('[TRANSFER_TO_DIRECTOR]', '').trim() ||
                'Your request requires attention from our Director. I have forwarded your message and you will receive a response shortly.';

            // Sauvegarder en MongoDB — message client + réponse AI
            await this.messageModel.create({
                conversationId,
                clientId: new Types.ObjectId(clientId),
                clientName,
                senderRole: 'Client',
                content: question,
                transferredToDirector: true,
                status: 'pending',
            });

            await this.messageModel.create({
                conversationId,
                clientId: new Types.ObjectId(clientId),
                clientName,
                senderRole: 'AI',
                content: cleanResponse,
                transferredToDirector: true,
                status: 'pending',
            });

            return {
                response: cleanResponse,
                transferredToDirector: true,
                conversationId,
            };
        }

        // 3. Réponse simple — pas de sauvegarde
        return {
            response: aiResponse,
            transferredToDirector: false,
            conversationId,
        };
    }

    // ── Director voit toutes les conversations ────────────────────
    async getAllConversations() {
        // Grouper par conversationId
        const messages = await this.messageModel
            .find({ transferredToDirector: true })
            .sort({ createdAt: 1 })
            .populate('clientId', 'fullName email')
            .lean();

        // Grouper par conversationId
        const grouped: Record<string, any> = {};
        for (const msg of messages) {
            if (!grouped[msg.conversationId]) {
                grouped[msg.conversationId] = {
                    conversationId: msg.conversationId,
                    clientId: msg.clientId,
                    clientName: msg.clientName,
                    status: msg.status,
                    messages: [],
                    createdAt: (msg as any).createdAt,
                };
            }
            grouped[msg.conversationId].messages.push(msg);
            // Status = replied si au moins un message du Director
            if (msg.senderRole === 'Director') {
                grouped[msg.conversationId].status = 'replied';
            }
        }

        return Object.values(grouped).sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }

    // ── Director répond ───────────────────────────────────────────
    async directorReply(
        conversationId: string,
        directorId: string,
        directorName: string,
        content: string,
    ) {
        // Vérifier que la conversation existe
        const existing = await this.messageModel.findOne({ conversationId });
        if (!existing) throw new NotFoundException('Conversation not found');

        // Sauvegarder la réponse du Director
        const reply = await this.messageModel.create({
            conversationId,
            clientId: existing.clientId,
            clientName: existing.clientName,
            senderRole: 'Director',
            content,
            transferredToDirector: true,
            status: 'replied',
        });

        // Mettre à jour le status de tous les messages de cette conversation
        await this.messageModel.updateMany(
            { conversationId },
            { status: 'replied' },
        );

        return reply;
    }

    // ── Client récupère sa conversation ──────────────────────────
    async getClientConversation(clientId: string, conversationId: string) {
        return this.messageModel
            .find({ conversationId, clientId: new Types.ObjectId(clientId) })
            .sort({ createdAt: 1 })
            .lean();
    }

    // ── Vérifier s'il y a une réponse du Director ─────────────────
    async checkDirectorReply(conversationId: string) {
        const directorMessages = await this.messageModel.find({
            conversationId,
            senderRole: 'Director',
        }).lean();
        return directorMessages;
    }
}