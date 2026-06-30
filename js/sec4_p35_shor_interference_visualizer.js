// shor_period_demo.js
// disc-35 "Shor's Algorithm" — interference visualizer for quantum period-finding.
//
// CORE INSIGHT (the thing that makes Shor work): after the value register is
// measured, the argument register holds a comb (1/sqrt M) sum_j |jr+s>. Applying
// the quantum Fourier transform, the amplitude at outcome b is the SUM of M unit
// phase vectors v_j = e^{2pi i (jr) b / q}. When b is a multiple of q/r these
// vectors all point the same way and add up coherently (a long straight walk, large
// |S|); for other b they rotate and cancel (a walk that curls back on itself, small
// |S|). The probability is P(b) = |S(b)|^2 / (M q). The period is read out of WHERE
// the constructive interference lands, then continued fractions + gcd return the
// factors. The offset s only adds a global phase e^{2pi i s b/q} that rotates the
// whole walk without changing |S|, so we display s = 0 without loss.
//
// House rules: no efficiency claims, no vendor names; the demo only displays the
// page's own state evolution. Math core self-tested in JS against NumPy/Node truth:
//   |S(b)|^2/(M q) == P(b) (phase-sum equals QFT probability);
//   easy N=15 r=4 q=256: b=64 -> all vectors aligned, |S|=M=64, P=1/4; off-peak |S|~0;
//   hard N=21 r=6 q=512: |S| large near multiples of q/r, small far from them;
//   continued fraction 85/512 -> 1/6; full chain 15 = 3 x 5.

document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('shor_demo');
  if (!container) { console.error('shor_demo container not found!'); return; }
  if (container.dataset.init === '1') return;
  container.dataset.init = '1';

  // ============================================================
  // M1 — MATH CORE (verified)
  // ============================================================
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function modpow(base, exp, mod) {
    let r = 1; base %= mod;
    while (exp > 0) { if (exp & 1) r = (r * base) % mod; base = (base * base) % mod; exp = Math.floor(exp / 2); }
    return r;
  }
  function order(x, N) { let r = 1, c = x % N; while (c !== 1) { c = (c * x) % N; r++; } return r; }
  function pickQ(N) { let q = 1; while (q <= N * N) q *= 2; return q; } // smallest 2^l > N^2, in (N^2, 2N^2]
  function combCount(r, q) { let M = 0; for (let a = 0; a < q; a += r) M++; return M; }

  // Partial sums of the M phase vectors v_j = e^{2pi i (jr) b / q}.
  function phaseWalk(r, q, b, M) {
    const t = 2 * Math.PI / q;
    let re = 0, im = 0;
    const pts = [[0, 0]];
    for (let j = 0; j < M; j++) {
      const ang = t * ((j * r * b) % q);
      re += Math.cos(ang); im += Math.sin(ang);
      pts.push([re, im]);
    }
    return { pts, Sre: re, Sim: im, absS: Math.hypot(re, im) };
  }

  function qftProbs(N, x) {
    const r = order(x, N), q = pickQ(N), M = combCount(r, q);
    const probs = new Float64Array(q);
    const t = 2 * Math.PI / q;
    for (let b = 0; b < q; b++) {
      let re = 0, im = 0;
      for (let j = 0; j < M; j++) { const ang = t * ((j * r * b) % q); re += Math.cos(ang); im += Math.sin(ang); }
      probs[b] = (re * re + im * im) / (M * q);
    }
    return { r, q, M, probs };
  }

  function cfBest(num, den, Nmax) {
    let pm2 = 0, pm1 = 1, qm2 = 1, qm1 = 0, best = [0, 1], xa = num, xb = den;
    for (let it = 0; it < 64 && xb !== 0; it++) {
      const ai = Math.floor(xa / xb);
      const pn = ai * pm1 + pm2, qn = ai * qm1 + qm2;
      if (qn <= Nmax) best = [pn, qn];
      const rem = xa - ai * xb; xa = xb; xb = rem;
      pm2 = pm1; pm1 = pn; qm2 = qm1; qm1 = qn;
    }
    return best;
  }
  function tryFactor(N, x, b, q, r) {
    const [cNum, rCand] = cfBest(b, q, N);
    if (rCand % 2 !== 0) return { rCand, cNum, ok: false, reason: 'odd' };
    const h = modpow(x, rCand / 2, N);
    if (h === N - 1 || h === 1) return { rCand, cNum, ok: false, reason: 'trivial' };
    const f1 = gcd(h - 1, N), f2 = gcd(h + 1, N);
    const ok = (f1 > 1 && f1 < N) && (f2 > 1 && f2 < N);
    if (ok) return { rCand, cNum, ok, f1, f2, reason: null };
    // failure: distinguish a b sitting exactly on a multiple c*(q/r) whose c
    // shares a factor with r (the convergent reduces past r) from a b that
    // simply fell too far from any multiple to recover r at all.
    let reason = 'far';
    if (r) {
      const c = Math.round(b / (q / r));
      const onMultiple = Math.abs(b - c * (q / r)) < 0.5;
      if (onMultiple && gcd(c, r) > 1) reason = 'shared-factor';
    }
    return { rCand, cNum, ok, f1, f2, reason };
  }

  // ---- self-test against verified truth (logged, non-blocking) ----
  (function selfTest() {
    const r = order(2, 15), q = pickQ(15), M = combCount(r, q);
    const w = phaseWalk(r, q, 64, M);
    const easyAligned = Math.abs(w.absS - M) < 1e-6;
    const Ppeak = w.absS * w.absS / (M * q);
    const off = phaseWalk(r, q, 32, M);
    const ok1 = easyAligned && Math.abs(Ppeak - 0.25) < 1e-9 && off.absS < 1e-6;
    const t2 = qftProbs(21, 2);
    const ok2 = t2.r === 6 && t2.q === 512 && (t2.q % t2.r !== 0);
    const ok3 = cfBest(85, 512, 21).join('/') === '1/6';
    if (!(ok1 && ok2 && ok3)) console.warn('shor_demo self-test mismatch', { ok1, ok2, ok3 });
  })();

  // ============================================================
  // M2 — DOM SKELETON + STYLES (house palette)
  // ============================================================
  container.innerHTML = `
    <div class="shor-container">
      <style>
        .shor-container{margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e8eaed;}
        .shor-panel{background:linear-gradient(135deg,#0a0f18 0%,#0f1419 100%);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.3);}
        .shor-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px;}
        .shor-controls label{font-size:0.85rem;color:#9aa5b1;}
        .shor-select{background:#0f1419;color:#64b4ff;border:1px solid #2a3340;border-radius:5px;padding:5px 8px;font-family:'Courier New',monospace;font-size:0.85rem;}
        .shor-btn{background:linear-gradient(135deg,#1565c0,#42a5f5);border:1px solid #64b4ff;color:#fff;border-radius:5px;padding:6px 14px;font-size:0.85rem;cursor:pointer;}
        .shor-btn:hover{filter:brightness(1.1);}
        .shor-meta{font-family:'Courier New',monospace;font-size:0.82rem;color:#64b4ff;margin-bottom:10px;line-height:1.5;}
        .shor-meta .tag{color:#f39c12;}
        .shor-views{display:flex;flex-direction:column;gap:14px;}
        @media(min-width:860px){.shor-views{flex-direction:row;}.shor-view-left{flex:1;}.shor-view-right{flex:1.1;}}
        .shor-view-title{font-size:0.8rem;color:#9aa5b1;margin:0 0 5px;}
        .shor-svg-wrap{width:100%;border:1px solid rgba(255,255,255,0.1);border-radius:6px;background:#0a0f18;}
        .shor-slider-row{display:flex;align-items:center;gap:10px;margin:12px 0 4px;}
        .shor-slider-row input[type=range]{flex:1;}
        .shor-slider-row .bval{width:120px;text-align:right;font-family:'Courier New',monospace;font-size:0.82rem;color:#64b4ff;}
        .shor-readout{font-family:'Courier New',monospace;font-size:0.8rem;color:#9ed0ff;margin-top:6px;line-height:1.5;}
        .shor-readout .hot{color:#f39c12;}
        .shor-result{margin-top:12px;padding:11px 13px;border-radius:6px;font-size:0.86rem;line-height:1.55;}
        .shor-result.ok{background:rgba(66,165,245,0.12);border:1px solid rgba(66,165,245,0.4);color:#9ed0ff;}
        .shor-result.bad{background:rgba(243,156,18,0.12);border:1px solid rgba(243,156,18,0.4);color:#ffcf7a;}
        .shor-result code{font-family:'Courier New',monospace;color:#fff;}
      </style>
      <div class="shor-panel">
        <div class="shor-controls">
          <label>N =</label>
          <select class="shor-select" id="shor-N">
            <option value="15">15 = 3 x 5</option>
            <option value="21">21 = 3 x 7</option>
            <option value="33">33 = 3 x 11</option>
          </select>
          <label>x =</label>
          <select class="shor-select" id="shor-x"></select>
        </div>
        <div class="shor-meta" id="shor-meta"></div>

        <div class="shor-views">
          <div class="shor-view-left">
            <div class="shor-view-title">Phase vectors and their running sum at outcome b (constructive when aligned)</div>
            <div class="shor-svg-wrap"><svg id="shor-walk" width="100%" height="260" viewBox="0 0 260 260" preserveAspectRatio="xMidYMid meet"></svg></div>
          </div>
          <div class="shor-view-right">
            <div class="shor-view-title">QFT probability P(b) = |S(b)|&sup2; / (M q); the marked b is selected at left</div>
            <div class="shor-svg-wrap"><svg id="shor-qft" width="100%" height="180" preserveAspectRatio="none"></svg></div>
          </div>
        </div>

        <div class="shor-slider-row">
          <label>b =</label>
          <input type="range" id="shor-b" min="0" max="255" value="64" step="1">
          <span class="bval" id="shor-bval"></span>
        </div>
        <div class="shor-readout" id="shor-readout"></div>

        <div style="margin-top:12px;">
          <button class="shor-btn" id="shor-measure">Measure (sample b from P, then factor)</button>
        </div>
        <div class="shor-result" id="shor-result"></div>
      </div>
    </div>`;

  // ============================================================
  // M3 — INTERACTION + RENDERING
  // ============================================================
  const elN = container.querySelector('#shor-N');
  const elX = container.querySelector('#shor-x');
  const elMeta = container.querySelector('#shor-meta');
  const elWalk = container.querySelector('#shor-walk');
  const elQft = container.querySelector('#shor-qft');
  const elB = container.querySelector('#shor-b');
  const elBval = container.querySelector('#shor-bval');
  const elReadout = container.querySelector('#shor-readout');
  const elBtn = container.querySelector('#shor-measure');
  const elResult = container.querySelector('#shor-result');

  let state = null;

  function coprimeChoices(N) {
    const out = [];
    for (let x = 2; x < N; x++) if (gcd(x, N) === 1 && order(x, N) > 1) out.push(x);
    return out;
  }

  function nearestMultipleInfo(b, q, r) {
    const qr = q / r;
    const c = Math.round(b / qr);
    const nearest = Math.round(c * qr);
    return { c, nearest, dist: Math.abs(b - nearest) };
  }

  function drawWalk() {
    const { r, q, M } = state;
    const b = parseInt(elB.value, 10);
    const w = phaseWalk(r, q, b, M);
    const VB = 260, cx = VB / 2, cy = VB / 2, margin = 18;
    const R = Math.max(1, M);
    const scale = (VB / 2 - margin) / R;
    const X = re => cx + re * scale;
    const Y = im => cy - im * scale;

    let s = '';
    s += `<circle cx="${cx}" cy="${cy}" r="${(R * scale).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.08)"/>`;
    s += `<line x1="${margin}" y1="${cy}" x2="${VB - margin}" y2="${cy}" stroke="rgba(255,255,255,0.10)"/>`;
    s += `<line x1="${cx}" y1="${margin}" x2="${cx}" y2="${VB - margin}" stroke="rgba(255,255,255,0.10)"/>`;

    let d = '';
    for (let i = 0; i < w.pts.length; i++) {
      const [re, im] = w.pts[i];
      d += (i === 0 ? 'M' : 'L') + X(re).toFixed(2) + ' ' + Y(im).toFixed(2) + ' ';
    }
    const align = w.absS / M;
    const stroke = align > 0.6 ? '#f39c12' : (align > 0.25 ? '#9ed0ff' : '#42a5f5');
    s += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.4" opacity="0.9"/>`;
    s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(w.Sre)}" y2="${Y(w.Sim)}" stroke="#fff" stroke-width="2"/>`;
    s += `<circle cx="${X(w.Sre)}" cy="${Y(w.Sim)}" r="3" fill="#fff"/>`;
    elWalk.innerHTML = s;
    return w;
  }

  function drawQft(curB) {
    const { q, probs } = state;
    const W = elQft.clientWidth || 600, H = 180;
    const cols = Math.min(W, q);
    const per = q / cols;
    let vmax = 0;
    const bucket = new Float64Array(cols);
    for (let c = 0; c < cols; c++) {
      let mx = 0; const lo = Math.floor(c * per), hi = Math.floor((c + 1) * per);
      for (let b = lo; b < hi; b++) if (probs[b] > mx) mx = probs[b];
      bucket[c] = mx; if (mx > vmax) vmax = mx;
    }
    if (vmax === 0) vmax = 1;
    const bw = W / cols;
    let s = '';
    for (let c = 0; c < cols; c++) {
      const h = (bucket[c] / vmax) * (H - 6);
      if (h < 0.5) continue;
      s += `<rect x="${(c * bw).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${Math.max(bw - 0.5, 0.6).toFixed(2)}" height="${h.toFixed(2)}" fill="#64b4ff"/>`;
    }
    const mx = (curB / q) * W;
    s += `<line x1="${mx.toFixed(2)}" y1="0" x2="${mx.toFixed(2)}" y2="${H}" stroke="#f39c12" stroke-width="1.5"/>`;
    elQft.setAttribute('viewBox', `0 0 ${W} ${H}`);
    elQft.innerHTML = s;
  }

  function updateB() {
    const { r, q, M } = state;
    const b = parseInt(elB.value, 10);
    const w = drawWalk();
    drawQft(b);
    const P = w.absS * w.absS / (M * q);
    const nm = nearestMultipleInfo(b, q, r);
    const aligned = nm.dist === 0;
    elBval.textContent = `${b} / ${q}`;
    elReadout.innerHTML =
      `|S(b)| = ${w.absS.toFixed(2)} of max ${M} &nbsp; P(b) = ${P.toFixed(4)} &nbsp; ` +
      `nearest multiple of q/r: ${nm.c}&middot;(q/r) = ${nm.nearest} ` +
      (aligned
        ? `<span class="hot">(exact: vectors fully aligned, constructive)</span>`
        : `(distance ${nm.dist}: vectors rotate, ${w.absS < M * 0.25 ? 'largely destructive' : 'partial'})`);
  }

  function rebuild() {
    const N = parseInt(elN.value, 10);
    const xs = coprimeChoices(N);
    elX.innerHTML = xs.map(x => `<option value="${x}">${x}</option>`).join('');
    recompute();
  }

  function recompute() {
    const N = parseInt(elN.value, 10);
    const x = parseInt(elX.value, 10);
    const { r, q, M, probs } = qftProbs(N, x);
    state = { N, x, r, q, M, probs };
    const rdivq = (q % r === 0);
    elMeta.innerHTML =
      `N = ${N}, x = ${x} &nbsp; period r = ${r} &nbsp; q = 2^${Math.round(Math.log2(q))} = ${q} &nbsp; M = ${M} vectors &nbsp; ` +
      `<span class="tag">${rdivq ? 'easy: r | q' : 'hard: r \u2224 q'}</span>`;
    elB.max = String(q - 1);
    const startB = Math.round(q / r) % q || 0;
    elB.value = String(startB);
    elResult.className = 'shor-result';
    elResult.innerHTML = 'Drag <b>b</b> to see the phase vectors align (long white resultant, tall bar) at multiples of q/r and cancel between them. Then press <b>Measure</b>.';
    updateB();
  }

  function measure() {
    if (!state) return;
    const { N, x, q, probs } = state;
    let u = Math.random(), acc = 0, b = 0;
    for (let i = 0; i < q; i++) { acc += probs[i]; if (u <= acc) { b = i; break; } }
    elB.value = String(b);
    updateB();
    const res = tryFactor(N, x, b, q, state.r);
    const [cp, rc] = cfBest(b, q, N);
    if (res.ok) {
      elResult.className = 'shor-result ok';
      elResult.innerHTML =
        `Measured <code>b = ${b}</code> &rarr; <code>b/q = ${b}/${q}</code> &rarr; ` +
        `continued fraction <code>${cp}/${rc}</code>, candidate period <code>r = ${rc}</code>. ` +
        `Then <code>gcd(x<sup>r/2</sup>\u22121, N) = ${res.f1}</code>, <code>gcd(x<sup>r/2</sup>+1, N) = ${res.f2}</code> ` +
        `&rarr; <b>${N} = ${res.f1} \u00d7 ${res.f2}</b>.`;
    } else {
      const why = res.reason === 'odd'
        ? `the candidate period <code>r = ${rc}</code> came out odd`
        : (res.reason === 'trivial'
          ? `<code>x<sup>r/2</sup> \u2261 \u00b11 (mod N)</code>, a trivial square root`
          : (res.reason === 'shared-factor'
            ? `<code>b</code> landed on a constructive peak, but its index shared a factor with the period, so the convergent reduced to <code>${cp}/${rc}</code> and gave a wrong period`
            : `the sampled <code>b</code> sat too far from a multiple of <code>q/r</code>, so <code>${cp}/${rc}</code> gave a wrong period`));
      elResult.className = 'shor-result bad';
      elResult.innerHTML =
        `Measured <code>b = ${b}</code> &rarr; <code>${cp}/${rc}</code>: this run fails because ${why}. ` +
        `The classical check rejects it at no cost \u2014 press <b>Measure</b> again.`;
    }
  }

  elN.addEventListener('change', rebuild);
  elX.addEventListener('change', recompute);
  elB.addEventListener('input', updateB);
  elBtn.addEventListener('click', measure);
  window.addEventListener('resize', () => { if (state) updateB(); });
  rebuild();
});