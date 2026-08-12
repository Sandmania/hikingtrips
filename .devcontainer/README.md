# hikingtrips dev container

The site is plain HTML/CSS/JS with **no build step** — nothing in here compiles,
bundles or transpiles anything, and that's deliberate. What the container provides
is the handful of things you can't do with an editor alone: an HTTP origin, a
headless browser for the test suite, and the tools for working with the trip data.

## What's inside

| Tool | Source | Why |
|------|--------|-----|
| `node` 22 | base image (`devcontainers/javascript-node`) | runs the test harness + the Claude Code CLI |
| `python3` | Dockerfile (apt) | `python3 -m http.server` — the site needs a real origin |
| `playwright` + Chromium | Dockerfile | runs `public/tests/` headlessly |
| `openspec` | Dockerfile (npm, global) | the `openspec/` workflow and the `.claude/skills/openspec-*` skills |
| `claude` | `claude-code` feature | continue developing in-container |
| `jq`, `xmllint`, `mogrify` (ImageMagick) | Dockerfile (apt) | trip data: `trips.json`, GPX tracks, photo thumbnails |
| `rg` | Dockerfile (apt) | see the note under *Gotchas* |

`postCreate.sh` prints a version line per tool. It installs nothing — the site has
no dependencies to fetch — and never fails the build.

## Serving the site

```bash
python3 -m http.server 8000 --directory public
```

Port 8000 is forwarded, so open `http://localhost:8000/` in your **host** browser.
The site can't be opened as a `file://` URL: it uses ES modules and `fetch()`, and
both are blocked on `file:` origins.

The `ritwickdey.LiveServer` extension is installed and rooted at `/public` if you
want reload-on-save instead.

### Local vs. production paths

Production serves the site from a *subdirectory* of its domain, with a CloudFront
Function ([`infra/cloudfront-rewrite.js`](../infra/cloudfront-rewrite.js)) adding
the trailing slash and the `index.html`. Locally you get it at the root
instead. That's fine, because every asset path in the site is relative, so both
layouts resolve identically. The thing it does *not* exercise is the missing-slash
redirect — if you touch path resolution, re-read that function rather than
trusting a green local page.

## Running the tests

`public/tests/` is a browser suite (mocha + chai + `@testing-library/dom`, loaded
from unpkg) exercising the custom elements against a live DOM. Two ways to run it:

```bash
# 1. In your host browser — the mocha HTML report, nice for reading failures
python3 -m http.server 8000 --directory public
#    then open http://localhost:8000/tests/

# 2. Headless, with a pass/fail exit code — what an agent (or a CI step) needs
node .devcontainer/run-tests.mjs
node .devcontainer/run-tests.mjs --grep 'MealPlan'   # filter (mocha's ?grep=)
node .devcontainer/run-tests.mjs --headed            # watch it run
```

`run-tests.mjs` starts its own `http.server` on a free port and tears it down
afterwards; pass `--url` to point it at a server you already have. It reports
failures with the assertion message and `file:line`, and exits `1` on any failure,
`2` if the harness itself breaks.

It works by intercepting the `mocha` global as `mocha.js` assigns it and wrapping
`run()` to capture the runner's events. Polling for the global would not work —
`mocha.js` and `tests/index.js` are both `defer`red, so they can run back-to-back
inside one task with no timer tick in between.

Adding a test file means adding a `<script type="module">` tag to
`public/tests/index.html`; there is no glob.

## Network egress

Both the site and the tests fetch from the network at **runtime** — there is no
vendoring step that would let them work offline:

- `unpkg.com` — mocha, chai, `@testing-library/dom` (**the test suite fails
  without this**)
- `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` — Leaflet and `js-yaml`
- the map tile proxy host configured in `public/assets/js/leaflet/baseMaps.js`
  (NLS / Lantmäteriet); base maps stay blank without it
- `cache.kartverket.no`, `tiles.kartat.kapsi.fi`, `server.arcgisonline.com` — other
  base map layers
- `registry.npmjs.org`, `cdn.playwright.dev` — build time only

## Deployment is not in here

Deploying is deliberately left on the host. There is no cloud CLI in the image and
no cloud-credential directory mounted into it, so nothing inside the container can
publish the site — that stays something you do deliberately, from outside.

To be precise about scope: this is a claim about **deployment** credentials only.
The container is *not* a sealed box. It bind-mounts your host `~/.claude` and
`~/.agents`, so Claude Code's own credentials, settings and memory are deliberately
visible inside it (see *Gotchas*). Don't read the paragraph above as "no secrets
reach the container".

See the *Deployment* section of the repo [README](../README.md) for the command.

## Gotchas

- **`~/.claude` and `~/.agents` must exist on the host before you start the
  container.** They're bind mounts, and the devcontainer CLI passes them as
  `--mount type=bind`, which *errors* on a missing source rather than creating it
  — so on a machine that has never run Claude Code, the container won't come up at
  all. Fix with `mkdir -p ~/.claude ~/.agents`. (Swapping them for named volumes
  would avoid the prerequisite but defeat the point: the whole reason they're
  binds is to share one set of credentials and memory with the host.)
- **Photos are gitignored.** `public/*/photos/` is excluded from the repo, so trip
  cards and galleries show broken images locally. That's expected, not a bug you
  introduced.
- **`rg` is installed on purpose.** Claude Code's shell-snapshot wrapper only
  shadows `rg` when no system `rg` exists; its Linux dispatch relies on `exec -a`
  (argv[0]), which the container binary ignores, so a bare `rg` fails with
  `unknown option '-G'`. A real ripgrep on `PATH` makes the wrapper stand down.
  The `find`/`grep` wrappers are unconditional — use `command find` / `command grep`.
- **The `~/.claude` mount is a bind with holes in it.** Host settings, credentials
  and memory are shared, but `shell-snapshots/`, `sessions/` and `session-env/` are
  overlaid with container-local volumes: they hold host- and version-specific
  runtime state, and letting a newer host Claude Code's snapshots leak into the
  older container binary breaks bare `grep`/`rg`/`find`.
- **ImageMagick 6, not 7.** Bookworm has no `magick` command; use `mogrify` /
  `convert`. The `sips` thumbnail step from the repo README becomes:
  `mogrify -path thumbs -resize 580x -quality 95 *.jpeg`

## Toggles

- **Pin versions:** `build.args` in `devcontainer.json` — `PLAYWRIGHT_VERSION` and
  `OPENSPEC_VERSION` default to the latest of their line so the build doesn't rot.
- **More browsers:** add to `playwright install --with-deps chromium` in the
  Dockerfile. Chromium alone is ~400 MB, so it's the only one baked in.
- **GPX conversion:** add `gpsbabel` to the apt list if you need format juggling
  beyond `xmllint --noout public/*/planned_route/*.gpx`.

## Rebuild

After editing anything here: **Dev Containers: Rebuild Container** (VS Code), or
`devcontainer build --workspace-folder .`. The `hikingtrips-npm-cache` and
`hikingtrips-claude-*` volumes persist across rebuilds.
