// sec5_p18_lwe_noise_duality.js
// ml-18 "Learning With Errors, Read Twice" — noise-duality visualizer.
//
// ONE honest thesis, shown two ways: the SAME small centered noise chi = Uniform[-w,w]
// that an attacker must fight to un-hide a secret is the SAME kind of noise a
// homomorphic computation must budget. The payload is the ASYMMETRY of scale:
//   LEFT  (hide the secret): identifiability survives until w is a large fraction of q;
//   RIGHT (compute on ciphertexts): a single add breaks once 2w >= Delta/2.
// The two walls are measured against different rulers (q vs Delta), and the empirically
// measured gap between the 0.5-crossings is about 4x -- NOT P. Do not quote P as the gap.
// Two independent sliders, both drawing from the identical Uniform[-w,w].
//
// Honesty guardrails (see spec):
//  - Attack failure is loss of IDENTIFIABILITY (true secret stops being the unique
//    brute-force residual-minimizer over all 625 candidates), NOT search cost. The
//    n=4 toy is fully enumerable; a footnote says so. Never imply "search gets hard".
//  - Compute toy is ADDITIVE ONLY (c = Delta*m + noise). No multiply button.
//  - The "broken" state is a DIRECT comparison dec(acc) !== expected, never a
//    predicted noise threshold.
//  - Keep P = 16; do not engineer the scale gap away. The gap IS the lesson.
//
// House rules: no scheme/algorithm names in UI; no efficiency claims; toy sizes only;
// math core self-tested (console.error + return on failure, UI stays hidden).
// Theme-safety: every visible element sits on a self-contained opaque dark panel;
// no CSS var(--), no data-theme read, no currentColor.
//
// Math core: q = 256 so that P*DELTA === q exactly and every plaintext slot has the
// same noise tolerance. Single-add correctness is EXACT: safe iff 2w < DELTA/2, with
// w = DELTA/4 the first breaking width (verified exhaustively over all m1,m2,e1,e2).
// Decrypt decodes on the NON-centered residue round(mod(c)/Delta) % P.

document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('lwe_noise_duality_visualizer');
  if (!container) { console.error('lwe_noise_duality_visualizer container not found!'); return; }
  if (container.dataset.init === '1') return;
  container.dataset.init = '1';

  // ============================================================
  // M1 — MATH CORE (verified)
  // ============================================================
  const q = 256, n = 4, m = 8, P = 16, DELTA = q / P; // Delta = 16, and P*DELTA === q exactly

  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); } // inclusive
  function centeredNoise(w) { return w === 0 ? 0 : randInt(-w, w); }                    // chi = Uniform[-w,w]
  function mod(x) { return ((x % q) + q) % q; }                                         // in [0,q)
  function centeredLift(x) { const r = mod(x); return r >= q / 2 ? r - q : r; }         // image is [-q/2, q/2)
  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  // Not Math.round: JS rounds -0.5 to -0, breaking half-integer symmetry. dec() only ever
  // feeds a non-negative argument, but pin the behaviour so a later edit cannot silently change it.
  function roundHalfUp(x) { return Math.floor(x + 0.5); }

  // --- attack core ---
  const CANDS = (function () {                       // all 625 vectors in {-2..2}^4
    const out = [], R = [-2, -1, 0, 1, 2];
    for (const a of R) for (const b of R) for (const c of R) for (const d of R) out.push([a, b, c, d]);
    return out;
  })();
  function eqVec(a, b) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function sampleSecret() { const s = []; for (let j = 0; j < n; j++) s.push(randInt(-2, 2)); return s; }

  function genLWE(s, w) {                             // b_i = <a_i, s> + e_i (mod q)
    const A = [], b = [];
    for (let i = 0; i < m; i++) {
      const a = []; for (let j = 0; j < n; j++) a.push(randInt(0, q - 1));
      A.push(a); b.push(mod(dot(a, s) + centeredNoise(w)));
    }
    return { A, b };
  }
  // Squared residual after centered lift -- the least-squares objective of the prose.
  // Note this is NOT the maximum-likelihood estimator here: least squares is the MLE
  // under Gaussian noise, and this toy draws Uniform[-w,w]. Under uniform noise the
  // likelihood is flat inside the box and zero outside, so the MLE is a feasibility
  // question (is every |r_i| <= w?), not a minimization. We use least squares anyway,
  // because it is what the page explains and what the reader expects to see running.
  function score(A, b, sc) {
    let s = 0;
    for (let i = 0; i < A.length; i++) {
      const d = centeredLift(b[i] - dot(A[i], sc));
      s += d * d;
    }
    return s;
  }
  
  function bruteBest(A, b) {                          // argmin over all 625 candidates
    let best = null, bs = Infinity;
    for (const sc of CANDS) { 
      const v = score(A, b, sc); if (v < bs) { bs = v; best = sc; } }
    return { best };
  }
  // Resamples A as well as e, so this rate marginalizes over matrices too. That is the
  // right quantity for the thesis, but it means a single on-screen instance can disagree
  // with the plotted rate: one unlucky A can stay identifiable well past the average wall.
  function identifiableRate(s, w, reps) {             // fraction of instances where best === s
    let hit = 0;
    for (let r = 0; r < reps; r++) { const { A, b } = genLWE(s, w); if (eqVec(bruteBest(A, b).best, s)) hit++; }
    return hit / reps;
  }

  // --- compute core (additive homomorphic toy) ---
  function enc(msg, w) { return mod(DELTA * msg + centeredNoise(w)); }   // msg in [0,P)
  function dec(c) { return roundHalfUp(mod(c) / DELTA) % P; }            // decode on non-centered residue
  function hAdd(c1, c2) { return mod(c1 + c2); }                        // additive homomorphism

  // ============================================================
  // M5 — SELF-TESTS (run once; console.error + return on any failure, UI stays hidden)
  // ============================================================
  // Every test below must be capable of FAILING on a plausible bug. Tests that merely
  // confirm a property already guaranteed by their own loop bounds are not tests.
  // Each returns null on success or a diagnostic string on failure.
  function selfTest() {
    // T1 — zero noise: the secret is the unique exact minimiser (score 0, and no tie).
    {
      const s = sampleSecret(); const { A, b } = genLWE(s, 0);
      if (score(A, b, s) !== 0) return 'T1: secret does not achieve zero residual at w=0';
      if (!eqVec(bruteBest(A, b).best, s)) return 'T1: argmin is not the secret at w=0';
      let zeros = 0;
      for (const sc of CANDS) if (score(A, b, sc) === 0) zeros++;
      if (zeros !== 1) return 'T1: zero-residual candidate not unique at w=0 (' + zeros + ')';
    }

    // T2 — the identifiability curve must COLLAPSE, not merely fail to rise.
    // Positive control at w=0, negative control at w=q/2. A flat or inverted curve fails.
    {
      const s = sampleSecret();
      const lo = identifiableRate(s, 0, 24);
      const hi = identifiableRate(s, q / 2, 24);
      if (lo < 0.99) return 'T2: not identifiable at zero noise (' + lo + ')';
      if (hi > 0.10) return 'T2: still identifiable at modulus-scale noise (' + hi + ')';
      // and it must be weakly decreasing across the sweep
      const pts = [0, 32, 64, 96].map(w => identifiableRate(s, w, 20));
      for (let i = 1; i < pts.length; i++) if (pts[i] > pts[i - 1] + 0.2) return 'T2: curve not decreasing';
    }

    // T3 — single-add correctness is EXACT, so test it exhaustively over every noise pair,
    // not by sampling. Positive side: every w with 2w < DELTA/2 round-trips for all inputs.
    {
      for (let w = 0; 2 * w < DELTA / 2; w++)
        for (let m1 = 0; m1 < P; m1++)
          for (let m2 = 0; m2 < P; m2++)
            for (let e1 = -w; e1 <= w; e1++)
              for (let e2 = -w; e2 <= w; e2++) {
                const c = hAdd(mod(DELTA * m1 + e1), mod(DELTA * m2 + e2));
                if (dec(c) !== (m1 + m2) % P) return 'T3: round-trip failed inside the safe bound';
              }
    }

    // T3b — NEGATIVE CONTROL. The bound must be tight: at the first excluded width the
    // round-trip must actually break for some input. Without this, T3 passes vacuously
    // if DELTA/2 is ever loosened.
    {
      const w = DELTA / 4;           // smallest w with 2w >= DELTA/2
      let broke = false;
      for (let m1 = 0; m1 < P && !broke; m1++)
        for (let m2 = 0; m2 < P && !broke; m2++)
          for (let e1 = -w; e1 <= w && !broke; e1++)
            for (let e2 = -w; e2 <= w && !broke; e2++)
              if (dec(hAdd(mod(DELTA * m1 + e1), mod(DELTA * m2 + e2))) !== (m1 + m2) % P) broke = true;
      if (!broke) return 'T3b: bound is not tight — no failure at w = DELTA/4';
    }

    // T4 — accumulator: exact at w=0 over a long chain; and at slot-scale noise a break
    // is reached. The high-noise width is DERIVED from DELTA, not a magic constant.
    {
      let acc = hAdd(enc(3, 0), enc(5, 0)), expected = 8;
      for (let k = 0; k < 15; k++) {
        acc = hAdd(acc, enc(3, 0)); expected = (expected + 3) % P;
        if (dec(acc) !== expected) return 'T4: drift at zero noise';
      }
    }
    {
      const w = DELTA;              // comfortably past the single-add wall
      let broke = 0;
      for (let t = 0; t < 40; t++) {
        let acc = hAdd(enc(3, w), enc(5, w)), expected = 8, hit = (dec(acc) !== expected);
        for (let k = 0; k < 6 && !hit; k++) { acc = hAdd(acc, enc(3, w)); expected = (expected + 3) % P; if (dec(acc) !== expected) hit = true; }
        if (hit) broke++;
      }
      if (broke / 40 < 0.6) return 'T4: high-noise break too rare (' + broke + '/40)';
    }

    // T4c — hAdd must land back in Z_q. dec() applies its own mod, so a missing reduction
    // in hAdd is invisible to every round-trip test above. Pin the ciphertext space directly.
    {
      for (let t = 0; t < 200; t++) {
        const c = hAdd(enc(randInt(0, P - 1), 3), enc(randInt(0, P - 1), 3));
        if (!Number.isInteger(c) || c < 0 || c >= q) return 'T4c: hAdd left Z_q (' + c + ')';
      }
    }

    // T5 — SCALE-GAP INVARIANT (the thesis). Both walls are located by the SAME observable:
    // the 0.5 crossing of a per-instance failure probability. Mixing observables (e.g. a
    // 6-add chain on one side) makes the ratio an artefact of the chain length.
    {
      const s = sampleSecret();
      let wAtk = null;
      for (let w = 0; w <= q / 2; w += 4) { if (identifiableRate(s, w, 24) < 0.5) { wAtk = w; break; } }
      let wDef = null;
      for (let w = 1; w <= DELTA && wDef === null; w++) {
        let broke = 0;
        for (let t = 0; t < 200; t++) if (dec(hAdd(enc(3, w), enc(5, w))) !== 8) broke++;
        if (broke / 200 >= 0.5) wDef = w;
      }
      if (wAtk === null) return 'T5: attack wall never reached';
      if (wDef === null) return 'T5: compute wall never reached';
      // Measured over 120 trials: wAtk ~ 44..60, wDef ~ 11..15, ratio ~ 3.4..5.1 (median 4).
      // The gate is set at 2x, comfortably below the observed tail, because a rendering
      // failure on an unlucky draw is worse than a loose bound. A collapsed gap (ratio ~ 1)
      // is what this must catch, and it does.
      if (wAtk < 2 * wDef) return 'T5: scale gap collapsed (wAtk=' + wAtk + ', wDef=' + wDef + ')';
    }

    return null;
  }

  const failure = selfTest();
  if (failure !== null) {
    console.error('lwe demo: ' + failure);
    container.innerHTML =
      '<div style="padding:16px;color:#ff8a80;background:rgba(20,28,40,0.95);border-radius:8px;' +
      'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">' +
      'Demo failed its internal consistency check and was not rendered.' +
      '<div style="margin-top:8px;font-size:0.85em;opacity:0.75;">' + failure + '</div></div>';
    return;
  }

  // ============================================================
  // M2 — STATE
  // ============================================================
  const ATK_MAX = 128;   // w_atk in [0, q/2]
  const DEF_MAX = 16;    // w_def in [0, Delta]
  const ATK_REPS = 8;    // instances averaged for the live identifiability meter

  const S = {
    // attack panel
    s: sampleSecret(),
    w_atk: 0,
    bestGuess: null,
    identifiableRate: 1,
    // compute panel
    w_def: 0,
    m1: 3, m2: 5,
    c1: 0, c2: 0,
    acc: 0,
    expected: 0,
    noiseTrue: 0,
    addsDone: 1,
    broken: false
  };

  // ============================================================
  // M3 — DOM SKELETON + STYLES (self-contained opaque dark island; theme-safe)
  // ============================================================
  container.innerHTML = `
    <div class="lnd-container tex2jax_ignore mathjax_ignore">
      <div class="lnd-instruction">
        Two worlds, one kind of noise. On the <strong>left</strong> it protects a secret;
        on the <strong>right</strong> it limits what you can compute. Move each noise slider and watch.
      </div>

      <div class="lnd-layout">
        <!-- ===================== LEFT: THE ATTACK ===================== -->
        <div class="lnd-panel" id="lnd-atk">
          <div class="lnd-head">
            <span class="lnd-title">Reading 1 &mdash; Hide the secret</span>
          </div>
          <div class="lnd-sub">
            We brute-force every candidate and keep the best fit. Low noise &rarr; the true secret
            wins uniquely. Raise the noise &rarr; it stops being the unique best fit and blends in.
          </div>

          <div class="lnd-slider-block">
            <div class="lnd-slider-label">
              <span>attack noise</span><span class="lnd-wval" id="lnd-atk-wval">w = 0</span>
            </div>
            <input type="range" id="lnd-atk-slider" min="0" max="${ATK_MAX}" step="1" value="0">
            <div class="lnd-slider-scale"><span>0</span><span>modulus scale (q = ${q})</span></div>
          </div>

          <div class="lnd-atk-body" id="lnd-atk-body"><!-- U6 render target --></div>

          <div class="lnd-btn-row">
            <button class="lnd-btn sec" id="lnd-atk-new">New secret</button>
          </div>
        </div>

        <!-- ===================== RIGHT: THE COMPUTE ===================== -->
        <div class="lnd-panel" id="lnd-def">
          <div class="lnd-head">
            <span class="lnd-title">Reading 2 &mdash; Compute on ciphertexts</span>
          </div>
          <div class="lnd-sub">
            Encrypt two numbers, add them without decrypting, then open the result.
            Keep adding &mdash; noise piles up until the answer breaks.
          </div>

          <div class="lnd-slider-block">
            <div class="lnd-slider-label">
              <span>compute noise</span><span class="lnd-wval" id="lnd-def-wval">w = 0</span>
            </div>
            <input type="range" id="lnd-def-slider" min="0" max="${DEF_MAX}" step="1" value="0">
            <div class="lnd-slider-scale"><span>0</span><span>one add is safe below w = ${DELTA / 4}; more adds, sooner</span></div>
          </div>

          <div class="lnd-def-body" id="lnd-def-body"><!-- U7 render target --></div>
        </div>
      </div>

      <div class="lnd-caption" id="lnd-caption"><!-- dynamic --></div>

      <div class="lnd-footnote">
        This is a tiny toy: only a few hundred secret candidates, so we simply try them all.
        Real difficulty comes from the search space growing astronomically with dimension &mdash;
        a separate matter this toy does not model.
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .lnd-container{margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e8eaed;}
    .lnd-instruction{text-align:center;margin-bottom:16px;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.5;background:rgba(20,28,40,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 16px;}
    .lnd-layout{display:flex;flex-direction:column;gap:16px;}
    @media(min-width:992px){.lnd-layout{flex-direction:row;}.lnd-panel{flex:1;min-width:0;}}
    .lnd-panel{background:rgba(20,28,40,0.95);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px rgba(0,0,0,0.3);}
    .lnd-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
    .lnd-title{font-weight:bold;font-size:0.95rem;color:#64b4ff;}
    .lnd-sub{font-size:0.78rem;color:rgba(255,255,255,0.6);line-height:1.5;margin-bottom:14px;}
    /* slider block */
    .lnd-slider-block{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:11px 12px;margin-bottom:14px;}
    .lnd-slider-label{display:flex;justify-content:space-between;align-items:baseline;font-size:0.8rem;color:rgba(255,255,255,0.7);margin-bottom:8px;}
    .lnd-wval{font-family:'Courier New',monospace;color:#64b4ff;font-size:0.82rem;}
    .lnd-slider-block input[type=range]{width:100%;height:34px;cursor:pointer;accent-color:#42a5f5;}
    .lnd-slider-scale{display:flex;justify-content:space-between;font-size:0.68rem;color:rgba(255,255,255,0.4);margin-top:2px;}
    /* caption + footnote */
    .lnd-caption{margin-top:16px;background:linear-gradient(135deg,rgba(40,60,90,0.97),rgba(25,40,65,0.97));border:1px solid rgba(66,165,245,0.35);border-radius:8px;padding:13px 15px;font-size:0.83rem;line-height:1.55;color:rgba(255,255,255,0.9);}
    .lnd-footnote{margin-top:12px;font-size:0.72rem;color:rgba(255,255,255,0.55);line-height:1.5;font-style:italic;background:rgba(20,28,40,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;}
    /* ---- shared render-body atoms ---- */
    .lnd-vec{font-family:'Courier New',monospace;font-size:0.95rem;letter-spacing:0.01em;color:#cdd5de;}
    .lnd-vec .cm{color:#7ddc8a;}      /* coordinate match */
    .lnd-vec .ms{color:#ffcf7a;}      /* coordinate mismatch */
    .lnd-meter-track{height:12px;border-radius:6px;background:rgba(255,255,255,0.08);overflow:hidden;}
    .lnd-meter-fill{height:100%;border-radius:6px;transition:width 0.18s ease,background 0.18s ease;}
    /* ---- U6 attack-panel body ---- */
    .lnd-vec-card{background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
    .lnd-vec-row{display:flex;align-items:baseline;gap:10px;margin:6px 0;}
    .lnd-vec-tag{width:82px;flex:0 0 82px;font-size:0.75rem;color:rgba(255,255,255,0.55);}
    .lnd-vec-legend{font-size:0.7rem;color:rgba(255,255,255,0.4);margin-top:8px;}
    .lnd-vec-legend .cm{color:#7ddc8a;}
    .lnd-vec-legend .ms{color:#ffcf7a;}
    .lnd-meter-card{background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
    .lnd-meter-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
    .lnd-meter-label{font-size:0.78rem;color:rgba(255,255,255,0.7);}
    .lnd-meter-pct{font-family:'Courier New',monospace;font-size:0.9rem;font-weight:bold;}
    .lnd-btn-row{display:flex;gap:10px;}
    .lnd-btn{flex:1;padding:9px 12px;border-radius:6px;font-size:0.8rem;cursor:pointer;transition:all 0.2s;min-height:36px;}
    .lnd-btn.sec{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.75);}
    .lnd-btn.sec:hover{background:rgba(255,255,255,0.1);}
    .lnd-btn.pri{background:linear-gradient(135deg,#1565c0,#42a5f5);border:1px solid #64b4ff;color:#fff;}
    .lnd-btn.pri:hover{filter:brightness(1.1);}
    .lnd-btn:disabled{opacity:0.4;cursor:not-allowed;}
    /* ---- distribution chart ---- */
    .lnd-dist-card{background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
    .lnd-dist-head{font-size:0.78rem;color:rgba(255,255,255,0.7);margin-bottom:10px;}
    .lnd-dist-sub{display:block;font-size:0.68rem;color:rgba(255,255,255,0.4);margin-top:3px;}
    .lnd-dbar-true-legend{color:#64b4ff;font-weight:600;}
    .lnd-dist-bars{display:flex;flex-direction:column;gap:4px;}
    .lnd-dbar-row{height:9px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;}
    .lnd-dbar{height:100%;border-radius:4px;transition:width 0.18s ease;}
    .lnd-dbar-other{background:rgba(255,255,255,0.22);}
    .lnd-dbar-true{background:linear-gradient(90deg,#1565c0,#64b4ff);box-shadow:0 0 6px rgba(100,180,255,0.5);}
    .lnd-dist-note{font-size:0.74rem;color:rgba(255,255,255,0.6);margin-top:10px;line-height:1.45;}
    /* ---- U7 compute-panel body ---- */
    .lnd-c-card{background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
    .lnd-pick-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px;}
    .lnd-pick{display:flex;align-items:center;gap:7px;}
    .lnd-pick label{font-size:0.8rem;color:rgba(255,255,255,0.6);}
    .lnd-pick select{background:rgba(20,28,40,0.95);color:#e8eaed;border:1px solid rgba(255,255,255,0.2);border-radius:5px;padding:5px 7px;font-size:0.85rem;font-family:'Courier New',monospace;min-height:36px;}
    .lnd-ct-line{font-family:'Courier New',monospace;font-size:0.82rem;color:rgba(255,255,255,0.55);margin-top:8px;line-height:1.7;}
    .lnd-ct-val{color:#9aa5b1;}
    .lnd-ct-hint{font-size:0.7rem;color:rgba(255,255,255,0.35);margin-top:2px;font-style:italic;}
    .lnd-result{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:4px;}
    .lnd-result-label{font-size:0.8rem;color:rgba(255,255,255,0.6);}
    .lnd-result-val{font-family:'Courier New',monospace;font-size:1.15rem;font-weight:bold;}
    .lnd-result-val.ok{color:#7ddc8a;}
    .lnd-result-val.broken{color:#ffcf7a;}
    .lnd-result-note{font-size:0.74rem;margin-top:4px;}
    .lnd-result-note.ok{color:rgba(125,220,138,0.85);}
    .lnd-result-note.broken{color:#ffcf7a;}
    .lnd-budget-top{display:flex;justify-content:space-between;align-items:baseline;font-size:0.75rem;color:rgba(255,255,255,0.55);margin-bottom:6px;}
    /* ---- slot line ---- */
    .lnd-slot-head{font-size:0.78rem;color:rgba(255,255,255,0.7);margin-bottom:12px;}
    .lnd-slot-sub{display:block;font-size:0.68rem;color:rgba(255,255,255,0.4);margin-top:3px;}
    .lnd-slot-track{position:relative;height:34px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;margin-bottom:10px;}
    .lnd-slot-band{position:absolute;top:0;bottom:0;background:rgba(100,180,255,0.09);border-radius:2px;}
    .lnd-slot-wall{position:absolute;top:-2px;bottom:-2px;width:2px;background:rgba(255,207,122,0.55);transform:translateX(-1px);}
    .lnd-slot-tick{position:absolute;top:50%;width:6px;height:6px;border-radius:50%;transform:translate(-50%,-50%);}
    .lnd-slot-center{background:rgba(255,255,255,0.28);}
    .lnd-slot-correct{background:#7ddc8a;box-shadow:0 0 5px rgba(125,220,138,0.6);width:8px;height:8px;}
    .lnd-slot-decoded{background:#ffcf7a;box-shadow:0 0 5px rgba(255,207,122,0.6);width:8px;height:8px;}
    .lnd-slot-marker{position:absolute;top:50%;width:4px;height:22px;border-radius:2px;transform:translate(-50%,-50%);transition:left 0.18s ease,background 0.18s ease;}
    .lnd-slot-note{font-size:0.74rem;margin-top:8px;line-height:1.45;}
    .lnd-adds-badge{font-family:'Courier New',monospace;color:#64b4ff;}
    .lnd-hint{font-size:0.74rem;color:rgba(255,255,255,0.5);margin-top:10px;line-height:1.5;}
    .lnd-hint strong{color:#ffcf7a;font-weight:600;}
  `;
  document.head.appendChild(style);

  // ============================================================
  // M4 — RENDER / WIRING
  // ============================================================

  // ---- U6: attack recompute + render ----
  // One fresh-noise instance drives the displayed guess-vs-truth vectors;
  // identifiableRate is averaged over ATK_REPS instances for a smooth meter.
  const ATK_TOPN = 12; // how many best candidates the distribution chart shows

  function recomputeAttack() {
    const { A, b } = genLWE(S.s, S.w_atk);
    // Score every candidate on this one observation, then read off both the best
    // fit AND the full ranked distribution — so the chart and the vector agree.
    const scored = CANDS.map(sc => ({ sc, v: score(A, b, sc), isTrue: eqVec(sc, S.s) }));
    scored.sort((x, y) => x.v - y.v);
    S.bestGuess = scored[0].sc;
    S.identifiableRate = identifiableRate(S.s, S.w_atk, ATK_REPS);
    // distribution: the top-N by score, plus the true secret's global rank and value
    S.dist = scored.slice(0, ATK_TOPN).map(e => ({ v: e.v, isTrue: e.isTrue }));
    // Rank by STRICT inequality: how many candidates score strictly better than the truth.
    // Array position would call a tie a loss, but a tie IS the thing this panel exists to
    // show — the secret ceasing to be the *unique* minimiser.
    const trueEntry = scored.find(e => e.isTrue);
    S.trueVal = trueEntry.v;
    S.trueRank = scored.filter(e => e.v < trueEntry.v).length;   // 0-based, ties share a rank
    S.trueTied = scored.some(e => !e.isTrue && e.v === trueEntry.v);
    S.bestVal = scored[0].v;
    S.worstShown = scored[ATK_TOPN - 1].v;           // scale reference for bars
  }

  function fmtCoord(x) { return x === 0 ? '0' : (x > 0 ? '+' : '\u2212') + Math.abs(x); } // +2 / \u22122 / 0 (no sign on zero)

  function vecHTML(vec, ref) {
    // color each coordinate green if it matches ref, amber otherwise (ref null => neutral)
    const inner = vec.map((x, i) => {
      const cls = ref ? (x === ref[i] ? 'cm' : 'ms') : '';
      return `<span class="${cls}">${fmtCoord(x)}</span>`;
    }).join('&nbsp;&nbsp;');
    return `[&nbsp;${inner}&nbsp;]`;
  }

  // Distribution chart: one bar per top-N candidate. Bar length encodes "fit quality"
  // (worstShown - score), so the best candidates are the LONGEST bars. The true
  // secret's bar is highlighted. Reads at a glance:
  //   low noise  -> the true secret's bar towers alone (isolated winner)
  //   high noise -> all bars nearly equal, the true secret sunk into the pack
  function distHTML() {
    const bars = S.dist;
    const lo = S.bestVal;                                  // best (shortest score)
    const hi = Math.max(S.worstShown, lo + 1);             // guard against zero range
    const rows = bars.map((e) => {
      const quality = (hi - e.v) / (hi - lo);              // 1 = best, 0 = worst shown
      const w = Math.max(4, Math.round(quality * 100));    // keep a sliver visible
      const cls = e.isTrue ? 'lnd-dbar-true' : 'lnd-dbar-other';
      return `<div class="lnd-dbar-row"><div class="lnd-dbar ${cls}" style="width:${w}%;"></div></div>`;
    }).join('');
    // annotation: is the true secret the clear, isolated winner or lost in the crowd?
    let note;
    if (S.trueRank === 0 && S.trueTied) {
      note = 'The true secret is tied for best — it is no longer the unique best fit.';
    } else if (S.trueRank === 0 && S.dist.length > 1) {
      const gap = (S.dist[1].v - S.dist[0].v);
      const spread = Math.max(1, S.worstShown - S.bestVal);
      const isolated = gap / spread > 0.25;
      note = isolated
        ? 'The true secret stands alone as the clear best fit.'
        : 'The true secret is best here, but barely — rivals are almost as good.';
    } else if (S.trueRank < ATK_TOPN) {
      note = `A wrong candidate now fits best; the true secret has sunk to rank #${S.trueRank + 1}.`;
    } else {
      note = `The true secret is lost in the crowd — rank #${S.trueRank + 1} of ${CANDS.length}.`;
    }
    return `
      <div class="lnd-dist-card">
        <div class="lnd-dist-head">how the candidates score
          <span class="lnd-dist-sub">longer = fits better · <span class="lnd-dbar-true-legend">the true secret</span></span>
        </div>
        <div class="lnd-dist-bars">${rows}</div>
        <div class="lnd-dist-note">${note}</div>
      </div>`;
  }

  function renderAttack() {
    const body = container.querySelector('#lnd-atk-body');
    if (!body) return;

    const guess = S.bestGuess || S.s;
    const pct = Math.round(S.identifiableRate * 100);
    // meter color: blue when well-pinned, amber as it collapses
    const fillColor = S.identifiableRate >= 0.5
      ? 'linear-gradient(90deg,#1565c0,#42a5f5)'
      : 'linear-gradient(90deg,#b26a00,#f39c12)';

    body.innerHTML = `
      <div class="lnd-vec-card">
        <div class="lnd-vec-row">
          <span class="lnd-vec-tag">true secret</span>
          <span class="lnd-vec">${vecHTML(S.s, null)}</span>
        </div>
        <div class="lnd-vec-row">
          <span class="lnd-vec-tag">best fit</span>
          <span class="lnd-vec">${vecHTML(guess, S.s)}</span>
        </div>
        <div class="lnd-vec-legend">
          <span class="cm">green</span> = matches the secret &nbsp;&middot;&nbsp;
          <span class="ms">amber</span> = the fit has drifted off
        </div>
      </div>

      ${distHTML()}

      <div class="lnd-meter-card">
        <div class="lnd-meter-top">
          <span class="lnd-meter-label">secret still pinned down</span>
          <span class="lnd-meter-pct" style="color:${S.identifiableRate >= 0.5 ? '#64b4ff' : '#f39c12'};">${pct}%</span>
        </div>
        <div class="lnd-meter-track">
          <div class="lnd-meter-fill" style="width:${pct}%;background:${fillColor};"></div>
        </div>
      </div>
    `;

    const wval = container.querySelector('#lnd-atk-wval');
    if (wval) wval.textContent = 'w = ' + S.w_atk;
  }
  // ---- U7: compute-panel state helpers + render ----
  // Encrypt m1,m2 fresh, form the running accumulator acc = Enc(m1)+Enc(m2).
  // We track noiseTrue behind the scenes (only possible because this is a toy) to
  // give a "budget feel" bar; but the broken flag is ALWAYS the direct comparison.
  function reEncrypt() {
    const e1 = centeredNoise(S.w_def), e2 = centeredNoise(S.w_def);
    const c1 = mod(DELTA * S.m1 + e1), c2 = mod(DELTA * S.m2 + e2);
    S.c1 = c1; S.c2 = c2;
    S.acc = hAdd(c1, c2);
    S.expected = (S.m1 + S.m2) % P;   // mod-P wrap folded in here => never itself a "break"
    S.noiseTrue = e1 + e2;
    S.addsDone = 1;
    S.broken = (dec(S.acc) !== S.expected);
  }
  function addAnother() {
    const e = centeredNoise(S.w_def);
    S.acc = hAdd(S.acc, mod(DELTA * S.m1 + e));
    S.expected = (S.expected + S.m1) % P;
    S.noiseTrue += e;
    S.addsDone += 1;
    S.broken = (dec(S.acc) !== S.expected);  // direct ground-truth comparison
  }

  // Slot line: the answer lives at a slot center (spacing Delta); decryption rounds acc to
  // the NEAREST center. A windowed view around the correct slot shows the marker drifting off
  // center as noise accumulates. The broken state follows S.broken (the direct dec!=expected
  // comparison) exactly — we never re-derive it from the marker's geometry, because the
  // Delta*P != q drift makes a pure "crossed the wall" test disagree near the boundary.
  function slotHTML() {
    const pos = mod(S.acc);
    const decoded = dec(S.acc);
    const expected = S.expected;
    // The ciphertext space is a CIRCLE (Z_q), so the window must wrap rather than clamp.
    // Center it on `expected` and measure every position by signed circular distance from
    // that centre; otherwise slots 0 and P-1 clamp two different ciphertexts to opposite
    // edges even though they decode to the same value.
    const HALF = 3;                                   // slots shown either side of centre
    const centre = DELTA * expected;                  // ciphertext at the centre of the band
    const span = (2 * HALF + 1) * DELTA;              // full window width, in ciphertext units
    const circDist = (v) => { let d = mod(v - centre); if (d > q / 2) d -= q; return d; };
    const toPct = (v) => 100 * (circDist(v) + span / 2) / span;
    const markerPct = toPct(pos);                     // always in [0,100]: the window wraps

    // slot cells + centers
    let cells = '';
    for (let j = -HALF; j <= HALF; j++) {
      const k = ((expected + j) % P + P) % P;         // wrap the slot index too
      const cx = toPct(DELTA * k);
      const isCorrect = k === expected;
      const isDecoded = k === decoded;
      const cls = isCorrect ? 'lnd-slot-correct' : (isDecoded ? 'lnd-slot-decoded' : 'lnd-slot-center');
      cells += `<div class="lnd-slot-tick ${cls}" style="left:${cx}%;"></div>`;
    }
    // Wall markers: the half-slot boundaries around the correct slot. Under round-half-up
    // the slot is half-open, [-DELTA/2, +DELTA/2) — a residual of exactly +DELTA/2 rounds UP
    // into the next slot. The band below is decoration; the authoritative "did it flip?"
    // signal is always S.broken, computed as dec(acc) !== expected.
    const wallL = toPct(DELTA * expected - DELTA / 2);
    const wallR = toPct(DELTA * expected + DELTA / 2);
    const markerColor = S.broken ? '#f39c12' : '#64b4ff';

    return `
      <div class="lnd-c-card">
        <div class="lnd-slot-head">where the answer lands
          <span class="lnd-slot-sub">each notch is a slot (spacing &Delta; = ${DELTA}); decryption snaps to the nearest one</span>
        </div>
        <div class="lnd-slot-track">
          <div class="lnd-slot-wall" style="left:${wallL}%;"></div>
          <div class="lnd-slot-wall" style="left:${wallR}%;"></div>
          <div class="lnd-slot-band" style="left:${wallL}%;width:${wallR - wallL}%;"></div>
          ${cells}
          <div class="lnd-slot-marker" style="left:${markerPct}%;background:${markerColor};box-shadow:0 0 6px ${markerColor};"></div>
        </div>
        <div class="lnd-slot-note" style="color:${S.broken ? '#ffcf7a' : 'rgba(255,255,255,0.6)'};">
          ${S.broken
            ? `The marker has drifted past the wall into slot ${decoded}\u2019s territory \u2014 it decrypts to ${decoded}, not ${expected}.`
            : `The marker sits inside slot ${expected}\u2019s walls, so it still decrypts correctly. Noise nudges it off center; cross a wall and it flips.`}
        </div>
      </div>`;
  }

  function renderCompute() {
    const body = container.querySelector('#lnd-def-body');
    if (!body) return;

    const result = dec(S.acc);
    const budgetFrac = Math.min(1, Math.abs(S.noiseTrue) / (DELTA / 2));
    const budgetPct = Math.round(budgetFrac * 100);
    const budgetColor = S.broken
      ? 'linear-gradient(90deg,#b26a00,#f39c12)'
      : (budgetFrac > 0.66 ? 'linear-gradient(90deg,#1565c0,#f39c12)' : 'linear-gradient(90deg,#1565c0,#42a5f5)');

    const opts = (sel) => {
      let o = '';
      for (let v = 0; v <= 7; v++) o += `<option value="${v}"${v === sel ? ' selected' : ''}>${v}</option>`;
      return o;
    };

    body.innerHTML = `
      <div class="lnd-c-card">
        <div class="lnd-pick-row">
          <div class="lnd-pick"><label for="lnd-m1">m&#8321;</label><select id="lnd-m1">${opts(S.m1)}</select></div>
          <div class="lnd-pick"><label for="lnd-m2">m&#8322;</label><select id="lnd-m2">${opts(S.m2)}</select></div>
        </div>
        <div class="lnd-ct-line">
          c&#8321; = <span class="lnd-ct-val">${S.c1}</span> &nbsp;&nbsp; c&#8322; = <span class="lnd-ct-val">${S.c2}</span>
        </div>
        <div class="lnd-ct-hint">ciphertexts in [0, ${q}) &mdash; they look like noise, which is the point</div>
      </div>

      <div class="lnd-c-card">
        <div class="lnd-result">
          <span class="lnd-result-label">open the sum (decrypt)</span>
          <span class="lnd-result-val ${S.broken ? 'broken' : 'ok'}">${S.broken ? result + ' \u2260 ' + S.expected : result}</span>
        </div>
        <div class="lnd-result-note ${S.broken ? 'broken' : 'ok'}">
          ${S.broken
            ? 'broken \u2014 noise budget exceeded; the opened value no longer matches the true sum'
            : 'correct \u2014 equals the true sum of the hidden numbers'}
        </div>
      </div>

      ${slotHTML()}

      <div class="lnd-c-card">
        <div class="lnd-budget-top">
          <span>noise budget</span>
          <span class="lnd-adds-badge">add #${S.addsDone}</span>
        </div>
        <div class="lnd-meter-track">
          <div class="lnd-meter-fill" style="width:${budgetPct}%;background:${budgetColor};"></div>
        </div>
      </div>

      <div class="lnd-btn-row">
        <button class="lnd-btn pri" id="lnd-add">Add another copy of m&#8321;</button>
      </div>

      <div class="lnd-hint" id="lnd-hint"></div>
    `;

    const hint = container.querySelector('#lnd-hint');
    if (hint) {
      if (S.broken) {
        hint.innerHTML = 'The ceiling is reached. Lower the compute noise, or pick new numbers, to start fresh.';
      } else if (S.w_def <= 2) {
        hint.innerHTML = 'At this low noise the sum stays correct for many adds. <strong>Raise the compute noise</strong> to reach the break sooner.';
      } else {
        hint.innerHTML = 'Keep adding \u2014 each copy piles on more noise until the answer breaks.';
      }
    }

    // rewire the freshly-created controls (innerHTML replaced them)
    const m1sel = container.querySelector('#lnd-m1');
    const m2sel = container.querySelector('#lnd-m2');
    const addBtn = container.querySelector('#lnd-add');
    if (m1sel) m1sel.addEventListener('change', () => { S.m1 = +m1sel.value; reEncrypt(); renderCompute(); renderCaption(); });
    if (m2sel) m2sel.addEventListener('change', () => { S.m2 = +m2sel.value; reEncrypt(); renderCompute(); renderCaption(); });
    if (addBtn) addBtn.addEventListener('click', () => { addAnother(); renderCompute(); renderCaption(); });

    const wval = container.querySelector('#lnd-def-wval');
    if (wval) wval.textContent = 'w = ' + S.w_def;
  }
  function renderCaption() {
    const cap = container.querySelector('#lnd-caption');
    if (!cap) return;
    // Reflect the live state of both panels. Attack "hidden" when identifiability is low;
    // compute "broken" from the direct comparison. Never imply search cost.
    const hidden = S.identifiableRate < 0.5;
    const left = hidden
      ? `On the left, noise of w = ${S.w_atk} has blurred the secret: it is no longer the unique best fit. That wall stands at a sizeable fraction of the modulus (q = ${q}).`
      : `On the left, the secret is still pinned down at noise w = ${S.w_atk}; blurring it takes noise measured against the modulus (q = ${q}), not against a slot.`;
    const right = S.broken
      ? `On the right, noise of w = ${S.w_def} was enough to break the computation after ${S.addsDone} add${S.addsDone === 1 ? '' : 's'} &mdash; a fraction of a slot (&Delta; = ${DELTA}), not a slot's worth.`
      : `On the right, this run still decodes at noise w = ${S.w_def} after ${S.addsDone} add${S.addsDone === 1 ? '' : 's'}. A single add is safe only while 2w &lt; &Delta;/2; every further add brings the wall closer.`;
    cap.innerHTML =
      `${left} ${right} ` +
      `Same kind of noise in both worlds &mdash; but it is measured against two different rulers: ` +
      `the modulus q = ${q} on the left, a single slot &Delta; = ${DELTA} on the right. ` +
      `The walls they set are not equally far away, and no setting of the noise puts you safely behind both.`;
  }

  // ---- U8 (attack half): wiring ----
  // Debounce the attack regen: each redraw brute-forces ATK_REPS*625*m score-ops,
  // so we coalesce rapid slider drags into one recompute per animation frame.
  const atkSlider = container.querySelector('#lnd-atk-slider');
  let atkRAF = 0;
  function scheduleAttack() {
    if (atkRAF) return;
    atkRAF = requestAnimationFrame(() => {
      atkRAF = 0;
      recomputeAttack();
      renderAttack();
      renderCaption();
    });
  }
  if (atkSlider) {
    atkSlider.addEventListener('input', () => {
      S.w_atk = +atkSlider.value;
      // update the numeric readout immediately (cheap), defer the heavy recompute
      const wval = container.querySelector('#lnd-atk-wval');
      if (wval) wval.textContent = 'w = ' + S.w_atk;
      scheduleAttack();
    });
  }
  const atkNew = container.querySelector('#lnd-atk-new');
  if (atkNew) {
    atkNew.addEventListener('click', () => {
      S.s = sampleSecret();
      recomputeAttack();
      renderAttack();
      renderCaption();
    });
  }

  // ---- U8 (compute half): wiring ----
  // Compute is cheap (no brute force), so no debounce needed. Changing the noise
  // resets the whole accumulation: fresh encryption, fresh budget, addsDone = 1.
  const defSlider = container.querySelector('#lnd-def-slider');
  if (defSlider) {
    defSlider.addEventListener('input', () => {
      S.w_def = +defSlider.value;
      const wval = container.querySelector('#lnd-def-wval');
      if (wval) wval.textContent = 'w = ' + S.w_def;
      reEncrypt();
      renderCompute();
      renderCaption();
    });
  }

  // initial paint
  recomputeAttack();
  reEncrypt();
  renderAttack();
  renderCompute();
  renderCaption();
});