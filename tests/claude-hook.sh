#!/usr/bin/env bash
# Feeds hooks/claude-hook sample Claude Code hook payloads with a stub
# omarchy-shell first on PATH that records its arguments, and checks the
# event-to-state mapping, the arguments, the PID chain and that the hook
# stays silent and exits 0. Needs bash and python3; touches no real shell.
set -euo pipefail
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
hook="$repo/hooks/claude-hook"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mkdir "$work/bin" "$work/calls"
cat >"$work/bin/omarchy-shell" <<'SH'
#!/usr/bin/env bash
out=$(mktemp "$SPACES_STUB_CALLS/call.XXXXXX")
printf '%s\0' "$@" >"$out"
SH
chmod +x "$work/bin/omarchy-shell"
failures=0
checks=0
pass() { checks=$((checks + 1)); echo "ok   $1"; }
fail() { checks=$((checks + 1)); failures=$((failures + 1)); echo "FAIL $1${2:+: $2}"; }

# Runs the hook under a python3 parent (not a shell, so it heads the PID
# chain) with the payload on stdin. Sets: launcher (that parent's PID),
# code, stdout_text, and args (the stub's argv, one per line) or none.
run_hook() {
  local payload=$1 path=${2:-$work/bin:$PATH}
  rm -f "$work/calls/"*
  local result
  result=$(printf '%s' "$payload" | env -u HERDR_ENV -u CLAUDE_CODE_REMOTE ${EXTRA_ENV:-} PATH="$path" SPACES_STUB_CALLS="$work/calls" \
    timeout 10 python3 -c '
import os, subprocess, sys
p = subprocess.run([sys.argv[1]], stdin=sys.stdin, capture_output=True, timeout=8)
sys.stdout.write("%d\n%d\n%s" % (os.getpid(), p.returncode, p.stdout.decode()))' "$hook")
  launcher=$(sed -n 1p <<<"$result")
  code=$(sed -n 2p <<<"$result")
  stdout_text=$(sed -n '3,$p' <<<"$result")
  args=""
  local i
  for i in $(seq 1 40); do
    local f
    f=$(find "$work/calls" -name 'call.*' -size +0 | head -n1)
    if [[ -n $f ]]; then sleep 0.05; args=$(tr '\0' '\n' <"$f"); return; fi
    sleep 0.05
  done
}

# arg N (1-based) of the stub's argv
arg() { sed -n "${1}p" <<<"$args"; }

expect_call() {
  local name=$1 state=$2 activity=$3 title=${4:-app}
  if [[ $code != 0 ]]; then fail "$name" "exit $code"; return; fi
  if [[ -n $stdout_text ]]; then fail "$name" "printed on stdout"; return; fi
  if [[ -z $args ]]; then fail "$name" "no report sent"; return; fi
  local want got
  want=$(printf '%s\n' -q cyperx84.spaces report sess-1 "$state")
  got=$(sed -n 1,5p <<<"$args")
  [[ $got == "$want" ]] || { fail "$name" "head: $(tr '\n' ' ' <<<"$got")"; return; }
  [[ $(arg 7) == claude ]] || { fail "$name" "agent $(arg 7)"; return; }
  [[ $(arg 8) == "$title" ]] || { fail "$name" "title '$(arg 8)'"; return; }
  [[ $(arg 9) == /home/me/Code/app ]] || { fail "$name" "cwd $(arg 9)"; return; }
  [[ $(arg 10) == "$activity" ]] || { fail "$name" "activity '$(arg 10)'"; return; }
  [[ $(arg 11) =~ ^[0-9]{13}$ ]] || { fail "$name" "time $(arg 11)"; return; }
  local pids
  pids=$(arg 6)
  [[ $pids =~ ^[0-9]+(,[0-9]+)*$ ]] || { fail "$name" "pids $pids"; return; }
  [[ ${pids%%,*} == "$launcher" ]] || { fail "$name" "first pid ${pids%%,*}, expected $launcher"; return; }
  pass "$name"
}

expect_nothing() {
  local name=$1
  if [[ $code == 0 && -z $stdout_text && -z $args ]]; then pass "$name"; else fail "$name" "exit $code, stdout '$stdout_text', args '$args'"; fi
}

base='"session_id":"sess-1","cwd":"/home/me/Code/app","transcript_path":"/x","permission_mode":"default"'

run_hook "{$base,\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"hi\"}"
expect_call "UserPromptSubmit reports working" working ""
run_hook "{$base,\"hook_event_name\":\"PostToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{}}"
expect_call "PostToolUse reports working with the tool" working "tool: Bash"
run_hook "{$base,\"hook_event_name\":\"PostToolUseFailure\",\"tool_name\":\"Edit\"}"
expect_call "PostToolUseFailure reports working" working "tool failed: Edit"
run_hook "{$base,\"hook_event_name\":\"PermissionRequest\",\"tool_name\":\"Bash\"}"
expect_call "PermissionRequest reports waiting" waiting "permission: Bash"
run_hook "{$base,\"hook_event_name\":\"Notification\",\"notification_type\":\"permission_prompt\",\"message\":\"Claude needs your permission to use Bash\"}"
expect_call "Notification permission_prompt reports waiting" waiting "Claude needs your permission to use Bash"
run_hook "{$base,\"hook_event_name\":\"Notification\",\"notification_type\":\"elicitation_dialog\",\"message\":\"line1\\nline2\"}"
expect_call "Notification text is one line" waiting "line1 line2"
run_hook "{$base,\"hook_event_name\":\"Notification\",\"notification_type\":\"idle_prompt\",\"message\":\"Claude is waiting for your input\"}"
expect_call "Notification idle_prompt reports settle without activity" settle ""
run_hook "{$base,\"hook_event_name\":\"Notification\",\"notification_type\":\"auth_success\",\"message\":\"ok\"}"
expect_nothing "Notification auth_success is ignored"
run_hook "{$base,\"hook_event_name\":\"Stop\",\"last_assistant_message\":\"done\"}"
expect_call "Stop reports done" done ""
run_hook "{$base,\"hook_event_name\":\"StopFailure\"}"
expect_call "StopFailure reports done" done "stopped: API error"
run_hook "{$base,\"hook_event_name\":\"SessionEnd\",\"reason\":\"prompt_input_exit\"}"
expect_call "SessionEnd reports end" end ""
run_hook "{$base,\"hook_event_name\":\"SessionStart\",\"source\":\"startup\",\"session_title\":\"auth-refactor\"}"
expect_call "SessionStart reports idle with the session title" idle "" auth-refactor
run_hook "{$base,\"hook_event_name\":\"SessionStart\",\"source\":\"startup\"}"
expect_call "SessionStart without a title uses the directory name" idle ""
run_hook "{$base,\"hook_event_name\":\"PreCompact\"}"
expect_nothing "other events are ignored"
run_hook "not json"
expect_nothing "malformed payload is ignored"
run_hook '["a"]'
expect_nothing "non-object payload is ignored"
EXTRA_ENV="HERDR_ENV=1" run_hook "{$base,\"hook_event_name\":\"Stop\"}"
expect_nothing "inside Herdr it does nothing"
EXTRA_ENV="CLAUDE_CODE_REMOTE=true" run_hook "{$base,\"hook_event_name\":\"Stop\"}"
expect_nothing "in a remote session it does nothing"
nobin=$(mktemp -d "$work/nobin.XXXXXX")
ln -s "$(command -v python3)" "$nobin/python3"
for tool in env timeout sed; do ln -s "$(command -v "$tool")" "$nobin/$tool"; done
run_hook "{$base,\"hook_event_name\":\"Stop\"}" "$nobin"
expect_nothing "without omarchy-shell it does nothing"

# The session id falls back to the agent's PID; text arguments are capped.
long=$(printf 'x%.0s' $(seq 1 300))
run_hook "{\"cwd\":\"/home/me/Code/app\",\"hook_event_name\":\"PermissionRequest\",\"tool_name\":\"$long\"}"
if [[ $(arg 4) == "pid$launcher" && ${#args} -gt 0 && $(arg 10 | wc -c) -le 80 ]]; then pass "missing session id falls back to pid; long text capped"; else fail "missing session id falls back to pid; long text capped" "$(arg 4) $(arg 10 | wc -c)"; fi

# A session id the widget would refuse falls back to the PID too: control
# characters (even in a short id) and names reserved by the widget.
for bad in 'sess\u0007x' 'a\nb' 'x\u2028y' '__proto__' 'constructor' 'prototype'; do
  run_hook "{\"session_id\":\"$bad\",\"cwd\":\"/home/me/Code/app\",\"hook_event_name\":\"Stop\"}"
  if [[ $(arg 4) == "pid$launcher" ]]; then pass "session id $bad falls back to pid"; else fail "session id $bad falls back to pid" "$(arg 4)"; fi
done

# Fast: the hook does not wait for the report.
start=$(date +%s%N)
run_hook "{$base,\"hook_event_name\":\"Stop\"}"
elapsed=$(( ($(date +%s%N) - start) / 1000000 ))
if (( elapsed < 3000 )); then pass "returns quickly (${elapsed} ms including polling)"; else fail "returns quickly" "${elapsed} ms"; fi

echo "$checks checks, $failures failed"
(( failures == 0 ))
