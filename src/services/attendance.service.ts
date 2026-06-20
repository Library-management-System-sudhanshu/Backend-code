import { Attendance, AttendanceMethod } from '../models/attendance.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import { NotFoundException, BadRequestException } from '../middlewares/error.middleware';

export class AttendanceService {
  async checkIn(studentProfileId: string, method: AttendanceMethod) {
    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');

    const todayStr = new Date().toISOString().split('T')[0];

    const existingAttendance = await Attendance.findOne({
      where: {
        studentProfileId,
        date: todayStr,
      },
    });

    if (existingAttendance && existingAttendance.checkIn) {
      throw new BadRequestException('Student already checked in today');
    }

    if (existingAttendance) {
      await existingAttendance.update({
        checkIn: new Date(),
        method,
      });
      return existingAttendance;
    }

    return Attendance.create({
      studentProfileId,
      date: todayStr as any,
      checkIn: new Date(),
      method,
    } as any);
  }

  async checkOut(studentProfileId: string) {
    const todayStr = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      where: {
        studentProfileId,
        date: todayStr,
      },
    });

    if (!attendance) {
      throw new BadRequestException('No active check-in session found for today');
    }

    await attendance.update({ checkOut: new Date() });
    return attendance;
  }

  async getDailyAttendance(workspaceId: string, date: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    return Attendance.findAll({
      where: { date: targetDate },
      include: [
        {
          model: StudentProfile,
          required: true,
          include: [{ model: User, where: { workspaceId } }],
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
