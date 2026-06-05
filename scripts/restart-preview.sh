#!/usr/bin/env bash
set -euo pipefail

PORT="${PREVIEW_PORT:-3030}"
HOST="${PREVIEW_HOST:-127.0.0.1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

kill_port() {
  local port=$1
  local attempts=0
  while [ "$attempts" -lt 10 ]; do
    pids=$(lsof -ti "tcp:${port}" 2>/dev/null || true)
    if [ -z "$pids" ]; then
      return 0
    fi
    echo "停止端口 ${port} 上的进程: ${pids}"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 0.5
    attempts=$((attempts + 1))
  done
  if lsof -ti "tcp:${port}" >/dev/null 2>&1; then
    echo "错误: 端口 ${port} 仍被占用，请手动执行: lsof -ti tcp:${port} | xargs kill -9"
    exit 1
  fi
}

kill_port "$PORT"
kill_port 3031

cd "$ROOT"

if [ ! -f "$ROOT/.output/server/index.mjs" ]; then
  echo "未找到构建产物，正在执行 npm run build ..."
  npm run build
fi

# 等待端口彻底释放，避免 EADDRINUSE
sleep 1
if lsof -ti "tcp:${PORT}" >/dev/null 2>&1; then
  echo "警告: 端口 ${PORT} 仍被占用，再次尝试释放..."
  kill_port "$PORT"
  sleep 1
fi

echo "启动 preview: http://${HOST}:${PORT}"
export HOST="$HOST"
export PORT="$PORT"
export NITRO_HOST="$HOST"
export NITRO_PORT="$PORT"
exec node "$ROOT/.output/server/index.mjs"
