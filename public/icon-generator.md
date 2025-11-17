# PWA Icon Generator

To create the required PWA icons, you can use any image editor or online tool:

## Required Icons:
- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels

## Quick Generation:

### Using ImageMagick (if installed):
```bash
# Create a simple Android-themed icon
convert -size 192x192 xc:#3DDC84 -gravity center -pointsize 72 -fill white -annotate +0+0 "A" icon-192.png
convert -size 512x512 xc:#3DDC84 -gravity center -pointsize 192 -fill white -annotate +0+0 "A" icon-512.png
```

### Using Online Tools:
1. Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512 source image
3. Generate all required sizes
4. Download and place in `/public` folder

### Manual Creation:
Create icons with:
- Background: #3DDC84 (Android green)
- Foreground: White "A" or Android robot icon
- Size: 192x192 and 512x512 pixels
- Format: PNG with transparency support

## Temporary Placeholder:
For now, you can use any 192x192 and 512x512 PNG images as placeholders.
The app will work without icons, but they enhance the PWA experience.

