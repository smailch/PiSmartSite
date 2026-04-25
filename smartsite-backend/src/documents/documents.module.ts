import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ProjectDocument, ProjectDocumentSchema } from './documents.schema';
import { DocumentVersion, DocumentVersionSchema } from './document-versions.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectDocument.name, schema: ProjectDocumentSchema },
      { name: DocumentVersion.name, schema: DocumentVersionSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
