# Changelog

All notable changes to Spaces. Versions follow [semantic versioning](https://semver.org).

## 2.2.0

### Added

- Agent details: rows in the agents popup and on the preview card show what each agent is doing (Herdr's label for its state, such as `running: npm test`), how long it has been in its state (`blocked 4m`), and its model, context, cost and branch when Herdr reports them. Agent tooltips gain the time in state too. New "Agent details" setting (`agentDetails`), on by default
- Desktop notifications when an agent needs your input, such as "docs needs input", with the agent's activity as the body. Click one to jump to that agent. Nothing is sent about the agent you are looking at or about agents already blocked when the shell starts, each agent alerts once per state, and bursts are combined into one notification at most every three seconds. A "needs input" notification closes itself once you answer the agent, or when the agent goes away (including Herdr quitting); this holds for up to three notifications at a time and for ten minutes each, and one sent while three are open stays until you dismiss it. New "Agent notifications" setting (`agentNotify`): Off, Needs input (the default) or Needs input + finished
- Mute agent notifications with `omarchy-shell cyperx84.spaces mute` (toggles, prints `muted` or `unmuted`), `setMute on|off`, or the new "Mute agent notifications" setting (`agentMute`). The agents chip shows a bell with a slash while muted
- Agent status without Herdr. Claude Code run in a plain terminal reports through its hooks: `hooks/claude-hook` maps Claude Code's events to working, waiting, done and end (and `idle_prompt` to settle, see below), finds the terminal window through its parent processes and reports to the bar in the background. Install the hooks once with `~/.config/omarchy/plugins/cyperx84.spaces/hooks/install-claude-hooks install`; it backs up `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`), adds nine async hooks next to your own, and `remove` takes exactly those out again: only hooks whose command starts with the hook's path count as its own, never one that merely mentions it. It refuses a read-only `settings.json`, a file that changes while it runs, and JSON with `NaN` or `Infinity`, and writes nothing then. `status` and `--dry-run` show what is there and what would change. Spaces never runs it for you. The hook does nothing inside Herdr, which reports those sessions itself
- Agents that report through IPC are now full agents: they are counted in the agents chip, listed in the popup, shown on the preview card of the workspace holding their window and in their icon's tooltip, and send notifications, which stay quiet while their own window is active. Clicking one focuses its terminal window. A session listed by both Herdr and a reporter shows once, as Herdr's
- New `report` IPC method: `report <session> <state> <pids> <agent> <title> <cwd> <activity> <time>`, returning `ok` or `ignored`. Text is treated as untrusted and capped, and a report made before the last one for its session, or before the session's `end`, is ignored. At most 64 reporter sessions are kept, and one with no PID to check is removed 30 minutes after its last report. The session names `__proto__`, `constructor` and `prototype` are refused. `agent <session> <state> <pids>` works as before, except that its `done` and `idle` sessions are now removed 30 minutes after their last report
- New reporter state `settle`, for both IPC methods: a working or waiting session turns idle, a done or idle one stays as it is. `hooks/claude-hook` sends it for Claude Code's `idle_prompt` notification (about a minute after Claude stops, if you have not typed), so a session you interrupted with Esc, for which Claude Code sends no Stop, no longer spins or shows `!` until your next prompt
- The Windows settings page shows whether the Claude Code hooks are installed, read-only, with the command to install them
- Scratchpad pill: while Hyprland's scratchpad (a special workspace) has windows or is shown, it gets a pill after the numbered ones, with a layers glyph and the icons of its windows, agent badges, urgent pulse and preview card like any pill. Click it to show or hide the scratchpad; click an icon in it to bring up that window. It wears the active style while the scratchpad is shown. Other special workspaces get a pill too, labelled with their short name or first letter. Its tooltip names it and, with shortcut tooltips on, the keys that toggle it and move a window to it, read from Omarchy's "Toggle scratchpad" and "Move window to scratchpad" binds or from classic `togglespecialworkspace` and `movetoworkspace special:NAME` binds. New "Show scratchpad" setting (`showSpecial`) on the Workspaces page, on by default
- New "Reverse scroll direction" setting (`reverseScroll`) under Behaviour, off by default, shown when scrolling switches workspaces

### Changed

- `hooks/herdr-feed` passes on each agent's activity, tokens (at most eight short entries), working directory, and the time it entered its current state
- Demo mode's agents have activities, usage and times in state, so the new details can be tried without Herdr. They never send notifications
- The agents chip, popup, details, notifications and mute work without Herdr, and their settings no longer need "Herdr agents" on. "Herdr agents" off now hides only Herdr's agents. The popup is titled "Agents", and its empty state reads "No agents"
- Reporter sessions from `report` are rechecked every minute in any state, so a killed Claude Code leaves no row or badge behind for more than about a minute
- Scrolling moves one workspace per touchpad swipe or wheel notch instead of one per scroll event, so a single swipe no longer skips several workspaces. A touchpad steps once a swipe has travelled 100 pixels and ignores the rest of that swipe until the fingers lift (from the scroll phases Qt gives touchpads on Wayland; without phases, for 350 ms after each step); a wheel steps once per notch with a 150 ms pause to absorb free-spinning wheels; a partial scroll is forgotten after 400 ms. Sideways scrolls are ignored on a horizontal bar and count on a vertical one. Scrolling skips special workspaces, and starts from the last numbered workspace while the focused one is not numbered

## 2.1.0

### Added

- `hooks/bind-keys`, a small Python 3 script Spaces runs beside `hyprctl binds -j`, at startup and after every config reload. It reads the keymap with `xkbcli` (or a built-in table for the number row and common punctuation) and the binds your `hyprland.lua` makes, through a stubbed, read-only `lua` run as Omarchy's keybindings menu does, so Spaces can find keys that Hyprland lists without one

### Fixed

- Omarchy's stock workspace binds now show their keys. `SUPER + 1` to `SUPER + 0` are made by key code, which Hyprland 0.56 lists with no key, so they were skipped and those pills had no shortcut tooltip. They now read `SUPER + 1` to switch and `SUPER + SHIFT + 1` to move a window. The Number + key caption is still left out when the key just repeats the number
- Classic binds made by key code, such as `bind = SUPER, code:10, workspace, 1`, show the key (`1`) instead of `code:10`
- When you bind your own key for a workspace, it wins over Omarchy's number key for that workspace, for both switching and moving. Workspaces you did not rebind keep Omarchy's keys

## 2.0.0

The first release of Spaces as its own project, `cyperx84.spaces`, built on [omarchy-spaces](https://github.com/tornikegomareli/omarchy-spaces) 1.2.0 by Tornike Gomareli.

### Added

- Agent status from [Herdr](https://herdr.dev). Spaces reads Herdr's own agent status through `hooks/herdr-feed`, a small Python 3 script it runs in the background, and badges the terminal window hosting Herdr: a spinner while an agent works, a pulsing `!` when one is blocked on you, a check mark when one is done. When more than one agent is live, a count beside the badge says how many, and the icon's tooltip lists each agent. New "Herdr agents" setting (`herdrAgents`)
- The agents chip after the workspace pills counts waiting, working and done agents, and pulses while one waits. New "Agents chip" setting (`agentChip`): Auto, Always or Never
- The agents popup: click the chip for every agent, newest change first, with its Herdr workspace, title and agent name. Click a row to focus the agent's pane in Herdr and the Herdr window in Hyprland
- `omarchy-shell cyperx84.spaces agents` opens and closes the agents popup, so it can be bound to a key
- The preview card of the workspace holding Herdr lists up to five agents, clickable the same way
- Key hints from your own Hyprland binds. Spaces reads `hyprctl binds -j`, both Omarchy's Lua binds and classic `workspace` binds, and again after every config reload
- "Workspace label" gains Key and Number + key styles. Number + key, the new default, shows the switch key as a small caption beside the number
- Shortcut tooltips: hover a pill to see the keys that switch to it and move a window to it. New "Shortcut tooltips" setting (`keyTooltips`)
- Demo mode for trying the agent features and taking screenshots without Herdr: `omarchy bar set cyperx84.spaces demo true --json` plays scripted agents through every status

### Changed

- The plugin id is now `cyperx84.spaces`, so it can be installed beside the original `tornikegomareli.spaces`
- "Agent status" and "Herdr agents" stay available with app icons turned off, since the agents chip does not need icons
- Without Herdr or `python3`, nothing is shown and nothing is logged. The feed retries in the background, backing off to once a minute, and starts at once when a Herdr client appears

### Fixed

- Tooltips on app icons and on the settings gear now show. They never appeared before

### Removed

- The Claude Code hook, the OpenCode plugin and the omp extension. Agents in Herdr are covered by the Herdr feed, and any other agent can still report through `omarchy-shell cyperx84.spaces agent <session> <state> <pids>`; see [docs/agents.md](docs/agents.md#reporting-agents-from-your-own-scripts)

## Before 2.0: omarchy-spaces by Tornike Gomareli

The entries below are the history of [tornikegomareli/omarchy-spaces](https://github.com/tornikegomareli/omarchy-spaces), kept as they were written. Plugin ids, hook paths and commands in them refer to that project.

### 1.2.0

- Agent status for omp (oh-my-pi): add `hooks/omp-extension.js` to your omp
  config and its terminals get the same badges as Claude Code. An approval
  prompt waits 1.5s before showing `!`, so a quick answer never flashes
  (#14, @a-lang)
- A "Pill background" setting under Appearance hides the faint fill behind
  occupied and hovered workspaces. The active workspace keeps its highlight
  (#1, @tseluka)
- A workspace that shows a single icon no longer highlights it as focused
  (#12, #13, @tseluka)
- Sharper app icons, and an app with no icon shows the first letter of its own
  name instead of a shared prefix, so `org.omarchy.herdr` reads "H", not "O"
  (#10, @Natetgmaxwell)
- Security: window titles in the bar and in previews render as plain text, so
  a title with markup can no longer load remote images in the shell

### 1.1.0

- Settings are organised into six pages: App icons, Windows, Appearance,
  Workspaces, Previews, and Behaviour. They work from the keyboard, the
  focused title length can be set, and resetting asks first (#8, @tcballard)
- The settings gear is off by default. Right-click the widget to open
  settings, or turn the gear on under Appearance; it now sits in a fixed slot
  before the workspaces (#8)
- Agent status for OpenCode: link `hooks/opencode-plugin.js` into OpenCode and
  its terminals get the same badges as Claude Code. A permission prompt waits
  1.5s before showing `!`, so `--auto` never flashes (#4, @FarzadHayat)
- Agent status: a `working` or `waiting` badge left behind by a crashed agent
  clears within a minute (#3, @FarzadHayat)
- Previews fit portrait and rotated monitors (#6, @VulpesZerda27)
- Fixed: changing the animation speed, or turning animations off and on, hid
  every workspace pill until the shell restarted (#9, reported by @movshuri,
  fix by @Coding-Sparrow)

### 1.0.0

First stable release, ready for the Omarchy plugin marketplace.

- The plugin ID is now `tornikegomareli.spaces`, matching the repository owner.
  If you installed an earlier version, remove `insanearts.spaces`, add the plugin
  again, and update the hook paths in `~/.claude/settings.json`.
- README: screenshots from the product film, requirements, and update and
  removal instructions
- Marketplace preview image
- Verified with the bar on the top, bottom, left and right edges

### 0.3.0

- Agent status: terminals running Claude Code show a spinner while the agent
  works, a pulsing `!` when it needs input, and a check mark when it is done.
  Workspaces with a waiting agent pulse
- `hooks/claude-hook` reports agent state; see the README for setup
- Setting to turn agent status off

### 0.2.0

- Live workspace previews: hover another workspace to see a miniature of it,
  with each window where it really is. Click a window to jump to it
- The preview slides between workspaces as you move along the bar
- Hovering an app icon highlights its window in the preview
- `peek` command to open a preview from a keybinding:
  `omarchy-shell insanearts.spaces peek 3`
- Settings: turn previews on or off, preview size, live video or still frame
- Icons for apps with reverse-DNS ids, such as `dev.example.tool`
- Fix: workspaces could stay half faded after appearing

### 0.1.0

First release.

- Workspace pills that show the icons of the apps open on each workspace
- The active workspace slides open; the focused window is highlighted
- Click a workspace or an icon to focus it; scroll to switch workspaces
- Settings panel: when icons show, icon style and size, grouping by app,
  active style, labels, density, urgent highlights, tooltips, animations
- Icons for Chromium web apps and apps missing from the icon theme
