import sequelize from '../config/database';
import { Workspace } from '../models/workspace.model';

async function run() {
  await sequelize.authenticate();
  const workspaces = await Workspace.findAll();
  console.log('--- WORKSPACES IN DB ---');
  workspaces.forEach(w => {
    console.log({
      id: w.id,
      name: w.name,
      subdomain: w.subdomain,
      isActive: w.isActive,
      deletedAt: (w as any).deletedAt
    });
  });
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
