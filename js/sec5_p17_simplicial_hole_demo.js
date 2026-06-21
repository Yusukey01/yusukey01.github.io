// sec5_p17_simplicial_hole_demo.js
// Simplicial hole-counting visualizer for ml-17 — "Simplicial Neural Networks"
//
// Shows ONE neutral fact: the SAME operator that propagates messages, the
// Hodge Laplacian L1, counts the holes of the domain. The user fills or opens
// triangular cells; the number of independent holes beta1 and dim ker L1 — the
// count of stable (harmonic) features a simplicial network can carry — change
// together, in lockstep, in real time.
//
// House rules: algorithm-agnostic (no architecture names, no efficiency
// claims). Math core computed exactly in JS, self-tested at startup against
// orientation-invariant identities (beta1 === dim ker L1 === expected) for all
// four states. Integer-rank beta1 drives the UI; the Jacobi eigen route is the
// independent cross-check. Reference eigenvalues are NOT asserted (they are
// orientation-dependent; only dim ker / beta1 are convention-free).
//
// Orientation convention (NORMATIVE): every edge oriented low-index -> high.
// Verified in NumPy two independent ways + Euler characteristic + harmonic
// (cycle satisfies d1 h = 0) cross-checks.

document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('simplicial_demo');
  if (!container) { console.error('simplicial_demo container not found!'); return; }
  if (container.dataset.init === '1') { return; } // guard against double-init
  container.dataset.init = '1';

  // ============================================================
  // M1 — MATH CORE (verified against NumPy; see SPEC §2a / §4)
  // ============================================================
  // Edges low->high. Note (3,0) is stored as oriented edge 0->3.
  const EDGES = [[0,1],[1,2],[2,3],[0,3],[0,2]]; // e0..e4
  const TRIS  = { T0:[0,1,2], T1:[0,2,3] };       // each sorted a<b<c
  const NE = EDGES.length; // 5
  const NV = 4;

  const edgeIndex = (() => {
    const m = {};
    EDGES.forEach(([u,v],i) => { m[u+','+v] = i; });
    return m;
  })();

  // d1: vertices x edges (4x5). Oriented u->v (u<v): -1 at u, +1 at v.
  function d1() {
    const M = Array.from({length:NV}, () => new Array(NE).fill(0));
    EDGES.forEach(([u,v],j) => { M[u][j] = -1; M[v][j] = +1; });
    return M;
  }

  // d2: edges x |filled| (5xk). For sorted a<b<c: +[b,c] -[a,c] +[a,b].
  // Every face edge is already low->high so signs are taken directly.
  function d2(filled) {
    const cols = [];
    filled.forEach(name => {
      const [a,b,c] = TRIS[name];
      const col = new Array(NE).fill(0);
      col[edgeIndex[b+','+c]] += +1;
      col[edgeIndex[a+','+c]] += -1;
      col[edgeIndex[a+','+b]] += +1;
      cols.push(col);
    });
    const k = cols.length;
    const M = Array.from({length:NE}, () => new Array(k).fill(0));
    for (let j=0;j<k;j++) for (let i=0;i<NE;i++) M[i][j] = cols[j][i];
    return M; // NE x k
  }

  function transpose(M){ const r=M.length, c=M[0]?M[0].length:0;
    const T=Array.from({length:c},()=>new Array(r).fill(0));
    for(let i=0;i<r;i++)for(let j=0;j<c;j++)T[j][i]=M[i][j]; return T; }
  function matmul(A,B){ const r=A.length, n=A[0].length, c=B[0].length;
    const C=Array.from({length:r},()=>new Array(c).fill(0));
    for(let i=0;i<r;i++)for(let k=0;k<n;k++){const a=A[i][k]; if(a===0)continue;
      for(let j=0;j<c;j++)C[i][j]+=a*B[k][j];} return C; }
  function matadd(A,B){ return A.map((row,i)=>row.map((x,j)=>x+B[i][j])); }

  // Hodge L1 = d2 d2^T + d1^T d1  (5x5).
  function hodgeL1(filled){
    const D1=d1(), D2=d2(filled);
    const term2 = matmul(transpose(D1), D1);
    let term1;
    if (D2[0].length === 0) {
      term1 = Array.from({length:NE},()=>new Array(NE).fill(0));
    } else {
      term1 = matmul(D2, transpose(D2));
    }
    return matadd(term1, term2);
  }

  // Integer rank by fraction-free Gaussian elimination (exact, tolerance-free).
  function rankInteger(Min){
    const M = Min.map(r=>r.slice());
    const rows=M.length, cols=M[0]?M[0].length:0;
    if (cols===0) return 0;
    let rank=0;
    for (let col=0; col<cols && rank<rows; col++){
      let piv=-1;
      for(let r=rank;r<rows;r++){ if(M[r][col]!==0){piv=r;break;} }
      if(piv===-1) continue;
      const tmp=M[rank]; M[rank]=M[piv]; M[piv]=tmp;
      const pv=M[rank][col];
      for(let r=0;r<rows;r++){
        if(r===rank) continue;
        const f=M[r][col];
        if(f===0) continue;
        for(let c=0;c<cols;c++){ M[r][c]=pv*M[r][c]-f*M[rank][c]; }
      }
      rank++;
    }
    return rank;
  }

  // beta1 = (|E| - rank d1) - rank d2  (authoritative integer count; drives UI).
  function betti1(filled){
    const rD1 = rankInteger(d1());
    const D2 = d2(filled);
    const rD2 = (D2[0] && D2[0].length>0) ? rankInteger(D2) : 0;
    return (NE - rD1) - rD2;
  }

  // Jacobi eigenvalue algorithm for 5x5 real symmetric (SPEC §3c).
  function jacobiEig(Ain){
    const n=Ain.length;
    const A=Ain.map(r=>r.slice());
    for(let sweep=0; sweep<100; sweep++){
      let p=0,q=1,off=0;
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
        const a=Math.abs(A[i][j]); if(a>off){off=a;p=i;q=j;}
      }
      if(off<1e-12) break;
      const app=A[p][p], aqq=A[q][q], apq=A[p][q];
      const phi=0.5*Math.atan2(2*apq, aqq-app);
      const c=Math.cos(phi), s=Math.sin(phi);
      for(let k=0;k<n;k++){ const akp=A[k][p], akq=A[k][q];
        A[k][p]=c*akp - s*akq; A[k][q]=s*akp + c*akq; }
      for(let k=0;k<n;k++){ const apk=A[p][k], aqk=A[q][k];
        A[p][k]=c*apk - s*aqk; A[q][k]=s*apk + c*aqk; }
    }
    const eig=[]; for(let i=0;i<n;i++)eig.push(A[i][i]);
    eig.sort((a,b)=>a-b);
    return eig;
  }

  // dimKerL1 = # near-zero eigenvalues (relative test, SPEC §3c). Cross-check only.
  function dimKerL1(filled){
    const eig=jacobiEig(hodgeL1(filled));
    const s=Math.max(1, Math.max(...eig.map(Math.abs)));
    return eig.filter(l => Math.abs(l) < 1e-8*s).length;
  }

  // Fixed, verified harmonic generator cycles over [e0,e1,e2,e3,e4] (SPEC §3a).
  // d1 h = 0 verified. Used for the overlay; NOT derived from a numeric eigenvector.
  const HARM = {
    T0: [ 1, 1, 0, 0, -1], // hole around T0 (T0 open): 0->1->2->0 = +e0+e1-e4
    T1: [ 0, 0, 1,-1,  1], // hole around T1 (T1 open): 0->2->3->0 = +e4+e2-e3
  };

  // ============================================================
  // M2 — SELF-TEST (SPEC §4) — orientation-invariant identities only.
  // Refuse to render on failure. Reference eigenvalues are NOT asserted.
  // ============================================================
  function runSelfTest(){
    const STATES = [ [], ['T0'], ['T1'], ['T0','T1'] ];
    const EXPECT = { '': 2, 'T0':1, 'T1':1, 'T0,T1':0 };
    const key = f => f.slice().sort().join(',');
    for(const filled of STATES){
      const k = key(filled);
      const b = betti1(filled);
      const dk = dimKerL1(filled);
      if (b !== EXPECT[k] || dk !== b) {
        console.error('simplicial_demo self-test FAILED at state', k, {beta1:b, dimKer:dk, expected:EXPECT[k]});
        return false;
      }
    }
    return true;
  }

  if (!runSelfTest()) {
    container.innerHTML = '<div style="padding:16px;color:#ff8a80;font-family:sans-serif;">'
      + 'Demo failed its internal consistency check and was not rendered.</div>';
    return;
  }

  // ============================================================
  // M3 — STATE
  // ============================================================
  // filled: Set of region names currently filled. Initial state: {} (beta1 = 2),
  // so the opening view shows a nontrivial count and the user walks 2 -> 1 -> 0.
  const state = { filled: new Set() };

  function recompute(){
    const filled = Array.from(state.filled);
    const beta1 = betti1(filled);
    const dimKer = dimKerL1(filled);
    // cheap regression guard each toggle (SPEC §3b)
    if (beta1 !== dimKer) {
      console.error('simplicial_demo: beta1 != dimKer at runtime', {filled, beta1, dimKer});
    }
    // surviving holes -> their fixed harmonic generators
    const harmonics = [];
    if (!state.filled.has('T0')) harmonics.push({ region:'T0', h:HARM.T0 });
    if (!state.filled.has('T1')) harmonics.push({ region:'T1', h:HARM.T1 });
    return { beta1, dimKer, harmonics };
  }

  function toggle(region){
    if (state.filled.has(region)) state.filled.delete(region);
    else state.filled.add(region);
    render();
  }

  // ============================================================
  // M4 — DOM SKELETON + STYLES (house palette, matches sibling demos)
  // ============================================================
  container.innerHTML = `
    <div class="scx-container">
      <div class="scx-layout">
        <div class="scx-canvas-area">
          <div class="scx-instruction" id="scx-instruction">
            Click a triangular region to <strong>fill</strong> it (close a hole) or
            <strong>open</strong> it again. Watch the count below change in lockstep.
          </div>
          <div id="scx-svg-wrapper"></div>
          <div class="scx-legend">
            <div class="scx-legend-item"><span class="scx-swatch open"></span> open region (a hole)</div>
            <div class="scx-legend-item"><span class="scx-swatch filled"></span> filled region (2-simplex)</div>
            <div class="scx-legend-item"><span class="scx-swatch harm"></span> harmonic circulation</div>
          </div>
        </div>

        <div class="scx-panel">
          <div class="scx-badge-card">
            <div class="scx-badge-label">independent holes &nbsp;=&nbsp; stable features the network can carry</div>
            <div class="scx-badge" id="scx-badge" aria-live="polite">
              &beta;<sub>1</sub> = dim ker <strong>L</strong><sub>1</sub> = <span id="scx-count">2</span>
            </div>
            <div class="scx-badge-sub" id="scx-badge-sub">two independent holes</div>
          </div>

          <div class="scx-caption">
            Fill a triangle to close a hole. The number of stable features the network can
            represent drops with it. The very operator that would propagate messages across this
            complex, the Hodge Laplacian <strong>L</strong><sub>1</sub>, has a kernel whose dimension
            <em>is</em> that count.
          </div>

          <div class="scx-insight">
            <span class="scx-insight-icon">&#9673;</span>
            <span id="scx-insight-text"></span>
          </div>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .scx-container{margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e8eaed;}
    .scx-layout{display:flex;flex-direction:column;gap:20px;}
    @media(min-width:992px){
      .scx-layout{flex-direction:row;}
      .scx-canvas-area{flex:1;order:1;}
      .scx-panel{flex:1;order:2;max-width:440px;}
    }
    .scx-canvas-area{display:flex;flex-direction:column;
      background:rgba(20,28,40,0.95);padding:15px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
      box-shadow:0 8px 32px rgba(0,0,0,0.3);}
    #scx-svg-wrapper{position:relative;width:100%;background:linear-gradient(135deg,#0a0f18 0%,#0f1419 100%);
      border:1px solid rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;}
    #scx-svg-wrapper svg{display:block;width:100%;height:auto;}
    .scx-instruction{text-align:center;margin-bottom:10px;font-size:0.9rem;color:rgba(255,255,255,0.5);}
    .scx-legend{margin-top:10px;display:flex;gap:16px;font-size:0.8rem;color:rgba(255,255,255,0.65);justify-content:center;flex-wrap:wrap;}
    .scx-legend-item{display:flex;align-items:center;gap:6px;}
    .scx-swatch{width:14px;height:14px;border-radius:3px;display:inline-block;}
    .scx-swatch.open{background:transparent;border:1px dashed rgba(255,255,255,0.4);}
    .scx-swatch.filled{background:rgba(56,209,197,0.4);border:1px solid rgba(56,209,197,0.85);}
    .scx-swatch.harm{background:transparent;border:1px solid #64b4ff;border-radius:50%;}
    .scx-panel{background:rgba(20,28,40,0.95);padding:15px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
      box-shadow:0 8px 32px rgba(0,0,0,0.3);}
    .scx-badge-card{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;
      padding:16px;margin-bottom:12px;text-align:center;}
    .scx-badge-label{font-size:0.74rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;}
    .scx-badge{font-size:1.5rem;color:#64b4ff;font-weight:bold;line-height:1.3;}
    .scx-badge #scx-count{font-size:1.9rem;color:#fff;}
    .scx-badge-sub{margin-top:8px;font-size:0.85rem;color:rgba(255,255,255,0.6);}
    .scx-caption{font-size:0.82rem;line-height:1.5;color:rgba(255,255,255,0.7);
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-bottom:12px;}
    .scx-insight{display:flex;gap:10px;align-items:flex-start;background:linear-gradient(135deg,rgba(66,165,245,0.1),rgba(21,101,192,0.05));
      border:1px solid rgba(66,165,245,0.2);border-radius:8px;padding:11px;font-size:0.8rem;line-height:1.45;color:rgba(255,255,255,0.82);}
    .scx-insight-icon{color:#64b4ff;font-size:1rem;line-height:1.3;}
    /* SVG interactive region */
    .scx-region{cursor:pointer;transition:fill 0.15s, stroke 0.15s;outline:none;}
    .scx-region:hover .scx-region-fill,
    .scx-region:focus-visible .scx-region-fill{stroke:rgba(56,209,197,0.95);}
    .scx-region:focus-visible .scx-region-fill{stroke-width:3;}
  `;
  document.head.appendChild(style);

  // ============================================================
  // M5 — SVG GEOMETRY (SPEC §1 layout)
  // ============================================================
  // viewBox coordinate space; rendered responsively to container width.
  const VB = 360;          // viewBox is VB x VB
  const m  = 56;           // margin
  // Vertex coordinates: 0=BL, 1=BR, 2=TR, 3=TL.
  const P = {
    0: [m,        VB - m],
    1: [VB - m,   VB - m],
    2: [VB - m,   m     ],
    3: [m,        m     ],
  };
  const SVGNS = 'http://www.w3.org/2000/svg';

  // region polygons (triangles) for hit-test + fill
  const REGIONS = {
    T0: [0,1,2],
    T1: [0,2,3],
  };

  const wrapper = container.querySelector('#scx-svg-wrapper');
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VB} ${VB}`);
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'A square split by one diagonal into two triangular regions.');
  wrapper.appendChild(svg);

  // layers (drawing order): fills < edges < harmonic overlay < vertices < region hit/focus
  const layerFills   = document.createElementNS(SVGNS,'g');
  const layerEdges   = document.createElementNS(SVGNS,'g');
  const layerHarm    = document.createElementNS(SVGNS,'g');
  const layerVerts   = document.createElementNS(SVGNS,'g');
  const layerRegions = document.createElementNS(SVGNS,'g'); // focusable buttons on top (transparent)
  [layerFills, layerEdges, layerHarm, layerVerts, layerRegions].forEach(l => svg.appendChild(l));

  // arrowhead marker for harmonic circulation
  const defs = document.createElementNS(SVGNS,'defs');
  defs.innerHTML = `
    <marker id="scx-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9 z" fill="#64b4ff"></path>
    </marker>`;
  svg.appendChild(defs);

  // --- static fills (one polygon per region; updated open/filled in render) ---
  const fillEls = {};
  Object.keys(REGIONS).forEach(name => {
    const pts = REGIONS[name].map(v => P[v].join(',')).join(' ');
    const poly = document.createElementNS(SVGNS,'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('class','scx-region-fill');
    poly.setAttribute('stroke-width','2');
    layerFills.appendChild(poly);
    fillEls[name] = poly;
  });

  // --- static edges (always drawn) ---
  EDGES.forEach(([u,v]) => {
    const line = document.createElementNS(SVGNS,'line');
    line.setAttribute('x1', P[u][0]); line.setAttribute('y1', P[u][1]);
    line.setAttribute('x2', P[v][0]); line.setAttribute('y2', P[v][1]);
    line.setAttribute('stroke', 'rgba(255,255,255,0.55)');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('stroke-linecap','round');
    layerEdges.appendChild(line);
  });

  // --- vertices ---
  Object.keys(P).forEach(v => {
    const c = document.createElementNS(SVGNS,'circle');
    c.setAttribute('cx', P[v][0]); c.setAttribute('cy', P[v][1]);
    c.setAttribute('r','5.5');
    c.setAttribute('fill','#cdd5de');
    layerVerts.appendChild(c);
  });

  // --- focusable region buttons (transparent overlay, on top, keyboard accessible) ---
  const regionEls = {};
  Object.keys(REGIONS).forEach(name => {
    const pts = REGIONS[name].map(v => P[v].join(',')).join(' ');
    const poly = document.createElementNS(SVGNS,'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill','transparent');
    poly.setAttribute('class','scx-region');
    poly.setAttribute('tabindex','0');
    poly.setAttribute('role','button');
    poly.setAttribute('aria-pressed','false');
    poly.addEventListener('click', () => toggle(name));
    poly.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(name); }
    });
    layerRegions.appendChild(poly);
    regionEls[name] = poly;
  });
  // NOTE: hover-fill via CSS targets the sibling fill polygon; link visual focus
  // by also lightening the fill polygon stroke through .scx-region:hover (done in CSS
  // by re-stroking on hover of the overlay -- handled by JS hover below for robustness).
  Object.keys(REGIONS).forEach(name => {
    regionEls[name].addEventListener('mouseenter', () => {
      if (!state.filled.has(name)) fillEls[name].setAttribute('stroke','rgba(255,255,255,0.6)');
    });
    regionEls[name].addEventListener('mouseleave', () => { applyFillStyle(name); });
    regionEls[name].addEventListener('focus', () => {
      if (!state.filled.has(name)) fillEls[name].setAttribute('stroke','rgba(255,255,255,0.6)');
    });
    regionEls[name].addEventListener('blur', () => { applyFillStyle(name); });
  });

  // off-screen summary for assistive tech
  const srSummary = document.createElement('div');
  srSummary.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);';
  srSummary.setAttribute('aria-live','polite');
  wrapper.appendChild(srSummary);

  // ============================================================
  // M6 — RENDER
  // ============================================================
  function applyFillStyle(name){
    if (state.filled.has(name)) {
      fillEls[name].setAttribute('fill','rgba(56,209,197,0.30)');
      fillEls[name].setAttribute('stroke','rgba(56,209,197,0.85)');
      fillEls[name].setAttribute('stroke-dasharray','none');
    } else {
      fillEls[name].setAttribute('fill','transparent');
      fillEls[name].setAttribute('stroke','rgba(255,255,255,0.22)');
      fillEls[name].setAttribute('stroke-dasharray','5 5');
    }
  }

  // region centroid (average of its 3 vertices)
  function centroid(name){
    const vs = REGIONS[name];
    let sx=0, sy=0;
    vs.forEach(v => { sx += P[v][0]; sy += P[v][1]; });
    return [sx/vs.length, sy/vs.length];
  }

  // Draw each surviving hole's harmonic circulation as a loop pulled well inside
  // its own region. Scaling every endpoint toward the region centroid by SHRINK
  // (a) lifts the loop off the black complex edges, and (b) separates the two
  // cycles where they share the diagonal, since T0 and T1 have distinct centroids.
  const SHRINK = 0.40; // fraction of the way from edge toward centroid
  function drawHarmonics(harmonics){
    layerHarm.innerHTML = '';
    harmonics.forEach(({region, h}) => {
      const [gx, gy] = centroid(region);
      h.forEach((coeff, ei) => {
        if (coeff === 0) return;
        const [u,v] = EDGES[ei];
        // coeff +1 => traverse u->v (low->high); -1 => v->u
        const a = (coeff > 0) ? P[u] : P[v];
        const b = (coeff > 0) ? P[v] : P[u];
        // pull both endpoints toward the region centroid
        const ax = a[0] + (gx - a[0]) * SHRINK, ay = a[1] + (gy - a[1]) * SHRINK;
        const bx = b[0] + (gx - b[0]) * SHRINK, by = b[1] + (gy - b[1]) * SHRINK;
        const line = document.createElementNS(SVGNS,'line');
        line.setAttribute('x1',ax); line.setAttribute('y1',ay);
        line.setAttribute('x2',bx); line.setAttribute('y2',by);
        line.setAttribute('stroke','#64b4ff');
        line.setAttribute('stroke-width','2.5');
        line.setAttribute('opacity','0.85');
        line.setAttribute('stroke-linecap','round');
        line.setAttribute('marker-end','url(#scx-arrow)');
        layerHarm.appendChild(line);
      });
    });
  }

  const SUB_TEXT = { 2:'two independent holes', 1:'one independent hole', 0:'no holes — every cycle bounds' };

  function render(){
    const { beta1, harmonics } = recompute();

    // fills + aria-pressed
    Object.keys(REGIONS).forEach(name => {
      applyFillStyle(name);
      const pressed = state.filled.has(name);
      regionEls[name].setAttribute('aria-pressed', pressed ? 'true':'false');
      regionEls[name].setAttribute('aria-label',
        'Triangle region '+name+', '+(pressed?'filled':'open')+'. Activate to '+(pressed?'open':'fill')+'.');
    });

    // harmonic overlay (one circulation per surviving hole)
    drawHarmonics(harmonics);

    // badge
    container.querySelector('#scx-count').textContent = beta1;
    container.querySelector('#scx-badge-sub').textContent = SUB_TEXT[beta1];

    // insight text (neutral; describes the coupling, no architecture names)
    const insight =
      beta1 === 0
        ? 'Both holes are closed. The kernel of <strong>L</strong><sub>1</sub> is now zero-dimensional: '
          + 'there is no stable circulation left for a propagation operator to preserve.'
        : 'There ' + (beta1===1?'is one hole':'are '+beta1+' holes')
          + ', so dim ker <strong>L</strong><sub>1</sub> = ' + beta1 + '. '
          + 'Each surviving circulation lies in the kernel — a feature the propagation leaves untouched. '
          + 'Fill a triangle and watch this number, and a circulation, disappear together.';
    container.querySelector('#scx-insight-text').innerHTML = insight;

    // assistive-tech summary
    srSummary.textContent = beta1 + (beta1===1?' hole':' holes')
      + '; the network can carry ' + beta1 + (beta1===1?' stable feature.':' stable features.');
  }

  render();
});