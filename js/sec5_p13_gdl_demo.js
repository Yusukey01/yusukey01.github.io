// sec5_p13_gdl_demo.js
// Permutation Equivariance Visualizer — MATH-CS COMPASS, ml-13
//
// Architecture comparison demo showing that GNN and Transformer outputs
// reorder consistently when node labels are permuted, while MLP outputs do not.
//
// Built from six modules:
//   1. Math core            — pure linear algebra and forward-pass primitives
//   2. Graph state          — topology, layout, central state object
//   3. Architecture         — weight management, forward pass orchestration
//   4. Canvas rendering     — visual output
//   5. UI controls panel    — DOM and CSS
//   6. Wiring               — entry point, event handlers, animation


// ====== MODULE 1 ======
// sec5_p13_gdl_demo.js — Module 1: Math core (pure functions)
// Mathematical primitives for permutation-equivariance demonstration.
// All functions are pure; no DOM, no global state.

// ============================================================
// Linear algebra primitives
// ============================================================

/**
 * Matrix-vector product: returns M @ v.
 * @param {number[][]} M  n×n matrix as array of rows
 * @param {number[]}   v  length-n vector
 * @returns {number[]}    length-n vector
 */
function matVec(M, v) {
    const n = v.length;
    const out = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += M[i][j] * v[j];
        out[i] = s;
    }
    return out;
}

/**
 * Matrix-matrix product: returns A @ B.
 * @param {number[][]} A
 * @param {number[][]} B
 * @returns {number[][]}
 */
function matMat(A, B) {
    const n = A.length;
    const m = B[0].length;
    const k = B.length;
    const C = Array.from({length: n}, () => new Array(m).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            let s = 0;
            for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
            C[i][j] = s;
        }
    }
    return C;
}

/**
 * L2 norm of a vector.
 */
function l2norm(v) {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    return Math.sqrt(s);
}

/**
 * Element-wise tanh activation.
 */
function tanhVec(v) {
    return v.map(Math.tanh);
}

// ============================================================
// Graph normalization (Kipf-Welling)
// ============================================================

/**
 * Compute Â = (D+I)^{-1/2} (A+I) (D+I)^{-1/2}.
 * Symmetric self-loop normalized adjacency from Kipf & Welling 2017.
 * @param {number[][]} A  symmetric 0/1 adjacency matrix (no self-loops on input)
 * @returns {number[][]}  Â as n×n matrix
 */
function normalizeAdjacency(A) {
    const n = A.length;
    // A_tilde = A + I
    const A_tilde = A.map((row, i) =>
        row.map((v, j) => v + (i === j ? 1 : 0))
    );
    // degree of A_tilde
    const d = A_tilde.map(row => row.reduce((a, b) => a + b, 0));
    // D^{-1/2}
    const dInvSqrt = d.map(di => di > 0 ? 1 / Math.sqrt(di) : 0);
    // Â_{ij} = (1/sqrt(d_i)) * A_tilde_{ij} * (1/sqrt(d_j))
    const Ahat = Array.from({length: n}, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            Ahat[i][j] = dInvSqrt[i] * A_tilde[i][j] * dInvSqrt[j];
        }
    }
    return Ahat;
}

/**
 * Construct the complete-graph adjacency on n nodes (no self-loops).
 * Used for the Transformer (no PE) view: every token attends to every other.
 */
function completeAdjacency(n) {
    const A = Array.from({length: n}, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j) A[i][j] = 1;
        }
    }
    return A;
}

// ============================================================
// Forward passes
// ============================================================

/**
 * Apply one GCN layer: h_out = tanh(w * (Â h) + b).
 * Scalar features per node; w, b are scalars, shared across all nodes.
 * This makes permutation equivariance hold exactly (no per-node parameters).
 *
 * @param {number[]}   h     length-n feature vector
 * @param {number[][]} Ahat  normalized adjacency (or Â for any propagation matrix)
 * @param {number}     w     scalar weight
 * @param {number}     b     scalar bias
 * @returns {number[]} length-n updated features
 */
function applyGCNLayer(h, Ahat, w, b) {
    const Ah = matVec(Ahat, h);
    const out = Ah.map(x => Math.tanh(w * x + b));
    return out;
}

/**
 * Apply a stack of GCN layers (or Transformer layers — same operator with different Â).
 * @param {number[]}   h0     initial features
 * @param {number[][]} Ahat
 * @param {Array<{w:number,b:number}>} layers
 * @returns {number[]}        final features after all layers
 */
function forwardGNN(h0, Ahat, layers) {
    let h = h0.slice();
    for (const layer of layers) {
        h = applyGCNLayer(h, Ahat, layer.w, layer.b);
    }
    return h;
}

/**
 * Apply one MLP layer: h_out = tanh(W h + b).
 * Dense weight matrix W ∈ R^{n×n}, dense bias b ∈ R^n.
 * No parameter sharing across nodes → not permutation equivariant.
 *
 * @param {number[]}   h
 * @param {number[][]} W   n×n
 * @param {number[]}   b   length n
 * @returns {number[]}
 */
function applyMLPLayer(h, W, b) {
    const Wh = matVec(W, h);
    const out = Wh.map((x, i) => Math.tanh(x + b[i]));
    return out;
}

/**
 * Apply a stack of MLP layers.
 * @param {number[]} h0
 * @param {Array<{W:number[][], b:number[]}>} layers
 */
function forwardMLP(h0, layers) {
    let h = h0.slice();
    for (const layer of layers) {
        h = applyMLPLayer(h, layer.W, layer.b);
    }
    return h;
}

// ============================================================
// Permutations
// ============================================================

/**
 * Apply a permutation π to a vector v: returns w with w[i] = v[π(i)].
 * @param {number[]} v
 * @param {number[]} perm  permutation array, perm[i] = π(i)
 */
function permuteVector(v, perm) {
    return perm.map(pi => v[pi]);
}

/**
 * Apply a permutation π to an adjacency matrix A: returns Â with Â[i][j] = A[π(i)][π(j)].
 * Equivalent to P A P^T where P is the permutation matrix of π.
 */
function permuteAdjacency(A, perm) {
    const n = perm.length;
    const out = Array.from({length: n}, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            out[i][j] = A[perm[i]][perm[j]];
        }
    }
    return out;
}

/**
 * Generate a random permutation of length n using Fisher-Yates with a seedable RNG.
 * The seed is mandatory to make tests reproducible; in the demo, the user clicks Shuffle
 * and the function is called with a fresh time-based seed.
 */
function randomPermutation(n, rng) {
    const arr = Array.from({length: n}, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Identity permutation, useful for unit tests.
 */
function identityPermutation(n) {
    return Array.from({length: n}, (_, i) => i);
}

// ============================================================
// Equivariance test
// ============================================================

/**
 * Equivariance error for a graph-aware architecture (GNN, Transformer):
 *   ‖ f(Ph, PAP^T) − P f(h, A) ‖_2
 * Returns 0 (up to FP error) iff f is S_n-equivariant.
 *
 * @param {function(number[], number[][]): number[]} f  forward function (h, A) → h_out
 * @param {number[]}   h
 * @param {number[][]} A     un-normalized adjacency
 * @param {number[]}   perm
 */
function equivarianceErrorGraph(f, h, A, perm) {
    // RHS: P f(h, A)
    const fOriginal = f(h, A);
    const rhs = permuteVector(fOriginal, perm);
    // LHS: f(Ph, PAP^T)
    const hPerm = permuteVector(h, perm);
    const APerm = permuteAdjacency(A, perm);
    const lhs = f(hPerm, APerm);
    // ‖ lhs − rhs ‖
    const diff = lhs.map((x, i) => x - rhs[i]);
    return l2norm(diff);
}

/**
 * Equivariance error for an architecture with no graph input (MLP):
 *   ‖ f(Ph) − P f(h) ‖_2
 * Generally non-zero for dense MLPs.
 */
function equivarianceErrorPlain(f, h, perm) {
    const fOriginal = f(h);
    const rhs = permuteVector(fOriginal, perm);
    const hPerm = permuteVector(h, perm);
    const lhs = f(hPerm);
    const diff = lhs.map((x, i) => x - rhs[i]);
    return l2norm(diff);
}

// ============================================================
// Seedable RNG (mulberry32)
// ============================================================

/**
 * A small deterministic PRNG. Used for fixed-seed weight initialization
 * so that Shuffle does not regenerate the model.
 */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Initialize a stack of GNN layers with fixed seed.
 * Each layer is {w, b} with w ~ U(-1, 1), b ~ U(-0.3, 0.3).
 */
function initGNNWeights(numLayers, seed) {
    const rng = mulberry32(seed);
    const layers = [];
    for (let i = 0; i < numLayers; i++) {
        layers.push({
            w: 2 * rng() - 1,
            b: 0.6 * rng() - 0.3,
        });
    }
    return layers;
}

/**
 * Initialize a stack of MLP layers with fixed seed.
 * W_{ij} ~ U(-1/sqrt(n), 1/sqrt(n)) (Xavier-like for tanh), b_i ~ U(-0.3, 0.3).
 */
function initMLPWeights(numLayers, n, seed) {
    const rng = mulberry32(seed);
    const scale = 1 / Math.sqrt(n);
    const layers = [];
    for (let l = 0; l < numLayers; l++) {
        const W = Array.from({length: n}, () =>
            Array.from({length: n}, () => 2 * scale * (rng() - 0.5))
        );
        const b = Array.from({length: n}, () => 0.6 * rng() - 0.3);
        layers.push({W, b});
    }
    return layers;
}

// ============================================================
// Unit tests (run on script load in dev; remove or guard for prod)
// ============================================================



// Run tests on load (dev mode). Comment out or guard before deploying to production.

// ====== MODULE 2 ======
// sec5_p13_gdl_demo.js — Module 2: Graph state & layout
// Defines initial graph topology, node positions, and the central state object.
// Depends on Module 1 (mulberry32, identityPermutation).

// ============================================================
// Graph topology construction
// ============================================================

/**
 * Build a "small-world-ish" graph on n nodes:
 *   • Each node connects to its 2 immediate ring neighbors (cycle backbone).
 *   • Plus a few randomly added long-range edges, controlled by the seed.
 * The result is structured enough that the visualization is readable, and
 * irregular enough that automorphisms beyond cyclic rotation are unlikely —
 * which makes the equivariance demonstration visually meaningful (shuffles
 * produce visibly different vertex layouts but mathematically identical outputs).
 *
 * @param {number} n          number of nodes
 * @param {number} numExtras  number of random extra edges to add
 * @param {number} seed       RNG seed
 * @returns {{edges: number[][], A: number[][]}}
 */
function buildSmallWorldGraph(n, numExtras, seed) {
    const rng = mulberry32(seed);
    const edgeSet = new Set();  // canonical "i<j" string keys to avoid duplicates

    const addEdge = (i, j) => {
        if (i === j) return;
        const a = Math.min(i, j), b = Math.max(i, j);
        edgeSet.add(`${a},${b}`);
    };

    // Ring backbone: 0-1, 1-2, ..., (n-1)-0
    for (let i = 0; i < n; i++) {
        addEdge(i, (i + 1) % n);
    }

    // Random long-range edges (chord-like)
    let attempts = 0;
    while (edgeSet.size < n + numExtras && attempts < 100) {
        const i = Math.floor(rng() * n);
        const j = Math.floor(rng() * n);
        addEdge(i, j);
        attempts++;
    }

    // Convert to edge list
    const edges = Array.from(edgeSet).map(k => k.split(',').map(Number));

    // Build symmetric adjacency matrix
    const A = Array.from({length: n}, () => new Array(n).fill(0));
    for (const [i, j] of edges) {
        A[i][j] = 1;
        A[j][i] = 1;
    }

    return {edges, A};
}

// ============================================================
// Node layout (visual positions on canvas)
// ============================================================

/**
 * Place n nodes on a circle of radius r centered at (cx, cy),
 * with a small per-node radial perturbation so the layout is not perfectly symmetric.
 * Perfect symmetry would make the visual shuffle effect less striking.
 *
 * @param {number} n
 * @param {number} cx     center x
 * @param {number} cy     center y
 * @param {number} r      base radius
 * @param {number} jitter perturbation magnitude (fraction of r)
 * @param {number} seed
 * @returns {Array<{x:number, y:number}>}
 */
function buildCircleLayout(n, cx, cy, r, jitter, seed) {
    const rng = mulberry32(seed);
    const positions = [];
    for (let i = 0; i < n; i++) {
        const theta = (2 * Math.PI * i) / n - Math.PI / 2;  // start at top
        const dr = r * (1 + jitter * (2 * rng() - 1));
        positions.push({
            x: cx + dr * Math.cos(theta),
            y: cy + dr * Math.sin(theta),
        });
    }
    return positions;
}

// ============================================================
// Initial features
// ============================================================

/**
 * Initialize node features ~ U(-1, 1) with a fixed seed.
 * Using a fixed seed (not Math.random()) is essential: Shuffle must NOT
 * regenerate the underlying features, only relabel them.
 */
function initNodeFeatures(n, seed) {
    const rng = mulberry32(seed);
    return Array.from({length: n}, () => 2 * rng() - 1);
}

// ============================================================
// Central state object
// ============================================================

/**
 * Construct the demo's central state. All mutable demo state lives here;
 * UI handlers and rendering read/write this object.
 *
 * Note on naming: `currentH` represents the features as the user sees them
 * AFTER the active permutation has been applied to the original `originalH`.
 * The underlying mathematical content is preserved; only the labelling changes.
 */
function createDemoState(config) {
    const n = config.n;

    // Topology and visual layout
    const {edges, A} = buildSmallWorldGraph(n, config.extraEdges, config.graphSeed);
    const positions = buildCircleLayout(
        n, config.cx, config.cy, config.radius, config.jitter, config.layoutSeed
    );
    const originalH = initNodeFeatures(n, config.featureSeed);

    return {
        // Topology
        n,
        edges,
        A,                   // current adjacency matrix (changes under permutation)
        originalA: A.map(row => row.slice()),  // deep copy of pristine A
        positions,           // visual positions, do not change under permutation

        // Features
        originalH: originalH.slice(),    // pristine initial features
        currentH: originalH.slice(),     // features as currently labelled

        // Permutation state
        perm: identityPermutation(n),    // π such that the i-th visual slot now holds originalH[perm[i]]
        isPermuted: false,

        // Architecture configuration (mutated by UI)
        architecture: 'GNN',             // 'MLP' | 'Transformer' | 'GNN'
        numLayers: 2,

        // Forward-pass cache (filled in by Module 3)
        layerHistory: [],                // h^{(0)}, h^{(1)}, ..., h^{(L)} along the current pass
        equivarianceError: 0,            // most recent equivariance test result
    };
}

// ============================================================
// State mutations
// ============================================================

/**
 * Apply a permutation π to the demo state.
 * After this call, the i-th visual slot holds the feature originalH[π(i)],
 * and the adjacency seen at slot i is the row-and-column π-permutation of originalA.
 *
 * Mathematically: currentH ← P · originalH,  A ← P A P^T  where P_{ij} = δ_{i, π(j)}.
 *
 * @param {object}    state
 * @param {number[]}  perm   length-n permutation array
 */
function applyPermutationToState(state, perm) {
    state.perm = perm.slice();
    state.currentH = permuteVector(state.originalH, perm);
    state.A = permuteAdjacency(state.originalA, perm);
    state.isPermuted = !perm.every((p, i) => p === i);
}

/**
 * Reset the state to identity permutation.
 */
function resetPermutation(state) {
    applyPermutationToState(state, identityPermutation(state.n));
}

// ============================================================
// Default configuration
// ============================================================

const DEFAULT_DEMO_CONFIG = {
    n: 10,
    extraEdges: 5,        // 10 ring + 5 chord = 15 edges total
    graphSeed: 42,
    layoutSeed: 7,
    featureSeed: 23,
    cx: 350,              // canvas center x
    cy: 250,              // canvas center y
    radius: 180,          // ring radius
    jitter: 0.08,         // 8% radial perturbation
};

// ============================================================
// Module 2 unit tests
// ============================================================



// ====== MODULE 4 ======
// sec5_p13_gdl_demo.js — Module 4: Canvas rendering
// Pure rendering: takes state and draws to canvas. No state mutation.
// Depends on Module 1 (matVec, etc.) and Module 2 (state object shape).

// ============================================================
// Color palette
// ============================================================

const PALETTE = {
    bg:           '#0b0e14',
    nodeStroke:   'rgba(255, 255, 255, 0.85)',
    nodeStrokeShuffled: 'rgba(255, 200, 100, 0.95)',  // amber when permuted
    edgeGNN:      'rgba(0, 255, 255, 0.55)',          // cyan, solid
    edgeTransformer: 'rgba(0, 255, 255, 0.10)',       // cyan, very faint
    label:        '#e8eaed',
    labelDim:     'rgba(255, 255, 255, 0.45)',
    layerBadge:   '#00ffff',
    okGreen:      '#26c6da',
    failRed:      '#ff5252',
};

/**
 * Map a feature value h ∈ [-1, 1] to a hex-like color string.
 * Diverging palette: blue (h=-1) → midtone (h=0) → red (h=+1).
 * Uses HSL space for smooth interpolation.
 */
function featureColor(h) {
    // Clamp
    const x = Math.max(-1, Math.min(1, h));
    if (x >= 0) {
        // 0 → cyan-grey (#5b6378-ish), 1 → red-orange (#ff6b6b)
        const t = x;  // 0..1
        const r = Math.round(91  + (255 - 91)  * t);
        const g = Math.round(99  + (107 - 99)  * t);
        const b = Math.round(120 + (107 - 120) * t);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        const t = -x;  // 0..1
        const r = Math.round(91  + (77  - 91)  * t);
        const g = Math.round(99  + (171 - 99)  * t);
        const b = Math.round(120 + (247 - 120) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// ============================================================
// Canvas rendering primitives
// ============================================================

function clearCanvas(ctx, W, H) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);
}

function drawEdges(ctx, state) {
    const arch = state.architecture;
    if (arch === 'MLP') return;  // MLP: no edges drawn

    if (arch === 'Transformer') {
        // Complete graph: faint lines between every pair
        ctx.strokeStyle = PALETTE.edgeTransformer;
        ctx.lineWidth = 1;
        for (let i = 0; i < state.n; i++) {
            for (let j = i + 1; j < state.n; j++) {
                const p = state.positions[i];
                const q = state.positions[j];
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
            }
        }
        return;
    }

    // GNN: actual graph edges. Draw using the CURRENT (possibly permuted) adjacency,
    // because the visual node at slot i now corresponds to row i of state.A.
    ctx.strokeStyle = PALETTE.edgeGNN;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < state.n; i++) {
        for (let j = i + 1; j < state.n; j++) {
            if (state.A[i][j]) {
                const p = state.positions[i];
                const q = state.positions[j];
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
            }
        }
    }
}

function drawNodes(ctx, state, displayedH) {
    // displayedH: feature values to render (typically state.layerHistory[currentLayer])
    const r = 18;
    const strokeColor = state.isPermuted ? PALETTE.nodeStrokeShuffled : PALETTE.nodeStroke;

    for (let i = 0; i < state.n; i++) {
        const p = state.positions[i];
        const h = displayedH[i];

        // Outer halo (subtle glow)
        const grad = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, r * 1.6);
        grad.addColorStop(0, featureColor(h));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.6, 0, 2 * Math.PI);
        ctx.fill();

        // Solid node
        ctx.fillStyle = featureColor(h);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
        ctx.fill();

        // Stroke
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = state.isPermuted ? 2 : 1.4;
        ctx.stroke();
    }
}

function drawNodeLabels(ctx, state) {
    ctx.font = 'bold 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < state.n; i++) {
        const p = state.positions[i];
        // The slot index i is the "visual position".
        // The original-feature index that currently sits here is state.perm[i].
        // We display the original index in white so the user can track where each
        // original feature has moved to under the shuffle.
        const origIdx = state.perm[i];
        ctx.fillStyle = PALETTE.label;
        ctx.fillText(String(origIdx), p.x, p.y);
    }
}

function drawLayerBadge(ctx, layerIdx, totalLayers, W) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(W - 130, 14, 116, 28);
    ctx.strokeStyle = PALETTE.layerBadge;
    ctx.lineWidth = 1;
    ctx.strokeRect(W - 130, 14, 116, 28);

    ctx.font = '600 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillStyle = PALETTE.layerBadge;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (layerIdx === 0) {
        ctx.fillText('LAYER 0 (input)', W - 72, 28);
    } else {
        ctx.fillText(`LAYER ${layerIdx} / ${totalLayers}`, W - 72, 28);
    }
}

function drawArchitectureBadge(ctx, arch) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(14, 14, 120, 28);
    ctx.strokeStyle = PALETTE.layerBadge;
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, 120, 28);

    ctx.font = '600 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillStyle = PALETTE.layerBadge;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(arch.toUpperCase(), 74, 28);
}

function drawShuffleIndicator(ctx, state, W) {
    if (!state.isPermuted) return;
    ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
    ctx.fillRect(W / 2 - 80, 14, 160, 28);
    ctx.strokeStyle = PALETTE.nodeStrokeShuffled;
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 80, 14, 160, 28);

    ctx.font = '600 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillStyle = PALETTE.nodeStrokeShuffled;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NODE LABELS SHUFFLED', W / 2, 28);
}

// ============================================================
// Top-level render function
// ============================================================

/**
 * Render the demo state to the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state                       Module 2 state object
 * @param {number[]} displayedH                features to display at each node
 *                                              (typically state.layerHistory[currentLayer])
 * @param {number} currentLayer                index into layerHistory being shown
 * @param {number} totalLayers                 number of layers in current architecture
 * @param {number} W                           canvas width
 * @param {number} H                           canvas height
 */
function renderDemo(ctx, state, displayedH, currentLayer, totalLayers, W, H) {
    clearCanvas(ctx, W, H);
    drawEdges(ctx, state);
    drawNodes(ctx, state, displayedH);
    drawNodeLabels(ctx, state);
    drawArchitectureBadge(ctx, state.architecture);
    drawLayerBadge(ctx, currentLayer, totalLayers, W);
    drawShuffleIndicator(ctx, state, W);
}

// ============================================================
// Animation utilities
// ============================================================

/**
 * Linearly interpolate two feature vectors.
 *   result = (1 - t) * a + t * b
 */
function lerpFeatures(a, b, t) {
    return a.map((ai, i) => (1 - t) * ai + t * b[i]);
}

/**
 * Smoothstep easing: smooth begin/end.
 */
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

// ============================================================
// Module 4 unit tests
// ============================================================
// (Pure rendering is hard to unit-test without a canvas. Instead, we sanity-check
// the pure helper functions: featureColor and lerpFeatures.)



// ====== MODULE 3 ======
// sec5_p13_gdl_demo.js — Module 3: Architecture switching
// Manages weight initialization per (architecture, numLayers) combination,
// runs forward passes, and computes equivariance errors.
// Depends on Module 1 (forward funcs, weight init) and Module 2 (state shape).

// ============================================================
// Weight cache management
// ============================================================

/**
 * Fixed seeds per architecture so that switching architectures gives
 * deterministic, reproducible weight sets. Different per arch so the
 * three forward passes look genuinely different.
 */
const ARCH_SEEDS = {
    GNN:         101,
    Transformer: 202,
    MLP:         303,
};

/**
 * Lazy weight initialization: returns cached weights for (arch, numLayers),
 * generating them on first request and storing on state.weightCache.
 *
 * @param {object} state                 demo state
 * @param {string} arch                  'GNN' | 'Transformer' | 'MLP'
 * @param {number} numLayers
 * @returns {Array}                      layer parameter list
 */
function getWeights(state, arch, numLayers) {
    if (!state.weightCache) state.weightCache = {};
    if (!state.weightCache[arch]) state.weightCache[arch] = {};
    if (state.weightCache[arch][numLayers]) {
        return state.weightCache[arch][numLayers];
    }

    const seed = ARCH_SEEDS[arch] + numLayers;  // distinct seed per (arch, depth)
    let layers;
    if (arch === 'GNN' || arch === 'Transformer') {
        layers = initGNNWeights(numLayers, seed);
    } else if (arch === 'MLP') {
        layers = initMLPWeights(numLayers, state.n, seed);
    } else {
        throw new Error(`Unknown architecture: ${arch}`);
    }

    state.weightCache[arch][numLayers] = layers;
    return layers;
}

// ============================================================
// Forward pass orchestration
// ============================================================

/**
 * Run a forward pass on the current state and store the per-layer history.
 * After this call, state.layerHistory[k] holds h^{(k)} for k = 0..numLayers.
 *
 * @param {object} state
 */
function runForwardPass(state) {
    const arch = state.architecture;
    const L = state.numLayers;
    const layers = getWeights(state, arch, L);

    const history = [state.currentH.slice()];

    if (arch === 'GNN') {
        const Ahat = normalizeAdjacency(state.A);
        let h = state.currentH.slice();
        for (const layer of layers) {
            h = applyGCNLayer(h, Ahat, layer.w, layer.b);
            history.push(h.slice());
        }
    } else if (arch === 'Transformer') {
        // Complete-graph adjacency, normalized the same way.
        // Note: the complete-graph A is by construction permutation-invariant
        // (PAP^T = A for any P), so the Transformer's equivariance is "free."
        const Afull = completeAdjacency(state.n);
        const Ahat = normalizeAdjacency(Afull);
        let h = state.currentH.slice();
        for (const layer of layers) {
            h = applyGCNLayer(h, Ahat, layer.w, layer.b);
            history.push(h.slice());
        }
    } else if (arch === 'MLP') {
        let h = state.currentH.slice();
        for (const layer of layers) {
            h = applyMLPLayer(h, layer.W, layer.b);
            history.push(h.slice());
        }
    } else {
        throw new Error(`Unknown architecture: ${arch}`);
    }

    state.layerHistory = history;
}

// ============================================================
// Equivariance error computation
// ============================================================

/**
 * Given the current architecture and weights, build a forward function
 * that takes (h, A) and returns the final layer output. Used by the
 * equivarianceError* functions from Module 1.
 *
 * For MLP, the function ignores A (MLP has no graph input).
 */
function buildForwardFunction(state) {
    const arch = state.architecture;
    const L = state.numLayers;
    const layers = getWeights(state, arch, L);

    if (arch === 'GNN') {
        return (h, A) => forwardGNN(h, normalizeAdjacency(A), layers);
    } else if (arch === 'Transformer') {
        // Note: the Transformer ignores the input adjacency entirely — it always
        // operates on the complete graph. This is exactly why it is S_n-equivariant
        // unconditionally.
        return (h, A) => {
            const Afull = completeAdjacency(h.length);
            return forwardGNN(h, normalizeAdjacency(Afull), layers);
        };
    } else if (arch === 'MLP') {
        return (h) => forwardMLP(h, layers);
    } else {
        throw new Error(`Unknown architecture: ${arch}`);
    }
}

/**
 * Compute the equivariance error for the current state's architecture
 * and the current permutation π = state.perm:
 *
 *   GNN/Transformer: ‖ f(P h_orig, P A_orig P^T) − P f(h_orig, A_orig) ‖_2
 *   MLP:             ‖ f(P h_orig)               − P f(h_orig)         ‖_2
 *
 * Stores the result on state.equivarianceError.
 *
 * Important: this test uses originalH and originalA — i.e. it asks
 * "does the architecture commute with the permutation as a mathematical
 * property?" — independent of whatever the user has currently displayed.
 */
function computeEquivarianceError(state) {
    const f = buildForwardFunction(state);
    let err;
    if (state.architecture === 'MLP') {
        err = equivarianceErrorPlain(f, state.originalH, state.perm);
    } else {
        err = equivarianceErrorGraph(f, state.originalH, state.originalA, state.perm);
    }
    state.equivarianceError = err;
    return err;
}

// ============================================================
// State change handlers
// ============================================================

/**
 * Switch architecture. Triggers a fresh forward pass.
 * Weights for the new arch may need to be initialized; getWeights handles caching.
 */
function switchArchitecture(state, newArch) {
    if (!['GNN', 'Transformer', 'MLP'].includes(newArch)) {
        throw new Error(`Unknown architecture: ${newArch}`);
    }
    state.architecture = newArch;
    runForwardPass(state);
    computeEquivarianceError(state);
}

/**
 * Change the number of layers. Triggers a fresh forward pass.
 * New depth uses fresh weights (different seed → different model).
 */
function changeNumLayers(state, newNumLayers) {
    if (newNumLayers < 1 || newNumLayers > 5) {
        throw new Error(`numLayers ${newNumLayers} out of supported range [1, 5]`);
    }
    state.numLayers = newNumLayers;
    runForwardPass(state);
    computeEquivarianceError(state);
}

/**
 * After applying a permutation to the state (Module 2's applyPermutationToState),
 * recompute the forward pass and equivariance error.
 */
function refreshAfterPermutation(state) {
    runForwardPass(state);
    computeEquivarianceError(state);
}

// ============================================================
// Module 3 unit tests
// ============================================================



// ====== MODULE 5 ======
// sec5_p13_gdl_demo.js — Module 5: UI controls panel
// Builds the HTML structure and CSS for the demo, and exposes a function
// that collects references to all interactive elements for Module 6 to wire up.

// ============================================================
// HTML structure
// ============================================================

/**
 * Returns the inner HTML for the demo container.
 * Pure string output; no DOM mutation here.
 */
function buildDemoHTML() {
    return `
      <div class="gdl-container">
        <div class="gdl-layout">

          <!-- Left: canvas + legend + layer scrubber -->
          <div class="gdl-canvas-area">
            <div class="gdl-instruction">
              Click <strong>Shuffle Node Labels</strong> to apply a random permutation.
              GNN and Transformer outputs reorder consistently — MLP does not.
              Drag the <strong>Layer</strong> slider to scrub through the forward pass.
            </div>
            <div class="gdl-canvas-wrapper">
              <canvas id="gdl-canvas" width="700" height="500"></canvas>
            </div>
            <div class="gdl-legend">
              <div class="gdl-legend-item"><span class="gdl-swatch gdl-swatch-pos"></span> feature ≈ +1</div>
              <div class="gdl-legend-item"><span class="gdl-swatch gdl-swatch-zero"></span> feature ≈ 0</div>
              <div class="gdl-legend-item"><span class="gdl-swatch gdl-swatch-neg"></span> feature ≈ −1</div>
              <div class="gdl-legend-item"><span class="gdl-swatch gdl-swatch-edge-gnn"></span> GNN edges</div>
              <div class="gdl-legend-item"><span class="gdl-swatch gdl-swatch-edge-tf"></span> Transformer (complete)</div>
            </div>
            <div class="gdl-layer-control">
              <label class="gdl-layer-label">Layer</label>
              <input type="range" id="gdl-layer-slider" min="0" max="2" step="1" value="0">
              <span class="gdl-layer-readout" id="gdl-layer-readout">0 / 2</span>
            </div>
          </div>

          <!-- Right: controls panel -->
          <div class="gdl-controls-panel">

            <div class="gdl-info-card">
              <div class="gdl-card-title">Architecture</div>
              <div class="gdl-card-subtitle">Where does the message-passing happen?</div>
              <div class="gdl-arch-segmented" id="gdl-arch-segmented">
                <button class="gdl-seg-btn" data-arch="MLP">MLP</button>
                <button class="gdl-seg-btn" data-arch="Transformer">Transformer</button>
                <button class="gdl-seg-btn gdl-seg-active" data-arch="GNN">GNN</button>
              </div>
              <div class="gdl-arch-desc" id="gdl-arch-desc">
                Message passing on the input graph. Permutation acts jointly on (X, A).
              </div>
            </div>

            <div class="gdl-info-card">
              <div class="gdl-card-title">Depth</div>
              <div class="gdl-card-subtitle">Number of layers</div>
              <div class="gdl-slider-row">
                <input type="range" id="gdl-depth-slider" min="1" max="3" step="1" value="2">
                <span class="gdl-slider-val" id="gdl-depth-val">2</span>
              </div>
            </div>

            <div class="gdl-info-card gdl-perm-card">
              <div class="gdl-card-title">Permutation Test</div>
              <div class="gdl-card-subtitle">
                Shuffle the node labels. Does the architecture's output reorder accordingly?
              </div>
              <div class="gdl-button-row">
                <button class="gdl-btn gdl-btn-primary" id="gdl-shuffle-btn">⇆ Shuffle Node Labels</button>
                <button class="gdl-btn gdl-btn-secondary" id="gdl-reset-btn">↺ Reset</button>
              </div>
              <div class="gdl-equiv-meter">
                <div class="gdl-equiv-row">
                  <span class="gdl-equiv-label">Equivariance error</span>
                  <span class="gdl-equiv-val" id="gdl-equiv-val">0.00e+0</span>
                </div>
                <div class="gdl-equiv-bar">
                  <div class="gdl-equiv-fill" id="gdl-equiv-fill"></div>
                </div>
                <div class="gdl-equiv-verdict" id="gdl-equiv-verdict">
                  ✓ EQUIVARIANT (error within numerical precision)
                </div>
              </div>
            </div>

            <div class="gdl-info-card">
              <div class="gdl-card-title">Output Comparison</div>
              <div class="gdl-card-subtitle">
                Slot-by-slot: original output vs current output, expected from equivariance.
              </div>
              <div class="gdl-table-wrapper">
                <table class="gdl-output-table" id="gdl-output-table">
                  <thead>
                    <tr>
                      <th>slot</th>
                      <th>original y</th>
                      <th>current y'</th>
                      <th>expected Py</th>
                      <th>✓</th>
                    </tr>
                  </thead>
                  <tbody id="gdl-output-tbody"></tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;
}

// ============================================================
// CSS — injected once
// ============================================================

const GDL_DEMO_CSS = `
.gdl-container {
    width: 100%;
    font-family: "JetBrains Mono", "Fira Code", "SF Mono", monospace;
    color: #e8eaed;
    background: #0b0e14;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    overflow: hidden;
}
.gdl-layout {
    display: flex;
    min-height: 720px;
}
@media (max-width: 1100px) {
    .gdl-layout { flex-direction: column; }
}

.gdl-canvas-area {
    flex: 1 1 62%;
    display: flex;
    flex-direction: column;
    background: #060810;
    padding: 16px;
}
.gdl-instruction {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.5;
    padding: 10px 14px;
    background: rgba(0, 255, 255, 0.04);
    border-left: 2px solid rgba(0, 255, 255, 0.4);
    border-radius: 4px;
    margin-bottom: 12px;
}
.gdl-instruction strong { color: #00ffff; font-weight: 600; }

.gdl-canvas-wrapper {
    position: relative;
    width: 100%;
    background: #0b0e14;
    border-radius: 6px;
    overflow: hidden;
}
#gdl-canvas {
    display: block;
    width: 100%;
    height: auto;
    max-width: 700px;
    margin: 0 auto;
}

.gdl-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 12px;
    padding: 10px;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
}
.gdl-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
}
.gdl-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.3);
}
.gdl-swatch-pos  { background: rgb(255, 107, 107); }
.gdl-swatch-zero { background: rgb(91, 99, 120); }
.gdl-swatch-neg  { background: rgb(77, 171, 247); }
.gdl-swatch-edge-gnn {
    border-radius: 0;
    width: 18px; height: 2px;
    background: rgba(0, 255, 255, 0.55);
    border: none;
}
.gdl-swatch-edge-tf {
    border-radius: 0;
    width: 18px; height: 2px;
    background: rgba(0, 255, 255, 0.18);
    border: none;
}

.gdl-layer-control {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    padding: 10px 14px;
    background: rgba(20, 28, 40, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
}
.gdl-layer-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(0, 255, 255, 0.85);
    letter-spacing: 0.08em;
    min-width: 50px;
}
#gdl-layer-slider {
    flex: 1;
    accent-color: #00ffff;
}
.gdl-layer-readout {
    font-size: 0.78rem;
    font-weight: 600;
    color: #00ffff;
    min-width: 60px;
    text-align: right;
}

.gdl-controls-panel {
    flex: 1 1 38%;
    background: rgba(20, 28, 40, 0.92);
    padding: 16px;
    overflow-y: auto;
    max-height: 720px;
}
.gdl-info-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 12px;
}
.gdl-card-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: rgba(0, 255, 255, 0.85);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 4px;
}
.gdl-card-subtitle {
    font-size: 0.66rem;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.45;
    margin-bottom: 12px;
}

/* Architecture segmented control */
.gdl-arch-segmented {
    display: flex;
    gap: 0;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
}
.gdl-seg-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.55);
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 600;
    padding: 9px 6px;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.04em;
}
.gdl-seg-btn:hover {
    background: rgba(0, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
}
.gdl-seg-btn.gdl-seg-active {
    background: rgba(0, 255, 255, 0.15);
    color: #00ffff;
}
.gdl-arch-desc {
    margin-top: 10px;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
    min-height: 2.5em;
}

/* Sliders */
.gdl-slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
}
.gdl-slider-row input[type="range"] {
    flex: 1;
    accent-color: #00ffff;
}
.gdl-slider-val {
    font-size: 0.82rem;
    font-weight: 600;
    color: #00ffff;
    min-width: 32px;
    text-align: right;
}

/* Buttons */
.gdl-button-row {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
}
.gdl-btn {
    flex: 1;
    background: transparent;
    border: 1px solid;
    border-radius: 4px;
    color: #e8eaed;
    font-family: inherit;
    font-size: 0.76rem;
    font-weight: 600;
    padding: 9px 10px;
    cursor: pointer;
    transition: all 0.18s;
    letter-spacing: 0.03em;
}
.gdl-btn-primary {
    border-color: rgba(0, 255, 255, 0.5);
    color: #00ffff;
    background: rgba(0, 255, 255, 0.05);
}
.gdl-btn-primary:hover {
    background: rgba(0, 255, 255, 0.18);
    border-color: #00ffff;
}
.gdl-btn-secondary {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
}
.gdl-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #e8eaed;
}

/* Equivariance meter */
.gdl-equiv-meter {
    margin-top: 4px;
}
.gdl-equiv-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
    font-size: 0.72rem;
}
.gdl-equiv-label {
    color: rgba(255, 255, 255, 0.55);
}
.gdl-equiv-val {
    font-weight: 700;
    color: #00ffff;
    font-variant-numeric: tabular-nums;
}
.gdl-equiv-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
    overflow: hidden;
}
.gdl-equiv-fill {
    height: 100%;
    width: 0%;
    background: #26c6da;
    transition: width 0.35s ease, background-color 0.2s;
}
.gdl-equiv-fill.gdl-fill-fail {
    background: #ff5252;
}
.gdl-equiv-verdict {
    margin-top: 9px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #26c6da;
}
.gdl-equiv-verdict.gdl-verdict-fail {
    color: #ff5252;
}

/* Output comparison table */
.gdl-table-wrapper {
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}
.gdl-output-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
}
.gdl-output-table thead {
    position: sticky;
    top: 0;
    background: rgba(20, 28, 40, 1);
}
.gdl-output-table th {
    text-align: right;
    padding: 7px 8px;
    font-weight: 600;
    color: rgba(0, 255, 255, 0.75);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    letter-spacing: 0.02em;
}
.gdl-output-table th:first-child { text-align: center; }
.gdl-output-table th:last-child  { text-align: center; }
.gdl-output-table td {
    text-align: right;
    padding: 5px 8px;
    color: rgba(255, 255, 255, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.gdl-output-table td:first-child {
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
}
.gdl-output-table td:last-child {
    text-align: center;
    font-weight: 600;
}
.gdl-row-match  td:last-child { color: #26c6da; }
.gdl-row-mismatch td:last-child { color: #ff5252; }
.gdl-row-mismatch td { background: rgba(255, 82, 82, 0.04); }
`;

/**
 * Inject the demo's CSS into the document head, exactly once.
 * Subsequent calls are no-ops.
 */
function injectGDLDemoCSS() {
    if (document.getElementById('gdl-demo-style')) return;
    const style = document.createElement('style');
    style.id = 'gdl-demo-style';
    style.textContent = GDL_DEMO_CSS;
    document.head.appendChild(style);
}

// ============================================================
// DOM reference collection
// ============================================================

/**
 * After buildDemoHTML has been inserted into the container, collect references
 * to all interactive elements. Module 6 will use these to wire up event handlers.
 *
 * @param {HTMLElement} container  the demo's root container element
 * @returns {object} dictionary of named element references
 */
function collectGDLDOMRefs(container) {
    const $ = (sel) => container.querySelector(sel);
    const $$ = (sel) => Array.from(container.querySelectorAll(sel));

    return {
        canvas:        $('#gdl-canvas'),
        archButtons:   $$('.gdl-seg-btn'),
        archDesc:      $('#gdl-arch-desc'),
        depthSlider:   $('#gdl-depth-slider'),
        depthVal:      $('#gdl-depth-val'),
        layerSlider:   $('#gdl-layer-slider'),
        layerReadout:  $('#gdl-layer-readout'),
        shuffleBtn:    $('#gdl-shuffle-btn'),
        resetBtn:      $('#gdl-reset-btn'),
        equivVal:      $('#gdl-equiv-val'),
        equivFill:     $('#gdl-equiv-fill'),
        equivVerdict:  $('#gdl-equiv-verdict'),
        outputTbody:   $('#gdl-output-tbody'),
    };
}

/**
 * Architecture-specific descriptive text shown under the segmented control.
 * Kept here so the description tracks the current architecture without
 * Module 6 needing to know its content.
 */
const ARCH_DESCRIPTIONS = {
    MLP:         'Dense fully-connected layers. No graph input; no symmetry encoded. Permuting the inputs gives a different output.',
    Transformer: 'Message passing on the complete graph (every token attends to every other). Permutation acts on tokens; output reorders identically.',
    GNN:         'Message passing on the input graph. Permutation acts jointly on features X and adjacency A: f(PX, PAP^T) = Pf(X, A).',
};

/**
 * Convenience: update the segmented control's visual active state.
 */
function setActiveArchButton(refs, arch) {
    for (const btn of refs.archButtons) {
        if (btn.dataset.arch === arch) {
            btn.classList.add('gdl-seg-active');
        } else {
            btn.classList.remove('gdl-seg-active');
        }
    }
    if (refs.archDesc) {
        refs.archDesc.textContent = ARCH_DESCRIPTIONS[arch] || '';
    }
}

// ====== MODULE 6 ======
// sec5_p13_gdl_demo.js — Module 6: Wiring
// Integrates all modules: state init, DOM build, event binding, animation,
// comparison table updates, equivariance meter updates.

// ============================================================
// Extended state: original-side caches
// ============================================================

/**
 * Augment the demo state with caches of forward-pass results on the
 * unshuffled inputs. These are needed for the output-comparison table
 * (which compares current y' against the original y under any permutation).
 *
 * Called whenever architecture or depth changes — these invalidate the
 * forward pass on the original inputs in addition to the current inputs.
 */
function refreshOriginalForward(state) {
    const arch = state.architecture;
    const L = state.numLayers;
    const layers = getWeights(state, arch, L);

    let h = state.originalH.slice();
    const history = [h.slice()];

    if (arch === 'GNN') {
        const Ahat = normalizeAdjacency(state.originalA);
        for (const layer of layers) {
            h = applyGCNLayer(h, Ahat, layer.w, layer.b);
            history.push(h.slice());
        }
    } else if (arch === 'Transformer') {
        const Afull = completeAdjacency(state.n);
        const Ahat = normalizeAdjacency(Afull);
        for (const layer of layers) {
            h = applyGCNLayer(h, Ahat, layer.w, layer.b);
            history.push(h.slice());
        }
    } else if (arch === 'MLP') {
        for (const layer of layers) {
            h = applyMLPLayer(h, layer.W, layer.b);
            history.push(h.slice());
        }
    }

    state.originalLayerHistory = history;
    state.originalY = history[history.length - 1].slice();
}

// ============================================================
// Comparison table update
// ============================================================

const EQUIV_MATCH_THRESHOLD = 1e-6;

/**
 * Build the rows of the output-comparison table for the current state.
 * Each row corresponds to a node slot i and shows:
 *   - original y_i             (forward pass on unshuffled input)
 *   - current y'_i             (forward pass on current shuffled input)
 *   - expected y_{π(i)}        (where the original feature would have ended up under equivariance)
 *   - match indicator
 */
function updateComparisonTable(refs, state) {
    const tbody = refs.outputTbody;
    if (!tbody) return;

    const L = state.numLayers;
    const originalY = state.originalY;
    const currentY  = state.layerHistory[L];
    const perm      = state.perm;

    const rows = [];
    for (let i = 0; i < state.n; i++) {
        const yOrig    = originalY[i];
        const yCurr    = currentY[i];
        const yExpect  = originalY[perm[i]];   // expected from equivariance: P y
        const diff     = Math.abs(yCurr - yExpect);
        const matched  = diff < EQUIV_MATCH_THRESHOLD;

        rows.push(`
            <tr class="${matched ? 'gdl-row-match' : 'gdl-row-mismatch'}">
                <td>${i}</td>
                <td>${yOrig.toFixed(4)}</td>
                <td>${yCurr.toFixed(4)}</td>
                <td>${yExpect.toFixed(4)}</td>
                <td>${matched ? '✓' : '✗'}</td>
            </tr>
        `);
    }
    tbody.innerHTML = rows.join('');
}

// ============================================================
// Equivariance meter update
// ============================================================

/**
 * Map a positive error e to a 0-100 percentage on a log scale.
 *   e ≤ 1e-15  → 0% (full saturation; reading at numerical precision)
 *   e ≥ 1e+1   → 100%
 * In-between is logarithmic.
 */
function errorToPercent(e) {
    if (e <= 0) return 0;
    const logE = Math.log10(e);
    const pct = ((logE - (-15)) / (1 - (-15))) * 100;
    return Math.max(0, Math.min(100, pct));
}

function updateEquivarianceMeter(refs, state) {
    const err = state.equivarianceError;
    if (refs.equivVal)     refs.equivVal.textContent = err.toExponential(2);

    const pct = errorToPercent(err);
    if (refs.equivFill) {
        refs.equivFill.style.width = pct + '%';
        if (err < EQUIV_MATCH_THRESHOLD) {
            refs.equivFill.classList.remove('gdl-fill-fail');
        } else {
            refs.equivFill.classList.add('gdl-fill-fail');
        }
    }

    if (refs.equivVerdict) {
        if (err < EQUIV_MATCH_THRESHOLD) {
            refs.equivVerdict.textContent = '✓ EQUIVARIANT (error within numerical precision)';
            refs.equivVerdict.classList.remove('gdl-verdict-fail');
        } else {
            refs.equivVerdict.textContent = '✗ NOT EQUIVARIANT (output changes with permutation)';
            refs.equivVerdict.classList.add('gdl-verdict-fail');
        }
    }
}

// ============================================================
// Layer slider update
// ============================================================

function syncLayerSlider(refs, state) {
    if (!refs.layerSlider) return;
    refs.layerSlider.max = state.numLayers;
    if (parseInt(refs.layerSlider.value, 10) > state.numLayers) {
        refs.layerSlider.value = state.numLayers;
        state.displayedLayer = state.numLayers;
    }
    if (refs.layerReadout) {
        refs.layerReadout.textContent = `${state.displayedLayer} / ${state.numLayers}`;
    }
}

// ============================================================
// Animation: layer-by-layer reveal
// ============================================================

/**
 * Smoothly animate from the initial features to the final-layer features by
 * walking through layerHistory[0] → layerHistory[1] → ... → layerHistory[L].
 * Each pair gets PER_LAYER_MS milliseconds of smoothstep easing.
 *
 * The animation modifies state.displayedLayer (integer) and state.animH
 * (current displayed feature vector). On each frame, render and update the
 * layer slider position.
 */
const PER_LAYER_MS = 600;

function startLayerAnimation(state, refs, ctx, W, H) {
    if (state._animationFrameId) {
        cancelAnimationFrame(state._animationFrameId);
        state._animationFrameId = null;
    }

    const totalDuration = PER_LAYER_MS * state.numLayers;
    const startTime = performance.now();

    function frame(now) {
        const elapsed = now - startTime;
        const tGlobal = Math.min(1, elapsed / totalDuration);

        // Which layer pair are we between?
        const fScaled = tGlobal * state.numLayers;     // 0..numLayers
        const iLow    = Math.floor(fScaled);
        const iHigh   = Math.min(iLow + 1, state.numLayers);
        const tLocal  = smoothstep(fScaled - iLow);

        const animH = lerpFeatures(
            state.layerHistory[iLow],
            state.layerHistory[iHigh],
            tLocal
        );

        // Update integer-valued slider position to match approx layer
        state.displayedLayer = iHigh;
        if (refs.layerSlider) refs.layerSlider.value = String(iHigh);
        if (refs.layerReadout) refs.layerReadout.textContent = `${iHigh} / ${state.numLayers}`;

        renderDemo(ctx, state, animH, iHigh, state.numLayers, W, H);

        if (tGlobal < 1) {
            state._animationFrameId = requestAnimationFrame(frame);
        } else {
            state._animationFrameId = null;
            state.displayedLayer = state.numLayers;
            renderDemo(ctx, state, state.layerHistory[state.numLayers],
                       state.numLayers, state.numLayers, W, H);
        }
    }

    state._animationFrameId = requestAnimationFrame(frame);
}

// ============================================================
// Top-level redraw (no animation)
// ============================================================

function redrawAtCurrentLayer(state, refs, ctx, W, H) {
    if (state._animationFrameId) {
        cancelAnimationFrame(state._animationFrameId);
        state._animationFrameId = null;
    }
    const k = state.displayedLayer;
    const h = state.layerHistory[k];
    renderDemo(ctx, state, h, k, state.numLayers, W, H);
}

// ============================================================
// Full state refresh: forward pass + table + meter + canvas
// ============================================================

function fullRefresh(state, refs, ctx, W, H, animate) {
    runForwardPass(state);                         // updates state.layerHistory
    refreshOriginalForward(state);                 // updates state.originalLayerHistory, originalY
    computeEquivarianceError(state);               // updates state.equivarianceError
    updateComparisonTable(refs, state);
    updateEquivarianceMeter(refs, state);
    syncLayerSlider(refs, state);
    if (animate) {
        state.displayedLayer = 0;
        startLayerAnimation(state, refs, ctx, W, H);
    } else {
        redrawAtCurrentLayer(state, refs, ctx, W, H);
    }
}

// ============================================================
// Event handlers
// ============================================================

function bindEventHandlers(state, refs, ctx, W, H) {

    // Architecture buttons
    for (const btn of refs.archButtons) {
        btn.addEventListener('click', () => {
            const newArch = btn.dataset.arch;
            if (state.architecture === newArch) return;
            state.architecture = newArch;
            setActiveArchButton(refs, newArch);
            fullRefresh(state, refs, ctx, W, H, /* animate */ true);
        });
    }

    // Depth slider
    if (refs.depthSlider) {
        refs.depthSlider.addEventListener('input', () => {
            const newL = parseInt(refs.depthSlider.value, 10);
            if (refs.depthVal) refs.depthVal.textContent = String(newL);
            if (newL === state.numLayers) return;
            state.numLayers = newL;
            fullRefresh(state, refs, ctx, W, H, /* animate */ true);
        });
    }

    // Layer slider
    if (refs.layerSlider) {
        refs.layerSlider.addEventListener('input', () => {
            const k = parseInt(refs.layerSlider.value, 10);
            state.displayedLayer = k;
            if (refs.layerReadout) refs.layerReadout.textContent = `${k} / ${state.numLayers}`;
            redrawAtCurrentLayer(state, refs, ctx, W, H);
        });
    }

    // Shuffle button
    if (refs.shuffleBtn) {
        refs.shuffleBtn.addEventListener('click', () => {
            const seed = (Date.now() & 0xffffffff) >>> 0;
            const perm = randomPermutation(state.n, mulberry32(seed));
            applyPermutationToState(state, perm);
            fullRefresh(state, refs, ctx, W, H, /* animate */ true);
        });
    }

    // Reset button
    if (refs.resetBtn) {
        refs.resetBtn.addEventListener('click', () => {
            resetPermutation(state);
            fullRefresh(state, refs, ctx, W, H, /* animate */ false);
        });
    }
}

// ============================================================
// Canvas DPI / responsive sizing
// ============================================================

/**
 * Configure the canvas for crisp rendering at the device pixel ratio.
 * Returns the logical (CSS) dimensions used for layout coordinates.
 */
function setupCanvas(canvas) {
    const W_logical = 700;
    const H_logical = 500;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W_logical * dpr;
    canvas.height = H_logical * dpr;
    canvas.style.width  = W_logical + 'px';
    canvas.style.height = H_logical + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return {ctx, W: W_logical, H: H_logical};
}

// ============================================================
// Entry point
// ============================================================

function initGDLDemo() {
    const container = document.getElementById('gdl_demo');
    if (!container) {
        console.error('[GDL demo] container #gdl_demo not found');
        return;
    }

    // Inject CSS, build HTML
    injectGDLDemoCSS();
    container.innerHTML = buildDemoHTML();

    // Collect DOM refs
    const refs = collectGDLDOMRefs(container);

    // Setup canvas
    const {ctx, W, H} = setupCanvas(refs.canvas);

    // Initialize state
    const state = createDemoState(DEFAULT_DEMO_CONFIG);
    state.displayedLayer = 0;
    state.architecture = 'GNN';
    state.numLayers = 2;

    // Initial UI sync
    setActiveArchButton(refs, state.architecture);
    if (refs.depthSlider) refs.depthSlider.value = String(state.numLayers);
    if (refs.depthVal)    refs.depthVal.textContent = String(state.numLayers);
    if (refs.layerSlider) {
        refs.layerSlider.max = state.numLayers;
        refs.layerSlider.value = '0';
    }
    if (refs.layerReadout) refs.layerReadout.textContent = `0 / ${state.numLayers}`;

    // Initial forward pass + render with animation
    fullRefresh(state, refs, ctx, W, H, /* animate */ true);

    // Bind handlers
    bindEventHandlers(state, refs, ctx, W, H);
}

// ============================================================
// DOM ready bootstrap
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGDLDemo);
} else {
    initGDLDemo();
}
