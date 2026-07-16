// ============================================================================
// LsqCore — math core for the Least-Squares Regression Visualizer (linalg-8)
// DOM-free, Node-requirable. Vectors are arrays; matrices are arrays of rows.
// The least-squares solve goes through QR (modified Gram-Schmidt) — the
// numerically stable route this page itself teaches — never through an
// explicitly formed (X^T X)^{-1}. A normal-equation route with HONEST
// singularity detection exists solely as an independent verification route
// for the self-tests. All displayed values (beta, residuals, SSE, X^T eps,
// rank messages, dataset samples) come from this core and are certified by
// runSelfTests(); the UI layers only render what this core returns.
// ============================================================================
var LsqCore = (function () {
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

  // ---------- vector helpers ----------
  function dot(u, v) {
    var s = 0;
    for (var i = 0; i < u.length; i++) s += u[i] * v[i];
    return s;
  }
  function norm(v) { return Math.sqrt(dot(v, v)); }
  function scale(v, a) {
    var r = new Array(v.length);
    for (var i = 0; i < v.length; i++) r[i] = a * v[i];
    return r;
  }
  function sub(u, v) {
    var r = new Array(u.length);
    for (var i = 0; i < u.length; i++) r[i] = u[i] - v[i];
    return r;
  }
  function matVec(X, b) { // X: m x p (rows), b: p -> m
    var r = new Array(X.length);
    for (var i = 0; i < X.length; i++) r[i] = dot(X[i], b);
    return r;
  }
  function matTVec(X, y) { // X^T y : p entries
    var p = X[0].length;
    var r = new Array(p);
    for (var j = 0; j < p; j++) {
      var s = 0;
      for (var i = 0; i < X.length; i++) s += X[i][j] * y[i];
      r[j] = s;
    }
    return r;
  }
  function column(X, j) {
    var c = new Array(X.length);
    for (var i = 0; i < X.length; i++) c[i] = X[i][j];
    return c;
  }

  // ---------- design matrices ----------
  // Polynomial (Vandermonde): row_i = [1, x_i, x_i^2, ..., x_i^degree]
  function vandermonde(xs, degree) {
    var X = [];
    for (var i = 0; i < xs.length; i++) {
      var row = [1];
      for (var d = 1; d <= degree; d++) row.push(row[d - 1] * xs[i]);
      X.push(row);
    }
    return X;
  }
  // Surface models over (x, y): 'plane' -> [1, x, y]; 'quad' -> [1, x, y, x^2, xy, y^2]
  function surfaceDesign(pts, model) {
    var X = [];
    for (var i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1];
      if (model === 'plane') X.push([1, x, y]);
      else X.push([1, x, y, x * x, x * y, y * y]);
    }
    return X;
  }
  function surfaceTermCount(model) { return model === 'plane' ? 3 : 6; }

  function predictPoly(beta, x) {
    var s = 0, pw = 1;
    for (var d = 0; d < beta.length; d++) { s += beta[d] * pw; pw *= x; }
    return s;
  }
  function predictSurface(beta, model, x, y) {
    if (model === 'plane') return beta[0] + beta[1] * x + beta[2] * y;
    return beta[0] + beta[1] * x + beta[2] * y + beta[3] * x * x + beta[4] * x * y + beta[5] * y * y;
  }

  function distinctCount(xs, tol) {
    var t = tol === undefined ? 1e-9 : tol;
    var sorted = xs.slice().sort(function (a, b) { return a - b; });
    var c = sorted.length > 0 ? 1 : 0;
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > t) c++;
    }
    return c;
  }

  // ---------- QR via modified Gram-Schmidt ----------
  // X (m x p, m >= p expected) -> Q (m x p, orthonormal columns, stored as
  // list of column vectors), R (p x p upper triangular, POSITIVE diagonal).
  // FAILS (ok:false, failedIndex=j) when column j is numerically dependent
  // on the previous ones: ||v_j|| <= relTol * ||x_j||. Dependent columns are
  // reported, never silently pivoted around (the v1 failure class).
  function qr(X) {
    var m = X.length;
    var p = m > 0 ? X[0].length : 0;
    if (m < p) return { ok: false, failedIndex: null, reason: 'underdetermined' };
    var relTol = 1e-10;
    var Q = []; // columns
    var R = [];
    for (var a = 0; a < p; a++) {
      R.push([]);
      for (var b = 0; b < p; b++) R[a].push(0);
    }
    for (var j = 0; j < p; j++) {
      var v = column(X, j);
      var nx = norm(v);
      for (var i = 0; i < j; i++) {
        var rij = dot(Q[i], v); // MGS: project the UPDATED v
        R[i][j] = rij;
        v = sub(v, scale(Q[i], rij));
      }
      var rjj = norm(v);
      if (rjj <= relTol * (nx > 0 ? nx : 1)) {
        return { ok: false, failedIndex: j, reason: 'dependent' };
      }
      R[j][j] = rjj;
      Q.push(scale(v, 1 / rjj));
    }
    return { ok: true, Q: Q, R: R, m: m, p: p };
  }

  // Solve R x = c for upper triangular R with nonzero diagonal.
  function backSub(R, c) {
    var p = R.length;
    var x = new Array(p);
    for (var i = p - 1; i >= 0; i--) {
      var s = c[i];
      for (var j = i + 1; j < p; j++) s -= R[i][j] * x[j];
      x[i] = s / R[i][i];
    }
    return x;
  }

  // ---------- least squares (QR route; the displayed solver) ----------
  function lstsq(X, y) {
    var f = qr(X);
    if (!f.ok) return { ok: false, failedIndex: f.failedIndex, reason: f.reason };
    // R beta = Q^T y
    var c = new Array(f.p);
    for (var i = 0; i < f.p; i++) c[i] = dot(f.Q[i], y);
    var beta = backSub(f.R, c);
    var yhat = matVec(X, beta);
    var resid = sub(y, yhat);
    var sse = dot(resid, resid);
    var xtResid = matTVec(X, resid);
    return {
      ok: true,
      beta: beta,
      yhat: yhat,
      resid: resid,
      sse: sse,
      mse: sse / X.length,
      lsError: Math.sqrt(sse),
      xtResid: xtResid,
      xtResidNorm: norm(xtResid),
      n: X.length,
      p: f.p,
      interpolating: X.length === f.p
    };
  }

  // ---------- normal-equation route (SELF-TEST verification only) ----------
  // Forms X^T X and solves by Gaussian elimination with partial pivoting and
  // HONEST singularity detection (ok:false instead of skipping pivots).
  function normalEqSolve(X, y) {
    var p = X[0].length;
    var M = [];
    var i, j, k;
    for (i = 0; i < p; i++) {
      M.push([]);
      for (j = 0; j < p; j++) {
        var s = 0;
        for (k = 0; k < X.length; k++) s += X[k][i] * X[k][j];
        M[i].push(s);
      }
      M[i].push(0);
    }
    var rhs = matTVec(X, y);
    var scaleRef = 0;
    for (i = 0; i < p; i++) {
      M[i][p] = rhs[i];
      for (j = 0; j < p; j++) scaleRef = Math.max(scaleRef, Math.abs(M[i][j]));
    }
    for (i = 0; i < p; i++) {
      var maxRow = i;
      for (j = i + 1; j < p; j++) {
        if (Math.abs(M[j][i]) > Math.abs(M[maxRow][i])) maxRow = j;
      }
      var tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp;
      if (Math.abs(M[i][i]) <= 1e-12 * (scaleRef > 0 ? scaleRef : 1)) {
        return { ok: false, reason: 'singular' };
      }
      for (j = i + 1; j < p; j++) {
        var fct = M[j][i] / M[i][i];
        for (k = i; k <= p; k++) M[j][k] -= fct * M[i][k];
      }
    }
    var x = new Array(p);
    for (i = p - 1; i >= 0; i--) {
      var s2 = M[i][p];
      for (j = i + 1; j < p; j++) s2 -= M[i][j] * x[j];
      x[i] = s2 / M[i][i];
    }
    return { ok: true, beta: x };
  }

  // ---------- seeded dataset generators ----------
  // 2D: n points (x, y) with x in [0.05, 0.95]; noiseless curves keep
  // y inside (0, 1), so noise=0 samples lie EXACTLY on the stated curve
  // (certified below). Noise is uniform in [-noise, +noise], then clamped.
  var CURVES_2D = {
    linear:     function (x) { return 0.1 + 0.8 * x; },
    quadratic:  function (x) { return 0.08 + 0.85 * x * x; },
    cubic:      function (x) { return 0.15 + 0.5 * x - 0.9 * x * x + 1.2 * x * x * x; },
    sinusoidal: function (x) { return 0.5 + 0.35 * Math.sin(2.2 * Math.PI * x); }
  };
  function gen2D(type, n, noise, seed) {
    var rng = makeRng(seed);
    var f = CURVES_2D[type];
    var pts = [];
    for (var i = 0; i < n; i++) {
      var x = 0.05 + 0.9 * rng();
      // the noise draw is ALWAYS consumed, so the same seed yields the same
      // x-positions at every noise level (the UI noise slider relies on this)
      var y = f(x) + (2 * rng() - 1) * noise;
      y = Math.max(0.02, Math.min(0.98, y));
      pts.push([x, y]);
    }
    return pts;
  }
  // 3D: n points (x, y, z), x,y in [0.05, 0.95].
  var SURFACES_3D = {
    planar: function (x, y) { return 0.15 + 0.4 * x + 0.3 * y; },
    bowl:   function (x, y) { return 0.15 + 0.7 * (x - 0.5) * (x - 0.5) + 0.7 * (y - 0.5) * (y - 0.5); },
    saddle: function (x, y) { return 0.5 + 0.5 * (x - 0.5) * (x - 0.5) - 0.5 * (y - 0.5) * (y - 0.5); },
    ripple: function (x, y) { return 0.5 + 0.25 * Math.sin(2 * Math.PI * x) * Math.sin(2 * Math.PI * y); }
  };
  function gen3D(type, n, noise, seed) {
    var rng = makeRng(seed);
    var f = SURFACES_3D[type];
    var pts = [];
    for (var i = 0; i < n; i++) {
      var x = 0.05 + 0.9 * rng();
      var y = 0.05 + 0.9 * rng();
      var z = f(x, y) + (2 * rng() - 1) * noise;
      z = Math.max(0.02, Math.min(0.98, z));
      pts.push([x, y, z]);
    }
    return pts;
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
      if (u.length !== v.length) return false;
      for (var i = 0; i < u.length; i++) if (Math.abs(u[i] - v[i]) > tol) return false;
      return true;
    }

    // ---- T1: helpers ----
    check('T1 dot pin', dot([1, 2, 3], [4, -5, 6]) === 12);
    check('T1 matVec pin', vClose(matVec([[1, 2], [3, 4]], [1, 1]), [3, 7], 0));
    check('T1 matTVec pin', vClose(matTVec([[1, 2], [3, 4]], [1, 1]), [4, 6], 0));
    check('T1 column pin', vClose(column([[1, 2], [3, 4]], 1), [2, 4], 0));
    check('T1 vandermonde pin', JSON.stringify(vandermonde([2], 3)) === '[[1,2,4,8]]');
    check('T1 surfaceDesign plane pin', JSON.stringify(surfaceDesign([[2, 3]], 'plane')) === '[[1,2,3]]');
    check('T1 surfaceDesign quad pin', JSON.stringify(surfaceDesign([[2, 3]], 'quad')) === '[[1,2,3,4,6,9]]');
    check('T1 distinctCount pin', distinctCount([0.1, 0.1, 0.7]) === 2 && distinctCount([1, 2, 3]) === 3);
    // back substitution pin: R = [[2,1],[0,4]], c = [4, 8] -> x = [1, 2]
    check('T1 backSub pin', vClose(backSub([[2, 1], [0, 4]], [4, 8]), [1, 2], 1e-15));

    // ---- T2: QR factorization ----
    var X2 = [[1, 0], [1, 1], [1, 2]];
    var f2 = qr(X2);
    check('T2 qr ok', f2.ok === true);
    if (f2.ok) {
      // Q^T Q = I
      var maxDev = 0;
      for (var a2 = 0; a2 < f2.p; a2++) {
        for (var b2 = 0; b2 < f2.p; b2++) {
          maxDev = Math.max(maxDev, Math.abs(dot(f2.Q[a2], f2.Q[b2]) - (a2 === b2 ? 1 : 0)));
        }
      }
      check('T2 QtQ = I', maxDev <= 1e-12, maxDev);
      // reconstruction X = QR
      var recDev = 0;
      for (var i2 = 0; i2 < 3; i2++) {
        for (var j2 = 0; j2 < 2; j2++) {
          var s2 = 0;
          for (var k2 = 0; k2 < 2; k2++) s2 += f2.Q[k2][i2] * f2.R[k2][j2];
          recDev = Math.max(recDev, Math.abs(s2 - X2[i2][j2]));
        }
      }
      check('T2 QR = X', recDev <= 1e-12, recDev);
      // positive diagonal (the page's theorem asserts this normalization exists)
      check('T2 R diag positive', f2.R[0][0] > 0 && f2.R[1][1] > 0);
      check('T2 R upper triangular', f2.R[1][0] === 0);
      // value pins: r11 = ||(1,1,1)|| = sqrt(3)
      check('T2 R[0][0] = sqrt(3)', Math.abs(f2.R[0][0] - Math.sqrt(3)) <= 1e-14);
    }
    // seeded random QR properties
    var rng2 = makeRng(30001);
    for (var t2 = 0; t2 < 10; t2++) {
      var m2 = 5 + Math.floor(4 * rng2());
      var Xr = [];
      for (var r2 = 0; r2 < m2; r2++) Xr.push([1, rng2(), rng2()]);
      var fr = qr(Xr);
      check('T2 random qr ok #' + t2, fr.ok === true);
      if (!fr.ok) continue;
      var dev2 = 0;
      for (var a3 = 0; a3 < 3; a3++) {
        for (var b3 = 0; b3 < 3; b3++) {
          dev2 = Math.max(dev2, Math.abs(dot(fr.Q[a3], fr.Q[b3]) - (a3 === b3 ? 1 : 0)));
        }
      }
      check('T2 random QtQ = I #' + t2, dev2 <= 1e-10, dev2);
      check('T2 random R diag positive #' + t2, fr.R[0][0] > 0 && fr.R[1][1] > 0 && fr.R[2][2] > 0);
    }
    // negative controls: dependence must be flagged, never pivoted around
    check('T2n underdetermined (n < p) flagged', qr([[1, 0.3, 0.09]]).ok === false);
    check('T2n duplicate columns flagged', qr([[1, 1], [2, 2], [3, 3]]).ok === false);
    var Xdep = vandermonde([0.3, 0.3, 0.7], 2); // 2 distinct x, 3 columns
    check('T2n Vandermonde with repeated x flagged (float-noise tolerance)',
      qr(Xdep).ok === false && qr(Xdep).failedIndex === 2);
    // ill-conditioned but genuinely independent: must NOT be false-flagged
    var xsClust = [];
    for (var c5 = 0; c5 < 20; c5++) xsClust.push(0.4 + 0.01 * c5);
    check('T2 clustered-but-distinct degree 4 not false-flagged',
      qr(vandermonde(xsClust, 4)).ok === true);

    // ---- T3: exact-fit pins ----
    // line y = 1 + 2x through 3 points
    var xs3 = [0, 1, 2];
    var ys3 = [1, 3, 5];
    var s3 = lstsq(vandermonde(xs3, 1), ys3);
    check('T3 line recovery', s3.ok && vClose(s3.beta, [1, 2], 1e-12));
    check('T3 line residual 0', s3.ok && s3.lsError <= 1e-12);
    // parabola y = 2 - x + 0.5 x^2 through 4 points
    var xs3b = [0, 1, 2, 3];
    var ys3b = xs3b.map(function (x) { return 2 - x + 0.5 * x * x; });
    var s3b = lstsq(vandermonde(xs3b, 2), ys3b);
    check('T3 parabola recovery', s3b.ok && vClose(s3b.beta, [2, -1, 0.5], 1e-10));
    // hand-checkable overdetermined pin: points (0,0), (1,1), (2,1), degree 1.
    // X^T X = [[3,3],[3,5]], X^T y = [2,3] -> beta = (1/6, 1/2)
    var s3c = lstsq(vandermonde([0, 1, 2], 1), [0, 1, 1]);
    check('T3 overdetermined value pin', s3c.ok && vClose(s3c.beta, [1 / 6, 1 / 2], 1e-12));
    check('T3 overdetermined SSE pin (1/6)', s3c.ok && Math.abs(s3c.sse - 1 / 6) <= 1e-12);
    // quadratic surface with an xy term: z = 0.2 + 0.3xy
    var ptsXY = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5], [0.3, 0.8], [0.9, 0.2]];
    var zXY = ptsXY.map(function (q) { return 0.2 + 0.3 * q[0] * q[1]; });
    var sXY = lstsq(surfaceDesign(ptsXY, 'quad'), zXY);
    check('T3 quad-surface xy recovery', sXY.ok && vClose(sXY.beta, [0.2, 0, 0, 0, 0.3, 0], 1e-9));

    // ---- T4: normal-equations certificate X^T (y - X beta) = 0 ----
    var rng4 = makeRng(30002);
    for (var t4 = 0; t4 < 15; t4++) {
      var deg4 = 1 + (t4 % 3);
      var n4 = deg4 + 3 + Math.floor(6 * rng4());
      var xs4 = [], ys4 = [];
      for (var i4 = 0; i4 < n4; i4++) { xs4.push(rng4()); ys4.push(rng4()); }
      var X4 = vandermonde(xs4, deg4);
      var s4 = lstsq(X4, ys4);
      check('T4 lstsq ok #' + t4, s4.ok === true);
      if (!s4.ok) continue;
      var sc4 = 1 + Math.sqrt(dot(ys4, ys4)) * n4;
      check('T4 XtResid ~ 0 #' + t4, s4.xtResidNorm <= 1e-9 * sc4, s4.xtResidNorm);
      check('T4 sse consistency #' + t4, Math.abs(s4.sse - dot(s4.resid, s4.resid)) === 0);
      check('T4 mse consistency #' + t4, Math.abs(s4.mse - s4.sse / n4) <= 1e-15 * (1 + s4.sse));
    }

    // ---- T5: optimality (D-least_squares_solution enactment) ----
    // SSE(beta + delta) - SSE(beta) = ||X delta||^2 > 0 for delta != 0
    var rng5 = makeRng(30003);
    for (var t5 = 0; t5 < 10; t5++) {
      var xs5 = [], ys5 = [];
      for (var i5 = 0; i5 < 8; i5++) { xs5.push(rng5()); ys5.push(rng5()); }
      var X5 = vandermonde(xs5, 2);
      var s5 = lstsq(X5, ys5);
      if (!s5.ok) { check('T5 setup ok #' + t5, false); continue; }
      for (var j5 = 0; j5 < 5; j5++) {
        var delta = [rng5() - 0.5, rng5() - 0.5, rng5() - 0.5];
        var dn = norm(delta);
        if (dn < 0.05) delta[0] += 0.1;
        var betaP = [s5.beta[0] + delta[0], s5.beta[1] + delta[1], s5.beta[2] + delta[2]];
        var residP = sub(ys5, matVec(X5, betaP));
        check('T5 perturbed SSE strictly larger #' + t5 + '.' + j5,
          dot(residP, residP) > s5.sse);
      }
    }

    // ---- T6: two independent routes agree (QR vs normal equations) ----
    var rng6 = makeRng(30004);
    for (var t6 = 0; t6 < 12; t6++) {
      var deg6 = 1 + (t6 % 2);
      var xs6 = [], ys6 = [];
      for (var i6 = 0; i6 < 10; i6++) { xs6.push(0.05 + 0.9 * rng6()); ys6.push(rng6()); }
      var X6 = vandermonde(xs6, deg6);
      var qrRoute = lstsq(X6, ys6);
      var neRoute = normalEqSolve(X6, ys6);
      check('T6 both routes ok #' + t6, qrRoute.ok && neRoute.ok);
      if (qrRoute.ok && neRoute.ok) {
        check('T6 routes agree #' + t6, vClose(qrRoute.beta, neRoute.beta, 1e-7 * (1 + norm(qrRoute.beta))));
      }
    }
    // normal-equation route must FLAG singular systems (v1 pivot-skip bug class)
    check('T6n normalEq flags dependent columns',
      normalEqSolve([[1, 1], [2, 2], [3, 3]], [1, 2, 3]).ok === false);
    check('T6n normalEq flags repeated-x Vandermonde',
      normalEqSolve(vandermonde([0.3, 0.3, 0.7], 2), [1, 2, 3]).ok === false);

    // ---- T7: interpolation regime n = p ----
    var s7 = lstsq(vandermonde([0.1, 0.5, 0.9], 2), [0.3, 0.8, 0.2]);
    check('T7 n = p flagged as interpolating', s7.ok && s7.interpolating === true);
    check('T7 interpolation residual 0', s7.ok && s7.lsError <= 1e-10);
    var s7b = lstsq(vandermonde([0.1, 0.4, 0.6, 0.9], 2), [0.3, 0.8, 0.2, 0.5]);
    check('T7 n > p not interpolating', s7b.ok && s7b.interpolating === false);

    // ---- T8: rank-deficiency honesty through lstsq ----
    var s8u = lstsq(vandermonde([0.3, 0.7], 4), [1, 2]);
    check('T8 n < p refused', s8u.ok === false);
    check('T8 n < p reason is underdetermined (drives the UI message)',
      s8u.reason === 'underdetermined');
    var s8r = lstsq(vandermonde([0.2, 0.2, 0.2, 0.8], 2), [1, 2, 3, 4]);
    check('T8 repeated x refused', s8r.ok === false);
    check('T8 repeated x reason is dependent', s8r.reason === 'dependent');
    var q8 = lstsq(surfaceDesign([[0.1, 0.1], [0.5, 0.5], [0.9, 0.9], [0.2, 0.2], [0.7, 0.7], [0.4, 0.4]], 'quad'),
                   [1, 2, 3, 4, 5, 6]);
    check('T8 collinear (x=y) quad surface refused', q8.ok === false);

    // ---- T9: dataset generators ----
    check('T9 deterministic 2D', JSON.stringify(gen2D('linear', 8, 0.05, 42)) ===
      JSON.stringify(gen2D('linear', 8, 0.05, 42)));
    // x-positions must be identical across noise levels for the same seed
    // (the UI noise slider sweeps noise over a FIXED sample)
    check('T9 x-positions stable across noise levels',
      JSON.stringify(gen2D('linear', 8, 0, 42).map(function (q) { return q[0]; })) ===
      JSON.stringify(gen2D('linear', 8, 0.12, 42).map(function (q) { return q[0]; })));
    check('T9 3D xy-positions stable across noise levels',
      JSON.stringify(gen3D('saddle', 8, 0, 42).map(function (q) { return [q[0], q[1]]; })) ===
      JSON.stringify(gen3D('saddle', 8, 0.12, 42).map(function (q) { return [q[0], q[1]]; })));
    check('T9 different seeds differ', JSON.stringify(gen2D('linear', 8, 0.05, 42)) !==
      JSON.stringify(gen2D('linear', 8, 0.05, 43)));
    var types2 = ['linear', 'quadratic', 'cubic', 'sinusoidal'];
    for (var t9 = 0; t9 < types2.length; t9++) {
      var d9 = gen2D(types2[t9], 20, 0, 500 + t9);
      var inRange = true, onCurve = true;
      for (var i9 = 0; i9 < d9.length; i9++) {
        if (d9[i9][0] < 0.05 || d9[i9][0] > 0.95 || d9[i9][1] < 0.02 || d9[i9][1] > 0.98) inRange = false;
        if (Math.abs(d9[i9][1] - CURVES_2D[types2[t9]](d9[i9][0])) > 1e-12) onCurve = false;
      }
      check('T9 2D ' + types2[t9] + ' in range', inRange);
      check('T9 2D ' + types2[t9] + ' noiseless points ON the curve', onCurve);
      // exact recovery: fitting the matching degree recovers the curve residual-free
      var degMap = { linear: 1, quadratic: 2, cubic: 3 };
      if (degMap[types2[t9]]) {
        var s9 = lstsq(vandermonde(d9.map(function (q) { return q[0]; }), degMap[types2[t9]]),
                       d9.map(function (q) { return q[1]; }));
        check('T9 ' + types2[t9] + ' exact recovery', s9.ok && s9.lsError <= 1e-8);
      }
      var dn9 = gen2D(types2[t9], 20, 0.1, 600 + t9);
      var moved = false;
      for (var i9b = 0; i9b < dn9.length; i9b++) {
        if (Math.abs(dn9[i9b][1] - CURVES_2D[types2[t9]](dn9[i9b][0])) > 1e-6) moved = true;
      }
      check('T9 2D ' + types2[t9] + ' noise parameter is live', moved);
    }
    var types3 = ['planar', 'bowl', 'saddle', 'ripple'];
    for (var t9c = 0; t9c < types3.length; t9c++) {
      var d3 = gen3D(types3[t9c], 24, 0, 700 + t9c);
      var ok3 = true;
      for (var i9c = 0; i9c < d3.length; i9c++) {
        var q3 = d3[i9c];
        if (q3[0] < 0.05 || q3[0] > 0.95 || q3[1] < 0.05 || q3[1] > 0.95 ||
            q3[2] < 0.02 || q3[2] > 0.98) ok3 = false;
        if (Math.abs(q3[2] - SURFACES_3D[types3[t9c]](q3[0], q3[1])) > 1e-12) ok3 = false;
      }
      check('T9 3D ' + types3[t9c] + ' in range and on surface', ok3);
    }
    check('T9 deterministic 3D', JSON.stringify(gen3D('saddle', 10, 0.05, 42)) ===
      JSON.stringify(gen3D('saddle', 10, 0.05, 42)));

    // ---- T10: surface fits ----
    // exact plane recovery: z = 0.15 + 0.4x + 0.3y
    var d10 = gen3D('planar', 12, 0, 800);
    var s10 = lstsq(surfaceDesign(d10.map(function (q) { return [q[0], q[1]]; }), 'plane'),
                    d10.map(function (q) { return q[2]; }));
    check('T10 plane recovery', s10.ok && vClose(s10.beta, [0.15, 0.4, 0.3], 1e-9));
    check('T10 plane residual 0', s10.ok && s10.lsError <= 1e-10);
    // exact bowl recovery with the quad model:
    // 0.15 + 0.7(x-.5)^2 + 0.7(y-.5)^2 = 0.5 - 0.7x - 0.7y + 0.7x^2 + 0*xy + 0.7y^2
    var d10b = gen3D('bowl', 16, 0, 801);
    var s10b = lstsq(surfaceDesign(d10b.map(function (q) { return [q[0], q[1]]; }), 'quad'),
                     d10b.map(function (q) { return q[2]; }));
    check('T10 bowl quad recovery', s10b.ok && vClose(s10b.beta, [0.5, -0.7, -0.7, 0.7, 0, 0.7], 1e-8));
    // saddle: quad model exact, plane model underfits (the model-mismatch story)
    var d10c = gen3D('saddle', 24, 0, 802);
    var pts10c = d10c.map(function (q) { return [q[0], q[1]]; });
    var z10c = d10c.map(function (q) { return q[2]; });
    var sQuad = lstsq(surfaceDesign(pts10c, 'quad'), z10c);
    var sPlane = lstsq(surfaceDesign(pts10c, 'plane'), z10c);
    check('T10 saddle quad exact', sQuad.ok && sQuad.lsError <= 1e-9);
    check('T10 saddle plane underfits (SSE > 0.005)', sPlane.ok && sPlane.sse > 0.005, sPlane.ok ? sPlane.sse : 'fail');
    check('T10 plane XtResid still ~ 0 (best plane is still a least-squares fit)',
      sPlane.ok && sPlane.xtResidNorm <= 1e-9 * 30);
    // predictSurface consistency with the design matrix
    check('T10 predictSurface quad pin',
      Math.abs(predictSurface([1, 2, 3, 4, 5, 6], 'quad', 0.5, 0.25) -
        (1 + 2 * 0.5 + 3 * 0.25 + 4 * 0.25 + 5 * 0.125 + 6 * 0.0625)) <= 1e-15);
    check('T10 predictPoly pin', predictPoly([1, 2, 3], 2) === 1 + 4 + 12);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  return {
    makeRng: makeRng,
    dot: dot, norm: norm, scale: scale, sub: sub,
    matVec: matVec, matTVec: matTVec, column: column,
    vandermonde: vandermonde,
    surfaceDesign: surfaceDesign,
    surfaceTermCount: surfaceTermCount,
    predictPoly: predictPoly,
    predictSurface: predictSurface,
    distinctCount: distinctCount,
    qr: qr,
    backSub: backSub,
    lstsq: lstsq,
    normalEqSolve: normalEqSolve,
    gen2D: gen2D,
    gen3D: gen3D,
    CURVES_2D: CURVES_2D,
    SURFACES_3D: SURFACES_3D,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = LsqCore; }
// ============================================================================
// UI layer — polynomial regression (2D) + plane/quadratic surface regression
// (3D, three.js lazy-loaded on first use, only after the mathematical gate
// has passed). Renders only what LsqCore computes: the solver is the QR
// route; rank deficiency is reported, never papered over. Prefix: lrv-.
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
    axis: 'rgba(255, 255, 255, 0.3)',
    point: '#3498db',
    curve: '#e74c3c',
    resid: '#2ecc71',
    squareFill: 'rgba(46, 204, 113, 0.15)',
    squareStroke: 'rgba(46, 204, 113, 0.5)',
    bad: '#ef5350',
    warn: '#ffc857',
    pointHex: 0x3498db, surfHex: 0xe74c3c, residHex: 0x2ecc71, sqHex: 0x2ecc71
  };
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  var SEED2 = 2001, SEED3 = 3001;

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }
  function fmtSm(x) {
    var a = Math.abs(x);
    return (a !== 0 && a < 1e-3) ? x.toExponential(1) : fmt(x, 4);
  }
  // sign-folded polynomial / surface equations from core coefficients
  function foldTerms(pairs) { // pairs: [coef, 'x<sup>2</sup>' or '']
    var out = '';
    for (var i = 0; i < pairs.length; i++) {
      var c = pairs[i][0], sym = pairs[i][1];
      var mag = fmt(Math.abs(c), 3);
      if (i === 0) out += (c < 0 ? '\u2212' : '') + mag + sym;
      else out += (c < 0 ? ' \u2212 ' : ' + ') + mag + sym;
    }
    return out;
  }
  function polyEquation(beta) {
    var pairs = [[beta[0], '']];
    for (var d = 1; d < beta.length; d++) {
      pairs.push([beta[d], d === 1 ? 'x' : 'x<sup>' + d + '</sup>']);
    }
    return '\u0177 = ' + foldTerms(pairs);
  }
  function surfaceEquation(beta, model) {
    var syms = model === 'plane' ? ['', 'x', 'y'] :
      ['', 'x', 'y', 'x<sup>2</sup>', 'xy', 'y<sup>2</sup>'];
    var pairs = [];
    for (var i = 0; i < syms.length; i++) pairs.push([beta[i], syms[i]]);
    return '\u1E91 = ' + foldTerms(pairs);
  }

  function init() {
    var container = document.getElementById('linear-regression-visualizer');
    if (!container) return;
    if (container.dataset.lrvInit) return;
    container.dataset.lrvInit = '1';

    // ---------- gate: broken math never renders, and never loads the CDN ----------
    var gate;
    try { gate = LsqCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown')], count: 0 }; }
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + String(shown[gi]).replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="lrv-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
        ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
        '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
        gate.failures.length + ' of ' + gate.count + ' checks).</strong>' +
        '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render ' +
        'rather than display incorrect mathematics. Failures:</p>' +
        '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
      return;
    }

    // ---------- DOM ----------
    container.innerHTML =
      '<div class="lrv-root">' +
        '<div class="lrv-canvaswrap">' +
          '<label class="lrv-toggle"><input type="checkbox" id="lrv-3d"> 3D mode (two features: fit a surface z = f(x, y))</label>' +
          '<div id="lrv-instruction" class="lrv-instruction"></div>' +
          '<canvas id="lrv-canvas"></canvas>' +
          '<div id="lrv-3d-holder" class="lrv-holder" style="display:none;"></div>' +
          '<button id="lrv-view-reset" class="lrv-secondary" style="display:none;margin-top:8px;">Reset view</button>' +
          '<div class="lrv-legend">' +
            '<div class="lrv-li"><span class="lrv-sw" style="background:' + C.point + ';"></span>Data points</div>' +
            '<div class="lrv-li"><span class="lrv-sw" style="background:' + C.curve + ';"></span>Least-squares fit \u0177 = X\u03B2\u0302</div>' +
            '<div class="lrv-li"><span class="lrv-sw" style="background:' + C.resid + ';"></span>Residuals \u03B5\u1D62 = y\u1D62 \u2212 \u0177\u1D62</div>' +
            '<div class="lrv-li"><span class="lrv-sw" style="background:' + C.squareFill + ';border:1px solid ' + C.squareStroke + ';"></span>Squared errors \u03B5\u1D62\u00B2 (the areas being minimized)</div>' +
          '</div>' +
        '</div>' +
        '<div class="lrv-controls">' +
          '<div id="lrv-readouts" class="lrv-group lrv-readouts"></div>' +
          '<div class="lrv-group" id="lrv-2d-model">' +
            '<label for="lrv-degree">Polynomial degree (p = degree + 1 parameters):</label>' +
            '<select id="lrv-degree" class="lrv-full">' +
              '<option value="1">Linear (degree 1)</option>' +
              '<option value="2">Quadratic (degree 2)</option>' +
              '<option value="3">Cubic (degree 3)</option>' +
              '<option value="4">Quartic (degree 4)</option>' +
            '</select>' +
          '</div>' +
          '<div class="lrv-group" id="lrv-3d-model" style="display:none;">' +
            '<label for="lrv-model">Surface model:</label>' +
            '<select id="lrv-model" class="lrv-full">' +
              '<option value="plane">Plane: 1, x, y (p = 3)</option>' +
              '<option value="quad">Quadratic: 1, x, y, x\u00B2, xy, y\u00B2 (p = 6)</option>' +
            '</select>' +
          '</div>' +
          '<div class="lrv-group">' +
            '<label>Sample:</label>' +
            '<div id="lrv-ds-2d" class="lrv-btnrow">' +
              '<button class="lrv-ds" data-ds="linear">Linear</button>' +
              '<button class="lrv-ds" data-ds="quadratic">Quadratic</button>' +
              '<button class="lrv-ds" data-ds="cubic">Cubic</button>' +
              '<button class="lrv-ds" data-ds="sinusoidal">Sinusoidal</button>' +
            '</div>' +
            '<div id="lrv-ds-3d" class="lrv-btnrow" style="display:none;">' +
              '<button class="lrv-ds3" data-ds="planar">Planar</button>' +
              '<button class="lrv-ds3" data-ds="bowl">Bowl</button>' +
              '<button class="lrv-ds3" data-ds="saddle">Saddle</button>' +
              '<button class="lrv-ds3" data-ds="ripple">Ripple</button>' +
            '</div>' +
            '<div class="lrv-inline"><label for="lrv-n" style="margin:0;">Points n:</label>' +
              '<select id="lrv-n"><option>8</option><option selected>16</option><option>32</option></select>' +
              '<button id="lrv-resample" class="lrv-secondary lrv-inlinebtn">New sample</button>' +
              '<button id="lrv-clear" class="lrv-secondary lrv-inlinebtn">Clear</button></div>' +
            '<div class="lrv-inline"><label for="lrv-noise" style="margin:0;">Noise:</label>' +
              '<input type="range" id="lrv-noise" min="0" max="0.15" step="0.01" value="0.05">' +
              '<span id="lrv-noise-val" class="lrv-sub">0.05</span></div>' +
          '</div>' +
          '<div class="lrv-group">' +
            '<label class="lrv-toggle"><input type="checkbox" id="lrv-resid" checked> Show residuals</label>' +
            '<label class="lrv-toggle"><input type="checkbox" id="lrv-squares"> Show squared errors</label>' +
            '<label class="lrv-toggle" id="lrv-surface-toggle" style="display:none;"><input type="checkbox" id="lrv-surface" checked> Show fitted surface</label>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#linear-regression-visualizer .lrv-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
      '@media (min-width: 992px){#linear-regression-visualizer .lrv-root{flex-direction:row;align-items:flex-start;}' +
      '#linear-regression-visualizer .lrv-canvaswrap{flex:3;}#linear-regression-visualizer .lrv-controls{flex:2;max-width:430px;}}' +
      '#linear-regression-visualizer .lrv-canvaswrap,#linear-regression-visualizer .lrv-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#linear-regression-visualizer .lrv-controls{box-shadow:0 8px 32px rgba(0,0,0,0.3);}' +
      '#linear-regression-visualizer #lrv-canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;cursor:crosshair;}' +
      '#linear-regression-visualizer .lrv-holder{width:100%;border:1px solid ' + C.borderStrong + ';border-radius:4px;overflow:hidden;background:' + C.bg + ';touch-action:none;}' +
      '#linear-regression-visualizer .lrv-holder canvas{display:block;}' +
      '#linear-regression-visualizer .lrv-instruction{color:' + C.faint + ';font-size:0.85rem;margin:8px 0;}' +
      '#linear-regression-visualizer .lrv-legend{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.85rem;color:' + C.textDim + ';}' +
      '@media (max-width: 600px){#linear-regression-visualizer .lrv-legend{grid-template-columns:1fr;}}' +
      '#linear-regression-visualizer .lrv-li{display:flex;align-items:center;}' +
      '#linear-regression-visualizer .lrv-sw{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:2px;flex:none;}' +
      '#linear-regression-visualizer .lrv-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
      '#linear-regression-visualizer .lrv-group label{display:block;font-weight:bold;margin-bottom:8px;color:' + C.textDim + ';font-size:0.85rem;}' +
      '#linear-regression-visualizer .lrv-full{width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;}' +
      '#linear-regression-visualizer select option{background-color:#141c28;color:' + C.text + ';}' +
      '#linear-regression-visualizer #lrv-n{padding:6px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;}' +
      '#linear-regression-visualizer .lrv-btnrow{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}' +
      '#linear-regression-visualizer .lrv-ds,#linear-regression-visualizer .lrv-ds3{flex:1;min-width:70px;padding:8px 6px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.85rem;}' +
      '#linear-regression-visualizer .lrv-ds.lrv-active,#linear-regression-visualizer .lrv-ds3.lrv-active{background:linear-gradient(135deg,#1565c0,#42a5f5);border-color:transparent;color:#fff;font-weight:bold;}' +
      '#linear-regression-visualizer .lrv-inline{display:flex;align-items:center;gap:8px;margin-top:8px;}' +
      '#linear-regression-visualizer .lrv-inline input[type=range]{flex:1;}' +
      '#linear-regression-visualizer .lrv-inlinebtn{width:auto;flex:1;margin-top:0;padding:8px;}' +
      '#linear-regression-visualizer .lrv-secondary{background:rgba(255,255,255,0.08);border:1px solid ' + C.borderStrong + ';color:' + C.text + ';border-radius:4px;cursor:pointer;font-weight:bold;padding:8px;}' +
      '#linear-regression-visualizer .lrv-secondary:hover{background:rgba(255,255,255,0.12);}' +
      '#linear-regression-visualizer .lrv-toggle{display:flex !important;align-items:center;gap:8px;font-weight:normal !important;margin-bottom:6px;cursor:pointer;}' +
      '#linear-regression-visualizer .lrv-readouts{font-size:0.92rem;line-height:1.55;}' +
      '#linear-regression-visualizer .lrv-readouts .lrv-formula{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#linear-regression-visualizer .lrv-sub{color:' + C.faint + ';font-size:0.85rem;}' +
      '#linear-regression-visualizer .lrv-status-warn{color:' + C.warn + ';font-weight:bold;}' +
      '#linear-regression-visualizer .lrv-status-ok{color:' + C.resid + ';font-weight:bold;}';
    document.head.appendChild(style);

    var canvas = document.getElementById('lrv-canvas');
    var ctx = canvas.getContext('2d');
    var holder = document.getElementById('lrv-3d-holder');
    var check3d = document.getElementById('lrv-3d');
    var instructionEl = document.getElementById('lrv-instruction');
    var readoutsEl = document.getElementById('lrv-readouts');
    var degreeSel = document.getElementById('lrv-degree');
    var modelSel = document.getElementById('lrv-model');
    var nSel = document.getElementById('lrv-n');
    var noiseSlider = document.getElementById('lrv-noise');
    var noiseVal = document.getElementById('lrv-noise-val');
    var residChk = document.getElementById('lrv-resid');
    var squaresChk = document.getElementById('lrv-squares');
    var surfaceChk = document.getElementById('lrv-surface');
    var viewResetBtn = document.getElementById('lrv-view-reset');

    var state = {
      is3d: false,
      // 2D
      ds2: 'linear', seed2Off: 0, data2: LsqCore.gen2D('linear', 16, 0.05, SEED2), custom2: [],
      degree: 1,
      // 3D
      ds3: 'planar', seed3Off: 0, data3: LsqCore.gen3D('planar', 16, 0.05, SEED3),
      model: 'plane',
      // shared
      n: 16, noise: 0.05,
      threeReady: false, threeFailed: false,
      cssW: 640, cssH: 400
    };
    var T = null; // three.js objects once built

    // =====================================================================
    // 2D plot
    // =====================================================================
    var PAD = 42;
    function plotRect() {
      return { x0: PAD, y0: 12, w: state.cssW - PAD - 12, h: state.cssH - PAD - 12 };
    }
    function d2c(p) { // data [0,1]^2 -> canvas px
      var r = plotRect();
      return [r.x0 + p[0] * r.w, r.y0 + (1 - p[1]) * r.h];
    }
    function c2d(q) {
      var r = plotRect();
      return [(q[0] - r.x0) / r.w, 1 - (q[1] - r.y0) / r.h];
    }

    function sizeCanvas() {
      var parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
      var cssW = parentW > 0 ? Math.max(320, Math.min(760, parentW - 30)) : 640;
      var cssH = Math.round(cssW * 5 / 8);
      state.cssW = cssW; state.cssH = cssH;
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function points2() { return state.data2.concat(state.custom2); }

    function fit2() {
      var pts = points2();
      if (pts.length === 0) return { empty: true };
      var xs = pts.map(function (q) { return q[0]; });
      var ys = pts.map(function (q) { return q[1]; });
      var X = LsqCore.vandermonde(xs, state.degree);
      var s = LsqCore.lstsq(X, ys);
      s.pts = pts; s.xs = xs;
      return s;
    }

    function draw2() {
      var r = plotRect();
      ctx.clearRect(0, 0, state.cssW, state.cssH);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, state.cssW, state.cssH);
      // grid + ticks
      ctx.lineWidth = 1;
      ctx.font = '11px system-ui, sans-serif';
      for (var g = 0; g <= 10; g++) {
        var t = g / 10;
        var px = r.x0 + t * r.w, py = r.y0 + (1 - t) * r.h;
        ctx.strokeStyle = (g === 0) ? C.axis : C.grid;
        ctx.beginPath(); ctx.moveTo(px, r.y0); ctx.lineTo(px, r.y0 + r.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r.x0, py); ctx.lineTo(r.x0 + r.w, py); ctx.stroke();
        if (g % 2 === 0) {
          ctx.fillStyle = C.faint;
          ctx.fillText(fmt(t, 1), px - 8, r.y0 + r.h + 16);
          ctx.fillText(fmt(t, 1), r.x0 - 26, py + 4);
        }
      }
      ctx.fillStyle = C.textDim;
      ctx.fillText('x', r.x0 + r.w - 6, r.y0 + r.h + 30);
      ctx.fillText('y', r.x0 - 30, r.y0 + 8);

      var s = fit2();
      container.dataset.lrvPoints = JSON.stringify(points2());
      var showFit = !s.empty && s.ok;

      if (showFit) {
        // residuals + squared errors
        for (var i = 0; i < s.pts.length; i++) {
          var pd = s.pts[i];
          var ph = [pd[0], s.yhat[i]];
          if (squaresChk.checked) {
            var e = s.resid[i];
            var a = d2c([pd[0], Math.min(pd[1], ph[1])]);
            var sidePx = Math.abs(d2c([0, 0])[1] - d2c([0, Math.abs(e)])[1]);
            // square whose one side IS the residual segment; extend toward the plot interior
            var dir = pd[0] > 0.5 ? -1 : 1;
            ctx.fillStyle = C.squareFill;
            ctx.strokeStyle = C.squareStroke;
            ctx.lineWidth = 1;
            var xLeft = dir > 0 ? a[0] : a[0] - sidePx;
            ctx.fillRect(xLeft, a[1] - sidePx, sidePx, sidePx);
            ctx.strokeRect(xLeft, a[1] - sidePx, sidePx, sidePx);
          }
          if (residChk.checked) {
            var c1 = d2c(pd), c2 = d2c(ph);
            ctx.strokeStyle = C.resid;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke();
          }
        }
        // fitted curve, sampled across the domain
        ctx.strokeStyle = C.curve;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        var started = false;
        for (var k = 0; k <= 200; k++) {
          var xk = k / 200;
          var yk = LsqCore.predictPoly(s.beta, xk);
          if (yk < -0.25 || yk > 1.25) { started = false; continue; }
          var pc = d2c([xk, yk]);
          if (!started) { ctx.moveTo(pc[0], pc[1]); started = true; }
          else ctx.lineTo(pc[0], pc[1]);
        }
        ctx.stroke();
      }
      // points on top
      var ptsAll = s.empty ? [] : s.pts;
      for (var j = 0; j < ptsAll.length; j++) {
        var pc2 = d2c(ptsAll[j]);
        ctx.beginPath(); ctx.arc(pc2[0], pc2[1], 5, 0, 2 * Math.PI);
        ctx.fillStyle = C.point; ctx.fill();
        ctx.strokeStyle = '#1b6ca8'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      updateReadouts2(s);
    }

    function rankMessage(s, pNeeded) {
      if (s.reason === 'underdetermined') {
        return '<div class="lrv-status-warn">n &lt; p: fewer points (' + points2().length +
          ') than parameters (' + pNeeded + '). X\u1D40X is singular \u2014 there are infinitely many ' +
          'least-squares solutions, and picking one needs the pseudo-inverse (see the section above). ' +
          'Add more points or lower the degree.</div>';
      }
      return '<div class="lrv-status-warn">The columns of X are linearly dependent (repeated x-values), ' +
        'so X\u1D40X is singular and no unique least-squares solution exists \u2014 the pseudo-inverse ' +
        'section above covers this case. Move or remove a duplicated point.</div>';
    }

    function metricsHtml(s) {
      return '<div style="margin-top:6px;"><span class="lrv-formula">SSE = \u2016\u03B5\u2016\u00B2 = ' + fmtSm(s.sse) +
        '</span> &nbsp; <span class="lrv-formula">\u2016\u03B5\u2016 = ' + fmtSm(s.lsError) +
        '</span> &nbsp; <span class="lrv-formula">MSE = ' + fmtSm(s.mse) + '</span></div>' +
        '<div><span class="lrv-formula">\u2016X\u1D40\u03B5\u2016 = ' + fmtSm(s.xtResidNorm) + '</span>' +
        ' <span class="lrv-sub">\u2014 the residual is orthogonal to Col X: the normal equations ' +
        'X\u1D40X\u03B2\u0302 = X\u1D40Y hold, i.e. \u0177 = proj<sub>Col X</sub> Y.</span></div>';
    }

    function updateReadouts2(s) {
      var html = '';
      var n = points2().length;
      var p = state.degree + 1;
      html += '<div><strong>Polynomial fit</strong> <span class="lrv-sub">n = ' + n + ' points, p = ' + p + ' parameters</span></div>';
      if (s.empty) {
        html += '<div class="lrv-status-warn" style="margin-top:6px;">No data \u2014 click the plot to add points, or generate a sample.</div>';
      } else if (!s.ok) {
        html += rankMessage(s, p);
      } else {
        html += '<div class="lrv-formula" style="margin-top:6px;">' + polyEquation(s.beta) + '</div>';
        html += metricsHtml(s);
        if (s.interpolating) {
          html += '<div class="lrv-status-ok">n = p: exact interpolation \u2014 the residual is zero and the "fit" passes through every point.</div>';
        }
      }
      readoutsEl.innerHTML = html;
    }

    // click: add point, or remove a nearby one
    canvas.addEventListener('click', function (ev) {
      if (state.is3d) return;
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var cx = (ev.clientX - rect.left) * (state.cssW / rect.width);
      var cy = (ev.clientY - rect.top) * (state.cssH / rect.height);
      var d = c2d([cx, cy]);
      if (d[0] < 0 || d[0] > 1 || d[1] < 0 || d[1] > 1) return;
      // remove if near an existing point (canvas distance < 10 px)
      var all = points2();
      for (var i = 0; i < all.length; i++) {
        var pc = d2c(all[i]);
        if (Math.hypot(pc[0] - cx, pc[1] - cy) < 10) {
          if (i < state.data2.length) state.data2.splice(i, 1);
          else state.custom2.splice(i - state.data2.length, 1);
          draw2();
          return;
        }
      }
      state.custom2.push([Math.round(d[0] * 1000) / 1000, Math.round(d[1] * 1000) / 1000]);
      draw2();
    });

    // =====================================================================
    // 3D (three.js, lazy)
    // =====================================================================
    function loadScript(url, ok, fail) {
      var sc = document.createElement('script');
      sc.src = url; sc.onload = ok; sc.onerror = fail;
      document.head.appendChild(sc);
    }
    function ensureThree(cb) {
      if (state.threeReady) { cb(); return; }
      if (window.THREE && window.THREE.OrbitControls) { state.threeReady = true; cb(); return; }
      holder.innerHTML = '<div style="padding:16px;color:' + C.textDim + ';">Loading 3D libraries\u2026</div>';
      var fail = function () {
        state.threeFailed = true;
        holder.innerHTML = '<div class="lrv-cdnfail" style="padding:16px;color:' + C.textDim + ';">' +
          'The 3D graphics libraries could not be loaded (network or CDN issue). ' +
          'The 2D demo is unaffected \u2014 switch back, or reload the page to retry.</div>';
      };
      if (window.THREE) { loadScript(ORBIT_URL, function () { state.threeReady = true; cb(); }, fail); }
      else {
        loadScript(THREE_URL, function () {
          loadScript(ORBIT_URL, function () { state.threeReady = true; cb(); }, fail);
        }, fail);
      }
    }

    var S3 = 5; // world scale for the [0,1] domain
    function m2t(v) { return new THREE.Vector3(S3 * v[0], S3 * v[2], S3 * v[1]); }

    function build3() {
      holder.innerHTML = '';
      var W0 = holder.clientWidth > 0 ? holder.clientWidth : 640;
      var H0 = Math.round(W0 * 0.62);
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(C.bg);
      var camera = new THREE.PerspectiveCamera(50, W0 / H0, 0.1, 200);
      camera.position.set(9, 7, 9);
      camera.lookAt(2.5, 1.5, 2.5);
      var renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio((typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1);
      renderer.setSize(W0, H0);
      holder.appendChild(renderer.domElement);
      var controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.target.set(2.5, 1.5, 2.5);

      // static: floor grid on z = 0 over [0,1]^2, box edges, axis labels
      var stat = new THREE.Group();
      var gm = new THREE.LineBasicMaterial({ color: 0x334455 });
      for (var k = 0; k <= 10; k++) {
        var t = k / 10;
        var g1 = new THREE.BufferGeometry().setFromPoints([m2t([t, 0, 0]), m2t([t, 1, 0])]);
        stat.add(new THREE.Line(g1, gm));
        var g2 = new THREE.BufferGeometry().setFromPoints([m2t([0, t, 0]), m2t([1, t, 0])]);
        stat.add(new THREE.Line(g2, gm));
      }
      var em = new THREE.LineBasicMaterial({ color: 0x8899aa });
      var edges = [
        [[0, 0, 0], [1, 0, 0]], [[0, 0, 0], [0, 1, 0]], [[0, 0, 0], [0, 0, 1]],
        [[1, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 0, 1]], [[0, 1, 0], [0, 1, 1]]
      ];
      for (var e = 0; e < edges.length; e++) {
        var ge = new THREE.BufferGeometry().setFromPoints([m2t(edges[e][0]), m2t(edges[e][1])]);
        stat.add(new THREE.Line(ge, em));
      }
      function textSprite(text, mathPos, color) {
        var cnv = document.createElement('canvas');
        var w = 16 + 13 * text.length, h = 32;
        cnv.width = w; cnv.height = h;
        var c2 = cnv.getContext('2d');
        c2.font = 'bold 20px system-ui, sans-serif';
        c2.fillStyle = color;
        c2.fillText(text, 6, 23);
        var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv), transparent: true }));
        sprite.position.copy(m2t(mathPos));
        sprite.scale.set(w / 42, h / 42, 1);
        return sprite;
      }
      stat.add(textSprite('x', [1.08, 0, 0], '#e8eaed'));
      stat.add(textSprite('y', [0, 1.08, 0], '#e8eaed'));
      stat.add(textSprite('z', [0, 0, 1.08], '#e8eaed'));
      scene.add(stat);

      var dyn = new THREE.Group();
      scene.add(dyn);

      T = {
        scene: scene, camera: camera, renderer: renderer, controls: controls,
        dyn: dyn,
        clearDyn: function () { scene.remove(dyn); dyn = new THREE.Group(); scene.add(dyn); T.dyn = dyn; }
      };

      viewResetBtn.addEventListener('click', function () {
        camera.position.set(9, 7, 9);
        controls.target.set(2.5, 1.5, 2.5);
        camera.lookAt(2.5, 1.5, 2.5);
        controls.update();
      });

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    }

    function fit3() {
      var pts = state.data3;
      if (pts.length === 0) return { empty: true };
      var xy = pts.map(function (q) { return [q[0], q[1]]; });
      var zs = pts.map(function (q) { return q[2]; });
      var s = LsqCore.lstsq(LsqCore.surfaceDesign(xy, state.model), zs);
      s.pts = pts;
      return s;
    }

    function draw3() {
      if (!T) return;
      T.clearDyn();
      var dyn = T.dyn;
      var s = fit3();
      container.dataset.lrvPoints3 = JSON.stringify(state.data3);

      // points
      var sphGeo = new THREE.SphereGeometry(0.07, 12, 12);
      var sphMat = new THREE.MeshBasicMaterial({ color: C.pointHex });
      for (var i = 0; i < state.data3.length; i++) {
        var m = new THREE.Mesh(sphGeo, sphMat);
        m.position.copy(m2t(state.data3[i]));
        dyn.add(m);
      }

      if (!s.empty && s.ok) {
        // fitted surface: 24x24 grid mesh + wireframe lines
        if (surfaceChk.checked) {
          var NGRID = 24;
          var pos = [];
          var idx = [];
          for (var gy = 0; gy <= NGRID; gy++) {
            for (var gx = 0; gx <= NGRID; gx++) {
              var ux = gx / NGRID, uy = gy / NGRID;
              var uz = LsqCore.predictSurface(s.beta, state.model, ux, uy);
              uz = Math.max(-0.2, Math.min(1.2, uz));
              var pt = m2t([ux, uy, uz]);
              pos.push(pt.x, pt.y, pt.z);
            }
          }
          for (var qy = 0; qy < NGRID; qy++) {
            for (var qx = 0; qx < NGRID; qx++) {
              var i0 = qy * (NGRID + 1) + qx;
              idx.push(i0, i0 + 1, i0 + NGRID + 1, i0 + 1, i0 + NGRID + 2, i0 + NGRID + 1);
            }
          }
          var sg = new THREE.BufferGeometry();
          sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          sg.setIndex(idx);
          dyn.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({
            color: C.surfHex, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false
          })));
          // wireframe lines every 3rd grid line
          var wm = new THREE.LineBasicMaterial({ color: C.surfHex, transparent: true, opacity: 0.45 });
          for (var wy = 0; wy <= NGRID; wy += 3) {
            var line = [];
            for (var wx = 0; wx <= NGRID; wx++) {
              var vx = wx / NGRID, vy = wy / NGRID;
              line.push(m2t([vx, vy, Math.max(-0.2, Math.min(1.2, LsqCore.predictSurface(s.beta, state.model, vx, vy)))]));
            }
            dyn.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line), wm));
            var line2 = [];
            for (var wx2 = 0; wx2 <= NGRID; wx2++) {
              var vx2 = wy / NGRID, vy2 = wx2 / NGRID;
              line2.push(m2t([vx2, vy2, Math.max(-0.2, Math.min(1.2, LsqCore.predictSurface(s.beta, state.model, vx2, vy2)))]));
            }
            dyn.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line2), wm));
          }
        }
        // residual segments + squared-error squares (vertical quads)
        var rm = new THREE.LineBasicMaterial({ color: C.residHex });
        for (var j = 0; j < s.pts.length; j++) {
          var q = s.pts[j];
          var zh = s.yhat[j];
          if (residChk.checked) {
            var rg = new THREE.BufferGeometry().setFromPoints([m2t([q[0], q[1], q[2]]), m2t([q[0], q[1], zh])]);
            dyn.add(new THREE.Line(rg, rm));
          }
          if (squaresChk.checked) {
            var side = Math.abs(s.resid[j]);
            if (side > 1e-4) {
              var zLo = Math.min(q[2], zh);
              var dir = q[0] > 0.5 ? -1 : 1;
              var corners = [
                m2t([q[0], q[1], zLo]), m2t([q[0] + dir * side, q[1], zLo]),
                m2t([q[0] + dir * side, q[1], zLo + side]), m2t([q[0], q[1], zLo + side])
              ];
              var qp = [];
              var tris = [0, 1, 2, 0, 2, 3];
              for (var tq = 0; tq < 6; tq++) qp.push(corners[tris[tq]].x, corners[tris[tq]].y, corners[tris[tq]].z);
              var qg = new THREE.BufferGeometry();
              qg.setAttribute('position', new THREE.Float32BufferAttribute(qp, 3));
              dyn.add(new THREE.Mesh(qg, new THREE.MeshBasicMaterial({
                color: C.sqHex, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false
              })));
            }
          }
        }
      }
      updateReadouts3(s);
    }

    function updateReadouts3(s) {
      var html = '';
      var n = state.data3.length;
      var p = LsqCore.surfaceTermCount(state.model);
      html += '<div><strong>Surface fit (' + (state.model === 'plane' ? 'plane' : 'quadratic') + ')</strong> ' +
        '<span class="lrv-sub">n = ' + n + ' points, p = ' + p + ' parameters</span></div>';
      if (s.empty) {
        html += '<div class="lrv-status-warn" style="margin-top:6px;">No data \u2014 generate a sample.</div>';
      } else if (!s.ok) {
        if (s.reason === 'underdetermined') {
          html += '<div class="lrv-status-warn" style="margin-top:6px;">n &lt; p: fewer points than parameters \u2014 ' +
            'X\u1D40X is singular; infinitely many least-squares solutions (pseudo-inverse section). ' +
            'Increase n or use the plane model.</div>';
        } else {
          html += '<div class="lrv-status-warn" style="margin-top:6px;">The columns of X are linearly dependent ' +
            'for this sample (degenerate point configuration) \u2014 no unique least-squares solution. Generate a new sample.</div>';
        }
      } else {
        html += '<div class="lrv-formula" style="margin-top:6px;">' + surfaceEquation(s.beta, state.model) + '</div>';
        html += metricsHtml(s);
        if (s.interpolating) {
          html += '<div class="lrv-status-ok">n = p: exact interpolation \u2014 zero residual.</div>';
        }
      }
      readoutsEl.innerHTML = html;
    }

    // =====================================================================
    // shared interactions
    // =====================================================================
    function markActive(rowSel, ds) {
      var btns = container.querySelectorAll(rowSel);
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('lrv-active', btns[i].getAttribute('data-ds') === ds);
      }
    }
    function regen2() {
      state.data2 = LsqCore.gen2D(state.ds2, state.n, state.noise, SEED2 + state.seed2Off);
      markActive('.lrv-ds', state.ds2);
      draw2();
    }
    function regen3() {
      state.data3 = LsqCore.gen3D(state.ds3, state.n, state.noise, SEED3 + state.seed3Off);
      markActive('.lrv-ds3', state.ds3);
      draw3();
    }
    function redraw() { if (state.is3d) draw3(); else draw2(); }

    var dsBtns = container.querySelectorAll('.lrv-ds');
    for (var b1 = 0; b1 < dsBtns.length; b1++) {
      dsBtns[b1].addEventListener('click', function () {
        state.ds2 = this.getAttribute('data-ds');
        regen2();
      });
    }
    var ds3Btns = container.querySelectorAll('.lrv-ds3');
    for (var b2 = 0; b2 < ds3Btns.length; b2++) {
      ds3Btns[b2].addEventListener('click', function () {
        state.ds3 = this.getAttribute('data-ds');
        regen3();
      });
    }
    document.getElementById('lrv-resample').addEventListener('click', function () {
      if (state.is3d) { state.seed3Off += 1; regen3(); }
      else { state.seed2Off += 1; regen2(); }
    });
    document.getElementById('lrv-clear').addEventListener('click', function () {
      if (state.is3d) { state.data3 = []; draw3(); }
      else { state.data2 = []; state.custom2 = []; draw2(); }
    });
    nSel.addEventListener('change', function () {
      state.n = parseInt(nSel.value, 10);
      if (state.is3d) regen3(); else regen2();
    });
    noiseSlider.addEventListener('input', function () {
      state.noise = parseFloat(noiseSlider.value);
      noiseVal.textContent = fmt(state.noise, 2);
      if (state.is3d) regen3(); else regen2();
    });
    degreeSel.addEventListener('change', function () {
      state.degree = parseInt(degreeSel.value, 10);
      draw2();
    });
    modelSel.addEventListener('change', function () {
      state.model = modelSel.value;
      draw3();
    });
    residChk.addEventListener('change', redraw);
    squaresChk.addEventListener('change', redraw);
    surfaceChk.addEventListener('change', function () { draw3(); });

    function setMode(is3d) {
      state.is3d = is3d;
      canvas.style.display = is3d ? 'none' : 'block';
      holder.style.display = is3d ? 'block' : 'none';
      viewResetBtn.style.display = is3d && state.threeReady && !state.threeFailed ? 'block' : 'none';
      document.getElementById('lrv-2d-model').style.display = is3d ? 'none' : '';
      document.getElementById('lrv-3d-model').style.display = is3d ? '' : 'none';
      document.getElementById('lrv-ds-2d').style.display = is3d ? 'none' : 'flex';
      document.getElementById('lrv-ds-3d').style.display = is3d ? 'flex' : 'none';
      document.getElementById('lrv-surface-toggle').style.display = is3d ? 'flex' : 'none';
      instructionEl.textContent = is3d ?
        'Drag to orbit the 3D view. The vertical green segments are the residuals whose squares the fit minimizes.' :
        'Click the plot to add a point; click an existing point to remove it.';
      if (is3d) {
        ensureThree(function () {
          viewResetBtn.style.display = 'block';
          if (!T) { build3(); regen3(); } // generate only on first build:
          else { draw3(); }               // re-toggling must not silently resample
        });
      } else {
        draw2();
      }
    }
    check3d.addEventListener('change', function () { setMode(check3d.checked); });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () {
        sizeCanvas();
        if (!state.is3d) draw2();
        else if (T) {
          var w = holder.clientWidth > 0 ? holder.clientWidth : 640;
          var h = Math.round(w * 0.62);
          T.camera.aspect = w / h;
          T.camera.updateProjectionMatrix();
          T.renderer.setSize(w, h);
        }
      });
    }

    // ---------- boot ----------
    sizeCanvas();
    markActive('.lrv-ds', state.ds2);
    markActive('.lrv-ds3', state.ds3);
    noiseVal.textContent = fmt(state.noise, 2);
    setMode(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();