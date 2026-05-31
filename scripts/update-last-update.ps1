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

$bytes = [System.IO.File]::ReadAllBytes($scriptJs)
$encoding = $null

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$candidateEncodings = @(
    $utf8Bom,
    $utf8NoBom,
    [System.Text.Encoding]::Unicode,
    [System.Text.Encoding]::BigEndianUnicode,
    [System.Text.Encoding]::Default
)

$pattern = "\u6570\u636e\u66f4\u65b0\u65f6\u95f4[:\uFF1A]\s*\d{4}-\d{2}-\d{2}"
$content = $null

foreach ($enc in $candidateEncodings) {
    try {
        $probe = $enc.GetString($bytes)
        if ($probe -match $pattern) {
            $encoding = $enc
            $content = $probe
            break
        }
    } catch {
        continue
    }
}

if (-not $encoding) {
    $encoding = $utf8NoBom
    $content = $encoding.GetString($bytes)
}
$replacement = "\u6570\u636e\u66f4\u65b0\u65f6\u95f4: $date"

if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    [System.IO.File]::WriteAllText($scriptJs, $content, $encoding)
    Write-Host "Updated script.js date to $date"
} else {
    Write-Host "Pattern not found in script.js, skip."
}
