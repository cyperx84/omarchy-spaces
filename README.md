<h1 align="center">Spaces</h1>

<p align="center">cyperx84's fork of <a href="https://github.com/tornikegomareli/omarchy-spaces">tornikegomareli/omarchy-spaces</a>. It swaps the per-agent hooks for a Herdr agent feed with an agents chip, and shows workspace keys read from your Hyprland binds.</p>

<h3 align="center">See what runs on every workspace.</h3>

<p align="center">
  <img src=".github/assets/film-apps.png" width="100%" alt="The Omarchy bar with Spaces: five workspaces, each showing the app icons open on it" />
</p>

Spaces is a workspace switcher for the [Omarchy](https://omarchy.org) bar. Each workspace shows the icons of the apps open on it. The active one slides open, and the focused window is highlighted.

## Peek before you jump

Hover another workspace to see it live, laid out the way it is on screen. Click a window in the preview to jump to it.

Previews follow the monitor's orientation, including portrait displays, and shrink to fit the available screen space while keeping the full workspace visible. The size setting controls the longest side, so portrait and landscape previews have a comparable size.

<p align="center">
  <img src=".github/assets/film-preview.png" width="100%" alt="Hovering workspace 2 opens a live preview with omarchy.org and Neovim side by side" />
</p>

## Know when your agent needs you

Herdr already knows what every coding agent in its panes is doing, so Spaces listens to Herdr instead of to a hook per agent. The window hosting [Herdr](https://herdr.dev) gets a badge: a spinner while an agent works, a pulsing `!` when it is blocked on you, and a check mark when it is done. A workspace with an agent waiting on you pulses too. Hovering the icon lists each agent and its state.

This needs Herdr running. With Herdr missing or stopped, nothing is shown and nothing errors. The badge goes on the window that runs the `herdr` client, found as the terminal that is its parent. With several Herdr windows, each shows the combined state of every agent, and a terminal that runs several windows in one process may badge all of them.

<p align="center">
  <img src=".github/assets/film-agent.png" width="100%" alt="A terminal icon on workspace 4 with an orange exclamation badge: the agent needs input" />
</p>

*The badge as it looked in the upstream film, fed by a Claude Code hook. The Herdr feed draws the same badge.*

### Agents chip

After the workspace pills, an agents chip counts what Herdr is running: waiting agents with `!`, working ones with the spinner, done ones with a check mark, or a plain total when everything is idle. It pulses while an agent waits. Hover it for the list. Click it to open a card with one row per agent, newest change first, showing its Herdr workspace, title and agent name. Click a row to focus that agent's pane in Herdr and its window in Hyprland.

The preview of a workspace that holds the Herdr window also gets up to five agent rows, clickable the same way, with a "+N more in Herdr" line beyond that.

Two settings control this, both under Windows:

- `herdrAgents` (default on) turns the feed and every Herdr badge on or off. It needs `agentStatus`, which is also on by default.
- `agentChip` is `auto` (default: show the chip while an agent works or waits), `always` (whenever Herdr lists an agent) or `never`.

The feed is `hooks/herdr-feed`, a stdlib Python 3 script that the widget starts and restarts itself. Run `hooks/herdr-feed --once` to see the JSON it reads.

Agents outside Herdr can still report in through `omarchy-shell cyperx84.spaces agent <session> <working|waiting|done|end> <pids>`, where `<pids>` lists the agent's process and its parents, comma-separated. This repo no longer ships hooks that call it.

## Key hints

Each workspace pill can show the key that reaches it. Spaces reads `hyprctl binds -j`, so it follows whatever bindings you have, not a fixed layout: SUPER+J for workspace 1 shows a `J`. It understands both classic `workspace` binds and Omarchy's Lua binds, by their "Switch to workspace N" description. Binds in a submap, mouse binds, and Lua entries with no key are skipped, and a workspace with no bind shows only its number.

Under Appearance, Workspace label is `Number`, `Key`, `Number + key` (default), `Glyph` or `None`. In the combined style the key is a smaller caption after the number, or under it in a vertical bar, and is left off when it only repeats the number.

Hover a pill for a tooltip such as "Workspace 1 · SUPER + J to switch · ALT + SHIFT + J to move window here". The "Shortcut tooltips" setting under Behaviour (`keyTooltips`) turns it off. Binds are read at startup and again half a second after a Hyprland config reload.

## Install

```sh
omarchy plugin add https://github.com/cyperx84/omarchy-spaces.git --enable
omarchy plugin disable omarchy.workspaces   # optional: replace the built-in switcher
```

Requirements:

- Omarchy 4 with the Quickshell bar (Hyprland 0.56 or newer)
- [Herdr](https://herdr.dev) and `python3`, only for agent status

Works with the bar on any edge of the screen. Tested on a single monitor.

To update, then load the new code:

```sh
omarchy plugin update cyperx84.spaces
omarchy restart shell
```

## Remove

```sh
omarchy plugin remove cyperx84.spaces
omarchy plugin enable omarchy.workspaces   # bring back the built-in switcher
```

If you added the key binding below, delete it from `~/.config/hypr/bindings.lua`.

## Using it

- Click a workspace to go there. Click an icon to focus that window.
- Scroll over the widget to move between workspaces.
- Hover an icon to see the window title, and a workspace to see its keys.
- With Herdr running, click the agents chip to list agents and jump to one.
- Hover another workspace to preview it. Click a window in the preview to focus it.
- Right-click the widget to open settings. An optional gear can be enabled under Appearance → Settings button; it stays in a fixed slot before the workspaces.

## Settings

<img src=".github/assets/settings.png" width="330" align="right" alt="Spaces settings panel" />

Settings are organised into App icons, Windows, Appearance, Workspaces, Previews, and Behaviour. Each section fits its controls without an internal scroll area, and changes apply automatically and are saved to `~/.config/omarchy/shell.json`.

Use Tab / Shift+Tab to move through controls and Enter / Space to activate them. On sliders, use Left / Right to adjust by one, or Home / End for the minimum or maximum. Reset to defaults asks for confirmation before resetting all sections.

To open settings with a key, add this to `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + CTRL + ALT + S", "Spaces settings", "omarchy-shell cyperx84.spaces toggle")
```

To preview a workspace from a key or script, without hovering:

```sh
omarchy-shell cyperx84.spaces peek 3
```

Settings can also be set from a script:

```sh
omarchy bar set cyperx84.spaces showApps all
```

<br clear="right" />

## Development

From a clone of this repository, link it into Omarchy and run the tests:

```sh
ln -sfn "$PWD" ~/.config/omarchy/plugins/cyperx84.spaces
omarchy plugin enable cyperx84.spaces
node tests/model.test.js
bash tests/settings.sh
# Optional: opens a temporary Wayland window to test the settings gear
bash tests/gear.sh
```

Pure logic lives in `Model.js` and is tested with node; `tests/settings.sh` runs the settings panel offscreen. Neither loads the bar widget itself. After code changes, run `omarchy restart shell`.

## License

[MIT License](LICENSE).
