import { StudentProfile } from './src/models/student-profile.model';
import { Payment } from './src/models/payment.model';
import sequelize from './src/config/database';

async function test() {
  await sequelize.authenticate();
  const { rows } = await StudentProfile.findAndCountAll({
      include: [
        {
          model: Payment,
          required: false,
        },
      ],
      distinct: true,
      limit: 100,
      offset: 0,
    });
  const trial2 = rows.find((s: any) => Number(s.dueAmount) === 150);
  console.log("Payments length for trial2:", trial2?.payments?.length);
  process.exit(0);
}
test();
