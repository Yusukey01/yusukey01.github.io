// ============================================================================
// DualCore — math core for the LP Duality Visualizer (calc-13)
// DOM-free, Node-requirable.
//
// Problem family (2 variables):
//   PRIMAL   min  c1 x1 + c2 x2 + c3   s.t.  A x <= b,  x >= 1
//   DUAL     max  (A1 - b)^T lambda + (c1 + c2 + c3)
//            s.t. lambda >= 0,  A^T lambda >= -c        (A1 = row sums of A)
// derived from the Lagrangian L = c^T x + lambda^T(Ax - b) + mu^T(1 - x):
// stationarity gives mu = c + A^T lambda >= 0, and g(lambda) = -b^T lambda
// + 1^T mu = (A1 - b)^T lambda + c1 + c2.
//
// The v1 tool used the WRONG dual (objective +b^T lambda, the dual of an
// Ax >= b primal) and never actually computed lambda (it stayed at its
// initialization 0) — masked because the default parameters put the primal
// optimum at the corner (1,1) where lambda* happens to be 0. Both bug
// classes are pinned dead below with SciPy/exact-rational verified values.
//
// Primal and dual are solved INDEPENDENTLY by the same 2D vertex-enumeration
// engine (all constraint pairs -> feasibility filter -> best vertex), with
// unboundedness detected through recession-cone direction candidates.
// Weak duality, strong duality (LP), and complementary slackness are then
// THEOREMS CHECKED by the self-tests, not assumptions wired into the code.
// ============================================================================
var DualCore = (function () {
  'use strict';

  // ---------- seeded RNG ----------
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- half-planes: { a, b, c } meaning a*x + b*y <= c ----------
  function satisfies(hp, x, y, tol) {
    return hp.a * x + hp.b * y <= hp.c + tol * (1 + Math.abs(hp.c) + Math.abs(x) + Math.abs(y));
  }
  function feasibleAll(hps, x, y, tol) {
    for (var i = 0; i < hps.length; i++) {
      if (!satisfies(hps[i], x, y, tol)) return false;
    }
    return true;
  }

  // ---------- 2D LP by vertex enumeration + recession-cone check ----------
  // minimize ox*x + oy*y over the intersection of half-planes.
  // Valid for POINTED feasible sets — every problem in this page's family
  // includes both coordinate lower bounds, which makes the set pointed.
  function solveLP2D(ox, oy, hps) {
    var TOL = 1e-9;
    var verts = [];
    for (var i = 0; i < hps.length; i++) {
      for (var j = i + 1; j < hps.length; j++) {
        var h1 = hps[i], h2 = hps[j];
        var det = h1.a * h2.b - h1.b * h2.a;
        var scale = Math.abs(h1.a) + Math.abs(h1.b) + Math.abs(h2.a) + Math.abs(h2.b);
        if (Math.abs(det) <= 1e-12 * (1 + scale * scale)) continue;
        var x = (h1.c * h2.b - h2.c * h1.b) / det;
        var y = (h1.a * h2.c - h2.a * h1.c) / det;
        if (feasibleAll(hps, x, y, 1e-7)) {
          var dup = false;
          for (var k = 0; k < verts.length; k++) {
            if (Math.abs(verts[k].x - x) < 1e-7 * (1 + Math.abs(x)) &&
                Math.abs(verts[k].y - y) < 1e-7 * (1 + Math.abs(y))) { dup = true; break; }
          }
          if (!dup) verts.push({ x: x, y: y });
        }
      }
    }
    if (verts.length === 0) return { status: 'infeasible' };

    // recession cone {d : a_k d <= 0 for all k}; direction candidates:
    // boundary directions of each constraint, inward normals, and -objective
    var cands = [];
    for (var m = 0; m < hps.length; m++) {
      var na = hps[m].a, nb = hps[m].b;
      var nn = Math.hypot(na, nb);
      if (nn < 1e-12) continue;
      cands.push([-nb / nn, na / nn], [nb / nn, -na / nn], [-na / nn, -nb / nn]);
    }
    var on = Math.hypot(ox, oy);
    if (on > 1e-12) cands.push([-ox / on, -oy / on]);
    var unbounded = false;
    for (var q = 0; q < cands.length; q++) {
      var d = cands[q];
      var inCone = true;
      for (var m2 = 0; m2 < hps.length; m2++) {
        if (hps[m2].a * d[0] + hps[m2].b * d[1] > TOL * (1 + Math.abs(hps[m2].a) + Math.abs(hps[m2].b))) {
          inCone = false; break;
        }
      }
      if (inCone && ox * d[0] + oy * d[1] < -1e-9 * (1 + on)) { unbounded = true; break; }
    }
    if (unbounded) return { status: 'unbounded', vertices: verts };

    var best = null, bestVal = Infinity;
    for (var v = 0; v < verts.length; v++) {
      var val = ox * verts[v].x + oy * verts[v].y;
      if (val < bestVal) { bestVal = val; best = verts[v]; }
    }
    return { status: 'optimal', point: best, value: bestVal, vertices: verts };
  }

  // ---------- problem-specific wrappers ----------
  // prm = { c1, c2, c3, a11, a12, a21, a22, b1, b2 }
  function primalHalfplanes(prm) {
    return [
      { a: prm.a11, b: prm.a12, c: prm.b1 },
      { a: prm.a21, b: prm.a22, c: prm.b2 },
      { a: -1, b: 0, c: -1 },   // x1 >= 1
      { a: 0, b: -1, c: -1 }    // x2 >= 1
    ];
  }
  // dual variables (l1, l2):  l >= 0,  A^T l >= -c  <=>  -A^T l <= c
  function dualHalfplanes(prm) {
    return [
      { a: -1, b: 0, c: 0 },                          // l1 >= 0
      { a: 0, b: -1, c: 0 },                          // l2 >= 0
      { a: -prm.a11, b: -prm.a21, c: prm.c1 },        // a11 l1 + a21 l2 >= -c1
      { a: -prm.a12, b: -prm.a22, c: prm.c2 }         // a12 l1 + a22 l2 >= -c2
    ];
  }
  function solvePrimal(prm) {
    var r = solveLP2D(prm.c1, prm.c2, primalHalfplanes(prm));
    if (r.status !== 'optimal') return { status: r.status, vertices: r.vertices || [] };
    return {
      status: 'optimal',
      x: { x1: r.point.x, x2: r.point.y },
      pstar: r.value + prm.c3,
      vertices: r.vertices
    };
  }
  function solveDual(prm) {
    // maximize (A1 - b)^T l  <=>  minimize -(A1 - b)^T l ; A1 = ROW sums
    var d1 = (prm.a11 + prm.a12) - prm.b1;
    var d2 = (prm.a21 + prm.a22) - prm.b2;
    var r = solveLP2D(-d1, -d2, dualHalfplanes(prm));
    if (r.status !== 'optimal') return { status: r.status, vertices: r.vertices || [] };
    var l1 = r.point.x, l2 = r.point.y;
    return {
      status: 'optimal',
      lambda: { l1: l1, l2: l2 },
      mu: {
        m1: prm.c1 + prm.a11 * l1 + prm.a21 * l2,
        m2: prm.c2 + prm.a12 * l1 + prm.a22 * l2
      },
      dstar: d1 * l1 + d2 * l2 + prm.c1 + prm.c2 + prm.c3,
      vertices: r.vertices
    };
  }
  function slacks(prm, x) {
    return {
      s1: prm.b1 - (prm.a11 * x.x1 + prm.a12 * x.x2),
      s2: prm.b2 - (prm.a21 * x.x1 + prm.a22 * x.x2)
    };
  }
  // complementary slackness products (all should be ~0 at joint optimality)
  function complementarity(prm, primal, dual) {
    var s = slacks(prm, primal.x);
    return {
      ls1: dual.lambda.l1 * s.s1,
      ls2: dual.lambda.l2 * s.s2,
      mx1: dual.mu.m1 * (primal.x.x1 - 1),
      mx2: dual.mu.m2 * (primal.x.x2 - 1)
    };
  }

  // ---------- Sutherland-Hodgman clipping (for drawing feasible regions) ----------
  function clipPolygon(poly, hp) {
    if (poly.length === 0) return [];
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var cur = poly[i];
      var prev = poly[(i + poly.length - 1) % poly.length];
      var curIn = hp.a * cur.x + hp.b * cur.y <= hp.c + 1e-12;
      var prevIn = hp.a * prev.x + hp.b * prev.y <= hp.c + 1e-12;
      if (curIn !== prevIn) {
        var fPrev = hp.a * prev.x + hp.b * prev.y - hp.c;
        var fCur = hp.a * cur.x + hp.b * cur.y - hp.c;
        var t = fPrev / (fPrev - fCur);
        out.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) });
      }
      if (curIn) out.push(cur);
    }
    return out;
  }
  function feasiblePolygon(hps, R) {
    var poly = [{ x: -R, y: -R }, { x: R, y: -R }, { x: R, y: R }, { x: -R, y: R }];
    for (var i = 0; i < hps.length; i++) {
      poly = clipPolygon(poly, hps[i]);
      if (poly.length === 0) return [];
    }
    return poly;
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

    var CASE1 = { c1: 3, c2: 4, c3: -20, a11: 2, a12: 1, a21: 1, a22: 3, b1: 10, b2: 15 };
    var CASE2 = { c1: -3, c2: -4, c3: -20, a11: 2, a12: 1, a21: 1, a22: 3, b1: 10, b2: 15 };
    var CASE3 = { c1: -2, c2: -3, c3: 0, a11: 1, a12: 2, a21: 3, a22: 1, b1: 8, b2: 9 };

    // ---- T1: clipping ----
    var sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    var half = clipPolygon(sq, { a: 1, b: 0, c: 0.5 }); // x <= 0.5
    var maxX = Math.max.apply(null, half.map(function (p) { return p.x; }));
    check('T1 clip keeps correct side', half.length === 4 && close(maxX, 0.5, 1e-12), JSON.stringify(half));
    check('T1 clip to empty', clipPolygon(sq, { a: 1, b: 0, c: -1 }).length === 0);
    check('T1 vacuous clip is identity', clipPolygon(sq, { a: 1, b: 0, c: 5 }).length === 4);
    // area of clipped square = 0.5 (shoelace)
    function area(poly) {
      var s = 0;
      for (var i = 0; i < poly.length; i++) {
        var p = poly[i], q = poly[(i + 1) % poly.length];
        s += p.x * q.y - q.x * p.y;
      }
      return Math.abs(s) / 2;
    }
    check('T1 clipped area = 1/2', close(area(half), 0.5, 1e-12));

    // ---- T2: basic LP engine ----
    var box = [{ a: 1, b: 0, c: 1 }, { a: -1, b: 0, c: 0 }, { a: 0, b: 1, c: 1 }, { a: 0, b: -1, c: 0 }];
    var r2 = solveLP2D(1, 1, box);
    check('T2 min x+y over unit square at (0,0)', r2.status === 'optimal' &&
      close(r2.point.x, 0, 1e-9) && close(r2.point.y, 0, 1e-9) && close(r2.value, 0, 1e-9));
    var r2b = solveLP2D(-1, -2, box);
    check('T2 min -x-2y at (1,1)', close(r2b.point.x, 1, 1e-9) && close(r2b.value, -3, 1e-9));
    check('T2 four vertices found', r2.vertices.length === 4, r2.vertices.length);
    check('T2 infeasible detected', solveLP2D(1, 0,
      [{ a: 1, b: 0, c: 0 }, { a: -1, b: 0, c: -1 }, { a: 0, b: 1, c: 1 }, { a: 0, b: -1, c: 0 }]).status === 'infeasible');
    check('T2 unbounded detected', solveLP2D(-1, 0,
      [{ a: -1, b: 0, c: 0 }, { a: 0, b: -1, c: 0 }, { a: 0, b: 1, c: 1 }]).status === 'unbounded');

    // ---- T3: primal hand pins (SciPy verified) ----
    var p1 = solvePrimal(CASE1);
    check('T3 case1 x* = (1,1)', p1.status === 'optimal' &&
      close(p1.x.x1, 1, 1e-9) && close(p1.x.x2, 1, 1e-9));
    check('T3 case1 p* = -13', close(p1.pstar, -13, 1e-9), p1.pstar);
    var p2 = solvePrimal(CASE2);
    check('T3 case2 x* = (3,4) (constraint intersection)', p2.status === 'optimal' &&
      close(p2.x.x1, 3, 1e-9) && close(p2.x.x2, 4, 1e-9));
    check('T3 case2 p* = -45', close(p2.pstar, -45, 1e-9), p2.pstar);
    var p3 = solvePrimal(CASE3);
    check('T3 case3 x* = (2,3) (asymmetric A)', close(p3.x.x1, 2, 1e-9) && close(p3.x.x2, 3, 1e-9));
    check('T3 case3 p* = -13', close(p3.pstar, -13, 1e-9));
    // returned point is feasible and its objective equals p*
    var s3 = slacks(CASE3, p3.x);
    check('T3 optimal point feasible', s3.s1 >= -1e-9 && s3.s2 >= -1e-9 &&
      p3.x.x1 >= 1 - 1e-9 && p3.x.x2 >= 1 - 1e-9);
    check('T3 value recomputes', close(CASE3.c1 * p3.x.x1 + CASE3.c2 * p3.x.x2 + CASE3.c3, p3.pstar, 1e-12));
    // slack VALUE pin (sign matters: s = b - Ax, positive when strictly inside)
    var s1pin = slacks(CASE1, p1.x);
    check('T3 case1 slacks = (7, 11)', close(s1pin.s1, 7, 1e-9) && close(s1pin.s2, 11, 1e-9),
      s1pin.s1 + ',' + s1pin.s2);

    // ---- T4: dual hand pins (SciPy + exact-rational verified) ----
    var d1 = solveDual(CASE1);
    check('T4 case1 lambda* = (0,0)', d1.status === 'optimal' &&
      close(d1.lambda.l1, 0, 1e-9) && close(d1.lambda.l2, 0, 1e-9));
    check('T4 case1 mu* = (3,4)', !!d1.mu && close(d1.mu.m1, 3, 1e-9) && close(d1.mu.m2, 4, 1e-9));
    check('T4 case1 d* = -13', d1.dstar !== undefined && close(d1.dstar, -13, 1e-9), d1.dstar);
    var d2 = solveDual(CASE2);
    check('T4 case2 lambda* = (1,1)', !!d2.lambda && close(d2.lambda.l1, 1, 1e-9) && close(d2.lambda.l2, 1, 1e-9));
    check('T4 case2 mu* = (0,0)', !!d2.mu && close(d2.mu.m1, 0, 1e-9) && close(d2.mu.m2, 0, 1e-9));
    check('T4 case2 d* = -45', d2.dstar !== undefined && close(d2.dstar, -45, 1e-9), d2.dstar);
    var d3 = solveDual(CASE3);
    check('T4 case3 lambda* = (7/5, 1/5) (exact-rational pin)',
      !!d3.lambda && close(d3.lambda.l1, 1.4, 1e-9) && close(d3.lambda.l2, 0.2, 1e-9),
      d3.lambda && (d3.lambda.l1 + ',' + d3.lambda.l2));
    check('T4 case3 d* = -13 (exact-rational pin)', d3.dstar !== undefined && close(d3.dstar, -13, 1e-9), d3.dstar);
    // THE V1 BUG, PINNED: the wrong dual objective +b^T lambda + sum(mu) + c3
    // evaluates to 5 at the case-2 optimum, where the true d* is -45
    var v1style = d2.lambda ? CASE2.b1 * d2.lambda.l1 + CASE2.b2 * d2.lambda.l2 + d2.mu.m1 + d2.mu.m2 + CASE2.c3 : NaN;
    check('T4 v1 wrong-dual formula gives 5, ours gives -45', close(v1style, 5, 1e-9) &&
      d2.dstar !== undefined && close(d2.dstar, -45, 1e-9) && Math.abs(v1style - d2.dstar) > 40, v1style);

    // ---- T5-T7: the three theorems, enacted on a seeded parameter sweep ----
    var rng = makeRng(130001);
    var sweepOptimal = 0;
    for (var sw = 0; sw < 60; sw++) {
      var prm = {
        c1: -5 + 10 * rng(), c2: -5 + 10 * rng(), c3: -20 + 40 * rng(),
        a11: 0.2 + 3.8 * rng(), a12: 0.2 + 3.8 * rng(),
        a21: 0.2 + 3.8 * rng(), a22: 0.2 + 3.8 * rng(),
        b1: 2 + 18 * rng(), b2: 2 + 18 * rng()
      };
      var pp = solvePrimal(prm);
      var dd = solveDual(prm);
      if (pp.status === 'optimal') {
        // LP duality: a finite primal optimum forces a finite dual optimum
        check('T5 dual solvable when primal optimal #' + sw, dd.status === 'optimal', dd.status);
        if (dd.status !== 'optimal') continue;
        sweepOptimal++;
        var scaleT = 1e-6 * (1 + Math.abs(pp.pstar));
        check('T5 weak duality d* <= p* #' + sw, dd.dstar <= pp.pstar + scaleT,
          dd.dstar + ' vs ' + pp.pstar);
        check('T6 strong duality |p* - d*| = 0 #' + sw, close(pp.pstar, dd.dstar, scaleT),
          (pp.pstar - dd.dstar));
        var comp = complementarity(prm, pp, dd);
        var compTol = 1e-6 * (1 + Math.abs(pp.pstar));
        check('T7 complementary slackness #' + sw,
          Math.abs(comp.ls1) < compTol && Math.abs(comp.ls2) < compTol &&
          Math.abs(comp.mx1) < compTol && Math.abs(comp.mx2) < compTol,
          JSON.stringify(comp));
        // dual feasibility of the reported multipliers
        check('T7 mu* >= 0 #' + sw, dd.mu.m1 >= -1e-9 && dd.mu.m2 >= -1e-9);
      }
    }
    check('T5 sweep hit enough optimal cases', sweepOptimal >= 30, sweepOptimal);

    // ---- T8: status correspondences (SciPy verified) ----
    var infP = { c1: 3, c2: 4, c3: -20, a11: 2, a12: 1, a21: 1, a22: 3, b1: 1, b2: 15 };
    check('T8 infeasible primal detected', solvePrimal(infP).status === 'infeasible');
    check('T8 ...with unbounded dual', solveDual(infP).status === 'unbounded');
    var unbP = { c1: -3, c2: -4, c3: 0, a11: 2, a12: 0, a21: 0, a22: 0, b1: 10, b2: 5 };
    check('T8 unbounded primal detected', solvePrimal(unbP).status === 'unbounded');
    check('T8 ...with infeasible dual', solveDual(unbP).status === 'infeasible');

    // ---- T9: grid sandwich (independent route) ----
    var rng9 = makeRng(130002);
    for (var g9 = 0; g9 < 5; g9++) {
      var prm9 = {
        c1: -5 + 10 * rng9(), c2: -5 + 10 * rng9(), c3: 0,
        a11: 0.5 + 3 * rng9(), a12: 0.5 + 3 * rng9(),
        a21: 0.5 + 3 * rng9(), a22: 0.5 + 3 * rng9(),
        b1: 4 + 14 * rng9(), b2: 4 + 14 * rng9()
      };
      var pp9 = solvePrimal(prm9);
      if (pp9.status !== 'optimal') { count++; continue; }
      var hps9 = primalHalfplanes(prm9);
      var gridMin = Infinity;
      var span = 40, steps = 220;
      for (var gx = 0; gx <= steps; gx++) {
        for (var gy = 0; gy <= steps; gy++) {
          var X = 1 + span * gx / steps, Y = 1 + span * gy / steps;
          if (feasibleAll(hps9, X, Y, 1e-9)) {
            var vv = prm9.c1 * X + prm9.c2 * Y;
            if (vv < gridMin) gridMin = vv;
          }
        }
      }
      var spacing = span / steps;
      var lip = Math.abs(prm9.c1) + Math.abs(prm9.c2);
      check('T9 grid never beats p* #' + g9, gridMin >= pp9.pstar - 1e-9, gridMin - pp9.pstar);
      check('T9 grid comes close to p* #' + g9, gridMin - pp9.pstar <= 2 * lip * spacing + 1e-6,
        gridMin - pp9.pstar);
    }

    // ---- T10: feasible polygon agrees with the solver ----
    var rng10 = makeRng(130003);
    for (var g10 = 0; g10 < 12; g10++) {
      var prm10 = {
        c1: 1, c2: 1, c3: 0,
        a11: 0.2 + 3.8 * rng10(), a12: 0.2 + 3.8 * rng10(),
        a21: 0.2 + 3.8 * rng10(), a22: 0.2 + 3.8 * rng10(),
        b1: 1 + 19 * rng10(), b2: 1 + 19 * rng10()
      };
      var hps10 = primalHalfplanes(prm10);
      var poly = feasiblePolygon(hps10, 200);
      var solv = solvePrimal(prm10);
      check('T10 polygon nonempty iff feasible #' + g10,
        (poly.length > 0) === (solv.status !== 'infeasible'),
        poly.length + ' vs ' + solv.status);
      var allFeas = true;
      for (var pv = 0; pv < poly.length; pv++) {
        if (!feasibleAll(hps10, poly[pv].x, poly[pv].y, 1e-6)) allFeas = false;
      }
      check('T10 polygon vertices all feasible #' + g10, allFeas);
    }

    // ---- T11: determinism ----
    var ra = makeRng(42), rb = makeRng(42);
    var same = true;
    for (var i11 = 0; i11 < 10; i11++) { if (ra() !== rb()) same = false; }
    check('T11 rng deterministic', same);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  return {
    makeRng: makeRng,
    clipPolygon: clipPolygon,
    feasiblePolygon: feasiblePolygon,
    solveLP2D: solveLP2D,
    primalHalfplanes: primalHalfplanes,
    dualHalfplanes: dualHalfplanes,
    solvePrimal: solvePrimal,
    solveDual: solveDual,
    slacks: slacks,
    complementarity: complementarity,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = DualCore; }
// ============================================================================
// UI layer — LP duality. Primal view (x-space) and dual view (lambda-space),
// solved independently by DualCore; the readout panel reports p*, d*, the
// duality gap (verified ~0 live whenever both are finite), the multipliers,
// and the four complementary-slackness products. Status pairs (infeasible <->
// unbounded) are reported honestly per LP duality. Prefix: dv-. Dark island.
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
    region: 'rgba(52, 152, 219, 0.20)',
    regionEdge: 'rgba(52, 152, 219, 0.85)',
    con1: '#e74c3c',
    con2: '#2ecc71',
    boundLine: 'rgba(255, 255, 255, 0.35)',
    level: '#ffc857',
    optim: '#ff8a65',
    vert: 'rgba(255, 255, 255, 0.6)',
    ok: '#2ecc71',
    bad: '#ef5350',
    warn: '#ffc857'
  };

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }

  function init() {
    var container = document.getElementById('duality-visualizer');
    if (!container) return;
    if (container.dataset.dvInit) return;
    container.dataset.dvInit = '1';

    // ---------- gate ----------
    var gate;
    try { gate = DualCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests threw: ' + (e && e.message ? e.message : 'unknown')], count: 0 }; }
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + String(shown[gi]).replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="dv-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
        ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
        '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
        gate.failures.length + ' of ' + gate.count + ' checks).</strong>' +
        '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This visualizer refuses to render ' +
        'rather than display incorrect mathematics. Failures:</p>' +
        '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
      return;
    }

    // ---------- DOM ----------
    function sliderRow(id, label, min, max, step, val) {
      return '<div class="dv-sliderrow"><label for="dv-' + id + '">' + label +
        ' = <span id="dv-' + id + '-val">' + fmt(val, 1) + '</span></label>' +
        '<input type="range" id="dv-' + id + '" min="' + min + '" max="' + max +
        '" step="' + step + '" value="' + val + '"></div>';
    }
    container.innerHTML =
      '<div class="dv-root">' +
        '<div class="dv-canvaswrap">' +
          '<div class="dv-tabs">' +
            '<button id="dv-tab-primal" class="dv-tab dv-tab-active">Primal (x-space)</button>' +
            '<button id="dv-tab-dual" class="dv-tab">Dual (\u03BB-space)</button>' +
          '</div>' +
          '<div class="dv-charttitle" id="dv-title"></div>' +
          '<canvas id="dv-canvas"></canvas>' +
          '<div class="dv-legend" id="dv-legend"></div>' +
        '</div>' +
        '<div class="dv-controls">' +
          '<div id="dv-readouts" class="dv-group dv-readouts"></div>' +
          '<div class="dv-group">' +
            '<label>Presets</label>' +
            '<div class="dv-btnrow">' +
              '<button class="dv-preset" data-key="corner">Corner optimum</button>' +
              '<button class="dv-preset" data-key="interior">Both constraints active</button>' +
              '<button class="dv-preset" data-key="asym">Asymmetric A</button>' +
            '</div>' +
          '</div>' +
          '<div class="dv-group"><label>Objective: min c\u2081x\u2081 + c\u2082x\u2082 + c\u2083</label>' +
            sliderRow('c1', 'c\u2081', -5, 5, 0.5, 3) +
            sliderRow('c2', 'c\u2082', -5, 5, 0.5, 4) +
            sliderRow('c3', 'c\u2083', -20, 20, 1, -20) +
          '</div>' +
          '<div class="dv-group"><label>Constraints: Ax \u2264 b, x \u2265 1</label>' +
            sliderRow('a11', 'a\u2081\u2081', 0, 4, 0.1, 2) +
            sliderRow('a12', 'a\u2081\u2082', 0, 4, 0.1, 1) +
            sliderRow('b1', 'b\u2081', 2, 20, 0.5, 10) +
            sliderRow('a21', 'a\u2082\u2081', 0, 4, 0.1, 1) +
            sliderRow('a22', 'a\u2082\u2082', 0, 4, 0.1, 3) +
            sliderRow('b2', 'b\u2082', 2, 20, 0.5, 15) +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#duality-visualizer .dv-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';margin-bottom:20px;}' +
      '@media (min-width: 992px){#duality-visualizer .dv-root{flex-direction:row;align-items:flex-start;}' +
      '#duality-visualizer .dv-canvaswrap{flex:3;}#duality-visualizer .dv-controls{flex:2;max-width:400px;}}' +
      '#duality-visualizer .dv-canvaswrap,#duality-visualizer .dv-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#duality-visualizer .dv-controls{box-shadow:0 8px 32px rgba(0,0,0,0.3);}' +
      '#duality-visualizer .dv-tabs{display:flex;gap:6px;margin-bottom:10px;}' +
      '#duality-visualizer .dv-tab{flex:1;padding:8px 6px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.88rem;}' +
      '#duality-visualizer .dv-tab-active{background:linear-gradient(135deg,#1565c0,#42a5f5);border-color:transparent;color:#fff;font-weight:bold;}' +
      '#duality-visualizer canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;}' +
      '#duality-visualizer .dv-charttitle{font-size:0.88rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:6px;}' +
      '#duality-visualizer .dv-legend{margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.84rem;color:' + C.textDim + ';}' +
      '@media (max-width: 600px){#duality-visualizer .dv-legend{grid-template-columns:1fr;}}' +
      '#duality-visualizer .dv-li{display:flex;align-items:center;}' +
      '#duality-visualizer .dv-sw{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:2px;flex:none;}' +
      '#duality-visualizer .dv-group{background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:12px;margin-bottom:12px;}' +
      '#duality-visualizer .dv-group > label{display:block;font-weight:bold;margin-bottom:8px;color:' + C.textDim + ';font-size:0.85rem;}' +
      '#duality-visualizer .dv-btnrow{display:flex;flex-wrap:wrap;gap:6px;}' +
      '#duality-visualizer .dv-preset{flex:1;min-width:100px;padding:7px 4px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.8rem;}' +
      '#duality-visualizer .dv-preset:hover{background:rgba(255,255,255,0.1);}' +
      '#duality-visualizer .dv-sliderrow{margin-bottom:8px;}' +
      '#duality-visualizer .dv-sliderrow label{display:block;font-size:0.85rem;color:' + C.textDim + ';margin-bottom:2px;font-weight:bold;}' +
      '#duality-visualizer .dv-sliderrow input[type=range]{width:100%;}' +
      '#duality-visualizer .dv-sliderrow span{color:' + C.accent + ';font-family:"Courier New",monospace;}' +
      '#duality-visualizer .dv-readouts{font-size:0.9rem;line-height:1.6;}' +
      '#duality-visualizer .dv-val{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#duality-visualizer .dv-opt{font-family:"Courier New",monospace;color:' + C.optim + ';}' +
      '#duality-visualizer .dv-ok{color:' + C.ok + ';font-weight:bold;}' +
      '#duality-visualizer .dv-warn{color:' + C.warn + ';font-weight:bold;}' +
      '#duality-visualizer .dv-sub{color:' + C.faint + ';font-size:0.85rem;}' +
      '#duality-visualizer table.dv-table{border-collapse:collapse;width:100%;margin-top:6px;font-size:0.84rem;}' +
      '#duality-visualizer table.dv-table th,#duality-visualizer table.dv-table td{border:1px solid ' + C.border + ';padding:4px 8px;text-align:right;font-family:"Courier New",monospace;}' +
      '#duality-visualizer table.dv-table th{color:' + C.textDim + ';background:rgba(255,255,255,0.04);font-family:system-ui,sans-serif;}' +
      '#duality-visualizer table.dv-table td:first-child{text-align:left;}';
    document.head.appendChild(style);

    var canvas = document.getElementById('dv-canvas');
    var ctx = canvas.getContext('2d');
    var readoutsEl = document.getElementById('dv-readouts');
    var legendEl = document.getElementById('dv-legend');
    var titleEl = document.getElementById('dv-title');

    var PRESETS = {
      corner: { c1: 3, c2: 4, c3: -20, a11: 2, a12: 1, a21: 1, a22: 3, b1: 10, b2: 15 },
      interior: { c1: -3, c2: -4, c3: -20, a11: 2, a12: 1, a21: 1, a22: 3, b1: 10, b2: 15 },
      asym: { c1: -2, c2: -3, c3: 0, a11: 1, a12: 2, a21: 3, a22: 1, b1: 8, b2: 9 }
    };
    var SLIDER_IDS = ['c1', 'c2', 'c3', 'a11', 'a12', 'a21', 'a22', 'b1', 'b2'];

    var state = {
      view: 'primal',
      prm: Object.assign({}, PRESETS.corner),
      cssW: 620, cssH: 460
    };

    function sizeCanvas() {
      var parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
      var w = parentW > 0 ? Math.max(320, Math.min(720, parentW - 30)) : 620;
      state.cssW = w;
      state.cssH = Math.round(w * 0.75);
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      canvas.style.width = state.cssW + 'px';
      canvas.style.height = state.cssH + 'px';
      canvas.width = Math.round(state.cssW * dpr);
      canvas.height = Math.round(state.cssH * dpr);
      if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---------- frame with equal-ish data ranges ----------
    function frame(xMin, xMax, yMin, yMax, xLabel, yLabel) {
      var r = { x0: 46, y0: 12, w: state.cssW - 46 - 14, h: state.cssH - 12 - 34 };
      ctx.clearRect(0, 0, state.cssW, state.cssH);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, state.cssW, state.cssH);
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
        ctx.fillText(fmt(xv, xMax - xMin > 8 ? 0 : 1), tx - 8, r.y0 + r.h + 16);
        ctx.fillText(fmt(yv, yMax - yMin > 8 ? 0 : 1), 4, ty + 4);
      }
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(r.x0, r.y0, r.w, r.h);
      ctx.fillStyle = C.textDim;
      ctx.fillText(xLabel, r.x0 + r.w - 8 * xLabel.length, r.y0 + r.h + 30);
      ctx.fillText(yLabel, r.x0 + 4, r.y0 + 12);
      return {
        r: r,
        px: function (x) { return r.x0 + (x - xMin) / (xMax - xMin) * r.w; },
        py: function (y) { return r.y0 + (1 - (y - yMin) / (yMax - yMin)) * r.h; },
        xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax
      };
    }
    // draw the line a x + b y = c across the view
    function drawBoundary(P, a, b, c, color, width, dash) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      if (Math.abs(b) >= Math.abs(a)) {
        var y1 = (c - a * P.xMin) / b, y2 = (c - a * P.xMax) / b;
        ctx.moveTo(P.px(P.xMin), P.py(y1));
        ctx.lineTo(P.px(P.xMax), P.py(y2));
      } else {
        var x1 = (c - b * P.yMin) / a, x2 = (c - b * P.yMax) / a;
        ctx.moveTo(P.px(x1), P.py(P.yMin));
        ctx.lineTo(P.px(x2), P.py(P.yMax));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    function drawArrow(P, x0, y0, dx, dy, color, label) {
      var len = Math.hypot(dx, dy);
      if (len < 1e-12) return;
      var ux = dx / len, uy = dy / len;
      var span = (P.xMax - P.xMin) * 0.09;
      var x1 = x0 + ux * span, y1 = y0 + uy * span;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(P.px(x0), P.py(y0));
      ctx.lineTo(P.px(x1), P.py(y1));
      ctx.stroke();
      var ang = Math.atan2(P.py(y1) - P.py(y0), P.px(x1) - P.px(x0));
      ctx.beginPath();
      ctx.moveTo(P.px(x1), P.py(y1));
      ctx.lineTo(P.px(x1) - 9 * Math.cos(ang - 0.4), P.py(y1) - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(P.px(x1) - 9 * Math.cos(ang + 0.4), P.py(y1) - 9 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
      if (label) {
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(label, P.px(x1) + 5, P.py(y1) - 5);
      }
    }

    // ---------- render ----------
    function viewBounds(poly, extraPts, floorMin) {
      var mx = 8, my = 8;
      for (var i = 0; i < poly.length; i++) {
        if (poly[i].x < 60 && poly[i].x > mx) mx = poly[i].x;
        if (poly[i].y < 60 && poly[i].y > my) my = poly[i].y;
      }
      for (var j = 0; j < extraPts.length; j++) {
        if (extraPts[j].x + 1 > mx) mx = extraPts[j].x + 1;
        if (extraPts[j].y + 1 > my) my = extraPts[j].y + 1;
      }
      var M = Math.min(60, Math.max(mx, my) * 1.15);
      return [floorMin, M];
    }

    function statusText(status, isPrimal) {
      if (status === 'infeasible') {
        return '<span class="dv-warn">' + (isPrimal ? 'infeasible \u2014 p* = +\u221E' : 'infeasible \u2014 d* = \u2212\u221E') + '</span>';
      }
      return '<span class="dv-warn">' + (isPrimal ? 'unbounded below \u2014 p* = \u2212\u221E' : 'unbounded above \u2014 d* = +\u221E') + '</span>';
    }

    function render() {
      var prm = state.prm;
      var P = DualCore.solvePrimal(prm);
      var D = DualCore.solveDual(prm);

      // ----- readouts -----
      var html = '<div><strong>min c\u1D40x + c\u2083 s.t. Ax \u2264 b, x \u2265 1</strong> ' +
        '<span class="dv-sub">primal and dual solved independently</span></div>';
      var expose = { view: state.view, prm: prm, pStatus: P.status, dStatus: D.status };
      if (P.status === 'optimal' && D.status === 'optimal') {
        var gap = Math.abs(P.pstar - D.dstar);
        html += '<div>p* = <span class="dv-val">' + fmt(P.pstar, 4) + '</span> at x* = (<span class="dv-opt">' +
          fmt(P.x.x1, 3) + ', ' + fmt(P.x.x2, 3) + '</span>)</div>';
        html += '<div>d* = <span class="dv-val">' + fmt(D.dstar, 4) + '</span> at \u03BB* = (<span class="dv-opt">' +
          fmt(D.lambda.l1, 3) + ', ' + fmt(D.lambda.l2, 3) + '</span>), \u03BC* = (<span class="dv-opt">' +
          fmt(D.mu.m1, 3) + ', ' + fmt(D.mu.m2, 3) + '</span>)</div>';
        html += '<div>duality gap |p* \u2212 d*| = <span class="dv-val">' + gap.toExponential(2) + '</span> ' +
          (gap < 1e-6 * (1 + Math.abs(P.pstar)) ?
            '<span class="dv-ok">\u2713 strong duality, verified live</span>' :
            '<span class="dv-warn">nonzero \u2014 numerical issue</span>') + '</div>';
        var comp = DualCore.complementarity(prm, P, D);
        var s = DualCore.slacks(prm, P.x);
        function compRow(label, prod) {
          var ok = Math.abs(prod) < 1e-6 * (1 + Math.abs(P.pstar));
          return '<tr><td>' + label + '</td><td>' + prod.toExponential(2) + '</td><td>' +
            (ok ? '<span class="dv-ok">\u2713</span>' : '<span class="dv-warn">\u2717</span>') + '</td></tr>';
        }
        html += '<div style="margin-top:6px;"><span class="dv-sub">Complementary slackness (each product must vanish):</span></div>' +
          '<table class="dv-table"><tr><th>pair</th><th>product</th><th></th></tr>' +
          compRow('\u03BB\u2081 \u00B7 s\u2081 = ' + fmt(D.lambda.l1, 3) + ' \u00B7 ' + fmt(s.s1, 3), comp.ls1) +
          compRow('\u03BB\u2082 \u00B7 s\u2082 = ' + fmt(D.lambda.l2, 3) + ' \u00B7 ' + fmt(s.s2, 3), comp.ls2) +
          compRow('\u03BC\u2081 \u00B7 (x\u2081\u22121) = ' + fmt(D.mu.m1, 3) + ' \u00B7 ' + fmt(P.x.x1 - 1, 3), comp.mx1) +
          compRow('\u03BC\u2082 \u00B7 (x\u2082\u22121) = ' + fmt(D.mu.m2, 3) + ' \u00B7 ' + fmt(P.x.x2 - 1, 3), comp.mx2) +
          '</table>';
        expose.pstar = P.pstar; expose.dstar = D.dstar; expose.gap = gap;
        expose.x = P.x; expose.lambda = D.lambda; expose.mu = D.mu; expose.comp = comp;
      } else {
        html += '<div>Primal: ' + (P.status === 'optimal' ?
          'p* = <span class="dv-val">' + fmt(P.pstar, 4) + '</span>' : statusText(P.status, true)) + '</div>';
        html += '<div>Dual: ' + (D.status === 'optimal' ?
          'd* = <span class="dv-val">' + fmt(D.dstar, 4) + '</span>' : statusText(D.status, false)) + '</div>';
        html += '<div class="dv-sub" style="margin-top:6px;">LP duality pairs the degenerate cases: an infeasible ' +
          'primal (p* = +\u221E) forces the dual to be unbounded or infeasible, and an unbounded primal ' +
          '(p* = \u2212\u221E) forces the dual to be infeasible \u2014 weak duality d* \u2264 p* survives with the ' +
          'conventions \u00B1\u221E.</div>';
        if (P.status === 'optimal') { expose.pstar = P.pstar; }
        if (D.status === 'optimal') { expose.dstar = D.dstar; }
      }
      readoutsEl.innerHTML = html;
      container.dataset.dvState = JSON.stringify(expose);

      // ----- canvas -----
      if (state.view === 'primal') drawPrimalView(prm, P, D);
      else drawDualView(prm, P, D);
    }

    function drawPrimalView(prm, P, D) {
      titleEl.textContent = 'Primal: feasible region, objective level line, optimum';
      var hps = DualCore.primalHalfplanes(prm);
      var poly = DualCore.feasiblePolygon(hps, 200);
      var extra = P.status === 'optimal' ? [{ x: P.x.x1, y: P.x.x2 }] : [];
      var vb = viewBounds(poly, extra, 0);
      var F = frame(vb[0], vb[1], vb[0], vb[1], 'x\u2081', 'x\u2082');
      ctx.save();
      ctx.beginPath();
      ctx.rect(F.r.x0, F.r.y0, F.r.w, F.r.h);
      ctx.clip();
      // region
      if (poly.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(F.px(poly[0].x), F.py(poly[0].y));
        for (var i = 1; i < poly.length; i++) ctx.lineTo(F.px(poly[i].x), F.py(poly[i].y));
        ctx.closePath();
        ctx.fillStyle = C.region;
        ctx.fill();
        ctx.strokeStyle = C.regionEdge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // constraint boundaries
      if (Math.abs(prm.a11) + Math.abs(prm.a12) > 1e-12) drawBoundary(F, prm.a11, prm.a12, prm.b1, C.con1, 2);
      if (Math.abs(prm.a21) + Math.abs(prm.a22) > 1e-12) drawBoundary(F, prm.a21, prm.a22, prm.b2, C.con2, 2);
      drawBoundary(F, 1, 0, 1, C.boundLine, 1, [4, 4]); // x1 = 1
      drawBoundary(F, 0, 1, 1, C.boundLine, 1, [4, 4]); // x2 = 1
      if (P.status === 'optimal') {
        // level line c1 x + c2 y = p* - c3 and the descent direction -c
        if (Math.abs(prm.c1) + Math.abs(prm.c2) > 1e-12) {
          drawBoundary(F, prm.c1, prm.c2, P.pstar - prm.c3, C.level, 2, [7, 5]);
          drawArrow(F, P.x.x1, P.x.x2, -prm.c1, -prm.c2, C.level, '\u2212c');
        }
        // vertices + optimum
        for (var v = 0; v < P.vertices.length; v++) {
          ctx.beginPath();
          ctx.arc(F.px(P.vertices[v].x), F.py(P.vertices[v].y), 3, 0, 2 * Math.PI);
          ctx.fillStyle = C.vert;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(F.px(P.x.x1), F.py(P.x.x2), 6, 0, 2 * Math.PI);
        ctx.fillStyle = C.optim;
        ctx.fill();
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText('x*', F.px(P.x.x1) + 8, F.py(P.x.x2) - 8);
      }
      ctx.restore();
      setLegend([
        [C.region, 'feasible region {Ax \u2264 b, x \u2265 1}'],
        [C.con1, 'a\u2081\u2081x\u2081 + a\u2081\u2082x\u2082 = b\u2081'],
        [C.con2, 'a\u2082\u2081x\u2081 + a\u2082\u2082x\u2082 = b\u2082'],
        [C.level, 'objective level c\u1D40x = p* \u2212 c\u2083 (dashed) and \u2212c'],
        [C.optim, 'optimal vertex x*'],
        [C.vert, 'feasible-region vertices']
      ]);
    }

    function drawDualView(prm, P, D) {
      titleEl.textContent = 'Dual: multiplier region {\u03BB \u2265 0, A\u1D40\u03BB \u2265 \u2212c}, optimum \u03BB*';
      var hps = DualCore.dualHalfplanes(prm);
      var poly = DualCore.feasiblePolygon(hps, 200);
      // zoom driven by the dual optimum and the constraint-line intercepts,
      // not by the (typically unbounded) region's clip box
      var cand = [3];
      if (D.status === 'optimal') {
        cand.push(2.2 * D.lambda.l1 + 0.5, 2.2 * D.lambda.l2 + 0.5);
      }
      [[prm.a11, -prm.c1], [prm.a21, -prm.c1], [prm.a12, -prm.c2], [prm.a22, -prm.c2]]
        .forEach(function (t) {
          if (t[0] > 0.05 && t[1] > 0) cand.push(t[1] / t[0] + 0.5);
        });
      var M = Math.min(20, Math.max.apply(null, cand));
      var F = frame(-0.15, M, -0.15, M, '\u03BB\u2081', '\u03BB\u2082');
      ctx.save();
      ctx.beginPath();
      ctx.rect(F.r.x0, F.r.y0, F.r.w, F.r.h);
      ctx.clip();
      if (poly.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(F.px(poly[0].x), F.py(poly[0].y));
        for (var i = 1; i < poly.length; i++) ctx.lineTo(F.px(poly[i].x), F.py(poly[i].y));
        ctx.closePath();
        ctx.fillStyle = C.region;
        ctx.fill();
        ctx.strokeStyle = C.regionEdge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // dual constraint boundaries a11 l1 + a21 l2 = -c1 (note: columns of A)
      if (Math.abs(prm.a11) + Math.abs(prm.a21) > 1e-12) drawBoundary(F, prm.a11, prm.a21, -prm.c1, C.con1, 2);
      if (Math.abs(prm.a12) + Math.abs(prm.a22) > 1e-12) drawBoundary(F, prm.a12, prm.a22, -prm.c2, C.con2, 2);
      drawBoundary(F, 1, 0, 0, C.boundLine, 1, [4, 4]);
      drawBoundary(F, 0, 1, 0, C.boundLine, 1, [4, 4]);
      var d1 = (prm.a11 + prm.a12) - prm.b1;
      var d2 = (prm.a21 + prm.a22) - prm.b2;
      if (D.status === 'optimal') {
        if (Math.abs(d1) + Math.abs(d2) > 1e-12) {
          drawBoundary(F, d1, d2, d1 * D.lambda.l1 + d2 * D.lambda.l2, C.level, 2, [7, 5]);
          drawArrow(F, D.lambda.l1, D.lambda.l2, d1, d2, C.level, 'ascent');
        }
        for (var v = 0; v < D.vertices.length; v++) {
          ctx.beginPath();
          ctx.arc(F.px(D.vertices[v].x), F.py(D.vertices[v].y), 3, 0, 2 * Math.PI);
          ctx.fillStyle = C.vert;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(F.px(D.lambda.l1), F.py(D.lambda.l2), 6, 0, 2 * Math.PI);
        ctx.fillStyle = C.optim;
        ctx.fill();
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText('\u03BB*', F.px(D.lambda.l1) + 8, F.py(D.lambda.l2) - 8);
      }
      ctx.restore();
      setLegend([
        [C.region, 'dual feasible region {\u03BB \u2265 0, A\u1D40\u03BB \u2265 \u2212c}'],
        [C.con1, 'a\u2081\u2081\u03BB\u2081 + a\u2082\u2081\u03BB\u2082 = \u2212c\u2081'],
        [C.con2, 'a\u2081\u2082\u03BB\u2081 + a\u2082\u2082\u03BB\u2082 = \u2212c\u2082'],
        [C.level, 'dual objective level (A\ud835\udfd9 \u2212 b)\u1D40\u03BB (dashed) and ascent'],
        [C.optim, 'dual optimum \u03BB*'],
        [C.vert, 'dual-region vertices']
      ]);
    }

    function setLegend(items) {
      var html = '';
      for (var i = 0; i < items.length; i++) {
        html += '<div class="dv-li"><span class="dv-sw" style="background:' + items[i][0] + ';"></span>' + items[i][1] + '</div>';
      }
      legendEl.innerHTML = html;
    }

    // ---------- events ----------
    function syncSliders() {
      for (var i = 0; i < SLIDER_IDS.length; i++) {
        var id = SLIDER_IDS[i];
        document.getElementById('dv-' + id).value = String(state.prm[id]);
        document.getElementById('dv-' + id + '-val').textContent = fmt(state.prm[id], 1);
      }
    }
    for (var si = 0; si < SLIDER_IDS.length; si++) {
      (function (id) {
        document.getElementById('dv-' + id).addEventListener('input', function () {
          state.prm[id] = parseFloat(this.value);
          document.getElementById('dv-' + id + '-val').textContent = fmt(state.prm[id], 1);
          render();
        });
      })(SLIDER_IDS[si]);
    }
    var presetBtns = container.querySelectorAll('.dv-preset');
    for (var pb = 0; pb < presetBtns.length; pb++) {
      presetBtns[pb].addEventListener('click', function () {
        state.prm = Object.assign({}, PRESETS[this.getAttribute('data-key')]);
        syncSliders();
        render();
      });
    }
    document.getElementById('dv-tab-primal').addEventListener('click', function () {
      state.view = 'primal';
      this.classList.add('dv-tab-active');
      document.getElementById('dv-tab-dual').classList.remove('dv-tab-active');
      render();
    });
    document.getElementById('dv-tab-dual').addEventListener('click', function () {
      state.view = 'dual';
      this.classList.add('dv-tab-active');
      document.getElementById('dv-tab-primal').classList.remove('dv-tab-active');
      render();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvas(); render(); });
    }

    // ---------- boot ----------
    sizeCanvas();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();