// sec5_p17_simplicial_hole_demo.js
// ml-17 "Simplicial Neural Networks" — 3D TORUS hole-counting visualizer.
//
// ONE neutral fact, made vivid: the operator L1 = ∂2∂2^T + ∂1^T∂1 that would
// propagate features across a complex also COUNTS its independent holes,
// dim ker L1 = β1. On a torus this is something the eye cannot do: even when
// every cell is filled and there is no visible gap, β1 = 2 — the two
// independent loops (around the central hole, and around the tube). Toggling
// cells open/closed changes β1, computed two independent ways (integer rank of
// the boundary maps; near-zero eigenvalues of L1), shown live.
//
// House rules: algorithm-agnostic, no architecture names, no efficiency claims.
// Math core verified by randomized testing (β1 === dim ker L1) and chain-complex
// consistency (∂1∘∂2 = 0) including the wrap (periodic) edges. Integer-rank β1
// drives the UI; eigenvalue route is the independent self-test cross-check.
//
// Orientation (NORMATIVE): each edge has an intrinsic tail->head direction as
// generated (right: (i,j)->(i,j+1); down: (i,j)->(i+1,j)), indices mod N. d1 has
// -1 at tail, +1 at head. d2 column sign = +1 if the cell's CCW loop traverses
// the edge tail->head, else -1. Verified ∂1∘∂2 = 0.

document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('simplicial_demo');
  if (!container) { console.error('simplicial_demo container not found!'); return; }
  if (container.dataset.init === '1') return;
  container.dataset.init = '1';

  // ============================================================
  // M1 — MATH CORE (torus; verified)
  // ============================================================
  const N = 3;
  const NV = N*N;
  const vIdx = (i,j) => ((i%N+N)%N)*N + ((j%N+N)%N);

  function buildEdges(){
    const list=[];
    function add(ti,tj,hi,hj){ list.push({tail:vIdx(ti,tj), head:vIdx(hi,hj)}); }
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){ add(i,j, i,j+1); add(i,j, i+1,j); }
    function findDirected(fromV,toV){
      for(let e=0;e<list.length;e++){
        if(list[e].tail===fromV && list[e].head===toV) return {e, sign:+1};
        if(list[e].tail===toV && list[e].head===fromV) return {e, sign:-1};
      }
      return null;
    }
    return {list, findDirected};
  }
  const EDGES = buildEdges();
  const NE = EDGES.list.length;

  function buildCells(){
    const cells=[];
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){
      cells.push({ id:`C_${i}_${j}`, cell:[i,j],
        loop:[ [vIdx(i,j),    vIdx(i,j+1)],
               [vIdx(i,j+1),  vIdx(i+1,j+1)],
               [vIdx(i+1,j+1),vIdx(i+1,j)],
               [vIdx(i+1,j),  vIdx(i,j)] ] });
    }
    return cells;
  }
  const CELLS = buildCells();
  const NC = CELLS.length;

  function d1(){
    const M=Array.from({length:NV},()=>new Array(NE).fill(0));
    EDGES.list.forEach((e,idx)=>{ M[e.tail][idx]=-1; M[e.head][idx]=+1; });
    return M;
  }
  function d2(filledIds){
    const cols=[];
    filledIds.forEach(id=>{
      const c=CELLS.find(x=>x.id===id);
      const col=new Array(NE).fill(0);
      c.loop.forEach(([from,to])=>{ const d=EDGES.findDirected(from,to); col[d.e]+=d.sign; });
      cols.push(col);
    });
    const k=cols.length;
    const M=Array.from({length:NE},()=>new Array(k).fill(0));
    for(let j=0;j<k;j++)for(let e=0;e<NE;e++)M[e][j]=cols[j][e];
    return M;
  }
  function transpose(M){const r=M.length,c=M[0]?M[0].length:0;
    const T=Array.from({length:c},()=>new Array(r).fill(0));
    for(let i=0;i<r;i++)for(let j=0;j<c;j++)T[j][i]=M[i][j];return T;}
  function matmul(A,B){const r=A.length,n=A[0].length,c=B[0].length;
    const C=Array.from({length:r},()=>new Array(c).fill(0));
    for(let i=0;i<r;i++)for(let k=0;k<n;k++){const a=A[i][k];if(a===0)continue;
      for(let j=0;j<c;j++)C[i][j]+=a*B[k][j];}return C;}
  function matadd(A,B){return A.map((row,i)=>row.map((x,j)=>x+B[i][j]));}
  function rankInteger(Min){
    const M=Min.map(r=>r.slice());const rows=M.length,cols=M[0]?M[0].length:0;
    if(cols===0||rows===0)return 0;let rank=0;
    for(let col=0;col<cols&&rank<rows;col++){
      let piv=-1;for(let r=rank;r<rows;r++){if(M[r][col]!==0){piv=r;break;}}
      if(piv===-1)continue;
      const tmp=M[rank];M[rank]=M[piv];M[piv]=tmp;const pv=M[rank][col];
      for(let r=0;r<rows;r++){if(r===rank)continue;const f=M[r][col];if(f===0)continue;
        for(let c=0;c<cols;c++)M[r][c]=pv*M[r][c]-f*M[rank][c];}
      rank++;
    }
    return rank;
  }
  function hodgeL1(filledIds){
    const D1=d1(),D2=d2(filledIds);
    const t2=matmul(transpose(D1),D1);
    let t1; if(D2[0].length===0)t1=Array.from({length:NE},()=>new Array(NE).fill(0));
    else t1=matmul(D2,transpose(D2));
    return matadd(t1,t2);
  }
  const RANK_D1=rankInteger(d1());
  function betti1(filledIds){
    const D2=d2(filledIds);
    const rD2=(D2[0]&&D2[0].length>0)?rankInteger(D2):0;
    return (NE-RANK_D1)-rD2;
  }
  function jacobiEig(Ain){
    const n=Ain.length,A=Ain.map(r=>r.slice());
    for(let sweep=0;sweep<200;sweep++){let off=0;
      for(let p=0;p<n-1;p++)for(let q=p+1;q<n;q++){const apq=A[p][q];
        if(Math.abs(apq)<1e-14)continue;off+=apq*apq;
        const app=A[p][p],aqq=A[q][q],phi=0.5*Math.atan2(2*apq,aqq-app),c=Math.cos(phi),s=Math.sin(phi);
        for(let k=0;k<n;k++){const akp=A[k][p],akq=A[k][q];A[k][p]=c*akp-s*akq;A[k][q]=s*akp+c*akq;}
        for(let k=0;k<n;k++){const apk=A[p][k],aqk=A[q][k];A[p][k]=c*apk-s*aqk;A[q][k]=s*apk+c*aqk;}}
      if(off<1e-18)break;}
    const eig=[];for(let i=0;i<n;i++)eig.push(A[i][i]);eig.sort((a,b)=>a-b);return eig;
  }
  function dimKerL1(filledIds){
    const eig=jacobiEig(hodgeL1(filledIds));
    const s=Math.max(1,Math.max(...eig.map(Math.abs)));
    return eig.filter(l=>Math.abs(l)<1e-7*s).length;
  }

  function selfTest(){
    const all=CELLS.map(c=>c.id);
    const P=matmul(d1(),d2(all));
    if(!P.every(r=>r.every(x=>x===0))){ console.error('torus demo: d1∘d2≠0'); return false; }
    if(betti1(all)!==2 || dimKerL1(all)!==2){ console.error('torus demo: full β1≠2'); return false; }
    for(let t=0;t<40;t++){
      const f=all.filter(()=>Math.random()<0.6);
      if(betti1(f)!==dimKerL1(f)){ console.error('torus demo: β1≠dimKer'); return false; }
    }
    return true;
  }
  if(!selfTest()){
    container.innerHTML='<div style="padding:16px;color:#ff8a80;font-family:sans-serif;">'
      +'Demo failed its internal consistency check and was not rendered.</div>';
    return;
  }

  // ============================================================
  // M2 — STATE (start FULLY FILLED: β1 = 2 with no visible gap — the hook)
  // ============================================================
  const state = { filled: new Set(CELLS.map(c=>c.id)) };
  function recompute(){
    const f=Array.from(state.filled);
    return { beta1: betti1(f), dimKer: dimKerL1(f), nFilled: f.length };
  }
  function toggle(id){
    if(state.filled.has(id)) state.filled.delete(id); else state.filled.add(id);
    if(window.__torusRender) window.__torusRender();
  }

  // ============================================================
  // M3 — DOM SKELETON + STYLES
  // ============================================================
  container.innerHTML = `
    <div class="tx-container tex2jax_ignore mathjax_ignore">
      <div class="tx-layout">
        <div class="tx-canvas-area">
          <div class="tx-instruction">
            Drag to rotate. Click a cell to <strong>open</strong> it (remove the 2-cell)
            or <strong>fill</strong> it again. The count on the right updates live.
          </div>
          <div id="tx-three"></div>
          <div class="tx-legend">
            <div class="tx-legend-item"><span class="tx-swatch filled"></span> filled cell (2-cell present)</div>
            <div class="tx-legend-item"><span class="tx-swatch open"></span> open cell (a hole)</div>
          </div>
        </div>
        <div class="tx-panel">
          <div class="tx-badge-card">
            <div class="tx-badge-label">independent loops &nbsp;=&nbsp; stable features the network can carry</div>
            <div class="tx-badge" aria-live="polite">
              &beta;<sub>1</sub> = dim ker <strong>L</strong><sub>1</sub> = <span id="tx-count">2</span>
            </div>
            <div class="tx-badge-sub" id="tx-badge-sub">two independent loops</div>
          </div>
          <div class="tx-insight">
            <span class="tx-insight-icon">&#9673;</span>
            <span id="tx-insight-text"></span>
          </div>
        </div>
      </div>
    </div>`;

  const style=document.createElement('style');
  style.textContent=`
    .tx-container{margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#e8eaed;}
    .tx-layout{display:flex;flex-direction:column;gap:20px;}
    @media(min-width:992px){.tx-layout{flex-direction:row;}.tx-canvas-area{flex:1.2;}.tx-panel{flex:1;max-width:430px;}}
    .tx-canvas-area{display:flex;flex-direction:column;background:rgba(20,28,40,0.95);padding:15px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px rgba(0,0,0,0.3);}
    #tx-three{position:relative;width:100%;height:450px;background:radial-gradient(ellipse at 50% 40%,#0f1722 0%,#0a0f18 100%);border:1px solid rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;cursor:grab;touch-action:none;}
    #tx-three:active{cursor:grabbing;}
    #tx-three canvas{display:block;}
    .tx-instruction{text-align:center;margin-bottom:10px;font-size:0.9rem;color:rgba(255,255,255,0.5);}
    .tx-legend{margin-top:10px;display:flex;gap:16px;font-size:0.8rem;color:rgba(255,255,255,0.65);justify-content:center;flex-wrap:wrap;}
    .tx-legend-item{display:flex;align-items:center;gap:6px;}
    .tx-swatch{width:14px;height:14px;border-radius:3px;display:inline-block;}
    .tx-swatch.filled{background:rgba(56,209,197,0.55);border:1px solid rgba(56,209,197,0.9);}
    .tx-swatch.open{background:transparent;border:1px dashed rgba(255,255,255,0.5);}
    .tx-panel{background:rgba(20,28,40,0.95);padding:15px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px rgba(0,0,0,0.3);}
    .tx-badge-card{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:16px;margin-bottom:12px;text-align:center;}
    .tx-badge-label{font-size:0.74rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;}
    .tx-badge{font-size:1.5rem;color:#64b4ff;font-weight:bold;line-height:1.3;}
    .tx-badge #tx-count{font-size:1.9rem;color:#fff;}
    .tx-badge-sub{margin-top:8px;font-size:0.85rem;color:rgba(255,255,255,0.6);}
    .tx-insight{display:flex;gap:10px;align-items:flex-start;background:linear-gradient(135deg,rgba(66,165,245,0.1),rgba(21,101,192,0.05));border:1px solid rgba(66,165,245,0.2);border-radius:8px;padding:11px;font-size:0.8rem;line-height:1.45;color:rgba(255,255,255,0.82);}
    .tx-insight-icon{color:#64b4ff;font-size:1rem;line-height:1.3;}
  `;
  document.head.appendChild(style);

  // ============================================================
  // M4 — THREE.JS (site convention: load r128 from CDN if absent)
  // ============================================================
  if(!window.THREE){
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload=initThree;
    document.head.appendChild(s);
  } else initThree();

  function initThree(){
    const host=container.querySelector('#tx-three');
    const W=host.clientWidth||700, H=450;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
    camera.position.set(0, -4.6, 3.0);
    camera.lookAt(0,0,0);
    const renderer=new THREE.WebGLRenderer({antialias:true, alpha:true});
    renderer.setSize(W,H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff,0.6));
    const dl=new THREE.DirectionalLight(0xffffff,0.75); dl.position.set(3,-4,6); scene.add(dl);
    const dl2=new THREE.DirectionalLight(0x88bbff,0.3); dl2.position.set(-4,2,-3); scene.add(dl2);

    const world=new THREE.Group(); scene.add(world);
    world.rotation.x=-1.15; // tilt so the central hole is clearly visible from the start

    const R=1.6, r=0.62, SUB=8;
    function torusPoint(theta,phi){
      const ct=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(phi),sp=Math.sin(phi);
      return new THREE.Vector3((R+r*cp)*ct,(R+r*cp)*st,r*sp);
    }

    const cellMeshes={};
    CELLS.forEach(c=>{
      const [i,j]=c.cell;
      const th0=2*Math.PI*i/N, th1=2*Math.PI*(i+1)/N;
      const ph0=2*Math.PI*j/N, ph1=2*Math.PI*(j+1)/N;
      const positions=[], indices=[];
      for(let a=0;a<=SUB;a++)for(let b=0;b<=SUB;b++){
        const th=th0+(th1-th0)*a/SUB, ph=ph0+(ph1-ph0)*b/SUB;
        const p=torusPoint(th,ph); positions.push(p.x,p.y,p.z);
      }
      const row=SUB+1;
      for(let a=0;a<SUB;a++)for(let b=0;b<SUB;b++){
        const v00=a*row+b, v01=a*row+b+1, v10=(a+1)*row+b, v11=(a+1)*row+b+1;
        indices.push(v00,v10,v11, v00,v11,v01);
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geo.setIndex(indices); geo.computeVertexNormals();
      const mat=new THREE.MeshStandardMaterial({
        color:0x38d1c5, roughness:0.45, metalness:0.05,
        transparent:true, opacity:0.92, side:THREE.DoubleSide,
        emissive:0x0a3d39, emissiveIntensity:0.4 });
      const mesh=new THREE.Mesh(geo,mat);
      mesh.userData.cellId=c.id;
      world.add(mesh);

      const bpos=[];
      function edge(thA,phA,thB,phB){
        for(let t=0;t<=SUB;t++){
          const p=torusPoint(thA+(thB-thA)*t/SUB, phA+(phB-phA)*t/SUB);
          bpos.push(p.x,p.y,p.z);
        }
      }
      edge(th0,ph0, th0,ph1); edge(th0,ph1, th1,ph1);
      edge(th1,ph1, th1,ph0); edge(th1,ph0, th0,ph0);
      const bgeo=new THREE.BufferGeometry();
      bgeo.setAttribute('position',new THREE.Float32BufferAttribute(bpos,3));
      const bmat=new THREE.LineBasicMaterial({color:0xbfe9e4,transparent:true,opacity:0.5});
      const wire=new THREE.Line(bgeo,bmat);
      world.add(wire);

      cellMeshes[c.id]={mesh,wire};
    });

    function renderState(){
      const {beta1,nFilled}=recompute();
      CELLS.forEach(c=>{
        const cm=cellMeshes[c.id];
        const isFilled=state.filled.has(c.id);
        cm.mesh.visible=isFilled;
        cm.wire.material.opacity=isFilled?0.5:0.95;
        cm.wire.material.color.setHex(isFilled?0xbfe9e4:0xffd479);
      });
      const cnt=container.querySelector('#tx-count'); if(cnt)cnt.textContent=beta1;
      const sub=container.querySelector('#tx-badge-sub');
      if(sub) sub.textContent = beta1===2?'two independent loops':(beta1===1?'one independent loop':beta1+' independent loops');
      const ins=container.querySelector('#tx-insight-text');
      if(ins){
        ins.innerHTML = (nFilled===NC)
          ? 'Every cell is filled, yet &beta;<sub>1</sub> = 2. No gap is visible, but two independent '
            + 'loops cannot be contracted \u2014 the torus\u2019 two handles. Open a cell and watch the count move.'
          : 'There ' + (beta1===1?'is one independent loop':'are '+beta1+' independent loops')
            + ', so dim ker <strong>L</strong><sub>1</sub> = ' + beta1 + '. Opening a cell changes which '
            + 'cycles bound and which survive; the count tracks it exactly.';
      }
    }
    window.__torusRender=renderState;
    renderState();

    let dragging=false, lastX=0, lastY=0, moved=0;
    host.addEventListener('pointerdown',e=>{dragging=true;moved=0;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);});
    host.addEventListener('pointermove',e=>{
      if(!dragging)return;
      const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX;lastY=e.clientY;
      moved+=Math.abs(dx)+Math.abs(dy);
      world.rotation.z += dx*0.01;
      world.rotation.x += dy*0.01;
    });
    host.addEventListener('pointerup',e=>{ dragging=false; if(moved<5) pick(e); });

    const raycaster=new THREE.Raycaster(), mouse=new THREE.Vector2();
    function pick(e){
      const rect=host.getBoundingClientRect();
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(mouse,camera);
      const targets=CELLS.map(c=>cellMeshes[c.id].mesh);
      const prevVis=targets.map(m=>m.visible);
      targets.forEach(m=>m.visible=true);
      const hits=raycaster.intersectObjects(targets,false);
      targets.forEach((m,k)=>m.visible=prevVis[k]);
      if(hits.length){ toggle(hits[0].object.userData.cellId); }
    }

    (function loop(){ requestAnimationFrame(loop); renderer.render(scene,camera); })();

    window.addEventListener('resize',()=>{
      const w=host.clientWidth||W; renderer.setSize(w,H); camera.aspect=w/H; camera.updateProjectionMatrix();
    });
  }
});