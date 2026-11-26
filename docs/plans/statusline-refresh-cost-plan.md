# statusline 턴 시간 `⏱` 제거 · 매초 갱신 제거 계획

> **에이전트 실행:** `docs/plans/skills-investigate-slice-stress-review-plan.md` 의 Task 0 으로 먼저 수행한다. 버그 규칙(실패 테스트 먼저) 적용. 체크박스(`- [ ]`)로 추적.

**Goal:** statusline 의 CPU 사용을 줄인다 — 턴 시간 `⏱` 와 매초 갱신(`refreshInterval: 1`)을 없앤다. 둘 다 b99bc54(v6.4.3)에서 함께 들어왔다.

**원인 (실측, 2026-11-25, 이 세션 transcript 14MB, 10회 평균):**

| 입력 | 실행당 CPU |
|---|---|
| 지금 (`⏱` 포함) | 719ms |
| `transcript_path`·`prompt_id` 뺌 (`⏱` 없음) | 160ms |

- `⏱` = 실행당 559ms. 매 실행 transcript 전체를 두 번 훑는다 (`grep -m1 promptId` + `sed -n "${turn_line}p"` 끝까지). 세션이 길수록 커진다.
- `refreshInterval: 1` → 매초 실행 → 세션당 코어 약 70%.
- 제거 후: 이벤트(메시지)마다만 실행, 실행당 ~160ms, 대기 중 0.

**결정 (사용자):** 턴 시간 비용을 없앤다 → `⏱` 기능 자체를 제거. 매초 갱신도 제거.
- 건너뜀: 나머지 160ms(`jq` 20곳·`date` 다수) 줄이기 — b99bc54 이전부터 있던 비용. 이벤트 갱신만으로도 무거우면 추가.

## Global Constraints

- **작업 위치:** 기능 브랜치 `jin/skills-investigate-stress-review`, worktree 없이 메인 체크아웃 — 테스트(`test_*.py`·`test_*.sh`·`tests/`)는 gitignore, 계획·조사 문서는 미추적이라 HEAD 기반 worktree 에 없다 (사용자 결정).
- bash 3.2 호환 (macOS 기본, `bash ~/.claude/statusline-command.sh`).
- `git revert b99bc54` 는 쓰지 않는다 — 이후 버전 줄 변경과 충돌. 해당 부분만 손으로 지운다.
- 테스트는 커밋하지 않는다 (`test_*.sh`·`test_*.py` 이미 무시).
- 버전 6.4.5 — `.claude-plugin/marketplace.json`(metadata + jstack 항목), `plugins/jstack/.claude-plugin/plugin.json`, `README.md`·`README.en.md` 버전 줄.
- 커밋은 jstack:commit. 이 Task 파일만 스테이징 (조사 문서·skills 계획 제외). 순서: 배포 → 검증 → 커밋. 커밋 뒤 push 가능 (skills 계획의 push 금지 구간은 그 Task 4–6 만).

## Review Focus

1. 기존 팀원 settings 의 `refreshInterval: 1` → init 재실행 없이 다음 세션 시작에 제거 (Task 0b).
2. 사용자가 바꾼 statusLine(다른 command·다른 간격) → 건드리지 않는다 (Task 0b).
3. 입력에 `transcript_path`·`prompt_id` 가 와도 → 읽지 않고, 1줄은 버전에서 끝난다 (Task 0a).
4. init 을 다시 안 돌린 팀원 → 옛 스크립트(`⏱` 포함)가 남지만 매초 실행은 멈춘다. 커밋 본문에 `jin init` 재실행 안내.
5. settings.json 이 깨졌거나 없음 → 크래시 없이 건너뛴다 (`restore_statusline()` 과 같은 처리) (Task 0b).

---

### Task 0a: `⏱` 제거

**Files:**
- Modify: `plugins/jstack/scripts/statusline-command.sh` — 47–48행(`transcript_path`·`prompt_id`), 263–272행 `fmt_elapsed()`(주석 포함, 다른 사용처 없음), 274–290행 `turn_text` 블록(주석 포함. 292행 `separator=` 는 남긴다 — line1·line2 공용), 294행 주석의 `│ ⏱ 턴 시간`, 318–321행 line1 붙이기.
- Modify: `README.md:88`·`README.en.md:88` — `⏱` 설명 삭제.
- Test: `tests/test_statusline.sh` 234–261행(Test 21–23, 턴 타이머, 마지막 `fi` 포함) → 아래로 교체.

- [ ] **Step 1: 실패 테스트** — Test 21–23 을 지우고 추가:
  - `no_turn_timer`: `prompt_id`·`transcript_path`(prompt 줄 + `turn_duration` 있음) 입력 → 출력에 `⏱` 없음, 1줄 끝이 모델·버전.
  - `no_transcript_read`: `grep -c 'transcript_path' "$SCRIPT"` → 0.
- [ ] **Step 2:** `bash tests/test_statusline.sh` → 두 테스트 FAIL 확인.
- [ ] **Step 3:** 위 블록 삭제 — 행 번호는 수정 전 기준, 아래쪽부터 지운다 (47–48행을 먼저 지우면 뒤 번호가 2씩 밀린다).
- [ ] **Step 4:** 같은 명령 → 전부 PASS.

### Task 0b: `refreshInterval` 제거 + 기존 설정 정리

**Files:**
- Modify: `plugins/jstack/skills/claude-init/scripts/merge_settings.py:25` (`refreshInterval` 줄과 주석)
- Modify: `plugins/jstack/hooks/session_init.py:35` (`OUR_STATUSLINE`) + `drop_refresh_interval()`, 2행 docstring 에 `+ 옛 refreshInterval 제거`
- Modify: `plugins/jstack/skills/claude-init/SKILL.md:89` (`, refreshInterval: 1` 삭제)
- Modify: `README.md:79`·`README.en.md:79` — SessionStart 행에 "init 이 넣은 옛 `statusLine.refreshInterval: 1` 제거 (settings.json 백업)" 추가
- Test (`plugins/jstack/skills/claude-init/scripts/`): `test_merge_settings.py:142`, `test_hooks.py:57,283,321`, `test_preflight.py:79,101,109`

**Interfaces:**
- Produces: `drop_refresh_interval() -> None` — `~/.claude/settings.json` 의 `statusLine` 이 `command == "bash ~/.claude/statusline-command.sh"` 이고 `refreshInterval == 1` 일 때만 그 키를 지운다. 백업(`~/.claude/backups/`)·원자적 쓰기는 `restore_statusline()` 과 공통 함수로 뽑아 같이 쓴다. ponytail: 마이그레이션 — 팀 전원이 6.4.5 이상이면 지운다. `session_init.py` main 에서 `restore_statusline()` 다음에 호출.

- [ ] **Step 1: 실패 테스트**
  - `test_required_statusline_has_no_refresh_interval` — `"refreshInterval" not in REQUIRED_SETTINGS["statusLine"]` (142행 단언 교체).
  - `test_drop_refresh_interval_removes_ours` — 우리 command + 1 → 키 없음, 백업 1개.
  - `test_drop_refresh_interval_keeps_custom` — 다른 command, 또는 우리 command + 5 → 파일 바이트 그대로.
  - `test_drop_refresh_interval_broken_settings` — 깨진 JSON·파일 없음 → 예외 없음, 파일 그대로.
  - 픽스처의 `"refreshInterval": 1` 은 "옛 설정" 사례로만 남기고 기대값은 키 없음.
  - `test_hooks.py` 의 `session_main()` 호출 두 곳 — `test_main_outputs_approve`(57행)·`test_main_runs_restore`(321행) — 에 `patch("session_init.drop_refresh_interval")` 추가. 없으면 실제 `~/.claude/settings.json` 을 고치고 print 단언이 깨진다. `test_main_runs_restore` 는 restore → drop 순으로 각 한 번 호출됨을 단언.
- [ ] **Step 2:** `uv run pytest plugins/jstack -q` → 새 테스트 FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 같은 명령 → PASS.

### Task 0c: 버전 · 배포 · 검증 · 커밋

- [ ] **Step 1:** 버전 6.4.5 (Global Constraints 의 4곳).
- [ ] **Step 2: 배포** — `cp plugins/jstack/scripts/statusline-command.sh ~/.claude/statusline-command.sh`. `~/.claude/settings.json` 에서 `statusLine.refreshInterval` 제거 (백업 `~/.claude/backups/`).
- [ ] **Step 3: 검증** (통과 기준)
  - 이 세션 입력(`transcript_path` 포함)으로 10회 → 실행당 CPU ≤ 200ms (제거 전 719ms, `⏱` 없는 기준 160ms).
  - 같은 입력에 transcript 를 2배로 키운 사본 → 차이 ≤ 30ms (transcript 를 안 읽으므로 같아야 한다).
  - **[메인 세션]** (대화형 `claude` — `-p` 는 statusline 을 안 그려 무효) 배포 사본 `input=$(cat)` 다음 줄에 임시 `printf '%s %s\n' "$(printf '%s' "$input" | jq -r .session_id)" "$(date +%s)" >> "$TMPDIR/sl-count"` 추가 → 새 세션 시작, 첫 렌더 뒤 그 세션 id 와 시각 T 기록 → 30초 무입력 → `awk -v s=<id> -v t=<T> '$1==s && $2>t' "$TMPDIR/sl-count" | wc -l` = 0 (다른 세션 줄은 무시) → 임시 줄 원복.
  - `bash tests/test_statusline.sh`, `uv run pytest plugins/jstack -q` → PASS.
- [ ] **Step 4: 커밋** — 스크립트·hook·init·SKILL.md·README×2·버전 파일. 본문: 실측 수치, 팀원은 다음 세션에 매초 갱신이 멈추고 `jin init` 재실행으로 새 스크립트를 받는다.
