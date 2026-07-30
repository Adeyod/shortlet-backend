import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { ApartmentService } from '../apartment/apartment.service';
import { BookingService } from '../booking/booking.service';
import { AvailabilityRepository } from './repositories/availability.repository';

@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    private readonly availabilityRepo: AvailabilityRepository,
    private readonly apartmentService: ApartmentService,
  ) {}

  /**
   * Lazy Initialization: Ensures availability documents exist for every date in the range.
   */
  async ensureAvailabilityForRange(
    apartmentId: string,
    checkIn: string,
    checkOut: string,
    totalUnits: number,
  ): Promise<Date[]> {
    const dates = this.getDatesInRange(checkIn, checkOut);
    if (dates.length === 0) {
      throw new BadRequestException({
        message: 'Check-out date must be after check-in date.',
        success: false,
        status: 400,
      });
    }

    // Find existing records
    const existing = await this.availabilityRepo.findAvailability(
      apartmentId,
      dates,
    );

    const existingTimesSet = new Set(
      existing.map((e) => new Date(e.date).getTime()),
    );
    const missingDates = dates.filter(
      (d) => !existingTimesSet.has(new Date(d).getTime()),
    );

    // Bulk insert missing dates lazily
    if (missingDates.length > 0) {
      const docsToInsert = missingDates.map((date) => ({
        apartmentId: new Types.ObjectId(apartmentId),
        date,
        availableUnits: totalUnits,
        bookedUnits: 0,
        adminBlockedUnits: 0,
      }));

      const inserted =
        await this.availabilityRepo.createBulkAvailability(docsToInsert);
      console.log('inserted:', inserted);
    }

    return dates;
  }
  async ensureAvailabilityForRangeWithSession(
    apartmentId: string,
    checkIn: string,
    checkOut: string,
    totalUnits: number,
    session: ClientSession,
  ): Promise<Date[]> {
    const dates = this.getDatesInRange(checkIn, checkOut);
    if (dates.length === 0) {
      throw new BadRequestException({
        message: 'Check-out date must be after check-in date.',
        success: false,
        status: 400,
      });
    }

    // Find existing records
    const existing = await this.availabilityRepo.findAvailabilityWithSession(
      apartmentId,
      dates,
      session,
    );

    const existingDatesSet = new Set(existing.map((e) => e.date.toISOString()));
    const missingDates = dates.filter(
      (d) => !existingDatesSet.has(d.toISOString()),
    );

    // Bulk insert missing dates lazily
    if (missingDates.length > 0) {
      const docsToInsert = missingDates.map((date) => ({
        apartmentId: new Types.ObjectId(apartmentId),
        date,
        availableUnits: totalUnits,
        bookedUnits: 0,
        adminBlockedUnits: 0,
      }));

      await this.availabilityRepo.createBulkAvailabilityWithSession(
        docsToInsert,
        session,
      );
    }

    return dates;
  }

  /**
   * Check if apartment is available and lazily initialize missing dates
   */
  async checkAvailability(
    apartmentIdStr: string,
    checkIn: string,
    checkOut: string,
    unitsRequested = 1,
  ) {
    const apartment =
      await this.apartmentService.findApartmentById(apartmentIdStr);

    console.log('apartment:', apartment);

    const releaseAnyExpiredHolds =
      await this.bookingService.releaseExpiredHoldsIfAny(
        apartment._id.toString(),
        new Date(checkIn),
        new Date(checkOut),
      );

    // 1. Run lazy initialization
    const dates = await this.ensureAvailabilityForRange(
      apartmentIdStr,
      checkIn,
      checkOut,
      apartment.totalUnits,
    );
    console.log('dates:', dates);

    // 2. Query availability for the range
    const availabilities = await this.availabilityRepo.findAvailability(
      apartmentIdStr,
      dates,
    );

    const availabilityMap = new Map(
      availabilities.map((item) => [new Date(item.date).toISOString(), item]),
    );

    const dateBreakdown = dates.map((dateObj) => {
      const isoString = dateObj.toISOString();
      const record = availabilityMap.get(isoString);

      const availableUnits = record ? (record.availableUnits ?? 0) : 0;
      const isDateAvailable = availableUnits >= unitsRequested;

      return {
        date: dateObj,
        availableUnits,
        isAvailable: isDateAvailable,
      };
    });
    // 3. Verify if every night has enough units
    const isAvailable = dateBreakdown.every((item) => item.isAvailable);

    const unavailableDates = dateBreakdown.filter((item) => !item.isAvailable);
    const availableDates = dateBreakdown.filter((item) => item.isAvailable);

    return {
      available: isAvailable,
      totalUnits: apartment.totalUnits,
      pricePerNight: apartment.pricePerNight,
      nights: dates.length,
      totalPrice: apartment.pricePerNight * dates.length * unitsRequested,
      detailedListForEveryNigth: dateBreakdown,
      unavailableDates,
      availableDates,
    };
  }

  async releaseReservedAvailability(
    apartmentId: Types.ObjectId,
    dates: Date[],
    units: number,
    session: ClientSession,
  ) {
    const response = await this.availabilityRepo.releaseReservedAvailability(
      apartmentId,
      dates,
      units,
      session,
    );

    if (!response) {
      throw new BadRequestException({
        message: 'Unable to release reserved availability.',
        success: false,
        status: 400,
      });
    }

    return response;
  }

  /**
   * Atomically reserve units during payment/booking phase
   */
  async reserveUnitsWithSession(
    apartmentId: Types.ObjectId,
    checkIn: string,
    checkOut: string,
    unitsRequested = 1,
    session: ClientSession,
  ) {
    const dates = this.getDatesInRange(checkIn, checkOut);

    const result = await this.availabilityRepo.reserveUnitsWithSession(
      apartmentId,
      dates,
      unitsRequested,
      session,
    );

    console.log('reserveUnitsWithSession service:', result);
    console.log('reserveUnitsWithSession service:', dates);

    return { result, dates };
  }

  /**
   * Admin Manual Block Handler
   */
  async adminBlockDates(
    apartmentIdStr: string,
    checkIn: string,
    checkOut: string,
    unitsToBlock: number,
  ) {
    const apartmentId = new Types.ObjectId(apartmentIdStr);
    const apartment =
      await this.apartmentService.findApartmentById(apartmentIdStr);
    if (!apartment) {
      throw new NotFoundException({
        message: 'Apartment not found.',
        success: false,
        status: 404,
      });
    }

    await this.ensureAvailabilityForRange(
      apartmentIdStr,
      checkIn,
      checkOut,
      apartment.totalUnits,
    );
    const dates = this.getDatesInRange(checkIn, checkOut);

    const result = await this.availabilityRepo.adminBlockUnits(
      apartmentId,
      dates,
      unitsToBlock,
    );

    if (result.modifiedCount !== dates.length) {
      throw new BadRequestException({
        message: 'Not enough available units to block for the selected dates.',
        success: false,
        status: 400,
      });
    }

    return { success: true, message: 'Dates successfully blocked by admin.' };
  }

  getDatesInRange(checkIn: string, checkOut: string): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(checkIn);
    const lastDate = new Date(checkOut);

    // Normalize to UTC midnight
    currentDate = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
      ),
    );
    const endDateNormalized = new Date(
      Date.UTC(
        lastDate.getUTCFullYear(),
        lastDate.getUTCMonth(),
        lastDate.getUTCDate(),
      ),
    );

    while (currentDate < endDateNormalized) {
      dates.push(new Date(currentDate));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return dates;
  }
}
