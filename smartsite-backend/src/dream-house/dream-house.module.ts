import { Module } from '@nestjs/common';
import { DreamHouseController } from './dream-house.controller';
import { DreamHouseService } from './dream-house.service';

/** ConfigModule est global dans `AppModule`; `DreamHouseService` utilise `ConfigService` pour Groq. */
@Module({
  controllers: [DreamHouseController],
  providers: [DreamHouseService],
})
export class DreamHouseModule {}
