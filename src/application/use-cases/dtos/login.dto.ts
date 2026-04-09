import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: '+221700000002',
    description: 'Numéro de téléphone au format sénégalais (+221 suivi de 9 chiffres)',
  })
  @IsString()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro de téléphone doit être au format Sénégal (+221XXXXXXXXX)',
  })
  phone!: string;

  @ApiProperty({ example: 'pass1234', description: 'Mot de passe (min. 6 caractères)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
