# Scripting

Spaces registers the IPC target `cyperx84.spaces` in the Omarchy shell. Call it with `omarchy-shell`, from a terminal, a script or a Hyprland key binding:

```sh
omarchy-shell cyperx84.spaces <method> [arguments...]
```

`omarchy-shell` prints whatever the method returns. Methods that return nothing print nothing. Add `-q` (`omarchy-shell -q cyperx84.spaces ...`) to stay silent and exit successfully even when the shell is not running, which suits scripts.

## Methods

| Method | Arguments | Returns |
| --- | --- | --- |
| `open` | none | nothing |
| `close` | none | nothing |
| `show` | none | nothing |
| `hide` | none | nothing |
| `toggle` | none | nothing |
| `peek` | workspace number | `ok` or `empty` |
| `agents` | none | `ok` or `empty` |
| `report` | session, state, PIDs, agent, title, cwd, activity, time | `ok` or `ignored` |
| `agent` | session, state, PIDs | nothing |
| `mute` | none | `muted` or `unmuted` |
| `setMute` | `on` or `off` | `muted` or `unmuted` |

### `open`, `close`, `show`, `hide`, `toggle`

Open, close or toggle the Spaces settings panel. `show` is the same as `open`, and `hide` the same as `close`.

```sh
omarchy-shell cyperx84.spaces toggle
```

### `peek <workspace>`

Opens the preview card for a workspace without hovering it, as if the pointer were on its pill. The card closes by itself after 2.5 seconds, unless you move the pointer onto it, in which case it stays until the pointer leaves.

Returns `ok` when the card opens, and `empty` when it cannot: the workspace has no pill on the bar or no windows, "Workspace previews" is off, or the settings panel or the agents popup is open. Unlike hovering, `peek` also works for the active workspace.

```sh
omarchy-shell cyperx84.spaces peek 3
```

### `agents`

Opens or closes the agents popup, as a click on the agents chip does. See [agents.md](agents.md#the-agents-popup).

Returns `ok` when it opened or closed the popup. Returns `empty` when the popup is closed and cannot open: the settings panel is open, or the agents chip is not on the bar because there are no agents (from Herdr or from reporters), "Agent status" is off, "Agents chip" is Never, or, with Auto, no agent is working or waiting.

```sh
omarchy-shell cyperx84.spaces agents
```

### `report <session> <state> <pids> <agent> <title> <cwd> <activity> <time>`

Reports a coding agent that does not run in Herdr, with enough detail for a row in the agents chip, popup and preview card, and for notifications. `hooks/claude-hook` uses it for Claude Code. All eight arguments are required, in this order; pass `""` for any you do not have.

| Argument | Value | Limit |
| --- | --- | --- |
| `session` | Identifies the agent run; a later call with the same session replaces the earlier one | 1 to 128 characters, no control characters, not `__proto__`, `constructor` or `prototype`, else the call is ignored |
| `state` | `working`, `waiting`, `done`, `idle`; `settle` to turn a working or waiting session idle and leave a done or idle one as it is; or `end` to forget the session | anything else is ignored |
| `pids` | The agent's process ID, then its parent's, and so on, comma-separated | 64 PIDs |
| `agent` | The agent's name, such as `claude` | 32 characters |
| `title` | The row's label; `""` keeps the previous one or uses the directory's name | 120 characters |
| `cwd` | The agent's working directory | 512 characters |
| `activity` | What it is doing now | 160 characters |
| `time` | When the report was made, in unix milliseconds; `""` for now. Older than the session's last report: ignored | |

All text is untrusted: control characters become spaces, longer text is cut, and it is only ever shown as plain text. Returns `ok` when the session and state are valid (the report may still be dropped as older than the last one, or as made before the session's `end`), and `ignored` otherwise. The session's first PID is checked once a minute; when it has exited, the session is removed, whatever its state. A session reported without any PID is removed 30 minutes after its last report, at most 64 sessions are kept (a new one pushes out the one with the oldest report), and after `end` a report made at or before it is ignored for ten minutes.

```sh
omarchy-shell cyperx84.spaces report my-run-42 working 31337,31300,1200 mytool "api tests" "$PWD" "running pytest" ""
omarchy-shell cyperx84.spaces report my-run-42 end "" "" "" "" "" ""
```

### `agent <session> <state> <pids>`

The older, shorter form of `report`: the same `session`, `state` (including `settle`) and `pids`, no details, and it returns nothing. Its sessions get a badge and a row (an idle one gets no row), and only `working` and `waiting` ones are checked against their first process, so a wrapper script can report `done` as it exits; a `done` or `idle` one is removed 30 minutes after its last report.

```sh
omarchy-shell cyperx84.spaces agent my-run-42 working 31337,31300,1200
omarchy-shell cyperx84.spaces agent my-run-42 end ""
```

The full rules and a worked wrapper script are in [agents.md](agents.md#reporting-agents-from-your-own-scripts).

### `mute`

Mutes or unmutes agent notifications, the same as the "Mute agent notifications" toggle in the panel, and returns the new state: `muted` or `unmuted`. The state is saved as the `agentMute` setting, so it lasts across restarts. While muted, the agents chip shows a bell with a slash. See [agents.md](agents.md#notifications).

```sh
omarchy-shell cyperx84.spaces mute
```

### `setMute <on|off>`

Sets the mute state instead of toggling it, for scripts that need a known result. `on`, `true`, `yes` and `1` mute; `off`, `false`, `no` and `0` unmute. Returns the state afterwards, `muted` or `unmuted`; any other argument changes nothing and returns the current state. (Quickshell IPC arguments are never optional, which is why this is a method of its own.)

```sh
omarchy-shell cyperx84.spaces setMute on
omarchy-shell cyperx84.spaces setMute off
```

## Key bindings

Omarchy 4 reads personal binds from `~/.config/hypr/bindings.lua`, in the form `o.bind(keys, description, command)`. Pick keys that are free on your system; `hyprctl binds -j` lists the ones in use.

Settings panel:

```lua
o.bind("SUPER + CTRL + ALT + S", "Spaces settings", "omarchy-shell cyperx84.spaces toggle")
```

Agents popup:

```lua
o.bind("SUPER + CTRL + ALT + A", "Spaces agents", "omarchy-shell cyperx84.spaces agents")
```

Mute or unmute agent notifications (the agents chip shows a bell with a slash while muted):

```lua
o.bind("SUPER + CTRL + ALT + M", "Spaces mute agents", "omarchy-shell cyperx84.spaces mute")
```

Peek at workspaces 1 to 5:

```lua
for n = 1, 5 do
  o.bind("SUPER + CTRL + ALT + " .. n, "Peek at workspace " .. n, "omarchy-shell cyperx84.spaces peek " .. n)
end
```

Keep the descriptions as they are. A description reading "Switch to workspace N" would make Spaces show that key as the workspace's own key; see [key-hints.md](key-hints.md#how-binds-are-detected).

Hyprland reloads its config when you save the file. If a new bind does nothing, run `hyprctl reload`.

## Changing settings from a script

`omarchy bar set` writes a setting to the widget's entry in `~/.config/omarchy/shell.json`, and the bar applies it at once:

```sh
omarchy bar set cyperx84.spaces labelStyle key
omarchy bar set cyperx84.spaces previewSize large
omarchy bar set cyperx84.spaces persistentWorkspaces 6
omarchy bar set cyperx84.spaces groupApps true --json
omarchy bar set cyperx84.spaces previewLive false --json
```

Without `--json`, the value is stored as text. That is fine for choices and numbers, but true/false settings need `--json`, or Spaces ignores the value and uses the default. Every key and value is listed in [configuration.md](configuration.md).

Move the widget within the bar with `omarchy bar move`:

```sh
omarchy bar move cyperx84.spaces --section left --index 0
```
