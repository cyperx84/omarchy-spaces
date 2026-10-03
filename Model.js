.pragma library

// Pure helpers for the Spaces widget. Nothing here touches QML
// objects beyond plain property reads, so the logic can be exercised with
// node (see tests/model.test.js).

var DEFAULTS = {
  showIcons: true,            // master switch: app icons visible or hidden
  showApps: "hover",          // "all" | "active" | "hover" (active + hovered) | "hoverOnly"
  persistentWorkspaces: 5,    // workspaces 1..N are always shown
  hideEmpty: false,           // hide empty workspaces, even persistent ones
  perMonitor: false,          // only list workspaces on this bar's monitor
  iconSize: 16,
  maxIcons: 8,                // overflow collapses into a "+N" chip
  groupApps: false,           // one icon per app, with a window count
  dimUnfocused: true,         // dim other windows on the active workspace
  focusedTitle: false,        // show the focused window's title next to its icon
  titleLength: 24,
  activeStyle: "subtle",      // "subtle" | "solid" | "accent"
  pillBackground: true,       // quiet fill behind occupied/hovered pills
  labelStyle: "both",         // "number" | "key" | "both" | "glyph" | "none"
  animations: true,
  animationSpeed: "normal",   // "slow" | "normal" | "fast"
  scrollSwitch: true,
  iconStyle: "color",         // "color" | "mono"
  urgentHighlight: true,      // pulse workspaces whose windows ask for attention
  middleClickClose: false,    // middle-click an icon closes that window
  tooltips: true,
  keyTooltips: true,          // a pill's tooltip names the keys that reach it
  density: "normal",          // "compact" | "normal" | "roomy"
  activeClick: "none",        // clicking the active pill: "none" | "previous"
  settingsButton: "never",    // gear button: "hover" | "always" | "never"
  previews: true,             // live preview of a workspace on hover
  previewSize: "medium",      // "small" | "medium" | "large"
  previewLive: true,          // keep previews streaming; false = one frame
  agentStatus: true,          // badges for coding agents running in terminals
  herdrAgents: true,          // agent status from Herdr for terminals hosting it
  agentChip: "auto"           // Herdr agents chip: "auto" | "always" | "never"
}

var SHOW_APPS = ["all", "active", "hover", "hoverOnly"]
var ICON_STYLES = ["color", "mono"]
var DENSITIES = ["compact", "normal", "roomy"]
var ACTIVE_CLICKS = ["none", "previous"]
var SETTINGS_BUTTONS = ["hover", "always", "never"]
var PREVIEW_SIZES = ["small", "medium", "large"]
var ACTIVE_STYLES = ["subtle", "solid", "accent"]
var LABEL_STYLES = ["number", "key", "both", "glyph", "none"]
var SPEEDS = ["slow", "normal", "fast"]
var AGENT_CHIPS = ["auto", "always", "never"]

function clampInt(value, min, max, fallback) {
  var n = Math.round(Number(value))
  if (!isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function oneOf(value, allowed, fallback) {
  return allowed.indexOf(String(value)) !== -1 ? String(value) : fallback
}

function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback
}

// Normalizes a raw shell.json entry into a complete, valid settings object.
function resolveSettings(raw) {
  var s = raw || {}
  var d = DEFAULTS
  return {
    showIcons: bool(s.showIcons, d.showIcons),
    showApps: oneOf(s.showApps, SHOW_APPS, d.showApps),
    persistentWorkspaces: clampInt(s.persistentWorkspaces, 0, 10, d.persistentWorkspaces),
    hideEmpty: bool(s.hideEmpty, d.hideEmpty),
    perMonitor: bool(s.perMonitor, d.perMonitor),
    iconSize: clampInt(s.iconSize, 12, 24, d.iconSize),
    maxIcons: clampInt(s.maxIcons, 1, 20, d.maxIcons),
    groupApps: bool(s.groupApps, d.groupApps),
    dimUnfocused: bool(s.dimUnfocused, d.dimUnfocused),
    focusedTitle: bool(s.focusedTitle, d.focusedTitle),
    titleLength: clampInt(s.titleLength, 8, 60, d.titleLength),
    activeStyle: oneOf(s.activeStyle, ACTIVE_STYLES, d.activeStyle),
    pillBackground: bool(s.pillBackground, d.pillBackground),
    labelStyle: oneOf(s.labelStyle, LABEL_STYLES, d.labelStyle),
    animations: bool(s.animations, d.animations),
    animationSpeed: oneOf(s.animationSpeed, SPEEDS, d.animationSpeed),
    scrollSwitch: bool(s.scrollSwitch, d.scrollSwitch),
    iconStyle: oneOf(s.iconStyle, ICON_STYLES, d.iconStyle),
    urgentHighlight: bool(s.urgentHighlight, d.urgentHighlight),
    middleClickClose: bool(s.middleClickClose, d.middleClickClose),
    tooltips: bool(s.tooltips, d.tooltips),
    keyTooltips: bool(s.keyTooltips, d.keyTooltips),
    density: oneOf(s.density, DENSITIES, d.density),
    activeClick: oneOf(s.activeClick, ACTIVE_CLICKS, d.activeClick),
    settingsButton: oneOf(s.settingsButton, SETTINGS_BUTTONS, d.settingsButton),
    previews: bool(s.previews, d.previews),
    previewSize: oneOf(s.previewSize, PREVIEW_SIZES, d.previewSize),
    previewLive: bool(s.previewLive, d.previewLive),
    agentStatus: bool(s.agentStatus, d.agentStatus),
    herdrAgents: bool(s.herdrAgents, d.herdrAgents),
    agentChip: oneOf(s.agentChip, AGENT_CHIPS, d.agentChip)
  }
}

function durationFor(settings, base) {
  if (!settings.animations) return 0
  var factor = settings.animationSpeed === "slow" ? 1.6 : (settings.animationSpeed === "fast" ? 0.55 : 1)
  return Math.round(base * factor)
}

// Whether a workspace pill should reveal its app icons.
function showsApps(settings, occupied, active, hovered) {
  if (!settings.showIcons || !occupied) return false
  switch (settings.showApps) {
  case "all": return true
  case "active": return active
  case "hoverOnly": return hovered
  default: return active || hovered
  }
}

// Spacing between pills and inside them, in unscaled px.
function densityMetrics(density) {
  if (density === "compact") return { gap: 2, pad: 5, iconGap: 1 }
  if (density === "roomy") return { gap: 7, pad: 10, iconGap: 5 }
  return { gap: 4, pad: 7, iconGap: 3 }
}

// Hyprland reports addresses with or without the 0x prefix depending on source.
function normalizeAddress(address) {
  return String(address || "").toLowerCase().replace(/^0x/, "")
}

// Workspace ids to render. `occupied` maps id -> window count for every
// normal (positive id) workspace Hyprland knows about. `activeIds` are
// workspaces that must stay visible even when empty (focused / on-screen).
function workspaceIds(occupied, activeIds, persistent, hideEmpty) {
  var ids = []
  function add(id) {
    if (id > 0 && ids.indexOf(id) === -1) ids.push(id)
  }

  if (!hideEmpty) for (var p = 1; p <= persistent; p++) add(p)
  for (var key in occupied) {
    var id = Number(key)
    if (occupied[key] > 0 || !hideEmpty) add(id)
  }
  for (var a = 0; a < activeIds.length; a++) add(activeIds[a])

  ids.sort(function(l, r) { return l - r })
  return ids
}

// Label text for a workspace pill. `keys` is the workspace's entry from
// workspaceKeyBinds; "key" shows its switch key, or the number without one.
function workspaceLabel(id, focused, style, keys) {
  if (style === "none") return ""
  if (style === "glyph" && focused) return "󱓻"
  if (style === "key" && keys && keys.switch) return keys.switch.key
  return id === 10 ? "0" : String(id)
}

// Small caption beside the number in the "both" style: the switch key,
// unless it would only repeat the number (SUPER + 3 on workspace 3).
function workspaceCaption(id, style, keys) {
  if (style !== "both" || !keys || !keys.switch) return ""
  var key = keys.switch.key
  return key === workspaceLabel(id, false, "number") ? "" : key
}

// Stable key identifying "the same app" across windows.
function appKey(appId) {
  return String(appId || "").toLowerCase()
}

// Orders windows the way they sit on screen: left to right, then top to
// bottom. Windows without a known position keep their relative order.
function sortWindows(windows) {
  var indexed = windows.map(function(w, i) { return { w: w, i: i } })
  indexed.sort(function(l, r) {
    var la = l.w.at, ra = r.w.at
    if (la && ra) {
      if (la[0] !== ra[0]) return la[0] - ra[0]
      if (la[1] !== ra[1]) return la[1] - ra[1]
    } else if (la && !ra) {
      return -1
    } else if (!la && ra) {
      return 1
    }
    return l.i - r.i
  })
  return indexed.map(function(x) { return x.w })
}

// Turns a sorted window list into render items.
//   windows: [{ address, appId, title, focused }]
// Returns { items: [{ key, address, appId, title, focused, count }], overflow }
function iconItems(windows, groupApps, maxIcons) {
  var items = []
  if (groupApps) {
    var byApp = {}
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      var k = appKey(w.appId) || w.address
      var existing = byApp[k]
      if (!existing) {
        existing = { key: k, address: w.address, appId: w.appId, title: w.title, focused: w.focused, count: 1, addresses: [w.address] }
        byApp[k] = existing
        items.push(existing)
      } else {
        existing.count++
        existing.addresses.push(w.address)
        if (w.focused) {
          existing.focused = true
          existing.address = w.address
          existing.title = w.title
        }
      }
    }
  } else {
    for (var j = 0; j < windows.length; j++) {
      var x = windows[j]
      items.push({ key: x.address, address: x.address, appId: x.appId, title: x.title, focused: x.focused, count: 1, addresses: [x.address] })
    }
  }

  var overflow = Math.max(0, items.length - maxIcons)
  if (overflow > 0) {
    // Never hide the focused window behind the overflow chip.
    var visible = items.slice(0, maxIcons)
    var focusedIdx = -1
    for (var f = maxIcons; f < items.length; f++) if (items[f].focused) focusedIdx = f
    if (focusedIdx !== -1) visible[visible.length - 1] = items[focusedIdx]
    items = visible
  }
  return { items: items, overflow: overflow }
}

function truncate(text, max) {
  var t = String(text || "")
  return t.length > max ? t.slice(0, Math.max(1, max - 1)) + "…" : t
}

// Title shown next to the focused icon. The app name when
// the app has a single window in the workspace, else the window title.
function focusedLabel(item, appName, maxLength) {
  if (!item || !item.focused) return ""
  var text = item.count > 1 || !appName ? item.title : appName
  return truncate(text, maxLength)
}

// Lookup keys for an app id, most specific first. Reverse-DNS ids such as
// "dev.example.my-tool" often ship a desktop file named after the last part.
function appIdCandidates(appId) {
  var id = String(appId || "")
  if (id === "") return []
  var out = [id]
  function add(v) { if (v && out.indexOf(v) === -1) out.push(v) }
  add(id.toLowerCase())
  var dot = id.lastIndexOf(".")
  if (dot > 0 && dot < id.length - 1) {
    add(id.slice(dot + 1))
    add(id.slice(dot + 1).toLowerCase())
  }
  return out
}

// The letter to stand in for an app with no resolvable icon. Prefers the
// readable tail of a reverse-DNS class, so org.omarchy.herdr reads "H" and not
// "O" along with everything else sharing that prefix.
function fallbackLetter(name, appId) {
  var label = String(name || "")
  var id = String(appId || "")
  if (label === "" || label === id) {
    var parts = id.split(".")
    label = parts.length > 1 ? parts[parts.length - 1] : id
  }
  return label.charAt(0).toUpperCase()
}

// Chromium-family --app windows use classes like
// "chrome-web.whatsapp.com__-Default" or "brave-app.hey.com__-Profile_1".
// Returns the host ("web.whatsapp.com") or "" when the class is not one.
function webAppHost(appId) {
  var m = /^(?:chrome|chromium|brave|msedge|vivaldi|helium|opera)-([^_]+?)(?:__|_).*-(?:Default|Profile_\d+)$/i.exec(String(appId || ""))
  return m ? m[1] : ""
}

// Icon candidates scanned from disk: prefer scalable, then the largest raster.
function iconPathScore(path) {
  var p = String(path || "")
  if (/\.svg$/i.test(p)) return 100000
  var m = /\/(\d+)x\d+\//.exec(p)
  if (m) return Number(m[1])
  return /\/pixmaps\//.test(p) ? 48 : 1
}

function iconNameFromPath(path) {
  var value = String(path || "")
  var slash = value.lastIndexOf("/")
  var file = slash >= 0 ? value.slice(slash + 1) : value
  var dot = file.lastIndexOf(".")
  return dot > 0 ? file.slice(0, dot) : file
}

// Longest side of the workspace miniature, in unscaled px.
function previewWidth(size) {
  if (size === "small") return 260
  if (size === "large") return 520
  return 380
}

// Usable area of a monitor in logical layout coordinates, i.e. without the
// space reserved by bars. `monitor`: { x, y, width, height, scale, transform, reserved }
// where width/height are physical pixels and reserved is [l, t, r, b].
function monitorArea(monitor) {
  if (!monitor || !monitor.width || !monitor.height) return null
  var scale = monitor.scale > 0 ? monitor.scale : 1
  var r = monitor.reserved && monitor.reserved.length === 4 ? monitor.reserved : [0, 0, 0, 0]
  // Hyprland reports the unrotated mode. Odd Wayland transforms (including
  // flipped rotations) swap its axes; positions and reserved are already logical.
  var rotated = (monitor.transform || 0) % 2 === 1
  var w = (rotated ? monitor.height : monitor.width) / scale
  var h = (rotated ? monitor.width : monitor.height) / scale
  return {
    x: (monitor.x || 0) + r[0],
    y: (monitor.y || 0) + r[1],
    width: Math.max(1, w - r[0] - r[2]),
    height: Math.max(1, h - r[1] - r[3])
  }
}

// Fit the entire workspace without stretching it or cropping the lower windows.
function previewDimensions(area, desiredExtent, maxWidth, maxHeight) {
  var ratio = area && area.width > 0 && area.height > 0 ? area.height / area.width : 9 / 16
  var desiredWidth = desiredExtent / Math.max(1, ratio)
  var width = Math.max(1, Math.min(desiredWidth, maxWidth, maxHeight / ratio))
  return { width: width, height: width * ratio }
}

// Places windows inside a width x height miniature of `area`, where they
// really are on screen. Floating windows come last so they draw on top.
// Windows without a known position are laid out in an even grid instead.
//   windows: [{ address, at: [x, y] | null, size: [w, h] | null, floating }]
function previewLayout(windows, area, width, height) {
  var placed = []
  var known = area && windows.length > 0 && windows.every(function(w) { return w.at && w.size })

  if (known) {
    var sx = width / area.width
    var sy = height / area.height
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      var x = (w.at[0] - area.x) * sx
      var y = (w.at[1] - area.y) * sy
      var ww = w.size[0] * sx
      var hh = w.size[1] * sy
      // Clamp into the miniature; windows can hang off the edge.
      var cx = Math.max(0, Math.min(width - 4, x))
      var cy = Math.max(0, Math.min(height - 4, y))
      placed.push({
        address: w.address,
        x: cx, y: cy,
        width: Math.max(4, Math.min(width - cx, ww - (cx - x))),
        height: Math.max(4, Math.min(height - cy, hh - (cy - y))),
        floating: !!w.floating
      })
    }
  } else {
    var n = windows.length
    var cols = Math.max(1, Math.ceil(Math.sqrt(n)))
    var rows = Math.max(1, Math.ceil(n / cols))
    var gap = 4
    var cw = (width - gap * (cols - 1)) / cols
    var ch = (height - gap * (rows - 1)) / rows
    for (var j = 0; j < n; j++) {
      placed.push({
        address: windows[j].address,
        x: (j % cols) * (cw + gap), y: Math.floor(j / cols) * (ch + gap),
        width: cw, height: ch,
        floating: false
      })
    }
  }

  placed.sort(function(l, r) { return (l.floating ? 1 : 0) - (r.floating ? 1 : 0) })
  return placed
}

// Maps window PIDs to agent states. `agents`: { session: { state, pids } }
// where pids run from the agent up to init. The nearest ancestor that is a
// window owns the agent, since terminals can be nested in other terminals.
// When several agents share a window, "waiting" beats "working" beats "done".
var AGENT_RANK = { waiting: 3, working: 2, done: 1 }

function agentStates(agents, windowPids) {
  var out = {}
  for (var session in agents) {
    var agent = agents[session]
    var rank = AGENT_RANK[agent.state] || 0
    if (!rank) continue
    for (var i = 0; i < agent.pids.length; i++) {
      var pid = agent.pids[i]
      if (!windowPids[pid]) continue
      if (!out[pid] || AGENT_RANK[out[pid]] < rank) out[pid] = agent.state
      break
    }
  }
  return out
}

function parsePids(csv) {
  return String(csv || "").split(",").map(function(v) { return Number(v) }).filter(function(n) { return n > 1 })
}

// Only these reporter states can produce a badge. Anything else is rejected at
// the IPC boundary. "end" is handled separately: it deletes the session.
var AGENT_REPORT_STATES = { working: true, waiting: true, done: true, idle: true }
var AGENT_LIVE_STATES = { working: true, waiting: true }

function normalizeAgentState(state) {
  var value = String(state || "")
  return AGENT_REPORT_STATES[value] ? value : ""
}

// The first PID in a report is the agent process itself; the rest are its
// ancestors. Collect one probe PID per live session.
function agentProcessIds(agents) {
  var out = []
  for (var session in agents) {
    var agent = agents[session]
    if (!agent || !AGENT_LIVE_STATES[agent.state]) continue
    var pid = Number(agent.pids && agent.pids[0])
    if (!isFinite(pid) || Math.floor(pid) !== pid || pid <= 1) continue
    if (out.indexOf(pid) === -1) out.push(pid)
  }
  out.sort(function(a, b) { return a - b })
  return out
}

// Drop live claims whose agent process is gone. Finished and malformed entries
// are preserved: this is crash cleanup, not state validation.
function pruneDeadAgents(agents, alivePids) {
  var alive = {}
  var list = alivePids || []
  for (var i = 0; i < list.length; i++) alive[String(Number(list[i]))] = true

  var pruned = false
  var out = {}
  for (var session in agents) {
    var agent = agents[session]
    var pid = Number(agent && agent.pids && agent.pids[0])
    if (agent && AGENT_LIVE_STATES[agent.state] && pid > 1 && !alive[String(pid)]) {
      pruned = true
      continue
    }
    out[session] = agent
  }
  return pruned ? out : agents
}

// Merges two { pid: state } maps; the more urgent state wins.
function mergeAgentStates(a, b) {
  var out = {}
  var maps = [a || {}, b || {}]
  for (var m = 0; m < maps.length; m++) {
    for (var pid in maps[m]) {
      var state = maps[m][pid]
      if (!AGENT_RANK[state]) continue
      if (!out[pid] || AGENT_RANK[out[pid]] < AGENT_RANK[state]) out[pid] = state
    }
  }
  return out
}

// ---- Herdr

// Herdr, the terminal multiplexer, tracks every agent in its panes itself.
// hooks/herdr-feed relays its snapshots; these helpers turn them into badges.
// Its agent_status is idle | working | blocked | done | unknown, and only
// three of those are worth a badge.
var HERDR_STATES = { working: "working", blocked: "waiting", done: "done" }

function herdrBarState(status) {
  var value = String(status || "")
  return HERDR_STATES.hasOwnProperty(value) ? HERDR_STATES[value] : ""
}

// One feed line -> the agent list, or null when the line is not a snapshot.
// Every field is coerced: the text comes from other processes and is only
// ever rendered as plain text.
function parseHerdrFeed(line) {
  var data
  try { data = JSON.parse(String(line || "")) } catch (e) { return null }
  if (!data || data.type !== "herdr" || !Array.isArray(data.agents)) return null
  var out = []
  for (var i = 0; i < data.agents.length; i++) {
    var a = data.agents[i]
    if (!a || typeof a !== "object" || !a.pane_id) continue
    out.push({
      pane_id: String(a.pane_id),
      workspace_id: String(a.workspace_id || ""),
      workspace_label: String(a.workspace_label || ""),
      workspace_number: Number(a.workspace_number) || 0,
      tab_id: String(a.tab_id || ""),
      agent: String(a.agent || ""),
      status: String(a.status || ""),
      title: String(a.title || ""),
      focused: a.focused === true,
      session: String(a.session || ""),
      state_change: Number(a.state_change) || 0
    })
  }
  return out
}

// Rolls every Herdr agent up into one badge: the most urgent state plus how
// many agents are live (working or blocked). Finished agents the user has
// already seen (`acked`: { pane_id: true }) no longer count.
function herdrSummary(agents, acked) {
  var best = ""
  var live = 0
  for (var i = 0; i < (agents || []).length; i++) {
    var state = herdrBarState(agents[i].status)
    if (!state || (state === "done" && acked && acked[agents[i].pane_id])) continue
    if (AGENT_LIVE_STATES[state]) live++
    if (!best || AGENT_RANK[state] > AGENT_RANK[best]) best = state
  }
  return { state: best, live: live }
}

// Which finished panes have been seen. A pane stays acknowledged until it
// leaves "done", so its next finish shows a check mark again. While a Herdr
// window is being looked at (`viewing`), every finished pane is seen.
function herdrAcks(agents, acked, viewing) {
  var out = {}
  for (var i = 0; i < (agents || []).length; i++) {
    var id = agents[i].pane_id
    if (herdrBarState(agents[i].status) !== "done") continue
    if (viewing || (acked && acked[id])) out[id] = true
  }
  return out
}

// The Herdr client probe prints one line per client: its ancestor PIDs,
// nearest first, comma separated. The nearest ancestor that is a window
// (`windowPids`: { pid: true }) hosts that client. Returns sorted host PIDs.
function parseHerdrClients(text, windowPids) {
  var out = []
  var lines = String(text || "").split("\n")
  for (var i = 0; i < lines.length; i++) {
    var pids = parsePids(lines[i])
    for (var j = 0; j < pids.length; j++) {
      if (!windowPids[pids[j]]) continue
      if (out.indexOf(pids[j]) === -1) out.push(pids[j])
      break
    }
  }
  out.sort(function(a, b) { return a - b })
  return out
}

// Herdr cannot say which client shows which workspace, so every window
// hosting a client wears the combined state. Returns { pid: state }.
function herdrStatesByPid(hostPids, summary) {
  var out = {}
  if (!summary || !summary.state) return out
  for (var i = 0; i < hostPids.length; i++) out[hostPids[i]] = summary.state
  return out
}

// How long to wait before starting the feed again. A feed that ends at once
// (Herdr not running) backs off from 5 s to a minute; `quickExits` counts
// those in a row and starts over once the feed says anything.
function herdrRetryDelay(quickExits) {
  var n = Math.min(Math.max(0, Math.floor(Number(quickExits) || 0)), 4)
  return Math.min(60000, 5000 * Math.pow(2, n))
}

// The feed's panes and focus as one comparable value. When it changes, a
// Herdr client may have come or gone, so the client probe runs again.
function herdrFeedKey(agents) {
  var keys = []
  for (var i = 0; i < (agents || []).length; i++)
    if (agents[i]) keys.push(agents[i].pane_id + (agents[i].focused ? "*" : ""))
  return keys.sort().join(",")
}

// Tooltip lines under a Herdr window's title, one per agent:
// "working · Code · omarchy-spaces custom version".
function herdrTooltipLines(agents, maxTitle) {
  var lines = []
  for (var i = 0; i < (agents || []).length; i++) {
    var a = agents[i]
    var parts = [a.status || "unknown"]
    if (a.workspace_label) parts.push(a.workspace_label)
    if (a.title) parts.push(truncate(a.title, maxTitle))
    lines.push(parts.join(" · "))
  }
  return lines
}

// ---- Agents chip

// What the agents chip after the workspace pills shows. `mode` "auto" shows
// it while an agent is working or waiting, "always" whenever Herdr lists an
// agent at all, "never" not at all. Idle agents only count towards `total`.
function agentChipSummary(agents, mode) {
  var out = { visible: false, working: 0, waiting: 0, done: 0, total: 0 }
  var list = Array.isArray(agents) ? agents : []
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) continue
    var state = herdrBarState(list[i].status)
    if (state) out[state]++
    out.total++
  }
  if (mode === "always") out.visible = out.total > 0
  else if (mode !== "never") out.visible = out.working + out.waiting > 0
  return out
}

// The chip's counts, most urgent first: [{ state, count }]. When every agent
// is idle the chip still reads as one plain total.
function agentChipSegments(summary) {
  var out = []
  var order = ["waiting", "working", "done"]
  for (var i = 0; i < order.length; i++)
    if (summary && summary[order[i]] > 0) out.push({ state: order[i], count: summary[order[i]] })
  if (!out.length && summary && summary.total > 0) out.push({ state: "", count: summary.total })
  return out
}

// Newest first by Herdr's state_change sequence. Agents without one keep
// their listed order, after those with one. Returns a new array.
function sortAgents(agents) {
  var indexed = (Array.isArray(agents) ? agents : []).map(function(a, i) { return { a: a, i: i } })
  indexed.sort(function(l, r) {
    var ls = Number(l.a && l.a.state_change) || 0
    var rs = Number(r.a && r.a.state_change) || 0
    return ls !== rs ? rs - ls : l.i - r.i
  })
  return indexed.map(function(x) { return x.a })
}

// The window to raise when jumping to an agent: the first of `windows`
// ([{ address, pid }], in order of preference) that hosts a Herdr client.
function herdrHostAddress(windows, hostPids) {
  for (var i = 0; i < (windows || []).length; i++) {
    var w = windows[i]
    if (w && w.pid && (hostPids || []).indexOf(w.pid) !== -1) return w.address
  }
  return ""
}

// The same, looked up over `windows` from every monitor: with one bar per
// monitor, the Herdr window may live on another one. `clientText` is the
// client probe's output, matched against these windows' PIDs.
function herdrHostAnywhere(windows, clientText) {
  var pids = {}
  for (var i = 0; i < (windows || []).length; i++) if (windows[i] && windows[i].pid) pids[windows[i].pid] = true
  return herdrHostAddress(windows, parseHerdrClients(clientText, pids))
}

// ---- Key binds

// Hyprland's modifier bits, in the order a shortcut is spelled out.
var MOD_BITS = [
  { bit: 64, name: "SUPER" }, { bit: 4, name: "CTRL" }, { bit: 8, name: "ALT" }, { bit: 1, name: "SHIFT" },
  { bit: 2, name: "CAPS" }, { bit: 16, name: "MOD2" }, { bit: 32, name: "MOD3" }, { bit: 128, name: "MOD5" }
]

function modNames(modmask) {
  var mask = Number(modmask) || 0
  var out = []
  for (var i = 0; i < MOD_BITS.length; i++) if (mask & MOD_BITS[i].bit) out.push(MOD_BITS[i].name)
  return out
}

// Keysym names worth a friendlier spelling; matched case-insensitively.
var KEY_NAMES = {
  comma: ",", period: ".", slash: "/", minus: "-", equal: "=", grave: "`",
  bracketleft: "[", bracketright: "]", semicolon: ";", apostrophe: "'", backslash: "\\",
  space: "Space", "return": "Enter", tab: "Tab", escape: "Esc"
}

function keyDisplay(key) {
  var value = String(key || "")
  var lower = value.toLowerCase()
  if (KEY_NAMES.hasOwnProperty(lower)) return KEY_NAMES[lower]
  if (/^[a-z]$/i.test(value)) return value.toUpperCase()
  return value
}

// What a bind does to a workspace: { kind: "switch" | "move", workspace, silent }
// or null. Classic hyprland.conf binds name the dispatcher; Omarchy's Lua
// binds all read "__lua", so only their description carries the meaning.
var BIND_DISPATCHERS = {
  workspace: { kind: "switch", silent: false },
  movetoworkspace: { kind: "move", silent: false },
  movetoworkspacesilent: { kind: "move", silent: true }
}
var BIND_DESCRIPTIONS = [
  { re: /^switch to workspace (\d+)$/i, kind: "switch", silent: false },
  { re: /^move window to workspace (\d+)$/i, kind: "move", silent: false },
  { re: /^move window silently to workspace (\d+)$/i, kind: "move", silent: true }
]

function bindAction(bind) {
  var dispatcher = String(bind.dispatcher || "")
  if (BIND_DISPATCHERS.hasOwnProperty(dispatcher)) {
    var arg = String(bind.arg || "").trim()
    if (!/^\d+$/.test(arg) || Number(arg) <= 0) return null
    var d = BIND_DISPATCHERS[dispatcher]
    return { kind: d.kind, workspace: Number(arg), silent: d.silent }
  }
  var description = String(bind.description || "").trim()
  for (var i = 0; i < BIND_DESCRIPTIONS.length; i++) {
    var m = BIND_DESCRIPTIONS[i].re.exec(description)
    if (m && Number(m[1]) > 0)
      return { kind: BIND_DESCRIPTIONS[i].kind, workspace: Number(m[1]), silent: BIND_DESCRIPTIONS[i].silent }
  }
  return null
}

// The keys that reach each workspace, from the parsed `hyprctl binds -j`:
//   { [workspaceId]: { switch: { mods: ["SUPER"], key: "J" } | null, move: ... } }
// Lua binds can be listed twice, once without a key; that copy is skipped,
// as are binds inside a submap and mouse binds. With several binds for one
// workspace, the modifiers used most across that kind of bind win (so a
// layout's main scheme beats leftovers), then the lowest mask, then the
// first listed. A plain move beats a silent one.
function workspaceKeyBinds(binds) {
  var found = { "switch": [], move: [] }
  var counts = { "switch": {}, move: {} }
  var list = Array.isArray(binds) ? binds : []
  for (var i = 0; i < list.length; i++) {
    var b = list[i]
    if (!b || typeof b !== "object" || b.mouse === true || (b.submap && b.submap !== "")) continue
    var key = String(b.key || "")
    var code = Number(b.keycode) || 0
    if (key === "" && code === 0) continue
    var action = bindAction(b)
    if (!action) continue
    var mask = Number(b.modmask) || 0
    found[action.kind].push({ workspace: action.workspace, mask: mask, silent: action.silent, order: i,
      bind: { mods: modNames(mask), key: key !== "" ? keyDisplay(key) : "code:" + code } })
    counts[action.kind][mask] = (counts[action.kind][mask] || 0) + 1
  }

  var out = {}
  for (var kind in found) {
    var best = {}
    var c = counts[kind]
    for (var j = 0; j < found[kind].length; j++) {
      var x = found[kind][j]
      var cur = best[x.workspace]
      var better = !cur
        || (cur.silent && !x.silent)
        || (cur.silent === x.silent && (c[x.mask] > c[cur.mask] || (c[x.mask] === c[cur.mask] && x.mask < cur.mask)))
      if (better) best[x.workspace] = x
    }
    for (var ws in best) {
      if (!out[ws]) out[ws] = { "switch": null, move: null }
      out[ws][kind] = best[ws].bind
    }
  }
  return out
}

// "SUPER + J", or "" without a bind.
function keyHintText(bind) {
  if (!bind || !bind.key) return ""
  return (bind.mods || []).concat([bind.key]).join(" + ")
}

// Tooltip for a pill: "Workspace 3 · SUPER + L to switch · ALT + SHIFT + L
// to move window here", leaving out what has no bind; "" when nothing does.
function keyTooltip(id, keys) {
  if (!keys || (!keys.switch && !keys.move)) return ""
  var parts = ["Workspace " + id]
  if (keys.switch) parts.push(keyHintText(keys.switch) + " to switch")
  if (keys.move) parts.push(keyHintText(keys.move) + " to move window here")
  return parts.join(" · ")
}

// Local path of a file:// URL, e.g. one from Qt.resolvedUrl.
function localPath(url) {
  var value = String(url || "")
  if (value.indexOf("file://") !== 0) return value
  try { return decodeURIComponent(value.slice(7)) } catch (e) { return value.slice(7) }
}

// Next workspace id when scrolling; wraps around.
function stepWorkspace(ids, current, delta) {
  if (!ids.length) return current
  var idx = ids.indexOf(current)
  if (idx === -1) return ids[0]
  var next = (idx + (delta > 0 ? 1 : -1) + ids.length) % ids.length
  return ids[next]
}

// Merges a settings delta into an entry for shell.json.
function mergedEntry(moduleName, current, delta) {
  var entry = { id: moduleName }
  for (var k in current) if (k !== "id") entry[k] = current[k]
  for (var d in delta) entry[d] = delta[d]
  return entry
}

// node / CommonJS export for tests; ignored by QML.
if (typeof module !== "undefined") {
  module.exports = {
    DEFAULTS: DEFAULTS, resolveSettings: resolveSettings, showsApps: showsApps,
    densityMetrics: densityMetrics, normalizeAddress: normalizeAddress,
    agentStates: agentStates, parsePids: parsePids, normalizeAgentState: normalizeAgentState,
    agentProcessIds: agentProcessIds, pruneDeadAgents: pruneDeadAgents, mergeAgentStates: mergeAgentStates,
    herdrBarState: herdrBarState, parseHerdrFeed: parseHerdrFeed, herdrSummary: herdrSummary,
    herdrAcks: herdrAcks, parseHerdrClients: parseHerdrClients, herdrStatesByPid: herdrStatesByPid,
    herdrTooltipLines: herdrTooltipLines, localPath: localPath,
    agentChipSummary: agentChipSummary, agentChipSegments: agentChipSegments, sortAgents: sortAgents,
    herdrHostAddress: herdrHostAddress, herdrHostAnywhere: herdrHostAnywhere,
    herdrRetryDelay: herdrRetryDelay, herdrFeedKey: herdrFeedKey,
    previewWidth: previewWidth, previewDimensions: previewDimensions, monitorArea: monitorArea, previewLayout: previewLayout, durationFor: durationFor,
    workspaceIds: workspaceIds, workspaceLabel: workspaceLabel, workspaceCaption: workspaceCaption, appKey: appKey,
    modNames: modNames, keyDisplay: keyDisplay, workspaceKeyBinds: workspaceKeyBinds, keyHintText: keyHintText,
    keyTooltip: keyTooltip,
    sortWindows: sortWindows, iconItems: iconItems, truncate: truncate,
    focusedLabel: focusedLabel, webAppHost: webAppHost, appIdCandidates: appIdCandidates, iconPathScore: iconPathScore,
    iconNameFromPath: iconNameFromPath, stepWorkspace: stepWorkspace, mergedEntry: mergedEntry,
    fallbackLetter: fallbackLetter
  }
}
