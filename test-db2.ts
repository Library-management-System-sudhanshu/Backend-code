import { StudentProfile } from './src/models/student-profile.model';
import { Payment } from './src/models/payment.model';
import sequelize from './src/config/database';

async function test() {
  await sequelize.authenticate();
  const students = await StudentProfile.findAll({
    include: [{ model: Payment, required: false }]
  });
  console.log(JSON.stringify(students.find((s: any) => Number(s.dueAmount) === 150), null, 2));
  process.exit(0);
}
test();
