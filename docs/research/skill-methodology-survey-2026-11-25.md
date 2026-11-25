# 스킬셋 방법론 조사 (2026-11-25)

## 요약

- **측정 근거는 얇다.** 정독 15개 세트 중 결과(outcome)를 측정한 곳은 gstack·superpowers·ECC·cc-thinking·compound-engineering·OMC 6곳이다. wshobson 유료 Verified 29/30은 판매 주체가 측정해 이해충돌이 있고, addyosmani judge 3/3 vs 0/3은 n=3이라 제외했다. 6곳 모두 자체 실행이고 대부분 비공개·소표본이며 결과도 대부분 null이다. 나머지 주장은 opinion이다 [2][8][16][20][21][25].
- **gstack /investigate 은퇴는 입력끼리 충돌한다.** R3c 결과도 이득 없음(+2.8pt, CI −5.8~+11.4)이었지만 판정은 FIX-METHOD, "not a CUT-CANDIDATE"였다 [3]. 그런데 스킬은 은퇴했다 [4]. 성공당 비용은 +43%였다. 대체 규칙(읽기 전용 확인 1회 → 실패 테스트 → 근본 원인 수정)은 평가되지 않았다. jstack은 이 미평가 규칙을 CLAUDE.md에 채택했다.
- **DEBUG:** 연구가 받치는 것은 재현한 뒤 그 재현이 *올바른 이유로* 실패하는지 확인하는 것이다 [79][80]. 미해결 문제는 파일 찾기가 아니라 고칠 층(layer) 판단이다 (10/12) [82]. 사고 기법 스킬 측정: scientific-method fault_loc +4.0pp vs placebo (n=426) [25]. KT −1.8pp·확인 실험 50% vs 55% 는 원문 재확인 실패 (부록 A).
- **INVESTIGATE:** ACH·KT를 에이전트에 적용한 동료 심사 연구는 없다. KT 에이전트 측정 주장(−1.8pp)은 원문 재확인에 실패했다 (부록 A) — 에이전트 대상 KT·ACH 측정은 사실상 없다. ACH 인간 RCT 결과는 혼재했고 오류를 늘렸을 수도 있다 [83]. 가져올 것은 증명된 방법이 아니라 장치다: 사실/추론 라벨, 반증 가능한 가설, 판별 증거 우선, "inconclusive" 허용.
- **DECOMPOSE:** walking skeleton·vertical slice의 에이전트 측정은 없다 (opinion). 간접 근거는 세 가지다.
  - 80% 성공 길이는 50% 길이의 약 1/5이다 [86].
  - 파일 수가 늘면 성공률이 떨어진다 [87].
  - 계획을 먼저 쓰면 Pass@1이 상대 +25.4% 오른다. 단 함수 수준 벤치마크이고 repo 수준 에이전트가 아니다 [88].
  - 결론: 슬라이스는 짧게, 파일은 적게, 슬라이스마다 자체 검증을 둔다.
- **STRESS_REVIEW:**
  - 외부 신호 없는 자기 교정은 해롭다 (CSQA 75.8→38.1) [63].
  - 같은 오류도 외부 것으로 귀속하면 잡는다 (blind spot 64.5%) [64].
  - 이종 모델 조합은 91%, 동일 모델 복제는 82%였다 [68].
  - 작성자 framing은 판정을 끌고 간다 (32/33) [72].
  - "작성자 결론 숨기기"를 직접 다룬 연구는 없다. 정독 세트 중 숨기는 곳과 숨기는 대상 [13][16][19][20][23]:
    - addyosmani: CLAIM
    - BMAD: claims 파일, elicitation의 작성자 추론
    - EGM: 작성자 정당화
    - compound ce-pov: host 입장 (동결 후 1차 독립 라운드에서)
    - ECC multi-plan: "without preset opinions"
  - skim한 리뷰 스킬 9개 중 작성자 의도를 숨기는 곳은 없다 [33]–[41].
- **외부 CLI:** 9종 중 read-only가 명시적 기본값인 것은 codex뿐이다 [94]. gemini·copilot은 headless에서 승인이 필요한 동작을 거부하는 방식이다 [116][105]. 주의할 점:
  - cursor `-p`는 `--force` 없이도 파일을 쓴다 [102].
  - gemini plan 모드는 headless에서 exit_plan_mode 가 자동 승인되고 나가면 YOLO 로 바뀐다 → read-only 보장 안 됨 [97].
  - amp에는 read-only 옵션이 없다 [119].
  - `claude -p`는 `--bare` 없이 실행하면 프로젝트 hook·MCP를 실행한다 [109].
- **작성·파일럿:**
  - 벤더 지침은 네 가지다: description이 곧 trigger, 본문 <500줄, 반드시 지킬 규칙은 hook에 둔다, baseline 대비 eval ≥3 [49][50].
  - superpowers 측정: 작성 방식 금지문("don't restate the brief")은 무지시보다 나빴고 (spec 값 재입력 4.4 vs 3.6, 높을수록 나쁨), 이산 행동 금지는 효과가 있었다 (0/5 vs 3/5) [9].
  - 파일럿 권고: writing-skills의 control + 5회 반복, skill-creator의 blind comparator 판정, `run_loop`로 description 조정. 이 조합의 효과는 추론이며 검증된 적 없다.

## 1. 조사 대상

★ = discovery 파일의 GitHub API stargazers_count (2026-11-25 조회) [1]. 정독 보고서의 재조회값과는 몇 개 차이가 난다 (예: gstack 142,586 vs 142,593). cursor/plugins ★는 monorepo 전체 수치이고 pstack만의 수치가 아니다 (mirror backnotprop/pstack은 4,997) [1]. discovery 헤더 "merged 53 kept 34 dropped 21 unresolved 4"는 합이 맞지 않으며, 원문 그대로 옮긴다.

정독 15행의 렌즈 열은 세트 보고서를 따랐고, discovery와 다른 곳이 있다 (예: BMAD DECOMPOSE는 discovery의 bmad-forge-idea 등 대신 bmad-agent-po). DEBUG 열은 정독 세트만 보고서에서 채웠다. discovery는 DEBUG를 INVESTIGATE(I)와 구분하지 않으므로 나머지는 "미분리"로 둔다.

정독 여부: 정독 15 · skim 12 · 목록 7 = 34. 목록 7개 저장소는 [42]–[48].

| 이름(link) | ★ | 라이선스 | 성격 | DEBUG | INVESTIGATE | DECOMPOSE | STRESS_REVIEW skills | 정독 여부 |
|---|---|---|---|---|---|---|---|---|
| [garrytan/gstack](https://github.com/garrytan/gstack) | 142,586 | MIT | skill-set | investigate (2026-11-07 은퇴) | 전용 없음 (plan-eng-review premise 표) | plan-ceo-review, plan-eng-review, autoplan | review, codex(외부), autoplan | 정독 |
| [michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude) | 4,832 | MIT | skill-set | principle-fix-root-causes, principle-attack-the-premise, bug-fix playbook | why, how, blast-radius | figure-it-out, sharpen, principle-sequence-verifiable-units | interrogate, arena, thermos | 정독 |
| [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack) | 19,225 (monorepo) | MIT (pstack/LICENSE; monorepo 표기 없음) | skill-set | 미분리 | why, how, benny reproduce-and-fix-issues | sharpen, architect, figure-it-out | interrogate, arena, blast-radius | skim (benny) |
| [obra/superpowers](https://github.com/obra/superpowers) | 325,820 | MIT | skill-set | systematic-debugging | diagnosing-superpowers (부분) | brainstorming, writing-plans, subagent-driven-development | requesting-code-review, receiving-code-review, verification-before-completion | 정독 |
| [SuperClaude_Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) | 23,951 | MIT | framework | troubleshoot, root-cause-analyst | research, deep-research | workflow, task, estimate | spec-panel, self-review, reflect | 정독 |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 120,211 | MIT | skill-set | debugging-and-error-recovery | source-driven-development (부분) | idea-refine, planning-and-task-breakdown, incremental-implementation | doubt-driven-development, code-review-and-quality | 정독 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 332,193 | MIT | skill-set | diagnosing-bugs | research, triage | to-spec, to-tickets, wayfinder | grilling, code-review | 정독 |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | 310,220 | MIT (skill별 MIT/Apache-2.0/CC-BY-SA-4.0) | framework | orch-fix-defect, build-fix, agent-introspection-debugging | deep-research, research-ops, issue-review | orch-build-mvp, planner, blueprint (epic-decompose는 issue 정리, 슬라이싱 아님) | council, council-multi-model, code-reviewer | 정독 |
| [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core) | 11,820 | MIT | framework | gsd-debug, gsd-debugger | gsd-forensics, gsd-phase-researcher, gsd-assumptions-analyzer | gsd-plan-phase, gsd-planner | gsd-review, gsd-plan-review-convergence, gsd-verifier | 정독 |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 55,700 | NOASSERTION (API) / MIT + trademark (LICENSE) | framework | 없음 (bug ticket 형식만) | bmad-deep-recon | bmad-agent-po (slice) | bmad-review, bmad-code-review | 정독 |
| [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) | 26,219 | MIT | plugin | ce-debug | ce-pov, researcher agents | ce-plan, ce-ideate | ce-code-review, ce-doc-review | 정독 |
| [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | 41,046 | MIT | framework | debugger agent, debug | trace, research, why (pstack port) | plan, ralplan, sharpen | critic, interrogate, arena | 정독 |
| [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model) | 22,708 | Apache-2.0 | plugin | 없음 | 없음 | egm-draft (부분) | egm-review, egm-review-loop, egm-lite | 정독 |
| [github/spec-kit](https://github.com/github/spec-kit) | 151,284 | MIT | framework | bug ext (assess→fix→test) | assess ext | specify, tasks, converge | analyze (비적대) | 정독 |
| [tjboudreaux/cc-thinking-skills](https://github.com/tjboudreaux/cc-thinking-skills) | 1,767 | MIT | skill-set | scientific-method, kepner-tregoe, five-whys-plus | map-territory, kepner-tregoe (DA) | 없음 | pre-mortem, steel-manning, red-team (보안) | 정독 |
| [wshobson/agents](https://github.com/wshobson/agents) | 42,870 | MIT (conductor Apache-2.0) | marketplace | debugging-strategies, parallel-debugging, smart-debug | connectivity-triage (부분) | task-coordination-strategies | multi-reviewer-patterns, team-review | 정독 |
| [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | 75,642 | MIT | framework | 미분리 | openspec-explore | openspec-propose, openspec-new-change | openspec-verify-change (적합성) | skim |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | 48,125 | Apache-2.0 | marketplace | 미분리 | feature-dev code-explorer | feature-dev | code-review, pr-review-toolkit | skim |
| [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | 28,544 | NOASSERTION | framework | 미분리 | parse-prd-with-research | parse-prd, expand-task | task-checker | skim |
| [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files) | 28,222 | MIT | skill-set | 미분리 | 없음 | planning-with-files | 없음 | 목록 |
| [humanlayer/humanlayer](https://github.com/humanlayer/humanlayer) | 12,953 | Apache-2.0 | framework | 미분리 | create-research-questions, create-research | create-plan, implement-plan | grill-me | skim |
| [trailofbits/skills](https://github.com/trailofbits/skills) | 8,400 | CC-BY-SA-4.0 | marketplace | 미분리 | vulnerability-triage-brocards (보안) | 없음 | differential-review, rust-review-fp-judge | skim |
| [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | 77,975 | MIT | skill-set | 미분리 | security-audit (recon) | 없음 | security-audit (hunter/verifier) | skim |
| [buildermethods/agent-os](https://github.com/buildermethods/agent-os) | 5,633 | MIT | framework | 미분리 | 없음 | plan-product, shape-spec | 없음 | 목록 |
| [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) | 3,923 | MIT | other | 미분리 | 없음 | 없음 | pragmatic-code-review, security-review | 목록 |
| [gemini-cli-extensions/conductor](https://github.com/gemini-cli-extensions/conductor) | 3,801 | Apache-2.0 | plugin | 미분리 | 없음 | conductor-new-track | conductor-review | 목록 |
| [aiwithremy/claude-skills-llm-council](https://github.com/aiwithremy/claude-skills-llm-council) | 3,265 | none | skill-set | 미분리 | 없음 | 없음 | llm-council | skim |
| [NeoLabHQ/context-engineering-kit](https://github.com/NeoLabHQ/context-engineering-kit) | 1,850 | GPL-3.0 | marketplace | 미분리 | why, root-cause-tracing, researcher | plan-task, plan-do-check-act | judge-with-debate, meta-judge | skim |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | 30,432 | MIT | skill-set | 미분리 | research, agent-run-forensics, test-debugger | spec-driven-workflow, epic-design | adversarial-reviewer, red-team, devils-advocate | skim |
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo) | 82,377 | MIT | framework | 미분리 | deep-research | goal-planner, sparc-methodology | agent-code-review-swarm | 목록 |
| [deanpeters/Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills) | 8,150 | NOASSERTION | skill-set | 미분리 | 없음 | epic-breakdown-advisor, user-story-splitting | 없음 | skim |
| [solatis/claude-config](https://github.com/solatis/claude-config) | 915 | MIT | skill-set | 미분리 | problem-analysis, deepthink | planner | decision-critic, incoherence | 목록 |
| [oaustegard/claude-skills](https://github.com/oaustegard/claude-skills) | 418 | MIT | skill-set | 미분리 | 없음 | 없음 | challenging, verifying-review-findings | skim |
| [alibaba/open-code-review](https://github.com/alibaba/open-code-review) | 56,051 | Apache-2.0 | plugin | 미분리 | 없음 | 없음 | open-code-review (ocr CLI) | 목록 |

**제외 21** [1]:
- awesome-list·디렉터리·레지스트리 (skills.sh, SkillsMP 등)
- 아카이브 (gsd-build/get-shit-done → gsd-core, gsd-2)
- 대상 렌즈 없음 (andrej-karpathy-skills, anthropics/skills, ponytail, claude-reflect)
- 저★ (crucible 11, steveclarke 37)
- 미러 (backnotprop/pstack)

claudex-loop은 discovery의 "no-external-CLI" 기준으로 빠졌다 (Codex CLI 필요). 외부 CLI를 쓰는 stress-review 결정과는 이제 맞지 않는 기준이다. crucible·gsd-2는 제외 목록에 있지만 skim해서 아래에서 인용한다 [29][40].

**미해결 4** [1]:
- claude-plugins-community의 플러그인 2,280개는 하나씩 열어 보지 않았다.
- SuperClaude spec-panel/business-panel은 본문을 읽지 않았다.
- skills.sh 설치 수는 수집하지 않았다.
- gstack에는 슬라이싱 스킬이 없다 (spec은 ticket 1개만 만든다).

## 2. 작성 방식 비교

| Set | 형식 | 대표 길이(lines) | 언어 | trigger 스타일 | 강제 장치 | 자체 검증(evals) |
|---|---|---|---|---|---|---|
| gstack [2] | `.tmpl` → 생성 SKILL.md, 큰 스킬은 sections/ 분할 | investigate 384 / tmpl 225; plan-ceo-review 1053 / 597 | EN + bash | "Use when…" + "Use for:" 사용자 문구 | 대문자 Iron Law, AskUserQuestion STOP gate (3-strike, >5 files), Stop hook, /freeze | 사전등록 유료 eval (gstack-evals), 판정 KEEP/FIX-METHOD/CUT, 다수 unpublished |
| pstack-claude [7] | plugin, skill dir 68개, principle-* 24개는 `user-invocable: false` | 68개 중 57개가 60줄 미만 (interrogate 48). 100줄 이상 5개: thermo-nuclear-code-quality-review 201, poteto-help 149, poteto-mode 132, automate-me 111, setup-pstack 104 | EN, 짧은 평서문 | 기능 먼저, trigger는 끝에 | 규칙형 hard stop. 독립 리뷰어가 없으면 `BLOCKED`. rationalization 표 없음 | 구조 테스트만 (81 files, 문구 고정). 행동 eval 없음 |
| superpowers [8] | SKILL.md + prompt template + references | 65–399 (systematic-debugging 283) | EN | "Use when…"만 (대부분), workflow 요약 금지 | Iron Law, `<HARD-GATE>`, rationalization 표, red flags | infra 테스트, triggering 테스트, specs 안의 micro-test (control·5 reps) |
| SuperClaude [12] | `/sc:` commands + agents + skills (pip·plugin 이중 사본) | commands 88–592, agents 31–692 | EN (일부 docs JP) | 명시 호출, `## Triggers` 목록 | prose만: CRITICAL BOUNDARIES, Will/Will Not | Python 모듈 pytest만. 행동 테스트 없음 |
| addyosmani [13] | SKILL.md + 공유 references | 133–402 (debugging 300) | EN | 3인칭 기능 설명 + "Use when", workflow 요약 금지 | Rationalizations·Red Flags·Verification 섹션을 lint로 강제 (25/26) | 3단: 구조 CI, TF-IDF routing (rank-1 ≥95%), 행동 (triggering, 3–27 샘플) |
| mattpocock [15] | `skills/<bucket>/<name>/` | 7–170, 중앙값 75 (diagnosing-bugs 138) | EN, harness-neutral, em-dash 금지 | model-invoked는 trigger 문구를 풍부하게, user-invoked와 구분 | MUST 대신 완료 기준·체크리스트 | 없음 ("There is no automated eval"). CI는 frontmatter만 |
| ECC [16] | skill 328, command 99, agent 72, hooks | 렌즈 관련 23–724 (council 204, gateguard 724) | EN | 기능 + "Use when" + 형제 스킬로 가지 말라는 안내 | 인간 GATE, CRITICAL, PreToolUse hook (gateguard) | 대부분 정적. 사전등록 benchmark는 포화. GateGuard 96 trials |
| gsd-core [18] | 얇은 SKILL shim → workflows/agents | SKILL 20–209, workflow 최대 1574 | EN + XML 태그 | 기능 1줄, "Use when"은 0/72, 명시 호출 | MUST/MANDATORY, FORCE stance | test 파일 1121개, 그중 174개는 텍스트 계약. token benchmark |
| BMAD [19] | SKILL.md + bmod.toml + customize.toml + references | bmad-review 54 (+lens 7–83), deep-recon 89 | EN + TOML | 3인칭 5–8단어 요약 + "Use when the user says" | 가이드는 대문자 MUST 금지인데 lens는 "MANDATORY… IN EXACT ORDER" (내부 충돌). HALT 메뉴 | bmad-eval 인프라 (baseline·variant·quality·trigger). 결과 파일 0 |
| compound-eng [20] | SKILL.md + 단계별 references + frontmatter 없는 persona | 33–128 (ce-debug 128줄 / 19,327 B). 나머지는 Codex 8,000 B 예산 바로 아래 | EN | 메커니즘 먼저 + "Use when" + 인접 스킬 negative | 이름 붙은 prose gate. hook 없음 | bun test 195 files + skill-eval-cell pack (소표본) |
| OMC [21] | SKILL.md + references/phases | 38–292 (debug 38, plan 292) | EN, XML 태그 | 짧은 명령형 1줄 | MUST/MUST NOT, Final_Checklist, frontmatter로 tool 제한 | 문구 계약 테스트, #1240 A/B, SWE-bench smoke |
| EGM [23] | skill 8개: SKILL.md + TEST.md + test_scenarios.yaml + persona | 67–434 (egm-review 101) | EN | `disable-model-invocation: true` (사용자 호출만) | MUST / CRITICAL / STRICTLY FORBIDDEN | 오프라인 pytest (구조, 24,000 B 한도), 수동 시나리오, 격리 probe |
| spec-kit [24] | 명령 1개 = .md 1개 + 사전 점검 script + handoffs | 170–379 | EN | 명시 slash 명령, 기능 1줄 | 대문자 MUST/NEVER, READ-ONLY 선언, Guardrails 목록 | pytest 문자열 존재 검사만 (LLM 미실행) |
| cc-thinking [25] | dir 28개, SKILL.md 1개씩, 부속 없음 | 44–89 (kepner-tregoe 44, scientific-method 56) | EN | 상황명, <200자, "When X…" | 짧은 prose gate (Over-application guard, Falsify/Stop). iron law·hook 없음 | evals/ 엔진 4종, 사전등록 study, elevate gate (+5pp, p<0.05, 재현) |
| wshobson [26] | plugin 91개, skill 185개 + references | SKILL.md 36–265 (debugging-strategies 265), command 최대 597 | EN | 기능 + "Use when" / "Use PROACTIVELY" (MISSING_TRIGGER lint) | 파일마다 다름. "CRITICAL BEHAVIORAL RULES", 파일 기반 단계 | plugin-eval 정적 점수 (구조). 유료 Verified 29/30 |

- **언어:** 15/15가 영어다. 한국어 스킬 선례는 없다. description 한도는 1,024자다 [49]. 이 한도는 code point로 세므로 한글도 문제없다 [125]. 다만 `wc -w` 단어 예산은 한글을 적게 센다 [57].
- **길이:** ~50줄짜리는 소수다 (cc-thinking 44–89, pstack 68개 중 57개가 60줄 미만, BMAD bmad-review 54). 다수는 100–400줄에 references를 분리한다. 벤더 상한은 500줄 [49].
- **강제 장치는 두 갈래로 나뉜다.**
  - 대문자 Iron Law: gstack, superpowers, gsd-core, EGM, spec-kit.
  - 완료 기준·짧은 gate: mattpocock, pstack, cc-thinking, BMAD 가이드.
  - hook으로 강제한 gstack (Stop hook)과 ECC (gateguard)는 측정에서 이득을 hook과 분리할 수 없었거나 비용만 늘었다 [3][17].
- **trigger:** "Use when" + 인접 스킬 negative 방식 (addyosmani, compound-eng, ECC)과 명시 호출 방식 (spec-kit, gsd-core, SuperClaude, EGM)으로 나뉜다. 정독 세트 중 trigger 수치가 보고된 곳은 addyosmani뿐이다 [14].
- **eval:** 대부분 구조·문구 테스트다 (spec-kit, pstack, gsd-core, OMC 계약). 결과를 측정한 6곳 (+ triggering과 n=3 행동을 측정한 addyosmani)도 대부분 null이거나 소표본이다 (§4).

## 3. 렌즈별 비교

### DEBUG

| set | 절차 요약 | 특이점 |
|---|---|---|
| gstack investigate (은퇴, 8781d9c0) [2] | Iron Law → 가설 → 3-strike STOP → /freeze로 범위 잠금 → DEBUG REPORT (Stop hook) | "rerun·timeout 확대·skip은 가설이 아니다", "No probe, no cause". HEAD 규칙: 읽기 전용 확인 1회 → 실패 테스트 → 수정 [4] |
| pstack [7] | 직접 재현 → 가설로 이분 탐색 (why로 회귀 이력 확인) → runtime 증거 → 근본 원인 | 출하하는 모든 라인을 runtime 증거로 추적. 반박된 가설로 넣은 코드는 revert |
| superpowers [8] | Iron Law → 오류·재현·최근 변경·경계 계측·역추적 → 정상 코드와 차이 비교 → 가설 1개 → 실패 테스트 → 수정 | 실패한 fix 횟수를 세고, 3회째는 아키텍처 논의로 전환. 회귀 테스트는 revert로 증명 |
| SuperClaude [12] | 같은 명령 재실행 금지 → 가설 2–3 → 문서·로그 → 근본 원인 → 수정·검증 | 기본은 진단만, `--fix` + 승인이 있어야 수정. RCA 마지막 줄은 Prevention |
| addyosmani [13] | Stop-the-line → 재현 (비재현 결정 트리) → 층별 국소화, `git bisect run` → 근본 원인 → guard | description에 "cause may look obvious" 절 추가로 trigger 0/3→9/9 [14]. 오류 출력은 untrusted data로 취급 |
| mattpocock [15] | red가 나는 빠른 루프부터 만든다 (실패 테스트 > curl > … > HITL, 10종 순위) → 그다음 가설 | "No red-capable command, no Phase 2." HITL bash 템플릿 |
| ECC [16] | 크기 분류 → 원인이 불명확하면 code-explorer → 새 실패 회귀 테스트 → green | build-fix는 3회 후 중단. 국소화·bisect 절차 없음 |
| gsd-core [18] | 증상 5개 → 세션 파일 → 격리 subagent → 증거·SBFL Ochiai (선택) → 수정 수용 gate | mutation check, 삭제만 하는 diff 거부, revert-and-reconfirm. 버그 리포트는 untrusted DATA |
| compound-eng [20] | triage → 재현 (증상에서 실패가 관찰된 명명된 검사) → dirty tree stash 실험 → 역추적 → 인과 사슬 gate | dirty tree가 첫 용의자. sibling-site 규칙 |
| OMC [21] | 재현 → 증거 병렬 수집 → 검사 전에 가설 3–5개 순위 → 하나씩 검사 → 최소 수정 1개 | 확인된 가설을 커밋 메시지에 기록. `[DEBUG-<4hex>]` 마커 |
| spec-kit [24] | bug.assess (재현 단계 기록, 실행은 안 함) → fix → test | assessment는 fix가 고칠 수 없는 계약. 산출물 3개로 audit trail |
| cc-thinking [25] | 단계별 라우팅: 후보가 여럿이면 scientific-method, 결함이 선택적이면 KT IS/IS-NOT, 국소화 후에는 five-whys-plus | "When NOT to Use"에 다른 스킬로의 hand-off를 적음 |
| wshobson [26] | 재현 → 수집 → 가설 N개 (failure mode 6종, 확증·반증 증거) → ACH | 증거 강도 표 (직접 / 상관 / 증언 / 부재) |

더 나은 결과로 이어지는 요소:
- 재현한 뒤 그 재현이 올바른 이유로 실패하는지 확인한다. Agentless는 77→81→96으로 올랐지만 재현 213개 중 유효한 것은 94개였다. 검증 안 된 재현은 anti-pattern으로 꼽힌다. — **research** [79][80]
- 국소화보다 고칠 층 판단이 중요하다. 성공한 패치는 >90% 정확한 파일을 건드렸고 실패한 run도 81%까지 건드렸다. 끝내 못 푼 12개 중 10개는 틀린 층을 고쳤다. — **research** [81][82]
- 첫 편집을 늦추고 (ρ +0.68), 초반에 패치하지 않고 (ρ −0.78), 검증 비중을 늘린다 (ρ +0.50). 상관관계일 뿐이며, 결과에는 scaffold보다 모델 영향이 크다. — **research** [82]
- 실패 테스트를 먼저 쓰고 mutation 또는 revert로 확인한다. — **opinion** [8][18]
- 가설 체크리스트(KT, scientific-method): 이득 없음. — **measured null** [25]
- 절차를 강제하는 스킬 전체(gstack R3c): CI가 0을 포함한다. — **measured null** [3]

### INVESTIGATE

| set | 절차 요약 | 특이점 |
|---|---|---|
| gstack [2] | 결정을 먼저 적는다 (결과가 결정을 바꾸지 않으면 조사하지 않음). premise를 거짓일 수 있는 문장으로 쓰고, 가장 싼 반증 관찰을 한다 | premise 표에 FALSE/UNVERIFIED 개수와 file:line 근거 |
| pstack [7] | 질문 유형으로 라우팅 (why = 이력, how = runtime, blast-radius = 영향) | why: 코드가 아니라 기록에서 답하고, 추론은 표시하고, 기록 공백을 명시 |
| superpowers [8] | 문제 진술이 나올 때까지 한 번에 한 질문 → 원자료 위치 확정 → 인용된 분석만 남김 | "You report; you do not diagnose". 범위가 자체 transcript로 한정됨 |
| SuperClaude [12] | 이해 5–10% → 계획 10–15% → 실행 50–60% 예산 | fact / consensus / speculation 분리. 보고서만 내고 멈춤 |
| addyosmani [13] | DETECT → FETCH (공식 문서 우선) → IMPLEMENT → CITE | `UNVERIFIED` 라벨, CONFLICT DETECTED 템플릿 |
| mattpocock [15] | 새 컨텍스트의 background agent → 1차 자료만 → 출처를 단 파일 1개 | 사실은 agent 몫, 결정은 사용자 몫 |
| ECC [16] | 요청 분류 → 사용자 증거를 사실 / 검증 필요 / 미결로 분류 | 4분류 라벨 (fact / user-supplied / inference / recommendation) |
| gsd-core [18] | 읽기 전용 원자료 수집 → anomaly signature 매칭 (HIGH/MED/LOW) | 강한 prior는 abstain만 가능하고 refute는 못함 |
| BMAD [19] | intent 판정 → plan gate (유일한 hard stop) → 조사 | research firewall: 프로젝트 맥락은 질문만 정하고 증거로 치지 않음. 연구자에게 목표 숨김 |
| compound-eng [20] | 근거 수집 전에 intent 분류 → 증거 floor | 강한 웹 증거로 얇은 프로젝트 증거를 메우지 않음 (non-compensatory) |
| OMC [21] | 관찰을 정확히 재진술 → 서로 다른 가설 3개 lane → lane마다 tracer worker | 증거 강도 사다리. lane 3은 측정 방법 자체를 의심 |
| spec-kit [24] | intake → research → define → shape → decide | 단계마다 다음 단계 작업 금지. 모든 주장에 cited/ASSUMPTION 태그 |
| cc-thinking [25] | map-territory: 주장 인용 → territory 검사 → 신선도 → 관찰 → delta | 관찰 칸은 해석 없이 결과만 |
| wshobson [26] | 증상을 정확히 기록 → 읽기 전용 → 가장 좁은 판별 검사 | Observed / Inferred / Unknown. 확신 없는 추측보다 `inconclusive` |
| humanlayer (skim) [27] | 질문 작성 → 조사 (티켓을 보지 않음) | 질문 작성자는 의도를 누설하지 않음. root cause 분석은 기본 금지 |
| benny (skim) [28] | triage → 재현 → 경쟁 가설 + 판별 검사 | 라우팅 가능한 수준이면 멈춤 |

더 나은 결과로 이어지는 요소:
- 사실/추론/미확인 라벨, 그리고 `inconclusive` 허용. — **opinion** [26][16][24]
- 결정을 먼저 적는다 (조사가 무엇을 바꾸는가). — **opinion** [2][19]
- 조사자에게 목표·티켓을 숨긴다. — **opinion** [27][19]
- 경쟁 가설 + 판별 증거. ACH 원전은 Heuer [84], 분석가 50명 RCT는 혼재했고 오류를 늘렸을 수 있다. — **research (반대 방향 포함)** [83]
- KT IS/IS NOT: 원인은 IS와 IS NOT을 모두 설명해야 한다 [85]. 에이전트 측정 주장(−1.8pp)은 원문 재확인 실패 — **unverified** [25]
- BMAD bmad-investigate 은퇴: 일반 조사와 같은 결론, 비용만 큼. — **opinion** [19]
- INVESTIGATE 정의에 맞는 측정은 0건이다. R3c는 DEBUG를 측정한 것이다 [3].

### DECOMPOSE

| set | 절차 요약 | 특이점 |
|---|---|---|
| gstack [2] | scope 4모드 (EXPANSION / SELECTIVE / HOLD / REDUCTION), 추가 항목마다 Add/Defer/Skip → task마다 Verify 줄 | "expand, then slice"를 글자 그대로 구현. task에 출처 finding 필요 ("do not invent one") |
| pstack [7] | done을 반증 가능한 술어로 → 독립적으로 머지할 수 있는 원자 단위 → 가장 위험한 미지수부터 | scaffold·검증이 기능보다 먼저. 단위마다 keep/revert 실험 |
| superpowers [8] | brainstorm → 크기 판정 → design → plan | 분할 기준: 리뷰어가 한 task를 거부하고 이웃 task는 승인할 수 있는 곳. Interfaces 블록 |
| addyosmani [13] | idea-refine (10x version 포함) → MVP + Not Doing → 분할 | 분할 휴리스틱: 제목에 'and', AC가 3줄 초과, subsystem 2개, 1세션 초과 |
| mattpocock [15] | wayfinder (목적지 → decision ticket) → to-tickets (tracer bullet, blocking edge) | "fog or ticket" 테스트. 1 ticket = 1 session |
| ECC [16] | size tier → planner가 얇은 vertical slice | cold-start brief (새 agent가 바로 실행 가능). task마다 Validate 명령 |
| gsd-core [18] | 첫 task = tracer (전 층 관통 + 자동 verify) → 확장 task | "Skeleton이 ~5 task를 넘으면 skeleton이 아니다". 확장은 scope creep로 보고 deferred |
| BMAD [19] | 컨테이너 완성 → 사용자 범위 확인 → 슬라이스 | tracer 먼저, 그다음 가장 위험한 story. "Split, never shrink". 슬라이스마다 실행 가능한 check 1개 |
| compound-eng [20] | 결과를 누가 어떻게 쓰는지에서 시작 → Implementation Unit (원자 커밋) | "Safe after every merge". 공유 산출물은 만드는 쪽이 하나 |
| OMC [21] | sharpen → plan (3–6 단계, 테스트 가능한 AC) → sdd lite | walking skeleton이 기본이고, 대안을 쓰려면 정당화 필요 |
| EGM [23] | egm-draft 단일 구현 목록 | Zero-Decision Rule (계획만 보고 중요한 결정 없이 구현 가능해야 함). vertical slice 없음 |
| spec-kit [24] | 우선순위 story P1..Pn (각각 독립 테스트) → Setup / Foundational / story별 phase | MVP 먼저 checkpoint. 병렬 마커가 있는 task 문법 |
| wshobson [26] | work stream마다 파일을 독점 소유. lead가 소유한 읽기 전용 contract 파일 | "잘못된 분할로 계속 가는 것이 더 나쁘다" 재분할 규칙 |
| gsd-2 · PM-Skills · task-master · OpenSpec (skim) [29]–[32] | vertical/tracer slice, 위험 먼저, 의존 그래프 | 예외: task-master는 LLM 복잡도 1–10에 threshold 5, testStrategy null 허용. PM-Skills는 자체 'Not horizontal' 규칙과 모순 |

더 나은 결과로 이어지는 요소:
- 슬라이스를 모델의 80% 성공 길이 안으로 자른다 (80% 길이는 50% 길이의 약 1/5). — **research** [86]
- 건드리는 파일 수를 줄인다 (SWE-Bench Pro: 파일 수가 늘면 급락). — **research** [87]
- 슬라이스마다 명확한 check를 둔다 (같은 길이라도 피드백 루프 없는 'messy' 과제는 점수가 낮음). — **research** [86]
- 계획을 먼저 쓴다 (Pass@1 상대 +25.4%, CodePlan 5/6 vs 0). — **research** [88][89]
- 첫 슬라이스는 얇은 end-to-end (walking skeleton, tracer bullet, INVEST). — **opinion** [91][92][93]
- 확장 단계 자체도 근거가 없다. — **measured, 소표본** [2][20]
  - gstack plan-ceo-review는 계획 84개에서 no gain이었다 (GEVA-431 이후 판정은 FIX-METHOD on task fit).
  - compound ce-plan sizing은 "ambitious 시나리오에서 요청 기능을 줄이는 오류"를 변경 후 0으로 만들었다 (자체 측정).
- 벤더 사례: 프롬프트를 end-to-end feature 200개 이상으로 확장한 뒤 세션마다 1개씩 구현한다. 수치는 없다. — **vendor** [90]

### STRESS_REVIEW

| set | 절차 요약 | 특이점 |
|---|---|---|
| gstack [2] | 모든 diff에 Claude adversarial subagent + 병렬 specialist. 외부는 `codex exec - -s read-only --json -o` | same-family rule (같은 계열 2개 = 1개). missing coverage는 clean이 아니다. Recommendation은 특정 finding을 지목 |
| pstack [7] | interrogate: 의도 재진술 → adversary 패널 (worktree 분리) → lead가 재실행 | 재실행으로 재현된 finding만 남김. arena는 rubric을 숨김 |
| superpowers [8] | fresh subagent에 BASE..HEAD diff 파일 + 요구사항만 준다. 세션 이력은 주지 않는다 | 작성자 결론은 숨기지 않음 (보고서를 untrusted로 취급하라고만 함) |
| SuperClaude [12] | self-review 4문항 (테스트 명령 + 결과 필수) | 숨기는 것 없음 |
| addyosmani [13] | CLAIM → 최소 단위 추출 → fresh reviewer (CLAIM 숨김) → reconcile. codex/gemini는 opt-in | "strip reasoning, not evidence". 매번 동의를 받고 선택을 기억하지 않음 |
| mattpocock [15] | ref·diff 확인 → spec·standards 탐색 → 축별 fresh subagent 2개 병렬 | 축끼리 서로의 추론을 보지 않음. 작성자 결론은 숨기지 않음 |
| ECC [16] | council: Architect가 자기 입장을 먼저 쓴다 → Skeptic/Pragmatist/Critic fresh. multi-model: codex를 빈 temp dir에서 실행 | anti-anchoring 순서. reviewer가 없으면 대체하지 않고 "부재"로 보고 |
| gsd-core [18] | `command -v`로 CLI 탐지 → host 계열 제외 → reviewer 선택 → convergence | claude lane은 `CLAUDE_CODE_DISABLE_CLAUDE_MDS`. 작성자 산출물은 숨기지 않음 |
| BMAD [19] | diff와 claims를 별도 파일로 → lens마다 subagent | Blind Hunter는 diff 경로만 받음. claims는 edge-case 추적이 끝난 뒤에만 공개 |
| compound-eng [20] | 위험 기반 persona, 각각 fresh. cross-model peer는 계열이 다른 것이 확인된 CLI | 독립성은 이전 판단만 숨기고 산출물은 숨기지 않음 |
| OMC [21] | 산출물 동결 → Architect와 Critic이 독립 검토 → Critic이 pre-mortem 5–7개 | Architect 출력을 Critic에게 숨기고, 문자열 테스트로 강제 |
| EGM [23] | Elephant 작성 → Goldfish fresh reviewer (persona + 표준 + 범위만) | 숨김 목록 명시: 대화 이력, CLAUDE.md, 작성자 정당화 |
| spec-kit [24] | analyze: 교차 산출물 일관성 검사 (읽기 전용) | 별도 reviewer 컨텍스트 없음, 비적대 |
| cc-thinking [25] | pre-mortem 과거형 프레임 → 두 번째 패스 → 상위 3–5개 | 단일 컨텍스트 자기 검토 |
| wshobson [26] | 차원별 reviewer N명 (보안·성능·아키텍처) → 통합 | finding 독립 검증 없음, 적대 패스 없음 |
| skim 리뷰 스킬 9개 [33]–[41] | finder/verifier 분리, grounding, keep 쪽으로 기울이기 | 작성자 의도를 숨기는 곳 없음. alirezarezvani는 같은 컨텍스트 persona 합의 (독립 증거 아님) |

더 나은 결과로 이어지는 요소:
- 외부 신호 또는 새 컨텍스트. 자기 교정은 CSQA 75.8→38.1. 같은 오류도 외부 귀속이면 잡는다 (64.5% blind spot, "Wait"만 붙여도 89.3% 감소). — **research** [63][64]
- 오류를 찾는 것이 병목이다. 훈련된 critic은 63% 선호되지만 버그를 지어낸다 → finding을 검증해야 한다. — **research** [65][66]
- 이종 모델: 91% vs 동일 모델 82% [68]. same-family rule [2]. — **research / opinion**
- 작성자 framing·의견을 숨긴다. — **research (간접)**
  - 간접 근거: 제안된 답을 주면 −27% [69], Turpin −36% [70], PR framing 공격 32/33 [72], code smell 판정 flip 72% (EGDP로 12%) [73].
  - 인간 리뷰: 신원 공개 시 odds ×1.58–2.10 [76].
  - 반례: 이전 리뷰 코멘트는 primer가 아니었다 [75].
- 반박 루프는 조심한다. "Are you sure?"에 정확도 −17% [71], Claude 1.3은 98% 잘못 인정 [69]. — **research**
- finder/verifier 분리 + 인용 grounding + 반박될 때만 drop. 실제 결함 16/16 유지, 거짓 11/16 제거, 거짓 1/16 확인 (synthetic n=36). — **measured (약함)** [34]
- 비대칭 verifier: 불확실하면 blocker를 지우지 않음, 반박 확신 ≥0.8 (코드 강제) — ECC orch-review [16]. — **opinion** (효과 측정 없음)
- 설명·수정을 요구하면 과잉 지적이 는다 → 테스트로 검증. — **research** [74]
- debate는 이득 대부분이 voting으로 설명된다. 같은 예산에서 self-consistency 88.2 vs debate 83.0. — **research** [63][67]
- pre-mortem은 품질 근거가 얇다. — **research (thin)** [77][78]
  - Mitchell 1989는 시제가 아니라 결과의 확실성이 원인이라 했다.
  - '30%'는 이유의 개수다.
  - Veinott는 확신 감소가 약 2배였다 (2차 인용).
- adversarial framing 문구: no gain (n=8). — **measured null** [22]
- 측정된 리뷰 이득은 gstack /review +22.6pt 하나다 (교란 있음). — **measured** [5]

## 4. 무엇이 더 나은 결과를 내는가

| 주장 | 근거 | tier | 출처 |
|---|---|---|---|
| 디버깅 절차 스킬 (gstack /investigate) | +2.8pt (CI −5.8~+11.4), 18 tasks × 20 trials, told 180/360 vs none 170/360, MDD 10. 성공당 $1.24 vs $0.86 (+43%). R3c도 이득 없음이었지만 판정은 FIX-METHOD, "not a CUT-CANDIDATE"였다 [3]. 그런데 스킬은 은퇴했다 [4] (**입력 충돌**). 한계: unpublished, 재현 안 됨, skill과 hook 분리 불가, 절차 준수 증거 없음, contamination으로 null 쪽 편향. 첫 파일 적중 88.6%는 report-only | measured (outcome, null) | [3][4] |
| 리뷰 스킬 (gstack /review) | blocking recall 26.2% vs 3.6% (+22.6, CI 11.0–33.7), KEEP. 버그 41/42가 gstack 계열 리뷰에서 나옴 (home-field), Stop hook과 묶여 측정. 앞선 탐색 run은 9.5% vs 7.1%, 비용 +47% | measured (outcome) | [5] |
| 스킬 팩 전체 (gstack) | −4.0 (CI −11.0~+2.2), 수정당 비용 증가 | measured null | [6] |
| gstack 기타 eval | plan-eng-review +1.2 [−4.1,+7.4]; autoplan eng +3.1 (FIX-METHOD); autoplan told smoke 비용 14.4x; TB2 /investigate 83.8 vs 81.1 (exploratory) | measured null (자체, 비공개) | [2][3] |
| 금지문 vs 레시피 | 작성 방식 금지문 4.4 vs control 3.6 (spec 값 재입력 수, 높을수록 나쁨 — 한 사례), 레시피는 분산 0으로 최고. 이산 행동 금지는 0/5 vs 3/5로 효과 있음 | measured (opus, 5 reps) | [9] |
| control-first gate | writing-plans control 40/40 clean. 가설한 실패 25/25 재현 안 됨 → 근거를 비용(재개당 tool call 9.0)으로 바꾸고 변경은 유지 | measured | [9][10] |
| 싼 controller | sonnet controller에서 planted defect 4/5가 출하됨 | measured | [11] |
| superpowers SDD task-scoped review | 시간 −32%, 토큰 −37%, $ −27% (최선 draw; 같은 설계 8회 중 일반 ~20–25%); blind judge 9/10 vs 7/10 | measured (자체, 소표본) | [126] |
| trigger 문구 | debugging 0/3→9/9, code-review 7/27→21/27, 인접 must-not-fire는 0 유지 | measured (triggering, 소표본) | [14] |
| 확인 단계 행동 (addyosmani) | with 3/3 vs without 0/3 | measured (행동, n=3) | [14] |
| gate hook (ECC GateGuard) | 25/48 vs 18/48, p=0.210로 미확인. turns +37%, 비용 +40% | measured null | [17] |
| ECC complex-eval / GateGuard | @1 전 arm 1.000 (orch-fix-defect 포함), @2 30/30; GateGuard pilot 18/18 | measured (자체, 천장 — 판별 불가) | [16] |
| 사고 기법 스킬 (cc-thinking) | scientific-method +4.0pp vs placebo (n=426) (확인 실험 50% vs 55%·KT −1.8 은 원문 재확인 실패). five-whys +1.5, map-territory +2.2, red-team +5 (p=0.1, 보안 분류). elevate 0 | measured null | [25] |
| cc-thinking 도구 calibration | 0.727 vs no-skill 0.818, health gate 실패. 100문항 확인 실험의 오류 90%는 라벨 모호성·repo 맥락 부족 | measured (자체) | [25] |
| compound-eng 규칙 | sibling-site 0/2→3/3. ce-plan sizing 누락 → 0. peer 모델·reasoning tier 비교에서 탐지 92–100%, 비용 ~0.30x. cross-model 대 단일 모델, 스킬 유무 비교 아님 (harness 비공개) | measured (자체, 극소 n) | [20] |
| adversarial framing (OMC) | #1240, n=8. Round 2(동일 template): treatment 81 vs control 99 findings. Round 1의 이득(template 다름)은 Round 2에서 뒤집힘 | measured null | [22] |
| OMC SWE-bench smoke | OMC 0/5 vs vanilla 5/5 | measured (smoke, n=5, 설정 상이 — 교란) | [21] |
| verifier 분리 (oaustegard) | 16/16 유지, 11/16 제거, 1/16 거짓 확인. threshold를 같은 set에서 조정 | measured (약함) | [34] |
| wshobson 유료 Verified debug | 29/30 (6 cases, haiku). 판매 주체가 측정, 사례 절반 비공개 | measured (이해충돌) | [26] |
| EGM reviewer 격리 | 격리 동작만 검증, 품질은 아님 | measured (isolation) | [23] |
| 외부 피드백 없는 자기 교정 | CSQA 75.8→38.1 | research | [63] |
| 외부 귀속 / 새 컨텍스트 | 64.5% blind spot, "Wait"로 89.3% 감소 | research | [64] |
| 이종 모델 | 91% vs 82% | research | [68] |
| 작성자 framing | −27% [69], −36% [70], FlipFlop −17% [71], PR framing 32/33 [72] | research (간접) | [69]–[72] |
| 재현 테스트 | 77→81→96, 유효 재현 94/213 | research | [79] |
| 층 판단 | wrong layer 10/12. 행동 상관 ρ +0.68 / −0.78 / +0.50 | research | [82] |
| ACH | 50명 RCT, 혼재, 오류 증가 가능 | research | [83] |
| 과제 길이·파일 수 | 80% 길이 ≈ 50% 길이의 1/5. 파일 수가 늘면 성공률 하락 | research | [86][87] |
| 계획 먼저 | +25.4% rel, CodePlan 5/6 vs 0 | research | [88][89] |
| 작고 집중된 스킬 | 큐레이션한 집중 스킬이 큰 스킬보다 나음 | research | [62] |
| 권위 문구 ("YOU MUST") | GPT-4o-mini, 유해 요청 대상 33→72%. 2026 후속 (신모델)은 35.3→51.3% | research (전이 불확실) | [60][61] |
| description = trigger | 1,024자 cap, Claude Code는 1,536자에서 자름 | vendor | [49][50] |
| 본문 <500줄, progressive disclosure | references는 한 단계 깊이까지 | vendor | [49] |
| 반드시 지킬 규칙은 hook | 스킬 텍스트가 아님 | vendor | [50] |
| eval ≥3, baseline, 여러 모델 | Δ≈0이면서 `tool_used: Skill` 실패 → description 수정 | vendor | [49][55] |
| 강압 어조 | "soften" (Opus 4.5/4.6) vs skill-creator "a little bit pushy". Fable 5는 "too prescriptive", Fable 5.2는 "never"를 절대 규칙으로 읽음 (**벤더 내부 충돌**) | vendor | [51][52][53][54] |
| skill-creator 효과 | 공개 스킬 6개 중 5개에서 triggering 개선. n 없음, 행동 수치 없음 | vendor | [56] |
| slicing (walking skeleton, tracer bullet, vertical slice) | 원전의 주장. 에이전트 측정 없음 | opinion | [91][92][93] |
| pre-mortem | 확실성이 효과를 냄 (시제 아님). 확신 감소만 측정 (2차 인용) | research (thin) | [77][78] |
| 작성자 결론 숨기기 | 숨기는 대상: addyosmani는 CLAIM, BMAD는 claims 파일과 elicitation의 작성자 추론, EGM은 작성자 정당화, compound ce-pov는 host 입장(동결 후 1차 독립 라운드), ECC multi-plan은 "without preset opinions". 효과 측정 없음 | opinion | [13][16][19][20][23] |
| 인기 | mattpocock 332k, superpowers 326k, ECC 310k, gstack 143k | popularity | [1] |

★와 측정 결과는 무관하다: gstack 143k★, 자체 eval 대부분 null (measured, 자체) [6].

**측정 근거가 얇은 곳:**
- INVESTIGATE: 0건.
- DECOMPOSE: 슬라이싱 자체는 0건이고 간접 research뿐이다.
- pre-mortem: 확신만 측정됐다.
- 작성자 결론 숨기기: 직접 연구가 없다.
- measured 행은 모두 자체 실행이고, 독립 재현된 것은 없다.

### skill-creator vs writing-skills

| | skill-creator | superpowers writing-skills |
|---|---|---|
| 루프 | interview → draft → 프롬프트 2–3개, with/without 각 n=1 → grader → 사람 검토 | RED (스킬 없이 fresh subagent가 실패하는 것 확인) → GREEN → REFACTOR |
| 테스트 의무 | 선택 | 필수 (Iron Law) |
| 판정 | 별도 grader subagent + 사람 viewer, blind comparator는 선택 | 작성 agent 본인 (외부 판정 harness는 있으나 호출 안 함) |
| 도구 | `run_eval`, `run_loop` (60/40 holdout, 3 runs, ≤5 iterations, 최대 300 `claude -p`) | prose + graphviz |
| 공개 결과 | triggering 5/6 [56] | 금지문 역효과, control 40/40, 25/25 [9][10] |
| 비용 | 미공개 | 샘플당 ~$0.15–0.30 |
| 알려진 결함 | n=1로는 노이즈 (±20%+ [59])와 구분 불가. `run_eval` 임시 사본이 설치된 플러그인 사본과 경쟁 (코드 추론, 미실행) [58]. 빈 피드백을 통과로 처리 | 자기 판정. "100% compliance" 주장에 데이터 없음. 설득 근거가 GPT-4o-mini 연구 [60]. 대문자 권위어 권장 ↔ skill-creator는 yellow flag로 봄 |

판정: 행동 변화 쪽은 writing-skills가 약간 우세하다 (control + 5 reps가 의무). 독립 판정과 trigger 조정은 skill-creator가 낫다. 두 방법을 직접 비교한 연구는 없다 [125].

**파일럿 권고:**
1. 실행 전에 기록한다: 성공 기준, 최소 차이, 중단 규칙.
2. 한국어 프롬프트 세트를 만든다: 실패를 유혹하는 시나리오 5개 + near-miss negative 5개 (인접 스킬과 경계).
3. arm은 3개 (no-skill / skill-creator판 / writing-skills판), arm당 ≥5 reps, 세션 모델 고정. control이 실패하지 않으면 스킬을 줄인다.
4. 외부 판정: 작성자가 아닌 판정자가 라벨을 가린 채 비교한다 (skill-creator comparator 또는 팀원). 가능한 항목은 기계 채점한다: 실패 테스트가 있는가, 재현 명령이 있는가, 고친 층이 맞는가.
5. 지표: 행동 기준 충족률, trigger 정밀도·재현율, 토큰·turn, 작성 시간.
6. `run_eval` 중에는 플러그인 사본을 제거하거나 rename한다. 사본끼리 경쟁한다는 것은 코드 추론이며 실행해 확인하지 않았다 [58].
7. 한계: 노이즈가 ±20%+라서 5 reps로는 큰 차이만 잡힌다 [59].

## 5. 외부 coding agent 호출

실행해서 확인하지 않았다. 문서와 소스 기준 (2026-11-25)이다. "(소스)"는 문서에는 없고 소스에만 있는 것, "(추정)"은 소스를 읽고 추론한 것이다.

| CLI | 바이너리 | one-shot | stdin | read-only flag | 출력 형식 | 설치·인증 확인 |
|---|---|---|---|---|---|---|
| Codex (0.172.0) [94][95][114] | `codex` | `codex exec` | `codex exec -` | 기본값, `-s read-only` | `--json`, `-o`, `--output-schema` | `codex login status` (exit 0/1은 소스. `CODEX_API_KEY`는 무시할 것으로 추정) |
| Gemini (0.71.1) [96][97][115][116] | `gemini` | `gemini -p` | `-p ""`와 함께 (stdin 뒤에 붙음) | 기본 모드 headless는 확인이 필요한 동작을 거부. plan 모드는 headless에서 exit_plan_mode 자동 승인 후 YOLO 로 넘어가므로 쓰지 않음 | `-o json` / `stream-json` | 확인 못함 (`--version`만) |
| opencode (1.19.6) [98][99][100][123] | `opencode` | `opencode run` | pipe (소스) | 내장 없음. `OPENCODE_PERMISSION` deny 규칙 (plan agent는 bash가 열려 있음) | `--format json` | `opencode auth list` |
| Cursor [101][102][121][122] | `agent` (`cursor-agent`는 legacy) | `agent -p` | 확인 못함 (문서 없음) | `--mode=ask`. `-p`는 `--force` 없이도 파일을 씀 | `--output-format json` | `agent status` |
| Qwen (0.28.4) [103][117] | `qwen` | `qwen -p` | 가능 | `--approval-mode plan` (문서 예시에는 빠져 있음) | `--output-format json` | 확인 못함 |
| Copilot (1.0.115) [104][105] | `copilot` | `copilot -p` | `-p` 없이 pipe (`-p`가 있으면 stdin 무시) | `--plan`, `--available-tools`, `--deny-tool`. 무인 실행은 승인 필요 동작 거부 | `--output-format json` (JSONL) | 확인 못함 |
| Amp [106][107][118][119] | `amp` | `amp -x` | 가능 | 없음 (`amp.tools.disable` 설정, 격리만 가능) | `--stream-json` | 확인 못함. `AMP_API_KEY` 필요 |
| Aider (0.86.0, 2026-05 이후 커밋 없음) [108][120] | `aider` | `--message` / `--message-file` | 확인 못함 (문서 없음) | `--chat-mode ask` 또는 `--dry-run` + `--no-auto-commits --no-gitignore` | JSON 없음 | 확인 못함 |
| pi (earendil-works/pi) [127] | `pi` | `pi -p` (`--print`) | pipe — 첫 프롬프트 앞에 붙음 (`git diff \| pi -p "Review"`) | `--no-tools` (`-nt`): 내장·확장·custom·MCP 도구 전부 끔. `--no-session`, `--no-approve`(프로젝트 로컬 설정 무시) | `--mode json` (JSONL) | `pi --version`. `pi auth check` 는 `--provider` 필요 |
| Claude Code [109][110][111] | `claude` | `claude -p` | 가능 (10MB 상한) | `--permission-mode plan` / `dontAsk`, `--tools ""` | `--output-format json` | `claude auth status` (exit 0/1). `--bare` 없이는 프로젝트 hook·MCP를 실행하고, `--bare`는 `ANTHROPIC_API_KEY`가 필요 |

설치 확인 권장: `command -v <bin>` (gstack, gsd-core, compound) [2][18][20]. addyosmani·OMC는 `which` + `--version`을 쓴다 [13][21].

기존 스킬의 호출 방식과 문서-코드 불일치 ("—" = 보고서에 없음):

| 스킬 | 탐지 | 동의 | 선택 기억 | 대체 | 불일치·비고 |
|---|---|---|---|---|---|
| addyosmani doubt-driven [13] | `which` + `--version`, 정확한 명령을 사용자가 확인 | 매 cycle | 없음 | 조용한 대체 없음, 비대화형이면 생략 | gemini `--approval-mode plan`을 read-only라 했지만 문서상 headless에서는 plan 종료 후 YOLO [97] |
| OMC interrogate [21] | `omc team` 3석 (claude, codex, gemini) | — | `team.roleRouting` | 빠진 reviewer는 이름을 밝힘 | read-only라 했지만 worker는 승인을 건너뜀. `omc ask`는 `--dangerously-bypass-approvals-and-sandbox` |
| ECC council-multi-model [16] | codex만 | packet마다 | — | "부재"로 보고 | Codex 0.146.0만 허용하는데 최신은 0.172.0 → 지금은 항상 부재일 가능성 |
| ECC santa-loop [16] | 고정 순서 Codex→Gemini→Antigravity→Claude | — | — | — | Codex `--sandbox read-only`+stdin, Gemini argv·read-only 없음; astra-review `ECC_ASTRA_CONSENT=1` 상시 동의 |
| gstack codex [2] | `command -v`, env·auth.json | 설정 | `codex_reviews` (Claude CLI 등 다른 runner에도 적용되는데 이름이 오해를 부름) | /codex 없음. /review는 native pass 유지, plan review는 read-only Plan subagent로 대체 | — |
| gstack /claude-code [2] | — | — | — | — | 역방향 (non-Claude host용): `claude -p` stdin, tools 없음 |
| gsd-core review [18] | `command -v` 8종 + 로컬 HTTP | — | `review.default_reviewers` | 다른 CLI가 하나도 없으면 설치 안내 후 종료 | codex·claude lane에 sandbox/read-only flag 없음 (cursor만 `--mode ask`) |
| compound-eng [20] | env marker + `command -v` | — | `cross_model_peer` (config.local.yaml) | codex → claude → grok → antigravity | acpx `--approve-reads --non-interactive-permissions deny`; codex read-only, opencode plan(edit·web deny), cursor ask; prompt `--file`, stdin </dev/null; Node ≥22.13 |
| pstack [7] | — | — | `pstack-models.md` (/setup-pstack) | 독립 reviewer가 없으면 `BLOCKED` | — |
| spec-kit [24] | — | — | — | — | codex exec argv·sandbox 없음, cursor-agent --force(쓰기), EXTRA_ARGS로 --dangerously-skip-permissions 주입 가능 |

skim한 리뷰 스킬 9개는 외부 CLI를 쓰지 않고 HTTP API만 쓴다. 바이너리 탐지, sandbox, stdin, 동의, 선택 기억이 모두 없다 [33]–[41].

## 6. jstack 3개 스킬에 대한 시사점

현재 상태:
- ambition은 51줄이다 [112].
- codex-side SKILL.md는 146줄 + review/challenge/consult.md + `scripts/codex_run.py`이고, gstack `/codex`에서 차용했다 (MIT, LICENSE-gstack) [113].
- 길이: 기본 50줄 안팎에서 시작해 Task 2 결과로 조정하고, 길어지면 codex-side처럼 모드 파일로 분리한다 [plan].

### debug

debug 스킬은 만들지 않는다. gstack 대체 규칙(읽기 전용 확인 → 실패 테스트 → 근본 원인 수정)을 팀 CLAUDE.md 버그 규칙으로 반영했다 (1f9e2ed, v6.4.4). 이 규칙도 미평가다.

- **CLAUDE.md 규칙 후보**
  - red가 나는 루프 gate: "No red-capable command, no Phase 2." + 루프 기법 순위 — mattpocock diagnosing-bugs, MIT [15]
  - 수정 수용 gate: mutation check, 삭제만 하는 diff 거부, revert-and-reconfirm — gsd-core, MIT [18]
  - 실패한 fix 횟수 세기 (3회째는 구조 재검토), 경계 계측 — superpowers, MIT [8]
  - "rerun·timeout 확대·skip은 가설이 아니다", "No probe, no cause" — gstack investigate @8781d9c0, MIT [2]
  - dirty tree를 첫 용의자로 보는 stash 실험 — compound-eng, MIT [20]
  - 검사 전에 가설 3–5개 순위 매기기 — OMC, MIT [21]
  - 재현이 올바른 이유로 실패하는지 확인하고, 고칠 층을 명시 — research [79][82]

### investigate

- **차용**
  - Observed / Inferred / Unknown, 확신 없는 추측보다 `inconclusive` — wshobson connectivity-triage, MIT [26]
  - 결정을 먼저 적기, premise를 반증 가능한 문장으로 — gstack, MIT [2]
  - why: 기록에서 답하고, 추론을 표시하고, 공백을 명시 — pstack, MIT [7]
  - 증거 강도 사다리, 서로 다른 가설 3 lane (lane 3은 측정 방법 자체를 의심) — OMC trace, MIT [21]
  - research firewall, 조사자에게 목표 숨기기 — BMAD, MIT (trademark: 이름은 쓰지 않음) [19]
  - 질문 작성자가 의도를 누설하지 않기 — humanlayer, Apache-2.0 (아이디어만. 문구를 복사하면 NOTICE 필요) [27]
  - map-territory: 주장 인용 → territory 검사 → delta — cc-thinking, MIT [25]
  - ACH 장치 (모든 가설 나열, 판별 증거 우선, 반증 시도) — Heuer [84]. KT: 원인은 IS와 IS NOT을 모두 설명해야 함 [85]
- **피할 것**
  - ACH·KT를 "증명된 방법"으로 서술하기 [83][25]
  - 매트릭스 전체를 강제하기 (RCT에서 분석가들이 단계를 건너뜀) [83]
  - 코드 버그 전용 단계 (결정: 코드 버그 아닌 문제 포함 [plan])
- **열린 질문**
  - KT IS/IS NOT의 역할 [plan]: 에이전트 측정 근거 없음 (−1.8pp 주장은 재확인 실패) [25]. 결정은 유지하되, 파일럿에서 control 대비 확인한다.
  - 코드 결함이 확정되면 CLAUDE.md 버그 규칙으로 넘긴다 [plan]. description negative는 이 hand-off만.
  - 측정 근거가 0건이다. "좋은 조사"의 판정 기준을 먼저 정의해야 한다. BMAD는 일반 조사와 결론이 같고 비용만 크다며 bmad-investigate를 은퇴시켰다 [19]. 기준에 비용 대비 결론 차이를 넣을지.

### ambition (분해 단계)

- **차용**
  - 첫 task = tracer (전 층 관통 + 자동 verify), "Skeleton이 ~5 task를 넘으면 skeleton이 아니다", "Task N 후 사용자가 새로 할 수 있는 것이 있나?" — gsd-core, MIT [18]
  - 분할 경계: 리뷰어가 한 task를 거부하고 이웃은 승인할 수 있는 곳 — superpowers, MIT [8]
  - 분할 휴리스틱 ('and', AC가 3줄 초과, subsystem 2개, 1세션 초과) — addyosmani, MIT [13]
  - "Split, never shrink", 슬라이스마다 실행 가능한 check 1개 — BMAD, MIT [19]
  - "Safe after every merge" — compound-eng, MIT [20]
  - "fog or ticket", decision ticket과 build ticket 분리 — mattpocock, MIT [15]
  - 슬라이스는 80% 길이 안, 파일 수 최소 — research [86][87]
- **피할 것**
  - LLM 복잡도 점수 threshold, testStrategy null 허용 (task-master) [31]
  - 수평 슬라이스 (Setup·test·doc을 끝에 몰기) [32]
  - phase N을 phase N+1로만 검증하기 [29]
  - 확장을 scope creep로 막기 (gsd-core) [18]. ambition은 확장이 먼저다 [112].
- **열린 질문**
  - 확장 단계도 측정 근거가 없다 (plan-ceo-review no gain) [2]. 무엇으로 판정할지.

### stress-review

- **차용**
  - CLAIM 숨김, "strip reasoning, not evidence", codex/gemini를 stdin + read-only로 호출하는 형태 — addyosmani doubt-driven, MIT [13] (gemini plan 모드 오류는 제외)
  - ECC council / council-multi-model, 저장소 MIT, skill별 license는 확인 필요 [16]:
    - 자기 입장을 먼저 쓴 뒤 voice 읽기
    - 빈 temp dir·ephemeral·user config 무시
    - 같은 provider면 라벨 표시
    - reviewer가 없으면 "부재"로 보고
  - same-family rule, missing coverage ≠ clean, Recommendation은 finding을 지목 — gstack, MIT (codex-side는 Recommendation 줄과 stdin read-only runner를 이미 차용) [2][113]
  - 재실행으로 증명된 finding만 — pstack / OMC, MIT [7][21]
  - 원문 인용 grounding, 반박될 때만 drop — oaustegard, MIT [34]
  - hunter와 verifier 분리 — cloudflare, MIT [37]
  - Blind Hunter (diff 경로만 전달) — BMAD, MIT [19]
  - host 계열 제외, `CLAUDE_CODE_DISABLE_CLAUDE_MDS` — gsd-core, MIT [18]
  - read-only 설정 — compound-eng, MIT [20] (Node ≥22.13 필요):
    - acpx `--approve-reads --non-interactive-permissions deny`
    - codex read-only, opencode plan(edit·web deny), cursor ask
    - prompt `--file`, stdin </dev/null
  - 숨김 목록 명시 — EGM, **Apache-2.0** (문구를 복사하면 NOTICE 필요) [23]
  - 선택 기억 패턴: `review.default_reviewers` [18], `team.roleRouting` [21], `cross_model_peer` [20]
  - 동점이면 LIKELY_TP — trailofbits, **CC-BY-SA-4.0** (아이디어만) [36]. NeoLab (GPL-3.0) [38], llm-council (license 없음) [41]은 문구 복사 금지.
- **피할 것**
  - 같은 컨텍스트 persona 합의 (독립 증거 아님) [39]
  - 작성자가 반박하는 루프 (FlipFlop) [71]
  - 설명·수정을 요구한 뒤 검증하지 않기 [74]
  - CLI 버전 고정 → 최신에서 항상 부재 (ECC Codex 0.146.0) [16]
  - 위험한 flag:
    - `--dangerously-bypass-approvals-and-sandbox` [21]
    - cursor `-p` (`--force` 없이도 씀) [102], `cursor-agent --force` (쓰기) [24]
    - gemini plan 모드 headless [97]
    - amp (read-only 없음) [119]
    - `--bare` 없는 `claude -p` [109]
    - sandbox 없는 `codex exec` argv 호출 [24]
    - `SPECKIT_INTEGRATION_*_EXTRA_ARGS`로 `--dangerously-skip-permissions` 주입 [24]
- **열린 질문**
  - "작성자 결론" vs "작성자 의도" 중 무엇을 숨길지. 직접 연구가 없고, skim한 리뷰 스킬 9개 중 의도를 숨기는 곳도 없다 [33]–[41].
  - pre-mortem 근거가 얇다 (확신만 측정) [77][78]. 효과를 무엇으로 볼지.
  - cursor (stdin 미문서), aider (JSON 없음), amp (read-only 없음)를 지원 목록에서 뺄지.
  - 선택 기억을 어디에 저장할지 (저장소 vs 사용자 홈), 재선택은 어떻게 할지.
  - fresh Claude subagent에도 codex-side와 같은 P0/P1 gate 형식 (fail-closed)을 적용할지 [113].

## 출처

1. discovery 워크플로 결과 (로컬 scratchpad, 커밋 안 함) (보조: 같은 폴더의 discovery-summary.txt, 항목이 160–260자에서 잘림)
2. https://github.com/garrytan/gstack/tree/9a550bca9c25caf7c3ac9d3377249a261910059a
3. https://github.com/garrytan/gstack-evals/blob/c90ab277ab90104dd692972589c17b203863c271/wiki/board/2026-11-07-geva-380-r3c-results.md
4. https://github.com/garrytan/gstack/blob/ef99eb5a55d7e36a69df04654229f811a17e87c5/changelog.d/capy-gst-1717-retire-investigate.md
5. https://github.com/garrytan/gstack-evals/blob/dc4a621e2a19033ff6d4699eacb8b36ac5fcb23c/wiki/board/2026-11-04-geva-281-r2-after-pin-results-home-field.md
6. https://github.com/garrytan/gstack-evals/blob/dc4a621e2a19033ff6d4699eacb8b36ac5fcb23c/wiki/board/2026-11-19-geva-540-skill-pack-h2h-results/README.md
7. https://github.com/michael-denyer/pstack-claude/tree/103a68d9a9aa23759d00ad95b01cb78cb8f57772
8. https://github.com/obra/superpowers/tree/22f0b463e7a5e579904dd6211a520321035526f7
9. https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/docs/superpowers/specs/2026-06-10-positive-instruction-redesign-design.md
10. https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/docs/superpowers/specs/2026-07-06-sdd-plan-scoped-workspace-eval-results.md
11. https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/docs/superpowers/specs/2026-06-10-strict-cost-sdd-design.md
12. https://github.com/SuperClaude-Org/SuperClaude_Framework/tree/fe68862c8ed9e2afb8120c2d9e27d0c3a7ce73a2
13. https://github.com/addyosmani/agent-skills/tree/e997ac5b9a74eab332d5e9793bb38a38c8cfdd74
14. https://github.com/addyosmani/agent-skills/blob/e997ac5b9a74eab332d5e9793bb38a38c8cfdd74/evals/README.md
15. https://github.com/mattpocock/skills/tree/d65391149dbb5fe76478e76fa8d5122b2aa5a70e
16. https://github.com/affaan-m/ECC/tree/4adeee6732a12d1540f49a4d50a38ce8c97f9a53
17. https://github.com/affaan-m/ECC/blob/4adeee6732a12d1540f49a4d50a38ce8c97f9a53/docs/gateguard/question-effectiveness.md
18. https://github.com/open-gsd/gsd-core/tree/7bca148da5e231a39b1513f13b3cb3fd271478e5
19. https://github.com/bmad-code-org/BMAD-METHOD/tree/e435a22574fe55722841086e5566420178b98df3
20. https://github.com/EveryInc/compound-engineering-plugin/tree/fcb5e3adc1890db34f482f73e2449f3c57a2f423
21. https://github.com/Yeachan-Heo/oh-my-claudecode/tree/9f2a74b6b6419f2b2135fb22569a529d8aba681e
22. https://github.com/Yeachan-Heo/oh-my-claudecode/issues/1240
23. https://github.com/google/elephant-goldfish-model/tree/63e239d8d4c3ddc6774faf533b4997405f78c549
24. https://github.com/github/spec-kit/tree/f61648db96b5ac5eb65a54577865dafc2c830a7c
25. https://github.com/tjboudreaux/cc-thinking-skills/blob/7b8fece345dfaa11773be7152ccd194589cb5437/analysis/AUDIT.md
26. https://github.com/wshobson/agents/tree/c96b5f6552dba32e4492307493ee613581430715
27. https://github.com/humanlayer/humanlayer/blob/fb899cd/apps/riptide-rpi-claude-plugin/skills/create-research-questions/SKILL.md
28. https://github.com/cursor/plugins/blob/41e4009/pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md
29. https://github.com/gsd-build/gsd-2/blob/33c00aa/src/resources/skills/decompose-into-slices/SKILL.md
30. https://github.com/deanpeters/Product-Manager-Skills/blob/476ae12/plugins/pm-develop/skills/user-story-splitting/SKILL.md
31. https://github.com/eyaltoledano/claude-task-master/blob/c0c98d3/src/prompts/expand-task.json
32. https://github.com/Fission-AI/OpenSpec/blob/f1cd852/schemas/spec-driven/schema.yaml
33. https://github.com/anthropics/claude-plugins-official/blob/6985b2d/plugins/code-review/commands/code-review.md
34. https://github.com/oaustegard/claude-skills/blob/b9eb735afa8283777a6a817abbfd756e3c82268c/verifying-review-findings/references/method.md
35. https://github.com/oaustegard/claude-skills/blob/b9eb735/challenging/SKILL.md
36. https://github.com/trailofbits/skills/blob/149d7b2/plugins/rust-review/agents/rust-review-fp-judge.md
37. https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c/skills/security-audit/VALIDATION-AND-REPORTING.md
38. https://github.com/NeoLabHQ/context-engineering-kit/blob/23e2428/plugins/sadd/skills/judge-with-debate/SKILL.md
39. https://github.com/alirezarezvani/claude-skills/blob/ea7b5ab/engineering-team/skills/adversarial-reviewer/SKILL.md
40. https://github.com/raddue/crucible/blob/5a947fb/skills/red-team/SKILL.md
41. https://github.com/aiwithremy/claude-skills-llm-council/blob/55ee36e/SKILL.md
42. https://github.com/OthmanAdi/planning-with-files
43. https://github.com/buildermethods/agent-os
44. https://github.com/OneRedOak/claude-code-workflows
45. https://github.com/gemini-cli-extensions/conductor
46. https://github.com/ruvnet/ruflo
47. https://github.com/solatis/claude-config
48. https://github.com/alibaba/open-code-review
49. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices.md
50. https://code.claude.com/docs/en/skills.md
51. https://github.com/anthropics/skills/blob/e4bb5d960d87126ff3b3a8af1a104b7db67560ba/skills/skill-creator/SKILL.md
52. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices.md
53. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5.md
54. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2.md
55. https://code.claude.com/docs/en/plugin-evals.md
56. https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills
57. ~/.claude/plugins/cache/claude-plugins-official/superpowers/7.0.2/skills/writing-skills/SKILL.md
58. ~/.claude/plugins/cache/claude-plugins-official/skill-creator/6985b2d88dc0/skills/skill-creator/scripts/run_eval.py
59. https://github.com/prime-radiant-inc/superpowers-evals/blob/e64684cd1fa270c464ac797747e45bbe8d127e8b/docs/superpowers/skills/micro-testing-prompt-guidance.md
60. https://gail.wharton.upenn.edu/research-and-insights/persuading-llms-initial-study/
61. https://gail.wharton.upenn.edu/research-and-insights/persuading-llms-objectionable-requests/
62. https://arxiv.org/abs/2602.12670
63. https://arxiv.org/abs/2310.01798
64. https://arxiv.org/abs/2507.02778
65. https://arxiv.org/abs/2311.08516
66. https://arxiv.org/abs/2407.00215
67. https://arxiv.org/abs/2508.17536
68. https://arxiv.org/abs/2410.12853
69. https://arxiv.org/html/2310.13548v4
70. https://arxiv.org/html/2305.04388v2
71. https://arxiv.org/abs/2311.08596
72. https://arxiv.org/abs/2603.18740
73. https://arxiv.org/abs/2607.10411
74. https://arxiv.org/abs/2603.00539
75. https://research.chalmers.se/publication/524536/file/524536_Fulltext.pdf
76. https://arxiv.org/abs/1702.00502
77. https://colab.ws/articles/10.1002%2Fbdm.3960020103
78. https://corporate.jcx.au/premortem
79. https://arxiv.org/html/2407.01489v2
80. https://arxiv.org/html/2506.18824v1
81. https://arxiv.org/html/2511.00197v1
82. https://arxiv.org/html/2604.02547v1
83. https://strathprints.strath.ac.uk/69049/
84. https://www.cia.gov/resources/csi/static/Pyschology-of-Intelligence-Analysis.pdf
85. https://kepner-tregoe.com/?p=43439
86. https://arxiv.org/html/2503.14499v2
87. https://arxiv.org/html/2509.16941v2
88. https://arxiv.org/abs/2303.06689v5
89. https://arxiv.org/abs/2309.12499v1
90. https://www.anthropic.com/research/effective-harnesses-for-long-running-agents
91. http://web.archive.org/web/20081016063214/http://alistair.cockburn.us/Walking+skeleton
92. https://www.artima.com/articles/tracer-bullets-and-prototypes
93. http://web.archive.org/web/20251223023134/https://xp123.com/invest-in-good-stories-and-smart-tasks/
94. https://learn.chatgpt.com/docs/non-interactive-mode
95. https://github.com/openai/codex/blob/87de5e932dd03bb9efece4a6dd3eab4c5de45701/codex-rs/cli/src/login.rs
96. https://github.com/google-gemini/gemini-cli/blob/08e9a20f749aefcbda38622ac757899c3d6216e0/docs/cli/cli-reference.md
97. https://github.com/google-gemini/gemini-cli/blob/08e9a20f749aefcbda38622ac757899c3d6216e0/docs/cli/plan-mode.md
98. https://github.com/anomalyco/opencode/blob/1a6aea85ee463a8c225d5104deea912151a37888/services/site/src/docs/v1/content/cli.mdx
99. https://github.com/anomalyco/opencode/blob/v1.19.6/packages/opencode/src/cli/cmd/run.ts
100. https://github.com/anomalyco/opencode/blob/1a6aea85ee463a8c225d5104deea912151a37888/services/site/src/docs/v1/content/permissions.mdx
101. https://cursor.com/docs/cli/reference/parameters
102. https://cursor.com/docs/cli/headless
103. https://github.com/QwenLM/qwen-code/blob/c79def6b2bf857db20da82c3c6836adbfd0cf1ff/docs/users/features/headless.md
104. https://docs.github.com/en/copilot/reference/cli-command-reference
105. https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically
106. https://ampcode.com/docs/cli/execute-mode
107. https://ampcode.com/docs/cli/settings
108. https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/website/docs/config/options.md
109. https://code.claude.com/docs/en/headless.md
110. https://code.claude.com/docs/en/cli-reference.md
111. https://code.claude.com/docs/en/permission-modes.md
112. plugins/jstack/skills/ambition/SKILL.md
113. plugins/jstack/skills/codex-side/SKILL.md
114. https://learn.chatgpt.com/docs/auth
115. https://github.com/google-gemini/gemini-cli/blob/08e9a20f749aefcbda38622ac757899c3d6216e0/docs/cli/headless.md
116. https://github.com/google-gemini/gemini-cli/blob/08e9a20f749aefcbda38622ac757899c3d6216e0/docs/reference/policy-engine.md
117. https://github.com/QwenLM/qwen-code/blob/c79def6b2bf857db20da82c3c6836adbfd0cf1ff/docs/users/features/approval-mode.md
118. https://ampcode.com/docs/cli/streaming-json
119. https://ampcode.com/docs/tools
120. https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/website/docs/usage/modes.md
121. https://cursor.com/install
122. https://cursor.com/docs/cli/overview
123. https://github.com/anomalyco/opencode/blob/1a6aea85ee463a8c225d5104deea912151a37888/services/site/src/docs/v1/content/agents.mdx
124. docs/plans/skills-investigate-slice-stress-review-plan.md ([plan] = 이 계획)
125. creator-vs-writing 조사 보고서 (skill-creator 6985b2d vs superpowers 7.0.2 writing-skills, 2026-11-25, 본 조사 입력)
126. https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/docs/superpowers/specs/2026-06-09-sdd-task-scoped-review-dispatch-design.md

127. https://github.com/earendil-works/pi/blob/c11a73bfba1310dc4075ad836254ea87003f409b/packages/coding-agent/docs/cli.md (2026-11-25 추가, 사용자 요청)

## 부록 A. 핵심 주장 재확인 (2026-11-25)

계획이 기대는 6개를 원문으로 다시 확인했다 (구조 검증 이후 별도 확인).

| 주장 | 판정 | 원문 근거 |
|---|---|---|
| gstack R3c: +2.8pt (CI −5.8~+11.4), 성공당 +43%, 판정 FIX-METHOD·not CUT-CANDIDATE, 그래도 은퇴 [3][4] | 확인 | "The frozen rule reads FIX-METHOD (power) ... It is not a CUT-CANDIDATE." / 커밋 ef99eb5a "retire /investigate after a no-gain eval" |
| superpowers 금지문 4.4 vs 3.6 [9] | 일부 | 지표 = dispatch 프롬프트에 spec 값을 다시 적은 수 (높을수록 나쁨), 한 사례. 이산 행동 금지는 0/5 vs 3/5 로 효과 — "금지문 일반이 나쁘다"는 아님 |
| BMAD bmad-investigate 은퇴 [19] | 확인 | "Every pair landed on the same answer ... The skill cost about 1.5× as much and took twice as long every time." (PR #2509) |
| cc-thinking KT −1.8pp (n=224) [25] | 재확인 실패 | 해당 ref 의 AUDIT.md 에서 찾지 못함. 찾은 수치: scientific-method fault_loc 0.925 vs placebo 0.885 (+4.0pp, n=426) |
| gemini plan 모드 headless YOLO [97] | 일부 | plan 모드 자체는 read-only. 단 exit_plan_mode 가 자동 승인되고 나가면 YOLO → `--approval-mode plan -p` 는 read-only 보장 안 됨 |
| cursor `-p` 는 `--force` 없이도 씀 [102] | 확인 | "Print mode writes to files in your workspace even without --force." |

## 부록 B. 조사 뒤 사용자 결정 (2026-11-25)

§6 시사점과 다른 결정. 계획 `docs/plans/skills-investigate-slice-stress-review-plan.md` 가 기준이다.

- `ambition` 쪼개기: walking skeleton 대신 행동 단위 TDD식 (조각 = 실패 테스트 → 구현 → 통과, 테스트는 사용자가 보는 입구에서). 양쪽 다 에이전트 측정 근거 없음.
- 버그 실존·재현 확인은 별도 `debug` 스킬 없이 `investigate` 가 맡는다 (`/investigate` 직접 호출 — 수정 요청을 가로채지 않게 버그 트리거 없음). 소스는 고치지 않고, 다음 턴의 수정 계획이 쓸 인계 블록을 남긴다.
- 시범 채점: 두 팔 공통 `ANSWER:` 줄, 기준선 PASS + margin > n 이면 초안 전 시나리오 강화, headless 는 허용 목록 + Edit/Write 시도로 수정 판정.
- `stress-review` 지원 CLI 에 pi 추가 (§5 [127]).

계획 검토(`plans-adversarial-review`, 확인 33건) 뒤 결정:

- 실행 위치: 기능 브랜치 `jin/skills-investigate-stress-review`, worktree 없이 메인 체크아웃 (테스트 gitignore·문서 미추적이라 worktree 에 없다).
- 탈락 규칙: `investigate` 와 `ambition` 쪼개기만 기준선 비교로 탈락할 수 있다. `stress-review` 는 `codex-side` 이식이라 탈락 없이 시나리오 통과 기준만 (S4·S5 각 5/5 + 대화형 확인).
- held-out 누설 방지: held-out 시나리오·정답 작성과 초안 작성은 서로 다른 새 하위 Agent 가 한다. 초안 Agent 는 설계와 dev 만 받는다. 계획에는 held-out 의 종류만 남긴다. 재판정 없음.
- 채점 보강: margin 은 두 팔을 합친 통과율로 계산하고 최소 1, 기준선 만점이면 결정 불가. 버그 확인 보기는 `결함 있음 | 결함 아님 | 판단 불가` (스킬 어휘 아님). 소스 수정 = `source_globs` 에 맞는 Edit/Write 시도. `ambition` 쪼개기는 공통 `TASK` 줄을 파일 경로로 채점.
- 방법 승자(skill-creator vs writing-skills)는 채택 여부와 별개로 held-out PASS 많은 쪽.
- `stress-review`: codex 외 CLI 엔 Claude 가 뽑은 diff 만 붙여 보낸다 (소스 파일 전체 전송 없음). Claude 서브에이전트는 읽기 전용 유형으로 띄우고 답을 `agent_run.py --gate-text` 로 판정한다.
- 시범 결과는 부록 C 에 기록한다 (`WINNER`, `investigate: 채택|제외`, `쪼개기: 채택|제외`).

## 부록 C. 시범 결과 (2026-11-25)

조건: headless Claude Code, opus, 시나리오당 5회, 결정적 채점 (마지막 `ANSWER:` 줄).

### investigate

`WINNER: A` · `investigate: 제외`

held-out 5종, 팔당 n=25:

| 팔 | PASS | 비용 | 자동 발동 | HANDOFF | FORMAT 라벨/가설/인계 |
|---|---|---|---|---|---|
| 기준선 | 25/25 | $5.56 | — | 0/5 | 2/0/0 |
| A (skill-creator) | 25/25 | $5.98 | 15/15 | 0/5 | 22/18/21 |
| B (writing-skills) | 25/25 | $5.89 | 6/15 | 0/5 | 16/0/12 |

- 기준선이 만점이라 차이 0, margin 1 미달 → 제외. 시나리오 난이도를 dev 3회·held-out 3회 올렸으나 기준선은 계속 만점이었다 (dev 56/56, held-out 45/45).
- B 는 자동 발동 9/15 미발동 → "발동 안 함" 기록. 방법 승자는 A (사용자 동의).
- 두 초안 모두 dev 에서는 HANDOFF 3/3, held-out 에서는 0/5 — dev 에 맞춰진 것으로 본다.
- 한계: PASS 로는 스킬 효과를 볼 수 없었다. 표본이 작아 큰 효과만 잡힌다.
