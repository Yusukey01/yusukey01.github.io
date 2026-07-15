/* ============================================================
 * Logistic Regression Demo — math core (LogiCore)
 * Pure functions, no DOM. Model and loss match the page exactly:
 *   z = w0 + w1 x1 + w2 x2,  p = sigma(z),
 *   NLL(w) = mean BCE + (lambda/2)(w1^2 + w2^2)   [bias excluded].
 * Full-batch gradient descent; ALL gradient components are averaged
 * over the data (the v1 demo failed to average the bias component).
 * The core also encodes, as a TESTED FACT, the classical phenomenon:
 * on separable data with lambda = 0 the minimizer does not exist and
 * ||(w1,w2)|| grows without bound, while lambda > 0 restores a finite
 * optimum. The demo teaches this instead of hiding it.
 * ============================================================ */
var LogiCore = (function () {
    'use strict';

    function createRng(seed) {
        var s = seed >>> 0;
        return function () {
            s |= 0; s = (s + 0x6D2B79F5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function sigmoid(z) {
        if (z < -30) return 1e-13;
        if (z > 30) return 1 - 1e-13;
        return 1 / (1 + Math.exp(-z));
    }

    /* w = [w0, w1, w2] */
    function predict(w, x1, x2) {
        return sigmoid(w[0] + w[1] * x1 + w[2] * x2);
    }

    /* mean BCE + (lambda/2)(w1^2 + w2^2); bias excluded from penalty */
    function loss(w, data, lambda) {
        var s = 0, eps = 1e-12;
        for (var i = 0; i < data.length; i++) {
            var p = predict(w, data[i].x1, data[i].x2);
            p = Math.min(Math.max(p, eps), 1 - eps);
            s += -data[i].y * Math.log(p) - (1 - data[i].y) * Math.log(1 - p);
        }
        return s / data.length + (lambda / 2) * (w[1] * w[1] + w[2] * w[2]);
    }

    /* gradient of loss: mean over data of (p - y) * [1, x1, x2],
     * plus lambda * [0, w1, w2]. Every component is averaged. */
    function gradient(w, data, lambda) {
        var g = [0, 0, 0];
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            var err = predict(w, d.x1, d.x2) - d.y;
            g[0] += err;
            g[1] += err * d.x1;
            g[2] += err * d.x2;
        }
        var n = data.length;
        g[0] /= n;
        g[1] = g[1] / n + lambda * w[1];
        g[2] = g[2] / n + lambda * w[2];
        return g;
    }

    function applyGradient(w, g, lr) {
        w[0] -= lr * g[0];
        w[1] -= lr * g[1];
        w[2] -= lr * g[2];
    }

    /* norm of the penalized coordinates (w1, w2) — the quantity that
     * diverges on separable data at lambda = 0 */
    function normPenalized(w) {
        return Math.sqrt(w[1] * w[1] + w[2] * w[2]);
    }

    function accuracy(w, data) {
        if (data.length === 0) return 0;
        var c = 0;
        for (var i = 0; i < data.length; i++) {
            var cls = predict(w, data[i].x1, data[i].x2) >= 0.5 ? 1 : 0;
            if (cls === data[i].y) c++;
        }
        return c / data.length;
    }

    /* ---------- data generation ----------
     * Ground truth: a random line x2 = slope * x1 + intercept;
     * y = 1 above the line. No margin-rejection loop (v1 rejected
     * near-boundary points, which silently shrank the dataset and
     * broke the fixed 70/30 split). Labels flip with prob. noise.
     * Returns { train, test, truth: { slope, intercept } } with a
     * proportional 70/30 split. */
    function generateData(noise, n, rng) {
        var slope = rng() * 2 - 1;
        var intercept = rng() * 0.5 - 0.25;
        var pts = [];
        for (var i = 0; i < n; i++) {
            var x1 = rng() * 2 - 1;
            var x2 = rng() * 2 - 1;
            var y = x2 > slope * x1 + intercept ? 1 : 0;
            if (rng() < noise) y = 1 - y;
            pts.push({ x1: x1, x2: x2, y: y });
        }
        for (var k = pts.length - 1; k > 0; k--) {
            var j = Math.floor(rng() * (k + 1));
            var t = pts[k]; pts[k] = pts[j]; pts[j] = t;
        }
        var nTrain = Math.round(n * 0.7);
        return {
            train: pts.slice(0, nTrain),
            test: pts.slice(nTrain),
            truth: { slope: slope, intercept: intercept }
        };
    }

    /* ---------- self-tests ---------- */
    function runSelfTests() {
        var failures = [];

        /* T1: loss at w = 0 equals ln 2; sigmoid clamps pinned */
        (function () {
            var data = [{ x1: 0.3, x2: -0.7, y: 1 }, { x1: -0.2, x2: 0.5, y: 0 }];
            var L = loss([0, 0, 0], data, 0);
            if (Math.abs(L - Math.LN2) > 1e-12) failures.push('T1 zero-weight loss != ln2: ' + L);
            if (sigmoid(-40) > 1e-12 || 1 - sigmoid(40) > 1e-12) failures.push('T1b sigmoid clamp direction wrong');
            if (Math.abs(sigmoid(0) - 0.5) > 1e-15) failures.push('T1c sigmoid(0) != 0.5');
        })();

        /* T2: finite-difference gradient check (smooth everywhere) */
        (function () {
            var rng = createRng(12345);
            var d = generateData(0.1, 20, rng);
            var w = [rng() - 0.5, rng() - 0.5, rng() - 0.5];
            var lambda = 0.1, eps = 1e-6;
            var g = gradient(w, d.train, lambda);
            for (var i = 0; i < 3; i++) {
                var orig = w[i];
                w[i] = orig + eps; var Lp = loss(w, d.train, lambda);
                w[i] = orig - eps; var Lm = loss(w, d.train, lambda);
                w[i] = orig;
                var num = (Lp - Lm) / (2 * eps);
                var denom = Math.max(1e-8, Math.abs(num) + Math.abs(g[i]));
                if (Math.abs(num - g[i]) / denom > 1e-6) {
                    failures.push('T2 gradient check failed at w[' + i + ']: analytic=' + g[i] + ', numeric=' + num);
                }
            }
        })();

        /* T3: exactly on the decision line w0 + w1 x1 + w2 x2 = 0,
         * the predicted probability is exactly 0.5 */
        (function () {
            var w = [0.3, -1.1, 0.7];
            [-0.8, 0.1, 0.9].forEach(function (t) {
                var x2 = -(w[0] + w[1] * t) / w[2];
                if (Math.abs(predict(w, t, x2) - 0.5) > 1e-12) {
                    failures.push('T3 probability off 0.5 on the boundary line');
                }
            });
        })();

        /* T4: generator invariants at noise = 0: labels obey the truth
         * rule, split is exactly 70/30, labels in {0,1} */
        (function () {
            var rng = createRng(777);
            var d = generateData(0, 100, rng);
            if (d.train.length !== 70 || d.test.length !== 30) {
                failures.push('T4 split sizes wrong: ' + d.train.length + '/' + d.test.length);
            }
            var all = d.train.concat(d.test);
            for (var i = 0; i < all.length; i++) {
                var p = all[i];
                var expected = p.x2 > d.truth.slope * p.x1 + d.truth.intercept ? 1 : 0;
                if (p.y !== expected) { failures.push('T4 label rule violated'); break; }
                if (p.y !== 0 && p.y !== 1) { failures.push('T4 label not binary'); break; }
            }
        })();

        /* T5: the divergence phenomenon, verified.
         * Separable data (noise 0), lambda = 0: after a burn-in,
         * ||(w1,w2)|| keeps growing while the loss keeps decreasing.
         * Same data, lambda = 0.1: the norm stabilizes. */
        (function () {
            var rng = createRng(2026);
            var d = generateData(0, 100, rng);
            function run(lambda, iters, checkpoints) {
                var w = [0, 0, 0], out = {};
                for (var it = 1; it <= iters; it++) {
                    applyGradient(w, gradient(w, d.train, lambda), 0.5);
                    if (checkpoints.indexOf(it) !== -1) {
                        out[it] = { norm: normPenalized(w), loss: loss(w, d.train, lambda) };
                    }
                }
                return out;
            }
            var free = run(0, 4000, [500, 2000, 4000]);
            if (!(free[500].norm < free[2000].norm && free[2000].norm < free[4000].norm)) {
                failures.push('T5 norm did not keep growing at lambda=0: ' +
                    [free[500].norm, free[2000].norm, free[4000].norm].map(function (v) { return v.toFixed(2); }).join(' -> '));
            }
            if (!(free[4000].loss < free[500].loss)) {
                failures.push('T5 loss did not keep decreasing at lambda=0');
            }
            var reg = run(0.1, 4000, [2000, 4000]);
            var relChange = Math.abs(reg[4000].norm - reg[2000].norm) / reg[2000].norm;
            if (relChange > 1e-6) {
                failures.push('T5 norm did not stabilize at lambda=0.1: rel change ' + relChange);
            }
            if (!(reg[4000].norm < free[4000].norm)) {
                failures.push('T5 regularized norm not smaller than unregularized');
            }
        })();

        /* T6: for lambda > 0 the gradient vanishes at the long-run
         * iterate (a finite optimum exists and GD finds it) */
        (function () {
            var rng = createRng(31);
            var d = generateData(0.1, 100, rng);
            var w = [0, 0, 0];
            for (var it = 0; it < 5000; it++) applyGradient(w, gradient(w, d.train, 0.05), 0.5);
            var g = gradient(w, d.train, 0.05);
            var gn = Math.sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]);
            if (gn > 1e-6) failures.push('T6 gradient not vanishing at optimum: ' + gn);
        })();

        /* T7: one small step from w = 0 decreases the loss */
        (function () {
            var rng = createRng(9);
            var d = generateData(0.2, 60, rng);
            var w = [0, 0, 0];
            var L0 = loss(w, d.train, 0.01);
            applyGradient(w, gradient(w, d.train, 0.01), 0.1);
            if (!(loss(w, d.train, 0.01) < L0)) failures.push('T7 first step did not decrease loss');
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        createRng: createRng,
        sigmoid: sigmoid,
        predict: predict,
        loss: loss,
        gradient: gradient,
        applyGradient: applyGradient,
        normPenalized: normPenalized,
        accuracy: accuracy,
        generateData: generateData,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = LogiCore; }
/* ============================================================
 * Logistic Regression Demo — UI layer (v2)
 * Self-contained dark island. Depends only on LogiCore above.
 * Refuses to render if LogiCore.runSelfTests() fails.
 * Honest full-batch gradient descent: no early stopping, no hidden
 * hyperparameter adjustment. The ||(w1,w2)|| panel makes the
 * separable-data divergence phenomenon directly observable.
 * ============================================================ */
(function () {
    'use strict';

    function initLogiDemo() {
        var container = document.getElementById('logistic_regression_visualizer');
        if (!container) return;
        if (container.dataset.lgInit) return;   /* idempotency guard */
        container.dataset.lgInit = '1';

        var testResult = LogiCore.runSelfTests();
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

        var C = {
            island: 'rgba(20,28,40,0.95)',
            panel: 'rgba(255,255,255,0.04)',
            panelBorder: 'rgba(255,255,255,0.10)',
            plotBg: '#101826',
            grid: 'rgba(255,255,255,0.07)',
            axis: 'rgba(255,255,255,0.25)',
            text: 'rgba(255,255,255,0.88)',
            muted: 'rgba(255,255,255,0.55)',
            class0: '#4da3ff',
            class1: '#ff6b5e',
            class0Test: 'rgba(77,163,255,0.45)',
            class1Test: 'rgba(255,107,94,0.45)',
            boundary: '#2ecc71',
            truth: '#c084fc',
            lossTrain: '#4da3ff',
            lossTest: '#f5a623',
            norm: '#2ecc71'
        };

        var rng = LogiCore.createRng((Date.now() ^ 0x7C3B9A11) >>> 0);
        var LAMBDA_STOPS = [0, 1e-4, 1e-3, 1e-2, 1e-1, 1];
        var params = { noise: 0, lambda: 0, lr: Math.pow(10, -0.5), iterations: 2000 };
        var data = LogiCore.generateData(params.noise, 100, rng);
        var w = [0, 0, 0];
        var history = [];   /* { iter, trainLoss, testLoss, norm } (losses are pure BCE) */
        var globalIter = 0;
        var isTraining = false, stopRequested = false;
        var DOM_MIN = -1.15, DOM_MAX = 1.15;
        var GRID_N = 80;

        /* ---------- DOM ---------- */
        var style = document.createElement('style');
        style.textContent = [
            '#logistic_regression_visualizer .lg-root{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:10px;padding:18px;color:' + C.text + ';font-family:"Segoe UI",system-ui,sans-serif;}',
            '#logistic_regression_visualizer .lg-grid{display:flex;flex-direction:column;gap:16px;}',
            '@media (min-width:992px){#logistic_regression_visualizer .lg-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start;}}',
            '#logistic_regression_visualizer .lg-card{background:' + C.panel + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:14px;}',
            '#logistic_regression_visualizer .lg-card h3{margin:0 0 10px 0;font-size:1.02rem;color:' + C.text + ';font-weight:600;}',
            '#logistic_regression_visualizer .lg-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
            '#logistic_regression_visualizer canvas{display:block;width:100%;height:auto;border-radius:6px;}',
            '#logistic_regression_visualizer .lg-legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:10px;font-size:0.82rem;color:' + C.muted + ';}',
            '#logistic_regression_visualizer .lg-legend span.sw{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:3px;}',
            '#logistic_regression_visualizer .lg-legend span.pt{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;}',
            '#logistic_regression_visualizer .lg-curves{display:flex;flex-direction:column;gap:14px;}',
            '@media (min-width:768px){#logistic_regression_visualizer .lg-curves{display:grid;grid-template-columns:1fr 1fr;}}',
            '#logistic_regression_visualizer .lg-curves h4{margin:0 0 6px 0;font-size:0.88rem;color:' + C.muted + ';font-weight:600;}',
            '#logistic_regression_visualizer .lg-ctl{margin-bottom:14px;}',
            '#logistic_regression_visualizer .lg-ctl label{display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:6px;color:' + C.text + ';}',
            '#logistic_regression_visualizer .lg-ctl label .val{font-family:monospace;color:' + C.muted + ';}',
            '#logistic_regression_visualizer input[type=range]{width:100%;accent-color:#4da3ff;}',
            '#logistic_regression_visualizer .lg-btn{width:100%;padding:10px 0;border:none;border-radius:6px;font-size:0.95rem;cursor:pointer;margin-bottom:8px;color:#fff;}',
            '#logistic_regression_visualizer .lg-btn.train{background:#2f7fd6;}',
            '#logistic_regression_visualizer .lg-btn.train:hover{background:#3b8de4;}',
            '#logistic_regression_visualizer .lg-btn.train.stop{background:#c0564a;}',
            '#logistic_regression_visualizer .lg-btn.sec{background:rgba(255,255,255,0.10);color:' + C.text + ';}',
            '#logistic_regression_visualizer .lg-btn.sec:hover{background:rgba(255,255,255,0.16);}',
            '#logistic_regression_visualizer .lg-metrics{font-family:monospace;font-size:0.86rem;line-height:1.9;}',
            '#logistic_regression_visualizer .lg-metrics .row{display:flex;justify-content:space-between;}',
            '#logistic_regression_visualizer .lg-metrics .hd{color:' + C.muted + ';margin-top:6px;font-family:"Segoe UI",system-ui,sans-serif;font-size:0.8rem;}',
            '#logistic_regression_visualizer .lg-info{color:' + C.muted + ';font-size:0.84rem;margin-top:10px;line-height:1.5;}'
        ].join('\n');
        container.appendChild(style);

        var root = document.createElement('div');
        root.className = 'lg-root';
        root.innerHTML =
            '<div class="lg-grid">' +
            '  <div class="lg-main">' +
            '    <div class="lg-card">' +
            '      <h3>Data &amp; Decision Boundary</h3>' +
            '      <canvas id="lg-plot"></canvas>' +
            '      <div class="lg-legend">' +
            '        <span><span class="pt" style="background:' + C.class0 + '"></span>Train class 0</span>' +
            '        <span><span class="pt" style="background:' + C.class1 + '"></span>Train class 1</span>' +
            '        <span><span class="sw" style="background:' + C.boundary + '"></span>Learned boundary (p = 0.5)</span>' +
            '        <span><span class="sw" style="background:' + C.truth + '"></span>True boundary (dashed)</span>' +
            '        <span><span class="sw" style="background:linear-gradient(90deg,' + C.class0 + ',' + C.class1 + ')"></span>Probability shading</span>' +
            '      </div>' +
            '    </div>' +
            '    <div class="lg-card">' +
            '      <div class="lg-curves">' +
            '        <div><h4>Cross-entropy loss</h4><canvas id="lg-loss"></canvas></div>' +
            '        <div><h4>&#8214;(w&#8321;, w&#8322;)&#8214;&#8322;</h4><canvas id="lg-norm"></canvas></div>' +
            '      </div>' +
            '      <div class="lg-legend">' +
            '        <span><span class="sw" style="background:' + C.lossTrain + '"></span>Train loss</span>' +
            '        <span><span class="sw" style="background:' + C.lossTest + '"></span>Test loss</span>' +
            '        <span><span class="sw" style="background:' + C.norm + '"></span>Weight norm</span>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="lg-side">' +
            '    <div class="lg-card">' +
            '      <div class="lg-ctl"><label>Label noise <span class="val" id="lg-noise-val">0%</span></label>' +
            '        <input type="range" id="lg-noise" min="0" max="0.3" step="0.05" value="0"></div>' +
            '      <div class="lg-ctl"><label>Regularization &lambda; <span class="val" id="lg-lam-val">0</span></label>' +
            '        <input type="range" id="lg-lam" min="0" max="5" step="1" value="0"></div>' +
            '      <div class="lg-ctl"><label>Learning rate <span class="val" id="lg-lr-val">0.32</span></label>' +
            '        <input type="range" id="lg-lr" min="-2" max="0" step="0.1" value="-0.5"></div>' +
            '      <div class="lg-ctl"><label>Iterations per run <span class="val" id="lg-it-val">2000</span></label>' +
            '        <input type="range" id="lg-it" min="100" max="10000" step="100" value="2000"></div>' +
            '      <button id="lg-train" class="lg-btn train">Train</button>' +
            '      <button id="lg-newdata" class="lg-btn sec">New Data</button>' +
            '      <button id="lg-reset" class="lg-btn sec">Reset Weights</button>' +
            '    </div>' +
            '    <div class="lg-card" style="margin-top:16px;">' +
            '      <h3>Metrics</h3>' +
            '      <div class="lg-metrics" id="lg-metrics"></div>' +
            '      <div class="lg-info" id="lg-info"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        container.appendChild(root);

        var plotCanvas = document.getElementById('lg-plot');
        var lossCanvas = document.getElementById('lg-loss');
        var normCanvas = document.getElementById('lg-norm');
        var metricsEl = document.getElementById('lg-metrics');
        var infoEl = document.getElementById('lg-info');
        var trainBtn = document.getElementById('lg-train');

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

        /* ---------- scatter plot ---------- */
        function drawPlot() {
            var s = sizeCanvas(plotCanvas, 0.62);
            var ctx = s.ctx; if (!ctx) return;
            var m = { l: 34, r: 12, t: 10, b: 26 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            function X(x) { return m.l + (x - DOM_MIN) / (DOM_MAX - DOM_MIN) * pw; }
            function Y(y) { return m.t + (DOM_MAX - y) / (DOM_MAX - DOM_MIN) * ph; }

            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);

            /* probability shading */
            var off = document.createElement('canvas');
            off.width = GRID_N + 1; off.height = GRID_N + 1;
            var offCtx = off.getContext('2d');
            if (offCtx) {
                var img = offCtx.createImageData(GRID_N + 1, GRID_N + 1);
                for (var a = 0; a <= GRID_N; a++) {
                    for (var b = 0; b <= GRID_N; b++) {
                        var gx = DOM_MIN + (a / GRID_N) * (DOM_MAX - DOM_MIN);
                        var gy = DOM_MIN + (b / GRID_N) * (DOM_MAX - DOM_MIN);
                        var p = LogiCore.predict(w, gx, gy);
                        var px = (((GRID_N - b) * (GRID_N + 1)) + a) * 4;
                        if (p < 0.5) {
                            img.data[px] = 77; img.data[px + 1] = 163; img.data[px + 2] = 255;
                            img.data[px + 3] = Math.round(150 * (0.5 - p));
                        } else {
                            img.data[px] = 255; img.data[px + 1] = 107; img.data[px + 2] = 94;
                            img.data[px + 3] = Math.round(150 * (p - 0.5));
                        }
                    }
                }
                offCtx.putImageData(img, 0, 0);
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(off, 0, 0, GRID_N + 1, GRID_N + 1, m.l, m.t, pw, ph);
            }

            /* grid + axes */
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '11px monospace'; ctx.textAlign = 'center';
            [-1, -0.5, 0, 0.5, 1].forEach(function (t) {
                ctx.beginPath(); ctx.moveTo(X(t), m.t); ctx.lineTo(X(t), m.t + ph); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(m.l, Y(t)); ctx.lineTo(m.l + pw, Y(t)); ctx.stroke();
            });
            [-1, 0, 1].forEach(function (v) {
                ctx.fillText(String(v), X(v), s.h - 8);
                ctx.textAlign = 'right'; ctx.fillText(String(v), m.l - 6, Y(v) + 4); ctx.textAlign = 'center';
            });
            ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(X(0), m.t); ctx.lineTo(X(0), m.t + ph); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(m.l + pw, Y(0)); ctx.stroke();

            /* boundaries clipped to plot area */
            ctx.save();
            ctx.beginPath(); ctx.rect(m.l, m.t, pw, ph); ctx.clip();

            /* true boundary: x2 = slope x1 + intercept (dashed) */
            ctx.strokeStyle = C.truth; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(X(DOM_MIN), Y(data.truth.slope * DOM_MIN + data.truth.intercept));
            ctx.lineTo(X(DOM_MAX), Y(data.truth.slope * DOM_MAX + data.truth.intercept));
            ctx.stroke();
            ctx.setLineDash([]);

            /* learned boundary: w0 + w1 x1 + w2 x2 = 0 (analytic line) */
            if (Math.abs(w[2]) > 1e-12) {
                ctx.strokeStyle = C.boundary; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(X(DOM_MIN), Y((-w[0] - w[1] * DOM_MIN) / w[2]));
                ctx.lineTo(X(DOM_MAX), Y((-w[0] - w[1] * DOM_MAX) / w[2]));
                ctx.stroke();
            } else if (Math.abs(w[1]) > 1e-12) {
                var xv = -w[0] / w[1];
                ctx.strokeStyle = C.boundary; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(X(xv), m.t); ctx.lineTo(X(xv), m.t + ph); ctx.stroke();
            }
            ctx.restore();

            /* points */
            data.train.forEach(function (d) {
                ctx.fillStyle = d.y === 1 ? C.class1 : C.class0;
                ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(X(d.x1), Y(d.x2), 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            });
            data.test.forEach(function (d) {
                ctx.fillStyle = d.y === 1 ? C.class1Test : C.class0Test;
                ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.rect(X(d.x1) - 3.5, Y(d.x2) - 3.5, 7, 7); ctx.fill(); ctx.stroke();
            });
        }

        /* ---------- curve panels ---------- */
        function drawSeries(canvas, key, color, label) {
            var s = sizeCanvas(canvas, 0.62);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            var m = { l: 40, r: 8, t: 8, b: 22 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;

            if (history.length < 2) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Train', s.w / 2, s.h / 2);
                return;
            }
            var minIter = history[0].iter, maxIter = history[history.length - 1].iter;
            var maxV = 0;
            history.forEach(function (r) {
                (Array.isArray(key) ? key : [key]).forEach(function (kk) {
                    maxV = Math.max(maxV, r[kk]);
                });
            });
            maxV = Math.max(maxV * 1.05, 0.1);
            function Xc(it) { return m.l + (it - minIter) / Math.max(1, maxIter - minIter) * pw; }
            function Yc(v) { return m.t + (1 - v / maxV) * ph; }

            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '9px monospace'; ctx.textAlign = 'right';
            for (var k = 0; k <= 3; k++) {
                var v = maxV * k / 3;
                ctx.beginPath(); ctx.moveTo(m.l, Yc(v)); ctx.lineTo(m.l + pw, Yc(v)); ctx.stroke();
                ctx.fillText(v.toFixed(v < 10 ? 2 : 0), m.l - 4, Yc(v) + 3);
            }
            ctx.textAlign = 'center';
            ctx.fillText(String(maxIter) + ' it', m.l + pw - 18, s.h - 6);

            var specs = Array.isArray(key)
                ? [{ k: key[0], c: color[0] }, { k: key[1], c: color[1] }]
                : [{ k: key, c: color }];
            specs.forEach(function (sp) {
                ctx.strokeStyle = sp.c; ctx.lineWidth = 1.8; ctx.beginPath();
                for (var i = 0; i < history.length; i++) {
                    var r = history[i];
                    if (i === 0) ctx.moveTo(Xc(r.iter), Yc(r[sp.k]));
                    else ctx.lineTo(Xc(r.iter), Yc(r[sp.k]));
                }
                ctx.stroke();
            });
        }

        function drawCurves() {
            drawSeries(lossCanvas, ['trainLoss', 'testLoss'], [C.lossTrain, C.lossTest]);
            drawSeries(normCanvas, 'norm', C.norm);
        }

        /* ---------- metrics ---------- */
        function fmtLambda(l) {
            if (l === 0) return '0';
            return l >= 1 ? String(l) : l.toPrecision(1);
        }

        function renderMetrics() {
            metricsEl.innerHTML =
                '<div class="row"><span>Train accuracy</span><span>' + (LogiCore.accuracy(w, data.train) * 100).toFixed(1) + '%</span></div>' +
                '<div class="row"><span>Test accuracy</span><span>' + (LogiCore.accuracy(w, data.test) * 100).toFixed(1) + '%</span></div>' +
                '<div class="row"><span>Train loss (BCE)</span><span>' + LogiCore.loss(w, data.train, 0).toFixed(4) + '</span></div>' +
                '<div class="row"><span>&#8214;(w&#8321;, w&#8322;)&#8214;&#8322;</span><span>' + LogiCore.normPenalized(w).toFixed(3) + '</span></div>' +
                '<div class="row"><span>Iterations run</span><span>' + globalIter + '</span></div>' +
                '<div class="hd">Weights</div>' +
                '<div class="row"><span>w&#8320; (bias)</span><span>' + w[0].toFixed(4) + '</span></div>' +
                '<div class="row"><span>w&#8321;</span><span>' + w[1].toFixed(4) + '</span></div>' +
                '<div class="row"><span>w&#8322;</span><span>' + w[2].toFixed(4) + '</span></div>';

            infoEl.innerHTML = params.lambda === 0
                ? '&lambda; = 0: if the data are separable, the NLL has no minimizer &mdash; ' +
                  'the loss keeps decreasing while &#8214;(w&#8321;, w&#8322;)&#8214; keeps growing. Watch the right-hand curve.'
                : '';
        }

        function renderAll() { renderMetrics(); drawPlot(); drawCurves(); }

        /* ---------- training (honest, full batch) ---------- */
        function nextFrame() {
            return new Promise(function (res) {
                if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { res(); });
                else setTimeout(res, 16);
            });
        }

        var lockedWhileTraining = ['lg-noise', 'lg-newdata', 'lg-reset'];
        function setControlsLocked(locked) {
            lockedWhileTraining.forEach(function (id) {
                var el = document.getElementById(id);
                el.disabled = locked;
                el.style.opacity = locked ? '0.45' : '';
            });
        }

        async function runTraining() {
            if (isTraining) { stopRequested = true; return; }
            isTraining = true; stopRequested = false;
            setControlsLocked(true);
            trainBtn.textContent = 'Stop';
            trainBtn.classList.add('stop');

            var total = params.iterations;
            var chunk = Math.max(1, Math.round(total / 150));
            if (history.length === 0) {
                history.push({
                    iter: 0,
                    trainLoss: LogiCore.loss(w, data.train, 0),
                    testLoss: LogiCore.loss(w, data.test, 0),
                    norm: LogiCore.normPenalized(w)
                });
            }

            for (var it = 0; it < total && !stopRequested; it++) {
                LogiCore.applyGradient(w, LogiCore.gradient(w, data.train, params.lambda), params.lr);
                globalIter++;
                if (it % chunk === chunk - 1 || it === total - 1) {
                    history.push({
                        iter: globalIter,
                        trainLoss: LogiCore.loss(w, data.train, 0),
                        testLoss: LogiCore.loss(w, data.test, 0),
                        norm: LogiCore.normPenalized(w)
                    });
                    renderMetrics(); drawPlot(); drawCurves();
                    await nextFrame();
                }
            }

            isTraining = false;
            setControlsLocked(false);
            trainBtn.textContent = 'Train (Continue)';
            trainBtn.classList.remove('stop');
            renderAll();
        }

        /* ---------- resets ---------- */
        function resetWeights() {
            w = [0, 0, 0];
            history = []; globalIter = 0;
            trainBtn.textContent = 'Train';
            renderAll();
        }
        function regenerate() {
            data = LogiCore.generateData(params.noise, 100, rng);
            resetWeights();
        }

        /* ---------- controls ---------- */
        function bindRange(id, fn) {
            var el = document.getElementById(id);
            el.addEventListener('input', function () { fn(el); });
        }
        bindRange('lg-noise', function (el) {
            params.noise = parseFloat(el.value);
            document.getElementById('lg-noise-val').textContent = Math.round(params.noise * 100) + '%';
            if (!isTraining) regenerate();
        });
        bindRange('lg-lam', function (el) {
            params.lambda = LAMBDA_STOPS[parseInt(el.value, 10)];
            document.getElementById('lg-lam-val').textContent = fmtLambda(params.lambda);
            renderMetrics();
        });
        bindRange('lg-lr', function (el) {
            params.lr = Math.pow(10, parseFloat(el.value));
            document.getElementById('lg-lr-val').textContent = params.lr.toFixed(params.lr < 0.1 ? 3 : 2);
        });
        bindRange('lg-it', function (el) {
            params.iterations = parseInt(el.value, 10);
            document.getElementById('lg-it-val').textContent = String(params.iterations);
        });
        trainBtn.addEventListener('click', runTraining);
        document.getElementById('lg-newdata').addEventListener('click', function () { if (!isTraining) regenerate(); });
        document.getElementById('lg-reset').addEventListener('click', function () { if (!isTraining) resetWeights(); });

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { padCache = {}; drawPlot(); drawCurves(); }, 120);
        });

        renderAll();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogiDemo);
    } else {
        initLogiDemo();
    }
})();