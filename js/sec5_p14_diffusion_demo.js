// ============================================================
// sec5_p14_diffusion_demo.js — DiffCore (pure math layer)
//
// Diffusion on the 5-D COMPASS-logo point cloud: each point is
// (x, y, r, g, b) in [-1,1]^5. The "perfectly trained model" is the EXACT
// score of the Gaussian-mixture marginal
//   q_t(x) = (1/N) Σ_i N(x; √ᾱ_t x_0^(i), (1-ᾱ_t) I),
//   ∇ log q_t(x) = ( √ᾱ_t μ_w(x) − x ) / (1-ᾱ_t),
// where μ_w is the softmax-weighted mean of the data points — no fake
// training anywhere; every displayed quantity is computed.
//
// v2 rebuild notes (July 2026):
// - All randomness is SEEDED (mulberry32 → Box-Muller); rng streams are
//   explicit function arguments. Reproducible, testable.
// - Float64 throughout: makes the finite-difference score check (T4)
//   meaningful. Memory cost is trivial (N*DIM*8 bytes).
// - Softmax pruning (threshold 20; measured worst score error 4.6e-10 on
//   the T5 configuration, vs 1.3e-5 at v1's threshold 12) is kept for
//   speed but QUANTIFIED: an unpruned reference path exists and T5 bounds
//   the pruning error.
// - densifyDDIMCloud semantics FIXED: slider position t shows the sparse
//   state with the SMALLEST τ_i ≥ t (the last state the reverse process
//   has computed by the time it reaches t). v1 showed the largest τ_i ≤ t,
//   i.e. a state the process had not yet produced.
// - Reverse cloud builders record x̂_0 and the (x,y) score components as
//   BY-PRODUCTS of steps already computed (zero extra score evaluations)
//   for the ghost / vector-field overlays.
// ============================================================

var DiffCore = (function () {
    'use strict';

    // ---------- constants ----------
    var DIM = 5;
    var T = 100;
    var BETA_MIN = 1e-4;
    var BETA_MAX = 0.10;
    var DDIM_STEPS = 20;
    var SCORE_LOG_THRESHOLD = 20.0;

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

    // Box-Muller; rng is an explicit argument everywhere.
    function randn(rng) {
        var u1 = 0, u2 = 0;
        while (u1 === 0) u1 = rng();
        while (u2 === 0) u2 = rng();
        return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    }

    function randnVec(dim, rng) {
        var v = new Float64Array(dim);
        for (var i = 0; i < dim; i++) v[i] = randn(rng);
        return v;
    }

    // ---------- schedule ----------
    // beta[t-1] = β_t, linear from BETA_MIN to BETA_MAX over t = 1..T.
    function buildSchedule() {
        var beta = new Float64Array(T);
        var alpha = new Float64Array(T);
        var alphaBar = new Float64Array(T);
        var sqrtAlpha = new Float64Array(T);
        var sqrtAlphaBar = new Float64Array(T);
        var sqrtOneMinusAlphaBar = new Float64Array(T);
        var prod = 1.0;
        for (var i = 0; i < T; i++) {
            beta[i] = BETA_MIN + (BETA_MAX - BETA_MIN) * (i / (T - 1));
            alpha[i] = 1.0 - beta[i];
            prod *= alpha[i];
            alphaBar[i] = prod;
            sqrtAlpha[i] = Math.sqrt(alpha[i]);
            sqrtAlphaBar[i] = Math.sqrt(prod);
            sqrtOneMinusAlphaBar[i] = Math.sqrt(1.0 - prod);
        }
        return {
            beta: beta, alpha: alpha, alphaBar: alphaBar,
            sqrtAlpha: sqrtAlpha, sqrtAlphaBar: sqrtAlphaBar,
            sqrtOneMinusAlphaBar: sqrtOneMinusAlphaBar
        };
    }

    // ᾱ at MATH time t ∈ 0..T, with the convention ᾱ_0 = 1 (empty product).
    function alphaBarAt(schedule, tMath) {
        return tMath === 0 ? 1.0 : schedule.alphaBar[tMath - 1];
    }

    // ---------- score engine (per-dataset instance) ----------
    // createScoreEngine(dataPts) returns closed-form score / logDensity for
    // the GMM marginal of the empirical distribution on dataPts.
    function createScoreEngine(dataPts) {
        var N = dataPts.length;
        var dataFlat = new Float64Array(N * DIM);
        var scaledData = new Float64Array(N * DIM);
        var logW = new Float64Array(N);
        var i, d;
        for (i = 0; i < N; i++) {
            for (d = 0; d < DIM; d++) dataFlat[i * DIM + d] = dataPts[i][d];
        }
        var cachedT = -1;
        var cachedSqrtAB = 0;

        function prepare(tIdx, schedule) {
            if (cachedT === tIdx) return;
            var s = schedule.sqrtAlphaBar[tIdx];
            for (var k = 0; k < N * DIM; k++) scaledData[k] = s * dataFlat[k];
            cachedT = tIdx;
            cachedSqrtAB = s;
        }

        // Fill logW with the UNNORMALIZED log weights; return maxLog.
        function fillLogWeights(xt, tIdx, schedule) {
            prepare(tIdx, schedule);
            var halfInv = 0.5 / (1.0 - schedule.alphaBar[tIdx]);
            var x0 = xt[0], x1 = xt[1], x2 = xt[2], x3 = xt[3], x4 = xt[4];
            var maxLog = -Infinity;
            for (var j = 0; j < N; j++) {
                var b = j * 5;
                var e0 = x0 - scaledData[b];
                var e1 = x1 - scaledData[b + 1];
                var e2 = x2 - scaledData[b + 2];
                var e3 = x3 - scaledData[b + 3];
                var e4 = x4 - scaledData[b + 4];
                var lw = -(e0 * e0 + e1 * e1 + e2 * e2 + e3 * e3 + e4 * e4) * halfInv;
                logW[j] = lw;
                if (lw > maxLog) maxLog = lw;
            }
            return maxLog;
        }

        // score(xt, tIdx) with optional pruning threshold (default 12;
        // pass Infinity for the exact unpruned reference).
        function score(xt, tIdx, schedule, threshold) {
            var thr = (threshold === undefined) ? SCORE_LOG_THRESHOLD : threshold;
            var maxLog = fillLogWeights(xt, tIdx, schedule);
            var cutoff = maxLog - thr;
            var s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, sumExp = 0;
            for (var j = 0; j < N; j++) {
                if (logW[j] < cutoff) continue;
                var w = Math.exp(logW[j] - maxLog);
                sumExp += w;
                var b = j * 5;
                s0 += w * dataFlat[b];
                s1 += w * dataFlat[b + 1];
                s2 += w * dataFlat[b + 2];
                s3 += w * dataFlat[b + 3];
                s4 += w * dataFlat[b + 4];
            }
            var invSum = 1.0 / sumExp;
            var invOMAB = 1.0 / (1.0 - schedule.alphaBar[tIdx]);
            var sAB = cachedSqrtAB;
            var out = new Float64Array(DIM);
            out[0] = invOMAB * (sAB * s0 * invSum - xt[0]);
            out[1] = invOMAB * (sAB * s1 * invSum - xt[1]);
            out[2] = invOMAB * (sAB * s2 * invSum - xt[2]);
            out[3] = invOMAB * (sAB * s3 * invSum - xt[3]);
            out[4] = invOMAB * (sAB * s4 * invSum - xt[4]);
            return out;
        }

        // Exact log q_t(x_t) including all constants (for the FD check and
        // for absolute density pins).
        function logDensity(xt, tIdx, schedule) {
            var maxLog = fillLogWeights(xt, tIdx, schedule);
            var sumExp = 0;
            for (var j = 0; j < N; j++) sumExp += Math.exp(logW[j] - maxLog);
            var oneMinusAB = 1.0 - schedule.alphaBar[tIdx];
            return maxLog + Math.log(sumExp) - Math.log(N)
                - 0.5 * DIM * Math.log(2 * Math.PI * oneMinusAB);
        }

        return { N: N, score: score, logDensity: logDensity };
    }

    // ---------- score ↔ noise bridge ----------
    // ε_θ(x_t, t) = −√(1-ᾱ_t) · score(x_t, t)
    function scoreToNoise(scoreVec, tIdx, schedule) {
        var sigma = schedule.sqrtOneMinusAlphaBar[tIdx];
        var eps = new Float64Array(DIM);
        for (var d = 0; d < DIM; d++) eps[d] = -sigma * scoreVec[d];
        return eps;
    }

    function predictNoise(xt, tIdx, engine, schedule) {
        return scoreToNoise(engine.score(xt, tIdx, schedule), tIdx, schedule);
    }

    // x̂_0 = (x_t − √(1-ᾱ_t) ε_θ) / √ᾱ_t
    function predictX0(xt, tIdx, engine, schedule) {
        var eps = predictNoise(xt, tIdx, engine, schedule);
        var sAB = schedule.sqrtAlphaBar[tIdx];
        var sOM = schedule.sqrtOneMinusAlphaBar[tIdx];
        var out = new Float64Array(DIM);
        for (var d = 0; d < DIM; d++) out[d] = (xt[d] - sOM * eps[d]) / sAB;
        return out;
    }

    // ---------- forward diffusion ----------
    // One step: q(x_t | x_{t-1}) = N(√(1-β_t) x_{t-1}, β_t I)
    function forwardStep(xPrev, tIdx, schedule, rng) {
        var s = Math.sqrt(1.0 - schedule.beta[tIdx]);
        var sig = Math.sqrt(schedule.beta[tIdx]);
        var out = new Float64Array(DIM);
        for (var d = 0; d < DIM; d++) out[d] = s * xPrev[d] + sig * randn(rng);
        return out;
    }

    // Closed-form jump: x_t = √ᾱ_t x_0 + √(1-ᾱ_t) ε   (ε supplied by caller)
    function forwardJump(x0, tIdx, schedule, eps) {
        var sAB = schedule.sqrtAlphaBar[tIdx];
        var sOM = schedule.sqrtOneMinusAlphaBar[tIdx];
        var out = new Float64Array(DIM);
        for (var d = 0; d < DIM; d++) out[d] = sAB * x0[d] + sOM * eps[d];
        return out;
    }

    // Resumable forward builder: one time-step per stepOnce() so the UI can
    // chunk the build in ~40 ms slices with live progress (resumable solver
    // pattern). buildForwardCloud drains it — ONE code path.
    function createForwardBuilder(dataPts, schedule, rng) {
        var N = dataPts.length;
        var cloud = new Array(T + 1);
        var cur = new Array(N);
        var i;
        cloud[0] = new Array(N);
        for (i = 0; i < N; i++) {
            cur[i] = Float64Array.from(dataPts[i]);
            cloud[0][i] = cur[i].slice();
        }
        var t = 1;
        return {
            stepOnce: function () {
                if (t > T) return false;
                var next = new Array(N);
                for (var j = 0; j < N; j++) next[j] = forwardStep(cur[j], t - 1, schedule, rng);
                cloud[t] = next;
                cur = next;
                t++;
                return t <= T;
            },
            progress: function () { return (t - 1) / T; },
            result: function () { return cloud; }
        };
    }

    function buildForwardCloud(dataPts, schedule, rng) {
        var b = createForwardBuilder(dataPts, schedule, rng);
        while (b.stepOnce()) { /* drain */ }
        return b.result();
    }

    function drawNoiseBatch(N, rng) {
        var out = new Array(N);
        for (var i = 0; i < N; i++) out[i] = randnVec(DIM, rng);
        return out;
    }

    // ---------- DDPM ancestral sampling ----------
    //   x_{t-1} = (1/√α_t)(x_t − β_t/√(1-ᾱ_t) ε_θ) + σ_t z,  σ_t = √β_t,
    //   z = 0 at the final step t = 1.
    // ONE code path for the DDPM update given eps (used by ddpmStep and by
    // the batch builder — the by-product recording must not fork the math).
    function ddpmStepFromEps(xt, tIdx, eps, schedule, rng) {
        var coeff = schedule.beta[tIdx] / schedule.sqrtOneMinusAlphaBar[tIdx];
        var invSA = 1.0 / schedule.sqrtAlpha[tIdx];
        var out = new Float64Array(DIM);
        var d;
        if (tIdx === 0) {
            for (d = 0; d < DIM; d++) out[d] = invSA * (xt[d] - coeff * eps[d]);
        } else {
            var sig = Math.sqrt(schedule.beta[tIdx]);
            for (d = 0; d < DIM; d++) {
                out[d] = invSA * (xt[d] - coeff * eps[d]) + sig * randn(rng);
            }
        }
        return out;
    }

    function ddpmStep(xt, tIdx, engine, schedule, rng) {
        return ddpmStepFromEps(xt, tIdx, predictNoise(xt, tIdx, engine, schedule), schedule, rng);
    }

    // Batch reverse with by-product recording:
    //   cloud[t][i]   — state at math time t (t = 0..T)
    //   x0hat[t][i]   — x̂_0 predicted FROM the state at time t (t = 1..T)
    //   scoreXY[t][i] — [score_x, score_y] at the state at time t (t = 1..T)
    // x̂_0 and the score are read off the ε_θ already computed inside the
    // step — no extra score evaluations.
    // Resumable DDPM builder: one reverse time-step per stepOnce()
    // (~1500 score evaluations ≈ one 40 ms UI slice at shipped size).
    function createDdpmBuilder(xTbatch, engine, schedule, rng) {
        var N = xTbatch.length;
        var cloud = new Array(T + 1);
        var x0hat = new Array(T + 1);
        var scoreXY = new Array(T + 1);
        cloud[T] = xTbatch.map(function (p) { return Float64Array.from(p); });
        var cur = xTbatch.map(function (p) { return Float64Array.from(p); });
        var t = T;
        return {
            stepOnce: function () {
                if (t < 1) return false;
                var tIdx = t - 1;
                var next = new Array(N);
                var xh = new Array(N);
                var sxy = new Array(N);
                var sAB = schedule.sqrtAlphaBar[tIdx];
                var sOM = schedule.sqrtOneMinusAlphaBar[tIdx];
                for (var i = 0; i < N; i++) {
                    var eps = predictNoise(cur[i], tIdx, engine, schedule);
                    // x̂_0 from this ε (by-product, no extra score evaluation)
                    var h = new Float64Array(DIM);
                    for (var d = 0; d < DIM; d++) h[d] = (cur[i][d] - sOM * eps[d]) / sAB;
                    xh[i] = h;
                    // score = −ε/√(1-ᾱ); record (x,y) components
                    sxy[i] = [-eps[0] / sOM, -eps[1] / sOM];
                    next[i] = ddpmStepFromEps(cur[i], tIdx, eps, schedule, rng);
                }
                x0hat[t] = xh;
                scoreXY[t] = sxy;
                cloud[t - 1] = next;
                cur = next;
                t--;
                return t >= 1;
            },
            progress: function () { return (T - t) / T; },
            result: function () { return { cloud: cloud, x0hat: x0hat, scoreXY: scoreXY }; }
        };
    }

    function ddpmReverseCloud(xTbatch, engine, schedule, rng) {
        var b = createDdpmBuilder(xTbatch, engine, schedule, rng);
        while (b.stepOnce()) { /* drain */ }
        return b.result();
    }

    // ---------- DDIM deterministic sampling ----------
    // τ_0 = 0 < τ_1 < ... < τ_S = T, approximately evenly spaced.
    function buildDDIMSchedule(S) {
        var out = new Int32Array(S + 1);
        out[0] = 0;
        out[S] = T;
        for (var i = 1; i < S; i++) out[i] = Math.round((i / S) * T);
        for (i = 1; i <= S; i++) if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 1;
        return out;
    }

    // One DDIM step t → s (math indices; s may be 0, using ᾱ_0 = 1):
    //   x̂_0 = (x_t − √(1-ᾱ_t) ε_θ)/√ᾱ_t,   x_s = √ᾱ_s x̂_0 + √(1-ᾱ_s) ε_θ
    // ONE code path for the DDIM map given eps: returns { xs, x0hat }.
    function ddimMapFromEps(xt, tIdx, sMath, eps, schedule) {
        var sABt = schedule.sqrtAlphaBar[tIdx];
        var sOMt = schedule.sqrtOneMinusAlphaBar[tIdx];
        var aS = alphaBarAt(schedule, sMath);
        var sABs = Math.sqrt(aS);
        var sOMs = Math.sqrt(1.0 - aS);
        var xs = new Float64Array(DIM);
        var x0hat = new Float64Array(DIM);
        for (var d = 0; d < DIM; d++) {
            var x0h = (xt[d] - sOMt * eps[d]) / sABt;
            x0hat[d] = x0h;
            xs[d] = sABs * x0h + sOMs * eps[d];
        }
        return { xs: xs, x0hat: x0hat };
    }

    function ddimStep(xt, tMath, sMath, engine, schedule) {
        var tIdx = tMath - 1;
        var eps = predictNoise(xt, tIdx, engine, schedule);
        return ddimMapFromEps(xt, tIdx, sMath, eps, schedule).xs;
    }

    // Batch DDIM reverse with the same by-product recording, on the sparse
    // τ grid: sparse[i][n] at math time τ_i; x0hatSparse[i][n] / scoreXYSparse
    // are predicted FROM the state at τ_i (defined for i = 1..S).
    // Resumable DDIM builder: one τ-step per stepOnce().
    function createDdimBuilder(xTbatch, engine, schedule, S) {
        var tau = buildDDIMSchedule(S);
        var N = xTbatch.length;
        var sparse = new Array(S + 1);
        var x0hatS = new Array(S + 1);
        var scoreXYS = new Array(S + 1);
        sparse[S] = xTbatch.map(function (p) { return Float64Array.from(p); });
        var cur = xTbatch.map(function (p) { return Float64Array.from(p); });
        var i = S;
        return {
            stepOnce: function () {
                if (i < 1) return false;
                var tMath = tau[i], sMath = tau[i - 1];
                var tIdx = tMath - 1;
                var sOMt = schedule.sqrtOneMinusAlphaBar[tIdx];
                var next = new Array(N);
                var xh = new Array(N);
                var sxy = new Array(N);
                for (var n = 0; n < N; n++) {
                    var eps = predictNoise(cur[n], tIdx, engine, schedule);
                    var m = ddimMapFromEps(cur[n], tIdx, sMath, eps, schedule);
                    next[n] = m.xs;
                    xh[n] = m.x0hat;
                    sxy[n] = [-eps[0] / sOMt, -eps[1] / sOMt];
                }
                x0hatS[i] = xh;
                scoreXYS[i] = sxy;
                sparse[i - 1] = next;
                cur = next;
                i--;
                return i >= 1;
            },
            progress: function () { return (S - i) / S; },
            result: function () {
                return { sparseCloud: sparse, x0hatSparse: x0hatS, scoreXYSparse: scoreXYS, tauSchedule: tau };
            }
        };
    }

    function ddimReverseCloud(xTbatch, engine, schedule, S) {
        var b = createDdimBuilder(xTbatch, engine, schedule, S);
        while (b.stepOnce()) { /* drain */ }
        return b.result();
    }

    // FIXED semantics: slider position t shows the sparse state with the
    // SMALLEST τ_i ≥ t — the most recent state the reverse process has
    // actually produced by the time it reaches t. Returns index map
    // denseIdx[t] = i, usable for cloud / x̂_0 / score lookups alike.
    function ddimDenseIndex(tauSchedule) {
        var S = tauSchedule.length - 1;
        var idx = new Int32Array(T + 1);
        for (var t = 0; t <= T; t++) {
            var pick = S;
            for (var k = 0; k <= S; k++) {
                if (tauSchedule[k] >= t) { pick = k; break; }
            }
            idx[t] = pick;
        }
        return idx;
    }

    // ---------- shipped configuration ----------
    var DEFAULTS = {
        forwardSeed: 7001,
        noiseSeed: 7002,   // x_T batch; Regenerate advances this stream
        ddpmSeed: 7003,
        ddimSteps: DDIM_STEPS
    };

    // ---------- self-tests ----------
    function runSelfTests() {
        var failures = [];
        function check(name, cond) { if (!cond) failures.push(name); }
        var schedule = buildSchedule();

        // Small synthetic dataset used by several tests: 8 points, seeded.
        function synthData(n, seed) {
            var rng = mulberry32(seed);
            var pts = new Array(n);
            for (var i = 0; i < n; i++) {
                var p = new Float64Array(DIM);
                for (var d = 0; d < DIM; d++) p[d] = 2 * rng() - 1;
                pts[i] = p;
            }
            return pts;
        }

        // T1: schedule pins and structure.
        (function () {
            check('T1 beta endpoints', Math.abs(schedule.beta[0] - 1e-4) < 1e-15 &&
                Math.abs(schedule.beta[T - 1] - 0.10) < 1e-15);
            // linearity: midpoint of an odd count is the average of endpoints;
            // with T=100 test index 50 vs the closed form directly
            var expected = BETA_MIN + (BETA_MAX - BETA_MIN) * (50 / (T - 1));
            check('T1 beta linear', Math.abs(schedule.beta[50] - expected) < 1e-15);
            var mono = true, range = true, roots = true;
            for (var i = 0; i < T; i++) {
                if (i > 0 && !(schedule.alphaBar[i] < schedule.alphaBar[i - 1])) mono = false;
                if (!(schedule.alphaBar[i] > 0 && schedule.alphaBar[i] < 1)) range = false;
                if (Math.abs(schedule.sqrtAlphaBar[i] * schedule.sqrtAlphaBar[i] - schedule.alphaBar[i]) > 1e-14) roots = false;
                if (Math.abs(schedule.sqrtOneMinusAlphaBar[i] * schedule.sqrtOneMinusAlphaBar[i] - (1 - schedule.alphaBar[i])) > 1e-14) roots = false;
            }
            check('T1 alphaBar monotone decreasing', mono);
            check('T1 alphaBar in (0,1)', range);
            check('T1 sqrt caches consistent', roots);
            check('T1 alphaBarAt(0) = 1', alphaBarAt(schedule, 0) === 1.0);
            check('T1 alphaBarAt(T) = alphaBar[T-1]', alphaBarAt(schedule, T) === schedule.alphaBar[T - 1]);
        })();

        // T2: RNG determinism + moments (deterministic given the seed).
        (function () {
            var a = randnVec(6, mulberry32(11));
            var b = randnVec(6, mulberry32(11));
            var same = true;
            for (var d = 0; d < 6; d++) if (a[d] !== b[d]) same = false;
            check('T2 seeded determinism', same);
            var rng = mulberry32(101);
            var n = 20000, mean = 0, m2 = 0;
            for (var i = 0; i < n; i++) { var x = randn(rng); mean += x; m2 += x * x; }
            mean /= n; var variance = m2 / n - mean * mean;
            check('T2 randn moments', Math.abs(mean) < 0.03 && Math.abs(variance - 1) < 0.05);
        })();

        // T3: singleton exact score + symmetric two-point zero.
        (function () {
            var x0 = Float64Array.from([0.3, -0.5, 0.1, 0.7, -0.2]);
            var eng = createScoreEngine([x0]);
            var tIdx = 40;
            var xt = Float64Array.from([0.9, 0.2, -0.4, 0.1, 0.5]);
            var s = eng.score(xt, tIdx, schedule);
            var omab = 1 - schedule.alphaBar[tIdx];
            var sab = schedule.sqrtAlphaBar[tIdx];
            var ok = true;
            for (var d = 0; d < DIM; d++) {
                var exact = (sab * x0[d] - xt[d]) / omab;
                if (Math.abs(s[d] - exact) > 1e-12) ok = false;
            }
            check('T3 singleton score exact', ok);
            // symmetric pair ±a: score at the origin is exactly 0
            var a = Float64Array.from([0.4, -0.3, 0.2, 0.6, -0.5]);
            var na = Float64Array.from(a.map(function (v) { return -v; }));
            var eng2 = createScoreEngine([a, na]);
            var s2 = eng2.score(new Float64Array(DIM), 30, schedule);
            var z = true;
            for (d = 0; d < DIM; d++) if (Math.abs(s2[d]) > 1e-13) z = false;
            check('T3 symmetric midpoint score zero', z);
            // singleton absolute log-density pin: exact Gaussian logpdf
            var xt2 = Float64Array.from([0.1, 0.0, -0.2, 0.3, 0.4]);
            var ld = eng.logDensity(xt2, tIdx, schedule);
            var sq = 0;
            for (d = 0; d < DIM; d++) { var e = xt2[d] - sab * x0[d]; sq += e * e; }
            var exactLd = -0.5 * sq / omab - 0.5 * DIM * Math.log(2 * Math.PI * omab);
            check('T3 singleton logDensity pin', Math.abs(ld - exactLd) < 1e-12);
        })();

        // T4: finite-difference score check (gradients exist in this demo,
        // so the FD requirement applies; central differences, h = 1e-4).
        (function () {
            var pts = synthData(8, 33);
            var eng = createScoreEngine(pts);
            var rng = mulberry32(55);
            var worst = 0;
            var probes = [[5, 1], [40, 2], [90, 1]]; // [tIdx, numProbes]
            for (var p = 0; p < probes.length; p++) {
                var tIdx = probes[p][0];
                for (var q = 0; q < probes[p][1]; q++) {
                    var xt = randnVec(DIM, rng);
                    var s = eng.score(xt, tIdx, schedule, Infinity);
                    for (var d = 0; d < DIM; d++) {
                        var h = 1e-4;
                        var xp = Float64Array.from(xt); xp[d] += h;
                        var xm = Float64Array.from(xt); xm[d] -= h;
                        var fd = (eng.logDensity(xp, tIdx, schedule) -
                            eng.logDensity(xm, tIdx, schedule)) / (2 * h);
                        var err = Math.abs(fd - s[d]) / Math.max(1, Math.abs(s[d]));
                        if (err > worst) worst = err;
                    }
                }
            }
            check('T4 score matches FD of logDensity (<1e-6)', worst < 1e-6);
        })();

        // T5: pruning error quantified against the unpruned reference.
        (function () {
            var pts = synthData(40, 77);
            var eng = createScoreEngine(pts);
            var rng = mulberry32(88);
            var worst = 0;
            var tIdxs = [3, 50, 95];
            for (var p = 0; p < tIdxs.length; p++) {
                for (var q = 0; q < 3; q++) {
                    var xt = randnVec(DIM, rng);
                    var a = eng.score(xt, tIdxs[p], schedule);            // pruned
                    var b = eng.score(xt, tIdxs[p], schedule, Infinity);  // exact
                    for (var d = 0; d < DIM; d++) {
                        var e = Math.abs(a[d] - b[d]);
                        if (e > worst) worst = e;
                    }
                }
            }
            check('T5 pruning error bounded (<1e-8)', worst < 1e-8);
        })();

        // T6: singleton noise-inversion certificate — for one data point the
        // model's ε̂ recovers the TRUE ε of the forward jump exactly.
        (function () {
            var x0 = Float64Array.from([-0.6, 0.2, 0.8, -0.1, 0.4]);
            var eng = createScoreEngine([x0]);
            var eps = randnVec(DIM, mulberry32(21));
            var ok = true;
            var tIdxs = [0, 45, 99];
            for (var p = 0; p < tIdxs.length; p++) {
                var tIdx = tIdxs[p];
                var xt = forwardJump(x0, tIdx, schedule, eps);
                var epsHat = predictNoise(xt, tIdx, eng, schedule);
                for (var d = 0; d < DIM; d++) {
                    if (Math.abs(epsHat[d] - eps[d]) > 1e-10) ok = false;
                }
            }
            check('T6 singleton eps inversion exact', ok);
        })();

        // T7: DDPM step algebra + final-step no-noise + seeded determinism.
        (function () {
            var x0 = Float64Array.from([0.5, -0.4, 0.3, 0.2, -0.1]);
            var eng = createScoreEngine([x0]);
            // tIdx = 0 branch is noise-free: two calls must agree bitwise
            var xt = Float64Array.from([0.6, -0.2, 0.1, 0.4, 0.0]);
            var r1 = ddpmStep(xt, 0, eng, schedule, mulberry32(1));
            var r2 = ddpmStep(xt, 0, eng, schedule, mulberry32(2));
            var det = true;
            for (var d = 0; d < DIM; d++) if (r1[d] !== r2[d]) det = false;
            check('T7 final DDPM step noise-free', det);
            // algebraic pin at tIdx=0 (singleton: eps computable in closed form)
            var tIdx = 0;
            var sOM = schedule.sqrtOneMinusAlphaBar[tIdx];
            var sAB = schedule.sqrtAlphaBar[tIdx];
            var coeff = schedule.beta[tIdx] / sOM;
            var invSA = 1.0 / schedule.sqrtAlpha[tIdx];
            var ok = true;
            for (d = 0; d < DIM; d++) {
                var eps = (xt[d] - sAB * x0[d]) / sOM;
                var expect = invSA * (xt[d] - coeff * eps);
                if (Math.abs(r1[d] - expect) > 1e-12) ok = false;
            }
            check('T7 DDPM step algebraic pin', ok);
            // stochastic branch: same seed same result; different seed differs
            var a = ddpmStep(xt, 50, eng, schedule, mulberry32(9));
            var b = ddpmStep(xt, 50, eng, schedule, mulberry32(9));
            var c = ddpmStep(xt, 50, eng, schedule, mulberry32(10));
            var same = true, diff = false;
            for (d = 0; d < DIM; d++) {
                if (a[d] !== b[d]) same = false;
                if (a[d] !== c[d]) diff = true;
            }
            check('T7 DDPM stochastic seeded', same && diff);
            // noise-SCALE spec pin: with eps supplied directly, the spread of
            // ddpmStepFromEps around its deterministic mean must be sigma_t
            // = sqrt(beta_t) (kills a sigma = beta_t mutant, which every
            // lands-near-data test silently rewards)
            var tI = 50;
            var eps0 = new Float64Array(DIM);
            var meanDet = 1.0 / schedule.sqrtAlpha[tI] * xt[0];
            var rngS = mulberry32(4001);
            var nS = 4000, sum2 = 0;
            for (var k = 0; k < nS; k++) {
                var o = ddpmStepFromEps(xt, tI, eps0, schedule, rngS);
                var dev = o[0] - meanDet;
                sum2 += dev * dev;
            }
            var sigmaHat = Math.sqrt(sum2 / nS);
            var sigmaTrue = Math.sqrt(schedule.beta[tI]);
            check('T7 DDPM noise scale = sqrt(beta) (4 sigma)',
                Math.abs(sigmaHat - sigmaTrue) < 0.01);
        })();

        // T8: DDIM structure — τ schedule, determinism, final step = x̂_0,
        // fixed densify semantics.
        (function () {
            var tau = buildDDIMSchedule(DDIM_STEPS);
            var mono = tau[0] === 0 && tau[DDIM_STEPS] === T;
            for (var i = 1; i <= DDIM_STEPS; i++) if (tau[i] <= tau[i - 1]) mono = false;
            check('T8 tau schedule strict, endpoints', mono);
            var pts = synthData(6, 13);
            var eng = createScoreEngine(pts);
            var xt = randnVec(DIM, mulberry32(3));
            var a = ddimStep(xt, 60, 40, eng, schedule);
            var b = ddimStep(xt, 60, 40, eng, schedule);
            var det = true;
            for (var d = 0; d < DIM; d++) if (a[d] !== b[d]) det = false;
            check('T8 DDIM deterministic (bitwise)', det);
            // final step to s = 0 returns x̂_0 exactly (ᾱ_0 = 1 ⇒ √(1-ᾱ_0) = 0)
            var out = ddimStep(xt, 5, 0, eng, schedule);
            var x0h = predictX0(xt, 4, eng, schedule);
            var eq = true;
            for (d = 0; d < DIM; d++) if (Math.abs(out[d] - x0h[d]) > 1e-14) eq = false;
            check('T8 DDIM final step equals x0hat', eq);
            // densify semantics: smallest τ_i ≥ t
            var tau2 = Int32Array.from([0, 30, 70, 100]);
            var idx = ddimDenseIndex(tau2);
            check('T8 densify picks smallest tau >= t',
                idx[0] === 0 && idx[1] === 1 && idx[30] === 1 && idx[31] === 2 &&
                idx[70] === 2 && idx[71] === 3 && idx[100] === 3);
        })();

        // T9: singleton reverse — DDIM lands EXACTLY on the data point
        // (ε̂ is exact for singleton data, so x̂_0 is exact at every step).
        (function () {
            var x0 = Float64Array.from([0.2, 0.6, -0.3, 0.5, -0.7]);
            var eng = createScoreEngine([x0]);
            var res = ddimReverseCloud([randnVec(DIM, mulberry32(31))], eng, schedule, 10);
            var xEnd = res.sparseCloud[0][0];
            var ok = true;
            for (var d = 0; d < DIM; d++) if (Math.abs(xEnd[d] - x0[d]) > 1e-10) ok = false;
            check('T9 singleton DDIM lands exactly on x0', ok);
            // DDPM final state close to x0 (stochastic, seeded; measured margin)
            var res2 = ddpmReverseCloud([randnVec(DIM, mulberry32(32))], eng, schedule, mulberry32(33));
            var xE = res2.cloud[0][0];
            var dist = 0;
            for (d = 0; d < DIM; d++) { var e = xE[d] - x0[d]; dist += e * e; }
            check('T9 singleton DDPM lands near x0 (<0.05)', Math.sqrt(dist) < 0.05);
        })();

        // T10: story test — the page's claims are tests. Two-cluster synthetic
        // data (N=40): both samplers end near the data manifold, and the
        // DDIM end-state is farther on average than DDPM (the "haze" the
        // prose attributes to few-step discretisation error).
        (function () {
            var rng = mulberry32(2026);
            var pts = [];
            for (var i = 0; i < 40; i++) {
                var c = (i % 2 === 0) ? 0.55 : -0.55;
                var p = new Float64Array(DIM);
                for (var d = 0; d < DIM; d++) p[d] = c + 0.08 * (2 * rng() - 1);
                pts.push(p);
            }
            var eng = createScoreEngine(pts);
            var xT = drawNoiseBatch(40, mulberry32(2027));
            var ddpm = ddpmReverseCloud(xT, eng, schedule, mulberry32(2028));
            var ddim = ddimReverseCloud(xT, eng, schedule, DDIM_STEPS);
            function meanNearest(frame) {
                var tot = 0;
                for (var i = 0; i < frame.length; i++) {
                    var best = Infinity;
                    for (var j = 0; j < pts.length; j++) {
                        var s = 0;
                        for (var d = 0; d < DIM; d++) {
                            var e = frame[i][d] - pts[j][d]; s += e * e;
                        }
                        if (s < best) best = s;
                    }
                    tot += Math.sqrt(best);
                }
                return tot / frame.length;
            }
            var mDdpm = meanNearest(ddpm.cloud[0]);
            var mDdim = meanNearest(ddim.sparseCloud[0]);
            check('T10 DDPM ends on manifold (<0.15)', mDdpm < 0.15);
            check('T10 DDIM ends on manifold (<0.25)', mDdim < 0.25);
            check('T10 DDIM residual exceeds DDPM (haze claim)', mDdim > mDdpm);
            // by-product recording shape + x̂_0 consistency at one probe:
            // recorded x̂_0 at time t equals predictX0 of the recorded state
            var t = 60;
            var xh = ddpm.x0hat[t][0];
            var ref = predictX0(ddpm.cloud[t][0], t - 1, eng, schedule);
            var eq = true;
            for (var d2 = 0; d2 < DIM; d2++) if (Math.abs(xh[d2] - ref[d2]) > 1e-12) eq = false;
            check('T10 recorded x0hat consistent with predictX0', eq);
            // recorded scoreXY consistent with engine.score at the same state
            var sc = eng.score(ddpm.cloud[t][0], t - 1, schedule);
            var sxy = ddpm.scoreXY[t][0];
            check('T10 recorded scoreXY consistent with score',
                Math.abs(sxy[0] - sc[0]) < 1e-10 && Math.abs(sxy[1] - sc[1]) < 1e-10);
            // one-code-path certificates (bitwise): the batch builders must
            // reproduce the single-step functions exactly under the same rng
            var xT1 = [randnVec(DIM, mulberry32(71))];
            var b1 = ddpmReverseCloud(xT1, eng, schedule, mulberry32(72));
            var s1 = ddpmStep(xT1[0], T - 1, eng, schedule, mulberry32(72));
            var bw = true;
            for (var d3 = 0; d3 < DIM; d3++) if (b1.cloud[T - 1][0][d3] !== s1[d3]) bw = false;
            check('T10 DDPM batch == step (bitwise)', bw);
            var b2 = ddimReverseCloud(xT1, eng, schedule, DDIM_STEPS);
            var tau = b2.tauSchedule;
            var s2 = ddimStep(xT1[0], tau[DDIM_STEPS], tau[DDIM_STEPS - 1], eng, schedule);
            bw = true;
            for (d3 = 0; d3 < DIM; d3++) if (b2.sparseCloud[DDIM_STEPS - 1][0][d3] !== s2[d3]) bw = false;
            check('T10 DDIM batch == step (bitwise)', bw);
        })();

        // T11: forwardJump vs stepwise composition — moment consistency
        // (seeded, hence deterministic): stepwise x_t must match the
        // closed-form marginal N(√ᾱ_t x_0, (1-ᾱ_t) I).
        (function () {
            var x0 = Float64Array.from([0.4, -0.6, 0.2, 0.0, 0.5]);
            var rng = mulberry32(404);
            var tIdx = 60;
            var n = 2000;
            var mean = new Float64Array(DIM);
            var m2 = new Float64Array(DIM);
            for (var k = 0; k < n; k++) {
                var x = Float64Array.from(x0);
                for (var t = 0; t <= tIdx; t++) x = forwardStep(x, t, schedule, rng);
                for (var d = 0; d < DIM; d++) { mean[d] += x[d]; m2[d] += x[d] * x[d]; }
            }
            var sAB = schedule.sqrtAlphaBar[tIdx];
            var omab = 1 - schedule.alphaBar[tIdx];
            // standardized 4-sigma bounds (deterministic given the seed):
            // std(mean-hat) = sqrt(omab/n), std(var-hat) ~ omab*sqrt(2/n)
            var seMean = Math.sqrt(omab / n);
            var seVar = omab * Math.sqrt(2 / n);
            var ok = true;
            for (d = 0; d < DIM; d++) {
                mean[d] /= n;
                var v = m2[d] / n - mean[d] * mean[d];
                if (Math.abs(mean[d] - sAB * x0[d]) / seMean > 4) ok = false;
                if (Math.abs(v - omab) / seVar > 4) ok = false;
            }
            check('T11 stepwise matches closed-form marginal (4 sigma)', ok);
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        DIM: DIM, T: T, DDIM_STEPS: DDIM_STEPS,
        BETA_MIN: BETA_MIN, BETA_MAX: BETA_MAX,
        SCORE_LOG_THRESHOLD: SCORE_LOG_THRESHOLD,
        mulberry32: mulberry32,
        randn: randn,
        randnVec: randnVec,
        buildSchedule: buildSchedule,
        alphaBarAt: alphaBarAt,
        createScoreEngine: createScoreEngine,
        scoreToNoise: scoreToNoise,
        predictNoise: predictNoise,
        predictX0: predictX0,
        forwardStep: forwardStep,
        forwardJump: forwardJump,
        buildForwardCloud: buildForwardCloud,
        createForwardBuilder: createForwardBuilder,
        drawNoiseBatch: drawNoiseBatch,
        ddpmStep: ddpmStep,
        ddpmStepFromEps: ddpmStepFromEps,
        ddpmReverseCloud: ddpmReverseCloud,
        createDdpmBuilder: createDdpmBuilder,
        buildDDIMSchedule: buildDDIMSchedule,
        ddimStep: ddimStep,
        ddimMapFromEps: ddimMapFromEps,
        ddimReverseCloud: ddimReverseCloud,
        createDdimBuilder: createDdimBuilder,
        ddimDenseIndex: ddimDenseIndex,
        DEFAULTS: DEFAULTS,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = DiffCore; }
// ============================================================
// UI layer (#diffusion_demo_visualizer, prefix dfv-)
// Dark island: fixed palette; no var(--), no data-theme/currentColor reads.
// Gate first; cloud builds are chunked (~40 ms slices) with live progress so
// the 4-second DDPM build never freezes the page. Overlays: trajectory
// trails, score vector field, x̂_0 ghost. Reverse t = 0 shows the mean
// nearest-data distance (the DDPM-vs-DDIM haze, quantified on screen).
// ============================================================

(function () {
    'use strict';

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
        axis: 'rgba(140,160,190,0.25)',
        trail: 'rgba(255,183,77,0.85)',   // amber trails
        trailNode: '#ffd54f',
        arrow: 'rgba(77,208,225,0.75)'    // cyan score arrows
    };

    var TRAIL_COUNT = 12;    // tracked points
    var TRAIL_LEN = 14;      // frames of history drawn
    var ARROW_STRIDE = 5;    // every 5th point gets a score arrow (300 of 1500)
    var ARROW_MAX_PX = 26;   // arrow length cap; length saturates with |score|
    var PLOT_HALF = 2.2;     // math range [-PLOT_HALF, PLOT_HALF] fills the canvas

    // ---------- CSS ----------
    function injectCSS() {
        if (document.getElementById('dfv-style')) return;
        var css = '' +
            '#diffusion_demo_visualizer{background:' + C.bg + ';border:1px solid ' + C.border + ';' +
            'border-radius:10px;padding:16px;color:' + C.text + ';' +
            'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}' +
            '#diffusion_demo_visualizer .dfv-canvas-wrap{max-width:620px;margin:0 auto;}' +
            '#diffusion_demo_visualizer .dfv-canvas{width:100%;display:block;border-radius:8px;' +
            'border:1px solid ' + C.border + ';}' +
            '#diffusion_demo_visualizer .dfv-legend{color:' + C.dim + ';font-size:0.75rem;margin-top:6px;' +
            'text-align:center;min-height:1.1em;}' +
            '#diffusion_demo_visualizer .dfv-metric{color:' + C.text + ';font-size:0.85rem;margin-top:4px;' +
            'text-align:center;font-family:ui-monospace,Consolas,monospace;min-height:1.2em;}' +
            '#diffusion_demo_visualizer .dfv-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;' +
            'justify-content:center;margin-top:14px;padding-top:12px;border-top:1px solid ' + C.border + ';}' +
            '#diffusion_demo_visualizer .dfv-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;' +
            'justify-content:center;width:100%;}' +
            '#diffusion_demo_visualizer .dfv-btn{background:transparent;color:' + C.accent + ';' +
            'border:1px solid ' + C.accent + ';border-radius:6px;padding:6px 14px;font-size:0.88rem;cursor:pointer;}' +
            '#diffusion_demo_visualizer .dfv-btn:hover{background:rgba(100,181,246,0.12);}' +
            '#diffusion_demo_visualizer .dfv-btn:disabled{opacity:0.35;cursor:default;}' +
            '#diffusion_demo_visualizer .dfv-seg{display:inline-flex;border:1px solid ' + C.border + ';' +
            'border-radius:6px;overflow:hidden;}' +
            '#diffusion_demo_visualizer .dfv-seg button{background:transparent;color:' + C.dim + ';border:none;' +
            'padding:6px 12px;font-size:0.85rem;cursor:pointer;}' +
            '#diffusion_demo_visualizer .dfv-seg button.dfv-active{background:rgba(100,181,246,0.18);color:' + C.text + ';}' +
            '#diffusion_demo_visualizer .dfv-seg button:disabled{opacity:0.35;cursor:default;}' +
            '#diffusion_demo_visualizer .dfv-ctl{display:flex;align-items:center;gap:6px;font-size:0.85rem;color:' + C.dim + ';}' +
            '#diffusion_demo_visualizer .dfv-ctl input[type=range]{width:200px;}' +
            '#diffusion_demo_visualizer .dfv-toggles{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;' +
            'font-size:0.83rem;color:' + C.dim + ';}' +
            '#diffusion_demo_visualizer .dfv-toggles label{display:flex;align-items:center;gap:5px;cursor:pointer;}' +
            '#diffusion_demo_visualizer .dfv-status{margin-top:8px;font-size:0.8rem;color:' + C.dim + ';' +
            'text-align:center;font-family:ui-monospace,Consolas,monospace;min-height:1.2em;}' +
            '#diffusion_demo_visualizer .dfv-refusal{border:1px solid ' + C.bad + ';border-radius:8px;' +
            'padding:14px;color:' + C.bad + ';}' +
            '#diffusion_demo_visualizer .dfv-refusal ul{margin:8px 0 0 18px;padding:0;}' +
            '@media (max-width: 700px){' +
            '#diffusion_demo_visualizer{padding:10px;}' +
            '#diffusion_demo_visualizer .dfv-ctl input[type=range]{width:140px;}' +
            '}';
        var style = document.createElement('style');
        style.id = 'dfv-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ---------- HTML ----------
    function buildHTML(container) {
        var T = DiffCore.T;
        container.innerHTML =
            '<div class="dfv-canvas-wrap">' +
            '<canvas class="dfv-canvas" id="dfv-canvas"></canvas>' +
            '<div class="dfv-legend" id="dfv-legend"></div>' +
            '<div class="dfv-metric" id="dfv-metric"></div>' +
            '</div>' +
            '<div class="dfv-controls">' +
            '<div class="dfv-row">' +
            '<span class="dfv-ctl">t <input type="range" id="dfv-time" min="0" max="' + T + '" step="1" value="0">' +
            '<span id="dfv-time-val">0 / ' + T + '</span></span>' +
            '</div>' +
            '<div class="dfv-row">' +
            '<span class="dfv-seg" id="dfv-dir">' +
            '<button id="dfv-dir-fwd" class="dfv-active">Forward</button>' +
            '<button id="dfv-dir-rev">Reverse</button></span>' +
            '<span class="dfv-seg" id="dfv-sampler">' +
            '<button id="dfv-samp-ddpm" class="dfv-active" disabled>DDPM</button>' +
            '<button id="dfv-samp-ddim" disabled>DDIM</button></span>' +
            '<span class="dfv-seg" id="dfv-speed">' +
            '<button id="dfv-speed-slow">Slow</button>' +
            '<button id="dfv-speed-med" class="dfv-active">Medium</button>' +
            '<button id="dfv-speed-fast">Fast</button></span>' +
            '</div>' +
            '<div class="dfv-row">' +
            '<button class="dfv-btn" id="dfv-play">&#9654; Play</button>' +
            '<button class="dfv-btn" id="dfv-reset">&#8634; Reset</button>' +
            '<button class="dfv-btn" id="dfv-regen">&#10227; Regenerate noise</button>' +
            '</div>' +
            '<div class="dfv-toggles">' +
            '<label><input type="checkbox" id="dfv-tg-trails" checked> Trails</label>' +
            '<label><input type="checkbox" id="dfv-tg-score"> Score field</label>' +
            '<label><input type="checkbox" id="dfv-tg-ghost"> x&#770;<sub>0</sub> ghost</label>' +
            '</div>' +
            '</div>' +
            '<div class="dfv-status" id="dfv-status"></div>';
    }

    function renderRefusal(container, title, items) {
        injectCSS();
        var lis = '';
        for (var i = 0; i < items.length; i++) lis += '<li>' + items[i] + '</li>';
        container.innerHTML =
            '<div class="dfv-refusal"><strong>' + title + '</strong>' +
            (items.length ? '<ul>' + lis + '</ul>' : '') +
            '<p>The demo refuses to render rather than display unverified quantities.</p></div>';
    }

    // ---------- canvas ----------
    function sizeCanvas(canvas) {
        var rect = canvas.getBoundingClientRect();
        var w = Math.max(1, Math.round(rect.width));
        var h = w; // square plot, isotropic mapping
        var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.height = h + 'px';
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, W: w, H: h };
    }

    function toPx(x, y, W, H) {
        return {
            x: ((x + PLOT_HALF) / (2 * PLOT_HALF)) * W,
            y: ((PLOT_HALF - y) / (2 * PLOT_HALF)) * H
        };
    }

    function colorOf(p) {
        var r = Math.max(0, Math.min(255, Math.round((p[2] + 1) * 127.5)));
        var g = Math.max(0, Math.min(255, Math.round((p[3] + 1) * 127.5)));
        var b = Math.max(0, Math.min(255, Math.round((p[4] + 1) * 127.5)));
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    // ---------- state ----------
    function makeState(dataPts) {
        var D = DiffCore.DEFAULTS;
        return {
            dataPts: dataPts,
            N: dataPts.length,
            schedule: DiffCore.buildSchedule(),
            engine: DiffCore.createScoreEngine(dataPts),
            noiseSeed: D.noiseSeed,
            direction: 'forward',
            sampler: 'DDPM',
            tIdx: 0,
            playing: false,
            fps: 20,
            overlays: { trails: true, score: false, ghost: false },
            forwardCloud: null,
            ddpm: null,           // {cloud, x0hat, scoreXY}
            ddim: null,           // {sparseCloud, x0hatSparse, scoreXYSparse, tauSchedule}
            ddimIdx: null,        // dense index map
            reverseReady: false,
            forwardScoreCache: {},   // t -> decimated [x,y,sx,sy] arrays
            metricCache: {},         // 'ddpm'|'ddim' -> number
            trailIdx: null,
            animTimer: null,
            buildToken: 0
        };
    }

    function pickTrailIndices(N) {
        var out = [];
        var stride = Math.max(1, Math.floor(N / TRAIL_COUNT));
        for (var i = 0; i < N && out.length < TRAIL_COUNT; i += stride) out.push(i);
        return out;
    }

    // frame for the current (direction, sampler, tIdx)
    function frameAt(state, t) {
        if (state.direction === 'forward') return state.forwardCloud[t];
        if (state.sampler === 'DDPM') return state.ddpm.cloud[t];
        return state.ddim.sparseCloud[state.ddimIdx[t]];
    }

    // recorded score (x,y) list for reverse at time t, or null
    function scoreAtReverse(state, t) {
        if (t === 0) return null;
        if (state.sampler === 'DDPM') return state.ddpm.scoreXY[t];
        var i = state.ddimIdx[t];
        if (i === 0) return null;
        return state.ddim.scoreXYSparse[i];
    }

    // x̂_0 list for reverse at time t, or null
    function x0hatAtReverse(state, t) {
        if (t === 0) return null;
        if (state.sampler === 'DDPM') return state.ddpm.x0hat[t];
        var i = state.ddimIdx[t];
        if (i === 0) return null;
        return state.ddim.x0hatSparse[i];
    }

    // lazily computed, cached, decimated forward score field at time t
    function forwardScoreAt(state, t) {
        if (t === 0) return null; // score of the data delta mixture is undefined at t=0
        if (state.forwardScoreCache[t]) return state.forwardScoreCache[t];
        var frame = state.forwardCloud[t];
        var out = [];
        for (var i = 0; i < frame.length; i += ARROW_STRIDE) {
            var s = state.engine.score(frame[i], t - 1, state.schedule);
            out.push([frame[i][0], frame[i][1], s[0], s[1]]);
        }
        state.forwardScoreCache[t] = out;
        return out;
    }

    // mean nearest-data distance of a frame (full 5-D), cached per cloud
    function meanNearestDistance(state, frame) {
        var pts = state.dataPts;
        var tot = 0;
        for (var i = 0; i < frame.length; i++) {
            var best = Infinity;
            for (var j = 0; j < pts.length; j++) {
                var s = 0;
                for (var d = 0; d < 5; d++) {
                    var e = frame[i][d] - pts[j][d];
                    s += e * e;
                }
                if (s < best) best = s;
            }
            tot += Math.sqrt(best);
        }
        return tot / frame.length;
    }

    // ---------- drawing ----------
    function drawFrame(state, cv) {
        var ctx = cv.ctx, W = cv.W, H = cv.H;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);

        // axes
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        var o = toPx(0, 0, W, H);
        ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();
        // unit box guide (the data lives in [-1,1]^2 spatially)
        var a = toPx(-1, 1, W, H), b = toPx(1, -1, W, H);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);

        var t = state.tIdx;
        var frame = frameAt(state, t);

        // ghost x̂_0 (reverse only), drawn beneath the live points
        if (state.overlays.ghost && state.direction === 'reverse') {
            var gh = x0hatAtReverse(state, t);
            if (gh) {
                ctx.globalAlpha = 0.35;
                for (var i = 0; i < gh.length; i++) {
                    var gp = toPx(gh[i][0], gh[i][1], W, H);
                    ctx.fillStyle = colorOf(gh[i]);
                    ctx.beginPath();
                    ctx.arc(gp.x, gp.y, 1.6, 0, 2 * Math.PI);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        }

        // main points
        for (i = 0; i < frame.length; i++) {
            var p = toPx(frame[i][0], frame[i][1], W, H);
            ctx.fillStyle = colorOf(frame[i]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.4, 0, 2 * Math.PI);
            ctx.fill();
        }

        // score field arrows
        if (state.overlays.score) {
            var arrows = null;
            if (state.direction === 'forward') {
                arrows = forwardScoreAt(state, t);
            } else {
                var sc = scoreAtReverse(state, t);
                if (sc) {
                    frame = frameAt(state, t);
                    arrows = [];
                    for (i = 0; i < frame.length; i += ARROW_STRIDE) {
                        arrows.push([frame[i][0], frame[i][1], sc[i][0], sc[i][1]]);
                    }
                }
            }
            if (arrows) {
                ctx.strokeStyle = C.arrow;
                ctx.fillStyle = C.arrow;
                ctx.lineWidth = 1.2;
                for (i = 0; i < arrows.length; i++) {
                    var ar = arrows[i];
                    var mag = Math.hypot(ar[2], ar[3]);
                    if (mag < 1e-12) continue;
                    // saturating length: L = MAX * |s| / (|s| + 2)
                    var L = ARROW_MAX_PX * mag / (mag + 2.0);
                    var ux = ar[2] / mag, uy = ar[3] / mag;
                    var p0 = toPx(ar[0], ar[1], W, H);
                    var x1 = p0.x + ux * L, y1 = p0.y - uy * L;
                    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(x1, y1); ctx.stroke();
                    // arrowhead
                    var hx = -ux * 4, hy = uy * 4;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x1 + hx - hy * 0.6, y1 + hy + hx * 0.6);
                    ctx.lineTo(x1 + hx + hy * 0.6, y1 + hy - hx * 0.6);
                    ctx.closePath(); ctx.fill();
                }
            }
        }

        // trails (drawn on top so tracked points stay findable)
        if (state.overlays.trails) {
            var idxs = state.trailIdx;
            ctx.lineWidth = 1.4;
            for (var k = 0; k < idxs.length; k++) {
                var pi = idxs[k];
                // history: frames from t towards the trajectory's past
                // (forward: t-1, ..., t-TRAIL_LEN; reverse: t+1, ..., t+TRAIL_LEN)
                var pts = [];
                for (var m = 0; m <= TRAIL_LEN; m++) {
                    var tm = state.direction === 'forward' ? t - m : t + m;
                    if (tm < 0 || tm > DiffCore.T) break;
                    var fr = frameAt(state, tm);
                    pts.push(fr[pi]);
                }
                for (m = 0; m + 1 < pts.length; m++) {
                    var q0 = toPx(pts[m][0], pts[m][1], W, H);
                    var q1 = toPx(pts[m + 1][0], pts[m + 1][1], W, H);
                    ctx.globalAlpha = 0.85 * (1 - m / (TRAIL_LEN + 1));
                    ctx.strokeStyle = C.trail;
                    ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
                }
                ctx.globalAlpha = 1;
                if (pts.length > 0) {
                    var head = toPx(pts[0][0], pts[0][1], W, H);
                    ctx.fillStyle = C.trailNode;
                    ctx.beginPath(); ctx.arc(head.x, head.y, 3.2, 0, 2 * Math.PI); ctx.fill();
                    ctx.strokeStyle = '#1a2230';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.lineWidth = 1.4;
                }
            }
        }
    }

    function legendText(state) {
        var parts = ['points: (x, y) position, (r, g, b) color',
            'box: the [-1,1]\u00b2 data square'];
        if (state.overlays.trails) parts.push('amber: trails of ' + TRAIL_COUNT + ' tracked points');
        if (state.overlays.score) parts.push('cyan arrows: score direction (length saturates with magnitude)');
        if (state.overlays.ghost && state.direction === 'reverse') parts.push('faint: x\u0302\u2080 prediction');
        return parts.join(' \u00b7 ');
    }

    function renderMetric(state, refs) {
        var el = refs.metric;
        if (state.direction === 'reverse' && state.tIdx === 0 && state.reverseReady) {
            var key = state.sampler === 'DDPM' ? 'ddpm' : 'ddim';
            if (state.metricCache[key] === undefined) {
                state.metricCache[key] = meanNearestDistance(state, frameAt(state, 0));
            }
            el.textContent = state.sampler + ' end state: mean distance to data = ' +
                state.metricCache[key].toFixed(4);
        } else {
            el.textContent = '';
        }
    }

    function renderAll(state, refs, cv) {
        drawFrame(state, cv);
        refs.legend.textContent = legendText(state);
        refs.timeVal.textContent = state.tIdx + ' / ' + DiffCore.T;
        refs.timeSlider.value = String(state.tIdx);
        renderMetric(state, refs);
    }

    // ---------- build orchestration (chunked) ----------
    function runBuilders(state, refs, cv, builders, label, onDone) {
        var token = ++state.buildToken;
        var total = builders.length;
        function slice() {
            if (token !== state.buildToken) return; // superseded (e.g. re-regenerate)
            var t0 = Date.now();
            while (Date.now() - t0 < 40) {
                if (builders.length === 0) break;
                if (!builders[0].b.stepOnce()) {
                    builders[0].done();
                    builders.shift();
                }
            }
            if (builders.length === 0) {
                refs.status.textContent = '';
                onDone();
                return;
            }
            var done = total - builders.length;
            var frac = (done + builders[0].b.progress()) / total;
            refs.status.textContent = label + ' ' + Math.round(frac * 100) + '%';
            setTimeout(slice, 0);
        }
        setTimeout(slice, 0);
    }

    function buildReverse(state, refs, cv, onDone) {
        state.reverseReady = false;
        state.metricCache = {};
        refs.sampDdpm.disabled = true;
        refs.sampDdim.disabled = true;
        refs.regenBtn.disabled = true;
        var D = DiffCore.DEFAULTS;
        var xT = DiffCore.drawNoiseBatch(state.N, DiffCore.mulberry32(state.noiseSeed));
        var bDdpm = DiffCore.createDdpmBuilder(xT, state.engine, state.schedule,
            DiffCore.mulberry32(D.ddpmSeed));
        var bDdim = DiffCore.createDdimBuilder(xT, state.engine, state.schedule,
            DiffCore.DDIM_STEPS);
        runBuilders(state, refs, cv, [
            { b: bDdpm, done: function () { state.ddpm = bDdpm.result(); } },
            { b: bDdim, done: function () {
                state.ddim = bDdim.result();
                state.ddimIdx = DiffCore.ddimDenseIndex(state.ddim.tauSchedule);
            } }
        ], 'computing reverse trajectories\u2026', function () {
            state.reverseReady = true;
            refs.sampDdpm.disabled = false;
            refs.sampDdim.disabled = false;
            refs.regenBtn.disabled = false;
            if (onDone) onDone();
            renderAll(state, refs, cv);
        });
    }

    // ---------- init ----------
    function init() {
        var container = document.getElementById('diffusion_demo_visualizer');
        if (!container) return;
        if (container.dataset.dfvInit) return; // idempotency guard
        container.dataset.dfvInit = '1';

        // SELF-TEST GATE — nothing renders on broken math.
        var gate = DiffCore.runSelfTests();
        if (!gate.passed) {
            renderRefusal(container, 'Demo disabled: mathematical self-tests failed.', gate.failures);
            return;
        }
        // Data gate — the logo point cloud must be loaded.
        if (typeof window === 'undefined' || !window.COMPASS_POINTS ||
            !window.COMPASS_POINTS.length) {
            renderRefusal(container, 'Demo disabled: logo point data not loaded.', []);
            return;
        }

        injectCSS();
        buildHTML(container);

        var dataPts = window.COMPASS_POINTS.map(function (p) { return Float64Array.from(p); });
        var state = makeState(dataPts);
        state.trailIdx = pickTrailIndices(state.N);

        var refs = {
            canvas: document.getElementById('dfv-canvas'),
            legend: document.getElementById('dfv-legend'),
            metric: document.getElementById('dfv-metric'),
            timeSlider: document.getElementById('dfv-time'),
            timeVal: document.getElementById('dfv-time-val'),
            dirFwd: document.getElementById('dfv-dir-fwd'),
            dirRev: document.getElementById('dfv-dir-rev'),
            sampDdpm: document.getElementById('dfv-samp-ddpm'),
            sampDdim: document.getElementById('dfv-samp-ddim'),
            speedBtns: [document.getElementById('dfv-speed-slow'),
                document.getElementById('dfv-speed-med'),
                document.getElementById('dfv-speed-fast')],
            playBtn: document.getElementById('dfv-play'),
            resetBtn: document.getElementById('dfv-reset'),
            regenBtn: document.getElementById('dfv-regen'),
            tgTrails: document.getElementById('dfv-tg-trails'),
            tgScore: document.getElementById('dfv-tg-score'),
            tgGhost: document.getElementById('dfv-tg-ghost'),
            status: document.getElementById('dfv-status')
        };
        var cv = sizeCanvas(refs.canvas);

        // Forward cloud first (fast); the page is interactive as soon as it
        // lands. Reverse clouds build next in the background.
        var fb = DiffCore.createForwardBuilder(dataPts, state.schedule,
            DiffCore.mulberry32(DiffCore.DEFAULTS.forwardSeed));
        runBuilders(state, refs, cv, [
            { b: fb, done: function () { state.forwardCloud = fb.result(); } }
        ], 'computing forward trajectory\u2026', function () {
            renderAll(state, refs, cv);
            buildReverse(state, refs, cv, null);
        });

        function stopPlay() {
            state.playing = false;
            refs.playBtn.innerHTML = '&#9654; Play';
            if (state.animTimer) { clearTimeout(state.animTimer); state.animTimer = null; }
        }

        function tick() {
            if (!state.playing) return;
            var end = state.direction === 'forward' ? DiffCore.T : 0;
            var stepDir = state.direction === 'forward' ? 1 : -1;
            if (state.tIdx === end) { stopPlay(); renderAll(state, refs, cv); return; }
            state.tIdx += stepDir;
            renderAll(state, refs, cv);
            state.animTimer = setTimeout(tick, 1000 / state.fps);
        }

        function readyForCurrentMode() {
            return state.direction === 'forward'
                ? !!state.forwardCloud
                : state.reverseReady;
        }

        // ---- handlers ----
        refs.playBtn.addEventListener('click', function () {
            if (!readyForCurrentMode()) return;
            if (state.playing) { stopPlay(); return; }
            // restart from the natural start if already at the end
            var end = state.direction === 'forward' ? DiffCore.T : 0;
            if (state.tIdx === end) {
                state.tIdx = state.direction === 'forward' ? 0 : DiffCore.T;
            }
            state.playing = true;
            refs.playBtn.innerHTML = '&#10074;&#10074; Pause';
            tick();
        });

        refs.resetBtn.addEventListener('click', function () {
            stopPlay();
            state.tIdx = state.direction === 'forward' ? 0 : DiffCore.T;
            renderAll(state, refs, cv);
        });

        refs.timeSlider.addEventListener('input', function () {
            stopPlay();
            var v = parseInt(refs.timeSlider.value, 10) || 0;
            state.tIdx = Math.max(0, Math.min(DiffCore.T, v));
            renderAll(state, refs, cv);
        });

        function setDirection(dir) {
            if (state.direction === dir) return;
            if (dir === 'reverse' && !state.reverseReady) return;
            stopPlay();
            state.direction = dir;
            state.tIdx = dir === 'forward' ? 0 : DiffCore.T;
            refs.dirFwd.className = dir === 'forward' ? 'dfv-active' : '';
            refs.dirRev.className = dir === 'reverse' ? 'dfv-active' : '';
            renderAll(state, refs, cv);
        }
        refs.dirFwd.addEventListener('click', function () { setDirection('forward'); });
        refs.dirRev.addEventListener('click', function () { setDirection('reverse'); });

        function setSampler(s) {
            if (!state.reverseReady) return;
            state.sampler = s;
            refs.sampDdpm.className = s === 'DDPM' ? 'dfv-active' : '';
            refs.sampDdim.className = s === 'DDIM' ? 'dfv-active' : '';
            renderAll(state, refs, cv);
        }
        refs.sampDdpm.addEventListener('click', function () { setSampler('DDPM'); });
        refs.sampDdim.addEventListener('click', function () { setSampler('DDIM'); });

        var speeds = [8, 20, 60];
        refs.speedBtns.forEach(function (btn, i) {
            btn.addEventListener('click', function () {
                state.fps = speeds[i];
                refs.speedBtns.forEach(function (b, j) {
                    b.className = i === j ? 'dfv-active' : '';
                });
            });
        });

        refs.regenBtn.addEventListener('click', function () {
            if (!state.reverseReady) return;
            stopPlay();
            state.noiseSeed += 1; // advance the documented seed stream
            buildReverse(state, refs, cv, function () {
                if (state.direction === 'reverse') state.tIdx = DiffCore.T;
            });
        });

        refs.tgTrails.addEventListener('change', function () {
            state.overlays.trails = refs.tgTrails.checked;
            renderAll(state, refs, cv);
        });
        refs.tgScore.addEventListener('change', function () {
            state.overlays.score = refs.tgScore.checked;
            renderAll(state, refs, cv);
        });
        refs.tgGhost.addEventListener('change', function () {
            state.overlays.ghost = refs.tgGhost.checked;
            renderAll(state, refs, cv);
        });

        var resizePending = false;
        window.addEventListener('resize', function () {
            if (resizePending) return;
            resizePending = true;
            setTimeout(function () {
                resizePending = false;
                cv = sizeCanvas(refs.canvas);
                if (readyForCurrentMode()) renderAll(state, refs, cv);
            }, 100);
        });
    }

    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();