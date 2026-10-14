import { WorkspaceSubscription } from '../models/workspace-subscription.model';
import { SaaSPlan } from '../models/saas-plan.model';
import { Floor } from '../models/floor.model';
import { Room } from '../models/room.model';
import { Seat, SeatStatus } from '../models/seat.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import {
  StudentSubscription,
  SubscriptionStatus,
} from '../models/student-subscription.model';
import { StudentProfile } from '../models/student-profile.model';
import { Shift } from '../models/shift.model';
import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';
import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import {
  NotFoundException,
  BadRequestException,
} from '../middlewares/error.middleware';

export class SeatService {
  async getSeatMap(branchId: string, studentUserId?: string) {
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
                  where: { isActive: true, endDate: { [Op.gt]: new Date() } },
                  include: [
                    {
                      model: StudentProfile,
                      required: false,
                      ...(studentUserId
                        ? {
                            where: { userId: studentUserId },
                            attributes: ['id', 'userId'],
                          }
                        : { include: [{ all: true }] }),
                    },
                    { model: Shift },
                  ],
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
      order: [['name', 'ASC']],
    });
  }

  async getRoomSeats(roomId: string, studentUserId?: string) {
    return Seat.findAll({
      where: { roomId },
      include: [
        {
          model: SeatAllocation,
          required: false,
          where: { isActive: true, endDate: { [Op.gt]: new Date() } },
          include: [
            {
              model: StudentProfile,
              required: false,
              ...(studentUserId
                ? {
                    where: { userId: studentUserId },
                    attributes: ['id', 'userId'],
                  }
                : { include: [{ all: true }] }),
            },
            { model: Shift },
          ],
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
    if (typeof number !== 'string' || !number.trim())
      throw new BadRequestException('Seat number required');
    const room = await Room.findByPk(roomId, {
      include: [{ model: Floor, include: [Branch] }],
    });
    if (!room?.floor?.branch) throw new NotFoundException('Room not found');
    const workspaceId = room.floor.branch.workspaceId;
    return sequelize.transaction(async (transaction) => {
      await Workspace.findByPk(workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const subscription = await WorkspaceSubscription.findOne({
        where: { workspaceId },
        include: [SaaSPlan],
        transaction,
      });
      const limit = subscription?.saasPlan?.maxSeats ?? -1;
      if (limit >= 0) {
        const count = await Seat.count({
          include: [
            {
              model: Room,
              required: true,
              include: [
                {
                  model: Floor,
                  required: true,
                  include: [
                    { model: Branch, required: true, where: { workspaceId } },
                  ],
                },
              ],
            },
          ],
          transaction,
        });
        if (count >= limit)
          throw new BadRequestException('SaaS plan seat limit reached');
      }
      return Seat.create(
        { roomId, number: number.trim(), status: SeatStatus.AVAILABLE } as any,
        { transaction },
      );
    });
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
      throw new BadRequestException(
        'Cannot delete an occupied or reserved seat',
      );
    }
    await seat.destroy();
    return { success: true };
  }

  async deleteRoom(roomId: string) {
    const room = await Room.findByPk(roomId, { include: [Seat] });
    if (!room) throw new NotFoundException('Room not found');

    const occupiedSeats =
      room.seats?.filter((s) => s.status !== SeatStatus.AVAILABLE) || [];
    if (occupiedSeats.length > 0) {
      throw new BadRequestException('Cannot delete a room with occupied seats');
    }

    await Seat.destroy({ where: { roomId } });
    await room.destroy();
    return { success: true };
  }

  async deleteFloor(floorId: string) {
    const floor = await Floor.findByPk(floorId, {
      include: [{ model: Room, include: [Seat] }],
    });
    if (!floor) throw new NotFoundException('Floor not found');

    const rooms = floor.rooms || [];
    for (const room of rooms) {
      const occupiedSeats =
        room.seats?.filter((s) => s.status !== SeatStatus.AVAILABLE) || [];
      if (occupiedSeats.length > 0) {
        throw new BadRequestException(
          'Cannot delete a floor with occupied seats',
        );
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

  private async seatInBranch(
    seatId: string,
    branchId: string,
    transaction: Transaction,
  ) {
    const seat = await Seat.findOne({
      where: { id: seatId },
      transaction,
      include: [
        {
          model: Room,
          required: true,
          include: [{ model: Floor, required: true, where: { branchId } }],
        },
      ],
    });
    if (!seat)
      throw new BadRequestException('Seat must belong to the student branch');
    if ([SeatStatus.BLOCKED, SeatStatus.RESERVED].includes(seat.status))
      throw new BadRequestException('Seat is blocked or reserved');
    return seat;
  }

  private async assertAvailable(
    seatId: string,
    shiftIds: string[],
    startDate: Date,
    endDate: Date,
    studentId: string,
    transaction: Transaction,
  ) {
    const occupied = await SeatAllocation.findAll({
      where: {
        seatId,
        isActive: true,
        studentProfileId: { [Op.ne]: studentId },
        startDate: { [Op.lt]: endDate },
        endDate: { [Op.gt]: startDate },
      },
      include: [Shift],
      transaction,
    });
    const targetShifts = await Shift.findAll({
      where: { id: shiftIds },
      transaction,
    });
    for (const allocation of occupied) {
      if (
        targetShifts.some(
          (shift) =>
            shift.id === allocation.shiftId ||
            shiftsOverlap(shift, allocation.shift),
        )
      ) {
        throw new BadRequestException(
          'Seat is already allocated during the requested dates and shift',
        );
      }
    }
  }

  private async refreshSeat(seatId: string, transaction: Transaction) {
    const seat = await Seat.findByPk(seatId, { transaction });
    if (
      !seat ||
      [SeatStatus.BLOCKED, SeatStatus.RESERVED].includes(seat.status)
    )
      return;
    const count = await SeatAllocation.count({
      where: { seatId, isActive: true, endDate: { [Op.gt]: new Date() } },
      transaction,
    });
    await seat.update(
      { status: count ? SeatStatus.OCCUPIED : SeatStatus.AVAILABLE },
      { transaction },
    );
  }

  async allocateSeat(data: any) {
    const { studentProfileId, seatId, shiftId } = data;
    const startDate = new Date(data.startDate),
      endDate = new Date(data.endDate);
    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime()) ||
      endDate <= startDate
    ) {
      throw new BadRequestException(
        'End date must be after a valid start date',
      );
    }
    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student || student.status !== 'APPROVED')
      throw new BadRequestException('Approved student required');
    return sequelize.transaction(async (transaction) => {
      await Workspace.findByPk(student.workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      await this.seatInBranch(seatId, student.branchId, transaction);
      const shift = await Shift.findOne({
        where: { id: shiftId, workspaceId: student.workspaceId },
        transaction,
      });
      if (!shift) throw new BadRequestException('Invalid shift');
      const shiftIds = [
        ...new Set(shift.type === 'CLUBBED' ? shift.baseShiftIds : [shift.id]),
      ];
      const shifts = await Shift.findAll({
        where: { id: shiftIds, workspaceId: student.workspaceId, type: 'BASE' },
        transaction,
      });
      if (!shiftIds.length || shifts.length !== shiftIds.length)
        throw new BadRequestException('Invalid base shifts');
      await this.assertAvailable(
        seatId,
        shiftIds,
        startDate,
        endDate,
        student.id,
        transaction,
      );
      const old = await SeatAllocation.findAll({
        where: { studentProfileId, isActive: true },
        transaction,
      });
      await SeatAllocation.update(
        { isActive: false },
        { where: { studentProfileId, isActive: true }, transaction },
      );
      let result;
      for (const id of shiftIds)
        result = await SeatAllocation.create(
          {
            workspaceId: student.workspaceId,
            studentProfileId,
            seatId,
            shiftId: id,
            startDate,
            endDate,
            isActive: true,
          } as any,
          { transaction },
        );
      for (const id of new Set([...old.map((a) => a.seatId), seatId]))
        await this.refreshSeat(id, transaction);
      return result;
    });
  }

  async transferSeat(allocationId: string, targetSeatId: string) {
    const current = await SeatAllocation.findByPk(allocationId);
    if (!current) throw new NotFoundException('Allocation not found');
    return sequelize.transaction(async (transaction) => {
      await Workspace.findByPk(current.workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const allocation = await SeatAllocation.findByPk(allocationId, {
        transaction,
      });
      if (!allocation?.isActive || allocation.endDate <= new Date())
        throw new BadRequestException('Active allocation required');
      const student = await StudentProfile.findByPk(
        allocation.studentProfileId,
        { transaction },
      );
      if (!student) throw new NotFoundException('Student not found');
      await this.seatInBranch(targetSeatId, student.branchId, transaction);
      if (allocation.seatId === targetSeatId) return allocation;
      const all = await SeatAllocation.findAll({
        where: {
          studentProfileId: student.id,
          seatId: allocation.seatId,
          isActive: true,
        },
        transaction,
      });
      let result;
      for (const row of all) {
        const start = row.startDate > new Date() ? row.startDate : new Date();
        if (row.endDate <= start) continue;
        await this.assertAvailable(
          targetSeatId,
          [row.shiftId],
          start,
          row.endDate,
          student.id,
          transaction,
        );
        await row.update({ isActive: false }, { transaction });
        result = await SeatAllocation.create(
          {
            workspaceId: row.workspaceId,
            studentProfileId: student.id,
            seatId: targetSeatId,
            shiftId: row.shiftId,
            startDate: start,
            endDate: row.endDate,
            isActive: true,
          } as any,
          { transaction },
        );
      }
      await this.refreshSeat(allocation.seatId, transaction);
      await this.refreshSeat(targetSeatId, transaction);
      return result;
    });
  }

  async vacateSeat(seatId: string, studentProfileId?: string) {
    const seat = await Seat.findByPk(seatId, {
      include: [
        { model: Room, include: [{ model: Floor, include: [Branch] }] },
      ],
    });
    if (!seat) throw new NotFoundException('Seat not found');
    return sequelize.transaction(async (transaction) => {
      await Workspace.findByPk(seat.room.floor.branch.workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      await SeatAllocation.update(
        { isActive: false },
        {
          where: {
            seatId,
            isActive: true,
            ...(studentProfileId ? { studentProfileId } : {}),
          },
          transaction,
        },
      );
      await this.refreshSeat(seatId, transaction);
      return { success: true };
    });
  }

  async checkExpirations(workspaceId: string, branchId?: string) {
    return sequelize.transaction(async (transaction) => {
      await Workspace.findByPk(workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const students = branchId
        ? await StudentProfile.findAll({
            where: { workspaceId, branchId },
            attributes: ['id'],
            transaction,
          })
        : null;
      const expired = await SeatAllocation.findAll({
        where: {
          workspaceId,
          isActive: true,
          ...(students ? { studentProfileId: students.map((s) => s.id) } : {}),
          endDate: { [Op.lte]: new Date() },
        },
        transaction,
      });
      for (const allocation of expired)
        await allocation.update({ isActive: false }, { transaction });
      for (const seatId of new Set(expired.map((a) => a.seatId)))
        await this.refreshSeat(seatId, transaction);
      return { expiredCount: expired.length };
    });
  }

  async updateLayout(
    roomId: string,
    layout: Array<{ id: string; x: number; y: number }>,
    canvasWidth?: number,
    canvasHeight?: number,
    spacers?: any[],
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
      await Room.update(updateFields, { where: { id: roomId } });
    }

    const updatedIds = [];
    for (const item of layout as Array<{
      id: string;
      x: number;
      y: number;
      rotation?: number;
    }>) {
      const updateData: any = { x: item.x, y: item.y };
      if (item.rotation !== undefined) {
        updateData.rotation = item.rotation;
      }
      const [updatedCount] = await Seat.update(updateData, {
        where: { id: item.id, roomId },
      });
      if (updatedCount > 0) {
        updatedIds.push(item.id);
      }
    }
    return { success: true, updatedCount: updatedIds.length };
  }

  async updateAllocation(
    allocationId: string,
    data: { startDate?: string; endDate?: string },
  ) {
    const current = await SeatAllocation.findByPk(allocationId);
    if (!current) throw new NotFoundException('Allocation not found');
    return sequelize.transaction(async (transaction) => {
      await Workspace.findByPk(current.workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const allocation = await SeatAllocation.findByPk(allocationId, {
        transaction,
      });
      if (!allocation) throw new NotFoundException('Allocation not found');
      const startDate = data.startDate
        ? new Date(data.startDate)
        : allocation.startDate;
      const endDate = data.endDate
        ? new Date(data.endDate)
        : allocation.endDate;
      if (
        !Number.isFinite(startDate.getTime()) ||
        !Number.isFinite(endDate.getTime()) ||
        endDate <= startDate
      ) {
        throw new BadRequestException(
          'End date must be after a valid start date',
        );
      }
      if (allocation.isActive)
        await this.assertAvailable(
          allocation.seatId,
          [allocation.shiftId],
          startDate,
          endDate,
          allocation.studentProfileId,
          transaction,
        );
      await allocation.update({ startDate, endDate }, { transaction });
      await this.refreshSeat(allocation.seatId, transaction);
      // Never infer a subscription from creation order. Explicit linkage is a later migration.
      return allocation;
    });
  }
}

export function shiftsOverlap(
  a: Pick<Shift, 'startTime' | 'endTime'>,
  b: Pick<Shift, 'startTime' | 'endTime'>,
): boolean {
  function ranges(shift: Pick<Shift, 'startTime' | 'endTime'>): number[][] {
    const parse = (value: string) => {
      if (!/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value) && value !== '24:00')
        throw new BadRequestException('Invalid shift time');
      return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    };
    const start = parse(shift.startTime),
      end = parse(shift.endTime);
    if (start === end) return [[0, 1440]];
    return end > start
      ? [[start, end]]
      : [
          [start, 1440],
          [0, end],
        ];
  }
  return ranges(a).some((x) =>
    ranges(b).some((y) => x[0] < y[1] && y[0] < x[1]),
  );
}
