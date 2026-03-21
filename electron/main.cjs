const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Ensure single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let serverPort = null;

// ── Path resolution ──────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const userDataPath = app.getPath('userData');

function getDbPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'server', 'db', 'mf-data.db');
  }
  // In production, copy DB to userData on first launch (needs to be writable)
  const userDbPath = path.join(userDataPath, 'mf-data.db');
  if (!fs.existsSync(userDbPath)) {
    const bundledDb = path.join(process.resourcesPath, 'db', 'mf-data.db');
    if (fs.existsSync(bundledDb)) {
      console.log('First launch: copying database to user data directory...');
      fs.copyFileSync(bundledDb, userDbPath);
      console.log('Database copied successfully.');
    }
  }
  return userDbPath;
}

function getStaticPath() {
  // In both dev and production (asar), __dirname is <root>/electron
  // so ../client/dist always resolves correctly
  return path.join(__dirname, '..', 'client', 'dist');
}

// ── .env management ──────────────────────────────────────────────────────────
function loadEnvFile() {
  const envPath = path.join(userDataPath, '.env');

  // Copy .env.example on first launch
  if (!fs.existsSync(envPath)) {
    const examplePath = path.join(__dirname, '..', '.env.example');

    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log(`Created .env at: ${envPath}`);
    } else {
      // Create a minimal .env
      fs.writeFileSync(envPath, [
        '# MF Intelligence Dashboard — Configuration',
        '# Edit this file to add your API keys',
        '',
        '# Anthropic Claude API key (powers AI chat, explain, fund summary)',
        '# Get yours at: https://console.anthropic.com/',
        'ANTHROPIC_API_KEY=',
        '',
        '# Mistral API key (optional fallback for fund summary)',
        '# Get yours at: https://console.mistral.ai/',
        'MISTRAL_API_KEY=',
        '',
      ].join('\n'));
      console.log(`Created default .env at: ${envPath}`);
    }
  }

  // Parse .env file
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (val) {
      process.env[key] = val;
    }
  }

  console.log(`Loaded .env from: ${envPath}`);
}

// ── Find free port ───────────────────────────────────────────────────────────
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// ── Create window ────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'MF Intelligence',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Help window IPC ──────────────────────────────────────────────────────────
ipcMain.handle('open-help-window', (event, helpId) => {
  const helpWin = new BrowserWindow({
    width: 720,
    height: 800,
    title: 'Help',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  helpWin.loadURL(`http://localhost:${serverPort}/#/help-content?id=${helpId}`);
  return true;
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-env-path', () => path.join(userDataPath, '.env'));

// ── App lifecycle ────────────────────────────────────────────────────────────
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.whenReady().then(async () => {
  try {
    // 1. Load env from userData
    loadEnvFile();

    // 2. Set up paths
    process.env.MF_DB_PATH = getDbPath();
    process.env.MF_STATIC_PATH = getStaticPath();
    process.env.NODE_ENV = 'production';

    // 3. Find a free port and set it
    serverPort = await findFreePort();
    process.env.PORT = String(serverPort);

    console.log(`Starting Express on port ${serverPort}...`);
    console.log(`DB path: ${process.env.MF_DB_PATH}`);
    console.log(`Static path: ${process.env.MF_STATIC_PATH}`);

    // 4. Start Express server (ESM dynamic import)
    await import('../server/index.js');

    console.log('Express server started. Creating window...');

    // 5. Create the main window
    createMainWindow();
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
});
