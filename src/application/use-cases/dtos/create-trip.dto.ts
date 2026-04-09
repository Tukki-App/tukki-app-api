import { IsUUID, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiProperty({
    example: 'ebc00913-5d43-4bbd-8a5a-3288fcfb8def',
    description: 'UUID du chauffeur (doit correspondre à l\'utilisateur authentifié)',
  })
  @IsUUID()
  driverId!: string;

  @ApiProperty({ example: 'Dakar', description: 'Ville de départ (insensible à la casse)' })
  @IsString()
  departureCity!: string;

  @ApiProperty({ example: 'Thiès', description: 'Ville de destination (insensible à la casse)' })
  @IsString()
  destinationCity!: string;

  @ApiProperty({
    example: '2026-04-10T08:00:00Z',
    description: 'Date et heure de départ au format ISO 8601',
  })
  @IsDateString()
  departureTime!: string;

  @ApiProperty({ example: 4, description: 'Nombre total de places disponibles (min. 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty({ example: 2500, description: 'Prix par place en FCFA (0 = gratuit)', minimum: 0 })
  @IsInt()
  @Min(0)
  price!: number;
}
