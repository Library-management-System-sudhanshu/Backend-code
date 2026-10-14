import { StudentProfile } from './src/models/student-profile.model';
import { Payment } from './src/models/payment.model';
import sequelize from './src/config/database';

async function test() {
  await sequelize.authenticate();
  const students = await StudentProfile.findAll({
    include: [{ model: Payment, required: false }]
  });
  const trial2 = students.find((s: any) => Number(s.dueAmount) === 150);
  console.log("Found trial2:", !!trial2);
  if (trial2) {
    console.log("Payments length:", trial2.payments?.length);
  }
  process.exit(0);
}
test();
