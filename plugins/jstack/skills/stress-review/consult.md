# Consult 모드

검토자에게 질문을 하거나 계획을 검토받는다. 검토자에 맞는 경로 하나만 따른다.

## 1. 프롬프트 구성

**일반 질문:** 사용자 질문 원문을 그대로 쓴다. Claude 의 잠정 결론("내 생각엔 X 가 맞다")은 붙이지 않는다 — 질문과 근거 자료만.

**계획 검토** (질문이 계획/플랜/스펙 검토이거나 계획 파일을 지목한 경우):
- 외부 CLI 는 저장소 밖(`~/.claude/plans/` 등)을 못 읽는다 → Claude 가 계획 파일을 Read 해서 **전문을 프롬프트에 넣는다**. 경로만 넘기지 않는다.
- 앞에 붙일 지시:

```
You are a brutally honest technical reviewer. Review this plan for: logical gaps and unstated
assumptions, missing error handling or edge cases, overcomplexity (is there a simpler approach?),
feasibility risks, and missing dependencies or sequencing issues. Be direct. Be terse. No compliments.
Also read these source files referenced in the plan: <경로 목록>

THE PLAN:
<계획 전문>
```

`Also read these source files …` 줄은 저장소를 읽을 수 있는 검토자(codex, 서브에이전트)에게만 넣는다. 그 외 CLI 에는 빼고, 소스 파일을 대신 붙이지도 않는다 (전송 범위를 넓히지 않는다).

## 2. 실행

### A. codex

저장소 밖(`ROOT: none`)에서는 쓸 수 없다 — 다른 검토자를 고르게 한다.

**새 대화.**

```bash
D=$(mktemp -d) && cd "$(git rev-parse --show-toplevel)" && \
python3 "${CLAUDE_SKILL_DIR}/scripts/agent_run.py" --boundary --log "$D/transcript.log" \
  --agent codex --out "$D/last.md" <<'JIN_PROMPT_END'
<프롬프트>
JIN_PROMPT_END
echo "D=$D"
```

출력의 `SESSION_ID` 를 기억한다 (대화 안에서만, 파일로 남기지 않음).

**후속 질문.** 이 대화에서 앞서 받은 `SESSION_ID` 가 있으면 이어갈지 새로 시작할지 AskUserQuestion 으로 묻는다. 이어가면:

```bash
D=$(mktemp -d) && cd "$(git rev-parse --show-toplevel)" && \
python3 "${CLAUDE_SKILL_DIR}/scripts/agent_run.py" --boundary --log "$D/transcript.log" \
  --agent codex --mode resume --session "<SESSION_ID>" --out "$D/last.md" <<'JIN_PROMPT_END'
<후속 질문>
JIN_PROMPT_END
echo "D=$D"
```

`<SESSION_ID>` 는 스크립트가 출력한 값만 쓴다 (영숫자·`-` 만). resume 은 토큰을 아끼지 않는다 — 이전 맥락이 정말 필요할 때만 쓴다. resume 이 실패하면 새 대화로 다시 보낸다.

### B. 그 외 CLI (gemini · opencode · copilot · qwen · pi)

검토자는 저장소를 못 읽는다 → 코드베이스를 읽어야 답할 수 있는 질문이면 그렇다고 사용자에게 먼저 알린다 (codex 나 서브에이전트가 맞다). 후속 대화(resume)는 없다 — 매번 새 대화이므로 필요한 맥락을 프롬프트에 다시 넣는다. 프롬프트 첫 줄에 아래 문장을 넣는다 (검토자가 없는 파일을 읽으려다 헛돌지 않게):

```
You see only the text of this prompt and have no repository access. Say so when an answer needs code you cannot see.
```
 저장소 밖(`ROOT: none`)이면 `cd "$(git rev-parse …)" &&` 를 뺀다.

```bash
D=$(mktemp -d) && cd "$(git rev-parse --show-toplevel)" && \
python3 "${CLAUDE_SKILL_DIR}/scripts/agent_run.py" --boundary --log "$D/transcript.log" \
  --agent "<검토자>" <<'JIN_PROMPT_END'
<프롬프트>
JIN_PROMPT_END
echo "D=$D"
```

답은 `$D/transcript.log`.

### C. Claude 서브에이전트

Agent 도구, `subagent_type: "Explore"`. 프롬프트 = 1 의 프롬프트 + `Do not modify any file.`. 계획 파일이 저장소 밖이어도 전문을 프롬프트에 넣는다. 이 대화의 맥락을 요약해 넣을 때 작성자의 결론·자기평가는 뺀다.

답 원문을 `$D/last.md` 로 저장한다 (SKILL.md "Claude 서브에이전트"). 게이트는 없다. 후속 질문은 새 서브에이전트로 보낸다.

## 3. 제시

헤더 `<검토자> SAYS (consult)`. Claude 이해와 다른 지점은 "Claude 는 X 에 반대 — 이유 Y" 로 표시한다.

권고 예: `Recommendation: 검토자의 "SQLite 로 교체" 제안은 기각한다 because 예상 규모에선 팀의 Postgres 운영 경험이 단순화 이득보다 크고, 검토자의 두 번째 제안(read replica)이 읽기 부하 문제를 이미 해결한다.`
