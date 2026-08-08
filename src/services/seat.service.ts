import { Floor } from '../models/floor.model';
import { Room } from '../models/room.model';
import { Seat, SeatStatus } from '../models/seat.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { StudentSubscription, SubscriptionStatus } from '../models/student-subscription.model';
import { StudentProfile } from '../models/student-profile.model';
import { Shift } from '../models/shift.model';
import { Op } from 'sequelize';
import { NotFoundException, BadRequestException } from '../middlewares/error.middleware';

export class SeatService {
  async getSeatMap(branchId: string) {
    await this.checkExpirations();
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

  async getBranchLayout(branchId: string) {
    return Floor.findAll({
      where: { branchId },
      include: [
        {
          model: Room,
          attributes: ['id', 'name', 'floorId'],
        },
      ],
      order: [
        ['name', 'ASC'],
      ],
    });
  }

  async getRoomSeats(roomId: string) {
    return Seat.findAll({
      where: { roomId },
      include: [
        {
          model: SeatAllocation,
          required: false,
          where: { isActive: true },
          include: [{ model: StudentProfile, include: [{ all: true }] }, { model: Shift }],
        },
      ],
      order: [['number', 'ASC']],
    });
  }

  async addFloor(branchId: string, name: string) {
    return Floor.create({ branchId, name } as any);
  }

  async addRoom(floorId: string, name: string) {
    return Room.create({ floorId, name } as any);
  }

  async addSeat(roomId: string, number: string) {
    const trimmedNumber = number.trim();
    const existing = await Seat.findOne({
      where: {
        roomId,
        number: trimmedNumber
      }
    });
    if (existing) {
      throw new BadRequestException(`Seat number "${trimmedNumber}" already exists in this room.`);
    }
    return Seat.create({ roomId, number: trimmedNumber, status: SeatStatus.AVAILABLE } as any);
  }

  async addBulkSeats(roomId: string, numbers: string[]) {
    const room = await Room.findByPk(roomId);
    if (!room) throw new NotFoundException('Room not found');

    const cleanNumbers = numbers.map(n => n.toString().trim()).filter(Boolean);
    if (cleanNumbers.length === 0) {
      throw new BadRequestException('No seat numbers provided');
    }

    // Find existing seats in this room to prevent duplicate keys
    const existingSeats = await Seat.findAll({
      where: {
        roomId,
        number: cleanNumbers
      },
      attributes: ['number']
    });
    const existingSet = new Set(existingSeats.map(s => s.number));
    const newNumbers = cleanNumbers.filter(n => !existingSet.has(n));

    if (newNumbers.length === 0) {
      throw new BadRequestException('All provided seat numbers already exist in this room.');
    }

    const seatRecords = newNumbers.map(num => ({
      roomId,
      number: num,
      status: SeatStatus.AVAILABLE
    }));

    const createdSeats = await Seat.bulkCreate(seatRecords as any);
    return {
      message: `${createdSeats.length} seats created successfully`,
      count: createdSeats.length,
      seats: createdSeats
    };
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

  async updateFloor(floorId: string, name: string) {
    const floor = await Floor.findByPk(floorId);
    if (!floor) throw new NotFoundException('Floor not found');
    await floor.update({ name });
    return floor;
  }

  async updateRoom(roomId: string, name: string) {
    const room = await Room.findByPk(roomId);
    if (!room) throw new NotFoundException('Room not found');
    await room.update({ name });
    return room;
  }

  async allocateSeat(data: any) {
    await this.checkExpirations();
    const { studentProfileId, seatId, shiftId, startDate, endDate } = data;

    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');

    const seat = await Seat.findByPk(seatId);
    if (!seat) throw new NotFoundException('Seat not found');
    if (seat.status === SeatStatus.BLOCKED || seat.status === SeatStatus.RESERVED) {
      throw new BadRequestException(`Seat is ${seat.status.toLowerCase()} and cannot be allocated`);
    }

    const shift = await Shift.findByPk(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    // Check if there is already an active allocation for this seat and shift
    const existingAllocation = await SeatAllocation.findOne({
      where: {
        seatId,
        shiftId,
        isActive: true,
      },
    });
    if (existingAllocation) {
      throw new BadRequestException('Seat is already occupied in this shift');
    }

    // Find student's current active allocations to update their old seats' status
    const currentStudentAllocations = await SeatAllocation.findAll({
      where: { studentProfileId, isActive: true }
    });

    // Deactivate current active allocations for this student if any
    await SeatAllocation.update(
      { isActive: false },
      { where: { studentProfileId, isActive: true } }
    );

    // Update old seats status if they no longer have any active allocations
    for (const oldAlloc of currentStudentAllocations) {
      const oldSeat = await Seat.findByPk(oldAlloc.seatId);
      if (oldSeat) {
        const remainingActiveCount = await SeatAllocation.count({
          where: { seatId: oldAlloc.seatId, isActive: true }
        });
        if (remainingActiveCount === 0) {
          await oldSeat.update({ status: SeatStatus.AVAILABLE });
        }
      }
    }

    // Create allocation
    const allocation = await SeatAllocation.create({
      workspaceId: student.workspaceId,
      studentProfileId,
      seatId,
      shiftId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    } as any);

    // Update seat status to OCCUPIED
    await seat.update({ status: SeatStatus.OCCUPIED });

    return allocation;
  }

  async transferSeat(allocationId: string, targetSeatId: string) {
    await this.checkExpirations();
    const allocation = await SeatAllocation.findByPk(allocationId);
    if (!allocation) throw new NotFoundException('Active allocation not found');

    const oldSeat = await Seat.findByPk(allocation.seatId);
    const targetSeat = await Seat.findByPk(targetSeatId);

    if (!targetSeat) throw new NotFoundException('Target seat not found');
    if (targetSeat.status === SeatStatus.BLOCKED || targetSeat.status === SeatStatus.RESERVED) {
      throw new BadRequestException(`Target seat is ${targetSeat.status.toLowerCase()}`);
    }

    const targetSeatShiftAlloc = await SeatAllocation.findOne({
      where: {
        seatId: targetSeatId,
        shiftId: allocation.shiftId,
        isActive: true,
      }
    });
    if (targetSeatShiftAlloc) {
      throw new BadRequestException('Target seat is already occupied in this shift');
    }

    // Deactivate old allocation
    await allocation.update({ isActive: false });
    if (oldSeat) {
      const oldSeatActiveCount = await SeatAllocation.count({
        where: { seatId: allocation.seatId, isActive: true }
      });
      if (oldSeatActiveCount === 0) {
        await oldSeat.update({ status: SeatStatus.AVAILABLE });
      }
    }

    // Create new allocation
    const newAllocation = await SeatAllocation.create({
      workspaceId: allocation.workspaceId,
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

  async vacateSeat(seatId: string, studentProfileId?: string) {
    const seat = await Seat.findByPk(seatId);
    if (!seat) throw new NotFoundException('Seat not found');

    const whereClause: any = { seatId, isActive: true };
    if (studentProfileId) {
      whereClause.studentProfileId = studentProfileId;
    }

    await SeatAllocation.update(
      { isActive: false },
      { where: whereClause }
    );

    // Count remaining active allocations on this seat
    const remainingActiveCount = await SeatAllocation.count({
      where: { seatId, isActive: true }
    });

    if (remainingActiveCount === 0) {
      await seat.update({ status: SeatStatus.AVAILABLE });
    } else {
      await seat.update({ status: SeatStatus.OCCUPIED });
    }

    return { success: true };
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
        const remainingActiveCount = await SeatAllocation.count({
          where: { seatId: alloc.seatId, isActive: true }
        });
        if (remainingActiveCount === 0) {
          await seat.update({ status: SeatStatus.AVAILABLE });
        }
      }
    }

    // Auto-correct any seats that are marked OCCUPIED but have no active allocations
    const occupiedSeats = await Seat.findAll({ where: { status: SeatStatus.OCCUPIED } });
    for (const seat of occupiedSeats) {
      const activeCount = await SeatAllocation.count({
        where: { seatId: seat.id, isActive: true }
      });
      if (activeCount === 0) {
        await seat.update({ status: SeatStatus.AVAILABLE });
      }
    }

    return { expiredCount: expiredAllocations.length };
  }

  async updateLayout(
    roomId: string,
    layout: Array<{ id: string; x: number; y: number }>,
    canvasWidth?: number,
    canvasHeight?: number,
    spacers?: any[]
  ) {
    // Update room dimensions and spacers if provided
    const updateFields: any = {};
    if (canvasWidth !== undefined && canvasHeight !== undefined) {
      updateFields.canvasWidth = canvasWidth;
      updateFields.canvasHeight = canvasHeight;
    }
    if (spacers !== undefined) {
      updateFields.spacers = spacers ? JSON.stringify(spacers) : null;
    }

    if (Object.keys(updateFields).length > 0) {
      await Room.update(
        updateFields,
        { where: { id: roomId } }
      );
    }

    const updatedIds = [];
    for (const item of layout as Array<{ id: string; x: number; y: number; rotation?: number }>) {
      const updateData: any = { x: item.x, y: item.y };
      if (item.rotation !== undefined) {
        updateData.rotation = item.rotation;
      }
      const [updatedCount] = await Seat.update(
        updateData,
        { where: { id: item.id, roomId } }
      );
      if (updatedCount > 0) {
        updatedIds.push(item.id);
      }
    }
    return { success: true, updatedCount: updatedIds.length };
  }

  async updateAllocation(allocationId: string, data: { startDate?: string; endDate?: string }) {
    const allocation = await SeatAllocation.findByPk(allocationId);
    if (!allocation) throw new NotFoundException('Allocation not found');
    
    if (data.startDate) allocation.startDate = new Date(data.startDate);
    if (data.endDate) allocation.endDate = new Date(data.endDate);
    
    await allocation.save();

    // Sync with StudentSubscription if it exists
    const latestSub = await StudentSubscription.findOne({
      where: {
        studentProfileId: allocation.studentProfileId,
      },
      order: [['createdAt', 'DESC']],
    });

    if (latestSub) {
      if (data.startDate) latestSub.startDate = new Date(data.startDate);
      if (data.endDate) {
        const newEndDate = new Date(data.endDate);
        latestSub.endDate = newEndDate;
        
        // Update status based on the new end date
        if (newEndDate > new Date()) {
          if (latestSub.status === SubscriptionStatus.EXPIRED) {
            latestSub.status = SubscriptionStatus.ACTIVE;
          }
        } else {
          if (latestSub.status === SubscriptionStatus.ACTIVE) {
            latestSub.status = SubscriptionStatus.EXPIRED;
          }
        }
      }
      await latestSub.save();
    }

    return allocation;
  }
}
