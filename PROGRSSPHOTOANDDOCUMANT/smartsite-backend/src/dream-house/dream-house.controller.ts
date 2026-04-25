import { Body, Controller, Get, Header, Param, Post, StreamableFile } from '@nestjs/common';
import { DreamHouseService } from './dream-house.service';
import { DreamHouseRequestDto } from './dto/dream-house-request.dto';
import { DreamHouseProxyGlbDto } from './dto/dream-house-proxy-glb.dto';
import { DreamHouseProxyImageDto } from './dto/dream-house-proxy-image.dto';

@Controller('dream-house')
export class DreamHouseController {
  constructor(private readonly dreamHouseService: DreamHouseService) {}

  /** Images Pollinations + création tâche Tripo (`image_to_model` depuis la 1re vue, repli `text_to_model`). */
  @Post('start')
  async start(@Body() body: DreamHouseRequestDto) {
    return this.dreamHouseService.start(body);
  }

  /** Statut d’une tâche Tripo — à appeler en boucle côté client jusqu’à `success` ou échec. */
  @Get('tripo-task/:taskId')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  getTripoTaskStatus(@Param('taskId') taskId: string) {
    return this.dreamHouseService.getTripoTaskStatus(taskId);
  }

  /**
   * Télécharge le .glb depuis le CDN Tripo côté serveur (évite CORS « Failed to fetch »
   * dans le navigateur sur les URLs signées tripo-data.*).
   */
  @Post('model-glb')
  @Header('Cache-Control', 'no-store')
  async proxyTripoGlb(@Body() body: DreamHouseProxyGlbDto) {
    const buf = await this.dreamHouseService.fetchTripoGlbBuffer(body.url);
    return new StreamableFile(buf, {
      type: 'model/gltf-binary',
      disposition: 'inline; filename="dream-house.glb"',
    });
  }

  /**
   * Image Pollinations via le backend (séquentiel côté client recommandé) pour limiter
   * les erreurs « impossible de charger » (429 / concurrence navigateur).
   */
  @Post('pollinations-image')
  @Header('Cache-Control', 'no-store')
  async proxyPollinationsImage(@Body() body: DreamHouseProxyImageDto) {
    const { buffer, contentType } =
      await this.dreamHouseService.fetchPollinationsImageBuffer(body.url);
    return new StreamableFile(buffer, {
      type: contentType,
      disposition: 'inline; filename="dream-house-preview"',
    });
  }
}
