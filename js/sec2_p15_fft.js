//======================================================================
// sec2_p15_fft.js (v2) -- Fourier Transform demos, calc-15
// [Core IIFE] FftCore: pure math, DOM-free, Node-requirable.
// Convention: computational (forward e^{-2*pi*i/N}), matching the page's
// D-dft_idft definition; 1/N lives in the inverse only.
//======================================================================
var FftCore = (function () {
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
  // Box-Muller, seeded; keeps its own spare.
  function makeGaussian(rng) {
    var spare = null;
    return function () {
      if (spare !== null) { var v0 = spare; spare = null; return v0; }
      var u = 0, v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      var mag = Math.sqrt(-2.0 * Math.log(u));
      spare = mag * Math.cos(2.0 * Math.PI * v);
      return mag * Math.sin(2.0 * Math.PI * v);
    };
  }

  // ---------- 1D FFT (iterative Cooley-Tukey, in-place, split arrays) ----
  function isPow2(n) { return n > 0 && (n & (n - 1)) === 0; }

  // forward: sign = -1 (e^{-2 pi i k n / N}); inverse handled by ifft1d.
  function fft1dInPlace(re, im, sign) {
    var n = re.length;
    if (!isPow2(n)) throw new Error('fft1d: length must be a power of 2, got ' + n);
    // bit reversal
    var j = 0, i, k, tmp;
    for (i = 0; i < n; i++) {
      if (i < j) {
        tmp = re[i]; re[i] = re[j]; re[j] = tmp;
        tmp = im[i]; im[i] = im[j]; im[j] = tmp;
      }
      k = n >> 1;
      while (k >= 1 && (j & k)) { j ^= k; k >>= 1; }
      j |= k;
    }
    // butterflies
    for (var size = 2; size <= n; size <<= 1) {
      var half = size >> 1;
      var ang = sign * 2 * Math.PI / size;
      for (i = 0; i < n; i += size) {
        for (j = 0; j < half; j++) {
          var wr = Math.cos(ang * j), wi = Math.sin(ang * j);
          var l = i + j, r = i + j + half;
          var tr = re[r] * wr - im[r] * wi;
          var ti = re[r] * wi + im[r] * wr;
          re[r] = re[l] - tr; im[r] = im[l] - ti;
          re[l] = re[l] + tr; im[l] = im[l] + ti;
        }
      }
    }
  }

  // returns new arrays; input untouched
  function fft1d(re, im) {
    var r = Float64Array.from(re), m = Float64Array.from(im);
    fft1dInPlace(r, m, -1);
    return { re: r, im: m };
  }
  function ifft1d(re, im) {
    var n = re.length;
    var r = Float64Array.from(re), m = Float64Array.from(im);
    fft1dInPlace(r, m, +1);
    for (var i = 0; i < n; i++) { r[i] /= n; m[i] /= n; }
    return { re: r, im: m };
  }

  // O(N^2) direct DFT -- certificate reference, never used by the UI.
  function dftDirect(re, im, sign) {
    var n = re.length;
    var R = new Float64Array(n), M = new Float64Array(n);
    for (var k = 0; k < n; k++) {
      var sr = 0, si = 0;
      for (var t = 0; t < n; t++) {
        var ang = sign * 2 * Math.PI * k * t / n;
        var c = Math.cos(ang), s = Math.sin(ang);
        sr += re[t] * c - im[t] * s;
        si += re[t] * s + im[t] * c;
      }
      R[k] = sr; M[k] = si;
    }
    return { re: R, im: M };
  }

  // ---------- 2D FFT (row-column; NO shift baked in) ----------
  function fft2d(re, im, w, h, inverse) {
    if (!isPow2(w) || !isPow2(h)) throw new Error('fft2d: dims must be powers of 2');
    var R = Float64Array.from(re), M = Float64Array.from(im);
    var sign = inverse ? +1 : -1;
    var x, y;
    var rowR = new Float64Array(w), rowM = new Float64Array(w);
    for (y = 0; y < h; y++) {
      var off = y * w;
      for (x = 0; x < w; x++) { rowR[x] = R[off + x]; rowM[x] = M[off + x]; }
      fft1dInPlace(rowR, rowM, sign);
      for (x = 0; x < w; x++) { R[off + x] = rowR[x]; M[off + x] = rowM[x]; }
    }
    var colR = new Float64Array(h), colM = new Float64Array(h);
    for (x = 0; x < w; x++) {
      for (y = 0; y < h; y++) { colR[y] = R[y * w + x]; colM[y] = M[y * w + x]; }
      fft1dInPlace(colR, colM, sign);
      for (y = 0; y < h; y++) { R[y * w + x] = colR[y]; M[y * w + x] = colM[y]; }
    }
    if (inverse) {
      var nTot = w * h;
      for (var i = 0; i < R.length; i++) { R[i] /= nTot; M[i] /= nTot; }
    }
    return { re: R, im: M };
  }

  // fftShift2d: separate, self-inverse for even dims. (v1 baked this into
  // the transform itself; here the DFT is the DFT and the shift is display.)
  function fftShift2d(arr, w, h) {
    var out = new Float64Array(w * h);
    var hw = w >> 1, hh = h >> 1;
    for (var y = 0; y < h; y++) {
      var sy = (y + hh) % h;
      for (var x = 0; x < w; x++) {
        out[y * w + x] = arr[sy * w + ((x + hw) % w)];
      }
    }
    return out;
  }
  function shiftComplex(F, w, h) {
    return { re: fftShift2d(F.re, w, h), im: fftShift2d(F.im, w, h) };
  }

  // ---------- windows ----------
  // Periodic Hann (DFT-analysis form): w[i] = 0.5 (1 - cos(2 pi i / N)).
  // Coherent gain = mean(w) = 0.5 exactly (sum of cos over a full period is 0).
  var WINDOWS = {
    rect: { make: function (n) { var w = new Float64Array(n); w.fill(1); return w; }, gain: 1.0 },
    hann: {
      make: function (n) {
        var w = new Float64Array(n);
        for (var i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / n));
        return w;
      },
      gain: 0.5
    }
  };

  // ---------- 1D signal + spectrum ----------
  // Single source of truth: the same comps array drives generation; no
  // separate "true function" renderer exists to drift.
  function makeSignal1d(opts) {
    var fs = opts.fs, n = opts.n, comps = opts.comps, noiseAmp = opts.noiseAmp;
    var gauss = makeGaussian(mulberry32(opts.seed));
    var t = new Float64Array(n), x = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var ti = i / fs;
      t[i] = ti;
      var v = 0;
      for (var c = 0; c < comps.length; c++) {
        v += comps[c].a * Math.sin(2 * Math.PI * comps[c].f * ti);
      }
      x[i] = v + noiseAmp * gauss();
    }
    return { t: t, x: x };
  }

  // Single-sided amplitude spectrum, bins k = 0..N/2 INCLUSIVE (v1 dropped
  // the Nyquist bin). Scaling: A[0] = |X[0]|/N, A[N/2] = |X[N/2]|/N,
  // A[k] = 2|X[k]|/N otherwise; windowed spectra are divided by the window's
  // coherent gain so an on-bin sinusoid of amplitude a reads a (disclosed).
  function spectrum1d(x, fs, windowName) {
    var n = x.length;
    var win = WINDOWS[windowName];
    if (!win) throw new Error('unknown window: ' + windowName);
    var w = win.make(n);
    var re = new Float64Array(n), im = new Float64Array(n);
    for (var i = 0; i < n; i++) re[i] = x[i] * w[i];
    fft1dInPlace(re, im, -1);
    var half = n >> 1;
    var amp = new Float64Array(half + 1);
    var freq = new Float64Array(half + 1);
    for (var k = 0; k <= half; k++) {
      var mag = Math.hypot(re[k], im[k]) / n;
      if (k !== 0 && k !== half) mag *= 2;
      amp[k] = mag / win.gain;
      freq[k] = k * fs / n;
    }
    return { freq: freq, amp: amp };
  }

  // ---------- circular convolution (certificate pair) ----------
  function circConvDirect(a, b) {
    var n = a.length, out = new Float64Array(n);
    for (var k = 0; k < n; k++) {
      var s = 0;
      for (var j = 0; j < n; j++) s += a[j] * b[(k - j + n) % n];
      out[k] = s;
    }
    return out;
  }
  function circConvFft(a, b) {
    var n = a.length;
    var A = fft1d(a, new Float64Array(n));
    var B = fft1d(b, new Float64Array(n));
    var pr = new Float64Array(n), pi = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      pr[i] = A.re[i] * B.re[i] - A.im[i] * B.im[i];
      pi[i] = A.re[i] * B.im[i] + A.im[i] * B.re[i];
    }
    return ifft1d(pr, pi).re;
  }

  // ---------- image helpers ----------
  function toGrayscale(rgba, nPix) {
    var g = new Float64Array(nPix);
    for (var i = 0; i < nPix; i++) {
      var k = i * 4;
      g[i] = 0.299 * rgba[k] + 0.587 * rgba[k + 1] + 0.114 * rgba[k + 2];
    }
    return g;
  }

  // Display normalization is a DISCLOSED affine map [min,max] -> [0,255].
  // Constant images refuse the stretch and render mid-gray (ok:false).
  function normalizeForDisplay(data) {
    var min = Infinity, max = -Infinity, i;
    for (i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    var out = new Uint8ClampedArray(data.length);
    if (max - min < 1e-12) { out.fill(128); return { ok: false, pixels: out, min: min, max: max }; }
    var s = 255 / (max - min);
    for (i = 0; i < data.length; i++) out[i] = Math.round((data[i] - min) * s);
    return { ok: true, pixels: out, min: min, max: max };
  }

  // ---------- filters (masks in SHIFTED coordinates: center = DC) ----------
  function butterworthLow(w, h, radius) {
    var cx = w / 2, cy = h / 2, mask = new Float64Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var d = Math.hypot(x - cx, y - cy);
      mask[y * w + x] = 1 / (1 + Math.pow(d / radius, 4)); // order-2 Butterworth
    }
    return mask;
  }
  function butterworthHigh(w, h, radius) {
    var m = butterworthLow(w, h, radius);
    for (var i = 0; i < m.length; i++) m[i] = 1 - m[i];
    return m;
  }
  function butterworthBand(w, h, inner, outer) {
    var lo = butterworthLow(w, h, outer), hi = butterworthHigh(w, h, inner);
    var m = new Float64Array(lo.length);
    for (var i = 0; i < m.length; i++) m[i] = lo[i] * hi[i];
    return m;
  }
  // Notch: suppress top-percentile spikes away from DC with Gaussian notches.
  function notchMask(magShifted, w, h, opts) {
    opts = opts || {};
    var topFrac = opts.topFrac || 0.003, notchSize = opts.notchSize || 5, dcGuard = opts.dcGuard || 5;
    var sorted = Array.prototype.slice.call(magShifted).sort(function (a, b) { return b - a; });
    var threshold = sorted[Math.floor(sorted.length * topFrac)];
    var mask = new Float64Array(w * h); mask.fill(1);
    var cx = w / 2, cy = h / 2;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (Math.abs(x - cx) <= dcGuard && Math.abs(y - cy) <= dcGuard) continue; // protect DC
      if (magShifted[y * w + x] > threshold) {
        for (var dy = -notchSize; dy <= notchSize; dy++) for (var dx = -notchSize; dx <= notchSize; dx++) {
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          var dist = Math.hypot(dx, dy);
          // Inverted Gaussian notch: 0 at the spike center, recovering to 1
          // with distance (v1 used exp(-d^2/..), which is 1 AT the spike --
          // i.e. it suppressed everything EXCEPT the spike; found by T17b).
          var sg = notchSize / 2;
          if (dist <= notchSize) mask[ny * w + nx] *= (1 - Math.exp(-(dist * dist) / (2 * sg * sg)));
        }
      }
    }
    return mask;
  }
  // High-frequency emphasis 1 + alpha * (1 - exp(-d^2 / 2 sigma^2)); H(0)=1.
  function sharpenMask(w, h, alpha, sigma) {
    var cx = w / 2, cy = h / 2, mask = new Float64Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      mask[y * w + x] = 1 + alpha * (1 - Math.exp(-d2 / (2 * sigma * sigma)));
    }
    return mask;
  }

  // Apply a SHIFTED-coordinate mask to an UNSHIFTED spectrum, return the
  // real part of the inverse transform. One code path for every operation.
  function applyMask(F, maskShifted, w, h) {
    var mu = fftShift2d(maskShifted, w, h); // unshift the mask, not the data
    var fr = new Float64Array(w * h), fi = new Float64Array(w * h);
    for (var i = 0; i < w * h; i++) { fr[i] = F.re[i] * mu[i]; fi[i] = F.im[i] * mu[i]; }
    return fft2d(fr, fi, w, h, true).re;
  }

  // Compression: keep the top-k fraction of coefficients by magnitude,
  // zero the rest. Returns image + the fraction of spectral energy kept.
  function compress(F, w, h, keepFrac) {
    var n = w * h, i;
    var mags = new Array(n);
    var totalE = 0;
    for (i = 0; i < n; i++) {
      var m2 = F.re[i] * F.re[i] + F.im[i] * F.im[i];
      totalE += m2;
      mags[i] = { i: i, m2: m2 };
    }
    mags.sort(function (a, b) { return b.m2 - a.m2; });
    var keep = Math.max(1, Math.round(n * keepFrac));
    var fr = new Float64Array(n), fi = new Float64Array(n);
    var keptE = 0;
    for (i = 0; i < keep; i++) {
      var idx = mags[i].i;
      fr[idx] = F.re[idx]; fi[idx] = F.im[idx];
      keptE += mags[i].m2;
    }
    return {
      image: fft2d(fr, fi, w, h, true).re,
      keptCount: keep,
      energyFrac: totalE > 0 ? keptE / totalE : 1
    };
  }

  // Phase-only / magnitude-only reconstructions (the page's claim, on screen).
  function phaseOnly(F, w, h) {
    var n = w * h, fr = new Float64Array(n), fi = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var m = Math.hypot(F.re[i], F.im[i]);
      if (m < 1e-300) { fr[i] = 1; fi[i] = 0; } // zero coefficient: phase undefined, use 1
      else { fr[i] = F.re[i] / m; fi[i] = F.im[i] / m; }
    }
    return fft2d(fr, fi, w, h, true).re;
  }
  function magnitudeOnly(F, w, h) {
    var n = w * h, fr = new Float64Array(n), fi = new Float64Array(n);
    for (var i = 0; i < n; i++) { fr[i] = Math.hypot(F.re[i], F.im[i]); fi[i] = 0; }
    return fft2d(fr, fi, w, h, true).re;
  }

  function magnitude2d(F) {
    var n = F.re.length, out = new Float64Array(n);
    for (var i = 0; i < n; i++) out[i] = Math.hypot(F.re[i], F.im[i]);
    return out;
  }
  function phase2d(F) {
    var n = F.re.length, out = new Float64Array(n);
    for (var i = 0; i < n; i++) out[i] = Math.atan2(F.im[i], F.re[i]);
    return out;
  }

  //====================================================================
  // Self-tests. Every certificate can fail; the UI refuses to render
  // if any does.
  //====================================================================
  function runSelfTests() {
    var failures = [];
    function check(name, cond, detail) {
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    function close(a, b, tol) { return Math.abs(a - b) <= tol; }
    function maxDiff(a, b) {
      var m = 0;
      for (var i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
      return m;
    }
    function randComplex(n, seed) {
      var rng = mulberry32(seed);
      var re = new Float64Array(n), im = new Float64Array(n);
      for (var i = 0; i < n; i++) { re[i] = rng() * 2 - 1; im[i] = rng() * 2 - 1; }
      return { re: re, im: im };
    }
    var i, k, n;

    // T1: FFT == direct DFT (the flagship certificate)
    [8, 16, 32, 64].forEach(function (nn) {
      var z = randComplex(nn, 100 + nn);
      var a = fft1d(z.re, z.im);
      var b = dftDirect(z.re, z.im, -1);
      check('T1 fft==direct DFT N=' + nn,
        maxDiff(a.re, b.re) < 1e-9 && maxDiff(a.im, b.im) < 1e-9,
        maxDiff(a.re, b.re).toExponential(2));
    });

    // T2: round trip
    var z2 = randComplex(128, 7);
    var rt = ifft1d(fft1d(z2.re, z2.im).re, fft1d(z2.re, z2.im).im);
    check('T2 ifft(fft(x))==x', maxDiff(rt.re, z2.re) < 1e-12 && maxDiff(rt.im, z2.im) < 1e-12);

    // T3: linearity
    (function () {
      var u = randComplex(64, 11), v = randComplex(64, 12);
      var al = 2.5, be = -1.25;
      var mixRe = new Float64Array(64), mixIm = new Float64Array(64);
      for (i = 0; i < 64; i++) { mixRe[i] = al * u.re[i] + be * v.re[i]; mixIm[i] = al * u.im[i] + be * v.im[i]; }
      var Fm = fft1d(mixRe, mixIm), Fu = fft1d(u.re, u.im), Fv = fft1d(v.re, v.im);
      var err = 0;
      for (i = 0; i < 64; i++) {
        err = Math.max(err, Math.abs(Fm.re[i] - (al * Fu.re[i] + be * Fv.re[i])),
          Math.abs(Fm.im[i] - (al * Fu.im[i] + be * Fv.im[i])));
      }
      check('T3 linearity', err < 1e-10, err.toExponential(2));
    })();

    // T4: circular shift <-> modulation: y[t]=x[(t-s) mod N] => Y[k]=X[k] e^{-2 pi i k s/N}
    (function () {
      n = 32; var s = 5;
      var x = randComplex(n, 21);
      var yr = new Float64Array(n), yi = new Float64Array(n);
      for (i = 0; i < n; i++) { yr[i] = x.re[(i - s + n) % n]; yi[i] = x.im[(i - s + n) % n]; }
      var X = fft1d(x.re, x.im), Y = fft1d(yr, yi);
      var err = 0;
      for (k = 0; k < n; k++) {
        var ang = -2 * Math.PI * k * s / n;
        var er = X.re[k] * Math.cos(ang) - X.im[k] * Math.sin(ang);
        var ei = X.re[k] * Math.sin(ang) + X.im[k] * Math.cos(ang);
        err = Math.max(err, Math.abs(Y.re[k] - er), Math.abs(Y.im[k] - ei));
      }
      check('T4 shift theorem', err < 1e-10, err.toExponential(2));
    })();

    // T5: Parseval sum|x|^2 == (1/N) sum|X|^2
    (function () {
      var x = randComplex(256, 31);
      var X = fft1d(x.re, x.im);
      var e1 = 0, e2 = 0;
      for (i = 0; i < 256; i++) {
        e1 += x.re[i] * x.re[i] + x.im[i] * x.im[i];
        e2 += X.re[i] * X.re[i] + X.im[i] * X.im[i];
      }
      check('T5 Parseval 1D', close(e1, e2 / 256, 1e-9 * e1), (e1 - e2 / 256).toExponential(2));
    })();

    // T6: Hermitian symmetry for real input
    (function () {
      n = 64;
      var rng = mulberry32(41);
      var xr = new Float64Array(n);
      for (i = 0; i < n; i++) xr[i] = rng() * 2 - 1;
      var X = fft1d(xr, new Float64Array(n));
      var err = 0;
      for (k = 1; k < n; k++) {
        err = Math.max(err, Math.abs(X.re[n - k] - X.re[k]), Math.abs(X.im[n - k] + X.im[k]));
      }
      check('T6 Hermitian symmetry', err < 1e-10, err.toExponential(2));
    })();

    // T7: on-bin sinusoid spectrum pins, INCLUDING the Nyquist bin
    (function () {
      var fs = 512, nn = 512;
      var sig = makeSignal1d({ fs: fs, n: nn, comps: [{ f: 50, a: 1.0 }, { f: 120, a: 0.5 }], noiseAmp: 0, seed: 1 });
      var sp = spectrum1d(sig.x, fs, 'rect');
      check('T7a spectrum length includes Nyquist bin', sp.amp.length === nn / 2 + 1, sp.amp.length);
      check('T7b peak a=1.0 at 50 Hz', close(sp.amp[50], 1.0, 1e-9), sp.amp[50]);
      check('T7c peak a=0.5 at 120 Hz', close(sp.amp[120], 0.5, 1e-9), sp.amp[120]);
      var off = 0;
      for (k = 0; k <= nn / 2; k++) if (k !== 50 && k !== 120) off = Math.max(off, sp.amp[k]);
      check('T7d off-bin amplitudes ~0 (noiseless, on-bin)', off < 1e-9, off.toExponential(2));
      // Nyquist: x[t] = cos(pi t) = (-1)^t has X[N/2] = N; A[N/2] must be 1.
      var xr = new Float64Array(nn);
      for (i = 0; i < nn; i++) xr[i] = (i % 2 === 0) ? 1 : -1;
      var spN = spectrum1d(xr, fs, 'rect');
      check('T7e Nyquist-bin amplitude of (-1)^t is 1', close(spN.amp[nn / 2], 1.0, 1e-9), spN.amp[nn / 2]);
      // time-domain value pin: sin, not cos (magnitude spectra cannot tell)
      var s8 = makeSignal1d({ fs: 8, n: 8, comps: [{ f: 1, a: 1 }], noiseAmp: 0, seed: 1 });
      check('T7f x[1] == sin(2 pi /8)', close(s8.x[1], Math.SQRT1_2, 1e-12), s8.x[1]);
      check('T7g x[0] == 0', close(s8.x[0], 0, 1e-12), s8.x[0]);
    })();

    // T8: the page's fourth-power identity W^4 = N^2 I (N=8), via 4 forward FFTs
    (function () {
      n = 8;
      var err = 0;
      for (var b = 0; b < n; b++) {
        var re = new Float64Array(n), im = new Float64Array(n);
        re[b] = 1;
        for (var rep = 0; rep < 4; rep++) fft1dInPlace(re, im, -1);
        for (i = 0; i < n; i++) {
          var expect = (i === b) ? n * n : 0;
          err = Math.max(err, Math.abs(re[i] - expect), Math.abs(im[i]));
        }
      }
      check('T8 W^4 == N^2 I (N=8)', err < 1e-9, err.toExponential(2));
    })();

    // T9: convolution theorem (FFT route == direct circular convolution)
    (function () {
      n = 64;
      var rng = mulberry32(51);
      var a = new Float64Array(n), b = new Float64Array(n);
      for (i = 0; i < n; i++) { a[i] = rng() * 2 - 1; b[i] = rng() * 2 - 1; }
      var d = maxDiff(circConvFft(a, b), circConvDirect(a, b));
      check('T9 convolution theorem', d < 1e-9, d.toExponential(2));
    })();

    // T10: 2D FFT == direct 2D DFT (8x8) -- also pins that NO shift is baked in
    (function () {
      var w = 8, h = 8;
      var rng = mulberry32(61);
      var g = new Float64Array(w * h);
      for (i = 0; i < w * h; i++) g[i] = rng() * 2 - 1;
      var F = fft2d(g, new Float64Array(w * h), w, h, false);
      var R = new Float64Array(w * h), M = new Float64Array(w * h);
      for (var v = 0; v < h; v++) for (var u = 0; u < w; u++) {
        var sr = 0, si = 0;
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
          var ang = -2 * Math.PI * (u * x / w + v * y / h);
          sr += g[y * w + x] * Math.cos(ang);
          si += g[y * w + x] * Math.sin(ang);
        }
        R[v * w + u] = sr; M[v * w + u] = si;
      }
      check('T10 fft2d==direct 2D DFT (unshifted)',
        maxDiff(F.re, R) < 1e-9 && maxDiff(F.im, M) < 1e-9,
        maxDiff(F.re, R).toExponential(2));
      // DC lives at index 0 in the unshifted output; shifted, at center.
      var sumG = 0;
      for (i = 0; i < w * h; i++) sumG += g[i];
      check('T10b DC at index 0 unshifted', close(F.re[0], sumG, 1e-9));
      var sh = fftShift2d(F.re, w, h);
      check('T10c DC at center after shift', close(sh[(h / 2) * w + (w / 2)], sumG, 1e-9));
    })();

    // T11: fftShift2d is an involution (even dims)
    (function () {
      var w = 16, h = 16;
      var rng = mulberry32(71);
      var g = new Float64Array(w * h);
      for (i = 0; i < w * h; i++) g[i] = rng();
      var d = maxDiff(fftShift2d(fftShift2d(g, w, h), w, h), g);
      check('T11 shift involution', d === 0, d);
    })();

    // T12: 2D Parseval + round trip
    (function () {
      var w = 32, h = 32;
      var rng = mulberry32(81);
      var g = new Float64Array(w * h);
      for (i = 0; i < w * h; i++) g[i] = rng() * 255;
      var F = fft2d(g, new Float64Array(w * h), w, h, false);
      var e1 = 0, e2 = 0;
      for (i = 0; i < w * h; i++) {
        e1 += g[i] * g[i];
        e2 += F.re[i] * F.re[i] + F.im[i] * F.im[i];
      }
      check('T12a Parseval 2D', close(e1, e2 / (w * h), 1e-9 * e1));
      var back = fft2d(F.re, F.im, w, h, true);
      check('T12b 2D round trip', maxDiff(back.re, g) < 1e-9, maxDiff(back.re, g).toExponential(2));
    })();

    // T13: Butterworth pins -- half power at d==r; monotone; high = 1 - low
    (function () {
      var w = 64, h = 64, r = 16;
      var lo = butterworthLow(w, h, r);
      // point at exact distance r from center: (cx + r, cy)
      var v = lo[(h / 2) * w + (w / 2 + r)];
      check('T13a Butterworth value 1/2 at cutoff', close(v, 0.5, 1e-12), v);
      var vNear = lo[(h / 2) * w + (w / 2 + 4)], vFar = lo[(h / 2) * w + (w / 2 + 28)];
      check('T13b Butterworth monotone', vNear > v && v > vFar);
      // order pin: order-2 gives 1/17 at d = 2r' (order-1 would give 1/5);
      // separate small radius so the probe stays inside the row
      var lo8 = butterworthLow(w, h, 8);
      var v2r = lo8[(h / 2) * w + (w / 2 + 16)];
      check('T13a2 order-2 value 1/17 at d=2r', close(v2r, 1 / 17, 1e-12), v2r);
      var hi = butterworthHigh(w, h, r);
      check('T13c high == 1 - low', close(hi[(h / 2) * w + (w / 2 + r)], 0.5, 1e-12));
      var band = butterworthBand(w, h, 8, 24);
      var okRange = true;
      for (i = 0; i < band.length; i++) if (band[i] < 0 || band[i] > 1) okRange = false;
      check('T13d band mask in [0,1]', okRange);
    })();

    // T14: compression -- 100% is exact identity; energy fraction monotone
    (function () {
      var w = 32, h = 32;
      var rng = mulberry32(91);
      var g = new Float64Array(w * h);
      for (i = 0; i < w * h; i++) g[i] = rng() * 255;
      var F = fft2d(g, new Float64Array(w * h), w, h, false);
      var full = compress(F, w, h, 1.0);
      check('T14a keep=100% reconstructs image', maxDiff(full.image, g) < 1e-9);
      check('T14b keep=100% energyFrac==1', close(full.energyFrac, 1, 1e-12));
      var half = compress(F, w, h, 0.5), tenth = compress(F, w, h, 0.1);
      check('T14c keptCount exact', half.keptCount === Math.round(w * h * 0.5), half.keptCount);
      check('T14d energy monotone in keep',
        full.energyFrac >= half.energyFrac && half.energyFrac >= tenth.energyFrac && tenth.energyFrac > 0);
      // top-k selection pin: keeping the LARGEST coefficients must capture
      // almost all energy (DC alone dominates); an ascending sort cannot pass
      check('T14f top-10% captures > 50% energy (ascending sort would fail)', tenth.energyFrac > 0.5, tenth.energyFrac.toFixed(4));
      // truncation error bound: ||g - g_k||^2 == (discarded energy)/(wh) (Parseval)
      var err2 = 0;
      for (i = 0; i < w * h; i++) err2 += (g[i] - half.image[i]) * (g[i] - half.image[i]);
      var totalE = 0;
      for (i = 0; i < w * h; i++) totalE += F.re[i] * F.re[i] + F.im[i] * F.im[i];
      var discarded = (1 - half.energyFrac) * totalE / (w * h);
      check('T14e truncation error == discarded energy (Parseval)',
        close(err2, discarded, 1e-6 * Math.max(1, err2)), (err2 - discarded).toExponential(2));
    })();

    // T15: phase-only / magnitude-only certificates
    (function () {
      var w = 32, h = 32;
      var rng = mulberry32(101);
      var g = new Float64Array(w * h);
      for (i = 0; i < w * h; i++) g[i] = rng() * 255;
      var F = fft2d(g, new Float64Array(w * h), w, h, false);
      var po = phaseOnly(F, w, h);
      // |X'| = 1 everywhere => Parseval: sum |g'|^2 = (1/(wh)) * wh = 1
      var e = 0;
      for (i = 0; i < w * h; i++) e += po[i] * po[i];
      check('T15a phase-only total energy == 1 (Parseval)', close(e, 1, 1e-9), e);
      var mo = magnitudeOnly(F, w, h);
      // |X| is real & Hermitian-even => reconstruction is real and centrosymmetric
      var err = 0;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var mirror = mo[((h - y) % h) * w + ((w - x) % w)];
        err = Math.max(err, Math.abs(mo[y * w + x] - mirror));
      }
      check('T15b magnitude-only is centrosymmetric', err < 1e-9, err.toExponential(2));
    })();

    // T16: window certificates -- Hann coherent gain, leakage story
    (function () {
      n = 512;
      var w = WINDOWS.hann.make(n);
      var mean = 0;
      for (i = 0; i < n; i++) mean += w[i];
      mean /= n;
      check('T16a periodic Hann coherent gain == 0.5 exactly', close(mean, 0.5, 1e-12), mean);
      // Off-bin sinusoid f=50.5: rect leaks broadly; Hann confines it.
      var fs = 512;
      var sig = makeSignal1d({ fs: fs, n: n, comps: [{ f: 50.5, a: 1.0 }], noiseAmp: 0, seed: 1 });
      var spR = spectrum1d(sig.x, fs, 'rect');
      var spH = spectrum1d(sig.x, fs, 'hann');
      function maxOutside(sp, center, halfWidth) {
        var m = 0;
        for (var kk = 0; kk <= n / 2; kk++) {
          if (Math.abs(kk - center) > halfWidth) m = Math.max(m, sp.amp[kk]);
        }
        return m;
      }
      var leakR = maxOutside(spR, 50.5, 5), leakH = maxOutside(spH, 50.5, 5);
      check('T16b rect window leaks off-bin (>0.02)', leakR > 0.02, leakR);
      check('T16c Hann suppresses leakage by >15x', leakH * 15 < leakR, (leakR / leakH).toFixed(1));
      // on-bin: Hann-corrected peak reads the true amplitude within 1e-6
      var on = makeSignal1d({ fs: fs, n: n, comps: [{ f: 50, a: 1.0 }], noiseAmp: 0, seed: 1 });
      var spOn = spectrum1d(on.x, fs, 'hann');
      check('T16d Hann-corrected on-bin peak == a', close(spOn.amp[50], 1.0, 1e-6), spOn.amp[50]);
    })();

    // T17: notch mask -- DC protected, mask in [0,1], spikes actually suppressed
    (function () {
      var w = 64, h = 64;
      var mag = new Float64Array(w * h); mag.fill(1);
      var sx = w / 2 + 12, sy = h / 2;
      mag[sy * w + sx] = 1000;               // artificial spike off-DC
      mag[(h / 2) * w + (w / 2)] = 5000;     // huge DC -- must survive
      var m = notchMask(mag, w, h, {});
      check('T17a DC untouched', m[(h / 2) * w + (w / 2)] === 1);
      check('T17b spike suppressed', m[sy * w + sx] < 0.7, m[sy * w + sx]);
      var okRange = true;
      for (i = 0; i < m.length; i++) if (m[i] < 0 || m[i] > 1) okRange = false;
      check('T17c mask in [0,1]', okRange);
    })();

    // T18: sharpen mask pins -- H(DC)=1 exactly, H(far)->1+alpha
    (function () {
      var w = 64, h = 64, alpha = 0.5, sigma = 8;
      var m = sharpenMask(w, h, alpha, sigma);
      check('T18a sharpen H(DC)==1', m[(h / 2) * w + (w / 2)] === 1);
      check('T18b sharpen H(corner) ~ 1+alpha', close(m[0], 1 + alpha, 1e-6), m[0]);
    })();

    // T19: grayscale luminance pins
    (function () {
      var rgba = new Uint8ClampedArray(8);
      rgba[0] = 255; rgba[1] = 255; rgba[2] = 255; rgba[3] = 255; // white
      rgba[4] = 255; rgba[5] = 0; rgba[6] = 0; rgba[7] = 255;     // red
      var g = toGrayscale(rgba, 2);
      check('T19a white -> 255', close(g[0], 255, 1e-9), g[0]);
      check('T19b red -> 76.245', close(g[1], 76.245, 1e-9), g[1]);
    })();

    // T20: seeded RNG determinism + Gaussian sanity
    (function () {
      var g1 = makeGaussian(mulberry32(1234)), g2 = makeGaussian(mulberry32(1234));
      var same = true;
      for (i = 0; i < 100; i++) if (g1() !== g2()) same = false;
      check('T20a same seed -> bitwise same stream', same);
      var g3 = makeGaussian(mulberry32(1234));
      var s = 0, s2 = 0, NN = 20000;
      for (i = 0; i < NN; i++) { var vv = g3(); s += vv; s2 += vv * vv; }
      var mean = s / NN, sd = Math.sqrt(s2 / NN - mean * mean);
      check('T20b Gaussian mean ~ 0', Math.abs(mean) < 0.03, mean.toFixed(4));
      check('T20c Gaussian sd ~ 1', Math.abs(sd - 1) < 0.03, sd.toFixed(4));
      var g4 = makeGaussian(mulberry32(99));
      var distinct = true, prev = g4();
      for (i = 0; i < 100; i++) { var cur = g4(); if (cur === prev) distinct = false; prev = cur; }
      check('T20d consecutive draws distinct', distinct);
    })();

    // T21: display normalization -- affine pin + constant-image refusal
    (function () {
      var d = new Float64Array([10, 20, 30]);
      var r = normalizeForDisplay(d);
      check('T21a min->0 max->255 mid->128', r.ok && r.pixels[0] === 0 && r.pixels[2] === 255 && r.pixels[1] === 128);
      var c = new Float64Array([7, 7, 7]);
      var rc = normalizeForDisplay(c);
      check('T21b constant image refuses stretch', !rc.ok && rc.pixels[0] === 128);
    })();

    // T22: 1D story test -- default settings show peaks clearly above noise
    (function () {
      var fs = 512, nn = 512;
      var sig = makeSignal1d({ fs: fs, n: nn, comps: [{ f: 50, a: 1.0 }, { f: 120, a: 0.5 }], noiseAmp: 0.3, seed: 20260717 });
      var sp = spectrum1d(sig.x, fs, 'rect');
      var floor = 0;
      for (k = 1; k <= nn / 2; k++) {
        if (Math.abs(k - 50) > 2 && Math.abs(k - 120) > 2) floor = Math.max(floor, sp.amp[k]);
      }
      check('T22 default story: both peaks > 3x noise floor',
        sp.amp[50] > 3 * floor && sp.amp[120] > 3 * floor,
        'floor=' + floor.toFixed(3) + ' p50=' + sp.amp[50].toFixed(3) + ' p120=' + sp.amp[120].toFixed(3));
    })();

    // T23: applyMask with all-ones mask is the identity (one code path pin)
    (function () {
      var w = 16, h = 16;
      var rng = mulberry32(111);
      var g = new Float64Array(w * h);
      for (i = 0; i < w * h; i++) g[i] = rng() * 255;
      var F = fft2d(g, new Float64Array(w * h), w, h, false);
      var ones = new Float64Array(w * h); ones.fill(1);
      var out = applyMask(F, ones, w, h);
      check('T23 unit mask == identity', maxDiff(out, g) < 1e-9, maxDiff(out, g).toExponential(2));
      // T23b: low-pass through applyMask preserves the mean (DC gain 1).
      // If the mask were NOT unshifted, the low-pass disk would sit on the
      // high-frequency corners and the mean would collapse.
      var lp = butterworthLow(w, h, 4);
      var outLp = applyMask(F, lp, w, h);
      var m0 = 0, m1 = 0;
      for (i = 0; i < w * h; i++) { m0 += g[i]; m1 += outLp[i]; }
      m0 /= (w * h); m1 /= (w * h);
      check('T23b low-pass preserves mean within 1%', Math.abs(m1 - m0) < 0.01 * Math.abs(m0), (m1 - m0).toFixed(3));
    })();

    return { pass: failures.length === 0, failures: failures };
  }

  return {
    mulberry32: mulberry32,
    makeGaussian: makeGaussian,
    fft1d: fft1d,
    ifft1d: ifft1d,
    fft1dInPlace: fft1dInPlace,
    dftDirect: dftDirect,
    fft2d: fft2d,
    fftShift2d: fftShift2d,
    shiftComplex: shiftComplex,
    WINDOWS: WINDOWS,
    makeSignal1d: makeSignal1d,
    spectrum1d: spectrum1d,
    circConvDirect: circConvDirect,
    circConvFft: circConvFft,
    toGrayscale: toGrayscale,
    normalizeForDisplay: normalizeForDisplay,
    butterworthLow: butterworthLow,
    butterworthHigh: butterworthHigh,
    butterworthBand: butterworthBand,
    notchMask: notchMask,
    sharpenMask: sharpenMask,
    applyMask: applyMask,
    compress: compress,
    phaseOnly: phaseOnly,
    magnitudeOnly: magnitudeOnly,
    magnitude2d: magnitude2d,
    phase2d: phase2d,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = FftCore; }

//======================================================================
// [Presets IIFE] deterministic 256x256 grayscale generators (pure; no
// canvas text rendering, so results are identical on every platform and
// testable in Node). Values in [0,255].
//======================================================================
var FftPresets = (function () {
  'use strict';
  var W = 256, H = 256;

  function pattern() {
    var g = new Float64Array(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var v = (((x >> 4) + (y >> 4)) % 2 === 0) ? 40 : 215;
      var d = Math.hypot(x - 128, y - 128);
      if (Math.abs(d - 60) < 2.5 || Math.abs(d - 92) < 2.5) v = 255;
      g[y * W + x] = v;
    }
    return g;
  }

  // 5x7 bitmap font, scaled x5 -> deterministic asymmetric "text" image
  // (the phase-only story needs an asymmetric image; validated in PV1b).
  var GLYPHS = {
    F: ['11111', '10000', '11110', '10000', '10000', '10000', '10000'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    E: ['11111', '10000', '11110', '10000', '10000', '10000', '11111']
  };
  function text() {
    var g = new Float64Array(W * H);
    g.fill(235);
    var word = 'FOURIER', scale = 5, cw = 6 * scale, x0 = Math.floor((W - word.length * cw) / 2);
    [86, 136].forEach(function (y0, row) {
      for (var li = 0; li < word.length; li++) {
        var glyph = GLYPHS[word[row === 0 ? li : word.length - 1 - li]];
        for (var gy = 0; gy < 7; gy++) for (var gx = 0; gx < 5; gx++) {
          if (glyph[gy][gx] === '1') {
            for (var sy = 0; sy < scale; sy++) for (var sx = 0; sx < scale; sx++) {
              var px = x0 + li * cw + gx * scale + sx, py = y0 + gy * scale + sy;
              if (px >= 0 && px < W && py >= 0 && py < H) g[py * W + px] = 20;
            }
          }
        }
      }
    });
    return g;
  }

  function photo() { // smooth radial vignette -- the clean notch-story base
    var g = new Float64Array(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var d = Math.hypot(x - 128, y - 128);
      g[y * W + x] = 220 - 160 * Math.min(1, d / 180);
    }
    return g;
  }

  function noise() { // photo base + sinusoidal interference (notch target)
    var g = photo();
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var v = g[y * W + x] + 25 * (Math.sin(x * 0.3) + Math.sin(y * 0.3));
      g[y * W + x] = Math.min(255, Math.max(0, v));
    }
    return g;
  }

  return { W: W, H: H, pattern: pattern, text: text, photo: photo, noise: noise };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports.FftPresets = FftPresets; }

//======================================================================
// [Shared gate] self-tests run once; both demos consult the same result.
//======================================================================
var FftDemoGate = (function () {
  'use strict';
  var cached = null;
  var C = {
    panel: 'rgba(20, 28, 40, 0.95)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderStrong: 'rgba(255, 255, 255, 0.2)',
    text: '#e8eaed',
    textDim: 'rgba(255, 255, 255, 0.7)',
    faint: 'rgba(255, 255, 255, 0.5)',
    grid: 'rgba(255, 255, 255, 0.1)',
    accent: '#66bb6a',
    signal: '#4da3ff',
    spec: '#ff7043',
    warn: '#f0ad4e',
    bad: '#e74c3c',
    canvasBg: '#0f1419'
  };
  function result() {
    if (cached === null) cached = FftCore.runSelfTests();
    return cached;
  }
  function refusalHtml(res) {
    var list = res.failures.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    return '<div style="background:' + C.panel + ';border:1px solid ' + C.bad +
      ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
      '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
      res.failures.length + ').</strong>' +
      '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render on broken mathematics.</p>' +
      '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
  }
  return { result: result, refusalHtml: refusalHtml, C: C };
})();

//======================================================================
// [1D UI IIFE] #fourier_visualizer_1d, prefix ft1-
//======================================================================
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var SEED_BASE = 20260717; // story-validated seed (core T22)

  function init() {
    var container = document.getElementById('fourier_visualizer_1d');
    if (!container) return;
    if (container.dataset.ft1Init) return; // idempotency guard
    container.dataset.ft1Init = '1';

    var gate = FftDemoGate.result();
    if (!gate.pass) { container.innerHTML = FftDemoGate.refusalHtml(gate); return; }
    var C = FftDemoGate.C;

    var state = {
      fs: 512,
      f1: 50, a1: 1.0,
      f2: 120, a2: 0.5,
      noiseAmp: 0.3,
      windowName: 'rect',
      regenCount: 0
    };

    container.innerHTML =
      '<div class="ft1-root">' +
      '<div class="ft1-hint">Two sinusoids plus Gaussian noise are summed in the time domain; the single-sided ' +
        'amplitude spectrum (bins 0&hellip;f<sub>s</sub>/2, Nyquist bin included) shows where the energy lives. ' +
        'Frequency sliders move in 0.5&nbsp;Hz steps: at a half-bin frequency the peak <em>leaks</em> into ' +
        'neighboring bins &mdash; switch the window to Hann to see the leakage collapse.</div>' +
      '<div class="ft1-canvascell">' +
        '<div class="ft1-charttitle">Time domain &mdash; first 0.125 s of the 1 s record</div>' +
        '<canvas id="ft1-time" width="760" height="210"></canvas>' +
        '<div class="ft1-caption"><span style="color:' + C.signal + ';">&#9644;</span> x(t) ' +
          '&nbsp;<span class="ft1-sub">amplitude axis fixed to &plusmn;(a&#8321;+a&#8322;+3&sigma;<sub>noise</sub>)</span></div>' +
      '</div>' +
      '<div class="ft1-canvascell">' +
        '<div class="ft1-charttitle">Frequency domain &mdash; single-sided amplitude spectrum</div>' +
        '<canvas id="ft1-freq" width="760" height="210"></canvas>' +
        '<div class="ft1-caption"><span style="color:' + C.spec + ';">&#9644;</span> A(f) &nbsp;' +
          '<span style="color:' + C.accent + ';">&#9662;</span> slider frequencies &nbsp;' +
          '<span class="ft1-sub">windowed spectra are divided by the window&rsquo;s coherent gain ' +
          '(Hann: 0.5) so an on-bin sinusoid of amplitude a reads a</span></div>' +
      '</div>' +
      '<div id="ft1-readouts" class="ft1-readouts"></div>' +
      '<div class="ft1-slidergrid">' +
        '<div class="ft1-sliderrow"><label for="ft1-f1">f&#8321; (Hz) = <span id="ft1-f1-val">50.0</span></label>' +
          '<input type="range" id="ft1-f1" min="1" max="255" step="0.5" value="50"></div>' +
        '<div class="ft1-sliderrow"><label for="ft1-a1">a&#8321; = <span id="ft1-a1-val">1.00</span></label>' +
          '<input type="range" id="ft1-a1" min="0" max="1.5" step="0.05" value="1"></div>' +
        '<div class="ft1-sliderrow"><label for="ft1-f2">f&#8322; (Hz) = <span id="ft1-f2-val">120.0</span></label>' +
          '<input type="range" id="ft1-f2" min="1" max="255" step="0.5" value="120"></div>' +
        '<div class="ft1-sliderrow"><label for="ft1-a2">a&#8322; = <span id="ft1-a2-val">0.50</span></label>' +
          '<input type="range" id="ft1-a2" min="0" max="1.5" step="0.05" value="0.5"></div>' +
        '<div class="ft1-sliderrow"><label for="ft1-noise">noise &sigma; = <span id="ft1-noise-val">0.30</span></label>' +
          '<input type="range" id="ft1-noise" min="0" max="1" step="0.05" value="0.3"></div>' +
      '</div>' +
      '<div class="ft1-btnrow">' +
        '<label class="ft1-inline">Sampling rate ' +
          '<select id="ft1-fs"><option value="512" selected>512 Hz (N = 512)</option>' +
          '<option value="1024">1024 Hz (N = 1024)</option></select></label>' +
        '<label class="ft1-inline">Window ' +
          '<select id="ft1-window"><option value="rect" selected>Rectangular</option>' +
          '<option value="hann">Hann</option></select></label>' +
        '<button id="ft1-regen" class="ft1-btn">Regenerate noise</button>' +
      '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#fourier_visualizer_1d .ft1-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#fourier_visualizer_1d .ft1-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.5;}' +
      '#fourier_visualizer_1d .ft1-canvascell{width:100%;}' +
      '#fourier_visualizer_1d canvas{width:100%;height:auto;background:' + C.canvasBg + ';border:1px solid ' + C.border + ';border-radius:4px;display:block;}' +
      '#fourier_visualizer_1d .ft1-charttitle{font-size:0.86rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:5px;}' +
      '#fourier_visualizer_1d .ft1-caption{font-size:0.78rem;color:' + C.faint + ';margin-top:5px;line-height:1.5;}' +
      '#fourier_visualizer_1d .ft1-sub{color:' + C.faint + ';}' +
      '#fourier_visualizer_1d .ft1-readouts{font-size:0.9rem;line-height:1.65;background:rgba(255,255,255,0.03);' +
        'border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;}' +
      '#fourier_visualizer_1d .ft1-slidergrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:6px 16px;}' +
      '#fourier_visualizer_1d .ft1-sliderrow label{display:block;font-size:0.82rem;color:' + C.textDim + ';margin-bottom:1px;font-weight:bold;}' +
      '#fourier_visualizer_1d .ft1-sliderrow input{width:100%;accent-color:' + C.accent + ';}' +
      '#fourier_visualizer_1d .ft1-btnrow{display:flex;flex-wrap:wrap;gap:14px;align-items:center;}' +
      '#fourier_visualizer_1d .ft1-inline{font-size:0.85rem;color:' + C.textDim + ';display:flex;gap:6px;align-items:center;}' +
      '#fourier_visualizer_1d select{background:rgba(255,255,255,0.06);color:' + C.text + ';border:1px solid ' + C.borderStrong + ';border-radius:4px;padding:4px 6px;}' +
      '#fourier_visualizer_1d .ft1-btn{padding:7px 14px;border:1px solid ' + C.borderStrong + ';border-radius:4px;' +
        'background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.85rem;}' +
      '#fourier_visualizer_1d .ft1-btn:hover{background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);}' +
      '#fourier_visualizer_1d .ft1-warn{color:' + C.warn + ';}';
    document.head.appendChild(style);

    var el = {
      f1: document.getElementById('ft1-f1'), a1: document.getElementById('ft1-a1'),
      f2: document.getElementById('ft1-f2'), a2: document.getElementById('ft1-a2'),
      noise: document.getElementById('ft1-noise'),
      fs: document.getElementById('ft1-fs'), win: document.getElementById('ft1-window'),
      regen: document.getElementById('ft1-regen'),
      timeCv: document.getElementById('ft1-time'), freqCv: document.getElementById('ft1-freq'),
      readouts: document.getElementById('ft1-readouts')
    };

    function fmt(v, d) { return Number(v).toFixed(d); }

    function compute() {
      var sig = FftCore.makeSignal1d({
        fs: state.fs, n: state.fs,
        comps: [{ f: state.f1, a: state.a1 }, { f: state.f2, a: state.a2 }],
        noiseAmp: state.noiseAmp, seed: SEED_BASE + state.regenCount
      });
      var sp = FftCore.spectrum1d(sig.x, state.fs, state.windowName);
      return { sig: sig, sp: sp };
    }

    // nearest-bin amplitude readout for a slider frequency
    function binAmp(sp, f) {
      var n = state.fs; // bin spacing fs/n = 1 Hz here
      var k = Math.round(f * n / state.fs);
      k = Math.max(0, Math.min(sp.amp.length - 1, k));
      return { k: k, amp: sp.amp[k], freq: sp.freq[k] };
    }

    var PADL = 46, PADR = 12, PADT = 10, PADB = 26;

    function drawAxesBox(ctx, w, h) {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(PADL, PADT, w - PADL - PADR, h - PADT - PADB);
    }

    function drawTime(sig) {
      var cv = el.timeCv, ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      drawAxesBox(ctx, w, h);
      var nShow = Math.floor(state.fs / 8); // fixed 0.125 s window
      var yMax = Math.max(0.5, state.a1 + state.a2 + 3 * state.noiseAmp);
      var pw = w - PADL - PADR, ph = h - PADT - PADB, midY = PADT + ph / 2;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = C.faint;
      // y ticks
      [-yMax, 0, yMax].forEach(function (v) {
        var y = midY - (v / yMax) * (ph / 2);
        ctx.fillText(fmt(v, 1), 8, y + 4);
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(PADL, y); ctx.lineTo(w - PADR, y); ctx.stroke();
      });
      // x ticks every 25 ms
      for (var ms = 0; ms <= 125; ms += 25) {
        var x = PADL + (ms / 125) * pw;
        ctx.fillText(ms + ' ms', x - 12, h - 8);
      }
      ctx.strokeStyle = C.signal;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var i = 0; i < nShow; i++) {
        var x2 = PADL + (i / (nShow - 1)) * pw;
        var y2 = midY - (sig.x[i] / yMax) * (ph / 2);
        y2 = Math.max(PADT, Math.min(PADT + ph, y2));
        if (i === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    function drawFreq(sp) {
      var cv = el.freqCv, ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      drawAxesBox(ctx, w, h);
      var nyq = state.fs / 2;
      var aMax = Math.max(0.5, state.a1, state.a2) * 1.15;
      var pw = w - PADL - PADR, ph = h - PADT - PADB, y0 = PADT + ph;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = C.faint;
      [0.5, 1.0, 1.5].forEach(function (v) {
        if (v > aMax) return;
        var y = y0 - (v / aMax) * ph;
        ctx.fillText(fmt(v, 1), 14, y + 4);
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(PADL, y); ctx.lineTo(w - PADR, y); ctx.stroke();
      });
      var tickStep = state.fs === 512 ? 50 : 100;
      for (var f = 0; f <= nyq; f += tickStep) {
        var x = PADL + (f / nyq) * pw;
        ctx.fillText(String(f), x - 8, h - 8);
      }
      ctx.fillText('Hz', w - PADR - 16, h - 8);
      // slider frequency markers
      ctx.fillStyle = C.accent;
      [state.f1, state.f2].forEach(function (fm) {
        var x = PADL + (fm / nyq) * pw;
        ctx.beginPath();
        ctx.moveTo(x - 4, PADT + 2); ctx.lineTo(x + 4, PADT + 2); ctx.lineTo(x, PADT + 9);
        ctx.closePath(); ctx.fill();
      });
      ctx.strokeStyle = C.spec;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var k = 0; k < sp.amp.length; k++) {
        var x3 = PADL + (sp.freq[k] / nyq) * pw;
        var y3 = y0 - Math.min(1, sp.amp[k] / aMax) * ph;
        if (k === 0) ctx.moveTo(x3, y3); else ctx.lineTo(x3, y3);
      }
      ctx.stroke();
    }

    function renderReadouts(sp) {
      var b1 = binAmp(sp, state.f1), b2 = binAmp(sp, state.f2);
      var offBin1 = Math.abs(state.f1 - Math.round(state.f1)) > 1e-9;
      var offBin2 = Math.abs(state.f2 - Math.round(state.f2)) > 1e-9;
      var html =
        'nearest-bin amplitudes: ' +
        'A(' + fmt(b1.freq, 0) + ' Hz) = <strong>' + fmt(b1.amp, 3) + '</strong> (a&#8321; = ' + fmt(state.a1, 2) + ')' +
        ' &nbsp;|&nbsp; A(' + fmt(b2.freq, 0) + ' Hz) = <strong>' + fmt(b2.amp, 3) + '</strong> (a&#8322; = ' + fmt(state.a2, 2) + ')' +
        ' &nbsp;|&nbsp; window: ' + (state.windowName === 'hann' ? 'Hann' : 'Rectangular') +
        ' &nbsp;|&nbsp; noise seed #' + state.regenCount;
      if (offBin1 || offBin2) {
        html += '<br><span class="ft1-warn">off-bin frequency: the peak straddles two bins, so the nearest-bin readout ' +
          'under-reads the true amplitude (scalloping) and energy leaks along the whole axis' +
          (state.windowName === 'rect' ? ' &mdash; switch to the Hann window to confine the leakage' : '') + '.</span>';
      }
      el.readouts.innerHTML = html;
    }

    function update() {
      document.getElementById('ft1-f1-val').textContent = fmt(state.f1, 1);
      document.getElementById('ft1-a1-val').textContent = fmt(state.a1, 2);
      document.getElementById('ft1-f2-val').textContent = fmt(state.f2, 1);
      document.getElementById('ft1-a2-val').textContent = fmt(state.a2, 2);
      document.getElementById('ft1-noise-val').textContent = fmt(state.noiseAmp, 2);
      var r = compute();
      drawTime(r.sig);
      drawFreq(r.sp);
      renderReadouts(r.sp);
    }

    el.f1.addEventListener('input', function () { state.f1 = parseFloat(el.f1.value); update(); });
    el.a1.addEventListener('input', function () { state.a1 = parseFloat(el.a1.value); update(); });
    el.f2.addEventListener('input', function () { state.f2 = parseFloat(el.f2.value); update(); });
    el.a2.addEventListener('input', function () { state.a2 = parseFloat(el.a2.value); update(); });
    el.noise.addEventListener('input', function () { state.noiseAmp = parseFloat(el.noise.value); update(); });
    el.win.addEventListener('change', function () { state.windowName = el.win.value; update(); });
    el.fs.addEventListener('change', function () {
      state.fs = parseInt(el.fs.value, 10);
      var nyqMax = state.fs / 2 - 1;
      el.f1.max = nyqMax; el.f2.max = nyqMax;
      if (state.f1 > nyqMax) { state.f1 = nyqMax; el.f1.value = nyqMax; }
      if (state.f2 > nyqMax) { state.f2 = nyqMax; el.f2.value = nyqMax; }
      update();
    });
    el.regen.addEventListener('click', function () { state.regenCount += 1; update(); });

    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

//======================================================================
// [2D UI IIFE] #fourier_visualizer_2d, prefix ft2-
//======================================================================
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var W = 256, H = 256, N = W * H;

  function init() {
    var container = document.getElementById('fourier_visualizer_2d');
    if (!container) return;
    if (container.dataset.ft2Init) return; // idempotency guard
    container.dataset.ft2Init = '1';

    var gate = FftDemoGate.result();
    if (!gate.pass) { container.innerHTML = FftDemoGate.refusalHtml(gate); return; }
    var C = FftDemoGate.C;

    var state = {
      gray: null,          // current grayscale image (Float64Array)
      F: null,             // its unshifted spectrum
      magShifted: null,    // shifted magnitude (display + notch input)
      phaseShifted: null,
      op: 'none',
      lowRadius: 30, highRadius: 10, bandInner: 10, bandOuter: 50,
      keepPct: 10, sharpenAlpha: 0.5,
      logScale: true, showPhase: false, showFilter: false,
      customMask: null,    // Float64Array in shifted coords, 0 = suppressed
      fftMs: 0
    };
    var SHARPEN_SIGMA = 30; // fixed, disclosed in caption

    container.innerHTML =
      '<div class="ft2-root">' +
      '<div class="ft2-hint">The image is converted to luminance (grayscale), transformed with the 2D FFT, ' +
        'reshaped in the frequency domain by the selected operation, and inverse-transformed. ' +
        'By the Convolution Theorem, every multiplicative mask below is a convolution in image space. ' +
        'For the phase / magnitude experiment, the <em>Text</em> image is the most telling &mdash; ' +
        'phase-only keeps the letter outlines, magnitude-only loses them entirely.</div>' +
      '<div class="ft2-layout">' +
      '<div class="ft2-controls">' +
        '<div class="ft2-group"><div class="ft2-grouptitle">Image</div>' +
          '<div class="ft2-btnrow">' +
          '<button class="ft2-btn ft2-preset" data-preset="pattern">Pattern</button>' +
          '<button class="ft2-btn ft2-preset" data-preset="text">Text</button>' +
          '<button class="ft2-btn ft2-preset" data-preset="photo">Photo</button>' +
          '<button class="ft2-btn ft2-preset" data-preset="noise">Photo + interference</button>' +
          '</div>' +
          '<input type="file" id="ft2-upload" accept="image/*" style="display:none;">' +
          '<button class="ft2-btn" id="ft2-uploadbtn">Upload image&hellip;</button>' +
        '</div>' +
        '<div class="ft2-group"><div class="ft2-grouptitle">Operation (one at a time)</div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="none" id="ft2-op-none" checked><label for="ft2-op-none">None (identity)</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="lowpass" id="ft2-op-low"><label for="ft2-op-low">Low-pass (blur)</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="highpass" id="ft2-op-high"><label for="ft2-op-high">High-pass (edges)</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="bandpass" id="ft2-op-band"><label for="ft2-op-band">Band-pass</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="notch" id="ft2-op-notch"><label for="ft2-op-notch">Notch (auto-remove periodic interference)</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="custom" id="ft2-op-custom"><label for="ft2-op-custom">Custom mask (draw on the spectrum)</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="compress" id="ft2-op-comp"><label for="ft2-op-comp">Compression (keep top-k coefficients)</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="sharpen" id="ft2-op-sharp"><label for="ft2-op-sharp">Sharpen (high-frequency emphasis)</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="phaseonly" id="ft2-op-phase"><label for="ft2-op-phase">Phase-only reconstruction</label></div>' +
          '<div class="ft2-radio"><input type="radio" name="ft2-op" value="magonly" id="ft2-op-mag"><label for="ft2-op-mag">Magnitude-only reconstruction</label></div>' +
        '</div>' +
        '<div class="ft2-group" id="ft2-params">' +
          '<div class="ft2-param" id="ft2-p-low"><label>Cutoff radius = <span id="ft2-low-val">30</span></label>' +
            '<input type="range" id="ft2-low" min="5" max="100" value="30"></div>' +
          '<div class="ft2-param" id="ft2-p-high"><label>Cutoff radius = <span id="ft2-high-val">10</span></label>' +
            '<input type="range" id="ft2-high" min="1" max="50" value="10"></div>' +
          '<div class="ft2-param" id="ft2-p-band"><label>Inner = <span id="ft2-bandin-val">10</span></label>' +
            '<input type="range" id="ft2-bandin" min="1" max="50" value="10">' +
            '<label>Outer = <span id="ft2-bandout-val">50</span></label>' +
            '<input type="range" id="ft2-bandout" min="10" max="100" value="50"></div>' +
          '<div class="ft2-param" id="ft2-p-comp"><label>Keep top <span id="ft2-keep-val">10</span>% of coefficients</label>' +
            '<input type="range" id="ft2-keep" min="1" max="100" value="10"></div>' +
          '<div class="ft2-param" id="ft2-p-sharp"><label>Emphasis &alpha; = <span id="ft2-alpha-val">0.5</span></label>' +
            '<input type="range" id="ft2-alpha" min="0" max="1" step="0.1" value="0.5"></div>' +
          '<div class="ft2-param" id="ft2-p-custom"><span class="ft2-sub">Click / drag on the magnitude spectrum to zero frequencies (shown red). ' +
            'Because the output keeps only the real part, your mask effectively acts as its centro-symmetrized average (M(k)+M(&minus;k))/2.</span><br>' +
            '<button class="ft2-btn" id="ft2-clearmask">Clear mask</button></div>' +
        '</div>' +
        '<div class="ft2-group"><div class="ft2-grouptitle">Display</div>' +
          '<div class="ft2-check"><input type="checkbox" id="ft2-log" checked><label for="ft2-log">Log-scale magnitude</label></div>' +
          '<div class="ft2-check"><input type="checkbox" id="ft2-phase"><label for="ft2-phase">Show phase spectrum</label></div>' +
          '<div class="ft2-check"><input type="checkbox" id="ft2-filter"><label for="ft2-filter">Show filter response</label></div>' +
        '</div>' +
      '</div>' +
      '<div class="ft2-visuals">' +
        '<div class="ft2-imgrow">' +
          '<div class="ft2-cell"><div class="ft2-charttitle">Original (luminance)</div><canvas id="ft2-orig" width="256" height="256"></canvas></div>' +
          '<div class="ft2-cell"><div class="ft2-charttitle">Processed</div><canvas id="ft2-proc" width="256" height="256"></canvas></div>' +
        '</div>' +
        '<div class="ft2-imgrow">' +
          '<div class="ft2-cell"><div class="ft2-charttitle">Magnitude spectrum (DC at center)</div><canvas id="ft2-mag" width="256" height="256"></canvas></div>' +
          '<div class="ft2-cell" id="ft2-phasecell" style="display:none;"><div class="ft2-charttitle">Phase spectrum</div><canvas id="ft2-phasecv" width="256" height="256"></canvas></div>' +
          '<div class="ft2-cell" id="ft2-filtercell" style="display:none;"><div class="ft2-charttitle" id="ft2-filtertitle">Filter response H</div><canvas id="ft2-filtercv" width="256" height="256"></canvas></div>' +
        '</div>' +
        '<div class="ft2-caption">Sharpen uses H = 1 + &alpha;(1 &minus; e<sup>&minus;d&sup2;/2&sigma;&sup2;</sup>) with &sigma; = 30. ' +
          'Processed pixels are affine-mapped [min, max] &rarr; [0, 255] for display; the actual range is shown below. ' +
          'The magnitude display normalizes contrast with the DC bin excluded from the color scale (display only).</div>' +
        '<div id="ft2-readouts" class="ft2-readouts"></div>' +
      '</div>' +
      '</div></div>';

    var style = document.createElement('style');
    style.textContent =
      '#fourier_visualizer_2d .ft2-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#fourier_visualizer_2d .ft2-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.5;}' +
      '#fourier_visualizer_2d .ft2-layout{display:grid;grid-template-columns:1fr;gap:16px;}' +
      '@media (min-width: 992px){#fourier_visualizer_2d .ft2-layout{grid-template-columns:300px 1fr;}}' +
      '#fourier_visualizer_2d .ft2-controls{display:flex;flex-direction:column;gap:12px;}' +
      '#fourier_visualizer_2d .ft2-group{border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;background:rgba(255,255,255,0.02);}' +
      '#fourier_visualizer_2d .ft2-grouptitle{color:' + C.accent + ';font-size:0.9rem;font-weight:600;margin-bottom:8px;}' +
      '#fourier_visualizer_2d .ft2-btnrow{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}' +
      '#fourier_visualizer_2d .ft2-btn{padding:6px 10px;border:1px solid ' + C.borderStrong + ';border-radius:4px;' +
        'background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.8rem;}' +
      '#fourier_visualizer_2d .ft2-btn:hover{background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);}' +
      '#fourier_visualizer_2d .ft2-radio,#fourier_visualizer_2d .ft2-check{display:flex;gap:8px;align-items:center;margin-bottom:6px;}' +
      '#fourier_visualizer_2d .ft2-radio label,#fourier_visualizer_2d .ft2-check label{color:rgba(255,255,255,0.85);font-size:0.85rem;cursor:pointer;}' +
      '#fourier_visualizer_2d input[type=radio],#fourier_visualizer_2d input[type=checkbox]{accent-color:' + C.accent + ';}' +
      '#fourier_visualizer_2d .ft2-param{display:none;margin-bottom:8px;}' +
      '#fourier_visualizer_2d .ft2-param label{display:block;font-size:0.82rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:2px;}' +
      '#fourier_visualizer_2d .ft2-param input[type=range]{width:100%;accent-color:' + C.accent + ';}' +
      '#fourier_visualizer_2d .ft2-visuals{display:flex;flex-direction:column;gap:10px;min-width:0;}' +
      '#fourier_visualizer_2d .ft2-imgrow{display:flex;flex-wrap:wrap;gap:12px;}' +
      '#fourier_visualizer_2d .ft2-cell{flex:1;min-width:200px;max-width:300px;}' +
      '#fourier_visualizer_2d canvas{width:100%;height:auto;background:' + C.canvasBg + ';border:1px solid ' + C.borderStrong + ';border-radius:4px;display:block;}' +
      '#fourier_visualizer_2d #ft2-mag{cursor:crosshair;}' +
      '#fourier_visualizer_2d .ft2-charttitle{font-size:0.82rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:4px;}' +
      '#fourier_visualizer_2d .ft2-caption{font-size:0.78rem;color:' + C.faint + ';line-height:1.5;}' +
      '#fourier_visualizer_2d .ft2-sub{font-size:0.8rem;color:' + C.faint + ';}' +
      '#fourier_visualizer_2d .ft2-readouts{font-size:0.88rem;line-height:1.6;background:rgba(255,255,255,0.03);' +
        'border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;}' +
      '#fourier_visualizer_2d .ft2-warn{color:' + C.warn + ';}';
    document.head.appendChild(style);

    var cv = {
      orig: document.getElementById('ft2-orig'),
      proc: document.getElementById('ft2-proc'),
      mag: document.getElementById('ft2-mag'),
      phase: document.getElementById('ft2-phasecv'),
      filter: document.getElementById('ft2-filtercv')
    };
    var readoutsEl = document.getElementById('ft2-readouts');

    function paintGray(canvas, values, mapInfo) {
      var ctx = canvas.getContext('2d');
      var img = ctx.createImageData(W, H);
      for (var i = 0; i < N; i++) {
        var v = values[i];
        img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
      }
      if (mapInfo && mapInfo.maskOverlay) {
        for (i = 0; i < N; i++) {
          if (mapInfo.maskOverlay[i] === 0) {
            img.data[i * 4] = 255; img.data[i * 4 + 1] = 40; img.data[i * 4 + 2] = 40;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    function setImage(gray) {
      state.gray = gray;
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      state.F = FftCore.fft2d(gray, new Float64Array(N), W, H, false);
      var t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      state.fftMs = Math.max(0, Math.round(t1 - t0));
      state.magShifted = FftCore.fftShift2d(FftCore.magnitude2d(state.F), W, H);
      state.phaseShifted = FftCore.fftShift2d(FftCore.phase2d(state.F), W, H);
      state.customMask = null;
      var disp = FftCore.normalizeForDisplay(gray);
      paintGray(cv.orig, disp.pixels);
      render();
    }

    function currentMask() { // shifted coords; null when the op is not mask-based
      switch (state.op) {
        case 'lowpass': return FftCore.butterworthLow(W, H, state.lowRadius);
        case 'highpass': return FftCore.butterworthHigh(W, H, state.highRadius);
        case 'bandpass': return FftCore.butterworthBand(W, H, state.bandInner, state.bandOuter);
        case 'notch': return FftCore.notchMask(state.magShifted, W, H, {});
        case 'sharpen': return FftCore.sharpenMask(W, H, state.sharpenAlpha, SHARPEN_SIGMA);
        case 'custom':
          if (!state.customMask) { var m = new Float64Array(N); m.fill(1); return m; }
          return state.customMask;
        default: return null;
      }
    }

    function render() {
      var mask = currentMask();
      var out, extra = '';
      if (state.op === 'compress') {
        var res = FftCore.compress(state.F, W, H, state.keepPct / 100);
        out = res.image;
        extra = 'kept <strong>' + res.keptCount + '</strong> / ' + N + ' coefficients (' + state.keepPct +
          '%) carrying <strong>' + (100 * res.energyFrac).toFixed(2) + '%</strong> of the spectral energy' +
          ' &mdash; the discarded remainder <em>is</em> the squared reconstruction error (Parseval)';
      } else if (state.op === 'phaseonly') {
        out = FftCore.phaseOnly(state.F, W, H);
        extra = 'all magnitudes replaced by 1; total image energy is exactly 1 (Parseval), so the display stretch below does all the visual work';
      } else if (state.op === 'magonly') {
        out = FftCore.magnitudeOnly(state.F, W, H);
        extra = 'all phases replaced by 0; the result is necessarily centrosymmetric &mdash; spatial layout is gone';
      } else if (mask) {
        out = FftCore.applyMask(state.F, mask, W, H);
        if (state.op === 'notch') {
          var suppressed = 0;
          for (var i = 0; i < N; i++) if (mask[i] < 0.5) suppressed++;
          extra = 'suppressed <strong>' + suppressed + '</strong> frequency-domain pixels (spikes above the 99.7th magnitude percentile, DC protected)';
          if (state.gray && isPatternLike()) {
            extra += '<br><span class="ft2-warn">note: a genuinely periodic image (like the checkerboard) also produces spectral spikes &mdash; the notch cannot tell your pattern from interference and will eat both.</span>';
          }
        }
      } else {
        out = state.gray;
      }

      var disp = FftCore.normalizeForDisplay(out);
      paintGray(cv.proc, disp.pixels);

      // magnitude spectrum display (+ custom-mask overlay)
      var magDisp = new Float64Array(N);
      for (var j = 0; j < N; j++) magDisp[j] = state.logScale ? Math.log(1 + state.magShifted[j]) : state.magShifted[j];
      // exclude DC from the display scale for contrast (display-only, disclosed)
      var dcIdx = (H / 2) * W + (W / 2), saved = magDisp[dcIdx];
      magDisp[dcIdx] = 0;
      var mmax = 0;
      for (j = 0; j < N; j++) if (magDisp[j] > mmax) mmax = magDisp[j];
      magDisp[dcIdx] = saved;
      var magPix = new Uint8ClampedArray(N);
      for (j = 0; j < N; j++) magPix[j] = Math.min(255, Math.round(255 * magDisp[j] / (mmax || 1)));
      paintGray(cv.mag, magPix, { maskOverlay: state.op === 'custom' ? state.customMask : null });

      if (state.showPhase) {
        var phPix = new Uint8ClampedArray(N);
        for (j = 0; j < N; j++) phPix[j] = Math.round((state.phaseShifted[j] + Math.PI) / (2 * Math.PI) * 255);
        paintGray(cv.phase, phPix);
      }
      if (state.showFilter) {
        var ftitle = document.getElementById('ft2-filtertitle');
        if (mask || state.op === 'none') {
          ftitle.textContent = 'Filter response H';
          var fm = mask;
          if (!fm) { fm = new Float64Array(N); fm.fill(1); } // identity: H = 1 honestly
          var fmax = 0;
          for (j = 0; j < N; j++) if (fm[j] > fmax) fmax = fm[j];
          var fPix = new Uint8ClampedArray(N);
          for (j = 0; j < N; j++) fPix[j] = Math.round(255 * fm[j] / (fmax || 1));
          paintGray(cv.filter, fPix);
        } else {
          // compression / phase-only / magnitude-only are not multiplicative
          // masks; displaying H = 1 here would misstate the operation.
          ftitle.textContent = 'Filter response \u2014 not a mask operation';
          var naPix = new Uint8ClampedArray(N); naPix.fill(40);
          paintGray(cv.filter, naPix);
        }
      }

      var rangeStr = disp.ok
        ? 'display map: [' + disp.min.toFixed(1) + ', ' + disp.max.toFixed(1) + '] &rarr; [0, 255]'
        : '<span class="ft2-warn">constant output &mdash; no contrast stretch is possible; shown mid-gray</span>';
      readoutsEl.innerHTML =
        '256&times;256 luminance &nbsp;|&nbsp; 2D FFT: ' + state.fftMs + ' ms &nbsp;|&nbsp; ' + rangeStr +
        (extra ? '<br>' + extra : '');
    }

    function isPatternLike() { // heuristic only for the honesty note; display-only
      return container.dataset.ft2Preset === 'pattern';
    }

    // ---- params visibility ----
    function showParams() {
      var map = { lowpass: 'ft2-p-low', highpass: 'ft2-p-high', bandpass: 'ft2-p-band', compress: 'ft2-p-comp', sharpen: 'ft2-p-sharp', custom: 'ft2-p-custom' };
      ['ft2-p-low', 'ft2-p-high', 'ft2-p-band', 'ft2-p-comp', 'ft2-p-sharp', 'ft2-p-custom'].forEach(function (id) {
        document.getElementById(id).style.display = (map[state.op] === id) ? 'block' : 'none';
      });
    }

    // ---- wiring ----
    container.querySelectorAll('.ft2-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.dataset.ft2Preset = btn.dataset.preset;
        setImage(FftPresets[btn.dataset.preset]());
      });
    });
    document.getElementById('ft2-uploadbtn').addEventListener('click', function () {
      document.getElementById('ft2-upload').click();
    });
    document.getElementById('ft2-upload').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); };
      img.onload = function () {
        var tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        var tctx = tmp.getContext('2d');
        tctx.drawImage(img, 0, 0, W, H);
        var rgba = tctx.getImageData(0, 0, W, H).data;
        container.dataset.ft2Preset = 'upload';
        setImage(FftCore.toGrayscale(rgba, N));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

    container.querySelectorAll('input[name="ft2-op"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.op = radio.value;
        showParams();
        render();
      });
    });

    function bindRange(id, valId, key, fmtFn) {
      var input = document.getElementById(id);
      input.addEventListener('input', function () {
        state[key] = parseFloat(input.value);
        document.getElementById(valId).textContent = fmtFn ? fmtFn(state[key]) : String(state[key]);
        render();
      });
    }
    bindRange('ft2-low', 'ft2-low-val', 'lowRadius');
    bindRange('ft2-high', 'ft2-high-val', 'highRadius');
    bindRange('ft2-bandin', 'ft2-bandin-val', 'bandInner');
    bindRange('ft2-bandout', 'ft2-bandout-val', 'bandOuter');
    bindRange('ft2-keep', 'ft2-keep-val', 'keepPct');
    bindRange('ft2-alpha', 'ft2-alpha-val', 'sharpenAlpha', function (v) { return v.toFixed(1); });

    document.getElementById('ft2-log').addEventListener('change', function (e) { state.logScale = e.target.checked; render(); });
    document.getElementById('ft2-phase').addEventListener('change', function (e) {
      state.showPhase = e.target.checked;
      document.getElementById('ft2-phasecell').style.display = state.showPhase ? 'block' : 'none';
      render();
    });
    document.getElementById('ft2-filter').addEventListener('change', function (e) {
      state.showFilter = e.target.checked;
      document.getElementById('ft2-filtercell').style.display = state.showFilter ? 'block' : 'none';
      render();
    });

    // custom-mask drawing
    var drawing = false;
    function maskAt(e) {
      var rect = cv.mag.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) * (W / Math.max(1, rect.width)));
      var y = Math.floor((e.clientY - rect.top) * (H / Math.max(1, rect.height)));
      if (!state.customMask) { state.customMask = new Float64Array(N); state.customMask.fill(1); }
      var r = 8;
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        if (dx * dx + dy * dy <= r * r) state.customMask[ny * W + nx] = 0;
      }
      if (state.op !== 'custom') {
        state.op = 'custom';
        document.getElementById('ft2-op-custom').checked = true;
        showParams();
      }
      render();
    }
    cv.mag.addEventListener('mousedown', function (e) { drawing = true; maskAt(e); });
    cv.mag.addEventListener('mousemove', function (e) { if (drawing) maskAt(e); });
    ['mouseup', 'mouseleave'].forEach(function (ev) { cv.mag.addEventListener(ev, function () { drawing = false; }); });
    document.getElementById('ft2-clearmask').addEventListener('click', function () {
      state.customMask = null;
      render();
    });

    // boot
    container.dataset.ft2Preset = 'pattern';
    setImage(FftPresets.pattern());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();