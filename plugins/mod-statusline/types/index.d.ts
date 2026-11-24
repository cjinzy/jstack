/** 한 rate-limit 창 (session.measure 의 rateLimits 한 항목). */
export type Limit = { kind: string; percent: number; resetsAt?: string }

/** 사용량 타이머 캐시의 모델별 주간 한도 (`~/.claude/.usage-cache.json`). */
export type ModelWeek = { label: string; percent: number; resetsAt?: string }

/** band 가 그리는 값 전부. 이벤트가 채우고 ui.render 가 읽는다. */
export type Snapshot = {
  dir?: string
  branch?: string
  dirty?: number
  model?: string
  effort?: string
  ctx?: number
  limits: Limit[]
  usd?: number
  modelWeek?: ModelWeek
  agents: number
  turnStartedAt?: number
  now: number
}

declare module 'claude-code' {
  interface PluginState {
    'mod-statusline': { snap: Snapshot }
  }
}
