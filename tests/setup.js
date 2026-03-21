/**
 * Test setup — creates temp SQLite DB, seeds data, starts server as subprocess.
 */
import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const tempId = randomBytes(4).toString('hex');
const tempDir = join(tmpdir(), `mf-test-${tempId}`);
mkdirSync(tempDir, { recursive: true });
const testDbPath = join(tempDir, 'test-mf.db');
const testEnvPath = join(tempDir, '.env');

const TEST_PORT = 3099;
const TEST_JWT_SECRET = 'test-jwt-secret-for-ci-pipeline';

export async function seedTestData() {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(projectRoot, 'server', 'db', 'schema.sql'), 'utf-8');
  db.exec(schema);

  db.exec(`CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY, name TEXT, avatar_url TEXT,
    role TEXT DEFAULT 'user', created_at TEXT DEFAULT (datetime('now')), last_login TEXT
  )`);

  const ins = db.prepare('INSERT OR IGNORE INTO schemes (scheme_code, scheme_name, amc, category, sub_category) VALUES (?, ?, ?, ?, ?)');
  ins.run('100001', 'Test Large Cap Fund - Direct Plan - Growth', 'Test AMC', 'Open Ended Schemes', 'Equity Scheme - Large Cap Fund');
  ins.run('100002', 'Test Mid Cap Fund - Direct Plan - Growth', 'Test AMC', 'Open Ended Schemes', 'Equity Scheme - Mid Cap Fund');

  const navIns = db.prepare('INSERT OR IGNORE INTO nav_history (scheme_code, date, nav) VALUES (?, ?, ?)');
  for (let i = 0; i < 400; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const nav = 100 + Math.sin(i / 30) * 10 + i * 0.02;
    navIns.run('100001', dateStr, Math.round(nav * 10000) / 10000);
    navIns.run('100002', dateStr, Math.round(nav * 1.2 * 10000) / 10000);
  }

  db.prepare('INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)').run('admin@test.com', 'Admin', 'admin');
  db.prepare('INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)').run('user@test.com', 'User', 'user');
  db.close();
}

export async function generateToken(email, role) {
  const { default: jwt } = await import('jsonwebtoken');
  return jwt.sign({ email, role }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

export async function startServer() {
  await seedTestData();

  // Spawn server/index.js with test env vars
  // NODE_ENV=test prevents dotenv from overriding our env vars
  const serverProcess = spawn('node', ['server/index.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      MF_DB_PATH: testDbPath,
      JWT_SECRET: TEST_JWT_SECRET,
      ADMIN_EMAIL: 'admin@test.com',
      NODE_ENV: 'test',
      PORT: String(TEST_PORT),
      APP_URL: `http://localhost:${TEST_PORT}`,
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      MF_STATIC_PATH: join(projectRoot, 'client', 'dist'),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Server start timeout (15s)'));
    }, 15000);

    let stderr = '';
    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Server running')) {
        clearTimeout(timeout);
        resolve({ baseUrl: `http://localhost:${TEST_PORT}`, process: serverProcess });
      }
    });

    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}: ${stderr}`));
      }
    });
  });
}

export function stopServer(proc) {
  if (proc) proc.kill('SIGTERM');
}

export function cleanup() {
  try { unlinkSync(testDbPath); } catch {}
  try { unlinkSync(testDbPath + '-wal'); } catch {}
  try { unlinkSync(testDbPath + '-shm'); } catch {}
  try { unlinkSync(testEnvPath); } catch {}
}
