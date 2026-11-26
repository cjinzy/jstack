#!/usr/bin/env python3
"""UserPromptSubmit: ambition 모드 계획 진입.

    prompt 에 단어 "ambition"/"앰비션"  → LOAD (모드 무관, 묻지 않음)
    permission_mode == "plan"           → ASK  (이 대화에서 미결정일 때만 사용자에게 묻기)
    그 외                               → 출력 없음

경로·파일명 속 ambition(`hooks/ambition_plan.py`, `ambition.md`)은 단어가 아니다.
어떤 오류에도 출력 없이 종료한다 — 이 hook 이 프롬프트를 막으면 안 된다.
"""

from __future__ import annotations

import json
import re
import sys

# 경계는 ASCII 로만 본다 — \b 는 한글도 단어 문자라 "ambition으로" 를 놓친다.
KEYWORD = re.compile(
    r"(?<![A-Za-z0-9_.])(?<!\S/)"  # 앞: 영문·숫자·_·. 또는 경로 속 / 가 아님 ("/ambition" 은 허용)
    r"(?:ambition|앰비션)"
    r"(?![A-Za-z0-9_/]|\.[A-Za-z0-9_])",  # 뒤: 영문·숫자·_·/ 또는 확장자가 아님 (문장 끝 . 허용)
    re.IGNORECASE,
)
PLAN_MODE = "plan"
SKILL = "jstack:ambition"  # 세 축 단일 스킬 — 목록 1칸, compaction 때 본문째 재부착

LOAD = (
    "[jstack] Ambition 모드: 계획 작성 전에 Skill 도구로 "
    + SKILL
    + " 을 로드하고 지침을 따른다. 계획에 `## Ambition` 섹션"
    "(적용한 축마다 한 항목, 해당 없으면 `N/A — 이유`)과 `## Slice` 섹션을 넣는다."
)
ASK = (
    "[jstack] plan 모드: 이 대화에서 아직 정하지 않았다면 계획을 시작하기 전에 "
    "AskUserQuestion 으로 'ambition 모드(" + SKILL + " 적용, 계획에 `## Ambition`·"
    "`## Slice` 섹션)로 계획할까요?' 를 묻는다. 예 → 그 스킬을 Skill 도구로 로드하고 "
    "따른다. 아니오 → 일반 계획. 이미 정했으면 그 결정을 따른다."
)


def context_for(prompt: str, mode: str) -> str | None:
    """주입할 지시. 대상이 아니면 None."""
    if KEYWORD.search(prompt):
        return LOAD
    if mode == PLAN_MODE:
        return ASK
    return None


def main() -> None:
    try:
        data = json.loads(sys.stdin.read())
        context = context_for(data.get("prompt", ""), data.get("permission_mode", ""))
    except Exception as e:  # noqa: BLE001 — 프롬프트를 막지 않기 위해 전부 삼킨다
        print(f"[jstack] ambition_plan skipped: {e!r}", file=sys.stderr)
        return
    if context:
        output = {
            "hookSpecificOutput": {
                "hookEventName": "UserPromptSubmit",
                "additionalContext": context,
            }
        }
        print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
