// 순수 계산·포맷 — register.tsx 와 테스트가 공유한다. `$` 를 쓰지 않는다.
// 셸 statusline(plugins/jstack/scripts/statusline-command.sh)과 같은 항목·포맷·색에
// mod 전용 칸(5h, 이슈 ID, ●n, ⚙n, ⏱, 비용)을 더한다.
import type { Limit, Show, Snapshot, UsageCache } from '../types'

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
const PACE_CHILL = 0.8
export const PACE_HOT = 1.2
const PACE_MIN_ELAPSED = 0.05 // 창 초반 5% 는 판정 안 함 — 소량 사용에도 burn 이 튐

export const CTX_ALERT = 85
export const LIMIT_ALERT = 90
const USAGE_STALE_S = 30 * 60 // 셸 statusline 의 stale_threshold
const TOKEN_ERRORS = new Set(['token_needs_relogin', 'token_expired', 'refresh_failed'])

// 셸 statusline 의 ANSI 색 (256색은 hex 로).
const C = {
  dir: 'blue',
  branch: 'green',
  model: 'cyan',
  version: 'magenta',
  muted: 'gray',
  cache: '#5fafff', // 38;5;75
  amber: '#ffaf00', // 38;5;214
  limit: '#af87ff', // 38;5;141
  yellow: '#ffd700', // 38;5;220
} as const
// 10단계: 짙은 초록 → 짙은 빨강 (38;5;22 28 34 100 142 178 172 166 160 124)
const LEVELS = ['#005f00', '#008700', '#00af00', '#878700', '#afaf00', '#d7af00', '#d78700', '#d75f00', '#d70000', '#af0000'] as const
const ZONE: Record<string, { text: string; color: string }> = {
  chill: { text: 'CHILL', color: LEVELS[0] },
  on_track: { text: 'PACE', color: LEVELS[4] },
  hot: { text: 'HOT', color: LEVELS[9] },
}

/** 한 칸 안의 색 조각. */
export type Part = { text: string; color?: string }
export type Segment = Part[]

/** 0–100 → 10단계 색 (셸 level_color: 1–10 → 1단계, 91– → 10단계). */
export function levelColor(percent: number): string {
  const n = Math.min(10, Math.max(1, Math.ceil(Math.round(percent) / 10)))
  return LEVELS[n - 1] ?? LEVELS[0]
}

/** 사용률 ÷ 경과율. 리셋 시각이 없거나 창 초반이면 undefined. */
export function pace(limit: Limit, nowMs: number): number | undefined {
  const windowMs = WINDOW_MS[limit.kind]
  if (!windowMs || !limit.resetsAt) return undefined
  const elapsed = 1 - (Date.parse(limit.resetsAt) - nowMs) / windowMs
  if (!(elapsed >= PACE_MIN_ELAPSED)) return undefined // NaN 포함
  return limit.percent / 100 / Math.min(elapsed, 1)
}

export function zoneOf(burn: number | undefined): string | undefined {
  if (burn === undefined) return undefined
  return burn < PACE_CHILL ? 'chill' : burn < PACE_HOT ? 'on_track' : 'hot'
}

/** 리셋까지 남은 시간 (셸 weekly_reset_display): ` →1D/14H`, 하루 미만 ` →3:05`. 지났거나 모르면 ''. */
export function fmtReset(resetsAt: string | undefined, nowMs: number): string {
  const ms = resetsAt ? Date.parse(resetsAt) - nowMs : NaN
  if (!(ms > 0)) return ''
  if (ms >= DAY_MS) return ` →${Math.floor(ms / DAY_MS)}D/${Math.floor((ms % DAY_MS) / HOUR_MS)}H`
  return ` →${Math.floor(ms / HOUR_MS)}:${String(Math.floor((ms % HOUR_MS) / 60_000)).padStart(2, '0')}`
}

/** cache 토큰 (셸과 같음): 없음·0 → TBD, 850, 1.2K, 3.4M */
export function fmtTokens(n: number | undefined): string {
  if (!n) return 'TBD'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
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

/**
 * 첫 요청 전 effort: settings 의 modelSettings[모델].effortLevel → effortLevel.
 * ponytail: --effort 플래그·/effort 변경은 못 본다 — 첫 요청부터 turn.step 의 실제 값으로 덮인다.
 */
export function effortFromSettings(modelSettings: unknown, effortLevel: unknown, modelId: string): string | undefined {
  const base = modelId.replace(/\[.*\]$/, '') // claude-opus-5-5[1m] → claude-opus-5-5
  const perModel = (modelSettings as Record<string, { effortLevel?: unknown } | undefined> | null)?.[base]?.effortLevel
  const level = perModel ?? effortLevel
  return typeof level === 'string' ? level : undefined
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

/** statusline-config.txt → 표시 여부. 셸처럼 키가 없거나 1 일 때만 표시. */
export function parseShow(text: string | undefined): Show {
  const on = (key: string) => {
    const v = new RegExp(`^\\s*${key}=["']?([^"'\\s#]*)`, 'm').exec(text ?? '')?.[1]
    return v === undefined || v === '1'
  }
  return { dir: on('SHOW_DIRECTORY'), branch: on('SHOW_BRANCH'), usage: on('SHOW_USAGE') }
}

/** 타이머 캐시 JSON → UsageCache. 객체가 아니면 undefined. */
export function parseUsageCache(raw: unknown): UsageCache | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const c = raw as {
    fetched_at?: number
    seven_day?: { utilization?: number; resets_at?: string } | null
    pacing?: { seven_day?: { zone?: string } | null } | null
    seven_day_model?: { label?: string; utilization?: number; resets_at?: string } | null
    error_reason?: string | null
    first_error_at?: number | null
  }
  const w = c.seven_day
  const m = c.seven_day_model
  return {
    fetchedAt: c.fetched_at ?? 0,
    sevenDay: typeof w?.utilization === 'number' ? { percent: w.utilization, resetsAt: w.resets_at } : undefined,
    zone: c.pacing?.seven_day?.zone,
    model: m?.label && typeof m.utilization === 'number' ? { label: m.label, percent: m.utilization, resetsAt: m.resets_at } : undefined,
    errorReason: c.error_reason ?? undefined,
    firstErrorAt: c.first_error_at ?? undefined,
  }
}

export function countRunning(agents: readonly { status: string }[]): number {
  const active = new Set(['pending', 'running', 'waiting'])
  return agents.filter(a => active.has(a.status)).length
}

const zonePart = (zone: string | undefined): Part[] => {
  const z = zone ? ZONE[zone] : undefined
  return z ? [{ text: ` ${z.text}`, color: z.color }] : []
}

/** 셸 usage_segment: `라벨:` + 10단계 색 `N% →리셋` + 꼬리. */
function usageSegment(label: string, labelColor: string, percent: number, resetsAt: string | undefined, nowMs: number, tail: Part[]): Segment {
  const pct = Math.round(percent)
  return [{ text: `${label}:`, color: labelColor }, { text: ` ${pct}%${fmtReset(resetsAt, nowMs)}`, color: levelColor(pct) }, ...tail]
}

/** 캐시 오류 경고 (셸과 같음): ⚠ TOKEN? · ⏳ RATE 2h */
function warning(u: UsageCache, nowMs: number): Part | undefined {
  if (u.errorReason && TOKEN_ERRORS.has(u.errorReason)) return { text: '⚠ TOKEN?', color: C.yellow }
  if (u.errorReason !== 'rate_limited') return undefined
  const s = u.firstErrorAt ? nowMs / 1000 - u.firstErrorAt : 0
  const dur = s >= 3600 ? ` ${Math.floor(s / 3600)}h` : s >= 60 ? ` ${Math.floor(s / 60)}m` : ''
  return { text: `⏳ RATE${dur}`, color: C.muted }
}

/** 5h·7D(실시간, 없으면 캐시)·모델별 7D·경고. */
function usageSegments(s: Snapshot): Segment[] {
  const out: Segment[] = []
  const u = s.usage
  const stale: Part[] = u && s.now / 1000 - u.fetchedAt > USAGE_STALE_S ? [{ text: ' STALE', color: C.muted }] : []
  const rank = (k: string) => LIMIT_ORDER.indexOf(k) + 1 || LIMIT_ORDER.length + 1
  const live = [...s.limits].sort((a, b) => rank(a.kind) - rank(b.kind))
  for (const l of live) {
    out.push(usageSegment(LIMIT_LABEL[l.kind] ?? l.kind, C.limit, l.percent, l.resetsAt, s.now, zonePart(zoneOf(pace(l, s.now)))))
  }
  if (!live.some(l => l.kind === 'seven_day')) {
    if (u?.sevenDay) out.push(usageSegment('7D', C.limit, u.sevenDay.percent, u.sevenDay.resetsAt, s.now, [...zonePart(u.zone), ...stale]))
    else if (!u) out.push([{ text: '7D:', color: C.limit }, { text: ' --%', color: C.muted }]) // 캐시 없음
  }
  if (u?.model) out.push(usageSegment(u.model.label, C.amber, u.model.percent, u.model.resetsAt, s.now, stale))
  const warn = u && warning(u, s.now)
  if (warn) out.push([warn])
  return out
}

/**
 * band 두 줄 (셸 statusline 순서 + mod 칸):
 *   dir │ ⎇ branch ISSUE ●n │ model │ effort │ vX │ ⚙ n │ ⏱ 0:07
 *   ctx: N% │ cache: N │ 5h: │ 7D: │ Model: │ 경고 │ $비용
 */
export function buildRows(s: Snapshot): Segment[][] {
  const top: Segment[] = []
  if (s.dir && s.show.dir) top.push([{ text: s.dir, color: C.dir }])
  if (s.branch && s.show.branch) {
    const issue = issueFromBranch(s.branch)
    top.push([
      { text: `⎇ ${s.branch}`, color: C.branch },
      ...(issue ? [{ text: ` ${issue}` }] : []),
      ...(s.dirty ? [{ text: ` ●${s.dirty}`, color: C.amber }] : []),
    ])
  }
  if (s.model) top.push([{ text: s.model, color: C.model }])
  if (s.effort) top.push([{ text: s.effort, color: C.yellow }])
  if (s.version) top.push([{ text: `v${s.version}`, color: C.version }])
  // 아이콘 뒤 공백 필수: 터미널이 ⚙·⏱ 을 2칸 emoji 로 그려 바로 뒤 글자를 덮는다.
  if (s.agents > 0) top.push([{ text: `⚙ ${s.agents}` }])
  if (s.turnStartedAt !== undefined) top.push([{ text: `⏱ ${fmtElapsed(s.now - s.turnStartedAt)}` }])

  const bottom: Segment[] = []
  if (s.ctx !== undefined) {
    const pct = Math.round(s.ctx)
    bottom.push([{ text: pct === 0 ? 'ctx: TBD' : `ctx: ${pct}%`, color: levelColor(pct) }])
  }
  bottom.push([{ text: `cache: ${fmtTokens(s.cacheRead)}`, color: C.cache }])
  if (s.show.usage) bottom.push(...usageSegments(s))
  // 구독이면 rateLimits 가 있고 비용은 청구되지 않는다 → API 키 사용자에게만.
  if (s.limits.length === 0 && s.usd !== undefined) bottom.push([{ text: `$${s.usd.toFixed(2)}` }])

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

export const EMPTY: Snapshot = { limits: [], agents: 0, now: 0, show: { dir: true, branch: true, usage: true } }
