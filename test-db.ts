import { StudentProfile } from './src/models/student-profile.model';
import { Payment } from './src/models/payment.model';
import sequelize from './src/config/database';

async function test() {
  await sequelize.authenticate();
  const students = await StudentProfile.findAll({
    include: [{ model: Payment, required: false }]
  });
  console.log(students.map(s => s.toJSON()));
  process.exit(0);
}
test();
