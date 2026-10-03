import QtQuick
import QtQuick.Effects
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import qs.Commons
import qs.Ui
import "Model.js" as Model

// Workspace switcher that shows which apps are open on each workspace.
//
// Each workspace is a pill. The active pill (and, depending on settings, the
// hovered or every occupied pill) slides open to reveal the app icons of its
// windows. Left-click a pill to focus the workspace, left-click an icon to
// focus that window, scroll to step through workspaces, right-click for
// settings. Special workspaces (the scratchpad) get pills of their own after
// the numbered ones; clicking one toggles it. Settings persist inline on this widget's shell.json entry.
Panel {
  id: root
  moduleName: "cyperx84.spaces"
  ipcTarget: "cyperx84.spaces"
  manageIpc: false

  // ------------------------------------------------------------ settings

  readonly property var cfg: Model.resolveSettings(root.settings)

  function applySetting(delta) {
    var entry = Model.mergedEntry(root.moduleName, root.settings, delta)
    // Applied locally first so the widget redraws on the click itself; the
    // shell.json write comes back through the bar as the same value.
    root.settings = entry
    if (root.bar && root.bar.shell && typeof root.bar.shell.updateEntryInline === "function")
      root.bar.shell.updateEntryInline(root.moduleName, entry)
  }

  function resetSettings() {
    var entry = { id: root.moduleName }
    root.settings = entry
    if (root.bar && root.bar.shell && typeof root.bar.shell.updateEntryInline === "function")
      root.bar.shell.updateEntryInline(root.moduleName, entry)
  }

  // ------------------------------------------------------------ geometry & colors

  readonly property bool vertical: bar ? bar.vertical : false
  readonly property int barSize: bar ? bar.barSize : Style.bar.sizeHorizontal
  readonly property color fg: bar ? bar.barForeground : Color.foreground
  readonly property color bg: bar ? bar.background : Color.background
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family
  readonly property int pillThickness: Math.max(16, barSize - Style.space(6))
  readonly property int iconPx: Math.min(cfg.iconSize, pillThickness - Style.space(4))
  readonly property int pillRadius: Style.cornerRadius > 0 ? Math.round(pillThickness * 0.32) : 0
  readonly property int dur: Model.durationFor(cfg, 280)
  readonly property int fastDur: Model.durationFor(cfg, 160)
  readonly property real trailingGap: vertical ? 0 : Style.spaceReal(1.5)
  readonly property var metrics: Model.densityMetrics(cfg.density)
  readonly property bool widgetHovered: widgetHover.hovered

  function activeFill() {
    if (cfg.activeStyle === "solid") return root.fg
    if (cfg.activeStyle === "accent") return Color.accent
    return Util.alpha(root.fg, 0.18)
  }

  function activeText() {
    return cfg.activeStyle === "subtle" ? root.fg : root.bg
  }

  // ------------------------------------------------------------ Hyprland state

  // Bumped after Hyprland reports window moves, so positions (and therefore
  // icon order) re-read the freshly refreshed IPC objects.
  property int revision: 0

  readonly property var monitor: {
    var w = root.QsWindow.window
    return w && w.screen ? Hyprland.monitorFor(w.screen) : null
  }

  readonly property int currentWorkspaceId: {
    if (cfg.perMonitor && root.monitor && root.monitor.activeWorkspace) return root.monitor.activeWorkspace.id
    return Hyprland.focusedWorkspace ? Hyprland.focusedWorkspace.id : -1
  }

  // Workspace focused before the current one, for "click active = go back".
  property int previousWorkspaceId: -1
  property int lastWorkspaceId: -1
  // The last numbered workspace, where scrolling starts from while the
  // current one is not numbered.
  property int lastNumberedWorkspaceId: -1
  onCurrentWorkspaceIdChanged: {
    if (root.lastWorkspaceId > 0 && root.lastWorkspaceId !== root.currentWorkspaceId)
      root.previousWorkspaceId = root.lastWorkspaceId
    root.lastWorkspaceId = root.currentWorkspaceId
    if (root.currentWorkspaceId > 0) root.lastNumberedWorkspaceId = root.currentWorkspaceId
    if (root.currentWorkspaceId === root.previewWorkspaceId) root.hidePreview()
  }

  // Addresses (normalized) of windows that requested attention and have not
  // been focused since.
  property var urgentAddresses: ({})

  function setUrgent(address, urgent) {
    var key = Model.normalizeAddress(address)
    if (key === "" || (!!root.urgentAddresses[key]) === urgent) return
    var next = ({})
    for (var k in root.urgentAddresses) if (k !== key) next[k] = true
    if (urgent) next[key] = true
    root.urgentAddresses = next
  }

  function isUrgent(address) {
    return root.cfg.urgentHighlight && !!root.urgentAddresses[Model.normalizeAddress(address)]
  }

  // ------------------------------------------------------------ agents

  // Any coding agent can report in through the IPC methods
  // agent(session, state, pids) and report(session, state, pids, agent,
  // title, cwd, activity, time); hooks/claude-hook uses report. Herdr's agents
  // come from hooks/herdr-feed instead (see below). Reports land here as
  // Model.applyReport keeps them:
  //   { [session]: { state: "working" | "waiting" | "done" | "idle", pids: [...],
  //                  at, since, rich, agent, title, cwd, activity } }
  // and become rows in the chip, popup, previews and notifications through
  // Model.reporterAgents. Reporters are trusted for their own lifecycle, but
  // not forever: a crashed reporter never sends "end", so sessions are
  // rechecked against /proc (Model.agentProbed says which).
  property var agents: ({})
  // { session: unix ms } of recently ended sessions; see Model.applyReport.
  property var agentsEnded: ({})
  property var liveAgentPids: ({})
  property bool agentProbeSeen: false
  property bool agentProbeFailed: false

  readonly property var pidByAddress: {
    var map = ({})
    for (var id in root.workspaceMap) {
      var windows = root.workspaceMap[id].windows
      for (var i = 0; i < windows.length; i++) map[windows[i].address] = windows[i].pid
    }
    return map
  }

  // { pid: true } for every window that reports one.
  readonly property var windowPids: {
    var pids = ({})
    for (var address in root.pidByAddress) if (root.pidByAddress[address]) pids[root.pidByAddress[address]] = true
    return pids
  }

  // Reporter states and Herdr states share one map; the more urgent wins.
  readonly property var agentByPid: {
    // Demo mode shows only its made-up agents, never real ones.
    if (!root.cfg.agentStatus || root.herdrDemo) return ({})
    return Model.mergeAgentStates(Model.agentStates(root.agents, root.windowPids), root.herdrByPid)
  }

  // { pid: true } for these window addresses.
  function pidSet(addresses) {
    var out = ({})
    for (var i = 0; i < (addresses || []).length; i++) {
      var pid = root.pidByAddress[addresses[i]]
      if (pid) out[pid] = true
    }
    return out
  }

  function agentStateFor(addresses) {
    var best = ""
    var rank = { waiting: 3, working: 2, done: 1 }
    for (var i = 0; i < addresses.length; i++) {
      var state = root.agentByPid[root.pidByAddress[addresses[i]]] || ""
      // In demo mode the stand-in host wears the scripted agents' state.
      var demo = root.herdrDemo && addresses[i] === root.herdrDemoHost ? root.herdrState.state : ""
      if (demo && (!state || rank[demo] > rank[state])) state = demo
      if (state && (!best || rank[state] > rank[best])) best = state
    }
    return best
  }

  function activeWindowPid() {
    var active = Hyprland.activeToplevel
    return active ? (root.pidByAddress[String(active.address)] || 0) : 0
  }

  // Every window on every monitor, [{ address, pid, workspace }]: a reporter
  // agent's window may sit on another monitor than this bar's.
  readonly property var allWindows: {
    root.revision
    var values = Hyprland.toplevels.values
    var out = []
    for (var i = 0; i < values.length; i++) {
      var tl = values[i]
      var ipc = tl.lastIpcObject || {}
      var ws = tl.workspace ? tl.workspace.id : (ipc.workspace ? ipc.workspace.id : 0)
      out.push({ address: String(tl.address), pid: ipc.pid || 0, workspace: ws || 0 })
    }
    return out
  }

  readonly property int activePid: {
    var active = Hyprland.activeToplevel
    if (!active) return 0
    root.revision
    var ipc = active.lastIpcObject || {}
    return ipc.pid || root.pidByAddress[String(active.address)] || 0
  }

  readonly property var allWindowPids: {
    var pids = ({})
    for (var i = 0; i < root.allWindows.length; i++) if (root.allWindows[i].pid) pids[root.allWindows[i].pid] = true
    return pids
  }

  readonly property string homeDir: Quickshell.env("HOME") || ""

  // Reporter agents as rows, in the feed's agent shape. Demo mode shows only
  // its made-up agents, never real ones.
  readonly property var reporterList: !root.cfg.agentStatus || root.herdrDemo ? []
    : Model.reporterAgents(root.agents, { windows: root.allWindows, activePid: root.activePid, home: root.homeDir })

  // One report from either IPC method; see Model.applyReport.
  function applyAgentReport(report) {
    var result = Model.applyReport(root.agents, report, { now: Date.now(), activeWindowPid: root.activePid,
      windowPids: root.allWindowPids, ended: root.agentsEnded })
    root.agentsEnded = result.ended
    if (result.agents === root.agents) return
    root.agents = result.agents
    root.noteAgentAlerts(false)
  }

  function applyAgent(session, state, pidsCsv) {
    root.applyAgentReport({ session: session, state: state, pids: pidsCsv })
  }

  function applyReport(session, state, pidsCsv, agent, title, cwd, activity, time) {
    root.applyAgentReport({ session: session, state: state, pids: pidsCsv, agent: agent, title: title,
      cwd: cwd, activity: activity, at: Number(time) || 0, rich: true })
  }

  // A crashed reporter leaves working/waiting behind with no "end". Recheck
  // the agent process itself: ancestors and terminals can outlive the agent.
  function startAgentProbe() {
    if (agentProbe.running) return
    var pids = Model.agentProcessIds(root.agents)
    if (!pids.length) return
    root.liveAgentPids = ({})
    root.agentProbeSeen = false
    root.agentProbeFailed = false
    agentProbe.command = ["bash", "-c", [
      'echo "spaces-agent-probe";',
      'if [[ ! -d /proc ]]; then echo "spaces-agent-probe-unavailable"; exit 0; fi;',
      'for pid in ' + pids.join(" ") + '; do',
      '[[ -r /proc/$pid/stat ]] || continue;',
      'stat=$(cat "/proc/$pid/stat" 2>/dev/null) || continue;',
      'rest=${stat##*) };',
      '[[ ${rest:0:1} != "Z" ]] && echo "$pid";',
      'done'
    ].join("\n")]
    agentProbe.running = true
  }

  function noteAgentProbe(line) {
    var text = String(line || "").trim()
    if (text === "spaces-agent-probe") {
      root.agentProbeSeen = true
      return
    }
    if (text === "spaces-agent-probe-unavailable") {
      root.agentProbeFailed = true
      return
    }
    var pid = Number(text)
    if (pid > 1) root.liveAgentPids[pid] = true
  }

  function finishAgentProbe() {
    var alive = root.liveAgentPids
    var seen = root.agentProbeSeen
    var failed = root.agentProbeFailed
    root.liveAgentPids = ({})
    root.agentProbeSeen = false
    root.agentProbeFailed = false
    // Never reap on a broken probe: an empty result must mean dead agents,
    // not a failed check.
    if (!seen || failed) return
    // pruneDeadAgents takes an array; liveAgentPids is a dedup map.
    var pruned = Model.pruneDeadAgents(root.agents, Object.keys(alive))
    if (pruned === root.agents) return
    root.agents = pruned
    // Gone rows close their notifications.
    root.noteAgentAlerts(false)
  }

  // Seeing a finished agent's window clears its check mark.
  function acknowledgeAgents() {
    var next = Model.acknowledgeReports(root.agents, root.activePid, root.allWindowPids)
    if (next === root.agents) return
    root.agents = next
    root.noteAgentAlerts(false)
  }

  Connections {
    target: Hyprland
    function onActiveToplevelChanged() {
      Qt.callLater(root.acknowledgeAgents)
      Qt.callLater(root.acknowledgeHerdr)
      // Cheap, and catches a Herdr client started in an open terminal.
      if (root.herdrWanted) herdrProbeDebounce.restart()
    }
  }

  Process {
    id: agentProbe
    stdout: SplitParser { onRead: function(line) { root.noteAgentProbe(line) } }
    onExited: root.finishAgentProbe()
  }

  Timer {
    id: agentProbeTimer
    interval: 60000
    repeat: true
    running: true
    onTriggered: {
      // Sessions the probe cannot check expire instead (Model.expireReports).
      var kept = Model.expireReports(root.agents, Date.now())
      if (kept !== root.agents) {
        root.agents = kept
        root.noteAgentAlerts(false)
      }
      root.startAgentProbe()
    }
  }

  // ------------------------------------------------------------ herdr

  // Herdr runs agents in its own server process, so their process trees never
  // pass through a terminal window and no reporter could find one. Instead,
  // hooks/herdr-feed relays Herdr's own agent status, and a window counts as
  // a Herdr window when a Herdr client process runs under it. Herdr cannot
  // say which client shows which workspace, so with several Herdr windows
  // every one of them wears the combined state.
  readonly property bool herdrWanted: root.cfg.agentStatus && (root.cfg.herdrAgents || root.cfg.demo)
  // Demo mode (the developer setting `demo`, for screenshots): the feed runs
  // with --demo and plays four made-up agents; Herdr itself is never asked.
  // No Herdr client is needed either: the first terminal on workspace 3 or
  // later (else any terminal) stands in as the Herdr window, and clicking an
  // agent only focuses that window.
  readonly property bool herdrDemo: root.herdrWanted && root.cfg.demo
  readonly property string herdrDemoHost: {
    if (!root.herdrDemo) return ""
    var list = []
    for (var id in root.workspaceMap) list.push(root.workspaceMap[id])
    return Model.demoHostAddress(list)
  }
  // Set while the feed stops to come back in the other mode.
  property bool herdrFeedRestart: false
  readonly property string herdrFeedPath: Model.localPath(Qt.resolvedUrl("hooks/herdr-feed"))
  property var herdrFeedAgents: []
  property string herdrClientText: ""
  property var herdrClientLines: []
  // { pane_id: true } for finished panes already seen.
  property var herdrAcked: ({})
  // Panes and focus of the last feed line; see Model.herdrFeedKey.
  property string herdrFeedKey: ""
  // Feed runs in a row that ended at once without a word; they back off.
  property int herdrQuickExits: 0
  property real herdrFeedStarted: 0
  property bool herdrFeedSpoke: false

  // [{ pane_id, workspace_id, workspace_label, workspace_number, tab_id,
  //    agent, status, title, focused, session }], as hooks/herdr-feed sends it.
  readonly property var herdrAgents: root.herdrWanted ? root.herdrFeedAgents : []
  // PIDs of the windows hosting a Herdr client, sorted.
  readonly property var herdrWindowPids: root.herdrWanted && !root.herdrDemo ? Model.parseHerdrClients(root.herdrClientText, root.windowPids) : []
  readonly property var herdrState: Model.herdrSummary(root.herdrAgents, root.herdrAcked)
  readonly property var herdrByPid: Model.herdrStatesByPid(root.herdrWindowPids, root.herdrState)

  // Window PIDs as one comparable value, so a new or closed window can
  // trigger a fresh client probe.
  readonly property string windowPidKey: Object.keys(root.windowPids).sort().join(",")
  onWindowPidKeyChanged: if (root.herdrWanted) herdrProbeDebounce.restart()
  onHerdrWantedChanged: root.syncHerdr()
  // The real and the demo feed never share a moment: drop what one said and
  // start the other once the first has exited.
  onHerdrDemoChanged: {
    herdrRetry.stop()
    root.herdrBaseline = true
    root.herdrFeedAgents = []
    root.herdrAcked = ({})
    root.herdrFeedKey = ""
    root.herdrQuickExits = 0
    if (herdrFeed.running) {
      root.herdrFeedRestart = true
      herdrFeed.running = false
    } else {
      root.syncHerdr()
    }
  }

  function isHerdrWindow(address) {
    if (root.herdrDemo) return address !== "" && address === root.herdrDemoHost
    return root.herdrWindowPids.indexOf(root.pidByAddress[address]) !== -1
  }

  function herdrHosted(addresses) {
    for (var i = 0; i < addresses.length; i++) if (root.isHerdrWindow(addresses[i])) return true
    return false
  }

  function syncHerdr() {
    if (root.herdrWanted) {
      if (!herdrFeed.running) herdrFeed.running = true
      root.startHerdrProbe()
    } else {
      herdrRetry.stop()
      herdrFeed.running = false
      root.herdrBaseline = true
      root.herdrFeedAgents = []
      root.herdrClientText = ""
      root.herdrAcked = ({})
      root.herdrFeedKey = ""
      root.herdrQuickExits = 0
    }
  }

  function applyHerdrFeed(line) {
    var agents = Model.parseHerdrFeed(line, root.herdrDemo)
    if (!agents) return
    root.herdrFeedSpoke = true
    // New or closed panes, or focus moving, can mean a client came or went.
    var key = Model.herdrFeedKey(agents)
    if (key !== root.herdrFeedKey) {
      root.herdrFeedKey = key
      herdrProbeDebounce.restart()
    }
    // Finishing in the window you are looking at needs no check mark.
    root.herdrAcked = Model.herdrAcks(agents, root.herdrAcked, root.viewingHerdr())
    root.herdrFeedAgents = agents
    root.noteAgentAlerts(true)
  }

  function viewingHerdr() {
    if (root.herdrDemo) {
      var active = Hyprland.activeToplevel
      return !!active && root.herdrDemoHost !== "" && String(active.address) === root.herdrDemoHost
    }
    var pid = root.activeWindowPid()
    return pid > 0 && root.herdrWindowPids.indexOf(pid) !== -1
  }

  // Seeing a Herdr window clears the check marks of its finished agents.
  function acknowledgeHerdr() {
    if (root.viewingHerdr()) root.herdrAcked = Model.herdrAcks(root.herdrAgents, root.herdrAcked, true)
  }

  function startHerdrProbe() {
    if (!root.herdrWanted || root.herdrDemo || herdrClientProbe.running) return
    herdrClientProbe.running = true
  }

  Process {
    id: herdrFeed
    // bash first, so a machine without Herdr's socket or without python3
    // never starts an interpreter: the feed simply exits and is retried.
    command: root.herdrDemo
      ? ["bash", "-c", 'command -v python3 >/dev/null 2>&1 || exit 0; exec python3 "$1" --demo',
        "spaces-herdr-feed", root.herdrFeedPath]
      : ["bash", "-c", [
      's=${HERDR_SOCKET_PATH:-$HOME/.config/herdr/herdr.sock};',
      '[[ -S $s ]] || exit 0;',
      'command -v python3 >/dev/null 2>&1 || exit 0;',
      'exec python3 "$1"'
    ].join(" "), "spaces-herdr-feed", root.herdrFeedPath]
    stdout: SplitParser { onRead: function(line) { root.applyHerdrFeed(line) } }
    onStarted: {
      root.herdrFeedStarted = Date.now()
      root.herdrFeedSpoke = false
      // Its first snapshot only sets the baseline for notifications.
      root.herdrBaseline = true
    }
    onExited: {
      // Herdr is gone (or never was): no stale badges, and try again later,
      // less often each time it is still not there.
      root.herdrFeedAgents = []
      root.herdrFeedKey = ""
      // Its agents are gone: their notifications count as answered.
      root.closeResolvedNotifications(root.agentList)
      if (root.herdrFeedRestart) {
        root.herdrFeedRestart = false
        root.syncHerdr()
        return
      }
      var quick = !root.herdrFeedSpoke && Date.now() - root.herdrFeedStarted < 2000
      root.herdrQuickExits = quick ? root.herdrQuickExits + 1 : 0
      herdrRetry.interval = Model.herdrRetryDelay(root.herdrQuickExits)
      if (root.herdrWanted) herdrRetry.restart()
    }
  }

  Timer {
    id: herdrRetry
    interval: 5000
    onTriggered: if (root.herdrWanted && !herdrFeed.running) herdrFeed.running = true
  }

  // Prints, for every Herdr client (not the server), its ancestor PIDs
  // nearest first. The nearest one that is a window hosts the client.
  Process {
    id: herdrClientProbe
    command: ["bash", "-c", [
      'command -v pgrep >/dev/null 2>&1 || exit 0;',
      'for pid in $(pgrep -x herdr); do',
      'mapfile -d "" -t args 2>/dev/null < "/proc/$pid/cmdline" || continue;',
      '[[ ${args[1]:-} == server ]] && continue;',
      'chain=""; p=$pid;',
      'for _ in {1..32}; do',
      'stat=$(cat "/proc/$p/stat" 2>/dev/null) || break;',
      'rest=${stat##*) }; set -- $rest; p=$2;',
      '(( p > 1 )) || break;',
      'chain+=${chain:+,}$p;',
      'done;',
      '[[ -n $chain ]] && echo "$chain";',
      'done'
    ].join("\n")]
    stdout: SplitParser { onRead: function(line) { root.herdrClientLines.push(line) } }
    onStarted: root.herdrClientLines = []
    onExited: {
      if (root.herdrWanted) root.herdrClientText = root.herdrClientLines.join("\n")
      // A client means a server: no need to sit out the feed's back-off.
      if (root.herdrWanted && root.herdrClientLines.length > 0 && !herdrFeed.running) {
        herdrRetry.stop()
        herdrFeed.running = true
      }
      root.herdrClientLines = []
    }
  }

  Timer {
    id: herdrProbeDebounce
    interval: 400
    onTriggered: root.startHerdrProbe()
  }

  Timer {
    interval: 30000
    repeat: true
    running: root.herdrWanted
    onTriggered: root.startHerdrProbe()
  }

  function appIdOf(toplevel) {
    if (toplevel.wayland && toplevel.wayland.appId) return toplevel.wayland.appId
    var ipc = toplevel.lastIpcObject
    return ipc && ipc["class"] ? ipc["class"] : ""
  }

  // { [workspaceId]: { id, name, special, windows: [{ address, appId, title, focused, at }], area } }
  // Numbered workspaces by their positive id and, with "Show scratchpad" on,
  // special workspaces by their negative one. Named workspaces (also
  // negative) are left out, as before.
  readonly property var workspaceMap: {
    root.revision
    var values = Hyprland.workspaces.values
    var activeToplevel = Hyprland.activeToplevel
    var perMonitor = cfg.perMonitor && root.monitor !== null
    var map = ({})

    for (var i = 0; i < values.length; i++) {
      var ws = values[i]
      var special = ws.id < 0 && Model.isSpecialName(ws.name)
      if (ws.id <= 0 && !(special && cfg.showSpecial)) continue
      if (perMonitor && ws.monitor !== root.monitor) continue

      var windows = []
      var toplevels = ws.toplevels.values
      for (var j = 0; j < toplevels.length; j++) {
        var tl = toplevels[j]
        var ipc = tl.lastIpcObject || {}
        windows.push({
          address: String(tl.address),
          appId: root.appIdOf(tl),
          title: String(tl.title || ""),
          focused: activeToplevel ? tl === activeToplevel : !!(tl.wayland && tl.wayland.activated),
          at: ipc.at && ipc.at.length === 2 ? [ipc.at[0], ipc.at[1]] : null,
          size: ipc.size && ipc.size.length === 2 ? [ipc.size[0], ipc.size[1]] : null,
          floating: ipc.floating === true,
          pid: ipc.pid || 0,
          toplevel: tl.wayland
        })
      }
      var mon = ws.monitor
      var area = mon ? Model.monitorArea({
        x: mon.x, y: mon.y, width: mon.width, height: mon.height, scale: mon.scale,
        transform: mon.lastIpcObject ? mon.lastIpcObject.transform : 0,
        reserved: mon.lastIpcObject ? mon.lastIpcObject.reserved : null
      }) : null
      map[ws.id] = { id: ws.id, name: String(ws.name || ""), special: special, monitor: mon ? String(mon.name) : "",
        windows: Model.sortWindows(windows), area: area }
    }
    return map
  }

  // ------------------------------------------------------------ special workspaces

  // Quickshell lists special workspaces with the others but does not say
  // which one a monitor shows, and its monitor refresh leaves lastIpcObject
  // empty on Hyprland 0.56. So `hyprctl monitors -j` is read once at startup
  // (its specialWorkspace field), and Hyprland's activespecial events keep it
  // current from then on.
  property var specialEvents: ({})
  property var specialMonitors: []
  property var monitorsLines: []
  readonly property var specialShown: Model.specialShownMap(root.specialMonitors, root.specialEvents)
  readonly property string monitorName: root.monitor ? String(root.monitor.name) : ""

  function noteActiveSpecial(eventName, data) {
    var change = Model.parseActiveSpecial(eventName, data)
    if (!change) return
    var next = ({})
    for (var k in root.specialEvents) next[k] = root.specialEvents[k]
    next[change.monitor] = change.name
    root.specialEvents = next
  }

  // [{ id, name, short, windows, shown }]: the special pills, after the
  // numbered ones. See Model.specialWorkspaces.
  readonly property var specialPills: {
    var list = []
    for (var id in root.workspaceMap) {
      var w = root.workspaceMap[id]
      if (w.special) list.push({ id: w.id, name: w.name, windows: w.windows.length, monitor: w.monitor })
    }
    return Model.specialWorkspaces(list, { show: cfg.showSpecial, shown: Model.specialShownOn(root.specialShown, root.monitorName),
      perMonitor: cfg.perMonitor, monitor: root.monitorName }).filter(function(p) { return p.id < 0 })
  }

  readonly property var specialById: {
    var map = ({})
    for (var i = 0; i < root.specialPills.length; i++) map[root.specialPills[i].id] = root.specialPills[i]
    return map
  }

  // Every pill, in order: numbered workspaces, then special ones.
  readonly property var pillIds: root.workspaceIds.concat(root.specialPills.map(function(p) { return p.id }))

  Process {
    id: monitorsScan
    command: ["hyprctl", "monitors", "-j"]
    stdout: SplitParser { onRead: function(line) { root.monitorsLines.push(line) } }
    onStarted: root.monitorsLines = []
    onExited: function(exitCode) {
      if (exitCode === 0) root.specialMonitors = Model.monitorSpecials(root.monitorsLines.join("\n"))
      root.monitorsLines = []
    }
  }

  function toggleSpecial(name) {
    run("hyprctl dispatch " + Util.shellQuote(Model.specialToggleDispatch(name))
      + " >/dev/null 2>&1 || hyprctl dispatch togglespecialworkspace " + Util.shellQuote(Model.specialName(name)))
  }

  readonly property var workspaceIds: {
    var occupied = ({})
    for (var id in workspaceMap) occupied[id] = workspaceMap[id].windows.length
    var active = root.currentWorkspaceId > 0 ? [root.currentWorkspaceId] : []
    return Model.workspaceIds(occupied, active, cfg.persistentWorkspaces, cfg.hideEmpty)
  }

  function focusWorkspace(id) {
    run("hyprctl dispatch " + Util.shellQuote("hl.dsp.focus({ workspace = \"" + id + "\" })"))
  }

  function focusWindow(address) {
    var target = "address:0x" + String(address).replace(/^0x/, "")
    run("hyprctl dispatch " + Util.shellQuote("hl.dsp.focus({ window = \"" + target + "\" })")
      + " >/dev/null 2>&1 || hyprctl dispatch focuswindow " + Util.shellQuote(target))
  }

  function closeWindow(address) {
    var target = "address:0x" + Model.normalizeAddress(address)
    run("hyprctl dispatch " + Util.shellQuote("hl.dsp.window.close({ window = \"" + target + "\" })")
      + " >/dev/null 2>&1 || hyprctl dispatch closewindow " + Util.shellQuote(target))
  }

  function clickWorkspace(id) {
    if (id === root.currentWorkspaceId) {
      if (root.cfg.activeClick === "previous" && root.previousWorkspaceId > 0) focusWorkspace(root.previousWorkspaceId)
      return
    }
    focusWorkspace(id)
  }

  function activateItem(item) {
    // A grouped icon that is already focused cycles through its windows.
    if (item.focused && item.addresses.length > 1) {
      var idx = item.addresses.indexOf(item.address)
      focusWindow(item.addresses[(idx + 1) % item.addresses.length])
    } else {
      focusWindow(item.address)
    }
  }

  // Wheel and touchpad input, one step per notch or swipe (the swipe's
  // scroll phase marks where it ends); see Model.scrollStep. Special workspaces are never stepped through.
  property var scrollState: null

  function scrollBy(wheel) {
    if (!cfg.scrollSwitch || !wheel) return
    var result = Model.scrollStep(root.scrollState, {
      angleX: wheel.angleDelta.x, angleY: wheel.angleDelta.y,
      pixelX: wheel.pixelDelta.x, pixelY: wheel.pixelDelta.y, time: Date.now(), phase: wheel.phase
    }, { vertical: root.vertical, reverse: cfg.reverseScroll })
    root.scrollState = result.state
    if (!result.step) return
    var next = Model.scrollTarget(root.workspaceIds, root.currentWorkspaceId, root.lastNumberedWorkspaceId, result.step)
    if (next !== root.currentWorkspaceId) focusWorkspace(next)
  }

  // `wanted` overrides the window-title tooltip setting, for tips that have
  // their own (the pills' shortcut tooltips).
  function showTip(target, text, wanted) {
    var on = wanted === undefined ? root.cfg.tooltips : wanted
    if (root.bar && on && text) root.bar.showTooltip(target, text)
  }

  function hideTip(target) {
    if (root.bar) root.bar.hideTooltip(target)
  }

  function run(command) {
    if (root.bar && typeof root.bar.run === "function") root.bar.run(command)
    else Quickshell.execDetached(["bash", "-c", command])
  }

  Connections {
    target: Hyprland
    function onRawEvent(event) {
      switch (event.name) {
      case "urgent":
        root.setUrgent(event.data, true)
        break
      case "activewindowv2":
        root.setUrgent(event.data, false)
        refreshDebounce.restart()
        break
      case "closewindow":
        root.setUrgent(event.data, false)
        refreshDebounce.restart()
        break
      case "configreloaded":
        bindsDebounce.restart()
        break
      case "activespecial":
      case "activespecialv2":
        root.noteActiveSpecial(event.name, event.data)
        break
      case "openwindow":
      case "movewindow":
      case "movewindowv2":
      case "changefloatingmode":
      case "windowtitle":
      case "windowtitlev2":
        refreshDebounce.restart()
        break
      }
    }
  }

  Timer {
    id: refreshDebounce
    interval: 120
    onTriggered: {
      Hyprland.refreshToplevels()
      revisionBump.restart()
    }
  }

  Timer {
    id: revisionBump
    interval: 80
    onTriggered: root.revision++
  }

  // ------------------------------------------------------------ key binds

  // The keys that reach each workspace, read from the live binds so they
  // follow whatever the user has bound, not Omarchy's defaults:
  //   { [workspaceId]: { switch: { mods, key } | null, move: { mods, key } | null } }
  property var keyBinds: ({})
  // { [name without "special:"]: { toggle, move } }, the same way.
  property var specialKeys: ({})
  property var bindsLines: []
  // Parsed `hyprctl binds -j`, and hooks/bind-keys' output: the keymap for
  // code:N binds and the source keys of Lua binds `hyprctl` lists without one.
  property var bindsList: []
  property var bindKeysData: null
  property var bindKeysLines: []
  readonly property string bindKeysPath: Model.localPath(Qt.resolvedUrl("hooks/bind-keys"))

  function updateKeyBinds() {
    root.keyBinds = Model.workspaceKeyBinds(root.bindsList, root.bindKeysData)
    root.specialKeys = Model.specialKeyBinds(root.bindsList, root.bindKeysData)
  }

  function applyBinds(text) {
    var parsed
    try { parsed = JSON.parse(text) } catch (e) { return }
    root.bindsList = parsed
    root.updateKeyBinds()
  }

  function applyBindKeys(text) {
    var parsed
    try { parsed = JSON.parse(text) } catch (e) { return }
    root.bindKeysData = Model.bindKeyData(parsed)
    root.updateKeyBinds()
  }

  function scanBinds() {
    if (!bindsScan.running) bindsScan.running = true
    if (!bindKeysScan.running) bindKeysScan.running = true
  }

  Process {
    id: bindsScan
    command: ["hyprctl", "binds", "-j"]
    stdout: SplitParser { onRead: function(line) { root.bindsLines.push(line) } }
    onStarted: root.bindsLines = []
    onExited: function(exitCode) {
      // A failed scan keeps the binds already known.
      if (exitCode === 0) root.applyBinds(root.bindsLines.join("\n"))
      root.bindsLines = []
    }
  }

  Process {
    id: bindKeysScan
    // Without python3 there is nothing to add: binds that report their key
    // still show, as before.
    command: ["bash", "-c", 'command -v python3 >/dev/null 2>&1 || exit 0; exec python3 "$1"',
      "spaces-bind-keys", root.bindKeysPath]
    stdout: SplitParser { onRead: function(line) { root.bindKeysLines.push(line) } }
    onStarted: root.bindKeysLines = []
    onExited: function(exitCode) {
      if (exitCode === 0 && root.bindKeysLines.length > 0) root.applyBindKeys(root.bindKeysLines.join("\n"))
      root.bindKeysLines = []
    }
  }

  // A config reload can rebind anything; it also fires several times in a
  // row while the config is being saved.
  Timer {
    id: bindsDebounce
    interval: 500
    onTriggered: root.scanBinds()
  }

  // ------------------------------------------------------------ app icons

  property var iconIndex: ({})
  property var pendingIconIndex: ({})
  property var iconCache: ({})
  property int iconRevision: 0

  function findDesktopEntry(appId) {
    if (!appId) return null
    var candidates = Model.appIdCandidates(appId)
    for (var c = 0; c < candidates.length; c++) {
      var byId = DesktopEntries.byId(candidates[c])
      if (byId) return byId
    }
    var entry = DesktopEntries.heuristicLookup(appId)
    if (entry) return entry

    var host = Model.webAppHost(appId)
    if (host === "") return null
    var apps = DesktopEntries.applications.values
    for (var i = 0; i < apps.length; i++) {
      var exec = String(apps[i].execString || "")
      if (exec.indexOf("//" + host) !== -1) return apps[i]
    }
    return null
  }

  function iconUrl(name) {
    var value = String(name || "")
    if (value === "") return ""
    if (value.indexOf("file://") === 0 || value.indexOf("image://") === 0) return value
    if (value.charAt(0) === "/") return Util.fileUrl(value)
    var indexed = root.iconIndex[value]
    if (indexed) return Util.fileUrl(indexed)
    return Quickshell.iconPath(value, true)
  }

  // Returns { source, name } for an app id; cached until icons rescan.
  function appInfo(appId) {
    root.iconRevision
    var key = Model.appKey(appId)
    var cached = root.iconCache[key]
    if (cached) return cached

    var entry = findDesktopEntry(appId)
    var source = iconUrl(entry && entry.icon ? entry.icon : appId)
    if (source === "" && key !== appId) source = iconUrl(key)
    var info = { source: source, name: entry && entry.name ? String(entry.name) : String(appId || "") }
    root.iconCache[key] = info
    return info
  }

  function invalidateIcons() {
    root.iconCache = ({})
    root.iconRevision++
  }

  function indexIconLine(line) {
    var path = String(line || "").trim()
    if (path === "") return
    var name = Model.iconNameFromPath(path)
    var existing = root.pendingIconIndex[name]
    if (!existing || Model.iconPathScore(path) > Model.iconPathScore(existing))
      root.pendingIconIndex[name] = path
  }

  Process {
    id: iconScan
    // Non-login shell on purpose: a login shell can touch ~/.local/share and
    // retrigger desktop-entry watchers.
    command: ["bash", "-c", [
      'dirs="$HOME/.icons $HOME/.local/share/icons";',
      'IFS=":"; for d in ${XDG_DATA_DIRS:-/usr/local/share:/usr/share}; do dirs="$dirs $d/icons"; done; unset IFS;',
      'for base in $dirs; do [[ -d $base ]] && find "$base" -path "*/apps/*" \\( -name "*.svg" -o -name "*.png" \\) 2>/dev/null; done;',
      'find /usr/share/pixmaps -maxdepth 1 \\( -name "*.svg" -o -name "*.png" \\) 2>/dev/null'
    ].join(" ")]
    stdout: SplitParser { onRead: function(line) { root.indexIconLine(line) } }
    onStarted: root.pendingIconIndex = ({})
    onExited: {
      root.iconIndex = root.pendingIconIndex
      root.invalidateIcons()
    }
  }

  Connections {
    target: DesktopEntries
    function onApplicationsChanged() { iconDebounce.restart() }
  }

  Timer {
    id: iconDebounce
    interval: 1500
    // A new app may bring new icon files: re-index them (the scan's exit
    // also clears the cache). If a scan is running, just clear the cache.
    onTriggered: {
      root.invalidateIcons()
      if (!iconScan.running) iconScan.running = true
    }
  }

  Component.onCompleted: {
    // Touching the list starts Quickshell's desktop-entry scan.
    DesktopEntries.applications.values
    iconScan.running = true
    root.scanBinds()
    Hyprland.refreshToplevels()
    monitorsScan.running = true
    root.syncHerdr()
  }

  // ------------------------------------------------------------ agents chip

  // A pill after the workspaces that sums up every agent, from Herdr and
  // from reporters; clicking it lists them. One list, Herdr's and reporter
  // agents merged newest first and deduplicated (Model.combineAgents), feeds
  // the chip, its popup, the previews, tooltips and notifications.
  readonly property var agentList: Model.combineAgents(root.herdrAgents, root.reporterList)
  readonly property var sortedAgents: root.agentList
  readonly property var agentSummary: Model.agentChipSummary(root.agentList, root.cfg.agentChip)
  readonly property var agentSegments: Model.agentChipSegments(root.agentSummary)
  property bool agentsWanted: false
  // Not tied to the chip being shown: when the last agent goes while the
  // list is open, it stays to say so instead of vanishing under the pointer.
  readonly property bool agentsOpen: agentsWanted && root.cfg.agentStatus && root.cfg.agentChip !== "never" && !root.opened

  // Once closed for any reason (settings opening, agents switched off), it
  // stays closed. Deferred: agentsOpen is still settling at this point.
  onAgentsOpenChanged: {
    if (root.agentsOpen) root.hidePreview()
    else if (root.agentsWanted) Qt.callLater(root.closeAgents)
  }

  function toggleAgents() {
    root.agentsWanted = !root.agentsOpen
  }

  function closeAgents() {
    root.agentsWanted = false
  }

  // Opens or closes the list without a click, e.g. from a keybinding. Opening
  // needs the chip on the bar and the settings panel closed (it would hide the
  // list); closing always works. False when it could not open.
  function toggleAgentsList() {
    if (!root.agentsOpen && (!agentChip.visible || root.opened)) return false
    root.toggleAgents()
    return true
  }

  function agentsTooltip() {
    var head = root.agentsMuted ? "Agents \u00b7 notifications muted" : "Agents"
    return [head].concat(Model.herdrTooltipLines(root.sortedAgents, 48, root.tipNow())).join("\n")
  }

  // Unix seconds for the time-in-state shown in tooltips, or 0 to leave it
  // out ("Agent details" off).
  function tipNow() {
    return root.cfg.agentDetails ? Date.now() / 1000 : 0
  }

  readonly property bool agentsMuted: root.cfg.agentMute && root.cfg.agentNotify !== "off"

  // Unix seconds that agent rows count time in state from. One timer serves
  // every row, and runs only while a list or tooltip showing the time is up.
  property real agentClock: Date.now() / 1000
  // The app icon whose tooltip lists agents, while it is shown.
  property Item agentTipItem: null
  readonly property bool agentClockWanted: root.cfg.agentDetails && root.cfg.agentStatus
    && (root.agentsOpen || (root.previewOpen && preview.showAgents) || agentChip.tooltipHovered || root.agentTipItem !== null)

  // Fresh when a list or tooltip opens; the timer then moves it on.
  onAgentClockWantedChanged: if (root.agentClockWanted) root.agentClock = Date.now() / 1000

  Timer {
    interval: 30000
    repeat: true
    running: root.agentClockWanted
    onTriggered: {
      root.agentClock = Date.now() / 1000
      // A tooltip is text fixed when shown: show it again with the new times.
      if (agentChip.tooltipHovered) root.showTip(agentChip, root.agentsTooltip())
      if (root.agentTipItem) root.agentTipItem.showTooltip()
    }
  }

  // ------------------------------------------------------------ agent notifications

  // A desktop notification when an agent, from Herdr or a reporter, needs
  // input ("blocked") or, with "all", finishes. The rules are in
  // Model.agentAlerts; this part keeps the state they need and sends with
  // notify-send. Each agent's status at the last check, by pane id.
  property var agentSeen: ({})
  // Set while the Herdr feed has not spoken since it (re)started: its first
  // line only sets the baseline for Herdr's agents, never reporter agents'.
  property bool herdrBaseline: true
  // Alerts waiting out the rate limit, sent together as one notification.
  property var agentPending: []
  property real agentLastNotified: 0
  readonly property int notifyGap: 3000

  // With one bar per monitor, every bar runs its own feed. Only the first
  // one notifies, so each alert is sent once.
  function isNotifier() {
    var items = root.bar && typeof root.bar.moduleWidgets === "function" ? root.bar.moduleWidgets(root.moduleName) : []
    return items.length === 0 || items[0] === root
  }

  function notifyOptions() {
    return { mode: root.cfg.agentNotify, muted: root.cfg.agentMute, demo: root.herdrDemo, viewing: root.viewingHerdr() }
  }

  // Called with the full list of both sources whenever either changes:
  // `fromHerdr` for a feed line, false for a reporter change.
  function noteAgentAlerts(fromHerdr) {
    var agents = root.agentList
    var options = root.notifyOptions()
    if (root.herdrBaseline) options.baseline = "herdr"
    if (fromHerdr) root.herdrBaseline = false
    var result = Model.agentAlerts(root.agentSeen, agents, options)
    root.agentSeen = result.seen
    root.closeResolvedNotifications(agents)
    if (!result.alerts.length || !root.isNotifier()) return
    root.agentPending = root.agentPending.concat(result.alerts)
    if (!notifyTimer.running) {
      notifyTimer.interval = Math.max(50, Model.notifyDelay(root.agentLastNotified, Date.now(), root.notifyGap))
      notifyTimer.start()
    }
  }

  function flushAgentAlerts() {
    // Rechecked now: the agent may have moved on, or you may have looked.
    var alerts = Model.pendingAlerts(root.agentPending, root.agentList, root.notifyOptions())
    root.agentPending = []
    var note = Model.agentNotification(alerts)
    if (!note) return
    root.agentLastNotified = Date.now()
    root.sendNotification(note, alerts)
  }

  Timer {
    id: notifyTimer
    onTriggered: root.flushAgentAlerts()
  }

  // notify-send runs from a bash line that exits quietly without it. Text
  // goes in as positional parameters, never into the script. A waiter keeps
  // notify-send running (`--action` waits) so a click can focus the agent;
  // `timeout` ends it after ten minutes whatever happens. With every waiter
  // busy, the notification goes out without a click action.
  readonly property string notifyScript: 'command -v notify-send >/dev/null 2>&1 || exit 0; exec timeout 600 notify-send "$@"'
  readonly property var notifyWaiters: [notifyWaiter1, notifyWaiter2, notifyWaiter3]

  function sendNotification(note, alerts) {
    var waiter = null
    for (var i = 0; i < root.notifyWaiters.length && !waiter; i++)
      if (!root.notifyWaiters[i].running) waiter = root.notifyWaiters[i]
    var command = ["bash", "-c", root.notifyScript, "spaces-notify"].concat(Model.notifyArgs(note, waiter !== null))
    if (!waiter) {
      Quickshell.execDetached(command)
      return
    }
    waiter.paneId = note.pane_id
    waiter.alerts = alerts.map(function(a) { return { pane_id: a.pane_id, kind: a.kind } })
    waiter.command = command
    waiter.running = true
  }

  // A "needs input" notification stays on screen until dismissed. Once
  // none of its agents is in that state any more (you answered it), SIGINT
  // makes notify-send close it. Only called with the full list of both
  // sources: an agent missing from it counts as resolved.
  function closeResolvedNotifications(agents) {
    for (var i = 0; i < root.notifyWaiters.length; i++) {
      var waiter = root.notifyWaiters[i]
      if (waiter.running && waiter.alerts.length && !Model.pendingAlerts(waiter.alerts, agents, { mode: "all" }).length) {
        waiter.alerts = []
        waiter.signal(2)
      }
    }
  }

  // Clicking a notification focuses its agent, as clicking its row does.
  function focusAgentPane(paneId) {
    for (var i = 0; i < root.agentList.length; i++)
      if (root.agentList[i].pane_id === paneId) return root.focusAgent(root.agentList[i])
    // A reporter agent that has gone has no window left to raise.
    if (paneId && String(paneId).indexOf("ipc:") !== 0) root.focusAgent({ pane_id: paneId })
  }

  component NotifyWaiter: Process {
    id: waiter
    property string paneId: ""
    property var alerts: []
    stdout: SplitParser {
      onRead: function(line) { if (String(line).trim() === "default") root.focusAgentPane(waiter.paneId) }
    }
    onExited: alerts = []
  }

  NotifyWaiter { id: notifyWaiter1 }
  NotifyWaiter { id: notifyWaiter2 }
  NotifyWaiter { id: notifyWaiter3 }

  // Reloading the plugin must not leave waiters behind: SIGTERM reaches
  // notify-send through `timeout` and leaves its notification on screen.
  Component.onDestruction: {
    for (var i = 0; i < root.notifyWaiters.length; i++)
      if (root.notifyWaiters[i].running) root.notifyWaiters[i].signal(15)
  }

  // "muted" or "unmuted", for the IPC calls.
  function muteState() {
    return root.cfg.agentMute ? "muted" : "unmuted"
  }

  function applyMute(on) {
    if (on !== root.cfg.agentMute) root.applySetting({ agentMute: on })
    if (on) root.agentPending = []
    return on ? "muted" : "unmuted"
  }

  // Jumps to an agent. A reporter agent: Hyprland focuses its own terminal
  // window, found by PID; no Herdr command runs. A Herdr agent: Herdr
  // focuses its pane, Hyprland the window hosting Herdr. `preferred` windows
  // (the previewed workspace's) are tried first.
  function focusAgent(agent, preferred) {
    if (!agent || !agent.pane_id) return
    if (Model.isReporterAgent(agent)) {
      var target = Model.agentFocusTarget(agent, (preferred || []).concat(root.allWindows))
      if (target.address) root.focusWindow(target.address)
      root.closeAgents()
      root.hidePreview()
      return
    }
    if (root.herdrDemo) {
      // Made-up agents have no pane to focus; just raise the stand-in host.
      if (root.herdrDemoHost) root.focusWindow(root.herdrDemoHost)
      root.closeAgents()
      root.hidePreview()
      return
    }
    root.run("herdr agent focus " + Util.shellQuote(agent.pane_id) + " >/dev/null 2>&1")
    var windows = (preferred || []).slice()
    var ids = Object.keys(root.workspaceMap).sort(function(l, r) { return Number(l) - Number(r) })
    for (var i = 0; i < ids.length; i++) windows = windows.concat(root.workspaceMap[ids[i]].windows)
    var address = Model.herdrHostAddress(windows, root.herdrWindowPids)
    // With one bar per monitor, the Herdr window may be on another monitor.
    if (!address) {
      var all = Hyprland.toplevels.values.map(function(tl) {
        var ipc = tl.lastIpcObject || {}
        return { address: String(tl.address), pid: ipc.pid || 0 }
      })
      address = Model.herdrHostAnywhere(all, root.herdrClientText)
    }
    if (address) root.focusWindow(address)
    root.closeAgents()
    root.hidePreview()
  }

  // ------------------------------------------------------------ previews

  // Hovering a pill of another workspace shows a live miniature of it. One
  // card serves every pill and slides between them.
  // 0 is no workspace: special workspaces have negative ids.
  property int previewWorkspaceId: 0
  property Item previewPill: null
  property bool previewWanted: false
  property string highlightAddress: ""

  readonly property bool previewOpen: previewWanted && previewWorkspaceId !== 0 && !root.opened && !root.agentsOpen
    && root.cfg.previews && !!root.workspaceMap[previewWorkspaceId]
    && root.workspaceMap[previewWorkspaceId].windows.length > 0

  function pillHovered(pill, hovered) {
    if (!root.cfg.previews) return
    if (hovered && !pill.active && pill.occupied) {
      previewHideTimer.stop()
      root.previewPill = pill
      if (root.previewOpen) {
        // Already showing: follow the pointer right away.
        root.previewWorkspaceId = pill.workspaceId
        root.placePreviewAnchor(true)
      } else {
        previewShowTimer.restart()
      }
    } else if (!hovered) {
      previewShowTimer.stop()
      previewHideTimer.restart()
    }
  }

  function hidePreview() {
    previewShowTimer.stop()
    previewHideTimer.stop()
    root.previewWanted = false
    root.highlightAddress = ""
  }

  function placePreviewAnchor(animate) {
    var pill = root.previewPill
    if (!pill) return
    var p = pill.mapToItem(root, 0, 0)
    previewAnchor.animate = animate
    previewAnchor.x = p.x
    previewAnchor.y = p.y
    previewAnchor.width = pill.width
    previewAnchor.height = pill.height
  }

  Timer {
    id: previewShowTimer
    interval: 380
    onTriggered: {
      if (!root.previewPill) return
      root.previewWorkspaceId = root.previewPill.workspaceId
      root.placePreviewAnchor(false)
      root.previewWanted = true
    }
  }

  Timer {
    id: previewHideTimer
    interval: 200
    onTriggered: if (!preview.containsMouse) root.hidePreview()
  }

  // Opens the preview for a workspace without hovering, e.g. from a
  // keybinding. Closes on its own unless the pointer moves onto the card.
  // Unlike hovering, the active workspace may be peeked too, on purpose.
  // False when nothing would show: previews off, settings or the agent list
  // open, or an empty workspace.
  function peek(id) {
    if (!root.cfg.previews || root.opened || root.agentsOpen) return false
    var idx = root.workspaceIds.indexOf(Number(id))
    var pill = idx >= 0 ? pillRepeater.itemAt(idx) : null
    if (!pill || !pill.occupied) return false
    previewHideTimer.stop()
    root.previewPill = pill
    root.previewWorkspaceId = pill.workspaceId
    root.placePreviewAnchor(root.previewOpen)
    root.previewWanted = true
    peekTimer.restart()
    return true
  }

  Timer {
    id: peekTimer
    interval: 2500
    onTriggered: if (!preview.containsMouse) root.hidePreview()
  }

  onOpenedChanged: if (opened) { hidePreview(); closeAgents(); checkClaudeHooks() }

  // Whether the Claude Code hooks are in Claude Code's settings, for a
  // read-only line in the settings panel. Only reads; never installs.
  property string claudeHooks: ""
  property string claudeHooksLine: ""
  readonly property string claudeHooksInstaller: Model.localPath(Qt.resolvedUrl("hooks/install-claude-hooks"))

  function checkClaudeHooks() {
    if (!root.cfg.agentStatus || claudeHooksCheck.running) return
    claudeHooksCheck.running = true
  }

  Process {
    id: claudeHooksCheck
    command: ["bash", "-c", 'command -v python3 >/dev/null 2>&1 || exit 0; exec timeout 5 python3 "$1" status --short',
      "spaces-claude-hooks", root.claudeHooksInstaller]
    stdout: SplitParser { onRead: function(line) { root.claudeHooksLine = String(line).trim() } }
    onStarted: root.claudeHooksLine = ""
    onExited: {
      var value = root.claudeHooksLine
      root.claudeHooks = value === "installed" || value === "partial" || value === "not installed" ? value : ""
    }
  }

  // ------------------------------------------------------------ IPC

  // One IPC handler serves every monitor's bar, so reports go to all of them.
  function agentWidgets() {
    var items = root.bar && typeof root.bar.moduleWidgets === "function" ? root.bar.moduleWidgets(root.moduleName) : [root]
    if (items.indexOf(root) === -1) items = items.concat([root])
    return items
  }

  IpcHandler {
    target: "cyperx84.spaces"

    function open(): void { root.open() }
    function close(): void { root.close() }
    function show(): void { root.open() }
    function hide(): void { root.close() }
    function toggle(): void { root.toggle() }
    function peek(workspace: string): string { return root.peek(workspace) ? "ok" : "empty" }
    function agents(): string { return root.toggleAgentsList() ? "ok" : "empty" }
    function mute(): string { return root.applyMute(!root.cfg.agentMute) }
    // IPC arguments are never optional, hence a second method to set it.
    function setMute(state: string): string {
      var on = Model.parseOnOff(state)
      return on === null ? root.muteState() : root.applyMute(on)
    }
    function agent(session: string, state: string, pids: string): void {
      var items = root.agentWidgets()
      for (var i = 0; i < items.length; i++) if (items[i] && typeof items[i].applyAgent === "function") items[i].applyAgent(session, state, pids)
    }
    // agent() with the agent's name, a title, its working directory, a line
    // of activity and the time the report was made (unix milliseconds, or ""
    // for now), all untrusted plain text. Returns "ok", or "ignored" for a
    // bad session or state.
    function report(session: string, state: string, pids: string, agent: string, title: string, cwd: string, activity: string, time: string): string {
      if (!Model.reportAccepted(session, state)) return "ignored"
      var items = root.agentWidgets()
      for (var i = 0; i < items.length; i++)
        if (items[i] && typeof items[i].applyReport === "function") items[i].applyReport(session, state, pids, agent, title, cwd, activity, time)
      return "ok"
    }
  }

  // ------------------------------------------------------------ bar widget

  implicitWidth: vertical ? barSize : pillFlow.implicitWidth + trailingGap
  implicitHeight: vertical ? pillFlow.implicitHeight : barSize

  HoverHandler { id: widgetHover }

  // Right-click anywhere opens settings; wheel steps workspaces. Pills and
  // icons only take the left button, so other buttons fall through to here.
  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.RightButton | Qt.MiddleButton
    onClicked: function(mouse) { if (mouse.button === Qt.RightButton) root.toggle() }
    onWheel: function(wheel) { root.scrollBy(wheel) }
  }

  Grid {
    id: pillFlow
    anchors.left: parent.left
    anchors.top: parent.top
    anchors.leftMargin: root.vertical ? Math.round((root.barSize - root.pillThickness) / 2) : 0
    anchors.topMargin: root.vertical ? 0 : Math.round((root.barSize - root.pillThickness) / 2)
    // Gear, every pill (numbered and special), agents chip.
    columns: root.vertical ? 1 : Math.max(1, root.pillIds.length + 2)
    spacing: Style.space(root.metrics.gap)

    // Reserve the leading slot so workspace expansion cannot move the target.
    // Hover mode only fades the artwork; its hit area stays the same size.
    Item {
      id: gear
      objectName: "spacesSettingsGear"
      readonly property bool shown: root.opened || root.cfg.settingsButton === "always"
        || (root.cfg.settingsButton === "hover" && root.widgetHovered)
      readonly property real size: Math.max(root.pillThickness, Style.space(28))
      // The bar only shows a tooltip while its target says it is hovered.
      readonly property bool tooltipHovered: gearMouse.containsMouse
      visible: root.cfg.settingsButton !== "never"
      implicitWidth: root.vertical ? root.pillThickness : size
      implicitHeight: root.vertical ? size : root.pillThickness
      width: implicitWidth
      height: implicitHeight
      opacity: shown ? 1 : 0
      Behavior on opacity { enabled: root.dur > 0; NumberAnimation { duration: root.dur } }

      Rectangle {
        anchors.fill: parent
        radius: root.pillRadius
        color: root.opened ? root.activeFill() : gearMouse.containsMouse ? Util.alpha(root.fg, 0.12) : "transparent"
        Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
      }

      Text {
        anchors.centerIn: parent
        text: "\uf013"
        color: root.opened ? root.activeText() : root.fg
        opacity: root.opened || gearMouse.containsMouse ? 1 : 0.6
        rotation: root.opened ? 90 : 0
        font.family: root.fontFamily
        font.pixelSize: Style.font.body
        Behavior on rotation { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
      }

      MouseArea {
        id: gearMouse
        anchors.fill: parent
        // Use the full bar thickness for the pointer target.
        anchors.leftMargin: root.vertical ? -(root.barSize - root.pillThickness) / 2 : 0
        anchors.rightMargin: anchors.leftMargin
        anchors.topMargin: root.vertical ? 0 : -(root.barSize - root.pillThickness) / 2
        anchors.bottomMargin: anchors.topMargin
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: root.toggle()
        onContainsMouseChanged: containsMouse ? root.showTip(gear, "Spaces settings") : root.hideTip(gear)
      }
    }

    Repeater {
      id: pillRepeater
      model: ScriptModel { values: root.pillIds }

      delegate: Item {
        id: pill

        required property var modelData
        readonly property int workspaceId: Number(modelData)
        readonly property var workspace: root.workspaceMap[workspaceId] || ({ id: workspaceId, windows: [] })
        // A special workspace (negative id): toggled, not focused, and
        // "active" while it is shown on this bar's monitor.
        readonly property bool isSpecial: workspaceId < 0
        readonly property var special: isSpecial ? (root.specialById[workspaceId] || null) : null
        readonly property string specialName: special ? special.name : (workspace.name || "")
        readonly property bool active: isSpecial ? (special !== null && special.shown) : workspaceId === root.currentWorkspaceId
        onActiveChanged: if (active && root.previewWorkspaceId === workspaceId) root.hidePreview()
        readonly property bool occupied: workspace.windows.length > 0
        readonly property bool hovered: pillHover.hovered
        onHoveredChanged: root.pillHovered(pill, hovered)
        readonly property bool showApps: Model.showsApps(root.cfg, occupied, active, hovered)
        readonly property bool urgent: {
          if (active) return false
          if (root.agentStateFor(workspace.windows.map(function(w) { return w.address })) === "waiting") return true
          if (!root.cfg.urgentHighlight) return false
          for (var i = 0; i < workspace.windows.length; i++)
            if (root.isUrgent(workspace.windows[i].address)) return true
          return false
        }
        readonly property var iconData: Model.iconItems(workspace.windows, root.cfg.groupApps, root.cfg.maxIcons)
        readonly property var itemMap: {
          var map = ({})
          for (var i = 0; i < iconData.items.length; i++) map[iconData.items[i].key] = iconData.items[i]
          return map
        }
        readonly property var itemKeys: iconData.items.map(function(item) { return item.key })
        readonly property color textColor: active ? root.activeText() : root.fg
        readonly property var keys: isSpecial ? null : (root.keyBinds[workspaceId] || null)
        // Special pills keep their label in every label style: without it an
        // empty, shown scratchpad would be a blank pill.
        readonly property string label: isSpecial ? Model.specialLabel(specialName)
          : Model.workspaceLabel(workspaceId, active, root.cfg.labelStyle, keys)
        readonly property string caption: isSpecial ? "" : Model.workspaceCaption(workspaceId, root.cfg.labelStyle, keys)

        // Shortcut tooltip: on the pill itself, not over its icons (they have
        // their own), and never on top of this pill's preview card.
        property Item hoveredIcon: null
        // A special pill's tooltip names it (its label may be a glyph), with
        // the toggle and move keys when shortcut tooltips are on.
        readonly property string keyTip: isSpecial
          ? (root.cfg.keyTooltips || root.cfg.tooltips
            ? Model.specialTooltip(specialName, root.cfg.keyTooltips ? root.specialKeys[Model.specialName(specialName)] : null) : "")
          : root.cfg.keyTooltips ? Model.keyTooltip(workspaceId, keys) : ""
        readonly property bool tooltipHovered: hovered && hoveredIcon === null && keyTip !== ""
          && !(root.previewOpen && root.previewWorkspaceId === workspaceId)
        onTooltipHoveredChanged: tooltipHovered ? root.showTip(pill, keyTip, true) : root.hideTip(pill)
        readonly property real pad: Style.space(label === "" ? 3 : root.metrics.pad)

        // Appear animation lives on the delegate: positioner add transitions
        // can be interrupted and leave items stuck half faded. No binding on
        // root.dur: changing the animation speed would hide every pill.
        property real appear: 1
        opacity: appear
        scale: 0.6 + 0.4 * appear
        Component.onCompleted: if (root.dur > 0) { appear = 0; pillAppear.start() }
        NumberAnimation { id: pillAppear; target: pill; property: "appear"; to: 1; duration: root.dur; easing.type: Easing.OutBack }

        width: implicitWidth
        height: implicitHeight
        implicitWidth: root.vertical ? root.pillThickness : content.implicitWidth + pad * 2
        implicitHeight: root.vertical ? content.implicitHeight + pad * 2 : root.pillThickness

        Behavior on implicitWidth { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
        Behavior on implicitHeight { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }

        // Urgent pulse, under the regular fill so the active style still reads.
        Rectangle {
          id: urgentGlow
          anchors.fill: parent
          radius: root.pillRadius
          color: root.bar ? root.bar.urgent : Color.urgent
          opacity: 0
          visible: pill.urgent

          SequentialAnimation on opacity {
            running: pill.urgent
            loops: Animation.Infinite
            NumberAnimation { from: 0.15; to: 0.55; duration: 700; easing.type: Easing.InOutSine }
            NumberAnimation { from: 0.55; to: 0.15; duration: 700; easing.type: Easing.InOutSine }
          }
        }

        Rectangle {
          anchors.fill: parent
          radius: root.pillRadius
          color: pill.active ? root.activeFill()
            : root.cfg.pillBackground
              ? (pill.hovered ? Util.alpha(root.fg, 0.12)
                : pill.occupied ? Util.alpha(root.fg, 0.06)
                : "transparent")
              : "transparent"
          Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
        }

        HoverHandler { id: pillHover }

        MouseArea {
          id: pillMouse
          anchors.fill: parent
          hoverEnabled: true
          acceptedButtons: Qt.LeftButton
          cursorShape: Qt.PointingHandCursor
          onClicked: {
            root.hidePreview()
            if (pill.isSpecial) root.toggleSpecial(pill.specialName)
            else root.clickWorkspace(pill.workspaceId)
          }
          onWheel: function(wheel) { root.scrollBy(wheel) }
        }

        Grid {
          id: content
          anchors.centerIn: parent
          columns: root.vertical ? 1 : 2
          horizontalItemAlignment: Grid.AlignHCenter
          verticalItemAlignment: Grid.AlignVCenter
          spacing: pill.label !== "" && iconClip.shownExtent > 0 ? Style.space(5) : 0

          // The label, with the switch key as a small caption in the
          // "both" style: after the number across, under it when stacked.
          Item {
            id: labelBox
            readonly property bool captioned: pill.caption !== ""
            readonly property real captionGap: Style.space(2)
            visible: pill.label !== ""
            opacity: pill.occupied || pill.active ? 1 : 0.5
            implicitWidth: root.vertical
              ? Math.max(labelText.implicitWidth, captioned ? captionText.implicitWidth : 0)
              : labelText.implicitWidth + (captioned ? captionGap + captionText.implicitWidth : 0)
            implicitHeight: root.vertical && captioned
              ? labelText.implicitHeight + captionText.implicitHeight - captionGap
              : labelText.implicitHeight
            Behavior on opacity { enabled: root.fastDur > 0; NumberAnimation { duration: root.fastDur } }

            Text {
              id: labelText
              x: root.vertical ? Math.round((labelBox.width - implicitWidth) / 2) : 0
              text: pill.label
              textFormat: Text.PlainText
              color: pill.textColor
              font.family: root.fontFamily
              font.pixelSize: Style.font.body
              font.bold: pill.active
              Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
            }

            Text {
              id: captionText
              visible: labelBox.captioned
              x: root.vertical ? Math.round((labelBox.width - implicitWidth) / 2) : labelText.x + labelText.implicitWidth + labelBox.captionGap
              y: root.vertical ? labelText.implicitHeight - labelBox.captionGap : labelText.baselineOffset - baselineOffset
              text: pill.caption
              textFormat: Text.PlainText
              color: pill.textColor
              opacity: 0.7
              font.family: root.fontFamily
              font.pixelSize: Math.max(7, Math.round(Style.font.body * 0.7))
              font.bold: pill.active
              Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
            }
          }

          // The icon strip is clipped and its extent animates, so icons slide
          // out of the pill rather than popping in.
          Item {
            id: iconClip
            readonly property real fullExtent: root.vertical ? icons.implicitHeight : icons.implicitWidth
            property real shownExtent: pill.showApps ? fullExtent : 0
            Behavior on shownExtent { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }

            implicitWidth: root.vertical ? icons.implicitWidth : shownExtent
            implicitHeight: root.vertical ? shownExtent : icons.implicitHeight
            clip: true
            opacity: pill.showApps ? 1 : 0
            Behavior on opacity { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }

            Grid {
              id: icons
              columns: root.vertical ? 1 : Math.max(1, pill.itemKeys.length + 1)
              spacing: Style.space(root.metrics.iconGap)
              verticalItemAlignment: Grid.AlignVCenter
              horizontalItemAlignment: Grid.AlignHCenter

              move: Transition {
                enabled: root.dur > 0
                NumberAnimation { properties: "x,y"; duration: root.dur; easing.type: Easing.OutCubic }
              }

              Repeater {
                model: ScriptModel { values: pill.itemKeys }

                delegate: Item {
                  id: appIcon

                  required property var modelData
                  readonly property var item: pill.itemMap[modelData] || null
                  readonly property var info: item ? root.appInfo(item.appId) : ({ source: "", name: "" })
                  readonly property bool focusedHere: !!item && item.focused && pill.active
                  readonly property bool highlightFocused: focusedHere && pill.itemKeys.length > 1
                  readonly property string titleText: root.cfg.focusedTitle && focusedHere && !root.vertical
                    ? Model.focusedLabel(item, info.name, root.cfg.titleLength) : ""
                  readonly property bool hovered: iconMouse.containsMouse
                  readonly property bool tooltipHovered: hovered
                  onHoveredChanged: {
                    if (hovered) pill.hoveredIcon = appIcon
                    else if (pill.hoveredIcon === appIcon) pill.hoveredIcon = null
                  }
                  readonly property string agentState: item ? root.agentStateFor(item.addresses) : ""
                  readonly property bool herdrHost: !!item && root.herdrAgents.length > 0 && root.herdrHosted(item.addresses)
                  // Herdr's agents on the Herdr window, and reporter agents
                  // whose window this is.
                  readonly property var windowAgents: item ? Model.agentsForWindows(root.agentList, root.pidSet(item.addresses), herdrHost) : []
                  readonly property int liveCount: Model.liveAgentCount(windowAgents)
                  Component.onDestruction: if (root.agentTipItem === appIcon) root.agentTipItem = null

                  // Window title, agent status and one line per agent on
                  // this window with its time in state.
                  function showTooltip() {
                    if (!appIcon.item || root.previewOpen) return
                    var tip = appIcon.item.title || appIcon.info.name
                    if (appIcon.item.count > 1) tip = appIcon.info.name + " (" + appIcon.item.count + " windows)"
                    var agentText = { working: "Agent working", waiting: "Agent needs your input", done: "Agent finished" }[appIcon.agentState]
                    if (agentText) tip = agentText + " \u00b7 " + tip
                    var hasAgents = appIcon.windowAgents.length > 0
                    if (hasAgents) tip = [tip].concat(Model.herdrTooltipLines(appIcon.windowAgents, 48, root.tipNow())).join("\n")
                    root.agentTipItem = hasAgents ? appIcon : null
                    root.showTip(appIcon, tip)
                  }

                  implicitWidth: iconRow.implicitWidth + Style.space(4)
                  implicitHeight: Math.max(root.iconPx, iconRow.implicitHeight) + Style.space(4)
                  width: implicitWidth
                  height: implicitHeight
                  property real dim: root.cfg.dimUnfocused && pill.active && !focusedHere && !hovered ? 0.5 : 1
                  Behavior on dim { enabled: root.fastDur > 0; NumberAnimation { duration: root.fastDur } }
                  property real appear: 1
                  opacity: Math.min(1, appear)
                  scale: 0.4 + 0.6 * appear
                  Component.onCompleted: if (root.dur > 0) { appear = 0; iconAppear.start() }
                  NumberAnimation { id: iconAppear; target: appIcon; property: "appear"; to: 1; duration: root.dur; easing.type: Easing.OutBack }
                  Behavior on implicitWidth { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }

                  Rectangle {
                    anchors.fill: parent
                    radius: Style.cornerRadius > 0 ? Style.space(5) : 0
                    color: appIcon.highlightFocused || appIcon.hovered ? Util.alpha(pill.textColor, 0.18) : "transparent"
                    Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
                  }

                  Row {
                    id: iconRow
                    anchors.centerIn: parent
                    spacing: Style.space(4)

                    Item {
                      width: root.iconPx
                      height: root.iconPx
                      scale: appIcon.hovered ? 1.12 : 1
                      Behavior on scale { enabled: root.fastDur > 0; NumberAnimation { duration: root.fastDur; easing.type: Easing.OutCubic } }

                      Image {
                        id: iconImage
                        anchors.fill: parent
                        source: appIcon.info.source
                        // Decode well above the drawn size: these land at
                        // roughly 16px on the bar, where every sample counts.
                        sourceSize.width: root.iconPx * 3
                        sourceSize.height: root.iconPx * 3
                        fillMode: Image.PreserveAspectFit
                        smooth: true
                        // mipmap softens at this size, and nothing here is
                        // downscaled far enough to need it.
                        mipmap: false
                        asynchronous: true
                        visible: status === Image.Ready
                        opacity: appIcon.dim
                        layer.enabled: root.cfg.iconStyle === "mono"
                        // Without an explicit size the layer is rasterised at
                        // the item's logical size, throwing the extra detail
                        // away before the effect ever samples it.
                        layer.textureSize: Qt.size(root.iconPx * 3, root.iconPx * 3)
                        layer.smooth: true
                        layer.effect: MultiEffect { saturation: -1.0 }
                      }

                      // Letter tile when no icon could be resolved.
                      Rectangle {
                        anchors.fill: parent
                        visible: iconImage.status !== Image.Ready
                        opacity: appIcon.dim
                        radius: Style.cornerRadius > 0 ? width * 0.25 : 0
                        color: Util.alpha(pill.textColor, 0.2)
                        Text {
                          anchors.centerIn: parent
                          text: Model.fallbackLetter(appIcon.info.name, appIcon.item ? appIcon.item.appId : "")
                          color: pill.textColor
                          font.family: root.fontFamily
                          font.pixelSize: Math.round(root.iconPx * 0.62)
                          font.bold: true
                        }
                      }

                      // Attention dot for windows that asked to be looked at.
                      Rectangle {
                        visible: appIcon.agentState === "" && appIcon.item !== null && appIcon.item.addresses.some(function(a) { return root.isUrgent(a) })
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.rightMargin: -Style.space(2)
                        anchors.topMargin: -Style.space(2)
                        width: Math.max(5, Math.round(root.iconPx * 0.36))
                        height: width
                        radius: width / 2
                        color: root.bar ? root.bar.urgent : Color.urgent
                        border.width: 1
                        border.color: root.bg
                      }

                      // Agent badge: spinner while working, pulse when it
                      // needs input, check mark when done.
                      AgentBadge {
                        id: agentBadge
                        visible: appIcon.agentState !== "" && appIcon.agentState !== "idle"
                        agentState: appIcon.agentState
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.rightMargin: -Style.space(3)
                        anchors.topMargin: -Style.space(2)
                        width: Math.max(8, Math.round(root.iconPx * 0.6))
                      }

                      // How many agents on this window are live, beside the
                      // badge, once there is more than one.
                      Rectangle {
                        visible: agentBadge.visible && appIcon.liveCount > 1
                        anchors.right: agentBadge.left
                        anchors.verticalCenter: agentBadge.verticalCenter
                        anchors.rightMargin: -Style.space(1)
                        width: Math.max(height, herdrCount.implicitWidth + Style.space(3))
                        height: Math.round(root.iconPx * 0.5)
                        radius: height / 2
                        color: root.fg
                        border.width: 1
                        border.color: root.bg
                        Text {
                          id: herdrCount
                          anchors.centerIn: parent
                          text: String(appIcon.liveCount)
                          color: root.bg
                          font.family: root.fontFamily
                          font.pixelSize: Math.max(7, Math.round(root.iconPx * 0.42))
                          font.bold: true
                        }
                      }

                      // Window count for grouped apps.
                      Rectangle {
                        visible: appIcon.item !== null && appIcon.item.count > 1
                        anchors.right: parent.right
                        anchors.bottom: parent.bottom
                        anchors.rightMargin: -Style.space(3)
                        anchors.bottomMargin: -Style.space(2)
                        width: Math.max(height, countText.implicitWidth + Style.space(4))
                        height: Math.round(root.iconPx * 0.6)
                        radius: height / 2
                        color: root.fg
                        Text {
                          id: countText
                          anchors.centerIn: parent
                          text: appIcon.item ? String(appIcon.item.count) : ""
                          color: root.bg
                          font.family: root.fontFamily
                          font.pixelSize: Math.max(7, Math.round(root.iconPx * 0.45))
                          font.bold: true
                        }
                      }
                    }

                    Text {
                      visible: appIcon.titleText !== ""
                      opacity: appIcon.dim
                      anchors.verticalCenter: parent.verticalCenter
                      text: appIcon.titleText
                      textFormat: Text.PlainText
                      color: pill.textColor
                      font.family: root.fontFamily
                      font.pixelSize: Style.font.bodySmall
                      font.bold: true
                    }
                  }

                  MouseArea {
                    id: iconMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    acceptedButtons: root.cfg.middleClickClose ? (Qt.LeftButton | Qt.MiddleButton) : Qt.LeftButton
                    cursorShape: Qt.PointingHandCursor
                    onClicked: function(mouse) {
                      if (!appIcon.item) return
                      if (mouse.button === Qt.MiddleButton) root.closeWindow(appIcon.item.address)
                      else root.activateItem(appIcon.item)
                    }
                    onWheel: function(wheel) { root.scrollBy(wheel) }
                    onContainsMouseChanged: {
                      root.highlightAddress = containsMouse && appIcon.item ? appIcon.item.address : ""
                      if (containsMouse && appIcon.item) {
                        appIcon.showTooltip()
                      } else {
                        if (root.agentTipItem === appIcon) root.agentTipItem = null
                        root.hideTip(appIcon)
                      }
                    }
                  }
                }
              }

              // "+N" chip for windows beyond maxIcons.
              Text {
                visible: pill.iconData.overflow > 0
                text: "+" + pill.iconData.overflow
                color: pill.textColor
                opacity: 0.8
                font.family: root.fontFamily
                font.pixelSize: Style.font.caption
                font.bold: true
              }
            }
          }
        }
      }
    }

    // Every agent at a glance, after the workspaces: how many are waiting,
    // working and done. Click to list them. Works without Herdr as long as
    // a reporter (hooks/claude-hook) has agents.
    Item {
      id: agentChip
      objectName: "spacesAgentChip"
      readonly property bool hovered: chipMouse.containsMouse
      readonly property bool waiting: root.agentSummary.waiting > 0
      readonly property color textColor: root.agentsOpen ? root.activeText() : root.fg
      readonly property real pad: Style.space(root.metrics.pad)
      // The bar only shows a tooltip while its target says it is hovered.
      readonly property bool tooltipHovered: hovered && !root.agentsOpen
      onTooltipHoveredChanged: tooltipHovered ? root.showTip(agentChip, root.agentsTooltip()) : root.hideTip(agentChip)
      visible: root.cfg.agentStatus && root.agentSummary.visible

      // Same appear animation as the pills, each time the chip turns up.
      property real appear: 1
      opacity: appear
      scale: 0.6 + 0.4 * appear
      onVisibleChanged: if (visible && root.dur > 0) { appear = 0; chipAppear.start() }
      NumberAnimation { id: chipAppear; target: agentChip; property: "appear"; to: 1; duration: root.dur; easing.type: Easing.OutBack }

      width: implicitWidth
      height: implicitHeight
      implicitWidth: root.vertical ? Math.max(root.pillThickness, chipContent.implicitWidth + Style.space(2)) : chipContent.implicitWidth + pad * 2
      implicitHeight: root.vertical ? chipContent.implicitHeight + pad * 2 : root.pillThickness

      Behavior on implicitWidth { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
      Behavior on implicitHeight { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }

      // Pulses like an urgent pill while an agent waits for input.
      Rectangle {
        anchors.fill: parent
        radius: root.pillRadius
        color: root.bar ? root.bar.urgent : Color.urgent
        opacity: 0
        visible: agentChip.waiting

        SequentialAnimation on opacity {
          running: agentChip.waiting && agentChip.visible
          loops: Animation.Infinite
          NumberAnimation { from: 0.15; to: 0.55; duration: 700; easing.type: Easing.InOutSine }
          NumberAnimation { from: 0.55; to: 0.15; duration: 700; easing.type: Easing.InOutSine }
        }
      }

      Rectangle {
        anchors.fill: parent
        radius: root.pillRadius
        color: root.agentsOpen ? root.activeFill()
          : agentChip.hovered ? Util.alpha(root.fg, 0.12)
          : root.cfg.pillBackground ? Util.alpha(root.fg, 0.06)
          : "transparent"
        Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
      }

      MouseArea {
        id: chipMouse
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.LeftButton
        cursorShape: Qt.PointingHandCursor
        onClicked: root.toggleAgentsList()
        onWheel: function(wheel) { root.scrollBy(wheel) }
      }

      Grid {
        id: chipContent
        anchors.centerIn: parent
        columns: root.vertical ? 1 : root.agentSegments.length + 1 + (root.agentsMuted ? 1 : 0)
        horizontalItemAlignment: Grid.AlignHCenter
        verticalItemAlignment: Grid.AlignVCenter
        spacing: Style.space(4)

        Text {
          text: "\uf120"
          color: agentChip.textColor
          opacity: root.agentsOpen || agentChip.hovered ? 1 : 0.8
          font.family: root.fontFamily
          font.pixelSize: Style.font.body
          Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
        }

        Repeater {
          model: root.agentSegments

          // Count beside its badge, or above it in a vertical bar so two
          // digits still fit the bar's width.
          delegate: Grid {
            required property var modelData
            columns: root.vertical ? 1 : 2
            horizontalItemAlignment: Grid.AlignHCenter
            verticalItemAlignment: Grid.AlignVCenter
            spacing: Style.space(2)

            Text {
              text: String(modelData.count)
              color: agentChip.textColor
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
            }

            AgentBadge {
              visible: modelData.state !== ""
              agentState: modelData.state
              width: Math.max(8, Math.round(root.iconPx * 0.6))
            }
          }
        }

        // Bell with a slash while agent notifications are muted.
        Text {
          visible: root.agentsMuted
          text: "\uf1f6"
          color: agentChip.textColor
          opacity: 0.6
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }
      }
    }
  }

  // ------------------------------------------------------------ preview card

  // Invisible stand-in for the hovered pill. The card anchors to it, so
  // animating it slides the card from pill to pill.
  Item {
    id: previewAnchor
    property bool animate: false
    visible: false

    Behavior on x { enabled: previewAnchor.animate && root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
    Behavior on y { enabled: previewAnchor.animate && root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
    onXChanged: if (preview.visible) preview.anchor.updateAnchor()
    onYChanged: if (preview.visible) preview.anchor.updateAnchor()
  }

  // Popup coordination stays out of it: a hover preview must never close
  // another widget's open panel.
  QtObject {
    id: previewBar
    readonly property string position: root.bar ? root.bar.position : "top"
    property var activePopout: null
    function requestPopout(owner) {}
    function releasePopout(owner) {}
  }

  PopupCard {
    id: preview
    anchorItem: previewAnchor
    bar: previewBar
    triggerMode: "hover"
    open: root.previewOpen

    readonly property var workspace: root.workspaceMap[root.previewWorkspaceId] || null
    readonly property var area: workspace ? workspace.area : null
    readonly property real desiredMapWidth: Style.space(Model.previewWidth(root.cfg.previewSize))
    readonly property real horizontalInset: padding * 2 + Style.space(4)
    // Agent rows on the card of a workspace holding the Herdr window (all of
    // Herdr's agents) or a reporter agent's window (that agent).
    readonly property var agentRows: {
      if (!workspace) return []
      var addresses = workspace.windows.map(function(w) { return w.address })
      return Model.agentsForWindows(root.agentList, root.pidSet(addresses), root.herdrAgents.length > 0 && root.herdrHosted(addresses))
    }
    readonly property bool showAgents: agentRows.length > 0
    readonly property real chromeHeight: previewHeader.implicitHeight + previewFooter.implicitHeight
      + previewColumn.spacing * 2 + verticalContentInset
      + (showAgents ? previewAgents.implicitHeight + previewColumn.spacing : 0)
    readonly property var mapSize: Model.previewDimensions(area, desiredMapWidth,
      availableCardWidth > 0 ? Math.max(1, availableCardWidth - horizontalInset) : desiredMapWidth,
      availableCardHeight > 0 ? Math.max(1, availableCardHeight - chromeHeight) : Infinity)
    readonly property real mapWidth: mapSize.width
    readonly property real mapHeight: mapSize.height

    contentWidth: preview.fittedContentWidth(mapWidth + horizontalInset)
    contentHeight: preview.fittedContentHeight(previewColumn.implicitHeight)

    onContainsMouseChanged: {
      if (containsMouse) previewHideTimer.stop()
      else previewHideTimer.restart()
    }

    // Popups get no compositor blur, so the card needs its own opaque fill.
    Rectangle {
      anchors.fill: parent
      anchors.margins: -Math.max(0, preview.padding - Style.space(2))
      radius: Math.max(0, Style.cornerRadius - Style.space(2))
      color: Qt.rgba(root.bg.r, root.bg.g, root.bg.b, 0.97)
    }

    Column {
      id: previewColumn
      anchors.horizontalCenter: parent.horizontalCenter
      spacing: Style.space(8)
      scale: preview.open ? 1 : 0.96
      transformOrigin: previewBar.position === "bottom" ? Item.Bottom : Item.Top
      Behavior on scale { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }

      Item {
        id: previewHeader
        width: preview.mapWidth
        implicitHeight: Math.max(previewTitle.implicitHeight, previewCount.implicitHeight)

        Text {
          id: previewTitle
          anchors.left: parent.left
          anchors.right: previewCount.left
          anchors.rightMargin: Style.space(8)
          anchors.verticalCenter: parent.verticalCenter
          text: preview.workspace && preview.workspace.special ? Model.specialTitle(preview.workspace.name)
            : "Workspace " + (root.previewWorkspaceId === 10 ? "0" : root.previewWorkspaceId)
          textFormat: Text.PlainText
          color: root.fg
          font.family: root.fontFamily
          font.pixelSize: Style.font.body
          font.bold: true
          elide: Text.ElideRight
        }

        Text {
          id: previewCount
          anchors.right: parent.right
          anchors.verticalCenter: parent.verticalCenter
          readonly property int count: preview.workspace ? preview.workspace.windows.length : 0
          text: count + (count === 1 ? " WINDOW" : " WINDOWS")
          color: Qt.darker(root.fg, 1.4)
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          font.bold: true
          font.letterSpacing: 1.2
        }
      }

      // The miniature. Rebuilt per workspace so switching pills crossfades.
      Item {
        id: miniature
        width: preview.mapWidth
        height: preview.mapHeight

        Rectangle {
          anchors.fill: parent
          radius: Style.cornerRadius > 0 ? Style.space(6) : 0
          color: Util.alpha(root.fg, 0.05)
          border.width: 1
          border.color: Util.alpha(root.fg, 0.08)
        }

        Loader {
          id: miniatureLoader
          anchors.fill: parent
          active: preview.visible && preview.workspace !== null
          sourceComponent: miniatureComponent
        }

        Connections {
          target: root
          function onPreviewWorkspaceIdChanged() {
            if (!preview.visible || root.dur === 0) return
            swapAnimation.restart()
          }
        }

        ParallelAnimation {
          id: swapAnimation
          NumberAnimation { target: miniatureLoader; property: "opacity"; from: 0.35; to: 1; duration: root.dur; easing.type: Easing.OutCubic }
          NumberAnimation { target: miniatureLoader; property: "scale"; from: 0.97; to: 1; duration: root.dur; easing.type: Easing.OutCubic }
        }
      }

      // One row per agent on this workspace; click one to jump to it. Left
      // out entirely for other workspaces, so their card keeps its usual layout.
      Column {
        id: previewAgents
        readonly property int maxRows: 5
        width: preview.mapWidth
        visible: preview.showAgents
        spacing: Style.space(1)

        Repeater {
          model: preview.agentRows.slice(0, previewAgents.maxRows)

          delegate: Item {
            id: stripRow
            required property var modelData
            width: previewAgents.width
            implicitHeight: Math.max(stripLabel.implicitHeight, stripDot.height) + Style.space(6)

            Rectangle {
              anchors.fill: parent
              radius: Style.cornerRadius > 0 ? Style.space(5) : 0
              color: stripMouse.containsMouse ? Util.alpha(root.fg, 0.1) : "transparent"
              Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
            }

            AgentBadge {
              id: stripDot
              anchors.left: parent.left
              anchors.leftMargin: Style.space(4)
              anchors.verticalCenter: parent.verticalCenter
              agentState: Model.herdrBarState(stripRow.modelData.status)
              width: Math.max(8, Math.round(root.iconPx * 0.55))
            }

            Text {
              id: stripLabel
              anchors.left: stripDot.right
              anchors.leftMargin: Style.space(6)
              anchors.verticalCenter: parent.verticalCenter
              width: Math.min(implicitWidth, parent.width * 0.35)
              text: stripRow.modelData.workspace_label || ("Workspace " + stripRow.modelData.workspace_number)
              textFormat: Text.PlainText
              elide: Text.ElideRight
              color: root.fg
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
            }

            Text {
              anchors.left: stripLabel.right
              anchors.leftMargin: Style.space(6)
              anchors.right: stripMeta.visible ? stripMeta.left : parent.right
              anchors.rightMargin: stripMeta.visible ? Style.space(6) : Style.space(4)
              anchors.verticalCenter: parent.verticalCenter
              text: root.cfg.agentDetails ? Model.agentDetailText(stripRow.modelData) : stripRow.modelData.title
              textFormat: Text.PlainText
              elide: Text.ElideRight
              color: root.fg
              opacity: 0.7
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }

            // Time in state and usage, dimmed at the right end.
            Text {
              id: stripMeta
              anchors.right: parent.right
              anchors.rightMargin: Style.space(4)
              anchors.verticalCenter: parent.verticalCenter
              visible: root.cfg.agentDetails && text !== ""
              // Measured apart: an elided text bound to its own implicit
              // width is a binding loop.
              width: Math.min(Math.ceil(stripMetaMetrics.advanceWidth) + 1, parent.width * 0.4)
              TextMetrics { id: stripMetaMetrics; font: stripMeta.font; text: stripMeta.text }
              text: [Model.agentStateText(stripRow.modelData, root.agentClock), Model.agentTokenText(stripRow.modelData.tokens)].filter(function(t) { return t !== "" }).join(" \u00b7 ")
              textFormat: Text.PlainText
              elide: Text.ElideRight
              color: root.fg
              opacity: 0.5
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }

            MouseArea {
              id: stripMouse
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onClicked: root.focusAgent(stripRow.modelData, preview.workspace ? preview.workspace.windows : [])
            }
          }
        }

        Text {
          visible: preview.agentRows.length > previewAgents.maxRows
          width: parent.width
          text: "+" + (preview.agentRows.length - previewAgents.maxRows) + " more"
          color: root.fg
          opacity: 0.5
          horizontalAlignment: Text.AlignHCenter
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
        }
      }

      Text {
        id: previewFooter
        width: preview.mapWidth
        readonly property var hovered: root.windowByAddress(root.highlightAddress)
        text: hovered ? hovered.title : "Click a window to jump to it"
        textFormat: Text.PlainText
        color: root.fg
        opacity: hovered ? 0.9 : 0.5
        elide: Text.ElideRight
        horizontalAlignment: Text.AlignHCenter
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption
      }
    }
  }

  function windowByAddress(address) {
    if (!address || !preview.workspace) return null
    var windows = preview.workspace.windows
    for (var i = 0; i < windows.length; i++) if (windows[i].address === address) return windows[i]
    return null
  }

  Component {
    id: miniatureComponent

    Item {
      id: mini
      readonly property var workspace: preview.workspace
      readonly property var layout: workspace
        ? Model.previewLayout(workspace.windows, workspace.area, width, height) : []
      readonly property var rects: {
        var map = ({})
        for (var i = 0; i < layout.length; i++) map[layout[i].address] = layout[i]
        return map
      }

      Repeater {
        model: ScriptModel { values: mini.layout.map(function(r) { return r.address }) }

        delegate: Item {
          id: thumb
          required property var modelData
          readonly property var rect: mini.rects[modelData] || null
          readonly property var win: root.windowByAddress(modelData)
          readonly property bool highlighted: root.highlightAddress === modelData || thumbMouse.containsMouse
          readonly property real inset: Style.space(2)

          x: rect ? rect.x + inset : 0
          y: rect ? rect.y + inset : 0
          width: rect ? Math.max(2, rect.width - inset * 2) : 0
          height: rect ? Math.max(2, rect.height - inset * 2) : 0
          z: rect && rect.floating ? 1 : 0

          Behavior on x { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
          Behavior on y { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
          Behavior on width { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }
          Behavior on height { enabled: root.dur > 0; NumberAnimation { duration: root.dur; easing.type: Easing.OutCubic } }

          ScreencopyView {
            id: capture
            anchors.fill: parent
            captureSource: thumb.win ? thumb.win.toplevel : null
            live: root.cfg.previewLive
            constraintSize: Qt.size(Math.round(thumb.width * 2), Math.round(thumb.height * 2))
            opacity: hasContent ? 1 : 0
            Behavior on opacity { enabled: root.fastDur > 0; NumberAnimation { duration: root.fastDur } }
          }

          // Placeholder until the first frame arrives.
          Rectangle {
            anchors.fill: parent
            visible: !capture.hasContent
            color: Util.alpha(root.fg, 0.08)
          }

          Rectangle {
            anchors.fill: parent
            color: "transparent"
            border.width: thumb.highlighted ? 2 : 1
            border.color: thumb.highlighted ? Color.accent : Util.alpha(root.fg, 0.18)
            Behavior on border.color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
          }

          // App badge in the corner, so small thumbnails stay identifiable.
          Rectangle {
            readonly property var info: thumb.win ? root.appInfo(thumb.win.appId) : null
            visible: info !== null && thumb.width > 28 && thumb.height > 22
            anchors.left: parent.left
            anchors.bottom: parent.bottom
            anchors.margins: Style.space(4)
            width: Style.space(20)
            height: width
            radius: Style.cornerRadius > 0 ? Style.space(5) : 0
            color: Util.alpha(root.bg, 0.85)

            Image {
              anchors.centerIn: parent
              width: Style.space(14)
              height: width
              source: parent.info ? parent.info.source : ""
              sourceSize.width: width * 2
              sourceSize.height: height * 2
              fillMode: Image.PreserveAspectFit
              asynchronous: true
            }
          }

          MouseArea {
            id: thumbMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onContainsMouseChanged: {
              if (containsMouse) root.highlightAddress = thumb.modelData
              else if (root.highlightAddress === thumb.modelData) root.highlightAddress = ""
            }
            onClicked: {
              root.focusWindow(thumb.modelData)
              root.hidePreview()
            }
          }
        }
      }
    }
  }

  // ------------------------------------------------------------ agents popup

  // The bar closes whichever popup was open when another one opens; this
  // gives it a close() for the agents list, so opening Spaces settings or
  // another widget's panel closes the list, and opening the list closes them.
  QtObject {
    id: agentsOwner
    function close() { root.closeAgents() }
  }

  PopupCard {
    id: agentsCard
    anchorItem: agentChip
    bar: root.bar ? root.bar : previewBar
    owner: agentsOwner
    open: root.agentsOpen
    // Clicking outside closes the list. Demo mode, which exists for
    // screenshots, skips that focus grab: capture tools and input elsewhere
    // would close the list before it could be recorded.
    triggerMode: root.herdrDemo ? "hover" : "click"
    contentWidth: agentsCard.fittedContentWidth(Style.space(380))
    contentHeight: agentsCard.fittedContentHeight(agentsColumn.implicitHeight)

    // Popups get no compositor blur, so the card needs its own opaque fill.
    Rectangle {
      anchors.fill: parent
      anchors.margins: -Math.max(0, agentsCard.padding - Style.space(2))
      radius: Math.max(0, Style.cornerRadius - Style.space(2))
      color: Qt.rgba(root.bg.r, root.bg.g, root.bg.b, 0.97)
    }

    // Scrolls once there are more agents than the screen has room for.
    Flickable {
      id: agentsFlick
      anchors.fill: parent
      contentWidth: width
      contentHeight: agentsColumn.implicitHeight
      interactive: contentHeight > height
      boundsBehavior: Flickable.StopAtBounds
      clip: true

      Column {
        id: agentsColumn
        width: agentsFlick.width
        spacing: Style.space(4)

        Item {
          width: parent.width
          implicitHeight: Math.max(agentsTitle.implicitHeight, agentsCount.implicitHeight) + Style.space(4)

          Text {
            id: agentsTitle
            anchors.left: parent.left
            anchors.leftMargin: Style.space(4)
            anchors.verticalCenter: parent.verticalCenter
            text: "Agents"
            color: root.fg
            font.family: root.fontFamily
            font.pixelSize: Style.font.body
            font.bold: true
          }

          Text {
            id: agentsCount
            anchors.right: parent.right
            anchors.rightMargin: Style.space(4)
            anchors.verticalCenter: parent.verticalCenter
            readonly property int count: root.sortedAgents.length
            text: count + (count === 1 ? " AGENT" : " AGENTS")
            color: Qt.darker(root.fg, 1.4)
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.2
          }
        }

        Text {
          visible: root.sortedAgents.length === 0
          width: parent.width
          topPadding: Style.space(6)
          bottomPadding: Style.space(6)
          text: "No agents"
          color: root.fg
          opacity: 0.5
          horizontalAlignment: Text.AlignHCenter
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
        }

        Repeater {
          model: root.sortedAgents

          delegate: Item {
            id: agentRow
            required property var modelData
            width: agentsColumn.width
            implicitHeight: Math.max(agentText.implicitHeight, agentRowBadge.height) + Style.space(10)

            Rectangle {
              anchors.fill: parent
              radius: Style.cornerRadius > 0 ? Style.space(5) : 0
              color: agentMouse.containsMouse ? Util.alpha(root.fg, 0.1) : "transparent"
              Behavior on color { enabled: root.fastDur > 0; ColorAnimation { duration: root.fastDur } }
            }

            AgentBadge {
              id: agentRowBadge
              anchors.left: parent.left
              anchors.leftMargin: Style.space(6)
              anchors.verticalCenter: parent.verticalCenter
              agentState: Model.herdrBarState(agentRow.modelData.status)
              width: Math.max(10, Math.round(root.iconPx * 0.7))
            }

            Column {
              id: agentText
              anchors.left: agentRowBadge.right
              anchors.leftMargin: Style.space(8)
              anchors.right: agentName.left
              anchors.rightMargin: Style.space(8)
              anchors.verticalCenter: parent.verticalCenter
              spacing: Style.space(1)

              Row {
                width: parent.width
                spacing: Style.space(5)

                Text {
                  id: agentWorkspace
                  width: Math.min(implicitWidth, parent.width - agentNumber.implicitWidth - parent.spacing
                    - (agentStateLabel.visible ? agentStateLabel.implicitWidth + parent.spacing : 0))
                  text: agentRow.modelData.workspace_label || "Workspace"
                  textFormat: Text.PlainText
                  elide: Text.ElideRight
                  color: root.fg
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.bodySmall
                  font.bold: true
                }

                Text {
                  id: agentNumber
                  anchors.baseline: agentWorkspace.baseline
                  visible: agentRow.modelData.workspace_number > 0
                  text: String(agentRow.modelData.workspace_number)
                  color: root.fg
                  opacity: 0.5
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.bold: true
                }

                // "blocked 4m": the state and how long it has lasted.
                Text {
                  id: agentStateLabel
                  anchors.baseline: agentWorkspace.baseline
                  visible: root.cfg.agentDetails
                  text: Model.agentStateText(agentRow.modelData, root.agentClock)
                  textFormat: Text.PlainText
                  color: root.fg
                  opacity: 0.5
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                }
              }

              // What the agent is doing, or its pane title (a reporter
              // agent's working directory).
              Text {
                width: parent.width
                visible: text !== ""
                text: root.cfg.agentDetails ? Model.agentDetailText(agentRow.modelData) : agentRow.modelData.title
                textFormat: Text.PlainText
                elide: Text.ElideRight
                color: root.fg
                opacity: 0.75
                font.family: root.fontFamily
                font.pixelSize: Style.font.caption
              }

              // Model, context, cost and branch, as Herdr reports them
              // (reporter agents have none).
              Text {
                width: parent.width
                visible: root.cfg.agentDetails && text !== ""
                text: Model.agentTokenText(agentRow.modelData.tokens)
                textFormat: Text.PlainText
                elide: Text.ElideRight
                color: root.fg
                opacity: 0.45
                font.family: root.fontFamily
                font.pixelSize: Style.font.caption
              }
            }

            Text {
              id: agentName
              anchors.right: parent.right
              anchors.rightMargin: Style.space(6)
              anchors.verticalCenter: parent.verticalCenter
              text: agentRow.modelData.agent
              textFormat: Text.PlainText
              color: root.fg
              opacity: 0.5
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }

            MouseArea {
              id: agentMouse
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onClicked: root.focusAgent(agentRow.modelData)
            }
          }
        }
      }
    }
  }

  // Agent state as a small round badge: spinner while working, pulsing "!"
  // when it needs input, check mark when done, a faint dot otherwise. Used on
  // app icons, in the agents chip and its list, and on the preview card.
  component AgentBadge: Item {
    id: badge
    property string agentState: ""
    height: width

    Rectangle {
      anchors.fill: parent
      anchors.margins: badge.agentState === "" || badge.agentState === "idle" ? parent.width * 0.25 : 0
      radius: width / 2
      color: badge.agentState === "done" ? Color.accent
        : badge.agentState === "waiting" ? (root.bar ? root.bar.urgent : Color.urgent)
        : badge.agentState === "working" ? root.bg
        : Util.alpha(root.fg, 0.35)
    }

    Canvas {
      id: spinner
      anchors.fill: parent
      anchors.margins: 1.5
      visible: badge.agentState === "working"
      onPaint: {
        var ctx = getContext("2d")
        ctx.reset()
        ctx.lineWidth = Math.max(1.5, width * 0.18)
        ctx.lineCap = "round"
        ctx.strokeStyle = root.fg
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, width / 2 - ctx.lineWidth / 2, 0, Math.PI * 1.4)
        ctx.stroke()
      }
      Connections {
        target: root
        function onFgChanged() { spinner.requestPaint() }
      }
      RotationAnimator on rotation {
        running: spinner.visible
        from: 0
        to: 360
        duration: 900
        loops: Animation.Infinite
      }
    }

    Text {
      anchors.centerIn: parent
      visible: badge.agentState === "done" || badge.agentState === "waiting"
      text: badge.agentState === "done" ? "\uf00c" : "!"
      color: root.bg
      font.family: root.fontFamily
      font.pixelSize: Math.round(parent.width * 0.62)
      font.bold: true
    }

    SequentialAnimation on scale {
      running: badge.agentState === "waiting"
      loops: Animation.Infinite
      alwaysRunToEnd: true
      NumberAnimation { from: 1; to: 1.3; duration: 520; easing.type: Easing.InOutSine }
      NumberAnimation { from: 1.3; to: 1; duration: 520; easing.type: Easing.InOutSine }
    }
  }

  // ------------------------------------------------------------ settings panel

  KeyboardPanel {
    id: panel
    anchorItem: root
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: settingsForm
    contentWidth: panel.fittedContentWidth(Style.space(680))
    contentHeight: panel.fittedContentHeight(Math.max(Style.space(520), settingsForm.implicitHeight))

    SpacesSettings {
      id: settingsForm
      anchors.fill: parent
      cfg: root.cfg
      bar: root.bar
      claudeHooks: root.claudeHooks
      fg: root.fg
      fontFamily: root.fontFamily
      onSettingChanged: function(delta) { root.applySetting(delta) }
      onResetRequested: root.resetSettings()
      onCloseRequested: root.close()
      Connections {
        target: root
        function onOpenedChanged() { settingsForm.confirmingReset = false }
      }
    }
  }
}
