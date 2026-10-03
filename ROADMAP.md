# Roadmap

This is where Spaces is headed, based on a survey of about sixty related projects done on 2026-10-03: other Quickshell shells, bars, workspace widgets, and agent session managers. It is a direction, not a promise. Items move, shrink or get dropped as people try them, and nothing here has a date.

To influence it, open an issue with the [feature request form](https://github.com/cyperx84/omarchy-spaces/issues/new?template=feature_request.yml) and describe the problem you want solved. Real setups and real use beat guesses, so say what you run. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report bugs and send changes, and [CHANGELOG.md](CHANGELOG.md) for what has already shipped.

## Where Spaces stands

Two features set Spaces apart:

- **A hover preview card on a workspace pill.** Hover a pill and a live miniature of that workspace opens under the bar, each window where it really is on screen.
- **Coding-agent status tied to workspaces.** Badges on the terminal that hosts your agents, an agents chip in the bar, and a popup that jumps to the agent that needs you.

Other Quickshell shells, including Caelestia, end-4's illogical-impulse, DankMaterialShell, Noctalia and Ambxst, show live thumbnails only in a full-screen overview. None of them shows agent state on the bar. That is the gap Spaces fills, and the plan below builds on it.

## Shipped in 2.2

These five items shipped in 2.2. [CHANGELOG.md](CHANGELOG.md) has the details.

### Agent support without Herdr

A Claude Code hook preset that you install explicitly, with those agents shown in the chip and the popup next to Herdr's.

Why: most users do not run Herdr. The project Spaces grew from has an open request for Cursor support ([tornikegomareli/omarchy-spaces#5](https://github.com/tornikegomareli/omarchy-spaces/pull/5)), which showed the same need.

### Desktop notifications for agents

A desktop notification when an agent needs input or finishes, with a mute switch, and no alert for the pane you are already watching.

Why: this was the strongest signal in the survey. [peon-ping](https://github.com/PeonPing/peon-ping) does it, and so do nearly all agent session managers (cmux, Superset, zellaude, zj-radar). Spaces already knew when an agent was blocked, so it was the natural place to say so.

### Richer agent rows

Each row in the agents popup gained time in state, current activity, and cost and context usage.

Why: Herdr already reported this data. Spaces only had to show it.

### Scratchpad pill

A pill for the scratchpad (special workspace), so windows parked there stay visible and reachable.

Why: three separate parts of the survey raised it without prompting. Waybar (`show-special`), Caelestia and DankMaterialShell handle it, and so does [omarchy-decent-workspaces](https://github.com/TheTrueFerret/omarchy-decent-workspaces).

### Debounced, touchpad-aware scrolling

Scrolling over the bar is debounced and aware of touchpads, with an option to reverse the direction.

Why: one swipe should move one workspace, not five. [DankMaterialShell](https://github.com/AvengeMedia/DankMaterialShell) (MIT) had a proven approach; Spaces took its idea of an accumulator with a cooldown and wrote its own version.

## Later

Candidates, in no order. Each one is a possibility, not a commitment.

- **Drag a window onto another pill to move it.** Drag a miniature from the preview card onto another pill. End-4's overview and Ambxst do drag and drop in a full-screen overview, and Spaces already draws the miniatures.
- **Right-click menu per window.** Focus, close, move, pin and toggle floating. Noctalia's workspace widget has this.
- **Hold Super to reveal keys.** Requested upstream in [issue 16](https://github.com/tornikegomareli/omarchy-spaces/issues/16). Spaces already reads your binds.
- **Custom icon rules and ignore rules.** Match by window class and title. This is the most-tweaked setting in every bar surveyed: Waybar `window-rewrite`, [hyprland-autoname-workspaces](https://github.com/hyprland-community/hyprland-autoname-workspaces), YASB and the SketchyBar app font.
- **Workspace names and icons.** [omarchy-workspace-name](https://github.com/jankeesvw/omarchy-workspace-name) is the most-starred Omarchy workspace widget and does only this, which says how much people want it.
- **Window state markers.** Fullscreen, floating and pinned, shown on the window's icon.
- **Answer a blocked agent from the popup.** Show what the agent is asking, then approve, deny or reply. The request is always shown first, and there is no bulk approve. [herdr-remote](https://github.com/dcolinmorgan/herdr-remote) and [happy](https://github.com/slopus/happy) offer this today.
- **Per-monitor workspaces.** Including interop with [omarchy-per-monitor-workspaces](https://github.com/mmsbrggr/omarchy-per-monitor-workspaces). It is the only long-standing request upstream ([issue 2](https://github.com/tornikegomareli/omarchy-spaces/issues/2)). This needs testers with more than one monitor, which the maintainer cannot cover alone. If you have two or more screens and want this, please say so in an issue and be ready to try early builds.
- **More agents through hook presets.** Codex, OpenCode and Cursor, on the same mechanism as the Claude Code preset.
- **A snapshot capture mode for previews.** Capture a still instead of a live view, for lower power use.

## Not planned

These are decisions, not oversights. If you have a strong case, open an issue.

- **Usage and rate-limit meters.** Omarchy ships an agents usage widget, and [claudebar](https://github.com/mryll/claudebar) covers it. Spaces shows what agents are doing, not what they cost you over a month.
- **A full-screen overview.** Dedicated plugins exist, such as [omarchy-overview](https://github.com/AyushKr2003/omarchy-overview), and Spaces is bar-first.
- **Many more styling toggles.** A small settings surface is a goal. [HyprPanel](https://github.com/Jas-SinghFSU/HyprPanel) was archived in 2026, and its maintainer cited configurability and install burden. Spaces would rather have a few good defaults.
- **Naming workspaces with a local language model, and remote Herdr hosts over SSH.** The benefit is narrow and the extra security surface is not worth it.

## Borrowing code

Spaces is [MIT licensed](LICENSE). Code may be adapted only from MIT-compatible sources, such as DankMaterialShell and the `legacy-v4` QML branch of Noctalia. GPL and AGPL projects (Caelestia, end-4/dots-hyprland and Ambxst) are a source of ideas only: any feature inspired by them is reimplemented from scratch, without copying their code.

If you contribute code adapted from another project, say in your pull request where it came from and under what license.

## Credits for ideas

Thanks to the projects named above, and to everyone whose bar, shell or agent tool showed what is worth building.
