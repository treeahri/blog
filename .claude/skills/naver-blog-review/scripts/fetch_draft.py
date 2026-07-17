#!/usr/bin/env python3
"""blog-image 저장소의 drafts/current.json을 받아 로컬에 저장하고 요약을 출력한다.

사용법:
    python3 fetch_draft.py [출력경로.json]
기본 출력 경로: <스킬폴더>/output/draft_fetched.json
"""
import base64
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = SKILL_DIR / "config.local.json"
DRAFT_PATH = "drafts/current.json"


def die(msg: str) -> None:
    print(f"오류: {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if not CONFIG_PATH.exists():
        die(f"{CONFIG_PATH} 가 없습니다. config.local.json.example을 복사해 채워주세요.")
    cfg = json.loads(CONFIG_PATH.read_text())
    for key in ("owner", "repo", "token"):
        if not cfg.get(key):
            die(f"config.local.json에 {key} 가 비어 있습니다.")

    url = f"https://api.github.com/repos/{cfg['owner']}/{cfg['repo']}/contents/{DRAFT_PATH}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {cfg['token']}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req) as res:
            body = json.load(res)
    except urllib.error.HTTPError as e:
        die(f"불러오기 실패 ({e.code}) — 앱에서 먼저 '초안 저장'을 했는지 확인하세요.")
    draft = json.loads(base64.b64decode(body["content"]).decode("utf-8"))

    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else SKILL_DIR / "output" / "draft_fetched.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(draft, ensure_ascii=False, indent=2))

    form = draft.get("form", {})
    print(f"저장 위치: {out_path}")
    print(f"장소: {form.get('restaurantName') or '(없음)'}")
    print(f"방문: {form.get('visitYear')}년 {form.get('visitMonth')}월")
    print("--- form ---")
    for k, v in form.items():
        if k in ("restaurantName", "visitYear", "visitMonth"):
            continue
        preview = (v[:80] + "…") if v and len(v) > 80 else v
        print(f"{k}: {preview or '(비어있음)'}")
    photos = draft.get("photos", [])
    print(f"--- photos ({len(photos)}) ---")
    for p in photos:
        print(f"{p['id']}  role={p.get('role')}  caption={p.get('caption') or '(없음)'}")


if __name__ == "__main__":
    main()
