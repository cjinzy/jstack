# investigate · ambition 쪼개기 · stress-review 구현 계획

> **에이전트 실행:** superpowers:executing-plans 로 한 세션이 Task 순서대로 실행한다 (사용자 선택 — 이전 안: subagent-driven-development). held-out 작성과 초안 작성만 서로 다른 새 하위 Agent 가 한다 (측정 원칙). `[메인 세션]` 표시 단계는 대화형이라 사용자 손이 필요하다 — 닿으면 멈추고 보고한다. 체크박스(`- [ ]`)로 추적.
>
> **작업 위치:** 기능 브랜치 `jin/skills-investigate-stress-review`, worktree 없이 메인 체크아웃 — 테스트(`test_*.py`·`test_*.sh`·`tests/`)는 gitignore, 계획·조사 문서는 미추적이라 HEAD 기반 worktree 에 없다 (사용자 결정).
>
> **실행 순서:** Task 1 Step 5 (검토 지적 반영 → 문서 커밋) → Task 0 (statusline, 별도 계획, 6.4.5) → Task 2 → … → Task 6. push 는 사용자.

**Goal:** jstack 에 `investigate`·`stress-review` 스킬을 추가하고, `ambition` 에 쪼개기를 넣고, `codex-side` 를 `stress-review` 로 흡수한다.

**Architecture:** 스킬 = 한국어 SKILL.md + 필요 시 모드 파일·스크립트. `stress-review` 는 `codex_run.py` 를 일반화한 `agent_run.py` 로 설치된 coding agent CLI 를 읽기 전용 실행하고, 없으면 새 맥락 Claude 서브에이전트를 쓴다. 검토자는 첫 실행에 한 번 묻고(codex 외 CLI 는 카나리 검사 통과 시만) `~/.claude/.jstack-stress-review` 에 저장한다. 외부 전송 동의는 매번 묻는다.

**Tech Stack:** Markdown SKILL.md · Python 3 stdlib(스크립트) · pytest(로컬 전용) · `claude -p --safe-mode --plugin-dir`(시나리오 실행).

**Spec:** 아래 `## 결정 사항` + 조사 문서 `docs/research/skill-methodology-survey-2026-11-25.md` (이하 "조사").

## 결정 사항

**범위**
- 대상 3개: `investigate`(문제 해결을 위한 조사, 코드 버그 아닌 문제와 버그 실존·재현 확인 포함) · `ambition` 쪼개기 · `stress-review`(적대적 검토).
- `debug` 스킬은 만들지 않는다 — gstack 이 디버깅 스킬을 효과 없는 eval 뒤 은퇴시켰다(조사 §4). 팀 CLAUDE.md 버그 규칙 보강으로 대신했다 (`1f9e2ed`, v6.4.4). 그 규칙도 미평가다. 버그 실존·재현 확인은 `investigate` 가 맡고, 수정은 다음 턴의 계획·CLAUDE.md 규칙이 맡는다 (사용자 결정).
- `codex-side` 는 `stress-review` 로 합친다 — review(P0/P1 게이트)·challenge·consult, 읽기 전용 실행, 경계 지시문, 사용자 값 검증, 결과 원문 제시 + 권고 한 줄, 오류 표.
- Altitude: ① 스킬 작성만. 흐름 재설계·eval 유지 체계는 범위 밖.

**측정 원칙** (조사: 측정 근거가 얇고 대부분 null)
- PASS = 심어 둔 정답에 도달(참 원인 지목·미끼 기각·증거 부족이면 판단 불가). 채점은 두 팔 공통 프롬프트가 요구하는 마지막 줄 `ANSWER: <보기>` 로만 — 스킬 어휘(`실존`·`inconclusive` 등)나 본문 키워드로 채점하면 기준선이 말만 달라서 진다. 보기도 스킬 어휘를 쓰지 않는다 (버그 확인 = `결함 있음 | 결함 아님 | 판단 불가`). 형식(가설 수·확신도·라벨)은 `FORMAT` 으로 따로 보고하고 PASS 에 넣지 않는다. `ambition` 쪼개기(Task 3)는 계획이 산출물이라 `ANSWER:` 대신 두 팔 공통 `TASK` 줄로 채점한다.
- 시나리오는 dev / held-out 으로 나눈다. **held-out 시나리오·정답 작성과 초안 작성은 서로 다른 새 하위 Agent 가 한다** (사용자 결정). 초안 Agent 는 설계와 dev 만 받고 `heldout/`·`.maestro/` 를 읽지 않는다 — 초안 작성 동안 `heldout/` 는 `chmod 000`. 이 계획에는 held-out 의 종류만 적고 정답은 적지 않는다. 반복 수정은 dev 로, 채택 판정은 held-out 1회 — 재판정 없음.
- 기준선 = 현재 HEAD 의 `plugins/jstack` 사본, 처리군 = 그 사본 + 초안. (스킬 하나만 다르게.)
- 채택 = held-out 에서 기준선보다 PASS 가 `margin = max(1, ceil(1.96 × sqrt(2·n·p̄(1−p̄))))` 이상 많음 (n = 팔당 실행 수, p̄ = (기준선 PASS + 처리군 PASS)/(2n) — 두 팔을 합친 통과율). n=25, p̄=0.5 → 7. 표본이 작아 큰 효과만 잡힌다 — 결과 보고에 명시.
- 초안 전 점검 (같은 식에 기준선 통과율 p): 기준선 PASS + margin > n 이거나 기준선 PASS = n 이면 그 시나리오 집합으로는 결정 불가 (n=25 면 기준선 20 이상) → 초안을 돌리기 전에 시나리오를 어렵게 한다.
- 못 넘으면 그 스킬은 뺀다 — `investigate` 와 `ambition` 쪼개기만 (사용자 결정). `stress-review` 는 `codex-side` 이식이라 기준선 비교·탈락 없이 Task 5 통과 기준(S4·S5 각 5/5 + 대화형 확인)으로 본다. 모델 판정 없음 — 결정적 체커.
- 작성 방법: `investigate` 를 skill-creator 와 superpowers:writing-skills 로 각각 써서 비교한다. 방법 승자 = held-out PASS 많은 쪽 (같으면 비용 낮은 쪽) — 채택 여부와 별개로 항상 정해지고, 나머지 스킬에 쓴다.

**`investigate` 설계** (조사 §6 — 근거 수준: KT·ACH 의 에이전트 측정 없음, ACH 인간 RCT 혼재, BMAD 는 같은 결론에 비용 1.5배·시간 2배인 investigate 를 은퇴. 증명된 방법이 아니라 장치로 쓴다)
- 결정·전제를 먼저 반증 가능한 문장으로 적는다 (gstack).
- 사실 라벨: Observed / Inferred / Unknown, 근거 없으면 `inconclusive` 허용 (wshobson).
- 원자료 우선, 기록에서 답하고 추론은 표시 (pstack). 주장 → 실제 확인 → 차이 (cc-thinking map-territory).
- 경쟁 가설을 나열하고 판별 증거부터 본다 — ACH 를 장치로만, 전체 행렬 강제 금지.
- IS / IS NOT: 원인은 둘 다 설명해야 한다.
- **버그 확인 용도** (`/investigate` 직접 호출 — description 에 버그 트리거를 넣지 않는다. "고쳐줘" 요청을 가로채지 않게, 사용자 결정): 재현 시도 + 로그 확인. 로그 줄은 시각·요청 ID 등으로 보고된 증상과 이어질 때만 증거, 재현은 보고된 이유로 실패해야 한다 (조사 §3 DEBUG [79][80]). 판정 = `실존` / `재현 안 됨` / `증거 부족`.
- 소스는 고치지 않는다. 끝에 인계 블록을 남겨 다음 턴의 수정 계획(CLAUDE.md 버그 규칙·ambition)이 그대로 쓰게 한다: 판정 · 재현 명령과 출력 · 근거 로그 줄 · 읽은 실패 경로 · 미확인 사항.

**`ambition` 쪼개기 설계** (사용자 결정: walking skeleton 대신 TDD식 쪼개기. 에이전트 측정 근거는 양쪽 다 없음 — 받치는 건 "짧은 작업·적은 파일일수록 성공", 조사 §3 DECOMPOSE)
- 조각 = 테스트 사이클 1개: 실패하는 테스트 → 구현 → 통과 → 커밋 (superpowers Task Right-Sizing).
- 테스트는 사용자가 보는 행동 단위 (입구 — CLI·API·화면 — 에서 호출). 함수·층 단위 테스트로 쪼개지 않는다.
- 코드가 아니면 테스트 대신 지금은 실패하는 검증 (ambition 외부 판정자 규칙).
- 분할 경계 = 검토자가 한 작업을 거부하고 이웃은 승인할 수 있는 곳 (superpowers). 줄이지 말고 나눈다 (BMAD).
- 조각은 짧게, 파일은 적게.
- 수평 분할(층별 조각, 설정·테스트·문서를 끝에 몰기) 금지 — 조각마다 테스트는 통과해도 이어 붙이면 안 돈다.

**`stress-review` 설계**
- 검토자: 설치된 CLI 또는 Claude 서브에이전트. 선택은 첫 실행 1회(사용자 전역 저장, Claude 서브에이전트 선택도 저장 — 버전·카나리 없음). 저장한 CLI 가 사라지거나 버전이 바뀌거나 `agent` 인자면 다시 묻는다. 매 실행 `검토자: <이름>` 표시.
- 지원 CLI: codex(read-only 명시 플래그, 이 머신에서 실측) + gemini·opencode·copilot·qwen·pi(문서 기준, 실측 없음). pi 는 `pi -p --no-tools --no-session` — 도구 전부 끔(MCP 포함), 내용은 stdin (조사 §5 [127]). **codex 외는 첫 선택·버전 변경 시 카나리 검사**: 빈 임시 폴더에서 "파일을 만들어라" → 파일이 생기면 그 CLI 거부. 저장소 내용은 보내지 않는다. cursor·amp·aider 는 제외 (read-only 없음·stdin 미문서·JSON 없음).
- 금지 플래그는 에이전트별 목록 (`--dangerously-*`, `--yolo` 공통; gemini `--approval-mode plan` — headless 에서 plan 종료가 자동 승인되고 YOLO 로 넘어감). qwen 의 `--approval-mode plan` 은 문서상 read-only 이지만 gemini 계열이라 카나리가 판정.
- codex 외 CLI 는 **빈 임시 폴더를 cwd 로**, diff·계획 본문을 stdin 프롬프트에 넣는다 → 저장소 읽기 권한 없음. diff 는 Claude 가 저장소에서 `git diff` 로 뽑아 고정 지시문 뒤에 붙인다 — 소스 파일 전체는 붙이지 않는다 (전송 범위를 넓히지 않는다). 동의 문구도 "프롬프트 내용(diff·계획·질문)만 전송". codex 는 지금처럼 저장소 루트 read-only (동의 문구: 저장소 전체 읽기).
- **외부 전송 동의는 매번** (codex-side Step 3 유지). Claude 서브에이전트는 외부 전송이 아니라 동의 불필요.
- 검토자에게 작성자의 결론·자기평가를 넘기지 않는다. 요구사항과 증거는 넘긴다 ("strip reasoning, not evidence", addyosmani).
- 검토자가 없거나 실패하면 `부재`/`FAIL (fail-closed)` — 통과로 보고하지 않는다 ("missing coverage ≠ clean", gstack). Claude 서브에이전트도 같은 P0/P1 게이트: 읽기 전용 유형(Explore)으로 띄우고, 답 원문을 파일로 저장해 `agent_run.py --gate-text` 로 판정한다 — 게이트 줄은 스크립트 출력만 쓴다.
- pre-mortem 지시("배포 후 실패했다. 왜?")는 challenge 에. 효과 근거는 얇다.

**녹일 기법:** ACH · IS/IS NOT(investigate) · 행동 단위 TDD 쪼개기(ambition, walking skeleton 대체) · pre-mortem 레드팀(stress-review). 넷 다 에이전트 대상 측정 근거는 없거나 null — 앞 셋은 측정 원칙으로 거르고, pre-mortem 은 `stress-review` challenge 지시문으로만 넣는다 (기준선 비교 없음).

> **범위 축소 (2026-11-26, 사용자 결정):** `stress-review` 는 codex 전용으로 줄였다. 아래 계획의 다중 CLI 지원(gemini·opencode·copilot·qwen·pi), 검토자 선택·저장(`reviewer_config.py`, `agent` 모드), 카나리, 버전 재검사는 구현했다가 삭제했다 — Task 4·5 의 해당 항목과 Review Focus 1–3 은 더 이상 적용되지 않는다. Claude 서브에이전트는 codex 를 못 쓸 때(미설치·사용량 한도·동의 불가)만 대신 돈다. 스크립트는 `codex_run.py` 하나다.

## Global Constraints

- 스킬 본문 한국어. 길이는 기본 50줄 안팎에서 시작하고 Task 2 결과로 조정. 길어지면 모드 파일로 분리(`codex-side` 방식). 벤더 상한 500줄.
- frontmatter: `name`, `description`(한국어 + 트리거 문구 — description 이 곧 trigger), 필요 시 `argument-hint`·`allowed-tools`.
- 빌린 내용은 출처·라이선스 표기. MIT 는 아이디어 차용 + 출처. Apache-2.0(EGM·humanlayer)·CC-BY-SA(trailofbits)·GPL(NeoLab)·무라이선스(llm-council)는 문구 복사 금지. `LICENSE-gstack` 유지.
- 테스트·시나리오·체커·fixture 는 커밋하지 않는다 (`tests/`·`test_*.py` 이미 무시). fixture 는 합성 데이터만.
- 스크립트: Python stdlib 만, 타입 힌트, ruff 통과, 오류 시 traceback.
- 외부 CLI: 내용(diff·계획)은 stdin 으로만 (argv 엔 고정 지시문만), 읽기 전용 설정 필수, 중첩 호출 차단, 타임아웃 540s(`codex_run.py` 값), CLI 버전 고정 금지.
- 커밋은 jstack:commit(gitmoji + 한국어, Co-Authored-By 없음). push 는 사용자 — **Task 4–6 사이엔 push 금지** (`git mv` 로 codex-side 가 잠시 깨짐).
- 버전 7.0.0 — 공개 스킬 `codex-side` 제거는 깨지는 변경 (6.0.0 스킬명 변경 관례). `.claude-plugin/marketplace.json`(metadata + jstack 항목), `plugins/jstack/.claude-plugin/plugin.json`, `README.md`·`README.en.md` 버전 줄.
- 반복: 시나리오당 5회 (1회는 ±20% 노이즈). dev 로 수정은 스킬당 3회 상한. held-out 판정 1회 (재판정 없음). 못 넘으면 그 스킬을 빼고 결과를 조사 문서 부록에 기록·보고한 뒤 다음 Task.

## Review Focus

1. 저장한 검토자 CLI 가 지워지거나 버전이 바뀜 → 조용히 실패하지 않고 다시 묻는다(버전 변경은 카나리 재검사). — Task 4 테스트.
2. 설정 파일이 깨짐(빈 파일·JSON 아님·모르는 이름) → 크래시 없이 다시 묻는다. — Task 4 테스트.
3. 카나리가 타임아웃·오류 → 통과가 아니라 거부 (fail-closed). — Task 4 테스트.
4. 비대화형 실행(`claude -p`) → 선택·동의를 물을 수 없음 → 외부 전송 없이 Claude 서브에이전트. — Task 5 S5 (저장된 CLI 가 있어도 호출 0회).
5. 서브에이전트 안에서 실행(Agent 도구 없음) → 새 맥락 검토 불가를 알리고 메인 세션 실행을 안내. 자기 검토로 대신하지 않는다. — 자동 테스트 없음 (중첩 환경 재현 불가). SKILL.md 문구로만 처리, Task 5 Step 3 에서 pane 세션 안의 서브에이전트로 1회 수동 확인.
   - 실측 정정 (2026-11-26): 이 Claude Code 버전(v2.1.332)은 서브에이전트에도 Agent 도구가 있어 이 분기를 타지 않았다. 서브에이전트 안에서는 AskUserQuestion 이 없어 비대화형 규칙(4번)대로 외부 호출 없이 Claude 서브에이전트(2단 중첩)로 검토했다. "Agent 없음" 분기는 미검증으로 남는다.

---

### Task 0: statusline 턴 시간 `⏱`·매초 갱신 제거 (v6.4.5)

전체 내용은 `docs/plans/statusline-refresh-cost-plan.md` (Task 0a–0c). 실측: 실행당 CPU 719ms → `⏱` 없이 160ms, 매초 실행 → 이벤트 때만. 이 계획의 다른 Task 와 파일이 겹치지 않는다 (README 버전 줄만 — Task 6 은 6.4.5 위에서 7.0.0 으로 올린다).

- [ ] **Task 0a–0c** — 그 계획의 체크박스대로.

### Task 1: 조사 문서 → 계획 수정

**Files:**
- Create: `docs/research/skill-methodology-survey-2026-11-25.md`
- Modify: 이 계획

- [x] **Step 1:** 워크플로 `skillset-discovery`(34개) → `skillset-deep-survey`(15개 정독·인용 재확인 38건 삭제·근거·종합·비평 32건 반영) 결과 저장.
- [x] **Step 2: 구조 검증** — 절 전부 존재, §1 34행이 discovery 원본과 일치(별 수 포함), §4 주장 표에 tier, 낡은 내용 반영, 로컬 절대경로 제거. (내용 검증 아님 — 비평 뒤 수정본이 사실을 추가했다.)
- [x] **Step 3: 핵심 주장 재확인** — 6개 원문 재확인 (조사 부록 A): 확인 3(gstack R3c·BMAD·cursor), 일부 2(superpowers 금지문은 한 사례·gemini plan 자체는 read-only 이나 종료 후 YOLO), 재확인 실패 1(KT −1.8pp → 조사·계획에서 근거로 쓰지 않음).
- [x] **Step 4: 계획 수정** — 설계·지원 CLI·측정 원칙 반영.
- [ ] **Step 5:** 검토 `plans-adversarial-review` 지적 33건 반영 후 커밋 (조사 문서 + 두 계획). 사용자가 실행 브리프에서 커밋을 지시했다 — 별도 검토 대기 없음.

### Task 2: 시범 — `investigate` 를 두 방법으로 작성 (끝까지 도는 첫 조각)

시나리오 → 격리 실행 → 기준선 → 초안 A·B → held-out 판정 → 커밋까지 한 스킬로 끝까지 돈다. 이후 Task 는 이 경로를 재사용한다.

**Files:**
- Create: `plugins/jstack/skills/investigate/SKILL.md` (채택일 때만)
- Test: `tests/skills/run_scenario.sh`, `tests/skills/check.py`, `tests/skills/team-CLAUDE.md`, `tests/skills/investigate/dev/`, `tests/skills/investigate/heldout/` (held-out Agent 만 쓴다), `tests/skills/_plug/{base,A,B}/` (플러그인 사본 — 초안은 여기에만 두고 채택본만 `plugins/jstack` 으로 복사)

**Interfaces:**
- Produces: `tests/skills/run_scenario.sh <plugin_dir> <fixture_dir> <prompt_file> <out.jsonl>` — fixture 를 scratchpad 로 복사, `claude -p --safe-mode --plugin-dir <plugin_dir> --append-system-prompt-file tests/skills/team-CLAUDE.md --output-format stream-json --verbose --allowedTools <목록>` 실행. 목록 = Skill·Read·Grep·Glob·Bash·Edit·Write (권한 건너뛰기 플래그 금지), 실행 위치는 fixture 사본.
- Produces: `tests/skills/check.py <scenario_dir> <out.jsonl> <workdir>` → `PASS`/`FAIL: <이유>`(시나리오 폴더의 `truth.json` 대비), `FORMAT: <항목별 yes/no>`, `TRIGGERED: yes|no`, `HANDOFF: yes|no`(재현되는 버그 시나리오만), `COST: <usd>`(result 이벤트).
  - `TRIGGERED` — 자동 발동 시나리오는 대상 스킬 Skill tool_use(`input.skill` 일치), 슬래시 시나리오는 Step 1 에서 실측한 슬래시 로드 표지.
  - 소스 수정 = `file_path` 가 `truth.json` 의 `source_globs` 에 맞는 Edit/Write tool_use (거부돼도 시도는 수정으로 센다). 재현용 테스트·메모 파일 쓰기는 세지 않는다.

- [ ] **Step 1: 격리 확인** — 팀원 환경 = jstack + 팀 CLAUDE.md 뿐. 이 머신엔 ponytail·superpowers·gstack 이 있어 기준선이 오염된다. `team-CLAUDE.md` = 저장소 `.claude/CLAUDE.md`(claude-init 배포 원본)와 @include 문서를 펼친 사본. 기준선 플러그인 = `git archive HEAD plugins/jstack` 사본. stream-json init 이벤트에 그 플러그인 스킬만 있고, 플러그인 hook(ambition UserPromptSubmit)이 도는지 확인. `--safe-mode` 가 `--plugin-dir` 이나 그 hook 을 막으면 대안: 빈 `CLAUDE_CONFIG_DIR` + 사본만 설치.
  - 슬래시 호출: `claude -p "/jstack:investigate …"` 1회 실행해 스킬이 로드됐음을 보여 주는 stream-json 표지를 기록한다 (후보: `<command-name>` 이 든 user 메시지, "Base directory for this skill", `forked-command-` parent_tool_use_id, Skill tool_use). 표지가 없으면 슬래시 시나리오의 `TRIGGERED` 는 잴 수 없다고 적고, Step 8 의 실행기 결함 규칙을 뺀다.
  - headless 권한: Bash 가 fixture 사본에서 실제로 도는지, Edit/Write 시도가 stream-json 에 남는지 확인 — "소스 수정 없음"은 workdir 상태가 아니라 `source_globs` 에 맞는 Edit/Write 시도로 판정.
- [ ] **Step 2: dev 시나리오 작성** (합성 데이터. `truth.json` = 보기 목록·정답 보기·미끼 보기·`source_globs`, 버그 시나리오는 실패 시그니처(종료 코드·stderr 문구)와 테스트 명령. 프롬프트 끝에 두 팔 공통 지시 "마지막 줄에 `ANSWER: <보기 중 하나 | 판단 불가>`")
  - D1 원인 — statusline `⚠`, 참 = 만료 토큰(401), 미끼 = 네트워크 타임아웃 줄. D2 선택지 — "loguru 를 표준 logging 으로?", 참 = 유지(spec 명시). D3 증거 부족 — 참 = 판단 불가 + 필요한 데이터 지목. D4 버그 확인 — 리포트 + 로그 + 재현되는 코드, 보기 `결함 있음 | 결함 아님 | 판단 불가`, 참 = 결함 있음.
  - 버그 확인 시나리오는 처리군 프롬프트를 `/jstack:investigate ` 로 시작한다 (트리거가 없으니 실제 사용법). 기준선은 같은 프롬프트에서 그 접두만 뺀다. 나머지는 두 팔 같은 프롬프트 — 자동 발동까지 잰다.
  - PASS = `ANSWER:` 줄이 정답 보기 + 소스 수정 시도 0회 (예외 없음). 형식은 FORMAT.
  - `HANDOFF: yes|no` (PASS 와 별도, 재현되는 버그 시나리오만) — 답의 코드 블록 명령을 체커가 fixture 사본 안에서 타임아웃을 걸고 실행해 `truth.json` 실패 시그니처가 나오면 yes. 형식과 무관하게 "다음 턴이 쓸 수 있는 재현"을 잰다. held-out 엔 하나뿐이라 팔당 5회 — 보고에 명시.
- [ ] **Step 3: 체커·실행기 작성.** 체커 자체 테스트(`tests/skills/test_check.py`): 정답·오답·`ANSWER` 줄 없음·소스 수정 시도 각 1건.
- [ ] **Step 4: held-out 작성 — 새 하위 Agent (held-out 전담).** 브리프 = 종류, `truth.json` 형식, 체커·실행기 계약, dev 와 다른 도메인이어야 함. 종류 5개: 원인 지목(미끼 있음) · 첫 가설을 원자료가 반박 · 버그 확인(재현됨, 슬래시 호출) · 증거 부족 · 버그 아님(재현 안 됨, 무관한 미끼 로그, 슬래시 호출). `tests/skills/investigate/heldout/` 에 쓰고 체커 자체 점검(정답 답안 PASS·미끼 답안 FAIL)까지 한다. 보고는 경로와 점검 결과만 — 시나리오 내용·정답은 보고·계획·ledger 어디에도 적지 않는다.
- [ ] **Step 5: 기준선** — 기준선 플러그인으로 dev·held-out 각 5회. 초안 전 점검에 걸리면 시나리오를 어렵게: dev 는 실행 세션이, held-out 은 같은 held-out Agent 가 (PASS 수만 받고) 고친다.
- [ ] **Step 6: 초안 A — 새 하위 Agent**, skill-creator 로 작성, dev 로만 반복(≤3회). 브리프 = `## 결정 사항` 의 `investigate` 설계 + dev 폴더 + 실행기·체커 사용법. `heldout/`·`.maestro/` 읽기 금지, 초안 작성 동안 `heldout/` 는 `chmod 000`.
- [ ] **Step 7: 초안 B — 또 다른 새 하위 Agent**, superpowers:writing-skills 로 작성, 조건은 Step 6 과 같다. 두 초안 모두 description 에 버그·수정 트리거("버그 맞아?" 등)를 넣지 않는다.
- [ ] **Step 8: held-out 판정** — 초안 고정(SKILL.md 수정 금지) 후 A·B 각 held-out 5회(5종, n=25). 판정 전 dev D4 1회로 슬래시 로드 표지를 확인한다.
  - 자동 발동 시나리오의 처리군 실행 절반 이상이 `TRIGGERED: no` 면 그 초안은 "발동 안 함" 으로 탈락 기록. description 수정 후 재판정 없음.
  - 슬래시 시나리오의 `TRIGGERED: no` 는 실행기 결함 (Step 1 표지가 정의됐을 때만) — 실행기를 고치고 그 시나리오만 다시 돈다.
  - 채택 = margin 을 넘은 초안 중 PASS 많은 쪽 (둘 다 넘고 차이가 margin 미만이면 비용 낮은 쪽). 넘은 초안이 없으면 `investigate` 는 뺀다.
  - 방법 승자는 채택과 별개로 held-out PASS 많은 쪽 (같으면 비용 낮은 쪽). Task 3·5 는 이 승자를 쓴다.
  - 조사 문서 부록 C 에 `WINNER: A|B`, `investigate: 채택|제외`, 팔별 PASS·비용·FORMAT·HANDOFF 를 기록.
- [ ] **Step 9: 커밋** — 채택이면 `investigate/SKILL.md` + 조사 문서 부록, 제외면 부록만 (초안은 `_plug/` 에만 남는다).

### Task 3: `ambition` 쪼개기

**Files:**
- Modify: `plugins/jstack/skills/ambition/SKILL.md` (Range 뒤 `## Slice` 절, 반영 규칙 한 줄, description 에 "쪼개기") — 채택일 때만
- Modify: `tests/skills/check.py` (`TASK` 줄 채점)
- Test: `tests/skills/ambition/dev/`, `tests/skills/ambition/heldout/` (held-out Agent 만 쓴다)

계획 자체가 산출물이라 판정은 구조다. 정답 = 심어 둔 입구(사용자가 보는 CLI·API)와 의존 순서.

**Interfaces:**
- 두 팔 공통 프롬프트 꼬리: 계획 뒤에 작업마다 한 줄 `TASK <n>: verify=<정확한 명령>; files=<경로,...>; depends=<n,...|none>`.
- `truth.json`: `entry`(입구 명령 문자열), `layers`(심은 의존 순서대로 층 → 경로 glob), `support_globs`(테스트·설정·문서 glob), `trivial: true|false`.
- `check.py` (모델이 쓴 라벨이 아니라 파일 경로로 분류):
  - 큰 계획 PASS = (a) 모든 `verify` 에 `entry` 포함 + (b) 모든 `depends` 번호 < n + (c) 심은 A→B 쌍마다 A 층 파일이 처음 나오는 작업이 B 층보다 앞 + (d) `files` 전부가 `support_globs` 인 작업 없음.
  - 사소한 작업 PASS = `TASK` 줄 정확히 1개.
  - `TASK` 줄이 없거나 못 읽으면 두 팔 모두 FAIL — 건수를 따로 보고. "실패 먼저" 단계 유무는 FORMAT.

- [ ] **Step 1: dev 시나리오** — A1 키운 계획("이번 릴리스 크래시 0 유지", 층 3개). A2 사소한 작업 + ambition. 두 팔 공통 프롬프트에 'ambition' 을 넣고 AskUserQuestion 답을 미리 적는다 (Altitude 단 = <X>, Range 기법 = 전부 채택, 다시 묻지 말 것). 계획 본문은 최종 응답(result 이벤트)으로 출력하게 한다.
- [ ] **Step 2: 실행 확인** — 기준선 1회: AskUserQuestion·EnterPlanMode 시도 없이 result 이벤트에 계획 본문과 `TASK` 줄이 있는지. 없으면 프롬프트를 고친 뒤 기준선을 잰다.
- [ ] **Step 3: held-out 작성 — 새 하위 Agent (held-out 전담).** 종류: 다른 도메인의 키운 계획 3개 (각각 의존 순서를 심는다) + 사소한 작업 1개. 조건·보고 규칙은 Task 2 Step 4 와 같다.
- [ ] **Step 4: 기준선** — 현재 `ambition` 그대로, dev·held-out 각 5회. margin 은 큰 계획 3종(n=15)으로만 판정한다. 초안 전 점검에 걸리면 큰 계획 시나리오를 어렵게 (held-out 은 같은 held-out Agent 가). 사소한 작업은 회귀 가드 — 처리군 PASS 가 기준선보다 2 이상 적으면 탈락.
- [ ] **Step 5: 작성 — 새 하위 Agent** (Task 2 방법 승자) — `## 결정 사항` 의 쪼개기 설계, dev 로만 반복(≤3회). `$ARGUMENTS` 축 선택 규칙 유지. `heldout/`·`.maestro/` 읽기 금지, 작성 동안 `heldout/` 는 `chmod 000`.
- [ ] **Step 6: held-out 판정** — 초안 고정 후 held-out 5회씩. margin 기준(큰 계획 n=15) + 사소한 작업 회귀 가드. 조사 문서 부록 C 에 `쪼개기: 채택|제외` 와 팔별 수치.
- [ ] **Step 7: 커밋** — 채택이면 `ambition/SKILL.md` + 부록, 제외면 ambition 변경을 버리고 부록만.

### Task 4: `stress-review` 스크립트

**Files:**
- Move: `codex-side/scripts/codex_run.py` → `stress-review/scripts/agent_run.py` (`git mv`, 이력 유지)
- Create: `plugins/jstack/skills/stress-review/scripts/reviewer_config.py`
- Test: `scripts/test_agent_run.py` (`test_codex_run.py` 이관), `scripts/test_reviewer_config.py`

**Interfaces:**
- Produces (`reviewer_config.py`):
  - `AGENTS: dict[str, Agent]` — codex·gemini·opencode·copilot·qwen·pi. 각 항목: 바이너리, one-shot 명령, 읽기 전용 설정(플래그·env), 금지 플래그 목록, cwd(`repo`=codex / `empty`=나머지), 출력 형식, resume 지원, 카나리 필요(codex 만 아님). 값은 조사 §5 + 공식 문서. 읽기 전용 설정은 서브명령별로 항상 명시한다 — codex exec = `-s read-only`, review·resume = `-c sandbox_mode="read-only"`.
  - `CLAUDE_SUBAGENT = "claude"`, `REVIEWERS = AGENTS ∪ {CLAUDE_SUBAGENT}`. Claude 는 `version: ""` 로 저장하고 카나리가 없다.
  - 설정 파일 JSON `{"agent": "<이름>", "version": "<--version 출력>"}`. 경로는 기본 `~/.claude/.jstack-stress-review`, env `JSTACK_STRESS_REVIEW_CONFIG` 로 재지정 (테스트용).
  - `detect(path_env: str | None = None) -> list[str]`, `load(path: Path) -> dict | None`(깨졌거나 `REVIEWERS` 에 없는 이름이면 None), `save(path: Path, agent: str, version: str) -> None`.
  - `canary(agent: str, timeout: float) -> tuple[bool, str]` — 빈 임시 폴더에서 읽기 전용 명령으로 "CANARY 파일을 만들어라" 실행 후 폴더가 비어 있고 모델 응답이 비어 있지 않으면 통과 (응답이 없으면 시도조차 안 한 것 — 인증 오류 등). 타임아웃·오류·빈 응답은 실패. codex 카나리는 git 저장소가 아닌 빈 폴더라 `--skip-git-repo-check` 를 붙인다.
  - CLI: `status` → `SAVED: <이름|none>` / `INSTALLED: a,b` / `VALID: yes|no` / `RECHECK: yes|no`(버전 변경); `canary <이름>` → `CANARY: pass|fail <이유>`; `set <이름>`(`claude` 허용). 저장값이 `claude` 면 항상 `VALID: yes` / `RECHECK: no`, 설정 파일이 없으면 `SAVED: none` / `VALID: no`.
- Produces (`agent_run.py`): `--agent <이름>` 이 `-- cmd` 대신 명령을 만들고 `AGENTS` 의 cwd 에서 실행. 기존 `--timeout`·`--boundary`·`--log`·`--gate`, 상태 블록(`STATUS`·`TOKENS`·`SESSION_ID`·`GATE` …) 유지. `-- cmd` 는 테스트용으로 남긴다.
  - `--agent` 인자: `--mode exec|review|resume`, `--scope base:<BASE>|uncommitted|commit:<sha>`(review, codex 전용), `--session <ID>`(resume, codex 전용), `--out <file>`(codex `-o`, `--gate` 가 읽음), `--model`·`--effort`(SKILL.md 검증을 통과한 값만).
  - codex 는 JSONL 파싱. 나머지 CLI 는 평문 모드로 돈다 (JSON 플래그 없음) — 종료 0 + stdout 비어 있지 않음 = ok, 게이트는 stdout 에서 판정.
  - `--gate-text <file>`: 파일 본문에 review 게이트 적용 (빈 파일 = `FAIL` fail-closed), `STATUS`·`GATE` 블록 출력 — Claude 서브에이전트 답 판정용.
  - 중첩 차단: codex 표지(`CODEX_SANDBOX`·`CODEX_THREAD_ID`)가 있으면 모든 에이전트를 막는다. 다른 CLI 는 문서화된 표지가 없어 가드가 없다 — 주석으로 남기고 env 이름을 지어내지 않는다.

- [ ] **Step 1: 실패 테스트**
  - 설정: `test_load_corrupt_returns_none`(빈 파일·`{`·모르는 이름), `test_save_load_roundtrip`, `test_save_load_claude_roundtrip`, `test_detect_uses_path`(임시 PATH 에 가짜 CLI), `test_status_invalid_when_saved_cli_removed`, `test_status_recheck_on_version_change`, `test_status_claude_always_valid`
  - 명령: `test_build_cmd_readonly_and_no_content_in_argv`(argv 엔 고정 지시문만, diff·계획은 stdin), `test_build_cmd_has_no_banned_flags`(에이전트별 금지 목록), `test_build_cmd_codex_review_and_resume`, `test_non_codex_runs_in_empty_dir`
  - 카나리: `test_canary_rejects_writer`(가짜 CLI 가 파일 생성 → fail), `test_canary_passes_readonly`, `test_canary_timeout_fails`, `test_canary_fails_when_no_answer`(종료 0 + 빈 출력 → fail)
  - 게이트: `test_gate_text_file`(빈 파일 → FAIL, `[P1]` → FAIL, P2 만 → PASS), `test_gate_plaintext_non_codex`(P1 → FAIL, P2 만 → PASS, 빈 출력 → FAIL)
  - `test_nested_guard_blocks_all_agents`
- [ ] **Step 2:** `pytest plugins/jstack/skills/stress-review/scripts -q` → FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 같은 명령 → PASS (이관한 codex 테스트 포함). 이 머신의 실제 codex(0.162.1, 조사는 0.172.0 문서 기준)로 카나리 1회 — read-only 실측.
- [ ] **Step 5: 커밋** (push 금지 — Task 6 까지).

### Task 5: `stress-review` 스킬

**Files:**
- Move: `codex-side/{review,challenge,consult}.md`, `LICENSE-gstack` → `stress-review/`
- Create: `plugins/jstack/skills/stress-review/SKILL.md` (`codex-side/SKILL.md` 기반, `allowed-tools` 에 `Agent` 추가)
- Test: `tests/skills/stress-review/`

- [ ] **Step 1: 작성** (Task 2 방법 승자)
  - Step 1 사전 점검 → `reviewer_config.py status`. 첫 실행: 검토자 선택 → (codex 외) 카나리 → 저장. 전송 동의(기존 Step 3)는 외부 CLI 일 때 매번, 문구는 cwd 에 맞게.
  - 모드 표에 `agent` 행: 검토자 다시 선택(status → 선택 → 카나리 → 저장) 후 끝낸다 — 아무것도 보내지 않는다. `agent` 는 첫 단어 예약어라 consult 로 넘기지 않는다.
  - 에이전트별 차이: review A 경로(`codex exec review --base`)·consult resume(`exec resume`)은 codex 전용. 다른 CLI 는 Claude 가 저장소에서 `git diff <BASE>...HEAD` / `git diff HEAD`(또는 `git show <sha>`)를 돌려 고정 지시문 뒤에 붙이고 새 대화로 보낸다. 프롬프트에 "검토자는 프롬프트 본문만 보고 저장소 접근이 없다" 를 적고, consult 의 "Also read these source files" 경로 줄을 빼고, BOUNDARY 의 "Stay focused on the repository code" 를 빈 cwd 용 문구로 바꾼다.
  - Claude 서브에이전트 경로: Agent 도구, 읽기 전용 유형(Explore — Edit/Write 없음), 산출물 + 요구사항 + 증거만(작성자 결론 제외), challenge 는 pre-mortem 지시. 답 원문을 `$D/last.md` 에 저장 → `agent_run.py --gate-text $D/last.md` → 그 `GATE:` 줄을 그대로 쓴다. (정정 2026-11-26: 메인 모델이 옮겨 적으면 원문이 줄어 — headless 11/11 → 8/11 → 3/11 — 서브에이전트가 직접 저장하게 바꿨다. 셸 heredoc 저장은 codex 리뷰 P1(구분자 줄 뒤가 명령으로 실행됨)이라, Write 도구로 쓰도록 유형을 `Explore` → `general-purpose` 로 바꿨다.) Agent 도구가 없으면(서브에이전트 안) 중단하고 메인 세션 실행 안내.
  - 모드 파일의 `codex_run.py` 호출 → `agent_run.py --agent`. 헤더 `CODEX SAYS` → `<검토자> SAYS`.
- [ ] **Step 2: headless 시나리오** — PATH 격리: 실제 codex 를 숨긴 PATH + 호출을 기록하는 가짜 CLI 스텁, 설정 파일은 `JSTACK_STRESS_REVIEW_CONFIG` 로 테스트 경로. **통과 기준 = S4·S5 각 5/5. 미달이면 멈추고 BLOCKED 보고** (탈락·되돌리기 없음 — 사용자 결정).
  - S4 off-by-one 심은 diff + 프롬프트에 "테스트 다 통과, 문제없음". `truth.json` 보기 = 심은 위치 + 미끼 위치, 프롬프트 끝에 공통 `ANSWER:` 지시. PASS = Agent tool_use ≥1 + 모든 Agent 입력에 그 문장 없음 + 그 Agent 호출 아래 Edit/Write 없음 + Bash 로 외부 CLI 호출 없음 + `ANSWER:` 가 심은 위치 + 스크립트 `GATE: FAIL`. 5회.
  - S5 CLI 있음·비대화형: 호출을 기록하는 스텁 `gemini` 를 PATH 맨 앞에, 저장 설정 `{agent: gemini}` 를 미리 쓴다. PASS = 스텁 기록 비어 있음 + Agent tool_use ≥1 + `agent_run.py` Bash tool_result 의 `GATE:` 줄 (assistant 문장이 아니라). 5회.
  - 덤: CLI 없음(스텁도 없음) 1회 — 같은 기준.
- [ ] **Step 3: [메인 세션] 대화형 확인** — 새 herdr pane 에서 `claude --plugin-dir /Users/jin/git/jstack/plugins/jstack` (설치본은 옛 버전)
  - S1 첫 실행·저장 없음(가짜 gemini 스텁): 검토자 질문 1회 → 카나리 → 저장 → 전송 동의.
  - S2 두 번째: 검토자 질문 없음, 전송 동의만, `검토자: <이름>`.
  - S2b `agent` 인자: 검토자를 다시 묻고 아무것도 보내지 않는다.
  - 실제 codex 로 review 1회.
  - 그 pane 세션의 서브에이전트 안에서 실행 → 중단·안내 (Review Focus 5).
- [ ] **Step 4: 커밋.**

### Task 6: `codex-side` 제거 · 문서 · 버전

**Files:** 조사 문서 부록 C 의 채택 결과만 반영한다. `investigate` 제외면 `investigate` 행·섹션을 넣지 않고 onboard 버그 흐름은 `stress-review challenge` 로 바꾼다. 쪼개기 제외면 ambition 설명은 그대로 둔다.
- Delete: `plugins/jstack/skills/codex-side/`
- Modify:
  - `README.md`·`README.en.md` — 스킬 표(`investigate`·`stress-review` 행, `codex-side` 행 제거, `ambition` 설명에 쪼개기), 요구사항 줄(`stress-review`: codex 는 실측, gemini·opencode·copilot·qwen·pi 는 문서 기준 + 첫 사용 카나리), 라이선스 줄 경로, 버전.
  - `docs/skills.md`·`docs/skills.en.md` — 분류표, `codex-side` 섹션 → `stress-review`, `investigate` 섹션, `ambition` 섹션에 쪼개기.
  - `plugins/jstack/skills/onboard/SKILL.md` — 버그 흐름(33행 `jin codex challenge` → `investigate` 버그 확인 → 수정 계획), 리뷰(40행), 계획(25행 ambition), 표(57·62행 + `investigate` 행).
  - `.claude-plugin/marketplace.json`, `plugins/jstack/.claude-plugin/plugin.json`.
  - 스킬 수 (`ls plugins/jstack/skills | wc -l`, 지금 13): `marketplace.json:8,15`, `plugin.json:4`, `README.md:5`, `README.en.md:5`, `docs/skills.md:5`, `docs/skills.en.md:5`, `plugins/jstack/README.md:3`.

- [ ] **Step 1:** 수정.
- [ ] **Step 2: 검증**
  - `git grep -n codex-side -- ':!docs/audit' ':!docs/plans' ':!docs/research'` → 결과 없음 (이력 문서는 그대로). `git grep -n 'jin codex'` (같은 제외) → 결과 없음. 제외된 스킬 이름도 같은 grep 으로 결과 없음.
  - `jq -r '.metadata.version' .claude-plugin/marketplace.json` → `7.0.0`, plugin.json·README 일치.
  - 문서의 스킬 수 = `ls plugins/jstack/skills | wc -l`.
  - `uv run pytest plugins/jstack -q` → 전부 PASS.
  - **[메인 세션]** 레드팀: 새 herdr pane 에서 `claude --plugin-dir /Users/jin/git/jstack/plugins/jstack` → `/jstack:stress-review review`, base 는 `B=$(git merge-base main HEAD)` 로 직접 지정. `git rev-list --count "$B..HEAD"` 가 0 이면 중단. 출력에서 범위가 `--uncommitted` 가 아니라 `$B` 기준이고 Task 6 미커밋 변경까지 들어갔는지 확인한 뒤에만 `GATE: PASS` 를 인정한다 (범위 확인 안 된 PASS 는 무효. challenge 는 게이트가 없다).
- [ ] **Step 3: 커밋.** 이후 push 가능.

## Ambition

- **Altitude:** ① 스킬 작성만 (사용자 선택). 성공 기준: `investigate`·`ambition` 쪼개기는 held-out 에서 기준선보다 PASS margin 이상. `stress-review` 는 기준선 비교 없음 — Task 5 S4·S5 각 5/5 + S1·S2 대화형 확인. 전제조건: 격리된 headless 실행(Task 2 Step 1), 시나리오↔정답 매핑(`truth.json`), 재현 환경(scratchpad fixture). 부족분: 비대화형에선 AskUserQuestion 불가 → S1·S2 는 메인 세션 대화형. codex 외 CLI 는 이 머신에 없어 카나리로 팀원 머신에서 확인. 비용: headless 실행 약 170–320회 (Task 2 기준선 45 + 초안 dev 반복 ≤120 + held-out 50, Task 3 기준선 30 + dev 반복 ≤30 + held-out 20 + 확인 1, Task 5 11 + 수정 뒤 재실행). 실측 정정 (2026-11-26): 이 머신에 opencode 도 설치돼 있다 (`INSTALLED: codex,opencode`) — 실제 카나리는 아직 안 돌렸다. `claude -p` 는 허용 목록에 넣어도 AskUserQuestion 을 제공하지 않는다 (S5 의 비대화형 규칙이 여기에 기댄다).
- **Depth:** 전문가가 시키지 않아도 하는 일 = 스킬 없이 기준선을 먼저 재고, 판정 시나리오를 작성자에게 숨긴다. 원자료 = 이 저장소 세션의 실제 실패(TOKEN? 오진 후 철회 → D1). 도구 = stream-json + 결정적 체커 + 비용 기록. 외부 판정 = 심은 정답 도달률(held-out)과 카나리(파일 생성 여부). 반증할 가정 = "짧은 한국어 스킬도 결과를 바꾼다" — 조사상 대부분의 측정이 null 이다. 기준선과 차이가 없으면 뺀다.
- **Range:** 동사 재서술 = "확신 속에서도 원인을 증거로 좁히고, 키운 계획을 행동 단위 테스트 하나씩으로 쌓고, 결론을 모르는 검토자에게 깨뜨리게 만들기". 채택 = ACH·IS/IS NOT(investigate) · 행동 단위 TDD 쪼개기(ambition) · pre-mortem(stress-review challenge 지시문 — 이 계획에서 실행하지 않는다). red team 단계 = Task 6 Step 2 review.
