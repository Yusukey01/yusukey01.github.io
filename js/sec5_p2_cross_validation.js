/* ============================================================
 * Regression demos — shared math core (RegCore)
 * Pure functions, no DOM. Conventions match the page:
 *   ridge penalizes the FULL coefficient vector beta, including
 *   the intercept, exactly as in T-ridge_regression_solution:
 *   argmin ||y - X beta||^2 + lambda ||beta||^2.
 * Solver: Householder QR on the augmented system
 *   [X; sqrt(lambda) I] beta = [y; 0],
 * which for lambda = 0 reduces to genuine ordinary least squares
 * (condition number kappa(X), not kappa(X)^2). Rank deficiency is
 * reported honestly ({ok:false}) instead of being papered over.
 * ============================================================ */
var RegCore = (function () {
    'use strict';

    /* ---------- seeded RNG (mulberry32) ---------- */
    function createRng(seed) {
        var s = seed >>> 0;
        return function () {
            s |= 0; s = (s + 0x6D2B79F5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* ---------- target functions (single source of truth) ----------
     * Both the data generator and any "true function" rendering MUST
     * use these; the generator/renderer mismatch bug class dies here. */
    var TARGETS = {
        cubic: {
            label: 'Cubic polynomial',
            f: function (x) { return 0.8 * x * x * x - 0.5 * x * x + 0.3 * x + 1; }
        },
        sinusoid: {
            label: 'Sinusoid',
            f: function (x) { return Math.sin(3 * x) + 0.3 * Math.sin(9 * x); }
        }
    };

    /* generate n points, x uniform on [-1, 1], y = f(x) + uniform noise
     * of half-width noise. Returns array of {x, y}. */
    function generatePoints(targetKey, n, noise, rng) {
        var f = TARGETS[targetKey].f;
        var pts = [];
        for (var i = 0; i < n; i++) {
            var x = rng() * 2 - 1;
            pts.push({ x: x, y: f(x) + (rng() * 2 - 1) * noise });
        }
        return pts;
    }

    /* Fisher-Yates shuffle (in place) with provided rng */
    function shuffle(arr, rng) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    /* partition data into K folds whose sizes differ by at most 1;
     * every element appears in exactly one fold. */
    function makeFolds(data, K, rng) {
        var idx = shuffle(data.slice(), rng);
        var folds = [], base = Math.floor(idx.length / K), rem = idx.length % K, pos = 0;
        for (var k = 0; k < K; k++) {
            var size = base + (k < rem ? 1 : 0);
            folds.push(idx.slice(pos, pos + size));
            pos += size;
        }
        return folds;
    }

    /* ---------- design matrix ---------- */
    function designMatrix(xs, degree) {
        var X = [];
        for (var i = 0; i < xs.length; i++) {
            var row = [1], p = 1;
            for (var j = 1; j <= degree; j++) { p *= xs[i]; row.push(p); }
            X.push(row);
        }
        return X;
    }

    /* ---------- Householder QR least squares ----------
     * Solves min_beta ||A beta - b||_2 for A (m x p), m >= p.
     * Returns { ok: true, beta } or { ok: false, reason }. */
    function solveLeastSquaresQR(A, b) {
        var m = A.length, p = A[0].length;
        if (m < p) return { ok: false, reason: 'underdetermined' };
        var R = [], i, j, k;
        for (i = 0; i < m; i++) R.push(A[i].slice());
        var qtb = b.slice();

        for (k = 0; k < p; k++) {
            var norm = 0;
            for (i = k; i < m; i++) norm += R[i][k] * R[i][k];
            norm = Math.sqrt(norm);
            if (norm === 0) return { ok: false, reason: 'rank-deficient' };
            var alpha = R[k][k] > 0 ? -norm : norm;
            var v = new Array(m - k);
            v[0] = R[k][k] - alpha;
            for (i = k + 1; i < m; i++) v[i - k] = R[i][k];
            var vnorm2 = 0;
            for (i = 0; i < v.length; i++) vnorm2 += v[i] * v[i];
            if (vnorm2 > 0) {
                for (j = k; j < p; j++) {
                    var dot = 0;
                    for (i = 0; i < v.length; i++) dot += v[i] * R[k + i][j];
                    var s = 2 * dot / vnorm2;
                    for (i = 0; i < v.length; i++) R[k + i][j] -= s * v[i];
                }
                var dotb = 0;
                for (i = 0; i < v.length; i++) dotb += v[i] * qtb[k + i];
                var sb = 2 * dotb / vnorm2;
                for (i = 0; i < v.length; i++) qtb[k + i] -= sb * v[i];
            }
        }

        /* honest rank check on R's diagonal (relative) */
        var maxDiag = 0;
        for (k = 0; k < p; k++) maxDiag = Math.max(maxDiag, Math.abs(R[k][k]));
        for (k = 0; k < p; k++) {
            if (Math.abs(R[k][k]) < 1e-10 * maxDiag) {
                return { ok: false, reason: 'rank-deficient' };
            }
        }

        var beta = new Array(p);
        for (k = p - 1; k >= 0; k--) {
            var acc = qtb[k];
            for (j = k + 1; j < p; j++) acc -= R[k][j] * beta[j];
            beta[k] = acc / R[k][k];
        }
        return { ok: true, beta: beta };
    }

    /* ridge via augmentation: min ||y - X b||^2 + lambda ||b||^2
     * (penalty on ALL coordinates including the intercept, per the
     * page's theorem). lambda = 0 gives genuine OLS. */
    function solveRidge(X, y, lambda) {
        var p = X[0].length, i, j;
        if (lambda === 0) return solveLeastSquaresQR(X, y);
        var A = [], b = [];
        for (i = 0; i < X.length; i++) { A.push(X[i].slice()); b.push(y[i]); }
        var sq = Math.sqrt(lambda);
        for (i = 0; i < p; i++) {
            var row = new Array(p).fill(0);
            row[i] = sq;
            A.push(row);
            b.push(0);
        }
        return solveLeastSquaresQR(A, b);
    }

    /* convenience: fit polynomial ridge on {x,y} data */
    function fitPolyRidge(data, degree, lambda) {
        var xs = data.map(function (d) { return d.x; });
        var ys = data.map(function (d) { return d.y; });
        return solveRidge(designMatrix(xs, degree), ys, lambda);
    }

    function predictOne(beta, x) {
        var acc = 0, p = 1;
        for (var j = 0; j < beta.length; j++) { acc += beta[j] * p; p *= x; }
        return acc;
    }

    function predictAll(beta, data) {
        return data.map(function (d) { return predictOne(beta, d.x); });
    }

    function mse(preds, ys) {
        var s = 0;
        for (var i = 0; i < preds.length; i++) {
            var d = preds[i] - ys[i]; s += d * d;
        }
        return s / preds.length;
    }

    function normL2(beta) {
        var s = 0;
        for (var i = 0; i < beta.length; i++) s += beta[i] * beta[i];
        return Math.sqrt(s);
    }

    /* ---------- self-tests ---------- */
    function runSelfTests() {
        var failures = [];

        /* T1: exact recovery of a line, lambda = 0 */
        (function () {
            var data = [-1, -0.4, 0.1, 0.6, 1].map(function (x) { return { x: x, y: 2 * x + 1 }; });
            var r = fitPolyRidge(data, 1, 0);
            if (!r.ok || Math.abs(r.beta[0] - 1) > 1e-9 || Math.abs(r.beta[1] - 2) > 1e-9) {
                failures.push('T1 exact line recovery failed: ' + JSON.stringify(r));
            }
        })();

        /* T2: ridge solution satisfies the normal equations
         * (X^T X + lambda I) beta = X^T y to high precision */
        (function () {
            var rng = createRng(99);
            var data = generatePoints('cubic', 40, 0.4, rng);
            var degree = 3, lambda = 0.7;
            var r = fitPolyRidge(data, degree, lambda);
            if (!r.ok) { failures.push('T2 solver failed unexpectedly'); return; }
            var X = designMatrix(data.map(function (d) { return d.x; }), degree);
            var y = data.map(function (d) { return d.y; });
            var p = degree + 1;
            for (var i = 0; i < p; i++) {
                var lhs = lambda * r.beta[i], rhs = 0;
                for (var k = 0; k < X.length; k++) {
                    var xk = X[k], dotXb = 0;
                    for (var j = 0; j < p; j++) dotXb += xk[j] * r.beta[j];
                    lhs += xk[i] * dotXb;
                    rhs += xk[i] * y[k];
                }
                if (Math.abs(lhs - rhs) > 1e-8) {
                    failures.push('T2 normal-equation residual too large at row ' + i + ': ' + Math.abs(lhs - rhs));
                    break;
                }
            }
        })();

        /* T3: ||beta(lambda)|| strictly decreases in lambda, and -> 0 */
        (function () {
            var rng = createRng(7);
            var data = generatePoints('cubic', 30, 0.4, rng);
            var lambdas = [0, 0.1, 1, 10], norms = [];
            for (var i = 0; i < lambdas.length; i++) {
                var r = fitPolyRidge(data, 6, lambdas[i]);
                if (!r.ok) { failures.push('T3 solver failed at lambda=' + lambdas[i]); return; }
                norms.push(normL2(r.beta));
            }
            for (var k = 1; k < norms.length; k++) {
                if (!(norms[k] < norms[k - 1])) {
                    failures.push('T3 norm not decreasing: ' + norms.join(', '));
                    return;
                }
            }
            var big = fitPolyRidge(data, 6, 1e6);
            if (!big.ok || normL2(big.beta) > 1e-2 * norms[0]) {
                failures.push('T3 beta does not shrink toward 0 for huge lambda');
            }
        })();

        /* T4: honest singularity: 3 points cannot determine degree 8 at
         * lambda = 0, but lambda > 0 must succeed */
        (function () {
            var data = [{ x: -0.5, y: 1 }, { x: 0.1, y: 2 }, { x: 0.7, y: 0 }];
            var r0 = fitPolyRidge(data, 8, 0);
            if (r0.ok) failures.push('T4 underdetermined OLS was not rejected');
            var r1 = fitPolyRidge(data, 8, 0.01);
            if (!r1.ok) failures.push('T4 ridge with lambda > 0 should succeed');
        })();

        /* T5: design matrix values */
        (function () {
            var X = designMatrix([0.5], 3);
            var exp = [1, 0.5, 0.25, 0.125];
            for (var j = 0; j < 4; j++) {
                if (Math.abs(X[0][j] - exp[j]) > 1e-15) {
                    failures.push('T5 design matrix wrong: ' + JSON.stringify(X[0]));
                    break;
                }
            }
        })();

        /* T6: MSE known value: preds [1,2] vs actual [0,4] -> 2.5 */
        (function () {
            if (Math.abs(mse([1, 2], [0, 4]) - 2.5) > 1e-15) failures.push('T6 mse value wrong');
        })();

        /* T7: fold partition: n = 23, K = 5 -> sizes {5,5,5,4,4},
         * disjoint cover of all elements */
        (function () {
            var rng = createRng(3);
            var data = [];
            for (var i = 0; i < 23; i++) data.push({ id: i });
            var folds = makeFolds(data, 5, rng);
            var sizes = folds.map(function (f) { return f.length; }).sort().join(',');
            if (sizes !== '4,4,5,5,5') failures.push('T7 fold sizes wrong: ' + sizes);
            var seen = {};
            var total = 0;
            folds.forEach(function (f) {
                f.forEach(function (el) {
                    if (seen[el.id]) failures.push('T7 duplicate element in folds');
                    seen[el.id] = true; total++;
                });
            });
            if (total !== 23) failures.push('T7 folds do not cover all elements: ' + total);
        })();

        /* T8: generator/target consistency: noise = 0 => y = f(x) exactly,
         * for every registered target */
        (function () {
            Object.keys(TARGETS).forEach(function (key) {
                var rng = createRng(11);
                var pts = generatePoints(key, 25, 0, rng);
                for (var i = 0; i < pts.length; i++) {
                    if (pts[i].y !== TARGETS[key].f(pts[i].x)) {
                        failures.push('T8 generator disagrees with target ' + key);
                        return;
                    }
                }
            });
        })();

        /* T4b: rank-deficient with m >= p: 6 points but only 2 distinct
         * x-values cannot determine a cubic; must be reported, not fudged */
        (function () {
            var data = [
                { x: -0.3, y: 1.0 }, { x: -0.3, y: 1.1 }, { x: -0.3, y: 0.9 },
                { x: 0.6, y: 2.0 }, { x: 0.6, y: 2.1 }, { x: 0.6, y: 1.9 }
            ];
            var r = fitPolyRidge(data, 3, 0);
            if (r.ok) failures.push('T4b rank-deficient system was not rejected');
        })();

        /* T8b: pinned target values (the target functions are part of the
         * page's spec; silent drift must fail) */
        (function () {
            if (Math.abs(TARGETS.cubic.f(0) - 1) > 1e-15 ||
                Math.abs(TARGETS.cubic.f(1) - 1.6) > 1e-15 ||
                Math.abs(TARGETS.cubic.f(-1) - (-0.6)) > 1e-15) {
                failures.push('T8b cubic target drifted from spec');
            }
            if (Math.abs(TARGETS.sinusoid.f(0)) > 1e-15 ||
                Math.abs(TARGETS.sinusoid.f(1) - (Math.sin(3) + 0.3 * Math.sin(9))) > 1e-15) {
                failures.push('T8b sinusoid target drifted from spec');
            }
        })();

        /* T9: predictOne matches design-matrix contraction */
        (function () {
            var beta = [0.3, -1.2, 0.5, 2.0];
            var x = -0.73;
            var X = designMatrix([x], 3);
            var viaX = 0;
            for (var j = 0; j < 4; j++) viaX += X[0][j] * beta[j];
            if (Math.abs(viaX - predictOne(beta, x)) > 1e-12) failures.push('T9 predict mismatch');
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        createRng: createRng,
        TARGETS: TARGETS,
        generatePoints: generatePoints,
        shuffle: shuffle,
        makeFolds: makeFolds,
        designMatrix: designMatrix,
        solveLeastSquaresQR: solveLeastSquaresQR,
        solveRidge: solveRidge,
        fitPolyRidge: fitPolyRidge,
        predictOne: predictOne,
        predictAll: predictAll,
        mse: mse,
        normL2: normL2,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = RegCore; }
/* ============================================================
 * K-Fold Cross-Validation Demo — UI layer (v2)
 * Self-contained dark island. Depends only on RegCore above.
 * Refuses to render if RegCore.runSelfTests() fails.
 * CV error curve shows each fold's validation curve (thin) plus
 * the mean (bold) on log-log axes; the fold-to-fold spread is the
 * variance of the CV estimate made visible.
 * ============================================================ */
(function () {
    'use strict';

    function initCvDemo() {
        var container = document.getElementById('cross_validation_visualizer');
        if (!container) return;

        var testResult = RegCore.runSelfTests();
        if (!testResult.passed) {
            container.innerHTML =
                '<div style="background:rgba(40,20,24,0.95);border:1px solid #ff6b5e;' +
                'border-radius:8px;padding:20px;color:#ffb3ab;font-family:monospace;font-size:0.85rem;">' +
                '<strong>Demo disabled: mathematical self-tests failed.</strong><br>' +
                '<pre style="white-space:pre-wrap;">' +
                testResult.failures.map(function (f) {
                    return f.replace(/&/g, '&amp;').replace(/</g, '&lt;');
                }).join('\n') + '</pre></div>';
            return;
        }

        /* ---------- palette ---------- */
        var C = {
            island: 'rgba(20,28,40,0.95)',
            panel: 'rgba(255,255,255,0.04)',
            panelBorder: 'rgba(255,255,255,0.10)',
            plotBg: '#101826',
            grid: 'rgba(255,255,255,0.07)',
            axis: 'rgba(255,255,255,0.25)',
            text: 'rgba(255,255,255,0.88)',
            muted: 'rgba(255,255,255,0.55)',
            train: '#4da3ff',
            val: '#f5a623',
            test: 'rgba(255,255,255,0.45)',
            model: '#2ecc71',
            truth: '#c084fc',
            foldLine: 'rgba(77,163,255,0.30)',
            meanLine: '#f5a623',
            optimal: '#2ecc71',
            warn: '#ffb3ab'
        };

        /* ---------- state ---------- */
        var rng = RegCore.createRng((Date.now() ^ 0x1F3A5C79) >>> 0);
        var params = { target: 'sinusoid', K: 5, total: 50, testPct: 20, noise: 0.4, degree: 12 };
        var train = [], test = [], folds = [];
        var LAMBDAS = (function () {
            var out = [], steps = 32, lo = Math.log(1e-4), hi = Math.log(100);
            for (var i = 0; i < steps; i++) out.push(Math.exp(lo + (hi - lo) * i / (steps - 1)));
            return out;
        })();
        var results = null;   /* { perFold: number[K][L], count, mean, optimal:{lambda,cv,testMse,norm,beta} } */
        var runningFold = -1; /* index of validation fold during a run, else -1 */
        var isRunning = false, stopRequested = false;
        var DOM_MIN = -1.15, DOM_MAX = 1.15;

        /* ---------- DOM ---------- */
        var style = document.createElement('style');
        style.textContent = [
            '#cross_validation_visualizer .cv-root{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:10px;padding:18px;color:' + C.text + ';font-family:"Segoe UI",system-ui,sans-serif;}',
            '#cross_validation_visualizer .cv-grid{display:flex;flex-direction:column;gap:16px;}',
            '@media (min-width:992px){#cross_validation_visualizer .cv-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start;}}',
            '#cross_validation_visualizer .cv-card{background:' + C.panel + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:14px;}',
            '#cross_validation_visualizer .cv-card h3{margin:0 0 10px 0;font-size:1.02rem;color:' + C.text + ';font-weight:600;}',
            '#cross_validation_visualizer .cv-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
            '#cross_validation_visualizer canvas{display:block;width:100%;height:auto;border-radius:6px;}',
            '#cross_validation_visualizer .cv-legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:10px;font-size:0.82rem;color:' + C.muted + ';}',
            '#cross_validation_visualizer .cv-legend span.sw{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:3px;}',
            '#cross_validation_visualizer .cv-legend span.pt{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;}',
            '#cross_validation_visualizer .cv-legend span.sq{display:inline-block;width:9px;height:9px;margin-right:5px;vertical-align:-1px;}',
            '#cross_validation_visualizer .cv-folds{display:flex;gap:5px;margin-top:12px;}',
            '#cross_validation_visualizer .cv-fold{flex:1;text-align:center;padding:6px 0;border-radius:5px;border:1px solid ' + C.panelBorder + ';font-size:0.78rem;font-family:monospace;color:' + C.muted + ';}',
            '#cross_validation_visualizer .cv-fold.active{background:rgba(245,166,35,0.20);border-color:' + C.val + ';color:' + C.text + ';}',
            '#cross_validation_visualizer .cv-ctl{margin-bottom:14px;}',
            '#cross_validation_visualizer .cv-ctl label{display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:6px;color:' + C.text + ';}',
            '#cross_validation_visualizer .cv-ctl label .val{font-family:monospace;color:' + C.muted + ';}',
            '#cross_validation_visualizer input[type=range]{width:100%;accent-color:#4da3ff;}',
            '#cross_validation_visualizer .cv-seg{display:flex;gap:6px;}',
            '#cross_validation_visualizer .cv-seg button{flex:1;padding:7px 0;border-radius:6px;border:1px solid ' + C.panelBorder + ';background:transparent;color:' + C.muted + ';cursor:pointer;font-size:0.86rem;}',
            '#cross_validation_visualizer .cv-seg button.on{background:rgba(77,163,255,0.18);border-color:#4da3ff;color:' + C.text + ';}',
            '#cross_validation_visualizer .cv-btn{width:100%;padding:10px 0;border:none;border-radius:6px;font-size:0.95rem;cursor:pointer;margin-bottom:8px;color:#fff;}',
            '#cross_validation_visualizer .cv-btn.run{background:#2f7fd6;}',
            '#cross_validation_visualizer .cv-btn.run:hover{background:#3b8de4;}',
            '#cross_validation_visualizer .cv-btn.run.stop{background:#c0564a;}',
            '#cross_validation_visualizer .cv-btn.sec{background:rgba(255,255,255,0.10);color:' + C.text + ';}',
            '#cross_validation_visualizer .cv-btn.sec:hover{background:rgba(255,255,255,0.16);}',
            '#cross_validation_visualizer .cv-metrics{font-family:monospace;font-size:0.86rem;line-height:1.9;}',
            '#cross_validation_visualizer .cv-metrics .row{display:flex;justify-content:space-between;}',
            '#cross_validation_visualizer .cv-status{color:' + C.muted + ';font-size:0.84rem;margin-top:10px;line-height:1.5;}'
        ].join('\n');
        container.appendChild(style);

        var root = document.createElement('div');
        root.className = 'cv-root';
        root.innerHTML =
            '<div class="cv-grid">' +
            '  <div class="cv-main">' +
            '    <div class="cv-card">' +
            '      <h3>Data, Folds &amp; Final Model</h3>' +
            '      <canvas id="cv-plot"></canvas>' +
            '      <div class="cv-legend">' +
            '        <span><span class="pt" style="background:' + C.train + '"></span>Training folds</span>' +
            '        <span><span class="pt" style="background:' + C.val + '"></span>Validation fold</span>' +
            '        <span><span class="sq" style="background:' + C.test + '"></span>Held-out test</span>' +
            '        <span><span class="sw" style="background:' + C.model + '"></span>Model at &lambda;*</span>' +
            '        <span><span class="sw" style="background:' + C.truth + '"></span>True function (dashed)</span>' +
            '      </div>' +
            '      <div class="cv-folds" id="cv-folds"></div>' +
            '    </div>' +
            '    <div class="cv-card">' +
            '      <h3>Cross-Validation Error vs &lambda; (log&ndash;log)</h3>' +
            '      <canvas id="cv-curve"></canvas>' +
            '      <div class="cv-legend">' +
            '        <span><span class="sw" style="background:' + C.foldLine + '"></span>Per-fold validation MSE</span>' +
            '        <span><span class="sw" style="background:' + C.meanLine + '"></span>Mean CV error</span>' +
            '        <span><span class="sw" style="background:' + C.optimal + '"></span>&lambda;* (minimum)</span>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="cv-side">' +
            '    <div class="cv-card">' +
            '      <div class="cv-ctl"><label>Target function</label>' +
            '        <div class="cv-seg">' +
            '          <button id="cv-t-cubic">Cubic</button>' +
            '          <button id="cv-t-sinusoid" class="on">Sinusoid</button>' +
            '        </div>' +
            '      </div>' +
            '      <div class="cv-ctl"><label>Folds K <span class="val" id="cv-k-val">5</span></label>' +
            '        <input type="range" id="cv-k" min="2" max="10" step="1" value="5"></div>' +
            '      <div class="cv-ctl"><label>Total points <span class="val" id="cv-total-val">50</span></label>' +
            '        <input type="range" id="cv-total" min="20" max="100" step="5" value="50"></div>' +
            '      <div class="cv-ctl"><label>Test set <span class="val" id="cv-test-val">20%</span></label>' +
            '        <input type="range" id="cv-test" min="10" max="40" step="5" value="20"></div>' +
            '      <div class="cv-ctl"><label>Noise level <span class="val" id="cv-noise-val">0.4</span></label>' +
            '        <input type="range" id="cv-noise" min="0" max="1" step="0.1" value="0.4"></div>' +
            '      <div class="cv-ctl"><label>Polynomial degree <span class="val" id="cv-deg-val">12</span></label>' +
            '        <input type="range" id="cv-deg" min="1" max="15" step="1" value="12"></div>' +
            '      <button id="cv-run" class="cv-btn run">Run Cross-Validation</button>' +
            '      <button id="cv-newdata" class="cv-btn sec">New Data</button>' +
            '    </div>' +
            '    <div class="cv-card" style="margin-top:16px;">' +
            '      <h3>Results</h3>' +
            '      <div class="cv-metrics" id="cv-metrics"></div>' +
            '      <div class="cv-status" id="cv-status"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        container.appendChild(root);

        var plotCanvas = document.getElementById('cv-plot');
        var curveCanvas = document.getElementById('cv-curve');
        var foldsEl = document.getElementById('cv-folds');
        var metricsEl = document.getElementById('cv-metrics');
        var statusEl = document.getElementById('cv-status');
        var runBtn = document.getElementById('cv-run');

        /* ---------- canvas sizing ---------- */
        var padCache = {};
        function sizeCanvas(canvas, aspect) {
            var parent = canvas.parentElement;
            var pad = padCache[canvas.id];
            if (pad === undefined) {
                var cs = window.getComputedStyle ? window.getComputedStyle(parent) : null;
                pad = cs ? (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) : 0;
                padCache[canvas.id] = pad;
            }
            var cssW = parent.clientWidth - pad;
            if (cssW <= 0) cssW = 300;
            var cssH = Math.round(cssW * aspect);
            var dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);
            canvas.style.width = cssW + 'px';
            canvas.style.height = cssH + 'px';
            var ctx = canvas.getContext('2d');
            if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { w: cssW, h: cssH, ctx: ctx };
        }

        /* ---------- data pipeline ---------- */
        function regenerate() {
            var all = RegCore.generatePoints(params.target, params.total, params.noise, rng);
            var nTest = Math.max(1, Math.floor(params.total * params.testPct / 100));
            RegCore.shuffle(all, rng);
            test = all.slice(0, nTest);
            train = all.slice(nTest);
            folds = RegCore.makeFolds(train, params.K, rng);
            resetResults();
        }

        function resetResults() {
            results = null;
            runningFold = -1;
            renderAll();
        }

        /* ---------- CV run ---------- */
        function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

        var lockedWhileRunning = ['cv-t-cubic', 'cv-t-sinusoid', 'cv-k', 'cv-total', 'cv-test', 'cv-noise', 'cv-deg', 'cv-newdata'];
        function setControlsLocked(locked) {
            lockedWhileRunning.forEach(function (id) {
                var el = document.getElementById(id);
                el.disabled = locked;
                el.style.opacity = locked ? '0.45' : '';
            });
        }

        async function runCv() {
            if (isRunning) { stopRequested = true; return; }
            isRunning = true; stopRequested = false;
            setControlsLocked(true);
            runBtn.textContent = 'Stop';
            runBtn.classList.add('stop');

            results = {
                perFold: [],
                mean: new Array(LAMBDAS.length).fill(0),
                count: 0,
                optimal: null
            };

            for (var k = 0; k < params.K && !stopRequested; k++) {
                runningFold = k;
                renderFoldStrip(); drawPlot();
                var valSet = folds[k];
                var trSet = [];
                for (var i = 0; i < params.K; i++) {
                    if (i !== k) trSet = trSet.concat(folds[i]);
                }
                var foldErrs = new Array(LAMBDAS.length).fill(null);
                results.perFold.push(foldErrs);
                for (var li = 0; li < LAMBDAS.length && !stopRequested; li++) {
                    var fit = RegCore.fitPolyRidge(trSet, params.degree, LAMBDAS[li]);
                    foldErrs[li] = fit.ok
                        ? RegCore.mse(RegCore.predictAll(fit.beta, valSet), valSet.map(function (d) { return d.y; }))
                        : NaN;
                    if (li % 4 === 3) { drawCurve(); await sleep(15); }
                }
                if (stopRequested) break;
                results.count++;
                for (var m = 0; m < LAMBDAS.length; m++) results.mean[m] += foldErrs[m] / params.K;
                drawCurve();
            }

            if (!stopRequested && results.count === params.K) {
                var best = 0;
                for (var b = 1; b < LAMBDAS.length; b++) {
                    if (results.mean[b] < results.mean[best]) best = b;
                }
                var lamStar = LAMBDAS[best];
                var finalFit = RegCore.fitPolyRidge(train, params.degree, lamStar);
                results.optimal = {
                    lambda: lamStar,
                    cv: results.mean[best],
                    beta: finalFit.ok ? finalFit.beta : null,
                    norm: finalFit.ok ? RegCore.normL2(finalFit.beta) : null,
                    testMse: finalFit.ok
                        ? RegCore.mse(RegCore.predictAll(finalFit.beta, test), test.map(function (d) { return d.y; }))
                        : null
                };
            } else {
                results = null;  /* partial runs are discarded, not shown as if complete */
            }

            runningFold = -1;
            isRunning = false;
            setControlsLocked(false);
            runBtn.textContent = 'Run Cross-Validation';
            runBtn.classList.remove('stop');
            renderAll();
        }

        /* ---------- rendering: scatter plot ---------- */
        function foldOf(pt) {
            for (var k = 0; k < folds.length; k++) {
                if (folds[k].indexOf(pt) !== -1) return k;
            }
            return -1;
        }

        function drawPlot() {
            var s = sizeCanvas(plotCanvas, 0.55);
            var ctx = s.ctx; if (!ctx) return;
            var m = { l: 40, r: 12, t: 10, b: 26 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            var ys = train.concat(test).map(function (d) { return d.y; });
            var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
            var pad = Math.max((hi - lo) * 0.15, 0.2);
            var yr = { min: lo - pad, max: hi + pad };
            function X(x) { return m.l + (x - DOM_MIN) / (DOM_MAX - DOM_MIN) * pw; }
            function Y(y) { return m.t + (yr.max - y) / (yr.max - yr.min) * ph; }

            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '11px monospace'; ctx.textAlign = 'center';
            [-1, -0.5, 0, 0.5, 1].forEach(function (gx) {
                ctx.beginPath(); ctx.moveTo(X(gx), m.t); ctx.lineTo(X(gx), m.t + ph); ctx.stroke();
            });
            [-1, 0, 1].forEach(function (gx) { ctx.fillText(String(gx), X(gx), s.h - 8); });
            ctx.strokeStyle = C.axis;
            if (yr.min < 0 && yr.max > 0) {
                ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(m.l + pw, Y(0)); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(X(0), m.t); ctx.lineTo(X(0), m.t + ph); ctx.stroke();

            ctx.save();
            ctx.beginPath(); ctx.rect(m.l, m.t, pw, ph); ctx.clip();
            function curveLine(f, color, dashed) {
                ctx.strokeStyle = color; ctx.lineWidth = 2;
                ctx.setLineDash(dashed ? [6, 4] : []);
                ctx.beginPath();
                var N = 240;
                for (var i = 0; i <= N; i++) {
                    var x = DOM_MIN + (i / N) * (DOM_MAX - DOM_MIN);
                    if (i === 0) ctx.moveTo(X(x), Y(f(x)));
                    else ctx.lineTo(X(x), Y(f(x)));
                }
                ctx.stroke(); ctx.setLineDash([]);
            }
            curveLine(RegCore.TARGETS[params.target].f, C.truth, true);
            if (results && results.optimal && results.optimal.beta) {
                curveLine(function (x) { return RegCore.predictOne(results.optimal.beta, x); }, C.model, false);
            }
            ctx.restore();

            train.forEach(function (d) {
                var isVal = runningFold >= 0 && foldOf(d) === runningFold;
                ctx.fillStyle = isVal ? C.val : C.train;
                ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            });
            test.forEach(function (d) {
                ctx.fillStyle = C.test;
                ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.rect(X(d.x) - 3.5, Y(d.y) - 3.5, 7, 7); ctx.fill(); ctx.stroke();
            });
        }

        /* ---------- rendering: CV curve (log-log) ---------- */
        function drawCurve() {
            var s = sizeCanvas(curveCanvas, 0.42);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            var m = { l: 48, r: 14, t: 12, b: 30 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;

            if (!results || results.perFold.length === 0) {
                ctx.fillStyle = C.muted; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Run Cross-Validation', s.w / 2, s.h / 2);
                return;
            }

            var lxMin = Math.log10(LAMBDAS[0]), lxMax = Math.log10(LAMBDAS[LAMBDAS.length - 1]);
            var vals = [];
            results.perFold.forEach(function (fe) {
                fe.forEach(function (v) { if (v !== null && isFinite(v) && v > 0) vals.push(v); });
            });
            if (vals.length === 0) return;
            var lyMin = Math.log10(Math.min.apply(null, vals));
            var lyMax = Math.log10(Math.max.apply(null, vals));
            if (lyMax - lyMin < 0.5) { lyMin -= 0.25; lyMax += 0.25; }
            function X(lam) { return m.l + (Math.log10(lam) - lxMin) / (lxMax - lxMin) * pw; }
            function Y(v) { return m.t + (lyMax - Math.log10(v)) / (lyMax - lyMin) * ph; }

            /* decade gridlines + labels */
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            for (var e = Math.ceil(lxMin); e <= Math.floor(lxMax); e++) {
                var lx = X(Math.pow(10, e));
                ctx.beginPath(); ctx.moveTo(lx, m.t); ctx.lineTo(lx, m.t + ph); ctx.stroke();
                ctx.fillText('1e' + e, lx, s.h - 10);
            }
            ctx.fillText('\u03BB', m.l + pw / 2, s.h - 0);
            ctx.textAlign = 'right';
            for (var ey = Math.ceil(lyMin); ey <= Math.floor(lyMax); ey++) {
                var ly = Y(Math.pow(10, ey));
                ctx.beginPath(); ctx.moveTo(m.l, ly); ctx.lineTo(m.l + pw, ly); ctx.stroke();
                ctx.fillText('1e' + ey, m.l - 5, ly + 3);
            }

            function polyline(get, color, width) {
                ctx.strokeStyle = color; ctx.lineWidth = width;
                ctx.beginPath();
                var started = false;
                for (var i = 0; i < LAMBDAS.length; i++) {
                    var v = get(i);
                    if (v === null || !isFinite(v) || v <= 0) { started = false; continue; }
                    if (!started) { ctx.moveTo(X(LAMBDAS[i]), Y(v)); started = true; }
                    else ctx.lineTo(X(LAMBDAS[i]), Y(v));
                }
                ctx.stroke();
            }

            results.perFold.forEach(function (fe) {
                polyline(function (i) { return fe[i]; }, C.foldLine, 1.2);
            });
            if (results.count === params.K) {
                polyline(function (i) { return results.mean[i]; }, C.meanLine, 2.4);
            }
            if (results.optimal) {
                var ox = X(results.optimal.lambda);
                ctx.strokeStyle = C.optimal; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
                ctx.beginPath(); ctx.moveTo(ox, m.t); ctx.lineTo(ox, m.t + ph); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = C.optimal;
                ctx.beginPath(); ctx.arc(ox, Y(results.optimal.cv), 4, 0, 2 * Math.PI); ctx.fill();
            }
        }

        /* ---------- fold strip / metrics ---------- */
        function renderFoldStrip() {
            foldsEl.innerHTML = '';
            for (var k = 0; k < params.K; k++) {
                var el = document.createElement('div');
                el.className = 'cv-fold' + (k === runningFold ? ' active' : '');
                el.textContent = 'F' + (k + 1) + (k === runningFold ? ' (val)' : '');
                foldsEl.appendChild(el);
            }
        }

        function fmtLam(l) { return l >= 1 ? l.toFixed(l >= 10 ? 0 : 1) : l.toPrecision(2); }

        function renderMetrics() {
            if (results && results.optimal) {
                var o = results.optimal;
                metricsEl.innerHTML =
                    '<div class="row"><span>&lambda;* (CV minimum)</span><span>' + fmtLam(o.lambda) + '</span></div>' +
                    '<div class="row"><span>CV error at &lambda;*</span><span>' + o.cv.toFixed(4) + '</span></div>' +
                    '<div class="row"><span>Held-out test MSE</span><span>' + (o.testMse === null ? '&mdash;' : o.testMse.toFixed(4)) + '</span></div>' +
                    '<div class="row"><span>&#8214;&beta;&#8214;&#8322; at &lambda;*</span><span>' + (o.norm === null ? '&mdash;' : o.norm.toFixed(3)) + '</span></div>';
                statusEl.textContent = 'Model refit on the full training set at \u03BB*, then evaluated once on the held-out test set.';
            } else {
                metricsEl.innerHTML =
                    '<div class="row"><span>Training points</span><span>' + train.length + '</span></div>' +
                    '<div class="row"><span>Held-out test points</span><span>' + test.length + '</span></div>' +
                    '<div class="row"><span>Folds</span><span>' + params.K + '</span></div>' +
                    '<div class="row"><span>&lambda; grid</span><span>' + LAMBDAS.length + ' values, 1e-4&ndash;1e2</span></div>';
                statusEl.textContent = isRunning ? 'Running\u2026' :
                    'No results yet \u2014 changing any setting resets them. Stopped runs are discarded rather than shown as complete.';
            }
        }

        function renderAll() {
            renderFoldStrip();
            renderMetrics();
            drawPlot();
            drawCurve();
        }

        /* ---------- controls ---------- */
        function bindRange(id, fn) {
            var el = document.getElementById(id);
            el.addEventListener('input', function () { fn(el); });
        }
        bindRange('cv-k', function (el) {
            params.K = parseInt(el.value, 10);
            document.getElementById('cv-k-val').textContent = String(params.K);
            folds = RegCore.makeFolds(train, params.K, rng);
            resetResults();
        });
        bindRange('cv-total', function (el) {
            params.total = parseInt(el.value, 10);
            document.getElementById('cv-total-val').textContent = String(params.total);
            regenerate();
        });
        bindRange('cv-test', function (el) {
            params.testPct = parseInt(el.value, 10);
            document.getElementById('cv-test-val').textContent = params.testPct + '%';
            regenerate();
        });
        bindRange('cv-noise', function (el) {
            params.noise = parseFloat(el.value);
            document.getElementById('cv-noise-val').textContent = params.noise.toFixed(1);
            regenerate();
        });
        bindRange('cv-deg', function (el) {
            params.degree = parseInt(el.value, 10);
            document.getElementById('cv-deg-val').textContent = String(params.degree);
            resetResults();   /* CV results depend on the degree; stale results must not survive */
        });
        function setTarget(t) {
            params.target = t;
            document.getElementById('cv-t-cubic').classList.toggle('on', t === 'cubic');
            document.getElementById('cv-t-sinusoid').classList.toggle('on', t === 'sinusoid');
            regenerate();
        }
        document.getElementById('cv-t-cubic').addEventListener('click', function () { setTarget('cubic'); });
        document.getElementById('cv-t-sinusoid').addEventListener('click', function () { setTarget('sinusoid'); });
        runBtn.addEventListener('click', runCv);
        document.getElementById('cv-newdata').addEventListener('click', regenerate);

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { padCache = {}; drawPlot(); drawCurve(); }, 120);
        });

        regenerate();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCvDemo);
    } else {
        initCvDemo();
    }
})();