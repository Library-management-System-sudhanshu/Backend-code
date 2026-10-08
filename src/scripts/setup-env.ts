import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const root = path.resolve(__dirname, '../..');
const target = path.join(root, '.env');

try {
  const template = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  fs.writeFileSync(target, template.replace('GENERATE_WITH_NPM_RUN_SETUP_ENV', randomBytes(32).toString('hex')), {
    flag: 'wx',
    mode: 0o600,
  });
  console.log('Created .env with a generated JWT secret. Set DATABASE_URL to your Supabase Session pooler URI, then run npm run db:check.');
} catch (error: any) {
  if (error.code === 'EEXIST') {
    console.log('.env already exists; it was left unchanged.');
  } else {
    throw error;
  }
}
