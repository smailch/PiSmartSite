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

function resolveMongoUri(config: ConfigService): string | undefined {
  const fromConfig =
    config.get<string>('MONGODB_URI')?.trim() ||
    config.get<string>('MONGO_URI')?.trim() ||
    config.get<string>('SMARTSITE_MONGODB_URI')?.trim();
  if (fromConfig) return fromConfig;
  return (
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGO_URI?.trim() ||
    process.env.SMARTSITE_MONGODB_URI?.trim()
  );
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
            'MongoDB connection string is missing. Set MONGO_URI (or MONGODB_URI) in the environment.',
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
