import { expect, test } from 'claude-code/testing'

import type { Snapshot } from '../types'
import {
  alerts,
  buildRows,
  effortFromSettings,
  EMPTY,
  fmtElapsed,
  fmtReset,
  fmtTokens,
  issueFromBranch,
  levelColor,
  modelLabel,
  pace,
  parseGitStatus,
  parseShow,
  parseUsageCache,
  zoneOf,
  type Segment,
} from './format'

const HOUR = 3_600_000
const NOW = Date.parse('2026-11-24T12:00:00Z')
const NOW_S = NOW / 1000
const iso = (ms: number) => new Date(ms).toISOString()
const text = (seg?: Segment) => seg?.map(p => p.text).join('')
const texts = (row?: Segment[]) => row?.map(text)

test('pace·zone: 사용률 ÷ 경과율, fetch_claude_usage 와 같은 0.8 / 1.2', async () => {
  // 5h 창 절반 경과, 60% 사용 → 1.2
  const burn = pace({ kind: 'five_hour', percent: 60, resetsAt: iso(NOW + 2.5 * HOUR) }, NOW) ?? 0
  expect(Math.round(burn * 100)).toBe(120)
  expect(pace({ kind: 'five_hour', percent: 10, resetsAt: iso(NOW + 4.9 * HOUR) }, NOW)).toBeUndefined()
  expect([zoneOf(0.5), zoneOf(1), zoneOf(1.2), zoneOf(undefined)]).toEqual(['chill', 'on_track', 'hot', undefined])
})

test('셸과 같은 포맷: 리셋·토큰·10단계 색', async () => {
  expect(fmtReset(iso(NOW + 38 * HOUR), NOW)).toBe(' →1D/14H')
  expect(fmtReset(iso(NOW + 80 * 60_000), NOW)).toBe(' →1:20')
  expect(fmtReset(iso(NOW - 1), NOW)).toBe('')
  expect(fmtReset('garbage', NOW)).toBe('')
  expect([fmtTokens(undefined), fmtTokens(0), fmtTokens(850), fmtTokens(12_345), fmtTokens(3_400_000)]).toEqual(['TBD', 'TBD', '850', '12.3K', '3.4M'])
  // 셸 level_color: (pct+9)/10 → 0·10 은 1단계, 11 은 2단계, 91·100 은 10단계
  expect(levelColor(10)).toBe(levelColor(0))
  expect(levelColor(11)).not.toBe(levelColor(10))
  expect(levelColor(91)).toBe(levelColor(100))
  expect(fmtElapsed(HOUR + 2 * 60_000 + 3_000)).toBe('1:02:03')
})

test('모델 이름·이슈 ID·git status', async () => {
  expect(modelLabel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelLabel('claude-fable-5-2[1m]')).toBe('Fable 5.2')
  expect(issueFromBranch('jin/mole-123')).toBe('MOLE-123')
  expect(issueFromBranch('main')).toBeUndefined()
  expect(parseGitStatus('## main...origin/main [ahead 1]\n M a.ts\n?? b.ts\n')).toEqual({ branch: 'main', dirty: 2 })
  expect(parseGitStatus('## No commits yet on dev\n')).toEqual({ branch: 'dev', dirty: 0 })
})

test('statusline-config.txt: 키가 없거나 1 일 때만 표시 (셸과 같음)', async () => {
  expect(parseShow(undefined)).toEqual({ dir: true, branch: true, usage: true })
  expect(parseShow('SHOW_DIRECTORY=0\nSHOW_USAGE="1"\n')).toEqual({ dir: false, branch: true, usage: true })
  expect(parseShow('SHOW_BRANCH=false')).toEqual({ dir: true, branch: false, usage: true })
})

// fetch_claude_usage.py 가 쓰는 실제 형태
const CACHE = {
  fetched_at: NOW_S - 60,
  seven_day: { utilization: 27, resets_at: iso(NOW + 38 * HOUR) },
  pacing: { seven_day: { zone: 'chill' } },
  seven_day_model: { label: 'Fable', utilization: 18, resets_at: iso(NOW + 38 * HOUR) },
  error_reason: null,
  consecutive_errors: 0,
}

test('사용량 캐시 파싱', async () => {
  expect(parseUsageCache(CACHE)).toEqual({
    fetchedAt: NOW_S - 60,
    sevenDay: { percent: 27, resetsAt: iso(NOW + 38 * HOUR) },
    zone: 'chill',
    model: { label: 'Fable', percent: 18, resetsAt: iso(NOW + 38 * HOUR) },
    errorReason: undefined,
    firstErrorAt: undefined,
  })
  expect(parseUsageCache(null)).toBeUndefined()
})

const SNAP: Snapshot = {
  ...EMPTY,
  dir: 'jstack',
  branch: 'jin/mole-7',
  dirty: 3,
  model: 'Opus 5.5',
  effort: 'xhigh',
  version: '2.1.331',
  ctx: 88,
  cacheRead: 45_600,
  limits: [
    { kind: 'seven_day', percent: 27, resetsAt: iso(NOW + 38 * HOUR) },
    { kind: 'five_hour', percent: 42, resetsAt: iso(NOW + 80 * 60_000) },
  ],
  usd: 1.5,
  usage: parseUsageCache(CACHE),
  agents: 2,
  turnStartedAt: NOW - 192_000,
  now: NOW,
}

test('band 행: 셸 statusline 항목 전부 + mod 칸', async () => {
  const [top, bottom] = buildRows(SNAP)
  expect(texts(top)).toEqual(['jstack', '⎇ jin/mole-7 MOLE-7 ●3', 'Opus 5.5', 'xhigh', 'v2.1.331', '⚙2', '⏱3:12'])
  // 5h: 1:20 남음 = 창 73% 경과, 42% 사용 → burn 0.58 CHILL. 7D: 38h 남음 = 77% 경과, 27% → CHILL
  expect(texts(bottom)).toEqual(['ctx: 88%', 'cache: 45.6K', '5h: 42% →1:20 CHILL', '7D: 27% →1D/14H CHILL', 'Fable: 18% →1D/14H'])
})

test('실시간 7D 없으면 캐시 7D (pacing·STALE 포함), 캐시도 없으면 7D: --%', async () => {
  const stale = { ...SNAP, limits: [], usd: undefined, usage: parseUsageCache({ ...CACHE, fetched_at: NOW_S - 31 * 60 }) }
  expect(texts(buildRows(stale)[1])).toEqual(['ctx: 88%', 'cache: 45.6K', '7D: 27% →1D/14H CHILL STALE', 'Fable: 18% →1D/14H STALE'])
  expect(texts(buildRows({ ...stale, usage: undefined })[1])).toEqual(['ctx: 88%', 'cache: 45.6K', '7D: --%'])
})

test('경고·비용·ctx TBD·설정으로 숨김', async () => {
  const rate = parseUsageCache({ ...CACHE, error_reason: 'rate_limited', first_error_at: NOW_S - 2 * 3600 })
  expect(texts(buildRows({ ...SNAP, usage: rate })[1])?.at(-1)).toBe('⏳ RATE 2h')
  const token = parseUsageCache({ ...CACHE, error_reason: 'token_expired' })
  expect(texts(buildRows({ ...SNAP, usage: token })[1])?.at(-1)).toBe('⚠ TOKEN?')
  // 구독 아님(rateLimits 없음) → 비용
  expect(texts(buildRows({ ...SNAP, limits: [] })[1])?.at(-1)).toBe('$1.50')
  expect(texts(buildRows({ ...SNAP, ctx: 0 })[1])?.[0]).toBe('ctx: TBD')
  const hidden = buildRows({ ...SNAP, show: { dir: false, branch: false, usage: false } })
  expect(texts(hidden[0])?.[0]).toBe('Opus 5.5')
  expect(texts(hidden[1])).toEqual(['ctx: 88%', 'cache: 45.6K'])
})

test('알림 키: ctx 85, 한도 90, pacing hot', async () => {
  const hot = { kind: 'five_hour', percent: 60, resetsAt: iso(NOW + 2.5 * HOUR) }
  const keys = [...alerts({ ...SNAP, limits: [hot, { kind: 'seven_day', percent: 91 }] }).keys()]
  expect(keys).toEqual(['ctx', 'pace:five_hour', 'limit:seven_day'])
  expect([...alerts({ ...SNAP, ctx: 50, limits: [] }).keys()]).toEqual([])
})

const BAND = {
  plugin: 'mod-statusline',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('band 를 터미널·desktop 에 그린다', async ($, on) => {
  on('state.get', () => ({ value: { value: SNAP, version: 1 } }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /^ctx: 88%$/ }))?.text).toBe('ctx: 88%')
    expect(await ui.find({ type: 'Text', text: /MOLE-7/ })).toBeDefined()
    await ui.unmount()
  }
})

test('예전 버전이 남긴 state(show 없음)도 그린다', async ($, on) => {
  const { show: _, ...old } = SNAP
  on('state.get', () => ({ value: { value: old, version: 1 } }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^jstack$/ }))?.text).toBe('jstack')
  await ui.unmount()
})

test('임계치 toast 는 넘을 때 한 번, 내려갔다 다시 넘으면 또', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('session.measure', () => ({ changed: [] }))
  on('clock.now', () => ({ value: NOW }))
  const measure = (percent: number) => $.session.measure({ context: { window: 200_000, percent }, rateLimits: [], changed: [] })

  await measure(86)
  await measure(90)
  expect(toasts).toHaveLength(1)
  await measure(50)
  await measure(87)
  expect(toasts).toHaveLength(2)
  expect(toasts[0]).toMatch(/^컨텍스트 86%/)
})

test('턴 타이머: 시작에 켜지고, 중단돼도 꺼지고, 작업 중 아니면 안 보임', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('turn.start', () => ({ turnId: 't1' }))
  on('turn.complete', () => ({ text: '' }))
  on('session.cwd', () => ({ value: '/x/jstack' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('env.get', () => ({ value: undefined }))
  const timer = async (isWorking: boolean) => {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking } })
    const found = await ui.find({ type: 'Text', text: /^⏱/ })
    await ui.unmount()
    return found?.text
  }

  await $.turn.start({ text: 'hi', turnId: 't1' })
  expect(await timer(true)).toBe('⏱0:00')
  expect(await timer(false)).toBeUndefined()
  await $.turn.complete({ turnId: 't1', reason: 'aborted', answer: '', durationMs: 1, isAborted: true })
  expect(await timer(true)).toBeUndefined()
})

test('이벤트를 받기 전(now 0)엔 빈 band 를 그리지 않는다', async ($, on) => {
  on('state.get', () => ({ value: { value: EMPTY, version: 1 } }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /cache:|7D:/ })).toBeUndefined()
  await ui.unmount()
})

test('시작 시 effort: modelSettings[모델] → effortLevel', async () => {
  const ms = { 'claude-opus-5-5': { effortLevel: 'xhigh' }, 'claude-opus-5': { effortLevel: 'high' } }
  expect(effortFromSettings(ms, 'high', 'claude-opus-5-5')).toBe('xhigh')
  expect(effortFromSettings(ms, 'high', 'claude-opus-5-5[1m]')).toBe('xhigh')
  expect(effortFromSettings(ms, 'medium', 'claude-fable-5-2')).toBe('medium')
  expect(effortFromSettings(undefined, undefined, 'claude-fable-5-2')).toBeUndefined()
})
