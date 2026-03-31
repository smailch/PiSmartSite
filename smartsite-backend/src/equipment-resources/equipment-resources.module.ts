import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EquipmentService } from './equipment-resources.service';
import { EquipmentController } from './equipment-resources.controller';
import { Equipment, EquipmentSchema } from './schemas/equipment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Equipment.name, schema: EquipmentSchema },
    ]),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
})
export class EquipmentResourcesModule {}
