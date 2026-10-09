[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string] $VencordPath
)

$ErrorActionPreference = "Stop"

function Resolve-VencordPath {
    param([string] $RequestedPath)

    $candidate = if ($RequestedPath) {
        $RequestedPath
    } else {
        Join-Path $env:USERPROFILE "Vencord"
    }

    $resolved = Resolve-Path -LiteralPath $candidate -ErrorAction SilentlyContinue
    if (-not $resolved) {
        throw "Vencord source folder not found at '$candidate'. Run with -VencordPath 'C:\path\to\Vencord'."
    }

    $root = $resolved.Path
    $manifestPath = Join-Path $root "package.json"
    $pluginsPath = Join-Path $root "src\plugins"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $pluginsPath -PathType Container)) {
        throw "'$root' does not look like a Vencord source checkout."
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.name -ne "vencord") {
        throw "'$root' is not a Vencord checkout (package name is '$($manifest.name)')."
    }

    return $root
}

try {
    $sourceFile = Join-Path $PSScriptRoot "src\userplugins\imgToGif\index.tsx"
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
        throw "Plugin source was not found at '$sourceFile'. Keep this installer beside the src folder."
    }

    $root = Resolve-VencordPath -RequestedPath $VencordPath
    $destinationDirectory = Join-Path $root "src\userplugins\imgToGif"
    $destinationFile = Join-Path $destinationDirectory "index.tsx"

    if (-not (Test-Path -LiteralPath $destinationDirectory -PathType Container)) {
        if ($PSCmdlet.ShouldProcess($destinationDirectory, "Create Vencord user plugin folder")) {
            New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        }
    }

    if (Test-Path -LiteralPath $destinationFile -PathType Leaf) {
        $sourceHash = (Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash
        $destinationHash = (Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256).Hash
        if ($sourceHash -ne $destinationHash) {
            $backupFile = "$destinationFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            if ($PSCmdlet.ShouldProcess($destinationFile, "Back up existing plugin to '$backupFile'")) {
                Copy-Item -LiteralPath $destinationFile -Destination $backupFile
                Write-Host "Backed up the existing plugin to $backupFile"
            }
        } else {
            Write-Host "The Vencord checkout already has the latest plugin source."
        }
    }

    if ($PSCmdlet.ShouldProcess($destinationFile, "Install imgToGif plugin")) {
        Copy-Item -LiteralPath $sourceFile -Destination $destinationFile -Force
        Write-Host "Installed plugin source to $destinationFile"
    }

    if ($WhatIfPreference) {
        Write-Host "WhatIf mode: no files were changed and no build was run."
        exit 0
    }

    $corepack = Get-Command "corepack.cmd" -ErrorAction SilentlyContinue
    if (-not $corepack) {
        $corepack = Get-Command "corepack" -ErrorAction SilentlyContinue
    }
    if (-not $corepack) {
        throw "Corepack was not found. Install Node.js 22 or newer, then run this installer again."
    }

    Write-Host "Building Vencord. This may take a minute..."
    Push-Location -LiteralPath $root
    try {
        & $corepack.Source pnpm build
        if ($LASTEXITCODE -ne 0) {
            throw "Vencord build failed with exit code $LASTEXITCODE. Fix the build error and rerun this installer."
        }
    } finally {
        Pop-Location
    }

    $installNow = Read-Host "Install the built Vencord into Discord now? This may require administrator permission (y/N)"
    if ($installNow -match "^(y|yes)$") {
        Push-Location -LiteralPath $root
        try {
            & $corepack.Source pnpm inject
            if ($LASTEXITCODE -ne 0) {
                throw "Vencord injection failed with exit code $LASTEXITCODE. The plugin source and build are still installed."
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "Build complete. Run 'corepack pnpm inject' from '$root' when you want to install it into Discord."
    }

    Write-Host "Done. Restart Discord, then enable imgToGif under User Settings > Vencord > Plugins."
} catch {
    Write-Error $_
    exit 1
}
