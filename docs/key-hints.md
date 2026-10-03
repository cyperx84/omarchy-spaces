# Key hints

Spaces can show, on each workspace pill, the key that takes you to that workspace. It reads the keys from Hyprland's live binds rather than assuming Omarchy's defaults, so it follows whatever you have bound. Hovering a pill also shows a tooltip with the keys that switch to it and move a window to it.

## Label styles

<p align="center">
  <img src="../.github/assets/key-hints.png" width="100%" alt="The same row of workspace pills in four label styles, stacked top to bottom: Number + key, with a small key caption after each number; Key, showing only the bound key; Number; and Glyph, where the focused workspace shows a glyph instead of its number" />
</p>

The "Workspace label" setting under Appearance (`labelStyle`) chooses what each pill says. Take a setup where `SUPER + J` switches to workspace 1:

| Panel label | Value | Pill for workspace 1 | Without a bind |
| --- | --- | --- | --- |
| Number + key | `both` (default) | `1` with a small `J` after it | `1` |
| Key | `key` | `J` | `1` |
| Number | `number` | `1` | `1` |
| Glyph | `glyph` | A glyph on the active pill, `1` otherwise | Same |
| None | `none` | No label | No label |

In the Number + key style, the caption sits after the number on a horizontal bar and under it on a vertical bar. It is left out when it would only repeat the number, as with `SUPER + 3` for workspace 3. Workspace 10 is labelled `0` in every style that shows a number.

## The shortcut tooltip

Hover a pill, away from its app icons, and a tooltip names its keys:

```text
Workspace 1 · SUPER + J to switch · ALT + SHIFT + J to move window here
```

A part with no bind is left out, and a pill with no bind at all has no tooltip. The tooltip does not show while the pill's own preview card is open, and app icons inside the pill have their own tooltip. Turn it off with "Shortcut tooltips" under Behaviour (`keyTooltips`); it does not depend on the general "Tooltips" setting.

<p align="center">
  <img src="../.github/assets/tooltip.png" width="60%" alt="Hovering a workspace pill shows a tooltip: Workspace 1, SUPER + J to switch, ALT + SHIFT + J to move window here" />
</p>

## How binds are detected

Spaces runs `hyprctl binds -j` when it starts and reads two kinds of bind.

**Omarchy's Lua binds.** Omarchy 4 sets up its binds from Lua, so Hyprland lists them with the dispatcher `__lua` and the meaning is only in the bind's description. Spaces matches these descriptions, ignoring case:

| Description | Counts as |
| --- | --- |
| `Switch to workspace N` | Switch key for workspace N |
| `Move window to workspace N` | Move key for workspace N |
| `Move window silently to workspace N` | Move key for workspace N |

So a bind in `~/.config/hypr/bindings.lua` is picked up when its description follows that wording:

```lua
o.bind("SUPER + J", "Switch to workspace 1", hl.dsp.focus({ workspace = "1" }))
o.bind("ALT + SHIFT + J", "Move window to workspace 1", hl.dsp.window.move({ workspace = "1" }))
```

**Classic dispatcher binds.** Binds from a `hyprland.conf`-style config are read by their dispatcher, whatever their description:

| Dispatcher | Counts as |
| --- | --- |
| `workspace` | Switch key |
| `movetoworkspace` | Move key |
| `movetoworkspacesilent` | Move key |

Only a plain workspace number counts as the argument. Relative or named targets such as `e+1`, `previous` or `name:web` are not tied to one pill and are skipped.

## Which bind wins

When several binds reach the same workspace, for example Omarchy's `SUPER + 1` and your own `SUPER + J`, Spaces picks one per workspace, separately for switch keys and move keys:

1. For move keys, a plain move beats a silent one.
2. Then the modifiers used most often across all binds of that kind win. If you bound six workspaces to `SUPER + letter` and two leftovers use `CTRL + digit`, the `SUPER` binds win. This keeps one consistent scheme on the bar.
3. On a tie, the bind with the lower Hyprland modifier mask wins.
4. On a further tie, the bind listed first by `hyprctl` wins.

## How keys are written

Modifiers are written in the order `SUPER`, `CTRL`, `ALT`, `SHIFT`, followed by `CAPS`, `MOD2`, `MOD3` and `MOD5` when used, and joined with ` + `. Single letters are shown in capitals and digits as they are. These key names get a friendlier spelling:

| Hyprland key name | Shown as |
| --- | --- |
| `comma` | `,` |
| `period` | `.` |
| `slash` | `/` |
| `minus` | `-` |
| `equal` | `=` |
| `grave` | `` ` `` |
| `bracketleft` | `[` |
| `bracketright` | `]` |
| `semicolon` | `;` |
| `apostrophe` | `'` |
| `backslash` | `\` |
| `space` | `Space` |
| `Return` | `Enter` |
| `Tab` | `Tab` |
| `Escape` | `Esc` |

Any other key is shown as Hyprland names it, for example `F5`. A classic bind made by key code, which Hyprland lists with an empty key name and a key code, is shown as `code:N`.

## When binds are read again

Spaces reads the binds once at startup and again half a second after Hyprland reports a config reload. Saving your Hyprland config normally triggers a reload, so a new bind shows on the bar a moment later. If the scan fails, Spaces keeps the keys it already knew.

## What is skipped

- Binds inside a submap: they only work after entering the submap, so they are not the key that reaches a workspace.
- Mouse binds.
- Binds with an empty key name and no key code. Hyprland lists some Lua binds twice, once without a key, and the empty copy is ignored.
- Binds whose description or dispatcher does not match the patterns above.

## My keys do not show

1. **Check the label style.** Under Appearance, "Workspace label" must be "Number + key" or "Key". Number, Glyph and None never show keys.
2. **Check that the key is not the number.** In "Number + key", `SUPER + 3` on workspace 3 shows no caption, because it would read `3 3`.
3. **Check Omarchy's stock binds.** Omarchy binds `SUPER + 1` to `SUPER + 0` by key code (`code:10` and up). Hyprland 0.56 lists those Lua binds with an empty key name and key code 0, so Spaces cannot tell which key they use and skips them. With only the stock binds, pills show their numbers and have no shortcut tooltip. Binds by key name, such as `SUPER + J`, work.
4. **Check the description.** A Lua bind is only recognised by its description. "Go to workspace 1" or "Workspace 1" will not match; it must read "Switch to workspace 1", "Move window to workspace 1" or "Move window silently to workspace 1".
5. **Check for a submap.** Binds inside a submap are skipped.
6. **Reload.** Run `hyprctl reload`, or restart the shell, if Hyprland did not reload after your edit.
7. **Look at what Spaces sees.** This prints every bind Spaces would consider, in the shape it reads them:

   ```sh
   hyprctl binds -j | jq -c '.[]
     | select((.description | test("^(switch to|move window( silently)? to) workspace [0-9]+$"; "i"))
              or (.dispatcher | IN("workspace", "movetoworkspace", "movetoworkspacesilent")))
     | {modmask, key, keycode, dispatcher, arg, description, submap, mouse}'
   ```

   A usable bind has a non-empty `key` (or a non-zero `keycode`), an empty `submap`, and `mouse` false. For a classic bind, `arg` must be a plain number.
