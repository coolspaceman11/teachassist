# Run this only if you previously installed the Apple Foundation Models patch.
$appleModule = Join-Path $PSScriptRoot "modules\apple-foundation-models"

if (Test-Path $appleModule) {
    Remove-Item -Recurse -Force $appleModule
    Write-Host "Removed old Apple Foundation Models native module."
} else {
    Write-Host "No Apple Foundation Models module found. Nothing to remove."
}
