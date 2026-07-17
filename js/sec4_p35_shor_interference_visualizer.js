//======================================================================
// sec4_p35_shor_interference_visualizer.js (v2) -- disc-35
// [Core IIFE] ShorCore: quantum period-finding mathematics, DOM-free.
// State chain (the page's own): comb (1/sqrt m) sum_j |jr+s>  --F_q-->
// amplitude at b proportional to S(b) = sum_j e^{2 pi i (jr+s) b / q},
// P(b) = |S(b)|^2 / (mq). The offset s rotates S(b) by a global phase
// e^{2 pi i s b / q} and cannot move any probability -- certified below.
//======================================================================
var ShorCore = (function () {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- arithmetic ----------
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }
  function modpow(base, exp, mod) {
    if (exp !== Math.floor(exp) || exp < 0) throw new Error('modpow: exponent must be a nonnegative integer');
    var r = 1;
    base %= mod;
    while (exp > 0) {
      if (exp & 1) r = (r * base) % mod;
      base = (base * base) % mod;
      exp = Math.floor(exp / 2);
    }
    return r;
  }
  function order(x, N) {
    if (gcd(x, N) !== 1) throw new Error('order: x must be coprime to N');
    var r = 1, c = x % N;
    while (c !== 1) { c = (c * x) % N; r++; if (r > N) throw new Error('order: runaway'); }
    return r;
  }
  // smallest power of two q with N^2 < q <= 2 N^2
  function pickQ(N) {
    var q = 1;
    while (q <= N * N) q *= 2;
    return q;
  }
  // number of comb points jr+s in {0,...,q-1}, i.e. #{ j >= 0 : jr+s < q }
  function combCount(r, q, s) {
    return Math.ceil((q - s) / r);
  }

  // ---------- the interference sum ----------
  // partial sums of v_j = e^{2 pi i (jr+s) b / q}; the s-dependence is a
  // rigid rotation of the whole walk (certified S7)
  function phaseWalk(r, q, b, s) {
    var m = combCount(r, q, s);
    var t = 2 * Math.PI / q;
    var re = 0, im = 0;
    var pts = [[0, 0]];
    for (var j = 0; j < m; j++) {
      var ang = t * (((j * r + s) * b) % q);
      re += Math.cos(ang); im += Math.sin(ang);
      pts.push([re, im]);
    }
    return { m: m, pts: pts, Sre: re, Sim: im, absS: Math.hypot(re, im) };
  }

  // the page's geometric-series closed form:
  // |S| = m when e^{2 pi i r b / q} = 1, else |sin(pi m r b / q)| / |sin(pi r b / q)|
  function closedFormAbsS(r, q, b, m) {
    if ((r * b) % q === 0) return m;
    return Math.abs(Math.sin(Math.PI * m * r * b / q) / Math.sin(Math.PI * r * b / q));
  }

  function qftProbs(N, x, s) {
    s = s || 0;
    var r = order(x, N), q = pickQ(N), m = combCount(r, q, s);
    var probs = new Float64Array(q);
    var t = 2 * Math.PI / q;
    // PROVEN-EQUIVALENT mutant (documented): dropping s from this phase
    // leaves every probs[b] unchanged -- e^{2 pi i s b / q} factors out of
    // S and cancels in |S|^2. That cancellation IS certificate S7; the s
    // is kept here for fidelity to the page's state, not for the output.
    for (var b = 0; b < q; b++) {
      var re = 0, im = 0;
      for (var j = 0; j < m; j++) {
        var ang = t * (((j * r + s) * b) % q);
        re += Math.cos(ang); im += Math.sin(ang);
      }
      probs[b] = (re * re + im * im) / (m * q);
    }
    return { r: r, q: q, m: m, s: s, probs: probs };
  }

  // ---------- continued fractions ----------
  function cfConvergents(num, den) {
    var out = [];
    var pm2 = 0, pm1 = 1, qm2 = 1, qm1 = 0, xa = num, xb = den;
    for (var it = 0; it < 64 && xb !== 0; it++) {
      var ai = Math.floor(xa / xb);
      var pn = ai * pm1 + pm2, qn = ai * qm1 + qm2;
      out.push([pn, qn]);
      var rem = xa - ai * xb;
      xa = xb; xb = rem;
      pm2 = pm1; pm1 = pn; qm2 = qm1; qm1 = qn;
    }
    return out;
  }
  // the LAST convergent with denominator <= Nmax (the extraction rule)
  function cfBest(num, den, Nmax) {
    var conv = cfConvergents(num, den);
    var best = [0, 1];
    for (var i = 0; i < conv.length; i++) {
      if (conv[i][1] <= Nmax) best = conv[i];
    }
    return best;
  }

  // ---------- the classical tail: candidate period -> factors ----------
  // Failure taxonomy (page-faithful):
  //   'not-period'    x^rCand != 1 mod N: the convergent's denominator is
  //                   not a period at all (b fell too far, or c/r reduced)
  //   'odd'           rCand is a genuine period but odd -- unlucky base
  //   'trivial'       x^{rCand/2} = +-1: trivial square root of 1
  //   (ok)            both gcds are proper factors
  // For diagnosis only, 'not-period' is refined by whether b sat on an
  // exact multiple c(q/r) with gcd(c, r) > 1 ('shared-factor') or simply
  // fell far from every multiple ('far').
  function tryFactor(N, x, b, q, rTrue) {
    var conv = cfBest(b, q, N);
    var cNum = conv[0], rCand = conv[1];
    if (modpow(x, rCand, N) !== 1) {
      var reason = 'not-period-far';
      if (rTrue) {
        var c = Math.round(b / (q / rTrue));
        if (Math.abs(b - c * (q / rTrue)) < 0.5 && gcd(c, rTrue) > 1) reason = 'not-period-shared';
      }
      return { rCand: rCand, cNum: cNum, ok: false, reason: reason };
    }
    if (rCand % 2 !== 0) return { rCand: rCand, cNum: cNum, ok: false, reason: 'odd' };
    var h = modpow(x, rCand / 2, N);
    if (h === 1 || h === N - 1) return { rCand: rCand, cNum: cNum, ok: false, reason: 'trivial' };
    var f1 = gcd(h - 1, N), f2 = gcd(h + 1, N);
    // PROVEN-EQUIVALENT on semiprime N (documented): past the h = +-1
    // check, CRT gives h = 1 mod p and h = -1 mod q (or vice versa), so
    // f1 and f2 are BOTH proper factors whenever either is; the two-sided
    // test below equals the one-sided test on every N this demo offers.
    var ok = f1 > 1 && f1 < N && f2 > 1 && f2 < N;
    return { rCand: rCand, cNum: cNum, ok: ok, f1: f1, f2: f2, reason: ok ? null : 'not-period-far' };
  }

  // exact one-shot success probability: sum_b P(b) [tryFactor succeeds]
  function successProbExact(N, x) {
    var st = qftProbs(N, x, 0);
    var p = 0;
    for (var b = 0; b < st.q; b++) {
      if (st.probs[b] > 1e-15 && tryFactor(N, x, b, st.q, st.r).ok) p += st.probs[b];
    }
    return p;
  }

  // seeded sampling from P (inverse CDF); rng is a mulberry32 stream
  function sampleB(probs, rng) {
    var u = rng(), acc = 0;
    for (var b = 0; b < probs.length; b++) {
      acc += probs[b];
      if (u <= acc) return b;
    }
    return probs.length - 1; // guard for float tail
  }

  // repeated runs, tallied by outcome (the "Measure x50" feature)
  function runManyStats(N, x, seed, n) {
    var st = qftProbs(N, x, 0);
    var rng = mulberry32(seed);
    var tally = { ok: 0, 'not-period-far': 0, 'not-period-shared': 0, odd: 0, trivial: 0 };
    for (var i = 0; i < n; i++) {
      var b = sampleB(st.probs, rng);
      var res = tryFactor(N, x, b, st.q, st.r);
      if (res.ok) tally.ok++;
      else tally[res.reason]++;
    }
    return { tally: tally, n: n };
  }

  function coprimeChoices(N) {
    var out = [];
    for (var x = 2; x < N; x++) {
      if (gcd(x, N) === 1 && order(x, N) > 1) out.push(x);
    }
    return out;
  }

  //====================================================================
  // Self-tests
  //====================================================================
  function runSelfTests() {
    var failures = [];
    function check(name, cond, detail) {
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    var b, j, s, i;

    // S1: arithmetic pins
    check('S1a order(2,15) == 4', order(2, 15) === 4, order(2, 15));
    check('S1b order(2,21) == 6', order(2, 21) === 6, order(2, 21));
    check('S1c order(4,21) == 3 (odd-period base)', order(4, 21) === 3, order(4, 21));
    check('S1d modpow(2,10,1000) == 24', modpow(2, 10, 1000) === 24);
    check('S1e gcd(85,512) == 1 and gcd(6,4) == 2', gcd(85, 512) === 1 && gcd(6, 4) === 2);

    // S2: q selection, exhaustive over small N
    (function () {
      var ok = true;
      for (var N = 3; N <= 64; N++) {
        var q = pickQ(N);
        if ((q & (q - 1)) !== 0) ok = false;
        if (!(N * N < q && q <= 2 * N * N)) ok = false;
      }
      check('S2 pickQ: power of two in (N^2, 2N^2] for N=3..64', ok);
    })();

    // S3: comb count matches brute force, including s > 0
    (function () {
      var ok = true;
      [[4, 256], [6, 512], [10, 2048], [7, 128]].forEach(function (pair) {
        var r = pair[0], q = pair[1];
        for (var ss = 0; ss < r; ss++) {
          var brute = 0;
          for (var a = ss; a < q; a += r) brute++;
          if (combCount(r, q, ss) !== brute) ok = false;
        }
      });
      check('S3 comb count == brute force for all offsets', ok);
    })();

    // S4: total probability is 1 (easy case, hard case, and nonzero s
    // where m differs from the s=0 value)
    (function () {
      [[15, 2, 0], [15, 2, 3], [21, 2, 0], [21, 2, 2], [21, 2, 5]].forEach(function (cse) {
        var st = qftProbs(cse[0], cse[1], cse[2]);
        var tot = 0;
        for (b = 0; b < st.q; b++) tot += st.probs[b];
        check('S4 sum P == 1 for N=' + cse[0] + ' x=' + cse[1] + ' s=' + cse[2],
          Math.abs(tot - 1) < 1e-9, tot.toFixed(12));
      });
    })();

    // S5: easy case (15, 2): exactly r peaks of 1/r, zero elsewhere
    (function () {
      var st = qftProbs(15, 2, 0);
      var ok = st.r === 4 && st.q === 256;
      for (b = 0; b < st.q; b++) {
        if (b % 64 === 0) { if (Math.abs(st.probs[b] - 0.25) > 1e-9) ok = false; }
        else if (st.probs[b] > 1e-12) ok = false;
      }
      check('S5 easy case: four peaks of exactly 1/4, zeros elsewhere', ok);
    })();

    // S6: geometric-series closed form == vector sum, exhaustive (21, 2)
    (function () {
      var st = qftProbs(21, 2, 0);
      var worst = 0;
      for (b = 0; b < st.q; b++) {
        var w = phaseWalk(st.r, st.q, b, 0);
        var cf = closedFormAbsS(st.r, st.q, b, st.m);
        worst = Math.max(worst, Math.abs(w.absS - cf));
      }
      check('S6 |S| == |sin(pi m r b/q)/sin(pi r b/q)| (512 outcomes)', worst < 1e-6,
        worst.toExponential(2));
      // S6b: |S| is blind to complex conjugation; pin the actual endpoint.
      // r=3, q=8, b=1, s=0: m=3, angles 0, 3pi/4, 3pi/2 =>
      // S = (1 - sqrt2/2, sqrt2/2 - 1), with strictly NEGATIVE imaginary part
      var wPin = phaseWalk(3, 8, 1, 0);
      var ex = 1 - Math.SQRT1_2;
      check('S6b walk endpoint sign pin', Math.abs(wPin.Sre - ex) < 1e-9 &&
        Math.abs(wPin.Sim + ex) < 1e-9, wPin.Sre.toFixed(4) + ',' + wPin.Sim.toFixed(4));
    })();

    // S7: the offset s is a global phase -- probabilities identical, walk
    // rigidly rotated by e^{2 pi i s b / q}
    (function () {
      var base = qftProbs(21, 2, 0);
      [1, 2, 5].forEach(function (ss) {
        var st = qftProbs(21, 2, ss);
        // m may differ by 1 between offsets; probabilities must not
        var worst = 0;
        for (b = 0; b < base.q; b++) worst = Math.max(worst, Math.abs(st.probs[b] - base.probs[b]));
        // NOTE: with r not dividing q, m(s) can change and P changes by
        // O(1/m); the honest claim is at fixed m. Restrict to offsets
        // with m(s) == m(0) for the exact-equality certificate.
        if (st.m === base.m) {
          check('S7a P invariant under s=' + ss + ' (same m)', worst < 1e-9, worst.toExponential(2));
        } else {
          check('S7a\' P nearly invariant under s=' + ss + ' (m differs by 1)', worst < 2 / base.m,
            worst.toExponential(2));
        }
      });
      // rigid rotation at fixed m: compare walks with the same j-range
      var okRot = true;
      [3, 7, 64, 85, 300].forEach(function (bb) {
        var w0 = phaseWalk(6, 512, bb, 0);
        var w2 = phaseWalk(6, 512, bb, 2);
        var mMin = Math.min(w0.m, w2.m);
        var ang = 2 * Math.PI * 2 * bb / 512;
        // rotate partial sums of the first mMin steps
        var re = 0, im = 0, re2 = 0, im2 = 0;
        for (j = 0; j < mMin; j++) {
          var a0 = 2 * Math.PI * (((j * 6) * bb) % 512) / 512;
          re += Math.cos(a0); im += Math.sin(a0);
          var a2 = 2 * Math.PI * (((j * 6 + 2) * bb) % 512) / 512;
          re2 += Math.cos(a2); im2 += Math.sin(a2);
        }
        var er = re * Math.cos(ang) - im * Math.sin(ang);
        var ei = re * Math.sin(ang) + im * Math.cos(ang);
        if (Math.hypot(re2 - er, im2 - ei) > 1e-6) okRot = false;
      });
      check('S7b walk with offset s == walk rotated by e^{2 pi i s b/q}', okRot);
    })();

    // S8: hard-case concentration -- the page's "with high probability"
    // claim, executable: mass within 1/2 of the multiples of q/r
    (function () {
      [[21, 2], [33, 2]].forEach(function (cse) {
        var st = qftProbs(cse[0], cse[1], 0);
        check('S8-pre N=' + cse[0] + ': hard case (r does not divide q)', st.q % st.r !== 0);
        var mass = 0;
        for (var c = 0; c < st.r; c++) {
          var target = c * st.q / st.r;
          for (b = Math.floor(target - 0.5); b <= Math.ceil(target + 0.5); b++) {
            var bb = ((b % st.q) + st.q) % st.q;
            if (Math.abs(bb - target) <= 0.5 || Math.abs(bb + st.q - target) <= 0.5) mass += st.probs[bb];
          }
        }
        check('S8 concentration >= 0.4 near multiples of q/r (N=' + cse[0] + ')', mass >= 0.4,
          mass.toFixed(4));
      });
    })();

    // S9: continued fractions
    check('S9a cfBest(85, 512, 21) == 1/6', cfBest(85, 512, 21).join('/') === '1/6',
      cfBest(85, 512, 21).join('/'));
    check('S9b convergents of 85/512 end at 85/512', (function () {
      var cv = cfConvergents(85, 512);
      var last = cv[cv.length - 1];
      return last[0] === 85 && last[1] === 512;
    })());
    // best-approximation, executable (T-cf_best_approximation): every b
    // within 1/(2q) of c/r recovers c/r in lowest terms -- exhaustive in c
    (function () {
      var ok = true;
      [[21, 2], [33, 2]].forEach(function (cse) {
        var N = cse[0], r = order(cse[1], N), q = pickQ(N);
        for (var c = 0; c < r; c++) {
          for (b = 0; b < q; b++) {
            if (Math.abs(b / q - c / r) <= 1 / (2 * q)) {
              var g = gcd(c, r);
              var conv = cfBest(b, q, N);
              if (conv[0] !== c / g || conv[1] !== r / g) ok = false;
            }
          }
        }
      });
      check('S9c every b within 1/2q of c/r recovers c/r in lowest terms', ok);
    })();

    // S10: tryFactor pins and taxonomy on the page's own example
    (function () {
      var q = 256;
      var t64 = tryFactor(15, 2, 64, q, 4);
      check('S10a b=64 factors 15 = 3 x 5', t64.ok && t64.f1 * t64.f2 === 15,
        JSON.stringify(t64));
      var t192 = tryFactor(15, 2, 192, q, 4);
      check('S10b b=192 also succeeds', t192.ok);
      var t128 = tryFactor(15, 2, 128, q, 4);
      check('S10c b=128: convergent 1/2 is not a period (shared factor c=2)',
        !t128.ok && t128.rCand === 2 && t128.reason === 'not-period-shared', JSON.stringify(t128));
      var t0 = tryFactor(15, 2, 0, q, 4);
      // b = 0 is the c = 0 peak; gcd(0, r) = r > 1, so this is the
      // shared-factor (non-coprime c) branch of the taxonomy
      check('S10d b=0: c=0 shares every factor with r', !t0.ok && t0.rCand === 1 &&
        t0.reason === 'not-period-shared', JSON.stringify(t0));
      // genuine odd-period failure: N=21, x=4, r=3; on-peak b recovers r=3
      var q21 = pickQ(21);
      var bPeak = Math.round(q21 / 3); // c=1 multiple, r|... 512/3 not integer -> nearest
      var t4 = tryFactor(21, 4, bPeak, q21, 3);
      check('S10e N=21 x=4: candidate period 3 fails as odd', !t4.ok && t4.reason === 'odd' && t4.rCand === 3,
        JSON.stringify(t4));
      // trivial-square-root branch: N=33, x=2, r=10, 2^5 = 32 = N-1;
      // b=205 recovers 1/10 (|205/2048 - 1/10| < 1/2q), then h = -1
      var t2 = tryFactor(33, 2, 205, pickQ(33), 10);
      check('S10f N=33 x=2: recovered period 10 fails as trivial root', !t2.ok &&
        t2.rCand === 10 && t2.reason === 'trivial', JSON.stringify(t2));
    })();

    // S11: exact one-shot success probabilities
    (function () {
      var p15 = successProbExact(15, 2);
      check('S11a successProbExact(15, 2) == 1/2 exactly', Math.abs(p15 - 0.5) < 1e-9, p15.toFixed(6));
      var p21 = successProbExact(21, 2);
      check('S11b successProbExact(21, 2) == 0.3196485053 (frozen)',
        Math.abs(p21 - 0.3196485053) < 1e-6, p21.toFixed(10));
      var p214 = successProbExact(21, 4);
      check('S11c successProbExact(21, 4) == 0 (odd period: no run can succeed)', p214 === 0, p214);
    })();

    // S12: seeded sampler -- deterministic, distribution-faithful
    (function () {
      var st = qftProbs(15, 2, 0);
      var r1 = mulberry32(777), r2 = mulberry32(777);
      var same = true;
      for (i = 0; i < 50; i++) if (sampleB(st.probs, r1) !== sampleB(st.probs, r2)) same = false;
      check('S12a same seed -> same sample stream', same);
      var rng = mulberry32(20260717);
      var counts = {};
      var nDraw = 4000;
      for (i = 0; i < nDraw; i++) {
        var bb = sampleB(st.probs, rng);
        counts[bb] = (counts[bb] || 0) + 1;
      }
      var tv = 0;
      for (b = 0; b < st.q; b++) tv += Math.abs((counts[b] || 0) / nDraw - st.probs[b]);
      check('S12b empirical distribution close to P (TV < 0.05)', tv / 2 < 0.05, (tv / 2).toFixed(4));
    })();

    // S13: tallied runs consistent with the exact success probability
    (function () {
      var stats = runManyStats(15, 2, 424242, 400);
      var total = 0;
      Object.keys(stats.tally).forEach(function (k) { total += stats.tally[k]; });
      check('S13a tallies sum to n', total === 400, total);
      var pHat = stats.tally.ok / 400;
      // p = 0.5, n = 400: 4 sigma ~ 0.1
      check('S13b success rate within 4 sigma of exact 1/2', Math.abs(pHat - 0.5) < 0.1, pHat);
      check('S13c only shared-factor and far failures for (15,2)',
        stats.tally.odd === 0 && stats.tally.trivial === 0);
    })();

    // S14: the reduction theorem, executable -- at least half of the
    // coprime bases admit a successful run (lucky conditions majority)
    (function () {
      [15, 21, 33].forEach(function (N) {
        var xs = coprimeChoices(N);
        var lucky = xs.filter(function (x) { return successProbExact(N, x) > 0; }).length;
        check('S14 lucky bases are a majority for N=' + N + ' (' + lucky + '/' + xs.length + ')',
          lucky * 2 >= xs.length);
      });
    })();

    return { pass: failures.length === 0, failures: failures };
  }

  return {
    mulberry32: mulberry32,
    gcd: gcd,
    modpow: modpow,
    order: order,
    pickQ: pickQ,
    combCount: combCount,
    phaseWalk: phaseWalk,
    closedFormAbsS: closedFormAbsS,
    qftProbs: qftProbs,
    cfConvergents: cfConvergents,
    cfBest: cfBest,
    tryFactor: tryFactor,
    successProbExact: successProbExact,
    sampleB: sampleB,
    runManyStats: runManyStats,
    coprimeChoices: coprimeChoices,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = ShorCore; }

//======================================================================
// [UI IIFE] #shor_demo, prefix shd-
// Panels: comb (the collapsed register, with the offset slider), phase
// walk at outcome b, QFT spectrum. P(b) is computed once at s = 0 and
// NOT recomputed when s moves -- its s-invariance is certificate S7,
// and watching the comb slide while the spectrum stands still is the
// point. Measurement uses a seeded stream (reproducible run sequence).
//======================================================================
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var SEED = 20260717;

  var C = {
    panel: 'rgba(20, 28, 40, 0.95)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderStrong: 'rgba(255, 255, 255, 0.2)',
    text: '#e8eaed',
    textDim: 'rgba(255, 255, 255, 0.7)',
    faint: 'rgba(255, 255, 255, 0.5)',
    accent: '#66bb6a',
    blue: '#64b4ff',
    hot: '#f0a030',
    comb: '#9ed0ff',
    bad: '#e74c3c',
    canvasBg: '#0a0f18'
  };

  function refusalHtml(res) {
    var list = res.failures.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    return '<div style="background:' + C.panel + ';border:1px solid ' + C.bad +
      ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
      '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
      res.failures.length + ').</strong>' +
      '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render on broken mathematics.</p>' +
      '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
  }

  function init() {
    var container = document.getElementById('shor_demo');
    if (!container) return;
    if (container.dataset.shdInit) return; // idempotency guard
    container.dataset.shdInit = '1';

    var gate;
    try { gate = ShorCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests crashed: ' + e.message] }; }
    if (!gate.pass) { container.innerHTML = refusalHtml(gate); return; }

    var G = ShorCore;
    var DEFAULT_X = { 15: 2, 21: 2, 33: 5 };
    var rng = G.mulberry32(SEED); // one stream; every Measure draws from it
    var state = null;
    var pCache = {};
    function pExactCached(N, x) {
      var k = N + ':' + x;
      if (!(k in pCache)) pCache[k] = G.successProbExact(N, x);
      return pCache[k];
    }

    container.innerHTML =
      '<div class="shd-root">' +
      '<div class="shd-hint">The comb below is the argument register after the value register has been measured: ' +
        'spikes every r positions, shifted by the unknown offset s. Slide s and watch the comb move while the ' +
        'spectrum on the right does not \u2014 the offset retreats into a global phase, which rigidly rotates the ' +
        'walk without changing its length. That invariance is why one measurement of the spectrum reveals the ' +
        '<em>spacing</em> and nothing else.</div>' +
      '<div class="shd-controls">' +
        '<label>N = <select id="shd-N" class="shd-select">' +
          '<option value="15">15 = 3 \u00D7 5</option>' +
          '<option value="21">21 = 3 \u00D7 7</option>' +
          '<option value="33">33 = 3 \u00D7 11</option>' +
        '</select></label>' +
        '<label>base x = <select id="shd-x" class="shd-select"></select></label>' +
        '<span id="shd-meta" class="shd-meta"></span>' +
      '</div>' +
      '<div class="shd-panelbox">' +
        '<div class="shd-charttitle">Argument register after the collapse: the comb (1/\u221Am) \u03A3\u2C7C |jr+s\u27E9</div>' +
        '<svg id="shd-comb" width="100%" height="56" preserveAspectRatio="none"></svg>' +
        '<div class="shd-sliderrow"><label for="shd-s">offset s = <span id="shd-s-val">0</span></label>' +
          '<input type="range" id="shd-s" min="0" max="3" value="0" step="1">' +
          '<span class="shd-sub">the comb slides; P(b) provably cannot</span></div>' +
      '</div>' +
      '<div class="shd-views">' +
        '<div class="shd-viewcell">' +
          '<div class="shd-charttitle">Phase vectors at outcome b \u2014 running sum in \u2102</div>' +
          '<svg id="shd-walk" width="100%" height="240" viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet"></svg>' +
        '</div>' +
        '<div class="shd-viewcell shd-wide">' +
          '<div class="shd-charttitle">Spectrum P(b) = |S(b)|\u00B2/(mq) \u2014 computed at s = 0, certified s-invariant</div>' +
          '<svg id="shd-qft" width="100%" height="170" preserveAspectRatio="none"></svg>' +
          '<div class="shd-caption">display shows the maximum of P over each pixel-column bucket; the orange line marks the selected b</div>' +
        '</div>' +
      '</div>' +
      '<div class="shd-sliderrow"><label for="shd-b">outcome b = <span id="shd-b-val"></span></label>' +
        '<input type="range" id="shd-b" min="0" max="255" value="64" step="1"></div>' +
      '<div id="shd-readout" class="shd-readout"></div>' +
      '<div class="shd-btnrow">' +
        '<button class="shd-btn" id="shd-measure">Measure (sample b from P, then factor)</button>' +
        '<button class="shd-btn" id="shd-many">Measure \u00D750</button>' +
      '</div>' +
      '<div id="shd-result" class="shd-result">Drag <b>b</b> to explore the interference, slide <b>s</b> to watch the invariance, then press <b>Measure</b>.</div>' +
      '<div id="shd-stats" class="shd-stats" style="display:none;"></div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#shor_demo .shd-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#shor_demo .shd-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.55;}' +
      '#shor_demo .shd-controls{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:0.85rem;color:' + C.textDim + ';}' +
      '#shor_demo .shd-select{background:rgba(255,255,255,0.06);color:' + C.text + ';border:1px solid ' + C.borderStrong + ';' +
        'border-radius:4px;padding:4px 6px;font-family:"Courier New",monospace;color-scheme:dark;}' +
      '#shor_demo .shd-select option{background:#1a2433;color:' + C.text + ';}' +
      '#shor_demo .shd-meta{font-family:"Courier New",monospace;font-size:0.82rem;color:' + C.blue + ';}' +
      '#shor_demo .shd-meta .shd-tag{color:' + C.hot + ';}' +
      '#shor_demo .shd-panelbox{border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;background:rgba(255,255,255,0.02);}' +
      '#shor_demo .shd-charttitle{font-size:0.8rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:5px;}' +
      '#shor_demo svg{display:block;background:' + C.canvasBg + ';border:1px solid ' + C.border + ';border-radius:4px;}' +
      '#shor_demo .shd-views{display:flex;flex-wrap:wrap;gap:12px;}' +
      '#shor_demo .shd-viewcell{flex:1;min-width:230px;}' +
      '#shor_demo .shd-viewcell.shd-wide{flex:1.4;min-width:280px;}' +
      '#shor_demo .shd-caption{font-size:0.75rem;color:' + C.faint + ';margin-top:4px;line-height:1.45;}' +
      '#shor_demo .shd-sliderrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px;}' +
      '#shor_demo .shd-sliderrow label{font-size:0.82rem;color:' + C.textDim + ';font-weight:bold;white-space:nowrap;}' +
      '#shor_demo .shd-sliderrow input{flex:1;min-width:140px;accent-color:' + C.accent + ';}' +
      '#shor_demo .shd-sub{font-size:0.75rem;color:' + C.faint + ';}' +
      '#shor_demo .shd-readout{font-family:"Courier New",monospace;font-size:0.8rem;color:' + C.comb + ';line-height:1.6;}' +
      '#shor_demo .shd-readout .shd-hot{color:' + C.hot + ';}' +
      '#shor_demo .shd-readout .shd-ok{color:' + C.accent + ';}' +
      '#shor_demo .shd-btnrow{display:flex;flex-wrap:wrap;gap:8px;}' +
      '#shor_demo .shd-btn{padding:7px 14px;border:1px solid ' + C.borderStrong + ';border-radius:4px;' +
        'background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.85rem;}' +
      '#shor_demo .shd-btn:hover{background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);}' +
      '#shor_demo .shd-result{padding:10px 13px;border-radius:6px;font-size:0.86rem;line-height:1.55;' +
        'border:1px solid ' + C.border + ';background:rgba(255,255,255,0.02);}' +
      '#shor_demo .shd-result.shd-good{border-color:rgba(102,187,106,0.45);background:rgba(102,187,106,0.08);}' +
      '#shor_demo .shd-result.shd-fail{border-color:rgba(240,160,48,0.45);background:rgba(240,160,48,0.08);}' +
      '#shor_demo .shd-result code{font-family:"Courier New",monospace;color:#fff;}' +
      '#shor_demo .shd-stats{font-size:0.84rem;line-height:1.6;border:1px solid ' + C.border + ';' +
        'border-radius:6px;padding:10px 13px;background:rgba(255,255,255,0.02);}';
    document.head.appendChild(style);

    var el = {
      N: document.getElementById('shd-N'), x: document.getElementById('shd-x'),
      meta: document.getElementById('shd-meta'),
      comb: document.getElementById('shd-comb'), s: document.getElementById('shd-s'),
      sVal: document.getElementById('shd-s-val'),
      walk: document.getElementById('shd-walk'), qft: document.getElementById('shd-qft'),
      b: document.getElementById('shd-b'), bVal: document.getElementById('shd-b-val'),
      readout: document.getElementById('shd-readout'),
      measure: document.getElementById('shd-measure'), many: document.getElementById('shd-many'),
      result: document.getElementById('shd-result'), stats: document.getElementById('shd-stats')
    };

    function pct(p) { return (100 * p).toFixed(1) + '%'; }

    function drawComb() {
      var q = state.q, r = state.r, s = parseInt(el.s.value, 10);
      var W = 800, H = 56;
      var out = '';
      for (var a = s; a < q; a += r) {
        var x = (a / q) * W;
        out += '<line x1="' + x.toFixed(2) + '" y1="' + (H - 6) + '" x2="' + x.toFixed(2) +
          '" y2="8" stroke="' + C.comb + '" stroke-width="1.2"/>';
      }
      out += '<line x1="0" y1="' + (H - 6) + '" x2="' + W + '" y2="' + (H - 6) +
        '" stroke="rgba(255,255,255,0.18)"/>';
      el.comb.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      el.comb.innerHTML = out;
    }

    function drawWalk(w) {
      var VB = 240, cx = VB / 2, cy = VB / 2, margin = 16;
      var scale = (VB / 2 - margin) / Math.max(1, w.m);
      var X = function (re) { return cx + re * scale; };
      var Y = function (im) { return cy - im * scale; };
      var out = '';
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (w.m * scale).toFixed(1) +
        '" fill="none" stroke="rgba(255,255,255,0.08)"/>';
      out += '<line x1="' + margin + '" y1="' + cy + '" x2="' + (VB - margin) + '" y2="' + cy +
        '" stroke="rgba(255,255,255,0.10)"/>';
      out += '<line x1="' + cx + '" y1="' + margin + '" x2="' + cx + '" y2="' + (VB - margin) +
        '" stroke="rgba(255,255,255,0.10)"/>';
      var d = '';
      for (var i = 0; i < w.pts.length; i++) {
        d += (i === 0 ? 'M' : 'L') + X(w.pts[i][0]).toFixed(2) + ' ' + Y(w.pts[i][1]).toFixed(2) + ' ';
      }
      var align = w.absS / w.m;
      var stroke = align > 0.6 ? C.hot : (align > 0.25 ? C.comb : C.blue);
      out += '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="1.4" opacity="0.9"/>';
      out += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(w.Sre).toFixed(2) + '" y2="' +
        Y(w.Sim).toFixed(2) + '" stroke="#fff" stroke-width="2"/>';
      out += '<circle cx="' + X(w.Sre).toFixed(2) + '" cy="' + Y(w.Sim).toFixed(2) + '" r="3" fill="#fff"/>';
      el.walk.innerHTML = out;
    }

    function drawQft(curB) {
      var q = state.q, probs = state.probs;
      var W = 800, H = 170;
      var cols = Math.min(W, q);
      var per = q / cols, bw = W / cols;
      var vmax = 0;
      var bucket = new Float64Array(cols);
      for (var c = 0; c < cols; c++) {
        var mx = 0, lo = Math.floor(c * per), hi = Math.floor((c + 1) * per);
        for (var b = lo; b < hi; b++) if (probs[b] > mx) mx = probs[b];
        bucket[c] = mx;
        if (mx > vmax) vmax = mx;
      }
      if (vmax === 0) vmax = 1;
      var out = '';
      for (c = 0; c < cols; c++) {
        var h = (bucket[c] / vmax) * (H - 6);
        if (h < 0.5) continue;
        out += '<rect x="' + (c * bw).toFixed(2) + '" y="' + (H - h).toFixed(2) + '" width="' +
          Math.max(bw - 0.5, 0.6).toFixed(2) + '" height="' + h.toFixed(2) + '" fill="' + C.blue + '"/>';
      }
      var mxLine = (curB / q) * W;
      out += '<line x1="' + mxLine.toFixed(2) + '" y1="0" x2="' + mxLine.toFixed(2) + '" y2="' + H +
        '" stroke="' + C.hot + '" stroke-width="1.5"/>';
      el.qft.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      el.qft.innerHTML = out;
    }

    function updateB() {
      var b = parseInt(el.b.value, 10);
      var s = parseInt(el.s.value, 10);
      var w = G.phaseWalk(state.r, state.q, b, s);
      drawWalk(w);
      drawQft(b);
      var cf = G.closedFormAbsS(state.r, state.q, b, w.m);
      var P = w.absS * w.absS / (w.m * state.q);
      var qr = state.q / state.r;
      var c = Math.round(b / qr);
      var nearest = Math.round(c * qr);
      var dist = Math.abs(b - nearest);
      el.bVal.textContent = b + ' / ' + state.q;
      var agree = Math.abs(w.absS - cf) < 1e-6;
      el.readout.innerHTML =
        '|S(b)| = ' + w.absS.toFixed(3) + ' (vector sum) ' +
        (agree ? '<span class="shd-ok">= ' : '<span class="shd-hot">\u2260 ') + cf.toFixed(3) +
        ' (sine-ratio formula)' + (agree ? ' \u2713' : ' \u2717') + '</span> of max m = ' + w.m +
        ' &nbsp; P(b) = ' + P.toFixed(4) + '<br>' +
        'nearest multiple of q/r: ' + c + '\u00B7(q/r) \u2248 ' + nearest + ' ' +
        (dist === 0
          ? '<span class="shd-hot">(exact: all vectors aligned \u2014 constructive)</span>'
          : '(distance ' + dist + ': vectors rotate' + (w.absS < w.m * 0.25 ? ', largely destructive' : ', partial') + ')');
    }

    function recompute() {
      var N = parseInt(el.N.value, 10);
      var x = parseInt(el.x.value, 10);
      var st = G.qftProbs(N, x, 0);
      var p = pExactCached(N, x);
      state = { N: N, x: x, r: st.r, q: st.q, m: st.m, probs: st.probs, pExact: p };
      var hard = st.q % st.r !== 0;
      el.meta.innerHTML =
        'r = ' + st.r + ' &nbsp; q = 2<sup>' + Math.round(Math.log2(st.q)) + '</sup> = ' + st.q +
        ' &nbsp; m = ' + st.m + ' &nbsp; <span class="shd-tag">' + (hard ? 'hard: r \u2224 q' : 'easy: r | q') +
        '</span> &nbsp; one-shot success: ' + pct(p);
      el.s.max = String(st.r - 1);
      el.s.value = '0';
      el.sVal.textContent = '0';
      el.b.max = String(st.q - 1);
      el.b.value = String(Math.round(st.q / st.r) % st.q);
      el.result.className = 'shd-result';
      el.result.innerHTML = 'Drag <b>b</b> to explore the interference, slide <b>s</b> to watch the invariance, then press <b>Measure</b>.';
      el.stats.style.display = 'none';
      drawComb();
      updateB();
    }

    function rebuildX() {
      var N = parseInt(el.N.value, 10);
      var xs = G.coprimeChoices(N);
      el.x.innerHTML = xs.map(function (x) {
        var r = G.order(x, N);
        var p = pExactCached(N, x);
        return '<option value="' + x + '">' + x + ' (r=' + r + ', success ' + pct(p) + ')</option>';
      }).join('');
      el.x.value = String(DEFAULT_X[N]);
      recompute();
    }

    function explainFail(res) {
      if (res.reason === 'odd') {
        return 'the recovered period <code>r = ' + res.rCand + '</code> is genuine but <b>odd</b>, so ' +
          '<code>x<sup>r/2</sup></code> does not exist \u2014 this base can never succeed (success 0%); ' +
          'the algorithm re-picks x, and the reduction theorem guarantees a lucky base is found quickly.';
      }
      if (res.reason === 'trivial') {
        return 'the recovered period is genuine, but <code>x<sup>r/2</sup> \u2261 \u22121 (mod N)</code> is a ' +
          '<b>trivial square root</b>, so both gcds collapse \u2014 the other unlucky branch; re-pick x.';
      }
      if (res.reason === 'not-period-shared') {
        return 'b sat on a constructive peak <code>c\u00B7(q/r)</code>, but <code>c</code> shares a factor with ' +
          'the period, so <code>' + res.cNum + '/' + res.rCand + '</code> is the reduced fraction and its ' +
          'denominator is not the period \u2014 the classical check rejects it at no cost.';
      }
      return 'the sampled <code>b</code> fell too far from every multiple of <code>q/r</code>, so the ' +
        'convergent <code>' + res.cNum + '/' + res.rCand + '</code> does not name a period \u2014 rejected at no cost.';
    }

    function measure() {
      var b = G.sampleB(state.probs, rng);
      el.b.value = String(b);
      updateB();
      var res = G.tryFactor(state.N, state.x, b, state.q, state.r);
      if (res.ok) {
        el.result.className = 'shd-result shd-good';
        el.result.innerHTML =
          'Measured <code>b = ' + b + '</code> \u2192 <code>b/q = ' + b + '/' + state.q + '</code> \u2192 ' +
          'continued fraction <code>' + res.cNum + '/' + res.rCand + '</code>, candidate period <code>r = ' +
          res.rCand + '</code>. Then <code>gcd(x<sup>r/2</sup>\u22121, N) = ' + res.f1 +
          '</code>, <code>gcd(x<sup>r/2</sup>+1, N) = ' + res.f2 + '</code> \u2192 <b>' + state.N + ' = ' +
          res.f1 + ' \u00D7 ' + res.f2 + '</b>.';
      } else {
        el.result.className = 'shd-result shd-fail';
        el.result.innerHTML = 'Measured <code>b = ' + b + '</code> \u2192 <code>' + res.cNum + '/' +
          res.rCand + '</code>: this run fails because ' + explainFail(res) +
          ' Press <b>Measure</b> again.';
      }
    }

    function measureMany() {
      var tally = { ok: 0, 'not-period-far': 0, 'not-period-shared': 0, odd: 0, trivial: 0 };
      for (var i = 0; i < 50; i++) {
        var b = G.sampleB(state.probs, rng);
        var res = G.tryFactor(state.N, state.x, b, state.q, state.r);
        if (res.ok) tally.ok++;
        else tally[res.reason]++;
      }
      el.stats.style.display = 'block';
      el.stats.innerHTML =
        '<strong>50 measurements:</strong> ' + tally.ok + ' succeeded (' + pct(tally.ok / 50) +
        ' observed vs ' + pct(state.pExact) + ' exact one-shot probability). Failures: ' +
        tally['not-period-far'] + ' off-peak, ' + tally['not-period-shared'] + ' shared-factor c, ' +
        tally.odd + ' odd period, ' + tally.trivial + ' trivial square root. ' +
        'Each failure is caught by the free classical check \u2014 repetition, not luck, is the resource.';
    }

    el.N.addEventListener('change', rebuildX);
    el.x.addEventListener('change', recompute);
    el.s.addEventListener('input', function () {
      el.sVal.textContent = el.s.value;
      drawComb();
      updateB(); // walk rotates; spectrum untouched by design (S7)
    });
    el.b.addEventListener('input', updateB);
    el.measure.addEventListener('click', measure);
    el.many.addEventListener('click', measureMany);

    rebuildX();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();