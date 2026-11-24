/** 한 rate-limit 창 (session.measure 의 rateLimits 한 항목). */
export type Limit = { kind: string; percent: number; resetsAt?: string }

/** 모델별 주간 한도 (예: Fable). */
export type ModelWeek = { label: string; percent: number; resetsAt?: string }

/** 사용량 타이머 캐시 `~/.claude/.usage-cache.json` (fetch_claude_usage.py 가 씀). */
export type UsageCache = {
  fetchedAt: number // epoch 초
  sevenDay?: { percent: number; resetsAt?: string }
  zone?: string // pacing.seven_day.zone: chill · on_track · hot
  model?: ModelWeek
  errorReason?: string
  firstErrorAt?: number // epoch 초
}

/** `~/.claude/statusline-config.txt` 의 SHOW_DIRECTORY · SHOW_BRANCH · SHOW_USAGE. */
export type Show = { dir: boolean; branch: boolean; usage: boolean }

/** band 가 그리는 값 전부. 이벤트가 채우고 ui.render 가 읽는다. */
export type Snapshot = {
  dir?: string
  branch?: string
  dirty?: number
  model?: string
  effort?: string
  version?: string
  ctx?: number
  cacheRead?: number // 마지막 main 요청의 cache_read_input_tokens
  limits: Limit[]
  usd?: number
  usage?: UsageCache
  show: Show
  agents: number
  turnStartedAt?: number
  now: number
}

declare module 'claude-code' {
  interface PluginState {
    'mod-statusline': { snap: Snapshot }
  }
}
