import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PROGRESS_UPLOAD_DIR } from './jobs/multer-progress.config';
import { HUMAN_UPLOAD_DIR } from './human-resources/multer-human.config';

async function bootstrap() {
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

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });

  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];
  const corsEnv = process.env.CORS_ORIGINS;
  const extra = corsEnv
    ? corsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  app.enableCors({
    origin: [...new Set([...devOrigins, ...extra])],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(3200);
}
bootstrap();
