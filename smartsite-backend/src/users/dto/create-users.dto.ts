import {
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsMongoId,
  Matches,
} from 'class-validator';

export class CreateUserDto {

  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  fullName!: string;

  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @MinLength(6, { message: 'Mot de passe minimum 6 caractères' })
  password!: string;

  @Matches(/^[0-9]{8}$/, {
    message: 'Téléphone doit contenir 8 chiffres',
  })
  phone!: string;

  @IsMongoId({ message: 'Role invalide' })
  roleId!: string;
}