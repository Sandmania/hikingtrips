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
 * Requires network: the page pulls mocha/chai/testing-library from unpkg.com.
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
    let server = null;
    let url = opts.url;

    if (!url) {
        server = await startServer();
        url = `${server.baseUrl}/tests/`;
    }
    if (opts.grep) {
        url += (url.includes('?') ? '&' : '?') + 'grep=' + encodeURIComponent(opts.grep);
    }

    const browser = await chromium.launch({ headless: !opts.headed });
    const page = await browser.newPage();

    const pageErrors = [];
    const failedRequests = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && (err.stack || err.message))));
    page.on('console', (msg) => {
        if (msg.type() === 'error') pageErrors.push(msg.text());
    });
    page.on('requestfailed', (req) =>
        failedRequests.push(`${req.url()} (${req.failure()?.errorText ?? 'failed'})`)
    );

    await page.addInitScript(instrumentMocha);

    let exitCode = 0;
    try {
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
        exitCode = results.failures.length > 0 ? 1 : 0;
    } catch (err) {
        console.error(`\nharness error: ${err.message}`);
        // Whatever mocha managed before it wedged is the most useful clue.
        const partial = await page.evaluate(() => window.__ttResults ?? null).catch(() => null);
        if (partial) {
            console.error(
                `mocha had reached ${partial.passes} passing, ${partial.failures.length} failing`
            );
        }
        exitCode = 2;
    } finally {
        if (pageErrors.length) {
            console.error('\npage errors:');
            for (const e of new Set(pageErrors)) console.error(`  ${e}`);
        }
        if (failedRequests.length) {
            console.error('\nfailed requests:');
            for (const r of new Set(failedRequests)) console.error(`  ${r}`);
        }
        await browser.close();
        server?.proc.kill();
    }

    process.exit(exitCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
