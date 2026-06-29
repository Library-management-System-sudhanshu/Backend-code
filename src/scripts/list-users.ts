import sequelize from '../config/database';
import { User } from '../models/user.model';
import { Workspace } from '../models/workspace.model';
import { Op } from 'sequelize';

async function run() {
  await sequelize.authenticate();
  const staffUsers = await User.findAll({
    where: {
      role: {
        [Op.ne]: 'STUDENT'
      }
    },
    include: [Workspace],
  });

  console.log('--- ADMIN & STAFF USERS LIST ---');
  if (staffUsers.length === 0) {
    console.log('No staff/admin/owner users found.');
  } else {
    staffUsers.forEach((user) => {
      console.log({
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: ownerWorkspaceName(user),
      });
    });
  }
  process.exit(0);
}

function ownerWorkspaceName(user: User) {
  return user.workspace?.name || 'N/A';
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
