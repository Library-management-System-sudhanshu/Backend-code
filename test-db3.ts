import { StudentProfile } from './src/models/student-profile.model';
import { Payment } from './src/models/payment.model';
import { StudentSubscription } from './src/models/student-subscription.model';
import sequelize from './src/config/database';

async function test() {
  await sequelize.authenticate();
  const { rows } = await StudentProfile.findAndCountAll({
      include: [
        {
          model: StudentSubscription,
          required: false,
        },
        {
          model: Payment,
          required: false,
        },
      ],
      distinct: true,
      limit: 10,
      offset: 0,
    });
  console.log(JSON.stringify(rows.find((s: any) => Number(s.dueAmount) === 150), null, 2));
  process.exit(0);
}
test();
