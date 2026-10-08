import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getDatabaseConfig } from './database-options';

describe('database configuration', () => {
  const url = 'postgresql://postgres.example:p%40ss@aws-0-example.pooler.supabase.com:5432/postgres';

  it('uses verified TLS for a remote URI without local connection fields', () => {
    const result = getDatabaseConfig({ DATABASE_URL: url, DB_HOST: 'ignored' });
    expect(result.url).toBe(url);
    expect(result.options.host).toBeUndefined();
    expect(result.options.dialectOptions).toMatchObject({ ssl: { rejectUnauthorized: true } });
  });

  it('retains local PostgreSQL defaults without TLS', () => {
    const result = getDatabaseConfig({});
    expect(result.url).toBeUndefined();
    expect(result.options).toMatchObject({ host: 'localhost', port: 5432, database: 'studyflow' });
    expect(result.options.dialectOptions).toMatchObject({ ssl: false });
  });

  it('allows explicit TLS for individual remote connection parameters', () => {
    const result = getDatabaseConfig({ DB_HOST: 'remote.example', DB_SSL: 'true' });
    expect(result.options.host).toBe('remote.example');
    expect(result.options.dialectOptions).toMatchObject({ ssl: { rejectUnauthorized: true } });
  });

  it.each(['https://example.com', 'not-a-uri', url + '?sslmode=no-verify',
    'postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@YOUR_POOLER_HOST:5432/postgres'])
  ('rejects invalid or ambiguous connection settings without exposing the URI', (value) => {
    expect(() => getDatabaseConfig({ DATABASE_URL: value })).toThrow('Set DATABASE_URL');
    try {
      getDatabaseConfig({ DATABASE_URL: value });
    } catch (error: any) {
      expect(error.message).not.toContain(value);
    }
  });

  it('loads an explicit CA and keeps verification enabled', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyflow-ca-'));
    const ca = path.join(dir, 'root.cer');
    try {
      fs.writeFileSync(ca, 'test certificate');
      expect(getDatabaseConfig({ DATABASE_URL: url, DB_SSL_CA_PATH: ca }).options.dialectOptions)
        .toMatchObject({ ssl: { rejectUnauthorized: true, ca: 'test certificate' } });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a mistyped SSL flag or a CA with SSL disabled', () => {
    expect(() => getDatabaseConfig({ DB_SSL: 'tru' })).toThrow('DB_SSL must');
    expect(() => getDatabaseConfig({ DB_SSL: 'false', DB_SSL_CA_PATH: './cert.cer' })).toThrow('requires');
  });
});
