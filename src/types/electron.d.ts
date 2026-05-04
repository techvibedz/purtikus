// --- Result types for PC control ---

export interface PcResult {
  ok: boolean
  error?: string
}

export interface OpenAppResult extends PcResult {
  method?: string
  target?: string
}

export interface CloseAppResult extends PcResult {
  process?: string
}

export interface ProcessInfo {
  Id: number
  ProcessName: string
  MainWindowTitle: string
  MemMB: number
}

export interface ScreenshotResult extends PcResult {
  path?: string
  size?: number
}

export interface TypeTextResult extends PcResult {
  typed?: number
}

export interface ShortcutResult extends PcResult {
  keys?: string
  modifiers?: string[]
  sendStr?: string
  method?: string
}

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string | null
  created: string | null
}

export interface ReadFileResult extends PcResult {
  content?: string
  size?: number
  path?: string
}

export interface WriteFileResult extends PcResult {
  path?: string
  size?: number
}

export interface DeleteResult extends PcResult {
  path?: string
  wasDirectory?: boolean
}

export interface CreateDirResult extends PcResult {
  path?: string
}

export interface FileInfoResult {
  path: string
  name: string
  ext: string
  isDirectory: boolean
  isFile: boolean
  size: number
  modified: string
  created: string
  accessed: string
}

export interface OpenUrlResult extends PcResult {
  url?: string
}

export interface SystemInfo {
  hostname: string
  platform: string
  arch: string
  cpus: number
  cpuModel: string
  totalMemGB: number
  freeMemGB: number
  uptime: number
  user: string
  homeDir: string
  tempDir: string
}

// --- PC Control API ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResult = any

export interface PcControlAPI {
  openApp: (name: string) => Promise<OpenAppResult>
  closeApp: (processName: string) => Promise<CloseAppResult>
  listProcesses: () => Promise<ProcessInfo[]>
  screenshot: () => Promise<ScreenshotResult>
  typeText: (text: string) => Promise<TypeTextResult>
  pressShortcut: (keys: string) => Promise<ShortcutResult>
  listFiles: (dirPath: string) => Promise<FileEntry[]>
  readFile: (filePath: string) => Promise<ReadFileResult>
  writeFile: (filePath: string, content: string) => Promise<WriteFileResult>
  deleteItem: (itemPath: string) => Promise<DeleteResult>
  createDir: (dirPath: string) => Promise<CreateDirResult>
  fileInfo: (filePath: string) => Promise<FileInfoResult>
  openUrl: (url: string) => Promise<OpenUrlResult>
  systemInfo: () => Promise<SystemInfo>

  // Run arbitrary command
  runCommand: (command: string, shell?: string) => Promise<AnyResult>

  // Volume
  setVolume: (level: number) => Promise<AnyResult>
  getVolume: () => Promise<AnyResult>
  muteToggle: () => Promise<AnyResult>

  // Power
  power: (action: string) => Promise<AnyResult>

  // Wi-Fi
  wifi: (action: string, name?: string, password?: string) => Promise<AnyResult>

  // Bluetooth
  bluetooth: (action: string) => Promise<AnyResult>

  // Brightness
  setBrightness: (level: number) => Promise<AnyResult>
  getBrightness: () => Promise<AnyResult>

  // Mouse
  mouse: (action: string, x?: number, y?: number, button?: string) => Promise<AnyResult>

  // Clipboard
  clipboard: (action: string, text?: string) => Promise<AnyResult>

  // Window management
  windowAction: (action: string) => Promise<AnyResult>

  // Windows Settings
  openSettings: (page: string) => Promise<AnyResult>

  // Installed apps
  installedApps: () => Promise<AnyResult>

  // Services
  service: (action: string, name?: string) => Promise<AnyResult>

  // Notifications
  notify: (title: string, msg: string) => Promise<AnyResult>
}

// --- Gemini Live IPC API ---

export interface GeminiConnectResult {
  ok: boolean
  error?: string
}

export interface ScreenCaptureResult {
  ok: boolean
  data?: string
  mimeType?: string
  error?: string
}

export interface GeminiAPI {
  connect: (apiKey: string, setupMsg: Record<string, unknown>) => Promise<GeminiConnectResult>
  sendAudio: (pcmBase64: string) => void
  sendVideo: (jpegBase64: string) => void
  sendToolResponse: (responses: Array<{ id: string; response: Record<string, unknown> }>) => void
  captureFrame: () => Promise<ScreenCaptureResult>
  disconnect: () => void
  isReady: () => Promise<boolean>
  onMessage: (cb: (data: Record<string, unknown>) => void) => void
  onError: (cb: (msg: string) => void) => void
  onClosed: (cb: (data: { code: number; reason: string }) => void) => void
  removeAllListeners: () => void
}

// --- Auto-updater API ---

export interface UpdaterAPI {
  check: () => Promise<{ available: boolean; version?: string; error?: string }>
  download: () => Promise<{ ok: boolean; error?: string }>
  install: () => void
  onAvailable: (cb: (data: { version: string }) => void) => void
  onNotAvailable: (cb: () => void) => void
  onProgress: (cb: (data: { percent: number }) => void) => void
  onDownloaded: (cb: (data: { version: string }) => void) => void
  onError: (cb: (data: { message: string }) => void) => void
}

// --- Electron API ---

export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
  gemini: GeminiAPI
  pc: PcControlAPI
  updater: UpdaterAPI
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
