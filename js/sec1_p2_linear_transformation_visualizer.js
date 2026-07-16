// ============================================================================
// LtCore — math core for the Linear Transformation Visualizer (linalg-2)
// DOM-free, Node-requirable. All matrices are 2x2 arrays [[a,b],[c,d]].
// All displayed quantities (det, basis images, area, rank/kernel/image,
// onto / one-to-one status, grid polylines) are computed HERE and certified
// by runSelfTests(); the UI layer only renders what this core returns.
// ============================================================================
var LtCore = (function () {
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

  // ---------- basic 2x2 / vector operations ----------
  var I = [[1, 0], [0, 1]];

  function apply(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1],
            M[1][0] * v[0] + M[1][1] * v[1]];
  }

  function matmul(A, B) {
    return [
      [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
      [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
    ];
  }

  function det(M) {
    return M[0][0] * M[1][1] - M[0][1] * M[1][0];
  }

  // j-th column of M — the image of the j-th standard basis vector.
  // (colOf(M, j) must agree bitwise with apply(M, e_j); certified in T11.)
  function colOf(M, j) {
    return [M[0][j], M[1][j]];
  }

  // Linear interpolation (1-t) I + t M — the animation path.
  // t=0 and t=1 reproduce I and M bitwise (certified in T5).
  function lerp(M, t) {
    if (t === 0) return [[1, 0], [0, 1]];
    if (t === 1) return [[M[0][0], M[0][1]], [M[1][0], M[1][1]]];
    var u = 1 - t;
    return [
      [u * 1 + t * M[0][0], u * 0 + t * M[0][1]],
      [u * 0 + t * M[1][0], u * 1 + t * M[1][1]]
    ];
  }

  // ---------- rank classification (the theorem layer) ----------
  // For T(x) = Mx with M 2x2:
  //   rank 2  <=>  columns independent AND columns span R^2
  //           <=>  T one-to-one AND onto            (the page's two theorems)
  //   rank 1  ->  image = a line (not onto), kernel = a line (not one-to-one)
  //   rank 0  ->  image = {0}, kernel = R^2
  // Tolerance is relative: entries scale det quadratically, so the det
  // threshold scales with s^2 (s = max |entry|).
  function classifyRank(M) {
    var a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1];
    var s = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
    if (s <= 1e-12) {
      return { rank: 0, det: 0, kernel: null, image: null };
    }
    var dt = a * d - b * c;
    var tol = 1e-9 * Math.max(1, s * s);
    if (Math.abs(dt) > tol) {
      return { rank: 2, det: dt, kernel: null, image: null };
    }
    // rank 1: kernel direction from the larger row (a x + b y = 0 -> (b,-a)),
    // image direction = the larger column. Larger row/column chosen for
    // float stability; for a genuine rank-1 matrix either choice is valid
    // (rows proportional, columns proportional).
    var kx, ky;
    if (Math.hypot(a, b) >= Math.hypot(c, d)) { kx = b; ky = -a; }
    else { kx = d; ky = -c; }
    var kn = Math.hypot(kx, ky);
    var ix, iy;
    if (Math.hypot(a, c) >= Math.hypot(b, d)) { ix = a; iy = c; }
    else { ix = b; iy = d; }
    var inn = Math.hypot(ix, iy);
    return {
      rank: 1, det: dt,
      kernel: [kx / kn, ky / kn],
      image: [ix / inn, iy / inn]
    };
  }

  // Map rank -> the two properties the page's theorems characterize.
  // (2x2 square case: columns span R^2 <=> columns independent.)
  function mapProperties(rank) {
    return { onto: rank === 2, oneToOne: rank === 2 };
  }

  // ---------- polygons / area ----------
  // Signed shoelace area. CCW positive.
  function shoelace(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return 0.5 * s;
  }

  function transformPoly(M, pts, t) {
    var L = lerp(M, t === undefined ? 1 : t);
    var out = [];
    for (var i = 0; i < pts.length; i++) out.push(apply(L, pts[i]));
    return out;
  }

  // Unit square, CCW (positive orientation): its image under M is the
  // parallelogram spanned by the columns, with signed area det(M).
  var UNIT_SQUARE = [[0, 0], [1, 0], [1, 1], [0, 1]];

  // ---------- shapes (single source of truth; page prose pins these) ----------
  var SHAPES = {
    square:    [[1, 1], [3, 1], [3, 3], [1, 3]],
    triangle:  [[2, 3.5], [0.5, 1], [3.5, 1]],
    rectangle: [[0.5, 1], [3.5, 1], [3.5, 2.5], [0.5, 2.5]],
    pentagon:  [[2, 3.5], [0.811, 2.636], [1.265, 1.239], [2.735, 1.239], [3.189, 2.636]]
  };

  // ---------- presets (single source; UI builds the <select> from this) ----------
  // Rotation direction is a CONVENTION: pinned by value in T1/T2.
  // "90° clockwise" maps e1=(1,0) to (0,-1).
  var PRESETS = [
    { key: 'identity',      label: 'Identity (no change)',        m: [[1, 0], [0, 1]] },
    { key: 'rotate90CW',    label: 'Rotate 90\u00B0 clockwise',        m: [[0, 1], [-1, 0]] },
    { key: 'rotate90CCW',   label: 'Rotate 90\u00B0 counterclockwise', m: [[0, -1], [1, 0]] },
    { key: 'rotate180',     label: 'Rotate 180\u00B0',                 m: [[-1, 0], [0, -1]] },
    { key: 'scale2',        label: 'Scale by 2',                  m: [[2, 0], [0, 2]] },
    { key: 'scaleX',        label: 'Scale X by 2',                m: [[2, 0], [0, 1]] },
    { key: 'scaleY',        label: 'Scale Y by 2',                m: [[1, 0], [0, 2]] },
    { key: 'reflectX',      label: 'Reflect across X-axis',       m: [[1, 0], [0, -1]] },
    { key: 'reflectY',      label: 'Reflect across Y-axis',       m: [[-1, 0], [0, 1]] },
    { key: 'reflectOrigin', label: 'Reflect through origin',      m: [[-1, 0], [0, -1]] },
    { key: 'projectX',      label: 'Project onto X-axis (det = 0)', m: [[1, 0], [0, 0]] },
    { key: 'shearX',        label: 'Shear X',                     m: [[1, 1], [0, 1]] },
    { key: 'shearY',        label: 'Shear Y',                     m: [[1, 0], [1, 1]] }
  ];

  function presetByKey(key) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].key === key) return PRESETS[i];
    return null;
  }

  // ---------- grid ----------
  // The image of the grid line {x = k} under L = lerp(M,t) is the straight
  // line { L(k, y) : y in R } — linearity means two endpoints determine it,
  // and the whole family stays parallel (direction L e2) and evenly spaced
  // (consecutive lines differ by exactly L e1). Certified in T7.
  function gridPolyline(M, family, k, half, t) {
    var L = lerp(M, t === undefined ? 1 : t);
    if (family === 'v') {
      return [apply(L, [k, -half]), apply(L, [k, half])];
    }
    return [apply(L, [-half, k]), apply(L, [half, k])];
  }

  // ---------- world <-> canvas mapping ----------
  // Isotropic: the y half-range is anchored (VIEW_HALF_Y world units), the
  // x half-range adapts to the aspect ratio; one scale for both axes.
  var VIEW_HALF_Y = 7;

  function makeView(pw, ph) {
    var scale = ph / (2 * VIEW_HALF_Y);
    return { cx: pw / 2, cy: ph / 2, scale: scale, halfX: (pw / 2) / scale, halfY: VIEW_HALF_Y };
  }

  function worldToCanvas(view, p) {
    return [view.cx + p[0] * view.scale, view.cy - p[1] * view.scale];
  }

  function canvasToWorld(view, q) {
    return [(q[0] - view.cx) / view.scale, (view.cy - q[1]) / view.scale];
  }

  // ---------- matrix-entry parsing (no silent zeros) ----------
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
    function vecClose(u, v, tol) {
      return Math.abs(u[0] - v[0]) <= tol && Math.abs(u[1] - v[1]) <= tol;
    }
    function matEq(A, B) {
      return A[0][0] === B[0][0] && A[0][1] === B[0][1] &&
             A[1][0] === B[1][0] && A[1][1] === B[1][1];
    }
    function cross(u, v) { return u[0] * v[1] - u[1] * v[0]; }
    // parallel up to sign, for normalized directions
    function parallel(u, v, tol) { return Math.abs(cross(u, v)) <= tol; }

    // ---- T1: preset value pins (conventions frozen by VALUE) ----
    var pinsT1 = {
      identity: [[1, 0], [0, 1]],
      rotate90CW: [[0, 1], [-1, 0]],
      rotate90CCW: [[0, -1], [1, 0]],
      rotate180: [[-1, 0], [0, -1]],
      scale2: [[2, 0], [0, 2]],
      scaleX: [[2, 0], [0, 1]],
      scaleY: [[1, 0], [0, 2]],
      reflectX: [[1, 0], [0, -1]],
      reflectY: [[-1, 0], [0, 1]],
      reflectOrigin: [[-1, 0], [0, -1]],
      projectX: [[1, 0], [0, 0]],
      shearX: [[1, 1], [0, 1]],
      shearY: [[1, 0], [1, 1]]
    };
    var pinKeys = Object.keys(pinsT1);
    check('T1 preset count', PRESETS.length === pinKeys.length, PRESETS.length);
    for (var i1 = 0; i1 < pinKeys.length; i1++) {
      var pk = pinKeys[i1], pr = presetByKey(pk);
      check('T1 preset ' + pk + ' exists', !!pr);
      if (pr) check('T1 preset ' + pk + ' value', matEq(pr.m, pinsT1[pk]));
    }

    // ---- T2: rotation convention + composition pins ----
    var CW = presetByKey('rotate90CW').m, CCW = presetByKey('rotate90CCW').m;
    check('T2 CW e1 -> (0,-1)', vecClose(apply(CW, [1, 0]), [0, -1], 0));
    check('T2 CCW e1 -> (0,1)', vecClose(apply(CCW, [1, 0]), [0, 1], 0));
    check('T2 CW o CW = rot180', matEq(matmul(CW, CW), presetByKey('rotate180').m));
    check('T2 CW o CCW = I', matEq(matmul(CW, CCW), I));

    // ---- T3: determinant pins + multiplicativity ----
    check('T3 det I = 1', det(I) === 1);
    check('T3 det scale2 = 4', det(presetByKey('scale2').m) === 4);
    check('T3 det reflectX = -1', det(presetByKey('reflectX').m) === -1);
    check('T3 det shearX = 1', det(presetByKey('shearX').m) === 1);
    check('T3 det projectX = 0', det(presetByKey('projectX').m) === 0);
    var rng3 = makeRng(11001);
    function randMat(rng) {
      return [[4 * rng() - 2, 4 * rng() - 2], [4 * rng() - 2, 4 * rng() - 2]];
    }
    for (var i3 = 0; i3 < 20; i3++) {
      var A3 = randMat(rng3), B3 = randMat(rng3);
      var lhs = det(matmul(A3, B3)), rhs = det(A3) * det(B3);
      check('T3 det(AB)=det(A)det(B) #' + i3,
        Math.abs(lhs - rhs) <= 1e-12 * (1 + Math.abs(rhs)), lhs - rhs);
    }

    // ---- T4: linearity identity + affine NEGATIVE control ----
    var rng4 = makeRng(11002);
    for (var i4 = 0; i4 < 20; i4++) {
      var M4 = randMat(rng4);
      var u4 = [4 * rng4() - 2, 4 * rng4() - 2];
      var v4 = [4 * rng4() - 2, 4 * rng4() - 2];
      var a4 = 4 * rng4() - 2, b4 = 4 * rng4() - 2;
      var w = [a4 * u4[0] + b4 * v4[0], a4 * u4[1] + b4 * v4[1]];
      var Tw = apply(M4, w);
      var Tu = apply(M4, u4), Tv = apply(M4, v4);
      var comb = [a4 * Tu[0] + b4 * Tv[0], a4 * Tu[1] + b4 * Tv[1]];
      check('T4 T(au+bv)=aTu+bTv #' + i4, vecClose(Tw, comb, 1e-12 * 32));
    }
    // negative control: an affine map S(x) = Mx + t (t != 0) VIOLATES the identity
    (function () {
      var Mn = [[1, 2], [0, 1]], tn = [0.5, -0.3];
      function affine(v) { var r = apply(Mn, v); return [r[0] + tn[0], r[1] + tn[1]]; }
      var u = [1, 0], v = [0, 1], a = 2, b = 3;
      var lhsA = affine([a * u[0] + b * v[0], a * u[1] + b * v[1]]);
      var Su = affine(u), Sv = affine(v);
      var rhsA = [a * Su[0] + b * Sv[0], a * Su[1] + b * Sv[1]];
      var viol = Math.hypot(lhsA[0] - rhsA[0], lhsA[1] - rhsA[1]);
      check('T4n affine map breaks linearity (>= 0.1)', viol >= 0.1, viol);
    })();

    // ---- T5: lerp endpoints bitwise + mid-path pins ----
    var M5 = [[0.5, -1.25], [2, 3]];
    check('T5 lerp t=0 is I (exact)', matEq(lerp(M5, 0), I));
    check('T5 lerp t=1 is M (exact)', matEq(lerp(M5, 1), M5));
    // asymmetric t (t=0.5 has u=t, which would hide a u/t swap mutant);
    // all pinned values are dyadic, so the comparison is exact
    var q5 = lerp(M5, 0.25);
    check('T5 lerp t=0.25 value pin', matEq(q5, [[0.875, -0.3125], [0.5, 1.5]]));
    check('T5 rotate180 collapses at t=0.5',
      det(lerp(presetByKey('rotate180').m, 0.5)) === 0);

    // ---- T6: |det| = area, sign = orientation (unit square image) ----
    for (var i6 = 0; i6 < PRESETS.length; i6++) {
      var P6 = PRESETS[i6];
      var ar = shoelace(transformPoly(P6.m, UNIT_SQUARE, 1));
      check('T6 area(square image) = det, preset ' + P6.key,
        Math.abs(ar - det(P6.m)) <= 1e-12, ar);
    }
    var rng6 = makeRng(11003);
    for (var j6 = 0; j6 < 20; j6++) {
      var M6 = randMat(rng6);
      var ar6 = shoelace(transformPoly(M6, UNIT_SQUARE, 1));
      var d6 = det(M6);
      check('T6 area = det random #' + j6,
        Math.abs(ar6 - d6) <= 1e-12 * (1 + Math.abs(d6)), ar6 - d6);
    }
    check('T6 unit square CCW (area +1 under I)',
      shoelace(transformPoly(I, UNIT_SQUARE, 1)) === 1);

    // ---- T7: grid family — parallel + evenly spaced + nonlinear NEGATIVE control ----
    var rng7 = makeRng(11004);
    var M7 = randMat(rng7);
    while (Math.abs(det(M7)) < 0.2) M7 = randMat(rng7);
    var t7 = 0.7, L7 = lerp(M7, t7);
    var Le1 = apply(L7, [1, 0]), Le2 = apply(L7, [0, 1]);
    function dirOf(seg) {
      var d = [seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]];
      var n = Math.hypot(d[0], d[1]); return [d[0] / n, d[1] / n];
    }
    for (var k7 = -3; k7 <= 3; k7++) {
      var segV = gridPolyline(M7, 'v', k7, 7, t7);
      var segH = gridPolyline(M7, 'h', k7, 7, t7);
      var nLe2 = Math.hypot(Le2[0], Le2[1]), nLe1 = Math.hypot(Le1[0], Le1[1]);
      check('T7 v-line ' + k7 + ' parallel to L e2',
        parallel(dirOf(segV), [Le2[0] / nLe2, Le2[1] / nLe2], 1e-12));
      check('T7 h-line ' + k7 + ' parallel to L e1',
        parallel(dirOf(segH), [Le1[0] / nLe1, Le1[1] / nLe1], 1e-12));
      // even spacing: line k+1 = line k shifted by exactly L e1 (v) / L e2 (h)
      var segV2 = gridPolyline(M7, 'v', k7 + 1, 7, t7);
      var segH2 = gridPolyline(M7, 'h', k7 + 1, 7, t7);
      check('T7 v spacing k=' + k7, vecClose(
        [segV2[0][0] - segV[0][0], segV2[0][1] - segV[0][1]], Le1, 1e-12));
      check('T7 h spacing k=' + k7, vecClose(
        [segH2[0][0] - segH[0][0], segH2[0][1] - segH[0][1]], Le2, 1e-12));
    }
    // absolute-position pin (parallel/spacing tests are shift-invariant)
    var gp = gridPolyline(I, 'v', 2, 7, 1);
    check('T7 v-line absolute position pin', JSON.stringify(gp) ===
      JSON.stringify([[2, -7], [2, 7]]));
    var gph = gridPolyline(I, 'h', -3, 7, 1);
    check('T7 h-line absolute position pin', JSON.stringify(gph) ===
      JSON.stringify([[-7, -3], [7, -3]]));
    // negative control: a NONLINEAR point map bends a straight line —
    // midpoint leaves the chord by a measurable margin
    (function () {
      function nl(p) { return [p[0] + 0.1 * p[0] * p[0], p[1]]; }
      var a = nl([-7, 2]), b = nl([7, 2]), m = nl([0, 2]);
      var chordMid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      var dev = Math.hypot(m[0] - chordMid[0], m[1] - chordMid[1]);
      check('T7n nonlinear map bends grid lines (dev >= 0.05)', dev >= 0.05, dev);
      // sanity: the LINEAR pipeline keeps the midpoint on the chord exactly
      var seg = gridPolyline(M7, 'v', 2, 7, t7);
      var lm = apply(L7, [2, 0]);
      var cm = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
      check('T7 linear midpoint on chord', vecClose(lm, cm, 1e-12));
    })();

    // ---- T8: rank classification (theorem layer) ----
    for (var i8 = 0; i8 < PRESETS.length; i8++) {
      if (PRESETS[i8].key === 'projectX') continue;
      check('T8 preset ' + PRESETS[i8].key + ' rank 2',
        classifyRank(PRESETS[i8].m).rank === 2);
    }
    function checkRank1(name, M, kerDir, imgDir) {
      var c = classifyRank(M);
      check('T8 ' + name + ' rank 1', c.rank === 1, c.rank);
      if (c.rank !== 1) return;
      check('T8 ' + name + ' kernel dir', parallel(c.kernel, kerDir, 1e-9));
      check('T8 ' + name + ' image dir', parallel(c.image, imgDir, 1e-9));
      var Mk = apply(M, c.kernel);
      check('T8 ' + name + ' M*kernel = 0', Math.hypot(Mk[0], Mk[1]) <= 1e-9);
    }
    var s2 = Math.SQRT1_2;
    checkRank1('projectX', [[1, 0], [0, 0]], [0, 1], [1, 0]);
    checkRank1('ones', [[1, 1], [1, 1]], [s2, -s2], [s2, s2]);
    checkRank1('[[2,4],[1,2]]', [[2, 4], [1, 2]], [2, -1], [2, 1]);
    checkRank1('zero first column', [[0, 1], [0, 2]], [1, 0], [1, 2]);
    // float-noise singular: rows proportional (x3), columns proportional (x7),
    // but the float det is ~2.8e-17, NOT exactly 0 — the tolerance is load-bearing
    check('T8 float-noise det is nonzero (test is load-bearing)',
      det([[0.1, 0.7], [0.3, 2.1]]) !== 0);
    checkRank1('float-noise singular', [[0.1, 0.7], [0.3, 2.1]], [7, -1], [1, 3]);
    check('T8 zero matrix rank 0', classifyRank([[0, 0], [0, 0]]).rank === 0);
    check('T8 tiny but genuine det -> rank 2',
      classifyRank([[1, 0], [0, 1e-6]]).rank === 2);
    check('T8 small uniform matrix is NOT rank 0',
      classifyRank([[1e-4, 0], [0, 1e-4]]).rank === 2);
    // property mapping (page's two theorems, 2x2 case)
    var p2 = mapProperties(2), p1 = mapProperties(1), p0 = mapProperties(0);
    check('T8 rank2 -> onto & one-to-one', p2.onto === true && p2.oneToOne === true);
    check('T8 rank1 -> neither', p1.onto === false && p1.oneToOne === false);
    check('T8 rank0 -> neither', p0.onto === false && p0.oneToOne === false);

    // ---- T9: shape pins (page prose consistency) + view-fit story test ----
    check('T9 square vertices pin', JSON.stringify(SHAPES.square) ===
      JSON.stringify([[1, 1], [3, 1], [3, 3], [1, 3]]));
    check('T9 triangle vertices pin', JSON.stringify(SHAPES.triangle) ===
      JSON.stringify([[2, 3.5], [0.5, 1], [3.5, 1]]));
    check('T9 rectangle vertices pin', JSON.stringify(SHAPES.rectangle) ===
      JSON.stringify([[0.5, 1], [3.5, 1], [3.5, 2.5], [0.5, 2.5]]));
    check('T9 pentagon vertices pin', JSON.stringify(SHAPES.pentagon) ===
      JSON.stringify([[2, 3.5], [0.811, 2.636], [1.265, 1.239], [2.735, 1.239], [3.189, 2.636]]));
    // every preset x shape stays inside the anchored view half-range (y; x is >= y half)
    var shapeKeys = Object.keys(SHAPES);
    for (var i9 = 0; i9 < PRESETS.length; i9++) {
      for (var j9 = 0; j9 < shapeKeys.length; j9++) {
        var poly9 = transformPoly(PRESETS[i9].m, SHAPES[shapeKeys[j9]], 1);
        var ok9 = true;
        for (var k9 = 0; k9 < poly9.length; k9++) {
          if (Math.abs(poly9[k9][0]) > VIEW_HALF_Y + 1e-9 ||
              Math.abs(poly9[k9][1]) > VIEW_HALF_Y + 1e-9) ok9 = false;
        }
        check('T9 fit ' + PRESETS[i9].key + ' x ' + shapeKeys[j9], ok9);
      }
    }

    // ---- T10: world <-> canvas mapping ----
    var view = makeView(600, 600);
    check('T10 origin -> center', JSON.stringify(worldToCanvas(view, [0, 0])) ===
      JSON.stringify([300, 300]));
    var upx = worldToCanvas(view, [1, 0]), upy = worldToCanvas(view, [0, 1]);
    check('T10 unit x spacing', Math.abs((upx[0] - 300) - view.scale) <= 1e-9 && upx[1] === 300);
    check('T10 y-flip (world +y goes UP on canvas)', upy[1] < 300 && upy[0] === 300);
    check('T10 isotropy (halfY anchored)', view.halfY === VIEW_HALF_Y &&
      Math.abs(view.halfX - VIEW_HALF_Y) <= 1e-12);
    var rt = canvasToWorld(view, worldToCanvas(view, [2.3, -4.7]));
    check('T10 round trip', vecClose(rt, [2.3, -4.7], 1e-12));

    // ---- T11: basis readout path — column j IS the image of e_j (bitwise) ----
    var rng11 = makeRng(11005);
    for (var i11 = 0; i11 < 10; i11++) {
      var M11 = randMat(rng11);
      var c0 = colOf(M11, 0), c1 = colOf(M11, 1);
      var a0 = apply(M11, [1, 0]), a1 = apply(M11, [0, 1]);
      check('T11 col0 = M e1 bitwise #' + i11, c0[0] === a0[0] && c0[1] === a0[1]);
      check('T11 col1 = M e2 bitwise #' + i11, c1[0] === a1[0] && c1[1] === a1[1]);
    }

    // ---- T12: entry parsing (no silent zeros) ----
    check('T12 "2" -> 2', parseEntry('2').ok && parseEntry('2').value === 2);
    check('T12 "-0.5" -> -0.5', parseEntry('-0.5').ok && parseEntry('-0.5').value === -0.5);
    check('T12 "1e2" -> 100', parseEntry('1e2').ok && parseEntry('1e2').value === 100);
    check('T12 " 3 " -> 3', parseEntry(' 3 ').ok && parseEntry(' 3 ').value === 3);
    check('T12 "" rejected', parseEntry('').ok === false);
    check('T12 "-" rejected', parseEntry('-').ok === false);
    check('T12 "1,5" rejected', parseEntry('1,5').ok === false);
    check('T12 "Infinity" rejected', parseEntry('Infinity').ok === false);
    check('T12 non-string rejected', parseEntry(3).ok === false);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  return {
    I: I,
    PRESETS: PRESETS,
    SHAPES: SHAPES,
    UNIT_SQUARE: UNIT_SQUARE,
    VIEW_HALF_Y: VIEW_HALF_Y,
    makeRng: makeRng,
    apply: apply,
    matmul: matmul,
    det: det,
    colOf: colOf,
    lerp: lerp,
    classifyRank: classifyRank,
    mapProperties: mapProperties,
    shoelace: shoelace,
    transformPoly: transformPoly,
    gridPolyline: gridPolyline,
    makeView: makeView,
    worldToCanvas: worldToCanvas,
    canvasToWorld: canvasToWorld,
    parseEntry: parseEntry,
    presetByKey: presetByKey,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = LtCore; }
// ============================================================================
// UI layer — renders only what LtCore computes. Gate: the demo refuses to
// render if runSelfTests() fails. Prefix: ltv-. Dark island (fixed palette).
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
    gridOrig: 'rgba(255, 255, 255, 0.08)',
    axisOrig: 'rgba(255, 255, 255, 0.22)',
    gridT: 'rgba(100, 180, 255, 0.30)',
    axisT: 'rgba(100, 180, 255, 0.75)',
    shapeOrigStroke: '#8a93a0',
    shapeOrigFill: 'rgba(153, 153, 153, 0.10)',
    shapeStroke: '#42a5f5',
    shapeFill: 'rgba(66, 165, 245, 0.25)',
    basis1: '#2ecc71',
    basis2: '#ab47bc',
    unitPosStroke: '#ffc857',
    unitPosFill: 'rgba(255, 200, 87, 0.25)',
    unitNegStroke: '#e74c3c',
    unitNegFill: 'rgba(231, 76, 60, 0.28)',
    imageLine: '#26c6da',
    kernelLine: '#ff7043',
    bad: '#ef5350'
  };

  var SHAPE_LABELS = [
    { key: 'square', label: 'Square' },
    { key: 'triangle', label: 'Triangle' },
    { key: 'rectangle', label: 'Rectangle' },
    { key: 'pentagon', label: 'Pentagon' }
  ];

  function fmt(x, d) { return (Object.is(x, -0) ? 0 : x).toFixed(d); }

  function init() {
    var container = document.getElementById('linear-transformation-visualizer');
    if (!container) return;
    if (container.dataset.ltvInit) return;
    container.dataset.ltvInit = '1';

    // ---------- self-test gate: broken math never renders ----------
    var gate = LtCore.runSelfTests();
    if (!gate.pass) {
      var list = '';
      var shown = gate.failures.slice(0, 10);
      for (var gi = 0; gi < shown.length; gi++) {
        list += '<li>' + shown[gi].replace(/</g, '&lt;') + '</li>';
      }
      container.innerHTML =
        '<div class="ltv-refusal" style="background:' + C.panel + ';border:1px solid ' + C.bad +
        ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
        '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
        gate.failures.length + ' of ' + gate.count + ' checks).</strong>' +
        '<p style="color:' + C.textDim + ';margin:8px 0 4px;">The visualizer refuses to render ' +
        'rather than display incorrect mathematics. Failures:</p>' +
        '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
      return;
    }

    // ---------- DOM ----------
    var presetOpts = '';
    for (var pi = 0; pi < LtCore.PRESETS.length; pi++) {
      presetOpts += '<option value="' + LtCore.PRESETS[pi].key + '">' +
        LtCore.PRESETS[pi].label + '</option>';
    }
    var shapeOpts = '';
    for (var si = 0; si < SHAPE_LABELS.length; si++) {
      shapeOpts += '<option value="' + SHAPE_LABELS[si].key + '">' +
        SHAPE_LABELS[si].label + '</option>';
    }

    container.innerHTML =
      '<div class="ltv-root">' +
        '<div class="ltv-controls">' +
          '<div class="ltv-group">' +
            '<label for="ltv-preset">Preset transformations:</label>' +
            '<select id="ltv-preset" class="ltv-full">' + presetOpts + '</select>' +
          '</div>' +
          '<div class="ltv-group">' +
            '<label for="ltv-shape">Shape:</label>' +
            '<select id="ltv-shape" class="ltv-full">' + shapeOpts + '</select>' +
          '</div>' +
          '<div class="ltv-group">' +
            '<label>Matrix A:</label>' +
            '<div class="ltv-matrix">' +
              '<div class="ltv-bracket">[</div>' +
              '<div class="ltv-cells">' +
                '<input type="text" id="ltv-m00" value="1" inputmode="decimal" aria-label="Matrix entry row 1 column 1">' +
                '<input type="text" id="ltv-m01" value="0" inputmode="decimal" aria-label="Matrix entry row 1 column 2">' +
                '<input type="text" id="ltv-m10" value="0" inputmode="decimal" aria-label="Matrix entry row 2 column 1">' +
                '<input type="text" id="ltv-m11" value="1" inputmode="decimal" aria-label="Matrix entry row 2 column 2">' +
              '</div>' +
              '<div class="ltv-bracket">]</div>' +
            '</div>' +
            '<div class="ltv-hint">Type any entries. Invalid entries are outlined and ignored until corrected.</div>' +
          '</div>' +
          '<div class="ltv-group ltv-readouts">' +
            '<div><span class="ltv-lab">det A =</span> <span id="ltv-det" class="ltv-val"></span></div>' +
            '<div id="ltv-area" class="ltv-sub"></div>' +
            '<div class="ltv-basisrow"><span class="ltv-lab" style="color:' + C.basis1 + ';">A<b>e</b><sub>1</sub> =</span> <span id="ltv-basis1" class="ltv-val"></span> <span class="ltv-sub">(column 1)</span></div>' +
            '<div class="ltv-basisrow"><span class="ltv-lab" style="color:' + C.basis2 + ';">A<b>e</b><sub>2</sub> =</span> <span id="ltv-basis2" class="ltv-val"></span> <span class="ltv-sub">(column 2)</span></div>' +
            '<div id="ltv-status" class="ltv-status"></div>' +
          '</div>' +
          '<div class="ltv-buttons">' +
            '<button id="ltv-animate" class="ltv-primary">Animate Transform</button>' +
            '<button id="ltv-reset" class="ltv-secondary">Reset</button>' +
          '</div>' +
        '</div>' +
        '<div class="ltv-canvaswrap">' +
          '<canvas id="ltv-canvas"></canvas>' +
          '<div class="ltv-legend">' +
            '<div class="ltv-li"><span class="ltv-sw" style="background:' + C.shapeOrigStroke + ';"></span>Original grid &amp; shape</div>' +
            '<div class="ltv-li"><span class="ltv-sw" style="background:' + C.axisT + ';"></span>Transformed grid &amp; shape</div>' +
            '<div class="ltv-li"><span class="ltv-sw" style="background:' + C.basis1 + ';"></span>A<b>e</b><sub>1</sub> (column 1)</div>' +
            '<div class="ltv-li"><span class="ltv-sw" style="background:' + C.basis2 + ';"></span>A<b>e</b><sub>2</sub> (column 2)</div>' +
            '<div class="ltv-li"><span class="ltv-sw" style="background:' + C.unitPosStroke + ';"></span>Unit square image: |area| = |det A|</div>' +
            '<div class="ltv-li"><span class="ltv-sw" style="background:' + C.unitNegStroke + ';"></span>Red fill: orientation reversed (det A &lt; 0)</div>' +
            '<div class="ltv-li"><span class="ltv-sw" style="background:' + C.imageLine + ';"></span>Image of T (det A = 0 only)</div>' +
            '<div class="ltv-li"><span class="ltv-sw ltv-dash" style="background:' + C.kernelLine + ';"></span>Kernel of T (det A = 0 only)</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#linear-transformation-visualizer .ltv-root{display:flex;flex-direction:column;gap:20px;color:' + C.text + ';}' +
      '@media (min-width: 992px){#linear-transformation-visualizer .ltv-root{flex-direction:row;align-items:flex-start;}}' +
      '#linear-transformation-visualizer .ltv-controls{background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';box-shadow:0 8px 32px rgba(0,0,0,0.3);flex:1;min-width:260px;}' +
      '#linear-transformation-visualizer .ltv-canvaswrap{flex:2;background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';}' +
      '#linear-transformation-visualizer .ltv-group{margin-bottom:16px;}' +
      '#linear-transformation-visualizer .ltv-group label{display:block;font-weight:bold;margin-bottom:6px;color:' + C.textDim + ';}' +
      '#linear-transformation-visualizer .ltv-full{width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';color-scheme:dark;}' +
      '#linear-transformation-visualizer .ltv-full option{background-color:#141c28;color:' + C.text + ';}' +
      '#linear-transformation-visualizer .ltv-matrix{display:flex;align-items:center;justify-content:center;margin:10px 0;}' +
      '#linear-transformation-visualizer .ltv-bracket{font-size:2rem;margin:0 5px;color:' + C.accent + ';}' +
      '#linear-transformation-visualizer .ltv-cells{display:grid;grid-template-columns:1fr 1fr;grid-gap:8px;}' +
      '#linear-transformation-visualizer .ltv-cells input{width:64px;height:38px;text-align:center;font-size:1.05rem;background:rgba(255,255,255,0.05);border:1px solid ' + C.borderStrong + ';border-radius:4px;color:' + C.text + ';}' +
      '#linear-transformation-visualizer .ltv-cells input:focus{border-color:' + C.accent + ';outline:none;box-shadow:0 0 0 2px rgba(100,180,255,0.2);}' +
      '#linear-transformation-visualizer .ltv-cells input.ltv-invalid{border-color:' + C.bad + ';box-shadow:0 0 0 2px rgba(239,83,80,0.25);}' +
      '#linear-transformation-visualizer .ltv-hint{text-align:center;font-size:0.85rem;color:' + C.faint + ';margin-top:4px;}' +
      '#linear-transformation-visualizer .ltv-readouts{background:rgba(255,255,255,0.04);border:1px solid ' + C.border + ';border-radius:6px;padding:10px 12px;font-size:0.95rem;}' +
      '#linear-transformation-visualizer .ltv-lab{color:' + C.textDim + ';font-weight:bold;}' +
      '#linear-transformation-visualizer .ltv-val{color:' + C.accent + ';font-weight:bold;}' +
      '#linear-transformation-visualizer .ltv-sub{color:' + C.faint + ';font-size:0.85rem;}' +
      '#linear-transformation-visualizer .ltv-basisrow{margin-top:6px;}' +
      '#linear-transformation-visualizer .ltv-status{margin-top:10px;padding-top:8px;border-top:1px solid ' + C.border + ';color:' + C.textDim + ';font-size:0.9rem;line-height:1.45;}' +
      '#linear-transformation-visualizer .ltv-buttons{display:flex;gap:10px;}' +
      '#linear-transformation-visualizer .ltv-primary,#linear-transformation-visualizer .ltv-secondary{flex:1;padding:10px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;transition:background 0.2s;}' +
      '#linear-transformation-visualizer .ltv-primary{background:linear-gradient(135deg,#1565c0,#42a5f5);color:#fff;}' +
      '#linear-transformation-visualizer .ltv-primary:disabled{opacity:0.5;cursor:default;}' +
      '#linear-transformation-visualizer .ltv-secondary{background:rgba(255,255,255,0.08);border:1px solid ' + C.borderStrong + ';color:' + C.text + ';}' +
      '#linear-transformation-visualizer .ltv-primary:hover:not(:disabled){background:linear-gradient(135deg,#1976d2,#64b5f6);}' +
      '#linear-transformation-visualizer .ltv-secondary:hover{background:rgba(255,255,255,0.12);}' +
      '#linear-transformation-visualizer #ltv-canvas{border:1px solid ' + C.borderStrong + ';border-radius:4px;background:' + C.bg + ';display:block;max-width:100%;}' +
      '#linear-transformation-visualizer .ltv-legend{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.85rem;color:' + C.textDim + ';}' +
      '@media (max-width: 600px){#linear-transformation-visualizer .ltv-legend{grid-template-columns:1fr;}}' +
      '#linear-transformation-visualizer .ltv-li{display:flex;align-items:center;}' +
      '#linear-transformation-visualizer .ltv-sw{display:inline-block;width:12px;height:12px;margin-right:6px;border-radius:2px;flex:none;}' +
      '#linear-transformation-visualizer .ltv-sw.ltv-dash{height:0;border-top:3px dashed ' + C.kernelLine + ';background:none !important;border-radius:0;}';
    document.head.appendChild(style);

    // ---------- refs / state ----------
    var canvas = document.getElementById('ltv-canvas');
    var ctx = canvas.getContext('2d');
    var presetSel = document.getElementById('ltv-preset');
    var shapeSel = document.getElementById('ltv-shape');
    var cells = [
      document.getElementById('ltv-m00'), document.getElementById('ltv-m01'),
      document.getElementById('ltv-m10'), document.getElementById('ltv-m11')
    ];
    var detEl = document.getElementById('ltv-det');
    var areaEl = document.getElementById('ltv-area');
    var b1El = document.getElementById('ltv-basis1');
    var b2El = document.getElementById('ltv-basis2');
    var statusEl = document.getElementById('ltv-status');
    var animateBtn = document.getElementById('ltv-animate');
    var resetBtn = document.getElementById('ltv-reset');

    var state = {
      M: [[1, 0], [0, 1]],
      shapeKey: 'square',
      t: 1,
      animating: false,
      raf: null,
      cssW: 600
    };

    // ---------- canvas sizing (DPR-aware, cached CSS width) ----------
    function sizeCanvas() {
      var parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
      var pad = 30; // wrap padding: 15px each side
      var cssW = parentW > 0 ? Math.max(300, Math.min(600, parentW - pad)) : 600;
      state.cssW = cssW;
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssW + 'px';
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssW * dpr);
      if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---------- drawing helpers ----------
    function seg(view, p, q) {
      var a = LtCore.worldToCanvas(view, p), b = LtCore.worldToCanvas(view, q);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }

    function poly(view, pts, stroke, fill) {
      ctx.beginPath();
      var p0 = LtCore.worldToCanvas(view, pts[0]);
      ctx.moveTo(p0[0], p0[1]);
      for (var i = 1; i < pts.length; i++) {
        var p = LtCore.worldToCanvas(view, pts[i]);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    }

    function arrow(view, tip, color, label) {
      var o = LtCore.worldToCanvas(view, [0, 0]);
      var e = LtCore.worldToCanvas(view, tip);
      var dx = e[0] - o[0], dy = e[1] - o[1];
      var len = Math.hypot(dx, dy);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      if (len > 1e-6) {
        var ang = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(e[0], e[1]);
        ctx.lineTo(e[0] - 11 * Math.cos(ang - Math.PI / 6), e[1] - 11 * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(e[0] - 11 * Math.cos(ang + Math.PI / 6), e[1] - 11 * Math.sin(ang + Math.PI / 6));
        ctx.closePath(); ctx.fill();
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText(label, e[0] + 8, e[1] - 8);
      }
    }

    function lineThroughOrigin(view, dir, color, dashed, label) {
      var R = 2 * view.halfX;
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.setLineDash(dashed ? [8, 6] : []);
      seg(view, [-R * dir[0], -R * dir[1]], [R * dir[0], R * dir[1]]);
      ctx.setLineDash([]);
      var lp = LtCore.worldToCanvas(view, [0.82 * view.halfY * dir[0], 0.82 * view.halfY * dir[1]]);
      ctx.fillStyle = color;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(label, lp[0] + 6, lp[1] - 6);
    }

    // ---------- readouts (all values from LtCore) ----------
    function updateReadouts(L, cls) {
      var d = LtCore.det(L);
      detEl.textContent = fmt(d, 3);
      var orient;
      if (cls.rank === 2 && d > 0) orient = 'orientation preserved';
      else if (cls.rank === 2 && d < 0) orient = 'orientation reversed';
      else orient = 'space collapsed';
      areaEl.textContent = 'Unit square \u2192 parallelogram of area |det A| = ' +
        fmt(Math.abs(d), 3) + ' \u2014 ' + orient + '.';
      var c1 = LtCore.colOf(L, 0), c2 = LtCore.colOf(L, 1);
      b1El.textContent = '(' + fmt(c1[0], 2) + ', ' + fmt(c1[1], 2) + ')';
      b2El.textContent = '(' + fmt(c2[0], 2) + ', ' + fmt(c2[1], 2) + ')';
      var props = LtCore.mapProperties(cls.rank);
      var s;
      if (cls.rank === 2) {
        s = 'T is <strong>one-to-one</strong> \u2713 and <strong>onto</strong> \u2713 \u2014 ' +
            'the columns of A are linearly independent and span \u211D\u00B2.';
      } else if (cls.rank === 1) {
        s = 'T is <strong>not one-to-one</strong>: the kernel is the dashed line ' +
            '(every vector on it is sent to <strong>0</strong>). ' +
            'T is <strong>not onto</strong>: the image is only the solid line ' +
            '(the span of the columns).';
      } else {
        s = 'T is the <strong>zero map</strong>: the image is {<strong>0</strong>} and the ' +
            'kernel is all of \u211D\u00B2 \u2014 neither one-to-one nor onto.';
      }
      // consistency guard: text branch must agree with the certified mapping
      if ((cls.rank === 2) !== (props.onto && props.oneToOne)) {
        s = 'internal inconsistency \u2014 readout suppressed';
      }
      statusEl.innerHTML = s;
    }

    // ---------- main draw ----------
    function draw() {
      var w = state.cssW;
      var view = LtCore.makeView(w, w);
      ctx.clearRect(0, 0, w, w);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, w);

      var L = LtCore.lerp(state.M, state.t);
      var half = Math.ceil(view.halfX);

      // original grid (static, faint) + axes
      ctx.lineWidth = 1;
      for (var k = -half; k <= half; k++) {
        ctx.strokeStyle = k === 0 ? C.axisOrig : C.gridOrig;
        seg(view, [k, -half], [k, half]);
        seg(view, [-half, k], [half, k]);
      }

      // transformed grid: image of the same grid patch under L
      for (var k2 = -half; k2 <= half; k2++) {
        ctx.lineWidth = k2 === 0 ? 2 : 1;
        ctx.strokeStyle = k2 === 0 ? C.axisT : C.gridT;
        var sv = LtCore.gridPolyline(state.M, 'v', k2, half, state.t);
        seg(view, sv[0], sv[1]);
        var sh = LtCore.gridPolyline(state.M, 'h', k2, half, state.t);
        seg(view, sh[0], sh[1]);
      }

      // unit square image: parallelogram spanned by the columns of L.
      // Orientation color comes from the certified classifier, not raw sign(det):
      // at rank <= 1 the parallelogram is degenerate and keeps the neutral color.
      var d = LtCore.det(L);
      var cls = LtCore.classifyRank(L);
      var rev = cls.rank === 2 && d < 0;
      var usq = LtCore.transformPoly(state.M, LtCore.UNIT_SQUARE, state.t);
      poly(view, usq, rev ? C.unitNegStroke : C.unitPosStroke,
                      rev ? C.unitNegFill : C.unitPosFill);

      // shapes
      var shapePts = LtCore.SHAPES[state.shapeKey];
      poly(view, shapePts, C.shapeOrigStroke, C.shapeOrigFill);
      poly(view, LtCore.transformPoly(state.M, shapePts, state.t), C.shapeStroke, C.shapeFill);

      // theorem layer: image / kernel lines when the displayed map is singular
      if (cls.rank === 1) {
        lineThroughOrigin(view, cls.image, C.imageLine, false, 'im T');
        lineThroughOrigin(view, cls.kernel, C.kernelLine, true, 'ker T');
      } else if (cls.rank === 0) {
        var o = LtCore.worldToCanvas(view, [0, 0]);
        ctx.fillStyle = C.imageLine;
        ctx.beginPath(); ctx.arc(o[0], o[1], 5, 0, 2 * Math.PI); ctx.fill();
      }

      // basis vectors: the columns of the displayed matrix
      arrow(view, LtCore.colOf(L, 0), C.basis1, 'Ae\u2081');
      arrow(view, LtCore.colOf(L, 1), C.basis2, 'Ae\u2082');

      updateReadouts(L, cls);
    }

    // ---------- interactions ----------
    // Any data change cancels a running sweep and restores ALL affordances
    // (one stop path; a cancelled sweep may never leave the button wedged).
    function stopAnimation() {
      if (state.raf !== null) { cancelAnimationFrame(state.raf); state.raf = null; }
      state.animating = false;
      animateBtn.disabled = false;
    }

    function setMatrix(M) {
      state.M = [[M[0][0], M[0][1]], [M[1][0], M[1][1]]];
      cells[0].value = String(M[0][0]); cells[1].value = String(M[0][1]);
      cells[2].value = String(M[1][0]); cells[3].value = String(M[1][1]);
      for (var i = 0; i < 4; i++) cells[i].classList.remove('ltv-invalid');
    }

    presetSel.addEventListener('change', function () {
      var p = LtCore.presetByKey(presetSel.value);
      if (!p) return;
      stopAnimation();
      setMatrix(p.m);
      state.t = 1;
      draw();
    });

    shapeSel.addEventListener('change', function () {
      state.shapeKey = shapeSel.value;
      draw();
    });

    function onCellInput() {
      var parsed = [], allOk = true;
      for (var i = 0; i < 4; i++) {
        var r = LtCore.parseEntry(cells[i].value);
        parsed.push(r);
        cells[i].classList.toggle('ltv-invalid', !r.ok);
        if (!r.ok) allOk = false;
      }
      if (!allOk) return; // keep last valid matrix; no silent zeros
      stopAnimation();
      state.M = [[parsed[0].value, parsed[1].value], [parsed[2].value, parsed[3].value]];
      state.t = 1;
      draw();
    }
    for (var ci = 0; ci < 4; ci++) cells[ci].addEventListener('input', onCellInput);

    var DUR = 1200;
    animateBtn.addEventListener('click', function () {
      if (state.animating) return;
      state.animating = true;
      animateBtn.disabled = true;
      var t0 = Date.now();
      function frame() {
        var el = Date.now() - t0;
        state.t = Math.min(el / DUR, 1);
        if (state.t >= 1) {
          // restore affordances BEFORE the final draw: no code path may
          // leave the button wedged (v1 failure class)
          state.animating = false;
          animateBtn.disabled = false;
          state.t = 1;
          draw();
          return;
        }
        draw();
        state.raf = requestAnimationFrame(frame);
      }
      state.raf = requestAnimationFrame(frame);
    });

    resetBtn.addEventListener('click', function () {
      stopAnimation();
      presetSel.value = 'identity';
      setMatrix(LtCore.I);
      state.t = 1;
      draw();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () { sizeCanvas(); draw(); });
    }

    // ---------- boot ----------
    sizeCanvas();
    draw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();