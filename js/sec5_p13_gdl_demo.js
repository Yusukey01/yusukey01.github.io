// ============================================================
// sec5_p13_gdl_demo.js — GdlCore (pure math layer)
//
// One layer template, three structure matrices:
//   h^{(l+1)} = tanh( w_l * (A_op h^{(l)}) + b_l )        (GNN / Transformer)
//   h^{(l+1)} = tanh( W_l h^{(l)} + b_l )                 (MLP: learned dense
//                                                          index-dependent mixing)
//   GNN:         A_op = D^{-1/2}(A+I)D^{-1/2}   (fixed, sparse, Kipf-Welling)
//   Transformer: A_op = softmax_j(h_i h_j / tau) (computed from features each
//                layer; dot-product attention with identity query/key maps at
//                feature dimension 1 — at d=1 any linear Q,K collapse into tau,
//                so this IS the general form; tau = 0.15, a design constant)
//   MLP:         no structure matrix — dense W mixes node indices directly,
//                which is exactly why it is NOT permutation equivariant.
//
// GNN and Transformer share the SAME scalar weight stack (w_l, b_l): the only
// difference between the two panels is the structure matrix.
//
// Design constants (selected by parameter validation, July 2026; every
// displayed number remains computed — seeds chosen FOR sustained per-layer
// node-color spread across depths 1..4 at the shipped graph/features):
//   weight distribution  w = sign * U(0.8, 2.0)  (no dead layers), b ~ U(-.3,.3)
//   shared weight seed base 149, MLP seed base 240 (seed = base + numLayers)
//   attention temperature tau = 0.15
//   graph n=10, 5 extra chords, graphSeed 42, featureSeed 23, shuffleSeed 1337
//
// No training => no gradients => finite-difference checks are N/A for this
// demo (recorded deviation from the FD requirement; deep_nn precedent).
// ============================================================

var GdlCore = (function () {
    'use strict';

    // ---------- RNG ----------
    function mulberry32(seed) {
        let t = seed >>> 0;
        return function () {
            t |= 0; t = (t + 0x6D2B79F5) | 0;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---------- small linear algebra ----------
    function matVec(M, v) {
        const n = M.length, out = new Array(n);
        for (let i = 0; i < n; i++) {
            let s = 0;
            const row = M[i];
            for (let j = 0; j < row.length; j++) s += row[j] * v[j];
            out[i] = s;
        }
        return out;
    }

    function l2diff(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
        return Math.sqrt(s);
    }

    function maxAbsDiffMat(A, B) {
        let m = 0;
        for (let i = 0; i < A.length; i++)
            for (let j = 0; j < A[i].length; j++)
                m = Math.max(m, Math.abs(A[i][j] - B[i][j]));
        return m;
    }

    function stddev(v) {
        const n = v.length;
        let m = 0;
        for (let i = 0; i < n; i++) m += v[i];
        m /= n;
        let s = 0;
        for (let i = 0; i < n; i++) { const d = v[i] - m; s += d * d; }
        return Math.sqrt(s / n);
    }

    // ---------- structure matrices ----------

    // Symmetric self-loop normalized adjacency (Kipf-Welling):
    // A_hat = D~^{-1/2} (A + I) D~^{-1/2},  D~ from A + I.
    function normalizeAdjacency(A) {
        const n = A.length;
        const At = A.map((row, i) => row.map((v, j) => v + (i === j ? 1 : 0)));
        const d = At.map(row => row.reduce((a, b) => a + b, 0));
        const inv = d.map(x => 1 / Math.sqrt(x)); // d_i >= 1 always (self-loop)
        const Ahat = new Array(n);
        for (let i = 0; i < n; i++) {
            Ahat[i] = new Array(n);
            for (let j = 0; j < n; j++) Ahat[i][j] = inv[i] * At[i][j] * inv[j];
        }
        return Ahat;
    }

    function completeAdjacency(n) {
        const A = new Array(n);
        for (let i = 0; i < n; i++) {
            A[i] = new Array(n);
            for (let j = 0; j < n; j++) A[i][j] = (i === j) ? 0 : 1;
        }
        return A;
    }

    // Dot-product attention on the complete graph (self included):
    // A_hat(h)_{ij} = exp(h_i h_j / tau) / sum_k exp(h_i h_k / tau).
    // Row-stochastic by construction; equivariant: A_hat(Ph) = P A_hat(h) P^T.
    function attentionMatrix(h, tau) {
        const n = h.length;
        const M = new Array(n);
        for (let i = 0; i < n; i++) {
            const s = new Array(n);
            let mx = -Infinity;
            for (let j = 0; j < n; j++) {
                s[j] = h[i] * h[j] / tau;
                if (s[j] > mx) mx = s[j];
            }
            let Z = 0;
            const row = new Array(n);
            for (let j = 0; j < n; j++) { row[j] = Math.exp(s[j] - mx); Z += row[j]; }
            for (let j = 0; j < n; j++) row[j] /= Z;
            M[i] = row;
        }
        return M;
    }

    // ---------- layers ----------
    function applyGCNLayer(h, Aop, w, b) {
        const Ah = matVec(Aop, h);
        const out = new Array(h.length);
        for (let i = 0; i < h.length; i++) out[i] = Math.tanh(w * Ah[i] + b);
        return out;
    }

    function applyMLPLayer(h, W, b) {
        const Wh = matVec(W, h);
        const out = new Array(h.length);
        for (let i = 0; i < h.length; i++) out[i] = Math.tanh(Wh[i] + b[i]);
        return out;
    }

    // ---------- forward passes (ONE code path for GNN and Transformer) ----------
    // ahatProvider: (currentH) => structure matrix for this layer.
    // GNN passes a constant provider; Transformer recomputes attention from h.
    // Returns { history, aopHistory } — aopHistory[k] is the structure matrix
    // used by layer k+1 (needed for the layer-synced heatmap display).
    function forwardGraphOp(h0, ahatProvider, layers) {
        let h = h0.slice();
        const history = [h.slice()];
        const aopHistory = [];
        for (let k = 0; k < layers.length; k++) {
            const Aop = ahatProvider(h);
            aopHistory.push(Aop);
            h = applyGCNLayer(h, Aop, layers[k].w, layers[k].b);
            history.push(h.slice());
        }
        return { history: history, aopHistory: aopHistory };
    }

    function forwardMLP(h0, layers) {
        let h = h0.slice();
        const history = [h.slice()];
        for (let k = 0; k < layers.length; k++) {
            h = applyMLPLayer(h, layers[k].W, layers[k].b);
            history.push(h.slice());
        }
        return { history: history };
    }

    // Orchestrated forward. For 'Transformer' the input A is ignored BY
    // CONSTRUCTION (attention lives on the complete graph) — this is asserted
    // by a self-test, not assumed.
    function runForward(arch, h0, A, layers, tau) {
        if (arch === 'GNN') {
            const Ahat = normalizeAdjacency(A);
            return forwardGraphOp(h0, function () { return Ahat; }, layers);
        }
        if (arch === 'Transformer') {
            return forwardGraphOp(h0, function (h) { return attentionMatrix(h, tau); }, layers);
        }
        if (arch === 'MLP') {
            return forwardMLP(h0, layers);
        }
        throw new Error('Unknown architecture: ' + arch);
    }

    // (h, A) => final output; used by the equivariance certificates.
    function buildForwardFn(arch, layers, tau) {
        return function (h, A) {
            const r = runForward(arch, h, A, layers, tau);
            return r.history[r.history.length - 1];
        };
    }

    // ---------- permutations ----------
    function identityPermutation(n) {
        const p = new Array(n);
        for (let i = 0; i < n; i++) p[i] = i;
        return p;
    }

    function isIdentityPermutation(p) {
        for (let i = 0; i < p.length; i++) if (p[i] !== i) return false;
        return true;
    }

    function randomPermutation(n, rng) {
        const p = identityPermutation(n);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const t = p[i]; p[i] = p[j]; p[j] = t;
        }
        return p;
    }

    // Redraw guard: identity draws are rejected (bounded; n < 2 has no
    // non-identity permutation and returns the identity honestly).
    function randomNonIdentityPermutation(n, rng) {
        if (n < 2) return identityPermutation(n);
        for (let attempt = 0; attempt < 64; attempt++) {
            const p = randomPermutation(n, rng);
            if (!isIdentityPermutation(p)) return p;
        }
        // Probability (1/n!)^64 — unreachable for n >= 2; swap two entries.
        const p = identityPermutation(n);
        p[0] = 1; p[1] = 0;
        return p;
    }

    function inversePermutation(p) {
        const inv = new Array(p.length);
        for (let i = 0; i < p.length; i++) inv[p[i]] = i;
        return inv;
    }

    // (Pv)[i] = v[p[i]]
    function permuteVector(v, p) {
        const out = new Array(v.length);
        for (let i = 0; i < v.length; i++) out[i] = v[p[i]];
        return out;
    }

    // (P A P^T)[i][j] = A[p[i]][p[j]]  (consistent with permuteVector)
    function permuteAdjacency(A, p) {
        const n = A.length, out = new Array(n);
        for (let i = 0; i < n; i++) {
            out[i] = new Array(n);
            for (let j = 0; j < n; j++) out[i][j] = A[p[i]][p[j]];
        }
        return out;
    }

    // ---------- equivariance certificates ----------
    // || f(Ph, PAP^T) - P f(h, A) ||_2
    function equivarianceErrorGraph(f, h, A, perm) {
        const lhs = f(permuteVector(h, perm), permuteAdjacency(A, perm));
        const rhs = permuteVector(f(h, A), perm);
        return l2diff(lhs, rhs);
    }

    // || f(Ph) - P f(h) ||_2  (MLP: no graph input)
    function equivarianceErrorPlain(f, h, perm) {
        const lhs = f(permuteVector(h, perm), null);
        const rhs = permuteVector(f(h, null), perm);
        return l2diff(lhs, rhs);
    }

    // All three architectures against ONE permutation, on the ORIGINAL
    // (unshuffled) h and A — the property is asked of the architecture,
    // independent of what is currently displayed.
    function computeAllEquivariance(h, A, perm, sharedLayers, mlpLayers, tau) {
        return {
            GNN: equivarianceErrorGraph(buildForwardFn('GNN', sharedLayers, tau), h, A, perm),
            Transformer: equivarianceErrorGraph(buildForwardFn('Transformer', sharedLayers, tau), h, A, perm),
            MLP: equivarianceErrorPlain(buildForwardFn('MLP', mlpLayers, tau), h, perm)
        };
    }

    // ---------- weights ----------
    // Shared GNN/Transformer stack: w = sign * U(0.8, 2.0) (no dead layers),
    // b ~ U(-0.3, 0.3). Design constants; see header.
    function initSharedGraphWeights(numLayers, seed) {
        const rng = mulberry32(seed);
        const layers = [];
        for (let l = 0; l < numLayers; l++) {
            const sign = rng() < 0.5 ? -1 : 1;
            const mag = 0.8 + 1.2 * rng();
            layers.push({ w: sign * mag, b: 0.6 * rng() - 0.3 });
        }
        return layers;
    }

    // MLP: W_ij ~ U(-1/sqrt(n), 1/sqrt(n)), b_i ~ U(-0.3, 0.3).
    function initMLPWeights(numLayers, n, seed) {
        const rng = mulberry32(seed);
        const scale = 1 / Math.sqrt(n);
        const layers = [];
        for (let l = 0; l < numLayers; l++) {
            const W = new Array(n);
            for (let i = 0; i < n; i++) {
                W[i] = new Array(n);
                for (let j = 0; j < n; j++) W[i][j] = 2 * scale * (rng() - 0.5);
            }
            const b = new Array(n);
            for (let i = 0; i < n; i++) b[i] = 0.6 * rng() - 0.3;
            layers.push({ W: W, b: b });
        }
        return layers;
    }

    function getWeightsFor(arch, numLayers, n, D) {
        if (arch === 'MLP') return initMLPWeights(numLayers, n, D.mlpWeightSeedBase + numLayers);
        return initSharedGraphWeights(numLayers, D.sharedWeightSeedBase + numLayers);
    }

    // ---------- data ----------
    // Ring backbone (connectivity guaranteed) + deterministic extra chords.
    function buildSmallWorldGraph(n, numExtras, seed) {
        const rng = mulberry32(seed);
        const edges = [];
        const has = {};
        function key(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const k = key(i, j);
            if (!has[k]) { has[k] = true; edges.push([Math.min(i, j), Math.max(i, j)]); }
        }
        let added = 0, attempts = 0;
        while (added < numExtras && attempts < 1000) {
            attempts++;
            const a = Math.floor(rng() * n), b = Math.floor(rng() * n);
            if (a === b) continue;
            const k = key(a, b);
            if (has[k]) continue;
            has[k] = true;
            edges.push([Math.min(a, b), Math.max(a, b)]);
            added++;
        }
        const A = new Array(n);
        for (let i = 0; i < n; i++) A[i] = new Array(n).fill(0);
        for (let e = 0; e < edges.length; e++) {
            A[edges[e][0]][edges[e][1]] = 1;
            A[edges[e][1]][edges[e][0]] = 1;
        }
        return { edges: edges, A: A };
    }

    function initNodeFeatures(n, seed) {
        const rng = mulberry32(seed);
        const h = new Array(n);
        for (let i = 0; i < n; i++) h[i] = 2 * rng() - 1;
        return h;
    }

    // ---------- shipped configuration ----------
    var DEFAULTS = {
        n: 10,
        extraEdges: 5,           // 10 ring + 5 chords = 15 edges
        graphSeed: 42,
        layoutSeed: 7,
        featureSeed: 23,
        shuffleSeed: 1337,       // fixed-seed shuffle stream (documented)
        sharedWeightSeedBase: 149, // + numLayers; selected for sustained spread
        mlpWeightSeedBase: 240,    // + numLayers; selected for spread + margin
        tau: 0.15,
        numLayersDefault: 2,
        maxLayers: 4
    };

    // ---------- self-tests ----------
    function runSelfTests() {
        const failures = [];
        function check(name, cond) { if (!cond) failures.push(name); }
        const TOL = 1e-12;
        const D = DEFAULTS;

        // T1: normalizeAdjacency — pinned on a generic NON-REGULAR graph
        // (equal-degree graphs hide inv[i]^2-type normalization mutants).
        // Graph: n=4, edges (0,1),(1,2),(1,3); degrees(A+I) = [2,4,2,2].
        (function () {
            const A = [[0, 1, 0, 0], [1, 0, 1, 1], [0, 1, 0, 0], [0, 1, 0, 0]];
            const Ah = normalizeAdjacency(A);
            const s8 = 1 / Math.sqrt(8);
            check('T1 pin (0,0)=1/2', Math.abs(Ah[0][0] - 0.5) < TOL);
            check('T1 pin (1,1)=1/4', Math.abs(Ah[1][1] - 0.25) < TOL);
            check('T1 pin (0,1)=1/sqrt(8)', Math.abs(Ah[0][1] - s8) < TOL);
            check('T1 pin (1,2)=1/sqrt(8)', Math.abs(Ah[1][2] - s8) < TOL);
            check('T1 pin (0,2)=0', Ah[0][2] === 0);
            // spec-level symmetry pin on distinct-degree edge (kills inv[i]^2,
            // which is similar to L_rw and behaviorally near-invisible otherwise)
            let sym = true;
            for (let i = 0; i < 4; i++)
                for (let j = 0; j < 4; j++)
                    if (Math.abs(Ah[i][j] - Ah[j][i]) > TOL) sym = false;
            check('T1 symmetry', sym);
        })();

        // T2: attentionMatrix — row-stochastic, equivariant, non-degenerate,
        // temperature-sensitive.
        (function () {
            const h = [0.9, -0.7, 0.2, -0.1, 0.5];
            const M = attentionMatrix(h, D.tau);
            let ok = true;
            for (let i = 0; i < 5; i++) {
                let s = 0;
                for (let j = 0; j < 5; j++) { s += M[i][j]; if (M[i][j] < 0) ok = false; }
                if (Math.abs(s - 1) > TOL) ok = false;
            }
            check('T2 row-stochastic', ok);
            // equivariance of the matrix itself: A(Ph) = P A(h) P^T
            const rng = mulberry32(99);
            const p = randomNonIdentityPermutation(5, rng);
            const lhs = attentionMatrix(permuteVector(h, p), D.tau);
            const rhs = permuteAdjacency(M, p);
            check('T2 attention equivariance', maxAbsDiffMat(lhs, rhs) < 1e-14);
            // non-uniformity (kills a return-uniform mutant = the v1 collapse)
            let spread = 0;
            for (let j = 0; j < 5; j++) spread = Math.max(spread, Math.abs(M[0][j] - 0.2));
            check('T2 non-uniform rows', spread > 0.05);
            // temperature sensitivity (kills a tau-ignored mutant)
            const M2 = attentionMatrix(h, 1.0);
            check('T2 tau matters', maxAbsDiffMat(M, M2) > 0.01);
            // value pins (mechanically computed 2026-07; includes a DIAGONAL
            // entry — kills a self-attention-excluded variant mutant)
            const Mp = attentionMatrix([0.9, -0.7, 0.2], 0.15);
            check('T2 attention value pins',
                Math.abs(Mp[0][0] - 0.98516023042651202) < TOL &&
                Math.abs(Mp[0][2] - 0.014773045915840277) < TOL &&
                Math.abs(Mp[2][0] - 0.66151454885669803) < TOL);
        })();

        // T3: permutation operations.
        (function () {
            const rng = mulberry32(7);
            let allValid = true;
            for (let s = 0; s < 20; s++) {
                const p = randomPermutation(8, rng);
                const sorted = p.slice().sort(function (a, b) { return a - b; });
                for (let i = 0; i < 8; i++) if (sorted[i] !== i) allValid = false;
                const inv = inversePermutation(p);
                const comp = permuteVector(permuteVector([0, 1, 2, 3, 4, 5, 6, 7], p), inv);
                for (let i = 0; i < 8; i++) if (comp[i] !== i) allValid = false;
            }
            check('T3 permutation validity + inverse', allValid);
            check('T3 permuteVector pin',
                JSON.stringify(permuteVector([10, 20, 30], [2, 0, 1])) === '[30,10,20]');
            let nonId = true;
            for (let s = 1; s <= 50; s++) {
                const p = randomNonIdentityPermutation(4, mulberry32(s));
                if (isIdentityPermutation(p)) nonId = false;
                // n=2: identity comes up on the FIRST draw with prob 1/2, so
                // the redraw guard is load-bearing here (30/50 seeds measured)
                const q = randomNonIdentityPermutation(2, mulberry32(s));
                if (isIdentityPermutation(q)) nonId = false;
            }
            check('T3 non-identity guarantee', nonId);
            check('T3 n=1 identity honest',
                isIdentityPermutation(randomNonIdentityPermutation(1, mulberry32(1))));
        })();

        // T4: conjugation pin on a GENERIC symmetric matrix (structured 0/1
        // inputs hide algebra mutants) + complete-graph exact invariance.
        (function () {
            const M = [[0, 1, 2], [1, 0, 3], [2, 3, 0]];
            const B = permuteAdjacency(M, [2, 0, 1]);
            check('T4 PAP^T pin',
                JSON.stringify(B) === '[[0,2,3],[2,0,1],[3,1,0]]');
            const C = completeAdjacency(6);
            const rng = mulberry32(5);
            const p = randomNonIdentityPermutation(6, rng);
            const CP = permuteAdjacency(C, p);
            check('T4 complete invariance', maxAbsDiffMat(C, CP) === 0);
            let diagZero = true, offOne = true;
            for (let i = 0; i < 6; i++)
                for (let j = 0; j < 6; j++) {
                    if (i === j && C[i][j] !== 0) diagZero = false;
                    if (i !== j && C[i][j] !== 1) offOne = false;
                }
            check('T4 complete structure', diagZero && offOne);
        })();

        // T5: layer pins (mechanically computed 2026-07; tol 1e-12).
        (function () {
            const A = [[0, 1, 0, 0], [1, 0, 1, 1], [0, 1, 0, 0], [0, 1, 0, 0]];
            const Ah = normalizeAdjacency(A);
            const out = applyGCNLayer([1, -1, 0.5, 0], Ah, 1.5, -0.2);
            const pin = [0.019667377703172197, 0.21698992802828734,
                -0.34109403445213643, -0.62326725114562997];
            let ok = true;
            for (let i = 0; i < 4; i++) if (Math.abs(out[i] - pin[i]) > TOL) ok = false;
            check('T5 GCN layer pin', ok);
            const o2 = applyMLPLayer([1, -2], [[0.5, -1], [2, 0.25]], [0.1, -0.3]);
            const pin2 = [0.98902740220109919, 0.83365460701215521];
            check('T5 MLP layer pin',
                Math.abs(o2[0] - pin2[0]) < TOL && Math.abs(o2[1] - pin2[1]) < TOL);
        })();

        // T6: one-code-path + Transformer input-A independence (bitwise).
        (function () {
            const g = buildSmallWorldGraph(8, 3, 11);
            const h0 = initNodeFeatures(8, 4);
            const layers = initSharedGraphWeights(2, 60);
            // GNN through runForward == manual fixed-Ahat loop
            const r1 = runForward('GNN', h0, g.A, layers, D.tau);
            const Ahat = normalizeAdjacency(g.A);
            let h = h0.slice();
            for (let k = 0; k < 2; k++) h = applyGCNLayer(h, Ahat, layers[k].w, layers[k].b);
            check('T6 GNN path identity', l2diff(r1.history[2], h) === 0);
            // Transformer ignores A: two different adjacencies, identical output
            const g2 = buildSmallWorldGraph(8, 3, 77);
            const t1 = runForward('Transformer', h0, g.A, layers, D.tau);
            const t2 = runForward('Transformer', h0, g2.A, layers, D.tau);
            check('T6 Transformer ignores A', l2diff(t1.history[2], t2.history[2]) === 0);
            // Transformer == manual attention loop
            let ht = h0.slice();
            for (let k = 0; k < 2; k++)
                ht = applyGCNLayer(ht, attentionMatrix(ht, D.tau), layers[k].w, layers[k].b);
            check('T6 Transformer path identity', l2diff(t1.history[2], ht) === 0);
            // aopHistory shape
            check('T6 aopHistory recorded',
                t1.aopHistory.length === 2 && r1.aopHistory.length === 2);
        })();

        // T7: equivariance certificates with NEGATIVE control.
        (function () {
            let maxG = 0, maxT = 0, minM = Infinity;
            for (let s = 1; s <= 10; s++) {
                const g = buildSmallWorldGraph(10, 5, s * 31);
                const h0 = initNodeFeatures(10, s * 17);
                const rng = mulberry32(s * 191);
                const perm = randomNonIdentityPermutation(10, rng);
                for (let L = 1; L <= 3; L++) {
                    const shared = initSharedGraphWeights(L, s * 7 + L);
                    const mlp = initMLPWeights(L, 10, s * 13 + L);
                    const e = computeAllEquivariance(h0, g.A, perm, shared, mlp, D.tau);
                    maxG = Math.max(maxG, e.GNN);
                    maxT = Math.max(maxT, e.Transformer);
                    minM = Math.min(minM, e.MLP);
                }
            }
            check('T7 GNN equivariant (<1e-12)', maxG < 1e-12);
            check('T7 Transformer equivariant (<1e-12)', maxT < 1e-12);
            // negative control: measured min 0.366 over 30 seeds; threshold 0.05
            check('T7 MLP breaks equivariance (>0.05)', minM > 0.05);
            // identity permutation: exactly zero for all three (bitwise)
            const g = buildSmallWorldGraph(10, 5, 42);
            const h0 = initNodeFeatures(10, 23);
            const shared = initSharedGraphWeights(2, 151);
            const mlp = initMLPWeights(2, 10, 242);
            const eId = computeAllEquivariance(h0, g.A, identityPermutation(10), shared, mlp, D.tau);
            check('T7 identity perm exact zero',
                eId.GNN === 0 && eId.Transformer === 0 && eId.MLP === 0);
            // Negative control FOR THE AUDITOR: a known-violating model pushed
            // through the GRAPH-path certificate must report a large violation
            // (a hardcoded-zero mutant inside equivarianceErrorGraph would
            // otherwise pass every equivariant-architecture test trivially).
            const badF = buildForwardFn('MLP', mlp, D.tau); // ignores A; not equivariant
            const rngNC = mulberry32(4242);
            const permNC = randomNonIdentityPermutation(10, rngNC);
            check('T7 graph auditor detects violation (>0.05)',
                equivarianceErrorGraph(badF, h0, g.A, permNC) > 0.05);
        })();

        // T8: graph builder spec at the shipped seed.
        (function () {
            const g = buildSmallWorldGraph(D.n, D.extraEdges, D.graphSeed);
            check('T8 edge count 15', g.edges.length === 15);
            let sym = true, noSelf = true;
            for (let i = 0; i < D.n; i++) {
                if (g.A[i][i] !== 0) noSelf = false;
                for (let j = 0; j < D.n; j++) if (g.A[i][j] !== g.A[j][i]) sym = false;
            }
            check('T8 A symmetric', sym);
            check('T8 no self-loops', noSelf);
            const seen = {};
            let dup = false;
            for (let e = 0; e < g.edges.length; e++) {
                const k = g.edges[e][0] + '-' + g.edges[e][1];
                if (seen[k]) dup = true;
                seen[k] = true;
            }
            check('T8 no duplicate edges', !dup);
            // connectivity (BFS; ring backbone should guarantee it)
            const vis = new Array(D.n).fill(false);
            const q = [0]; vis[0] = true; let cnt = 1;
            while (q.length) {
                const u = q.shift();
                for (let v = 0; v < D.n; v++)
                    if (g.A[u][v] === 1 && !vis[v]) { vis[v] = true; cnt++; q.push(v); }
            }
            check('T8 connected', cnt === D.n);
            const g2 = buildSmallWorldGraph(D.n, D.extraEdges, D.graphSeed);
            check('T8 deterministic', JSON.stringify(g.edges) === JSON.stringify(g2.edges));
            const g3 = buildSmallWorldGraph(D.n, D.extraEdges, D.graphSeed + 1);
            check('T8 seed-sensitive', JSON.stringify(g.edges) !== JSON.stringify(g3.edges));
            // Collision-heavy config (n=4, extras=5): a===b draws occur at
            // EVERY seed 1..20 (measured), so the self-loop guard is
            // load-bearing here, not just at the shipped seed.
            let noSelfDense = true;
            for (let s = 1; s <= 20; s++) {
                const gd = buildSmallWorldGraph(4, 5, s);
                for (let i = 0; i < 4; i++) if (gd.A[i][i] !== 0) noSelfDense = false;
            }
            check('T8 no self-loops (collision-heavy)', noSelfDense);
        })();

        // T9: init determinism and ranges.
        (function () {
            const h1 = initNodeFeatures(10, D.featureSeed);
            const h2 = initNodeFeatures(10, D.featureSeed);
            check('T9 features deterministic', l2diff(h1, h2) === 0);
            let inRange = true;
            for (let i = 0; i < 10; i++) if (h1[i] < -1 || h1[i] >= 1) inRange = false;
            check('T9 features in [-1,1)', inRange);
            const ws = initSharedGraphWeights(4, 149 + 4);
            let magOk = true;
            for (let k = 0; k < 4; k++) {
                const m = Math.abs(ws[k].w);
                if (m < 0.8 || m > 2.0) magOk = false;
                if (Math.abs(ws[k].b) > 0.3) magOk = false;
            }
            check('T9 shared weight ranges', magOk);
            const ml = initMLPWeights(2, 10, 242);
            let mOk = true;
            const sc = 1 / Math.sqrt(10);
            for (let i = 0; i < 10; i++)
                for (let j = 0; j < 10; j++)
                    if (Math.abs(ml[0].W[i][j]) > sc) mOk = false;
            check('T9 MLP weight range', mOk);
        })();

        // T10: story test at the SHIPPED defaults — the phenomena the page
        // prose claims are themselves tests.
        (function () {
            const g = buildSmallWorldGraph(D.n, D.extraEdges, D.graphSeed);
            const h0 = initNodeFeatures(D.n, D.featureSeed);
            // (a) visible per-layer spread for all three panels, depths 1..4
            //     (measured mins: GNN 0.280, Transformer 0.563, MLP 0.227)
            let minStd = Infinity;
            for (let L = 1; L <= D.maxLayers; L++) {
                const shared = getWeightsFor('GNN', L, D.n, D);
                const mlp = getWeightsFor('MLP', L, D.n, D);
                const rG = runForward('GNN', h0, g.A, shared, D.tau);
                const rT = runForward('Transformer', h0, g.A, shared, D.tau);
                const rM = runForward('MLP', h0, g.A, mlp, D.tau);
                for (let k = 1; k <= L; k++) {
                    minStd = Math.min(minStd, stddev(rG.history[k]),
                        stddev(rT.history[k]), stddev(rM.history[k]));
                }
            }
            check('T10 per-layer spread visible (>0.15)', minStd > 0.15);
            // (b) shuffle stream: first 5 permutations, depth 2
            //     (measured MLP min 1.016; thresholds 0.5 / 1e-12)
            const rng = mulberry32(D.shuffleSeed);
            const shared = getWeightsFor('GNN', 2, D.n, D);
            const mlp = getWeightsFor('MLP', 2, D.n, D);
            let okStream = true;
            for (let t = 0; t < 5; t++) {
                const perm = randomNonIdentityPermutation(D.n, rng);
                const e = computeAllEquivariance(h0, g.A, perm, shared, mlp, D.tau);
                if (!(e.GNN < 1e-12 && e.Transformer < 1e-12 && e.MLP > 0.5)) okStream = false;
            }
            check('T10 shuffle stream story', okStream);
        })();

        // T11: structure-matrix display sources.
        (function () {
            const g = buildSmallWorldGraph(6, 2, 3);
            const h0 = initNodeFeatures(6, 9);
            const layers = initSharedGraphWeights(2, 55);
            const rG = runForward('GNN', h0, g.A, layers, D.tau);
            check('T11 GNN display = normalized A',
                maxAbsDiffMat(rG.aopHistory[0], normalizeAdjacency(g.A)) === 0);
            check('T11 GNN display constant across layers',
                maxAbsDiffMat(rG.aopHistory[0], rG.aopHistory[1]) === 0);
            const rT = runForward('Transformer', h0, g.A, layers, D.tau);
            check('T11 Transformer display = attention(h^(k))',
                maxAbsDiffMat(rT.aopHistory[0], attentionMatrix(h0, D.tau)) === 0 &&
                maxAbsDiffMat(rT.aopHistory[1], attentionMatrix(rT.history[1], D.tau)) === 0);
            check('T11 Transformer attention varies by layer',
                maxAbsDiffMat(rT.aopHistory[0], rT.aopHistory[1]) > 1e-6);
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        mulberry32: mulberry32,
        matVec: matVec,
        l2diff: l2diff,
        maxAbsDiffMat: maxAbsDiffMat,
        stddev: stddev,
        normalizeAdjacency: normalizeAdjacency,
        completeAdjacency: completeAdjacency,
        attentionMatrix: attentionMatrix,
        applyGCNLayer: applyGCNLayer,
        applyMLPLayer: applyMLPLayer,
        forwardGraphOp: forwardGraphOp,
        forwardMLP: forwardMLP,
        runForward: runForward,
        buildForwardFn: buildForwardFn,
        identityPermutation: identityPermutation,
        isIdentityPermutation: isIdentityPermutation,
        randomPermutation: randomPermutation,
        randomNonIdentityPermutation: randomNonIdentityPermutation,
        inversePermutation: inversePermutation,
        permuteVector: permuteVector,
        permuteAdjacency: permuteAdjacency,
        equivarianceErrorGraph: equivarianceErrorGraph,
        equivarianceErrorPlain: equivarianceErrorPlain,
        computeAllEquivariance: computeAllEquivariance,
        initSharedGraphWeights: initSharedGraphWeights,
        initMLPWeights: initMLPWeights,
        getWeightsFor: getWeightsFor,
        buildSmallWorldGraph: buildSmallWorldGraph,
        initNodeFeatures: initNodeFeatures,
        DEFAULTS: DEFAULTS,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = GdlCore; }
// ============================================================
// UI layer (#gdl_demo, prefix gdlv-)
// Three panels — MLP (negative control) | GNN | Transformer — reacting to
// ONE shared Shuffle. Self-test gate runs before anything renders.
// Dark island: fixed palette, no var(--), no data-theme/currentColor reads.
// ============================================================

(function () {
    'use strict';

    // ---------- fixed palette ----------
    var C = {
        bg: 'rgba(20,28,40,0.95)',
        panelBg: 'rgba(28,38,54,0.95)',
        border: 'rgba(90,110,140,0.5)',
        text: '#dce6f2',
        dim: '#8fa3bb',
        accent: '#64b5f6',
        good: '#66bb6a',
        bad: '#ef5350',
        warn: '#ffb74d',
        nodeStroke: '#e8eef6',
        edge: 'rgba(150,170,200,0.5)',
        edgeFaint: 'rgba(150,170,200,0.16)',
        negR: 33, negG: 150, negB: 243,   // feature < 0  (blue)
        posR: 239, posG: 83, posB: 80,    // feature > 0  (red)
        midR: 116, midG: 128, midB: 144,  // feature = 0  (neutral)
        heatR: 255, heatG: 183, heatB: 77 // nonnegative heatmap high end
    };

    var ARCHS = ['MLP', 'GNN', 'Transformer'];

    // ---------- helpers ----------
    function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

    function featureColor(h) {
        var t = clamp(h, -1, 1);
        var r, g, b;
        if (t < 0) {
            var u = -t;
            r = C.midR + (C.negR - C.midR) * u;
            g = C.midG + (C.negG - C.midG) * u;
            b = C.midB + (C.negB - C.midB) * u;
        } else {
            r = C.midR + (C.posR - C.midR) * t;
            g = C.midG + (C.posG - C.midG) * t;
            b = C.midB + (C.posB - C.midB) * t;
        }
        return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
    }

    function smoothstep(t) { return t * t * (3 - 2 * t); }

    function lerpVec(a, b, t) {
        var out = new Array(a.length);
        for (var i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
        return out;
    }

    // Circle layout with deterministic jitter (presentation geometry).
    function buildCircleLayout(n, seed) {
        var rng = GdlCore.mulberry32(seed);
        var pts = new Array(n);
        for (var i = 0; i < n; i++) {
            var ang = (2 * Math.PI * i) / n - Math.PI / 2;
            var rad = 0.40 + 0.05 * (rng() - 0.5);
            pts[i] = {
                x: 0.5 + rad * Math.cos(ang) + 0.015 * (rng() - 0.5),
                y: 0.5 + rad * Math.sin(ang) + 0.015 * (rng() - 0.5)
            };
        }
        return pts;
    }

    // ---------- CSS (scoped under #gdl_demo) ----------
    function injectCSS() {
        if (document.getElementById('gdlv-style')) return;
        var css = '' +
            '#gdl_demo{background:' + C.bg + ';border:1px solid ' + C.border + ';' +
            'border-radius:10px;padding:16px;color:' + C.text + ';' +
            'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}' +
            '#gdl_demo .gdlv-title{font-size:1.05rem;font-weight:600;margin:0 0 4px 0;}' +
            '#gdl_demo .gdlv-template{color:' + C.dim + ';font-size:0.88rem;margin:0 0 12px 0;}' +
            '#gdl_demo .gdlv-template code{color:' + C.accent + ';font-family:ui-monospace,Consolas,monospace;font-size:0.9em;background:transparent;}' +
            '#gdl_demo .gdlv-panels{display:flex;flex-wrap:wrap;gap:12px;}' +
            '#gdl_demo .gdlv-panel{flex:1 1 280px;min-width:260px;background:' + C.panelBg + ';' +
            'border:1px solid ' + C.border + ';border-radius:8px;padding:10px;}' +
            '#gdl_demo .gdlv-panel-head{font-weight:600;font-size:0.95rem;margin-bottom:2px;' +
            'display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}' +
            '#gdl_demo .gdlv-tag{font-size:0.7rem;font-weight:600;color:' + C.warn + ';' +
            'border:1px solid ' + C.warn + ';border-radius:4px;padding:1px 5px;}' +
            '#gdl_demo .gdlv-formula{color:' + C.dim + ';font-size:0.78rem;margin-bottom:6px;min-height:2.2em;}' +
            '#gdl_demo .gdlv-graph{width:100%;height:220px;display:block;border-radius:6px;}' +
            '#gdl_demo .gdlv-mlabel{color:' + C.dim + ';font-size:0.75rem;margin:8px 0 3px 0;}' +
            '#gdl_demo .gdlv-heat{width:100%;height:150px;display:block;border-radius:6px;}' +
            '#gdl_demo .gdlv-eq{margin-top:8px;font-size:0.82rem;font-family:ui-monospace,Consolas,monospace;' +
            'padding:6px 8px;border-radius:6px;border:1px solid ' + C.border + ';}' +
            '#gdl_demo .gdlv-eq-good{color:' + C.good + ';}' +
            '#gdl_demo .gdlv-eq-bad{color:' + C.bad + ';}' +
            '#gdl_demo .gdlv-eq-idle{color:' + C.dim + ';}' +
            '#gdl_demo .gdlv-controls{display:flex;flex-wrap:wrap;gap:14px;align-items:center;' +
            'margin-top:14px;padding-top:12px;border-top:1px solid ' + C.border + ';}' +
            '#gdl_demo .gdlv-btn{background:transparent;color:' + C.accent + ';border:1px solid ' + C.accent + ';' +
            'border-radius:6px;padding:6px 14px;font-size:0.88rem;cursor:pointer;}' +
            '#gdl_demo .gdlv-btn:hover{background:rgba(100,181,246,0.12);}' +
            '#gdl_demo .gdlv-ctl{display:flex;align-items:center;gap:6px;font-size:0.85rem;color:' + C.dim + ';}' +
            '#gdl_demo .gdlv-ctl input[type=range]{width:120px;}' +
            '#gdl_demo .gdlv-status{margin-top:8px;font-size:0.8rem;color:' + C.dim + ';' +
            'font-family:ui-monospace,Consolas,monospace;min-height:1.2em;}' +
            '#gdl_demo .gdlv-refusal{border:1px solid ' + C.bad + ';border-radius:8px;padding:14px;color:' + C.bad + ';}' +
            '#gdl_demo .gdlv-refusal ul{margin:8px 0 0 18px;padding:0;}' +
            '@media (max-width: 760px){' +
            '#gdl_demo .gdlv-panels{flex-direction:column;}' +
            '#gdl_demo .gdlv-panel{min-width:0;}' +
            '#gdl_demo .gdlv-graph{height:200px;}' +
            '#gdl_demo .gdlv-heat{height:130px;}' +
            '}';
        var style = document.createElement('style');
        style.id = 'gdlv-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ---------- HTML ----------
    function panelHTML(arch) {
        var head, formula, mlabel;
        if (arch === 'MLP') {
            head = 'MLP <span class="gdlv-tag">negative control</span>';
            formula = 'h<sup>(k+1)</sup> = tanh(W<sub>k</sub> h<sup>(k)</sup> + b<sub>k</sub>) &mdash; learned dense W: index-dependent, no structure matrix';
            mlabel = 'W<sub>1</sub> (learned, dense)';
        } else if (arch === 'GNN') {
            head = 'GNN';
            formula = 'h<sup>(k+1)</sup> = tanh(w<sub>k</sub>&nbsp;&Acirc;&thinsp;h<sup>(k)</sup> + b<sub>k</sub>) &mdash; &Acirc; = D&#771;<sup>&minus;1/2</sup>(A+I)D&#771;<sup>&minus;1/2</sup>: fixed, sparse';
            mlabel = '&Acirc; (fixed across layers)';
        } else {
            head = 'Transformer';
            formula = 'h<sup>(k+1)</sup> = tanh(w<sub>k</sub>&nbsp;&Acirc;(h<sup>(k)</sup>)&thinsp;h<sup>(k)</sup> + b<sub>k</sub>) &mdash; &Acirc;(h)<sub>ij</sub> = softmax<sub>j</sub>(h<sub>i</sub>h<sub>j</sub>/&tau;): computed from features';
            mlabel = '&Acirc;(h<sup>(0)</sup>) &mdash; attention at layer 1';
        }
        return '<div class="gdlv-panel" id="gdlv-panel-' + arch + '">' +
            '<div class="gdlv-panel-head">' + head + '</div>' +
            '<div class="gdlv-formula">' + formula + '</div>' +
            '<canvas class="gdlv-graph" id="gdlv-graph-' + arch + '"></canvas>' +
            '<div class="gdlv-mlabel" id="gdlv-mlabel-' + arch + '">' + mlabel + '</div>' +
            '<canvas class="gdlv-heat" id="gdlv-heat-' + arch + '"></canvas>' +
            '<div class="gdlv-eq gdlv-eq-idle" id="gdlv-eq-' + arch + '">equivariance: press Shuffle to test</div>' +
            '</div>';
    }

    function buildHTML(container) {
        container.innerHTML =
            '<div class="gdlv-title">One layer template, three structure matrices</div>' +
            '<div class="gdlv-template">Shared weights (w<sub>k</sub>, b<sub>k</sub>) between GNN and Transformer; ' +
            'the ONLY difference between those two panels is the structure matrix. ' +
            'Node color = scalar feature (blue &lt; 0 &lt; red). ' +
            'Shuffle applies one permutation P to node features and adjacency in all three panels at once; ' +
            'equivariance <code>f(Ph, PAP<sup>&#8868;</sup>) = Pf(h, A)</code> is then tested on the original (unshuffled) data. ' +
            '&tau; = 0.15; weights are untrained, drawn once from a fixed seed.</div>' +
            '<div class="gdlv-panels">' +
            panelHTML('MLP') + panelHTML('GNN') + panelHTML('Transformer') +
            '</div>' +
            '<div class="gdlv-controls">' +
            '<button class="gdlv-btn" id="gdlv-shuffle">Shuffle Node Labels</button>' +
            '<button class="gdlv-btn" id="gdlv-reset">Reset</button>' +
            '<span class="gdlv-ctl">Layer <input type="range" id="gdlv-layer" min="0" max="2" step="1" value="0">' +
            '<span id="gdlv-layer-val">0 / 2</span></span>' +
            '<span class="gdlv-ctl">Depth <input type="range" id="gdlv-depth" min="1" max="4" step="1" value="2">' +
            '<span id="gdlv-depth-val">2</span></span>' +
            '</div>' +
            '<div class="gdlv-status" id="gdlv-status">P = identity (no shuffle applied)</div>';
    }

    function renderRefusal(container, failures) {
        injectCSS();
        var items = '';
        for (var i = 0; i < failures.length; i++) {
            items += '<li>' + failures[i] + '</li>';
        }
        container.innerHTML =
            '<div class="gdlv-refusal"><strong>Demo disabled: mathematical self-tests failed.</strong>' +
            '<ul>' + items + '</ul>' +
            '<p>The demo refuses to render rather than display unverified quantities.</p></div>';
    }

    // ---------- canvas plumbing ----------
    function sizeCanvas(canvas) {
        var rect = canvas.getBoundingClientRect();
        var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, W: w, H: h };
    }

    // ---------- drawing ----------
    function drawGraph(cv, arch, state, dispH) {
        var ctx = cv.ctx, W = cv.W, H = cv.H;
        var n = state.n;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);
        var px = function (p) { return { x: p.x * W, y: p.y * H }; };
        var i, j, a, b;
        // edges
        if (arch === 'GNN') {
            ctx.strokeStyle = C.edge;
            ctx.lineWidth = 1.4;
            for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
                if (state.currentA[i][j] === 1) {
                    a = px(state.positions[i]); b = px(state.positions[j]);
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
            }
        } else if (arch === 'Transformer') {
            ctx.strokeStyle = C.edgeFaint;
            ctx.lineWidth = 1;
            for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
                a = px(state.positions[i]); b = px(state.positions[j]);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
        }
        // MLP: no edges — the architecture has no notion of graph structure.
        // nodes
        var R = Math.max(7, Math.min(11, Math.round(Math.min(W, H) / 24)));
        for (i = 0; i < n; i++) {
            var p = px(state.positions[i]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, R, 0, 2 * Math.PI);
            ctx.fillStyle = featureColor(dispH[i]);
            ctx.fill();
            ctx.strokeStyle = C.nodeStroke;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            // label: which ORIGINAL node sits in this slot under P
            ctx.fillStyle = C.text;
            ctx.font = '10px ui-monospace,Consolas,monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(state.perm[i]), p.x, p.y - R - 8);
        }
    }

    function drawHeat(cv, M, signed) {
        var ctx = cv.ctx, W = cv.W, H = cv.H;
        var n = M.length;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);
        var side = Math.min(W, H) - 24;
        var cell = side / n;
        var x0 = (W - side) / 2, y0 = 8;
        var mx = 0, i, j;
        for (i = 0; i < n; i++) for (j = 0; j < n; j++) mx = Math.max(mx, Math.abs(M[i][j]));
        if (mx === 0) mx = 1;
        for (i = 0; i < n; i++) {
            for (j = 0; j < n; j++) {
                var v = M[i][j] / mx;
                var r, g, b;
                if (signed) {
                    if (v < 0) { var u = -v; r = 20 + (C.negR - 20) * u; g = 28 + (C.negG - 28) * u; b = 40 + (C.negB - 40) * u; }
                    else { r = 20 + (C.posR - 20) * v; g = 28 + (C.posG - 28) * v; b = 40 + (C.posB - 40) * v; }
                } else {
                    r = 20 + (C.heatR - 20) * v; g = 28 + (C.heatG - 28) * v; b = 40 + (C.heatB - 40) * v;
                }
                ctx.fillStyle = 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
                ctx.fillRect(x0 + j * cell, y0 + i * cell, Math.ceil(cell), Math.ceil(cell));
            }
        }
        ctx.strokeStyle = C.border;
        ctx.strokeRect(x0, y0, side, side);
        ctx.fillStyle = C.dim;
        ctx.font = '9px ui-monospace,Consolas,monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('max |entry| = ' + mx.toPrecision(3), x0, y0 + side + 3);
    }

    // ---------- state & orchestration ----------
    function makeState() {
        var D = GdlCore.DEFAULTS;
        var g = GdlCore.buildSmallWorldGraph(D.n, D.extraEdges, D.graphSeed);
        var state = {
            n: D.n,
            originalA: g.A,
            originalH: GdlCore.initNodeFeatures(D.n, D.featureSeed),
            positions: buildCircleLayout(D.n, D.layoutSeed),
            perm: GdlCore.identityPermutation(D.n),
            numLayers: D.numLayersDefault,
            shuffleRng: GdlCore.mulberry32(D.shuffleSeed),
            displayedLayer: 0,
            results: null,
            eq: null,
            currentH: null,
            currentA: null,
            animToken: 0
        };
        applyPerm(state);
        recompute(state);
        return state;
    }

    function applyPerm(state) {
        state.currentH = GdlCore.permuteVector(state.originalH, state.perm);
        state.currentA = GdlCore.permuteAdjacency(state.originalA, state.perm);
    }

    function weights(state) {
        var D = GdlCore.DEFAULTS;
        return {
            shared: GdlCore.getWeightsFor('GNN', state.numLayers, state.n, D),
            mlp: GdlCore.getWeightsFor('MLP', state.numLayers, state.n, D)
        };
    }

    // Forward passes for DISPLAY run on the current (possibly shuffled) data.
    function recompute(state) {
        var D = GdlCore.DEFAULTS;
        // weights depend only on numLayers — cached here, never per frame
        state.w = weights(state);
        var w = state.w;
        state.results = {
            MLP: GdlCore.runForward('MLP', state.currentH, state.currentA, w.mlp, D.tau),
            GNN: GdlCore.runForward('GNN', state.currentH, state.currentA, w.shared, D.tau),
            Transformer: GdlCore.runForward('Transformer', state.currentH, state.currentA, w.shared, D.tau)
        };
        // The equivariance certificate is asked of the ARCHITECTURE, so it is
        // always computed on the ORIGINAL (unshuffled) h and A — never on the
        // displayed state. (v1-regression guard; asserted by the smoke test.)
        if (GdlCore.isIdentityPermutation(state.perm)) {
            state.eq = null;
        } else {
            state.eq = GdlCore.computeAllEquivariance(
                state.originalH, state.originalA, state.perm, w.shared, w.mlp, D.tau);
        }
    }

    // ---------- rendering at a (possibly fractional) layer ----------
    function heatFor(state, arch, layerIdx) {
        // Structure matrix of the transition h^(k) -> h^(k+1), where
        // k = min(layerIdx, L-1): at the final layer we keep showing the last
        // applied matrix.
        var k = Math.min(layerIdx, state.numLayers - 1);
        if (arch === 'MLP') return state.w.mlp[k].W;
        return state.results[arch].aopHistory[k];
    }

    function mlabelFor(state, arch, layerIdx) {
        var k = Math.min(layerIdx, state.numLayers - 1);
        if (arch === 'MLP') return 'W<sub>' + (k + 1) + '</sub> (learned, dense)';
        if (arch === 'GNN') return '&Acirc; (fixed across layers)';
        return '&Acirc;(h<sup>(' + k + ')</sup>) &mdash; attention at layer ' + (k + 1);
    }

    function renderAt(state, refs, layerFloat) {
        var k = Math.floor(layerFloat);
        var t = layerFloat - k;
        var i;
        for (i = 0; i < ARCHS.length; i++) {
            var arch = ARCHS[i];
            var hist = state.results[arch].history;
            var kk = Math.min(k, hist.length - 1);
            var dispH;
            if (t > 0 && kk + 1 < hist.length) {
                dispH = lerpVec(hist[kk], hist[kk + 1], smoothstep(t));
            } else {
                dispH = hist[kk];
            }
            drawGraph(refs.graph[arch], arch, state, dispH);
            drawHeat(refs.heat[arch], heatFor(state, arch, kk), arch === 'MLP');
            refs.mlabel[arch].innerHTML = mlabelFor(state, arch, kk);
        }
    }

    function renderEq(state, refs) {
        for (var i = 0; i < ARCHS.length; i++) {
            var arch = ARCHS[i];
            var el = refs.eq[arch];
            if (!state.eq) {
                el.className = 'gdlv-eq gdlv-eq-idle';
                el.textContent = 'equivariance: press Shuffle to test';
            } else {
                var e = state.eq[arch];
                if (e < 1e-9) {
                    el.className = 'gdlv-eq gdlv-eq-good';
                    el.textContent = 'equivariant: error = ' + e.toExponential(2);
                } else {
                    el.className = 'gdlv-eq gdlv-eq-bad';
                    el.textContent = 'BROKEN: error = ' + e.toExponential(2);
                }
            }
        }
    }

    function renderStatus(state, refs) {
        if (GdlCore.isIdentityPermutation(state.perm)) {
            refs.status.textContent = 'P = identity (no shuffle applied)';
        } else {
            refs.status.textContent = 'P = [' + state.perm.join(',') + ']';
        }
    }

    function setLayerUI(state, refs, layerFloat) {
        var k = Math.min(Math.round(layerFloat), state.numLayers);
        refs.layerSlider.value = String(k);
        refs.layerVal.textContent = k + ' / ' + state.numLayers;
    }

    // ---------- animation ----------
    function animateForward(state, refs) {
        state.animToken++;
        var token = state.animToken;
        var msPerLayer = 500;
        var total = state.numLayers * msPerLayer;
        var t0 = null;
        function frame(now) {
            if (token !== state.animToken) return; // superseded
            if (t0 === null) t0 = now;
            var elapsed = now - t0;
            var lf = Math.min(state.numLayers, (elapsed / total) * state.numLayers);
            state.displayedLayer = Math.floor(lf);
            renderAt(state, refs, lf);
            setLayerUI(state, refs, Math.floor(lf));
            if (lf < state.numLayers) {
                requestAnimationFrame(frame);
            } else {
                state.displayedLayer = state.numLayers;
                renderAt(state, refs, state.numLayers);
                setLayerUI(state, refs, state.numLayers);
            }
        }
        requestAnimationFrame(frame);
    }

    // ---------- init ----------
    function init() {
        var container = document.getElementById('gdl_demo');
        if (!container) return;
        if (container.dataset.gdlvInit) return; // idempotency guard
        container.dataset.gdlvInit = '1';

        // SELF-TEST GATE: nothing renders on broken math.
        var gate = GdlCore.runSelfTests();
        if (!gate.passed) {
            renderRefusal(container, gate.failures);
            return;
        }

        injectCSS();
        buildHTML(container);

        var refs = {
            graph: {}, heat: {}, eq: {}, mlabel: {},
            shuffleBtn: document.getElementById('gdlv-shuffle'),
            resetBtn: document.getElementById('gdlv-reset'),
            layerSlider: document.getElementById('gdlv-layer'),
            layerVal: document.getElementById('gdlv-layer-val'),
            depthSlider: document.getElementById('gdlv-depth'),
            depthVal: document.getElementById('gdlv-depth-val'),
            status: document.getElementById('gdlv-status')
        };
        var i;
        for (i = 0; i < ARCHS.length; i++) {
            var a = ARCHS[i];
            refs.graph[a] = sizeCanvas(document.getElementById('gdlv-graph-' + a));
            refs.heat[a] = sizeCanvas(document.getElementById('gdlv-heat-' + a));
            refs.eq[a] = document.getElementById('gdlv-eq-' + a);
            refs.mlabel[a] = document.getElementById('gdlv-mlabel-' + a);
        }

        var state = makeState();
        renderEq(state, refs);
        renderStatus(state, refs);
        animateForward(state, refs);

        // ---- handlers ----
        refs.shuffleBtn.addEventListener('click', function () {
            state.perm = GdlCore.randomNonIdentityPermutation(state.n, state.shuffleRng);
            applyPerm(state);
            recompute(state);
            renderEq(state, refs);
            renderStatus(state, refs);
            animateForward(state, refs);
        });

        refs.resetBtn.addEventListener('click', function () {
            state.perm = GdlCore.identityPermutation(state.n);
            applyPerm(state);
            recompute(state);
            renderEq(state, refs);
            renderStatus(state, refs);
            animateForward(state, refs);
        });

        refs.layerSlider.addEventListener('input', function () {
            state.animToken++; // cancel any running animation
            var k = parseInt(refs.layerSlider.value, 10) || 0;
            k = Math.max(0, Math.min(state.numLayers, k));
            state.displayedLayer = k;
            refs.layerVal.textContent = k + ' / ' + state.numLayers;
            renderAt(state, refs, k);
        });

        refs.depthSlider.addEventListener('input', function () {
            var L = parseInt(refs.depthSlider.value, 10) || 2;
            L = Math.max(1, Math.min(GdlCore.DEFAULTS.maxLayers, L));
            state.numLayers = L;
            refs.depthVal.textContent = String(L);
            refs.layerSlider.max = String(L);
            recompute(state);
            renderEq(state, refs);
            renderStatus(state, refs);
            animateForward(state, refs);
        });

        // resize: re-size canvases and redraw at the current layer
        var resizePending = false;
        window.addEventListener('resize', function () {
            if (resizePending) return;
            resizePending = true;
            requestAnimationFrame(function () {
                resizePending = false;
                for (var i = 0; i < ARCHS.length; i++) {
                    var a = ARCHS[i];
                    refs.graph[a] = sizeCanvas(document.getElementById('gdlv-graph-' + a));
                    refs.heat[a] = sizeCanvas(document.getElementById('gdlv-heat-' + a));
                }
                renderAt(state, refs, state.displayedLayer);
            });
        });
    }

    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();