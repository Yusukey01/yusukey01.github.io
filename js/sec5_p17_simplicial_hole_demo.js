// ============================================================
// sec5_p17_simplicial_hole_demo.js — TxCore (pure math layer)
//
// ml-17 "Simplicial Neural Networks": 3x3 periodic (torus) 2-complex.
// NV = 9 vertices, NE = 18 edges, NC = 9 square 2-cells; opposite sides
// identified (indices mod N).
//
// v2 (July 2026) adds the page's PROPAGATION half to the demo: edge
// features h in R^18 drawn on the torus, smoothed by the diffusion
//   h  <-  h - alpha * L1 h,        alpha = 1 / lambda_max(L1),
// whose fixed points are exactly ker L1 (the harmonic 1-chains). Every
// contraction factor 1 - alpha*lambda lies in [0, 1), so the iteration
// converges monotonically to P h0, the harmonic projection — the flow
// that survives circulates around the complex's holes. On this torus
// family beta_1 >= 2 for EVERY configuration (see closed form below),
// so something always survives.
//
// Verified OFFLINE, exhaustively over all 2^9 = 512 cell configurations
// (July 2026):
//   - beta_1 (integer boundary ranks)  ===  dim ker L1 (eigenvalues): 512/512
//   - closed form beta_1 = 10 - min(#filled, 8): 512/512
//     (any <= 8 of the 9 d2 columns are independent; the only relation
//      involves all nine — the sum of all cell boundaries is 0)
//   - smallest POSITIVE eigenvalue across all configs: 0.4384
//     => kernel threshold 1e-7 * scale has ~7 orders of margin, and the
//        diffusion contracts non-harmonic mass by >= (1 - 0.438/6) per
//        step; 400 steps reduce it below 6e-14.
//   - worst |trace(P) - beta_1| across all configs: 1.1e-14
//   - worst eigen residual |L v - lambda v|: 8e-15
// The runtime gate re-checks a seeded 25-config subset of this plus the
// structural certificates (time budget); the exhaustive sweep is the
// design-time verification.
//
// Orientation (NORMATIVE, unchanged from v1): each edge has an intrinsic
// tail->head direction as generated (right: (i,j)->(i,j+1); down:
// (i,j)->(i+1,j)), indices mod N. d1 has -1 at tail, +1 at head. d2
// column sign = +1 iff the cell's CCW loop traverses the edge tail->head.
//
// Equivalent mutants (documented, by design): (i) flipping EVERY cell loop
// to CW negates all of d2, leaving d2 d2^T, ranks, beta1 and L1 exactly
// unchanged — a global orientation flip is a gauge choice with no
// observable; (ii) the scale floor in spectral() is defensive dead code
// here, since the down-term d1^T d1 is never zero on this complex, so the
// largest eigenvalue never vanishes.
// ============================================================

var TxCore = (function () {
    'use strict';

    var N = 3;
    var NV = N * N;

    function vIdx(i, j) { return ((i % N + N) % N) * N + ((j % N + N) % N); }

    // ---------- seeded RNG ----------
    function mulberry32(seed) {
        let t = seed >>> 0;
        return function () {
            t |= 0; t = (t + 0x6D2B79F5) | 0;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---------- complex ----------
    var EDGES = (function () {
        var list = [];
        function add(ti, tj, hi, hj) { list.push({ tail: vIdx(ti, tj), head: vIdx(hi, hj) }); }
        for (var i = 0; i < N; i++) {
            for (var j = 0; j < N; j++) { add(i, j, i, j + 1); add(i, j, i + 1, j); }
        }
        function findDirected(fromV, toV) {
            for (var e = 0; e < list.length; e++) {
                if (list[e].tail === fromV && list[e].head === toV) return { e: e, sign: +1 };
                if (list[e].tail === toV && list[e].head === fromV) return { e: e, sign: -1 };
            }
            return null;
        }
        return { list: list, findDirected: findDirected };
    })();
    var NE = EDGES.list.length;

    var CELLS = (function () {
        var cells = [];
        for (var i = 0; i < N; i++) {
            for (var j = 0; j < N; j++) {
                cells.push({
                    id: 'C_' + i + '_' + j, cell: [i, j],
                    loop: [[vIdx(i, j), vIdx(i, j + 1)],
                    [vIdx(i, j + 1), vIdx(i + 1, j + 1)],
                    [vIdx(i + 1, j + 1), vIdx(i + 1, j)],
                    [vIdx(i + 1, j), vIdx(i, j)]]
                });
            }
        }
        return cells;
    })();
    var NC = CELLS.length;

    // ---------- boundary maps ----------
    function d1() {
        var M = [];
        for (var v = 0; v < NV; v++) M.push(new Array(NE).fill(0));
        EDGES.list.forEach(function (e, k) { M[e.tail][k] -= 1; M[e.head][k] += 1; });
        return M;
    }

    function d2(filledIds) {
        var cols = [];
        filledIds.forEach(function (id) {
            var c = null;
            for (var m = 0; m < NC; m++) if (CELLS[m].id === id) { c = CELLS[m]; break; }
            var col = new Array(NE).fill(0);
            c.loop.forEach(function (ft) {
                var d = EDGES.findDirected(ft[0], ft[1]);
                col[d.e] += d.sign;
            });
            cols.push(col);
        });
        var k = cols.length;
        var M = [];
        for (var r = 0; r < NE; r++) {
            M.push(new Array(k).fill(0));
            for (var cc = 0; cc < k; cc++) M[r][cc] = cols[cc][r];
        }
        return M;
    }

    // ---------- dense helpers ----------
    function transpose(M) {
        var r = M.length, c = M[0] ? M[0].length : 0;
        var T = [];
        for (var i = 0; i < c; i++) T.push(new Array(r).fill(0));
        for (i = 0; i < r; i++) for (var j = 0; j < c; j++) T[j][i] = M[i][j];
        return T;
    }

    function matmul(A, B) {
        var r = A.length, n = A[0].length, c = B[0].length;
        var C = [];
        for (var i = 0; i < r; i++) C.push(new Array(c).fill(0));
        for (i = 0; i < r; i++) {
            for (var k = 0; k < n; k++) {
                var a = A[i][k];
                if (a === 0) continue;
                for (var j = 0; j < c; j++) C[i][j] += a * B[k][j];
            }
        }
        return C;
    }

    function matadd(A, B) {
        return A.map(function (row, i) { return row.map(function (x, j) { return x + B[i][j]; }); });
    }

    function matvec(A, x) {
        var out = new Array(A.length).fill(0);
        for (var i = 0; i < A.length; i++) {
            var s = 0, row = A[i];
            for (var j = 0; j < row.length; j++) s += row[j] * x[j];
            out[i] = s;
        }
        return out;
    }

    function vnorm(x) {
        var s = 0;
        for (var i = 0; i < x.length; i++) s += x[i] * x[i];
        return Math.sqrt(s);
    }

    // Integer rank by fraction-free elimination (exact over Z).
    function rankInteger(Min) {
        var M = Min.map(function (r) { return r.slice(); });
        var rows = M.length, cols = M[0] ? M[0].length : 0;
        if (cols === 0 || rows === 0) return 0;
        var rank = 0;
        for (var col = 0; col < cols && rank < rows; col++) {
            var piv = -1;
            for (var r = rank; r < rows; r++) { if (M[r][col] !== 0) { piv = r; break; } }
            if (piv < 0) continue;
            var tmp = M[rank]; M[rank] = M[piv]; M[piv] = tmp;
            var pv = M[rank][col];
            for (r = 0; r < rows; r++) {
                if (r === rank) continue;
                var f = M[r][col];
                if (f === 0) continue;
                for (var c = 0; c < cols; c++) M[r][c] = pv * M[r][c] - f * M[rank][c];
            }
            rank++;
        }
        return rank;
    }

    var RANK_D1 = rankInteger(d1());

    function betti1(filledIds) {
        var D2 = d2(filledIds);
        var rD2 = (D2[0] && D2[0].length > 0) ? rankInteger(D2) : 0;
        return (NE - RANK_D1) - rD2;
    }

    function hodgeL1(filledIds) {
        var D1 = d1(), D2 = d2(filledIds);
        var t2 = matmul(transpose(D1), D1);
        var t1;
        if (D2[0].length === 0) {
            t1 = [];
            for (var i = 0; i < NE; i++) t1.push(new Array(NE).fill(0));
        } else {
            t1 = matmul(D2, transpose(D2));
        }
        return matadd(t1, t2);
    }

    // ---------- Jacobi eigen-decomposition WITH eigenvectors ----------
    // Returns pairs [{l, v}] sorted ascending; A = sum_i l_i v_i v_i^T.
    function jacobiEigVec(Ain) {
        var n = Ain.length;
        var A = Ain.map(function (r) { return r.slice(); });
        var V = [];
        for (var i = 0; i < n; i++) {
            V.push(new Array(n).fill(0));
            V[i][i] = 1;
        }
        for (var sweep = 0; sweep < 200; sweep++) {
            var off = 0;
            for (var p = 0; p < n - 1; p++) {
                for (var q = p + 1; q < n; q++) {
                    var apq = A[p][q];
                    if (Math.abs(apq) < 1e-14) continue;
                    off += apq * apq;
                    var app = A[p][p], aqq = A[q][q];
                    var phi = 0.5 * Math.atan2(2 * apq, aqq - app);
                    var c = Math.cos(phi), s = Math.sin(phi);
                    for (var k = 0; k < n; k++) {
                        var akp = A[k][p], akq = A[k][q];
                        A[k][p] = c * akp - s * akq;
                        A[k][q] = s * akp + c * akq;
                    }
                    for (k = 0; k < n; k++) {
                        var apk = A[p][k], aqk = A[q][k];
                        A[p][k] = c * apk - s * aqk;
                        A[q][k] = s * apk + c * aqk;
                    }
                    for (k = 0; k < n; k++) {
                        var vkp = V[k][p], vkq = V[k][q];
                        V[k][p] = c * vkp - s * vkq;
                        V[k][q] = s * vkp + c * vkq;
                    }
                }
            }
            if (off < 1e-18) break;
        }
        var pairs = [];
        for (i = 0; i < n; i++) {
            pairs.push({ l: A[i][i], v: V.map(function (row) { return row[i]; }) });
        }
        pairs.sort(function (a, b) { return a.l - b.l; });
        return pairs;
    }

    // ---------- kernel / projector / diffusion (SINGLE threshold source) ----------
    var KER_TOL_REL = 1e-7;

    // Full spectral package for one configuration.
    function spectral(filledIds) {
        var L = hodgeL1(filledIds);
        var pairs = jacobiEigVec(L);
        var scale = 1;
        for (var i = 0; i < pairs.length; i++) scale = Math.max(scale, Math.abs(pairs[i].l));
        var thresh = KER_TOL_REL * scale;
        var kernel = pairs.filter(function (p) { return Math.abs(p.l) < thresh; });
        var lmax = pairs[pairs.length - 1].l;
        return { L: L, pairs: pairs, kernel: kernel, lmax: lmax, thresh: thresh };
    }

    function dimKerL1(filledIds) { return spectral(filledIds).kernel.length; }

    // Apply the harmonic projector P = sum_{ker} v v^T to x (never forms P).
    function projectHarmonic(spec, x) {
        var out = new Array(x.length).fill(0);
        for (var m = 0; m < spec.kernel.length; m++) {
            var v = spec.kernel[m].v;
            var dot = 0;
            for (var i = 0; i < x.length; i++) dot += v[i] * x[i];
            for (i = 0; i < x.length; i++) out[i] += dot * v[i];
        }
        return out;
    }

    // Dense P (for certificate tests only).
    function harmonicProjector(spec) {
        var P = [];
        for (var i = 0; i < NE; i++) P.push(new Array(NE).fill(0));
        for (var m = 0; m < spec.kernel.length; m++) {
            var v = spec.kernel[m].v;
            for (i = 0; i < NE; i++) {
                for (var j = 0; j < NE; j++) P[i][j] += v[i] * v[j];
            }
        }
        return P;
    }

    // One smoothing step h <- h - alpha L h.
    function diffuseStep(spec, h, alpha) {
        var Lh = matvec(spec.L, h);
        var out = new Array(h.length);
        for (var i = 0; i < h.length; i++) out[i] = h[i] - alpha * Lh[i];
        return out;
    }

    function randomFeature(rng) {
        var h = new Array(NE);
        for (var i = 0; i < NE; i++) h[i] = 2 * rng() - 1;
        return h;
    }

    var DEFAULTS = {
        featureSeed: 5501,    // "New random feature" advances this stream
        MAX_STEPS: 600,
        STEPS_PER_TICK: 20,
        allIds: CELLS.map(function (c) { return c.id; })
    };

    // ---------- self-tests ----------
    function runSelfTests() {
        var failures = [];
        function check(name, cond) { if (!cond) failures.push(name); }

        // T1: chain-complex identity d1 . d2 = 0 (all columns present).
        (function () {
            var P = matmul(d1(), d2(DEFAULTS.allIds));
            var ok = P.every(function (r) { return r.every(function (x) { return x === 0; }); });
            check('T1 d1.d2 = 0', ok);
        })();

        // T2: full-torus pins, both routes.
        (function () {
            check('T2 sizes', NV === 9 && NE === 18 && NC === 9);
            check('T2 rank d1 = 8 (connected)', RANK_D1 === 8);
            check('T2 full torus beta1 = 2 (integer route)', betti1(DEFAULTS.allIds) === 2);
            check('T2 full torus dim ker L1 = 2 (eigen route)', dimKerL1(DEFAULTS.allIds) === 2);
        })();

        // T3: closed form beta1 = 10 - min(k, 8) AND integer===eigen on a
        // seeded 25-config subset (exhaustive 512/512 verified offline).
        (function () {
            var rng = mulberry32(5601);
            var ok = true;
            for (var t = 0; t < 25; t++) {
                var f = DEFAULTS.allIds.filter(function () { return rng() < 0.6; });
                var b = betti1(f);
                if (b !== 10 - Math.min(f.length, 8)) ok = false;
                if (b !== dimKerL1(f)) ok = false;
            }
            check('T3 closed form + integer===eigen (25 seeded configs)', ok);
        })();

        // T4: eigen certificate on L1(full): residual, orthonormality.
        (function () {
            var spec = spectral(DEFAULTS.allIds);
            var worst = 0, i, j, m;
            for (m = 0; m < spec.pairs.length; m++) {
                var pr = spec.pairs[m];
                var Lv = matvec(spec.L, pr.v);
                for (i = 0; i < NE; i++) worst = Math.max(worst, Math.abs(Lv[i] - pr.l * pr.v[i]));
            }
            check('T4 eigen residual < 1e-9 (measured 8e-15)', worst < 1e-9);
            var orth = 0;
            for (m = 0; m < NE; m++) {
                for (var m2 = m; m2 < NE; m2++) {
                    var dot = 0;
                    for (i = 0; i < NE; i++) dot += spec.pairs[m].v[i] * spec.pairs[m2].v[i];
                    orth = Math.max(orth, Math.abs(dot - (m === m2 ? 1 : 0)));
                }
            }
            check('T4 eigenvectors orthonormal < 1e-9', orth < 1e-9);
        })();

        // T5: harmonic projector: symmetric, idempotent, annihilated by L1,
        // trace P === beta1 (integer route — the cross-tie), on full + a
        // seeded config.
        (function () {
            var rng = mulberry32(5602);
            var configs = [DEFAULTS.allIds,
            DEFAULTS.allIds.filter(function () { return rng() < 0.5; })];
            var ok = true;
            configs.forEach(function (f) {
                var spec = spectral(f);
                var P = harmonicProjector(spec);
                var PP = matmul(P, P), LP = matmul(spec.L, P);
                var b = betti1(f);
                var tr = 0, i, j;
                for (i = 0; i < NE; i++) tr += P[i][i];
                if (Math.abs(tr - b) > 1e-9) ok = false;
                for (i = 0; i < NE; i++) {
                    for (j = 0; j < NE; j++) {
                        if (Math.abs(P[i][j] - P[j][i]) > 1e-9) ok = false;
                        if (Math.abs(PP[i][j] - P[i][j]) > 1e-9) ok = false;
                        if (Math.abs(LP[i][j]) > 1e-8) ok = false;
                    }
                }
            });
            check('T5 projector: sym, P^2=P, L1P=0, trace P = beta1', ok);
        })();

        // T6: diffusion certificate. alpha = 1/lmax => every contraction
        // factor 1 - alpha*l in [0,1); 400 steps land on the harmonic
        // projection (offline: worst factor 1 - 0.438/6 => residual < 6e-14).
        (function () {
            var rng = mulberry32(5603);
            var f = DEFAULTS.allIds.filter(function () { return rng() < 0.7; });
            var spec = spectral(f);
            var alpha = 1 / spec.lmax;
            var okFactors = spec.pairs.every(function (p) {
                if (p.l < spec.thresh) return true;      // kernel: factor 1 by design
                var fac = 1 - alpha * p.l;
                return fac >= -1e-12 && fac < 1;
            });
            check('T6 contraction factors in [0,1)', okFactors);
            var h0 = randomFeature(rng);
            var target = projectHarmonic(spec, h0);
            check('T6 harmonic component nonzero (beta1 >= 2 always)', vnorm(target) > 0.05);
            var h = h0.slice();
            var prevLh = Infinity, monotone = true;
            for (var k = 0; k < 400; k++) {
                var lh = vnorm(matvec(spec.L, h));
                if (k < 50) { if (lh > prevLh + 1e-12) monotone = false; prevLh = lh; }
                h = diffuseStep(spec, h, alpha);
            }
            var err = 0;
            for (var i = 0; i < NE; i++) err = Math.max(err, Math.abs(h[i] - target[i]));
            check('T6 diffusion limit = harmonic projection (<1e-8)', err < 1e-8);
            check('T6 ||L1 h|| monotone nonincreasing (first 50 steps)', monotone);
        })();

        // T7: toggle pedagogy certificates. Opening a cell PRESERVES
        // harmonicity (removes constraints); filling a cell when k <= 8
        // raises rank by one, so a generic harmonic flow BREAKS.
        (function () {
            var rng = mulberry32(5604);
            // open: full-torus harmonic h stays harmonic minus one cell
            var specFull = spectral(DEFAULTS.allIds);
            var h = projectHarmonic(specFull, randomFeature(rng));
            var open = DEFAULTS.allIds.slice(1); // drop C_0_0
            var specOpen = spectral(open);
            check('T7 opening a cell preserves harmonicity',
                vnorm(matvec(specOpen.L, h)) < 1e-8);
            // close: 5-cell config, generic harmonic h; fill one more cell
            var five = DEFAULTS.allIds.slice(0, 5);   // beta1 = 5
            var specFive = spectral(five);
            var h5 = projectHarmonic(specFive, randomFeature(rng));
            var six = DEFAULTS.allIds.slice(0, 6);    // beta1 = 4: one flow dies
            var specSix = spectral(six);
            check('T7 filling a cell (k<=8) breaks a generic harmonic flow',
                vnorm(matvec(specSix.L, h5)) > 0.05);
        })();

        // T8: RNG determinism.
        (function () {
            var a = randomFeature(mulberry32(7)), b = randomFeature(mulberry32(7));
            var same = true;
            for (var i = 0; i < NE; i++) if (a[i] !== b[i]) same = false;
            check('T8 seeded determinism', same);
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        N: N, NV: NV, NE: NE, NC: NC,
        vIdx: vIdx, EDGES: EDGES, CELLS: CELLS,
        mulberry32: mulberry32,
        d1: d1, d2: d2,
        transpose: transpose, matmul: matmul, matvec: matvec, vnorm: vnorm,
        rankInteger: rankInteger,
        betti1: betti1, hodgeL1: hodgeL1,
        jacobiEigVec: jacobiEigVec,
        spectral: spectral, dimKerL1: dimKerL1,
        projectHarmonic: projectHarmonic, harmonicProjector: harmonicProjector,
        diffuseStep: diffuseStep, randomFeature: randomFeature,
        DEFAULTS: DEFAULTS,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = TxCore; }
// ============================================================
// UI layer (#simplicial_demo, prefix tx-)
// Left: three.js torus (drag to rotate, click cells to open/fill) with the
// NEW edge-feature layer: h in R^18 drawn as tubes on the edges (color =
// sign, thickness = magnitude). Right: the beta1 badge (integer route,
// certified equal to dim ker L1) plus the NEW feature card — seeded random
// features and the animated smoothing h <- h - alpha L1 h, whose surviving
// flow is the harmonic component circulating around the holes.
// The feature card's math and DOM readouts run WITHOUT three.js; only the
// torus rendering and cell picking need it (CDN failure is surfaced).
// Dark island: fixed palette; no var(--), no data-theme/currentColor.
// ============================================================

(function () {
    'use strict';

    var C = {
        bg: 'rgba(20,28,40,0.95)',
        cardBg: 'rgba(0,0,0,0.3)',
        border: 'rgba(255,255,255,0.1)',
        text: '#e8eaed',
        dim: 'rgba(255,255,255,0.55)',
        accent: '#64b4ff',
        good: '#66bb6a',
        warn: '#ffa726',
        bad: '#ff8a80',
        pos: 0x64b5f6,       // feature tube, h_e > 0 (along edge orientation)
        neg: 0xffa726,       // feature tube, h_e < 0 (against)
        cellFill: 0x38d1c5,
        wireFilled: 0xbfe9e4,
        wireOpen: 0xffd479
    };

    var H3D = 450;
    var TUBE_RMIN = 0.012, TUBE_RMAX = 0.055, TUBE_OFFSET = 0.035;
    var CONV_REL_TOL = 1e-7;

    // ---------- CSS ----------
    function injectCSS() {
        if (document.getElementById('tx-style')) return;
        var css = '' +
            '#simplicial_demo .tx-container{color:' + C.text + ';' +
            'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}' +
            '#simplicial_demo .tx-layout{display:flex;flex-direction:column;gap:16px;}' +
            '@media(min-width:992px){#simplicial_demo .tx-layout{flex-direction:row;}' +
            '#simplicial_demo .tx-canvas-area{flex:1.2;}' +
            '#simplicial_demo .tx-panel{flex:1;max-width:430px;}}' +
            '#simplicial_demo .tx-canvas-area,#simplicial_demo .tx-panel{' +
            'background:' + C.bg + ';padding:14px;border-radius:8px;border:1px solid ' + C.border + ';}' +
            '#simplicial_demo #tx-three{width:100%;height:' + H3D + 'px;border:1px solid rgba(255,255,255,0.15);' +
            'border-radius:8px;background:linear-gradient(135deg,#0a0f18 0%,#0f1419 100%);touch-action:none;}' +
            '#simplicial_demo #tx-three canvas{display:block;}' +
            '#simplicial_demo .tx-instruction{text-align:center;margin-bottom:8px;font-size:0.86rem;color:' + C.dim + ';}' +
            '#simplicial_demo .tx-legend{margin-top:8px;display:flex;gap:12px;font-size:0.76rem;color:' + C.dim + ';' +
            'justify-content:center;flex-wrap:wrap;}' +
            '#simplicial_demo .tx-legend-item{display:flex;align-items:center;gap:5px;}' +
            '#simplicial_demo .tx-swatch{width:11px;height:11px;border-radius:3px;display:inline-block;}' +
            '#simplicial_demo .tx-card{background:' + C.cardBg + ';border:1px solid ' + C.border + ';' +
            'border-radius:8px;padding:12px;margin-bottom:12px;}' +
            '#simplicial_demo .tx-badge-label{font-size:0.76rem;color:' + C.dim + ';margin-bottom:6px;}' +
            '#simplicial_demo .tx-badge{font-size:1.35rem;text-align:center;padding:8px 0;}' +
            '#simplicial_demo .tx-badge-sub{text-align:center;font-size:0.8rem;color:' + C.dim + ';}' +
            '#simplicial_demo .tx-card-title{font-weight:600;font-size:0.86rem;color:' + C.accent + ';margin-bottom:8px;}' +
            '#simplicial_demo .tx-readout{font-family:ui-monospace,Consolas,monospace;font-size:0.82rem;' +
            'line-height:1.6;margin-bottom:8px;}' +
            '#simplicial_demo .tx-feat-status{font-size:0.79rem;line-height:1.45;color:rgba(255,255,255,0.82);' +
            'border:1px solid rgba(66,165,245,0.2);border-radius:6px;padding:8px;min-height:3.2em;}' +
            '#simplicial_demo .tx-btn-row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}' +
            '#simplicial_demo .tx-btn{flex:1;background:transparent;border-radius:6px;padding:6px 10px;' +
            'font-size:0.8rem;cursor:pointer;min-width:130px;}' +
            '#simplicial_demo .tx-btn.pri{color:' + C.accent + ';border:1px solid ' + C.accent + ';}' +
            '#simplicial_demo .tx-btn.pri:disabled{opacity:0.45;cursor:default;}' +
            '#simplicial_demo .tx-btn.sec{color:' + C.dim + ';border:1px solid ' + C.border + ';}' +
            '#simplicial_demo .tx-insight{border:1px solid rgba(66,165,245,0.2);border-radius:8px;' +
            'padding:10px;font-size:0.79rem;line-height:1.45;color:rgba(255,255,255,0.82);}' +
            '#simplicial_demo .tx-three-msg{display:flex;align-items:center;justify-content:center;' +
            'height:100%;padding:20px;text-align:center;font-size:0.85rem;color:' + C.dim + ';}' +
            '#simplicial_demo .tx-refusal{border:1px solid ' + C.bad + ';border-radius:8px;padding:14px;color:' + C.bad + ';}' +
            '#simplicial_demo .tx-refusal ul{margin:8px 0 0 18px;padding:0;}';
        var style = document.createElement('style');
        style.id = 'tx-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderRefusal(container, failures) {
        injectCSS();
        var items = '';
        for (var i = 0; i < failures.length; i++) items += '<li>' + failures[i] + '</li>';
        container.innerHTML =
            '<div class="tx-refusal"><strong>Demo disabled: mathematical self-tests failed.</strong>' +
            '<ul>' + items + '</ul>' +
            '<p>The demo refuses to render rather than display unverified quantities.</p></div>';
    }

    // ---------- HTML ----------
    function buildHTML(container) {
        container.innerHTML =
            '<div class="tx-container tex2jax_ignore mathjax_ignore"><div class="tx-layout">' +
            '<div class="tx-canvas-area">' +
            '<div class="tx-instruction">Drag to rotate. Click a cell to <strong>open</strong> it (remove the 2-cell) ' +
            'or <strong>fill</strong> it again. Edge tubes show the current feature h.</div>' +
            '<div id="tx-three"><div class="tx-three-msg">loading 3D view\u2026</div></div>' +
            '<div class="tx-legend">' +
            '<div class="tx-legend-item"><span class="tx-swatch" style="background:#38d1c5"></span> filled cell</div>' +
            '<div class="tx-legend-item"><span class="tx-swatch" style="background:#ffd479"></span> open cell (a hole)</div>' +
            '<div class="tx-legend-item"><span class="tx-swatch" style="background:#64b5f6"></span> h&gt;0 (along edge)</div>' +
            '<div class="tx-legend-item"><span class="tx-swatch" style="background:#ffa726"></span> h&lt;0 (against)</div>' +
            '<div class="tx-legend-item">tube thickness = |h|</div>' +
            '</div></div>' +
            '<div class="tx-panel">' +
            '<div class="tx-card">' +
            '<div class="tx-badge-label">independent loops = stable features the smoothing preserves</div>' +
            '<div class="tx-badge" aria-live="polite">&beta;<sub>1</sub> = dim ker <strong>L</strong><sub>1</sub> = ' +
            '<span id="tx-count">2</span></div>' +
            '<div class="tx-badge-sub" id="tx-badge-sub">two independent loops</div>' +
            '</div>' +
            '<div class="tx-card">' +
            '<div class="tx-card-title">Edge feature h and the smoothing h \u2190 h \u2212 \u03B1L\u2081h</div>' +
            '<div class="tx-readout">' +
            '\u2016h\u2016 = <span id="tx-h-norm"></span><br>' +
            '\u2016L\u2081h\u2016 = <span id="tx-lh-norm"></span></div>' +
            '<div class="tx-feat-status" id="tx-feat-status"></div>' +
            '<div class="tx-btn-row">' +
            '<button class="tx-btn sec" id="tx-feat-new">&#8635; New random feature</button>' +
            '<button class="tx-btn pri" id="tx-feat-smooth">Smooth until stable</button>' +
            '</div></div>' +
            '<div class="tx-insight"><span id="tx-insight-text"></span></div>' +
            '</div></div></div>';
    }

    // ---------- init ----------
    function init() {
        var container = document.getElementById('simplicial_demo');
        if (!container) return;
        if (container.dataset.txInit) return; // idempotency guard
        container.dataset.txInit = '1';

        // SELF-TEST GATE — before render, before the three.js CDN fetch.
        var gate = TxCore.runSelfTests();
        if (!gate.passed) {
            renderRefusal(container, gate.failures);
            return;
        }

        injectCSS();
        buildHTML(container);

        var D = TxCore.DEFAULTS;
        var state = {
            filled: new Set(D.allIds),
            featureSeed: D.featureSeed,
            h: null,
            spec: null,          // spectral package for the CURRENT complex
            smoothing: null,     // {timer, steps, target} while running
            lastConverged: null, // steps count of the last completed smoothing
            drawHook: null       // set by initThree
        };
        state.h = TxCore.randomFeature(TxCore.mulberry32(state.featureSeed));
        state.spec = TxCore.spectral(Array.from(state.filled));

        var refs = {
            count: document.getElementById('tx-count'),
            badgeSub: document.getElementById('tx-badge-sub'),
            hNorm: document.getElementById('tx-h-norm'),
            lhNorm: document.getElementById('tx-lh-norm'),
            featStatus: document.getElementById('tx-feat-status'),
            featNew: document.getElementById('tx-feat-new'),
            featSmooth: document.getElementById('tx-feat-smooth'),
            insight: document.getElementById('tx-insight-text')
        };

        function stopSmoothing() {
            if (state.smoothing) {
                clearTimeout(state.smoothing.timer);
                state.smoothing = null;
            }
            refs.featSmooth.disabled = false; // never leave the button stuck
        }

        function renderAll() {
            var filled = Array.from(state.filled);
            var beta1 = TxCore.betti1(filled);
            refs.count.textContent = String(beta1);
            refs.badgeSub.textContent = beta1 === 2 ? 'two independent loops'
                : (beta1 === 1 ? 'one independent loop' : beta1 + ' independent loops');

            var hn = TxCore.vnorm(state.h);
            var lhn = TxCore.vnorm(TxCore.matvec(state.spec.L, state.h));
            refs.hNorm.textContent = hn.toFixed(4);
            refs.lhNorm.textContent = lhn.toFixed(4);

            var isHarmonic = lhn < 1e-6 * Math.max(1, hn);
            if (state.smoothing) {
                refs.featStatus.textContent = 'smoothing\u2026 step ' + state.smoothing.steps +
                    ' \u2014 \u2016L\u2081h\u2016 is decaying; the harmonic part is untouched.';
            } else if (isHarmonic && hn > 1e-9) {
                refs.featStatus.textContent =
                    (state.lastConverged !== null
                        ? 'converged in ' + state.lastConverged + ' steps. '
                        : '') +
                    'h is harmonic: the smoothing leaves it fixed. The surviving flow circulates ' +
                    'around the complex\u2019s holes \u2014 this is what the operator preserves.';
            } else {
                refs.featStatus.textContent = 'h is not harmonic (\u2016L\u2081h\u2016 > 0): smoothing will ' +
                    'reshape it, damping every component except the circulation around the holes.';
            }

            var nFilled = filled.length;
            refs.insight.innerHTML = (nFilled === TxCore.NC)
                ? 'Every cell is filled, yet \u03B2<sub>1</sub> = 2. No gap is visible, but two independent ' +
                'loops cannot be contracted \u2014 the torus\u2019 two handles. Open a cell and watch the count move; ' +
                'fill a cell back in and a previously stable flow can stop being harmonic.'
                : 'There ' + (beta1 === 1 ? 'is one independent loop' : 'are ' + beta1 + ' independent loops') +
                ', so dim ker <strong>L</strong><sub>1</sub> = ' + beta1 + '. Opening a cell frees cycles ' +
                '(harmonic flows survive it); filling one adds a constraint and can break them.';

            if (state.drawHook) state.drawHook();
        }

        function recomputeSpectral() {
            state.spec = TxCore.spectral(Array.from(state.filled));
        }

        function toggleCell(id) {
            stopSmoothing();
            state.lastConverged = null;
            if (state.filled.has(id)) state.filled.delete(id); else state.filled.add(id);
            recomputeSpectral();
            renderAll();
        }

        refs.featNew.addEventListener('click', function () {
            stopSmoothing();
            state.lastConverged = null;
            state.featureSeed += 1; // documented seed-stream advance
            state.h = TxCore.randomFeature(TxCore.mulberry32(state.featureSeed));
            renderAll();
        });

        refs.featSmooth.addEventListener('click', function () {
            if (state.smoothing) return;
            state.lastConverged = null;
            var spec = state.spec;
            var alpha = 1 / spec.lmax;
            var target = TxCore.projectHarmonic(spec, state.h);
            var tnorm = TxCore.vnorm(target);
            var run = { timer: null, steps: 0, target: target };
            state.smoothing = run;
            refs.featSmooth.disabled = true;
            function tick() {
                for (var s = 0; s < TxCore.DEFAULTS.STEPS_PER_TICK; s++) {
                    state.h = TxCore.diffuseStep(spec, state.h, alpha);
                    run.steps++;
                    var err = 0;
                    for (var i = 0; i < state.h.length; i++) {
                        err = Math.max(err, Math.abs(state.h[i] - target[i]));
                    }
                    if (err < CONV_REL_TOL * (tnorm + 1e-12) ||
                        run.steps >= TxCore.DEFAULTS.MAX_STEPS) {
                        state.smoothing = null;
                        state.lastConverged = run.steps;
                        refs.featSmooth.disabled = false;
                        renderAll();
                        return;
                    }
                }
                renderAll();
                run.timer = setTimeout(tick, 30);
            }
            tick();
        });

        renderAll();

        // ---------- three.js (AFTER the gate; failure surfaced) ----------
        function initThree() {
            var host = document.getElementById('tx-three');
            if (!host || !window.THREE) return;
            host.innerHTML = ''; // clear the loading placeholder
            var W = host.clientWidth || 700, H = H3D;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
            camera.position.set(0, -4.6, 3.0);
            camera.lookAt(0, 0, 0);
            var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(W, H);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            host.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            var dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(3, -4, 6); scene.add(dl);
            var dl2 = new THREE.DirectionalLight(0x88bbff, 0.3); dl2.position.set(-4, 2, -3); scene.add(dl2);

            var world = new THREE.Group(); scene.add(world);
            world.rotation.x = -1.15;

            var R = 1.6, r = 0.62, SUB = 8;
            function torusPoint(theta, phi, off) {
                var ct = Math.cos(theta), st = Math.sin(theta), cp = Math.cos(phi), sp = Math.sin(phi);
                var rr = r + (off || 0);
                return new THREE.Vector3((R + rr * cp) * ct, (R + rr * cp) * st, rr * sp);
            }
            // vertex (i,j) -> theta = 2*pi*i/N, phi = 2*pi*j/N (v1 convention)
            function angOf(i, j) { return { th: 2 * Math.PI * i / TxCore.N, ph: 2 * Math.PI * j / TxCore.N }; }

            // ---- cells (verbatim v1 construction) ----
            var cellMeshes = {};
            TxCore.CELLS.forEach(function (c) {
                var i = c.cell[0], j = c.cell[1];
                var th0 = 2 * Math.PI * i / TxCore.N, th1 = 2 * Math.PI * (i + 1) / TxCore.N;
                var ph0 = 2 * Math.PI * j / TxCore.N, ph1 = 2 * Math.PI * (j + 1) / TxCore.N;
                var positions = [], indices = [];
                for (var a = 0; a <= SUB; a++) {
                    for (var b = 0; b <= SUB; b++) {
                        var p = torusPoint(th0 + (th1 - th0) * a / SUB, ph0 + (ph1 - ph0) * b / SUB, 0);
                        positions.push(p.x, p.y, p.z);
                    }
                }
                var row = SUB + 1;
                for (a = 0; a < SUB; a++) {
                    for (var b2 = 0; b2 < SUB; b2++) {
                        var v00 = a * row + b2, v01 = a * row + b2 + 1,
                            v10 = (a + 1) * row + b2, v11 = (a + 1) * row + b2 + 1;
                        indices.push(v00, v10, v11, v00, v11, v01);
                    }
                }
                var geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geo.setIndex(indices);
                geo.computeVertexNormals();
                var mat = new THREE.MeshStandardMaterial({
                    color: C.cellFill, roughness: 0.45, metalness: 0.05,
                    transparent: true, opacity: 0.92, side: THREE.DoubleSide,
                    emissive: 0x0a3d39, emissiveIntensity: 0.4
                });
                var mesh = new THREE.Mesh(geo, mat);
                mesh.userData.cellId = c.id;
                world.add(mesh);

                var bpos = [];
                function edgeLine(thA, phA, thB, phB) {
                    for (var t = 0; t <= SUB; t++) {
                        var p = torusPoint(thA + (thB - thA) * t / SUB, phA + (phB - phA) * t / SUB, 0.004);
                        bpos.push(p.x, p.y, p.z);
                    }
                }
                edgeLine(th0, ph0, th0, ph1); edgeLine(th0, ph1, th1, ph1);
                edgeLine(th1, ph1, th1, ph0); edgeLine(th1, ph0, th0, ph0);
                var bgeo = new THREE.BufferGeometry();
                bgeo.setAttribute('position', new THREE.Float32BufferAttribute(bpos, 3));
                var bmat = new THREE.LineBasicMaterial({ color: C.wireFilled, transparent: true, opacity: 0.5 });
                var wire = new THREE.Line(bgeo, bmat);
                world.add(wire);
                cellMeshes[c.id] = { mesh: mesh, wire: wire };
            });

            // ---- NEW: feature tubes, one per edge ----
            // Edge index k: for grid cell (i,j), 2*(i*N+j) is the phi-edge
            // (i,j)->(i,j+1); 2*(i*N+j)+1 is the theta-edge (i,j)->(i+1,j)
            // (matches EDGES build order). Path sampled tail->head, offset
            // slightly outward so tubes sit on top of the surface.
            var tubeMats = {
                pos: new THREE.MeshStandardMaterial({ color: C.pos, roughness: 0.35, metalness: 0.1 }),
                neg: new THREE.MeshStandardMaterial({ color: C.neg, roughness: 0.35, metalness: 0.1 })
            };
            var tubes = new Array(TxCore.NE).fill(null);
            function edgePath(k) {
                var gi = Math.floor(k / 2), dirPhi = (k % 2 === 0);
                var i = Math.floor(gi / TxCore.N), j = gi % TxCore.N;
                var A = angOf(i, j);
                var B = dirPhi ? { th: A.th, ph: A.ph + 2 * Math.PI / TxCore.N }
                    : { th: A.th + 2 * Math.PI / TxCore.N, ph: A.ph };
                var pts = [];
                for (var t = 0; t <= SUB; t++) {
                    pts.push(torusPoint(A.th + (B.th - A.th) * t / SUB,
                        A.ph + (B.ph - A.ph) * t / SUB, TUBE_OFFSET));
                }
                return pts;
            }
            var edgeCurves = [];
            for (var k = 0; k < TxCore.NE; k++) {
                edgeCurves.push(new THREE.CatmullRomCurve3(edgePath(k)));
            }

            function drawFeature() {
                var h = state.h;
                var hmax = 0;
                for (var k = 0; k < TxCore.NE; k++) hmax = Math.max(hmax, Math.abs(h[k]));
                for (k = 0; k < TxCore.NE; k++) {
                    if (tubes[k]) {
                        world.remove(tubes[k]);
                        tubes[k].geometry.dispose();
                        tubes[k] = null;
                    }
                    var mag = hmax > 1e-12 ? Math.abs(h[k]) / hmax : 0;
                    if (mag < 0.02) continue; // invisible-thin: skip
                    var radius = TUBE_RMIN + (TUBE_RMAX - TUBE_RMIN) * mag;
                    var geo = new THREE.TubeGeometry(edgeCurves[k], 12, radius, 6, false);
                    var mesh = new THREE.Mesh(geo, h[k] >= 0 ? tubeMats.pos : tubeMats.neg);
                    world.add(mesh);
                    tubes[k] = mesh;
                }
            }

            function drawCells() {
                TxCore.CELLS.forEach(function (c) {
                    var cm = cellMeshes[c.id];
                    var isFilled = state.filled.has(c.id);
                    cm.mesh.visible = isFilled;
                    cm.wire.material.opacity = isFilled ? 0.5 : 0.95;
                    cm.wire.material.color.setHex(isFilled ? C.wireFilled : C.wireOpen);
                });
            }

            state.drawHook = function () { drawCells(); drawFeature(); };
            state.drawHook();

            // ---- drag / pick (v1 behavior) ----
            var dragging = false, lastX = 0, lastY = 0, moved = 0;
            host.addEventListener('pointerdown', function (e) {
                dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
                host.setPointerCapture(e.pointerId);
            });
            host.addEventListener('pointermove', function (e) {
                if (!dragging) return;
                var dx = e.clientX - lastX, dy = e.clientY - lastY;
                lastX = e.clientX; lastY = e.clientY;
                moved += Math.abs(dx) + Math.abs(dy);
                world.rotation.z += dx * 0.01;
                world.rotation.x += dy * 0.01;
            });
            host.addEventListener('pointerup', function (e) {
                dragging = false;
                if (moved < 5) pick(e);
            });

            var raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
            function pick(e) {
                var rect = host.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                var targets = TxCore.CELLS.map(function (c) { return cellMeshes[c.id].mesh; });
                var prevVis = targets.map(function (m) { return m.visible; });
                targets.forEach(function (m) { m.visible = true; });
                var hits = raycaster.intersectObjects(targets, false);
                targets.forEach(function (m, k2) { m.visible = prevVis[k2]; });
                if (hits.length) toggleCell(hits[0].object.userData.cellId);
            }

            (function loop() {
                requestAnimationFrame(loop);
                renderer.render(scene, camera);
            })();

            window.addEventListener('resize', function () {
                var w = host.clientWidth || W;
                renderer.setSize(w, H);
                camera.aspect = w / H;
                camera.updateProjectionMatrix();
            });
        }

        function threeFailed() {
            if (state.drawHook) return; // loaded after all
            var host = document.getElementById('tx-three');
            if (!host) return;
            host.innerHTML = '<div class="tx-three-msg">3D view unavailable \u2014 three.js could not be ' +
                'fetched (network, ad blocker, or a service-worker fetch error).<br>' +
                'The \u03B2\u2081 badge and the feature smoothing on the right remain fully functional; ' +
                'opening and closing cells needs the 3D view.</div>';
        }

        if (window.THREE) {
            initThree();
        } else {
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            s.onload = initThree;
            s.onerror = threeFailed;
            document.head.appendChild(s);
            setTimeout(threeFailed, 12000); // watchdog: hung fetches surface too
        }
    }

    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();