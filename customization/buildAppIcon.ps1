# 用项目根目录的应用图标源图生成 logo.ico 与 macOS iconset（裁掉右下角水印）。
# 用法（仓库根目录执行）：pwsh -File customization/buildAppIcon.ps1
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Add-Type -AssemblyName System.Drawing

Set-Location $RepoRoot
$sourcePath = Join-Path $RepoRoot "qmix.png"
$assetsDir = Join-Path $RepoRoot "packages\assets"
$iconsetDir = Join-Path $assetsDir "logo.iconset"

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)

# ACT: 源图不是正方形，取四角颜色当底色，把原图居中放在正方形画布上（左右留 14% 边距）。
# 若源图带水印，先手工裁掉再放进来。
$background = $source.GetPixel(0, 0)
$side = [int]([Math]::Max($source.Width, $source.Height) * 1.14)
$master = New-Object System.Drawing.Bitmap($side, $side, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$canvas = [System.Drawing.Graphics]::FromImage($master)
$canvas.Clear($background)
$scale = [Math]::Min($side * 0.86 / $source.Width, $side * 0.86 / $source.Height)
$drawWidth = [int]($source.Width * $scale)
$drawHeight = [int]($source.Height * $scale)
$canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$canvas.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$drawX = [int](($side - $drawWidth) / 2)
$drawY = [int](($side - $drawHeight) / 2)
$drawRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawWidth, $drawHeight)
$canvas.DrawImage($source, $drawRect)
$canvas.Dispose()
Write-Host ("主图：{0}x{1}" -f $master.Width, $master.Height)

function New-Scaled([System.Drawing.Bitmap]$bitmap, [int]$size) {
    $target = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($bitmap, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
    $graphics.Dispose()
    return $target
}

function Get-IconEntryBytes([System.Drawing.Bitmap]$bitmap) {
    $size = $bitmap.Width
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $data = $bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $data.Stride
    $pixels = New-Object byte[] ($stride * $size)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $pixels, 0, $pixels.Length)
    $bitmap.UnlockBits($data)

    $maskStride = [int][Math]::Ceiling($size / 32.0) * 4
    $stream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($stream)
    # BITMAPINFOHEADER：高度写两倍，XOR 位图之后跟 AND 掩码。
    $writer.Write([int]40); $writer.Write([int]$size); $writer.Write([int]($size * 2))
    $writer.Write([int16]1); $writer.Write([int16]32); $writer.Write([int]0)
    $writer.Write([int]($size * $size * 4)); $writer.Write([int]0); $writer.Write([int]0)
    $writer.Write([int]0); $writer.Write([int]0)
    # XOR 位图自下而上写入
    for ($y = $size - 1; $y -ge 0; $y--) { $writer.Write($pixels, $y * $stride, $size * 4) }
    # AND 掩码全 0（透明度由 alpha 通道决定）
    $writer.Write((New-Object byte[] ($maskStride * $size)))
    $writer.Flush()
    $bytes = $stream.ToArray()
    $writer.Dispose()
    $stream.Dispose()
    return $bytes
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$entries = @()
foreach ($size in $sizes) {
    $scaled = New-Scaled $master $size
    $entries += @{ Size = $size; Bytes = [byte[]](Get-IconEntryBytes $scaled) }
    $scaled.Dispose()
}

$icoPath = Join-Path $assetsDir "logo.ico"
$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([int16]0); $writer.Write([int16]1); $writer.Write([int16]$entries.Count)
$offset = 6 + 16 * $entries.Count
foreach ($entry in $entries) {
    $dimension = if ($entry.Size -ge 256) { 0 } else { $entry.Size }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([int16]1); $writer.Write([int16]32)
    $writer.Write([int]$entry.Bytes.Length); $writer.Write([int]$offset)
    $offset += $entry.Bytes.Length
}
foreach ($entry in $entries) { $writer.Write($entry.Bytes) }
$writer.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
$writer.Dispose()
$stream.Dispose()
Write-Host ("logo.ico 已生成：{0:N0} 字节，含 {1} 个尺寸" -f (Get-Item $icoPath).Length, $entries.Count)

# macOS iconset
New-Item -ItemType Directory -Force -Path $iconsetDir | Out-Null
$iconsetTargets = @(
    @{ Name = "icon_16x16.png"; Size = 16 },
    @{ Name = "icon_16x16@2x.png"; Size = 32 },
    @{ Name = "icon_32x32.png"; Size = 32 },
    @{ Name = "icon_32x32@2x.png"; Size = 64 },
    @{ Name = "icon_128x128.png"; Size = 128 },
    @{ Name = "icon_128x128@2x.png"; Size = 256 },
    @{ Name = "icon_256x256.png"; Size = 256 },
    @{ Name = "icon_256x256@2x.png"; Size = 512 },
    @{ Name = "icon_512x512.png"; Size = 512 },
    @{ Name = "icon_512x512@2x.png"; Size = 1024 }
)
foreach ($target in $iconsetTargets) {
    $scaled = New-Scaled $master $target.Size
    $scaled.Save((Join-Path $iconsetDir $target.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $scaled.Dispose()
}
Write-Host ("iconset 已生成：{0} 个文件" -f $iconsetTargets.Count)

$master.Dispose()
$source.Dispose()
Write-Host "完成"
