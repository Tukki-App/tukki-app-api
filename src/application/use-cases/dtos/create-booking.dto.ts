import { IsUUID, IsInt, Min, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
    description: 'UUID du trajet à réserver',
  })
  @IsUUID()
  tripId!: string;

  @ApiProperty({
    example: 'a975e635-282a-4d4f-981d-d1a33f505ec9',
    description: 'UUID du passager (doit correspondre à l\'utilisateur authentifié)',
  })
  @IsUUID()
  passengerId!: string;

  @ApiProperty({ example: 2, description: 'Nombre de places à réserver (min. 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  seats!: number;

  @ApiPropertyOptional({
    example: 'unique-key-abc-123',
    description: 'Clé d\'idempotence — si fournie, une 2e requête avec la même clé retourne la réservation existante sans doublon. Recommandé pour les retry mobiles.',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
