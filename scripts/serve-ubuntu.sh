#!/usr/bin/env bash
#
# Clone/update this reference implementation and serve it with Docker Compose.
# Requires: git, Docker Engine, and the Docker Compose plugin.
#
# Optional environment variables:
#   PHILOSOPHY_INSTALL_DIR=/srv/philosophy
#   PHILOSOPHY_BRANCH=main
#   STORY_PORT=8080

set -Eeuo pipefail

repository_url="${PHILOSOPHY_REPOSITORY_URL:-https://github.com/dschutterop-sbp/philosophy.git}"
branch="${PHILOSOPHY_BRANCH:-main}"
install_dir="${PHILOSOPHY_INSTALL_DIR:-$HOME/philosophy}"
export STORY_PORT="${STORY_PORT:-8080}"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null || fail "git is required."
command -v docker >/dev/null || fail "Docker is required."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is required (docker compose)."

if [[ -e "$install_dir" && ! -d "$install_dir/.git" ]]; then
  fail "$install_dir exists but is not a Git checkout."
fi

if [[ ! -d "$install_dir/.git" ]]; then
  printf 'Cloning %s into %s\n' "$repository_url" "$install_dir"
  git clone --branch "$branch" --single-branch "$repository_url" "$install_dir"
else
  printf 'Updating %s\n' "$install_dir"
  git -C "$install_dir" fetch origin "$branch"
  git -C "$install_dir" checkout "$branch"
  git -C "$install_dir" pull --ff-only origin "$branch"
fi

if [[ ! -f "$install_dir/.env" ]]; then
  cp "$install_dir/.env.example" "$install_dir/.env"
  chmod 600 "$install_dir/.env"
  printf 'Created %s/.env for demo mode. Edit it before enabling live mode.\n' "$install_dir"
fi

docker compose --project-directory "$install_dir" up --detach --build --remove-orphans
docker compose --project-directory "$install_dir" ps

printf '\nServing on http://<server-address>:%s\n' "$STORY_PORT"
