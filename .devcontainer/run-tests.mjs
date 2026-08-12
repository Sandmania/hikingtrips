#!/usr/bin/env node
/**
 * Headless runner for the browser test suite in public/tests/.
 *
 * The suite is mocha + chai + @testing-library/dom loaded straight from unpkg
 * into a real page (public/tests/index.html) -- there is no node-side test
 * runner to invoke, and the components under test are custom elements that need
 * a live DOM. So the only way to run it is to actually open it in a browser.
 * This drives headless Chromium over it and turns the result into an exit code,
 * which is the one thing you can't do by hand.
 *
 *   node .devcontainer/run-tests.mjs
 *   node .devcontainer/run-tests.mjs --grep 'meal plan'
 *   node .devcontainer/run-tests.mjs --headed          # watch it run
 *   node .devcontainer/run-tests.mjs --url http://localhost:8000/tests/
 *
 * With no --url it starts `python3 -m http.server` over public/ on a free port
 * and shuts it down afterwards.
 *
 * Exit codes:
 *   0  every test passed
 *   1  at least one test failed
 *   2  the harness could not produce a trustworthy answer -- see "Trusting a
 *      green run" below
 *
 * Requires network: the page pulls mocha/chai/testing-library from unpkg.com.
 *
 * ## Trusting a green run
 *
 * Test files are registered by hand in public/tests/index.html; there is no glob.
 * That makes a specific silent failure possible: if one test module 404s or has a
 * syntax error, the *other* modules still register their tests, mocha still runs
 * them, and the run still ends with zero failures. A naive runner reports that as
 * a pass -- green, with a whole file of tests silently missing.
 *
 * So a clean mocha result is necessary but not sufficient. Two things are also
 * treated as fatal:
 *
 *   - a script that failed to load or evaluate (network failure, or any 4xx/5xx
 *     response for a .js/.mjs URL)
 *   - an uncaught exception in the page (`pageerror`), which is what a syntax
 *     error in a test module surfaces as
 *
 * Everything else -- console noise, a missing stylesheet, a 404 favicon -- is
 * printed as a warning and does not affect the exit code. That distinction is
 * deliberate: public/tests/ currently 404s three component stylesheets, which is
 * a real (benign) bug but not a reason to fail the suite.
 */

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import path from 'node:path';

// Playwright is installed globally (see Dockerfile: NODE_PATH=/opt/node-tools/...).
// ESM does not consult NODE_PATH, but CommonJS resolution does -- hence require().
const require = createRequire(import.meta.url);
let chromium;
try {
    ({ chromium } = require('playwright'));
} catch (err) {
    console.error('Could not load Playwright.');
    console.error('Inside the dev container it is installed globally; on a host, run:');
    console.error('  npm i -g playwright && playwright install chromium');
    console.error(`\n${err.message}`);
    process.exit(2);
}

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ROOT = path.join(REPO_ROOT, 'public');

function parseArgs(argv) {
    const opts = { url: null, grep: null, headed: false, timeout: 60000 };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--headed') opts.headed = true;
        else if (arg === '--url') opts.url = argv[++i];
        else if (arg === '--grep') opts.grep = argv[++i];
        else if (arg === '--timeout') opts.timeout = Number(argv[++i]);
        else if (arg === '-h' || arg === '--help') {
            console.log(
                'usage: run-tests.mjs [--url URL] [--grep PATTERN] [--headed] [--timeout MS]'
            );
            process.exit(0);
        } else {
            console.error(`unknown argument: ${arg}`);
            process.exit(2);
        }
    }
    return opts;
}

/** Ask the OS for an unused port by binding one and immediately letting go. */
function freePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.once('error', reject);
        srv.listen(0, '127.0.0.1', () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });
}

function waitForPort(port, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const sock = net.connect(port, '127.0.0.1');
            sock.once('connect', () => {
                sock.destroy();
                resolve();
            });
            sock.once('error', () => {
                sock.destroy();
                if (Date.now() > deadline) reject(new Error(`server never came up on :${port}`));
                else setTimeout(attempt, 100);
            });
        };
        attempt();
    });
}

async function startServer() {
    const port = await freePort();
    const proc = spawn(
        'python3',
        ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', SITE_ROOT],
        { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    // http.server logs every request to stderr; keep it out of the report but
    // surface a genuine startup failure (e.g. no python3).
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
        stderr += chunk;
    });
    proc.on('exit', (code) => {
        if (code !== null && code !== 0 && !proc.killed) {
            console.error(`http.server exited with ${code}\n${stderr}`);
        }
    });
    await waitForPort(port);
    return { proc, baseUrl: `http://127.0.0.1:${port}` };
}

/** A URL the page loads as executable JavaScript. */
function isScript(url) {
    try {
        return /\.m?js$/i.test(new URL(url).pathname);
    } catch {
        return false;
    }
}

/**
 * Injected before any page script. mocha's HTML reporter only writes results
 * into the DOM, so instead of scraping it we intercept the `mocha` global at the
 * moment mocha.js assigns it and wrap run() to capture the runner's events.
 *
 * A polling interval would not work here: mocha.js and tests/index.js are both
 * deferred scripts, so they can execute back-to-back within a single task with
 * no timer tick in between.
 */
function instrumentMocha() {
    let inner;
    const patch = (m) => {
        if (!m || typeof m.run !== 'function' || m.__ttPatched) return;
        m.__ttPatched = true;
        const origRun = m.run.bind(m);
        m.run = (fn) => {
            const results = { passes: 0, pending: 0, failures: [] };
            window.__ttResults = results;
            const runner = origRun(fn);
            runner.on('pass', () => results.passes++);
            runner.on('pending', () => results.pending++);
            runner.on('fail', (test, err) => {
                let title;
                try {
                    title = typeof test.fullTitle === 'function' ? test.fullTitle() : test.title;
                } catch {
                    title = '(unknown test)';
                }
                results.failures.push({
                    title: String(title || '(unknown test)'),
                    error: String((err && (err.stack || err.message)) || err)
                });
            });
            runner.on('end', () => {
                window.__ttDone = true;
            });
            return runner;
        };
    };
    Object.defineProperty(window, 'mocha', {
        configurable: true,
        get: () => inner,
        set: (value) => {
            inner = value;
            patch(value);
        }
    });
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));

    // Everything acquired below is released in the finally block, which tolerates
    // any of these still being null -- a Chromium that fails to launch must not
    // leave the http.server orphaned.
    let server = null;
    let browser = null;
    let page = null;
    let exitCode = 0;

    // `pageerror` is an uncaught exception in the page and is fatal. Console
    // errors are not: a resource 404 logs one, and the suite has known-benign
    // ones. Keep the two apart rather than lumping them together.
    const uncaught = [];
    const consoleErrors = [];
    const brokenScripts = [];
    const otherResourceProblems = [];

    try {
        let url = opts.url;
        if (!url) {
            server = await startServer();
            url = `${server.baseUrl}/tests/`;
        }
        if (opts.grep) {
            url += (url.includes('?') ? '&' : '?') + 'grep=' + encodeURIComponent(opts.grep);
        }

        browser = await chromium.launch({ headless: !opts.headed });
        page = await browser.newPage();

        page.on('pageerror', (err) => uncaught.push(String((err && (err.stack || err.message)) || err)));
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        // A network-level failure (connection refused, aborted).
        page.on('requestfailed', (req) => {
            const entry = `${req.url()} (${req.failure()?.errorText ?? 'request failed'})`;
            (isScript(req.url()) ? brokenScripts : otherResourceProblems).push(entry);
        });
        // A 404 is a *successful* response, so requestfailed never fires for it --
        // a missing test file would slip straight through without this.
        page.on('response', (res) => {
            if (res.status() < 400) return;
            const entry = `${res.url()} (HTTP ${res.status()})`;
            (isScript(res.url()) ? brokenScripts : otherResourceProblems).push(entry);
        });

        await page.addInitScript(instrumentMocha);

        console.log(`running ${url}`);
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });

        if (!(await page.evaluate(() => typeof window.mocha !== 'undefined'))) {
            throw new Error(
                'mocha never loaded -- public/tests/index.html pulls it from unpkg.com, ' +
                    'so check network egress to that host.'
            );
        }

        await page.waitForFunction(() => window.__ttDone === true, null, {
            timeout: opts.timeout
        });

        const results = await page.evaluate(() => window.__ttResults);
        for (const failure of results.failures) {
            console.log(`\nFAIL  ${failure.title}\n${failure.error}`);
        }
        const summary = `${results.passes} passing, ${results.failures.length} failing`;
        console.log(`\n${summary}${results.pending ? `, ${results.pending} pending` : ''}`);

        // A clean mocha result means nothing if a test file never made it into the
        // run. Refuse to report a pass we can't stand behind.
        if (brokenScripts.length) {
            throw new Error(
                `${brokenScripts.length} script(s) failed to load, so tests may be silently ` +
                    `missing from this run:\n  ${[...new Set(brokenScripts)].join('\n  ')}`
            );
        }
        if (uncaught.length) {
            throw new Error(
                `uncaught exception(s) in the page, so tests may be silently missing from ` +
                    `this run:\n  ${[...new Set(uncaught)].join('\n  ')}`
            );
        }

        exitCode = results.failures.length > 0 ? 1 : 0;
    } catch (err) {
        console.error(`\nharness error: ${err.message}`);
        // Whatever mocha managed before it wedged is the most useful clue.
        const partial = await page?.evaluate(() => window.__ttResults ?? null).catch(() => null);
        if (partial) {
            console.error(
                `mocha had reached ${partial.passes} passing, ${partial.failures.length} failing`
            );
        }
        exitCode = 2;
    } finally {
        // Warnings only -- these do not change the exit code.
        if (otherResourceProblems.length) {
            console.error('\nnon-script resources that failed to load (not fatal):');
            for (const r of new Set(otherResourceProblems)) console.error(`  ${r}`);
        }
        if (consoleErrors.length) {
            console.error('\nconsole errors (not fatal):');
            for (const e of new Set(consoleErrors)) console.error(`  ${e}`);
        }
        await browser?.close().catch(() => {});
        server?.proc.kill();
    }

    process.exit(exitCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
