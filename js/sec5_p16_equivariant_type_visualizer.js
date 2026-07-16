// ============================================================
// sec5_p16_equivariant_type_visualizer.js — EqvCore (pure math layer)
//
// SO(3) representation machinery for ml-16. Feature stack of types
// 0 (+) 1 (+) 2, dimension 9 = 1 + 3 + 5:
//   rho0(R) = 1,  rho1(R) = R,  rho2(R)_{ij} = <B_i, R B_j R^T>_F,
// with {B_i} an exact orthonormal basis of traceless symmetric 3x3
// matrices. rho(R) = rho0 (+) rho1 (+) rho2 is 9x9 block diagonal.
//
// v2 rebuild (July 2026) adds the page's CENTRAL THEOREM to the demo:
// Schur's lemma as a weight constraint. An equivariant weight matrix W
// (i.e. W rho(R) = rho(R) W for all R) is forced to the form
//   W = lambda0 (+) lambda1 I_3 (+) lambda2 I_5
// because each irrep appears with multiplicity one and all three are
// absolutely irreducible over R (commutant of each block is R I). The
// demo exposes three W modes — generic / block-diagonal-arbitrary /
// Schur — and the live commutator residual ||rho(R) W - W rho(R)||_F:
// only the Schur form is EXACTLY zero for every R (bitwise: rho * lambda
// and lambda * rho are the same float products).
//
// Certificates: exact ONB construction (1/sqrt2, 1/sqrt6, 2/sqrt6);
// rho2 homomorphism on non-commuting rotations + orthogonality; the
// DEFINING property coeffs(R S R^T) = rho2(R) coeffs(S); Casimir pins
// via FD generators (sum_a drho(J_a)^2 = -l(l+1) I: -2 for l=1, -6 for
// l=2); Schur commutation bitwise-zero; commutant-dimension evidence
// (3 exact Schur generators + 20 seeded off-span directions all break).
// ============================================================

var EqvCore = (function () {
    'use strict';

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

    // ---------- 3x3 (row-major flat) ----------
    function mat3(a, b, c, d, e, f, g, h, i) { return [a, b, c, d, e, f, g, h, i]; }

    function mul3(A, B) {
        var C = new Array(9);
        for (var r = 0; r < 3; r++) {
            for (var c = 0; c < 3; c++) {
                var s = 0;
                for (var k = 0; k < 3; k++) s += A[r * 3 + k] * B[k * 3 + c];
                C[r * 3 + c] = s;
            }
        }
        return C;
    }

    function T3(A) { return [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]]; }

    function det3(A) {
        return A[0] * (A[4] * A[8] - A[5] * A[7])
            - A[1] * (A[3] * A[8] - A[5] * A[6])
            + A[2] * (A[3] * A[7] - A[4] * A[6]);
    }

    function Rx(t) { var c = Math.cos(t), s = Math.sin(t); return mat3(1, 0, 0, 0, c, -s, 0, s, c); }
    function Ry(t) { var c = Math.cos(t), s = Math.sin(t); return mat3(c, 0, s, 0, 1, 0, -s, 0, c); }
    function Rz(t) { var c = Math.cos(t), s = Math.sin(t); return mat3(c, -s, 0, s, c, 0, 0, 0, 1); }
    function R_rpy(roll, pitch, yaw) { return mul3(Rz(yaw), mul3(Ry(pitch), Rx(roll))); }

    // ---------- exact orthonormal basis of traceless symmetric 3x3 ----------
    var S2 = 1 / Math.sqrt(2), S6 = 1 / Math.sqrt(6), T6 = 2 / Math.sqrt(6);
    var ONB2 = [
        mat3(S2, 0, 0, 0, -S2, 0, 0, 0, 0),
        mat3(S6, 0, 0, 0, S6, 0, 0, 0, -T6),
        mat3(0, S2, 0, S2, 0, 0, 0, 0, 0),
        mat3(0, 0, S2, 0, 0, 0, S2, 0, 0),
        mat3(0, 0, 0, 0, 0, S2, 0, S2, 0)
    ];

    function frob(A, B) {
        var s = 0;
        for (var k = 0; k < 9; k++) s += A[k] * B[k];
        return s;
    }

    // coefficients of a traceless symmetric S in the ONB, and back
    function coeffsOf(S) {
        var c = new Array(5);
        for (var i = 0; i < 5; i++) c[i] = frob(ONB2[i], S);
        return c;
    }

    function tensorOf(c) {
        var S = new Array(9).fill(0);
        for (var i = 0; i < 5; i++) {
            for (var k = 0; k < 9; k++) S[k] += c[i] * ONB2[i][k];
        }
        return S;
    }

    // ---------- irreps ----------
    function rho2(R) {
        var Rt = T3(R);
        var D = [];
        for (var i = 0; i < 5; i++) D.push(new Array(5));
        for (var j = 0; j < 5; j++) {
            var Tj = mul3(R, mul3(ONB2[j], Rt));
            for (i = 0; i < 5; i++) D[i][j] = frob(ONB2[i], Tj);
        }
        return D;
    }

    // 9x9 block-diagonal rho(R), flat row-major Float64Array(81).
    // Block ranges: type0 [0,1), type1 [1,4), type2 [4,9).
    function rho9(R) {
        var M = new Float64Array(81);
        M[0] = 1; // rho0
        var i, j;
        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) M[(1 + i) * 9 + (1 + j)] = R[i * 3 + j];
        }
        var D = rho2(R);
        for (i = 0; i < 5; i++) {
            for (j = 0; j < 5; j++) M[(4 + i) * 9 + (4 + j)] = D[i][j];
        }
        return M;
    }

    function blockOf(idx) { return idx < 1 ? 0 : (idx < 4 ? 1 : 2); }

    // ---------- 9x9 helpers ----------
    function mul9(A, B) {
        var C = new Float64Array(81);
        for (var r = 0; r < 9; r++) {
            for (var c = 0; c < 9; c++) {
                var s = 0;
                for (var k = 0; k < 9; k++) s += A[r * 9 + k] * B[k * 9 + c];
                C[r * 9 + c] = s;
            }
        }
        return C;
    }

    function frobNorm9(A) {
        var s = 0;
        for (var k = 0; k < 81; k++) s += A[k] * A[k];
        return Math.sqrt(s);
    }

    // ||rho(R) W - W rho(R)||_F — the equivariance (commutator) residual.
    function commutatorResidual(W, R) {
        var P = rho9(R);
        var A = mul9(P, W), B = mul9(W, P);
        var s = 0;
        for (var k = 0; k < 81; k++) { var d = A[k] - B[k]; s += d * d; }
        return Math.sqrt(s);
    }

    // ---------- weight-matrix builders ----------
    function genericW(seed) {
        var rng = mulberry32(seed);
        var W = new Float64Array(81);
        for (var k = 0; k < 81; k++) W[k] = 2 * rng() - 1;
        return W;
    }

    // block-diagonal, but each block ARBITRARY (this is the mode Schur kills)
    function blockW(seed) {
        var rng = mulberry32(seed);
        var W = new Float64Array(81);
        for (var i = 0; i < 9; i++) {
            for (var j = 0; j < 9; j++) {
                if (blockOf(i) === blockOf(j)) W[i * 9 + j] = 2 * rng() - 1;
            }
        }
        return W;
    }

    // Schur form: lambda0 (+) lambda1 I3 (+) lambda2 I5 — the ONLY
    // equivariant weights for this feature stack.
    function schurW(l0, l1, l2) {
        var W = new Float64Array(81);
        W[0] = l0;
        for (var i = 1; i < 4; i++) W[i * 9 + i] = l1;
        for (i = 4; i < 9; i++) W[i * 9 + i] = l2;
        return W;
    }

    var DEFAULTS = {
        wSeed: 4201,          // Regenerate advances this stream
        rotSeed: 4301,        // Random Rotation stream
        schurLambdas: [1.5, 0.8, -0.6]
    };

    // ---------- self-tests ----------
    function runSelfTests() {
        var failures = [];
        function check(name, cond) { if (!cond) failures.push(name); }
        var TOL = 1e-12;

        // T1: ONB exactness — orthonormal, symmetric, traceless.
        (function () {
            var ok = true;
            for (var i = 0; i < 5; i++) {
                var B = ONB2[i];
                if (Math.abs(B[0] + B[4] + B[8]) > TOL) ok = false;                 // traceless
                if (Math.abs(B[1] - B[3]) > TOL || Math.abs(B[2] - B[6]) > TOL ||
                    Math.abs(B[5] - B[7]) > TOL) ok = false;                        // symmetric
                for (var j = 0; j < 5; j++) {
                    var g = frob(ONB2[i], ONB2[j]);
                    if (Math.abs(g - (i === j ? 1 : 0)) > TOL) ok = false;          // orthonormal
                }
            }
            check('T1 ONB orthonormal symmetric traceless', ok);
        })();

        // T2: rotation matrices — orthogonality, det, 90-degree pins.
        (function () {
            var R = R_rpy(0.7, -0.4, 1.9);
            var RtR = mul3(T3(R), R);
            var ok = true;
            for (var k = 0; k < 9; k++) {
                var expect = (k % 4 === 0) ? 1 : 0; // diagonal of flat 3x3
                if (Math.abs(RtR[k] - expect) > 1e-14) ok = false;
            }
            check('T2 R orthogonal', ok);
            check('T2 det R = 1', Math.abs(det3(R) - 1) < 1e-14);
            var h = Math.PI / 2;
            var rz = Rz(h);
            check('T2 Rz(90) pin', Math.abs(rz[1] - (-1)) < 1e-14 && Math.abs(rz[3] - 1) < 1e-14);
            // convention pin: R_rpy = Rz(yaw) Ry(pitch) Rx(roll) — both
            // compositions are valid rotations, so only a value pin freezes
            // the documented slider convention (mechanically computed).
            var Rp = R_rpy(0.3, 0.5, 0.7);
            check('T2 R_rpy convention pin',
                Math.abs(Rp[0] - 0.67121216615895773) < 1e-14 &&
                Math.abs(Rp[1] - (-0.50708187275444627)) < 1e-14 &&
                Math.abs(Rp[6] - (-0.47942553860420301)) < 1e-14);
        })();

        // T3: rho2 — identity, homomorphism on NON-COMMUTING rotations
        // (catches the anti-homomorphism R^T-conjugation mutant),
        // orthogonality.
        (function () {
            var I5 = rho2(mat3(1, 0, 0, 0, 1, 0, 0, 0, 1));
            var ok = true, i, j;
            for (i = 0; i < 5; i++) {
                for (j = 0; j < 5; j++) {
                    if (Math.abs(I5[i][j] - (i === j ? 1 : 0)) > TOL) ok = false;
                }
            }
            check('T3 rho2(I) = I', ok);
            var R1 = Rx(0.8), R2 = Rz(1.3);        // do not commute
            var lhs = rho2(mul3(R1, R2));
            var A = rho2(R1), B = rho2(R2);
            ok = true;
            for (i = 0; i < 5; i++) {
                for (j = 0; j < 5; j++) {
                    var s = 0;
                    for (var k = 0; k < 5; k++) s += A[i][k] * B[k][j];
                    if (Math.abs(lhs[i][j] - s) > 1e-12) ok = false;
                }
            }
            check('T3 rho2 homomorphism (non-commuting pair)', ok);
            var R = R_rpy(0.5, 1.1, -0.9);
            var D = rho2(R);
            ok = true;
            for (i = 0; i < 5; i++) {
                for (j = 0; j < 5; j++) {
                    var g = 0;
                    for (k = 0; k < 5; k++) g += D[k][i] * D[k][j];
                    if (Math.abs(g - (i === j ? 1 : 0)) > 1e-12) ok = false;
                }
            }
            check('T3 rho2 orthogonal', ok);
        })();

        // T4: the DEFINING property — coeffs(R S R^T) = rho2(R) coeffs(S).
        (function () {
            var rng = mulberry32(17);
            var ok = true;
            for (var trial = 0; trial < 3; trial++) {
                var c = [];
                for (var i = 0; i < 5; i++) c.push(2 * rng() - 1);
                var S = tensorOf(c);
                var R = R_rpy(2 * rng() - 1, 2 * rng() - 1, 2 * rng() - 1);
                var RSRt = mul3(R, mul3(S, T3(R)));
                var lhs = coeffsOf(RSRt);
                var D = rho2(R);
                for (i = 0; i < 5; i++) {
                    var s = 0;
                    for (var j = 0; j < 5; j++) s += D[i][j] * c[j];
                    if (Math.abs(lhs[i] - s) > 1e-12) ok = false;
                }
            }
            check('T4 coeffs(RSR^T) = rho2(R) coeffs(S)', ok);
            // roundtrip
            var c0 = [0.3, -0.7, 0.2, 0.9, -0.4];
            var back = coeffsOf(tensorOf(c0));
            ok = true;
            for (var m = 0; m < 5; m++) if (Math.abs(back[m] - c0[m]) > TOL) ok = false;
            check('T4 coeffs/tensor roundtrip', ok);
        })();

        // T5: Casimir pins via FD generators: sum_a drho(J_a)^2 = -l(l+1) I.
        // Gradients (of the group action in t) exist, so the FD requirement
        // applies here in generator form. l=1: -2 I; l=2: -6 I.
        (function () {
            var h = 1e-5;
            function gen(rhoFn, dim, axisFn) {
                var P = rhoFn(axisFn(h)), M = rhoFn(axisFn(-h));
                var G = [];
                for (var i = 0; i < dim; i++) {
                    G.push(new Array(dim));
                    for (var j = 0; j < dim; j++) G[i][j] = (P[i][j] - M[i][j]) / (2 * h);
                }
                return G;
            }
            function addSq(C, G, dim) {
                for (var i = 0; i < dim; i++) {
                    for (var j = 0; j < dim; j++) {
                        var s = 0;
                        for (var k = 0; k < dim; k++) s += G[i][k] * G[k][j];
                        C[i][j] += s;
                    }
                }
            }
            function casimir(rhoFn, dim) {
                var C = [];
                for (var i = 0; i < dim; i++) C.push(new Array(dim).fill(0));
                addSq(C, gen(rhoFn, dim, Rx), dim);
                addSq(C, gen(rhoFn, dim, Ry), dim);
                addSq(C, gen(rhoFn, dim, Rz), dim);
                return C;
            }
            function rho1n(R) {
                return [[R[0], R[1], R[2]], [R[3], R[4], R[5]], [R[6], R[7], R[8]]];
            }
            var C1 = casimir(rho1n, 3);
            var C2 = casimir(rho2, 5);
            var ok1 = true, ok2 = true, i, j;
            for (i = 0; i < 3; i++) {
                for (j = 0; j < 3; j++) {
                    if (Math.abs(C1[i][j] - (i === j ? -2 : 0)) > 1e-6) ok1 = false;
                }
            }
            for (i = 0; i < 5; i++) {
                for (j = 0; j < 5; j++) {
                    if (Math.abs(C2[i][j] - (i === j ? -6 : 0)) > 1e-6) ok2 = false;
                }
            }
            check('T5 Casimir l=1 is -2 I', ok1);
            check('T5 Casimir l=2 is -6 I', ok2);
        })();

        // T6: rho9 block structure + homomorphism + orthogonality.
        (function () {
            var R = R_rpy(0.9, 0.3, -1.2);
            var P = rho9(R);
            var ok = true, i, j;
            for (i = 0; i < 9; i++) {
                for (j = 0; j < 9; j++) {
                    if (blockOf(i) !== blockOf(j) && P[i * 9 + j] !== 0) ok = false;
                }
            }
            check('T6 rho9 off-blocks exactly zero', ok);
            check('T6 rho9(I) = I', (function () {
                var I = rho9(mat3(1, 0, 0, 0, 1, 0, 0, 0, 1));
                for (var k = 0; k < 81; k++) {
                    var e = (k % 10 === 0) ? 1 : 0;
                    if (Math.abs(I[k] - e) > TOL) return false;
                }
                return true;
            })());
            var R1 = Rx(0.6), R2 = Ry(-1.1);
            var lhs = rho9(mul3(R1, R2));
            var rhs = mul9(rho9(R1), rho9(R2));
            var worst = 0;
            for (var k = 0; k < 81; k++) worst = Math.max(worst, Math.abs(lhs[k] - rhs[k]));
            check('T6 rho9 homomorphism', worst < 1e-12);
        })();

        // T7: Schur form commutes BITWISE-EXACTLY, for several R.
        (function () {
            var W = schurW(1.5, 0.8, -0.6);
            var rng = mulberry32(23);
            var ok = true;
            for (var trial = 0; trial < 5; trial++) {
                var R = R_rpy(6 * rng() - 3, 6 * rng() - 3, 6 * rng() - 3);
                if (commutatorResidual(W, R) !== 0) ok = false;
            }
            check('T7 Schur W commutes exactly (bitwise zero)', ok);
        })();

        // T8: story + commutant-dimension evidence. Generic and
        // block-arbitrary W both break equivariance (measured margins);
        // 20 seeded directions orthogonal to the Schur span all break too —
        // together with T7's three exact generators this is the numerical
        // face of "commutant dimension = 3".
        (function () {
            var R = R_rpy(0.8, -0.5, 1.4);
            var g = commutatorResidual(genericW(DEFAULTS.wSeed), R);
            var b = commutatorResidual(blockW(DEFAULTS.wSeed), R);
            check('T8 generic W breaks (>1)', g > 1);
            check('T8 block-arbitrary W breaks (>0.5)', b > 0.5);
            // blockW SPEC pin: off-block entries exactly zero (a leak would
            // silently turn the mode into generic W)
            var BW = blockW(DEFAULTS.wSeed);
            var spec = true;
            for (var ii = 0; ii < 9; ii++) {
                for (var jj = 0; jj < 9; jj++) {
                    if (blockOf(ii) !== blockOf(jj) && BW[ii * 9 + jj] !== 0) spec = false;
                }
            }
            check('T8 blockW off-block exactly zero (spec)', spec);
            var rng = mulberry32(97);
            var ok = true;
            for (var trial = 0; trial < 20; trial++) {
                var W = new Float64Array(81);
                for (var k = 0; k < 81; k++) W[k] = 2 * rng() - 1;
                // project OUT the Schur span (orthonormal directions:
                // E0 = e_00; E1 = I3-block / sqrt(3); E2 = I5-block / sqrt(5))
                var a0 = W[0];
                var a1 = 0, a2 = 0, i;
                for (i = 1; i < 4; i++) a1 += W[i * 9 + i];
                for (i = 4; i < 9; i++) a2 += W[i * 9 + i];
                a1 /= 3; a2 /= 5;
                W[0] -= a0;
                for (i = 1; i < 4; i++) W[i * 9 + i] -= a1;
                for (i = 4; i < 9; i++) W[i * 9 + i] -= a2;
                if (commutatorResidual(W, R) < 0.1) ok = false;
            }
            check('T8 off-Schur directions all break (>0.1, 20 seeds)', ok);
        })();

        // T9: RNG determinism.
        (function () {
            var a = genericW(5), b = genericW(5);
            var same = true;
            for (var k = 0; k < 81; k++) if (a[k] !== b[k]) same = false;
            check('T9 seeded determinism', same);
        })();

        return { passed: failures.length === 0, failures: failures };
    }

    return {
        mulberry32: mulberry32,
        mat3: mat3, mul3: mul3, T3: T3, det3: det3,
        Rx: Rx, Ry: Ry, Rz: Rz, R_rpy: R_rpy,
        ONB2: ONB2, frob: frob,
        coeffsOf: coeffsOf, tensorOf: tensorOf,
        rho2: rho2, rho9: rho9, blockOf: blockOf,
        mul9: mul9, frobNorm9: frobNorm9,
        commutatorResidual: commutatorResidual,
        genericW: genericW, blockW: blockW, schurW: schurW,
        DEFAULTS: DEFAULTS,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = EqvCore; }
// ============================================================
// UI layer (#equivariant_demo, prefix eqv-)
// Left: three.js geometry (scalar / vector / type-2 ellipsoid) under one
// rotation R. Right: rho(R) block grid, the NEW weight card enacting
// Schur's lemma (Generic / Block-diagonal / Schur modes with the live
// commutator residual ||rho(R)W - W rho(R)||_F), and the R controls.
// Self-test gate runs BEFORE the three.js CDN fetch (vae precedent).
// Dark island: fixed palette; no var(--), no data-theme/currentColor.
// ============================================================

(function () {
    'use strict';

    var C = {
        bg: 'rgba(20,28,40,0.95)',
        cardBg: 'rgba(0,0,0,0.3)',
        border: 'rgba(255,255,255,0.1)',
        text: '#e8eaed',
        dim: 'rgba(255,255,255,0.55)',
        accent: '#64b4ff',
        good: '#66bb6a',
        bad: '#ef5350',
        t0: '#9aa5b1', t1: '#42a5f5', t2: '#f39c12',
        posR: 239, posG: 83, posB: 80,     // heatmap positive (red)
        negR: 66, negG: 165, negB: 245,    // heatmap negative (blue)
        zeroBg: '#10161f'
    };

    function heatColor(v, vmax) {
        var t = Math.max(-1, Math.min(1, v / vmax));
        var r, g, b;
        if (t >= 0) { r = 22 + (C.posR - 22) * t; g = 30 + (C.posG - 30) * t; b = 44 + (C.posB - 44) * t; }
        else { var u = -t; r = 22 + (C.negR - 22) * u; g = 30 + (C.negG - 30) * u; b = 44 + (C.negB - 44) * u; }
        return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
    }

    // ---------- CSS ----------
    function injectCSS() {
        if (document.getElementById('eqv-style')) return;
        var css = '' +
            '#equivariant_demo .eqv-container{color:' + C.text + ';' +
            'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}' +
            '#equivariant_demo .eqv-layout{display:flex;flex-direction:column;gap:16px;}' +
            '@media(min-width:992px){#equivariant_demo .eqv-layout{flex-direction:row;}' +
            '#equivariant_demo .eqv-canvas-area{flex:1;}' +
            '#equivariant_demo .eqv-panel{flex:1;max-width:480px;}}' +
            '#equivariant_demo .eqv-canvas-area,#equivariant_demo .eqv-panel{' +
            'background:' + C.bg + ';padding:14px;border-radius:8px;border:1px solid ' + C.border + ';}' +
            '#equivariant_demo #eqv-three{width:100%;height:420px;border:1px solid rgba(255,255,255,0.15);' +
            'border-radius:8px;background:linear-gradient(135deg,#0a0f18 0%,#0f1419 100%);}' +
            '#equivariant_demo .eqv-instruction{text-align:center;margin-bottom:8px;font-size:0.86rem;color:' + C.dim + ';}' +
            '#equivariant_demo .eqv-legend{margin-top:8px;display:flex;gap:14px;font-size:0.78rem;color:' + C.dim + ';' +
            'justify-content:center;flex-wrap:wrap;}' +
            '#equivariant_demo .eqv-legend-item{display:flex;align-items:center;gap:5px;}' +
            '#equivariant_demo .eqv-dot{width:11px;height:11px;border-radius:50%;display:inline-block;}' +
            '#equivariant_demo .eqv-card{background:' + C.cardBg + ';border:1px solid ' + C.border + ';' +
            'border-radius:8px;padding:12px;margin-bottom:12px;}' +
            '#equivariant_demo .eqv-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}' +
            '#equivariant_demo .eqv-card-title{font-weight:600;font-size:0.86rem;color:' + C.accent + ';}' +
            '#equivariant_demo .eqv-card-size{font-size:0.7rem;color:' + C.dim + ';' +
            'background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:3px;}' +
            '#equivariant_demo .eqv-grid{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;' +
            'width:100%;max-width:330px;margin:0 auto;}' +
            '#equivariant_demo .eqv-cell{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;' +
            'font-family:ui-monospace,Consolas,monospace;font-size:0.5rem;border-radius:2px;color:rgba(255,255,255,0.28);}' +
            '#equivariant_demo .eqv-grid-note{margin-top:6px;font-size:0.72rem;color:' + C.dim + ';text-align:center;}' +
            '#equivariant_demo .eqv-modes{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}' +
            '#equivariant_demo .eqv-mode-btn{flex:1;background:transparent;color:' + C.dim + ';' +
            'border:1px solid ' + C.border + ';border-radius:6px;padding:5px 8px;font-size:0.78rem;cursor:pointer;min-width:90px;}' +
            '#equivariant_demo .eqv-mode-btn.active{border-color:' + C.accent + ';color:' + C.text + ';' +
            'background:rgba(100,180,255,0.12);}' +
            '#equivariant_demo .eqv-resid{margin-top:10px;padding:8px;border-radius:6px;border:1px solid ' + C.border + ';' +
            'font-family:ui-monospace,Consolas,monospace;font-size:0.82rem;text-align:center;}' +
            '#equivariant_demo .eqv-resid.good{color:' + C.good + ';}' +
            '#equivariant_demo .eqv-resid.bad{color:' + C.bad + ';}' +
            '#equivariant_demo .eqv-resid.idle{color:' + C.dim + ';}' +
            '#equivariant_demo .eqv-slider-row{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:0.82rem;}' +
            '#equivariant_demo .eqv-slider-row label{width:64px;color:' + C.dim + ';}' +
            '#equivariant_demo .eqv-slider-row input{flex:1;}' +
            '#equivariant_demo .eqv-slider-row span{width:44px;text-align:right;font-family:ui-monospace,Consolas,monospace;}' +
            '#equivariant_demo .eqv-btn-row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}' +
            '#equivariant_demo .eqv-btn{flex:1;background:transparent;border-radius:6px;padding:6px 10px;' +
            'font-size:0.8rem;cursor:pointer;min-width:120px;}' +
            '#equivariant_demo .eqv-btn.pri{color:' + C.accent + ';border:1px solid ' + C.accent + ';}' +
            '#equivariant_demo .eqv-btn.sec{color:' + C.dim + ';border:1px solid ' + C.border + ';}' +
            '#equivariant_demo .eqv-insight{margin-top:4px;border:1px solid rgba(66,165,245,0.2);border-radius:8px;' +
            'padding:10px;font-size:0.79rem;line-height:1.45;color:rgba(255,255,255,0.82);}' +
            '#equivariant_demo .eqv-refusal{border:1px solid ' + C.bad + ';border-radius:8px;padding:14px;color:' + C.bad + ';}' +
            '#equivariant_demo .eqv-refusal ul{margin:8px 0 0 18px;padding:0;}';
        var style = document.createElement('style');
        style.id = 'eqv-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ---------- HTML ----------
    function buildHTML(container) {
        container.innerHTML =
            '<div class="eqv-container"><div class="eqv-layout">' +
            '<div class="eqv-canvas-area">' +
            '<div class="eqv-instruction">Move the <strong>Roll / Pitch / Yaw</strong> sliders to set the rotation <em>R</em>. ' +
            'Watch each type respond to the <em>same</em> rotation in its own way.</div>' +
            '<div id="eqv-three"></div>' +
            '<div class="eqv-legend">' +
            '<div class="eqv-legend-item"><span class="eqv-dot" style="background:' + C.t0 + '"></span> type-0 scalar (fixed)</div>' +
            '<div class="eqv-legend-item"><span class="eqv-dot" style="background:' + C.t1 + '"></span> type-1 vector</div>' +
            '<div class="eqv-legend-item"><span class="eqv-dot" style="background:' + C.t2 + '"></span> type-2 ellipsoid</div>' +
            '</div></div>' +
            '<div class="eqv-panel">' +
            // rho(R) card
            '<div class="eqv-card"><div class="eqv-card-head">' +
            '<span class="eqv-card-title">Group action &nbsp;&rho;(R) = &rho;<sub>0</sub> &oplus; &rho;<sub>1</sub> &oplus; &rho;<sub>2</sub></span>' +
            '<span class="eqv-card-size">9&times;9</span></div>' +
            '<div class="eqv-grid" id="eqv-grid-rho"></div>' +
            '<div class="eqv-grid-note">off-block entries &equiv; 0 for every R &mdash; types never mix</div></div>' +
            // W card (Schur's lemma)
            '<div class="eqv-card"><div class="eqv-card-head">' +
            '<span class="eqv-card-title">Weight matrix W &mdash; Schur&#39;s lemma as a constraint</span>' +
            '<span class="eqv-card-size">9&times;9</span></div>' +
            '<div class="eqv-modes">' +
            '<button class="eqv-mode-btn" id="eqv-mode-generic">Generic W</button>' +
            '<button class="eqv-mode-btn" id="eqv-mode-block">Block-diagonal W</button>' +
            '<button class="eqv-mode-btn active" id="eqv-mode-schur">Schur: &lambda;&#8320; &oplus; &lambda;&#8321;I&#8323; &oplus; &lambda;&#8322;I&#8325;</button>' +
            '</div>' +
            '<div class="eqv-grid" id="eqv-grid-w"></div>' +
            '<div class="eqv-grid-note">red positive &middot; blue negative &middot; dark = exactly zero</div>' +
            '<div class="eqv-resid idle" id="eqv-resid"></div>' +
            '<div class="eqv-btn-row"><button class="eqv-btn sec" id="eqv-regen">&#8635; New random W</button></div>' +
            '</div>' +
            // rotation controls
            '<div class="eqv-card"><div class="eqv-card-title" style="margin-bottom:6px;">Rotation R &isin; SO(3)</div>' +
            '<div class="eqv-slider-row"><label>Roll (X)</label>' +
            '<input type="range" id="eqv-roll" min="-180" max="180" step="1" value="0"><span id="eqv-roll-v">0&deg;</span></div>' +
            '<div class="eqv-slider-row"><label>Pitch (Y)</label>' +
            '<input type="range" id="eqv-pitch" min="-180" max="180" step="1" value="0"><span id="eqv-pitch-v">0&deg;</span></div>' +
            '<div class="eqv-slider-row"><label>Yaw (Z)</label>' +
            '<input type="range" id="eqv-yaw" min="-180" max="180" step="1" value="0"><span id="eqv-yaw-v">0&deg;</span></div>' +
            '<div class="eqv-btn-row">' +
            '<button class="eqv-btn sec" id="eqv-reset">Reset to Identity</button>' +
            '<button class="eqv-btn pri" id="eqv-random">Random Rotation</button></div></div>' +
            '<div class="eqv-insight"><span id="eqv-insight-text"></span></div>' +
            '</div></div></div>';
    }

    function renderRefusal(container, failures) {
        injectCSS();
        var items = '';
        for (var i = 0; i < failures.length; i++) items += '<li>' + failures[i] + '</li>';
        container.innerHTML =
            '<div class="eqv-refusal"><strong>Demo disabled: mathematical self-tests failed.</strong>' +
            '<ul>' + items + '</ul>' +
            '<p>The demo refuses to render rather than display unverified quantities.</p></div>';
    }

    // ---------- grids ----------
    function buildGrid(el) {
        var cells = [];
        for (var i = 0; i < 9; i++) {
            cells.push([]);
            for (var j = 0; j < 9; j++) {
                var d = document.createElement('div');
                d.className = 'eqv-cell';
                el.appendChild(d);
                cells[i].push(d);
            }
        }
        return cells;
    }

    function paintMatrix(cells, M, vmax) {
        for (var i = 0; i < 9; i++) {
            for (var j = 0; j < 9; j++) {
                var v = M[i * 9 + j];
                var cell = cells[i][j];
                if (v === 0) {
                    cell.style.background = C.zeroBg;
                    cell.textContent = '0';
                } else {
                    cell.style.background = heatColor(v, vmax);
                    cell.textContent = '';
                }
            }
        }
    }

    var INSIGHTS = {
        schur: 'Schur mode: W = \u03BB\u2080 \u2295 \u03BB\u2081I\u2083 \u2295 \u03BB\u2082I\u2085 \u2014 one scalar per type. ' +
            'The residual is exactly zero for every R: this is the ONLY shape an equivariant weight can take here.',
        block: 'Block-diagonal is NOT enough. These blocks respect the type boundaries, yet an arbitrary 3\u00D73 or ' +
            '5\u00D75 block still fails to commute with \u03C1(R) \u2014 Schur\u2019s lemma forces each block all the way down to \u03BBI.',
        generic: 'A generic W mixes types and breaks equivariance badly \u2014 rotate R and watch the residual. ' +
            'Compare with the other two modes.'
    };

    // ---------- init ----------
    function init() {
        var container = document.getElementById('equivariant_demo');
        if (!container) return;
        if (container.dataset.eqvInit) return; // idempotency guard
        container.dataset.eqvInit = '1';

        // SELF-TEST GATE — runs BEFORE anything renders and BEFORE the
        // three.js CDN fetch: broken math must refuse first.
        var gate = EqvCore.runSelfTests();
        if (!gate.passed) {
            renderRefusal(container, gate.failures);
            return;
        }

        injectCSS();
        buildHTML(container);

        var refs = {
            gridRho: buildGrid(document.getElementById('eqv-grid-rho')),
            gridW: buildGrid(document.getElementById('eqv-grid-w')),
            resid: document.getElementById('eqv-resid'),
            insight: document.getElementById('eqv-insight-text'),
            roll: document.getElementById('eqv-roll'),
            pitch: document.getElementById('eqv-pitch'),
            yaw: document.getElementById('eqv-yaw'),
            rollV: document.getElementById('eqv-roll-v'),
            pitchV: document.getElementById('eqv-pitch-v'),
            yawV: document.getElementById('eqv-yaw-v'),
            modeBtns: {
                generic: document.getElementById('eqv-mode-generic'),
                block: document.getElementById('eqv-mode-block'),
                schur: document.getElementById('eqv-mode-schur')
            },
            regen: document.getElementById('eqv-regen'),
            reset: document.getElementById('eqv-reset'),
            random: document.getElementById('eqv-random')
        };

        var D = EqvCore.DEFAULTS;
        var state = {
            roll: 0, pitch: 0, yaw: 0,
            mode: 'schur',
            wSeed: D.wSeed,
            rotRng: EqvCore.mulberry32(D.rotSeed),
            three: null
        };

        function currentR() {
            var d = Math.PI / 180;
            return EqvCore.R_rpy(state.roll * d, state.pitch * d, state.yaw * d);
        }

        function currentW() {
            if (state.mode === 'generic') return EqvCore.genericW(state.wSeed);
            if (state.mode === 'block') return EqvCore.blockW(state.wSeed);
            var L = D.schurLambdas;
            return EqvCore.schurW(L[0], L[1], L[2]);
        }

        function renderAll() {
            var R = currentR();
            var W = currentW();
            paintMatrix(refs.gridRho, EqvCore.rho9(R), 1);
            var wmax = 0;
            for (var k = 0; k < 81; k++) wmax = Math.max(wmax, Math.abs(W[k]));
            paintMatrix(refs.gridW, W, wmax || 1);
            var resid = EqvCore.commutatorResidual(W, R);
            var el = refs.resid;
            // Display tiers: schurW commutes BITWISE (resid === 0 for every
            // R); other modes at R = I give float noise ~1e-16 (rho2(I)
            // diagonal is 0.999... from squaring 1/sqrt(6)) — shown as a
            // numerical zero with the rotate hint, never as a violation.
            if (state.mode === 'schur' && resid === 0) {
                el.className = 'eqv-resid good';
                el.textContent = '\u2016\u03C1(R)W \u2212 W\u03C1(R)\u2016 = 0 (exact, for every R)';
            } else if (resid < 1e-10) {
                el.className = 'eqv-resid idle';
                el.textContent = '\u2016\u03C1(R)W \u2212 W\u03C1(R)\u2016 \u2248 0 \u2014 \u03C1(I) commutes with everything; rotate R to test';
            } else {
                el.className = 'eqv-resid bad';
                el.textContent = '\u2016\u03C1(R)W \u2212 W\u03C1(R)\u2016 = ' + resid.toFixed(4) + ' \u2014 not equivariant';
            }
            refs.insight.textContent = INSIGHTS[state.mode];
            refs.rollV.textContent = state.roll + '\u00B0';
            refs.pitchV.textContent = state.pitch + '\u00B0';
            refs.yawV.textContent = state.yaw + '\u00B0';
            refs.roll.value = String(state.roll);
            refs.pitch.value = String(state.pitch);
            refs.yaw.value = String(state.yaw);
            refs.modeBtns.generic.className = 'eqv-mode-btn' + (state.mode === 'generic' ? ' active' : '');
            refs.modeBtns.block.className = 'eqv-mode-btn' + (state.mode === 'block' ? ' active' : '');
            refs.modeBtns.schur.className = 'eqv-mode-btn' + (state.mode === 'schur' ? ' active' : '');
            if (state.three) state.three.update(R);
        }

        // ---- handlers ----
        function bindSlider(input, key) {
            input.addEventListener('input', function () {
                state[key] = parseInt(input.value, 10) || 0;
                renderAll();
            });
        }
        bindSlider(refs.roll, 'roll');
        bindSlider(refs.pitch, 'pitch');
        bindSlider(refs.yaw, 'yaw');

        Object.keys(refs.modeBtns).forEach(function (m) {
            refs.modeBtns[m].addEventListener('click', function () {
                state.mode = m;
                renderAll();
            });
        });

        refs.regen.addEventListener('click', function () {
            state.wSeed += 1; // documented seed-stream advance
            renderAll();
        });

        refs.reset.addEventListener('click', function () {
            state.roll = 0; state.pitch = 0; state.yaw = 0;
            renderAll();
        });

        refs.random.addEventListener('click', function () {
            state.roll = Math.round(360 * state.rotRng() - 180);
            state.pitch = Math.round(360 * state.rotRng() - 180);
            state.yaw = Math.round(360 * state.rotRng() - 180);
            renderAll();
        });

        renderAll();

        // ---- three.js (loaded AFTER the gate; r128 core, fixed camera) ----
        function initThree() {
            var mount = document.getElementById('eqv-three');
            if (!mount || !window.THREE) return;
            var W0 = mount.clientWidth || 600, H0 = 420;
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(45, W0 / H0, 0.1, 100);
            camera.position.set(3.2, 2.2, 3.6);
            camera.lookAt(0, 0, 0);
            var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(W0, H0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            mount.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xffffff, 0.65));
            var dl = new THREE.DirectionalLight(0xffffff, 0.7);
            dl.position.set(4, 6, 5);
            scene.add(dl);

            function axis(dir, color) {
                var m = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.22 });
                var g = new THREE.BufferGeometry().setFromPoints(
                    [new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(2.4)]);
                scene.add(new THREE.Line(g, m));
            }
            axis(new THREE.Vector3(1, 0, 0), 0xff6666);
            axis(new THREE.Vector3(0, 1, 0), 0x66ff99);
            axis(new THREE.Vector3(0, 0, 1), 0x6699ff);

            var t0 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24),
                new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 0.5 }));
            scene.add(t0);

            var v0 = new THREE.Vector3(0, 0, 1.6);
            var t1 = new THREE.ArrowHelper(v0.clone().normalize(), new THREE.Vector3(0, 0, 0),
                v0.length(), 0x42a5f5, 0.34, 0.20);
            scene.add(t1);

            var eig = [Math.sqrt(2) * 0.9, Math.sqrt(1) * 0.9, Math.sqrt(3) * 0.9];
            var t2 = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28),
                new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.45, metalness: 0.1, transparent: true, opacity: 0.85 }));
            t2.scale.set(eig[0], eig[1], eig[2]);
            scene.add(t2);
            var t2wire = new THREE.Mesh(new THREE.SphereGeometry(1.001, 16, 12),
                new THREE.MeshBasicMaterial({ color: 0xffcf7a, wireframe: true, transparent: true, opacity: 0.18 }));
            t2wire.scale.copy(t2.scale);
            scene.add(t2wire);

            function toMatrix4(R) {
                var m = new THREE.Matrix4();
                m.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1);
                return m;
            }

            state.three = {
                update: function (R) {
                    var M = toMatrix4(R);
                    var v = v0.clone().applyMatrix4(M);
                    t1.setDirection(v.clone().normalize());
                    t1.setLength(v.length(), 0.34, 0.20);
                    t2.setRotationFromMatrix(M);
                    t2wire.setRotationFromMatrix(M);
                    renderer.render(scene, camera);
                }
            };
            state.three.update(currentR());

            var resizePending = false;
            window.addEventListener('resize', function () {
                if (resizePending) return;
                resizePending = true;
                setTimeout(function () {
                    resizePending = false;
                    var w = mount.clientWidth || 600;
                    camera.aspect = w / H0;
                    camera.updateProjectionMatrix();
                    renderer.setSize(w, H0);
                    state.three.update(currentR());
                }, 100);
            });
        }

        if (window.THREE) {
            initThree();
        } else {
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            s.onload = initThree;
            document.head.appendChild(s);
        }
    }

    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();