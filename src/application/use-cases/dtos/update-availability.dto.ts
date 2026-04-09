import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAvailabilityDto {
  @ApiProperty({
    example: true,
    description: '`true` = chauffeur en ligne et disponible pour des trajets, `false` = hors ligne',
  })
  @IsBoolean()
  isOnline!: boolean;
}
