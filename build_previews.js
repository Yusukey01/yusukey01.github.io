#!/usr/bin/env node
/**
 * build_previews.js
 * -----------------
 * Extracts .theorem[id] elements from HTML content pages
 * and compiles them into data/previews.json for the ref-preview system.
 *
 * Usage (from project root):
 *   node build_previews.js
 *
 * Reads from: Mathematics/{Calculus,Probability,...}/*.html
 * Writes to:  data/previews.json
 */

const fs   = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/* ── Configuration ─────────────────────────────────────────── */

const TARGET_SELECTOR = '.theorem[id]';

const CONTENT_DIRS = [
    'Mathematics/Linear_algebra',
    'Mathematics/Calculus',
    'Mathematics/Probability',
    'Mathematics/Discrete',
    'Mathematics/Machine_learning'
];

/* ── Helpers ───────────────────────────────────────────────── */

function collectHtmlFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(collectHtmlFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            results.push(full);
        }
    }
    return results;
}

function cleanInnerHtml(html) {
    return html
        .replace(/\s+/g, ' ')
        .trim();
}

/* ── Main ──────────────────────────────────────────────────── */

function main() {
    const rootDir = process.cwd();

    const previews = {};
    let fileCount  = 0;
    let blockCount = 0;

    for (const contentDir of CONTENT_DIRS) {
        const fullDir = path.join(rootDir, contentDir);
        const files   = collectHtmlFiles(fullDir);

        for (const filePath of files) {
            fileCount++;
            const html = fs.readFileSync(filePath, 'utf-8');
            const dom  = new JSDOM(html);
            const doc  = dom.window.document;

            // Source path relative to Mathematics/ for "View full context" links
            // e.g. "Calculus/lp_spaces.html"
            const relPath = path.relative(
                path.join(rootDir, 'Mathematics'),
                filePath
            ).replace(/\\/g, '/');

            const targets = doc.querySelectorAll(TARGET_SELECTOR);
            for (const el of targets) {
                const id = el.getAttribute('id');
                if (!id) continue;

                if (previews[id]) {
                    console.warn(
                        `Warning: duplicate id="${id}" in ${relPath}` +
                        ` (already in ${previews[id].source}). Overwriting.`
                    );
                }

                previews[id] = {
                    html:   cleanInnerHtml(el.innerHTML),
                    source: relPath
                };
                blockCount++;
            }
        }
    }

    // Write to data/previews.json in project root
    const outDir  = path.join(rootDir, 'data');
    const outFile = path.join(outDir, 'previews.json');

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outFile, JSON.stringify(previews, null, 2), 'utf-8');

    console.log(`build_previews: scanned ${fileCount} files, extracted ${blockCount} blocks.`);
    console.log(`Output: ${outFile}`);
}

main();