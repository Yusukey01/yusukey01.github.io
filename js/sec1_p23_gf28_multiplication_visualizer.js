//======================================================================
// sec1_p23_gf28_multiplication_visualizer.js (v2) -- linalg-23
// [Core IIFE] GfCore: GF(2^8) arithmetic with the AES polynomial
// p(x) = x^8 + x^4 + x^3 + x + 1 (0x11B), computed by TWO independently
// written routes -- the theorem route (carry-less product in F2[x], then
// long division by p) and the hardware route (shift-and-conditional-XOR).
// Their exhaustive agreement is the isomorphism made executable.
//======================================================================
var GfCore = (function () {
  'use strict';

  var P_FULL = 0x11B; // x^8+x^4+x^3+x+1 -- used by the theorem route
  var P_LOW = 0x1B;   // its low byte      -- used by the hardware route

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- route 2: hardware (Russian peasant, 0x1B conditional XOR) ----
  // Returns the product AND a full trace rich enough for the UI to show the
  // running accumulator at every step; the trace is certificate-checked.
  function gfMulPeasant(a, b) {
    var result = 0, temp = a & 0xFF, bb = b & 0xFF;
    var trace = [];
    for (var i = 0; i < 8; i++) {
      var step = {
        i: i,
        bBit: bb & 1,
        tempBefore: temp,
        accBefore: result,
        overflow: 0,
        tempAfter: 0,
        accAfter: 0
      };
      if (bb & 1) result ^= temp;
      step.accAfter = result;
      var hibit = temp & 0x80;
      step.overflow = hibit ? 1 : 0;
      temp = (temp << 1) & 0x1FF;
      if (hibit) temp ^= P_FULL & 0x1FF; // == (temp<<1 & 0xFF) ^ P_LOW
      // PROVEN-EQUIVALENT mutants (documented): (i) dropping the mask below
      // is equivalent because when hibit is set, bit 8 of (temp<<1)&0x1FF is
      // set and 0x11B clears it, and when hibit is clear bit 8 is already 0;
      // (ii) masking the shift with 0xFF instead of 0x1FF is equivalent
      // because it pre-clears bit 8 and the XOR with 0x11B then sets it,
      // and this mask clears it again: both orders yield (temp<<1 & 0xFF)^0x1B.
      temp &= 0xFF;
      step.tempAfter = temp;
      trace.push(step);
      bb >>= 1;
    }
    return { result: result, trace: trace };
  }
  function gfMul(a, b) { return gfMulPeasant(a, b).result; }

  // ---------- route 1: theorem (F2[x] product, then reduce mod p) ----------
  // carry-less product: for every set bit i of b, XOR a << i (degree <= 14)
  function clmulParts(a, b) {
    var parts = [], product = 0;
    for (var i = 0; i < 8; i++) {
      if (b & (1 << i)) {
        var sh = (a << i) & 0x7FFF;
        parts.push({ i: i, shifted: sh });
        product ^= sh;
      }
    }
    return { parts: parts, product: product };
  }
  function clmul(a, b) { return clmulParts(a, b).product; }

  function degree(v) {
    var d = -1;
    for (var i = 0; i < 15; i++) if (v & (1 << i)) d = i;
    return d;
  }

  // long division by p(x): while deg >= 8, XOR p shifted up to the top term
  function reducePoly(v) {
    v &= 0x7FFF;
    var steps = [];
    var d = degree(v);
    var guard = 0;
    while (d >= 8) {
      // a degree-14 input needs at most 7 aligned subtractions; if the top
      // term ever fails to drop, throw instead of hanging the page -- the
      // self-test gate turns the throw into a refusal card
      if (++guard > 7) throw new Error('reducePoly: degree failed to decrease');
      var sub = P_FULL << (d - 8);
      var before = v;
      v ^= sub;
      steps.push({ deg: d, before: before, subtrahend: sub, after: v });
      d = degree(v);
    }
    return { result: v, steps: steps };
  }

  function gfMulNaive(a, b) {
    var cm = clmulParts(a, b);
    var red = reducePoly(cm.product);
    return { result: red.result, clmul: cm, reduction: red };
  }

  // brute-force inverse (search); returns 0 for a = 0
  function gfInverse(a) {
    if (a === 0) return 0;
    for (var b = 1; b < 256; b++) if (gfMul(a, b) === 1) return b;
    return 0;
  }

  // ---------- formatting (UI + pinned) ----------
  var SUP = '\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079';
  function sup(n) {
    return String(n).split('').map(function (d) { return SUP[+d]; }).join('');
  }
  function polyStr(num, maxDeg) {
    var top = (maxDeg === undefined) ? 14 : maxDeg;
    var terms = [];
    for (var i = top; i >= 0; i--) {
      if (num & (1 << i)) {
        if (i === 0) terms.push('1');
        else if (i === 1) terms.push('x');
        else terms.push('x' + sup(i));
      }
    }
    return terms.length ? terms.join(' + ') : '0';
  }
  function hex2(n) { return '0x' + (n & 0xFF).toString(16).toUpperCase().padStart(2, '0'); }
  function hex4(n) { return '0x' + (n & 0x7FFF).toString(16).toUpperCase().padStart(3, '0'); }
  function bin8(n) {
    var s = (n & 0xFF).toString(2).padStart(8, '0');
    return s.slice(0, 4) + ' ' + s.slice(4);
  }
  function bin15(n) {
    var s = (n & 0x7FFF).toString(2).padStart(15, '0');
    return s.slice(0, 3) + ' ' + s.slice(3, 7) + ' ' + s.slice(7, 11) + ' ' + s.slice(11);
  }

  // multiplicative order (test helper exposed for the group-structure cert)
  function order(a) {
    if (a === 0) return 0;
    var x = a, k = 1;
    while (x !== 1) { x = gfMul(x, a); k++; if (k > 256) return -1; }
    return k;
  }

  //====================================================================
  // Self-tests
  //====================================================================
  function runSelfTests() {
    var failures = [];
    function check(name, cond, detail) {
      if (!cond) failures.push(name + (detail !== undefined ? ' [' + detail + ']' : ''));
    }
    var a, b, i;

    // T1: THE ISOMORPHISM CERTIFICATE -- both routes agree on ALL 65536 pairs
    (function () {
      var bad = -1;
      for (a = 0; a < 256 && bad < 0; a++) {
        for (b = 0; b < 256; b++) {
          if (gfMulPeasant(a, b).result !== gfMulNaive(a, b).result) { bad = a * 256 + b; break; }
        }
      }
      check('T1 theorem route == hardware route (exhaustive 256x256)', bad < 0,
        bad >= 0 ? hex2(bad >> 8) + '*' + hex2(bad & 0xFF) : '');
    })();

    // T2: field axioms, executable
    (function () {
      var okComm = true, okId = true, okZero = true, okNoZD = true;
      for (a = 0; a < 256; a++) {
        if (gfMul(a, 1) !== a) okId = false;
        if (gfMul(a, 0) !== 0) okZero = false;
        for (b = a + 1; b < 256; b++) {
          if (gfMul(a, b) !== gfMul(b, a)) okComm = false;
        }
      }
      for (a = 1; a < 256; a++) for (b = 1; b < 256; b++) {
        if (gfMul(a, b) === 0) okNoZD = false;
      }
      check('T2a commutativity (exhaustive)', okComm);
      check('T2b identity a*1 == a and a*0 == 0 (exhaustive)', okId && okZero);
      check('T2c no zero divisors (exhaustive) -- p irreducible => field', okNoZD);
      var rng = mulberry32(2311);
      var okAssoc = true, okDist = true;
      for (i = 0; i < 3000; i++) {
        a = (rng() * 256) | 0; b = (rng() * 256) | 0; var c = (rng() * 256) | 0;
        if (gfMul(gfMul(a, b), c) !== gfMul(a, gfMul(b, c))) okAssoc = false;
        if (gfMul(a, b ^ c) !== (gfMul(a, b) ^ gfMul(a, c))) okDist = false;
      }
      check('T2d associativity (3000 seeded triples)', okAssoc);
      check('T2e distributivity over XOR (3000 seeded triples)', okDist);
    })();

    // T3: external value pins
    check('T3a FIPS-197 worked example 57*83 == C1', gfMul(0x57, 0x83) === 0xC1, hex2(gfMul(0x57, 0x83)));
    check('T3b xtime overflow 02*80 == 1B', gfMul(0x02, 0x80) === 0x1B, hex2(gfMul(0x02, 0x80)));
    check('T3c inverse pair 53*CA == 01', gfMul(0x53, 0xCA) === 0x01, hex2(gfMul(0x53, 0xCA)));
    check('T3d 87*02 == 15 (one shift, one reduction)', gfMul(0x87, 0x02) === 0x15, hex2(gfMul(0x87, 0x02)));

    // T4: every nonzero element has EXACTLY ONE inverse
    (function () {
      var ok = true;
      for (a = 1; a < 256; a++) {
        var count = 0;
        for (b = 1; b < 256; b++) if (gfMul(a, b) === 1) count++;
        if (count !== 1) ok = false;
      }
      check('T4 unique multiplicative inverse for every nonzero element', ok);
      check('T4b gfInverse(0x53) == 0xCA', gfInverse(0x53) === 0xCA, hex2(gfInverse(0x53)));
    })();

    // T5: Frobenius -- squaring is additive in characteristic 2 (exhaustive)
    (function () {
      var ok = true;
      for (a = 0; a < 256; a++) for (b = 0; b < 256; b++) {
        if (gfMul(a ^ b, a ^ b) !== (gfMul(a, a) ^ gfMul(b, b))) ok = false;
      }
      check('T5 Frobenius (a+b)^2 == a^2 + b^2 (exhaustive)', ok);
    })();

    // T6: multiplicative group structure -- |GF(256)*| = 255, cyclic
    (function () {
      check('T6a ord(0x03) == 255 (0x03 generates GF(256)*)', order(0x03) === 255, order(0x03));
      // famous non-obvious fact: x itself is NOT a generator for the AES p(x)
      check('T6b ord(0x02) == 51 (x is not primitive for the AES polynomial)', order(0x02) === 51, order(0x02));
      // Lagrange: every order divides 255
      var ok = true;
      var rng = mulberry32(3301);
      for (i = 0; i < 40; i++) {
        var e = 1 + ((rng() * 255) | 0);
        if (255 % order(e) !== 0) ok = false;
      }
      check('T6c sampled orders divide 255 (Lagrange)', ok);
    })();

    // T7: trace honesty -- the DISPLAYED steps replay to the result
    (function () {
      var rng = mulberry32(4407);
      var ok = true, okTemp = true, okFlag = true, okChain = true;
      var pairs = [[0x53, 0xCA], [0x57, 0x83], [0x87, 0x02], [0x01, 0xFF], [0xFF, 0xFF], [0x00, 0x9C]];
      for (i = 0; i < 40; i++) pairs.push([(rng() * 256) | 0, (rng() * 256) | 0]);
      pairs.forEach(function (p) {
        var m = gfMulPeasant(p[0], p[1]);
        var acc = 0;
        m.trace.forEach(function (st, k) {
          if (st.accBefore !== acc) okChain = false;
          if (st.bBit) acc ^= st.tempBefore;
          if (st.accAfter !== acc) ok = false;
          // the displayed temp at step k must equal a * x^k mod p,
          // recomputed via the INDEPENDENT theorem route
          if (st.tempBefore !== reducePoly((p[0] << k) & 0x7FFF).result) okTemp = false;
          if (st.overflow !== ((st.tempBefore & 0x80) ? 1 : 0)) okFlag = false;
        });
        if (acc !== m.result) ok = false;
      });
      check('T7a trace replays to the result', ok);
      check('T7b trace temp[k] == a * x^k mod p (cross-route)', okTemp);
      check('T7c overflow flag == top bit of temp', okFlag);
      check('T7d accumulator chain consistent', okChain);
    })();

    // T8: reduction certificates (exhaustive over all 15-bit polynomials)
    (function () {
      var okDeg = true, okId = true, okStep = true, okAgree = true;
      for (var v = 0; v < 0x8000; v++) {
        var r = reducePoly(v);
        if (degree(r.result) >= 8) okDeg = false;
        if (v < 256 && (r.result !== v || r.steps.length !== 0)) okId = false;
        r.steps.forEach(function (st) {
          // each step subtracts p(x) * x^(deg-8), aligned to kill the top term
          if (st.subtrahend !== (P_FULL << (st.deg - 8))) okStep = false;
          if (degree(st.after) >= st.deg) okStep = false;
          if ((st.before ^ st.subtrahend) !== st.after) okStep = false;
        });
        // congruence: result must equal v mod p computed by bitwise peasant
        // on the split v = hi * x^8 + lo => hi * (x^8 mod p) + lo
        var lo = v & 0xFF, hi = (v >> 8) & 0x7F;
        var alt = lo ^ gfMul(hi, 0x1B); // x^8 == 0x1B mod p
        if (r.result !== alt) okAgree = false;
      }
      check('T8a reduced degree < 8 (exhaustive 15-bit)', okDeg);
      check('T8b degree < 8 inputs untouched, zero steps', okId);
      check('T8c each step is an aligned XOR of p(x)*x^k, degree strictly drops', okStep);
      check('T8d reduction == hi*0x1B + lo decomposition (exhaustive)', okAgree);
    })();

    // T9: polynomial formatter pins (what the UI prints)
    check('T9a polyStr(0x53)', polyStr(0x53) === 'x\u2076 + x\u2074 + x + 1', polyStr(0x53));
    check('T9b polyStr(0) == "0"', polyStr(0) === '0');
    check('T9c polyStr(1) == "1"', polyStr(1) === '1');
    check('T9d polyStr(0x11B) == p(x)', polyStr(0x11B) === 'x\u2078 + x\u2074 + x\u00B3 + x + 1', polyStr(0x11B));
    check('T9e polyStr(0x02) == "x"', polyStr(0x02) === 'x');

    // T10: hex/binary formatter pins
    check('T10a hex2(0x0B) == "0x0B"', hex2(0x0B) === '0x0B', hex2(0x0B));
    check('T10b bin8(0x53) == "0101 0011"', bin8(0x53) === '0101 0011', bin8(0x53));
    check('T10c hex4(0x11B) == "0x11B"', hex4(0x11B) === '0x11B', hex4(0x11B));
    check('T10d bin15 groups 3-4-4-4', bin15(0x7FFF) === '111 1111 1111 1111', bin15(0x7FFF));

    // T11: clmul parts certificate -- parts XOR to the product; each part is
    // a shifted copy tagged with its bit index
    (function () {
      var rng = mulberry32(5501);
      var ok = true;
      for (i = 0; i < 200; i++) {
        var x = (rng() * 256) | 0, y = (rng() * 256) | 0;
        var cp = clmulParts(x, y);
        var acc = 0, okPart = true;
        cp.parts.forEach(function (pt) {
          acc ^= pt.shifted;
          if (pt.shifted !== ((x << pt.i) & 0x7FFF)) okPart = false;
          if (!(y & (1 << pt.i))) okPart = false;
        });
        if (acc !== cp.product || !okPart) ok = false;
        if (cp.parts.length !== ((y.toString(2).match(/1/g) || []).length)) ok = false;
      }
      check('T11 clmul parts XOR to the product, one per set bit of b', ok);
    })();

    return { pass: failures.length === 0, failures: failures };
  }

  return {
    P_FULL: P_FULL,
    P_LOW: P_LOW,
    mulberry32: mulberry32,
    gfMul: gfMul,
    gfMulPeasant: gfMulPeasant,
    gfMulNaive: gfMulNaive,
    clmul: clmul,
    clmulParts: clmulParts,
    reducePoly: reducePoly,
    degree: degree,
    gfInverse: gfInverse,
    order: order,
    polyStr: polyStr,
    hex2: hex2,
    hex4: hex4,
    bin8: bin8,
    bin15: bin15,
    runSelfTests: runSelfTests
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = GfCore; }

//======================================================================
// [UI IIFE] #gf28-multiplication-visualizer, prefix gfv-
// Layout: the commutative diagram on screen -- Route 1 (theorem:
// F2[x]/<p(x)>) and Route 2 (hardware: shift & conditional XOR) computed
// independently, side by side, with their agreement stated explicitly.
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
    hexCol: '#64b4ff',
    binCol: '#2ecc71',
    reduce: '#f39c12',
    bad: '#e74c3c'
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
    var container = document.getElementById('gf28-multiplication-visualizer');
    if (!container) return;
    if (container.dataset.gfvInit) return; // idempotency guard
    container.dataset.gfvInit = '1';

    var gate;
    try { gate = GfCore.runSelfTests(); }
    catch (e) { gate = { pass: false, failures: ['self-tests crashed: ' + e.message] }; }
    if (!gate.pass) { container.innerHTML = refusalHtml(gate); return; }

    var G = GfCore;

    container.innerHTML =
      '<div class="gfv-root">' +
      '<div class="gfv-hint">The structure theorem says the extension field is <em>literally</em> polynomial arithmetic ' +
        'mod p(x). This demo computes the same product a &middot; b twice, by two independently implemented routes: ' +
        'the <strong>theorem route</strong> (multiply in F&#8322;[x], then divide by p(x) and keep the remainder) and the ' +
        '<strong>hardware route</strong> used in AES (shift &amp; conditional XOR with 0x1B, never leaving 8 bits). ' +
        'The isomorphism is the statement that the two final bytes always agree.</div>' +
      '<div class="gfv-inputrow">' +
        '<div class="gfv-inputgroup">' +
          '<label for="gfv-a">Element a (hex 00&ndash;FF)</label>' +
          '<div class="gfv-inputwrap"><span class="gfv-prefix">0x</span><input type="text" id="gfv-a" maxlength="2" value="53" autocomplete="off"></div>' +
          '<div class="gfv-mono" id="gfv-a-bin"></div>' +
          '<div class="gfv-poly" id="gfv-a-poly"></div>' +
        '</div>' +
        '<div class="gfv-times">&times;</div>' +
        '<div class="gfv-inputgroup">' +
          '<label for="gfv-b">Element b (hex 00&ndash;FF)</label>' +
          '<div class="gfv-inputwrap"><span class="gfv-prefix">0x</span><input type="text" id="gfv-b" maxlength="2" value="CA" autocomplete="off"></div>' +
          '<div class="gfv-mono" id="gfv-b-bin"></div>' +
          '<div class="gfv-poly" id="gfv-b-poly"></div>' +
        '</div>' +
      '</div>' +
      '<div class="gfv-btnrow">' +
        '<button class="gfv-btn gfv-preset" data-a="57" data-b="83">AES spec example: 57&middot;83 = C1</button>' +
        '<button class="gfv-btn gfv-preset" data-a="53" data-b="CA">Inverse pair: 53&middot;CA = 01</button>' +
        '<button class="gfv-btn gfv-preset" data-a="87" data-b="02">One shift, one reduction: 87&middot;02</button>' +
        '<button class="gfv-btn gfv-preset" data-a="01" data-b="FF">Identity: 01&middot;FF</button>' +
      '</div>' +
      '<div id="gfv-error" class="gfv-error" style="display:none;"></div>' +
      '<div id="gfv-routes" class="gfv-routes">' +
        '<div class="gfv-route">' +
          '<div class="gfv-routetitle">Route 1 &mdash; the theorem: multiply in F&#8322;[x], reduce mod p(x)</div>' +
          '<div id="gfv-route1"></div>' +
        '</div>' +
        '<div class="gfv-route">' +
          '<div class="gfv-routetitle">Route 2 &mdash; the hardware: shift &amp; conditional XOR (AES)</div>' +
          '<div id="gfv-route2"></div>' +
        '</div>' +
      '</div>' +
      '<div id="gfv-agree" class="gfv-agree"></div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#gf28-multiplication-visualizer .gfv-root{display:flex;flex-direction:column;gap:14px;color:' + C.text + ';' +
        'background:' + C.panel + ';padding:15px;border-radius:8px;border:1px solid ' + C.border + ';margin-bottom:20px;}' +
      '#gf28-multiplication-visualizer .gfv-hint{font-size:0.86rem;color:' + C.textDim + ';line-height:1.55;}' +
      '#gf28-multiplication-visualizer .gfv-inputrow{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;}' +
      '#gf28-multiplication-visualizer .gfv-inputgroup{flex:1;min-width:180px;}' +
      '#gf28-multiplication-visualizer .gfv-inputgroup label{display:block;font-size:0.82rem;color:' + C.textDim + ';font-weight:bold;margin-bottom:4px;}' +
      '#gf28-multiplication-visualizer .gfv-inputwrap{display:flex;align-items:center;gap:4px;}' +
      '#gf28-multiplication-visualizer .gfv-prefix{color:' + C.faint + ';font-family:"Courier New",monospace;}' +
      '#gf28-multiplication-visualizer .gfv-inputwrap input{width:64px;font-family:"Courier New",monospace;font-size:1.15rem;' +
        'background:rgba(255,255,255,0.06);color:' + C.text + ';border:1px solid ' + C.borderStrong + ';border-radius:4px;padding:5px 8px;text-transform:uppercase;}' +
      '#gf28-multiplication-visualizer .gfv-inputwrap input.gfv-invalid{border-color:' + C.bad + ';}' +
      '#gf28-multiplication-visualizer .gfv-times{font-size:1.5rem;color:' + C.faint + ';align-self:center;}' +
      '#gf28-multiplication-visualizer .gfv-mono{font-family:"Courier New",monospace;color:' + C.binCol + ';margin-top:4px;letter-spacing:1px;}' +
      '#gf28-multiplication-visualizer .gfv-poly{font-family:"Courier New",monospace;color:' + C.faint + ';font-size:0.85rem;margin-top:2px;}' +
      '#gf28-multiplication-visualizer .gfv-btnrow{display:flex;flex-wrap:wrap;gap:6px;}' +
      '#gf28-multiplication-visualizer .gfv-btn{padding:7px 10px;border:1px solid ' + C.borderStrong + ';border-radius:4px;' +
        'background:rgba(255,255,255,0.05);color:' + C.text + ';cursor:pointer;font-size:0.8rem;}' +
      '#gf28-multiplication-visualizer .gfv-btn:hover{background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);}' +
      '#gf28-multiplication-visualizer .gfv-error{color:' + C.bad + ';font-size:0.9rem;}' +
      '#gf28-multiplication-visualizer .gfv-routes{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;}' +
      '#gf28-multiplication-visualizer .gfv-route{flex:1;min-width:300px;border:1px solid ' + C.border + ';border-radius:8px;' +
        'padding:10px 12px;background:rgba(255,255,255,0.02);overflow-x:auto;}' +
      '#gf28-multiplication-visualizer .gfv-routetitle{font-size:0.86rem;color:' + C.accent + ';font-weight:600;margin-bottom:8px;}' +
      '#gf28-multiplication-visualizer .gfv-steptitle{font-size:0.82rem;color:' + C.textDim + ';font-weight:bold;margin:10px 0 4px;}' +
      '#gf28-multiplication-visualizer .gfv-code{font-family:"Courier New",monospace;font-size:0.85rem;line-height:1.7;white-space:pre;color:' + C.text + ';}' +
      '#gf28-multiplication-visualizer .gfv-code .h{color:' + C.hexCol + ';}' +
      '#gf28-multiplication-visualizer .gfv-code .b{color:' + C.binCol + ';}' +
      '#gf28-multiplication-visualizer .gfv-code .r{color:' + C.reduce + ';}' +
      '#gf28-multiplication-visualizer .gfv-note{font-size:0.78rem;color:' + C.faint + ';line-height:1.5;margin-top:6px;}' +
      '#gf28-multiplication-visualizer table.gfv-table{border-collapse:collapse;font-family:"Courier New",monospace;font-size:0.82rem;width:100%;}' +
      '#gf28-multiplication-visualizer table.gfv-table th{color:' + C.textDim + ';font-weight:600;text-align:left;padding:3px 8px;' +
        'border-bottom:1px solid ' + C.borderStrong + ';font-family:-apple-system,sans-serif;font-size:0.75rem;}' +
      '#gf28-multiplication-visualizer table.gfv-table td{padding:3px 8px;border-bottom:1px solid ' + C.border + ';vertical-align:top;}' +
      '#gf28-multiplication-visualizer table.gfv-table tr.gfv-dead td{opacity:0.35;}' +
      '#gf28-multiplication-visualizer .gfv-badge{color:' + C.reduce + ';font-size:0.75rem;}' +
      '#gf28-multiplication-visualizer .gfv-agree{border:1px solid rgba(102,187,106,0.4);background:rgba(102,187,106,0.08);' +
        'border-radius:8px;padding:10px 12px;font-size:0.9rem;line-height:1.6;}' +
      '#gf28-multiplication-visualizer .gfv-agree .gfv-big{font-family:"Courier New",monospace;font-size:1.1rem;color:' + C.accent + ';}' +
      '#gf28-multiplication-visualizer .gfv-inv{color:' + C.reduce + ';}';
    document.head.appendChild(style);

    var el = {
      a: document.getElementById('gfv-a'), b: document.getElementById('gfv-b'),
      aBin: document.getElementById('gfv-a-bin'), aPoly: document.getElementById('gfv-a-poly'),
      bBin: document.getElementById('gfv-b-bin'), bPoly: document.getElementById('gfv-b-poly'),
      error: document.getElementById('gfv-error'), routes: document.getElementById('gfv-routes'),
      r1: document.getElementById('gfv-route1'), r2: document.getElementById('gfv-route2'),
      agree: document.getElementById('gfv-agree')
    };

    function parseHexByte(s) {
      if (!/^[0-9a-fA-F]{1,2}$/.test(s)) return null;
      return parseInt(s, 16);
    }

    function renderRoute1(a, b, naive) {
      var html = '<div class="gfv-steptitle">Step 1 &middot; expand the product in F&#8322;[x] (one shifted copy of a(x) per set bit of b)</div>';
      var lines = [];
      if (a === 0 || b === 0) {
        html += '<div class="gfv-note">One factor is 0, so the product is the zero polynomial — nothing to expand.</div>';
      } else {
        naive.clmul.parts.forEach(function (p) {
          // uniform exponent notation: bit index k of b <-> shift by x^k
          lines.push('a(x)\u00B7x' + supOf(p.i) + ' = <span class="b">' + G.bin15(p.shifted) + '</span>');
        });
        lines.push('\u2295 ' + '\u2500'.repeat(24));
        lines.push('product = <span class="b">' + G.bin15(naive.clmul.product) + '</span>  (<span class="h">' +
          G.hex4(naive.clmul.product) + '</span>, deg ' + Math.max(0, G.degree(naive.clmul.product)) + ')');
        html += '<div class="gfv-code">' + lines.join('\n') + '</div>';
        html += '<div class="gfv-note">product(x) = ' + G.polyStr(naive.clmul.product) + '</div>';
      }
      html += '<div class="gfv-steptitle">Step 2 &middot; long division by p(x): kill each term of degree &ge; 8 with an aligned copy of p(x)</div>';
      if (naive.reduction.steps.length === 0) {
        html += '<div class="gfv-note">degree already &lt; 8 &mdash; the product is its own remainder; nothing to reduce.</div>';
      } else {
        var rl = [];
        naive.reduction.steps.forEach(function (st) {
          rl.push('<span class="r">deg ' + st.deg + ' \u2265 8:</span>  <span class="b">' + G.bin15(st.before) + '</span>');
          rl.push('  \u2295 p(x)\u00B7x' + supOf(st.deg - 8) + ' = <span class="b">' + G.bin15(st.subtrahend) + '</span>');
          rl.push('  \u2192 <span class="b">' + G.bin15(st.after) + '</span>');
        });
        html += '<div class="gfv-code">' + rl.join('\n') + '</div>';
      }
      html += '<div class="gfv-steptitle">Remainder</div>' +
        '<div class="gfv-code">r(x) = ' + G.polyStr(naive.result) + '  =  <span class="b">' + G.bin8(naive.result) +
        '</span>  =  <span class="h">' + G.hex2(naive.result) + '</span></div>';
      return html;
    }

    function supOf(n) { // superscript, with x^0/x^1 spelled out in captions via polyStr
      var SUP = '\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079';
      return String(n).split('').map(function (d) { return SUP[+d]; }).join('');
    }

    function renderRoute2(a, b, peasant) {
      var topBit = -1;
      for (var i = 7; i >= 0; i--) if (b & (1 << i)) { topBit = i; break; }
      var rows = peasant.trace.map(function (st) {
        var dead = st.i > topBit;
        var action = st.bBit
          ? 'acc \u2295= temp'
          : '\u2014';
        return '<tr class="' + (dead ? 'gfv-dead' : '') + '">' +
          '<td>' + st.i + '</td>' +
          '<td>' + st.bBit + '</td>' +
          '<td><span class="h">' + G.hex2(st.tempBefore) + '</span> <span class="b">' + G.bin8(st.tempBefore) + '</span>' +
            (st.overflow ? '<br><span class="gfv-badge">shift overflows x\u2078 \u2192 \u2295 0x1B</span>' : '') + '</td>' +
          '<td>' + action + '</td>' +
          '<td><span class="h">' + G.hex2(st.accAfter) + '</span> <span class="b">' + G.bin8(st.accAfter) + '</span></td>' +
          '</tr>';
      }).join('');
      var html =
        '<table class="gfv-table"><thead><tr>' +
        '<th>k</th><th>b[k]</th><th>temp = a\u00B7x<sup>k</sup> mod p</th><th>action</th><th>accumulator</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="gfv-note">Each row: if bit k of b is 1, the current temp (which <em>is</em> a\u00B7x' +
        '<sup>k</sup> mod p, by the distributive law) is XORed into the accumulator; then temp is shifted left, and if the ' +
        'shift overflows into x\u2078, one XOR with 0x1B applies x\u2078 \u2261 x\u2074+x\u00B3+x+1. The accumulator after row 7 is the product.</div>';
      if (topBit < 7) {
        html += '<div class="gfv-note">Grayed rows no longer change the accumulator (all remaining bits of b are 0) &mdash; ' +
          'yet real AES implementations still execute them, because running a data-<em>independent</em> number of steps ' +
          'is what makes the multiplier constant-time and immune to timing side channels.</div>';
      }
      return html;
    }

    function update() {
      var a = parseHexByte(el.a.value), b = parseHexByte(el.b.value);
      el.a.classList.toggle('gfv-invalid', a === null);
      el.b.classList.toggle('gfv-invalid', b === null);
      el.aBin.textContent = a === null ? '\u2014' : G.bin8(a);
      el.aPoly.textContent = a === null ? '' : 'a(x) = ' + G.polyStr(a);
      el.bBin.textContent = b === null ? '\u2014' : G.bin8(b);
      el.bPoly.textContent = b === null ? '' : 'b(x) = ' + G.polyStr(b);
      if (a === null || b === null) {
        el.error.style.display = 'block';
        el.error.textContent = 'Enter two hex bytes (00\u2013FF).';
        el.routes.style.display = 'none';
        el.agree.style.display = 'none';
        return;
      }
      el.error.style.display = 'none';
      el.routes.style.display = 'flex';
      el.agree.style.display = 'block';

      var naive = G.gfMulNaive(a, b);      // route 1
      var peasant = G.gfMulPeasant(a, b);  // route 2, independent implementation
      el.r1.innerHTML = renderRoute1(a, b, naive);
      el.r2.innerHTML = renderRoute2(a, b, peasant);

      var same = naive.result === peasant.result;
      var agreeHtml;
      if (same) {
        agreeHtml = 'Route 1 = Route 2 = <span class="gfv-big">' + G.hex2(naive.result) + '</span> \u2713 &mdash; ' +
          'two implementations that share no code agree, here and (by this page\u2019s self-tests) on all 65,536 input pairs. ' +
          'That agreement is the isomorphism F&#8322;[x]/\u27E8p(x)\u27E9 \u2245 GF(2\u2078) doing real work.';
        if (naive.result === 0x01 && (a !== 1 || b !== 1)) {
          agreeHtml += '<br><span class="gfv-inv">The product is 1: ' + G.hex2(a) + ' and ' + G.hex2(b) +
            ' are multiplicative inverses of each other. The AES S-box is built from exactly this inversion map ' +
            'a \u21A6 a\u207B\u00B9 &mdash; possible only because p(x) is irreducible, so every nonzero byte has an inverse.</span>';
        }
      } else {
        agreeHtml = '<span style="color:' + C.bad + ';">Internal error: the two routes disagree (' +
          G.hex2(naive.result) + ' vs ' + G.hex2(peasant.result) + '). This should be impossible past the self-test gate.</span>';
      }
      el.agree.innerHTML = agreeHtml;
    }

    function sanitize(input) {
      input.addEventListener('input', function () {
        var cleaned = input.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 2);
        if (cleaned !== input.value) input.value = cleaned;
        update();
      });
    }
    sanitize(el.a);
    sanitize(el.b);

    container.querySelectorAll('.gfv-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.a.value = btn.dataset.a;
        el.b.value = btn.dataset.b;
        update();
      });
    });

    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();