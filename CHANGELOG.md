# Changelog

All notable changes to Spaces. Versions follow [semantic versioning](https://semver.org).

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

- The Claude Code hook, the OpenCode plugin and the omp extension. Agents in Herdr are covered by the Herdr feed, and any other agent can still report through `omarchy-shell cyperx84.spaces agent <session> <state> <pids>`; see [docs/agents.md](docs/agents.md#reporting-agents-outside-herdr)

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
