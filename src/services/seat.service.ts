import { Floor } from '../models/floor.model';
import { Room } from '../models/room.model';
import { Seat, SeatStatus } from '../models/seat.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { StudentProfile } from '../models/student-profile.model';
import { Shift } from '../models/shift.model';
import { Op } from 'sequelize';
import { NotFoundException, BadRequestException } from '../middlewares/error.middleware';

export class SeatService {
  async getSeatMap(branchId: string) {
    return Floor.findAll({
      where: { branchId },
      include: [
        {
          model: Room,
          include: [
            {
              model: Seat,
              include: [
                {
                  model: SeatAllocation,
                  required: false,
                  where: { isActive: true },
                  include: [{ model: StudentProfile, include: [{ all: true }] }, { model: Shift }],
                },
              ],
            },
          ],
        },
      ],
      order: [['name', 'ASC']],
    });
  }

  async addFloor(branchId: string, name: string) {
    return Floor.create({ branchId, name } as any);
  }

  async addRoom(floorId: string, name: string) {
    return Room.create({ floorId, name } as any);
  }

  async addSeat(roomId: string, number: string) {
    return Seat.create({ roomId, number, status: SeatStatus.AVAILABLE } as any);
  }

  async updateSeatStatus(seatId: string, status: SeatStatus) {
    const seat = await Seat.findByPk(seatId);
    if (!seat) throw new NotFoundException('Seat not found');
    await seat.update({ status });
    return seat;
  }

  async deleteSeat(seatId: string) {
    const seat = await Seat.findByPk(seatId);
    if (!seat) throw new NotFoundException('Seat not found');
    if (seat.status !== SeatStatus.AVAILABLE) {
      throw new BadRequestException('Cannot delete an occupied or reserved seat');
    }
    await seat.destroy();
    return { success: true };
  }

  async deleteRoom(roomId: string) {
    const room = await Room.findByPk(roomId, { include: [Seat] });
    if (!room) throw new NotFoundException('Room not found');
    
    const occupiedSeats = room.seats?.filter(s => s.status !== SeatStatus.AVAILABLE) || [];
    if (occupiedSeats.length > 0) {
      throw new BadRequestException('Cannot delete a room with occupied seats');
    }
    
    await Seat.destroy({ where: { roomId } });
    await room.destroy();
    return { success: true };
  }

  async deleteFloor(floorId: string) {
    const floor = await Floor.findByPk(floorId, { 
      include: [{ model: Room, include: [Seat] }] 
    });
    if (!floor) throw new NotFoundException('Floor not found');

    const rooms = floor.rooms || [];
    for (const room of rooms) {
      const occupiedSeats = room.seats?.filter(s => s.status !== SeatStatus.AVAILABLE) || [];
      if (occupiedSeats.length > 0) {
        throw new BadRequestException('Cannot delete a floor with occupied seats');
      }
    }

    for (const room of rooms) {
      await Seat.destroy({ where: { roomId: room.id } });
      await room.destroy();
    }
    await floor.destroy();
    return { success: true };
  }

  async allocateSeat(data: any) {
    const { studentProfileId, seatId, shiftId, startDate, endDate } = data;

    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');

    const seat = await Seat.findByPk(seatId);
    if (!seat) throw new NotFoundException('Seat not found');
    if (seat.status !== SeatStatus.AVAILABLE) {
      throw new BadRequestException('Seat is not available for allocation');
    }

    const shift = await Shift.findByPk(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    // Deactivate current active allocations for this student if any
    await SeatAllocation.update(
      { isActive: false },
      { where: { studentProfileId, isActive: true } }
    );

    // Create allocation
    const allocation = await SeatAllocation.create({
      studentProfileId,
      seatId,
      shiftId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    } as any);

    // Update seat status
    await seat.update({ status: SeatStatus.OCCUPIED });

    return allocation;
  }

  async transferSeat(allocationId: string, targetSeatId: string) {
    const allocation = await SeatAllocation.findByPk(allocationId);
    if (!allocation) throw new NotFoundException('Active allocation not found');

    const oldSeat = await Seat.findByPk(allocation.seatId);
    const targetSeat = await Seat.findByPk(targetSeatId);

    if (!targetSeat) throw new NotFoundException('Target seat not found');
    if (targetSeat.status !== SeatStatus.AVAILABLE) {
      throw new BadRequestException('Target seat is not available');
    }

    // Deactivate old allocation
    await allocation.update({ isActive: false });
    if (oldSeat) {
      await oldSeat.update({ status: SeatStatus.AVAILABLE });
    }

    // Create new allocation
    const newAllocation = await SeatAllocation.create({
      studentProfileId: allocation.studentProfileId,
      seatId: targetSeatId,
      shiftId: allocation.shiftId,
      startDate: new Date(),
      endDate: allocation.endDate,
      isActive: true,
    } as any);

    // Update target seat status
    await targetSeat.update({ status: SeatStatus.OCCUPIED });

    return newAllocation;
  }

  async checkExpirations() {
    const today = new Date();
    // Find all active allocations that are expired
    const expiredAllocations = await SeatAllocation.findAll({
      where: {
        isActive: true,
        endDate: { [Op.lt]: today },
      },
    });

    for (const alloc of expiredAllocations) {
      await alloc.update({ isActive: false });
      const seat = await Seat.findByPk(alloc.seatId);
      if (seat) {
        await seat.update({ status: SeatStatus.AVAILABLE });
      }
    }

    return { expiredCount: expiredAllocations.length };
  }
}
