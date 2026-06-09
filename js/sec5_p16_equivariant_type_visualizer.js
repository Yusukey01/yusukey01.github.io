// sec5_p16_equivariant_type_visualizer.js
// Representation-theory visualizer for ml-16
// "Symmetry and Representation Theory in Machine Learning"
//
// Shows ONE neutral fact: under a single rotation R in SO(3), features of
// different type transform WITHIN their own type only. Left = geometry
// (scalar fixed / vector rotates / ellipsoid reorients); right = the
// block-diagonal matrix rho(R)=rho0+rho1+rho2 whose off-block entries are
// identically zero for every R. No efficiency / no debate / no algorithm names.
//
// Math core (rho2): ell=2 irreducible & absolutely irreducible over R
// (verified Casimir=-6I, commutant dim 1). JS self-tested against NumPy truth.

document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('equivariant_demo');
  if (!container) { console.error('equivariant_demo container not found!'); return; }

  // ============================================================
  // M1 — MATH CORE (verified)
  // ============================================================
  function mat3(a,b,c,d,e,f,g,h,i){ return [a,b,c,d,e,f,g,h,i]; }
  function mul3(A,B){ const C=new Array(9);
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){ let s=0;
      for(let k=0;k<3;k++) s+=A[r*3+k]*B[k*3+c]; C[r*3+c]=s; } return C; }
  function T3(A){ return [A[0],A[3],A[6],A[1],A[4],A[7],A[2],A[5],A[8]]; }
  function Rx(t){const c=Math.cos(t),s=Math.sin(t);return mat3(1,0,0,0,c,-s,0,s,c);}
  function Ry(t){const c=Math.cos(t),s=Math.sin(t);return mat3(c,0,s,0,1,0,-s,0,c);}
  function Rz(t){const c=Math.cos(t),s=Math.sin(t);return mat3(c,-s,0,s,c,0,0,0,1);}
  function R_rpy(roll,pitch,yaw){ return mul3(Rz(yaw), mul3(Ry(pitch), Rx(roll))); }

  const ONB2 = [
    mat3(0.70710678,0,0, 0,-0.70710678,0, 0,0,0),
    mat3(0.40824829,0,0, 0,0.40824829,0, 0,0,-0.81649658),
    mat3(0,0.70710678,0, 0.70710678,0,0, 0,0,0),
    mat3(0,0,0.70710678, 0,0,0, 0.70710678,0,0),
    mat3(0,0,0, 0,0,0.70710678, 0,0.70710678,0),
  ];
  function frob(A,B){ let s=0; for(let k=0;k<9;k++) s+=A[k]*B[k]; return s; }
  function rho1(R){ return [[R[0],R[1],R[2]],[R[3],R[4],R[5]],[R[6],R[7],R[8]]]; }
  function rho2(R){ const Rt=T3(R); const D=[];
    for(let i=0;i<5;i++) D.push(new Array(5));
    for(let j=0;j<5;j++){ const Tj=mul3(R,mul3(ONB2[j],Rt));
      for(let i=0;i<5;i++) D[i][j]=frob(ONB2[i],Tj); } return D; }

  const DEG = d => d*Math.PI/180;
  const S0 = mat3(2,0,0, 0,1,0, 0,0,-3); // fixed tri-axial traceless ellipsoid tensor

  // ============================================================
  // M2 — DOM SKELETON + STYLES (house palette)
  // ============================================================
  container.innerHTML = `
    <div class="eqv-container">
      <div class="eqv-layout">
        <div class="eqv-canvas-area">
          <div class="eqv-instruction" id="eqv-instruction">
            Move the <strong>Roll / Pitch / Yaw</strong> sliders to set the rotation <em>R</em>.
            Watch each type respond to the <em>same</em> rotation in its own way.
          </div>
          <div id="eqv-canvas-wrapper"><div id="eqv-three"></div></div>
          <div class="eqv-legend">
            <div class="eqv-legend-item"><span class="eqv-dot t0"></span> type-0 scalar (fixed)</div>
            <div class="eqv-legend-item"><span class="eqv-dot t1"></span> type-1 vector</div>
            <div class="eqv-legend-item"><span class="eqv-dot t2"></span> type-2 ellipsoid</div>
          </div>
        </div>

        <div class="eqv-panel">
          <div class="eqv-card">
            <div class="eqv-card-head">
              <span class="eqv-card-title">Block-diagonal action &nbsp;&rho;(R) = &rho;<sub>0</sub> &oplus; &rho;<sub>1</sub> &oplus; &rho;<sub>2</sub></span>
              <span class="eqv-card-size">9&times;9</span>
            </div>
            <div class="eqv-grid" id="eqv-grid"></div>
            <div class="eqv-grid-note">off-block entries &equiv; 0 for every R &mdash; types never mix</div>
          </div>

          <div class="eqv-controls">
            <div class="eqv-card-title">Rotation R &isin; SO(3)</div>
            <div class="eqv-slider-row">
              <label>Roll (X)</label>
              <input type="range" id="eqv-roll" min="-180" max="180" step="1" value="0">
              <span id="eqv-roll-v">0&deg;</span>
            </div>
            <div class="eqv-slider-row">
              <label>Pitch (Y)</label>
              <input type="range" id="eqv-pitch" min="-180" max="180" step="1" value="0">
              <span id="eqv-pitch-v">0&deg;</span>
            </div>
            <div class="eqv-slider-row">
              <label>Yaw (Z)</label>
              <input type="range" id="eqv-yaw" min="-180" max="180" step="1" value="0">
              <span id="eqv-yaw-v">0&deg;</span>
            </div>
            <div class="eqv-btn-row">
              <button class="eqv-btn sec" id="eqv-reset">Reset to Identity</button>
              <button class="eqv-btn pri" id="eqv-random">Random Rotation</button>
            </div>
          </div>

          <div class="eqv-insight">
            <span class="eqv-insight-icon">&#9673;</span>
            <span id="eqv-insight-text">At the identity, &rho;(I) is the identity matrix. Rotate R: each diagonal
            block reshuffles inside itself, while the dark region between blocks stays exactly zero.</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .eqv-container{margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e8eaed;}
    .eqv-layout{display:flex;flex-direction:column;gap:20px;}
    @media(min-width:992px){
      .eqv-layout{flex-direction:row;}
      .eqv-canvas-area{flex:1;order:1;}
      .eqv-panel{flex:1;order:2;max-width:480px;}
    }
    .eqv-canvas-area{display:flex;flex-direction:column;
      background:rgba(20,28,40,0.95);padding:15px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
      box-shadow:0 8px 32px rgba(0,0,0,0.3);}
    #eqv-canvas-wrapper{position:relative;width:100%;}
    #eqv-three{width:100%;height:450px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;
      background:linear-gradient(135deg,#0a0f18 0%,#0f1419 100%);}
    .eqv-instruction{text-align:center;margin-bottom:10px;font-size:0.9rem;color:rgba(255,255,255,0.5);}
    .eqv-legend{margin-top:10px;display:flex;gap:16px;font-size:0.8rem;color:rgba(255,255,255,0.65);justify-content:center;flex-wrap:wrap;}
    .eqv-legend-item{display:flex;align-items:center;gap:6px;}
    .eqv-dot{width:12px;height:12px;border-radius:50%;}
    .eqv-dot.t0{background:#9aa5b1;}
    .eqv-dot.t1{background:#42a5f5;}
    .eqv-dot.t2{background:#f39c12;}
    .eqv-panel{background:rgba(20,28,40,0.95);padding:15px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
      box-shadow:0 8px 32px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;}
    .eqv-card{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;margin-bottom:12px;}
    .eqv-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
    .eqv-card-title{font-weight:bold;font-size:0.88rem;color:#64b4ff;}
    .eqv-card-size{font-size:0.72rem;color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:3px;}
    /* 9x9 grid */
    .eqv-grid{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;width:100%;max-width:360px;margin:0 auto;}
    .eqv-cell{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;
      font-family:'Courier New',monospace;font-size:0.5rem;border-radius:2px;overflow:hidden;}
    .eqv-cell.zero{background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.12);}
    .eqv-cell.b0{background:rgba(154,165,177,0.18);color:#cdd5de;}
    .eqv-cell.b1{background:rgba(66,165,245,0.16);color:#9ed0ff;}
    .eqv-cell.b2{background:rgba(243,156,18,0.15);color:#ffcf7a;}
    .eqv-grid-note{text-align:center;font-size:0.72rem;color:rgba(255,255,255,0.5);margin-top:10px;font-style:italic;}
    .eqv-controls{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-bottom:12px;}
    .eqv-slider-row{display:flex;align-items:center;gap:10px;margin-top:8px;}
    .eqv-slider-row label{width:70px;font-size:0.8rem;color:rgba(255,255,255,0.7);}
    .eqv-slider-row input[type=range]{flex:1;}
    .eqv-slider-row span{width:46px;text-align:right;font-family:'Courier New',monospace;font-size:0.8rem;color:#64b4ff;}
    .eqv-btn-row{display:flex;gap:10px;margin-top:12px;}
    .eqv-btn{flex:1;padding:9px 12px;border-radius:6px;font-size:0.82rem;cursor:pointer;transition:all 0.2s;}
    .eqv-btn.sec{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.75);}
    .eqv-btn.sec:hover{background:rgba(255,255,255,0.1);}
    .eqv-btn.pri{background:linear-gradient(135deg,#1565c0,#42a5f5);border:1px solid #64b4ff;color:#fff;}
    .eqv-insight{display:flex;gap:10px;align-items:flex-start;background:linear-gradient(135deg,rgba(66,165,245,0.1),rgba(21,101,192,0.05));
      border:1px solid rgba(66,165,245,0.2);border-radius:8px;padding:11px;font-size:0.8rem;line-height:1.45;color:rgba(255,255,255,0.82);}
    .eqv-insight-icon{color:#64b4ff;font-size:1rem;line-height:1.3;}
  `;
  document.head.appendChild(style);

  // ---- build 9x9 grid cells ----
  // block ranges: type0 [0,1), type1 [1,4), type2 [4,9)
  function blockOf(idx){ if(idx<1) return 0; if(idx<4) return 1; return 2; }
  const grid = container.querySelector('#eqv-grid');
  const cells = [];
  for(let i=0;i<9;i++){ cells.push([]);
    for(let j=0;j<9;j++){
      const d=document.createElement('div');
      const bi=blockOf(i), bj=blockOf(j);
      const onBlock = (bi===bj);
      d.className='eqv-cell '+(onBlock?('b'+bi):'zero');
      d.textContent = onBlock ? '' : '0';
      grid.appendChild(d); cells[i].push(d);
    }
  }

  // ============================================================
  // THREE.JS LOADER (site convention: visualizer loads its own Three.js)
  // r128 core only. Camera is fixed (no OrbitControls): the only thing that
  // moves the scene is R, set by the sliders, so "something moved" always
  // means "R changed" — keeping the geometry <-> matrix correspondence exact.
  // ============================================================
  if (!window.THREE) {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = initThree;
    document.head.appendChild(s);
  } else {
    initThree();
  }

  // ============================================================
  // M3 — THREE.JS SCENE
  // ============================================================
  function initThree() {
  const three = container.querySelector('#eqv-three');
  const W0 = three.clientWidth, H0 = 450;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W0/H0, 0.1, 100);
  camera.position.set(3.2, 2.2, 3.6);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setSize(W0, H0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  three.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff,0.65));
  const dl=new THREE.DirectionalLight(0xffffff,0.7); dl.position.set(4,6,5); scene.add(dl);

  // faint world reference axes
  function axis(dir,color){
    const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:0.22});
    const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),dir.clone().multiplyScalar(2.4)]);
    scene.add(new THREE.Line(g,m));
  }
  axis(new THREE.Vector3(1,0,0),0xff6666);
  axis(new THREE.Vector3(0,1,0),0x66ff99);
  axis(new THREE.Vector3(0,0,1),0x6699ff);

  // type-0 scalar: fixed grey sphere with a constant value (never moves)
  const t0 = new THREE.Mesh(new THREE.SphereGeometry(0.22,24,24),
              new THREE.MeshStandardMaterial({color:0x9aa5b1,roughness:0.5}));
  scene.add(t0);

  // type-1 vector: an arrow, transforms as v -> R v (defining rep)
  const v0 = new THREE.Vector3(0,0,1.6); // base vector along +z
  const t1 = new THREE.ArrowHelper(v0.clone().normalize(), new THREE.Vector3(0,0,0),
              v0.length(), 0x42a5f5, 0.34, 0.20);
  scene.add(t1);

  // type-2 ellipsoid: unit sphere scaled by sqrt(|eigs|) of (R S0 R^T), oriented by R.
  // Visual: a fixed-shape ellipsoid (axes from S0 magnitudes) rigidly rotated by R.
  const eigAbs=[Math.sqrt(2)*0.9, Math.sqrt(1)*0.9, Math.sqrt(3)*0.9]; // visual semi-axes
  const t2 = new THREE.Mesh(new THREE.SphereGeometry(1,40,28),
              new THREE.MeshStandardMaterial({color:0xf39c12,roughness:0.45,
                metalness:0.1,transparent:true,opacity:0.85}));
  t2.scale.set(eigAbs[0],eigAbs[1],eigAbs[2]);
  scene.add(t2);
  // wire overlay for orientation cue
  const t2wire = new THREE.Mesh(new THREE.SphereGeometry(1.001,16,12),
              new THREE.MeshBasicMaterial({color:0xffcf7a,wireframe:true,transparent:true,opacity:0.18}));
  t2wire.scale.copy(t2.scale); scene.add(t2wire);

  // convert row-major 3x3 (our convention) to THREE.Matrix4 (column-major set via .set row-major)
  function toMatrix4(R){
    const m=new THREE.Matrix4();
    m.set(R[0],R[1],R[2],0, R[3],R[4],R[5],0, R[6],R[7],R[8],0, 0,0,0,1);
    return m;
  }

  // ============================================================
  // M4 — STATE + UPDATE WIRING
  // ============================================================
  const state={roll:0,pitch:0,yaw:0};

  function fmt(x){ const s=(x>=0?' ':'-')+Math.abs(x).toFixed(2); return s; }

  function update(){
    const R=R_rpy(DEG(state.roll),DEG(state.pitch),DEG(state.yaw));
    const D1=rho1(R), D2=rho2(R);

    // --- matrix grid: fill on-block entries ---
    // type0 cell (0,0)
    cells[0][0].textContent = '1.00';
    // type1 block rows/cols 1..3
    for(let i=0;i<3;i++)for(let j=0;j<3;j++) cells[1+i][1+j].textContent=fmt(D1[i][j]);
    // type2 block rows/cols 4..8
    for(let i=0;i<5;i++)for(let j=0;j<5;j++) cells[4+i][4+j].textContent=fmt(D2[i][j]);
    // off-block stay '0' (set at build, never touched)

    // --- geometry ---
    const M=toMatrix4(R);
    // type-1 arrow direction = R * v0
    const dir=v0.clone().applyMatrix4(M);
    t1.setDirection(dir.clone().normalize());
    t1.setLength(dir.length(),0.34,0.20);
    // type-2 ellipsoid orientation = R (rigid reorientation of fixed-shape ellipsoid)
    const q=new THREE.Quaternion().setFromRotationMatrix(M);
    t2.quaternion.copy(q); t2wire.quaternion.copy(q);
    // type-0 never moves (no-op) — that is the visual point

    // sliders readout
    container.querySelector('#eqv-roll-v').textContent=state.roll+'\u00B0';
    container.querySelector('#eqv-pitch-v').textContent=state.pitch+'\u00B0';
    container.querySelector('#eqv-yaw-v').textContent=state.yaw+'\u00B0';

    // insight text (neutral)
    const moved = (state.roll||state.pitch||state.yaw);
    container.querySelector('#eqv-insight-text').innerHTML = moved
      ? 'The type-1 and type-2 blocks have reshuffled inside themselves; the type-0 scalar is unchanged; '
        + 'and every entry between blocks is still exactly zero. The same R acts independently on each type.'
      : 'At the identity, &rho;(I) is the identity matrix. Rotate R: each diagonal block reshuffles inside '
        + 'itself, while the dark region between blocks stays exactly zero.';
  }

  // sliders
  const rs=container.querySelector('#eqv-roll'),
        ps=container.querySelector('#eqv-pitch'),
        ys=container.querySelector('#eqv-yaw');
  rs.addEventListener('input',()=>{state.roll=+rs.value;update();});
  ps.addEventListener('input',()=>{state.pitch=+ps.value;update();});
  ys.addEventListener('input',()=>{state.yaw=+ys.value;update();});

  container.querySelector('#eqv-reset').addEventListener('click',()=>{
    state.roll=state.pitch=state.yaw=0; rs.value=ps.value=ys.value=0; update();
  });
  container.querySelector('#eqv-random').addEventListener('click',()=>{
    state.roll=Math.round(Math.random()*360-180);
    state.pitch=Math.round(Math.random()*360-180);
    state.yaw=Math.round(Math.random()*360-180);
    rs.value=state.roll; ps.value=state.pitch; ys.value=state.yaw; update();
  });

  window.addEventListener('resize',()=>{
    const w=three.clientWidth; camera.aspect=w/H0; camera.updateProjectionMatrix();
    renderer.setSize(w,H0);
  });

  (function animate(){
    requestAnimationFrame(animate);
    renderer.render(scene,camera);
  })();

  update();
  } // end initThree
});