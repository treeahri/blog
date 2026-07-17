#!/usr/bin/env python3
"""패치(텍스트 변경분)를 blog-image 저장소의 drafts/current.json에 병합해 커밋한다.

사용법:
    python3 write_patch.py <patch.json>

patch.json 형식:
{
  "form": { "restaurantName": "...", ... },            # 갱신할 필드만
  "photoCaptions": { "<photo id>": {"caption": "...", "role": "hero"}, ... }
}

원격 photos[].dataUrl(원본 사진)은 그대로 유지하고, form과 photos의 caption/role만 갱신한다.
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


def api_url(cfg: dict, path: str) -> str:
    return f"https://api.github.com/repos/{cfg['owner']}/{cfg['repo']}/contents/{path}"


def auth_headers(cfg: dict) -> dict:
    return {
        "Authorization": f"Bearer {cfg['token']}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_draft(cfg: dict) -> tuple[dict, str]:
    req = urllib.request.Request(api_url(cfg, DRAFT_PATH), headers=auth_headers(cfg))
    try:
        with urllib.request.urlopen(req) as res:
            body = json.load(res)
    except urllib.error.HTTPError as e:
        die(f"drafts/current.json을 불러오지 못했어요 ({e.code}) — 앱에서 먼저 '초안 저장'을 했는지 확인하세요.")
    content = base64.b64decode(body["content"]).decode("utf-8")
    return json.loads(content), body["sha"]


def put_draft(cfg: dict, draft: dict, sha: str, message: str) -> None:
    payload = json.dumps(draft, ensure_ascii=False).encode("utf-8")
    body = {
        "message": message,
        "content": base64.b64encode(payload).decode(),
        "sha": sha,
    }
    req = urllib.request.Request(
        api_url(cfg, DRAFT_PATH), data=json.dumps(body).encode(), method="PUT", headers=auth_headers(cfg)
    )
    try:
        with urllib.request.urlopen(req) as res:
            json.load(res)
    except urllib.error.HTTPError as e:
        die(f"커밋 실패 ({e.code}) — {e.read().decode()[:300]}")


def main() -> None:
    if len(sys.argv) != 2:
        die("사용법: write_patch.py <patch.json>")
    if not CONFIG_PATH.exists():
        die(f"{CONFIG_PATH} 가 없습니다. config.local.json.example을 복사해 채워주세요.")
    cfg = json.loads(CONFIG_PATH.read_text())
    for key in ("owner", "repo", "token"):
        if not cfg.get(key):
            die(f"config.local.json에 {key} 가 비어 있습니다.")

    patch_path = Path(sys.argv[1])
    if not patch_path.exists():
        die(f"파일 없음: {patch_path}")
    patch = json.loads(patch_path.read_text())

    draft, sha = get_draft(cfg)

    draft.setdefault("form", {}).update(patch.get("form", {}))

    photo_patch = patch.get("photoCaptions", {})
    matched = set()
    for photo in draft.get("photos", []):
        upd = photo_patch.get(photo["id"])
        if not upd:
            continue
        if "caption" in upd:
            photo["caption"] = upd["caption"]
        if "role" in upd:
            photo["role"] = upd["role"]
        matched.add(photo["id"])
    missing = set(photo_patch) - matched
    if missing:
        print(f"경고: patch에 있지만 원격 초안에 없는 photo id: {sorted(missing)}", file=sys.stderr)

    body_text = "\n".join(
        filter(
            None,
            [
                draft["form"].get("intro", ""),
                draft["form"].get("menuNote", ""),
                draft["form"].get("summary", ""),
                *[p.get("caption", "") for p in draft.get("photos", [])],
            ],
        )
    )
    print(f"본문 글자수(공백 포함, 해시태그 제외): {len(body_text)}자")

    put_draft(cfg, draft, sha, f"후기 완성: {draft['form'].get('restaurantName', '')}")
    print("drafts/current.json 갱신 완료 — 앱에서 '초안 불러오기'를 눌러 확인하세요.")


if __name__ == "__main__":
    main()
