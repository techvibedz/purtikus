Add-Type -AssemblyName System.Drawing

$size = 256
$cx = $size / 2
$cy = $size / 2
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'HighQuality'
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'

# === Background: deep dark ===
$g.Clear([System.Drawing.Color]::FromArgb(8, 8, 16))

# === Outer soft glow (large, faint violet) ===
for ($i = 0; $i -lt 6; $i++) {
    $alpha = [int](18 - $i * 3)
    $spread = 8 + $i * 12
    $br = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha, 139, 92, 246))
    $g.FillEllipse($br, $spread, $spread, ($size - $spread * 2), ($size - $spread * 2))
    $br.Dispose()
}

# === Main outer ring (violet gradient illusion) ===
$pen1 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 139, 92, 246), 6)
$g.DrawEllipse($pen1, 38, 38, 180, 180)
$pen1.Dispose()

# === Second ring (cyan/teal accent) ===
$pen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(140, 6, 182, 212), 3)
$g.DrawEllipse($pen2, 52, 52, 152, 152)
$pen2.Dispose()

# === Inner ring (brighter violet) ===
$pen3 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 168, 85, 247), 2)
$g.DrawEllipse($pen3, 68, 68, 120, 120)
$pen3.Dispose()

# === Central orb fill (deep violet core) ===
$coreBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 88, 28, 195))
$g.FillEllipse($coreBrush, 82, 82, 92, 92)
$coreBrush.Dispose()

# === Bright cyan "eye" pupil center ===
$eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 6, 214, 230))
$g.FillEllipse($eyeBrush, 104, 104, 48, 48)
$eyeBrush.Dispose()

# === White highlight dot (gives depth/glass effect) ===
$hlBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 255, 255, 255))
$g.FillEllipse($hlBrush, 112, 108, 16, 14)
$hlBrush.Dispose()

# === Small secondary highlight ===
$hl2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(80, 255, 255, 255))
$g.FillEllipse($hl2, 130, 124, 8, 7)
$hl2.Dispose()

# === Bottom-right "P" letter subtly ===
$font = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 255, 255, 255))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$sf.LineAlignment = 'Center'
$g.DrawString("P", $font, $textBrush, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $sf)
$font.Dispose()
$textBrush.Dispose()
$sf.Dispose()

$g.Dispose()

# Convert to Icon and save
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs = [System.IO.File]::Create("$PSScriptRoot\icon.ico")
$ico.Save($fs)
$fs.Close()
$ico.Dispose()
$bmp.Dispose()

Write-Host "icon.ico created successfully"
