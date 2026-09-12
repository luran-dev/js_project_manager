#!/usr/bin/env bash
set -euo pipefail

command="${1:-status}"
if [[ $# -gt 0 ]]; then
  shift
fi

port="${PORT:-5174}"
host="${HOST:-127.0.0.1}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      port="${2:-}"
      shift 2
      ;;
    --port=*)
      port="${1#--port=}"
      shift
      ;;
    --host)
      host="${2:-}"
      shift 2
      ;;
    --host=*)
      host="${1#--host=}"
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! [[ "$port" =~ ^[0-9]+$ ]] || [[ "$port" -le 0 ]]; then
  echo "Port must be a positive integer." >&2
  exit 1
fi

runtime_dir=".data/servers"
pid_file="$runtime_dir/projectvibe-$port.pid"
log_file="$runtime_dir/projectvibe-$port.log"

pid_alive() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

stored_pid() {
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(tr -d '[:space:]' < "$pid_file")"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  echo "$pid"
}

port_pid() {
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1
}

current_pid() {
  local pid=""
  pid="$(stored_pid 2>/dev/null || true)"
  if [[ -n "$pid" ]] && pid_alive "$pid"; then
    echo "$pid"
    return 0
  fi
  port_pid
}

stop_pid() {
  local pid="$1"
  kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
}

case "$command" in
  status)
    pid="$(current_pid || true)"
    if [[ -n "$pid" ]] && pid_alive "$pid"; then
      echo "ProjectVibe is running on http://$host:$port (pid $pid)."
    else
      rm -f "$pid_file"
      echo "ProjectVibe is stopped on port $port."
    fi
    ;;
  start)
    mkdir -p "$runtime_dir"
    pid="$(current_pid || true)"
    if [[ -n "$pid" ]] && pid_alive "$pid"; then
      echo "ProjectVibe is already running on http://$host:$port (pid $pid)."
      exit 0
    fi
    if [[ -n "$(port_pid)" ]]; then
      echo "Port $port is already in use." >&2
      exit 1
    fi
    nohup pnpm exec vite --host "$host" --port "$port" --strictPort > "$log_file" 2>&1 &
    pid="$!"
    echo "$pid" > "$pid_file"
    echo "Started ProjectVibe on http://$host:$port (pid $pid)."
    echo "Log: $log_file"
    ;;
  stop)
    pid="$(current_pid || true)"
    if [[ -z "$pid" ]] || ! pid_alive "$pid"; then
      rm -f "$pid_file"
      echo "ProjectVibe is already stopped on port $port."
      exit 0
    fi
    stop_pid "$pid"
    rm -f "$pid_file"
    echo "Stopped ProjectVibe on port $port (pid $pid)."
    ;;
  *)
    echo "Usage: scripts/server.sh <start|stop|status> [--port 5174] [--host 127.0.0.1]" >&2
    exit 1
    ;;
esac
