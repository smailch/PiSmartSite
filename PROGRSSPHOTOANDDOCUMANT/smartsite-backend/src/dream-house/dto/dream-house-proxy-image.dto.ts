import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** URL complète renvoyée par `start` (Pollinations). */
export class DreamHouseProxyImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32_000)
  url!: string;
}
