from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    script_js = repo_root / "script.js"
    data_js = repo_root / "data.js"

    if not data_js.exists():
        print("data.js not found, skip.")
        return 0
    if not script_js.exists():
        print("script.js not found, skip.")
        return 0

    date_str = datetime.fromtimestamp(data_js.stat().st_mtime).strftime("%Y-%m-%d")

    content = script_js.read_text(encoding="utf-8")
    pattern = re.compile(r"updateDiv\.textContent\s*=\s*([`\"']).*?\1\s*;", re.S)
    replacement = f"updateDiv.textContent = `数据更新时间: {date_str}`;"

    if pattern.search(content):
        content = pattern.sub(replacement, content, count=1)
        script_js.write_text(content, encoding="utf-8")
        print(f"Updated script.js date to {date_str}")
    else:
        print("Pattern not found in script.js, skip.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
