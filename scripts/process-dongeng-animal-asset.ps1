param(
  [string]$Source = "public/images/dongeng/generated/animal-parade-chroma.png",
  [string]$OutputDirectory = "public/images/dongeng/generated"
)

Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$outputPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null

$code = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class DongengAnimalProcessor
{
    public static Bitmap RemoveGreen(Bitmap source)
    {
        var result = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
        for (var y = 0; y < source.Height; y++)
        {
            for (var x = 0; x < source.Width; x++)
            {
                var pixel = source.GetPixel(x, y);
                var competing = Math.Max(pixel.R, pixel.B);
                var greenLead = pixel.G - competing;

                if (pixel.G > 90 && greenLead > 32)
                {
                    var alpha = greenLead >= 92
                        ? 0
                        : (int)Math.Round(255.0 * (92 - greenLead) / 60.0);
                    alpha = Math.Max(0, Math.Min(255, alpha));
                    var green = Math.Min(pixel.G, competing + 12);
                    result.SetPixel(x, y, Color.FromArgb(alpha, pixel.R, green, pixel.B));
                }
                else
                {
                    result.SetPixel(x, y, Color.FromArgb(pixel.A, pixel.R, pixel.G, pixel.B));
                }
            }
        }
        return result;
    }

    public static void SaveCrop(Bitmap source, Rectangle crop, string destination, int targetHeight)
    {
        var width = Math.Max(1, (int)Math.Round(crop.Width * (targetHeight / (double)crop.Height)));
        using (var output = new Bitmap(width, targetHeight, PixelFormat.Format32bppArgb))
        using (var graphics = Graphics.FromImage(output))
        {
            graphics.Clear(Color.Transparent);
            graphics.CompositingMode = CompositingMode.SourceCopy;
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.DrawImage(source, new Rectangle(0, 0, width, targetHeight), crop, GraphicsUnit.Pixel);
            output.Save(destination, ImageFormat.Png);
        }
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$sourceBitmap = [System.Drawing.Bitmap]::new($sourcePath)
try {
  $transparent = [DongengAnimalProcessor]::RemoveGreen($sourceBitmap)
  try {
    $transparent.Save((Join-Path $outputPath "animal-parade.png"), [System.Drawing.Imaging.ImageFormat]::Png)

    $animals = @(
      @{ Name = "deer";     Crop = [System.Drawing.Rectangle]::new(22, 82, 475, 650); Height = 300 },
      @{ Name = "rabbit";   Crop = [System.Drawing.Rectangle]::new(525, 170, 420, 560); Height = 280 },
      @{ Name = "fox";      Crop = [System.Drawing.Rectangle]::new(950, 135, 510, 600); Height = 290 },
      @{ Name = "hedgehog"; Crop = [System.Drawing.Rectangle]::new(1450, 292, 375, 440); Height = 250 }
    )

    foreach ($animal in $animals) {
      $destination = Join-Path $outputPath ("animal-{0}.png" -f $animal.Name)
      [DongengAnimalProcessor]::SaveCrop($transparent, $animal.Crop, $destination, $animal.Height)
    }
  }
  finally {
    $transparent.Dispose()
  }
}
finally {
  $sourceBitmap.Dispose()
}
