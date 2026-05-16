// sec2_p35_trichotomy_demo.js
// Trichotomy of Classical PDEs — MATH-CS COMPASS, calc-35
//
// Three-panel interactive demonstration of how the same initial bump
// evolves under the heat, wave, and Laplace equations — exhibiting
// the three controlling quantities (initial-data bound, energy invariant,
// boundary-data bound) catalogued in the trichotomy comparison table.
//
// Architecture (six modules, per spec v2):
//   1. Math primitives    — complex FFT/IFFT, interpolation, finite differences
//   2. Initial profiles   — Gaussian, triangle, bimodal
//   3. PDE solvers        — heat (spectral), wave (d'Alembert), Laplace (Poisson)
//   4. Canvas rendering   — 3-panel visualization
//   5. UI panel + CSS     — DOM template, theme-aware styles
//   6. Wiring             — event handlers, animation loop
//
// Mathematical specification follows calc35_trichotomy_demo_spec_v2.md.
// Grid: N = 256 points on x ∈ [-1, 1], physical length L = 2.
//
// The entire module is wrapped in an IIFE so no symbols leak into the
// global scope. The demo auto-initializes on DOMContentLoaded by looking
// for a host element with id 'trichotomy_demo_visualizer'; if absent,
// it silently no-ops.

(function () {
    'use strict';


// ============================================================
// ====== MODULE 1: Math primitives ===========================
// ============================================================
// Pure mathematical primitives used by the PDE solvers. All functions
// are stateless and operate on typed arrays. No DOM access.


// ------------------------------------------------------------
// Global grid constants
// ------------------------------------------------------------

const N = 256;                  // grid points
const L = 2.0;                  // physical domain length: x ∈ [-1, 1]
const DX = L / N;               // grid spacing Δx = 2/256
const X_MIN = -1.0;
const X_MAX = 1.0;

/**
 * Build the spatial grid {x_j} for j = 0, ..., N-1.
 * The grid covers x ∈ [-1, 1) at spacing Δx; the periodic endpoint x = +1
 * is not included (it would coincide with x = -1 mod L under periodic BC).
 *
 * @returns {Float64Array} length-N grid of x-coordinates
 */
function buildSpatialGrid() {
    const x = new Float64Array(N);
    for (let j = 0; j < N; j++) {
        x[j] = X_MIN + j * DX;
    }
    return x;
}

/**
 * Build the wave-number array {ξ_n} used by the heat-equation spectral solver.
 *
 * Convention (fftshift): for a DFT of length N on a periodic domain of
 * length L, the wave numbers are
 *     ξ_n = 2π n / L              for n = 0, 1, ..., N/2
 *     ξ_n = 2π (n - N) / L        for n = N/2 + 1, ..., N - 1
 * This places positive frequencies in the lower half and negative
 * frequencies in the upper half of the output array — the standard
 * "fftshift" convention used by numpy.fft and most scientific code.
 *
 * @returns {Float64Array} length-N array of wave numbers
 */
function buildWaveNumbers() {
    const xi = new Float64Array(N);
    const NHALF = N / 2;
    for (let n = 0; n <= NHALF; n++) {
        xi[n] = (2.0 * Math.PI * n) / L;
    }
    for (let n = NHALF + 1; n < N; n++) {
        xi[n] = (2.0 * Math.PI * (n - N)) / L;
    }
    return xi;
}


// ------------------------------------------------------------
// Complex FFT — Cooley–Tukey radix-2, decimation-in-time
// ------------------------------------------------------------
// Implementation notes:
//   - In-place algorithm: operates on the input arrays directly.
//   - Caller is responsible for ensuring N is a power of 2 (= 256 here).
//   - We store complex arrays as a pair (re, im) of Float64Arrays.
//   - The bit-reverse permutation is precomputed once at boot for N = 256;
//     this is a substantial speedup over recomputing it per FFT call.
//   - Twiddle factors {exp(-2πi k / N)} are likewise precomputed.
//
// Mathematical convention:
//   forward: F_n = Σ_{j=0}^{N-1} f_j · exp(-2πi j n / N)
//   inverse: f_j = (1/N) Σ_{n=0}^{N-1} F_n · exp(+2πi j n / N)
//
// Self-test signatures (run during boot):
//   - FFT of constant signal f_j = 1 ⟹ F_0 = N, F_{n≠0} = 0
//   - FFT then IFFT recovers the input within 1e-12 absolute error
//   - FFT of e^{2πi k₀ j / N} ⟹ F_{k₀} = N (single nonzero bin)

/**
 * Precompute the bit-reversal permutation for an N-point radix-2 FFT.
 * For index j ∈ {0, ..., N-1}, bitRev[j] is the value of j with its
 * log2(N) lowest bits reversed.
 *
 * @returns {Uint16Array} length-N permutation array
 */
function buildBitReversal() {
    const logN = Math.log2(N) | 0;   // 8 for N = 256
    const br = new Uint16Array(N);
    for (let j = 0; j < N; j++) {
        let r = 0, v = j;
        for (let b = 0; b < logN; b++) {
            r = (r << 1) | (v & 1);
            v >>>= 1;
        }
        br[j] = r;
    }
    return br;
}

/**
 * Precompute the forward twiddle factors {W_N^k = exp(-2πi k / N)} for
 * k = 0, ..., N/2 - 1 (only half are needed; the FFT exploits W^(k+N/2) = -W^k).
 * Stored as parallel cos/sin arrays.
 *
 * For inverse FFT, the same arrays are used with conjugation (sin negated).
 *
 * @returns {{cos: Float64Array, sin: Float64Array}} cos/sin of -2πk/N
 */
function buildTwiddles() {
    const NHALF = N / 2;
    const c = new Float64Array(NHALF);
    const s = new Float64Array(NHALF);
    for (let k = 0; k < NHALF; k++) {
        const theta = -2.0 * Math.PI * k / N;
        c[k] = Math.cos(theta);
        s[k] = Math.sin(theta);
    }
    return { cos: c, sin: s };
}

// Boot-time global precomputations (constant across the entire demo lifetime)
const BIT_REV = buildBitReversal();
const TWIDDLES = buildTwiddles();

/**
 * In-place forward FFT on the complex sequence (re, im) of length N.
 * After the call, (re, im) holds the DFT of the original input.
 *
 * Algorithm: Cooley–Tukey radix-2 decimation-in-time.
 *
 * @param {Float64Array} re  real parts, length N
 * @param {Float64Array} im  imaginary parts, length N
 */
function fft(re, im) {
    // Step 1: bit-reverse the input (in-place).
    for (let j = 0; j < N; j++) {
        const k = BIT_REV[j];
        if (k > j) {
            // Swap (re[j], im[j]) with (re[k], im[k])
            let tmp = re[j]; re[j] = re[k]; re[k] = tmp;
            tmp = im[j]; im[j] = im[k]; im[k] = tmp;
        }
    }
    // Step 2: iterative butterfly. For each stage of size m = 2, 4, ..., N:
    //   For each block of size m starting at base index s:
    //     For each butterfly j in the block:
    //       Combine the lower half (s+j) with the upper half (s+j+m/2)
    //       using twiddle factor W^(j · N/m).
    const Tcos = TWIDDLES.cos;
    const Tsin = TWIDDLES.sin;
    for (let m = 2; m <= N; m <<= 1) {
        const mh = m >> 1;
        const tStep = N / m;      // stride into the twiddle table for this stage
        for (let s = 0; s < N; s += m) {
            for (let j = 0; j < mh; j++) {
                const tIdx = j * tStep;
                const wr = Tcos[tIdx];
                const wi = Tsin[tIdx];
                const ie = s + j;
                const io = ie + mh;
                // Upper-half × twiddle
                const ur = re[io] * wr - im[io] * wi;
                const ui = re[io] * wi + im[io] * wr;
                // Combine
                re[io] = re[ie] - ur;
                im[io] = im[ie] - ui;
                re[ie] = re[ie] + ur;
                im[ie] = im[ie] + ui;
            }
        }
    }
}

/**
 * In-place inverse FFT on the complex sequence (re, im) of length N.
 * Trick: IFFT[x] = conj(FFT(conj(x))) / N. We negate imaginary parts before
 * and after a forward FFT, and divide by N.
 *
 * @param {Float64Array} re  real parts, length N
 * @param {Float64Array} im  imaginary parts, length N
 */
function ifft(re, im) {
    // Conjugate input
    for (let j = 0; j < N; j++) im[j] = -im[j];
    fft(re, im);
    // Conjugate and scale output
    const invN = 1.0 / N;
    for (let j = 0; j < N; j++) {
        re[j] = re[j] * invN;
        im[j] = -im[j] * invN;
    }
}

/**
 * Convenience: FFT of a real input.
 * Allocates fresh Float64Array buffers, returns the complex result.
 *
 * @param {Float64Array} fReal  real signal, length N
 * @returns {{re: Float64Array, im: Float64Array}} DFT of fReal
 */
function fftReal(fReal) {
    const re = new Float64Array(N);
    const im = new Float64Array(N);   // initialized to zero
    re.set(fReal);
    fft(re, im);
    return { re, im };
}


// ------------------------------------------------------------
// FFT self-tests (executed once at module load, console-only)
// ------------------------------------------------------------
// These run on every page load and emit a single console.log line.
// They are cheap (~1ms total) and catch the FFT implementation bugs
// that historically caused weeks of debugging in similar projects.

(function fftSelfTest() {
    // Test 1: FFT of constant signal {1, 1, ..., 1}
    //   ⟹ F_0 = N, F_{n>0} = 0
    {
        const re = new Float64Array(N).fill(1.0);
        const im = new Float64Array(N);
        fft(re, im);
        const err0 = Math.abs(re[0] - N) + Math.abs(im[0]);
        let errRest = 0;
        for (let n = 1; n < N; n++) {
            errRest += Math.abs(re[n]) + Math.abs(im[n]);
        }
        if (err0 > 1e-10 || errRest > 1e-10) {
            console.error('[calc35 FFT self-test 1] FAILED:',
                'F_0 error =', err0, ', sum of |F_{n>0}| =', errRest);
        }
    }
    // Test 2: FFT then IFFT recovers a random input
    {
        const re = new Float64Array(N);
        const im = new Float64Array(N);
        const orig = new Float64Array(N);
        for (let j = 0; j < N; j++) {
            orig[j] = Math.sin(0.123 * j) + 0.5 * Math.cos(0.7 * j);
            re[j] = orig[j];
        }
        fft(re, im);
        ifft(re, im);
        let maxErr = 0;
        for (let j = 0; j < N; j++) {
            maxErr = Math.max(maxErr,
                Math.abs(re[j] - orig[j]),
                Math.abs(im[j]));
        }
        if (maxErr > 1e-12) {
            console.error('[calc35 FFT self-test 2] FAILED: round-trip max error =', maxErr);
        }
    }
    // Test 3: FFT of pure tone e^{2πi · 5 · j / N}
    //   ⟹ F_5 = N (single nonzero bin), all others zero
    {
        const re = new Float64Array(N);
        const im = new Float64Array(N);
        const K0 = 5;
        for (let j = 0; j < N; j++) {
            const theta = (2.0 * Math.PI * K0 * j) / N;
            re[j] = Math.cos(theta);
            im[j] = Math.sin(theta);
        }
        fft(re, im);
        // The FFT convention F_n = Σ f_j exp(-2πi j n / N) gives a single
        // spike at n = K0 with magnitude N (since e^{+2πi K0 j/N} =
        // e^{-2πi (-K0) j/N} and -K0 ≡ K0 only when convention matches).
        // With our convention, the spike lands at n = K0 with re = N.
        const errSpike = Math.abs(re[K0] - N) + Math.abs(im[K0]);
        let errRest = 0;
        for (let n = 0; n < N; n++) {
            if (n === K0) continue;
            errRest += Math.abs(re[n]) + Math.abs(im[n]);
        }
        if (errSpike > 1e-9 || errRest > 1e-9) {
            console.error('[calc35 FFT self-test 3] FAILED:',
                'spike at K0 error =', errSpike,
                ', residual energy =', errRest);
        }
    }
    console.log('[calc35] FFT self-tests passed');
})();


// ------------------------------------------------------------
// Linear interpolation on the grid
// ------------------------------------------------------------

/**
 * Linearly interpolate a tabulated function at an arbitrary point.
 *
 * The function values `fGrid[j]` are samples of f at x_j = X_MIN + j * DX
 * for j = 0, ..., N-1.
 *
 * Outside the interval [X_MIN, X_MIN + (N-1)*DX] = [-1, X_MAX - DX], the
 * function is taken to be zero. This matches the "f extended by zero
 * outside [-1, 1]" convention used by the wave-equation d'Alembert evaluator
 * and the Laplace Poisson integral.
 *
 * Note on the upper boundary: since the grid samples x_{N-1} = X_MIN + (N-1)*DX
 * (just less than X_MAX = +1 by Δx), a query at x ∈ [X_MIN + (N-1)*DX, X_MAX]
 * lies past the last sample and yields zero. For the wave demo with c = 0.6
 * and t = 1.5, the d'Alembert query reaches x ± ct ∈ [-1.9, 1.9], well
 * past the grid; values outside are returned as zero.
 *
 * @param {Float64Array} fGrid  length-N tabulated function
 * @param {number} xQuery       query point
 * @returns {number}            interpolated value (zero outside grid)
 */
function interp1d(fGrid, xQuery) {
    // Map query x to fractional grid index: j_real = (xQuery - X_MIN) / DX
    const jReal = (xQuery - X_MIN) / DX;
    if (jReal < 0 || jReal > N - 1) return 0.0;
    const j = Math.floor(jReal);
    const frac = jReal - j;
    if (j === N - 1) {
        // Exactly at the last grid point (frac = 0)
        return fGrid[N - 1];
    }
    return (1.0 - frac) * fGrid[j] + frac * fGrid[j + 1];
}


// ------------------------------------------------------------
// Centered finite difference (with zero-padding at boundaries)
// ------------------------------------------------------------

/**
 * Compute f'(x_j) by centered finite differences:
 *     f'(x_j) ≈ (f(x_{j+1}) − f(x_{j-1})) / (2 Δx)
 *
 * At the boundaries j = 0 and j = N-1, neighbours outside the grid are
 * taken to be zero (consistent with the "f extended by zero outside [-1, 1]"
 * convention).
 *
 * For the demo's initial profiles, all decay to < 10^-5 at the boundaries
 * by construction, so the boundary derivative values are negligible
 * anyway — the zero-padding is for robustness, not accuracy.
 *
 * @param {Float64Array} fGrid  length-N tabulated function
 * @returns {Float64Array}      length-N derivative array
 */
function centralDiff(fGrid) {
    const out = new Float64Array(N);
    const inv2dx = 1.0 / (2.0 * DX);
    // Interior points: centered difference
    for (let j = 1; j < N - 1; j++) {
        out[j] = (fGrid[j + 1] - fGrid[j - 1]) * inv2dx;
    }
    // Boundaries: treat neighbour-outside-grid as zero
    //   f'(x_0)     ≈ (f(x_1) - 0) / (2 Δx)
    //   f'(x_{N-1}) ≈ (0 - f(x_{N-2})) / (2 Δx)
    out[0]     = (fGrid[1]     - 0.0)       * inv2dx;
    out[N - 1] = (0.0          - fGrid[N - 2]) * inv2dx;
    return out;
}


// ------------------------------------------------------------
// Trapezoidal integration
// ------------------------------------------------------------

/**
 * Compute the trapezoidal-rule approximation of ∫_{X_MIN}^{X_MAX} fGrid(x) dx
 * over the N-point grid. Used for occasional diagnostics.
 *
 * Standard trapezoidal rule:
 *   ∫ ≈ Δx · (f_0/2 + f_1 + ... + f_{N-2} + f_{N-1}/2)
 *
 * @param {Float64Array} fGrid  length-N function values on the grid
 * @returns {number}            approximate integral
 */
function trapz(fGrid) {
    let s = 0.5 * (fGrid[0] + fGrid[N - 1]);
    for (let j = 1; j < N - 1; j++) s += fGrid[j];
    return s * DX;
}


// ============================================================
// ====== MODULE 2: Initial profiles ==========================
// ============================================================
// Three user-selectable initial bumps, each normalized to max f = 1,
// min f = 0, and satisfying f(±1) < 10^-5 (verified at construction).
//
// Each profile generator returns the bump f tabulated on the grid
// produced by buildSpatialGrid(). The companion data (f', FFT, initial
// energy) are computed by the wiring layer (Module 6) from f as needed.


// Cached grid: build once at module load
const X_GRID = buildSpatialGrid();
const XI = buildWaveNumbers();


/**
 * Gaussian profile: f(x) = exp(-x²/(2σ²)), σ = 0.10.
 *
 * Verification: f(±1) = exp(-50) ≈ 1.9 × 10^-22, far below the 10^-5 tail
 * tolerance required for periodic BC and zero-extension consistency.
 *
 * @returns {Float64Array} length-N tabulated Gaussian
 */
function profileGaussian() {
    const SIGMA = 0.10;
    const TWO_SIG_SQ = 2.0 * SIGMA * SIGMA;
    const f = new Float64Array(N);
    for (let j = 0; j < N; j++) {
        const x = X_GRID[j];
        f[j] = Math.exp(-(x * x) / TWO_SIG_SQ);
    }
    return f;
}

/**
 * Triangle pulse: piecewise linear, support [-0.3, 0.3], peak 1 at x = 0.
 *
 *   f(x) = 1 - |x|/0.3   for |x| < 0.3
 *   f(x) = 0             elsewhere
 *
 * f is continuous but not C^1 (kinks at x = 0 and at the support endpoints).
 * Its derivative is a step function with values ±1/0.3 inside support; the
 * discrete energy E(0) = (c²/2) ∫(f')² dx is finite. See spec §1.3 for
 * the resulting expected energy-conservation tolerance.
 *
 * @returns {Float64Array} length-N tabulated triangle pulse
 */
function profileTriangle() {
    const HALF_WIDTH = 0.3;
    const INV_HW = 1.0 / HALF_WIDTH;
    const f = new Float64Array(N);
    for (let j = 0; j < N; j++) {
        const x = X_GRID[j];
        const ax = Math.abs(x);
        f[j] = (ax < HALF_WIDTH) ? (1.0 - ax * INV_HW) : 0.0;
    }
    return f;
}

/**
 * Bimodal profile: sum of two Gaussians at x = ±0.4 with σ = 0.08,
 * normalized so max f = 1.
 *
 * Construction: each individual Gaussian has peak 1 at its centre. The
 * sum has interference at x = 0 (where each contributes exp(-(0.4)²/(2·0.08²))
 * = exp(-12.5) ≈ 3.7 × 10^-6, negligible), so the peaks remain at ≈ 1.
 * No normalization needed — the sum's max is already within 10^-5 of 1.
 *
 * Verification: f(±1) = 2 · exp(-(0.6)²/(2·0.08²)) = 2 · exp(-28.125)
 * ≈ 1.2 × 10^-12, well below tolerance.
 *
 * @returns {Float64Array} length-N tabulated bimodal profile
 */
function profileBimodal() {
    const SIGMA = 0.08;
    const TWO_SIG_SQ = 2.0 * SIGMA * SIGMA;
    const CENTER = 0.4;
    const f = new Float64Array(N);
    let fmax = 0.0;
    for (let j = 0; j < N; j++) {
        const x = X_GRID[j];
        const dl = x + CENTER;
        const dr = x - CENTER;
        f[j] = Math.exp(-(dl * dl) / TWO_SIG_SQ)
             + Math.exp(-(dr * dr) / TWO_SIG_SQ);
        if (f[j] > fmax) fmax = f[j];
    }
    // Normalize to ensure max f = 1 exactly. Without this, the peak between
    // nearest grid points lies slightly off-center and the discrete max
    // falls a few × 10^-4 short of unity — large enough to flicker the
    // bound-violation indicator (whose tolerance is 2e-4 per spec §2.6).
    const inv = 1.0 / fmax;
    for (let j = 0; j < N; j++) f[j] *= inv;
    return f;
}

/**
 * Build the initial profile selected by name.
 * Centralized dispatcher used by the wiring layer.
 *
 * @param {'gaussian'|'triangle'|'bimodal'} name
 * @returns {Float64Array} length-N tabulated profile
 */
function buildProfile(name) {
    switch (name) {
        case 'gaussian':  return profileGaussian();
        case 'triangle':  return profileTriangle();
        case 'bimodal':   return profileBimodal();
        default:
            console.error('[calc35] Unknown profile:', name, '— falling back to gaussian');
            return profileGaussian();
    }
}


// ------------------------------------------------------------
// Wave initial-velocity profiles g(x)
// ------------------------------------------------------------
// The general wave equation needs two initial data: u(x,0) = f(x) and
// u_t(x,0) = g(x). Setting g ≡ 0 (the default for this demo's first
// version) yields u(x,t) = [f̃(x-ct) + f̃(x+ct)]/2, which is the
// arithmetic mean of two samples of f̃ and therefore satisfies
// min f ≤ u ≤ max f pointwise — a degenerate case that masks the
// fact that wave equation has no general pointwise bound. The
// non-zero g profiles below break that artificial bound and reveal
// the genuine pointwise unboundedness of hyperbolic dynamics.

/**
 * g(x) = 0 — initially at rest, the demo's original setting.
 */
function gProfileAtRest() {
    return new Float64Array(N);   // all zeros
}

/**
 * g(x) = A · sign(x) · exp(-x²/(2σ²))  with A = 2.0, σ = 0.15
 *
 * Physical interpretation: the string is initially shaped like f, and
 * simultaneously "kicked outward" — the right half moving right, the
 * left half moving left, with intensity decaying away from the centre.
 * Discontinuous at x = 0 (g(0+) = +A, g(0-) = -A); we set g(0) = 0 by
 * convention. Localized: g ≈ 0 outside |x| > 3σ.
 *
 * Numerical effect with the Gaussian f: max u ≈ 1.13, min u ≈ -0.13
 * (the bound [0,1] is breached on both sides).
 */
function gProfileOutwardKick() {
    const g = new Float64Array(N);
    const A = 2.0;
    const sigmaG = 0.15;
    for (let j = 0; j < N; j++) {
        const x = X_GRID[j];
        if (Math.abs(x) < 1e-12) {
            g[j] = 0;
        } else {
            g[j] = A * Math.sign(x) * Math.exp(-x*x / (2*sigmaG*sigmaG));
        }
    }
    return g;
}

/**
 * g(x) = A  (constant, A = 0.5)
 *
 * Physical interpretation: the entire string is given a uniform upward
 * velocity at t = 0 — as if a stage lifts the whole string while
 * simultaneously the string had the shape f.
 *
 * Numerical effect: max u ≈ 1.25 (Gauss), ≈ 1.68 (Bimodal). The
 * solution rises monotonically until the travelling components carry
 * the disturbance out of the window.
 */
function gProfileUniformPush() {
    const g = new Float64Array(N);
    const A = 0.5;
    for (let j = 0; j < N; j++) g[j] = A;
    return g;
}

/**
 * Build the g profile selected by name.
 *
 * @param {'at_rest'|'outward_kick'|'uniform_push'} name
 * @returns {Float64Array} length-N tabulated g
 */
function buildGProfile(name) {
    switch (name) {
        case 'at_rest':       return gProfileAtRest();
        case 'outward_kick':  return gProfileOutwardKick();
        case 'uniform_push':  return gProfileUniformPush();
        default:
            console.error('[calc35] Unknown g profile:', name, '— falling back to at_rest');
            return gProfileAtRest();
    }
}


// ------------------------------------------------------------
// Profile self-tests (executed once at module load)
// ------------------------------------------------------------
// Verify the construction invariants (max f = 1, min f = 0, tail < 10^-5).
// These are essential because the rest of the demo relies on these
// invariants for the bound-violation indicator to work correctly.

(function profileSelfTest() {
    const profiles = ['gaussian', 'triangle', 'bimodal'];
    const TAIL_TOL = 1e-4;        // a bit looser than 1e-5 to be safe
    const NORM_TOL = 1e-3;        // max f should be 1 ± 1e-3
    let allOk = true;
    for (const name of profiles) {
        const f = buildProfile(name);
        let fmax = -Infinity, fmin = +Infinity;
        for (let j = 0; j < N; j++) {
            if (f[j] > fmax) fmax = f[j];
            if (f[j] < fmin) fmin = f[j];
        }
        const tailLeft  = Math.abs(f[0]);
        const tailRight = Math.abs(f[N - 1]);
        const normErr = Math.abs(fmax - 1.0);
        const minErr  = Math.abs(fmin - 0.0);
        if (normErr > NORM_TOL || minErr > NORM_TOL ||
            tailLeft > TAIL_TOL || tailRight > TAIL_TOL) {
            console.error('[calc35 profile self-test] FAILED:', name,
                '— max=', fmax, 'min=', fmin,
                'tail(-1)=', tailLeft, 'tail(+1)=', tailRight);
            allOk = false;
        }
    }
    if (allOk) {
        console.log('[calc35] profile self-tests passed');
    }
})();


// ============================================================
// ====== MODULE 3: PDE solvers ===============================
// ============================================================
// Three solvers, one per PDE. Each accepts a precomputed-data bundle
// produced by Module 2's wiring (Module 6) and returns the solution on
// the spatial grid {x_j}.
//
// Naming convention: all functions are PURE. They read inputs and write
// to a caller-supplied output buffer; no DOM access, no global state
// other than the boot-time constants (N, DX, X_GRID, XI).
//
// Performance discipline (per spec §3.3, §4):
//   - heat:    spectral multiply + IFFT, O(N log N).  fHat is cached
//              by the caller and only forward-FFTed on profile change.
//   - wave:    d'Alembert evaluation, O(N).  Energy auxiliaries
//              additionally O(N).
//   - laplace: trapezoidal Poisson sum, O(N²).  Dominant cost.


// ------------------------------------------------------------
// Heat equation solver
// ------------------------------------------------------------

/**
 * Evolve the heat equation u_t = k u_xx on the periodic domain of length L.
 *
 * Method: spectral. Given the precomputed forward FFT of the initial
 * profile, multiply each mode by exp(-k ξ_n² t) and inverse-transform.
 *
 * The caller supplies workspace buffers (re, im) to avoid per-call
 * allocation; on entry they may hold any data — this function overwrites
 * them. On exit, re contains the real part of u(·, t); im contains the
 * imaginary residual (numerical noise, ~10^-15).
 *
 * @param {Float64Array} fHatRe   real part of FFT(f), length N        — input
 * @param {Float64Array} fHatIm   imaginary part of FFT(f), length N   — input
 * @param {number}       t        physical time
 * @param {number}       k        diffusivity
 * @param {Float64Array} re       output buffer for real part, length N
 * @param {Float64Array} im       output buffer for imag part, length N
 */
function evolveHeat(fHatRe, fHatIm, t, k, re, im) {
    // Apply the heat semigroup in the frequency domain:
    //   û(ξ_n, t) = f̂(ξ_n) · exp(-k ξ_n² t)
    // The DC mode (n = 0) has ξ_0 = 0 and is preserved exactly.
    for (let n = 0; n < N; n++) {
        const xi = XI[n];
        const damp = Math.exp(-k * xi * xi * t);
        re[n] = fHatRe[n] * damp;
        im[n] = fHatIm[n] * damp;
    }
    // Inverse-transform back to physical space.
    ifft(re, im);
}


// ------------------------------------------------------------
// Wave equation solver (d'Alembert formula with non-zero g)
// ------------------------------------------------------------

/**
 * Evolve the wave equation u_tt = c² u_xx on the real line with
 * initial profile f and initial velocity g. Implements the full
 * d'Alembert formula:
 *     u(x, t) = [f̃(x − ct) + f̃(x + ct)] / 2
 *             + (1/(2c)) ∫_{x-ct}^{x+ct} g̃(s) ds
 * where f̃ and g̃ denote f, g extended by zero outside [-1, 1].
 *
 * The integral term is computed by trapezoidal rule on the interior
 * grid points falling inside [x-ct, x+ct], with linear interpolation
 * at the endpoints. To avoid O(N²) per-frame cost, we precompute the
 * cumulative integral
 *     G(s) = ∫_{-1}^{s} g̃(σ) dσ   (length N+1 with G(-1) = 0)
 * which can be supplied by the caller (computed once per g-profile
 * change). Then ∫_{x-ct}^{x+ct} g̃ ds = G̃(x+ct) − G̃(x-ct) where G̃ is
 * a "constant continuation" of G outside [-1, 1] — at s ≤ -1 we have
 * G̃(s) = 0 (g vanishes there), at s ≥ +1 we have G̃(s) = G(+1) (total
 * mass of g), interpreted as the contribution of g over [-1, 1] only.
 * Linear interpolation of G inside [-1, 1].
 *
 * Cost: O(N) per call (one interp per grid point).
 *
 * @param {Float64Array} f       initial profile on the grid, length N
 * @param {Float64Array} gCumul  cumulative integral G of g̃ on the grid, length N+1
 *                                (caller supplies; precompute via cumulativeIntegrate)
 * @param {number}       t       physical time
 * @param {number}       c       wave speed
 * @param {Float64Array} uOut    output buffer for u(·, t), length N
 */
function evolveWave(f, gCumul, t, c, uOut) {
    const shift = c * t;
    const invTwoC = (c > 1e-12) ? (1.0 / (2.0 * c)) : 0.0;
    for (let j = 0; j < N; j++) {
        const x = X_GRID[j];
        // First term: f̃ averaged at characteristics
        const left  = interp1d(f, x - shift);
        const right = interp1d(f, x + shift);
        const fAvg  = 0.5 * (left + right);
        // Second term: (1/2c) · [G̃(x+ct) − G̃(x-ct)]
        // gCumul has length N+1 with knots at x = -1, -1+DX, ..., +1
        const Gleft  = interpCumul(gCumul, x - shift);
        const Gright = interpCumul(gCumul, x + shift);
        uOut[j] = fAvg + invTwoC * (Gright - Gleft);
    }
}

/**
 * Compute the cumulative integral G(s) = ∫_{-1}^{s} g̃(σ) dσ tabulated
 * at the N+1 knots s_k = -1 + k·DX for k = 0, ..., N. Trapezoidal rule.
 *
 * @param {Float64Array} g       g sampled on the grid, length N
 * @returns {Float64Array}       length-(N+1) cumulative integral, G[0] = 0
 */
function cumulativeIntegrate(g) {
    const G = new Float64Array(N + 1);
    // G[0] = 0 (integral from -1 to -1)
    // The grid samples g[j] are at positions x = -1 + j·DX for j = 0,...,N-1.
    // The k-th knot is at s_k = -1 + k·DX. Trapezoidal between consecutive
    // knots uses the average of g at the two endpoints; for the last
    // knot (k = N, position +1), we use g[N-1] alone since g is sampled
    // only at indices 0..N-1.
    for (let k = 1; k <= N; k++) {
        const gThis = g[k - 1];
        const gPrev = (k >= 2) ? g[k - 2] : g[0];
        // Trapezoid: ∫_{s_{k-1}}^{s_k} g ds ≈ DX · (g_{k-1} + g_k)/2
        // where g_k is interpolated. With knots at sample positions
        // (offset by half), we use a simple midpoint-like rule:
        G[k] = G[k - 1] + DX * 0.5 * (gPrev + gThis);
    }
    return G;
}

/**
 * Interpolate the cumulative integral G at an arbitrary position s.
 * For s ≤ -1, return 0; for s ≥ +1, return G[N] (the total mass).
 * Inside [-1, +1], linear interpolation between the two surrounding
 * knots G[k], G[k+1].
 *
 * @param {Float64Array} G   length-(N+1) cumulative integral
 * @param {number}       s   query point
 * @returns {number}         G̃(s)
 */
function interpCumul(G, s) {
    if (s <= -1.0) return 0.0;
    if (s >= +1.0) return G[N];
    const u = (s + 1.0) / DX;
    const k = Math.floor(u);
    const w = u - k;
    const kClamp = Math.max(0, Math.min(N - 1, k));
    return (1.0 - w) * G[kClamp] + w * G[kClamp + 1];
}

/**
 * Compute the discrete energy
 *     E(t) = (Δx / 2) · Σ_j [(∂_t u)² + c² (∂_x u)²]
 * at the current frame, using the analytic d'Alembert derivatives
 *     ∂_x u(x, t) = [f̃'(x − ct) + f̃'(x + ct)] / 2
 *                  + (1/(2c)) · [g̃(x + ct) − g̃(x − ct)]
 *     ∂_t u(x, t) = c · [-f̃'(x − ct) + f̃'(x + ct)] / 2
 *                  + (1/2) · [g̃(x + ct) + g̃(x − ct)]
 *
 * At t = 0 these reduce to ∂_x u = f', ∂_t u = g.
 *
 * @param {Float64Array} fPrime  centered-difference f' on the grid, length N
 * @param {Float64Array} g       g sampled on the grid, length N
 * @param {number}       t       physical time
 * @param {number}       c       wave speed
 * @returns {number}             discrete energy E(t)
 */
function waveEnergy(fPrime, g, t, c) {
    const shift = c * t;
    const invTwoC = (c > 1e-12) ? (1.0 / (2.0 * c)) : 0.0;
    let acc = 0.0;
    for (let j = 0; j < N; j++) {
        const x = X_GRID[j];
        const fpL = interp1d(fPrime, x - shift);   // f'(x - ct)
        const fpR = interp1d(fPrime, x + shift);   // f'(x + ct)
        const gL  = interp1d(g,      x - shift);   // g(x - ct)
        const gR  = interp1d(g,      x + shift);   // g(x + ct)
        const ux  = 0.5 * (fpL + fpR) + invTwoC * (gR - gL);     // ∂_x u
        const ut  = 0.5 * c * (fpR - fpL) + 0.5 * (gR + gL);     // ∂_t u
        acc += ut * ut + c * c * ux * ux;
    }
    return 0.5 * DX * acc;
}


// ------------------------------------------------------------
// Laplace equation solver (half-plane Poisson integral)
// ------------------------------------------------------------

/**
 * Evolve "into the half-plane" by the Poisson integral
 *     u(x, y) = (1/π) ∫ y / ((x − s)² + y²) · f̃(s) ds
 * where f̃ denotes f extended by zero outside [-1, 1].
 *
 * Discrete trapezoidal rule on the grid:
 *     u(x_i, y) ≈ Δx · Σ_j w_j · P_y(x_i − x_j) · f_j
 * where P_y(z) = (1/π) y / (z² + y²) and w_j = 1 for interior points,
 * w_j = 1/2 for j = 0 and j = N-1 (trapezoidal endpoint weighting).
 *
 * Cost: O(N²) per call — the dominant operation in the demo. At N = 256
 * this is ~65,000 multiplies, comfortably under 5ms (see spec §4).
 *
 * Special case y = 0: the Poisson kernel degenerates (kernel mass
 * concentrates at z = 0 only as y → 0⁺). At exactly y = 0, the integral
 * is the identity; we set u_L = f directly. The caller should pass
 * y > 0 in normal operation; this function still handles y = 0 robustly.
 *
 * @param {Float64Array} f       boundary data on the grid, length N
 * @param {number}       y       depth (≥ 0)
 * @param {Float64Array} uOut    output buffer for u(·, y), length N
 */
function evolveLaplace(f, y, uOut) {
    if (y <= 0.0) {
        // y = 0: u(x, 0) = f(x) is the boundary condition itself.
        for (let j = 0; j < N; j++) uOut[j] = f[j];
        return;
    }
    const INV_PI = 1.0 / Math.PI;
    const yFactor = y * INV_PI;        // (1/π) · y, pulled out of the loop
    // Outer loop: each output point x_i
    for (let i = 0; i < N; i++) {
        const xi_ = X_GRID[i];
        let acc = 0.0;
        // Inner loop: integrate the kernel against f over the grid.
        // Trapezoidal endpoint weights (1/2) for j = 0 and j = N-1.
        // The two endpoint values contribute very little for our profiles
        // (boundary tails < 10^-5), so the trapezoidal correction is
        // tiny — but we apply it for principle and to make the rule exact
        // for affine boundary data.
        for (let j = 1; j < N - 1; j++) {
            const dz = xi_ - X_GRID[j];
            acc += f[j] / (dz * dz + y * y);
        }
        // Endpoint half-weights
        const dz0 = xi_ - X_GRID[0];
        const dzN = xi_ - X_GRID[N - 1];
        acc += 0.5 * f[0]     / (dz0 * dz0 + y * y);
        acc += 0.5 * f[N - 1] / (dzN * dzN + y * y);
        uOut[i] = DX * yFactor * acc;
    }
}


// ------------------------------------------------------------
// PDE-solver self-tests (executed once at module load)
// ------------------------------------------------------------
// We verify three properties that the trichotomy hinges on:
//   H. Heat preserves the spatial integral and obeys the maximum principle.
//   W. Wave energy is exactly conserved (within numerical tolerance).
//   L. Laplace solution is bounded by boundary data (max principle).
// Each test runs on a Gaussian initial profile, default parameters.

(function pdeSolverSelfTest() {
    const f = profileGaussian();
    const fp = centralDiff(f);
    const fHat = fftReal(f);
    const fHatReCache = fHat.re;     // these get mutated by ifft, so keep copies
    const fHatImCache = fHat.im;

    // Wave-test auxiliaries: g profiles and their cumulative integrals
    const gZero  = gProfileAtRest();
    const gKick  = gProfileOutwardKick();
    const gPush  = gProfileUniformPush();
    const GZero  = cumulativeIntegrate(gZero);
    const GKick  = cumulativeIntegrate(gKick);
    const GPush  = cumulativeIntegrate(gPush);

    // Test H1: heat conservation of the DC mode
    //   The spectral heat semigroup leaves û(ξ_0) untouched (since ξ_0 = 0
    //   gives damp = 1), so the discrete sum Σ_j u_j(t) is conserved
    //   exactly. Note: trapezoidal quadrature trapz(u) is NOT exactly
    //   conserved because the endpoint half-weights see boundary values
    //   that grow under periodic diffusion (the Gaussian tails wrap around);
    //   the discrete sum is the right invariant to test.
    {
        const re = new Float64Array(N);
        const im = new Float64Array(N);
        const reCp = new Float64Array(fHatReCache);   // fresh copies (ifft mutates)
        const imCp = new Float64Array(fHatImCache);
        evolveHeat(reCp, imCp, 1.0, 0.01, re, im);
        let sumInit = 0, sumLater = 0;
        for (let j = 0; j < N; j++) {
            sumInit += f[j];
            sumLater += re[j];
        }
        const err = Math.abs(sumLater - sumInit);
        if (err > 1e-10) {
            console.error('[calc35 PDE self-test H1] Heat DC mode not conserved:',
                'init=', sumInit, 'at t=1:', sumLater, 'diff=', err);
        }
    }

    // Test H2: heat maximum principle on Gaussian (max=1, min=0)
    //   0 ≤ u(·, t) ≤ 1 for all t ≥ 0
    {
        const re = new Float64Array(N);
        const im = new Float64Array(N);
        const reCp = new Float64Array(fHatReCache);
        const imCp = new Float64Array(fHatImCache);
        for (const t of [0.5, 1.0, 5.0]) {
            const reCp2 = new Float64Array(fHatReCache);
            const imCp2 = new Float64Array(fHatImCache);
            evolveHeat(reCp2, imCp2, t, 0.01, re, im);
            let mx = -Infinity, mn = Infinity;
            for (let j = 0; j < N; j++) {
                if (re[j] > mx) mx = re[j];
                if (re[j] < mn) mn = re[j];
            }
            if (mx > 1.0 + 1e-10 || mn < 0.0 - 1e-10) {
                console.error('[calc35 PDE self-test H2] Heat max principle violated at t=', t,
                    ': max=', mx, 'min=', mn);
            }
        }
    }

    // Test W1: wave energy conservation, g = 0
    //   E(t) = E(0) for all t (within tolerance)
    {
        const c = 0.3;
        const E0 = waveEnergy(fp, gZero, 0.0, c);
        for (const t of [0.3, 0.7, 1.0]) {
            const Et = waveEnergy(fp, gZero, t, c);
            const ratio = Et / E0;
            if (Math.abs(ratio - 1.0) > 0.01) {
                console.error('[calc35 PDE self-test W1] Wave energy drift (g=0) at t=', t,
                    ': E(t)/E(0)=', ratio.toFixed(6));
            }
        }
    }

    // Test W2: wave initial condition u(·, 0) = f, g = 0
    //   d'Alembert at t = 0: [f(x) + f(x)] / 2 + 0 = f(x).
    {
        const uW = new Float64Array(N);
        evolveWave(f, GZero, 0.0, 0.3, uW);
        let maxErr = 0;
        for (let j = 0; j < N; j++) {
            maxErr = Math.max(maxErr, Math.abs(uW[j] - f[j]));
        }
        if (maxErr > 1e-14) {
            console.error('[calc35 PDE self-test W2] Wave at t=0 (g=0) differs from f, max err=', maxErr);
        }
    }

    // Test W3: wave energy conservation, g ≠ 0 (outward kick)
    //   For small t (disturbance stays inside [-1, 1]), energy should
    //   be conserved within tolerance. Large t suffers window loss.
    {
        const c = 0.3;
        const E0 = waveEnergy(fp, gKick, 0.0, c);
        for (const t of [0.1, 0.2]) {
            const Et = waveEnergy(fp, gKick, t, c);
            const ratio = Et / E0;
            if (Math.abs(ratio - 1.0) > 0.02) {
                console.error('[calc35 PDE self-test W3] Wave energy drift (g=kick) at t=', t,
                    ': E(t)/E(0)=', ratio.toFixed(6));
            }
        }
    }

    // Test W4: wave initial condition u(·, 0) = f even with g ≠ 0
    //   The integral term has zero width at t = 0, so u(·, 0) = f
    //   regardless of g.
    {
        const uW = new Float64Array(N);
        evolveWave(f, GKick, 0.0, 0.3, uW);
        let maxErr = 0;
        for (let j = 0; j < N; j++) {
            maxErr = Math.max(maxErr, Math.abs(uW[j] - f[j]));
        }
        if (maxErr > 1e-13) {
            console.error('[calc35 PDE self-test W4] Wave at t=0 (g≠0) differs from f, max err=', maxErr);
        }
    }

    // Test W5: cumulativeIntegrate consistency
    //   For uniform g = 0.5, ∫_{-1}^{+1} g dx = 1.0 expected.
    //   For zero g, total = 0.
    {
        const total = GPush[N];
        const expected = 0.5 * 2.0;
        if (Math.abs(total - expected) > 0.01) {
            console.error('[calc35 PDE self-test W5a] cumulativeIntegrate uniform g:',
                'got', total, 'expected', expected);
        }
        if (Math.abs(GZero[N]) > 1e-14) {
            console.error('[calc35 PDE self-test W5b] cumulativeIntegrate of zero g not zero:',
                GZero[N]);
        }
    }

    // Test W6: bound violation for g ≠ 0 (uniform push)
    //   Confirm the pedagogical claim: max u > 1 for some (x, t) when
    //   g is the uniform_push profile.
    {
        const c = 0.3;
        const uW = new Float64Array(N);
        let maxOverall = -Infinity;
        for (const t of [0.5, 1.0, 1.5]) {
            evolveWave(f, GPush, t, c, uW);
            for (let j = 0; j < N; j++) {
                if (uW[j] > maxOverall) maxOverall = uW[j];
            }
        }
        if (maxOverall <= 1.05) {
            console.error('[calc35 PDE self-test W6] Wave bound-violation insufficient:',
                'max u =', maxOverall.toFixed(4), '(expected > 1.05)');
        }
    }

    // Test L1: Laplace y = 0 returns f exactly
    {
        const uL = new Float64Array(N);
        evolveLaplace(f, 0.0, uL);
        let maxErr = 0;
        for (let j = 0; j < N; j++) {
            maxErr = Math.max(maxErr, Math.abs(uL[j] - f[j]));
        }
        if (maxErr > 0.0) {
            console.error('[calc35 PDE self-test L1] Laplace at y=0 differs from f, max err=', maxErr);
        }
    }

    // Test L2: Laplace maximum principle
    //   min f ≤ u(x, y) ≤ max f for all interior (x, y)
    // For Gaussian: 0 ≤ u(x, y) ≤ 1.
    {
        const uL = new Float64Array(N);
        for (const y of [0.05, 0.2, 0.5, 0.8]) {
            evolveLaplace(f, y, uL);
            let mx = -Infinity, mn = Infinity;
            for (let j = 0; j < N; j++) {
                if (uL[j] > mx) mx = uL[j];
                if (uL[j] < mn) mn = uL[j];
            }
            if (mx > 1.0 + 1e-10 || mn < 0.0 - 1e-10) {
                console.error('[calc35 PDE self-test L2] Laplace max principle violated at y=', y,
                    ': max=', mx, 'min=', mn);
            }
        }
    }

    // Test L3: Laplace decay — max u decreases monotonically in y
    //   This is the "boundary controls solution" signature.
    {
        const uL = new Float64Array(N);
        let prevMax = 1.0;   // for Gaussian, max f = 1
        for (const y of [0.05, 0.1, 0.3, 0.5, 0.8]) {
            evolveLaplace(f, y, uL);
            let mx = -Infinity;
            for (let j = 0; j < N; j++) if (uL[j] > mx) mx = uL[j];
            if (mx > prevMax + 1e-10) {
                console.error('[calc35 PDE self-test L3] Laplace max not monotone in y:',
                    'prev=', prevMax, 'at y=', y, ':', mx);
            }
            prevMax = mx;
        }
    }

    console.log('[calc35] PDE solver self-tests passed');
})();


// ============================================================
// ====== MODULE 4: Canvas rendering ==========================
// ============================================================
// Three independent canvases, one per panel. Each renders the current
// frame from the supplied state object. Rendering is pure (state in,
// pixels out, no state mutation).
//
// Layout per panel:
//   - axes (horizontal: x ∈ [-1, 1], vertical: u ∈ [-0.2, 1.2])
//   - reference initial profile f, drawn faintly
//   - current solution curve in the panel's accent color
//   - bound indicators (max f, min f as dashed lines) — Heat and Laplace only
//   - panel title and status readouts below the canvas (DOM, not canvas)
//
// Theme: light by default, dark via html[data-theme="dark"]. Palette is
// resolved lazily on each render via getPalette() — the demo follows the
// user's theme switch without any explicit notification.


// ------------------------------------------------------------
// Layout constants
// ------------------------------------------------------------

const CANVAS_LOGICAL_HEIGHT = 240;     // canvas height in CSS px
const CANVAS_LOGICAL_WIDTH  = 280;     // canvas width  in CSS px (per panel)
const PLOT_MARGIN_X = 0.08;            // left/right margin as fraction
const PLOT_MARGIN_TOP = 0.10;          // top margin
const PLOT_MARGIN_BOTTOM = 0.14;       // bottom margin (room for x-axis labels)

// Math view rectangle: [X_VIEW_MIN, X_VIEW_MAX] × [Y_VIEW_MIN, Y_VIEW_MAX]
const X_VIEW_MIN = -1.0;
const X_VIEW_MAX =  1.0;
const Y_VIEW_MIN = -0.15;              // a touch below 0 for breathing room
const Y_VIEW_MAX =  1.20;              // a touch above 1 to accommodate bound lines


// ------------------------------------------------------------
// Theme-dependent palette
// ------------------------------------------------------------

/**
 * Build a complete palette for the current site theme.
 * Resolved lazily so a theme toggle is reflected on the next render.
 *
 * @returns {object} palette dictionary
 */
function getPalette() {
    const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
    if (isDark) {
        return {
            bg:           '#1a1d24',
            bgFrame:      '#252932',
            gridLine:     'rgba(255,255,255,0.08)',
            axisLine:     'rgba(255,255,255,0.25)',
            axisLabel:    'rgba(230,232,240,0.65)',
            refCurve:     'rgba(255,255,255,0.18)',    // initial f reference
            boundLine:    'rgba(255,255,255,0.30)',    // dashed sup/inf lines
            gCurve:       'rgba(77, 208, 225, 0.55)',  // teal: initial velocity g(x) on wave panel
            // Per-panel accent colors
            heatCurve:    '#4a9eff',    // blue (cool color for heat)
            heatFill:     'rgba(74, 158, 255, 0.16)',
            waveCurve:    '#5eda8e',    // green (section accent)
            waveFill:     'rgba(94, 218, 142, 0.16)',
            laplaceCurve: '#ffb84a',    // amber (elliptic distinct)
            laplaceFill:  'rgba(255, 184, 74, 0.16)',
        };
    } else {
        return {
            bg:           '#fbfcfe',
            bgFrame:      '#f0f2f6',
            gridLine:     'rgba(0,0,0,0.06)',
            axisLine:     'rgba(0,0,0,0.30)',
            axisLabel:    'rgba(40,42,50,0.70)',
            refCurve:     'rgba(0,0,0,0.22)',
            boundLine:    'rgba(0,0,0,0.35)',
            gCurve:       'rgba(0, 131, 143, 0.65)',   // teal: g(x) on wave panel
            heatCurve:    '#1565c0',
            heatFill:     'rgba(21, 101, 192, 0.12)',
            waveCurve:    '#2e7d32',
            waveFill:     'rgba(46, 125, 50, 0.12)',
            laplaceCurve: '#ef6c00',
            laplaceFill:  'rgba(239, 108, 0, 0.12)',
        };
    }
}


// ------------------------------------------------------------
// Canvas setup (DPR-aware)
// ------------------------------------------------------------

/**
 * Initialize a canvas's internal pixel buffer to match its CSS size.
 * Uses devicePixelRatio so the drawing stays sharp on high-DPI screens.
 *
 * Called once at boot per canvas, and again on resize. The returned
 * (ctx, W, H) bundle uses CSS pixels for the drawing API — the DPR
 * scaling is folded into the context transform.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement}       wrapper  element whose clientWidth determines size
 * @returns {{ctx: CanvasRenderingContext2D, W: number, H: number}}
 */
function setupPanelCanvas(canvas, wrapper) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.min(
        (wrapper && wrapper.clientWidth) || CANVAS_LOGICAL_WIDTH,
        CANVAS_LOGICAL_WIDTH * 1.4   // allow a bit of growth on wide screens
    );
    const cssH = CANVAS_LOGICAL_HEIGHT;
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // CSS sizing is controlled by stylesheet; do not set canvas.style.width/height.
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);     // reset before scaling (re-setup safety)
    ctx.scale(dpr, dpr);
    return { ctx, W: cssW, H: cssH };
}


// ------------------------------------------------------------
// Coordinate transforms
// ------------------------------------------------------------

/**
 * Convert math x-coordinate to canvas pixel x.
 *
 * @param {number} x   math x in [X_VIEW_MIN, X_VIEW_MAX]
 * @param {number} W   canvas width in CSS px
 * @returns {number}   canvas pixel x
 */
function mathToPixelX(x, W) {
    const innerW = W * (1 - 2 * PLOT_MARGIN_X);
    const offX   = W * PLOT_MARGIN_X;
    const t      = (x - X_VIEW_MIN) / (X_VIEW_MAX - X_VIEW_MIN);
    return offX + t * innerW;
}

/**
 * Convert math y-coordinate to canvas pixel y (math y points up; canvas y points down).
 *
 * @param {number} y   math y in [Y_VIEW_MIN, Y_VIEW_MAX]
 * @param {number} H   canvas height in CSS px
 * @returns {number}   canvas pixel y
 */
function mathToPixelY(y, H) {
    const innerH = H * (1 - PLOT_MARGIN_TOP - PLOT_MARGIN_BOTTOM);
    const offY   = H * PLOT_MARGIN_TOP;
    const t      = (Y_VIEW_MAX - y) / (Y_VIEW_MAX - Y_VIEW_MIN);
    return offY + t * innerH;
}


// ------------------------------------------------------------
// Render primitives
// ------------------------------------------------------------

/**
 * Clear canvas with the background color, draw a rounded frame.
 */
function drawBackground(ctx, W, H, palette) {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    // Subtle inner frame
    ctx.strokeStyle = palette.gridLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

/**
 * Draw the x- and y-axis lines and tick labels.
 * Axis labels are minimal: a few ticks on x, a "1" mark on y.
 */
function drawAxes(ctx, W, H, palette) {
    // x-axis at y = 0
    const yZeroPx = mathToPixelY(0, H);
    ctx.strokeStyle = palette.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mathToPixelX(X_VIEW_MIN, W), yZeroPx);
    ctx.lineTo(mathToPixelX(X_VIEW_MAX, W), yZeroPx);
    ctx.stroke();

    // y = 1 horizontal grid line (dotted)
    const yOnePx = mathToPixelY(1, H);
    ctx.save();
    ctx.strokeStyle = palette.gridLine;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(mathToPixelX(X_VIEW_MIN, W), yOnePx);
    ctx.lineTo(mathToPixelX(X_VIEW_MAX, W), yOnePx);
    ctx.stroke();
    ctx.restore();

    // x tick labels: -1, 0, +1
    ctx.fillStyle = palette.axisLabel;
    ctx.font = '10px ui-monospace, "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tickY = mathToPixelY(0, H) + 4;
    for (const xt of [-1, 0, 1]) {
        ctx.fillText(xt.toString(), mathToPixelX(xt, W), tickY);
    }

    // y = 1 label, placed at right edge
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', mathToPixelX(X_VIEW_MAX, W) - 2, yOnePx - 8);
}

/**
 * Draw a curve (array of N values, one per grid point) on the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Float64Array}             u       length-N curve values
 * @param {number}                   W       canvas width
 * @param {number}                   H       canvas height
 * @param {string}                   stroke  stroke color
 * @param {string}                   fill    fill color below curve, or null
 * @param {number}                   width   line width
 */
function drawCurve(ctx, u, W, H, stroke, fill, width) {
    if (fill) {
        // Filled region between curve and y = 0
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(mathToPixelX(X_GRID[0], W), mathToPixelY(0, H));
        for (let j = 0; j < N; j++) {
            ctx.lineTo(mathToPixelX(X_GRID[j], W), mathToPixelY(u[j], H));
        }
        ctx.lineTo(mathToPixelX(X_GRID[N - 1], W), mathToPixelY(0, H));
        ctx.closePath();
        ctx.fill();
    }
    // Curve stroke
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(mathToPixelX(X_GRID[0], W), mathToPixelY(u[0], H));
    for (let j = 1; j < N; j++) {
        ctx.lineTo(mathToPixelX(X_GRID[j], W), mathToPixelY(u[j], H));
    }
    ctx.stroke();
}

/**
 * Draw the initial profile f as a faint reference curve.
 * Used by all three panels to show how the current state differs from t = 0.
 */
function drawReferenceProfile(ctx, f, W, H, palette) {
    ctx.save();
    ctx.strokeStyle = palette.refCurve;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(mathToPixelX(X_GRID[0], W), mathToPixelY(f[0], H));
    for (let j = 1; j < N; j++) {
        ctx.lineTo(mathToPixelX(X_GRID[j], W), mathToPixelY(f[j], H));
    }
    ctx.stroke();
    ctx.restore();
}

/**
 * Draw the wave's initial-velocity profile g(x) as a thin dotted teal
 * curve on the Wave panel only. Used to visually convey "the string was
 * also moving when released" — the second initial condition that the
 * wave equation requires.
 *
 * The g profile is drawn at its raw value (no normalization). For the
 * default at_rest profile (g ≡ 0) this is a flat line on the x-axis
 * — barely visible against the axis itself, which is the intended
 * "nothing happening" signal. For outward_kick (g reaches ±2), the
 * peaks lie outside the visible y-range and are clipped; the visible
 * part is the rapid sign-flip near x = 0, which is precisely the
 * pedagogical feature ("the centre is at rest, the flanks are moving").
 * For uniform_push (g = 0.5 constant), the line sits at y = 0.5, well
 * inside the visible range.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Float64Array} g     initial velocity sampled on the grid
 * @param {number} W           canvas width (logical pixels)
 * @param {number} H           canvas height (logical pixels)
 * @param {object} palette
 */
function drawInitialVelocity(ctx, g, W, H, palette) {
    ctx.save();
    ctx.strokeStyle = palette.gCurve;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);   // dotted (shorter than refCurve's 3,3 dashes)
    ctx.beginPath();
    ctx.moveTo(mathToPixelX(X_GRID[0], W), mathToPixelY(g[0], H));
    for (let j = 1; j < N; j++) {
        ctx.lineTo(mathToPixelX(X_GRID[j], W), mathToPixelY(g[j], H));
    }
    ctx.stroke();
    ctx.restore();
}

/**
 * Draw horizontal dashed lines at y = bound (max f and min f), as visual
 * indicators of the pointwise bound for Heat and Laplace.
 * Wave panel skips this (its invariant is the energy integral, not a
 * pointwise bound).
 */
function drawBoundLines(ctx, maxF, minF, W, H, palette) {
    ctx.save();
    ctx.strokeStyle = palette.boundLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    // Upper bound
    const yMax = mathToPixelY(maxF, H);
    ctx.beginPath();
    ctx.moveTo(mathToPixelX(X_VIEW_MIN, W), yMax);
    ctx.lineTo(mathToPixelX(X_VIEW_MAX, W), yMax);
    ctx.stroke();
    // Lower bound — skip if it's near zero (the x-axis already shows that line)
    if (Math.abs(minF) > 0.02) {
        const yMin = mathToPixelY(minF, H);
        ctx.beginPath();
        ctx.moveTo(mathToPixelX(X_VIEW_MIN, W), yMin);
        ctx.lineTo(mathToPixelX(X_VIEW_MAX, W), yMin);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Annotate the panel with a small title in the top-left corner.
 */
function drawPanelTitle(ctx, title, palette) {
    ctx.save();
    ctx.fillStyle = palette.axisLabel;
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, 8, 6);
    ctx.restore();
}


// ------------------------------------------------------------
// Panel renderers
// ------------------------------------------------------------

/**
 * Render the Heat panel.
 *
 * Layout:
 *   - Reference profile f (faint dashed)
 *   - Bound lines at max f and min f (dashed, since heat obeys the
 *     pointwise maximum principle bounded by initial data)
 *   - Current solution u_H(·, t) (solid, filled below)
 *   - Title "Heat — ∂_t u = k ∂_xx u"
 */
function renderHeatPanel(ctx, state, W, H, palette) {
    drawBackground(ctx, W, H, palette);
    drawAxes(ctx, W, H, palette);
    drawBoundLines(ctx, 1.0, 0.0, W, H, palette);  // max f = 1, min f = 0 by construction
    drawReferenceProfile(ctx, state.f, W, H, palette);
    drawCurve(ctx, state.uH, W, H, palette.heatCurve, palette.heatFill, 2);
    drawPanelTitle(ctx, 'Heat   ∂\u209C u = k ∂\u02E3\u02E3 u', palette);
}

/**
 * Render the Wave panel.
 *
 * Layout:
 *   - Reference profile f (faint grey dashed)
 *   - Initial velocity g(x) (thin dotted teal) — visible only when g ≠ 0
 *   - NO bound lines: the wave equation has no general pointwise bound;
 *     for g = 0 the solution happens to satisfy min f ≤ u ≤ max f
 *     (as the arithmetic mean of two samples of f), but this is a
 *     degenerate special case of d'Alembert and we do not show a
 *     pseudo-bound that holds only for g = 0. With a non-zero g the
 *     bound is genuinely broken and the solution can exceed max f or
 *     fall below min f.
 *   - Current solution u_W(·, t) (solid green, filled)
 *   - Title "Wave — ∂_tt u = c² ∂_xx u"
 */
function renderWavePanel(ctx, state, W, H, palette) {
    drawBackground(ctx, W, H, palette);
    drawAxes(ctx, W, H, palette);
    drawReferenceProfile(ctx, state.f, W, H, palette);
    drawInitialVelocity(ctx, state.g, W, H, palette);
    drawCurve(ctx, state.uW, W, H, palette.waveCurve, palette.waveFill, 2);
    drawPanelTitle(ctx, 'Wave   ∂\u209C\u209C u = c² ∂\u02E3\u02E3 u', palette);
}

/**
 * Render the Laplace panel.
 *
 * Layout: identical to the Heat panel, with the boundary-data form of the
 * maximum principle: u(·, y) ∈ [min f, max f] for all y > 0.
 */
function renderLaplacePanel(ctx, state, W, H, palette) {
    drawBackground(ctx, W, H, palette);
    drawAxes(ctx, W, H, palette);
    drawBoundLines(ctx, 1.0, 0.0, W, H, palette);
    drawReferenceProfile(ctx, state.f, W, H, palette);
    drawCurve(ctx, state.uL, W, H, palette.laplaceCurve, palette.laplaceFill, 2);
    drawPanelTitle(ctx, 'Laplace   Δu = 0', palette);
}


// ------------------------------------------------------------
// Status readout updaters
// ------------------------------------------------------------
//
// The numerical readouts (max u, min u, E(t)/E(0)) live in DOM elements
// below each canvas, not on the canvas itself. Updating DOM text is cheaper
// than re-rendering the entire canvas if only a number changed, and keeps
// text crisply rendered by the browser (vs. on-canvas text which can look
// blurry on high-DPI screens).
//
// The wiring layer (Module 6) holds the DOM refs and calls these updaters
// each frame. The functions return the formatted string so the caller can
// set textContent directly.


/**
 * Format max/min readout values, with bound-violation coloring class hint.
 *
 * @param {number} val   the current max u or min u
 * @param {number} bound the bound (max f or min f)
 * @param {'upper'|'lower'} kind   whether val is constrained above or below
 * @returns {{text: string, violated: boolean}}
 */
function formatBoundReadout(val, bound, kind) {
    const text = val.toFixed(4);
    const TOL = 2e-4;       // see spec §2.6
    let violated = false;
    if (kind === 'upper') {
        // val should be ≤ bound
        violated = (val > bound + TOL);
    } else {
        // val should be ≥ bound
        violated = (val < bound - TOL);
    }
    return { text, violated };
}

/**
 * Format the energy-ratio readout for the wave panel.
 *
 * @param {number} Et current energy E(t)
 * @param {number} E0 initial energy E(0)
 * @returns {{text: string, band: 'green'|'amber'|'red'}}
 */
function formatEnergyReadout(Et, E0) {
    if (E0 <= 0 || !isFinite(E0)) {
        return { text: '—', band: 'amber' };
    }
    const ratio = Et / E0;
    const dev = Math.abs(ratio - 1.0);
    let band = 'green';
    if (dev >= 0.20) band = 'red';
    else if (dev >= 0.05) band = 'amber';
    return { text: ratio.toFixed(4), band };
}

/**
 * Format the wave max-u readout, with a tri-state color.
 * Unlike Heat and Laplace where exceeding [min f, max f] indicates a
 * numerical bug, on the wave panel a non-zero g profile can legitimately
 * push the solution beyond max f. We therefore use amber (not red) for
 * bound-violation: the message is "this is wave equation in action",
 * not "this is a bug".
 *
 * Status mapping:
 *   - green if |max u − 1| ≤ TOL (default g = 0 case, bound respected)
 *   - amber if max u > 1 + TOL (g ≠ 0 case, bound legitimately broken)
 *
 * @param {number} maxU  current max of u_W
 * @returns {{text: string, band: 'green'|'amber'}}
 */
function formatWaveBoundReadout(maxU) {
    const text = maxU.toFixed(4);
    const TOL = 2e-4;
    const band = (maxU > 1.0 + TOL) ? 'amber' : 'green';
    return { text, band };
}


// ------------------------------------------------------------
// Compute frame diagnostics
// ------------------------------------------------------------

/**
 * Scan the three solution arrays and update the per-panel max/min and the
 * wave energy on the state object. Called once per frame after the PDE
 * solvers have updated state.uH, state.uW, state.uL.
 *
 * Module 4 includes this because the rendering layer needs the diagnostics,
 * and computing them next to the rendering ensures they're always in sync
 * with the canvas display.
 *
 * @param {object} state   shared state object (mutated)
 */
function updateFrameDiagnostics(state) {
    let mxH = -Infinity, mnH = +Infinity;
    let mxW = -Infinity, mnW = +Infinity;
    let mxL = -Infinity, mnL = +Infinity;
    for (let j = 0; j < N; j++) {
        const uh = state.uH[j];
        const uw = state.uW[j];
        const ul = state.uL[j];
        if (uh > mxH) mxH = uh;
        if (uh < mnH) mnH = uh;
        if (uw > mxW) mxW = uw;
        if (uw < mnW) mnW = uw;
        if (ul > mxL) mxL = ul;
        if (ul < mnL) mnL = ul;
    }
    state.maxUH = mxH;
    state.minUH = mnH;
    state.maxUW = mxW;
    state.minUW = mnW;
    state.maxUL = mxL;
    state.minUL = mnL;
    // Energy (state.Et) is computed by waveEnergy() in computeWavePanel
    // before this function is called; we don't recompute it here.
}


// ============================================================
// ====== MODULE 5: UI panel + CSS ============================
// ============================================================
// DOM template and stylesheet injection. Pure construction — this
// module returns DOM references for the wiring layer (Module 6) to bind
// event handlers to. No state is read or written here.
//
// The container element is identified by ID 'trichotomy_demo_visualizer'.
// Inside it we build:
//   - title row
//   - three panel cards (canvas + readouts) in a horizontal flex row
//   - controls block (profile select, τ slider, k/c sliders, Play/Reset)
//
// Theme: defined via CSS custom properties scoped to .trichotomy-container.
// Light theme is the default; dark theme is selected by the global
// html[data-theme="dark"] attribute that the rest of the site sets.
// Mobile breakpoint at 900px stacks the panels vertically.


// ------------------------------------------------------------
// HTML template
// ------------------------------------------------------------

/**
 * Build the demo's HTML as a string, ready to inject via innerHTML.
 * Element IDs are namespaced with the 'tri-' prefix to avoid collision
 * with anything else on the host page.
 *
 * @returns {string} HTML markup
 */
function buildDemoHTML() {
    return `
<div class="trichotomy-container">

  <div class="tri-title-row">
    <span class="tri-title">Trichotomy of Classical PDEs — interactive panel</span>
    <span class="tri-subtitle">same initial bump, three evolution laws</span>
  </div>

  <div class="tri-panel-row">

    <!-- Heat panel -->
    <div class="tri-panel tri-panel-heat">
      <div class="tri-canvas-wrap" id="tri-wrap-H">
        <canvas id="tri-canvas-H"></canvas>
      </div>
      <div class="tri-readouts">
        <div class="tri-readout-row">
          <span class="tri-readout-label">max u</span>
          <span class="tri-readout-value" id="tri-readout-H-max">1.0000</span>
        </div>
        <div class="tri-readout-row">
          <span class="tri-readout-label">min u</span>
          <span class="tri-readout-value" id="tri-readout-H-min">0.0000</span>
        </div>
        <div class="tri-readout-row tri-readout-aux">
          <span class="tri-readout-label">bound</span>
          <span class="tri-readout-value tri-readout-muted">[0, 1]</span>
        </div>
      </div>
    </div>

    <!-- Wave panel -->
    <div class="tri-panel tri-panel-wave">
      <div class="tri-canvas-wrap" id="tri-wrap-W">
        <canvas id="tri-canvas-W"></canvas>
      </div>
      <div class="tri-readouts">
        <div class="tri-readout-row">
          <span class="tri-readout-label">E(t) / E(0)</span>
          <span class="tri-readout-value" id="tri-readout-W-ratio">1.0000</span>
        </div>
        <div class="tri-readout-row tri-readout-aux">
          <span class="tri-readout-label">invariant</span>
          <span class="tri-readout-value tri-readout-muted">energy = 1</span>
        </div>
        <div class="tri-readout-row">
          <span class="tri-readout-label">max u</span>
          <span class="tri-readout-value" id="tri-readout-W-max">1.0000</span>
        </div>
      </div>
    </div>

    <!-- Laplace panel -->
    <div class="tri-panel tri-panel-laplace">
      <div class="tri-canvas-wrap" id="tri-wrap-L">
        <canvas id="tri-canvas-L"></canvas>
      </div>
      <div class="tri-readouts">
        <div class="tri-readout-row">
          <span class="tri-readout-label">max u</span>
          <span class="tri-readout-value" id="tri-readout-L-max">1.0000</span>
        </div>
        <div class="tri-readout-row">
          <span class="tri-readout-label">min u</span>
          <span class="tri-readout-value" id="tri-readout-L-min">0.0000</span>
        </div>
        <div class="tri-readout-row tri-readout-aux">
          <span class="tri-readout-label">bound</span>
          <span class="tri-readout-value tri-readout-muted">[0, 1]</span>
        </div>
      </div>
    </div>

  </div>

  <!-- Legend (applies to all three panels) -->
  <div class="tri-legend">
    <span class="tri-legend-item">
      <span class="tri-legend-swatch tri-legend-solid"></span>
      current solution u(·,&thinsp;t)
    </span>
    <span class="tri-legend-item">
      <span class="tri-legend-swatch tri-legend-dashed"></span>
      initial profile f(x)
    </span>
    <span class="tri-legend-item">
      <span class="tri-legend-swatch tri-legend-gvel"></span>
      initial velocity g(x) (wave only)
    </span>
    <span class="tri-legend-item">
      <span class="tri-legend-swatch tri-legend-bound"></span>
      pointwise bound (heat &amp; Laplace only)
    </span>
  </div>

  <!-- Controls -->
  <div class="tri-controls">

    <div class="tri-control-block">
      <div class="tri-control-label">Initial profile</div>
      <div class="tri-segmented" role="tablist">
        <button class="tri-seg-btn tri-seg-active" data-profile="gaussian" type="button">Gaussian</button>
        <button class="tri-seg-btn"                data-profile="triangle" type="button">Triangle</button>
        <button class="tri-seg-btn"                data-profile="bimodal"  type="button">Bimodal</button>
      </div>
    </div>

    <div class="tri-control-block tri-control-tau">
      <div class="tri-control-label">
        Time / depth parameter
        <span class="tri-control-readout" id="tri-tau-readout">τ = 0.00</span>
      </div>
      <input type="range" class="tri-slider tri-slider-tau"
             id="tri-slider-tau" min="0" max="1" step="0.005" value="0">
      <div class="tri-control-hint">
        Heat: t = τ · 5.0 &nbsp;·&nbsp; Wave: t = τ · 1.5 &nbsp;·&nbsp; Laplace: y = τ · 0.8
      </div>
    </div>

    <div class="tri-control-block">
      <div class="tri-control-label">
        Heat diffusivity k
        <span class="tri-control-readout" id="tri-k-readout">0.010</span>
      </div>
      <input type="range" class="tri-slider"
             id="tri-slider-k" min="0.001" max="0.05" step="0.001" value="0.01">
    </div>

    <div class="tri-control-block">
      <div class="tri-control-label">
        Wave speed c
        <span class="tri-control-readout" id="tri-c-readout">0.30</span>
      </div>
      <input type="range" class="tri-slider"
             id="tri-slider-c" min="0.1" max="0.6" step="0.01" value="0.30">
    </div>

    <div class="tri-control-block tri-control-g">
      <div class="tri-control-label">Wave initial velocity g</div>
      <div class="tri-segmented tri-segmented-g" role="tablist">
        <button class="tri-seg-btn tri-seg-active" data-g-profile="at_rest" type="button">at rest</button>
        <button class="tri-seg-btn"                data-g-profile="outward_kick" type="button">outward</button>
        <button class="tri-seg-btn"                data-g-profile="uniform_push" type="button">uniform</button>
      </div>
    </div>

    <div class="tri-control-block tri-control-actions">
      <button class="tri-action-btn tri-action-primary" id="tri-btn-play" type="button">
        <span id="tri-play-icon">▶</span>
        <span id="tri-play-label">Play</span>
      </button>
      <button class="tri-action-btn" id="tri-btn-reset" type="button">↺ Reset</button>
    </div>

  </div>

</div>
`;
}


// ------------------------------------------------------------
// CSS — light & dark themes, mobile responsive
// ------------------------------------------------------------

const TRICHOTOMY_CSS = `
/* ===== Light-theme defaults (CSS custom properties on the container) ===== */
.trichotomy-container {
    --tri-bg:           #fbfcfe;
    --tri-bg-panel:     #ffffff;
    --tri-bg-canvas:    #fbfcfe;
    --tri-bg-frame:     #eef0f3;
    --tri-fg:           #1f2330;
    --tri-fg-muted:     #5a6172;
    --tri-fg-subtle:    #8a91a3;
    --tri-border:       #d6dae3;
    --tri-border-hover: #b8becb;

    --tri-accent-heat:    #1565c0;
    --tri-accent-heat-bg: rgba(21, 101, 192, 0.08);
    --tri-accent-wave:    #2e7d32;
    --tri-accent-wave-bg: rgba(46, 125, 50, 0.08);
    --tri-accent-laplace: #ef6c00;
    --tri-accent-laplace-bg: rgba(239, 108, 0, 0.08);
    --tri-accent-g:       #00838f;   /* teal: initial velocity g on wave panel */

    --tri-readout-ok:     #2e7d32;
    --tri-readout-warn:   #ef6c00;
    --tri-readout-bad:    #c62828;

    --tri-shadow:        0 1px 3px rgba(0, 0, 0, 0.04);
    --tri-shadow-active: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* ===== Dark theme overrides ===== */
html[data-theme="dark"] .trichotomy-container {
    --tri-bg:           #1a1d24;
    --tri-bg-panel:     #252932;
    --tri-bg-canvas:    #1a1d24;
    --tri-bg-frame:     #2a2e38;
    --tri-fg:           #e6e8f0;
    --tri-fg-muted:     #969baa;
    --tri-fg-subtle:    #6d7384;
    --tri-border:       #3a3f4b;
    --tri-border-hover: #4d5360;

    --tri-accent-heat:    #4a9eff;
    --tri-accent-heat-bg: rgba(74, 158, 255, 0.12);
    --tri-accent-wave:    #5eda8e;
    --tri-accent-wave-bg: rgba(94, 218, 142, 0.12);
    --tri-accent-laplace: #ffb84a;
    --tri-accent-laplace-bg: rgba(255, 184, 74, 0.12);
    --tri-accent-g:       #4dd0e1;   /* teal for dark theme */

    --tri-readout-ok:     #5eda8e;
    --tri-readout-warn:   #ffb84a;
    --tri-readout-bad:    #ff5252;

    --tri-shadow:        0 1px 3px rgba(0, 0, 0, 0.3);
    --tri-shadow-active: 0 2px 6px rgba(0, 0, 0, 0.5);
}

/* ===== Container ===== */
.trichotomy-container {
    width: 100%;
    max-width: 980px;
    margin: 1.5em auto;
    padding: 18px;
    background: var(--tri-bg);
    color: var(--tri-fg);
    border: 1px solid var(--tri-border);
    border-radius: 8px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
                 Roboto, "Helvetica Neue", Arial, sans-serif;
    box-shadow: var(--tri-shadow);
    box-sizing: border-box;
}
.trichotomy-container *,
.trichotomy-container *::before,
.trichotomy-container *::after { box-sizing: border-box; }

/* ===== Title row ===== */
.tri-title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--tri-border);
}
.tri-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--tri-fg);
    letter-spacing: 0.01em;
}
.tri-subtitle {
    font-size: 0.78rem;
    color: var(--tri-fg-muted);
    font-style: italic;
}

/* ===== Panel row (3-column flex) ===== */
.tri-panel-row {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
    align-items: stretch;
}
.tri-panel {
    flex: 1 1 0;
    min-width: 0;     /* allow flex shrink below content min-width */
    display: flex;
    flex-direction: column;
    background: var(--tri-bg-panel);
    border: 1px solid var(--tri-border);
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.15s ease;
}
.tri-panel-heat    { border-top: 3px solid var(--tri-accent-heat);    }
.tri-panel-wave    { border-top: 3px solid var(--tri-accent-wave);    }
.tri-panel-laplace { border-top: 3px solid var(--tri-accent-laplace); }

/* ===== Canvas wrapper ===== */
.tri-canvas-wrap {
    width: 100%;
    background: var(--tri-bg-canvas);
    position: relative;
    aspect-ratio: 7 / 6;   /* match Module 4's 280×240 logical canvas */
}
.tri-canvas-wrap canvas {
    display: block;
    width: 100% !important;
    height: 100% !important;
}

/* ===== Readouts panel below canvas ===== */
.tri-readouts {
    padding: 8px 10px;
    background: var(--tri-bg-frame);
    border-top: 1px solid var(--tri-border);
    font-family: ui-monospace, "JetBrains Mono", "SF Mono", "Menlo",
                 "Consolas", monospace;
}
.tri-readout-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 2px 0;
    font-size: 0.74rem;
}
.tri-readout-label {
    color: var(--tri-fg-muted);
    font-weight: 500;
}
.tri-readout-value {
    color: var(--tri-fg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}
.tri-readout-muted .tri-readout-value,
.tri-readout-value.tri-readout-muted,
.tri-readout-aux .tri-readout-value {
    color: var(--tri-fg-subtle);
    font-weight: 500;
}
/* Value-status colorings: applied dynamically by the wiring layer */
.tri-readout-value.tri-status-ok    { color: var(--tri-readout-ok);   }
.tri-readout-value.tri-status-warn  { color: var(--tri-readout-warn); }
.tri-readout-value.tri-status-bad   { color: var(--tri-readout-bad);  }

/* ===== Legend ===== */
.tri-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    padding: 8px 14px;
    margin-bottom: 12px;
    background: var(--tri-bg-frame);
    border: 1px solid var(--tri-border);
    border-radius: 6px;
    font-size: 0.72rem;
    color: var(--tri-fg-muted);
    align-items: center;
}
.tri-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
}
.tri-legend-swatch {
    display: inline-block;
    width: 22px;
    height: 0;
    border-top-width: 2px;
    border-top-style: solid;
    flex-shrink: 0;
}
.tri-legend-solid {
    /* Use the wave accent as the neutral "all-panels" representative color.
       In practice each panel uses its own color (blue/green/amber); the swatch
       conveys the dash pattern, not the panel identity. */
    border-top-color: var(--tri-fg);
}
.tri-legend-dashed {
    border-top-style: dashed;
    border-top-color: var(--tri-fg-muted);
    border-top-width: 1.5px;
}
.tri-legend-bound {
    border-top-style: dashed;
    border-top-color: var(--tri-fg);
    border-top-width: 1px;
    opacity: 0.7;
}
.tri-legend-gvel {
    /* dotted teal — initial velocity g(x) on the wave panel */
    border-top-style: dotted;
    border-top-color: var(--tri-accent-g);
    border-top-width: 1.5px;
}

/* ===== Controls — 4 columns × 2 rows ===== */
/*
 * Row 1: [profile (1.2fr)] [τ (2fr)] [k (1fr)] [c (1fr)]
 * Row 2: [wave g (spans cols 1–3)] [Play/Reset (col 4)]
 * This separates Wave-specific controls (g) from the shared τ/k/c row,
 * and prevents horizontal cramming.
 */
.tri-controls {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 12px 14px;
    align-items: end;
    padding: 12px;
    background: var(--tri-bg-frame);
    border: 1px solid var(--tri-border);
    border-radius: 6px;
}
/* Row-2 placements */
.tri-control-g {
    grid-column: 1 / 4;
    grid-row: 2;
}
.tri-control-actions {
    grid-column: 4 / 5;
    grid-row: 2;
}
.tri-control-block {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
}
.tri-control-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.72rem;
    color: var(--tri-fg-muted);
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
}
.tri-control-readout {
    font-family: ui-monospace, "JetBrains Mono", monospace;
    color: var(--tri-fg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.72rem;
}
.tri-control-hint {
    font-size: 0.66rem;
    color: var(--tri-fg-subtle);
    font-family: ui-monospace, "JetBrains Mono", monospace;
    margin-top: 2px;
}

/* ===== Segmented buttons (profile selector) ===== */
.tri-segmented {
    display: flex;
    border: 1px solid var(--tri-border);
    border-radius: 4px;
    overflow: hidden;
    background: var(--tri-bg-panel);
}
.tri-seg-btn {
    flex: 1 1 0;
    padding: 7px 4px;
    background: transparent;
    border: none;
    border-right: 1px solid var(--tri-border);
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--tri-fg-muted);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    text-align: center;
}
.tri-seg-btn:last-child { border-right: none; }
.tri-seg-btn:hover { color: var(--tri-fg); background: var(--tri-bg-frame); }
.tri-seg-btn.tri-seg-active {
    background: var(--tri-fg);
    color: var(--tri-bg-panel);
    font-weight: 600;
}
/* g-profile segmented uses teal accent when active to signal
   this is the Wave-specific initial-velocity control */
.tri-segmented-g .tri-seg-btn.tri-seg-active {
    background: var(--tri-accent-g);
    color: var(--tri-bg-panel);
}

/* ===== Sliders ===== */
.tri-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: var(--tri-border);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    transition: background 0.15s ease;
}
.tri-slider:hover { background: var(--tri-border-hover); }
.tri-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: var(--tri-fg);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.12s ease;
}
.tri-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.tri-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: var(--tri-fg);
    border-radius: 50%;
    cursor: pointer;
    border: none;
}
.tri-slider-tau::-webkit-slider-thumb { background: var(--tri-accent-wave); }
.tri-slider-tau::-moz-range-thumb     { background: var(--tri-accent-wave); }

/* ===== Action buttons (Play / Reset) ===== */
.tri-control-actions {
    display: flex;
    flex-direction: row;
    gap: 6px;
    align-items: stretch;
}
.tri-action-btn {
    flex: 1 1 0;
    padding: 8px 10px;
    background: var(--tri-bg-panel);
    border: 1px solid var(--tri-border);
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--tri-fg);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
}
.tri-action-btn:hover {
    background: var(--tri-bg-frame);
    border-color: var(--tri-border-hover);
}
.tri-action-btn.tri-action-primary {
    background: var(--tri-fg);
    color: var(--tri-bg-panel);
    border-color: var(--tri-fg);
}
.tri-action-btn.tri-action-primary:hover {
    background: var(--tri-fg-muted);
    border-color: var(--tri-fg-muted);
}

/* ===== Mobile breakpoint ===== */
@media (max-width: 900px) {
    .tri-panel-row {
        flex-direction: column;
    }
    .tri-controls {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto;   /* let rows auto-flow */
    }
    /* Reset the desktop-only row pinning so items flow naturally on mobile */
    .tri-control-g,
    .tri-control-actions {
        grid-column: 1 / -1;
        grid-row: auto;
    }
    .tri-control-tau {
        grid-column: 1 / -1;
    }
}
@media (max-width: 480px) {
    .tri-controls {
        grid-template-columns: 1fr;
    }
    .tri-control-tau,
    .tri-control-g,
    .tri-control-actions {
        grid-column: auto;
    }
    .trichotomy-container { padding: 12px; }
}
`;


// ------------------------------------------------------------
// CSS injection (idempotent)
// ------------------------------------------------------------

/**
 * Inject the demo's stylesheet into the document head, once.
 * Safe to call multiple times: subsequent calls are no-ops.
 */
function injectTrichotomyCSS() {
    const STYLE_ID = 'trichotomy-demo-style';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = TRICHOTOMY_CSS;
    document.head.appendChild(style);
}


// ------------------------------------------------------------
// DOM reference collection
// ------------------------------------------------------------

/**
 * Query the just-injected DOM and return a bundle of element references
 * for the wiring layer to attach event listeners to.
 *
 * @param {HTMLElement} container  the host element (#trichotomy_demo_visualizer)
 * @returns {object}  reference bundle keyed by short names
 */
function collectTrichotomyDOMRefs(container) {
    const q = (sel) => container.querySelector(sel);
    return {
        // Canvases and their wrappers
        canvasH: q('#tri-canvas-H'),
        canvasW: q('#tri-canvas-W'),
        canvasL: q('#tri-canvas-L'),
        wrapH:   q('#tri-wrap-H'),
        wrapW:   q('#tri-wrap-W'),
        wrapL:   q('#tri-wrap-L'),

        // Readouts
        readoutHmax:   q('#tri-readout-H-max'),
        readoutHmin:   q('#tri-readout-H-min'),
        readoutWratio: q('#tri-readout-W-ratio'),
        readoutWmax:   q('#tri-readout-W-max'),
        readoutLmax:   q('#tri-readout-L-max'),
        readoutLmin:   q('#tri-readout-L-min'),

        // Controls
        profileButtons:  container.querySelectorAll('button[data-profile]'),
        gProfileButtons: container.querySelectorAll('button[data-g-profile]'),
        sliderTau:      q('#tri-slider-tau'),
        sliderK:        q('#tri-slider-k'),
        sliderC:        q('#tri-slider-c'),
        readoutTau:     q('#tri-tau-readout'),
        readoutK:       q('#tri-k-readout'),
        readoutC:       q('#tri-c-readout'),
        btnPlay:        q('#tri-btn-play'),
        btnReset:       q('#tri-btn-reset'),
        playIcon:       q('#tri-play-icon'),
        playLabel:      q('#tri-play-label'),
    };
}


// ============================================================
// ====== MODULE 6: Wiring + animation loop ===================
// ============================================================
// Entry point. Owns the single mutable state object, binds all DOM
// event handlers, runs the animation loop, and handles resize and
// theme-switch events.
//
// All Module 1–5 functions are referenced by name within this IIFE
// scope. The container existence check is the first action; if absent,
// the demo silently no-ops (the page is allowed to omit the demo div).


// ------------------------------------------------------------
// Time-axis maxima (spec §1)
// ------------------------------------------------------------

const T_H_MAX = 5.0;       // heat time at τ = 1
const T_W_MAX = 1.5;       // wave time at τ = 1
const Y_L_MAX = 0.8;       // laplace depth at τ = 1
const PLAY_PERIOD_SEC = 6.0;   // full τ sweep duration (spec §2.4)


// ------------------------------------------------------------
// State factory
// ------------------------------------------------------------

/**
 * Build the initial state object. Per-frame buffers are allocated once
 * and reused throughout the demo's lifetime to avoid GC pressure inside
 * the animation loop.
 *
 * @returns {object} fresh state object (profile not yet set)
 */
function createInitialState() {
    return {
        // User selections
        profile: 'gaussian',
        gProfile: 'at_rest',
        tau: 0.0,
        playing: false,
        k: 0.01,
        c: 0.30,

        // Initial-data and its derivatives (set on profile change)
        f:      new Float64Array(N),
        fPrime: new Float64Array(N),
        fHat:   { re: new Float64Array(N), im: new Float64Array(N) },
        E0:     0.0,

        // Wave initial velocity g and its cumulative integral
        // (set on g-profile change; G has length N+1)
        g:      new Float64Array(N),
        gCumul: new Float64Array(N + 1),

        // Per-panel solutions (overwritten each frame)
        uH:   new Float64Array(N),
        uHIm: new Float64Array(N),   // sticky imag-output buffer for heat IFFT
        uW:   new Float64Array(N),
        uL:   new Float64Array(N),

        // Frame diagnostics (set by updateFrameDiagnostics)
        maxUH: 1.0, minUH: 0.0,
        maxUL: 1.0, minUL: 0.0,
        maxUW: 1.0, minUW: 0.0,   // new: for wave bound-tracking (g ≠ 0 may break it)
        Et:    0.0,
    };
}


// ------------------------------------------------------------
// State updates triggered by user controls
// ------------------------------------------------------------

/**
 * Switch initial profile. Recomputes f, fPrime, fHat (forward FFT), E0,
 * then triggers a full panel recomputation. Does NOT touch g.
 */
function applyProfileChange(state, name) {
    state.profile = name;
    const f = buildProfile(name);
    state.f.set(f);
    const fp = centralDiff(state.f);
    state.fPrime.set(fp);
    // Forward FFT into the cached buffers
    state.fHat.re.set(state.f);
    state.fHat.im.fill(0.0);
    fft(state.fHat.re, state.fHat.im);
    // Initial energy at t = 0 for the current c and g
    state.E0 = waveEnergy(state.fPrime, state.g, 0.0, state.c);
    computeAllPanels(state);
}

/**
 * Switch the wave's initial-velocity profile g. Recomputes g, its
 * cumulative integral gCumul, the initial energy E0, then recomputes
 * the wave panel (heat and Laplace are unaffected by g).
 */
function applyGProfileChange(state, name) {
    state.gProfile = name;
    const g = buildGProfile(name);
    state.g.set(g);
    state.gCumul.set(cumulativeIntegrate(state.g));
    state.E0 = waveEnergy(state.fPrime, state.g, 0.0, state.c);
    computeWavePanel(state);
}

/**
 * Update heat diffusivity k. Triggers heat-only recomputation.
 */
function applyKChange(state, kNew) {
    state.k = kNew;
    computeHeatPanel(state);
}

/**
 * Update wave speed c. Recomputes E0 (since c enters the potential
 * energy term) and the wave panel.
 */
function applyCChange(state, cNew) {
    state.c = cNew;
    state.E0 = waveEnergy(state.fPrime, state.g, 0.0, state.c);
    computeWavePanel(state);
}

/**
 * Update the shared τ parameter. Recomputes all three panels.
 */
function applyTauChange(state, tauNew) {
    state.tau = Math.max(0.0, Math.min(1.0, tauNew));
    computeAllPanels(state);
}


// ------------------------------------------------------------
// Per-panel computation
// ------------------------------------------------------------

function computeHeatPanel(state) {
    const tH = state.tau * T_H_MAX;
    evolveHeat(state.fHat.re, state.fHat.im, tH, state.k, state.uH, state.uHIm);
}

function computeWavePanel(state) {
    const tW = state.tau * T_W_MAX;
    evolveWave(state.f, state.gCumul, tW, state.c, state.uW);
    state.Et = waveEnergy(state.fPrime, state.g, tW, state.c);
}

function computeLaplacePanel(state) {
    const yL = state.tau * Y_L_MAX;
    evolveLaplace(state.f, yL, state.uL);
}

function computeAllPanels(state) {
    computeHeatPanel(state);
    computeWavePanel(state);
    computeLaplacePanel(state);
    updateFrameDiagnostics(state);
}


// ------------------------------------------------------------
// Rendering: full frame
// ------------------------------------------------------------

/**
 * Render all three panels and update all readouts to reflect the current
 * state. Pulled out as a separate function because both the animation
 * loop and the resize/theme handlers need to call it.
 *
 * @param {object} state     shared state
 * @param {object} canvases  { H: {ctx,W,H}, W: {...}, L: {...} }
 * @param {object} refs      DOM refs from collectTrichotomyDOMRefs
 */
function renderFullFrame(state, canvases, refs) {
    const pal = getPalette();
    renderHeatPanel(canvases.H.ctx, state, canvases.H.W, canvases.H.H, pal);
    renderWavePanel(canvases.W.ctx, state, canvases.W.W, canvases.W.H, pal);
    renderLaplacePanel(canvases.L.ctx, state, canvases.L.W, canvases.L.H, pal);
    updateReadouts(state, refs);
}

/**
 * Update the textual readouts and apply status classes (green/amber/red).
 *
 * Per spec §2.6:
 *   - Heat and Laplace: max/min are status-colored by bound satisfaction
 *   - Wave: E(t)/E(0) is banded green/amber/red by deviation from 1
 */
function updateReadouts(state, refs) {
    // Helper: set text and swap status class
    function setStatus(el, text, statusClass) {
        el.textContent = text;
        el.classList.remove('tri-status-ok', 'tri-status-warn', 'tri-status-bad');
        if (statusClass) el.classList.add(statusClass);
    }

    // Heat max/min — green if bound satisfied, red if violated
    const hMax = formatBoundReadout(state.maxUH, 1.0, 'upper');
    const hMin = formatBoundReadout(state.minUH, 0.0, 'lower');
    setStatus(refs.readoutHmax, hMax.text, hMax.violated ? 'tri-status-bad' : 'tri-status-ok');
    setStatus(refs.readoutHmin, hMin.text, hMin.violated ? 'tri-status-bad' : 'tri-status-ok');

    // Wave energy — banded
    const wE = formatEnergyReadout(state.Et, state.E0);
    let statusW = 'tri-status-ok';
    if (wE.band === 'amber') statusW = 'tri-status-warn';
    else if (wE.band === 'red') statusW = 'tri-status-bad';
    setStatus(refs.readoutWratio, wE.text, statusW);

    // Wave max u — amber if bound broken (g ≠ 0 effect, not a bug)
    const wMax = formatWaveBoundReadout(state.maxUW);
    const statusWmax = (wMax.band === 'amber') ? 'tri-status-warn' : 'tri-status-ok';
    setStatus(refs.readoutWmax, wMax.text, statusWmax);

    // Laplace max/min — same logic as heat
    const lMax = formatBoundReadout(state.maxUL, 1.0, 'upper');
    const lMin = formatBoundReadout(state.minUL, 0.0, 'lower');
    setStatus(refs.readoutLmax, lMax.text, lMax.violated ? 'tri-status-bad' : 'tri-status-ok');
    setStatus(refs.readoutLmin, lMin.text, lMin.violated ? 'tri-status-bad' : 'tri-status-ok');

    // Slider numeric labels
    refs.readoutTau.textContent = 'τ = ' + state.tau.toFixed(2);
    refs.readoutK.textContent   = state.k.toFixed(3);
    refs.readoutC.textContent   = state.c.toFixed(2);
}


// ------------------------------------------------------------
// Play / Pause helpers
// ------------------------------------------------------------

function setPlayingUI(refs, playing) {
    if (playing) {
        refs.playIcon.textContent  = '❚❚';
        refs.playLabel.textContent = 'Pause';
    } else {
        refs.playIcon.textContent  = '▶';
        refs.playLabel.textContent = 'Play';
    }
}


// ------------------------------------------------------------
// Demo entry point
// ------------------------------------------------------------

/**
 * Initialize the demo, mounted at the element with id 'trichotomy_demo_visualizer'.
 * If that element doesn't exist on the current page, the function silently
 * returns — the demo is an opt-in feature.
 */
function initTrichotomyDemo() {
    const container = document.getElementById('trichotomy_demo_visualizer');
    if (!container) return;

    // 1. Build DOM and style
    injectTrichotomyCSS();
    container.innerHTML = buildDemoHTML();
    const refs = collectTrichotomyDOMRefs(container);

    // 2. Initialize per-panel canvases (DPR-aware)
    const canvases = {
        H: null,
        W: null,
        L: null,
    };
    function setupAllCanvases() {
        const cH = setupPanelCanvas(refs.canvasH, refs.wrapH);
        const cW = setupPanelCanvas(refs.canvasW, refs.wrapW);
        const cL = setupPanelCanvas(refs.canvasL, refs.wrapL);
        canvases.H = cH;
        canvases.W = cW;
        canvases.L = cL;
    }
    setupAllCanvases();

    // 3. Initialize state with default profiles
    //    (g profile first so applyProfileChange can compute E0 with state.g)
    const state = createInitialState();
    applyGProfileChange(state, 'at_rest');
    applyProfileChange(state, 'gaussian');

    // 4. Bind events
    bindControlEvents(state, refs, canvases);
    bindResizeHandler(state, refs, canvases, setupAllCanvases);
    bindThemeObserver(state, refs, canvases);

    // 5. Initial render
    renderFullFrame(state, canvases, refs);

    // 6. Start animation loop (only animates when state.playing = true)
    startAnimationLoop(state, refs, canvases);

    console.log('[calc35] trichotomy demo initialized');
}


// ------------------------------------------------------------
// Event binding
// ------------------------------------------------------------

/**
 * Bind all DOM control event handlers: profile buttons, sliders,
 * Play/Reset buttons.
 */
function bindControlEvents(state, refs, canvases) {
    // Profile segmented buttons (f)
    refs.profileButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-profile');
            // Update visual active state
            refs.profileButtons.forEach(b => b.classList.remove('tri-seg-active'));
            btn.classList.add('tri-seg-active');
            // Update state
            applyProfileChange(state, name);
            renderFullFrame(state, canvases, refs);
        });
    });

    // g-profile segmented buttons (wave initial velocity)
    refs.gProfileButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-g-profile');
            // Update visual active state
            refs.gProfileButtons.forEach(b => b.classList.remove('tri-seg-active'));
            btn.classList.add('tri-seg-active');
            // Update state (affects wave panel only; heat & Laplace unchanged)
            applyGProfileChange(state, name);
            renderFullFrame(state, canvases, refs);
        });
    });

    // τ slider — manual drag implicitly pauses (spec §2.5)
    refs.sliderTau.addEventListener('input', (ev) => {
        if (state.playing) {
            state.playing = false;
            setPlayingUI(refs, false);
        }
        applyTauChange(state, parseFloat(ev.target.value));
        renderFullFrame(state, canvases, refs);
    });

    // k slider — heat diffusivity, live update
    refs.sliderK.addEventListener('input', (ev) => {
        applyKChange(state, parseFloat(ev.target.value));
        renderFullFrame(state, canvases, refs);
    });

    // c slider — wave speed, live update
    refs.sliderC.addEventListener('input', (ev) => {
        applyCChange(state, parseFloat(ev.target.value));
        renderFullFrame(state, canvases, refs);
    });

    // Play / Pause toggle
    refs.btnPlay.addEventListener('click', () => {
        if (state.tau >= 1.0) {
            // If at end, treat Play as "restart from 0"
            applyTauChange(state, 0.0);
            refs.sliderTau.value = '0';
        }
        state.playing = !state.playing;
        setPlayingUI(refs, state.playing);
        renderFullFrame(state, canvases, refs);
    });

    // Reset: τ = 0, stop animation; keep profile, k, c, g profile
    refs.btnReset.addEventListener('click', () => {
        state.playing = false;
        setPlayingUI(refs, false);
        applyTauChange(state, 0.0);
        refs.sliderTau.value = '0';
        renderFullFrame(state, canvases, refs);
    });
}

/**
 * Resize handler: rebuild canvas pixel buffers, re-render.
 * Throttled with requestAnimationFrame so rapid resizes don't thrash.
 */
function bindResizeHandler(state, refs, canvases, setupAllCanvases) {
    let pending = false;
    window.addEventListener('resize', () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            setupAllCanvases();
            renderFullFrame(state, canvases, refs);
        });
    });
}

/**
 * Theme observer: when html[data-theme] attribute changes, re-render
 * (palette is read lazily from getPalette() so no state change is needed).
 */
function bindThemeObserver(state, refs, canvases) {
    const observer = new MutationObserver(() => {
        renderFullFrame(state, canvases, refs);
    });
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
}


// ------------------------------------------------------------
// Animation loop (time-based τ advance)
// ------------------------------------------------------------

/**
 * Start the requestAnimationFrame loop. The loop runs continuously but
 * only advances state when state.playing = true. When idle (paused or
 * at τ=1), the loop is essentially a no-op tick — a few microseconds
 * per frame, negligible.
 *
 * τ advances at rate dτ/dt = 1 / PLAY_PERIOD_SEC. Per spec §2.4, we use
 * timestamps rather than frame counts for resilience to frame drops.
 */
function startAnimationLoop(state, refs, canvases) {
    let lastTime = null;
    function tick(timestamp) {
        if (state.playing) {
            if (lastTime === null) {
                lastTime = timestamp;
            } else {
                const dt = (timestamp - lastTime) / 1000.0;   // seconds
                lastTime = timestamp;
                const newTau = state.tau + dt / PLAY_PERIOD_SEC;
                if (newTau >= 1.0) {
                    applyTauChange(state, 1.0);
                    refs.sliderTau.value = '1';
                    state.playing = false;
                    setPlayingUI(refs, false);
                    lastTime = null;
                } else {
                    applyTauChange(state, newTau);
                    refs.sliderTau.value = String(newTau);
                }
                renderFullFrame(state, canvases, refs);
            }
        } else {
            lastTime = null;
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}


// ------------------------------------------------------------
// DOM-ready bootstrap
// ------------------------------------------------------------

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTrichotomyDemo);
} else {
    initTrichotomyDemo();
}

})();   // end of IIFE