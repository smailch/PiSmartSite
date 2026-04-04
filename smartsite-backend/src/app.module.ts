import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'node:path';

/** Racine du package backend (parent de `dist/` à l’exécution — `.env` toujours chargé). */
const backendEnvDir = join(__dirname, '..');
import { validateGroqEnv } from './analysis-ai/groq-env.validation';
import { ResourcesModule } from './resources/resources.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { AnalysisAiModule } from './analysis-ai/analysis-ai.module';
import { TelegramModule } from './telegram/telegram.module';
import { HumansModule } from './humans/humans.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(backendEnvDir, '.env'),
        join(backendEnvDir, '.env.local'),
      ],
      validate: validateGroqEnv,
    }),
    // Connexion MongoDB Atlas
    MongooseModule.forRoot(
      'mongodb+srv://mourad:mourad@smartsite.poyscqk.mongodb.net/smartsite?retryWrites=true&w=majority'
    ),
    ResourcesModule,
    ProjectsModule, // Ajout du module Projects
    TasksModule, // Ajout du module Tasks
    UsersModule,
    AnalysisAiModule,
    TelegramModule,
    HumansModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
