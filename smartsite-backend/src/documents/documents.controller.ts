import {
  Controller,
  Get,
  Post,
  Put,
  UploadedFile, 
  Delete,
  UseInterceptors,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto, AddVersionDto } from './dto/create-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}


  // NOUVELLE ROUTE : Upload avec fichier local
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `document-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    // Construire l'URL du fichier uploadé
    const fileUrl = `/uploads/${file.filename}`;

    // Créer le document dans la base de données
    return this.documentsService.create({
      title: body.title,
      description: body.description,
      projectId: body.projectId,
      uploadedBy: body.uploadedBy,
      fileUrl: fileUrl,
      fileType: extname(file.originalname).substring(1), // "pdf", "docx", etc.
      category: body.category || 'other',
    });
  }



  // POST /documents
  @Post()
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
  }

  // GET /documents
  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  // GET /documents/search?q=rapport
  @Get('search')
  search(@Query('q') query: string) {
    return this.documentsService.search(query);
  }

  // GET /documents/project/:projectId
  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.documentsService.findByProject(projectId);
  }

  // GET /documents/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  // PUT /documents/:id
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  // DELETE /documents/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  // POST /documents/:id/versions
  @Post(':id/versions')
  addVersion(@Param('id') id: string, @Body() addVersionDto: AddVersionDto) {
    return this.documentsService.addVersion(id, addVersionDto);
  }

  // GET /documents/:id/versions
  @Get(':id/versions')
  getVersions(@Param('id') id: string) {
    return this.documentsService.getVersions(id);
  }
}
