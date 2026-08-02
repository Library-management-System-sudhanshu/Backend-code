import sequelize from '../config/database';

async function clearDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connected to database successfully.');

    // Fetch all table names from database
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    console.log(`[Database] Found ${tables.length} tables: ${tables.join(', ')}`);

    if (tables.length === 0) {
      console.log('[Database] No tables found to clear.');
      process.exit(0);
    }

    const dialect = sequelize.getDialect();
    console.log(`[Database] Truncating tables for dialect: ${dialect}...`);

    if (dialect === 'postgres') {
      // For PostgreSQL: quote all table names and truncate with CASCADE & RESTART IDENTITY
      const quotedTableNames = (tables as any[]).map((t: any) => {
        const name = typeof t === 'object' && t !== null && 'tableName' in t ? t.tableName : t;
        return `"${name}"`;
      }).join(', ');

      await sequelize.query(`TRUNCATE TABLE ${quotedTableNames} RESTART IDENTITY CASCADE;`);
    } else {
      // For SQLite or other dialects: disable foreign keys and truncate each
      await sequelize.query('PRAGMA foreign_keys = OFF;');
      for (const table of (tables as any[])) {
        const tableName = typeof table === 'object' && table !== null && 'tableName' in table ? table.tableName : table;
        await sequelize.query(`DELETE FROM "${tableName}";`);
      }
      await sequelize.query('PRAGMA foreign_keys = ON;');
    }

    console.log('[Database] All data records cleared successfully, table structures preserved.');
    process.exit(0);
  } catch (error) {
    console.error('[Database] Failed to clear database:', error);
    process.exit(1);
  }
}

clearDatabase();
