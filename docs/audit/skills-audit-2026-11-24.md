# 배포 스킬 감사 (2026-11-24, v6.3.3)

대상: `plugins/jstack/` 13개 스킬 + hooks·scripts·메타데이터. 읽기 전용 에이전트 4개 병렬 + High 직접 확인.
기준: 지난 감사(`skills-audit-2026-11-05.md`)·결정 1–16(`docs/plans/inconsistency-fixes-plan.md`) 회귀, SKILL.md ↔ 스크립트 ↔ `docs/skills*.md` 일치, 외부 CLI `--help` 대조(codex 0.162.1, herdr, claude 2.1.331), 테스트 실행.

**회귀**: 결정 1–16 전부 반영. 예외 1건 — 결정 9 의 sot-create 경로 인자가 `docs/skills*.md:144` 에 남음.
**테스트**: claude-init 179 · cleanser+codex-side 43 · sot-create+deepinit 39 · `test_install_timer.sh` 8 · `tests/` 67 통과(30 skip). `claude plugin validate .` 통과.

## High

| # | 위치 | 문제 | 근거 |
|---|---|---|---|
| H1 | claude-init `sync_repo.py:269`, `preflight.py:301` | 캐시 버전 디렉터리를 문자열 정렬 → `6.3.10` 이 나오면 최신을 지우고 `6.3.9` 를 남김. preflight 는 옛 hooks.json 을 읽음 | `key=lambda d: d.name`. tmp 에 6.9.0·6.10.0 → "구버전 캐시 제거: 6.10.0" |

## Med

| # | 위치 | 문제 | 근거 |
|---|---|---|---|
| M1 | cleanser `slop_patterns.py:332` | ruff 실패(rc=2)를 "깨끗합니다"로 보고 | 깨진 `pyproject.toml` 픽스처 |
| M2 | sot-create `sot_index.py:110` | 생성기가 쓰지 않은 기존 `sot/Index.md` 를 백업 없이 덮어씀. `sot/` 는 gitignore 라 복구 불가 | 손으로 쓴 Index.md → `wrote (0 docs)`. SKILL.md:285 "Do not overwrite existing `sot/` files" 와 충돌 |
| M3 | sot-create SKILL.md:191 | CLAUDE.md 가드가 루트 `CLAUDE.md` 의 정확히 `## SoT` 만 봄 → `.claude/CLAUDE.md`·`## SoT (Source of Truth)` 를 놓쳐 중복 블록 제안 | 이 저장소에서 가드 exit 1 |
| M4 | maestro SKILL.md:18,42 | pane `blocked` 때 사용자 답을 전달할 길 없음 (`agent prompt` 는 blocked 면 거부, `send-keys` 금지) | `herdr agent prompt --help` |
| M5 | maestro SKILL.md:40 | `prompt` 후 단독 `wait` → 제출 직후 idle 에 매칭돼 거짓 완료 가능 (의심) | herdr skill: 관측 게이트는 `prompt --wait` 에만 |
| M6 | maestro SKILL.md:40 | 브리프를 셸 큰따옴표로 넘김 → 백틱·`$` 치환 | `echo "\`echo X\`"` → `X` |
| M7 | maestro SKILL.md:39 + claude-init `merge_settings.py:32` | `defaultMode: plan` 이 pane 세션에도 적용 → ExitPlanMode 에서 blocked (의심) | 미실측 |
| M8 | claude-init `merge_settings.py:22` | `enableAllProjectMcpServers`·`skipDangerousModePermissionPrompt` 를 강제 덮어씀 → 신뢰 안 된 저장소 `.mcp.json` 서버가 승인 없이 실행. 동의 문구에 위험 없음 | `claude mcp list --help` 승인 단계 |
| M9 | claude-init `merge_settings.py:33` | `outputStyle: Explanatory` 가 필수 플러그인 i-have-adhd 와 충돌 → init 직후 Step 6 이 자기 충돌 보고 | `audit()` → `known:output-style` |
| M10 | `install-timer.sh:151` vs `session_init.py:104` | 등록 실패해도 plist·timer 파일이 남아 hook 이 재시도 안 함. 주석과 반대 | 가짜 launchctl → exit 5, plist 남음 |
| M11 | `plugins/jstack/settings.json` | 어디서도 안 쓰이고 적용도 안 됨(env 미반영). 내용은 merge_settings 와 어긋남 | 세션 env 에 `CLAUDE_CODE_EFFORT_LEVEL` 없음 |
| M12 | `scripts/test_install_timer.sh` | 대상 스크립트를 실행하지 않는 가짜 테스트. 스크립트를 지워도 8/8 통과 | 본문 |
| M13 | codex-side `review.md`·`challenge.md`·`consult.md` | 하위 파일의 `${CLAUDE_SKILL_DIR}` 는 치환 안 됨 (의심) | 치환은 SKILL.md 본문만 |
| M14 | codex-side `consult.md:10` vs SKILL.md:74,98 | "Codex 는 저장소 밖을 못 읽는다" vs BOUNDARY 가 `~/.claude/` 읽기 금지 지시. read-only 샌드박스 실제 범위 미검증 | 두 위치 모순 |
| M15 | `docs/skills*.md:144` | 결정 9 회귀: sot-create `[프로젝트 경로]` 인자 표기 잔존 | `git show d6c1e9c` |
| M16 | sot-create `sot_validate.py:91` | `verified_paths` 오타는 경고 없이 통과 → drift 영구 미검출 | `src/apii/` → ok |

## Low

| 영역 | 위치 | 문제 |
|---|---|---|
| 메타 | `plugin.json:4`, `marketplace.json:8,15` | "12 skills" → 실제 13. keywords 에 `tdd`(스킬 없음), linear·orchestration 없음 |
| sot | `sot_validate.py:94` | `verified_commit: --output=<p>` 가 git 옵션으로 해석돼 파일 생성 |
| sot | `sot_validate.py:61` | en dash 제목 미인식, 코드 펜스 안 `## XXX-NNN —` 를 fact 로 셈 |
| sot | SKILL.md:241 | 다음 fact 번호 명령이 rules/ 에서 RUL-9xx 예약 블록을 돌려줌 |
| sot | SKILL.md:268 | 코드표 조건 누락: `NO_FACTS` draft 면제, `UNVERIFIABLE_COMMIT` 은 `verified_paths` 누락에도 |
| sot | `templates/sot-maintenance.md:18,41` | RUL-901 이 dmi 스킬 sot-verify 를 에이전트에게 호출시킴. RUL-904 경로가 대상 프로젝트에 없음 |
| sot | SKILL.md:168, :287 | `design-system.md` 처리 규칙 없음. 붙이는 블록에 local-only 규칙 없음 |
| sot | sot-verify SKILL.md:3 | description 에 "언제" 없음 |
| deepinit | `project_analyzer.py:226`, `docs/skills*.md:130,138` | docstring·문서가 실제 매칭 방식과 다름, `dep_keys`(toml) 미사용, 숨김 폴더 집계 문서 누락 |
| cleanser | SKILL.md:46 | 깨끗할 때 "한 줄" → 실제 헤더 + 한 줄 |
| cleanser | `slop_patterns.py:145,152,187` | `TEMP` IGNORECASE 오탐, 소문자 `# if …` dead-code 오탐, 비 UTF-8 파일 traceback 2회 |
| cleanser | SKILL.md:31,47 | diff 모드가 확장자 미필터 → md `# TODO` 오탐, Go `// TODO` 미검출 |
| codex-side | SKILL.md:92, :132, :57, :125 | 폴백 `codex review` 에 `-m` 없음, `~/.codex/logs/` → 실제 `log/`, `JIN_ARG_END` 충돌 규칙 없음, `$D` 가 Bash 호출 간 유지 안 됨 |
| codex-side | `consult.md:41` | 저장소 밖 대응이 resume 블록에 없음 |
| codex-side | `codex_run.py:185,112` | `--log` 상위 디렉터리 없으면 실행 후 "명령 없음" 오보. reasoning 만 있어도 ok, 게이트가 thinking 줄 태그까지 셈 |
| commit | SKILL.md:12,31,41 | `[<이슈 ID>]` 대괄호 의미 모호, 예시 스코프 구분자 `:`, ✨ "새 파일" 이 새 문서에도 걸림 |
| commit | SKILL.md:3,79 | 모델 자동 호출 + "호출 = 커밋 승인" → 팀원 환경에서 요청 없이 커밋 가능 (의도 확인 필요) |
| claude-init | `statusline-command.sh:41,39` | jq 숨은 의존성(전제 조건·preflight 에 없음), `current_dir` 만 grep 파싱 |
| claude-init | `tmux-usage.sh` | 설치 안 되는 죽은 스크립트, 읽는 `five_hour` 키도 더 이상 안 씀 |
| claude-init | `statusline-config.txt`, `README*.md:89` | 템플릿 미설치, `SHOW_USAGE` 등 6키 중 3키만 동작 |
| claude-init | `setup_mcp_and_teams.py:14`, SKILL.md:96 | Step 5 전체가 무동작(`MCP_SERVERS=[]`) |
| claude-init | `preflight.py:164` | 키 존재만 점검 → 바뀐 필수 키 미복원, 비워둔 선호 키로 영구 partial |
| claude-init | SKILL.md:24 | "선택만 변경" 경로가 snapshot 없이 settings.json 기록 |
| claude-init | SKILL.md:72 | "실패 시 traceback·exit 1" vs 실제 clone 은 traceback 없음, venv·timer 실패는 exit 0 |
| claude-init | `install-timer.sh:90,6` | Windows 분기 있는데 "Linux/macOS만 지원" 출력, `REPO_DIR` 미사용 |
| claude-init | SKILL.md:3,6,113 | description 의 `<이름>` 이 스킬 목록에서 이스케이프됨, 제목 "Jin Claude Init" 잔재 |
| claude-init | `sync_repo.py:17` | 같은 저장소를 두 번 clone (`.jin-claude-repo` + marketplace) |
| claude-init | `.claude-plugin/hooks/` | 빈 디렉터리 (git 미추적, 로컬 잔재) |
| maestro | SKILL.md:21,41,3 | 이름 규칙(소문자 ASCII ≤32) 미명시, wait timeout·working·unknown 처리 없음, description 에 "언제" 없음 |
| maestro·mole-linear | `docs/skills*.md:106,254` | plan 항목에 runner 누락, Done due date 누락 |
| manage-skills | SKILL.md:19 | 기본 브랜치 master·origin 없음 → `main...HEAD` 실패 |
| onboard | SKILL.md:3,11,48 | 인자 값과 섹션 제목 불일치, `claude plugin update` 권장 vs claude-init 경고 (미검증) |
| tests | `tests/test_jin_interview.py:22` | 없는 경로 대상 → 30개 항상 skip |
| 공통 (미해결) | 스킬 `scripts/test_*.py` 등 | dev 전용 테스트가 배포에 포함 (지난 감사 Low) |

## 미검증
codex read-only 샌드박스 읽기 범위·effort enum·`--base`+프롬프트 조합, herdr 단독 `wait` 즉시 매칭 여부, plan 모드 pane 막힘, `claude plugin update` 의 settings 키 삭제 여부, Linux `systemctl`·Windows, Linear 문서(bc71f7d63112) 동기 상태.

## 조치 (v6.3.3)
결정: `docs/plans/skills-audit-2026-11-24-fixes-plan.md`. 버그는 실패 테스트 먼저.

- **수정**: H1, M1–M6, M8–M13, M15. Low 는 아래 보류 외 전부. 추가로 statusline 설정 파일에 빠진 키가 숨김 처리되던 버그.
- **결정에 따라 삭제**: `scripts/tmux-usage.sh`, claude-init Step 5(`setup_mcp_and_teams.py`·테스트), `scripts/test_install_timer.sh`, `plugins/jstack/settings.json`, `outputStyle` 기본값.
- **보류**: M7, M14, M16, 이중 clone, dev 테스트 배포 위치, `${CLAUDE_SKILL_DIR}/../` 교차 호출, commit 자동 호출, codex effort enum, onboard `plugin update` 경고, sot-create 블록 local-only 문구(:287), Windows 타이머 분기(메시지만 정정), preflight jq 점검(점검 구조 없음).
- **동작 변화**: `verified_commit` 은 16진 SHA 만(태그 → `UNVERIFIABLE_COMMIT`). cleanser TODO 류는 대문자만. 캐시 버전 정렬은 `6.3.3-rc1` > `6.3.3` (pre-release 미지원).
- **검증**: `pytest plugins/jstack` 269 · `tests/` 72 · `test_statusline.sh` 17 · `test_install_timer_failure.sh`(로컬) 6 통과, `claude plugin validate` 통과.
