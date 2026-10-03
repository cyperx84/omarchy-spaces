#!/usr/bin/env bash
# Runs hooks/install-claude-hooks against throwaway Claude Code config
# directories (CLAUDE_CONFIG_DIR, made with mktemp -d). Never touches
# ~/.claude. Needs bash and python3.
set -euo pipefail
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
installer="$repo/hooks/install-claude-hooks"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
failures=0
checks=0

pass() { checks=$((checks + 1)); echo "ok   $1"; }
fail() { checks=$((checks + 1)); failures=$((failures + 1)); echo "FAIL $1"; }
check() { local name=$1; shift; if "$@"; then pass "$name"; else fail "$name"; fi; }

# A fresh config dir; refuses to hand out anything that is the real one.
newdir() {
  local d
  d=$(mktemp -d "$work/claude.XXXXXX")
  [[ $(realpath "$d") != $(realpath "$HOME/.claude" 2>/dev/null || echo /nonexistent) ]] || { echo "refusing real ~/.claude"; exit 1; }
  echo "$d"
}
run() { CLAUDE_CONFIG_DIR=$1 timeout 20 python3 "$installer" "${@:2}"; }
backups() { find "$1" -maxdepth 1 -name 'settings.json.spaces-backup-*' | wc -l; }
leftovers() { find "$1" -maxdepth 1 -name '*.spaces-tmp' | wc -l; }
# Python helpers over JSON files.
py() { python3 -c "$1" "${@:2}"; }
same_json() { py 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])) == json.load(open(sys.argv[2])) else 1)' "$1" "$2"; }
ours_per_event() {
  py '
import json, sys
d = json.load(open(sys.argv[1]))
events = ["SessionStart","UserPromptSubmit","PostToolUse","PostToolUseFailure","PermissionRequest","Notification","Stop","StopFailure","SessionEnd"]
for e in events:
    n = sum(1 for g in d["hooks"].get(e, []) for h in g.get("hooks", []) if "cyperx84.spaces/hooks/claude-hook" in h.get("command", ""))
    if n != 1: sys.exit(1)
    for g in d["hooks"][e]:
        for h in g["hooks"]:
            if "cyperx84.spaces/hooks/claude-hook" in h["command"] and (h.get("async") is not True or h.get("type") != "command"): sys.exit(1)
' "$1"
}

herdr_fixture() {
  cat >"$1/settings.json" <<'JSON'
{
  "model": "opus",
  "env": { "FOO": "bar" },
  "permissions": { "allow": ["Bash(git status)"] },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "bash '/home/someone/.claude/hooks/herdr-agent-state.sh' session", "timeout": 10 }
        ]
      }
    ],
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [ { "type": "command", "command": "/usr/local/bin/guard" } ] }
    ]
  },
  "theme": "dark"
}
JSON
}

# 1. Empty directory: creates settings.json with exactly our hooks.
d=$(newdir)
out=$(run "$d" install)
check "install into an empty dir creates settings.json" test -f "$d/settings.json"
check "every event gets exactly one async hook" ours_per_event "$d/settings.json"
check "no backup when there was no file" test "$(backups "$d")" -eq 0
check "install reports what it added" grep -q '+ Stop:' <<<"$out"
check "status reads installed" test "$(run "$d" status --short)" = installed
check "file keys are only hooks" py 'import json,sys; sys.exit(0 if list(json.load(open(sys.argv[1]))) == ["hooks"] else 1)' "$d/settings.json"
run "$d" remove >/dev/null
check "remove from a file of only our hooks leaves an empty hooks object" py 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])) == {"hooks": {}} else 1)' "$d/settings.json"

# 2. Existing settings with Herdr's SessionStart hook and other keys.
d=$(newdir)
herdr_fixture "$d"
cp "$d/settings.json" "$work/original.json"
out=$(run "$d" install)
check "backup created before the change" test "$(backups "$d")" -eq 1
check "backup is the original, byte for byte" cmp -s "$(find "$d" -maxdepth 1 -name 'settings.json.spaces-backup-*' | head -n1)" "$work/original.json"
check "our hooks added" ours_per_event "$d/settings.json"
check "Herdr's SessionStart hook kept first" py '
import json, sys
d = json.load(open(sys.argv[1]))
s = d["hooks"]["SessionStart"]
sys.exit(0 if len(s) == 2 and "herdr-agent-state" in s[0]["hooks"][0]["command"] and s[0]["matcher"] == "*" and s[0]["hooks"][0]["timeout"] == 10 else 1)' "$d/settings.json"
check "unrelated hooks and keys untouched" py '
import json, sys
d = json.load(open(sys.argv[1])); o = json.load(open(sys.argv[2]))
ok = all(d[k] == o[k] for k in ("model", "env", "permissions", "theme")) and d["hooks"]["PreToolUse"] == o["hooks"]["PreToolUse"]
sys.exit(0 if ok else 1)' "$d/settings.json" "$work/original.json"
check "no temporary files left" test "$(leftovers "$d")" -eq 0
status=$(run "$d" status)
check "status names the Herdr hook" grep -q 'Herdr hooks in Claude Code: yes (SessionStart)' <<<"$status"
check "status reads installed" grep -q 'Spaces hooks: installed' <<<"$status"

# 3. Idempotent: a second install changes nothing at all.
sum=$(sha256sum "$d/settings.json")
out=$(run "$d" install)
check "re-install says nothing to change" grep -q 'already installed' <<<"$out"
check "re-install leaves the file as it was" test "$(sha256sum "$d/settings.json")" = "$sum"
check "re-install makes no backup" test "$(backups "$d")" -eq 1

# 4. Dry runs write nothing.
out=$(run "$d" remove --dry-run)
check "dry-run remove lists the hooks" grep -q '^- Stop:' <<<"$out"
check "dry-run remove leaves the file" test "$(sha256sum "$d/settings.json")" = "$sum"
check "dry-run remove makes no backup" test "$(backups "$d")" -eq 1

# 5. Remove restores the original semantically.
sleep 1  # backups are stamped to the second
out=$(run "$d" remove)
check "remove restores the original settings" same_json "$d/settings.json" "$work/original.json"
check "remove made a second backup" test "$(backups "$d")" -eq 2
check "status reads not installed" test "$(run "$d" status --short)" = "not installed"
out=$(run "$d" remove)
check "second remove has nothing to do" grep -q 'nothing to change' <<<"$out"

# 6. Dry-run install writes nothing.
d=$(newdir)
herdr_fixture "$d"
sum=$(sha256sum "$d/settings.json")
out=$(run "$d" install --dry-run)
check "dry-run install prints the plan" grep -q 'Would add to' <<<"$out"
check "dry-run install leaves the file" test "$(sha256sum "$d/settings.json")" = "$sum"
check "dry-run install makes no backup" test "$(backups "$d")" -eq 0
d2=$(newdir)
run "$d2" install --dry-run >/dev/null
check "dry-run install into an empty dir creates nothing" test ! -e "$d2/settings.json"

# 7. Malformed JSON is refused without writing.
d=$(newdir)
printf '{ "hooks": { "Stop": [ }\n' >"$d/settings.json"
sum=$(sha256sum "$d/settings.json")
set +e; out=$(run "$d" install 2>&1); code=$?; set -e
check "malformed JSON is refused with status 2" test "$code" -eq 2
check "refusal says why" grep -q 'not valid JSON' <<<"$out"
check "malformed file untouched" test "$(sha256sum "$d/settings.json")" = "$sum"
check "no backup for a refused file" test "$(backups "$d")" -eq 0
check "no temporary files for a refused file" test "$(leftovers "$d")" -eq 0
printf '{ "hooks": [] }\n' >"$d/settings.json"
set +e; run "$d" install >/dev/null 2>&1; code=$?; set -e
check "hooks that are not an object are refused" test "$code" -eq 2
set +e; run "$d" status --short >/dev/null 2>&1; code=$?; set -e
check "status --short of a refused file exits 2" test "$code" -eq 2

# 8. Partial installs are reported and repaired; mixed groups keep the rest.
d=$(newdir)
run "$d" install >/dev/null
py '
import json, sys
p = sys.argv[1]; d = json.load(open(p))
del d["hooks"]["Notification"]
d["hooks"]["Stop"][0]["hooks"].append({"type": "command", "command": "/usr/bin/true"})
json.dump(d, open(p, "w"))' "$d/settings.json"
check "status reads partial" test "$(run "$d" status --short)" = partial
run "$d" install >/dev/null
check "install repairs a partial install" test "$(run "$d" status --short)" = installed
check "repair keeps a foreign hook that shared our group" grep -q '/usr/bin/true' "$d/settings.json"
run "$d" remove >/dev/null
check "remove keeps a foreign hook that shared our group" py '
import json, sys
d = json.load(open(sys.argv[1]))
sys.exit(0 if d == {"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "/usr/bin/true"}]}]}} else 1)' "$d/settings.json"

# 9. A symlinked settings.json stays a symlink; the target changes.
d=$(newdir)
mkdir "$d/dotfiles"
herdr_fixture "$d/dotfiles"
ln -s dotfiles/settings.json "$d/settings.json"
run "$d" install >/dev/null
check "symlink kept" test -L "$d/settings.json"
check "symlink target updated" ours_per_event "$d/dotfiles/settings.json"
check "backup next to the target" test "$(backups "$d/dotfiles")" -eq 1

# 10. Mode is kept; usage errors exit 1.
d=$(newdir)
herdr_fixture "$d"
chmod 600 "$d/settings.json"
run "$d" install >/dev/null
check "file mode kept" test "$(stat -c %a "$d/settings.json")" = 600
set +e; run "$d" frobnicate >/dev/null 2>&1; code=$?; set -e
check "unknown command exits 1" test "$code" -eq 1

# 11. Only commands that run the hook are ours: one that mentions its path
# in a comment or an argument survives install and remove.
d=$(newdir)
cat >"$d/settings.json" <<'JSON'
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "/usr/local/bin/notify # like ~/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook" } ] }
    ],
    "Notification": [
      { "hooks": [ { "type": "command", "command": "logger ran ~/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook" } ] }
    ]
  }
}
JSON
cp "$d/settings.json" "$work/mentions.json"
run "$d" install >/dev/null
check "a hook that only mentions the path is kept by install" py '
import json, sys
d = json.load(open(sys.argv[1]))
ok = d["hooks"]["Stop"][0]["hooks"][0]["command"].startswith("/usr/local/bin/notify") and d["hooks"]["Notification"][0]["hooks"][0]["command"].startswith("logger")
sys.exit(0 if ok else 1)' "$d/settings.json"
check "install still adds ours next to them" test "$(run "$d" status --short)" = installed
run "$d" remove >/dev/null
check "a hook that only mentions the path is kept by remove" same_json "$d/settings.json" "$work/mentions.json"
check "status of mentions alone reads not installed" test "$(run "$d" status --short)" = "not installed"
# A moved home: the same plugin path under another home is ours.
d=$(newdir)
printf '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"/home/old/.config/omarchy/plugins/cyperx84.spaces/hooks/claude-hook","async":true}]}]}}\n' >"$d/settings.json"
out=$(run "$d" remove)
check "a hook under a moved home is ours" grep -q '^- Stop: /home/old/' <<<"$out"

# 12. Containers that were empty before install stay after remove.
d=$(newdir)
printf '{"hooks":{}}\n' >"$d/settings.json"
cp "$d/settings.json" "$work/emptyhooks.json"
run "$d" install >/dev/null
run "$d" remove >/dev/null
check '{"hooks":{}} round-trips unchanged' same_json "$d/settings.json" "$work/emptyhooks.json"
d=$(newdir)
printf '{"hooks":{"PreToolUse":[]},"model":"opus"}\n' >"$d/settings.json"
cp "$d/settings.json" "$work/emptylist.json"
run "$d" install >/dev/null
run "$d" remove >/dev/null
check '"PreToolUse": [] round-trips unchanged' same_json "$d/settings.json" "$work/emptylist.json"

# 13. A read-only settings.json is refused, nothing written.
d=$(newdir)
herdr_fixture "$d"
chmod 444 "$d/settings.json"
sum=$(sha256sum "$d/settings.json")
set +e; out=$(run "$d" install 2>&1); code=$?; set -e
check "read-only file is refused with status 2" test "$code" -eq 2
check "refusal says not writable" grep -q 'not writable' <<<"$out"
check "read-only file untouched" test "$(sha256sum "$d/settings.json")" = "$sum"
check "read-only file mode untouched" test "$(stat -c %a "$d/settings.json")" = 444
check "no backup or temporary file for a read-only file" test "$(backups "$d")$(leftovers "$d")" = 00
chmod 644 "$d/settings.json"

# 14. NaN, Infinity and numbers out of range are not JSON: refused.
for bad in '{"x": NaN}' '{"x": -Infinity}' '{"x": 1e999}'; do
  d=$(newdir)
  printf '%s\n' "$bad" >"$d/settings.json"
  sum=$(sha256sum "$d/settings.json")
  set +e; out=$(run "$d" install 2>&1); code=$?; set -e
  check "$bad is refused, untouched" test "$code:$(sha256sum "$d/settings.json")" = "2:$sum"
done

# 15. A change between reading and writing is refused, nothing written. The
# installer is loaded as a module and the file is changed by another writer
# just as the backup is taken.
for when in backup replace; do
  d=$(newdir)
  herdr_fixture "$d"
  set +e
  out=$(CLAUDE_CONFIG_DIR=$d timeout 20 python3 -c '
import importlib.machinery, importlib.util, json, os, sys
loader = importlib.machinery.SourceFileLoader("ich", sys.argv[1])
spec = importlib.util.spec_from_loader("ich", loader)
m = importlib.util.module_from_spec(spec); loader.exec_module(m)
target = os.path.join(os.environ["CLAUDE_CONFIG_DIR"], "settings.json")
def other_writer():
    with open(target, "a") as f: f.write(" ")
if sys.argv[2] == "backup":
    real = m.shutil.copy2
    def copy2(a, b):
        other_writer(); return real(a, b)
    m.shutil.copy2 = copy2
else:
    real = m.os.chmod
    def chmod(p, mode, *args, **kwargs):
        real(p, mode, *args, **kwargs)
        if str(p).endswith(".spaces-tmp"): other_writer()
    m.os.chmod = chmod
sys.exit(m.main(["install"]))' "$installer" "$when" 2>&1)
  code=$?
  set -e
  check "a change before the $when is refused with status 2" test "$code" -eq 2
  check "refusal before the $when says it changed" grep -q 'changed while' <<<"$out"
  check "the other writer's version is kept ($when)" py 'import sys; sys.exit(0 if open(sys.argv[1]).read().endswith("}\n ") else 1)' "$d/settings.json"
  check "no Spaces hooks written ($when)" test "$(run "$d" status --short)" = "not installed"
  check "no backup or temporary file left ($when)" test "$(backups "$d")$(leftovers "$d")" = 00
done

echo "$checks checks, $failures failed"
(( failures == 0 ))
