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
 * Ridge Regression Demo — UI layer (v2)
 * Self-contained dark island. Depends only on RegCore above.
 * Refuses to render if RegCore.runSelfTests() fails.
 * When OLS is genuinely singular (n < d+1 or rank-deficient), the
 * demo says so honestly while ridge keeps working — this IS the
 * point of T-ridge_regression_solution, not a failure to hide.
 * ============================================================ */
(function () {
    'use strict';

    function initRidgeDemo() {
        var container = document.getElementById('ridge_regression_visualizer');
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

        /* ---------- palette (self-contained) ---------- */
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
            test: '#f5a623',
            ols: '#ff6b5e',
            ridge: '#2ecc71',
            truth: '#c084fc',
            warn: '#ffb3ab'
        };

        /* ---------- state ---------- */
        var rng = RegCore.createRng((Date.now() ^ 0x51ED2701) >>> 0);
        var LAMBDA_STOPS = [0, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100];
        var TEST_N = 60;
        var params = { target: 'cubic', degree: 9, nTrain: 30, noise: 0.5, lambda: 1 };
        var train = [], test = [];
        var olsFit = { ok: false }, ridgeFit = { ok: false };
        var DOM_MIN = -1.15, DOM_MAX = 1.15;

        /* ---------- DOM ---------- */
        var style = document.createElement('style');
        style.textContent = [
            '#ridge_regression_visualizer .rr-root{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:10px;padding:18px;color:' + C.text + ';font-family:"Segoe UI",system-ui,sans-serif;}',
            '#ridge_regression_visualizer .rr-grid{display:flex;flex-direction:column;gap:16px;}',
            '@media (min-width:992px){#ridge_regression_visualizer .rr-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start;}}',
            '#ridge_regression_visualizer .rr-card{background:' + C.panel + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:14px;}',
            '#ridge_regression_visualizer .rr-card h3{margin:0 0 10px 0;font-size:1.02rem;color:' + C.text + ';font-weight:600;}',
            '#ridge_regression_visualizer .rr-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
            '#ridge_regression_visualizer canvas{display:block;width:100%;height:auto;border-radius:6px;}',
            '#ridge_regression_visualizer .rr-legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:10px;font-size:0.82rem;color:' + C.muted + ';}',
            '#ridge_regression_visualizer .rr-legend span.sw{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:3px;}',
            '#ridge_regression_visualizer .rr-legend span.pt{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;}',
            '#ridge_regression_visualizer .rr-legend span.sq{display:inline-block;width:9px;height:9px;margin-right:5px;vertical-align:-1px;}',
            '#ridge_regression_visualizer .rr-ctl{margin-bottom:14px;}',
            '#ridge_regression_visualizer .rr-ctl label{display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:6px;color:' + C.text + ';}',
            '#ridge_regression_visualizer .rr-ctl label .val{font-family:monospace;color:' + C.muted + ';}',
            '#ridge_regression_visualizer input[type=range]{width:100%;accent-color:#4da3ff;}',
            '#ridge_regression_visualizer .rr-seg{display:flex;gap:6px;}',
            '#ridge_regression_visualizer .rr-seg button{flex:1;padding:7px 0;border-radius:6px;border:1px solid ' + C.panelBorder + ';background:transparent;color:' + C.muted + ';cursor:pointer;font-size:0.86rem;}',
            '#ridge_regression_visualizer .rr-seg button.on{background:rgba(77,163,255,0.18);border-color:#4da3ff;color:' + C.text + ';}',
            '#ridge_regression_visualizer .rr-btn{width:100%;padding:10px 0;border:none;border-radius:6px;font-size:0.95rem;cursor:pointer;margin-bottom:8px;color:' + C.text + ';background:rgba(255,255,255,0.10);}',
            '#ridge_regression_visualizer .rr-btn:hover{background:rgba(255,255,255,0.16);}',
            '#ridge_regression_visualizer .rr-metrics{font-family:monospace;font-size:0.86rem;line-height:1.9;}',
            '#ridge_regression_visualizer .rr-metrics .row{display:flex;justify-content:space-between;}',
            '#ridge_regression_visualizer .rr-metrics .hd{color:' + C.muted + ';margin-top:6px;font-family:"Segoe UI",system-ui,sans-serif;font-size:0.8rem;}',
            '#ridge_regression_visualizer .rr-msg{color:' + C.warn + ';font-size:0.84rem;margin-top:10px;line-height:1.5;}',
            '#ridge_regression_visualizer .rr-wrow{display:flex;align-items:center;gap:8px;margin-bottom:4px;font-family:monospace;font-size:0.78rem;}',
            '#ridge_regression_visualizer .rr-wlabel{width:44px;text-align:right;color:' + C.muted + ';flex-shrink:0;}',
            '#ridge_regression_visualizer .rr-wtrack{position:relative;flex:1;height:14px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;}',
            '#ridge_regression_visualizer .rr-wcenter{position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.35);}',
            '#ridge_regression_visualizer .rr-wbar{position:absolute;top:2px;height:4px;border-radius:2px;}',
            '#ridge_regression_visualizer .rr-wbar.ridge{top:8px;}',
            '#ridge_regression_visualizer .rr-wnote{font-size:0.75rem;color:' + C.muted + ';margin-top:8px;}'
        ].join('\n');
        container.appendChild(style);

        var root = document.createElement('div');
        root.className = 'rr-root';
        root.innerHTML =
            '<div class="rr-grid">' +
            '  <div class="rr-main">' +
            '    <div class="rr-card">' +
            '      <h3>OLS vs Ridge Fit</h3>' +
            '      <canvas id="rr-plot"></canvas>' +
            '      <div class="rr-legend">' +
            '        <span><span class="pt" style="background:' + C.train + '"></span>Train</span>' +
            '        <span><span class="sq" style="background:' + C.test + '"></span>Test</span>' +
            '        <span><span class="sw" style="background:' + C.ols + '"></span>OLS (&lambda; = 0)</span>' +
            '        <span><span class="sw" style="background:' + C.ridge + '"></span>Ridge</span>' +
            '        <span><span class="sw" style="background:' + C.truth + '"></span>True function (dashed)</span>' +
            '      </div>' +
            '    </div>' +
            '    <div class="rr-card">' +
            '      <h3>Coefficient Comparison</h3>' +
            '      <div id="rr-weights"></div>' +
            '      <div class="rr-wnote">Bar length on a log scale (coefficients can differ by orders of magnitude); hover a bar for the exact value. Red = OLS, green = Ridge; left of center = negative.</div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="rr-side">' +
            '    <div class="rr-card">' +
            '      <div class="rr-ctl"><label>Target function</label>' +
            '        <div class="rr-seg">' +
            '          <button id="rr-t-cubic" class="on">Cubic</button>' +
            '          <button id="rr-t-sinusoid">Sinusoid</button>' +
            '        </div>' +
            '      </div>' +
            '      <div class="rr-ctl"><label>Polynomial degree <span class="val" id="rr-deg-val">9</span></label>' +
            '        <input type="range" id="rr-deg" min="1" max="15" step="1" value="9"></div>' +
            '      <div class="rr-ctl"><label>Training points <span class="val" id="rr-n-val">30</span></label>' +
            '        <input type="range" id="rr-n" min="10" max="50" step="1" value="30"></div>' +
            '      <div class="rr-ctl"><label>Noise level <span class="val" id="rr-noise-val">0.5</span></label>' +
            '        <input type="range" id="rr-noise" min="0" max="1" step="0.1" value="0.5"></div>' +
            '      <div class="rr-ctl"><label>Regularization &lambda; <span class="val" id="rr-lam-val">1</span></label>' +
            '        <input type="range" id="rr-lam" min="0" max="7" step="1" value="5"></div>' +
            '      <button id="rr-newdata" class="rr-btn">New Data</button>' +
            '    </div>' +
            '    <div class="rr-card" style="margin-top:16px;">' +
            '      <h3>Metrics</h3>' +
            '      <div class="rr-metrics" id="rr-metrics"></div>' +
            '      <div class="rr-msg" id="rr-msg"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        container.appendChild(root);

        var plotCanvas = document.getElementById('rr-plot');
        var metricsEl = document.getElementById('rr-metrics');
        var msgEl = document.getElementById('rr-msg');
        var weightsEl = document.getElementById('rr-weights');

        /* ---------- canvas sizing (DPR-aware, padding-cached) ---------- */
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

        /* ---------- model pipeline ---------- */
        function regenerate() {
            train = RegCore.generatePoints(params.target, params.nTrain, params.noise, rng);
            test = RegCore.generatePoints(params.target, TEST_N, params.noise, rng);
            refit();
        }

        function refit() {
            olsFit = RegCore.fitPolyRidge(train, params.degree, 0);
            ridgeFit = RegCore.fitPolyRidge(train, params.degree, params.lambda);
            renderAll();
        }

        /* ---------- plot ---------- */
        function yRangeFromData() {
            var ys = train.concat(test).map(function (d) { return d.y; });
            var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
            var pad = Math.max((hi - lo) * 0.15, 0.2);
            return { min: lo - pad, max: hi + pad };
        }

        function drawPlot() {
            var s = sizeCanvas(plotCanvas, 0.62);
            var ctx = s.ctx; if (!ctx) return;
            var m = { l: 40, r: 12, t: 10, b: 26 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            var yr = yRangeFromData();
            function X(x) { return m.l + (x - DOM_MIN) / (DOM_MAX - DOM_MIN) * pw; }
            function Y(y) { return m.t + (yr.max - y) / (yr.max - yr.min) * ph; }

            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);

            /* grid + axis labels */
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '11px monospace';
            [-1, -0.5, 0, 0.5, 1].forEach(function (gx) {
                ctx.beginPath(); ctx.moveTo(X(gx), m.t); ctx.lineTo(X(gx), m.t + ph); ctx.stroke();
            });
            ctx.textAlign = 'center';
            [-1, 0, 1].forEach(function (gx) { ctx.fillText(String(gx), X(gx), s.h - 8); });
            var ySpan = yr.max - yr.min;
            var yStep = Math.pow(10, Math.floor(Math.log(ySpan / 4) / Math.LN10));
            if (ySpan / yStep > 8) yStep *= 2;
            ctx.textAlign = 'right';
            for (var gy = Math.ceil(yr.min / yStep) * yStep; gy <= yr.max; gy += yStep) {
                ctx.strokeStyle = C.grid;
                ctx.beginPath(); ctx.moveTo(m.l, Y(gy)); ctx.lineTo(m.l + pw, Y(gy)); ctx.stroke();
                ctx.fillText(gy.toFixed(yStep < 1 ? 1 : 0), m.l - 6, Y(gy) + 4);
            }
            ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2;
            if (yr.min < 0 && yr.max > 0) {
                ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(m.l + pw, Y(0)); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(X(0), m.t); ctx.lineTo(X(0), m.t + ph); ctx.stroke();

            /* clip curves to the plot area so exploding OLS stays honest but tidy */
            ctx.save();
            ctx.beginPath();
            ctx.rect(m.l, m.t, pw, ph);
            ctx.clip();

            function curve(f, color, dashed) {
                ctx.strokeStyle = color; ctx.lineWidth = 2;
                ctx.setLineDash(dashed ? [6, 4] : []);
                ctx.beginPath();
                var N = 240;
                for (var i = 0; i <= N; i++) {
                    var x = DOM_MIN + (i / N) * (DOM_MAX - DOM_MIN);
                    var y = f(x);
                    if (i === 0) ctx.moveTo(X(x), Y(y));
                    else ctx.lineTo(X(x), Y(y));
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
            curve(RegCore.TARGETS[params.target].f, C.truth, true);
            if (olsFit.ok) curve(function (x) { return RegCore.predictOne(olsFit.beta, x); }, C.ols, false);
            if (ridgeFit.ok) curve(function (x) { return RegCore.predictOne(ridgeFit.beta, x); }, C.ridge, false);
            ctx.restore();

            /* points */
            train.forEach(function (d) {
                ctx.fillStyle = C.train;
                ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            });
            test.forEach(function (d) {
                ctx.fillStyle = 'rgba(245,166,35,0.55)';
                ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.rect(X(d.x) - 3.5, Y(d.y) - 3.5, 7, 7); ctx.fill(); ctx.stroke();
            });
        }

        /* ---------- metrics ---------- */
        function fmtMSE(fit, data) {
            if (!fit.ok) return '&mdash;';
            return RegCore.mse(RegCore.predictAll(fit.beta, data), data.map(function (d) { return d.y; })).toFixed(3);
        }
        function fmtNorm(fit) {
            if (!fit.ok) return '&mdash;';
            var v = RegCore.normL2(fit.beta);
            return v >= 1000 ? v.toExponential(2) : v.toFixed(3);
        }

        function renderMetrics() {
            metricsEl.innerHTML =
                '<div class="hd">OLS (&lambda; = 0)</div>' +
                '<div class="row"><span>Train MSE</span><span>' + fmtMSE(olsFit, train) + '</span></div>' +
                '<div class="row"><span>Test MSE</span><span>' + fmtMSE(olsFit, test) + '</span></div>' +
                '<div class="row"><span>&#8214;&beta;&#8214;&#8322;</span><span>' + fmtNorm(olsFit) + '</span></div>' +
                '<div class="hd">Ridge (&lambda; = ' + fmtLambda(params.lambda) + ')</div>' +
                '<div class="row"><span>Train MSE</span><span>' + fmtMSE(ridgeFit, train) + '</span></div>' +
                '<div class="row"><span>Test MSE</span><span>' + fmtMSE(ridgeFit, test) + '</span></div>' +
                '<div class="row"><span>&#8214;&beta;&#8214;&#8322;</span><span>' + fmtNorm(ridgeFit) + '</span></div>';

            var msgs = [];
            if (!olsFit.ok) {
                msgs.push('OLS is singular here: with ' + params.nTrain + ' points and degree ' +
                    params.degree + ' (' + (params.degree + 1) + ' coefficients), X<sup>&#8868;</sup>X is not invertible. ' +
                    'Ridge still has a unique solution because &lambda;I makes X<sup>&#8868;</sup>X + &lambda;I positive definite &mdash; ' +
                    'exactly the guarantee in the theorem above.');
            }
            if (!ridgeFit.ok) msgs.push('Ridge solve failed unexpectedly.');
            if (params.lambda === 0 && olsFit.ok) {
                msgs.push('&lambda; = 0: the two fits coincide (ridge reduces to OLS).');
            }
            msgEl.innerHTML = msgs.join('<br>');
        }

        function fmtLambda(l) {
            if (l === 0) return '0';
            return l >= 1 ? String(l) : l.toPrecision(1);
        }

        /* ---------- weight bars (symmetric log scale) ---------- */
        function renderWeights() {
            weightsEl.innerHTML = '';
            var p = params.degree + 1;
            var w0 = 0.01;
            var maxMag = 0;
            [olsFit, ridgeFit].forEach(function (f) {
                if (f.ok) f.beta.forEach(function (w) { maxMag = Math.max(maxMag, Math.abs(w)); });
            });
            if (maxMag === 0) maxMag = 1;
            var logMax = Math.log10(1 + maxMag / w0);
            function halfWidth(w) { return 50 * Math.log10(1 + Math.abs(w) / w0) / logMax; }

            for (var i = 0; i < p; i++) {
                var row = document.createElement('div');
                row.className = 'rr-wrow';
                var label = document.createElement('div');
                label.className = 'rr-wlabel';
                label.textContent = i === 0 ? 'bias' : 'w' + i;
                var track = document.createElement('div');
                track.className = 'rr-wtrack';
                var center = document.createElement('div');
                center.className = 'rr-wcenter';
                track.appendChild(center);
                [{ fit: olsFit, color: C.ols, cls: '' }, { fit: ridgeFit, color: C.ridge, cls: 'ridge' }]
                    .forEach(function (spec) {
                        if (!spec.fit.ok) return;
                        var w = spec.fit.beta[i];
                        var hw = halfWidth(w);
                        var bar = document.createElement('div');
                        bar.className = 'rr-wbar ' + spec.cls;
                        bar.style.background = spec.color;
                        bar.style.width = hw + '%';
                        bar.style.left = (w >= 0 ? 50 : 50 - hw) + '%';
                        bar.title = (spec.cls ? 'Ridge: ' : 'OLS: ') +
                            (Math.abs(w) >= 1000 ? w.toExponential(3) : w.toFixed(4));
                        track.appendChild(bar);
                    });
                row.appendChild(label);
                row.appendChild(track);
                weightsEl.appendChild(row);
            }
        }

        function renderAll() { renderMetrics(); renderWeights(); drawPlot(); }

        /* ---------- controls ---------- */
        function bindRange(id, fn) {
            var el = document.getElementById(id);
            el.addEventListener('input', function () { fn(el); });
        }
        bindRange('rr-deg', function (el) {
            params.degree = parseInt(el.value, 10);
            document.getElementById('rr-deg-val').textContent = String(params.degree);
            refit();
        });
        bindRange('rr-n', function (el) {
            params.nTrain = parseInt(el.value, 10);
            document.getElementById('rr-n-val').textContent = String(params.nTrain);
            regenerate();
        });
        bindRange('rr-noise', function (el) {
            params.noise = parseFloat(el.value);
            document.getElementById('rr-noise-val').textContent = params.noise.toFixed(1);
            regenerate();
        });
        bindRange('rr-lam', function (el) {
            params.lambda = LAMBDA_STOPS[parseInt(el.value, 10)];
            document.getElementById('rr-lam-val').textContent = fmtLambda(params.lambda);
            refit();
        });
        function setTarget(t) {
            params.target = t;
            document.getElementById('rr-t-cubic').classList.toggle('on', t === 'cubic');
            document.getElementById('rr-t-sinusoid').classList.toggle('on', t === 'sinusoid');
            regenerate();
        }
        document.getElementById('rr-t-cubic').addEventListener('click', function () { setTarget('cubic'); });
        document.getElementById('rr-t-sinusoid').addEventListener('click', function () { setTarget('sinusoid'); });
        document.getElementById('rr-newdata').addEventListener('click', regenerate);

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { padCache = {}; drawPlot(); }, 120);
        });

        regenerate();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRidgeDemo);
    } else {
        initRidgeDemo();
    }
})();