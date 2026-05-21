// sec5_p15_flow_matching_demo.js
// Flow Matching Visualizer — MATH-CS COMPASS, ml-15
//
// Two side-by-side panels share the SAME source p_init = N(0, I) and the
// SAME target p_data (a 5-mode Gaussian mixture on a circle). Both integrate
// the deterministic ODE dx/dt = u_t(x) with the same closed-form machinery;
// only the schedule (alpha_t, beta_t) differs:
//
//   LEFT  — linear schedule  (alpha=t, beta=1-t):  STRAIGHT trajectories
//           (rectified-/flow-matching-style).
//   RIGHT — cosine / variance-preserving schedule: CURVED trajectories,
//           the diffusion probability-flow ODE (sigma_t = 0).
//
// A single slider sets N = number of Euler steps. At large N both panels
// land on the modes; at small N the straight path stays accurate while the
// curved path overshoots and misses — making "straight is cheap to
// integrate" visible. This is the page's thesis: diffusion is one path
// choice inside the flow-matching framework.
//
// All fields are ANALYTIC (Gaussian-mixture target). No neural net, no data
// cloud, 2D only, everything closed-form.
//
// Architecture (six modules):
//   1. Math primitives    — Gaussian sampling, schedules, log-sum-exp
//   2. Velocity field     — analytic GMM marginal velocity (shared by panels)
//   3. Integration        — deterministic Euler, trajectory + terminal error
//   4. State management    — config, particle batch, per-panel recompute
//   5. Visualization       — canvas rendering of traces + terminal points
//   6. HTML / CSS / UI     — DOM, controls, slider wiring, entry point
//
// Mathematical specification follows ml15_demo_spec_handout_v1.md, whose
// terminal-error table has been independently reproduced.


// ====== MODULE 1 ======
// Math primitives. All functions are pure (no DOM, no global state).

// --- Target mixture configuration (handout Section 1 / 7) ---
const K = 5;          // number of mixture modes
const R = 1.6;        // radius of the circle the mode means sit on
const MODE_STD = 0.10;  // per-mode isotropic std s (small => sharp modes)
const EPS = 1e-3;     // integrate t in [0, 1 - EPS]; guards beta_t -> 0 at t=1

// Mode means mu_k placed evenly on a circle of radius R. (K, 2).
const MU = (() => {
    const mu = new Array(K);
    for (let k = 0; k < K; k++) {
        const ang = k * 2 * Math.PI / K;
        mu[k] = [R * Math.cos(ang), R * Math.sin(ang)];
    }
    return mu;
})();

/**
 * Box-Muller transform for one standard Gaussian sample ~ N(0, 1).
 */
function randn() {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Sample one 2D standard Gaussian vector ~ N(0, I_2). Returns [x, y].
 */
function randn2() {
    return [randn(), randn()];
}

/**
 * Numerically stable softmax of an array of logits, in place into `out`.
 * Subtracts the max before exponentiating to avoid overflow (log-sum-exp
 * normalization, mirroring the diffusion demo's guard).
 *
 * @param logits Array(K) of log-weights
 * @param out    Array(K) to receive the normalized weights (sums to 1)
 */
function softmaxInto(logits, out) {
    let maxLog = -Infinity;
    for (let k = 0; k < logits.length; k++) {
        if (logits[k] > maxLog) maxLog = logits[k];
    }
    let sum = 0;
    for (let k = 0; k < logits.length; k++) {
        const w = Math.exp(logits[k] - maxLog);
        out[k] = w;
        sum += w;
    }
    const inv = 1.0 / sum;
    for (let k = 0; k < out.length; k++) out[k] *= inv;
}


// ====== MODULE 1b ======
// The two schedules. Each returns {a, b, ad, bd} = (alpha, beta, alpha_dot,
// beta_dot) at time t. Both satisfy alpha_0 = 0, beta_0 = 1, alpha_1 = 1,
// beta_1 = 0, so p_0 = N(0, I) and p_1 = p_data for both panels.

/**
 * Linear schedule: alpha = t, beta = 1 - t.
 * Conditional means travel in straight constant-speed segments — the
 * straight / rectified flow-matching path.
 */
function schedLinear(t) {
    return { a: t, b: 1 - t, ad: 1.0, bd: -1.0 };
}

/**
 * Cosine / variance-preserving schedule: alpha = sin(pi t / 2),
 * beta = cos(pi t / 2). Satisfies alpha^2 + beta^2 = 1 (variance
 * preserving). Its deterministic ODE produces curved trajectories — this is
 * exactly the diffusion probability-flow ODE for the VP path.
 */
function schedCosine(t) {
    const h = Math.PI * t / 2;
    return {
        a: Math.sin(h),
        b: Math.cos(h),
        ad: (Math.PI / 2) * Math.cos(h),
        bd: -(Math.PI / 2) * Math.sin(h),
    };
}

const SCHEDULES = {
    straight: schedLinear,
    curved: schedCosine,
};


// ====== MODULE 2 ======
// Analytic marginal velocity field for the Gaussian-mixture target.
//
// Because p_data = (1/K) sum_k N(mu_k, s^2 I) and the conditional path is
// N(alpha_t z, beta_t^2 I), the marginal at time t is itself a K-term GMM:
//
//   p_t(x) = (1/K) sum_k N(x; m_k(t), v(t) I),
//   m_k(t) = alpha_t mu_k,   v(t) = alpha_t^2 s^2 + beta_t^2   (scalar).
//
// Responsibilities r_k(x) (softmax of -||x - m_k||^2 / (2v)) give the
// marginal velocity (handout Section 4):
//
//   u_t(x) = (bd/b) x + (ad - (bd/b) alpha_t) * sum_k r_k(x) mu_k.
//
// The same r_k also yield the marginal score, but the demo only needs u_t.

// Reused scratch buffers (avoid per-call allocation in the hot loop).
const _vfLogits = new Float32Array(K);
const _vfResp = new Float32Array(K);

/**
 * Marginal velocity u_t(x) for the Gaussian-mixture path under `sched`.
 *
 * @param x      [x, y] particle position
 * @param t      time in [0, 1 - EPS]
 * @param sched  schedule function (schedLinear | schedCosine)
 * @param out    optional [.,.] to receive the velocity; allocated if omitted
 * @returns      out = [ux, uy]
 */
function velocity(x, t, sched, out) {
    const u = out || [0, 0];
    const { a, b, ad, bd } = sched(t);

    // Scalar marginal variance v(t) = a^2 s^2 + b^2 (> 0 while s > 0).
    const v = a * a * MODE_STD * MODE_STD + b * b;
    const inv2v = 1.0 / (2 * v);

    // log N(x; m_k, v I) up to an additive const that cancels in softmax:
    //   = -||x - alpha_t mu_k||^2 / (2v).
    const x0 = x[0], x1 = x[1];
    for (let k = 0; k < K; k++) {
        const m0 = a * MU[k][0];
        const m1 = a * MU[k][1];
        const d0 = x0 - m0, d1 = x1 - m1;
        _vfLogits[k] = -(d0 * d0 + d1 * d1) * inv2v;
    }
    softmaxInto(_vfLogits, _vfResp);

    // sum_k r_k mu_k  (responsibility-weighted mean of the mode means).
    let rm0 = 0, rm1 = 0;
    for (let k = 0; k < K; k++) {
        rm0 += _vfResp[k] * MU[k][0];
        rm1 += _vfResp[k] * MU[k][1];
    }

    // u = (bd/b) x + (ad - (bd/b) a) * (sum_k r_k mu_k).
    const coef = bd / b;                 // finite for t < 1 (b >= EPS)
    const w = ad - coef * a;
    u[0] = coef * x0 + w * rm0;
    u[1] = coef * x1 + w * rm1;
    return u;
}


// ====== MODULE 3 ======
// Deterministic Euler integration of dx/dt = u_t(x), and the terminal-error
// metric. Both panels share this; only the schedule differs.
//
// Euler with N steps, step size h = (1 - EPS) / N:
//   x_{i+1} = x_i + h u_{t_i}(x_i),   t_i = i h,   i = 0..N-1.
// We integrate t from 0 to 1 - EPS (handout Section 5/6): the (bd/b) term
// is finite for t < 1, so stopping short of the data endpoint avoids the
// 1/beta blow-up while leaving the contrast intact.

/**
 * Integrate one particle from x0 ~ p_init through N Euler steps under
 * `sched`, recording the full polyline trajectory (N+1 points).
 *
 * @param x0     [x, y] starting position
 * @param N      number of Euler steps (>= 1)
 * @param sched  schedule function
 * @returns      Array(N+1) of [x, y], the trajectory including endpoints
 */
function integrateTrajectory(x0, N, sched) {
    const h = (1 - EPS) / N;
    const traj = new Array(N + 1);
    let px = x0[0], py = x0[1];
    traj[0] = [px, py];
    const u = [0, 0];
    const cur = [0, 0];
    for (let i = 0; i < N; i++) {
        const t = i * h;
        cur[0] = px; cur[1] = py;
        velocity(cur, t, sched, u);
        px += h * u[0];
        py += h * u[1];
        traj[i + 1] = [px, py];
    }
    return traj;
}

/**
 * Distance from a terminal point to its nearest mode mean, and the index of
 * that mode. Used both for the error metric and for colouring terminal
 * points by which mode they landed on.
 *
 * @returns {dist, mode}
 */
function nearestMode(p) {
    let best = Infinity, bestK = 0;
    for (let k = 0; k < K; k++) {
        const d0 = p[0] - MU[k][0];
        const d1 = p[1] - MU[k][1];
        const d = Math.sqrt(d0 * d0 + d1 * d1);
        if (d < best) { best = d; bestK = k; }
    }
    return { dist: best, mode: bestK };
}

/**
 * Integrate a whole particle batch under `sched` with N steps, returning
 * per-particle trajectories, terminal points, terminal mode assignments,
 * and the mean terminal error E(N) (mean nearest-mode distance).
 *
 * @param batch  Array of [x, y] start positions (shared across panels)
 * @param N      Euler step count
 * @param sched  schedule function
 * @returns {trajs, terminals, modes, error}
 */
function integrateBatch(batch, N, sched) {
    const M = batch.length;
    const trajs = new Array(M);
    const terminals = new Array(M);
    const modes = new Int32Array(M);
    let errSum = 0;
    for (let i = 0; i < M; i++) {
        const traj = integrateTrajectory(batch[i], N, sched);
        const term = traj[traj.length - 1];
        const { dist, mode } = nearestMode(term);
        trajs[i] = traj;
        terminals[i] = term;
        modes[i] = mode;
        errSum += dist;
    }
    return { trajs, terminals, modes, error: errSum / M };
}


// ====== MODULE 4 ======
// State management. The slider sets N (Euler steps); changing it recomputes
// both panels from the SAME fixed particle batch. Recompute is cheap
// (~1e6 mode-evals worst case), so no caching is needed — unlike the
// time-sliced diffusion demo, the contrast here is a property of N itself.

// Slider range, from the handout's verified conclusions: min 4 (N=3 makes
// BOTH panels degrade and blurs the message), max ~150, default 8 (peak
// contrast). The verified table: N=8 gives ratio 5.2x (curved/straight).
const N_MIN = 4;
const N_MAX = 20;
const N_DEFAULT = 8;

// Particle count: enough for a clear cloud, light enough to recompute
// instantly on every slider tick. (Math verified at 2000; visual at 400.)
const N_PARTICLES = 400;

/**
 * Draw a fixed batch of starting points x0 ~ p_init = N(0, I_2).
 */
function drawBatch(M = N_PARTICLES) {
    const out = new Array(M);
    for (let i = 0; i < M; i++) out[i] = randn2();
    return out;
}

/**
 * Create the demo state. The particle batch is fixed for the lifetime of
 * the state (until "Resample"), so moving the N slider isolates the effect
 * of step count alone.
 */
function createDemoState() {
    const batch = drawBatch();
    const state = {
        batch,
        N: N_DEFAULT,
        // Per-panel integration results, filled by recompute().
        left: null,   // straight (linear schedule)
        right: null,  // curved   (cosine / VP schedule)
    };
    recompute(state);
    return state;
}

/**
 * Re-integrate both panels at the current N from the current batch.
 */
function recompute(state) {
    state.left = integrateBatch(state.batch, state.N, SCHEDULES.straight);
    state.right = integrateBatch(state.batch, state.N, SCHEDULES.curved);
}

/**
 * Action: draw a fresh particle batch and re-integrate both panels.
 */
function resampleBatch(state) {
    state.batch = drawBatch();
    recompute(state);
}

/**
 * Action: set N (clamped to [N_MIN, N_MAX]) and re-integrate.
 */
function setN(state, N) {
    state.N = Math.max(N_MIN, Math.min(N_MAX, N | 0));
    recompute(state);
}


// ====== MODULE 5 ======
// Canvas rendering. Two square panels (LEFT straight, RIGHT curved), each
// drawing: target mode means (rings), faint particle trajectory traces,
// terminal points coloured by whether they reached a mode, and a per-panel
// terminal-error readout. Pure rendering; reads state, mutates nothing.
// Theme-aware via the html[data-theme="dark"] attribute.

const PLOT_MARGIN = 0.10;        // fraction of each panel reserved as margin
const VIEW_HALF = 2.2;           // math view spans [-VIEW_HALF, VIEW_HALF]^2
const TERMINAL_RADIUS_PX = 2.2;  // terminal point radius
const MODE_RING_RADIUS_PX = 9;   // target-mode marker radius
const HIT_THRESHOLD = 0.25;      // terminal within this of a mode == "landed"

// Cap how many trajectory polylines are stroked, for render performance at
// large particle counts. Terminal points are always drawn for all.
const MAX_TRACES = 220;

/**
 * Theme-resolved palette, read lazily so the demo follows the site theme.
 */
function getPalette() {
    const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
    return {
        panelBg:    isDark ? '#1a1d24' : '#f8f9fb',
        frame:      isDark ? '#3a3f4b' : '#d6dae3',
        modeRing:   isDark ? 'rgba(255,255,255,0.55)' : 'rgba(40,42,50,0.55)',
        traceHit:   isDark ? 'rgba(120,190,255,0.16)' : 'rgba(7,49,164,0.13)',
        traceMiss:  isDark ? 'rgba(255,150,120,0.20)' : 'rgba(200,60,20,0.16)',
        ptHit:      isDark ? '#7ec0ff' : '#0731a4',
        ptMiss:     isDark ? '#ff9678' : '#c83c14',
        label:      isDark ? 'rgba(230,232,240,0.85)' : 'rgba(40,42,50,0.85)',
        sublabel:   isDark ? 'rgba(150,155,170,0.95)' : 'rgba(90,97,114,0.95)',
    };
}

/**
 * Initialise a canvas with DPR support, sized to its wrapper's clientWidth.
 * CSS controls the display size; we sync the pixel buffer for sharpness.
 * @returns {ctx, W, H} where W=H is the CSS-pixel drawing size.
 */
function setupPanelCanvas(canvas, wrapper) {
    const dpr = window.devicePixelRatio || 1;
    const cssSize = (wrapper && wrapper.clientWidth) || 320;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    return { ctx, W: cssSize, H: cssSize };
}

/**
 * Map math coordinate (x, y) in [-VIEW_HALF, VIEW_HALF]^2 to canvas pixels.
 * Math y points up; canvas y points down (flipped).
 */
function mathToPixel(x, y, W, H) {
    const innerW = W * (1 - 2 * PLOT_MARGIN);
    const innerH = H * (1 - 2 * PLOT_MARGIN);
    const offX = W * PLOT_MARGIN;
    const offY = H * PLOT_MARGIN;
    const cx = offX + ((x + VIEW_HALF) / (2 * VIEW_HALF)) * innerW;
    const cy = offY + ((VIEW_HALF - y) / (2 * VIEW_HALF)) * innerH;
    return { cx, cy };
}

/**
 * Draw one panel: frame, mode rings, traces, terminal points, labels.
 *
 * @param ctx     2D context
 * @param W,H     logical canvas size
 * @param result  one of state.left / state.right (from integrateBatch)
 * @param title   panel title (e.g. "Straight (flow matching)")
 * @param subtitle  schedule descriptor (e.g. "linear  alpha=t, beta=1-t")
 * @param palette getPalette() output
 */
function drawPanel(ctx, W, H, result, title, subtitle, palette) {
    // Background + frame.
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = palette.panelBg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = palette.frame;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    if (!result) return;

    // Trajectory traces (subsampled). Colour by whether the endpoint landed
    // on a mode, so "misses" read as a different hue at a glance.
    const M = result.trajs.length;
    const stride = Math.max(1, Math.ceil(M / MAX_TRACES));
    ctx.lineWidth = 1;
    for (let i = 0; i < M; i += stride) {
        const traj = result.trajs[i];
        const term = result.terminals[i];
        const landed = nearestMode(term).dist <= HIT_THRESHOLD;
        ctx.strokeStyle = landed ? palette.traceHit : palette.traceMiss;
        ctx.beginPath();
        const p0 = mathToPixel(traj[0][0], traj[0][1], W, H);
        ctx.moveTo(p0.cx, p0.cy);
        for (let j = 1; j < traj.length; j++) {
            const p = mathToPixel(traj[j][0], traj[j][1], W, H);
            ctx.lineTo(p.cx, p.cy);
        }
        ctx.stroke();
    }

    // Terminal points (all particles), coloured hit/miss.
    for (let i = 0; i < M; i++) {
        const term = result.terminals[i];
        const landed = nearestMode(term).dist <= HIT_THRESHOLD;
        const { cx, cy } = mathToPixel(term[0], term[1], W, H);
        ctx.fillStyle = landed ? palette.ptHit : palette.ptMiss;
        ctx.beginPath();
        ctx.arc(cx, cy, TERMINAL_RADIUS_PX, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Target mode means as hollow rings, drawn last so they sit on top.
    ctx.strokeStyle = palette.modeRing;
    ctx.lineWidth = 1.6;
    for (let k = 0; k < K; k++) {
        const { cx, cy } = mathToPixel(MU[k][0], MU[k][1], W, H);
        ctx.beginPath();
        ctx.arc(cx, cy, MODE_RING_RADIUS_PX, 0, 2 * Math.PI);
        ctx.stroke();
    }

    // Labels: title, subtitle, and live terminal error E(N).
    ctx.textBaseline = 'top';
    ctx.fillStyle = palette.label;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(title, 12, 10);
    ctx.fillStyle = palette.sublabel;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(subtitle, 12, 28);

    // Error readout, bottom-left.
    ctx.fillStyle = palette.label;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`mean miss = ${result.error.toFixed(3)}`, 12, H - 22);
}

/**
 * Render both panels from the current state.
 *
 * @param state    demo state
 * @param leftCS   {ctx, W, H} for the left (straight) panel
 * @param rightCS  {ctx, W, H} for the right (curved) panel
 */
function renderPanels(state, leftCS, rightCS) {
    const palette = getPalette();
    drawPanel(leftCS.ctx, leftCS.W, leftCS.H, state.left,
        'Straight — flow matching', 'linear:  \u03B1=t, \u03B2=1\u2212t', palette);
    drawPanel(rightCS.ctx, rightCS.W, rightCS.H, state.right,
        'Curved — diffusion flow ODE', 'cosine (VP):  \u03B1=sin, \u03B2=cos', palette);
}


// ====== MODULE 6a ======
// HTML structure. Element IDs are prefixed `fm-` to avoid page collisions.
// Mounts into the page-level container #flow_matching_demo_visualizer.

function buildDemoHTML() {
    return `
      <div class="fm-container">

        <!-- Two side-by-side panels -->
        <div class="fm-panels">
          <div class="fm-panel-wrap" id="fm-left-wrap">
            <canvas id="fm-left-canvas"></canvas>
          </div>
          <div class="fm-panel-wrap" id="fm-right-wrap">
            <canvas id="fm-right-canvas"></canvas>
          </div>
        </div>

        <!-- N slider (Euler steps) -->
        <div class="fm-slider-row">
          <label class="fm-slider-label" for="fm-n-slider">Euler steps&nbsp;N</label>
          <input type="range" id="fm-n-slider"
                 min="${N_MIN}" max="${N_MAX}" step="1" value="${N_DEFAULT}"
                 class="fm-slider">
          <span class="fm-slider-readout" id="fm-n-readout">${N_DEFAULT}</span>
        </div>

        <!-- Action row + legend -->
        <div class="fm-controls">
          <button class="fm-btn fm-btn-primary" id="fm-resample-btn">\u21BB Resample particles</button>
          <div class="fm-legend">
            <span class="fm-legend-item"><span class="fm-swatch fm-swatch-hit"></span>reached a mode</span>
            <span class="fm-legend-item"><span class="fm-swatch fm-swatch-miss"></span>missed</span>
            <span class="fm-legend-item"><span class="fm-swatch fm-swatch-ring"></span>target mode</span>
          </div>
        </div>

        <p class="fm-caption" id="fm-caption"></p>
      </div>
    `;
}

function collectDOMRefs(container) {
    const $ = (sel) => container.querySelector(sel);
    return {
        leftWrap:    $('#fm-left-wrap'),
        rightWrap:   $('#fm-right-wrap'),
        leftCanvas:  $('#fm-left-canvas'),
        rightCanvas: $('#fm-right-canvas'),
        nSlider:     $('#fm-n-slider'),
        nReadout:    $('#fm-n-readout'),
        resampleBtn: $('#fm-resample-btn'),
        caption:     $('#fm-caption'),
    };
}


// ====== MODULE 6b ======
// CSS injection. Theme-aware (html[data-theme="dark"]); panels stack on
// narrow viewports. Palette mirrors the diffusion demo for site consistency.

const FM_DEMO_CSS = `
.fm-container {
    --fm-bg:          #f8f9fb;
    --fm-fg:          #1f2330;
    --fm-fg-muted:    #5a6172;
    --fm-border:      #d6dae3;
    --fm-border-hover:#b8becb;
    --fm-accent:      #0731a4;
    --fm-accent-fg:   #ffffff;
    --fm-accent-soft: rgba(7, 49, 164, 0.08);
    --fm-shadow:      0 1px 3px rgba(0, 0, 0, 0.04);
    --fm-hit:         #0731a4;
    --fm-miss:        #c83c14;
    --fm-ring:        rgba(40, 42, 50, 0.55);
}
html[data-theme="dark"] .fm-container {
    --fm-bg:          #1a1d24;
    --fm-fg:          #e6e8f0;
    --fm-fg-muted:    #969baa;
    --fm-border:      #3a3f4b;
    --fm-border-hover:#4d5360;
    --fm-accent:      #4a78d8;
    --fm-accent-fg:   #ffffff;
    --fm-accent-soft: rgba(74, 120, 216, 0.15);
    --fm-shadow:      0 1px 3px rgba(0, 0, 0, 0.3);
    --fm-hit:         #7ec0ff;
    --fm-miss:        #ff9678;
    --fm-ring:        rgba(255, 255, 255, 0.55);
}

.fm-container {
    width: 100%;
    max-width: 720px;
    margin: 1em auto;
    padding: 18px;
    box-sizing: border-box;
    background: var(--fm-bg);
    color: var(--fm-fg);
    border: 1px solid var(--fm-border);
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* ===== Panels ===== */
.fm-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
}
.fm-panel-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
}
.fm-panel-wrap canvas {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 6px;
}

/* ===== N slider ===== */
.fm-slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
}
.fm-slider-label {
    flex: 0 0 auto;
    font-size: 0.85rem;
    color: var(--fm-fg-muted);
    font-weight: 500;
}
.fm-slider {
    flex: 1 1 auto;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: var(--fm-border);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
}
.fm-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--fm-accent);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--fm-bg);
    box-shadow: var(--fm-shadow);
}
.fm-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--fm-accent);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--fm-bg);
}
.fm-slider-readout {
    flex: 0 0 auto;
    font-size: 0.9rem;
    color: var(--fm-fg);
    font-variant-numeric: tabular-nums;
    min-width: 2.5em;
    text-align: right;
    font-weight: 600;
}

/* ===== Controls + legend ===== */
.fm-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
}
.fm-btn {
    padding: 8px 14px;
    font-size: 0.85rem;
    color: var(--fm-fg);
    background: var(--fm-bg);
    border: 1px solid var(--fm-border);
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    min-height: 36px;
    transition: background 0.15s, border-color 0.15s;
}
.fm-btn:hover {
    background: var(--fm-accent-soft);
    border-color: var(--fm-border-hover);
}
.fm-btn:active { transform: translateY(1px); }
.fm-btn-primary {
    background: var(--fm-accent);
    color: var(--fm-accent-fg);
    border-color: var(--fm-accent);
}
.fm-btn-primary:hover {
    background: var(--fm-accent);
    border-color: var(--fm-accent);
    filter: brightness(1.08);
}

.fm-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 0.78rem;
    color: var(--fm-fg-muted);
}
.fm-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.fm-swatch {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    display: inline-block;
}
.fm-swatch-hit  { background: var(--fm-hit); }
.fm-swatch-miss { background: var(--fm-miss); }
.fm-swatch-ring {
    background: transparent;
    border: 1.6px solid var(--fm-ring);
}

/* ===== Caption ===== */
.fm-caption {
    margin: 14px 2px 0;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--fm-fg-muted);
}

/* ===== Mobile ===== */
@media (max-width: 560px) {
    .fm-container { padding: 12px; }
    .fm-panels { grid-template-columns: 1fr; }
    .fm-controls { flex-direction: column; align-items: flex-start; }
}
`;

function injectFMDemoCSS() {
    if (document.getElementById('fm-demo-style')) return;
    const style = document.createElement('style');
    style.id = 'fm-demo-style';
    style.textContent = FM_DEMO_CSS;
    document.head.appendChild(style);
}


// ====== MODULE 6c ======
// UI wiring + entry point.

/**
 * Caption text reflecting the current N, framing the contrast in the page's
 * terms: straight paths integrate cheaply, the curved diffusion path needs
 * more steps to stay accurate.
 */
function captionFor(state) {
    const dStraight = state.left ? state.left.error : 0;
    const dCurved = state.right ? state.right.error : 0;
    const dS = Number(dStraight.toFixed(3));
    const dC = Number(dCurved.toFixed(3));
    const ratio = dS > 1e-6 ? (dC / dS) : 1;
    if (state.N <= 10) {
        return `At N = ${state.N} steps, the straight path already lands on the modes `
            + `while the curved diffusion path overshoots and misses — its mean miss is `
            + `approximately ${ratio.toFixed(1)}\u00D7 larger. A straight trajectory is cheap to integrate.`;
    } else if (state.N <= 30) {
        return `At N = ${state.N} the curved path is catching up but still trails the `
            + `straight one. Reducing N widens the gap; increasing it closes it.`;
    }
    return `At N = ${state.N} both paths have essentially converged to the target — `
        + `the cost of curvature vanishes once enough steps are taken. Lower N to expose it.`;
}

function syncUI(state, refs) {
    refs.nSlider.value = String(state.N);
    refs.nReadout.textContent = String(state.N);
    refs.caption.textContent = captionFor(state);
}

function initFlowMatchingDemo() {
    const container = document.getElementById('flow_matching_demo_visualizer');
    if (!container) return;

    injectFMDemoCSS();
    container.innerHTML = buildDemoHTML();
    const refs = collectDOMRefs(container);

    // Canvas surfaces wrapped in objects so the resize handler can swap them
    // in place; closures read current properties at draw time.
    const li = setupPanelCanvas(refs.leftCanvas, refs.leftWrap);
    const ri = setupPanelCanvas(refs.rightCanvas, refs.rightWrap);
    const leftCS = { ctx: li.ctx, W: li.W, H: li.H };
    const rightCS = { ctx: ri.ctx, W: ri.W, H: ri.H };

    const state = createDemoState();
    const render = () => renderPanels(state, leftCS, rightCS);

    // N slider — recompute both panels and re-render. Cheap enough to run
    // synchronously on every 'input' event.
    refs.nSlider.addEventListener('input', (e) => {
        setN(state, parseInt(e.target.value, 10));
        syncUI(state, refs);
        render();
    });

    // Resample — fresh particle batch, same N.
    refs.resampleBtn.addEventListener('click', () => {
        resampleBatch(state);
        syncUI(state, refs);
        render();
    });

    // Resize — rebuild both surfaces, throttled with rAF.
    let resizePending = false;
    window.addEventListener('resize', () => {
        if (resizePending) return;
        resizePending = true;
        requestAnimationFrame(() => {
            resizePending = false;
            const l = setupPanelCanvas(refs.leftCanvas, refs.leftWrap);
            const r = setupPanelCanvas(refs.rightCanvas, refs.rightWrap);
            leftCS.ctx = l.ctx; leftCS.W = l.W; leftCS.H = l.H;
            rightCS.ctx = r.ctx; rightCS.W = r.W; rightCS.H = r.H;
            render();
        });
    });

    // Follow site theme changes without a reload.
    const obs = new MutationObserver(render);
    obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    syncUI(state, refs);
    render();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowMatchingDemo);
} else {
    initFlowMatchingDemo();
}
