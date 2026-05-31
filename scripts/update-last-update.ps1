$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptJs = Join-Path $repoRoot "script.js"
$dataJs = Join-Path $repoRoot "data.js"

if (!(Test-Path $dataJs)) {
    Write-Host "data.js not found, skip."
    exit 0
}

if (!(Test-Path $scriptJs)) {
    Write-Host "script.js not found, skip."
    exit 0
}

$last = (Get-Item $dataJs).LastWriteTime
$date = $last.ToString("yyyy-MM-dd")

$content = Get-Content $scriptJs -Raw -Encoding UTF8
$pattern = "数据更新时间:\s*\d{4}-\d{2}-\d{2}"
$replacement = "数据更新时间: $date"

if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    Set-Content $scriptJs -Value $content -Encoding UTF8
    Write-Host "Updated script.js date to $date"
} else {
    Write-Host "Pattern not found in script.js, skip."
}
