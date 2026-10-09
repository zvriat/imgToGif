# Image to GIF Vencord plugin

This user plugin adds a **Convert to GIF** action to the hover toolbar on each
queued PNG, JPG/JPEG, or WebP image. Click that image's toolbar action to convert
it locally. The converted GIF is placed in Discord's composer for you to review
and send using Discord's normal send button. The generated GIF is a single
frame, so it changes the image format but does not animate the picture.

## Install (Windows)

1. Keep `Install-ImgToGif.cmd`, `Install-ImgToGif.ps1`, and the `src` folder
   together. Double-click `Install-ImgToGif.cmd`.
2. The installer looks for your Vencord checkout at
   `%USERPROFILE%\Vencord`. If yours is elsewhere, run this in PowerShell:

   ```powershell
   .\Install-ImgToGif.ps1 -VencordPath "D:\path\to\Vencord"
   ```

3. It copies the plugin into `src\userplugins\imgToGif`, backs up a different
   existing plugin file, then builds Vencord. It asks whether to inject the
   build into Discord; answer **y** to run Vencord's injector.
4. Restart Discord, open **User Settings → Vencord → Plugins**, and enable
   **imgToGif**.

To preview what it would do without changing files, run
`.\Install-ImgToGif.ps1 -WhatIf`.

The plugin uses Vencord's bundled `gifenc` dependency and requires no external
services or separate package installation.
