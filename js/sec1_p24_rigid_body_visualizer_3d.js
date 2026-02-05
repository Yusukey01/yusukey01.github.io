// rigid_body_visualizer_3d.js
// A Three.js implementation for visualizing SO(3) and SE(3) transformations
// Demonstrates continuous Lie group structure and measure invariance (rigid body motion)

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('rigid-body-visualizer-3d');
    
    if (!container) {
        console.error('Rigid body visualizer container not found!');
        return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="rigid-visualizer-container">
        <div class="rigid-visualizer-layout">
          <div class="rigid-canvas-container">
            <div class="rigid-mode-toggle">
              <button id="mode-so3" class="mode-btn active" data-mode="SO3">
                <span class="mode-icon">↻</span>
                SO(3) Special Orthogonal
              </button>
              <button id="mode-se3" class="mode-btn" data-mode="SE3">
                <span class="mode-icon">⇄</span>
                SE(3) Special Euclidean
              </button>
            </div>
            <div class="instruction" id="rigid-instruction">👆 1-finger drag = rotate object &nbsp;|&nbsp; 🤏 2-finger pinch = zoom &nbsp;|&nbsp; 🖱️ scroll = zoom</div>
            <div id="rigid-canvas-wrapper">
              <div id="three-rigid-container"></div>
            </div>
            <div class="rigid-legend" id="rigid-legend">
              <div class="legend-item"><span class="legend-color top-face"></span> Top face (blue)</div>
              <div class="legend-item"><span class="legend-color bottom-face"></span> Bottom face (red)</div>
              <div class="legend-item"><span class="legend-color marker"></span> Orientation marker</div>
              <div class="legend-item"><span class="legend-color coord-frame"></span> Body frame</div>
            </div>
          </div>
          
          <div class="rigid-controls-panel">
            <div class="rigid-matrix-display" id="rotation-matrix-display">
              <div class="matrix-header">
                <span class="matrix-title">Rotation Matrix R ∈ SO(3)</span>
                <span class="matrix-size">3×3</span>
              </div>
              <div class="matrix-3x3" id="rotation-matrix">
                <div class="matrix-bracket-3x3 left">[</div>
                <div class="matrix-values-3x3">
                  <div class="matrix-row-3x3">
                    <span id="r00">1.000</span><span id="r01">0.000</span><span id="r02">0.000</span>
                  </div>
                  <div class="matrix-row-3x3">
                    <span id="r10">0.000</span><span id="r11">1.000</span><span id="r12">0.000</span>
                  </div>
                  <div class="matrix-row-3x3">
                    <span id="r20">0.000</span><span id="r21">0.000</span><span id="r22">1.000</span>
                  </div>
                </div>
                <div class="matrix-bracket-3x3 right">]</div>
              </div>
              <div class="matrix-verifications">
                <span class="verification-item" id="det-verify">det(R) = 1.000 ✓</span>
                <span class="verification-item" id="orthogonal-verify">RᵀR = I ✓</span>
              </div>
            </div>
            
            <div class="rigid-matrix-display se3-only" id="homogeneous-matrix-display" style="display: none;">
              <div class="matrix-header">
                <span class="matrix-title">Homogeneous Matrix T ∈ SE(3)</span>
                <span class="matrix-size">4×4</span>
              </div>
              <div class="matrix-4x4" id="homogeneous-matrix">
                <div class="matrix-bracket-4x4 left">[</div>
                <div class="matrix-values-4x4">
                  <div class="matrix-row-4x4">
                    <span id="t00">1.000</span><span id="t01">0.000</span><span id="t02">0.000</span>
                    <span class="matrix-separator">│</span><span id="t03" class="translation-value">0.00</span>
                  </div>
                  <div class="matrix-row-4x4">
                    <span id="t10">0.000</span><span id="t11">1.000</span><span id="t12">0.000</span>
                    <span class="matrix-separator">│</span><span id="t13" class="translation-value">0.00</span>
                  </div>
                  <div class="matrix-row-4x4">
                    <span id="t20">0.000</span><span id="t21">0.000</span><span id="t22">1.000</span>
                    <span class="matrix-separator">│</span><span id="t23" class="translation-value">0.00</span>
                  </div>
                  <div class="matrix-row-4x4 bottom-row">
                    <span>0</span><span>0</span><span>0</span>
                    <span class="matrix-separator">│</span><span>1</span>
                  </div>
                </div>
                <div class="matrix-bracket-4x4 right">]</div>
              </div>
              <div class="matrix-structure-note">T = [ R | t ] where R ∈ SO(3), t ∈ ℝ³<br>[ 0 | 1 ]</div>
            </div>
            
            <div class="rigid-representations">
              <div class="repr-title">Alternative Representations</div>
              <div class="repr-grid">
                <div class="repr-item">
                  <span class="repr-label">Euler (ZYX):</span>
                  <span id="euler-angles" class="repr-value">ψ=0° θ=0° φ=0°</span>
                </div>
                <div class="repr-item">
                  <span class="repr-label">Axis-Angle:</span>
                  <span id="axis-angle" class="repr-value">axis=(0,0,1), θ=0°</span>
                </div>
                <div class="repr-item">
                  <span class="repr-label">Quaternion:</span>
                  <span id="quaternion" class="repr-value">(1, 0, 0, 0)</span>
                </div>
              </div>
            </div> 
            
            <div class="rigid-sliders">
              <div class="sliders-section">
                <div class="sliders-header">Rotation Controls (Euler Angles)</div>
                <div class="slider-row">
                  <label class="slider-label">Roll (X):</label>
                  <input type="range" id="roll-slider" min="-180" max="180" value="0" step="1">
                  <span class="slider-value" id="roll-value">0°</span>
                </div>
                <div class="slider-row">
                  <label class="slider-label">Pitch (Y):</label>
                  <input type="range" id="pitch-slider" min="-90" max="90" value="0" step="1">
                  <span class="slider-value" id="pitch-value">0°</span>
                </div>
                <div class="slider-row">
                  <label class="slider-label">Yaw (Z):</label>
                  <input type="range" id="yaw-slider" min="-180" max="180" value="0" step="1">
                  <span class="slider-value" id="yaw-value">0°</span>
                </div>
              </div>
              
              <div class="sliders-section se3-only" id="translation-sliders" style="display: none;">
                <div class="sliders-header">Translation Controls</div>
                <div class="slider-row">
                  <label class="slider-label">X:</label>
                  <input type="range" id="tx-slider" min="-3" max="3" value="0" step="0.1">
                  <span class="slider-value" id="tx-value">0.0</span>
                </div>
                <div class="slider-row">
                  <label class="slider-label">Y:</label>
                  <input type="range" id="ty-slider" min="-3" max="3" value="0" step="0.1">
                  <span class="slider-value" id="ty-value">0.0</span>
                </div>
                <div class="slider-row">
                  <label class="slider-label">Z:</label>
                  <input type="range" id="tz-slider" min="-3" max="3" value="0" step="0.1">
                  <span class="slider-value" id="tz-value">0.0</span>
                </div>
              </div>
            </div>  
            <div class="rigid-buttons">
              <button id="reset-transform" class="secondary-btn">Reset to Identity</button>
              <button id="random-rotation" class="primary-btn">Random Rotation</button>
            </div>

            <div class="rigid-invariants">
              <div class="invariants-title"><span class="invariants-icon">🔒</span> Measure Invariance (Rigidity)</div>
              <div class="invariants-description">These quantities NEVER change under SO(3)/SE(3) — that's why it's "rigid" motion!</div>
              <div class="invariants-grid">
                <div class="invariant-card">
                  <div class="invariant-label">Edge Length</div>
                  <div class="invariant-value" id="edge-length">1.000</div>
                  <div class="invariant-status">preserved ✓</div>
                </div>
                <div class="invariant-card">
                  <div class="invariant-label">Interior Angle</div>
                  <div class="invariant-value" id="interior-angle">120.0°</div>
                  <div class="invariant-status">preserved ✓</div>
                </div>
                <div class="invariant-card">
                  <div class="invariant-label">Volume Scale</div>
                  <div class="invariant-value" id="volume-scale">1.000</div>
                  <div class="invariant-status">|det(R)| = 1 ✓</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .rigid-visualizer-container {
        margin-bottom: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e8eaed;
      }
      .rigid-visualizer-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      @media (min-width: 992px) {
        .rigid-visualizer-layout {
          flex-direction: row;
        }
        .rigid-canvas-container {
          flex: 1;
          order: 1;
        }
        .rigid-controls-panel {
          flex: 1;
          order: 2;
          max-width: 480px;
        }
      }
      .rigid-controls-panel {
        background: rgba(20, 28, 40, 0.95);
        padding: 15px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-height: 90vh;
        overflow-y: auto;
      }
      .rigid-canvas-container {
        display: flex;
        flex-direction: column;
      }
      #rigid-canvas-wrapper {
        position: relative;
        width: 100%;
      }
      #three-rigid-container {
        width: 100%;
        height: 450px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        background: linear-gradient(135deg, #0a0f18 0%, #0f1419 100%);
      }
      .instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.5);
      }
      .rigid-mode-toggle {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }
      .mode-btn {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .mode-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .mode-btn.active {
        background: linear-gradient(135deg, #1565c0, #42a5f5);
        border-color: #64b4ff;
        color: white;
      }
      .mode-icon {
        font-size: 1.1rem;
      }
      .rigid-legend {
        margin-top: 10px;
        display: flex;
        gap: 15px;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
        justify-content: center;
        flex-wrap: wrap;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }
      .top-face { background: #3498db; }
      .bottom-face { background: #e74c3c; }
      .marker { background: #f39c12; }
      .coord-frame { 
        background: linear-gradient(135deg, #e74c3c 33%, #2ecc71 33%, #2ecc71 66%, #3498db 66%);
      }
      .rigid-matrix-display {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .matrix-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .matrix-title {
        font-weight: bold;
        font-size: 0.9rem;
        color: #64b4ff;
      }
      .matrix-size {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
      }
      .matrix-3x3, .matrix-4x4 {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 5px;
        margin-bottom: 10px;
      }
      .matrix-bracket-3x3, .matrix-bracket-4x4 {
        font-size: 3rem;
        font-weight: 100;
        color: rgba(255, 255, 255, 0.4);
        line-height: 1;
      }
      .matrix-values-3x3, .matrix-values-4x4 {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .matrix-row-3x3, .matrix-row-4x4 {
        display: flex;
        gap: 8px;
      }
      .matrix-row-3x3 span, .matrix-row-4x4 span {
        width: 50px;
        text-align: right;
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        color: #64b4ff;
      }
      .matrix-separator {
        color: rgba(255, 255, 255, 0.3) !important;
        width: 10px !important;
        text-align: center !important;
      }
      .translation-value {
        color: #2ecc71 !important;
      }
      .bottom-row span {
        color: rgba(255, 255, 255, 0.4) !important;
      }
      .matrix-verifications {
        display: flex;
        justify-content: center;
        gap: 15px;
        flex-wrap: wrap;
      }
      .verification-item {
        font-size: 0.8rem;
        padding: 4px 10px;
        background: rgba(46, 204, 113, 0.15);
        border: 1px solid rgba(46, 204, 113, 0.3);
        border-radius: 4px;
        color: #2ecc71;
      }
      .matrix-structure-note {
        text-align: center;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        font-family: 'Courier New', monospace;
        line-height: 1.4;
      }
      .rigid-representations {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 12px;
      }
      .repr-title {
        font-weight: bold;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
      }
      .repr-grid {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .repr-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
      }
      .repr-label {
        color: rgba(255, 255, 255, 0.5);
      }
      .repr-value {
        font-family: 'Courier New', monospace;
        color: #64b4ff;
      }
      .rigid-invariants {
        background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(39, 174, 96, 0.05));
        border: 1px solid rgba(46, 204, 113, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .invariants-title {
        font-weight: bold;
        font-size: 0.95rem;
        color: #2ecc71;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .invariants-description {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 10px;
      }
      .invariants-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .invariant-card {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        padding: 8px;
        text-align: center;
      }
      .invariant-label {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 4px;
      }
      .invariant-value {
        font-family: 'Courier New', monospace;
        font-size: 1rem;
        font-weight: bold;
        color: #2ecc71;
        margin-bottom: 2px;
      }
      .invariant-status {
        font-size: 0.65rem;
        color: rgba(46, 204, 113, 0.8);
      }
      .rigid-sliders {
        margin-bottom: 12px;
      }
      .sliders-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .sliders-header {
        font-weight: bold;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .slider-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .slider-label {
        width: 70px;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
      }
      .slider-row input[type="range"] {
        flex: 1;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.1);
        height: 6px;
        border-radius: 3px;
        cursor: pointer;
      }
      .slider-row input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #64b4ff;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s;
      }
      .slider-row input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .slider-value {
        width: 50px;
        text-align: right;
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        color: #64b4ff;
      }
      .rigid-applications {
        background: rgba(106, 27, 154, 0.15);
        border: 1px solid rgba(106, 27, 154, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .rigid-buttons {
        display: flex;
        gap: 10px;
      }
      .primary-btn, .secondary-btn {
        flex: 1;
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.85rem;
      }
      .primary-btn {
        background: linear-gradient(135deg, #1565c0, #42a5f5);
        color: white;
      }
      .primary-btn:hover {
        background: linear-gradient(135deg, #1976d2, #64b5f6);
        transform: translateY(-1px);
      }
      .secondary-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e8eaed;
      }
      .secondary-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      @media (max-width: 768px) {
        #three-rigid-container {
          height: 350px;
        }
        .invariants-grid {
          grid-template-columns: 1fr;
        }
        .rigid-buttons {
          flex-direction: column;
        }
        .mode-btn {
          font-size: 0.75rem;
          padding: 8px 10px;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    // Load Three.js
    if (!window.THREE) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = function() {
            const orbitScript = document.createElement('script');
            orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
            orbitScript.onload = initializeVisualization;
            document.head.appendChild(orbitScript);
        };
        document.head.appendChild(script);
    } else if (!THREE.OrbitControls) {
        const orbitScript = document.createElement('script');
        orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        orbitScript.onload = initializeVisualization;
        document.head.appendChild(orbitScript);
    } else {
        initializeVisualization();
    }
    
    function initializeVisualization() {
        if (!THREE.OrbitControls) {
            setTimeout(initializeVisualization, 100);
            return;
        }
        
        // DOM Elements
        const canvasContainer = document.getElementById('three-rigid-container');
        const modeSO3Btn = document.getElementById('mode-so3');
        const modeSE3Btn = document.getElementById('mode-se3');
        const instructionText = document.getElementById('rigid-instruction');
        
        // Matrix display elements
        const r00 = document.getElementById('r00');
        const r01 = document.getElementById('r01');
        const r02 = document.getElementById('r02');
        const r10 = document.getElementById('r10');
        const r11 = document.getElementById('r11');
        const r12 = document.getElementById('r12');
        const r20 = document.getElementById('r20');
        const r21 = document.getElementById('r21');
        const r22 = document.getElementById('r22');
        const detVerify = document.getElementById('det-verify');
        const orthogonalVerify = document.getElementById('orthogonal-verify');
        
        const t00 = document.getElementById('t00');
        const t01 = document.getElementById('t01');
        const t02 = document.getElementById('t02');
        const t03 = document.getElementById('t03');
        const t10 = document.getElementById('t10');
        const t11 = document.getElementById('t11');
        const t12 = document.getElementById('t12');
        const t13 = document.getElementById('t13');
        const t20 = document.getElementById('t20');
        const t21 = document.getElementById('t21');
        const t22 = document.getElementById('t22');
        const t23 = document.getElementById('t23');
        
        const eulerAnglesDisplay = document.getElementById('euler-angles');
        const axisAngleDisplay = document.getElementById('axis-angle');
        const quaternionDisplay = document.getElementById('quaternion');
        
        const edgeLengthDisplay = document.getElementById('edge-length');
        const interiorAngleDisplay = document.getElementById('interior-angle');
        const volumeScaleDisplay = document.getElementById('volume-scale');
        
        const rollSlider = document.getElementById('roll-slider');
        const pitchSlider = document.getElementById('pitch-slider');
        const yawSlider = document.getElementById('yaw-slider');
        const rollValue = document.getElementById('roll-value');
        const pitchValue = document.getElementById('pitch-value');
        const yawValue = document.getElementById('yaw-value');
        
        const txSlider = document.getElementById('tx-slider');
        const tySlider = document.getElementById('ty-slider');
        const tzSlider = document.getElementById('tz-slider');
        const txValue = document.getElementById('tx-value');
        const tyValue = document.getElementById('ty-value');
        const tzValue = document.getElementById('tz-value');
        
        const homogeneousMatrixDisplay = document.getElementById('homogeneous-matrix-display');
        const translationSliders = document.getElementById('translation-sliders');
        const applicationsPanel = document.getElementById('applications-panel');
        
        const resetBtn = document.getElementById('reset-transform');
        const randomBtn = document.getElementById('random-rotation');
        
        // State
        let mode = 'SO3';
        let roll = 0, pitch = 0, yaw = 0;
        let tx = 0, ty = 0, tz = 0;
        
        // Three.js setup
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f1419);
        
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(5, 4, 5);
        camera.lookAt(0, 0, 0);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        canvasContainer.appendChild(renderer.domElement);
        
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        
        // Lighting
        scene.add(new THREE.AmbientLight(0x404040, 0.6));
        const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
        light1.position.set(5, 10, 7);
        scene.add(light1);
        const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
        light2.position.set(-5, -5, -5);
        scene.add(light2);
        
        // Create hexagonal coin
        function createHexagonalCoin() {
            const group = new THREE.Group();
            const radius = 1;
            const height = 0.3;
            
            // Hexagonal shape
            const shape = new THREE.Shape();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                if (i === 0) shape.moveTo(x, y);
                else shape.lineTo(x, y);
            }
            shape.closePath();
            
            const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
            
            const topMaterial = new THREE.MeshPhongMaterial({ color: 0x3498db, flatShading: true });
            const bottomMaterial = new THREE.MeshPhongMaterial({ color: 0xe74c3c, flatShading: true });
            const sideMaterial = new THREE.MeshPhongMaterial({ color: 0x7f8c8d, flatShading: true });
            
            const coin = new THREE.Mesh(geometry, [sideMaterial, topMaterial, bottomMaterial]);
            coin.rotation.x = -Math.PI / 2;
            coin.position.y = -height / 2;
            group.add(coin);
            
            // Edge outline
            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(geometry),
                new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
            );
            edges.rotation.x = -Math.PI / 2;
            edges.position.y = -height / 2;
            group.add(edges);
            
            // Orientation marker
            const marker = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 16, 16),
                new THREE.MeshPhongMaterial({ color: 0xf39c12 })
            );
            marker.position.set(radius, height / 2, 0);
            group.add(marker);
            
            // Body coordinate frame
            const axisLength = 1.5;
            const xAxis = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(axisLength,0,0)]),
                new THREE.LineBasicMaterial({ color: 0xe74c3c })
            );
            const yAxis = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,axisLength,0)]),
                new THREE.LineBasicMaterial({ color: 0x2ecc71 })
            );
            const zAxis = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,axisLength)]),
                new THREE.LineBasicMaterial({ color: 0x3498db })
            );
            group.add(xAxis, yAxis, zAxis);
            
            return group;
        }
        
        // Create world frame
        function createWorldFrame() {
            const group = new THREE.Group();
            const axisLength = 3;
            
            const createDashedAxis = (endPoint, color) => {
                const geom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0,0,0), endPoint
                ]);
                const line = new THREE.Line(geom, new THREE.LineDashedMaterial({ 
                    color, dashSize: 0.1, gapSize: 0.05 
                }));
                line.computeLineDistances();
                return line;
            };
            
            group.add(createDashedAxis(new THREE.Vector3(axisLength,0,0), 0xff6666));
            group.add(createDashedAxis(new THREE.Vector3(0,axisLength,0), 0x66ff66));
            group.add(createDashedAxis(new THREE.Vector3(0,0,axisLength), 0x6666ff));
            
            // Labels
            const createLabel = (text, pos, color) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 64; canvas.height = 64;
                ctx.font = 'bold 48px Arial';
                ctx.fillStyle = color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 32, 32);
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
                sprite.position.copy(pos);
                sprite.scale.set(0.5, 0.5, 0.5);
                return sprite;
            };
            
            group.add(createLabel('X', new THREE.Vector3(axisLength+0.3,0,0), '#ff6666'));
            group.add(createLabel('Y', new THREE.Vector3(0,axisLength+0.3,0), '#66ff66'));
            group.add(createLabel('Z', new THREE.Vector3(0,0,axisLength+0.3), '#6666ff'));
            
            return group;
        }
        
        // Add objects
        const coin = createHexagonalCoin();
        scene.add(coin);
        scene.add(createWorldFrame());
        
        const gridHelper = new THREE.GridHelper(6, 12, 0x444444, 0x333333);
        gridHelper.position.y = -0.5;
        scene.add(gridHelper);
        
        // Math functions
        function eulerToRotationMatrix(rollDeg, pitchDeg, yawDeg) {
            const phi = rollDeg * Math.PI / 180;
            const theta = pitchDeg * Math.PI / 180;
            const psi = yawDeg * Math.PI / 180;
            
            const cp = Math.cos(phi), sp = Math.sin(phi);
            const ct = Math.cos(theta), st = Math.sin(theta);
            const cs = Math.cos(psi), ss = Math.sin(psi);
            
            return [
                [cs*ct, cs*st*sp - ss*cp, cs*st*cp + ss*sp],
                [ss*ct, ss*st*sp + cs*cp, ss*st*cp - cs*sp],
                [-st,   ct*sp,            ct*cp           ]
            ];
        }
        
        function determinant3x3(R) {
            return R[0][0]*(R[1][1]*R[2][2] - R[1][2]*R[2][1])
                 - R[0][1]*(R[1][0]*R[2][2] - R[1][2]*R[2][0])
                 + R[0][2]*(R[1][0]*R[2][1] - R[1][1]*R[2][0]);
        }
        
        function isOrthogonal(R) {
            const RtR = [[0,0,0], [0,0,0], [0,0,0]];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    for (let k = 0; k < 3; k++) {
                        RtR[i][j] += R[k][i] * R[k][j];
                    }
                }
            }
            let maxErr = 0;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    maxErr = Math.max(maxErr, Math.abs(RtR[i][j] - (i===j?1:0)));
                }
            }
            return maxErr < 0.0001;
        }
        
        function rotationMatrixToAxisAngle(R) {
            const trace = R[0][0] + R[1][1] + R[2][2];
            const angle = Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2)));
            
            if (Math.abs(angle) < 0.0001) {
                return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };
            }
            
            const s = 1 / (2 * Math.sin(angle));
            const axis = {
                x: (R[2][1] - R[1][2]) * s,
                y: (R[0][2] - R[2][0]) * s,
                z: (R[1][0] - R[0][1]) * s
            };
            const mag = Math.sqrt(axis.x*axis.x + axis.y*axis.y + axis.z*axis.z);
            if (mag > 0.0001) {
                axis.x /= mag; axis.y /= mag; axis.z /= mag;
            }
            return { axis, angle: angle * 180 / Math.PI };
        }
        
        function rotationMatrixToQuaternion(R) {
            const trace = R[0][0] + R[1][1] + R[2][2];
            let w, x, y, z;
            
            if (trace > 0) {
                const s = 0.5 / Math.sqrt(trace + 1);
                w = 0.25 / s;
                x = (R[2][1] - R[1][2]) * s;
                y = (R[0][2] - R[2][0]) * s;
                z = (R[1][0] - R[0][1]) * s;
            } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
                const s = 2 * Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]);
                w = (R[2][1] - R[1][2]) / s;
                x = 0.25 * s;
                y = (R[0][1] + R[1][0]) / s;
                z = (R[0][2] + R[2][0]) / s;
            } else if (R[1][1] > R[2][2]) {
                const s = 2 * Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]);
                w = (R[0][2] - R[2][0]) / s;
                x = (R[0][1] + R[1][0]) / s;
                y = 0.25 * s;
                z = (R[1][2] + R[2][1]) / s;
            } else {
                const s = 2 * Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]);
                w = (R[1][0] - R[0][1]) / s;
                x = (R[0][2] + R[2][0]) / s;
                y = (R[1][2] + R[2][1]) / s;
                z = 0.25 * s;
            }
            return { w, x, y, z };
        }
        
        // Update functions
       function updateCoinTransform() {
            const R = eulerToRotationMatrix(roll, pitch, yaw);
            coin.matrix.set(
                R[0][0], R[0][1], R[0][2], tx,
                R[1][0], R[1][1], R[1][2], ty,
                R[2][0], R[2][1], R[2][2], tz,
                0, 0, 0, 1
            );
            coin.matrixAutoUpdate = false;
        }
        
        function updateDisplays() {
            const R = eulerToRotationMatrix(roll, pitch, yaw);
            
            r00.textContent = R[0][0].toFixed(3);
            r01.textContent = R[0][1].toFixed(3);
            r02.textContent = R[0][2].toFixed(3);
            r10.textContent = R[1][0].toFixed(3);
            r11.textContent = R[1][1].toFixed(3);
            r12.textContent = R[1][2].toFixed(3);
            r20.textContent = R[2][0].toFixed(3);
            r21.textContent = R[2][1].toFixed(3);
            r22.textContent = R[2][2].toFixed(3);
            
            const det = determinant3x3(R);
            const isOrtho = isOrthogonal(R);
            detVerify.textContent = `det(R) = ${det.toFixed(3)} ${Math.abs(det-1)<0.001?'✓':'✗'}`;
            orthogonalVerify.textContent = `RᵀR = I ${isOrtho?'✓':'✗'}`;
            
            if (mode === 'SE3') {
                t00.textContent = R[0][0].toFixed(3);
                t01.textContent = R[0][1].toFixed(3);
                t02.textContent = R[0][2].toFixed(3);
                t03.textContent = tx.toFixed(2);
                t10.textContent = R[1][0].toFixed(3);
                t11.textContent = R[1][1].toFixed(3);
                t12.textContent = R[1][2].toFixed(3);
                t13.textContent = ty.toFixed(2);
                t20.textContent = R[2][0].toFixed(3);
                t21.textContent = R[2][1].toFixed(3);
                t22.textContent = R[2][2].toFixed(3);
                t23.textContent = tz.toFixed(2);
            }
            
            eulerAnglesDisplay.textContent = `ψ=${yaw.toFixed(0)}° θ=${pitch.toFixed(0)}° φ=${roll.toFixed(0)}°`;
            
            const aa = rotationMatrixToAxisAngle(R);
            axisAngleDisplay.textContent = `axis=(${aa.axis.x.toFixed(2)},${aa.axis.y.toFixed(2)},${aa.axis.z.toFixed(2)}), θ=${aa.angle.toFixed(0)}°`;
            
            const q = rotationMatrixToQuaternion(R);
            quaternionDisplay.textContent = `(${q.w.toFixed(3)}, ${q.x.toFixed(3)}, ${q.y.toFixed(3)}, ${q.z.toFixed(3)})`;
            
            edgeLengthDisplay.textContent = '1.000';
            interiorAngleDisplay.textContent = '120.0°';
            volumeScaleDisplay.textContent = Math.abs(det).toFixed(3);
            
            rollValue.textContent = `${roll.toFixed(0)}°`;
            pitchValue.textContent = `${pitch.toFixed(0)}°`;
            yawValue.textContent = `${yaw.toFixed(0)}°`;
            txValue.textContent = tx.toFixed(1);
            tyValue.textContent = ty.toFixed(1);
            tzValue.textContent = tz.toFixed(1);
        }
        
        function updateMode(newMode) {
            mode = newMode;
            modeSO3Btn.classList.toggle('active', mode === 'SO3');
            modeSE3Btn.classList.toggle('active', mode === 'SE3');
            
            const se3Display = mode === 'SE3' ? 'block' : 'none';
            homogeneousMatrixDisplay.style.display = se3Display;
            translationSliders.style.display = se3Display;
            applicationsPanel.style.display = se3Display;
            
            instructionText.textContent = mode === 'SO3' 
                ? 'SO(3): Pure rotation. Drag coin or use sliders. det(R) = 1 always.'
                : 'SE(3): Rotation + Translation. Full rigid body motion in 3D space.';
            
            if (mode === 'SO3') {
                tx = ty = tz = 0;
                txSlider.value = tySlider.value = tzSlider.value = 0;
            }
            
            updateCoinTransform();
            updateDisplays();
        }
        
        function resetTransform() {
            roll = pitch = yaw = tx = ty = tz = 0;
            rollSlider.value = pitchSlider.value = yawSlider.value = 0;
            txSlider.value = tySlider.value = tzSlider.value = 0;
            updateCoinTransform();
            updateDisplays();
        }
        
        function randomRotation() {
            roll = Math.random() * 360 - 180;
            pitch = Math.random() * 180 - 90;
            yaw = Math.random() * 360 - 180;
            rollSlider.value = roll;
            pitchSlider.value = pitch;
            yawSlider.value = yaw;
            updateCoinTransform();
            updateDisplays();
        }
        
        // Event listeners
        modeSO3Btn.addEventListener('click', () => updateMode('SO3'));
        modeSE3Btn.addEventListener('click', () => updateMode('SE3'));
        
        rollSlider.addEventListener('input', () => { roll = parseFloat(rollSlider.value); updateCoinTransform(); updateDisplays(); });
        pitchSlider.addEventListener('input', () => { pitch = parseFloat(pitchSlider.value); updateCoinTransform(); updateDisplays(); });
        yawSlider.addEventListener('input', () => { yaw = parseFloat(yawSlider.value); updateCoinTransform(); updateDisplays(); });
        txSlider.addEventListener('input', () => { tx = parseFloat(txSlider.value); updateCoinTransform(); updateDisplays(); });
        tySlider.addEventListener('input', () => { ty = parseFloat(tySlider.value); updateCoinTransform(); updateDisplays(); });
        tzSlider.addEventListener('input', () => { tz = parseFloat(tzSlider.value); updateCoinTransform(); updateDisplays(); });
        
        resetBtn.addEventListener('click', resetTransform);
        randomBtn.addEventListener('click', randomRotation);
        
        // Drag interaction
        // Desktop: normal drag rotates coin, shift+drag for camera
        // Mobile: one finger rotates coin, two fingers for camera (zoom/pan)
        let isDragging = false;
        let prevMouse = { x: 0, y: 0 };
        let touchMode = null; // 'coin' or 'camera'
        
        const getPos = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        
        // Disable OrbitControls rotate (we handle rotation ourselves), keep zoom
        controls.enableRotate = false;
        controls.enableZoom = true;
        controls.enablePan = true;
        
        // Desktop mouse events - always rotate coin
        renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            prevMouse = getPos(e);
        });
        renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const pos = getPos(e);
            yaw = ((yaw + (pos.x - prevMouse.x) * 0.5) % 360 + 360) % 360 - 180;
            pitch = Math.max(-90, Math.min(90, pitch + (pos.y - prevMouse.y) * 0.3));
            yawSlider.value = yaw;
            pitchSlider.value = pitch;
            updateCoinTransform();
            updateDisplays();
            prevMouse = pos;
        });
        document.addEventListener('mouseup', () => { 
            isDragging = false; 
        });
        
        // Mobile touch events
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // One finger: rotate coin
                touchMode = 'coin';
                isDragging = true;
                prevMouse = getPos(e);
                e.preventDefault();
            } else {
                // Two+ fingers: let OrbitControls handle (zoom/pan)
                touchMode = 'camera';
                isDragging = false;
            }
        }, { passive: false });
        
        renderer.domElement.addEventListener('touchmove', (e) => {
            if (touchMode === 'coin' && e.touches.length === 1) {
                e.preventDefault();
                if (!isDragging) return;
                const pos = getPos(e);
                yaw = ((yaw + (pos.x - prevMouse.x) * 0.5) % 360 + 360) % 360 - 180;
                pitch = Math.max(-90, Math.min(90, pitch + (pos.y - prevMouse.y) * 0.3));
                yawSlider.value = yaw;
                pitchSlider.value = pitch;
                updateCoinTransform();
                updateDisplays();
                prevMouse = pos;
            } else if (e.touches.length >= 2) {
                // Switch to camera mode if second finger added
                touchMode = 'camera';
                isDragging = false;
                // Don't preventDefault - let OrbitControls handle it
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                isDragging = false;
                touchMode = null;
            } else if (e.touches.length === 1) {
                // Went from 2 fingers to 1: switch back to coin mode
                touchMode = 'coin';
                isDragging = true;
                prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });
        
        // Mouse wheel zoom (desktop)
        renderer.domElement.addEventListener('wheel', (e) => {
            // Let OrbitControls handle wheel zoom
        }, { passive: true });
        
        // Resize
        window.addEventListener('resize', () => {
            const w = canvasContainer.clientWidth;
            const h = canvasContainer.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        
        updateMode('SO3');
        updateDisplays();
        animate();
    }
});