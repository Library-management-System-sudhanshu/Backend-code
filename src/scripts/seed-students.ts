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
  UserRole,
} from '../models';

const INDIAN_NAMES = [
  'Aarav Sharma', 'Aditya Patel', 'Arjun Verma', 'Vihaan Gupta', 'Sai Reddy',
  'Ananya Iyer', 'Diya Sen', 'Isha Rao', 'Krishna Nair', 'Pranav Joshi',
  'Kabir Malhotra', 'Rohan Das', 'Vivaan Saxena', 'Aanya Trivedi', 'Saanvi Kulkarni',
  'Aaradhya Bhat', 'Meera Pillai', 'Radhika Pandey', 'Riya Chawla', 'Neha Kapoor',
  'Devendra Singh', 'Yash Chaudhury', 'Harish Mishra', 'Sanjay Kumar', 'Rajesh Gupta',
  'Amit Patel', 'Siddharth Roy', 'Ishaan Bose', 'Madhav Acharya', 'Ganesh Bhat',
  'Karan Johar', 'Varun Dhawan', 'Ranbir Kapoor', 'Sid Malhotra', 'Kartik Aaryan',
  'Deepika Padukone', 'Alia Bhatt', 'Shraddha Kapoor', 'Kriti Sanon', 'Kiara Advani',
  'Priyanka Chopra', 'Katrina Kaif', 'Kareena Kapoor', 'Anushka Sharma', 'Sonam Kapoor',
  'Rahul Dravid', 'Sachin Tendulkar', 'Virat Kohli', 'Rohit Sharma', 'MS Dhoni',
  'Shikhar Dhawan', 'Hardik Pandya', 'Rishabh Pant', 'KL Rahul', 'Jasprit Bumrah',
  'Ravindra Jadeja', 'Ravichandran Ashwin', 'Mohammed Shami', 'Yuzvendra Chahal', 'Kuldeep Yadav',
  'Bhuvneshwar Kumar', 'Axar Patel', 'Shardul Thakur', 'Deepak Chahar', 'Shreyas Iyer',
];

async function seed() {
  console.log('Connecting to database...');
  await sequelize.authenticate();
  console.log('Database connection successful!');

  console.log('Synchronizing schema...');
  await sequelize.sync({ alter: true });
  console.log('Database schema synchronized.');

  // 1. Find or create the target owner user (rakesh@gmail.com)
  let staff = await User.findOne({ where: { email: 'rakesh@gmail.com' } });
  let workspace: Workspace | null = null;
  let branch: Branch | null = null;

  if (staff) {
    console.log(`Found target admin user: ${staff.email}`);
    workspace = await Workspace.findByPk(staff.workspaceId);
    branch = await Branch.findByPk(staff.branchId);
  }

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

  // Create or update rakesh@gmail.com
  if (!staff) {
    const hashedStaffPassword = await bcrypt.hash('password123', 10);
    staff = await User.create({
      email: 'rakesh@gmail.com',
      password: hashedStaffPassword,
      name: 'Rakesh Admin',
      role: 'OWNER',
      workspaceId: workspace.id,
      branchId: branch.id,
    } as any);
    console.log(`Created Admin User: ${staff.email}`);
  } else {
    // Make sure role and workspace/branch are set correctly
    await staff.update({
      role: UserRole.OWNER,
      workspaceId: workspace.id,
      branchId: branch.id,
    });
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

  // 6. Find or create Floor, Room
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

  // Delete all existing seat allocations and seats to start with a fresh slate
  console.log('Cleaning up existing seat allocations and seats...');
  await SeatAllocation.destroy({ where: {} });
  await Seat.destroy({ where: {} });

  // Create exactly 100 seats
  const seats: Seat[] = [];
  for (let i = 1; i <= 100; i++) {
    const number = `${i}`;
    let status = 'AVAILABLE';
    // 5 seats under maintenance (Seats 96 to 100)
    if (i >= 96) {
      status = 'BLOCKED';
    } else if (i <= 65) {
      // Seats 1 to 65 will be occupied
      status = 'OCCUPIED';
    }

    const seat = await Seat.create({
      roomId: room.id,
      number,
      status,
    } as any);
    seats.push(seat);
  }
  console.log('Created exactly 100 seats (1-100).');

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

  // 8. Clear any previous seeded students
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
      await StudentSubscription.destroy({ where: { studentProfileId: profile.id } });
      await Payment.destroy({ where: { studentProfileId: profile.id } });
      await StudentProfile.destroy({ where: { id: profile.id } });
    }
    await User.destroy({ where: { id: u.id } });
  }
  console.log(`Removed ${existingSeededUsers.length} old seeded students.`);

  // 9. Seed 65 Students to match occupied seats (1 to 65)
  console.log('Seeding 65 students...');
  const hashedStudentPassword = await bcrypt.hash('password123', 10);

  for (let i = 1; i <= 65; i++) {
    const email = `student${i}@studyflow.com`;
    const name = INDIAN_NAMES[(i - 1) % INDIAN_NAMES.length];
    const mobile = `9876543${String(i).padStart(3, '0')}`;

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
      guardianName: `Guardian of ${name}`,
      guardianMobile: `9112233${String(i).padStart(3, '0')}`,
      aadharNumber: `1234567890${String(i).padStart(2, '0')}`,
      joiningDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'APPROVED',
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.id}`,
    } as any);

    // Distribution:
    // 1. Active: Seats 1 - 25 (25 students) -> ACTIVE subscription expiring in 15 days
    // 2. Expiring Soon: Seats 26 - 55 (30 students) -> ACTIVE subscription expiring in 3 days (<= 7 days)
    // 3. Expired: Seats 56 - 65 (10 students) -> EXPIRED subscription expiring 10 days ago
    let startDate = new Date();
    let endDate = new Date();
    let subStatus = 'ACTIVE';

    if (i <= 25) {
      // Active (25)
      startDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      endDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      subStatus = 'ACTIVE';
    } else if (i <= 55) {
      // Expiring soon (30)
      startDate = new Date(Date.now() - 27 * 24 * 60 * 60 * 1000);
      endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      subStatus = 'ACTIVE';
    } else {
      // Expired (10)
      startDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      endDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      subStatus = 'EXPIRED';
    }

    const plan = plans[i % plans.length];
    await StudentSubscription.create({
      studentProfileId: profile.id,
      subscriptionPlanId: plan.id,
      startDate,
      endDate,
      status: subStatus,
    } as any);

    // Create Payment
    await Payment.create({
      studentProfileId: profile.id,
      amount: plan.price,
      status: 'PAID',
      method: 'UPI',
      transactionId: `TXN_${Date.now()}_${i}`,
      paidAt: new Date(startDate.getTime() + 60 * 60 * 1000),
    } as any);

    // Allocate Seat
    const seat = seats[i - 1];
    const shift = shifts[i % shifts.length];
    await SeatAllocation.create({
      studentProfileId: profile.id,
      seatId: seat.id,
      shiftId: shift.id,
      startDate,
      endDate,
      isActive: true,
    } as any);
  }

  console.log('Successfully seeded 100 seats and 65 students with Indian names under rakesh@gmail.com!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});

