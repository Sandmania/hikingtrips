#!/usr/bin/env bash
# Toolchain verification.
# Best-effort: prints what's present and exits 0 even if a check fails, so a
# transient hiccup never blocks the container from coming up.
#
# There is nothing to install here — the site has no dependencies to fetch (no
# npm, no build step) and everything else is baked into the image.
set -uo pipefail

echo "==> hikingtrips toolchain"

check() {
  # check "<label>" <cmd...>
  local label="$1"; shift
  if out="$("$@" 2>&1)"; then
    printf '  ok   %-12s %s\n' "$label" "$(printf '%s' "$out" | head -n1)"
  else
    printf '  MISS %-12s (`%s` failed)\n' "$label" "$*"
  fi
}

check "python3"    python3 --version
check "node"       node -v
check "npm"        npm -v
check "playwright" playwright --version
check "openspec"   openspec --version
check "jq"         jq --version
check "xmllint"    xmllint --version
# Debian bookworm ships ImageMagick 6, whose entrypoints are convert/mogrify —
# the unified `magick` command only exists in ImageMagick 7.
check "mogrify"    mogrify -version
check "rg"         rg --version
check "claude"     claude --version

# Chromium is baked into the image at $PLAYWRIGHT_BROWSERS_PATH rather than
# downloaded into a home-directory cache, so this should always be a hit. If it
# isn't, the browser test suite can't run — flag it loudly.
if [ -d "${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}" ] \
   && compgen -G "${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}/chromium*" > /dev/null; then
  echo "  ok   chromium     ${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}"
else
  echo "  MISS chromium     (run: playwright install chromium)"
fi

cat <<'EOF'

==> serve the site (then open the forwarded port in your host browser)
      python3 -m http.server 8000 --directory public
      -> http://localhost:8000/         site
      -> http://localhost:8000/tests/   browser test suite

==> run the tests headlessly (starts its own server)
      node .devcontainer/run-tests.mjs

See .devcontainer/README.md for the rest.
EOF
