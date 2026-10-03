// Run: node tests/model.test.js
const fs = require("fs")
const path = require("path")
const assert = require("assert")

const src = fs.readFileSync(path.join(__dirname, "..", "Model.js"), "utf8").replace(/^\.pragma library\s*/, "")
const mod = { exports: {} }
new Function("module", src)(mod)
const M = mod.exports

let failed = 0
function test(name, fn) {
  try { fn(); console.log("ok   " + name) } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message) }
}

test("resolveSettings fills defaults and clamps", () => {
  const s = M.resolveSettings({ iconSize: 99, showApps: "bogus", persistentWorkspaces: -3, groupApps: "yes" })
  assert.strictEqual(s.iconSize, 24)
  assert.strictEqual(s.showApps, "hover")
  assert.strictEqual(s.persistentWorkspaces, 0)
  assert.strictEqual(s.groupApps, false)
})

test("workspaceIds keeps persistent, adds occupied and active, sorted", () => {
  assert.deepStrictEqual(M.workspaceIds({ 7: 2, 2: 0 }, [9], 3, false), [1, 2, 3, 7, 9])
})

test("workspaceIds hideEmpty keeps only occupied and active", () => {
  assert.deepStrictEqual(M.workspaceIds({ 1: 0, 4: 1 }, [2], 5, true), [2, 4])
})

test("workspaceLabel", () => {
  assert.strictEqual(M.workspaceLabel(10, false, "number"), "0")
  assert.strictEqual(M.workspaceLabel(3, true, "none"), "")
  assert.notStrictEqual(M.workspaceLabel(3, true, "glyph"), "3")
  assert.strictEqual(M.workspaceLabel(3, false, "glyph"), "3")
})

test("workspaceLabel key styles", () => {
  const keys = { switch: { mods: ["SUPER"], key: "J" }, move: null }
  assert.strictEqual(M.workspaceLabel(1, false, "key", keys), "J")
  assert.strictEqual(M.workspaceLabel(10, false, "key", null), "0")
  assert.strictEqual(M.workspaceLabel(1, true, "both", keys), "1")
  assert.strictEqual(M.workspaceCaption(1, "both", keys), "J")
  assert.strictEqual(M.workspaceCaption(1, "key", keys), "")
  assert.strictEqual(M.workspaceCaption(2, "both", null), "")
  // SUPER + 3 on workspace 3 would only repeat the number.
  assert.strictEqual(M.workspaceCaption(3, "both", { switch: { mods: ["SUPER"], key: "3" }, move: null }), "")
  assert.strictEqual(M.workspaceCaption(10, "both", { switch: { mods: ["SUPER"], key: "0" }, move: null }), "")
  assert.strictEqual(M.resolveSettings({}).labelStyle, "both")
  assert.strictEqual(M.resolveSettings({ labelStyle: "key" }).labelStyle, "key")
  assert.strictEqual(M.resolveSettings({ labelStyle: "keys" }).labelStyle, "both")
  assert.strictEqual(M.resolveSettings({}).keyTooltips, true)
  assert.strictEqual(M.resolveSettings({ keyTooltips: false }).keyTooltips, false)
})

test("modNames spells modifiers SUPER, CTRL, ALT, SHIFT", () => {
  assert.deepStrictEqual(M.modNames(64), ["SUPER"])
  assert.deepStrictEqual(M.modNames(9), ["ALT", "SHIFT"])
  assert.deepStrictEqual(M.modNames(77), ["SUPER", "CTRL", "ALT", "SHIFT"])
  assert.deepStrictEqual(M.modNames(0), [])
  assert.deepStrictEqual(M.modNames(130), ["CAPS", "MOD5"])
})

test("keyHintText and keysym display", () => {
  assert.strictEqual(M.keyHintText({ mods: ["SUPER"], key: "J" }), "SUPER + J")
  assert.strictEqual(M.keyHintText({ mods: [], key: "F1" }), "F1")
  assert.strictEqual(M.keyHintText(null), "")
  const shown = ["j", "7", "comma", "period", "slash", "minus", "equal", "grave", "bracketleft", "bracketright",
    "semicolon", "apostrophe", "backslash", "space", "Return", "Tab", "TAB", "Escape", "F5", "KP_End"].map(M.keyDisplay)
  assert.deepStrictEqual(shown, ["J", "7", ",", ".", "/", "-", "=", "`", "[", "]", ";", "'", "\\", "Space", "Enter", "Tab", "Tab", "Esc", "F5", "KP_End"])
  assert.strictEqual(M.keyDisplay("constructor"), "constructor")
})

test("workspaceKeyBinds reads Omarchy's Lua binds by description", () => {
  const lua = [
    // The keyless copies Lua leaves behind are skipped.
    { modmask: 64, key: "", keycode: 0, dispatcher: "__lua", arg: "71", description: "Switch to workspace 1", submap: "" },
    { modmask: 65, key: "", keycode: 0, dispatcher: "__lua", arg: "73", description: "Move window to workspace 1", submap: "" },
    { modmask: 64, key: "J", keycode: 0, dispatcher: "__lua", arg: "68", description: "Switch to workspace 1", submap: "" },
    { modmask: 9, key: "J", keycode: 0, dispatcher: "__lua", arg: "76", description: "Move window to workspace 1", submap: "" },
    { modmask: 73, key: "J", keycode: 0, dispatcher: "__lua", arg: "77", description: "Move window silently to workspace 1", submap: "" },
    { modmask: 64, key: "K", keycode: 0, dispatcher: "__lua", arg: "84", description: "switch to WORKSPACE 2", submap: "" },
    { modmask: 73, key: "K", keycode: 0, dispatcher: "__lua", arg: "85", description: "Move window silently to workspace 2", submap: "" },
    { modmask: 64, key: "TAB", keycode: 0, dispatcher: "__lua", arg: "135", description: "Next workspace", submap: "" },
    { modmask: 64, key: "R", keycode: 0, dispatcher: "__lua", arg: "200", description: "Switch to workspace 4", submap: "resize" }
  ]
  assert.deepStrictEqual(M.workspaceKeyBinds(lua), {
    1: { switch: { mods: ["SUPER"], key: "J" }, move: { mods: ["ALT", "SHIFT"], key: "J" } },
    // A silent move still moves the window there when it is all there is.
    2: { switch: { mods: ["SUPER"], key: "K" }, move: { mods: ["SUPER", "ALT", "SHIFT"], key: "K" } }
  })
})

test("workspaceKeyBinds reads classic dispatcher binds", () => {
  const classic = [
    { modmask: 64, key: "3", keycode: 0, dispatcher: "workspace", arg: "3", description: "" },
    { modmask: 65, key: "3", keycode: 0, dispatcher: "movetoworkspace", arg: "3", description: "" },
    { modmask: 64, key: "comma", keycode: 0, dispatcher: "workspace", arg: "4", description: "" },
    { modmask: 72, key: "", keycode: 13, dispatcher: "movetoworkspacesilent", arg: "4", description: "" },
    { modmask: 64, key: "5", keycode: 0, dispatcher: "workspace", arg: "e+1", description: "" },
    { modmask: 64, key: "6", keycode: 0, dispatcher: "workspace", arg: "name:web", description: "" },
    { modmask: 64, key: "mouse:272", keycode: 0, dispatcher: "workspace", arg: "7", mouse: true, description: "" }
  ]
  assert.deepStrictEqual(M.workspaceKeyBinds(classic), {
    3: { switch: { mods: ["SUPER"], key: "3" }, move: { mods: ["SUPER", "SHIFT"], key: "3" } },
    4: { switch: { mods: ["SUPER"], key: "," }, move: { mods: ["SUPER", "ALT"], key: "code:13" } }
  })
  assert.deepStrictEqual(M.workspaceKeyBinds(null), {})
  assert.deepStrictEqual(M.workspaceKeyBinds([null, 3, {}]), {})
})

test("workspaceKeyBinds prefers the most common modifiers, then the lowest, then the first", () => {
  const binds = [
    // Upstream's SUPER + digit binds next to the user's own CTRL + letter scheme.
    { modmask: 64, key: "1", dispatcher: "workspace", arg: "1" },
    { modmask: 4, key: "A", dispatcher: "workspace", arg: "1" },
    { modmask: 4, key: "S", dispatcher: "workspace", arg: "2" },
    { modmask: 4, key: "D", dispatcher: "workspace", arg: "3" },
    { modmask: 64, key: "9", dispatcher: "workspace", arg: "9" },
    // Tied counts: the lower mask wins, whatever the order.
    { modmask: 72, key: "X", dispatcher: "movetoworkspace", arg: "1" },
    { modmask: 9, key: "Y", dispatcher: "movetoworkspace", arg: "1" },
    // Same mask twice: the first listed wins.
    { modmask: 4, key: "Q", dispatcher: "workspace", arg: "8" },
    { modmask: 4, key: "W", dispatcher: "workspace", arg: "8" }
  ]
  const out = M.workspaceKeyBinds(binds)
  assert.deepStrictEqual(out[1].switch, { mods: ["CTRL"], key: "A" })
  assert.deepStrictEqual(out[9].switch, { mods: ["SUPER"], key: "9" })
  assert.deepStrictEqual(out[1].move, { mods: ["ALT", "SHIFT"], key: "Y" })
  assert.deepStrictEqual(out[8].switch, { mods: ["CTRL"], key: "Q" })
  assert.strictEqual(out[2].move, null)
})

test("keyTooltip names the keys for a workspace", () => {
  const sw = { mods: ["SUPER"], key: "L" }
  const mv = { mods: ["ALT", "SHIFT"], key: "L" }
  assert.strictEqual(M.keyTooltip(3, { switch: sw, move: mv }), "Workspace 3 · SUPER + L to switch · ALT + SHIFT + L to move window here")
  assert.strictEqual(M.keyTooltip(3, { switch: sw, move: null }), "Workspace 3 · SUPER + L to switch")
  assert.strictEqual(M.keyTooltip(3, { switch: null, move: mv }), "Workspace 3 · ALT + SHIFT + L to move window here")
  assert.strictEqual(M.keyTooltip(3, null), "")
})

test("sortWindows orders by x then y, unknown last", () => {
  const w = [{ id: "a", at: [500, 0] }, { id: "b" }, { id: "c", at: [10, 300] }, { id: "d", at: [10, 5] }]
  assert.deepStrictEqual(M.sortWindows(w).map(x => x.id), ["d", "c", "a", "b"])
})

test("iconItems groups same app and keeps focused address", () => {
  const r = M.iconItems([
    { address: "1", appId: "foot", title: "a", focused: false },
    { address: "2", appId: "zen", title: "b", focused: false },
    { address: "3", appId: "Foot", title: "c", focused: true }
  ], true, 8)
  assert.strictEqual(r.items.length, 2)
  assert.strictEqual(r.items[0].count, 2)
  assert.strictEqual(r.items[0].address, "3")
  assert.strictEqual(r.items[0].focused, true)
})

test("iconItems overflow never hides focused", () => {
  const ws = [1, 2, 3, 4, 5].map(i => ({ address: String(i), appId: "a" + i, title: "", focused: i === 5 }))
  const r = M.iconItems(ws, false, 3)
  assert.strictEqual(r.overflow, 2)
  assert.deepStrictEqual(r.items.map(i => i.address), ["1", "2", "5"])
})

test("focusedLabel uses app name for single window, title for many", () => {
  assert.strictEqual(M.focusedLabel({ focused: true, count: 1, title: "t" }, "Foot", 20), "Foot")
  assert.strictEqual(M.focusedLabel({ focused: true, count: 2, title: "long title here" }, "Foot", 6), "long …")
  assert.strictEqual(M.focusedLabel({ focused: false, count: 1 }, "Foot", 20), "")
})

test("webAppHost parses chromium app classes", () => {
  assert.strictEqual(M.webAppHost("chrome-web.whatsapp.com__-Default"), "web.whatsapp.com")
  assert.strictEqual(M.webAppHost("brave-app.hey.com__-Profile_1"), "app.hey.com")
  assert.strictEqual(M.webAppHost("chrome-x.com__home-Default"), "x.com")
  assert.strictEqual(M.webAppHost("foot"), "")
})

test("iconPathScore prefers svg then larger png", () => {
  assert.ok(M.iconPathScore("/a/scalable/apps/x.svg") > M.iconPathScore("/a/128x128/apps/x.png"))
  assert.ok(M.iconPathScore("/a/128x128/apps/x.png") > M.iconPathScore("/a/16x16/apps/x.png"))
  assert.strictEqual(M.iconNameFromPath("/a/b/zen-browser.png"), "zen-browser")
})

test("stepWorkspace wraps", () => {
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 5, 1), 1)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 1, -1), 5)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 2, 1), 5)
})

test("mergedEntry keeps id first and applies delta", () => {
  assert.deepStrictEqual(M.mergedEntry("x.y", { id: "old", a: 1 }, { b: 2 }), { id: "x.y", a: 1, b: 2 })
})

test("showsApps respects master switch and modes", () => {
  const s = (o) => M.resolveSettings(o)
  assert.strictEqual(M.showsApps(s({ showIcons: false, showApps: "all" }), true, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), true, false, false), true)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), false, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "active" }), true, false, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hover" }), true, false, true), true)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, true, false), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, false, true), true)
})

test("new settings validate", () => {
  const s = M.resolveSettings({ density: "huge", iconStyle: "mono", activeClick: "previous", settingsButton: "x" })
  assert.strictEqual(s.density, "normal")
  assert.strictEqual(s.iconStyle, "mono")
  assert.strictEqual(s.activeClick, "previous")
  assert.strictEqual(s.settingsButton, "never")
  assert.strictEqual(s.showIcons, true)
  assert.strictEqual(s.pillBackground, true)
  assert.strictEqual(M.resolveSettings({ pillBackground: false }).pillBackground, false)
})

test("normalizeAddress strips 0x and lowercases", () => {
  assert.strictEqual(M.normalizeAddress("0x624FAC"), "624fac")
  assert.strictEqual(M.normalizeAddress("624fac"), "624fac")
})

test("monitorArea removes reserved space in logical coords", () => {
  const a = M.monitorArea({ x: 0, y: 0, width: 3440, height: 1440, scale: 1.25, reserved: [0, 35, 0, 0] })
  assert.deepStrictEqual(a, { x: 0, y: 35, width: 2752, height: 1117 })
  assert.strictEqual(M.monitorArea(null), null)
})

test("previewLayout scales real positions and puts floating last", () => {
  const area = { x: 0, y: 0, width: 1000, height: 500 }
  const out = M.previewLayout([
    { address: "f", at: [100, 100], size: [200, 100], floating: true },
    { address: "a", at: [0, 0], size: [500, 500] },
    { address: "b", at: [500, 0], size: [500, 500] }
  ], area, 100, 50)
  assert.deepStrictEqual(out.map(p => p.address), ["a", "b", "f"])
  assert.deepStrictEqual(out[1], { address: "b", x: 50, y: 0, width: 50, height: 50, floating: false })
  assert.deepStrictEqual([out[2].x, out[2].y, out[2].width, out[2].height], [10, 10, 20, 10])
})

test("monitorArea handles every rotation before scale and logical reservations", () => {
  for (let transform = 0; transform < 8; transform++) {
    const area = M.monitorArea({ x: -1200, y: -400, width: 2560, height: 1440,
      scale: 1.25, transform, reserved: [10, 20, 30, 40] })
    assert.deepStrictEqual(area, { x: -1190, y: -380,
      width: (transform % 2 ? 1152 : 2048) - 40,
      height: (transform % 2 ? 2048 : 1152) - 60 })
  }
})

test("portrait preview keeps both stacked windows fully visible", () => {
  const area = M.monitorArea({ x: -1440, y: -480, width: 2560, height: 1440,
    transform: 1, scale: 1, reserved: [0, 0, 0, 26] })
  const size = M.previewDimensions(area, 380, 1000, 900)
  assert.strictEqual(size.height, 380)
  assert.ok(size.height > size.width)
  const windows = [
    { address: "top", at: [-1440, -480], size: [1440, 1267] },
    { address: "bottom", at: [-1440, 787], size: [1440, 1267] }
  ]
  const out = M.previewLayout(windows, area, size.width, size.height)
  assert.strictEqual(out[0].height, out[1].height)
  assert.strictEqual(out[1].y + out[1].height, size.height)
  assert.strictEqual(out[1].width, size.width)
})

test("previewDimensions fits portrait workspaces on short or narrow screens", () => {
  const area = { width: 1440, height: 2534 }
  for (const bounds of [[1000, 400], [200, 900]]) {
    const size = M.previewDimensions(area, 520, ...bounds)
    assert.ok(size.width <= bounds[0])
    assert.ok(size.height <= bounds[1])
    assert.ok(Math.abs(size.width / size.height - area.width / area.height) < 1e-10)
  }
  assert.deepStrictEqual(M.previewDimensions({ width: 1600, height: 900 }, 380, 1000, 900),
    { width: 380, height: 213.75 })
  assert.deepStrictEqual(M.previewDimensions(null, 380, 1000, 900),
    { width: 380, height: 213.75 })
})

test("preview size has the same longest side and area in either orientation", () => {
  for (const preset of ["small", "medium", "large"]) {
    const extent = M.previewWidth(preset)
    const landscape = M.previewDimensions({ width: 1600, height: 900 }, extent, 2000, 2000)
    const portrait = M.previewDimensions({ width: 900, height: 1600 }, extent, 2000, 2000)
    assert.strictEqual(portrait.height, landscape.width)
    assert.strictEqual(portrait.width, landscape.height)
  }
})

test("previewLayout clamps windows hanging off screen", () => {
  const out = M.previewLayout([{ address: "a", at: [-100, 0], size: [300, 100] }], { x: 0, y: 0, width: 1000, height: 1000 }, 100, 100)
  assert.deepStrictEqual([out[0].x, out[0].width], [0, 20])
})

test("previewLayout falls back to a grid without positions", () => {
  const out = M.previewLayout([{ address: "a" }, { address: "b" }, { address: "c" }], null, 100, 100)
  assert.strictEqual(out.length, 3)
  assert.strictEqual(out[0].x, 0)
  assert.ok(out[1].x > 0)
  assert.ok(out[2].y > 0)
})

test("preview settings validate", () => {
  const s = M.resolveSettings({ previewSize: "huge", previews: false })
  assert.strictEqual(s.previewSize, "medium")
  assert.strictEqual(s.previews, false)
  assert.strictEqual(s.previewLive, true)
  assert.strictEqual(M.previewWidth("large"), 520)
})

test("appIdCandidates adds the last reverse-DNS segment", () => {
  assert.deepStrictEqual(M.appIdCandidates("dev.tgomareli.logi-kvm-console"), ["dev.tgomareli.logi-kvm-console", "logi-kvm-console"])
  assert.deepStrictEqual(M.appIdCandidates("Slack"), ["Slack", "slack"])
  assert.deepStrictEqual(M.appIdCandidates(""), [])
})

test("fallbackLetter prefers the readable tail of a reverse-DNS class", () => {
  // Without this every org.omarchy.* app shares the letter "O".
  assert.strictEqual(M.fallbackLetter("", "org.omarchy.herdr"), "H")
  assert.strictEqual(M.fallbackLetter("", "org.omarchy.agent"), "A")
  // A real desktop-entry name always wins.
  assert.strictEqual(M.fallbackLetter("Zen Browser", "zen"), "Z")
  // appId echoed back as the name is not a real name.
  assert.strictEqual(M.fallbackLetter("org.kde.dolphin", "org.kde.dolphin"), "D")
  assert.strictEqual(M.fallbackLetter("", "foot"), "F")
  assert.strictEqual(M.fallbackLetter("", ""), "")
})

test("agentStates picks the nearest window and the most urgent state", () => {
  const windows = { 100: true, 200: true, 300: true }
  const agents = {
    a: { state: "working", pids: [5, 6, 100, 200] },
    b: { state: "waiting", pids: [7, 100] },
    c: { state: "done", pids: [8, 300] },
    d: { state: "idle", pids: [9, 300] },
    e: { state: "working", pids: [10, 11] }
  }
  assert.deepStrictEqual(M.agentStates(agents, windows), { 100: "waiting", 300: "done" })
})

test("normalizeAgentState accepts only badge states", () => {
  assert.strictEqual(M.normalizeAgentState("waiting"), "waiting")
  assert.strictEqual(M.normalizeAgentState("end"), "")
  assert.strictEqual(M.normalizeAgentState("exploding"), "")
  assert.strictEqual(M.normalizeAgentState(undefined), "")
})

test("agentProcessIds collects one live process per active session", () => {
  const agents = {
    a: { state: "working", pids: [101, 1] },
    b: { state: "waiting", pids: [202, 101] },
    c: { state: "waiting", pids: [101, 303] },
    d: { state: "done", pids: [404, 1] },
    e: { state: "working", pids: ["nope", 1] }
  }
  assert.deepStrictEqual(M.agentProcessIds(agents), [101, 202])
})

test("pruneDeadAgents removes only dead live claims", () => {
  const agents = {
    live: { state: "working", pids: [101, 1] },
    dead: { state: "waiting", pids: [202, 1] },
    finished: { state: "done", pids: [303, 1] },
    malformed: { state: "working", pids: [] }
  }
  assert.deepStrictEqual(M.pruneDeadAgents(agents, [101]), {
    live: { state: "working", pids: [101, 1] },
    finished: { state: "done", pids: [303, 1] },
    malformed: { state: "working", pids: [] }
  })
  assert.strictEqual(M.pruneDeadAgents(agents, [101, 202]), agents)
})

test("parsePids drops junk and init", () => {
  assert.deepStrictEqual(M.parsePids("12,abc,1,,34"), [12, 34])
})

test("herdr settings validate", () => {
  assert.strictEqual(M.resolveSettings({}).herdrAgents, true)
  assert.strictEqual(M.resolveSettings({ herdrAgents: false }).herdrAgents, false)
  assert.strictEqual(M.resolveSettings({ herdrAgents: "no" }).herdrAgents, true)
})

test("herdrBarState maps Herdr statuses to badges", () => {
  assert.strictEqual(M.herdrBarState("working"), "working")
  assert.strictEqual(M.herdrBarState("blocked"), "waiting")
  assert.strictEqual(M.herdrBarState("done"), "done")
  assert.strictEqual(M.herdrBarState("idle"), "")
  assert.strictEqual(M.herdrBarState("unknown"), "")
  assert.strictEqual(M.herdrBarState("toString"), "")
  assert.strictEqual(M.herdrBarState(undefined), "")
})

test("parseHerdrFeed keeps agents and rejects other lines", () => {
  const line = JSON.stringify({ type: "herdr", focused_workspace_id: "w1", agents: [
    { pane_id: "w1:p1", workspace_id: "w1", workspace_label: "Code", workspace_number: 3, tab_id: "w1:t1",
      agent: "claude", status: "working", title: "fix bar", focused: true, session: "abc" },
    { workspace_id: "w2", status: "done" },
    null
  ] })
  assert.deepStrictEqual(M.parseHerdrFeed(line), [{ pane_id: "w1:p1", workspace_id: "w1", workspace_label: "Code",
    workspace_number: 3, tab_id: "w1:t1", agent: "claude", status: "working", title: "fix bar", focused: true, session: "abc" }])
  assert.deepStrictEqual(M.parseHerdrFeed(JSON.stringify({ type: "herdr", agents: [{ pane_id: 7, agent: null }] }))[0],
    { pane_id: "7", workspace_id: "", workspace_label: "", workspace_number: 0, tab_id: "", agent: "",
      status: "", title: "", focused: false, session: "" })
  assert.strictEqual(M.parseHerdrFeed("not json"), null)
  assert.strictEqual(M.parseHerdrFeed(JSON.stringify({ type: "other", agents: [] })), null)
  assert.strictEqual(M.parseHerdrFeed(JSON.stringify({ type: "herdr" })), null)
})

test("herdrSummary ranks states and counts live agents", () => {
  const agents = [
    { pane_id: "a", status: "working" },
    { pane_id: "b", status: "done" },
    { pane_id: "c", status: "idle" },
    { pane_id: "d", status: "working" }
  ]
  assert.deepStrictEqual(M.herdrSummary(agents, {}), { state: "working", live: 2 })
  assert.deepStrictEqual(M.herdrSummary(agents.concat([{ pane_id: "e", status: "blocked" }]), {}), { state: "waiting", live: 3 })
  assert.deepStrictEqual(M.herdrSummary([{ pane_id: "b", status: "done" }], {}), { state: "done", live: 0 })
  assert.deepStrictEqual(M.herdrSummary([{ pane_id: "b", status: "done" }], { b: true }), { state: "", live: 0 })
  assert.deepStrictEqual(M.herdrSummary([], {}), { state: "", live: 0 })
})

test("herdrAcks keeps seen finishes until they leave done", () => {
  const agents = [{ pane_id: "a", status: "done" }, { pane_id: "b", status: "done" }, { pane_id: "c", status: "working" }]
  assert.deepStrictEqual(M.herdrAcks(agents, {}, true), { a: true, b: true })
  assert.deepStrictEqual(M.herdrAcks(agents, { a: true, c: true }, false), { a: true })
  // Working again drops the ack, so the next finish shows its check mark.
  const acked = M.herdrAcks([{ pane_id: "a", status: "working" }], { a: true }, false)
  assert.deepStrictEqual(M.herdrAcks([{ pane_id: "a", status: "done" }], acked, false), {})
})

test("parseHerdrClients finds the nearest window hosting each client", () => {
  const text = "500,400,1\n\n600,700,400\njunk\n800,900\n500,400"
  assert.deepStrictEqual(M.parseHerdrClients(text, { 400: true, 700: true }), [400, 700])
  assert.deepStrictEqual(M.parseHerdrClients("", { 400: true }), [])
})

test("herdrStatesByPid badges every Herdr window with the combined state", () => {
  assert.deepStrictEqual(M.herdrStatesByPid([10, 20], { state: "waiting", live: 1 }), { 10: "waiting", 20: "waiting" })
  assert.deepStrictEqual(M.herdrStatesByPid([10], { state: "", live: 0 }), {})
})

test("mergeAgentStates keeps the most urgent state per window", () => {
  assert.deepStrictEqual(M.mergeAgentStates({ 1: "done", 2: "waiting", 4: "idle" }, { 1: "working", 2: "working", 3: "done" }),
    { 1: "working", 2: "waiting", 3: "done" })
  assert.deepStrictEqual(M.mergeAgentStates(undefined, { 5: "done" }), { 5: "done" })
})

test("herdrTooltipLines lists status, workspace and title", () => {
  assert.deepStrictEqual(M.herdrTooltipLines([
    { status: "working", workspace_label: "Code", title: "omarchy-spaces custom version" },
    { status: "blocked", workspace_label: "", title: "a very long title indeed" },
    { status: "", workspace_label: "Notes", title: "" }
  ], 10), ["working · Code · omarchy-s…", "blocked · a very lo…", "unknown · Notes"])
})

test("localPath decodes file URLs", () => {
  assert.strictEqual(M.localPath("file:///home/me/my%20plugins/hooks/herdr-feed"), "/home/me/my plugins/hooks/herdr-feed")
  assert.strictEqual(M.localPath("/already/a/path"), "/already/a/path")
})

// Apps and web pages set their own window titles. Qt guesses rich text by
// default, so a title with markup could load remote images in the shell.
test("window titles render as plain text", () => {
  const qml = fs.readFileSync(path.join(__dirname, "..", "Spaces.qml"), "utf8")
  const blocks = []
  const re = /^\s*Text\s*\{/gm
  let m
  while ((m = re.exec(qml))) {
    let depth = 0, i = qml.indexOf("{", m.index)
    const start = i
    for (; i < qml.length; i++) {
      if (qml[i] === "{") depth++
      else if (qml[i] === "}" && --depth === 0) break
    }
    blocks.push(qml.slice(start, i + 1))
  }
  const titled = blocks.filter((b) => /^\s*text:.*title/im.test(b))
  assert.ok(titled.length >= 2, "expected the focused title and the preview footer")
  for (const b of titled) assert.match(b, /textFormat:\s*Text\.PlainText/, b.split("\n").find((l) => /text:/.test(l)).trim())
})

if (failed) { console.log(failed + " failed"); process.exit(1) }
