# cleanup_ref_preview_script_tags.ps1
# ------------------------------------
# Removes per-page <script src="/js/ref-preview.js"></script> lines
# from all .html files under C:\dev\website.
#
# Why: ref-preview.js is now loaded site-wide via _layouts/default.html,
# so the per-page tags would cause double-loading.
#
# Run from PowerShell in C:\dev\website:
#     .\cleanup_ref_preview_script_tags.ps1
#
# Use -DryRun to preview changes without writing:
#     .\cleanup_ref_preview_script_tags.ps1 -DryRun

param(
    [switch]$DryRun = $false
)

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

Write-Host "Scanning for .html files under: $root" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN] No files will be modified." -ForegroundColor Yellow
}

# Match the script tag with optional whitespace and version query string.
# Matches lines like:
#   <script src="/js/ref-preview.js"></script>
#   <script src="/js/ref-preview.js?v=1.2"></script>
# (with leading whitespace which we also strip)
$pattern = '(?m)^[ \t]*<script\s+src="/js/ref-preview\.js(\?[^"]*)?"\s*></script>\s*\r?\n?'

$files = Get-ChildItem -Path $root -Recurse -Filter '*.html' -File `
    | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\_site\\' }

$totalFiles = 0
$modifiedFiles = 0
$totalRemovals = 0

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    if ([string]::IsNullOrEmpty($content)) { continue }

    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -eq 0) { continue }

    $newContent = [regex]::Replace($content, $pattern, '')
    $removals = $matches.Count
    $totalRemovals += $removals
    $modifiedFiles++

    $relPath = $file.FullName.Substring($root.Length).TrimStart('\')
    Write-Host ("  {0,3} removal(s) in {1}" -f $removals, $relPath)

    if (-not $DryRun) {
        # Preserve UTF-8 without BOM (Jekyll-friendly)
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($file.FullName, $newContent, $utf8NoBom)
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Green
Write-Host "  Files scanned:  $totalFiles"
Write-Host "  Files modified: $modifiedFiles"
Write-Host "  Tags removed:   $totalRemovals"
if ($DryRun) {
    Write-Host "  (dry run — no files were written)" -ForegroundColor Yellow
}
