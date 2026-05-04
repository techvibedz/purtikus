Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'HighQuality'
$g.Clear([System.Drawing.Color]::FromArgb(10, 10, 15))

# Outer glow
$brush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 124, 58, 237))
$g.FillEllipse($brush1, 20, 20, 216, 216)

# Inner orb
$brush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 124, 58, 237))
$g.FillEllipse($brush2, 50, 50, 156, 156)

# Highlight
$brush3 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 6, 182, 212))
$g.FillEllipse($brush3, 70, 60, 80, 60)

$g.Dispose()

# Convert to Icon and save
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs = [System.IO.File]::Create("$PSScriptRoot\icon.ico")
$ico.Save($fs)
$fs.Close()
$ico.Dispose()
$bmp.Dispose()

Write-Host "icon.ico created successfully"
