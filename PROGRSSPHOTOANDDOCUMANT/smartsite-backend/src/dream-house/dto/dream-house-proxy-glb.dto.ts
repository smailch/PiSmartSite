import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Pas de @IsUrl : les liens signés Tripo / CloudFront contiennent des caractères variés. */
export class DreamHouseProxyGlbDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12_000)
  url!: string;
}
