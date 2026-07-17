// ============================================================================
// StatCore — math core for the Statistical Regression Analyzer (prob-11)
// DOM-free, Node-requirable.
//
// Inference is done with the CORRECT sampling distributions: p-values and
// confidence/prediction intervals use the t distribution with n - p degrees
// of freedom (computed through the regularized incomplete beta function),
// and the overall significance test uses the F distribution. The v1 tool
// used the normal CDF and a hard-coded 1.96 for every sample size — that
// bug class is pinned dead in the self-tests below.
// The coefficient route is QR (modified Gram-Schmidt) with honest rank
// reporting; (X^T X)^{-1} diagonals come from R^{-1}, never from an
// explicitly inverted X^T X.
// ============================================================================
var StatCore = (function () {
  'use strict';

  // ---------- seeded RNG + Gaussian draws ----------
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) { // Box-Muller
    var u1 = rng(), u2 = rng();
    if (u1 <= 1e-12) u1 = 1e-12;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ---------- log-gamma (Lanczos; certified pattern from prob-3) ----------
  function logGamma(z) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var x = z, y = z;
    var tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  // ---------- regularized lower incomplete gamma (for the normal CDF) ----------
  function lowerRegGamma(a, x) {
    if (!(a > 0) || x < 0) return NaN;
    if (x === 0) return 0;
    var gln = logGamma(a);
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (var n = 0; n < 600; n++) {
        ap += 1;
        del *= x / ap;
        sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
    var b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (var i = 1; i <= 600; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      var delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  }

  // ---------- normal CDF and its inverse ----------
  // Phi(x) = (1 + sign(x) P(1/2, x^2/2)) / 2 — reuses the certified
  // incomplete-gamma machinery, accurate to ~1e-14
  function normalCdf(x) {
    if (x === 0) return 0.5;
    var p = lowerRegGamma(0.5, x * x / 2);
    return x > 0 ? (1 + p) / 2 : (1 - p) / 2;
  }
  // inverse by bisection: no memorized coefficient tables, certified by
  // round-trip; 90 iterations give ~1e-14 on [-12, 12]
  function normalInv(p) {
    if (!(p > 0 && p < 1)) return NaN;
    var lo = -12, hi = 12;
    for (var i = 0; i < 90; i++) {
      var mid = (lo + hi) / 2;
      if (normalCdf(mid) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ---------- regularized incomplete beta (for t and F) ----------
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1;
    var d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 400; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  function incBeta(x, a, b) { // I_x(a, b), with the convergence-critical symmetry split
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
                      a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }

  // ---------- Student t distribution ----------
  // F_t(t; nu) = 1 - I_x(nu/2, 1/2)/2 with x = nu/(nu + t^2), for t >= 0
  function tCdf(t, nu) {
    if (!(nu > 0)) return NaN;
    if (t === 0) return 0.5;
    var x = nu / (nu + t * t);
    var I = incBeta(x, nu / 2, 0.5);
    return t > 0 ? 1 - I / 2 : I / 2;
  }
  function tInv(p, nu) { // quantile by bisection
    if (!(p > 0 && p < 1)) return NaN;
    var lo = -400, hi = 400;
    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      if (tCdf(mid, nu) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ---------- F distribution ----------
  function fCdf(x, d1, d2) {
    if (x <= 0) return 0;
    return incBeta(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);
  }

  // ---------- linear algebra: QR (MGS) with honest rank reporting ----------
  function column(X, j) {
    var c = new Array(X.length);
    for (var i = 0; i < X.length; i++) c[i] = X[i][j];
    return c;
  }
  function dot(u, v) {
    var s = 0;
    for (var i = 0; i < u.length; i++) s += u[i] * v[i];
    return s;
  }
  function qr(X) {
    var m = X.length;
    var p = m > 0 ? X[0].length : 0;
    if (m < p) return { ok: false, reason: 'underdetermined' };
    var relTol = 1e-10;
    var Q = [], R = [];
    for (var a = 0; a < p; a++) {
      R.push([]);
      for (var b = 0; b < p; b++) R[a].push(0);
    }
    for (var j = 0; j < p; j++) {
      var v = column(X, j);
      var nx = Math.sqrt(dot(v, v));
      for (var i = 0; i < j; i++) {
        var rij = dot(Q[i], v);
        R[i][j] = rij;
        for (var k = 0; k < m; k++) v[k] -= rij * Q[i][k];
      }
      var rjj = Math.sqrt(dot(v, v));
      if (rjj <= relTol * (nx > 0 ? nx : 1)) {
        return { ok: false, reason: 'dependent', failedIndex: j };
      }
      R[j][j] = rjj;
      var q = new Array(m);
      for (var k2 = 0; k2 < m; k2++) q[k2] = v[k2] / rjj;
      Q.push(q);
    }
    return { ok: true, Q: Q, R: R, m: m, p: p };
  }
  function backSub(R, c) { // R x = c, upper triangular
    var p = R.length;
    var x = new Array(p);
    for (var i = p - 1; i >= 0; i--) {
      var s = c[i];
      for (var j = i + 1; j < p; j++) s -= R[i][j] * x[j];
      x[i] = s / R[i][i];
    }
    return x;
  }
  function forwardSubT(R, c) { // R^T w = c (R^T is lower triangular)
    var p = R.length;
    var w = new Array(p);
    for (var i = 0; i < p; i++) {
      var s = c[i];
      for (var j = 0; j < i; j++) s -= R[j][i] * w[j];
      w[i] = s / R[i][i];
    }
    return w;
  }

  // ---------- design matrix builders ----------
  function designPoly(xs, degree) {
    var X = [];
    for (var i = 0; i < xs.length; i++) {
      var row = [1];
      for (var d = 1; d <= degree; d++) row.push(row[d - 1] * xs[i]);
      X.push(row);
    }
    return X;
  }
  function designMulti(columns) { // columns: array of arrays, adds intercept
    var n = columns.length > 0 ? columns[0].length : 0;
    var X = [];
    for (var i = 0; i < n; i++) {
      var row = [1];
      for (var j = 0; j < columns.length; j++) row.push(columns[j][i]);
      X.push(row);
    }
    return X;
  }

  // ---------- the full statistical fit ----------
  function fit(X, y) {
    var f = qr(X);
    if (!f.ok) return { ok: false, reason: f.reason, failedIndex: f.failedIndex };
    var n = f.m, p = f.p;
    var c = new Array(p);
    for (var i = 0; i < p; i++) c[i] = dot(f.Q[i], y);
    var beta = backSub(f.R, c);
    var yhat = new Array(n), resid = new Array(n);
    var sse = 0, ybar = 0;
    for (var k = 0; k < n; k++) ybar += y[k];
    ybar /= n;
    var sst = 0;
    for (var k2 = 0; k2 < n; k2++) {
      var pred = 0;
      for (var j2 = 0; j2 < p; j2++) pred += X[k2][j2] * beta[j2];
      yhat[k2] = pred;
      resid[k2] = y[k2] - pred;
      sse += resid[k2] * resid[k2];
      sst += (y[k2] - ybar) * (y[k2] - ybar);
    }
    var df = n - p;
    var out = {
      ok: true, beta: beta, yhat: yhat, resid: resid,
      n: n, p: p, dfResid: df, sse: sse, sst: sst, ybar: ybar,
      r2: sst > 0 ? 1 - sse / sst : NaN,
      rmse: Math.sqrt(sse / n),
      mae: 0,
      R: f.R,
      interpolating: df === 0,
      inference: df >= 1
    };
    var mae = 0;
    for (var k3 = 0; k3 < n; k3++) mae += Math.abs(resid[k3]);
    out.mae = mae / n;
    out.adjR2 = (df >= 1 && sst > 0) ? 1 - (1 - out.r2) * (n - 1) / df : NaN;

    if (!out.inference) return out; // exact interpolation: no error variance

    var sigma2 = sse / df; // degrees of freedom n - p, NOT n
    out.sigma2 = sigma2;
    out.sigmaHat = Math.sqrt(sigma2);
    out.standardized = resid.map(function (r) { return r / out.sigmaHat; });

    // (X^T X)^{-1} = R^{-1} R^{-T}; diag_j = sum_k (R^{-1})_{j,k}^2.
    // Columns of R^{-1} come from back-substituting the identity.
    var RinvCols = [];
    for (var jc = 0; jc < p; jc++) {
      var e = new Array(p).fill(0);
      e[jc] = 1;
      RinvCols.push(backSub(f.R, e));
    }
    var covDiag = new Array(p).fill(0);
    for (var jr = 0; jr < p; jr++) {
      for (var kc = 0; kc < p; kc++) {
        covDiag[jr] += RinvCols[kc][jr] * RinvCols[kc][jr];
      }
    }
    var tcrit = tInv(0.975, df);
    out.tCrit = tcrit;
    out.se = []; out.tStat = []; out.pValue = []; out.ciLow = []; out.ciHigh = [];
    for (var jb = 0; jb < p; jb++) {
      var se = Math.sqrt(sigma2 * covDiag[jb]);
      out.se.push(se);
      var tj = beta[jb] / se;
      out.tStat.push(tj);
      out.pValue.push(2 * (1 - tCdf(Math.abs(tj), df)));
      out.ciLow.push(beta[jb] - tcrit * se);
      out.ciHigh.push(beta[jb] + tcrit * se);
    }
    // overall F test (only meaningful with at least one non-intercept term)
    if (p > 1 && sst > sse) {
      out.fStat = ((sst - sse) / (p - 1)) / (sse / df);
      out.fP = 1 - fCdf(out.fStat, p - 1, df);
    } else if (p > 1) {
      out.fStat = 0; out.fP = 1;
    }
    return out;
  }

  // leverage h = x0^T (X^T X)^{-1} x0 = ||R^{-T} x0||^2
  function leverage(fitRes, x0) {
    var w = forwardSubT(fitRes.R, x0);
    var h = 0;
    for (var i = 0; i < w.length; i++) h += w[i] * w[i];
    return h;
  }
  // half-widths at x0: CI for the mean response, PI for a new observation
  function meanCiHalfWidth(fitRes, x0) {
    return fitRes.tCrit * fitRes.sigmaHat * Math.sqrt(leverage(fitRes, x0));
  }
  function predictionHalfWidth(fitRes, x0) {
    return fitRes.tCrit * fitRes.sigmaHat * Math.sqrt(1 + leverage(fitRes, x0));
  }

  // ---------- closed-form simple regression (independent verification route) ----------
  function simpleRegression(xs, ys) {
    var n = xs.length;
    var xm = 0, ym = 0;
    for (var i = 0; i < n; i++) { xm += xs[i]; ym += ys[i]; }
    xm /= n; ym /= n;
    var sxy = 0, sxx = 0;
    for (var k = 0; k < n; k++) {
      sxy += (xs[k] - xm) * (ys[k] - ym);
      sxx += (xs[k] - xm) * (xs[k] - xm);
    }
    var slope = sxy / sxx;
    var intercept = ym - slope * xm;
    var sse = 0;
    for (var j = 0; j < n; j++) {
      var r = ys[j] - intercept - slope * xs[j];
      sse += r * r;
    }
    var s = Math.sqrt(sse / (n - 2));
    return {
      slope: slope, intercept: intercept, sse: sse,
      seSlope: s / Math.sqrt(sxx),
      seIntercept: s * Math.sqrt(1 / n + xm * xm / sxx),
      sigmaHat: s, xMean: xm, sxx: sxx
    };
  }

  // ---------- QQ plot data ----------
  function qqData(standardized) {
    var sorted = standardized.slice().sort(function (a, b) { return a - b; });
    var n = sorted.length;
    var theo = new Array(n);
    for (var i = 0; i < n; i++) theo[i] = normalInv((i + 0.5) / n);
    return { theoretical: theo, sample: sorted };
  }

  // ---------- CSV parsing (no silent zeros: bad rows are counted, not faked) ----------
  function parseCsv(text) {
    var lines = String(text).split(/\r\n|\n|\r/).filter(function (l) { return l.trim() !== ''; });
    if (lines.length < 2) return { ok: false, reason: 'need a header row and at least one data row' };
    var headers = lines[0].split(',').map(function (h) { return h.trim(); });
    var raw = [];
    for (var i = 1; i < lines.length; i++) {
      raw.push(lines[i].split(',').map(function (cell) { return cell.trim(); }));
    }
    // numeric columns: at least 80% of the non-empty cells parse as finite
    // numbers (isolated bad cells drop their ROW below, with a count reported
    // to the user — never silently coerced to zero)
    var numericCols = [];
    for (var j = 0; j < headers.length; j++) {
      var good = 0, any = 0;
      for (var r = 0; r < raw.length; r++) {
        var cell = raw[r][j];
        if (cell === undefined || cell === '') continue;
        any++;
        if (isFinite(Number(cell))) good++;
      }
      if (any >= 2 && good >= 0.8 * any) numericCols.push(j);
    }
    if (numericCols.length < 2) return { ok: false, reason: 'need at least two numeric columns' };
    var rows = [], dropped = 0;
    for (var r2 = 0; r2 < raw.length; r2++) {
      var row = {}, good = true;
      for (var jc = 0; jc < numericCols.length; jc++) {
        var cell2 = raw[r2][numericCols[jc]];
        if (cell2 === undefined || cell2 === '' || !isFinite(Number(cell2))) { good = false; break; }
        row[headers[numericCols[jc]]] = Number(cell2);
      }
      if (good) rows.push(row); else dropped++;
    }
    if (rows.length < 3) return { ok: false, reason: 'fewer than 3 usable data rows' };
    return {
      ok: true,
      headers: numericCols.map(function (j) { return headers[j]; }),
      excluded: headers.filter(function (h, j) { return numericCols.indexOf(j) === -1; }),
      rows: rows,
      dropped: dropped
    };
  }

  // ---------- seeded sample datasets ----------
  var DATASETS = [
    { key: 'linear',    label: 'Linear' },
    { key: 'quadratic', label: 'Quadratic' },
    { key: 'hetero',    label: 'Heteroscedastic' },
    { key: 'outliers',  label: 'Outliers' }
  ];
  function genDataset(type, seed) {
    var rng = makeRng(seed);
    var n = 40;
    var xs = [], ys = [];
    for (var i = 0; i < n; i++) {
      var x = 10 * rng();
      var eps = gauss(rng);
      var y;
      if (type === 'linear') y = 2.5 + 1.8 * x + 1.5 * eps;
      else if (type === 'quadratic') y = 1 + 0.5 * x + 0.3 * x * x + 2 * eps;
      else if (type === 'hetero') y = 2 + 1.2 * x + (0.3 + 0.35 * x) * eps;
      else { // outliers: exactly four, at deterministic positions
        y = 3 + 1.5 * x + 1 * eps;
        if (i % 10 === 7) y += (rng() > 0.5 ? 1 : -1) * (8 + 4 * rng());
      }
      xs.push(Math.round(x * 1000) / 1000);
      ys.push(Math.round(y * 1000) / 1000);
    }
    return { x: xs, y: ys };
  }

  return {
    makeRng: makeRng, gauss: gauss,
    logGamma: logGamma,
    lowerRegGamma: lowerRegGamma,
    normalCdf: normalCdf, normalInv: normalInv,
    incBeta: incBeta,
    tCdf: tCdf, tInv: tInv, fCdf: fCdf,
    qr: qr, backSub: backSub, forwardSubT: forwardSubT,
    designPoly: designPoly, designMulti: designMulti,
    fit: fit, leverage: leverage,
    meanCiHalfWidth: meanCiHalfWidth, predictionHalfWidth: predictionHalfWidth,
    simpleRegression: simpleRegression,
    qqData: qqData,
    parseCsv: parseCsv,
    DATASETS: DATASETS, genDataset: genDataset,
    runSelfTests: runSelfTests
  };

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
    function close(x, y, tol) { return Math.abs(x - y) <= tol; }
    function relClose(x, y, tol) { return Math.abs(x - y) <= tol * (1 + Math.abs(y)); }

    // ---- T1: log-gamma ----
    check('T1 Gamma(6) = 120', relClose(Math.exp(logGamma(6)), 120, 1e-12));
    check('T1 Gamma(1/2) = sqrt(pi)', relClose(Math.exp(logGamma(0.5)), Math.sqrt(Math.PI), 1e-12));
    check('T1 logGamma(4.7) spot pin', close(logGamma(4.7), 2.7364051463155669, 1e-12));
    var rng1 = makeRng(60001);
    for (var i1 = 0; i1 < 8; i1++) {
      var z1 = 0.05 + 0.9 * rng1();
      check('T1 reflection #' + i1,
        close(logGamma(z1) + logGamma(1 - z1), Math.log(Math.PI / Math.sin(Math.PI * z1)), 1e-10));
    }

    // ---- T2: normal CDF ----
    check('T2 Phi(0) = 1/2', normalCdf(0) === 0.5);
    check('T2 Phi(1.96) pin (mpmath)', close(normalCdf(1.96), 0.97500210485177957, 1e-13), normalCdf(1.96));
    check('T2 Phi(1) pin (mpmath)', close(normalCdf(1), 0.84134474606854295, 1e-13));
    var rng2 = makeRng(60002);
    for (var i2 = 0; i2 < 10; i2++) {
      var x2 = 8 * rng2() - 4;
      check('T2 symmetry #' + i2, close(normalCdf(-x2), 1 - normalCdf(x2), 1e-14));
    }
    check('T2 monotone', normalCdf(0.5) < normalCdf(0.6) && normalCdf(-3) < normalCdf(-2));

    // ---- T3: inverse normal ----
    check('T3 PhiInv(0.975) pin', close(normalInv(0.975), 1.9599639845400542, 1e-11), normalInv(0.975));
    check('T3 PhiInv(0.5) = 0', close(normalInv(0.5), 0, 1e-12));
    var rng3 = makeRng(60003);
    for (var i3 = 0; i3 < 10; i3++) {
      var x3 = 6 * rng3() - 3;
      check('T3 round-trip #' + i3, close(normalInv(normalCdf(x3)), x3, 1e-9));
    }

    // ---- T4: incomplete beta ----
    check('T4 I_0.35(2.5,4) pin (mpmath)', close(incBeta(0.35, 2.5, 4), 0.45480978374959288, 1e-10));
    check('T4 extreme-x pin I_0.98(8,8)', close(incBeta(0.98, 8, 8), 0.99999999985469039, 1e-10));
    var rng4 = makeRng(60004);
    for (var i4 = 0; i4 < 12; i4++) {
      var a4 = 0.5 + 8 * rng4(), b4 = 0.5 + 8 * rng4();
      var x4 = [0.1, 0.5, 0.9, 0.999][i4 % 4];
      var v4 = incBeta(x4, a4, b4);
      check('T4 bounds #' + i4, v4 >= 0 && v4 <= 1 + 1e-12, v4);
      check('T4 symmetry #' + i4, close(v4, 1 - incBeta(1 - x4, b4, a4), 1e-10));
    }

    // ---- T5: Student t CDF ----
    // nu = 1 is Cauchy: F(t) = 1/2 + arctan(t)/pi
    var rng5 = makeRng(60005);
    for (var i5 = 0; i5 < 10; i5++) {
      var t5 = 10 * rng5() - 5;
      check('T5 Cauchy closed form #' + i5,
        close(tCdf(t5, 1), 0.5 + Math.atan(t5) / Math.PI, 1e-11), tCdf(t5, 1));
      // nu = 2: F(t) = 1/2 + t / (2 sqrt(2 + t^2))
      check('T5 nu=2 closed form #' + i5,
        close(tCdf(t5, 2), 0.5 + t5 / (2 * Math.sqrt(2 + t5 * t5)), 1e-11));
      check('T5 symmetry #' + i5, close(tCdf(-t5, 7), 1 - tCdf(t5, 7), 1e-12));
    }
    check('T5 tCdf(1.5, 7) pin (mpmath)', close(tCdf(1.5, 7), 0.91135075650501498, 1e-11), tCdf(1.5, 7));
    check('T5 tCdf(-0.8, 3) pin (mpmath)', close(tCdf(-0.8, 3), 0.24109947587554112, 1e-11));
    // large nu approaches the normal
    check('T5 large-nu -> normal', Math.abs(tCdf(1.3, 500) - normalCdf(1.3)) < 2e-3);
    check('T5 monotone', tCdf(0.4, 5) < tCdf(0.5, 5));

    // ---- T6: inverse t — the v1 "1.96 for everything" bug is pinned dead here ----
    check('T6 t_0.975(10) = 2.2281 (NOT 1.96)', close(tInv(0.975, 10), 2.2281388519862747, 1e-9), tInv(0.975, 10));
    check('T6 t_0.975(2) = 4.3027 (NOT 1.96)', close(tInv(0.975, 2), 4.3026527297494639, 1e-8), tInv(0.975, 2));
    check('T6 t_0.975(3) = 3.1824', close(tInv(0.975, 3), 3.1824463052837096, 1e-9));
    check('T6 t quantile -> normal for huge nu', close(tInv(0.975, 100000), 1.95996, 1e-3));
    var rng6 = makeRng(60006);
    for (var i6 = 0; i6 < 8; i6++) {
      var p6 = 0.02 + 0.96 * rng6(), nu6 = 1 + Math.floor(30 * rng6());
      check('T6 round-trip #' + i6, close(tCdf(tInv(p6, nu6), nu6), p6, 1e-10));
    }

    // ---- T7: F distribution ----
    check('T7 fCdf(2.5; 3, 12) pin (mpmath)', close(fCdf(2.5, 3, 12), 0.89084528760499372, 1e-10), fCdf(2.5, 3, 12));
    check('T7 fCdf(4.5; 1, 3) pin (mpmath)', close(fCdf(4.5, 1, 3), 0.87597293734244537, 1e-10));
    // identity: F_{1,nu}(t^2) = 2 F_t(|t|; nu) - 1
    var rng7 = makeRng(60007);
    for (var i7 = 0; i7 < 8; i7++) {
      var t7 = 0.2 + 3 * rng7(), nu7 = 2 + Math.floor(20 * rng7());
      check('T7 F(1,nu) vs t identity #' + i7,
        close(fCdf(t7 * t7, 1, nu7), 2 * tCdf(t7, nu7) - 1, 1e-10));
    }
    check('T7 bounds/monotone', fCdf(0, 3, 5) === 0 && fCdf(1, 3, 5) < fCdf(2, 3, 5));

    // ---- T8: regression fit — hand example (SymPy/mpmath verified) ----
    // x = 1..5, y = (2,4,5,4,5): slope 3/5, intercept 11/5, SSE 12/5, R^2 3/5,
    // sigma2 = 4/5, SE_slope = sqrt(0.8/10), t = 2.1213..., df = 3
    var HX = designPoly([1, 2, 3, 4, 5], 1);
    var HY = [2, 4, 5, 4, 5];
    var hf = fit(HX, HY);
    check('T8 hand slope', hf.ok && close(hf.beta[1], 0.6, 1e-12), hf.beta && hf.beta[1]);
    check('T8 hand intercept', close(hf.beta[0], 2.2, 1e-12));
    check('T8 hand SSE', close(hf.sse, 2.4, 1e-12));
    check('T8 hand R2', close(hf.r2, 0.6, 1e-12));
    check('T8 sigma2 uses df = n - p (2.4/3, NOT 2.4/5)', close(hf.sigma2, 0.8, 1e-12), hf.sigma2);
    check('T8 hand SE slope', close(hf.se[1], Math.sqrt(0.8 / 10), 1e-12));
    check('T8 hand t slope', close(hf.tStat[1], 2.1213203435596426, 1e-10));
    check('T8 hand p slope (t dist, mpmath)', close(hf.pValue[1], 0.12402706265755463, 1e-9), hf.pValue[1]);
    check('T8 hand CI uses t crit 3.1824 (NOT 1.96)',
      close(hf.ciHigh[1] - hf.beta[1], 3.1824463052837096 * Math.sqrt(0.08), 1e-8));
    // two-route: closed-form textbook formulas vs the QR route, seeded
    var rng8 = makeRng(60008);
    for (var i8 = 0; i8 < 8; i8++) {
      var xs8 = [], ys8 = [];
      for (var k8 = 0; k8 < 12; k8++) { xs8.push(10 * rng8()); ys8.push(10 * rng8()); }
      var sr = simpleRegression(xs8, ys8);
      var qf = fit(designPoly(xs8, 1), ys8);
      check('T8 two-route slope #' + i8, relClose(qf.beta[1], sr.slope, 1e-9));
      check('T8 two-route SE slope #' + i8, relClose(qf.se[1], sr.seSlope, 1e-9));
      check('T8 two-route SE intercept #' + i8, relClose(qf.se[0], sr.seIntercept, 1e-9));
      check('T8 two-route sigma #' + i8, relClose(qf.sigmaHat, sr.sigmaHat, 1e-9));
    }
    // rank honesty
    check('T8 duplicate column refused', fit([[1, 2, 2], [1, 3, 3], [1, 4, 4], [1, 5, 5]], [1, 2, 3, 4]).ok === false);
    // float-noise dependence: repeated x in a degree-2 Vandermonde leaves an
    // MGS residual of ~2e-16, NOT exact zero — the tolerance is load-bearing
    check('T8 repeated-x Vandermonde refused (float-noise dependence)',
      fit(designPoly([0.3, 0.3, 0.7], 2), [1, 2, 3]).ok === false);
    check('T8 n < p refused', fit(designPoly([1, 2], 3), [1, 2]).ok === false);
    var interp = fit(designPoly([1, 2], 1), [3, 5]);
    check('T8 n = p: interpolating, no inference', interp.ok && interp.interpolating && interp.inference === false);

    // ---- T9: R2 / adjusted R2 / F ----
    check('T9 hand adjR2 = 1 - 0.4*4/3', close(hf.adjR2, 1 - 0.4 * 4 / 3, 1e-12), hf.adjR2);
    check('T9 hand F = 4.5', close(hf.fStat, 4.5, 1e-10), hf.fStat);
    check('T9 hand F p-value = slope p-value (t^2 = F identity)',
      close(hf.fP, hf.pValue[1], 1e-10), hf.fP);
    check('T9 F from R2 identity',
      close(hf.fStat, (hf.r2 / 1) / ((1 - hf.r2) / 3), 1e-10));

    // ---- T10: leverage / intervals ----
    // at the mean point of the simple regression, leverage = 1/n
    check('T10 leverage at x-bar = 1/n', close(leverage(hf, [1, 3]), 0.2, 1e-12), leverage(hf, [1, 3]));
    check('T10 mean CI half-width at x-bar', close(meanCiHalfWidth(hf, [1, 3]),
      3.1824463052837096 * Math.sqrt(0.8) * Math.sqrt(0.2), 1e-8));
    var rng10 = makeRng(60010);
    for (var i10 = 0; i10 < 6; i10++) {
      var x0 = [1, 6 * rng10()];
      check('T10 PI strictly wider than CI #' + i10,
        predictionHalfWidth(hf, x0) > meanCiHalfWidth(hf, x0));
    }

    // ---- T11: datasets ----
    check('T11 deterministic', JSON.stringify(genDataset('linear', 71001)) === JSON.stringify(genDataset('linear', 71001)));
    check('T11 seeds differ', JSON.stringify(genDataset('linear', 71001)) !== JSON.stringify(genDataset('linear', 71002)));
    var dsH = genDataset('hetero', 71001);
    // heteroscedasticity is visible: |residuals from the true line| grow with x
    var loSum = 0, hiSum = 0, loN = 0, hiN = 0;
    for (var ih = 0; ih < dsH.x.length; ih++) {
      var trueResid = Math.abs(dsH.y[ih] - (2 + 1.2 * dsH.x[ih]));
      if (dsH.x[ih] < 5) { loSum += trueResid; loN++; } else { hiSum += trueResid; hiN++; }
    }
    check('T11 hetero pattern (right half noisier)', hiSum / hiN > loSum / loN,
      (hiSum / hiN) + ' vs ' + (loSum / loN));
    var dsO = genDataset('outliers', 71001);
    var big = 0;
    for (var io = 0; io < dsO.x.length; io++) {
      if (Math.abs(dsO.y[io] - (3 + 1.5 * dsO.x[io])) > 6) big++;
    }
    check('T11 outliers dataset contains outliers', big >= 2, big);
    check('T11 all datasets fit ok', ['linear', 'quadratic', 'hetero', 'outliers'].every(function (t) {
      var d = genDataset(t, 71001);
      return fit(designPoly(d.x, 1), d.y).ok;
    }));

    // ---- T12: CSV parsing ----
    var csv = parseCsv('x,y,name\n1,2,a\n2,4,b\n3,5,c\n4,bad,d\n5,6,e');
    check('T12 numeric columns detected', csv.ok && csv.headers.length === 2 &&
      csv.headers[0] === 'x' && csv.headers[1] === 'y');
    check('T12 non-numeric column excluded', csv.excluded.length === 1 && csv.excluded[0] === 'name');
    check('T12 bad row dropped and counted', csv.rows.length === 4 && csv.dropped === 1);
    check('T12 values parsed', csv.rows[0].x === 1 && csv.rows[2].y === 5);
    check('T12 CRLF handled', parseCsv('a,b\r\n1,2\r\n3,4\r\n5,6\r\n').ok === true);
    check('T12 too-few-rows refused', parseCsv('a,b\n1,2\n').ok === false);
    check('T12 no numeric columns refused', parseCsv('a,b\nfoo,bar\nbaz,qux\nx,y').ok === false);

    // ---- T13: QQ data ----
    var qq = qqData([1.2, -0.5, 0.3, -1.8, 0.9]);
    check('T13 sample sorted', qq.sample[0] === -1.8 && qq.sample[4] === 1.2);
    check('T13 theoretical symmetric', close(qq.theoretical[0], -qq.theoretical[4], 1e-10));
    check('T13 theoretical monotone', qq.theoretical[0] < qq.theoretical[1] &&
      qq.theoretical[3] < qq.theoretical[4]);
    check('T13 median quantile is 0', close(qq.theoretical[2], 0, 1e-10));
    // plotting-position CONVENTION pin: we adopt Hazen positions (i+0.5)/n
    check('T13 Hazen plotting positions', close(qq.theoretical[0], normalInv(0.1), 1e-12));

    // ---- T14: RNG / gauss determinism ----
    var ra = makeRng(42), rb = makeRng(42);
    check('T14 gauss deterministic', gauss(ra) === gauss(rb));

    return { pass: failures.length === 0, failures: failures, count: count };
  }
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = StatCore; }
// ============================================================================
// UI layer — statistical regression analyzer. Data via CSV upload/paste or
// seeded sample datasets; full coefficient table (beta, SE, t, p, 95% CI via
// the t distribution), model summary (R^2, adjusted R^2, sigma-hat, F test),
// regression plot with mean-CI and prediction bands, and diagnostics
// (residuals vs fitted / normal QQ). No external chart library — everything
// is drawn on plain canvas from certified StatCore values. Prefix: sra-.
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
    ciBand: 'rgba(100, 180, 255, 0.18)',
    piBand: 'rgba(255, 200, 87, 0.12)',
    piEdge: 'rgba(255, 200, 87, 0.5)',
    resid: '#2ecc71',
    refLine: 'rgba(255, 255, 255, 0.45)',
    bad: '#ef5350',
    warn: '#ffc857'
  };

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }
  function fmtNum(x) {
    var a = Math.abs(x);
    if (x === 0) return '0';
    if (a >= 10000 || a < 1e-3) return x.toExponential(3);
    return fmt(x, 4);
  }
  function fmtP(p) {
    if (p < 1e-4) return '&lt;0.0001';
    return fmt(p, 4);
  }
  function stars(p) {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
  }

  function init() {
    var container = document.getElementById('statistical-regression-analyzer');
    if (!container) return;
    if (container.dataset.sraInit) return;
    container.dataset.sraInit = '1';

    // ---------- gate ----------
    var gate;
    try { gate = StatCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown')], count: 0 }; }
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + String(shown[gi]).replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="sra-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
        ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
        '<strong style="color:' + C.bad + ';">Tool disabled: mathematical self-tests failed (' +
        gate.failures.length + ' of ' + gate.count + ' checks).</strong>' +
        '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This tool refuses to report ' +
        'statistics it cannot certify. Failures:</p>' +
        '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
      return;
    }

    // ---------- DOM ----------
    var sampleBtns = '';
    for (var si = 0; si < StatCore.DATASETS.length; si++) {
      sampleBtns += '<button class="sra-sample" data-key="' + StatCore.DATASETS[si].key + '">' +
        StatCore.DATASETS[si].label + '</button>';
    }
    container.innerHTML =
      '<div class="sra-root">' +
        '<div class="sra-col sra-left">' +
          '<div class="sra-group">' +
            '<label>Data</label>' +
            '<div class="sra-btnrow">' + sampleBtns + '</div>' +
            '<div class="sra-inline" style="margin-top:8px;">' +
              '<button id="sra-upload-btn" class="sra-secondary">Upload CSV\u2026</button>' +
              '<input type="file" id="sra-file" accept=".csv,text/csv" style="display:none;">' +
              '<button id="sra-paste-btn" class="sra-secondary">Paste CSV\u2026</button>' +
            '</div>' +
            '<div id="sra-paste-area" style="display:none;margin-top:8px;">' +
              '<textarea id="sra-paste-text" rows="5" placeholder="x,y\u21B51,2\u21B52,4\u21B5\u2026"></textarea>' +
              '<button id="sra-paste-load" class="sra-primary" style="margin-top:6px;">Load pasted data</button>' +
            '</div>' +
            '<div id="sra-data-info" class="sra-sub" style="margin-top:8px;"></div>' +
          '</div>' +
          '<div class="sra-group">' +
            '<label>Model</label>' +
            '<div class="sra-inline"><span class="sra-sub">Response y:</span>' +
              '<select id="sra-y" class="sra-select"></select></div>' +
            '<div class="sra-sub" style="margin:8px 0 4px;">Predictors:</div>' +
            '<div id="sra-x-list" class="sra-xlist"></div>' +
            '<div class="sra-inline" id="sra-degree-row" style="margin-top:8px;">' +
              '<span class="sra-sub">Polynomial degree:</span>' +
              '<select id="sra-degree" class="sra-select">' +
                '<option value="1">1</option><option value="2">2</option>' +
                '<option value="3">3</option><option value="4">4</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="sra-group">' +
            '<label>Display</label>' +
            '<label class="sra-toggle"><input type="checkbox" id="sra-ci" checked> Mean-response 95% CI band</label>' +
            '<label class="sra-toggle"><input type="checkbox" id="sra-pi"> 95% prediction band (new observation)</label>' +
            '<label class="sra-toggle" style="margin-top:6px;"><input type="checkbox" id="sra-qq"> Diagnostics: QQ plot (instead of residuals vs fitted)</label>' +
          '</div>' +
        '</div>' +
        '<div class="sra-col sra-right">' +
          '<div id="sra-results" class="sra-group sra-results"></div>' +
          '<div class="sra-group">' +
            '<div class="sra-charttitle" id="sra-chart1-title"></div>' +
            '<canvas id="sra-chart1"></canvas>' +
          '</div>' +
          '<div class="sra-group">' +
            '<div class="sra-charttitle" id="sra-chart2-title"></div>' +
            '<canvas id="sra-chart2"></canvas>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#statistical-regression-analyzer .sra-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
      '@media (min-width: 992px){#statistical-regression-analyzer .sra-root{flex-direction:row;align-items:flex-start;}' +
      '#statistical-regression-analyzer .sra-left{flex:2;max-width:360px;}#statistical-regression-analyzer .sra-right{flex:3;}}' +
      '#statistical-regression-analyzer .sra-col{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#statistical-regression-analyzer .sra-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
      '#statistical-regression-analyzer .sra-group > label{display:block;font-weight:bold;margin-bottom:8px;color:' + C.textDim + ';font-size:0.85rem;}' +
      '#statistical-regression-analyzer .sra-btnrow{display:flex;flex-wrap:wrap;gap:6px;}' +
      '#statistical-regression-analyzer .sra-sample{flex:1;min-width:90px;padding:7px 4px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.82rem;}' +
      '#statistical-regression-analyzer .sra-sample.sra-active{background:linear-gradient(135deg,#1565c0,#42a5f5);border-color:transparent;color:#fff;font-weight:bold;}' +
      '#statistical-regression-analyzer .sra-primary,#statistical-regression-analyzer .sra-secondary{padding:8px 12px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}' +
      '#statistical-regression-analyzer .sra-primary{background:linear-gradient(135deg,#1565c0,#42a5f5);color:#fff;}' +
      '#statistical-regression-analyzer .sra-secondary{background:rgba(255,255,255,0.08);border:1px solid ' + C.borderStrong + ';color:' + C.text + ';}' +
      '#statistical-regression-analyzer .sra-secondary:hover{background:rgba(255,255,255,0.12);}' +
      '#statistical-regression-analyzer .sra-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
      '#statistical-regression-analyzer textarea{width:100%;background:rgba(0,0,0,0.3);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';font-family:"Courier New",monospace;font-size:0.85rem;padding:8px;box-sizing:border-box;}' +
      '#statistical-regression-analyzer .sra-select{padding:6px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;}' +
      '#statistical-regression-analyzer .sra-select option{background-color:#141c28;color:' + C.text + ';}' +
      '#statistical-regression-analyzer .sra-xlist{display:flex;flex-direction:column;gap:4px;max-height:140px;overflow-y:auto;}' +
      '#statistical-regression-analyzer .sra-toggle{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:' + C.textDim + ';cursor:pointer;margin-bottom:4px;font-weight:normal !important;}' +
      '#statistical-regression-analyzer .sra-sub{color:' + C.faint + ';font-size:0.85rem;}' +
      '#statistical-regression-analyzer .sra-results{font-size:0.9rem;line-height:1.55;overflow-x:auto;}' +
      '#statistical-regression-analyzer table.sra-table{border-collapse:collapse;width:100%;margin-top:6px;font-size:0.85rem;}' +
      '#statistical-regression-analyzer table.sra-table th,#statistical-regression-analyzer table.sra-table td{border:1px solid ' + C.border + ';padding:5px 8px;text-align:right;font-family:"Courier New",monospace;}' +
      '#statistical-regression-analyzer table.sra-table th{color:' + C.textDim + ';background:rgba(255,255,255,0.04);font-family:system-ui,sans-serif;}' +
      '#statistical-regression-analyzer table.sra-table td:first-child,#statistical-regression-analyzer table.sra-table th:first-child{text-align:left;}' +
      '#statistical-regression-analyzer .sra-val{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#statistical-regression-analyzer .sra-warn{color:' + C.warn + ';font-weight:bold;}' +
      '#statistical-regression-analyzer .sra-charttitle{font-size:0.88rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:6px;}' +
      '#statistical-regression-analyzer canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;}';
    document.head.appendChild(style);

    var chart1 = document.getElementById('sra-chart1');
    var chart2 = document.getElementById('sra-chart2');
    var ctx1 = chart1.getContext('2d');
    var ctx2 = chart2.getContext('2d');
    var resultsEl = document.getElementById('sra-results');
    var dataInfoEl = document.getElementById('sra-data-info');
    var ySel = document.getElementById('sra-y');
    var xList = document.getElementById('sra-x-list');
    var degreeSel = document.getElementById('sra-degree');
    var degreeRow = document.getElementById('sra-degree-row');
    var ciChk = document.getElementById('sra-ci');
    var piChk = document.getElementById('sra-pi');
    var qqChk = document.getElementById('sra-qq');

    var SEED = 8101;
    var state = {
      headers: [], rows: [], sourceNote: '',
      yKey: null, xKeys: [], degree: 1,
      fit: null, terms: [], mode: 'single', xsRaw: [],
      w1: 560, h1: 340, w2: 560, h2: 300
    };

    function sizeCanvases() {
      var parentW = chart1.parentElement ? chart1.parentElement.clientWidth : 0;
      var w = parentW > 0 ? Math.max(320, Math.min(720, parentW - 30)) : 560;
      state.w1 = w; state.h1 = Math.round(w * 0.6);
      state.w2 = w; state.h2 = Math.round(w * 0.52);
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      [[chart1, ctx1, state.w1, state.h1], [chart2, ctx2, state.w2, state.h2]].forEach(function (c) {
        c[0].style.width = c[2] + 'px';
        c[0].style.height = c[3] + 'px';
        c[0].width = Math.round(c[2] * dpr);
        c[0].height = Math.round(c[3] * dpr);
        if (c[1] && c[1].setTransform) c[1].setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    }

    // ---------- generic plot frame with data ranges ----------
    function frame(ctx, W, H, xMin, xMax, yMin, yMax, xLabel, yLabel) {
      var r = { x0: 52, y0: 12, w: W - 52 - 14, h: H - 12 - 36 };
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.font = '11px system-ui, sans-serif';
      var ticks = 5;
      for (var i = 0; i <= ticks; i++) {
        var tx = r.x0 + r.w * i / ticks;
        var ty = r.y0 + r.h * i / ticks;
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(tx, r.y0); ctx.lineTo(tx, r.y0 + r.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r.x0, ty); ctx.lineTo(r.x0 + r.w, ty); ctx.stroke();
        ctx.fillStyle = C.faint;
        var xv = xMin + (xMax - xMin) * i / ticks;
        var yv = yMax - (yMax - yMin) * i / ticks;
        ctx.fillText(shortNum(xv), tx - 10, r.y0 + r.h + 16);
        ctx.fillText(shortNum(yv), 4, ty + 4);
      }
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(r.x0, r.y0, r.w, r.h);
      ctx.fillStyle = C.textDim;
      if (xLabel) ctx.fillText(xLabel, r.x0 + r.w - 8 * xLabel.length, r.y0 + r.h + 30);
      if (yLabel) ctx.fillText(yLabel, r.x0 + 4, r.y0 + 12);
      return {
        r: r,
        px: function (x) { return r.x0 + (x - xMin) / (xMax - xMin) * r.w; },
        py: function (y) { return r.y0 + (1 - (y - yMin) / (yMax - yMin)) * r.h; }
      };
    }
    function shortNum(v) {
      var a = Math.abs(v);
      if (a >= 1000 || (a < 0.01 && a > 0)) return v.toExponential(0);
      return fmt(v, a >= 10 ? 0 : 1);
    }
    function rangeOf(arr, padFrac) {
      var mn = Infinity, mx = -Infinity;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] < mn) mn = arr[i];
        if (arr[i] > mx) mx = arr[i];
      }
      if (!(mx > mn)) { mn -= 1; mx += 1; }
      var pad = (mx - mn) * (padFrac === undefined ? 0.07 : padFrac);
      return [mn - pad, mx + pad];
    }

    // ---------- data loading ----------
    function markActive(key) {
      var btns = container.querySelectorAll('.sra-sample');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('sra-active', btns[i].getAttribute('data-key') === key);
      }
    }
    function loadSample(key) {
      var d = StatCore.genDataset(key, SEED);
      state.headers = ['x', 'y'];
      state.rows = d.x.map(function (xv, i) { return { x: xv, y: d.y[i] }; });
      state.sourceNote = 'sample dataset "' + key + '" (n = ' + state.rows.length + ', seeded)';
      markActive(key);
      state.yKey = 'y';
      state.xKeys = ['x'];
      state.degree = key === 'quadratic' ? 2 : 1;
      degreeSel.value = String(state.degree);
      rebuildSelectors();
      refit();
    }
    function loadParsed(parsed, label) {
      if (!parsed.ok) {
        dataInfoEl.innerHTML = '<span class="sra-warn">Could not load data: ' + parsed.reason + '</span>';
        return;
      }
      state.headers = parsed.headers;
      state.rows = parsed.rows;
      var note = label + ': n = ' + parsed.rows.length + ' rows';
      if (parsed.dropped > 0) note += ', <span class="sra-warn">' + parsed.dropped + ' row(s) dropped (non-numeric cells)</span>';
      if (parsed.excluded.length > 0) note += ', excluded non-numeric column(s): ' + parsed.excluded.join(', ');
      state.sourceNote = note;
      markActive(null);
      state.yKey = parsed.headers[parsed.headers.length - 1];
      state.xKeys = [parsed.headers[0]];
      state.degree = 1;
      degreeSel.value = '1';
      rebuildSelectors();
      refit();
    }

    function rebuildSelectors() {
      var opts = '';
      for (var i = 0; i < state.headers.length; i++) {
        opts += '<option value="' + state.headers[i] + '"' +
          (state.headers[i] === state.yKey ? ' selected' : '') + '>' + state.headers[i] + '</option>';
      }
      ySel.innerHTML = opts;
      var xs = '';
      for (var j = 0; j < state.headers.length; j++) {
        var h = state.headers[j];
        if (h === state.yKey) continue;
        xs += '<label class="sra-toggle"><input type="checkbox" class="sra-xchk" value="' + h + '"' +
          (state.xKeys.indexOf(h) >= 0 ? ' checked' : '') + '> ' + h + '</label>';
      }
      xList.innerHTML = xs;
      var chks = container.querySelectorAll('.sra-xchk');
      for (var k = 0; k < chks.length; k++) {
        chks[k].addEventListener('change', function () {
          state.xKeys = [];
          var cs = container.querySelectorAll('.sra-xchk');
          for (var m = 0; m < cs.length; m++) if (cs[m].checked) state.xKeys.push(cs[m].value);
          refit();
        });
      }
    }

    // ---------- fitting ----------
    function refit() {
      dataInfoEl.innerHTML = state.sourceNote;
      degreeRow.style.display = state.xKeys.length === 1 ? 'flex' : 'none';
      if (!state.yKey || state.xKeys.length === 0) {
        state.fit = null;
        resultsEl.innerHTML = '<div class="sra-warn">Select a response variable and at least one predictor.</div>';
        container.dataset.sraSummary = JSON.stringify({ ok: false, reason: 'no-model' });
        drawCharts();
        return;
      }
      var ys = state.rows.map(function (r) { return r[state.yKey]; });
      var X, terms;
      if (state.xKeys.length === 1) {
        state.mode = 'single';
        var key = state.xKeys[0];
        state.xsRaw = state.rows.map(function (r) { return r[key]; });
        var deg = state.degree;
        X = StatCore.designPoly(state.xsRaw, deg);
        terms = ['(intercept)'];
        for (var d = 1; d <= deg; d++) terms.push(d === 1 ? key : key + '^' + d);
      } else {
        state.mode = 'multi';
        var cols = state.xKeys.map(function (k) {
          return state.rows.map(function (r) { return r[k]; });
        });
        X = StatCore.designMulti(cols);
        terms = ['(intercept)'].concat(state.xKeys);
      }
      state.X = X;
      state.terms = terms;
      state.fit = StatCore.fit(X, ys);
      state.ys = ys;
      renderResults();
      drawCharts();
    }

    function renderResults() {
      var f = state.fit;
      var html = '';
      if (!f.ok) {
        if (f.reason === 'underdetermined') {
          html = '<div class="sra-warn">n &lt; p: fewer observations than parameters \u2014 X\u1D40X is singular and ' +
            'there is no unique least-squares/MLE solution. Add data or remove terms.</div>';
        } else {
          html = '<div class="sra-warn">The design matrix has linearly dependent columns (collinear predictors ' +
            'or repeated values) \u2014 X\u1D40X is singular; coefficients are not identifiable. Remove a redundant predictor.</div>';
        }
        resultsEl.innerHTML = html;
        container.dataset.sraSummary = JSON.stringify({ ok: false, reason: f.reason });
        return;
      }
      html += '<div><strong>\u0177 = X\u03B2\u0302</strong> <span class="sra-sub">' +
        '(MLE = least squares under Gaussian noise; solved by QR)</span></div>';
      if (f.interpolating) {
        html += '<div class="sra-warn" style="margin-top:6px;">n = p: exact interpolation \u2014 zero residual degrees of freedom, ' +
          'so \u03C3\u0302\u00B2, standard errors, and p-values do not exist. Add data.</div>' +
          '<table class="sra-table"><tr><th>term</th><th>\u03B2\u0302</th></tr>';
        for (var j0 = 0; j0 < f.beta.length; j0++) {
          html += '<tr><td>' + state.terms[j0] + '</td><td>' + fmtNum(f.beta[j0]) + '</td></tr>';
        }
        html += '</table>';
        resultsEl.innerHTML = html;
        container.dataset.sraSummary = JSON.stringify({ ok: true, interpolating: true });
        return;
      }
      html += '<table class="sra-table"><tr><th>term</th><th>\u03B2\u0302</th><th>SE</th><th>t</th><th>p</th><th>95% CI (t<sub>' +
        f.dfResid + '</sub>)</th><th></th></tr>';
      for (var j = 0; j < f.beta.length; j++) {
        html += '<tr><td>' + state.terms[j] + '</td><td>' + fmtNum(f.beta[j]) + '</td><td>' + fmtNum(f.se[j]) +
          '</td><td>' + fmt(f.tStat[j], 3) + '</td><td>' + fmtP(f.pValue[j]) + '</td><td>[' +
          fmtNum(f.ciLow[j]) + ', ' + fmtNum(f.ciHigh[j]) + ']</td><td>' + stars(f.pValue[j]) + '</td></tr>';
      }
      html += '</table>';
      html += '<div style="margin-top:8px;">R\u00B2 = <span class="sra-val">' + fmt(f.r2, 4) + '</span>, ' +
        'adjusted R\u00B2 = <span class="sra-val">' + fmt(f.adjR2, 4) + '</span>, ' +
        '\u03C3\u0302 = <span class="sra-val">' + fmtNum(f.sigmaHat) + '</span> ' +
        '<span class="sra-sub">(df = ' + f.dfResid + ')</span></div>';
      if (f.fStat !== undefined) {
        html += '<div>F(' + (f.p - 1) + ', ' + f.dfResid + ') = <span class="sra-val">' + fmt(f.fStat, 3) +
          '</span>, p = <span class="sra-val">' + fmtP(f.fP) + '</span> ' +
          '<span class="sra-sub">\u2014 H\u2080: all non-intercept coefficients are zero</span></div>';
      }
      html += '<div class="sra-sub" style="margin-top:4px;">RMSE = ' + fmtNum(f.rmse) + ', MAE = ' + fmtNum(f.mae) +
        '. Critical value t<sub>0.975,' + f.dfResid + '</sub> = ' + fmt(f.tCrit, 4) +
        ' \u2014 computed from the t distribution, not a fixed 1.96.</div>';
      resultsEl.innerHTML = html;
      container.dataset.sraSummary = JSON.stringify({
        ok: true, beta: f.beta, se: f.se, t: f.tStat, p: f.pValue,
        r2: f.r2, adjR2: f.adjR2, fStat: f.fStat, fP: f.fP, tCrit: f.tCrit, df: f.dfResid
      });
    }

    // ---------- charts ----------
    function predictAt(x) {
      var row = [1], f = state.fit;
      for (var d = 1; d < f.beta.length; d++) row.push(row[d - 1] * x);
      var s = 0;
      for (var j = 0; j < f.beta.length; j++) s += f.beta[j] * row[j];
      return { row: row, y: s };
    }
    function drawCharts() {
      var f = state.fit;
      var t1 = document.getElementById('sra-chart1-title');
      var t2 = document.getElementById('sra-chart2-title');
      if (!f || !f.ok) {
        ctx1.clearRect(0, 0, state.w1, state.h1);
        ctx1.fillStyle = C.bg; ctx1.fillRect(0, 0, state.w1, state.h1);
        ctx2.clearRect(0, 0, state.w2, state.h2);
        ctx2.fillStyle = C.bg; ctx2.fillRect(0, 0, state.w2, state.h2);
        t1.textContent = ''; t2.textContent = '';
        return;
      }
      // ----- chart 1 -----
      if (state.mode === 'single') {
        t1.textContent = 'Data and fitted model' + (f.inference ? ' with 95% bands' : '');
        var xs = state.xsRaw, ys = state.ys;
        var xr = rangeOf(xs), yr0 = rangeOf(ys);
        // include band extremes in the y range
        var N = 120, bandLo = [], bandHi = [], piLo = [], piHi = [], curve = [];
        for (var i = 0; i <= N; i++) {
          var xv = xr[0] + (xr[1] - xr[0]) * i / N;
          var pr = predictAt(xv);
          curve.push([xv, pr.y]);
          if (f.inference) {
            var ciW = StatCore.meanCiHalfWidth(f, pr.row);
            var piW = StatCore.predictionHalfWidth(f, pr.row);
            bandLo.push([xv, pr.y - ciW]); bandHi.push([xv, pr.y + ciW]);
            piLo.push([xv, pr.y - piW]); piHi.push([xv, pr.y + piW]);
          }
        }
        var yAll = ys.slice();
        curve.forEach(function (q) { yAll.push(q[1]); });
        if (f.inference && piChk.checked) { piLo.forEach(function (q) { yAll.push(q[1]); }); piHi.forEach(function (q) { yAll.push(q[1]); }); }
        if (f.inference && ciChk.checked && !piChk.checked) { bandLo.forEach(function (q) { yAll.push(q[1]); }); bandHi.forEach(function (q) { yAll.push(q[1]); }); }
        var yr = rangeOf(yAll);
        var P = frame(ctx1, state.w1, state.h1, xr[0], xr[1], yr[0], yr[1], state.xKeys[0], state.yKey);
        // clip all data drawing to the plot rectangle
        ctx1.save();
        ctx1.beginPath();
        ctx1.rect(P.r.x0, P.r.y0, P.r.w, P.r.h);
        ctx1.clip();
        function fillBand(lo, hi, fillStyle, edge) {
          ctx1.beginPath();
          for (var a = 0; a < hi.length; a++) {
            var p = [P.px(hi[a][0]), P.py(hi[a][1])];
            if (a === 0) ctx1.moveTo(p[0], p[1]); else ctx1.lineTo(p[0], p[1]);
          }
          for (var b = lo.length - 1; b >= 0; b--) {
            ctx1.lineTo(P.px(lo[b][0]), P.py(lo[b][1]));
          }
          ctx1.closePath();
          ctx1.fillStyle = fillStyle;
          ctx1.fill();
          if (edge) {
            ctx1.strokeStyle = edge; ctx1.lineWidth = 1; ctx1.setLineDash([4, 4]);
            ctx1.beginPath();
            for (var c2 = 0; c2 < hi.length; c2++) {
              var q2 = [P.px(hi[c2][0]), P.py(hi[c2][1])];
              if (c2 === 0) ctx1.moveTo(q2[0], q2[1]); else ctx1.lineTo(q2[0], q2[1]);
            }
            ctx1.stroke();
            ctx1.beginPath();
            for (var c3 = 0; c3 < lo.length; c3++) {
              var q3 = [P.px(lo[c3][0]), P.py(lo[c3][1])];
              if (c3 === 0) ctx1.moveTo(q3[0], q3[1]); else ctx1.lineTo(q3[0], q3[1]);
            }
            ctx1.stroke();
            ctx1.setLineDash([]);
          }
        }
        if (f.inference && piChk.checked) fillBand(piLo, piHi, C.piBand, C.piEdge);
        if (f.inference && ciChk.checked) fillBand(bandLo, bandHi, C.ciBand, null);
        // fitted curve
        ctx1.strokeStyle = C.curve; ctx1.lineWidth = 2.5;
        ctx1.beginPath();
        for (var cc = 0; cc < curve.length; cc++) {
          var qp = [P.px(curve[cc][0]), P.py(curve[cc][1])];
          if (cc === 0) ctx1.moveTo(qp[0], qp[1]); else ctx1.lineTo(qp[0], qp[1]);
        }
        ctx1.stroke();
        // points
        for (var pi2 = 0; pi2 < xs.length; pi2++) {
          ctx1.beginPath();
          ctx1.arc(P.px(xs[pi2]), P.py(ys[pi2]), 3.5, 0, 2 * Math.PI);
          ctx1.fillStyle = C.point;
          ctx1.fill();
        }
        ctx1.restore();
      } else {
        t1.textContent = 'Actual vs predicted (multivariate model)';
        var yh = f.yhat, ya = state.ys;
        var rr = rangeOf(yh.concat(ya));
        var P2 = frame(ctx1, state.w1, state.h1, rr[0], rr[1], rr[0], rr[1], 'predicted \u0177', 'actual y');
        ctx1.strokeStyle = C.refLine;
        ctx1.setLineDash([5, 5]);
        ctx1.beginPath();
        ctx1.moveTo(P2.px(rr[0]), P2.py(rr[0]));
        ctx1.lineTo(P2.px(rr[1]), P2.py(rr[1]));
        ctx1.stroke();
        ctx1.setLineDash([]);
        for (var mi = 0; mi < yh.length; mi++) {
          ctx1.beginPath();
          ctx1.arc(P2.px(yh[mi]), P2.py(ya[mi]), 3.5, 0, 2 * Math.PI);
          ctx1.fillStyle = C.point;
          ctx1.fill();
        }
      }
      // ----- chart 2: diagnostics -----
      if (!f.inference) {
        t2.textContent = 'Diagnostics unavailable (no residual degrees of freedom)';
        ctx2.clearRect(0, 0, state.w2, state.h2);
        ctx2.fillStyle = C.bg; ctx2.fillRect(0, 0, state.w2, state.h2);
        return;
      }
      if (qqChk.checked) {
        t2.textContent = 'Normal QQ plot of standardized residuals (Gaussian noise check)';
        var qq = StatCore.qqData(f.standardized);
        var all2 = qq.theoretical.concat(qq.sample);
        var r2r = rangeOf(all2);
        var P3 = frame(ctx2, state.w2, state.h2, r2r[0], r2r[1], r2r[0], r2r[1],
          'normal quantiles', 'sample quantiles');
        ctx2.strokeStyle = C.refLine;
        ctx2.setLineDash([5, 5]);
        ctx2.beginPath();
        ctx2.moveTo(P3.px(r2r[0]), P3.py(r2r[0]));
        ctx2.lineTo(P3.px(r2r[1]), P3.py(r2r[1]));
        ctx2.stroke();
        ctx2.setLineDash([]);
        for (var qi = 0; qi < qq.sample.length; qi++) {
          ctx2.beginPath();
          ctx2.arc(P3.px(qq.theoretical[qi]), P3.py(qq.sample[qi]), 3.5, 0, 2 * Math.PI);
          ctx2.fillStyle = C.resid;
          ctx2.fill();
        }
      } else {
        t2.textContent = 'Residuals vs fitted values (look for patterns and funnels)';
        var xr2 = rangeOf(f.yhat), yr2 = rangeOf(f.standardized, 0.15);
        var lim = Math.max(Math.abs(yr2[0]), Math.abs(yr2[1]), 2.5);
        var P4 = frame(ctx2, state.w2, state.h2, xr2[0], xr2[1], -lim, lim,
          'fitted \u0177', 'std. residual');
        ctx2.strokeStyle = C.refLine;
        ctx2.setLineDash([5, 5]);
        ctx2.beginPath();
        ctx2.moveTo(P4.px(xr2[0]), P4.py(0));
        ctx2.lineTo(P4.px(xr2[1]), P4.py(0));
        ctx2.stroke();
        ctx2.setLineDash([]);
        for (var ri = 0; ri < f.yhat.length; ri++) {
          ctx2.beginPath();
          ctx2.arc(P4.px(f.yhat[ri]), P4.py(f.standardized[ri]), 3.5, 0, 2 * Math.PI);
          ctx2.fillStyle = Math.abs(f.standardized[ri]) > 2.5 ? C.warn : C.resid;
          ctx2.fill();
        }
      }
    }

    // ---------- events ----------
    var sBtns = container.querySelectorAll('.sra-sample');
    for (var sb = 0; sb < sBtns.length; sb++) {
      sBtns[sb].addEventListener('click', function () {
        loadSample(this.getAttribute('data-key'));
      });
    }
    document.getElementById('sra-upload-btn').addEventListener('click', function () {
      document.getElementById('sra-file').click();
    });
    document.getElementById('sra-file').addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e2) {
        loadParsed(StatCore.parseCsv(e2.target.result), 'uploaded "' + file.name + '"');
      };
      reader.readAsText(file);
    });
    document.getElementById('sra-paste-btn').addEventListener('click', function () {
      var area = document.getElementById('sra-paste-area');
      area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('sra-paste-load').addEventListener('click', function () {
      loadParsed(StatCore.parseCsv(document.getElementById('sra-paste-text').value), 'pasted data');
    });
    ySel.addEventListener('change', function () {
      state.yKey = ySel.value;
      state.xKeys = state.xKeys.filter(function (k) { return k !== state.yKey; });
      if (state.xKeys.length === 0 && state.headers.length > 1) {
        for (var i = 0; i < state.headers.length; i++) {
          if (state.headers[i] !== state.yKey) { state.xKeys = [state.headers[i]]; break; }
        }
      }
      rebuildSelectors();
      refit();
    });
    degreeSel.addEventListener('change', function () {
      state.degree = parseInt(degreeSel.value, 10);
      refit();
    });
    ciChk.addEventListener('change', drawCharts);
    piChk.addEventListener('change', drawCharts);
    qqChk.addEventListener('change', drawCharts);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvases(); drawCharts(); });
    }

    // ---------- boot ----------
    sizeCanvases();
    loadSample('linear');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();