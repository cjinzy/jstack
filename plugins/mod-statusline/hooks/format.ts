// 순수 계산·포맷 — register.tsx 와 테스트가 공유한다. `$` 를 쓰지 않는다.
import type { Limit, ModelWeek, Snapshot } from '../types'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

/** rate-limit 창 길이. pacing 계산에 쓴다. */
export const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * HOUR_MS,
  seven_day: 7 * DAY_MS,
}
const LIMIT_LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7D', spend_limit: 'spend' }
const LIMIT_ORDER = ['five_hour', 'seven_day']

// pacing = 사용률 ÷ 창 경과율. fetch_claude_usage.py 의 PacingZone 과 같은 기준.
export const PACE_HOT = 1.2
const PACE_MIN_ELAPSED = 0.05 // 창 초반 5% 는 판정 안 함 — 소량 사용에도 burn 이 튐

export const CTX_WARN = 70
export const CTX_ALERT = 85
export const LIMIT_ALERT = 90
const MODEL_CACHE_MAX_AGE_S = 30 * 60 // 타이머 주기(최대 10분)의 3배

export type Tone = 'normal' | 'warning' | 'error'
export type Segment = { text: string; tone: Tone }

/** 사용률 ÷ 경과율. 리셋 시각이 없거나 창 초반이면 undefined. */
export function pace(limit: Limit, nowMs: number): number | undefined {
  const windowMs = WINDOW_MS[limit.kind]
  if (!windowMs || !limit.resetsAt) return undefined
  const elapsed = 1 - (Date.parse(limit.resetsAt) - nowMs) / windowMs
  if (!(elapsed >= PACE_MIN_ELAPSED)) return undefined // NaN 포함
  return limit.percent / 100 / Math.min(elapsed, 1)
}

export function limitTone(percent: number, burn?: number): Tone {
  if (percent >= LIMIT_ALERT) return 'error'
  if ((burn ?? 0) >= PACE_HOT) return 'warning'
  return 'normal'
}

export function ctxTone(percent: number): Tone {
  if (percent >= CTX_ALERT) return 'error'
  if (percent >= CTX_WARN) return 'warning'
  return 'normal'
}

/** 남은 시간: 42m · 3:05 · 2d5h */
export function fmtRemain(ms: number): string {
  if (ms <= 0) return '0m'
  if (ms < HOUR_MS) return `${Math.ceil(ms / 60_000)}m`
  if (ms < DAY_MS) {
    const m = Math.floor((ms % HOUR_MS) / 60_000)
    return `${Math.floor(ms / HOUR_MS)}:${String(m).padStart(2, '0')}`
  }
  return `${Math.floor(ms / DAY_MS)}d${Math.floor((ms % DAY_MS) / HOUR_MS)}h`
}

/** 경과 시간: 0:07 · 3:12 · 1:02:03 */
export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** claude-opus-5-5 → Opus 5.5. 모르는 형식은 그대로. */
export function modelLabel(id: string): string {
  const m = /claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?!\d)/.exec(id)
  const [, family, major, minor] = m ?? []
  if (!family || !major) return id
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  return minor ? `${name} ${major}.${minor}` : `${name} ${major}`
}

/** mole-linear 브랜치 규칙 `<user>/<team>-<n>` → TEAM-N. */
export function issueFromBranch(branch: string): string | undefined {
  const [, team, n] = /^[^/]+\/([a-z][a-z0-9]*)-(\d+)$/i.exec(branch) ?? []
  return team && n ? `${team.toUpperCase()}-${n}` : undefined
}

/** `git status --porcelain=v1 -b` → 브랜치, 변경 파일 수. */
export function parseGitStatus(stdout: string): { branch?: string; dirty: number } {
  const lines = stdout.split('\n').filter(Boolean)
  const head = lines[0]?.startsWith('## ') ? lines.shift()!.slice(3) : undefined
  let branch: string | undefined
  if (head) {
    const unborn = /^No commits yet on (.+)$/.exec(head)
    branch = unborn?.[1] ?? head.split('...')[0]?.split(' ')[0]
  }
  return { branch, dirty: lines.length }
}

/** 타이머 캐시 JSON → 모델별 주간 한도. 없거나 낡았으면 undefined. */
export function modelWeekFromCache(cache: unknown, nowS: number): ModelWeek | undefined {
  const c = cache as {
    fetched_at?: number
    seven_day_model?: { label?: string; utilization?: number; resets_at?: string }
  }
  const w = c?.seven_day_model
  if (!w?.label || typeof w.utilization !== 'number') return undefined
  if (!(nowS - (c.fetched_at ?? 0) <= MODEL_CACHE_MAX_AGE_S)) return undefined
  return { label: w.label, percent: w.utilization, resetsAt: w.resets_at }
}

const ACTIVE_AGENT = new Set(['pending', 'running', 'waiting'])

export function countRunning(agents: readonly { status: string }[]): number {
  return agents.filter(a => ACTIVE_AGENT.has(a.status)).length
}

function limitSegment(l: Limit, nowMs: number): Segment {
  const label = LIMIT_LABEL[l.kind] ?? l.kind
  const reset = l.resetsAt ? ` ↻${fmtRemain(Date.parse(l.resetsAt) - nowMs)}` : ''
  return { text: `${label} ${Math.round(l.percent)}%${reset}`, tone: limitTone(l.percent, pace(l, nowMs)) }
}

/** band 두 줄: [위치 │ 모델 │ 백그라운드 │ 턴 시간], [ctx │ 5h │ 7D │ 모델별 7D │ 비용]. 빈 칸은 생략. */
export function buildRows(s: Snapshot): Segment[][] {
  const top: Segment[] = []
  if (s.dir) {
    const issue = s.branch ? issueFromBranch(s.branch) : undefined
    const parts = [s.dir, s.branch, issue].filter(Boolean).join(' · ')
    const dirty = s.dirty ? ` ●${s.dirty}` : ''
    top.push({ text: parts + dirty, tone: 'normal' })
  }
  if (s.model) top.push({ text: s.effort ? `${s.model} · ${s.effort}` : s.model, tone: 'normal' })
  if (s.agents > 0) top.push({ text: `⚙${s.agents}`, tone: 'normal' })
  if (s.turnStartedAt !== undefined) top.push({ text: `⏱${fmtElapsed(s.now - s.turnStartedAt)}`, tone: 'normal' })

  const bottom: Segment[] = []
  if (s.ctx !== undefined) bottom.push({ text: `ctx ${Math.round(s.ctx)}%`, tone: ctxTone(s.ctx) })
  const rank = (k: string) => (LIMIT_ORDER.indexOf(k) + 1 || LIMIT_ORDER.length + 1)
  for (const l of [...s.limits].sort((a, b) => rank(a.kind) - rank(b.kind))) bottom.push(limitSegment(l, s.now))
  if (s.modelWeek) {
    const w = s.modelWeek
    bottom.push({ text: `${w.label} 7D ${Math.round(w.percent)}%`, tone: limitTone(w.percent) })
  }
  // 구독이면 rateLimits 가 있고 비용은 청구되지 않는다 → API 키 사용자에게만.
  if (s.limits.length === 0 && s.usd !== undefined) bottom.push({ text: `$${s.usd.toFixed(2)}`, tone: 'normal' })

  return [top, bottom].filter(r => r.length > 0)
}

/** 지금 넘은 임계치 (키 → toast 문구). 키가 사라지면 다시 넘을 때 또 알린다. */
export function alerts(s: Snapshot): Map<string, string> {
  const out = new Map<string, string>()
  if ((s.ctx ?? 0) >= CTX_ALERT) out.set('ctx', `컨텍스트 ${Math.round(s.ctx!)}% — /compact 나 새 세션을 고려하세요`)
  for (const l of s.limits) {
    const label = LIMIT_LABEL[l.kind] ?? l.kind
    if (l.percent >= LIMIT_ALERT) out.set(`limit:${l.kind}`, `${label} 한도 ${Math.round(l.percent)}% 사용`)
    else if ((pace(l, s.now) ?? 0) >= PACE_HOT) out.set(`pace:${l.kind}`, `${label} 사용 속도가 빨라 리셋 전에 소진될 수 있습니다`)
  }
  return out
}

export const EMPTY: Snapshot = { limits: [], agents: 0, now: 0 }
