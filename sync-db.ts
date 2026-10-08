import sequelize from './src/config/database';

async function syncDb() {
  try {
    console.log('Syncing DB...');
    await sequelize.sync({ alter: true });
    console.log('DB Synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing DB:', error);
    process.exit(1);
  }
}
syncDb();
