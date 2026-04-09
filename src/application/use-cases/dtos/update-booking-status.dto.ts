import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
    example: 'CONFIRMED',
    description: [
      '`CONFIRMED` — le chauffeur accepte la réservation',
      '`REJECTED` — le chauffeur refuse la réservation',
      '`CANCELLED` — annulation (chauffeur ou passager)',
    ].join('\n\n'),
  })
  @IsEnum(['CONFIRMED', 'REJECTED', 'CANCELLED'])
  status!: 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
}
