import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { validateGroqEnv } from './analysis-ai/groq-env.validation';
import { ResourcesModule } from './resources/resources.module';

/**
 * Racine du package `smartsite-backend/`.
 * En build, `app.module` est émis sous `dist/src/`, donc `join(__dirname, '..')` ne suffit pas
 * pour trouver `.env` à la racine — `process.cwd()` avec `npm run start:dev` depuis ce dossier est fiable.
 */
const backendRoot = join(process.cwd());
import { JobsModule } from './jobs/jobs.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { TelegramModule } from './telegram/telegram.module';
import { HumanResourcesModule } from './human-resources/human-resources.module';
import { EquipmentResourcesModule } from './equipment-resources/equipment-resources.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogModule } from './audit-logs/audit-log.module';
import { MessagingModule } from './messaging/messaging.module';
import { AnalysisAiModule } from './analysis-ai/analysis-ai.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportsModule } from './modules/finance/reports/reports.module';
import { PaymentsModule } from './modules/finance/payments/payments.module';
import { InvoicesModule } from './modules/finance/invoices/invoices.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DocumentsModule } from './documents/documents.module';
import { ProgressPhotosModule } from './progress-photos/progress-photos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(backendRoot, '.env.local'),
        join(backendRoot, '.env'),
        join(backendRoot, '.env.example'),

      ],
      validate: validateGroqEnv,
      ignoreEnvFile: false,    
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/smartsiteloc'
    ),
    JobsModule,
    AuditLogModule,
    ResourcesModule,
    JobsModule,
    ProjectsModule, // Ajout du module Projects
    TasksModule, // Ajout du module Tasks
    UsersModule,
    RolesModule,
    AuthModule,
    HumanResourcesModule,
    EquipmentResourcesModule,
    AnalysisAiModule,
    MessagingModule,
    AnalysisAiModule,
    TelegramModule,
    HumanResourcesModule,
    EquipmentResourcesModule,
    AnalysisAiModule,
    InvoicesModule,
    PaymentsModule,
    ReportsModule,
    FinanceModule,
    AttendanceModule,
    DocumentsModule,
    ProgressPhotosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

