// sec5_p12_vae_uncertainty.js  v8.0
// VAE Uncertainty in Robotic Manipulation — MATH-CS COMPASS
// Lateral side-clamp: Π-gripper fingers vertical, clamp ±X box faces
// PRE_LIFT safety assessment → LIFT_OK or ABORT
// Offset parenting with epsilon gap to prevent mesh clipping

document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('simulation-container');
    if (!container) { console.error('[VAE v8] #simulation-container not found'); return; }

    // ========== HTML ==========
    container.innerHTML = [
      '<div class="vr"><div class="vl">',
      '<div class="vv">',
        '<div class="vtb"><span class="vtt">PHYSICAL AI — VAE Uncertainty Simulation</span><span class="vth">Orbit: drag · Zoom: scroll · Pan: right-drag</span></div>',
        '<div class="vcw" id="vcw"><div id="vm"></div>',
          '<div class="vhb" id="vhb">STATE: IDLE</div>',
          '<div class="vco" id="vco"><div class="vci">\u26A0</div><div class="vct">CRITICAL UNCERTAINTY</div><div class="vcd" id="vcd">ABORTING LIFT</div></div>',
        '</div>',
        '<div class="vlg">',
          '<span class="vli"><i class="vd vda"></i>Primary Arm</span>',
          '<span class="vli"><i class="vd vdg"></i>Ghost Arms (\u03C3)</span>',
          '<span class="vli"><i class="vd vdc"></i>Center of Mass</span>',
          '<span class="vli"><i class="vd vdt"></i>Torque Vector</span>',
        '</div>',
      '</div>',
      '<div class="vp">',
        '<div class="vc"><div class="vch">VAE Latent Space <em>q(z|x)</em></div><div class="vcs">Posterior from torque feedback</div><div class="vlw"><canvas id="lcv" width="260" height="260"></canvas></div>',
          '<div class="vr2"><span class="vrl">\u03BC</span><span class="vrv" id="dmu">(0.00, 0.00)</span></div>',
          '<div class="vr2"><span class="vrl">\u03C3</span><span class="vrv" id="dsig">0.000</span></div>',
          '<div class="vr2 vrh"><span class="vrl">KL(q\u2016p)</span><span class="vrv" id="dkl">0.000</span></div>',
        '</div>',
        '<div class="vc"><div class="vch">Physics Telemetry</div><div class="vtg">',
          '<div class="vte"><span class="vtl">Torque \u03C4</span><span class="vtv" id="dtau">(0, 0, 0)</span></div>',
          '<div class="vte"><span class="vtl">|\u0394\u03C4|</span><span class="vtv" id="ddt">0.000</span></div>',
          '<div class="vte"><span class="vtl">Tilt (\u00B0)</span><span class="vtv" id="dtlt">(0.0, 0.0)</span></div>',
          '<div class="vte"><span class="vtl">Grip Force</span><span class="vtv" id="dgf">0.0 N</span></div>',
        '</div></div>',
        '<div class="vc"><div class="vch">Center of Mass Offset</div><div class="vcs">From box geometric center</div>',
          '<div class="vsr"><label>CoM X</label><input type="range" id="scx" min="-8" max="8" step="0.5" value="3"><span id="dcx">3.0</span></div>',
          '<div class="vsr"><label>CoM Y</label><input type="range" id="scz" min="-8" max="8" step="0.5" value="2"><span id="dcz">2.0</span></div>',
          '<div class="vsr"><label>CoM Z</label><input type="range" id="scy" min="-12" max="0" step="0.5" value="-5"><span id="dcy">-5.0</span></div>',
        '</div>',
        '<div class="vc"><div class="vch">Simulation Parameters</div>',
          '<div class="vsr"><label>Box Mass</label><input type="range" id="sma" min="1" max="20" step="0.5" value="8"><span id="dma">8.0 kg</span></div>',
          '<div class="vsr"><label>\u03C3 Threshold</label><input type="range" id="sth" min="0.5" max="3.0" step="0.1" value="1.8"><span id="dth">1.80</span></div>',
          '<div class="vsr"><label>Damping C_d</label><input type="range" id="sdp" min="10" max="50" step="1" value="28"><span id="ddp">28</span></div>',
        '</div>',
        '<div class="vbr"><button class="vb vbg" id="bgo">\u25B6 Execute Sequence</button><button class="vb vbs" id="brs">\u21BA Reset</button></div>',
        '<div class="vsf"><div class="vsfl">Uncertainty \u03C3</div><div class="vsft"><div class="vsfb" id="sfb"></div><div class="vsfm" id="sfm"></div></div><div class="vsfn"><span>0</span><span class="vsfc" id="sfc">0.00</span><span>3.0</span></div></div>',
      '</div>',
      '</div></div>'
    ].join('');

    // ========== CSS ==========
    var sty = document.createElement('style');
    sty.textContent = [
'.vr{width:100%;font-family:"JetBrains Mono","Fira Code","SF Mono",monospace;color:#e8ecf1;background:#060810;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.05)}',
'.vl{display:flex;min-height:720px}',
'@media(max-width:1100px){.vl{flex-direction:column}}',
'.vv{flex:1 1 62%;display:flex;flex-direction:column;background:#060810}',
'.vtb{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.05)}',
'.vtt{font-size:.72rem;font-weight:700;color:#ffa726;letter-spacing:.06em}',
'.vth{font-size:.58rem;color:rgba(255,255,255,.24)}',
'.vcw{flex:1;position:relative;min-height:520px}',
'#vm{position:absolute;inset:0}#vm canvas{display:block;width:100%!important;height:100%!important}',
'.vhb{position:absolute;top:10px;left:10px;padding:5px 16px;border-radius:4px;font-size:.64rem;font-weight:800;letter-spacing:.14em;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.1);color:#64b4ff;backdrop-filter:blur(8px);z-index:10;pointer-events:none;transition:all .3s}',
'.vhb.sl{color:#ffa726;border-color:rgba(255,167,38,.4);box-shadow:0 0 20px rgba(255,167,38,.15)}',
'.vhb.sp{color:#26c6da;border-color:rgba(38,198,218,.4);box-shadow:0 0 20px rgba(38,198,218,.15)}',
'.vhb.sc{color:#ff5252;border-color:rgba(255,82,82,.5);box-shadow:0 0 24px rgba(255,82,82,.22);animation:vbp .5s ease-in-out infinite alternate}',
'.vhb.ss{color:#69f0ae;border-color:rgba(105,240,174,.4);box-shadow:0 0 20px rgba(105,240,174,.15)}',
'@keyframes vbp{from{opacity:.6}to{opacity:1}}',
'.vco{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(140,10,10,.14);backdrop-filter:blur(3px);z-index:20;pointer-events:none;opacity:0;transition:opacity .4s}',
'.vco.on{opacity:1}',
'.vci{font-size:3.4rem;color:#ff5252;animation:vcp .65s ease-in-out infinite alternate}',
'@keyframes vcp{from{transform:scale(1);opacity:.5}to{transform:scale(1.15);opacity:1}}',
'.vct{font-size:1.2rem;font-weight:800;color:#ff5252;letter-spacing:.16em;margin-top:5px}',
'.vcd{font-size:.68rem;color:rgba(255,82,82,.7);margin-top:3px}',
'.vlg{display:flex;gap:16px;padding:7px 14px;background:rgba(0,0,0,.3);border-top:1px solid rgba(255,255,255,.04);flex-wrap:wrap}',
'.vli{display:flex;align-items:center;gap:5px;font-size:.6rem;color:rgba(255,255,255,.38)}',
'.vd{display:inline-block;width:8px;height:8px;border-radius:2px}',
'.vda{background:#8a9aaa}.vdg{background:rgba(255,167,38,.5)}.vdc{background:#ff5252}.vdt{background:#69f0ae}',
'.vp{flex:0 0 330px;max-width:330px;display:flex;flex-direction:column;gap:8px;padding:10px;background:rgba(10,14,22,.97);border-left:1px solid rgba(255,255,255,.04);overflow-y:auto;max-height:810px}',
'@media(max-width:1100px){.vp{flex:none;max-width:none;max-height:none;border-left:none;border-top:1px solid rgba(255,255,255,.04);display:grid;grid-template-columns:1fr 1fr;gap:8px}}',
'.vc{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.055);border-radius:8px;padding:10px 12px}',
'.vch{font-weight:700;font-size:.76rem;color:rgba(255,255,255,.8);margin-bottom:1px}.vch em{font-style:normal;color:#ffa726}',
'.vcs{font-size:.58rem;color:rgba(255,255,255,.28);margin-bottom:7px}',
'.vlw{display:flex;justify-content:center;margin:5px 0}',
'#lcv{border-radius:6px;border:1px solid rgba(255,255,255,.06);background:#040608}',
'.vr2{display:flex;justify-content:space-between;font-size:.7rem;padding:1px 0}',
'.vrl{color:rgba(255,255,255,.35)}.vrv{font-family:"JetBrains Mono",monospace;color:#64b4ff}.vrh .vrv{color:#ffa726}',
'.vtg{display:grid;grid-template-columns:1fr 1fr;gap:5px}',
'.vte{background:rgba(0,0,0,.25);border-radius:4px;padding:5px 7px}',
'.vtl{display:block;font-size:.54rem;color:rgba(255,255,255,.3);margin-bottom:1px}',
'.vtv{font-size:.68rem;color:#69f0ae;font-family:"JetBrains Mono",monospace}',
'.vsr{display:flex;align-items:center;gap:7px;margin-bottom:4px}',
'.vsr label{width:72px;font-size:.66rem;color:rgba(255,255,255,.42);flex-shrink:0}',
'.vsr input[type=range]{flex:1;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.06);height:5px;border-radius:3px;cursor:pointer;outline:none}',
'.vsr input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:#ef6c00;border-radius:50%;cursor:pointer;transition:transform .12s}',
'.vsr input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.3)}',
'.vsr input[type=range]::-moz-range-thumb{width:13px;height:13px;background:#ef6c00;border-radius:50%;border:none;cursor:pointer}',
'.vsr span{width:52px;text-align:right;font-size:.66rem;color:#ffa726;font-family:"JetBrains Mono",monospace;flex-shrink:0}',
'.vbr{display:flex;gap:7px}',
'.vb{flex:1;padding:10px;border:none;border-radius:6px;font-weight:700;font-family:inherit;font-size:.74rem;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:5px}',
'.vbg{background:linear-gradient(135deg,#ef6c00,#ff9800);color:#fff}',
'.vbg:hover{box-shadow:0 4px 18px rgba(239,108,0,.3);transform:translateY(-1px)}',
'.vbg:disabled{opacity:.32;cursor:not-allowed;transform:none;box-shadow:none}',
'.vbs{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6)}',
'.vbs:hover{background:rgba(255,255,255,.09);color:#fff}',
'.vsf{padding:6px 0}.vsfl{font-size:.6rem;color:rgba(255,255,255,.32);margin-bottom:3px}',
'.vsft{position:relative;height:7px;background:rgba(255,255,255,.04);border-radius:4px;overflow:visible}',
'.vsfb{height:100%;border-radius:4px;background:linear-gradient(90deg,#69f0ae,#ffa726,#ff5252);width:0%;transition:width .12s}',
'.vsfm{position:absolute;top:-3px;width:2px;height:13px;background:#ff5252;border-radius:1px;left:60%;transition:left .12s}',
'.vsfn{display:flex;justify-content:space-between;font-size:.54rem;color:rgba(255,255,255,.22);margin-top:2px}',
'.vsfc{color:#ffa726;font-weight:700}'
    ].join('\n');
    document.head.appendChild(sty);

    // ========== LOAD THREE.JS ==========
    if (!window.THREE) {
        var scr = document.createElement('script');
        scr.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        scr.onload = function () {
            var oc = document.createElement('script');
            oc.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
            oc.onload = boot; document.head.appendChild(oc);
        }; document.head.appendChild(scr);
    } else if (!THREE.OrbitControls) {
        var oc2 = document.createElement('script');
        oc2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        oc2.onload = boot; document.head.appendChild(oc2);
    } else { boot(); }

    function boot() {
        if (!window.THREE || !THREE.OrbitControls) { setTimeout(boot, 80); return; }

        // === DOM ===
        var mt=document.getElementById('vm'),badge=document.getElementById('vhb'),
            critO=document.getElementById('vco'),critD=document.getElementById('vcd'),
            lcv=document.getElementById('lcv'),lx=lcv.getContext('2d');
        var $mu=document.getElementById('dmu'),$si=document.getElementById('dsig'),
            $kl=document.getElementById('dkl'),$ta=document.getElementById('dtau'),
            $dt=document.getElementById('ddt'),$ti=document.getElementById('dtlt'),
            $gf=document.getElementById('dgf'),$fb=document.getElementById('sfb'),
            $fm=document.getElementById('sfm'),$fc=document.getElementById('sfc');
        var bGo=document.getElementById('bgo'),bRs=document.getElementById('brs');

        // === CONSTANTS ===
        var BW=20,BH=30,BD=20;               // box 20×30×20
        var BP=new THREE.Vector3(32,0,0);     // box at (32,0,0)
        var L1=24,L2=22;                      // arm link lengths
        var LR=2.0,JR=2.5;                   // link/joint radii
        var FL=22,FW=2.5,FD=16;              // finger: 22 tall (vertical), 2.5 thick (X), 16 deep (Z)
        var BRK_H=2.5;                        // bracket bar height
        var SP_OPEN=BW+20;                    // open spread: fingers clear box width + 20
        var SP_CLOSED=BW+FW;                  // closed: fingers just touching ±X faces
        var SP_GRIP=BW+1.0;                   // contact: slight compression at ±10.5
        var EPS_GAP=1.0;                      // vertical clearance above box top
        var NG=5;                             // ghost arm count
        var PRE_LIFT_H=5;                     // test lift height
        var PRE_LIFT_WAIT=0.5;                // σ assessment duration

        // v8: Wrist Y so fingers' vertical center = box center (BH/2=15)
        // fingerCenterY = wristY - BRK_H/2 - FL/2 => wristY = BH/2 + BRK_H/2 + FL/2 = 27.25
        var GRASP_WRIST_Y = BH/2 + BRK_H/2 + FL/2;

        // === STATES ===
        var ST={IDLE:0,APPROACH:1,DESCEND:2,GRASP:3,PRE_LIFT:4,LIFT_OK:5,ABORT:6};
        var STN=['IDLE','APPROACH','DESCEND','GRASP','PRE_LIFT','LIFT_OK','ABORT'];
        var state=ST.IDLE,stT=0,running=false;

        // === PHYSICS ===
        var P={I:4.5,Cd:28,mass:8,g:9.81,
            com:new THREE.Vector3(3,-5,2),
            tau:new THREE.Vector3(),av:new THREE.Vector3(),
            tQ:new THREE.Quaternion(),gF:0,lH:0,det:false};

        // === VAE ===
        var V={mu:[0,0],sig:0,kl:0,hist:[],eps:[],thr:1.8,alp:0.92};
        for(var i=0;i<NG;i++)V.eps.push({x:0,y:0});

        // IK target + grip
        var eeT=new THREE.Vector3(8,46,0);
        var gSp=SP_OPEN;
        var boxAttached=false;
        var boxGripOff=new THREE.Vector3(); // wrist-to-box-origin offset

        // Key positions
        var HOME=new THREE.Vector3(8,46,0);
        var HOVER=new THREE.Vector3(BP.x, GRASP_WRIST_Y+22, BP.z);  // well above grasp height
        var BOX_TOP_PT=new THREE.Vector3(BP.x, GRASP_WRIST_Y, BP.z); // wrist at lateral grasp height

        // === THREE.JS SCENE ===
        var W=mt.clientWidth||800,H=Math.max(mt.clientHeight||520,480);
        var scene=new THREE.Scene();
        scene.background=new THREE.Color(0x050710);
        scene.fog=new THREE.FogExp2(0x050710,0.002);
        var cam=new THREE.PerspectiveCamera(46,W/H,0.5,500);
        cam.position.set(60,48,55);
        var ren=new THREE.WebGLRenderer({antialias:true});
        ren.setPixelRatio(Math.min(devicePixelRatio,2));
        ren.setSize(W,H);
        ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;
        ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.15;
        mt.appendChild(ren.domElement);
        var orb=new THREE.OrbitControls(cam,ren.domElement);
        orb.enableDamping=true;orb.dampingFactor=0.07;
        orb.target.set(16,14,0);orb.minDistance=25;orb.maxDistance=170;orb.update();

        // Lights (OLED high-contrast)
        scene.add(new THREE.AmbientLight(0x2a2a44,0.45));
        var dL=new THREE.DirectionalLight(0xffeedd,1.1);
        dL.position.set(30,70,50);dL.castShadow=true;
        dL.shadow.mapSize.set(1024,1024);
        dL.shadow.camera.left=-60;dL.shadow.camera.right=60;
        dL.shadow.camera.top=60;dL.shadow.camera.bottom=-60;
        dL.shadow.camera.near=1;dL.shadow.camera.far=180;scene.add(dL);
        var fL=new THREE.DirectionalLight(0x6680bb,0.28);fL.position.set(-30,25,-25);scene.add(fL);
        var rL=new THREE.PointLight(0xff7700,0.4,140);rL.position.set(-20,50,40);scene.add(rL);
        var bL=new THREE.PointLight(0x2266ff,0.2,100);bL.position.set(40,30,-30);scene.add(bL);

        // Ground
        var gnd=new THREE.Mesh(new THREE.PlaneGeometry(240,240),
            new THREE.MeshStandardMaterial({color:0x10141c,roughness:0.94,metalness:0.06}));
        gnd.rotation.x=-Math.PI/2;gnd.position.y=-0.1;gnd.receiveShadow=true;scene.add(gnd);
        scene.add(new THREE.GridHelper(130,26,0x1c2030,0x141820));

        // === MATERIALS ===
        var mM=new THREE.MeshStandardMaterial({color:0x3e4856,metalness:0.92,roughness:0.18});
        var mJ=new THREE.MeshStandardMaterial({color:0x2e3640,metalness:0.95,roughness:0.14});
        var mG=new THREE.MeshStandardMaterial({color:0x586878,metalness:0.88,roughness:0.2});
        var mBx=new THREE.MeshStandardMaterial({color:0x1e3a6a,transparent:true,opacity:0.38,roughness:0.45,metalness:0.12,side:THREE.DoubleSide});
        var mEd=new THREE.LineBasicMaterial({color:0x4488cc,transparent:true,opacity:0.5});
        var mCm=new THREE.MeshStandardMaterial({color:0xff1a1a,emissive:0xff0808,emissiveIntensity:0.8});
        function gM(){return new THREE.MeshStandardMaterial({color:0xff9800,metalness:0.2,roughness:0.5,transparent:true,opacity:0,depthWrite:false});}

        // === PRIMARY ARM ===
        var arm=new THREE.Group();scene.add(arm);
        // Base
        var ped=new THREE.Mesh(new THREE.CylinderGeometry(6,7.8,3.5,32),mJ);
        ped.position.set(0,1.75,0);ped.castShadow=true;arm.add(ped);
        var bRng=new THREE.Mesh(new THREE.CylinderGeometry(8,8,0.5,32),mM);
        bRng.position.set(0,0.25,0);bRng.castShadow=true;arm.add(bRng);
        // Shoulder J0
        var j0=new THREE.Mesh(new THREE.SphereGeometry(JR,28,28),mJ);
        j0.position.set(0,3.5,0);j0.castShadow=true;arm.add(j0);
        // Link1
        var l1=new THREE.Mesh(new THREE.CylinderGeometry(LR,LR,1,20),mM);
        l1.castShadow=true;arm.add(l1);
        // Elbow J1
        var j1=new THREE.Mesh(new THREE.SphereGeometry(JR,28,28),mJ);
        j1.castShadow=true;arm.add(j1);
        // Link2
        var l2=new THREE.Mesh(new THREE.CylinderGeometry(LR*0.85,LR,1,20),mM);
        l2.castShadow=true;arm.add(l2);
        // Wrist J2
        var j2=new THREE.Mesh(new THREE.SphereGeometry(JR*0.75,24,24),mJ);
        j2.castShadow=true;arm.add(j2);

        // Π-GRIPPER v8: lateral side-clamp — bracket spans ±X, fingers hang -Y clamping box ±X faces
        var bar=new THREE.Mesh(new THREE.BoxGeometry(1,BRK_H,FD),mG);
        bar.castShadow=true;arm.add(bar);
        // Left finger (−X side): vertical slab
        var fLm=new THREE.Mesh(new THREE.BoxGeometry(FW,FL,FD),mG);
        fLm.castShadow=true;arm.add(fLm);
        // Right finger (+X side): vertical slab
        var fRm=new THREE.Mesh(new THREE.BoxGeometry(FW,FL,FD),mG);
        fRm.castShadow=true;arm.add(fRm);

        // === GHOST ARMS (5 full clones) ===
        var ghosts=[];
        for(var gi=0;gi<NG;gi++){
            var gg={l1:new THREE.Mesh(new THREE.CylinderGeometry(LR,LR,1,10),gM()),
                j1:new THREE.Mesh(new THREE.SphereGeometry(JR,14,14),gM()),
                l2:new THREE.Mesh(new THREE.CylinderGeometry(LR*0.85,LR,1,10),gM()),
                j2:new THREE.Mesh(new THREE.SphereGeometry(JR*0.75,14,14),gM()),
                bar:new THREE.Mesh(new THREE.BoxGeometry(1,BRK_H,FD),gM()),
                fL:new THREE.Mesh(new THREE.BoxGeometry(FW,FL,FD),gM()),
                fR:new THREE.Mesh(new THREE.BoxGeometry(FW,FL,FD),gM())};
            gg.parts=[gg.l1,gg.j1,gg.l2,gg.j2,gg.bar,gg.fL,gg.fR];
            gg.parts.forEach(function(p){p.visible=false;scene.add(p);});
            ghosts.push(gg);
        }

        // === BOX ===
        var bxG=new THREE.Group();bxG.position.copy(BP);scene.add(bxG);
        var bxM=new THREE.Mesh(new THREE.BoxGeometry(BW,BH,BD),mBx);
        bxM.position.y=BH/2;bxM.castShadow=true;bxG.add(bxM);
        var bxE=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW,BH,BD)),mEd);
        bxE.position.y=BH/2;bxG.add(bxE);
        // CoM
        var cS=new THREE.Mesh(new THREE.SphereGeometry(1.6,22,22),mCm);
        function syncCoM(){cS.position.set(P.com.x,BH/2+P.com.y,P.com.z);}
        syncCoM();bxG.add(cS);
        var cR=new THREE.Mesh(new THREE.RingGeometry(2.2,2.9,32),
            new THREE.MeshBasicMaterial({color:0xff3333,transparent:true,opacity:0.2,side:THREE.DoubleSide}));
        cR.position.copy(cS.position);bxG.add(cR);
        var tArr=null;

        // === IK (2-link analytic) ===
        function solveIK(tgt){
            var bY=3.5;
            var dx=Math.sqrt(tgt.x*tgt.x+tgt.z*tgt.z);
            var dy=tgt.y-bY;
            var d=Math.min(Math.sqrt(dx*dx+dy*dy),L1+L2-0.5);
            var hA=Math.atan2(tgt.z,tgt.x);
            var cE=(d*d-L1*L1-L2*L2)/(2*L1*L2);
            cE=Math.max(-0.999,Math.min(0.999,cE));
            var eA=Math.acos(cE);
            var al=Math.atan2(dy,dx<.001?.001:dx);
            var be=Math.atan2(L2*Math.sin(eA),L1+L2*Math.cos(eA));
            var sA=al+be;
            var eR=L1*Math.cos(sA),eY=L1*Math.sin(sA);
            var wR=eR+L2*Math.cos(sA-eA),wY=eY+L2*Math.sin(sA-eA);
            var ch=Math.cos(hA),sh=Math.sin(hA);
            return{base:new THREE.Vector3(0,bY,0),
                elbow:new THREE.Vector3(eR*ch,bY+eY,eR*sh),
                wrist:new THREE.Vector3(wR*ch,bY+wY,wR*sh)};
        }
        function posC(m,a,b){
            m.position.copy(a.clone().add(b).multiplyScalar(0.5));
            m.scale.set(1,a.distanceTo(b),1);
            m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
        }

        // === POSE: Lateral gripper — bracket spans ±X, fingers hang -Y from ±X ends ===
        function poseArm(ik,sp){
            posC(l1,ik.base,ik.elbow); j1.position.copy(ik.elbow);
            posC(l2,ik.elbow,ik.wrist); j2.position.copy(ik.wrist);
            // Bracket bar spans ±X at wrist level
            bar.position.copy(ik.wrist); bar.scale.x=sp; bar.quaternion.identity();
            // Fingers hang down (−Y) from ±X bracket ends
            var hs=sp/2, fd=BRK_H/2+FL/2;
            fLm.position.set(ik.wrist.x-hs, ik.wrist.y-fd, ik.wrist.z); fLm.quaternion.identity();
            fRm.position.set(ik.wrist.x+hs, ik.wrist.y-fd, ik.wrist.z); fRm.quaternion.identity();
        }
        function poseGh(g,ik,sp,op){
            posC(g.l1,ik.base,ik.elbow); g.j1.position.copy(ik.elbow);
            posC(g.l2,ik.elbow,ik.wrist); g.j2.position.copy(ik.wrist);
            g.bar.position.copy(ik.wrist); g.bar.scale.x=sp; g.bar.quaternion.identity();
            var hs=sp/2,fd=BRK_H/2+FL/2;
            g.fL.position.set(ik.wrist.x-hs,ik.wrist.y-fd,ik.wrist.z); g.fL.quaternion.identity();
            g.fR.position.set(ik.wrist.x+hs,ik.wrist.y-fd,ik.wrist.z); g.fR.quaternion.identity();
            g.parts.forEach(function(p){p.visible=true;p.material.opacity=op;});
        }
        function hideGh(g){g.parts.forEach(function(p){p.visible=false;});}

        // === PHYSICS ===
        function calcTau(gripPt){
            var cW=new THREE.Vector3(bxG.position.x+P.com.x, bxG.position.y+BH/2+P.com.y, bxG.position.z+P.com.z);
            return new THREE.Vector3().crossVectors(cW.clone().sub(gripPt),new THREE.Vector3(0,-P.mass*P.g,0));
        }
        function stepPhys(dt){
            if(!P.det)return;
            var alpha=P.tau.clone().sub(P.av.clone().multiplyScalar(P.Cd)).divideScalar(P.I);
            P.av.add(alpha.clone().multiplyScalar(dt));
            var dA=P.av.clone().multiplyScalar(dt*0.008);
            var m=dA.length();
            if(m>1e-7) P.tQ.multiply(new THREE.Quaternion().setFromAxisAngle(dA.clone().normalize(),m)).normalize();
        }

        // === VAE ===
        function stepVAE(tv){
            var tx=tv.x,tz=tv.z,tm=Math.sqrt(tx*tx+tz*tz);
            V.mu[0]=tx*0.07;V.mu[1]=tz*0.07;V.sig=tm*0.011;
            for(var i=0;i<NG;i++){var r=bMu();V.eps[i].x=V.alp*V.eps[i].x+(1-V.alp)*r[0];V.eps[i].y=V.alp*V.eps[i].y+(1-V.alp)*r[1];}
            var s2=V.sig*V.sig+1e-9,m2=V.mu[0]*V.mu[0]+V.mu[1]*V.mu[1];
            V.kl=0.5*(m2+2*s2-2*Math.log(s2)-2);
            V.hist.push([V.mu[0],V.mu[1],V.sig]);if(V.hist.length>250)V.hist.shift();
        }
        function bMu(){var u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();var r=Math.sqrt(-2*Math.log(u)),t=2*Math.PI*v;return[r*Math.cos(t),r*Math.sin(t)];}
        function showTA(tau){
            if(tArr){bxG.remove(tArr);tArr=null;}
            var len=tau.length();if(len<0.05)return;
            var al=Math.min(len*1.8,28);
            tArr=new THREE.ArrowHelper(tau.clone().normalize(),new THREE.Vector3(0,BH,0),al,0x69f0ae,al*0.18,al*0.09);
            bxG.add(tArr);
        }
        function doGhosts(){
            for(var i=0;i<NG;i++){
                var px=V.mu[0]*12+V.sig*V.eps[i].x*18;
                var pz=V.mu[1]*12+V.sig*V.eps[i].y*18;
                var py=V.sig*V.eps[i].x*4;
                var gt=eeT.clone();gt.x+=px;gt.y+=py;gt.z+=pz;
                poseGh(ghosts[i],solveIK(gt),gSp,Math.min(0.24,V.sig*0.15));
            }
        }

        // === LIFT LOGIC: rigid parenting — box locked to wrist ===
        function doLiftFrame(dt){
            var ik=solveIK(eeT);
            // Box position: wrist pos + stored offset
            bxG.position.set(
                ik.wrist.x + boxGripOff.x,
                ik.wrist.y + boxGripOff.y,
                ik.wrist.z + boxGripOff.z
            );
            P.tau=calcTau(ik.wrist);
            stepPhys(dt);
            bxG.quaternion.copy(P.tQ);
            showTA(P.tau.clone().multiplyScalar(0.0015));
            stepVAE(P.tau);
            doGhosts();
        }

        // === STATE MACHINE ===
        function sm(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
        function lr(a,b,t){return a+(b-a)*t;}

        function tickSt(dt){
            stT+=dt;var t=stT;
            switch(state){
            case ST.IDLE:
                eeT.copy(HOME);gSp=SP_OPEN;break;

            case ST.APPROACH:{
                // Home → hover above box
                var d=1.6,s=sm(t/d);
                eeT.set(lr(HOME.x,HOVER.x,s),lr(HOME.y,HOVER.y,s),lr(HOME.z,HOVER.z,s));
                gSp=SP_OPEN;
                if(t>=d)setSt(ST.DESCEND);break;}

            case ST.DESCEND:{
                // Hover → box top, Y-CLAMPED
                var d=1.3,s=sm(t/d);
                var rawY=lr(HOVER.y,BOX_TOP_PT.y,s);
                eeT.set(BP.x, Math.max(rawY,GRASP_WRIST_Y), BP.z); // Y clamp: finger tips at box top
                gSp=SP_OPEN;
                if(t>=d)setSt(ST.GRASP);break;}

            case ST.GRASP:{
                // Fingers slide inward along X: SP_OPEN→SP_GRIP (contact at ±10.5)
                var d=1.0,s=sm(t/d);
                eeT.copy(BOX_TOP_PT);
                var raw=lr(SP_OPEN,SP_GRIP,s);
                gSp=Math.max(raw,SP_GRIP); // never narrower than contact
                P.gF=s*P.mass*P.g*1.6;
                if(t>=d){
                    // Offset parenting: wrist-to-box with epsilon vertical gap
                    var ik=solveIK(eeT);
                    boxGripOff.copy(BP).sub(ik.wrist);
                    boxGripOff.y-=EPS_GAP; // push box down by epsilon to prevent ceiling penetration
                    boxAttached=true;
                    setSt(ST.PRE_LIFT);
                }break;}

            case ST.PRE_LIFT:{
                // Lift 5 units, then assess σ for PRE_LIFT_WAIT
                var liftPhase=Math.min(t,0.4);
                var liftS=sm(liftPhase/0.4);
                P.lH=PRE_LIFT_H*liftS;
                eeT.set(BP.x, GRASP_WRIST_Y+P.lH, BP.z);
                gSp=SP_GRIP;

                if(t>0.12&&!P.det) P.det=true;
                if(P.det) doLiftFrame(dt);

                // Decision after assessment period
                if(t>=0.4+PRE_LIFT_WAIT){
                    if(V.sig>V.thr) setSt(ST.ABORT);
                    else setSt(ST.LIFT_OK);
                }break;}

            case ST.LIFT_OK:{
                // Full lift upward — σ was safe
                var speed=14;
                P.lH=PRE_LIFT_H+speed*t;
                eeT.set(BP.x, GRASP_WRIST_Y+P.lH, BP.z);
                gSp=SP_GRIP;
                doLiftFrame(dt);
                // Continuous safety re-check
                if(V.sig>V.thr){setSt(ST.ABORT);break;}
                if(P.lH>40){softReset();setSt(ST.IDLE);}
                break;}

            case ST.ABORT:{
                // 3-phase: lower → release → home
                var d=2.8;
                if(t<1.2){
                    // Phase 1: lower box
                    var ls=sm(t/1.2);
                    P.lH=Math.max(0,P.lH*(1-ls));
                    eeT.set(BP.x,GRASP_WRIST_Y+P.lH,BP.z);
                    gSp=SP_GRIP;
                    if(P.det) doLiftFrame(dt);
                    ghosts.forEach(function(g){g.parts.forEach(function(p){p.material.opacity*=0.92;});});
                } else if(t<1.8){
                    // Phase 2: release
                    var rs=sm((t-1.2)/0.6);
                    gSp=lr(SP_GRIP,SP_OPEN,rs);
                    eeT.set(BP.x,GRASP_WRIST_Y+2,BP.z);
                    if(boxAttached){
                        boxAttached=false;P.det=false;
                        bxG.position.copy(BP);bxG.quaternion.identity();
                        P.tau.set(0,0,0);P.av.set(0,0,0);P.tQ.identity();
                    }
                    ghosts.forEach(hideGh);
                } else {
                    // Phase 3: return home
                    var hs=sm((t-1.8)/1.0);
                    eeT.set(lr(BP.x,HOME.x,hs),lr(GRASP_WRIST_Y+2,HOME.y,hs),lr(BP.z,HOME.z,hs));
                    gSp=SP_OPEN;
                }
                if(t>=d){softReset();setSt(ST.IDLE);}
                break;}
            }
        }

        function setSt(s){
            state=s;stT=0;
            if(s===ST.ABORT){
                critO.classList.add('on');
                critD.textContent='ABORTING LIFT \u2014 \u03C3 = '+V.sig.toFixed(3)+' > threshold '+V.thr.toFixed(2);
            } else critO.classList.remove('on');
            if(s===ST.IDLE){running=false;bGo.disabled=false;ghosts.forEach(hideGh);}
        }

        function softReset(){
            P.tau.set(0,0,0);P.av.set(0,0,0);P.tQ.identity();
            P.gF=0;P.lH=0;P.det=false;
            V.mu=[0,0];V.sig=0;V.kl=0;V.hist=[];
            for(var i=0;i<NG;i++)V.eps[i]={x:0,y:0};
            bxG.position.copy(BP);bxG.quaternion.identity();
            boxAttached=false;boxGripOff.set(0,0,0);
            eeT.copy(HOME);gSp=SP_OPEN;
            ghosts.forEach(hideGh);
            if(tArr){bxG.remove(tArr);tArr=null;}
            critO.classList.remove('on');
        }

        function fullReset(){
            softReset();
            var sliderDefaults={scx:'3',scy:'-5',scz:'2',sma:'8',sth:'1.8',sdp:'28'};
            for(var sid in sliderDefaults){
                var sl=document.getElementById(sid);
                if(sl){sl.value=sliderDefaults[sid];sl.dispatchEvent(new Event('input'));}
            }
            lx.fillStyle='#040608';lx.fillRect(0,0,lcv.width,lcv.height);
        }

        // === LATENT SPACE CANVAS ===
        function drawLat(){
            var w=lcv.width,h=lcv.height,cx=w/2,cy=h/2,sc=65;
            lx.fillStyle='rgba(4,6,8,.14)';lx.fillRect(0,0,w,h);
            lx.strokeStyle='rgba(255,255,255,.025)';lx.lineWidth=0.5;
            for(var i=-3;i<=3;i++){var px=cx+i*sc;
                lx.beginPath();lx.moveTo(px,0);lx.lineTo(px,h);lx.stroke();
                lx.beginPath();lx.moveTo(0,cy+i*sc);lx.lineTo(w,cy+i*sc);lx.stroke();}
            lx.strokeStyle='rgba(255,255,255,.08)';lx.lineWidth=1;
            lx.beginPath();lx.moveTo(cx,0);lx.lineTo(cx,h);lx.stroke();
            lx.beginPath();lx.moveTo(0,cy);lx.lineTo(w,cy);lx.stroke();
            // Threshold circle
            lx.strokeStyle='rgba(255,82,82,.25)';lx.lineWidth=1;
            lx.setLineDash([4,4]);lx.beginPath();lx.arc(cx,cy,V.thr*sc,0,Math.PI*2);lx.stroke();lx.setLineDash([]);
            if(V.sig>0.008){
                var sr=V.sig*sc,mx=cx+V.mu[0]*sc,my=cy-V.mu[1]*sc;
                var gr=lx.createRadialGradient(mx,my,0,mx,my,sr*2.2);
                gr.addColorStop(0,'rgba(255,152,0,.24)');gr.addColorStop(0.5,'rgba(255,152,0,.06)');gr.addColorStop(1,'rgba(255,152,0,0)');
                lx.fillStyle=gr;lx.beginPath();lx.arc(mx,my,sr*2.2,0,Math.PI*2);lx.fill();
                lx.strokeStyle='rgba(255,167,38,.5)';lx.lineWidth=1.4;
                lx.beginPath();lx.arc(mx,my,sr,0,Math.PI*2);lx.stroke();
                lx.fillStyle='rgba(255,167,38,.6)';
                for(var i=0;i<NG;i++){lx.beginPath();lx.arc(mx+V.eps[i].x*sr,my-V.eps[i].y*sr,2.4,0,Math.PI*2);lx.fill();}
                lx.fillStyle='#ff9800';lx.beginPath();lx.arc(mx,my,3.5,0,Math.PI*2);lx.fill();
            }
            lx.fillStyle='rgba(100,180,255,.35)';lx.beginPath();lx.arc(cx,cy,2.8,0,Math.PI*2);lx.fill();
            if(V.hist.length>2){
                lx.strokeStyle='rgba(255,167,38,.1)';lx.lineWidth=1;lx.beginPath();
                for(var i=0;i<V.hist.length;i++){var hx=cx+V.hist[i][0]*sc,hy=cy-V.hist[i][1]*sc;i===0?lx.moveTo(hx,hy):lx.lineTo(hx,hy);}
                lx.stroke();}
            lx.fillStyle='rgba(255,255,255,.22)';lx.font='9px JetBrains Mono,monospace';
            lx.fillText('z\u2081',w-18,cy-4);lx.fillText('z\u2082',cx+5,12);
        }

        // === UI ===
        function updUI(){
            $mu.textContent='('+V.mu[0].toFixed(3)+', '+V.mu[1].toFixed(3)+')';
            $si.textContent=V.sig.toFixed(3);
            $kl.textContent=(V.kl||0).toFixed(3);
            $ta.textContent='('+P.tau.x.toFixed(1)+', '+P.tau.y.toFixed(1)+', '+P.tau.z.toFixed(1)+')';
            $dt.textContent=P.tau.length().toFixed(3);
            var eu=new THREE.Euler().setFromQuaternion(P.tQ);
            $ti.textContent='('+(eu.x*180/Math.PI).toFixed(1)+', '+(eu.z*180/Math.PI).toFixed(1)+')';
            $gf.textContent=P.gF.toFixed(1)+' N';
            $fb.style.width=Math.min(V.sig/3,1)*100+'%';
            $fc.textContent=V.sig.toFixed(2);
            $fm.style.left=(V.thr/3*100)+'%';
            badge.textContent='STATE: '+STN[state];
            badge.className='vhb';
            if(state===ST.PRE_LIFT)badge.classList.add('sp');
            else if(state===ST.LIFT_OK)badge.classList.add('ss');
            else if(state===ST.ABORT)badge.classList.add('sc');
            else if(state===ST.GRASP||state===ST.DESCEND)badge.classList.add('sl');
        }

        // === SLIDERS ===
        function bn(sid,did,fmt,cb){
            var sl=document.getElementById(sid),sp=document.getElementById(did);
            var f=function(){var v=parseFloat(sl.value);sp.textContent=fmt(v);cb(v);};
            sl.addEventListener('input',f);f();
        }
        bn('scx','dcx',function(v){return v.toFixed(1);},function(v){P.com.x=v;syncCoM();cR.position.copy(cS.position);});
        bn('scy','dcy',function(v){return v.toFixed(1);},function(v){P.com.y=v;syncCoM();cR.position.copy(cS.position);});
        bn('scz','dcz',function(v){return v.toFixed(1);},function(v){P.com.z=v;syncCoM();cR.position.copy(cS.position);});
        bn('sma','dma',function(v){return v.toFixed(1)+' kg';},function(v){P.mass=v;});
        bn('sth','dth',function(v){return v.toFixed(2);},function(v){V.thr=v;});
        bn('sdp','ddp',function(v){return ''+v;},function(v){P.Cd=v;});

        // === BUTTONS ===
        bGo.addEventListener('click',function(){
            if(running)return;running=true;bGo.disabled=true;
            softReset();setSt(ST.APPROACH);
        });
        bRs.addEventListener('click',function(){
            fullReset();setSt(ST.IDLE);running=false;bGo.disabled=false;
        });

        // === ANIMATION LOOP ===
        var clk=new THREE.Clock();
        (function loop(){
            requestAnimationFrame(loop);
            var dt=Math.min(clk.getDelta(),0.05);
            if(running||state!==ST.IDLE)tickSt(dt);
            poseArm(solveIK(eeT),gSp);
            cR.rotation.x+=dt*0.6;cR.rotation.z+=dt*0.4;
            updUI();drawLat();orb.update();ren.render(scene,cam);
        })();

        window.addEventListener('resize',function(){
            var w=mt.clientWidth||800,h=Math.max(mt.clientHeight||520,480);
            cam.aspect=w/h;cam.updateProjectionMatrix();ren.setSize(w,h);
        });
        lx.fillStyle='#040608';lx.fillRect(0,0,lcv.width,lcv.height);
        console.log('[VAE Uncertainty v8.0] Lateral side-clamp + epsilon gap + PRE_LIFT safety \u2713');
    } // end boot
});