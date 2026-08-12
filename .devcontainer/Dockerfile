# hikingtrips dev container
#
# The site itself is plain HTML/CSS/JS with **no build step** — nothing here
# compiles, bundles, or transpiles the project. What the image provides is the
# stuff you can't do with a text editor alone:
#
#   * a real HTTP origin  — the site uses ES modules + fetch(), so `file://`
#                           can't load it at all (module CORS + fetch on
#                           file: URLs both fail). `python3` runs serve.py.
#   * a headless browser  — public/tests/ is a browser mocha suite; without
#                           Chromium the only way to run it is to click around
#                           in a GUI. Playwright makes it a one-liner.
#   * content-authoring tooling — jq, xmllint, ImageMagick for the trip data
#                           (JSON/GPX/photos) that the site reads.
#
# Deployment is NOT in here: publishing the site stays on the host, so the
# container never holds credentials that could push it live.
#
# Base: Microsoft's JavaScript/Node devcontainer image (Debian bookworm, non-root
# `vscode` user, Node 22 already on PATH). Node is baked into the *base* rather
# than layered on as a feature because this Dockerfile needs `npm` at build time
# to install Playwright — features are applied after the image is built, so a
# node feature would come too late. Multi-arch, so this runs native on both
# Apple Silicon and amd64.
FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

# --- system packages ------------------------------------------------------------
#   python3         : runs .devcontainer/serve.py (stdlib only — no pip installs).
#                     The base ships python3*-minimal, whose stdlib is gutted
#                     ("No module named 'json'"); the python3 metapackage pulls in
#                     libpython3.11-stdlib and restores it.
#   jq              : poke at public/trips.json and the tests' JSON fixtures.
#   libxml2-utils   : `xmllint` — GPX is XML, and a truncated track that the map
#                     silently drops is much easier to spot with
#                     `xmllint --noout public/*/planned_route/*.gpx`.
#   imagemagick     : Linux stand-in for the macOS `sips` thumbnail step in the
#                     repo README. Bookworm ships ImageMagick 6, so the command
#                     is `mogrify` / `convert` — the unified `magick` entrypoint
#                     is a v7 thing and is NOT present:
#                       mogrify -path thumbs -resize 580x -quality 95 *.jpeg
#   ripgrep         : a real `rg` on PATH. Claude Code's shell-snapshot wrapper
#                     only shadows `rg` when no system `rg` exists
#                     (`if ! command -v rg`), and its Linux/bash branch dispatches
#                     via `exec -a` (argv[0]) which the container binary ignores ->
#                     bare `rg` errors with "unknown option '-G'". Installing
#                     ripgrep makes that wrapper stand down. (The find/grep
#                     wrappers are unconditional; use `command find` / `command
#                     grep` for those.)
#   curl/ca-certificates : TLS to unpkg/cdnjs (the test suite's mocha + chai) and
#                     general fetching.
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        python3 \
        jq \
        libxml2-utils \
        imagemagick \
        ripgrep \
        curl \
        ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- global Node tooling --------------------------------------------------------
# Installed under an explicit prefix (/opt/node-tools) rather than npm's default
# global root: the base image relocates that root via $NPM_GLOBAL, and pinning our
# own path keeps NODE_PATH below deterministic no matter what the base does next.
#
# NODE_PATH matters because .devcontainer/run-tests.mjs is an ES module and ESM
# does *not* consult NODE_PATH — the script therefore resolves Playwright through
# `createRequire()` (CommonJS resolution), which does. Keep the two in step.
#
#   playwright — drives headless Chromium over public/tests/index.html.
#   @fission-ai/openspec — the `openspec` CLI backing openspec/ and the
#                          .claude/skills/openspec-* skills.
#
# Both default to the latest of a major line so the build doesn't rot; pin an
# exact version in devcontainer.json -> build.args if you need byte-reproducibility.
ARG PLAYWRIGHT_VERSION=1
ARG OPENSPEC_VERSION=latest
ENV NODE_TOOLS=/opt/node-tools
ENV NODE_PATH=/opt/node-tools/lib/node_modules
ENV PATH=/opt/node-tools/bin:${PATH}
RUN set -eux; \
    npm install -g --prefix "${NODE_TOOLS}" \
        "playwright@${PLAYWRIGHT_VERSION}" \
        "@fission-ai/openspec@${OPENSPEC_VERSION}"; \
    npm cache clean --force

# --- Chromium for the browser test suite ----------------------------------------
# Downloaded to a shared, world-readable location instead of ~/.cache/ms-playwright
# so it lives in the image (survives no volume, costs no re-download on rebuild)
# and is usable by the non-root `vscode` user. `--with-deps` apt-installs the
# shared libraries headless Chromium needs (fonts, nss, libdrm, ...).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN set -eux; \
    playwright install --with-deps chromium; \
    chmod -R a+rX "${PLAYWRIGHT_BROWSERS_PATH}"; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

# ImageMagick's Debian policy blocks nothing we need (raster read/write is fine);
# left at the distro default deliberately.
