# Image to GIF Vencord plugin

This user plugin adds a **Convert to GIF** action to the hover toolbar on each
queued PNG, JPG/JPEG, or WebP image. Click that image's toolbar action to convert
it locally. The converted GIF is placed in Discord's composer for you to review
and send using Discord's normal send button. The generated GIF is a single
frame, so it changes the image format but does not animate the picture.

## Install (Windows)

1. Double-click `Install-ImgToGif.cmd`.
   
3. The installer looks for your Vencord checkout at
   `%USERPROFILE%\Vencord`. If yours is elsewhere, run this in PowerShell:

   ```powershell
   .\Install-ImgToGif.ps1 -VencordPath "C:\path\to\Vencord"
   ```

4. It copies the plugin into `src\userplugins\imgToGif`, backs up a different
   existing plugin file, then builds Vencord. It asks whether to inject the
   build into Discord; answer **y** to run Vencord's injector.
5. Restart Discord, open **User Settings → Vencord → Plugins**, and enable
   **imgToGif**.

To preview what it would do without changing files, run
`.\Install-ImgToGif.ps1 -WhatIf`.

(IMPORTANT: Keep `Install-ImgToGif.cmd`, `Install-ImgToGif.ps1`, and the `src` folder together, because without that the installer WILL not work!)

And maybe i will add support for video files too.

Screenshots

<img width="302" height="92" alt="image" src="https://github.com/user-attachments/assets/b93d5c62-fad8-446f-9667-9f1f4eef5f53" />
  
<img width="286" height="144" alt="image" src="https://github.com/user-attachments/assets/e304f6ad-6346-4a03-b037-13954488c27f" />

