// ============================================================================
// SvdCore — math core for the SVD Visualizer (linalg-9)
// DOM-free, Node-requirable. 2x2 matrices as [[a,b],[c,d]].
//
// Decomposition strategy (robust by construction):
//   V is ALWAYS a rotation R(theta), theta = atan2(2b, a-c)/2 computed from
//   the symmetric matrix A^T A = [[a,b],[b,c]] — orthonormal with det +1 by
//   construction. The singular values are computed BY DEFINITION as
//   sigma_i = ||A v_i|| (D-singular_values), and the pair is sorted by
//   rotating theta a quarter turn when needed (preserving det V = +1).
//   This structurally eliminates the v1 pairing bug (diagonal A with a < c
//   produced a non-unit u_1 and a broken factorization).
//   u_i = A v_i / sigma_i for sigma_i above tolerance; otherwise U is
//   completed to an orthonormal basis with the perpendicular of u_1
//   (the "extend to an orthonormal basis" step of the SVD proof).
// All displayed values (U, S, V, rank, kappa, A-dagger, effective rank)
// come from this core and are certified by runSelfTests().
// ============================================================================
var SvdCore = (function () {
  'use strict';

  // ---------- seeded RNG (mulberry32) ----------
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 2x2 / vector helpers ----------
  function matVec2(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1],
            M[1][0] * v[0] + M[1][1] * v[1]];
  }
  function matMul2(A, B) {
    return [
      [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
      [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
    ];
  }
  function transpose2(M) { return [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]; }
  function det2(M) { return M[0][0] * M[1][1] - M[0][1] * M[1][0]; }
  function norm2v(v) { return Math.hypot(v[0], v[1]); }
  function maxAbs2(M) {
    return Math.max(Math.abs(M[0][0]), Math.abs(M[0][1]), Math.abs(M[1][0]), Math.abs(M[1][1]));
  }
  function matDiff2(A, B) {
    var m = 0;
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      m = Math.max(m, Math.abs(A[i][j] - B[i][j]));
    }
    return m;
  }
  // closed-form inverse (independent verification route for the self-tests)
  function inverse2(M) {
    var d = det2(M);
    var s = maxAbs2(M);
    if (Math.abs(d) <= 1e-12 * Math.max(1, s * s)) return { ok: false };
    return { ok: true, inv: [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]] };
  }

  // ---------- SVD ----------
  function decompose(A) {
    var scaleA = maxAbs2(A);
    // A^T A = [[p, q], [q, r]] (symmetric)
    var At = transpose2(A);
    var AtA = matMul2(At, A);
    var p = AtA[0][0], q = AtA[0][1], r = AtA[1][1];
    var theta = 0.5 * Math.atan2(2 * q, p - r);
    var v1 = [Math.cos(theta), Math.sin(theta)];
    var v2 = [-Math.sin(theta), Math.cos(theta)];
    // sigma by definition: sigma_i = ||A v_i||
    var Av1 = matVec2(A, v1), Av2 = matVec2(A, v2);
    var s1 = norm2v(Av1), s2 = norm2v(Av2);
    if (s2 > s1) {
      // NOTE: theta = atan2(2q, p-r)/2 provably pairs v1 with the LARGER
      // eigenvalue of A^T A (v1^T (A^T A) v1 = m + h = lambda_max in exact
      // arithmetic), so this branch is reachable only at floating-point
      // ties (s1 ~ s2). It is kept as tie defense; mutants inside it are
      // documented equivalents.
      // quarter-turn rotation swaps the pair while keeping det V = +1
      theta += Math.PI / 2;
      v1 = [Math.cos(theta), Math.sin(theta)];
      v2 = [-Math.sin(theta), Math.cos(theta)];
      Av1 = matVec2(A, v1); Av2 = matVec2(A, v2);
      s1 = norm2v(Av1); s2 = norm2v(Av2);
    }
    if (theta > Math.PI) theta -= 2 * Math.PI;

    var tolZero = 1e-12 * Math.max(1, scaleA);
    var tolRank = 1e-10 * Math.max(1, s1);
    var u1, u2, rank;
    if (s1 <= tolZero) {
      // zero matrix: conventions U = V = I
      rank = 0;
      theta = 0;
      v1 = [1, 0]; v2 = [0, 1];
      u1 = [1, 0]; u2 = [0, 1];
      s1 = 0; s2 = 0;
    } else {
      u1 = [Av1[0] / s1, Av1[1] / s1];
      if (s2 <= tolRank) {
        rank = 1;
        u2 = [-u1[1], u1[0]]; // orthonormal completion
      } else {
        rank = 2;
        u2 = [Av2[0] / s2, Av2[1] / s2];
      }
    }
    var U = [[u1[0], u2[0]], [u1[1], u2[1]]]; // columns u1, u2
    var V = [[v1[0], v2[0]], [v1[1], v2[1]]]; // columns v1, v2
    var kappa = rank === 2 ? s1 / s2 : (rank === 1 ? Infinity : null);
    return {
      ok: true,
      U: U, S: [s1, s2], V: V,
      thetaV: theta,
      rank: rank,
      kappa: kappa,
      detU: det2(U), detV: det2(V)
    };
  }

  function reconstruct(U, S, V) {
    // U diag(S) V^T
    var US = [[U[0][0] * S[0], U[0][1] * S[1]], [U[1][0] * S[0], U[1][1] * S[1]]];
    return matMul2(US, transpose2(V));
  }

  // ---------- pseudo-inverse via SVD with truncation tolerance ----------
  // A-dagger = V diag(sdag) U^T, with sdag_i = 1/sigma_i when sigma_i >= eps
  // and 0 otherwise (truncated SVD; the page's "Practical Note").
  function pseudoInverse(A, eps) {
    var d = decompose(A);
    var e = (eps === undefined || eps === null)
      ? 1e-10 * Math.max(1, d.S[0])
      : eps;
    var sdag = [d.S[0] >= e && d.S[0] > 0 ? 1 / d.S[0] : 0,
                d.S[1] >= e && d.S[1] > 0 ? 1 / d.S[1] : 0];
    var effRank = (sdag[0] > 0 ? 1 : 0) + (sdag[1] > 0 ? 1 : 0);
    // A-dagger = V diag(sdag) U^T = reconstruct(V, sdag, U)
    var Adag = reconstruct(d.V, sdag, d.U);
    return { ok: true, Adag: Adag, effRank: effRank, S: d.S, eps: e, svd: d };
  }

  // ---------- presets (single source; UI builds the buttons from this) ----------
  var SQ2 = Math.SQRT1_2;
  // rotation preset uses 4-decimal entries so the input cells stay readable;
  // sigma = 0.99997 ~ 1 and the T8 orthogonality pin allows 1e-4
  var PRESETS = [
    { key: 'symmetric',    label: 'Symmetric',      m: [[3, 1], [1, 2]] },
    { key: 'identity',     label: 'Identity',       m: [[1, 0], [0, 1]] },
    { key: 'scaling',      label: 'Scaling',        m: [[2, 0], [0, 0.5]] },
    { key: 'rotation45',   label: 'Rotation 45\u00B0', m: [[0.7071, -0.7071], [0.7071, 0.7071]] },
    { key: 'shear',        label: 'Shear',          m: [[1, 1], [0, 1]] },
    { key: 'reflection',   label: 'Reflection',     m: [[-1, 0], [0, 1]] },
    { key: 'nearSingular', label: 'Near-singular',  m: [[1, 2], [2, 4.01]] },
    { key: 'singular',     label: 'Singular',       m: [[1, 2], [2, 4]] }
  ];
  function presetByKey(key) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].key === key) return PRESETS[i];
    return null;
  }

  // ---------- entry parsing (no silent zeros) ----------
  function parseEntry(s) {
    if (typeof s !== 'string') return { ok: false };
    var t = s.trim();
    if (t === '') return { ok: false };
    var v = Number(t);
    if (!isFinite(v)) return { ok: false };
    return { ok: true, value: v };
  }

  // ==========================================================================
  // Self-tests
  // ==========================================================================
  function runSelfTests() {
    var failures = [];
    var count = 0;
    function check(name, cond, detail) {
      count++;
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    function vClose(u, v, tol) {
      return Math.abs(u[0] - v[0]) <= tol && Math.abs(u[1] - v[1]) <= tol;
    }
    function mClose(A, B, tol) { return matDiff2(A, B) <= tol; }
    function colOf(M, j) { return [M[0][j], M[1][j]]; }
    function isOrthonormal(M, tol) {
      var G = matMul2(transpose2(M), M);
      return matDiff2(G, [[1, 0], [0, 1]]) <= tol;
    }
    function frob2(A) {
      return A[0][0] * A[0][0] + A[0][1] * A[0][1] + A[1][0] * A[1][0] + A[1][1] * A[1][1];
    }
    function randMat(rng) {
      return [[4 * rng() - 2, 4 * rng() - 2], [4 * rng() - 2, 4 * rng() - 2]];
    }

    // ---- T1: helpers ----
    check('T1 matVec2 pin', vClose(matVec2([[1, 2], [3, 4]], [1, 1]), [3, 7], 0));
    check('T1 matMul2 pin', mClose(matMul2([[1, 2], [3, 4]], [[0, 1], [1, 0]]), [[2, 1], [4, 3]], 0));
    check('T1 transpose2 pin', mClose(transpose2([[1, 2], [3, 4]]), [[1, 3], [2, 4]], 0));
    check('T1 det2 pin', det2([[3, 1], [1, 2]]) === 5);
    var inv = inverse2([[3, 1], [1, 2]]);
    check('T1 inverse2 pin', inv.ok && mClose(inv.inv, [[0.4, -0.2], [-0.2, 0.6]], 1e-15));
    check('T1 inverse2 flags singular', inverse2([[1, 2], [2, 4]]).ok === false);

    // ---- T2: decomposition properties (seeded) ----
    var rng2 = makeRng(40001);
    for (var t2 = 0; t2 < 30; t2++) {
      var A2 = randMat(rng2);
      var d2 = decompose(A2);
      var sc = 1 + maxAbs2(A2);
      check('T2 U orthonormal #' + t2, isOrthonormal(d2.U, 1e-10));
      check('T2 V orthonormal #' + t2, isOrthonormal(d2.V, 1e-12));
      check('T2 det V = +1 (rotation form) #' + t2, Math.abs(d2.detV - 1) <= 1e-12);
      check('T2 |det U| = 1 #' + t2, Math.abs(Math.abs(d2.detU) - 1) <= 1e-10);
      check('T2 reconstruction #' + t2,
        mClose(reconstruct(d2.U, d2.S, d2.V), A2, 1e-10 * sc), matDiff2(reconstruct(d2.U, d2.S, d2.V), A2));
      check('T2 sigma ordering #' + t2, d2.S[0] >= d2.S[1] && d2.S[1] >= 0);
      // A v_i = sigma_i u_i  (Equation (1) of the page's proof)
      var Av1 = matVec2(A2, colOf(d2.V, 0));
      var Av2 = matVec2(A2, colOf(d2.V, 1));
      check('T2 A v1 = s1 u1 #' + t2,
        vClose(Av1, [d2.S[0] * d2.U[0][0], d2.S[0] * d2.U[1][0]], 1e-10 * sc));
      check('T2 A v2 = s2 u2 #' + t2,
        vClose(Av2, [d2.S[1] * d2.U[0][1], d2.S[1] * d2.U[1][1]], 1e-10 * sc));
      // basis-free identities: Frobenius and determinant
      check('T2 s1^2 + s2^2 = ||A||_F^2 #' + t2,
        Math.abs(d2.S[0] * d2.S[0] + d2.S[1] * d2.S[1] - frob2(A2)) <= 1e-10 * (1 + frob2(A2)));
      check('T2 s1 s2 = |det A| #' + t2,
        Math.abs(d2.S[0] * d2.S[1] - Math.abs(det2(A2))) <= 1e-10 * (1 + Math.abs(det2(A2))));
      // determinism
      check('T2 deterministic #' + t2,
        JSON.stringify(decompose(A2)) === JSON.stringify(d2));
    }

    // ---- T3: value pins (SymPy-verified) ----
    // default symmetric [[3,1],[1,2]]: s1 = sqrt((15+5*sqrt5)/2), s2 = sqrt((15-5*sqrt5)/2)
    var dS = decompose([[3, 1], [1, 2]]);
    check('T3 symmetric s1 pin', Math.abs(dS.S[0] - 3.618033988749895) <= 1e-12, dS.S[0]);
    check('T3 symmetric s2 pin', Math.abs(dS.S[1] - 1.381966011250105) <= 1e-12, dS.S[1]);
    check('T3 symmetric v1 pin (golden direction)',
      vClose(colOf(dS.V, 0), [0.85065080835204, 0.5257311121191336], 1e-12));
    // symmetric positive definite: U = V (spectral theorem connection)
    check('T3 symmetric PD: U = V', mClose(dS.U, dS.V, 1e-10));
    // v1 REGRESSION pin: diagonal with a < c must pair correctly (the v1 bug)
    var dD = decompose([[1, 0], [0, 2]]);
    check('T3 diag(1,2) sigma pin', Math.abs(dD.S[0] - 2) <= 1e-12 && Math.abs(dD.S[1] - 1) <= 1e-12);
    check('T3 diag(1,2) v1 = e2 (pairing regression)', vClose(colOf(dD.V, 0), [0, 1], 1e-12) ||
      vClose(colOf(dD.V, 0), [0, -1], 1e-12), JSON.stringify(dD.V));
    check('T3 diag(1,2) u1 unit and reconstruction',
      Math.abs(norm2v(colOf(dD.U, 0)) - 1) <= 1e-12 &&
      mClose(reconstruct(dD.U, dD.S, dD.V), [[1, 0], [0, 2]], 1e-12));
    // rotation: sigmas both 1, kappa 1
    var dR = decompose([[SQ2, -SQ2], [SQ2, SQ2]]);
    check('T3 rotation sigmas = 1', Math.abs(dR.S[0] - 1) <= 1e-12 && Math.abs(dR.S[1] - 1) <= 1e-12);
    check('T3 rotation kappa = 1', Math.abs(dR.kappa - 1) <= 1e-12);
    // reflection: det U * det V = sign(det A) = -1
    var dF = decompose([[-1, 0], [0, 1]]);
    check('T3 reflection detU*detV = -1', Math.abs(dF.detU * dF.detV + 1) <= 1e-10);
    check('T3 reflection sigmas = 1', Math.abs(dF.S[0] - 1) <= 1e-12 && Math.abs(dF.S[1] - 1) <= 1e-12);

    // ---- T4: rank / kappa ----
    check('T4 identity kappa = 1', Math.abs(decompose([[1, 0], [0, 1]]).kappa - 1) <= 1e-12);
    check('T4 diag(4,2) kappa = 2', Math.abs(decompose([[4, 0], [0, 2]]).kappa - 2) <= 1e-12);
    var dSing = decompose([[1, 2], [2, 4]]);
    check('T4 singular rank 1', dSing.rank === 1);
    check('T4 singular kappa = Infinity', dSing.kappa === Infinity);
    check('T4 singular raw s2 is float noise, not exact 0 (tolerance load-bearing)',
      dSing.S[1] !== 0 && dSing.S[1] < 1e-12, dSing.S[1]);
    check('T4 singular U still orthonormal (completion path)', isOrthonormal(dSing.U, 1e-10));
    check('T4 singular reconstruction', mClose(reconstruct(dSing.U, dSing.S, dSing.V), [[1, 2], [2, 4]], 1e-10));
    var dTiny = decompose([[0.001, 0], [0, 0.002]]);
    check('T4 small-but-genuine matrix is NOT treated as zero',
      dTiny.rank === 2 && Math.abs(dTiny.S[0] - 0.002) <= 1e-15 && Math.abs(dTiny.S[1] - 0.001) <= 1e-15);
    var dZ = decompose([[0, 0], [0, 0]]);
    check('T4 zero matrix rank 0, U = V = I', dZ.rank === 0 &&
      mClose(dZ.U, [[1, 0], [0, 1]], 0) && mClose(dZ.V, [[1, 0], [0, 1]], 0) && dZ.kappa === null);
    var dNS = decompose([[1, 2], [2, 4.01]]);
    check('T4 nearSingular rank 2 with huge kappa', dNS.rank === 2 && dNS.kappa > 1000, dNS.kappa);
    check('T4 nearSingular s2 pin', Math.abs(dNS.S[1] - 0.0019968038374267) <= 1e-9, dNS.S[1]);

    // ---- T5: symmetric spectral connection (sigma = |eigenvalue|) ----
    var rng5 = makeRng(40002);
    for (var t5 = 0; t5 < 10; t5++) {
      var a5 = 4 * rng5() - 2, b5 = 4 * rng5() - 2, c5 = 4 * rng5() - 2;
      var S5 = [[a5, b5], [b5, c5]];
      var m5 = (a5 + c5) / 2;
      var h5 = Math.sqrt(((a5 - c5) / 2) * ((a5 - c5) / 2) + b5 * b5);
      var eigAbs = [Math.abs(m5 + h5), Math.abs(m5 - h5)].sort(function (x, y) { return y - x; });
      var d5 = decompose(S5);
      check('T5 symmetric sigma = |eig| #' + t5,
        Math.abs(d5.S[0] - eigAbs[0]) <= 1e-10 * (1 + eigAbs[0]) &&
        Math.abs(d5.S[1] - eigAbs[1]) <= 1e-10 * (1 + eigAbs[0]));
    }

    // ---- T6: ellipse certificate — max/min of ||Ax|| over the unit circle ----
    var rng6 = makeRng(40003);
    for (var t6 = 0; t6 < 5; t6++) {
      var A6 = randMat(rng6);
      var d6 = decompose(A6);
      var mx = 0, mn = Infinity;
      for (var k6 = 0; k6 < 720; k6++) {
        var ang = 2 * Math.PI * k6 / 720;
        var n6 = norm2v(matVec2(A6, [Math.cos(ang), Math.sin(ang)]));
        if (n6 > mx) mx = n6;
        if (n6 < mn) mn = n6;
      }
      check('T6 max ||Ax|| = s1 #' + t6, Math.abs(mx - d6.S[0]) <= 1e-3 * (1 + d6.S[0]), mx - d6.S[0]);
      check('T6 min ||Ax|| = s2 #' + t6, Math.abs(mn - d6.S[1]) <= 1e-3 * (1 + d6.S[0]), mn - d6.S[1]);
    }

    // ---- T7: pseudo-inverse ----
    // invertible: A-dagger = A^{-1} (independent closed-form route)
    var rng7 = makeRng(40004);
    var done7 = 0;
    while (done7 < 10) {
      var A7 = randMat(rng7);
      if (Math.abs(det2(A7)) < 0.3) continue;
      done7++;
      var p7 = pseudoInverse(A7);
      var i7 = inverse2(A7);
      check('T7 invertible: Adag = inverse #' + done7,
        i7.ok && mClose(p7.Adag, i7.inv, 1e-8 * (1 + maxAbs2(i7.inv))));
    }
    // Moore-Penrose axioms on invertible and rank-1 matrices
    var rng7b = makeRng(40005);
    for (var t7 = 0; t7 < 12; t7++) {
      var A7b;
      if (t7 % 2 === 0) {
        A7b = randMat(rng7b);
      } else {
        // exact rank-1: outer product u w^T
        var uu = [4 * rng7b() - 2, 4 * rng7b() - 2];
        var ww = [4 * rng7b() - 2, 4 * rng7b() - 2];
        A7b = [[uu[0] * ww[0], uu[0] * ww[1]], [uu[1] * ww[0], uu[1] * ww[1]]];
      }
      var P = pseudoInverse(A7b).Adag;
      var sc7 = 1 + maxAbs2(A7b) + maxAbs2(P);
      var APA = matMul2(matMul2(A7b, P), A7b);
      var PAP = matMul2(matMul2(P, A7b), P);
      var AP = matMul2(A7b, P);
      var PA = matMul2(P, A7b);
      check('T7 MP1 A Adag A = A #' + t7, mClose(APA, A7b, 1e-8 * sc7), matDiff2(APA, A7b));
      check('T7 MP2 Adag A Adag = Adag #' + t7, mClose(PAP, P, 1e-8 * sc7));
      check('T7 MP3 (A Adag) symmetric #' + t7, Math.abs(AP[0][1] - AP[1][0]) <= 1e-8 * sc7);
      check('T7 MP4 (Adag A) symmetric #' + t7, Math.abs(PA[0][1] - PA[1][0]) <= 1e-8 * sc7);
    }
    // singular pin (SymPy): pinv([[1,2],[2,4]]) = (1/25)[[1,2],[2,4]],
    // AdagA = (1/5)[[1,2],[2,4]] = projection onto Row A = Span{(1,2)}
    var pS = pseudoInverse([[1, 2], [2, 4]]);
    check('T7 singular Adag pin', mClose(pS.Adag, [[0.04, 0.08], [0.08, 0.16]], 1e-10));
    var prj = matMul2(pS.Adag, [[1, 2], [2, 4]]);
    check('T7 AdagA = Row-space projection pin', mClose(prj, [[0.2, 0.4], [0.4, 0.8]], 1e-10));
    check('T7 projection idempotent', mClose(matMul2(prj, prj), prj, 1e-10));
    check('T7 projection trace = rank', Math.abs(prj[0][0] + prj[1][1] - 1) <= 1e-10);
    check('T7 singular effRank 1 (default eps)', pS.effRank === 1);
    // truncation transitions on nearSingular (s2 ~ 0.002)
    check('T7 truncation effRank 2 at eps 1e-6', pseudoInverse([[1, 2], [2, 4.01]], 1e-6).effRank === 2);
    check('T7 truncation effRank 1 at eps 0.01', pseudoInverse([[1, 2], [2, 4.01]], 0.01).effRank === 1);
    check('T7 truncation effRank 0 at eps 10', pseudoInverse([[1, 2], [2, 4.01]], 10).effRank === 0);
    var pT = pseudoInverse([[1, 2], [2, 4.01]], 10);
    check('T7 full truncation gives Adag = 0', mClose(pT.Adag, [[0, 0], [0, 0]], 0));
    // truncated pinv stays BOUNDED (never inverts a below-eps sigma)
    var pTr = pseudoInverse([[1, 2], [2, 4.01]], 0.01);
    check('T7 truncated Adag bounded by 1/s1 scale', maxAbs2(pTr.Adag) <= 2 / pTr.S[0], maxAbs2(pTr.Adag));

    // ---- T8: presets ----
    check('T8 preset count', PRESETS.length === 8);
    check('T8 symmetric preset pin', JSON.stringify(presetByKey('symmetric').m) === '[[3,1],[1,2]]');
    check('T8 nearSingular preset pin', JSON.stringify(presetByKey('nearSingular').m) === '[[1,2],[2,4.01]]');
    check('T8 singular preset pin', JSON.stringify(presetByKey('singular').m) === '[[1,2],[2,4]]');
    check('T8 rotation preset orthogonal (4-decimal entries)', isOrthonormal(presetByKey('rotation45').m, 1e-4));
    for (var t8 = 0; t8 < PRESETS.length; t8++) {
      var d8 = decompose(PRESETS[t8].m);
      check('T8 preset ' + PRESETS[t8].key + ' reconstructs',
        mClose(reconstruct(d8.U, d8.S, d8.V), PRESETS[t8].m, 1e-10 * (1 + maxAbs2(PRESETS[t8].m))));
    }

    // ---- T9: entry parsing ----
    check('T9 "2" -> 2', parseEntry('2').ok && parseEntry('2').value === 2);
    check('T9 "" rejected', parseEntry('').ok === false);
    check('T9 "-" rejected', parseEntry('-').ok === false);
    check('T9 "1,5" rejected', parseEntry('1,5').ok === false);
    check('T9 non-string rejected', parseEntry(3).ok === false);

    // ---- T10: RNG determinism ----
    var ra = makeRng(42), rb = makeRng(42);
    var same = true;
    for (var i10 = 0; i10 < 10; i10++) { if (ra() !== rb()) same = false; }
    check('T10 rng deterministic', same);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  return {
    makeRng: makeRng,
    matVec2: matVec2,
    matMul2: matMul2,
    transpose2: transpose2,
    det2: det2,
    norm2v: norm2v,
    maxAbs2: maxAbs2,
    matDiff2: matDiff2,
    inverse2: inverse2,
    decompose: decompose,
    reconstruct: reconstruct,
    pseudoInverse: pseudoInverse,
    PRESETS: PRESETS,
    presetByKey: presetByKey,
    parseEntry: parseEntry,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = SvdCore; }
// ============================================================================
// UI layer — 4-step geometric SVD pipeline (unit circle -> V^T -> Sigma -> U)
// plus a pseudo-inverse / truncation panel. Renders only what SvdCore
// computes; the gate refuses to render on self-test failure. Prefix: svd-.
// ============================================================================
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var C = {
    bg: '#0f1419',
    panel: 'rgba(20, 28, 40, 0.95)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderStrong: 'rgba(255, 255, 255, 0.15)',
    text: '#e8eaed',
    textDim: 'rgba(255, 255, 255, 0.7)',
    faint: 'rgba(255, 255, 255, 0.5)',
    accent: '#64b4ff',
    grid: 'rgba(255, 255, 255, 0.08)',
    axis: 'rgba(255, 255, 255, 0.25)',
    circleOrig: 'rgba(255, 255, 255, 0.35)',
    shapeStroke: '#42a5f5',
    shapeFill: 'rgba(66, 165, 245, 0.15)',
    eBasis: 'rgba(255, 255, 255, 0.35)',
    v1: '#2ecc71', v2: '#26a69a',
    u1: '#ab47bc', u2: '#ff8a65',
    sigma: '#ffc857',
    bad: '#ef5350',
    warn: '#ffc857'
  };

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }
  function fmtSm(x) {
    var a = Math.abs(x);
    return (a !== 0 && a < 1e-3) ? x.toExponential(1) : fmt(x, 3);
  }
  function matHtml(M, d) {
    return '<span class="svd-mat">[' + fmt(M[0][0], d) + ', ' + fmt(M[0][1], d) + '; ' +
      fmt(M[1][0], d) + ', ' + fmt(M[1][1], d) + ']</span>';
  }

  function init() {
    var container = document.getElementById('svd-visualization-container');
    if (!container) return;
    if (container.dataset.svdInit) return;
    container.dataset.svdInit = '1';

    // ---------- gate ----------
    var gate;
    try { gate = SvdCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown')], count: 0 }; }
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + String(shown[gi]).replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="svd-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
        ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
        '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
        gate.failures.length + ' of ' + gate.count + ' checks).</strong>' +
        '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render ' +
        'rather than display incorrect mathematics. Failures:</p>' +
        '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
      return;
    }

    // ---------- DOM ----------
    var presetBtns = '';
    for (var pi = 0; pi < SvdCore.PRESETS.length; pi++) {
      presetBtns += '<button class="svd-preset" data-key="' + SvdCore.PRESETS[pi].key + '">' +
        SvdCore.PRESETS[pi].label + '</button>';
    }
    container.innerHTML =
      '<div class="svd-root">' +
        '<div class="svd-canvaswrap">' +
          '<div class="svd-formula">A = ' +
            '<span id="svd-f-u" class="svd-factor">U</span><span class="svd-dot">\u00B7</span>' +
            '<span id="svd-f-s" class="svd-factor">\u03A3</span><span class="svd-dot">\u00B7</span>' +
            '<span id="svd-f-v" class="svd-factor">V\u1D40</span>' +
          '</div>' +
          '<canvas id="svd-canvas"></canvas>' +
          '<div class="svd-stepbar">' +
            '<button id="svd-prev" class="svd-secondary">\u2190 Prev</button>' +
            '<span id="svd-step-indicator" class="svd-stepind">1/4</span>' +
            '<button id="svd-next" class="svd-primary">Next \u2192</button>' +
            '<button id="svd-play" class="svd-secondary">Play all</button>' +
            '<button id="svd-reset" class="svd-secondary">Reset</button>' +
          '</div>' +
          '<div class="svd-stepdesc"><strong id="svd-step-title"></strong><p id="svd-step-detail"></p></div>' +
        '</div>' +
        '<div class="svd-controls">' +
          '<div class="svd-group">' +
            '<label>Matrix A:</label>' +
            '<div class="svd-matrix">' +
              '<div class="svd-bracket">[</div>' +
              '<div class="svd-cells">' +
                '<input type="text" id="svd-m00" inputmode="decimal" aria-label="Matrix entry row 1 column 1">' +
                '<input type="text" id="svd-m01" inputmode="decimal" aria-label="Matrix entry row 1 column 2">' +
                '<input type="text" id="svd-m10" inputmode="decimal" aria-label="Matrix entry row 2 column 1">' +
                '<input type="text" id="svd-m11" inputmode="decimal" aria-label="Matrix entry row 2 column 2">' +
              '</div>' +
              '<div class="svd-bracket">]</div>' +
            '</div>' +
            '<div class="svd-hint">Invalid entries are outlined and ignored until corrected.</div>' +
            '<div class="svd-btnrow">' + presetBtns + '</div>' +
          '</div>' +
          '<div id="svd-readouts" class="svd-group svd-readouts"></div>' +
          '<div class="svd-group">' +
            '<label class="svd-toggle"><input type="checkbox" id="svd-pinv-toggle"> Pseudo-inverse A\u2020 (truncated SVD)</label>' +
            '<div id="svd-pinv-panel" style="display:none;">' +
              '<div class="svd-inline"><span class="svd-sub">tolerance \u03B5:</span>' +
                '<input type="range" id="svd-eps" min="0" max="120" step="1" value="0">' +
                '<span id="svd-eps-val" class="svd-sub"></span></div>' +
              '<div id="svd-pinv-readouts"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#svd-visualization-container .svd-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
      '@media (min-width: 992px){#svd-visualization-container .svd-root{flex-direction:row;align-items:flex-start;}' +
      '#svd-visualization-container .svd-canvaswrap{flex:3;}#svd-visualization-container .svd-controls{flex:2;max-width:430px;}}' +
      '#svd-visualization-container .svd-canvaswrap,#svd-visualization-container .svd-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#svd-visualization-container .svd-controls{box-shadow:0 8px 32px rgba(0,0,0,0.3);}' +
      '#svd-visualization-container .svd-formula{font-size:1.4rem;text-align:center;margin-bottom:10px;font-family:"Courier New",monospace;}' +
      '#svd-visualization-container .svd-factor{padding:2px 10px;border-radius:4px;border:1px solid transparent;transition:all 0.2s;}' +
      '#svd-visualization-container .svd-factor.svd-active{background:rgba(100,180,255,0.15);border-color:' + C.accent + ';color:' + C.accent + ';font-weight:bold;}' +
      '#svd-visualization-container .svd-factor.svd-done{color:' + C.textDim + ';border-color:rgba(46,204,113,0.4);}' +
      '#svd-visualization-container .svd-dot{margin:0 2px;color:' + C.faint + ';}' +
      '#svd-visualization-container #svd-canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;margin:0 auto;}' +
      '#svd-visualization-container .svd-stepbar{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;}' +
      '#svd-visualization-container .svd-stepind{font-family:"Courier New",monospace;color:' + C.accent + ';font-weight:bold;min-width:38px;text-align:center;}' +
      '#svd-visualization-container .svd-primary,#svd-visualization-container .svd-secondary{padding:8px 14px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;transition:background 0.2s;}' +
      '#svd-visualization-container .svd-primary{background:linear-gradient(135deg,#1565c0,#42a5f5);color:#fff;}' +
      '#svd-visualization-container .svd-primary:hover:not(:disabled){background:linear-gradient(135deg,#1976d2,#64b5f6);}' +
      '#svd-visualization-container .svd-secondary{background:rgba(255,255,255,0.08);border:1px solid ' + C.borderStrong + ';color:' + C.text + ';}' +
      '#svd-visualization-container .svd-secondary:hover:not(:disabled){background:rgba(255,255,255,0.12);}' +
      '#svd-visualization-container button:disabled{opacity:0.45;cursor:default;}' +
      '#svd-visualization-container .svd-stepdesc{margin-top:10px;color:' + C.textDim + ';font-size:0.92rem;line-height:1.5;}' +
      '#svd-visualization-container .svd-stepdesc p{margin:4px 0 0;}' +
      '#svd-visualization-container .svd-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
      '#svd-visualization-container .svd-group label{display:block;font-weight:bold;margin-bottom:8px;color:' + C.textDim + ';font-size:0.85rem;}' +
      '#svd-visualization-container .svd-matrix{display:flex;align-items:center;justify-content:center;margin:6px 0;}' +
      '#svd-visualization-container .svd-bracket{font-size:2rem;margin:0 5px;color:' + C.accent + ';}' +
      '#svd-visualization-container .svd-cells{display:grid;grid-template-columns:1fr 1fr;grid-gap:8px;}' +
      '#svd-visualization-container .svd-cells input{width:64px;height:36px;text-align:center;font-size:1rem;background:rgba(0,0,0,0.3);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';font-family:"Courier New",monospace;}' +
      '#svd-visualization-container .svd-cells input:focus{border-color:' + C.accent + ';outline:none;box-shadow:0 0 0 2px rgba(100,180,255,0.2);}' +
      '#svd-visualization-container .svd-cells input.svd-invalid{border-color:' + C.bad + ';box-shadow:0 0 0 2px rgba(239,83,80,0.25);}' +
      '#svd-visualization-container .svd-hint{text-align:center;font-size:0.8rem;color:' + C.faint + ';margin-bottom:8px;}' +
      '#svd-visualization-container .svd-btnrow{display:flex;flex-wrap:wrap;gap:6px;}' +
      '#svd-visualization-container .svd-preset{flex:1;min-width:88px;padding:7px 4px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.82rem;}' +
      '#svd-visualization-container .svd-preset:hover{background:rgba(255,255,255,0.1);}' +
      '#svd-visualization-container .svd-readouts{font-size:0.9rem;line-height:1.6;}' +
      '#svd-visualization-container .svd-mat{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#svd-visualization-container .svd-sub{color:' + C.faint + ';font-size:0.85rem;}' +
      '#svd-visualization-container .svd-warn{color:' + C.warn + ';font-weight:bold;}' +
      '#svd-visualization-container .svd-ok{color:#2ecc71;font-weight:bold;}' +
      '#svd-visualization-container .svd-toggle{display:flex !important;align-items:center;gap:8px;font-weight:normal !important;cursor:pointer;}' +
      '#svd-visualization-container .svd-inline{display:flex;align-items:center;gap:8px;margin:8px 0;}' +
      '#svd-visualization-container .svd-inline input[type=range]{flex:1;}' +
      '#svd-visualization-container #svd-pinv-readouts{font-size:0.9rem;line-height:1.6;}';
    document.head.appendChild(style);

    var canvas = document.getElementById('svd-canvas');
    var ctx = canvas.getContext('2d');
    var cells = [
      document.getElementById('svd-m00'), document.getElementById('svd-m01'),
      document.getElementById('svd-m10'), document.getElementById('svd-m11')
    ];
    var readoutsEl = document.getElementById('svd-readouts');
    var prevBtn = document.getElementById('svd-prev');
    var nextBtn = document.getElementById('svd-next');
    var playBtn = document.getElementById('svd-play');
    var resetBtn = document.getElementById('svd-reset');
    var stepInd = document.getElementById('svd-step-indicator');
    var stepTitle = document.getElementById('svd-step-title');
    var stepDetail = document.getElementById('svd-step-detail');
    var factorEls = {
      1: document.getElementById('svd-f-v'),
      2: document.getElementById('svd-f-s'),
      3: document.getElementById('svd-f-u')
    };
    var pinvToggle = document.getElementById('svd-pinv-toggle');
    var pinvPanel = document.getElementById('svd-pinv-panel');
    var epsSlider = document.getElementById('svd-eps');
    var epsVal = document.getElementById('svd-eps-val');
    var pinvReadouts = document.getElementById('svd-pinv-readouts');

    var state = {
      A: [[3, 1], [1, 2]],
      svd: null,           // current decomposition (from SvdCore)
      step: 0,             // 0..3
      t: 1,                // progress within the current step
      animating: false,
      raf: null,
      queue: [],           // remaining steps for "Play all"
      cssW: 520
    };
    var MAX_STEP = 3;
    var VIEW_HALF = 5.5;
    var DUR = 900;

    var STEP_TITLES = [
      'Step 1 of 4: The unit circle and the right singular vectors',
      'Step 2 of 4: Apply V\u1D40 \u2014 rotate v\u2081, v\u2082 onto the axes',
      'Step 3 of 4: Apply \u03A3 \u2014 scale the axes by \u03C3\u2081, \u03C3\u2082',
      'Step 4 of 4: Apply U \u2014 carry the axes to u\u2081, u\u2082'
    ];
    var STEP_DETAILS = [
      'The unit circle with the standard basis (faint) and the right singular vectors v\u2081, v\u2082 \u2014 the orthonormal directions the factorization singles out. Watch where they go.',
      'V\u1D40 is orthogonal: a pure rotation (by \u2212\u03B8). It sends v\u2081 \u2192 e\u2081 and v\u2082 \u2192 e\u2082 while leaving the unit circle unchanged \u2014 orthogonal maps preserve lengths and angles.',
      '\u03A3 stretches the first axis by \u03C3\u2081 and the second by \u03C3\u2082. The circle becomes an axis-aligned ellipse with semi-axes \u03C3\u2081 and \u03C3\u2082 \u2014 all the "shape change" of A happens here.',
      'U is orthogonal (rotation or reflection): it carries the axes onto the left singular vectors u\u2081, u\u2082. The result is the image of the unit circle under A \u2014 an ellipse with semi-axes \u03C3\u2081u\u2081 and \u03C3\u2082u\u2082.'
    ];

    // ---------- factor matrices for the pipeline ----------
    function factors() {
      var d = state.svd;
      return {
        1: SvdCore.transpose2(d.V),
        2: [[d.S[0], 0], [0, d.S[1]]],
        3: d.U
      };
    }
    function lerpM(F, t) {
      if (t >= 1) return F;
      var u = 1 - t;
      return [
        [u + t * F[0][0], t * F[0][1]],
        [t * F[1][0], u + t * F[1][1]]
      ];
    }
    // cumulative matrix at (step, t)
    function cumulative(step, t) {
      var Fs = factors();
      var Cm = [[1, 0], [0, 1]];
      for (var k = 1; k < step; k++) Cm = SvdCore.matMul2(Fs[k], Cm);
      if (step >= 1) Cm = SvdCore.matMul2(lerpM(Fs[step], t), Cm);
      return Cm;
    }

    // ---------- canvas ----------
    function sizeCanvas() {
      var parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
      var cssW = parentW > 0 ? Math.max(300, Math.min(560, parentW - 30)) : 520;
      state.cssW = cssW;
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssW + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssW * dpr);
      if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function w2c(p) {
      var s = state.cssW / (2 * VIEW_HALF);
      return [state.cssW / 2 + p[0] * s, state.cssW / 2 - p[1] * s];
    }
    function arrow(tip, color, label, width) {
      var o = w2c([0, 0]), e = w2c(tip);
      var dx = e[0] - o[0], dy = e[1] - o[1];
      var len = Math.hypot(dx, dy);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2.5;
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      if (len > 1e-6) {
        var ang = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(e[0], e[1]);
        ctx.lineTo(e[0] - 10 * Math.cos(ang - Math.PI / 6), e[1] - 10 * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(e[0] - 10 * Math.cos(ang + Math.PI / 6), e[1] - 10 * Math.sin(ang + Math.PI / 6));
        ctx.closePath(); ctx.fill();
        if (label) {
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.fillText(label, e[0] + 7, e[1] - 7);
        }
      }
    }
    function pathCircleImage(Cm) {
      ctx.beginPath();
      for (var k = 0; k <= 128; k++) {
        var a = 2 * Math.PI * k / 128;
        var p = w2c(SvdCore.matVec2(Cm, [Math.cos(a), Math.sin(a)]));
        if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
    }

    function draw() {
      var w = state.cssW;
      ctx.clearRect(0, 0, w, w);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, w);
      // grid + axes
      ctx.lineWidth = 1;
      var H = Math.ceil(VIEW_HALF);
      for (var g = -H; g <= H; g++) {
        ctx.strokeStyle = g === 0 ? C.axis : C.grid;
        var pa = w2c([g, -H]), pb = w2c([g, H]);
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
        var pc = w2c([-H, g]), pd = w2c([H, g]);
        ctx.beginPath(); ctx.moveTo(pc[0], pc[1]); ctx.lineTo(pd[0], pd[1]); ctx.stroke();
      }

      var d = state.svd;
      var Cm = cumulative(state.step, state.t);

      // original unit circle + standard basis (faint)
      ctx.setLineDash([4, 4]);
      pathCircleImage([[1, 0], [0, 1]]);
      ctx.strokeStyle = C.circleOrig; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([]);
      arrow([1, 0], C.eBasis, '', 1.5);
      arrow([0, 1], C.eBasis, '', 1.5);

      // transformed circle image
      pathCircleImage(Cm);
      ctx.fillStyle = C.shapeFill; ctx.fill();
      ctx.strokeStyle = C.shapeStroke; ctx.lineWidth = 2.5; ctx.stroke();

      // tracked right singular vectors: current images C v1, C v2
      var v1 = [d.V[0][0], d.V[1][0]], v2 = [d.V[0][1], d.V[1][1]];
      arrow(SvdCore.matVec2(Cm, v1), C.v1, 'v\u2081', 3);
      arrow(SvdCore.matVec2(Cm, v2), C.v2, 'v\u2082', 3);

      // at the final stage, show u1, u2 (unit) explicitly
      if (state.step === MAX_STEP && state.t >= 1) {
        arrow([d.U[0][0], d.U[1][0]], C.u1, 'u\u2081', 2);
        arrow([d.U[0][1], d.U[1][1]], C.u2, 'u\u2082', 2);
        // sigma labels at the ellipse semi-axis tips
        ctx.fillStyle = C.sigma;
        ctx.font = 'bold 12px system-ui, sans-serif';
        var tip1 = w2c([d.S[0] * d.U[0][0], d.S[0] * d.U[1][0]]);
        var tip2 = w2c([d.S[1] * d.U[0][1], d.S[1] * d.U[1][1]]);
        ctx.fillText('\u03C3\u2081u\u2081', tip1[0] + 6, tip1[1] + 14);
        ctx.fillText('\u03C3\u2082u\u2082', tip2[0] + 6, tip2[1] + 14);
      }
      if (state.step === 2 && state.t >= 1) {
        ctx.fillStyle = C.sigma;
        ctx.font = 'bold 12px system-ui, sans-serif';
        var s1p = w2c([d.S[0], 0]), s2p = w2c([0, d.S[1]]);
        ctx.fillText('\u03C3\u2081', s1p[0] + 5, s1p[1] + 14);
        ctx.fillText('\u03C3\u2082', s2p[0] + 6, s2p[1] - 6);
      }
      updateStepUi();
    }

    // ---------- step UI ----------
    function updateStepUi() {
      stepInd.textContent = (state.step + 1) + '/4';
      stepTitle.textContent = STEP_TITLES[state.step];
      stepDetail.textContent = STEP_DETAILS[state.step];
      for (var k = 1; k <= 3; k++) {
        factorEls[k].classList.toggle('svd-active', state.step === k);
        factorEls[k].classList.toggle('svd-done', state.step > k);
      }
      prevBtn.disabled = state.animating || state.step === 0;
      nextBtn.disabled = state.animating || state.step === MAX_STEP;
      playBtn.disabled = state.animating;
      resetBtn.disabled = state.animating;
      container.dataset.svdStep = String(state.step);
    }

    // ---------- animation (single stop path restores all affordances) ----------
    function stopAnimation() {
      if (state.raf !== null) { cancelAnimationFrame(state.raf); state.raf = null; }
      state.animating = false;
      state.queue = [];
      state.t = 1;
    }
    function sweepTo(step, done) {
      state.animating = true;
      state.step = step;
      state.t = 0;
      draw(); // synchronous first frame: locks buttons immediately
      var t0 = Date.now();
      function frame() {
        var el = Date.now() - t0;
        state.t = Math.min(el / DUR, 1);
        if (state.t >= 1) {
          state.t = 1;
          if (state.queue.length > 0) {
            var nxt = state.queue.shift();
            draw();
            sweepTo(nxt, done);
            return;
          }
          state.animating = false;
          draw();
          if (done) done();
          return;
        }
        draw();
        state.raf = requestAnimationFrame(frame);
      }
      state.raf = requestAnimationFrame(frame);
    }

    nextBtn.addEventListener('click', function () {
      if (state.animating || state.step >= MAX_STEP) return;
      sweepTo(state.step + 1);
    });
    prevBtn.addEventListener('click', function () {
      if (state.animating || state.step === 0) return;
      state.step -= 1;
      state.t = 1;
      draw();
    });
    playBtn.addEventListener('click', function () {
      if (state.animating) return;
      state.step = 0; state.t = 1;
      draw();
      state.queue = [2, 3];
      sweepTo(1);
    });
    resetBtn.addEventListener('click', function () {
      stopAnimation();
      state.step = 0; state.t = 1;
      draw();
    });

    // ---------- readouts ----------
    function kappaHtml(d) {
      if (d.rank === 0) return '<span class="svd-sub">\u2014 (zero matrix)</span>';
      if (d.rank === 1) return '<span class="svd-warn">\u221E \u2014 A is singular (rank 1)</span>';
      var k = d.kappa;
      var ks = k >= 1000 ? k.toExponential(2) : fmt(k, 2);
      if (k > 100) return '<span class="svd-warn">' + ks + ' \u2014 ill-conditioned</span>';
      return '<span class="svd-mat">' + ks + '</span>';
    }
    function updateReadouts() {
      var d = state.svd;
      var A = state.A;
      var recErr = SvdCore.matDiff2(SvdCore.reconstruct(d.U, d.S, d.V), A);
      var thetaDeg = d.thetaV * 180 / Math.PI;
      var uLabel = Math.abs(d.detU - 1) < 1e-9 ? 'rotation (det U = +1)' : 'reflection (det U = \u22121)';
      var html =
        '<div><strong>Decomposition</strong> <span class="svd-sub">(computed by the certified core)</span></div>' +
        '<div style="margin-top:4px;">U = ' + matHtml(d.U, 3) + ' <span class="svd-sub">' + uLabel + '</span></div>' +
        '<div>\u03A3 = ' + matHtml([[d.S[0], 0], [0, d.S[1]]], 3) + '</div>' +
        '<div>V\u1D40 = ' + matHtml(SvdCore.transpose2(d.V), 3) +
          ' <span class="svd-sub">rotation by \u03B8 = ' + fmt(thetaDeg, 1) + '\u00B0</span></div>' +
        '<div style="margin-top:6px;">\u03C3\u2081 = <span class="svd-mat">' + fmtSm(d.S[0]) + '</span>, ' +
          '\u03C3\u2082 = <span class="svd-mat">' + fmtSm(d.S[1]) + '</span>, ' +
          'rank = <span class="svd-mat">' + d.rank + '</span></div>' +
        '<div>\u03BA(A) = \u03C3\u2081/\u03C3\u2082 = ' + kappaHtml(d) + '</div>' +
        '<div class="svd-sub" style="margin-top:6px;">Verification: \u2016U\u03A3V\u1D40 \u2212 A\u2016 = ' +
          recErr.toExponential(1) + '</div>';
      readoutsEl.innerHTML = html;
      updatePinv();
    }

    // ---------- pseudo-inverse panel ----------
    function epsFromSlider() {
      // slider 0..120 -> eps = 10^(v/20 - 6), i.e. 1e-6 .. 1
      return Math.pow(10, parseInt(epsSlider.value, 10) / 20 - 6);
    }
    function updatePinv() {
      if (!pinvToggle.checked) return;
      var eps = epsFromSlider();
      epsVal.textContent = '\u03B5 = ' + eps.toExponential(1);
      var p = SvdCore.pseudoInverse(state.A, eps);
      var html = '<div>A\u2020 = ' + matHtml(p.Adag, 3) + '</div>' +
        '<div>effective rank at \u03B5: <span class="svd-mat">' + p.effRank + '</span></div>';
      var truncated = (p.S[0] > 0 && p.S[0] < eps) || (p.S[1] > 0 && p.S[1] < eps);
      if (truncated) {
        html += '<div class="svd-warn">\u03C3 below \u03B5 treated as 0 \u2014 truncated SVD (regularization).</div>';
      }
      var PA = SvdCore.matMul2(p.Adag, state.A);
      html += '<div style="margin-top:4px;">A\u2020A = ' + matHtml(PA, 3) + ' <span class="svd-sub">' +
        (p.effRank === 2 ? '= I (A invertible at this \u03B5)' : 'projection onto Row A') + '</span></div>';
      pinvReadouts.innerHTML = html;
    }
    pinvToggle.addEventListener('change', function () {
      pinvPanel.style.display = pinvToggle.checked ? 'block' : 'none';
      updatePinv();
    });
    epsSlider.addEventListener('input', updatePinv);

    // ---------- matrix input / presets ----------
    function recompute() {
      state.svd = SvdCore.decompose(state.A);
      updateReadouts();
      draw();
    }
    function setMatrix(M) {
      stopAnimation();
      state.A = [[M[0][0], M[0][1]], [M[1][0], M[1][1]]];
      cells[0].value = String(M[0][0]); cells[1].value = String(M[0][1]);
      cells[2].value = String(M[1][0]); cells[3].value = String(M[1][1]);
      for (var i = 0; i < 4; i++) cells[i].classList.remove('svd-invalid');
      state.step = MAX_STEP; state.t = 1; // show the full transformation for a new matrix
      recompute();
    }
    function onCellInput() {
      var parsed = [], allOk = true;
      for (var i = 0; i < 4; i++) {
        var r = SvdCore.parseEntry(cells[i].value);
        parsed.push(r);
        cells[i].classList.toggle('svd-invalid', !r.ok);
        if (!r.ok) allOk = false;
      }
      if (!allOk) return; // keep last valid matrix; no silent zeros
      stopAnimation();
      state.A = [[parsed[0].value, parsed[1].value], [parsed[2].value, parsed[3].value]];
      state.step = MAX_STEP; state.t = 1;
      recompute();
    }
    for (var ci = 0; ci < 4; ci++) cells[ci].addEventListener('input', onCellInput);

    var pBtns = container.querySelectorAll('.svd-preset');
    for (var pb = 0; pb < pBtns.length; pb++) {
      pBtns[pb].addEventListener('click', function () {
        var pr = SvdCore.presetByKey(this.getAttribute('data-key'));
        if (pr) setMatrix(pr.m);
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvas(); draw(); });
    }

    // ---------- boot ----------
    sizeCanvas();
    setMatrix([[3, 1], [1, 2]]);
    state.step = 0; state.t = 1;
    draw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();