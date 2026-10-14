import { StudentProfile } from './src/models/student-profile.model';
import { User } from './src/models/user.model';
import { SeatAllocation } from './src/models/seat-allocation.model';
import { Seat } from './src/models/seat.model';
import { Shift } from './src/models/shift.model';
import { StudentSubscription } from './src/models/student-subscription.model';
import { Payment } from './src/models/payment.model';
import sequelize from './src/config/database';

async function test() {
  await sequelize.authenticate();
  const { rows } = await StudentProfile.findAndCountAll({
      where: { workspaceId: '0d6342af-534c-4a06-aa6e-c5c26843f30b' },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'mobile', 'avatar'],
        },
        {
          model: SeatAllocation,
          required: false,
          include: [{ model: Seat }, { model: Shift }],
        },
        {
          model: StudentSubscription,
          required: false,
          include: [{ all: true }],
        },
        {
          model: Payment,
          required: false,
        },
      ],
      distinct: true,
      limit: 10,
      offset: 0,
      order: [['createdAt', 'DESC']],
    });
  const trial2 = rows.find((s: any) => Number(s.dueAmount) === 150);
  console.log("Payments for trial2:", trial2?.payments);
  process.exit(0);
}
test();
