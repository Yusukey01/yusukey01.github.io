// sec5_p11_natural_gradient_visualizer.js — Natural Gradient page (v2 rebuild)
// [Core IIFE] NgvCore: DOM-free, Node-requirable pure math.
//
// Model (matches page prose exactly): the canvas IS the parameter space
//   Theta = {(theta1, theta2) in R^2},  p(x|theta) = 1/2 N(x|theta1, s^2) + 1/2 N(x|theta2, s^2)
// with shared sigma and fixed 1/2 mixing weights (x is 1-D).
// F(theta) is the TRUE Fisher information, computed by Simpson quadrature:
//   F_ij = INT (dp/dtheta_i)(dp/dtheta_j) / p dx.
// The loss is a real statistical objective L(theta) = KL(p_target || p_theta).
// Certificates: separated limit F -> (1/2s^2) I; exact rank deficiency
// F = (1/4s^2)[[1,1],[1,1]] on the diagonal; swap symmetry; quadrature
// residual (N vs 2N); gradient FD check; KL properties incl. BOTH minima
// (theta* and its swap); the page's Taylor identity KL ~ (1/2) d^T F d;
// honest-failure natural-gradient solve near the singular locus.

var NgvCore = (function () {
    'use strict';

    // ---------- seeded RNG ----------
    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    var CFG = {
        PARAM_MIN: -4,
        PARAM_MAX: 4,
        SIGMA_MIN: 0.3,
        SIGMA_MAX: 3.0,
        PAD_SIGMAS: 8,     // quadrature range padding in units of sigma
        H_FRACTION: 8,     // quadrature step h = sigma / H_FRACTION
        N_CAP: 4000,       // hard cap on quadrature nodes (guard, not a fudge)
        KAPPA_MAX: 1e8,    // beyond this, F is treated as numerically singular
        DEFAULT_TARGET: { t1: 1.5, t2: -1.0 },
        DEFAULT_SIGMA: 1.0
    };

    var SQRT_2PI = 2.5066282746310002;

    function gaussPdf(x, mu, sig) {
        var z = (x - mu) / sig;
        return Math.exp(-0.5 * z * z) / (sig * SQRT_2PI);
    }
    function mixPdf(x, t1, t2, sig) {
        return 0.5 * gaussPdf(x, t1, sig) + 0.5 * gaussPdf(x, t2, sig);
    }

    // Quadrature grid over the union of supports of the listed means.
    // Nodes sit on a lattice anchored at the origin (k*h for integer k), so
    // node POSITIONS are independent of theta: the loss becomes a smooth
    // function of theta up to fp (boundary nodes appear/vanish only where the
    // integrand is ~e^{-32}). This keeps finite differences of the loss clean.
    // Returns {lo, n, h} with n EVEN (Simpson). nMult doubles resolution for
    // the residual certificate. Throws (honest failure) if the cap is hit.
    function quadGrid(means, sig, nMult) {
        var mn = Infinity, mx = -Infinity, i;
        for (i = 0; i < means.length; i++) {
            if (means[i] < mn) mn = means[i];
            if (means[i] > mx) mx = means[i];
        }
        var h = sig / CFG.H_FRACTION / (nMult || 1);
        var kLo = Math.floor((mn - CFG.PAD_SIGMAS * sig) / h);
        var kHi = Math.ceil((mx + CFG.PAD_SIGMAS * sig) / h);
        var n = kHi - kLo;
        if (n % 2 === 1) { kHi += 1; n += 1; }
        if (n > CFG.N_CAP) throw new Error('quadrature node cap exceeded (n=' + n + ')');
        return { lo: kLo * h, n: n, h: h };
    }
    function simpsonWeight(i, n) {
        if (i === 0 || i === n) return 1;
        return (i % 2 === 1) ? 4 : 2;
    }

    // ---------- Fisher information (true, by quadrature) ----------
    // dp/dtheta_i = 1/2 * (x - theta_i)/sig^2 * N(x|theta_i, sig^2)
    function fisherAt(t1, t2, sig, nMult) {
        var g = quadGrid([t1, t2], sig, nMult);
        var invSig2 = 1 / (sig * sig);
        var F00 = 0, F01 = 0, F11 = 0;
        for (var i = 0; i <= g.n; i++) {
            var x = g.lo + i * g.h;
            var w = simpsonWeight(i, g.n);
            var g1 = gaussPdf(x, t1, sig);
            var g2 = gaussPdf(x, t2, sig);
            var p = 0.5 * g1 + 0.5 * g2;
            if (p < 1e-300) continue;
            var d1 = 0.5 * (x - t1) * invSig2 * g1;
            var d2 = 0.5 * (x - t2) * invSig2 * g2;
            var invP = 1 / p;
            F00 += w * d1 * d1 * invP;
            F01 += w * d1 * d2 * invP;
            F11 += w * d2 * d2 * invP;
        }
        var c = g.h / 3;
        return [F00 * c, F01 * c, F01 * c, F11 * c]; // symmetric, NO regularization
    }

    // ---------- KL loss and its gradient (true, by quadrature) ----------
    // L(theta) = KL(p_target || p_theta) = INT p*(x) [log p*(x) - log p_theta(x)] dx
    function klLoss(theta, target, sig, nMult) {
        var g = quadGrid([theta.t1, theta.t2, target.t1, target.t2], sig, nMult);
        var acc = 0;
        for (var i = 0; i <= g.n; i++) {
            var x = g.lo + i * g.h;
            var w = simpsonWeight(i, g.n);
            var ps = mixPdf(x, target.t1, target.t2, sig);
            if (ps < 1e-300) continue;
            var pm = mixPdf(x, theta.t1, theta.t2, sig);
            if (pm < 1e-300) pm = 1e-300;
            acc += w * ps * (Math.log(ps) - Math.log(pm));
        }
        return acc * g.h / 3;
    }
    // grad_theta L = - INT p*(x) (dp_theta/dtheta_i) / p_theta dx
    function klGrad(theta, target, sig, nMult) {
        var g = quadGrid([theta.t1, theta.t2, target.t1, target.t2], sig, nMult);
        var invSig2 = 1 / (sig * sig);
        var a1 = 0, a2 = 0;
        for (var i = 0; i <= g.n; i++) {
            var x = g.lo + i * g.h;
            var w = simpsonWeight(i, g.n);
            var ps = mixPdf(x, target.t1, target.t2, sig);
            if (ps < 1e-300) continue;
            var g1 = gaussPdf(x, theta.t1, sig);
            var g2 = gaussPdf(x, theta.t2, sig);
            var pm = 0.5 * g1 + 0.5 * g2;
            if (pm < 1e-300) continue;
            var d1 = 0.5 * (x - theta.t1) * invSig2 * g1;
            var d2 = 0.5 * (x - theta.t2) * invSig2 * g2;
            a1 += w * ps * d1 / pm;
            a2 += w * ps * d2 / pm;
        }
        var c = g.h / 3;
        return { g1: -a1 * c, g2: -a2 * c };
    }

    // ---------- symmetric 2x2 eigendecomposition ----------
    // M = [a, b, b, d]. Returns lambda1 >= lambda2 with orthonormal v1, v2.
    function symEig2(M) {
        var a = M[0], b = M[1], d = M[3];
        var half = (a + d) * 0.5;
        var diff = (a - d) * 0.5;
        var disc = Math.sqrt(diff * diff + b * b);
        var l1 = half + disc, l2 = half - disc;
        var v1, v2;
        if (Math.abs(b) > 1e-14) {
            v1 = { x: b, y: l1 - a };
            var n1 = Math.hypot(v1.x, v1.y);
            v1.x /= n1; v1.y /= n1;
            v2 = { x: -v1.y, y: v1.x };
        } else if (a >= d) {
            v1 = { x: 1, y: 0 }; v2 = { x: 0, y: 1 };
        } else {
            v1 = { x: 0, y: 1 }; v2 = { x: -1, y: 0 };
        }
        return { l1: l1, l2: l2, v1: v1, v2: v2 };
    }

    // ---------- natural gradient solve with honest failure ----------
    // Solves F d = grad. Refuses (ok:false) when F is numerically singular
    // (kappa > KAPPA_MAX or nonpositive smallest eigenvalue). No silent
    // Euclidean fallback.
    function solveNatural(F, grad) {
        var eig = symEig2(F);
        var kappa = (eig.l2 > 0) ? eig.l1 / eig.l2 : Infinity;
        if (!(eig.l2 > 0) || kappa > CFG.KAPPA_MAX) {
            return { ok: false, reason: 'singular', kappa: kappa, lmin: eig.l2 };
        }
        var det = F[0] * F[3] - F[1] * F[2];
        var d1 = (F[3] * grad.g1 - F[1] * grad.g2) / det;
        var d2 = (-F[2] * grad.g1 + F[0] * grad.g2) / det;
        return { ok: true, d1: d1, d2: d2, kappa: kappa, lmin: eig.l2 };
    }

    // ---------- metric field over the canvas grid (cacheable) ----------
    // Depends only on (sigma, density): recompute on slider change, never per frame.
    function fieldGrid(sig, density) {
        var pts = [];
        var step = (CFG.PARAM_MAX - CFG.PARAM_MIN) / density;
        for (var i = 0; i <= density; i++) {
            for (var j = 0; j <= density; j++) {
                var t1 = CFG.PARAM_MIN + i * step;
                var t2 = CFG.PARAM_MIN + j * step;
                var F = fisherAt(t1, t2, sig);
                var eig = symEig2(F);
                pts.push({ t1: t1, t2: t2, F: F, eig: eig });
            }
        }
        return { sigma: sig, density: density, step: step, points: pts };
    }

    // ---------- self-tests ----------
    function runSelfTests() {
        var failures = [];
        function check(name, cond, detail) {
            if (!cond) failures.push(name + (detail ? ' — ' + detail : ''));
        }
        try {
            var i, F, eig;

            // T1: well-separated limit F -> (1/(2 sig^2)) I  (page formula)
            [[1.0, -5, 5], [0.5, -3, 3]].forEach(function (cfg) {
                var sig = cfg[0];
                var Fs = fisherAt(cfg[1], cfg[2], sig);
                var expect = 1 / (2 * sig * sig);
                check('T1 diag entries', Math.abs(Fs[0] - expect) < 1e-4 * expect &&
                    Math.abs(Fs[3] - expect) < 1e-4 * expect,
                    'sig=' + sig + ' F00=' + Fs[0] + ' expect=' + expect);
                // note: F01 is not exactly 0 at finite separation — the true
                // overlap at ~10 sigma is O(1e-6); 2e-5 bounds it while still
                // certifying the decoupling limit.
                check('T1 off-diag', Math.abs(Fs[1]) < 2e-5, 'F01=' + Fs[1]);
            });

            // T2: exact rank deficiency on the diagonal theta1 = theta2:
            // F = (1/(4 sig^2)) [[1,1],[1,1]]; lmin = 0; null direction (1,-1)/sqrt2
            [[0.8, 1.3], [1.0, -2.0]].forEach(function (cfg) {
                var sig = cfg[0], t = cfg[1];
                var Fd = fisherAt(t, t, sig);
                var v = 1 / (4 * sig * sig);
                for (var k = 0; k < 4; k++) {
                    check('T2 entries', Math.abs(Fd[k] - v) < 1e-6 * v, 'k=' + k + ' got ' + Fd[k] + ' expect ' + v);
                }
                var e2 = symEig2(Fd);
                check('T2 lmin ~ 0', Math.abs(e2.l2) < 1e-10 * v, 'lmin=' + e2.l2);
                check('T2 lmax', Math.abs(e2.l1 - 1 / (2 * sig * sig)) < 1e-6 / (sig * sig), 'lmax=' + e2.l1);
                // null direction (v2) aligns with (1,-1)/sqrt2
                var dot = Math.abs(e2.v2.x * Math.SQRT1_2 - e2.v2.y * Math.SQRT1_2);
                check('T2 null direction', dot > 1 - 1e-8, '|dot|=' + dot);
            });

            // T3: swap symmetry F(b,a) = P F(a,b) P (swap indices)
            var Fab = fisherAt(0.7, -1.9, 1.2);
            var Fba = fisherAt(-1.9, 0.7, 1.2);
            check('T3 swap 00<->11', Math.abs(Fab[0] - Fba[3]) < 1e-12 && Math.abs(Fab[3] - Fba[0]) < 1e-12);
            check('T3 swap offdiag', Math.abs(Fab[1] - Fba[1]) < 1e-12);

            // T4: quadrature residual — N vs 2N across sigma/separation sweep
            [0.3, 1.0, 3.0].forEach(function (sig) {
                [0, 1, 3, 8].forEach(function (sep) {
                    var t1 = -sep / 2, t2 = sep / 2;
                    var A = fisherAt(t1, t2, sig, 1);
                    var B = fisherAt(t1, t2, sig, 2);
                    var scale = Math.max(Math.abs(B[0]), Math.abs(B[3]), 1e-12);
                    var dmax = 0;
                    for (var k = 0; k < 4; k++) dmax = Math.max(dmax, Math.abs(A[k] - B[k]));
                    // measured worst rel residual 6.3e-8 (sig=1, sep=8); 15x margin
                    check('T4 quad residual', dmax < 1e-6 * scale, 'sig=' + sig + ' sep=' + sep + ' dmax=' + dmax);
                });
            });

            // T4b: spec pin — quadrature nodes lie on the origin-anchored
            // lattice (lo is an integer multiple of h), independent of theta.
            // This is the property that keeps the loss FD-smooth; pin it
            // directly rather than relying on jitter exceeding a tolerance.
            [[-2.0003, 2.5, 1.0], [0.137, -3.91, 0.3]].forEach(function (cfg) {
                var gq = quadGrid([cfg[0], cfg[1]], cfg[2]);
                var k = gq.lo / gq.h;
                check('T4b anchored lattice', Math.abs(k - Math.round(k)) < 1e-9,
                    'lo/h=' + k);
            });

            // T5: gradient check — analytic klGrad vs central FD of klLoss
            var tgt = { t1: 1.5, t2: -1.0 };
            [{ t1: 0.4, t2: 0.9 }, { t1: -2.0, t2: 2.5 }].forEach(function (th) {
                var sig = 1.0, h = 1e-3; // calibrated: worst FD-vs-analytic 1.2e-6 rel
                var gA = klGrad(th, tgt, sig);
                var f1p = klLoss({ t1: th.t1 + h, t2: th.t2 }, tgt, sig);
                var f1m = klLoss({ t1: th.t1 - h, t2: th.t2 }, tgt, sig);
                var f2p = klLoss({ t1: th.t1, t2: th.t2 + h }, tgt, sig);
                var f2m = klLoss({ t1: th.t1, t2: th.t2 - h }, tgt, sig);
                var fd1 = (f1p - f1m) / (2 * h), fd2 = (f2p - f2m) / (2 * h);
                var scale = Math.max(Math.abs(fd1), Math.abs(fd2), 1e-8);
                check('T5 grad FD', Math.abs(gA.g1 - fd1) < 1e-4 * scale && Math.abs(gA.g2 - fd2) < 1e-4 * scale,
                    'analytic (' + gA.g1 + ',' + gA.g2 + ') fd (' + fd1 + ',' + fd2 + ')');
            });

            // T6: KL properties — zero at target, nonnegative, stationary at BOTH minima
            check('T6 KL(p||p)=0', Math.abs(klLoss(tgt, tgt, 1.0)) < 1e-10);
            var rng = mulberry32(42);
            for (i = 0; i < 20; i++) {
                var th6 = {
                    t1: CFG.PARAM_MIN + 8 * rng(),
                    t2: CFG.PARAM_MIN + 8 * rng()
                };
                check('T6 KL >= 0', klLoss(th6, tgt, 1.0) > -1e-10, JSON.stringify(th6));
            }
            var gAtT = klGrad(tgt, tgt, 1.0);
            check('T6 grad zero at target', Math.hypot(gAtT.g1, gAtT.g2) < 1e-8);
            var swap = { t1: tgt.t2, t2: tgt.t1 };
            check('T6 KL zero at swap', Math.abs(klLoss(swap, tgt, 1.0)) < 1e-10);
            var gAtS = klGrad(swap, tgt, 1.0);
            check('T6 grad zero at swap', Math.hypot(gAtS.g1, gAtS.g2) < 1e-8);

            // T7: the page's Taylor identity KL(p_th || p_{th+dth}) ~ (1/2) dth^T F dth
            var th7 = { t1: 0.7, t2: -0.9 }, sig7 = 1.0;
            var F7 = fisherAt(th7.t1, th7.t2, sig7);
            [{ x: 1, y: 0 }, { x: Math.SQRT1_2, y: Math.SQRT1_2 }, { x: 0.6, y: -0.8 }].forEach(function (u) {
                var prev = null;
                [0.08, 0.04, 0.02].forEach(function (eps) {
                    var d = { x: eps * u.x, y: eps * u.y };
                    var kl = klLoss({ t1: th7.t1 + d.x, t2: th7.t2 + d.y }, th7, sig7);
                    var quad = 0.5 * (F7[0] * d.x * d.x + 2 * F7[1] * d.x * d.y + F7[3] * d.y * d.y);
                    var ratio = kl / quad;
                    if (prev !== null) {
                        check('T7 ratio improves', Math.abs(ratio - 1) <= Math.abs(prev - 1) + 1e-9,
                            'u=(' + u.x + ',' + u.y + ') eps=' + eps + ' ratio=' + ratio + ' prev=' + prev);
                    }
                    if (eps === 0.02) {
                        check('T7 ratio -> 1', Math.abs(ratio - 1) < 0.05,
                            'u=(' + u.x + ',' + u.y + ') ratio=' + ratio);
                    }
                    prev = ratio;
                });
            });

            // T8: natural-gradient solve — correctness and honest failure
            var thW = { t1: 2.0, t2: -1.5 };
            var FW = fisherAt(thW.t1, thW.t2, 1.0);
            var gW = klGrad(thW, tgt, 1.0);
            var sol = solveNatural(FW, gW);
            check('T8 well-conditioned ok', sol.ok === true, 'kappa=' + sol.kappa);
            if (sol.ok) {
                var r1 = FW[0] * sol.d1 + FW[1] * sol.d2 - gW.g1;
                var r2 = FW[2] * sol.d1 + FW[3] * sol.d2 - gW.g2;
                check('T8 F d = grad', Math.hypot(r1, r2) < 1e-10 * Math.max(1, Math.hypot(gW.g1, gW.g2)),
                    'resid=' + Math.hypot(r1, r2));
            }
            // identity-F negative control on the solver itself
            var solI = solveNatural([1, 0, 0, 1], { g1: 0.3, g2: -0.7 });
            check('T8 identity F', solI.ok && Math.abs(solI.d1 - 0.3) < 1e-14 && Math.abs(solI.d2 + 0.7) < 1e-14);
            // singular locus: refusal, not fallback
            var FD8 = fisherAt(0.5, 0.5, 1.0);
            var solS = solveNatural(FD8, { g1: 0.1, g2: 0.2 });
            check('T8 singular refusal', solS.ok === false && solS.reason === 'singular', 'kappa=' + solS.kappa);
            // near-diagonal negative control: l2 is POSITIVE here, so this must
            // refuse via the kappa > KAPPA_MAX branch specifically
            var FN8 = fisherAt(0.5, 0.5001, 1.0);
            var eN8 = symEig2(FN8);
            var solN = solveNatural(FN8, { g1: 0.1, g2: 0.2 });
            check('T8 kappa-branch refusal', eN8.l2 > 0 && solN.ok === false && isFinite(solN.kappa) && solN.kappa > CFG.KAPPA_MAX,
                'l2=' + eN8.l2 + ' kappa=' + solN.kappa);

            // T9: field grid consistency + eigen reconstruction
            var grid = fieldGrid(1.0, 6);
            check('T9 grid size', grid.points.length === 49);
            var probe = grid.points[17];
            var Fdirect = fisherAt(probe.t1, probe.t2, 1.0);
            var dg = 0;
            for (i = 0; i < 4; i++) dg = Math.max(dg, Math.abs(probe.F[i] - Fdirect[i]));
            check('T9 grid == direct', dg < 1e-14, 'dmax=' + dg);
            // symmetry pin: F[1] and F[2] must be the SAME stored value, or an
            // asymmetric-return mutant stays self-consistent through the solver
            check('T9 F symmetric storage', probe.F[1] === probe.F[2]);
            // reconstruction Q Lambda Q^T = F, orthonormal eigenvectors
            grid.points.slice(0, 12).forEach(function (pt) {
                var e = pt.eig;
                var R00 = e.l1 * e.v1.x * e.v1.x + e.l2 * e.v2.x * e.v2.x;
                var R01 = e.l1 * e.v1.x * e.v1.y + e.l2 * e.v2.x * e.v2.y;
                var R11 = e.l1 * e.v1.y * e.v1.y + e.l2 * e.v2.y * e.v2.y;
                var scale = Math.max(Math.abs(pt.F[0]), Math.abs(pt.F[3]), 1e-12);
                check('T9 eigen reconstruct', Math.abs(R00 - pt.F[0]) < 1e-10 * scale &&
                    Math.abs(R01 - pt.F[1]) < 1e-10 * scale &&
                    Math.abs(R11 - pt.F[3]) < 1e-10 * scale);
                check('T9 orthonormal', Math.abs(e.v1.x * e.v2.x + e.v1.y * e.v2.y) < 1e-12 &&
                    Math.abs(Math.hypot(e.v1.x, e.v1.y) - 1) < 1e-12);
                check('T9 order', e.l1 >= e.l2);
            });

            // T10: pinned analytic constant — diagonal entries at sig=1 are exactly 1/4
            var Fpin = fisherAt(-0.6, -0.6, 1.0);
            check('T10 pin 1/(4 sig^2)', Math.abs(Fpin[0] - 0.25) < 1e-7, 'got ' + Fpin[0]);
        } catch (e) {
            failures.push('EXCEPTION: ' + (e && e.message ? e.message : String(e)));
        }
        return failures;
    }

    return {
        CFG: CFG,
        mulberry32: mulberry32,
        gaussPdf: gaussPdf, mixPdf: mixPdf,
        fisherAt: fisherAt, klLoss: klLoss, klGrad: klGrad,
        symEig2: symEig2, solveNatural: solveNatural, fieldGrid: fieldGrid,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = NgvCore; }

/* =========================================================================
 * [UI IIFE] Fisher information manifold visualizer.
 * Refuses to render if NgvCore.runSelfTests() reports failures.
 * The canvas IS the parameter space Theta = {(theta1, theta2)}: the ellipse
 * field, the F(theta) panel, both gradient arrows, and the flow particles
 * are all computed by NgvCore — nothing is scripted. Near the singular
 * locus theta1 = theta2 the natural gradient is REFUSED, not regularized.
 * ========================================================================= */
(function () {
    'use strict';

    function init() {
        var container = document.getElementById('natural-gradient-visualizer');
        if (!container) return;
        if (container.dataset.ngvInit) return;   /* idempotency guard */
        container.dataset.ngvInit = '1';

        var failures = NgvCore.runSelfTests();
        if (failures.length) {
            container.innerHTML =
                '<div style="background:rgba(40,20,24,0.95);border:1px solid #ff6b5e;' +
                'border-radius:8px;padding:20px;color:#ffb3ab;font-family:monospace;font-size:0.85rem;">' +
                '<strong>Demo disabled: mathematical self-tests failed.</strong><br>' +
                '<pre style="white-space:pre-wrap;">' +
                failures.map(function (f) {
                    return f.replace(/&/g, '&amp;').replace(/</g, '&lt;');
                }).join('\n') + '</pre></div>';
            return;
        }

        var CFG = NgvCore.CFG;
        var RANGE = CFG.PARAM_MAX - CFG.PARAM_MIN;
        var C = {
            island: 'rgba(20,28,40,0.95)',
            canvasBg: '#0b0e14',
            panelBorder: 'rgba(255,255,255,0.10)',
            text: '#e8eaed',
            muted: 'rgba(255,255,255,0.55)',
            cyan: '#00e5ff',
            cyanDim: 'rgba(0,229,255,0.35)',
            red: '#ff4646',
            amber: '#ffa726',
            warm: { r: 255, g: 120, b: 200 }
        };
        var MAX_PARTICLES = 80;
        var PARTICLE_LIFE = 240;
        var PARTICLE_STEP = 0.02;

        /* ---------------- state ---------------- */
        var state = {
            sigma: CFG.DEFAULT_SIGMA,
            density: 14,
            ellipseScale: 1.0,
            target: { t1: CFG.DEFAULT_TARGET.t1, t2: CFG.DEFAULT_TARGET.t2 },
            probe: null,          /* {t1,t2} or null */
            probeData: null,      /* computed grad/F/solve at probe */
            field: null,          /* cached NgvCore.fieldGrid */
            flowActive: false,
            particles: [],
            rng: NgvCore.mulberry32(2026),
            dragging: false,
            dirtyField: true,
            dirtyPanel: true,
            frame: 0
        };

        /* ---------------- markup (v1 skeleton, one handle) ---------------- */
        container.innerHTML =
            '<div class="ngv-container">' +
            '<div class="ngv-layout">' +
            '<div class="ngv-canvas-area">' +
            '<div class="ngv-instruction">Drag the glowing handle to move the target model ' +
            '\u03B8* = (\u03BC\u2081*, \u03BC\u2082*). Click anywhere to probe the metric and compare gradients. ' +
            'The dashed diagonal is the singular locus \u03BC\u2081 = \u03BC\u2082.</div>' +
            '<div id="ngv-canvas-wrapper" style="position:relative;width:100%;max-width:700px;">' +
            '<canvas id="ngv-canvas"></canvas>' +
            '</div>' +
            '<div class="ngv-legend">' +
            '<div class="ngv-legend-item"><span class="ngv-sw ngv-sw-ell"></span> Fisher ellipse (to scale)</div>' +
            '<div class="ngv-legend-item"><span class="ngv-sw ngv-sw-ell-d"></span> clipped: axis exceeds cell (\u03BB\u2098\u1D62\u2099 \u2192 0)</div>' +
            '<div class="ngv-legend-item"><span class="ngv-sw ngv-sw-naive"></span> \u2212\u2207L (Euclidean)</div>' +
            '<div class="ngv-legend-item"><span class="ngv-sw ngv-sw-nat"></span> \u2212F\u207B\u00B9\u2207L (natural)</div>' +
            '<div class="ngv-legend-item"><span class="ngv-sw ngv-sw-tgt"></span> target \u03B8*</div>' +
            '<div class="ngv-legend-item"><span class="ngv-sw ngv-sw-swap"></span> swap minimum (\u03BC\u2082*, \u03BC\u2081*)</div>' +
            '<div class="ngv-legend-item"><span class="ngv-sw ngv-sw-flow"></span> flow particles (follow \u2212F\u207B\u00B9\u2207L)</div>' +
            '</div></div>' +
            '<div class="ngv-controls-panel">' +
            '<div class="ngv-card"><div class="ngv-card-title">Fisher Information Metric</div>' +
            '<div class="ngv-card-sub" id="ngv-fim-where">F(\u03B8) at target</div>' +
            '<div class="ngv-matrix"><span class="ngv-br">[</span><span class="ngv-mv">' +
            '<span class="ngv-mr"><span id="ngv-f00">\u2014</span><span id="ngv-f01">\u2014</span></span>' +
            '<span class="ngv-mr"><span id="ngv-f10">\u2014</span><span id="ngv-f11">\u2014</span></span>' +
            '</span><span class="ngv-br">]</span></div>' +
            '<div class="ngv-props"><span id="ngv-det">det(F) = \u2014</span><span id="ngv-kappa">\u03BA(F) = \u2014</span></div></div>' +
            '<div class="ngv-card"><div class="ngv-card-title">Parameter State</div>' +
            '<div class="ngv-row"><span class="ngv-lab">target \u03B8*</span><span class="ngv-val" id="ngv-target-val"></span></div>' +
            '<div class="ngv-row"><span class="ngv-lab">|\u03BC\u2081* \u2212 \u03BC\u2082*|</span><span class="ngv-val" id="ngv-sep-val"></span></div>' +
            '<div class="ngv-row"><span class="ngv-lab">\u03C3 (shared)</span><span class="ngv-val" id="ngv-sigma-val"></span></div>' +
            '<div class="ngv-row"><span class="ngv-lab">probe \u03B8</span><span class="ngv-val" id="ngv-probe-val">\u2014</span></div></div>' +
            '<div class="ngv-card"><div class="ngv-card-title">Gradient Comparison</div>' +
            '<div class="ngv-card-sub">click the canvas to place a probe</div>' +
            '<div id="ngv-grad-body">' +
            '<div class="ngv-row"><span class="ngv-lab" style="color:' + C.red + ';">\u2207L (Euclidean)</span><span class="ngv-val" id="ngv-naive">(\u2014, \u2014)</span></div>' +
            '<div class="ngv-row"><span class="ngv-lab" style="color:' + C.cyan + ';">F\u207B\u00B9\u2207L (natural)</span><span class="ngv-val" id="ngv-natural">(\u2014, \u2014)</span></div>' +
            '<div class="ngv-row"><span class="ngv-lab">amplification \u2016F\u207B\u00B9\u2207L\u2016/\u2016\u2207L\u2016</span><span class="ngv-val" id="ngv-amp">\u2014</span></div>' +
            '<div class="ngv-row"><span class="ngv-lab">angle between</span><span class="ngv-val" id="ngv-angle">\u2014</span></div>' +
            '</div>' +
            '<div id="ngv-singular-msg" style="display:none;color:' + C.amber + ';font-size:0.82rem;line-height:1.5;margin-top:6px;">' +
            'F(\u03B8) is numerically singular here (\u03BA &gt; 10\u2078): the natural gradient is undefined and the demo ' +
            'declines to display it rather than regularizing. This is the information singularity.</div></div>' +
            '<div class="ngv-card"><div class="ngv-card-title">Controls</div>' +
            '<div class="ngv-srow"><label for="ngv-sigma-slider">\u03C3 (spread)</label>' +
            '<input type="range" id="ngv-sigma-slider" min="0.3" max="3.0" step="0.05" value="1.0">' +
            '<span id="ngv-sigma-ro">1.00</span></div>' +
            '<div class="ngv-srow"><label for="ngv-density-slider">Grid density</label>' +
            '<input type="range" id="ngv-density-slider" min="6" max="22" step="2" value="14">' +
            '<span id="ngv-density-ro">14</span></div>' +
            '<div class="ngv-srow"><label for="ngv-scale-slider">Ellipse scale</label>' +
            '<input type="range" id="ngv-scale-slider" min="0.3" max="2.0" step="0.1" value="1.0">' +
            '<span id="ngv-scale-ro">1.0</span></div>' +
            '<div class="ngv-brow">' +
            '<button class="ngv-btn" id="ngv-flow-btn">\u25C9 Flow</button>' +
            '<button class="ngv-btn" id="ngv-reset-btn">\u21BA Reset</button>' +
            '</div></div>' +
            '<div class="ngv-insight"><div class="ngv-insight-txt" id="ngv-insight"></div></div>' +
            '</div></div></div>';

        /* ---------------- styles (scoped) ---------------- */
        if (!document.getElementById('ngv-styles')) {
            var st = document.createElement('style');
            st.id = 'ngv-styles';
            st.textContent =
                '#natural-gradient-visualizer .ngv-container{color:' + C.text + ';font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin-bottom:24px;}' +
                '#natural-gradient-visualizer .ngv-layout{display:flex;flex-direction:column;gap:20px;}' +
                '@media (min-width:1080px){#natural-gradient-visualizer .ngv-layout{flex-direction:row;}#natural-gradient-visualizer .ngv-canvas-area{flex:1.3;min-width:0;}#natural-gradient-visualizer .ngv-controls-panel{flex:1;max-width:400px;}}' +
                '#natural-gradient-visualizer .ngv-canvas-area{display:flex;flex-direction:column;align-items:center;}' +
                '#natural-gradient-visualizer #ngv-canvas{width:100%;height:auto;border:1px solid rgba(0,229,255,0.12);border-radius:8px;background:' + C.canvasBg + ';cursor:crosshair;display:block;touch-action:none;}' +
                '#natural-gradient-visualizer .ngv-instruction{text-align:center;margin-bottom:10px;font-size:0.88rem;color:rgba(255,255,255,0.45);line-height:1.5;max-width:700px;}' +
                '#natural-gradient-visualizer .ngv-legend{margin-top:10px;display:flex;flex-wrap:wrap;gap:12px;font-size:0.78rem;color:rgba(255,255,255,0.5);}' +
                '#natural-gradient-visualizer .ngv-legend-item{display:flex;align-items:center;gap:6px;}' +
                '#natural-gradient-visualizer .ngv-sw{width:13px;height:13px;border-radius:3px;flex-shrink:0;}' +
                '#natural-gradient-visualizer .ngv-sw-ell{background:rgba(0,229,255,0.2);border:1px solid rgba(0,229,255,0.5);}' +
                '#natural-gradient-visualizer .ngv-sw-ell-d{background:rgba(255,120,200,0.15);border:1px dashed rgba(255,120,200,0.7);}' +
                '#natural-gradient-visualizer .ngv-sw-naive{background:rgba(255,70,70,0.7);}' +
                '#natural-gradient-visualizer .ngv-sw-nat{background:rgba(0,229,255,0.7);}' +
                '#natural-gradient-visualizer .ngv-sw-tgt{background:radial-gradient(circle,#00e5ff 40%,transparent 70%);border:1px solid rgba(0,229,255,0.6);border-radius:50%;}' +
                '#natural-gradient-visualizer .ngv-sw-swap{background:transparent;border:2px dashed rgba(0,229,255,0.6);border-radius:50%;}' +
                '#natural-gradient-visualizer .ngv-sw-flow{background:radial-gradient(circle,rgba(0,229,255,0.9) 25%,transparent 45%);}' +
                '#natural-gradient-visualizer .ngv-controls-panel{display:flex;flex-direction:column;gap:14px;}' +
                '#natural-gradient-visualizer .ngv-card,#natural-gradient-visualizer .ngv-insight{background:' + C.island + ';padding:14px 16px;border-radius:8px;border:1px solid ' + C.panelBorder + ';}' +
                '#natural-gradient-visualizer .ngv-card-title{font-size:0.9rem;font-weight:600;color:rgba(0,229,255,0.85);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;}' +
                '#natural-gradient-visualizer .ngv-card-sub{font-size:0.76rem;color:rgba(255,255,255,0.35);margin-bottom:8px;}' +
                '#natural-gradient-visualizer .ngv-matrix{display:flex;align-items:center;justify-content:center;gap:6px;margin:8px 0;}' +
                '#natural-gradient-visualizer .ngv-br{font-size:2rem;color:rgba(0,229,255,0.4);font-weight:200;line-height:1;}' +
                '#natural-gradient-visualizer .ngv-mv{display:flex;flex-direction:column;gap:4px;}' +
                '#natural-gradient-visualizer .ngv-mr{display:flex;gap:16px;}' +
                '#natural-gradient-visualizer .ngv-mr span{font-family:Consolas,"Fira Mono",monospace;font-size:0.9rem;min-width:70px;text-align:right;}' +
                '#natural-gradient-visualizer .ngv-props{display:flex;gap:16px;font-size:0.78rem;color:rgba(255,255,255,0.45);font-family:Consolas,monospace;}' +
                '#natural-gradient-visualizer .ngv-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;}' +
                '#natural-gradient-visualizer .ngv-lab{font-size:0.82rem;color:rgba(255,255,255,0.55);}' +
                '#natural-gradient-visualizer .ngv-val{font-family:Consolas,"Fira Mono",monospace;font-size:0.82rem;}' +
                '#natural-gradient-visualizer .ngv-srow{display:flex;align-items:center;gap:10px;margin-bottom:10px;}' +
                '#natural-gradient-visualizer .ngv-srow label{flex:0 0 100px;font-size:0.82rem;color:rgba(255,255,255,0.55);}' +
                '#natural-gradient-visualizer .ngv-srow input[type="range"]{flex:1;accent-color:#00e5ff;height:4px;}' +
                '#natural-gradient-visualizer .ngv-srow span{flex:0 0 38px;font-family:Consolas,monospace;font-size:0.82rem;color:rgba(0,229,255,0.8);text-align:right;}' +
                '#natural-gradient-visualizer .ngv-brow{display:flex;gap:10px;margin-top:6px;}' +
                '#natural-gradient-visualizer .ngv-btn{flex:1;padding:8px 12px;border:1px solid rgba(255,255,255,0.12);border-radius:6px;background:rgba(0,0,0,0.3);color:rgba(255,255,255,0.7);font-size:0.88rem;font-weight:600;cursor:pointer;}' +
                '#natural-gradient-visualizer .ngv-btn:hover{border-color:rgba(0,229,255,0.3);color:' + C.text + ';}' +
                '#natural-gradient-visualizer .ngv-btn.active{border-color:rgba(0,229,255,0.5);background:rgba(0,229,255,0.12);color:#00e5ff;}' +
                '#natural-gradient-visualizer .ngv-insight-txt{font-size:0.82rem;color:rgba(255,255,255,0.55);line-height:1.55;}' +
                '#natural-gradient-visualizer .ngv-insight-txt em{color:rgba(0,229,255,0.8);}';
            document.head.appendChild(st);
        }

        /* ---------------- canvas & transforms ---------------- */
        var canvas = container.querySelector('#ngv-canvas');
        var ctx = canvas.getContext('2d');
        var W = 700, H = 700, DPR = 1;

        function sizeCanvas() {
            var wrap = container.querySelector('#ngv-canvas-wrapper');
            var size = Math.min(wrap.clientWidth || 700, 700);
            if (size < 50) size = 700;
            DPR = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
            canvas.width = Math.round(size * DPR);
            canvas.height = Math.round(size * DPR);
            canvas.style.height = size + 'px';
            W = size; H = size;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        function p2c(t1, t2) {
            return { x: ((t1 - CFG.PARAM_MIN) / RANGE) * W, y: ((CFG.PARAM_MAX - t2) / RANGE) * H };
        }
        function c2p(cx, cy) {
            return { t1: CFG.PARAM_MIN + (cx / W) * RANGE, t2: CFG.PARAM_MAX - (cy / H) * RANGE };
        }

        /* ---------------- computation wrappers ---------------- */
        function ensureField() {
            if (!state.dirtyField) return;
            state.field = NgvCore.fieldGrid(state.sigma, state.density);
            state.dirtyField = false;
        }
        function computeProbe() {
            if (!state.probe) { state.probeData = null; return; }
            var F = NgvCore.fisherAt(state.probe.t1, state.probe.t2, state.sigma);
            var grad = NgvCore.klGrad(state.probe, state.target, state.sigma);
            var sol = NgvCore.solveNatural(F, grad);
            state.probeData = { F: F, eig: NgvCore.symEig2(F), grad: grad, sol: sol };
        }

        /* ---------------- info panel ---------------- */
        function fmt(v, d) { return v.toFixed(d === undefined ? 3 : d); }
        function fmtKappa(k) {
            if (!isFinite(k)) return '\u221E';
            return (k >= 1e4) ? k.toExponential(1) : k.toFixed(1);
        }
        function q(id) { return container.querySelector('#' + id); }

        function updatePanel() {
            q('ngv-target-val').textContent = '(' + fmt(state.target.t1, 2) + ', ' + fmt(state.target.t2, 2) + ')';
            q('ngv-sep-val').textContent = fmt(Math.abs(state.target.t1 - state.target.t2), 3);
            q('ngv-sigma-val').textContent = fmt(state.sigma, 2);
            q('ngv-probe-val').textContent = state.probe
                ? '(' + fmt(state.probe.t1, 2) + ', ' + fmt(state.probe.t2, 2) + ')' : '\u2014';

            var F, eig, whereLabel;
            if (state.probeData) {
                F = state.probeData.F; eig = state.probeData.eig; whereLabel = 'F(\u03B8) at probe';
            } else {
                F = NgvCore.fisherAt(state.target.t1, state.target.t2, state.sigma);
                eig = NgvCore.symEig2(F); whereLabel = 'F(\u03B8) at target';
            }
            q('ngv-fim-where').textContent = whereLabel;
            q('ngv-f00').textContent = fmt(F[0], 4);
            q('ngv-f01').textContent = fmt(F[1], 4);
            q('ngv-f10').textContent = fmt(F[2], 4);
            q('ngv-f11').textContent = fmt(F[3], 4);
            q('ngv-det').textContent = 'det(F) = ' + (F[0] * F[3] - F[1] * F[2]).toExponential(2);
            q('ngv-kappa').textContent = '\u03BA(F) = ' + fmtKappa(eig.l2 > 0 ? eig.l1 / eig.l2 : Infinity);

            var msg = q('ngv-singular-msg'), body = q('ngv-grad-body');
            if (state.probeData) {
                var g = state.probeData.grad, sol = state.probeData.sol;
                q('ngv-naive').textContent = '(' + fmt(g.g1) + ', ' + fmt(g.g2) + ')';
                if (sol.ok) {
                    q('ngv-natural').textContent = '(' + fmt(sol.d1) + ', ' + fmt(sol.d2) + ')';
                    var gn = Math.hypot(g.g1, g.g2), dn = Math.hypot(sol.d1, sol.d2);
                    q('ngv-amp').textContent = gn > 1e-12 ? (dn / gn).toFixed(2) + '\u00D7' : '\u2014';
                    var cosA = gn > 1e-12 && dn > 1e-12 ? (g.g1 * sol.d1 + g.g2 * sol.d2) / (gn * dn) : 1;
                    q('ngv-angle').textContent = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180 / Math.PI).toFixed(1) + '\u00B0';
                    msg.style.display = 'none';
                    body.style.opacity = '1';
                } else {
                    q('ngv-natural').textContent = 'undefined (F singular)';
                    q('ngv-amp').textContent = '\u2014';
                    q('ngv-angle').textContent = '\u2014';
                    msg.style.display = 'block';
                    body.style.opacity = '0.8';
                }
            } else {
                q('ngv-naive').textContent = '(\u2014, \u2014)';
                q('ngv-natural').textContent = '(\u2014, \u2014)';
                q('ngv-amp').textContent = '\u2014';
                q('ngv-angle').textContent = '\u2014';
                msg.style.display = 'none';
            }
            updateInsight();
        }

        function updateInsight() {
            var el = q('ngv-insight');
            var ref = state.probe || state.target;
            var distDiag = Math.abs(ref.t1 - ref.t2) / Math.SQRT2; /* Euclidean distance to the line t1=t2 */
            var ratio = Math.abs(ref.t1 - ref.t2) / state.sigma;
            var whereWord = state.probe ? 'The probe' : 'The target';
            if (ratio < 0.5) {
                el.innerHTML = whereWord + ' sits in the <em>information singularity</em>: |\u03BC\u2081 \u2212 \u03BC\u2082| &lt; 0.5\u03C3, ' +
                    'the two components are nearly indistinguishable, and the Fisher eigenvalue along the exchange direction ' +
                    '(1, \u22121) collapses \u2014 watch \u03BA(F) in the panel. On the dashed diagonal itself it is exactly zero.';
            } else if (ratio < 1.5) {
                el.innerHTML = whereWord + ' is in the <em>high-curvature zone</em> (0.5\u03C3 &lt; |\u03BC\u2081 \u2212 \u03BC\u2082| &lt; 1.5\u03C3): ' +
                    'the mixture components overlap strongly and the ellipses elongate along the (1, \u22121) direction \u2014 ' +
                    'a large parameter step there costs little statistical distance.';
            } else if (ratio < 3) {
                el.innerHTML = 'The components are partially separated (' + fmt(ratio, 1) + '\u03C3 apart). Anisotropy is moderate; ' +
                    'the natural and Euclidean gradients begin to align.';
            } else {
                el.innerHTML = 'The components are well separated (|\u03BC\u2081 \u2212 \u03BC\u2082| &gt; 3\u03C3): F \u2248 (1/2\u03C3\u00B2)I = ' +
                    '(' + fmt(1 / (2 * state.sigma * state.sigma), 3) + ')I, the ellipses are nearly circular, and the two ' +
                    'gradients nearly coincide \u2014 the manifold is locally flat here. (distance to the singular locus: ' + fmt(distDiag, 2) + ')';
            }
        }

        /* ---------------- drawing ---------------- */
        function drawRefGrid() {
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 0.5;
            for (var i = 0; i <= 8; i++) {
                var v = CFG.PARAM_MIN + i * RANGE / 8;
                var a = p2c(v, CFG.PARAM_MIN), b = p2c(v, CFG.PARAM_MAX);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                a = p2c(CFG.PARAM_MIN, v); b = p2c(CFG.PARAM_MAX, v);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
            /* axes labels */
            ctx.font = '12px Consolas, monospace';
            ctx.fillStyle = 'rgba(0,229,255,0.4)';
            ctx.textAlign = 'right';
            ctx.fillText('\u03BC\u2081 \u2192', W - 10, H - 10);
            ctx.textAlign = 'left';
            ctx.fillText('\u03BC\u2082 \u2191', 10, 16);
        }

        function drawSingularLocus() {
            var a = p2c(CFG.PARAM_MIN, CFG.PARAM_MIN), b = p2c(CFG.PARAM_MAX, CFG.PARAM_MAX);
            ctx.setLineDash([6, 6]);
            ctx.strokeStyle = 'rgba(255,167,38,0.45)';
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = '11px Consolas, monospace';
            ctx.fillStyle = 'rgba(255,167,38,0.6)';
            ctx.textAlign = 'center';
            var mid = p2c(3.0, 3.0);
            ctx.save();
            ctx.translate(mid.x + 12, mid.y - 12);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText('\u03BC\u2081 = \u03BC\u2082 (singular locus)', 0, 0);
            ctx.restore();
        }

        function drawEllipses() {
            var f = state.field;
            var cellPx = (f.step / RANGE) * W;
            var halfCell = cellPx / 2;
            /* one global metric->pixel scale: honest relative sizes across the grid
               and across sigma. Calibrated so the flat-limit radius sigma*sqrt(2)
               at sigma=1 fills 38% of a density-14 cell at slider 1. */
            var pxPerUnit = state.ellipseScale * (((RANGE / 14) / RANGE) * W * 0.38) / Math.SQRT2;
            var BIG = 1e4;
            for (var k = 0; k < f.points.length; k++) {
                var pt = f.points[k];
                var e = pt.eig;
                var aLen = e.l2 > 1e-12 ? pxPerUnit / Math.sqrt(e.l2) : BIG; /* major: small lambda */
                var bLen = pxPerUnit / Math.sqrt(Math.max(e.l1, 1e-12));    /* minor: large lambda */
                if (aLen > BIG) aLen = BIG;
                var clipped = aLen > halfCell;
                var pos = p2c(pt.t1, pt.t2);
                var ang = Math.atan2(-e.v2.y, e.v2.x); /* major axis along v2, canvas y-flip */
                var kap = e.l2 > 0 ? e.l1 / e.l2 : Infinity;
                var s = Math.min(Math.max(Math.log10(Math.min(kap, 1e12)) / 4, 0), 1);
                var cr = Math.round(0 + s * C.warm.r), cg = Math.round(229 - s * (229 - C.warm.g)), cb = Math.round(255 - s * (255 - C.warm.b));
                ctx.save();
                ctx.beginPath();
                ctx.rect(pos.x - halfCell, pos.y - halfCell, cellPx, cellPx);
                ctx.clip();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(ang);
                ctx.beginPath();
                ctx.ellipse(0, 0, aLen, Math.max(bLen, 0.7), 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.10 + 0.10 * s).toFixed(3) + ')';
                ctx.fill();
                if (clipped) ctx.setLineDash([4, 3]);
                ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.35 + 0.3 * s).toFixed(3) + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        function drawArrow(x1, y1, x2, y2, color, glow, lw) {
            var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
            if (len < 3) return;
            var nx = dx / len, ny = dy / len;
            var hl = Math.min(14, len * 0.25), hw = hl * 0.45;
            ctx.strokeStyle = glow; ctx.lineWidth = lw + 5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - hl * nx + hw * ny, y2 - hl * ny - hw * nx);
            ctx.lineTo(x2 - hl * nx - hw * ny, y2 - hl * ny + hw * nx);
            ctx.closePath(); ctx.fill();
        }

        function drawProbe() {
            if (!state.probe || !state.probeData) return;
            var pos = p2c(state.probe.t1, state.probe.t2);
            var g = state.probeData.grad, sol = state.probeData.sol;
            var L = 90;
            /* crosshair */
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pos.x - 8, pos.y); ctx.lineTo(pos.x + 8, pos.y);
            ctx.moveTo(pos.x, pos.y - 8); ctx.lineTo(pos.x, pos.y + 8);
            ctx.stroke();
            var gn = Math.hypot(g.g1, g.g2);
            if (gn > 1e-12) {
                /* descent direction, canvas y-flip on second component */
                drawArrow(pos.x, pos.y, pos.x + (-g.g1 / gn) * L, pos.y + (g.g2 / gn) * L, C.red, 'rgba(255,70,70,0.3)', 3);
            }
            if (sol.ok) {
                var dn = Math.hypot(sol.d1, sol.d2);
                if (dn > 1e-12) {
                    drawArrow(pos.x, pos.y, pos.x + (-sol.d1 / dn) * L, pos.y + (sol.d2 / dn) * L, C.cyan, 'rgba(0,229,255,0.3)', 3);
                }
            } else {
                /* refusal marker */
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = C.amber; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.font = '600 11px Consolas, monospace';
                ctx.fillStyle = C.amber; ctx.textAlign = 'center';
                ctx.fillText('F singular', pos.x, pos.y - 22);
            }
        }

        function drawTargetAndSwap() {
            var pulse = Math.sin(state.frame * 0.04) * 0.15 + 0.85;
            var pos = p2c(state.target.t1, state.target.t2);
            var grd = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, 26 * pulse);
            grd.addColorStop(0, 'rgba(0,229,255,0.5)');
            grd.addColorStop(1, 'rgba(0,229,255,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(pos.x, pos.y, 26 * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = C.cyan;
            ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.font = '600 12px Consolas, monospace';
            ctx.fillStyle = 'rgba(0,229,255,0.9)'; ctx.textAlign = 'center';
            ctx.fillText('\u03B8*', pos.x, pos.y - 14);
            /* swap minimum: same distribution, labels exchanged */
            var sp = p2c(state.target.t2, state.target.t1);
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = '11px Consolas, monospace';
            ctx.fillStyle = 'rgba(0,229,255,0.55)';
            ctx.fillText('swap', sp.x, sp.y - 13);
        }

        /* ---------------- flow particles ---------------- */
        function spawnParticle() {
            return {
                t1: CFG.PARAM_MIN + state.rng() * RANGE,
                t2: CFG.PARAM_MIN + state.rng() * RANGE,
                age: 0,
                maxAge: PARTICLE_LIFE + Math.floor(state.rng() * 60)
            };
        }
        function updateParticles() {
            state.particles = state.particles.filter(function (p) { return p.age < p.maxAge; });
            while (state.particles.length < MAX_PARTICLES) state.particles.push(spawnParticle());
            for (var i = 0; i < state.particles.length; i++) {
                var p = state.particles[i];
                p.age++;
                var grad = NgvCore.klGrad({ t1: p.t1, t2: p.t2 }, state.target, state.sigma);
                var F = NgvCore.fisherAt(p.t1, p.t2, state.sigma);
                var sol = NgvCore.solveNatural(F, grad);
                if (!sol.ok) continue; /* refusal: particle stalls on the singular locus */
                var dn = Math.hypot(sol.d1, sol.d2);
                if (dn < 1e-12) continue;
                p.t1 -= PARTICLE_STEP * sol.d1 / dn;
                p.t2 -= PARTICLE_STEP * sol.d2 / dn;
                if (p.t1 < CFG.PARAM_MIN || p.t1 > CFG.PARAM_MAX || p.t2 < CFG.PARAM_MIN || p.t2 > CFG.PARAM_MAX) {
                    p.age = p.maxAge;
                }
            }
        }
        function drawParticles() {
            for (var i = 0; i < state.particles.length; i++) {
                var p = state.particles[i];
                var pos = p2c(p.t1, p.t2);
                var a = Math.sin((p.age / p.maxAge) * Math.PI) * 0.7;
                ctx.fillStyle = 'rgba(0,229,255,' + a.toFixed(3) + ')';
                ctx.beginPath(); ctx.arc(pos.x, pos.y, 1.6, 0, Math.PI * 2); ctx.fill();
            }
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = C.canvasBg;
            ctx.fillRect(0, 0, W, H);
            drawRefGrid();
            drawEllipses();
            drawSingularLocus();
            if (state.flowActive) drawParticles();
            drawProbe();
            drawTargetAndSwap();
            state.frame++;
        }

        /* ---------------- interaction ---------------- */
        function evtPos(e) {
            var rect = canvas.getBoundingClientRect();
            var cX = (e.touches && e.touches.length) ? e.touches[0].clientX : e.clientX;
            var cY = (e.touches && e.touches.length) ? e.touches[0].clientY : e.clientY;
            return { x: (cX - rect.left) * (W / rect.width), y: (cY - rect.top) * (H / rect.height) };
        }
        function hitTarget(x, y) {
            var pos = p2c(state.target.t1, state.target.t2);
            return (x - pos.x) * (x - pos.x) + (y - pos.y) * (y - pos.y) < 900;
        }
        function clampParam(v) {
            return Math.max(CFG.PARAM_MIN + 0.2, Math.min(CFG.PARAM_MAX - 0.2, v));
        }
        function onDown(e) {
            e.preventDefault();
            var p = evtPos(e);
            if (hitTarget(p.x, p.y)) {
                state.dragging = true;
                canvas.style.cursor = 'grabbing';
            } else {
                var pp = c2p(p.x, p.y);
                state.probe = { t1: pp.t1, t2: pp.t2 };
                computeProbe();
                state.dirtyPanel = true;
            }
        }
        function onMove(e) {
            var p = evtPos(e);
            if (state.dragging) {
                e.preventDefault();
                var pp = c2p(p.x, p.y);
                state.target.t1 = clampParam(pp.t1);
                state.target.t2 = clampParam(pp.t2);
                computeProbe(); /* loss depends on target */
                state.dirtyPanel = true;
            } else {
                canvas.style.cursor = hitTarget(p.x, p.y) ? 'grab' : 'crosshair';
            }
        }
        function onUp() {
            if (state.dragging) { state.dragging = false; canvas.style.cursor = 'crosshair'; }
        }
        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onUp);
        canvas.addEventListener('mouseleave', onUp);
        canvas.addEventListener('touchstart', onDown, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onUp);
        canvas.addEventListener('touchcancel', onUp);

        q('ngv-sigma-slider').addEventListener('input', function () {
            state.sigma = parseFloat(this.value);
            q('ngv-sigma-ro').textContent = state.sigma.toFixed(2);
            state.dirtyField = true;
            computeProbe();
            state.dirtyPanel = true;
        });
        q('ngv-density-slider').addEventListener('input', function () {
            state.density = parseInt(this.value, 10);
            q('ngv-density-ro').textContent = String(state.density);
            state.dirtyField = true;
        });
        q('ngv-scale-slider').addEventListener('input', function () {
            state.ellipseScale = parseFloat(this.value);
            q('ngv-scale-ro').textContent = state.ellipseScale.toFixed(1);
        });
        q('ngv-flow-btn').addEventListener('click', function () {
            state.flowActive = !state.flowActive;
            this.classList.toggle('active', state.flowActive);
            if (state.flowActive) { state.particles = []; state.rng = NgvCore.mulberry32(2026); }
        });
        q('ngv-reset-btn').addEventListener('click', function () {
            state.sigma = CFG.DEFAULT_SIGMA;
            state.density = 14;
            state.ellipseScale = 1.0;
            state.target = { t1: CFG.DEFAULT_TARGET.t1, t2: CFG.DEFAULT_TARGET.t2 };
            state.probe = null; state.probeData = null;
            state.flowActive = false; state.particles = [];
            q('ngv-flow-btn').classList.remove('active');
            q('ngv-sigma-slider').value = '1.0'; q('ngv-sigma-ro').textContent = '1.00';
            q('ngv-density-slider').value = '14'; q('ngv-density-ro').textContent = '14';
            q('ngv-scale-slider').value = '1.0'; q('ngv-scale-ro').textContent = '1.0';
            state.dirtyField = true;
            state.dirtyPanel = true;
        });
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', function () { sizeCanvas(); });
        }

        /* ---------------- main loop ---------------- */
        function animate() {
            ensureField();
            if (state.dirtyPanel) { updatePanel(); state.dirtyPanel = false; }
            if (state.flowActive) updateParticles();
            draw();
            if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(animate);
        }
        sizeCanvas();
        ensureField();
        updatePanel();
        state.dirtyPanel = false;
        animate();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();