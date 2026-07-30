import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  Availability,
  AvailabilityDocument,
} from '../schemas/availability.schema';

@Injectable()
export class AvailabilityRepository {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async decrementAvailability(id: string, date: Date, session: ClientSession) {
    const apartmentId = new Types.ObjectId(id);

    return await this.availabilityModel.updateOne(
      {
        apartmentId,
        date,
        availableUnits: { $gt: 0 },
      },
      {
        $inc: { availableUnits: -1 },
      },
      { session },
    );
  }

  async incrementAvailability(id: string, date: Date, session: ClientSession) {
    const apartmentId = new Types.ObjectId(id);

    return await this.availabilityModel.updateOne(
      {
        apartmentId,
        date,
      },
      {
        $inc: { availableUnits: 1 },
      },
      { session },
    );
  }

  async findAvailability(id: string, dates: Date[]) {
    const apartmentId = new Types.ObjectId(id);

    const response = await this.availabilityModel.find({
      apartmentId,
      date: { $in: dates },
    });

    return response;
  }
  async findAvailabilityWithSession(
    id: string,
    dates: Date[],
    session: ClientSession,
  ) {
    const apartmentId = new Types.ObjectId(id);

    const response = await this.availabilityModel
      .find({
        apartmentId,
        date: { $in: dates },
      })
      .select('date')
      .session(session);

    return response;
  }

  async createBulkAvailability(
    data: {
      apartmentId: Types.ObjectId;
      date: Date;
      availableUnits: number;
      bookedUnits: number;
      adminBlockedUnits: number;
    }[],
  ) {
    const response = await this.availabilityModel.insertMany(data);

    return response;
  }
  async createBulkAvailabilityWithSession(
    data: {
      apartmentId: Types.ObjectId;
      date: Date;
      availableUnits: number;
      bookedUnits: number;
      adminBlockedUnits: number;
    }[],
    session: ClientSession,
  ) {
    const response = await this.availabilityModel.insertMany(data, {
      ordered: false,
      session,
    });

    return response;
  }

  async adminBlockUnits(
    apartmentId: Types.ObjectId,
    dates: Date[],
    unitsToBlock: number,
  ) {
    return await this.availabilityModel.updateMany(
      {
        apartmentId,
        date: { $in: dates },
        availableUnits: { $gte: unitsToBlock },
      },
      {
        $inc: {
          availableUnits: -unitsToBlock,
          adminBlockedUnits: unitsToBlock,
        },
      },
    );
  }
  async reserveUnitsWithSession(
    apartmentId: Types.ObjectId,
    dates: Date[],
    unitsRequested: number,
    session: ClientSession,
  ) {
    const response = await this.availabilityModel.updateMany(
      {
        apartmentId,
        date: { $in: dates },
        availableUnits: { $gte: unitsRequested }, // Guard condition
      },
      {
        $inc: {
          availableUnits: -unitsRequested,
          bookedUnits: unitsRequested,
        },
      },
      { session },
    );

    console.log('reserveUnitsWithSession repo response:', response);

    return response;
  }

  async releaseReservedAvailability(
    apartmentId: Types.ObjectId,
    dates: Date[],
    units: number,
    session: ClientSession,
  ) {
    const response = await this.availabilityModel.updateMany(
      {
        apartmentId,
        date: { $in: dates },
      },
      {
        $inc: {
          availableUnits: units, // Give the unit back
          bookedUnits: -units, // Remove from booked count
        },
      },
      { session },
    );

    return response;
  }
}
