//======================================================================
// sec1_p24_dihedral_group_visualizer.js (v2) -- linalg-24, demo 1
// [Core IIFE] D6Core: the dihedral group D6 with ONE source of truth.
// Elements are (k, m) meaning r^k s^m; everything else -- matrices,
// vertex permutations, the Cayley product, orders, axes, the center --
// is DERIVED from the 2x2 matrix representation. No hand-typed tables.
// Math convention: y-up plane, vertex i (1..6) at angle (i-1)*60 deg,
// positive rotation = counterclockwise. (The UI flips y when drawing.)
//======================================================================
var D6Core = (function () {
  'use strict';

  var N = 6;
  var IDS = ['e', 'r', 'r2', 'r3', 'r4', 'r5', 's', 'rs', 'r2s', 'r3s', 'r4s', 'r5s'];

  function idOf(k, m) {
    k = ((k % N) + N) % N;
    if (!m) return k === 0 ? 'e' : (k === 1 ? 'r' : 'r' + k);
    return k === 0 ? 's' : (k === 1 ? 'rs' : 'r' + k + 's');
  }
  function parseId(id) {
    var m = /^r?(\d?)(s?)$/.exec(id === 'e' ? '' : id);
    if (id === 'e') return { k: 0, m: 0 };
    if (!m) return null;
    var k = (id[0] === 'r') ? (m[1] === '' ? 1 : parseInt(m[1], 10)) : 0;
    return { k: k, m: m[2] === 's' ? 1 : 0 };
  }

  // ---------- matrices (the single source of truth) ----------
  function rot(deg) {
    var t = deg * Math.PI / 180;
    return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
  }
  var REFLECT_X = [[1, 0], [0, -1]]; // reflection across the x-axis (= s)
  function matMul(A, B) {
    return [
      [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
      [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
    ];
  }
  function matrixOf(id) {
    var p = parseId(id);
    var R = rot(60 * p.k);
    return p.m ? matMul(R, REFLECT_X) : R; // r^k s = rotate after reflecting
  }
  function det2(M) { return M[0][0] * M[1][1] - M[0][1] * M[1][0]; }
  function frobDist(A, B) {
    var s = 0;
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      s += (A[i][j] - B[i][j]) * (A[i][j] - B[i][j]);
    }
    return Math.sqrt(s);
  }

  var MATRICES = {};
  IDS.forEach(function (id) { MATRICES[id] = matrixOf(id); });

  // identify a 2x2 matrix as a group element (with separation margin)
  function identify(M) {
    var best = null, bestD = Infinity, secondD = Infinity;
    IDS.forEach(function (id) {
      var d = frobDist(M, MATRICES[id]);
      if (d < bestD) { secondD = bestD; bestD = d; best = id; }
      else if (d < secondD) { secondD = d; }
    });
    return { id: best, dist: bestD, secondDist: secondD };
  }

  // group product: product(a, b) = a . b (apply b FIRST, then a).
  // The UI's "g2 o g1" composition is product(g2, g1).
  function product(aId, bId) {
    return identify(matMul(MATRICES[aId], MATRICES[bId])).id;
  }
  function inverseOf(id) {
    for (var i = 0; i < IDS.length; i++) {
      if (product(id, IDS[i]) === 'e') return IDS[i];
    }
    return null;
  }
  function orderOf(id) {
    var g = 'e';
    for (var n = 1; n <= 2 * N; n++) {
      g = product(g, id);
      if (g === 'e') return n;
    }
    return -1;
  }

  // reduce a word (sequence of clicks, applied left to right in time)
  // to a single element: clicking g maps state x to g o x, so the word
  // [g1, g2, ..., gn] (in click order) reduces to gn o ... o g2 o g1.
  function reduceWord(clickIds) {
    var acc = 'e';
    for (var i = 0; i < clickIds.length; i++) acc = product(clickIds[i], acc);
    return acc;
  }

  // ---------- vertices and permutations (derived from matrices) ----------
  function vertexPos(i) { // label i in 1..6, unit circumradius, y-up
    var t = (i - 1) * 60 * Math.PI / 180;
    return { x: Math.cos(t), y: Math.sin(t) };
  }
  // perm[i-1] = j means: vertex labeled i is carried to the position
  // where vertex j sits in the identity configuration.
  function permutationOf(id) {
    var M = MATRICES[id];
    var perm = [];
    for (var i = 1; i <= N; i++) {
      var p = vertexPos(i);
      var q = { x: M[0][0] * p.x + M[0][1] * p.y, y: M[1][0] * p.x + M[1][1] * p.y };
      var found = -1;
      for (var j = 1; j <= N; j++) {
        var r0 = vertexPos(j);
        if (Math.hypot(q.x - r0.x, q.y - r0.y) < 1e-9) { found = j; break; }
      }
      if (found < 0) throw new Error('permutationOf: image of vertex ' + i + ' is not a vertex');
      perm.push(found);
    }
    return perm;
  }
  function composePerm(p2, p1) { // (p2 o p1)(i) = p2(p1(i))
    var out = [];
    for (var i = 0; i < N; i++) out.push(p2[p1[i] - 1]);
    return out;
  }
  function fixedVertices(perm) {
    var f = [];
    for (var i = 0; i < N; i++) if (perm[i] === i + 1) f.push(i + 1);
    return f;
  }
  // cycle notation INCLUDING fixed points as 1-cycles (site decision:
  // for reflections, the fixed vertices are exactly the axis vertices,
  // so hiding 1-cycles hides the geometric payoff).
  function cycleNotation(perm) {
    var visited = new Array(N).fill(false);
    var parts = [];
    for (var start = 0; start < N; start++) {
      if (visited[start]) continue;
      var cyc = [], cur = start;
      while (!visited[cur]) { visited[cur] = true; cyc.push(cur + 1); cur = perm[cur] - 1; }
      parts.push('(' + cyc.join(' ') + ')');
    }
    return parts.join('');
  }

  // reflection axis angle in degrees (from the matrix, not from a table):
  // [[cos 2a, sin 2a], [sin 2a, -cos 2a]] => a = atan2(M10, M00) / 2
  function axisAngleOf(id) {
    var M = MATRICES[id];
    if (det2(M) > 0) return null; // not a reflection
    var a = Math.atan2(M[1][0], M[0][0]) / 2 * 180 / Math.PI;
    return ((a % 180) + 180) % 180;
  }

  function isReflection(id) { return det2(MATRICES[id]) < 0; }

  function centerOf() {
    var c = [];
    IDS.forEach(function (g) {
      var ok = IDS.every(function (h) { return product(g, h) === product(h, g); });
      if (ok) c.push(g);
    });
    return c;
  }

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  //====================================================================
  // Self-tests
  //====================================================================
  function runSelfTests() {
    var failures = [];
    function check(name, cond, detail) {
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    var i, j;

    // T1: closure with sharp identification -- every product lands exactly
    // on one of the 12 matrices, with a wide separation margin
    (function () {
      var okDist = true, okMargin = true, minMargin = Infinity;
      IDS.forEach(function (a) {
        IDS.forEach(function (b) {
          var r = identify(matMul(MATRICES[a], MATRICES[b]));
          if (r.dist > 1e-9) okDist = false;
          if (r.secondDist < 0.5) okMargin = false;
          if (r.secondDist < minMargin) minMargin = r.secondDist;
        });
      });
      check('T1a closure: all 144 products identify exactly', okDist);
      check('T1b identification margin > 0.5', okMargin, minMargin.toFixed(3));
      // pin the actual margin value: nearest neighbor of I is r (or r5)
      // at Frobenius distance sqrt(2)
      var idI = identify([[1, 0], [0, 1]]);
      check('T1c secondDist(I) == sqrt(2)', Math.abs(idI.secondDist - Math.SQRT2) < 1e-9,
        idI.secondDist);
    })();

    // T2: defining relations at matrix level
    check('T2a r^6 == e', reduceWord(['r', 'r', 'r', 'r', 'r', 'r']) === 'e');
    check('T2b s^2 == e', product('s', 's') === 'e');
    check('T2c srs == r^-1', product(product('s', 'r'), 's') === inverseOf('r'),
      product(product('s', 'r'), 's'));

    // T3: group axioms from the derived table
    (function () {
      var okAssoc = true;
      IDS.forEach(function (a) {
        IDS.forEach(function (b) {
          IDS.forEach(function (c) {
            if (product(product(a, b), c) !== product(a, product(b, c))) okAssoc = false;
          });
        });
      });
      check('T3a associativity (all 1728 triples)', okAssoc);
      var okId = IDS.every(function (g) { return product('e', g) === g && product(g, 'e') === g; });
      check('T3b identity element', okId);
      var okInv = IDS.every(function (g) {
        var gi = inverseOf(g);
        return gi !== null && product(g, gi) === 'e' && product(gi, g) === 'e';
      });
      check('T3c two-sided inverses exist', okInv);
    })();

    // T4: order semantics of the product -- pins which factor acts first.
    // product(a, b) applies b FIRST. r o s = "reflect, then rotate" = rs.
    check('T4a product(r, s) == rs', product('r', 's') === 'rs', product('r', 's'));
    check('T4b product(s, r) == r5s', product('s', 'r') === 'r5s', product('s', 'r'));
    check('T4c non-commutativity witness rs != sr', product('r', 's') !== product('s', 'r'));

    // T5: the center is exactly {e, r3}
    (function () {
      var c = centerOf();
      check('T5 center == {e, r3}', c.length === 2 && c.indexOf('e') >= 0 && c.indexOf('r3') >= 0,
        c.join(','));
    })();

    // T6: element orders follow |r^k| = 6/gcd(k,6); reflections order 2
    (function () {
      var ok = true;
      for (var k = 0; k < N; k++) {
        var expected = k === 0 ? 1 : N / gcd(k, N);
        if (orderOf(idOf(k, 0)) !== expected) ok = false;
        if (orderOf(idOf(k, 1)) !== 2) ok = false;
      }
      check('T6 orders: |r^k| = 6/gcd(k,6), reflections have order 2', ok);
    })();

    // T7: determinant separates rotations (+1) from reflections (-1);
    // all matrices orthogonal
    (function () {
      var ok = true, okOrtho = true;
      IDS.forEach(function (id) {
        var M = MATRICES[id], p = parseId(id);
        var d = det2(M);
        if (Math.abs(d - (p.m ? -1 : 1)) > 1e-12) ok = false;
        var MtM = matMul([[M[0][0], M[1][0]], [M[0][1], M[1][1]]], M);
        if (frobDist(MtM, [[1, 0], [0, 1]]) > 1e-12) okOrtho = false;
      });
      check('T7a det == +1 on rotations, -1 on reflections', ok);
      check('T7b all matrices orthogonal', okOrtho);
    })();

    // T8: permutation representation -- faithfulness and homomorphism
    (function () {
      // convention pin: this kills a flipped rotation sign (the v1 bug
      // class): rotating by +60 carries vertex 1 to vertex 2's position
      check('T8a perm(r) == (1 2 3 4 5 6)', cycleNotation(permutationOf('r')) === '(1 2 3 4 5 6)',
        cycleNotation(permutationOf('r')));
      check('T8b perm(e) shows all fixed points', cycleNotation(permutationOf('e')) === '(1)(2)(3)(4)(5)(6)');
      // homomorphism: perm(a o b) == perm(a) o perm(b), all 144 pairs
      var okHom = true;
      IDS.forEach(function (a) {
        IDS.forEach(function (b) {
          var lhs = permutationOf(product(a, b));
          var rhs = composePerm(permutationOf(a), permutationOf(b));
          if (lhs.join(',') !== rhs.join(',')) okHom = false;
        });
      });
      check('T8c perm is a homomorphism (all 144 pairs)', okHom);
      // faithfulness: 12 distinct permutations
      var seen = {};
      IDS.forEach(function (id) { seen[permutationOf(id).join(',')] = true; });
      check('T8d perm is faithful (12 distinct)', Object.keys(seen).length === 12);
    })();

    // T9: reflection axes -- geometry pins from the matrix
    (function () {
      check('T9a axis(s) == 0 deg', Math.abs(axisAngleOf('s') - 0) < 1e-9, axisAngleOf('s'));
      check('T9b axis(rs) == 30 deg', Math.abs(axisAngleOf('rs') - 30) < 1e-9, axisAngleOf('rs'));
      check('T9c axis(r^k s) == 30k deg mod 180', IDS.filter(isReflection).every(function (id) {
        var k = parseId(id).k;
        return Math.abs(axisAngleOf(id) - (30 * k) % 180) < 1e-9;
      }));
      // vertex-axes fix exactly the two vertices on the axis; edge-axes fix none
      check('T9d s fixes vertices {1, 4}', fixedVertices(permutationOf('s')).join(',') === '1,4',
        fixedVertices(permutationOf('s')).join(','));
      var ok = IDS.filter(isReflection).every(function (id) {
        var k = parseId(id).k;
        var f = fixedVertices(permutationOf(id));
        return (k % 2 === 0) ? f.length === 2 : f.length === 0;
      });
      check('T9e even-k reflections fix 2 vertices, odd-k fix none', ok);
      check('T9f rotations (except e) fix nothing', [1, 2, 3, 4, 5].every(function (k) {
        return fixedVertices(permutationOf(idOf(k, 0))).length === 0;
      }));
    })();

    // T10: <r> is a subgroup of index 2; the reflections are its coset
    (function () {
      var rots = IDS.filter(function (id) { return !isReflection(id); });
      var closed = rots.every(function (a) {
        return rots.every(function (b) { return rots.indexOf(product(a, b)) >= 0; });
      });
      check('T10a <r> closed, order 6', closed && rots.length === 6);
      var coset = rots.map(function (g) { return product(g, 's'); }).sort().join(',');
      var refls = IDS.filter(isReflection).sort().join(',');
      check('T10b <r>s is exactly the reflections', coset === refls);
    })();

    // T11: word reduction pins (the breadcrumb feature)
    check('T11a clicks [s, r] reduce to rs', reduceWord(['s', 'r']) === 'rs', reduceWord(['s', 'r']));
    check('T11b clicks [r, s] reduce to sr = r5s', reduceWord(['r', 's']) === 'r5s', reduceWord(['r', 's']));
    check('T11c clicks [r, r] reduce to r2', reduceWord(['r', 'r']) === 'r2');
    check('T11d clicks [s, s] reduce to e', reduceWord(['s', 's']) === 'e');

    return { pass: failures.length === 0, failures: failures };
  }

  return {
    IDS: IDS,
    idOf: idOf,
    parseId: parseId,
    matrixOf: function (id) { return MATRICES[id]; },
    matMul: matMul,
    det2: det2,
    identify: identify,
    product: product,
    inverseOf: inverseOf,
    orderOf: orderOf,
    reduceWord: reduceWord,
    vertexPos: vertexPos,
    permutationOf: permutationOf,
    composePerm: composePerm,
    fixedVertices: fixedVertices,
    cycleNotation: cycleNotation,
    axisAngleOf: axisAngleOf,
    isReflection: isReflection,
    centerOf: centerOf,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = D6Core; }

//======================================================================
// [UI IIFE] #dihedral-group-visualizer, prefix dgv-
// Action mode: clicking an element g composes g onto the current state
// (state <- g o state), with a breadcrumb showing the word and its
// live reduction. Everything displayed is recomputed from D6Core.
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
    grid: 'rgba(255, 255, 255, 0.1)',
    accent: '#66bb6a',
    rotCol: '#4da3ff',
    refCol: '#ff7043',
    axisCol: '#f0c040',
    fixedCol: '#f0c040',
    canvasBg: '#0f1419',
    bad: '#e74c3c'
  };
  var SUP = { 0: '\u2070', 1: '', 2: '\u00B2', 3: '\u00B3', 4: '\u2074', 5: '\u2075' };
  function pretty(id) {
    if (id === 'e') return 'e';
    var p = D6Core.parseId(id);
    var base = p.k === 0 ? '' : 'r' + (SUP[p.k] || '');
    return (base + (p.m ? 's' : '')) || 'e';
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

  function init() {
    var container = document.getElementById('dihedral-group-visualizer');
    if (!container) return;
    if (container.dataset.dgvInit) return; // idempotency guard
    container.dataset.dgvInit = '1';

    var gate;
    try { gate = D6Core.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests crashed: ' + e.message] }; }
    if (!gate.pass) { container.innerHTML = refusalHtml(gate); return; }

    var G = D6Core;
    var word = [];          // click history (in click order)
    var current = 'e';

    var rotBtns = G.IDS.filter(function (id) { return !G.isReflection(id); });
    var refBtns = G.IDS.filter(G.isReflection);
    function btnHtml(id, cls) {
      var sub = G.isReflection(id) ? 'axis ' + Math.round(G.axisAngleOf(id)) + '\u00B0' : (60 * G.parseId(id).k) + '\u00B0';
      return '<button class="dgv-btn ' + cls + '" data-el="' + id + '">' +
        '<span class="dgv-btnsym">' + pretty(id) + '</span><span class="dgv-btnsub">' + sub + '</span></button>';
    }
    var optionsHtml = G.IDS.map(function (id) {
      return '<option value="' + id + '">' + pretty(id) + '</option>';
    }).join('');

    container.innerHTML =
      '<div class="dgv-root">' +
      '<div class="dgv-hint">Each button is an element of D\u2086 <em>acting</em> on the hexagon: clicking g replaces the ' +
        'current state x by g \u2218 x, and the word below reduces live using the relations ' +
        'r\u2076 = e, s\u00B2 = e, srs = r\u207B\u00B9. There are no in-between angles &mdash; the polygon snaps from one ' +
        'symmetric configuration to the next. Watch the vertex labels: the permutation shown is derived from the very ' +
        'matrix displayed on the right, so the numbers, the matrix, and the picture always agree.</div>' +
      '<div class="dgv-layout">' +
      '<div class="dgv-canvascell">' +
        '<canvas id="dgv-canvas" width="480" height="480"></canvas>' +
        '<div class="dgv-caption"><span style="color:' + C.rotCol + ';">&#9644;</span> current configuration &nbsp;' +
          '<span style="color:' + C.faint + ';">&#9644;</span> identity (ghost) &nbsp;' +
          '<span style="color:' + C.axisCol + ';">&#9644;</span> reflection axis / fixed vertices</div>' +
        '<div id="dgv-word" class="dgv-word"></div>' +
      '</div>' +
      '<div class="dgv-side">' +
        '<div class="dgv-panel"><div class="dgv-paneltitle">Current state</div>' +
          '<div class="dgv-rows">' +
          '<div><span class="dgv-k">Element</span><span id="dgv-el" class="dgv-v dgv-big"></span></div>' +
          '<div><span class="dgv-k">Type</span><span id="dgv-type" class="dgv-v"></span></div>' +
          '<div><span class="dgv-k">Order</span><span id="dgv-order" class="dgv-v"></span></div>' +
          '<div><span class="dgv-k">Inverse</span><span id="dgv-inv" class="dgv-v"></span></div>' +
          '<div><span class="dgv-k">Permutation</span><span id="dgv-perm" class="dgv-v dgv-mono"></span></div>' +
          '<div id="dgv-fixedrow"><span class="dgv-k">Fixed vertices</span><span id="dgv-fixed" class="dgv-v"></span></div>' +
          '</div></div>' +
        '<div class="dgv-panel"><div class="dgv-paneltitle">2\u00D72 matrix (acts on the plane)</div>' +
          '<div class="dgv-matrix dgv-mono" id="dgv-matrix"></div>' +
          '<div class="dgv-matprops"><span id="dgv-det"></span><span id="dgv-ortho">orthogonal \u2713</span></div></div>' +
        '<div class="dgv-panel"><div class="dgv-paneltitle">Rotations \u27E8r\u27E9 &mdash; cyclic subgroup of order 6</div>' +
          '<div class="dgv-btngrid">' + rotBtns.map(function (id) { return btnHtml(id, 'dgv-rot'); }).join('') + '</div>' +
          '<div class="dgv-paneltitle" style="margin-top:10px;">Reflections &mdash; the coset \u27E8r\u27E9s</div>' +
          '<div class="dgv-btngrid">' + refBtns.map(function (id) { return btnHtml(id, 'dgv-ref'); }).join('') + '</div>' +
          '<div class="dgv-btnrow"><button class="dgv-btn dgv-wide" id="dgv-reset">Reset to e</button></div></div>' +
        '<div class="dgv-panel"><div class="dgv-paneltitle">Composition calculator (g\u2082 \u2218 g\u2081: apply g\u2081 first)</div>' +
          '<div class="dgv-composerow">' +
            '<select id="dgv-g2" class="dgv-select">' + optionsHtml + '</select>' +
            '<span class="dgv-op">\u2218</span>' +
            '<select id="dgv-g1" class="dgv-select">' + optionsHtml + '</select>' +
            '<span class="dgv-op">=</span><span id="dgv-composeres" class="dgv-v dgv-big"></span>' +
          '</div>' +
          '<div class="dgv-note">Try g\u2082 = r, g\u2081 = s against g\u2082 = s, g\u2081 = r: ' +
            'r \u2218 s = ' + pretty(G.product('r', 's')) + ' but s \u2218 r = ' + pretty(G.product('s', 'r')) +
            ' &mdash; the group is non-Abelian, and this single inequality is why 3D orientation needs matrix products, not addition.</div>' +
        '</div>' +
      '</div></div></div>';

    var style = document.createElement('style');
    style.textContent =
      '#dihedral-group-visualizer .dgv-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#dihedral-group-visualizer .dgv-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.55;}' +
      '#dihedral-group-visualizer .dgv-layout{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;}' +
      '#dihedral-group-visualizer .dgv-canvascell{flex:1;min-width:300px;max-width:520px;}' +
      '#dihedral-group-visualizer canvas{width:100%;height:auto;background:' + C.canvasBg + ';border:1px solid ' + C.border + ';border-radius:4px;display:block;}' +
      '#dihedral-group-visualizer .dgv-caption{font-size:0.78rem;color:' + C.faint + ';margin-top:5px;line-height:1.5;}' +
      '#dihedral-group-visualizer .dgv-word{margin-top:8px;font-size:0.95rem;font-family:"Courier New",monospace;' +
        'background:rgba(255,255,255,0.03);border:1px solid ' + C.border + ';border-radius:8px;padding:8px 10px;min-height:1.4em;}' +
      '#dihedral-group-visualizer .dgv-word .dgv-eq{color:' + C.accent + ';}' +
      '#dihedral-group-visualizer .dgv-side{flex:1;min-width:300px;display:flex;flex-direction:column;gap:12px;}' +
      '#dihedral-group-visualizer .dgv-panel{border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;background:rgba(255,255,255,0.02);}' +
      '#dihedral-group-visualizer .dgv-paneltitle{font-size:0.85rem;color:' + C.accent + ';font-weight:600;margin-bottom:8px;}' +
      '#dihedral-group-visualizer .dgv-rows > div{display:flex;justify-content:space-between;gap:10px;font-size:0.88rem;margin-bottom:4px;}' +
      '#dihedral-group-visualizer .dgv-k{color:' + C.textDim + ';}' +
      '#dihedral-group-visualizer .dgv-v{color:' + C.text + ';text-align:right;}' +
      '#dihedral-group-visualizer .dgv-big{font-size:1.15rem;font-weight:bold;color:' + C.accent + ';}' +
      '#dihedral-group-visualizer .dgv-mono{font-family:"Courier New",monospace;}' +
      '#dihedral-group-visualizer .dgv-matrix{font-size:1rem;line-height:1.6;white-space:pre;text-align:center;}' +
      '#dihedral-group-visualizer .dgv-matprops{display:flex;justify-content:space-around;font-size:0.82rem;color:' + C.textDim + ';margin-top:6px;}' +
      '#dihedral-group-visualizer .dgv-btngrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;}' +
      '#dihedral-group-visualizer .dgv-btn{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 4px;' +
        'border:1px solid ' + C.borderStrong + ';border-radius:4px;background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;}' +
      '#dihedral-group-visualizer .dgv-btnsym{font-size:0.95rem;font-weight:bold;}' +
      '#dihedral-group-visualizer .dgv-btnsub{font-size:0.65rem;color:' + C.faint + ';}' +
      '#dihedral-group-visualizer .dgv-rot:hover{border-color:' + C.rotCol + ';background:rgba(77,163,255,0.12);}' +
      '#dihedral-group-visualizer .dgv-ref:hover{border-color:' + C.refCol + ';background:rgba(255,112,67,0.12);}' +
      '#dihedral-group-visualizer .dgv-btnrow{margin-top:8px;}' +
      '#dihedral-group-visualizer .dgv-wide{width:100%;flex-direction:row;justify-content:center;}' +
      '#dihedral-group-visualizer .dgv-wide:hover{background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);}' +
      '#dihedral-group-visualizer .dgv-composerow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
      '#dihedral-group-visualizer .dgv-select{background:rgba(255,255,255,0.06);color:' + C.text + ';border:1px solid ' + C.borderStrong + ';border-radius:4px;padding:4px 6px;color-scheme:dark;}' +
      '#dihedral-group-visualizer .dgv-select option{background:#1a2433;color:' + C.text + ';}' +
      '#dihedral-group-visualizer .dgv-op{color:' + C.faint + ';font-size:1.1rem;}' +
      '#dihedral-group-visualizer .dgv-note{font-size:0.78rem;color:' + C.faint + ';line-height:1.5;margin-top:8px;}';
    document.head.appendChild(style);

    var canvas = document.getElementById('dgv-canvas');
    var ctx = canvas.getContext('2d');
    var wordEl = document.getElementById('dgv-word');

    function toScreen(p) { // math y-up -> canvas y-down
      var cx = canvas.width / 2, cy = canvas.height / 2, R = 150;
      return { x: cx + p.x * R, y: cy - p.y * R };
    }

    function draw() {
      var M = G.matrixOf(current);
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // faint grid circle
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 150, 0, 2 * Math.PI);
      ctx.stroke();
      // ghost identity hexagon
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (var i = 1; i <= 6; i++) {
        var g0 = toScreen(G.vertexPos(i));
        if (i === 1) ctx.moveTo(g0.x, g0.y); else ctx.lineTo(g0.x, g0.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      // reflection axis of the current element
      if (G.isReflection(current)) {
        var a = G.axisAngleOf(current) * Math.PI / 180;
        var p1 = toScreen({ x: 1.25 * Math.cos(a), y: 1.25 * Math.sin(a) });
        var p2 = toScreen({ x: -1.25 * Math.cos(a), y: -1.25 * Math.sin(a) });
        ctx.strokeStyle = C.axisCol;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 5]);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.setLineDash([]);
      }
      // transformed hexagon: vertex i drawn at M . vertexPos(i)
      var col = G.isReflection(current) ? C.refCol : C.rotCol;
      var pts = [];
      for (i = 1; i <= 6; i++) {
        var p = G.vertexPos(i);
        pts.push(toScreen({ x: M[0][0] * p.x + M[0][1] * p.y, y: M[1][0] * p.x + M[1][1] * p.y }));
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      pts.forEach(function (q, idx) { if (idx === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); });
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(77,163,255,0.06)';
      ctx.fill();
      // vertex markers with labels that TRAVEL with the vertices
      var fixed = G.fixedVertices(G.permutationOf(current));
      for (i = 0; i < 6; i++) {
        var q2 = pts[i];
        var isFixed = fixed.indexOf(i + 1) >= 0;
        ctx.beginPath();
        ctx.arc(q2.x, q2.y, 13, 0, 2 * Math.PI);
        ctx.fillStyle = isFixed ? C.fixedCol : col;
        ctx.fill();
        ctx.fillStyle = '#0f1419';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), q2.x, q2.y);
      }
    }

    function fmt2(v) {
      var s = (Math.abs(v) < 5e-13 ? 0 : v).toFixed(2);
      return (v >= 0 ? ' ' : '') + s;
    }

    function renderState() {
      var M = G.matrixOf(current);
      var perm = G.permutationOf(current);
      var fixed = G.fixedVertices(perm);
      document.getElementById('dgv-el').textContent = pretty(current);
      document.getElementById('dgv-type').textContent =
        current === 'e' ? 'identity' :
          (G.isReflection(current)
            ? 'reflection (axis ' + Math.round(G.axisAngleOf(current)) + '\u00B0)'
            : 'rotation (' + 60 * G.parseId(current).k + '\u00B0)');
      document.getElementById('dgv-order').textContent = '|' + pretty(current) + '| = ' + G.orderOf(current);
      document.getElementById('dgv-inv').textContent = pretty(G.inverseOf(current));
      document.getElementById('dgv-perm').textContent = G.cycleNotation(perm);
      document.getElementById('dgv-fixedrow').style.display = G.isReflection(current) ? 'flex' : 'none';
      document.getElementById('dgv-fixed').textContent =
        fixed.length ? fixed.join(', ') + ' (on the axis)' : 'none (axis through edge midpoints)';
      document.getElementById('dgv-matrix').textContent =
        '[ ' + fmt2(M[0][0]) + '  ' + fmt2(M[0][1]) + ' ]\n[ ' + fmt2(M[1][0]) + '  ' + fmt2(M[1][1]) + ' ]';
      document.getElementById('dgv-det').textContent = 'det = ' + (G.det2(M) > 0 ? '+1' : '\u22121');
      // breadcrumb: rightmost factor acts first (= earliest click)
      if (word.length === 0) {
        wordEl.innerHTML = 'word: <span class="dgv-eq">e</span> (no clicks yet)';
      } else {
        var shown = word.slice(-8);
        var prefix = word.length > 8 ? '\u2026 \u2218 ' : '';
        wordEl.innerHTML = 'word: ' + prefix +
          shown.slice().reverse().map(pretty).join(' \u2218 ') +
          ' <span class="dgv-eq">= ' + pretty(current) + '</span>';
      }
      draw();
    }

    container.querySelectorAll('.dgv-btn[data-el]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        word.push(btn.dataset.el);
        current = G.product(btn.dataset.el, current); // g o x
        renderState();
      });
    });
    document.getElementById('dgv-reset').addEventListener('click', function () {
      word = [];
      current = 'e';
      renderState();
    });

    var g1Sel = document.getElementById('dgv-g1'), g2Sel = document.getElementById('dgv-g2');
    function renderCompose() {
      document.getElementById('dgv-composeres').textContent =
        pretty(G.product(g2Sel.value, g1Sel.value));
    }
    g1Sel.addEventListener('change', renderCompose);
    g2Sel.addEventListener('change', renderCompose);
    g1Sel.value = 's'; g2Sel.value = 'r';

    renderCompose();
    renderState();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();