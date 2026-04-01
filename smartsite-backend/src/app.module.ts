import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from './jobs/jobs.module';
import { ResourcesModule } from './resources/resources.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { ProgressPhotosModule } from './progress-photos/progress-photos.module';
import { HumanResourcesModule } from './human-resources/human-resources.module';
import { EquipmentResourcesModule } from './equipment-resources/equipment-resources.module';
@Module({
  imports: [
    // Connexion MongoDB Atlas
    MongooseModule.forRoot(
      'mongodb+srv://mourad:mourad@smartsite.poyscqk.mongodb.net/smartsite?retryWrites=true&w=majority'
    ),
    JobsModule,
    ResourcesModule,
    ProjectsModule, // Ajout du module Projects
    TasksModule, // Ajout du module Tasks
    UsersModule,
    HumanResourcesModule,
    EquipmentResourcesModule,
    DocumentsModule,
    ProgressPhotosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
