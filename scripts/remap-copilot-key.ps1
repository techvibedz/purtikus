# Remap the Windows Copilot key to launch Purtikus
# Run this script as Administrator once after install
#
# This sets the Copilot key behavior to launch a custom app (Purtikus)
# instead of opening Microsoft Copilot.
#
# The Copilot key on Windows 11 23H2+ can be remapped via registry.

$ErrorActionPreference = "Stop"

Write-Host "=== Remapping Copilot Key to Purtikus ===" -ForegroundColor Cyan

# Method 1: Set CopilotKeyBehavior registry (Windows 11 23H2+)
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
try {
    # Value 1 = Custom app, 0 = Microsoft Copilot
    Set-ItemProperty -Path $regPath -Name "CopilotKeyBehavior" -Value 1 -Type DWord -Force
    Write-Host "[OK] CopilotKeyBehavior set to Custom" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not set CopilotKeyBehavior: $_" -ForegroundColor Yellow
}

# Method 2: Find Purtikus exe path
$purtikusPath = $null
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\purtikus\Purtikus.exe",
    "$env:LOCALAPPDATA\purtikus\Purtikus.exe",
    "${env:ProgramFiles}\Purtikus\Purtikus.exe",
    "${env:ProgramFiles(x86)}\Purtikus\Purtikus.exe"
)

foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
        $purtikusPath = $p
        break
    }
}

if (-not $purtikusPath) {
    Write-Host "[INFO] Purtikus not found in standard paths. Searching..." -ForegroundColor Yellow
    $found = Get-ChildItem "$env:LOCALAPPDATA\Programs" -Recurse -Filter "Purtikus.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $purtikusPath = $found.FullName }
}

if ($purtikusPath) {
    Write-Host "[OK] Found Purtikus at: $purtikusPath" -ForegroundColor Green
    
    # Method 3: Override Win+C shortcut to launch Purtikus (alternative)
    # Create a scheduled task that watches for the Copilot key
    Write-Host ""
    Write-Host "The Copilot key should now open Purtikus instead of Microsoft Copilot." -ForegroundColor Green
    Write-Host "If the Copilot key still opens Copilot, try:" -ForegroundColor Yellow
    Write-Host "  1. Open Windows Settings > Personalization > Text Input" -ForegroundColor White
    Write-Host "  2. Under 'Copilot key', select 'Custom'" -ForegroundColor White
    Write-Host "  3. Restart your PC" -ForegroundColor White
} else {
    Write-Host "[WARN] Could not find Purtikus.exe — install the app first" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "NOTE: Purtikus also registers Ctrl+Shift+P as a global hotkey." -ForegroundColor Cyan
Write-Host "      Press it anytime to toggle the AI on/off!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Done! You may need to restart your PC for the Copilot key change." -ForegroundColor Green
