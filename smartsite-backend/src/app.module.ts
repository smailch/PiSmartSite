import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { validateGroqEnv } from './analysis-ai/groq-env.validation';
import { ResourcesModule } from './resources/resources.module';

/**
 * Racine du package `smartsite-backend/`.
 * Le build TypeScript émet `dist/` depuis `./src` uniquement (`tsconfig.build.json`).
 * Pour charger `.env` à la racine du backend : `process.cwd()` avec `npm run start:dev` depuis ce dossier est fiable.
 * Si `npm` est lancé depuis la racine du dépôt, on charge aussi `smartsite-backend/.env` lorsqu’il existe.
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
envFilePathForConfig.push(join(backendRoot, '.env.example'));
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
import { DreamHouseModule } from './dream-house/dream-house.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePathForConfig,
      validate: validateGroqEnv,
      ignoreEnvFile: false,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri =
          config.get<string>('MONGODB_URI')?.trim() ||
          config.get<string>('MONGO_URI')?.trim() ||
          config.get<string>('SMARTSITE_MONGODB_URI')?.trim();
        if (!uri) {
          throw new Error(
            'mongodb+srv://mourad:mourad@smartsite.poyscqk.mongodb.net/smartsite?retryWrites=true&w=majority'          );
        }
        return { uri };
      },
    }),
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
    DreamHouseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
