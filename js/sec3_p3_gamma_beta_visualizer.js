// ============================================================================
// GbCore — math core for the Gamma & Beta Visualizer (prob-3)
// DOM-free, Node-requirable.
//
// Special functions: logGamma (Lanczos, ~1e-14 relative accuracy — certified
// against exact factorials, half-integer values, the recurrence, and the
// reflection formula), regularized incomplete gamma (series + continued
// fraction) and regularized incomplete beta (continued fraction). The CDFs
// are certified by TWO INDEPENDENT ROUTES: closed-form pins for the special
// cases this page derives, and Simpson integration of the pdf.
// All displayed values (pdf/cdf curves, mean, variance, mode, posterior
// parameters) come from this core and are certified by runSelfTests().
// ============================================================================
var GbCore = (function () {
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

  // ---------- log-gamma (Lanczos approximation, z > 0) ----------
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
  function gammaFn(z) { return Math.exp(logGamma(z)); }
  function logBeta(a, b) { return logGamma(a) + logGamma(b) - logGamma(a + b); }
  function betaFn(a, b) { return Math.exp(logBeta(a, b)); }

  // ---------- densities ----------
  function gammaPdf(x, alpha, beta) {
    if (x < 0) return 0;
    if (x === 0) {
      if (alpha < 1) return Infinity;  // density diverges at 0
      if (alpha === 1) return beta;    // exponential: f(0) = beta exactly
      return 0;                        // alpha > 1
    }
    return Math.exp(alpha * Math.log(beta) - logGamma(alpha) +
                    (alpha - 1) * Math.log(x) - beta * x);
  }
  function betaPdf(x, a, b) {
    if (x < 0 || x > 1) return 0;
    if (x === 0) {
      if (a < 1) return Infinity;
      if (a === 1) return b;  // 1/B(1,b) = b  (v1 returned min(b,1) — wrong)
      return 0;
    }
    if (x === 1) {
      if (b < 1) return Infinity;
      if (b === 1) return a;  // 1/B(a,1) = a  (v1 returned min(a,1) — wrong)
      return 0;
    }
    return Math.exp(-logBeta(a, b) + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x));
  }

  // ---------- regularized lower incomplete gamma P(a, x) ----------
  // series for x < a + 1, continued fraction (for Q) otherwise
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
    var Q = Math.exp(-x + a * Math.log(x) - gln) * h;
    return 1 - Q;
  }
  function gammaCdf(x, alpha, beta) {
    if (x <= 0) return 0;
    return lowerRegGamma(alpha, beta * x);
  }

  // ---------- regularized incomplete beta I_x(a, b) ----------
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
  function betaCdf(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
                      a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }

  // ---------- closed-form statistics (the page's derivations) ----------
  function gammaStats(alpha, beta) {
    var mean = alpha / beta;
    var variance = alpha / (beta * beta);
    var mode, modeNote;
    if (alpha > 1) { mode = (alpha - 1) / beta; modeNote = null; }
    else if (alpha === 1) { mode = 0; modeNote = 'mode at 0 (f(0) = \u03B2)'; }
    else { mode = 0; modeNote = 'density diverges at 0'; }
    return { mean: mean, variance: variance, sd: Math.sqrt(variance), mode: mode, modeNote: modeNote };
  }
  function betaStats(a, b) {
    var mean = a / (a + b);
    var variance = a * b / ((a + b) * (a + b) * (a + b + 1));
    var mode = null, modeNote = null;
    if (a > 1 && b > 1) mode = (a - 1) / (a + b - 2);
    else if (a === 1 && b === 1) modeNote = 'uniform: every point is a mode';
    else if (a < 1 && b < 1) modeNote = 'bimodal: density diverges at 0 and 1';
    else if (a <= 1 && b > 1) { mode = 0; modeNote = a < 1 ? 'density diverges at 0' : null; }
    else { mode = 1; modeNote = b < 1 ? 'density diverges at 1' : null; }
    return { mean: mean, variance: variance, sd: Math.sqrt(variance), mode: mode, modeNote: modeNote };
  }

  // ---------- conjugate Bayesian update (Beta prior, Binomial likelihood) ----------
  function bayesUpdate(a, b, k, n) {
    return { a: a + k, b: b + (n - k) };
  }

  // ---------- plotting range for the gamma pdf ----------
  function gammaXRange(alpha, beta) {
    var mode = alpha > 1 ? (alpha - 1) / beta : 0;
    var mean = alpha / beta;
    var sd = Math.sqrt(alpha) / beta;
    var maxX = Math.max(mode * 3, mean + 3 * sd);
    return { min: 0, max: Math.min(Math.max(maxX, 2), 30) };
  }

  // ---------- special-case presets (single source for the UI buttons) ----------
  var SPECIAL_GAMMA = [
    { key: 'exponential', label: 'Exponential (\u03B1=1, \u03B2=1.5)', alpha: 1, beta: 1.5 },
    { key: 'chisq4',      label: 'Chi-squared df=4 (\u03B1=2, \u03B2=0.5)', alpha: 2, beta: 0.5 },
    { key: 'erlang',      label: 'Erlang k=9 (\u03B1=9, \u03B2=2)', alpha: 9, beta: 2 }
  ];
  var SPECIAL_BETA = [
    { key: 'uniform',  label: 'Uniform (a=1, b=1)', a: 1, b: 1 },
    { key: 'arcsine',  label: 'Arcsine / Jeffreys (a=\u00BD, b=\u00BD)', a: 0.5, b: 0.5 },
    { key: 'skewed',   label: 'Skewed (a=2, b=5)', a: 2, b: 5 }
  ];

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
    // Simpson integration (independent numeric route, tests only)
    function simpson(f, lo, hi, n) {
      var h = (hi - lo) / n;
      var s = f(lo) + f(hi);
      for (var i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 === 1 ? 4 : 2);
      return s * h / 3;
    }

    // ---- T1: gamma function identities and pins ----
    check('T1 Gamma(1) = 1', close(gammaFn(1), 1, 1e-12));
    check('T1 Gamma(2) = 1', close(gammaFn(2), 1, 1e-12));
    check('T1 Gamma(3) = 2', close(gammaFn(3), 2, 1e-11));
    check('T1 Gamma(6) = 120', relClose(gammaFn(6), 120, 1e-12));
    check('T1 Gamma(1/2) = sqrt(pi)', relClose(gammaFn(0.5), Math.sqrt(Math.PI), 1e-12));
    // the page's half-integer chain: Gamma(3/2), Gamma(5/2), Gamma(7/2)
    check('T1 Gamma(3/2) pin', relClose(gammaFn(1.5), 0.5 * Math.sqrt(Math.PI), 1e-12));
    check('T1 Gamma(5/2) pin', relClose(gammaFn(2.5), 0.75 * Math.sqrt(Math.PI), 1e-12));
    check('T1 Gamma(7/2) = 15*sqrt(pi)/8', relClose(gammaFn(3.5), 15 * Math.sqrt(Math.PI) / 8, 1e-12));
    // high-precision spot pin (mpmath): logGamma(4.7)
    check('T1 logGamma(4.7) spot pin', close(logGamma(4.7), 2.7364051463155669, 1e-12), logGamma(4.7));
    // recurrence Gamma(z+1) = z Gamma(z), seeded
    var rng1 = makeRng(50001);
    for (var i1 = 0; i1 < 15; i1++) {
      var z1 = 0.1 + 8 * rng1();
      check('T1 recurrence #' + i1,
        close(logGamma(z1 + 1), Math.log(z1) + logGamma(z1), 1e-11));
    }
    // reflection formula Gamma(z)Gamma(1-z) = pi / sin(pi z), z in (0,1), seeded
    var rng1b = makeRng(50002);
    for (var i1b = 0; i1b < 15; i1b++) {
      var z1b = 0.05 + 0.9 * rng1b();
      var lhs = logGamma(z1b) + logGamma(1 - z1b);
      var rhs = Math.log(Math.PI / Math.sin(Math.PI * z1b));
      check('T1 reflection formula #' + i1b, close(lhs, rhs, 1e-10), lhs - rhs);
    }

    // ---- T2: beta function ----
    check('T2 B(2.5, 1.5) spot pin (mpmath)', relClose(betaFn(2.5, 1.5), 0.19634954084936208, 1e-11));
    check('T2 B(1, b) = 1/b', relClose(betaFn(1, 4), 0.25, 1e-11));
    check('T2 symmetry B(a,b) = B(b,a)', close(logBeta(2.3, 4.1), logBeta(4.1, 2.3), 1e-12));
    // independent integral route: B(a,b) = int_0^1 t^{a-1}(1-t)^{b-1} dt, a,b >= 1
    var rng2 = makeRng(50003);
    for (var i2 = 0; i2 < 8; i2++) {
      // a, b >= 2 keeps the integrand C^1 at the endpoints (Simpson converges);
      // the a,b < 2 region is covered by closed-form pins instead
      var a2 = 2 + 4 * rng2(), b2 = 2 + 4 * rng2();
      var numeric = simpson(function (t) {
        return Math.pow(t, a2 - 1) * Math.pow(1 - t, b2 - 1);
      }, 0, 1, 2000);
      check('T2 integral route #' + i2, relClose(betaFn(a2, b2), numeric, 1e-6));
    }

    // ---- T3: gamma pdf ----
    // exponential closed form (alpha = 1): f(x) = beta e^{-beta x}
    var rng3 = makeRng(50004);
    for (var i3 = 0; i3 < 10; i3++) {
      var lam = 0.3 + 3 * rng3(), x3 = 5 * rng3();
      check('T3 exponential pdf closed form #' + i3,
        relClose(gammaPdf(x3, 1, lam), lam * Math.exp(-lam * x3), 1e-12));
    }
    // spot pin (mpmath): gammaPdf(1.3; 3.2, 1.4)
    check('T3 gamma pdf spot pin', relClose(gammaPdf(1.3, 3.2, 1.4), 0.34941593060754606, 1e-11));
    // boundary values (v1 regression class)
    check('T3 f(0) = beta for alpha = 1 (regression)', gammaPdf(0, 1, 3.7) === 3.7);
    check('T3 f(0) = Infinity for alpha < 1', gammaPdf(0, 0.5, 1) === Infinity);
    check('T3 f(0) = 0 for alpha > 1', gammaPdf(0, 2, 1) === 0);
    check('T3 f(x) = 0 for x < 0', gammaPdf(-1, 2, 1) === 0);
    // integrates to 1 (numeric, seeded alpha >= 1)
    var rng3b = makeRng(50005);
    for (var i3b = 0; i3b < 6; i3b++) {
      var al = 2 + 5 * rng3b(), be = 0.4 + 2 * rng3b();
      var hi = al / be + 14 * Math.sqrt(al) / be;
      var mass = simpson(function (x) { return gammaPdf(x, al, be); }, 0, hi, 4000);
      check('T3 integrates to 1 #' + i3b, close(mass, 1, 5e-4), mass);
      // mean by numeric integral matches alpha/beta (the page's derivation)
      var m3 = simpson(function (x) { return x * gammaPdf(x, al, be); }, 0, hi, 4000);
      check('T3 numeric mean = alpha/beta #' + i3b, relClose(m3, al / be, 2e-3));
    }
    // mode maximality: f(mode) >= f(mode +- eps) for alpha > 1
    var st3 = gammaStats(3.5, 1.2);
    check('T3 mode maximality',
      gammaPdf(st3.mode, 3.5, 1.2) >= gammaPdf(st3.mode + 0.01, 3.5, 1.2) &&
      gammaPdf(st3.mode, 3.5, 1.2) >= gammaPdf(st3.mode - 0.01, 3.5, 1.2));

    // ---- T4: beta pdf ----
    check('T4 Beta(1,1) is uniform', relClose(betaPdf(0.3, 1, 1), 1, 1e-12) && relClose(betaPdf(0.77, 1, 1), 1, 1e-12));
    // spot pin (mpmath): betaPdf(0.3; 2, 5) = 2.1609
    check('T4 beta pdf spot pin', relClose(betaPdf(0.3, 2, 5), 2.1609, 1e-10), betaPdf(0.3, 2, 5));
    // arcsine closed form: f(x) = 1 / (pi sqrt(x(1-x)))
    var rng4 = makeRng(50006);
    for (var i4 = 0; i4 < 8; i4++) {
      var x4 = 0.05 + 0.9 * rng4();
      check('T4 arcsine closed form #' + i4,
        relClose(betaPdf(x4, 0.5, 0.5), 1 / (Math.PI * Math.sqrt(x4 * (1 - x4))), 1e-10));
    }
    // symmetry f(x; a, b) = f(1-x; b, a), seeded
    var rng4b = makeRng(50007);
    for (var i4b = 0; i4b < 10; i4b++) {
      var aa4 = 0.4 + 4 * rng4b(), bb4 = 0.4 + 4 * rng4b(), xx4 = 0.02 + 0.96 * rng4b();
      check('T4 symmetry #' + i4b,
        relClose(betaPdf(xx4, aa4, bb4), betaPdf(1 - xx4, bb4, aa4), 1e-10));
    }
    // BOUNDARY REGRESSION PINS (the v1 bug: min(b,1) instead of b)
    check('T4 Beta(1, 5): f(0) = 5 (v1 regression)', betaPdf(0, 1, 5) === 5);
    check('T4 Beta(5, 1): f(1) = 5 (v1 regression)', betaPdf(1, 5, 1) === 5);
    check('T4 Beta(0.5, 2): f(0) = Infinity', betaPdf(0, 0.5, 2) === Infinity);
    check('T4 Beta(3, 2): f(0) = 0', betaPdf(0, 3, 2) === 0);
    check('T4 outside support', betaPdf(1.2, 2, 2) === 0 && betaPdf(-0.1, 2, 2) === 0);
    // integrates to 1 (a, b >= 1)
    var rng4c = makeRng(50008);
    for (var i4c = 0; i4c < 6; i4c++) {
      var a4c = 2 + 4 * rng4c(), b4c = 2 + 4 * rng4c();
      var mass4 = simpson(function (x) { return betaPdf(x, a4c, b4c); }, 0, 1, 2000);
      check('T4 integrates to 1 #' + i4c, close(mass4, 1, 1e-6), mass4);
    }

    // ---- T5: CDFs, two independent routes + closed-form pins ----
    // exponential: F(x) = 1 - e^{-beta x}  (the page's formula)
    var rng5 = makeRng(50009);
    for (var i5 = 0; i5 < 10; i5++) {
      var lam5 = 0.3 + 3 * rng5(), x5 = 6 * rng5();
      check('T5 exponential cdf closed form #' + i5,
        close(gammaCdf(x5, 1, lam5), 1 - Math.exp(-lam5 * x5), 1e-10));
    }
    // alpha = 2: F(x) = 1 - e^{-beta x}(1 + beta x)
    var rng5b = makeRng(50010);
    for (var i5b = 0; i5b < 10; i5b++) {
      var be5 = 0.3 + 2 * rng5b(), x5b = 8 * rng5b();
      check('T5 alpha=2 cdf closed form #' + i5b,
        close(gammaCdf(x5b, 2, be5), 1 - Math.exp(-be5 * x5b) * (1 + be5 * x5b), 1e-10));
    }
    // spot pin (mpmath): P(3.2, 2.38) -> gammaCdf(1.7; 3.2, 1.4)
    check('T5 gamma cdf spot pin', close(gammaCdf(1.7, 3.2, 1.4), 0.37712918162794188, 1e-10), gammaCdf(1.7, 3.2, 1.4));
    // both series and continued-fraction branches vs Simpson (seeded)
    var rng5c = makeRng(50011);
    for (var i5c = 0; i5c < 8; i5c++) {
      var al5 = 1 + 5 * rng5c(), be5c = 0.4 + 2 * rng5c();
      var xq = (i5c % 2 === 0) ? 0.5 * al5 / be5c : 2.5 * al5 / be5c; // hit both branches
      var numeric5 = simpson(function (x) { return gammaPdf(x, al5, be5c); }, 0, xq, 4000);
      check('T5 gamma cdf vs Simpson #' + i5c, close(gammaCdf(xq, al5, be5c), numeric5, 5e-5),
        gammaCdf(xq, al5, be5c) - numeric5);
    }
    // monotonicity + limits
    check('T5 gamma cdf at 0', gammaCdf(0, 3, 1) === 0);
    check('T5 gamma cdf far right ~ 1', close(gammaCdf(200, 3, 1), 1, 1e-9));
    // beta cdf closed forms
    var rng5d = makeRng(50012);
    for (var i5d = 0; i5d < 8; i5d++) {
      var x5d = 0.05 + 0.9 * rng5d();
      check('T5 Beta(1,1) cdf = x #' + i5d, close(betaCdf(x5d, 1, 1), x5d, 1e-10));
      check('T5 Beta(2,2) cdf = 3x^2-2x^3 #' + i5d,
        close(betaCdf(x5d, 2, 2), 3 * x5d * x5d - 2 * x5d * x5d * x5d, 1e-10));
    }
    // spot pin (mpmath): I_0.35(2.5, 4)
    check('T5 beta cdf spot pin', close(betaCdf(0.35, 2.5, 4), 0.45480978374959288, 1e-10), betaCdf(0.35, 2.5, 4));
    // symmetry F(x; a, b) = 1 - F(1-x; b, a); median of symmetric case
    var rng5e = makeRng(50013);
    for (var i5e = 0; i5e < 10; i5e++) {
      var a5e = 0.5 + 4 * rng5e(), b5e = 0.5 + 4 * rng5e(), x5e = 0.03 + 0.94 * rng5e();
      check('T5 beta cdf symmetry #' + i5e,
        close(betaCdf(x5e, a5e, b5e), 1 - betaCdf(1 - x5e, b5e, a5e), 1e-10));
    }
    check('T5 symmetric beta median at 1/2', close(betaCdf(0.5, 3.3, 3.3), 0.5, 1e-10));
    // beta cdf vs Simpson (a, b >= 1, both symmetry branches)
    var rng5f = makeRng(50014);
    for (var i5f = 0; i5f < 8; i5f++) {
      var a5f = 2 + 4 * rng5f(), b5f = 2 + 4 * rng5f();
      var x5f = (i5f % 2 === 0) ? 0.15 : 0.85;
      var numeric5f = simpson(function (t) { return betaPdf(t, a5f, b5f); }, 0, x5f, 3000);
      check('T5 beta cdf vs Simpson #' + i5f, close(betaCdf(x5f, a5f, b5f), numeric5f, 1e-6));
    }
    check('T5 beta cdf boundaries', betaCdf(0, 2, 3) === 0 && betaCdf(1, 2, 3) === 1);
    // extreme-x pins (mpmath): these REQUIRE the symmetry branch — the direct
    // continued fraction loses 4+ digits or diverges outright for x near 1
    check('T5 extreme-x pin I_0.98(8,8)', close(betaCdf(0.98, 8, 8), 0.99999999985469039, 1e-10), betaCdf(0.98, 8, 8));
    check('T5 extreme-x pin I_0.999(5,5)', close(betaCdf(0.999, 5, 5), 0.99999999999987442, 1e-11));
    // bounds certificate: a CDF must satisfy 0 <= F <= 1 everywhere
    var rng5g = makeRng(50016);
    for (var i5g = 0; i5g < 20; i5g++) {
      var a5g = 2 + 13 * rng5g(), b5g = 2 + 13 * rng5g();
      var x5g = [0.9, 0.99, 0.999, 0.9999][i5g % 4];
      var F5g = betaCdf(x5g, a5g, b5g);
      check('T5 cdf bounds #' + i5g, F5g >= 0 && F5g <= 1 + 1e-12, F5g);
      check('T5 cdf near-1 sanity #' + i5g, F5g > 0.5, F5g);
    }

    // ---- T6: statistics (the page's closed forms) ----
    var g6 = gammaStats(3, 2);
    check('T6 gamma mean pin', g6.mean === 1.5);
    check('T6 gamma variance pin', g6.variance === 0.75);
    check('T6 gamma sd consistency', close(g6.sd, Math.sqrt(0.75), 1e-15));
    check('T6 gamma mode pin', g6.mode === 1);
    check('T6 gamma alpha<1 mode note', gammaStats(0.5, 1).modeNote === 'density diverges at 0');
    var b6 = betaStats(2, 5);
    check('T6 beta mean pin', close(b6.mean, 2 / 7, 1e-15));
    check('T6 beta variance pin', close(b6.variance, 10 / (49 * 8), 1e-15));
    check('T6 beta mode pin', close(b6.mode, 0.2, 1e-15));
    check('T6 uniform mode note', betaStats(1, 1).modeNote === 'uniform: every point is a mode');
    check('T6 bimodal note', betaStats(0.5, 0.5).modeNote === 'bimodal: density diverges at 0 and 1');
    // numeric-integral agreement for beta mean/variance (a, b >= 1)
    var rng6 = makeRng(50015);
    for (var i6 = 0; i6 < 5; i6++) {
      var a6 = 1 + 4 * rng6(), b6b = 1 + 4 * rng6();
      var st6 = betaStats(a6, b6b);
      var m6 = simpson(function (x) { return x * betaPdf(x, a6, b6b); }, 0, 1, 2000);
      var v6 = simpson(function (x) { return (x - st6.mean) * (x - st6.mean) * betaPdf(x, a6, b6b); }, 0, 1, 2000);
      check('T6 beta numeric mean #' + i6, relClose(m6, st6.mean, 1e-5));
      check('T6 beta numeric variance #' + i6, relClose(v6, st6.variance, 1e-4));
    }

    // ---- T7: special-case presets ----
    check('T7 chi-squared df=4 is Gamma(2, 1/2)',
      SPECIAL_GAMMA[1].alpha === 2 && SPECIAL_GAMMA[1].beta === 0.5);
    check('T7 exponential preset alpha = 1', SPECIAL_GAMMA[0].alpha === 1);
    check('T7 uniform preset', SPECIAL_BETA[0].a === 1 && SPECIAL_BETA[0].b === 1);
    check('T7 arcsine preset', SPECIAL_BETA[1].a === 0.5 && SPECIAL_BETA[1].b === 0.5);

    // ---- T8: conjugate Bayesian update ----
    var post = bayesUpdate(2, 3, 7, 10);
    check('T8 posterior parameters pin', post.a === 9 && post.b === 6);
    // posterior mean moves from prior mean toward the sample proportion k/n
    var priorMean = 2 / 5, sample = 0.7, postMean = 9 / 15;
    check('T8 posterior mean between prior mean and k/n',
      postMean > priorMean && postMean < sample);
    check('T8 no data -> posterior = prior',
      bayesUpdate(2, 3, 0, 0).a === 2 && bayesUpdate(2, 3, 0, 0).b === 3);

    // ---- T9: plotting range ----
    var r9 = gammaXRange(3, 1);
    check('T9 range covers mean + 3sd', r9.max >= 3 + 3 * Math.sqrt(3) - 1e-12);
    check('T9 range bounded', gammaXRange(100, 0.1).max <= 30 && gammaXRange(0.2, 5).max >= 2);
    check('T9 range starts at 0', r9.min === 0);

    // ---- T10: RNG determinism ----
    var ra = makeRng(42), rb = makeRng(42);
    var same = true;
    for (var i10 = 0; i10 < 10; i10++) { if (ra() !== rb()) same = false; }
    check('T10 rng deterministic', same);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  return {
    makeRng: makeRng,
    logGamma: logGamma,
    gammaFn: gammaFn,
    logBeta: logBeta,
    betaFn: betaFn,
    gammaPdf: gammaPdf,
    betaPdf: betaPdf,
    gammaCdf: gammaCdf,
    betaCdf: betaCdf,
    gammaStats: gammaStats,
    betaStats: betaStats,
    bayesUpdate: bayesUpdate,
    gammaXRange: gammaXRange,
    SPECIAL_GAMMA: SPECIAL_GAMMA,
    SPECIAL_BETA: SPECIAL_BETA,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = GbCore; }
// ============================================================================
// UI layer — three tabs: Gamma distribution, Beta distribution (with a
// conjugate-prior Bayesian overlay), and the Gamma function itself.
// Renders only what GbCore computes; the gate refuses to render on self-test
// failure. Prefix: gbv-. Dark island (fixed palette).
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
    pdf: '#42a5f5',
    pdfFill: 'rgba(66, 165, 245, 0.15)',
    cdf: '#2ecc71',
    meanLine: '#64b4ff',
    modeLine: '#ffc857',
    sdBand: 'rgba(100, 180, 255, 0.10)',
    posterior: '#ff8a65',
    marker: '#ffc857',
    bad: '#ef5350',
    warn: '#ffc857'
  };

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }

  function init() {
    var container = document.getElementById('gamma-beta-visualizer');
    if (!container) return;
    if (container.dataset.gbvInit) return;
    container.dataset.gbvInit = '1';

    // ---------- gate ----------
    var gate;
    try { gate = GbCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown')], count: 0 }; }
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + String(shown[gi]).replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="gbv-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
        ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
        '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
        gate.failures.length + ' of ' + gate.count + ' checks).</strong>' +
        '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render ' +
        'rather than display incorrect mathematics. Failures:</p>' +
        '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
      return;
    }

    // ---------- DOM ----------
    function specialBtns(list, cls) {
      var html = '';
      for (var i = 0; i < list.length; i++) {
        html += '<button class="' + cls + '" data-key="' + list[i].key + '">' + list[i].label + '</button>';
      }
      return html;
    }
    container.innerHTML =
      '<div class="gbv-root">' +
        '<div class="gbv-canvaswrap">' +
          '<div class="gbv-tabs">' +
            '<button id="gbv-tab-gamma" class="gbv-tab gbv-tab-active">Gamma distribution</button>' +
            '<button id="gbv-tab-beta" class="gbv-tab">Beta distribution</button>' +
            '<button id="gbv-tab-fn" class="gbv-tab">\u0393(z) function</button>' +
          '</div>' +
          '<canvas id="gbv-canvas"></canvas>' +
          '<div id="gbv-legend" class="gbv-legend"></div>' +
        '</div>' +
        '<div class="gbv-controls">' +
          '<div id="gbv-readouts" class="gbv-group gbv-readouts"></div>' +
          '<div class="gbv-group" id="gbv-gamma-controls">' +
            '<div class="gbv-sliderrow"><label for="gbv-g-alpha">\u03B1 (shape) = <span id="gbv-g-alpha-val"></span></label>' +
              '<input type="range" id="gbv-g-alpha" min="0.1" max="10" step="0.05" value="2"></div>' +
            '<div class="gbv-sliderrow"><label for="gbv-g-beta">\u03B2 (rate) = <span id="gbv-g-beta-val"></span></label>' +
              '<input type="range" id="gbv-g-beta" min="0.1" max="5" step="0.05" value="1"></div>' +
            '<div class="gbv-btnrow">' + specialBtns(GbCore.SPECIAL_GAMMA, 'gbv-special-g') + '</div>' +
          '</div>' +
          '<div class="gbv-group" id="gbv-beta-controls" style="display:none;">' +
            '<div class="gbv-sliderrow"><label for="gbv-b-a">a = <span id="gbv-b-a-val"></span></label>' +
              '<input type="range" id="gbv-b-a" min="0.1" max="10" step="0.05" value="2"></div>' +
            '<div class="gbv-sliderrow"><label for="gbv-b-b">b = <span id="gbv-b-b-val"></span></label>' +
              '<input type="range" id="gbv-b-b" min="0.1" max="10" step="0.05" value="5"></div>' +
            '<div class="gbv-btnrow">' + specialBtns(GbCore.SPECIAL_BETA, 'gbv-special-b') + '</div>' +
            '<label class="gbv-toggle" style="margin-top:10px;"><input type="checkbox" id="gbv-bayes"> Bayesian update (conjugate prior)</label>' +
            '<div id="gbv-bayes-controls" style="display:none;">' +
              '<div class="gbv-sliderrow"><label for="gbv-bayes-n">n trials = <span id="gbv-bayes-n-val"></span></label>' +
                '<input type="range" id="gbv-bayes-n" min="1" max="50" step="1" value="10"></div>' +
              '<div class="gbv-sliderrow"><label for="gbv-bayes-k">k successes = <span id="gbv-bayes-k-val"></span></label>' +
                '<input type="range" id="gbv-bayes-k" min="0" max="10" step="1" value="7"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gbv-group" id="gbv-common-controls">' +
            '<label class="gbv-toggle"><input type="checkbox" id="gbv-cdf"> Show CDF (right axis)</label>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#gamma-beta-visualizer .gbv-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
      '@media (min-width: 992px){#gamma-beta-visualizer .gbv-root{flex-direction:row;align-items:flex-start;}' +
      '#gamma-beta-visualizer .gbv-canvaswrap{flex:3;}#gamma-beta-visualizer .gbv-controls{flex:2;max-width:420px;}}' +
      '#gamma-beta-visualizer .gbv-canvaswrap,#gamma-beta-visualizer .gbv-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#gamma-beta-visualizer .gbv-controls{box-shadow:0 8px 32px rgba(0,0,0,0.3);}' +
      '#gamma-beta-visualizer .gbv-tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;}' +
      '#gamma-beta-visualizer .gbv-tab{flex:1;min-width:110px;padding:8px 6px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.88rem;}' +
      '#gamma-beta-visualizer .gbv-tab-active{background:linear-gradient(135deg,#1565c0,#42a5f5);border-color:transparent;color:#fff;font-weight:bold;}' +
      '#gamma-beta-visualizer #gbv-canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;}' +
      '#gamma-beta-visualizer .gbv-legend{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.85rem;color:' + C.textDim + ';}' +
      '@media (max-width: 600px){#gamma-beta-visualizer .gbv-legend{grid-template-columns:1fr;}}' +
      '#gamma-beta-visualizer .gbv-li{display:flex;align-items:center;}' +
      '#gamma-beta-visualizer .gbv-sw{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:2px;flex:none;}' +
      '#gamma-beta-visualizer .gbv-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
      '#gamma-beta-visualizer .gbv-sliderrow{margin-bottom:10px;}' +
      '#gamma-beta-visualizer .gbv-sliderrow label{display:block;font-size:0.88rem;color:' + C.textDim + ';margin-bottom:4px;font-weight:bold;}' +
      '#gamma-beta-visualizer .gbv-sliderrow input[type=range]{width:100%;}' +
      '#gamma-beta-visualizer .gbv-sliderrow span{color:' + C.accent + ';font-family:"Courier New",monospace;}' +
      '#gamma-beta-visualizer .gbv-btnrow{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}' +
      '#gamma-beta-visualizer .gbv-special-g,#gamma-beta-visualizer .gbv-special-b{flex:1;min-width:100px;padding:7px 4px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.8rem;}' +
      '#gamma-beta-visualizer .gbv-special-g:hover,#gamma-beta-visualizer .gbv-special-b:hover{background:rgba(255,255,255,0.1);}' +
      '#gamma-beta-visualizer .gbv-readouts{font-size:0.92rem;line-height:1.6;}' +
      '#gamma-beta-visualizer .gbv-val{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#gamma-beta-visualizer .gbv-sub{color:' + C.faint + ';font-size:0.85rem;}' +
      '#gamma-beta-visualizer .gbv-warn{color:' + C.warn + ';font-weight:bold;}' +
      '#gamma-beta-visualizer .gbv-post{color:' + C.posterior + ';font-weight:bold;}' +
      '#gamma-beta-visualizer .gbv-toggle{display:flex;align-items:center;gap:8px;font-size:0.9rem;color:' + C.textDim + ';cursor:pointer;}';
    document.head.appendChild(style);

    var canvas = document.getElementById('gbv-canvas');
    var ctx = canvas.getContext('2d');
    var readoutsEl = document.getElementById('gbv-readouts');
    var legendEl = document.getElementById('gbv-legend');
    var tabs = {
      gamma: document.getElementById('gbv-tab-gamma'),
      beta: document.getElementById('gbv-tab-beta'),
      fn: document.getElementById('gbv-tab-fn')
    };
    var gAlphaSl = document.getElementById('gbv-g-alpha');
    var gBetaSl = document.getElementById('gbv-g-beta');
    var bASl = document.getElementById('gbv-b-a');
    var bBSl = document.getElementById('gbv-b-b');
    var cdfChk = document.getElementById('gbv-cdf');
    var bayesChk = document.getElementById('gbv-bayes');
    var bayesN = document.getElementById('gbv-bayes-n');
    var bayesK = document.getElementById('gbv-bayes-k');

    var state = {
      tab: 'gamma',
      gAlpha: 2, gBeta: 1,
      bA: 2, bB: 5,
      showCdf: false,
      bayesOn: false, bayesKv: 7, bayesNv: 10,
      cssW: 640, cssH: 400
    };

    var PAD_L = 46, PAD_R = 40, PAD_T = 14, PAD_B = 34;
    function plotRect() {
      return { x0: PAD_L, y0: PAD_T, w: state.cssW - PAD_L - PAD_R, h: state.cssH - PAD_T - PAD_B };
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

    function clearPlot() {
      ctx.clearRect(0, 0, state.cssW, state.cssH);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, state.cssW, state.cssH);
    }
    function drawFrame(r, xMin, xMax, yMax, xLabel, rightAxis) {
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
        ctx.fillText(fmt(xv, xMax - xMin > 8 ? 0 : 1), tx - 8, r.y0 + r.h + 16);
        var yv = yMax * (1 - i / ticks);
        ctx.fillText(fmt(yv, yMax > 8 ? 0 : 2), r.x0 - 34, ty + 4);
        if (rightAxis) {
          ctx.fillText(fmt(1 - i / ticks, 1), r.x0 + r.w + 8, ty + 4);
        }
      }
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(r.x0, r.y0, r.w, r.h);
      ctx.fillStyle = C.textDim;
      ctx.fillText(xLabel, r.x0 + r.w - 10, r.y0 + r.h + 28);
    }
    function xToPx(r, x, xMin, xMax) { return r.x0 + (x - xMin) / (xMax - xMin) * r.w; }
    function yToPx(r, y, yMax) { return r.y0 + r.h * (1 - Math.min(y, yMax * 1.05) / yMax); }

    function drawCurve(r, f, xMin, xMax, yMax, color, dashed, fill) {
      var N = 400;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.beginPath();
      var started = false;
      var basePts = [];
      for (var i = 0; i <= N; i++) {
        var x = xMin + (xMax - xMin) * i / N;
        var y = f(x);
        if (!isFinite(y)) { continue; }
        var px = xToPx(r, x, xMin, xMax);
        var py = yToPx(r, y, yMax);
        py = Math.max(py, r.y0);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
        basePts.push([px, py]);
      }
      if (fill && basePts.length > 1) {
        ctx.lineTo(basePts[basePts.length - 1][0], r.y0 + r.h);
        ctx.lineTo(basePts[0][0], r.y0 + r.h);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        // re-stroke the top edge only
        ctx.beginPath();
        for (var j = 0; j < basePts.length; j++) {
          if (j === 0) ctx.moveTo(basePts[j][0], basePts[j][1]);
          else ctx.lineTo(basePts[j][0], basePts[j][1]);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    function vLine(r, x, xMin, xMax, color, dash, label) {
      var px = xToPx(r, x, xMin, xMax);
      if (px < r.x0 || px > r.x0 + r.w) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(px, r.y0); ctx.lineTo(px, r.y0 + r.h); ctx.stroke();
      ctx.setLineDash([]);
      if (label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(label, px + 4, r.y0 + 14);
      }
    }

    // yMax: max over interior samples, capped at twice the central max so a
    // divergent edge (alpha < 1 etc.) is clipped rather than flattening the plot
    function computeYMax(f, xMin, xMax) {
      var N = 400, all = 0, central = 0;
      for (var i = 1; i < N; i++) {
        var x = xMin + (xMax - xMin) * i / N;
        var y = f(x);
        if (!isFinite(y)) continue;
        if (y > all) all = y;
        if (i > N * 0.1 && i < N * 0.9 && y > central) central = y;
      }
      var yMax = Math.min(all, Math.max(2 * central, 0.5));
      return yMax > 0 ? yMax * 1.08 : 1;
    }

    function setLegend(items) {
      var html = '';
      for (var i = 0; i < items.length; i++) {
        html += '<div class="gbv-li"><span class="gbv-sw" style="background:' + items[i][0] + ';"></span>' + items[i][1] + '</div>';
      }
      legendEl.innerHTML = html;
    }

    function statsHtml(st, divergent) {
      var html = '<div>mean = <span class="gbv-val">' + fmt(st.mean, 3) + '</span>, ' +
        'variance = <span class="gbv-val">' + fmt(st.variance, 3) + '</span>, ' +
        '\u03C3 = <span class="gbv-val">' + fmt(st.sd, 3) + '</span></div>';
      if (st.mode !== null && st.mode !== undefined) {
        html += '<div>mode = <span class="gbv-val">' + fmt(st.mode, 3) + '</span>' +
          (st.modeNote ? ' <span class="gbv-sub">(' + st.modeNote + ')</span>' : '') + '</div>';
      } else if (st.modeNote) {
        html += '<div class="gbv-sub">mode: ' + st.modeNote + '</div>';
      }
      if (divergent) {
        html += '<div class="gbv-warn">The density diverges at the clipped edge \u2014 the curve is cut at the plot top, but its integral is still 1.</div>';
      }
      return html;
    }

    // ---------- tab drawing ----------
    function drawGamma() {
      clearPlot();
      var r = plotRect();
      var al = state.gAlpha, be = state.gBeta;
      var range = GbCore.gammaXRange(al, be);
      var f = function (x) { return GbCore.gammaPdf(x, al, be); };
      var yMax = computeYMax(f, range.min, range.max);
      drawFrame(r, range.min, range.max, yMax, 'x', state.showCdf);
      var st = GbCore.gammaStats(al, be);
      // +-sigma band
      var lo = Math.max(range.min, st.mean - st.sd), hi = Math.min(range.max, st.mean + st.sd);
      ctx.fillStyle = C.sdBand;
      ctx.fillRect(xToPx(r, lo, range.min, range.max), r.y0,
                   xToPx(r, hi, range.min, range.max) - xToPx(r, lo, range.min, range.max), r.h);
      drawCurve(r, f, range.min + 1e-9, range.max, yMax, C.pdf, false, C.pdfFill);
      vLine(r, st.mean, range.min, range.max, C.meanLine, [6, 4], 'mean');
      if (al > 1) vLine(r, st.mode, range.min, range.max, C.modeLine, [2, 4], 'mode');
      if (state.showCdf) {
        drawCurve(r, function (x) { return GbCore.gammaCdf(x, al, be) * yMax; },
          range.min, range.max, yMax, C.cdf, true, null);
      }
      var eq = 'Gamma(\u03B1 = ' + fmt(al, 2) + ', \u03B2 = ' + fmt(be, 2) + ')';
      readoutsEl.innerHTML = '<div><strong>' + eq + '</strong> ' +
        '<span class="gbv-sub">mean = \u03B1/\u03B2, var = \u03B1/\u03B2\u00B2</span></div>' +
        statsHtml(st, al < 1);
      var leg = [[C.pdf, 'pdf f(x)'], [C.meanLine, 'mean \u03B1/\u03B2 (dashed)'], [C.sdBand, 'mean \u00B1 \u03C3 band']];
      if (al > 1) leg.splice(2, 0, [C.modeLine, 'mode (\u03B1\u22121)/\u03B2 (dotted)']);
      if (state.showCdf) leg.push([C.cdf, 'CDF (right axis)']);
      setLegend(leg);
      container.dataset.gbvState = JSON.stringify({ tab: 'gamma', alpha: al, beta: be, cdf: state.showCdf });
    }

    function drawBeta() {
      clearPlot();
      var r = plotRect();
      var a = state.bA, b = state.bB;
      var f = function (x) { return GbCore.betaPdf(x, a, b); };
      var post = state.bayesOn ? GbCore.bayesUpdate(a, b, state.bayesKv, state.bayesNv) : null;
      var fPost = post ? function (x) { return GbCore.betaPdf(x, post.a, post.b); } : null;
      var yMax = computeYMax(f, 0, 1);
      if (fPost) yMax = Math.max(yMax, computeYMax(fPost, 0, 1));
      drawFrame(r, 0, 1, yMax, 'x', state.showCdf);
      var st = GbCore.betaStats(a, b);
      var lo = Math.max(0, st.mean - st.sd), hi = Math.min(1, st.mean + st.sd);
      ctx.fillStyle = C.sdBand;
      ctx.fillRect(xToPx(r, lo, 0, 1), r.y0, xToPx(r, hi, 0, 1) - xToPx(r, lo, 0, 1), r.h);
      drawCurve(r, f, 1e-9, 1 - 1e-9, yMax, C.pdf, false, C.pdfFill);
      vLine(r, st.mean, 0, 1, C.meanLine, [6, 4], 'mean');
      if (st.mode !== null && a > 1 && b > 1) vLine(r, st.mode, 0, 1, C.modeLine, [2, 4], 'mode');
      if (state.showCdf) {
        drawCurve(r, function (x) { return GbCore.betaCdf(x, a, b) * yMax; }, 0, 1, yMax, C.cdf, true, null);
      }
      var html = '<div><strong>Beta(a = ' + fmt(a, 2) + ', b = ' + fmt(b, 2) + ')</strong> ' +
        '<span class="gbv-sub">mean = a/(a+b)</span></div>' + statsHtml(st, a < 1 || b < 1);
      if (post) {
        drawCurve(r, fPost, 1e-9, 1 - 1e-9, yMax, C.posterior, false, null);
        var pStats = GbCore.betaStats(post.a, post.b);
        html += '<div style="margin-top:6px;border-top:1px solid ' + C.border + ';padding-top:6px;">' +
          '<span class="gbv-post">Posterior after k = ' + state.bayesKv + ' successes in n = ' + state.bayesNv +
          ' trials:</span><br><span class="gbv-val">Beta(a + k, b + n \u2212 k) = Beta(' + fmt(post.a, 2) + ', ' + fmt(post.b, 2) + ')</span><br>' +
          '<span class="gbv-sub">posterior mean = ' + fmt(pStats.mean, 3) +
          ' \u2014 pulled from the prior mean ' + fmt(st.mean, 3) +
          ' toward the sample proportion k/n = ' + fmt(state.bayesKv / state.bayesNv, 3) + '</span></div>';
      }
      readoutsEl.innerHTML = html;
      var leg = [[C.pdf, 'prior pdf f(x)'], [C.meanLine, 'mean (dashed)'], [C.sdBand, 'mean \u00B1 \u03C3 band']];
      if (st.mode !== null && a > 1 && b > 1) leg.splice(2, 0, [C.modeLine, 'mode (dotted)']);
      if (state.showCdf) leg.push([C.cdf, 'CDF (right axis)']);
      if (post) leg.push([C.posterior, 'posterior pdf (conjugate update)']);
      setLegend(leg);
      container.dataset.gbvState = JSON.stringify({
        tab: 'beta', a: a, b: b, cdf: state.showCdf,
        bayes: state.bayesOn ? { k: state.bayesKv, n: state.bayesNv, postA: post.a, postB: post.b } : null
      });
    }

    function drawGammaFn() {
      clearPlot();
      var r = plotRect();
      var xMin = 0.05, xMax = 5, yMax = 25;
      drawFrame(r, xMin, xMax, yMax, 'z', false);
      drawCurve(r, function (z) { return GbCore.gammaFn(z); }, xMin, xMax, yMax, C.pdf, false, null);
      // markers: (n, (n-1)!) and (1/2, sqrt(pi))
      var pts = [[1, 1, '\u0393(1) = 0! = 1'], [2, 1, '\u0393(2) = 1! = 1'], [3, 2, '\u0393(3) = 2! = 2'],
                 [4, 6, '\u0393(4) = 3! = 6'], [5, 24, '\u0393(5) = 4! = 24'],
                 [0.5, Math.sqrt(Math.PI), '\u0393(\u00BD) = \u221A\u03C0']];
      ctx.font = 'bold 11px system-ui, sans-serif';
      for (var i = 0; i < pts.length; i++) {
        var px = xToPx(r, pts[i][0], xMin, xMax);
        var py = yToPx(r, pts[i][1], yMax);
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = pts[i][0] === 0.5 ? C.posterior : C.marker;
        ctx.fill();
        ctx.fillText(pts[i][2], px + 7, py - 6);
      }
      readoutsEl.innerHTML =
        '<div><strong>The gamma function \u0393(z)</strong></div>' +
        '<div class="gbv-sub" style="margin-top:4px;">The smooth curve interpolating the factorial: at the ' +
        'integer points, \u0393(n) = (n\u22121)! (amber markers); at z = \u00BD it takes the value \u221A\u03C0 \u2248 ' +
        fmt(Math.sqrt(Math.PI), 4) + ' (orange marker) \u2014 the two facts this page proves. ' +
        'The minimum between z = 1 and z = 2 sits near z \u2248 1.462.</div>';
      setLegend([[C.pdf, '\u0393(z)'], [C.marker, '(n, (n\u22121)!) \u2014 factorial points'],
                 [C.posterior, '(\u00BD, \u221A\u03C0)']]);
      container.dataset.gbvState = JSON.stringify({ tab: 'fn' });
    }

    function draw() {
      if (state.tab === 'gamma') drawGamma();
      else if (state.tab === 'beta') drawBeta();
      else drawGammaFn();
    }

    // ---------- interactions ----------
    function setTab(tab) {
      state.tab = tab;
      tabs.gamma.classList.toggle('gbv-tab-active', tab === 'gamma');
      tabs.beta.classList.toggle('gbv-tab-active', tab === 'beta');
      tabs.fn.classList.toggle('gbv-tab-active', tab === 'fn');
      document.getElementById('gbv-gamma-controls').style.display = tab === 'gamma' ? '' : 'none';
      document.getElementById('gbv-beta-controls').style.display = tab === 'beta' ? '' : 'none';
      document.getElementById('gbv-common-controls').style.display = tab === 'fn' ? 'none' : '';
      draw();
    }
    tabs.gamma.addEventListener('click', function () { setTab('gamma'); });
    tabs.beta.addEventListener('click', function () { setTab('beta'); });
    tabs.fn.addEventListener('click', function () { setTab('fn'); });

    function syncSliderLabels() {
      document.getElementById('gbv-g-alpha-val').textContent = fmt(state.gAlpha, 2);
      document.getElementById('gbv-g-beta-val').textContent = fmt(state.gBeta, 2);
      document.getElementById('gbv-b-a-val').textContent = fmt(state.bA, 2);
      document.getElementById('gbv-b-b-val').textContent = fmt(state.bB, 2);
      document.getElementById('gbv-bayes-n-val').textContent = String(state.bayesNv);
      document.getElementById('gbv-bayes-k-val').textContent = String(state.bayesKv);
    }
    gAlphaSl.addEventListener('input', function () {
      state.gAlpha = parseFloat(gAlphaSl.value); syncSliderLabels(); draw();
    });
    gBetaSl.addEventListener('input', function () {
      state.gBeta = parseFloat(gBetaSl.value); syncSliderLabels(); draw();
    });
    bASl.addEventListener('input', function () {
      state.bA = parseFloat(bASl.value); syncSliderLabels(); draw();
    });
    bBSl.addEventListener('input', function () {
      state.bB = parseFloat(bBSl.value); syncSliderLabels(); draw();
    });
    cdfChk.addEventListener('change', function () {
      state.showCdf = cdfChk.checked; draw();
    });
    bayesChk.addEventListener('change', function () {
      state.bayesOn = bayesChk.checked;
      document.getElementById('gbv-bayes-controls').style.display = state.bayesOn ? '' : 'none';
      draw();
    });
    bayesN.addEventListener('input', function () {
      state.bayesNv = parseInt(bayesN.value, 10);
      if (state.bayesKv > state.bayesNv) {
        state.bayesKv = state.bayesNv; // k can never exceed n
        bayesK.value = String(state.bayesKv);
      }
      bayesK.max = String(state.bayesNv);
      syncSliderLabels(); draw();
    });
    bayesK.addEventListener('input', function () {
      state.bayesKv = Math.min(parseInt(bayesK.value, 10), state.bayesNv);
      syncSliderLabels(); draw();
    });

    var gBtns = container.querySelectorAll('.gbv-special-g');
    for (var g1 = 0; g1 < gBtns.length; g1++) {
      gBtns[g1].addEventListener('click', function () {
        var key = this.getAttribute('data-key');
        for (var i = 0; i < GbCore.SPECIAL_GAMMA.length; i++) {
          if (GbCore.SPECIAL_GAMMA[i].key === key) {
            state.gAlpha = GbCore.SPECIAL_GAMMA[i].alpha;
            state.gBeta = GbCore.SPECIAL_GAMMA[i].beta;
            gAlphaSl.value = String(state.gAlpha);
            gBetaSl.value = String(state.gBeta);
          }
        }
        syncSliderLabels(); draw();
      });
    }
    var bBtns = container.querySelectorAll('.gbv-special-b');
    for (var b1 = 0; b1 < bBtns.length; b1++) {
      bBtns[b1].addEventListener('click', function () {
        var key = this.getAttribute('data-key');
        for (var i = 0; i < GbCore.SPECIAL_BETA.length; i++) {
          if (GbCore.SPECIAL_BETA[i].key === key) {
            state.bA = GbCore.SPECIAL_BETA[i].a;
            state.bB = GbCore.SPECIAL_BETA[i].b;
            bASl.value = String(state.bA);
            bBSl.value = String(state.bB);
          }
        }
        syncSliderLabels(); draw();
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvas(); draw(); });
    }

    // ---------- boot ----------
    sizeCanvas();
    syncSliderLabels();
    setTab('gamma');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();