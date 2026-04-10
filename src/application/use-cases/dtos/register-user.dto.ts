import { IsString, IsEnum, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({
    example: '+221700000001',
    description: 'Numéro de téléphone au format sénégalais (+221 suivi de 9 chiffres)',
  })
  @IsString()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro de téléphone doit être au format Sénégal (+221XXXXXXXXX)',
  })
  phone!: string;

  @ApiProperty({ example: 'Alice Diallo', description: 'Nom complet (2–100 caractères)', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    enum: ['PASSENGER', 'DRIVER', 'ADMIN'],
    example: 'PASSENGER',
    description: 'PASSENGER pour un passager, DRIVER pour un chauffeur, ADMIN pour un administrateur',
  })
  @IsEnum(['PASSENGER', 'DRIVER', 'ADMIN'])
  role!: 'PASSENGER' | 'DRIVER' | 'ADMIN';

  @ApiProperty({ example: 'pass1234', description: 'Mot de passe (min. 6 caractères)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
