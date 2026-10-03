# Contributing to Spaces

Thanks for helping. Bug reports, fixes, small features and documentation improvements are all welcome, and a clear bug report is as useful as a pull request.

## Reporting a bug

Open an issue with the [bug report form](https://github.com/cyperx84/omarchy-spaces/issues/new?template=bug_report.yml). It asks for:

- **Versions.** Omarchy (`omarchy version`), Hyprland (`hyprctl version`), Quickshell (`qs --version`), and Herdr (`herdr --version`) if the bug is about agents. Also the Spaces version, from `version` in `~/.config/omarchy/plugins/cyperx84.spaces/manifest.json`.
- **Your setup.** Bar position, number of monitors and their scale, and any Spaces settings you changed (the `cyperx84.spaces` entry from `~/.config/omarchy/shell.json`).
- **Steps to reproduce**, what you expected, and what happened instead. A screenshot or short recording helps for anything visual.
- **The shell log.** Run `qs log -p /usr/share/omarchy/shell` and paste the lines around the problem, especially any that mention `Spaces.qml`, `SpacesSettings.qml` or `Model.js`.

For key hints, include the output of `hyprctl binds -j` for your workspace binds. For agent status, include the output of `python3 ~/.config/omarchy/plugins/cyperx84.spaces/hooks/herdr-feed --once`. Remove anything private, such as window titles, first.

Check [docs/troubleshooting.md](docs/troubleshooting.md) before filing; your problem may already have a fix.

## Suggesting a feature

Use the [feature request form](https://github.com/cyperx84/omarchy-spaces/issues/new?template=feature_request.yml). Describe the problem you want solved before the solution you have in mind. For anything large, open an issue to talk it through before writing code.

## Setting up

[docs/development.md](docs/development.md) explains how to link a clone into Omarchy, how the code is organised and the conventions it follows. Read the "Conventions" section before your first change.

## Tests that must pass

Before you open a pull request, run:

```sh
node tests/model.test.js
python3 -m py_compile hooks/herdr-feed
bash tests/settings.sh
```

The first two also run in CI. `tests/settings.sh` needs an Omarchy machine; if you changed `Spaces.qml`'s settings gear, also run `bash tests/gear.sh`, which opens a window on your desktop for a few seconds.

New logic in `Model.js` needs a test in `tests/model.test.js`. A new setting goes in all four places described in [Adding a setting](docs/development.md#adding-a-setting).

## Commits and pull requests

- Keep each pull request to one change. Several small ones are easier to review than one large one.
- Write commit subjects in the imperative, describing the change for a reader of `git log` ("Show the agents chip on vertical bars"), and explain the why in the body when it is not obvious.
- Update the documentation in `docs/` and the README when you change behaviour or add a setting, and add a line for users under an "Unreleased" heading at the top of `CHANGELOG.md`.
- For any visible change, attach a before and after screenshot to the pull request.
- Test on your own machine and say what you tested: bar position, monitors, with or without Herdr.

## Scope

Spaces is a workspace switcher for the Omarchy bar. Contributions that fit:

- Fixes for bugs on any bar position, monitor layout or scale
- Better icon matching, previews and key hint detection
- Agent status improvements, including other agent sources that fit the `agent` IPC call
- Settings that change how the widget looks or behaves, if they are useful to more than one person
- Documentation, tests and accessibility

What the project will not take:

- Features unrelated to workspaces or agents, which belong in a separate widget
- Code that needs root, network access or new runtime dependencies beyond Omarchy, Hyprland, Quickshell and, for agents, Python 3 and Herdr
- Changes that make the widget fail or log errors when Herdr or Python is missing
- Support for compositors other than Hyprland

## License

By contributing, you agree that your contribution is released under the project's [MIT license](LICENSE).
