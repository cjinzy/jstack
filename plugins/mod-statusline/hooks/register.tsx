// mod-statusline — 셸 statusline 을 대체하는 프롬프트 위 band (같은 항목·포맷·색 + mod 칸).
//
//   session.start ───────┐                        ┌─ ui.render AbovePrompt (buildRows)
//   session.measure ─────┤                        │
//   turn.start/step/complete ─┼─ update(snap) ─ $.state ┤
//   1초 ticker ──────────┘ (턴 시간·백그라운드 수,  └─ toast (alerts, 넘는 순간 1회)
//                          60초마다 사용량 캐시)
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Snapshot } from '../types'
import { alerts, buildRows, countRunning, effortFromSettings, EMPTY, modelLabel, parseGitStatus, parseShow, parseUsageCache } from './format'

const snap = atom({ plugin: 'mod-statusline', key: 'snap' } as const, EMPTY)

const TICK_MS = 1000
const USAGE_POLL_MS = 60_000 // 타이머가 캐시를 쓰는 주기(최소 1분)에 맞춤
const GIT_TIMEOUT_MS = 3000
// 셸 statusline 과 같은 파일
const USAGE_CACHE = '.claude/.usage-cache.json'
const CONFIG_FILE = '.claude/statusline-config.txt'
const SEP_COLOR = 'gray'

type $ = EngineInterface

/** 이전 버전이 남긴 값에 없는 필드는 EMPTY 로 채운다 ($.state 는 reload 를 넘어 남는다). */
async function current($: $): Promise<Snapshot> {
  return { ...EMPTY, ...(await read($, snap)) }
}

/** 값이 바뀐 필드만 반영 — 같으면 이전 객체를 돌려줘 다시 그리지 않는다. */
async function patch($: $, fields: Partial<Snapshot>): Promise<void> {
  await update($, snap, s => {
    const changed = (Object.keys(fields) as (keyof Snapshot)[]).some(k => s[k] !== fields[k])
    return changed ? { ...EMPTY, ...s, ...fields } : s
  })
}

async function readHomeFile($: $, rel: string): Promise<string | undefined> {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
  if (!home) return undefined
  const path = `${home}/${rel}`
  if (!(await $.fs.exists(path))) return undefined
  return $.fs.read(path).catch(() => undefined)
}

async function readUsage($: $) {
  const text = await readHomeFile($, USAGE_CACHE)
  try {
    return text ? parseUsageCache(JSON.parse(text)) : undefined
  } catch {
    return undefined // 타이머가 쓰는 중이면 JSON 이 잘린다 — 다음 갱신에 다시 읽는다
  }
}

/** 턴 사이에 바뀌는 것: 위치·git·모델·사용량 캐시·표시 설정. */
async function refreshLocal($: $): Promise<void> {
  const cwd = await $.session.cwd()
  const git = await $.process
    .run(['git', 'status', '--porcelain=v1', '-b'], { cwd, timeoutMs: GIT_TIMEOUT_MS })
    .catch(() => undefined) // git 미설치
  const { branch, dirty } = git?.exitCode === 0 ? parseGitStatus(git.stdout) : { branch: undefined, dirty: undefined }
  await patch($, {
    dir: cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd,
    branch,
    dirty,
    model: modelLabel(await $.session.model()),
    usage: await readUsage($),
    show: parseShow(await readHomeFile($, CONFIG_FILE)),
    now: await $.clock.now(),
  })
}

export const register: Register = on => {
  let ticker: Timer | undefined
  const alerted = new Set<string>()

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    // 시작 시 effort 는 settings 에서 (mod 의 $.env 에는 CLAUDE_EFFORT 가 없다). 요청마다 turn.step 이 갱신.
    const [modelSettings, effortLevel, model] = await Promise.all([
      $.settings.read({ key: 'modelSettings' }),
      $.settings.read({ key: 'effortLevel' }),
      $.session.model(),
    ])
    await patch($, {
      turnStartedAt: undefined,
      version: (await $.session.version()).version,
      effort: effortFromSettings(modelSettings, effortLevel, model),
    })
    await refreshLocal($)
    ticker?.cancel()
    let usageReadAt = await $.clock.now()
    ticker = $.clock.every(TICK_MS, async () => {
      const s = await current($)
      const now = await $.clock.now()
      const fields: Partial<Snapshot> = { agents: countRunning(await $.agent.list()) }
      if (s.turnStartedAt !== undefined) fields.now = now
      if (now - usageReadAt >= USAGE_POLL_MS) {
        usageReadAt = now
        Object.assign(fields, { usage: await readUsage($), now })
      }
      await patch($, fields)
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    await patch($, {
      ctx: e.context.percent,
      limits: e.rateLimits.map(r => ({ kind: r.kind, percent: r.percentUsed, resetsAt: r.resetsAt })),
      usd: e.cost?.usd,
      now: await $.clock.now(),
    })
    const crossed = alerts(await current($))
    for (const key of alerted) if (!crossed.has(key)) alerted.delete(key)
    for (const [key, text] of crossed) {
      if (alerted.has(key)) continue
      alerted.add(key)
      $.ui.toast(text)
    }
    return next(e)
  })

  // prompt.submit 이 아닌 turn.start: 턴 없는 슬래시 명령·턴 중 입력이 타이머를 건드리지 않게.
  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const now = await $.clock.now()
    await patch($, { turnStartedAt: now, now })
    return next(e)
  })

  // main 의 모델 요청마다: 보낸 effort, 응답의 cache read 토큰 (셸 statusline 과 같은 값).
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    if (e.effort !== undefined) await patch($, { effort: String(e.effort) })
    const result = yield* next(e)
    const cacheRead = result.usage?.cache_read_input_tokens
    if (cacheRead !== undefined) await patch($, { cacheRead })
    return result
  })

  // 중단된 턴도 reason 'aborted' 로 여기 온다.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId) {
      await patch($, { turnStartedAt: undefined })
      await refreshLocal($)
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await current($)
    // now 0 = 아직 아무 이벤트도 못 받음 → 빈 값(7D: --% 등)을 잠깐 그리지 않는다.
    if (e.props.hasSurvey || s.now === 0) return next(e)
    // 턴 시간은 엔진이 작업 중이라고 할 때만 — 종료 이벤트를 놓쳐도 남지 않게.
    const rows = buildRows(e.props.isWorking ? s : { ...s, turnStartedAt: undefined }, e.props.bodyColumns)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {rows.map(row => (
          <Text>
            {row.flatMap((seg, i) => {
              const cells = seg.map(p => <Text color={p.color}>{p.text}</Text>)
              return i === 0 ? cells : [<Text color={SEP_COLOR}> │ </Text>, ...cells]
            })}
          </Text>
        ))}
      </Box>
    )
  })
}
