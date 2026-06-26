import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import {
  Workspace,
  Branch,
  User,
  StudentProfile,
  Shift,
  SubscriptionPlan,
  Floor,
  Room,
  Seat,
  SeatAllocation,
  StudentSubscription,
  Attendance,
  Complaint,
  Book,
  BookIssue,
  Payment,
  WorkspaceSetting,
} from '../models';

async function seed() {
  console.log('Connecting to database...');
  await sequelize.authenticate();
  console.log('Database connection successful!');

  // Sync schema to incorporate any model changes (e.g., fcmToken)
  console.log('Synchronizing schema...');
  await sequelize.sync({ alter: true });
  console.log('Database schema synchronized.');

  // 1. Find or create the target admin user (rakesh1@gmail.com)
  let staff = await User.findOne({ where: { email: 'rakesh1@gmail.com' } });
  let workspace: Workspace | null = null;
  let branch: Branch | null = null;

  if (staff) {
    console.log(`Found target admin user: ${staff.email}`);
    workspace = await Workspace.findByPk(staff.workspaceId);
    branch = await Branch.findByPk(staff.branchId);
  }

  // If workspace or branch not found from staff, fallback to find or create
  if (!workspace) {
    workspace = await Workspace.findOne();
  }
  if (!workspace) {
    workspace = await Workspace.create({
      name: 'Sri ram digital library',
      subdomain: 'studyflow',
      address: '123 Main St, New Delhi',
    } as any);
    console.log(`Created Workspace: ${workspace.name} (${workspace.id})`);
  } else {
    console.log(`Using Workspace: ${workspace.name}`);
  }

  // 2. Find or create Workspace Settings
  let setting = await WorkspaceSetting.findOne({ where: { workspaceId: workspace.id } });
  if (!setting) {
    setting = await WorkspaceSetting.create({
      workspaceId: workspace.id,
      themeColor: '#2563EB',
    } as any);
    console.log('Created Workspace Settings.');
  }

  // 3. Find or create Branch
  if (!branch) {
    branch = await Branch.findOne({ where: { workspaceId: workspace.id } });
  }
  if (!branch) {
    branch = await Branch.create({
      workspaceId: workspace.id,
      name: 'Main Branch',
      address: '123 Main St, New Delhi',
    } as any);
    console.log(`Created Branch: ${branch.name}`);
  } else {
    console.log(`Using Branch: ${branch.name}`);
  }

  // Now, if staff (rakesh1@gmail.com) wasn't found, create them under this workspace & branch
  if (!staff) {
    const hashedStaffPassword = await bcrypt.hash('password123', 10);
    staff = await User.create({
      email: 'rakesh1@gmail.com',
      password: hashedStaffPassword,
      name: 'Rakesh Admin',
      role: 'OWNER',
      workspaceId: workspace.id,
      branchId: branch.id,
    } as any);
    console.log(`Created Admin User: ${staff.email}`);
  }

  // 4. Find or create Shifts
  const shiftData = [
    { name: 'Morning Shift', startTime: '08:00', endTime: '14:00', price: 1200, capacity: 50 },
    { name: 'Evening Shift', startTime: '14:00', endTime: '20:00', price: 1200, capacity: 50 },
    { name: 'Night Shift', startTime: '20:00', endTime: '02:00', price: 1500, capacity: 30 },
    { name: 'Full Day Shift', startTime: '08:00', endTime: '20:00', price: 2000, capacity: 100 },
  ];
  const shifts: Shift[] = [];
  for (const sd of shiftData) {
    let s = await Shift.findOne({ where: { name: sd.name, workspaceId: workspace.id } });
    if (!s) {
      s = await Shift.create({ ...sd, workspaceId: workspace.id } as any);
      console.log(`Created Shift: ${s.name}`);
    }
    shifts.push(s);
  }

  // 5. Find or create Subscription Plans
  const planData = [
    { name: 'Basic Monthly', durationDays: 30, price: 1500 },
    { name: 'Standard Quarterly', durationDays: 90, price: 4000 },
    { name: 'Pro Semi-Annual', durationDays: 180, price: 7500 },
  ];
  const plans: SubscriptionPlan[] = [];
  for (const pd of planData) {
    let p = await SubscriptionPlan.findOne({ where: { name: pd.name, workspaceId: workspace.id } });
    if (!p) {
      p = await SubscriptionPlan.create({ ...pd, workspaceId: workspace.id } as any);
      console.log(`Created Plan: ${p.name}`);
    }
    plans.push(p);
  }

  // 6. Find or create Floor, Room, and Seats
  let floor = await Floor.findOne({ where: { branchId: branch.id } });
  if (!floor) {
    floor = await Floor.create({
      branchId: branch.id,
      name: '1st Floor',
    } as any);
    console.log(`Created Floor: ${floor.name}`);
  }
  let room = await Room.findOne({ where: { floorId: floor.id } });
  if (!room) {
    room = await Room.create({
      floorId: floor.id,
      name: 'Hall A',
    } as any);
    console.log(`Created Room: ${room.name}`);
  }

  const seats: Seat[] = [];
  for (let i = 1; i <= 60; i++) {
    const number = `A-${i}`;
    let seat = await Seat.findOne({ where: { roomId: room.id, number } });
    if (!seat) {
      seat = await Seat.create({
        roomId: room.id,
        number,
        status: 'AVAILABLE',
      } as any);
    }
    seats.push(seat);
  }
  console.log(`Ensured 60 seats exist in Room ${room.name}.`);

  // 7. Find or create Books in library
  const bookData = [
    { title: 'Clean Code', author: 'Robert C. Martin', category: 'Programming', quantity: 5, rackNumber: 'R-1' },
    { title: 'Introduction to Algorithms', author: 'CLRS', category: 'Algorithms', quantity: 3, rackNumber: 'R-2' },
    { title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', category: 'Programming', quantity: 10, rackNumber: 'R-3' },
    { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'Software Engineering', quantity: 4, rackNumber: 'R-1' },
    { title: 'Design Patterns', author: 'Gang of Four', category: 'Software Engineering', quantity: 3, rackNumber: 'R-4' },
  ];
  const books: Book[] = [];
  for (const bd of bookData) {
    let book = await Book.findOne({ where: { title: bd.title, workspaceId: workspace.id } });
    if (!book) {
      book = await Book.create({ ...bd, workspaceId: workspace.id } as any);
      console.log(`Created Book: ${book.title}`);
    }
    books.push(book);
  }

  // 8. Admin user confirmation
  console.log(`Using Admin user: ${staff.email} for resolving complaints/issuing books.`);

  // 9. Clear any previous seeded students to run cleanly
  console.log('Cleaning up previously seeded students...');
  const existingSeededUsers = await User.findAll({
    where: {
      email: {
        [Op.like]: 'student%@studyflow.com',
      },
    },
  });
  for (const u of existingSeededUsers) {
    const profile = await StudentProfile.findOne({ where: { userId: u.id } });
    if (profile) {
      await Attendance.destroy({ where: { studentProfileId: profile.id } });
      await Complaint.destroy({ where: { studentProfileId: profile.id } });
      await BookIssue.destroy({ where: { studentProfileId: profile.id } });
      await SeatAllocation.destroy({ where: { studentProfileId: profile.id } });
      await StudentSubscription.destroy({ where: { studentProfileId: profile.id } });
      await Payment.destroy({ where: { studentProfileId: profile.id } });
      await StudentProfile.destroy({ where: { id: profile.id } });
    }
    await User.destroy({ where: { id: u.id } });
  }
  console.log(`Removed ${existingSeededUsers.length} old seeded students.`);

  // Reset seat statuses to AVAILABLE before allocation
  for (const seat of seats) {
    seat.status = 'AVAILABLE' as any;
    await seat.save();
  }

  // 10. Seed 50 Students
  console.log('Seeding 50 students...');
  const hashedStudentPassword = await bcrypt.hash('password123', 10);

  for (let i = 1; i <= 50; i++) {
    const email = `student${i}@studyflow.com`;
    const name = `Student ${i}`;
    const mobile = `9876543${String(i).padStart(3, '0')}`;

    // Status: APPROVED (1-35), PENDING (36-43), WAITLISTED (44-48), REJECTED (49-50)
    let status = 'APPROVED';
    if (i > 35 && i <= 43) status = 'PENDING';
    else if (i > 43 && i <= 48) status = 'WAITLISTED';
    else if (i > 48) status = 'REJECTED';

    const user = await User.create({
      email,
      password: hashedStudentPassword,
      name,
      mobile,
      role: 'STUDENT',
      workspaceId: workspace.id,
      branchId: branch.id,
    } as any);

    const profile = await StudentProfile.create({
      userId: user.id,
      branchId: branch.id,
      guardianName: `Guardian of Student ${i}`,
      guardianMobile: `9112233${String(i).padStart(3, '0')}`,
      aadharNumber: `1234567890${String(i).padStart(2, '0')}`,
      joiningDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.id}`,
    } as any);

    // Only set up subscriptions, seats, payments, and library stuff for APPROVED students
    if (status === 'APPROVED') {
      // Subscriptions distribution:
      // Active Subscriptions (i <= 25)
      // Expired Subscriptions (26 <= i <= 30)
      // Upcoming Subscriptions (31 <= i <= 35)
      let subType = '';
      if (i <= 25) subType = 'ACTIVE';
      else if (i <= 30) subType = 'EXPIRED';
      else if (i <= 35) subType = 'UPCOMING';

      if (subType) {
        const plan = plans[i % plans.length];
        let startDate = new Date();
        let endDate = new Date();
        let subStatus = 'ACTIVE';
        let isFrozen = false;
        let freezeDate: Date | null = null;

        if (subType === 'ACTIVE') {
          startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
          endDate = new Date(Date.now() + (plan.durationDays - 10) * 24 * 60 * 60 * 1000);

          // Freeze a few active ones (e.g. 24, 25)
          if (i >= 24) {
            subStatus = 'FROZEN';
            isFrozen = true;
            freezeDate = new Date();
          }
        } else if (subType === 'EXPIRED') {
          startDate = new Date(Date.now() - (plan.durationDays + 15) * 24 * 60 * 60 * 1000);
          endDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
          subStatus = 'EXPIRED';
        } else if (subType === 'UPCOMING') {
          startDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // in 2 days
          endDate = new Date(Date.now() + (plan.durationDays + 2) * 24 * 60 * 60 * 1000);
          subStatus = 'ACTIVE';
        }

        await StudentSubscription.create({
          studentProfileId: profile.id,
          subscriptionPlanId: plan.id,
          startDate,
          endDate,
          status: subStatus,
          isFrozen,
          freezeDate,
        } as any);

        // Payments
        let payStatus = 'PAID';
        let payMethod = 'UPI';
        if (subType === 'UPCOMING' && i % 2 === 0) payStatus = 'UNPAID';
        else if (subType === 'UPCOMING') payStatus = 'PARTIAL';

        if (i % 3 === 0) payMethod = 'CASH';
        else if (i % 3 === 1) payMethod = 'RAZORPAY';

        await Payment.create({
          studentProfileId: profile.id,
          amount: plan.price,
          status: payStatus,
          method: payMethod,
          transactionId: payStatus === 'PAID' ? `TXN_${Date.now()}_${i}` : null,
          dueDate: payStatus !== 'PAID' ? startDate : null,
          paidAt: payStatus === 'PAID' ? new Date(startDate.getTime() + 60 * 60 * 1000) : null,
        } as any);

        // Seat allocations:
        // Active seat allocation (i <= 20)
        // Past seat allocation (21 <= i <= 30)
        let seatAllocType = '';
        if (i <= 20) seatAllocType = 'ACTIVE';
        else if (i > 20 && i <= 30) seatAllocType = 'PAST';

        if (seatAllocType) {
          const seat = seats[i - 1];
          const shift = shifts[i % shifts.length];
          const isActiveAlloc = seatAllocType === 'ACTIVE';

          await SeatAllocation.create({
            studentProfileId: profile.id,
            seatId: seat.id,
            shiftId: shift.id,
            startDate: subType === 'EXPIRED' ? new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) : startDate,
            endDate: subType === 'EXPIRED' ? new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) : endDate,
            isActive: isActiveAlloc,
          } as any);

          if (isActiveAlloc) {
            seat.status = 'OCCUPIED' as any;
            await seat.save();
          }
        }
      }
    }

    // Attendance configuration:
    // Checked In today: 1 to 15
    // Checked Out today: 16 to 30
    // Past History only: 31 to 40
    let attendanceType = '';
    if (i <= 15) attendanceType = 'CHECKED_IN';
    else if (i <= 30) attendanceType = 'CHECKED_OUT';
    else if (i <= 40) attendanceType = 'HISTORY';

    if (attendanceType === 'CHECKED_IN') {
      await Attendance.create({
        studentProfileId: profile.id,
        date: new Date(),
        checkIn: new Date(Date.now() - 3 * 60 * 60 * 1000), // checked in 3h ago
        method: 'APP_CHECK_IN',
      } as any);
    } else if (attendanceType === 'CHECKED_OUT') {
      await Attendance.create({
        studentProfileId: profile.id,
        date: new Date(),
        checkIn: new Date(Date.now() - 6 * 60 * 60 * 1000),
        checkOut: new Date(Date.now() - 2 * 60 * 60 * 1000),
        method: 'QR_CODE',
      } as any);
    }

    // Add general historical record for attendance
    if (attendanceType === 'CHECKED_IN' || attendanceType === 'CHECKED_OUT' || attendanceType === 'HISTORY') {
      await Attendance.create({
        studentProfileId: profile.id,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        checkIn: new Date(Date.now() - 29 * 60 * 60 * 1000),
        checkOut: new Date(Date.now() - 23 * 60 * 60 * 1000),
        method: 'MANUAL',
      } as any);
    }

    // Complaints configuration:
    // Open: 1 to 10
    // Resolved: 11 to 15
    let complaintType = '';
    if (i <= 10) complaintType = 'OPEN';
    else if (i > 10 && i <= 15) complaintType = 'RESOLVED';

    if (complaintType === 'OPEN') {
      const categories = ['ELECTRICITY', 'INTERNET', 'CLEANLINESS', 'SEAT_ISSUE', 'OTHER'];
      await Complaint.create({
        studentProfileId: profile.id,
        category: categories[i % categories.length],
        description: `Test complaint from student ${i} regarding ${categories[i % categories.length].toLowerCase()} issues in the study hall.`,
        status: 'OPEN',
      } as any);
    } else if (complaintType === 'RESOLVED') {
      await Complaint.create({
        studentProfileId: profile.id,
        category: 'INTERNET',
        description: `WiFi not connecting for student ${i}.`,
        status: 'RESOLVED',
        resolvedById: staff.id,
      } as any);
    }

    // Library Book Issues:
    // Issued/Active: 5 to 19
    // Returned: 20 to 29
    let bookIssueType = '';
    if (i >= 5 && i <= 19) bookIssueType = 'ISSUED';
    else if (i >= 20 && i <= 29) bookIssueType = 'RETURNED';

    if (bookIssueType === 'ISSUED') {
      const book = books[i % books.length];
      // Some overdue ones (e.g. 5, 6, 7)
      let issuedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      let dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      if (i <= 7) {
        issuedAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
        dueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // overdue by 5 days
      }

      await BookIssue.create({
        bookId: book.id,
        studentProfileId: profile.id,
        issuedById: staff.id,
        issuedAt,
        dueDate,
        status: 'ISSUED',
      } as any);
    } else if (bookIssueType === 'RETURNED') {
      const book = books[i % books.length];
      await BookIssue.create({
        bookId: book.id,
        studentProfileId: profile.id,
        issuedById: staff.id,
        issuedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        returnedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        status: 'RETURNED',
      } as any);
    }
  }

  console.log('Successfully seeded 50 students with varied scenarios!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
