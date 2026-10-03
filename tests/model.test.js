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

// hooks/bind-keys output as it looks on a stock Omarchy install (trimmed).
const helperOutput = {
  keymap: "xkbcli", config: "lua",
  keycodes: { "10": "1", "11": "2", "19": "0", "20": "minus", "21": "equal", "44": "j" },
  binds: [
    { modmask: 64, description: "Switch to workspace 1", key: "code:10" },
    { modmask: 65, description: "Move window to workspace 1", key: "code:10" },
    { modmask: 73, description: "Move window silently to workspace 1", key: "code:10" },
    { modmask: 64, description: "Switch to workspace 2", key: "code:11" },
    { modmask: 65, description: "Move window to workspace 2", key: "code:11" },
    { modmask: 64, description: "Switch to workspace 10", key: "code:19" },
    { modmask: 64, description: "Expand window left", key: "code:20" }
  ]
}
// `hyprctl binds -j` for the same binds: no key and no keycode.
const stockBinds = [
  { modmask: 64, key: "", keycode: 0, dispatcher: "__lua", arg: "45", description: "Switch to workspace 1", submap: "" },
  { modmask: 65, key: "", keycode: 0, dispatcher: "__lua", arg: "46", description: "Move window to workspace 1", submap: "" },
  { modmask: 73, key: "", keycode: 0, dispatcher: "__lua", arg: "47", description: "Move window silently to workspace 1", submap: "" },
  { modmask: 64, key: "", keycode: 0, dispatcher: "__lua", arg: "48", description: "Switch to workspace 2", submap: "" },
  { modmask: 65, key: "", keycode: 0, dispatcher: "__lua", arg: "49", description: "Move window to workspace 2", submap: "" },
  { modmask: 64, key: "", keycode: 0, dispatcher: "__lua", arg: "72", description: "Switch to workspace 10", submap: "" }
]

test("workspaceKeyBinds resolves classic keycode-only binds through the keymap", () => {
  const classic = [
    { modmask: 64, key: "", keycode: 10, dispatcher: "workspace", arg: "1", description: "" },
    { modmask: 65, key: "", keycode: 10, dispatcher: "movetoworkspace", arg: "1", description: "" },
    { modmask: 64, key: "", keycode: 20, dispatcher: "workspace", arg: "11", description: "" }
  ]
  assert.deepStrictEqual(M.workspaceKeyBinds(classic, helperOutput), {
    1: { switch: { mods: ["SUPER"], key: "1" }, move: { mods: ["SUPER", "SHIFT"], key: "1" } },
    11: { switch: { mods: ["SUPER"], key: "-" }, move: null }
  })
  // Without the helper the keycode is still shown, as before.
  assert.deepStrictEqual(M.workspaceKeyBinds(classic)[1].switch, { mods: ["SUPER"], key: "code:10" })
})

test("workspaceKeyBinds recovers keyless Lua binds by modmask and description", () => {
  const out = M.workspaceKeyBinds(stockBinds, helperOutput)
  assert.deepStrictEqual(out[1], { switch: { mods: ["SUPER"], key: "1" }, move: { mods: ["SUPER", "SHIFT"], key: "1" } })
  assert.deepStrictEqual(out[2], { switch: { mods: ["SUPER"], key: "2" }, move: { mods: ["SUPER", "SHIFT"], key: "2" } })
  assert.deepStrictEqual(out[10], { switch: { mods: ["SUPER"], key: "0" }, move: null })
  // The number needs no caption, but the tooltip and "key" label have it.
  assert.strictEqual(M.workspaceCaption(1, "both", out[1]), "")
  assert.strictEqual(M.workspaceLabel(10, false, "key", out[10]), "0")
  assert.strictEqual(M.keyTooltip(1, out[1]), "Workspace 1 · SUPER + 1 to switch · SUPER + SHIFT + 1 to move window here")
  // The JSON text works as well as the parsed value.
  assert.deepStrictEqual(M.workspaceKeyBinds(stockBinds, JSON.stringify(helperOutput)), out)
})

test("workspaceKeyBinds still skips binds whose key cannot be recovered", () => {
  const binds = [
    // No source bind with this description.
    { modmask: 64, key: "", keycode: 0, dispatcher: "__lua", description: "Switch to workspace 7" },
    // Same description, other modifiers: not the same bind.
    { modmask: 68, key: "", keycode: 0, dispatcher: "__lua", description: "Switch to workspace 2" },
    // A keycode the keymap does not know keeps its code.
    { modmask: 64, key: "", keycode: 191, dispatcher: "workspace", arg: "8", description: "" }
  ]
  assert.deepStrictEqual(M.workspaceKeyBinds(binds, helperOutput), {
    8: { switch: { mods: ["SUPER"], key: "code:191" }, move: null }
  })
  // A source key `hyprctl` already shows is not handed to a keyless copy.
  const shown = [
    { modmask: 64, key: "J", keycode: 0, dispatcher: "__lua", description: "Switch to workspace 1" },
    { modmask: 64, key: "", keycode: 0, dispatcher: "__lua", description: "Switch to workspace 1" }
  ]
  const onlyJ = { binds: [{ modmask: 64, description: "Switch to workspace 1", key: "j" }] }
  assert.deepStrictEqual(M.workspaceKeyBinds(shown, onlyJ)[1].switch, { mods: ["SUPER"], key: "J" })
})

test("workspaceKeyBinds prefers a key other than the workspace's number", () => {
  // Stock binds first, then the user's own J/K scheme, as `hyprctl` lists them.
  const user = stockBinds.concat([
    { modmask: 64, key: "J", keycode: 0, dispatcher: "__lua", description: "Switch to workspace 1", submap: "" },
    { modmask: 9, key: "J", keycode: 0, dispatcher: "__lua", description: "Move window to workspace 1", submap: "" },
    { modmask: 64, key: "K", keycode: 0, dispatcher: "__lua", description: "Switch to workspace 2", submap: "" },
    { modmask: 9, key: "K", keycode: 0, dispatcher: "__lua", description: "Move window to workspace 2", submap: "" }
  ])
  const data = JSON.parse(JSON.stringify(helperOutput))
  data.binds.push({ modmask: 64, description: "Switch to workspace 1", key: "J" },
    { modmask: 9, description: "Move window to workspace 1", key: "J" },
    { modmask: 64, description: "Switch to workspace 2", key: "K" },
    { modmask: 9, description: "Move window to workspace 2", key: "K" })
  const out = M.workspaceKeyBinds(user, data)
  assert.deepStrictEqual(out[1], { switch: { mods: ["SUPER"], key: "J" }, move: { mods: ["ALT", "SHIFT"], key: "J" } })
  assert.deepStrictEqual(out[2], { switch: { mods: ["SUPER"], key: "K" }, move: { mods: ["ALT", "SHIFT"], key: "K" } })
  assert.deepStrictEqual(out[10].switch, { mods: ["SUPER"], key: "0" })
  // The same holds whichever comes first.
  assert.deepStrictEqual(M.workspaceKeyBinds(user.slice().reverse(), data)[1], out[1])
  // With only the stock binds, the number is the key.
  assert.deepStrictEqual(M.workspaceKeyBinds(stockBinds, helperOutput)[1].switch, { mods: ["SUPER"], key: "1" })
})

test("bindKeyText normalises keycodes and keysyms", () => {
  const codes = helperOutput.keycodes
  assert.strictEqual(M.bindKeyText("code:10", codes), "1")
  assert.strictEqual(M.bindKeyText("code:19", codes), "0")
  assert.strictEqual(M.bindKeyText("code:20", codes), "-")
  assert.strictEqual(M.bindKeyText("code:21", codes), "=")
  assert.strictEqual(M.bindKeyText("code:44", codes), "J")
  assert.strictEqual(M.bindKeyText("code:99", codes), "code:99")
  assert.strictEqual(M.bindKeyText("code:10", null), "code:10")
  assert.strictEqual(M.bindKeyText("SUPER + code:10", codes), "1")
  assert.strictEqual(M.bindKeyText("SUPER + SHIFT + comma", codes), ",")
  assert.strictEqual(M.bindKeyText("Return", codes), "Enter")
  assert.strictEqual(M.bindKeyText("j", codes), "J")
})

test("bindKeyData ignores malformed helper output", () => {
  const empty = { keycodes: {}, binds: [] }
  for (const bad of [undefined, null, "", "not json", "[]", "3", 3, [], true, { keycodes: [1], binds: "x" }])
    assert.deepStrictEqual(M.bindKeyData(bad), empty)
  assert.deepStrictEqual(M.bindKeyData({
    keycodes: { "10": "1", "x": "2", "11": 2, "12": "", "13": "4" },
    binds: [null, 5, { modmask: "64", description: "A", key: "B" }, { modmask: -1, description: "A", key: "B" },
      { modmask: 1.5, description: "A", key: "B" }, { modmask: 64, description: "", key: "B" },
      { modmask: 64, description: "A", key: 7 }, { modmask: 64, description: "Switch to workspace 1", key: "code:10" }]
  }), {
    keycodes: { "10": "1", "13": "4" },
    binds: [{ modmask: 64, description: "A", key: "B" }, { modmask: 64, description: "Switch to workspace 1", key: "code:10" }]
  })
  // Garbage from the helper changes nothing.
  assert.deepStrictEqual(M.workspaceKeyBinds(stockBinds, "garbage"), {})
  assert.deepStrictEqual(M.workspaceKeyBinds(stockBinds, { binds: [{ description: 1 }] }), {})
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
    workspace_number: 3, tab_id: "w1:t1", agent: "claude", status: "working", title: "fix bar", focused: true, session: "abc",
    state_change: 0, activity: "", tokens: {}, cwd: "", since: 0 }])
  assert.deepStrictEqual(M.parseHerdrFeed(JSON.stringify({ type: "herdr", agents: [{ pane_id: 7, agent: null }] }))[0],
    { pane_id: "7", workspace_id: "", workspace_label: "", workspace_number: 0, tab_id: "", agent: "",
      status: "", title: "", focused: false, session: "", state_change: 0, activity: "", tokens: {}, cwd: "", since: 0 })
  assert.strictEqual(M.parseHerdrFeed(JSON.stringify({ type: "herdr", agents: [{ pane_id: "a", state_change: 36 }] }))[0].state_change, 36)
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

test("herdrRetryDelay backs off from 5 s to a minute", () => {
  assert.deepStrictEqual([0, 1, 2, 3, 4, 9].map(M.herdrRetryDelay), [5000, 10000, 20000, 40000, 60000, 60000])
  assert.strictEqual(M.herdrRetryDelay(undefined), 5000)
  assert.strictEqual(M.herdrRetryDelay(-3), 5000)
})

test("herdrFeedKey changes with panes and focus, not titles or order", () => {
  const a = [{ pane_id: "w1:p2", focused: false, title: "x" }, { pane_id: "w1:p1", focused: true, title: "y" }]
  assert.strictEqual(M.herdrFeedKey(a), "w1:p1*,w1:p2")
  assert.strictEqual(M.herdrFeedKey([a[1], Object.assign({}, a[0], { title: "z", status: "done" })]), M.herdrFeedKey(a))
  assert.notStrictEqual(M.herdrFeedKey([a[0]]), M.herdrFeedKey(a))
  assert.notStrictEqual(M.herdrFeedKey([a[0], Object.assign({}, a[1], { focused: false })]), M.herdrFeedKey(a))
  assert.strictEqual(M.herdrFeedKey(undefined), "")
})

test("agentChip setting validates", () => {
  assert.strictEqual(M.resolveSettings({}).agentChip, "auto")
  assert.strictEqual(M.resolveSettings({ agentChip: "always" }).agentChip, "always")
  assert.strictEqual(M.resolveSettings({ agentChip: "never" }).agentChip, "never")
  assert.strictEqual(M.resolveSettings({ agentChip: "sometimes" }).agentChip, "auto")
})

test("agentChipSummary counts agents and decides visibility per mode", () => {
  const agents = [
    { pane_id: "a", status: "working" }, { pane_id: "b", status: "working" },
    { pane_id: "c", status: "blocked" }, { pane_id: "d", status: "done" },
    { pane_id: "e", status: "idle" }, { pane_id: "f", status: "unknown" }, null
  ]
  assert.deepStrictEqual(M.agentChipSummary(agents, "auto"), { visible: true, working: 2, waiting: 1, done: 1, total: 6 })
  assert.strictEqual(M.agentChipSummary(agents, "never").visible, false)
  const quiet = [{ pane_id: "d", status: "done" }, { pane_id: "e", status: "idle" }]
  assert.deepStrictEqual(M.agentChipSummary(quiet, "auto"), { visible: false, working: 0, waiting: 0, done: 1, total: 2 })
  assert.strictEqual(M.agentChipSummary(quiet, "always").visible, true)
  assert.strictEqual(M.agentChipSummary([{ pane_id: "c", status: "blocked" }], "auto").visible, true)
  assert.strictEqual(M.agentChipSummary([], "always").visible, false)
  assert.strictEqual(M.agentChipSummary(undefined, "auto").total, 0)
  // An unknown mode behaves like the default.
  assert.strictEqual(M.agentChipSummary(agents, "bogus").visible, true)
})

test("agentChipSegments lists counts most urgent first", () => {
  assert.deepStrictEqual(M.agentChipSegments({ working: 2, waiting: 1, done: 1, total: 6 }),
    [{ state: "waiting", count: 1 }, { state: "working", count: 2 }, { state: "done", count: 1 }])
  assert.deepStrictEqual(M.agentChipSegments({ working: 0, waiting: 0, done: 0, total: 3 }), [{ state: "", count: 3 }])
  assert.deepStrictEqual(M.agentChipSegments({ working: 0, waiting: 0, done: 0, total: 0 }), [])
  assert.deepStrictEqual(M.agentChipSegments(null), [])
})

test("sortAgents puts the newest state change first and keeps listed order otherwise", () => {
  const listed = [{ pane_id: "a" }, { pane_id: "b" }, { pane_id: "c" }]
  assert.deepStrictEqual(M.sortAgents(listed).map((a) => a.pane_id), ["a", "b", "c"])
  const seq = [{ pane_id: "a", state_change: 3 }, { pane_id: "b" }, { pane_id: "c", state_change: 9 },
    { pane_id: "d", state_change: 3 }]
  assert.deepStrictEqual(M.sortAgents(seq).map((a) => a.pane_id), ["c", "a", "d", "b"])
  assert.deepStrictEqual(seq.map((a) => a.pane_id), ["a", "b", "c", "d"], "input is left alone")
  assert.deepStrictEqual(M.sortAgents(undefined), [])
})

test("herdrHostAddress picks the first window hosting Herdr", () => {
  const windows = [{ address: "a1", pid: 5 }, { address: "b2", pid: 20 }, { address: "c3", pid: 10 }]
  assert.strictEqual(M.herdrHostAddress(windows, [10, 20]), "b2")
  assert.strictEqual(M.herdrHostAddress(windows, [30]), "")
  assert.strictEqual(M.herdrHostAddress([{ address: "z", pid: 0 }], [0]), "")
  assert.strictEqual(M.herdrHostAddress(undefined, [10]), "")
})

test("herdrHostAnywhere finds the Herdr window among all windows", () => {
  const windows = [{ address: "a", pid: 10 }, { address: "b", pid: 20 }, { address: "c", pid: 0 }]
  assert.strictEqual(M.herdrHostAnywhere(windows, "500,20,1"), "b")
  assert.strictEqual(M.herdrHostAnywhere(windows, "500,30,1"), "")
  assert.strictEqual(M.herdrHostAnywhere(windows, ""), "")
  assert.strictEqual(M.herdrHostAnywhere(undefined, "500,20,1"), "")
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

test("demo setting validates", () => {
  assert.strictEqual(M.resolveSettings({}).demo, false)
  assert.strictEqual(M.resolveSettings({ demo: true }).demo, true)
  assert.strictEqual(M.resolveSettings({ demo: "yes" }).demo, false)
})

test("parseHerdrFeed keeps demo and real lines apart", () => {
  const real = JSON.stringify({ type: "herdr", agents: [{ pane_id: "w1:p1", title: "real" }] })
  const demo = JSON.stringify({ type: "herdr", demo: true, agents: [{ pane_id: "demo:1", title: "fake" }] })
  assert.strictEqual(M.parseHerdrFeed(real).length, 1)
  assert.strictEqual(M.parseHerdrFeed(demo), null)
  assert.strictEqual(M.parseHerdrFeed(real, true), null)
  assert.strictEqual(M.parseHerdrFeed(demo, true)[0].title, "fake")
})

test("isTerminalAppId knows common terminals", () => {
  for (const id of ["com.mitchellh.ghostty", "foot", "footclient", "Alacritty", "kitty", "org.wezfurlong.wezterm"])
    assert.ok(M.isTerminalAppId(id), id)
  for (const id of ["zen", "firefox", "kitty-notes", "", undefined]) assert.ok(!M.isTerminalAppId(id), String(id))
})

test("demoHostAddress prefers a terminal on workspace 3 or later", () => {
  const ws = [
    { id: 5, windows: [{ address: "e", appId: "foot" }] },
    { id: 1, windows: [{ address: "a", appId: "com.mitchellh.ghostty" }] },
    { id: 4, windows: [{ address: "b", appId: "zen" }, { address: "c", appId: "com.mitchellh.ghostty" }, { address: "d", appId: "foot" }] }
  ]
  assert.strictEqual(M.demoHostAddress(ws), "c")
  assert.strictEqual(M.demoHostAddress(ws.slice(1, 2)), "a")
  assert.strictEqual(M.demoHostAddress([{ id: 4, windows: [{ address: "b", appId: "zen" }] }]), "")
  assert.strictEqual(M.demoHostAddress(null), "")
})

test("agent detail settings validate", () => {
  const d = M.resolveSettings({})
  assert.strictEqual(d.agentDetails, true)
  assert.strictEqual(d.agentNotify, "blocked")
  assert.strictEqual(d.agentMute, false)
  const s = M.resolveSettings({ agentDetails: false, agentNotify: "all", agentMute: true })
  assert.deepStrictEqual([s.agentDetails, s.agentNotify, s.agentMute], [false, "all", true])
  assert.strictEqual(M.resolveSettings({ agentNotify: "off" }).agentNotify, "off")
  const bad = M.resolveSettings({ agentDetails: "no", agentNotify: "loud", agentMute: "true" })
  assert.deepStrictEqual([bad.agentDetails, bad.agentNotify, bad.agentMute], [true, "blocked", false])
})

test("parseHerdrFeed keeps activity, tokens, cwd and since, checked", () => {
  const line = JSON.stringify({ type: "herdr", agents: [
    { pane_id: "p1", activity: "running: make", tokens: { model: "opus", ctx: 36, junk: { a: 1 }, list: [1] },
      cwd: "/home/me/src", since: 1700000000.7 },
    { pane_id: "p2", activity: 5, tokens: ["model"], cwd: null, since: "soon" },
    { pane_id: "p3", tokens: { a: "1", b: "2", c: "3", d: "4", e: "5", f: "6", g: "7", h: "8", i: "9" }, since: -4 }
  ] })
  const [a, b, c] = M.parseHerdrFeed(line)
  assert.strictEqual(a.activity, "running: make")
  assert.deepStrictEqual(a.tokens, { model: "opus", ctx: "36" })
  assert.strictEqual(a.cwd, "/home/me/src")
  assert.strictEqual(a.since, 1700000000)
  assert.deepStrictEqual([b.activity, b.tokens, b.cwd, b.since], ["", {}, "", 0])
  assert.strictEqual(Object.keys(c.tokens).length, 8)
  assert.strictEqual(c.since, 0)
})

test("agentElapsed reads seconds, minutes, hours and days", () => {
  const now = 1700000000
  assert.strictEqual(M.agentElapsed(now - 42, now), "42s")
  assert.strictEqual(M.agentElapsed(now, now), "0s")
  assert.strictEqual(M.agentElapsed(now + 3, now), "0s")
  assert.strictEqual(M.agentElapsed(now - 59, now), "59s")
  assert.strictEqual(M.agentElapsed(now - 60, now), "1m")
  assert.strictEqual(M.agentElapsed(now - 4 * 60 - 30, now), "4m")
  assert.strictEqual(M.agentElapsed(now - 3600, now), "1h")
  assert.strictEqual(M.agentElapsed(now - (72 * 60 + 5), now), "1h 12m")
  assert.strictEqual(M.agentElapsed(now - 86400 - 3 * 3600, now), "1d 3h")
  assert.strictEqual(M.agentElapsed(0, now), "")
  assert.strictEqual(M.agentElapsed(undefined, now), "")
  assert.strictEqual(M.agentElapsed("x", now), "")
  assert.strictEqual(M.agentElapsed(now - 5, 0), "")
})

test("agentTokenText orders known keys and drops the rest", () => {
  assert.strictEqual(M.agentTokenText({ branch: "main", cost: "$4.01", tool: "Bash", ctx: "13%", model: "fable" }),
    "fable · 13% · $4.01 · main")
  assert.strictEqual(M.agentTokenText({ cost: "$0.34" }), "$0.34")
  assert.strictEqual(M.agentTokenText({ model: "  ", ctx: { x: 1 }, tool: "Bash" }), "")
  assert.strictEqual(M.agentTokenText({ branch: "feature/" + "x".repeat(40) }).length, 24)
  assert.strictEqual(M.agentTokenText({ model: "a\nb" }), "a b")
  assert.strictEqual(M.agentTokenText(null), "")
  assert.strictEqual(M.agentTokenText(Object.create({ model: "inherited" })), "")
})

test("agentDetailText prefers activity except when idle; agentStateText adds time", () => {
  assert.strictEqual(M.agentDetailText({ status: "working", activity: "running: make", title: "t" }), "running: make")
  assert.strictEqual(M.agentDetailText({ status: "blocked", activity: "", title: "t" }), "t")
  assert.strictEqual(M.agentDetailText({ status: "idle", activity: "done", title: "t" }), "t")
  assert.strictEqual(M.agentDetailText(null), "")
  assert.strictEqual(M.agentStateText({ status: "blocked", since: 100 }, 340), "blocked 4m")
  assert.strictEqual(M.agentStateText({ status: "working", since: 0 }, 340), "working")
  assert.strictEqual(M.agentStateText({}, 340), "unknown")
})

test("herdrTooltipLines adds time in state when given now", () => {
  assert.deepStrictEqual(M.herdrTooltipLines([
    { status: "blocked", workspace_label: "docs", title: "notes", since: 100 },
    { status: "working", workspace_label: "", title: "", since: 0 }
  ], 20, 340), ["blocked 4m · docs · notes", "working"])
})

const ag = (pane_id, status, extra) => Object.assign({ pane_id, status, workspace_label: pane_id, agent: "claude", title: "t-" + pane_id }, extra)

test("agentAlerts stays quiet on the first snapshot and alerts on entering blocked", () => {
  const opts = { mode: "blocked", muted: false, demo: false, viewing: false }
  const first = M.agentAlerts(null, [ag("a", "blocked"), ag("b", "working")], opts)
  assert.deepStrictEqual(first.alerts, [])
  assert.deepStrictEqual(first.seen, { a: "blocked", b: "working" })
  // a stays blocked: no repeat. b enters blocked: one alert. c is new and blocked.
  const second = M.agentAlerts(first.seen, [ag("a", "blocked"), ag("b", "blocked"), ag("c", "blocked")], opts)
  assert.deepStrictEqual(second.alerts.map((x) => x.pane_id + ":" + x.kind), ["b:waiting", "c:waiting"])
  // Leaving and entering again is a new entry.
  const third = M.agentAlerts(second.seen, [ag("a", "working"), ag("b", "blocked"), ag("c", "blocked")], opts)
  assert.deepStrictEqual(third.alerts, [])
  const fourth = M.agentAlerts(third.seen, [ag("a", "blocked")], opts)
  assert.deepStrictEqual(fourth.alerts.map((x) => x.pane_id), ["a"])
  assert.deepStrictEqual(fourth.seen, { a: "blocked" })
})

test("agentAlerts follows the mode and never alerts muted, in demo, or when off", () => {
  const seen = { a: "working", b: "working" }
  const agents = [ag("a", "blocked"), ag("b", "done")]
  const base = { mode: "blocked", muted: false, demo: false, viewing: false }
  assert.deepStrictEqual(M.agentAlerts(seen, agents, base).alerts.map((x) => x.kind), ["waiting"])
  assert.deepStrictEqual(M.agentAlerts(seen, agents, Object.assign({}, base, { mode: "all" })).alerts.map((x) => x.kind),
    ["waiting", "done"])
  for (const o of [{ mode: "off" }, { mode: "bogus" }, { muted: true }, { demo: true }]) {
    const r = M.agentAlerts(seen, agents, Object.assign({}, base, o))
    assert.deepStrictEqual(r.alerts, [], JSON.stringify(o))
    assert.deepStrictEqual(r.seen, { a: "blocked", b: "done" })
  }
  // A pane id that shadows Object.prototype is just another id.
  const odd = M.agentAlerts({ hasOwnProperty: "working" }, [ag("hasOwnProperty", "blocked")], base)
  assert.deepStrictEqual(odd.alerts.map((x) => x.pane_id), ["hasOwnProperty"])
})

test("agentAlerts skips the agent you are looking at", () => {
  const seen = { a: "working", b: "working" }
  const agents = [ag("a", "blocked", { focused: true }), ag("b", "blocked")]
  const viewing = M.agentAlerts(seen, agents, { mode: "blocked", viewing: true })
  assert.deepStrictEqual(viewing.alerts.map((x) => x.pane_id), ["b"])
  // Focused in Herdr, but the Herdr window is not the active window.
  const away = M.agentAlerts(seen, agents, { mode: "blocked", viewing: false })
  assert.deepStrictEqual(away.alerts.map((x) => x.pane_id), ["a", "b"])
})

test("pendingAlerts keeps live alerts, one per pane", () => {
  const alerts = [{ pane_id: "a", kind: "waiting" }, { pane_id: "b", kind: "waiting" }, { pane_id: "c", kind: "done" },
    { pane_id: "a", kind: "waiting" }, { pane_id: "gone", kind: "waiting" }]
  const agents = [ag("a", "blocked", { title: "newest" }), ag("b", "working"), ag("c", "done")]
  const opts = { mode: "all", viewing: false }
  const out = M.pendingAlerts(alerts, agents, opts)
  assert.deepStrictEqual(out.map((x) => x.pane_id + ":" + x.kind), ["a:waiting", "c:done"])
  assert.strictEqual(out[0].agent.title, "newest")
  assert.deepStrictEqual(M.pendingAlerts(alerts, agents, { mode: "blocked" }).map((x) => x.pane_id), ["a"])
  assert.deepStrictEqual(M.pendingAlerts(alerts, agents, { mode: "all", muted: true }), [])
  assert.deepStrictEqual(M.pendingAlerts(alerts, agents, { mode: "off" }), [])
  assert.deepStrictEqual(M.pendingAlerts(alerts, [ag("a", "blocked", { focused: true })], { mode: "all", viewing: true }), [])
})

test("agentNotification words single alerts and coalesces bursts", () => {
  const w = (id, extra) => ({ pane_id: id, kind: "waiting", agent: ag(id, "blocked", extra) })
  const d = (id, extra) => ({ pane_id: id, kind: "done", agent: ag(id, "done", extra) })
  assert.deepStrictEqual(M.agentNotification([w("docs", { activity: "permission: Bash" })]),
    { summary: "docs needs input", body: "permission: Bash", urgency: "critical", pane_id: "docs" })
  assert.deepStrictEqual(M.agentNotification([d("api")]),
    { summary: "api finished", body: "t-api", urgency: "normal", pane_id: "api" })
  const burst = M.agentNotification([w("docs"), w("api"), w("web"), d("infra")])
  assert.strictEqual(burst.summary, "3 agents need input")
  assert.strictEqual(burst.body, "docs, api, web\ninfra finished")
  assert.strictEqual(burst.urgency, "critical")
  assert.strictEqual(burst.pane_id, "docs")
  assert.deepStrictEqual(M.agentNotification([d("a"), d("b")]),
    { summary: "2 agents finished", body: "a, b", urgency: "normal", pane_id: "a" })
  assert.strictEqual(M.agentNotification([w("docs"), d("a"), d("b")]).body, "t-docs\n2 agents finished: a, b")
  // No workspace label: the agent's name, then a fallback.
  assert.strictEqual(M.agentNotification([w("x", { workspace_label: "" })]).summary, "claude needs input")
  assert.strictEqual(M.agentNotification([w("x", { workspace_label: "", agent: "" })]).summary, "An agent needs input")
  assert.strictEqual(M.agentNotification([]), null)
  assert.strictEqual(M.agentNotification(undefined), null)
})

test("notifyDelay keeps notifications three seconds apart", () => {
  assert.strictEqual(M.notifyDelay(0, 5000, 3000), 0)
  assert.strictEqual(M.notifyDelay(10000, 11000, 3000), 2000)
  assert.strictEqual(M.notifyDelay(10000, 13000, 3000), 0)
  assert.strictEqual(M.notifyDelay(10000, 20000, 3000), 0)
  // A clock that went backwards never waits longer than the gap.
  assert.strictEqual(M.notifyDelay(10000, 1000, 3000), 3000)
})

test("notifyArgs passes text as separate, escaped arguments", () => {
  const args = M.notifyArgs({ summary: "-docs needs input", body: "<b>rm -rf</b> & \"x\"", urgency: "critical" }, true)
  assert.deepStrictEqual(args, ["--app-name=Spaces", "--urgency=critical", "--action=default=Show agent", "--",
    "-docs needs input", "&lt;b&gt;rm -rf&lt;/b&gt; &amp; \"x\""])
  assert.deepStrictEqual(M.notifyArgs({ summary: "api finished", body: "", urgency: "bogus" }, false),
    ["--app-name=Spaces", "--urgency=normal", "--", "api finished", ""])
})

test("agent rows render Herdr text as plain text", () => {
  const qml = fs.readFileSync(path.join(__dirname, "..", "Spaces.qml"), "utf8")
  const re = /^\s*Text\s*\{/gm
  let m
  let count = 0
  while ((m = re.exec(qml))) {
    let depth = 0, i = qml.indexOf("{", m.index)
    const start = i
    for (; i < qml.length; i++) {
      if (qml[i] === "{") depth++
      else if (qml[i] === "}" && --depth === 0) break
    }
    const b = qml.slice(start, i + 1)
    if (!/^\s*text:.*(agentDetailText|agentTokenText|agentStateText|modelData\.(agent|workspace_label))/m.test(b)) continue
    count++
    assert.match(b, /textFormat:\s*Text\.PlainText/, b.split("\n").find((l) => /text:/.test(l)).trim())
  }
  assert.ok(count >= 6, "expected the popup and preview agent rows, found " + count)
})

test("parseOnOff reads IPC on/off arguments", () => {
  for (const v of ["on", "ON", " true ", "1", "yes"]) assert.strictEqual(M.parseOnOff(v), true, v)
  for (const v of ["off", "False", "0", "no"]) assert.strictEqual(M.parseOnOff(v), false, v)
  for (const v of ["", "maybe", undefined, null]) assert.strictEqual(M.parseOnOff(v), null, String(v))
})

// ---- Reporter agents

const T0 = 1700000000000
function rep(fields) { return Object.assign({ session: "s1", state: "working", pids: "500,400,300", rich: true, agent: "claude", title: "", cwd: "/home/me/Code/app", activity: "", at: 0 }, fields) }

test("reportText makes untrusted text one plain, capped line", () => {
  assert.strictEqual(M.reportText("  a\nb\tc\u0000d\u2028e  ", 50), "a b c d e")
  assert.strictEqual(M.reportText("<b>x</b>", 50), "<b>x</b>")
  assert.strictEqual(M.reportText("x".repeat(200), 10).length, 10)
  assert.strictEqual(M.reportText(null, 10), "")
  assert.strictEqual(M.reportText({ a: 1 }, 10), "")
  assert.strictEqual(M.reportText("/a  b/\nc", 50, true), "/a  b/ c")
})

test("reportSession and reportAccepted guard the IPC boundary", () => {
  assert.strictEqual(M.reportSession("abc-123"), "abc-123")
  assert.strictEqual(M.reportSession(""), "")
  assert.strictEqual(M.reportSession("x".repeat(129)), "")
  assert.strictEqual(M.reportSession("a\nb"), "")
  assert.strictEqual(M.reportAccepted("s", "working"), true)
  assert.strictEqual(M.reportAccepted("s", "end"), true)
  assert.strictEqual(M.reportAccepted("s", "blocked"), false)
  assert.strictEqual(M.reportAccepted("", "working"), false)
})

test("pathBase, tildePath and reportTitle", () => {
  assert.strictEqual(M.pathBase("/home/me/Code/app/"), "app")
  assert.strictEqual(M.pathBase("/"), "")
  assert.strictEqual(M.tildePath("/home/me/Code/app", "/home/me"), "~/Code/app")
  assert.strictEqual(M.tildePath("/home/meow", "/home/me"), "/home/meow")
  assert.strictEqual(M.tildePath("/home/me", "/home/me/"), "~")
  assert.strictEqual(M.reportTitle("", "app", "/x/app"), "app")
  assert.strictEqual(M.reportTitle("auth-refactor", "app", "/x/app"), "auth-refactor")
  assert.strictEqual(M.reportTitle("auth-refactor", "renamed", "/x/app"), "renamed")
  assert.strictEqual(M.reportTitle("kept", "", "/x/app"), "kept")
})

test("applyReport normalizes a rich report and keeps since while the state holds", () => {
  const a = M.applyReport({}, rep({ title: "app", activity: "tool: Bash" }), { now: T0 })
  assert.strictEqual(a.accepted, true)
  assert.deepStrictEqual(a.agents.s1, { state: "working", pids: [500, 400, 300], at: T0, since: T0 / 1000, rich: true,
    agent: "claude", cwd: "/home/me/Code/app", title: "app", activity: "tool: Bash" })
  const b = M.applyReport(a.agents, rep({ title: "app" }), { now: T0 + 30000 })
  assert.strictEqual(b.agents.s1.since, T0 / 1000)
  const c = M.applyReport(b.agents, rep({ state: "waiting", title: "app" }), { now: T0 + 60000 })
  assert.strictEqual(c.agents.s1.since, T0 / 1000 + 60)
  assert.strictEqual(c.agents.s1.state, "waiting")
})

test("applyReport drops stale and invalid reports, clamps future times", () => {
  const a = M.applyReport({}, rep({ at: T0 }), { now: T0 })
  const stale = M.applyReport(a.agents, rep({ state: "done", at: T0 - 1 }), { now: T0 + 10 })
  assert.strictEqual(stale.accepted, false)
  assert.strictEqual(stale.agents, a.agents)
  assert.strictEqual(M.applyReport({}, rep({ state: "bogus" }), { now: T0 }).accepted, false)
  assert.strictEqual(M.applyReport({}, rep({ session: "" }), { now: T0 }).accepted, false)
  const future = M.applyReport({}, rep({ at: T0 + 999999 }), { now: T0 })
  assert.strictEqual(future.agents.s1.at, T0)
})

test("applyReport end forgets the session; caps pids and text", () => {
  const a = M.applyReport({ other: { state: "working", pids: [9] } }, rep({}), { now: T0 })
  const b = M.applyReport(a.agents, { session: "s1", state: "end", pids: "" }, { now: T0 + 1 })
  assert.deepStrictEqual(Object.keys(b.agents), ["other"])
  const none = M.applyReport({}, { session: "nope", state: "end" }, { now: T0 })
  assert.strictEqual(none.accepted, true)
  const many = Array.from({ length: 100 }, (_, i) => i + 2).join(",")
  const c = M.applyReport({}, rep({ pids: many, title: "t".repeat(500), activity: "a\n".repeat(300) }), { now: T0 })
  assert.strictEqual(c.agents.s1.pids.length, 64)
  assert.strictEqual(c.agents.s1.title.length, 120)
  assert.ok(c.agents.s1.activity.length <= 160 && c.agents.s1.activity.indexOf("\n") === -1)
})

test("applyReport: done in the active window is idle; plain agent keeps rich details", () => {
  const ctx = { now: T0, activeWindowPid: 300, windowPids: { 300: true } }
  assert.strictEqual(M.applyReport({}, rep({ state: "done" }), ctx).agents.s1.state, "idle")
  assert.strictEqual(M.applyReport({}, rep({ state: "done" }), { now: T0, activeWindowPid: 7, windowPids: { 300: true } }).agents.s1.state, "done")
  const a = M.applyReport({}, rep({ title: "named", activity: "x" }), { now: T0 })
  const b = M.applyReport(a.agents, { session: "s1", state: "waiting", pids: "500,400,300" }, { now: T0 + 1 })
  assert.strictEqual(b.agents.s1.rich, true)
  assert.strictEqual(b.agents.s1.title, "named")
  assert.strictEqual(b.agents.s1.activity, "")
  const plain = M.applyReport({}, { session: "w", state: "working", pids: "10,9" }, { now: T0 })
  assert.deepStrictEqual(plain.agents.w, { state: "working", pids: [10, 9], at: T0, since: T0 / 1000 })
})

test("acknowledgeReports clears done in the active window and keeps details", () => {
  const agents = {
    a: { state: "done", pids: [5, 300], rich: true, title: "x", since: 1 },
    b: { state: "done", pids: [6, 301] },
    c: { state: "working", pids: [7, 300] }
  }
  const out = M.acknowledgeReports(agents, 300, { 300: true, 301: true })
  assert.deepStrictEqual(out.a, { state: "idle", pids: [5, 300], rich: true, title: "x", since: 1 })
  assert.strictEqual(out.b, agents.b)
  assert.strictEqual(out.c, agents.c)
  assert.strictEqual(M.acknowledgeReports(agents, 999, { 300: true }), agents)
  assert.strictEqual(M.acknowledgeReports(agents, 0, { 300: true }), agents)
})

test("reporterAgents gives the feed's agent shape with window, workspace and focus", () => {
  const agents = {
    s1: { state: "waiting", pids: [500, 400, 300], at: T0, since: 100, rich: true, agent: "claude", title: "app", cwd: "/home/me/Code/app", activity: "permission: Bash" },
    s2: { state: "working", pids: [600, 1], at: T0, since: 200 },
    s3: { state: "idle", pids: [700, 300], at: T0, since: 50 },
    s4: { state: "idle", pids: [800, 300], at: T0, since: 40, rich: true, cwd: "/srv/api" }
  }
  const windows = [{ address: "0xa", pid: 300, workspace: 4 }, { address: "0xb", pid: 301, workspace: 2 }]
  const list = M.reporterAgents(agents, { windows, activePid: 300, home: "/home/me" })
  assert.deepStrictEqual(list.map((a) => a.pane_id), ["ipc:s2", "ipc:s1", "ipc:s4"])
  const s1 = list[1]
  assert.deepStrictEqual(s1, {
    pane_id: "ipc:s1", source: "ipc", workspace_id: "", workspace_label: "app", workspace_number: 4, tab_id: "",
    agent: "claude", status: "blocked", title: "~/Code/app", focused: true, session: "s1", state_change: 0,
    activity: "permission: Bash", tokens: {}, cwd: "/home/me/Code/app", since: 100, pids: [500, 400, 300], window_pid: 300, at: T0
  })
  assert.strictEqual(list[0].workspace_label, "s2")
  assert.strictEqual(list[0].window_pid, 0)
  assert.strictEqual(list[0].focused, false)
  assert.strictEqual(list[2].workspace_label, "api")
  assert.strictEqual(list[2].status, "idle")
})

test("reporter agents work with the shared row helpers", () => {
  const [a] = M.reporterAgents({ s: { state: "waiting", pids: [5], since: 10, rich: true, title: "app", activity: "permission: Bash" } }, {})
  assert.strictEqual(M.herdrBarState(a.status), "waiting")
  assert.strictEqual(M.agentDetailText(a), "permission: Bash")
  assert.strictEqual(M.agentAlertName(a), "app")
  assert.deepStrictEqual(M.agentChipSummary([a], "auto"), { visible: true, working: 0, waiting: 1, done: 0, total: 1 })
})

test("parseHerdrFeed refuses pane ids reserved for reporter agents", () => {
  const line = JSON.stringify({ type: "herdr", agents: [{ pane_id: "ipc:x", status: "working" }, { pane_id: "p1", status: "working" }] })
  assert.deepStrictEqual(M.parseHerdrFeed(line, false).map((a) => a.pane_id), ["p1"])
})

test("combineAgents merges by since and dedupes a session Herdr also lists", () => {
  const herdr = [
    { pane_id: "h1", session: "dup", status: "working", state_change: 5, since: 300 },
    { pane_id: "h2", session: "", status: "idle", state_change: 2, since: 100 }
  ]
  const ipc = [
    { pane_id: "ipc:new", source: "ipc", session: "new", status: "blocked", since: 400 },
    { pane_id: "ipc:dup", source: "ipc", session: "dup", status: "blocked", since: 350 },
    { pane_id: "ipc:mid", source: "ipc", session: "mid", status: "done", since: 200 },
    { pane_id: "ipc:tie", source: "ipc", session: "tie", status: "done", since: 100 }
  ]
  assert.deepStrictEqual(M.combineAgents(herdr, ipc).map((a) => a.pane_id), ["ipc:new", "h1", "ipc:mid", "h2", "ipc:tie"])
  assert.deepStrictEqual(M.combineAgents([], ipc).map((a) => a.pane_id), ["ipc:new", "ipc:dup", "ipc:mid", "ipc:tie"])
  assert.deepStrictEqual(M.combineAgents(herdr, null).map((a) => a.pane_id), ["h1", "h2"])
})

test("agentsForWindows and liveAgentCount", () => {
  const list = [
    { pane_id: "h1", status: "working" },
    { pane_id: "ipc:a", source: "ipc", window_pid: 300, status: "blocked" },
    { pane_id: "ipc:b", source: "ipc", window_pid: 301, status: "done" },
    { pane_id: "ipc:c", source: "ipc", window_pid: 0, status: "working" }
  ]
  assert.deepStrictEqual(M.agentsForWindows(list, { 300: true }, false).map((a) => a.pane_id), ["ipc:a"])
  assert.deepStrictEqual(M.agentsForWindows(list, { 300: true }, true).map((a) => a.pane_id), ["h1", "ipc:a"])
  assert.deepStrictEqual(M.agentsForWindows(list, {}, false), [])
  assert.strictEqual(M.liveAgentCount(list), 3)
})

test("agentFocusTarget: reporter agents raise their window, never Herdr", () => {
  const windows = [{ address: "0xpref", pid: 400 }, { address: "0xa", pid: 300 }, { address: "0xb", pid: 300 }]
  const ipc = { pane_id: "ipc:s", source: "ipc", pids: [500, 300, 400] }
  assert.deepStrictEqual(M.agentFocusTarget(ipc, windows), { kind: "window", address: "0xa" })
  assert.deepStrictEqual(M.agentFocusTarget(ipc, [{ address: "0xb", pid: 300 }, { address: "0xa", pid: 300 }]), { kind: "window", address: "0xb" })
  assert.deepStrictEqual(M.agentFocusTarget({ pane_id: "ipc:x", source: "ipc", pids: [9] }, windows), { kind: "window", address: "" })
  assert.deepStrictEqual(M.agentFocusTarget({ pane_id: "p1" }, windows), { kind: "herdr", pane_id: "p1" })
})

test("notifications: reporter agents are suppressed only in their own window", () => {
  const ipc = (status, focused) => ({ pane_id: "ipc:s", source: "ipc", status, focused, workspace_label: "app" })
  const opts = { mode: "blocked", viewing: false }
  assert.strictEqual(M.agentAlertSuppressed(ipc("blocked", true), opts), true)
  assert.strictEqual(M.agentAlertSuppressed(ipc("blocked", false), { mode: "blocked", viewing: true }), false)
  assert.strictEqual(M.agentAlertSuppressed({ pane_id: "h", focused: true }, { viewing: false }), false)
  assert.strictEqual(M.agentAlertSuppressed({ pane_id: "h", focused: true }, { viewing: true }), true)
  const r1 = M.agentAlerts({}, [ipc("working", false)], opts)
  const r2 = M.agentAlerts(r1.seen, [ipc("blocked", false)], opts)
  assert.deepStrictEqual(r2.alerts.map((a) => a.pane_id), ["ipc:s"])
  assert.deepStrictEqual(M.agentAlerts(r1.seen, [ipc("blocked", true)], opts).alerts, [])
  assert.deepStrictEqual(M.pendingAlerts(r2.alerts, [ipc("blocked", true)], opts), [])
  assert.strictEqual(M.pendingAlerts(r2.alerts, [ipc("blocked", false)], opts).length, 1)
  assert.deepStrictEqual(M.pendingAlerts(r2.alerts, [], { mode: "all" }), [])
})

test("notifications: a Herdr baseline keeps reporter alerts flowing", () => {
  const herdrBlocked = { pane_id: "h1", status: "blocked" }
  const ipcBlocked = { pane_id: "ipc:s", source: "ipc", status: "blocked" }
  const r = M.agentAlerts({}, [herdrBlocked, ipcBlocked], { mode: "blocked", baseline: "herdr" })
  assert.deepStrictEqual(r.alerts.map((a) => a.pane_id), ["ipc:s"])
  assert.deepStrictEqual(r.seen, { h1: "blocked", "ipc:s": "blocked" })
  const again = M.agentAlerts(r.seen, [herdrBlocked, ipcBlocked], { mode: "blocked" })
  assert.deepStrictEqual(again.alerts, [])
})

test("pruning covers every report session and still spares plain finished ones", () => {
  const agents = {
    rich: { state: "idle", pids: [101], rich: true },
    richDone: { state: "done", pids: [102], rich: true },
    plainDone: { state: "done", pids: [103] },
    plainLive: { state: "working", pids: [104] }
  }
  assert.deepStrictEqual(M.agentProcessIds(agents), [101, 102, 104])
  assert.deepStrictEqual(Object.keys(M.pruneDeadAgents(agents, [102])), ["richDone", "plainDone"])
  const rows = M.reporterAgents(M.pruneDeadAgents(agents, []), {})
  assert.deepStrictEqual(rows.map((a) => a.pane_id), ["ipc:plainDone"])
})

// ---- Special workspaces

test("showSpecial and reverseScroll resolve", () => {
  assert.strictEqual(M.resolveSettings({}).showSpecial, true)
  assert.strictEqual(M.resolveSettings({ showSpecial: false }).showSpecial, false)
  assert.strictEqual(M.resolveSettings({ showSpecial: "no" }).showSpecial, true)
  assert.strictEqual(M.resolveSettings({}).reverseScroll, false)
  assert.strictEqual(M.resolveSettings({ reverseScroll: true }).reverseScroll, true)
  assert.strictEqual(M.resolveSettings({ reverseScroll: 1 }).reverseScroll, false)
})

test("special workspace names, titles and labels", () => {
  assert.strictEqual(M.isSpecialName("special:scratchpad"), true)
  assert.strictEqual(M.isSpecialName("3"), false)
  assert.strictEqual(M.isSpecialName(null), false)
  assert.strictEqual(M.specialName("special:scratchpad"), "scratchpad")
  assert.strictEqual(M.specialName("scratchpad"), "scratchpad")
  assert.strictEqual(M.specialName("special:"), "special")
  assert.strictEqual(M.specialName("special:special"), "special")
  assert.strictEqual(M.specialTitle("special:scratchpad"), "Scratchpad")
  assert.strictEqual(M.specialTitle("special:special"), "Special workspace")
  assert.strictEqual(M.specialTitle("special:music"), "music")
  assert.strictEqual(M.specialLabel("special:scratchpad"), M.SCRATCHPAD_GLYPH)
  assert.strictEqual(M.SCRATCHPAD_GLYPH, String.fromCodePoint(0xf0328))
  assert.strictEqual(M.specialLabel("special:btm"), "btm")
  assert.strictEqual(M.specialLabel("special:music"), "M")
  assert.strictEqual(M.specialLabel("special:special"), "S")
})

test("specialWorkspaces shows specials with windows or shown here, scratchpad first", () => {
  const list = [
    { id: 1, name: "1", windows: 2, monitor: "DP-1" },
    { id: -97, name: "special:term", windows: 1, monitor: "DP-1" },
    { id: -98, name: "special:scratchpad", windows: 3, monitor: "HDMI-A-1" },
    { id: -96, name: "special:empty", windows: 0, monitor: "DP-1" },
    { id: -95, name: "special:music", windows: 0, monitor: "DP-1" }
  ]
  const out = M.specialWorkspaces(list, { show: true, shown: ["special:music"], monitor: "DP-1" })
  assert.deepStrictEqual(out.map((w) => w.name), ["special:scratchpad", "special:music", "special:term"])
  assert.deepStrictEqual(out[0], { id: -98, name: "special:scratchpad", short: "scratchpad", windows: 3, shown: false })
  assert.strictEqual(out[1].shown, true)
  assert.deepStrictEqual(M.specialWorkspaces(list, { show: false }), [])
  // perMonitor: only those on this bar's monitor.
  const here = M.specialWorkspaces(list, { show: true, shown: [], perMonitor: true, monitor: "DP-1" })
  assert.deepStrictEqual(here.map((w) => w.short), ["term"])
  assert.deepStrictEqual(M.specialWorkspaces(null, {}), [])
  assert.deepStrictEqual(M.specialWorkspaces([null, { id: -9 }], {}), [])
})

test("parseActiveSpecial reads both event versions", () => {
  assert.deepStrictEqual(M.parseActiveSpecial("activespecialv2", "-98,special:scratchpad,eDP-1"), { monitor: "eDP-1", name: "special:scratchpad" })
  assert.deepStrictEqual(M.parseActiveSpecial("activespecial", "special:scratchpad,eDP-1"), { monitor: "eDP-1", name: "special:scratchpad" })
  assert.deepStrictEqual(M.parseActiveSpecial("activespecialv2", ",,eDP-1"), { monitor: "eDP-1", name: "" })
  assert.deepStrictEqual(M.parseActiveSpecial("activespecial", ",DP-2"), { monitor: "DP-2", name: "" })
  assert.deepStrictEqual(M.parseActiveSpecial("activespecialv2", "-97,special:a,b,DP-2"), { monitor: "DP-2", name: "special:a,b" })
  assert.strictEqual(M.parseActiveSpecial("workspacev2", "1,1"), null)
  assert.strictEqual(M.parseActiveSpecial("activespecial", "nocomma"), null)
  assert.strictEqual(M.parseActiveSpecial("activespecial", "special:x,"), null)
})

test("specialShownMap merges monitor data with later events", () => {
  const monitors = [{ name: "eDP-1", special: "special:scratchpad" }, { name: "DP-1", special: "" }, null]
  assert.deepStrictEqual(M.specialShownMap(monitors, {}), { "eDP-1": "special:scratchpad" })
  const map = M.specialShownMap(monitors, { "eDP-1": "", "DP-1": "special:term" })
  assert.deepStrictEqual(map, { "DP-1": "special:term" })
  assert.deepStrictEqual(M.specialShownOn(map, "DP-1"), ["special:term"])
  assert.deepStrictEqual(M.specialShownOn(map, "eDP-1"), [])
  assert.deepStrictEqual(M.specialShownOn({ a: "special:x", b: "special:y" }, ""), ["special:x", "special:y"])
})

test("monitorSpecials reads hyprctl monitors", () => {
  const text = JSON.stringify([
    { name: "eDP-1", specialWorkspace: { id: -98, name: "special:scratchpad" } },
    { name: "DP-1", specialWorkspace: { id: 0, name: "" } },
    { name: "", specialWorkspace: { id: -98, name: "special:x" } },
    { name: "HDMI-A-1" },
    null
  ])
  assert.deepStrictEqual(M.monitorSpecials(text), [
    { name: "eDP-1", special: "special:scratchpad" }, { name: "DP-1", special: "" }, { name: "HDMI-A-1", special: "" }
  ])
  assert.deepStrictEqual(M.monitorSpecials("not json"), [])
  assert.deepStrictEqual(M.monitorSpecials({}), [])
})

test("special toggle dispatch quotes the name for Lua", () => {
  assert.strictEqual(M.specialToggleDispatch("special:scratchpad"), 'hl.dsp.workspace.toggle_special("scratchpad")')
  assert.strictEqual(M.luaString('a"b\\c\nd'), '"a\\"b\\\\c\\010d"')
  assert.strictEqual(M.specialToggleDispatch('special:x") os.exit("'), 'hl.dsp.workspace.toggle_special("x\\") os.exit(\\"")')
})

test("specialKeyBinds reads Omarchy's Lua scratchpad binds and keeps workspace binds intact", () => {
  const binds = [
    { modmask: 64, key: "S", keycode: 0, dispatcher: "__lua", arg: "131", description: "Toggle scratchpad", submap: "" },
    { modmask: 72, key: "S", keycode: 0, dispatcher: "__lua", arg: "133", description: "Move window to scratchpad", submap: "" },
    { modmask: 64, key: "J", keycode: 0, dispatcher: "__lua", arg: "68", description: "Switch to workspace 1", submap: "" }
  ]
  assert.deepStrictEqual(M.specialKeyBinds(binds), {
    scratchpad: { toggle: { mods: ["SUPER"], key: "S" }, move: { mods: ["SUPER", "ALT"], key: "S" } }
  })
  assert.deepStrictEqual(M.workspaceKeyBinds(binds), { 1: { switch: { mods: ["SUPER"], key: "J" }, move: null } })
  assert.strictEqual(M.specialTooltip("special:scratchpad", M.specialKeyBinds(binds).scratchpad),
    "Scratchpad · SUPER + S to toggle · SUPER + ALT + S to move window here")
  assert.strictEqual(M.specialTooltip("special:music", null), "music")
})

test("specialKeyBinds recovers Lua keys from the bind-keys helper", () => {
  const binds = [
    { modmask: 64, key: "", keycode: 0, dispatcher: "__lua", arg: "131", description: "Toggle scratchpad", submap: "" }
  ]
  const helper = { keycodes: { 39: "s" }, binds: [{ modmask: 64, description: "Toggle scratchpad", key: "code:39" }] }
  assert.deepStrictEqual(M.specialKeyBinds(binds, helper), { scratchpad: { toggle: { mods: ["SUPER"], key: "S" }, move: null } })
  assert.deepStrictEqual(M.specialKeyBinds(binds), {})
})

test("specialKeyBinds reads classic special workspace dispatchers", () => {
  const classic = [
    { modmask: 64, key: "s", keycode: 0, dispatcher: "togglespecialworkspace", arg: "scratchpad", description: "" },
    { modmask: 72, key: "s", keycode: 0, dispatcher: "movetoworkspacesilent", arg: "special:scratchpad", description: "" },
    { modmask: 65, key: "s", keycode: 0, dispatcher: "movetoworkspace", arg: "special:scratchpad", description: "" },
    { modmask: 64, key: "grave", keycode: 0, dispatcher: "togglespecialworkspace", arg: "", description: "" },
    { modmask: 65, key: "grave", keycode: 0, dispatcher: "movetoworkspace", arg: "special", description: "" },
    { modmask: 64, key: "m", keycode: 0, dispatcher: "togglespecialworkspace", arg: "music", description: "", submap: "media" },
    { modmask: 64, key: "3", keycode: 0, dispatcher: "movetoworkspace", arg: "3", description: "" },
    { modmask: 64, key: "mouse:273", keycode: 0, dispatcher: "togglespecialworkspace", arg: "x", mouse: true, description: "" }
  ]
  assert.deepStrictEqual(M.specialKeyBinds(classic), {
    // The plain move beats the silent one listed first.
    scratchpad: { toggle: { mods: ["SUPER"], key: "S" }, move: { mods: ["SUPER", "SHIFT"], key: "S" } },
    special: { toggle: { mods: ["SUPER"], key: "`" }, move: { mods: ["SUPER", "SHIFT"], key: "`" } }
  })
  assert.deepStrictEqual(M.specialBindAction({ dispatcher: "__lua", description: "Toggle special workspace term" }), { kind: "toggle", name: "term", silent: false })
  assert.deepStrictEqual(M.specialBindAction({ dispatcher: "__lua", description: "Move window silently to scratchpad" }), { kind: "move", name: "scratchpad", silent: true })
  assert.strictEqual(M.specialBindAction({ dispatcher: "__lua", description: "Toggle fullscreen" }), null)
  assert.strictEqual(M.specialBindAction(null), null)
  assert.deepStrictEqual(M.specialKeyBinds(null), {})
})

// ---- Scrolling

test("scrollTarget skips special workspaces and starts from the last numbered one", () => {
  assert.strictEqual(M.scrollTarget([1, 2, 3], 2, 2, 1), 3)
  assert.strictEqual(M.scrollTarget([1, 2, 3], 3, 3, 1), 1)
  // A special workspace (negative id) is current: step from the last numbered.
  assert.strictEqual(M.scrollTarget([1, 2, 3], -98, 2, -1), 1)
  assert.strictEqual(M.scrollTarget([1, 2, 3], 2, 2, 0), 2)
  assert.strictEqual(M.scrollTarget([], 2, 2, 1), 2)
})

function feed(events, options) {
  let state = null
  const steps = []
  for (const e of events) {
    const r = M.scrollStep(state, e, options)
    state = r.state
    if (r.step) steps.push(r.step)
  }
  return { steps, state }
}

test("scrollStep: a touchpad swipe is one step", () => {
  // 40 events of 15 px, 8 ms apart: 600 px in 320 ms.
  const swipe = []
  for (let i = 0; i < 40; i++) swipe.push({ angleY: -120, pixelY: -15, time: 1000 + i * 8 })
  assert.deepStrictEqual(feed(swipe, {}).steps, [1])
  // Up is the previous workspace.
  assert.deepStrictEqual(feed(swipe.map((e) => ({ ...e, angleY: 120, pixelY: 15 })), {}).steps, [-1])
  // Too short a swipe does nothing.
  assert.deepStrictEqual(feed(swipe.slice(0, 5), {}).steps, [])
  // Two swipes with a pause between them are two steps.
  const second = swipe.map((e) => ({ ...e, time: e.time + 1000 }))
  assert.deepStrictEqual(feed(swipe.concat(second), {}).steps, [1, 1])
})

test("scrollStep: wheel notches step once each, with a cooldown", () => {
  // Three notches 200 ms apart: three steps.
  assert.deepStrictEqual(feed([0, 200, 400].map((t) => ({ angleY: -120, time: t })), {}).steps, [1, 1, 1])
  // A free-spinning wheel: ten notches 20 ms apart, then one 160 ms later.
  const spin = []
  for (let i = 0; i < 10; i++) spin.push({ angleY: 120, time: i * 20 })
  spin.push({ angleY: 120, time: 360 })
  assert.deepStrictEqual(feed(spin, {}).steps, [-1, -1, -1])
  // High-resolution wheels send parts of a notch.
  const hires = []
  for (let i = 0; i < 8; i++) hires.push({ angleY: -30, time: i * 10 })
  assert.deepStrictEqual(feed(hires, {}).steps, [1])
})

test("scrollStep: horizontal scrolls only switch on a vertical bar", () => {
  const right = [{ angleX: -120, angleY: 10, time: 0 }]
  assert.deepStrictEqual(feed(right, {}).steps, [])
  assert.deepStrictEqual(feed(right, { vertical: true }).steps, [1])
  assert.deepStrictEqual(feed([{ angleX: 120, time: 0 }], { vertical: true }).steps, [-1])
  // Mostly vertical still counts on a horizontal bar.
  assert.deepStrictEqual(feed([{ angleX: -40, angleY: -120, time: 0 }], {}).steps, [1])
  // A sideways touchpad swipe on a vertical bar uses its pixels.
  const swipe = []
  for (let i = 0; i < 10; i++) swipe.push({ angleX: -60, pixelX: -20, time: i * 8 })
  assert.deepStrictEqual(feed(swipe, { vertical: true }).steps, [1])
  assert.deepStrictEqual(feed(swipe, {}).steps, [])
  // Nothing at all is ignored.
  assert.deepStrictEqual(M.scrollStep(null, { time: 5 }, {}).step, 0)
})

test("scrollStep: reverse swaps the direction", () => {
  assert.deepStrictEqual(feed([{ angleY: -120, time: 0 }], { reverse: true }).steps, [-1])
  assert.deepStrictEqual(feed([{ angleY: 120, pixelY: 200, time: 0 }], { reverse: true }).steps, [1])
})

test("scrollStep: a pause clears a partial scroll, a direction change starts over", () => {
  // 60 px, a pause, 60 px: never reaches the 100 px step.
  const r = feed([
    { angleY: -60, pixelY: -60, time: 0 },
    { angleY: -60, pixelY: -60, time: 0 + M.SCROLL.reset + 50 }
  ], {})
  assert.deepStrictEqual(r.steps, [])
  assert.strictEqual(r.state.acc, -60)
  // Without the pause the same two add up to a step.
  assert.deepStrictEqual(feed([{ angleY: -60, pixelY: -60, time: 0 }, { angleY: -60, pixelY: -60, time: 50 }], {}).steps, [1])
  // Back and forth cancels out rather than adding up.
  assert.deepStrictEqual(feed([{ angleY: -60, pixelY: -60, time: 0 }, { angleY: 60, pixelY: 60, time: 20 }, { angleY: -60, pixelY: -60, time: 40 }], {}).steps, [])
  // A wheel after a cooldown and a pause works straight away.
  const after = feed([{ angleY: -120, time: 0 }, { angleY: -120, time: 1000 }], {})
  assert.deepStrictEqual(after.steps, [1, 1])
  assert.strictEqual(after.state.until, 1000 + M.SCROLL.wheelCooldown)
})

// ---- 2.2.0 review fixes

test("applyReport settle: working or waiting turns idle, done and idle stay", () => {
  assert.strictEqual(M.reportAccepted("s1", "settle"), true)
  for (const live of ["working", "waiting"]) {
    const a = M.applyReport({}, rep({ state: live, activity: "permission: Bash" }), { now: T0 })
    const b = M.applyReport(a.agents, rep({ state: "settle" }), { now: T0 + 60000 })
    assert.strictEqual(b.accepted, true)
    assert.strictEqual(b.agents.s1.state, "idle")
    assert.strictEqual(b.agents.s1.activity, "")
    assert.strictEqual(b.agents.s1.since, (T0 + 60000) / 1000)
    assert.strictEqual(M.agentStates(b.agents, { 300: true })[300], undefined)
    // A plain `agent` settle works the same.
    const c = M.applyReport({}, { session: "w", state: live, pids: "500,300" }, { now: T0 })
    assert.strictEqual(M.applyReport(c.agents, { session: "w", state: "settle", pids: "" }, { now: T0 + 1 }).agents.w.state, "idle")
  }
  for (const quiet of ["done", "idle"]) {
    const a = M.applyReport({}, rep({ state: quiet }), { now: T0 })
    const b = M.applyReport(a.agents, rep({ state: "settle" }), { now: T0 + 60000 })
    assert.strictEqual(b.accepted, true)
    assert.strictEqual(b.agents, a.agents)
    assert.strictEqual(b.agents.s1.state, quiet)
  }
  // An unknown session is not created by settle.
  const none = M.applyReport({}, rep({ state: "settle" }), { now: T0 })
  assert.deepStrictEqual(Object.keys(none.agents), [])
  // A settle made before a newer report is stale like any other.
  const w = M.applyReport({}, rep({ state: "working", at: T0 }), { now: T0 })
  assert.strictEqual(M.applyReport(w.agents, rep({ state: "settle", at: T0 - 5 }), { now: T0 + 10 }).accepted, false)
})

test("applyReport caps the map at 64 sessions, dropping the oldest report", () => {
  let agents = {}
  for (let i = 0; i < 64; i++) agents = M.applyReport(agents, { session: "s" + i, state: "done", pids: "" }, { now: T0 + i }).agents
  assert.strictEqual(Object.keys(agents).length, 64)
  // Updating an existing session drops nothing.
  agents = M.applyReport(agents, { session: "s0", state: "working", pids: "" }, { now: T0 + 100 }).agents
  assert.strictEqual(Object.keys(agents).length, 64)
  // A new one pushes out the oldest last report: s1 (s0 was just updated).
  agents = M.applyReport(agents, { session: "new", state: "working", pids: "" }, { now: T0 + 200 }).agents
  assert.strictEqual(Object.keys(agents).length, 64)
  assert.ok(!("s1" in agents) && "s0" in agents && "s2" in agents && "new" in agents)
  for (let i = 0; i < 100; i++) agents = M.applyReport(agents, { session: "x" + i, state: "working", pids: "" }, { now: T0 + 300 + i }).agents
  assert.strictEqual(Object.keys(agents).length, 64)
  assert.ok("x99" in agents && !("x35" in agents) && "x36" in agents)
})

test("expireReports drops unprobed sessions 30 minutes after their last report", () => {
  const ttl = M.REPORT_LIMITS.unprobedTtl
  assert.strictEqual(ttl, 30 * 60 * 1000)
  const agents = {
    nopid: { state: "working", pids: [], at: T0 },
    plainDone: { state: "done", pids: [500, 300], at: T0 },
    plainIdle: { state: "idle", pids: [500, 300], at: T0 },
    plainWorking: { state: "working", pids: [500, 300], at: T0 },
    richIdle: { state: "idle", pids: [501, 300], at: T0, rich: true },
    richNoPid: { state: "waiting", pids: [], at: T0, rich: true },
    fresh: { state: "done", pids: [], at: T0 + ttl }
  }
  assert.strictEqual(M.expireReports(agents, T0 + ttl), agents)
  const out = M.expireReports(agents, T0 + ttl + 1)
  assert.deepStrictEqual(Object.keys(out).sort(), ["fresh", "plainWorking", "richIdle"])
  // The wrapper example's done badge stays until then.
  const w = M.applyReport({}, { session: "spaces-report-1", state: "done", pids: "4242,300" }, { now: T0 }).agents
  assert.strictEqual(M.expireReports(w, T0 + 60000), w)
  assert.deepStrictEqual(M.agentStates(w, { 300: true }), { 300: "done" })
})

test("prototype names are never states or sessions", () => {
  const names = ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__", "prototype", "isPrototypeOf"]
  for (const n of names) {
    assert.strictEqual(M.normalizeAgentState(n), "", n)
    assert.strictEqual(M.reportAccepted("s1", n), false, n)
    assert.strictEqual(M.applyReport({}, rep({ state: n }), { now: T0 }).accepted, false, n)
    assert.strictEqual(M.herdrBarState(n), "", n)
    assert.strictEqual(M.agentRank(n), 0, n)
    assert.deepStrictEqual(M.agentStates({ s: { state: n, pids: [300] } }, { 300: true }), {}, n)
    assert.deepStrictEqual(M.mergeAgentStates({ 300: n }, {}), {}, n)
    assert.deepStrictEqual(M.reporterAgents({ s: { state: n, pids: [300], rich: true } }, {}), [], n)
    assert.strictEqual(M.agentProbed({ state: n, pids: [300] }), false, n)
    assert.deepStrictEqual(M.herdrSummary([{ pane_id: n, status: "done" }], {}), { state: "done", live: 0 }, n)
    assert.deepStrictEqual(M.herdrAcks([{ pane_id: n, status: "done" }], {}, false), {}, n)
  }
  for (const n of ["__proto__", "constructor", "prototype"]) {
    assert.strictEqual(M.reportSession(n), "", n)
    assert.strictEqual(M.reportAccepted(n, "working"), false, n)
    const r = M.applyReport({}, rep({ session: n }), { now: T0 })
    assert.strictEqual(r.accepted, false, n)
    assert.strictEqual(Object.getPrototypeOf(r.agents), Object.prototype, n)
    assert.deepStrictEqual(Object.keys(r.agents), [], n)
    assert.strictEqual(M.applyReport({}, { session: n, state: "end" }, { now: T0 }).accepted, false, n)
  }
  // Other inherited names are ordinary session ids.
  const t = M.applyReport({}, rep({ session: "toString" }), { now: T0 })
  assert.strictEqual(t.accepted, true)
  assert.strictEqual(M.reporterAgents(t.agents, {})[0].session, "toString")
})

test("key and bind tables ignore prototype names", () => {
  assert.strictEqual(M.keyDisplay("constructor"), "constructor")
  assert.strictEqual(M.keyDisplay("toString"), "toString")
  assert.strictEqual(M.bindKeyText("code:10", { constructor: "x" }), "code:10")
  assert.deepStrictEqual(M.bindKeyData({ keycodes: { constructor: "1", 10: "1" }, binds: [] }).keycodes, { 10: "1" })
  const binds = [
    { modmask: 64, key: "S", dispatcher: "togglespecialworkspace", arg: "__proto__" },
    { modmask: 64, key: "C", dispatcher: "togglespecialworkspace", arg: "constructor" },
    { modmask: 64, key: "T", dispatcher: "togglespecialworkspace", arg: "toString" }
  ]
  const out = M.specialKeyBinds(binds)
  assert.strictEqual(Object.getPrototypeOf(out), Object.prototype)
  assert.strictEqual(({}).toggle, undefined)
  assert.strictEqual(Object.toggle, undefined)
  assert.strictEqual(Function.prototype.toggle, undefined)
  assert.deepStrictEqual(out, {
    constructor: { toggle: { mods: ["SUPER"], key: "C" }, move: null },
    toString: { toggle: { mods: ["SUPER"], key: "T" }, move: null }
  })
  // A Lua bind keyed "constructor" is matched by count, not by Object's function.
  const keys = M.workspaceKeyBinds([{ modmask: 64, key: "constructor", description: "Switch to workspace 3" }])
  assert.deepStrictEqual(keys[3].switch, { mods: ["SUPER"], key: "constructor" })
})

test("applyReport: a report made before its session ended cannot bring it back", () => {
  const a = M.applyReport({}, rep({ state: "working", at: T0 }), { now: T0 })
  const end = M.applyReport(a.agents, rep({ state: "end", at: T0 + 100 }), { now: T0 + 100, ended: a.ended })
  assert.deepStrictEqual(Object.keys(end.agents), [])
  assert.deepStrictEqual(end.ended, { s1: T0 + 100 })
  // The delayed Stop, made before SessionEnd, arrives after it.
  const late = M.applyReport(end.agents, rep({ state: "done", at: T0 + 50 }), { now: T0 + 200, ended: end.ended })
  assert.strictEqual(late.accepted, false)
  assert.strictEqual(late.agents, end.agents)
  assert.strictEqual(M.applyReport(end.agents, rep({ state: "done", at: T0 + 100 }), { now: T0 + 200, ended: end.ended }).accepted, false)
  // A report made later (a resumed session) is accepted.
  const resumed = M.applyReport(end.agents, rep({ state: "working", at: T0 + 101 }), { now: T0 + 200, ended: end.ended })
  assert.strictEqual(resumed.agents.s1.state, "working")
  // "end" for an unknown session is remembered too.
  const e2 = M.applyReport({}, rep({ session: "s2", state: "end", at: T0 }), { now: T0 })
  assert.strictEqual(M.applyReport({}, rep({ session: "s2", at: T0 - 1 }), { now: T0 + 1, ended: e2.ended }).accepted, false)
})

test("endedSessions is bounded in time and size", () => {
  let ended = {}
  for (let i = 0; i < 100; i++) ended = M.endedSessions(ended, "e" + i, T0 + i, T0 + i)
  assert.strictEqual(Object.keys(ended).length, M.REPORT_LIMITS.sessions)
  assert.ok("e99" in ended && !("e35" in ended) && "e36" in ended)
  const later = M.endedSessions(ended, "z", T0 + M.REPORT_LIMITS.endedTtl + 200, T0 + M.REPORT_LIMITS.endedTtl + 200)
  assert.deepStrictEqual(later, { z: T0 + M.REPORT_LIMITS.endedTtl + 200 })
  assert.deepStrictEqual(M.endedSessions({ constructor: T0 - 5 }, "", 0, T0), { constructor: T0 - 5 })
})

test("scrollStep with phases: one step per touchpad gesture, momentum ignored", () => {
  const P = M.SCROLL_PHASE
  // A slow, long swipe: 2000 ms of 15 px every 40 ms, well past the cooldown.
  function gesture(start, n, dir) {
    const out = [{ angleY: 0, pixelY: 0, time: start, phase: P.begin }]
    for (let i = 1; i <= n; i++) out.push({ angleY: -120 * dir, pixelY: -15 * dir, time: start + i * 40, phase: P.update })
    out.push({ angleY: 0, pixelY: 0, time: start + (n + 1) * 40, phase: P.end })
    return out
  }
  assert.deepStrictEqual(feed(gesture(1000, 50, 1), {}).steps, [1])
  // Without phases the same swipe steps again after each cooldown.
  assert.ok(feed(gesture(1000, 50, 1).map((e) => ({ ...e, phase: 0 })), {}).steps.length > 1)
  // Momentum after the fingers lift does nothing.
  const momentum = []
  for (let i = 0; i < 30; i++) momentum.push({ angleY: -120, pixelY: -30, time: 3100 + i * 10, phase: P.momentum })
  assert.deepStrictEqual(feed(gesture(1000, 50, 1).concat(momentum), {}).steps, [1])
  // A new gesture right after (inside the 350 ms cooldown) steps at once.
  const quick = gesture(1000, 10, 1).concat(gesture(1000 + 11 * 40 + 20, 10, -1))
  assert.deepStrictEqual(feed(quick, {}).steps, [1, -1])
  // A compositor that never ends a gesture: a pause still frees it.
  const noEnd = gesture(1000, 10, 1).slice(0, -1)
  const later = noEnd.map((e) => ({ ...e, time: e.time + 2000, phase: P.update }))
  assert.deepStrictEqual(feed(noEnd.concat(later), {}).steps, [1, 1])
  // Too short a gesture does nothing; a wheel still steps per notch.
  assert.deepStrictEqual(feed(gesture(1000, 3, 1), {}).steps, [])
  assert.deepStrictEqual(feed([0, 200].map((t) => ({ angleY: -120, time: t, phase: 0 })), {}).steps, [1, 1])
})

if (failed) { console.log(failed + " failed"); process.exit(1) }
