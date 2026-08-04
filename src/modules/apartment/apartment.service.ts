import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientSession } from 'mongoose';
import slugify from 'slugify';
import { QueryWithPaginationDto } from '../../common/dto/query-with-pagination';
import { CloudinaryService } from '../../common/infrastructure/cloudinary/cloudinary.service';
import { CloudinaryResponse } from '../../common/infrastructure/cloudinary/cloudinary.types';
import { JwtUser } from '../../common/types/jwt-user.type';
import { CreateApartmentDto } from './dtos/create-apartment.dto';
import {
  MediaUpdateAction,
  UpdateApartmentMediaDto,
} from './dtos/update-apartment-media.dto';
import { UpdateApartmentDto } from './dtos/update-apartment.dto';
import { ApartmentRepository } from './repositories/apartment.repository';

@Injectable()
export class ApartmentService {
  constructor(
    private readonly apartmentRepo: ApartmentRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createApartment(
    user: JwtUser,
    createDto: CreateApartmentDto,
    files: Express.Multer.File[],
  ) {
    const { name, totalUnits } = createDto;

    if (totalUnits <= 0) {
      throw new BadRequestException({
        message: 'Total units must be greater than 0',
        success: false,
        status: 400,
      });
    }

    const amenities = createDto.amenities ?? [];

    const uploadMedias = await this.cloudinaryService.uploadMany(
      files,
      'RH-Luxury Homes',
    );

    try {
      const slug = await this.generateUniqueSlug(name);

      const apartment = await this.apartmentRepo.createApartment({
        ...createDto,
        amenities,
        media: uploadMedias,
        slug,
      });

      if (!apartment) {
        throw new BadRequestException({
          message: 'Unable to create apartment.',
          success: false,
          status: 400,
        });
      }

      return apartment;
    } catch (error) {
      const payload = uploadMedias.map((img) => img.publicUrl);

      await this.cloudinaryService.deleteMultiple(payload); // important

      console.log('catched error:', error);
      throw error;
    }
  }

  async findAll(queryWithPaginationDto: QueryWithPaginationDto) {
    const apartment = await this.apartmentRepo.findAll(queryWithPaginationDto);
    return apartment;
  }

  async updateApartmentMedia(
    apartmentId: string,
    dto: UpdateApartmentMediaDto,
    files: Express.Multer.File[],
  ) {
    const maxMedia = 6;

    const apartment = await this.apartmentRepo.findApartmentById(apartmentId);

    if (!apartment) {
      throw new NotFoundException({
        message: 'Apartment not found',
        success: false,
        status: 404,
      });
    }

    const existingMedia = apartment.media || [];

    const mediaToRemove = existingMedia.filter((media) =>
      dto.removeMedia?.includes(media.publicUrl),
    );

    const remainingMedia = existingMedia.filter(
      (media) => !dto.removeMedia?.includes(media.publicUrl),
    );

    const incomingFilesCount = files?.length || 0;

    if (dto.action === MediaUpdateAction.APPEND) {
      if (remainingMedia.length + incomingFilesCount > maxMedia) {
        throw new BadRequestException({
          message: `Maximum of ${maxMedia} media files allowed.`,
          success: false,
          status: 400,
        });
      }
    }

    if (dto.action === MediaUpdateAction.REPLACE) {
      if (!incomingFilesCount) {
        throw new BadRequestException({
          message: 'Files are required for replace action.',
          success: false,
          status: 400,
        });
      }

      if (incomingFilesCount > maxMedia) {
        throw new BadRequestException({
          message: `Maximum of ${maxMedia} media files allowed.`,
          success: false,
          status: 400,
        });
      }
    }

    let uploadedMedia: CloudinaryResponse[] = [];

    if (incomingFilesCount) {
      uploadedMedia = await this.cloudinaryService.uploadMany(
        files,
        'RH-Luxury Homes',
      );
    }

    let finalMedia;

    if (dto.action === MediaUpdateAction.REPLACE) {
      finalMedia = uploadedMedia;

      mediaToRemove.push(...existingMedia);
    } else {
      finalMedia = [...remainingMedia, ...uploadedMedia];
    }

    if (mediaToRemove.length) {
      const publicIds = mediaToRemove.map((m) => m.publicUrl);

      await this.cloudinaryService.deleteMultiple(publicIds);
    }

    apartment.media = finalMedia;
    await apartment.save();

    return apartment;
  }

  async findApartmentById(id: string) {
    const apartment = await this.apartmentRepo.findApartmentById(id);

    if (!apartment) {
      throw new NotFoundException({
        message: 'Apartment not found',
        success: false,
        status: 404,
      });
    }

    return apartment;
  }
  async findApartmentByIdWithSession(id: string, session: ClientSession) {
    const apartment = await this.apartmentRepo.findApartmentByIdWithSession(
      id,
      session,
    );

    if (!apartment) {
      throw new NotFoundException({
        message: 'Apartment not found',
        success: false,
        status: 404,
      });
    }

    return apartment;
  }

  async updateApartment(id: string, updateDto: UpdateApartmentDto) {
    if (updateDto.totalUnits && updateDto.totalUnits <= 0) {
      throw new BadRequestException({
        message: 'Total units must be greater than 0',
        success: false,
        status: 400,
      });
    }

    const updated = await this.apartmentRepo.updateApartment(id, updateDto);

    if (!updated) {
      throw new NotFoundException({
        message: 'Apartment not found',
        success: false,
        status: 404,
      });
    }

    return updated;
  }

  async toggleApartmentStatus(id: string) {
    const apartment = await this.findApartmentById(id);

    const updated = await this.apartmentRepo.updateApartment(id, {
      isActive: !apartment.isActive,
    });

    return updated;
  }

  async deleteApartment(id: string) {
    const apartment = await this.apartmentRepo.findApartmentById(id);

    if (!apartment) {
      throw new NotFoundException({
        message: 'Apartment not found.',
        success: false,
        status: 404,
      });
    }

    apartment.isActive = false;
    apartment.isDeleted = true;
    await apartment.save();

    return { message: 'Apartment deleted successfully' };
  }

  async findApartmentBySlug(slug: string) {
    const apartment = await this.apartmentRepo.findApartmentBySlug(slug);

    if (!apartment) {
      throw new NotFoundException({
        message: 'Apartment not found.',
        success: false,
        status: 404,
      });
    }

    return apartment;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true });

    let slug = baseSlug;
    let counter = 1;

    while (await this.apartmentRepo.findApartmentBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
