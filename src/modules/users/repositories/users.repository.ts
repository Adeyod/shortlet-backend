import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { QueryWithPaginationDto } from '../../../common/dto/query-with-pagination';
import { Role, User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel('User') private userModel: Model<UserDocument>) {}

  async findById(id: Types.ObjectId): Promise<UserDocument | null> {
    return await this.userModel.findById(id);
  }
  async findByIdWithSession(
    id: Types.ObjectId,
    session: ClientSession,
  ): Promise<UserDocument | null> {
    return await this.userModel.findById(id).session(session);
  }

  async countDocuments(filter: any) {
    return await this.userModel.countDocuments(filter);
  }

  async findManyByIds(
    ids: string[] | Types.ObjectId[],
  ): Promise<UserDocument[]> {
    const objectIds = ids.map((id) =>
      typeof id === 'string' ? new Types.ObjectId(id) : id,
    );

    return await this.userModel.find({
      _id: { $in: objectIds },
    });
  }
  async findManyByIdsWithSession(
    ids: string[] | Types.ObjectId[],
    session: ClientSession,
  ): Promise<UserDocument[]> {
    const objectIds = ids.map((id) =>
      typeof id === 'string' ? new Types.ObjectId(id) : id,
    );

    return await this.userModel
      .find({
        _id: { $in: objectIds },
      })
      .session(session);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({
      email: email.toLowerCase().trim(),
    });
    return user;
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }): Promise<UserDocument> {
    const user = new this.userModel({
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      email: data.email,
      phoneNumber: data.phoneNumber,
    });
    await user.save();

    return user;
  }

  async update(
    id: Types.ObjectId,
    data: Partial<User>,
  ): Promise<UserDocument | null> {
    return await this.userModel.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
    });
  }

  async findAllWithPagination(
    queryWithPaginationDto: QueryWithPaginationDto,
  ): Promise<{
    userObj: UserDocument[];
    totalPages: number;
    totalCount: number;
  }> {
    const { page, searchParams, limit } = queryWithPaginationDto;

    let query = this.userModel.find({ role: Role.USER });

    if (searchParams) {
      const regex = new RegExp(searchParams, 'i');

      query = query.where({
        $or: [
          { firstName: { $regex: regex } },
          { lastName: { $regex: regex } },
          { email: { $regex: regex } },
        ],
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
          message: 'Page can not be found.',
          status: 404,
          success: false,
        });
      }
    }

    const users = await query.sort({ createdAt: -1 }).select('-password');

    if (users.length === 0) {
      throw new NotFoundException({
        message: 'Users not found',
        success: false,
        status: 404,
      });
    }

    const response = {
      userObj: users,
      totalPages: pages,
      totalCount: count,
    };
    return response;
  }
}
