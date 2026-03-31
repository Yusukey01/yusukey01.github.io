#!/usr/bin/env node
/**
 * build_previews.js
 * -----------------
 * Post-build script for MATH-CS COMPASS.
 * Parses Jekyll _site/ output and extracts .theorem[id] elements
 * into a single /data/previews.json for the ref-preview system.
 *
 * Usage:
 *   node build_previews.js [site-dir]
 *
 * Defaults to ./_site if no argument is given.
 * Output: <site-dir>/data/previews.json
 */

const fs   = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/* ── Configuration ─────────────────────────────────────────── */

// CSS selector for extractable preview targets.
// Currently scoped to .theorem[id] only (definitions & theorems).
// Expand later if needed: '.theorem[id], .proof[id], .insight-box[id]'
const TARGET_SELECTOR = '.theorem[id]';

// Directories to scan inside the site root.
// Matches the MATH-CS COMPASS content folder structure.
const CONTENT_DIRS = [
    'Linear_Algebra',
    'Calculus',
    'Probability',
    'Discrete_Math',
    'ML'
];

/* ── Helpers ───────────────────────────────────────────────── */

/**
 * Recursively collect all .html files under `dir`.
 */
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

/**
 * Strip MathJax rendering artifacts that appear in built HTML
 * but keep the original LaTeX source intact.
 * (In practice, Jekyll+MathJax pages ship raw LaTeX in the HTML;
 *  this is a safety measure for edge cases.)
 */
function cleanInnerHtml(html) {
    return html
        .replace(/\s+/g, ' ')   // collapse whitespace
        .trim();
}

/* ── Main ──────────────────────────────────────────────────── */

function main() {
    const siteDir = process.argv[2] || path.join(process.cwd(), '_site');

    if (!fs.existsSync(siteDir)) {
        console.error(`Error: site directory not found: ${siteDir}`);
        console.error('Run Jekyll build first, or pass the site directory as an argument.');
        process.exit(1);
    }

    const previews = {};   // id → { html, source }
    let fileCount  = 0;
    let blockCount = 0;

    for (const contentDir of CONTENT_DIRS) {
        const fullDir = path.join(siteDir, contentDir);
        const files   = collectHtmlFiles(fullDir);

        for (const filePath of files) {
            fileCount++;
            const html = fs.readFileSync(filePath, 'utf-8');
            const dom  = new JSDOM(html);
            const doc  = dom.window.document;

            // Relative path from site root, used for "View full context →" links
            const relPath = path.relative(siteDir, filePath).replace(/\\/g, '/');

            const targets = doc.querySelectorAll(TARGET_SELECTOR);
            for (const el of targets) {
                const id = el.getAttribute('id');
                if (!id) continue;

                // Warn on duplicate IDs across pages
                if (previews[id]) {
                    console.warn(
                        `Warning: duplicate id="${id}" found in ${relPath}` +
                        ` (already seen in ${previews[id].source}). Overwriting.`
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

    // Write output
    const outDir  = path.join(siteDir, 'data');
    const outFile = path.join(outDir, 'previews.json');

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outFile, JSON.stringify(previews, null, 2), 'utf-8');

    console.log(`build_previews: scanned ${fileCount} files, extracted ${blockCount} blocks.`);
    console.log(`Output: ${outFile}`);
}

main();