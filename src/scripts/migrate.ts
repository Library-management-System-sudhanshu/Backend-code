import fs from 'node:fs/promises';
import path from 'node:path';
import sequelize from '../config/database';

async function main() {
  try {
    for (const name of [
      '001-payment-integrity.sql',
      '002-memberships-and-access.sql',
      '003-cascade-account-deletion.sql',
      '004-cascade-users-on-workspace-delete.sql',
    ]) {
      const sql = await fs.readFile(
        path.resolve(__dirname, '../../migrations', name),
        'utf8',
      );
      await sequelize.query(sql);
      console.log(`Applied ${name}`);
    }
  } finally {
    await sequelize.close();
  }
}
main().catch((error) => {
  console.error(
    'Migration failed:',
    (error as any).original?.message || (error as any).message || error,
  );
  if ((error as any).original?.detail) {
    console.error('Detail:', (error as any).original.detail);
  }
  process.exitCode = 1;
});
