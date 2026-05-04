const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  showWindow: () => ipcRenderer.send('window-show'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('maximize-change', (_, isMaximized) => callback(isMaximized))
  },

  // Gemini Live WebSocket (runs in main process)
  gemini: {
    connect: (apiKey, setupMsg) => ipcRenderer.invoke('gemini:connect', { apiKey, setupMsg }),
    sendAudio: (pcmBase64) => ipcRenderer.send('gemini:audio', pcmBase64),
    sendVideo: (jpegBase64) => ipcRenderer.send('gemini:video', jpegBase64),
    sendToolResponse: (responses) => ipcRenderer.send('gemini:tool-response', responses),
    captureFrame: () => ipcRenderer.invoke('screen:capture-frame'),
    disconnect: () => ipcRenderer.send('gemini:disconnect'),
    isReady: () => ipcRenderer.invoke('gemini:is-ready'),
    onMessage: (cb) => ipcRenderer.on('gemini:message', (_, data) => cb(data)),
    onError: (cb) => ipcRenderer.on('gemini:error', (_, msg) => cb(msg)),
    onClosed: (cb) => ipcRenderer.on('gemini:closed', (_, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('gemini:message')
      ipcRenderer.removeAllListeners('gemini:error')
      ipcRenderer.removeAllListeners('gemini:closed')
    },
  },

  // PC Control
  pc: {
    // Apps
    openApp:        (name) => ipcRenderer.invoke('pc:open-app', name),
    closeApp:       (processName) => ipcRenderer.invoke('pc:close-app', processName),
    listProcesses:  () => ipcRenderer.invoke('pc:list-processes'),

    // Screenshot
    screenshot:     () => ipcRenderer.invoke('pc:screenshot'),

    // Keyboard
    typeText:       (text) => ipcRenderer.invoke('pc:type-text', text),
    pressShortcut:  (keys) => ipcRenderer.invoke('pc:press-shortcut', keys),

    // Files
    listFiles:      (dirPath) => ipcRenderer.invoke('pc:list-files', dirPath),
    readFile:       (filePath) => ipcRenderer.invoke('pc:read-file', filePath),
    writeFile:      (filePath, content) => ipcRenderer.invoke('pc:write-file', filePath, content),
    deleteItem:     (itemPath) => ipcRenderer.invoke('pc:delete-item', itemPath),
    createDir:      (dirPath) => ipcRenderer.invoke('pc:create-dir', dirPath),
    fileInfo:       (filePath) => ipcRenderer.invoke('pc:file-info', filePath),

    // URL
    openUrl:        (url) => ipcRenderer.invoke('pc:open-url', url),

    // System
    systemInfo:     () => ipcRenderer.invoke('pc:system-info'),

    // Run arbitrary command
    runCommand:     (cmd, shell) => ipcRenderer.invoke('pc:run-command', cmd, shell),

    // Volume
    setVolume:      (level) => ipcRenderer.invoke('pc:set-volume', level),
    getVolume:      () => ipcRenderer.invoke('pc:get-volume'),
    muteToggle:     () => ipcRenderer.invoke('pc:mute-toggle'),

    // Power
    power:          (action) => ipcRenderer.invoke('pc:power', action),

    // Wi-Fi
    wifi:           (action, name, password) => ipcRenderer.invoke('pc:wifi', action, name, password),

    // Bluetooth
    bluetooth:      (action) => ipcRenderer.invoke('pc:bluetooth', action),

    // Brightness
    setBrightness:  (level) => ipcRenderer.invoke('pc:set-brightness', level),
    getBrightness:  () => ipcRenderer.invoke('pc:get-brightness'),

    // Mouse
    mouse:          (action, x, y, button) => ipcRenderer.invoke('pc:mouse', action, x, y, button),

    // Clipboard
    clipboard:      (action, text) => ipcRenderer.invoke('pc:clipboard', action, text),

    // Window management
    windowAction:   (action) => ipcRenderer.invoke('pc:window', action),

    // Windows Settings
    openSettings:   (page) => ipcRenderer.invoke('pc:open-settings', page),

    // Installed apps
    installedApps:  () => ipcRenderer.invoke('pc:installed-apps'),

    // Services
    service:        (action, name) => ipcRenderer.invoke('pc:service', action, name),

    // Notifications
    notify:         (title, msg) => ipcRenderer.invoke('pc:notify', title, msg),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.send('updater:install'),
    onAvailable: (cb) => ipcRenderer.on('updater:available', (_, data) => cb(data)),
    onNotAvailable: (cb) => ipcRenderer.on('updater:not-available', () => cb()),
    onProgress: (cb) => ipcRenderer.on('updater:progress', (_, data) => cb(data)),
    onDownloaded: (cb) => ipcRenderer.on('updater:downloaded', (_, data) => cb(data)),
    onError: (cb) => ipcRenderer.on('updater:error', (_, data) => cb(data)),
  },
})
