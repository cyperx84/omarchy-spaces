## What this changes

<!-- What does this pull request change, and why? Link the issue it fixes, if any. -->

## How I tested it

<!-- Bar position, monitors, with or without Herdr, and anything else you tried. -->

## Checklist

- [ ] `node tests/model.test.js` passes
- [ ] `python3 -m py_compile hooks/herdr-feed` passes
- [ ] `bash tests/settings.sh` passes (on an Omarchy machine)
- [ ] New logic in `Model.js` has a test in `tests/model.test.js`
- [ ] A new setting is in `DEFAULTS`, `resolveSettings`, `manifest.json` and `SpacesSettings.qml`
- [ ] Documentation in `docs/` and the README is updated, and `CHANGELOG.md` has a line for users
- [ ] Screenshots of the change are attached, for anything visible
