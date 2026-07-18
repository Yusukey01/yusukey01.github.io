// sec4_p12_graph_coloring.js (v2) -- disc-12
//======================================================================
// [Core IIFE] GraphCore: graph data and coloring mathematics, DOM-free.
// Design principle: every displayed claim is EXECUTED in runSelfTests():
//   - chromatic numbers are proved by exhaustive backtracking (both the
//     k-coloring found and the (k-1)-impossibility),
//   - "planar: true" is proved geometrically: the shipped straight-line
//     layout is verified to have ZERO edge crossings (a plane drawing
//     is a planarity certificate),
//   - "planar: false" for the Petersen graph is proved by a frozen
//     K3,3 subdivision, discovered by search and re-verified here edge
//     by edge -- the edge-count bounds provably do NOT suffice, and
//     that insufficiency is itself a certificate,
//   - the Kempe swap properness lemma (the engine of the Five Color
//     Theorem's proof on this page) is executed over seeded random
//     proper colorings.
// The icosahedron layout is a Tutte barycentric embedding (outer face
// {9,10,11}), radially spread and mechanically re-verified crossing-free;
// v1's hand layout drew this planar graph with 12 crossings.
//======================================================================
var GraphCore = (function () {
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

  // ---------- presets ----------
  function makeK4() {
    var cx = 0.5, cy = 0.52, R = 0.38;
    var verts = [];
    for (var i = 0; i < 3; i++) {
      var a = -Math.PI / 2 + (2 * Math.PI * i) / 3;
      verts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
    }
    verts.push({ x: cx, y: cy });
    return {
      key: 'k4',
      name: 'K\u2084 (complete graph)',
      vertices: verts,
      edges: [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]],
      faces: 4,
      planar: true,
      chromatic: 4,
      description: 'The smallest graph requiring 4 colors: all four vertices are mutually adjacent.'
    };
  }

  function makeIcosahedron() {
    // Tutte barycentric embedding with outer face {9, 10, 11}, radially
    // spread (gamma = 0.6) and certified crossing-free (see B4).
    var verts = [
      { x: 0.6104, y: 0.5943 }, { x: 0.7046, y: 0.7935 }, { x: 0.5, y: 0.7983 },
      { x: 0.3896, y: 0.5943 }, { x: 0.5, y: 0.3777 }, { x: 0.7094, y: 0.5194 },
      { x: 0.5, y: 0.9258 }, { x: 0.2954, y: 0.7935 }, { x: 0.2906, y: 0.5194 },
      { x: 0.5, y: 0.05 }, { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 }
    ];
    var edges = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [2, 3], [3, 4], [4, 5], [5, 1],
      [1, 6], [2, 6], [2, 7], [3, 7], [3, 8], [4, 8], [4, 9], [5, 9], [5, 10], [1, 10],
      [6, 7], [7, 8], [8, 9], [9, 10], [10, 6],
      [6, 11], [7, 11], [8, 11], [9, 11], [10, 11]
    ];
    return {
      key: 'icosa',
      name: 'Icosahedron (12 vertices)',
      vertices: verts,
      edges: edges,
      faces: 20,
      planar: true,
      chromatic: 4,
      description: 'The icosahedron skeleton, drawn as a genuine plane graph (Tutte embedding, zero crossings). A real challenge with 4 colors \u2014 and the natural stage for a Kempe-chain rescue.'
    };
  }

  function makePetersen() {
    var verts = [];
    var cx = 0.5, cy = 0.52;
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + (2 * Math.PI * i) / 5;
      verts.push({ x: cx + 0.40 * Math.cos(a), y: cy + 0.40 * Math.sin(a) });
    }
    for (i = 0; i < 5; i++) {
      var a2 = -Math.PI / 2 + (2 * Math.PI * i) / 5;
      verts.push({ x: cx + 0.19 * Math.cos(a2), y: cy + 0.19 * Math.sin(a2) });
    }
    var edges = [];
    for (i = 0; i < 5; i++) {
      edges.push([i, (i + 1) % 5]);
      edges.push([i, i + 5]);
      edges.push([i + 5, ((i + 2) % 5) + 5]);
    }
    return {
      key: 'petersen',
      name: 'Petersen graph (non-planar)',
      vertices: verts,
      edges: edges,
      faces: null,
      planar: false,
      chromatic: 3,
      description: 'Non-planar \u2014 yet 3-colorable. Both planar edge bounds are satisfied; only its K\u2083,\u2083 subdivision (verified by the self-tests) certifies non-planarity. Euler\u2019s formula does not apply.'
    };
  }

  // FROZEN witness (found by search, independently re-verified in B6):
  // a K3,3 subdivision in the Petersen graph with branch classes
  // A = {0, 2, 8}, B = {1, 3, 5} and nine internally disjoint paths.
  var PETERSEN_K33 = {
    A: [0, 2, 8],
    B: [1, 3, 5],
    paths: [[0, 1], [0, 4, 3], [0, 5], [2, 1], [2, 3], [2, 7, 5], [8, 6, 1], [8, 3], [8, 5]]
  };

  // FROZEN stuck-state scenario (found by seeded search, lemma-checked):
  // icosahedron, vertex 0 uncolored, its five neighbors 1..5 wear all
  // four colors; swapping the (1,2)-Kempe component through vertex 2
  // frees a color for vertex 0 -- the Five Color Theorem's move.
  var STUCK_SCENARIO = {
    graphKey: 'icosa',
    target: 0,
    colors: [-1, 3, 1, 0, 3, 2, 0, 3, 1, 0, 1, 2],
    swapVertex: 2,
    pair: [1, 2]
  };

  var COLORS = ['#e53935', '#1e88e5', '#43a047', '#ffb300'];
  var COLOR_NAMES = ['Red', 'Blue', 'Green', 'Amber'];
  var UNCOLORED = -1;

  // ---------- structure utilities ----------
  function adjacency(g) {
    var adj = [];
    for (var i = 0; i < g.vertices.length; i++) adj.push([]);
    g.edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    return adj;
  }
  function degrees(g) {
    return adjacency(g).map(function (l) { return l.length; });
  }
  function conflicts(g, colors) {
    var out = [];
    g.edges.forEach(function (e) {
      if (colors[e[0]] !== UNCOLORED && colors[e[0]] === colors[e[1]]) out.push(e);
    });
    return out;
  }

  // ---------- coloring decisions (exhaustive backtracking) ----------
  function kColoring(g, k, rng) {
    var n = g.vertices.length;
    var adj = adjacency(g);
    var col = new Array(n).fill(UNCOLORED);
    var order = [];
    for (var i = 0; i < n; i++) order.push(i);
    if (rng) order.sort(function () { return rng() - 0.5; });
    function bt(idx) {
      if (idx === n) return true;
      var v = order[idx];
      var cs = [];
      for (var c = 0; c < k; c++) cs.push(c);
      if (rng) cs.sort(function () { return rng() - 0.5; });
      for (var ci = 0; ci < cs.length; ci++) {
        var c2 = cs[ci];
        var ok = adj[v].every(function (w) { return col[w] !== c2; });
        if (ok) {
          col[v] = c2;
          if (bt(idx + 1)) return true;
          col[v] = UNCOLORED;
        }
      }
      return false;
    }
    return bt(0) ? col : null;
  }

  // ---------- Kempe machinery (the Five Color Theorem's engine) ----------
  function kempeComponent(g, colors, a, b, start) {
    if (colors[start] !== a && colors[start] !== b) return [];
    var adj = adjacency(g);
    var seen = {};
    seen[start] = true;
    var queue = [start], out = [];
    while (queue.length) {
      var u = queue.shift();
      out.push(u);
      adj[u].forEach(function (w) {
        if (!seen[w] && (colors[w] === a || colors[w] === b)) {
          seen[w] = true;
          queue.push(w);
        }
      });
    }
    return out.sort(function (x, y) { return x - y; });
  }
  function kempeComponents(g, a, b, colors) {
    var comps = [], done = {};
    for (var v = 0; v < g.vertices.length; v++) {
      if (done[v]) continue;
      if (colors[v] === a || colors[v] === b) {
        var comp = kempeComponent(g, colors, a, b, v);
        comp.forEach(function (u) { done[u] = true; });
        comps.push(comp);
      }
    }
    return comps;
  }
  // swap colors a <-> b inside one component; returns a NEW color array
  function kempeSwap(g, colors, a, b, component) {
    var out = colors.slice();
    component.forEach(function (v) {
      if (out[v] === a) out[v] = b;
      else if (out[v] === b) out[v] = a;
    });
    return out;
  }

  // union-find (independent route for component verification)
  function componentsViaUnionFind(g, a, b, colors) {
    var n = g.vertices.length;
    var parent = [];
    for (var i = 0; i < n; i++) parent.push(i);
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    g.edges.forEach(function (e) {
      var u = e[0], v = e[1];
      var uIn = colors[u] === a || colors[u] === b;
      var vIn = colors[v] === a || colors[v] === b;
      if (uIn && vIn) parent[find(u)] = find(v);
    });
    var groups = {};
    for (i = 0; i < n; i++) {
      if (colors[i] === a || colors[i] === b) {
        var r = find(i);
        (groups[r] = groups[r] || []).push(i);
      }
    }
    return Object.keys(groups).map(function (r) {
      return groups[r].sort(function (x, y) { return x - y; });
    }).sort(function (p, q) { return p[0] - q[0]; });
  }

  // ---------- geometric planarity certificate ----------
  function properSegmentCrossing(p1, p2, p3, p4) {
    function orient(a, b, c) {
      var v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      return Math.abs(v) < 1e-12 ? 0 : (v > 0 ? 1 : -1);
    }
    var d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2);
    var d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }
  function countLayoutCrossings(g) {
    var n = 0;
    for (var i = 0; i < g.edges.length; i++) {
      for (var j = i + 1; j < g.edges.length; j++) {
        var e = g.edges[i], f = g.edges[j];
        if (e[0] === f[0] || e[0] === f[1] || e[1] === f[0] || e[1] === f[1]) continue;
        if (properSegmentCrossing(g.vertices[e[0]], g.vertices[e[1]], g.vertices[f[0]], g.vertices[f[1]])) n++;
      }
    }
    return n;
  }

  function buildPresets() {
    return [makeK4(), makeIcosahedron(), makePetersen()];
  }

  //====================================================================
  // Self-tests
  //====================================================================
  function runSelfTests() {
    var failures = [];
    function check(name, cond, detail) {
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    var presets = buildPresets();
    var byKey = {};
    presets.forEach(function (g) { byKey[g.key] = g; });
    var rng = mulberry32(20260717);
    var i, j;

    // B1: structural sanity: simple graphs, declared counts, handshake
    presets.forEach(function (g) {
      var n = g.vertices.length;
      var seen = {};
      var simple = g.edges.every(function (e) {
        if (e[0] === e[1]) return false;
        var key = Math.min(e[0], e[1]) + ',' + Math.max(e[0], e[1]);
        if (seen[key]) return false;
        seen[key] = true;
        return e[0] >= 0 && e[1] >= 0 && e[0] < n && e[1] < n;
      });
      check('B1a simple graph: ' + g.key, simple);
      var degSum = degrees(g).reduce(function (a, b) { return a + b; }, 0);
      check('B1b handshake 2E: ' + g.key, degSum === 2 * g.edges.length);
    });
    check('B1c sizes: K4 (4,6), icosa (12,30), Petersen (10,15)',
      byKey.k4.vertices.length === 4 && byKey.k4.edges.length === 6 &&
      byKey.icosa.vertices.length === 12 && byKey.icosa.edges.length === 30 &&
      byKey.petersen.vertices.length === 10 && byKey.petersen.edges.length === 15);
    check('B1d icosahedron is 5-regular', degrees(byKey.icosa).every(function (d) { return d === 5; }));
    check('B1e Petersen is 3-regular', degrees(byKey.petersen).every(function (d) { return d === 3; }));

    // B2: Euler's formula V - E + F = 2 for the planar presets
    presets.forEach(function (g) {
      if (!g.planar) return;
      check('B2 Euler V-E+F == 2: ' + g.key,
        g.vertices.length - g.edges.length + g.faces === 2,
        g.vertices.length - g.edges.length + g.faces);
    });

    // B3: consequences of Euler's formula on the planar presets
    presets.forEach(function (g) {
      if (!g.planar) return;
      var V = g.vertices.length, E = g.edges.length;
      check('B3a edge bound E <= 3V-6: ' + g.key, E <= 3 * V - 6);
      check('B3b min degree <= 5: ' + g.key, Math.min.apply(null, degrees(g)) <= 5);
    });
    // ...and their PROVABLE INSUFFICIENCY on the Petersen graph: it
    // satisfies both bounds yet is non-planar (B6 provides the witness)
    (function () {
      var V = 10, E = 15;
      check('B3c Petersen satisfies E <= 3V-6', E <= 3 * V - 6);
      check('B3d Petersen satisfies the triangle-free bound E <= 2V-4', E <= 2 * V - 4);
      // triangle-freeness itself, exhaustively
      var adj = adjacency(byKey.petersen);
      var tri = false;
      for (i = 0; i < 10; i++) {
        adj[i].forEach(function (u) {
          adj[i].forEach(function (w) { if (u < w && adj[u].indexOf(w) >= 0) tri = true; });
        });
      }
      check('B3e Petersen is triangle-free (exhaustive)', !tri);
    })();

    // B4: PLANARITY BY DRAWING -- the shipped layouts of the planar
    // presets are straight-line embeddings with zero crossings
    check('B4a K4 layout has zero crossings', countLayoutCrossings(byKey.k4) === 0,
      countLayoutCrossings(byKey.k4));
    check('B4b icosahedron layout has zero crossings (Tutte embedding)',
      countLayoutCrossings(byKey.icosa) === 0, countLayoutCrossings(byKey.icosa));
    check('B4c Petersen layout has crossings (as it must)',
      countLayoutCrossings(byKey.petersen) > 0);

    // B5: chromatic numbers, PROVED by exhaustive search both ways
    (function () {
      check('B5a K4 is not 3-colorable', kColoring(byKey.k4, 3) === null);
      check('B5b K4 is 4-colorable', kColoring(byKey.k4, 4) !== null);
      check('B5c icosahedron is not 3-colorable (exhaustive)', kColoring(byKey.icosa, 3) === null);
      var c4 = kColoring(byKey.icosa, 4);
      check('B5d icosahedron is 4-colorable', c4 !== null && conflicts(byKey.icosa, c4).length === 0);
      check('B5e Petersen is not 2-colorable', kColoring(byKey.petersen, 2) === null);
      var p3 = kColoring(byKey.petersen, 3);
      check('B5f Petersen is 3-colorable', p3 !== null && conflicts(byKey.petersen, p3).length === 0);
      check('B5g declared chromatic numbers match the proofs',
        byKey.k4.chromatic === 4 && byKey.icosa.chromatic === 4 && byKey.petersen.chromatic === 3);
    })();

    // B6: the frozen K3,3 subdivision in the Petersen graph, re-verified
    // edge by edge, with pairwise internally disjoint paths
    (function () {
      var g = byKey.petersen;
      var eset = {};
      g.edges.forEach(function (e) { eset[Math.min(e[0], e[1]) + ',' + Math.max(e[0], e[1])] = true; });
      var sub = PETERSEN_K33;
      var branch = {};
      sub.A.concat(sub.B).forEach(function (v) { branch[v] = true; });
      check('B6a six distinct branch vertices', Object.keys(branch).length === 6);
      var ok = true, internalSeen = {}, pi = 0;
      sub.A.forEach(function (a) {
        sub.B.forEach(function (b) {
          var p = sub.paths[pi++];
          if (p[0] !== a || p[p.length - 1] !== b) ok = false;
          for (var t = 0; t + 1 < p.length; t++) {
            if (!eset[Math.min(p[t], p[t + 1]) + ',' + Math.max(p[t], p[t + 1])]) ok = false;
          }
          p.slice(1, -1).forEach(function (v) {
            if (branch[v] || internalSeen[v]) ok = false;
            internalSeen[v] = true;
          });
        });
      });
      check('B6b nine paths: endpoints correct, edges exist, internally disjoint', ok);
      check('B6c hence a K3,3 subdivision certifies non-planarity (Kuratowski)',
        ok && byKey.petersen.planar === false);
    })();

    // B7: Kempe components -- BFS route == union-find route, and no
    // edge of the two chosen colors crosses between components
    (function () {
      var okAll = true, okSep = true;
      presets.forEach(function (g) {
        for (var trial = 0; trial < 4; trial++) {
          var col = kColoring(g, 4, rng);
          for (var a = 0; a < 4; a++) {
            for (var b = a + 1; b < 4; b++) {
              var c1 = kempeComponents(g, a, b, col).map(function (c) { return c.join('-'); }).sort();
              var c2 = componentsViaUnionFind(g, a, b, col).map(function (c) { return c.join('-'); }).sort();
              if (c1.join('|') !== c2.join('|')) okAll = false;
              // separation: any (a,b)-colored edge endpoints share a component
              var compOf = {};
              kempeComponents(g, a, b, col).forEach(function (c, ci) {
                c.forEach(function (v) { compOf[v] = ci; });
              });
              g.edges.forEach(function (e) {
                var uIn = col[e[0]] === a || col[e[0]] === b;
                var vIn = col[e[1]] === a || col[e[1]] === b;
                if (uIn && vIn && compOf[e[0]] !== compOf[e[1]]) okSep = false;
              });
            }
          }
        }
      });
      check('B7a BFS components == union-find components (all presets, pairs, seeded)', okAll);
      check('B7b components are maximal: no in-palette edge crosses them', okSep);
    })();

    // B8: THE KEMPE SWAP LEMMA (the Five Color Theorem's engine):
    // swapping a component of a PROPER coloring stays proper; and the
    // swap is an involution
    (function () {
      var okProper = true, okInv = true, swapsTried = 0;
      presets.forEach(function (g) {
        for (var trial = 0; trial < 6; trial++) {
          var col = kColoring(g, 4, rng);
          if (conflicts(g, col).length !== 0) { okProper = false; return; }
          for (var a = 0; a < 4; a++) {
            for (var b = a + 1; b < 4; b++) {
              kempeComponents(g, a, b, col).forEach(function (comp) {
                var swapped = kempeSwap(g, col, a, b, comp);
                swapsTried++;
                if (conflicts(g, swapped).length !== 0) okProper = false;
                var back = kempeSwap(g, swapped, a, b, comp);
                if (back.join(',') !== col.join(',')) okInv = false;
              });
            }
          }
        }
      });
      check('B8a swap of any Kempe component preserves properness (' + swapsTried + ' swaps)',
        okProper && swapsTried > 100, swapsTried);
      check('B8b swap is an involution', okInv);
    })();

    // B9: the frozen stuck-state scenario -- the Five Color move, staged
    (function () {
      var g = byKey[STUCK_SCENARIO.graphKey];
      var col = STUCK_SCENARIO.colors.slice();
      var adj = adjacency(g);
      var t = STUCK_SCENARIO.target;
      check('B9a target vertex uncolored, all others colored',
        col[t] === UNCOLORED && col.every(function (c, v) { return v === t ? true : c !== UNCOLORED; }));
      check('B9b coloring proper away from the target', conflicts(g, col).length === 0);
      var nbrCols = {};
      adj[t].forEach(function (w) { nbrCols[col[w]] = true; });
      check('B9c neighbors of the target wear all 4 colors', Object.keys(nbrCols).length === 4);
      var comp = kempeComponent(g, col, STUCK_SCENARIO.pair[0], STUCK_SCENARIO.pair[1], STUCK_SCENARIO.swapVertex);
      var swapped = kempeSwap(g, col, STUCK_SCENARIO.pair[0], STUCK_SCENARIO.pair[1], comp);
      check('B9d the staged swap stays proper', conflicts(g, swapped).length === 0);
      var after = {};
      adj[t].forEach(function (w) { after[swapped[w]] = true; });
      check('B9e after the swap the neighbors use <= 3 colors: a color is freed',
        Object.keys(after).length <= 3, Object.keys(after).length);
    })();

    // B10: partial-coloring semantics of the conflict detector -- two
    // adjacent UNCOLORED vertices are not a conflict, and a genuine
    // monochromatic edge is reported exactly once
    (function () {
      var g = byKey.k4;
      check('B10a adjacent uncolored pair is not a conflict',
        conflicts(g, [UNCOLORED, UNCOLORED, 0, 1]).length === 0);
      var cf = conflicts(g, [0, 0, UNCOLORED, UNCOLORED]);
      check('B10b the one monochromatic edge is reported exactly once',
        cf.length === 1 && cf[0][0] === 0 && cf[0][1] === 1, JSON.stringify(cf));
    })();

    return { pass: failures.length === 0, failures: failures };
  }

  return {
    mulberry32: mulberry32,
    COLORS: COLORS,
    COLOR_NAMES: COLOR_NAMES,
    UNCOLORED: UNCOLORED,
    buildPresets: buildPresets,
    PETERSEN_K33: PETERSEN_K33,
    STUCK_SCENARIO: STUCK_SCENARIO,
    adjacency: adjacency,
    degrees: degrees,
    conflicts: conflicts,
    kColoring: kColoring,
    kempeComponent: kempeComponent,
    kempeComponents: kempeComponents,
    kempeSwap: kempeSwap,
    componentsViaUnionFind: componentsViaUnionFind,
    countLayoutCrossings: countLayoutCrossings,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = GraphCore; }

//======================================================================
// [UI IIFE] #graph-coloring-demo, prefix gcv-
// Interaction model: pick a palette color, click vertices. The Kempe
// card lists the chain components of a chosen color pair, each with a
// Swap button -- executing the Five Color Theorem's move; certificate
// B8 guarantees a swap can never create a conflict, and the conflict
// counter verifies it live. "Stage the proof's move" loads the frozen
// stuck state (B9). On the Petersen graph, a toggle overlays the
// certified K3,3 subdivision (B6).
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
    accent: '#66bb6a',
    warn: '#f0c040',
    bad: '#e74c3c',
    canvasBg: '#0f1419',
    edge: 'rgba(180, 200, 230, 0.45)',
    uncolored: '#37474f',
    k33: '#ffffff'
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
    var container = document.getElementById('graph-coloring-demo');
    if (!container) return;
    if (container.dataset.gcvInit) return; // idempotency guard
    container.dataset.gcvInit = '1';

    var gate;
    try { gate = GraphCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests crashed: ' + e.message] }; }
    if (!gate.pass) { container.innerHTML = refusalHtml(gate); return; }

    var G = GraphCore;
    var PRESETS = G.buildPresets();
    var state = {
      graph: null,
      colors: [],
      selected: 0,
      kempePair: null,     // [a, b] or null
      kempeComps: [],
      hoverComp: -1,
      k33: false,
      stagedTarget: null
    };

    container.innerHTML =
      '<div class="gcv-root">' +
      '<div class="gcv-hint">Pick a color, click vertices; adjacent equal colors are flagged instantly. When you paint ' +
        'yourself into a corner, do what the Five Color proof does: choose a color pair in the Kempe card and ' +
        '<em>swap</em> a chain component \u2014 the swap can never create a conflict (the demo\u2019s self-tests execute ' +
        'exactly that lemma), but it can free a color where you need one.</div>' +
      '<div class="gcv-layout">' +
      '<div class="gcv-canvascell">' +
        '<div class="gcv-presets" id="gcv-presets"></div>' +
        '<canvas id="gcv-canvas" width="600" height="600"></canvas>' +
        '<div class="gcv-palette" id="gcv-palette"></div>' +
        '<div class="gcv-caption" id="gcv-desc"></div>' +
      '</div>' +
      '<div class="gcv-side">' +
        '<div class="gcv-panel"><div class="gcv-paneltitle">Graph properties</div>' +
          '<div class="gcv-rows">' +
          '<div><span class="gcv-k">Graph</span><span class="gcv-v" id="gcv-name"></span></div>' +
          '<div><span class="gcv-k">V / E / F</span><span class="gcv-v gcv-mono" id="gcv-vef"></span></div>' +
          '<div><span class="gcv-k">V \u2212 E + F</span><span class="gcv-v gcv-mono" id="gcv-euler"></span></div>' +
          '<div><span class="gcv-k">\u03B4(G) min degree</span><span class="gcv-v gcv-mono" id="gcv-delta"></span></div>' +
          '<div><span class="gcv-k">Planar</span><span class="gcv-v" id="gcv-planar"></span></div>' +
          '</div>' +
          '<div class="gcv-btnrow" id="gcv-k33-row" style="display:none;">' +
            '<button class="gcv-btn" id="gcv-k33-btn" aria-pressed="false">Show the K\u2083,\u2083 subdivision witness</button>' +
          '</div></div>' +
        '<div class="gcv-panel"><div class="gcv-paneltitle">Coloring status</div>' +
          '<div class="gcv-rows">' +
          '<div><span class="gcv-k">\u03C7(G), proven by the self-tests</span><span class="gcv-v gcv-mono" id="gcv-chrom"></span></div>' +
          '<div><span class="gcv-k">Colors used</span><span class="gcv-v gcv-mono" id="gcv-used"></span></div>' +
          '<div><span class="gcv-k">Vertices colored</span><span class="gcv-v gcv-mono" id="gcv-colored"></span></div>' +
          '<div><span class="gcv-k">Conflicts</span><span class="gcv-v gcv-mono" id="gcv-conf"></span></div>' +
          '</div>' +
          '<div class="gcv-status" id="gcv-status"></div></div>' +
        '<div class="gcv-panel"><div class="gcv-paneltitle">Kempe chains \u2014 the proof\u2019s move</div>' +
          '<div class="gcv-note">Choose two colors; each connected component of the two-colored subgraph gets a Swap button.</div>' +
          '<div class="gcv-kpairs" id="gcv-kpairs"></div>' +
          '<div class="gcv-kcomps" id="gcv-kcomps"></div>' +
          '<div class="gcv-btnrow" id="gcv-stage-row" style="display:none;">' +
            '<button class="gcv-btn" id="gcv-stage-btn">Stage the proof\u2019s move (stuck state)</button>' +
          '</div></div>' +
        '<div class="gcv-btnrow">' +
          '<button class="gcv-btn" id="gcv-clear">\u21BA Clear colors</button></div>' +
      '</div></div></div>';

    var style = document.createElement('style');
    style.textContent =
      '#graph-coloring-demo .gcv-root{display:flex;flex-direction:column;gap:12px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#graph-coloring-demo .gcv-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.55;}' +
      '#graph-coloring-demo .gcv-layout{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;}' +
      '#graph-coloring-demo .gcv-canvascell{flex:1.15;min-width:300px;max-width:560px;}' +
      '#graph-coloring-demo canvas{width:100%;height:auto;background:' + C.canvasBg + ';border:1px solid ' + C.border + ';' +
        'border-radius:4px;display:block;cursor:pointer;}' +
      '#graph-coloring-demo .gcv-presets{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}' +
      '#graph-coloring-demo .gcv-palette{display:flex;gap:8px;margin-top:8px;justify-content:center;}' +
      '#graph-coloring-demo .gcv-swatch{width:34px;height:34px;border-radius:50%;cursor:pointer;border:3px solid transparent;}' +
      '#graph-coloring-demo .gcv-swatch.gcv-selected{border-color:#fff;box-shadow:0 0 8px rgba(255,255,255,0.5);}' +
      '#graph-coloring-demo .gcv-caption{font-size:0.8rem;color:' + C.faint + ';margin-top:8px;line-height:1.5;}' +
      '#graph-coloring-demo .gcv-side{flex:1;min-width:300px;display:flex;flex-direction:column;gap:12px;}' +
      '#graph-coloring-demo .gcv-panel{border:1px solid ' + C.border + ';border-radius:8px;padding:10px 12px;background:rgba(255,255,255,0.02);}' +
      '#graph-coloring-demo .gcv-paneltitle{font-size:0.85rem;color:' + C.accent + ';font-weight:600;margin-bottom:8px;}' +
      '#graph-coloring-demo .gcv-rows > div{display:flex;justify-content:space-between;gap:10px;font-size:0.86rem;margin-bottom:4px;}' +
      '#graph-coloring-demo .gcv-k{color:' + C.textDim + ';}' +
      '#graph-coloring-demo .gcv-v{text-align:right;}' +
      '#graph-coloring-demo .gcv-mono{font-family:"Courier New",monospace;}' +
      '#graph-coloring-demo .gcv-btn{padding:6px 12px;border:1px solid ' + C.borderStrong + ';border-radius:4px;' +
        'background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.82rem;}' +
      '#graph-coloring-demo .gcv-btn:hover{background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);}' +
      '#graph-coloring-demo .gcv-btn.gcv-active{background:rgba(102,187,106,0.2);border-color:' + C.accent + ';}' +
      '#graph-coloring-demo .gcv-btnrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}' +
      '#graph-coloring-demo .gcv-note{font-size:0.78rem;color:' + C.faint + ';line-height:1.5;margin-bottom:8px;}' +
      '#graph-coloring-demo .gcv-kpairs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}' +
      '#graph-coloring-demo .gcv-kpair{display:flex;align-items:center;gap:3px;padding:4px 8px;border:1px solid ' + C.borderStrong + ';' +
        'border-radius:12px;cursor:pointer;background:rgba(255,255,255,0.04);}' +
      '#graph-coloring-demo .gcv-kpair.gcv-active{border-color:' + C.accent + ';background:rgba(102,187,106,0.15);}' +
      '#graph-coloring-demo .gcv-kdot{width:12px;height:12px;border-radius:50%;display:inline-block;}' +
      '#graph-coloring-demo .gcv-kcomps{display:flex;flex-direction:column;gap:5px;font-size:0.8rem;}' +
      '#graph-coloring-demo .gcv-kcomp{display:flex;align-items:center;justify-content:space-between;gap:8px;' +
        'padding:4px 8px;border:1px solid ' + C.border + ';border-radius:4px;}' +
      '#graph-coloring-demo .gcv-kcomp:hover{border-color:' + C.warn + ';}' +
      '#graph-coloring-demo .gcv-status{margin-top:8px;font-size:0.84rem;line-height:1.5;min-height:1.4em;}' +
      '#graph-coloring-demo .gcv-status.gcv-good{color:' + C.accent + ';}' +
      '#graph-coloring-demo .gcv-status.gcv-badc{color:' + C.bad + ';}' +
      '#graph-coloring-demo .gcv-status.gcv-info{color:' + C.warn + ';}';
    document.head.appendChild(style);

    var canvas = document.getElementById('gcv-canvas');
    var ctx = canvas.getContext('2d');
    var el = function (id) { return document.getElementById(id); };

    function toPx(p) { return { x: p.x * canvas.width, y: p.y * canvas.height }; }

    // ---- rendering ----
    function draw() {
      var g = state.graph;
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      var confSet = {};
      G.conflicts(g, state.colors).forEach(function (e) {
        confSet[Math.min(e[0], e[1]) + ',' + Math.max(e[0], e[1])] = true;
      });
      var inPair = null;
      if (state.kempePair) {
        inPair = {};
        state.kempeComps.forEach(function (comp, ci) {
          comp.forEach(function (v) { inPair[v] = ci; });
        });
      }
      // K3,3 overlay path edges
      var k33Edges = {}, k33Branch = {};
      if (state.k33 && g.key === 'petersen') {
        G.PETERSEN_K33.paths.forEach(function (p) {
          for (var t = 0; t + 1 < p.length; t++) {
            k33Edges[Math.min(p[t], p[t + 1]) + ',' + Math.max(p[t], p[t + 1])] = true;
          }
        });
        G.PETERSEN_K33.A.forEach(function (v) { k33Branch[v] = 'A'; });
        G.PETERSEN_K33.B.forEach(function (v) { k33Branch[v] = 'B'; });
      }
      // edges
      g.edges.forEach(function (e) {
        var a = toPx(g.vertices[e[0]]), b = toPx(g.vertices[e[1]]);
        var key = Math.min(e[0], e[1]) + ',' + Math.max(e[0], e[1]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (confSet[key]) {
          ctx.strokeStyle = C.bad;
          ctx.lineWidth = 4;
          ctx.setLineDash([]);
        } else if (k33Edges[key]) {
          ctx.strokeStyle = C.k33;
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 5]);
        } else {
          ctx.strokeStyle = C.edge;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });
      // vertices
      g.vertices.forEach(function (p, v) {
        var q = toPx(p);
        var c = state.colors[v];
        var dim = inPair && inPair[v] === undefined;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 17, 0, 2 * Math.PI);
        ctx.fillStyle = c === G.UNCOLORED ? C.uncolored : G.COLORS[c];
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        // hover component halo
        if (inPair && inPair[v] === state.hoverComp && state.hoverComp >= 0) {
          ctx.strokeStyle = C.warn;
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        // K3,3 branch marker: square outline
        if (k33Branch[v]) {
          ctx.strokeStyle = C.k33;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(q.x - 24, q.y - 24, 48, 48);
        }
        // staged target marker
        if (state.stagedTarget === v) {
          ctx.strokeStyle = C.warn;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 25, 0, 2 * Math.PI);
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = '#0f1419';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(v), q.x, q.y);
      });
    }

    // ---- panels ----
    function updatePanels() {
      var g = state.graph;
      el('gcv-name').textContent = g.name;
      el('gcv-vef').textContent = g.vertices.length + ' / ' + g.edges.length + ' / ' + (g.faces === null ? '\u2014' : g.faces);
      el('gcv-euler').textContent = g.faces === null
        ? 'undefined (no embedding)' : String(g.vertices.length - g.edges.length + g.faces);
      el('gcv-delta').textContent = String(Math.min.apply(null, G.degrees(g)));
      el('gcv-planar').textContent = g.planar
        ? 'yes \u2014 drawn with zero crossings'
        : 'no \u2014 K\u2083,\u2083 subdivision (certified)';
      el('gcv-desc').textContent = g.description;
      el('gcv-chrom').textContent = '\u03C7 = ' + g.chromatic;
      var used = {};
      var colored = 0;
      state.colors.forEach(function (c) { if (c !== G.UNCOLORED) { used[c] = true; colored++; } });
      var nUsed = Object.keys(used).length;
      el('gcv-used').textContent = String(nUsed);
      el('gcv-colored').textContent = colored + ' / ' + g.vertices.length;
      var conf = G.conflicts(g, state.colors);
      el('gcv-conf').textContent = String(conf.length);
      var st = el('gcv-status');
      if (colored === g.vertices.length && conf.length === 0) {
        st.className = 'gcv-status gcv-good';
        st.textContent = '\u2713 Proper coloring with ' + nUsed + ' colors' +
          (nUsed === g.chromatic ? ' \u2014 optimal: matches \u03C7(G)!' : ' (\u03C7(G) = ' + g.chromatic + ' is possible).');
      } else if (conf.length > 0) {
        st.className = 'gcv-status gcv-badc';
        st.textContent = '\u2717 ' + conf.length + ' conflict' + (conf.length > 1 ? 's' : '') +
          ' \u2014 adjacent vertices share a color. A Kempe swap may untangle it.';
      } else if (state.stagedTarget !== null) {
        st.className = 'gcv-status gcv-info';
        st.textContent = 'Vertex ' + state.stagedTarget + ' is stuck: its neighbors wear all 4 colors. ' +
          'Swap the highlighted Kempe component, then color it.';
      } else {
        st.className = 'gcv-status';
        st.textContent = '';
      }
    }

    function updateKempe() {
      var pairsEl = el('gcv-kpairs');
      var compsEl = el('gcv-kcomps');
      pairsEl.innerHTML = '';
      var present = {};
      state.colors.forEach(function (c) { if (c !== G.UNCOLORED) present[c] = true; });
      var keys = Object.keys(present).map(Number);
      if (keys.length < 2) {
        state.kempePair = null;
        state.kempeComps = [];
        compsEl.innerHTML = '<span class="gcv-note">Assign at least two colors to see Kempe chains.</span>';
        return;
      }
      for (var i = 0; i < keys.length; i++) {
        for (var j = i + 1; j < keys.length; j++) {
          (function (a, b) {
            var pair = document.createElement('span');
            pair.className = 'gcv-kpair' +
              (state.kempePair && state.kempePair[0] === a && state.kempePair[1] === b ? ' gcv-active' : '');
            pair.dataset.pair = a + ',' + b;
            pair.innerHTML = '<span class="gcv-kdot" style="background:' + G.COLORS[a] + '"></span>' +
              '<span class="gcv-kdot" style="background:' + G.COLORS[b] + '"></span>';
            pair.addEventListener('click', function () {
              state.kempePair = [a, b];
              refreshKempe();
              refresh();
            });
            pairsEl.appendChild(pair);
          })(keys[i], keys[j]);
        }
      }
      refreshKempe();
    }

    function refreshKempe() {
      var compsEl = el('gcv-kcomps');
      if (!state.kempePair) { state.kempeComps = []; compsEl.innerHTML = ''; return; }
      var a = state.kempePair[0], b = state.kempePair[1];
      state.kempeComps = G.kempeComponents(state.graph, a, b, state.colors);
      compsEl.innerHTML = '';
      state.kempeComps.forEach(function (comp, ci) {
        var row = document.createElement('div');
        row.className = 'gcv-kcomp';
        row.dataset.comp = String(ci);
        row.innerHTML = '<span>Component {' + comp.join(', ') + '}</span>' +
          '<button class="gcv-btn gcv-swapbtn" data-comp="' + ci + '">Swap ' +
          G.COLOR_NAMES[a] + ' \u2194 ' + G.COLOR_NAMES[b] + '</button>';
        row.addEventListener('mouseenter', function () { state.hoverComp = ci; draw(); });
        row.addEventListener('mouseleave', function () { state.hoverComp = -1; draw(); });
        row.querySelector('button').addEventListener('click', function () {
          state.colors = G.kempeSwap(state.graph, state.colors, a, b, comp);
          refresh(); // conflicts recomputed: B8 promises zero new ones
        });
        compsEl.appendChild(row);
      });
      if (!state.kempeComps.length) {
        compsEl.innerHTML = '<span class="gcv-note">No vertex currently wears these two colors.</span>';
      }
    }

    function refresh() {
      updatePanels();
      updateKempe();
      draw();
    }

    // ---- interactions ----
    function getEventPos(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / (rect.width || canvas.width);
      var scaleY = canvas.height / (rect.height || canvas.height);
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }
    canvas.addEventListener('click', function (e) {
      var pos = getEventPos(e);
      var g = state.graph;
      for (var v = 0; v < g.vertices.length; v++) {
        var q = toPx(g.vertices[v]);
        if (Math.hypot(pos.x - q.x, pos.y - q.y) <= 22) {
          state.colors[v] = (state.colors[v] === state.selected) ? G.UNCOLORED : state.selected;
          if (state.stagedTarget === v && state.colors[v] !== G.UNCOLORED) state.stagedTarget = null;
          refresh();
          return;
        }
      }
    });

    function buildPalette() {
      var pal = el('gcv-palette');
      pal.innerHTML = '';
      G.COLORS.forEach(function (col, ci) {
        var sw = document.createElement('div');
        sw.className = 'gcv-swatch' + (ci === state.selected ? ' gcv-selected' : '');
        sw.style.background = col;
        sw.title = G.COLOR_NAMES[ci];
        sw.dataset.color = String(ci);
        sw.addEventListener('click', function () {
          state.selected = ci;
          buildPalette();
        });
        pal.appendChild(sw);
      });
    }

    function loadPreset(key) {
      PRESETS.forEach(function (g) { if (g.key === key) state.graph = g; });
      state.colors = new Array(state.graph.vertices.length).fill(G.UNCOLORED);
      state.kempePair = null;
      state.kempeComps = [];
      state.k33 = false;
      state.stagedTarget = null;
      el('gcv-k33-btn').setAttribute('aria-pressed', 'false');
      el('gcv-k33-row').style.display = state.graph.key === 'petersen' ? 'flex' : 'none';
      el('gcv-stage-row').style.display = state.graph.key === G.STUCK_SCENARIO.graphKey ? 'flex' : 'none';
      document.querySelectorAll('#gcv-presets .gcv-btn').forEach(function (b) {
        b.classList.toggle('gcv-active', b.dataset.key === key);
      });
      refresh();
    }

    var presetsEl = el('gcv-presets');
    PRESETS.forEach(function (g) {
      var b = document.createElement('button');
      b.className = 'gcv-btn';
      b.dataset.key = g.key;
      b.textContent = g.name;
      b.addEventListener('click', function () { loadPreset(g.key); });
      presetsEl.appendChild(b);
    });

    el('gcv-clear').addEventListener('click', function () {
      state.colors = new Array(state.graph.vertices.length).fill(G.UNCOLORED);
      state.stagedTarget = null;
      refresh();
    });

    el('gcv-k33-btn').addEventListener('click', function () {
      state.k33 = !state.k33;
      el('gcv-k33-btn').setAttribute('aria-pressed', String(state.k33));
      el('gcv-k33-btn').classList.toggle('gcv-active', state.k33);
      draw();
    });

    el('gcv-stage-btn').addEventListener('click', function () {
      var sc = G.STUCK_SCENARIO;
      if (state.graph.key !== sc.graphKey) return;
      state.colors = sc.colors.slice();
      state.stagedTarget = sc.target;
      state.kempePair = [Math.min(sc.pair[0], sc.pair[1]), Math.max(sc.pair[0], sc.pair[1])];
      refresh();
    });

    buildPalette();
    loadPreset('k4');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();