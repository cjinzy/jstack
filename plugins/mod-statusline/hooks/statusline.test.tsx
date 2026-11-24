import { expect, test } from 'claude-code/testing'

import type { Snapshot } from '../types'
import {
  alerts,
  buildRows,
  EMPTY,
  fmtElapsed,
  fmtRemain,
  issueFromBranch,
  modelLabel,
  modelWeekFromCache,
  pace,
  parseGitStatus,
} from './format'

const HOUR = 3_600_000
const NOW = Date.parse('2026-11-24T12:00:00Z')
const iso = (ms: number) => new Date(ms).toISOString()

test('pace: 사용률 ÷ 경과율, 창 초반은 판정 안 함', async () => {
  // 5h 창 절반 경과, 60% 사용 → 1.2
  const burn = pace({ kind: 'five_hour', percent: 60, resetsAt: iso(NOW + 2.5 * HOUR) }, NOW) ?? 0
  expect(Math.round(burn * 100)).toBe(120)
  // 경과 2% → undefined
  expect(pace({ kind: 'five_hour', percent: 10, resetsAt: iso(NOW + 4.9 * HOUR) }, NOW)).toBeUndefined()
  expect(pace({ kind: 'spend_limit', percent: 10 }, NOW)).toBeUndefined()
})

test('시간 포맷', async () => {
  expect(fmtRemain(42 * 60_000)).toBe('42m')
  expect(fmtRemain(3 * HOUR + 5 * 60_000)).toBe('3:05')
  expect(fmtRemain(2 * 24 * HOUR + 5 * HOUR)).toBe('2d5h')
  expect(fmtElapsed(7_000)).toBe('0:07')
  expect(fmtElapsed(HOUR + 2 * 60_000 + 3_000)).toBe('1:02:03')
})

test('모델 이름', async () => {
  expect(modelLabel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelLabel('claude-fable-5-2[1m]')).toBe('Fable 5.2')
  expect(modelLabel('claude-sonnet-4-20250514')).toBe('Sonnet 4')
  expect(modelLabel('gpt-x')).toBe('gpt-x')
})

test('브랜치 → 이슈 ID (mole-linear 규칙만)', async () => {
  expect(issueFromBranch('jin/mole-123')).toBe('MOLE-123')
  expect(issueFromBranch('main')).toBeUndefined()
  expect(issueFromBranch('feature/add-login')).toBeUndefined()
})

test('git status 파싱', async () => {
  expect(parseGitStatus('## main...origin/main [ahead 1]\n M a.ts\n?? b.ts\n')).toEqual({ branch: 'main', dirty: 2 })
  expect(parseGitStatus('## No commits yet on dev\n')).toEqual({ branch: 'dev', dirty: 0 })
})

test('모델별 7D 캐시: 30분 넘으면 버림', async () => {
  const cache = { fetched_at: NOW / 1000 - 60, seven_day_model: { label: 'Fable', utilization: 30, resets_at: 'x' } }
  expect(modelWeekFromCache(cache, NOW / 1000)).toEqual({ label: 'Fable', percent: 30, resetsAt: 'x' })
  expect(modelWeekFromCache({ ...cache, fetched_at: NOW / 1000 - 31 * 60 }, NOW / 1000)).toBeUndefined()
  expect(modelWeekFromCache({}, NOW / 1000)).toBeUndefined()
})

const SNAP: Snapshot = {
  ...EMPTY,
  dir: 'jstack',
  branch: 'jin/mole-7',
  dirty: 3,
  model: 'Opus 5.5',
  ctx: 88,
  limits: [
    { kind: 'seven_day', percent: 63, resetsAt: iso(NOW + 2 * 24 * HOUR) },
    { kind: 'five_hour', percent: 42, resetsAt: iso(NOW + 80 * 60_000) },
  ],
  usd: 1.5,
  agents: 2,
  turnStartedAt: NOW - 192_000,
  now: NOW,
}

test('band 행: 순서·색·구독이면 비용 생략', async () => {
  const [top, bottom] = buildRows(SNAP)
  expect(top?.map(s => s.text)).toEqual(['jstack · jin/mole-7 · MOLE-7 ●3', 'Opus 5.5', '⚙2', '⏱3:12'])
  expect(bottom?.map(s => s.text)).toEqual(['ctx 88%', '5h 42% ↻1:20', '7D 63% ↻2d0h'])
  expect(bottom?.[0]?.tone).toBe('error')
  // 구독 아님(rateLimits 없음) → 비용
  expect(buildRows({ ...SNAP, limits: [] })[1]?.map(s => s.text)).toEqual(['ctx 88%', '$1.50'])
  // 첫 응답 전: 사용량 줄 없음
  expect(buildRows({ ...EMPTY, dir: 'x' })).toHaveLength(1)
  expect(buildRows(EMPTY)).toHaveLength(0)
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
    expect((await ui.find({ type: 'Text', text: /^ctx 88%$/ }))?.text).toBe('ctx 88%')
    expect(await ui.find({ type: 'Text', text: /MOLE-7/ })).toBeDefined()
    await ui.unmount()
  }
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

test('리셋 시각이 깨져도 NaN 을 그리지 않음', async () => {
  const rows = buildRows({ ...EMPTY, limits: [{ kind: 'five_hour', percent: 42, resetsAt: 'garbage' }], now: NOW })
  expect(rows[0]?.map(s => s.text)).toEqual(['5h 42%'])
})
