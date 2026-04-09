import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchTripDto {
  @ApiProperty({ example: 'Dakar', description: 'Ville de départ (insensible à la casse)' })
  @IsString()
  departureCity!: string;

  @ApiProperty({ example: 'Thiès', description: 'Ville de destination (insensible à la casse)' })
  @IsString()
  destinationCity!: string;

  @ApiProperty({
    example: '2026-04-10',
    description: 'Date de départ (format YYYY-MM-DD). Retourne tous les trajets de la journée.',
  })
  @IsDateString()
  departureTime!: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Nombre de résultats par page (défaut: 10)',
    default: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
    description: 'Curseur de pagination — valeur `nextCursor` de la réponse précédente. Omettez pour la première page.',
  })
  @IsString()
  @IsOptional()
  cursor?: string;
}
