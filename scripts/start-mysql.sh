#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
DATA="$ROOT/.data/mysql"
export MAMBA_ROOT_PREFIX="$TOOLS/mamba"

MYSQLD="$TOOLS/mamba/bin/mysqld"
MYSQLADMIN="$TOOLS/mamba/bin/mysqladmin"
MYSQL="$TOOLS/mamba/bin/mysql"
BASEDIR="$TOOLS/mamba"

if [ ! -x "$MYSQLD" ]; then
  echo "[mysql] Installing local MySQL (first run may take a minute) ..."
  if [ ! -x "$TOOLS/bin/micromamba" ]; then
    python3 <<PY
import bz2, io, tarfile, urllib.request
from pathlib import Path
tools = Path("${TOOLS}")
tools.mkdir(parents=True, exist_ok=True)
if not (tools / "bin/micromamba").exists():
    data = bz2.decompress(urllib.request.urlopen("https://micro.mamba.pm/api/micromamba/linux-64/latest").read())
    tarfile.open(fileobj=io.BytesIO(data)).extractall(tools)
PY
  fi
  "$TOOLS/bin/micromamba" install -y -r "$TOOLS/mamba" -n base mysql-server mysql-client -c conda-forge
fi

mkdir -p "$DATA"

if [ ! -f "$DATA/.initialized" ]; then
  echo "[mysql] Initializing data directory ..."
  "$MYSQLD" --initialize-insecure --datadir="$DATA" --basedir="$BASEDIR"
  touch "$DATA/.initialized"
fi

if ! "$MYSQLADMIN" --socket="$DATA/mysql.sock" ping 2>/dev/null; then
  echo "[mysql] Starting server on localhost:3307 ..."
  nohup "$MYSQLD" \
    --datadir="$DATA" \
    --basedir="$BASEDIR" \
    --port=3307 \
    --socket="$DATA/mysql.sock" \
    --bind-address=127.0.0.1 \
    --pid-file="$DATA/mysqld.pid" \
    --log-error="$DATA/error.log" \
    >"$DATA/stdout.log" 2>&1 &
  for i in $(seq 1 60); do
    if "$MYSQLADMIN" --socket="$DATA/mysql.sock" ping 2>/dev/null; then
      break
    fi
    if [ "$i" -eq 60 ]; then
      echo "[mysql] Server did not start. See $DATA/error.log"
      exit 1
    fi
    sleep 1
  done
fi

"$MYSQL" --socket="$DATA/mysql.sock" -uroot -e "CREATE DATABASE IF NOT EXISTS youthstore;" 2>/dev/null || true
echo "[mysql] Ready at localhost:3307"
