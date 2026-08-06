import { ApiProperty } from '@nestjs/swagger';

export class DeleteApartmentMediaDto {
  @ApiProperty({
    type: [String],
    example: [
      'RH-Luxury Homes/ytwiadmqnzmw2w8cbow8',
      'RH-Luxury Homes/ytwiadmqnzmw2w8cbow8',
    ],
  })
  mediaPublicUrls!: string[];
}
