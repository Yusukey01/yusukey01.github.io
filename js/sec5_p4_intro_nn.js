/* ============================================================
 * Neural Networks Demo — core math (v2)
 * Pure functions only: no DOM access. Notation follows the page:
 *   a^(l) = pre-activations,  z^(l) = activations (post-nonlinearity).
 * Architecture: 2 -> H (ReLU) -> 1 (sigmoid), binary cross-entropy,
 * L2 regularization on weights (not biases).
 * ============================================================ */
var NNCore = (function () {
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

    /* Box-Muller with rejection of u = 0 */
    function randn(rng) {
        var u = 0, v = 0;
        while (u === 0) u = rng();
        while (v === 0) v = rng();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    /* ---------- network ---------- */
    /* He init for the ReLU layer (std = sqrt(2/fan_in)),
     * Glorot-normal for the sigmoid output (std = sqrt(2/(fan_in+fan_out))).
     * b1 = 0.01 (small constant, avoids all-dead ReLU at init; deterministic,
     * no retry loops). b2 = 0. */
    function initNetwork(hiddenUnits, rng) {
        var H = hiddenUnits;
        var w1Std = Math.sqrt(2.0 / 2.0);
        var w2Std = Math.sqrt(2.0 / (H + 1));
        var W1 = [[], []];
        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < H; j++) W1[i][j] = randn(rng) * w1Std;
        }
        var b1 = [];
        for (var k = 0; k < H; k++) b1[k] = 0.01;
        var W2 = [];
        for (var m = 0; m < H; m++) W2[m] = randn(rng) * w2Std;
        return { W1: W1, b1: b1, W2: W2, b2: 0, H: H };
    }

    function sigmoid(t) {
        if (t < -30) return 1e-13;
        if (t > 30) return 1 - 1e-13;
        return 1 / (1 + Math.exp(-t));
    }

    /* forward pass. x = [x1, x2].
     * Returns { a1[H], z1[H], a2, yhat } with a = pre-act, z = act. */
    function forward(net, x) {
        var H = net.H, a1 = new Array(H), z1 = new Array(H);
        for (var j = 0; j < H; j++) {
            var t = net.b1[j] + net.W1[0][j] * x[0] + net.W1[1][j] * x[1];
            a1[j] = t;
            z1[j] = t > 0 ? t : 0;
        }
        var a2 = net.b2;
        for (var k = 0; k < H; k++) a2 += net.W2[k] * z1[k];
        return { a1: a1, z1: z1, a2: a2, yhat: sigmoid(a2) };
    }

    function predict(net, x1, x2) { return forward(net, [x1, x2]).yhat; }

    /* mean BCE over dataset + (lambda/2)(||W1||^2 + ||W2||^2). Biases excluded. */
    function loss(net, dataset, lambda) {
        var s = 0, eps = 1e-12;
        for (var i = 0; i < dataset.length; i++) {
            var p = forward(net, [dataset[i].x1, dataset[i].x2]).yhat;
            p = Math.min(Math.max(p, eps), 1 - eps);
            s += -dataset[i].y * Math.log(p) - (1 - dataset[i].y) * Math.log(1 - p);
        }
        s /= dataset.length;
        var reg = 0, H = net.H;
        for (var a = 0; a < 2; a++) for (var b = 0; b < H; b++) reg += net.W1[a][b] * net.W1[a][b];
        for (var c = 0; c < H; c++) reg += net.W2[c] * net.W2[c];
        return s + (lambda / 2) * reg;
    }

    function accuracy(net, dataset) {
        if (dataset.length === 0) return 0;
        var correct = 0;
        for (var i = 0; i < dataset.length; i++) {
            var cls = predict(net, dataset[i].x1, dataset[i].x2) >= 0.5 ? 1 : 0;
            if (cls === dataset[i].y) correct++;
        }
        return correct / dataset.length;
    }

    /* gradients of loss(net, batch, lambda) w.r.t. all parameters.
     * BCE + sigmoid => dL/da2 = yhat - y (per sample).
     * ReLU: dz/da = 1[a > 0]. L2 adds lambda * W after averaging. */
    function gradients(net, batch, lambda) {
        var H = net.H;
        var g = {
            W1: [new Array(H).fill(0), new Array(H).fill(0)],
            b1: new Array(H).fill(0),
            W2: new Array(H).fill(0),
            b2: 0
        };
        for (var i = 0; i < batch.length; i++) {
            var x = [batch[i].x1, batch[i].x2];
            var f = forward(net, x);
            var d2 = f.yhat - batch[i].y;           /* dL/da2 */
            for (var j = 0; j < H; j++) {
                g.W2[j] += d2 * f.z1[j];
                var d1 = d2 * net.W2[j] * (f.a1[j] > 0 ? 1 : 0);  /* dL/da1_j */
                g.W1[0][j] += d1 * x[0];
                g.W1[1][j] += d1 * x[1];
                g.b1[j] += d1;
            }
            g.b2 += d2;
        }
        var n = batch.length;
        for (var a = 0; a < 2; a++) {
            for (var b = 0; b < H; b++) g.W1[a][b] = g.W1[a][b] / n + lambda * net.W1[a][b];
        }
        for (var c = 0; c < H; c++) {
            g.b1[c] /= n;
            g.W2[c] = g.W2[c] / n + lambda * net.W2[c];
        }
        g.b2 /= n;
        return g;
    }

    /* in-place SGD step */
    function applyGradients(net, g, lr) {
        var H = net.H;
        for (var a = 0; a < 2; a++) for (var b = 0; b < H; b++) net.W1[a][b] -= lr * g.W1[a][b];
        for (var c = 0; c < H; c++) { net.b1[c] -= lr * g.b1[c]; net.W2[c] -= lr * g.W2[c]; }
        net.b2 -= lr * g.b2;
    }

    /* ---------- data generation ----------
     * pattern: 'xor' | 'circle'. noise = label-flip probability in [0, 0.5).
     * Returns { train: [...], test: [...] } with a 70/30 split. */
    function generateData(pattern, noise, numPoints, rng) {
        var pts = [], i, x1, x2, y;
        if (pattern === 'xor') {
            for (i = 0; i < numPoints; i++) {
                x1 = rng() * 2 - 1;
                x2 = rng() * 2 - 1;
                y = ((x1 > 0) !== (x2 > 0)) ? 1 : 0;
                if (rng() < noise) y = 1 - y;
                pts.push({ x1: x1, x2: x2, y: y });
            }
        } else { /* circle: uniform on unit disk, inner radius 0.55 => class 1 */
            for (i = 0; i < numPoints; i++) {
                var r = Math.sqrt(rng());
                var th = rng() * 2 * Math.PI;
                x1 = r * Math.cos(th);
                x2 = r * Math.sin(th);
                y = r < 0.55 ? 1 : 0;
                if (rng() < noise) y = 1 - y;
                pts.push({ x1: x1, x2: x2, y: y });
            }
        }
        /* Fisher-Yates shuffle with the same rng */
        for (i = pts.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp;
        }
        var nTrain = Math.round(numPoints * 0.7);
        return { train: pts.slice(0, nTrain), test: pts.slice(nTrain) };
    }

    /* ---------- marching squares ----------
     * values: flat array, v(i,j) = values[i * (ny + 1) + j], i = 0..nx, j = 0..ny.
     * Returns segments [{x1,y1,x2,y2}] in GRID coordinates (x in [0,nx], y in [0,ny])
     * approximating the level set v = level. Ambiguous saddle cases (5, 10) are
     * resolved with a fixed convention (adequate for display purposes). */
    function levelSetSegments(values, nx, ny, level) {
        var segs = [];
        function v(i, j) { return values[i * (ny + 1) + j]; }
        function interp(vA, vB) { return (level - vA) / (vB - vA); }
        for (var i = 0; i < nx; i++) {
            for (var j = 0; j < ny; j++) {
                var a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
                var idx = (a > level ? 1 : 0) | (b > level ? 2 : 0) |
                          (c > level ? 4 : 0) | (d > level ? 8 : 0);
                if (idx === 0 || idx === 15) continue;
                /* edge crossing points in grid coords */
                var bot = { x: i + interp(a, b), y: j };
                var rgt = { x: i + 1, y: j + interp(b, c) };
                var top = { x: i + interp(d, c), y: j + 1 };
                var lft = { x: i, y: j + interp(a, d) };
                function add(p, q) { segs.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y }); }
                switch (idx) {
                    case 1: case 14: add(lft, bot); break;
                    case 2: case 13: add(bot, rgt); break;
                    case 4: case 11: add(rgt, top); break;
                    case 8: case 7:  add(top, lft); break;
                    case 3: case 12: add(lft, rgt); break;
                    case 6: case 9:  add(bot, top); break;
                    case 5:  add(lft, top); add(bot, rgt); break;
                    case 10: add(lft, bot); add(top, rgt); break;
                }
            }
        }
        return segs;
    }

    /* ---------- self-tests ----------
     * Returns { passed: bool, failures: [string] }. The UI layer must
     * refuse to render when passed === false. */
    function runSelfTests() {
        var failures = [];

        /* T1: loss at zero weights equals ln 2 (yhat = 0.5 everywhere) */
        (function () {
            var net = { W1: [[0, 0, 0], [0, 0, 0]], b1: [0, 0, 0], W2: [0, 0, 0], b2: 0, H: 3 };
            var ds = [{ x1: 0.3, x2: -0.7, y: 1 }, { x1: -0.2, x2: 0.5, y: 0 }];
            var L = loss(net, ds, 0);
            if (Math.abs(L - Math.LN2) > 1e-12) {
                failures.push('T1 zero-weight loss: got ' + L + ', expected ln2 = ' + Math.LN2);
            }
        })();

        /* T2: hand-computed forward pass.
         * W1 = I, b1 = 0, W2 = [1, -1], b2 = 0.5, x = (0.3, -0.2)
         * a1 = (0.3, -0.2), z1 = (0.3, 0), a2 = 0.5 + 0.3 = 0.8, yhat = sigma(0.8) */
        (function () {
            var net = { W1: [[1, 0], [0, 1]], b1: [0, 0], W2: [1, -1], b2: 0.5, H: 2 };
            var f = forward(net, [0.3, -0.2]);
            var expected = 1 / (1 + Math.exp(-0.8));
            if (Math.abs(f.a1[0] - 0.3) > 1e-15 || Math.abs(f.a1[1] + 0.2) > 1e-15 ||
                Math.abs(f.z1[0] - 0.3) > 1e-15 || f.z1[1] !== 0 ||
                Math.abs(f.a2 - 0.8) > 1e-15 || Math.abs(f.yhat - expected) > 1e-15) {
                failures.push('T2 forward pass mismatch: ' + JSON.stringify(f));
            }
        })();

        /* T3: finite-difference gradient check.
         * Fixed seed, H = 3, 8 points, lambda = 0.1. Central differences,
         * eps = 1e-6. ReLU kink safety: skip coordinates whose perturbation
         * crosses a1 = 0 for some sample (checked explicitly). */
        (function () {
            var rng = createRng(12345);
            var net = initNetwork(3, rng);
            var batch = [];
            for (var i = 0; i < 8; i++) {
                batch.push({ x1: rng() * 2 - 1, x2: rng() * 2 - 1, y: i % 2 });
            }
            var lambda = 0.1, eps = 1e-6;
            var g = gradients(net, batch, lambda);

            function lossAt() { return loss(net, batch, lambda); }

            /* enumerate parameters as (getter, setter, analytic, name) */
            var params = [];
            var H = net.H;
            for (var a = 0; a < 2; a++) {
                for (var b = 0; b < H; b++) {
                    (function (a, b) {
                        params.push({
                            get: function () { return net.W1[a][b]; },
                            set: function (v) { net.W1[a][b] = v; },
                            analytic: g.W1[a][b],
                            name: 'W1[' + a + '][' + b + ']'
                        });
                    })(a, b);
                }
            }
            for (var c = 0; c < H; c++) {
                (function (c) {
                    params.push({
                        get: function () { return net.b1[c]; },
                        set: function (v) { net.b1[c] = v; },
                        analytic: g.b1[c],
                        name: 'b1[' + c + ']'
                    });
                    params.push({
                        get: function () { return net.W2[c]; },
                        set: function (v) { net.W2[c] = v; },
                        analytic: g.W2[c],
                        name: 'W2[' + c + ']'
                    });
                })(c);
            }
            params.push({
                get: function () { return net.b2; },
                set: function (v) { net.b2 = v; },
                analytic: g.b2,
                name: 'b2'
            });

            /* kink-crossing detector: does perturbing this parameter by ±eps
             * flip the sign of any hidden pre-activation on the batch? */
            function crossesKink(p) {
                var orig = p.get(), crossed = false;
                [orig + eps, orig - eps].forEach(function (v) {
                    p.set(v);
                    for (var i = 0; i < batch.length; i++) {
                        var f0 = forward(net, [batch[i].x1, batch[i].x2]);
                        p.set(orig);
                        var f1 = forward(net, [batch[i].x1, batch[i].x2]);
                        p.set(v);
                        for (var j = 0; j < H; j++) {
                            if ((f0.a1[j] > 0) !== (f1.a1[j] > 0)) crossed = true;
                        }
                    }
                });
                p.set(orig);
                return crossed;
            }

            var checked = 0;
            for (var k = 0; k < params.length; k++) {
                var p = params[k];
                if (crossesKink(p)) continue;   /* non-differentiable point: skip */
                var orig = p.get();
                p.set(orig + eps); var Lp = lossAt();
                p.set(orig - eps); var Lm = lossAt();
                p.set(orig);
                var numeric = (Lp - Lm) / (2 * eps);
                var denom = Math.max(1e-8, Math.abs(numeric) + Math.abs(p.analytic));
                var relErr = Math.abs(numeric - p.analytic) / denom;
                if (relErr > 1e-4) {
                    failures.push('T3 gradient check failed at ' + p.name +
                        ': analytic=' + p.analytic + ', numeric=' + numeric +
                        ', relErr=' + relErr);
                }
                checked++;
            }
            if (checked < params.length - 2) {
                failures.push('T3 too many kink-skipped parameters: checked only ' +
                    checked + '/' + params.length);
            }
        })();

        /* T4: data generator invariants (noise = 0) */
        (function () {
            var rng = createRng(777);
            var d = generateData('xor', 0, 100, rng);
            if (d.train.length !== 70 || d.test.length !== 30) {
                failures.push('T4 split sizes wrong: ' + d.train.length + '/' + d.test.length);
            }
            var all = d.train.concat(d.test);
            for (var i = 0; i < all.length; i++) {
                var p = all[i];
                var expected = ((p.x1 > 0) !== (p.x2 > 0)) ? 1 : 0;
                if (p.y !== expected) { failures.push('T4 xor label rule violated'); break; }
                if (p.y !== 0 && p.y !== 1) { failures.push('T4 label not in {0,1}'); break; }
            }
            var rng2 = createRng(778);
            var d2 = generateData('circle', 0, 100, rng2);
            var all2 = d2.train.concat(d2.test);
            for (var k = 0; k < all2.length; k++) {
                var q = all2[k];
                var r = Math.sqrt(q.x1 * q.x1 + q.x2 * q.x2);
                if (q.y !== (r < 0.55 ? 1 : 0)) { failures.push('T4 circle label rule violated'); break; }
            }
        })();

        /* T5: one SGD step on a linearly-encodable target decreases loss
         * (full-batch, small lr => guaranteed descent direction) */
        (function () {
            var rng = createRng(2026);
            var net = initNetwork(4, rng);
            var d = generateData('xor', 0, 60, rng);
            var L0 = loss(net, d.train, 0.01);
            var g = gradients(net, d.train, 0.01);
            applyGradients(net, g, 0.01);
            var L1 = loss(net, d.train, 0.01);
            if (!(L1 < L0)) {
                failures.push('T5 full-batch step did not decrease loss: ' + L0 + ' -> ' + L1);
            }
        })();

        /* T6: marching squares on known fields.
         * (a) linear field v = i - 1.5 on a 4x3 grid: level 0 must be the
         *     vertical line x = 1.5 covering every row.
         * (b) radial field v = r - 0.5: every segment endpoint must satisfy
         *     |r - 0.5| < one cell diagonal. */
        (function () {
            var nx = 4, ny = 3, vals = [], i, j;
            /* asymmetric crossing: v = i - 1.25 => level set is x = 1.25,
             * t = 0.25, NOT invariant under interpolation-argument swap */
            for (i = 0; i <= nx; i++) for (j = 0; j <= ny; j++) vals[i * (ny + 1) + j] = i - 1.25;
            var segs = levelSetSegments(vals, nx, ny, 0);
            if (segs.length !== ny) {
                failures.push('T6a expected ' + ny + ' segments, got ' + segs.length);
            }
            for (i = 0; i < segs.length; i++) {
                if (Math.abs(segs[i].x1 - 1.25) > 1e-12 || Math.abs(segs[i].x2 - 1.25) > 1e-12) {
                    failures.push('T6a segment not on x = 1.25: ' + JSON.stringify(segs[i]));
                    break;
                }
            }
            /* same in the y-direction: v = j - 0.75 => level set is y = 0.75 */
            var valsY = [];
            for (i = 0; i <= nx; i++) for (j = 0; j <= ny; j++) valsY[i * (ny + 1) + j] = j - 0.75;
            var segsY = levelSetSegments(valsY, nx, ny, 0);
            if (segsY.length !== nx) {
                failures.push('T6c expected ' + nx + ' segments, got ' + segsY.length);
            }
            for (i = 0; i < segsY.length; i++) {
                if (Math.abs(segsY[i].y1 - 0.75) > 1e-12 || Math.abs(segsY[i].y2 - 0.75) > 1e-12) {
                    failures.push('T6c segment not on y = 0.75: ' + JSON.stringify(segsY[i]));
                    break;
                }
            }
            var n = 40, h = 2 / n, vals2 = [];
            for (i = 0; i <= n; i++) {
                for (j = 0; j <= n; j++) {
                    var x = -1 + i * h, y = -1 + j * h;
                    vals2[i * (n + 1) + j] = Math.sqrt(x * x + y * y) - 0.5;
                }
            }
            var segs2 = levelSetSegments(vals2, n, n, 0);
            if (segs2.length < 20) failures.push('T6b too few circle segments: ' + segs2.length);
            var cellDiag = Math.SQRT2 * h;
            for (i = 0; i < segs2.length; i++) {
                var pts = [[segs2[i].x1, segs2[i].y1], [segs2[i].x2, segs2[i].y2]];
                for (j = 0; j < 2; j++) {
                    var px = -1 + pts[j][0] * h, py = -1 + pts[j][1] * h;
                    var r = Math.sqrt(px * px + py * py);
                    if (Math.abs(r - 0.5) > cellDiag) {
                        failures.push('T6b endpoint off level set: r = ' + r);
                        i = segs2.length; break;
                    }
                }
            }
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        createRng: createRng,
        randn: randn,
        initNetwork: initNetwork,
        sigmoid: sigmoid,
        forward: forward,
        predict: predict,
        loss: loss,
        accuracy: accuracy,
        gradients: gradients,
        applyGradients: applyGradients,
        generateData: generateData,
        levelSetSegments: levelSetSegments,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = NNCore; }
/* ============================================================
 * Neural Networks Demo — UI layer (v2)
 * Self-contained dark island. Depends only on NNCore above.
 * Refuses to render if NNCore.runSelfTests() fails.
 * ============================================================ */
(function () {
    'use strict';

    function initNNDemo() {

    var container = document.getElementById('neural_network_visualizer');
    if (!container) return;

    /* ---------- self-test gate ---------- */
    var testResult = NNCore.runSelfTests();
    if (!testResult.passed) {
        container.innerHTML =
            '<div style="background:rgba(40,20,24,0.95);border:1px solid #ff6b5e;' +
            'border-radius:8px;padding:20px;color:#ffb3ab;font-family:monospace;font-size:0.85rem;">' +
            '<strong>Demo disabled: mathematical self-tests failed.</strong><br>' +
            'The interactive demo refuses to render because its internal ' +
            'verification did not pass. Details:<br><pre style="white-space:pre-wrap;">' +
            testResult.failures.map(function (f) {
                return f.replace(/&/g, '&amp;').replace(/</g, '&lt;');
            }).join('\n') + '</pre></div>';
        return;
    }

    /* ---------- palette (self-contained: no var(--), no theme reads) ---------- */
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
        demoPt: '#c084fc',
        trainCurve: '#4da3ff',
        testCurve: '#f5a623',
        pos: 'rgba(46,204,113,',
        neg: 'rgba(255,107,94,'
    };

    /* ---------- state ---------- */
    var rng = NNCore.createRng((Date.now() ^ 0x9E3779B9) >>> 0);
    var params = {
        pattern: 'xor',
        noise: 0,
        hiddenUnits: 4,
        lambda: 0.001,
        lr: Math.pow(10, -0.5),
        batchSize: 16,
        iterations: 2000
    };
    var LAMBDA_STOPS = [0, 1e-4, 3e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1];
    var BATCH_STOPS = [4, 8, 16, 32, 70];
    var data = NNCore.generateData(params.pattern, params.noise, 100, rng);
    var net = NNCore.initNetwork(params.hiddenUnits, rng);
    var lossHistory = [];   /* { iter, train, test } */
    var globalIter = 0;
    var isTraining = false;
    var stopRequested = false;
    var diverged = false;
    var demoPoint = { x1: 0.5, x2: 0.3 };
    var isDemoMode = false;

    /* data domain shown in the plot (data lives in [-1,1]^2) */
    var DOM_MIN = -1.15, DOM_MAX = 1.15;

    /* ---------- DOM ---------- */
    var style = document.createElement('style');
    style.textContent = [
        '#neural_network_visualizer .nnv-root{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:10px;padding:18px;color:' + C.text + ';font-family:"Segoe UI",system-ui,sans-serif;}',
        '#neural_network_visualizer .nnv-grid{display:flex;flex-direction:column;gap:16px;}',
        '@media (min-width:992px){#neural_network_visualizer .nnv-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start;}}',
        '#neural_network_visualizer .nnv-card{background:' + C.panel + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:14px;}',
        '#neural_network_visualizer .nnv-card h3{margin:0 0 10px 0;font-size:1.02rem;color:' + C.text + ';font-weight:600;}',
        '#neural_network_visualizer .nnv-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
        '#neural_network_visualizer canvas{display:block;width:100%;height:auto;border-radius:6px;}',
        '#neural_network_visualizer .nnv-legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:10px;font-size:0.82rem;color:' + C.muted + ';}',
        '#neural_network_visualizer .nnv-legend span.sw{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px;}',
        '#neural_network_visualizer .nnv-ctl{margin-bottom:14px;}',
        '#neural_network_visualizer .nnv-ctl label{display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:6px;color:' + C.text + ';}',
        '#neural_network_visualizer .nnv-ctl label .val{font-family:monospace;color:' + C.muted + ';}',
        '#neural_network_visualizer input[type=range]{width:100%;accent-color:#4da3ff;}',
        '#neural_network_visualizer .nnv-seg{display:flex;gap:6px;}',
        '#neural_network_visualizer .nnv-seg button{flex:1;padding:7px 0;border-radius:6px;border:1px solid ' + C.panelBorder + ';background:transparent;color:' + C.muted + ';cursor:pointer;font-size:0.86rem;}',
        '#neural_network_visualizer .nnv-seg button.on{background:rgba(77,163,255,0.18);border-color:#4da3ff;color:' + C.text + ';}',
        '#neural_network_visualizer .nnv-btn{width:100%;padding:10px 0;border:none;border-radius:6px;font-size:0.95rem;cursor:pointer;margin-bottom:8px;color:#fff;}',
        '#neural_network_visualizer .nnv-btn.train{background:#2f7fd6;}',
        '#neural_network_visualizer .nnv-btn.train:hover{background:#3b8de4;}',
        '#neural_network_visualizer .nnv-btn.train.stop{background:#c0564a;}',
        '#neural_network_visualizer .nnv-btn.sec{background:rgba(255,255,255,0.10);color:' + C.text + ';}',
        '#neural_network_visualizer .nnv-btn.sec:hover{background:rgba(255,255,255,0.16);}',
        '#neural_network_visualizer .nnv-metrics{font-family:monospace;font-size:0.88rem;line-height:1.9;}',
        '#neural_network_visualizer .nnv-metrics .row{display:flex;justify-content:space-between;}',
        '#neural_network_visualizer .nnv-metrics .warn{color:#ffb3ab;font-family:inherit;}',
        '#neural_network_visualizer .nnv-arch{margin-top:16px;}',
        '#neural_network_visualizer .nnv-demo-ctl{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;}',
        '#neural_network_visualizer .nnv-demo-btn{background:#8b5cf6;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:0.88rem;}',
        '#neural_network_visualizer .nnv-demo-btn.on{background:#c0564a;}',
        '#neural_network_visualizer .nnv-demo-coord{font-family:monospace;font-size:0.85rem;color:' + C.muted + ';}',
        '#neural_network_visualizer .nnv-steps{font-family:monospace;font-size:0.82rem;line-height:1.55;max-height:320px;overflow-y:auto;margin-top:12px;}',
        '#neural_network_visualizer .nnv-step{background:rgba(255,255,255,0.03);border-left:3px solid #4da3ff;border-radius:0 5px 5px 0;padding:9px 12px;margin-bottom:10px;}',
        '#neural_network_visualizer .nnv-step .t{font-weight:700;color:' + C.text + ';margin-bottom:5px;font-family:"Segoe UI",system-ui,sans-serif;font-size:0.85rem;}',
        '#neural_network_visualizer .nnv-step .c{color:' + C.muted + ';}',
        '#neural_network_visualizer .nnv-step .r{color:#2ecc71;font-weight:700;}',
        '@media (min-width:992px){#neural_network_visualizer .nnv-arch-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;}}'
    ].join('\n');

    container.appendChild(style);

    var root = document.createElement('div');
    root.className = 'nnv-root';
    root.innerHTML =
        '<div class="nnv-grid">' +
        '  <div class="nnv-main">' +
        '    <div class="nnv-card">' +
        '      <h3>Classification &amp; Decision Boundary</h3>' +
        '      <canvas id="nnv-plot"></canvas>' +
        '      <div class="nnv-legend">' +
        '        <span><span class="sw" style="background:' + C.class0 + '"></span>Train class 0</span>' +
        '        <span><span class="sw" style="background:' + C.class1 + '"></span>Train class 1</span>' +
        '        <span><span class="sw" style="background:' + C.class0Test + '"></span>Test class 0</span>' +
        '        <span><span class="sw" style="background:' + C.class1Test + '"></span>Test class 1</span>' +
        '        <span><span class="sw" style="background:' + C.boundary + '"></span>Boundary (&#375; = 0.5)</span>' +
        '        <span><span class="sw" style="background:linear-gradient(90deg,' + C.class0 + ',' + C.class1 + ')"></span>Probability shading</span>' +
        '      </div>' +
        '    </div>' +
        '    <div class="nnv-card">' +
        '      <h3>Training Curves (binary cross-entropy)</h3>' +
        '      <canvas id="nnv-curve"></canvas>' +
        '      <div class="nnv-legend">' +
        '        <span><span class="sw" style="background:' + C.trainCurve + '"></span>Train loss</span>' +
        '        <span><span class="sw" style="background:' + C.testCurve + '"></span>Test loss</span>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div class="nnv-side">' +
        '    <div class="nnv-card">' +
        '      <div class="nnv-ctl"><label>Dataset</label>' +
        '        <div class="nnv-seg">' +
        '          <button id="nnv-pat-xor" class="on">XOR</button>' +
        '          <button id="nnv-pat-circle">Circle</button>' +
        '        </div>' +
        '      </div>' +
        '      <div class="nnv-ctl"><label>Label noise <span class="val" id="nnv-noise-val">0%</span></label>' +
        '        <input type="range" id="nnv-noise" min="0" max="0.3" step="0.05" value="0"></div>' +
        '      <div class="nnv-ctl"><label>Hidden units <span class="val" id="nnv-h-val">4</span></label>' +
        '        <input type="range" id="nnv-h" min="2" max="10" step="1" value="4"></div>' +
        '      <div class="nnv-ctl"><label>Regularization &lambda; <span class="val" id="nnv-lam-val">0.001</span></label>' +
        '        <input type="range" id="nnv-lam" min="0" max="7" step="1" value="3"></div>' +
        '      <div class="nnv-ctl"><label>Learning rate <span class="val" id="nnv-lr-val">0.32</span></label>' +
        '        <input type="range" id="nnv-lr" min="-2" max="0" step="0.1" value="-0.5"></div>' +
        '      <div class="nnv-ctl"><label>Batch size <span class="val" id="nnv-bs-val">16</span></label>' +
        '        <input type="range" id="nnv-bs" min="0" max="4" step="1" value="2"></div>' +
        '      <div class="nnv-ctl"><label>Iterations per run <span class="val" id="nnv-it-val">2000</span></label>' +
        '        <input type="range" id="nnv-it" min="100" max="10000" step="100" value="2000"></div>' +
        '      <button id="nnv-train" class="nnv-btn train">Train</button>' +
        '      <button id="nnv-newdata" class="nnv-btn sec">New Data</button>' +
        '      <button id="nnv-reset" class="nnv-btn sec">Reset Weights</button>' +
        '    </div>' +
        '    <div class="nnv-card" style="margin-top:16px;">' +
        '      <h3>Metrics</h3>' +
        '      <div class="nnv-metrics" id="nnv-metrics"></div>' +
        '    </div>' +
        '  </div>' +
        '</div>' +
        '<div class="nnv-card nnv-arch">' +
        '  <h3>Network Architecture &amp; Forward Pass</h3>' +
        '  <div class="nnv-demo-ctl">' +
        '    <button id="nnv-demo-btn" class="nnv-demo-btn">Select Demo Point</button>' +
        '    <span class="nnv-demo-coord" id="nnv-demo-coord"></span>' +
        '  </div>' +
        '  <div class="nnv-arch-grid">' +
        '    <div><canvas id="nnv-graph"></canvas></div>' +
        '    <div class="nnv-steps" id="nnv-steps"></div>' +
        '  </div>' +
        '</div>';

    container.appendChild(root);

    /* ---------- element refs ---------- */
    var plotCanvas = document.getElementById('nnv-plot');
    var curveCanvas = document.getElementById('nnv-curve');
    var graphCanvas = document.getElementById('nnv-graph');
    var metricsEl = document.getElementById('nnv-metrics');
    var stepsEl = document.getElementById('nnv-steps');
    var trainBtn = document.getElementById('nnv-train');
    var demoBtn = document.getElementById('nnv-demo-btn');
    var demoCoordEl = document.getElementById('nnv-demo-coord');

    /* ---------- canvas sizing (DPR-aware) ---------- */
    var padCache = {};   /* parent horizontal padding per canvas id; invalidated on resize */
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

    /* ---------- plot panel ---------- */
    var GRID_N = 80; /* heatmap / boundary sampling resolution */

    function plotGeometry(w, h) {
        var m = { l: 34, r: 12, t: 10, b: 26 };
        return {
            m: m, pw: w - m.l - m.r, ph: h - m.t - m.b,
            xToPx: function (x) { return m.l + (x - DOM_MIN) / (DOM_MAX - DOM_MIN) * (w - m.l - m.r); },
            yToPx: function (y) { return m.t + (DOM_MAX - y) / (DOM_MAX - DOM_MIN) * (h - m.t - m.b); },
            pxToX: function (px) { return DOM_MIN + (px - m.l) / (w - m.l - m.r) * (DOM_MAX - DOM_MIN); },
            pxToY: function (py) { return DOM_MAX - (py - m.t) / (h - m.t - m.b) * (DOM_MAX - DOM_MIN); }
        };
    }

    function drawPlot() {
        var s = sizeCanvas(plotCanvas, 0.62);
        var ctx = s.ctx; if (!ctx) return;
        var g = plotGeometry(s.w, s.h);

        ctx.fillStyle = C.plotBg;
        ctx.fillRect(0, 0, s.w, s.h);

        /* probability field sampled once, reused for heatmap + boundary */
        var vals = new Array((GRID_N + 1) * (GRID_N + 1));
        for (var i = 0; i <= GRID_N; i++) {
            for (var j = 0; j <= GRID_N; j++) {
                var x = DOM_MIN + (i / GRID_N) * (DOM_MAX - DOM_MIN);
                var y = DOM_MIN + (j / GRID_N) * (DOM_MAX - DOM_MIN);
                vals[i * (GRID_N + 1) + j] = NNCore.predict(net, x, y);
            }
        }

        /* heatmap via offscreen canvas scaled up */
        var off = document.createElement('canvas');
        off.width = GRID_N + 1; off.height = GRID_N + 1;
        var offCtx = off.getContext('2d');
        if (offCtx) {
            var img = offCtx.createImageData(GRID_N + 1, GRID_N + 1);
            for (var a = 0; a <= GRID_N; a++) {
                for (var b = 0; b <= GRID_N; b++) {
                    var p = vals[a * (GRID_N + 1) + b];
                    /* image row 0 = top = y max => flip j */
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
            ctx.drawImage(off, 0, 0, GRID_N + 1, GRID_N + 1, g.m.l, g.m.t, g.pw, g.ph);
        }

        /* grid + axes */
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        for (var t = -1; t <= 1; t += 0.5) {
            ctx.beginPath(); ctx.moveTo(g.xToPx(t), g.m.t); ctx.lineTo(g.xToPx(t), g.m.t + g.ph); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(g.m.l, g.yToPx(t)); ctx.lineTo(g.m.l + g.pw, g.yToPx(t)); ctx.stroke();
        }
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(g.xToPx(0), g.m.t); ctx.lineTo(g.xToPx(0), g.m.t + g.ph); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(g.m.l, g.yToPx(0)); ctx.lineTo(g.m.l + g.pw, g.yToPx(0)); ctx.stroke();
        ctx.fillStyle = C.muted; ctx.font = '11px monospace'; ctx.textAlign = 'center';
        [-1, 0, 1].forEach(function (v) {
            ctx.fillText(v.toString(), g.xToPx(v), s.h - 8);
            ctx.textAlign = 'right';
            ctx.fillText(v.toString(), g.m.l - 6, g.yToPx(v) + 4);
            ctx.textAlign = 'center';
        });

        /* decision boundary: continuous segments via marching squares */
        var segs = NNCore.levelSetSegments(vals, GRID_N, GRID_N, 0.5);
        ctx.strokeStyle = C.boundary; ctx.lineWidth = 2; ctx.lineCap = 'round';
        function gridToPxX(gx) { return g.xToPx(DOM_MIN + (gx / GRID_N) * (DOM_MAX - DOM_MIN)); }
        function gridToPxY(gy) { return g.yToPx(DOM_MIN + (gy / GRID_N) * (DOM_MAX - DOM_MIN)); }
        ctx.beginPath();
        for (var sIdx = 0; sIdx < segs.length; sIdx++) {
            ctx.moveTo(gridToPxX(segs[sIdx].x1), gridToPxY(segs[sIdx].y1));
            ctx.lineTo(gridToPxX(segs[sIdx].x2), gridToPxY(segs[sIdx].y2));
        }
        ctx.stroke();

        /* data points */
        function pt(d, fill, square) {
            var px = g.xToPx(d.x1), py = g.yToPx(d.x2);
            ctx.fillStyle = fill;
            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (square) { ctx.rect(px - 3.5, py - 3.5, 7, 7); }
            else { ctx.arc(px, py, 4, 0, 2 * Math.PI); }
            ctx.fill(); ctx.stroke();
        }
        data.train.forEach(function (d) { pt(d, d.y === 1 ? C.class1 : C.class0, false); });
        data.test.forEach(function (d) { pt(d, d.y === 1 ? C.class1Test : C.class0Test, true); });

        /* demo point */
        var dx = g.xToPx(demoPoint.x1), dy = g.yToPx(demoPoint.x2);
        ctx.fillStyle = C.demoPt;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dx, dy, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

        if (isDemoMode) {
            ctx.strokeStyle = C.demoPt; ctx.lineWidth = 2; ctx.setLineDash([8, 5]);
            ctx.strokeRect(g.m.l, g.m.t, g.pw, g.ph);
            ctx.setLineDash([]);
            ctx.fillStyle = C.demoPt; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Click inside the plot to place the demo point', s.w / 2, g.m.t + 16);
        }
    }

    /* ---------- loss curve panel ---------- */
    function drawCurve() {
        var s = sizeCanvas(curveCanvas, 0.34);
        var ctx = s.ctx; if (!ctx) return;
        ctx.fillStyle = C.plotBg;
        ctx.fillRect(0, 0, s.w, s.h);
        var m = { l: 42, r: 12, t: 10, b: 24 };
        var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;

        if (lossHistory.length < 2) {
            ctx.fillStyle = C.muted; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Press Train to record loss curves', s.w / 2, s.h / 2);
            return;
        }
        var maxIter = lossHistory[lossHistory.length - 1].iter;
        var minIter = lossHistory[0].iter;
        var maxLoss = 0;
        lossHistory.forEach(function (r) { maxLoss = Math.max(maxLoss, r.train, r.test); });
        maxLoss = Math.max(maxLoss * 1.05, 0.1);

        function X(it) { return m.l + (it - minIter) / Math.max(1, maxIter - minIter) * pw; }
        function Y(L) { return m.t + (1 - L / maxLoss) * ph; }

        /* gridlines + labels */
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.fillStyle = C.muted; ctx.font = '10px monospace';
        for (var k = 0; k <= 4; k++) {
            var Lv = maxLoss * k / 4;
            ctx.beginPath(); ctx.moveTo(m.l, Y(Lv)); ctx.lineTo(m.l + pw, Y(Lv)); ctx.stroke();
            ctx.textAlign = 'right';
            ctx.fillText(Lv.toFixed(2), m.l - 5, Y(Lv) + 3);
        }
        ctx.textAlign = 'center';
        ctx.fillText(String(minIter), m.l, s.h - 8);
        ctx.fillText(String(maxIter) + ' iterations', m.l + pw - 30, s.h - 8);

        function line(key, color) {
            ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
            for (var i = 0; i < lossHistory.length; i++) {
                var r = lossHistory[i];
                if (i === 0) ctx.moveTo(X(r.iter), Y(r[key]));
                else ctx.lineTo(X(r.iter), Y(r[key]));
            }
            ctx.stroke();
        }
        line('train', C.trainCurve);
        line('test', C.testCurve);
    }

    /* ---------- metrics ---------- */
    function renderMetrics() {
        var trA = NNCore.accuracy(net, data.train);
        var teA = NNCore.accuracy(net, data.test);
        var trL = NNCore.loss(net, data.train, 0);
        var teL = NNCore.loss(net, data.test, 0);
        var html =
            '<div class="row"><span>Train accuracy</span><span>' + (trA * 100).toFixed(1) + '%</span></div>' +
            '<div class="row"><span>Test accuracy</span><span>' + (teA * 100).toFixed(1) + '%</span></div>' +
            '<div class="row"><span>Train loss</span><span>' + trL.toFixed(4) + '</span></div>' +
            '<div class="row"><span>Test loss</span><span>' + teL.toFixed(4) + '</span></div>' +
            '<div class="row"><span>Iterations run</span><span>' + globalIter + '</span></div>';
        if (diverged) {
            html += '<div class="warn">Training diverged (non-finite loss).<br>Try a lower learning rate, then Reset Weights.</div>';
        }
        metricsEl.innerHTML = html;
    }

    /* ---------- network graph ---------- */
    function drawGraph() {
        var s = sizeCanvas(graphCanvas, 0.62);
        var ctx = s.ctx; if (!ctx) return;
        ctx.fillStyle = C.plotBg;
        ctx.fillRect(0, 0, s.w, s.h);

        var H = net.H;
        var colX = [s.w * 0.18, s.w * 0.5, s.w * 0.82];
        var topM = 44, botM = 24, uh = s.h - topM - botM;
        var f = NNCore.forward(net, [demoPoint.x1, demoPoint.x2]);

        var inputs = [
            { x: colX[0], y: topM + uh * 0.32, label: 'x\u2081', value: demoPoint.x1 },
            { x: colX[0], y: topM + uh * 0.68, label: 'x\u2082', value: demoPoint.x2 }
        ];
        var hidden = [];
        for (var i = 0; i < H; i++) {
            hidden.push({
                x: colX[1],
                y: topM + uh * (H === 1 ? 0.5 : 0.06 + 0.88 * i / (H - 1)),
                label: 'z' + subDigits(i + 1),
                value: f.z1[i],
                active: f.a1[i] > 0
            });
        }
        var out = { x: colX[2], y: topM + uh * 0.5, label: '\u0177', value: f.yhat };

        /* edges: green positive, red negative; thickness ~ |w| / max|w| */
        var allW = [];
        for (var a = 0; a < 2; a++) for (var b = 0; b < H; b++) allW.push(Math.abs(net.W1[a][b]));
        for (var c = 0; c < H; c++) allW.push(Math.abs(net.W2[c]));
        var maxW = Math.max.apply(null, allW.concat([1e-9]));
        var showLabels = H <= 6;

        function edge(p, q, w) {
            var op = Math.min(1, Math.abs(w) / maxW) * 0.75 + 0.15;
            ctx.strokeStyle = (w >= 0 ? C.pos : C.neg) + op + ')';
            ctx.lineWidth = Math.max(1, Math.abs(w) / maxW * 3.2);
            ctx.beginPath(); ctx.moveTo(p.x + 15, p.y); ctx.lineTo(q.x - 15, q.y); ctx.stroke();
            if (showLabels) {
                ctx.fillStyle = C.muted; ctx.font = '10px monospace'; ctx.textAlign = 'center';
                ctx.fillText(w.toFixed(2), (p.x + q.x) / 2, (p.y + q.y) / 2 - 3);
            }
        }
        for (var e1 = 0; e1 < 2; e1++) for (var e2 = 0; e2 < H; e2++) edge(inputs[e1], hidden[e2], net.W1[e1][e2]);
        for (var e3 = 0; e3 < H; e3++) edge(hidden[e3], out, net.W2[e3]);

        function node(p, ring) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.strokeStyle = ring; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            ctx.fillStyle = C.text; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(p.label, p.x, p.y + 4);
            ctx.fillStyle = C.muted; ctx.font = '10px monospace';
            ctx.fillText(p.value.toFixed(3), p.x, p.y + 29);
        }
        inputs.forEach(function (p) { node(p, 'rgba(255,255,255,0.35)'); });
        hidden.forEach(function (p) { node(p, p.active ? C.boundary : 'rgba(255,107,94,0.8)'); });
        node(out, out.value >= 0.5 ? C.class1 : C.class0);

        ctx.fillStyle = C.text; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Input', colX[0], 18);
        ctx.fillText('Hidden (ReLU)', colX[1], 18);
        ctx.fillText('Output (sigmoid)', colX[2], 18);
        ctx.fillStyle = C.muted; ctx.font = '10px sans-serif';
        ctx.fillText('ring: green = active, red = inactive', colX[1], 32);
    }

    function subDigits(n) {
        var subs = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
        return String(n).split('').map(function (ch) { return subs[+ch]; }).join('');
    }

    /* ---------- forward pass steps (page notation: a = pre-act, z = act) ---------- */
    function renderSteps() {
        var f = NNCore.forward(net, [demoPoint.x1, demoPoint.x2]);
        var H = net.H, html = '';
        function esc(x) { return x.toFixed(3); }

        html += '<div class="nnv-step"><div class="t">1. Input</div>' +
            '<div class="c">x&#8321; = ' + esc(demoPoint.x1) + ', &nbsp;x&#8322; = ' + esc(demoPoint.x2) + '</div></div>';

        html += '<div class="nnv-step"><div class="t">2. Hidden pre-activations a<sub>j</sub><sup>(1)</sup> (affine map)</div>';
        for (var i = 0; i < H; i++) {
            html += '<div class="c">a' + subDigits(i + 1) + ' = b' + subDigits(i + 1) +
                ' + w&#8321;' + subDigits(i + 1) + '&middot;x&#8321; + w&#8322;' + subDigits(i + 1) + '&middot;x&#8322; = ' +
                esc(net.b1[i]) + ' + ' + esc(net.W1[0][i]) + '&middot;' + esc(demoPoint.x1) + ' + ' +
                esc(net.W1[1][i]) + '&middot;' + esc(demoPoint.x2) + '</div>' +
                '<div class="r">a' + subDigits(i + 1) + ' = ' + esc(f.a1[i]) + '</div>';
        }
        html += '</div>';

        html += '<div class="nnv-step"><div class="t">3. Hidden activations z<sub>j</sub><sup>(1)</sup> = ReLU(a<sub>j</sub><sup>(1)</sup>)</div>';
        for (var j = 0; j < H; j++) {
            html += '<div class="c">z' + subDigits(j + 1) + ' = max(0, ' + esc(f.a1[j]) + ')</div>' +
                '<div class="r">z' + subDigits(j + 1) + ' = ' + esc(f.z1[j]) + '</div>';
        }
        html += '</div>';

        html += '<div class="nnv-step"><div class="t">4. Output pre-activation a<sup>(2)</sup></div>' +
            '<div class="c">a<sup>(2)</sup> = b<sup>(2)</sup> + &Sigma;<sub>j</sub> w<sub>j</sub><sup>(2)</sup>&middot;z<sub>j</sub> = ' + esc(net.b2);
        for (var k = 0; k < H; k++) html += ' + ' + esc(net.W2[k]) + '&middot;' + esc(f.z1[k]);
        html += '</div><div class="r">a<sup>(2)</sup> = ' + esc(f.a2) + '</div></div>';

        html += '<div class="nnv-step"><div class="t">5. Output &#375; = &sigma;(a<sup>(2)</sup>)</div>' +
            '<div class="c">&#375; = 1 / (1 + e<sup>&minus;a&#8317;&#178;&#8318;</sup>) = 1 / (1 + e<sup>&minus;(' + esc(f.a2) + ')</sup>)</div>' +
            '<div class="r">&#375; = ' + esc(f.yhat) + ' &nbsp;&rArr;&nbsp; class ' + (f.yhat >= 0.5 ? 1 : 0) + '</div></div>';

        stepsEl.innerHTML = html;
        demoCoordEl.textContent = 'Demo point: (' + demoPoint.x1.toFixed(2) + ', ' + demoPoint.x2.toFixed(2) + ')';
    }

    /* ---------- training (honest: uses exactly the shown hyperparameters) ---------- */
    function nextFrame() {
        return new Promise(function (res) {
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { res(); });
            else setTimeout(res, 16);
        });
    }

    function sampleBatch() {
        var n = Math.min(params.batchSize, data.train.length);
        if (n >= data.train.length) return data.train;  /* full batch */
        var batch = [];
        for (var i = 0; i < n; i++) batch.push(data.train[Math.floor(rng() * data.train.length)]);
        return batch;
    }

    var lockedWhileTraining = ['nnv-pat-xor', 'nnv-pat-circle', 'nnv-noise', 'nnv-h', 'nnv-newdata', 'nnv-reset'];
    function setControlsLocked(locked) {
        lockedWhileTraining.forEach(function (id) {
            var el = document.getElementById(id);
            el.disabled = locked;
            el.style.opacity = locked ? '0.45' : '';
        });
    }

    async function runTraining() {
        if (isTraining) { stopRequested = true; return; }
        isTraining = true; stopRequested = false; diverged = false;
        setControlsLocked(true);
        trainBtn.textContent = 'Stop';
        trainBtn.classList.add('stop');

        var total = params.iterations;
        var chunk = Math.max(1, Math.round(total / 150));
        if (lossHistory.length === 0) {
            lossHistory.push({
                iter: 0,
                train: NNCore.loss(net, data.train, 0),
                test: NNCore.loss(net, data.test, 0)
            });
        }

        for (var it = 0; it < total && !stopRequested; it++) {
            var g = NNCore.gradients(net, sampleBatch(), params.lambda);
            NNCore.applyGradients(net, g, params.lr);
            globalIter++;
            if (it % chunk === chunk - 1 || it === total - 1) {
                var trL = NNCore.loss(net, data.train, 0);
                var teL = NNCore.loss(net, data.test, 0);
                if (!isFinite(trL) || !isFinite(teL)) { diverged = true; break; }
                lossHistory.push({ iter: globalIter, train: trL, test: teL });
                renderMetrics(); drawPlot(); drawCurve();
                await nextFrame();
            }
        }

        isTraining = false;
        setControlsLocked(false);
        trainBtn.textContent = 'Train (Continue)';
        trainBtn.classList.remove('stop');
        renderMetrics(); drawPlot(); drawCurve(); drawGraph(); renderSteps();
    }

    /* ---------- state resets ---------- */
    function resetWeights() {
        net = NNCore.initNetwork(params.hiddenUnits, rng);
        lossHistory = []; globalIter = 0; diverged = false;
        trainBtn.textContent = 'Train';
        renderAll();
    }
    function regenerateData() {
        data = NNCore.generateData(params.pattern, params.noise, 100, rng);
        resetWeights();
    }

    /* ---------- controls wiring ---------- */
    function bindRange(id, fn) {
        var el = document.getElementById(id);
        el.addEventListener('input', function () { fn(el); });
        return el;
    }
    bindRange('nnv-noise', function (el) {
        params.noise = parseFloat(el.value);
        document.getElementById('nnv-noise-val').textContent = Math.round(params.noise * 100) + '%';
        if (!isTraining) regenerateData();
    });
    bindRange('nnv-h', function (el) {
        params.hiddenUnits = parseInt(el.value, 10);
        document.getElementById('nnv-h-val').textContent = String(params.hiddenUnits);
        if (!isTraining) resetWeights();
    });
    bindRange('nnv-lam', function (el) {
        params.lambda = LAMBDA_STOPS[parseInt(el.value, 10)];
        document.getElementById('nnv-lam-val').textContent =
            params.lambda === 0 ? '0' : params.lambda.toPrecision(1);
    });
    bindRange('nnv-lr', function (el) {
        params.lr = Math.pow(10, parseFloat(el.value));
        document.getElementById('nnv-lr-val').textContent = params.lr.toFixed(params.lr < 0.1 ? 3 : 2);
    });
    bindRange('nnv-bs', function (el) {
        params.batchSize = BATCH_STOPS[parseInt(el.value, 10)];
        document.getElementById('nnv-bs-val').textContent =
            params.batchSize >= 70 ? '70 (full batch)' : String(params.batchSize);
    });
    bindRange('nnv-it', function (el) {
        params.iterations = parseInt(el.value, 10);
        document.getElementById('nnv-it-val').textContent = String(params.iterations);
    });

    function setPattern(p) {
        if (isTraining) return;
        params.pattern = p;
        document.getElementById('nnv-pat-xor').classList.toggle('on', p === 'xor');
        document.getElementById('nnv-pat-circle').classList.toggle('on', p === 'circle');
        regenerateData();
    }
    document.getElementById('nnv-pat-xor').addEventListener('click', function () { setPattern('xor'); });
    document.getElementById('nnv-pat-circle').addEventListener('click', function () { setPattern('circle'); });

    trainBtn.addEventListener('click', runTraining);
    document.getElementById('nnv-newdata').addEventListener('click', function () { if (!isTraining) regenerateData(); });
    document.getElementById('nnv-reset').addEventListener('click', function () { if (!isTraining) resetWeights(); });

    demoBtn.addEventListener('click', function () {
        isDemoMode = !isDemoMode;
        demoBtn.textContent = isDemoMode ? 'Done' : 'Select Demo Point';
        demoBtn.classList.toggle('on', isDemoMode);
        plotCanvas.style.cursor = isDemoMode ? 'crosshair' : 'default';
        drawPlot();
    });

    plotCanvas.addEventListener('click', function (ev) {
        if (!isDemoMode) return;
        var rect = plotCanvas.getBoundingClientRect();
        var g = plotGeometry(rect.width, rect.height);
        var x = g.pxToX(ev.clientX - rect.left);
        var y = g.pxToY(ev.clientY - rect.top);
        if (x < DOM_MIN || x > DOM_MAX || y < DOM_MIN || y > DOM_MAX) return;
        demoPoint = { x1: x, x2: y };
        drawPlot(); drawGraph(); renderSteps();
    });

    /* ---------- resize ---------- */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { padCache = {}; drawPlot(); drawCurve(); drawGraph(); }, 120);
    });

    /* ---------- initial render (honest initial metrics, no placeholders) ---------- */
    function renderAll() {
        renderMetrics(); drawPlot(); drawCurve(); drawGraph(); renderSteps();
    }
    renderAll();
    }

    if (typeof document === 'undefined') { return; }  /* non-DOM (test) environment */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNNDemo);
    } else {
        initNNDemo();
    }
})();