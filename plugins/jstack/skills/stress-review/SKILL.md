---
name: stress-review
description: 작성자가 아닌 독립 검토자(설치된 외부 AI CLI — codex·gemini·opencode·copilot·qwen·pi — 또는 Claude 서브에이전트)에게 2차 의견을 받는다 — 현재 diff 코드 리뷰(review, P0/P1 게이트), 깨뜨리기 위한 적대적 검증·pre-mortem(challenge), 자유 질문·계획 검토(consult). 검토자는 읽기 전용으로 돌고, Claude 가 검토자 의견과 자기 의견을 비교해 권고 한 줄을 낸다. "jin stress", "stress review", "스트레스 리뷰", "codex review", "codex challenge", "codex 에게 물어봐", "gemini 에게 물어봐", "2차 의견", "second opinion", "교차 검토", "다른 모델 의견", "레드팀", "pre-mortem" 요청이나, 머지 전 독립 리뷰가 필요하거나 설계·계획을 다른 AI 로 검증하고 싶거나 검토자를 바꾸고 싶을 때 사용한다.
argument-hint: "[review [focus] | challenge [focus] | agent | <질문>]"
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion, Agent
---

# stress-review

작성자가 쓴 것을 작성자가 검토하면 같은 맹점을 다시 지나친다. 이 스킬은 독립 검토자를 불러 의견을 받고, 검토자 답은 그대로 보여준 뒤 Claude 의 판단을 그 뒤에 덧붙인다.

**전제:** `python3`, git. 검토자는 설치된 CLI 하나 또는 Claude 서브에이전트.
**비용·외부 전송:** 외부 CLI 는 그 제공사에 유료 호출을 보낸다 → Step 4 동의 없이는 호출하지 않는다. Claude 서브에이전트는 외부 전송이 아니다.

## 모드

| 입력 | 모드 | 상세 |
|------|------|------|
| `review [focus]` | 현재 변경 코드 리뷰 + 게이트 | [review.md](review.md) |
| `challenge [focus]` | 적대적 검증 + pre-mortem | [challenge.md](challenge.md) |
| `agent` | 검토자 다시 고르기 (Step 1 status → Step 2 선택 → 카나리 → 저장) 후 끝낸다. diff·계획·질문은 아무것도 보내지 않는다 | — |
| 그 외 텍스트 | 질문·계획 검토, 후속 대화 | [consult.md](consult.md) |
| (인자 없음) | 변경 있으면 review/challenge/질문 중 선택, 없으면 질문 받기 | — |

`agent` 는 첫 단어 예약어다 — 뒤에 글이 더 있어도 consult 로 넘기지 않는다. 모드는 한 번에 하나. 정해진 모드의 파일만 읽고, 그 안에서 검토자에 맞는 경로 하나만 따른다. 하위 파일의 `${CLAUDE_SKILL_DIR}` 는 치환되지 않으므로 이 스킬의 base directory(로드 시 표시) 절대경로로 바꿔 실행한다.

## 검토자

| 검토자 | 읽는 범위 | 근거 |
|--------|-----------|------|
| `codex` | 저장소 루트 전체, read-only 샌드박스 | 실측 |
| `gemini` · `opencode` · `copilot` · `qwen` · `pi` | 프롬프트 본문만 넘긴다 — 빈 임시 폴더에서 돈다 (cwd·`PWD`). OS 샌드박스는 아니라서 CLI 가 절대경로를 읽는 것까지 막지는 못한다 | 문서 기준, 실측 없음 → 카나리 |
| `claude` (서브에이전트) | 저장소 (읽기 전용 유형 `Explore` — Edit/Write 는 없지만 Bash 는 있어 읽기 전용은 지시 수준이다) | 외부 전송 없음 |

읽기 전용 플래그와 금지 플래그(`--dangerously-*`, `--yolo`, 에이전트별 목록)는 스크립트가 붙이고 막는다. 명령을 손으로 조립하지 않는다 — 그러면 그 보호가 빠진다.

## Step 1: 사전 점검

아래 블록을 그대로 실행한다 (무료, 모델 호출 없음):

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/reviewer_config.py" status
if codex login status >/dev/null 2>&1; then echo "CODEX_AUTH: ok"
elif [ -n "${CODEX_API_KEY:-}${OPENAI_API_KEY:-}" ]; then echo "CODEX_AUTH: env"
else echo "CODEX_AUTH: missing"; fi
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) && echo "ROOT: $ROOT" || echo "ROOT: none"
BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
[ -z "$BASE" ] && for b in main master; do git rev-parse --verify -q "$b" >/dev/null && BASE=$b && break; done
echo "BASE: ${BASE:-none}"
[ -n "$BASE" ] && echo "AHEAD: $(git rev-list --count "$BASE..HEAD" 2>/dev/null)"
echo "DIRTY: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
```

`status` 출력: `SAVED`(저장된 검토자 | none), `INSTALLED`(PATH 에 있는 지원 CLI | none), `VALID`(yes|no), `RECHECK`(yes|no).

- `CODEX_AUTH` 는 검토자가 `codex` 일 때만 본다. `missing` → 중단, "`codex login` 또는 `CODEX_API_KEY` 설정 후 다시 실행" 안내.
- `ROOT: none` → review·challenge 불가 (diff 가 없다). consult 만 가능하고 `codex` 는 쓸 수 없다 (저장소 루트가 필요) → 다른 검토자를 고르게 한다.
- 사용자가 base 브랜치를 지정했으면 그 값을 `BASE` 로 쓴다 (아래 검증 통과 시).

### 사용자 지정값 검증

base·커밋 sha·모델·effort 는 명령 인자로 들어가므로 쓰기 전에 검증한다. 값은 따옴표 붙은 heredoc 으로만 넘긴다 (셸 확장 없음). 종료코드 0 이 아니면 그 값을 거부하고 사용자에게 다시 묻는다.

- base: `[A-Za-z0-9][A-Za-z0-9._/-]*` + `git rev-parse --verify -q "<BASE>^{commit}"` 성공
- sha: `[0-9a-f]{7,40}` + 같은 rev-parse 성공
- 모델 (`--model`): `[A-Za-z0-9][A-Za-z0-9._:/@-]*`
- effort (`--effort`, codex 전용 — 다른 CLI 에선 조용히 무시된다): `minimal|low|medium|high|xhigh`

```bash
python3 -c 'import re,sys; sys.exit(0 if re.fullmatch(sys.argv[1], sys.stdin.read().rstrip("\n")) else 1)' '<패턴>' <<'JIN_ARG_END'
<사용자 값>
JIN_ARG_END
```

줄바꿈이 든 값은 heredoc 을 만들기 전에 거부한다 — `JIN_ARG_END` 줄이 섞이면 heredoc 이 일찍 끝나 뒷줄이 셸 명령으로 실행된다. rev-parse 는 패턴 통과 후에만 실행한다. 자동 감지한 `BASE` 는 검증 불필요. 스크립트도 같은 값을 다시 거르지만 (종료코드 2), 셸은 그 전에 값을 해석하므로 이 검증을 건너뛰지 않는다.

## Step 2: 검토자 결정

선택은 사용자 전역(`~/.claude/.jstack-stress-review`)에 저장되어 다음 실행부터 묻지 않는다.

| 상황 | 행동 |
|------|------|
| `VALID: yes`, `RECHECK: no`, 인자가 `agent` 아님 | `SAVED` 를 그대로 쓴다. 묻지 않는다 |
| `VALID: no` (첫 실행 · 저장한 CLI 가 사라짐) | 묻는다 |
| `RECHECK: yes` (CLI 버전이 바뀜) | 묻는다 — 버전이 바뀌면 읽기 전용 동작도 바뀔 수 있다 |
| 인자가 `agent` | 묻는다 |
| AskUserQuestion 도구가 없다 (비대화형 `claude -p` 등) | 선택도 전송 동의도 물을 수 없다 → 외부 CLI 에 검토를 보내지 않고 **이번 실행만** Claude 서브에이전트로 검토한다 (Step 1 의 설치·버전 확인은 그대로 돈다 — 내용 전송 없음). 저장된 선택이 있어도 같다. `set`·`canary` 를 실행하지 않는다. 첫 줄은 `검토자: claude (비대화형 — 저장된 <이름> 대신)`. 멈추거나 "동의 대기"로 끝내지 않는다 |

**묻기:** AskUserQuestion 은 선택지 2–4개만 받는다.
- `INSTALLED: none` → 묻지 않는다. 고를 것이 서브에이전트뿐이다 — 이번 실행은 `claude` 로 하고 그렇게 알린다. 저장(`set`)하지 않는다 — 저장하면 나중에 CLI 를 깔아도 다시 묻지 않게 된다.
- 설치된 CLI 1–3개 → 선택지 = 각 CLI + `Claude 서브에이전트`.
- 4개 이상 → 앞의 3개 + `Claude 서브에이전트`, 나머지 이름은 질문 문구에 적고 직접 입력("Other")으로 받는다.
- 각 선택지에 위 표의 "읽는 범위"를 한 줄로 적는다. codex·claude 외 CLI 는 "고르면 그 CLI 로 카나리 호출 1회가 나간다 (저장소 내용 없음)" 도 적는다.
- 답이 `codex|gemini|opencode|copilot|qwen|pi|claude` 가 아니면 셸에 넣지 않고 다시 묻는다.

**저장 (카나리 포함):** `set` 이 카나리가 필요한 CLI(codex·claude 외)면 먼저 카나리를 돌리고, 통과해야 저장한다. 카나리 = 빈 임시 폴더에서 "파일을 만들어라"를 시켜 파일이 생기면 거부. 문서로만 확인한 CLI 라서 실제로 쓰기를 못 하는지 본다. Bash `timeout: 180000` (스크립트 한도 120초).

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/reviewer_config.py" set "<이름>"
```

- `CANARY: pass …` + `SAVED: <이름>` (종료 0) → 그 검토자를 쓴다.
- `CANARY: fail <이유>` (종료 1) → 저장되지 않았다. 이유를 보여주고 다른 검토자를 고르게 한다.
- `RECHECK: yes` 에서 같은 CLI 를 다시 골라도 `set` 을 실행한다 — 카나리를 다시 돌리고 새 버전을 기록한다.
- 카나리만 따로 보려면 `reviewer_config.py canary "<이름>"`.

`<이름>` 은 `codex|gemini|opencode|copilot|qwen|pi|claude` 중 하나. 인자가 `agent` 뿐이었으면 `SAVED: <이름>` 을 알리고 끝낸다.

이후 모든 출력의 첫 줄에 `검토자: <이름>` 을 표시한다 — 누가 봤는지 모르면 결과를 얼마나 믿을지 정할 수 없다.

## Step 3: 모드 결정

`$ARGUMENTS` 첫 단어로 결정 (위 표). 인자가 없으면:
- `AHEAD > 0` 또는 `DIRTY > 0` → AskUserQuestion: A) diff 리뷰 B) diff 적대적 검증 C) 직접 질문
- 변경 없음 → "검토자에게 무엇을 물어볼까요?" 질문

## Step 4: 전송 동의 (외부 CLI 는 매번 필수)

검토자가 `claude` 면 이 단계를 건너뛴다 (외부 전송이 아니다). 동의를 물을 도구가 없으면 Step 2 표대로 서브에이전트로 간다 — 동의 없이 외부 CLI 를 부르지 않는다. 외부 CLI 는 저장된 선택이 있어도 **호출마다** AskUserQuestion 으로 확인한다 — 무엇이 나가는지는 호출마다 다르기 때문이다. 질문에 다음을 명시:

- `검토자: <이름>`, 모드와 범위 (예: `main...HEAD` 의 diff N 커밋 / 미커밋 변경 / 질문 요약)
- 검토자가 받는 것 — cwd 에 맞게:
  - `codex`: 프롬프트 + 저장소 전체 **읽기** 권한 (read-only 샌드박스) → OpenAI 로 전송
  - 그 외 CLI: **프롬프트 내용(diff·계획·질문)만** 넘긴다. 빈 임시 폴더에서 돌아 저장소 경로를 받지 않는다 (OS 샌드박스는 아니다 — CLI 가 스스로 절대경로를 읽는 것까지는 막지 못한다)
- 유료 호출이며 최대 약 9분 걸릴 수 있음

선택지: `보내기` / `취소`. review 에서 `AHEAD > 0` 이고 `DIRTY > 0` 이면 `미커밋 변경만 리뷰` 선택지를 추가한다. 취소면 아무것도 보내지 않고 끝낸다.

## Step 5: 실행

### 검토자에게 넘기는 것

- **넘긴다:** 요구사항(이 변경이 무엇을 해야 하는가), 증거(diff, 계획 본문, 테스트 출력), 사용자 질문·focus 원문.
- **넘기지 않는다:** 작성자(Claude·사용자)의 결론과 자기평가 — "이 수정은 안전하다", "테스트는 충분하다", "X 는 이미 확인했다". 결론을 받은 검토자는 그것을 확인하는 쪽으로 기운다. 추론은 빼고 증거는 남긴다.
- 그 외 CLI 에는 diff·계획 본문만 붙인다. 소스 파일 전체를 덧붙이지 않는다 — 동의받은 전송 범위를 넓히는 일이다.

### 외부 CLI — `agent_run.py`

모든 외부 CLI 호출은 `${CLAUDE_SKILL_DIR}/scripts/agent_run.py --agent <이름>` 을 **실행**해서 한다 (읽을 필요 없음). 이 스크립트가:
- 검토자별 읽기 전용 명령을 만들어 실행하고, 540초 넘으면 끊는다 (macOS 에 GNU `timeout` 이 없어서 내장)
- `codex` 는 현재 디렉터리(저장소 루트)에서, 그 외 CLI 는 빈 임시 폴더에서 돌린다
- 자기 stdin 을 검토자에게 넘긴다. `--boundary` 면 경계 지시문을 앞에 붙인다 (아래)
- transcript 를 `--log` 파일에 쓴다
- stdout 에 상태 블록만 출력: `STATUS`(ok|timeout|failed|turn_failed|no_completion|empty|nested), `AGENT_EXIT`, `TOKENS`(codex 외는 `unknown`), `SESSION_ID`(codex), turn 실패 시 `TURN_FAILED`, `--gate` 면 `GATE`, 원인 추정 시 `HINT`, 실패 시 `STDERR` 발췌, 명령을 못 찾거나 `--log` 디렉터리가 없으면 `ERROR` (후자는 실행 전에 멈춤)

| 인자 | 뜻 |
|------|-----|
| `--agent <이름>` | 검토자 CLI |
| `--mode exec\|review\|resume` | 기본 `exec`. `review`·`resume` 은 **codex 전용** (다른 CLI 는 종료코드 2) |
| `--scope base:<BASE>\|uncommitted\|commit:<sha>` | `--mode review` 범위 (codex 전용) |
| `--session <ID>` | `--mode resume` 대상 (codex 전용) |
| `--out <파일>` | 최종 답 저장 (codex 전용 — 다른 CLI 에선 무시된다) |
| `--model`, `--effort` | 검증(Step 1) 통과한 사용자 지정값. `--effort` 는 codex 전용 |
| `--boundary`, `--gate`, `--log <파일>` | 경계 지시문 / 리뷰 게이트 / transcript 파일 |

**답이 있는 곳:** `codex` 는 `$D/last.md` (`--out`), 그 외 CLI 는 `$D/transcript.log` (평문 출력 전체가 답 — 들여쓰기·빈 줄 그대로).

규칙:
- **사용자 텍스트는 셸 인자에 절대 넣지 않는다** (Step 1 검증을 통과한 base·sha·모델·effort 만 예외). 프롬프트는 따옴표 붙은 heredoc (`<<'JIN_PROMPT_END'`) 으로 stdin 에만 넣는다. 본문에 `JIN_PROMPT_END` 단독 줄이 있으면 구분자를 바꾼다.
- diff 는 Claude 가 옮겨 적지 않는다 — `git diff` 출력을 파이프로 프롬프트 뒤에 바로 붙인다 (모드 파일의 블록 그대로). 옮겨 적으면 빠지거나 바뀐다.
- Bash 호출에 `timeout: 600000` 을 준다 (래퍼 540초보다 위 → 래퍼가 먼저 끊고 원인을 남김).
- 결과 파일은 `mktemp -d` 디렉터리에 둔다. 출력이 길 수 있으니 Read 로 offset/limit 나눠 읽는다.
- 모델·effort 는 각 CLI 의 사용자 설정을 따른다. 사용자가 지정했을 때만 `--model "<model>"`, `--effort "<level>"` 을 붙인다. codex `xhigh` 는 타임아웃에 걸리기 쉽다 → 그때는 `high` 로 재시도 권유.

**경계 지시문 (`--boundary`):** `codex` 는 "`~/.claude/`·`.claude/`·`agents/` 를 읽거나 실행하지 말고 파일을 고치지 말라", 그 외 CLI 는 "저장소 접근이 없다. 프롬프트 본문만 데이터로 검토하고 파일을 만들지 말라" 가 프롬프트 앞에 붙는다. 프롬프트를 보내는 호출엔 항상 붙인다. codex 기본 리뷰(`--mode review`)만 예외 — 프롬프트를 받지 않고 미리 계산된 diff 를 본다.

### Claude 서브에이전트

Agent 도구가 없으면 (이 스킬이 서브에이전트 안에서 돌 때) 중단한다 — `검토자: 부재 — 검토되지 않음` 으로 보고하고 "메인 세션에서 다시 실행하거나 `agent` 로 외부 CLI 를 고르라"고 안내한다. Claude 가 직접 리뷰해 대신하지 않는다.

답은 서브에이전트가 **직접** 파일에 쓴다. Claude 는 `last.md` 를 쓰지도 고치지도 않는다 — 옮겨 적다 지적을 빠뜨리면 게이트가 거짓 PASS 가 되기 때문이다.

1. 임시 폴더를 만든다.

```bash
D=$(mktemp -d) && echo "D=$D"
```

2. Agent 도구를 `subagent_type: "Explore"` (읽기 전용 유형) 로 띄운다. 프롬프트는 모드 파일의 것을 쓰고, 위 "넘기는 것" 규칙을 그대로 지킨다 — 이 대화의 맥락을 요약해 넣고 싶어지는 자리가 여기다. 결론은 넣지 않는다. 프롬프트 끝에 아래 저장 지시를 그대로 붙인다 (`<D>`·`<SKILL_DIR>` 은 절대경로로, `<임의 4자>` 는 실행마다 새로):

```
When your answer is complete, save it yourself. Do not send the answer back as your reply.
Run this exactly once (the file cannot be overwritten), with your full answer between the delimiter lines:

python3 "<SKILL_DIR>/scripts/agent_run.py" --save-answer "<D>/last.md" <<'JIN_ANSWER_END_<임의 4자>'
<your full answer, exactly as it should be read>
JIN_ANSWER_END_<임의 4자>

Reply with only the STATUS and GATE lines the command printed.
```

3. `<D>/last.md` 를 Read 로 읽어 답으로 쓴다. 파일이 없으면 서브에이전트 실패다 → `검토자: 부재 — 검토되지 않음` (서브에이전트의 회신 글을 답으로 대신 쓰지 않는다).
4. review 모드면 같은 P0/P1 게이트를 스크립트로 판정한다. 게이트 줄은 이 출력만 쓴다 — Claude 가 답을 읽고 직접 판정하지 않고, 서브에이전트가 회신한 GATE 줄도 쓰지 않는다.

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/agent_run.py" --gate-text "<D 절대경로>/last.md"
```

출력: `STATUS: ok|empty`, `GATE: …`.

## Step 6: 결과 제시

1. **검토가 안 됐으면 통과로 보고하지 않는다** — 빠진 검토는 깨끗한 검토가 아니다.
   - 검토자가 돌지 못함 (선택 안 함, `STATUS: nested`, CLI 없음, 서브에이전트 실패) → `검토자: 부재 — 검토되지 않음`.
   - 돌았지만 `STATUS` 가 ok 가 아님 → `FAIL (fail-closed: <STATUS>)` 와 아래 오류 처리. 검토자 답으로 포장하지 않는다.
   - 어느 쪽이든 Claude 가 대신 리뷰해 그 결과를 게이트로 내지 않는다.
2. 답을 **원문 그대로** 보여준다 (요약·잘라내기 금지):

```
검토자: <이름>
<이름 대문자> SAYS (<mode>):
════════════════════════════════════════════════════════════
<답 원문>
════════════════════════════════════════════════════════════
Tokens: <TOKENS>
```

3. **Claude 의견** — 검토자와 동의/반대하는 지점을 구체적으로 짚는다: "Claude 는 X 에 반대 — 이유 Y". 이 대화에서 Claude 가 이미 리뷰했다면 겹친 것 / 검토자만 / Claude 만 찾은 것을 나눠 보여준다. 같은 리뷰를 다시 하지는 않는다.
4. **권고 한 줄 (필수, 생략 금지):**

```
Recommendation: <행동> because <가장 실행 가치 높은 지적을 다른 선택지(다른 지적, 고치기 vs 배포, 순서, 현상유지)와 비교한 한 줄 이유>
```

"좋아서", "검토자가 뭔가 찾아서" 같은 상투적 이유는 불합격. 자동 결정하지 말고 사용자가 고르게 한다.

5. `codex` transcript 에 `SKILL.md`, `.claude/`, `~/.agents` 를 읽은 흔적(`[codex ran] cat .../SKILL.md` 등)이 있으면 "검토자가 코드 대신 스킬 파일을 읽었을 수 있음 — 재시도 권장" 경고를 붙인다.
6. 정리: 실행 블록이 출력한 `D=<경로>` 의 절대경로로 `rm -rf "<경로>"` (Bash 호출 간 셸 변수는 유지되지 않음). 프롬프트·diff 사본 제거.

## 오류 처리

| 신호 | 의미 / 대응 |
|------|-------------|
| `STATUS: nested` | Codex 세션 안에서 실행 중. 외부 검토자 호출 불가 → 부재로 보고하고 중단 |
| `STATUS: timeout` | 540초 초과. 범위를 줄이거나 effort 를 낮춰 재시도 |
| `STATUS: failed` + `HINT: 인증` | 그 CLI 의 로그인 재실행 안내 (codex 는 `codex login`) |
| `STATUS: failed` + `ERROR: 명령을 찾을 수 없음` | 저장한 CLI 가 사라짐 → `agent` 로 검토자를 다시 고른다 |
| 종료코드 2 + `usage:` | 인자 오류 (`--mode review\|resume` 을 다른 CLI 에 줌, 검증 안 된 값). 인자를 고친다 — 호출은 나가지 않았다 |
| 종료코드 2 + `ERROR: … 저장된 검토자가 아니다` | 카나리 대상 CLI 가 저장돼 있지 않거나 버전이 바뀌었다. `reviewer_config.py set <이름>` (카나리 포함) 뒤 다시 실행 — 호출은 나가지 않았다 |
| `STDERR` 에 `model ... not supported` / `404 ... does not exist` | 모델 설정 문제. 그 CLI 설정이나 `--model` 값을 고치라고 안내. 통과로 보고하지 않음 |
| `requires a newer version of Codex` | `codex update` 안내 |
| `turn_failed` / `no_completion` / `empty` | 검토자가 답을 끝내지 못함. 결과 없음으로 보고, 재시도 제안 |

## 규칙

- 이 스킬은 저장소 파일을 수정하지 않는다. 검토자도 읽기 전용.
- 검토자 답은 원문 → Claude 의견은 그 뒤. 의견이 원문을 대체하지 않는다.
- 호출은 모드당 1회가 기본. 질문은 한 번에 묶어 보낸다.

---
Adapted from gstack `/codex` (MIT, Copyright (c) 2026 Garry Tan) — 전문은 [LICENSE-gstack](LICENSE-gstack).
