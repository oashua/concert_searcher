#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
script_js="$repo_root/script.js"
data_js="$repo_root/data.js"

if [[ ! -f "$data_js" ]]; then
  echo "data.js not found, skip."
  exit 0
fi

if [[ ! -f "$script_js" ]]; then
  echo "script.js not found, skip."
  exit 0
fi

if command -v stat >/dev/null 2>&1; then
  if stat --version >/dev/null 2>&1; then
    last_ts=$(stat -c %Y "$data_js")
  else
    last_ts=$(stat -f %m "$data_js")
  fi
else
  echo "stat not found, skip."
  exit 0
fi

if command -v date >/dev/null 2>&1; then
  if date -d @0 >/dev/null 2>&1; then
    date_str=$(date -d "@$last_ts" +%Y-%m-%d)
  else
    date_str=$(date -r "$last_ts" +%Y-%m-%d)
  fi
else
  echo "date not found, skip."
  exit 0
fi

pattern='updateDiv\.textContent[[:space:]]*=[[:space:]]*([`"'"']).*?\1[[:space:]]*;'
replacement="updateDiv.textContent = \\`数据更新时间: ${date_str}\\`;"

if grep -E "updateDiv\.textContent" -n "$script_js" >/dev/null 2>&1; then
  perl -0777 -i -pe "s/${pattern}/${replacement}/s" "$script_js"
  echo "Updated script.js date to $date_str"
else
  echo "Pattern not found in script.js, skip."
fi
