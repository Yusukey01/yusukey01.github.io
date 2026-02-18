// sec5_p12_vae_uncertainty.js
// VAE Uncertainty Visualization for Robotic Manipulation
// Demonstrates how Variational Autoencoders encode physical uncertainty
// as latent-space distributions — ghost arms emerge from σ during the Moment of Detachment
//
// Architecture:
//   - Forward Kinematics 3-DOF arm (shoulder, elbow, wrist) with analytic IK
//   - Π-shaped parallel gripper with collision-clamped fingers
//   - Spring-Mass-Damper torque response (I≈4.5, Cd≈28)
//   - Continuous VAE posterior q(z|x) inference mapping Δτ → [μ, σ]
//   - 5 ghost arm clones with temporally-smoothed ε sampling

document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('simulation-container');
    if (!container) { console.error('[VAE Sim] #simulation-container not found'); return; }

    // ==== HTML ====
    container.innerHTML = [
      '<div class="vae-root"><div class="vae-layout">',
      '<div class="vae-viewport">',
        '<div class="vae-topbar"><span class="vae-topbar-title">PHYSICAL AI — VAE Uncertainty Simulation</span><span class="vae-topbar-hint">Orbit: drag · Zoom: scroll · Pan: right-drag</span></div>',
        '<div class="vae-canvas-wrap" id="vae-canvas-wrap"><div id="vae-three-mount"></div>',
          '<div class="vae-hud-badge" id="vae-hud-badge">STATE: IDLE</div>',
          '<div class="vae-critical-overlay" id="vae-critical-overlay"><div class="vae-crit-icon">\u26A0</div><div class="vae-crit-title">CRITICAL UNCERTAINTY</div><div class="vae-crit-sub" id="vae-crit-sub">\u03C3 exceeded safety threshold</div></div>',
        '</div>',
        '<div class="vae-legend-bar">',
          '<span class="vae-leg"><i class="vae-dot vae-dot-arm"></i>Primary Arm</span>',
          '<span class="vae-leg"><i class="vae-dot vae-dot-ghost"></i>Ghost Arms (\u03C3-samples)</span>',
          '<span class="vae-leg"><i class="vae-dot vae-dot-com"></i>Center of Mass</span>',
          '<span class="vae-leg"><i class="vae-dot vae-dot-torque"></i>Torque Vector</span>',
        '</div>',
      '</div>',
      '<div class="vae-panel">',
        '<div class="vae-card"><div class="vae-card-head">VAE Latent Space <em>q(z|x)</em></div><div class="vae-card-sub">Posterior inference from torque feedback</div><div class="vae-latent-wrap"><canvas id="vae-latent-cv" width="260" height="260"></canvas></div><div class="vae-row"><span class="vae-lbl">\u03BC</span><span class="vae-val" id="v-mu">(0.00, 0.00)</span></div><div class="vae-row"><span class="vae-lbl">\u03C3</span><span class="vae-val" id="v-sigma">0.000</span></div><div class="vae-row vae-row-hl"><span class="vae-lbl">KL(q\u2016p)</span><span class="vae-val" id="v-kl">0.000</span></div></div>',
        '<div class="vae-card"><div class="vae-card-head">Physics Telemetry</div><div class="vae-tel-grid"><div class="vae-tel"><span class="vae-tel-l">Torque \u03C4</span><span class="vae-tel-v" id="v-tau">(0, 0, 0)</span></div><div class="vae-tel"><span class="vae-tel-l">|\u0394\u03C4|</span><span class="vae-tel-v" id="v-dtau">0.000</span></div><div class="vae-tel"><span class="vae-tel-l">Tilt (\u00B0)</span><span class="vae-tel-v" id="v-tilt">(0.0, 0.0)</span></div><div class="vae-tel"><span class="vae-tel-l">Grip Force</span><span class="vae-tel-v" id="v-grip">0.0 N</span></div></div></div>',
        '<div class="vae-card"><div class="vae-card-head">Center of Mass Offset</div><div class="vae-card-sub">Relative to box geometric center</div><div class="vae-sld-row"><label>CoM X</label><input type="range" id="sl-cx" min="-8" max="8" step="0.5" value="3"><span id="sv-cx">3.0</span></div><div class="vae-sld-row"><label>CoM Y</label><input type="range" id="sl-cy" min="-12" max="0" step="0.5" value="-5"><span id="sv-cy">-5.0</span></div><div class="vae-sld-row"><label>CoM Z</label><input type="range" id="sl-cz" min="-8" max="8" step="0.5" value="2"><span id="sv-cz">2.0</span></div></div>',
        '<div class="vae-card"><div class="vae-card-head">Simulation Parameters</div><div class="vae-sld-row"><label>Box Mass</label><input type="range" id="sl-mass" min="1" max="20" step="0.5" value="8"><span id="sv-mass">8.0 kg</span></div><div class="vae-sld-row"><label>\u03C3 Threshold</label><input type="range" id="sl-thr" min="0.5" max="3.0" step="0.1" value="1.8"><span id="sv-thr">1.80</span></div><div class="vae-sld-row"><label>Damping C_d</label><input type="range" id="sl-damp" min="10" max="50" step="1" value="28"><span id="sv-damp">28</span></div></div>',
        '<div class="vae-btn-row"><button class="vae-btn vae-btn-go" id="btn-go">\u25B6 Execute Sequence</button><button class="vae-btn vae-btn-rst" id="btn-rst">\u21BA Reset</button></div>',
        '<div class="vae-safety"><div class="vae-safety-lbl">Uncertainty \u03C3</div><div class="vae-safety-track"><div class="vae-safety-fill" id="vae-sf"></div><div class="vae-safety-mark" id="vae-sm"></div></div><div class="vae-safety-nums"><span>0</span><span class="vae-safety-cur" id="vae-sc">0.00</span><span>3.0</span></div></div>',
      '</div>',
      '</div></div>'
    ].join('');

    // ==== CSS ====
    var css = document.createElement('style');
    css.textContent = [
'.vae-root{width:100%;font-family:"JetBrains Mono","Fira Code","SF Mono",monospace;color:#e8ecf1;background:#080a10;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.05)}',
'.vae-layout{display:flex;min-height:720px}',
'@media(max-width:1100px){.vae-layout{flex-direction:column}}',
'.vae-viewport{flex:1 1 62%;display:flex;flex-direction:column;background:#080a10;position:relative}',
'.vae-topbar{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.05)}',
'.vae-topbar-title{font-size:.72rem;font-weight:700;color:#ffa726;letter-spacing:.06em}',
'.vae-topbar-hint{font-size:.6rem;color:rgba(255,255,255,.28)}',
'.vae-canvas-wrap{flex:1;position:relative;min-height:520px}',
'#vae-three-mount{position:absolute;inset:0}',
'#vae-three-mount canvas{display:block;width:100%!important;height:100%!important}',
'.vae-hud-badge{position:absolute;top:10px;left:10px;padding:4px 14px;border-radius:4px;font-size:.65rem;font-weight:800;letter-spacing:.14em;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.12);color:#64b4ff;backdrop-filter:blur(6px);z-index:10;pointer-events:none;transition:all .3s}',
'.vae-hud-badge.st-lift{color:#ffa726;border-color:rgba(255,167,38,.45);box-shadow:0 0 18px rgba(255,167,38,.18)}',
'.vae-hud-badge.st-crit{color:#ff5252;border-color:rgba(255,82,82,.5);box-shadow:0 0 22px rgba(255,82,82,.25);animation:vbp .55s ease-in-out infinite alternate}',
'@keyframes vbp{from{opacity:.65}to{opacity:1}}',
'.vae-critical-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(160,15,15,.12);backdrop-filter:blur(2px);z-index:20;pointer-events:none;opacity:0;transition:opacity .4s}',
'.vae-critical-overlay.on{opacity:1}',
'.vae-crit-icon{font-size:3.2rem;color:#ff5252;animation:vcp .7s ease-in-out infinite alternate}',
'@keyframes vcp{from{transform:scale(1);opacity:.55}to{transform:scale(1.12);opacity:1}}',
'.vae-crit-title{font-size:1.25rem;font-weight:800;color:#ff5252;letter-spacing:.15em;margin-top:6px}',
'.vae-crit-sub{font-size:.7rem;color:rgba(255,82,82,.75);margin-top:3px}',
'.vae-legend-bar{display:flex;gap:16px;padding:7px 14px;background:rgba(0,0,0,.3);border-top:1px solid rgba(255,255,255,.05);flex-wrap:wrap}',
'.vae-leg{display:flex;align-items:center;gap:5px;font-size:.62rem;color:rgba(255,255,255,.42)}',
'.vae-dot{display:inline-block;width:8px;height:8px;border-radius:2px}',
'.vae-dot-arm{background:#9aa8b8}.vae-dot-ghost{background:rgba(255,167,38,.55)}.vae-dot-com{background:#ff5252}.vae-dot-torque{background:#69f0ae}',
'.vae-panel{flex:0 0 330px;max-width:330px;display:flex;flex-direction:column;gap:8px;padding:10px;background:rgba(12,16,26,.96);border-left:1px solid rgba(255,255,255,.05);overflow-y:auto;max-height:800px}',
'@media(max-width:1100px){.vae-panel{flex:none;max-width:none;max-height:none;border-left:none;border-top:1px solid rgba(255,255,255,.05);display:grid;grid-template-columns:1fr 1fr;gap:8px}}',
'.vae-card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px}',
'.vae-card-head{font-weight:700;font-size:.78rem;color:rgba(255,255,255,.82);margin-bottom:1px}',
'.vae-card-head em{font-style:normal;color:#ffa726}',
'.vae-card-sub{font-size:.6rem;color:rgba(255,255,255,.3);margin-bottom:7px}',
'.vae-latent-wrap{display:flex;justify-content:center;margin:5px 0}',
'#vae-latent-cv{border-radius:6px;border:1px solid rgba(255,255,255,.07);background:#060810}',
'.vae-row{display:flex;justify-content:space-between;font-size:.72rem;padding:1px 0}',
'.vae-lbl{color:rgba(255,255,255,.38)}',
'.vae-val{font-family:"JetBrains Mono",monospace;color:#64b4ff}',
'.vae-row-hl .vae-val{color:#ffa726}',
'.vae-tel-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}',
'.vae-tel{background:rgba(0,0,0,.22);border-radius:4px;padding:5px 7px}',
'.vae-tel-l{display:block;font-size:.56rem;color:rgba(255,255,255,.32);margin-bottom:1px}',
'.vae-tel-v{font-size:.7rem;color:#69f0ae;font-family:"JetBrains Mono",monospace}',
'.vae-sld-row{display:flex;align-items:center;gap:7px;margin-bottom:4px}',
'.vae-sld-row label{width:72px;font-size:.68rem;color:rgba(255,255,255,.45);flex-shrink:0}',
'.vae-sld-row input[type=range]{flex:1;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.07);height:5px;border-radius:3px;cursor:pointer;outline:none}',
'.vae-sld-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:#ef6c00;border-radius:50%;cursor:pointer;transition:transform .12s}',
'.vae-sld-row input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.28)}',
'.vae-sld-row input[type=range]::-moz-range-thumb{width:13px;height:13px;background:#ef6c00;border-radius:50%;border:none;cursor:pointer}',
'.vae-sld-row span{width:52px;text-align:right;font-size:.68rem;color:#ffa726;font-family:"JetBrains Mono",monospace;flex-shrink:0}',
'.vae-btn-row{display:flex;gap:7px}',
'.vae-btn{flex:1;padding:10px 10px;border:none;border-radius:6px;font-weight:700;font-family:inherit;font-size:.75rem;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:5px}',
'.vae-btn-go{background:linear-gradient(135deg,#ef6c00,#ff9800);color:#fff}',
'.vae-btn-go:hover{box-shadow:0 4px 18px rgba(239,108,0,.32);transform:translateY(-1px)}',
'.vae-btn-go:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}',
'.vae-btn-rst{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.65)}',
'.vae-btn-rst:hover{background:rgba(255,255,255,.1);color:#fff}',
'.vae-safety{padding:6px 0}',
'.vae-safety-lbl{font-size:.62rem;color:rgba(255,255,255,.35);margin-bottom:3px}',
'.vae-safety-track{position:relative;height:7px;background:rgba(255,255,255,.05);border-radius:4px;overflow:visible}',
'.vae-safety-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#69f0ae,#ffa726,#ff5252);width:0%;transition:width .12s}',
'.vae-safety-mark{position:absolute;top:-3px;width:2px;height:13px;background:#ff5252;border-radius:1px;left:60%;transition:left .12s}',
'.vae-safety-nums{display:flex;justify-content:space-between;font-size:.56rem;color:rgba(255,255,255,.25);margin-top:2px}',
'.vae-safety-cur{color:#ffa726;font-weight:700}'
    ].join('\n');
    document.head.appendChild(css);

    // ==== LOAD THREE.JS (project convention: global window.THREE) ====
    if (!window.THREE) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.onload = function () {
            var o = document.createElement('script');
            o.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
            o.onload = boot;
            document.head.appendChild(o);
        };
        document.head.appendChild(s);
    } else if (!THREE.OrbitControls) {
        var o2 = document.createElement('script');
        o2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        o2.onload = boot;
        document.head.appendChild(o2);
    } else { boot(); }

    function boot() {
        if (!window.THREE || !THREE.OrbitControls) { setTimeout(boot, 80); return; }

        // ---- DOM refs ----
        var mount = document.getElementById('vae-three-mount');
        var badge = document.getElementById('vae-hud-badge');
        var critOver = document.getElementById('vae-critical-overlay');
        var critSub = document.getElementById('vae-crit-sub');
        var lCv = document.getElementById('vae-latent-cv');
        var lCtx = lCv.getContext('2d');
        var $mu = document.getElementById('v-mu');
        var $sig = document.getElementById('v-sigma');
        var $kl = document.getElementById('v-kl');
        var $tau = document.getElementById('v-tau');
        var $dtau = document.getElementById('v-dtau');
        var $tilt = document.getElementById('v-tilt');
        var $grip = document.getElementById('v-grip');
        var $sf = document.getElementById('vae-sf');
        var $sm = document.getElementById('vae-sm');
        var $sc = document.getElementById('vae-sc');
        var btnGo = document.getElementById('btn-go');
        var btnRst = document.getElementById('btn-rst');

        // ---- Constants ----
        var BOX_W = 20, BOX_H = 30, BOX_D = 20;
        var BOX_POS = new THREE.Vector3(20, 0, 0);
        var L1 = 24, L2 = 22;         // link lengths
        var LR = 2.0, JR = 2.5;       // link radius, joint radius
        var FLEN = 10, FW = 1.8, FD = 2.5; // finger dimensions
        var SPREAD_OPEN = 25;          // wider than BOX_W=20
        var SPREAD_CLOSED = BOX_W;     // fingers stop at box edges
        var NG = 5;                    // ghost count

        // ---- State Machine ----
        var ST = {IDLE:0,APPROACH:1,DESCEND:2,GRASP:3,LIFT:4,CRITICAL:5,ABORT:6};
        var STNAME = ['IDLE','APPROACH','DESCEND','GRASP','LIFT','CRITICAL','ABORT'];
        var state = ST.IDLE, stateT = 0, running = false;

        // ---- Physics ----
        var phys = {
            I:4.5, Cd:28, mass:8, g:9.81,
            com: new THREE.Vector3(3,-5,2),
            torque: new THREE.Vector3(), angVel: new THREE.Vector3(),
            tiltQ: new THREE.Quaternion(),
            gripF:0, liftH:0, detached:false
        };

        // ---- VAE ----
        var vae = {mu:[0,0], sigma:0, kl:0, history:[], eps:[], threshold:1.8, alpha:0.92};
        for (var vi=0;vi<NG;vi++) vae.eps.push({x:0,y:0});

        var eeTarget = new THREE.Vector3(5,42,0);
        var gripSpread = SPREAD_OPEN;

        // ==== THREE.JS SCENE ====
        var W = mount.clientWidth||800, H = Math.max(mount.clientHeight||520,480);
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x06080d);
        scene.fog = new THREE.FogExp2(0x06080d, 0.0025);

        var camera = new THREE.PerspectiveCamera(48, W/H, 0.5, 400);
        camera.position.set(40, 50, 60);

        var renderer = new THREE.WebGLRenderer({antialias:true});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
        renderer.setSize(W, H);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        mount.appendChild(renderer.domElement);

        var orb = new THREE.OrbitControls(camera, renderer.domElement);
        orb.enableDamping = true; orb.dampingFactor = 0.08;
        orb.target.set(12,14,0); orb.minDistance=28; orb.maxDistance=160;
        orb.update();

        // Lights
        scene.add(new THREE.AmbientLight(0x3a3a5a, 0.55));
        var dL = new THREE.DirectionalLight(0xffeedd, 1.05);
        dL.position.set(35,65,45); dL.castShadow=true;
        dL.shadow.mapSize.set(1024,1024);
        dL.shadow.camera.left=-55; dL.shadow.camera.right=55;
        dL.shadow.camera.top=55; dL.shadow.camera.bottom=-55;
        dL.shadow.camera.near=1; dL.shadow.camera.far=160;
        scene.add(dL);
        var fL = new THREE.DirectionalLight(0x7888cc,0.3);
        fL.position.set(-25,30,-20); scene.add(fL);
        var rL = new THREE.PointLight(0xff8800,0.35,120);
        rL.position.set(-15,45,35); scene.add(rL);

        // Ground + Grid
        var gnd = new THREE.Mesh(
            new THREE.PlaneGeometry(220,220),
            new THREE.MeshStandardMaterial({color:0x14181f,roughness:0.92,metalness:0.08})
        );
        gnd.rotation.x=-Math.PI/2; gnd.position.y=-0.1; gnd.receiveShadow=true;
        scene.add(gnd);
        scene.add(new THREE.GridHelper(120,24,0x222630,0x181c24));

        // ==== MATERIALS ====
        var matM = new THREE.MeshStandardMaterial({color:0x4a5262,metalness:0.9,roughness:0.2});
        var matJ = new THREE.MeshStandardMaterial({color:0x3a424f,metalness:0.92,roughness:0.18});
        var matG = new THREE.MeshStandardMaterial({color:0x6a7585,metalness:0.85,roughness:0.25});
        var matBx = new THREE.MeshStandardMaterial({color:0x2a4a7a,transparent:true,opacity:0.4,roughness:0.5,metalness:0.15,side:THREE.DoubleSide});
        var matEd = new THREE.LineBasicMaterial({color:0x5599dd,transparent:true,opacity:0.55});
        var matCm = new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff1111,emissiveIntensity:0.7});
        function mkGM(){return new THREE.MeshStandardMaterial({color:0xff9800,metalness:0.25,roughness:0.55,transparent:true,opacity:0.0,depthWrite:false});}

        // ==== PRIMARY ARM ====
        var armR = new THREE.Group(); scene.add(armR);

        // Base pedestal — heavy wide cylinder
        var ped = new THREE.Mesh(new THREE.CylinderGeometry(6,7.5,3.5,32),matJ);
        ped.position.set(0,1.75,0); ped.castShadow=true; armR.add(ped);
        var bRing = new THREE.Mesh(new THREE.CylinderGeometry(7.6,7.6,0.6,32),matM);
        bRing.position.set(0,0.3,0); bRing.castShadow=true; armR.add(bRing);

        // Shoulder joint J0 — large hydraulic sphere
        var j0 = new THREE.Mesh(new THREE.SphereGeometry(JR,28,28),matJ);
        j0.position.set(0,3.5,0); j0.castShadow=true; armR.add(j0);

        // Link 1 (unit-height cylinder, dynamically scaled)
        var l1 = new THREE.Mesh(new THREE.CylinderGeometry(LR,LR,1,20),matM);
        l1.castShadow=true; armR.add(l1);

        // Elbow joint J1
        var j1 = new THREE.Mesh(new THREE.SphereGeometry(JR,28,28),matJ);
        j1.castShadow=true; armR.add(j1);

        // Link 2 (slightly tapered)
        var l2 = new THREE.Mesh(new THREE.CylinderGeometry(LR*0.88,LR,1,20),matM);
        l2.castShadow=true; armR.add(l2);

        // Wrist joint J2
        var j2 = new THREE.Mesh(new THREE.SphereGeometry(JR*0.78,24,24),matJ);
        j2.castShadow=true; armR.add(j2);

        // Π-SHAPED GRIPPER: top bar + two vertical fingers
        var bar = new THREE.Mesh(new THREE.BoxGeometry(1,2.5,FD),matG);
        bar.castShadow=true; armR.add(bar);
        var fL2 = new THREE.Mesh(new THREE.BoxGeometry(FW,FLEN,FD),matG);
        fL2.castShadow=true; armR.add(fL2);
        var fR2 = new THREE.Mesh(new THREE.BoxGeometry(FW,FLEN,FD),matG);
        fR2.castShadow=true; armR.add(fR2);

        // ==== GHOST ARMS (5 full clones) ====
        var ghosts = [];
        for(var gi=0;gi<NG;gi++){
            var gg={
                l1:new THREE.Mesh(new THREE.CylinderGeometry(LR,LR,1,12),mkGM()),
                j1:new THREE.Mesh(new THREE.SphereGeometry(JR,16,16),mkGM()),
                l2:new THREE.Mesh(new THREE.CylinderGeometry(LR*0.88,LR,1,12),mkGM()),
                j2:new THREE.Mesh(new THREE.SphereGeometry(JR*0.78,16,16),mkGM()),
                bar:new THREE.Mesh(new THREE.BoxGeometry(1,2.5,FD),mkGM()),
                fL:new THREE.Mesh(new THREE.BoxGeometry(FW,FLEN,FD),mkGM()),
                fR:new THREE.Mesh(new THREE.BoxGeometry(FW,FLEN,FD),mkGM())
            };
            gg.parts=[gg.l1,gg.j1,gg.l2,gg.j2,gg.bar,gg.fL,gg.fR];
            gg.parts.forEach(function(p){p.visible=false;scene.add(p);});
            ghosts.push(gg);
        }

        // ==== BOX (X-Ray with CoM) ====
        var boxGrp = new THREE.Group();
        boxGrp.position.copy(BOX_POS); scene.add(boxGrp);
        var boxM = new THREE.Mesh(new THREE.BoxGeometry(BOX_W,BOX_H,BOX_D),matBx);
        boxM.position.y=BOX_H/2; boxM.castShadow=true; boxGrp.add(boxM);
        var boxE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX_W,BOX_H,BOX_D)),matEd);
        boxE.position.y=BOX_H/2; boxGrp.add(boxE);

        // CoM red sphere
        var comS = new THREE.Mesh(new THREE.SphereGeometry(1.6,22,22),matCm);
        function syncCom(){comS.position.set(phys.com.x,BOX_H/2+phys.com.y,phys.com.z);}
        syncCom(); boxGrp.add(comS);

        // CoM glow ring
        var comRng = new THREE.Mesh(
            new THREE.RingGeometry(2.2,2.9,32),
            new THREE.MeshBasicMaterial({color:0xff4444,transparent:true,opacity:0.22,side:THREE.DoubleSide})
        );
        comRng.position.copy(comS.position); boxGrp.add(comRng);

        var tArrow = null;

        // ==== INVERSE KINEMATICS (2-Link Analytic in vertical reach plane) ====
        function solveIK(target){
            var baseY=3.5; // shoulder joint center
            var base=new THREE.Vector3(0,baseY,0);
            var dx2=target.x*target.x+target.z*target.z;
            var dx=Math.sqrt(dx2);
            var dy=target.y-baseY;
            var dist=Math.sqrt(dx*dx+dy*dy);
            var maxR=L1+L2-0.5;
            var d=Math.min(dist,maxR);
            // Horizontal swing
            var hAng=Math.atan2(target.z,target.x);
            // Elbow angle (law of cosines)
            var cosE=(d*d-L1*L1-L2*L2)/(2*L1*L2);
            cosE=Math.max(-0.999,Math.min(0.999,cosE));
            var eAng=Math.acos(cosE);
            // Shoulder angle
            var alpha=Math.atan2(dy,dx<0.001?0.001:dx);
            var beta=Math.atan2(L2*Math.sin(eAng),L1+L2*Math.cos(eAng));
            var sAng=alpha+beta;
            // Joint positions in reach plane
            var ePR=L1*Math.cos(sAng), ePY=L1*Math.sin(sAng);
            var wPR=ePR+L2*Math.cos(sAng-eAng), wPY=ePY+L2*Math.sin(sAng-eAng);
            var ch=Math.cos(hAng),sh=Math.sin(hAng);
            return{
                base:base,
                elbow:new THREE.Vector3(base.x+ePR*ch, baseY+ePY, base.z+ePR*sh),
                wrist:new THREE.Vector3(base.x+wPR*ch, baseY+wPY, base.z+wPR*sh)
            };
        }

        // Position a unit-height cylinder between two 3D points
        function poseCyl(mesh,pA,pB){
            var mid=pA.clone().add(pB).multiplyScalar(0.5);
            mesh.position.copy(mid);
            mesh.scale.set(1,pA.distanceTo(pB),1);
            var dir=pB.clone().sub(pA).normalize();
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
        }

        // Pose primary arm with Π gripper
        function poseArm(ik,sp){
            poseCyl(l1,ik.base,ik.elbow);
            j1.position.copy(ik.elbow);
            poseCyl(l2,ik.elbow,ik.wrist);
            j2.position.copy(ik.wrist);
            // Bracket bar at wrist, horizontal
            bar.position.copy(ik.wrist);
            bar.scale.x=sp; bar.quaternion.identity();
            // Fingers hang down from bracket ends
            var hs=sp/2, fd=FLEN/2+1.25;
            fL2.position.set(ik.wrist.x-hs, ik.wrist.y-fd, ik.wrist.z);
            fL2.quaternion.identity();
            fR2.position.set(ik.wrist.x+hs, ik.wrist.y-fd, ik.wrist.z);
            fR2.quaternion.identity();
        }

        // Pose ghost arm
        function poseGh(g,ik,sp,op){
            poseCyl(g.l1,ik.base,ik.elbow); g.j1.position.copy(ik.elbow);
            poseCyl(g.l2,ik.elbow,ik.wrist); g.j2.position.copy(ik.wrist);
            g.bar.position.copy(ik.wrist); g.bar.scale.x=sp; g.bar.quaternion.identity();
            var hs=sp/2,fd=FLEN/2+1.25;
            g.fL.position.set(ik.wrist.x-hs,ik.wrist.y-fd,ik.wrist.z); g.fL.quaternion.identity();
            g.fR.position.set(ik.wrist.x+hs,ik.wrist.y-fd,ik.wrist.z); g.fR.quaternion.identity();
            g.parts.forEach(function(p){p.visible=true;p.material.opacity=op;});
        }
        function hideGh(g){g.parts.forEach(function(p){p.visible=false;});}

        // ==== PHYSICS ====
        function calcTorque(gripPt){
            var cw=new THREE.Vector3(BOX_POS.x+phys.com.x, phys.liftH+BOX_H/2+phys.com.y, BOX_POS.z+phys.com.z);
            var r=cw.clone().sub(gripPt);
            var Fg=new THREE.Vector3(0,-phys.mass*phys.g,0);
            return new THREE.Vector3().crossVectors(r,Fg);
        }
        function stepPhys(dt){
            if(!phys.detached)return;
            var damp=phys.angVel.clone().multiplyScalar(phys.Cd);
            var net=phys.torque.clone().sub(damp);
            var al=net.divideScalar(phys.I);
            phys.angVel.add(al.clone().multiplyScalar(dt));
            var dA=phys.angVel.clone().multiplyScalar(dt*0.008);
            var mag=dA.length();
            if(mag>1e-7){
                var dq=new THREE.Quaternion().setFromAxisAngle(dA.clone().normalize(),mag);
                phys.tiltQ.multiply(dq).normalize();
            }
        }

        // ==== VAE ENGINE ====
        function stepVAE(tv){
            var tx=tv.x,tz=tv.z,tm=Math.sqrt(tx*tx+tz*tz);
            vae.mu[0]=tx*0.07; vae.mu[1]=tz*0.07;
            vae.sigma=tm*0.011;
            for(var i=0;i<NG;i++){
                var rn=bm();
                vae.eps[i].x=vae.alpha*vae.eps[i].x+(1-vae.alpha)*rn[0];
                vae.eps[i].y=vae.alpha*vae.eps[i].y+(1-vae.alpha)*rn[1];
            }
            var s2=vae.sigma*vae.sigma+1e-9;
            var m2=vae.mu[0]*vae.mu[0]+vae.mu[1]*vae.mu[1];
            vae.kl=0.5*(m2+2*s2-2*Math.log(s2)-2);
            vae.history.push([vae.mu[0],vae.mu[1],vae.sigma]);
            if(vae.history.length>250) vae.history.shift();
        }
        function bm(){
            var u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();
            var r=Math.sqrt(-2*Math.log(u)),t=2*Math.PI*v;
            return[r*Math.cos(t),r*Math.sin(t)];
        }

        // Torque arrow
        function showTArr(tau){
            if(tArrow){boxGrp.remove(tArrow);tArrow=null;}
            var len=tau.length(); if(len<0.05)return;
            var al=Math.min(len*1.8,28);
            tArrow=new THREE.ArrowHelper(tau.clone().normalize(),new THREE.Vector3(0,BOX_H,0),al,0x69f0ae,al*0.18,al*0.09);
            boxGrp.add(tArrow);
        }

        // ==== STATE MACHINE ====
        function sm(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
        function lr(a,b,t){return a+(b-a)*t;}

        function tickState(dt){
            stateT+=dt; var t=stateT;
            switch(state){

            case ST.IDLE:
                eeTarget.set(5,42,0); gripSpread=SPREAD_OPEN; break;

            case ST.APPROACH:{
                var dur=1.6,s=sm(t/dur);
                eeTarget.set(lr(5,BOX_POS.x,s),lr(42,60,s),0);
                gripSpread=SPREAD_OPEN;
                if(t>=dur) setState(ST.DESCEND);
                break;}

            case ST.DESCEND:{
                var dur=1.3,s=sm(t/dur);
                var rawY=lr(60,BOX_H,s);
                // Y-CLAMP: never penetrate box top surface
                eeTarget.set(BOX_POS.x,Math.max(rawY,BOX_H),0);
                gripSpread=SPREAD_OPEN;
                if(t>=dur) setState(ST.GRASP);
                break;}

            case ST.GRASP:{
                // Fingers slide inward: 25→20, collision-clamped at box edges
                var dur=0.9,s=sm(t/dur);
                eeTarget.set(BOX_POS.x,BOX_H,0);
                var raw=lr(SPREAD_OPEN,SPREAD_CLOSED,s);
                // COLLISION PREVENTION: internal distance never < BOX_W
                gripSpread=Math.max(raw,SPREAD_CLOSED);
                phys.gripF=s*phys.mass*phys.g*1.6;
                if(t>=dur) setState(ST.LIFT);
                break;}

            case ST.LIFT:{
                var speed=11;
                phys.liftH=speed*t;
                eeTarget.set(BOX_POS.x,BOX_H+phys.liftH,0);
                gripSpread=SPREAD_CLOSED;

                // Moment of Detachment ~0.25s
                if(t>0.25&&!phys.detached) phys.detached=true;

                if(phys.detached){
                    boxGrp.position.set(BOX_POS.x,phys.liftH,BOX_POS.z);
                    phys.torque=calcTorque(eeTarget);
                    stepPhys(dt);
                    boxGrp.quaternion.copy(phys.tiltQ);
                    showTArr(phys.torque.clone().multiplyScalar(0.0015));

                    // VAE inference every frame
                    stepVAE(phys.torque);

                    // GHOST ARMS: θ_ghost = μ_θ + σ·ε (temporally smoothed)
                    for(var i=0;i<NG;i++){
                        var px=vae.mu[0]*12+vae.sigma*vae.eps[i].x*18;
                        var pz=vae.mu[1]*12+vae.sigma*vae.eps[i].y*18;
                        var py=vae.sigma*vae.eps[i].x*4;
                        var gt=eeTarget.clone(); gt.x+=px; gt.y+=py; gt.z+=pz;
                        var gik=solveIK(gt);
                        var op=Math.min(0.22,vae.sigma*0.14);
                        poseGh(ghosts[i],gik,gripSpread,op);
                    }
                    // Safety lock
                    if(vae.sigma>vae.threshold) setState(ST.CRITICAL);
                    if(phys.liftH>45){fullReset();setState(ST.IDLE);}
                }
                break;}

            case ST.CRITICAL:{
                var dur=2.2,s=sm(t/dur);
                phys.liftH=Math.max(0,phys.liftH*(1-s*0.6));
                boxGrp.position.y=phys.liftH;
                ghosts.forEach(function(g){g.parts.forEach(function(p){p.material.opacity*=0.94;});});
                if(t>=dur) setState(ST.ABORT);
                break;}

            case ST.ABORT:{
                var dur=1.5,s=sm(t/dur);
                eeTarget.set(lr(BOX_POS.x,5,s),lr(BOX_H,42,s),0);
                gripSpread=lr(SPREAD_CLOSED,SPREAD_OPEN,s);
                if(t>=dur){fullReset();setState(ST.IDLE);}
                break;}
            }
        }

        function setState(s){
            state=s; stateT=0;
            if(s===ST.CRITICAL||s===ST.ABORT){
                critOver.classList.add('on');
                critSub.textContent='\u03C3 = '+vae.sigma.toFixed(3)+' exceeded threshold '+vae.threshold.toFixed(2)+' \u2014 lift aborted';
            } else { critOver.classList.remove('on'); }
            if(s===ST.IDLE){running=false;btnGo.disabled=false;ghosts.forEach(hideGh);}
        }

        function fullReset(){
            phys.torque.set(0,0,0); phys.angVel.set(0,0,0); phys.tiltQ.identity();
            phys.gripF=0; phys.liftH=0; phys.detached=false;
            vae.mu=[0,0]; vae.sigma=0; vae.kl=0; vae.history=[];
            for(var i=0;i<NG;i++) vae.eps[i]={x:0,y:0};
            boxGrp.position.copy(BOX_POS); boxGrp.quaternion.identity();
            ghosts.forEach(hideGh);
            if(tArrow){boxGrp.remove(tArrow);tArrow=null;}
            critOver.classList.remove('on');
        }

        // ==== LATENT SPACE 2D CANVAS ====
        function drawLatent(){
            var w=lCv.width,h=lCv.height,cx=w/2,cy=h/2,sc=65;
            lCtx.fillStyle='rgba(6,8,16,.14)'; lCtx.fillRect(0,0,w,h);
            // Grid
            lCtx.strokeStyle='rgba(255,255,255,.03)'; lCtx.lineWidth=0.5;
            for(var i=-3;i<=3;i++){
                var px=cx+i*sc,py=cy+i*sc;
                lCtx.beginPath();lCtx.moveTo(px,0);lCtx.lineTo(px,h);lCtx.stroke();
                lCtx.beginPath();lCtx.moveTo(0,py);lCtx.lineTo(w,py);lCtx.stroke();
            }
            // Axes
            lCtx.strokeStyle='rgba(255,255,255,.1)';lCtx.lineWidth=1;
            lCtx.beginPath();lCtx.moveTo(cx,0);lCtx.lineTo(cx,h);lCtx.stroke();
            lCtx.beginPath();lCtx.moveTo(0,cy);lCtx.lineTo(w,cy);lCtx.stroke();
            // Threshold circle
            lCtx.strokeStyle='rgba(255,82,82,.28)';lCtx.lineWidth=1;
            lCtx.setLineDash([4,4]);
            lCtx.beginPath();lCtx.arc(cx,cy,vae.threshold*sc,0,Math.PI*2);lCtx.stroke();
            lCtx.setLineDash([]);
            // σ-blob
            if(vae.sigma>0.008){
                var sr=vae.sigma*sc,mx=cx+vae.mu[0]*sc,my=cy-vae.mu[1]*sc;
                var gr=lCtx.createRadialGradient(mx,my,0,mx,my,sr*2.2);
                gr.addColorStop(0,'rgba(255,152,0,.22)');
                gr.addColorStop(0.5,'rgba(255,152,0,.06)');
                gr.addColorStop(1,'rgba(255,152,0,0)');
                lCtx.fillStyle=gr;
                lCtx.beginPath();lCtx.arc(mx,my,sr*2.2,0,Math.PI*2);lCtx.fill();
                lCtx.strokeStyle='rgba(255,167,38,.55)';lCtx.lineWidth=1.4;
                lCtx.beginPath();lCtx.arc(mx,my,sr,0,Math.PI*2);lCtx.stroke();
                // Ghost dots
                lCtx.fillStyle='rgba(255,167,38,.65)';
                for(var i=0;i<NG;i++){
                    lCtx.beginPath();
                    lCtx.arc(mx+vae.eps[i].x*sr,my-vae.eps[i].y*sr,2.4,0,Math.PI*2);
                    lCtx.fill();
                }
                // μ dot
                lCtx.fillStyle='#ff9800';
                lCtx.beginPath();lCtx.arc(mx,my,3.5,0,Math.PI*2);lCtx.fill();
            }
            // Origin
            lCtx.fillStyle='rgba(100,180,255,.4)';
            lCtx.beginPath();lCtx.arc(cx,cy,2.8,0,Math.PI*2);lCtx.fill();
            // History trail
            if(vae.history.length>2){
                lCtx.strokeStyle='rgba(255,167,38,.12)';lCtx.lineWidth=1;lCtx.beginPath();
                for(var i=0;i<vae.history.length;i++){
                    var hx=cx+vae.history[i][0]*sc,hy=cy-vae.history[i][1]*sc;
                    i===0?lCtx.moveTo(hx,hy):lCtx.lineTo(hx,hy);
                }
                lCtx.stroke();
            }
            lCtx.fillStyle='rgba(255,255,255,.25)';lCtx.font='9px JetBrains Mono,monospace';
            lCtx.fillText('z\u2081',w-18,cy-4);lCtx.fillText('z\u2082',cx+5,12);
        }

        // ==== UI UPDATE ====
        function updateUI(){
            $mu.textContent='('+vae.mu[0].toFixed(3)+', '+vae.mu[1].toFixed(3)+')';
            $sig.textContent=vae.sigma.toFixed(3);
            $kl.textContent=(vae.kl||0).toFixed(3);
            $tau.textContent='('+phys.torque.x.toFixed(1)+', '+phys.torque.y.toFixed(1)+', '+phys.torque.z.toFixed(1)+')';
            $dtau.textContent=phys.torque.length().toFixed(3);
            var eu=new THREE.Euler().setFromQuaternion(phys.tiltQ);
            $tilt.textContent='('+(eu.x*180/Math.PI).toFixed(1)+', '+(eu.z*180/Math.PI).toFixed(1)+')';
            $grip.textContent=phys.gripF.toFixed(1)+' N';
            $sf.style.width=Math.min(vae.sigma/3,1)*100+'%';
            $sc.textContent=vae.sigma.toFixed(2);
            $sm.style.left=(vae.threshold/3*100)+'%';
            badge.textContent='STATE: '+STNAME[state];
            badge.className='vae-hud-badge';
            if(state===ST.LIFT)badge.classList.add('st-lift');
            if(state===ST.CRITICAL||state===ST.ABORT)badge.classList.add('st-crit');
        }

        // ==== SLIDER BINDINGS ====
        function bind(sid,did,fmt,cb){
            var sl=document.getElementById(sid),sp=document.getElementById(did);
            var f=function(){var v=parseFloat(sl.value);sp.textContent=fmt(v);cb(v);};
            sl.addEventListener('input',f);f();
        }
        bind('sl-cx','sv-cx',function(v){return v.toFixed(1);},function(v){phys.com.x=v;syncCom();comRng.position.copy(comS.position);});
        bind('sl-cy','sv-cy',function(v){return v.toFixed(1);},function(v){phys.com.y=v;syncCom();comRng.position.copy(comS.position);});
        bind('sl-cz','sv-cz',function(v){return v.toFixed(1);},function(v){phys.com.z=v;syncCom();comRng.position.copy(comS.position);});
        bind('sl-mass','sv-mass',function(v){return v.toFixed(1)+' kg';},function(v){phys.mass=v;});
        bind('sl-thr','sv-thr',function(v){return v.toFixed(2);},function(v){vae.threshold=v;});
        bind('sl-damp','sv-damp',function(v){return ''+v;},function(v){phys.Cd=v;});

        // ==== BUTTONS ====
        btnGo.addEventListener('click',function(){
            if(running)return;
            running=true;btnGo.disabled=true;
            fullReset();setState(ST.APPROACH);
        });
        btnRst.addEventListener('click',function(){
            fullReset();setState(ST.IDLE);running=false;btnGo.disabled=false;
        });

        // ==== ANIMATION LOOP ====
        var clock = new THREE.Clock();
        (function loop(){
            requestAnimationFrame(loop);
            var dt=Math.min(clock.getDelta(),0.05);
            if(running||state!==ST.IDLE) tickState(dt);
            var ik=solveIK(eeTarget);
            poseArm(ik,gripSpread);
            comRng.rotation.x+=dt*0.6; comRng.rotation.z+=dt*0.35;
            updateUI(); drawLatent();
            orb.update(); renderer.render(scene,camera);
        })();

        // Resize
        window.addEventListener('resize',function(){
            var w=mount.clientWidth||800,h=Math.max(mount.clientHeight||520,480);
            camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
        });

        // Clear latent canvas
        lCtx.fillStyle='#060810'; lCtx.fillRect(0,0,lCv.width,lCv.height);
        console.log('[VAE Uncertainty Simulation] Initialized \u2713');
    } // end boot
});