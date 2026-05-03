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

  const port = Number(process.env.PORT);
  const listenPort = Number.isFinite(port) && port > 0 ? port : 3200;
  const host = process.env.LISTEN_HOST ?? '0.0.0.0';
  await app.listen(listenPort, host);
  logger.log(`Listening on ${host}:${listenPort}`);
}
bootstrap();
