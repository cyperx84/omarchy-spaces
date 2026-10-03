# Changelog

## 1.2.0

- Agent status for omp (oh-my-pi): add `hooks/omp-extension.js` to your omp
  config and its terminals get the same badges as Claude Code. An approval
  prompt waits 1.5s before showing `!`, so a quick answer never flashes
  (#14, @a-lang)
- A "Pill background" setting under Appearance hides the faint fill behind
  occupied and hovered workspaces. The active workspace keeps its highlight
  (#1, @tseluka)
- A workspace that shows a single icon no longer highlights it as focused
  (#12, #13, @tseluka)
- Sharper app icons, and an app with no icon shows the first letter of its own
  name instead of a shared prefix, so `org.omarchy.herdr` reads "H", not "O"
  (#10, @Natetgmaxwell)
- Security: window titles in the bar and in previews render as plain text, so
  a title with markup can no longer load remote images in the shell

## 1.1.0

- Settings are organised into six pages: App icons, Windows, Appearance,
  Workspaces, Previews, and Behaviour. They work from the keyboard, the
  focused title length can be set, and resetting asks first (#8, @tcballard)
- The settings gear is off by default. Right-click the widget to open
  settings, or turn the gear on under Appearance; it now sits in a fixed slot
  before the workspaces (#8)
- Agent status for OpenCode: link `hooks/opencode-plugin.js` into OpenCode and
  its terminals get the same badges as Claude Code. A permission prompt waits
  1.5s before showing `!`, so `--auto` never flashes (#4, @FarzadHayat)
- Agent status: a `working` or `waiting` badge left behind by a crashed agent
  clears within a minute (#3, @FarzadHayat)
- Previews fit portrait and rotated monitors (#6, @VulpesZerda27)
- Fixed: changing the animation speed, or turning animations off and on, hid
  every workspace pill until the shell restarted (#9, reported by @movshuri,
  fix by @Coding-Sparrow)

## 1.0.0

First stable release, ready for the Omarchy plugin marketplace.

- The plugin ID is now `cyperx84.spaces`, matching the repository owner.
  If you installed an earlier version, remove `insanearts.spaces`, add the plugin
  again, and update the hook paths in `~/.claude/settings.json`.
- README: screenshots from the product film, requirements, and update and
  removal instructions
- Marketplace preview image
- Verified with the bar on the top, bottom, left and right edges

## 0.3.0

- Agent status: terminals running Claude Code show a spinner while the agent
  works, a pulsing `!` when it needs input, and a check mark when it is done.
  Workspaces with a waiting agent pulse
- `hooks/claude-hook` reports agent state; see the README for setup
- Setting to turn agent status off

## 0.2.0

- Live workspace previews: hover another workspace to see a miniature of it,
  with each window where it really is. Click a window to jump to it
- The preview slides between workspaces as you move along the bar
- Hovering an app icon highlights its window in the preview
- `peek` command to open a preview from a keybinding:
  `omarchy-shell insanearts.spaces peek 3`
- Settings: turn previews on or off, preview size, live video or still frame
- Icons for apps with reverse-DNS ids, such as `dev.example.tool`
- Fix: workspaces could stay half faded after appearing

## 0.1.0

First release.

- Workspace pills that show the icons of the apps open on each workspace
- The active workspace slides open; the focused window is highlighted
- Click a workspace or an icon to focus it; scroll to switch workspaces
- Settings panel: when icons show, icon style and size, grouping by app,
  active style, labels, density, urgent highlights, tooltips, animations
- Icons for Chromium web apps and apps missing from the icon theme
