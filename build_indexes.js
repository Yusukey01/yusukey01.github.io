#!/usr/bin/env node
/**
 * build_indexes.js
 * ----------------
 * Derives two compact index files from the originals:
 *
 *   data/curriculum.json -> data/curriculum_index.json   (A)
 *   data/previews.json   -> data/anchor_map.json         (B)
 *
 * Both outputs are pure projections: no hand-editing, regenerate
 * after every change to the originals. Run from the repo root,
 * chained with the previews build:
 *
 *   node build_previews.js && node build_indexes.js
 *
 * Verification (site_data_scaling handout v1 §8, items 1-4 and 8)
 * is built in; the script refuses to write output on failure.
 */

const fs = require('fs');
const path = require('path');

const CURRICULUM = process.argv[2] || 'data/curriculum.json';
const PREVIEWS   = process.argv[3] || 'data/previews.json';
const OUT_INDEX  = 'data/curriculum_index.json';
const OUT_ANCHOR = 'data/anchor_map.json';

// Anchors registered in previews.json that legitimately lack a
// T-/D- prefix (pre-existing convention violations, kept until renamed).
const KNOWN_UNPREFIXED = new Set(['example_dual']);

function fail(msg) {
    console.error('build_indexes: FAIL — ' + msg);
    process.exit(1);
}

function main() {
    const c = JSON.parse(fs.readFileSync(CURRICULUM, 'utf-8'));
    const p = JSON.parse(fs.readFileSync(PREVIEWS, 'utf-8'));

    /* ---- A: curriculum_index.json ------------------------------ */
    const pages = [];
    for (const [skey, s] of Object.entries(c.sections)) {
        const base = s.baseUrl || '';
        // join rule (§3-2), hardened: refuse silent corruption
        if (!base.startsWith('Mathematics/')) {
            fail(`baseUrl format changed for section ${skey}: "${base}"`);
        }
        const prefix = base.slice('Mathematics/'.length);
        for (const e of s.parts) {
            pages.push({
                id: e.id,
                url: e.url,
                source: prefix + e.url,
                section: skey,                       // derived from key
                topicGroup: e.topicGroup ?? null,
                prereqs: e.prereqs || [],
                datePublished: e.datePublished ?? null,
                sections: (e.sections || []).map(x => x.id),
            });
        }
    }

    // home/research: separate array, exempt from page field rules
    const nodes = [];
    for (const k of ['homeNode', 'researchNode']) {
        const n = c[k];
        if (n) nodes.push({ id: n.id ?? null, url: n.url ?? null });
    }

    const index = {
        meta: {
            generatedAt: new Date().toISOString().slice(0, 10),
            curriculumVersion: c.meta?.version ?? null,
            curriculumLastUpdated: c.meta?.lastUpdated ?? null,
            pages: pages.length,
        },
        pages,
        nodes,
    };

    /* ---- B: anchor_map.json ------------------------------------ */
    const anchorMap = {};
    const unprefixed = [];
    for (const [k, v] of Object.entries(p)) {
        let kind;
        if (k.startsWith('T-'))      kind = 'T';
        else if (k.startsWith('D-')) kind = 'D';
        else { kind = '?'; unprefixed.push(k); }
        anchorMap[k] = { source: v.source, kind };
    }

    /* ---- Verification (§8: 1, 2, 3, 4) ------------------------- */
    // 1. page count
    const nParts = Object.values(c.sections)
        .reduce((n, s) => n + s.parts.length, 0);
    if (pages.length !== nParts) {
        fail(`page count mismatch: index ${pages.length} vs curriculum ${nParts}`);
    }

    // 2. field completeness (pages only; nodes are exempt by design)
    for (const e of pages) {
        for (const f of ['id', 'url', 'source', 'section',
                         'topicGroup', 'datePublished']) {
            if (e[f] === null || e[f] === undefined) {
                fail(`${e.id}: null field "${f}"`);
            }
        }
        if (!Array.isArray(e.prereqs))  fail(`${e.id}: prereqs not array`);
        if (!Array.isArray(e.sections)) fail(`${e.id}: sections not array`);
    }

    // 3. join health: report misses; the invariant "every miss has
    //    zero anchors" needs the HTML tree, so misses are printed
    //    for local confirmation instead of asserted by count.
    const psources = new Set(Object.values(p).map(v => v.source));
    const misses = pages.filter(e => !psources.has(e.source))
                        .map(e => e.id);

    // 4. anchor count + source agreement
    const pKeys = Object.keys(p);
    if (Object.keys(anchorMap).length !== pKeys.length) {
        fail('anchor key sets differ');
    }
    for (const k of pKeys) {
        if (!(k in anchorMap)) fail(`anchor missing from map: ${k}`);
        if (anchorMap[k].source !== p[k].source) {
            fail(`source mismatch for ${k}`);
        }
    }

    // unprefixed anchors: fail loudly on NEW ones only
    const newUnprefixed = unprefixed.filter(k => !KNOWN_UNPREFIXED.has(k));
    if (newUnprefixed.length) {
        fail(`new unprefixed anchors (DPNCR violation): ${newUnprefixed.join(', ')}`);
    }

    /* ---- Write -------------------------------------------------- */
    fs.writeFileSync(OUT_INDEX,  JSON.stringify(index),     'utf-8');
    fs.writeFileSync(OUT_ANCHOR, JSON.stringify(anchorMap), 'utf-8');

    /* ---- Report (§8 item 8: sizes) ------------------------------ */
    const szC = fs.readFileSync(CURRICULUM, 'utf-8').length;
    const szP = fs.readFileSync(PREVIEWS, 'utf-8').length;
    const szA = fs.readFileSync(OUT_INDEX, 'utf-8').length;
    const szB = fs.readFileSync(OUT_ANCHOR, 'utf-8').length;
    const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
    console.log(`curriculum_index.json : ${szA.toLocaleString()} chars `
        + `(${pct(szA, szC)} of curriculum.json ${szC.toLocaleString()})`);
    console.log(`anchor_map.json       : ${szB.toLocaleString()} chars `
        + `(${pct(szB, szP)} of previews.json   ${szP.toLocaleString()})`);
    console.log(`pages: ${pages.length}  nodes: ${nodes.length}  `
        + `anchors: ${Object.keys(anchorMap).length}`);
    console.log(`join misses (${misses.length}) — confirm each has zero `
        + `anchors in its HTML:`);
    for (const m of misses) console.log(`  ${m}`);
    if (unprefixed.length) {
        console.log(`known unprefixed anchors kept as kind="?": `
            + unprefixed.join(', '));
    }
}

main();
