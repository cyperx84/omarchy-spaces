# Agent status

Spaces shows what your coding agents are doing, right in the bar: a badge on the terminal window, an agents chip that counts them, a popup that lists them, rows on the preview card and desktop notifications when one needs you.

The idea of agent badges on terminal windows comes from the original [omarchy-spaces](https://github.com/tornikegomareli/omarchy-spaces) by Tornike Gomareli, which fed them from per-agent hooks.

## Where agents come from

Spaces has two sources, and shows both in one list:

- **Herdr.** [Herdr](https://herdr.dev) is a terminal multiplexer for coding agents that already tracks the state of every agent in its panes. Spaces reads it through `hooks/herdr-feed`; see [How the Herdr feed works](#how-the-herdr-feed-works). Nothing to set up beyond running Herdr.
- **Reporters.** Anything can report an agent's state through the `report` or `agent` IPC call. Spaces ships one reporter, `hooks/claude-hook`, for Claude Code run straight in a terminal, without Herdr. It needs a one-time, manual install into Claude Code's settings: see [Claude Code without Herdr](#claude-code-without-herdr). Your own scripts can report too: see [Reporting agents from your own scripts](#reporting-agents-from-your-own-scripts).

Agents from both sources share the chip, the popup, preview rows, tooltips and notifications, sorted newest state change first. Herdr is optional: with only reporter agents, everything except Herdr's own extras (usage, Herdr workspaces, jumping to a Herdr pane) works the same.

**Each session shows once.** If Herdr and a reporter both report the same Claude Code session (Herdr's session id for the pane equals the reporter's session id), Spaces shows only Herdr's entry. In practice `hooks/claude-hook` stays quiet inside Herdr anyway, so this only matters for reporters of your own.

## Claude Code without Herdr

If you run Claude Code in a plain terminal, without Herdr, install its hooks once:

```sh
~/.config/omarchy/plugins/cyperx84.spaces/hooks/install-claude-hooks install
```

Spaces never does this by itself: it is your Claude Code configuration, so you run the installer. Check what it would do first with `--dry-run`, see where things stand with `status`, and take the hooks out again with `remove`:

```sh
~/.config/omarchy/plugins/cyperx84.spaces/hooks/install-claude-hooks install --dry-run
~/.config/omarchy/plugins/cyperx84.spaces/hooks/install-claude-hooks status
~/.config/omarchy/plugins/cyperx84.spaces/hooks/install-claude-hooks remove
```

Run `remove` before you remove the Spaces plugin, or Claude Code keeps calling a hook that no longer exists. With "Agent status" on, the Windows page of the Spaces settings shows a read-only line saying whether the hooks are installed, and the command to run when they are not.

### What the installer changes

It edits one file, `settings.json` in Claude Code's config directory: `$CLAUDE_CONFIG_DIR/settings.json`, or `~/.claude/settings.json` when that is not set. It needs `python3`.

- **install** adds one hook group to each of nine events, all running the same script from the installed plugin, so `omarchy plugin update` keeps it current. For a home of `/home/you`, it adds:

  ```json
  {
    "hooks": {
      "SessionStart":       [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "UserPromptSubmit":   [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "PostToolUse":        [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "PostToolUseFailure": [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "PermissionRequest":  [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "Notification":       [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "Stop":               [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "StopFailure":        [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }],
      "SessionEnd":         [{ "hooks": [{ "type": "command", "command": "/home/you/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook", "async": true }] }]
    }
  }
  ```

  The groups are appended after any hooks already there for those events. Every other hook and setting stays exactly as it was, including Herdr's own Claude Code hooks. `"async": true` means Claude Code starts the hook and carries on without waiting for it. Running `install` again changes nothing; on a partial or outdated install it replaces its own entries.
- **remove** deletes exactly the hooks whose command runs the hook: the command's first word is `~/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook`, or the same path under another home (a moved or renamed home). A hook of your own that only mentions that path, in a comment or as an argument, is never touched by `install` or `remove`. An event list that the removal leaves empty is deleted; lists that were already empty, and the `"hooks"` object itself, stay. So the file reads as it did before `install`, except that a file that had no `"hooks"` at all keeps an empty `"hooks": {}`.
- **Before any change** it copies the file to `settings.json.spaces-backup-<date>-<time>` next to it, then writes the new file atomically: a temporary file in the same directory, renamed over the old one. A `settings.json` that is a symlink, say into your dotfiles, stays a symlink and its target is updated. The file keeps its permissions.
- **It refuses**, exits with status 2 and changes nothing (no backup either) when the file is not valid JSON (including `NaN`, `Infinity` and numbers too large to read, which Python would otherwise write back as invalid JSON), its `"hooks"` is not an object of lists, the file is not writable (a read-only `settings.json` is never replaced), or the file changes between being read and being replaced, for example because Claude Code saved it meanwhile. Run it again in that case.
- It prints what it is going to change and what it changed. `--dry-run` prints the plan and writes nothing.
- **status** says `installed`, `partial` (some events missing or with a different command; `install` repairs it) or `not installed`, and whether Claude Code also has Herdr hooks and a `herdr` command.

New Claude Code sessions pick the hooks up; restart sessions that were already running.

### What you see

Once installed, every Claude Code session in a terminal shows up as soon as it starts:

- Its terminal window's icon gets the [badge](#what-the-badges-mean): a spinner while Claude works, a pulsing `!` when it asks for permission or input, a check mark when it finishes and you are elsewhere.
- The agents chip counts it, and the popup lists it with the session's name (set with `claude --name` or `/rename`) or, without one, its directory's name, the Hyprland workspace of its window, what it is doing (`permission: Bash`, `tool: Edit`, or Claude Code's notification text) or else its directory, and `claude` at the right.
- The preview card of the workspace holding its terminal lists it.
- With notifications on, `app needs input` arrives when it asks for permission, unless its terminal is the active window.
- Click its row, or its notification, and Spaces focuses its terminal window. No Herdr command runs.

### Which Claude Code event means what

`hooks/claude-hook` maps [Claude Code's hook events](https://code.claude.com/docs/en/hooks) to states:

| Event | State | Activity shown |
| --- | --- | --- |
| `SessionStart` | idle (the session appears) | none |
| `UserPromptSubmit` | working | none |
| `PostToolUse` | working | `tool: <tool name>` |
| `PostToolUseFailure` | working | `tool failed: <tool name>` |
| `PermissionRequest` | waiting | `permission: <tool name>` |
| `Notification` of type `permission_prompt`, `elicitation_dialog`, `elicitation_url_dialog` or `agent_needs_input` (or no type) | waiting | the notification's message |
| `Notification` of type `idle_prompt` | settle: working or waiting becomes idle; done and idle stay as they are | none |
| `Stop` | done | none |
| `StopFailure` (the turn ended on an API error) | done | `stopped: API error` |
| `SessionEnd` | the session is removed | |

Claude Code sends `idle_prompt` about 60 seconds after Claude finishes responding, if you have not typed since. Spaces reads it as "nothing is happening any more": it ends a spinner or `!` that no `Stop` ended (see [Limits](#limits)), and leaves a finished session's check mark alone, so it never turns into "needs input". Other events and notification types, such as `auth_success`, are ignored.

For each event the script reads the hook's JSON from stdin, collects its parent processes from `/proc` (dropping the shell Claude Code ran it in, so the first one is Claude Code itself), and runs `omarchy-shell -q cyperx84.spaces report ...` in the background under `timeout 10`, then exits. It always exits 0 and never prints anything on stdout, since Claude Code reads hook output as context or instructions. It does nothing at all when `omarchy-shell` is not installed, inside Herdr (`HERDR_ENV=1`: Herdr reports those sessions itself), or in a remote Claude Code session (`CLAUDE_CODE_REMOTE=true`). The title is the session's name when Claude Code gives one (only `SessionStart` carries it; Spaces keeps it for the session's later reports), else the name of the working directory.

### Limits

- **Interrupting Claude.** Claude Code runs no `Stop` hook when you interrupt it with `Esc` or by rejecting a permission prompt, so the spinner or `!` (and an open "needs input" notification) stays until the next event. That is `idle_prompt`, which Claude Code sends about 60 seconds later only while you have not typed and, in a terminal, only when you seem to be away from it; then the session turns idle and the notification closes. If you type a new prompt first, the session simply goes on working.
- **Waiting lasts until the tool finishes.** Claude Code has no event for "permission granted", so after you approve a tool the badge stays `!` until that tool finishes (`PostToolUse`), then turns into a spinner.
- **Subagents** run inside the main session and share its session id: their tool use keeps the session working, their permission prompts make it wait, and they get no rows of their own.
- **tmux, zellij, screen and similar.** The hook finds the window by walking up its parent processes. Inside a multiplexer, Claude Code runs under the multiplexer's server, which is not a child of any terminal window, so the walk never reaches one. The session is still listed in the chip and the popup, without a workspace number, and still notifies, but there is no badge, clicking its row does nothing, and its notifications are sent even while you are looking at it. Herdr is the exception: it reports its own panes, and the hook stays out of its way.
- **Terminals that share one process**, such as Ghostty in single-instance mode or `footclient` windows of one `foot --server`: every window of that process gets the badge, and clicking a row focuses the first of them. See [Terminals that share one process](#terminals-that-share-one-process).
- **Order.** Hooks run in the background, so two reports can arrive in a different order than they were made. Each report carries the time it was made, and an older one never overwrites a newer one. An ended session is remembered for ten minutes, so a report made before its `SessionEnd` that arrives after it does not bring the session back.
- **A killed Claude Code** sends no `SessionEnd`. Spaces checks every reported session's Claude Code process once a minute and removes the session when it has exited, so a stale row or badge lasts at most about a minute.

## What the badges mean

The badge sits on the top-right corner of the app icon of the window hosting the agent: the terminal running Herdr for Herdr's agents, and the terminal a reporter's process runs in for reporter agents.

| Herdr status | Reporter state | Badge | Meaning |
| --- | --- | --- | --- |
| `working` | `working` | Spinner | An agent is working |
| `blocked` | `waiting` | Pulsing `!` | An agent is waiting for your input |
| `done` | `done` | Check mark | An agent finished, and you have not looked at it yet |
| `idle` | `idle` | None | Nothing to report |
| `unknown` | | None | Herdr cannot tell |

Rows and tooltips use Herdr's words for both sources, so a reporter's `waiting` reads `blocked` there.

When several agents share a window, the badge shows the most urgent state: waiting beats working, and working beats done. When two or more of them are working or waiting, a small number next to the badge says how many.

While an agent is waiting, the pill of the workspace holding its window pulses too, unless it is the active workspace. This happens even with "Highlight urgent windows" off.

Hover the icon of a window with agents for a tooltip with the window title and one line per agent, such as `working 4m · Code · fix flaky checkout test`: its status and how long it has been in it, its label (Herdr workspace label, or a reporter agent's title) and its title (Herdr's pane title, or a reporter agent's directory). The time is left out with "Agent details" off.

## The agents chip

After the pills, the agents chip sums up every agent: a terminal glyph, then a count with a badge for each state that has any, most urgent first (waiting, working, done). When every agent is idle, it shows one plain total. The chip pulses while an agent waits, and shows a bell with a slash while [notifications are muted](#muting). Hover it for a tooltip listing every agent. It works with Herdr off or not installed, as long as a reporter has agents.

When the chip is shown depends on the "Agents chip" setting (`agentChip`):

| Value | Panel label | The chip is shown |
| --- | --- | --- |
| `auto` | Auto | While at least one agent is working or waiting |
| `always` | Always | Whenever there is at least one agent, even if all are idle |
| `never` | Never | Never. The agents popup cannot be opened either |

## The agents popup

Click the chip, or run `omarchy-shell cyperx84.spaces agents`, to open the agents popup, titled "Agents". It lists every agent, newest state change first. Each row shows the agent's badge, its label and a number, what it is doing and the agent's name (for example `claude`), and, with "Agent details" on, how long it has been in its state and its usage; see [Agent details](#agent-details). For a Herdr agent the label and number are its Herdr workspace's; for a reporter agent they are its title and the Hyprland workspace of its window (no number when its window was not found). The popup scrolls when there are more agents than fit on screen.

Click a row to jump to that agent:

- **A Herdr agent:** Spaces runs `herdr agent focus <pane>`, so Herdr switches to the agent's pane, and focuses the Herdr window in Hyprland, on whichever monitor it is.
- **A reporter agent:** Spaces focuses the window its process runs in, on whichever monitor it is: the nearest window among the reported processes. No Herdr command runs. When that window is gone, the click only closes the popup.

The popup closes when you click the chip again, pick a row, open the Spaces settings or open another bar popup, and does not open while the Spaces settings are open. While it is open, preview cards do not open.

## Agent rows on the preview card

The preview card of a workspace that holds an agent's window gets agent rows below the miniature: every Herdr agent when the workspace holds the Herdr window, and each reporter agent whose window is there. Up to five rows, newest change first, each with its badge, label and what it is doing, and, with "Agent details" on, its state, time in state and usage dimmed at the right. Beyond five, a line reads `+N more`. Click a row to jump to that agent, as in the popup. Preview cards of other workspaces look as usual.

## Agent details

With "Agent details" on (`agentDetails`, the default), the agents popup, the preview card rows and the tooltips show more of what Herdr knows about each agent. A popup row reads:

```text
docs 3  blocked 4m                                  claude
permission: Bash
opus · 36% · $4.01 · main
```

- **State and time in it**, after the workspace: Herdr's status and how long the agent has been in it, as `42s`, `4m`, `1h 12m` or `2d 3h`.
- **Activity**, on the second line: Herdr's own label for what the agent is doing in its current state, such as `running: npm test` or `permission: Bash`. When Herdr has no label for the state, or the agent is idle (Herdr's idle label is a bare word such as `done`), the pane title shows instead, as it does with details off.
- **Usage**, on the third line: the model, context, cost and branch Herdr reports for the pane, in that order. These come from the pane's tokens in Herdr, which agent integrations fill in; Spaces shows only these four and leaves out other keys. Without any of them the line is left out. Reporter agents have no usage.

For a reporter agent, the activity is the one it sent with its last report (see [the event table](#which-claude-code-event-means-what) for Claude Code), and without one the second line shows its working directory, with your home shortened to `~`. Its time in state counts from the report that changed its state.

On the preview card the same details fit on one line: the activity, then the state, time and usage dimmed at the right. Long text is cut short with `…`; the popup keeps its width.

Herdr does not say when an agent entered its state, so the feed notes the moment it first sees each agent in its current state. After the feed starts again, for example when Herdr or the shell restarts, times count from then. Times move on every 30 seconds while the popup, a preview card with agent rows or an agents tooltip is open, and not otherwise.

With "Agent details" off, rows show the pane title only, as before 2.2, and tooltips leave out the time.

## Notifications

Spaces can send a desktop notification when an agent needs you. "Agent notifications" (`agentNotify`) chooses when:

| Value | Panel label | A notification is sent when |
| --- | --- | --- |
| `off` | Off | Never |
| `blocked` | Needs input | An agent becomes blocked, waiting for your input. The default |
| `all` | Needs input + finished | An agent becomes blocked, or finishes (`done`) |

Agents from Herdr and from reporters notify alike. A notification names the agent by its label (a Herdr workspace label, or a reporter agent's title), or by the agent's name when there is none: `docs needs input` or `api finished`. The body is the agent's activity, or its pane title. Notifications come from the app "Spaces"; "needs input" ones are sent with critical urgency, which Omarchy keeps on screen until you dismiss them, and "finished" ones with normal urgency.

Click a notification to jump to its agent, exactly as clicking its row in the popup does. To make that work, Spaces keeps `notify-send` running for each notification, at most three at a time and each for at most ten minutes. While it runs, the notification closes itself once none of its agents is in the state it announced any more, so a "needs input" notification goes away when you answer the agent. An agent that disappears (its Herdr pane closes, Herdr itself goes away, or its reporter session ends or dies) counts as answered. A notification sent while three are already waiting, or still on screen after ten minutes, is on its own: clicking it only dismisses it, and it does not close itself; dismiss it yourself.

### When Spaces stays quiet

- **You are looking at it.** No notification for the agent whose pane is focused in Herdr while the Herdr window is the active window, or for a reporter agent whose own window is the active window.
- **Spaces just started.** The first snapshot after the Herdr feed starts or restarts only records each Herdr agent's state, so agents that were already blocked when the shell started do not set off a burst of old alerts. Reporter agents are not affected by the feed restarting: one that becomes blocked notifies whenever it happens. After a shell restart, Spaces knows no reporter agents until they next report.
- **Once per state.** An agent alerts once each time it enters blocked (or done). It alerts again only after it has left that state and entered it anew.
- **One every three seconds.** Notifications are at least three seconds apart. Alerts that arrive in between are combined into one, such as `3 agents need input` with their names, and finished agents on a second line. Just before sending, Spaces drops alerts whose agent has moved on, or that you are now looking at.
- **Muted.** Nothing is sent while notifications are muted.
- **Demo mode.** The scripted demo agents never send notifications.
- **More than one monitor.** Every bar reads Herdr and receives every report, but only one sends notifications, so each alert arrives once.

Omarchy's Do Not Disturb holds Spaces' notifications back like any other app's. Without `notify-send` installed, nothing is sent and nothing is logged.

### Muting

Mute notifications for a while without changing "Agent notifications": turn on "Mute agent notifications" (`agentMute`) in the panel, shown while notifications are not Off, or from a script:

```sh
omarchy-shell cyperx84.spaces mute          # toggle; prints muted or unmuted
omarchy-shell cyperx84.spaces setMute on    # or off
```

Muting is saved like any other setting, so it lasts across restarts. While muted, the agents chip shows a bell with a slash and its tooltip says so. Alerts waiting out the three-second gap are dropped when you mute. See [scripting.md](scripting.md#mute) for a key binding.

### Herdr's own notifications

Herdr has its own notification settings, `[ui.toast]` and `[ui.sound]` in `~/.config/herdr/config.toml`. They are separate from Spaces: if you turn on both, you get both. Turn one of them off if you only want one.

## Check marks clear when you look

A check mark means an agent finished while you were elsewhere. It clears when its window is the active window: either you focus it, or the agent finishes while you are already looking at it, in which case no check mark appears at all. A finished agent shows a check mark again the next time it finishes after doing something else.

For Herdr's agents, looking only clears the badge on the Herdr window. The chip's done count, the popup and the preview card rows follow Herdr's own status, so there a finished agent keeps its check mark until Herdr moves it on. For a reporter agent, looking turns it idle everywhere: badge, chip, popup and preview rows.

## How the Herdr feed works

### The feed

`hooks/herdr-feed` is a Python 3 script, standard library only, that Spaces starts in the background while "Agent status" and "Herdr agents" are on.

1. It connects to Herdr's socket at `$HERDR_SOCKET_PATH`, or `~/.config/herdr/herdr.sock` when that is not set.
2. It subscribes to Herdr's pane and workspace events, then asks for a `session.snapshot`.
3. From the snapshot it prints one JSON line listing every pane that runs an agent: pane, workspace label and number, agent name, status, title, Herdr's state-change counter, Herdr's label for the current state (`activity`), the pane's tokens (at most eight short entries), its working directory, and `since`, the time the feed first saw the agent in its current state.
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

- "Herdr agents" off (`herdrAgents`): stops the feed and removes Herdr's agents from the badges, the chip, the popup and the preview card rows. Reporter agents stay.
- "Agent status" off (`agentStatus`): turns off every agent feature, from both sources.
- "Agents chip" set to Never (`agentChip`): keeps the badges, hides the chip and its popup.
- "Agent details" off (`agentDetails`): rows show the pane title only, without time in state or usage.
- "Agent notifications" set to Off (`agentNotify`): no desktop notifications. Muting (`agentMute`) silences them without changing this setting.

## Running without Herdr

When Herdr is not installed or not running, Herdr's part stays silent: no Herdr badges, no errors, and nothing in the shell log. The feed is retried at most once a minute in the background, and picks Herdr up when you start it. Reporter agents, such as Claude Code with [its hooks installed](#claude-code-without-herdr), show as usual. With neither, there are no badges and no chip.

## Reporting agents from your own scripts

Any program can report an agent with one of two IPC calls. `report` carries a name, a title, a directory and a line of activity, so the agent gets a proper row; `agent` is the older, shorter form.

```sh
omarchy-shell cyperx84.spaces report <session> <state> <pids> <agent> <title> <cwd> <activity> <time>
omarchy-shell cyperx84.spaces agent <session> <state> <pids>
```

`report` arguments, all required (Quickshell IPC arguments are positional and never optional; pass `""` for any you do not have):

| Argument | Meaning |
| --- | --- |
| `session` | Any string, 1 to 128 characters without control characters, that identifies this agent run. `__proto__`, `constructor` and `prototype` are refused. A later call with the same session replaces the earlier one. |
| `state` | `working`, `waiting`, `done` or `idle`; `settle` to turn a working or waiting session idle while leaving a done or idle one (and an unknown session) as it is; or `end` to forget the session. |
| `pids` | Comma-separated process IDs: the agent's own process first, then its parent, its parent's parent and so on. At most 64 are kept. |
| `agent` | The agent's name, shown at the right of its row, such as `claude`. Up to 32 characters. |
| `title` | The row's label, such as a project or session name. Up to 120 characters. Empty keeps the previous title, or falls back to the directory's name. |
| `cwd` | The agent's working directory. Up to 512 characters. |
| `activity` | What it is doing now, such as `running tests`. Up to 160 characters. |
| `time` | When the report was made, in unix milliseconds, or `""` for now. A report older than the last one for the session is ignored. |

Everything is treated as untrusted plain text: control characters become spaces, text is cut at the limits, and nothing is read as markup. `report` returns `ok`, or `ignored` when the session or state is not valid. A report session is rechecked every minute in any state: once its first process has exited, it is removed. So the first PID must be a process that lives as long as the session, not a short-lived wrapper.

`agent` takes only the first three arguments, returns nothing, and its sessions behave as before: they get a badge and a row, an idle one gets no row, and only `working` and `waiting` sessions are rechecked, so a wrapper can report `done` as it exits:


| Argument | Meaning |
| --- | --- |
| `session` | Any string that identifies this agent run. A later call with the same session replaces the earlier state. |
| `state` | `working`, `waiting`, `done`, `idle` or `settle`, or `end` to forget the session. Anything else is ignored. |
| `pids` | Comma-separated process IDs: the agent's own process first, then its parent, its parent's parent and so on. |

For both calls, the badge goes on the nearest window among the listed processes, so list enough ancestors to reach the terminal window.

Reports are merged with Herdr's: if one window has both, the more urgent state shows, and a session Herdr also lists is shown once, as Herdr's.

Some rules keep stale badges away:

- `done` reported while that window is the active window is stored as `idle`: you saw it finish.
- A `done` badge clears when you focus its window, and the agent turns idle.
- Every 60 seconds Spaces checks the first process of each `working` or `waiting` session, and of every `report` session. If that process has exited without sending `end`, the session is removed.
- A session that check cannot cover, because it was reported without any PID or it is a plain `agent` session in `done` or `idle`, is removed 30 minutes after its last report.
- At most 64 sessions are kept. A new session beyond that pushes out the one whose last report is oldest.
- After `end`, a report for that session made at or before the `end` is ignored for ten minutes, so reports that arrive late cannot bring it back.

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

Run `spaces-report make test` in a terminal, switch to another workspace, and the terminal's icon spins until the tests finish, then shows a check mark until you look at that terminal, or for at most 30 minutes. The first PID is the wrapper's own shell, which lives exactly as long as the command, so a killed wrapper's badge is cleaned up within a minute. `omarchy-shell -q` keeps the script quiet when the shell is not running.

## Demo mode

Demo mode plays scripted fake agents so you can try the badges, the agents chip and the popup, or take screenshots, without Herdr. It is a developer setting and is not in the settings panel:

```sh
omarchy bar set cyperx84.spaces demo true --json
```

Spaces then runs `hooks/herdr-feed --demo` instead of the real feed. It does not touch Herdr's socket and does not need Herdr installed, only `python3`. Four made-up agents (`claude`, `codex`, `opencode` and `claude`, on Herdr workspaces named `api`, `web`, `docs` and `infra`) step through working, blocked, done and idle every two seconds, on a loop that repeats every 20 seconds, so every badge shows at some point and the chip never disappears. Each has an activity for working and blocked, a model, context, cost and branch, and a time in state with a head start of seconds to an hour, so the [agent details](#agent-details) have something to show. Demo agents never send notifications.

With no Herdr client to find, a terminal window stands in as the Herdr window: the first terminal on workspace 3 or later, or the first terminal anywhere if there is none there. Ghostty, foot, Alacritty, kitty and WezTerm count as terminals. That window gets the badge, the tooltip lines and the preview card rows. Clicking an agent in the popup or on the card only focuses that window, since there is no real pane to switch to.

While demo mode is on, real agents are not shown, from Herdr or from reporters. Demo mode needs "Agent status" on, and works whether "Herdr agents" is on or off.

Turn it off again with:

```sh
omarchy bar set cyperx84.spaces demo false --json
```

You can also watch the script on its own: `python3 hooks/herdr-feed --demo` prints a new line every time an agent changes state, and `python3 hooks/herdr-feed --demo --once` prints the first line and exits.
