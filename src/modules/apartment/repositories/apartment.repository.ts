import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { QueryWithPaginationDto } from '../../../common/dto/query-with-pagination';
import { Apartment, ApartmentDocument } from '../schemas/apartment.schema';

@Injectable()
export class ApartmentRepository {
  constructor(
    @InjectModel(Apartment.name)
    private readonly apartmentModel: Model<ApartmentDocument>,
  ) {}

  async createApartment(data: Partial<Apartment>): Promise<ApartmentDocument> {
    const response = await new this.apartmentModel(data).save();

    return response;
  }

  async findAll(queryWithPaginationDto: QueryWithPaginationDto): Promise<{
    apartments: ApartmentDocument[];
    totalCount: number;
    totalPages: number;
  }> {
    const { page, limit, searchParams } = queryWithPaginationDto;

    let query = this.apartmentModel.find({ isDeleted: false });

    if (searchParams) {
      const regex = new RegExp(searchParams, 'i');

      query = query.where({
        $or: [{ name: { $regex: regex } }, { description: { $regex: regex } }],
      });
    }

    const count = await query.clone().countDocuments();
    let pages = 0;

    if (page !== undefined && limit !== undefined && count !== 0) {
      const offset = (page - 1) * limit;

      query = query.skip(offset).limit(limit);
      pages = Math.ceil(count / limit);

      if (page > pages) {
        throw new NotFoundException({
          message: 'Page not found.',
          success: false,
          status: 404,
        });
      }
    }

    const apartments = await query.sort({ createdAt: -1 });

    if (!apartments) {
      throw new NotFoundException({
        message: 'Apartments not found.',
        success: false,
        status: 404,
      });
    }

    const response = {
      apartments,
      totalCount: count,
      totalPages: pages,
    };

    return response;
  }

  async findApartmentById(
    apartmentId: string,
  ): Promise<ApartmentDocument | null> {
    const id = new Types.ObjectId(apartmentId);

    const response = await this.apartmentModel.findOne({
      _id: id,
      isDeleted: false,
    });

    return response;
  }
  async findApartmentByIdWithSession(
    apartmentId: string,
    session: ClientSession,
  ): Promise<ApartmentDocument | null> {
    const id = new Types.ObjectId(apartmentId);

    const response = await this.apartmentModel
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .session(session);

    return response;
  }

  async findApartmentBySlug(slug: string): Promise<ApartmentDocument | null> {
    const response = await this.apartmentModel.findOne({
      slug,
      isDeleted: false,
    });

    return response;
  }

  async updateApartment(
    apartmentId: string,
    data: Partial<Apartment>,
  ): Promise<Apartment | null> {
    const id = new Types.ObjectId(apartmentId);

    const response = await this.apartmentModel.findByIdAndUpdate(id, data, {
      new: true,
    });
    return response;
  }
}
