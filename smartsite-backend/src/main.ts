import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { HUMAN_UPLOAD_DIR } from './human-resources/multer-human.config';
import { PROGRESS_UPLOAD_DIR } from './jobs/multer-progress.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] : undefined,
  });

  app.use('/payments/webhook', bodyParser.raw({ type: 'application/json' }));

  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });

  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];
  const corsEnv = process.env.CORS_ORIGINS;
  const fromEnv = corsEnv
    ? corsEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  /** `*` seul ne peut pas aller dans un tableau : le navigateur envoie une origine réelle, pas la chaîne "*". Avec `credentials: true`, il faut refléter l’origine (`true`) ou lister les URLs exactes. */
  const corsWildcard =
    fromEnv.length === 1 && (fromEnv[0] === '*' || fromEnv[0] === '**');
  const explicitOrigins = fromEnv.filter((o) => o !== '*' && o !== '**');
  const origin = isProd
    ? corsWildcard
      ? true
      : explicitOrigins.length
        ? [...new Set(explicitOrigins)]
        : false
    : [...new Set([...devOrigins, ...explicitOrigins])];

  if (isProd && corsWildcard) {
    logger.warn(
      'CORS_ORIGINS=* : toutes les origines sont acceptées (réflexion). Préférez une liste d’URLs en production.',
    );
  }
  if (isProd && !fromEnv.length) {
    logger.warn(
      'CORS_ORIGINS is empty in production — browser clients will be blocked until you set comma-separated frontend URLs.',
    );
  }

  app.enableCors({
    origin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  const port = Number(process.env.PORT);
  const listenPort = Number.isFinite(port) && port > 0 ? port : 3200;
  const host = process.env.LISTEN_HOST ?? '0.0.0.0';
  await app.listen(listenPort, host);
  logger.log(`Listening on ${host}:${listenPort}`);
}
bootstrap();
