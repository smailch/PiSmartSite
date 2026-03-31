import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HumanResourcesService } from './human-resources.service';
import { HumanResourcesController } from './human-resources.controller';
import { Human, HumanSchema } from './schemas/human.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Human.name, schema: HumanSchema },
    ]),
  ],
  controllers: [HumanResourcesController],
  providers: [HumanResourcesService],
})
export class HumanResourcesModule {}
