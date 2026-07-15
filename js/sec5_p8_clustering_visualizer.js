/* ============================================================
 * Clustering Demo — math core (CluCore)
 * Pure functions, no DOM. The demo computes the page's objects
 * exactly:
 *   - Lloyd's algorithm with the distortion J(M, Z) = sum ||x - mu||^2
 *     tracked at every half-step (assignment / update), so its
 *     monotone decrease — the reason the algorithm converges — is a
 *     displayed and TESTED fact; convergence is the exact criterion
 *     (assignments reach a fixed point), not a movement threshold;
 *   - k-means++ initialization exactly as in the page's algorithm box
 *     (D^2 sampling with a float-safety fallback);
 *   - spectral clustering via the symmetric normalized Laplacian:
 *     bottom-K eigenpairs obtained as the top-K of 2I - L_sym
 *     (spectrum in [0, 2], so magnitude order = value order) using the
 *     residual-certified guard-vector subspace iteration; the
 *     Dirichlet identity and the two-component nullspace structure are
 *     tested facts;
 *   - vector quantization with the page's normalized distortion
 *     (1/N) sum ||x_n - mu_{z_n}||^2 on deterministic synthetic images.
 * Seeded RNG everywhere; no silent parameter overrides; empty
 * clusters are re-seeded deterministically (farthest point).
 * ============================================================ */
var CluCore = (function () {
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

    function gaussian(rng) {
        var u = 0, v = 0;
        do { u = rng(); } while (u <= 1e-12);
        v = rng();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
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

    /* block (subspace) residual: max_j ||(I - V V^top) M v_j||.
     * The right certificate when only the invariant SUBSPACE matters
     * (spectral clustering uses span(V) only: k-means on the rows of
     * the embedding is invariant to orthogonal column rotations), and
     * it converges even when the eigenvalues inside the block cluster
     * — exactly the situation of a well-separated similarity graph. */
    function subspaceResidual(M, vectors) {
        var k = vectors.length, n = M.length, worst = 0;
        for (var j = 0; j < k; j++) {
            var Mv = matVec(M, vectors[j]);
            /* subtract the projection onto span(V) */
            for (var i = 0; i < k; i++) {
                var c = dot(vectors[i], Mv);
                for (var t = 0; t < n; t++) Mv[t] -= c * vectors[i][t];
            }
            var r = norm(Mv);
            if (r > worst) worst = r;
        }
        return worst;
    }

    /* ---------- top-k symmetric eigensolver ----------
     * Resumable orthogonal (subspace) iteration with guard vectors.
     * createEigenSolver exposes iterate(m) so a UI can run the
     * iteration in time-budgeted chunks; certify() performs
     * Rayleigh-Ritz and evaluates the block-residual certificate.
     * topKEigen is the run-to-cap wrapper used by tests and by the
     * synchronous pipeline. Convergence has ONE source of truth:
     * subspaceResidual <= tol * max(1, lambda_1) at certification. */
    function createEigenSolver(M, k, rng) {
        var n = M.length;
        k = Math.min(k, n);
        var guards = Math.min(6, n - k);
        var kk = k + guards;
        var tol = 1e-8;
        var cols = [], j, i;
        for (j = 0; j < kk; j++) {
            var v = new Float64Array(n);
            for (i = 0; i < n; i++) v[i] = rng() * 2 - 1;
            cols.push(v);
        }
        orthonormalize(cols);
        var iterations = 0;

        function iterate(m) {
            for (var s = 0; s < m; s++) {
                for (j = 0; j < kk; j++) cols[j] = matVec(M, cols[j]);
                orthonormalize(cols);
                iterations++;
            }
        }

        function certify() {
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
            var residual = subspaceResidual(M, vectors);
            var converged = residual <= tol * Math.max(1, Math.abs(values[0]));
            return {
                values: values, vectors: vectors,
                iterations: iterations, residual: residual, converged: converged
            };
        }

        return { iterate: iterate, certify: certify, tol: tol,
                 getIterations: function () { return iterations; } };
    }

    function topKEigen(M, k, rng, maxIter) {
        var cap = maxIter || 2000;
        var checkEvery = 10;
        var solver = createEigenSolver(M, k, rng);
        var rr = null;
        while (solver.getIterations() < cap) {
            solver.iterate(Math.min(checkEvery, cap - solver.getIterations()));
            rr = solver.certify();
            if (rr.converged) break;
        }
        if (!rr) rr = solver.certify();
        return rr;
    }

    /* ---------- data generation ----------
     * TARGETS is the single source of truth; labels mark the
     * generating class only (clustering never sees them). */
    var TARGETS = {
        circles: { rInner: 0.6, rOuter: 1.5 },
        moons: { radius: 1.0, offsetX: 1.0, offsetY: 0.5 },
        blobs: { centers: [[-2, -1], [2, -1], [0, 2]], std: 0.45 },
        aniso: { centers: [[-1.5, 0], [1.5, 0], [0, 2.2]], sx: 1.1, sy: 0.25, angle: 0.7 }
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
            var B = TARGETS.blobs;
            for (i = 0; i < n; i++) {
                var ci = i % B.centers.length;
                pts.push([B.centers[ci][0] + (B.std + noise) * gaussian(rng),
                          B.centers[ci][1] + (B.std + noise) * gaussian(rng)]);
                labels.push(ci);
            }
        } else {
            /* aniso: three stretched Gaussians, all rotated by 'angle' */
            var A = TARGETS.aniso;
            var ca = Math.cos(A.angle), sa = Math.sin(A.angle);
            for (i = 0; i < n; i++) {
                var cj = i % A.centers.length;
                var g1 = (A.sx + noise) * gaussian(rng);
                var g2 = (A.sy + noise) * gaussian(rng);
                pts.push([A.centers[cj][0] + ca * g1 - sa * g2,
                          A.centers[cj][1] + sa * g1 + ca * g2]);
                labels.push(cj);
            }
        }
        for (var k2 = n - 1; k2 > 0; k2--) {
            var j2 = Math.floor(rng() * (k2 + 1));
            var tp = pts[k2]; pts[k2] = pts[j2]; pts[j2] = tp;
            var tl = labels[k2]; labels[k2] = labels[j2]; labels[j2] = tl;
        }
        return { points: pts, labels: labels };
    }

    /* ---------- k-means ---------- */
    function sqDist(a, b) {
        var s = 0;
        for (var d = 0; d < a.length; d++) {
            var df = a[d] - b[d];
            s += df * df;
        }
        return s;
    }

    /* k-means++ (the page's algorithm box): first center uniform, then
     * each next center sampled with probability proportional to the
     * squared distance to the nearest chosen center. A float-safety
     * fallback picks the last point if rounding exhausts the loop. */
    function kmeansPlusPlusInit(pts, k, rng) {
        var n = pts.length, centers = [];
        centers.push(pts[Math.floor(rng() * n)].slice());
        while (centers.length < k) {
            var d2 = new Float64Array(n), total = 0, i;
            for (i = 0; i < n; i++) {
                var best = Infinity;
                for (var c = 0; c < centers.length; c++) {
                    var dd = sqDist(pts[i], centers[c]);
                    if (dd < best) best = dd;
                }
                d2[i] = best;
                total += best;
            }
            if (total <= 0) {
                /* all points coincide with centers: any point works */
                centers.push(pts[Math.floor(rng() * n)].slice());
                continue;
            }
            var r = rng() * total, cum = 0, chosen = n - 1;
            for (i = 0; i < n; i++) {
                cum += d2[i];
                if (cum >= r) { chosen = i; break; }
            }
            centers.push(pts[chosen].slice());
        }
        return centers;
    }

    function randomInit(pts, k, rng) {
        var n = pts.length, used = {}, centers = [];
        var guard = 0;
        while (centers.length < k && guard < 10000) {
            guard++;
            var idx = Math.floor(rng() * n);
            if (!used[idx]) { used[idx] = true; centers.push(pts[idx].slice()); }
        }
        while (centers.length < k) centers.push(pts[0].slice());
        return centers;
    }

    function assign(pts, centers) {
        var n = pts.length, out = new Array(n), J = 0;
        for (var i = 0; i < n; i++) {
            var best = Infinity, bi = 0;
            for (var c = 0; c < centers.length; c++) {
                var dd = sqDist(pts[i], centers[c]);
                if (dd < best) { best = dd; bi = c; }
            }
            out[i] = bi;
            J += best;
        }
        return { assignments: out, J: J };
    }

    function distortion(pts, centers, assignments) {
        var J = 0;
        for (var i = 0; i < pts.length; i++) J += sqDist(pts[i], centers[assignments[i]]);
        return J;
    }

    /* means of assigned points; an EMPTY cluster is re-seeded
     * deterministically at the point farthest from its assigned
     * center (no randomness in the update step) */
    function updateCenters(pts, assignments, k) {
        var d = pts[0].length;
        var sums = [], counts = new Float64Array(k), c, i;
        for (c = 0; c < k; c++) sums.push(new Float64Array(d));
        for (i = 0; i < pts.length; i++) {
            var a = assignments[i];
            counts[a]++;
            for (var t = 0; t < d; t++) sums[a][t] += pts[i][t];
        }
        var centers = [];
        for (c = 0; c < k; c++) {
            if (counts[c] > 0) {
                var m = [];
                for (var t2 = 0; t2 < d; t2++) m.push(sums[c][t2] / counts[c]);
                centers.push(m);
            } else {
                centers.push(null);   /* fill below */
            }
        }
        for (c = 0; c < k; c++) {
            if (centers[c] !== null) continue;
            /* farthest point from its own (non-empty) center */
            var worst = -1, wi = 0;
            for (i = 0; i < pts.length; i++) {
                var cc = centers[assignments[i]];
                if (cc === null) continue;
                var dd = sqDist(pts[i], cc);
                if (dd > worst) { worst = dd; wi = i; }
            }
            centers[c] = pts[wi].slice();
        }
        return centers;
    }

    /* Lloyd stepper: alternates 'assign' and 'update' half-steps.
     * J is recorded after EVERY half-step (both are non-increasing).
     * Convergence is exact: an assignment identical to the previous
     * one is a fixed point of the iteration. */
    function createKmeans(pts, k, initMethod, rng) {
        var centers = initMethod === 'random'
            ? randomInit(pts, k, rng)
            : kmeansPlusPlusInit(pts, k, rng);
        var state = {
            k: k, centers: centers, assignments: null,
            phase: 'assign', J: null, iterations: 0,
            converged: false, historyJ: []
        };
        state.step = function () {
            if (state.converged) return false;
            if (state.phase === 'assign') {
                var r = assign(pts, state.centers);
                if (state.assignments !== null) {
                    var same = true;
                    for (var i = 0; i < r.assignments.length; i++) {
                        if (r.assignments[i] !== state.assignments[i]) { same = false; break; }
                    }
                    if (same) { state.converged = true; return false; }
                }
                state.assignments = r.assignments;
                state.J = r.J;
                state.iterations++;
                state.historyJ.push({ half: state.historyJ.length, J: r.J, phase: 'assign' });
                state.phase = 'update';
            } else {
                state.centers = updateCenters(pts, state.assignments, state.k);
                state.J = distortion(pts, state.centers, state.assignments);
                state.historyJ.push({ half: state.historyJ.length, J: state.J, phase: 'update' });
                state.phase = 'assign';
            }
            return true;
        };
        state.fit = function (maxIter) {
            var cap = 2 * (maxIter || 200), guard = 0;
            while (state.step() && ++guard < cap) { /* run to fixed point */ }
            return state;
        };
        return state;
    }

    /* run several restarts, return the best-J run and all final Js */
    function fitBest(pts, k, initMethod, restarts, rng) {
        var best = null, finals = [];
        for (var r = 0; r < restarts; r++) {
            var s = createKmeans(pts, k, initMethod, rng).fit();
            finals.push(s.J);
            if (!best || s.J < best.J) best = s;
        }
        return { best: best, finalJs: finals };
    }

    /* ---------- spectral clustering ---------- */
    function similarityMatrix(pts, sigma) {
        var n = pts.length, W = new Array(n), i, j;
        for (i = 0; i < n; i++) W[i] = new Float64Array(n);
        var inv = 1 / (2 * sigma * sigma);
        for (i = 0; i < n; i++) {
            for (j = 0; j < i; j++) {
                var w = Math.exp(-sqDist(pts[i], pts[j]) * inv);
                W[i][j] = w; W[j][i] = w;
            }
            W[i][i] = 0;   /* no self-loops */
        }
        return W;
    }

    function degrees(W) {
        var n = W.length, d = new Float64Array(n);
        for (var i = 0; i < n; i++) {
            var s = 0;
            for (var j = 0; j < n; j++) s += W[i][j];
            d[i] = s;
        }
        return d;
    }

    /* unnormalized Laplacian quadratic form f^top L f (for tests) */
    function dirichletEnergy(W, f) {
        var n = W.length, s = 0;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) s += W[i][j] * (f[i] - f[j]) * (f[i] - f[j]);
        }
        return 0.5 * s;
    }

    function laplacianQuadForm(W, f) {
        var n = W.length, d = degrees(W), s = 0;
        for (var i = 0; i < n; i++) {
            s += d[i] * f[i] * f[i];
            for (var j = 0; j < n; j++) s -= W[i][j] * f[i] * f[j];
        }
        return s;
    }

    /* M = 2I - L_sym = I + D^{-1/2} W D^{-1/2}. Spectrum of L_sym lies
     * in [0, 2], so M is PSD and its TOP-k eigenpairs are exactly the
     * BOTTOM-k of L_sym (lambda_L = 2 - lambda_M), with magnitude
     * order equal to value order — safe for subspace iteration. */
    function shiftedOperator(W) {
        var n = W.length, d = degrees(W);
        var inv = new Float64Array(n), i, j;
        for (i = 0; i < n; i++) inv[i] = d[i] > 1e-300 ? 1 / Math.sqrt(d[i]) : 0;
        var M = new Array(n);
        for (i = 0; i < n; i++) {
            M[i] = new Float64Array(n);
            for (j = 0; j < n; j++) M[i][j] = W[i][j] * inv[i] * inv[j];
            M[i][i] += 1;
        }
        return M;
    }

    /* bottom-k eigenpairs of L_sym with the residual certificate.
     * Returns { values (ascending, of L_sym), vectors, residual,
     * iterations, converged, T (row-normalized embedding) }. */
    function spectralEmbedding(pts, k, sigma, rng) {
        var W = similarityMatrix(pts, sigma);
        var M = shiftedOperator(W);
        var e = topKEigen(M, k, rng);
        var n = pts.length;
        var values = [];
        for (var j = 0; j < k; j++) values.push(2 - e.values[j]);   /* ascending */
        var T = new Array(n);
        for (var i = 0; i < n; i++) {
            var row = [], s = 0;
            for (j = 0; j < k; j++) { row.push(e.vectors[j][i]); s += row[j] * row[j]; }
            s = Math.sqrt(s);
            if (s > 1e-12) { for (j = 0; j < k; j++) row[j] /= s; }
            T[i] = row;
        }
        return {
            values: values, vectors: e.vectors, T: T, W: W,
            residual: e.residual, iterations: e.iterations, converged: e.converged
        };
    }

    /* full pipeline: embedding + k-means on the rows of T */
    function spectralCluster(pts, k, sigma, rng, restarts) {
        var emb = spectralEmbedding(pts, k, sigma, rng);
        var km = fitBest(emb.T, k, 'kmeans++', restarts || 5, rng);
        return {
            assignments: km.best.assignments,
            embedding: emb,
            kmeansJ: km.best.J
        };
    }

    /* best accuracy of predicted vs true labels over label
     * permutations (k <= 3: at most 6 permutations) */
    function permutationAccuracy(pred, truth, k) {
        var perms = k === 2
            ? [[0, 1], [1, 0]]
            : [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        var best = 0;
        for (var p = 0; p < perms.length; p++) {
            var c = 0;
            for (var i = 0; i < pred.length; i++) {
                if (perms[p][pred[i]] === truth[i]) c++;
            }
            best = Math.max(best, c / pred.length);
        }
        return best;
    }

    /* ---------- vector quantization ----------
     * Deterministic synthetic images as flat pixel arrays [r,g,b] in
     * 0..255. 'bands': piecewise-constant with exactly 4 colors (a
     * codebook of size 4 reconstructs it EXACTLY — tested). 'gradient':
     * a smooth two-way color ramp. */
    var VQ_COLORS = [[26, 42, 64], [77, 163, 255], [255, 107, 94], [255, 209, 102]];

    function generateImage(type, w, h) {
        var px = new Array(w * h);
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var i = y * w + x;
                if (type === 'bands') {
                    var band = Math.floor((x + y) / ((w + h) / 8)) % VQ_COLORS.length;
                    px[i] = VQ_COLORS[band].slice();
                } else {
                    px[i] = [
                        Math.round(255 * x / (w - 1)),
                        Math.round(80 + 120 * y / (h - 1)),
                        Math.round(255 * (1 - x / (w - 1)) * (y / (h - 1)))
                    ];
                }
            }
        }
        return { pixels: px, width: w, height: h };
    }

    /* k-means in RGB space; distortion in the page's VQ form
     * J = (1/N) sum ||x_n - mu_{z_n}||^2 */
    function quantize(pixels, k, rng, restarts) {
        var km = fitBest(pixels, k, 'kmeans++', restarts || 3, rng);
        return {
            codebook: km.best.centers,
            assignments: km.best.assignments,
            distortion: km.best.J / pixels.length
        };
    }

    /* ---------- self-tests ---------- */
    function runSelfTests() {
        var failures = [];

        /* T1: RNG determinism + pin */
        (function () {
            var r1 = createRng(42), r2 = createRng(42);
            for (var i = 0; i < 5; i++) {
                if (r1() !== r2()) { failures.push('T1 rng not deterministic'); return; }
            }
            var v = createRng(1)();
            if (Math.abs(v - 0.6270739405881613) > 1e-15) failures.push('T1 mulberry32 drift');
        })();

        /* T2: TARGETS pin + generator invariants at noise 0 */
        (function () {
            if (TARGETS.circles.rInner !== 0.6 || TARGETS.circles.rOuter !== 1.5 ||
                TARGETS.moons.radius !== 1.0 || TARGETS.blobs.std !== 0.45 ||
                TARGETS.aniso.sx !== 1.1 || TARGETS.aniso.sy !== 0.25) {
                failures.push('T2 TARGETS drifted');
            }
            var rng = createRng(3);
            var d = generateData('circles', 0, 40, rng);
            if (d.points.length !== 40) failures.push('T2 size wrong');
            for (var i = 0; i < 40; i++) {
                var r = Math.hypot(d.points[i][0], d.points[i][1]);
                var want = d.labels[i] === 0 ? 0.6 : 1.5;
                if (Math.abs(r - want) > 1e-9) { failures.push('T2 circle radius rule violated'); break; }
            }
        })();

        /* T3: k-means++ mechanics — k distinct data points as centers;
         * on two far-apart pairs the second center lands in the other
         * pair (D^2 weighting overwhelmingly favors it, and with the
         * seeded rng the outcome is deterministic) */
        (function () {
            var pts = [[0, 0], [0.1, 0], [100, 0], [100.1, 0]];
            var centers = kmeansPlusPlusInit(pts, 2, createRng(9));
            if (centers.length !== 2) failures.push('T3 wrong center count');
            var side0 = centers[0][0] < 50, side1 = centers[1][0] < 50;
            if (side0 === side1) failures.push('T3 D^2 sampling did not spread centers');
            var isData = centers.every(function (c) {
                return pts.some(function (p) { return p[0] === c[0] && p[1] === c[1]; });
            });
            if (!isData) failures.push('T3 centers are not data points');
        })();

        /* T4: Lloyd analytic case — two far pairs, k = 2: centers are
         * exactly the pair means, J is exact, convergence in <= 3
         * assignment rounds, and convergence is a fixed point */
        (function () {
            var pts = [[0, 0], [1, 0], [10, 0], [11, 0]];
            var s = createKmeans(pts, 2, 'kmeans++', createRng(5)).fit();
            if (!s.converged) failures.push('T4 did not converge');
            if (s.iterations > 3) failures.push('T4 too many iterations: ' + s.iterations);
            var xs = s.centers.map(function (c) { return c[0]; }).sort(function (a, b) { return a - b; });
            if (Math.abs(xs[0] - 0.5) > 1e-12 || Math.abs(xs[1] - 10.5) > 1e-12) {
                failures.push('T4 centers wrong: ' + xs);
            }
            if (Math.abs(s.J - 1.0) > 1e-12) failures.push('T4 J wrong: ' + s.J);
            /* a further step must change nothing */
            if (s.step() !== false) failures.push('T4 stepped after convergence');
        })();

        /* T5: J is non-increasing across EVERY half-step (the page's
         * "minimizing the distortion" as a tested fact) */
        (function () {
            var rng = createRng(2026);
            var d = generateData('aniso', 0.1, 120, rng);
            var s = createKmeans(d.points, 3, 'random', createRng(7)).fit();
            for (var i = 1; i < s.historyJ.length; i++) {
                if (s.historyJ[i].J > s.historyJ[i - 1].J + 1e-9) {
                    failures.push('T5 J increased at half-step ' + i + ': ' +
                        s.historyJ[i - 1].J + ' -> ' + s.historyJ[i].J);
                    break;
                }
            }
            if (!s.converged) failures.push('T5 did not converge');
        })();

        /* T6: empty-cluster handling — adversarial coincident points
         * with k = 3 must still end with three non-empty clusters */
        (function () {
            var pts = [];
            for (var i = 0; i < 20; i++) pts.push([0, 0]);
            pts.push([5, 0]); pts.push([5.1, 0]); pts.push([0, 5]);
            var s = createKmeans(pts, 3, 'random', createRng(11)).fit();
            var counts = [0, 0, 0];
            for (i = 0; i < pts.length; i++) counts[s.assignments[i]]++;
            if (counts.some(function (c) { return c === 0; })) {
                failures.push('T6 empty cluster survived: ' + counts);
            }
            if (!isFinite(s.J)) failures.push('T6 J not finite');
        })();

        /* T7: the page's k-means++ claim — on a trap configuration,
         * k-means++ restarts reach better local optima than random
         * restarts (mean final J strictly smaller; seeded, exact) */
        (function () {
            var rng = createRng(314);
            var d = generateData('blobs', 0.25, 120, rng);
            var pp = fitBest(d.points, 3, 'kmeans++', 10, createRng(17));
            var rd = fitBest(d.points, 3, 'random', 10, createRng(17));
            var mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
            if (!(mean(pp.finalJs) < mean(rd.finalJs))) {
                failures.push('T7 kmeans++ mean J not better: ' +
                    mean(pp.finalJs) + ' vs ' + mean(rd.finalJs));
            }
            if (pp.best.J > rd.best.J + 1e-9) {
                failures.push('T7 kmeans++ best J worse than random best');
            }
        })();

        /* T8: Dirichlet identity f^top L f = (1/2) sum w_ij (f_i-f_j)^2
         * on a random symmetric W and random f (the page's formula) */
        (function () {
            var rng = createRng(23), n = 15;
            var W = new Array(n), i, j;
            for (i = 0; i < n; i++) W[i] = new Float64Array(n);
            for (i = 0; i < n; i++) {
                for (j = 0; j < i; j++) {
                    var w = rng();
                    W[i][j] = w; W[j][i] = w;
                }
            }
            var f = [];
            for (i = 0; i < n; i++) f.push(rng() * 4 - 2);
            var lhs = laplacianQuadForm(W, f);
            var rhs = dirichletEnergy(W, f);
            if (Math.abs(lhs - rhs) > 1e-9 * Math.max(1, Math.abs(rhs))) {
                failures.push('T8 Dirichlet identity violated: ' + lhs + ' vs ' + rhs);
            }
        })();

        /* T9: exact two-component graph (two cliques, zero cross
         * edges): bottom two eigenvalues of L_sym are 0, and spectral
         * clustering recovers the components exactly — the page's
         * Spectral Connectivity result, live */
        (function () {
            var n = 24, half = 12;
            var pts = [];   /* only used for sizes; W built directly */
            var W = new Array(n), i, j;
            for (i = 0; i < n; i++) W[i] = new Float64Array(n);
            for (i = 0; i < n; i++) {
                for (j = 0; j < n; j++) {
                    /* UNEQUAL clique weights: degrees differ across the
                     * components, so normalization errors cannot hide */
                    if (i !== j && ((i < half) === (j < half))) {
                        W[i][j] = i < half ? 0.8 : 0.4;
                    }
                }
            }
            var M = shiftedOperator(W);
            /* the solver requires symmetry: 2I - L_sym must be symmetric */
            for (i = 0; i < n; i++) {
                for (j = 0; j < i; j++) {
                    if (Math.abs(M[i][j] - M[j][i]) > 1e-13) {
                        failures.push('T9 shifted operator not symmetric'); i = n; break;
                    }
                }
            }
            var e = topKEigen(M, 2, createRng(4));
            if (!e.converged) failures.push('T9 eig not converged');
            var l1 = 2 - e.values[0], l2 = 2 - e.values[1];
            if (Math.abs(l1) > 1e-9 || Math.abs(l2) > 1e-9) {
                failures.push('T9 nullspace eigenvalues not 0: ' + l1 + ', ' + l2);
            }
            /* rows of the normalized embedding are constant within a
             * component: cluster with k-means and check exactness */
            var T = new Array(n);
            for (i = 0; i < n; i++) {
                var row = [e.vectors[0][i], e.vectors[1][i]];
                var s = Math.hypot(row[0], row[1]);
                if (s > 1e-12) { row[0] /= s; row[1] /= s; }
                T[i] = row;
            }
            var km = fitBest(T, 2, 'kmeans++', 5, createRng(6));
            var truth = [];
            for (i = 0; i < n; i++) truth.push(i < half ? 0 : 1);
            if (permutationAccuracy(km.best.assignments, truth, 2) < 1) {
                failures.push('T9 components not exactly recovered');
            }
            /* permutation handling itself: swapped labels are a perfect match */
            if (permutationAccuracy([1, 1, 0], [0, 0, 1], 2) !== 1) {
                failures.push('T9 permutation accuracy ignores permutations');
            }
        })();

        /* T10: spectrum bounds — bottom-k eigenvalues of L_sym are
         * >= 0 (up to float) on a real dataset */
        (function () {
            var rng = createRng(99);
            var d = generateData('moons', 0.08, 80, rng);
            var emb = spectralEmbedding(d.points, 3, 0.3, createRng(3));
            if (!emb.converged) failures.push('T10 eig not converged');
            for (var j = 0; j < emb.values.length; j++) {
                if (emb.values[j] < -1e-8) failures.push('T10 negative L_sym eigenvalue: ' + emb.values[j]);
                if (emb.values[j] > 2 + 1e-8) failures.push('T10 eigenvalue above 2');
            }
            /* an RBF similarity graph is connected: lambda_1(L_sym) = 0 */
            if (Math.abs(emb.values[0]) > 1e-6) {
                failures.push('T10 connected-graph lambda_1 != 0: ' + emb.values[0]);
            }
            /* convention pin: the similarity graph has no self-loops */
            var Wd = similarityMatrix(d.points, 0.3);
            for (var q = 0; q < Wd.length; q++) {
                if (Wd[q][q] !== 0) { failures.push('T10 self-loop present'); break; }
            }
            /* symmetry pins on generic (all-degrees-distinct) data: both
             * W and the shifted operator 2I - L_sym must be symmetric */
            var Md = shiftedOperator(Wd);
            for (var a2 = 0; a2 < Wd.length; a2++) {
                for (var b2 = 0; b2 < a2; b2++) {
                    if (Math.abs(Wd[a2][b2] - Wd[b2][a2]) > 1e-15 ||
                        Math.abs(Md[a2][b2] - Md[b2][a2]) > 1e-13) {
                        failures.push('T10 asymmetry detected'); a2 = Wd.length; break;
                    }
                }
            }
            /* the page's step 3: every row of T has unit norm */
            for (var i = 0; i < emb.T.length; i++) {
                var s = 0;
                for (j = 0; j < emb.T[i].length; j++) s += emb.T[i][j] * emb.T[i][j];
                if (Math.abs(s - 1) > 1e-9) { failures.push('T10 T row not unit norm'); break; }
            }
        })();

        /* T11: certificate negative controls — garbage vectors show a
         * large residual; a starved cap reports converged = false */
        (function () {
            var rng = createRng(99);
            var d = generateData('circles', 0.08, 60, rng);
            var M = shiftedOperator(similarityMatrix(d.points, 0.3));
            var r2 = createRng(77), fake = [];
            for (var j = 0; j < 2; j++) {
                var v = new Float64Array(60);
                for (var i = 0; i < 60; i++) v[i] = r2() * 2 - 1;
                fake.push(v);
            }
            orthonormalize(fake);
            if (subspaceResidual(M, fake) < 1e-3) failures.push('T11 residual blind');
            var starved = topKEigen(M, 2, createRng(3), 1);
            if (starved.converged) failures.push('T11 starved solve claimed convergence');
        })();

        /* T12: the headline story — on circles, k-means fails while
         * spectral clustering succeeds (permutation accuracy) */
        (function () {
            var rng = createRng(99);
            var d = generateData('circles', 0.08, 150, rng);
            var km = fitBest(d.points, 2, 'kmeans++', 5, createRng(21));
            var accK = permutationAccuracy(km.best.assignments, d.labels, 2);
            if (accK > 0.75) failures.push('T12 k-means unexpectedly solves circles: ' + accK);
            var sp = spectralCluster(d.points, 2, 0.2, createRng(21), 5);
            if (!sp.embedding.converged) failures.push('T12 spectral eig not converged');
            var accS = permutationAccuracy(sp.assignments, d.labels, 2);
            if (accS < 0.95) failures.push('T12 spectral failed on circles: ' + accS);
        })();

        /* T13: VQ exactness — a piecewise-constant image with exactly
         * 4 colors is reconstructed with ZERO distortion at k = 4 */
        (function () {
            var img = generateImage('bands', 32, 32);
            var q = quantize(img.pixels, 4, createRng(31), 3);
            if (q.distortion > 1e-9) failures.push('T13 nonzero distortion on 4-color image: ' + q.distortion);
            /* the codebook must be the 4 colors (as sets) */
            var found = 0;
            for (var c = 0; c < 4; c++) {
                for (var v = 0; v < VQ_COLORS.length; v++) {
                    if (Math.abs(q.codebook[c][0] - VQ_COLORS[v][0]) < 1e-6 &&
                        Math.abs(q.codebook[c][1] - VQ_COLORS[v][1]) < 1e-6 &&
                        Math.abs(q.codebook[c][2] - VQ_COLORS[v][2]) < 1e-6) { found++; break; }
                }
            }
            if (found !== 4) failures.push('T13 codebook does not match the image colors');
            /* normalization pin: the gradient image at k = 4 has a known
             * per-pixel distortion scale (~2.3e3); dropping the 1/N would
             * inflate it by three orders of magnitude */
            var g = generateImage('gradient', 32, 32);
            var qg = quantize(g.pixels, 4, createRng(31), 3);
            if (!(qg.distortion > 500 && qg.distortion < 6000)) {
                failures.push('T13 gradient distortion out of pinned range: ' + qg.distortion);
            }
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        createRng: createRng,
        gaussian: gaussian,
        TARGETS: TARGETS,
        generateData: generateData,
        sqDist: sqDist,
        kmeansPlusPlusInit: kmeansPlusPlusInit,
        randomInit: randomInit,
        assign: assign,
        distortion: distortion,
        updateCenters: updateCenters,
        createKmeans: createKmeans,
        fitBest: fitBest,
        similarityMatrix: similarityMatrix,
        degrees: degrees,
        dirichletEnergy: dirichletEnergy,
        laplacianQuadForm: laplacianQuadForm,
        shiftedOperator: shiftedOperator,
        spectralEmbedding: spectralEmbedding,
        spectralCluster: spectralCluster,
        permutationAccuracy: permutationAccuracy,
        VQ_COLORS: VQ_COLORS,
        generateImage: generateImage,
        quantize: quantize,
        orthonormalize: orthonormalize,
        matVec: matVec,
        dot: dot,
        eigenResidual: eigenResidual,
        subspaceResidual: subspaceResidual,
        createEigenSolver: createEigenSolver,
        topKEigen: topKEigen,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = CluCore; }
/* ============================================================
 * Clustering Demo — UI layer (v2)
 * Self-contained dark island. Depends only on CluCore above.
 * Refuses to render if CluCore.runSelfTests() fails.
 * Three tabs:
 *  - K-means: Lloyd's algorithm as a STEPPER — each half-step
 *    (assignment / update) is visible, the distortion J is plotted
 *    after every half-step and never increases; convergence is the
 *    exact fixed-point criterion. Stop keeps the intermediate state
 *    and labels it honestly (Lloyd is an anytime iteration; the Step
 *    button creates partial states by design).
 *  - Spectral: similarity graph, the embedding (rows of T), and the
 *    clustering, with the block-residual certificate displayed.
 *  - Vector quantization: k-means as image compression, with the
 *    page's normalized distortion.
 * Point colors before clustering are neutral; after clustering they
 * show ASSIGNMENTS. Generating classes are never used by the methods.
 * ============================================================ */
(function () {
    'use strict';

    function initCluDemo() {
        var container = document.getElementById('clustering_visualizer');
        if (!container) return;
        if (container.dataset.cluInit) return;   /* idempotency guard */
        container.dataset.cluInit = '1';

        var testResult = CluCore.runSelfTests();
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
            cls: ['#4da3ff', '#ff6b5e', '#ffd166', '#2ecc71'],
            neutral: 'rgba(255,255,255,0.45)',
            center: '#ffffff',
            edge: [77, 163, 255],
            jCurve: '#2ecc71',
            warn: '#ffb3ab'
        };

        var SIGMA_STOPS = [0.05, 0.1, 0.2, 0.3, 0.5, 1];
        var rng = CluCore.createRng((Date.now() ^ 0x6B1FD3A7) >>> 0);
        var params = { dataset: 'circles', k: 2, noise: 0.08, n: 150, init: 'kmeans++', sigma: 0.2 };
        var data = CluCore.generateData(params.dataset, params.noise, params.n, rng);
        var km = null;               /* Lloyd stepper or null */
        var sp = null;               /* spectral result or null */
        var restartStats = null;     /* { pp: {...}, rand: {...} } */
        var isRunning = false, stopRequested = false;
        var vq = {
            image: 'bands', k: 4,
            img: CluCore.generateImage('bands', 64, 64),
            result: null, sweep: null
        };

        /* ---------- DOM ---------- */
        var style = document.createElement('style');
        style.textContent = [
            '#clustering_visualizer .clu-root{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:10px;padding:18px;color:' + C.text + ';font-family:"Segoe UI",system-ui,sans-serif;}',
            '#clustering_visualizer .clu-grid{display:flex;flex-direction:column;gap:16px;}',
            '@media (min-width:992px){#clustering_visualizer .clu-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start;}}',
            '#clustering_visualizer .clu-card{background:' + C.panel + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:14px;}',
            '#clustering_visualizer .clu-card h3{margin:0 0 10px 0;font-size:1.02rem;color:' + C.text + ';font-weight:600;}',
            '#clustering_visualizer .clu-card h4{margin:0 0 6px 0;font-size:0.88rem;color:' + C.muted + ';font-weight:600;}',
            '#clustering_visualizer .clu-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
            '#clustering_visualizer canvas{display:block;width:100%;height:auto;border-radius:6px;}',
            '#clustering_visualizer .clu-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}',
            '#clustering_visualizer .clu-tab{padding:8px 16px;border:1px solid ' + C.panelBorder + ';border-radius:6px;background:rgba(255,255,255,0.06);color:' + C.muted + ';cursor:pointer;font-size:0.9rem;}',
            '#clustering_visualizer .clu-tab.active{background:#2f7fd6;color:#fff;border-color:#2f7fd6;}',
            '#clustering_visualizer .clu-duo{display:grid;grid-template-columns:1fr;gap:14px;}',
            '@media (min-width:768px){#clustering_visualizer .clu-duo{grid-template-columns:1fr 1fr;}}',
            '#clustering_visualizer .clu-trio{display:grid;grid-template-columns:1fr;gap:14px;}',
            '@media (min-width:768px){#clustering_visualizer .clu-trio{grid-template-columns:1fr 1fr 1fr;}}',
            '#clustering_visualizer .clu-legend{display:flex;flex-wrap:wrap;gap:10px 14px;justify-content:center;margin-top:10px;font-size:0.82rem;color:' + C.muted + ';}',
            '#clustering_visualizer .clu-legend span.pt{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;}',
            '#clustering_visualizer .clu-legend span.sw{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:5px;vertical-align:3px;}',
            '#clustering_visualizer .clu-ctl{margin-bottom:14px;}',
            '#clustering_visualizer .clu-ctl label{display:flex;justify-content:space-between;font-size:0.86rem;margin-bottom:6px;color:' + C.text + ';}',
            '#clustering_visualizer .clu-ctl label .val{font-family:monospace;color:' + C.muted + ';}',
            '#clustering_visualizer input[type=range]{width:100%;accent-color:#4da3ff;}',
            '#clustering_visualizer select{width:100%;background:#1a2534;color:' + C.text + ';border:1px solid ' + C.panelBorder + ';border-radius:5px;padding:6px 8px;font-size:0.88rem;}',
            '#clustering_visualizer .clu-btn{width:100%;padding:10px 0;border:none;border-radius:6px;font-size:0.95rem;cursor:pointer;margin-bottom:8px;color:#fff;}',
            '#clustering_visualizer .clu-btn.primary{background:#2f7fd6;}',
            '#clustering_visualizer .clu-btn.primary:hover{background:#3b8de4;}',
            '#clustering_visualizer .clu-btn.primary.stop{background:#c0564a;}',
            '#clustering_visualizer .clu-btn.sec{background:rgba(255,255,255,0.10);color:' + C.text + ';}',
            '#clustering_visualizer .clu-btn.sec:hover{background:rgba(255,255,255,0.16);}',
            '#clustering_visualizer .clu-metrics{font-family:monospace;font-size:0.85rem;line-height:1.9;}',
            '#clustering_visualizer .clu-metrics .row{display:flex;justify-content:space-between;}',
            '#clustering_visualizer .clu-metrics .hd{color:' + C.muted + ';margin-top:6px;font-family:"Segoe UI",system-ui,sans-serif;font-size:0.8rem;}',
            '#clustering_visualizer .clu-status{color:' + C.muted + ';font-size:0.84rem;margin-top:10px;line-height:1.5;}',
            '#clustering_visualizer .clu-status.warn{color:' + C.warn + ';}'
        ].join('\n');
        container.appendChild(style);

        var root = document.createElement('div');
        root.className = 'clu-root';
        root.innerHTML =
            '<div class="clu-grid">' +
            '  <div class="clu-main">' +
            '    <div class="clu-tabs">' +
            '      <button class="clu-tab active" id="clu-tab-km">K-means</button>' +
            '      <button class="clu-tab" id="clu-tab-sp">Spectral</button>' +
            '      <button class="clu-tab" id="clu-tab-vq">Vector Quantization</button>' +
            '    </div>' +
            '    <div id="clu-pane-km">' +
            '      <div class="clu-card">' +
            '        <div class="clu-duo">' +
            '          <div><h4>Assignments &amp; centers</h4><canvas id="clu-km-plot"></canvas></div>' +
            '          <div><h4>Distortion J per half-step (never increases)</h4><canvas id="clu-km-j"></canvas></div>' +
            '        </div>' +
            '        <div class="clu-legend">' +
            '          <span><span class="pt" style="background:' + C.neutral + '"></span>Unclustered point</span>' +
            '          <span><span class="pt" style="background:' + C.cls[0] + '"></span><span class="pt" style="background:' + C.cls[1] + '"></span>Cluster assignments</span>' +
            '          <span style="color:' + C.text + ';">&times;</span><span>Centers &mu;<sub>k</sub></span>' +
            '          <span><span class="sw" style="background:' + C.jCurve + '"></span>J(M, Z)</span>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '    <div id="clu-pane-sp" style="display:none;">' +
            '      <div class="clu-card">' +
            '        <div class="clu-trio">' +
            '          <div><h4>Similarity graph (edge &prop; w<sub>ij</sub>)</h4><canvas id="clu-sp-graph"></canvas></div>' +
            '          <div><h4>Embedding: rows of T</h4><canvas id="clu-sp-emb"></canvas></div>' +
            '          <div><h4>Clustering result</h4><canvas id="clu-sp-res"></canvas></div>' +
            '        </div>' +
            '        <div class="clu-legend">' +
            '          <span><span class="pt" style="background:' + C.neutral + '"></span>Point (graph panel)</span>' +
            '          <span><span class="sw" style="background:rgba(77,163,255,0.6)"></span>Edge, opacity &prop; similarity (w<sub>ij</sub> &gt; 0.02 drawn)</span>' +
            '          <span><span class="pt" style="background:' + C.cls[0] + '"></span><span class="pt" style="background:' + C.cls[1] + '"></span>Cluster assignments</span>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '    <div id="clu-pane-vq" style="display:none;">' +
            '      <div class="clu-card">' +
            '        <div class="clu-trio">' +
            '          <div><h4>Original image</h4><canvas id="clu-vq-orig"></canvas></div>' +
            '          <div><h4>Quantized (codebook size K)</h4><canvas id="clu-vq-quant"></canvas></div>' +
            '          <div><h4>Distortion vs K</h4><canvas id="clu-vq-curve"></canvas></div>' +
            '        </div>' +
            '        <div class="clu-legend"><span>Each pixel is replaced by its nearest codebook color &mdash; k-means in RGB space</span></div>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="clu-side">' +
            '    <div class="clu-card" id="clu-data-card">' +
            '      <div class="clu-ctl"><label for="clu-dataset">Dataset</label>' +
            '        <select id="clu-dataset"><option value="circles">Concentric circles</option><option value="moons">Two moons</option><option value="blobs">Gaussian blobs</option><option value="aniso">Anisotropic blobs</option></select></div>' +
            '      <div class="clu-ctl"><label>Clusters K <span class="val" id="clu-k-val">2</span></label>' +
            '        <input type="range" id="clu-k" min="2" max="4" step="1" value="2"></div>' +
            '      <div class="clu-ctl"><label>Coordinate noise <span class="val" id="clu-noise-val">0.08</span></label>' +
            '        <input type="range" id="clu-noise" min="0" max="0.3" step="0.02" value="0.08"></div>' +
            '      <div class="clu-ctl"><label>Sample size <span class="val" id="clu-n-val">150</span></label>' +
            '        <input type="range" id="clu-n" min="50" max="300" step="50" value="150"></div>' +
            '      <button id="clu-newdata" class="clu-btn sec">New Data</button>' +
            '    </div>' +
            '    <div class="clu-card" style="margin-top:16px;" id="clu-km-card">' +
            '      <h3>K-means</h3>' +
            '      <div class="clu-ctl"><label for="clu-init">Initialization</label>' +
            '        <select id="clu-init"><option value="kmeans++">k-means++</option><option value="random">Random</option></select></div>' +
            '      <button id="clu-km-run" class="clu-btn primary">Run Lloyd</button>' +
            '      <button id="clu-km-step" class="clu-btn sec">Step (one half-step)</button>' +
            '      <button id="clu-km-restarts" class="clu-btn sec">Compare inits (10 restarts)</button>' +
            '      <button id="clu-km-reset" class="clu-btn sec">Reset</button>' +
            '    </div>' +
            '    <div class="clu-card" style="margin-top:16px;display:none;" id="clu-sp-card">' +
            '      <h3>Spectral</h3>' +
            '      <div class="clu-ctl"><label>Similarity width &sigma; <span class="val" id="clu-sigma-val">0.2</span></label>' +
            '        <input type="range" id="clu-sigma" min="0" max="5" step="1" value="2"></div>' +
            '      <button id="clu-sp-run" class="clu-btn primary">Run Spectral Clustering</button>' +
            '    </div>' +
            '    <div class="clu-card" style="margin-top:16px;display:none;" id="clu-vq-card">' +
            '      <h3>Vector Quantization</h3>' +
            '      <div class="clu-ctl"><label for="clu-vq-image">Image</label>' +
            '        <select id="clu-vq-image"><option value="bands">Four-color bands</option><option value="gradient">Color gradient</option></select></div>' +
            '      <div class="clu-ctl"><label>Codebook size K <span class="val" id="clu-vq-k-val">4</span></label>' +
            '        <input type="range" id="clu-vq-k" min="2" max="8" step="1" value="4"></div>' +
            '      <button id="clu-vq-run" class="clu-btn primary">Quantize</button>' +
            '      <button id="clu-vq-sweep" class="clu-btn sec">Sweep K = 2&hellip;8</button>' +
            '    </div>' +
            '    <div class="clu-card" style="margin-top:16px;">' +
            '      <h3>Metrics</h3>' +
            '      <div class="clu-metrics" id="clu-metrics"></div>' +
            '      <div class="clu-status" id="clu-status"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        container.appendChild(root);

        var metricsEl = document.getElementById('clu-metrics');
        var statusEl = document.getElementById('clu-status');
        var runBtn = document.getElementById('clu-km-run');
        var activeTab = 'km';

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

        /* ---------- isotropic scatter ---------- */
        function drawScatter(canvasId, pts, colors, opts) {
            opts = opts || {};
            var canvas = document.getElementById(canvasId);
            var s = sizeCanvas(canvas, 0.85);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            if (!pts) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(opts.placeholder || 'Press Run', s.w / 2, s.h / 2);
                return;
            }
            var m = { l: 12, r: 12, t: 10, b: 12 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            var maxAbs = 1e-9, i;
            for (i = 0; i < pts.length; i++) {
                maxAbs = Math.max(maxAbs, Math.abs(pts[i][0]), Math.abs(pts[i][1]));
            }
            (opts.centers || []).forEach(function (c) {
                maxAbs = Math.max(maxAbs, Math.abs(c[0]), Math.abs(c[1]));
            });
            var half = maxAbs * 1.1;
            var scale = Math.min(pw, ph) / (2 * half);
            var cx = m.l + pw / 2, cy = m.t + ph / 2;
            function X(x) { return cx + x * scale; }
            function Y(y) { return cy - y * scale; }

            ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(m.l + pw, Y(0)); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(X(0), m.t); ctx.lineTo(X(0), m.t + ph); ctx.stroke();

            /* edges beneath points, batched into 8 opacity buckets so a
             * dense graph costs 8 strokes instead of O(n^2) */
            if (opts.edges) {
                var W = opts.edges, NB = 8;
                var buckets = [];
                for (var b = 0; b < NB; b++) buckets.push([]);
                for (i = 0; i < pts.length; i++) {
                    for (var j = 0; j < i; j++) {
                        var w = W[i][j];
                        if (w < 0.02) continue;   /* edges below 0.02 not drawn */
                        var bi = Math.min(NB - 1, Math.floor(w * NB));
                        buckets[bi].push(i, j);
                    }
                }
                ctx.lineWidth = 1;
                for (b = 0; b < NB; b++) {
                    var list = buckets[b];
                    if (list.length === 0) continue;
                    ctx.strokeStyle = 'rgba(' + C.edge[0] + ',' + C.edge[1] + ',' + C.edge[2] + ',' +
                        (0.55 * (b + 0.5) / NB).toFixed(3) + ')';
                    ctx.beginPath();
                    for (var q = 0; q < list.length; q += 2) {
                        ctx.moveTo(X(pts[list[q]][0]), Y(pts[list[q]][1]));
                        ctx.lineTo(X(pts[list[q + 1]][0]), Y(pts[list[q + 1]][1]));
                    }
                    ctx.stroke();
                }
            }

            for (i = 0; i < pts.length; i++) {
                ctx.fillStyle = colors ? C.cls[colors[i] % C.cls.length] : C.neutral;
                ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(X(pts[i][0]), Y(pts[i][1]), 3.5, 0, 2 * Math.PI);
                ctx.fill(); ctx.stroke();
            }
            (opts.centers || []).forEach(function (c) {
                ctx.strokeStyle = C.center; ctx.lineWidth = 2.4;
                var x = X(c[0]), y = Y(c[1]);
                ctx.beginPath();
                ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6);
                ctx.moveTo(x - 6, y + 6); ctx.lineTo(x + 6, y - 6);
                ctx.stroke();
            });
        }

        /* ---------- J curve ---------- */
        function drawJCurve() {
            var canvas = document.getElementById('clu-km-j');
            var s = sizeCanvas(canvas, 0.85);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            var hist = km ? km.historyJ : [];
            if (hist.length < 1) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Run or Step', s.w / 2, s.h / 2);
                return;
            }
            var m = { l: 50, r: 10, t: 10, b: 24 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            var maxV = 0, i;
            for (i = 0; i < hist.length; i++) maxV = Math.max(maxV, hist[i].J);
            maxV *= 1.06;
            var maxH = Math.max(1, hist.length - 1);
            function Xc(h) { return m.l + h / maxH * pw; }
            function Yc(v) { return m.t + (1 - v / maxV) * ph; }
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '9px monospace'; ctx.textAlign = 'right';
            for (var k = 0; k <= 3; k++) {
                var vv = maxV * k / 3;
                ctx.beginPath(); ctx.moveTo(m.l, Yc(vv)); ctx.lineTo(m.l + pw, Yc(vv)); ctx.stroke();
                ctx.fillText(vv.toFixed(0), m.l - 4, Yc(vv) + 3);
            }
            ctx.textAlign = 'center';
            ctx.fillText('half-steps', m.l + pw / 2, s.h - 6);
            ctx.strokeStyle = C.jCurve; ctx.lineWidth = 1.8; ctx.beginPath();
            for (i = 0; i < hist.length; i++) {
                if (i === 0) ctx.moveTo(Xc(i), Yc(hist[i].J));
                else ctx.lineTo(Xc(i), Yc(hist[i].J));
            }
            ctx.stroke();
            /* mark assign vs update half-steps */
            for (i = 0; i < hist.length; i++) {
                ctx.fillStyle = hist[i].phase === 'assign' ? C.cls[0] : C.cls[2];
                ctx.beginPath(); ctx.arc(Xc(i), Yc(hist[i].J), 2.5, 0, 2 * Math.PI); ctx.fill();
            }
        }

        /* ---------- VQ rendering ---------- */
        function drawImagePanel(canvasId, img, codebook, assignments) {
            var canvas = document.getElementById(canvasId);
            var s = sizeCanvas(canvas, 1.0);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            if (codebook === undefined && !img) return;
            var off = document.createElement('canvas');
            off.width = img.width; off.height = img.height;
            var offCtx = off.getContext('2d');
            if (!offCtx) return;
            var id = offCtx.createImageData(img.width, img.height);
            for (var i = 0; i < img.pixels.length; i++) {
                var c = codebook ? codebook[assignments[i]] : img.pixels[i];
                id.data[i * 4] = Math.round(c[0]);
                id.data[i * 4 + 1] = Math.round(c[1]);
                id.data[i * 4 + 2] = Math.round(c[2]);
                id.data[i * 4 + 3] = 255;
            }
            offCtx.putImageData(id, 0, 0);
            ctx.imageSmoothingEnabled = false;
            var side = Math.min(s.w, s.h);
            ctx.drawImage(off, 0, 0, img.width, img.height,
                (s.w - side) / 2, (s.h - side) / 2, side, side);
        }

        function drawVqQuant() {
            var canvas = document.getElementById('clu-vq-quant');
            if (!vq.result) {
                var s = sizeCanvas(canvas, 1.0);
                var ctx = s.ctx; if (!ctx) return;
                ctx.fillStyle = C.plotBg; ctx.fillRect(0, 0, s.w, s.h);
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Quantize', s.w / 2, s.h / 2);
                return;
            }
            drawImagePanel('clu-vq-quant', vq.img, vq.result.codebook, vq.result.assignments);
        }

        function drawVqCurve() {
            var canvas = document.getElementById('clu-vq-curve');
            var s = sizeCanvas(canvas, 1.0);
            var ctx = s.ctx; if (!ctx) return;
            ctx.fillStyle = C.plotBg;
            ctx.fillRect(0, 0, s.w, s.h);
            if (!vq.sweep) {
                ctx.fillStyle = C.muted; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Press Sweep', s.w / 2, s.h / 2);
                return;
            }
            var m = { l: 46, r: 10, t: 10, b: 24 };
            var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
            var maxV = 1e-9, i;
            for (i = 0; i < vq.sweep.length; i++) maxV = Math.max(maxV, vq.sweep[i].J);
            maxV *= 1.08;
            function Xc(kk) { return m.l + (kk - 2) / 6 * pw; }
            function Yc(v) { return m.t + (1 - v / maxV) * ph; }
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.fillStyle = C.muted; ctx.font = '9px monospace'; ctx.textAlign = 'right';
            for (var g = 0; g <= 3; g++) {
                var vv = maxV * g / 3;
                ctx.beginPath(); ctx.moveTo(m.l, Yc(vv)); ctx.lineTo(m.l + pw, Yc(vv)); ctx.stroke();
                ctx.fillText(vv.toFixed(0), m.l - 4, Yc(vv) + 3);
            }
            ctx.textAlign = 'center';
            for (i = 0; i < vq.sweep.length; i++) {
                ctx.fillText(String(vq.sweep[i].k), Xc(vq.sweep[i].k), s.h - 6);
            }
            ctx.strokeStyle = C.jCurve; ctx.lineWidth = 1.8; ctx.beginPath();
            for (i = 0; i < vq.sweep.length; i++) {
                if (i === 0) ctx.moveTo(Xc(vq.sweep[i].k), Yc(vq.sweep[i].J));
                else ctx.lineTo(Xc(vq.sweep[i].k), Yc(vq.sweep[i].J));
            }
            ctx.stroke();
            for (i = 0; i < vq.sweep.length; i++) {
                ctx.fillStyle = C.jCurve;
                ctx.beginPath(); ctx.arc(Xc(vq.sweep[i].k), Yc(vq.sweep[i].J), 3, 0, 2 * Math.PI); ctx.fill();
            }
        }

        /* ---------- metrics & status ---------- */
        function fmtNum(v) {
            if (!isFinite(v)) return '\u2014';
            var av = Math.abs(v);
            if (av !== 0 && (av >= 1e5 || av < 1e-3)) return v.toExponential(2);
            return av >= 100 ? v.toFixed(1) : v.toFixed(4);
        }

        function renderMetrics() {
            var html = '';
            if (activeTab === 'km') {
                if (km && km.assignments) {
                    html +=
                        '<div class="row"><span>Distortion J(M, Z)</span><span>' + fmtNum(km.J) + '</span></div>' +
                        '<div class="row"><span>Assignment rounds</span><span>' + km.iterations + '</span></div>' +
                        '<div class="row"><span>Converged (fixed point)</span><span>' + (km.converged ? 'yes' : 'not yet') + '</span></div>';
                    if (params.k <= 3) {
                        html += '<div class="row"><span>Match vs generating classes</span><span>' +
                            (CluCore.permutationAccuracy(km.assignments, data.labels, params.k) * 100).toFixed(1) + '%</span></div>';
                    }
                } else {
                    html += '<div class="row"><span>K-means</span><span>not run</span></div>';
                }
                if (restartStats) {
                    html += '<div class="hd">10 restarts, final J</div>' +
                        '<div class="row"><span>k-means++ mean / best</span><span>' + fmtNum(restartStats.pp.mean) + ' / ' + fmtNum(restartStats.pp.min) + '</span></div>' +
                        '<div class="row"><span>random mean / best</span><span>' + fmtNum(restartStats.rand.mean) + ' / ' + fmtNum(restartStats.rand.min) + '</span></div>' +
                        '<div class="row"><span>random worst</span><span>' + fmtNum(restartStats.rand.max) + '</span></div>';
                }
            } else if (activeTab === 'sp') {
                if (sp) {
                    var e = sp.embedding;
                    html +=
                        '<div class="row"><span>&lambda;&#8321;&hellip;&lambda;<sub>K</sub> of L<sub>sym</sub></span><span>' +
                        e.values.map(function (v) { return v.toExponential(1); }).join(', ') + '</span></div>' +
                        '<div class="row"><span>Subspace residual</span><span>' + fmtNum(e.residual) + '</span></div>' +
                        '<div class="row"><span>Eig iterations</span><span>' + e.iterations + '</span></div>' +
                        '<div class="row"><span>Certified converged</span><span>' + (e.converged ? 'yes' : 'NO') + '</span></div>' +
                        '<div class="row"><span>k-means J on rows of T</span><span>' + fmtNum(sp.kmeansJ) + '</span></div>';
                    if (params.k <= 3) {
                        html += '<div class="row"><span>Match vs generating classes</span><span>' +
                            (CluCore.permutationAccuracy(sp.assignments, data.labels, params.k) * 100).toFixed(1) + '%</span></div>';
                    }
                } else {
                    html += '<div class="row"><span>Spectral</span><span>not run</span></div>';
                }
            } else {
                if (vq.result) {
                    html +=
                        '<div class="row"><span>Distortion (1/N) &Sigma;&#8214;x &minus; &mu;&#8214;&sup2;</span><span>' + fmtNum(vq.result.distortion) + '</span></div>' +
                        '<div class="row"><span>Codebook size K</span><span>' + vq.k + '</span></div>' +
                        '<div class="row"><span>Pixels N</span><span>' + vq.img.pixels.length + '</span></div>';
                } else {
                    html += '<div class="row"><span>VQ</span><span>not run</span></div>';
                }
            }
            metricsEl.innerHTML = html;
        }

        function setStatus(msg, warn) {
            statusEl.textContent = msg;
            statusEl.className = 'clu-status' + (warn ? ' warn' : '');
        }

        function renderKmPane() {
            var colors = km && km.assignments ? km.assignments : null;
            drawScatter('clu-km-plot', data.points, colors,
                { centers: km ? km.centers : null });
            drawJCurve();
        }
        function renderSpPane() {
            var Wdraw = sp ? sp.embedding.W : null;
            drawScatter('clu-sp-graph', data.points, null, { edges: Wdraw });
            if (sp) {
                var emb2 = sp.embedding.T.map(function (r) { return [r[0], r[1] || 0]; });
                drawScatter('clu-sp-emb', emb2, sp.assignments, {});
                drawScatter('clu-sp-res', data.points, sp.assignments, {});
            } else {
                drawScatter('clu-sp-emb', null, null, { placeholder: 'Press Run' });
                drawScatter('clu-sp-res', null, null, { placeholder: 'Press Run' });
            }
        }
        function renderVqPane() {
            drawImagePanel('clu-vq-orig', vq.img, null, null);
            drawVqQuant();
            drawVqCurve();
        }
        function renderActive() {
            renderMetrics();
            if (activeTab === 'km') renderKmPane();
            else if (activeTab === 'sp') renderSpPane();
            else renderVqPane();
        }

        /* ---------- k-means actions ---------- */
        function nextFrame() {
            return new Promise(function (res) {
                if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { res(); });
                else setTimeout(res, 16);
            });
        }
        function pause(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

        var lockedWhileRunning = ['clu-dataset', 'clu-k', 'clu-noise', 'clu-n', 'clu-newdata',
            'clu-init', 'clu-km-step', 'clu-km-restarts', 'clu-km-reset',
            'clu-sigma', 'clu-vq-image', 'clu-vq-k', 'clu-vq-run', 'clu-vq-sweep',
            'clu-tab-km', 'clu-tab-sp', 'clu-tab-vq'];
        function setControlsLocked(locked, stopperId) {
            lockedWhileRunning.forEach(function (id) {
                var el = document.getElementById(id);
                el.disabled = locked;
                el.style.opacity = locked ? '0.45' : '';
            });
            ['clu-km-run', 'clu-sp-run'].forEach(function (id) {
                if (id === stopperId) return;   /* the active Stop stays live */
                var el = document.getElementById(id);
                el.disabled = locked;
                el.style.opacity = locked ? '0.45' : '';
            });
        }

        function ensureKm() {
            if (!km) km = CluCore.createKmeans(data.points, params.k, params.init, rng);
        }

        async function runLloyd() {
            if (isRunning) { stopRequested = true; return; }
            isRunning = true; stopRequested = false;
            setControlsLocked(true, 'clu-km-run');
            runBtn.textContent = 'Stop';
            runBtn.classList.add('stop');
            ensureKm();
            setStatus('Running Lloyd\u2019s algorithm\u2026', false);
            while (!stopRequested && km.step()) {
                renderMetrics(); renderKmPane();
                await nextFrame();
                await pause(140);
            }
            isRunning = false;
            setControlsLocked(false);
            runBtn.textContent = 'Run Lloyd';
            runBtn.classList.remove('stop');
            if (km.converged) {
                setStatus('Converged: the assignment step reproduced the previous assignment ' +
                    '(a fixed point of Lloyd\u2019s iteration) after ' + km.iterations + ' rounds.', false);
            } else if (stopRequested) {
                setStatus('Stopped mid-run \u2014 NOT converged. The state shown is an intermediate ' +
                    'Lloyd iterate; press Run to continue or Reset to discard.', true);
            } else {
                setStatus('Iteration cap reached without a fixed point.', true);
            }
            renderMetrics(); renderKmPane();
        }

        function stepOnce() {
            if (isRunning) return;
            ensureKm();
            var moved = km.step();
            if (!moved && km.converged) {
                setStatus('Fixed point reached \u2014 further steps change nothing.', false);
            } else {
                setStatus('Half-step done: ' +
                    (km.phase === 'update' ? 'points reassigned to nearest centers.' :
                        'centers moved to cluster means.'), false);
            }
            renderMetrics(); renderKmPane();
        }

        function runRestarts() {
            if (isRunning) return;
            var pp = CluCore.fitBest(data.points, params.k, 'kmeans++', 10, rng);
            var rd = CluCore.fitBest(data.points, params.k, 'random', 10, rng);
            function stats(a) {
                var mean = a.reduce(function (x, y) { return x + y; }, 0) / a.length;
                return { mean: mean, min: Math.min.apply(null, a), max: Math.max.apply(null, a) };
            }
            restartStats = { pp: stats(pp.finalJs), rand: stats(rd.finalJs) };
            /* display the overall best run */
            km = pp.best.J <= rd.best.J ? pp.best : rd.best;
            setStatus('20 restarts finished; the best run (J ' + fmtNum(km.J) + ') is displayed. ' +
                'Compare the mean and worst final J of the two initializations in the metrics panel.', false);
            renderMetrics(); renderKmPane();
        }

        function resetKm(msg) {
            km = null; restartStats = null;
            setStatus(msg || 'Reset \u2014 press Run or Step.', false);
            renderMetrics(); renderKmPane();
        }

        /* ---------- spectral action (chunked, stoppable) ---------- */
        var spBtn = document.getElementById('clu-sp-run');
        async function runSpectral() {
            if (isRunning) { stopRequested = true; return; }
            isRunning = true; stopRequested = false;
            setControlsLocked(true, 'clu-sp-run');
            spBtn.textContent = 'Stop';
            spBtn.classList.add('stop');
            sp = null;
            renderMetrics(); renderSpPane();
            setStatus('Computing the spectral embedding\u2026', false);

            var W = CluCore.similarityMatrix(data.points, params.sigma);
            var M = CluCore.shiftedOperator(W);
            var solver = CluCore.createEigenSolver(M, params.k, rng);
            var CAP = 2000, rr = null;
            while (!stopRequested && solver.getIterations() < CAP) {
                var t0 = Date.now();
                while (Date.now() - t0 < 12 && solver.getIterations() < CAP) {
                    solver.iterate(10);
                }
                rr = solver.certify();
                setStatus('Computing\u2026 iteration ' + rr.iterations +
                    ', subspace residual ' + fmtNum(rr.residual), false);
                if (rr.converged) break;
                await nextFrame();
            }

            isRunning = false;
            setControlsLocked(false);
            spBtn.textContent = 'Run Spectral Clustering';
            spBtn.classList.remove('stop');

            if (stopRequested) {
                sp = null;
                setStatus('Stopped \u2014 partial embedding discarded.', true);
                renderMetrics(); renderSpPane();
                return;
            }
            if (!rr) rr = solver.certify();
            var n = data.points.length;
            var values = [], T = new Array(n), i, j;
            for (j = 0; j < params.k; j++) values.push(2 - rr.values[j]);
            for (i = 0; i < n; i++) {
                var row = [], s = 0;
                for (j = 0; j < params.k; j++) { row.push(rr.vectors[j][i]); s += row[j] * row[j]; }
                s = Math.sqrt(s);
                if (s > 1e-12) { for (j = 0; j < params.k; j++) row[j] /= s; }
                T[i] = row;
            }
            var km2 = CluCore.fitBest(T, params.k, 'kmeans++', 5, rng);
            sp = {
                assignments: km2.best.assignments,
                kmeansJ: km2.best.J,
                embedding: {
                    values: values, T: T, W: W,
                    residual: rr.residual, iterations: rr.iterations, converged: rr.converged
                }
            };
            if (rr.converged) {
                setStatus('Embedding certified: subspace residual ' + fmtNum(rr.residual) +
                    ' after ' + rr.iterations + ' iterations; k-means then clustered the rows of T.', false);
            } else {
                setStatus('NOT certified after ' + rr.iterations + ' iterations (residual ' +
                    fmtNum(rr.residual) + '). At this \u03c3 the similarity graph has shattered into many ' +
                    'near-components, so a ' + params.k + '-cluster spectral structure does not exist. ' +
                    'The result shown is unreliable \u2014 try a larger \u03c3.', true);
            }
            renderMetrics(); renderSpPane();
        }

        /* ---------- VQ actions ---------- */
        function runQuantize() {
            if (isRunning) return;
            vq.result = CluCore.quantize(vq.img.pixels, vq.k, rng, 3);
            setStatus('Quantized with a codebook of ' + vq.k + ' colors. Distortion ' +
                fmtNum(vq.result.distortion) +
                (vq.image === 'bands' && vq.k === 4 && vq.result.distortion < 1e-9
                    ? ' \u2014 exactly zero: the codebook can represent every pixel of a 4-color image.' : '.'),
                false);
            renderMetrics(); renderVqPane();
        }
        function runVqSweep() {
            if (isRunning) return;
            var sweep = [];
            for (var k = 2; k <= 8; k++) {
                var q = CluCore.quantize(vq.img.pixels, k, rng, 3);
                sweep.push({ k: k, J: q.distortion });
            }
            vq.sweep = sweep;
            setStatus('Distortion computed for K = 2\u20268: it never increases with K.', false);
            renderVqPane();
        }

        /* ---------- data & controls ---------- */
        function regenerate() {
            data = CluCore.generateData(params.dataset, params.noise, params.n, rng);
            km = null; sp = null; restartStats = null;
            setStatus('New data \u2014 nothing clustered yet.', false);
            renderActive();
        }

        document.getElementById('clu-dataset').addEventListener('change', function (e) {
            if (isRunning) return;
            params.dataset = e.target.value;
            regenerate();
        });
        document.getElementById('clu-k').addEventListener('input', function (e) {
            if (isRunning) return;
            params.k = parseInt(e.target.value, 10);
            document.getElementById('clu-k-val').textContent = String(params.k);
            km = null; sp = null; restartStats = null;
            setStatus('K changed \u2014 previous results cleared.', false);
            renderActive();
        });
        document.getElementById('clu-noise').addEventListener('input', function (e) {
            if (isRunning) return;
            params.noise = parseFloat(e.target.value);
            document.getElementById('clu-noise-val').textContent = params.noise.toFixed(2);
            regenerate();
        });
        document.getElementById('clu-n').addEventListener('input', function (e) {
            if (isRunning) return;
            params.n = parseInt(e.target.value, 10);
            document.getElementById('clu-n-val').textContent = String(params.n);
            regenerate();
        });
        document.getElementById('clu-init').addEventListener('change', function (e) {
            if (isRunning) return;
            params.init = e.target.value;
            resetKm('Initialization method changed \u2014 press Run or Step.');
        });
        document.getElementById('clu-sigma').addEventListener('input', function (e) {
            if (isRunning) return;
            params.sigma = SIGMA_STOPS[parseInt(e.target.value, 10)];
            document.getElementById('clu-sigma-val').textContent = String(params.sigma);
            sp = null;
            setStatus('\u03c3 changed \u2014 press Run Spectral Clustering.', false);
            renderMetrics(); renderSpPane();
        });
        document.getElementById('clu-vq-image').addEventListener('change', function (e) {
            if (isRunning) return;
            vq.image = e.target.value;
            vq.img = CluCore.generateImage(vq.image, 64, 64);
            vq.result = null; vq.sweep = null;
            setStatus('Image changed \u2014 press Quantize.', false);
            renderVqPane(); renderMetrics();
        });
        document.getElementById('clu-vq-k').addEventListener('input', function (e) {
            if (isRunning) return;
            vq.k = parseInt(e.target.value, 10);
            document.getElementById('clu-vq-k-val').textContent = String(vq.k);
            vq.result = null;
            renderVqPane(); renderMetrics();
        });
        runBtn.addEventListener('click', runLloyd);
        document.getElementById('clu-km-step').addEventListener('click', stepOnce);
        document.getElementById('clu-km-restarts').addEventListener('click', runRestarts);
        document.getElementById('clu-km-reset').addEventListener('click', function () { if (!isRunning) resetKm(); });
        spBtn.addEventListener('click', runSpectral);
        document.getElementById('clu-vq-run').addEventListener('click', runQuantize);
        document.getElementById('clu-vq-sweep').addEventListener('click', runVqSweep);
        document.getElementById('clu-newdata').addEventListener('click', function () { if (!isRunning) regenerate(); });

        /* tabs */
        function showTab(which) {
            if (isRunning) return;
            activeTab = which;
            ['km', 'sp', 'vq'].forEach(function (t) {
                document.getElementById('clu-pane-' + t).style.display = t === which ? '' : 'none';
                document.getElementById('clu-tab-' + t).className = 'clu-tab' + (t === which ? ' active' : '');
            });
            document.getElementById('clu-km-card').style.display = which === 'km' ? '' : 'none';
            document.getElementById('clu-sp-card').style.display = which === 'sp' ? '' : 'none';
            document.getElementById('clu-vq-card').style.display = which === 'vq' ? '' : 'none';
            var dataDim = which === 'vq';
            ['clu-dataset', 'clu-k', 'clu-noise', 'clu-n', 'clu-newdata'].forEach(function (id) {
                var el = document.getElementById(id);
                el.disabled = dataDim;
                el.style.opacity = dataDim ? '0.45' : '';
            });
            renderActive();
        }
        document.getElementById('clu-tab-km').addEventListener('click', function () { showTab('km'); });
        document.getElementById('clu-tab-sp').addEventListener('click', function () { showTab('sp'); });
        document.getElementById('clu-tab-vq').addEventListener('click', function () { showTab('vq'); });

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { padCache = {}; renderActive(); }, 120);
        });

        setStatus('Not yet clustered \u2014 press Run or Step.', false);
        renderActive();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCluDemo);
    } else {
        initCluDemo();
    }
})();