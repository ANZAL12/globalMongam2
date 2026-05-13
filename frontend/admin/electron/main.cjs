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
let pendingDeepLinkUrl = null;

const protocolClientArgs = isDev ? [process.execPath, path.resolve(__dirname, '..')] : [];
app.setAsDefaultProtocolClient('globalagencies', process.execPath, protocolClientArgs);

function getDeepLinkUrl(argv = []) {
  return argv.find((arg) => typeof arg === 'string' && arg.startsWith('globalagencies://')) || null;
}

function getResetRouteFromDeepLink(url) {
  if (!url || !url.startsWith('globalagencies://reset-password')) {
    return null;
  }

  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  return fragment ? `/update-password?${fragment}` : '/update-password';
}

function loadAppRoute(route = '/') {
  const hash = route.startsWith('/') ? route : `/${route}`;

  if (isDev) {
    mainWindow.loadURL(`http://localhost:5173/#${hash}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash });
  }
}

function handleDeepLink(url) {
  const route = getResetRouteFromDeepLink(url);
  if (!route) return;

  if (!mainWindow) {
    pendingDeepLinkUrl = url;
    return;
  }

  loadAppRoute(route);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

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

  const initialRoute = getResetRouteFromDeepLink(pendingDeepLinkUrl);
  pendingDeepLinkUrl = null;
  loadAppRoute(initialRoute || '/');

  if (isDev) {
    mainWindow.webContents.openDevTools();
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
  app.on('second-instance', (_event, argv) => {
    handleDeepLink(getDeepLinkUrl(argv));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    pendingDeepLinkUrl = getDeepLinkUrl(process.argv);
    registerCloudinaryHandlers();
    createWindow();
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

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

  // Supabase Admin: Create User using Admin API
  ipcMain.handle('supabase:createUser', async (event, data) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceKey || serviceKey === 'your-service-role-key-here') {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in your .env file');
      }

      console.log(`Creating ${data.role} via Admin API:`, data.email);

      // Helper to create the auth user
      const createAuthUser = async () => fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          email_confirm: true,
          app_metadata: { source: 'admin_rpc' }
        })
      });

      let authRes = await createAuthUser();
      let authUser = await authRes.json();

      // If user already exists in auth (e.g. orphaned from a failed OAuth login), clean up and retry
      if (!authRes.ok) {
        const errMsg = authUser.message || authUser.msg || authUser.error_description || authUser.error || '';
        console.error('Supabase Auth Error Response:', JSON.stringify(authUser, null, 2));

        const isAlreadyExists = errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists') || authUser.code === 422;

        if (isAlreadyExists) {
          console.log(`Email already exists in auth. Checking if it's an orphaned OAuth record for: ${data.email}`);

          // List users and find orphaned auth user (not in public.users)
          const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
            headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
          });
          const listData = await listRes.json();
          const existingAuthUser = (listData.users || []).find(u => u.email === data.email);

          if (existingAuthUser) {
            // Check if it exists in public.users (i.e. a real registered user)
            const profileRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${existingAuthUser.id}&select=id`, {
              headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
            });
            const profileData = await profileRes.json();

            if (!profileData || profileData.length === 0) {
              // Orphaned auth user — safe to delete and recreate
              console.log(`Deleting orphaned auth user ${existingAuthUser.id} for ${data.email}`);
              await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingAuthUser.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
              });

              // Retry creation
              authRes = await createAuthUser();
              authUser = await authRes.json();
              if (!authRes.ok) {
                throw new Error(authUser.message || authUser.error || 'Failed to create auth user after cleanup');
              }
              console.log(`Successfully recreated auth user for ${data.email} after removing orphaned OAuth record.`);
            } else {
              throw new Error(`${data.email} is already a registered user in this system.`);
            }
          } else {
            throw new Error(errMsg || 'Failed to create auth user');
          }
        } else {
          throw new Error(errMsg || 'Failed to create auth user');
        }
      }

      const profileData = {
        id: authUser.id,
        email: data.email,
        role: data.role || 'promoter',
        full_name: data.full_name,
        shop_name: data.shop_name || null,
        phone_number: data.phone_number || null,
        gpay_number: data.gpay_number || null,
        upi_id: data.upi_id || '',
        is_active: true,
        must_change_password: true,
        approver_id: data.approver_id || null
      };

      const profileRes = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=minimal, resolution=merge-duplicates'
        },
        body: JSON.stringify(profileData)
      });

      if (!profileRes.ok) {
        const profileErr = await profileRes.json();
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUser.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
        });
        throw new Error(profileErr.message || 'Failed to create user profile');
      }

      return { success: true, user_id: authUser.id };
    } catch (error) {
      console.error('Create User Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('supabase:createPromoter', async (event, data) => {
    // Legacy support
    return ipcMain.emit('supabase:createUser', event, { ...data, role: 'promoter' });
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
