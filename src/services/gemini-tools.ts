// ---------------------------------------------------------------------------
//  Gemini function-calling tool declarations + renderer-side executor
// ---------------------------------------------------------------------------

/** Schema sent to Gemini in the setup message */
export const TOOL_DECLARATIONS = [
  {
    name: 'open_application',
    description: 'Opens a Windows application by name (e.g. chrome, notepad, calculator, vscode, spotify, discord, word, excel)',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Application name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'close_application',
    description: 'Closes / kills a running application by its process name',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Process name (e.g. chrome, notepad.exe, spotify)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'take_screenshot',
    description: 'Captures a screenshot of the entire screen and saves it as a PNG file',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'type_text',
    description: 'Types text on the keyboard as if the user typed it. The target window must already be focused.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING', description: 'The text to type' },
      },
      required: ['text'],
    },
  },
  {
    name: 'press_hotkey',
    description: 'Presses a keyboard shortcut / hotkey combination. Examples: ["ctrl","c"], ["alt","f4"], ["ctrl","shift","s"], ["win","e"]',
    parameters: {
      type: 'OBJECT',
      properties: {
        keys: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Array of key names to press simultaneously',
        },
      },
      required: ['keys'],
    },
  },
  {
    name: 'open_url',
    description: 'Opens a URL in the default web browser',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'The URL to open' },
      },
      required: ['url'],
    },
  },
  {
    name: 'list_files',
    description: 'Lists all files and sub-folders in a directory. Returns name, path, size, type, and modification date for each entry.',
    parameters: {
      type: 'OBJECT',
      properties: {
        directory: { type: 'STRING', description: 'Absolute directory path (e.g. C:\\Users\\asus\\Desktop)' },
      },
      required: ['directory'],
    },
  },
  {
    name: 'create_file',
    description: 'Creates (or overwrites) a text file at the given path with the specified content. Parent directories are created automatically.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: { type: 'STRING', description: 'Absolute file path' },
        content: { type: 'STRING', description: 'File content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'search_google',
    description: 'Opens a Google search for the given query in the default browser',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'run_command',
    description: 'Runs an arbitrary PowerShell or CMD command on Windows and returns stdout/stderr. Use this for anything not covered by other tools.',
    parameters: {
      type: 'OBJECT',
      properties: {
        command: { type: 'STRING', description: 'The command to execute' },
        shell: { type: 'STRING', description: 'Shell to use: "powershell" (default) or "cmd"' },
      },
      required: ['command'],
    },
  },
  {
    name: 'set_volume',
    description: 'Sets the system master volume to a level between 0 and 100',
    parameters: {
      type: 'OBJECT',
      properties: {
        level: { type: 'NUMBER', description: 'Volume level (0-100)' },
      },
      required: ['level'],
    },
  },
  {
    name: 'get_volume',
    description: 'Gets the current system master volume level (0-100)',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'mute_toggle',
    description: 'Toggles system audio mute on/off',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'power_action',
    description: 'Controls system power: shutdown, restart, sleep, hibernate, lock, or cancel_shutdown',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'One of: shutdown, restart, sleep, hibernate, lock, cancel_shutdown' },
      },
      required: ['action'],
    },
  },
  {
    name: 'wifi_control',
    description: 'Controls Wi-Fi: list available networks, connect, disconnect, enable, disable, or get status',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'One of: list, status, connect, disconnect, enable, disable' },
        name: { type: 'STRING', description: 'Network SSID name (for connect)' },
        password: { type: 'STRING', description: 'Network password (for connect, optional if already known)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'bluetooth_control',
    description: 'Controls Bluetooth: enable, disable, or get status',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'One of: enable, disable, status' },
      },
      required: ['action'],
    },
  },
  {
    name: 'set_brightness',
    description: 'Sets the screen brightness to a level between 0 and 100 (laptops only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        level: { type: 'NUMBER', description: 'Brightness level (0-100)' },
      },
      required: ['level'],
    },
  },
  {
    name: 'get_brightness',
    description: 'Gets the current screen brightness level (laptops only)',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'mouse_control',
    description: 'Controls the mouse cursor: move, click, right_click, double_click, scroll, or get position',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'One of: move, click, right_click, double_click, scroll, position' },
        x: { type: 'NUMBER', description: 'X coordinate (pixels from left)' },
        y: { type: 'NUMBER', description: 'Y coordinate (pixels from top). For scroll: positive=up, negative=down' },
      },
      required: ['action'],
    },
  },
  {
    name: 'clipboard',
    description: 'Get or set the system clipboard text content',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'One of: get, set' },
        text: { type: 'STRING', description: 'Text to set (only for set action)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'window_management',
    description: 'Manage windows: minimize_all, restore_all, list (open windows), show_desktop, snap_left, snap_right, task_view, switch_to',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'One of: minimize_all, restore_all, list, show_desktop, snap_left, snap_right, task_view, switch_to' },
      },
      required: ['action'],
    },
  },
  {
    name: 'open_settings',
    description: 'Opens a specific Windows Settings page. Examples: display, sound, wifi, bluetooth, power, background, themes, taskbar, apps, update, notifications, privacy, storage, about, datetime, language, keyboard, camera_privacy, microphone_privacy, vpn, proxy',
    parameters: {
      type: 'OBJECT',
      properties: {
        page: { type: 'STRING', description: 'Settings page name (e.g. sound, wifi, display, bluetooth, apps, update)' },
      },
      required: ['page'],
    },
  },
  {
    name: 'list_installed_apps',
    description: 'Lists all installed programs on the PC with name, version, and publisher',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'service_control',
    description: 'Manage Windows services: list, start, stop, restart, or get status of a service',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'One of: list, start, stop, restart, status' },
        name: { type: 'STRING', description: 'Service name (required for start/stop/restart/status)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'show_notification',
    description: 'Shows a Windows toast notification with a title and message',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Notification title' },
        message: { type: 'STRING', description: 'Notification body text' },
      },
      required: ['title', 'message'],
    },
  },
  {
    name: 'delete_file',
    description: 'Deletes a file or directory at the given path. USE WITH CAUTION — always confirm with the user first!',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: { type: 'STRING', description: 'Absolute path to the file or folder to delete' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description: 'Reads the text content of a file (max 10MB)',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: { type: 'STRING', description: 'Absolute file path to read' },
      },
      required: ['path'],
    },
  },
]

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface FunctionCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface FunctionResponse {
  id: string
  response: Record<string, unknown>
}

// ---------------------------------------------------------------------------
//  Executor — bridges Gemini tool calls → Electron IPC (window.electron.pc)
// ---------------------------------------------------------------------------

export async function executeToolCall(call: FunctionCall): Promise<FunctionResponse> {
  const pc = window.electron?.pc
  if (!pc) {
    return {
      id: call.id,
      response: { ok: false, error: 'PC control not available — app is not running inside Electron' },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any

  try {
    switch (call.name) {
      case 'open_application':
        result = await pc.openApp(call.args.name as string)
        break

      case 'close_application':
        result = await pc.closeApp(call.args.name as string)
        break

      case 'take_screenshot':
        result = await pc.screenshot()
        break

      case 'type_text':
        result = await pc.typeText(call.args.text as string)
        break

      case 'press_hotkey': {
        const keys = call.args.keys as string[]
        result = await pc.pressShortcut(keys.join('+'))
        break
      }

      case 'open_url':
        result = await pc.openUrl(call.args.url as string)
        break

      case 'list_files': {
        const files = await pc.listFiles(call.args.directory as string)
        const capped = Array.isArray(files) ? files.slice(0, 100) : files
        result = { ok: true, count: Array.isArray(files) ? files.length : 0, files: capped }
        break
      }

      case 'create_file':
        result = await pc.writeFile(
          call.args.path as string,
          call.args.content as string,
        )
        break

      case 'search_google': {
        const q = encodeURIComponent(call.args.query as string)
        const urlResult = await pc.openUrl(`https://www.google.com/search?q=${q}`)
        result = { ...urlResult, query: call.args.query }
        break
      }

      case 'run_command':
        result = await pc.runCommand(call.args.command as string, (call.args.shell as string) || 'powershell')
        break

      case 'set_volume':
        result = await pc.setVolume(call.args.level as number)
        break

      case 'get_volume':
        result = await pc.getVolume()
        break

      case 'mute_toggle':
        result = await pc.muteToggle()
        break

      case 'power_action':
        result = await pc.power(call.args.action as string)
        break

      case 'wifi_control':
        result = await pc.wifi(
          call.args.action as string,
          call.args.name as string | undefined,
          call.args.password as string | undefined,
        )
        break

      case 'bluetooth_control':
        result = await pc.bluetooth(call.args.action as string)
        break

      case 'set_brightness':
        result = await pc.setBrightness(call.args.level as number)
        break

      case 'get_brightness':
        result = await pc.getBrightness()
        break

      case 'mouse_control':
        result = await pc.mouse(
          call.args.action as string,
          call.args.x as number | undefined,
          call.args.y as number | undefined,
          call.args.button as string | undefined,
        )
        break

      case 'clipboard':
        result = await pc.clipboard(call.args.action as string, call.args.text as string | undefined)
        break

      case 'window_management':
        result = await pc.windowAction(call.args.action as string)
        break

      case 'open_settings':
        result = await pc.openSettings(call.args.page as string)
        break

      case 'list_installed_apps':
        result = await pc.installedApps()
        break

      case 'service_control':
        result = await pc.service(call.args.action as string, call.args.name as string | undefined)
        break

      case 'show_notification':
        result = await pc.notify(call.args.title as string, call.args.message as string)
        break

      case 'delete_file':
        result = await pc.deleteItem(call.args.path as string)
        break

      case 'read_file':
        result = await pc.readFile(call.args.path as string)
        break

      default:
        result = { ok: false, error: `Unknown function: ${call.name}` }
    }
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  return { id: call.id, response: result as Record<string, unknown> }
}

/** Execute multiple tool calls in parallel and return all responses */
export async function executeToolCalls(calls: FunctionCall[]): Promise<FunctionResponse[]> {
  return Promise.all(calls.map(executeToolCall))
}
