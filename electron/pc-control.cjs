const { exec, execFile } = require('child_process')
const { shell, app } = require('electron')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const { promisify } = require('util')

const execAsync = promisify(exec)

// ---------------------------------------------------------------------------
//  APP REGISTRY — common Windows apps mapped to executables
// ---------------------------------------------------------------------------

const APP_REGISTRY = {
  'notepad':        'notepad.exe',
  'calculator':     'calc.exe',
  'paint':          'mspaint.exe',
  'explorer':       'explorer.exe',
  'file explorer':  'explorer.exe',
  'cmd':            'cmd.exe',
  'command prompt': 'cmd.exe',
  'powershell':     'powershell.exe',
  'terminal':       'wt.exe',
  'task manager':   'taskmgr.exe',
  'snipping tool':  'SnippingTool.exe',
  'settings':       'ms-settings:',
  'control panel':  'control.exe',
  'chrome':         'chrome.exe',
  'google chrome':  'chrome.exe',
  'firefox':        'firefox.exe',
  'edge':           'msedge.exe',
  'microsoft edge': 'msedge.exe',
  'brave':          'brave.exe',
  'opera':          'opera.exe',
  'vscode':         'code.cmd',
  'visual studio code': 'code.cmd',
  'word':           'WINWORD.EXE',
  'excel':          'EXCEL.EXE',
  'powerpoint':     'POWERPNT.EXE',
  'outlook':        'OUTLOOK.EXE',
  'teams':          'ms-teams.exe',
  'discord':        'discord.exe',
  'spotify':        'spotify.exe',
  'steam':          'steam.exe',
  'obs':            'obs64.exe',
  'vlc':            'vlc.exe',
  'winrar':         'WinRAR.exe',
  '7zip':           '7zFM.exe',
  'gimp':           'gimp-2.10.exe',
  'photoshop':      'Photoshop.exe',
}

// ---------------------------------------------------------------------------
//  HELPERS
// ---------------------------------------------------------------------------

/** Run a PowerShell command and return { stdout, stderr } */
function runPS(command) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(command, 'utf16le').toString('base64')
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { timeout: 15000, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr?.trim() || err.message))
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
      }
    )
  })
}

/** Escape a string for PowerShell single-quoted literals */
function psEscape(str) {
  return str.replace(/'/g, "''")
}

// ---------------------------------------------------------------------------
//  1.  OPEN APPLICATION
// ---------------------------------------------------------------------------

async function openApp(name) {
  const key = name.toLowerCase().trim()

  // A) Static registry lookup
  const exe = APP_REGISTRY[key]
  if (exe) {
    if (exe.startsWith('ms-')) {
      // UWP protocol
      await execAsync(`start "" "${exe}"`, { shell: true })
      return { ok: true, method: 'protocol', target: exe }
    }
    try {
      await execAsync(`start "" "${exe}"`, { shell: true })
      return { ok: true, method: 'registry', target: exe }
    } catch { /* fall through */ }
  }

  // B) Search installed Start-menu apps via PowerShell
  try {
    const { stdout } = await runPS(`
      Get-StartApps | Where-Object { $_.Name -like '*${psEscape(key)}*' } |
      Select-Object -First 1 -ExpandProperty AppID
    `)
    if (stdout) {
      await execAsync(`start "" "shell:AppsFolder\\${stdout}"`, { shell: true })
      return { ok: true, method: 'startmenu', target: stdout }
    }
  } catch { /* fall through */ }

  // C) Last resort — let Windows resolve it
  try {
    await execAsync(`start "" "${psEscape(name)}"`, { shell: true })
    return { ok: true, method: 'start', target: name }
  } catch (err) {
    return { ok: false, error: `Could not open "${name}": ${err.message}` }
  }
}

// ---------------------------------------------------------------------------
//  2.  CLOSE APPLICATION
// ---------------------------------------------------------------------------

async function closeApp(processName) {
  const proc = processName.trim()
  const target = proc.endsWith('.exe') ? proc : `${proc}.exe`
  try {
    await execAsync(`taskkill /F /IM "${target}"`, { windowsHide: true })
    return { ok: true, process: target }
  } catch (err) {
    // taskkill returns exit code 128 when process not found
    if (err.message.includes('not found')) {
      return { ok: false, error: `Process "${target}" not found` }
    }
    return { ok: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
//  3.  LIST RUNNING PROCESSES
// ---------------------------------------------------------------------------

async function listProcesses() {
  const { stdout } = await runPS(`
    Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
    Select-Object Id, ProcessName, MainWindowTitle, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,1)}} |
    ConvertTo-Json -Compress
  `)
  try {
    const parsed = JSON.parse(stdout)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
//  4.  SCREENSHOT
// ---------------------------------------------------------------------------

async function takeScreenshot() {
  const screenshotDir = path.join(app.getPath('temp'), 'purtikus-screenshots')
  await fsp.mkdir(screenshotDir, { recursive: true })
  const filename = `screenshot-${Date.now()}.png`
  const filePath = path.join(screenshotDir, filename)

  // Use screenshot-desktop if available, else fallback to PowerShell
  try {
    const screenshot = require('screenshot-desktop')
    const imgBuffer = await screenshot({ format: 'png' })
    await fsp.writeFile(filePath, imgBuffer)
    return { ok: true, path: filePath, size: imgBuffer.length }
  } catch {
    // PowerShell fallback
    await runPS(`
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
      $gfx = [System.Drawing.Graphics]::FromImage($bmp)
      $gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      $bmp.Save('${psEscape(filePath)}', [System.Drawing.Imaging.ImageFormat]::Png)
      $gfx.Dispose()
      $bmp.Dispose()
    `)
    const stat = await fsp.stat(filePath)
    return { ok: true, path: filePath, size: stat.size }
  }
}

// ---------------------------------------------------------------------------
//  5.  KEYBOARD — TYPE TEXT
// ---------------------------------------------------------------------------

async function typeText(text) {
  if (!text) return { ok: false, error: 'No text provided' }

  // Use WScript.Shell SendKeys — escape special chars
  const escaped = text.replace(/[+^%~(){}[\]]/g, '{$&}')
  await runPS(`
    $wshell = New-Object -ComObject WScript.Shell
    Start-Sleep -Milliseconds 100
    $wshell.SendKeys('${psEscape(escaped)}')
  `)
  return { ok: true, typed: text.length }
}

// ---------------------------------------------------------------------------
//  6.  KEYBOARD — PRESS SHORTCUT  (e.g. "ctrl+shift+s", "alt+f4")
// ---------------------------------------------------------------------------

const KEY_MAP = {
  enter: '{ENTER}', return: '{ENTER}',
  tab: '{TAB}',
  esc: '{ESC}', escape: '{ESC}',
  delete: '{DELETE}', del: '{DELETE}',
  backspace: '{BACKSPACE}', bs: '{BACKSPACE}',
  space: ' ',
  up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}',
  home: '{HOME}', end: '{END}',
  pageup: '{PGUP}', pagedown: '{PGDN}',
  insert: '{INSERT}', ins: '{INSERT}',
  capslock: '{CAPSLOCK}', numlock: '{NUMLOCK}', scrolllock: '{SCROLLLOCK}',
  printscreen: '{PRTSC}', prtsc: '{PRTSC}',
  break: '{BREAK}',
  f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}',
  f5: '{F5}', f6: '{F6}', f7: '{F7}', f8: '{F8}',
  f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}',
}

async function pressShortcut(keys) {
  if (!keys) return { ok: false, error: 'No keys provided' }

  const parts = keys.toLowerCase().split('+').map(k => k.trim())
  let sendStr = ''
  const modifiers = []

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') { sendStr += '^'; modifiers.push('Ctrl'); continue }
    if (part === 'alt')                        { sendStr += '%'; modifiers.push('Alt'); continue }
    if (part === 'shift')                      { sendStr += '+'; modifiers.push('Shift'); continue }
    if (part === 'win' || part === 'windows')  {
      // SendKeys can't do Win key — use PowerShell keybd_event
      return pressWinShortcut(parts)
    }

    const mapped = KEY_MAP[part]
    if (mapped) { sendStr += mapped; continue }

    // Single character key
    if (part.length === 1) { sendStr += part; continue }

    return { ok: false, error: `Unknown key: "${part}"` }
  }

  await runPS(`
    $wshell = New-Object -ComObject WScript.Shell
    Start-Sleep -Milliseconds 100
    $wshell.SendKeys('${psEscape(sendStr)}')
  `)
  return { ok: true, keys, modifiers, sendStr }
}

/** Handle Win-key combos via keybd_event (SendKeys can't do Win key) */
async function pressWinShortcut(parts) {
  const VK = {
    win: '0x5B', ctrl: '0x11', alt: '0x12', shift: '0x10',
    a: '0x41', b: '0x42', c: '0x43', d: '0x44', e: '0x45',
    f: '0x46', g: '0x47', h: '0x48', i: '0x49', j: '0x4A',
    k: '0x4B', l: '0x4C', m: '0x4D', n: '0x4E', o: '0x4F',
    p: '0x50', q: '0x51', r: '0x52', s: '0x53', t: '0x54',
    u: '0x55', v: '0x56', w: '0x57', x: '0x58', y: '0x59', z: '0x5A',
    tab: '0x09', space: '0x20', enter: '0x0D',
    up: '0x26', down: '0x28', left: '0x25', right: '0x27',
  }
  const windows = 'windows'

  const keydowns = []
  const keyups = []
  for (const p of parts) {
    const key = (p === 'win' || p === windows) ? 'win' : p
    const vk = VK[key]
    if (!vk) return { ok: false, error: `Unknown key for Win combo: "${p}"` }
    keydowns.push(`[Kbd]::keybd_event(${vk}, 0, 0, [UIntPtr]::Zero)`)
    keyups.unshift(`[Kbd]::keybd_event(${vk}, 0, 2, [UIntPtr]::Zero)`)
  }

  await runPS(`
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Kbd {
      [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    }
"@
    Start-Sleep -Milliseconds 100
    ${keydowns.join('\n    ')}
    Start-Sleep -Milliseconds 50
    ${keyups.join('\n    ')}
  `)
  return { ok: true, keys: parts.join('+'), method: 'keybd_event' }
}

// ---------------------------------------------------------------------------
//  7.  FILE MANAGEMENT
// ---------------------------------------------------------------------------

async function listFiles(dirPath) {
  const resolved = path.resolve(dirPath)
  const entries = await fsp.readdir(resolved, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    const fullPath = path.join(resolved, entry.name)
    try {
      const stat = await fsp.stat(fullPath)
      results.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modified: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
      })
    } catch {
      results.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: 0,
        modified: null,
        created: null,
      })
    }
  }
  return results
}

async function readFileContent(filePath) {
  const resolved = path.resolve(filePath)
  const stat = await fsp.stat(resolved)
  if (stat.size > 10 * 1024 * 1024) {
    return { ok: false, error: 'File too large (>10 MB)' }
  }
  const content = await fsp.readFile(resolved, 'utf-8')
  return { ok: true, content, size: stat.size, path: resolved }
}

async function writeFileContent(filePath, content) {
  const resolved = path.resolve(filePath)
  await fsp.mkdir(path.dirname(resolved), { recursive: true })
  await fsp.writeFile(resolved, content, 'utf-8')
  return { ok: true, path: resolved, size: Buffer.byteLength(content) }
}

async function deleteItem(itemPath) {
  const resolved = path.resolve(itemPath)
  const stat = await fsp.stat(resolved)
  if (stat.isDirectory()) {
    await fsp.rm(resolved, { recursive: true, force: true })
  } else {
    await fsp.unlink(resolved)
  }
  return { ok: true, path: resolved, wasDirectory: stat.isDirectory() }
}

async function createDirectory(dirPath) {
  const resolved = path.resolve(dirPath)
  await fsp.mkdir(resolved, { recursive: true })
  return { ok: true, path: resolved }
}

async function getFileInfo(filePath) {
  const resolved = path.resolve(filePath)
  const stat = await fsp.stat(resolved)
  return {
    path: resolved,
    name: path.basename(resolved),
    ext: path.extname(resolved),
    isDirectory: stat.isDirectory(),
    isFile: stat.isFile(),
    size: stat.size,
    modified: stat.mtime.toISOString(),
    created: stat.birthtime.toISOString(),
    accessed: stat.atime.toISOString(),
  }
}

// ---------------------------------------------------------------------------
//  8.  OPEN URL
// ---------------------------------------------------------------------------

async function openUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }
  await shell.openExternal(url)
  return { ok: true, url }
}

// ---------------------------------------------------------------------------
//  9.  SYSTEM INFO (bonus — useful for the AI assistant)
// ---------------------------------------------------------------------------

async function getSystemInfo() {
  const os = require('os')
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model,
    totalMemGB: +(os.totalmem() / 1073741824).toFixed(1),
    freeMemGB: +(os.freemem() / 1073741824).toFixed(1),
    uptime: os.uptime(),
    user: os.userInfo().username,
    homeDir: os.homedir(),
    tempDir: os.tmpdir(),
  }
}

// ---------------------------------------------------------------------------
//  10.  RUN ARBITRARY COMMAND (PowerShell or CMD)
// ---------------------------------------------------------------------------

async function runCommand(command, shell = 'powershell') {
  if (!command) return { ok: false, error: 'No command provided' }
  const opts = { timeout: 30000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 }
  try {
    if (shell === 'cmd') {
      const { stdout, stderr } = await execAsync(command, { ...opts, shell: 'cmd.exe' })
      return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() }
    }
    const { stdout, stderr } = await runPS(command)
    return { ok: true, stdout, stderr }
  } catch (err) {
    return { ok: false, error: err.message, stdout: err.stdout?.trim(), stderr: err.stderr?.trim() }
  }
}

// ---------------------------------------------------------------------------
//  11.  VOLUME CONTROL
// ---------------------------------------------------------------------------

async function setVolume(level) {
  // level 0-100
  const vol = Math.max(0, Math.min(100, Math.round(level)))
  await runPS(`
    Add-Type -TypeDefinition @"
    using System.Runtime.InteropServices;
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioEndpointVolume {
      int _0(); int _1(); int _2(); int _3(); int _4(); int _5(); int _6(); int _7(); int _8(); int _9(); int _10(); int _11();
      int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    }
    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice { int Activate(ref System.Guid iid, int dwClsCtx, System.IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface); }
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator { int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice); }
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
    public class Vol {
      public static void Set(float level) {
        var e = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
        IMMDevice d; e.GetDefaultAudioEndpoint(0, 1, out d);
        var iid = typeof(IAudioEndpointVolume).GUID;
        object o; d.Activate(ref iid, 1, System.IntPtr.Zero, out o);
        ((IAudioEndpointVolume)o).SetMasterVolumeLevelScalar(level, System.Guid.Empty);
      }
    }
"@
    [Vol]::Set(${vol / 100})
  `)
  return { ok: true, volume: vol }
}

async function getVolume() {
  const { stdout } = await runPS(`
    $vol = (Get-AudioDevice -PlaybackVolume 2>$null) ?? ''
    if ($vol -eq '') {
      Add-Type -TypeDefinition @"
      using System.Runtime.InteropServices;
      [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IAudioEndpointVolume {
        int _0(); int _1(); int _2(); int _3(); int _4(); int _5(); int _6(); int _7(); int _8(); int _9();
        int GetMasterVolumeLevelScalar(out float pfLevel);
      }
      [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IMMDevice { int Activate(ref System.Guid iid, int dwClsCtx, System.IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface); }
      [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IMMDeviceEnumerator { int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice); }
      [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
      public class Vol {
        public static float Get() {
          var e = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
          IMMDevice d; e.GetDefaultAudioEndpoint(0, 1, out d);
          var iid = typeof(IAudioEndpointVolume).GUID;
          object o; d.Activate(ref iid, 1, System.IntPtr.Zero, out o);
          float level; ((IAudioEndpointVolume)o).GetMasterVolumeLevelScalar(out level);
          return level;
        }
      }
"@
      Write-Output ([math]::Round([Vol]::Get() * 100))
    } else { Write-Output $vol }
  `)
  return { ok: true, volume: parseInt(stdout) || 0 }
}

async function muteToggle() {
  // Use nircmd if available, else use keypress
  try {
    await runPS(`
      $wshell = New-Object -ComObject WScript.Shell
      $wshell.SendKeys([char]173)
    `)
    return { ok: true, action: 'mute_toggled' }
  } catch {
    await runPS(`
      Add-Type @"
      using System; using System.Runtime.InteropServices;
      public class Kbd { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo); }
"@
      [Kbd]::keybd_event(0xAD, 0, 0, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 50
      [Kbd]::keybd_event(0xAD, 0, 2, [UIntPtr]::Zero)
    `)
    return { ok: true, action: 'mute_toggled' }
  }
}

// ---------------------------------------------------------------------------
//  12.  POWER MANAGEMENT
// ---------------------------------------------------------------------------

async function powerAction(action) {
  switch (action) {
    case 'shutdown':
      await execAsync('shutdown /s /t 5 /c "Purtikus: Shutting down..."', { windowsHide: true })
      return { ok: true, action: 'shutdown', delay: 5 }
    case 'restart':
      await execAsync('shutdown /r /t 5 /c "Purtikus: Restarting..."', { windowsHide: true })
      return { ok: true, action: 'restart', delay: 5 }
    case 'sleep':
      await runPS('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState("Suspend", $false, $false)')
      return { ok: true, action: 'sleep' }
    case 'hibernate':
      await runPS('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState("Hibernate", $false, $false)')
      return { ok: true, action: 'hibernate' }
    case 'lock':
      await execAsync('rundll32.exe user32.dll,LockWorkStation', { windowsHide: true })
      return { ok: true, action: 'lock' }
    case 'cancel_shutdown':
      await execAsync('shutdown /a', { windowsHide: true })
      return { ok: true, action: 'cancel_shutdown' }
    default:
      return { ok: false, error: `Unknown power action: ${action}` }
  }
}

// ---------------------------------------------------------------------------
//  13.  WIFI / NETWORK
// ---------------------------------------------------------------------------

async function wifiAction(action, name, password) {
  switch (action) {
    case 'list': {
      const { stdout } = await runPS('netsh wlan show networks mode=bssid | Select-String "SSID" | ForEach-Object { ($_ -split ":")[1].Trim() } | Where-Object { $_ -ne "" } | Select-Object -Unique')
      return { ok: true, networks: stdout.split('\n').filter(Boolean) }
    }
    case 'status': {
      const { stdout } = await runPS('netsh wlan show interfaces')
      return { ok: true, info: stdout }
    }
    case 'connect': {
      if (!name) return { ok: false, error: 'Network name required' }
      if (password) {
        // Create a temp profile
        const xml = `<?xml version="1.0"?><WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1"><name>${name}</name><SSIDConfig><SSID><name>${name}</name></SSID></SSIDConfig><connectionType>ESS</connectionType><connectionMode>auto</connectionMode><MSM><security><authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption><sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>${password}</keyMaterial></sharedKey></security></MSM></WLANProfile>`
        const profilePath = path.join(app.getPath('temp'), `wifi-${Date.now()}.xml`)
        fs.writeFileSync(profilePath, xml, 'utf-8')
        await execAsync(`netsh wlan add profile filename="${profilePath}"`, { windowsHide: true })
        fs.unlinkSync(profilePath)
      }
      await execAsync(`netsh wlan connect name="${name}"`, { windowsHide: true })
      return { ok: true, connected: name }
    }
    case 'disconnect':
      await execAsync('netsh wlan disconnect', { windowsHide: true })
      return { ok: true, disconnected: true }
    case 'enable':
      await runPS('Get-NetAdapter -Name "Wi-Fi*" | Enable-NetAdapter -Confirm:$false')
      return { ok: true, enabled: true }
    case 'disable':
      await runPS('Get-NetAdapter -Name "Wi-Fi*" | Disable-NetAdapter -Confirm:$false')
      return { ok: true, disabled: true }
    default:
      return { ok: false, error: `Unknown wifi action: ${action}` }
  }
}

// ---------------------------------------------------------------------------
//  14.  BLUETOOTH
// ---------------------------------------------------------------------------

async function bluetoothAction(action) {
  switch (action) {
    case 'enable':
      await runPS(`
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().AsTask().Result
        $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' }
        if ($bt) { $bt.SetStateAsync('On').AsTask().Wait() }
      `)
      return { ok: true, enabled: true }
    case 'disable':
      await runPS(`
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().AsTask().Result
        $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' }
        if ($bt) { $bt.SetStateAsync('Off').AsTask().Wait() }
      `)
      return { ok: true, disabled: true }
    case 'status': {
      const { stdout } = await runPS(`
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().AsTask().Result
        $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' }
        if ($bt) { $bt.State } else { 'NotFound' }
      `)
      return { ok: true, state: stdout.trim() }
    }
    default:
      return { ok: false, error: `Unknown bluetooth action: ${action}` }
  }
}

// ---------------------------------------------------------------------------
//  15.  BRIGHTNESS
// ---------------------------------------------------------------------------

async function setBrightness(level) {
  const brightness = Math.max(0, Math.min(100, Math.round(level)))
  await runPS(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${brightness})`)
  return { ok: true, brightness }
}

async function getBrightness() {
  try {
    const { stdout } = await runPS(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness`)
    return { ok: true, brightness: parseInt(stdout) || 0 }
  } catch {
    return { ok: false, error: 'Brightness control not available (desktop monitors may not support this)' }
  }
}

// ---------------------------------------------------------------------------
//  16.  MOUSE CONTROL
// ---------------------------------------------------------------------------

async function mouseAction(action, x, y, button) {
  const code = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Mouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  public static POINT GetPos() { POINT p; GetCursorPos(out p); return p; }
}
"@`
  switch (action) {
    case 'move':
      await runPS(`${code}\n[Mouse]::SetCursorPos(${x}, ${y})`)
      return { ok: true, moved: { x, y } }
    case 'click':
      if (x !== undefined && y !== undefined) {
        await runPS(`${code}\n[Mouse]::SetCursorPos(${x}, ${y})\nStart-Sleep -Milliseconds 50\n[Mouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)\n[Mouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)`)
      } else {
        await runPS(`${code}\n[Mouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)\n[Mouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)`)
      }
      return { ok: true, clicked: { x, y, button: button || 'left' } }
    case 'right_click':
      await runPS(`${code}\n${x !== undefined ? `[Mouse]::SetCursorPos(${x}, ${y})\nStart-Sleep -Milliseconds 50\n` : ''}[Mouse]::mouse_event(0x0008, 0, 0, 0, [UIntPtr]::Zero)\n[Mouse]::mouse_event(0x0010, 0, 0, 0, [UIntPtr]::Zero)`)
      return { ok: true, rightClicked: { x, y } }
    case 'double_click':
      await runPS(`${code}\n${x !== undefined ? `[Mouse]::SetCursorPos(${x}, ${y})\nStart-Sleep -Milliseconds 50\n` : ''}[Mouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)\n[Mouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)\nStart-Sleep -Milliseconds 50\n[Mouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)\n[Mouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)`)
      return { ok: true, doubleClicked: { x, y } }
    case 'scroll':
      await runPS(`${code}\n[Mouse]::mouse_event(0x0800, 0, 0, ${(y || 0) > 0 ? 120 : -120}, [UIntPtr]::Zero)`)
      return { ok: true, scrolled: y > 0 ? 'up' : 'down' }
    case 'position': {
      const { stdout } = await runPS(`${code}\n$p = [Mouse]::GetPos(); Write-Output "$($p.X),$($p.Y)"`)
      const [cx, cy] = stdout.split(',').map(Number)
      return { ok: true, x: cx, y: cy }
    }
    default:
      return { ok: false, error: `Unknown mouse action: ${action}` }
  }
}

// ---------------------------------------------------------------------------
//  17.  CLIPBOARD
// ---------------------------------------------------------------------------

async function clipboardAction(action, text) {
  if (action === 'get') {
    const { stdout } = await runPS('Get-Clipboard')
    return { ok: true, text: stdout }
  }
  if (action === 'set') {
    if (!text) return { ok: false, error: 'No text to set' }
    await runPS(`Set-Clipboard -Value '${psEscape(text)}'`)
    return { ok: true, set: true }
  }
  return { ok: false, error: `Unknown clipboard action: ${action}` }
}

// ---------------------------------------------------------------------------
//  18.  WINDOW MANAGEMENT
// ---------------------------------------------------------------------------

async function windowAction(action) {
  switch (action) {
    case 'minimize_all':
      await runPS('(New-Object -ComObject Shell.Application).MinimizeAll()')
      return { ok: true, action: 'minimize_all' }
    case 'restore_all':
      await runPS('(New-Object -ComObject Shell.Application).UndoMinimizeAll()')
      return { ok: true, action: 'restore_all' }
    case 'list': {
      const { stdout } = await runPS(`
        Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
        Select-Object Id, ProcessName, MainWindowTitle |
        ConvertTo-Json -Compress
      `)
      try {
        const parsed = JSON.parse(stdout)
        return { ok: true, windows: Array.isArray(parsed) ? parsed : [parsed] }
      } catch { return { ok: true, windows: [] } }
    }
    case 'switch_to': {
      // This is handled by pressing Alt+Tab via keyboard
      await pressShortcut('alt+tab')
      return { ok: true, action: 'switch_to' }
    }
    case 'show_desktop':
      await pressShortcut('win+d')
      return { ok: true, action: 'show_desktop' }
    case 'snap_left':
      await pressShortcut('win+left')
      return { ok: true, action: 'snap_left' }
    case 'snap_right':
      await pressShortcut('win+right')
      return { ok: true, action: 'snap_right' }
    case 'task_view':
      await pressShortcut('win+tab')
      return { ok: true, action: 'task_view' }
    default:
      return { ok: false, error: `Unknown window action: ${action}` }
  }
}

// ---------------------------------------------------------------------------
//  19.  WINDOWS SETTINGS (opens specific settings pages)
// ---------------------------------------------------------------------------

const SETTINGS_MAP = {
  // System
  'display':            'ms-settings:display',
  'sound':              'ms-settings:sound',
  'notifications':      'ms-settings:notifications',
  'power':              'ms-settings:powersleep',
  'battery':            'ms-settings:batterysaver',
  'storage':            'ms-settings:storagesense',
  'multitasking':       'ms-settings:multitasking',
  'about':              'ms-settings:about',
  // Network
  'wifi':               'ms-settings:network-wifi',
  'ethernet':           'ms-settings:network-ethernet',
  'vpn':                'ms-settings:network-vpn',
  'airplane':           'ms-settings:network-airplanemode',
  'proxy':              'ms-settings:network-proxy',
  // Personalization
  'background':         'ms-settings:personalization-background',
  'colors':             'ms-settings:personalization-colors',
  'lock_screen':        'ms-settings:lockscreen',
  'themes':             'ms-settings:themes',
  'taskbar':            'ms-settings:taskbar',
  'start_menu':         'ms-settings:personalization-start',
  // Apps
  'apps':               'ms-settings:appsfeatures',
  'default_apps':       'ms-settings:defaultapps',
  'startup_apps':       'ms-settings:startupapps',
  // Accounts
  'accounts':           'ms-settings:yourinfo',
  'email':              'ms-settings:emailandaccounts',
  'sign_in':            'ms-settings:signinoptions',
  // Time & Language
  'datetime':           'ms-settings:dateandtime',
  'language':           'ms-settings:regionlanguage',
  'keyboard':           'ms-settings:keyboard',
  // Privacy
  'privacy':            'ms-settings:privacy',
  'camera_privacy':     'ms-settings:privacy-webcam',
  'microphone_privacy': 'ms-settings:privacy-microphone',
  'location':           'ms-settings:privacy-location',
  // Update
  'update':             'ms-settings:windowsupdate',
  // Bluetooth
  'bluetooth':          'ms-settings:bluetooth',
  'devices':            'ms-settings:connecteddevices',
}

async function openSettings(page) {
  const key = (page || '').toLowerCase().replace(/\s+/g, '_')
  const uri = SETTINGS_MAP[key] || `ms-settings:${key}`
  await execAsync(`start "" "${uri}"`, { shell: true })
  return { ok: true, opened: uri }
}

// ---------------------------------------------------------------------------
//  20.  INSTALLED PROGRAMS
// ---------------------------------------------------------------------------

async function listInstalledApps() {
  const { stdout } = await runPS(`
    $apps = @()
    $apps += Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName } | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate
    $apps += Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName } | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate
    $apps | Sort-Object DisplayName -Unique | ConvertTo-Json -Compress
  `)
  try {
    const parsed = JSON.parse(stdout)
    return { ok: true, apps: Array.isArray(parsed) ? parsed : [parsed] }
  } catch { return { ok: true, apps: [] } }
}

// ---------------------------------------------------------------------------
//  21.  WINDOWS SERVICES
// ---------------------------------------------------------------------------

async function serviceAction(action, serviceName) {
  switch (action) {
    case 'list': {
      const { stdout } = await runPS(`
        Get-Service | Select-Object Name, DisplayName, Status |
        ConvertTo-Json -Compress
      `)
      try {
        const parsed = JSON.parse(stdout)
        return { ok: true, services: Array.isArray(parsed) ? parsed : [parsed] }
      } catch { return { ok: true, services: [] } }
    }
    case 'start':
      await runPS(`Start-Service -Name '${psEscape(serviceName)}'`)
      return { ok: true, started: serviceName }
    case 'stop':
      await runPS(`Stop-Service -Name '${psEscape(serviceName)}' -Force`)
      return { ok: true, stopped: serviceName }
    case 'restart':
      await runPS(`Restart-Service -Name '${psEscape(serviceName)}' -Force`)
      return { ok: true, restarted: serviceName }
    case 'status': {
      const { stdout } = await runPS(`(Get-Service -Name '${psEscape(serviceName)}').Status`)
      return { ok: true, service: serviceName, status: stdout.trim() }
    }
    default:
      return { ok: false, error: `Unknown service action: ${action}` }
  }
}

// ---------------------------------------------------------------------------
//  22.  NOTIFICATIONS / TOAST
// ---------------------------------------------------------------------------

async function showNotification(title, message) {
  await runPS(`
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $xml = @"
    <toast><visual><binding template="ToastText02"><text id="1">${psEscape(title || 'Purtikus')}</text><text id="2">${psEscape(message || '')}</text></binding></visual></toast>
"@
    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
    $doc.LoadXml($xml)
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Purtikus")
    $notifier.Show([Windows.UI.Notifications.ToastNotification]::new($doc))
  `)
  return { ok: true, notified: true }
}

// ---------------------------------------------------------------------------
//  REGISTER ALL IPC HANDLERS
// ---------------------------------------------------------------------------

function registerPcControlHandlers(ipcMain) {

  // Wrap every handler in a try/catch so errors are returned, never thrown
  function safeHandle(channel, fn) {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        return await fn(...args)
      } catch (err) {
        return { ok: false, error: err.message || String(err) }
      }
    })
  }

  // Apps
  safeHandle('pc:open-app',         (name) => openApp(name))
  safeHandle('pc:close-app',        (processName) => closeApp(processName))
  safeHandle('pc:list-processes',    () => listProcesses())

  // Screenshot
  safeHandle('pc:screenshot',        () => takeScreenshot())

  // Keyboard
  safeHandle('pc:type-text',         (text) => typeText(text))
  safeHandle('pc:press-shortcut',    (keys) => pressShortcut(keys))

  // Files
  safeHandle('pc:list-files',        (dirPath) => listFiles(dirPath))
  safeHandle('pc:read-file',         (filePath) => readFileContent(filePath))
  safeHandle('pc:write-file',        (filePath, content) => writeFileContent(filePath, content))
  safeHandle('pc:delete-item',       (itemPath) => deleteItem(itemPath))
  safeHandle('pc:create-dir',        (dirPath) => createDirectory(dirPath))
  safeHandle('pc:file-info',         (filePath) => getFileInfo(filePath))

  // URL
  safeHandle('pc:open-url',          (url) => openUrl(url))

  // System
  safeHandle('pc:system-info',       () => getSystemInfo())

  // Run arbitrary command
  safeHandle('pc:run-command',       (cmd, shell) => runCommand(cmd, shell))

  // Volume
  safeHandle('pc:set-volume',        (level) => setVolume(level))
  safeHandle('pc:get-volume',        () => getVolume())
  safeHandle('pc:mute-toggle',       () => muteToggle())

  // Power
  safeHandle('pc:power',             (action) => powerAction(action))

  // Wi-Fi
  safeHandle('pc:wifi',              (action, name, password) => wifiAction(action, name, password))

  // Bluetooth
  safeHandle('pc:bluetooth',         (action) => bluetoothAction(action))

  // Brightness
  safeHandle('pc:set-brightness',    (level) => setBrightness(level))
  safeHandle('pc:get-brightness',    () => getBrightness())

  // Mouse
  safeHandle('pc:mouse',             (action, x, y, button) => mouseAction(action, x, y, button))

  // Clipboard
  safeHandle('pc:clipboard',         (action, text) => clipboardAction(action, text))

  // Window management
  safeHandle('pc:window',            (action) => windowAction(action))

  // Windows Settings
  safeHandle('pc:open-settings',     (page) => openSettings(page))

  // Installed apps
  safeHandle('pc:installed-apps',    () => listInstalledApps())

  // Services
  safeHandle('pc:service',           (action, name) => serviceAction(action, name))

  // Notification
  safeHandle('pc:notify',            (title, msg) => showNotification(title, msg))
}

module.exports = { registerPcControlHandlers }
