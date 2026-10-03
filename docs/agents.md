# Agent status

Spaces shows what your coding agents are doing, right in the bar. Its main source is [Herdr](https://herdr.dev), a terminal multiplexer for coding agents that already tracks the state of every agent in its panes. Agents that do not run in Herdr can report in through an IPC call.

The idea of agent badges on terminal windows comes from the original [omarchy-spaces](https://github.com/tornikegomareli/omarchy-spaces) by Tornike Gomareli, which fed them from per-agent hooks. This project reads Herdr instead.

## What the badges mean

The badge sits on the top-right corner of the app icon of the window hosting Herdr.

| Herdr status | Badge | Meaning |
| --- | --- | --- |
| `working` | Spinner | An agent is working |
| `blocked` | Pulsing `!` | An agent is waiting for your input |
| `done` | Check mark | An agent finished, and you have not looked at it yet |
| `idle` | None | Nothing to report |
| `unknown` | None | Herdr cannot tell |

When several agents are running, the badge shows the most urgent state: waiting beats working, and working beats done. When two or more agents are working or waiting, a small number next to the badge says how many.

While an agent is waiting, the pill of the workspace holding the Herdr window pulses too, unless it is the active workspace. This happens even with "Highlight urgent windows" off.

Hover the icon of the Herdr window for a tooltip with the window title and one line per agent, such as `working · Code · fix flaky checkout test`: its Herdr status, its Herdr workspace label and its pane title.

## The agents chip

After the pills, the agents chip sums up every agent Herdr knows about: a terminal glyph, then a count with a badge for each state that has any, most urgent first (waiting, working, done). When every agent is idle, it shows one plain total. The chip pulses while an agent waits. Hover it for a tooltip listing every agent.

When the chip is shown depends on the "Agents chip" setting (`agentChip`):

| Value | Panel label | The chip is shown |
| --- | --- | --- |
| `auto` | Auto | While at least one agent is working or waiting |
| `always` | Always | Whenever Herdr lists at least one agent, even if all are idle |
| `never` | Never | Never. The agents popup cannot be opened either |

## The agents popup

Click the chip, or run `omarchy-shell cyperx84.spaces agents`, to open the agents popup. It lists every agent, newest state change first. Each row shows the agent's badge, its Herdr workspace label and number, its pane title and the agent's name (for example `claude`). The popup scrolls when there are more agents than fit on screen.

Click a row to jump to that agent. Spaces runs `herdr agent focus <pane>`, so Herdr switches to the agent's pane, and focuses the Herdr window in Hyprland, on whichever monitor it is.

The popup closes when you click the chip again, pick a row, open the Spaces settings or open another bar popup, and does not open while the Spaces settings are open. While it is open, preview cards do not open.

## Agent rows on the preview card

The preview card of a workspace that holds the Herdr window gets agent rows below the miniature: up to five agents, newest change first, each with its badge, Herdr workspace and title. Beyond five, a line reads `+N more in Herdr`. Click a row to jump to that agent, as in the popup. Preview cards of other workspaces look as usual.

## Check marks clear when you look

A check mark means an agent finished while you were elsewhere. It clears when the Herdr window is the active window: either you focus it, or the agent finishes while you are already looking at it, in which case no check mark appears at all. A finished agent shows a check mark again the next time it finishes after doing something else.

Looking only clears the badge on the Herdr window. The chip's done count, the popup and the preview card rows follow Herdr's own status, so there a finished agent keeps its check mark until Herdr moves it on.

## How it works

### The feed

`hooks/herdr-feed` is a Python 3 script, standard library only, that Spaces starts in the background while "Agent status" and "Herdr agents" are on.

1. It connects to Herdr's socket at `$HERDR_SOCKET_PATH`, or `~/.config/herdr/herdr.sock` when that is not set.
2. It subscribes to Herdr's pane and workspace events, then asks for a `session.snapshot`.
3. From the snapshot it prints one JSON line listing every pane that runs an agent: pane, workspace label and number, agent name, status, title and Herdr's state-change counter.
4. Each burst of events triggers a fresh snapshot after 0.15 seconds, and snapshots are kept at least one second apart, since a working agent updates its pane about ten times a second.
5. A line is only printed when it differs from the last one.

To see exactly what Spaces reads, run the feed once by hand:

```sh
python3 ~/.config/omarchy/plugins/cyperx84.spaces/hooks/herdr-feed --once
```

It prints one line and exits. If Herdr is not running, it prints nothing.

### When Herdr is not there

Before it starts Python, Spaces checks that Herdr's socket exists and that `python3` is installed. If either is missing, the feed ends at once, without output and without logging an error, and Spaces tries again later. Each retry that ends straight away doubles the wait, from 10 seconds up to a minute. A feed that ran normally and then stopped (Herdr quit) is retried after 5 seconds, and its badges are cleared at once.

When Spaces sees a Herdr client process appear, it starts the feed straight away instead of waiting out the back-off. So starting Herdr shows its agents within a moment.

### Finding the Herdr window

Agents in Herdr run under the Herdr server, which is not inside any terminal window, so the agent processes cannot tell Spaces which window to badge. Instead, Spaces looks for Herdr client processes (`herdr` without the `server` argument) and walks up each one's parent processes until it reaches the process of a Hyprland window. That window hosts Herdr. Usually it is the terminal you started `herdr` in.

This check runs at startup, every 30 seconds, shortly after a window opens or closes, when the active window changes, and when Herdr's list of panes changes.

### More than one Herdr window

Herdr does not say which client shows which workspace. With two terminals each running a Herdr client, Spaces cannot tell which agent belongs to which, so every Herdr window shows the combined state of all agents.

### Terminals that share one process

Some terminals can serve several windows from a single process, for example Ghostty in single-instance mode or `footclient` windows of a `foot --server`. Hyprland then reports the same process for every one of those windows, so Spaces badges all of them. To badge only the Herdr window, run it in a terminal process of its own, for example `ghostty --gtk-single-instance=false -e herdr`.

## Turning it off

- "Herdr agents" off (`herdrAgents`): stops the feed and removes the Herdr badges, the chip, the popup and the preview card rows.
- "Agent status" off (`agentStatus`): turns off every agent feature, including reports from the `agent` IPC call below.
- "Agents chip" set to Never (`agentChip`): keeps the badges, hides the chip and its popup.

## Running without Herdr

Nothing changes when Herdr is not installed or not running: no badges, no chip, no errors, and nothing in the shell log. The feed is retried at most once a minute in the background, and picks Herdr up when you start it.

## Reporting agents outside Herdr

Agents that do not run in Herdr can report their own state with an IPC call:

```sh
omarchy-shell cyperx84.spaces agent <session> <state> <pids>
```

| Argument | Meaning |
| --- | --- |
| `session` | Any string that identifies this agent run. A later call with the same session replaces the earlier state. |
| `state` | `working`, `waiting`, `done` or `idle`, or `end` to forget the session. Anything else is ignored. |
| `pids` | Comma-separated process IDs: the agent's own process first, then its parent, its parent's parent and so on. |

The badge goes on the nearest window among the listed processes, so list enough ancestors to reach the terminal window. The call returns nothing.

Reports are merged with Herdr's: if one window has both, the more urgent state shows. Reported agents get badges on their window, but do not appear in the agents chip, popup or preview card rows, which list Herdr agents only.

Some rules keep stale badges away:

- `done` reported while that window is the active window is stored as `idle`: you saw it finish.
- A `done` badge clears when you focus its window.
- Every 60 seconds Spaces checks the first process of each `working` or `waiting` session. If that process has exited without sending `end`, its badge is removed.

### Example: a wrapper script

This script runs any command and reports it as working, then done:

```bash
#!/usr/bin/env bash
# spaces-report: run a command and show its state in the Spaces bar.
# Usage: spaces-report <command> [args...]

# This shell's PID and every ancestor up to init, nearest first.
ancestry() {
  local pid=$1 chain=$1
  while pid=$(ps -o ppid= -p "$pid" | tr -d ' ') && [ "${pid:-0}" -gt 1 ]; do
    chain+=",$pid"
  done
  echo "$chain"
}

session="spaces-report-$$"
pids=$(ancestry $$)

omarchy-shell -q cyperx84.spaces agent "$session" working "$pids"
"$@"
status=$?
omarchy-shell -q cyperx84.spaces agent "$session" done "$pids"
exit $status
```

Run `spaces-report make test` in a terminal, switch to another workspace, and the terminal's icon spins until the tests finish, then shows a check mark. The first PID is the wrapper's own shell, which lives exactly as long as the command, so a killed wrapper's badge is cleaned up within a minute. `omarchy-shell -q` keeps the script quiet when the shell is not running.

## Demo mode

Demo mode plays scripted fake agents so you can try the badges, the agents chip and the popup, or take screenshots, without Herdr. It is a developer setting and is not in the settings panel:

```sh
omarchy bar set cyperx84.spaces demo true --json
```

Spaces then runs `hooks/herdr-feed --demo` instead of the real feed. It does not touch Herdr's socket and does not need Herdr installed, only `python3`. Four made-up agents (`claude`, `codex`, `opencode` and `claude`, on Herdr workspaces named `api`, `web`, `docs` and `infra`) step through working, blocked, done and idle every two seconds, on a loop that repeats every 20 seconds, so every badge shows at some point and the chip never disappears.

With no Herdr client to find, a terminal window stands in as the Herdr window: the first terminal on workspace 3 or later, or the first terminal anywhere if there is none there. Ghostty, foot, Alacritty, kitty and WezTerm count as terminals. That window gets the badge, the tooltip lines and the preview card rows. Clicking an agent in the popup or on the card only focuses that window, since there is no real pane to switch to.

While demo mode is on, real agents are not shown, from Herdr or from the `agent` IPC call. Demo mode needs "Agent status" on, and works whether "Herdr agents" is on or off.

Turn it off again with:

```sh
omarchy bar set cyperx84.spaces demo false --json
```

You can also watch the script on its own: `python3 hooks/herdr-feed --demo` prints a new line every time an agent changes state, and `python3 hooks/herdr-feed --demo --once` prints the first line and exits.
