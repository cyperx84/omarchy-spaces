.pragma library

// Pure helpers for the Spaces widget. Nothing here touches QML
// objects beyond plain property reads, so the logic can be exercised with
// node (see tests/model.test.js).

// Whether `key` is one of `table`'s own keys. Every lookup of a string from
// outside goes through this, so names such as "constructor" or "toString"
// never find something on Object.prototype.
function own(table, key) {
  return !!table && Object.prototype.hasOwnProperty.call(table, key)
}

var DEFAULTS = {
  showIcons: true,            // master switch: app icons visible or hidden
  showApps: "hover",          // "all" | "active" | "hover" (active + hovered) | "hoverOnly"
  persistentWorkspaces: 5,    // workspaces 1..N are always shown
  hideEmpty: false,           // hide empty workspaces, even persistent ones
  perMonitor: false,          // only list workspaces on this bar's monitor
  showSpecial: true,          // a pill per special workspace (scratchpad) with windows
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
  reverseScroll: false,       // scrolling down goes to the previous workspace
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
  agentChip: "auto",          // agents chip: "auto" | "always" | "never"
  agentDetails: true,         // activity, time in state and usage in agent rows
  agentNotify: "blocked",     // desktop notifications: "off" | "blocked" | "all"
  agentMute: false,           // silence agent notifications (IPC `mute`)
  demo: false                 // developer: scripted fake agents for screenshots
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
var AGENT_NOTIFY = ["off", "blocked", "all"]

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
    showSpecial: bool(s.showSpecial, d.showSpecial),
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
    reverseScroll: bool(s.reverseScroll, d.reverseScroll),
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
    agentChip: oneOf(s.agentChip, AGENT_CHIPS, d.agentChip),
    agentDetails: bool(s.agentDetails, d.agentDetails),
    agentNotify: oneOf(s.agentNotify, AGENT_NOTIFY, d.agentNotify),
    agentMute: bool(s.agentMute, d.agentMute),
    demo: bool(s.demo, d.demo)
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

// ---- Special workspaces

// Hyprland's special workspaces (the scratchpad is one) have negative ids and
// names such as "special:scratchpad"; the unnamed one is "special:special".
// They are overlays toggled over a monitor's workspace, so they get pills of
// their own after the numbered ones and are never scrolled through.
var SPECIAL_PREFIX = "special:"
// nf-md-layers, from the bar's Nerd Font.
var SCRATCHPAD_GLYPH = "󰌨"

function isSpecialName(name) {
  return String(name || "").indexOf(SPECIAL_PREFIX) === 0
}

// "special:scratchpad" -> "scratchpad", "scratchpad" -> "scratchpad". The
// bare prefix is the unnamed special workspace, "special".
function specialName(name) {
  var value = String(name || "")
  if (isSpecialName(value)) value = value.slice(SPECIAL_PREFIX.length)
  return value === "" ? "special" : value
}

// What a special workspace is called in its tooltip.
function specialTitle(name) {
  var short = specialName(name)
  if (short === "scratchpad") return "Scratchpad"
  if (short === "special") return "Special workspace"
  return short
}

// Text on a special pill: a glyph for the scratchpad, a name of up to three
// characters as it is, else its first letter in capitals.
function specialLabel(name) {
  var short = specialName(name)
  if (short === "scratchpad") return SCRATCHPAD_GLYPH
  var chars = Array.from ? Array.from(short) : short.split("")
  if (chars.length <= 3) return short
  return chars[0].toUpperCase()
}

// Which special pills to show, in order: the scratchpad first, then by name.
//   list:    [{ id, name, windows (count), monitor (name) }] for every
//            workspace Hyprland knows about; non-special ones are ignored
//   options: { show (setting), shown: [full names shown on this bar's
//            monitor], perMonitor, monitor (this bar's monitor name) }
// A special workspace gets a pill while it has windows or is shown here.
// With perMonitor, only those that live on this bar's monitor.
// Returns [{ id, name, short, windows, shown }].
function specialWorkspaces(list, options) {
  var o = options || {}
  if (o.show === false) return []
  var shown = Array.isArray(o.shown) ? o.shown.map(function(n) { return SPECIAL_PREFIX + specialName(n) }) : []
  var out = []
  var seen = {}
  var items = Array.isArray(list) ? list : []
  for (var i = 0; i < items.length; i++) {
    var w = items[i]
    if (!w || !isSpecialName(w.name)) continue
    var full = SPECIAL_PREFIX + specialName(w.name)
    if (seen[full]) continue
    if (o.perMonitor && o.monitor && w.monitor && w.monitor !== o.monitor) continue
    var isShown = shown.indexOf(full) !== -1
    var count = Math.max(0, Number(w.windows) || 0)
    if (count === 0 && !isShown) continue
    seen[full] = true
    out.push({ id: Number(w.id) || 0, name: full, short: specialName(full), windows: count, shown: isShown })
  }
  out.sort(function(l, r) {
    if (l.short === "scratchpad" || r.short === "scratchpad") return l.short === "scratchpad" ? -1 : 1
    return l.short < r.short ? -1 : (l.short > r.short ? 1 : 0)
  })
  return out
}

// One `activespecial` or `activespecialv2` event: { monitor, name }, where
// name is "" when the monitor's special workspace was closed. null for any
// other event. The data is "NAME,MONITOR" (v1) or "ID,NAME,MONITOR" (v2);
// a name may hold commas, a monitor name does not.
function parseActiveSpecial(event, data) {
  var text = String(data === undefined || data === null ? "" : data)
  var last = text.lastIndexOf(",")
  if (last === -1) return null
  var monitor = text.slice(last + 1)
  var name
  if (event === "activespecialv2") {
    var first = text.indexOf(",")
    if (first === last) return null
    name = text.slice(first + 1, last)
  } else if (event === "activespecial") {
    name = text.slice(0, last)
  } else {
    return null
  }
  if (monitor === "") return null
  return { monitor: monitor, name: isSpecialName(name) ? SPECIAL_PREFIX + specialName(name) : "" }
}

// The special workspace shown on each monitor, { monitor: full name }, from
// `hyprctl monitors` read at startup (`monitors`, see monitorSpecials)
// overridden by the events seen since (`events`: { monitor: name or "" }).
function specialShownMap(monitors, events) {
  var out = {}
  var list = Array.isArray(monitors) ? monitors : []
  for (var i = 0; i < list.length; i++) {
    var m = list[i]
    if (m && m.name && isSpecialName(m.special)) out[m.name] = SPECIAL_PREFIX + specialName(m.special)
  }
  for (var mon in events || {}) {
    if (!Object.prototype.hasOwnProperty.call(events, mon)) continue
    if (isSpecialName(events[mon])) out[mon] = SPECIAL_PREFIX + specialName(events[mon])
    else delete out[mon]
  }
  return out
}

// `hyprctl monitors -j` (text or parsed) as [{ name, special }], where
// special is the full name of the special workspace the monitor shows, or
// "". Anything malformed gives [].
function monitorSpecials(value) {
  var data = value
  if (typeof data === "string") {
    try { data = JSON.parse(data) } catch (e) { return [] }
  }
  if (!Array.isArray(data)) return []
  var out = []
  for (var i = 0; i < data.length; i++) {
    var m = data[i]
    if (!m || typeof m !== "object" || typeof m.name !== "string" || m.name === "") continue
    var sw = m.specialWorkspace
    var name = sw && typeof sw === "object" && typeof sw.name === "string" && isSpecialName(sw.name) ? SPECIAL_PREFIX + specialName(sw.name) : ""
    out.push({ name: m.name, special: name })
  }
  return out
}

// The names shown on `monitor`, or on any monitor when it is not known.
function specialShownOn(map, monitor) {
  var out = []
  for (var mon in map || {}) {
    if (!Object.prototype.hasOwnProperty.call(map, mon)) continue
    if ((!monitor || mon === monitor) && out.indexOf(map[mon]) === -1) out.push(map[mon])
  }
  return out
}

// A Lua string literal for Hyprland's Lua dispatchers: quotes, backslashes
// and control characters escaped, so a workspace name can never end it.
function luaString(value) {
  return "\"" + String(value === undefined || value === null ? "" : value).replace(/[\\"\u0000-\u001f\u007f]/g, function(c) {
    if (c === "\\" || c === "\"") return "\\" + c
    var code = String(c.charCodeAt(0))
    return "\\" + ("000" + code).slice(-3)
  }) + "\""
}

// The Lua dispatch that toggles a special workspace, by its name without the
// "special:" prefix, as Omarchy's own SUPER + S bind does.
function specialToggleDispatch(name) {
  return "hl.dsp.workspace.toggle_special(" + luaString(specialName(name)) + ")"
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

// A state's rank, 0 for anything that is not a badge state.
function agentRank(state) {
  return own(AGENT_RANK, state) ? AGENT_RANK[state] : 0
}

function agentStates(agents, windowPids) {
  var out = {}
  for (var session in agents) {
    var agent = agents[session]
    var rank = agentRank(agent.state)
    if (!rank) continue
    for (var i = 0; i < agent.pids.length; i++) {
      var pid = agent.pids[i]
      if (!windowPids[pid]) continue
      if (!out[pid] || agentRank(out[pid]) < rank) out[pid] = agent.state
      break
    }
  }
  return out
}

function parsePids(csv) {
  return String(csv || "").split(",").map(function(v) { return Number(v) }).filter(function(n) { return n > 1 })
}

// Only these reporter states can produce a badge. Anything else is rejected at
// the IPC boundary. "end" and "settle" are handled separately: "end" deletes
// the session, "settle" turns a working or waiting one idle.
var AGENT_REPORT_STATES = { working: true, waiting: true, done: true, idle: true }
var AGENT_LIVE_STATES = { working: true, waiting: true }

function normalizeAgentState(state) {
  var value = String(state || "")
  return own(AGENT_REPORT_STATES, value) ? value : ""
}

// Which reporter sessions the /proc probe checks: live claims (working or
// waiting) from either IPC method, and every session from `report`, whose
// first PID is the agent process and lives as long as the session. Plain
// `agent` sessions in done or idle are kept: a wrapper script reports done
// as it exits, so its first PID is already gone.
function agentProbed(agent) {
  return !!agent && (own(AGENT_LIVE_STATES, agent.state) || agent.rich === true)
}

// The first PID in a report is the agent process itself; the rest are its
// ancestors. Collect one probe PID per probed session.
function agentProcessIds(agents) {
  var out = []
  for (var session in agents) {
    var agent = agents[session]
    if (!agentProbed(agent)) continue
    var pid = Number(agent.pids && agent.pids[0])
    if (!isFinite(pid) || Math.floor(pid) !== pid || pid <= 1) continue
    if (out.indexOf(pid) === -1) out.push(pid)
  }
  out.sort(function(a, b) { return a - b })
  return out
}

// Drop probed sessions (see agentProbed) whose agent process is gone. Other
// and malformed entries are preserved: this is crash cleanup, not state
// validation.
function pruneDeadAgents(agents, alivePids) {
  var alive = {}
  var list = alivePids || []
  for (var i = 0; i < list.length; i++) alive[String(Number(list[i]))] = true

  var pruned = false
  var out = {}
  for (var session in agents) {
    var agent = agents[session]
    var pid = Number(agent && agent.pids && agent.pids[0])
    if (agentProbed(agent) && pid > 1 && !alive[String(pid)]) {
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
      if (!agentRank(state)) continue
      if (!out[pid] || agentRank(out[pid]) < agentRank(state)) out[pid] = state
    }
  }
  return out
}

// ---- Reporter agents

// Agents that report through IPC rather than Herdr: `agent(session, state,
// pids)` and the richer `report(session, state, pids, agent, title, cwd,
// activity, time)`. Both land in one map:
//   { [session]: { state, pids, at, since, rich, agent, title, cwd, activity } }
// `at` (unix ms) is the time of the last accepted report, so a report that
// was sent earlier but arrived later is dropped; `since` (unix seconds) is
// when the state last changed; `rich` marks sessions that came from `report`.
// Every text is untrusted, made plain and capped. The map holds at most
// `sessions` entries (the oldest report goes first), and an ended session is
// remembered for `endedTtl` ms (at most `sessions` of them) so a report that
// was made before its "end" but arrives after it cannot bring it back.
// Entries the /proc probe cannot check (no PID, or a plain `agent` session in
// done or idle) are dropped `unprobedTtl` ms after their last report.
var REPORT_LIMITS = { session: 128, agent: 32, title: 120, cwd: 512, activity: 160, pids: 64,
  sessions: 64, endedTtl: 10 * 60 * 1000, unprobedTtl: 30 * 60 * 1000 }
// Not usable as session ids: they would reach Object.prototype in a map.
var RESERVED_SESSIONS = ["__proto__", "constructor", "prototype"]
// Reporter states in Herdr's words, so both sources share one agent shape.
var REPORTER_STATUS = { working: "working", waiting: "blocked", done: "done", idle: "idle" }

// One line of plain text: control and line-separator characters become
// spaces, runs of whitespace one space, cut to `max` with "…". `keepSpaces`
// leaves inner whitespace alone (paths).
function reportText(value, max, keepSpaces) {
  if (value === undefined || value === null || typeof value === "object") return ""
  var text = String(value).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
  text = keepSpaces ? text.trim() : text.replace(/\s+/g, " ").trim()
  return truncate(text, max)
}

// A session id is a key, not text: non-empty, at most 128 characters, no
// control characters and not "__proto__", "constructor" or "prototype", or
// it is refused ("").
function reportSession(value) {
  var text = typeof value === "string" ? value : (typeof value === "number" ? String(value) : "")
  if (text === "" || text.length > REPORT_LIMITS.session) return ""
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text)) return ""
  if (RESERVED_SESSIONS.indexOf(text) !== -1) return ""
  return text
}

// Whether the IPC boundary accepts a report: a valid session and a known
// state, "settle" or "end".
function reportAccepted(session, state) {
  var s = String(state)
  return reportSession(session) !== "" && (s === "end" || s === "settle" || normalizeAgentState(state) !== "")
}

// The last part of a path: "/home/me/Code/app/" -> "app"; "" for "" or "/".
function pathBase(path) {
  var parts = String(path || "").split("/").filter(function(p) { return p !== "" })
  return parts.length ? parts[parts.length - 1] : ""
}

// "/home/me/Code/app" -> "~/Code/app" when `home` is "/home/me".
function tildePath(path, home) {
  var p = String(path || "")
  var h = String(home || "").replace(/\/+$/, "")
  if (h === "" || h === "/") return p
  if (p === h) return "~"
  return p.indexOf(h + "/") === 0 ? "~" + p.slice(h.length) : p
}

// A session's title across reports. A report with no title keeps the
// previous one. A session name (from Claude Code's SessionStart) is kept when
// later reports fall back to the working directory's name.
function reportTitle(previous, title, cwd) {
  var prev = String(previous || "")
  var next = String(title || "")
  var base = pathBase(cwd)
  if (next === "") return prev
  if (prev !== "" && base !== "" && next === base && prev !== base) return prev
  return next
}

// The window PID that owns a PID chain: its first PID that is a window.
function chainWindowPid(pids, windowPids) {
  var list = pids || []
  for (var i = 0; i < list.length; i++) if (windowPids && windowPids[list[i]]) return list[i]
  return 0
}

// The ended-session map after `session` ended at `at`: { session: at },
// entries older than REPORT_LIMITS.endedTtl dropped, at most
// REPORT_LIMITS.sessions of them, the oldest dropped first.
function endedSessions(ended, session, at, now) {
  var out = {}
  var keys = []
  for (var k in ended || {}) {
    if (!own(ended, k) || k === session || !(Number(ended[k]) > now - REPORT_LIMITS.endedTtl)) continue
    out[k] = Number(ended[k])
    keys.push(k)
  }
  if (session) { out[session] = at; keys.push(session) }
  keys.sort(function(a, b) { return out[a] - out[b] })
  for (var i = 0; keys.length - i > REPORT_LIMITS.sessions; i++) delete out[keys[i]]
  return out
}

// Applies one report to the map; returns { agents, accepted, ended }.
// `agents` (and `ended`) are the same objects when nothing changed.
//   report:  { session, state, pids (csv or array), agent, title, cwd,
//              activity, at (unix ms, 0 = now), rich }
//   options: { now (unix ms), activeWindowPid, windowPids: { pid: true },
//              ended: { session: unix ms } from the previous call }
// "end" forgets the session and remembers when (`ended`, see
// endedSessions); a report made at or before that time is dropped. A report
// sent before the one already stored is dropped. "settle" (nothing is
// happening any more, e.g. Claude Code's idle_prompt) turns a working or
// waiting session idle and leaves done and idle ones, and unknown sessions,
// as they are. "done" in the window you are looking at is stored as "idle".
// A plain `agent` report on a `report` session keeps its name, title and
// cwd. A new session beyond REPORT_LIMITS.sessions pushes out the one with
// the oldest last report.
function applyReport(agents, report, options) {
  var current = agents || {}
  var r = report || {}
  var o = options || {}
  var now = Number(o.now) || 0
  var ended = o.ended || {}
  var session = reportSession(r.session)
  if (!session) return { agents: current, accepted: false, ended: ended }
  var prev = own(current, session) ? current[session] : null
  var at = Number(r.at)
  if (!isFinite(at) || at <= 0 || at > now + 5000) at = now
  if (prev && Number(prev.at) > at) return { agents: current, accepted: false, ended: ended }

  var next = {}
  for (var k in current) if (k !== session) next[k] = current[k]
  if (String(r.state) === "end")
    return { agents: prev ? next : current, accepted: true, ended: endedSessions(ended, session, at, now) }
  if (own(ended, session) && at <= Number(ended[session])) return { agents: current, accepted: false, ended: ended }
  var state = normalizeAgentState(r.state)
  if (String(r.state) === "settle") {
    if (!prev || !own(AGENT_LIVE_STATES, prev.state)) return { agents: current, accepted: true, ended: ended }
    state = "idle"
  }
  if (!state) return { agents: current, accepted: false, ended: ended }

  var raw = Array.isArray(r.pids) ? r.pids : parsePids(r.pids)
  var pids = []
  for (var i = 0; i < raw.length && pids.length < REPORT_LIMITS.pids; i++) {
    var pid = Number(raw[i])
    if (isFinite(pid) && pid > 1 && Math.floor(pid) === pid) pids.push(pid)
  }
  if (state === "done" && o.activeWindowPid > 0 && chainWindowPid(pids, o.windowPids) === o.activeWindowPid) state = "idle"

  var entry = { state: state, pids: pids, at: at }
  entry.since = prev && prev.state === state && prev.since ? prev.since : Math.floor(at / 1000)
  var rich = r.rich === true
  if (rich || (prev && prev.rich)) {
    var cwd = rich ? reportText(r.cwd, REPORT_LIMITS.cwd, true) : prev.cwd
    entry.rich = true
    entry.agent = rich ? reportText(r.agent, REPORT_LIMITS.agent) || (prev && prev.agent) || "" : prev.agent
    entry.cwd = cwd || (prev && prev.cwd) || ""
    entry.title = reportTitle(prev && prev.title, rich ? reportText(r.title, REPORT_LIMITS.title) : "", entry.cwd)
    entry.activity = rich ? reportText(r.activity, REPORT_LIMITS.activity) : ""
  }
  if (!prev) {
    var keys = Object.keys(next)
    keys.sort(function(a, b) { return (Number(next[a] && next[a].at) || 0) - (Number(next[b] && next[b].at) || 0) })
    for (var x = 0; keys.length - x >= REPORT_LIMITS.sessions; x++) delete next[keys[x]]
  }
  next[session] = entry
  return { agents: next, accepted: true, ended: ended }
}

// Whether the /proc probe cannot vouch for a session: it has no PID, or it
// is not probed (a plain `agent` session in done or idle).
function reportUnprobed(agent) {
  return !agent || !(Number(agent.pids && agent.pids[0]) > 1) || !agentProbed(agent)
}

// Drops sessions the probe cannot check (reportUnprobed) whose last report
// is more than REPORT_LIMITS.unprobedTtl old. The same object when nothing
// changed.
function expireReports(agents, now) {
  var changed = false
  var out = {}
  for (var k in agents) {
    var a = agents[k]
    if (reportUnprobed(a) && !(Number(a && a.at) >= Number(now) - REPORT_LIMITS.unprobedTtl)) {
      changed = true
      continue
    }
    out[k] = a
  }
  return changed ? out : agents
}

// Seeing a finished agent's window clears its check mark: every "done"
// session whose window is the active window becomes "idle", keeping its
// details and time. The same object when nothing changed.
function acknowledgeReports(agents, activePid, windowPids) {
  if (!(activePid > 0)) return agents
  var changed = false
  var out = {}
  for (var k in agents) {
    var a = agents[k]
    if (a && a.state === "done" && chainWindowPid(a.pids, windowPids) === activePid) {
      var copy = {}
      for (var f in a) copy[f] = a[f]
      copy.state = "idle"
      a = copy
      changed = true
    }
    out[k] = a
  }
  return changed ? out : agents
}

// The reporter map as agent rows, in the shape parseHerdrFeed gives Herdr's
// agents, plus `source: "ipc"`, `pids`, `window_pid` (the window that owns
// it, 0 when none) and `at`.
//   context: { windows: [{ address, pid, workspace }], activePid, home }
// `workspace_label` is the session's title (else its directory's name, else
// the session id), `title` its directory, `workspace_number` the Hyprland
// workspace of its window and `focused` whether that window is active. A
// plain `agent` session that is idle has nothing to show and is left out.
// Newest state change first.
function reporterAgents(agents, context) {
  var c = context || {}
  var windows = Array.isArray(c.windows) ? c.windows : []
  var windowPids = {}
  var workspaceOf = {}
  for (var w = 0; w < windows.length; w++) {
    var win = windows[w]
    if (!win || !(win.pid > 1)) continue
    windowPids[win.pid] = true
    if (!workspaceOf[win.pid]) workspaceOf[win.pid] = Number(win.workspace) > 0 ? Number(win.workspace) : 0
  }
  var out = []
  for (var session in agents) {
    var a = agents[session]
    var status = a && own(REPORTER_STATUS, a.state) ? REPORTER_STATUS[a.state] : ""
    if (!status || (status === "idle" && a.rich !== true)) continue
    var windowPid = chainWindowPid(a.pids, windowPids)
    var cwd = String(a.cwd || "")
    out.push({
      pane_id: "ipc:" + session,
      source: "ipc",
      workspace_id: "",
      workspace_label: String(a.title || "") || pathBase(cwd) || truncate(session, 40),
      workspace_number: windowPid ? workspaceOf[windowPid] : 0,
      tab_id: "",
      agent: String(a.agent || ""),
      status: status,
      title: tildePath(cwd, c.home),
      focused: windowPid > 0 && windowPid === c.activePid,
      session: session,
      state_change: 0,
      activity: String(a.activity || ""),
      tokens: {},
      cwd: cwd,
      since: Number(a.since) > 0 ? Math.floor(Number(a.since)) : 0,
      pids: (a.pids || []).slice(),
      window_pid: windowPid,
      at: Number(a.at) || 0
    })
  }
  out.sort(function(l, r) { return r.since !== l.since ? r.since - l.since : r.at - l.at })
  return out
}

function isReporterAgent(agent) {
  return !!agent && agent.source === "ipc"
}

// One list from both sources: Herdr's agents in their own order
// (sortAgents) and reporter agents, merged newest state change first by
// `since`; on a tie, or a Herdr agent without one, Herdr's comes first. A
// reporter session that Herdr also lists (Herdr's `session` equals the
// report's session id) is shown once, as Herdr's.
function combineAgents(herdr, reporters) {
  var h = sortAgents(herdr)
  var sessions = {}
  for (var i = 0; i < h.length; i++) if (h[i] && h[i].session) sessions[h[i].session] = true
  var r = (Array.isArray(reporters) ? reporters : []).filter(function(a) {
    return a && !Object.prototype.hasOwnProperty.call(sessions, a.session)
  })
  var out = []
  var x = 0, y = 0
  while (x < h.length || y < r.length) {
    if (y >= r.length) out.push(h[x++])
    else if (x >= h.length) out.push(r[y++])
    else if (Number(r[y].since) > (Number(h[x] && h[x].since) || 0)) out.push(r[y++])
    else out.push(h[x++])
  }
  return out
}

// The agents that belong to some windows, in list order: every Herdr agent
// when one of them hosts Herdr (`herdrHosted`), and each reporter agent whose
// window is among them (`pids`: { pid: true }). Feeds a workspace's preview
// rows and an icon's tooltip.
function agentsForWindows(agents, pids, herdrHosted) {
  var out = []
  for (var i = 0; i < (agents || []).length; i++) {
    var a = agents[i]
    if (!a) continue
    if (isReporterAgent(a) ? (a.window_pid > 0 && !!(pids && pids[a.window_pid])) : herdrHosted === true) out.push(a)
  }
  return out
}

// How many of these agents are working or blocked.
function liveAgentCount(agents) {
  var n = 0
  for (var i = 0; i < (agents || []).length; i++) {
    var state = agents[i] && herdrBarState(agents[i].status)
    if (state && own(AGENT_LIVE_STATES, state)) n++
  }
  return n
}

// The window to raise for a reporter agent: the nearest PID in its chain
// that some window has, trying `windows` ([{ address, pid }]) in order, so
// preferred windows go first. "" when none.
function reporterWindowAddress(pids, windows) {
  var list = Array.isArray(windows) ? windows : []
  for (var i = 0; i < (pids || []).length; i++) {
    for (var j = 0; j < list.length; j++)
      if (list[j] && list[j].pid === pids[i] && list[j].address) return String(list[j].address)
  }
  return ""
}

// What clicking an agent does: { kind: "window", address } for a reporter
// agent (address "" when its window is gone; never a Herdr command), or
// { kind: "herdr", pane_id } for a Herdr agent.
function agentFocusTarget(agent, windows) {
  if (isReporterAgent(agent)) return { kind: "window", address: reporterWindowAddress(agent.pids, windows) }
  return { kind: "herdr", pane_id: agent && agent.pane_id ? String(agent.pane_id) : "" }
}

// ---- Herdr

// Herdr, the terminal multiplexer, tracks every agent in its panes itself.
// hooks/herdr-feed relays its snapshots; these helpers turn them into badges.
// Its agent_status is idle | working | blocked | done | unknown, and only
// three of those are worth a badge.
var HERDR_STATES = { working: "working", blocked: "waiting", done: "done" }

function herdrBarState(status) {
  var value = String(status || "")
  return own(HERDR_STATES, value) ? HERDR_STATES[value] : ""
}

// One feed line -> the agent list, or null when the line is not a snapshot.
// Every field is coerced: the text comes from other processes and is only
// ever rendered as plain text. `demo` accepts only the scripted lines of
// `herdr-feed --demo` (marked "demo": true) and otherwise only real ones, so
// a line from the other feed can never slip through while it winds down.
function parseHerdrFeed(line, demo) {
  var data
  try { data = JSON.parse(String(line || "")) } catch (e) { return null }
  if (!data || data.type !== "herdr" || !Array.isArray(data.agents)) return null
  if ((data.demo === true) !== !!demo) return null
  var out = []
  for (var i = 0; i < data.agents.length; i++) {
    var a = data.agents[i]
    // "ipc:" ids belong to reporter agents (see reporterAgents).
    if (!a || typeof a !== "object" || !a.pane_id || String(a.pane_id).indexOf("ipc:") === 0) continue
    var since = Number(a.since)
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
      state_change: Number(a.state_change) || 0,
      activity: typeof a.activity === "string" ? a.activity : "",
      tokens: agentTokens(a.tokens),
      cwd: typeof a.cwd === "string" ? a.cwd : "",
      since: isFinite(since) && since > 0 ? Math.floor(since) : 0
    })
  }
  return out
}

// A feed agent's `tokens`, checked: own string or number entries only, at
// most eight, as plain strings. Anything else gives {}.
function agentTokens(raw) {
  var out = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  var n = 0
  for (var key in raw) {
    if (n >= 8) break
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    var value = raw[key]
    if (typeof value !== "string" && typeof value !== "number") continue
    out[key] = String(value)
    n++
  }
  return out
}

// How long an agent has been in its state: "42s", "4m", "1h 12m", "2d 3h".
// `since` and `now` are unix seconds; "" when `since` is unknown. A `since`
// a little ahead of `now` (clocks read at different moments) reads "0s".
function agentElapsed(since, now) {
  var s = Number(since)
  var n = Number(now)
  if (!isFinite(s) || !isFinite(n) || s <= 0 || n <= 0) return ""
  var d = Math.max(0, Math.floor(n - s))
  if (d < 60) return d + "s"
  if (d < 3600) return Math.floor(d / 60) + "m"
  if (d < 86400) {
    var m = Math.floor((d % 3600) / 60)
    return Math.floor(d / 3600) + "h" + (m ? " " + m + "m" : "")
  }
  var h = Math.floor((d % 86400) / 3600)
  return Math.floor(d / 86400) + "d" + (h ? " " + h + "h" : "")
}

// The token line under an agent: model, context, cost and branch, in that
// order, from the keys Herdr sends; unknown keys are left out. Each value is
// cut to 24 characters. "" when none of them is there.
var AGENT_TOKEN_KEYS = ["model", "ctx", "cost", "branch"]

function agentTokenText(tokens) {
  if (!tokens || typeof tokens !== "object") return ""
  var parts = []
  for (var i = 0; i < AGENT_TOKEN_KEYS.length; i++) {
    var key = AGENT_TOKEN_KEYS[i]
    if (!Object.prototype.hasOwnProperty.call(tokens, key)) continue
    var value = tokens[key]
    if (typeof value !== "string" && typeof value !== "number") continue
    var text = String(value).replace(/\s+/g, " ").trim()
    if (text !== "") parts.push(truncate(text, 24))
  }
  return parts.join(" \u00b7 ")
}

// The line that says what an agent is doing: Herdr's label for its current
// state (its activity), else its pane title. An idle agent keeps its title,
// since Herdr's idle label is a bare word such as "done".
function agentDetailText(agent) {
  if (!agent) return ""
  var status = String(agent.status || "")
  if (agent.activity && status !== "idle" && status !== "unknown") return String(agent.activity)
  return String(agent.title || "")
}

// "blocked 4m": Herdr's status and the time spent in it, or the status alone
// when the time is unknown.
function agentStateText(agent, now) {
  if (!agent) return ""
  var status = String(agent.status || "unknown")
  var elapsed = agentElapsed(agent.since, now)
  return elapsed ? status + " " + elapsed : status
}

// Rolls every Herdr agent up into one badge: the most urgent state plus how
// many agents are live (working or blocked). Finished agents the user has
// already seen (`acked`: { pane_id: true }) no longer count.
function herdrSummary(agents, acked) {
  var best = ""
  var live = 0
  for (var i = 0; i < (agents || []).length; i++) {
    var state = herdrBarState(agents[i].status)
    if (!state || (state === "done" && own(acked, agents[i].pane_id))) continue
    if (own(AGENT_LIVE_STATES, state)) live++
    if (!best || agentRank(state) > agentRank(best)) best = state
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
    if (viewing || own(acked, id)) out[id] = true
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
// "working · Code · omarchy-spaces custom version". Given `now` (unix
// seconds), the status carries the time in it: "blocked 4m · docs · ...".
function herdrTooltipLines(agents, maxTitle, now) {
  var lines = []
  for (var i = 0; i < (agents || []).length; i++) {
    var a = agents[i]
    var elapsed = now ? agentElapsed(a.since, now) : ""
    var parts = [(a.status || "unknown") + (elapsed ? " " + elapsed : "")]
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

// ---- Agent notifications

// Which agents to notify about, from one feed snapshot.
//   seen:    { pane_id: status } from the previous snapshot, or null for the
//            first snapshot after the feed (re)started
//   agents:  the parsed feed
//   options: { mode: "off" | "blocked" | "all", muted, demo, viewing, baseline }
//            `viewing`: the window hosting Herdr is the active window
//            `baseline`: "herdr" when this is the first Herdr snapshot since
//            the feed (re)started, so Herdr's agents only set the baseline
// Returns { seen, alerts: [{ pane_id, kind: "waiting" | "done", agent }] }.
// An alert is due when an agent enters blocked (or, with "all", done) since
// the last snapshot, so each entry into a state alerts at most once. Nothing
// is due on a first snapshot (`seen` null, or Herdr's agents with
// `baseline`: no burst of stale alerts after a restart), while muted, in demo
// mode, or for an agent you are looking at (agentAlertSuppressed). `seen` is
// always updated. `agents` is the full list of both sources each time.
function agentAlerts(seen, agents, options) {
  var o = options || {}
  var list = Array.isArray(agents) ? agents : []
  var next = {}
  var alerts = []
  var quiet = !seen || o.muted === true || o.demo === true || AGENT_NOTIFY.indexOf(o.mode) < 1
  for (var i = 0; i < list.length; i++) {
    var a = list[i]
    if (!a || !a.pane_id) continue
    var id = String(a.pane_id)
    var status = String(a.status || "")
    next[id] = status
    if (quiet || (o.baseline === "herdr" && !isReporterAgent(a))) continue
    if (Object.prototype.hasOwnProperty.call(seen, id) && seen[id] === status) continue
    var kind = status === "blocked" ? "waiting" : (status === "done" && o.mode === "all" ? "done" : "")
    if (!kind || agentAlertSuppressed(a, o)) continue
    alerts.push({ pane_id: id, kind: kind, agent: a })
  }
  return { seen: next, alerts: alerts }
}

// You are looking at it. A Herdr agent: its pane is focused in Herdr and the
// Herdr window is the active window. A reporter agent: its own window is the
// active window (its `focused`).
function agentAlertSuppressed(agent, options) {
  if (isReporterAgent(agent)) return agent.focused === true
  return !!(agent && agent.focused === true && options && options.viewing === true)
}

// Alerts still worth sending after waiting out the rate limit: one per pane
// (the latest), only while the agent is still in the state that raised it
// and still not in front of you, and none while muted or switched off.
function pendingAlerts(alerts, agents, options) {
  var o = options || {}
  if (o.muted === true || o.demo === true || AGENT_NOTIFY.indexOf(o.mode) < 1) return []
  var byPane = {}
  for (var i = 0; i < (agents || []).length; i++) if (agents[i] && agents[i].pane_id) byPane[String(agents[i].pane_id)] = agents[i]
  var out = []
  var index = {}
  for (var j = 0; j < (alerts || []).length; j++) {
    var alert = alerts[j]
    var agent = alert && Object.prototype.hasOwnProperty.call(byPane, alert.pane_id) ? byPane[alert.pane_id] : null
    if (!agent || herdrBarState(agent.status) !== alert.kind) continue
    if (alert.kind === "done" && o.mode !== "all") continue
    if (agentAlertSuppressed(agent, o)) continue
    var fresh = { pane_id: alert.pane_id, kind: alert.kind, agent: agent }
    if (Object.prototype.hasOwnProperty.call(index, alert.pane_id)) out[index[alert.pane_id]] = fresh
    else { index[alert.pane_id] = out.length; out.push(fresh) }
  }
  return out
}

// What an agent is called in a notification: its Herdr workspace label, else
// the agent's name.
function agentAlertName(agent) {
  return truncate((agent && (agent.workspace_label || agent.agent)) || "An agent", 40)
}

// One notification for a batch of alerts:
//   { summary, body, urgency: "critical" | "normal", pane_id }
// One alert reads "docs needs input" or "api finished", with the agent's
// activity or title as the body. A burst is coalesced: "3 agents need input"
// with their names, finished ones added on a second line. null for none.
function agentNotification(alerts) {
  var waiting = []
  var done = []
  for (var i = 0; i < (alerts || []).length; i++) {
    var a = alerts[i]
    if (!a || !a.agent) continue
    if (a.kind === "waiting") waiting.push(a)
    else if (a.kind === "done") done.push(a)
  }
  if (!waiting.length && !done.length) return null
  function names(list) { return list.map(function(x) { return agentAlertName(x.agent) }).join(", ") }
  function detail(x) { return truncate(agentDetailText(x.agent), 120) }
  var finished = done.length === 1 ? agentAlertName(done[0].agent) + " finished"
    : done.length > 1 ? done.length + " agents finished: " + names(done) : ""
  if (waiting.length) {
    var one = waiting.length === 1
    var body = one ? detail(waiting[0]) : names(waiting)
    if (finished) body = body ? body + "\n" + finished : finished
    return {
      summary: one ? agentAlertName(waiting[0].agent) + " needs input" : waiting.length + " agents need input",
      body: body, urgency: "critical", pane_id: waiting[0].pane_id
    }
  }
  return {
    summary: done.length === 1 ? agentAlertName(done[0].agent) + " finished" : done.length + " agents finished",
    body: done.length === 1 ? detail(done[0]) : names(done), urgency: "normal", pane_id: done[0].pane_id
  }
}

// How long to hold a notification so they stay at least `gap` ms apart.
function notifyDelay(lastSent, now, gap) {
  var last = Number(lastSent) || 0
  if (last <= 0) return 0
  return Math.max(0, Math.min(gap, last + gap - Number(now)))
}

// Notification bodies may be read as markup by the daemon; agent text is
// shown as written.
function escapeMarkup(text) {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// notify-send arguments for a notification (see agentNotification). With
// `action`, clicking it reports "default" on stdout (notify-send waits). The
// "--" keeps a summary or body starting with "-" from reading as an option.
function notifyArgs(note, action) {
  var args = ["--app-name=Spaces", "--urgency=" + (note.urgency === "critical" ? "critical" : "normal")]
  if (action) args.push("--action=default=Show agent")
  args.push("--", String(note.summary || "Spaces"), escapeMarkup(note.body))
  return args
}

// An IPC on/off argument: true, false, or null when it is neither.
function parseOnOff(value) {
  var v = String(value === undefined || value === null ? "" : value).trim().toLowerCase()
  if (v === "on" || v === "true" || v === "1" || v === "yes") return true
  if (v === "off" || v === "false" || v === "0" || v === "no") return false
  return null
}

// ---- Demo mode

// Terminal emulators, by app id: "com.mitchellh.ghostty", "foot", "footclient",
// "Alacritty", "kitty", "org.wezfurlong.wezterm".
function isTerminalAppId(appId) {
  return /(^|\.)(ghostty|foot|footclient|alacritty|kitty|wezterm)$/i.test(String(appId || ""))
}

// The window that stands in for the Herdr host in demo mode, since no real
// Herdr client is needed: the first terminal, by workspace id and then left to
// right, among workspaces 3 and up (1 and 2 usually hold real work), else
// the first terminal anywhere. `workspaces`: [{ id, windows: [{ address,
// appId }] }], each window list already in screen order. "" when none.
function demoHostAddress(workspaces) {
  var list = (Array.isArray(workspaces) ? workspaces : []).filter(function(w) { return w && w.id > 0 })
  list.sort(function(l, r) { return l.id - r.id })
  var fallback = ""
  for (var i = 0; i < list.length; i++) {
    var windows = list[i].windows || []
    for (var j = 0; j < windows.length; j++) {
      if (!windows[j] || !isTerminalAppId(windows[j].appId)) continue
      if (list[i].id >= 3) return windows[j].address
      if (!fallback) fallback = windows[j].address
    }
  }
  return fallback
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
  if (own(KEY_NAMES, lower)) return KEY_NAMES[lower]
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
  if (own(BIND_DISPATCHERS, dispatcher)) {
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

// hooks/bind-keys output, checked: { keycodes: { "10": "1", ... },
// binds: [{ modmask, description, key }] }. Accepts the JSON text or the
// parsed value; anything malformed is dropped, so the result is always usable.
function bindKeyData(value) {
  var out = { keycodes: {}, binds: [] }
  var data = value
  if (typeof data === "string") {
    try { data = JSON.parse(data) } catch (e) { return out }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return out
  var codes = data.keycodes
  if (codes && typeof codes === "object" && !Array.isArray(codes)) {
    for (var code in codes) {
      if (!own(codes, code) || !/^\d+$/.test(code)) continue
      if (typeof codes[code] === "string" && codes[code] !== "") out.keycodes[code] = codes[code]
    }
  }
  var list = Array.isArray(data.binds) ? data.binds : []
  for (var i = 0; i < list.length; i++) {
    var b = list[i]
    if (!b || typeof b !== "object") continue
    var mask = Number(b.modmask)
    if (!isFinite(mask) || mask < 0 || mask !== Math.floor(mask)) continue
    if (typeof b.description !== "string" || b.description === "") continue
    if (typeof b.key !== "string" || b.key === "") continue
    out.binds.push({ modmask: mask, description: b.description, key: b.key })
  }
  return out
}

// Display spelling of a bind's key. Lua binds can report the whole combo
// ("SUPER + code:10"); the modifiers are in modmask already. A `code:N`
// keycode goes through the keymap from hooks/bind-keys, and stays "code:N"
// when the keymap does not know it.
function bindKeyText(key, keycodes) {
  var value = String(key || "")
  var plus = value.lastIndexOf(" + ")
  if (plus !== -1) value = value.slice(plus + 3)
  var m = /^code:(\d+)$/.exec(value)
  if (m) {
    var sym = own(keycodes, m[1]) ? keycodes[m[1]] : ""
    return sym !== "" ? keyDisplay(sym) : value
  }
  return keyDisplay(value)
}

// The key of every bind, by position in the parsed `hyprctl binds -j`, with
// gaps filled from hooks/bind-keys: a nonzero keycode is "code:N"; a Lua bind
// listed with neither key nor keycode takes the source key of a bind with the
// same modmask and description that `hyprctl` has not already shown with a
// key, in the order both are defined. "" when nothing is known.
function bindKeys(list, data) {
  var keys = []
  var reported = {}
  var waiting = {}
  for (var i = 0; i < list.length; i++) {
    var b = list[i]
    keys.push("")
    if (!b || typeof b !== "object") continue
    var key = String(b.key || "")
    var code = Number(b.keycode) || 0
    var group = (Number(b.modmask) || 0) + "\u0001" + String(b.description || "")
    if (key !== "") keys[i] = key
    else if (code !== 0) keys[i] = "code:" + code
    else if (b.description) {
      if (!waiting[group]) waiting[group] = []
      waiting[group].push(i)
      continue
    }
    if (keys[i] !== "" && b.description) {
      var shown = bindKeyText(keys[i], data.keycodes)
      reported[group] = reported[group] || {}
      reported[group][shown] = (own(reported[group], shown) ? reported[group][shown] : 0) + 1
    }
  }

  var sources = {}
  for (var j = 0; j < data.binds.length; j++) {
    var s = data.binds[j]
    var g = s.modmask + "\u0001" + s.description
    if (!waiting[g]) continue
    var text = bindKeyText(s.key, data.keycodes)
    var seen = reported[g]
    if (own(seen, text) && seen[text] > 0) { seen[text]--; continue }
    if (!sources[g]) sources[g] = []
    sources[g].push(s.key)
  }
  for (var w in waiting) {
    var from = sources[w] || []
    for (var k = 0; k < waiting[w].length && k < from.length; k++) keys[waiting[w][k]] = from[k]
  }
  return keys
}

// The keys that reach each workspace, from the parsed `hyprctl binds -j` and
// optionally hooks/bind-keys' output (see bindKeyData), which supplies the
// keys `hyprctl` leaves out:
//   { [workspaceId]: { switch: { mods: ["SUPER"], key: "J" } | null, move: ... } }
// A bind whose key cannot be recovered is skipped, as are binds inside a
// submap and mouse binds. With several binds for one workspace: a plain move
// beats a silent one; then a key other than the workspace's own number beats
// the number (SUPER + 1 on workspace 1 is the default every setup has, so
// another key is one the user added); then the modifiers used most across
// that kind of bind win (so a layout's main scheme beats leftovers), then the
// lowest mask, then the first listed.
function workspaceKeyBinds(binds, recovered) {
  var found = { "switch": [], move: [] }
  var counts = { "switch": {}, move: {} }
  var list = Array.isArray(binds) ? binds : []
  var data = bindKeyData(recovered)
  var keys = bindKeys(list, data)
  for (var i = 0; i < list.length; i++) {
    var b = list[i]
    if (!b || typeof b !== "object" || b.mouse === true || (b.submap && b.submap !== "")) continue
    if (keys[i] === "") continue
    var action = bindAction(b)
    if (!action) continue
    var mask = Number(b.modmask) || 0
    var shown = bindKeyText(keys[i], data.keycodes)
    found[action.kind].push({ workspace: action.workspace, mask: mask, silent: action.silent, order: i,
      number: shown === workspaceLabel(action.workspace, false, "number"),
      bind: { mods: modNames(mask), key: shown } })
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
        || (cur.silent === x.silent && cur.number && !x.number)
        || (cur.silent === x.silent && cur.number === x.number
          && (c[x.mask] > c[cur.mask] || (c[x.mask] === c[cur.mask] && x.mask < cur.mask)))
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

// What a bind does to a special workspace: { kind: "toggle" | "move", name,
// silent } or null, where name has no "special:" prefix. Classic binds:
// `togglespecialworkspace` (no argument is the unnamed "special") and
// `movetoworkspace(silent)` with a "special" or "special:name" target. Lua
// binds, by description: Omarchy's "Toggle scratchpad" and "Move window to
// scratchpad", and the same with "special workspace NAME".
var SPECIAL_BIND_DESCRIPTIONS = [
  { re: /^toggle (?:the )?scratchpad$/i, kind: "toggle", name: "scratchpad" },
  { re: /^toggle (?:the )?special workspace(?: (\S+))?$/i, kind: "toggle" },
  { re: /^move window (silently )?to (?:the )?scratchpad$/i, kind: "move", name: "scratchpad" },
  { re: /^move window (silently )?to (?:the )?special workspace(?: (\S+))?$/i, kind: "move" }
]

function specialBindAction(bind) {
  if (!bind || typeof bind !== "object") return null
  var dispatcher = String(bind.dispatcher || "")
  var arg = String(bind.arg || "").trim()
  if (dispatcher === "togglespecialworkspace")
    return { kind: "toggle", name: specialName(arg), silent: false }
  if (dispatcher === "movetoworkspace" || dispatcher === "movetoworkspacesilent") {
    var target = arg.split(",")[0].trim()
    if (target !== "special" && !isSpecialName(target)) return null
    return { kind: "move", name: specialName(target), silent: dispatcher === "movetoworkspacesilent" }
  }
  var description = String(bind.description || "").trim()
  for (var i = 0; i < SPECIAL_BIND_DESCRIPTIONS.length; i++) {
    var d = SPECIAL_BIND_DESCRIPTIONS[i]
    var m = d.re.exec(description)
    if (!m) continue
    if (d.kind === "toggle") return { kind: "toggle", name: d.name || specialName(m[1] || ""), silent: false }
    return { kind: "move", name: d.name || specialName(m[2] || ""), silent: !!m[1] }
  }
  return null
}

// The keys that toggle each special workspace and move a window to it, from
// the same inputs as workspaceKeyBinds:
//   { [name]: { toggle: { mods, key } | null, move: { mods, key } | null } }
// keyed by the name without "special:". Submap and mouse binds and binds
// whose key cannot be recovered are skipped; a plain move beats a silent
// one, otherwise the first listed wins.
function specialKeyBinds(binds, recovered) {
  var list = Array.isArray(binds) ? binds : []
  var data = bindKeyData(recovered)
  var keys = bindKeys(list, data)
  var out = {}
  var silent = {}
  for (var i = 0; i < list.length; i++) {
    var b = list[i]
    if (!b || typeof b !== "object" || b.mouse === true || (b.submap && b.submap !== "")) continue
    if (keys[i] === "") continue
    var action = specialBindAction(b)
    if (!action || action.name === "__proto__") continue
    if (!own(out, action.name)) out[action.name] = { toggle: null, move: null }
    var slot = action.name + "\u0001" + action.kind
    var current = out[action.name][action.kind]
    if (current && !(silent[slot] && !action.silent)) continue
    var mask = Number(b.modmask) || 0
    out[action.name][action.kind] = { mods: modNames(mask), key: bindKeyText(keys[i], data.keycodes) }
    silent[slot] = action.silent
  }
  return out
}

// Tooltip for a special pill: "Scratchpad · SUPER + S to toggle · SUPER +
// ALT + S to move window here", or just its title without binds.
function specialTooltip(name, keys) {
  var parts = [specialTitle(name)]
  if (keys && keys.toggle) parts.push(keyHintText(keys.toggle) + " to toggle")
  if (keys && keys.move) parts.push(keyHintText(keys.move) + " to move window here")
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

// Where one scroll step lands. Only numbered workspaces are stepped through
// (`ids` never holds a special one). While the current workspace is not
// among them, for instance a special workspace, the step starts from
// `fallback`, the last numbered workspace.
function scrollTarget(ids, current, fallback, step) {
  if (!ids.length || !step) return current
  var from = ids.indexOf(current) !== -1 ? current : fallback
  return stepWorkspace(ids, from, step)
}

// Wheel and touchpad scrolling, turned into workspace steps. The idea of an
// accumulator with a cooldown comes from DankMaterialShell's
// WorkspaceSwitcher (MIT); this code is written for Spaces.
//   SCROLL.wheelNotch      angleDelta of one classic wheel notch
//   SCROLL.touchpadStep    pixels of touchpad travel for one step
//   SCROLL.wheelCooldown   ms after a wheel step during which more wheel
//                          input is dropped (free-spinning wheels)
//   SCROLL.touchpadCooldown ms after a touchpad step during which the rest
//                          of the swipe is dropped
//   SCROLL.reset           ms without input after which a partial
//                          accumulation is forgotten
var SCROLL = { wheelNotch: 120, touchpadStep: 100, wheelCooldown: 150, touchpadCooldown: 350, reset: 400 }

// Qt's scroll phases (WheelEvent.phase): a touchpad gesture that the
// compositor marks runs begin, updates, end; momentum is kinetic scrolling
// after the fingers lift. Wheels send none.
var SCROLL_PHASE = { none: 0, begin: 1, update: 2, end: 3, momentum: 4 }

// One wheel event -> { step, state }. `step` is 1 (next workspace), -1
// (previous) or 0.
//   state:   { acc, last, until, gesture } from the previous call, or null
//   event:   { angleX, angleY, pixelX, pixelY, time (ms), phase }
//   options: { vertical (the bar), reverse }
// When the touchpad's events carry a phase (Qt on Wayland marks finger
// scrolling: begin, updates, end when the fingers lift), one gesture gives at
// most one step, however long and slow it is, momentum is ignored, and a new
// gesture can step at once. A pause of SCROLL.reset also ends a gesture.
// Without phases, the cooldown below applies.
// An event with a pixel delta on its axis is a touchpad: its pixels add up
// and every SCROLL.touchpadStep gives one step. Otherwise it is a wheel: its
// angle adds up and every notch (120; high-resolution wheels send parts of
// one) gives one step. After a step, input is dropped for the cooldown, and
// a pause of SCROLL.reset clears what was added up. Scrolling down (or
// right) is the next workspace; `reverse` swaps that. A horizontal bar
// ignores scrolls that are mostly sideways; a vertical bar takes the larger
// axis, with right as down.
function scrollStep(state, event, options) {
  var s = state || {}
  var e = event || {}
  var o = options || {}
  var now = Number(e.time) || 0
  var acc = Number(s.acc) || 0
  var until = Number(s.until) || 0
  var last = Number(s.last) || 0
  var ax = Number(e.angleX) || 0, ay = Number(e.angleY) || 0
  var px = Number(e.pixelX) || 0, py = Number(e.pixelY) || 0
  var hx = ax || px, hy = ay || py
  var phase = Number(e.phase) || 0
  var gesture = s.gesture === true
  if (phase === SCROLL_PHASE.begin || phase === SCROLL_PHASE.end) { acc = 0; gesture = false }
  var unchanged = { step: 0, state: { acc: acc, last: last, until: until, gesture: gesture } }
  if (phase === SCROLL_PHASE.end || phase === SCROLL_PHASE.momentum) return unchanged
  if (hx === 0 && hy === 0) return unchanged
  var sideways = Math.abs(hx) > Math.abs(hy)
  if (sideways && !o.vertical) return unchanged

  var pixel = sideways ? px : py
  var touchpad = pixel !== 0
  var phased = touchpad && (phase === SCROLL_PHASE.begin || phase === SCROLL_PHASE.update)
  var amount = touchpad ? pixel : (sideways ? ax : ay)
  // A pause also ends a gesture, in case the compositor never says it ended.
  if (now - last > SCROLL.reset) { acc = 0; gesture = false }
  // A gesture that has stepped is spent until the fingers lift; without
  // phases the cooldown stands in for that.
  if (phased ? gesture : now < until) return { step: 0, state: { acc: 0, last: now, until: until, gesture: gesture } }
  // A change of direction starts over.
  if (acc !== 0 && (acc < 0) !== (amount < 0)) acc = 0
  acc += amount
  var threshold = touchpad ? SCROLL.touchpadStep : SCROLL.wheelNotch
  if (Math.abs(acc) < threshold) return { step: 0, state: { acc: acc, last: now, until: until, gesture: gesture } }
  var step = acc < 0 ? 1 : -1
  if (o.reverse) step = -step
  return { step: step, state: { acc: 0, last: now, until: now + (touchpad ? SCROLL.touchpadCooldown : SCROLL.wheelCooldown), gesture: phased } }
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
    agentProbed: agentProbed, reportText: reportText, reportSession: reportSession, reportAccepted: reportAccepted,
    pathBase: pathBase, tildePath: tildePath, reportTitle: reportTitle, chainWindowPid: chainWindowPid,
    applyReport: applyReport, endedSessions: endedSessions, expireReports: expireReports, reportUnprobed: reportUnprobed,
    agentRank: agentRank, own: own, acknowledgeReports: acknowledgeReports, reporterAgents: reporterAgents,
    isReporterAgent: isReporterAgent, combineAgents: combineAgents, agentsForWindows: agentsForWindows,
    liveAgentCount: liveAgentCount, reporterWindowAddress: reporterWindowAddress, agentFocusTarget: agentFocusTarget,
    agentAlertSuppressed: agentAlertSuppressed, REPORT_LIMITS: REPORT_LIMITS,
    herdrBarState: herdrBarState, parseHerdrFeed: parseHerdrFeed, herdrSummary: herdrSummary,
    herdrAcks: herdrAcks, parseHerdrClients: parseHerdrClients, herdrStatesByPid: herdrStatesByPid,
    herdrTooltipLines: herdrTooltipLines, localPath: localPath,
    agentTokens: agentTokens, agentElapsed: agentElapsed, agentTokenText: agentTokenText,
    agentDetailText: agentDetailText, agentStateText: agentStateText,
    agentAlerts: agentAlerts, pendingAlerts: pendingAlerts, agentAlertName: agentAlertName,
    agentNotification: agentNotification, notifyDelay: notifyDelay, escapeMarkup: escapeMarkup,
    notifyArgs: notifyArgs, parseOnOff: parseOnOff,
    agentChipSummary: agentChipSummary, agentChipSegments: agentChipSegments, sortAgents: sortAgents,
    herdrHostAddress: herdrHostAddress, herdrHostAnywhere: herdrHostAnywhere,
    herdrRetryDelay: herdrRetryDelay, herdrFeedKey: herdrFeedKey,
    isTerminalAppId: isTerminalAppId, demoHostAddress: demoHostAddress,
    previewWidth: previewWidth, previewDimensions: previewDimensions, monitorArea: monitorArea, previewLayout: previewLayout, durationFor: durationFor,
    workspaceIds: workspaceIds, workspaceLabel: workspaceLabel, workspaceCaption: workspaceCaption, appKey: appKey,
    modNames: modNames, keyDisplay: keyDisplay, workspaceKeyBinds: workspaceKeyBinds, keyHintText: keyHintText,
    bindKeyData: bindKeyData, bindKeyText: bindKeyText,
    keyTooltip: keyTooltip,
    sortWindows: sortWindows, iconItems: iconItems, truncate: truncate,
    focusedLabel: focusedLabel, webAppHost: webAppHost, appIdCandidates: appIdCandidates, iconPathScore: iconPathScore,
    iconNameFromPath: iconNameFromPath, stepWorkspace: stepWorkspace, mergedEntry: mergedEntry,
    scrollTarget: scrollTarget, scrollStep: scrollStep, SCROLL: SCROLL, SCROLL_PHASE: SCROLL_PHASE,
    isSpecialName: isSpecialName, specialName: specialName, specialTitle: specialTitle, specialLabel: specialLabel,
    specialWorkspaces: specialWorkspaces, parseActiveSpecial: parseActiveSpecial, specialShownMap: specialShownMap,
    specialShownOn: specialShownOn, monitorSpecials: monitorSpecials, luaString: luaString, specialToggleDispatch: specialToggleDispatch,
    specialBindAction: specialBindAction, specialKeyBinds: specialKeyBinds, specialTooltip: specialTooltip,
    SCRATCHPAD_GLYPH: SCRATCHPAD_GLYPH,
    fallbackLetter: fallbackLetter
  }
}
