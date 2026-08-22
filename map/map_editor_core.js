/**
 * map_editor_core.js
 *
 * React-free core shared by the MATH-CS COMPASS map editors
 * (map_editor.html, and the touch editor). Everything here is either a
 * pure function or a fetch; nothing touches the DOM, React, or editor
 * state. Anything that needs those stays in the editor page.
 *
 * Loaded as a classic script before the Babel-transpiled editor code,
 * which reaches it through the single global below.
 */
(function (global) {
    'use strict';

    // =========================================================================
    // Section identity
    // =========================================================================

const SECTION_COLORS = {
    'HOME': '#888888',
    'RESEARCH': '#f0a500',
    'I': '#1565c0',
    'II': '#2e7d32',
    'III': "#00838f",
    'IV': '#6a1b9a',
    'V': '#ef6c00',
    'EMPTY': '#2a2a2a'
};

const SECTION_NAMES = {
    'HOME': 'Home',
    'RESEARCH': 'Research',
    'I': 'Linear Algebra to Algebraic Foundations',
    'II': 'Calculus to Optimization & Analysis',
    'III': 'Probability & Statistics',
    'IV': 'Discrete Mathematics & Algorithms',
    'V': 'Machine Learning'
};
    // =========================================================================
    // Hex geometry
    // =========================================================================

// --- AUTO-LAYOUT UTILITIES ---

// Hex grid distance (Manhattan distance on hex grid).
// Two entry points, one formula: hexDistance takes raw coordinates
// (the island packer's inner loops have them as scalars and should
// not allocate), hexDist is the tile-object wrapper.
const hexDistance = (q1, r1, q2, r2) => {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
};
const hexDist = (a, b) => hexDistance(a.q, a.r, b.q, b.r);

// Get 6 neighbors for a hex
const getHexNeighbors = (q, r) => [
    {q: q+1, r: r}, {q: q-1, r: r}, {q: q, r: r+1},
    {q: q, r: r-1}, {q: q+1, r: r-1}, {q: q-1, r: r+1}
];

    /**
     * Both directions of the hex <-> pixel map, bound to one hex size.
     * A factory rather than two size-taking functions, so that call sites
     * keep the exact form they had while these closed over the editor's
     * `hexSize`.
     */
    const makeHexGeometry = (hexSize) => {
    const hexToPixel = (q, r) => ({
        x: hexSize * Math.sqrt(3) * (q + r / 2),
        y: hexSize * (3 / 2) * r
    });

    const pixelToHex = (x, y) => {
        const q = (Math.sqrt(3)/3 * x - 1/3 * y) / hexSize;
        const r = (2/3 * y) / hexSize;

        let x1 = q;
        let z1 = r;
        let y1 = -x1 - z1;

        let rx = Math.round(x1);
        let ry = Math.round(y1);
        let rz = Math.round(z1);

        const x_diff = Math.abs(rx - x1);
        const y_diff = Math.abs(ry - y1);
        const z_diff = Math.abs(rz - z1);

        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        } else if (y_diff > z_diff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return { q: rx, r: rz };
    };

        return { hexToPixel, pixelToHex };
    };

const hexPath = (cx, cy, size) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 6) + (i * Math.PI / 3);
        points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return `M${points.join('L')}Z`;
};

    // =========================================================================
    // Curriculum data: load and transform
    // =========================================================================

// A part whose mapCoords is an empty object has not been positioned yet.
const readCoords = (owner) => {
    const mc = owner && owner.mapCoords;
    if (!mc || typeof mc.q !== 'number' || typeof mc.r !== 'number') return null;
    return { q: mc.q, r: mc.r };
};

// Stepping by (dq, dr) = (-1, +2) keeps pixel x fixed and moves down one and a half rows.
const stageUnplacedTiles = (placed, unplaced) => {
    if (unplaced.length === 0 || placed.length === 0) return;
    let r = Math.min(...placed.map(t => t.r));
    let q = Math.round(Math.max(...placed.map(t => t.q + t.r / 2)) + 4 - r / 2);
    unplaced.forEach(t => { t.q = q; t.r = r; q -= 1; r += 2; });
};

// Pure transformation: curriculum.json object -> editor state pieces.
// Shared by the server fetch and by local-file loading.
function processCurriculumData(data) {
    const tiles = [];
    const unplaced = [];    // tiles with an empty mapCoords
    const foundGroups = {}; // To store dynamic topic group names
    const formatGroupName = (id) => id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Add home node
    if (data.homeNode) {
        tiles.push({
            id: data.homeNode.id,
            section: 'HOME',
            title: data.homeNode.title,
            url: data.homeNode.url,
            q: data.homeNode.mapCoords.q,
            r: data.homeNode.mapCoords.r
        });
    }

    // Add research node
    if (data.researchNode) {
        tiles.push({
            id: data.researchNode.id,
            section: 'RESEARCH',
            title: data.researchNode.title,
            url: data.researchNode.url,
            q: data.researchNode.mapCoords.q,
            r: data.researchNode.mapCoords.r,
            isResearch: true
        });
    }

    // Add all parts from all sections
    Object.entries(data.sections).forEach(([sectionId, section]) => {
        section.parts.forEach(part => {
            const tile = {
                id: part.id,
                section: sectionId,
                title: part.title,
                url: section.baseUrl + part.url,
                q: 0, r: 0,   // overwritten below from mapCoords
                prereqs: part.prereqs || [],
                keywords: part.keywords || [],
                topicGroup: part.topicGroup || null
            };
            const c = readCoords(part);
            if (c) { tile.q = c.q; tile.r = c.r; }
            else { tile.isUnplaced = true; unplaced.push(tile); }
            tiles.push(tile);
            // Dynamically collect topic groups
            if (part.topicGroup) {
                foundGroups[part.topicGroup] = formatGroupName(part.topicGroup);
            }
        });

        // Add reserved slots
        if (section.reservedSlots) {
            section.reservedSlots.forEach((slot, index) => {
                tiles.push({
                    id: `${sectionId}-reserved-${index}`,
                    section: sectionId,
                    title: 'Coming Soon',
                    url: null,
                    q: slot.q,
                    r: slot.r,
                    isReserved: true,
                    topicGroup: null
                });
            });
        }
    });

    stageUnplacedTiles(tiles.filter(t => !t.isUnplaced), unplaced);
    // Return rawData and dynamically generated group names as well
    return { tiles, rawData: data, topicGroupNames: foundGroups };
}

/**
 * Load curriculum data from JSON file - same logic as compass.html
 */
async function loadCurriculumData() {
    // Try multiple paths to support different folder structures
    const paths = [
        '../data/curriculum.json',
        './data/curriculum.json',
        '/data/curriculum.json',
        'curriculum.json'
    ];

    let data = null;
    let lastError = null;

    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                data = await response.json();
                console.log(`Loaded curriculum from: ${path}`);
                break;
            }
        } catch (e) {
            lastError = e;
        }
    }

    if (!data) {
        throw new Error(`Could not load curriculum.json. Tried: ${paths.join(', ')}`);
    }

    return processCurriculumData(data);
}

    // =========================================================================
    // Rigid transforms of a selection on the hex lattice
    // =========================================================================

// Rounded cube-coordinate centroid of a set of tiles.
const cubePivotOf = (sel) => {
    let cx = 0, cy = 0, cz = 0;
    sel.forEach(t => { const x = t.q, z = t.r, y = -x - z; cx += x; cy += y; cz += z; });
    cx /= sel.length; cy /= sel.length; cz /= sel.length;
    let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
    const dxx = Math.abs(rx - cx), dyy = Math.abs(ry - cy), dzz = Math.abs(rz - cz);
    if (dxx > dyy && dxx > dzz) rx = -ry - rz;
    else if (dyy > dzz) ry = -rx - rz;
    else rz = -rx - ry;
    return { rx, ry, rz };
};

// Orientation R^rot ∘ M^mir around the pivot, then translate.
// The mirror swaps cube x/y, which in this pixel mapping
// (x ∝ q + r/2) is a horizontal flip through the pivot.
const xformN = (t, piv, rot, mir, delta) => {
    let x = t.q - piv.rx, z = t.r - piv.rz, y = (-t.q - t.r) - piv.ry;
    if (mir & 1) { const tmp = x; x = y; y = tmp; }
    const steps = ((rot % 6) + 6) % 6;
    for (let k = 0; k < steps; k++) {
        const nx = -z, ny = -x, nz = -y;
        x = nx; y = ny; z = nz;
    }
    return { q: x + piv.rx + (delta ? delta.q : 0), r: z + piv.rz + (delta ? delta.r : 0) };
};

    // =========================================================================
    // Island compaction
    // =========================================================================

// --- ISLAND COMPACTION CORE LOGIC ---
// Philosophy: islands (topicGroup clusters) are the layout unit. We do NOT
// globally reshuffle the map (that destroys hand-tuned territory and is
// visually unstable). Instead each island is compacted IN PLACE into a tight
// hub-centered blob, using only cells it already occupies or empty cells —
// it can never overwrite another island. Island PLACEMENT (where a blob sits)
// stays a manual, aesthetic decision via drag.

// Compact a single island's member tiles into a tight blob near their current
// centroid. `forbidden` = set of "q,r" cells owned by OTHER tiles (off-limits).
const compactIslandTiles = (members, forbidden) => {
    if (members.length <= 1) return new Map(members.map(m => [m.id, { q: m.q, r: m.r }]));

    const memById = new Map(members.map(m => [m.id, m]));
    const inIsland = id => memById.has(id);
    const free = (q, r) => !forbidden.has(`${q},${r}`);

    // Current centroid (rounded to a hex via cube rounding through pixelToHex-free approx)
    const cq = Math.round(members.reduce((s, m) => s + m.q, 0) / members.length);
    const cr = Math.round(members.reduce((s, m) => s + m.r, 0) / members.length);

    // Hub = most-referenced tile within the island (highest in-island in-degree),
    // tie-broken by fewest own in-island prereqs (closest to a root).
    const indeg = {};
    members.forEach(m => (m.prereqs || []).forEach(p => { if (inIsland(p)) indeg[p] = (indeg[p] || 0) + 1; }));
    const ownPre = m => (m.prereqs || []).filter(inIsland).length;
    const hub = members.reduce((best, m) => {
        const a = [indeg[m.id] || 0, -ownPre(m)];
        const b = [indeg[best.id] || 0, -ownPre(best)];
        return (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) ? m : best;
    }, members[0]);

    // BFS order over the island's undirected prereq graph, starting from hub.
    const adj = {};
    members.forEach(m => { adj[m.id] = adj[m.id] || new Set(); });
    members.forEach(m => (m.prereqs || []).forEach(p => {
        if (inIsland(p)) { adj[m.id].add(p); adj[p].add(m.id); }
    }));
    const order = [hub.id];
    const seen = new Set([hub.id]);
    const queue = [hub.id];
    while (queue.length) {
        const c = queue.shift();
        [...adj[c]].sort().forEach(nb => { if (!seen.has(nb)) { seen.add(nb); queue.push(nb); order.push(nb); } });
    }
    members.forEach(m => { if (!seen.has(m.id)) order.push(m.id); });

    // Place hub at centroid if free, else nearest free cell.
    const pos = new Map();
    const occ = new Set();
    let hubCell = null;
    if (free(cq, cr)) hubCell = { q: cq, r: cr };
    else {
        for (let rad = 1; rad <= 10 && !hubCell; rad++) {
            const ring = [];
            for (let q = cq - rad; q <= cq + rad; q++)
                for (let r = cr - rad; r <= cr + rad; r++)
                    if (hexDistance(cq, cr, q, r) === rad && free(q, r)) ring.push({ q, r });
            if (ring.length) hubCell = ring.reduce((a, b) =>
                hexDistance(cq, cr, a.q, a.r) <= hexDistance(cq, cr, b.q, b.r) ? a : b);
        }
    }
    if (!hubCell) hubCell = { q: cq, r: cr }; // last resort
    pos.set(hub.id, hubCell);
    occ.add(`${hubCell.q},${hubCell.r}`);

    // Greedily place remaining members: hug the blob, fill concavities,
    // sit adjacent to in-island prereqs.
    for (const id of order) {
        if (id === hub.id) continue;
        const tile = memById.get(id);
        const cands = new Set();
        occ.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            getHexNeighbors(q, r).forEach(n => {
                const nk = `${n.q},${n.r}`;
                if (!occ.has(nk) && free(n.q, n.r)) cands.add(nk);
            });
        });
        let best = null, bestScore = -Infinity;
        cands.forEach(nk => {
            const [q, r] = nk.split(',').map(Number);
            let sc = -hexDistance(hubCell.q, hubCell.r, q, r) * 4;
            // reward cells that touch many already-placed island cells (compactness)
            getHexNeighbors(q, r).forEach(n => { if (occ.has(`${n.q},${n.r}`)) sc += 3; });
            (tile.prereqs || []).forEach(p => {
                if (pos.has(p)) {
                    const pc = pos.get(p);
                    const dd = hexDistance(q, r, pc.q, pc.r);
                    sc += dd === 1 ? 25 : -dd * 4;
                }
            });
            if (sc > bestScore) { bestScore = sc; best = { q, r }; }
        });
        if (!best) { // no free adjacent cell anywhere — leave in place
            best = { q: tile.q, r: tile.r };
        }
        pos.set(id, best);
        occ.add(`${best.q},${best.r}`);
    }
    return pos;
};

    // =========================================================================
    // Serialization back to curriculum.json
    // =========================================================================

/**
 * Custom JSON serializer for curriculum.json.
 *   - Array of all-strings  -> grouped 5 per line (e.g. "keywords")
 *   - Array of shallow all-primitive objects -> one object per line
 *     (e.g. tile "sections": {id, name})
 *   - Everything else -> standard 2-space pretty printing.
 */
const formatCurriculum = (data) => {
    const IND = '  ';
    const KEYWORDS_PER_LINE = 5;
    const isPrimitive = v => v === null || typeof v !== 'object';
    const isShallowObject = v =>
        v && typeof v === 'object' && !Array.isArray(v) &&
        Object.values(v).every(isPrimitive);

    const fmt = (value, depth, key) => {
        const pad = IND.repeat(depth);
        const padIn = IND.repeat(depth + 1);

        // mapCoords: always inline as { "q": .., "r": .. }
        if (key === 'mapCoords' && isShallowObject(value)) {
            const inner = Object.entries(value)
                .map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v))
                .join(', ');
            return '{ ' + inner + ' }';
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            if (value.every(v => typeof v === 'string')) {
                const lines = [];
                for (let i = 0; i < value.length; i += KEYWORDS_PER_LINE) {
                    const chunk = value.slice(i, i + KEYWORDS_PER_LINE)
                        .map(s => JSON.stringify(s));
                    lines.push(padIn + chunk.join(', '));
                }
                return '[\n' + lines.join(',\n') + '\n' + pad + ']';
            }
            if (value.every(isShallowObject)) {
                const lines = value.map(obj => {
                    const inner = Object.entries(obj)
                        .map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v))
                        .join(', ');
                    return padIn + '{ ' + inner + ' }';
                });
                return '[\n' + lines.join(',\n') + '\n' + pad + ']';
            }
            const items = value.map(v => padIn + fmt(v, depth + 1));
            return '[\n' + items.join(',\n') + '\n' + pad + ']';
        }

        if (value && typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 0) return '{}';
            const items = keys.map(k =>
                padIn + JSON.stringify(k) + ': ' + fmt(value[k], depth + 1, k));
            return '{\n' + items.join(',\n') + '\n' + pad + '}';
        }

        return JSON.stringify(value);
    };

    return fmt(data, 0);
};

    /**
     * Rebuild a curriculum.json object from the editor's tile array.
     * Pure: `originalData` is deep-copied, never mutated. Unplaced tiles
     * (empty mapCoords in the source) are skipped, so they stay
     * unpositioned until they have actually been placed.
     */
    const buildExportData = (originalData, tiles) => {
        const exportData = JSON.parse(JSON.stringify(originalData));
        if (exportData.meta) {
            exportData.meta.lastUpdated = new Date().toISOString().slice(0, 10);
        }

        // Reset all reservedSlots — will rebuild from current tiles
        Object.keys(exportData.sections).forEach(key => {
            exportData.sections[key].reservedSlots = [];
        });

        tiles.forEach(tile => { 
            if (tile.isUnplaced) {
                return;
            } else if (tile.section === 'HOME') {
                exportData.homeNode.mapCoords = { q: tile.q, r: tile.r };
            } else if (tile.section === 'RESEARCH') {
                exportData.researchNode.mapCoords = { q: tile.q, r: tile.r };
            } else if (tile.isReserved) {
                const section = exportData.sections[tile.section];
                if (section) {
                    section.reservedSlots.push({ q: tile.q, r: tile.r });
                }
            } else {
                const section = exportData.sections[tile.section];
                if (section && section.parts) {
                    const part = section.parts.find(p => p.id === tile.id);
                    if (part) {
                        part.mapCoords = { q: tile.q, r: tile.r };
                        part.topicGroup = tile.topicGroup || null;
                        part.prereqs = tile.prereqs || [];
                    }
                }
            }
        });

        return exportData;
    };

    global.MapEditorCore = {
        SECTION_COLORS, SECTION_NAMES,
        hexDistance, hexDist, getHexNeighbors,
        makeHexGeometry, hexPath,
        readCoords, stageUnplacedTiles,
        processCurriculumData, loadCurriculumData,
        cubePivotOf, xformN,
        compactIslandTiles,
        formatCurriculum, buildExportData
    };
})(typeof window !== 'undefined' ? window : this);
