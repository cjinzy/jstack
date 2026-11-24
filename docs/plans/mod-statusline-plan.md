# mod-statusline 계획 (2026-11-24, jstack 6.4.0)

셸 statusline(`statusline-command.sh` + jq)을 대체하는 선택 설치 mod. 결정은 사용자 확인 완료: 대체, 핵심 4 + 알림 + 선택 4 전부.

## 표시 (프롬프트 위 band `ui.render AbovePrompt`, 색 지원, 모든 surface)

```
jstack · jin/mole-123 · MOLE-123 ●3 │ Opus 5.5 · high │ ⚙ 2 │ ⏱ 3:12
ctx 72% │ 5h 42% ↻1:20 │ 7D 63% ↻2d5h │ Fable 7D 30% │ $1.24
```

| 항목 | 출처 | 비고 |
|---|---|---|
| 위치 | `$.session.cwd()` + `git status --porcelain -b` | 이슈 ID 는 브랜치 `<user>/<team>-<n>` 에서 |
| 모델·effort | `$.session.model()`, effort 는 `classic.Stop` 입력 | effort 는 첫 턴 끝부터 (mod 의 `classic.PreToolUse` 입력엔 없음) |
| 5h·7D | `session.measure` 의 `rateLimits` | pacing = 사용률 ÷ 경과율 ≥ 1.2 노랑 (fetch_claude_usage 의 hot 기준), 창 초반 5% 는 판정 안 함 |
| ctx | `session.measure` 의 `context.percent` | 70 노랑, 85 빨강 |
| 모델별 7D | `~/.claude/.usage-cache.json` `seven_day_model` | 30분 넘게 낡았거나 없으면 생략 |
| 비용 | `cost.usd` | `rateLimits` 가 비었을 때(구독 아님)만 |
| 백그라운드 | `$.agent.list()` 중 pending·running·waiting | 0 이면 생략 |
| 턴 시간 | main `turn.start` → `turn.complete`(중단 포함), 1초 갱신 | `isWorking` 일 때만 표시, `session.start` 에서 초기화 |
| 알림 | ctx 85, 5h·7D 90, pacing hot 진입 | 넘는 순간 toast 1회 |

## 파일
- `plugins/mod-statusline/` — `.claude-plugin/plugin.json`(1.0.0), `hooks/hooks.json`, `hooks/register.tsx`, `hooks/format.ts`(순수 함수), `hooks/*.test.ts`, `types/index.d.ts`
- `.claude-plugin/marketplace.json` 항목 추가, jstack 6.4.0 (5곳)
- claude-init: `OPTIONAL_PLUGINS` 에 `mod-statusline@jstack`, `EXPECTED_MARKETPLACES` 에 `jstack`. mod 선택 시 `statusLine` 강제 중단 + 우리 셸 statusLine 만 제거, preflight 필수 키에서 제외. 타이머 유지(모델별 7D).
- README 한/영: mod 설치·표시 설명

## 검증
`claude plugin validate`(mod·루트, TS 타입 검사 포함), `claude plugin test plugins/mod-statusline`(알림 1회 로직은 변이 검사로 확인), claude-init pytest, 기존 statusline 테스트.
push 는 사용자. 세션에 즉시 로드하지 않음.

## Ambition
- Altitude: N/A — 범위는 사용자가 기능 단위로 확정.
- Depth: 외부 판정자 = `claude plugin test`·validate·tsc·pytest. 반증할 가정: "`session.measure` 만으로 5h·7D 가 채워진다" → 첫 응답 전엔 비어 있음을 테스트로 고정(빈 칸 생략).
- Range: N/A — 단일 도구 구현.

## 실검증
`claude -p … --plugin-dir plugins/mod-statusline --debug-file` — session.start·turn.start·session.measure·classic.Stop·turn.complete 실행, 실패·skip 0. `ui.render` 는 `-p` 에서 안 그려져 테스트 키트로만 확인.

## 개정: 셸 statusline 항목 전부 (사용자 요청)
셸 statusline 이 더 낫다는 피드백 → 같은 항목·포맷·색으로. 추가: cache 토큰(`turn.step` 결과 usage), 버전(`$.session.version()`), pacing 라벨 CHILL/PACE/HOT, 실시간 7D 없을 때 캐시 7D, `STALE`, `⚠`·`⏳ RATE`, 10단계 색(hex), `SHOW_*`.
effort: mod 의 `$.env`·자식 프로세스엔 `CLAUDE_EFFORT` 가 없음(실험). 시작 시 settings `modelSettings[모델].effortLevel` → `effortLevel`, 요청마다 `turn.step` 의 실제 값.
빼먹은 것: last-good 7D 폴백(실시간 7D 가 대신함).
