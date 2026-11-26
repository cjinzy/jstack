# 브랜치 스킬 감사 (2026-11-26, v7.0.0 미배포)

대상: `jin/skills-investigate-stress-review` 변경분 — stress-review(신규, codex 전용) · ambition 쪼개기 · statusline · SessionStart hook · claude-init · onboard · docs·README·버전. 읽기 전용 에이전트 2개 병렬.
기준: 지난 감사(`skills-audit-2026-11-24.md`)·c5a36e3 회귀, SKILL.md ↔ 스크립트 ↔ `docs/skills*.md` 일치, `codex --help`(0.162.1) 대조, 테스트 실행.

**회귀**: 없음. challenge.md·consult.md 는 main codex-side 와 동일, c5a36e3 의 codex 수정 전부 유지. statusline 기본값·init 보안 키·onboard 인자 유지.
**테스트**: `pytest plugins/jstack` 295 · `tests/`(skills 제외) 72 · `test_statusline.sh` 22 · stress-review 22 통과. `claude plugin validate .` 통과. 3.9: session_init·ambition_plan·codex_run import OK. 버전 7.0.0 5곳 일치, codex-side 흔적 0.

## High
없음.

## Med — stress-review
| # | 위치 | 문제 | 근거 |
|---|---|---|---|
| S-M1 | `codex_run.py:47,54` | 게이트 거짓 PASS — P2/P3 태그가 있으면 `P1로`·`P1급`(한글 붙음)·`[p1]`(소문자) 를 놓침. `\b` 가 한글을 단어 문자로 보고 정규식이 대소문자 구분 | 재현: `[P2] 오타\n### P1급 문제` → PASS |
| S-M2 | `SKILL.md:64,104`, `review.md:22,26` (main 상속) | 자동 감지 BASE 미검증 — origin 기본 브랜치 이름의 `$(…)` 가 `--base "<BASE>"`·대체 서브에이전트의 `git diff` 에서 실행됨 | 재현: `m$(id>PWNED)` 브랜치 → PWNED 생성 |
| S-M3 | `SKILL.md:103,113` | 작업 트리 확인 사각: 이미 수정된 파일 재수정·gitignore 파일·저장소 밖. 미커밋 리뷰(DIRTY>0) 때 정확히 해당 | 재현: 수정 파일 재수정 → porcelain diff 없음 |
| S-M4 | `SKILL.md:104` vs `review.md:15-24,38` | 기본 review(A) 대체 시 서브에이전트 프롬프트 없음 — [P0]–[P3] 태그 지시는 B 에만 → 게이트 UNVERIFIED 또는 즉석 프롬프트 | 코드 줄 |
| S-M5 | `review.md:36` vs `SKILL.md:79`, `review.md:11` (상속) | focus(B) 프롬프트가 `git diff <BASE>...HEAD` + `git diff HEAD` 고정 — "미커밋 변경만" 선택 무시, `--commit`+focus 경로 없음 | 코드 줄 (challenge.md:5 엔 범위별 지시 있음) |

## Med — 나머지
| # | 위치 | 문제 | 근거 |
|---|---|---|---|
| R-M1 | `ambition/SKILL.md:3,4,13,17` | description 에 "쪼개기·조각·slice" 트리거가 있으나 Slice 만 하는 경로 없음 — `slice` 인자 미정의, 쪼개기 요청도 세 축 전부(plan 모드 + 질문 2회) | 코드 줄 |
| R-M2 | `claude-init/scripts/merge_settings.py:97`, `claude-init/SKILL.md:89` | init 재실행이 옛 `statusLine.refreshInterval: 1` 을 못 지움 (깊은 병합, 문서는 "덮어씀"). hook 안 도는 환경은 매초 실행 지속 | 재현: 가짜 HOME |
| R-M3 | `hooks/ambition_plan.py:17,36` (기존 동작) | 부분 문자열 매칭 — 경로·다른 단어의 "ambition" 에도 LOAD → plan 모드·Slice 강제 | 재현: "…/ambition_plan.py 오타 고쳐줘" → LOAD |

## Low
| # | 위치 | 문제 |
|---|---|---|
| S-L1 | `codex_run.py:56` | 한도 문구 1개만 — "You've reached your usage limit"·"Quota exceeded" 는 failed (fail-closed) |
| S-L2 | `SKILL.md:156` | timeout 행 "540초" 고정, `--timeout 1800` 과 불일치 |
| S-L3 | `README.md:20`·`.en.md:20` | 대체 조건 2개만 (SKILL.md·docs 는 3개) |
| S-L4 | `consult.md:46,52` | SESSION_ID 형식 검증 없음 (`codex_run.py:87`), 셸 인자로 들어감 |
| S-L5 | `SKILL.md:33` | `codex --version` 실패도 `CODEX: missing` → 중단 대신 대체 |
| S-L6 | `docs/skills*.md:220` | 인증 실패를 "리뷰 FAIL" 이라 함 — 실제는 사전 점검 중단 |
| S-L7 | `SKILL.md:103,148` | rate_limited 흐름이 D 를 2개 만들고 정리는 1개 |
| S-L8 | `SKILL.md:104` | 미커밋 대체 검토가 `git diff HEAD` — untracked 빠짐 (codex `--uncommitted` 는 포함) |
| R-L1 | `session_init.py:140,142` | "6.4.5" 주석 — 미배포 버전 (6.4.4 → 7.0.0) |
| R-L2 | `session_init.py:151` | `True == 1` → `refreshInterval: true` 도 삭제 |
| R-L3 | `docs/skills*.md:81` | 트리거 목록에 "쪼개기·조각·slice" 없음 |
| R-L4 | `ambition_plan.py:21-31` | LOAD·ASK 문구에 `## Slice` 없음 |
| R-L5 | `onboard/SKILL.md:33`, `README*.md:37` | "Codex 못 쓰면 Claude 서브에이전트" 과장 — 인증 없음은 중단 |
| R-L6 | `session_init.py:114-116` | 경고 문구 "removed failed", traceback 없음 |
| R-L7 | README Statusline 절 | 옛 `⏱` 스크립트는 init 재실행 전까지 멈춘 시간 표시 — 안내는 커밋 본문에만 |
| R-L8 | hooks·merge_settings | ruff E501 13건 (base 도 실패) |
| R-L9 | claude-init scripts | 3.9 import 실패 — 알려진 범위 밖 |

## 미검증
- codex: `--base`+PROMPT 동시 사용 거부 여부(전송 위험으로 미실행) · `-c sandbox_mode` 와 사용자 profile 의 permission 설정 충돌 · `OPENAI_API_KEY` 만으로 exec 인증(바이너리엔 `CODEX_API_KEY`) · exec 가 "reached your usage limit"·"Quota exceeded" 를 turn.failed 로 내는지 · `exec review --json` 본문 출력 위치.
- Claude Code: `claude -p` 의 AskUserQuestion 실패 형태·인자 없는 모드 선택 · 백그라운드 Agent 일 때 Read 가 Write 보다 먼저 실행될 가능성 · 하위 모드 파일의 `${CLAUDE_SKILL_DIR}` 비치환 전제.
- ambition: "쪼개기·slice" 가 흔한 말이라 무관한 요청에 로드될 가능성 · Slice 규칙 2 의 라이브러리(함수 API 입구) 경계.
- session_init: tmp 이름 고정 동시 시작 경합 · 읽기~쓰기 사이 Claude Code 의 쓰기 유실 · tmp 를 0644 로 만든 뒤 copymode (600 파일 잠깐 노출) — main 부터 같은 패턴.

## 조치 (v7.0.0)
결정: 사용자 — 25건 전부 수정. R-M1 은 트리거 삭제(slice 인자 경로 없음), S-L1 은 감지 문구만 추가. 버그는 실패 테스트 먼저.

- **수정**: Med 8 · Low 17 전부.
  - stress-review — S-M1 게이트 경계를 ASCII 영숫자 lookaround 로, `[p1]`·태그 아닌 P0/P1 언급은 대소문자 무시. S-M2 자동 감지 BASE 를 Step 1 블록에서 같은 패턴으로 검사. S-M3 스냅샷 = `git status --porcelain -uall` + `git diff HEAD` 해시. S-M4·S-M5·S-L8 review.md 범위 줄 3종(브랜치 / 미커밋 + untracked / 커밋 `git show`)과 B 지시문을 대체 검토 공용으로, challenge 미커밋도 untracked 포함. S-L1 `reached your usage limit`(turn.failed·stderr), `quota exceeded`(turn.failed 만 — stderr 의 `Disk quota exceeded` 제외). S-L2 timeout 행 `--timeout` 값. S-L4 SESSION_ID 는 `[A-Za-z0-9][A-Za-z0-9-]*` 일 때만 출력 (맨 앞 `-` 는 resume 옵션으로 읽힘). S-L5 `CODEX: broken`. S-L7 이 실행의 D 전부 정리.
  - 나머지 — R-M1 ambition 트리거에서 쪼개기·조각·slice 삭제 (R-L3 해소, docs 에도 없음). R-M2 merge_settings 가 우리 command + 정수 1 이면 `refreshInterval` 제거, preflight 도 이를 settings missing 으로 봐 partial init 에서도 Step 4 가 돈다. R-M3 hook 키워드 ASCII 경계 + 경로·확장자 제외. R-L1 7.0.0. R-L2 bool 제외 (session_init·merge_settings·preflight). R-L4 LOAD·ASK 에 `## Slice`. R-L6 경고 문구 + traceback. R-L8 손댄 .py E501 63 → 0. R-L9 claude-init 스크립트 6개 `from __future__ import annotations`.
  - 문서 — S-L3·S-L6·R-L5·R-L7, R-M2·R-M3·S-L2 동기화 (README·docs/skills ko/en, onboard).
- **동작 변화**:
  - stress-review 사전 점검 중단 2개 추가: `CODEX: broken`(설치됐는데 `codex --version` 실패), `BASE: invalid`(origin 기본 브랜치 이름이 패턴 밖, 원값 미출력). 후자는 사용자가 base 를 주지 않으면 consult 포함 모든 모드를 멈춘다 — 비ASCII 기본 브랜치 저장소도.
  - 게이트: `P1급`·소문자 `p1` 언급 → UNVERIFIED, `[p1]` → FAIL. 소문자 `p1:`·`**p0**` 는 태그로 세지 않는다 (UNVERIFIED).
  - focus·대체 검토가 미커밋만·커밋 선택을 따르고, 미커밋 범위에 untracked 포함.
  - init 재실행이 옛 `statusLine.refreshInterval: 1` 을 지운다 (`true`·다른 값 보존).
  - ambition hook: 경로·파일명(`ambition_plan.py`, `skills/ambition/`, `ambition.md`)엔 로드 안 함. 산문 속 단어는 여전히 로드.
  - session_init stderr: `restore statusLine: done; backup …` / `warning: remove statusLine.refreshInterval failed: …` + traceback.
- **검증**: `pytest plugins/jstack` 364 · `tests/`(skills 제외) 72 · `test_statusline.sh` 22 통과 (HOME 임시). 손댄 .py 9개 ruff 전 규칙 통과. 3.9.6(`/usr/bin/python3`): hooks 2·codex_run·claude-init 6 import, claude-init·stress-review 테스트 282 통과. `claude plugin validate .` 통과, 버전 7.0.0 불변. headless: S4·S6 1회 PASS. S5 는 1회 FAIL → 5회 재측정 2/5 (이전 문구 41/41) — 회귀. 실패 3회 모두 첫 줄 `검토자: claude` 라벨을 산문으로 풀어 씀. 수정: 스냅샷 명령을 step 1·3 인라인으로 되돌려 대체 절을 줄이고, step 5 세 대안을 모두 `검토자: claude (…)` 로 적어 "글자 그대로" 쓰게 함 (기존엔 2·3번째가 괄호만) → S5 5/5. 합계 $6.57.
- **후속**: claude-init Step 5 session_init 설명에 statusLine 복원·옛 `refreshInterval: 1` 제거 반영. S6 a145c66 뒤 1회 PASS ($0.55).
- **남은 것**: 새 한도 문구 2개는 실측 아님 (RETRY_AT 없으면 첫 줄에서 생략).
