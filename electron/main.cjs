const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session, desktopCapturer } = require('electron')
const path = require('path')
const { registerPcControlHandlers } = require('./pc-control.cjs')
const { registerGeminiHandlers } = require('./gemini-ws.cjs')

// Auto-updater (only in production)
let autoUpdater = null
if (app.isPackaged) {
  try {
    const { autoUpdater: au } = require('electron-updater')
    const log = require('electron-log')
    au.logger = log
    au.logger.transports.file.level = 'info'
    au.autoDownload = false
    au.autoInstallOnAppQuit = true
    au.setFeedURL({
      provider: 'github',
      owner: 'techvibedz',
      repo: 'purtikus',
    })
    autoUpdater = au
  } catch (err) {
    console.error('Auto-updater init failed:', err.message)
  }
}

// ── Fix WebSocket connectivity in Electron's Chromium ──
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('no-proxy-server')

let mainWindow = null
let tray = null
let isQuitting = false

// ── Auto-start on Windows login ──
if (app.isPackaged) {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
    args: ['--minimized'],
  })
}

function getTrayIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', 'icon.ico')
  }
  return path.join(__dirname, '..', 'build', 'icon.ico')
}

function createTray() {
  const iconPath = getTrayIconPath()
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
  } catch {
    // Fallback: empty 16x16 image if icon not found
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Purtikus AI Assistant')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Purtikus',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Start on Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          path: app.getPath('exe'),
        })
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // Click tray icon to show/hide window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    icon: getTrayIconPath(),
  })

  // Remove any restrictive CSP headers so WebSocket connections work
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    delete headers['content-security-policy']
    delete headers['Content-Security-Policy']
    callback({ responseHeaders: headers })
  })

  // Dev or production
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // If launched with --minimized flag (auto-start), start hidden
  if (process.argv.includes('--minimized')) {
    mainWindow.hide()
  }
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  // Minimize to tray instead of quitting
  mainWindow?.hide()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})

// ── Screen capture for Gemini vision ──
ipcMain.handle('screen:capture-frame', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1024, height: 768 },
    })
    if (!sources.length) return { ok: false, error: 'No screen source' }
    // Get the primary screen thumbnail as JPEG base64
    const thumbnail = sources[0].thumbnail
    const jpegBuffer = thumbnail.toJPEG(60) // quality 60 for good balance
    const base64 = jpegBuffer.toString('base64')
    return { ok: true, data: base64, mimeType: 'image/jpeg' }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// Register IPC handlers
registerPcControlHandlers(ipcMain)
registerGeminiHandlers(ipcMain, () => mainWindow)

// ── Auto-update IPC handlers ──
ipcMain.handle('updater:check', async () => {
  if (!autoUpdater) return { available: false, error: 'Not in production mode' }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { available: !!result?.updateInfo, version: result?.updateInfo?.version }
  } catch (err) {
    return { available: false, error: err.message }
  }
})

ipcMain.handle('updater:download', async () => {
  if (!autoUpdater) return { ok: false }
  try {
    await autoUpdater.downloadUpdate()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.on('updater:install', () => {
  if (autoUpdater) autoUpdater.quitAndInstall()
})

function setupAutoUpdater() {
  if (!autoUpdater || !mainWindow) return
  const send = (ch, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(ch, data)
  }
  autoUpdater.on('update-available', (info) => send('updater:available', { version: info.version }))
  autoUpdater.on('update-not-available', () => send('updater:not-available', {}))
  autoUpdater.on('download-progress', (progress) => send('updater:progress', { percent: progress.percent }))
  autoUpdater.on('update-downloaded', (info) => send('updater:downloaded', { version: info.version }))
  autoUpdater.on('error', (err) => send('updater:error', { message: err.message }))

  // Check for updates 5s after launch
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000)
}

app.whenReady().then(() => {
  createTray()
  createWindow()
  setupAutoUpdater()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  // Don't quit on window close — tray keeps app alive
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else if (mainWindow) {
    mainWindow.show()
  }
})
