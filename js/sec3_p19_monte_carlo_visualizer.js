// ============================================================================
// McCore — math core for the Monte Carlo Visualizer (prob-19)
// DOM-free, Node-requirable. No external statistics library (the v1 tool
// depended on an unpinned jStat CDN build; everything here is self-contained
// and certified).
//
// Design highlights, each tied to this page's content:
// * Sampling for gamma/beta is INVERSE-TRANSFORM through our own quantile
//   functions (bisection on certified CDFs) — the page's F^{-1} is literally
//   the sampler. Normal/bimodal sample directly via Box-Muller (seeded).
// * The central credible interval uses EXACTLY the page's order-statistic
//   convention: 1-based indices ceil(S*alpha/2) and ceil(S*(1-alpha/2))
//   (v1 was off by one from the page's own formula).
// * The Kolmogorov-Smirnov statistic sup|F_S - F| is computed exactly, so
//   the Glivenko-Cantelli theorem runs live as a certificate and a readout.
// * HPD comes in two certified routes: from samples (Gaussian KDE with
//   Silverman bandwidth + density-quantile threshold; handles disjoint
//   regions) and from the true density (threshold bisection with masses
//   evaluated through the exact CDF).
// ============================================================================
var McCore = (function () {
  'use strict';

  // ---------- seeded RNG + Gaussian ----------
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) {
    var u1 = rng(), u2 = rng();
    if (u1 <= 1e-12) u1 = 1e-12;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ---------- special functions (certified patterns from prob-3 / prob-11) ----------
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
  function incBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
                      a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }

  // ---------- base distributions ----------
  var SQRT2PI = Math.sqrt(2 * Math.PI);
  function stdNormalPdf(z) { return Math.exp(-z * z / 2) / SQRT2PI; }
  function stdNormalCdf(z) {
    if (z === 0) return 0.5;
    var p = lowerRegGamma(0.5, z * z / 2);
    return z > 0 ? (1 + p) / 2 : (1 - p) / 2;
  }
  // generic quantile by bisection on a monotone cdf over [lo, hi]
  function invertCdf(cdf, p, lo, hi) {
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2;
      if (cdf(mid) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // makeDist(key, params) -> { pdf, cdf, inv, sample(rng), mean, range }
  // params: normal {mu, sd}; gamma {shape, rate}; beta {a, b};
  //         bimodal {m1, m2, sd, w} (w = weight of the first component)
  function makeDist(key, prm) {
    if (key === 'normal') {
      var mu = prm.mu, sd = prm.sd;
      return {
        key: key,
        pdf: function (x) { return stdNormalPdf((x - mu) / sd) / sd; },
        cdf: function (x) { return stdNormalCdf((x - mu) / sd); },
        inv: function (p) { return mu + sd * invertCdf(stdNormalCdf, p, -13, 13); },
        sample: function (rng) { return mu + sd * gauss(rng); },
        mean: mu,
        range: [mu - 4.5 * sd, mu + 4.5 * sd]
      };
    }
    if (key === 'gamma') {
      var a = prm.shape, r = prm.rate;
      var cdf = function (x) { return x <= 0 ? 0 : lowerRegGamma(a, r * x); };
      var hi0 = a / r + 12 * Math.sqrt(a) / r + 2 / r;
      var inv = function (p) {
        var hi = hi0;
        var guard = 0;
        while (cdf(hi) < p && guard++ < 60) hi *= 2;
        return invertCdf(cdf, p, 0, hi);
      };
      return {
        key: key,
        pdf: function (x) {
          if (x < 0) return 0;
          if (x === 0) return a < 1 ? Infinity : (a === 1 ? r : 0);
          return Math.exp(a * Math.log(r) - logGamma(a) + (a - 1) * Math.log(x) - r * x);
        },
        cdf: cdf,
        inv: inv,
        sample: function (rng) { return inv(rng()); }, // inverse transform: F^{-1}(U)
        mean: a / r,
        range: [0, 0] // set below
      };
    }
    if (key === 'beta') {
      var ba = prm.a, bb = prm.b;
      var bcdf = function (x) { return incBeta(x, ba, bb); };
      return {
        key: key,
        pdf: function (x) {
          if (x < 0 || x > 1) return 0;
          if (x === 0) return ba < 1 ? Infinity : (ba === 1 ? bb : 0);
          if (x === 1) return bb < 1 ? Infinity : (bb === 1 ? ba : 0);
          return Math.exp(-(logGamma(ba) + logGamma(bb) - logGamma(ba + bb)) +
                          (ba - 1) * Math.log(x) + (bb - 1) * Math.log(1 - x));
        },
        cdf: bcdf,
        inv: function (p) { return invertCdf(bcdf, p, 0, 1); },
        sample: function (rng) { return invertCdf(bcdf, rng(), 0, 1); },
        mean: ba / (ba + bb),
        range: [0, 1]
      };
    }
    // bimodal: mixture of two normals
    var m1 = prm.m1, m2 = prm.m2, msd = prm.sd, w = prm.w;
    var mcdf = function (x) {
      return w * stdNormalCdf((x - m1) / msd) + (1 - w) * stdNormalCdf((x - m2) / msd);
    };
    var lo = Math.min(m1, m2) - 4.5 * msd, hi = Math.max(m1, m2) + 4.5 * msd;
    return {
      key: 'bimodal',
      pdf: function (x) {
        return w * stdNormalPdf((x - m1) / msd) / msd + (1 - w) * stdNormalPdf((x - m2) / msd) / msd;
      },
      cdf: mcdf,
      inv: function (p) { return invertCdf(mcdf, p, lo - 5 * msd, hi + 5 * msd); },
      sample: function (rng) {
        // component draw consumes one uniform, then Box-Muller consumes two
        var comp = rng() < w ? m1 : m2;
        return comp + msd * gauss(rng);
      },
      mean: w * m1 + (1 - w) * m2,
      range: [lo, hi]
    };
  }
  function distRange(dist) {
    if (dist.key === 'gamma') return [0, dist.inv(0.9995) * 1.08];
    return dist.range;
  }

  function sampleMany(dist, S, seed) {
    var rng = makeRng(seed);
    var out = new Array(S);
    for (var i = 0; i < S; i++) out[i] = dist.sample(rng);
    return out;
  }

  // ---------- central credible interval: the page's ceiling convention ----------
  // 1-based order statistics theta^(ceil(S*alpha/2)) and theta^(ceil(S*(1-alpha/2))).
  // fuzzCeil guards the ceiling against float noise: alpha = 1 - 95/100 is
  // 0.05000...044 in binary, and a raw ceil would jump to the WRONG index
  function fuzzCeil(v) { return Math.ceil(v - 1e-9); }
  function centralCredible(sorted, alpha) {
    var S = sorted.length;
    var li1 = Math.max(1, fuzzCeil(S * alpha / 2));
    var ui1 = Math.min(S, fuzzCeil(S * (1 - alpha / 2)));
    return { l: sorted[li1 - 1], u: sorted[ui1 - 1], lIndex1: li1, uIndex1: ui1 };
  }

  // ---------- exact Kolmogorov-Smirnov statistic sup |F_S - F| ----------
  // ksDetail also reports WHERE the sup is attained (for the plot marker):
  // side 'post' means F_S jumps above F at x, 'pre' means F exceeds F_S there
  function ksDetail(sorted, cdf) {
    var n = sorted.length;
    var D = 0, at = sorted.length ? sorted[0] : 0, side = 'post', F0 = 0;
    for (var i = 1; i <= n; i++) {
      var F = cdf(sorted[i - 1]);
      var d1 = i / n - F;       // just after the jump
      var d2 = F - (i - 1) / n; // just before the jump
      if (d1 > D) { D = d1; at = sorted[i - 1]; side = 'post'; F0 = F; }
      if (d2 > D) { D = d2; at = sorted[i - 1]; side = 'pre'; F0 = F; }
    }
    return { D: D, at: at, side: side, F: F0 };
  }
  function ksStatistic(sorted, cdf) { return ksDetail(sorted, cdf).D; }

  // ---------- running means (SLLN trace) ----------
  function runningMeans(samples) {
    var out = new Array(samples.length);
    var s = 0;
    for (var i = 0; i < samples.length; i++) {
      s += samples[i];
      out[i] = s / (i + 1);
    }
    return out;
  }

  // ---------- KDE (Gaussian kernel, Silverman bandwidth) ----------
  function sampleSd(xs) {
    var n = xs.length, m = 0;
    for (var i = 0; i < n; i++) m += xs[i];
    m /= n;
    var v = 0;
    for (var k = 0; k < n; k++) v += (xs[k] - m) * (xs[k] - m);
    return Math.sqrt(v / (n - 1));
  }
  function silvermanBandwidth(sorted) {
    var n = sorted.length;
    var sd = sampleSd(sorted);
    var q1 = sorted[Math.max(0, Math.ceil(0.25 * n) - 1)];
    var q3 = sorted[Math.max(0, Math.ceil(0.75 * n) - 1)];
    var iqr = q3 - q1;
    var spread = Math.min(sd, iqr / 1.34);
    if (!(spread > 0)) spread = sd > 0 ? sd : 1e-3;
    return 0.9 * spread * Math.pow(n, -0.2);
  }
  function kdePdf(x, samples, h) {
    var s = 0;
    for (var i = 0; i < samples.length; i++) {
      s += stdNormalPdf((x - samples[i]) / h);
    }
    return s / (samples.length * h);
  }

  // ---------- HPD from samples (KDE + density-quantile threshold) ----------
  function hpdFromSamples(sorted, alpha) {
    var n = sorted.length;
    var h = silvermanBandwidth(sorted);
    // threshold: alpha-quantile of the density values at the samples
    // (keep the highest-density (1-alpha) fraction of samples)
    var dens = new Array(n);
    for (var i = 0; i < n; i++) dens[i] = kdePdf(sorted[i], sorted, h);
    var densSorted = dens.slice().sort(function (a, b) { return a - b; });
    var threshold = densSorted[Math.max(0, fuzzCeil(n * alpha) - 1)];
    // grid scan for {x : kde(x) >= threshold}
    var lo = sorted[0] - 3 * h, hi = sorted[n - 1] + 3 * h;
    var G = 512;
    var intervals = [];
    var inRegion = false, start = 0;
    var prevX = lo, prevV = kdePdf(lo, sorted, h);
    for (var g = 0; g <= G; g++) {
      var x = lo + (hi - lo) * g / G;
      var v = kdePdf(x, sorted, h);
      var above = v >= threshold;
      if (above && !inRegion) {
        // linear interpolation of the crossing
        start = g === 0 ? x : prevX + (threshold - prevV) / (v - prevV) * (x - prevX);
        inRegion = true;
      } else if (!above && inRegion) {
        var end = prevX + (threshold - prevV) / (v - prevV) * (x - prevX);
        intervals.push({ start: start, end: end });
        inRegion = false;
      }
      prevX = x; prevV = v;
    }
    if (inRegion) intervals.push({ start: start, end: hi });
    // mass: fraction of samples inside the region
    var inside = 0;
    for (var s2 = 0; s2 < n; s2++) {
      for (var t = 0; t < intervals.length; t++) {
        if (sorted[s2] >= intervals[t].start && sorted[s2] <= intervals[t].end) { inside++; break; }
      }
    }
    return { intervals: intervals, threshold: threshold, mass: inside / n, bandwidth: h };
  }

  // ---------- HPD from the true density (threshold bisection, masses via cdf) ----------
  function hpdTrue(dist, alpha) {
    var range = distRange(dist);
    var lo = range[0], hi = range[1];
    var G = 2048;
    var xs = new Array(G + 1), ps = new Array(G + 1);
    var pmax = 0;
    for (var g = 0; g <= G; g++) {
      xs[g] = lo + (hi - lo) * g / G;
      var pv = dist.pdf(xs[g]);
      if (!isFinite(pv)) pv = 1e300; // divergent edges count as "above any threshold"
      ps[g] = pv;
      if (pv < 1e300 && pv > pmax) pmax = pv;
    }
    function regionFor(pstar) {
      var intervals = [];
      var inRegion = false, start = 0;
      for (var g2 = 0; g2 <= G; g2++) {
        var above = ps[g2] >= pstar;
        if (above && !inRegion) {
          if (g2 === 0) start = xs[0];
          else {
            var t = (pstar - ps[g2 - 1]) / (ps[g2] - ps[g2 - 1]);
            start = xs[g2 - 1] + t * (xs[g2] - xs[g2 - 1]);
          }
          inRegion = true;
        } else if (!above && inRegion) {
          var t2 = (pstar - ps[g2 - 1]) / (ps[g2] - ps[g2 - 1]);
          intervals.push({ start: start, end: xs[g2 - 1] + t2 * (xs[g2] - xs[g2 - 1]) });
          inRegion = false;
        }
      }
      if (inRegion) intervals.push({ start: start, end: xs[G] });
      return intervals;
    }
    function massOf(intervals) {
      var m = 0;
      for (var i = 0; i < intervals.length; i++) {
        m += dist.cdf(intervals[i].end) - dist.cdf(intervals[i].start);
      }
      return m;
    }
    var loP = 0, hiP = pmax;
    for (var it = 0; it < 60; it++) {
      var mid = (loP + hiP) / 2;
      if (massOf(regionFor(mid)) > 1 - alpha) loP = mid; else hiP = mid;
    }
    var pstar = (loP + hiP) / 2;
    var intervals = regionFor(pstar);
    return { intervals: intervals, threshold: pstar, mass: massOf(intervals) };
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
    function close(x, y, tol) { return Math.abs(x - y) <= tol; }
    function simpson(f, lo, hi, n) {
      var h = (hi - lo) / n;
      var s = f(lo) + f(hi);
      for (var i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 === 1 ? 4 : 2);
      return s * h / 3;
    }
    function sortedCopy(a) { return a.slice().sort(function (x, y) { return x - y; }); }

    // ---- T1: special functions ----
    check('T1 Gamma(6) = 120', close(Math.exp(logGamma(6)), 120, 1e-10));
    check('T1 logGamma(4.7) pin', close(logGamma(4.7), 2.7364051463155669, 1e-12));
    check('T1 I_0.35(2.5,4) pin', close(incBeta(0.35, 2.5, 4), 0.45480978374959288, 1e-10));
    check('T1 I_0.98(8,8) extreme pin', close(incBeta(0.98, 8, 8), 0.99999999985469039, 1e-10));

    // ---- T2: normal ----
    var N01 = makeDist('normal', { mu: 0, sd: 1 });
    check('T2 Phi(1.96) pin', close(N01.cdf(1.96), 0.97500210485177957, 1e-13));
    check('T2 PhiInv(0.975) pin', close(N01.inv(0.975), 1.9599639845400542, 1e-10), N01.inv(0.975));
    check('T2 pdf integrates to 1', close(simpson(N01.pdf, -8, 8, 2000), 1, 1e-9));
    var N23 = makeDist('normal', { mu: 2, sd: 3 });
    check('T2 location-scale cdf', close(N23.cdf(2 + 3 * 1.96), 0.97500210485177957, 1e-13));
    check('T2 location-scale inv', close(N23.inv(0.975), 2 + 3 * 1.9599639845400542, 1e-9));

    // ---- T3: gamma / beta quantiles (mpmath pins + round trips) ----
    var G31 = makeDist('gamma', { shape: 3, rate: 1 });
    check('T3 gamma cdf exp closed form', close(makeDist('gamma', { shape: 1, rate: 2 }).cdf(0.7),
      1 - Math.exp(-1.4), 1e-12));
    check('T3 gammaInv(0.975; 3, 1) pin (mpmath)', close(G31.inv(0.975), 7.2246876677239608, 1e-8), G31.inv(0.975));
    check('T3 gammaInv rate scaling pin', close(makeDist('gamma', { shape: 3, rate: 2 }).inv(0.975),
      3.6123438338619804, 1e-8));
    var B25 = makeDist('beta', { a: 2, b: 5 });
    check('T3 betaInv(0.6; 2, 5) pin (mpmath)', close(B25.inv(0.6), 0.30944442754531440, 1e-9), B25.inv(0.6));
    var rng3 = makeRng(90001);
    for (var i3 = 0; i3 < 8; i3++) {
      var p3 = 0.02 + 0.96 * rng3();
      check('T3 gamma round-trip #' + i3, close(G31.cdf(G31.inv(p3)), p3, 1e-10));
      check('T3 beta round-trip #' + i3, close(B25.cdf(B25.inv(p3)), p3, 1e-10));
    }

    // ---- T4: bimodal mixture ----
    var BM = makeDist('bimodal', { m1: -1, m2: 2, sd: 0.8, w: 0.3 });
    check('T4 mixture cdf pin (mpmath)', close(BM.cdf(0.5), 0.31215854470610455, 1e-12), BM.cdf(0.5));
    check('T4 mixture pdf integrates to 1', close(simpson(BM.pdf, -7, 8, 3000), 1, 1e-9));
    check('T4 mixture mean', close(BM.mean, 0.3 * (-1) + 0.7 * 2, 1e-15));
    var rng4 = makeRng(90002);
    for (var i4 = 0; i4 < 6; i4++) {
      var p4 = 0.05 + 0.9 * rng4();
      check('T4 mixture inv round-trip #' + i4, close(BM.cdf(BM.inv(p4)), p4, 1e-10));
    }
    check('T4 sampler deterministic', JSON.stringify(sampleMany(BM, 10, 42)) ===
      JSON.stringify(sampleMany(BM, 10, 42)));

    // ---- T5: the page's quantile convention ----
    var seq = [];
    for (var q = 1; q <= 100; q++) seq.push(q);
    var cc = centralCredible(seq, 0.05);
    check('T5 lower index = ceil(100*0.025) = 3 (1-based)', cc.lIndex1 === 3 && cc.l === 3, cc.l);
    check('T5 upper index = ceil(100*0.975) = 98 (1-based)', cc.uIndex1 === 98 && cc.u === 98, cc.u);
    var cc9 = centralCredible([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.2);
    check('T5 S=9 alpha=0.2: indices 1 and 9', cc9.lIndex1 === 1 && cc9.uIndex1 === 9);
    // float-contaminated alpha: 1 - 95/100 = 0.0500...044 in binary; the
    // ceiling must not jump to index 26
    var ccF = centralCredible(seq.concat(seq.map(function (v) { return v + 100; }),
      seq.map(function (v) { return v + 200; }), seq.map(function (v) { return v + 300; }),
      seq.map(function (v) { return v + 400; }), seq.map(function (v) { return v + 500; }),
      seq.map(function (v) { return v + 600; }), seq.map(function (v) { return v + 700; }),
      seq.map(function (v) { return v + 800; }), seq.map(function (v) { return v + 900; })), 1 - 95 / 100);
    check('T5 float-fuzz alpha: index 25, not 26', ccF.lIndex1 === 25 && ccF.uIndex1 === 975,
      ccF.lIndex1 + ',' + ccF.uIndex1);
    // convergence to true quantiles (inverse-transform normal samples)
    var big = sortedCopy(sampleMany(N01, 4000, 90003));
    var ccBig = centralCredible(big, 0.05);
    check('T5 MC central converges to +-1.96', close(ccBig.l, -1.96, 0.12) && close(ccBig.u, 1.96, 0.12),
      ccBig.l + ',' + ccBig.u);

    // ---- T6: Glivenko-Cantelli enactment (exact KS statistic) ----
    // hand pins: F(x) = x on [0,1]
    var id = function (x) { return Math.max(0, Math.min(1, x)); };
    check('T6 KS hand pin single sample', close(ksStatistic([0.5], id), 0.5, 1e-15));
    check('T6 KS hand pin two samples', close(ksStatistic([0.25, 0.75], id), 0.25, 1e-15));
    check('T6 KS hand pin asymmetric', close(ksStatistic([0.9], id), 0.9, 1e-15));
    var kd = ksDetail([0.9], id);
    check('T6 KS detail location and side', close(kd.at, 0.9, 1e-15) && kd.side === 'pre');
    var kd2 = ksDetail([0.1], id);
    check('T6 KS detail post side', close(kd2.at, 0.1, 1e-15) && kd2.side === 'post' && close(kd2.D, 0.9, 1e-15));
    var s200 = sortedCopy(sampleMany(N01, 200, 90004));
    var s5000 = sortedCopy(sampleMany(N01, 5000, 90004));
    var d200 = ksStatistic(s200, N01.cdf);
    var d5000 = ksStatistic(s5000, N01.cdf);
    check('T6 D_5000 < D_200 (uniform convergence, seeded)', d5000 < d200, d5000 + ' vs ' + d200);
    check('T6 D_5000 small', d5000 < 0.03, d5000);

    // ---- T7: SLLN enactment ----
    check('T7 running means hand pin', JSON.stringify(runningMeans([2, 4, 6])) === '[2,3,4]');
    var rm = runningMeans(sampleMany(N23, 5000, 90005));
    check('T7 |mean_5000 - mu| < |mean_200 - mu| (seeded)',
      Math.abs(rm[4999] - 2) < Math.abs(rm[199] - 2), rm[4999] + ' vs ' + rm[199]);
    check('T7 mean_5000 close to mu', Math.abs(rm[4999] - 2) < 0.15, rm[4999]);

    // ---- T8: KDE ----
    var hand = [1, 2, 3, 4, 5];
    var h8 = silvermanBandwidth(hand);
    check('T8 Silverman bandwidth pin (mpmath)', close(h8, 0.97358462285063579, 1e-12), h8);
    check('T8 KDE value pin (mpmath)', close(kdePdf(3, hand, h8), 0.19854266571607015, 1e-12), kdePdf(3, hand, h8));
    check('T8 KDE integrates to 1', close(simpson(function (x) { return kdePdf(x, hand, h8); },
      1 - 8 * h8, 5 + 8 * h8, 2000), 1, 1e-6));

    // ---- T9: HPD from samples ----
    var sn = sortedCopy(sampleMany(N01, 3000, 90006));
    var hpdS = hpdFromSamples(sn, 0.05);
    check('T9 normal sample-HPD is one interval', hpdS.intervals.length === 1, hpdS.intervals.length);
    check('T9 normal sample-HPD ~ +-1.96', close(hpdS.intervals[0].start, -1.96, 0.25) &&
      close(hpdS.intervals[0].end, 1.96, 0.25),
      hpdS.intervals[0].start + ',' + hpdS.intervals[0].end);
    check('T9 sample-HPD mass ~ 0.95', close(hpdS.mass, 0.95, 0.03), hpdS.mass);
    var BMsep = makeDist('bimodal', { m1: -3, m2: 3, sd: 0.7, w: 0.5 });
    var sb = sortedCopy(sampleMany(BMsep, 3000, 90007));
    var hpdB = hpdFromSamples(sb, 0.05);
    check('T9 separated bimodal: two intervals', hpdB.intervals.length === 2, hpdB.intervals.length);
    if (hpdB.intervals.length === 2) {
      check('T9 first interval contains mode -3',
        hpdB.intervals[0].start < -3 && -3 < hpdB.intervals[0].end);
      check('T9 second interval contains mode +3',
        hpdB.intervals[1].start < 3 && 3 < hpdB.intervals[1].end);
    } else { count += 2; }

    // ---- T10: HPD from the true density ----
    var hpdN = hpdTrue(N01, 0.05);
    check('T10 normal true-HPD = central interval (symmetry)',
      hpdN.intervals.length === 1 &&
      close(hpdN.intervals[0].start, -1.9599639845400542, 2e-3) &&
      close(hpdN.intervals[0].end, 1.9599639845400542, 2e-3),
      JSON.stringify(hpdN.intervals));
    check('T10 normal true-HPD mass = 0.95 (via cdf)', close(hpdN.mass, 0.95, 1e-4), hpdN.mass);
    var G2 = makeDist('gamma', { shape: 2, rate: 1 });
    var hpdG = hpdTrue(G2, 0.05);
    check('T10 gamma HPD single interval', hpdG.intervals.length === 1);
    check('T10 gamma HPD threshold property pdf(l) = pdf(u) = p*',
      close(G2.pdf(hpdG.intervals[0].start), hpdG.threshold, 6e-3 * (1 + hpdG.threshold)) &&
      close(G2.pdf(hpdG.intervals[0].end), hpdG.threshold, 6e-3 * (1 + hpdG.threshold)),
      G2.pdf(hpdG.intervals[0].start) + ',' + G2.pdf(hpdG.intervals[0].end) + ',' + hpdG.threshold);
    check('T10 gamma HPD mass', close(hpdG.mass, 0.95, 1e-4));
    // THE THEOREM: for a skewed density, the HPD interval is strictly shorter
    // than the central credible interval
    var centralG = { l: G2.inv(0.025), u: G2.inv(0.975) };
    var lenHpd = hpdG.intervals[0].end - hpdG.intervals[0].start;
    var lenCentral = centralG.u - centralG.l;
    check('T10 HPD strictly shorter than central (skewed gamma)', lenHpd < lenCentral,
      lenHpd + ' vs ' + lenCentral);
    var hpdBM = hpdTrue(BMsep, 0.05);
    check('T10 separated bimodal true-HPD: two intervals', hpdBM.intervals.length === 2);
    check('T10 bimodal true-HPD mass', close(hpdBM.mass, 0.95, 1e-4));

    // ---- T11: inverse-transform sampler quality ----
    var gs = sampleMany(G31, 1500, 90008);
    var gm = 0;
    for (var ig = 0; ig < gs.length; ig++) gm += gs[ig];
    gm /= gs.length;
    // mean 3, sd sqrt(3): 4-sigma band for the sample mean
    check('T11 gamma inverse-transform sample mean', Math.abs(gm - 3) < 4 * Math.sqrt(3) / Math.sqrt(1500), gm);
    var gsort = sortedCopy(gs);
    check('T11 gamma samples GC check', ksStatistic(gsort, G31.cdf) < 0.05,
      ksStatistic(gsort, G31.cdf));
    check('T11 sampler deterministic', JSON.stringify(sampleMany(G31, 5, 7)) ===
      JSON.stringify(sampleMany(G31, 5, 7)));

    // ---- T12: RNG ----
    var ra = makeRng(42), rb = makeRng(42);
    var same = true;
    for (var i12 = 0; i12 < 10; i12++) { if (ra() !== rb()) same = false; }
    check('T12 rng deterministic', same);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  return {
    makeRng: makeRng, gauss: gauss,
    logGamma: logGamma, lowerRegGamma: lowerRegGamma, incBeta: incBeta,
    makeDist: makeDist, distRange: distRange,
    sampleMany: sampleMany,
    centralCredible: centralCredible,
    ksStatistic: ksStatistic,
    ksDetail: ksDetail,
    runningMeans: runningMeans,
    silvermanBandwidth: silvermanBandwidth,
    kdePdf: kdePdf,
    hpdFromSamples: hpdFromSamples,
    hpdTrue: hpdTrue,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = McCore; }
// ============================================================================
// UI layer — Monte Carlo credible intervals. Canvas 1: true pdf + sample
// histogram + interval shading (central per the page's order-statistic
// convention, or HPD with disjoint regions) with the TRUE interval overlaid
// for comparison. Canvas 2: the two theorems live — ECDF vs true CDF with
// the exact sup-distance D_S marked (Glivenko-Cantelli), or the running-mean
// and endpoint traces (SLLN). All numbers come from certified McCore.
// Prefix: mcv-. Dark island; seeded and reproducible; no external libraries.
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
    pdf: '#e74c3c',
    hist: 'rgba(66, 165, 245, 0.35)',
    histEdge: 'rgba(66, 165, 245, 0.7)',
    mcBand: 'rgba(46, 204, 113, 0.18)',
    mcEdge: '#2ecc71',
    trueLine: '#ffc857',
    ecdf: '#42a5f5',
    ksMark: '#ff8a65',
    meanTrace: '#42a5f5',
    endpointTrace: '#2ecc71',
    bad: '#ef5350',
    warn: '#ffc857'
  };
  var SEED_BASE = 4001;

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }
  function fmtIv(ivs, d) {
    return ivs.map(function (iv) {
      return '[' + fmt(iv.start, d) + ', ' + fmt(iv.end, d) + ']';
    }).join(' \u222A ');
  }

  function init() {
    var container = document.getElementById('monte_carlo_visualizer');
    if (!container) return;
    if (container.dataset.mcvInit) return;
    container.dataset.mcvInit = '1';

    // ---------- gate ----------
    var gate;
    try { gate = McCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown')], count: 0 }; }
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + String(shown[gi]).replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="mcv-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
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
      '<div class="mcv-root">' +
        '<div class="mcv-canvaswrap">' +
          '<canvas id="mcv-chart1"></canvas>' +
          '<div class="mcv-legend" id="mcv-legend1"></div>' +
          '<div class="mcv-charttitle" id="mcv-chart2-title" style="margin-top:14px;"></div>' +
          '<canvas id="mcv-chart2"></canvas>' +
        '</div>' +
        '<div class="mcv-controls">' +
          '<div id="mcv-readouts" class="mcv-group mcv-readouts"></div>' +
          '<div class="mcv-group">' +
            '<label for="mcv-dist">Distribution ("posterior"):</label>' +
            '<select id="mcv-dist" class="mcv-full">' +
              '<option value="normal">Normal</option>' +
              '<option value="gamma">Gamma (skewed)</option>' +
              '<option value="beta">Beta</option>' +
              '<option value="bimodal">Bimodal (normal mixture)</option>' +
            '</select>' +
            '<div id="mcv-params"></div>' +
          '</div>' +
          '<div class="mcv-group">' +
            '<div class="mcv-inline"><label for="mcv-s" style="margin:0;">Samples S:</label>' +
              '<select id="mcv-s" class="mcv-select">' +
                '<option>100</option><option>200</option><option>500</option><option selected>1000</option>' +
                '<option>2000</option><option>5000</option><option>10000</option>' +
              '</select>' +
              '<button id="mcv-resample" class="mcv-secondary" style="flex:1;">Resample</button></div>' +
            '<div class="mcv-sliderrow" style="margin-top:8px;"><label for="mcv-level">Credibility level = <span id="mcv-level-val"></span>%</label>' +
              '<input type="range" id="mcv-level" min="80" max="99" step="1" value="95"></div>' +
            '<div class="mcv-inline"><label for="mcv-type" style="margin:0;">Interval type:</label>' +
              '<select id="mcv-type" class="mcv-select">' +
                '<option value="central">Central credible interval</option>' +
                '<option value="hpd">HPD region</option>' +
              '</select></div>' +
            '<label class="mcv-toggle" style="margin-top:8px;"><input type="checkbox" id="mcv-trace"> Convergence trace (SLLN) instead of ECDF</label>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#monte_carlo_visualizer .mcv-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
      '@media (min-width: 992px){#monte_carlo_visualizer .mcv-root{flex-direction:row;align-items:flex-start;}' +
      '#monte_carlo_visualizer .mcv-canvaswrap{flex:3;}#monte_carlo_visualizer .mcv-controls{flex:2;max-width:400px;}}' +
      '#monte_carlo_visualizer .mcv-canvaswrap,#monte_carlo_visualizer .mcv-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#monte_carlo_visualizer .mcv-controls{box-shadow:0 8px 32px rgba(0,0,0,0.3);}' +
      '#monte_carlo_visualizer canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;}' +
      '#monte_carlo_visualizer .mcv-legend{margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.84rem;color:' + C.textDim + ';}' +
      '@media (max-width: 600px){#monte_carlo_visualizer .mcv-legend{grid-template-columns:1fr;}}' +
      '#monte_carlo_visualizer .mcv-li{display:flex;align-items:center;}' +
      '#monte_carlo_visualizer .mcv-sw{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:2px;flex:none;}' +
      '#monte_carlo_visualizer .mcv-charttitle{font-size:0.88rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:6px;}' +
      '#monte_carlo_visualizer .mcv-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
      '#monte_carlo_visualizer .mcv-group > label{display:block;font-weight:bold;margin-bottom:8px;color:' + C.textDim + ';font-size:0.85rem;}' +
      '#monte_carlo_visualizer .mcv-full{width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;}' +
      '#monte_carlo_visualizer select option{background-color:#141c28;color:' + C.text + ';}' +
      '#monte_carlo_visualizer .mcv-select{padding:6px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;}' +
      '#monte_carlo_visualizer .mcv-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
      '#monte_carlo_visualizer .mcv-sliderrow label{display:block;font-size:0.88rem;color:' + C.textDim + ';margin-bottom:4px;font-weight:bold;}' +
      '#monte_carlo_visualizer .mcv-sliderrow input[type=range]{width:100%;}' +
      '#monte_carlo_visualizer .mcv-sliderrow span{color:' + C.accent + ';font-family:"Courier New",monospace;}' +
      '#monte_carlo_visualizer .mcv-secondary{background:rgba(255,255,255,0.08);border:1px solid ' + C.borderStrong + ';color:' + C.text + ';border-radius:4px;cursor:pointer;font-weight:bold;padding:8px;}' +
      '#monte_carlo_visualizer .mcv-secondary:hover{background:rgba(255,255,255,0.12);}' +
      '#monte_carlo_visualizer .mcv-toggle{display:flex;align-items:center;gap:8px;font-size:0.88rem;color:' + C.textDim + ';cursor:pointer;font-weight:normal !important;}' +
      '#monte_carlo_visualizer .mcv-readouts{font-size:0.9rem;line-height:1.6;}' +
      '#monte_carlo_visualizer .mcv-val{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#monte_carlo_visualizer .mcv-mc{font-family:"Courier New",monospace;color:' + C.mcEdge + ';}' +
      '#monte_carlo_visualizer .mcv-true{font-family:"Courier New",monospace;color:' + C.trueLine + ';}' +
      '#monte_carlo_visualizer .mcv-sub{color:' + C.faint + ';font-size:0.85rem;}' +
      '#monte_carlo_visualizer .mcv-warn{color:' + C.warn + ';}';
    document.head.appendChild(style);

    var chart1 = document.getElementById('mcv-chart1');
    var chart2 = document.getElementById('mcv-chart2');
    var ctx1 = chart1.getContext('2d');
    var ctx2 = chart2.getContext('2d');
    var readoutsEl = document.getElementById('mcv-readouts');
    var legend1 = document.getElementById('mcv-legend1');
    var distSel = document.getElementById('mcv-dist');
    var paramsEl = document.getElementById('mcv-params');
    var sSel = document.getElementById('mcv-s');
    var levelSl = document.getElementById('mcv-level');
    var typeSel = document.getElementById('mcv-type');
    var traceChk = document.getElementById('mcv-trace');

    var PARAM_DEFS = {
      normal: [
        { id: 'mu', label: '\u03BC (mean)', min: -5, max: 5, step: 0.1, val: 0 },
        { id: 'sd', label: '\u03C3 (std)', min: 0.2, max: 3, step: 0.05, val: 1 }
      ],
      gamma: [
        { id: 'shape', label: '\u03B1 (shape)', min: 0.5, max: 10, step: 0.1, val: 2 },
        { id: 'rate', label: '\u03B2 (rate)', min: 0.2, max: 5, step: 0.05, val: 1 }
      ],
      beta: [
        { id: 'a', label: 'a', min: 0.3, max: 10, step: 0.1, val: 2 },
        { id: 'b', label: 'b', min: 0.3, max: 10, step: 0.1, val: 5 }
      ],
      bimodal: [
        { id: 'm1', label: '\u03BC\u2081', min: -6, max: 0, step: 0.1, val: -2 },
        { id: 'm2', label: '\u03BC\u2082', min: 0, max: 6, step: 0.1, val: 2 },
        { id: 'sd', label: '\u03C3 (both)', min: 0.3, max: 2, step: 0.05, val: 0.6 },
        { id: 'w', label: 'w (weight of \u03BC\u2081)', min: 0.1, max: 0.9, step: 0.05, val: 0.5 }
      ]
    };

    var state = {
      distKey: 'normal',
      params: { mu: 0, sd: 1 },
      S: 1000, level: 95, type: 'central',
      seedOff: 0,
      trace: false,
      dist: null, samples: null, sorted: null,
      w1: 620, h1: 340, w2: 620, h2: 260
    };

    function sizeCanvases() {
      var parentW = chart1.parentElement ? chart1.parentElement.clientWidth : 0;
      var w = parentW > 0 ? Math.max(320, Math.min(760, parentW - 30)) : 620;
      state.w1 = w; state.h1 = Math.round(w * 0.55);
      state.w2 = w; state.h2 = Math.round(w * 0.42);
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      [[chart1, ctx1, state.w1, state.h1], [chart2, ctx2, state.w2, state.h2]].forEach(function (c) {
        c[0].style.width = c[2] + 'px';
        c[0].style.height = c[3] + 'px';
        c[0].width = Math.round(c[2] * dpr);
        c[0].height = Math.round(c[3] * dpr);
        if (c[1] && c[1].setTransform) c[1].setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    }

    function buildParamSliders() {
      var defs = PARAM_DEFS[state.distKey];
      var html = '';
      state.params = {};
      for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        state.params[d.id] = d.val;
        html += '<div class="mcv-sliderrow"><label for="mcv-p-' + d.id + '">' + d.label +
          ' = <span id="mcv-p-' + d.id + '-val">' + fmt(d.val, 2) + '</span></label>' +
          '<input type="range" id="mcv-p-' + d.id + '" min="' + d.min + '" max="' + d.max +
          '" step="' + d.step + '" value="' + d.val + '"></div>';
      }
      paramsEl.innerHTML = html;
      for (var j = 0; j < defs.length; j++) {
        (function (pid) {
          document.getElementById('mcv-p-' + pid).addEventListener('input', function () {
            state.params[pid] = parseFloat(this.value);
            document.getElementById('mcv-p-' + pid + '-val').textContent = fmt(state.params[pid], 2);
            recompute();
          });
        })(defs[j].id);
      }
    }

    // ---------- plot helpers ----------
    function frame(ctx, W, H, xMin, xMax, yMin, yMax) {
      var r = { x0: 48, y0: 10, w: W - 48 - 14, h: H - 10 - 32 };
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
        ctx.fillText(fmt(xv, Math.abs(xMax - xMin) > 8 ? 0 : 1), tx - 8, r.y0 + r.h + 16);
        ctx.fillText(fmt(yv, yMax - yMin > 8 ? 0 : 2), 4, ty + 4);
      }
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(r.x0, r.y0, r.w, r.h);
      return {
        r: r,
        px: function (x) { return r.x0 + (x - xMin) / (xMax - xMin) * r.w; },
        py: function (y) { return r.y0 + (1 - (y - yMin) / (yMax - yMin)) * r.h; }
      };
    }

    // ---------- recompute ----------
    function recompute() {
      state.dist = McCore.makeDist(state.distKey, state.params);
      state.samples = McCore.sampleMany(state.dist, state.S, SEED_BASE + state.seedOff);
      state.sorted = state.samples.slice().sort(function (a, b) { return a - b; });
      render();
    }

    function render() {
      var dist = state.dist;
      var alpha = 1 - state.level / 100;
      var sorted = state.sorted;
      var range = McCore.distRange(dist);
      var ks = McCore.ksDetail(sorted, dist.cdf);
      var sMean = 0;
      for (var i = 0; i < sorted.length; i++) sMean += sorted[i];
      sMean /= sorted.length;

      var expose = {
        dist: state.distKey, S: state.S, level: state.level,
        type: state.type, seedOff: state.seedOff, D: ks.D, sampleMean: sMean
      };
      var html = '<div><strong>' + (state.type === 'central' ? 'Central credible interval' : 'HPD region') +
        '</strong> <span class="mcv-sub">level ' + state.level + '%, S = ' + state.S + ' (seeded)</span></div>';

      var mcIvs, trueIvs, thresholdNote = '';
      if (state.type === 'central') {
        var cc = McCore.centralCredible(sorted, alpha);
        mcIvs = [{ start: cc.l, end: cc.u }];
        trueIvs = [{ start: dist.inv(alpha / 2), end: dist.inv(1 - alpha / 2) }];
        html += '<div>MC estimate: <span class="mcv-mc">' + fmtIv(mcIvs, 3) + '</span> ' +
          '<span class="mcv-sub">= (\u03B8<sup>(' + cc.lIndex1 + ')</sup>, \u03B8<sup>(' + cc.uIndex1 +
          ')</sup>) \u2014 the page\u2019s ceiling convention</span></div>';
        html += '<div>True quantiles F<sup>\u22121</sup>: <span class="mcv-true">' + fmtIv(trueIvs, 3) + '</span></div>';
        var err = (Math.abs(mcIvs[0].start - trueIvs[0].start) + Math.abs(mcIvs[0].end - trueIvs[0].end)) / 2;
        html += '<div>mean endpoint error: <span class="mcv-val">' + fmt(err, 4) + '</span></div>';
        expose.mc = { l: cc.l, u: cc.u, li: cc.lIndex1, ui: cc.uIndex1 };
        expose.trueIv = { l: trueIvs[0].start, u: trueIvs[0].end };
        expose.err = err;
      } else {
        var hs = McCore.hpdFromSamples(sorted, alpha);
        var ht = McCore.hpdTrue(dist, alpha);
        mcIvs = hs.intervals;
        trueIvs = ht.intervals;
        html += '<div>MC estimate (KDE): <span class="mcv-mc">' + fmtIv(mcIvs, 3) + '</span></div>';
        html += '<div>True HPD: <span class="mcv-true">' + fmtIv(trueIvs, 3) + '</span> ' +
          '<span class="mcv-sub">p* = ' + fmt(ht.threshold, 4) + '</span></div>';
        html += '<div>MC region mass: <span class="mcv-val">' + fmt(hs.mass, 3) + '</span>' +
          (mcIvs.length !== trueIvs.length ?
            ' <span class="mcv-warn">\u2014 region structure differs from the truth; increase S</span>' : '') + '</div>';
        thresholdNote = 'HPD';
        expose.mcIntervals = mcIvs;
        expose.trueIntervals = trueIvs;
        expose.pstar = ht.threshold;
        expose.mass = hs.mass;
      }
      html += '<div style="margin-top:6px;">sample mean <span class="mcv-val">' + fmt(sMean, 3) +
        '</span> vs E[\u03B8] = <span class="mcv-val">' + fmt(dist.mean, 3) + '</span> ' +
        '<span class="mcv-sub">(SLLN)</span></div>';
      html += '<div>sup |F\u0302<sub>S</sub> \u2212 F| = <span class="mcv-val">' + fmt(ks.D, 4) +
        '</span> <span class="mcv-sub">(Glivenko-Cantelli; marked on the CDF plot)</span></div>';
      readoutsEl.innerHTML = html;
      container.dataset.mcvState = JSON.stringify(expose);

      drawChart1(dist, range, sorted, mcIvs, trueIvs, state.type);
      drawChart2(dist, range, sorted, ks);

      var leg = [
        [C.pdf, 'true density p(\u03B8 | D)'],
        [C.hist, 'sample histogram (density scale)'],
        [C.mcBand, 'MC ' + (state.type === 'central' ? 'central interval' : 'HPD region')],
        [C.trueLine, 'true ' + (state.type === 'central' ? 'quantile interval' : 'HPD boundaries') + ' (dashed)']
      ];
      var lh = '';
      for (var li = 0; li < leg.length; li++) {
        lh += '<div class="mcv-li"><span class="mcv-sw" style="background:' + leg[li][0] + ';"></span>' + leg[li][1] + '</div>';
      }
      legend1.innerHTML = lh;
    }

    function drawChart1(dist, range, sorted, mcIvs, trueIvs, type) {
      var lo = range[0], hi = range[1];
      // pdf samples + histogram
      var N = 300;
      var pdfPts = [], pMax = 0;
      for (var i = 0; i <= N; i++) {
        var x = lo + (hi - lo) * i / N;
        var v = dist.pdf(x);
        if (!isFinite(v)) v = NaN;
        pdfPts.push([x, v]);
        if (isFinite(v) && i > N * 0.02 && i < N * 0.98 && v > pMax) pMax = v;
      }
      var BINS = 40;
      var bw = (hi - lo) / BINS;
      var counts = new Array(BINS).fill(0);
      for (var s = 0; s < sorted.length; s++) {
        var b = Math.floor((sorted[s] - lo) / bw);
        if (b >= 0 && b < BINS) counts[b]++;
      }
      var hMax = 0;
      for (var b2 = 0; b2 < BINS; b2++) {
        counts[b2] = counts[b2] / (sorted.length * bw); // density scale
        if (counts[b2] > hMax) hMax = counts[b2];
      }
      var yMax = Math.max(pMax, hMax) * 1.12;
      var P = frame(ctx1, state.w1, state.h1, lo, hi, 0, yMax);
      ctx1.save();
      ctx1.beginPath();
      ctx1.rect(P.r.x0, P.r.y0, P.r.w, P.r.h);
      ctx1.clip();
      // interval shading
      for (var m = 0; m < mcIvs.length; m++) {
        ctx1.fillStyle = C.mcBand;
        ctx1.fillRect(P.px(mcIvs[m].start), P.r.y0, P.px(mcIvs[m].end) - P.px(mcIvs[m].start), P.r.h);
        ctx1.strokeStyle = C.mcEdge;
        ctx1.lineWidth = 1.5;
        ctx1.beginPath(); ctx1.moveTo(P.px(mcIvs[m].start), P.r.y0); ctx1.lineTo(P.px(mcIvs[m].start), P.r.y0 + P.r.h); ctx1.stroke();
        ctx1.beginPath(); ctx1.moveTo(P.px(mcIvs[m].end), P.r.y0); ctx1.lineTo(P.px(mcIvs[m].end), P.r.y0 + P.r.h); ctx1.stroke();
      }
      // true interval boundaries (dashed)
      ctx1.strokeStyle = C.trueLine;
      ctx1.lineWidth = 1.5;
      ctx1.setLineDash([6, 4]);
      for (var t = 0; t < trueIvs.length; t++) {
        ctx1.beginPath(); ctx1.moveTo(P.px(trueIvs[t].start), P.r.y0); ctx1.lineTo(P.px(trueIvs[t].start), P.r.y0 + P.r.h); ctx1.stroke();
        ctx1.beginPath(); ctx1.moveTo(P.px(trueIvs[t].end), P.r.y0); ctx1.lineTo(P.px(trueIvs[t].end), P.r.y0 + P.r.h); ctx1.stroke();
      }
      ctx1.setLineDash([]);
      // histogram
      for (var hb = 0; hb < BINS; hb++) {
        if (counts[hb] <= 0) continue;
        var x0 = P.px(lo + hb * bw), x1 = P.px(lo + (hb + 1) * bw);
        var y0 = P.py(counts[hb]);
        ctx1.fillStyle = C.hist;
        ctx1.fillRect(x0, y0, x1 - x0, P.r.y0 + P.r.h - y0);
        ctx1.strokeStyle = C.histEdge;
        ctx1.lineWidth = 0.5;
        ctx1.strokeRect(x0, y0, x1 - x0, P.r.y0 + P.r.h - y0);
      }
      // pdf curve
      ctx1.strokeStyle = C.pdf;
      ctx1.lineWidth = 2.5;
      ctx1.beginPath();
      var started = false;
      for (var pp = 0; pp < pdfPts.length; pp++) {
        if (!isFinite(pdfPts[pp][1])) { started = false; continue; }
        var qx = P.px(pdfPts[pp][0]), qy = P.py(Math.min(pdfPts[pp][1], yMax));
        if (!started) { ctx1.moveTo(qx, qy); started = true; }
        else ctx1.lineTo(qx, qy);
      }
      ctx1.stroke();
      ctx1.restore();
    }

    function drawChart2(dist, range, sorted, ks) {
      var title = document.getElementById('mcv-chart2-title');
      if (!state.trace) {
        title.textContent = 'Empirical CDF vs true CDF \u2014 sup distance D_S = ' + fmt(ks.D, 4) +
          ' (Glivenko-Cantelli)';
        var lo = range[0], hi = range[1];
        var P = frame(ctx2, state.w2, state.h2, lo, hi, 0, 1);
        ctx2.save();
        ctx2.beginPath();
        ctx2.rect(P.r.x0, P.r.y0, P.r.w, P.r.h);
        ctx2.clip();
        // true cdf
        ctx2.strokeStyle = C.pdf;
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        for (var i = 0; i <= 200; i++) {
          var x = lo + (hi - lo) * i / 200;
          var q = [P.px(x), P.py(dist.cdf(x))];
          if (i === 0) ctx2.moveTo(q[0], q[1]); else ctx2.lineTo(q[0], q[1]);
        }
        ctx2.stroke();
        // ECDF steps (thinned for large S)
        ctx2.strokeStyle = C.ecdf;
        ctx2.lineWidth = 1.5;
        ctx2.beginPath();
        var n = sorted.length;
        var step = Math.max(1, Math.floor(n / 600));
        ctx2.moveTo(P.px(lo), P.py(0));
        var prevY = 0;
        for (var j = 0; j < n; j += step) {
          var px = P.px(sorted[j]);
          ctx2.lineTo(px, P.py(prevY));
          prevY = (j + 1) / n;
          ctx2.lineTo(px, P.py(prevY));
        }
        ctx2.lineTo(P.px(hi), P.py(1));
        ctx2.stroke();
        // D_S marker at the sup location
        var Fat = dist.cdf(ks.at);
        var eAt = ks.side === 'post' ? Fat + ks.D : Fat - ks.D;
        ctx2.strokeStyle = C.ksMark;
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.moveTo(P.px(ks.at), P.py(Fat));
        ctx2.lineTo(P.px(ks.at), P.py(eAt));
        ctx2.stroke();
        ctx2.restore();
      } else {
        title.textContent = 'Running mean and interval endpoints vs S (SLLN / consistency)';
        var alpha = 1 - state.level / 100;
        var rm = McCore.runningMeans(state.samples);
        var n2 = state.samples.length;
        // checkpoints for the endpoint traces
        var cps = [];
        for (var k = 20; k <= n2; k = Math.ceil(k * 1.35)) cps.push(Math.min(k, n2));
        if (cps[cps.length - 1] !== n2) cps.push(n2);
        var ls = [], us = [];
        for (var c = 0; c < cps.length; c++) {
          var pref = state.samples.slice(0, cps[c]).sort(function (a, b) { return a - b; });
          var cc = McCore.centralCredible(pref, alpha);
          ls.push(cc.l); us.push(cc.u);
        }
        var trueL = dist.inv(alpha / 2), trueU = dist.inv(1 - alpha / 2);
        var allY = ls.concat(us, [dist.mean, trueL, trueU]);
        for (var r = 19; r < rm.length; r += 7) allY.push(rm[r]);
        var mn = Math.min.apply(null, allY), mx = Math.max.apply(null, allY);
        var pad = (mx - mn) * 0.1 + 1e-9;
        var lx0 = Math.log(20), lx1 = Math.log(n2);
        var P2 = frame(ctx2, state.w2, state.h2, 0, 1, mn - pad, mx + pad);
        function lpx(k) { return P2.r.x0 + (Math.log(k) - lx0) / (lx1 - lx0) * P2.r.w; }
        // true reference lines
        ctx2.setLineDash([6, 4]);
        [[dist.mean, C.pdf], [trueL, C.trueLine], [trueU, C.trueLine]].forEach(function (ref) {
          ctx2.strokeStyle = ref[1];
          ctx2.lineWidth = 1.2;
          ctx2.beginPath();
          ctx2.moveTo(P2.r.x0, P2.py(ref[0]));
          ctx2.lineTo(P2.r.x0 + P2.r.w, P2.py(ref[0]));
          ctx2.stroke();
        });
        ctx2.setLineDash([]);
        // running mean trace
        ctx2.strokeStyle = C.meanTrace;
        ctx2.lineWidth = 1.8;
        ctx2.beginPath();
        var st2 = false;
        for (var k2 = 20; k2 <= n2; k2++) {
          var qx2 = lpx(k2), qy2 = P2.py(rm[k2 - 1]);
          if (!st2) { ctx2.moveTo(qx2, qy2); st2 = true; }
          else ctx2.lineTo(qx2, qy2);
        }
        ctx2.stroke();
        // endpoint traces
        ctx2.strokeStyle = C.endpointTrace;
        ctx2.lineWidth = 1.8;
        [ls, us].forEach(function (arr) {
          ctx2.beginPath();
          for (var c2 = 0; c2 < cps.length; c2++) {
            var qx3 = lpx(cps[c2]), qy3 = P2.py(arr[c2]);
            if (c2 === 0) ctx2.moveTo(qx3, qy3); else ctx2.lineTo(qx3, qy3);
          }
          ctx2.stroke();
        });
        ctx2.fillStyle = C.faint;
        ctx2.font = '11px system-ui, sans-serif';
        ctx2.fillText('S = 20', P2.r.x0 + 2, P2.r.y0 + P2.r.h + 16);
        ctx2.fillText('S = ' + n2, P2.r.x0 + P2.r.w - 46, P2.r.y0 + P2.r.h + 16);
      }
    }

    // ---------- events ----------
    distSel.addEventListener('change', function () {
      state.distKey = distSel.value;
      buildParamSliders();
      recompute();
    });
    sSel.addEventListener('change', function () {
      state.S = parseInt(sSel.value, 10);
      recompute();
    });
    levelSl.addEventListener('input', function () {
      state.level = parseInt(levelSl.value, 10);
      document.getElementById('mcv-level-val').textContent = String(state.level);
      render();
    });
    typeSel.addEventListener('change', function () {
      state.type = typeSel.value;
      render();
    });
    traceChk.addEventListener('change', function () {
      state.trace = traceChk.checked;
      render();
    });
    document.getElementById('mcv-resample').addEventListener('click', function () {
      state.seedOff += 1;
      recompute();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvases(); if (state.dist) render(); });
    }

    // ---------- boot ----------
    sizeCanvases();
    document.getElementById('mcv-level-val').textContent = '95';
    buildParamSliders();
    recompute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();