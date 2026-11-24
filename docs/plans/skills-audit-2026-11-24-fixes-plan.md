# 스킬 감사 수정 계획 (2026-11-24, v6.3.3)

근거: `docs/audit/skills-audit-2026-11-24.md`. 범위·정책은 사용자 확인 완료.

## 결정

| 항목 | 결정 |
|---|---|
| 범위 | 문서·메타 불일치 + H1 + Med + Low 코드 버그. 버그는 실패 테스트 먼저 |
| M4 pane blocked | 사용자가 고른 답만 `herdr agent send-keys` 로 입력. 오케스트레이터 임의 답 금지 유지 |
| M8 보안 설정 | `enableAllProjectMcpServers`·`skipDangerousModePermissionPrompt` 는 없을 때만 기본값 + 동의 문구에 위험 한 줄 |
| M9 | `outputStyle` 기본값 제거 |
| 삭제 | `scripts/tmux-usage.sh`, claude-init Step 5 `setup_mcp_and_teams.py`+테스트, `scripts/test_install_timer.sh`, `plugins/jstack/settings.json` |
| 보류 | M7(plan 모드 pane, 미실측), M14(codex 샌드박스 읽기 범위, 미검증), M16(BAD_PATH 경고 — 기능 추가), 이중 clone, dev 테스트 배포 위치, `${CLAUDE_SKILL_DIR}/../` 교차 호출, commit 자동 호출, codex effort enum, onboard `plugin update` 경고 |

## 분담

| 담당 | 파일 |
|---|---|
| 에이전트 A | `skills/claude-init/`, `hooks/`, `scripts/`, `settings.json` |
| 에이전트 B | `skills/sot-create/`, `skills/sot-verify/`, `skills/deepinit/` |
| 에이전트 C | `skills/codex-side/`, `skills/cleanser/`, `skills/commit/` |
| 직접 | `skills/maestro/`, `skills/manage-skills/`, `skills/onboard/`, `docs/skills*.md`, `README*.md`, `plugin.json`, `marketplace.json`, `tests/` |

마무리: 전체 테스트 재실행 + `claude plugin validate .` + 한/영 diff → 보고서에 반영 여부 표기 → 커밋 `(v6.3.3)`.

## Ambition
- Altitude: 사다리 — 감사 지적 수정 → 6.3.3 배포본 문서·코드 불일치 0 → 불일치가 생기면 테스트가 잡음. 범위는 사용자가 이미 정함(첫 단 + Low 코드 버그) — 다시 묻지 않음.
- Depth: 외부 판정자 = 실패→통과 테스트, `claude plugin validate`, 외부 CLI `--help`(herdr·codex). 반증할 가정: "버전 정렬 버그는 이론상" → tmp 캐시 `6.3.9`/`6.3.10` 으로 재현.
- Range: N/A — 플러그인 유지보수, 분야 명확.
