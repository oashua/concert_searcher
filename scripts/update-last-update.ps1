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

if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $encoding = New-Object System.Text.UTF8Encoding($true)
} elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    $encoding = [System.Text.Encoding]::Unicode
} elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
    $encoding = [System.Text.Encoding]::BigEndianUnicode
} else {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    try {
        $probe = $utf8NoBom.GetString($bytes)
        $roundtrip = $utf8NoBom.GetBytes($probe)
        if ($roundtrip.Length -eq $bytes.Length) {
            $encoding = $utf8NoBom
        } else {
            $encoding = [System.Text.Encoding]::Default
        }
    } catch {
        $encoding = [System.Text.Encoding]::Default
    }
}

$content = $encoding.GetString($bytes)
$pattern = "数据更新时间:\s*\d{4}-\d{2}-\d{2}"
$replacement = "数据更新时间: $date"

if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    [System.IO.File]::WriteAllText($scriptJs, $content, $encoding)
    Write-Host "Updated script.js date to $date"
} else {
    Write-Host "Pattern not found in script.js, skip."
}
