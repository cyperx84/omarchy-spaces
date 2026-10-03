# Troubleshooting

Each entry gives the symptom, the likely cause and the fix. If none of them helps, [open an issue](https://github.com/cyperx84/omarchy-spaces/issues/new/choose) with the shell log attached.

## Reading the shell log

Spaces runs inside the Omarchy shell, a Quickshell instance, so its warnings and errors go to the shell's log:

```sh
qs log -p /usr/share/omarchy/shell
```

Add `-f` to follow it live, or `-t 200` for only the last 200 lines. Lines mentioning `Spaces.qml`, `SpacesSettings.qml` or `Model.js` come from this plugin. Spaces is quiet by design when Herdr is missing, so an empty log is not a sign of trouble.

## The widget does not appear after installing

**Cause:** `omarchy plugin add` installs plugins disabled, so you can read the code before running it.

**Fix:** enable it, in the left section of the bar:

```sh
omarchy plugin enable cyperx84.spaces --section left
```

If the command says the plugin is not known, have the shell look for it again, then enable it:

```sh
omarchy-shell shell rescanPlugins
omarchy plugin enable cyperx84.spaces --section left
```

If it is enabled but still missing, check that `~/.config/omarchy/plugins/cyperx84.spaces/manifest.json` exists, and look for errors in the [shell log](#reading-the-shell-log). `omarchy restart shell` loads every plugin from scratch.

## No agent badges

Work through these in order.

**"Agent status" or "Herdr agents" is off.** Both are under Windows in the settings panel and on by default. "Herdr agents" is only shown while "Agent status" is on.

**Herdr is not running.** Spaces reads agent status from Herdr's socket, `$HERDR_SOCKET_PATH` or `~/.config/herdr/herdr.sock`. If the socket is not there, the feed stops at once without a word. Start Herdr; Spaces notices a new Herdr client within a moment and starts the feed.

**`python3` is missing.** The feed is a Python 3 script. Without `python3` on the shell's `PATH` it never starts, again without a message. Install Python 3 (`sudo pacman -S python` on Arch).

**The feed is backing off.** Each time the feed ends straight away, Spaces waits longer before trying again, up to a minute. Starting a Herdr client in a terminal cuts the wait short. To check whether the feed can read Herdr at all, run it by hand:

```sh
python3 ~/.config/omarchy/plugins/cyperx84.spaces/hooks/herdr-feed --once
```

It should print one line of JSON starting with `{"type":"herdr"`. No output means it could not reach Herdr or Herdr gave an error. An empty `"agents":[]` means Herdr is running but sees no agents: Herdr has to detect the agent in its pane first.

**No window hosts a Herdr client.** The badge goes on the window that runs the `herdr` client. If Herdr's server is running but no terminal is attached to it, there is no window to badge. The agents chip still shows the agents. Attach with `herdr` in a terminal.

**The agent is idle.** Idle and unknown agents get no badge. The agents chip with "Agents chip" set to Always shows them as a plain count.

## The badge is on the wrong window, or on every terminal window

**Several terminals run a Herdr client.** Herdr does not say which client shows which workspace, so every window with a Herdr client gets the combined state of all agents. Close the extra clients, or accept that each one shows the same badge.

**Your terminal serves several windows from one process.** Spaces finds the Herdr window by process, and some terminals run all their windows in one process, for example Ghostty in single-instance mode or `footclient` windows of a `foot --server`. Every one of those windows then looks like the Herdr window. Start the Herdr window as its own process, for example `ghostty --gtk-single-instance=false -e herdr`.

**Demo mode is on.** In demo mode a terminal on workspace 3 or later stands in for the Herdr window. Turn it off with `omarchy bar set cyperx84.spaces demo false --json`.

## Key captions are missing

**The label style does not show keys.** Under Appearance, set "Workspace label" to "Number + key" or "Key".

**The caption would repeat the number.** `SUPER + 3` on workspace 3 shows no caption in "Number + key".

**Your binds use key codes.** Omarchy's stock `SUPER + 1` to `SUPER + 0` binds are made by key code, and Hyprland lists them without a key name, so Spaces cannot show them. Binds by key name, such as `SUPER + J`, work.

**The bind's description does not match.** Lua binds are recognised only by descriptions such as "Switch to workspace 1".

[key-hints.md](key-hints.md#my-keys-do-not-show) has the full checklist and the `hyprctl binds -j | jq` command that shows exactly what Spaces reads.

## Previews are blank or do not open

**Previews are off.** Turn on "Workspace previews" under Previews.

**You are hovering the active workspace.** Hovering only previews other workspaces. `omarchy-shell cyperx84.spaces peek <n>` can show the active one.

**The workspace is empty.** There is nothing to preview, so no card opens.

**The agents popup or the settings panel is open.** Previews wait until they close.

**Windows show as grey boxes.** Each window in the miniature is captured with Wayland screen copy, and shows a grey box until its first frame arrives. A window that never delivers a frame stays grey. If every window stays grey, check the [shell log](#reading-the-shell-log) for screencopy errors. With "Live video" off, the miniature shows a single frame and does not update.

## Icons show a letter tile

**Cause:** Spaces could not find an icon for the window's app ID. It looks up the desktop entry by the app ID, then by the last part of a reverse-DNS ID (`dev.example.my-tool` → `my-tool`), then by a fuzzy match on desktop entries, then Chromium web apps by their URL, and then icon files named after the app under your icon directories and `/usr/share/pixmaps`. When none match, it draws the first letter of the app's name.

**Fix:** find the app ID with `hyprctl clients -j | jq -r '.[].class'`, then make sure a desktop entry with that name exists (for example `~/.local/share/applications/<app-id>.desktop` with an `Icon=` line), or that an icon file with that name is installed in your icon theme. Spaces looks icons up again, and rescans the icon directories, when desktop entries change. A new icon file that no desktop entry points to is found after the next such change or after `omarchy restart shell`.

## Settings do not save

**Cause:** the panel writes to the widget's entry in `~/.config/omarchy/shell.json`. If that file cannot be written, or the widget is not in the bar layout, the change can apply for now and be lost when the shell restarts.

**Fix:** check that `~/.config/omarchy/shell.json` is writable and has a `{ "id": "cyperx84.spaces", ... }` entry under `bar.layout`. Look for errors in the [shell log](#reading-the-shell-log).

**A value set with `omarchy bar set` has no effect.** True/false settings need `--json`, as in `omarchy bar set cyperx84.spaces groupApps true --json`. Without it the value is stored as the text `"true"`, which Spaces ignores. Values out of range are clamped and unknown choices fall back to the default; see [configuration.md](configuration.md).

## Running the feed by hand

The Herdr feed is a plain script, so you can run it in a terminal to see what Spaces reads:

```sh
cd ~/.config/omarchy/plugins/cyperx84.spaces
python3 hooks/herdr-feed --once    # one snapshot, then exit
python3 hooks/herdr-feed           # keep running; one line per change, Ctrl+C to stop
python3 hooks/herdr-feed --demo    # the scripted demo agents, no Herdr needed
```

The script exits quietly, with status 0, on any error, so silence means it could not reach Herdr. To see the underlying error, check that the socket exists with `ls -l "${HERDR_SOCKET_PATH:-$HOME/.config/herdr/herdr.sock}"`, and ask Herdr for the same snapshot the feed reads with `herdr api snapshot`.
