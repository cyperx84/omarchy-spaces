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
| `agent` | session, state, PIDs | nothing |

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

Returns `ok` when it opened or closed the popup. Returns `empty` when the popup is closed and cannot open: the settings panel is open, or the agents chip is not on the bar because Herdr is not running, it lists no agents, "Agents chip" is Never, or, with Auto, no agent is working or waiting.

```sh
omarchy-shell cyperx84.spaces agents
```

### `agent <session> <state> <pids>`

Reports the state of a coding agent that does not run in Herdr, so its terminal window gets a badge. `state` is `working`, `waiting`, `done`, `idle` or `end`, and `pids` is a comma-separated list of the agent's process ID followed by its ancestors. Returns nothing.

```sh
omarchy-shell cyperx84.spaces agent my-run-42 working 31337,31300,1200
omarchy-shell cyperx84.spaces agent my-run-42 end ""
```

The full rules and a worked wrapper script are in [agents.md](agents.md#reporting-agents-outside-herdr).

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
