# jstack

[한국어](README.md) · English

A Claude Code plugin with 13 skills for planning, specs, project documentation (SoT), review and commits, plus 2 hooks and a usage statusline.

> Version `7.0.0` · License MIT

## Install

```bash
claude plugin marketplace add cjinzy/jstack
claude plugin install jstack@jstack
```

Restart Claude Code after installing. Call a skill with `/jstack:<skill>`, or just ask for something that matches a skill's description and Claude will use it.

- Update: `claude plugin update jstack@jstack`
- Requires: Claude Code CLI, `git`, `python3`
- Extra per skill: `stress-review` needs the [OpenAI Codex CLI](https://github.com/openai/codex) (a Claude subagent reviews instead when it is missing, over its usage limit, or consent cannot be asked; stops if installed without auth); the statusline needs `jq` and `uv`

## Skills

How each skill works, step by step: **[docs/skills.en.md](docs/skills.en.md)**

| Area | Skill | What it does |
|---|---|---|
| Start | [`claude-init`](docs/skills.en.md#claude-init) | Set up a whole Claude Code environment (plugins, settings, statusline). [See caveats](#parts-tied-to-the-authors-setup) |
| | [`onboard`](docs/skills.en.md#onboard) | Shows which skill to use in which situation |
| Plan | [`interview`](docs/skills.en.md#interview) | Interviews you before building → spec file |
| | [`ambition`](docs/skills.en.md#ambition) | Stretches a plan along three axes (Altitude, Depth, Range) and slices it into runnable pieces (Slice) |
| | [`maestro`](docs/skills.en.md#maestro) | Turns the session into an orchestrator that delegates to sub-sessions (agents or herdr panes) · manual only |
| Document | [`deepinit`](docs/skills.en.md#deepinit) | Analyzes the project → `AGENTS.md` |
| | [`sot-create`](docs/skills.en.md#sot-create) | Builds `sot/`, a citable, checkable project docset |
| | [`sot-verify`](docs/skills.en.md#sot-verify) | Checks `sot/` still matches the code and fixes it · manual only |
| Review | [`cleanser`](docs/skills.en.md#cleanser) | Reports AI code slop (debug leftovers, dead code, over-handling) |
| | [`stress-review`](docs/skills.en.md#stress-review) | Independent second opinion from the Codex CLI (review, challenge, consult); a Claude subagent when Codex is missing, over its usage limit, or consent cannot be asked |
| Finish | [`commit`](docs/skills.en.md#commit) | Commits with a gitmoji + Korean message |
| | [`mole-linear`](docs/skills.en.md#mole-linear) | Linear issue and comment rules. [See caveats](#parts-tied-to-the-authors-setup) |
| Meta | [`manage-skills`](docs/skills.en.md#manage-skills) | Creates and updates project `verify-*` check skills · manual only |

"Manual only" skills set `disable-model-invocation`, so they run only when you call `/jstack:<skill>`.

## Parts tied to the author's setup

Most skills work as-is in any project. These three assume the author's environment.

- **`claude-init`** clones the author's Claude Code setup. It overwrites `~/.claude/CLAUDE.md` with the author's guidelines and adds setting defaults (Korean replies, `opus` model, plan mode, …) and required plugins. Every changed file is backed up and rollback steps are printed, but skip it if that isn't the environment you want. All other skills work without it.
- **`mole-linear`** encodes the STEALTHMOLE team's Linear rules (team name, statuses, issue format). Other teams need to edit the skill file.
- **`commit`** writes commit messages in Korean.

## What claude-init does

Run `/jstack:claude-init`; it asks before each step. Details: [docs/skills.en.md#claude-init](docs/skills.en.md#claude-init)

1. Checks what is already installed → runs only the missing steps
2. Asks consent to overwrite files and which optional plugins to install
3. Installs plugins — 3 required (`context-mode`, `serena`, `i-have-adhd`) + the optional ones you picked
4. Clones this repo to `~/.claude/.jin-claude-repo/` → copies the statusline, `~/.claude/CLAUDE.md` and its include files, installs the usage timer (macOS launchd / Linux systemd)
5. Merges `~/.claude/settings.json`
6. Audits for conflicts (duplicate MCP servers, shadowed skills, clashing plugins) → applies only the fixes you pick
7. Prints a change summary, backup paths and rollback steps

Keys written to `settings.json`:

| Applied | Keys |
|---|---|
| Always overwritten | `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `statusLine.type`, `statusLine.command` |
| Only if missing | `enableAllProjectMcpServers: true`, `skipDangerousModePermissionPrompt: true`, `permissions.defaultMode: plan`, `language: korean`, `effortLevel: high`, `model: opus`, `advisorModel: fable` |

`enableAllProjectMcpServers` and `skipDangerousModePermissionPrompt` connect project `.mcp.json` servers without approval and skip the bypass-permissions mode warning. Set them to `false` to opt out — init keeps your value.

## Hooks

Always active once the plugin is installed.

| Event | What it does |
|---|---|
| `SessionStart` | Auto-updates this marketplace repo (`git pull --ff-only`), re-registers the usage timer if init installed it and it went missing, moves copies left in `~/.claude/skills` by old versions to a backup folder, puts init's shell `statusLine` back if it is missing (removed by the old `mod-statusline`; settings.json backed up), removes the old `statusLine.refreshInterval: 1` that init used to add (settings.json backed up) |
| `UserPromptSubmit` | In plan mode, asks whether to plan in ambition mode; if the message has the word `ambition`/`앰비션`, loads the `ambition` skill |

## Statusline

Installed by `claude-init`. Shows session info and Claude subscription usage on two lines.

![statusline — usage values blurred](docs/images/statusline.png)

- Line 1: directory, branch, model, effort, Claude Code version
- Line 2: context use, cache-read tokens, 5-hour and 7-day usage with time to reset and pacing, per-model weekly limit, cache errors (`⚠` token · `⏳ RATE`)
- Colors move from green to red in 10 steps as usage grows.
- Hide the directory, branch or usage with `SHOW_DIRECTORY=0`, `SHOW_BRANCH=0`, `SHOW_USAGE=0` in `~/.claude/statusline-config.txt` (missing keys stay shown).
- The `⏱` turn timer from earlier versions is gone. An old script already installed shows a frozen `⏱` until you rerun `jin init`.

5-hour and 7-day usage come first from the live values Claude Code passes the statusline (`rate_limits`, from the first API response). Before that, and for per-model limits, it reads the `fetch-claude-usage` cache. `fetch-claude-usage` reads the Claude Code login token (`~/.claude/.credentials.json` or the macOS Keychain), calls `https://api.anthropic.com/api/oauth/usage`, and caches the result for 5 minutes in `~/.claude/.usage-cache.json`. Needs a subscription account (Pro/Max/Team/Enterprise). A `claude setup-token` token lacks this API's `user:profile` scope (403) — for per-model 7D, also `/login`.

## Development

Test files are local-only via `.gitignore` (not in the clone).

```bash
uv sync                                   # dependencies
uv run ruff check src/ tests/             # lint
uv run pytest tests/                      # statusline and usage tests
for d in plugins/jstack/skills/*/scripts; do (cd "$d" && uv run pytest -q); done   # skill script tests
claude plugin validate .                  # validate marketplace and plugin
```

## Layout

```
.claude-plugin/marketplace.json   marketplace catalog
plugins/jstack/
  .claude-plugin/plugin.json      plugin manifest
  skills/<skill>/SKILL.md         skills (with scripts/, templates/)
  hooks/                          SessionStart and UserPromptSubmit hooks
  scripts/                        statusline, timer installer
src/jin_claude/                   fetch-claude-usage (usage CLI)
docs/skills.en.md                 how each skill works
```

## License

MIT. Parts of `stress-review` come from [gstack](https://github.com/garrytan/gstack) (MIT, `skills/stress-review/LICENSE-gstack`).
