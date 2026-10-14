import sequelize from '../config/database';
import { Transaction } from 'sequelize';
import { Attendance, AttendanceMethod } from '../models/attendance.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import {
  NotFoundException,
  BadRequestException,
} from '../middlewares/error.middleware';
export class AttendanceService {
  async checkIn(
    studentProfileId: string,
    method: AttendanceMethod,
    transaction?: Transaction,
  ): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) =>
        this.checkIn(studentProfileId, method, t),
      );
    const student = await StudentProfile.findByPk(studentProfileId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!student) throw new NotFoundException('Student profile not found');
    const todayStr = new Date().toISOString().split('T')[0];
    const existingAttendance = await Attendance.findOne({
      ...{
        where: {
          studentProfileId,
          date: todayStr,
        },
      },
      transaction,
    });
    if (existingAttendance && existingAttendance.checkIn) {
      throw new BadRequestException('Student already checked in today');
    }
    if (existingAttendance) {
      await existingAttendance.update(
        {
          checkIn: new Date(),
          method,
        },
        { transaction },
      );
      return existingAttendance;
    }
    return Attendance.create(
      {
        workspaceId: student.workspaceId,
        branchId: student.branchId,
        studentProfileId,
        date: todayStr as any,
        checkIn: new Date(),
        method,
      } as any,
      { transaction },
    );
  }
  async checkOut(
    studentProfileId: string,
    transaction?: Transaction,
  ): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) => this.checkOut(studentProfileId, t));
    const student = await StudentProfile.findByPk(studentProfileId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!student) throw new NotFoundException('Student profile not found');
    const todayStr = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({
      ...{
        where: {
          studentProfileId,
          date: todayStr,
        },
      },
      transaction,
    });
    if (!attendance) {
      throw new BadRequestException(
        'No active check-in session found for today',
      );
    }
    if (attendance.checkOut) return attendance;
    await attendance.update({ checkOut: new Date() }, { transaction });
    return attendance;
  }
  async getDailyAttendance(
    workspaceId: string,
    date: string,
    branchId?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return Attendance.findAll({
      where: {
        workspaceId,
        ...(branchId ? { branchId } : {}),
        date: targetDate,
      },
      include: [
        {
          model: StudentProfile,
          required: true,
          include: [{ model: User }],
        },
      ],
    });
  }
  async getStudentAttendanceHistory(studentProfileId: string) {
    return Attendance.findAll({
      where: { studentProfileId },
      order: [['date', 'DESC']],
    });
  }
}
