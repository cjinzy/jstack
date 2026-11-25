#!/bin/bash
config_file="$HOME/.claude/statusline-config.txt"
# 설정 파일에 없는 키는 표시(1)
[ -f "$config_file" ] && source "$config_file"
show_dir=${SHOW_DIRECTORY:-1}
show_branch=${SHOW_BRANCH:-1}
show_usage=${SHOW_USAGE:-1}

# Cross-platform date helpers
parse_iso_to_epoch() {
  local raw="$1"
  if date --version >/dev/null 2>&1; then
    # GNU date handles full ISO 8601 with timezone natively
    date -d "${raw}" "+%s" 2>/dev/null
  else
    # BSD (macOS) — strip fractional seconds; strptime %z가 콜론 오프셋(+09:00)을 못 읽으므로 +0900으로 정규화
    local clean=$(echo "$raw" | sed 's/\.[0-9]*//; s/\([+-][0-9][0-9]\):\([0-9][0-9]\)$/\1\2/')
    date -ju -f "%Y-%m-%dT%H:%M:%S%z" "$clean" "+%s" 2>/dev/null || \
    date -ju -f "%Y-%m-%dT%H:%M:%SZ" "$clean" "+%s" 2>/dev/null || \
    date -ju -f "%Y-%m-%dT%H:%M:%S" "$clean" "+%s" 2>/dev/null
  fi
}

format_epoch() {
  local epoch="$1" fmt="$2"
  if date --version >/dev/null 2>&1; then
    date -d "@${epoch}" "+${fmt}" 2>/dev/null     # GNU date
  else
    date -r "$epoch" "+${fmt}" 2>/dev/null        # BSD date
  fi
}

input=$(cat)
current_dir_path=$(echo "$input" | jq -r '.workspace.current_dir // .current_dir // empty' 2>/dev/null)
current_dir=$(basename "$current_dir_path")
model_name=$(echo "$input" | jq -r '.model.display_name // empty' 2>/dev/null)
app_version=$(echo "$input" | jq -r '.version // empty' 2>/dev/null)
effort_level=$(echo "$input" | jq -r '.effort.level // empty' 2>/dev/null)
context_used=$(echo "$input" | jq -r '.context_window.used_percentage // empty' 2>/dev/null)
cache_read=$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // empty' 2>/dev/null)
# 실시간 한도 (구독, 첫 API 응답부터): 사용률 % + 리셋 epoch 초. 없으면 타이머 캐시.
rl_5h_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty' 2>/dev/null)
rl_5h_reset=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty' 2>/dev/null)
rl_7d_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty' 2>/dev/null)
rl_7d_reset=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty' 2>/dev/null)
WINDOW_5H_SEC=18000
transcript_path=$(echo "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
prompt_id=$(echo "$input" | jq -r '.prompt_id // empty' 2>/dev/null)
WINDOW_7D_SEC=604800
BLUE=$'\033[0;34m'
GREEN=$'\033[0;32m'
GRAY=$'\033[0;90m'
CYAN=$'\033[0;36m'
MAGENTA=$'\033[0;35m'
LIGHT_BLUE=$'\033[38;5;75m'
AMBER=$'\033[38;5;214m'
VIOLET=$'\033[38;5;141m'
YELLOW=$'\033[38;5;220m'
RESET=$'\033[0m'

# 10-level gradient: dark green → deep red
LEVEL_1=$'\033[38;5;22m'   # dark green
LEVEL_2=$'\033[38;5;28m'   # soft green
LEVEL_3=$'\033[38;5;34m'   # medium green
LEVEL_4=$'\033[38;5;100m'  # green-yellowish dark
LEVEL_5=$'\033[38;5;142m'  # olive/yellow-green dark
LEVEL_6=$'\033[38;5;178m'  # muted yellow
LEVEL_7=$'\033[38;5;172m'  # muted yellow-orange
LEVEL_8=$'\033[38;5;166m'  # darker orange
LEVEL_9=$'\033[38;5;160m'  # dark red
LEVEL_10=$'\033[38;5;124m' # deep red

# Build components (without separators)
dir_text=""
if [ "$show_dir" = "1" ]; then
  dir_text="${BLUE}${current_dir}${RESET}"
fi

model_text=""
[ -n "$model_name" ] && model_text="${CYAN}${model_name}${RESET}"

effort_text=""
[ -n "$effort_level" ] && effort_text="${YELLOW}${effort_level}${RESET}"

version_text=""
[ -n "$app_version" ] && version_text="${MAGENTA}v${app_version}${RESET}"

context_text=""
if [ -n "$context_used" ] && [ "$context_used" != "null" ] && [ "$context_used" != "" ]; then
  ctx_int=$(printf "%.0f" "$context_used" 2>/dev/null || echo 0)
  if [ "$ctx_int" -le 10 ]; then
    ctx_color="$LEVEL_1"
  elif [ "$ctx_int" -le 20 ]; then
    ctx_color="$LEVEL_2"
  elif [ "$ctx_int" -le 30 ]; then
    ctx_color="$LEVEL_3"
  elif [ "$ctx_int" -le 40 ]; then
    ctx_color="$LEVEL_4"
  elif [ "$ctx_int" -le 50 ]; then
    ctx_color="$LEVEL_5"
  elif [ "$ctx_int" -le 60 ]; then
    ctx_color="$LEVEL_6"
  elif [ "$ctx_int" -le 70 ]; then
    ctx_color="$LEVEL_7"
  elif [ "$ctx_int" -le 80 ]; then
    ctx_color="$LEVEL_8"
  elif [ "$ctx_int" -le 90 ]; then
    ctx_color="$LEVEL_9"
  else
    ctx_color="$LEVEL_10"
  fi
  if [ "$ctx_int" -eq 0 ]; then
    context_text="${ctx_color}ctx: TBD${RESET}"
  else
    context_text="${ctx_color}ctx: ${ctx_int}%${RESET}"
  fi
fi

cached_text=""
if [ -n "$cache_read" ] && [ "$cache_read" != "null" ] && [ "$cache_read" != "" ]; then
  cache_int=$(printf "%.0f" "$cache_read" 2>/dev/null || echo 0)
  if [ "$cache_int" -eq 0 ]; then
    cached_text="${LIGHT_BLUE}cache: TBD${RESET}"
  elif [ "$cache_int" -ge 1000000 ]; then
    cache_fmt=$(awk "BEGIN {printf \"%.1f\", $cache_int/1000000}")
    cached_text="${LIGHT_BLUE}cache: ${cache_fmt}M${RESET}"
  elif [ "$cache_int" -ge 1000 ]; then
    cache_fmt=$(awk "BEGIN {printf \"%.1f\", $cache_int/1000}")
    cached_text="${LIGHT_BLUE}cache: ${cache_fmt}K${RESET}"
  else
    cached_text="${LIGHT_BLUE}cache: ${cache_int}${RESET}"
  fi
else
  cached_text="${LIGHT_BLUE}cache: TBD${RESET}"
fi

branch_text=""
if [ "$show_branch" = "1" ]; then
  if git rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git branch --show-current 2>/dev/null)
    [ -n "$branch" ] && branch_text="${GREEN}⎇ ${branch}${RESET}"
  fi
fi

# 10단계 색상: pct(0-100) → LEVEL_n
level_color() {
  local pct=$1 n
  n=$(( (pct + 9) / 10 ))
  [ "$n" -lt 1 ] && n=1
  [ "$n" -gt 10 ] && n=10
  eval "echo \"\$LEVEL_${n}\""
}

# 리셋까지 남은 시간 (epoch 초): ≥1일 " →ND/NH", 미만 " →H:MM"
reset_display() {
  local remain_sec
  [ -z "$1" ] && return
  remain_sec=$((${1%.*} - $(date +%s)))
  [ "$remain_sec" -le 0 ] && return
  if [ "$remain_sec" -ge 86400 ]; then
    echo " →$((remain_sec / 86400))D/$(( (remain_sec % 86400) / 3600 ))H"
  else
    echo " →$((remain_sec / 3600)):$(printf '%02d' $(( (remain_sec % 3600) / 60 )))"
  fi
}

# usage 세그먼트: label color pct resets_epoch [suffix]
usage_segment() {
  local pct_int
  pct_int=$(printf "%.0f" "$3" 2>/dev/null || echo 0)
  echo "${2}${1}:${RESET} $(level_color "$pct_int")${pct_int}%$(reset_display "$4")${RESET}${5}"
}

# pacing 라벨: chill|on_track|hot
zone_label() {
  case "$1" in
    chill)    echo " ${LEVEL_1}CHILL${RESET}" ;;
    on_track) echo " ${LEVEL_5}PACE${RESET}" ;;
    hot)      echo " ${LEVEL_10}HOT${RESET}" ;;
  esac
}

# 실시간 pacing: pct resets_epoch window_sec. burn = 사용률 ÷ 창 경과율,
# fetch_claude_usage.calculate_pacing 과 같은 0.8 / 1.2. 창 초반 5% 는 판정 안 함 (burn 이 튐).
live_pace() {
  [ -z "$2" ] && return
  zone_label "$(awk -v p="$1" -v r="${2%.*}" -v w="$3" -v n="$(date +%s)" 'BEGIN {
    e = (w - (r - n)) / w
    if (e < 0.05) exit
    b = p / 100 / e
    print (b < 0.8 ? "chill" : b < 1.2 ? "on_track" : "hot")
  }')"
}

usage_5h_text=""
usage_7d_text=""
model_usage_text=""
if [ "$show_usage" = "1" ]; then
  [ -n "$rl_5h_pct" ] && usage_5h_text=$(usage_segment "5h" "$VIOLET" "$rl_5h_pct" "$rl_5h_reset" "$(live_pace "$rl_5h_pct" "$rl_5h_reset" "$WINDOW_5H_SEC")")
  [ -n "$rl_7d_pct" ] && usage_7d_text=$(usage_segment "7D" "$VIOLET" "$rl_7d_pct" "$rl_7d_reset" "$(live_pace "$rl_7d_pct" "$rl_7d_reset" "$WINDOW_7D_SEC")")
  cache_file="$HOME/.claude/.usage-cache.json"
  stale_threshold=1800  # 30분

  if [ -f "$cache_file" ]; then
    fetched_at=$(jq -r '.fetched_at // 0' "$cache_file" 2>/dev/null)
    now=$(date +%s)
    cache_age=$((now - ${fetched_at%.*}))
    stale_mark=""
    [ "$cache_age" -gt "$stale_threshold" ] && stale_mark=" ${GRAY}STALE${RESET}"

    util_7d=$(jq -r '.seven_day.utilization // empty' "$cache_file" 2>/dev/null)
    resets_7d=$(jq -r '.seven_day.resets_at // empty' "$cache_file" 2>/dev/null)
    pacing_7d=$(jq -r '.pacing.seven_day.zone // empty' "$cache_file" 2>/dev/null)
    model_label=$(jq -r '.seven_day_model.label // empty' "$cache_file" 2>/dev/null)
    model_util=$(jq -r '.seven_day_model.utilization // empty' "$cache_file" 2>/dev/null)
    model_resets=$(jq -r '.seven_day_model.resets_at // empty' "$cache_file" 2>/dev/null)
    error_reason=$(jq -r '.error_reason // empty' "$cache_file" 2>/dev/null)

    if [ -n "$util_7d" ] && [ -z "$usage_7d_text" ]; then
      usage_7d_text=$(usage_segment "7D" "$VIOLET" "$util_7d" "$(parse_iso_to_epoch "$resets_7d")" "$(zone_label "$pacing_7d")${stale_mark}")
    fi

    # 모델별 주간 한도 (예: Fable) — 실시간 값이 없어 늘 캐시
    if [ -n "$model_label" ] && [ -n "$model_util" ]; then
      model_usage_text=$(usage_segment "$model_label" "$AMBER" "$model_util" "$(parse_iso_to_epoch "$model_resets")" "$stale_mark")
    fi
  elif [ -z "$usage_7d_text" ]; then
    # 실시간 값도 캐시 파일도 없음
    usage_7d_text="${VIOLET}7D:${RESET} ${GRAY}--%${RESET}"
  fi

  token_warn_text=""
  if [ "$error_reason" = "token_needs_relogin" ] || [ "$error_reason" = "token_expired" ] || [ "$error_reason" = "refresh_failed" ]; then
    token_warn_text="${YELLOW}⚠${RESET}"
  elif [ "$error_reason" = "rate_limited" ]; then
    # Rate limit 지속 시간 계산 (first_error_at 기준)
    rate_duration=""
    first_error_at=$(jq -r '.first_error_at // 0' "$cache_file" 2>/dev/null)
    if [ -n "$first_error_at" ] && [ "${first_error_at%.*}" -gt 0 ] 2>/dev/null; then
      now=$(date +%s)
      rate_secs=$((now - ${first_error_at%.*}))
      if [ "$rate_secs" -ge 3600 ]; then
        rate_duration=" $((rate_secs / 3600))h"
      elif [ "$rate_secs" -ge 60 ]; then
        rate_duration=" $((rate_secs / 60))m"
      fi
    fi
    # last-good fallback: 실시간·캐시 7D 가 없으면 last-good에서 표시
    if [ -z "$usage_7d_text" ]; then
      last_good="$HOME/.claude/.usage-last-good.json"
      if [ -f "$last_good" ]; then
        lg_util=$(jq -r '.seven_day.utilization // empty' "$last_good" 2>/dev/null)
        if [ -n "$lg_util" ]; then
          lg_int=$(printf "%.0f" "$lg_util" 2>/dev/null || echo 0)
          usage_7d_text="${VIOLET}7D:${RESET} ${GRAY}${lg_int}% STALE${RESET}"
        fi
      fi
    fi
    token_warn_text="${GRAY}⏳ RATE${rate_duration}${RESET}"
  fi
fi

# 경과 시간: m:ss, 1시간 넘으면 h:mm:ss
fmt_elapsed() {
  local t=$1
  [ "$t" -lt 0 ] && t=0
  if [ "$t" -ge 3600 ]; then
    printf '%d:%02d:%02d' $((t / 3600)) $(((t % 3600) / 60)) $((t % 60))
  else
    printf '%d:%02d' $((t / 60)) $((t % 60))
  fi
}

# 턴 시간: statusline 엔 "작업 중" 신호가 없어 transcript 로 판단한다.
#   시작 = 현재 prompt_id 의 첫 줄 timestamp → 흐르는 시간 (refreshInterval 로 매초 갱신)
#   끝   = 그 뒤 system/turn_duration → 그 턴이 걸린 시간으로 고정 (회색)
# ponytail: Esc 중단은 turn_duration 을 남기지 않아 다음 입력 전까지 계속 올라간다.
turn_text=""
if [ -n "$prompt_id" ] && [ -f "$transcript_path" ]; then
  turn_line=$(grep -n -m1 -F "\"promptId\":\"${prompt_id}\"" "$transcript_path" 2>/dev/null | cut -d: -f1)
  if [ -n "$turn_line" ]; then
    turn_ms=$(tail -n +"$turn_line" "$transcript_path" | grep -m1 -F '"subtype":"turn_duration"' | jq -r '.durationMs // empty' 2>/dev/null)
    if [ -n "$turn_ms" ]; then
      turn_text="${GRAY}⏱ $(fmt_elapsed $((${turn_ms%.*} / 1000)))${RESET}"
    else
      turn_epoch=$(parse_iso_to_epoch "$(sed -n "${turn_line}p" "$transcript_path" | jq -r '.timestamp // empty' 2>/dev/null)")
      [ -n "$turn_epoch" ] && turn_text="⏱ $(fmt_elapsed $(($(date +%s) - turn_epoch)))"
    fi
  fi
fi

separator="${GRAY} │ ${RESET}"

# Line 1: dir │ branch │ model │ effort │ version │ ⏱ 턴 시간
line1=""
[ -n "$dir_text" ] && line1="${dir_text}"

if [ -n "$branch_text" ]; then
  [ -n "$line1" ] && line1="${line1}${separator}"
  line1="${line1}${branch_text}"
fi

if [ -n "$model_text" ]; then
  [ -n "$line1" ] && line1="${line1}${separator}"
  line1="${line1}${model_text}"
fi

if [ -n "$effort_text" ]; then
  [ -n "$line1" ] && line1="${line1}${separator}"
  line1="${line1}${effort_text}"
fi

if [ -n "$version_text" ]; then
  [ -n "$line1" ] && line1="${line1}${separator}"
  line1="${line1}${version_text}"
fi

if [ -n "$turn_text" ]; then
  [ -n "$line1" ] && line1="${line1}${separator}"
  line1="${line1}${turn_text}"
fi

# Line 2: ctx │ cache │ 5h │ 7D │ model(Fable) │ warning
line2=""
[ -n "$context_text" ] && line2="${context_text}"

if [ -n "$cached_text" ]; then
  [ -n "$line2" ] && line2="${line2}${separator}"
  line2="${line2}${cached_text}"
fi

if [ -n "$usage_5h_text" ]; then
  [ -n "$line2" ] && line2="${line2}${separator}"
  line2="${line2}${usage_5h_text}"
fi

if [ -n "$usage_7d_text" ]; then
  [ -n "$line2" ] && line2="${line2}${separator}"
  line2="${line2}${usage_7d_text}"
fi

if [ -n "$model_usage_text" ]; then
  [ -n "$line2" ] && line2="${line2}${separator}"
  line2="${line2}${model_usage_text}"
fi

if [ -n "$token_warn_text" ]; then
  [ -n "$line2" ] && line2="${line2}${separator}"
  line2="${line2}${token_warn_text}"
fi

printf "%s\n" "$line1"
[ -n "$line2" ] && printf "%s\n" "$line2"