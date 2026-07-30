import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../users/schemas/user.schema';
import { AvailabilityService } from './availability.service';
import { AdminBlockDatesDto } from './dtos/block-dates.dto';
import { CheckAvailabilityDto } from './dtos/check-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('check-apartment-dates-availability-by-apartmentId/:apartmentId')
  @SuccessMessage('Apartment dates availability checked successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check apartment dates availability.',
    description:
      'This is the endpoint that frontend is going to call so as to check whether an apartment is available for the selected dates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Apartment dates availablity checked successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to check availability.',
  })
  @ApiResponse({
    status: 404,
    description: 'Availability not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async checkAvailability(
    @Param('apartmentId') apartmentId: string,
    @Query() query: CheckAvailabilityDto,
  ) {
    return this.availabilityService.checkAvailability(
      apartmentId,
      query.checkInDate,
      query.checkOutDate,
      query.unitsRequested,
    );
  }

  @Post('block-apartment-dates-availability-by-apartmentId/:apartmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Dates blocked successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Availability dates block.',
    description:
      'This is the endpoint that frontend is going to call so that admin can block dates for selected apartment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dates blocked successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to block dates.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async blockDates(
    @Param('apartmentId') apartmentId: string,
    @Body() dto: AdminBlockDatesDto,
  ) {
    return this.availabilityService.adminBlockDates(
      apartmentId,
      dto.checkInDate,
      dto.checkOutDate,
      dto.unitsToBlock,
    );
  }
}
