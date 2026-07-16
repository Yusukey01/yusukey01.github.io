// ============================================================================
// OrthCore — math core for the Orthogonality Visualizer (linalg-7)
// DOM-free, Node-requirable. Vectors are plain arrays [x,y] or [x,y,z];
// every routine is dimension-generic unless named *3. All displayed values
// (inner products, projections, residuals, GS steps, Gram matrices,
// conditioning) are computed HERE and certified by runSelfTests(); the two
// UI layers (2D canvas, 3D three.js) only render what this core returns.
// ============================================================================
var OrthCore = (function () {
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

  // ---------- basic vector operations (any dimension) ----------
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
  function add(u, v) {
    var r = new Array(u.length);
    for (var i = 0; i < u.length; i++) r[i] = u[i] + v[i];
    return r;
  }
  function sub(u, v) {
    var r = new Array(u.length);
    for (var i = 0; i < u.length; i++) r[i] = u[i] - v[i];
    return r;
  }
  function zeros(n) {
    var r = new Array(n);
    for (var i = 0; i < n; i++) r[i] = 0;
    return r;
  }

  function normalize(v) {
    var n = norm(v);
    if (n <= 1e-12) return { ok: false };
    return { ok: true, u: scale(v, 1 / n) };
  }

  // angle between two nonzero vectors
  function angleBetween(u, v) {
    var nu = norm(u), nv = norm(v);
    if (nu <= 1e-12 || nv <= 1e-12) return { ok: false };
    var c = dot(u, v) / (nu * nv);
    if (c > 1) c = 1; if (c < -1) c = -1;
    return { ok: true, cos: c, deg: Math.acos(c) * 180 / Math.PI };
  }

  // ---------- projection onto a single vector ----------
  // proj_u(y) = (y.u / u.u) u ; undefined for u ~ 0 (reported, never silent 0)
  function projOnto(y, u) {
    var uu = dot(u, u);
    if (uu <= 1e-24) return { ok: false };
    var c = dot(y, u) / uu;
    var p = scale(u, c);
    return { ok: true, coeff: c, p: p, z: sub(y, p) };
  }

  // ---------- 3D cross product (right-handed: e1 x e2 = e3) ----------
  function cross3(a, b) {
    return [a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]];
  }

  // ---------- projection onto the plane W = Span{v1, v2} in R^3 ----------
  // Route: n = v1 x v2; z = proj_n(y) (component orthogonal to W);
  // yhat = y - z. Fails if v1, v2 are (nearly) dependent, since then W is
  // not a plane. yhat + z = y by construction; yhat . n = 0 is certified.
  function projOntoPlane3(y, v1, v2) {
    var n = cross3(v1, v2);
    var nn = dot(n, n);
    var s = norm(v1) * norm(v2);
    if (s <= 1e-12 || Math.sqrt(nn) <= 1e-9 * s) return { ok: false };
    var c = dot(y, n) / nn;
    var z = scale(n, c);
    var yhat = sub(y, z);
    return { ok: true, yhat: yhat, z: z, n: n };
  }

  // ---------- Gram-Schmidt ----------
  // Returns per-step data for the UIs: for each k, the input x_k, the list
  // of projections subtracted (coefficient + vector), and the resulting v_k.
  // FAILS (ok:false, failedIndex=k) when ||v_k|| <= relTol * ||x_k|| —
  // i.e. when x_k is (numerically) dependent on the previous vectors.
  // The GS theorem requires a linearly independent input; a dependent input
  // must be reported, never silently orthogonalized into noise.
  function gramSchmidtSteps(xs) {
    var relTol = 1e-9;
    var vs = [];
    var steps = [];
    for (var k = 0; k < xs.length; k++) {
      var x = xs[k];
      var v = x.slice();
      var projs = [];
      for (var j = 0; j < vs.length; j++) {
        var pr = projOnto(x, vs[j]);
        // vs[j] is never ~0 here (earlier steps passed the tolerance gate)
        projs.push({ onto: j, coeff: pr.coeff, p: pr.p });
        v = sub(v, pr.p);
      }
      var nx = norm(x);
      if (norm(v) <= relTol * (nx > 0 ? nx : 1)) {
        return { ok: false, failedIndex: k, vs: vs, steps: steps };
      }
      vs.push(v);
      steps.push({ x: x.slice(), projs: projs, v: v.slice() });
    }
    return { ok: true, vs: vs, steps: steps };
  }

  function orthonormalize(xs) {
    var gs = gramSchmidtSteps(xs);
    if (!gs.ok) return { ok: false, failedIndex: gs.failedIndex };
    var us = [];
    for (var i = 0; i < gs.vs.length; i++) {
      var nr = normalize(gs.vs[i]);
      if (!nr.ok) return { ok: false, failedIndex: i };
      us.push(nr.u);
    }
    return { ok: true, us: us, vs: gs.vs, steps: gs.steps };
  }

  // ---------- Gram matrix G_ij = v_i . v_j ----------
  function gramMatrix(vs) {
    var G = [];
    for (var i = 0; i < vs.length; i++) {
      G.push([]);
      for (var j = 0; j < vs.length; j++) G[i].push(dot(vs[i], vs[j]));
    }
    return G;
  }

  function detK(M) {
    if (M.length === 1) return M[0][0];
    if (M.length === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
    return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
         - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
         + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  }

  // ---------- conditioning: normalized k-volume in [0,1] ----------
  // sqrt(det Gram(xs)) / prod ||x_i||. Equals |sin(angle)| for two vectors;
  // 1 for an orthonormal-direction set; 0 for a dependent set.
  function conditioning(xs) {
    var prod = 1;
    for (var i = 0; i < xs.length; i++) {
      var n = norm(xs[i]);
      if (n <= 1e-12) return 0;
      prod *= n;
    }
    var d = detK(gramMatrix(xs));
    if (d < 0) d = 0; // float noise below zero
    return Math.sqrt(d) / prod;
  }

  // ---------- seeded random well-conditioned vector sets ----------
  // k vectors in R^dim, entries on a 0.5 grid in [-4.5, 4.5], each with
  // norm >= 1.5, and conditioning >= 0.3 (checked AFTER grid rounding).
  function randomVectorSet(rng, k, dim) {
    for (var attempt = 0; attempt < 1000; attempt++) {
      var xs = [];
      var okNorm = true;
      for (var i = 0; i < k; i++) {
        var v = [];
        for (var d = 0; d < dim; d++) {
          v.push(Math.round((9 * rng() - 4.5) * 2) / 2);
        }
        if (norm(v) < 1.5) { okNorm = false; }
        xs.push(v);
      }
      if (!okNorm) continue;
      if (conditioning(xs) >= 0.3) return xs;
    }
    // deterministic fallback (never reached in practice)
    return k === 2 ? [[3, 0], [0, 3]] : [[3, 0, 0], [0, 3, 0], [0, 0, 3]];
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
      if (u.length !== v.length) return false;
      for (var i = 0; i < u.length; i++) if (Math.abs(u[i] - v[i]) > tol) return false;
      return true;
    }
    function randVec(rng, dim, r) {
      var v = [];
      for (var i = 0; i < dim; i++) v.push(2 * r * rng() - r);
      return v;
    }

    // ---- T1: basic ops pins ----
    check('T1 dot pin', dot([1, 2, 3], [4, -5, 6]) === 12);
    check('T1 dot 2D pin', dot([3, 4], [4, -3]) === 0);
    check('T1 norm 3-4-5', norm([3, 4]) === 5);
    check('T1 add pin', vClose(add([1, 2], [3, -4]), [4, -2], 0));
    check('T1 sub pin', vClose(sub([1, 2], [3, -4]), [-2, 6], 0));
    check('T1 scale pin', vClose(scale([1, -2, 3], -2), [-2, 4, -6], 0));
    var nz = normalize([0, 0]);
    check('T1 normalize zero fails', nz.ok === false);
    var n34 = normalize([3, 4]);
    check('T1 normalize pin', n34.ok && vClose(n34.u, [0.6, 0.8], 1e-15));
    var ang = angleBetween([1, 0], [1, 1]);
    check('T1 angle cos pin', ang.ok && Math.abs(ang.cos - Math.SQRT1_2) <= 1e-15);
    check('T1 angle deg pin', ang.ok && Math.abs(ang.deg - 45) <= 1e-12);
    check('T1 angle zero-vector fails', angleBetween([0, 0], [1, 0]).ok === false);

    // ---- T2: projection onto a vector ----
    var p1 = projOnto([3, 4], [1, 0]);
    check('T2 pin proj (3,4) onto e1', p1.ok && vClose(p1.p, [3, 0], 0) && vClose(p1.z, [0, 4], 0));
    var p2 = projOnto([4, 0], [0, 3]);
    check('T2 pin orthogonal input -> zero proj', p2.ok && vClose(p2.p, [0, 0], 0));
    var p3 = projOnto([2, 5, -2], [-1, 0, 4]);
    check('T2 pin 3D coeff -10/17', p3.ok && Math.abs(p3.coeff - (-10 / 17)) <= 1e-15);
    check('T2 pin 3D vector', p3.ok && vClose(p3.p, [10 / 17, 0, -40 / 17], 1e-14));
    check('T2 zero target fails (no silent zero)', projOnto([1, 2], [0, 0]).ok === false);
    var rng2 = makeRng(20001);
    for (var i2 = 0; i2 < 20; i2++) {
      var dim2 = (i2 % 2 === 0) ? 2 : 3;
      var y2 = randVec(rng2, dim2, 4);
      var u2 = randVec(rng2, dim2, 4);
      if (norm(u2) < 0.5) { u2[0] += 1; }
      var pr2 = projOnto(y2, u2);
      var sc = 1 + norm(y2) * norm(u2);
      check('T2 residual orthogonal #' + i2, Math.abs(dot(pr2.z, u2)) <= 1e-12 * sc);
      var again = projOnto(pr2.p, u2);
      check('T2 idempotent #' + i2, vClose(again.p, pr2.p, 1e-12 * sc));
      check('T2 Pythagoras #' + i2,
        Math.abs(dot(y2, y2) - (dot(pr2.p, pr2.p) + dot(pr2.z, pr2.z))) <= 1e-11 * sc * sc);
      // linearity in y
      var ya = randVec(rng2, dim2, 4), yb = randVec(rng2, dim2, 4);
      var a2 = 4 * rng2() - 2, b2 = 4 * rng2() - 2;
      var lhs2 = projOnto(add(scale(ya, a2), scale(yb, b2)), u2).p;
      var rhs2 = add(scale(projOnto(ya, u2).p, a2), scale(projOnto(yb, u2).p, b2));
      check('T2 linearity #' + i2, vClose(lhs2, rhs2, 1e-10 * sc));
    }

    // ---- T3: best approximation (certificate of the page's theorem) ----
    // yhat = proj_W(y) is strictly closer to y than any other point of W.
    var rng3 = makeRng(20002);
    for (var i3 = 0; i3 < 10; i3++) {
      // line in R^2
      var y3 = randVec(rng3, 2, 4);
      var u3 = randVec(rng3, 2, 4);
      if (norm(u3) < 0.5) u3[0] += 1;
      var pr3 = projOnto(y3, u3);
      var dBest = norm(sub(y3, pr3.p));
      for (var j3 = 0; j3 < 10; j3++) {
        var t3 = pr3.coeff + (rng3() < 0.5 ? -1 : 1) * (0.05 + 3 * rng3());
        var w3 = scale(u3, t3);
        check('T3 line best-approx #' + i3 + '.' + j3, dBest < norm(sub(y3, w3)));
      }
      // plane in R^3
      var yP = randVec(rng3, 3, 4);
      var v1P = randVec(rng3, 3, 4), v2P = randVec(rng3, 3, 4);
      var g3 = 0;
      while (conditioning([v1P, v2P]) < 0.2 && g3++ < 200) { v1P = randVec(rng3, 3, 4); v2P = randVec(rng3, 3, 4); }
      check('T3 setup conditioned #' + i3, conditioning([v1P, v2P]) >= 0.2);
      var pp = projOntoPlane3(yP, v1P, v2P);
      var dBestP = norm(pp.z);
      for (var k3 = 0; k3 < 10; k3++) {
        var wP = add(scale(v1P, 6 * rng3() - 3), scale(v2P, 6 * rng3() - 3));
        if (norm(sub(wP, pp.yhat)) < 0.05) continue; // exclude w ~ yhat
        check('T3 plane best-approx #' + i3 + '.' + k3, dBestP < norm(sub(yP, wP)));
      }
    }

    // ---- T4: cross product (orientation convention pins) ----
    check('T4 e1 x e2 = e3', vClose(cross3([1, 0, 0], [0, 1, 0]), [0, 0, 1], 0));
    check('T4 e2 x e3 = e1', vClose(cross3([0, 1, 0], [0, 0, 1]), [1, 0, 0], 0));
    check('T4 e3 x e1 = e2', vClose(cross3([0, 0, 1], [1, 0, 0]), [0, 1, 0], 0));
    var rng4 = makeRng(20003);
    for (var i4 = 0; i4 < 15; i4++) {
      var a4 = randVec(rng4, 3, 4), b4 = randVec(rng4, 3, 4);
      var c4 = cross3(a4, b4);
      var s4 = 1 + norm(a4) * norm(b4);
      check('T4 anticommutative #' + i4, vClose(cross3(b4, a4), scale(c4, -1), 1e-12 * s4));
      check('T4 orthogonal to a #' + i4, Math.abs(dot(c4, a4)) <= 1e-11 * s4 * s4);
      check('T4 orthogonal to b #' + i4, Math.abs(dot(c4, b4)) <= 1e-11 * s4 * s4);
      var lag = dot(c4, c4) - (dot(a4, a4) * dot(b4, b4) - dot(a4, b4) * dot(a4, b4));
      check('T4 Lagrange identity #' + i4, Math.abs(lag) <= 1e-10 * s4 * s4 * s4 * s4);
    }

    // ---- T5: projection onto a plane ----
    var pl = projOntoPlane3([0, 0, 5], [1, 0, 0], [0, 1, 0]);
    check('T5 pin yhat', pl.ok && vClose(pl.yhat, [0, 0, 0], 0));
    check('T5 pin z', pl.ok && vClose(pl.z, [0, 0, 5], 0));
    var inPlane = projOntoPlane3(add(scale([2, 1, 0], 2), scale([0, 1, 3], -1)), [2, 1, 0], [0, 1, 3]);
    check('T5 y in plane -> z = 0', inPlane.ok && norm(inPlane.z) <= 1e-12 * 20);
    check('T5 dependent v1,v2 fails', projOntoPlane3([1, 1, 1], [1, 2, 3], [2, 4, 6]).ok === false);
    check('T5 zero v1 fails', projOntoPlane3([1, 1, 1], [0, 0, 0], [1, 0, 0]).ok === false);
    var rng5 = makeRng(20004);
    for (var i5 = 0; i5 < 20; i5++) {
      var y5 = randVec(rng5, 3, 4);
      var v15 = randVec(rng5, 3, 4), v25 = randVec(rng5, 3, 4);
      var g5 = 0;
      while (conditioning([v15, v25]) < 0.2 && g5++ < 200) { v15 = randVec(rng5, 3, 4); v25 = randVec(rng5, 3, 4); }
      check('T5 setup conditioned #' + i5, conditioning([v15, v25]) >= 0.2);
      var pp5 = projOntoPlane3(y5, v15, v25);
      var s5 = 1 + norm(y5) + norm(v15) * norm(v25);
      check('T5 yhat + z = y #' + i5, vClose(add(pp5.yhat, pp5.z), y5, 1e-12 * s5));
      check('T5 yhat in plane (yhat.n = 0) #' + i5,
        Math.abs(dot(pp5.yhat, pp5.n)) <= 1e-9 * (1 + norm(pp5.yhat)) * (1 + norm(pp5.n)));
      check('T5 z parallel to n #' + i5,
        norm(cross3(pp5.z, pp5.n)) <= 1e-9 * (1 + norm(pp5.z)) * (1 + norm(pp5.n)));
      check('T5 idempotent #' + i5,
        norm(projOntoPlane3(pp5.yhat, v15, v25).z) <= 1e-9 * (1 + norm(pp5.yhat)));
      // independent route: orthonormalize {v1,v2}, yhat = (y.u1)u1 + (y.u2)u2
      var on5 = orthonormalize([v15, v25]);
      var alt5 = add(scale(on5.us[0], dot(y5, on5.us[0])), scale(on5.us[1], dot(y5, on5.us[1])));
      check('T5 two routes agree #' + i5, vClose(alt5, pp5.yhat, 1e-9 * s5));
    }

    // ---- T6: Gram-Schmidt (page worked example = prose-consistency pins) ----
    var gsEx = gramSchmidtSteps([[1, 2, 3], [0, 1, 0], [0, 0, 1]]);
    check('T6 example ok', gsEx.ok === true);
    if (gsEx.ok) {
      check('T6 v1 = x1', vClose(gsEx.vs[0], [1, 2, 3], 0));
      check('T6 v2 pin (-1/7, 5/7, -3/7)', vClose(gsEx.vs[1], [-1 / 7, 5 / 7, -3 / 7], 1e-12));
      check('T6 v3 pin (-3/10, 0, 1/10)', vClose(gsEx.vs[2], [-0.3, 0, 0.1], 1e-12));
      check('T6 step2 coeff 2/14', Math.abs(gsEx.steps[1].projs[0].coeff - 1 / 7) <= 1e-15);
    }
    var onEx = orthonormalize([[1, 2, 3], [0, 1, 0], [0, 0, 1]]);
    var r14 = Math.sqrt(14), r35 = Math.sqrt(35), r10 = Math.sqrt(10);
    check('T6 u1 pin', onEx.ok && vClose(onEx.us[0], [1 / r14, 2 / r14, 3 / r14], 1e-12));
    check('T6 u2 pin', onEx.ok && vClose(onEx.us[1], [-1 / r35, 5 / r35, -3 / r35], 1e-12));
    check('T6 u3 pin', onEx.ok && vClose(onEx.us[2], [-3 / r10, 0, 1 / r10], 1e-12));
    // negative controls: dependent inputs MUST be flagged (v1's 3-in-R^2 bug class)
    var dep1 = gramSchmidtSteps([[1, 0], [2, 0]]);
    check('T6n dependent pair flagged', dep1.ok === false && dep1.failedIndex === 1);
    var dep2 = gramSchmidtSteps([[1, 0], [0, 1], [1, 1]]);
    check('T6n 3 vectors in R^2 flagged', dep2.ok === false && dep2.failedIndex === 2);
    var dep3 = gramSchmidtSteps([[1, 2, 3], [2, 4, 6], [0, 0, 1]]);
    check('T6n dependent 3D flagged', dep3.ok === false && dep3.failedIndex === 1);
    // float-noise dependence: v2 is ~1e-17 noise, NOT exactly 0 — tolerance is load-bearing
    var noisy = sub(scale([0.1, 0.7], 3), [0.3, 2.1]);
    check('T6n float-noise premise (residual nonzero)', norm(noisy) !== 0, norm(noisy));
    var dep4 = gramSchmidtSteps([[0.1, 0.7], [0.3, 2.1]]);
    check('T6n float-noise dependence flagged', dep4.ok === false && dep4.failedIndex === 1);
    // properties on seeded well-conditioned sets
    var rng6 = makeRng(20005);
    for (var i6 = 0; i6 < 15; i6++) {
      var k6 = (i6 % 2 === 0) ? 2 : 3;
      var dim6 = k6;
      var xs6 = randomVectorSet(rng6, k6, dim6);
      var on6 = orthonormalize(xs6);
      check('T6 random set ok #' + i6, on6.ok === true);
      if (!on6.ok) continue;
      for (var a6 = 0; a6 < k6; a6++) {
        check('T6 unit norm #' + i6 + '.' + a6, Math.abs(norm(on6.us[a6]) - 1) <= 1e-12);
        for (var b6 = a6 + 1; b6 < k6; b6++) {
          check('T6 pairwise orthogonal #' + i6 + '.' + a6 + b6,
            Math.abs(dot(on6.vs[a6], on6.vs[b6])) <= 1e-9 * (1 + norm(on6.vs[a6]) * norm(on6.vs[b6])));
        }
        // span preserved: x_a equals its expansion in {u_0..u_a}
        var rec = zeros(dim6);
        for (var c6 = 0; c6 <= a6; c6++) {
          rec = add(rec, scale(on6.us[c6], dot(xs6[a6], on6.us[c6])));
        }
        check('T6 span preserved #' + i6 + '.' + a6, vClose(rec, xs6[a6], 1e-9 * (1 + norm(xs6[a6]))));
      }
      // Gram matrix of the u's is the identity (U^T U = I enactment)
      var G6 = gramMatrix(on6.us);
      var devI = 0;
      for (var d6 = 0; d6 < k6; d6++) {
        for (var e6 = 0; e6 < k6; e6++) {
          devI = Math.max(devI, Math.abs(G6[d6][e6] - (d6 === e6 ? 1 : 0)));
        }
      }
      check('T6 Gram(us) = I #' + i6, devI <= 1e-9, devI);
    }

    // ---- T7: Gram matrix pins ----
    var G7 = gramMatrix([[1, 0], [1, 1]]);
    check('T7 pin [[1,1],[1,2]]', G7[0][0] === 1 && G7[0][1] === 1 && G7[1][0] === 1 && G7[1][1] === 2);
    var G7b = gramMatrix([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    check('T7 identity for standard basis', detK(G7b) === 1 && G7b[0][1] === 0 && G7b[1][2] === 0);
    check('T7 detK 2x2 pin', detK([[2, 1], [1, 2]]) === 3);
    check('T7 detK 3x3 pin', detK([[2, 0, 0], [0, 3, 0], [0, 0, 4]]) === 24);
    check('T7 detK 3x3 off-diagonal pin', detK([[2, 1, 0], [1, 3, 1], [0, 1, 4]]) === 18);
    check('T7 detK 3x3 sign pin', detK([[0, 1, 0], [1, 0, 0], [0, 0, 1]]) === -1);

    // ---- T8: conditioning ----
    check('T8 orthonormal -> 1', Math.abs(conditioning([[1, 0], [0, 1]]) - 1) <= 1e-12);
    check('T8 3D orthogonal -> 1', Math.abs(conditioning([[2, 0, 0], [0, 3, 0], [0, 0, 5]]) - 1) <= 1e-12);
    check('T8 dependent -> 0', conditioning([[1, 2], [2, 4]]) <= 1e-9);
    check('T8 |sin| pin (1,0),(1,1) -> 1/sqrt(2)',
      Math.abs(conditioning([[1, 0], [1, 1]]) - Math.SQRT1_2) <= 1e-12);
    check('T8 zero vector -> 0', conditioning([[0, 0], [1, 1]]) === 0);

    // ---- T9: random well-conditioned sets ----
    var rng9a = makeRng(777), rng9b = makeRng(777);
    var setA = randomVectorSet(rng9a, 3, 3), setB = randomVectorSet(rng9b, 3, 3);
    check('T9 deterministic (same seed, same set)', JSON.stringify(setA) === JSON.stringify(setB));
    // seed 11 (k=2, dim=2): the first SIX raw samples are rejected, so this
    // pin exercises the resample loop (kills a dropped-threshold mutant)
    var pinSet = randomVectorSet(makeRng(11), 2, 2);
    check('T9 resample-loop pin (seed 11)', JSON.stringify(pinSet) === '[[-0.5,3],[2.5,2.5]]');
    var rng9 = makeRng(20006);
    for (var i9 = 0; i9 < 30; i9++) {
      var k9 = (i9 % 2 === 0) ? 2 : 3;
      var xs9 = randomVectorSet(rng9, k9, k9);
      check('T9 conditioning >= 0.3 #' + i9, conditioning(xs9) >= 0.3, conditioning(xs9));
      for (var j9 = 0; j9 < k9; j9++) {
        check('T9 norm >= 1.5 #' + i9 + '.' + j9, norm(xs9[j9]) >= 1.5);
        var onGrid = true;
        for (var d9 = 0; d9 < k9; d9++) {
          if (Math.abs(xs9[j9][d9] * 2 - Math.round(xs9[j9][d9] * 2)) > 0 ||
              Math.abs(xs9[j9][d9]) > 4.5) onGrid = false;
        }
        check('T9 entries on 0.5 grid in range #' + i9 + '.' + j9, onGrid);
      }
    }

    // ---- T10: entry parsing (no silent zeros) ----
    check('T10 "2" -> 2', parseEntry('2').ok && parseEntry('2').value === 2);
    check('T10 "-0.5" -> -0.5', parseEntry('-0.5').ok && parseEntry('-0.5').value === -0.5);
    check('T10 "" rejected', parseEntry('').ok === false);
    check('T10 "-" rejected', parseEntry('-').ok === false);
    check('T10 "1,5" rejected', parseEntry('1,5').ok === false);
    check('T10 non-string rejected', parseEntry(3).ok === false);

    // ---- T11: RNG determinism ----
    var ra = makeRng(42), rb = makeRng(42), rc = makeRng(43);
    var same = true, diff = false;
    for (var i11 = 0; i11 < 10; i11++) {
      var va = ra(), vb = rb(), vc = rc();
      if (va !== vb) same = false;
      if (va !== vc) diff = true;
      if (va < 0 || va >= 1) same = false;
    }
    check('T11 same seed -> same sequence in [0,1)', same);
    check('T11 different seed -> different sequence', diff);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  return {
    makeRng: makeRng,
    dot: dot, norm: norm, scale: scale, add: add, sub: sub, zeros: zeros,
    normalize: normalize,
    angleBetween: angleBetween,
    projOnto: projOnto,
    cross3: cross3,
    projOntoPlane3: projOntoPlane3,
    gramSchmidtSteps: gramSchmidtSteps,
    orthonormalize: orthonormalize,
    gramMatrix: gramMatrix,
    detK: detK,
    conditioning: conditioning,
    randomVectorSet: randomVectorSet,
    parseEntry: parseEntry,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = OrthCore; }
// ============================================================================
// 2D UI layer — projection onto a line + Gram-Schmidt in R^2.
// Renders only what OrthCore computes. Gate: refuses to render (refusal card)
// if runSelfTests() fails OR throws. Prefix: ov-. Dark island (fixed palette).
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
    u: '#3498db',
    v: '#e74c3c',
    proj: '#ab47bc',
    resid: '#2ecc71',
    spanLine: 'rgba(231, 76, 60, 0.35)',
    orig: '#8a93a0',
    dashed: 'rgba(255, 255, 255, 0.45)',
    ortho: '#2ecc71',
    unitCircle: 'rgba(255, 200, 87, 0.35)',
    bad: '#ef5350'
  };

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }
  function fv(v, d) {
    var parts = [];
    for (var i = 0; i < v.length; i++) parts.push(fmt(v[i], d === undefined ? 2 : d));
    return '(' + parts.join(', ') + ')';
  }

  function refusalCard(container, prefixClass, failures, count) {
    var list = '';
    var shown = failures.slice(0, 10);
    for (var i = 0; i < shown.length; i++) {
      list += '<li>' + String(shown[i]).replace(/</g, '&lt;') + '</li>';
    }
    container.innerHTML =
      '<div class="' + prefixClass + '" style="background:' + C.panel + ';border:1px solid ' + C.bad +
      ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
      '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
      failures.length + (count ? ' of ' + count + ' checks' : '') + ').</strong>' +
      '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render ' +
      'rather than display incorrect mathematics. Failures:</p>' +
      '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
  }

  // Gate result is computed once and shared with the 3D layer below.
  var OV_GATE = (function () {
    try {
      return OrthCore.runSelfTests();
    } catch (e) {
      return { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown error')], count: 0 };
    }
  })();
  if (typeof window !== 'undefined') { window.__OV_GATE = OV_GATE; }

  function init() {
    var container = document.getElementById('orthogonality-visualizer');
    if (!container) return;
    if (container.dataset.ovInit) return;
    container.dataset.ovInit = '1';

    if (!OV_GATE.pass) {
      refusalCard(container, 'ov-refusal', OV_GATE.failures, OV_GATE.count);
      return;
    }

    // ---------- DOM ----------
    container.innerHTML =
      '<div class="ov-root">' +
        '<div class="ov-canvaswrap">' +
          '<select id="ov-mode" class="ov-full">' +
            '<option value="projection">Orthogonal Projection (2D)</option>' +
            '<option value="gramschmidt">Gram-Schmidt Process (2D)</option>' +
          '</select>' +
          '<div id="ov-instruction" class="ov-instruction"></div>' +
          '<canvas id="ov-canvas"></canvas>' +
          '<div id="ov-legend" class="ov-legend"></div>' +
        '</div>' +
        '<div class="ov-controls">' +
          '<div id="ov-readouts" class="ov-group ov-readouts"></div>' +
          '<div class="ov-group" id="ov-proj-controls">' +
            '<label>Vectors (editable or draggable):</label>' +
            '<div class="ov-vecrow"><span class="ov-vlab" style="color:' + C.u + ';">u =</span>' +
              '<input type="text" id="ov-ux" inputmode="decimal" aria-label="u x-component">' +
              '<input type="text" id="ov-uy" inputmode="decimal" aria-label="u y-component"></div>' +
            '<div class="ov-vecrow"><span class="ov-vlab" style="color:' + C.v + ';">v =</span>' +
              '<input type="text" id="ov-vx" inputmode="decimal" aria-label="v x-component">' +
              '<input type="text" id="ov-vy" inputmode="decimal" aria-label="v y-component"></div>' +
            '<div class="ov-hint">Invalid entries are outlined and ignored until corrected.</div>' +
            '<button id="ov-proj-reset" class="ov-secondary">Reset</button>' +
          '</div>' +
          '<div class="ov-group" id="ov-gs-controls" style="display:none;">' +
            '<button id="ov-gs-step" class="ov-primary">Next step</button>' +
            '<button id="ov-gs-new" class="ov-secondary">New example</button>' +
            '<button id="ov-gs-reset" class="ov-secondary">Reset steps</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#orthogonality-visualizer .ov-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
      '@media (min-width: 992px){#orthogonality-visualizer .ov-root{flex-direction:row;align-items:flex-start;}' +
      '#orthogonality-visualizer .ov-canvaswrap{flex:3;}#orthogonality-visualizer .ov-controls{flex:2;max-width:420px;}}' +
      '#orthogonality-visualizer .ov-canvaswrap{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#orthogonality-visualizer .ov-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';box-shadow:0 8px 32px rgba(0,0,0,0.3);}' +
      '#orthogonality-visualizer .ov-full{width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;margin-bottom:10px;}' +
      '#orthogonality-visualizer .ov-full option{background-color:#141c28;color:' + C.text + ';}' +
      '#orthogonality-visualizer .ov-instruction{color:' + C.faint + ';font-size:0.85rem;margin-bottom:8px;}' +
      '#orthogonality-visualizer #ov-canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;touch-action:none;}' +
      '#orthogonality-visualizer .ov-legend{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.85rem;color:' + C.textDim + ';}' +
      '@media (max-width: 600px){#orthogonality-visualizer .ov-legend{grid-template-columns:1fr;}}' +
      '#orthogonality-visualizer .ov-li{display:flex;align-items:center;}' +
      '#orthogonality-visualizer .ov-sw{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:2px;flex:none;}' +
      '#orthogonality-visualizer .ov-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
      '#orthogonality-visualizer .ov-group label{display:block;font-weight:bold;margin-bottom:8px;color:' + C.textDim + ';font-size:0.85rem;}' +
      '#orthogonality-visualizer .ov-readouts{font-size:0.92rem;line-height:1.55;}' +
      '#orthogonality-visualizer .ov-readouts .ov-formula{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#orthogonality-visualizer .ov-vecrow{display:flex;align-items:center;gap:8px;margin-bottom:8px;}' +
      '#orthogonality-visualizer .ov-vlab{font-family:"Courier New",monospace;font-weight:bold;min-width:34px;}' +
      '#orthogonality-visualizer .ov-vecrow input{width:60px;padding:8px;background:rgba(0,0,0,0.3);border:1px solid ' + C.borderStrong + ';border-radius:4px;text-align:center;color:' + C.text + ';font-family:"Courier New",monospace;}' +
      '#orthogonality-visualizer .ov-vecrow input:focus{border-color:' + C.accent + ';outline:none;box-shadow:0 0 0 2px rgba(100,180,255,0.2);}' +
      '#orthogonality-visualizer .ov-vecrow input.ov-invalid{border-color:' + C.bad + ';box-shadow:0 0 0 2px rgba(239,83,80,0.25);}' +
      '#orthogonality-visualizer .ov-hint{font-size:0.8rem;color:' + C.faint + ';margin-bottom:8px;}' +
      '#orthogonality-visualizer .ov-primary,#orthogonality-visualizer .ov-secondary{width:100%;padding:10px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;margin-top:6px;transition:background 0.2s;}' +
      '#orthogonality-visualizer .ov-primary{background:linear-gradient(135deg,#1565c0,#42a5f5);color:#fff;}' +
      '#orthogonality-visualizer .ov-primary:hover{background:linear-gradient(135deg,#1976d2,#64b5f6);}' +
      '#orthogonality-visualizer .ov-secondary{background:rgba(255,255,255,0.08);border:1px solid ' + C.borderStrong + ';color:' + C.text + ';}' +
      '#orthogonality-visualizer .ov-secondary:hover{background:rgba(255,255,255,0.12);}' +
      '#orthogonality-visualizer .ov-status-ok{color:' + C.ortho + ';font-weight:bold;}' +
      '#orthogonality-visualizer .ov-status-warn{color:#ffc857;font-weight:bold;}';
    document.head.appendChild(style);

    var canvas = document.getElementById('ov-canvas');
    var ctx = canvas.getContext('2d');
    var modeSel = document.getElementById('ov-mode');
    var instructionEl = document.getElementById('ov-instruction');
    var legendEl = document.getElementById('ov-legend');
    var readoutsEl = document.getElementById('ov-readouts');
    var projControls = document.getElementById('ov-proj-controls');
    var gsControls = document.getElementById('ov-gs-controls');
    var inputs = {
      ux: document.getElementById('ov-ux'), uy: document.getElementById('ov-uy'),
      vx: document.getElementById('ov-vx'), vy: document.getElementById('ov-vy')
    };
    var projResetBtn = document.getElementById('ov-proj-reset');
    var gsStepBtn = document.getElementById('ov-gs-step');
    var gsNewBtn = document.getElementById('ov-gs-new');
    var gsResetBtn = document.getElementById('ov-gs-reset');

    var U0 = [2, 4], V0 = [4, 1];
    var GS_SEED_BASE = 101;
    var state = {
      mode: 'projection',
      u: U0.slice(), v: V0.slice(),
      dragging: null,
      gsSeedOffset: 0,
      gsXs: OrthCore.randomVectorSet(OrthCore.makeRng(GS_SEED_BASE), 2, 2),
      gsStage: 0, // 0 originals, 1 v1, 2 v2, 3 normalized
      cssW: 640, cssH: 400
    };
    var GS_MAX_STAGE = 3;

    // ---------- canvas mapping (isotropic, y half-range anchored) ----------
    var VIEW_HALF_Y = 5.5;
    function view() {
      var scale = state.cssH / (2 * VIEW_HALF_Y);
      return { cx: state.cssW / 2, cy: state.cssH / 2, scale: scale,
               halfX: (state.cssW / 2) / scale, halfY: VIEW_HALF_Y };
    }
    function w2c(vw, p) { return [vw.cx + p[0] * vw.scale, vw.cy - p[1] * vw.scale]; }
    function c2w(vw, q) { return [(q[0] - vw.cx) / vw.scale, (vw.cy - q[1]) / vw.scale]; }

    function sizeCanvas() {
      var parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
      var pad = 30;
      var cssW = parentW > 0 ? Math.max(320, Math.min(760, parentW - pad)) : 640;
      var cssH = Math.round(cssW * 5 / 8);
      state.cssW = cssW; state.cssH = cssH;
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---------- drawing helpers ----------
    function seg(vw, p, q) {
      var a = w2c(vw, p), b = w2c(vw, q);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    function dashedSeg(vw, p, q, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]); seg(vw, p, q); ctx.setLineDash([]);
    }
    function arrow(vw, tip, color, label, width, handle) {
      var o = w2c(vw, [0, 0]), e = w2c(vw, tip);
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
      }
      if (label) {
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText(label, e[0] + 8, e[1] - 8);
      }
      if (handle) {
        ctx.beginPath(); ctx.arc(e[0], e[1], 7, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    // right-angle marker at world point P between unit directions d1, d2
    function rightAngleMarker(vw, P, d1, d2) {
      var s = 0.35;
      var p1 = OrthCore.add(P, OrthCore.scale(d1, s));
      var p2 = OrthCore.add(p1, OrthCore.scale(d2, s));
      var p3 = OrthCore.add(P, OrthCore.scale(d2, s));
      ctx.strokeStyle = C.ortho; ctx.lineWidth = 2;
      var a = w2c(vw, p1), b = w2c(vw, p2), c = w2c(vw, p3);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
    function drawGrid(vw) {
      ctx.clearRect(0, 0, state.cssW, state.cssH);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, state.cssW, state.cssH);
      var hx = Math.ceil(vw.halfX), hy = Math.ceil(vw.halfY);
      ctx.lineWidth = 1;
      for (var k = -hx; k <= hx; k++) {
        ctx.strokeStyle = k === 0 ? C.axis : C.grid;
        seg(vw, [k, -hy], [k, hy]);
      }
      for (var m = -hy; m <= hy; m++) {
        ctx.strokeStyle = m === 0 ? C.axis : C.grid;
        seg(vw, [-hx, m], [hx, m]);
      }
      ctx.fillStyle = C.faint;
      ctx.font = '11px system-ui, sans-serif';
      for (var t = -Math.floor(hx); t <= Math.floor(hx); t += 2) {
        if (t !== 0) { var p = w2c(vw, [t, 0]); ctx.fillText(String(t), p[0] + 3, p[1] + 13); }
      }
      for (var t2 = -Math.floor(hy); t2 <= Math.floor(hy); t2 += 2) {
        if (t2 !== 0) { var p2 = w2c(vw, [0, t2]); ctx.fillText(String(t2), p2[0] + 5, p2[1] - 4); }
      }
    }

    // ---------- projection mode ----------
    function setLegend(items) {
      var html = '';
      for (var i = 0; i < items.length; i++) {
        html += '<div class="ov-li"><span class="ov-sw" style="background:' + items[i][0] + ';"></span>' + items[i][1] + '</div>';
      }
      legendEl.innerHTML = html;
    }

    function drawProjection() {
      var vw = view();
      drawGrid(vw);
      var u = state.u, v = state.v;
      var pr = OrthCore.projOnto(u, v);
      var nv = OrthCore.normalize(v);

      // the subspace W = Span{v}
      if (nv.ok) {
        var R = 2 * vw.halfX;
        ctx.strokeStyle = C.spanLine; ctx.lineWidth = 2;
        seg(vw, OrthCore.scale(nv.u, -R), OrthCore.scale(nv.u, R));
        var lp = w2c(vw, OrthCore.scale(nv.u, 0.9 * vw.halfY));
        ctx.fillStyle = C.spanLine; ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('W = Span{v}', lp[0] + 6, lp[1] + 14);
      }

      if (pr.ok) {
        // decomposition parallelogram (origin, yhat, u, z)
        dashedSeg(vw, pr.p, u, C.dashed);
        dashedSeg(vw, pr.z, u, C.dashed);
        // right-angle marker at yhat between W and the drop segment
        var nz = OrthCore.normalize(pr.z);
        if (nv.ok && nz.ok) {
          var toward = OrthCore.dot(pr.p, nv.u) >= 0 ? OrthCore.scale(nv.u, -1) : nv.u;
          rightAngleMarker(vw, pr.p, toward, nz.u);
        }
        arrow(vw, pr.p, C.proj, 'proj_v u', 3);
        arrow(vw, pr.z, C.resid, 'z', 2.5);
      }
      arrow(vw, u, C.u, 'u', 3, true);
      arrow(vw, v, C.v, 'v', 3, true);

      // exact-orthogonality arc between u and v
      var scl = 1 + OrthCore.norm(u) * OrthCore.norm(v);
      if (Math.abs(OrthCore.dot(u, v)) <= 1e-9 * scl &&
          OrthCore.norm(u) > 1e-9 && OrthCore.norm(v) > 1e-9) {
        var o = w2c(vw, [0, 0]);
        ctx.beginPath();
        ctx.arc(o[0], o[1], 24, -Math.atan2(u[1], u[0]), -Math.atan2(v[1], v[0]),
                Math.atan2(u[1], u[0]) < Math.atan2(v[1], v[0]));
        ctx.strokeStyle = C.ortho; ctx.lineWidth = 2; ctx.stroke();
      }

      // readouts (all values from OrthCore)
      var duv = OrthCore.dot(u, v);
      var html = '<div><strong>Inner product:</strong> <span class="ov-formula">u\u00B7v = ' +
        fmt(duv, 2) + '</span>';
      var ang = OrthCore.angleBetween(u, v);
      if (ang.ok) {
        html += ' &nbsp; <span class="ov-formula">cos\u03B8 = ' + fmt(ang.cos, 3) +
                ', \u03B8 = ' + fmt(ang.deg, 1) + '\u00B0</span>';
      }
      html += '</div>';
      if (Math.abs(duv) <= 1e-9 * scl && ang.ok) {
        html += '<div class="ov-status-ok">u \u22A5 v : the vectors are orthogonal (u\u00B7v = 0).</div>';
      }
      if (pr.ok) {
        html += '<div style="margin-top:6px;"><strong>Decomposition u = proj_v u + z:</strong><br>' +
          '<span class="ov-formula">proj_v u = (u\u00B7v / v\u00B7v) v = ' + fmt(pr.coeff, 3) +
          ' \u00D7 ' + fv(v) + ' = ' + fv(pr.p) + '</span><br>' +
          '<span class="ov-formula">z = u \u2212 proj_v u = ' + fv(pr.z) + '</span><br>' +
          '<span class="ov-formula">z\u00B7v = ' + fmt(OrthCore.dot(pr.z, v), 6) + '</span> (orthogonal residual)</div>';
        var nu2 = OrthCore.dot(u, u), np2 = OrthCore.dot(pr.p, pr.p), nz2 = OrthCore.dot(pr.z, pr.z);
        html += '<div style="margin-top:6px;"><strong>Pythagoras:</strong> ' +
          '<span class="ov-formula">\u2016u\u2016\u00B2 = \u2016proj_v u\u2016\u00B2 + \u2016z\u2016\u00B2 : ' +
          fmt(nu2, 2) + ' = ' + fmt(np2, 2) + ' + ' + fmt(nz2, 2) + '</span><br>' +
          '<span style="color:' + C.textDim + ';">proj_v u is the closest point of W to u ' +
          '(best approximation); \u2016z\u2016 = ' + fmt(Math.sqrt(nz2), 3) + ' is dist(u, W).</span></div>';
      } else {
        html += '<div class="ov-status-warn" style="margin-top:6px;">v = 0: W = Span{v} = {0}, and the projection ' +
          'formula divides by v\u00B7v = 0 \u2014 the projection onto the zero vector is undefined. ' +
          'Make v nonzero.</div>';
      }
      readoutsEl.innerHTML = html;
    }

    // ---------- Gram-Schmidt mode ----------
    function gsData() {
      return OrthCore.gramSchmidtSteps(state.gsXs);
    }

    function drawGramSchmidt() {
      var vw = view();
      drawGrid(vw);
      var xs = state.gsXs;
      var gs = gsData();
      var on = OrthCore.orthonormalize(xs);
      container.dataset.ovGsXs = JSON.stringify(xs);
      container.dataset.ovGsStage = String(state.gsStage);

      // originals always shown, faded
      for (var i = 0; i < xs.length; i++) {
        arrow(vw, xs[i], C.orig, 'x' + (i + 1) + (state.gsStage === 0 ? ' = ' + fv(xs[i], 1) : ''), 2);
      }

      var html = '';
      if (!gs.ok) {
        // unreachable for randomVectorSet outputs (certified well-conditioned),
        // but never render garbage if it ever happens
        readoutsEl.innerHTML = '<div class="ov-status-warn">The current vectors are linearly dependent \u2014 ' +
          'Gram-Schmidt requires an independent set. Generate a new example.</div>';
        return;
      }

      if (state.gsStage >= 1) {
        arrow(vw, gs.vs[0], C.u, 'v1', 3);
      }
      if (state.gsStage >= 2) {
        var st = gs.steps[1];
        // projection of x2 onto v1, and the subtraction
        arrow(vw, st.projs[0].p, C.proj, 'proj_v1 x2', 2.5);
        dashedSeg(vw, st.projs[0].p, xs[1], C.dashed);
        arrow(vw, gs.vs[1], C.v, 'v2', 3);
        var n1 = OrthCore.normalize(gs.vs[0]), n2 = OrthCore.normalize(gs.vs[1]);
        if (n1.ok && n2.ok) rightAngleMarker(vw, [0, 0], n1.u, n2.u);
      }
      if (state.gsStage >= 3 && on.ok) {
        // unit circle + normalized vectors
        var o = w2c(vw, [0, 0]);
        ctx.beginPath(); ctx.arc(o[0], o[1], vw.scale, 0, 2 * Math.PI);
        ctx.strokeStyle = C.unitCircle; ctx.lineWidth = 1.5; ctx.stroke();
        arrow(vw, on.us[0], '#ffc857', 'u1', 3);
        arrow(vw, on.us[1], '#ffc857', 'u2', 3);
      }

      // readouts
      html += '<div><strong>Gram-Schmidt \u2014 step ' + state.gsStage + ' of ' + GS_MAX_STAGE + '</strong></div>';
      html += '<div class="ov-formula" style="margin-top:4px;">x1 = ' + fv(xs[0], 1) +
              ', &nbsp;x2 = ' + fv(xs[1], 1) + '</div>';
      if (state.gsStage === 0) {
        html += '<div style="margin-top:6px;color:' + C.textDim + ';">Two linearly independent vectors in \u211D\u00B2 ' +
          '(a basis \u2014 Gram-Schmidt requires independence). Step through to orthogonalize them ' +
          'while preserving the span.</div>';
      }
      if (state.gsStage >= 1) {
        html += '<div style="margin-top:6px;"><span class="ov-formula">v1 = x1 = ' + fv(gs.vs[0]) + '</span></div>';
      }
      if (state.gsStage >= 2) {
        var st2 = gs.steps[1];
        html += '<div style="margin-top:6px;"><span class="ov-formula">v2 = x2 \u2212 (x2\u00B7v1 / v1\u00B7v1) v1 = x2 \u2212 ' +
          fmt(st2.projs[0].coeff, 3) + ' \u00D7 v1 = ' + fv(gs.vs[1]) + '</span><br>' +
          '<span class="ov-formula">v1\u00B7v2 = ' + fmt(OrthCore.dot(gs.vs[0], gs.vs[1]), 6) + '</span>' +
          ' <span class="ov-status-ok">\u2014 orthogonal</span></div>';
      }
      if (state.gsStage >= 3 && on.ok) {
        var G = OrthCore.gramMatrix(on.us);
        html += '<div style="margin-top:6px;"><strong>Normalize:</strong> ' +
          '<span class="ov-formula">u1 = v1/\u2016v1\u2016 = ' + fv(on.us[0]) +
          ', &nbsp;u2 = v2/\u2016v2\u2016 = ' + fv(on.us[1]) + '</span><br>' +
          '<span class="ov-formula">U\u1D40U = [[' + fmt(G[0][0], 3) + ', ' + fmt(G[0][1], 3) + '], [' +
          fmt(G[1][0], 3) + ', ' + fmt(G[1][1], 3) + ']]</span>' +
          ' <span class="ov-status-ok">= I \u2014 orthonormal basis</span></div>';
      }
      readoutsEl.innerHTML = html;
      gsStepBtn.textContent = state.gsStage >= GS_MAX_STAGE ? 'Restart' : 'Next step';
    }

    function draw() {
      if (state.mode === 'projection') drawProjection();
      else drawGramSchmidt();
    }

    // ---------- interactions ----------
    function syncInputs() {
      inputs.ux.value = String(state.u[0]); inputs.uy.value = String(state.u[1]);
      inputs.vx.value = String(state.v[0]); inputs.vy.value = String(state.v[1]);
      var keys = ['ux', 'uy', 'vx', 'vy'];
      for (var i = 0; i < keys.length; i++) inputs[keys[i]].classList.remove('ov-invalid');
    }

    function onInput() {
      var keys = ['ux', 'uy', 'vx', 'vy'];
      var vals = {}, allOk = true;
      for (var i = 0; i < keys.length; i++) {
        var r = OrthCore.parseEntry(inputs[keys[i]].value);
        inputs[keys[i]].classList.toggle('ov-invalid', !r.ok);
        if (!r.ok) allOk = false; else vals[keys[i]] = r.value;
      }
      if (!allOk) return; // keep last valid vectors; no silent zeros
      state.u = [vals.ux, vals.uy];
      state.v = [vals.vx, vals.vy];
      draw();
    }
    var inputKeys = ['ux', 'uy', 'vx', 'vy'];
    for (var ik = 0; ik < inputKeys.length; ik++) {
      inputs[inputKeys[ik]].addEventListener('input', onInput);
    }

    projResetBtn.addEventListener('click', function () {
      state.u = U0.slice(); state.v = V0.slice();
      syncInputs(); draw();
    });

    modeSel.addEventListener('change', function () {
      state.mode = modeSel.value;
      state.dragging = null;
      if (state.mode === 'projection') {
        projControls.style.display = '';
        gsControls.style.display = 'none';
        instructionEl.textContent = 'Drag the endpoints of u and v, or edit their components.';
        setLegend([
          [C.u, 'u (draggable)'], [C.v, 'v (draggable)'],
          [C.proj, 'proj_v u \u2014 closest point of W to u'], [C.resid, 'z = u \u2212 proj_v u (\u22A5 v)'],
          [C.spanLine, 'W = Span{v}'], [C.dashed, 'decomposition parallelogram']
        ]);
      } else {
        projControls.style.display = 'none';
        gsControls.style.display = '';
        instructionEl.textContent = 'Step through the orthogonalization of a random independent pair.';
        setLegend([
          [C.orig, 'original vectors x1, x2'], [C.u, 'v1 = x1'],
          [C.proj, 'projection subtracted'], [C.v, 'v2 (\u22A5 v1)'],
          ['#ffc857', 'normalized u1, u2 (unit circle)']
        ]);
      }
      draw();
    });

    gsStepBtn.addEventListener('click', function () {
      state.gsStage = state.gsStage >= GS_MAX_STAGE ? 0 : state.gsStage + 1;
      draw();
    });
    gsNewBtn.addEventListener('click', function () {
      state.gsSeedOffset += 1;
      state.gsXs = OrthCore.randomVectorSet(OrthCore.makeRng(GS_SEED_BASE + state.gsSeedOffset), 2, 2);
      state.gsStage = 0;
      draw();
    });
    gsResetBtn.addEventListener('click', function () {
      state.gsStage = 0;
      draw();
    });

    // drag (projection mode only)
    function eventWorld(ev) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      var cx = (ev.clientX - rect.left) * (state.cssW / rect.width);
      var cy = (ev.clientY - rect.top) * (state.cssH / rect.height);
      return c2w(view(), [cx, cy]);
    }
    function nearTip(w, tip) {
      return OrthCore.norm(OrthCore.sub(w, tip)) < 0.6;
    }
    function clampVec(w) {
      var hx = view().halfX - 0.3, hy = VIEW_HALF_Y - 0.3;
      return [Math.max(-hx, Math.min(hx, Math.round(w[0] * 10) / 10)),
              Math.max(-hy, Math.min(hy, Math.round(w[1] * 10) / 10))];
    }
    function dragStart(ev) {
      if (state.mode !== 'projection') return;
      var w = eventWorld(ev);
      if (!w) return;
      if (nearTip(w, state.u)) state.dragging = 'u';
      else if (nearTip(w, state.v)) state.dragging = 'v';
    }
    function dragMove(ev) {
      if (!state.dragging || state.mode !== 'projection') return;
      var w = eventWorld(ev);
      if (!w) return;
      var c = clampVec(w);
      if (state.dragging === 'u') state.u = c; else state.v = c;
      syncInputs(); draw();
    }
    function dragEnd() { state.dragging = null; }

    canvas.addEventListener('mousedown', dragStart);
    canvas.addEventListener('mousemove', function (ev) { dragMove(ev); });
    canvas.addEventListener('mouseup', dragEnd);
    canvas.addEventListener('mouseleave', dragEnd);
    canvas.addEventListener('touchstart', function (ev) {
      if (state.mode !== 'projection') return;
      ev.preventDefault(); dragStart(ev.touches[0]);
    }, { passive: false });
    canvas.addEventListener('touchmove', function (ev) {
      if (!state.dragging) return;
      ev.preventDefault(); dragMove(ev.touches[0]);
    }, { passive: false });
    canvas.addEventListener('touchend', dragEnd);
    canvas.addEventListener('touchcancel', dragEnd);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvas(); draw(); });
    }

    // ---------- boot ----------
    sizeCanvas();
    syncInputs();
    modeSel.value = 'projection';
    modeSel.dispatchEvent(new Event('change'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
// ============================================================================
// 3D UI layer — projection onto a plane + Gram-Schmidt in R^3 (three.js).
// Renders only what OrthCore computes. Reuses the shared gate (__OV_GATE):
// the CDN libraries are loaded ONLY after the mathematical gate has passed.
// Prefix: ov3-. Dark island. Coordinate convention: math (x, y, z) maps to
// three.js (x, z, y) — owned by the single function m2t below.
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
    bad: '#ef5350',
    yHex: 0x3498db, v1Hex: 0xe74c3c, v2Hex: 0xff8a65,
    projHex: 0xab47bc, residHex: 0x2ecc71,
    planeHex: 0x64b4ff, origHex: 0x8a93a0, unitHex: 0xffc857,
    dashHex: 0xaaaaaa
  };
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }
  function fv(v, d) {
    var parts = [];
    for (var i = 0; i < v.length; i++) parts.push(fmt(v[i], d === undefined ? 2 : d));
    return '(' + parts.join(', ') + ')';
  }

  function init() {
    var container = document.getElementById('orthogonality-visualizer-3d');
    if (!container) return;
    if (container.dataset.ov3Init) return;
    container.dataset.ov3Init = '1';

    // ---------- shared gate (computed once by the 2D layer above) ----------
    var gate = (typeof window !== 'undefined' && window.__OV_GATE) ? window.__OV_GATE :
      (function () {
        try { return OrthCore.runSelfTests(); }
        catch (e) { return { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown')], count: 0 }; }
      })();
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + String(shown[gi]).replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="ov3-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
        ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
        '<strong style="color:' + C.bad + ';">3D demo disabled: mathematical self-tests failed (' +
        gate.failures.length + (gate.count ? ' of ' + gate.count + ' checks' : '') + ').</strong>' +
        '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render ' +
        'rather than display incorrect mathematics. Failures:</p>' +
        '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
      return;
    }

    // placeholder while the 3D libraries load (only after the gate passed)
    container.innerHTML =
      '<div class="ov3-loading" style="background:' + C.panel + ';border:1px solid ' + C.border +
      ';border-radius:8px;padding:16px;color:' + C.textDim + ';">Loading 3D libraries\u2026</div>';

    function loadScript(url, ok, fail) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    }
    function cdnFailed() {
      container.innerHTML =
        '<div class="ov3-cdnfail" style="background:' + C.panel + ';border:1px solid ' + C.borderStrong +
        ';border-radius:8px;padding:16px;color:' + C.textDim + ';">The 3D visualizer could not load its ' +
        'graphics libraries (network or CDN issue). The mathematics above and the 2D visualizer are unaffected \u2014 ' +
        'reload the page to retry.</div>';
    }
    if (window.THREE && window.THREE.OrbitControls) { build(); }
    else if (window.THREE) { loadScript(ORBIT_URL, build, cdnFailed); }
    else { loadScript(THREE_URL, function () { loadScript(ORBIT_URL, build, cdnFailed); }, cdnFailed); }

    // ======================================================================
    function build() {
      container.innerHTML =
        '<div class="ov3-root">' +
          '<div class="ov3-canvaswrap">' +
            '<select id="ov3-mode" class="ov3-full">' +
              '<option value="plane">Projection onto a Plane (3D)</option>' +
              '<option value="gs">Gram-Schmidt Process (3D)</option>' +
            '</select>' +
            '<div id="ov3-instruction" class="ov3-instruction"></div>' +
            '<div id="ov3-canvas-holder" class="ov3-holder"></div>' +
            '<button id="ov3-view-reset" class="ov3-secondary" style="margin-top:8px;">Reset view</button>' +
            '<div id="ov3-legend" class="ov3-legend"></div>' +
          '</div>' +
          '<div class="ov3-controls">' +
            '<div id="ov3-readouts" class="ov3-group ov3-readouts"></div>' +
            '<div class="ov3-group" id="ov3-plane-controls">' +
              '<label>Vectors (y is projected onto W = Span{v\u2081, v\u2082}):</label>' +
              '<div class="ov3-vecrow"><span class="ov3-vlab" style="color:#3498db;">y =</span>' +
                '<input type="text" id="ov3-y0" aria-label="y first component">' +
                '<input type="text" id="ov3-y1" aria-label="y second component">' +
                '<input type="text" id="ov3-y2" aria-label="y third component"></div>' +
              '<div class="ov3-vecrow"><span class="ov3-vlab" style="color:#e74c3c;">v\u2081 =</span>' +
                '<input type="text" id="ov3-a0" aria-label="v1 first component">' +
                '<input type="text" id="ov3-a1" aria-label="v1 second component">' +
                '<input type="text" id="ov3-a2" aria-label="v1 third component"></div>' +
              '<div class="ov3-vecrow"><span class="ov3-vlab" style="color:#ff8a65;">v\u2082 =</span>' +
                '<input type="text" id="ov3-b0" aria-label="v2 first component">' +
                '<input type="text" id="ov3-b1" aria-label="v2 second component">' +
                '<input type="text" id="ov3-b2" aria-label="v2 third component"></div>' +
              '<div class="ov3-hint">Invalid entries are outlined and ignored until corrected.</div>' +
              '<button id="ov3-plane-reset" class="ov3-secondary">Reset</button>' +
            '</div>' +
            '<div class="ov3-group" id="ov3-gs-controls" style="display:none;">' +
              '<button id="ov3-gs-step" class="ov3-primary">Next step</button>' +
              '<button id="ov3-gs-new" class="ov3-secondary">New example</button>' +
              '<button id="ov3-gs-reset" class="ov3-secondary">Reset steps</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var style = document.createElement('style');
      style.textContent =
        '#orthogonality-visualizer-3d .ov3-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
        '@media (min-width: 992px){#orthogonality-visualizer-3d .ov3-root{flex-direction:row;align-items:flex-start;}' +
        '#orthogonality-visualizer-3d .ov3-canvaswrap{flex:3;}#orthogonality-visualizer-3d .ov3-controls{flex:2;max-width:420px;}}' +
        '#orthogonality-visualizer-3d .ov3-canvaswrap{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
        '#orthogonality-visualizer-3d .ov3-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';box-shadow:0 8px 32px rgba(0,0,0,0.3);}' +
        '#orthogonality-visualizer-3d .ov3-full{width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;margin-bottom:10px;}' +
        '#orthogonality-visualizer-3d .ov3-full option{background-color:#141c28;color:' + C.text + ';}' +
        '#orthogonality-visualizer-3d .ov3-instruction{color:' + C.faint + ';font-size:0.85rem;margin-bottom:8px;}' +
        '#orthogonality-visualizer-3d .ov3-holder{width:100%;border:1px solid ' + C.borderStrong + ';border-radius:4px;overflow:hidden;background:' + C.bg + ';touch-action:none;}' +
        '#orthogonality-visualizer-3d .ov3-holder canvas{display:block;}' +
        '#orthogonality-visualizer-3d .ov3-legend{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.85rem;color:' + C.textDim + ';}' +
        '@media (max-width: 600px){#orthogonality-visualizer-3d .ov3-legend{grid-template-columns:1fr;}}' +
        '#orthogonality-visualizer-3d .ov3-li{display:flex;align-items:center;}' +
        '#orthogonality-visualizer-3d .ov3-sw{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:2px;flex:none;}' +
        '#orthogonality-visualizer-3d .ov3-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
        '#orthogonality-visualizer-3d .ov3-group label{display:block;font-weight:bold;margin-bottom:8px;color:' + C.textDim + ';font-size:0.85rem;}' +
        '#orthogonality-visualizer-3d .ov3-readouts{font-size:0.92rem;line-height:1.55;}' +
        '#orthogonality-visualizer-3d .ov3-readouts .ov3-formula{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
        '#orthogonality-visualizer-3d .ov3-vecrow{display:flex;align-items:center;gap:6px;margin-bottom:8px;}' +
        '#orthogonality-visualizer-3d .ov3-vlab{font-family:"Courier New",monospace;font-weight:bold;min-width:40px;}' +
        '#orthogonality-visualizer-3d .ov3-vecrow input{width:52px;padding:8px;background:rgba(0,0,0,0.3);border:1px solid ' + C.borderStrong + ';border-radius:4px;text-align:center;color:' + C.text + ';font-family:"Courier New",monospace;}' +
        '#orthogonality-visualizer-3d .ov3-vecrow input:focus{border-color:' + C.accent + ';outline:none;box-shadow:0 0 0 2px rgba(100,180,255,0.2);}' +
        '#orthogonality-visualizer-3d .ov3-vecrow input.ov3-invalid{border-color:' + C.bad + ';box-shadow:0 0 0 2px rgba(239,83,80,0.25);}' +
        '#orthogonality-visualizer-3d .ov3-hint{font-size:0.8rem;color:' + C.faint + ';margin-bottom:8px;}' +
        '#orthogonality-visualizer-3d .ov3-primary,#orthogonality-visualizer-3d .ov3-secondary{width:100%;padding:10px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;margin-top:6px;transition:background 0.2s;}' +
        '#orthogonality-visualizer-3d .ov3-primary{background:linear-gradient(135deg,#1565c0,#42a5f5);color:#fff;}' +
        '#orthogonality-visualizer-3d .ov3-primary:hover{background:linear-gradient(135deg,#1976d2,#64b5f6);}' +
        '#orthogonality-visualizer-3d .ov3-secondary{background:rgba(255,255,255,0.08);border:1px solid ' + C.borderStrong + ';color:' + C.text + ';}' +
        '#orthogonality-visualizer-3d .ov3-secondary:hover{background:rgba(255,255,255,0.12);}' +
        '#orthogonality-visualizer-3d .ov3-status-ok{color:#2ecc71;font-weight:bold;}' +
        '#orthogonality-visualizer-3d .ov3-status-warn{color:#ffc857;font-weight:bold;}';
      document.head.appendChild(style);

      var holder = document.getElementById('ov3-canvas-holder');
      var modeSel = document.getElementById('ov3-mode');
      var instructionEl = document.getElementById('ov3-instruction');
      var legendEl = document.getElementById('ov3-legend');
      var readoutsEl = document.getElementById('ov3-readouts');
      var planeControls = document.getElementById('ov3-plane-controls');
      var gsControls = document.getElementById('ov3-gs-controls');
      var inputIds = ['y0', 'y1', 'y2', 'a0', 'a1', 'a2', 'b0', 'b1', 'b2'];
      var inputs = {};
      for (var ii = 0; ii < inputIds.length; ii++) {
        inputs[inputIds[ii]] = document.getElementById('ov3-' + inputIds[ii]);
      }

      var Y0 = [2, 5, -2], A0 = [3, 0, 1], B0 = [0, 3, 1];
      var GS_SEED_BASE = 301;
      var state = {
        mode: 'plane',
        y: Y0.slice(), v1: A0.slice(), v2: B0.slice(),
        gsSeedOffset: 0,
        gsXs: OrthCore.randomVectorSet(OrthCore.makeRng(GS_SEED_BASE), 3, 3),
        gsStage: 0 // 0 originals, 1 v1, 2 v2, 3 v3, 4 normalized
      };
      var GS_MAX_STAGE = 4;

      // ---------- three.js scene ----------
      var scene = new THREE.Scene();
      scene.background = new THREE.Color(C.bg);
      var W0 = holder.clientWidth > 0 ? holder.clientWidth : 640;
      var H0 = Math.round(W0 * 0.62);
      var camera = new THREE.PerspectiveCamera(50, W0 / H0, 0.1, 200);
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 0, 0);
      var renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio((typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1);
      renderer.setSize(W0, H0);
      holder.appendChild(renderer.domElement);
      var controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;

      // math (x,y,z) -> three (x, z, y): the single owner of the convention
      function m2t(v) { return new THREE.Vector3(v[0], v[2], v[1]); }

      // static axes + labels
      function axisLine(p, q, color) {
        var g = new THREE.BufferGeometry().setFromPoints([m2t(p), m2t(q)]);
        return new THREE.Line(g, new THREE.LineBasicMaterial({ color: color }));
      }
      scene.add(axisLine([-5, 0, 0], [5, 0, 0], 0x8899aa));
      scene.add(axisLine([0, -5, 0], [0, 5, 0], 0x8899aa));
      scene.add(axisLine([0, 0, -5], [0, 0, 5], 0x8899aa));
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
      scene.add(textSprite('x', [5.6, 0, 0], '#e8eaed'));
      scene.add(textSprite('y', [0, 5.6, 0], '#e8eaed'));
      scene.add(textSprite('z', [0, 0, 5.6], '#e8eaed'));

      // dynamic group, rebuilt on every state change
      var dyn = new THREE.Group();
      scene.add(dyn);
      function clearDyn() {
        scene.remove(dyn);
        dyn = new THREE.Group();
        scene.add(dyn);
      }
      function addArrow(mathVec, hex, headScale) {
        var n = OrthCore.norm(mathVec);
        if (n <= 1e-9) return;
        var dir = m2t(OrthCore.scale(mathVec, 1 / n)).normalize();
        var hs = headScale || 1;
        dyn.add(new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), n, hex, 0.35 * hs, 0.18 * hs));
      }
      function addLabel(text, mathPos, cssColor) {
        dyn.add(textSprite(text, mathPos, cssColor));
      }
      function addDashed(mathP, mathQ, hex) {
        var g = new THREE.BufferGeometry().setFromPoints([m2t(mathP), m2t(mathQ)]);
        var line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: hex, dashSize: 0.15, gapSize: 0.1 }));
        line.computeLineDistances();
        dyn.add(line);
      }
      function addPlane(u1, u2, extent) {
        var E = extent;
        var corners = [
          OrthCore.add(OrthCore.scale(u1, E), OrthCore.scale(u2, E)),
          OrthCore.add(OrthCore.scale(u1, -E), OrthCore.scale(u2, E)),
          OrthCore.add(OrthCore.scale(u1, -E), OrthCore.scale(u2, -E)),
          OrthCore.add(OrthCore.scale(u1, E), OrthCore.scale(u2, -E))
        ];
        var pos = [];
        var tri = [0, 1, 2, 0, 2, 3];
        for (var t = 0; t < tri.length; t++) {
          var p = m2t(corners[tri[t]]);
          pos.push(p.x, p.y, p.z);
        }
        var g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        dyn.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
          color: C.planeHex, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false
        })));
        var gm = new THREE.LineBasicMaterial({ color: C.planeHex, transparent: true, opacity: 0.35 });
        for (var k = -extent; k <= extent; k += 1.5) {
          var l1 = new THREE.BufferGeometry().setFromPoints([
            m2t(OrthCore.add(OrthCore.scale(u1, k), OrthCore.scale(u2, -E))),
            m2t(OrthCore.add(OrthCore.scale(u1, k), OrthCore.scale(u2, E)))]);
          dyn.add(new THREE.Line(l1, gm));
          var l2 = new THREE.BufferGeometry().setFromPoints([
            m2t(OrthCore.add(OrthCore.scale(u2, k), OrthCore.scale(u1, -E))),
            m2t(OrthCore.add(OrthCore.scale(u2, k), OrthCore.scale(u1, E)))]);
          dyn.add(new THREE.Line(l2, gm));
        }
      }
      function addRightAngle(mathP, d1, d2) {
        var s = 0.4;
        var p1 = OrthCore.add(mathP, OrthCore.scale(d1, s));
        var p2 = OrthCore.add(p1, OrthCore.scale(d2, s));
        var p3 = OrthCore.add(mathP, OrthCore.scale(d2, s));
        var g = new THREE.BufferGeometry().setFromPoints([m2t(p1), m2t(p2), m2t(p3)]);
        dyn.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: C.residHex })));
      }

      // ---------- plane-projection mode ----------
      function drawPlane() {
        clearDyn();
        var y = state.y, v1 = state.v1, v2 = state.v2;
        var pp = OrthCore.projOntoPlane3(y, v1, v2);
        var html = '';

        addArrow(v1, C.v1Hex); addLabel('v\u2081', OrthCore.add(v1, [0.2, 0.2, 0.2]), '#e74c3c');
        addArrow(v2, C.v2Hex); addLabel('v\u2082', OrthCore.add(v2, [0.2, 0.2, 0.2]), '#ff8a65');
        addArrow(y, C.yHex); addLabel('y', OrthCore.add(y, [0.2, 0.2, 0.2]), '#3498db');

        if (pp.ok) {
          var on = OrthCore.orthonormalize([v1, v2]);
          addPlane(on.us[0], on.us[1], 4.5);
          addArrow(pp.yhat, C.projHex);
          addLabel('proj_W y', OrthCore.add(pp.yhat, [0.2, 0.2, 0.2]), '#ab47bc');
          if (OrthCore.norm(pp.z) > 1e-6) {
            addArrow(pp.z, C.residHex);
            addLabel('z', OrthCore.add(pp.z, [0.2, 0.2, 0.2]), '#2ecc71');
            addDashed(pp.yhat, y, C.dashHex);
            addDashed(pp.z, y, C.dashHex);
            var nyh = OrthCore.normalize(pp.yhat), nz = OrthCore.normalize(pp.z);
            if (nyh.ok && nz.ok) addRightAngle(pp.yhat, OrthCore.scale(nyh.u, -1), nz.u);
          }
          html += '<div><strong>Orthogonal decomposition y = proj_W y + z, &nbsp;W = Span{v\u2081, v\u2082}:</strong></div>' +
            '<div class="ov3-formula" style="margin-top:4px;">n = v\u2081 \u00D7 v\u2082 = ' + fv(pp.n) + '</div>' +
            '<div class="ov3-formula">z = (y\u00B7n / n\u00B7n) n = ' + fv(pp.z) + '</div>' +
            '<div class="ov3-formula">proj_W y = y \u2212 z = ' + fv(pp.yhat) + '</div>' +
            '<div class="ov3-formula">proj_W y \u00B7 n = ' + fmt(OrthCore.dot(pp.yhat, pp.n), 6) + '</div>' +
            '<div style="color:' + C.textDim + ';">so proj_W y lies in the plane, and z is orthogonal to it.</div>';
          var ny2 = OrthCore.dot(y, y), nh2 = OrthCore.dot(pp.yhat, pp.yhat), nz2 = OrthCore.dot(pp.z, pp.z);
          html += '<div style="margin-top:6px;"><strong>Pythagoras:</strong> ' +
            '<span class="ov3-formula">\u2016y\u2016\u00B2 = \u2016proj_W y\u2016\u00B2 + \u2016z\u2016\u00B2 : ' +
            fmt(ny2, 2) + ' = ' + fmt(nh2, 2) + ' + ' + fmt(nz2, 2) + '</span><br>' +
            '<span style="color:' + C.textDim + ';">proj_W y is the closest point of the plane to y ' +
            '(best approximation); \u2016z\u2016 = ' + fmt(Math.sqrt(nz2), 3) + ' is dist(y, W).</span></div>';
        } else {
          html += '<div class="ov3-status-warn">v\u2081 and v\u2082 are linearly dependent (or zero), so ' +
            'Span{v\u2081, v\u2082} is not a plane and n = v\u2081 \u00D7 v\u2082 = 0. ' +
            'Choose independent vectors.</div>';
        }
        readoutsEl.innerHTML = html;
      }

      // ---------- Gram-Schmidt mode ----------
      var gsColors = [C.v1Hex, C.projHex, C.residHex];
      var gsCss = ['#e74c3c', '#ab47bc', '#2ecc71'];
      function drawGS() {
        clearDyn();
        var xs = state.gsXs;
        var gs = OrthCore.gramSchmidtSteps(xs);
        var on = OrthCore.orthonormalize(xs);
        container.dataset.ov3GsXs = JSON.stringify(xs);
        container.dataset.ov3GsStage = String(state.gsStage);

        for (var i = 0; i < xs.length; i++) {
          addArrow(xs[i], C.origHex, 0.8);
          addLabel('x' + (i + 1), OrthCore.add(xs[i], [0.2, 0.2, 0.2]), '#8a93a0');
        }
        var html = '<div><strong>Gram-Schmidt in \u211D\u00B3 \u2014 step ' + state.gsStage + ' of ' + GS_MAX_STAGE + '</strong></div>';
        html += '<div class="ov3-formula" style="margin-top:4px;">x1 = ' + fv(xs[0], 1) +
                ', x2 = ' + fv(xs[1], 1) + ', x3 = ' + fv(xs[2], 1) + '</div>';
        if (!gs.ok) {
          readoutsEl.innerHTML = '<div class="ov3-status-warn">The current vectors are linearly dependent \u2014 ' +
            'Gram-Schmidt requires an independent set. Generate a new example.</div>';
          return;
        }
        if (state.gsStage === 0) {
          html += '<div style="margin-top:6px;color:' + C.textDim + ';">Three linearly independent vectors ' +
            '(a basis of \u211D\u00B3). Step through to orthogonalize them while preserving the span.</div>';
        }
        for (var k = 1; k <= 3; k++) {
          if (state.gsStage < k) break;
          addArrow(gs.vs[k - 1], gsColors[k - 1]);
          addLabel('v' + k, OrthCore.add(gs.vs[k - 1], [0.25, 0.25, 0.25]), gsCss[k - 1]);
          if (k === 1) {
            html += '<div style="margin-top:6px;"><span class="ov3-formula">v1 = x1 = ' + fv(gs.vs[0]) + '</span></div>';
          } else {
            var st = gs.steps[k - 1];
            var terms = [];
            for (var j = 0; j < st.projs.length; j++) {
              terms.push(fmt(st.projs[j].coeff, 3) + ' \u00D7 v' + (st.projs[j].onto + 1));
              addDashed(st.projs[j].p, xs[k - 1], C.dashHex);
            }
            html += '<div style="margin-top:6px;"><span class="ov3-formula">v' + k + ' = x' + k + ' \u2212 ' +
              terms.join(' \u2212 ') + ' = ' + fv(gs.vs[k - 1]) + '</span></div>';
          }
        }
        if (state.gsStage >= 3) {
          var d12 = OrthCore.dot(gs.vs[0], gs.vs[1]);
          var d13 = OrthCore.dot(gs.vs[0], gs.vs[2]);
          var d23 = OrthCore.dot(gs.vs[1], gs.vs[2]);
          html += '<div class="ov3-formula">v1\u00B7v2 = ' + fmt(d12, 6) + ', v1\u00B7v3 = ' + fmt(d13, 6) +
                  ', v2\u00B7v3 = ' + fmt(d23, 6) + '</div>' +
                  '<div class="ov3-status-ok">pairwise orthogonal</div>';
        }
        if (state.gsStage >= 4 && on.ok) {
          clearDyn();
          for (var i4 = 0; i4 < xs.length; i4++) addArrow(xs[i4], C.origHex, 0.8);
          for (var k4 = 0; k4 < 3; k4++) {
            addArrow(on.us[k4], C.unitHex);
            addLabel('u' + (k4 + 1), OrthCore.add(on.us[k4], [0.15, 0.15, 0.15]), '#ffc857');
          }
          var G = OrthCore.gramMatrix(on.us);
          var rows = [];
          for (var r4 = 0; r4 < 3; r4++) {
            rows.push('[' + fmt(G[r4][0], 3) + ', ' + fmt(G[r4][1], 3) + ', ' + fmt(G[r4][2], 3) + ']');
          }
          html += '<div style="margin-top:6px;"><strong>Normalize:</strong> ' +
            '<span class="ov3-formula">u_k = v_k/\u2016v_k\u2016</span><br>' +
            '<span class="ov3-formula">U\u1D40U = [' + rows.join(', ') + ']</span>' +
            ' <span class="ov3-status-ok">= I \u2014 orthonormal basis</span></div>';
        }
        readoutsEl.innerHTML = html;
        document.getElementById('ov3-gs-step').textContent =
          state.gsStage >= GS_MAX_STAGE ? 'Restart' : 'Next step';
      }

      function draw() {
        if (state.mode === 'plane') drawPlane();
        else drawGS();
      }

      // ---------- interactions ----------
      function setLegend(items) {
        var html = '';
        for (var i = 0; i < items.length; i++) {
          html += '<div class="ov3-li"><span class="ov3-sw" style="background:' + items[i][0] + ';"></span>' + items[i][1] + '</div>';
        }
        legendEl.innerHTML = html;
      }
      function syncInputs() {
        var vecs = { y: state.y, a: state.v1, b: state.v2 };
        var keys = Object.keys(vecs);
        for (var i = 0; i < keys.length; i++) {
          for (var d = 0; d < 3; d++) {
            var el = inputs[keys[i] + d];
            el.value = String(vecs[keys[i]][d]);
            el.classList.remove('ov3-invalid');
          }
        }
      }
      function onInput() {
        var vals = {}, allOk = true;
        for (var i = 0; i < inputIds.length; i++) {
          var r = OrthCore.parseEntry(inputs[inputIds[i]].value);
          inputs[inputIds[i]].classList.toggle('ov3-invalid', !r.ok);
          if (!r.ok) allOk = false; else vals[inputIds[i]] = r.value;
        }
        if (!allOk) return; // keep last valid vectors; no silent zeros
        state.y = [vals.y0, vals.y1, vals.y2];
        state.v1 = [vals.a0, vals.a1, vals.a2];
        state.v2 = [vals.b0, vals.b1, vals.b2];
        draw();
      }
      for (var ei = 0; ei < inputIds.length; ei++) {
        inputs[inputIds[ei]].addEventListener('input', onInput);
      }

      document.getElementById('ov3-plane-reset').addEventListener('click', function () {
        state.y = Y0.slice(); state.v1 = A0.slice(); state.v2 = B0.slice();
        syncInputs(); draw();
      });

      modeSel.addEventListener('change', function () {
        state.mode = modeSel.value;
        if (state.mode === 'plane') {
          planeControls.style.display = '';
          gsControls.style.display = 'none';
          instructionEl.textContent = 'Drag to orbit the 3D view; edit the vector components.';
          setLegend([
            ['#3498db', 'y'], ['#e74c3c', 'v\u2081'], ['#ff8a65', 'v\u2082'],
            ['#ab47bc', 'proj_W y \u2014 closest point of the plane'], ['#2ecc71', 'z \u22A5 W'],
            ['rgba(100,180,255,0.5)', 'plane W = Span{v\u2081, v\u2082}']
          ]);
        } else {
          planeControls.style.display = 'none';
          gsControls.style.display = '';
          instructionEl.textContent = 'Drag to orbit; step through the orthogonalization of a random basis of \u211D\u00B3.';
          setLegend([
            ['#8a93a0', 'original vectors x1, x2, x3'], ['#e74c3c', 'v1'],
            ['#ab47bc', 'v2'], ['#2ecc71', 'v3'], ['#ffc857', 'normalized u1, u2, u3']
          ]);
        }
        draw();
      });

      document.getElementById('ov3-gs-step').addEventListener('click', function () {
        state.gsStage = state.gsStage >= GS_MAX_STAGE ? 0 : state.gsStage + 1;
        draw();
      });
      document.getElementById('ov3-gs-new').addEventListener('click', function () {
        state.gsSeedOffset += 1;
        state.gsXs = OrthCore.randomVectorSet(OrthCore.makeRng(GS_SEED_BASE + state.gsSeedOffset), 3, 3);
        state.gsStage = 0;
        draw();
      });
      document.getElementById('ov3-gs-reset').addEventListener('click', function () {
        state.gsStage = 0;
        draw();
      });
      document.getElementById('ov3-view-reset').addEventListener('click', function () {
        camera.position.set(8, 8, 8);
        controls.target.set(0, 0, 0);
        camera.lookAt(0, 0, 0);
        controls.update();
      });

      if (typeof window !== 'undefined') {
        window.addEventListener('resize', function () {
          var w = holder.clientWidth > 0 ? holder.clientWidth : 640;
          var h = Math.round(w * 0.62);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        });
      }

      // render loop (needed for orbit damping)
      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }

      // ---------- boot ----------
      syncInputs();
      modeSel.value = 'plane';
      modeSel.dispatchEvent(new Event('change'));
      animate();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();