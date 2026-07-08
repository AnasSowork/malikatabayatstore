#!/usr/bin/env bash
# Hostinger VPS — first deploy and updates for MalikatAbayat Store.
# Run on the VPS as root (or with sudo) from the youth-store directory.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/malikatabayat}"
DOMAIN="${DOMAIN:-malikatalabayat.com}"
REPO_URL="${REPO_URL:-}"

usage() {
  cat <<'EOF'
Usage:
  vps-deploy.sh setup     Install Docker, Nginx, Certbot (first time only)
  vps-deploy.sh env       Create .env from .env.production.example
  vps-deploy.sh deploy    Pull/build/start containers
  vps-deploy.sh seed      Run database seed (first time only)
  vps-deploy.sh ssl       Issue Let's Encrypt certificate
  vps-deploy.sh logs      Tail app logs

Environment:
  APP_DIR   App directory on VPS (default: /var/www/malikatabayat)
  DOMAIN    Domain name (default: malikatalabayat.com)
  REPO_URL  Git clone URL (required for first deploy if repo not present)
EOF
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "Run with sudo: sudo bash scripts/vps-deploy.sh $*"
    exit 1
  fi
}

cmd_setup() {
  require_root
  apt-get update
  apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx

  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
  fi

  mkdir -p "$APP_DIR"
  echo "Setup complete. Clone your repo into $APP_DIR next."
}

cmd_env() {
  if [[ ! -f .env.production.example ]]; then
    echo "Run this from the youth-store directory."
    exit 1
  fi
  if [[ -f .env ]]; then
    echo ".env already exists — edit it manually: nano .env"
    exit 0
  fi
  cp .env.production.example .env
  echo "Created .env — edit secrets before deploying:"
  echo "  nano .env"
}

cmd_deploy() {
  if [[ ! -f .env ]]; then
    echo "Missing .env — run: bash scripts/vps-deploy.sh env && nano .env"
    exit 1
  fi

  docker compose -f docker-compose.prod.yml up -d --build
  docker compose -f docker-compose.prod.yml ps
  echo ""
  echo "App running on http://127.0.0.1:3000"
  echo "Configure Nginx + SSL if not done yet (see deploy/nginx/malikatabayat.conf)."
}

cmd_seed() {
  if [[ ! -f .env ]]; then
    echo "Missing .env"
    exit 1
  fi
  docker compose -f docker-compose.prod.yml --profile seed run --rm seed
  echo "Seed finished."
}

cmd_ssl() {
  require_root
  if [[ ! -f "/etc/nginx/sites-available/$DOMAIN" ]]; then
    echo "Install Nginx config first:"
    echo "  sudo cp deploy/nginx/malikatabayat.conf /etc/nginx/sites-available/$DOMAIN"
    echo "  sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
    exit 1
  fi
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN"
}

cmd_logs() {
  docker compose -f docker-compose.prod.yml logs -f app
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    setup) cmd_setup ;;
    env) cmd_env ;;
    deploy) cmd_deploy ;;
    seed) cmd_seed ;;
    ssl) cmd_ssl ;;
    logs) cmd_logs ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
