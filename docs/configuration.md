# Configuration

Every Spaces setting, grouped by the page of the settings panel it lives on, in the order the panel shows them. One setting, `demo`, is not in the panel and can only be set from the command line or `shell.json`.

## Three ways to change a setting

**The settings panel.** Right-click the widget, or click the gear if you turned it on. Changes apply as you click and are saved straight away. "Reset to defaults…" at the bottom asks for confirmation, then returns every setting to its default.

**`omarchy bar set`.** Sets one key on the widget's entry in `shell.json`:

```sh
omarchy bar set cyperx84.spaces showApps all
omarchy bar set cyperx84.spaces iconSize 18
omarchy bar set cyperx84.spaces groupApps true --json
```

`omarchy bar set` stores the value as a string unless you pass `--json`. Text and numbers work either way, but true/false settings must be set with `--json`, or Spaces ignores the value and keeps the default.

**Editing `~/.config/omarchy/shell.json`.** Settings sit inline on the widget's entry in the bar layout. Only keys that differ from the default need to be there:

```json
{
  "version": 1,
  "bar": {
    "layout": {
      "left": [
        { "id": "omarchy.menu" },
        {
          "id": "cyperx84.spaces",
          "showApps": "all",
          "labelStyle": "key",
          "groupApps": true,
          "persistentWorkspaces": 6,
          "agentChip": "always"
        }
      ],
      "center": [],
      "right": []
    }
  }
}
```

This is an excerpt: keep the rest of your file as it is. If the shell does not pick the edit up, run `omarchy-shell shell reloadConfig`.

A value Spaces does not recognise (an unknown option, a number out of range, a string where it expects `true` or `false`) is not an error. Numbers are rounded and clamped into range, and anything else falls back to the default.

In the panel, choice and slider headings are shown in capitals ("SHOW ICONS ON"). The tables below write them in sentence case. Some controls only appear when another setting allows them; the "Shown when" notes say which.

## App icons

| Setting | Key | Type / values | Default | What it does |
| --- | --- | --- | --- | --- |
| Show app icons | `showIcons` | `true`, `false` | `true` | Master switch for app icons. Off, pills show only their labels, and the other controls on this page and the window controls that depend on icons are hidden. |
| Show icons on | `showApps` | `all` (Always), `active` (Active), `hover` (Active + hover), `hoverOnly` (Hover) | `hover` | Which pills show their icons: every occupied pill, the active pill, the active and hovered pills, or only the hovered pill. Empty workspaces never show icons. Shown when Show app icons is on. |
| Icon style | `iconStyle` | `color` (Color), `mono` (Monochrome) | `color` | Full-colour icons, or icons desaturated to grey. Shown when Show app icons is on. |
| Icon size | `iconSize` | 12 to 24 (px) | `16` | Size of app icons. Icons never grow taller than the pill, so on a thin bar the effective size can be smaller. Shown when Show app icons is on. |
| Max icons per workspace | `maxIcons` | 1 to 20 | `8` | Icons beyond this collapse into a `+N` counter. The focused window is never hidden in the counter. Shown when Show app icons is on. |

## Windows

| Setting | Key | Type / values | Default | What it does |
| --- | --- | --- | --- | --- |
| Group windows by app | `groupApps` | `true`, `false` | `false` | One icon per app with a window count. Clicking a grouped icon that is already focused cycles through its windows. Shown when Show app icons is on. |
| Dim unfocused windows | `dimUnfocused` | `true`, `false` | `true` | On the active workspace, icons of windows other than the focused one are drawn at half opacity. Shown when Show app icons is on. |
| Show focused window title | `focusedTitle` | `true`, `false` | `false` | Shows text next to the focused window's icon: the app's name when it has one window on the workspace, otherwise the window title. Not shown on a vertical bar. Shown when Show app icons is on. |
| Title length | `titleLength` | 8 to 60 (characters) | `24` | Longest focused title before it is cut short with `…`. Shown when Show app icons and Show focused window title are on. |
| Agent status | `agentStatus` | `true`, `false` | `true` | Badges on terminal windows running coding agents, from Herdr and from reporters (the Claude Code hooks, the `report` and `agent` IPC calls). Off turns off every agent feature, including the Herdr feed and the agents chip. With it on, the page also shows a read-only line saying whether the Claude Code hooks are installed. See [agents.md](agents.md). |
| Herdr agents | `herdrAgents` | `true`, `false` | `true` | Runs the Herdr feed: badges the window hosting Herdr, and adds Herdr's agents to the agents chip, the popup and its preview card. Reporter agents do not need it. Shown when Agent status is on. |
| Agents chip | `agentChip` | `auto` (Auto), `always` (Always), `never` (Never) | `auto` | When the agents chip after the pills is shown: while any agent is working or waiting, whenever there is any agent, or never. `never` also keeps the agents popup closed. Shown when Agent status is on. |
| Agent details | `agentDetails` | `true`, `false` | `true` | In the agents popup, the preview card's agent rows and the agents tooltips: what each agent is doing (Herdr's label for its state, or a reporter's activity), how long it has been in that state, and, from Herdr, its model, context, cost and branch. Off shows the pane title (a reporter agent's directory) only. Shown when Agent status is on. See [agents.md](agents.md#agent-details). |
| Agent notifications | `agentNotify` | `off` (Off), `blocked` (Needs input), `all` (Needs input + finished) | `blocked` | A desktop notification when an agent, from Herdr or a reporter, becomes blocked waiting for input, or also when one finishes. Click it to jump to the agent. Shown when Agent status is on. See [agents.md](agents.md#notifications). |
| Mute agent notifications | `agentMute` | `true`, `false` | `false` | Silences agent notifications without changing Agent notifications; the agents chip shows a bell with a slash meanwhile. Also set by `omarchy-shell cyperx84.spaces mute`. Shown when Agent status is on and Agent notifications is not Off. |
| Highlight urgent windows | `urgentHighlight` | `true`, `false` | `true` | Pulses the pill of a workspace whose window asked for attention, and puts a dot on that window's icon, until you focus it. A pill with a waiting agent pulses whatever this is set to. |
| Tooltips | `tooltips` | `true`, `false` | `true` | Tooltips on app icons (window title, agent status), on the settings gear and on the agents chip. The pills' shortcut tooltips have their own setting under Behaviour. |

## Appearance

| Setting | Key | Type / values | Default | What it does |
| --- | --- | --- | --- | --- |
| Active workspace | `activeStyle` | `subtle` (Subtle), `solid` (Solid), `accent` (Accent) | `subtle` | How the active pill is filled: a faint tint of the bar's text colour, a solid fill in the bar's text colour, or your theme's accent colour. |
| Pill background | `pillBackground` | `true`, `false` | `true` | A faint fill behind occupied and hovered pills and the agents chip. The active pill keeps its fill either way. |
| Workspace label | `labelStyle` | `number` (Number), `key` (Key), `both` (Number + key), `glyph` (Glyph), `none` (None) | `both` | What each pill says. `number`: the workspace number (workspace 10 reads `0`). `key`: the key that switches there, or the number if none is bound. `both`: the number with the key as a small caption, left out when it would repeat the number. `glyph`: the active pill shows a glyph, the others their number. `none`: no label. See [key-hints.md](key-hints.md). |
| Density | `density` | `compact` (Compact), `normal` (Normal), `roomy` (Roomy) | `normal` | Spacing between pills, inside them and between icons. |
| Settings button | `settingsButton` | `hover` (On hover), `always` (Always), `never` (Right-click only) | `never` | A gear before the pills that opens the settings panel: shown while the pointer is over the widget, always, or not at all. In `hover` mode the gear's slot is kept, so the pills do not shift. Right-click always opens the panel. |

## Workspaces

| Setting | Key | Type / values | Default | What it does |
| --- | --- | --- | --- | --- |
| Always show workspaces | `persistentWorkspaces` | 0 to 10 | `5` | Workspaces 1 to N always have a pill, even when empty. Other workspaces get a pill while Hyprland keeps them, which normally means while they have windows. The active workspace always has one. |
| Hide empty workspaces | `hideEmpty` | `true`, `false` | `false` | Only workspaces with windows get a pill, including those within "Always show workspaces". The active workspace still has one. |
| Only this monitor's workspaces | `perMonitor` | `true`, `false` | `false` | Each bar only lists workspaces on its own monitor, and treats that monitor's active workspace as the active one. |
| Show scratchpad | `showSpecial` | `true`, `false` | `true` | A pill for each special workspace, such as the scratchpad, after the numbered pills: while it has windows or is shown on this bar's monitor. It shows its windows' icons like any pill, wears the active style while the special workspace is shown, and toggles it when clicked. Hide empty workspaces and Always show workspaces do not apply to it; with Only this monitor's workspaces on, only special workspaces on this monitor are listed. Scrolling skips these pills. |

## Previews

| Setting | Key | Type / values | Default | What it does |
| --- | --- | --- | --- | --- |
| Workspace previews | `previews` | `true`, `false` | `true` | Hovering the pill of another workspace with windows opens a preview card with a miniature of it. |
| Preview size | `previewSize` | `small` (Small), `medium` (Medium), `large` (Large) | `medium` | Longest side of the miniature: 260, 380 or 520 pixels at Omarchy's default spacing scale. The card shrinks to fit the screen if needed. Shown when Workspace previews is on. |
| Live video | `previewLive` | `true`, `false` | `true` | Keep the miniature's windows updating while the card is open. Off shows one still frame, which saves power. Shown when Workspace previews is on. |

## Behaviour

| Setting | Key | Type / values | Default | What it does |
| --- | --- | --- | --- | --- |
| Clicking the active workspace | `activeClick` | `none` (Does nothing), `previous` (Goes back) | `none` | What a click on the active pill does: nothing, or go back to the workspace you were on before. |
| Scroll to switch workspaces | `scrollSwitch` | `true`, `false` | `true` | Scrolling over the widget steps through the numbered workspaces that have a pill, wrapping around at either end; special workspace pills are skipped. A mouse wheel moves one workspace per notch, with a 150 ms pause after each step so a free-spinning wheel does not race through them. A touchpad moves one workspace per swipe: once a swipe has travelled 100 pixels it steps, and the rest of that swipe is ignored until your fingers lift (or pause for 400 ms), however long or slow it is. This relies on the scroll events saying when a swipe begins and ends, which Qt does for touchpads on Wayland; for scroll events that do not, Spaces instead ignores scrolling for 350 ms after each step, so there a slow, long swipe can step more than once. Scrolling down is the next workspace. On a horizontal bar, scrolls that are mostly sideways are ignored; on a vertical bar they count too, with right meaning down. |
| Reverse scroll direction | `reverseScroll` | `true`, `false` | `false` | Scrolling down (or right) goes to the previous workspace instead of the next. Shown when Scroll to switch workspaces is on. |
| Middle-click icon closes window | `middleClickClose` | `true`, `false` | `false` | Middle-clicking an app icon closes that window. |
| Shortcut tooltips | `keyTooltips` | `true`, `false` | `true` | Hovering a pill shows the keys that switch to it and move a window to it, for example "Workspace 1 · SUPER + J to switch · ALT + SHIFT + J to move window here". Pills with no bind have no tooltip. See [key-hints.md](key-hints.md). |
| Animations | `animations` | `true`, `false` | `true` | Sliding, fading and growing animations. Off, everything changes at once. The pulse of urgent pills and the agent badges keep moving either way. |
| Speed | `animationSpeed` | `slow` (Slow), `normal` (Normal), `fast` (Fast) | `normal` | Animation duration: `slow` is 1.6 times the normal length, `fast` 0.55 times. Shown when Animations is on. |

## Command line only

| Setting | Key | Type / values | Default | What it does |
| --- | --- | --- | --- | --- |
| Demo agents (for screenshots) | `demo` | `true`, `false` | `false` | Developer setting, not in the panel; the label is the one in `manifest.json`. Replaces the Herdr feed with scripted fake agents so the badges, the agents chip and the popup can be tried and screenshotted without Herdr. Needs Agent status on; works whether Herdr agents is on or off. While it is on, real agents are not shown. See [agents.md](agents.md#demo-mode). |

```sh
omarchy bar set cyperx84.spaces demo true --json    # on
omarchy bar set cyperx84.spaces demo false --json   # off
```

## The manifest

`manifest.json` in the repository lists every key with its type, range and default as a schema for Omarchy. The [development guide](development.md#adding-a-setting) explains how the manifest, `Model.js` and the panel are kept in step.
