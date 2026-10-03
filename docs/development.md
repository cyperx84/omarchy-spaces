# Development

How Spaces is put together, how to work on it, and how to release it.

## Files

| File | What it holds |
| --- | --- |
| `Spaces.qml` | The bar widget: pills (numbered and special workspaces), app icons, the agents chip and popup, the preview card, the settings panel host, the IPC handler, and the processes that read Hyprland's binds, scan icons, run the Herdr feed, probe for Herdr clients and send agent notifications. |
| `Model.js` | Pure logic with no QML objects: settings validation, workspace lists, labels, special workspace pills and their binds, scroll stepping, icon grouping, preview geometry, key bind parsing, agent state merging, reporter agents (`applyReport`, `reporterAgents`, `combineAgents`) and the Herdr feed parsing. Loaded by QML as `.pragma library` and by node in the tests. |
| `SpacesSettings.qml` | The settings form: six pages of toggles, choices and sliders. It only emits `settingChanged(delta)`, `resetRequested()` and `closeRequested()`; `Spaces.qml` saves. |
| `hooks/bind-keys` | Python 3, standard library only. Prints one JSON document with the keymap from `xkbcli` (or a built-in table) and the binds your `hyprland.lua` makes, read with a stubbed, read-only `lua` run, so binds made by key code get their keys. |
| `hooks/herdr-feed` | Python 3, standard library only. Holds Herdr's socket open and prints one JSON line per change. `--once` prints one snapshot; `--demo` plays scripted agents. |
| `hooks/claude-hook` | Python 3, standard library only. Run by Claude Code's hooks: maps the event to a state, walks the parent PIDs and calls the `report` IPC method detached. Always exits 0, prints nothing. |
| `hooks/install-claude-hooks` | Python 3, standard library only. Run by the user, never by the widget: `install`, `remove` and `status` of the hook entries in Claude Code's `settings.json`, with a backup and an atomic write. |
| `manifest.json` | Omarchy plugin manifest: id, version, entry point and the schema of every setting. |
| `tests/model.test.js` | Node tests for `Model.js`, plus a check that window titles in `Spaces.qml` render as plain text. |
| `tests/install-hooks.sh` | Runs `install-claude-hooks` against throwaway `CLAUDE_CONFIG_DIR`s: empty, with Herdr's hook, re-install, remove, dry run, malformed JSON, symlinks, hooks that only mention the path, empty containers, read-only files, NaN, and a file changed while the installer runs. |
| `tests/claude-hook.sh` | Feeds `claude-hook` sample payloads with a stub `omarchy-shell` that records its arguments. |
| `tests/settings.sh`, `tests/settings.test.qml` | Runs the real settings form offscreen in Quickshell and clicks through it. |
| `tests/gear.sh`, `tests/gear.test.qml` | Runs the real widget in a temporary Wayland window to test the settings gear. |

## How data flows

```text
Hyprland ──(Quickshell.Hyprland: workspaces, windows, raw events)──► workspaceMap ──► pills, icons, preview card
hyprctl binds -j ──(at startup, on configreloaded)──┬──► Model.workspaceKeyBinds ──► pill labels, captions, tooltips
hooks/bind-keys ──► Model.bindKeyData ──────────────┴──► Model.specialKeyBinds ──► special pill tooltips
hyprctl monitors -j (at startup) + activespecial events ──► Model.specialShownMap ──► Model.specialWorkspaces ──► special pills
wheel events ──► Model.scrollStep ──► Model.scrollTarget ──► focus a numbered workspace
desktop entries + icon dirs ──► appInfo ──► icon sources, letter tiles

Herdr socket ──► hooks/herdr-feed ──(JSON lines on stdout)──► Model.parseHerdrFeed ──► herdrFeedAgents
                                                                                    ├─► agents chip, popup, preview rows
                                                                                    ├─► Model.agentAlerts ──► notify-send
pgrep herdr + /proc parents ──► Model.parseHerdrClients ──► Herdr window PIDs ──────┤
omarchy-shell ... agent / report ──► Model.applyReport ──► agents ──► Model.agentStates ──┴─► agentByPid ──► badges on icons
  (hooks/claude-hook)                                            └──► Model.reporterAgents ──► Model.combineAgents ──► agentList
                                                                        (with herdrFeedAgents) ──► chip, popup, previews, tooltips, Model.agentAlerts

shell.json entry ──► root.settings ──► Model.resolveSettings ──► cfg ──► everything above
settings panel ──► settingChanged(delta) ──► Model.mergedEntry ──► bar.shell.updateEntryInline ──► shell.json
```

In more detail:

- **Workspaces and windows.** `workspaceMap` is built from `Hyprland.workspaces` and each window's `lastIpcObject` (position, size, floating, PID). Raw Hyprland events such as `openwindow`, `movewindow` and `windowtitle` trigger `Hyprland.refreshToplevels()` after a short debounce, and `revision` is bumped so positions are re-read. `Model.workspaceIds` decides which pills exist, `Model.sortWindows` and `Model.iconItems` decide which icons a pill shows.
- **Special workspaces.** Quickshell lists special workspaces (negative ids, names like `special:scratchpad`) with the others, so `workspaceMap` keeps them, keyed by their negative id, while "Show scratchpad" is on; `Model.workspaceIds` ignores them. Quickshell does not say which special workspace a monitor shows, and `Hyprland.refreshMonitors()` leaves `lastIpcObject` empty on Hyprland 0.56, so a `Process` reads `hyprctl monitors -j` once at startup (`Model.monitorSpecials`) and the `activespecial` and `activespecialv2` raw events update it (`Model.parseActiveSpecial`, `Model.specialShownMap`). `Model.specialWorkspaces` picks the special pills, which follow the numbered ones in the same `Repeater` (`pillIds`). Clicking one runs `Model.specialToggleDispatch`, a Lua `toggle_special` call with the name escaped by `Model.luaString`, through `Util.shellQuote`.
- **Scrolling.** Every `onWheel` calls `scrollBy(wheel)`. `Model.scrollStep` turns the event's `angleDelta`, `pixelDelta` and `phase` and the previous state into at most one step (touchpad accumulation, one step per phased gesture, wheel notches, cooldowns, axis and direction), and `Model.scrollTarget` picks the numbered workspace, starting from the last numbered one while the current workspace is not numbered.
- **Key binds.** Two `Process`es run at startup and 500 ms after each `configreloaded` event, each only if it is not already running: `hyprctl binds -j`, and `hooks/bind-keys` (through `bash`, so nothing starts without `python3`). `Model.bindKeyData` checks the helper's output, and `Model.workspaceKeyBinds` fills in the keys `hyprctl` leaves out from it and turns the list into `{ workspace: { switch, move } }`, which feeds `Model.workspaceLabel`, `Model.workspaceCaption` and `Model.keyTooltip`. Either result arriving recomputes the keys.
- **Herdr.** The feed runs through a `bash` launcher that exits at once when Herdr's socket or `python3` is missing, so a machine without Herdr never starts Python. Quick silent exits back off with `Model.herdrRetryDelay`. A second process lists `herdr` client processes and their ancestors from `/proc`, and `Model.parseHerdrClients` matches them to window PIDs. `Model.herdrSummary` rolls the agents up into one state for the Herdr window, and `Model.agentChipSummary` counts them for the chip.
- **Agent details and notifications.** The feed adds each agent's `activity`, `tokens`, `cwd` and `since`; `Model.agentElapsed`, `Model.agentTokenText` and `Model.agentDetailText` turn them into row text, and one 30 second timer moves the times on while a list or tooltip shows them. Each feed line also goes through `Model.agentAlerts`, which compares it with the previous line and applies the suppression rules; the alerts wait out a three-second gap, are rechecked by `Model.pendingAlerts`, worded by `Model.agentNotification` and sent with `notify-send` (`Model.notifyArgs`), by the first bar only.
- **Reporter agents.** The `agent` and `report` IPC methods go through `Model.applyReport` into `{ session: { state, pids, at, since, rich, agent, title, cwd, activity } }`, every text made plain and capped, older reports dropped by their time. `Model.agentStates` gives each one to the nearest window in its PID chain for the badges, and `Model.mergeAgentStates` merges that with the Herdr states, most urgent first. `Model.reporterAgents` turns the map into rows in the feed's agent shape (`pane_id` `ipc:<session>`, `source: "ipc"`, `waiting` as `blocked`), and `Model.combineAgents` merges them with Herdr's into `agentList`, newest first, dropping a reporter session that Herdr also lists. `agentList` feeds the chip, popup, preview rows, tooltips and notifications; each change of either source calls `noteAgentAlerts` with the whole list. Clicking a reporter agent focuses its window (`Model.agentFocusTarget`), never Herdr. A 60 second timer drops sessions the probe cannot check after 30 minutes (`Model.expireReports`), then probes: live claims, and `report` sessions in any state, whose process has died are dropped. The map is capped at 64 sessions, and `agentsEnded` (`Model.endedSessions`) remembers ended sessions for ten minutes so late reports cannot revive them. `hooks/claude-hook` is the reporter for Claude Code; `hooks/install-claude-hooks` puts it into Claude Code's settings when the user runs it.
- **Settings.** The bar injects the widget's `shell.json` entry as `settings`. `cfg` is always `Model.resolveSettings(settings)`, a complete, validated object, so QML never reads a raw value.

## Conventions

- **Pure logic lives in `Model.js`, with a node test.** If a function can be written without QML objects, it goes in `Model.js` and gets a test in `tests/model.test.js`. QML only wires results to items.
- **Every setting is in four places**, kept in step:
  1. a default in `DEFAULTS` in `Model.js`,
  2. validation in `resolveSettings` in `Model.js` (`bool`, `oneOf` or `clampInt`),
  3. a schema entry in `manifest.json` with the same default, type and range,
  4. a control in `SpacesSettings.qml`, or, for a developer setting such as `demo`, a deliberate absence documented in [configuration.md](configuration.md).

  CI checks that every `DEFAULTS` key has a schema entry with the same default.
- **Text from other programs is plain text.** Window titles, Herdr labels and titles, and agent names are rendered with `textFormat: Text.PlainText`, so markup in a title can never be interpreted. A node test checks the window-title cases.
- **Shell commands built from data go through `Util.shellQuote`.** Window addresses, Herdr pane IDs and anything else that came from outside are quoted before they reach `bash`.
- **Animations use `root.dur` and `root.fastDur`**, and every `Behavior` is `enabled: root.dur > 0` (or `fastDur`), so turning animations off really turns them off.
- **No Herdr must mean nothing shown from Herdr.** Every Herdr feature degrades to silence: no Herdr badges, no log spam, never a broken bar. Reporter agents still show, and with neither source there is no chip at all.
- **Never change user config without consent.** The widget only reads Claude Code's settings (the status line); `hooks/install-claude-hooks` is run by the user. Its tests use a throwaway `CLAUDE_CONFIG_DIR`, never `~/.claude`.

## Development install

Work from a clone, linked into Omarchy's plugin directory. If you installed Spaces with `omarchy plugin add`, remove it first so the link can take its place.

```sh
git clone https://github.com/cyperx84/omarchy-spaces.git
cd omarchy-spaces
omarchy plugin remove cyperx84.spaces     # only if it was installed from git
ln -sfn "$PWD" ~/.config/omarchy/plugins/cyperx84.spaces
omarchy-shell shell rescanPlugins
omarchy plugin enable cyperx84.spaces --section left
```

The shell reloads plugin code when files under `~/.config/omarchy/plugins/` change. If an edit does not show, force a reload with `omarchy-shell shell rescanPlugins`, or start the shell fresh with `omarchy restart shell`. Watch the log while you work:

```sh
qs log -f -p /usr/share/omarchy/shell
```

## Running the tests

The node tests, the Python syntax check and the hook tests run anywhere with bash and python3; CI runs them on every push and pull request.

```sh
node tests/model.test.js
python3 -m py_compile hooks/herdr-feed hooks/bind-keys hooks/claude-hook hooks/install-claude-hooks
bash tests/install-hooks.sh   # installer, in mktemp -d config dirs
bash tests/claude-hook.sh     # hook, with a stub omarchy-shell
```

`py_compile` writes a cache to `hooks/__pycache__/`; delete it afterwards if you like.

The QML tests need Omarchy's shell components (from `$OMARCHY_PATH/shell`, default `/usr/share/omarchy/shell`) and Quickshell's `qs`, so they run on an Omarchy machine only:

```sh
bash tests/settings.sh   # settings form, offscreen, stops after 15 seconds
bash tests/gear.sh       # opens a temporary window on your desktop for up to 15 seconds
```

`tests/settings.sh` prints `All settings assertions completed` and `Interaction checks passed` when it passes. `tests/gear.sh` prints a line starting with `PASS:`. Neither changes your saved settings.

## Trying the agent features without Herdr

Turn on demo mode to get four scripted agents cycling through every status:

```sh
omarchy bar set cyperx84.spaces demo true --json
```

A terminal window on workspace 3 or later stands in for the Herdr window. Turn it off with `demo false --json`. [agents.md](agents.md#demo-mode) describes the script, and `python3 hooks/herdr-feed --demo` prints its lines to your terminal.

## Adding a setting

Say you want a `compactChip` setting that hides the chip's terminal glyph.

1. **Default.** Add `compactChip: false` to `DEFAULTS` in `Model.js`, with a short comment.
2. **Validation.** Add `compactChip: bool(s.compactChip, d.compactChip)` to `resolveSettings`. Use `oneOf(value, LIST, default)` for a choice, with the allowed values in a `var` list beside the others, and `clampInt(value, min, max, default)` for a number.
3. **Test.** Add a test to `tests/model.test.js` that the default resolves, a valid value is kept, and an invalid one falls back.
4. **Manifest.** Add a schema entry to `manifest.json` with the same key, `type` (`bool`, `enum` with `options`, or `int` with `min` and `max`), a `label` and the same `default`.
5. **Panel.** Add a `ToggleSetting`, `ChoiceSetting` or `SliderSetting` to the right page of `SpacesSettings.qml`. Use `visible:` if it only makes sense while another setting is on. If the settings test walks that page, extend `tests/settings.test.qml`.
6. **Use it.** Read `root.cfg.compactChip` in `Spaces.qml`. Never read `root.settings` directly.
7. **Document it.** Add a row to [configuration.md](configuration.md), in the same page and position as the panel.
8. **Check.** Run `node tests/model.test.js` and `bash tests/settings.sh`, then try it in the bar.

## Releasing

Users install from the default branch and `omarchy plugin update` fast-forwards to its tip, so whatever is on `main` is what people get.

1. Make sure CI is green and the QML tests pass locally.
2. Bump `version` in `manifest.json`, following semantic versioning: a new setting or feature is a minor release, a fix is a patch release.
3. Add an entry at the top of [CHANGELOG.md](../CHANGELOG.md) with the same version, written for users: what changed for them, not commit subjects.
4. Commit both, tag the commit `vX.Y.Z`, and push the branch and the tag.
5. If the bar looks different, update the images in `.github/assets/` (and `preview.png`, the marketplace image) in the same release.
