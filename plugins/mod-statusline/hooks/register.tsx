// mod-statusline — 셸 statusline 을 대체하는 프롬프트 위 band.
//
//   session.start ─┐                        ┌─ ui.render AbovePrompt (buildRows)
//   session.measure ─┼─ update(snap) ─ $.state ┤
//   turn.complete ──┤                        └─ toast (alerts, 넘는 순간 1회)
//   1초 ticker ─────┘ (턴 시간·백그라운드 수)
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Snapshot } from '../types'
import { alerts, buildRows, countRunning, EMPTY, modelLabel, modelWeekFromCache, parseGitStatus } from './format'

const snap = atom({ plugin: 'mod-statusline', key: 'snap' } as const, EMPTY)

const TICK_MS = 1000
const GIT_TIMEOUT_MS = 3000
const USAGE_CACHE = '.claude/.usage-cache.json' // 사용량 타이머(fetch_claude_usage.py)가 쓰는 파일
const TONE_COLOR = { normal: undefined, warning: 'warning', error: 'error' } as const

type $ = EngineInterface

/** 값이 바뀐 필드만 반영 — 같으면 이전 객체를 돌려줘 다시 그리지 않는다. */
async function patch($: $, fields: Partial<Snapshot>): Promise<void> {
  await update($, snap, s => {
    const changed = (Object.keys(fields) as (keyof Snapshot)[]).some(k => s[k] !== fields[k])
    return changed ? { ...s, ...fields } : s
  })
}

async function readModelWeek($: $, nowMs: number) {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
  if (!home) return undefined
  const path = `${home}/${USAGE_CACHE}`
  if (!(await $.fs.exists(path))) return undefined
  try {
    return modelWeekFromCache(JSON.parse(await $.fs.read(path)), nowMs / 1000)
  } catch {
    return undefined // 타이머가 쓰는 중이면 JSON 이 잘린다 — 다음 갱신에 다시 읽는다
  }
}

/** 턴 사이에 바뀌는 것: 위치·git·모델·모델별 7D. */
async function refreshLocal($: $): Promise<void> {
  const cwd = await $.session.cwd()
  const now = await $.clock.now()
  const git = await $.process
    .run(['git', 'status', '--porcelain=v1', '-b'], { cwd, timeoutMs: GIT_TIMEOUT_MS })
    .catch(() => undefined) // git 미설치
  const { branch, dirty } = git?.exitCode === 0 ? parseGitStatus(git.stdout) : { branch: undefined, dirty: undefined }
  await patch($, {
    dir: cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd,
    branch,
    dirty,
    model: modelLabel(await $.session.model()),
    modelWeek: await readModelWeek($, now),
    now,
  })
}

export const register: Register = on => {
  let ticker: Timer | undefined
  const alerted = new Set<string>()

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refreshLocal($)
    ticker?.cancel()
    ticker = $.clock.every(TICK_MS, async () => {
      const s = await read($, snap)
      const agents = countRunning(await $.agent.list())
      await patch($, s.turnStartedAt === undefined ? { agents } : { agents, now: await $.clock.now() })
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
    const crossed = alerts(await read($, snap))
    for (const key of alerted) if (!crossed.has(key)) alerted.delete(key)
    for (const [key, text] of crossed) {
      if (alerted.has(key)) continue
      alerted.add(key)
      $.ui.toast(text)
    }
    return next(e)
  })

  // effort 는 classic hook 입력에만 실린다 (PreToolUse 는 mod 에선 envelope 라 없음) → 첫 턴 끝부터 표시.
  // 표시용 hook 이 실패해도 턴·프롬프트를 막지 않게 .catch 로 통과.
  on('classic.Stop', async ($, e, next) => {
    if (e.effort?.level) await patch($, { effort: e.effort.level })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    const now = await $.clock.now()
    await patch($, { turnStartedAt: now, now })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId) {
      await patch($, { turnStartedAt: undefined })
      await refreshLocal($)
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const rows = buildRows(await read($, snap))
    if (rows.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {rows.map(row => (
          <Text>
            {row.flatMap((seg, i) => {
              const cell = <Text color={TONE_COLOR[seg.tone]}>{seg.text}</Text>
              return i === 0 ? [cell] : [<Text dimColor> │ </Text>, cell]
            })}
          </Text>
        ))}
      </Box>
    )
  })
}
