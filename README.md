<h1 align="center">Spaces</h1>

<p align="center">A workspace switcher for the Omarchy bar that shows the apps on every workspace, the keys that reach it, and what your coding agents are doing.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT" /></a>
  <a href="https://omarchy.org"><img src="https://img.shields.io/badge/Omarchy-4-black" alt="Omarchy 4" /></a>
  <a href="https://hypr.land"><img src="https://img.shields.io/badge/Hyprland-0.56%2B-58e1ff" alt="Hyprland 0.56 or newer" /></a>
  <a href="https://github.com/cyperx84/omarchy-spaces/actions/workflows/test.yml"><img src="https://github.com/cyperx84/omarchy-spaces/actions/workflows/test.yml/badge.svg" alt="Test status" /></a>
</p>

<p align="center">
  <img src=".github/assets/hero.png" width="100%" alt="The Omarchy bar with Spaces: workspace pills showing a number and a small key caption, the app icons open on each workspace, a spinner badge on the terminal running Herdr, and the agents chip with agent counts after the pills" />
</p>

Spaces replaces Omarchy's built-in workspace switcher. Each workspace is a pill in the bar that shows the icons of the apps open on it, and the active pill slides open to show them. Hover a pill to see a live miniature of that workspace, and read its shortcut from your own Hyprland binds. If you run coding agents, in [Herdr](https://herdr.dev) or as Claude Code in a plain terminal, their terminal gets a badge for what they are doing, and an agents chip lists every agent so you can jump to the one that needs you.

Spaces started as [omarchy-spaces](https://github.com/tornikegomareli/omarchy-spaces) by Tornike Gomareli. See [Credits](#credits).

## Features

### Workspace pills with app icons

Each workspace is a pill labelled with its number. The active pill, and any pill you hover, shows the icon of every window on that workspace, ordered the way they sit on screen. The focused window is highlighted, and the others on the active workspace are dimmed. Click a pill to go to that workspace, click an icon to focus that window, and scroll over the bar to step through workspaces: one step per wheel notch or touchpad swipe, so a single swipe does not skip several workspaces (see [Scroll to switch workspaces](docs/configuration.md#behaviour) for the details). Icons come from your desktop entries and icon theme, including Chromium web apps. An app with no icon gets a letter tile.

### Scratchpad pill

Windows parked in the scratchpad, Hyprland's special workspace, stay in sight: while it has windows or is shown, the scratchpad gets a pill of its own after the numbered pills, with a layers glyph and the icons of the windows in it, a preview card on hover and agent badges like any other pill. Click it to show or hide the scratchpad, as `SUPER + S` does; while it is shown, the pill wears the active style. Click an icon in it to bring up that window. Other special workspaces you make get a pill too, labelled with their name if it has up to three characters, or its first letter. Scrolling skips these pills, since a special workspace is an overlay rather than a place in the row. Turn it off with "Show scratchpad" on the Workspaces page.

### Live previews

<p align="center">
  <img src=".github/assets/preview.gif" width="100%" alt="Moving the pointer along the workspace pills: a preview card opens under the bar with a live miniature of each workspace, its windows laid out where they are on screen, and slides from pill to pill" />
</p>

Hover a pill for another workspace and a preview card opens with a live miniature of it, each window where it really is on screen. Move along the bar and the card slides from pill to pill. Click a window in the miniature to jump to it. Previews follow the monitor's orientation, so portrait and rotated displays work too.

### Agent status

<p align="center">
  <img src=".github/assets/agents.gif" width="100%" alt="The agents chip after the workspace pills counts waiting, working and done agents. Clicking it opens a popup listing each agent with its status badge, Herdr workspace, title and agent name, and the badges change as agents start working, get blocked and finish" />
</p>

Spaces gets agent status from two sources, and Herdr is optional:

- **[Herdr](https://herdr.dev)**, a terminal multiplexer for coding agents, already knows what every agent in its panes is doing. Spaces listens to it; nothing to set up.
- **Claude Code in a plain terminal**, without Herdr, reports through Claude Code's hooks. Install them once (you run this; Spaces never edits Claude Code's settings by itself):

  ```sh
  ~/.config/omarchy/plugins/cyperx84.spaces/hooks/install-claude-hooks install
  ```

  It adds nine async hooks to `~/.claude/settings.json` after making a backup, keeps everything else, and `install-claude-hooks remove` takes exactly them out again. `--dry-run` shows the change first and `status` says whether they are in.

The terminal window running the agent gets a badge: a spinner while an agent works, a pulsing `!` when one is blocked on you, and a check mark when one is done. A workspace with a blocked agent pulses until you go there.

After the pills, the agents chip counts waiting, working and done agents. Click it for a popup with one row per agent, newest change first: what it is doing, how long it has been blocked or working, and, from Herdr, its model, context, cost and branch. Click a row to jump there: Herdr's agents focus their pane in Herdr and the Herdr window, Claude Code sessions their own terminal window.

When an agent needs your input, Spaces sends a desktop notification, such as "docs needs input"; click it to jump to that agent. It stays quiet about the agent you are already looking at, combines bursts into one notification, and can be muted with `omarchy-shell cyperx84.spaces mute`. Notifications for finished agents can be turned on too. With no agents from either source, none of this shows and nothing breaks. See [docs/agents.md](docs/agents.md).

### Key hints from your own binds

<p align="center">
  <img src=".github/assets/key-hints.png" width="100%" alt="The same row of workspace pills in four label styles, stacked top to bottom: Number + key, with a small key caption after each number; Key, showing only the bound key; Number; and Glyph, where the focused workspace shows a glyph instead of its number" />
</p>

Spaces reads `hyprctl binds -j` and works out which key switches to each workspace, so the pill can show it. If `SUPER + J` takes you to workspace 1, its pill reads `1` with a small `J`. It follows whatever you have bound, either Omarchy's Lua binds or classic `workspace` binds, including binds made by key code such as Omarchy's stock `SUPER + 1`, and reads them again when Hyprland reloads its config. Hover a pill for a tooltip that names the keys to switch there and to move a window there. See [docs/key-hints.md](docs/key-hints.md).

### Settings panel

<img src=".github/assets/settings.png" width="330" align="right" alt="The Spaces settings panel: a list of pages on the left (App icons, Windows, Appearance, Workspaces, Previews, Behaviour) and the controls of the selected page on the right, with a reset button at the bottom" />

Right-click the widget to open its settings. Six pages cover app icons, windows and agents, appearance, workspaces, previews and behaviour. Changes apply as you click and are saved to `~/.config/omarchy/shell.json`.

The panel works from the keyboard: Tab and Shift+Tab move between controls, Enter or Space activates one, Left and Right move a slider by one, Home and End jump to its ends, and Escape closes the panel. "Reset to defaults" asks before it resets anything.

<br clear="right" />

## Requirements

- Omarchy 4 with its Quickshell bar
- Hyprland 0.56 or newer
- For agent status only: `python3`, plus either [Herdr](https://herdr.dev) or Claude Code with the Spaces hooks installed (see [Agent status](#agent-status)). Neither is needed for the rest of Spaces
- For the keys of binds made by key code, such as Omarchy's stock `SUPER + 1` to `SUPER + 0`: `python3`, plus `lua` for a Lua config. `xkbcli` is used when present. Omarchy has all three

Spaces works with the bar on any edge of the screen. It is tested on a single monitor.

## Install

Add the plugin. Omarchy clones it into `~/.config/omarchy/plugins/cyperx84.spaces` and asks you to confirm first. Plugins are added disabled so you can read the code before running it.

```sh
omarchy plugin add https://github.com/cyperx84/omarchy-spaces.git
```

Put it in the left section of the bar, next to the built-in switcher:

```sh
omarchy plugin enable cyperx84.spaces --section left --after omarchy.workspaces
```

Optionally, remove the built-in switcher so you only have one:

```sh
omarchy plugin disable omarchy.workspaces
```

`omarchy plugin add ... --enable` does the first two steps in one go and asks which section to use.

## Using it

| Action | Where | What it does |
| --- | --- | --- |
| Left-click | A pill | Go to that workspace |
| Left-click | The active pill | Nothing, or go back to the previous workspace with "Clicking the active workspace" set to "Goes back" |
| Left-click | The scratchpad pill (or another special workspace's pill) | Show or hide that special workspace |
| Left-click | An app icon | Focus that window. On a grouped icon that is already focused, cycle through its windows. For a window in the scratchpad, this shows the scratchpad |
| Middle-click | An app icon | Close that window, when "Middle-click icon closes window" is on |
| Scroll | Anywhere on the widget | Step to the next or previous numbered workspace, wrapping around: one step per wheel notch or touchpad swipe (from fingers down to fingers up). Down is next, unless "Reverse scroll direction" is on. On a horizontal bar sideways scrolls are ignored; on a vertical bar they count too, with right as down. The scratchpad pill is skipped |
| Hover | A pill | Show its app icons and its shortcut tooltip, and, for another occupied workspace, its preview card |
| Hover | An app icon | Show the window title, and the agents on that window |
| Left-click | A window in the preview card | Focus that window |
| Left-click | The agents chip | Open or close the agents popup |
| Left-click | A row in the agents popup | Jump to that agent: its pane in Herdr and the Herdr window, or its own terminal window |
| Right-click | Anywhere on the widget | Open or close the settings panel |

A gear button for the settings can be turned on under Appearance, "Settings button".

## Keyboard and scripting

Spaces answers IPC calls through `omarchy-shell`, so you can bind them to keys:

```sh
omarchy-shell cyperx84.spaces toggle    # open or close the settings panel
omarchy-shell cyperx84.spaces peek 3    # show the preview card for workspace 3
omarchy-shell cyperx84.spaces agents    # open or close the agents popup
omarchy-shell cyperx84.spaces mute      # mute or unmute agent notifications
```

For example, in `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + CTRL + ALT + S", "Spaces settings", "omarchy-shell cyperx84.spaces toggle")
```

Every method, its return value and more bindings are in [docs/scripting.md](docs/scripting.md).

## Configuration

Every setting is in the settings panel, and can also be set from a script with `omarchy bar set`. True/false values need `--json`:

```sh
omarchy bar set cyperx84.spaces showApps all
omarchy bar set cyperx84.spaces groupApps true --json
```

The settings people change most:

| Setting | Key | Values | Default |
| --- | --- | --- | --- |
| Show icons on | `showApps` | `all`, `active`, `hover`, `hoverOnly` | `hover` |
| Workspace label | `labelStyle` | `number`, `key`, `both`, `glyph`, `none` | `both` |
| Active workspace | `activeStyle` | `subtle`, `solid`, `accent` | `subtle` |
| Always show workspaces | `persistentWorkspaces` | 0 to 10 | `5` |
| Group windows by app | `groupApps` | `true`, `false` | `false` |
| Workspace previews | `previews` | `true`, `false` | `true` |
| Agents chip | `agentChip` | `auto`, `always`, `never` | `auto` |
| Agent notifications | `agentNotify` | `off`, `blocked`, `all` | `blocked` |
| Density | `density` | `compact`, `normal`, `roomy` | `normal` |

All settings, with what each one does: [docs/configuration.md](docs/configuration.md).

## Update

```sh
omarchy plugin update cyperx84.spaces
```

Omarchy shows the diff, fast-forwards the checkout and reloads plugin code. If the bar still shows the old version, run `omarchy restart shell`.

## Remove

If you installed the Claude Code hooks, take them out first, while the installer is still there; otherwise Claude Code keeps calling a hook that no longer exists:

```sh
~/.config/omarchy/plugins/cyperx84.spaces/hooks/install-claude-hooks remove
```

Then remove the plugin:

```sh
omarchy plugin remove cyperx84.spaces
omarchy plugin enable omarchy.workspaces   # bring back the built-in switcher
```

If you bound any `omarchy-shell cyperx84.spaces` calls to keys, remove them from `~/.config/hypr/bindings.lua`.

## Troubleshooting

- **The widget does not appear after installing.** Plugins are added disabled. Run `omarchy plugin enable cyperx84.spaces --section left`.
- **No agent badges.** With Herdr: Herdr has to be running, `python3` has to be installed, and Herdr's client has to run in a terminal window; check with `python3 ~/.config/omarchy/plugins/cyperx84.spaces/hooks/herdr-feed --once`. Without Herdr: the Claude Code hooks have to be installed (`install-claude-hooks status`) and the session started after that.
- **No key captions.** A key that only repeats the pill's number, such as Omarchy's stock `SUPER + 1` on workspace 1, gets no caption, but it is in the shortcut tooltip. Keys of binds made by key code come from `hooks/bind-keys`; check with `python3 ~/.config/omarchy/plugins/cyperx84.spaces/hooks/bind-keys`, and run `hyprctl binds -j` to see what Hyprland reports.
- **No agent notifications.** "Agent notifications" must not be Off, notifications must not be muted, and `notify-send` must be installed. Spaces never notifies about the agent you are looking at, or about agents that were already blocked when the shell started.
- **Every terminal window gets the badge.** Your terminal serves several windows from one process, so Spaces cannot tell which one runs Herdr.

More, with causes and fixes: [docs/troubleshooting.md](docs/troubleshooting.md).

## Documentation

- [Configuration](docs/configuration.md): every setting, its key, values and default
- [Agent status](docs/agents.md): Herdr and Claude Code badges, the hook installer, the agents chip and popup, reporting other agents, demo mode
- [Key hints](docs/key-hints.md): how binds are read, label styles and the shortcut tooltip
- [Scripting](docs/scripting.md): IPC methods and example key bindings
- [Troubleshooting](docs/troubleshooting.md): symptoms, causes and fixes
- [Development](docs/development.md): architecture, tests and releasing
- [Changelog](CHANGELOG.md)

## Contributing

Bug reports, fixes and ideas are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for how to report a bug, set up a development copy and run the tests.

## Credits

Spaces began as [omarchy-spaces](https://github.com/tornikegomareli/omarchy-spaces) by [Tornike Gomareli](https://github.com/tornikegomareli), released under the MIT license. The pill and icon design, the live previews, the settings panel and the original idea of agent badges on terminal windows are his work, and much of the code here is still his.

The original project's contributors are part of this one too: [@tseluka](https://github.com/tseluka) (pill background setting, focused-icon fix), [@Natetgmaxwell](https://github.com/Natetgmaxwell) (sharper icons, distinct letter tiles), [@tcballard](https://github.com/tcballard) (the six settings pages and keyboard support), [@FarzadHayat](https://github.com/FarzadHayat) (OpenCode reporter, clearing badges left by crashed agents), [@VulpesZerda27](https://github.com/VulpesZerda27) (portrait and rotated previews), [@a-lang](https://github.com/a-lang) (omp reporter), [@Coding-Sparrow](https://github.com/Coding-Sparrow) and [@movshuri](https://github.com/movshuri) (fixing and reporting pills that vanished after an animation change). Their work is listed in the [inherited changelog](CHANGELOG.md#before-20-omarchy-spaces-by-tornike-gomareli). Thank you.

This project, maintained by [Cyperx](https://github.com/cyperx84), changes and adds:

- Agent status read from Herdr through `hooks/herdr-feed`, and from Claude Code without Herdr through a rewritten hook with an opt-in installer, in place of the per-agent hooks for Claude Code, OpenCode and omp
- The agents chip, the agents popup and agent rows on the preview card, with each agent's activity, time in state and usage
- Desktop notifications when an agent needs input, with mute
- Key captions and shortcut tooltips read from your live Hyprland binds
- Tooltips on app icons and the settings gear, which did not show before

Spaces runs on [Omarchy](https://omarchy.org), [Quickshell](https://quickshell.org) and [Hyprland](https://hypr.land), and gets agent status from [Herdr](https://herdr.dev).

## License

[MIT](LICENSE). Copyright (c) 2026 Tornike Gomareli and (c) 2026 Cyperx.
