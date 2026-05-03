import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { MongooseModule } from '@nestjs/mongoose';
import { validateGroqEnv } from './analysis-ai/groq-env.validation';
import { AnalysisAiModule } from './analysis-ai/analysis-ai.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuditLogModule } from './audit-logs/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { DreamHouseModule } from './dream-house/dream-house.module';
import { EquipmentResourcesModule } from './equipment-resources/equipment-resources.module';
import { FinanceModule } from './modules/finance/finance.module';
import { InvoicesModule } from './modules/finance/invoices/invoices.module';
import { PaymentsModule } from './modules/finance/payments/payments.module';
import { ReportsModule } from './modules/finance/reports/reports.module';
import { HumanResourcesModule } from './human-resources/human-resources.module';
import { JobsModule } from './jobs/jobs.module';
import { MessagingModule } from './messaging/messaging.module';
import { ProgressPhotosModule } from './progress-photos/progress-photos.module';
import { ProjectsModule } from './projects/projects.module';
import { ResourcesModule } from './resources/resources.module';
import { RolesModule } from './roles/roles.module';
import { TasksModule } from './tasks/tasks.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';

/**
 * Backend package root. `dist/` is emitted from `./src` only (`tsconfig.build.json`).
 */
const backendRoot = join(process.cwd());
const envFilePathForConfig = [
  join(backendRoot, '.env.local'),
  join(backendRoot, '.env'),
];
if (basename(backendRoot) !== 'smartsite-backend') {
  const nested = join(backendRoot, 'smartsite-backend', '.env');
  if (existsSync(nested)) envFilePathForConfig.push(nested);
}

/** Railway MongoDB template expose `MONGO_URL` ; éviter DATABASE_URL non-Mongo (ex. Postgres). */
function mongoLikeUri(v: string | undefined): string | undefined {
  const t = v?.trim();
  if (!t) return undefined;
  if (t.startsWith('mongodb://') || t.startsWith('mongodb+srv://')) return t;
  return undefined;
}

function resolveMongoUri(config: ConfigService): string | undefined {
  const candidates = [
    config.get<string>('MONGODB_URI'),
    config.get<string>('MONGO_URI'),
    config.get<string>('SMARTSITE_MONGODB_URI'),
    config.get<string>('MONGO_URL'),
    mongoLikeUri(config.get<string>('DATABASE_URL')),
    process.env.MONGODB_URI,
    process.env.MONGO_URI,
    process.env.SMARTSITE_MONGODB_URI,
    process.env.MONGO_URL,
    mongoLikeUri(process.env.DATABASE_URL),
  ];
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return undefined;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePathForConfig,
      validate: validateGroqEnv,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = resolveMongoUri(config);
        if (!uri) {
          throw new Error(
            'MongoDB connection string is missing. Set one of: MONGO_URL (Railway Mongo), MONGO_URI, MONGODB_URI, SMARTSITE_MONGODB_URI, or DATABASE_URL (mongodb:// / mongodb+srv:// only).',
          );
        }
        return { uri };
      },
    }),
    JobsModule,
    AuditLogModule,
    ResourcesModule,
    ProjectsModule,
    TasksModule,
    UsersModule,
    RolesModule,
    AuthModule,
    HumanResourcesModule,
    EquipmentResourcesModule,
    AnalysisAiModule,
    MessagingModule,
    TelegramModule,
    InvoicesModule,
    PaymentsModule,
    ReportsModule,
    FinanceModule,
    AttendanceModule,
    DocumentsModule,
    ProgressPhotosModule,
    DreamHouseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
