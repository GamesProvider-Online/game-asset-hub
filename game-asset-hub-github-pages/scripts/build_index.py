from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ROOT / "data.json"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
IGNORE = {"provider-logo.png", "provider-logo.jpg", "provider-logo.jpeg", "provider-logo.webp", "logo.png", "logo.jpg", "logo.jpeg", "logo.webp"}

rows=[]
if ASSETS.exists():
    for p in sorted(ASSETS.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in IMAGE_EXTS or p.name.lower() in IGNORE:
            continue
        rel = p.relative_to(ROOT).as_posix()
        parts = p.relative_to(ASSETS).parts
        if len(parts) < 2:
            continue
        provider = parts[0]
        category = parts[1] if len(parts) > 2 else "Games"
        rows.append({
            "provider": provider,
            "category": category,
            "name": p.stem,
            "path": rel,
        })
OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Indexed {len(rows)} image assets")
