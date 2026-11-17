#!/usr/bin/env bash
# Deploy only the personal website; existing content, secrets, nginx, other services stay untouched.
set -Eeuo pipefail
APP=/srv/site_sv
SERVICE=site-sv
if [ "$(id -u)" -ne 0 ]; then echo "ERROR: run as root on VPS" >&2; exit 2; fi
for command in git runuser npm curl systemctl; do
  command -v "$command" >/dev/null || { echo "ERROR: missing $command" >&2; exit 2; }
done
test -d "$APP/.git" || { echo "ERROR: no git checkout at $APP" >&2; exit 2; }
test -f /etc/site-sv.env || { echo "ERROR: missing /etc/site-sv.env" >&2; exit 2; }
cd "$APP"
as_site() { runuser -u site-sv -- "$@"; }
# Allow the known VPS-only adjustment in lib/voronka.ts, but no other tracked edits.
# Never discard or commit server-specific changes.
tracked_changes="$(as_site git status --porcelain --untracked-files=no)"
if [ -n "$tracked_changes" ] && [ "$tracked_changes" != ' M lib/voronka.ts' ]; then
  echo "ERROR: unexpected tracked edits; refusing deploy (use git status --short to inspect)" >&2
  exit 3
fi
if [ -n "$(as_site git diff --cached --name-only)" ]; then
  echo "ERROR: staged changes found; refusing deploy" >&2
  exit 3
fi
before="$(as_site git rev-parse HEAD)"
branch="$(as_site git symbolic-ref --quiet --short HEAD || true)"
as_site git fetch origin main
target="$(as_site git rev-parse origin/main)"
# A local hotfix is safe to carry across a branch switch only if upstream
# has NOT modified that file between the current checkout and target main.
if [ -n "$tracked_changes" ] && ! as_site git diff --quiet "$before" "$target" -- lib/voronka.ts; then
  echo "ERROR: upstream also changed lib/voronka.ts; manual reconciliation required" >&2
  exit 3
fi
if [ "$before" = "$target" ]; then
  echo "Source already at target $target; rebuilding and verifying anyway."
fi
backup="/root/site-sv-deploy-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup"
printf '%s\n' "$before" > "$backup/previous_sha"
printf '%s\n' "$branch" > "$backup/previous_branch"
printf '%s\n' "$target" > "$backup/target_sha"
if [ -n "$tracked_changes" ]; then
  cp -p lib/voronka.ts "$backup/voronka.ts"
  as_site git diff --binary -- lib/voronka.ts > "$backup/voronka.patch"
  test -s "$backup/voronka.patch" || { echo "ERROR: failed to save local hotfix patch" >&2; exit 3; }
  echo "Local lib/voronka.ts saved in private deployment backup."
fi
systemctl is-active --quiet "$SERVICE" || { echo "ERROR: $SERVICE is not active before deploy" >&2; exit 3; }
echo "Starting scoped deploy $before -> $target; rollback metadata in $backup"
recovery() {
  local original_status="$?"
  trap - ERR
  echo "ERROR: deploy failed with $original_status; restoring previous source and service" >&2
  systemctl stop "$SERVICE" || true
  if [ -n "$branch" ]; then
    as_site git switch "$branch" || as_site git switch --detach "$before" || true
  else
    as_site git switch --detach "$before" || true
  fi
  as_site npm ci --no-audit --no-fund || true
  as_site env NEXT_PUBLIC_SITE_URL=https://vodopetov.ru npm run build:vps || true
  systemctl start "$SERVICE" || true
  echo "Rollback attempted; inspect systemctl status site-sv and journalctl -u site-sv" >&2
  exit "$original_status"
}
trap recovery ERR
# Site is single-process, uses persisted /var/lib/site-sv for editable content.
# Git keeps the existing lib/voronka.ts local edit because target matches the
# previous checked-out version of that file. Switch before stopping the site.
as_site git switch --detach "$target"
if [ -n "$tracked_changes" ]; then
  cmp -s lib/voronka.ts "$backup/voronka.ts" || { echo "ERROR: local hotfix was not preserved" >&2; false; }
fi
systemctl stop "$SERVICE"
as_site npm ci --no-audit --no-fund
as_site node scripts/test-footer.mjs
as_site npm run check
as_site env NEXT_PUBLIC_SITE_URL=https://vodopetov.ru npm run build:vps
systemctl start "$SERVICE"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 10 https://vodopetov.ru/ -o "$backup/home.html"; then break; fi
  sleep 2
done
test -s "$backup/home.html" || { echo "ERROR: homepage not responding" >&2; false; }
for fragment in 't.me/prvodo' 'max.ru/join/RlWmJZNJ0D2nzGDatRQMEMj9NQVpqPb1RMoDhCqFz_M' 'solo-pr.ru' 'raga.vodopetov.ru' '/assets/projects/raga-frog.png' '/assets/projects/solo-pr-mark.svg'; do
  grep -Fq "$fragment" "$backup/home.html" || { echo "ERROR: missing footer content $fragment" >&2; false; }
done
for file in raga-frog.png solo-pr-mark.svg; do
  if [ "$file" = raga-frog.png ]; then url="/assets/projects/raga-frog.png"; else url="/assets/projects/solo-pr-mark.svg"; fi
  curl --fail --silent --show-error --max-time 10 -o /dev/null "https://vodopetov.ru$url"
done
if grep -Fq '<form class="lead-form"' "$backup/home.html"; then
  echo "ERROR: old contact form still rendered" >&2
  false
fi
systemctl is-active --quiet "$SERVICE"
trap - ERR
echo "SUCCESS: site_sv deployed at $target. Footer links, brand images, form removal and HTTPS verified."
echo "Backup metadata: $backup; prior branch ${branch:-detached} ($before)"
