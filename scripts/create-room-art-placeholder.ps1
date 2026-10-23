param(
  [string]$OutputDirectory = "public/assets/rooms"
)

Add-Type -AssemblyName System.Drawing

$workspace = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $workspace $OutputDirectory
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$width = 600
$height = 438

function New-Canvas {
  $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  return @($bitmap, $graphics)
}

function New-Points([int[][]]$coordinates) {
  return [System.Drawing.Point[]]@($coordinates | ForEach-Object {
    [System.Drawing.Point]::new($_[0], $_[1])
  })
}

function Fill-Polygon($graphics, [string]$color, [int[][]]$coordinates) {
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
  $graphics.FillPolygon($brush, (New-Points $coordinates))
  $brush.Dispose()
}

function Stroke-Line($graphics, [string]$color, [float]$widthValue, [int]$x1, [int]$y1, [int]$x2, [int]$y2) {
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($color), $widthValue)
  $graphics.DrawLine($pen, $x1, $y1, $x2, $y2)
  $pen.Dispose()
}

function Draw-Sprite($graphics, [string]$file, [System.Drawing.Rectangle]$source, [System.Drawing.Rectangle]$destination) {
  $image = [System.Drawing.Image]::FromFile((Join-Path $workspace $file))
  $graphics.DrawImage($image, $destination, $source, [System.Drawing.GraphicsUnit]::Pixel)
  $image.Dispose()
}

$baseParts = New-Canvas
$base = $baseParts[0]
$baseGraphics = $baseParts[1]

Fill-Polygon $baseGraphics '#162f35' @(@(280,138),@(600,298),@(600,160),@(280,0))
Fill-Polygon $baseGraphics '#1d3a3f' @(@(280,138),@(0,278),@(0,140),@(280,0))
Fill-Polygon $baseGraphics '#c9b489' @(@(280,138),@(600,298),@(320,438),@(0,278))

for ($tileX = 0; $tileX -le 8; $tileX++) {
  $x1 = 280 + ($tileX * 40)
  $y1 = 138 + ($tileX * 20)
  Stroke-Line $baseGraphics '#9f8e71' 1 $x1 $y1 ($x1 - 280) ($y1 + 140)
}
for ($tileY = 0; $tileY -le 7; $tileY++) {
  $x1 = 280 - ($tileY * 40)
  $y1 = 138 + ($tileY * 20)
  Stroke-Line $baseGraphics '#9f8e71' 1 $x1 $y1 ($x1 + 320) ($y1 + 160)
}

for ($index = 0; $index -lt 620; $index++) {
  $localX = (($index * 37) % 790) / 100.0
  $localY = (($index * 61) % 690) / 100.0
  $screenX = [int](280 + (($localX - $localY) * 40))
  $screenY = [int](138 + (($localX + $localY) * 20))
  if ($screenX -ge 0 -and $screenX -lt $width -and $screenY -ge 138 -and $screenY -lt $height) {
    $base.SetPixel($screenX, $screenY, [System.Drawing.Color]::FromArgb(72, 72, 62, 48))
  }
}

for ($panel = 1; $panel -lt 8; $panel++) {
  Stroke-Line $baseGraphics '#2a5054' 1 (280 + $panel * 40) (138 + $panel * 20) (280 + $panel * 40) ($panel * 20)
}
for ($panel = 1; $panel -lt 7; $panel++) {
  Stroke-Line $baseGraphics '#31565a' 1 (280 - $panel * 40) (138 + $panel * 20) (280 - $panel * 40) ($panel * 20)
}

Fill-Polygon $baseGraphics '#37756f' @(@(175,290),@(319,362),@(239,402),@(95,330))
Fill-Polygon $baseGraphics '#e0a25e' @(@(196,307),@(287,352),@(238,376),@(148,331))
Fill-Polygon $baseGraphics '#315e5b' @(@(210,321),@(264,348),@(236,362),@(182,335))

$posterBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e9cf8a'))
$baseGraphics.FillRectangle($posterBrush, 350, 54, 54, 39)
$posterBrush.Color = [System.Drawing.ColorTranslator]::FromHtml('#df7657')
$baseGraphics.FillRectangle($posterBrush, 360, 65, 31, 4)
$posterBrush.Color = [System.Drawing.ColorTranslator]::FromHtml('#4e8d84')
$baseGraphics.FillRectangle($posterBrush, 360, 74, 22, 4)
$posterBrush.Dispose()

for ($shelf = 0; $shelf -lt 3; $shelf++) {
  Fill-Polygon $baseGraphics '#865844' @(@(60,190+$shelf*22),@(145,232+$shelf*22),@(145,238+$shelf*22),@(60,196+$shelf*22))
  for ($book = 0; $book -lt 8; $book++) {
    $bookBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 90 + (($book * 31) % 110), 80 + (($book * 17) % 90), 70 + (($book * 23) % 80)))
    $baseGraphics.FillRectangle($bookBrush, 68 + $book * 9, 184 + $shelf * 22 + $book % 3, 6, 17)
    $bookBrush.Dispose()
  }
}

Draw-Sprite $baseGraphics 'public/assets/sprites/plant.png' ([System.Drawing.Rectangle]::new(570,60,650,770)) ([System.Drawing.Rectangle]::new(244,76,68,88))
Draw-Sprite $baseGraphics 'public/assets/sprites/computer.png' ([System.Drawing.Rectangle]::new(596,66,610,794)) ([System.Drawing.Rectangle]::new(485,213,72,98))

for ($paper = 0; $paper -lt 20; $paper++) {
  $paperBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(210, 238, 221 - ($paper % 3) * 8, 184 + ($paper % 4) * 7))
  $baseGraphics.FillRectangle($paperBrush, 115 + (($paper * 47) % 390), 235 + (($paper * 29) % 145), 3 + ($paper % 5), 2)
  $paperBrush.Dispose()
}

$baseGraphics.Dispose()
$base.Save((Join-Path $outputPath 'developer-office-placeholder-base.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$base.Dispose()

$deskParts = New-Canvas
$desk = $deskParts[0]
$deskGraphics = $deskParts[1]
Draw-Sprite $deskGraphics 'public/assets/sprites/desk.png' ([System.Drawing.Rectangle]::new(390,64,1000,760)) ([System.Drawing.Rectangle]::new(330,168,168,124))
Draw-Sprite $deskGraphics 'public/assets/sprites/lamp.png' ([System.Drawing.Rectangle]::new(458,48,780,920)) ([System.Drawing.Rectangle]::new(463,172,51,67))
$deskGraphics.Dispose()
$desk.Save((Join-Path $outputPath 'developer-office-placeholder-desk.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$desk.Dispose()

$chairParts = New-Canvas
$chair = $chairParts[0]
$chairGraphics = $chairParts[1]
Draw-Sprite $chairGraphics 'public/assets/sprites/chair.png' ([System.Drawing.Rectangle]::new(292,155,620,1000)) ([System.Drawing.Rectangle]::new(303,218,76,100))
$chairGraphics.Dispose()
$chair.Save((Join-Path $outputPath 'developer-office-placeholder-chair.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$chair.Dispose()

Write-Output "Created temporary layered room artwork in $outputPath"
