/* ============================================================
 * Kernel PCA & Autoencoder Demo — math core (KpcaCore)
 * Pure functions, no DOM. The demo computes the page's objects
 * exactly:
 *   - centered Gram matrix  Kt = C_N K C_N  (double centering trick),
 *   - top-k eigenpairs of Kt by orthogonal iteration with an explicit
 *     residual certificate  ||Kt u - lambda u|| <= tol  (no silent
 *     non-convergence: the flag is returned and displayed),
 *   - KPCA training scores in the page's theorem form
 *     Kt U Lambda^{-1/2}  (tested identical to U Lambda^{1/2}),
 *   - closed-form 2x2 PCA (covariance with 1/N, matching the page's
 *     S_phi = (1/N) sum phi_i phi_i^top),
 *   - a bias-free linear autoencoder (page: z = W1 x, xhat = W2 z)
 *     whose convergence to the top-1 PCA projector is a TESTED fact,
 *   - a tanh autoencoder (2-h-1-h-2) with finite-difference-checked
 *     gradients; "nonlinear beats linear on circles" is a tested fact.
 * No dataset-specific parameter overrides, no diagonal nudges, no
 * learning-rate decay, no gradient clipping.
 * ============================================================ */
var KpcaCore = (function () {
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

    /* Box-Muller standard normal */
    function gaussian(rng) {
        var u = 0, v = 0;
        do { u = rng(); } while (u <= 1e-12);
        v = rng();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /* ---------- kernels ---------- */
    function kernelValue(kernel, params, a, b) {
        var dot = a[0] * b[0] + a[1] * b[1];
        if (kernel === 'linear') return dot;
        if (kernel === 'poly') {
            /* (gamma x^top y + 1)^degree */
            return Math.pow(params.gamma * dot + 1, params.degree);
        }
        /* rbf */
        var d0 = a[0] - b[0], d1 = a[1] - b[1];
        return Math.exp(-params.gamma * (d0 * d0 + d1 * d1));
    }

    function gramMatrix(kernel, params, pts) {
        var n = pts.length, K = new Array(n);
        for (var i = 0; i < n; i++) K[i] = new Float64Array(n);
        for (var p = 0; p < n; p++) {
            for (var q = 0; q <= p; q++) {
                var v = kernelValue(kernel, params, pts[p], pts[q]);
                K[p][q] = v; K[q][p] = v;
            }
        }
        return K;
    }

    /* ---------- double centering: Kt = C_N K C_N ----------
     * Kt_ij = K_ij - rowMean_i - colMean_j + totalMean */
    function centerGram(K) {
        var n = K.length;
        var rowMean = new Float64Array(n), total = 0;
        for (var i = 0; i < n; i++) {
            var s = 0;
            for (var j = 0; j < n; j++) s += K[i][j];
            rowMean[i] = s / n;
            total += s;
        }
        total /= n * n;
        var Kt = new Array(n);
        for (var p = 0; p < n; p++) {
            Kt[p] = new Float64Array(n);
            for (var q = 0; q < n; q++) {
                Kt[p][q] = K[p][q] - rowMean[p] - rowMean[q] + total;
            }
        }
        return Kt;
    }

    function trace(M) {
        var s = 0;
        for (var i = 0; i < M.length; i++) s += M[i][i];
        return s;
    }

    /* ---------- small dense linear algebra (column vectors as arrays) */
    function matVec(M, v) {
        var n = M.length, out = new Float64Array(n);
        for (var i = 0; i < n; i++) {
            var s = 0, row = M[i];
            for (var j = 0; j < n; j++) s += row[j] * v[j];
            out[i] = s;
        }
        return out;
    }

    function dot(a, b) {
        var s = 0;
        for (var i = 0; i < a.length; i++) s += a[i] * b[i];
        return s;
    }

    function norm(a) { return Math.sqrt(dot(a, a)); }

    /* modified Gram-Schmidt with one re-orthogonalization pass;
     * columns is an array of k vectors (each Float64Array length n) */
    function orthonormalize(columns) {
        var k = columns.length;
        for (var j = 0; j < k; j++) {
            var v = columns[j];
            for (var pass = 0; pass < 2; pass++) {
                for (var i = 0; i < j; i++) {
                    var c = dot(columns[i], v);
                    for (var t = 0; t < v.length; t++) v[t] -= c * columns[i][t];
                }
            }
            var nv = norm(v);
            if (nv < 1e-14) {
                /* degenerate direction: leave as zero vector; caller's
                 * residual certificate will fail honestly */
                for (var z = 0; z < v.length; z++) v[z] = 0;
            } else {
                for (var t2 = 0; t2 < v.length; t2++) v[t2] /= nv;
            }
        }
    }

    /* cyclic Jacobi for a small k x k symmetric matrix (k <= ~8).
     * Returns { values, vectors } with vectors[j] the j-th eigenvector,
     * sorted by eigenvalue descending. Sweep-based with an off-norm
     * convergence check and a hard sweep guard (never spins). */
    function smallSymmetricEig(B) {
        var k = B.length;
        var A = new Array(k), V = new Array(k), i, j;
        for (i = 0; i < k; i++) {
            A[i] = new Float64Array(k);
            V[i] = new Float64Array(k);
            for (j = 0; j < k; j++) A[i][j] = B[i][j];
            V[i][i] = 1;
        }
        for (var sweep = 0; sweep < 100; sweep++) {
            var off = 0;
            for (i = 0; i < k; i++) {
                for (j = i + 1; j < k; j++) off += A[i][j] * A[i][j];
            }
            if (Math.sqrt(off) < 1e-13) break;
            for (var p = 0; p < k; p++) {
                for (var q = p + 1; q < k; q++) {
                    if (Math.abs(A[p][q]) < 1e-15) continue;
                    var diff = A[q][q] - A[p][p];
                    var theta = Math.abs(diff) < 1e-14
                        ? Math.PI / 4
                        : 0.5 * Math.atan2(2 * A[p][q], diff);
                    var c = Math.cos(theta), s = Math.sin(theta);
                    for (var t = 0; t < k; t++) {
                        var Atp = c * A[t][p] - s * A[t][q];
                        var Atq = s * A[t][p] + c * A[t][q];
                        A[t][p] = Atp; A[t][q] = Atq;
                    }
                    for (t = 0; t < k; t++) {
                        var Apt = c * A[p][t] - s * A[q][t];
                        var Aqt = s * A[p][t] + c * A[q][t];
                        A[p][t] = Apt; A[q][t] = Aqt;
                    }
                    for (t = 0; t < k; t++) {
                        var Vtp = c * V[t][p] - s * V[t][q];
                        var Vtq = s * V[t][p] + c * V[t][q];
                        V[t][p] = Vtp; V[t][q] = Vtq;
                    }
                }
            }
        }
        var pairs = [];
        for (j = 0; j < k; j++) {
            var vec = new Float64Array(k);
            for (i = 0; i < k; i++) vec[i] = V[i][j];
            pairs.push({ value: A[j][j], vector: vec });
        }
        pairs.sort(function (a, b) { return b.value - a.value; });
        return pairs;
    }

    /* residual certificate: max_j ||M u_j - lambda_j u_j||_2,
     * for vectors[j] (length n) and values[j] */
    function eigenResidual(M, values, vectors) {
        var worst = 0;
        for (var j = 0; j < vectors.length; j++) {
            var Mu = matVec(M, vectors[j]);
            var r = 0;
            for (var i = 0; i < Mu.length; i++) {
                var d = Mu[i] - values[j] * vectors[j][i];
                r += d * d;
            }
            r = Math.sqrt(r);
            if (r > worst) worst = r;
        }
        return worst;
    }

    /* ---------- top-k symmetric eigensolver ----------
     * Orthogonal (subspace) iteration with GUARD VECTORS: iterates on a
     * (k + 2)-dimensional subspace so the requested top k converge at
     * the faster rate lambda_{k+3}/lambda_k, then certifies and returns
     * only the top k. Stopping has ONE source of truth: the residual
     * certificate max_j ||M u_j - lambda_j u_j|| <= tol * max(1, l1),
     * evaluated on Rayleigh-Ritz pairs every checkEvery iterations.
     * If the iteration cap is hit first, converged = false is returned
     * and must be surfaced by the caller. */
    function topKEigen(M, k, rng, maxIter) {
        var n = M.length;
        k = Math.min(k, n);
        var guards = Math.min(2, n - k);
        var kk = k + guards;
        var cap = maxIter || 2000;
        var checkEvery = 10;
        var tol = 1e-8;
        var cols = [], j, i;
        for (j = 0; j < kk; j++) {
            var v = new Float64Array(n);
            for (i = 0; i < n; i++) v[i] = rng() * 2 - 1;
            cols.push(v);
        }
        orthonormalize(cols);

        /* Rayleigh-Ritz on the current basis; returns top-k certified
         * pairs plus the residual over those k pairs */
        function rayleighRitz() {
            var B = new Array(kk), MV = [], a, b;
            for (j = 0; j < kk; j++) MV.push(matVec(M, cols[j]));
            for (a = 0; a < kk; a++) {
                B[a] = new Float64Array(kk);
                for (b = 0; b < kk; b++) B[a][b] = dot(cols[a], MV[b]);
            }
            var pairs = smallSymmetricEig(B);
            var values = [], vectors = [];
            for (j = 0; j < k; j++) {
                values.push(pairs[j].value);
                var w = new Float64Array(n);
                for (var t = 0; t < kk; t++) {
                    var coef = pairs[j].vector[t];
                    for (i = 0; i < n; i++) w[i] += coef * cols[t][i];
                }
                vectors.push(w);
            }
            return { values: values, vectors: vectors,
                     residual: eigenResidual(M, values, vectors) };
        }

        var iterations = 0, rr = null;
        for (var it = 0; it < cap; it++) {
            iterations = it + 1;
            for (j = 0; j < kk; j++) cols[j] = matVec(M, cols[j]);
            orthonormalize(cols);
            if (iterations % checkEvery === 0) {
                rr = rayleighRitz();
                if (rr.residual <= tol * Math.max(1, Math.abs(rr.values[0]))) break;
            }
        }
        if (!rr || iterations % checkEvery !== 0) rr = rayleighRitz();
        var converged = rr.residual <= tol * Math.max(1, Math.abs(rr.values[0]));
        return {
            values: rr.values, vectors: rr.vectors,
            iterations: iterations, residual: rr.residual, converged: converged
        };
    }

    /* ---------- KPCA projection (the page's theorem form) ----------
     * scores = Kt U Lambda^{-1/2}: score of training point i on
     * component j is (Kt u_j)_i / sqrt(lambda_j). Components with
     * lambda <= lambdaFloor are dropped (reported, not fudged). */
    function kpcaScores(Kt, values, vectors) {
        var n = Kt.length, kept = [];
        var lambdaFloor = 1e-10 * Math.max(1, Math.abs(values[0]));
        for (var j = 0; j < values.length; j++) {
            if (values[j] > lambdaFloor) kept.push(j);
        }
        var scores = new Array(n);
        for (var i = 0; i < n; i++) scores[i] = new Float64Array(kept.length);
        for (var c = 0; c < kept.length; c++) {
            var jj = kept[c];
            var Ku = matVec(Kt, vectors[jj]);
            var invSqrt = 1 / Math.sqrt(values[jj]);
            for (var i2 = 0; i2 < n; i2++) scores[i2][c] = Ku[i2] * invSqrt;
        }
        return { scores: scores, keptComponents: kept.length };
    }

    /* ---------- closed-form 2x2 PCA ----------
     * Covariance with 1/N (page convention: S = (1/N) sum x x^top on
     * centered data). Returns eigenvalues desc, eigenvectors (unit),
     * mean, and training scores (projections of centered data). */
    function pca2(pts) {
        var n = pts.length;
        var mx = 0, my = 0, i;
        for (i = 0; i < n; i++) { mx += pts[i][0]; my += pts[i][1]; }
        mx /= n; my /= n;
        var a = 0, b = 0, c = 0;
        for (i = 0; i < n; i++) {
            var dx = pts[i][0] - mx, dy = pts[i][1] - my;
            a += dx * dx; b += dx * dy; c += dy * dy;
        }
        a /= n; b /= n; c /= n;
        var half = (a + c) / 2;
        var disc = Math.sqrt(((a - c) / 2) * ((a - c) / 2) + b * b);
        var l1 = half + disc, l2 = half - disc;
        var v1, v2;
        if (Math.abs(b) > 1e-14) {
            v1 = [b, l1 - a]; v2 = [b, l2 - a];
        } else if (a >= c) {
            v1 = [1, 0]; v2 = [0, 1];
        } else {
            v1 = [0, 1]; v2 = [1, 0];
        }
        var n1 = Math.hypot(v1[0], v1[1]), n2 = Math.hypot(v2[0], v2[1]);
        v1 = [v1[0] / n1, v1[1] / n1];
        v2 = [v2[0] / n2, v2[1] / n2];
        var scores = new Array(n);
        for (i = 0; i < n; i++) {
            var cx = pts[i][0] - mx, cy = pts[i][1] - my;
            scores[i] = [cx * v1[0] + cy * v1[1], cx * v2[0] + cy * v2[1]];
        }
        return {
            values: [l1, l2], vectors: [v1, v2],
            mean: [mx, my], scores: scores
        };
    }

    /* ---------- data generation ----------
     * TARGETS is the single source of truth; labels are for COLORING
     * only (the methods are unsupervised and never see them).
     * Coordinate noise is additive Gaussian (never label flips). */
    var TARGETS = {
        circles: { rInner: 0.6, rOuter: 1.5 },
        moons: { radius: 1.0, offsetX: 1.0, offsetY: 0.5 },
        blobs: { centers: [[-2, -1], [2, -1], [0, 2]], std: 0.45 },
        spiral: { a: 0.35, turns: 1.75, phase: Math.PI }
    };

    function generateData(pattern, noise, n, rng) {
        var pts = [], labels = [], i, t;
        if (pattern === 'circles') {
            var T = TARGETS.circles;
            for (i = 0; i < n; i++) {
                var inner = i % 2 === 0;
                var r = inner ? T.rInner : T.rOuter;
                t = rng() * 2 * Math.PI;
                pts.push([r * Math.cos(t) + noise * gaussian(rng),
                          r * Math.sin(t) + noise * gaussian(rng)]);
                labels.push(inner ? 0 : 1);
            }
        } else if (pattern === 'moons') {
            var M = TARGETS.moons;
            for (i = 0; i < n; i++) {
                var upper = i % 2 === 0;
                t = rng() * Math.PI;
                var x, y;
                if (upper) { x = M.radius * Math.cos(t); y = M.radius * Math.sin(t); }
                else { x = M.offsetX - M.radius * Math.cos(t); y = M.offsetY - M.radius * Math.sin(t); }
                pts.push([x + noise * gaussian(rng), y + noise * gaussian(rng)]);
                labels.push(upper ? 0 : 1);
            }
        } else if (pattern === 'blobs') {
            var Bc = TARGETS.blobs;
            for (i = 0; i < n; i++) {
                var ci = i % Bc.centers.length;
                pts.push([Bc.centers[ci][0] + (Bc.std + noise) * gaussian(rng),
                          Bc.centers[ci][1] + (Bc.std + noise) * gaussian(rng)]);
                labels.push(ci);
            }
        } else {
            /* spiral: two arms, r = a * theta, arm 2 phase-shifted */
            var S = TARGETS.spiral;
            for (i = 0; i < n; i++) {
                var arm = i % 2;
                t = (0.25 + (rng() * S.turns)) * 2 * Math.PI;
                var ph = arm === 0 ? 0 : S.phase;
                pts.push([S.a * t * Math.cos(t + ph) + noise * gaussian(rng),
                          S.a * t * Math.sin(t + ph) + noise * gaussian(rng)]);
                labels.push(arm);
            }
        }
        /* shuffle points and labels together */
        for (var k2 = n - 1; k2 > 0; k2--) {
            var j2 = Math.floor(rng() * (k2 + 1));
            var tp = pts[k2]; pts[k2] = pts[j2]; pts[j2] = tp;
            var tl = labels[k2]; labels[k2] = labels[j2]; labels[j2] = tl;
        }
        return { points: pts, labels: labels };
    }

    /* isotropic normalization for autoencoder input: center, then
     * divide BOTH coordinates by one scale (per-axis scaling would
     * distort circles). Returns { normalized, mean, scale }. */
    function normalizeIsotropic(pts) {
        var n = pts.length, mx = 0, my = 0, i;
        for (i = 0; i < n; i++) { mx += pts[i][0]; my += pts[i][1]; }
        mx /= n; my /= n;
        var s = 0;
        for (i = 0; i < n; i++) {
            var dx = pts[i][0] - mx, dy = pts[i][1] - my;
            s += dx * dx + dy * dy;
        }
        var scale = Math.sqrt(s / (2 * n));
        if (scale < 1e-12) scale = 1;
        var out = new Array(n);
        for (i = 0; i < n; i++) {
            out[i] = [(pts[i][0] - mx) / scale, (pts[i][1] - my) / scale];
        }
        return { normalized: out, mean: [mx, my], scale: scale };
    }

    /* ---------- linear autoencoder (page: z = W1 x, xhat = W2 z) ----
     * Bias-free, L = 1 latent, trained on CENTERED data by full-batch
     * gradient descent on the mean squared reconstruction error.
     * W1: 1x2 (array [w11, w12]), W2: 2x1 (array [w21, w22]). */
    function linAeCreate(rng) {
        return {
            W1: [0.5 * (rng() * 2 - 1), 0.5 * (rng() * 2 - 1)],
            W2: [0.5 * (rng() * 2 - 1), 0.5 * (rng() * 2 - 1)]
        };
    }

    function linAeReconstruct(m, x) {
        var z = m.W1[0] * x[0] + m.W1[1] * x[1];
        return [m.W2[0] * z, m.W2[1] * z];
    }

    function linAeLoss(m, data) {
        var s = 0;
        for (var i = 0; i < data.length; i++) {
            var r = linAeReconstruct(m, data[i]);
            var d0 = r[0] - data[i][0], d1 = r[1] - data[i][1];
            s += d0 * d0 + d1 * d1;
        }
        return s / data.length;
    }

    function linAeGradient(m, data) {
        var g1 = [0, 0], g2 = [0, 0], n = data.length;
        for (var i = 0; i < n; i++) {
            var x = data[i];
            var z = m.W1[0] * x[0] + m.W1[1] * x[1];
            var e0 = m.W2[0] * z - x[0], e1 = m.W2[1] * z - x[1];
            /* dL/dW2j = (2/n) e_j z ; dL/dW1j = (2/n)(e . W2) x_j */
            var eW2 = e0 * m.W2[0] + e1 * m.W2[1];
            g2[0] += 2 * e0 * z / n; g2[1] += 2 * e1 * z / n;
            g1[0] += 2 * eW2 * x[0] / n; g1[1] += 2 * eW2 * x[1] / n;
        }
        return { g1: g1, g2: g2 };
    }

    function linAeStep(m, data, lr) {
        var g = linAeGradient(m, data);
        m.W1[0] -= lr * g.g1[0]; m.W1[1] -= lr * g.g1[1];
        m.W2[0] -= lr * g.g2[0]; m.W2[1] -= lr * g.g2[1];
    }

    /* product W2 W1 as a 2x2 matrix (the learned "projector") */
    function linAeProduct(m) {
        return [
            [m.W2[0] * m.W1[0], m.W2[0] * m.W1[1]],
            [m.W2[1] * m.W1[0], m.W2[1] * m.W1[1]]
        ];
    }

    /* ---------- nonlinear autoencoder: 2 -> h(tanh) -> 1 -> h(tanh) -> 2
     * With biases; tanh is smooth so finite-difference checks apply
     * everywhere. Trained by full-batch gradient descent: no momentum,
     * no decay, no clipping. */
    function nlAeCreate(h, rng) {
        function mat(rows, cols, scale) {
            var M = [];
            for (var i = 0; i < rows; i++) {
                var r = [];
                for (var j = 0; j < cols; j++) r.push(scale * (rng() * 2 - 1));
                M.push(r);
            }
            return M;
        }
        var s1 = Math.sqrt(6 / (2 + h)), s2 = Math.sqrt(6 / (h + 1));
        return {
            h: h,
            W1: mat(h, 2, s1), b1: new Float64Array(h),
            W2: mat(1, h, s2), b2: new Float64Array(1),
            W3: mat(h, 1, s2), b3: new Float64Array(h),
            W4: mat(2, h, s1), b4: new Float64Array(2)
        };
    }

    function nlAeForward(m, x) {
        var h = m.h, i, j;
        var z1 = new Float64Array(h), a1 = new Float64Array(h);
        for (i = 0; i < h; i++) {
            z1[i] = m.W1[i][0] * x[0] + m.W1[i][1] * x[1] + m.b1[i];
            a1[i] = Math.tanh(z1[i]);
        }
        var z2 = m.b2[0];
        for (j = 0; j < h; j++) z2 += m.W2[0][j] * a1[j];
        var z3 = new Float64Array(h), a3 = new Float64Array(h);
        for (i = 0; i < h; i++) {
            z3[i] = m.W3[i][0] * z2 + m.b3[i];
            a3[i] = Math.tanh(z3[i]);
        }
        var out = [m.b4[0], m.b4[1]];
        for (j = 0; j < h; j++) {
            out[0] += m.W4[0][j] * a3[j];
            out[1] += m.W4[1][j] * a3[j];
        }
        return { out: out, latent: z2, a1: a1, a3: a3 };
    }

    function nlAeLoss(m, data) {
        var s = 0;
        for (var i = 0; i < data.length; i++) {
            var f = nlAeForward(m, data[i]);
            var d0 = f.out[0] - data[i][0], d1 = f.out[1] - data[i][1];
            s += d0 * d0 + d1 * d1;
        }
        return s / data.length;
    }

    function nlAeZeroGrads(m) {
        var h = m.h;
        function zmat(r, c) {
            var M = [];
            for (var i = 0; i < r; i++) M.push(new Float64Array(c));
            return M;
        }
        return {
            W1: zmat(h, 2), b1: new Float64Array(h),
            W2: zmat(1, h), b2: new Float64Array(1),
            W3: zmat(h, 1), b3: new Float64Array(h),
            W4: zmat(2, h), b4: new Float64Array(2)
        };
    }

    /* accumulate full-batch gradient of the MEAN squared error */
    function nlAeGradient(m, data) {
        var h = m.h, n = data.length, g = nlAeZeroGrads(m);
        for (var s = 0; s < n; s++) {
            var x = data[s];
            var f = nlAeForward(m, x);
            var e = [2 * (f.out[0] - x[0]) / n, 2 * (f.out[1] - x[1]) / n];
            var i, j;
            /* out layer */
            var dA3 = new Float64Array(h);
            for (j = 0; j < h; j++) {
                g.W4[0][j] += e[0] * f.a3[j];
                g.W4[1][j] += e[1] * f.a3[j];
                dA3[j] = e[0] * m.W4[0][j] + e[1] * m.W4[1][j];
            }
            g.b4[0] += e[0]; g.b4[1] += e[1];
            /* decoder hidden */
            var dZ2 = 0;
            for (i = 0; i < h; i++) {
                var dZ3 = dA3[i] * (1 - f.a3[i] * f.a3[i]);
                g.W3[i][0] += dZ3 * f.latent;
                g.b3[i] += dZ3;
                dZ2 += dZ3 * m.W3[i][0];
            }
            /* latent (linear) */
            for (j = 0; j < h; j++) g.W2[0][j] += dZ2 * f.a1[j];
            g.b2[0] += dZ2;
            /* encoder hidden */
            for (i = 0; i < h; i++) {
                var dZ1 = dZ2 * m.W2[0][i] * (1 - f.a1[i] * f.a1[i]);
                g.W1[i][0] += dZ1 * x[0];
                g.W1[i][1] += dZ1 * x[1];
                g.b1[i] += dZ1;
            }
        }
        return g;
    }

    function nlAeStep(m, data, lr) {
        var g = nlAeGradient(m, data), h = m.h, i, j;
        for (i = 0; i < h; i++) {
            m.W1[i][0] -= lr * g.W1[i][0]; m.W1[i][1] -= lr * g.W1[i][1];
            m.b1[i] -= lr * g.b1[i];
            m.W3[i][0] -= lr * g.W3[i][0];
            m.b3[i] -= lr * g.b3[i];
        }
        for (j = 0; j < h; j++) {
            m.W2[0][j] -= lr * g.W2[0][j];
            m.W4[0][j] -= lr * g.W4[0][j];
            m.W4[1][j] -= lr * g.W4[1][j];
        }
        m.b2[0] -= lr * g.b2[0];
        m.b4[0] -= lr * g.b4[0]; m.b4[1] -= lr * g.b4[1];
    }

    /* pack/unpack for finite-difference checks */
    function nlAeParams(m) {
        var out = [], h = m.h, i, j;
        for (i = 0; i < h; i++) { out.push(m.W1[i][0], m.W1[i][1]); }
        for (i = 0; i < h; i++) out.push(m.b1[i]);
        for (j = 0; j < h; j++) out.push(m.W2[0][j]);
        out.push(m.b2[0]);
        for (i = 0; i < h; i++) out.push(m.W3[i][0]);
        for (i = 0; i < h; i++) out.push(m.b3[i]);
        for (j = 0; j < h; j++) { out.push(m.W4[0][j]); }
        for (j = 0; j < h; j++) { out.push(m.W4[1][j]); }
        out.push(m.b4[0], m.b4[1]);
        return out;
    }
    function nlAeSetParams(m, p) {
        var idx = 0, h = m.h, i, j;
        for (i = 0; i < h; i++) { m.W1[i][0] = p[idx++]; m.W1[i][1] = p[idx++]; }
        for (i = 0; i < h; i++) m.b1[i] = p[idx++];
        for (j = 0; j < h; j++) m.W2[0][j] = p[idx++];
        m.b2[0] = p[idx++];
        for (i = 0; i < h; i++) m.W3[i][0] = p[idx++];
        for (i = 0; i < h; i++) m.b3[i] = p[idx++];
        for (j = 0; j < h; j++) m.W4[0][j] = p[idx++];
        for (j = 0; j < h; j++) m.W4[1][j] = p[idx++];
        m.b4[0] = p[idx++]; m.b4[1] = p[idx++];
    }
    function nlAeGradFlat(m, data) {
        var g = nlAeGradient(m, data), out = [], h = m.h, i, j;
        for (i = 0; i < h; i++) { out.push(g.W1[i][0], g.W1[i][1]); }
        for (i = 0; i < h; i++) out.push(g.b1[i]);
        for (j = 0; j < h; j++) out.push(g.W2[0][j]);
        out.push(g.b2[0]);
        for (i = 0; i < h; i++) out.push(g.W3[i][0]);
        for (i = 0; i < h; i++) out.push(g.b3[i]);
        for (j = 0; j < h; j++) out.push(g.W4[0][j]);
        for (j = 0; j < h; j++) out.push(g.W4[1][j]);
        out.push(g.b4[0], g.b4[1]);
        return out;
    }

    /* ---------- self-tests ---------- */
    function runSelfTests() {
        var failures = [];

        /* T1: RNG determinism + algorithm pin */
        (function () {
            var r1 = createRng(42), r2 = createRng(42);
            for (var i = 0; i < 5; i++) {
                if (r1() !== r2()) { failures.push('T1 rng not deterministic'); return; }
            }
            var v = createRng(1)();
            if (Math.abs(v - 0.6270739405881613) > 1e-15) {
                failures.push('T1 mulberry32 drift: ' + v);
            }
        })();

        /* T2: kernel properties */
        (function () {
            var rng = createRng(7), pts = [];
            for (var i = 0; i < 8; i++) pts.push([rng() * 4 - 2, rng() * 4 - 2]);
            var K = gramMatrix('rbf', { gamma: 0.7 }, pts);
            for (var a = 0; a < 8; a++) {
                if (Math.abs(K[a][a] - 1) > 1e-14) failures.push('T2 rbf K(x,x) != 1');
                for (var b = 0; b < 8; b++) {
                    if (Math.abs(K[a][b] - K[b][a]) > 1e-15) failures.push('T2 not symmetric');
                    if (K[a][b] <= 0 || K[a][b] > 1 + 1e-15) failures.push('T2 rbf out of (0,1]');
                }
            }
            for (var trial = 0; trial < 5; trial++) {
                var v = [], q = 0;
                for (var t = 0; t < 8; t++) v.push(rng() * 2 - 1);
                for (var p = 0; p < 8; p++) {
                    var s = 0;
                    for (var r = 0; r < 8; r++) s += K[p][r] * v[r];
                    q += v[p] * s;
                }
                if (q < -1e-10) failures.push('T2 rbf gram not PSD');
            }
            var lv = kernelValue('linear', {}, [1.5, -2], [0.5, 3]);
            if (Math.abs(lv - (0.75 - 6)) > 1e-15) failures.push('T2 linear != dot');
            var pv = kernelValue('poly', { gamma: 1, degree: 1 }, [1.5, -2], [0.5, 3]);
            if (Math.abs(pv - (0.75 - 6 + 1)) > 1e-12) failures.push('T2 poly degree-1 wrong');
            var p2 = kernelValue('poly', { gamma: 0.5, degree: 3 }, [1, 1], [2, 0]);
            if (Math.abs(p2 - Math.pow(0.5 * 2 + 1, 3)) > 1e-12) failures.push('T2 poly value wrong');
        })();

        /* T3: double centering. (a) LINEAR kernel: Kt must equal the
         * Gram matrix of EXPLICITLY centered features (exact identity —
         * this is the double centering trick verified end to end).
         * (b) any kernel: Kt rows sum to zero (Kt 1 = 0). */
        (function () {
            var rng = createRng(11);
            var d = generateData('blobs', 0.1, 30, rng);
            var K = gramMatrix('linear', {}, d.points);
            var Kt = centerGram(K);
            var n = d.points.length;
            var mx = 0, my = 0, i, j;
            for (i = 0; i < n; i++) { mx += d.points[i][0]; my += d.points[i][1]; }
            mx /= n; my /= n;
            for (i = 0; i < n; i++) {
                for (j = 0; j < n; j++) {
                    var explicit = (d.points[i][0] - mx) * (d.points[j][0] - mx) +
                                   (d.points[i][1] - my) * (d.points[j][1] - my);
                    if (Math.abs(Kt[i][j] - explicit) > 1e-10) {
                        failures.push('T3a centering != explicit at ' + i + ',' + j); return;
                    }
                }
            }
            var Kr = centerGram(gramMatrix('rbf', { gamma: 1 }, d.points));
            for (i = 0; i < n; i++) {
                var rs = 0;
                for (j = 0; j < n; j++) rs += Kr[i][j];
                if (Math.abs(rs) > 1e-9) { failures.push('T3b centered row sum != 0: ' + rs); return; }
            }
        })();

        /* T4: eigensolver on a matrix with KNOWN spectrum:
         * M = Q diag(9, 4, 1, 0.25, ...) Q^top with random orthogonal Q */
        (function () {
            var rng = createRng(31);
            var n = 12, spec = [9, 4, 1, 0.25];
            var cols = [];
            for (var j = 0; j < n; j++) {
                var v = new Float64Array(n);
                for (var i = 0; i < n; i++) v[i] = rng() * 2 - 1;
                cols.push(v);
            }
            orthonormalize(cols);
            var M = new Array(n);
            for (var p = 0; p < n; p++) M[p] = new Float64Array(n);
            for (var t = 0; t < n; t++) {
                var lam = t < spec.length ? spec[t] : 0.01;
                for (var a = 0; a < n; a++) {
                    for (var b = 0; b < n; b++) M[a][b] += lam * cols[t][a] * cols[t][b];
                }
            }
            var e = topKEigen(M, 4, createRng(5));
            if (!e.converged) failures.push('T4 solver did not converge on analytic matrix');
            for (var q = 0; q < 4; q++) {
                if (Math.abs(e.values[q] - spec[q]) > 1e-7) {
                    failures.push('T4 eigenvalue ' + q + ': ' + e.values[q] + ' != ' + spec[q]);
                }
            }
            /* orthonormality */
            for (var u = 0; u < 4; u++) {
                for (var w = 0; w <= u; w++) {
                    var dp = dot(e.vectors[u], e.vectors[w]);
                    var want = u === w ? 1 : 0;
                    if (Math.abs(dp - want) > 1e-9) failures.push('T4 vectors not orthonormal');
                }
            }
        })();

        /* T5: convergence certificate on real kernel matrices,
         * all four datasets */
        (function () {
            ['circles', 'moons', 'blobs', 'spiral'].forEach(function (ds) {
                var rng = createRng(2026);
                var d = generateData(ds, 0.05, 80, rng);
                var Kt = centerGram(gramMatrix('rbf', { gamma: 1 }, d.points));
                var e = topKEigen(Kt, 4, createRng(3));
                if (!e.converged) failures.push('T5[' + ds + '] not converged (residual ' + e.residual + ')');
                if (e.residual > 1e-6 * Math.max(1, e.values[0])) {
                    failures.push('T5[' + ds + '] residual too large: ' + e.residual);
                }
                /* variance-ratio denominators: 0 < lambda_1 <= sum(top-k) <= trace */
                var tr = trace(Kt), sum = 0;
                for (var q = 0; q < e.values.length; q++) sum += e.values[q];
                if (!(tr > 0) || !(e.values[0] > 0) || sum > tr + 1e-6 * tr) {
                    failures.push('T5[' + ds + '] trace inconsistency: sum ' + sum + ' vs trace ' + tr);
                }
            });
        })();

        /* T6: negative controls for the certificate.
         * (a) random orthonormal vectors must show a LARGE residual;
         * (b) a starved iteration cap must report converged = false. */
        (function () {
            var rng = createRng(2026);
            var d = generateData('circles', 0.05, 60, rng);
            var Kt = centerGram(gramMatrix('rbf', { gamma: 1 }, d.points));
            var r2 = createRng(77);
            var fake = [];
            for (var j = 0; j < 3; j++) {
                var v = new Float64Array(60);
                for (var i = 0; i < 60; i++) v[i] = r2() * 2 - 1;
                fake.push(v);
            }
            orthonormalize(fake);
            var vals = [];
            for (j = 0; j < 3; j++) vals.push(dot(fake[j], matVec(Kt, fake[j])));
            var res = eigenResidual(Kt, vals, fake);
            if (res < 1e-3) failures.push('T6a residual blind to garbage vectors: ' + res);
            var starved = topKEigen(Kt, 4, createRng(3), 1);
            if (starved.converged) failures.push('T6b starved solve claimed convergence');
        })();

        /* T7: theorem form Kt U Lambda^{-1/2} equals U Lambda^{1/2}
         * (they coincide exactly at true eigenpairs) */
        (function () {
            var rng = createRng(9);
            var d = generateData('moons', 0.05, 70, rng);
            var Kt = centerGram(gramMatrix('rbf', { gamma: 2 }, d.points));
            var e = topKEigen(Kt, 3, createRng(4));
            if (!e.converged) { failures.push('T7 setup did not converge'); return; }
            var sc = kpcaScores(Kt, e.values, e.vectors);
            for (var j = 0; j < sc.keptComponents; j++) {
                var sq = Math.sqrt(e.values[j]);
                for (var i = 0; i < 70; i++) {
                    if (Math.abs(sc.scores[i][j] - sq * e.vectors[j][i]) > 1e-6 * Math.max(1, sq)) {
                        failures.push('T7 theorem form != sqrt(lambda) u at ' + i + ',' + j); return;
                    }
                }
            }
        })();

        /* T8: closed-form PCA on an analytic case: axis-stretched data
         * rotated by a known angle; recover eigenvalues and direction */
        (function () {
            var rng = createRng(13);
            var th = 0.6, ct = Math.cos(th), st = Math.sin(th);
            var pts = [];
            for (var i = 0; i < 400; i++) {
                var g1 = 3 * gaussian(rng), g2 = 0.5 * gaussian(rng);
                pts.push([ct * g1 - st * g2, st * g1 + ct * g2]);
            }
            var p = pca2(pts);
            if (!(p.values[0] > p.values[1])) failures.push('T8 eigenvalues not sorted');
            if (Math.abs(p.values[0] - 9) > 0.9) failures.push('T8 lambda1 far from 9: ' + p.values[0]);
            if (Math.abs(p.values[1] - 0.25) > 0.06) failures.push('T8 lambda2 far from 0.25: ' + p.values[1]);
            var align = Math.abs(p.vectors[0][0] * ct + p.vectors[0][1] * st);
            if (align < 0.999) failures.push('T8 v1 misaligned: |cos| = ' + align);
            /* score variances equal eigenvalues (1/N convention) */
            var n = pts.length, s1 = 0, s2 = 0;
            for (i = 0; i < n; i++) { s1 += p.scores[i][0] * p.scores[i][0]; s2 += p.scores[i][1] * p.scores[i][1]; }
            if (Math.abs(s1 / n - p.values[0]) > 1e-9 * Math.max(1, p.values[0])) failures.push('T8 score variance != lambda1');
            if (Math.abs(s2 / n - p.values[1]) > 1e-9) failures.push('T8 score variance != lambda2');
        })();

        /* T9: EQUIVALENCE — linear-kernel KPCA training scores must
         * equal PCA scores up to per-component sign; eigenvalues relate
         * by lambda_K = N lambda_cov. The two computation paths verify
         * each other. */
        (function () {
            var rng = createRng(17);
            var d = generateData('blobs', 0.1, 60, rng);
            var n = d.points.length;
            var Kt = centerGram(gramMatrix('linear', {}, d.points));
            var e = topKEigen(Kt, 2, createRng(6));
            if (!e.converged) { failures.push('T9 eig not converged'); return; }
            var sc = kpcaScores(Kt, e.values, e.vectors);
            var p = pca2(d.points);
            for (var j = 0; j < 2; j++) {
                if (Math.abs(e.values[j] - n * p.values[j]) > 1e-6 * Math.max(1, e.values[j])) {
                    failures.push('T9 lambda_K != N lambda_cov at ' + j);
                }
                /* fix sign by first sizable entry */
                var sign = 0;
                for (var i = 0; i < n; i++) {
                    if (Math.abs(p.scores[i][j]) > 1e-6) {
                        sign = (p.scores[i][j] > 0) === (sc.scores[i][j] > 0) ? 1 : -1;
                        break;
                    }
                }
                if (sign === 0) { failures.push('T9 degenerate scores'); return; }
                for (i = 0; i < n; i++) {
                    if (Math.abs(sc.scores[i][j] * sign - p.scores[i][j]) > 1e-6 * Math.max(1, Math.abs(p.scores[i][j]))) {
                        failures.push('T9 KPCA(linear) != PCA at point ' + i + ' comp ' + j); return;
                    }
                }
            }
        })();

        /* T10: TARGETS pin + generator invariants at noise 0 */
        (function () {
            if (TARGETS.circles.rInner !== 0.6 || TARGETS.circles.rOuter !== 1.5 ||
                TARGETS.moons.radius !== 1.0 || TARGETS.moons.offsetX !== 1.0 ||
                TARGETS.moons.offsetY !== 0.5 || TARGETS.blobs.std !== 0.45 ||
                TARGETS.spiral.a !== 0.35) {
                failures.push('T10 TARGETS drifted');
            }
            var rng = createRng(3);
            var d = generateData('circles', 0, 50, rng);
            if (d.points.length !== 50 || d.labels.length !== 50) failures.push('T10 size wrong');
            for (var i = 0; i < 50; i++) {
                var r = Math.hypot(d.points[i][0], d.points[i][1]);
                var want = d.labels[i] === 0 ? TARGETS.circles.rInner : TARGETS.circles.rOuter;
                if (Math.abs(r - want) > 1e-9) { failures.push('T10 circle radius rule violated'); break; }
            }
            /* isotropic normalization: zero mean, mean ||x||^2 = 2 (two
             * coordinates, one shared scale), shape anisotropy preserved */
            var nrm = normalizeIsotropic(d.points);
            var sx = 0, sy = 0, s2 = 0;
            for (i = 0; i < 50; i++) {
                sx += nrm.normalized[i][0]; sy += nrm.normalized[i][1];
                s2 += nrm.normalized[i][0] * nrm.normalized[i][0] +
                      nrm.normalized[i][1] * nrm.normalized[i][1];
            }
            if (Math.abs(sx / 50) > 1e-9 || Math.abs(sy / 50) > 1e-9) failures.push('T10 normalize mean != 0');
            if (Math.abs(s2 / 50 - 2) > 1e-9) failures.push('T10 normalize mean radius^2 != 2: ' + (s2 / 50));
            var pRaw = pca2(d.points), pNrm = pca2(nrm.normalized);
            var ratioRaw = pRaw.values[1] / pRaw.values[0];
            var ratioNrm = pNrm.values[1] / pNrm.values[0];
            if (Math.abs(ratioRaw - ratioNrm) > 1e-9) failures.push('T10 normalize distorted shape');

            var dm = generateData('moons', 0, 50, rng);
            for (i = 0; i < 50; i++) {
                var x = dm.points[i][0], y = dm.points[i][1];
                var ok;
                if (dm.labels[i] === 0) {
                    ok = Math.abs(Math.hypot(x, y) - 1) < 1e-9 && y >= -1e-12;
                } else {
                    ok = Math.abs(Math.hypot(x - 1, y - 0.5) - 1) < 1e-9 && y <= 0.5 + 1e-12;
                }
                if (!ok) { failures.push('T10 moons rule violated'); break; }
            }
        })();

        /* T13: the demo's pedagogical claims, as tested facts.
         * Separability metric: project scores onto the class-mean
         * difference direction and take the best threshold accuracy.
         * (a) circles: PCA stays near chance; RBF KPCA (gamma 3) makes
         *     the classes separable in the top components, visibly so
         *     already in the plotted 2-component view;
         * (b) moons: a single RBF KPCA component (gamma 10) separates
         *     the classes while no PCA component does. */
        (function () {
            function meanDiffAcc(scores, labels, dims) {
                var n = scores.length;
                var m0 = [], m1 = [], n0 = 0, n1 = 0, c, i;
                for (c = 0; c < dims; c++) { m0.push(0); m1.push(0); }
                for (i = 0; i < n; i++) {
                    var m = labels[i] === 0 ? m0 : m1;
                    if (labels[i] === 0) n0++; else n1++;
                    for (c = 0; c < dims; c++) m[c] += scores[i][c];
                }
                for (c = 0; c < dims; c++) { m0[c] /= n0; m1[c] /= n1; }
                var vals = [];
                for (i = 0; i < n; i++) {
                    var v = 0;
                    for (c = 0; c < dims; c++) v += scores[i][c] * (m1[c] - m0[c]);
                    vals.push({ v: v, l: labels[i] });
                }
                vals.sort(function (a, b) { return a.v - b.v; });
                var best = 0;
                for (var cut = 0; cut <= n; cut++) {
                    var correct = 0;
                    for (i = 0; i < n; i++) {
                        if ((i < cut ? 0 : 1) === vals[i].l) correct++;
                    }
                    best = Math.max(best, correct / n, 1 - correct / n);
                }
                return best;
            }
            function thresholdAcc(scores, labels, comp) {
                var one = [];
                for (var i = 0; i < scores.length; i++) one.push([scores[i][comp]]);
                return meanDiffAcc(one, labels, 1);
            }

            var d = generateData('circles', 0.08, 150, createRng(99));
            var p = pca2(d.points);
            if (meanDiffAcc(p.scores, d.labels, 2) > 0.8) {
                failures.push('T13a PCA unexpectedly separates circles');
            }
            var Kt = centerGram(gramMatrix('rbf', { gamma: 3 }, d.points));
            var e = topKEigen(Kt, 4, createRng(3));
            if (!e.converged) { failures.push('T13a eig not converged'); return; }
            var sc = kpcaScores(Kt, e.values, e.vectors);
            if (meanDiffAcc(sc.scores, d.labels, 4) < 0.97) {
                failures.push('T13a KPCA 4D separability below 0.97');
            }
            if (meanDiffAcc(sc.scores, d.labels, 2) < 0.9) {
                failures.push('T13a KPCA 2D separability below 0.9');
            }

            var dm = generateData('moons', 0.08, 150, createRng(55));
            var pm = pca2(dm.points);
            if (Math.max(thresholdAcc(pm.scores, dm.labels, 0),
                         thresholdAcc(pm.scores, dm.labels, 1)) > 0.85) {
                failures.push('T13b PCA unexpectedly separates moons');
            }
            var Km = centerGram(gramMatrix('rbf', { gamma: 10 }, dm.points));
            var em = topKEigen(Km, 4, createRng(3));
            if (!em.converged) { failures.push('T13b eig not converged'); return; }
            var sm = kpcaScores(Km, em.values, em.vectors);
            if (Math.max(thresholdAcc(sm.scores, dm.labels, 0),
                         thresholdAcc(sm.scores, dm.labels, 1)) < 0.95) {
                failures.push('T13b KPCA component did not separate moons');
            }
        })();

        /* T11: linear autoencoder — the page theorem as a tested fact.
         * (a) gradient matches finite differences;
         * (b) trained W2 W1 converges to the top-1 PCA projector v1 v1^top;
         * (c) reconstruction MSE equals the discarded eigenvalue lambda2. */
        (function () {
            var rng = createRng(23);
            var th = 0.6, ct = Math.cos(th), st = Math.sin(th);
            var raw = [];
            for (var i = 0; i < 120; i++) {
                var g1 = 2.0 * gaussian(rng), g2 = 0.6 * gaussian(rng);
                raw.push([ct * g1 - st * g2, st * g1 + ct * g2]);
            }
            var p = pca2(raw);
            /* center the data (the theorem's setting) */
            var data = raw.map(function (x) { return [x[0] - p.mean[0], x[1] - p.mean[1]]; });

            var m = linAeCreate(createRng(29));
            /* (a) finite differences on all 4 parameters */
            var g = linAeGradient(m, data);
            var flat = [m.W1, m.W2], gf = [g.g1, g.g2];
            for (var b = 0; b < 2; b++) {
                for (var j = 0; j < 2; j++) {
                    var orig = flat[b][j], eps = 1e-6;
                    flat[b][j] = orig + eps; var Lp = linAeLoss(m, data);
                    flat[b][j] = orig - eps; var Lm = linAeLoss(m, data);
                    flat[b][j] = orig;
                    var num = (Lp - Lm) / (2 * eps);
                    if (Math.abs(num - gf[b][j]) / Math.max(1e-8, Math.abs(num) + Math.abs(gf[b][j])) > 1e-5) {
                        failures.push('T11a gradient check failed');
                    }
                }
            }
            /* (b),(c) train and compare with PCA */
            var guard = 0;
            for (var it = 0; it < 20000; it++) {
                linAeStep(m, data, 0.05);
                guard++;
            }
            if (guard !== 20000) failures.push('T11 training loop anomaly');
            var P = linAeProduct(m);
            var v1 = p.vectors[0];
            var err = 0;
            for (var r = 0; r < 2; r++) {
                for (var c = 0; c < 2; c++) {
                    var d2 = P[r][c] - v1[r] * v1[c];
                    err += d2 * d2;
                }
            }
            err = Math.sqrt(err);
            if (err > 1e-3) failures.push('T11b W2W1 far from PCA projector: ' + err);
            var mse = linAeLoss(m, data);
            if (Math.abs(mse - p.values[1]) > 1e-3 * Math.max(1, p.values[1])) {
                failures.push('T11c MSE != discarded lambda2: ' + mse + ' vs ' + p.values[1]);
            }
        })();

        /* T12: nonlinear autoencoder.
         * (a) full gradient matches finite differences (tanh: smooth);
         * (b) on circles, the trained tanh AE reconstructs strictly
         *     better than the trained linear AE (the page's
         *     "strictly more powerful" claim, on a seeded instance). */
        (function () {
            var rng = createRng(41);
            var d = generateData('circles', 0.05, 80, rng);
            var nrm = normalizeIsotropic(d.points);
            var data = nrm.normalized;

            var m = nlAeCreate(8, createRng(43));
            var gFlat = nlAeGradFlat(m, data);
            var params = nlAeParams(m);
            var rc = createRng(47);
            for (var t = 0; t < 20; t++) {
                var idx = Math.floor(rc() * params.length);
                var orig = params[idx], eps = 1e-6;
                params[idx] = orig + eps; nlAeSetParams(m, params);
                var Lp = nlAeLoss(m, data);
                params[idx] = orig - eps; nlAeSetParams(m, params);
                var Lm = nlAeLoss(m, data);
                params[idx] = orig; nlAeSetParams(m, params);
                var num = (Lp - Lm) / (2 * eps);
                var denom = Math.max(1e-8, Math.abs(num) + Math.abs(gFlat[idx]));
                if (Math.abs(num - gFlat[idx]) / denom > 1e-5) {
                    failures.push('T12a fd check failed at param ' + idx); break;
                }
            }

            var lin = linAeCreate(createRng(53));
            var guard1 = 0;
            for (var i1 = 0; i1 < 4000; i1++) { linAeStep(lin, data, 0.05); guard1++; }
            var nl = nlAeCreate(8, createRng(43));
            var guard2 = 0;
            for (var i2 = 0; i2 < 4000; i2++) { nlAeStep(nl, data, 0.2); guard2++; }
            if (guard1 !== 4000 || guard2 !== 4000) failures.push('T12 loop anomaly');
            var mseLin = linAeLoss(lin, data);
            var mseNl = nlAeLoss(nl, data);
            if (!(mseNl < 0.7 * mseLin)) {
                failures.push('T12b nonlinear AE did not beat linear: ' + mseNl + ' vs ' + mseLin);
            }
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        createRng: createRng,
        gaussian: gaussian,
        kernelValue: kernelValue,
        gramMatrix: gramMatrix,
        centerGram: centerGram,
        trace: trace,
        orthonormalize: orthonormalize,
        smallSymmetricEig: smallSymmetricEig,
        eigenResidual: eigenResidual,
        topKEigen: topKEigen,
        kpcaScores: kpcaScores,
        pca2: pca2,
        TARGETS: TARGETS,
        generateData: generateData,
        normalizeIsotropic: normalizeIsotropic,
        linAeCreate: linAeCreate,
        linAeReconstruct: linAeReconstruct,
        linAeLoss: linAeLoss,
        linAeGradient: linAeGradient,
        linAeStep: linAeStep,
        linAeProduct: linAeProduct,
        nlAeCreate: nlAeCreate,
        nlAeForward: nlAeForward,
        nlAeLoss: nlAeLoss,
        nlAeGradient: nlAeGradient,
        nlAeStep: nlAeStep,
        nlAeParams: nlAeParams,
        nlAeSetParams: nlAeSetParams,
        nlAeGradFlat: nlAeGradFlat,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = KpcaCore; }
/* ============================================================
 * Kernel PCA & Autoencoder Demo — UI layer (v2)
 * Self-contained dark island. Depends only on KpcaCore above.
 * Refuses to render if KpcaCore.runSelfTests() fails.
 * One dataset flows through three lenses: linear PCA (closed form),
 * kernel PCA (top-k eigenpairs of the double-centered Gram matrix
 * with a residual certificate), and autoencoders (linear = the page's
 * PCA-equivalence theorem, tanh = strictly more powerful).
 * Colors mark the GENERATING class only — none of the methods ever
 * sees a label. No dataset-specific parameter overrides.
 * ============================================================ */
(function () {
    'use strict';

    function initKpcaDemo() {
        var container = document.getElementById('kernel_pca_visualizer');
        if (!container) return;
        if (container.dataset.kpcaInit) return;   /* idempotency guard */
        container.dataset.kpcaInit = '1';

        var testResult = KpcaCore.runSelfTests();
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
            cls: ['#4da3ff', '#ff6b5e', '#ffd166'],
            recon: 'rgba(255,255,255,0.75)',
            aeLine: '#2ecc71',
            pcaLine: '#c084fc',
            lossCurve: '#4da3ff',
            lambdaRef: '#c084fc',
            barPca: '#4da3ff',
            barKpca: '#2ecc71',
            warn: '#ffb3ab'
        };

        var G_STOPS = [0.1, 0.3, 1, 3, 10, 30];
        var rng = KpcaCore.createRng((Date.now() ^ 0x3D91A7E5) >>> 0);
        var params = {
            dataset: 'circles', kernel: 'rbf', gamma: 3, degree: 2,
            noise: 0.08, n: 150
        };
        var data = KpcaCore.generateData(params.dataset, params.noise, params.n, rng);
        var pcaResult = null;      /* { values, vectors, mean, scores } */
        var kpcaResult = null;     /* { eig, scores, keptComponents, trace } */

        /* autoencoder state (trained on isotropically normalized data) */
        var aeNorm = KpcaCore.normalizeIsotropic(data.points);
        var aeLin = null, aeNl = null;      /* models or null */
        var aeKind = 'linear';
        var aeIter = { linear: 0, nonlinear: 0 };
        var aeHistory = { linear: [], nonlinear: [] };   /* { iter, mse } */
        var isTraining = false, stopRequested = false;

        /* ---------- DOM ---------- */
        var style = document.createElement('style');
        style.textContent = [
            '#kernel_pca_visualizer .kpca-root{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:10px;padding:18px;color:' + C.text + ';font-family:"Segoe UI",system-ui,sans-serif;}',
            '#kernel_pca_visualizer .kpca-grid{display:flex;flex-direction:column;gap:16px;}',
            '@media (min-width:992px){#kernel_pca_visualizer .kpca-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start;}}',
            '#kernel_pca_visualizer .kpca-card{background:' + C.panel + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:14px;}',
            '#kernel_pca_visualizer .kpca-card h3{margin:0 0 10px 0;font-size:1.02rem;color:' + C.text + ';font-weight:600;}',
            '#kernel_pca_visualizer .kpca-card h4{margin:0 0 6px 0;font-size:0.88rem;color:' + C.muted + ';font-weight:600;}',
            '#kernel_pca_visualizer .kpca-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
            '#kernel_pca_visualizer canvas{display:block;width:100%;height:auto;border-radius:6px;}',
            '#kernel_pca_visualizer .kpca-tabs{display:flex;gap:8px;margin-bottom:14px;}',
            '#kernel_pca_visualizer .kpca-tab{padding:8px 16px;border:1px solid ' + C.panelBorder + ';border-radius:6px;background:rgba(255,255,255,0.06);color:' + C.muted + ';cursor:pointer;font-size:0.9rem;}',
            '#kernel_pca_visualizer .kpca-tab.active{background:#2f7fd6;color:#fff;border-color:#2f7fd6;}',
            '#kernel_pca_visualizer .kpca-quad{display:grid;grid-template-columns:1fr;gap:14px;}',
            '@media (min-width:768px){#kernel_pca_visualizer .kpca-quad{grid-template-columns:1fr 1fr;}}',
            '#kernel_pca_visualizer .kpca-legend{display:flex;flex-wrap:wrap;gap:10px 14px;justify-content:center;margin-top:10px;font-size:0.82rem;color:' + C.muted + ';}',
            '#kernel_pca_visualizer .kpca-legend span.pt{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;}',
            '#kernel_pca_visualizer .kpca-legend span.sw{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:3px;}',
            '#kernel_pca_visualizer .kpca-legend span.ring{display:inline-block;width:9px;height:9px;border:1.5px solid ' + C.recon + ';margin-right:5px;vertical-align:-1px;}',
            '#kernel_pca_visualizer .kpca-ctl{margin-bottom:14px;}',
            '#kernel_pca_visualizer .kpca-ctl label{display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:6px;color:' + C.text + ';}',
            '#kernel_pca_visualizer .kpca-ctl label .val{font-family:monospace;color:' + C.muted + ';}',
            '#kernel_pca_visualizer input[type=range]{width:100%;accent-color:#4da3ff;}',
            '#kernel_pca_visualizer select{width:100%;background:#1a2534;color:' + C.text + ';border:1px solid ' + C.panelBorder + ';border-radius:5px;padding:6px 8px;font-size:0.88rem;}',
            '#kernel_pca_visualizer .kpca-btn{width:100%;padding:10px 0;border:none;border-radius:6px;font-size:0.95rem;cursor:pointer;margin-bottom:8px;color:#fff;}',
            '#kernel_pca_visualizer .kpca-btn.primary{background:#2f7fd6;}',
            '#kernel_pca_visualizer .kpca-btn.primary:hover{background:#3b8de4;}',
            '#kernel_pca_visualizer .kpca-btn.primary.stop{background:#c0564a;}',
            '#kernel_pca_visualizer .kpca-btn.sec{background:rgba(255,255,255,0.10);color:' + C.text + ';}',
            '#kernel_pca_visualizer .kpca-btn.sec:hover{background:rgba(255,255,255,0.16);}',
            '#kernel_pca_visualizer .kpca-metrics{font-family:monospace;font-size:0.85rem;line-height:1.9;}',
            '#kernel_pca_visualizer .kpca-metrics .row{display:flex;justify-content:space-between;}',
            '#kernel_pca_visualizer .kpca-status{color:' + C.muted + ';font-size:0.84rem;margin-top:10px;line-height:1.5;}',
            '#kernel_pca_visualizer .kpca-status.warn{color:' + C.warn + ';}'
        ].join('\n');
        container.appendChild(style);

        var root = document.createElement('div');
        root.className = 'kpca-root';
        root.innerHTML =
            '<div class="kpca-grid">' +
            '  <div class="kpca-main">' +
            '    <div class="kpca-tabs">' +
            '      <button class="kpca-tab active" id="kpca-tab-kpca">Kernel PCA</button>' +
            '      <button class="kpca-tab" id="kpca-tab-ae">Autoencoder</button>' +
            '    </div>' +
            '    <div id="kpca-pane-kpca">' +
            '      <div class="kpca-card">' +
            '        <div class="kpca-quad">' +
            '          <div><h4>Original data</h4><canvas id="kpca-orig"></canvas></div>' +
            '          <div><h4>Linear PCA scores (components 1, 2)</h4><canvas id="kpca-pca"></canvas></div>' +
            '          <div><h4>Kernel PCA scores (components 1, 2)</h4><canvas id="kpca-kpca"></canvas></div>' +
            '          <div><h4>Explained variance ratios</h4><canvas id="kpca-var"></canvas></div>' +
            '        </div>' +
            '        <div class="kpca-legend" id="kpca-legend-main"></div>' +
            '      </div>' +
            '    </div>' +
            '    <div id="kpca-pane-ae" style="display:none;">' +
            '      <div class="kpca-card">' +
            '        <div class="kpca-quad">' +
            '          <div><h4>Data &amp; reconstruction</h4><canvas id="kpca-recon"></canvas></div>' +
            '          <div><h4>1D latent values</h4><canvas id="kpca-latent"></canvas></div>' +
            '        </div>' +
            '        <div style="margin-top:14px;"><h4>Reconstruction error (mean squared)</h4><canvas id="kpca-loss"></canvas></div>' +
            '        <div class="kpca-legend">' +
            '          <span><span class="pt" style="background:' + C.cls[0] + '"></span>Class 0</span>' +
            '          <span><span class="pt" style="background:' + C.cls[1] + '"></span>Class 1</span>' +
            '          <span><span class="pt" style="background:' + C.cls[2] + '"></span>Class 2 (blobs)</span>' +
            '          <span><span class="ring"></span>Reconstruction</span>' +
            '          <span><span class="sw" style="background:' + C.aeLine + '"></span>Linear AE subspace</span>' +
            '          <span><span class="sw" style="background:' + C.pcaLine + '"></span>PCA PC1 (dashed)</span>' +
            '          <span><span class="sw" style="background:' + C.lambdaRef + '"></span>&lambda;&#8322; reference (dashed, loss panel)</span>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="kpca-side">' +
            '    <div class="kpca-card">' +
            '      <div class="kpca-ctl"><label for="kpca-dataset">Dataset</label>' +
            '        <select id="kpca-dataset"><option value="circles">Concentric circles</option><option value="moons">Two moons</option><option value="blobs">Gaussian blobs</option><option value="spiral">Spiral</option></select></div>' +
            '      <div class="kpca-ctl"><label for="kpca-kernel">Kernel (KPCA)</label>' +
            '        <select id="kpca-kernel"><option value="linear">Linear</option><option value="rbf" selected>RBF (Gaussian)</option><option value="poly">Polynomial</option></select></div>' +
            '      <div class="kpca-ctl" id="kpca-gamma-row"><label>&gamma; <span class="val" id="kpca-g-val">3</span></label>' +
            '        <input type="range" id="kpca-g" min="0" max="5" step="1" value="3"></div>' +
            '      <div class="kpca-ctl" id="kpca-degree-row" style="display:none;"><label>Polynomial degree <span class="val" id="kpca-deg-val">2</span></label>' +
            '        <input type="range" id="kpca-deg" min="2" max="5" step="1" value="2"></div>' +
            '      <div class="kpca-ctl"><label>Coordinate noise <span class="val" id="kpca-noise-val">0.08</span></label>' +
            '        <input type="range" id="kpca-noise" min="0" max="0.3" step="0.02" value="0.08"></div>' +
            '      <div class="kpca-ctl"><label>Sample size <span class="val" id="kpca-n-val">150</span></label>' +
            '        <input type="range" id="kpca-n" min="50" max="300" step="50" value="150"></div>' +
            '      <button id="kpca-compute" class="kpca-btn primary">Compute PCA + Kernel PCA</button>' +
            '      <button id="kpca-newdata" class="kpca-btn sec">New Data</button>' +
            '    </div>' +
            '    <div class="kpca-card" style="margin-top:16px;" id="kpca-ae-card">' +
            '      <h3>Autoencoder</h3>' +
            '      <div class="kpca-ctl"><label for="kpca-ae-kind">Model</label>' +
            '        <select id="kpca-ae-kind"><option value="linear">Linear (2 &rarr; 1 &rarr; 2, no bias)</option><option value="nonlinear">Nonlinear (tanh, 2-8-1-8-2)</option></select></div>' +
            '      <button id="kpca-train" class="kpca-btn primary">Train (3000 iterations)</button>' +
            '      <button id="kpca-ae-reset" class="kpca-btn sec">Reset Autoencoders</button>' +
            '    </div>' +
            '    <div class="kpca-card" style="margin-top:16px;">' +
            '      <h3>Metrics</h3>' +
            '      <div class="kpca-metrics" id="kpca-metrics"></div>' +
            '      <div class="kpca-status" id="kpca-status"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        container.appendChild(root);

        var legendMain = document.getElementById('kpca-legend-main');
        legendMain.innerHTML =
            '<span><span class="pt" style="background:' + C.cls[0] + '"></span>Class 0</span>' +
            '<span><span class="pt" style="background:' + C.cls[1] + '"></span>Class 1</span>' +
            '<span><span class="pt" style="background:' + C.cls[2] + '"></span>Class 2 (blobs)</span>' +
            '<span>Colors mark the generating class only &mdash; PCA and KPCA never see them</span>';

        var metricsEl = document.getElementById('kpca-metrics');
        var statusEl = document.getElementById('kpca-status');
        var computeBtn = document.getElementById('kpca-compute');
        var trainBtn = document.getElementById('kpca-train');

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

        /* ---------- shared isotropic scatter ----------
         * pts: array of [x, y]; opts.lines: [{a,b,c,color,dash}] for
         * lines a x + b y = c; opts.recon: paired points drawn as
         * hollow squares; opts.placeholder: message when pts is null */
        function drawScatter(canvasId, pts, labels, opts) {
            opts = opts || {};
            var canvas = document.getElementById(canvasId);
            var s = sizeCanvas(canvas, 0.85);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            if (!pts) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(opts.placeholder || 'Press Compute', s.w / 2, s.h / 2);
                return;
            }
            var m = { l: 12, r: 12, t: 10, b: 12 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            var maxAbs = 1e-9, i;
            for (i = 0; i < pts.length; i++) {
                maxAbs = Math.max(maxAbs, Math.abs(pts[i][0]), Math.abs(pts[i][1]));
            }
            if (opts.recon) {
                for (i = 0; i < opts.recon.length; i++) {
                    maxAbs = Math.max(maxAbs, Math.abs(opts.recon[i][0]), Math.abs(opts.recon[i][1]));
                }
            }
            var half = maxAbs * 1.1;
            var scale = Math.min(pw, ph) / (2 * half);   /* isotropic */
            var cx = m.l + pw / 2, cy = m.t + ph / 2;
            function X(x) { return cx + x * scale; }
            function Y(y) { return cy - y * scale; }

            /* axes through origin */
            ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(m.l + pw, Y(0)); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(X(0), m.t); ctx.lineTo(X(0), m.t + ph); ctx.stroke();
            /* scale marker: one unit tick */
            ctx.fillStyle = C.muted; ctx.font = '10px monospace'; ctx.textAlign = 'center';
            var unit = Math.pow(10, Math.floor(Math.log10(half)));
            if (half / unit < 2) unit /= 2;
            ctx.fillText(String(unit), X(unit), Y(0) + 12);
            ctx.beginPath(); ctx.moveTo(X(unit), Y(0) - 3); ctx.lineTo(X(unit), Y(0) + 3); ctx.stroke();

            ctx.save();
            ctx.beginPath(); ctx.rect(m.l, m.t, pw, ph); ctx.clip();
            (opts.lines || []).forEach(function (L) {
                ctx.strokeStyle = L.color; ctx.lineWidth = 1.8;
                ctx.setLineDash(L.dash ? [6, 4] : []);
                ctx.beginPath();
                if (Math.abs(L.b) > 1e-12) {
                    ctx.moveTo(X(-half * 2), Y((L.c - L.a * (-half * 2)) / L.b));
                    ctx.lineTo(X(half * 2), Y((L.c - L.a * (half * 2)) / L.b));
                } else if (Math.abs(L.a) > 1e-12) {
                    ctx.moveTo(X(L.c / L.a), m.t); ctx.lineTo(X(L.c / L.a), m.t + ph);
                }
                ctx.stroke();
            });
            ctx.setLineDash([]);
            ctx.restore();

            for (i = 0; i < pts.length; i++) {
                ctx.fillStyle = C.cls[labels[i] % C.cls.length];
                ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(X(pts[i][0]), Y(pts[i][1]), 3.5, 0, 2 * Math.PI);
                ctx.fill(); ctx.stroke();
            }
            if (opts.recon) {
                ctx.strokeStyle = C.recon; ctx.lineWidth = 1.4;
                for (i = 0; i < opts.recon.length; i++) {
                    ctx.strokeRect(X(opts.recon[i][0]) - 3, Y(opts.recon[i][1]) - 3, 6, 6);
                }
            }
        }

        /* ---------- variance bars ---------- */
        function drawVarianceBars() {
            var canvas = document.getElementById('kpca-var');
            var s = sizeCanvas(canvas, 0.85);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            if (!pcaResult || !kpcaResult) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Compute', s.w / 2, s.h / 2);
                return;
            }
            var m = { l: 36, r: 10, t: 16, b: 34 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            var pTot = pcaResult.values[0] + pcaResult.values[1];
            var pR = pcaResult.values.map(function (v) { return pTot > 0 ? v / pTot : 0; });
            var kR = kpcaResult.eig.values.map(function (v) {
                return kpcaResult.trace > 0 ? Math.max(0, v) / kpcaResult.trace : 0;
            });
            var bars = [];
            pR.forEach(function (r, i) { bars.push({ v: r, color: C.barPca, label: 'P' + (i + 1) }); });
            kR.forEach(function (r, i) { bars.push({ v: r, color: C.barKpca, label: 'K' + (i + 1) }); });
            var bw = pw / bars.length;
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '9px monospace'; ctx.textAlign = 'right';
            [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
                var y = m.t + (1 - t) * ph;
                ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(m.l + pw, y); ctx.stroke();
                ctx.fillText(Math.round(t * 100) + '%', m.l - 4, y + 3);
            });
            ctx.textAlign = 'center';
            bars.forEach(function (b, i) {
                var x = m.l + i * bw;
                var h = b.v * ph;
                ctx.fillStyle = b.color;
                ctx.fillRect(x + bw * 0.15, m.t + ph - h, bw * 0.7, h);
                ctx.fillStyle = C.muted; ctx.font = '10px monospace';
                ctx.fillText(b.label, x + bw / 2, s.h - 20);
                ctx.fillText((b.v * 100).toFixed(0) + '%', x + bw / 2, m.t + ph - h - 4);
            });
            ctx.fillStyle = C.muted; ctx.font = '10px sans-serif';
            ctx.fillText('P = PCA (of 2 total), K = Kernel PCA (of trace)', m.l + pw / 2, s.h - 6);
        }

        /* ---------- autoencoder panels ---------- */
        function activeAe() { return aeKind === 'linear' ? aeLin : aeNl; }
        function aeReconstructAll(model) {
            var out = [];
            for (var i = 0; i < aeNorm.normalized.length; i++) {
                var r = aeKind === 'linear'
                    ? KpcaCore.linAeReconstruct(model, aeNorm.normalized[i])
                    : KpcaCore.nlAeForward(model, aeNorm.normalized[i]).out;
                /* back to original coordinates (exact isotropic inverse) */
                out.push([r[0] * aeNorm.scale + aeNorm.mean[0],
                          r[1] * aeNorm.scale + aeNorm.mean[1]]);
            }
            return out;
        }
        function aeLatentAll(model) {
            var out = [];
            for (var i = 0; i < aeNorm.normalized.length; i++) {
                var x = aeNorm.normalized[i];
                out.push(aeKind === 'linear'
                    ? model.W1[0] * x[0] + model.W1[1] * x[1]
                    : KpcaCore.nlAeForward(model, x).latent);
            }
            return out;
        }

        function drawReconPanel() {
            var model = activeAe();
            var lines = [];
            var pNorm = KpcaCore.pca2(aeNorm.normalized);
            if (aeKind === 'linear') {
                /* PC1 through the data mean in ORIGINAL coordinates */
                var v = pNorm.vectors[0];
                lines.push({ a: -v[1], b: v[0],
                    c: -v[1] * aeNorm.mean[0] + v[0] * aeNorm.mean[1],
                    color: C.pcaLine, dash: true });
                if (model) {
                    /* the linear AE's decoder direction W2 spans its subspace */
                    var w = model.W2;
                    var nw = Math.hypot(w[0], w[1]);
                    if (nw > 1e-9) {
                        lines.push({ a: -w[1] / nw, b: w[0] / nw,
                            c: (-w[1] / nw) * aeNorm.mean[0] + (w[0] / nw) * aeNorm.mean[1],
                            color: C.aeLine, dash: false });
                    }
                }
            }
            drawScatter('kpca-recon', data.points, data.labels, {
                recon: model ? aeReconstructAll(model) : null,
                lines: lines,
                placeholder: 'Press Train'
            });
        }

        function drawLatentPanel() {
            var canvas = document.getElementById('kpca-latent');
            var s = sizeCanvas(canvas, 0.85);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            var model = activeAe();
            if (!model) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Train', s.w / 2, s.h / 2);
                return;
            }
            var lat = aeLatentAll(model);
            var lo = Math.min.apply(null, lat), hi = Math.max.apply(null, lat);
            if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
            var m = { l: 16, r: 16, t: 14, b: 22 };
            var pw = s.w - m.l - m.r;
            var midY = m.t + (s.h - m.t - m.b) / 2;
            ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(m.l, midY); ctx.lineTo(m.l + pw, midY); ctx.stroke();
            ctx.fillStyle = C.muted; ctx.font = '10px monospace'; ctx.textAlign = 'center';
            ctx.fillText(lo.toFixed(2), m.l, s.h - 6);
            ctx.fillText(hi.toFixed(2), m.l + pw, s.h - 6);
            /* jitter rows by class for readability (deterministic) */
            for (var i = 0; i < lat.length; i++) {
                var x = m.l + (lat[i] - lo) / (hi - lo) * pw;
                var y = midY + (data.labels[i] - 0.5) * 26;
                ctx.fillStyle = C.cls[data.labels[i] % C.cls.length];
                ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            }
        }

        function drawLossPanel() {
            var canvas = document.getElementById('kpca-loss');
            var s = sizeCanvas(canvas, 0.4);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            var hist = aeHistory[aeKind];
            var m = { l: 46, r: 10, t: 10, b: 22 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            if (hist.length < 2) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Train', s.w / 2, s.h / 2);
                return;
            }
            var lambda2 = KpcaCore.pca2(aeNorm.normalized).values[1];
            var maxV = lambda2, i;
            for (i = 0; i < hist.length; i++) maxV = Math.max(maxV, hist[i].mse);
            maxV *= 1.08;
            var minIt = hist[0].iter, maxIt = hist[hist.length - 1].iter;
            function Xc(it) { return m.l + (it - minIt) / Math.max(1, maxIt - minIt) * pw; }
            function Yc(v) { return m.t + (1 - v / maxV) * ph; }
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '9px monospace'; ctx.textAlign = 'right';
            for (var k = 0; k <= 3; k++) {
                var vv = maxV * k / 3;
                ctx.beginPath(); ctx.moveTo(m.l, Yc(vv)); ctx.lineTo(m.l + pw, Yc(vv)); ctx.stroke();
                ctx.fillText(vv.toFixed(2), m.l - 4, Yc(vv) + 3);
            }
            ctx.textAlign = 'center';
            ctx.fillText(String(maxIt) + ' it', m.l + pw - 16, s.h - 6);
            /* lambda2 reference: the 1D-PCA reconstruction error (theorem) */
            ctx.strokeStyle = C.lambdaRef; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(m.l, Yc(lambda2)); ctx.lineTo(m.l + pw, Yc(lambda2)); ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = C.lossCurve; ctx.lineWidth = 1.8; ctx.beginPath();
            for (i = 0; i < hist.length; i++) {
                if (i === 0) ctx.moveTo(Xc(hist[i].iter), Yc(hist[i].mse));
                else ctx.lineTo(Xc(hist[i].iter), Yc(hist[i].mse));
            }
            ctx.stroke();
        }

        /* ---------- metrics & status ---------- */
        function fmtNum(v) {
            if (!isFinite(v)) return '\u2014';
            var av = Math.abs(v);
            if (av !== 0 && (av >= 1e4 || av < 1e-3)) return v.toExponential(2);
            return v.toFixed(4);
        }

        function renderMetrics() {
            var html = '';
            if (kpcaResult) {
                var e = kpcaResult.eig;
                html +=
                    '<div class="row"><span>Eig iterations</span><span>' + e.iterations + '</span></div>' +
                    '<div class="row"><span>Residual &#8214;K&#771;u &minus; &lambda;u&#8214;</span><span>' + fmtNum(e.residual) + '</span></div>' +
                    '<div class="row"><span>Certified converged</span><span>' + (e.converged ? 'yes' : 'NO') + '</span></div>' +
                    '<div class="row"><span>&lambda;&#8321; / trace</span><span>' + (kpcaResult.trace > 0 ? (Math.max(0, e.values[0]) / kpcaResult.trace * 100).toFixed(1) + '%' : '\u2014') + '</span></div>' +
                    '<div class="row"><span>Components kept</span><span>' + kpcaResult.keptComponents + '/4</span></div>';
            } else {
                html += '<div class="row"><span>Kernel PCA</span><span>not computed</span></div>';
            }
            if (pcaResult) {
                html += '<div class="row"><span>PCA &lambda;&#8321;, &lambda;&#8322;</span><span>' +
                    fmtNum(pcaResult.values[0]) + ', ' + fmtNum(pcaResult.values[1]) + '</span></div>';
            }
            var model = activeAe();
            if (model) {
                var mse = aeKind === 'linear'
                    ? KpcaCore.linAeLoss(model, aeNorm.normalized)
                    : KpcaCore.nlAeLoss(model, aeNorm.normalized);
                var lambda2 = KpcaCore.pca2(aeNorm.normalized).values[1];
                html +=
                    '<div class="row"><span>AE (' + aeKind + ') MSE</span><span>' + fmtNum(mse) + '</span></div>' +
                    '<div class="row"><span>1D-PCA error &lambda;&#8322;</span><span>' + fmtNum(lambda2) + '</span></div>' +
                    '<div class="row"><span>AE iterations</span><span>' + aeIter[aeKind] + '</span></div>';
            }
            metricsEl.innerHTML = html;
        }

        function setStatus(msg, warn) {
            statusEl.textContent = msg;
            statusEl.className = 'kpca-status' + (warn ? ' warn' : '');
        }

        function renderKpcaPane() {
            drawScatter('kpca-orig', data.points, data.labels, {});
            drawScatter('kpca-pca', pcaResult ? pcaResult.scores : null, data.labels, {});
            var ks = kpcaResult && kpcaResult.keptComponents >= 2
                ? kpcaResult.scores.map(function (s) { return [s[0], s[1]]; })
                : null;
            drawScatter('kpca-kpca', ks, data.labels,
                { placeholder: kpcaResult ? 'Fewer than 2 components kept' : 'Press Compute' });
            drawVarianceBars();
        }
        function renderAePane() { drawReconPanel(); drawLatentPanel(); drawLossPanel(); }
        function renderAll() { renderMetrics(); renderKpcaPane(); renderAePane(); }

        /* ---------- compute (instant) ---------- */
        function kernelParams() {
            return params.kernel === 'poly'
                ? { gamma: params.gamma, degree: params.degree }
                : { gamma: params.gamma };
        }

        function runCompute() {
            if (isTraining) return;
            pcaResult = KpcaCore.pca2(data.points);
            var K = KpcaCore.gramMatrix(params.kernel, kernelParams(), data.points);
            var Kt = KpcaCore.centerGram(K);
            var e = KpcaCore.topKEigen(Kt, 4, KpcaCore.createRng(0x5EED));
            var sc = KpcaCore.kpcaScores(Kt, e.values, e.vectors);
            kpcaResult = {
                eig: e, scores: sc.scores,
                keptComponents: sc.keptComponents, trace: KpcaCore.trace(Kt)
            };
            if (e.converged) {
                setStatus('Eigenpairs certified: residual ' + fmtNum(e.residual) +
                    ' after ' + e.iterations + ' iterations.', false);
            } else {
                setStatus('Eigensolver hit its iteration cap WITHOUT certification (residual ' +
                    fmtNum(e.residual) + '). Scores shown may be inaccurate.', true);
            }
            renderMetrics(); renderKpcaPane();
        }

        /* ---------- autoencoder training (animated) ---------- */
        function nextFrame() {
            return new Promise(function (res) {
                if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { res(); });
                else setTimeout(res, 16);
            });
        }

        var lockedWhileTraining = ['kpca-dataset', 'kpca-kernel', 'kpca-g', 'kpca-deg',
            'kpca-noise', 'kpca-n', 'kpca-compute', 'kpca-newdata', 'kpca-ae-kind', 'kpca-ae-reset'];
        function setControlsLocked(locked) {
            lockedWhileTraining.forEach(function (id) {
                var el = document.getElementById(id);
                el.disabled = locked;
                el.style.opacity = locked ? '0.45' : '';
            });
            if (!locked) updateKernelControls();
        }

        async function runTraining() {
            if (isTraining) { stopRequested = true; return; }
            isTraining = true; stopRequested = false;
            setControlsLocked(true);
            trainBtn.textContent = 'Stop';
            trainBtn.classList.add('stop');

            var isLin = aeKind === 'linear';
            /* snapshot for Stop-discard (typed copy; null = did not exist) */
            var cur = isLin ? aeLin : aeNl;
            var before = null;
            if (cur) {
                before = isLin
                    ? { W1: cur.W1.slice(), W2: cur.W2.slice() }
                    : KpcaCore.nlAeParams(cur);
            }
            var beforeIter = aeIter[aeKind];
            var beforeHist = aeHistory[aeKind].slice();

            if (isLin && !aeLin) aeLin = KpcaCore.linAeCreate(rng);
            if (!isLin && !aeNl) aeNl = KpcaCore.nlAeCreate(8, rng);
            var model = isLin ? aeLin : aeNl;
            var dataN = aeNorm.normalized;
            var lr = isLin ? 0.05 : 0.2;
            var total = 3000, done = 0;
            if (aeHistory[aeKind].length === 0) {
                aeHistory[aeKind].push({
                    iter: aeIter[aeKind],
                    mse: isLin ? KpcaCore.linAeLoss(model, dataN) : KpcaCore.nlAeLoss(model, dataN)
                });
            }
            setStatus('Training the ' + aeKind + ' autoencoder\u2026', false);

            while (done < total && !stopRequested) {
                var t0 = Date.now();
                while (done < total && Date.now() - t0 < 12) {
                    if (isLin) KpcaCore.linAeStep(model, dataN, lr);
                    else KpcaCore.nlAeStep(model, dataN, lr);
                    done++; aeIter[aeKind]++;
                }
                aeHistory[aeKind].push({
                    iter: aeIter[aeKind],
                    mse: isLin ? KpcaCore.linAeLoss(model, dataN) : KpcaCore.nlAeLoss(model, dataN)
                });
                renderMetrics(); renderAePane();
                await nextFrame();
            }

            if (stopRequested) {
                /* discard the partial run entirely */
                if (isLin) {
                    if (before) { aeLin.W1 = before.W1; aeLin.W2 = before.W2; }
                    else aeLin = null;
                } else {
                    if (before) KpcaCore.nlAeSetParams(aeNl, before);
                    else aeNl = null;
                }
                aeIter[aeKind] = beforeIter;
                aeHistory[aeKind] = beforeHist;
                setStatus('Stopped \u2014 partial training discarded.', true);
            } else {
                var mse = isLin ? KpcaCore.linAeLoss(model, dataN) : KpcaCore.nlAeLoss(model, dataN);
                setStatus('Training run complete (' + total + ' iterations). MSE ' + fmtNum(mse) +
                    (isLin ? ' \u2014 compare with \u03bb\u2082, the 1D-PCA error.' : '.'), false);
            }
            isTraining = false;
            setControlsLocked(false);
            trainBtn.textContent = aeIter[aeKind] > 0 ? 'Train (Continue)' : 'Train (3000 iterations)';
            trainBtn.classList.remove('stop');
            renderMetrics(); renderAePane();
        }

        /* ---------- resets ---------- */
        function resetComputed(msg) {
            pcaResult = null; kpcaResult = null;
            aeLin = null; aeNl = null;
            aeIter = { linear: 0, nonlinear: 0 };
            aeHistory = { linear: [], nonlinear: [] };
            aeNorm = KpcaCore.normalizeIsotropic(data.points);
            trainBtn.textContent = 'Train (3000 iterations)';
            setStatus(msg || 'Not yet computed \u2014 press Compute or Train.', false);
            renderAll();
        }
        function regenerate() {
            data = KpcaCore.generateData(params.dataset, params.noise, params.n, rng);
            resetComputed();
        }
        function resetAes() {
            aeLin = null; aeNl = null;
            aeIter = { linear: 0, nonlinear: 0 };
            aeHistory = { linear: [], nonlinear: [] };
            trainBtn.textContent = 'Train (3000 iterations)';
            setStatus('Autoencoders reset.', false);
            renderMetrics(); renderAePane();
        }

        /* ---------- controls ---------- */
        function updateKernelControls() {
            var k = params.kernel;
            var gRow = document.getElementById('kpca-gamma-row');
            var dRow = document.getElementById('kpca-degree-row');
            var gEl = document.getElementById('kpca-g');
            gEl.disabled = k === 'linear';
            gRow.style.opacity = k === 'linear' ? '0.4' : '';
            dRow.style.display = k === 'poly' ? '' : 'none';
        }

        document.getElementById('kpca-dataset').addEventListener('change', function (e) {
            if (isTraining) return;
            params.dataset = e.target.value;
            regenerate();
        });
        document.getElementById('kpca-kernel').addEventListener('change', function (e) {
            if (isTraining) return;
            params.kernel = e.target.value;
            updateKernelControls();
            kpcaResult = null;
            setStatus('Kernel changed \u2014 press Compute.', false);
            renderMetrics(); renderKpcaPane();
        });
        document.getElementById('kpca-g').addEventListener('input', function (e) {
            if (isTraining) return;
            params.gamma = G_STOPS[parseInt(e.target.value, 10)];
            document.getElementById('kpca-g-val').textContent = String(params.gamma);
            kpcaResult = null;
            setStatus('\u03b3 changed \u2014 press Compute.', false);
            renderMetrics(); renderKpcaPane();
        });
        document.getElementById('kpca-deg').addEventListener('input', function (e) {
            if (isTraining) return;
            params.degree = parseInt(e.target.value, 10);
            document.getElementById('kpca-deg-val').textContent = String(params.degree);
            kpcaResult = null;
            setStatus('Degree changed \u2014 press Compute.', false);
            renderMetrics(); renderKpcaPane();
        });
        document.getElementById('kpca-noise').addEventListener('input', function (e) {
            if (isTraining) return;
            params.noise = parseFloat(e.target.value);
            document.getElementById('kpca-noise-val').textContent = params.noise.toFixed(2);
            regenerate();
        });
        document.getElementById('kpca-n').addEventListener('input', function (e) {
            if (isTraining) return;
            params.n = parseInt(e.target.value, 10);
            document.getElementById('kpca-n-val').textContent = String(params.n);
            regenerate();
        });
        document.getElementById('kpca-ae-kind').addEventListener('change', function (e) {
            if (isTraining) return;
            aeKind = e.target.value;
            trainBtn.textContent = aeIter[aeKind] > 0 ? 'Train (Continue)' : 'Train (3000 iterations)';
            renderMetrics(); renderAePane();
        });
        computeBtn.addEventListener('click', runCompute);
        trainBtn.addEventListener('click', runTraining);
        document.getElementById('kpca-newdata').addEventListener('click', function () { if (!isTraining) regenerate(); });
        document.getElementById('kpca-ae-reset').addEventListener('click', function () { if (!isTraining) resetAes(); });

        /* tabs */
        function showTab(which) {
            document.getElementById('kpca-pane-kpca').style.display = which === 'kpca' ? '' : 'none';
            document.getElementById('kpca-pane-ae').style.display = which === 'ae' ? '' : 'none';
            document.getElementById('kpca-tab-kpca').className = 'kpca-tab' + (which === 'kpca' ? ' active' : '');
            document.getElementById('kpca-tab-ae').className = 'kpca-tab' + (which === 'ae' ? ' active' : '');
            if (which === 'kpca') renderKpcaPane(); else renderAePane();
        }
        document.getElementById('kpca-tab-kpca').addEventListener('click', function () { showTab('kpca'); });
        document.getElementById('kpca-tab-ae').addEventListener('click', function () { showTab('ae'); });

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { padCache = {}; renderKpcaPane(); renderAePane(); }, 120);
        });

        updateKernelControls();
        resetComputed();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initKpcaDemo);
    } else {
        initKpcaDemo();
    }
})();