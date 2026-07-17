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
// UI layer — LP duality, compact drag-first design.
// Primal (x-space) and dual (lambda-space) are shown SIDE BY SIDE and update
// together. Interaction happens directly on the primal canvas:
//   * drag a constraint line  -> translates it (changes b_i)
//   * drag the -c arrow head  -> rotates the objective (changes c direction,
//     magnitude preserved) — watch the optimum hop between vertices and
//     lambda* slide along the dual region's boundary in real time
// Active constraints glow; the complementarity chips flip live.
// Sliders remain available under a collapsed "fine-tune" panel.
// All values come from certified DualCore (primal and dual solved
// independently; the gap and the slackness products are live theorem checks).
// Prefix: dv-. Dark island.
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
        '<div class="dv-hint">Drag a <span style="color:' + C.con1 + ';">constraint line</span> to move it ' +
          '(changes b<sub>i</sub>); drag the <span style="color:' + C.level + ';">\u2212c arrow head</span> to rotate ' +
          'the objective and watch x* hop between vertices while \u03BB* slides along the dual region\u2019s edge.</div>' +
        '<div class="dv-canvasrow">' +
          '<div class="dv-canvascell">' +
            '<div class="dv-charttitle">Primal (x-space) \u2014 drag to interact</div>' +
            '<canvas id="dv-canvas-p"></canvas>' +
            '<div class="dv-caption"><span style="color:' + C.con1 + ';">\u25AC</span> a\u2081\u1D40x = b\u2081 &nbsp;' +
              '<span style="color:' + C.con2 + ';">\u25AC</span> a\u2082\u1D40x = b\u2082 &nbsp;' +
              '<span style="color:' + C.level + ';">\u25AC</span> level line & \u2212c &nbsp;' +
              '<span style="color:' + C.optim + ';">\u25CF</span> x* &nbsp;' +
              '<span class="dv-sub">(thick = active constraint)</span></div>' +
          '</div>' +
          '<div class="dv-canvascell">' +
            '<div class="dv-charttitle">Dual (\u03BB-space) \u2014 updates live</div>' +
            '<canvas id="dv-canvas-d"></canvas>' +
            '<div class="dv-caption"><span style="color:' + C.con1 + ';">\u25AC</span> a\u2081\u2081\u03BB\u2081 + a\u2082\u2081\u03BB\u2082 = \u2212c\u2081 &nbsp;' +
              '<span style="color:' + C.con2 + ';">\u25AC</span> a\u2081\u2082\u03BB\u2081 + a\u2082\u2082\u03BB\u2082 = \u2212c\u2082 &nbsp;' +
              '<span style="color:' + C.optim + ';">\u25CF</span> \u03BB*</div>' +
          '</div>' +
        '</div>' +
        '<div id="dv-readouts" class="dv-readouts"></div>' +
        '<div class="dv-bottomrow">' +
          '<div class="dv-btnrow">' +
            '<button class="dv-preset" data-key="corner">Corner optimum</button>' +
            '<button class="dv-preset" data-key="interior">Both constraints active</button>' +
            '<button class="dv-preset" data-key="asym">Asymmetric A</button>' +
          '</div>' +
          '<details class="dv-details"><summary>Fine-tune parameters</summary>' +
            '<div class="dv-slidergrid">' +
              sliderRow('c1', 'c\u2081', -5, 5, 0.5, 3) +
              sliderRow('c2', 'c\u2082', -5, 5, 0.5, 4) +
              sliderRow('c3', 'c\u2083', -20, 20, 1, -20) +
              sliderRow('a11', 'a\u2081\u2081', 0, 4, 0.1, 2) +
              sliderRow('a12', 'a\u2081\u2082', 0, 4, 0.1, 1) +
              sliderRow('b1', 'b\u2081', 2, 20, 0.5, 10) +
              sliderRow('a21', 'a\u2082\u2081', 0, 4, 0.1, 1) +
              sliderRow('a22', 'a\u2082\u2082', 0, 4, 0.1, 3) +
              sliderRow('b2', 'b\u2082', 2, 20, 0.5, 15) +
            '</div>' +
          '</details>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#duality-visualizer .dv-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';margin-bottom:20px;' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#duality-visualizer .dv-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.5;}' +
      '#duality-visualizer .dv-canvasrow{display:flex;gap:14px;flex-wrap:wrap;}' +
      '#duality-visualizer .dv-canvascell{flex:1;min-width:280px;}' +
      '#duality-visualizer canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;width:100%;}' +
      '#duality-visualizer .dv-charttitle{font-size:0.86rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:5px;}' +
      '#duality-visualizer .dv-caption{font-size:0.78rem;color:' + C.faint + ';margin-top:5px;line-height:1.5;}' +
      '#duality-visualizer .dv-readouts{font-size:0.9rem;line-height:1.65;background:rgba(255,255,255,0.03);' +
        'border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;}' +
      '#duality-visualizer .dv-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}' +
      '#duality-visualizer .dv-chip{font-family:"Courier New",monospace;font-size:0.8rem;padding:3px 8px;border-radius:12px;' +
        'border:1px solid ' + C.border + ';background:rgba(255,255,255,0.04);}' +
      '#duality-visualizer .dv-chip-ok{border-color:rgba(46,204,113,0.5);}' +
      '#duality-visualizer .dv-bottomrow{display:flex;flex-direction:column;gap:8px;}' +
      '#duality-visualizer .dv-btnrow{display:flex;flex-wrap:wrap;gap:6px;}' +
      '#duality-visualizer .dv-preset{flex:1;min-width:110px;padding:7px 4px;border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.8rem;}' +
      '#duality-visualizer .dv-preset:hover{background:rgba(255,255,255,0.1);}' +
      '#duality-visualizer .dv-details summary{cursor:pointer;color:' + C.textDim + ';font-size:0.85rem;font-weight:bold;}' +
      '#duality-visualizer .dv-slidergrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px 16px;margin-top:8px;}' +
      '#duality-visualizer .dv-sliderrow label{display:block;font-size:0.82rem;color:' + C.textDim + ';margin-bottom:1px;font-weight:bold;}' +
      '#duality-visualizer .dv-sliderrow input[type=range]{width:100%;}' +
      '#duality-visualizer .dv-sliderrow span{color:' + C.accent + ';font-family:"Courier New",monospace;}' +
      '#duality-visualizer .dv-val{font-family:"Courier New",monospace;color:' + C.accent + ';}' +
      '#duality-visualizer .dv-opt{font-family:"Courier New",monospace;color:' + C.optim + ';}' +
      '#duality-visualizer .dv-ok{color:' + C.ok + ';font-weight:bold;}' +
      '#duality-visualizer .dv-warn{color:' + C.warn + ';font-weight:bold;}' +
      '#duality-visualizer .dv-sub{color:' + C.faint + ';font-size:0.82rem;}';
    document.head.appendChild(style);

    var canvasP = document.getElementById('dv-canvas-p');
    var canvasD = document.getElementById('dv-canvas-d');
    var ctxP = canvasP.getContext('2d');
    var ctxD = canvasD.getContext('2d');
    var readoutsEl = document.getElementById('dv-readouts');

    var PRESETS = {
      corner: { c1: 3, c2: 4, c3: -20, a11: 2, a12: 1, a21: 1, a22: 3, b1: 10, b2: 15 },
      interior: { c1: -3, c2: -4, c3: -20, a11: 2, a12: 1, a21: 1, a22: 3, b1: 10, b2: 15 },
      asym: { c1: -2, c2: -3, c3: 0, a11: 1, a12: 2, a21: 3, a22: 1, b1: 8, b2: 9 }
    };
    var SLIDER_IDS = ['c1', 'c2', 'c3', 'a11', 'a12', 'a21', 'a22', 'b1', 'b2'];

    var state = {
      prm: Object.assign({}, PRESETS.corner),
      cw: 340, ch: 300,
      drag: null,
      lastP: null, lastD: null, lastFrameP: null
    };

    function sizeCanvases() {
      var cellW = canvasP.parentElement ? canvasP.parentElement.clientWidth : 0;
      var w = cellW > 0 ? Math.max(260, Math.min(460, cellW - 4)) : 340;
      state.cw = w;
      state.ch = Math.round(w * 0.88);
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      [canvasP, canvasD].forEach(function (cv) {
        cv.style.height = state.ch + 'px';
        cv.width = Math.round(state.cw * dpr);
        cv.height = Math.round(state.ch * dpr);
        var cx = cv.getContext('2d');
        if (cx && cx.setTransform) cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    }

    // ---------- generic frame ----------
    function frame(ctx, xMin, xMax, yMin, yMax, xLabel, yLabel) {
      var r = { x0: 38, y0: 8, w: state.cw - 38 - 10, h: state.ch - 8 - 28 };
      ctx.clearRect(0, 0, state.cw, state.ch);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, state.cw, state.ch);
      ctx.lineWidth = 1;
      ctx.font = '10px system-ui, sans-serif';
      var ticks = 4;
      for (var i = 0; i <= ticks; i++) {
        var tx = r.x0 + r.w * i / ticks;
        var ty = r.y0 + r.h * i / ticks;
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(tx, r.y0); ctx.lineTo(tx, r.y0 + r.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r.x0, ty); ctx.lineTo(r.x0 + r.w, ty); ctx.stroke();
        ctx.fillStyle = C.faint;
        var xv = xMin + (xMax - xMin) * i / ticks;
        var yv = yMax - (yMax - yMin) * i / ticks;
        ctx.fillText(fmt(xv, xMax - xMin > 8 ? 0 : 1), tx - 7, r.y0 + r.h + 14);
        ctx.fillText(fmt(yv, yMax - yMin > 8 ? 0 : 1), 3, ty + 3);
      }
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(r.x0, r.y0, r.w, r.h);
      ctx.fillStyle = C.textDim;
      ctx.fillText(xLabel, r.x0 + r.w - 7 * xLabel.length, r.y0 + r.h + 24);
      ctx.fillText(yLabel, r.x0 + 3, r.y0 + 10);
      return {
        r: r,
        px: function (x) { return r.x0 + (x - xMin) / (xMax - xMin) * r.w; },
        py: function (y) { return r.y0 + (1 - (y - yMin) / (yMax - yMin)) * r.h; },
        dataX: function (px) { return xMin + (px - r.x0) / r.w * (xMax - xMin); },
        dataY: function (py) { return yMin + (1 - (py - r.y0) / r.h) * (yMax - yMin); },
        xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax
      };
    }
    function drawBoundary(ctx, P, a, b, c, color, width, dash, glow) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
      ctx.beginPath();
      if (Math.abs(b) >= Math.abs(a)) {
        ctx.moveTo(P.px(P.xMin), P.py((c - a * P.xMin) / b));
        ctx.lineTo(P.px(P.xMax), P.py((c - a * P.xMax) / b));
      } else {
        ctx.moveTo(P.px((c - b * P.yMin) / a), P.py(P.yMin));
        ctx.lineTo(P.px((c - b * P.yMax) / a), P.py(P.yMax));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }
    function drawPoly(ctx, P, poly) {
      if (poly.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(P.px(poly[0].x), P.py(poly[0].y));
      for (var i = 1; i < poly.length; i++) ctx.lineTo(P.px(poly[i].x), P.py(poly[i].y));
      ctx.closePath();
      ctx.fillStyle = C.region;
      ctx.fill();
      ctx.strokeStyle = C.regionEdge;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // ---------- render ----------
    function render() {
      var prm = state.prm;
      var P = DualCore.solvePrimal(prm);
      var D = DualCore.solveDual(prm);
      state.lastP = P; state.lastD = D;

      var html = '';
      var expose = { prm: prm, pStatus: P.status, dStatus: D.status };
      if (P.status === 'optimal' && D.status === 'optimal') {
        var gap = Math.abs(P.pstar - D.dstar);
        var ok = gap < 1e-6 * (1 + Math.abs(P.pstar));
        html += '<div>p* = <span class="dv-val">' + fmt(P.pstar, 3) + '</span> = d* ' +
          '<span class="dv-sub">(gap ' + gap.toExponential(1) + ')</span> ' +
          (ok ? '<span class="dv-ok">\u2713 strong duality, verified live</span>'
              : '<span class="dv-warn">gap nonzero \u2014 numerical issue</span>') +
          ' &nbsp; x* = (<span class="dv-opt">' + fmt(P.x.x1, 2) + ', ' + fmt(P.x.x2, 2) + '</span>), ' +
          '\u03BB* = (<span class="dv-opt">' + fmt(D.lambda.l1, 2) + ', ' + fmt(D.lambda.l2, 2) + '</span>), ' +
          '\u03BC* = (<span class="dv-opt">' + fmt(D.mu.m1, 2) + ', ' + fmt(D.mu.m2, 2) + '</span>)</div>';
        var comp = DualCore.complementarity(prm, P, D);
        var chip = function (label, prod) {
          var good = Math.abs(prod) < 1e-6 * (1 + Math.abs(P.pstar));
          return '<span class="dv-chip' + (good ? ' dv-chip-ok' : '') + '">' + label + ' = ' +
            prod.toExponential(1) + ' ' + (good ? '<span class="dv-ok">\u2713</span>' : '<span class="dv-warn">\u2717</span>') + '</span>';
        };
        html += '<div class="dv-chips"><span class="dv-sub" style="align-self:center;">complementary slackness:</span>' +
          chip('\u03BB\u2081s\u2081', comp.ls1) + chip('\u03BB\u2082s\u2082', comp.ls2) +
          chip('\u03BC\u2081(x\u2081\u22121)', comp.mx1) + chip('\u03BC\u2082(x\u2082\u22121)', comp.mx2) + '</div>';
        expose.pstar = P.pstar; expose.dstar = D.dstar; expose.gap = gap;
        expose.x = P.x; expose.lambda = D.lambda; expose.mu = D.mu; expose.comp = comp;
      } else {
        var pTxt = P.status === 'optimal' ? 'p* = <span class="dv-val">' + fmt(P.pstar, 3) + '</span>' :
          (P.status === 'infeasible' ? '<span class="dv-warn">primal infeasible (p* = +\u221E)</span>' :
            '<span class="dv-warn">primal unbounded (p* = \u2212\u221E)</span>');
        var dTxt = D.status === 'optimal' ? 'd* = <span class="dv-val">' + fmt(D.dstar, 3) + '</span>' :
          (D.status === 'infeasible' ? '<span class="dv-warn">dual infeasible (d* = \u2212\u221E)</span>' :
            '<span class="dv-warn">dual unbounded (d* = +\u221E)</span>');
        html += '<div>' + pTxt + ' &nbsp;\u2014&nbsp; ' + dTxt +
          '<div class="dv-sub">LP duality pairs the degenerate cases exactly this way; weak duality d* \u2264 p* survives with the conventions \u00B1\u221E.</div></div>';
        if (P.status === 'optimal') expose.pstar = P.pstar;
        if (D.status === 'optimal') expose.dstar = D.dstar;
      }
      readoutsEl.innerHTML = html;
      container.dataset.dvState = JSON.stringify(expose);

      drawPrimal(prm, P, D);
      drawDual(prm, P, D);
    }

    function primalViewBounds(prm, P) {
      var hps = DualCore.primalHalfplanes(prm);
      var poly = DualCore.feasiblePolygon(hps, 200);
      var mx = 8;
      for (var i = 0; i < poly.length; i++) {
        if (poly[i].x < 60 && poly[i].x > mx) mx = poly[i].x;
        if (poly[i].y < 60 && poly[i].y > mx) mx = poly[i].y;
      }
      if (P.status === 'optimal') mx = Math.max(mx, P.x.x1 + 1, P.x.x2 + 1);
      return { poly: poly, M: Math.min(60, mx * 1.15) };
    }

    function drawPrimal(prm, P, D) {
      var vb = primalViewBounds(prm, P);
      var F = frame(ctxP, 0, vb.M, 0, vb.M, 'x\u2081', 'x\u2082');
      state.lastFrameP = F;
      var hit = {};
      ctxP.save();
      ctxP.beginPath();
      ctxP.rect(F.r.x0, F.r.y0, F.r.w, F.r.h);
      ctxP.clip();
      drawPoly(ctxP, F, vb.poly);
      var s = P.status === 'optimal' ? DualCore.slacks(prm, P.x) : null;
      var act1 = s !== null && Math.abs(s.s1) < 1e-6;
      var act2 = s !== null && Math.abs(s.s2) < 1e-6;
      if (Math.abs(prm.a11) + Math.abs(prm.a12) > 1e-12) {
        drawBoundary(ctxP, F, prm.a11, prm.a12, prm.b1, C.con1, act1 ? 3.5 : 1.6, [], act1);
        hit.line1 = samplePointOnLine(F, prm.a11, prm.a12, prm.b1);
      }
      if (Math.abs(prm.a21) + Math.abs(prm.a22) > 1e-12) {
        drawBoundary(ctxP, F, prm.a21, prm.a22, prm.b2, C.con2, act2 ? 3.5 : 1.6, [], act2);
        hit.line2 = samplePointOnLine(F, prm.a21, prm.a22, prm.b2);
      }
      drawBoundary(ctxP, F, 1, 0, 1, C.boundLine, 1, [4, 4]);
      drawBoundary(ctxP, F, 0, 1, 1, C.boundLine, 1, [4, 4]);
      if (P.status === 'optimal') {
        if (Math.abs(prm.c1) + Math.abs(prm.c2) > 1e-12) {
          drawBoundary(ctxP, F, prm.c1, prm.c2, P.pstar - prm.c3, C.level, 2, [7, 5]);
          var len = Math.hypot(prm.c1, prm.c2);
          var span = vb.M * 0.16;
          var hx = P.x.x1 - prm.c1 / len * span;
          var hy = P.x.x2 - prm.c2 / len * span;
          drawArrowPx(ctxP, F.px(P.x.x1), F.py(P.x.x2), F.px(hx), F.py(hy), C.level);
          ctxP.beginPath();
          ctxP.arc(F.px(hx), F.py(hy), 7, 0, 2 * Math.PI);
          ctxP.fillStyle = 'rgba(255, 200, 87, 0.35)';
          ctxP.fill();
          ctxP.strokeStyle = C.level;
          ctxP.lineWidth = 1.5;
          ctxP.stroke();
          ctxP.font = 'bold 11px system-ui, sans-serif';
          ctxP.fillStyle = C.level;
          ctxP.fillText('\u2212c', F.px(hx) + 8, F.py(hy) - 6);
          hit.arrowHead = { px: F.px(hx), py: F.py(hy) };
        }
        for (var v = 0; v < P.vertices.length; v++) {
          ctxP.beginPath();
          ctxP.arc(F.px(P.vertices[v].x), F.py(P.vertices[v].y), 2.5, 0, 2 * Math.PI);
          ctxP.fillStyle = C.vert;
          ctxP.fill();
        }
        ctxP.beginPath();
        ctxP.arc(F.px(P.x.x1), F.py(P.x.x2), 6, 0, 2 * Math.PI);
        ctxP.fillStyle = C.optim;
        ctxP.fill();
        ctxP.font = 'bold 12px system-ui, sans-serif';
        ctxP.fillText('x*', F.px(P.x.x1) + 8, F.py(P.x.x2) - 8);
      }
      ctxP.restore();
      container.dataset.dvHit = JSON.stringify(hit);
    }
    function samplePointOnLine(F, a, b, c) {
      var xm = (F.xMin + F.xMax) / 2;
      if (Math.abs(b) >= Math.abs(a)) {
        var y = (c - a * xm) / b;
        y = Math.max(F.yMin, Math.min(F.yMax, y));
        var x = Math.abs(a) > 1e-12 ? (c - b * y) / a : xm;
        if (x < F.xMin || x > F.xMax) { x = xm; y = (c - a * xm) / b; }
        return { px: F.px(x), py: F.py(y) };
      }
      var ym = (F.yMin + F.yMax) / 2;
      return { px: F.px((c - b * ym) / a), py: F.py(ym) };
    }
    function drawArrowPx(ctx, x0, y0, x1, y1, color) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      var ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 9 * Math.cos(ang - 0.4), y1 - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(x1 - 9 * Math.cos(ang + 0.4), y1 - 9 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    function drawDual(prm, P, D) {
      var hps = DualCore.dualHalfplanes(prm);
      var poly = DualCore.feasiblePolygon(hps, 200);
      var cand = [3];
      if (D.status === 'optimal') cand.push(2.2 * D.lambda.l1 + 0.5, 2.2 * D.lambda.l2 + 0.5);
      [[prm.a11, -prm.c1], [prm.a21, -prm.c1], [prm.a12, -prm.c2], [prm.a22, -prm.c2]]
        .forEach(function (t) { if (t[0] > 0.05 && t[1] > 0) cand.push(t[1] / t[0] + 0.5); });
      var M = Math.min(20, Math.max.apply(null, cand));
      var F = frame(ctxD, -0.1, M, -0.1, M, '\u03BB\u2081', '\u03BB\u2082');
      ctxD.save();
      ctxD.beginPath();
      ctxD.rect(F.r.x0, F.r.y0, F.r.w, F.r.h);
      ctxD.clip();
      drawPoly(ctxD, F, poly);
      if (Math.abs(prm.a11) + Math.abs(prm.a21) > 1e-12) drawBoundary(ctxD, F, prm.a11, prm.a21, -prm.c1, C.con1, 1.6, []);
      if (Math.abs(prm.a12) + Math.abs(prm.a22) > 1e-12) drawBoundary(ctxD, F, prm.a12, prm.a22, -prm.c2, C.con2, 1.6, []);
      drawBoundary(ctxD, F, 1, 0, 0, C.boundLine, 1, [4, 4]);
      drawBoundary(ctxD, F, 0, 1, 0, C.boundLine, 1, [4, 4]);
      var d1 = (prm.a11 + prm.a12) - prm.b1;
      var d2 = (prm.a21 + prm.a22) - prm.b2;
      if (D.status === 'optimal') {
        if (Math.abs(d1) + Math.abs(d2) > 1e-12) {
          drawBoundary(ctxD, F, d1, d2, d1 * D.lambda.l1 + d2 * D.lambda.l2, C.level, 2, [7, 5]);
        }
        for (var v = 0; v < D.vertices.length; v++) {
          ctxD.beginPath();
          ctxD.arc(F.px(D.vertices[v].x), F.py(D.vertices[v].y), 2.5, 0, 2 * Math.PI);
          ctxD.fillStyle = C.vert;
          ctxD.fill();
        }
        ctxD.beginPath();
        ctxD.arc(F.px(D.lambda.l1), F.py(D.lambda.l2), 6, 0, 2 * Math.PI);
        ctxD.fillStyle = C.optim;
        ctxD.fill();
        ctxD.font = 'bold 12px system-ui, sans-serif';
        ctxD.fillText('\u03BB*', F.px(D.lambda.l1) + 8, F.py(D.lambda.l2) - 8);
      }
      ctxD.restore();
    }

    // ---------- drag interaction on the primal canvas ----------
    function pointerPx(ev) {
      var rect = canvasP.getBoundingClientRect();
      var cx = (ev.touches && ev.touches.length ? ev.touches[0].clientX : ev.clientX) - rect.left;
      var cy = (ev.touches && ev.touches.length ? ev.touches[0].clientY : ev.clientY) - rect.top;
      return { px: cx, py: cy };
    }
    function distToLinePx(F, a, b, c, p) {
      var p1, p2;
      if (Math.abs(b) >= Math.abs(a)) {
        p1 = { x: F.xMin, y: (c - a * F.xMin) / b };
        p2 = { x: F.xMax, y: (c - a * F.xMax) / b };
      } else {
        p1 = { x: (c - b * F.yMin) / a, y: F.yMin };
        p2 = { x: (c - b * F.yMax) / a, y: F.yMax };
      }
      var x1 = F.px(p1.x), y1 = F.py(p1.y), x2 = F.px(p2.x), y2 = F.py(p2.y);
      var dx = x2 - x1, dy = y2 - y1;
      var L2 = dx * dx + dy * dy;
      if (L2 < 1e-9) return Infinity;
      var t = ((p.px - x1) * dx + (p.py - y1) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.px - (x1 + t * dx), p.py - (y1 + t * dy));
    }
    function hitTest(p) {
      var F = state.lastFrameP;
      if (!F) return null;
      var hitData = container.dataset.dvHit ? JSON.parse(container.dataset.dvHit) : {};
      if (hitData.arrowHead && Math.hypot(p.px - hitData.arrowHead.px, p.py - hitData.arrowHead.py) < 14) return 'arrow';
      var prm = state.prm;
      if (Math.abs(prm.a11) + Math.abs(prm.a12) > 1e-12 &&
          distToLinePx(F, prm.a11, prm.a12, prm.b1, p) < 8) return 'b1';
      if (Math.abs(prm.a21) + Math.abs(prm.a22) > 1e-12 &&
          distToLinePx(F, prm.a21, prm.a22, prm.b2, p) < 8) return 'b2';
      return null;
    }
    function applyDrag(mode, p) {
      var F = state.lastFrameP;
      if (!F) return;
      var dx = F.dataX(p.px), dy = F.dataY(p.py);
      var prm = state.prm;
      if (mode === 'arrow') {
        if (!state.lastP || state.lastP.status !== 'optimal') return;
        var ox = state.lastP.x.x1, oy = state.lastP.x.x2;
        var vx = dx - ox, vy = dy - oy;      // pointer direction = -c direction
        var vlen = Math.hypot(vx, vy);
        if (vlen < 1e-6) return;
        var mag = Math.hypot(prm.c1, prm.c2);
        if (mag < 0.5) mag = 3;
        var nc1 = -vx / vlen * mag, nc2 = -vy / vlen * mag;
        var over = Math.max(Math.abs(nc1), Math.abs(nc2)) / 5;
        if (over > 1) { nc1 /= over; nc2 /= over; }
        prm.c1 = Math.round(nc1 * 2) / 2;   // snap to the slider step 0.5
        prm.c2 = Math.round(nc2 * 2) / 2;
      } else if (mode === 'b1') {
        var nb1 = prm.a11 * dx + prm.a12 * dy;
        prm.b1 = Math.max(2, Math.min(20, Math.round(nb1 * 2) / 2));
      } else if (mode === 'b2') {
        var nb2 = prm.a21 * dx + prm.a22 * dy;
        prm.b2 = Math.max(2, Math.min(20, Math.round(nb2 * 2) / 2));
      }
      syncSliders();
      render();
    }
    function onDown(ev) {
      var p = pointerPx(ev);
      var mode = hitTest(p);
      if (mode) {
        state.drag = mode;
        canvasP.style.cursor = 'grabbing';
        applyDrag(mode, p);
        if (ev.preventDefault) ev.preventDefault();
      }
    }
    function onMove(ev) {
      var p = pointerPx(ev);
      if (state.drag) {
        applyDrag(state.drag, p);
        if (ev.preventDefault) ev.preventDefault();
      } else {
        canvasP.style.cursor = hitTest(p) ? 'grab' : 'default';
      }
    }
    function onUp() {
      state.drag = null;
      canvasP.style.cursor = 'default';
    }
    canvasP.addEventListener('mousedown', onDown);
    canvasP.addEventListener('mousemove', onMove);
    canvasP.addEventListener('touchstart', onDown, { passive: false });
    canvasP.addEventListener('touchmove', onMove, { passive: false });
    if (typeof window !== 'undefined') {
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
    }

    // ---------- sliders / presets ----------
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

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvases(); render(); });
    }

    // ---------- boot ----------
    sizeCanvases();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();