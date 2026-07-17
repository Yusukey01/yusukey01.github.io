//======================================================================
// sec1_p24_rigid_body_visualizer_3d.js (v2) -- linalg-24, demo 2
// [Core IIFE] RigidCore: SO(3)/SE(3) math, DOM- and three.js-free.
// Euler convention: ZYX (yaw psi about z, then pitch theta about y,
// then roll phi about x): R = Rz(psi) Ry(theta) Rx(phi).
//======================================================================
var RigidCore = (function () {
  'use strict';

  var D2R = Math.PI / 180;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 3x3 basics ----------
  function Rx(rad) {
    var c = Math.cos(rad), s = Math.sin(rad);
    return [[1, 0, 0], [0, c, -s], [0, s, c]];
  }
  function Ry(rad) {
    var c = Math.cos(rad), s = Math.sin(rad);
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  }
  function Rz(rad) {
    var c = Math.cos(rad), s = Math.sin(rad);
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
  }
  function matMul3(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      for (var k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
    }
    return C;
  }
  function transpose3(A) {
    return [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]];
  }
  function det3(R) {
    return R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1])
      - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0])
      + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
  }
  function orthoError(R) {
    var M = matMul3(transpose3(R), R);
    var e = 0;
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      e = Math.max(e, Math.abs(M[i][j] - (i === j ? 1 : 0)));
    }
    return e;
  }
  function matDist(A, B) {
    var e = 0;
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      e = Math.max(e, Math.abs(A[i][j] - B[i][j]));
    }
    return e;
  }
  function applyR(R, p) {
    return {
      x: R[0][0] * p.x + R[0][1] * p.y + R[0][2] * p.z,
      y: R[1][0] * p.x + R[1][1] * p.y + R[1][2] * p.z,
      z: R[2][0] * p.x + R[2][1] * p.y + R[2][2] * p.z
    };
  }

  // ---------- Euler ZYX ----------
  // closed form of Rz(psi) Ry(theta) Rx(phi); certified against the
  // explicit triple product in E1
  function eulerZYX(rollDeg, pitchDeg, yawDeg) {
    var phi = rollDeg * D2R, theta = pitchDeg * D2R, psi = yawDeg * D2R;
    var cp = Math.cos(phi), sp = Math.sin(phi);
    var ct = Math.cos(theta), st = Math.sin(theta);
    var cs = Math.cos(psi), ss = Math.sin(psi);
    return [
      [cs * ct, cs * st * sp - ss * cp, cs * st * cp + ss * sp],
      [ss * ct, ss * st * sp + cs * cp, ss * st * cp - cs * sp],
      [-st, ct * sp, ct * cp]
    ];
  }

  // ---------- quaternion (w, x, y, z), unit ----------
  function matrixToQuat(R) {
    var trace = R[0][0] + R[1][1] + R[2][2];
    var w, x, y, z, s;
    if (trace > 0) {
      s = 0.5 / Math.sqrt(trace + 1);
      w = 0.25 / s;
      x = (R[2][1] - R[1][2]) * s;
      y = (R[0][2] - R[2][0]) * s;
      z = (R[1][0] - R[0][1]) * s;
    } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
      s = 2 * Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]);
      w = (R[2][1] - R[1][2]) / s;
      x = 0.25 * s;
      y = (R[0][1] + R[1][0]) / s;
      z = (R[0][2] + R[2][0]) / s;
    } else if (R[1][1] > R[2][2]) {
      s = 2 * Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]);
      w = (R[0][2] - R[2][0]) / s;
      x = (R[0][1] + R[1][0]) / s;
      y = 0.25 * s;
      z = (R[1][2] + R[2][1]) / s;
    } else {
      s = 2 * Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]);
      w = (R[1][0] - R[0][1]) / s;
      x = (R[0][2] + R[2][0]) / s;
      y = (R[1][2] + R[2][1]) / s;
      z = 0.25 * s;
    }
    // canonical sign: w >= 0 (q and -q are the same rotation)
    if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
    return { w: w, x: x, y: y, z: z };
  }
  function quatToMatrix(q) {
    var w = q.w, x = q.x, y = q.y, z = q.z;
    return [
      [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]
    ];
  }
  function quatNorm(q) { return Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z); }

  // ---------- axis-angle, with the theta ~ pi branch v1 lacked ----------
  function matrixToAxisAngle(R) {
    var trace = R[0][0] + R[1][1] + R[2][2];
    var cosA = Math.max(-1, Math.min(1, (trace - 1) / 2));
    var angle = Math.acos(cosA);
    if (angle < 1e-7) {
      return { axis: { x: 0, y: 0, z: 1 }, angleDeg: 0 }; // identity: axis conventional
    }
    if (Math.PI - angle < 1e-5) {
      // theta ~ pi: R ~ 2 a a^T - I, so a_i^2 = (R_ii + 1)/2. Take the
      // largest diagonal for stability; fix signs from off-diagonals.
      var xx = Math.max(0, (R[0][0] + 1) / 2);
      var yy = Math.max(0, (R[1][1] + 1) / 2);
      var zz = Math.max(0, (R[2][2] + 1) / 2);
      var a;
      if (xx >= yy && xx >= zz) {
        var ax = Math.sqrt(xx);
        a = { x: ax, y: (R[0][1] + R[1][0]) / (4 * ax), z: (R[0][2] + R[2][0]) / (4 * ax) };
      } else if (yy >= zz) {
        var ay = Math.sqrt(yy);
        a = { x: (R[0][1] + R[1][0]) / (4 * ay), y: ay, z: (R[1][2] + R[2][1]) / (4 * ay) };
      } else {
        var az = Math.sqrt(zz);
        a = { x: (R[0][2] + R[2][0]) / (4 * az), y: (R[1][2] + R[2][1]) / (4 * az), z: az };
      }
      var m = Math.hypot(a.x, a.y, a.z);
      return { axis: { x: a.x / m, y: a.y / m, z: a.z / m }, angleDeg: angle / D2R };
    }
    var s = 1 / (2 * Math.sin(angle));
    var ax2 = (R[2][1] - R[1][2]) * s;
    var ay2 = (R[0][2] - R[2][0]) * s;
    var az2 = (R[1][0] - R[0][1]) * s;
    var mag = Math.hypot(ax2, ay2, az2);
    return { axis: { x: ax2 / mag, y: ay2 / mag, z: az2 / mag }, angleDeg: angle / D2R };
  }
  function rodrigues(axis, angleDeg) {
    var t = angleDeg * D2R;
    var c = Math.cos(t), s = Math.sin(t), C = 1 - c;
    var x = axis.x, y = axis.y, z = axis.z;
    return [
      [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
      [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
      [z * x * C - y * s, z * y * C + x * s, c + z * z * C]
    ];
  }

  // ---------- SE(3): T = [R t; 0 1] as {R, t} ----------
  function se3(R, t) { return { R: R, t: { x: t.x, y: t.y, z: t.z } }; }
  function se3Identity() {
    return se3([[1, 0, 0], [0, 1, 0], [0, 0, 1]], { x: 0, y: 0, z: 0 });
  }
  function se3Compose(A, B) { // A . B (apply B first)
    var R = matMul3(A.R, B.R);
    var Bt = applyR(A.R, B.t);
    return se3(R, { x: Bt.x + A.t.x, y: Bt.y + A.t.y, z: Bt.z + A.t.z });
  }
  function se3Inverse(T) {
    var Rt = transpose3(T.R);
    var mt = applyR(Rt, T.t);
    return se3(Rt, { x: -mt.x, y: -mt.y, z: -mt.z });
  }
  function se3Apply(T, p) {
    var q = applyR(T.R, p);
    return { x: q.x + T.t.x, y: q.y + T.t.y, z: q.z + T.t.z };
  }
  function se3Dist(A, B) {
    return Math.max(matDist(A.R, B.R),
      Math.abs(A.t.x - B.t.x), Math.abs(A.t.y - B.t.y), Math.abs(A.t.z - B.t.z));
  }

  // ---------- the hexagonal coin, and MEASURED invariants ----------
  var COIN_RADIUS = 0.8; // circumradius; a regular hexagon's edge equals it
  function coinVertices() {
    var v = [];
    for (var i = 0; i < 6; i++) {
      var t = i * 60 * D2R;
      v.push({ x: COIN_RADIUS * Math.cos(t), y: COIN_RADIUS * Math.sin(t), z: 0 });
    }
    return v;
  }
  function dist3(p, q) { return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); }
  // measured, not assumed: transform vertices, then read the geometry back
  function measureCoin(T) {
    var v = coinVertices().map(function (p) { return se3Apply(T, p); });
    var edges = [];
    for (var i = 0; i < 6; i++) edges.push(dist3(v[i], v[(i + 1) % 6]));
    // interior angle at vertex 1 between edges to vertices 0 and 2
    var a = { x: v[0].x - v[1].x, y: v[0].y - v[1].y, z: v[0].z - v[1].z };
    var b = { x: v[2].x - v[1].x, y: v[2].y - v[1].y, z: v[2].z - v[1].z };
    var dot = a.x * b.x + a.y * b.y + a.z * b.z;
    var ang = Math.acos(Math.max(-1, Math.min(1,
      dot / (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z))))) / D2R;
    var minE = Math.min.apply(null, edges), maxE = Math.max.apply(null, edges);
    return { edgeMin: minE, edgeMax: maxE, interiorAngleDeg: ang };
  }

  //====================================================================
  // Self-tests
  //====================================================================
  function runSelfTests() {
    var failures = [];
    function check(name, cond, detail) {
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    var rng = mulberry32(24240);
    function randAngles() {
      return { roll: rng() * 360 - 180, pitch: rng() * 180 - 90, yaw: rng() * 360 - 180 };
    }
    var i;

    // E1: closed form == explicit Rz Ry Rx product (kills sign typos)
    (function () {
      var worst = 0;
      for (i = 0; i < 300; i++) {
        var a = randAngles();
        var closed = eulerZYX(a.roll, a.pitch, a.yaw);
        var triple = matMul3(Rz(a.yaw * D2R), matMul3(Ry(a.pitch * D2R), Rx(a.roll * D2R)));
        worst = Math.max(worst, matDist(closed, triple));
      }
      check('E1 eulerZYX == Rz.Ry.Rx (300 seeded)', worst < 1e-12, worst.toExponential(2));
    })();

    // E2: SO(3) membership
    (function () {
      var worstO = 0, worstD = 0;
      for (i = 0; i < 300; i++) {
        var a = randAngles();
        var R = eulerZYX(a.roll, a.pitch, a.yaw);
        worstO = Math.max(worstO, orthoError(R));
        worstD = Math.max(worstD, Math.abs(det3(R) - 1));
      }
      check('E2 orthogonal and det == 1 (300 seeded)', worstO < 1e-12 && worstD < 1e-12);
    })();

    // E3: quaternion round trip, all four extraction branches exercised
    (function () {
      var cases = [];
      for (i = 0; i < 200; i++) { var a = randAngles(); cases.push(eulerZYX(a.roll, a.pitch, a.yaw)); }
      // branch-forcing rotations: ~180 deg about x, y, z, and identity-ish
      cases.push(rodrigues({ x: 1, y: 0, z: 0 }, 179.5));
      cases.push(rodrigues({ x: 0, y: 1, z: 0 }, 179.5));
      cases.push(rodrigues({ x: 0, y: 0, z: 1 }, 179.5));
      cases.push(rodrigues({ x: 0, y: 0, z: 1 }, 0.01));
      var worst = 0, worstN = 0;
      cases.forEach(function (R) {
        var q = matrixToQuat(R);
        worstN = Math.max(worstN, Math.abs(quatNorm(q) - 1));
        worst = Math.max(worst, matDist(quatToMatrix(q), R));
        if (q.w < 0) failures.push('E3 canonical sign violated');
      });
      check('E3a quat round trip (204 cases incl. all branches)', worst < 1e-9, worst.toExponential(2));
      check('E3b |q| == 1', worstN < 1e-9);
    })();

    // E4: axis-angle round trip, INCLUDING theta ~ pi (the v1 failure)
    (function () {
      var worst = 0;
      for (i = 0; i < 200; i++) {
        var a = randAngles();
        var R = eulerZYX(a.roll, a.pitch, a.yaw);
        var aa = matrixToAxisAngle(R);
        worst = Math.max(worst, matDist(rodrigues(aa.axis, aa.angleDeg), R));
      }
      check('E4a axis-angle round trip (200 seeded)', worst < 1e-7, worst.toExponential(2));
      // exact pi about each axis, and a skew axis
      var piCases = [
        rodrigues({ x: 1, y: 0, z: 0 }, 180),
        rodrigues({ x: 0, y: 1, z: 0 }, 180),
        rodrigues({ x: 0, y: 0, z: 1 }, 180),
        rodrigues({ x: 0.6, y: 0.48, z: 0.64 }, 180),
        eulerZYX(180, 0, 0) // v1's NaN reproduction case
      ];
      var okPi = true;
      piCases.forEach(function (R) {
        var aa = matrixToAxisAngle(R);
        var finite = isFinite(aa.axis.x) && isFinite(aa.axis.y) && isFinite(aa.axis.z);
        if (!finite || matDist(rodrigues(aa.axis, aa.angleDeg), R) > 1e-6) okPi = false;
      });
      check('E4b theta == pi cases finite and exact', okPi);
      check('E4c identity convention', matrixToAxisAngle([[1, 0, 0], [0, 1, 0], [0, 0, 1]]).angleDeg === 0);
      // float-drift robustness: inputs within ~1e-15 of SO(3) can push the
      // trace above 3; the clamp must keep acos finite
      var drift = matrixToAxisAngle([[1, 0, 0], [0, 1, 0], [0, 0, 1 + 1e-14]]);
      check('E4d trace clamp keeps drifted input finite', isFinite(drift.angleDeg), drift.angleDeg);
    })();

    // E5: SE(3) group structure
    (function () {
      function randT() {
        var a = randAngles();
        return se3(eulerZYX(a.roll, a.pitch, a.yaw),
          { x: rng() * 4 - 2, y: rng() * 4 - 2, z: rng() * 4 - 2 });
      }
      var worstInv = 0, worstAssoc = 0;
      for (i = 0; i < 100; i++) {
        var A = randT(), B = randT(), C = randT();
        worstInv = Math.max(worstInv, se3Dist(se3Compose(A, se3Inverse(A)), se3Identity()));
        worstAssoc = Math.max(worstAssoc,
          se3Dist(se3Compose(se3Compose(A, B), C), se3Compose(A, se3Compose(B, C))));
      }
      check('E5a T . T^-1 == I (100 seeded)', worstInv < 1e-9, worstInv.toExponential(2));
      check('E5b associativity (100 seeded)', worstAssoc < 1e-9);
      // point-action consistency: (A.B)p == A(Bp)
      var A2 = randT(), B2 = randT(), p = { x: 1, y: -2, z: 0.5 };
      var lhs = se3Apply(se3Compose(A2, B2), p);
      var rhs = se3Apply(A2, se3Apply(B2, p));
      check('E5c action is a homomorphism', dist3(lhs, rhs) < 1e-9);
      // non-commutativity witness: rotate-then-translate != translate-then-rotate
      var Rz90 = se3(Rz(Math.PI / 2), { x: 0, y: 0, z: 0 });
      var Tx = se3([[1, 0, 0], [0, 1, 0], [0, 0, 1]], { x: 1, y: 0, z: 0 });
      check('E5d SE(3) non-commutativity witness',
        se3Dist(se3Compose(Rz90, Tx), se3Compose(Tx, Rz90)) > 0.5);
    })();

    // E6: measured invariants -- the measurer must MEASURE (v1 hardcoded)
    (function () {
      var a = randAngles();
      var T = se3(eulerZYX(a.roll, a.pitch, a.yaw), { x: 1.2, y: -0.7, z: 0.4 });
      var m = measureCoin(T);
      check('E6a rigid motion preserves edge == 0.8',
        Math.abs(m.edgeMin - COIN_RADIUS) < 1e-9 && Math.abs(m.edgeMax - COIN_RADIUS) < 1e-9,
        m.edgeMin + '..' + m.edgeMax);
      check('E6b rigid motion preserves interior angle == 120',
        Math.abs(m.interiorAngleDeg - 120) < 1e-9, m.interiorAngleDeg);
      // the measurer detects a NON-rigid map (kills a constant-returning fake)
      var S = se3([[1.1, 0, 0], [0, 1.1, 0], [0, 0, 1.1]], { x: 0, y: 0, z: 0 });
      var ms = measureCoin(S);
      check('E6c measurer detects a 1.1x scale',
        Math.abs(ms.edgeMin - 1.1 * COIN_RADIUS) < 1e-9, ms.edgeMin);
    })();

    // E7: gimbal lock, executable -- at pitch == +90, R depends only on
    // (roll - yaw); at pitch == -90, only on (roll + yaw)
    (function () {
      var okP = true, okM = true, moves = 0;
      for (i = 0; i < 30; i++) {
        var r0 = rng() * 360 - 180, y0 = rng() * 360 - 180, c = rng() * 360 - 180;
        if (matDist(eulerZYX(r0, 90, y0), eulerZYX(r0 + c, 90, y0 + c)) > 1e-9) okP = false;
        if (matDist(eulerZYX(r0, -90, y0), eulerZYX(r0 + c, -90, y0 - c)) > 1e-9) okM = false;
        // and away from lock the same shift genuinely moves R (test can fail)
        if (matDist(eulerZYX(r0, 30, y0), eulerZYX(r0 + c, 30, y0 + c)) > 1e-3) moves++;
      }
      check('E7a pitch +90: R(roll+c, yaw+c) unchanged (DoF lost)', okP);
      check('E7b pitch -90: R(roll+c, yaw-c) unchanged', okM);
      check('E7c no such degeneracy at pitch 30', moves >= 29, moves);
    })();

    // E8: display convention pins
    (function () {
      var q0 = matrixToQuat([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
      check('E8a identity quaternion (1,0,0,0)',
        Math.abs(q0.w - 1) < 1e-12 && Math.abs(q0.x) < 1e-12 && Math.abs(q0.y) < 1e-12 && Math.abs(q0.z) < 1e-12);
      var R90 = eulerZYX(0, 0, 90);
      var aa = matrixToAxisAngle(R90);
      check('E8b yaw 90 => axis +z, angle 90',
        Math.abs(aa.axis.z - 1) < 1e-9 && Math.abs(aa.angleDeg - 90) < 1e-6,
        JSON.stringify(aa));
    })();

    return { pass: failures.length === 0, failures: failures };
  }

  return {
    mulberry32: mulberry32,
    Rx: Rx, Ry: Ry, Rz: Rz,
    matMul3: matMul3,
    transpose3: transpose3,
    det3: det3,
    orthoError: orthoError,
    matDist: matDist,
    applyR: applyR,
    eulerZYX: eulerZYX,
    matrixToQuat: matrixToQuat,
    quatToMatrix: quatToMatrix,
    quatNorm: quatNorm,
    matrixToAxisAngle: matrixToAxisAngle,
    rodrigues: rodrigues,
    se3: se3,
    se3Identity: se3Identity,
    se3Compose: se3Compose,
    se3Inverse: se3Inverse,
    se3Apply: se3Apply,
    se3Dist: se3Dist,
    COIN_RADIUS: COIN_RADIUS,
    coinVertices: coinVertices,
    measureCoin: measureCoin,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = RigidCore; }

//======================================================================
// [UI IIFE] #rigid-body-visualizer-3d, prefix rbv-
// Gate order: math self-tests FIRST (refusal card on failure), then the
// three.js CDN load (separate network-failure card -- a network problem
// is not a mathematics problem). All numeric readouts are produced by
// RigidCore.formatReadouts so they can be tested without a browser.
//======================================================================
RigidCore.formatReadouts = function (roll, pitch, yaw, t, mode) {
  var G = RigidCore;
  var R = G.eulerZYX(roll, pitch, yaw);
  var f3 = function (v) { return (Math.abs(v) < 5e-13 ? 0 : v).toFixed(3); };
  var out = {
    R: R,
    matrixRows: R.map(function (row) { return row.map(f3); }),
    det: 'det(R) = ' + f3(G.det3(R)) + (Math.abs(G.det3(R) - 1) < 1e-9 ? ' \u2713' : ' \u2717'),
    ortho: 'R\u1D40R = I ' + (G.orthoError(R) < 1e-9 ? '\u2713' : '\u2717'),
    euler: '\u03C8=' + yaw.toFixed(0) + '\u00B0 \u03B8=' + pitch.toFixed(0) + '\u00B0 \u03C6=' + roll.toFixed(0) + '\u00B0'
  };
  var aa = G.matrixToAxisAngle(R);
  out.axisAngle = 'axis=(' + aa.axis.x.toFixed(2) + ', ' + aa.axis.y.toFixed(2) + ', ' + aa.axis.z.toFixed(2) +
    '), \u03B8=' + aa.angleDeg.toFixed(1) + '\u00B0';
  var q = G.matrixToQuat(R);
  out.quat = '(' + q.w.toFixed(3) + ', ' + q.x.toFixed(3) + ', ' + q.y.toFixed(3) + ', ' + q.z.toFixed(3) + ')';
  var T = G.se3(R, t);
  var m = G.measureCoin(T);
  out.edge = m.edgeMin.toFixed(3) + (m.edgeMax - m.edgeMin > 1e-9 ? ' \u2013 ' + m.edgeMax.toFixed(3) : '');
  out.interior = m.interiorAngleDeg.toFixed(1) + '\u00B0';
  out.volume = Math.abs(G.det3(R)).toFixed(3);
  out.gimbal = Math.abs(Math.abs(pitch) - 90) <= 5;
  out.gimbalSign = pitch >= 0 ? '+' : '\u2212';
  if (mode === 'SE3') {
    out.T = [
      [f3(R[0][0]), f3(R[0][1]), f3(R[0][2]), t.x.toFixed(2)],
      [f3(R[1][0]), f3(R[1][1]), f3(R[1][2]), t.y.toFixed(2)],
      [f3(R[2][0]), f3(R[2][1]), f3(R[2][2]), t.z.toFixed(2)],
      ['0', '0', '0', '1']
    ];
    // order experiment: A = rotate about z by 90, B = current translation
    var Rot = G.se3(G.Rz(Math.PI / 2), { x: 0, y: 0, z: 0 });
    var Tra = G.se3([[1, 0, 0], [0, 1, 0], [0, 0, 1]], t);
    var ab = G.se3Compose(Rot, Tra); // translate first, then rotate
    var ba = G.se3Compose(Tra, Rot); // rotate first, then translate
    var fmt = function (X) {
      return '(' + X.t.x.toFixed(2) + ', ' + X.t.y.toFixed(2) + ', ' + X.t.z.toFixed(2) + ')';
    };
    out.orderRotFirst = fmt(ba);   // Tra o Rot: rotate first
    out.orderTraFirst = fmt(ab);   // Rot o Tra: translate first
    out.orderDiffers = G.se3Dist(ab, ba) > 1e-9;
  }
  return out;
};

(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var C = {
    panel: 'rgba(20, 28, 40, 0.95)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderStrong: 'rgba(255, 255, 255, 0.2)',
    text: '#e8eaed',
    textDim: 'rgba(255, 255, 255, 0.7)',
    faint: 'rgba(255, 255, 255, 0.5)',
    accent: '#66bb6a',
    warn: '#f0c040',
    bad: '#e74c3c'
  };

  function card(title, body, borderCol) {
    return '<div style="background:' + C.panel + ';border:1px solid ' + (borderCol || C.bad) +
      ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
      '<strong style="color:' + (borderCol || C.bad) + ';">' + title + '</strong>' +
      '<div style="color:' + C.textDim + ';margin-top:8px;">' + body + '</div></div>';
  }

  function init() {
    var container = document.getElementById('rigid-body-visualizer-3d');
    if (!container) return;
    if (container.dataset.rbvInit) return; // idempotency guard
    container.dataset.rbvInit = '1';

    var gate;
    try { gate = RigidCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests crashed: ' + e.message] }; }
    if (!gate.pass) {
      container.innerHTML = card('Demo disabled: mathematical self-tests failed (' + gate.failures.length + ').',
        'This visualizer refuses to render on broken mathematics.<ul style="margin:8px 0 0 18px;"><li>' +
        gate.failures.join('</li><li>') + '</li></ul>');
      return;
    }

    // math is certified; now fetch the renderer
    container.innerHTML = card('Loading 3D renderer\u2026',
      'Fetching three.js from its CDN. The mathematics is already verified.', C.borderStrong);

    var failed = false;
    function networkFail() {
      if (failed) return;
      failed = true;
      container.innerHTML = card('3D renderer failed to load.',
        'three.js could not be fetched from its CDN \u2014 this is a network problem, not a mathematics ' +
        'problem: every self-test of the SO(3)/SE(3) core passed. Check your connection and reload.', C.warn);
    }
    var timer = setTimeout(networkFail, 15000);

    function loadScript(src, id, onload) {
      var sc = document.createElement('script');
      sc.id = id;
      sc.src = src;
      sc.onload = onload;
      sc.onerror = networkFail;
      document.head.appendChild(sc);
    }

    function whenThreeReady() {
      clearTimeout(timer);
      if (failed) return;
      build(container);
    }

    if (window.THREE && window.THREE.OrbitControls) {
      whenThreeReady();
    } else if (window.THREE) {
      loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
        'rbv-orbit-loader', whenThreeReady);
    } else {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'rbv-three-loader',
        function () {
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
            'rbv-orbit-loader', whenThreeReady);
        });
    }
  }

  function build(container) {
    var G = RigidCore;
    var state = { roll: 0, pitch: 0, yaw: 0, tx: 0, ty: 0, tz: 0, mode: 'SO3' };

    container.innerHTML =
      '<div class="rbv-root">' +
      '<div class="rbv-hint" id="rbv-instruction">SO(3): pure rotation. Drag the coin (shift+drag orbits the camera) ' +
        'or use the sliders. Every readout below is measured from the current matrix, and det(R) stays exactly 1.</div>' +
      '<div class="rbv-layout">' +
      '<div class="rbv-viewcell"><div id="rbv-three"></div>' +
        '<div class="rbv-caption">hexagonal coin (circumradius 0.8) with body frame; world frame at the origin. ' +
          'Drag = coin, shift+drag = camera, wheel = zoom.</div></div>' +
      '<div class="rbv-side">' +
        '<div class="rbv-panel"><div class="rbv-paneltitle">Mode</div>' +
          '<div class="rbv-btnrow">' +
          '<button class="rbv-btn rbv-mode active" id="rbv-so3">SO(3) rotation</button>' +
          '<button class="rbv-btn rbv-mode" id="rbv-se3">SE(3) rigid motion</button>' +
          '<button class="rbv-btn" id="rbv-random">Random</button>' +
          '<button class="rbv-btn" id="rbv-reset">Reset</button></div></div>' +
        '<div class="rbv-panel"><div class="rbv-paneltitle">Rotation matrix R \u2208 SO(3)</div>' +
          '<div class="rbv-mono rbv-matrix" id="rbv-R"></div>' +
          '<div class="rbv-props"><span id="rbv-det"></span><span id="rbv-ortho"></span></div></div>' +
        '<div class="rbv-panel" id="rbv-Tpanel" style="display:none;">' +
          '<div class="rbv-paneltitle">Homogeneous matrix T \u2208 SE(3)</div>' +
          '<div class="rbv-mono rbv-matrix" id="rbv-T"></div>' +
          '<div class="rbv-note">The last column is the translation; the 3\u00D73 block is R. One matrix now carries ' +
            '"where it is" and "how it faces".</div>' +
          '<div class="rbv-note" id="rbv-order"></div></div>' +
        '<div class="rbv-gimbal" id="rbv-gimbal" style="display:none;"></div>' +
        '<details class="rbv-details"><summary>Other charts of the same rotation</summary>' +
          '<div class="rbv-rows">' +
          '<div><span class="rbv-k">Euler (ZYX)</span><span id="rbv-euler" class="rbv-v rbv-mono"></span></div>' +
          '<div><span class="rbv-k">Axis\u2013angle</span><span id="rbv-aa" class="rbv-v rbv-mono"></span></div>' +
          '<div><span class="rbv-k">Quaternion</span><span id="rbv-quat" class="rbv-v rbv-mono"></span></div>' +
          '</div></details>' +
        '<details class="rbv-details"><summary>Invariants \u2014 measured from the vertices</summary>' +
          '<div class="rbv-rows">' +
          '<div><span class="rbv-k">Edge length</span><span id="rbv-edge" class="rbv-v rbv-mono"></span></div>' +
          '<div><span class="rbv-k">Interior angle</span><span id="rbv-int" class="rbv-v rbv-mono"></span></div>' +
          '<div><span class="rbv-k">Volume scale |det R|</span><span id="rbv-vol" class="rbv-v rbv-mono"></span></div>' +
          '</div></details>' +
        '<div class="rbv-panel"><div class="rbv-paneltitle">Controls</div>' +
          '<div class="rbv-slidergrid">' +
          '<div class="rbv-slider"><label>roll \u03C6 = <span id="rbv-roll-val">0\u00B0</span></label>' +
            '<input type="range" id="rbv-roll" min="-180" max="180" value="0"></div>' +
          '<div class="rbv-slider"><label>pitch \u03B8 = <span id="rbv-pitch-val">0\u00B0</span></label>' +
            '<input type="range" id="rbv-pitch" min="-90" max="90" value="0"></div>' +
          '<div class="rbv-slider"><label>yaw \u03C8 = <span id="rbv-yaw-val">0\u00B0</span></label>' +
            '<input type="range" id="rbv-yaw" min="-180" max="180" value="0"></div>' +
          '</div>' +
          '<div id="rbv-transliders" class="rbv-slidergrid" style="display:none;">' +
          '<div class="rbv-slider"><label>t\u2093 = <span id="rbv-tx-val">0.0</span></label>' +
            '<input type="range" id="rbv-tx" min="-2" max="2" step="0.1" value="0"></div>' +
          '<div class="rbv-slider"><label>t\u1D67 = <span id="rbv-ty-val">0.0</span></label>' +
            '<input type="range" id="rbv-ty" min="-2" max="2" step="0.1" value="0"></div>' +
          '<div class="rbv-slider"><label>t\u2094 = <span id="rbv-tz-val">0.0</span></label>' +
            '<input type="range" id="rbv-tz" min="-2" max="2" step="0.1" value="0"></div>' +
          '</div></div>' +
      '</div></div></div>';

    var style = document.createElement('style');
    style.textContent =
      '#rigid-body-visualizer-3d .rbv-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#rigid-body-visualizer-3d .rbv-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.55;}' +
      '#rigid-body-visualizer-3d .rbv-layout{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;}' +
      '#rigid-body-visualizer-3d .rbv-viewcell{flex:1.2;min-width:300px;}' +
      '#rigid-body-visualizer-3d #rbv-three{width:100%;height:420px;border:1px solid ' + C.border + ';border-radius:4px;overflow:hidden;}' +
      '#rigid-body-visualizer-3d #rbv-three canvas{display:block;}' +
      '#rigid-body-visualizer-3d .rbv-caption{font-size:0.78rem;color:' + C.faint + ';margin-top:5px;line-height:1.5;}' +
      '#rigid-body-visualizer-3d .rbv-side{flex:1;min-width:300px;display:flex;flex-direction:column;gap:12px;}' +
      '#rigid-body-visualizer-3d .rbv-panel{border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;background:rgba(255,255,255,0.02);}' +
      '#rigid-body-visualizer-3d .rbv-paneltitle{font-size:0.85rem;color:' + C.accent + ';font-weight:600;margin-bottom:8px;}' +
      '#rigid-body-visualizer-3d .rbv-mono{font-family:"Courier New",monospace;}' +
      '#rigid-body-visualizer-3d .rbv-matrix{font-size:0.85rem;line-height:1.6;white-space:pre;text-align:center;}' +
      '#rigid-body-visualizer-3d .rbv-props{display:flex;justify-content:space-around;font-size:0.82rem;color:' + C.textDim + ';margin-top:6px;}' +
      '#rigid-body-visualizer-3d .rbv-rows > div{display:flex;justify-content:space-between;gap:10px;font-size:0.85rem;margin-bottom:4px;flex-wrap:wrap;}' +
      '#rigid-body-visualizer-3d .rbv-k{color:' + C.textDim + ';}' +
      '#rigid-body-visualizer-3d .rbv-v{text-align:right;}' +
      '#rigid-body-visualizer-3d .rbv-btnrow{display:flex;flex-wrap:wrap;gap:6px;}' +
      '#rigid-body-visualizer-3d .rbv-btn{padding:6px 10px;border:1px solid ' + C.borderStrong + ';border-radius:4px;' +
        'background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.8rem;}' +
      '#rigid-body-visualizer-3d .rbv-btn:hover{background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);}' +
      '#rigid-body-visualizer-3d .rbv-mode.active{background:rgba(102,187,106,0.2);border-color:' + C.accent + ';}' +
      '#rigid-body-visualizer-3d .rbv-slidergrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:4px 14px;}' +
      '#rigid-body-visualizer-3d .rbv-details{border:1px solid ' + C.border + ';border-radius:8px;padding:8px 12px;background:rgba(255,255,255,0.02);}' +
      '#rigid-body-visualizer-3d .rbv-details summary{font-size:0.85rem;color:' + C.accent + ';font-weight:600;cursor:pointer;}' +
      '#rigid-body-visualizer-3d .rbv-details .rbv-rows{margin-top:8px;}' +
      '#rigid-body-visualizer-3d .rbv-slider label{display:block;font-size:0.82rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:1px;}' +
      '#rigid-body-visualizer-3d .rbv-slider input{width:100%;accent-color:' + C.accent + ';}' +
      '#rigid-body-visualizer-3d .rbv-note{font-size:0.78rem;color:' + C.faint + ';line-height:1.5;margin-top:6px;}' +
      '#rigid-body-visualizer-3d .rbv-gimbal{margin-top:8px;font-size:0.8rem;line-height:1.5;color:' + C.warn + ';' +
        'border:1px solid rgba(240,192,64,0.4);background:rgba(240,192,64,0.08);border-radius:6px;padding:8px 10px;}';
    document.head.appendChild(style);

    // ---- three.js scene ----
    var mount = document.getElementById('rbv-three');
    var width = mount.clientWidth || 600, height = 420;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1419);
    var camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(2.6, 2.0, 2.6);
    camera.lookAt(0, 0, 0);
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    mount.appendChild(renderer.domElement);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // plain drag is reserved for the coin
    controls.enableZoom = true;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0x808080, 0.9));
    var light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(3, 5, 4);
    scene.add(light);

    // world frame (RGB = xyz)
    scene.add(new THREE.AxesHelper(1.4));
    var grid = new THREE.GridHelper(4, 8, 0x2a3a50, 0x1a2635);
    scene.add(grid);

    // hexagonal coin: cylinder with 6 radial segments, thin, plus body axes
    var coin = new THREE.Group();
    var geo = new THREE.CylinderGeometry(G.COIN_RADIUS, G.COIN_RADIUS, 0.08, 6);
    var mat = new THREE.MeshStandardMaterial({ color: 0x4da3ff, metalness: 0.35, roughness: 0.45 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2; // cylinder axis (three's y) -> our z
    coin.add(mesh);
    var edgeGeo = new THREE.EdgesGeometry(geo);
    var edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x9fd0ff }));
    edges.rotation.x = Math.PI / 2;
    coin.add(edges);
    coin.add(new THREE.AxesHelper(1.0)); // body frame
    coin.matrixAutoUpdate = false;
    scene.add(coin);

    function updateCoin() {
      var R = G.eulerZYX(state.roll, state.pitch, state.yaw);
      coin.matrix.set(
        R[0][0], R[0][1], R[0][2], state.tx,
        R[1][0], R[1][1], R[1][2], state.ty,
        R[2][0], R[2][1], R[2][2], state.tz,
        0, 0, 0, 1
      );
    }

    function matrixText(rows) {
      return rows.map(function (r) { return '[ ' + r.join('  ') + ' ]'; }).join('\n');
    }

    function updateDisplays() {
      var out = G.formatReadouts(state.roll, state.pitch, state.yaw,
        { x: state.tx, y: state.ty, z: state.tz }, state.mode);
      document.getElementById('rbv-R').textContent = matrixText(out.matrixRows);
      document.getElementById('rbv-det').textContent = out.det;
      document.getElementById('rbv-ortho').textContent = out.ortho;
      document.getElementById('rbv-euler').textContent = out.euler;
      document.getElementById('rbv-aa').textContent = out.axisAngle;
      document.getElementById('rbv-quat').textContent = out.quat;
      document.getElementById('rbv-edge').textContent = out.edge;
      document.getElementById('rbv-int').textContent = out.interior;
      document.getElementById('rbv-vol').textContent = out.volume;
      var gEl = document.getElementById('rbv-gimbal');
      if (out.gimbal) {
        gEl.style.display = 'block';
        gEl.innerHTML = 'Approaching <strong>gimbal lock</strong>: at \u03B8 = ' + out.gimbalSign +
          '90\u00B0 the map (\u03C6, \u03C8) \u21A6 R collapses to a single degree of freedom ' +
          '(only \u03C6 ' + (out.gimbalSign === '+' ? '\u2212' : '+') + ' \u03C8 matters \u2014 ' +
          'try moving roll and yaw together). The matrix, axis\u2013angle, and quaternion stay perfectly ' +
          'well-behaved: the singularity lives in the Euler <em>chart</em>, not in SO(3) itself. This is why ' +
          'downstream robotics and the Lie-theory pages work on the group directly.';
      } else {
        gEl.style.display = 'none';
      }
      if (state.mode === 'SE3') {
        document.getElementById('rbv-T').textContent = matrixText(out.T);
        document.getElementById('rbv-order').innerHTML =
          '<strong>Order matters:</strong> with the current t, ' +
          '"rotate 90\u00B0 about z, then translate" ends at ' + out.orderRotFirst +
          ', but "translate, then rotate" ends at ' + out.orderTraFirst +
          (out.orderDiffers ? ' \u2014 different points: SE(3) is non-Abelian.' : ' (equal only because t is on the z-axis or zero).');
      }
      var vals = { 'rbv-roll-val': state.roll.toFixed(0) + '\u00B0', 'rbv-pitch-val': state.pitch.toFixed(0) + '\u00B0', 'rbv-yaw-val': state.yaw.toFixed(0) + '\u00B0', 'rbv-tx-val': state.tx.toFixed(1), 'rbv-ty-val': state.ty.toFixed(1), 'rbv-tz-val': state.tz.toFixed(1) };
      Object.keys(vals).forEach(function (id) { document.getElementById(id).textContent = vals[id]; });
      updateCoin();
    }

    function bindSlider(id, key, isDeg) {
      var el = document.getElementById(id);
      el.addEventListener('input', function () {
        state[key] = parseFloat(el.value);
        updateDisplays();
      });
      return el;
    }
    var sl = {
      roll: bindSlider('rbv-roll', 'roll'),
      pitch: bindSlider('rbv-pitch', 'pitch'),
      yaw: bindSlider('rbv-yaw', 'yaw'),
      tx: bindSlider('rbv-tx', 'tx'),
      ty: bindSlider('rbv-ty', 'ty'),
      tz: bindSlider('rbv-tz', 'tz')
    };
    function pushSliders() {
      sl.roll.value = state.roll; sl.pitch.value = state.pitch; sl.yaw.value = state.yaw;
      sl.tx.value = state.tx; sl.ty.value = state.ty; sl.tz.value = state.tz;
    }

    function setMode(m) {
      state.mode = m;
      document.getElementById('rbv-so3').classList.toggle('active', m === 'SO3');
      document.getElementById('rbv-se3').classList.toggle('active', m === 'SE3');
      document.getElementById('rbv-Tpanel').style.display = m === 'SE3' ? 'block' : 'none';
      document.getElementById('rbv-transliders').style.display = m === 'SE3' ? 'grid' : 'none';
      document.getElementById('rbv-instruction').textContent = m === 'SO3'
        ? 'SO(3): pure rotation. Drag the coin (shift+drag orbits the camera) or use the sliders. Every readout below is measured from the current matrix, and det(R) stays exactly 1.'
        : 'SE(3): rotation + translation = full rigid-body motion. The 4\u00D74 homogeneous matrix carries both at once; the order experiment below shows why the two ingredients do not commute.';
      if (m === 'SO3') { state.tx = state.ty = state.tz = 0; pushSliders(); }
      updateDisplays();
    }
    document.getElementById('rbv-so3').addEventListener('click', function () { setMode('SO3'); });
    document.getElementById('rbv-se3').addEventListener('click', function () { setMode('SE3'); });
    document.getElementById('rbv-reset').addEventListener('click', function () {
      state.roll = state.pitch = state.yaw = state.tx = state.ty = state.tz = 0;
      pushSliders();
      updateDisplays();
    });
    var rng = G.mulberry32((Date.now() & 0xFFFF) | 1);
    document.getElementById('rbv-random').addEventListener('click', function () {
      state.roll = Math.round(rng() * 360 - 180);
      state.pitch = Math.round(rng() * 180 - 90);
      state.yaw = Math.round(rng() * 360 - 180);
      pushSliders();
      updateDisplays();
    });

    // coin drag: dx -> yaw, dy -> pitch; shift+drag -> camera orbit.
    // OrbitControls samples enableRotate inside ITS OWN mousedown handler,
    // so the flag must be set on keydown, before the gesture starts.
    var dragging = false, lastX = 0, lastY = 0;
    window.addEventListener('keydown', function (e) { if (e.key === 'Shift') controls.enableRotate = true; });
    window.addEventListener('keyup', function (e) { if (e.key === 'Shift') controls.enableRotate = false; });
    renderer.domElement.addEventListener('mousedown', function (e) {
      if (e.shiftKey) return; // camera gesture; OrbitControls handles it
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      state.yaw += (e.clientX - lastX) * 0.5;
      state.pitch += (e.clientY - lastY) * 0.5;
      state.yaw = ((state.yaw + 180) % 360 + 360) % 360 - 180;
      state.pitch = Math.max(-90, Math.min(90, state.pitch));
      lastX = e.clientX; lastY = e.clientY;
      pushSliders();
      updateDisplays();
    });
    window.addEventListener('mouseup', function () { dragging = false; });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    setMode('SO3');
    updateDisplays();
    animate();

    window.addEventListener('resize', function () {
      var w = mount.clientWidth || 600;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();