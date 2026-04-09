import { IsUUID, IsInt, Min, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
    description: 'UUID du trajet à réserver. Obtenu depuis la réponse de GET /trips/search (champ id).',
  })
  @IsUUID()
  tripId!: string;

  @ApiProperty({
    example: 'a975e635-282a-4d4f-981d-d1a33f505ec9',
    description: 'UUID du passager. Obtenu depuis la réponse de POST /auth/login ou POST /identity/register (champ user.id ou id).',
  })
  @IsUUID()
  passengerId!: string;

  @ApiProperty({ example: 2, description: 'Nombre de places à réserver (min. 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  seats!: number;

  @ApiPropertyOptional({
    example: 'unique-key-abc-123',
    description: 'Clé unique générée côté mobile (ex: UUID v4). Si la même clé est envoyée deux fois, la 2e requête retourne la réservation existante sans créer de doublon. Fortement recommandé pour gérer les retries réseau.',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
