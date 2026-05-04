const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configure Cloudinary
console.log('Cloudinary Config:', {
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm',
  api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
});

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false // Required for some preload features in certain versions
    },
    icon: path.join(__dirname, '../icon.ico'),
    title: 'Admin Dashboard',
    show: false // Don't show until ready-to-show
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Optimize window showing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Remove default menu in production for a cleaner look
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerCloudinaryHandlers();
    createWindow();
  });
}

function registerCloudinaryHandlers() {
  console.log('Registering Cloudinary IPC Handlers...');
  
  ipcMain.handle('cloudinary:listAssets', async (event, options = {}) => {
    try {
      console.log('Listing assets with options:', options);
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: options.prefix || '',
        max_results: options.max_results || 100,
        direction: options.direction || 'desc',
        sort_by: options.sort_by || 'created_at',
        next_cursor: options.next_cursor
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Cloudinary List Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cloudinary:deleteAssets', async (event, publicIds) => {
    try {
      console.log('Deleting assets (with invalidation):', publicIds);
      const result = await cloudinary.api.delete_resources(publicIds, { invalidate: true });
      return { success: true, data: result };
    } catch (error) {
      console.error('Cloudinary Delete Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cloudinary:deleteByDate', async (event, { startDate, endDate }) => {
    try {
      console.log(`Deleting assets from ${startDate} to ${endDate}`);
      
      const searchResult = await cloudinary.search
        .expression(`created_at:[${startDate} TO ${endDate}]`)
        .max_results(500)
        .execute();
      
      console.log(`Search found ${searchResult.resources.length} assets.`);
      const publicIds = searchResult.resources.map(r => r.public_id);
      
      if (publicIds.length === 0) {
        console.log('No assets to delete in this range.');
        return { success: true, message: 'No assets found in this date range.' };
      }
      
      console.log('Deleting public IDs (with invalidation):', publicIds);
      const deleteResult = await cloudinary.api.delete_resources(publicIds, { invalidate: true });
      console.log('Delete result:', deleteResult);
      return { success: true, data: deleteResult, deletedCount: publicIds.length };
    } catch (error) {
      console.error('Cloudinary Bulk Delete Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cloudinary:deleteAll', async (event) => {
    try {
      console.log('Deleting ALL assets (with invalidation)...');
      const result = await cloudinary.api.delete_all_resources({ invalidate: true });
      return { success: true, data: result };
    } catch (error) {
      console.error('Cloudinary Delete All Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cloudinary:getUsage', async (event) => {
    try {
      console.log('Fetching Cloudinary usage stats...');
      const result = await cloudinary.api.usage();
      return { success: true, data: result };
    } catch (error) {
      console.error('Cloudinary Usage Error:', error);
      return { success: false, error: error.message };
    }
  });
}

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
