// sec5_p14_diffusion_demo.js
// Diffusion Models Visualizer — MATH-CS COMPASS, ml-14
//
// Forward / reverse diffusion of the COMPASS logo point cloud,
// with toggleable DDPM (stochastic) and DDIM (deterministic) samplers.
//
// Architecture (six modules):
//   1. Math primitives    — Gaussian sampling, schedule precomputation
//   2. Score network      — analytical score from empirical data
//   3. Forward process    — data → noise simulation
//   4. DDPM sampling      — stochastic ancestral sampling
//   5. DDIM sampling      — deterministic accelerated sampling
//   6. Visualization & UI — canvas rendering, controls, animation
//
// Mathematical specification follows ml14_demo_spec_handout_v1.md
// (variance-preserving DDPM, T=200, linear β schedule, joint 5D diffusion
// on (x, y, r, g, b) ∈ [-1, +1]^5).


// ====== MODULE 1 ======
// Math primitives: Gaussian sampling, noise schedule, log-sum-exp.
// All functions are pure (no DOM, no global state).

const DIM = 5;       // (x, y, r, g, b)
const T = 100;       // total diffusion steps
const BETA_MIN = 1e-4;
const BETA_MAX = 0.10;

/**
 * Box-Muller transform for standard Gaussian sampling.
 * Returns one sample ~ N(0, 1).
 */
function randn() {
    let u1 = 0, u2 = 0;
    // Avoid log(0): resample until u1 > 0
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Sample a DIM-dimensional standard Gaussian vector ~ N(0, I_DIM).
 */
function randnVec(dim = DIM) {
    const v = new Float32Array(dim);
    for (let i = 0; i < dim; i++) v[i] = randn();
    return v;
}

/**
 * Precompute the noise schedule and cumulative products.
 * Returns:
 *   beta:        β_t for t = 1..T,  beta[t-1] = β_t
 *   alpha:       α_t = 1 - β_t
 *   alphaBar:    ᾱ_t = ∏_{s=1}^t α_s
 *   sqrtAlphaBar:      √ᾱ_t
 *   sqrtOneMinusAlphaBar: √(1 - ᾱ_t)
 *   sqrtAlpha:   √α_t
 *
 * Note on indexing: time indices in the math are 1..T. Here we use
 * 0-based arrays of length T where arr[t-1] corresponds to step t.
 * The convention ᾱ_0 = 1 (empty product) is used implicitly when
 * needed (e.g. in DDIM when stepping to s = 0).
 */
function buildSchedule() {
    const beta = new Float32Array(T);
    const alpha = new Float32Array(T);
    const alphaBar = new Float32Array(T);
    const sqrtAlphaBar = new Float32Array(T);
    const sqrtOneMinusAlphaBar = new Float32Array(T);
    const sqrtAlpha = new Float32Array(T);

    let cumprod = 1.0;
    for (let i = 0; i < T; i++) {
        // Linear schedule from β_min to β_max
        beta[i] = BETA_MIN + (BETA_MAX - BETA_MIN) * (i / (T - 1));
        alpha[i] = 1.0 - beta[i];
        cumprod *= alpha[i];
        alphaBar[i] = cumprod;
        sqrtAlphaBar[i] = Math.sqrt(cumprod);
        sqrtOneMinusAlphaBar[i] = Math.sqrt(1.0 - cumprod);
        sqrtAlpha[i] = Math.sqrt(alpha[i]);
    }

    return {
        beta, alpha, alphaBar,
        sqrtAlphaBar, sqrtOneMinusAlphaBar, sqrtAlpha,
    };
}

/**
 * Helper: alphaBar at "virtual time" t, where t = 0 means ᾱ_0 = 1
 * (the convention for the endpoint of DDIM sampling).
 * For t in 1..T, returns schedule.alphaBar[t-1].
 */
function alphaBarAt(schedule, t) {
    if (t === 0) return 1.0;
    return schedule.alphaBar[t - 1];
}

/**
 * Numerically stable log-sum-exp.
 * Given an array of log-weights, returns log(Σ exp(logW_i)).
 * Subtracts the max before exponentiating to avoid overflow.
 */
function logSumExp(logWeights) {
    let maxLog = -Infinity;
    for (let i = 0; i < logWeights.length; i++) {
        if (logWeights[i] > maxLog) maxLog = logWeights[i];
    }
    if (!isFinite(maxLog)) return maxLog;
    let sum = 0;
    for (let i = 0; i < logWeights.length; i++) {
        sum += Math.exp(logWeights[i] - maxLog);
    }
    return maxLog + Math.log(sum);
}


// ====== MODULE 2 ======
// Analytical score function for the empirical data distribution.
//
// The data distribution is a finite mixture of point masses on the
// COMPASS logo points {x_0^(i)}. After applying the forward diffusion
// kernel, the marginal q_t(x_t) is an exact Gaussian mixture:
//
//   q_t(x_t) = (1/N) Σ_i N(x_t; √ᾱ_t · x_0^(i), (1 - ᾱ_t) I)
//
// The score ∇_x log q_t(x_t) is computable in closed form:
//
//   score(x_t, t) = (1 / (1 - ᾱ_t)) Σ_i w_i(x_t) · (√ᾱ_t · x_0^(i) - x_t)
//
// where w_i are softmax weights of the squared distances to each
// component mean. We use log-sum-exp for numerical stability.

// Score function configuration.
// Threshold-based softmax pruning: components with log-weight < (maxLog - SCORE_LOG_THRESHOLD)
// contribute exp(-SCORE_LOG_THRESHOLD) ≈ exp(-12) ≈ 6e-6 to the normalized softmax.
const SCORE_LOG_THRESHOLD = 12.0;

// Module-level buffers reused across calls to avoid allocation overhead.
const _scoreBuffers = {
    logW: null,
    score: null,
    dataFlat: null,    // Flattened (N×DIM) data array, contiguous storage.
    scaledData: null,  // Precomputed √ᾱ_t · dataFlat for current step.
    cachedTIdx: -1,    // Last tIdx the scaledData was prepared for.
};

/**
 * Prepare module-level buffers and the flat data array.
 * Call once when the data set (or its size) changes.
 */
function prepareDataBuffers(dataPts) {
    const N = dataPts.length;
    _scoreBuffers.logW = new Float32Array(N);
    _scoreBuffers.score = new Float32Array(DIM);
    _scoreBuffers.dataFlat = new Float32Array(N * DIM);
    _scoreBuffers.scaledData = new Float32Array(N * DIM);
    for (let i = 0; i < N; i++) {
        const v = dataPts[i];
        const base = i * DIM;
        for (let d = 0; d < DIM; d++) {
            _scoreBuffers.dataFlat[base + d] = v[d];
        }
    }
    _scoreBuffers.cachedTIdx = -1;  // invalidate
}

/**
 * Update _scoreBuffers.scaledData to hold √ᾱ_t · dataFlat for the given tIdx.
 * Idempotent — does nothing if already cached for this tIdx.
 */
function updateScaledData(tIdx, schedule) {
    if (_scoreBuffers.cachedTIdx === tIdx) return;
    const sqrtAB = schedule.sqrtAlphaBar[tIdx];
    const dataFlat = _scoreBuffers.dataFlat;
    const scaledData = _scoreBuffers.scaledData;
    const N5 = dataFlat.length;
    for (let i = 0; i < N5; i++) {
        scaledData[i] = sqrtAB * dataFlat[i];
    }
    _scoreBuffers.cachedTIdx = tIdx;
}

/**
 * Compute the score ∇_x log q_t(x_t) for a single point x_t at time t.
 *
 * Optimizations:
 *  - Pre-allocated buffers (no per-call allocation).
 *  - Flat 5D data array with cache-friendly contiguous access.
 *  - Pre-scaled data √ᾱ_t · x_0^(i), cached per step (shared across all
 *    samples that hit this score function at the same time index).
 *  - Unrolled 5-dimensional distance computation.
 *  - Threshold-based softmax pruning: Math.exp only on components within
 *    SCORE_LOG_THRESHOLD of the maximum.
 *
 * The returned buffer is shared; callers that need to retain the value
 * must copy it before another computeScore call.
 *
 * Requires prepareDataBuffers(dataPts) to have been called earlier.
 */
function computeScore(xt, tIdx, dataPts, schedule) {
    const N = dataPts.length;
    if (!_scoreBuffers.scaledData || _scoreBuffers.scaledData.length !== N * DIM) {
        prepareDataBuffers(dataPts);
    }
    updateScaledData(tIdx, schedule);

    const logW = _scoreBuffers.logW;
    const score = _scoreBuffers.score;
    const scaledData = _scoreBuffers.scaledData;
    const dataFlat = _scoreBuffers.dataFlat;

    const oneMinusAB = 1.0 - schedule.alphaBar[tIdx];
    const invOneMinusAB = 1.0 / oneMinusAB;
    const sqrtAB = schedule.sqrtAlphaBar[tIdx];
    const halfInvOMAB = 0.5 * invOneMinusAB;

    // Unrolled 5D distance, working from pre-scaled data
    const xt0 = xt[0], xt1 = xt[1], xt2 = xt[2], xt3 = xt[3], xt4 = xt[4];
    let maxLog = -Infinity;
    for (let i = 0; i < N; i++) {
        const base = i * 5;
        const e0 = xt0 - scaledData[base    ];
        const e1 = xt1 - scaledData[base + 1];
        const e2 = xt2 - scaledData[base + 2];
        const e3 = xt3 - scaledData[base + 3];
        const e4 = xt4 - scaledData[base + 4];
        const sq = e0*e0 + e1*e1 + e2*e2 + e3*e3 + e4*e4;
        const lw = -sq * halfInvOMAB;
        logW[i] = lw;
        if (lw > maxLog) maxLog = lw;
    }
    const cutoff = maxLog - SCORE_LOG_THRESHOLD;

    // Pass 2: accumulate weighted mean μ_w (in score buffer), skipping
    // negligible components.
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    let sumExp = 0;
    for (let i = 0; i < N; i++) {
        if (logW[i] < cutoff) continue;
        const w = Math.exp(logW[i] - maxLog);
        sumExp += w;
        const base = i * 5;
        s0 += w * dataFlat[base    ];
        s1 += w * dataFlat[base + 1];
        s2 += w * dataFlat[base + 2];
        s3 += w * dataFlat[base + 3];
        s4 += w * dataFlat[base + 4];
    }
    const invSum = 1.0 / sumExp;
    score[0] = invOneMinusAB * (sqrtAB * s0 * invSum - xt0);
    score[1] = invOneMinusAB * (sqrtAB * s1 * invSum - xt1);
    score[2] = invOneMinusAB * (sqrtAB * s2 * invSum - xt2);
    score[3] = invOneMinusAB * (sqrtAB * s3 * invSum - xt3);
    score[4] = invOneMinusAB * (sqrtAB * s4 * invSum - xt4);

    return score;
}

/**
 * Convert score to noise-prediction (DDPM-SGM bridge):
 *   ε_θ(x_t, t) = -√(1-ᾱ_t) · score(x_t, t)
 *
 * @returns Float32Array of length DIM, the predicted noise
 */
function scoreToNoise(score, tIdx, schedule) {
    const sigma = schedule.sqrtOneMinusAlphaBar[tIdx];
    const eps = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) {
        eps[d] = -sigma * score[d];
    }
    return eps;
}

/**
 * Convenience: compute the predicted noise ε_θ(x_t, t) directly.
 * Composes computeScore and scoreToNoise.
 */
function predictNoise(xt, tIdx, dataPts, schedule) {
    const score = computeScore(xt, tIdx, dataPts, schedule);
    return scoreToNoise(score, tIdx, schedule);
}


// ====== MODULE 3 ======
// Forward diffusion: simulate x_0 → x_T step by step (or sample directly
// using the closed-form marginal).
//
// Two interfaces:
//   forwardStep(xPrev, tIdx, schedule)  — one step x_{t-1} → x_t
//   forwardTrajectory(x0, schedule)     — full trajectory [x_0, x_1, ..., x_T]
//   forwardJump(x0, tIdx, schedule)     — direct sampling from q(x_t | x_0)
//                                          using the one-shot reparametrisation.

/**
 * One forward step using the kernel q(x_t | x_{t-1}) = N(√(1-β_t) x_{t-1}, β_t I).
 *
 * @param xPrev    Float32Array of length DIM, the previous state x_{t-1}
 * @param tIdx     0-based time index (math step t = tIdx + 1)
 * @param schedule output of buildSchedule()
 * @returns        Float32Array of length DIM, the next state x_t
 */
function forwardStep(xPrev, tIdx, schedule) {
    const sqrtAlpha = schedule.sqrtAlpha[tIdx];
    const sqrtBeta = Math.sqrt(schedule.beta[tIdx]);
    const eps = randnVec(DIM);
    const xt = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) {
        xt[d] = sqrtAlpha * xPrev[d] + sqrtBeta * eps[d];
    }
    return xt;
}

/**
 * Full forward trajectory [x_0, x_1, ..., x_T], step by step.
 * Returns an Array of length T+1 of Float32Array(DIM).
 *
 * For visualization purposes when we want to see the chain evolve.
 */
function forwardTrajectory(x0, schedule) {
    const traj = new Array(T + 1);
    traj[0] = x0.slice();  // copy
    let xt = x0.slice();
    for (let i = 0; i < T; i++) {
        xt = forwardStep(xt, i, schedule);
        traj[i + 1] = xt;
    }
    return traj;
}

/**
 * Direct sample from the closed-form marginal q(x_t | x_0):
 *   x_t = √ᾱ_t · x_0 + √(1-ᾱ_t) · ε,  ε ~ N(0, I).
 *
 * Useful when we only need a specific time index, or when computing
 * the forward visualization with fixed noise (slider scrubbing).
 *
 * @param x0      Float32Array of length DIM
 * @param tIdx    0-based time index
 * @param schedule schedule
 * @param eps     optional pre-drawn noise (Float32Array). If omitted, fresh noise.
 */
function forwardJump(x0, tIdx, schedule, eps) {
    const sqrtAB = schedule.sqrtAlphaBar[tIdx];
    const sqrtOMAB = schedule.sqrtOneMinusAlphaBar[tIdx];
    const e = eps || randnVec(DIM);
    const xt = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) {
        xt[d] = sqrtAB * x0[d] + sqrtOMAB * e[d];
    }
    return xt;
}

/**
 * Run forward diffusion on the entire point cloud, producing a trajectory
 * for each point. To keep memory bounded, we use forwardJump with shared
 * noise per timestep across all points (faithful — each point gets its
 * own independent noise per step, but the noise SCHEDULE is deterministic
 * if we cache the ε draws).
 *
 * Returns:
 *   trajectories[t] = Array of Float32Array(DIM), length N
 *     where t ranges 0..T and trajectories[0] is the data point cloud.
 *
 * Implementation strategy: precompute a noise tensor ε[t][i] ∈ R^DIM,
 * then at any t the noisy state of point i is determined by the one-shot
 * formula. This makes slider scrubbing free of stochastic re-draw.
 */
function buildForwardCloud(dataPts, schedule) {
    const N = dataPts.length;
    // Pre-draw one independent ε per (point, step). We use the one-shot
    // formula with a SINGLE ε per (i, t) — this is the closed-form
    // marginal sampling and is consistent (mathematically equivalent
    // for the marginal at time t).
    const cloud = new Array(T + 1);
    cloud[0] = dataPts.map(p => p.slice());  // x_0

    // Pre-draw a "noise tensor" of shape (T, N, DIM). One ε vector per point
    // per timestep, used in the one-shot formula. Memory: T·N·DIM·4 bytes
    // = 200·1500·5·4 = 6 MB — acceptable.
    const eps = new Array(T);
    for (let t = 0; t < T; t++) {
        eps[t] = new Array(N);
        for (let i = 0; i < N; i++) {
            eps[t][i] = randnVec(DIM);
        }
    }

    for (let t = 1; t <= T; t++) {
        const sqrtAB = schedule.sqrtAlphaBar[t - 1];
        const sqrtOMAB = schedule.sqrtOneMinusAlphaBar[t - 1];
        const layer = new Array(N);
        for (let i = 0; i < N; i++) {
            const x0i = dataPts[i];
            const e = eps[t - 1][i];
            const xt = new Float32Array(DIM);
            for (let d = 0; d < DIM; d++) {
                xt[d] = sqrtAB * x0i[d] + sqrtOMAB * e[d];
            }
            layer[i] = xt;
        }
        cloud[t] = layer;
    }

    return cloud;
}


// ====== MODULE 4 ======
// DDPM ancestral sampling.
//
// Implements Algorithm 25.2 (Murphy) / Ho-Jain-Abbeel 2020 Algorithm 2:
//   x_T ~ N(0, I)
//   for t = T, T-1, ..., 1:
//     z ~ N(0, I) if t > 1, else z = 0
//     x_{t-1} = (1/√α_t) (x_t - β_t/√(1-ᾱ_t) · ε_θ(x_t, t)) + σ_t · z
//
// We use σ_t² = β_t (the upper-bound choice; simpler than β̃_t).

/**
 * One DDPM reverse step: x_t → x_{t-1}.
 *
 * @param xt        Float32Array of length DIM, current noisy state
 * @param tIdx      0-based time index (math step t = tIdx + 1)
 * @param dataPts   logo points (used to compute analytical score)
 * @param schedule  schedule
 * @returns         Float32Array of length DIM, the next state x_{t-1}
 */
function ddpmStep(xt, tIdx, dataPts, schedule) {
    const epsTheta = predictNoise(xt, tIdx, dataPts, schedule);
    const sqrtAlpha = schedule.sqrtAlpha[tIdx];
    const beta = schedule.beta[tIdx];
    const sqrtOMAB = schedule.sqrtOneMinusAlphaBar[tIdx];

    // Compute the deterministic mean μ_θ(x_t, t):
    //   (1/√α_t) · (x_t - β_t/√(1-ᾱ_t) · ε_θ)
    const coeff = beta / sqrtOMAB;
    const invSqrtAlpha = 1.0 / sqrtAlpha;
    const mean = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) {
        mean[d] = invSqrtAlpha * (xt[d] - coeff * epsTheta[d]);
    }

    // Add noise σ_t · z, except at the final step t = 1 (tIdx = 0).
    // Use σ_t = √β_t (the simpler upper-bound choice).
    const xPrev = new Float32Array(DIM);
    if (tIdx === 0) {
        // Final step: no noise
        for (let d = 0; d < DIM; d++) xPrev[d] = mean[d];
    } else {
        const sigma = Math.sqrt(beta);
        const z = randnVec(DIM);
        for (let d = 0; d < DIM; d++) {
            xPrev[d] = mean[d] + sigma * z[d];
        }
    }
    return xPrev;
}

/**
 * Full DDPM reverse pass starting from x_T.
 * If x_T is omitted, draws fresh noise.
 *
 * Returns the full trajectory [x_T, x_{T-1}, ..., x_0]
 * as an Array of length T+1 of Float32Array(DIM).
 *
 * For the point-cloud demo this is called once per point.
 */
function ddpmReverseTrajectory(xT, dataPts, schedule) {
    const start = xT ? xT.slice() : randnVec(DIM);
    const traj = new Array(T + 1);
    traj[T] = start;
    let xt = start.slice();
    // Step from t = T down to t = 1, producing x_{T-1}, ..., x_0.
    for (let t = T; t >= 1; t--) {
        const tIdx = t - 1;
        xt = ddpmStep(xt, tIdx, dataPts, schedule);
        traj[t - 1] = xt;
    }
    return traj;
}

/**
 * Run DDPM reverse on a batch of starting points (one per data point).
 * Returns cloud[t] = Array of Float32Array(DIM), length N, for t in 0..T.
 *
 * Used by the demo to produce a full reverse trajectory cache so that
 * the time slider can scrub through arbitrary intermediate states.
 */
function ddpmReverseCloud(xTbatch, dataPts, schedule) {
    const N = xTbatch.length;
    const cloud = new Array(T + 1);
    // Initialize cloud[T] with the batch of starting points
    cloud[T] = xTbatch.map(p => p.slice());
    // Current state across all N samples
    let cur = xTbatch.map(p => p.slice());

    for (let t = T; t >= 1; t--) {
        const tIdx = t - 1;
        const next = new Array(N);
        for (let i = 0; i < N; i++) {
            next[i] = ddpmStep(cur[i], tIdx, dataPts, schedule);
        }
        cloud[t - 1] = next;
        cur = next;
    }
    return cloud;
}


// ====== MODULE 5 ======
// DDIM deterministic sampling.
//
// Same trained "noise predictor" (here, analytical), but a different
// reverse procedure that is deterministic (given x_T) and can skip steps.
//
// For step t → s (where s < t, s could be 0 at the end):
//   x̂_0 = (x_t - √(1-ᾱ_t) · ε_θ(x_t, t)) / √ᾱ_t
//   x_s = √ᾱ_s · x̂_0 + √(1-ᾱ_s) · ε_θ(x_t, t)
//
// The convention ᾱ_0 = 1 makes the final step (s = 0) reduce to
// x_0 = x̂_0, as expected.

const DDIM_STEPS = 20;  // number of sampling steps (S in handout); with T=100 this is 5x speedup

/**
 * Build a strictly-decreasing schedule of DDIM step indices τ_S > τ_{S-1} > ... > τ_1 > τ_0 = 0
 * with τ_S = T. Implemented as approximately evenly spaced in {0, 1, ..., T}.
 *
 * @returns Int32Array of length S+1, where result[i] = τ_i (math index, 0..T).
 *          result[0] = 0, result[S] = T.
 */
function buildDDIMSchedule(S = DDIM_STEPS) {
    const out = new Int32Array(S + 1);
    out[0] = 0;
    out[S] = T;
    // Evenly distribute the intermediate ones in (0, T).
    // We want τ_1, ..., τ_{S-1} in increasing order.
    for (let i = 1; i < S; i++) {
        out[i] = Math.round((i / S) * T);
    }
    // Ensure strictly increasing (handle any rounding collisions)
    for (let i = 1; i <= S; i++) {
        if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 1;
    }
    return out;
}

/**
 * One DDIM step: x_t → x_s, where t = τ_i and s = τ_{i-1}.
 *
 * Time indices here are MATH indices (1..T or 0 for the endpoint).
 *
 * @param xt        current state at time t
 * @param tMath     math time index of current state (1..T)
 * @param sMath     math time index of target state (0..t-1)
 */
function ddimStep(xt, tMath, sMath, dataPts, schedule) {
    const tIdx = tMath - 1;  // 0-based for arrays
    const alphaBarT = schedule.alphaBar[tIdx];
    const sqrtABt = schedule.sqrtAlphaBar[tIdx];
    const sqrtOMABt = schedule.sqrtOneMinusAlphaBar[tIdx];

    // ε_θ at time t (from analytical score)
    const epsTheta = predictNoise(xt, tIdx, dataPts, schedule);

    // Predicted x_0
    const x0hat = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) {
        x0hat[d] = (xt[d] - sqrtOMABt * epsTheta[d]) / sqrtABt;
    }

    // ᾱ_s (use convention ᾱ_0 = 1)
    const alphaBarS = alphaBarAt(schedule, sMath);
    const sqrtABs = Math.sqrt(alphaBarS);
    const sqrtOMABs = Math.sqrt(1.0 - alphaBarS);

    // x_s = √ᾱ_s · x̂_0 + √(1-ᾱ_s) · ε_θ
    const xs = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) {
        xs[d] = sqrtABs * x0hat[d] + sqrtOMABs * epsTheta[d];
    }
    return xs;
}

/**
 * Full DDIM reverse trajectory starting from x_T, with S steps.
 * Returns an Array of length S+1, indexed by stepIdx (NOT by math time t).
 *   result[S] = x_T
 *   result[i] for i = S, S-1, ..., 0 is x_{τ_i}.
 *   result[0] = x_0.
 *
 * If you need to align with the time slider (which goes 0..T), use
 * the τ schedule to look up which slider position corresponds to
 * which sampled state. Intermediate slider positions can be filled
 * by linear interpolation, OR the slider can be restricted to the
 * S+1 sampled positions when DDIM mode is active.
 *
 * For the demo we cache the FULL DDIM cloud (per-point trajectories,
 * resampled onto every t ∈ 0..T via piecewise-constant or linear
 * interpolation for slider compatibility).
 */
function ddimReverseTrajectory(xT, dataPts, schedule, S = DDIM_STEPS) {
    const tauSchedule = buildDDIMSchedule(S);
    const start = xT ? xT.slice() : randnVec(DIM);

    // sparseTraj[i] = state at math time τ_i, for i = 0..S
    const sparseTraj = new Array(S + 1);
    sparseTraj[S] = start;
    let cur = start.slice();
    for (let i = S; i >= 1; i--) {
        const tMath = tauSchedule[i];
        const sMath = tauSchedule[i - 1];
        cur = ddimStep(cur, tMath, sMath, dataPts, schedule);
        sparseTraj[i - 1] = cur;
    }
    return { sparseTraj, tauSchedule };
}

/**
 * Run DDIM reverse on a batch of starting points.
 * Returns sparse cloud (only at τ indices), plus the τ schedule.
 *
 *   sparseCloud[i] = Array of Float32Array(DIM), length N
 *                    = state at math time τ_i, for i = 0..S
 *
 * For slider scrubbing, see densifyDDIMCloud below.
 */
function ddimReverseCloud(xTbatch, dataPts, schedule, S = DDIM_STEPS) {
    const tauSchedule = buildDDIMSchedule(S);
    const N = xTbatch.length;
    const sparseCloud = new Array(S + 1);
    sparseCloud[S] = xTbatch.map(p => p.slice());
    let cur = xTbatch.map(p => p.slice());

    for (let i = S; i >= 1; i--) {
        const tMath = tauSchedule[i];
        const sMath = tauSchedule[i - 1];
        const next = new Array(N);
        for (let n = 0; n < N; n++) {
            next[n] = ddimStep(cur[n], tMath, sMath, dataPts, schedule);
        }
        sparseCloud[i - 1] = next;
        cur = next;
    }
    return { sparseCloud, tauSchedule };
}

/**
 * Densify a DDIM sparse cloud onto every t ∈ 0..T using nearest-tau
 * (piecewise-constant). This is purely for slider visualization;
 * the actual DDIM trajectory has only S+1 distinct states.
 *
 * @param sparseCloud   from ddimReverseCloud
 * @param tauSchedule   from ddimReverseCloud
 * @returns dense cloud, Array of length T+1
 */
function densifyDDIMCloud(sparseCloud, tauSchedule) {
    const S = tauSchedule.length - 1;
    const dense = new Array(T + 1);
    for (let t = 0; t <= T; t++) {
        // Find the largest i such that τ_i <= t (nearest below).
        // The visible state at intermediate slider position t is the
        // most recently computed sparse state — i.e. the latest τ_i ≤ t.
        let i = 0;
        for (let k = S; k >= 0; k--) {
            if (tauSchedule[k] <= t) { i = k; break; }
        }
        dense[t] = sparseCloud[i];
    }
    return dense;
}


// ====== MODULE 6a ======
// State management and cache construction.
//
// Centralizes all demo state in one object. The caches (forwardCloud,
// ddpmCloud, ddimCloud) are precomputed full trajectories so that the
// time slider can scrub through any intermediate state instantly.

/**
 * Default UI configuration.
 */
const DEMO_DEFAULTS = {
    direction: 'forward',  // 'forward' | 'reverse'
    sampler: 'DDPM',       // 'DDPM' | 'DDIM'
    tIdx: 0,               // 0..T (slider position, math time t)
    playing: false,
    speed: 'medium',       // 'slow' | 'medium' | 'fast'
};

const SPEED_FPS = {
    slow: 8,
    medium: 20,
    fast: 60,
};

/**
 * Load the COMPASS logo point cloud from window.COMPASS_POINTS.
 * Returns Array of Float32Array(DIM), length N.
 */
function loadDataPoints() {
    if (!window.COMPASS_POINTS) {
        console.error('[ml-14 demo] window.COMPASS_POINTS not loaded');
        return null;
    }
    const raw = window.COMPASS_POINTS;
    const N = raw.length;
    const out = new Array(N);
    for (let i = 0; i < N; i++) {
        out[i] = Float32Array.from(raw[i]);
    }
    return out;
}

/**
 * Draw a fresh batch of N starting noise vectors x_T^(i) ~ N(0, I).
 */
function drawNoiseBatch(N) {
    const out = new Array(N);
    for (let i = 0; i < N; i++) {
        out[i] = randnVec(DIM);
    }
    return out;
}

/**
 * Build the full forward cloud (data → noise) once.
 * This depends only on dataPts and schedule; the random ε draws inside
 * are cached implicitly (one independent draw per (point, step)),
 * so the resulting trajectory is fixed for the lifetime of the cache.
 *
 * The slider scrubbing through forward direction always shows this cache.
 */
function rebuildForwardCloud(state) {
    state.forwardCloud = buildForwardCloud(state.dataPts, state.schedule);
}

/**
 * Rebuild the DDPM and DDIM reverse clouds from the current xTbatch.
 * Called on initialization and on "regenerate noise" action.
 */
function rebuildReverseClouds(state) {
    // DDPM: full ancestral trajectory
    state.ddpmCloud = ddpmReverseCloud(state.xTbatch, state.dataPts, state.schedule);

    // DDIM: sparse trajectory + densified for slider use
    const ddimResult = ddimReverseCloud(state.xTbatch, state.dataPts, state.schedule, DDIM_STEPS);
    state.ddimSparseCloud = ddimResult.sparseCloud;
    state.tauSchedule = ddimResult.tauSchedule;
    state.ddimCloud = densifyDDIMCloud(ddimResult.sparseCloud, ddimResult.tauSchedule);
}

/**
 * Create the demo state object. dataPts must be loaded beforehand.
 *
 * @param dataPts Array of Float32Array(DIM)
 * @returns state object
 */
function createDemoState(dataPts) {
    const schedule = buildSchedule();
    const N = dataPts.length;

    // Prepare the score function's data buffers (flat array, scaled buffer)
    prepareDataBuffers(dataPts);

    const xTbatch = drawNoiseBatch(N);

    const state = {
        // Static data
        dataPts,
        schedule,
        N,

        // UI state
        direction: DEMO_DEFAULTS.direction,
        sampler: DEMO_DEFAULTS.sampler,
        tIdx: DEMO_DEFAULTS.tIdx,
        playing: DEMO_DEFAULTS.playing,
        speed: DEMO_DEFAULTS.speed,

        // Reverse-direction initial noise
        xTbatch,

        // Caches (filled by rebuildXxx functions)
        forwardCloud: null,
        ddpmCloud: null,
        ddimSparseCloud: null,
        tauSchedule: null,
        ddimCloud: null,

        // Animation
        animationHandle: null,
        lastFrameTime: 0,
    };

    rebuildForwardCloud(state);
    rebuildReverseClouds(state);

    return state;
}

/**
 * Return the cloud array currently selected by (direction, sampler).
 * The returned cloud is indexed by t in 0..T.
 *
 * @param state demo state
 * @returns Array of length T+1, each entry is Array of Float32Array(DIM)
 */
function getCurrentCloud(state) {
    if (state.direction === 'forward') {
        return state.forwardCloud;
    }
    // reverse
    return state.sampler === 'DDPM' ? state.ddpmCloud : state.ddimCloud;
}

/**
 * Get the point cloud at the current slider position.
 * @returns Array of Float32Array(DIM), length N
 */
function getCurrentFrame(state) {
    const cloud = getCurrentCloud(state);
    return cloud[state.tIdx];
}

/**
 * Action: regenerate the reverse-direction starting noise.
 * Triggers a recompute of both DDPM and DDIM clouds.
 */
function regenerateNoise(state) {
    state.xTbatch = drawNoiseBatch(state.N);
    rebuildReverseClouds(state);
}

/**
 * Reset slider to the natural starting state for the current direction:
 *   forward → tIdx = 0 (clean data)
 *   reverse → tIdx = T (pure noise)
 */
function resetSliderPosition(state) {
    state.tIdx = (state.direction === 'forward') ? 0 : T;
}


// ====== MODULE 6b ======
// Canvas rendering.
// Pure rendering: takes state and writes to canvas. No state mutation.
// Theme-aware via CSS variables on html[data-theme="dark"].

const CANVAS_LOGICAL_SIZE = 600;  // default logical px size (square)
const PLOT_MARGIN = 0.18;         // fraction of canvas reserved as margin
                                  // plot region = [PLOT_MARGIN, 1-PLOT_MARGIN] of canvas

const POINT_RADIUS_PX = 2.5;      // visual radius of each point in CSS pixels

// Theme-dependent palette. Resolved lazily from CSS custom properties so
// the demo follows the user's site theme automatically.
function getPalette() {
    const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
    return {
        bg:           isDark ? '#1a1d24' : '#f8f9fb',
        bgFrame:      isDark ? '#252932' : '#eef0f3',
        gridLine:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
        axisLine:     isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)',
        boundCircle:  isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)',
        label:        isDark ? 'rgba(230,232,240,0.65)' : 'rgba(40,42,50,0.70)',
    };
}

/**
 * Initialize a canvas to a fixed logical size with DPR support.
 *
 * @param canvas DOM canvas element
 * @param logicalSize size in CSS pixels (canvas is square)
 * @returns {ctx, W, H} where W=H=logicalSize
 */
function setupDiffusionCanvas(canvas, logicalSize = CANVAS_LOGICAL_SIZE) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = logicalSize * dpr;
    canvas.height = logicalSize * dpr;
    canvas.style.width  = logicalSize + 'px';
    canvas.style.height = logicalSize + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, W: logicalSize, H: logicalSize };
}

/**
 * Convert math coordinate (x, y) ∈ [-1, +1]^2 to canvas pixel (cx, cy).
 * The visible math region [-1, +1] maps to the inner plot region of the canvas,
 * with PLOT_MARGIN reserved on each side for breathing room.
 *
 * Returns {cx, cy} in CSS pixel coordinates within the canvas.
 */
function mathToPixel(x, y, W, H) {
    const innerW = W * (1 - 2 * PLOT_MARGIN);
    const innerH = H * (1 - 2 * PLOT_MARGIN);
    const offsetX = W * PLOT_MARGIN;
    const offsetY = H * PLOT_MARGIN;
    // Math y points up; canvas y points down. Flip y.
    const cx = offsetX + ((x + 1) / 2) * innerW;
    const cy = offsetY + ((1 - y) / 2) * innerH;
    return { cx, cy };
}

/**
 * Convert a 5D state value (the colour components) to an "rgb(...)" string.
 * Colour values in the demo live in [-1, +1]; we map to [0, 255] and clip.
 *
 * @param r,g,b channel values in [-1, +1] (may exceed during diffusion)
 * @returns string suitable for fillStyle
 */
function colorString(r, g, b) {
    const ri = Math.max(0, Math.min(255, Math.round((r + 1) * 127.5)));
    const gi = Math.max(0, Math.min(255, Math.round((g + 1) * 127.5)));
    const bi = Math.max(0, Math.min(255, Math.round((b + 1) * 127.5)));
    return `rgb(${ri},${gi},${bi})`;
}

/**
 * Draw the static background: framed plot area, reference grid,
 * bounding circle (r = 0.9 in math units, where the data lives).
 */
function drawBackground(ctx, W, H, palette) {
    // Outer canvas fill
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    // Inner plot region with a slightly different shade
    const offsetX = W * PLOT_MARGIN;
    const offsetY = H * PLOT_MARGIN;
    const innerW = W * (1 - 2 * PLOT_MARGIN);
    const innerH = H * (1 - 2 * PLOT_MARGIN);
    ctx.fillStyle = palette.bgFrame;
    ctx.fillRect(offsetX, offsetY, innerW, innerH);

    // Grid: light lines at math-coord 0
    ctx.strokeStyle = palette.gridLine;
    ctx.lineWidth = 1;
    const origin = mathToPixel(0, 0, W, H);
    ctx.beginPath();
    ctx.moveTo(offsetX, origin.cy);
    ctx.lineTo(offsetX + innerW, origin.cy);
    ctx.moveTo(origin.cx, offsetY);
    ctx.lineTo(origin.cx, offsetY + innerH);
    ctx.stroke();

    // Reference circle of radius 0.9 (the data extent)
    ctx.strokeStyle = palette.boundCircle;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const radiusPx = (0.9 / 2) * innerW;  // 0.9 in math units → pixels
    ctx.arc(origin.cx, origin.cy, radiusPx, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
}

/**
 * Draw a frame label in the top-left corner of the canvas, e.g. "t = 87 / 100".
 */
function drawTimeLabel(ctx, t, totalT, direction, sampler, W, H, palette) {
    ctx.fillStyle = palette.label;
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    // Forward direction does not depend on the choice of sampler, so we
    // omit it from the label to avoid implying otherwise. Only the reverse
    // direction uses a particular sampler (DDPM vs DDIM).
    const directionLabel = direction === 'forward'
        ? 'Forward'
        : `Reverse · ${sampler}`;
    const lines = [
        `t = ${t} / ${totalT}`,
        directionLabel,
    ];
    const x = 14;
    let y = 14;
    for (const line of lines) {
        ctx.fillText(line, x, y);
        y += 18;
    }
}

/**
 * Render the current frame.
 *
 * @param state demo state
 * @param ctx canvas 2D context
 * @param W,H logical canvas size
 */
function renderFrame(state, ctx, W, H) {
    const palette = getPalette();
    drawBackground(ctx, W, H, palette);

    const frame = getCurrentFrame(state);
    if (!frame) return;
    const N = frame.length;

    // Draw points as filled circles. Using fillRect+arc is faster than
    // beginPath/arc/fill per point for hundreds of points.
    for (let i = 0; i < N; i++) {
        const p = frame[i];
        const { cx, cy } = mathToPixel(p[0], p[1], W, H);
        ctx.fillStyle = colorString(p[2], p[3], p[4]);
        ctx.beginPath();
        ctx.arc(cx, cy, POINT_RADIUS_PX, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Frame label
    drawTimeLabel(ctx, state.tIdx, T, state.direction, state.sampler, W, H, palette);
}


// ====== MODULE 6c ======
// HTML structure generation.
// Builds the demo's DOM (canvas + controls) as an innerHTML string.
// Element IDs are prefixed with `diff-` to avoid collisions on the page.

/**
 * Return the full demo HTML as a string for innerHTML insertion into the
 * page-level container (#diffusion_demo_visualizer).
 *
 * Layout:
 *   .diff-demo-root
 *     .diff-canvas-wrap   (canvas + loading overlay)
 *     .diff-controls      (all interactive controls, vertically stacked)
 */
function buildDemoHTML() {
    return `
<div class="diff-demo-root">

    <div class="diff-canvas-wrap">
        <canvas id="diff-canvas" class="diff-canvas"></canvas>
        <div id="diff-loading" class="diff-loading">Computing trajectory…</div>
    </div>

    <div class="diff-controls">

        <div class="diff-row diff-row-slider">
            <label for="diff-time-slider" class="diff-label">Time</label>
            <input id="diff-time-slider" type="range" min="0" max="${T}" value="0" step="1" class="diff-slider">
            <span id="diff-time-val" class="diff-val">t = 0 / ${T}</span>
        </div>

        <div class="diff-row diff-row-toggles">
            <div class="diff-toggle-group">
                <span class="diff-group-label">Direction:</span>
                <button id="diff-dir-forward" class="diff-seg-btn diff-seg-active" data-value="forward">Forward</button>
                <button id="diff-dir-reverse" class="diff-seg-btn" data-value="reverse">Reverse</button>
            </div>
            <div class="diff-toggle-group">
                <span class="diff-group-label">Sampler:</span>
                <button id="diff-sampler-ddpm" class="diff-seg-btn diff-seg-active" data-value="DDPM">DDPM</button>
                <button id="diff-sampler-ddim" class="diff-seg-btn" data-value="DDIM">DDIM</button>
            </div>
        </div>

        <div class="diff-row diff-row-buttons">
            <button id="diff-play-btn" class="diff-btn diff-btn-primary">▶ Play</button>
            <button id="diff-reset-btn" class="diff-btn">↺ Reset</button>
            <button id="diff-regen-btn" class="diff-btn">⟳ Regenerate noise</button>
        </div>

        <div class="diff-row diff-row-slider">
            <label for="diff-speed-slider" class="diff-label">Speed</label>
            <input id="diff-speed-slider" type="range" min="0" max="2" value="1" step="1" class="diff-slider">
            <span id="diff-speed-val" class="diff-val">medium</span>
        </div>

    </div>

</div>
`;
}

/**
 * After buildDemoHTML's output has been inserted, collect references
 * to all interactive elements for event wiring in module 6e.
 *
 * @param container the demo root container element
 */
function collectDOMRefs(container) {
    const $ = (sel) => container.querySelector(sel);
    return {
        root:         $('.diff-demo-root'),
        canvas:       $('#diff-canvas'),
        loading:      $('#diff-loading'),

        timeSlider:   $('#diff-time-slider'),
        timeVal:      $('#diff-time-val'),

        dirForward:   $('#diff-dir-forward'),
        dirReverse:   $('#diff-dir-reverse'),

        samplerDDPM:  $('#diff-sampler-ddpm'),
        samplerDDIM:  $('#diff-sampler-ddim'),

        playBtn:      $('#diff-play-btn'),
        resetBtn:     $('#diff-reset-btn'),
        regenBtn:     $('#diff-regen-btn'),

        speedSlider:  $('#diff-speed-slider'),
        speedVal:     $('#diff-speed-val'),
    };
}

/**
 * Helper: update segmented-button "active" state within a group.
 * Removes diff-seg-active from siblings of the same group, adds it to target.
 */
function setActiveSegButton(group, activeBtn) {
    for (const btn of group) {
        if (btn === activeBtn) btn.classList.add('diff-seg-active');
        else btn.classList.remove('diff-seg-active');
    }
}

/**
 * Sync DOM controls to current state. Called whenever state changes
 * (programmatic or user-driven) to keep UI consistent.
 */
function syncControlsToState(state, refs) {
    // Time slider
    if (refs.timeSlider) {
        refs.timeSlider.value = String(state.tIdx);
        refs.timeVal.textContent = `t = ${state.tIdx} / ${T}`;
    }
    // Direction
    setActiveSegButton([refs.dirForward, refs.dirReverse],
        state.direction === 'forward' ? refs.dirForward : refs.dirReverse);
    // Sampler
    setActiveSegButton([refs.samplerDDPM, refs.samplerDDIM],
        state.sampler === 'DDPM' ? refs.samplerDDPM : refs.samplerDDIM);
    // Play button label
    if (refs.playBtn) {
        refs.playBtn.textContent = state.playing ? '❚❚ Pause' : '▶ Play';
    }
    // Speed
    if (refs.speedSlider) {
        const speedIdx = { slow: 0, medium: 1, fast: 2 }[state.speed] ?? 1;
        refs.speedSlider.value = String(speedIdx);
        refs.speedVal.textContent = state.speed;
    }
}

/**
 * Show or hide the loading overlay.
 */
function setLoading(refs, visible) {
    if (!refs.loading) return;
    refs.loading.style.display = visible ? 'flex' : 'none';
}


// ====== MODULE 6c ======
// HTML structure generation.
// Produces the innerHTML for the demo container. All interactive elements
// receive stable IDs so collectDOMRefs (in module 6e) can find them.

/**
 * Build the demo's inner HTML as a string. The result is meant to be
 * assigned to container.innerHTML during initialization.
 */
function buildDemoHTML() {
    return `
      <div class="diffusion-container">

        <!-- Canvas with computing overlay -->
        <div class="diffusion-canvas-wrap" id="diffusion-canvas-wrap">
          <canvas id="diffusion-canvas"></canvas>
          <div class="diffusion-status" id="diffusion-status">
            <div class="diffusion-status-inner">
              <div class="diffusion-status-spinner"></div>
              <div class="diffusion-status-text" id="diffusion-status-text">
                Preparing diffusion trajectories…
              </div>
            </div>
          </div>
        </div>

        <!-- Time slider (always above controls, full width) -->
        <div class="diffusion-time-control">
          <label class="diffusion-time-label">Time step</label>
          <input type="range" id="diffusion-time-slider"
                 min="0" max="${T}" step="1" value="0"
                 class="diffusion-slider">
          <span class="diffusion-time-readout" id="diffusion-time-readout">0 / ${T}</span>
        </div>

        <!-- Controls grid (2 columns on desktop, stacked on mobile) -->
        <div class="diffusion-controls">

          <!-- Toggle group: direction -->
          <div class="diffusion-control-group">
            <div class="diffusion-control-label">Direction</div>
            <div class="diffusion-segmented" role="tablist">
              <button class="diffusion-seg-btn diffusion-seg-active"
                      id="diffusion-direction-fwd" data-direction="forward">
                Forward
              </button>
              <button class="diffusion-seg-btn"
                      id="diffusion-direction-rev" data-direction="reverse">
                Reverse
              </button>
            </div>
            <div class="diffusion-control-hint" id="diffusion-direction-hint">
              Data → noise
            </div>
          </div>

          <!-- Toggle group: sampler -->
          <div class="diffusion-control-group">
            <div class="diffusion-control-label">Sampler</div>
            <div class="diffusion-segmented" role="tablist">
              <button class="diffusion-seg-btn diffusion-seg-active"
                      id="diffusion-sampler-ddpm" data-sampler="DDPM">
                DDPM
              </button>
              <button class="diffusion-seg-btn"
                      id="diffusion-sampler-ddim" data-sampler="DDIM">
                DDIM
              </button>
            </div>
            <div class="diffusion-control-hint" id="diffusion-sampler-hint">
              Stochastic, ${T} steps
            </div>
          </div>

          <!-- Action buttons -->
          <div class="diffusion-control-group">
            <div class="diffusion-control-label">Actions</div>
            <div class="diffusion-action-row">
              <button class="diffusion-action-btn diffusion-action-primary"
                      id="diffusion-play-btn">
                <span id="diffusion-play-icon">▶</span>
                <span id="diffusion-play-label">Play</span>
              </button>
              <button class="diffusion-action-btn"
                      id="diffusion-reset-btn">↺ Reset</button>
              <button class="diffusion-action-btn"
                      id="diffusion-regen-btn">⟳ Regenerate noise</button>
            </div>
          </div>

          <!-- Speed -->
          <div class="diffusion-control-group">
            <div class="diffusion-control-label">Animation speed</div>
            <div class="diffusion-segmented">
              <button class="diffusion-seg-btn"
                      id="diffusion-speed-slow" data-speed="slow">Slow</button>
              <button class="diffusion-seg-btn diffusion-seg-active"
                      id="diffusion-speed-med" data-speed="medium">Medium</button>
              <button class="diffusion-seg-btn"
                      id="diffusion-speed-fast" data-speed="fast">Fast</button>
            </div>
          </div>

        </div>
      </div>
    `;
}

/**
 * Collect DOM element references from the container after innerHTML insertion.
 * Returns an object with named handles to every interactive element.
 *
 * @param container the root element (#diffusion_demo_visualizer)
 */
function collectDOMRefs(container) {
    const $ = (sel) => container.querySelector(sel);
    return {
        canvas:          $('#diffusion-canvas'),
        canvasWrap:      $('#diffusion-canvas-wrap'),
        status:          $('#diffusion-status'),
        statusText:      $('#diffusion-status-text'),

        timeSlider:      $('#diffusion-time-slider'),
        timeReadout:     $('#diffusion-time-readout'),

        directionFwdBtn: $('#diffusion-direction-fwd'),
        directionRevBtn: $('#diffusion-direction-rev'),
        directionHint:   $('#diffusion-direction-hint'),

        samplerDDPMBtn:  $('#diffusion-sampler-ddpm'),
        samplerDDIMBtn:  $('#diffusion-sampler-ddim'),
        samplerHint:     $('#diffusion-sampler-hint'),

        playBtn:         $('#diffusion-play-btn'),
        playIcon:        $('#diffusion-play-icon'),
        playLabel:       $('#diffusion-play-label'),
        resetBtn:        $('#diffusion-reset-btn'),
        regenBtn:        $('#diffusion-regen-btn'),

        speedSlowBtn:    $('#diffusion-speed-slow'),
        speedMedBtn:     $('#diffusion-speed-med'),
        speedFastBtn:    $('#diffusion-speed-fast'),
    };
}


// ====== MODULE 6d ======
// CSS injection.
// Theme-aware via html[data-theme="dark"]. Mobile-responsive at 640px breakpoint.

const DIFFUSION_DEMO_CSS = `
/* ===== CSS variables: light theme default ===== */
.diffusion-container {
    --d-bg:           #f8f9fb;
    --d-bg-frame:     #ffffff;
    --d-fg:           #1f2330;
    --d-fg-muted:     #5a6172;
    --d-border:       #d6dae3;
    --d-border-hover: #b8becb;
    --d-accent:       #0731a4;
    --d-accent-fg:    #ffffff;
    --d-accent-soft:  rgba(7, 49, 164, 0.08);
    --d-shadow:       0 1px 3px rgba(0, 0, 0, 0.04);
}
html[data-theme="dark"] .diffusion-container {
    --d-bg:           #1a1d24;
    --d-bg-frame:     #252932;
    --d-fg:           #e6e8f0;
    --d-fg-muted:     #969baa;
    --d-border:       #3a3f4b;
    --d-border-hover: #4d5360;
    --d-accent:       #4a78d8;
    --d-accent-fg:    #ffffff;
    --d-accent-soft:  rgba(74, 120, 216, 0.15);
    --d-shadow:       0 1px 3px rgba(0, 0, 0, 0.3);
}

/* ===== Container ===== */
.diffusion-container {
    width: 100%;
    max-width: 720px;
    margin: 1em auto;
    padding: 18px;
    box-sizing: border-box;
    background: var(--d-bg);
    color: var(--d-fg);
    border: 1px solid var(--d-border);
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* ===== Canvas wrap with status overlay ===== */
.diffusion-canvas-wrap {
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 0 auto 16px;
    aspect-ratio: 1;
}
.diffusion-canvas-wrap canvas {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 6px;
    background: var(--d-bg-frame);
}
.diffusion-status {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--d-bg-frame);
    border-radius: 6px;
    z-index: 2;
    transition: opacity 0.3s ease;
}
.diffusion-status.diffusion-hidden {
    opacity: 0;
    pointer-events: none;
}
.diffusion-status-inner {
    text-align: center;
}
.diffusion-status-spinner {
    width: 36px;
    height: 36px;
    margin: 0 auto 12px;
    border: 3px solid var(--d-border);
    border-top-color: var(--d-accent);
    border-radius: 50%;
    animation: diffusion-spin 0.9s linear infinite;
}
@keyframes diffusion-spin {
    to { transform: rotate(360deg); }
}
.diffusion-status-text {
    font-size: 0.9rem;
    color: var(--d-fg-muted);
}

/* ===== Time slider (full-width, prominent) ===== */
.diffusion-time-control {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}
.diffusion-time-label {
    flex: 0 0 auto;
    font-size: 0.85rem;
    color: var(--d-fg-muted);
    font-weight: 500;
}
.diffusion-slider {
    flex: 1 1 auto;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: var(--d-border);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
}
.diffusion-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--d-accent);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--d-bg);
    box-shadow: var(--d-shadow);
}
.diffusion-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--d-accent);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--d-bg);
}
.diffusion-time-readout {
    flex: 0 0 auto;
    font-size: 0.85rem;
    color: var(--d-fg);
    font-variant-numeric: tabular-nums;
    min-width: 70px;
    text-align: right;
}

/* ===== Controls grid ===== */
.diffusion-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
}
.diffusion-control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.diffusion-control-label {
    font-size: 0.75rem;
    color: var(--d-fg-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.diffusion-control-hint {
    font-size: 0.78rem;
    color: var(--d-fg-muted);
    line-height: 1.3;
    min-height: 1em;
}

/* ===== Segmented buttons ===== */
.diffusion-segmented {
    display: inline-flex;
    border: 1px solid var(--d-border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--d-bg-frame);
}
.diffusion-seg-btn {
    flex: 1 1 auto;
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--d-fg);
    background: transparent;
    border: none;
    border-right: 1px solid var(--d-border);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    font-family: inherit;
    min-height: 36px;
}
.diffusion-seg-btn:last-child {
    border-right: none;
}
.diffusion-seg-btn:hover:not(.diffusion-seg-active) {
    background: var(--d-accent-soft);
}
.diffusion-seg-btn.diffusion-seg-active {
    background: var(--d-accent);
    color: var(--d-accent-fg);
    font-weight: 500;
}
.diffusion-segmented.diffusion-disabled {
    opacity: 0.45;
    pointer-events: none;
}

/* ===== Action buttons ===== */
.diffusion-action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.diffusion-action-btn {
    padding: 8px 14px;
    font-size: 0.85rem;
    color: var(--d-fg);
    background: var(--d-bg-frame);
    border: 1px solid var(--d-border);
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: background 0.15s, border-color 0.15s;
}
.diffusion-action-btn:hover {
    background: var(--d-accent-soft);
    border-color: var(--d-border-hover);
}
.diffusion-action-btn:active {
    transform: translateY(1px);
}
.diffusion-action-primary {
    background: var(--d-accent);
    color: var(--d-accent-fg);
    border-color: var(--d-accent);
}
.diffusion-action-primary:hover {
    background: var(--d-accent);
    border-color: var(--d-accent);
    filter: brightness(1.08);
}

/* ===== Mobile responsive ===== */
@media (max-width: 640px) {
    .diffusion-container {
        padding: 12px;
    }
    .diffusion-time-control {
        flex-wrap: wrap;
    }
    .diffusion-time-label {
        flex: 1 1 100%;
    }
    .diffusion-slider {
        flex: 1 1 calc(100% - 80px);
    }
    .diffusion-controls {
        grid-template-columns: 1fr;
    }
    .diffusion-action-row {
        flex-direction: column;
    }
    .diffusion-action-btn {
        width: 100%;
        justify-content: center;
    }
}
`;

/**
 * Inject the demo's CSS into the document head, once.
 * Subsequent calls are no-ops.
 */
function injectDiffusionDemoCSS() {
    if (document.getElementById('diffusion-demo-style')) return;
    const style = document.createElement('style');
    style.id = 'diffusion-demo-style';
    style.textContent = DIFFUSION_DEMO_CSS;
    document.head.appendChild(style);
}


// ====== MODULE 6e ======
// Event handlers, animation loop, and entry point.
// Wires together state, rendering, and DOM controls.

const DIRECTION_HINT = {
    forward: 'Data → noise',
    reverse: 'Noise → data',
};
const SAMPLER_HINT = {
    DDPM: `Stochastic, ${T} steps`,
    DDIM: `Deterministic, ${DDIM_STEPS} steps`,
};

/**
 * Update the active segmented-button state for a control group.
 * @param btns array of button elements
 * @param activeIdx index of the button to mark active
 */
function setSegmentedActive(btns, activeIdx) {
    for (let i = 0; i < btns.length; i++) {
        if (i === activeIdx) {
            btns[i].classList.add('diffusion-seg-active');
        } else {
            btns[i].classList.remove('diffusion-seg-active');
        }
    }
}

/**
 * Synchronize the slider readout and slider position to state.tIdx.
 */
function syncTimeUI(state, refs) {
    refs.timeSlider.value = String(state.tIdx);
    refs.timeReadout.textContent = `${state.tIdx} / ${T}`;
}

/**
 * Update the play button label/icon based on playing state.
 */
function updatePlayButton(refs, isPlaying) {
    if (isPlaying) {
        refs.playIcon.textContent = '❚❚';
        refs.playLabel.textContent = 'Pause';
    } else {
        refs.playIcon.textContent = '▶';
        refs.playLabel.textContent = 'Play';
    }
}

/**
 * Synchronize the direction toggle UI to state.direction.
 */
function syncDirectionUI(state, refs) {
    const fwd = state.direction === 'forward';
    setSegmentedActive([refs.directionFwdBtn, refs.directionRevBtn], fwd ? 0 : 1);
    refs.directionHint.textContent = DIRECTION_HINT[state.direction];
}

/**
 * Synchronize the sampler toggle UI to state.sampler and state.direction.
 * In forward direction the sampler choice has no effect, so we visually
 * disable the segmented control and replace the hint with an explanation.
 */
function syncSamplerUI(state, refs) {
    const isDDPM = state.sampler === 'DDPM';
    setSegmentedActive([refs.samplerDDPMBtn, refs.samplerDDIMBtn], isDDPM ? 0 : 1);

    const samplerSegmented = refs.samplerDDPMBtn.parentElement;
    if (state.direction === 'forward') {
        samplerSegmented.classList.add('diffusion-disabled');
        refs.samplerHint.textContent = 'Applies only to the reverse direction';
    } else {
        samplerSegmented.classList.remove('diffusion-disabled');
        refs.samplerHint.textContent = SAMPLER_HINT[state.sampler];
    }
}

/**
 * Synchronize the speed buttons to state.speed.
 */
function syncSpeedUI(state, refs) {
    const idx = { slow: 0, medium: 1, fast: 2 }[state.speed];
    setSegmentedActive([refs.speedSlowBtn, refs.speedMedBtn, refs.speedFastBtn], idx);
}

/**
 * Animation loop using requestAnimationFrame.
 * Advances state.tIdx by 1 each "tick" based on state.speed.
 */
function animationLoop(state, refs, ctx, W, H) {
    if (!state.playing) return;
    const now = performance.now();
    const fps = SPEED_FPS[state.speed] || 20;
    const interval = 1000 / fps;
    if (now - state.lastFrameTime >= interval) {
        state.lastFrameTime = now;
        if (state.direction === 'forward') {
            state.tIdx++;
            if (state.tIdx >= T) {
                state.tIdx = T;
                state.playing = false;
            }
        } else {
            state.tIdx--;
            if (state.tIdx <= 0) {
                state.tIdx = 0;
                state.playing = false;
            }
        }
        syncTimeUI(state, refs);
        renderFrame(state, ctx, W, H);
        if (!state.playing) updatePlayButton(refs, false);
    }
    if (state.playing) {
        state.animationHandle = requestAnimationFrame(
            () => animationLoop(state, refs, ctx, W, H)
        );
    }
}

/**
 * Stop the running animation (if any).
 */
function stopAnimation(state, refs) {
    if (state.animationHandle != null) {
        cancelAnimationFrame(state.animationHandle);
        state.animationHandle = null;
    }
    state.playing = false;
    updatePlayButton(refs, false);
}

/**
 * Start (or resume) the animation.
 */
function startAnimation(state, refs, ctx, W, H) {
    // If we're at the natural endpoint, jump back to start before playing.
    if (state.direction === 'forward' && state.tIdx >= T) {
        state.tIdx = 0;
        syncTimeUI(state, refs);
    } else if (state.direction === 'reverse' && state.tIdx <= 0) {
        state.tIdx = T;
        syncTimeUI(state, refs);
    }
    state.playing = true;
    state.lastFrameTime = 0;
    updatePlayButton(refs, true);
    state.animationHandle = requestAnimationFrame(
        () => animationLoop(state, refs, ctx, W, H)
    );
}

/**
 * Show / hide the "computing" status overlay.
 */
function showStatus(refs, message) {
    if (message) refs.statusText.textContent = message;
    refs.status.classList.remove('diffusion-hidden');
}
function hideStatus(refs) {
    refs.status.classList.add('diffusion-hidden');
}

/**
 * Bind all interactive event handlers.
 */
function bindEventHandlers(state, refs, ctx, W, H) {
    // Time slider — manual scrubbing pauses any running animation.
    refs.timeSlider.addEventListener('input', (e) => {
        stopAnimation(state, refs);
        state.tIdx = parseInt(e.target.value, 10);
        refs.timeReadout.textContent = `${state.tIdx} / ${T}`;
        renderFrame(state, ctx, W, H);
    });

    // Direction toggle
    const onDirectionChange = (newDir) => {
        if (state.direction === newDir) return;
        stopAnimation(state, refs);
        state.direction = newDir;
        resetSliderPosition(state);
        syncDirectionUI(state, refs);
        syncSamplerUI(state, refs);
        syncTimeUI(state, refs);
        renderFrame(state, ctx, W, H);
    };
    refs.directionFwdBtn.addEventListener('click', () => onDirectionChange('forward'));
    refs.directionRevBtn.addEventListener('click', () => onDirectionChange('reverse'));

    // Sampler toggle
    const onSamplerChange = (newSampler) => {
        if (state.sampler === newSampler) return;
        stopAnimation(state, refs);
        state.sampler = newSampler;
        syncSamplerUI(state, refs);
        renderFrame(state, ctx, W, H);
    };
    refs.samplerDDPMBtn.addEventListener('click', () => onSamplerChange('DDPM'));
    refs.samplerDDIMBtn.addEventListener('click', () => onSamplerChange('DDIM'));

    // Play / Pause
    refs.playBtn.addEventListener('click', () => {
        if (state.playing) {
            stopAnimation(state, refs);
        } else {
            startAnimation(state, refs, ctx, W, H);
        }
    });

    // Reset — return slider to natural start of the current direction
    refs.resetBtn.addEventListener('click', () => {
        stopAnimation(state, refs);
        resetSliderPosition(state);
        syncTimeUI(state, refs);
        renderFrame(state, ctx, W, H);
    });

    // Regenerate noise — heavy computation, show status overlay
    refs.regenBtn.addEventListener('click', () => {
        stopAnimation(state, refs);
        showStatus(refs, 'Regenerating diffusion trajectories…');
        // Defer to next tick so the overlay actually renders before the
        // synchronous heavy computation begins.
        setTimeout(() => {
            regenerateNoise(state);
            // Snap slider to the noise endpoint so the user can immediately
            // play the new reverse trajectory if they're in reverse mode.
            if (state.direction === 'reverse') {
                state.tIdx = T;
                syncTimeUI(state, refs);
            }
            renderFrame(state, ctx, W, H);
            hideStatus(refs);
        }, 30);
    });

    // Speed buttons
    const onSpeedChange = (newSpeed) => {
        if (state.speed === newSpeed) return;
        state.speed = newSpeed;
        syncSpeedUI(state, refs);
    };
    refs.speedSlowBtn.addEventListener('click', () => onSpeedChange('slow'));
    refs.speedMedBtn.addEventListener('click', () => onSpeedChange('medium'));
    refs.speedFastBtn.addEventListener('click', () => onSpeedChange('fast'));
}

/**
 * Watch for theme changes on the <html> element and re-render the canvas
 * so the visualization tracks site theme without a page reload.
 */
function observeThemeChanges(state, ctx, W, H) {
    const obs = new MutationObserver(() => {
        renderFrame(state, ctx, W, H);
    });
    obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
}

/**
 * Entry point. Locates the demo container, sets up canvas and HTML, then
 * defers the heavy initial computation to a follow-up tick so that the
 * "computing" status overlay actually paints before we block.
 */
function initDiffusionDemo() {
    const container = document.getElementById('diffusion_demo_visualizer');
    if (!container) {
        // The page may not contain a demo container; that's fine.
        return;
    }

    injectDiffusionDemoCSS();
    container.innerHTML = buildDemoHTML();
    const refs = collectDOMRefs(container);

    // Canvas first so its dimensions are known before any rendering.
    const { ctx, W, H } = setupDiffusionCanvas(refs.canvas);

    // Load the COMPASS logo data set.
    const dataPts = loadDataPoints();
    if (!dataPts) {
        refs.statusText.textContent = 'Error: logo data not loaded.';
        return;
    }

    // Defer the heavy state construction so the status overlay gets a
    // chance to render. ~30 ms is plenty for one paint cycle.
    setTimeout(() => {
        const t0 = performance.now();
        const state = createDemoState(dataPts);
        const elapsed = (performance.now() - t0).toFixed(0);
        console.log(`[ml-14 demo] state built in ${elapsed} ms`);

        bindEventHandlers(state, refs, ctx, W, H);
        observeThemeChanges(state, ctx, W, H);

        // Initial sync of all UI to default state
        syncDirectionUI(state, refs);
        syncSamplerUI(state, refs);
        syncSpeedUI(state, refs);
        syncTimeUI(state, refs);

        renderFrame(state, ctx, W, H);
        hideStatus(refs);
    }, 30);
}

// DOM ready bootstrap. The demo can also be re-initialized externally by
// calling initDiffusionDemo() if needed.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiffusionDemo);
} else {
    initDiffusionDemo();
}