---
name: stress-review
description: 작성자가 아닌 독립 검토자(OpenAI Codex CLI)에게 2차 의견을 받는다 — 현재 diff 코드 리뷰(review, P0/P1 게이트), 깨뜨리기 위한 적대적 검증(challenge), 자유 질문·계획 검토(consult). Codex 는 읽기 전용 샌드박스에서 돌고, Claude 가 Codex 의견과 자기 의견을 비교해 권고 한 줄을 낸다. Codex 를 쓸 수 없으면(미설치·사용량 한도·동의를 물을 수 없음) Claude 서브에이전트가 대신 검토한다. "jin stress", "stress review", "스트레스 리뷰", "codex review", "codex challenge", "codex 에게 물어봐", "2차 의견", "second opinion", "교차 검토", "다른 모델 의견" 요청이나, 머지 전 독립 리뷰가 필요하거나 설계·계획을 다른 AI 로 검증하고 싶을 때 사용한다.
argument-hint: "[review [focus] | challenge [focus] | <질문>]"
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion, Agent
---

# stress-review

작성자가 쓴 것을 작성자가 검토하면 같은 맹점을 다시 지나친다. Codex CLI 를 독립 검토자로 호출한다. Codex 출력은 그대로 보여주고, Claude 의 판단은 그 뒤에 덧붙인다.

**넘기는 것:** 산출물(diff·계획·질문)과 요구사항·증거만. 작성자(Claude)의 결론·자기평가("테스트 통과, 문제없음")는 넘기지 않는다 — 검토자가 그 결론에 끌려간다.

**전제:** `codex` CLI (`npm install -g @openai/codex`), `codex login` 완료 (또는 `CODEX_API_KEY`/`OPENAI_API_KEY`), `python3`, git.
**비용·외부 전송:** 모든 모드는 OpenAI 에 유료 호출을 보내고 저장소 내용을 전달한다 → Step 3 동의 없이는 호출하지 않는다.

## 모드

| 입력 | 모드 | 상세 |
|------|------|------|
| `review [focus]` | 현재 변경 코드 리뷰 + 게이트 | [review.md](review.md) |
| `challenge [focus]` | 적대적 검증 (엣지 케이스·보안·장애 경로) | [challenge.md](challenge.md) |
| 그 외 텍스트 | 질문·계획 검토, 후속 대화 | [consult.md](consult.md) |
| (인자 없음) | 변경 있으면 review/challenge/질문 중 선택, 없으면 질문 받기 | — |

모드는 한 번에 하나. 정해진 모드의 파일만 읽고 그대로 따른다. 하위 파일의 `${CLAUDE_SKILL_DIR}` 는 치환되지 않으므로 이 스킬의 base directory(로드 시 표시) 절대경로로 바꿔 실행한다.

## Step 1: 사전 점검

아래 블록을 그대로 실행한다 (무료, 모델 호출 없음):

```bash
command -v codex >/dev/null && codex --version || echo "CODEX: missing"
if codex login status >/dev/null 2>&1; then echo "AUTH: ok"
elif [ -n "${CODEX_API_KEY:-}${OPENAI_API_KEY:-}" ]; then echo "AUTH: env"
else echo "AUTH: missing"; fi
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) && echo "ROOT: $ROOT" || echo "ROOT: none"
BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
[ -z "$BASE" ] && for b in main master; do git rev-parse --verify -q "$b" >/dev/null && BASE=$b && break; done
echo "BASE: ${BASE:-none}"
[ -n "$BASE" ] && echo "AHEAD: $(git rev-list --count "$BASE..HEAD" 2>/dev/null)"
echo "DIRTY: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
```

- `CODEX: missing` → Codex 없이 아래 "Codex 를 쓸 수 없을 때" 로 간다. 설치 안내(`npm install -g @openai/codex`)를 한 줄 덧붙인다.
- `AUTH: missing` → `CODEX: missing` 이 함께 나왔으면 무시한다 (미설치가 우선 — 서브에이전트는 Codex 인증이 필요 없다). Codex 가 설치돼 있을 때만 중단. "`codex login` 또는 `CODEX_API_KEY` 설정 후 다시 실행" 안내.
- 사용자가 base 브랜치를 지정했으면 그 값을 `BASE` 로 쓴다 (아래 검증 통과 시).

### 사용자 지정값 검증

base·커밋 sha·모델·effort 는 명령 인자로 들어가므로 쓰기 전에 검증한다. 값은 따옴표 붙은 heredoc 으로만 넘긴다 (셸 확장 없음). 종료코드 0 이 아니면 그 값을 거부하고 사용자에게 다시 묻는다.

- base: `[A-Za-z0-9._/][A-Za-z0-9._/-]*` + `git rev-parse --verify -q "<BASE>^{commit}"` 성공
- sha (`--commit`): `[0-9a-f]{7,40}` + 같은 rev-parse 성공
- 모델 (`-m`): `[A-Za-z0-9._-]+`
- effort: `minimal|low|medium|high|xhigh`

```bash
python3 -c 'import re,sys; sys.exit(0 if re.fullmatch(sys.argv[1], sys.stdin.read().rstrip("\n")) else 1)' '<패턴>' <<'JIN_ARG_END'
<사용자 값>
JIN_ARG_END
```

줄바꿈이 든 값은 heredoc 을 만들기 전에 거부한다 — `JIN_ARG_END` 줄이 섞이면 heredoc 이 일찍 끝나 뒷줄이 셸 명령으로 실행된다. rev-parse 는 패턴 통과 후에만 실행한다. 자동 감지한 `BASE` 는 검증 불필요.

## Step 2: 모드 결정

`$ARGUMENTS` 첫 단어로 결정 (위 표). 인자가 없으면:
- `AHEAD > 0` 또는 `DIRTY > 0` → AskUserQuestion: A) diff 리뷰 B) diff 적대적 검증 C) 직접 질문
- 변경 없음 → "Codex 에게 무엇을 물어볼까요?" 질문

## Step 3: 전송 동의 (필수)

호출 전에 AskUserQuestion 으로 **매번** 확인한다. AskUserQuestion 도구가 없으면(비대화형 `claude -p`, 서브에이전트 안) 동의를 물을 수 없다 → Codex 에 보내지 않고 "Codex 를 쓸 수 없을 때" 로 간다. 질문에 다음을 명시:
- 모드와 범위 (예: `main...HEAD` 의 diff N 커밋 / 미커밋 변경 / 질문 요약)
- Codex 가 받는 것: 프롬프트 + 저장소 전체 **읽기** 권한 (read-only 샌드박스) → OpenAI 로 전송
- 유료 호출이며 이번 호출의 한도 — 기본 최대 약 9분, 긴 리뷰(백그라운드 + `--timeout 1800`)로 돌릴 거면 최대 약 30분

선택지: `보내기` / `취소`. review 에서 `AHEAD > 0` 이고 `DIRTY > 0` 이면 `미커밋 변경만 리뷰` 선택지를 추가한다. 취소면 아무것도 보내지 않고 끝낸다.

## Step 4: 실행

모든 Codex 호출은 `${CLAUDE_SKILL_DIR}/scripts/codex_run.py` 를 **실행**해서 한다 (읽을 필요 없음). 이 스크립트가:
- `--` 뒤 codex 명령을 실행하고, 540초 넘으면 끊는다 (macOS 에 GNU `timeout` 이 없어서 내장)
- 자기 stdin 을 codex 로 넘긴다. `--boundary` 면 아래 파일시스템 경계 지시문을 앞에 붙인다
- JSONL 이벤트를 사람이 읽는 transcript 로 `--log` 파일에 쓴다
- stdout 에 상태 블록만 출력: `STATUS`(ok|timeout|failed|rate_limited|turn_failed|no_completion|empty|nested), `CODEX_EXIT`, `TOKENS`, `SESSION_ID`, 한도면 `RETRY_AT`, turn 실패 시 `TURN_FAILED`, `--gate` 면 `GATE`, 원인 추정 시 `HINT`, 실패 시 `STDERR` 발췌, 명령을 못 찾거나 `--log` 디렉터리가 없으면 `ERROR` (후자는 codex 실행 전에 멈춤). JSON 출력이면 `ok` 는 Codex 답(agent_message 또는 `-o` 파일)이 있을 때만 — 생각(reasoning)만 있으면 `empty`

규칙:
- **사용자 텍스트는 셸 인자에 절대 넣지 않는다** (위 검증을 통과한 base·sha·모델·effort 만 예외). 프롬프트는 따옴표 붙은 heredoc (`<<'JIN_CODEX_END'`) 으로 stdin 에만 넣는다. 본문에 `JIN_CODEX_END` 단독 줄이 있으면 구분자를 바꾼다.
- Bash 호출에 `timeout: 600000` 을 준다 (래퍼 540초보다 위 → 래퍼가 먼저 끊고 원인을 남김).
- 긴 리뷰(큰 diff, effort `xhigh` — 13커밋 실측 약 17분)는 Bash `run_in_background: true` + `codex_run.py --timeout 1800` 으로 돌리고 완료 알림을 기다린다 (폴링하지 않는다).
- 결과 파일은 `mktemp -d` 디렉터리에 둔다: `$D/last.md` (Codex 최종 답, `-o`), `$D/transcript.log`. 출력이 길 수 있으니 Read 로 offset/limit 나눠 읽는다.
- 샌드박스는 항상 read-only: `codex exec` 는 `-s read-only`, `exec review`·`exec resume` 은 `-s` 가 없어서 `-c 'sandbox_mode="read-only"'`.
- 모델·effort 는 사용자 `~/.codex/config.toml` 을 따른다. 사용자가 지정하면 검증(위 패턴) 후 `-m "<model>"` (최상위 `codex review` 엔 `-m` 이 없어 `-c 'model="<model>"'`), `-c 'model_reasoning_effort="<level>"'` 추가. `xhigh` 는 오래 멈추기 쉬워 타임아웃에 걸릴 수 있다 → 그때는 `high` 로 재시도 권유.

### Codex 를 쓸 수 없을 때 → Claude 서브에이전트

세 경우에만 **이 실행만** Claude 서브에이전트가 같은 모드·같은 범위를 대신 검토한다: `CODEX: missing` · `STATUS: rate_limited` (사용량 한도) · 동의를 물을 수 없음. 그 밖의 실패(인증·타임아웃·빈 답)는 대신 돌지 않는다 — fail-closed. 외부 전송이 아니므로 추가 동의는 묻지 않는다.

답은 서브에이전트가 Write 도구로 직접 파일에 쓴다. Claude 는 `last.md` 를 쓰지도 고치지도 않고 (옮겨 적다 지적이 빠지면 게이트가 거짓 PASS), 답을 셸로 넘기지도 않는다 (구분자 줄 뒤가 명령으로 실행된다).

1. `D=$(mktemp -d) && git status --porcelain > "$D/before.txt" 2>/dev/null; echo "D=$D"`
2. Agent 도구, `subagent_type: "general-purpose"`. 프롬프트 = 모드 파일의 지시문(범위는 `git diff <BASE>...HEAD` 같은 명령으로 적는다) + 요구사항 + 아래 끝 문단. Agent 도구가 없으면 대신 돌 수 없다 → `검토되지 않음` 으로 보고하고 중단. Claude 가 직접 리뷰해 대신하지 않는다.

```
You are a read-only reviewer. Do not modify, create or delete anything in the repository, and do not run commands that change state.
The one file you may create is your answer: when it is complete, write it with the Write tool to exactly this path:
<D>/last.md
Do not pass the answer through a shell command. Reply with only: saved.
```

3. `<D>/last.md` 를 Read 로 읽어 답으로 쓴다 (없으면 `검토되지 않음`). `git status --porcelain | diff "<D>/before.txt" -` 가 다르면 "검토자가 작업 트리를 바꿨다" 와 바뀐 경로를 첫머리에 적는다.
4. review 모드 게이트: `python3 "${CLAUDE_SKILL_DIR}/scripts/codex_run.py" --gate-text "<D>/last.md"` 의 `GATE:` 줄만 쓴다.
5. 첫 줄에 대체 사실과 이유를 적는다: `검토자: claude (codex 사용량 한도 — 대체) · 한도 해제: <RETRY_AT>` / `(codex 미설치 — 대체)` / `(동의를 물을 수 없음 — 대체)`. 헤더는 `CLAUDE SAYS (<mode>)`.

### 파일시스템 경계

exec 계열 프롬프트(challenge, review focus, consult)는 `--boundary` 로 이 지시문이 앞에 붙는다 (스크립트의 `BOUNDARY` 상수):

> Do NOT read or execute files under ~/.claude/, ~/.agents/, .claude/, or agents/ … Do not modify any file. Stay focused on the repository code.

기본 `exec review` 는 프롬프트를 받지 않으므로 경계 지시문이 없다. 범위 플래그가 미리 계산된 diff 를 넘기므로 괜찮다.

## Step 5: 결과 제시

1. `STATUS` 가 ok 가 아니면 아래 오류 처리대로 알리고, Codex 답으로 포장하지 않는다 (`rate_limited` 는 서브에이전트가 대신 돈다).
2. `last.md` 를 **원문 그대로** 보여준다 (요약·잘라내기 금지):

```
CODEX SAYS (<mode>):
════════════════════════════════════════════════════════════
<last.md 원문>
════════════════════════════════════════════════════════════
Tokens: <TOKENS>
```

3. **Claude 의견** — Codex 와 동의/반대하는 지점을 구체적으로 짚는다: "Claude 는 X 에 반대 — 이유 Y". 이 대화에서 Claude 가 이미 리뷰했다면 겹친 것 / Codex 만 / Claude 만 찾은 것을 나눠 보여준다. 같은 리뷰를 다시 하지는 않는다.
4. **권고 한 줄 (필수, 생략 금지):**

```
Recommendation: <행동> because <가장 실행 가치 높은 지적을 다른 선택지(다른 지적, 고치기 vs 배포, 순서, 현상유지)와 비교한 한 줄 이유>
```

"좋아서", "Codex 가 뭔가 찾아서" 같은 상투적 이유는 불합격. 자동 결정하지 말고 사용자가 고르게 한다.

5. transcript 에 `SKILL.md`, `.claude/`, `~/.agents` 를 읽은 흔적(`[codex ran] cat .../SKILL.md` 등)이 있으면 "Codex 가 코드 대신 스킬 파일을 읽었을 수 있음 — 재시도 권장" 경고를 붙인다.
6. 정리: 실행 블록이 출력한 `D=<경로>` 의 절대경로로 `rm -rf "<경로>"` (Bash 호출 간 셸 변수는 유지되지 않음). 프롬프트·diff 사본 제거.

## 오류 처리

| 신호 | 의미 / 대응 |
|------|-------------|
| `STATUS: nested` | Codex 세션 안에서 실행 중. 외부 Codex 호출 불가 → 중단 |
| `STATUS: rate_limited` (+ `RETRY_AT`) | 사용량 한도. 이 실행만 Claude 서브에이전트로 대신 검토 ("Codex 를 쓸 수 없을 때") |
| `STATUS: timeout` | 540초 초과. 범위를 줄이거나 effort 를 낮춰 재시도. 끈질기면 `~/.codex/log/` 확인 |
| `STATUS: failed` + `HINT: 인증` | `codex login` 재실행 안내 |
| `STDERR` 에 `model ... not supported` / `404 ... does not exist` | 모델 설정 문제. `~/.codex/config.toml` 의 `model` 이나 `-m` 값을 고치라고 안내. 정지·통과로 보고하지 않음 |
| `requires a newer version of Codex` | `codex update` 안내 |
| `the argument '[PROMPT]' cannot be used with '--base'` | 범위 플래그와 프롬프트를 같이 넘김. 프롬프트를 빼거나 focus 경로(review.md) 사용 |
| `turn_failed` / `no_completion` / `empty` | Codex 가 답을 끝내지 못함. 결과 없음으로 보고, 재시도 제안 |

## 규칙

- 이 스킬은 파일을 수정하지 않는다. Codex 도 read-only.
- Codex 출력은 원문 → Claude 의견은 그 뒤. 의견이 원문을 대체하지 않는다.
- 호출은 모드당 1회가 기본. 질문은 한 번에 묶어 보낸다.

---
Adapted from gstack `/codex` (MIT, Copyright (c) 2026 Garry Tan) — 전문은 [LICENSE-gstack](LICENSE-gstack).
