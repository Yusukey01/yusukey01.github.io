// ============================================================
// sec5_p15_flow_matching_demo.js — FmCore (pure math layer)
//
// Flow matching on a K=5 Gaussian-mixture target (modes on a circle of
// radius R, per-mode std s). Two probability paths share one integrator:
//   linear  a=t,        b=1-t          (straight CONDITIONAL segments)
//   cosine  a=sin(pi t/2), b=cos(pi t/2)  (variance preserving, a^2+b^2=1)
//
// The marginal velocity is EXACT (v2 fix, July 2026). v1 dropped the
// within-mode posterior term: for p_data a GMM with s > 0,
//   u_t(x) = (bd/b) x + (ad - (bd/b) a) E[z | x_t = x],
//   E[z|x] = m_bar + c (x - a m_bar),   m_bar = sum_k r_k mu_k,
//   c = a s^2 / v,   v = a^2 s^2 + b^2,
//   r_k = softmax_k( -||x - a mu_k||^2 / (2v) ).
// v1 used E[z|x] = m_bar (the point-mass posterior) with GMM
// responsibilities — an inconsistent hybrid whose flow collapses the
// within-mode spread near t = 1 (c -> 1 there). The continuity-equation
// certificate (T5) detects this decisively: relative residual < 3e-8 for
// the corrected field vs 1e-2..0.6 for v1's.
//
// Story constants were RE-MEASURED after the fix (all seeded):
//   discretization error E(N) (mean terminal distance to the N=256
//   reference solution): linear E(4)=0.127, E(8)=0.045; cosine
//   E(4)=0.144, E(8)=0.048 — the cross-schedule gap is MODEST (~8-14%);
//   v1's "5.2x" contrast was an artifact of the wrong field + the
//   miss-distance metric.
//   marginal straightness (path length / displacement, pooled):
//   linear ~1.56, cosine ~1.14 — the linear path's MARGINAL trajectories
//   are the more curved ones for this multimodal target (bd/b = -1/(1-t)
//   contracts toward the origin while the mode pull points outward,
//   producing S-curves), even though its CONDITIONAL segments are
//   straight. That gap is the demo's teaching point (and the reason
//   rectified flow needs the Reflow step).
// ============================================================

var FmCore = (function () {
    'use strict';

    // ---------- constants ----------
    var K = 5;
    var R = 1.6;
    var MODE_STD = 0.10;
    var EPS = 1e-3;          // integrate t in [0, 1-EPS]; bd/b finite there
    var N_MIN = 4, N_MAX = 20, N_DEFAULT = 8;
    var N_REF = 256;         // reference solution for the E(N) metric
    var N_PARTICLES = 400;

    // Mode means on the circle (visual parity with v1).
    var MU = (function () {
        var mu = new Array(K);
        for (var k = 0; k < K; k++) {
            var ang = k * 2 * Math.PI / K;
            mu[k] = [R * Math.cos(ang), R * Math.sin(ang)];
        }
        return mu;
    })();

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

    function randn(rng) {
        var u1 = 0, u2 = 0;
        while (u1 === 0) u1 = rng();
        while (u2 === 0) u2 = rng();
        return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    }

    function randn2(rng) { return [randn(rng), randn(rng)]; }

    // ---------- schedules ----------
    function schedLinear(t) { return { a: t, b: 1 - t, ad: 1.0, bd: -1.0 }; }

    function schedCosine(t) {
        var h = Math.PI * t / 2;
        return {
            a: Math.sin(h), b: Math.cos(h),
            ad: (Math.PI / 2) * Math.cos(h),
            bd: -(Math.PI / 2) * Math.sin(h)
        };
    }

    var SCHEDULES = { straight: schedLinear, curved: schedCosine };

    // ---------- softmax ----------
    function softmaxInto(logits, out) {
        var maxLog = -Infinity, k;
        for (k = 0; k < logits.length; k++) if (logits[k] > maxLog) maxLog = logits[k];
        var sum = 0;
        for (k = 0; k < logits.length; k++) {
            var w = Math.exp(logits[k] - maxLog);
            out[k] = w; sum += w;
        }
        var inv = 1.0 / sum;
        for (k = 0; k < out.length; k++) out[k] *= inv;
    }

    // ---------- marginal velocity (exact) ----------
    var _lg = new Float64Array(K);
    var _rk = new Float64Array(K);

    // Responsibilities r_k(x, t) for the marginal GMM. Fills `out`.
    function responsibilitiesInto(x, t, sched, out) {
        var s = sched(t);
        var v = s.a * s.a * MODE_STD * MODE_STD + s.b * s.b;
        var inv2v = 1.0 / (2 * v);
        for (var k = 0; k < K; k++) {
            var d0 = x[0] - s.a * MU[k][0];
            var d1 = x[1] - s.a * MU[k][1];
            _lg[k] = -(d0 * d0 + d1 * d1) * inv2v;
        }
        softmaxInto(_lg, out);
        return out;
    }

    // Posterior mean E[z | x_t = x] (Gaussian conjugacy per mode):
    //   E[z|x] = m_bar + c (x - a m_bar),  c = a s^2 / v.
    function posteriorMean(x, t, sched, out) {
        var u = out || [0, 0];
        var s = sched(t);
        var v = s.a * s.a * MODE_STD * MODE_STD + s.b * s.b;
        responsibilitiesInto(x, t, sched, _rk);
        var m0 = 0, m1 = 0;
        for (var k = 0; k < K; k++) {
            m0 += _rk[k] * MU[k][0];
            m1 += _rk[k] * MU[k][1];
        }
        var c = s.a * MODE_STD * MODE_STD / v;
        u[0] = m0 + c * (x[0] - s.a * m0);
        u[1] = m1 + c * (x[1] - s.a * m1);
        return u;
    }

    var _pm = [0, 0];

    // u_t(x) = (bd/b) x + (ad - (bd/b) a) E[z|x].
    function velocity(x, t, sched, out) {
        var u = out || [0, 0];
        var s = sched(t);
        posteriorMean(x, t, sched, _pm);
        var coef = s.bd / s.b;            // finite for t <= 1 - EPS
        var w = s.ad - coef * s.a;
        u[0] = coef * x[0] + w * _pm[0];
        u[1] = coef * x[1] + w * _pm[1];
        return u;
    }

    // Closed-form marginal density p_t(x) of the GMM path (for the
    // continuity-equation certificate).
    function marginalDensity(x, t, sched) {
        var s = sched(t);
        var v = s.a * s.a * MODE_STD * MODE_STD + s.b * s.b;
        var inv2v = 1.0 / (2 * v);
        var maxLog = -Infinity, k;
        for (k = 0; k < K; k++) {
            var d0 = x[0] - s.a * MU[k][0];
            var d1 = x[1] - s.a * MU[k][1];
            _lg[k] = -(d0 * d0 + d1 * d1) * inv2v;
            if (_lg[k] > maxLog) maxLog = _lg[k];
        }
        var sum = 0;
        for (k = 0; k < K; k++) sum += Math.exp(_lg[k] - maxLog);
        return Math.exp(maxLog) * sum / (K * 2 * Math.PI * v);
    }

    // ---------- integration (ONE Euler stepper for everything) ----------
    var _u = [0, 0];
    var _cur = [0, 0];

    function eulerStep(px, py, t, h, sched) {
        _cur[0] = px; _cur[1] = py;
        velocity(_cur, t, sched, _u);
        return [px + h * _u[0], py + h * _u[1]];
    }

    // Full trajectory (N+1 points), t from 0 to 1-EPS.
    function integrateTrajectory(x0, N, sched) {
        var h = (1 - EPS) / N;
        var traj = new Array(N + 1);
        var px = x0[0], py = x0[1];
        traj[0] = [px, py];
        for (var i = 0; i < N; i++) {
            var nx = eulerStep(px, py, i * h, h, sched);
            px = nx[0]; py = nx[1];
            traj[i + 1] = nx;
        }
        return traj;
    }

    // Terminal only (same stepper — bitwise-identical endpoint).
    function integrateTerminal(x0, N, sched) {
        var h = (1 - EPS) / N;
        var px = x0[0], py = x0[1];
        for (var i = 0; i < N; i++) {
            var nx = eulerStep(px, py, i * h, h, sched);
            px = nx[0]; py = nx[1];
        }
        return [px, py];
    }

    function nearestMode(p) {
        var best = Infinity, bestK = 0;
        for (var k = 0; k < K; k++) {
            var d0 = p[0] - MU[k][0];
            var d1 = p[1] - MU[k][1];
            var d = Math.sqrt(d0 * d0 + d1 * d1);
            if (d < best) { best = d; bestK = k; }
        }
        return { dist: best, mode: bestK };
    }

    // Batch integration with per-particle trajectories.
    function integrateBatch(batch, N, sched) {
        var M = batch.length;
        var trajs = new Array(M);
        var terminals = new Array(M);
        var modes = new Int32Array(M);
        for (var i = 0; i < M; i++) {
            var traj = integrateTrajectory(batch[i], N, sched);
            trajs[i] = traj;
            terminals[i] = traj[traj.length - 1];
            modes[i] = nearestMode(terminals[i]).mode;
        }
        return { trajs: trajs, terminals: terminals, modes: modes };
    }

    // ---------- metrics ----------
    // E(N): mean terminal distance to the reference solution (pure Euler
    // discretization error; -> 0 as N grows).
    function discretizationError(terminals, refTerminals) {
        var s = 0;
        for (var i = 0; i < terminals.length; i++) {
            s += Math.hypot(terminals[i][0] - refTerminals[i][0],
                terminals[i][1] - refTerminals[i][1]);
        }
        return s / terminals.length;
    }

    // Marginal-trajectory straightness: pooled path length / displacement.
    // 1 = perfectly straight; larger = more curved.
    function pathRatio(trajs) {
        var plen = 0, disp = 0;
        for (var i = 0; i < trajs.length; i++) {
            var T = trajs[i];
            for (var j = 1; j < T.length; j++) {
                plen += Math.hypot(T[j][0] - T[j - 1][0], T[j][1] - T[j - 1][1]);
            }
            var last = T[T.length - 1];
            disp += Math.hypot(last[0] - T[0][0], last[1] - T[0][1]);
        }
        return plen / disp;
    }

    function drawBatch(M, rng) {
        var out = new Array(M);
        for (var i = 0; i < M; i++) out[i] = randn2(rng);
        return out;
    }

    var DEFAULTS = {
        batchSeed: 9001,
        K: K, R: R, MODE_STD: MODE_STD, EPS: EPS,
        N_MIN: N_MIN, N_MAX: N_MAX, N_DEFAULT: N_DEFAULT,
        N_REF: N_REF, N_PARTICLES: N_PARTICLES,
        HIT_THRESHOLD: 0.25
    };

    // ---------- self-tests ----------
    function runSelfTests() {
        var failures = [];
        function check(name, cond) { if (!cond) failures.push(name); }
        var TOL = 1e-12;

        // T1: mode geometry pins.
        (function () {
            check('T1 MU[0] pin', Math.abs(MU[0][0] - 1.6) < TOL && Math.abs(MU[0][1]) < TOL);
            check('T1 MU[2] pin',
                Math.abs(MU[2][0] - (-1.2944271909999159)) < TOL &&
                Math.abs(MU[2][1] - 0.94045640366795724) < TOL);
            var onCircle = true;
            for (var k = 0; k < K; k++) {
                if (Math.abs(Math.hypot(MU[k][0], MU[k][1]) - R) > 1e-12) onCircle = false;
            }
            check('T1 modes on radius R', onCircle);
        })();

        // T2: schedule endpoints, VP identity, derivative FD.
        (function () {
            var l0 = schedLinear(0), l1 = schedLinear(1);
            var c0 = schedCosine(0), c1 = schedCosine(1);
            check('T2 endpoints',
                l0.a === 0 && l0.b === 1 && l1.a === 1 && l1.b === 0 &&
                c0.a === 0 && c0.b === 1 &&
                Math.abs(c1.a - 1) < 1e-15 && Math.abs(c1.b) < 1e-15);
            var vp = true;
            for (var t = 0.05; t < 1; t += 0.1) {
                var s = schedCosine(t);
                if (Math.abs(s.a * s.a + s.b * s.b - 1) > 1e-14) vp = false;
            }
            check('T2 cosine variance preserving', vp);
            // derivative FD (both schedules; gradients exist -> FD applies)
            var worst = 0, h = 1e-6;
            [schedLinear, schedCosine].forEach(function (sc) {
                for (var tt = 0.1; tt < 0.95; tt += 0.2) {
                    var p = sc(tt + h), m = sc(tt - h), c = sc(tt);
                    worst = Math.max(worst,
                        Math.abs((p.a - m.a) / (2 * h) - c.ad),
                        Math.abs((p.b - m.b) / (2 * h) - c.bd));
                }
            });
            check('T2 schedule derivatives match FD (<1e-6)', worst < 1e-6);
        })();

        // T3: softmax.
        (function () {
            var out = new Float64Array(3);
            softmaxInto([0, Math.log(2), Math.log(3)], out);
            check('T3 softmax pin',
                Math.abs(out[0] - 1 / 6) < TOL && Math.abs(out[1] - 2 / 6) < TOL &&
                Math.abs(out[2] - 3 / 6) < TOL);
        })();

        // T4: velocity value pins (mechanically computed 2026-07).
        (function () {
            var u1 = velocity([0.3, -0.8], 0.5, schedLinear);
            check('T4 velocity pin linear',
                Math.abs(u1[0] - 0.29049183295719516) < TOL &&
                Math.abs(u1[1] - (-0.86968682277897003)) < TOL);
            var u2 = velocity([-1.2, 0.4], 0.9, schedCosine);
            check('T4 velocity pin cosine',
                Math.abs(u2[0] - (-0.86908112406502092)) < TOL &&
                Math.abs(u2[1] - 3.9438276709176474) < TOL);
        })();

        // T5: CONTINUITY-EQUATION certificate — the field must transport the
        // closed-form marginal: dp/dt + div(p u) = 0, checked by central
        // differences. Relative residual < 1e-6 (measured 2.6e-8 worst for
        // the exact field; v1's missing-posterior-term field gives 1e-2..0.6).
        (function () {
            var probes = [
                [[0.3, -0.8], 0.3, schedLinear],
                [[1.0, 0.5], 0.95, schedLinear],
                [[1.5, 0.1], 0.995, schedLinear],
                [[0.2, 1.1], 0.5, schedCosine],
                [[-0.9, -0.3], 0.9, schedCosine],
                [[1.5, 0.1], 0.995, schedCosine]
            ];
            var dt = 1e-6, dx = 1e-5;
            var worst = 0;
            for (var p = 0; p < probes.length; p++) {
                var x = probes[p][0], t = probes[p][1], sc = probes[p][2];
                var dpdt = (marginalDensity(x, t + dt, sc) -
                    marginalDensity(x, t - dt, sc)) / (2 * dt);
                var div = 0;
                for (var dim = 0; dim < 2; dim++) {
                    var xp = x.slice(); xp[dim] += dx;
                    var xm = x.slice(); xm[dim] -= dx;
                    var up = velocity(xp, t, sc);
                    var pup = marginalDensity(xp, t, sc) * up[dim];
                    var um = velocity(xm, t, sc);
                    var pum = marginalDensity(xm, t, sc) * um[dim];
                    div += (pup - pum) / (2 * dx);
                }
                var resid = Math.abs(dpdt + div) /
                    (Math.abs(dpdt) + Math.abs(div) + 1e-12);
                if (resid > worst) worst = resid;
            }
            check('T5 continuity equation (<1e-6)', worst < 1e-6);
        })();

        // T6: posterior mean vs brute-force quadrature over z (independent
        // code path; kills formula mutants the pins might miss).
        (function () {
            function quadPM(x, t, sched) {
                var s = sched(t);
                var lo = -2.2, hi = 2.2, step = 0.02;
                var num0 = 0, num1 = 0, den = 0;
                for (var zx = lo; zx <= hi; zx += step) {
                    for (var zy = lo; zy <= hi; zy += step) {
                        // p_data(z): GMM
                        var pd = 0;
                        for (var k = 0; k < K; k++) {
                            var d0 = zx - MU[k][0], d1 = zy - MU[k][1];
                            pd += Math.exp(-(d0 * d0 + d1 * d1) / (2 * MODE_STD * MODE_STD));
                        }
                        // p_t(x|z) = N(x; a z, b^2 I)
                        var e0 = x[0] - s.a * zx, e1 = x[1] - s.a * zy;
                        var lik = Math.exp(-(e0 * e0 + e1 * e1) / (2 * s.b * s.b));
                        var w = pd * lik;
                        num0 += w * zx; num1 += w * zy; den += w;
                    }
                }
                return [num0 / den, num1 / den];
            }
            var worst = 0;
            var probes = [[[0.3, -0.8], 0.5, schedLinear], [[-0.6, 0.9], 0.7, schedCosine]];
            for (var p = 0; p < probes.length; p++) {
                var pm = posteriorMean(probes[p][0], probes[p][1], probes[p][2]);
                var q = quadPM(probes[p][0], probes[p][1], probes[p][2]);
                worst = Math.max(worst, Math.abs(pm[0] - q[0]), Math.abs(pm[1] - q[1]));
            }
            check('T6 posterior mean matches quadrature (<1e-3)', worst < 1e-3);
        })();

        // T7: integrator — hand pin for one step, bitwise batch/terminal
        // agreement (one stepper), trajectory shape.
        (function () {
            var x0 = [0.4, -0.7];
            var h = (1 - EPS) / 1;
            var u = velocity(x0, 0, schedLinear);
            var expect = [x0[0] + h * u[0], x0[1] + h * u[1]];
            var traj = integrateTrajectory(x0, 1, schedLinear);
            check('T7 one-step Euler pin (bitwise)',
                traj[1][0] === expect[0] && traj[1][1] === expect[1]);
            check('T7 trajectory shape', traj.length === 2 &&
                traj[0][0] === x0[0] && traj[0][1] === x0[1]);
            var b = integrateBatch([x0], 12, schedCosine);
            var term = integrateTerminal(x0, 12, schedCosine);
            check('T7 batch terminal == integrateTerminal (bitwise)',
                b.terminals[0][0] === term[0] && b.terminals[0][1] === term[1]);
        })();

        // T8: nearestMode pin (value included — kills a dist^2 mutant).
        (function () {
            var r = nearestMode([1.5, 0.1]);
            check('T8 nearestMode pin', r.mode === 0 &&
                Math.abs(r.dist - Math.hypot(1.5 - 1.6, 0.1)) < TOL);
        })();

        // T9: RNG determinism + moments.
        (function () {
            var a = randn2(mulberry32(5)), b = randn2(mulberry32(5));
            check('T9 seeded determinism', a[0] === b[0] && a[1] === b[1]);
            var rng = mulberry32(77);
            var n = 20000, mean = 0, m2 = 0;
            for (var i = 0; i < n; i++) { var x = randn(rng); mean += x; m2 += x * x; }
            mean /= n;
            var variance = m2 / n - mean * mean;
            check('T9 randn moments', Math.abs(mean) < 0.03 && Math.abs(variance - 1) < 0.05);
        })();

        // T10: metric + story tests (seeded, M=100 for speed; margins
        // measured 2026-07 on the corrected field).
        (function () {
            var batch = drawBatch(100, mulberry32(DEFAULTS.batchSeed));
            function terms(N, sc) {
                var out = new Array(batch.length);
                for (var i = 0; i < batch.length; i++) out[i] = integrateTerminal(batch[i], N, sc);
                return out;
            }
            var refL = terms(N_REF, schedLinear);
            var refC = terms(N_REF, schedCosine);
            check('T10 E(ref, ref) = 0',
                discretizationError(refL, refL) === 0);
            var e4L = discretizationError(terms(4, schedLinear), refL);
            var e20L = discretizationError(terms(20, schedLinear), refL);
            var e4C = discretizationError(terms(4, schedCosine), refC);
            var e20C = discretizationError(terms(20, schedCosine), refC);
            check('T10 E(N) decreases with N (both schedules)',
                e4L > e20L && e4C > e20C);
            check('T10 E(20) small (<0.05 both)', e20L < 0.05 && e20C < 0.05);
            // straightness story: linear MARGINAL paths are the curved ones
            // (measured pooled ratios ~1.56 vs ~1.14 at high N)
            var rL = pathRatio(integrateBatch(batch, 64, schedLinear).trajs);
            var rC = pathRatio(integrateBatch(batch, 64, schedCosine).trajs);
            check('T10 linear marginal ratio > 1.4', rL > 1.4);
            check('T10 cosine marginal ratio < 1.25', rC < 1.25);
            check('T10 linear more curved than cosine', rL > rC);
        })();

        // T11: terminal spread physics — a perfect flow deposits per-mode
        // spread ~ sqrt(v(1-EPS)) ~ 0.0999 (v1's field collapsed it; this is
        // the physical face of the T5 certificate).
        (function () {
            var batch = drawBatch(100, mulberry32(31337));
            var b = integrateBatch(batch, 128, schedLinear);
            var groups = [];
            for (var k = 0; k < K; k++) groups.push([]);
            for (var i = 0; i < b.terminals.length; i++) {
                groups[b.modes[i]].push(b.terminals[i]);
            }
            var pooled = 0, cnt = 0;
            for (k = 0; k < K; k++) {
                var g = groups[k];
                if (g.length < 5) continue;
                var mx = 0, my = 0, j;
                for (j = 0; j < g.length; j++) { mx += g[j][0]; my += g[j][1]; }
                mx /= g.length; my /= g.length;
                for (j = 0; j < g.length; j++) {
                    pooled += (g[j][0] - mx) * (g[j][0] - mx) + (g[j][1] - my) * (g[j][1] - my);
                }
                cnt += 2 * g.length;
            }
            var std = Math.sqrt(pooled / cnt);
            check('T11 per-mode terminal spread ~ target width (0.07..0.13)',
                std > 0.07 && std < 0.13);
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        K: K, R: R, MODE_STD: MODE_STD, EPS: EPS, MU: MU,
        mulberry32: mulberry32,
        randn: randn,
        randn2: randn2,
        softmaxInto: softmaxInto,
        schedLinear: schedLinear,
        schedCosine: schedCosine,
        SCHEDULES: SCHEDULES,
        responsibilitiesInto: responsibilitiesInto,
        posteriorMean: posteriorMean,
        velocity: velocity,
        marginalDensity: marginalDensity,
        integrateTrajectory: integrateTrajectory,
        integrateTerminal: integrateTerminal,
        integrateBatch: integrateBatch,
        nearestMode: nearestMode,
        discretizationError: discretizationError,
        pathRatio: pathRatio,
        drawBatch: drawBatch,
        DEFAULTS: DEFAULTS,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = FmCore; }
// ============================================================
// UI layer (#flow_matching_demo_visualizer, prefix fmv-)
// Two panels — linear path (straight CONDITIONAL segments) | cosine path
// (variance preserving) — integrating the SAME seeded particle batch under
// the exact marginal field. N slider isolates the Euler step count.
// Per-panel DOM readouts: E(N) = mean terminal distance to the N=256
// reference solution (pure discretization error), and the marginal
// straightness ratio (path length / displacement).
// Dark island: fixed palette; no var(--), no data-theme/currentColor reads.
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
        bad: '#ef5350',
        traceHit: 'rgba(100,181,246,0.22)',
        traceMiss: 'rgba(255,167,38,0.30)',
        ptHit: '#64b5f6',
        ptMiss: '#ffa726',
        modeRing: '#e8eef6',
        axis: 'rgba(140,160,190,0.22)'
    };

    var VIEW_HALF = 2.2;
    var MAX_TRACES = 220;
    var TERMINAL_R = 2.2;
    var MODE_RING_R = 9;

    // ---------- CSS ----------
    function injectCSS() {
        if (document.getElementById('fmv-style')) return;
        var css = '' +
            '#flow_matching_demo_visualizer{background:' + C.bg + ';border:1px solid ' + C.border + ';' +
            'border-radius:10px;padding:16px;color:' + C.text + ';' +
            'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}' +
            '#flow_matching_demo_visualizer .fmv-panels{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;}' +
            '#flow_matching_demo_visualizer .fmv-panel{flex:1 1 300px;min-width:280px;max-width:460px;}' +
            '#flow_matching_demo_visualizer .fmv-panel-head{font-weight:600;font-size:0.95rem;margin-bottom:2px;}' +
            '#flow_matching_demo_visualizer .fmv-panel-sub{color:' + C.dim + ';font-size:0.78rem;margin-bottom:6px;}' +
            '#flow_matching_demo_visualizer .fmv-canvas{width:100%;display:block;border-radius:8px;' +
            'border:1px solid ' + C.border + ';}' +
            '#flow_matching_demo_visualizer .fmv-readout{margin-top:6px;font-size:0.82rem;' +
            'font-family:ui-monospace,Consolas,monospace;color:' + C.text + ';min-height:2.4em;}' +
            '#flow_matching_demo_visualizer .fmv-readout span{color:' + C.dim + ';}' +
            '#flow_matching_demo_visualizer .fmv-controls{display:flex;flex-wrap:wrap;gap:14px;align-items:center;' +
            'justify-content:center;margin-top:14px;padding-top:12px;border-top:1px solid ' + C.border + ';}' +
            '#flow_matching_demo_visualizer .fmv-ctl{display:flex;align-items:center;gap:8px;font-size:0.86rem;color:' + C.dim + ';}' +
            '#flow_matching_demo_visualizer .fmv-ctl input[type=range]{width:200px;}' +
            '#flow_matching_demo_visualizer .fmv-btn{background:transparent;color:' + C.accent + ';' +
            'border:1px solid ' + C.accent + ';border-radius:6px;padding:6px 14px;font-size:0.88rem;cursor:pointer;}' +
            '#flow_matching_demo_visualizer .fmv-btn:hover{background:rgba(100,181,246,0.12);}' +
            '#flow_matching_demo_visualizer .fmv-legend{color:' + C.dim + ';font-size:0.75rem;margin-top:8px;text-align:center;}' +
            '#flow_matching_demo_visualizer .fmv-refusal{border:1px solid ' + C.bad + ';border-radius:8px;' +
            'padding:14px;color:' + C.bad + ';}' +
            '#flow_matching_demo_visualizer .fmv-refusal ul{margin:8px 0 0 18px;padding:0;}' +
            '@media (max-width: 700px){' +
            '#flow_matching_demo_visualizer{padding:10px;}' +
            '#flow_matching_demo_visualizer .fmv-ctl input[type=range]{width:140px;}' +
            '}';
        var style = document.createElement('style');
        style.id = 'fmv-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ---------- HTML ----------
    function panelHTML(id, title, sub) {
        return '<div class="fmv-panel">' +
            '<div class="fmv-panel-head">' + title + '</div>' +
            '<div class="fmv-panel-sub">' + sub + '</div>' +
            '<canvas class="fmv-canvas" id="fmv-canvas-' + id + '"></canvas>' +
            '<div class="fmv-readout" id="fmv-readout-' + id + '"></div>' +
            '</div>';
    }

    function buildHTML(container) {
        var D = FmCore.DEFAULTS;
        container.innerHTML =
            '<div class="fmv-panels">' +
            panelHTML('L', 'Linear path',
                '&alpha; = t, &beta; = 1&minus;t &mdash; straight <em>conditional</em> segments') +
            panelHTML('R', 'Cosine path (VP)',
                '&alpha; = sin(&pi;t/2), &beta; = cos(&pi;t/2) &mdash; variance preserving') +
            '</div>' +
            '<div class="fmv-controls">' +
            '<span class="fmv-ctl">Euler steps N ' +
            '<input type="range" id="fmv-n" min="' + D.N_MIN + '" max="' + D.N_MAX +
            '" step="1" value="' + D.N_DEFAULT + '">' +
            '<span id="fmv-n-val">' + D.N_DEFAULT + '</span></span>' +
            '<button class="fmv-btn" id="fmv-resample">&#8635; Resample particles</button>' +
            '</div>' +
            '<div class="fmv-legend">blue: terminal within ' + D.HIT_THRESHOLD +
            ' of a mode &middot; orange: missed &middot; rings: mode means &middot; ' +
            'faint lines: marginal ODE trajectories &middot; ' +
            'E(N): mean terminal distance to the N=' + D.N_REF + ' reference solution &middot; ' +
            'ratio: trajectory path length / displacement (1 = straight)</div>' +
            '<div class="fmv-legend" id="fmv-status"></div>';
    }

    function renderRefusal(container, failures) {
        injectCSS();
        var items = '';
        for (var i = 0; i < failures.length; i++) items += '<li>' + failures[i] + '</li>';
        container.innerHTML =
            '<div class="fmv-refusal"><strong>Demo disabled: mathematical self-tests failed.</strong>' +
            '<ul>' + items + '</ul>' +
            '<p>The demo refuses to render rather than display unverified quantities.</p></div>';
    }

    // ---------- canvas ----------
    function sizeCanvas(canvas) {
        var rect = canvas.getBoundingClientRect();
        var w = Math.max(1, Math.round(rect.width));
        var h = w;
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
            x: ((x + VIEW_HALF) / (2 * VIEW_HALF)) * W,
            y: ((VIEW_HALF - y) / (2 * VIEW_HALF)) * H
        };
    }

    function drawPanel(cv, result) {
        var ctx = cv.ctx, W = cv.W, H = cv.H;
        var D = FmCore.DEFAULTS;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = C.panelBg;
        ctx.fillRect(0, 0, W, H);
        // axes
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        var o = toPx(0, 0, W, H);
        ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();

        var M = result.trajs.length;
        var stride = Math.max(1, Math.ceil(M / MAX_TRACES));
        var i, j;
        // traces
        ctx.lineWidth = 1;
        for (i = 0; i < M; i += stride) {
            var traj = result.trajs[i];
            var landed = FmCore.nearestMode(result.terminals[i]).dist <= D.HIT_THRESHOLD;
            ctx.strokeStyle = landed ? C.traceHit : C.traceMiss;
            ctx.beginPath();
            var p0 = toPx(traj[0][0], traj[0][1], W, H);
            ctx.moveTo(p0.x, p0.y);
            for (j = 1; j < traj.length; j++) {
                var p = toPx(traj[j][0], traj[j][1], W, H);
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }
        // terminals
        for (i = 0; i < M; i++) {
            var t = result.terminals[i];
            var hit = FmCore.nearestMode(t).dist <= D.HIT_THRESHOLD;
            var q = toPx(t[0], t[1], W, H);
            ctx.fillStyle = hit ? C.ptHit : C.ptMiss;
            ctx.beginPath();
            ctx.arc(q.x, q.y, TERMINAL_R, 0, 2 * Math.PI);
            ctx.fill();
        }
        // mode rings on top
        ctx.strokeStyle = C.modeRing;
        ctx.lineWidth = 1.6;
        for (var k = 0; k < FmCore.K; k++) {
            var m = toPx(FmCore.MU[k][0], FmCore.MU[k][1], W, H);
            ctx.beginPath();
            ctx.arc(m.x, m.y, MODE_RING_R, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

    // ---------- state ----------
    function makeState() {
        var D = FmCore.DEFAULTS;
        return {
            batchSeed: D.batchSeed,
            batch: FmCore.drawBatch(D.N_PARTICLES, FmCore.mulberry32(D.batchSeed)),
            N: D.N_DEFAULT,
            refL: null,  // reference terminals, linear
            refR: null,  // reference terminals, cosine
            left: null,
            right: null
        };
    }

    function computeReferences(state) {
        var D = FmCore.DEFAULTS;
        var M = state.batch.length;
        state.refL = new Array(M);
        state.refR = new Array(M);
        for (var i = 0; i < M; i++) {
            state.refL[i] = FmCore.integrateTerminal(state.batch[i], D.N_REF, FmCore.schedLinear);
            state.refR[i] = FmCore.integrateTerminal(state.batch[i], D.N_REF, FmCore.schedCosine);
        }
    }

    function recompute(state) {
        state.left = FmCore.integrateBatch(state.batch, state.N, FmCore.schedLinear);
        state.right = FmCore.integrateBatch(state.batch, state.N, FmCore.schedCosine);
    }

    // ---------- rendering ----------
    function readoutHTML(N, err, ratio) {
        return 'E(' + N + ') = ' + err.toFixed(4) +
            ' <span>(vs N=' + FmCore.DEFAULTS.N_REF + ' reference)</span><br>' +
            'ratio = ' + ratio.toFixed(3) + ' <span>(path length / displacement)</span>';
    }

    function renderAll(state, refs) {
        drawPanel(refs.cvL, state.left);
        drawPanel(refs.cvR, state.right);
        var eL = FmCore.discretizationError(state.left.terminals, state.refL);
        var eR = FmCore.discretizationError(state.right.terminals, state.refR);
        var rL = FmCore.pathRatio(state.left.trajs);
        var rR = FmCore.pathRatio(state.right.trajs);
        refs.readL.innerHTML = readoutHTML(state.N, eL, rL);
        refs.readR.innerHTML = readoutHTML(state.N, eR, rR);
        refs.nVal.textContent = String(state.N);
        refs.nSlider.value = String(state.N);
    }

    // ---------- init ----------
    function init() {
        var container = document.getElementById('flow_matching_demo_visualizer');
        if (!container) return;
        if (container.dataset.fmvInit) return; // idempotency guard
        container.dataset.fmvInit = '1';

        // SELF-TEST GATE — nothing renders on broken math.
        var gate = FmCore.runSelfTests();
        if (!gate.passed) {
            renderRefusal(container, gate.failures);
            return;
        }

        injectCSS();
        buildHTML(container);

        var refs = {
            cvL: sizeCanvas(document.getElementById('fmv-canvas-L')),
            cvR: sizeCanvas(document.getElementById('fmv-canvas-R')),
            readL: document.getElementById('fmv-readout-L'),
            readR: document.getElementById('fmv-readout-R'),
            nSlider: document.getElementById('fmv-n'),
            nVal: document.getElementById('fmv-n-val'),
            resampleBtn: document.getElementById('fmv-resample'),
            status: document.getElementById('fmv-status')
        };

        var state = makeState();
        refs.status.textContent = 'computing reference solutions\u2026';
        // one setTimeout tick so the status paints before the sync compute
        setTimeout(function () {
            computeReferences(state);
            recompute(state);
            refs.status.textContent = '';
            renderAll(state, refs);
        }, 0);

        refs.nSlider.addEventListener('input', function () {
            var D = FmCore.DEFAULTS;
            var v = parseInt(refs.nSlider.value, 10) || D.N_DEFAULT;
            state.N = Math.max(D.N_MIN, Math.min(D.N_MAX, v));
            if (!state.refL) return; // references still computing
            recompute(state);
            renderAll(state, refs);
        });

        refs.resampleBtn.addEventListener('click', function () {
            if (!state.refL) return;
            state.batchSeed += 1; // documented seed-stream advance
            state.batch = FmCore.drawBatch(FmCore.DEFAULTS.N_PARTICLES,
                FmCore.mulberry32(state.batchSeed));
            refs.status.textContent = 'computing reference solutions\u2026';
            state.refL = null;
            setTimeout(function () {
                computeReferences(state);
                recompute(state);
                refs.status.textContent = '';
                renderAll(state, refs);
            }, 0);
        });

        var resizePending = false;
        window.addEventListener('resize', function () {
            if (resizePending) return;
            resizePending = true;
            setTimeout(function () {
                resizePending = false;
                refs.cvL = sizeCanvas(document.getElementById('fmv-canvas-L'));
                refs.cvR = sizeCanvas(document.getElementById('fmv-canvas-R'));
                if (state.left) renderAll(state, refs);
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