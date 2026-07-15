/* ============================================================
 * SVM Demo — math core (SvmCore)
 * Pure functions, no DOM. The demo solves the ACTUAL soft-margin
 * dual QP stated on the page:
 *   max_a  sum a_n - (1/2) sum_ij a_i a_j y_i y_j K(x_i, x_j)
 *   s.t.   0 <= a_n <= C,   sum a_n y_n = 0,
 * via SMO (Sequential Minimal Optimization). Prediction uses the
 * kernel form  f(x) = sum_{a_n>0} a_n y_n K(x_n, x) + b  exactly.
 * The bias b is recovered by averaging over FREE support vectors
 * (0 < a_n < C), where y_n f(x_n) = 1 holds; if no free SV exists,
 * the midpoint of the KKT-feasible interval for b is used.
 * No learning rate, no early stopping on accuracy, no silent
 * parameter clipping. Non-convergence is reported, never hidden.
 * ============================================================ */
var SvmCore = (function () {
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

    /* ---------- kernels ---------- */
    function kernelValue(kernel, gamma, ax1, ax2, bx1, bx2) {
        if (kernel === 'linear') {
            return ax1 * bx1 + ax2 * bx2;
        }
        /* rbf: K(a,b) = exp(-gamma * ||a-b||^2) */
        var d1 = ax1 - bx1, d2 = ax2 - bx2;
        return Math.exp(-gamma * (d1 * d1 + d2 * d2));
    }

    function gramMatrix(kernel, gamma, pts) {
        var n = pts.length, K = new Array(n);
        for (var i = 0; i < n; i++) {
            K[i] = new Float64Array(n);
            for (var j = 0; j <= i; j++) {
                var v = kernelValue(kernel, gamma, pts[i].x1, pts[i].x2, pts[j].x1, pts[j].x2);
                K[i][j] = v;
                K[j][i] = v;
            }
            K[i][i] = kernelValue(kernel, gamma, pts[i].x1, pts[i].x2, pts[i].x1, pts[i].x2);
        }
        return K;
    }

    /* ---------- model = { pts, y, alphas, b, kernel, gamma, C } ---------- */

    /* F_i = sum_j a_j y_j K_ij  (decision value WITHOUT bias) at point i */
    function decisionNoBiasAt(model, K, i) {
        var s = 0, a = model.alphas, pts = model.pts;
        for (var j = 0; j < pts.length; j++) {
            if (a[j] > 0) s += a[j] * pts[j].y * K[i][j];
        }
        return s;
    }

    /* f(x) in kernel form (page: T-svm_kernel_prediction) */
    function decisionFunction(model, x1, x2) {
        var s = model.b, a = model.alphas, pts = model.pts;
        for (var j = 0; j < pts.length; j++) {
            if (a[j] > 0) {
                s += a[j] * pts[j].y *
                    kernelValue(model.kernel, model.gamma, pts[j].x1, pts[j].x2, x1, x2);
            }
        }
        return s;
    }

    function predict(model, x1, x2) {
        return decisionFunction(model, x1, x2) >= 0 ? 1 : -1;
    }

    function accuracy(model, data) {
        if (data.length === 0) return 0;
        var c = 0;
        for (var i = 0; i < data.length; i++) {
            if (predict(model, data[i].x1, data[i].x2) === data[i].y) c++;
        }
        return c / data.length;
    }

    /* explicit w = sum a_n y_n x_n (meaningful for the linear kernel) */
    function linearWeights(model) {
        var w1 = 0, w2 = 0, a = model.alphas, pts = model.pts;
        for (var j = 0; j < pts.length; j++) {
            if (a[j] > 0) { w1 += a[j] * pts[j].y * pts[j].x1; w2 += a[j] * pts[j].y * pts[j].x2; }
        }
        return [w1, w2];
    }

    /* ||w||_H^2 = sum_ij a_i a_j y_i y_j K_ij  (RKHS norm; valid for any kernel) */
    function wNormSq(model, K) {
        var s = 0, a = model.alphas, pts = model.pts, n = pts.length;
        for (var i = 0; i < n; i++) {
            if (a[i] <= 0) continue;
            for (var j = 0; j < n; j++) {
                if (a[j] <= 0) continue;
                s += a[i] * a[j] * pts[i].y * pts[j].y * K[i][j];
            }
        }
        return s;
    }

    /* dual objective D(a) = sum a - (1/2)||w||_H^2 */
    function dualObjective(model, K) {
        var s = 0, a = model.alphas;
        for (var i = 0; i < a.length; i++) s += a[i];
        return s - 0.5 * wNormSq(model, K);
    }

    /* primal objective at (w(a), b): P = (1/2)||w||_H^2 + C sum xi_n,
     * xi_n = max(0, 1 - y_n f(x_n)). Always >= D; gap -> 0 at optimum. */
    function primalObjective(model, K) {
        var slack = 0, pts = model.pts;
        for (var i = 0; i < pts.length; i++) {
            var m = pts[i].y * (decisionNoBiasAt(model, K, i) + model.b);
            if (m < 1) slack += 1 - m;
        }
        return 0.5 * wNormSq(model, K) + model.C * slack;
    }

    /* ---------- KKT audit (the page's three-case partition) ----------
     * a_n = 0        : requires y f >= 1        viol = max(0, 1 - yf)
     * 0 < a_n < C    : requires y f  = 1        viol = |yf - 1|
     * a_n = C        : requires y f <= 1        viol = max(0, yf - 1)
     * Categories: zero / free / boundIn (xi <= 1) / boundMis (xi > 1). */
    function kktAudit(model, K) {
        var pts = model.pts, a = model.alphas, C = model.C;
        var eps = 1e-8 * Math.max(1, C);
        var maxViol = 0;
        var cat = new Array(pts.length);
        var counts = { zero: 0, free: 0, boundIn: 0, boundMis: 0 };
        for (var i = 0; i < pts.length; i++) {
            var yf = pts[i].y * (decisionNoBiasAt(model, K, i) + model.b);
            var v;
            if (a[i] <= eps) {
                v = Math.max(0, 1 - yf);
                cat[i] = 'zero'; counts.zero++;
            } else if (a[i] >= C - eps) {
                v = Math.max(0, yf - 1);
                var xi = Math.max(0, 1 - yf);
                if (xi > 1) { cat[i] = 'boundMis'; counts.boundMis++; }
                else { cat[i] = 'boundIn'; counts.boundIn++; }
            } else {
                v = Math.abs(yf - 1);
                cat[i] = 'free'; counts.free++;
            }
            if (v > maxViol) maxViol = v;
        }
        return { maxViolation: maxViol, categories: cat, counts: counts };
    }

    /* sum a_n y_n (should be 0 up to float error, by SMO construction) */
    function equalityResidual(model) {
        var s = 0, a = model.alphas, pts = model.pts;
        for (var i = 0; i < pts.length; i++) s += a[i] * pts[i].y;
        return s;
    }

    /* ---------- bias recovery ----------
     * Free SVs satisfy y_n f(x_n) = 1  =>  b = y_n - F_n; average them.
     * If none exist, every KKT condition constrains b to an interval
     * [bLo, bHi]; return its midpoint (bLo <= bHi at the optimum). */
    function recoverBias(model, K) {
        var pts = model.pts, a = model.alphas, C = model.C;
        var eps = 1e-8 * Math.max(1, C);
        var sum = 0, nf = 0, i, F;
        for (i = 0; i < pts.length; i++) {
            if (a[i] > eps && a[i] < C - eps) {
                F = decisionNoBiasAt(model, K, i);
                sum += pts[i].y - F;
                nf++;
            }
        }
        if (nf > 0) return { b: sum / nf, freeCount: nf };
        var bLo = -Infinity, bHi = Infinity;
        for (i = 0; i < pts.length; i++) {
            F = decisionNoBiasAt(model, K, i);
            var y = pts[i].y, atZero = a[i] <= eps;
            /* a=0: y(F+b) >= 1 ; a=C: y(F+b) <= 1 */
            if (atZero) {
                if (y === 1) bLo = Math.max(bLo, 1 - F);
                else bHi = Math.min(bHi, -1 - F);
            } else {
                if (y === 1) bHi = Math.min(bHi, 1 - F);
                else bLo = Math.max(bLo, -1 - F);
            }
        }
        if (bLo <= bHi && isFinite(bLo) && isFinite(bHi)) {
            return { b: (bLo + bHi) / 2, freeCount: 0 };
        }
        return { b: model.b, freeCount: 0 };  /* keep SMO's running b */
    }

    /* ---------- SMO solver ----------
     * Maximal-violating-pair SMO (Keerthi / LIBSVM first-order working
     * set selection). Let Ft_i = sum_j a_j y_j K_ij (decision without
     * bias) and G_i = y_i - Ft_i. KKT holds within eps iff
     *   m := max_{i in I_up} G_i  <=  M := min_{i in I_low} G_i  + eps,
     * where I_up = { a_i < C, y_i = +1 } u { a_i > 0, y_i = -1 } and
     * I_low = { a_i < C, y_i = -1 } u { a_i > 0, y_i = +1 }.
     * Each step optimizes the worst pair EXACTLY (2-variable QP), so
     * the dual objective is non-decreasing. At optimality the bias must
     * lie in [M, m]-collapsed interval; we take the free-SV average
     * (the page's rule) with the interval midpoint as fallback. */
    function createSolver(train, kernel, gamma, C) {
        var n = train.length;
        var K = gramMatrix(kernel, gamma, train);
        var model = {
            pts: train, alphas: new Float64Array(n), b: 0,
            kernel: kernel, gamma: gamma, C: C
        };
        var Ft = new Float64Array(n);     /* Ft_i = sum_j a_j y_j K_ij */
        var epsA = 1e-8 * Math.max(1, C);
        var tol = 1e-3;

        /* returns { gap, i, j } for the maximal violating pair */
        function selectPair() {
            var a = model.alphas;
            var m = -Infinity, iUp = -1, M = Infinity, iLow = -1;
            for (var t = 0; t < n; t++) {
                var y = train[t].y, G = y - Ft[t];
                var inUp = (y === 1 && a[t] < C - epsA) || (y === -1 && a[t] > epsA);
                var inLow = (y === -1 && a[t] < C - epsA) || (y === 1 && a[t] > epsA);
                if (inUp && G > m) { m = G; iUp = t; }
                if (inLow && G < M) { M = G; iLow = t; }
            }
            if (iUp < 0 || iLow < 0) return { gap: 0, i: -1, j: -1, m: m, M: M };
            return { gap: m - M, i: iUp, j: iLow, m: m, M: M };
        }

        /* one exact 2-variable step on the worst pair;
         * returns true if alphas changed, false if converged/stuck */
        function step() {
            var sel = selectPair();
            if (sel.i < 0 || sel.gap <= tol) return false;
            var i = sel.i, j = sel.j;
            var a = model.alphas, yi = train[i].y, yj = train[j].y;
            var ai = a[i], aj = a[j];
            var L, H;
            if (yi !== yj) { L = Math.max(0, aj - ai); H = Math.min(C, C + aj - ai); }
            else { L = Math.max(0, ai + aj - C); H = Math.min(C, ai + aj); }
            if (H - L < 1e-14) return false;
            var eta = K[i][i] + K[j][j] - 2 * K[i][j];   /* >= 0 (PSD) */
            var EiMinusEj = (Ft[i] - yi) - (Ft[j] - yj);
            var ajNew;
            if (eta > 1e-14) {
                ajNew = aj + yj * EiMinusEj / eta;
                if (ajNew > H) ajNew = H; else if (ajNew < L) ajNew = L;
            } else {
                /* flat direction: objective is linear in the pair; move
                 * to whichever end of [L, H] increases the dual */
                ajNew = yj * EiMinusEj > 0 ? H : L;
            }
            if (ajNew < epsA) ajNew = 0;
            else if (ajNew > C - epsA) ajNew = C;
            if (Math.abs(ajNew - aj) < 1e-12 * Math.max(1, C)) return false;
            var aiNew = ai + yi * yj * (aj - ajNew);
            if (aiNew < epsA) aiNew = 0;
            else if (aiNew > C - epsA) aiNew = C;

            /* incremental gradient update: O(n) */
            var dI = (aiNew - ai) * yi, dJ = (ajNew - aj) * yj;
            for (var t = 0; t < n; t++) Ft[t] += dI * K[i][t] + dJ * K[j][t];
            a[i] = aiNew; a[j] = ajNew;
            return true;
        }

        /* one "sweep" = up to n pair steps (animation granularity);
         * returns the number of steps actually taken */
        function sweep() {
            var changed = 0;
            for (var s = 0; s < n; s++) {
                if (!step()) break;
                changed++;
            }
            return changed;
        }

        /* current KKT gap m - M (0 when a set is empty) */
        function gap() {
            var sel = selectPair();
            return sel.i < 0 ? 0 : Math.max(0, sel.gap);
        }

        /* running bias estimate: midpoint of the current KKT interval
         * [M, m]; meaningful mid-solve (the Ft-based updates never touch
         * model.b), and within tol of the free-SV average at the end */
        function biasEstimate() {
            var sel = selectPair();
            if (sel.i >= 0 && isFinite(sel.m) && isFinite(sel.M)) {
                return (sel.m + sel.M) / 2;
            }
            return model.b;
        }

        function finalize() {
            model.b = biasEstimate();        /* midpoint fallback */
            var rb = recoverBias(model, K);
            model.b = rb.b;
            return rb.freeCount;
        }

        return { model: model, K: K, step: step, sweep: sweep, gap: gap,
                 biasEstimate: biasEstimate, finalize: finalize, tol: tol };
    }

    /* Solve to convergence. Convergence = KKT gap <= tol (the honest
     * certificate); if the step cap is hit first, converged = false and
     * the caller must report it. */
    function solve(train, kernel, gamma, C, maxSteps) {
        var solver = createSolver(train, kernel, gamma, C);
        var cap = maxSteps || 1000 * train.length;
        var steps = 0;
        while (steps < cap) {
            if (!solver.step()) break;
            steps++;
        }
        /* single source of truth: the KKT gap at exit, nothing else */
        var converged = solver.gap() <= solver.tol;
        var freeCount = solver.finalize();
        var audit = kktAudit(solver.model, solver.K);
        return {
            ok: true,
            model: solver.model,
            K: solver.K,
            steps: steps,
            converged: converged,
            freeCount: freeCount,
            audit: audit
        };
    }

    /* ---------- marching squares ----------
     * Contour of a scalar field at a given level over a regular grid.
     * field: (x, y) -> value; returns an array of segments
     * [{x1,y1,x2,y2}, ...] in data coordinates. Linear interpolation
     * along cell edges (crossing parameter t is NOT forced to 0.5). */
    function marchingSquares(field, level, xMin, xMax, yMin, yMax, res) {
        var segs = [];
        var nx = res, ny = res;
        var vals = new Array((nx + 1) * (ny + 1));
        var xs = new Array(nx + 1), ys = new Array(ny + 1);
        var i, j;
        for (i = 0; i <= nx; i++) xs[i] = xMin + (i / nx) * (xMax - xMin);
        for (j = 0; j <= ny; j++) ys[j] = yMin + (j / ny) * (yMax - yMin);
        for (i = 0; i <= nx; i++) {
            for (j = 0; j <= ny; j++) {
                vals[i * (ny + 1) + j] = field(xs[i], ys[j]) - level;
            }
        }
        function interp(x0, y0, v0, x1, y1, v1) {
            var t = v0 / (v0 - v1);   /* v0, v1 have opposite signs */
            return { x: x0 + t * (x1 - x0), y: y0 + t * (y1 - y0) };
        }
        for (i = 0; i < nx; i++) {
            for (j = 0; j < ny; j++) {
                var v00 = vals[i * (ny + 1) + j];         /* (xs[i],   ys[j])   */
                var v10 = vals[(i + 1) * (ny + 1) + j];   /* (xs[i+1], ys[j])   */
                var v11 = vals[(i + 1) * (ny + 1) + j + 1];
                var v01 = vals[i * (ny + 1) + j + 1];
                var idx = (v00 > 0 ? 8 : 0) | (v10 > 0 ? 4 : 0) | (v11 > 0 ? 2 : 0) | (v01 > 0 ? 1 : 0);
                if (idx === 0 || idx === 15) continue;
                var pB = null, pR = null, pT = null, pL = null;
                if ((v00 > 0) !== (v10 > 0)) pB = interp(xs[i], ys[j], v00, xs[i + 1], ys[j], v10);
                if ((v10 > 0) !== (v11 > 0)) pR = interp(xs[i + 1], ys[j], v10, xs[i + 1], ys[j + 1], v11);
                if ((v01 > 0) !== (v11 > 0)) pT = interp(xs[i], ys[j + 1], v01, xs[i + 1], ys[j + 1], v11);
                if ((v00 > 0) !== (v01 > 0)) pL = interp(xs[i], ys[j], v00, xs[i], ys[j + 1], v01);
                var pool = [];
                if (pB) pool.push(pB);
                if (pR) pool.push(pR);
                if (pT) pool.push(pT);
                if (pL) pool.push(pL);
                if (pool.length === 2) {
                    segs.push({ x1: pool[0].x, y1: pool[0].y, x2: pool[1].x, y2: pool[1].y });
                } else if (pool.length === 4) {
                    /* ambiguous saddle: resolve by center value */
                    var c = field((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2) - level;
                    if ((c > 0) === (v00 > 0)) {
                        segs.push({ x1: pB.x, y1: pB.y, x2: pR.x, y2: pR.y });
                        segs.push({ x1: pL.x, y1: pL.y, x2: pT.x, y2: pT.y });
                    } else {
                        segs.push({ x1: pL.x, y1: pL.y, x2: pB.x, y2: pB.y });
                        segs.push({ x1: pT.x, y1: pT.y, x2: pR.x, y2: pR.y });
                    }
                }
            }
        }
        return segs;
    }

    /* ---------- data generation ----------
     * TARGETS is the single source of truth for both generators and any
     * rendering of the true boundary. Pinned by test T8. */
    var TARGETS = {
        linear: { w: [0.8, 0.5], b: 0, gap: 0.15, range: 2 },
        circular: { boundary: 1.0, rInnerMax: 0.75, rOuterMin: 1.25, rOuterMax: 2.0 }
    };

    /* pattern: 'linear' | 'circular'; labels y in {-1, +1};
     * noise flips labels with the given probability; positions keep a
     * margin band (linear: |signed dist| >= gap via resampling, so the
     * dataset size is exact; circular: an annulus gap) so that the
     * noiseless problem has a visible geometric margin. 70/30 split. */
    function generateData(pattern, noise, n, rng) {
        var pts = [], i;
        if (pattern === 'linear') {
            var w = TARGETS.linear.w, b0 = TARGETS.linear.b;
            var norm = Math.sqrt(w[0] * w[0] + w[1] * w[1]);
            var R = TARGETS.linear.range, gap = TARGETS.linear.gap;
            for (i = 0; i < n; i++) {
                var x1, x2, d;
                do {
                    x1 = (rng() * 2 - 1) * R;
                    x2 = (rng() * 2 - 1) * R;
                    d = (w[0] * x1 + w[1] * x2 + b0) / norm;
                } while (Math.abs(d) < gap);
                var y = d > 0 ? 1 : -1;
                if (rng() < noise) y = -y;
                pts.push({ x1: x1, x2: x2, y: y });
            }
        } else {
            var T = TARGETS.circular;
            for (i = 0; i < n; i++) {
                var inner = rng() < 0.5;
                var r = inner
                    ? T.rInnerMax * Math.sqrt(rng())                     /* uniform on disk */
                    : Math.sqrt(T.rOuterMin * T.rOuterMin +
                        rng() * (T.rOuterMax * T.rOuterMax - T.rOuterMin * T.rOuterMin));
                var th = rng() * 2 * Math.PI;
                var yy = inner ? 1 : -1;
                if (rng() < noise) yy = -yy;
                pts.push({ x1: r * Math.cos(th), x2: r * Math.sin(th), y: yy });
            }
        }
        for (var k = pts.length - 1; k > 0; k--) {
            var j = Math.floor(rng() * (k + 1));
            var t = pts[k]; pts[k] = pts[j]; pts[j] = t;
        }
        var nTrain = Math.round(n * 0.7);
        return { train: pts.slice(0, nTrain), test: pts.slice(nTrain) };
    }

    /* ---------- self-tests ---------- */
    function runSelfTests() {
        var failures = [];

        /* T1: RNG determinism and algorithm pin */
        (function () {
            var r1 = createRng(42), r2 = createRng(42);
            for (var i = 0; i < 5; i++) {
                if (r1() !== r2()) { failures.push('T1 rng not deterministic'); return; }
            }
            var r3 = createRng(1);
            var v = r3();
            if (Math.abs(v - 0.6270739405881613) > 1e-15) {
                failures.push('T1 mulberry32 drift: first value(seed 1) = ' + v);
            }
        })();

        /* T2: kernel properties: symmetry, RBF K(x,x)=1 and 0<K<=1,
         * linear = dot product, and v'Kv >= 0 on a random Gram (PSD) */
        (function () {
            var rng = createRng(7);
            var pts = [];
            for (var i = 0; i < 8; i++) pts.push({ x1: rng() * 4 - 2, x2: rng() * 4 - 2, y: 1 });
            var K = gramMatrix('rbf', 0.7, pts);
            for (var a = 0; a < 8; a++) {
                if (Math.abs(K[a][a] - 1) > 1e-14) failures.push('T2 rbf K(x,x) != 1');
                for (var b = 0; b < 8; b++) {
                    if (Math.abs(K[a][b] - K[b][a]) > 1e-15) failures.push('T2 gram not symmetric');
                    if (K[a][b] <= 0 || K[a][b] > 1 + 1e-15) failures.push('T2 rbf out of (0,1]');
                }
            }
            for (var trial = 0; trial < 5; trial++) {
                var v = [], q = 0, s;
                for (var t = 0; t < 8; t++) v.push(rng() * 2 - 1);
                for (var p = 0; p < 8; p++) {
                    s = 0;
                    for (var r = 0; r < 8; r++) s += K[p][r] * v[r];
                    q += v[p] * s;
                }
                if (q < -1e-10) failures.push('T2 rbf gram not PSD: v\'Kv = ' + q);
            }
            var lv = kernelValue('linear', 0, 1.5, -2, 0.5, 3);
            if (Math.abs(lv - (1.5 * 0.5 + (-2) * 3)) > 1e-15) failures.push('T2 linear kernel != dot');
        })();

        /* T3: analytic two-point problem. x=(±1,0), y=±1, linear, C=10:
         * exact dual optimum a=(1/2,1/2), w=(1,0), b=0, margin 2/||w||=2 */
        (function () {
            var train = [{ x1: 1, x2: 0, y: 1 }, { x1: -1, x2: 0, y: -1 }];
            var r = solve(train, 'linear', 0, 10);
            if (!r.converged) failures.push('T3 did not converge');
            if (Math.abs(r.model.alphas[0] - 0.5) > 1e-6 || Math.abs(r.model.alphas[1] - 0.5) > 1e-6) {
                failures.push('T3 alphas != (0.5, 0.5): ' + r.model.alphas[0] + ', ' + r.model.alphas[1]);
            }
            var w = linearWeights(r.model);
            if (Math.abs(w[0] - 1) > 1e-6 || Math.abs(w[1]) > 1e-6) failures.push('T3 w != (1,0)');
            if (Math.abs(r.model.b) > 1e-6) failures.push('T3 b != 0: ' + r.model.b);
            var margin = 2 / Math.sqrt(wNormSq(r.model, r.K));
            if (Math.abs(margin - 2) > 1e-6) failures.push('T3 margin != 2: ' + margin);
        })();

        /* T4: constraints and KKT certificate on seeded data,
         * all four (kernel x pattern) combinations */
        (function () {
            [['linear', 'linear'], ['linear', 'circular'],
             ['rbf', 'linear'], ['rbf', 'circular']].forEach(function (cfg) {
                var rng = createRng(2026);
                var d = generateData(cfg[1], 0.1, 100, rng);
                var r = solve(d.train, cfg[0], 1.0, 1.0);
                var tag = 'T4[' + cfg.join(',') + '] ';
                if (!r.converged) failures.push(tag + 'no convergence');
                var res = Math.abs(equalityResidual(r.model));
                if (res > 1e-9) failures.push(tag + 'sum a y != 0: ' + res);
                for (var i = 0; i < r.model.alphas.length; i++) {
                    var a = r.model.alphas[i];
                    if (a < 0 || a > 1.0 + 1e-12) { failures.push(tag + 'box violated: ' + a); break; }
                }
                if (r.audit.maxViolation > 5e-3) {
                    failures.push(tag + 'KKT violation ' + r.audit.maxViolation);
                }
            });
        })();

        /* T5: duality gap small at the solution (relative to |D|) */
        (function () {
            var rng = createRng(99);
            var d = generateData('circular', 0.05, 100, rng);
            var r = solve(d.train, 'rbf', 1.0, 3.0);
            var D = dualObjective(r.model, r.K);
            var P = primalObjective(r.model, r.K);
            if (P < D - 1e-9) failures.push('T5 primal below dual: P=' + P + ' D=' + D);
            var gap = (P - D) / Math.max(1, Math.abs(D));
            if (gap > 2e-2) failures.push('T5 duality gap too large: ' + gap);
        })();

        /* T6: page's bias rule — every FREE SV has y f(x) = 1 (within tol).
         * This is the fact that justifies averaging b over free SVs. */
        (function () {
            var rng = createRng(11);
            var d = generateData('linear', 0.15, 100, rng);
            var r = solve(d.train, 'linear', 0, 1.0);
            var eps = 1e-8;
            var seen = 0;
            for (var i = 0; i < d.train.length; i++) {
                var a = r.model.alphas[i];
                if (a > eps && a < 1.0 - eps) {
                    seen++;
                    var yf = d.train[i].y * decisionFunction(r.model, d.train[i].x1, d.train[i].x2);
                    if (Math.abs(yf - 1) > 5e-3) {
                        failures.push('T6 free SV with y f = ' + yf); break;
                    }
                }
            }
            if (seen === 0) failures.push('T6 vacuous: no free SVs in test setup');
            /* the two notions of 'free' must agree: recoverBias's
             * averaging set == the audit's free category */
            var rb = recoverBias(r.model, r.K);
            var audit = kktAudit(r.model, r.K);
            if (rb.freeCount !== audit.counts.free) {
                failures.push('T6 free-set mismatch: recoverBias ' + rb.freeCount +
                    ' vs audit ' + audit.counts.free);
            }
            /* the running midpoint estimate must agree with the recovered
             * free-SV average at convergence (within the KKT tolerance) */
            var sv2 = createSolver(d.train, 'linear', 0, 1.0);
            var guard = 0;
            while (sv2.step() && ++guard < 100000) { /* run to convergence */ }
            if (guard >= 100000) failures.push('T6 bias-check solver did not converge');
            var bMid = sv2.biasEstimate();
            sv2.finalize();
            if (Math.abs(bMid - sv2.model.b) > 5e-3) {
                failures.push('T6 bias midpoint vs free-SV average: ' +
                    bMid + ' vs ' + sv2.model.b);
            }
        })();

        /* T7: SMO monotonicity — the dual objective never decreases
         * across sweeps (each pair step solves its subproblem exactly) */
        (function () {
            var rng = createRng(5);
            var d = generateData('circular', 0.1, 100, rng);
            var solver = createSolver(d.train, 'rbf', 0.7, 1.0);
            var prev = dualObjective(solver.model, solver.K);
            for (var s = 0; s < 30; s++) {
                var ch = solver.sweep();
                var cur = dualObjective(solver.model, solver.K);
                if (cur < prev - 1e-9) {
                    failures.push('T7 dual decreased: ' + prev + ' -> ' + cur + ' at sweep ' + s);
                    break;
                }
                prev = cur;
                if (ch === 0) break;
            }
        })();

        /* T8: generators — TARGETS pinned; label rule at noise 0;
         * exact 70/30 split; circular annulus gap respected */
        (function () {
            if (TARGETS.linear.w[0] !== 0.8 || TARGETS.linear.w[1] !== 0.5 ||
                TARGETS.linear.b !== 0 || TARGETS.circular.boundary !== 1.0 ||
                TARGETS.circular.rInnerMax !== 0.75 || TARGETS.circular.rOuterMin !== 1.25) {
                failures.push('T8 TARGETS drifted');
            }
            var rng = createRng(3);
            var d = generateData('linear', 0, 100, rng);
            if (d.train.length !== 70 || d.test.length !== 30) failures.push('T8 split wrong');
            var all = d.train.concat(d.test);
            for (var i = 0; i < all.length; i++) {
                var p = all[i];
                var s = TARGETS.linear.w[0] * p.x1 + TARGETS.linear.w[1] * p.x2 + TARGETS.linear.b;
                if (p.y !== (s > 0 ? 1 : -1)) { failures.push('T8 linear label rule violated'); break; }
                var norm = Math.sqrt(0.8 * 0.8 + 0.5 * 0.5);
                if (Math.abs(s) / norm < TARGETS.linear.gap - 1e-12) {
                    failures.push('T8 margin band violated'); break;
                }
            }
            var dc = generateData('circular', 0, 100, rng);
            var allc = dc.train.concat(dc.test);
            for (var k = 0; k < allc.length; k++) {
                var q = allc[k];
                var r = Math.sqrt(q.x1 * q.x1 + q.x2 * q.x2);
                if (r > TARGETS.circular.rInnerMax + 1e-12 && r < TARGETS.circular.rOuterMin - 1e-12) {
                    failures.push('T8 point inside annulus gap'); break;
                }
                var expect = r <= TARGETS.circular.rInnerMax + 1e-12 ? 1 : -1;
                if (q.y !== expect) { failures.push('T8 circular label rule violated'); break; }
            }
        })();

        /* T9: the page's experiment claims, as tested facts.
         * (a) circular data: the linear kernel fails (~chance), RBF succeeds.
         * (b) linear noisy data: smaller C gives a wider margin 2/||w||
         *     and at least as many bound SVs as larger C. */
        (function () {
            var rng = createRng(314);
            var d = generateData('circular', 0, 100, rng);
            var rl = solve(d.train, 'linear', 0, 1.0);
            var rr = solve(d.train, 'rbf', 1.0, 1.0);
            var accL = accuracy(rl.model, d.test);
            var accR = accuracy(rr.model, d.test);
            if (accL > 0.72) failures.push('T9a linear kernel unexpectedly good on circular: ' + accL);
            if (accR < 0.9) failures.push('T9a rbf kernel failed on circular: ' + accR);

            var rng2 = createRng(1618);
            var d2 = generateData('linear', 0.15, 100, rng2);
            var lo = solve(d2.train, 'linear', 0, 0.1);
            var hi = solve(d2.train, 'linear', 0, 10);
            var mLo = 2 / Math.sqrt(wNormSq(lo.model, lo.K));
            var mHi = 2 / Math.sqrt(wNormSq(hi.model, hi.K));
            if (!(mLo > mHi)) failures.push('T9b margin not wider at small C: ' + mLo + ' vs ' + mHi);
            var aLo = kktAudit(lo.model, lo.K).counts;
            var aHi = kktAudit(hi.model, hi.K).counts;
            if (!(aLo.boundIn + aLo.boundMis >= aHi.boundIn + aHi.boundMis)) {
                failures.push('T9b bound-SV count not larger at small C');
            }
        })();

        /* T11: negative controls — the KKT audit must DETECT violations.
         * (a) all-zero alphas on real data: every point has y f = 0, so
         *     every category-zero violation is exactly 1.
         * (b) a bound SV planted far outside the margin (y f > 1) must
         *     report violation y f - 1, not zero. */
        (function () {
            var rng = createRng(21);
            var d = generateData('linear', 0, 40, rng);
            var K = gramMatrix('linear', 0, d.train);
            var m0 = { pts: d.train, alphas: new Float64Array(d.train.length), b: 0,
                       kernel: 'linear', gamma: 0, C: 1 };
            var a0 = kktAudit(m0, K);
            if (Math.abs(a0.maxViolation - 1) > 1e-12) {
                failures.push('T11a zero-model violation != 1: ' + a0.maxViolation);
            }
            if (a0.counts.zero !== d.train.length) failures.push('T11a categories wrong');

            var two = [{ x1: 3, x2: 0, y: 1 }, { x1: -3, x2: 0, y: -1 }];
            var K2 = gramMatrix('linear', 0, two);
            var al = new Float64Array(2); al[0] = 1; al[1] = 1;   /* = C: bound */
            var m1 = { pts: two, alphas: al, b: 0, kernel: 'linear', gamma: 0, C: 1 };
            /* f(x1) = 1*1*9 + 1*(-1)*(-9) = 18; y f = 18 => bound viol 17 */
            var a1 = kktAudit(m1, K2);
            if (Math.abs(a1.maxViolation - 17) > 1e-9) {
                failures.push('T11b bound violation not detected: ' + a1.maxViolation);
            }
            if (a1.counts.boundIn !== 2) failures.push('T11b bound category wrong');

            /* (c) a FREE SV with y f > 1 violates on the upper side too:
             * alphas = 0.5 (0 < a < C=1) at (+-3, 0): f(x1) = 9, viol = 8 */
            var af = new Float64Array(2); af[0] = 0.5; af[1] = 0.5;
            var m2 = { pts: two, alphas: af, b: 0, kernel: 'linear', gamma: 0, C: 1 };
            var a2 = kktAudit(m2, K2);
            if (Math.abs(a2.maxViolation - 8) > 1e-9) {
                failures.push('T11c free upper-side violation not detected: ' + a2.maxViolation);
            }
            if (a2.counts.free !== 2) failures.push('T11c free category wrong');
        })();

        /* T12: honest non-convergence — a starved step cap must yield
         * converged = false, never a silent success */
        (function () {
            var rng = createRng(1618);
            var d = generateData('linear', 0.15, 100, rng);
            var r = solve(d.train, 'linear', 0, 100, 50);
            if (r.converged) failures.push('T12 starved solve claimed convergence');
            if (r.steps !== 50) failures.push('T12 step cap not respected: ' + r.steps);
        })();

        /* T10: marching squares — asymmetric crossing. Field x - 0.3 on
         * [0,1]^2 with res 2: every segment lies on x = 0.3 exactly
         * (crossing parameter t = 0.6 on [0, 0.5], NOT forced to 0.5) */
        (function () {
            var segs = marchingSquares(function (x) { return x - 0.3; }, 0, 0, 1, 0, 1, 2);
            if (segs.length === 0) { failures.push('T10 no contour found'); return; }
            for (var i = 0; i < segs.length; i++) {
                if (Math.abs(segs[i].x1 - 0.3) > 1e-12 || Math.abs(segs[i].x2 - 0.3) > 1e-12) {
                    failures.push('T10 crossing not interpolated: x = ' + segs[i].x1 + ', ' + segs[i].x2);
                    break;
                }
            }
            /* circle field: contour of x^2+y^2 at 1 has segments near r=1 */
            var cs = marchingSquares(function (x, y) { return x * x + y * y; }, 1, -2, 2, -2, 2, 40);
            if (cs.length < 20) failures.push('T10 circle contour too sparse');
            for (var k = 0; k < cs.length; k++) {
                var r1 = Math.sqrt(cs[k].x1 * cs[k].x1 + cs[k].y1 * cs[k].y1);
                if (Math.abs(r1 - 1) > 0.05) { failures.push('T10 circle contour off radius: ' + r1); break; }
            }
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        createRng: createRng,
        kernelValue: kernelValue,
        gramMatrix: gramMatrix,
        decisionFunction: decisionFunction,
        predict: predict,
        accuracy: accuracy,
        linearWeights: linearWeights,
        wNormSq: wNormSq,
        dualObjective: dualObjective,
        primalObjective: primalObjective,
        kktAudit: kktAudit,
        equalityResidual: equalityResidual,
        recoverBias: recoverBias,
        createSolver: createSolver,
        solve: solve,
        marchingSquares: marchingSquares,
        TARGETS: TARGETS,
        generateData: generateData,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = SvmCore; }
/* ============================================================
 * SVM Demo — UI layer (v2)
 * Self-contained dark island. Depends only on SvmCore above.
 * Refuses to render if SvmCore.runSelfTests() fails.
 * The demo solves the page's soft-margin dual QP exactly (SMO with
 * maximal-violating-pair selection); the KKT panel and duality gap
 * are computed from the actual solution — nothing is fabricated.
 * "Solve" always starts from alpha = 0 (a QP solve, not incremental
 * training); Stop discards the partial solution entirely.
 * ============================================================ */
(function () {
    'use strict';

    function initSvmDemo() {
        var container = document.getElementById('svm_visualizer');
        if (!container) return;
        if (container.dataset.svmInit) return;   /* idempotency guard */
        container.dataset.svmInit = '1';

        var testResult = SvmCore.runSelfTests();
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
            classNeg: '#4da3ff',
            classPos: '#ff6b5e',
            classNegTest: 'rgba(77,163,255,0.45)',
            classPosTest: 'rgba(255,107,94,0.45)',
            boundary: '#2ecc71',
            marginLine: 'rgba(46,204,113,0.55)',
            truth: '#c084fc',
            svFree: '#ffd166',
            svBound: '#ff8c42',
            dual: '#2ecc71',
            gapCurve: '#f5a623',
            warn: '#ffb3ab'
        };

        var C_STOPS = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100];
        var G_STOPS = [0.03, 0.1, 0.3, 1, 3, 10];
        var Y_HALF = 2.2;   /* vertical data half-range; x adapts isotropically */
        var GRID_N = 80, MS_RES = 90;

        var rng = SvmCore.createRng((Date.now() ^ 0x51A3B7C9) >>> 0);
        var params = { pattern: 'linear', kernel: 'linear', C: 1, gamma: 1, noise: 0.1 };
        var data = SvmCore.generateData(params.pattern, params.noise, 100, rng);
        var solver = null;                 /* active SMO solver during a run */
        var solution = null;               /* { model, K, steps, converged, audit } or null */
        var history = [];                  /* { step, dual, gap } */
        var isSolving = false, stopRequested = false;

        /* ---------- DOM ---------- */
        var style = document.createElement('style');
        style.textContent = [
            '#svm_visualizer .svm-root{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:10px;padding:18px;color:' + C.text + ';font-family:"Segoe UI",system-ui,sans-serif;}',
            '#svm_visualizer .svm-grid{display:flex;flex-direction:column;gap:16px;}',
            '@media (min-width:992px){#svm_visualizer .svm-grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;align-items:start;}}',
            '#svm_visualizer .svm-card{background:' + C.panel + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:14px;}',
            '#svm_visualizer .svm-card h3{margin:0 0 10px 0;font-size:1.02rem;color:' + C.text + ';font-weight:600;}',
            '#svm_visualizer .svm-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
            '#svm_visualizer canvas{display:block;width:100%;height:auto;border-radius:6px;}',
            '#svm_visualizer .svm-legend{display:flex;flex-wrap:wrap;gap:10px 14px;justify-content:center;margin-top:10px;font-size:0.82rem;color:' + C.muted + ';}',
            '#svm_visualizer .svm-legend span.sw{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:3px;}',
            '#svm_visualizer .svm-legend span.pt{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;}',
            '#svm_visualizer .svm-legend span.ring{display:inline-block;width:10px;height:10px;border-radius:50%;background:transparent;margin-right:5px;vertical-align:-1px;}',
            '#svm_visualizer .svm-curves{display:flex;flex-direction:column;gap:14px;}',
            '@media (min-width:768px){#svm_visualizer .svm-curves{display:grid;grid-template-columns:1fr 1fr;}}',
            '#svm_visualizer .svm-curves h4{margin:0 0 6px 0;font-size:0.88rem;color:' + C.muted + ';font-weight:600;}',
            '#svm_visualizer .svm-ctl{margin-bottom:14px;}',
            '#svm_visualizer .svm-ctl label{display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:6px;color:' + C.text + ';}',
            '#svm_visualizer .svm-ctl label .val{font-family:monospace;color:' + C.muted + ';}',
            '#svm_visualizer input[type=range]{width:100%;accent-color:#4da3ff;}',
            '#svm_visualizer select{width:100%;background:#1a2534;color:' + C.text + ';border:1px solid ' + C.panelBorder + ';border-radius:5px;padding:6px 8px;font-size:0.88rem;}',
            '#svm_visualizer .svm-btn{width:100%;padding:10px 0;border:none;border-radius:6px;font-size:0.95rem;cursor:pointer;margin-bottom:8px;color:#fff;}',
            '#svm_visualizer .svm-btn.solve{background:#2f7fd6;}',
            '#svm_visualizer .svm-btn.solve:hover{background:#3b8de4;}',
            '#svm_visualizer .svm-btn.solve.stop{background:#c0564a;}',
            '#svm_visualizer .svm-btn.sec{background:rgba(255,255,255,0.10);color:' + C.text + ';}',
            '#svm_visualizer .svm-btn.sec:hover{background:rgba(255,255,255,0.16);}',
            '#svm_visualizer .svm-metrics{font-family:monospace;font-size:0.85rem;line-height:1.9;}',
            '#svm_visualizer .svm-metrics .row{display:flex;justify-content:space-between;}',
            '#svm_visualizer .svm-metrics .hd{color:' + C.muted + ';margin-top:6px;font-family:"Segoe UI",system-ui,sans-serif;font-size:0.8rem;}',
            '#svm_visualizer .svm-status{color:' + C.muted + ';font-size:0.84rem;margin-top:10px;line-height:1.5;}',
            '#svm_visualizer .svm-status.warn{color:' + C.warn + ';}'
        ].join('\n');
        container.appendChild(style);

        var root = document.createElement('div');
        root.className = 'svm-root';
        root.innerHTML =
            '<div class="svm-grid">' +
            '  <div class="svm-main">' +
            '    <div class="svm-card">' +
            '      <h3>Data, Margin &amp; Support Vectors</h3>' +
            '      <canvas id="svm-plot"></canvas>' +
            '      <div class="svm-legend">' +
            '        <span><span class="pt" style="background:' + C.classNeg + '"></span>Train y = &minus;1</span>' +
            '        <span><span class="pt" style="background:' + C.classPos + '"></span>Train y = +1</span>' +
            '        <span><span class="pt" style="background:' + C.classNegTest + ';border-radius:2px;"></span>Test y = &minus;1</span>' +
            '        <span><span class="pt" style="background:' + C.classPosTest + ';border-radius:2px;"></span>Test y = +1</span>' +
            '        <span><span class="sw" style="background:' + C.boundary + '"></span>Boundary f = 0</span>' +
            '        <span><span class="sw" style="background:' + C.marginLine + '"></span>Margin f = &plusmn;1 (dashed)</span>' +
            '        <span><span class="sw" style="background:' + C.truth + '"></span>True boundary (dashed)</span>' +
            '        <span><span class="ring" style="border:2px solid ' + C.svFree + '"></span>Free SV (0 &lt; &alpha; &lt; C)</span>' +
            '        <span><span class="ring" style="border:2px solid ' + C.svBound + '"></span>Bound SV (&alpha; = C)</span>' +
            '        <span><span class="sw" style="background:linear-gradient(90deg,' + C.classNeg + ',' + C.classPos + ')"></span>Sign shading |f|</span>' +
            '      </div>' +
            '    </div>' +
            '    <div class="svm-card">' +
            '      <div class="svm-curves">' +
            '        <div><h4>Dual objective D(&alpha;)</h4><canvas id="svm-dual"></canvas></div>' +
            '        <div><h4>Duality gap P &minus; D (log)</h4><canvas id="svm-gap"></canvas></div>' +
            '      </div>' +
            '      <div class="svm-legend">' +
            '        <span><span class="sw" style="background:' + C.dual + '"></span>Dual objective (never decreases)</span>' +
            '        <span><span class="sw" style="background:' + C.gapCurve + '"></span>Duality gap</span>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="svm-side">' +
            '    <div class="svm-card">' +
            '      <div class="svm-ctl"><label for="svm-pattern">Data pattern</label>' +
            '        <select id="svm-pattern"><option value="linear">Linear (margin band)</option><option value="circular">Circular (annulus)</option></select></div>' +
            '      <div class="svm-ctl"><label for="svm-kernel">Kernel</label>' +
            '        <select id="svm-kernel"><option value="linear">Linear</option><option value="rbf">RBF (Gaussian)</option></select></div>' +
            '      <div class="svm-ctl"><label>Box constraint C <span class="val" id="svm-c-val">1</span></label>' +
            '        <input type="range" id="svm-c" min="0" max="8" step="1" value="4"></div>' +
            '      <div class="svm-ctl" id="svm-gamma-row"><label>RBF &gamma; <span class="val" id="svm-g-val">1</span></label>' +
            '        <input type="range" id="svm-g" min="0" max="5" step="1" value="3"></div>' +
            '      <div class="svm-ctl"><label>Label noise <span class="val" id="svm-noise-val">10%</span></label>' +
            '        <input type="range" id="svm-noise" min="0" max="0.3" step="0.05" value="0.1"></div>' +
            '      <button id="svm-solve" class="svm-btn solve">Solve (SMO)</button>' +
            '      <button id="svm-newdata" class="svm-btn sec">New Data</button>' +
            '      <button id="svm-reset" class="svm-btn sec">Reset Solution</button>' +
            '    </div>' +
            '    <div class="svm-card" style="margin-top:16px;">' +
            '      <h3>Metrics</h3>' +
            '      <div class="svm-metrics" id="svm-metrics"></div>' +
            '    </div>' +
            '    <div class="svm-card" style="margin-top:16px;">' +
            '      <h3>KKT &amp; the three cases</h3>' +
            '      <div class="svm-metrics" id="svm-kkt"></div>' +
            '      <div class="svm-status" id="svm-status"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        container.appendChild(root);

        var plotCanvas = document.getElementById('svm-plot');
        var dualCanvas = document.getElementById('svm-dual');
        var gapCanvas = document.getElementById('svm-gap');
        var metricsEl = document.getElementById('svm-metrics');
        var kktEl = document.getElementById('svm-kkt');
        var statusEl = document.getElementById('svm-status');
        var solveBtn = document.getElementById('svm-solve');

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

        /* the model whose f is currently displayed (null before solving) */
        function activeModel() {
            if (solution) return solution.model;
            if (isSolving && solver) return solver.model;
            return null;
        }

        /* ---------- main plot ---------- */
        function drawPlot() {
            var s = sizeCanvas(plotCanvas, 0.68);
            var ctx = s.ctx; if (!ctx) return;
            var m = { l: 34, r: 12, t: 10, b: 26 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            /* isotropic mapping: the y half-range is fixed, the x
             * half-range adapts to the plot aspect, so a circle in data
             * space renders as a circle in pixels */
            var yHalf = Y_HALF, xHalf = Y_HALF * pw / ph;
            var scalePx = ph / (2 * yHalf);
            function X(x) { return m.l + (x + xHalf) / (2 * xHalf) * pw; }
            function Y(y) { return m.t + (yHalf - y) / (2 * yHalf) * ph; }

            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);

            var model = activeModel();

            /* sign shading from the ACTUAL decision function */
            if (model) {
                var off = document.createElement('canvas');
                off.width = GRID_N + 1; off.height = GRID_N + 1;
                var offCtx = off.getContext('2d');
                if (offCtx) {
                    var img = offCtx.createImageData(GRID_N + 1, GRID_N + 1);
                    for (var a = 0; a <= GRID_N; a++) {
                        for (var b = 0; b <= GRID_N; b++) {
                            var gx = -xHalf + (a / GRID_N) * (2 * xHalf);
                            var gy = -yHalf + (b / GRID_N) * (2 * yHalf);
                            var f = SvmCore.decisionFunction(model, gx, gy);
                            var px = (((GRID_N - b) * (GRID_N + 1)) + a) * 4;
                            if (f < 0) {
                                img.data[px] = 77; img.data[px + 1] = 163; img.data[px + 2] = 255;
                            } else {
                                img.data[px] = 255; img.data[px + 1] = 107; img.data[px + 2] = 94;
                            }
                            img.data[px + 3] = Math.round(100 * Math.min(1, Math.abs(f)));
                        }
                    }
                    offCtx.putImageData(img, 0, 0);
                    ctx.imageSmoothingEnabled = true;
                    ctx.drawImage(off, 0, 0, GRID_N + 1, GRID_N + 1, m.l, m.t, pw, ph);
                }
            }

            /* grid + axes (integer ticks over the visible ranges) */
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '11px monospace'; ctx.textAlign = 'center';
            var t;
            for (t = -Math.floor(xHalf); t <= Math.floor(xHalf); t++) {
                ctx.beginPath(); ctx.moveTo(X(t), m.t); ctx.lineTo(X(t), m.t + ph); ctx.stroke();
                ctx.fillText(String(t), X(t), s.h - 8);
            }
            for (t = -Math.floor(yHalf); t <= Math.floor(yHalf); t++) {
                ctx.beginPath(); ctx.moveTo(m.l, Y(t)); ctx.lineTo(m.l + pw, Y(t)); ctx.stroke();
                ctx.textAlign = 'right'; ctx.fillText(String(t), m.l - 6, Y(t) + 4); ctx.textAlign = 'center';
            }
            ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(X(0), m.t); ctx.lineTo(X(0), m.t + ph); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(m.l + pw, Y(0)); ctx.stroke();

            ctx.save();
            ctx.beginPath(); ctx.rect(m.l, m.t, pw, ph); ctx.clip();

            /* true boundary (from TARGETS — the generators' source of truth) */
            ctx.strokeStyle = C.truth; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            if (params.pattern === 'linear') {
                var TW = SvmCore.TARGETS.linear.w, TB = SvmCore.TARGETS.linear.b;
                /* TW[0] x1 + TW[1] x2 + TB = 0 */
                ctx.beginPath();
                ctx.moveTo(X(-xHalf), Y((-TB + TW[0] * xHalf) / TW[1]));
                ctx.lineTo(X(xHalf), Y((-TB - TW[0] * xHalf) / TW[1]));
                ctx.stroke();
            } else {
                var R = SvmCore.TARGETS.circular.boundary;
                ctx.beginPath(); ctx.arc(X(0), Y(0), R * scalePx, 0, 2 * Math.PI); ctx.stroke();
            }
            ctx.setLineDash([]);

            /* learned boundary and margins */
            if (model) {
                if (model.kernel === 'linear') {
                    var w = SvmCore.linearWeights(model), b0 = model.b;
                    /* levels f = 0 (solid) and f = +-1 (dashed) */
                    [0, 1, -1].forEach(function (lev) {
                        var solid = lev === 0;
                        ctx.strokeStyle = solid ? C.boundary : C.marginLine;
                        ctx.lineWidth = solid ? 2.2 : 1.5;
                        ctx.setLineDash(solid ? [] : [5, 4]);
                        ctx.beginPath();
                        if (Math.abs(w[1]) > 1e-12) {
                            ctx.moveTo(X(-xHalf), Y((lev - b0 + w[0] * xHalf) / w[1]));
                            ctx.lineTo(X(xHalf), Y((lev - b0 - w[0] * xHalf) / w[1]));
                            ctx.stroke();
                        } else if (Math.abs(w[0]) > 1e-12) {
                            var xv = (lev - b0) / w[0];
                            ctx.moveTo(X(xv), m.t); ctx.lineTo(X(xv), m.t + ph);
                            ctx.stroke();
                        }
                    });
                    ctx.setLineDash([]);
                } else {
                    var field = function (x, y) { return SvmCore.decisionFunction(model, x, y); };
                    [0, 1, -1].forEach(function (lev) {
                        var solid = lev === 0;
                        var segs = SvmCore.marchingSquares(field, lev, -xHalf, xHalf, -yHalf, yHalf, MS_RES);
                        ctx.strokeStyle = solid ? C.boundary : C.marginLine;
                        ctx.lineWidth = solid ? 2.2 : 1.5;
                        ctx.setLineDash(solid ? [] : [5, 4]);
                        ctx.beginPath();
                        for (var q = 0; q < segs.length; q++) {
                            ctx.moveTo(X(segs[q].x1), Y(segs[q].y1));
                            ctx.lineTo(X(segs[q].x2), Y(segs[q].y2));
                        }
                        ctx.stroke();
                    });
                    ctx.setLineDash([]);
                }
            }
            ctx.restore();

            /* points; SV rings only from a FINAL solution's audit */
            var cats = solution ? solution.audit.categories : null;
            data.train.forEach(function (d, i) {
                var x = X(d.x1), y = Y(d.x2);
                ctx.fillStyle = d.y === 1 ? C.classPos : C.classNeg;
                ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
                if (cats) {
                    var c = cats[i];
                    if (c === 'free') { ctx.strokeStyle = C.svFree; ctx.lineWidth = 2; }
                    else if (c === 'boundIn' || c === 'boundMis') { ctx.strokeStyle = C.svBound; ctx.lineWidth = 2; }
                    else return;
                    ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.stroke();
                }
            });
            data.test.forEach(function (d) {
                ctx.fillStyle = d.y === 1 ? C.classPosTest : C.classNegTest;
                ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.rect(X(d.x1) - 3.5, Y(d.x2) - 3.5, 7, 7); ctx.fill(); ctx.stroke();
            });
        }

        /* ---------- curve panels ---------- */
        function drawSeries(canvas, key, color, logScale) {
            var s = sizeCanvas(canvas, 0.62);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            var m = { l: 44, r: 8, t: 8, b: 22 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;

            if (history.length < 2) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Solve', s.w / 2, s.h / 2);
                return;
            }
            var FLOOR = 1e-8;
            function tv(v) { return logScale ? Math.log10(Math.max(v, FLOOR)) : v; }
            var minS = history[0].step, maxS = history[history.length - 1].step;
            var lo = Infinity, hi = -Infinity;
            history.forEach(function (r) {
                var v = tv(r[key]);
                if (v < lo) lo = v;
                if (v > hi) hi = v;
            });
            if (hi - lo < 1e-12) { hi = lo + 1; }
            var padV = (hi - lo) * 0.06;
            lo -= padV; hi += padV;
            function Xc(st) { return m.l + (st - minS) / Math.max(1, maxS - minS) * pw; }
            function Yc(v) { return m.t + (hi - tv(v)) / (hi - lo) * ph; }

            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '9px monospace'; ctx.textAlign = 'right';
            for (var k = 0; k <= 3; k++) {
                var vv = lo + (hi - lo) * k / 3;
                var yPix = m.t + (hi - vv) / (hi - lo) * ph;
                ctx.beginPath(); ctx.moveTo(m.l, yPix); ctx.lineTo(m.l + pw, yPix); ctx.stroke();
                var label = logScale
                    ? (vv <= Math.log10(FLOOR) + 1e-9 ? '\u22641e-8' : '1e' + vv.toFixed(1))
                    : vv.toFixed(Math.abs(vv) < 10 ? 2 : 0);
                ctx.fillText(label, m.l - 4, yPix + 3);
            }
            ctx.textAlign = 'center';
            ctx.fillText(String(maxS) + ' steps', m.l + pw - 24, s.h - 6);

            ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
            for (var i = 0; i < history.length; i++) {
                var r = history[i];
                if (i === 0) ctx.moveTo(Xc(r.step), Yc(r[key]));
                else ctx.lineTo(Xc(r.step), Yc(r[key]));
            }
            ctx.stroke();
        }

        function drawCurves() {
            drawSeries(dualCanvas, 'dual', C.dual, false);
            drawSeries(gapCanvas, 'gap', C.gapCurve, true);
        }

        /* ---------- metrics & KKT ---------- */
        function fmtNum(v) {
            if (!isFinite(v)) return '\u2014';
            var av = Math.abs(v);
            if (av !== 0 && (av >= 1e4 || av < 1e-3)) return v.toExponential(2);
            return v.toFixed(4);
        }

        /* metrics computed from the ACTUAL current model; before solving,
         * that model is alpha = 0, b = 0 (so f = 0 and sign(f) = +1) */
        function renderMetrics() {
            var model = activeModel();
            var zero = null;
            if (!model) {
                zero = {
                    pts: data.train, alphas: new Float64Array(data.train.length), b: 0,
                    kernel: params.kernel, gamma: params.gamma, C: params.C
                };
                model = zero;
            }
            var K = solution ? solution.K : (isSolving && solver ? solver.K : SvmCore.gramMatrix(model.kernel, model.gamma, model.pts));
            var D = SvmCore.dualObjective(model, K);
            var P = SvmCore.primalObjective(model, K);
            var wn = SvmCore.wNormSq(model, K);
            var margin = wn > 1e-15 ? 2 / Math.sqrt(wn) : Infinity;
            metricsEl.innerHTML =
                '<div class="row"><span>Train accuracy</span><span>' + (SvmCore.accuracy(model, data.train) * 100).toFixed(1) + '%</span></div>' +
                '<div class="row"><span>Test accuracy</span><span>' + (SvmCore.accuracy(model, data.test) * 100).toFixed(1) + '%</span></div>' +
                '<div class="row"><span>Dual D(&alpha;)</span><span>' + fmtNum(D) + '</span></div>' +
                '<div class="row"><span>Primal P(w, b, &xi;)</span><span>' + fmtNum(P) + '</span></div>' +
                '<div class="row"><span>Duality gap P &minus; D</span><span>' + fmtNum(P - D) + '</span></div>' +
                '<div class="row"><span>Margin 2/&#8214;w&#8214;</span><span>' + (isFinite(margin) ? fmtNum(margin) : '\u2014 (w = 0)') + '</span></div>' +
                '<div class="row"><span>Bias b&#770;</span><span>' + fmtNum(model.b) + '</span></div>' +
                '<div class="row"><span>SMO pair steps</span><span>' + (solution ? solution.steps : (history.length ? history[history.length - 1].step : 0)) + '</span></div>';
        }

        function renderKkt() {
            if (!solution) {
                kktEl.innerHTML = '<div class="row"><span>Status</span><span>not solved</span></div>';
                return;
            }
            var a = solution.audit;
            kktEl.innerHTML =
                '<div class="row"><span>&alpha;<sub>n</sub> = 0 (outside margin)</span><span>' + a.counts.zero + '</span></div>' +
                '<div class="row"><span>0 &lt; &alpha;<sub>n</sub> &lt; C (on margin)</span><span>' + a.counts.free + '</span></div>' +
                '<div class="row"><span>&alpha;<sub>n</sub> = C, &xi;<sub>n</sub> &le; 1 (inside)</span><span>' + a.counts.boundIn + '</span></div>' +
                '<div class="row"><span>&alpha;<sub>n</sub> = C, &xi;<sub>n</sub> &gt; 1 (misclassified)</span><span>' + a.counts.boundMis + '</span></div>' +
                '<div class="row"><span>Support vectors</span><span>' + (a.counts.free + a.counts.boundIn + a.counts.boundMis) + '/' + data.train.length + '</span></div>' +
                '<div class="row"><span>Max KKT violation</span><span>' + fmtNum(a.maxViolation) + '</span></div>' +
                '<div class="row"><span>&Sigma; &alpha;<sub>n</sub> y&#771;<sub>n</sub></span><span>' + fmtNum(SvmCore.equalityResidual(solution.model)) + '</span></div>';
        }

        function setStatus(msg, warn) {
            statusEl.textContent = msg;
            statusEl.className = 'svm-status' + (warn ? ' warn' : '');
        }

        function renderAll() { renderMetrics(); renderKkt(); drawPlot(); drawCurves(); }

        /* ---------- solving (animated SMO) ---------- */
        function nextFrame() {
            return new Promise(function (res) {
                if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { res(); });
                else setTimeout(res, 16);
            });
        }

        var lockedWhileSolving = ['svm-pattern', 'svm-kernel', 'svm-c', 'svm-g', 'svm-noise', 'svm-newdata', 'svm-reset'];
        function setControlsLocked(locked) {
            lockedWhileSolving.forEach(function (id) {
                var el = document.getElementById(id);
                el.disabled = locked;
                el.style.opacity = locked ? '0.45' : '';
            });
            if (!locked) updateGammaEnabled();
        }

        async function runSolve() {
            if (isSolving) { stopRequested = true; return; }
            isSolving = true; stopRequested = false;
            setControlsLocked(true);
            solveBtn.textContent = 'Stop';
            solveBtn.classList.add('stop');

            /* a QP solve always starts from alpha = 0 */
            solution = null;
            history = [];
            solver = SvmCore.createSolver(data.train, params.kernel, params.gamma, params.C);
            var CAP = 1000 * data.train.length;
            var steps = 0;
            var record = function () {
                /* the Ft-based solver never touches model.b; install the
                 * current KKT-interval midpoint so the displayed boundary,
                 * primal value and gap curve are meaningful mid-solve */
                solver.model.b = solver.biasEstimate();
                history.push({
                    step: steps,
                    dual: SvmCore.dualObjective(solver.model, solver.K),
                    gap: Math.max(0, SvmCore.primalObjective(solver.model, solver.K) -
                                     SvmCore.dualObjective(solver.model, solver.K))
                });
            };
            record();
            setStatus('Solving the dual QP\u2026', false);

            var done = false;
            while (!done && !stopRequested) {
                var t0 = Date.now();
                while (Date.now() - t0 < 12) {
                    if (steps >= CAP || !solver.step()) { done = true; break; }
                    steps++;
                }
                record();
                renderMetrics(); drawPlot(); drawCurves();
                await nextFrame();
            }

            if (stopRequested) {
                /* partial solutions are discarded, never displayed as complete */
                solver = null;
                solution = null;
                history = [];
                isSolving = false;
                setControlsLocked(false);
                solveBtn.textContent = 'Solve (SMO)';
                solveBtn.classList.remove('stop');
                setStatus('Stopped \u2014 partial solution discarded.', true);
                renderAll();
                return;
            }

            var finalGap = solver.gap();
            var converged = finalGap <= solver.tol;
            solver.finalize();
            var audit = SvmCore.kktAudit(solver.model, solver.K);
            solution = { model: solver.model, K: solver.K, steps: steps, converged: converged, audit: audit };
            solver = null;
            isSolving = false;
            setControlsLocked(false);
            solveBtn.textContent = 'Solve (SMO)';
            solveBtn.classList.remove('stop');
            if (converged) {
                setStatus('Converged: KKT gap \u2264 10\u207b\u00b3 after ' + steps + ' pair steps. ' +
                    'Every quantity on the right is computed from the solved \u03b1.', false);
            } else {
                setStatus('Step cap reached WITHOUT convergence (KKT gap ' +
                    fmtNum(finalGap) +
                    '). The result shown is a feasible but non-optimal dual point.', true);
            }
            renderAll();
        }

        /* ---------- resets ---------- */
        function resetSolution(msg) {
            solution = null; solver = null; history = [];
            solveBtn.textContent = 'Solve (SMO)';
            setStatus(msg || 'Not yet solved \u2014 press Solve.', false);
            renderAll();
        }
        function regenerate() {
            data = SvmCore.generateData(params.pattern, params.noise, 100, rng);
            resetSolution();
        }

        /* ---------- controls ---------- */
        function updateGammaEnabled() {
            var row = document.getElementById('svm-gamma-row');
            var el = document.getElementById('svm-g');
            var off = params.kernel !== 'rbf';
            el.disabled = off;
            row.style.opacity = off ? '0.4' : '';
        }
        function fmtStop(v) { return String(v); }

        document.getElementById('svm-pattern').addEventListener('change', function (e) {
            if (isSolving) return;
            params.pattern = e.target.value;
            regenerate();
        });
        document.getElementById('svm-kernel').addEventListener('change', function (e) {
            if (isSolving) return;
            params.kernel = e.target.value;
            updateGammaEnabled();
            resetSolution('Kernel changed \u2014 solution cleared. Press Solve.');
        });
        document.getElementById('svm-c').addEventListener('input', function (e) {
            if (isSolving) return;
            params.C = C_STOPS[parseInt(e.target.value, 10)];
            document.getElementById('svm-c-val').textContent = fmtStop(params.C);
            resetSolution('C changed \u2014 solution cleared. Press Solve.');
        });
        document.getElementById('svm-g').addEventListener('input', function (e) {
            if (isSolving) return;
            params.gamma = G_STOPS[parseInt(e.target.value, 10)];
            document.getElementById('svm-g-val').textContent = fmtStop(params.gamma);
            resetSolution('\u03b3 changed \u2014 solution cleared. Press Solve.');
        });
        document.getElementById('svm-noise').addEventListener('input', function (e) {
            if (isSolving) return;
            params.noise = parseFloat(e.target.value);
            document.getElementById('svm-noise-val').textContent = Math.round(params.noise * 100) + '%';
            regenerate();
        });
        solveBtn.addEventListener('click', runSolve);
        document.getElementById('svm-newdata').addEventListener('click', function () { if (!isSolving) regenerate(); });
        document.getElementById('svm-reset').addEventListener('click', function () { if (!isSolving) resetSolution(); });

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { padCache = {}; drawPlot(); drawCurves(); }, 120);
        });

        updateGammaEnabled();
        resetSolution();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSvmDemo);
    } else {
        initSvmDemo();
    }
})();