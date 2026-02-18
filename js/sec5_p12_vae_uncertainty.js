// sec5_p12_vae_uncertainty.js
// VAE Uncertainty Visualization for Robotic Manipulation
// Demonstrates how Variational Autoencoders encode physical uncertainty
// as latent-space distributions — ghost arms emerge from σ during the Moment of Detachment

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('simulation-container');
    if (!container) {
        console.error('VAE simulation container not found!');
        return;
    }

    // ========== HTML STRUCTURE ==========
    container.innerHTML = `
      <div class="vae-sim-root">
        <div class="vae-sim-layout">
          <div class="vae-viewport-area">
            <div class="vae-instruction" id="vae-instruction">
              Adjust the <strong>Center of Mass</strong> sliders to offset the box's weight distribution.
              Press <strong>Execute Sequence</strong> to watch the robot attempt a lift — observe how VAE uncertainty manifests as ghost arms.
            </div>
            <div class="vae-canvas-wrapper" id="vae-canvas-wrapper">
              <div id="vae-three-container"></div>
              <div class="vae-state-badge" id="vae-state-badge">IDLE</div>
              <div class="vae-critical-overlay" id="vae-critical-overlay">
                <div class="vae-critical-icon">⚠</div>
                <div class="vae-critical-title">CRITICAL UNCERTAINTY</div>
                <div class="vae-critical-detail" id="vae-critical-detail">σ exceeded safety threshold — lift aborted</div>
              </div>
            </div>
            <div class="vae-legend">
              <div class="vae-legend-item"><span class="vae-swatch vae-swatch-arm"></span> Primary Arm</div>
              <div class="vae-legend-item"><span class="vae-swatch vae-swatch-ghost"></span> Ghost Arms (σ-samples)</div>
              <div class="vae-legend-item"><span class="vae-swatch vae-swatch-com"></span> Center of Mass</div>
              <div class="vae-legend-item"><span class="vae-swatch vae-swatch-torque"></span> Torque Vector</div>
            </div>
          </div>

          <div class="vae-controls-panel">
            <div class="vae-info-card">
              <div class="vae-card-title">VAE Latent Space q(z|x)</div>
              <div class="vae-card-subtitle">Posterior inference from torque feedback</div>
              <div class="vae-latent-canvas-wrap">
                <canvas id="vae-latent-canvas" width="240" height="240"></canvas>
              </div>
              <div class="vae-latent-readouts">
                <div class="vae-readout-row">
                  <span class="vae-readout-label">μ</span>
                  <span class="vae-readout-val" id="vae-mu-val">(0.00, 0.00)</span>
                </div>
                <div class="vae-readout-row">
                  <span class="vae-readout-label">σ</span>
                  <span class="vae-readout-val" id="vae-sigma-val">0.000</span>
                </div>
                <div class="vae-readout-row vae-readout-highlight">
                  <span class="vae-readout-label">KL(q‖p)</span>
                  <span class="vae-readout-val" id="vae-kl-val">0.000</span>
                </div>
              </div>
            </div>

            <div class="vae-info-card">
              <div class="vae-card-title">Physics Telemetry</div>
              <div class="vae-telemetry-grid">
                <div class="vae-tel-item">
                  <span class="vae-tel-label">Torque τ</span>
                  <span class="vae-tel-val" id="vae-torque-val">(0.0, 0.0, 0.0)</span>
                </div>
                <div class="vae-tel-item">
                  <span class="vae-tel-label">|Δτ|</span>
                  <span class="vae-tel-val" id="vae-dtorque-val">0.000</span>
                </div>
                <div class="vae-tel-item">
                  <span class="vae-tel-label">Tilt (°)</span>
                  <span class="vae-tel-val" id="vae-tilt-val">(0.0, 0.0)</span>
                </div>
                <div class="vae-tel-item">
                  <span class="vae-tel-label">Grip Force</span>
                  <span class="vae-tel-val" id="vae-grip-val">0.0 N</span>
                </div>
              </div>
            </div>

            <div class="vae-info-card">
              <div class="vae-card-title">Center of Mass Control</div>
              <div class="vae-card-subtitle">Offset from geometric center</div>
              <div class="vae-slider-group">
                <div class="vae-slider-row">
                  <label class="vae-slider-label">CoM X</label>
                  <input type="range" id="vae-com-x" min="-8" max="8" step="0.5" value="3">
                  <span class="vae-slider-val" id="vae-com-x-val">3.0</span>
                </div>
                <div class="vae-slider-row">
                  <label class="vae-slider-label">CoM Y</label>
                  <input type="range" id="vae-com-y" min="-12" max="0" step="0.5" value="-5">
                  <span class="vae-slider-val" id="vae-com-y-val">-5.0</span>
                </div>
                <div class="vae-slider-row">
                  <label class="vae-slider-label">CoM Z</label>
                  <input type="range" id="vae-com-z" min="-8" max="8" step="0.5" value="2">
                  <span class="vae-slider-val" id="vae-com-z-val">2.0</span>
                </div>
              </div>
            </div>

            <div class="vae-info-card">
              <div class="vae-card-title">Simulation Parameters</div>
              <div class="vae-slider-group">
                <div class="vae-slider-row">
                  <label class="vae-slider-label">Box Mass</label>
                  <input type="range" id="vae-mass" min="1" max="20" step="0.5" value="8">
                  <span class="vae-slider-val" id="vae-mass-val">8.0 kg</span>
                </div>
                <div class="vae-slider-row">
                  <label class="vae-slider-label">σ Threshold</label>
                  <input type="range" id="vae-threshold" min="0.5" max="3.0" step="0.1" value="1.8">
                  <span class="vae-slider-val" id="vae-threshold-val">1.80</span>
                </div>
                <div class="vae-slider-row">
                  <label class="vae-slider-label">Damping C<sub>d</sub></label>
                  <input type="range" id="vae-damping" min="10" max="50" step="1" value="28">
                  <span class="vae-slider-val" id="vae-damping-val">28</span>
                </div>
              </div>
            </div>

            <div class="vae-button-row">
              <button class="vae-btn vae-btn-primary" id="vae-execute-btn">
                <span class="vae-btn-icon">▶</span> Execute Sequence
              </button>
              <button class="vae-btn vae-btn-secondary" id="vae-reset-btn">
                <span class="vae-btn-icon">↺</span> Reset
              </button>
            </div>

            <div class="vae-safety-bar" id="vae-safety-bar">
              <div class="vae-safety-label">Uncertainty σ</div>
              <div class="vae-safety-track">
                <div class="vae-safety-fill" id="vae-safety-fill"></div>
                <div class="vae-safety-thresh" id="vae-safety-thresh"></div>
              </div>
              <div class="vae-safety-nums">
                <span>0</span>
                <span id="vae-safety-current">0.00</span>
                <span>3.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ========== INJECT CSS ==========
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .vae-sim-root {
        width: 100%;
        font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
        color: #f1f5f9;
        background: #0b0e14;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .vae-sim-layout {
        display: flex;
        gap: 0;
        min-height: 700px;
      }
      @media (max-width: 1100px) {
        .vae-sim-layout { flex-direction: column; }
        .vae-viewport-area { min-height: 450px; }
      }
      .vae-viewport-area {
        flex: 1 1 60%;
        display: flex;
        flex-direction: column;
        position: relative;
        background: #0b0e14;
      }
      .vae-instruction {
        padding: 10px 16px;
        font-size: 0.75rem;
        color: rgba(255,255,255,0.5);
        background: rgba(0,0,0,0.3);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        line-height: 1.4;
      }
      .vae-instruction strong {
        color: #ffa726;
      }
      .vae-canvas-wrapper {
        flex: 1;
        position: relative;
        min-height: 500px;
      }
      #vae-three-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0; left: 0;
      }
      #vae-three-container canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }
      .vae-state-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        padding: 5px 14px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(255,255,255,0.15);
        color: #64b4ff;
        backdrop-filter: blur(8px);
        z-index: 10;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      .vae-state-badge.state-lift {
        color: #ffa726;
        border-color: rgba(255,167,38,0.4);
        box-shadow: 0 0 20px rgba(255,167,38,0.2);
      }
      .vae-state-badge.state-critical {
        color: #ff5252;
        border-color: rgba(255,82,82,0.5);
        box-shadow: 0 0 20px rgba(255,82,82,0.3);
        animation: vae-pulse-badge 0.6s ease-in-out infinite alternate;
      }
      @keyframes vae-pulse-badge {
        from { opacity: 0.7; }
        to { opacity: 1; }
      }
      .vae-critical-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(180, 20, 20, 0.15);
        backdrop-filter: blur(2px);
        z-index: 20;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      .vae-critical-overlay.active {
        opacity: 1;
      }
      .vae-critical-icon {
        font-size: 3rem;
        color: #ff5252;
        animation: vae-critical-pulse 0.8s ease-in-out infinite alternate;
      }
      @keyframes vae-critical-pulse {
        from { transform: scale(1); opacity: 0.6; }
        to { transform: scale(1.15); opacity: 1; }
      }
      .vae-critical-title {
        font-size: 1.3rem;
        font-weight: 800;
        color: #ff5252;
        letter-spacing: 0.15em;
        margin-top: 8px;
      }
      .vae-critical-detail {
        font-size: 0.75rem;
        color: rgba(255,82,82,0.8);
        margin-top: 4px;
      }
      .vae-legend {
        display: flex;
        gap: 18px;
        padding: 8px 16px;
        background: rgba(0,0,0,0.3);
        border-top: 1px solid rgba(255,255,255,0.06);
        flex-wrap: wrap;
      }
      .vae-legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.68rem;
        color: rgba(255,255,255,0.5);
      }
      .vae-swatch {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }
      .vae-swatch-arm { background: #b0bec5; }
      .vae-swatch-ghost { background: rgba(255,167,38,0.5); }
      .vae-swatch-com { background: #ff5252; }
      .vae-swatch-torque { background: #69f0ae; }

      /* ---- Controls Panel ---- */
      .vae-controls-panel {
        flex: 0 0 320px;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        background: rgba(15, 20, 30, 0.95);
        border-left: 1px solid rgba(255,255,255,0.06);
        overflow-y: auto;
        max-height: 780px;
      }
      @media (max-width: 1100px) {
        .vae-controls-panel {
          flex: none;
          max-width: none;
          max-height: none;
          border-left: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
      }
      .vae-info-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 8px;
        padding: 10px 12px;
      }
      .vae-card-title {
        font-weight: 700;
        font-size: 0.82rem;
        color: rgba(255,255,255,0.85);
        margin-bottom: 2px;
      }
      .vae-card-subtitle {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.35);
        margin-bottom: 8px;
      }

      /* Latent Canvas */
      .vae-latent-canvas-wrap {
        display: flex;
        justify-content: center;
        margin: 6px 0;
      }
      #vae-latent-canvas {
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.08);
        background: #080a0f;
      }
      .vae-latent-readouts {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .vae-readout-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
      }
      .vae-readout-label {
        color: rgba(255,255,255,0.4);
      }
      .vae-readout-val {
        font-family: 'JetBrains Mono', monospace;
        color: #64b4ff;
      }
      .vae-readout-highlight .vae-readout-val {
        color: #ffa726;
      }

      /* Telemetry */
      .vae-telemetry-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .vae-tel-item {
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
        padding: 6px 8px;
      }
      .vae-tel-label {
        display: block;
        font-size: 0.6rem;
        color: rgba(255,255,255,0.35);
        margin-bottom: 2px;
      }
      .vae-tel-val {
        font-size: 0.72rem;
        color: #69f0ae;
        font-family: 'JetBrains Mono', monospace;
      }

      /* Sliders */
      .vae-slider-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .vae-slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .vae-slider-label {
        width: 72px;
        font-size: 0.72rem;
        color: rgba(255,255,255,0.5);
        flex-shrink: 0;
      }
      .vae-slider-row input[type="range"] {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255,255,255,0.08);
        height: 5px;
        border-radius: 3px;
        cursor: pointer;
        outline: none;
      }
      .vae-slider-row input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: #ef6c00;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.15s;
      }
      .vae-slider-row input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.25);
      }
      .vae-slider-row input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #ef6c00;
        border-radius: 50%;
        border: none;
        cursor: pointer;
      }
      .vae-slider-val {
        width: 48px;
        text-align: right;
        font-size: 0.72rem;
        color: #ffa726;
        font-family: 'JetBrains Mono', monospace;
        flex-shrink: 0;
      }

      /* Buttons */
      .vae-button-row {
        display: flex;
        gap: 8px;
      }
      .vae-btn {
        flex: 1;
        padding: 10px 12px;
        border: none;
        border-radius: 6px;
        font-weight: 700;
        font-family: inherit;
        font-size: 0.78rem;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .vae-btn-icon {
        font-size: 0.9rem;
      }
      .vae-btn-primary {
        background: linear-gradient(135deg, #ef6c00, #ff9800);
        color: #fff;
      }
      .vae-btn-primary:hover {
        background: linear-gradient(135deg, #f57c00, #ffa726);
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(239,108,0,0.3);
      }
      .vae-btn-primary:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .vae-btn-secondary {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.7);
      }
      .vae-btn-secondary:hover {
        background: rgba(255,255,255,0.12);
        color: #fff;
      }

      /* Safety Bar */
      .vae-safety-bar {
        padding: 8px 0;
      }
      .vae-safety-label {
        font-size: 0.68rem;
        color: rgba(255,255,255,0.4);
        margin-bottom: 4px;
      }
      .vae-safety-track {
        position: relative;
        height: 8px;
        background: rgba(255,255,255,0.06);
        border-radius: 4px;
        overflow: visible;
      }
      .vae-safety-fill {
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(90deg, #69f0ae, #ffa726, #ff5252);
        width: 0%;
        transition: width 0.15s ease;
      }
      .vae-safety-thresh {
        position: absolute;
        top: -3px;
        width: 2px;
        height: 14px;
        background: #ff5252;
        border-radius: 1px;
        left: 60%;
        transition: left 0.15s ease;
      }
      .vae-safety-nums {
        display: flex;
        justify-content: space-between;
        font-size: 0.6rem;
        color: rgba(255,255,255,0.3);
        margin-top: 2px;
      }
      #vae-safety-current {
        color: #ffa726;
        font-weight: 700;
      }
    `;
    document.head.appendChild(styleEl);

    // ========== DOM REFS ==========
    const threeContainer = document.getElementById('vae-three-container');
    const stateBadge = document.getElementById('vae-state-badge');
    const criticalOverlay = document.getElementById('vae-critical-overlay');
    const criticalDetail = document.getElementById('vae-critical-detail');

    const latentCanvas = document.getElementById('vae-latent-canvas');
    const latentCtx = latentCanvas.getContext('2d');

    const muValEl = document.getElementById('vae-mu-val');
    const sigmaValEl = document.getElementById('vae-sigma-val');
    const klValEl = document.getElementById('vae-kl-val');
    const torqueValEl = document.getElementById('vae-torque-val');
    const dtorqueValEl = document.getElementById('vae-dtorque-val');
    const tiltValEl = document.getElementById('vae-tilt-val');
    const gripValEl = document.getElementById('vae-grip-val');

    const comXSlider = document.getElementById('vae-com-x');
    const comYSlider = document.getElementById('vae-com-y');
    const comZSlider = document.getElementById('vae-com-z');
    const comXVal = document.getElementById('vae-com-x-val');
    const comYVal = document.getElementById('vae-com-y-val');
    const comZVal = document.getElementById('vae-com-z-val');

    const massSlider = document.getElementById('vae-mass');
    const thresholdSlider = document.getElementById('vae-threshold');
    const dampingSlider = document.getElementById('vae-damping');
    const massVal = document.getElementById('vae-mass-val');
    const thresholdVal = document.getElementById('vae-threshold-val');
    const dampingVal = document.getElementById('vae-damping-val');

    const executeBtn = document.getElementById('vae-execute-btn');
    const resetBtn = document.getElementById('vae-reset-btn');

    const safetyFill = document.getElementById('vae-safety-fill');
    const safetyThresh = document.getElementById('vae-safety-thresh');
    const safetyCurrent = document.getElementById('vae-safety-current');

    // ========== SIMULATION STATE ==========
    const STATES = {
        IDLE: 'IDLE',
        APPROACH: 'APPROACH',
        DESCEND: 'DESCEND',
        GRASP: 'GRASP',
        LIFT: 'LIFT',
        CRITICAL: 'CRITICAL',
        ABORT: 'ABORT'
    };

    let simState = STATES.IDLE;
    let stateTimer = 0;
    let running = false;

    // Physics state
    const physics = {
        inertia: 4.5,
        damping: 28,
        mass: 8,
        gravity: 9.81,
        comOffset: new THREE.Vector3(3, -5, 2),
        torque: new THREE.Vector3(),
        angularVel: new THREE.Vector3(),
        boxTilt: new THREE.Quaternion(),
        gripForce: 0,
        liftHeight: 0,
        detached: false
    };

    // VAE state
    const vae = {
        mu: [0, 0],
        sigma: 0,
        latentHistory: [],
        ghostEpsilons: [],     // smoothed noise per ghost
        numGhosts: 5,
        threshold: 1.8,
        smoothAlpha: 0.92       // low-pass filter coefficient
    };

    // Initialize smoothed noise for ghosts
    for (let i = 0; i < vae.numGhosts; i++) {
        vae.ghostEpsilons.push({ x: 0, y: 0 });
    }

    // Arm IK targets
    const armIK = {
        homeBase: new THREE.Vector3(0, 0, 0),
        homeElbow: new THREE.Vector3(0, 20, 5),
        homeWrist: new THREE.Vector3(0, 35, 10),
        homeEE: new THREE.Vector3(0, 45, 0),
        targetEE: new THREE.Vector3(0, 45, 0),
        currentEE: new THREE.Vector3(0, 45, 0),
        gripOpen: 8,
        gripCurrent: 8
    };

    const boxPos = new THREE.Vector3(20, 0, 0);
    const boxSize = { w: 20, h: 30, d: 20 };

    // ========== THREE.JS SETUP ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a0f);
    scene.fog = new THREE.FogExp2(0x080a0f, 0.003);

    const camera = new THREE.PerspectiveCamera(
        50,
        threeContainer.clientWidth / Math.max(threeContainer.clientHeight, 400),
        0.1,
        500
    );
    camera.position.set(40, 50, 60);
    camera.lookAt(10, 15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(threeContainer.clientWidth, Math.max(threeContainer.clientHeight, 400));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    threeContainer.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(10, 15, 0);
    controls.minDistance = 30;
    controls.maxDistance = 150;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    mainLight.position.set(30, 60, 40);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 150;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8090ff, 0.3);
    fillLight.position.set(-20, 30, -20);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffa726, 0.5, 100);
    rimLight.position.set(-10, 40, 30);
    scene.add(rimLight);

    // ========== GROUND ==========
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1a1e28,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 20, 0x2a2e38, 0x1a1e28);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // ========== MATERIALS ==========
    const metalMat = new THREE.MeshStandardMaterial({
        color: 0x7a8a9a,
        metalness: 0.8,
        roughness: 0.3
    });
    const jointMat = new THREE.MeshStandardMaterial({
        color: 0x505a6a,
        metalness: 0.9,
        roughness: 0.2
    });
    const gripperMat = new THREE.MeshStandardMaterial({
        color: 0x90a0b0,
        metalness: 0.7,
        roughness: 0.35
    });
    const ghostMat = new THREE.MeshStandardMaterial({
        color: 0xff9800,
        metalness: 0.3,
        roughness: 0.6,
        transparent: true,
        opacity: 0.18,
        depthWrite: false
    });
    const boxMat = new THREE.MeshStandardMaterial({
        color: 0x3a5a8a,
        transparent: true,
        opacity: 0.4,
        roughness: 0.5,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    const boxEdgeMat = new THREE.LineBasicMaterial({
        color: 0x64b4ff,
        transparent: true,
        opacity: 0.6
    });
    const comMat = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xff2222,
        emissiveIntensity: 0.6,
        metalness: 0.2,
        roughness: 0.4
    });
    const torqueArrowMat = new THREE.MeshStandardMaterial({
        color: 0x69f0ae,
        emissive: 0x69f0ae,
        emissiveIntensity: 0.4,
        metalness: 0.2,
        roughness: 0.5
    });

    // ========== BUILD ROBOT ARM ==========
    const armGroup = new THREE.Group();
    scene.add(armGroup);

    // Base pedestal
    const baseGeo = new THREE.CylinderGeometry(5, 6, 3, 32);
    const baseMesh = new THREE.Mesh(baseGeo, jointMat);
    baseMesh.position.y = 1.5;
    baseMesh.castShadow = true;
    armGroup.add(baseMesh);

    // Joint 0 (base rotating joint)
    const joint0Geo = new THREE.SphereGeometry(2.2, 24, 24);
    const joint0 = new THREE.Mesh(joint0Geo, jointMat);
    joint0.position.y = 3;
    joint0.castShadow = true;
    armGroup.add(joint0);

    // Link 1 (lower arm)
    const link1Geo = new THREE.CylinderGeometry(1.8, 2.0, 20, 16);
    const link1 = new THREE.Mesh(link1Geo, metalMat);
    link1.castShadow = true;
    armGroup.add(link1);

    // Joint 1 (elbow)
    const joint1 = new THREE.Mesh(joint0Geo.clone(), jointMat);
    joint1.castShadow = true;
    armGroup.add(joint1);

    // Link 2 (upper arm)
    const link2Geo = new THREE.CylinderGeometry(1.6, 1.8, 18, 16);
    const link2 = new THREE.Mesh(link2Geo, metalMat);
    link2.castShadow = true;
    armGroup.add(link2);

    // Joint 2 (wrist)
    const wristJointGeo = new THREE.SphereGeometry(1.8, 24, 24);
    const joint2 = new THREE.Mesh(wristJointGeo, jointMat);
    joint2.castShadow = true;
    armGroup.add(joint2);

    // Gripper bracket
    const gripperGroup = new THREE.Group();
    armGroup.add(gripperGroup);

    const bracketGeo = new THREE.BoxGeometry(12, 2, 3);
    const bracket = new THREE.Mesh(bracketGeo, gripperMat);
    bracket.castShadow = true;
    gripperGroup.add(bracket);

    // Fingers
    const fingerGeo = new THREE.BoxGeometry(1.5, 8, 2.5);
    const fingerL = new THREE.Mesh(fingerGeo, gripperMat);
    fingerL.castShadow = true;
    gripperGroup.add(fingerL);

    const fingerR = new THREE.Mesh(fingerGeo, gripperMat);
    fingerR.castShadow = true;
    gripperGroup.add(fingerR);

    // ========== BUILD GHOST ARMS ==========
    const ghostArms = [];
    for (let i = 0; i < vae.numGhosts; i++) {
        const ghost = {
            group: new THREE.Group(),
            link1: new THREE.Mesh(link1Geo.clone(), ghostMat.clone()),
            joint1: new THREE.Mesh(joint0Geo.clone(), ghostMat.clone()),
            link2: new THREE.Mesh(link2Geo.clone(), ghostMat.clone()),
            joint2: new THREE.Mesh(wristJointGeo.clone(), ghostMat.clone()),
            bracket: new THREE.Mesh(bracketGeo.clone(), ghostMat.clone()),
            fingerL: new THREE.Mesh(fingerGeo.clone(), ghostMat.clone()),
            fingerR: new THREE.Mesh(fingerGeo.clone(), ghostMat.clone())
        };
        ghost.group.add(ghost.link1, ghost.joint1, ghost.link2, ghost.joint2,
            ghost.bracket, ghost.fingerL, ghost.fingerR);
        ghost.group.visible = false;
        scene.add(ghost.group);
        ghostArms.push(ghost);
    }

    // ========== BUILD BOX ==========
    const boxGroup = new THREE.Group();
    boxGroup.position.copy(boxPos);
    scene.add(boxGroup);

    const boxGeo = new THREE.BoxGeometry(boxSize.w, boxSize.h, boxSize.d);
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.position.y = boxSize.h / 2;
    boxMesh.castShadow = true;
    boxGroup.add(boxMesh);

    const boxEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        boxEdgeMat
    );
    boxEdges.position.y = boxSize.h / 2;
    boxGroup.add(boxEdges);

    // CoM sphere
    const comGeo = new THREE.SphereGeometry(1.5, 20, 20);
    const comSphere = new THREE.Mesh(comGeo, comMat);
    comSphere.position.set(
        physics.comOffset.x,
        boxSize.h / 2 + physics.comOffset.y,
        physics.comOffset.z
    );
    boxGroup.add(comSphere);

    // CoM glow ring
    const comRingGeo = new THREE.RingGeometry(2.0, 2.6, 32);
    const comRingMat = new THREE.MeshBasicMaterial({
        color: 0xff5252,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const comRing = new THREE.Mesh(comRingGeo, comRingMat);
    comRing.position.copy(comSphere.position);
    boxGroup.add(comRing);

    // Torque arrow (created dynamically)
    let torqueArrow = null;

    function updateTorqueArrow(torqueVec) {
        if (torqueArrow) {
            boxGroup.remove(torqueArrow);
            torqueArrow.traverse(c => { if (c.geometry) c.geometry.dispose(); });
        }
        const len = torqueVec.length();
        if (len < 0.1) return;

        const dir = torqueVec.clone().normalize();
        const arrowLen = Math.min(len * 2, 25);
        torqueArrow = new THREE.ArrowHelper(
            dir, 
            new THREE.Vector3(0, boxSize.h, 0),
            arrowLen,
            0x69f0ae,
            arrowLen * 0.2,
            arrowLen * 0.1
        );
        // Override materials
        torqueArrow.line.material = new THREE.LineBasicMaterial({ color: 0x69f0ae });
        torqueArrow.cone.material = torqueArrowMat;
        boxGroup.add(torqueArrow);
    }

    // ========== ARM INVERSE KINEMATICS (Analytical 3-joint) ==========
    function solveArmIK(targetEE, gripOpen) {
        // Simple 3-link IK: base→elbow→wrist→EE
        const base = new THREE.Vector3(0, 3, 0);
        const L1 = 20; // link1 length
        const L2 = 18; // link2 length

        const toTarget = targetEE.clone().sub(base);
        const dist = toTarget.length();
        const maxReach = L1 + L2 - 1;
        const clampedDist = Math.min(dist, maxReach);

        const dir = toTarget.clone().normalize();
        const effectiveTarget = base.clone().add(dir.clone().multiplyScalar(clampedDist));

        // 2-link IK in the vertical plane
        const dx = Math.sqrt(
            (effectiveTarget.x - base.x) ** 2 +
            (effectiveTarget.z - base.z) ** 2
        );
        const dy = effectiveTarget.y - base.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        let cos2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
        cos2 = Math.max(-0.99, Math.min(0.99, cos2));
        const theta2 = Math.acos(cos2);
        const theta1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(theta2), L1 + L2 * Math.cos(theta2));

        // Horizontal angle
        const hAngle = Math.atan2(effectiveTarget.z - base.z, effectiveTarget.x - base.x);

        // Compute joint positions
        const elbowLocal = new THREE.Vector3(
            L1 * Math.cos(theta1),
            base.y + L1 * Math.sin(theta1),
            0
        );
        // Rotate around Y for horizontal angle
        const elbow = new THREE.Vector3(
            base.x + elbowLocal.x * Math.cos(hAngle),
            elbowLocal.y,
            base.z + elbowLocal.x * Math.sin(hAngle)
        );

        const wristLocal = new THREE.Vector3(
            L1 * Math.cos(theta1) + L2 * Math.cos(theta1 + theta2),
            base.y + L1 * Math.sin(theta1) + L2 * Math.sin(theta1 + theta2),
            0
        );
        const wrist = new THREE.Vector3(
            base.x + wristLocal.x * Math.cos(hAngle),
            wristLocal.y,
            base.z + wristLocal.x * Math.sin(hAngle)
        );

        return { base, elbow, wrist, ee: effectiveTarget, gripOpen };
    }

    function applyArmPose(pose, arm, isGhost) {
        const { base, elbow, wrist, ee, gripOpen } = pose;

        // Link 1: between base and elbow
        const mid1 = base.clone().add(elbow).multiplyScalar(0.5);
        arm.link1 = arm.link1 || link1;
        arm.link1.position.copy(mid1);
        arm.link1.lookAt(elbow);
        arm.link1.rotateX(Math.PI / 2);
        const l1Len = base.distanceTo(elbow);
        arm.link1.scale.y = l1Len / 20;

        // Joint 1 at elbow
        (arm.joint1 || joint1).position.copy(elbow);

        // Link 2: between elbow and wrist
        const mid2 = elbow.clone().add(wrist).multiplyScalar(0.5);
        arm.link2 = arm.link2 || link2;
        arm.link2.position.copy(mid2);
        arm.link2.lookAt(wrist);
        arm.link2.rotateX(Math.PI / 2);
        const l2Len = elbow.distanceTo(wrist);
        arm.link2.scale.y = l2Len / 18;

        // Joint 2 at wrist
        (arm.joint2 || joint2).position.copy(wrist);

        // Gripper at EE
        const gGroup = arm.bracket ? arm : gripperGroup;
        if (arm.bracket) {
            arm.bracket.position.copy(ee);
            arm.fingerL.position.set(ee.x - gripOpen / 2, ee.y - 4, ee.z);
            arm.fingerR.position.set(ee.x + gripOpen / 2, ee.y - 4, ee.z);
        } else {
            gripperGroup.position.copy(ee);
            fingerL.position.set(-gripOpen / 2, -4, 0);
            fingerR.position.set(gripOpen / 2, -4, 0);
        }
    }

    function applyMainArmPose(pose) {
        const { base, elbow, wrist, ee, gripOpen } = pose;

        // Link 1
        const mid1 = base.clone().add(elbow).multiplyScalar(0.5);
        link1.position.copy(mid1);
        link1.lookAt(elbow);
        link1.rotateX(Math.PI / 2);
        link1.scale.y = base.distanceTo(elbow) / 20;

        joint1.position.copy(elbow);

        // Link 2
        const mid2 = elbow.clone().add(wrist).multiplyScalar(0.5);
        link2.position.copy(mid2);
        link2.lookAt(wrist);
        link2.rotateX(Math.PI / 2);
        link2.scale.y = elbow.distanceTo(wrist) / 18;

        joint2.position.copy(wrist);

        // Gripper
        gripperGroup.position.copy(ee);
        fingerL.position.set(-gripOpen / 2, -4, 0);
        fingerR.position.set(gripOpen / 2, -4, 0);
    }

    // ========== STATE MACHINE TARGETS ==========
    const hoverAboveBox = new THREE.Vector3(boxPos.x, boxSize.h + 50, boxPos.z);
    const boxTop = new THREE.Vector3(boxPos.x, boxSize.h + 8, boxPos.z); // stop above surface

    function getHomeEE() {
        return new THREE.Vector3(0, 45, 0);
    }

    function lerpVec3(a, b, t) {
        return a.clone().lerp(b, Math.min(1, t));
    }

    function smoothstep(t) {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
    }

    // ========== PHYSICS ENGINE ==========
    function computeTorque(gripPoint, comWorld) {
        // r = CoM position relative to grip point
        const r = comWorld.clone().sub(gripPoint);
        // Gravitational force
        const Fg = new THREE.Vector3(0, -physics.mass * physics.gravity, 0);
        // τ = r × F
        const tau = new THREE.Vector3().crossVectors(r, Fg);
        return tau;
    }

    function updatePhysics(dt) {
        if (!physics.detached) return;

        // Spring-mass-damper: I * α = τ - C_d * ω
        const alpha = physics.torque.clone()
            .divideScalar(physics.inertia)
            .sub(physics.angularVel.clone().multiplyScalar(physics.damping / physics.inertia));

        physics.angularVel.add(alpha.clone().multiplyScalar(dt));

        // Apply angular velocity as quaternion rotation
        const dAngle = physics.angularVel.clone().multiplyScalar(dt);
        const dq = new THREE.Quaternion();
        const axis = dAngle.clone().normalize();
        const angle = dAngle.length();
        if (angle > 1e-8) {
            dq.setFromAxisAngle(axis, angle * 0.01); // Scale factor for visible motion
        }
        physics.boxTilt.multiply(dq);
        physics.boxTilt.normalize();
    }

    // ========== VAE ENGINE ==========
    function updateVAE(torqueDiscrepancy) {
        // Map torque discrepancy Δτ → latent space z = [μ, σ]
        // μ encodes the direction of imbalance
        // σ encodes the magnitude of uncertainty
        const dx = torqueDiscrepancy.x;
        const dz = torqueDiscrepancy.z;
        const magnitude = Math.sqrt(dx * dx + dz * dz);

        // μ: normalized direction in latent space
        const scale = 0.08;
        vae.mu[0] = dx * scale;
        vae.mu[1] = dz * scale;

        // σ: distance from trained origin [0,0] = ideal balance
        vae.sigma = magnitude * 0.012;

        // Update ghost epsilons with temporal smoothing (low-pass filter)
        for (let i = 0; i < vae.numGhosts; i++) {
            const rawX = gaussianRandom();
            const rawY = gaussianRandom();
            vae.ghostEpsilons[i].x = vae.smoothAlpha * vae.ghostEpsilons[i].x +
                (1 - vae.smoothAlpha) * rawX;
            vae.ghostEpsilons[i].y = vae.smoothAlpha * vae.ghostEpsilons[i].y +
                (1 - vae.smoothAlpha) * rawY;
        }

        // KL divergence: KL(q(z|x) ‖ p(z)) = -0.5 * Σ(1 + log(σ²) - μ² - σ²)
        const s2 = vae.sigma * vae.sigma + 1e-8;
        const m2 = vae.mu[0] ** 2 + vae.mu[1] ** 2;
        vae.kl = 0.5 * (m2 + 2 * s2 - 2 * Math.log(Math.sqrt(s2)) - 2);

        // Store history for latent canvas trail
        vae.latentHistory.push([vae.mu[0], vae.mu[1], vae.sigma]);
        if (vae.latentHistory.length > 200) vae.latentHistory.shift();
    }

    function gaussianRandom() {
        // Box-Muller transform
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // ========== LATENT SPACE CANVAS ==========
    function drawLatentSpace() {
        const w = latentCanvas.width;
        const h = latentCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 60;

        // Clear with slight fade for trail effect
        latentCtx.fillStyle = 'rgba(8, 10, 15, 0.15)';
        latentCtx.fillRect(0, 0, w, h);

        // Grid
        latentCtx.strokeStyle = 'rgba(255,255,255,0.04)';
        latentCtx.lineWidth = 0.5;
        for (let i = -3; i <= 3; i++) {
            const px = cx + i * scale;
            const py = cy + i * scale;
            latentCtx.beginPath();
            latentCtx.moveTo(px, 0); latentCtx.lineTo(px, h);
            latentCtx.stroke();
            latentCtx.beginPath();
            latentCtx.moveTo(0, py); latentCtx.lineTo(w, py);
            latentCtx.stroke();
        }

        // Axes
        latentCtx.strokeStyle = 'rgba(255,255,255,0.12)';
        latentCtx.lineWidth = 1;
        latentCtx.beginPath();
        latentCtx.moveTo(cx, 0); latentCtx.lineTo(cx, h);
        latentCtx.stroke();
        latentCtx.beginPath();
        latentCtx.moveTo(0, cy); latentCtx.lineTo(w, cy);
        latentCtx.stroke();

        // Threshold circle
        const threshR = vae.threshold * scale;
        latentCtx.strokeStyle = 'rgba(255, 82, 82, 0.3)';
        latentCtx.lineWidth = 1;
        latentCtx.setLineDash([4, 4]);
        latentCtx.beginPath();
        latentCtx.arc(cx, cy, threshR, 0, Math.PI * 2);
        latentCtx.stroke();
        latentCtx.setLineDash([]);

        // σ ellipse
        if (vae.sigma > 0.01) {
            const sr = vae.sigma * scale;
            const mx = cx + vae.mu[0] * scale;
            const my = cy - vae.mu[1] * scale;

            // Filled gaussian blob
            const grad = latentCtx.createRadialGradient(mx, my, 0, mx, my, sr * 2);
            grad.addColorStop(0, 'rgba(255, 152, 0, 0.25)');
            grad.addColorStop(0.5, 'rgba(255, 152, 0, 0.08)');
            grad.addColorStop(1, 'rgba(255, 152, 0, 0)');
            latentCtx.fillStyle = grad;
            latentCtx.beginPath();
            latentCtx.arc(mx, my, sr * 2, 0, Math.PI * 2);
            latentCtx.fill();

            // 1-σ contour
            latentCtx.strokeStyle = 'rgba(255, 167, 38, 0.6)';
            latentCtx.lineWidth = 1.5;
            latentCtx.beginPath();
            latentCtx.arc(mx, my, sr, 0, Math.PI * 2);
            latentCtx.stroke();

            // Ghost samples
            latentCtx.fillStyle = 'rgba(255, 167, 38, 0.7)';
            for (let i = 0; i < vae.numGhosts; i++) {
                const gx = mx + vae.ghostEpsilons[i].x * sr;
                const gy = my - vae.ghostEpsilons[i].y * sr;
                latentCtx.beginPath();
                latentCtx.arc(gx, gy, 2.5, 0, Math.PI * 2);
                latentCtx.fill();
            }

            // μ point
            latentCtx.fillStyle = '#ff9800';
            latentCtx.beginPath();
            latentCtx.arc(mx, my, 4, 0, Math.PI * 2);
            latentCtx.fill();
        }

        // Origin marker
        latentCtx.fillStyle = 'rgba(100, 180, 255, 0.5)';
        latentCtx.beginPath();
        latentCtx.arc(cx, cy, 3, 0, Math.PI * 2);
        latentCtx.fill();

        // History trail
        if (vae.latentHistory.length > 2) {
            latentCtx.strokeStyle = 'rgba(255, 167, 38, 0.15)';
            latentCtx.lineWidth = 1;
            latentCtx.beginPath();
            for (let i = 0; i < vae.latentHistory.length; i++) {
                const [hm0, hm1] = vae.latentHistory[i];
                const hx = cx + hm0 * scale;
                const hy = cy - hm1 * scale;
                if (i === 0) latentCtx.moveTo(hx, hy);
                else latentCtx.lineTo(hx, hy);
            }
            latentCtx.stroke();
        }

        // Labels
        latentCtx.fillStyle = 'rgba(255,255,255,0.3)';
        latentCtx.font = '9px JetBrains Mono, monospace';
        latentCtx.fillText('z₁', w - 16, cy - 4);
        latentCtx.fillText('z₂', cx + 4, 12);
        latentCtx.fillText('p(z)', cx + 4, cy + 12);
    }

    // ========== UI UPDATE ==========
    function updateUI() {
        muValEl.textContent = `(${vae.mu[0].toFixed(3)}, ${vae.mu[1].toFixed(3)})`;
        sigmaValEl.textContent = vae.sigma.toFixed(3);
        klValEl.textContent = (vae.kl || 0).toFixed(3);

        torqueValEl.textContent = `(${physics.torque.x.toFixed(1)}, ${physics.torque.y.toFixed(1)}, ${physics.torque.z.toFixed(1)})`;
        dtorqueValEl.textContent = physics.torque.length().toFixed(3);

        const euler = new THREE.Euler().setFromQuaternion(physics.boxTilt);
        tiltValEl.textContent = `(${(euler.x * 180 / Math.PI).toFixed(1)}, ${(euler.z * 180 / Math.PI).toFixed(1)})`;
        gripValEl.textContent = `${physics.gripForce.toFixed(1)} N`;

        // Safety bar
        const pct = Math.min(vae.sigma / 3.0, 1.0) * 100;
        safetyFill.style.width = pct + '%';
        safetyCurrent.textContent = vae.sigma.toFixed(2);
        safetyThresh.style.left = (vae.threshold / 3.0 * 100) + '%';

        // State badge
        stateBadge.textContent = simState;
        stateBadge.className = 'vae-state-badge';
        if (simState === STATES.LIFT) stateBadge.classList.add('state-lift');
        if (simState === STATES.CRITICAL || simState === STATES.ABORT)
            stateBadge.classList.add('state-critical');
    }

    // ========== STATE MACHINE ==========
    function transitionState(newState) {
        simState = newState;
        stateTimer = 0;

        if (newState === STATES.CRITICAL || newState === STATES.ABORT) {
            criticalOverlay.classList.add('active');
            criticalDetail.textContent = `σ = ${vae.sigma.toFixed(3)} exceeded threshold ${vae.threshold.toFixed(2)} — lift aborted`;
        } else {
            criticalOverlay.classList.remove('active');
        }

        if (newState === STATES.IDLE) {
            executeBtn.disabled = false;
            running = false;
            // Hide ghosts
            ghostArms.forEach(g => g.group.visible = false);
        }
    }

    function tickStateMachine(dt) {
        stateTimer += dt;
        const t = stateTimer;

        switch (simState) {
            case STATES.IDLE:
                // Arm at home
                armIK.targetEE = getHomeEE();
                armIK.gripOpen = 8;
                break;

            case STATES.APPROACH: {
                // Move to hover above box
                const dur = 1.5;
                const s = smoothstep(t / dur);
                armIK.targetEE = lerpVec3(getHomeEE(), hoverAboveBox, s);
                armIK.gripOpen = 8;
                if (t >= dur) transitionState(STATES.DESCEND);
                break;
            }
            case STATES.DESCEND: {
                // Descend to box surface — CLAMP: no penetration
                const dur = 1.2;
                const s = smoothstep(t / dur);
                armIK.targetEE = lerpVec3(hoverAboveBox, boxTop, s);
                // Clamp Y to box surface
                armIK.targetEE.y = Math.max(armIK.targetEE.y, boxSize.h + 8);
                armIK.gripOpen = 8;
                if (t >= dur) transitionState(STATES.GRASP);
                break;
            }
            case STATES.GRASP: {
                // Close fingers on box edges
                const dur = 0.8;
                const s = smoothstep(t / dur);
                armIK.targetEE = boxTop.clone();
                armIK.gripOpen = 8 - s * (8 - (boxSize.w / 2 + 1));
                physics.gripForce = s * physics.mass * physics.gravity * 1.5;
                if (t >= dur) {
                    physics.detached = false; // not yet
                    transitionState(STATES.LIFT);
                }
                break;
            }
            case STATES.LIFT: {
                // Vertical pull — Moment of Detachment
                const liftSpeed = 12; // units/sec
                physics.liftHeight = liftSpeed * t;

                const liftTarget = boxTop.clone();
                liftTarget.y += physics.liftHeight;
                armIK.targetEE = liftTarget;
                armIK.gripOpen = boxSize.w / 2 + 1;

                // Detachment moment
                if (t > 0.3 && !physics.detached) {
                    physics.detached = true;
                }

                if (physics.detached) {
                    // Move box with gripper
                    boxGroup.position.set(
                        boxPos.x,
                        physics.liftHeight,
                        boxPos.z
                    );

                    // Compute torque from CoM offset
                    const gripWorld = armIK.targetEE.clone();
                    const comWorld = new THREE.Vector3(
                        boxPos.x + physics.comOffset.x,
                        physics.liftHeight + boxSize.h / 2 + physics.comOffset.y,
                        boxPos.z + physics.comOffset.z
                    );
                    physics.torque = computeTorque(gripWorld, comWorld);

                    // Physics simulation
                    updatePhysics(dt);

                    // Apply tilt to box
                    boxGroup.quaternion.copy(physics.boxTilt);

                    // Update torque arrow
                    updateTorqueArrow(physics.torque.clone().multiplyScalar(0.002));

                    // VAE inference — continuous every frame
                    const torqueDiscrepancy = physics.torque.clone();
                    updateVAE(torqueDiscrepancy);

                    // Ghost arms: visible with σ-proportional spread
                    for (let i = 0; i < vae.numGhosts; i++) {
                        const ghost = ghostArms[i];
                        ghost.group.visible = true;

                        // θ_ghost = μ_θ + σ * ε (smooth)
                        const perturbX = vae.mu[0] + vae.sigma * vae.ghostEpsilons[i].x * 15;
                        const perturbZ = vae.mu[1] + vae.sigma * vae.ghostEpsilons[i].y * 15;

                        const ghostTarget = armIK.targetEE.clone();
                        ghostTarget.x += perturbX;
                        ghostTarget.z += perturbZ;
                        ghostTarget.y += vae.sigma * vae.ghostEpsilons[i].x * 3;

                        const ghostPose = solveArmIK(ghostTarget, armIK.gripOpen);
                        applyGhostPose(ghost, ghostPose);

                        // Opacity scales with σ
                        const opacity = Math.min(0.25, vae.sigma * 0.15);
                        [ghost.link1, ghost.joint1, ghost.link2, ghost.joint2,
                            ghost.bracket, ghost.fingerL, ghost.fingerR].forEach(m => {
                            m.material.opacity = opacity;
                        });
                    }

                    // Safety check
                    if (vae.sigma > vae.threshold) {
                        transitionState(STATES.CRITICAL);
                    }

                    // End lift after some time
                    if (physics.liftHeight > 40) {
                        transitionState(STATES.IDLE);
                        resetSimulation();
                    }
                }
                break;
            }
            case STATES.CRITICAL: {
                // Abort animation — lower box back
                const dur = 2.0;
                const s = smoothstep(t / dur);
                physics.liftHeight = Math.max(0, physics.liftHeight * (1 - s));
                boxGroup.position.y = physics.liftHeight;

                // Fade out ghosts
                ghostArms.forEach(g => {
                    [g.link1, g.joint1, g.link2, g.joint2, g.bracket, g.fingerL, g.fingerR]
                        .forEach(m => { m.material.opacity *= 0.95; });
                });

                if (t >= dur) {
                    transitionState(STATES.ABORT);
                }
                break;
            }
            case STATES.ABORT: {
                // Return to home
                const dur = 1.5;
                const s = smoothstep(t / dur);
                armIK.targetEE = lerpVec3(armIK.currentEE.clone(), getHomeEE(), s);
                armIK.gripOpen = 8;

                if (t >= dur) {
                    resetSimulation();
                    transitionState(STATES.IDLE);
                }
                break;
            }
        }
    }

    function applyGhostPose(ghost, pose) {
        const { base, elbow, wrist, ee, gripOpen } = pose;

        // Link 1
        const mid1 = base.clone().add(elbow).multiplyScalar(0.5);
        ghost.link1.position.copy(mid1);
        ghost.link1.lookAt(elbow);
        ghost.link1.rotateX(Math.PI / 2);
        ghost.link1.scale.y = base.distanceTo(elbow) / 20;

        ghost.joint1.position.copy(elbow);

        // Link 2
        const mid2 = elbow.clone().add(wrist).multiplyScalar(0.5);
        ghost.link2.position.copy(mid2);
        ghost.link2.lookAt(wrist);
        ghost.link2.rotateX(Math.PI / 2);
        ghost.link2.scale.y = elbow.distanceTo(wrist) / 18;

        ghost.joint2.position.copy(wrist);

        // Gripper
        ghost.bracket.position.copy(ee);
        ghost.fingerL.position.set(ee.x - gripOpen / 2, ee.y - 4, ee.z);
        ghost.fingerR.position.set(ee.x + gripOpen / 2, ee.y - 4, ee.z);
    }

    // ========== RESET ==========
    function resetSimulation() {
        physics.torque.set(0, 0, 0);
        physics.angularVel.set(0, 0, 0);
        physics.boxTilt.identity();
        physics.gripForce = 0;
        physics.liftHeight = 0;
        physics.detached = false;

        vae.mu = [0, 0];
        vae.sigma = 0;
        vae.kl = 0;
        vae.latentHistory = [];
        for (let i = 0; i < vae.numGhosts; i++) {
            vae.ghostEpsilons[i] = { x: 0, y: 0 };
        }

        boxGroup.position.copy(boxPos);
        boxGroup.quaternion.identity();
        ghostArms.forEach(g => g.group.visible = false);

        if (torqueArrow) {
            boxGroup.remove(torqueArrow);
            torqueArrow = null;
        }

        criticalOverlay.classList.remove('active');
    }

    // ========== SLIDER BINDINGS ==========
    function bindSlider(slider, display, formatter, callback) {
        const update = () => {
            const v = parseFloat(slider.value);
            display.textContent = formatter(v);
            if (callback) callback(v);
        };
        slider.addEventListener('input', update);
        update();
    }

    bindSlider(comXSlider, comXVal, v => v.toFixed(1), v => {
        physics.comOffset.x = v;
        comSphere.position.x = v;
        comRing.position.x = v;
    });
    bindSlider(comYSlider, comYVal, v => v.toFixed(1), v => {
        physics.comOffset.y = v;
        comSphere.position.y = boxSize.h / 2 + v;
        comRing.position.y = boxSize.h / 2 + v;
    });
    bindSlider(comZSlider, comZVal, v => v.toFixed(1), v => {
        physics.comOffset.z = v;
        comSphere.position.z = v;
        comRing.position.z = v;
    });
    bindSlider(massSlider, massVal, v => v.toFixed(1) + ' kg', v => { physics.mass = v; });
    bindSlider(thresholdSlider, thresholdVal, v => v.toFixed(2), v => { vae.threshold = v; });
    bindSlider(dampingSlider, dampingVal, v => v.toFixed(0), v => { physics.damping = v; });

    // ========== BUTTONS ==========
    executeBtn.addEventListener('click', () => {
        if (running) return;
        running = true;
        executeBtn.disabled = true;
        resetSimulation();
        transitionState(STATES.APPROACH);
    });

    resetBtn.addEventListener('click', () => {
        resetSimulation();
        transitionState(STATES.IDLE);
        executeBtn.disabled = false;
        running = false;
    });

    // ========== ANIMATION LOOP ==========
    const clock = new THREE.Clock();
    let lastTime = 0;

    function animate() {
        requestAnimationFrame(animate);

        const dt = Math.min(clock.getDelta(), 0.05); // cap dt

        // State machine
        if (running || simState !== STATES.IDLE) {
            tickStateMachine(dt);
        }

        // Solve & apply IK for main arm
        const mainPose = solveArmIK(armIK.targetEE, armIK.gripOpen);
        applyMainArmPose(mainPose);
        armIK.currentEE.copy(armIK.targetEE);

        // Animate CoM ring rotation
        comRing.rotation.x += dt * 0.5;
        comRing.rotation.y += dt * 0.3;

        // Update UI
        updateUI();
        drawLatentSpace();

        // Render
        controls.update();
        renderer.render(scene, camera);
    }

    // ========== RESIZE ==========
    function onResize() {
        const w = threeContainer.clientWidth;
        const h = Math.max(threeContainer.clientHeight, 400);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // ========== INITIALIZE ==========
    // Set initial arm position
    armIK.targetEE = getHomeEE();
    const initPose = solveArmIK(armIK.targetEE, 8);
    applyMainArmPose(initPose);

    // Clear latent canvas once
    latentCtx.fillStyle = '#080a0f';
    latentCtx.fillRect(0, 0, latentCanvas.width, latentCanvas.height);

    // Go!
    animate();

    console.log('[VAE Uncertainty Simulation] Initialized successfully');
});