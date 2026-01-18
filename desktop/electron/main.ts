import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { LicenseManager } from './licensing/licenseManager';
import { EncryptionService } from './security/encryption';
import { AntiTamperService } from './security/antiTamper';
import { DatabaseService } from './database/store';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let licenseManager: LicenseManager;
let encryptionService: EncryptionService;
let antiTamperService: AntiTamperService;
let databaseService: DatabaseService;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createWindow() {
  const appData = app.getPath('userData');

  // Ensure app data directory exists
  if (!fs.existsSync(appData)) {
    fs.mkdirSync(appData, { recursive: true });
  }

  // Initialize anti-tamper first
  antiTamperService = new AntiTamperService(appData);
  const clockCheck = antiTamperService.checkClockIntegrity();

  if (!clockCheck.valid) {
    dialog.showErrorBox(
      'Security Alert',
      `${clockCheck.reason}\n\nThe application cannot run in this state. Please restore your system clock to the correct time.`
    );
    app.quit();
    return;
  }

  // Initialize encryption service
  encryptionService = new EncryptionService(appData);
  await encryptionService.initialize();

  // Initialize license manager
  licenseManager = new LicenseManager(appData, antiTamperService);
  const licenseInfo = await licenseManager.initialize();

  if (licenseInfo.type === 'TAMPERED') {
    dialog.showErrorBox(
      'Security Alert',
      'License tampering detected. The application cannot run.'
    );
    app.quit();
    return;
  }

  // Initialize database
  databaseService = new DatabaseService(appData, encryptionService);
  await databaseService.initialize();

  // Get saved window bounds
  const savedBounds = databaseService.getSetting('windowBounds');
  const bounds = savedBounds ? JSON.parse(savedBounds) : { width: 1400, height: 900 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#1f2937',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  if (!isDev) {
    mainWindow.removeMenu();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window bounds on close
  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      databaseService.setSetting('windowBounds', JSON.stringify(bounds));
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Security: Force close DevTools if opened in production (e.g. via keyboard shortcut)
    mainWindow.webContents.on('devtools-opened', () => {
      if (mainWindow) {
        mainWindow.webContents.closeDevTools();
      }
    });
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC Handlers - License
ipcMain.handle('license:getInfo', () => {
  return licenseManager.getInfo();
});

ipcMain.handle('license:activate', async (_, key: string) => {
  return licenseManager.activateLicense(key);
});

ipcMain.handle('license:canUseFeature', (_, feature: string) => {
  return licenseManager.canUseFeature(feature as 'memory' | 'export' | 'prompts' | 'whitelist' | 'custom_patterns' | 'advanced_redaction');
});

ipcMain.handle('license:isPro', () => {
  return licenseManager.isPro();
});

ipcMain.handle('license:isRegexCategoryAllowed', (_, category: string) => {
  return licenseManager.isRegexCategoryAllowed(category);
});

ipcMain.handle('license:startTrial', () => {
  return licenseManager.startTrial();
});

// IPC Handlers - Database (Learning Rules)
ipcMain.handle('db:getRules', () => {
  return databaseService.getLearningRules();
});

ipcMain.handle('db:addRule', async (_, pattern: string, category?: string) => {
  if (!licenseManager.canUseFeature('memory')) {
    throw new Error('UPGRADE_REQUIRED:MEMORY');
  }
  return databaseService.addLearningRule(pattern, category);
});

ipcMain.handle('db:deleteRule', (_, id: string) => {
  databaseService.deleteLearningRule(id);
  return true;
});

ipcMain.handle('db:toggleRule', (_, id: string, enabled: boolean) => {
  databaseService.toggleLearningRule(id, enabled);
  return true;
});

// IPC Handlers - Database (Prompts)
ipcMain.handle('db:getPrompts', () => {
  return databaseService.getPrompts();
});

ipcMain.handle('db:savePrompt', (_, prompt: { id?: string; name: string; content: string }) => {
  return databaseService.savePrompt(prompt);
});

ipcMain.handle('db:deletePrompt', (_, id: string) => {
  databaseService.deletePrompt(id);
  return true;
});

// IPC Handlers - Database (Whitelist)
ipcMain.handle('db:getWhitelist', () => {
  return databaseService.getWhitelist();
});

ipcMain.handle('db:addWhitelistItem', async (_, phrase: string) => {
  if (!licenseManager.canUseFeature('whitelist')) {
    throw new Error('UPGRADE_REQUIRED:WHITELIST');
  }
  return databaseService.addWhitelistItem(phrase);
});

ipcMain.handle('db:deleteWhitelistItem', (_, id: string) => {
  databaseService.deleteWhitelistItem(id);
  return true;
});

// IPC Handlers - Database (Custom Patterns)
ipcMain.handle('db:getCustomPatterns', () => {
  return databaseService.getCustomPatterns();
});

ipcMain.handle('db:addCustomPattern', async (_, pattern: { name: string; regex: string; category: string }) => {
  if (!licenseManager.canUseFeature('custom_patterns')) {
    throw new Error('UPGRADE_REQUIRED:CUSTOM_PATTERNS');
  }
  return databaseService.addCustomPattern(pattern);
});

ipcMain.handle('db:deleteCustomPattern', (_, id: string) => {
  databaseService.deleteCustomPattern(id);
  return true;
});

// Security: Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.json', '.docx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max file size

// Security: Validate file path helper
function isPathAllowed(filePath: string): boolean {
  const resolvedPath = path.resolve(path.normalize(filePath));
  const allowedPrefixes = [
    app.getPath('home'),
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('desktop'),
    app.getPath('temp'),
  ];
  return allowedPrefixes.some(prefix =>
    resolvedPath.toLowerCase().startsWith(prefix.toLowerCase())
  );
}

// IPC Handlers - File Dialog
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const resolvedPath = path.resolve(path.normalize(filePath));
  const ext = path.extname(resolvedPath).toLowerCase();

  try {
    // Security: Validate file extension
    if (!ALLOWED_EXTENSIONS.includes(ext) && ext !== '') {
      console.error('Invalid file extension:', ext);
      return null;
    }

    // Security: Check file size
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      console.error('Invalid path: Not a regular file');
      return null;
    }
    if (stats.size > MAX_FILE_SIZE) {
      console.error('File too large:', stats.size);
      return null;
    }

    if (ext === '.pdf') {
      // Return path for PDF.js to handle in renderer
      return { path: resolvedPath, type: 'pdf' };
    } else {
      // Read text files directly
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      return { path: resolvedPath, type: 'text', content };
    }
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

ipcMain.handle('dialog:saveFile', async (_, content: string, defaultName: string) => {
  if (!mainWindow) return null;

  // Security: Validate content
  if (typeof content !== 'string') {
    console.error('Invalid content type');
    return null;
  }

  // Security: Sanitize default name
  const sanitizedName = path.basename(defaultName || 'document.txt');

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: sanitizedName,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    const resolvedPath = path.resolve(path.normalize(result.filePath));

    // Security: Validate save location
    if (!isPathAllowed(resolvedPath)) {
      console.error('Access denied: Save location is outside allowed directories');
      return null;
    }

    fs.writeFileSync(resolvedPath, content, 'utf-8');
    return resolvedPath;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
});

// IPC Handlers - PDF Reading (for renderer to request file content)
// Security: Validate file path to prevent path traversal attacks
ipcMain.handle('file:readPdf', async (_, filePath: string) => {
  try {
    // Security: Validate the path
    if (!filePath || typeof filePath !== 'string') {
      console.error('Invalid file path provided');
      return null;
    }

    // Normalize and resolve the path
    const resolvedPath = path.resolve(path.normalize(filePath));

    // Security: Check for path traversal attempts
    if (!isPathAllowed(resolvedPath)) {
      console.error('Access denied: File path is outside allowed directories');
      return null;
    }

    // Security: Verify file extension
    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext !== '.pdf') {
      console.error('Invalid file type: Only PDF files are allowed');
      return null;
    }

    // Security: Check file exists and is a file (not directory/symlink)
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      console.error('Invalid path: Not a regular file');
      return null;
    }

    // Security: Check file size
    if (stats.size > MAX_FILE_SIZE) {
      console.error('File too large:', stats.size);
      return null;
    }

    const buffer = fs.readFileSync(resolvedPath);
    return buffer;
  } catch (error) {
    console.error('Error reading PDF:', error);
    return null;
  }
});

// IPC Handlers - Settings
ipcMain.handle('settings:get', (_, key: string) => {
  return databaseService.getSetting(key);
});

ipcMain.handle('settings:set', (_, key: string, value: string) => {
  databaseService.setSetting(key, value);
  return true;
});

// IPC Handlers - App Info
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });
});
