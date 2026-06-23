import { Complaint, ComplaintCategory, ComplaintStatus } from '../models/complaint.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import { NotFoundException } from '../middlewares/error.middleware';

export class ComplaintService {
  async createComplaint(studentProfileId: string, data: { category: ComplaintCategory; description: string }) {
    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');

    return Complaint.create({
      studentProfileId,
      category: data.category,
      description: data.description,
      status: 'OPEN',
    } as any);
  }

  async getWorkspaceComplaints(workspaceId: string) {
    return Complaint.findAll({
      include: [
        {
          model: StudentProfile,
          required: true,
          include: [{ model: User, where: { workspaceId } }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getStudentComplaints(studentProfileId: string) {
    return Complaint.findAll({
      where: { studentProfileId },
      order: [['createdAt', 'DESC']],
    });
  }

  async updateComplaintStatus(id: string, resolvedById: string, status: ComplaintStatus) {
    const complaint = await Complaint.findByPk(id);
    if (!complaint) throw new NotFoundException('Complaint not found');

    await complaint.update({
      status,
      resolvedById,
    });

    return complaint;
  }
}
