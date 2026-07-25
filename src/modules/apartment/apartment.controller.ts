import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../../common/decorators/get-current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { QueryWithPaginationDto } from '../../common/dto/query-with-pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { Role } from '../users/schemas/user.schema';
import { ApartmentService } from './apartment.service';
import { CreateApartmentDto } from './dtos/create-apartment.dto';
import { UpdateApartmentDto } from './dtos/update-apartment.dto';

@Controller('apartments')
export class ApartmentController {
  constructor(private readonly apartmentService: ApartmentService) {}

  @Post('create-apartment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Apartment created successfully.')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create apartment',
    description:
      'This is the endpoint that admin is going to use to create an apartment.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        name: { type: 'string' },
        description: { type: 'string' },
        pricePerNight: { type: 'number' },
        location: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            latitude: { type: 'number', example: 6.5244 },
            longitude: { type: 'number', example: 3.3792 },
          },
          required: ['address', 'city', 'state', 'country'],
        },
        bathrooms: { type: 'number' },
        // location: {
        //   type: 'string',
        //   example: JSON.stringify({
        //     address: 'Lekki Phase 1, off Fola Osibo',
        //     city: 'Lekki',
        //     state: 'Lagos',
        //     country: 'Nigeria',
        //     latitude: 6.5244,
        //     longitude: 3.3792,
        //   }),
        // },
        guests: { type: 'number' },
        bedrooms: { type: 'number' },
        totalUnits: { type: 'number' },
        amenities: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        isFeatured: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Apartment created successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to create apartment.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (req, file, cb) => {
        if (
          !file.mimetype.includes('image/') &&
          !file.mimetype.includes('video/')
        ) {
          return cb(new Error('Only image and video files are allowed'), false);
        }

        cb(null, true);
      },
    }),
  )
  async createApartment(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createDto: CreateApartmentDto,
    @GetCurrentUser() user: JwtUser,
  ) {
    const response = await this.apartmentService.createApartment(
      user,
      createDto,
      files,
    );

    return response;
  }

  @Get('get-all-apartments')
  @SuccessMessage('Apartment fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch apartments',
    description: 'This is the endpoint to fetch all apartments.',
  })
  @ApiResponse({
    status: 201,
    description: 'Apartments fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to fetch apartments.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findAll(queryWithPaginationDto: QueryWithPaginationDto) {
    const response = await this.apartmentService.findAll(
      queryWithPaginationDto,
    );

    return response;
  }

  @Get('get-apartment-by-id/:id')
  @SuccessMessage('Apartment fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch apartment',
    description: 'This is the endpoint to fetch an apartment.',
  })
  @ApiResponse({
    status: 201,
    description: 'Apartment fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to fetch apartment.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findApartmentById(@Param('id') id: string) {
    const response = await this.apartmentService.findApartmentById(id);

    return response;
  }

  @Patch('update-apartment/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Apartment updated successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch apartment',
    description: 'This is the endpoint to update an apartment.',
  })
  @ApiResponse({
    status: 201,
    description: 'Apartment updated successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to update apartment.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateApartment(
    @Param('id') id: string,
    @Body() updateDto: UpdateApartmentDto,
  ) {
    const response = await this.apartmentService.updateApartment(id, updateDto);

    return response;
  }

  @Patch('toggle-apartment-status/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Apartment status changed successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change apartment status',
    description: 'This is the endpoint to change the status of an apartment.',
  })
  @ApiResponse({
    status: 201,
    description: 'Apartment status changed successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to change the status of the apartment.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async toggleApartmentStatus(@Param('id') id: string) {
    const response = await this.apartmentService.toggleApartmentStatus(id);

    return response;
  }

  @Delete('delete-apartment-by-id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Apartment deleted successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch apartment',
    description: 'This is the endpoint to delete an apartment.',
  })
  @ApiResponse({
    status: 201,
    description: 'Apartment deleted successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to delete apartment.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async deleteApartment(@Param('id') id: string) {
    const response = await this.apartmentService.deleteApartment(id);

    return response;
  }
}
