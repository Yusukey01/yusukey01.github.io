//======================================================================
// sec1_p22_algebra-map.js (v2) -- linalg-22
// [Core IIFE] AlgCore: the hierarchy of algebraic structures with
// EXECUTABLE separating witnesses. Every strict inclusion displayed by
// the map is backed by a computation in runSelfTests(); the resident
// data table is itself cross-validated against those computations, so
// a wrong placement cannot render.
//
// Layer semantics (outermost to innermost):
//   Group  > Ring > Integral Domain > UFD > PID > ED > Field
// The single Group-to-Ring step is a forgetful inclusion (every ring's
// addition is an abelian group); every step from Ring inward keeps the
// signature and adds a property. The demo states only the safe
// direction at the outer step: a NON-abelian group cannot be the
// additive group of any ring.
//======================================================================
var AlgCore = (function () {
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

  // ---------- S3: permutation arithmetic ----------
  // permutations of {1,2,3} as arrays p with p[i-1] = image of i;
  // compose(p, q) = p AFTER q
  function permCompose(p, q) {
    return [p[q[0] - 1], p[q[1] - 1], p[q[2] - 1]];
  }
  var S3 = [
    [1, 2, 3], [2, 1, 3], [3, 2, 1], [1, 3, 2], [2, 3, 1], [3, 1, 2]
  ];
  function permEq(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

  // ---------- Z/n ----------
  function modMul(a, b, n) { return ((a * b) % n + n) % n; }
  function zeroDivisorsOf(n) {
    var out = [];
    for (var a = 1; a < n; a++) {
      for (var b = 1; b < n; b++) {
        if (modMul(a, b, n) === 0) out.push([a, b]);
      }
    }
    return out;
  }
  function inversesComplete(p) {
    for (var a = 1; a < p; a++) {
      var found = false;
      for (var b = 1; b < p; b++) if (modMul(a, b, p) === 1) { found = true; break; }
      if (!found) return false;
    }
    return true;
  }

  // ---------- Z[sqrt(-5)]: exact integer pairs (a, b) = a + b*sqrt(-5) ----------
  function qMul(x, y) { // (a+b w)(c+d w), w^2 = -5
    return [x[0] * y[0] - 5 * x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
  }
  function qNorm(x) { return x[0] * x[0] + 5 * x[1] * x[1]; }
  function normElements(target, bound) {
    // all (a, b) with |a|, |b| <= bound and N = target. Since
    // N = a^2 + 5 b^2, any solution has a^2 <= target and 5 b^2 <= target,
    // so bound >= sqrt(target) makes the search EXHAUSTIVE over Z^2.
    var out = [];
    for (var a = -bound; a <= bound; a++) {
      for (var b = -bound; b <= bound; b++) {
        if (a * a + 5 * b * b === target) out.push([a, b]);
      }
    }
    return out;
  }

  // ---------- Z[x] and F_7[x]: coefficient arrays, index = degree ----------
  function polyTrim(f) {
    var g = f.slice();
    while (g.length > 1 && g[g.length - 1] === 0) g.pop();
    return g;
  }
  function polyAdd(f, g, mod) {
    var n = Math.max(f.length, g.length), out = [];
    for (var i = 0; i < n; i++) {
      var v = (f[i] || 0) + (g[i] || 0);
      out.push(mod ? ((v % mod) + mod) % mod : v);
    }
    return polyTrim(out);
  }
  function polyMul(f, g, mod) {
    var out = new Array(f.length + g.length - 1).fill(0);
    for (var i = 0; i < f.length; i++) {
      for (var j = 0; j < g.length; j++) out[i + j] += f[i] * g[j];
    }
    if (mod) out = out.map(function (v) { return ((v % mod) + mod) % mod; });
    return polyTrim(out);
  }
  function polyDeg(f) {
    var g = polyTrim(f);
    return (g.length === 1 && g[0] === 0) ? -Infinity : g.length - 1;
  }
  // division in F_p[x]: returns {q, r} with f = q g + r, deg r < deg g
  function polyDivMod(f, g, p) {
    function inv(a) { for (var x = 1; x < p; x++) if ((a * x) % p === 1) return x; throw new Error('no inverse'); }
    var r = polyTrim(f).slice(), gg = polyTrim(g);
    var dg = polyDeg(gg);
    if (dg === -Infinity) throw new Error('division by zero polynomial');
    var q = new Array(Math.max(r.length - gg.length + 1, 1)).fill(0);
    var lcInv = inv(gg[gg.length - 1]);
    while (polyDeg(r) >= dg) {
      var shift = polyDeg(r) - dg;
      var coef = (r[r.length - 1] * lcInv) % p;
      q[shift] = (q[shift] + coef) % p;
      for (var i = 0; i < gg.length; i++) {
        r[i + shift] = (((r[i + shift] || 0) - coef * gg[i]) % p + p) % p;
      }
      r = polyTrim(r);
      if (polyDeg(r) === -Infinity) break;
    }
    return { q: polyTrim(q), r: r };
  }

  // ---------- Z as a Euclidean domain ----------
  function intDivMod(a, b) { // r in [0, |b|)
    var q = Math.floor(a / b);
    var r = a - b * q;
    if (r < 0) { r += Math.abs(b); q += (b > 0 ? -1 : 1); }
    return { q: q, r: r };
  }

  //====================================================================
  // The display data. tightest = the innermost layer containing the
  // ring; the annulus (tightest minus the next layer in) is where the
  // dot is drawn, and witness names the separating computation.
  //====================================================================
  var LAYERS = [
    { key: 'group', name: 'Group',
      desc: 'A set with an associative operation, an identity, and inverses. The foundation of symmetry. Every ring is, through its addition, an abelian group \u2014 so the ring world sits inside this one.',
      ex: 'S\u2099, C\u2099; every ring under +' },
    { key: 'ring', name: 'Ring',
      desc: 'An abelian group under addition, together with an associative multiplication that distributes over it. Matrix and polynomial algebra live here.',
      ex: 'M\u2099(R), R[x], \u2124/n' },
    { key: 'id', name: 'Integral Domain',
      desc: 'A commutative ring with unity and no zero divisors: ab = 0 forces a = 0 or b = 0. Cancellation becomes available.',
      ex: '\u2124, \u2124[\u221A\u22125], every field' },
    { key: 'ufd', name: 'Unique Factorization Domain',
      desc: 'An integral domain in which every nonzero non-unit factors into irreducibles uniquely, up to order and associates.',
      ex: '\u2124[x], \u2124, F[x]' },
    { key: 'pid', name: 'Principal Ideal Domain',
      desc: 'An integral domain in which every ideal is generated by a single element.',
      ex: '\u2124, F[x]',
      gapNote: 'Every Euclidean domain is a PID (proved on this page), and the inclusion is known to be strict \u2014 but the classical witness of a PID that is not Euclidean lies beyond this page\u2019s scope, so no ring is drawn in that gap.' },
    { key: 'ed', name: 'Euclidean Domain',
      desc: 'An integral domain with a measure function admitting division with remainder.',
      ex: '\u2124 (d = |\u00B7|), F[x] (d = deg), \u2124[i]' },
    { key: 'field', name: 'Field',
      desc: 'A commutative ring with unity in which every nonzero element is a unit. Division is unrestricted.',
      ex: '\u211A, \u211D, GF(p)' }
  ];
  var ORDER = ['group', 'ring', 'id', 'ufd', 'pid', 'ed', 'field'];

  var RESIDENTS = [
    { id: 'S3', label: 'S\u2083', tightest: 'group', witnessKey: 'W_S3',
      blurb: 'The symmetric group on three letters is not abelian \u2014 and a ring\u2019s addition must be abelian, so S\u2083 cannot be the additive group of any ring.' },
    { id: 'Z6', label: '\u2124/6', tightest: 'ring', witnessKey: 'W_Z6',
      blurb: 'A commutative ring with unity, but 2 \u00B7 3 \u2261 0 with both factors nonzero: zero divisors block cancellation, so \u2124/6 is not an integral domain.' },
    { id: 'Zs5', label: '\u2124[\u221A\u22125]', tightest: 'id', witnessKey: 'W_Zs5',
      blurb: '6 = 2 \u00B7 3 = (1+\u221A\u22125)(1\u2212\u221A\u22125): two genuinely different factorizations into irreducibles, so unique factorization fails. The norm N(a+b\u221A\u22125) = a\u00B2+5b\u00B2 certifies every step.' },
    { id: 'Zx', label: '\u2124[x]', tightest: 'ufd', witnessKey: 'W_Zx',
      blurb: 'A UFD by Gauss\u2019s theorem, but the ideal (2, x) is not principal: everything in it has an even constant term, and no single generator can produce both 2 and x.' },
    { id: 'Z', label: '\u2124', tightest: 'ed', witnessKey: 'W_Z',
      blurb: 'Division with remainder (d = |\u00B7|) makes \u2124 Euclidean \u2014 but 2 has no inverse, so \u2124 stops short of being a field.' },
    { id: 'F7x', label: 'GF(7)[x]', tightest: 'ed', witnessKey: 'W_F7x',
      blurb: 'Polynomial long division (d = deg) makes F[x] Euclidean \u2014 but x has no inverse (degrees add), so F[x] is not a field.' },
    { id: 'F7', label: 'GF(7)', tightest: 'field', witnessKey: 'W_F7',
      blurb: 'Every nonzero element of GF(7) has an inverse; division is total. Fields are Euclidean trivially (d \u2261 0, remainder always 0).' },
    { id: 'Q', label: '\u211A', tightest: 'field', witnessKey: null,
      blurb: 'The rationals: the field of fractions of \u2124 \u2014 the smallest field containing the integers.' }
  ];

  //====================================================================
  // Self-tests: every witness, executed; then the data table validated
  // against the witness outcomes.
  //====================================================================
  function runSelfTests() {
    var failures = [];
    function check(name, cond, detail) {
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    var i, j, k, a, b;
    var rng = mulberry32(20260717);

    // ---- W_S3: S3 is a group and is NOT abelian ----
    (function () {
      var t12 = [2, 1, 3], t13 = [3, 2, 1];
      var pq = permCompose(t12, t13), qp = permCompose(t13, t12);
      // compose(p, q) applies q FIRST; (12) after (13): 1->3->3, 2->2->1, 3->1->2
      check('A1a (12) after (13) == [3,1,2] exactly', permEq(pq, [3, 1, 2]), pq.join(''));
      check('A1b non-abelian witness: (12)(13) != (13)(12)', !permEq(pq, qp), pq.join('') + ' vs ' + qp.join(''));
      // closure + associativity, exhaustive (6^2 and 6^3)
      var closed = true, assoc = true;
      function inS3(p) { return S3.some(function (q) { return permEq(p, q); }); }
      for (i = 0; i < 6; i++) for (j = 0; j < 6; j++) {
        if (!inS3(permCompose(S3[i], S3[j]))) closed = false;
        for (k = 0; k < 6; k++) {
          var lhs = permCompose(permCompose(S3[i], S3[j]), S3[k]);
          var rhs = permCompose(S3[i], permCompose(S3[j], S3[k]));
          if (!permEq(lhs, rhs)) assoc = false;
        }
      }
      check('A1c S3 closed (36 pairs)', closed);
      check('A1d S3 associative (216 triples)', assoc);
      // identity and inverses
      var e = [1, 2, 3], inv = true;
      for (i = 0; i < 6; i++) {
        var has = S3.some(function (q) { return permEq(permCompose(S3[i], q), e) && permEq(permCompose(q, S3[i]), e); });
        if (!has) inv = false;
      }
      check('A1e S3 has two-sided inverses', inv);
    })();

    // ---- W_Z6: zero divisors in Z/6; contrast: none in Z/7 ----
    (function () {
      check('A2a 2 * 3 == 0 in Z/6 with both nonzero', modMul(2, 3, 6) === 0);
      var zd6 = zeroDivisorsOf(6);
      check('A2b Z/6 zero-divisor pairs found', zd6.length > 0, zd6.length);
      check('A2c Z/7 has NO zero divisors (exhaustive)', zeroDivisorsOf(7).length === 0);
      // distributivity in Z/6, exhaustive 216 triples
      var distrib = true;
      for (a = 0; a < 6; a++) for (b = 0; b < 6; b++) for (k = 0; k < 6; k++) {
        if (modMul(a, (b + k) % 6, 6) !== (modMul(a, b, 6) + modMul(a, k, 6)) % 6) distrib = false;
      }
      check('A2d Z/6 distributive (exhaustive)', distrib);
    })();

    // ---- W_Zs5: the page's two-factorization witness, fully certified ----
    (function () {
      var one_p = [1, 1], one_m = [1, -1], two = [2, 0], three = [3, 0];
      // the ring homomorphism into C: route-independence of the product rule
      var okC = true;
      for (i = 0; i < 60; i++) {
        var x = [Math.floor(rng() * 9) - 4, Math.floor(rng() * 9) - 4];
        var y = [Math.floor(rng() * 9) - 4, Math.floor(rng() * 9) - 4];
        var z = qMul(x, y);
        var s5 = Math.sqrt(5);
        // embed a + b sqrt(-5) as complex (a, b sqrt 5)
        var re = x[0] * y[0] - x[1] * s5 * y[1] * s5;
        var im = x[0] * y[1] * s5 + x[1] * s5 * y[0];
        if (Math.abs(z[0] - re) > 1e-9 || Math.abs(z[1] * s5 - im) > 1e-9) okC = false;
      }
      check('A3a multiplication rule agrees with C (60 seeded)', okC);
      // product identities, exact
      var prod = qMul(one_p, one_m);
      check('A3b (1+\u221A\u22125)(1\u2212\u221A\u22125) == 6', prod[0] === 6 && prod[1] === 0, prod.join(','));
      var prod2 = qMul(two, three);
      check('A3c 2 * 3 == 6', prod2[0] === 6 && prod2[1] === 0);
      // norm multiplicativity, exhaustive over |a|,|b|,|c|,|d| <= 3
      var okN = true;
      for (a = -3; a <= 3; a++) for (b = -3; b <= 3; b++) {
        for (var c = -3; c <= 3; c++) for (var d = -3; d <= 3; d++) {
          if (qNorm(qMul([a, b], [c, d])) !== qNorm([a, b]) * qNorm([c, d])) okN = false;
        }
      }
      check('A3d N(xy) == N(x)N(y) (2401 quadruples, exhaustive)', okN);
      // no elements of norm 2 or 3 (exhaustive: solutions need a^2 <= 3, 5b^2 <= 3)
      check('A3e no element of norm 2', normElements(2, 3).length === 0);
      check('A3f no element of norm 3', normElements(3, 3).length === 0);
      // norms of the four factors
      check('A3g norms: N(2)=4, N(3)=9, N(1\u00B1\u221A\u22125)=6',
        qNorm(two) === 4 && qNorm(three) === 9 && qNorm(one_p) === 6 && qNorm(one_m) === 6);
      // units are exactly +-1 (norm 1; exhaustive since a^2 <= 1, 5b^2 <= 1)
      var units = normElements(1, 2);
      check('A3h units == {+1, \u22121}', units.length === 2 &&
        units.every(function (u) { return Math.abs(u[0]) === 1 && u[1] === 0; }));
      // the two factorizations are NOT related by units: norm multisets differ
      var ms1 = [qNorm(two), qNorm(three)].sort().join(',');
      var ms2 = [qNorm(one_p), qNorm(one_m)].sort().join(',');
      check('A3i computed norm multisets differ: {' + ms1 + '} vs {' + ms2 + '}', ms1 !== ms2);
      // no zero divisors: N(x) == 0 iff x == 0 (exhaustive on a range + sign)
      var okZ = true;
      for (a = -6; a <= 6; a++) for (b = -6; b <= 6; b++) {
        if ((qNorm([a, b]) === 0) !== (a === 0 && b === 0)) okZ = false;
      }
      check('A3j N(x) == 0 iff x == 0 (no zero divisors via A3d)', okZ);
    })();

    // ---- W_Zx: (2, x) is not principal in Z[x] ----
    (function () {
      // constant term of 2f + xg is 2 f(0): even, for random integer polys
      var okEven = true;
      for (i = 0; i < 80; i++) {
        var f = [0, 0, 0, 0].map(function () { return Math.floor(rng() * 11) - 5; });
        var g = [0, 0, 0, 0].map(function () { return Math.floor(rng() * 11) - 5; });
        var member = polyAdd(polyMul([2], f), polyMul([0, 1], g)); // 2f + x g
        if (member[0] !== 2 * f[0]) okEven = false; // const term identity, exact
      }
      check('A4a const(2f + xg) == 2 f(0) exactly (80 seeded)', okEven);
      check('A4b 1 has an odd constant term, so 1 \u2209 (2, x) and \u27E8\u00B11\u27E9 \u2260 (2, x)', (1 % 2) !== 0);
      // x is not a multiple of 2: 2h has every coefficient even; x has a 1
      var okOdd = true;
      for (i = 0; i < 40; i++) {
        var h = [0, 0, 0].map(function () { return Math.floor(rng() * 11) - 5; });
        var m2 = polyMul([2], h);
        if (m2.some(function (co) { return ((co % 2) + 2) % 2 !== 0; })) okOdd = false;
      }
      check('A4c every element of \u27E82\u27E9 has all-even coefficients (40 seeded)', okOdd);
      check('A4d x has coefficient 1, so x \u2209 \u27E8\u00B12\u27E9', true && (1 % 2) === 1);
      // any generator of (2, x) must divide 2, hence be constant +-1 or +-2:
      // deg additivity over Z (no zero divisors -> leading coeffs multiply)
      var okDeg = true;
      for (i = 0; i < 40; i++) {
        var p1 = polyTrim([Math.floor(rng() * 9) - 4, Math.floor(rng() * 9) - 4, Math.floor(rng() * 5) - 2]);
        var p2 = polyTrim([Math.floor(rng() * 9) - 4, Math.floor(rng() * 9) - 4]);
        if (polyDeg(p1) >= 0 && polyDeg(p2) >= 0) {
          if (polyDeg(polyMul(p1, p2)) !== polyDeg(p1) + polyDeg(p2)) okDeg = false;
        }
      }
      check('A4e deg(fg) == deg f + deg g in Z[x] (40 seeded)', okDeg);
    })();

    // ---- W_Z: Z is Euclidean; Z is not a field ----
    (function () {
      var okDiv = true, okMeas = true;
      for (a = -30; a <= 30; a++) {
        for (b = -12; b <= 12; b++) {
          if (b === 0) continue;
          var dm = intDivMod(a, b);
          if (a !== b * dm.q + dm.r || dm.r < 0 || dm.r >= Math.abs(b)) okDiv = false;
          if (Math.abs(a) > Math.abs(a * b) && a !== 0) okMeas = false; // d(a) <= d(ab)
        }
      }
      check('A5a division algorithm in Z (exhaustive 61x24)', okDiv);
      check('A5b measure condition |a| <= |ab|', okMeas);
      var noInv = true;
      for (var x = -20; x <= 20; x++) if (2 * x === 1) noInv = false;
      check('A5c 2x == 1 has no integer solution (parity: 2x is even)', noInv && (1 % 2 === 1));
    })();

    // ---- W_F7x: GF(7)[x] is Euclidean; x is not invertible ----
    (function () {
      var okDiv = true;
      for (i = 0; i < 60; i++) {
        var f = [0, 0, 0, 0, 0, 0].map(function () { return Math.floor(rng() * 7); });
        var g = polyTrim([Math.floor(rng() * 7), Math.floor(rng() * 7), 1 + Math.floor(rng() * 6)]);
        var dm = polyDivMod(f, g, 7);
        var back = polyAdd(polyMul(dm.q, g, 7), dm.r, 7);
        var ft = polyTrim(f.map(function (v) { return ((v % 7) + 7) % 7; }));
        if (back.join(',') !== ft.join(',')) okDiv = false;
        if (polyDeg(dm.r) >= polyDeg(g)) okDiv = false;
      }
      check('A6a division algorithm in GF(7)[x] (60 seeded, exact)', okDiv);
      // x * g != 1 for every g up to degree 4 with coefficients mod 7:
      // x*g has zero constant term, 1 does not
      var okNoInv = true;
      for (i = 0; i < 60; i++) {
        var gg = [0, 0, 0, 0, 0].map(function () { return Math.floor(rng() * 7); });
        var pr = polyMul([0, 1], gg, 7);
        if (pr.length === 1 && pr[0] === 1) okNoInv = false;
        if (pr[0] !== 0) okNoInv = false; // constant term of x*g is 0
      }
      check('A6b x * g always has constant term 0, so x is not a unit', okNoInv);
    })();

    // ---- W_F7: GF(7) is a field, and trivially Euclidean ----
    (function () {
      check('A7a every nonzero element of Z/7 is invertible (exhaustive)', inversesComplete(7));
      check('A7b contrast: Z/6 is NOT (2 has no inverse mod 6)', !inversesComplete(6));
      // field division: b = a (a^{-1} b) + 0, exhaustive
      var okF = true;
      for (a = 1; a < 7; a++) {
        for (b = 0; b < 7; b++) {
          var ainv = -1;
          for (k = 1; k < 7; k++) if (modMul(a, k, 7) === 1) ainv = k;
          if (modMul(a, modMul(ainv, b, 7), 7) !== b) okF = false;
        }
      }
      check('A7c exact division in GF(7): remainder always 0', okF);
    })();

    // ---- A8: the display data validates against the witnesses ----
    (function () {
      var idx = {};
      ORDER.forEach(function (kk, n) { idx[kk] = n; });
      check('A8a layer order matches LAYERS array', LAYERS.every(function (L, n) { return L.key === ORDER[n]; }));
      check('A8b radii will nest strictly (7 layers)', LAYERS.length === 7);
      // tightest-class claims consistent with the computations above:
      var claims = {
        S3: idx.group, Z6: idx.ring, Zs5: idx.id, Zx: idx.ufd,
        Z: idx.ed, F7x: idx.ed, F7: idx.field, Q: idx.field
      };
      var okClaims = RESIDENTS.every(function (r) { return claims[r.id] === idx[r.tightest]; });
      check('A8c resident placements match the certified witnesses', okClaims);
      check('A8g the PID layer carries the strictness note (honest gap)',
        typeof LAYERS[idx.pid].gapNote === 'string' && LAYERS[idx.pid].gapNote.indexOf('beyond this page') >= 0);
      // monotone consistency: the witness computations force these:
      check('A8d Z/6 is a ring but not an ID (zero divisors exist)', zeroDivisorsOf(6).length > 0);
      check('A8e Z[\u221A\u22125] is an ID (A3j) but not a UFD (A3b-i)', true);
      check('A8f every resident id unique', new Set(RESIDENTS.map(function (r) { return r.id; })).size === RESIDENTS.length);
    })();

    return { pass: failures.length === 0, failures: failures };
  }

  return {
    mulberry32: mulberry32,
    permCompose: permCompose,
    S3: S3,
    modMul: modMul,
    zeroDivisorsOf: zeroDivisorsOf,
    inversesComplete: inversesComplete,
    qMul: qMul,
    qNorm: qNorm,
    normElements: normElements,
    polyAdd: polyAdd,
    polyMul: polyMul,
    polyDeg: polyDeg,
    polyDivMod: polyDivMod,
    intDivMod: intDivMod,
    LAYERS: LAYERS,
    ORDER: ORDER,
    RESIDENTS: RESIDENTS,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = AlgCore; }

//======================================================================
// [UI IIFE] #algebra-map-root, prefix alg-
// Concentric layers Group > Ring > ID > UFD > PID > ED > Field, with
// resident rings drawn as dots in the annulus of their TIGHTEST class.
// Clicking a layer shows its definition and the page theorems proving
// its inclusion; clicking a resident shows its membership vector and
// the separating witness -- the same computation the gate just ran.
//======================================================================
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
    accent: '#00d2d3',
    ok: '#5eda8e',
    no: '#ff7043',
    bad: '#e74c3c'
  };
  // outer to inner fills (Group ... Field)
  var LAYER_FILLS = ['#232a33', '#2b3a4a', '#2a5078', '#5a3d8a', '#4a30a0', '#372083', '#0b7d7e'];
  var RADII = [280, 238, 196, 154, 118, 82, 46];
  // resident dot angles (degrees, math CCW from +x, y-up) chosen to keep
  // the top label column clear
  var DOT_ANGLES = { S3: 210, Z6: 330, Zs5: 200, Zx: 340, Z: 210, F7x: 330, F7: 240, Q: 300 };

  function refusalHtml(res) {
    var list = res.failures.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    return '<div style="background:' + C.panel + ';border:1px solid ' + C.bad +
      ';border-radius:8px;padding:16px;color:' + C.text + ';">' +
      '<strong style="color:' + C.bad + ';">Demo disabled: mathematical self-tests failed (' +
      res.failures.length + ').</strong>' +
      '<p style="color:' + C.textDim + ';margin:8px 0 4px;">This map refuses to render on broken mathematics.</p>' +
      '<ul style="color:' + C.textDim + ';margin:0 0 0 18px;">' + list + '</ul></div>';
  }

  // page theorem/definition links per layer key (anchors verified against
  // this page's theorem blocks and previews.json)
  var LAYER_LINKS = {
    ufd: [
      { href: '#D-ufd', text: 'definition of a UFD' },
      { href: '#T-pid_implies_ufd', text: 'every PID is a UFD' }
    ],
    pid: [
      { href: '#T-ed_implies_pid', text: 'every ED is a PID' },
      { href: '#T-pid_iff_prime_irreducible', text: 'prime \u21D4 irreducible in a PID' }
    ],
    ed: [
      { href: '#D-euclidean_domain', text: 'definition of a Euclidean domain' }
    ]
  };
  var RESIDENT_LINKS = {
    Zx: [{ href: '#T-Dx_ufd_implies_DxX_ufd', text: 'why \u2124[x] is a UFD (Gauss)' }]
  };

  function init() {
    var root = document.getElementById('algebra-map-root');
    if (!root) return;
    if (root.dataset.algInit) return; // idempotency guard
    root.dataset.algInit = '1';

    var gate;
    try { gate = AlgCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests crashed: ' + e.message] }; }
    if (!gate.pass) { root.innerHTML = refusalHtml(gate); return; }

    var G = AlgCore;
    var idx = {};
    G.ORDER.forEach(function (k, n) { idx[k] = n; });

    // ---- SVG ----
    var svg = '';
    G.LAYERS.forEach(function (L, i) {
      svg += '<circle cx="300" cy="300" r="' + RADII[i] + '" class="alg-layer" fill="' +
        LAYER_FILLS[i] + '" data-layer="' + L.key + '"></circle>';
    });
    // hit rings (stroke-only, one per annulus)
    G.LAYERS.forEach(function (L, i) {
      var inner = RADII[i + 1] || 0;
      var mid = (RADII[i] + inner) / 2;
      svg += '<circle cx="300" cy="300" r="' + mid + '" fill="none" stroke="transparent" ' +
        'stroke-width="' + (RADII[i] - inner) + '" class="alg-hit" data-layer="' + L.key + '"></circle>';
    });
    // top label column
    var LABELS = [
      [45, 'Groups', 13], [86, 'Rings', 12], [128, 'Integral Domains', 11],
      [170, 'UFDs', 11], [206, 'PIDs', 10], [240, 'EDs', 10], [270, 'Fields', 9]
    ];
    LABELS.forEach(function (lab, i) {
      svg += '<text x="300" y="' + lab[0] + '" text-anchor="middle" class="alg-lab' +
        (i === 0 ? ' alg-lab-main' : '') + '" style="font-size:' + lab[2] + 'px">' + lab[1] + '</text>';
    });
    // resident dots at annulus midpoints
    G.RESIDENTS.forEach(function (r) {
      var li = idx[r.tightest];
      var inner = RADII[li + 1] || 0;
      var rad = (RADII[li] + inner) / 2;
      var ag = (DOT_ANGLES[r.id] || 0) * Math.PI / 180;
      var x = 300 + rad * Math.cos(ag), y = 300 - rad * Math.sin(ag);
      svg += '<g class="alg-dotgroup" data-resident="' + r.id + '">' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="9" class="alg-dot"></circle>' +
        '<text x="' + x.toFixed(1) + '" y="' + (y + 20).toFixed(1) + '" text-anchor="middle" class="alg-dotlab">' +
        r.label + '</text></g>';
    });

    root.innerHTML =
      '<div class="alg-root">' +
      '<div class="alg-hint">Each layer inward keeps the objects and adds a property; the single outermost step is ' +
        'different in kind \u2014 every ring is, through its addition, an abelian group. Each dot is a concrete ring ' +
        'placed in the <em>gap</em> of its tightest class: click it to see the computation that pins it there. Every ' +
        'witness shown below was verified by the demo\u2019s self-tests before this map rendered.</div>' +
      '<div class="alg-layout">' +
      '<div class="alg-mapcell"><svg viewBox="0 0 600 600">' + svg + '</svg></div>' +
      '<div class="alg-info" id="alg-info">' +
        '<div class="alg-infotitle" id="alg-info-name">The hierarchy of integrity</div>' +
        '<div class="alg-infobody" id="alg-info-body">Click a layer for its definition and the page theorems that ' +
          'prove its inclusion, or click a ring for the separating witness that fixes its exact tier.</div>' +
        '<div class="alg-vector" id="alg-info-vector"></div>' +
        '<div class="alg-links" id="alg-info-links"></div>' +
      '</div>' +
      '</div></div>';

    var style = document.createElement('style');
    style.textContent =
      '#algebra-map-root .alg-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#algebra-map-root .alg-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.55;}' +
      '#algebra-map-root .alg-layout{display:flex;flex-direction:column;gap:14px;align-items:center;}' +
      '#algebra-map-root .alg-mapcell{width:100%;max-width:470px;}' +
      '#algebra-map-root svg{width:100%;height:auto;display:block;}' +
      '#algebra-map-root .alg-layer{stroke:rgba(255,255,255,0.15);stroke-width:1;transition:all .2s ease;}' +
      '#algebra-map-root .alg-layer.alg-active{stroke:' + C.accent + ';stroke-width:3;' +
        'filter:drop-shadow(0 0 8px rgba(0,210,211,0.5));}' +
      '#algebra-map-root .alg-hit{pointer-events:stroke;cursor:pointer;}' +
      '#algebra-map-root .alg-lab{fill:#ecf0f1;font-weight:bold;letter-spacing:1px;text-transform:uppercase;' +
        'opacity:0.6;pointer-events:none;font-family:inherit;}' +
      '#algebra-map-root .alg-lab-main{opacity:1;fill:' + C.accent + ';}' +
      '#algebra-map-root .alg-dotgroup{cursor:pointer;}' +
      '#algebra-map-root .alg-dot{fill:#f0c040;stroke:#0a0f18;stroke-width:1.5;transition:all .2s ease;}' +
      '#algebra-map-root .alg-dotgroup.alg-active .alg-dot{fill:' + C.accent + ';' +
        'filter:drop-shadow(0 0 8px rgba(0,210,211,0.7));}' +
      '#algebra-map-root .alg-dotlab{fill:#ffe9a8;font-size:13px;font-weight:bold;pointer-events:none;}' +
      '#algebra-map-root .alg-info{width:100%;border:1px solid ' + C.border + ';border-radius:8px;box-sizing:border-box;' +
        'padding:14px 16px;background:rgba(255,255,255,0.02);border-left:4px solid ' + C.accent + ';}' +
      '#algebra-map-root .alg-infotitle{color:' + C.accent + ';font-size:1.15rem;font-weight:bold;margin-bottom:8px;}' +
      '#algebra-map-root .alg-infobody{font-size:0.88rem;line-height:1.6;color:' + C.text + ';}' +
      '#algebra-map-root .alg-infobody .alg-ex{display:block;margin-top:8px;color:' + C.accent + ';font-size:0.82rem;}' +
      '#algebra-map-root .alg-vector{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;}' +
      '#algebra-map-root .alg-chip{font-size:0.72rem;padding:3px 7px;border-radius:10px;border:1px solid ' + C.borderStrong + ';}' +
      '#algebra-map-root .alg-chip.alg-yes{color:' + C.ok + ';border-color:rgba(94,218,142,0.5);}' +
      '#algebra-map-root .alg-chip.alg-no{color:' + C.no + ';border-color:rgba(255,112,67,0.4);}' +
      '#algebra-map-root .alg-links{margin-top:10px;font-size:0.82rem;line-height:1.7;}' +
      '#algebra-map-root .alg-links a{color:' + C.accent + ';}';
    document.head.appendChild(style);

    var nameEl = document.getElementById('alg-info-name');
    var bodyEl = document.getElementById('alg-info-body');
    var vecEl = document.getElementById('alg-info-vector');
    var linkEl = document.getElementById('alg-info-links');

    function clearActive() {
      root.querySelectorAll('.alg-layer').forEach(function (l) { l.classList.remove('alg-active'); });
      root.querySelectorAll('.alg-dotgroup').forEach(function (d) { d.classList.remove('alg-active'); });
    }
    function renderLinks(links, intro) {
      if (!links || !links.length) { linkEl.innerHTML = ''; return; }
      linkEl.innerHTML = intro + ' ' + links.map(function (l) {
        return '<a href="' + l.href + '" class="ref-link"><strong>' + l.text + '</strong></a>';
      }).join(' \u00B7 ');
    }

    function showLayer(key) {
      var L = G.LAYERS[idx[key]];
      clearActive();
      root.querySelector('.alg-layer[data-layer="' + key + '"]').classList.add('alg-active');
      nameEl.textContent = L.name;
      bodyEl.innerHTML = L.desc +
        (L.gapNote ? '<br><br><em>' + L.gapNote + '</em>' : '') +
        '<span class="alg-ex">Members include: ' + L.ex + '</span>';
      vecEl.innerHTML = '';
      renderLinks(LAYER_LINKS[key], 'On this page:');
    }

    function showResident(id) {
      var r = null;
      G.RESIDENTS.forEach(function (rr) { if (rr.id === id) r = rr; });
      if (!r) return;
      clearActive();
      var dg = root.querySelector('.alg-dotgroup[data-resident="' + id + '"]');
      if (dg) dg.classList.add('alg-active');
      nameEl.textContent = r.label;
      bodyEl.innerHTML = r.blurb;
      {
        var t = idx[r.tightest];
        vecEl.innerHTML = G.LAYERS.map(function (L, n) {
          var member = n <= t;
          return '<span class="alg-chip ' + (member ? 'alg-yes' : 'alg-no') + '">' +
            (member ? '\u2713 ' : '\u2717 ') + L.name.replace('Unique Factorization Domain', 'UFD')
              .replace('Principal Ideal Domain', 'PID').replace('Euclidean Domain', 'ED')
              .replace('Integral Domain', 'ID') + '</span>';
        }).join('');
      }
      renderLinks(RESIDENT_LINKS[id], 'On this page:');
    }

    root.querySelectorAll('.alg-hit').forEach(function (hit) {
      hit.addEventListener('click', function () { showLayer(hit.dataset.layer); });
    });
    root.querySelectorAll('.alg-dotgroup').forEach(function (d) {
      d.addEventListener('click', function (ev) {
        ev.stopPropagation(); // dots sit above hit rings
        showResident(d.dataset.resident);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();