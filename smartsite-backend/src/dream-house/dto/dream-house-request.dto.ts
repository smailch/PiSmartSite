import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class DreamHouseRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  description!: string;

  /** Couleur d’accent façade / menuiseries (image + maillage Tripo). */
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'accentColor doit être un hexadécimal #RRGGBB (ex. #ea580c).',
  })
  accentColor!: string;

  /** Budget total indicatif (EUR), pour Groq / prompts texte — optionnel. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  })
  @IsNumber()
  @Min(0)
  budgetEur?: number;

  /** Surface du terrain (m²) — optionnel. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  })
  @IsNumber()
  @Min(1)
  terrainM2?: number;

  /** Valeur du sélecteur de style (ex. contemporary, _none). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  architectureStyle?: string;

  /** Identifiants des tags détail (ex. large_windows). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  detailTags?: string[];
}
