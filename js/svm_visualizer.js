// svm_visualizer.js
//
// Fixed logic and implementation for both Linear and RBF (via Random Fourier Features) branches.
// Retains fundamental structure of the original code, but corrects Pegasos updates, RFF scaling,
// learning‐rate schedule, and support‐vector identification.
//
// References:
// [1] Shalev‐Shwartz, S., Singer, Y., & Srebro, N. (2007). Pegasos: Primal Estimated Sub‐Gradient Solver for SVM. ICML.
// [2] Rahimi, A., & Recht, B. (2007). Random Features for Large‐Scale Kernel Machines. NIPS.
//
// Note: This version does NOT use SMO or libsvm.js. Instead, it trains an RBF‐kernel SVM via
//       a primal Pegasos update on Random Fourier Features (RFF), with correct normalization
//       and learning‐rate schedule.

document.addEventListener('DOMContentLoaded', function() {
  // ——————————————————————————————————————————————————————————
  // State + DOM Elements
  // ——————————————————————————————————————————————————————————
  let data         = [];    // [{x1, x2, y}, …]
  let testData     = [];    // held‐out test points
  let weights      = {     // for linear SVM
    w: [0, 0],
    b: 0
  };
  let C            = 1.0;   // regularization parameter (user sets)
  let lambda       = 1.0 / C; // λ = 1/C
  let maxIterations = 300;  // number of SGD steps
  let learningRate  = 0.1;  // initial learning rate (will be overridden by Pegasos schedule)
  let iterationCount = 0;   // global counter for Pegasos schedule

  // RFF (RBF‐kernel) state
  let kernelType           = 'linear'; // 'linear' or 'rbf'
  let gamma                = 0.5;      // RBF width (user sets, log‐scale)
  let numRandomFeatures    = 200;      // D (can increase for better approximation)
  let randomWeights        = [];       // [ [ω1_1, ω1_2], [ω2_1, ω2_2], … ]
  let randomBiases         = [];       // [b1, b2, …]
  let approxWeights        = [];       // weights in RFF space (length = D)
  let approxBias           = 0;        // bias term for RFF‐SVM

  let isTraining    = false; // prevents concurrent training
  let hasTrainedOnce = false;

  // DOM references
  const container      = document.getElementById('svm_visualizer');
  const kernelSelect   = document.createElement('select');
  const cInput         = document.createElement('input');
  const cDisplay       = document.createElement('span');
  const gammaInput     = document.createElement('input');
  const gammaDisplay   = document.createElement('span');
  const iterInput      = document.createElement('input');
  const iterDisplay    = document.createElement('span');
  const trainBtn       = document.createElement('button');
  const genBtn         = document.createElement('button');
  const accElem        = document.createElement('div');
  const lossElem       = document.createElement('div');
  const testAccElem    = document.createElement('div');
  const svCountElem    = document.createElement('div');
  const kktElem        = document.createElement('div');
  const canvas         = document.createElement('canvas');
  const ctx            = canvas.getContext('2d');
  let canvasW, canvasH;

  // Initialize DOM + HTML structure
  container.innerHTML = `
    <div class="svm-container">
      <div class="svm-layout">
        <div class="svm-visualization">
          <div class="canvas-container">
            <div class="instruction">Support Vector Machine Visualizer</div>
            <div id="canvas-wrapper">
              <canvas id="svm-canvas" width="800" height="500"></canvas>
            </div>
            <div class="legend">
              <div class="legend-item"><span class="legend-color class-pos"></span> Train +1</div>
              <div class="legend-item"><span class="legend-color class-neg"></span> Train −1</div>
              <div class="legend-item"><span class="legend-color test-pos"></span> Test +1</div>
              <div class="legend-item"><span class="legend-color test-neg"></span> Test −1</div>
              <div class="legend-item"><span class="legend-color support-vector"></span> Support Vector</div>
              <div class="legend-item"><span class="legend-color decision-boundary"></span> Decision Boundary</div>
              <div class="legend-item"><span class="legend-color margin"></span> Margin / Decision Region</div>
            </div>
            <div class="btn-container">
              <button id="train-btn" class="primary-btn">Train SVM</button>
              <button id="generate-btn" class="secondary-btn">Generate New Data</button>
            </div>
          </div>
        </div>
        <div class="controls-panel">
          <div class="control-group">
            <label for="kernel-select">Kernel:</label>
            <select id="kernel-select" class="full-width">
              <option value="linear" selected>Linear (Pegasos)</option>
              <option value="rbf">RBF (Gaussian via RFF)</option>
            </select>
          </div>
          <div class="control-group">
            <label for="c-parameter">Regularization (C):</label>
            <input type="range" id="c-parameter" min="-2" max="3" step="0.1" value="0" class="full-width">
            <span id="c-display">C = 1.0</span>
            <div class="param-hint">Higher C → narrower margin (less regularization)</div>
          </div>
          <div class="control-group">
            <label for="gamma-parameter">RBF Gamma (γ):</label>
            <input type="range" id="gamma-parameter" min="-5" max="2" step="0.1" value="-0.3" class="full-width">
            <span id="gamma-display">γ = 0.50</span>
            <div class="param-hint">γ = 10<sup>slider</sup>; RBF: K(x,z)=exp(−γ‖x−z‖²) (Rahimi & Recht, 2007) </div>
          </div>
          <div class="control-group">
            <label for="iterations">Max Iterations (linear):</label>
            <input type="range" id="iterations" min="50" max="2000" step="50" value="300" class="full-width">
            <span id="iterations-display">300</span>
          </div>
          <div class="results-box">
            <h3>SVM Performance:</h3>
            <div class="result-row">
              <div class="result-label">Train Accuracy:</div>
              <div class="result-value" id="accuracy">0.0%</div>
            </div>
            <div class="result-row">
              <div class="result-label">Train Loss (linear):</div>
              <div class="result-value" id="loss">0.0000</div>
            </div>
            <div class="result-row">
              <div class="result-label">Test Accuracy:</div>
              <div class="result-value" id="test-accuracy">0.0%</div>
            </div>
            <div class="result-row">
              <div class="result-label">Support Vectors:</div>
              <div class="result-value" id="support-vector-count">0</div>
            </div>
            <div class="result-hint">
              Linear uses Pegasos (ηₜ=1/(λ t), λ=1/C). RBF uses RFF + Pegasos (Rahimi & Recht, 2007). 
            </div>
          </div>
          <div class="kkt-conditions" id="kkt-conditions">
            <h4>KKT Conditions:</h4>
            <div>Train the model to see KKT conditions</div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.head.insertAdjacentHTML('beforeend', `<style>
    /* (Same styling as before; omitted for brevity) */
    .svm-container { font-family: Arial, sans-serif; margin-bottom: 20px; }
    .svm-layout { display: flex; flex-direction: column; gap: 20px; }
    @media (min-width: 992px) { .svm-layout { flex-direction: row; } .svm-visualization { flex:3; } .controls-panel { flex:2; } }
    .canvas-container { display: flex; flex-direction: column; }
    #svm-canvas { border: 1px solid #ddd; border-radius: 4px; background: white; max-width: 100%; height: auto; display: block; }
    .controls-panel { background: #f8f9fa; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
    .control-group { margin-bottom: 15px; }
    .control-group label { display: block; font-weight: bold; margin-bottom: 8px; }
    .full-width { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .param-hint { font-size: 0.8rem; color: #666; margin-top: 4px; font-style: italic; }
    .instruction { text-align: center; margin-bottom: 10px; font-size: 0.9rem; color: #666; }
    .legend { margin-top: 10px; display: flex; gap: 15px; font-size: 0.9rem; color: #666; justify-content: center; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; }
    .legend-color { display: inline-block; width: 12px; height: 12px; margin-right: 5px; border-radius: 2px; }
    .legend-color.class-pos      { background-color: #e74c3c; }
    .legend-color.class-neg      { background-color: #3498db; }
    .legend-color.test-pos       { background-color: rgba(231,76,60,0.5); }
    .legend-color.test-neg       { background-color: rgba(52,152,219,0.5); }
    .legend-color.support-vector { background-color: #f39c12; border: 2px solid #f39c12; border-radius: 50%; }
    .legend-color.decision-boundary { background-color: #2c3e50; }
    .legend-color.margin         { background: repeating-linear-gradient(45deg, #95a5a6, #95a5a6 3px, transparent 3px, transparent 6px); }
    .primary-btn, .secondary-btn { color: white; border: none; border-radius: 4px; padding: 10px 15px; font-size: 1rem; cursor: pointer; width: 100%; margin-bottom: 10px; }
    .primary-btn { background-color: #3498db; } .primary-btn:hover { background-color: #2980b9; }
    .secondary-btn { background-color: #95a5a6; } .secondary-btn:hover { background-color: #7f8c8d; }
    .results-box { background-color: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .results-box h3 { margin-top: 0; margin-bottom: 10px; font-size: 1rem; }
    .result-row { display: flex; flex-wrap: wrap; margin-bottom: 5px; }
    .result-label { font-weight: bold; flex-basis: 60%; }
    .result-value { font-family: monospace; flex-basis: 40%; text-align: right; }
    .result-hint { font-size: 0.8rem; color: #666; font-style: italic; margin-top: 8px; text-align: center; }
    .kkt-conditions { background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #9b59b6; }
    .kkt-conditions h4 { margin-top: 0; margin-bottom: 10px; color: #9b59b6; }
    .kkt-summary { font-weight: bold; margin-bottom: 10px; color: #27ae60; }
    .kkt-breakdown { font-size: 0.9rem; margin-bottom: 10px; padding: 8px; background-color: white; border-radius: 4px; border-left: 3px solid #9b59b6; }
    .kkt-breakdown div { margin: 3px 0; }
    .sv-details { margin-top: 10px; padding: 10px; background-color: white; border-radius: 4px; }
    .sv-details h5 { margin: 0 0 8px 0; font-size: 0.9rem; color: #333; }
    .sv-item { font-family: monospace; font-size: 0.8rem; margin: 2px 0; padding: 2px 4px; background-color: #f8f9fa; border-radius: 2px; }
    .btn-container { margin-bottom: 20px; }
    .svm-visualization { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  </style>`);

  // Grab DOM elements (after insertion)
  canvas       = document.getElementById('svm-canvas');
  ctx          = canvas.getContext('2d');
  canvasW      = canvas.width;
  canvasH      = canvas.height;

  kernelSelect   = document.getElementById('kernel-select');
  cInput         = document.getElementById('c-parameter');
  cDisplay       = document.getElementById('c-display');
  gammaInput     = document.getElementById('gamma-parameter');
  gammaDisplay   = document.getElementById('gamma-display');
  iterInput      = document.getElementById('iterations');
  iterDisplay    = document.getElementById('iterations-display');
  trainBtn       = document.getElementById('train-btn');
  genBtn         = document.getElementById('generate-btn');
  accElem        = document.getElementById('accuracy');
  lossElem       = document.getElementById('loss');
  testAccElem    = document.getElementById('test-accuracy');
  svCountElem    = document.getElementById('support-vector-count');
  kktElem        = document.getElementById('kkt-conditions');

  // ——————————————————————————————————————————————————————————
  // INITIAL PARAMETER SETUP & EVENT LISTENERS
  // ——————————————————————————————————————————————————————————
  function handleCChange() {
    C = Math.pow(10, parseFloat(cInput.value));
    cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
    lambda = 1.0 / C;
  }
  function handleGammaChange() {
    gamma = Math.pow(10, parseFloat(gammaInput.value));
    gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : gamma < 1 ? 2 : 1)}`;
  }
  function handleIterChange() {
    maxIterations = parseInt(iterInput.value);
    iterDisplay.textContent = maxIterations.toString();
  }
  function handleKernelChange() {
    kernelType = kernelSelect.value;
    if (kernelType === 'linear') {
      // nothing special
    } else {
      // On switching to RBF, initialize RFF immediately when training starts
      // (actual initialization happens inside trainSVM)
    }
  }

  cInput.addEventListener('input', handleCChange);
  gammaInput.addEventListener('input', handleGammaChange);
  iterInput.addEventListener('input', handleIterChange);
  kernelSelect.addEventListener('change', handleKernelChange);
  trainBtn.addEventListener('click', trainSVM);
  genBtn.addEventListener('click', generateData);
  window.addEventListener('resize', handleResize);

  // Initialize text for sliders
  C = Math.pow(10, parseFloat(cInput.value));
  cDisplay.textContent = `C = ${C.toFixed(1)}`;
  lambda = 1.0 / C;
  gamma = Math.pow(10, parseFloat(gammaInput.value));
  gammaDisplay.textContent = `γ = ${gamma.toFixed(1)}`;
  maxIterations = parseInt(iterInput.value);
  iterDisplay.textContent = maxIterations.toString();

  // ——————————————————————————————————————————————————————————
  // 1) DATA GENERATION (linear vs. circular)
  // ——————————————————————————————————————————————————————————
  function generateData() {
    const totalPoints = 120;
    const trainSize   = 80;
    let pts = [];

    // Randomly choose linear or circular pattern
    const pattern = Math.random() > 0.5 ? 'linear' : 'circular';
    hasTrainedOnce = false;

    if (pattern === 'linear') {
      for (let i = 0; i < totalPoints; i++) {
        const x1 = (Math.random() - 0.5) * 4;
        const x2 = (Math.random() - 0.5) * 4;
        const boundary = 0.8 * x1 + 0.5 * x2;
        let y;
        if (Math.random() < 0.85) {
          y = boundary > 0 ? 1 : -1;
        } else {
          const noise = (Math.random() - 0.5) * 1.0;
          y = (boundary + noise) > 0 ? 1 : -1;
        }
        pts.push({ x1, x2, y });
      }
    } else {
      // Circular pattern
      for (let i = 0; i < totalPoints; i++) {
        const angle = Math.random() * 2 * Math.PI;
        let radius, y;
        if (Math.random() < 0.8) {
          if (Math.random() < 0.5) {
            radius = Math.random() * 0.8; y = 1;
          } else {
            radius = 1.8 + Math.random() * 0.7; y = -1;
          }
        } else {
          radius = 1 + (Math.random() - 0.5) * 0.8;
          y = radius < 1.2 ? 1 : -1;
          if (Math.random() < 0.3) y = -y;
        }
        const x1 = radius * Math.cos(angle);
        const x2 = radius * Math.sin(angle);
        pts.push({ x1, x2, y });
      }
      // Heuristic γ = 1/median(‖x_i - x_j‖²)
      const dists = [];
      for (let i = 0; i < pts.length; i++) {
        for (let j = i+1; j < pts.length; j++) {
          const dx = pts[i].x1 - pts[j].x1;
          const dy = pts[i].x2 - pts[j].x2;
          dists.push(dx*dx + dy*dy);
        }
      }
      const med = median(dists);
      gamma = 1.0 / med;
      const exp = Math.log10(gamma);
      gammaInput.value = exp.toFixed(1);
      updateGamma();
    }

    // Shuffle
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    data = pts.slice(0, trainSize);
    testData = pts.slice(trainSize);

    // Reinitialize linear parameters
    initLinearWeights();

    // Reset RFF state
    randomWeights = [];
    randomBiases  = [];
    approxWeights = [];
    approxBias    = 0;

    // Reset UI metrics
    accElem.textContent      = '0.0%';
    lossElem.textContent     = '0.0000';
    testAccElem.textContent  = '0.0%';
    svCountElem.textContent  = '0';
    kktElem.innerHTML        = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';

    drawCanvas();
  }

  function initLinearWeights() {
    weights.w = [(Math.random() - 0.5)*0.01, (Math.random() - 0.5)*0.01];
    weights.b = 0;
    iterationCount = 0;
  }

  function median(arr) {
    const s = arr.slice().sort((a,b) => a - b);
    const m = Math.floor(s.length/2);
    return (s.length % 2 === 0) ? (s[m-1] + s[m])/2 : s[m];
  }

  // ——————————————————————————————————————————————————————————
  // 2) TRAINING (branch on kernelType)
  // ——————————————————————————————————————————————————————————
  async function trainSVM() {
    if (isTraining) return;
    isTraining = true;

    trainBtn.disabled = true;
    trainBtn.textContent = `Training ${kernelType === 'linear' ? 'Linear' : 'RBF'}...`;

    if (kernelType === 'linear') {
      await trainLinearSVM();
    } else {
      await trainRBFSVM();
    }

    trainBtn.disabled = false;
    trainBtn.textContent = 'Train SVM';
    hasTrainedOnce = true;
    isTraining      = false;
  }

  // —═════════════════════════════════════════════
  // 2A) Linear Pegasos Training (Shalev‐Shwartz et al., 2007) 
  // —═════════════════════════════════════════════
  async function trainLinearSVM() {
    const n = data.length;
    lambda = 1.0 / C;

    for (; iterationCount < maxIterations; iterationCount++) {
      const t   = iterationCount + 1;           
      const eta = 1.0 / (lambda * t);           // ηₜ = 1/(λ t)

      // Sample a random training point
      const idx = Math.floor(Math.random() * n);
      const { x1, x2, y } = data[idx];
      const dot = weights.w[0]*x1 + weights.w[1]*x2 + weights.b;
      const margin = y * dot;

      if (margin < 1) {
        // w ← (1 − ηλ) w + η y x
        weights.w[0] = (1 - eta*lambda)*weights.w[0] + eta*y*x1;
        weights.w[1] = (1 - eta*lambda)*weights.w[1] + eta*y*x2;
        // b ← b + η y
        weights.b += eta * y;
      } else {
        // w ← (1 − ηλ) w
        weights.w[0] = (1 - eta*lambda)*weights.w[0];
        weights.w[1] = (1 - eta*lambda)*weights.w[1];
        // no bias update
      }

      if (t % 10 === 0) {
        const trainAcc = calcTrainAccLinear();
        const trainLoss = calcLinearLoss();
        const testAcc    = calcTestAccLinear();
        accElem.textContent     = (trainAcc * 100).toFixed(1) + '%';
        lossElem.textContent    = trainLoss.toFixed(4);
        testAccElem.textContent = (testAcc * 100).toFixed(1) + '%';

        updateSupportVectorsLinear();
        svCountElem.textContent = supportVectorsLinear.length.toString();

        drawCanvas();
        await new Promise(r => setTimeout(r, 5)); // small pause
      }

      // Early stopping if high train accuracy
      if (calcTrainAccLinear() > 0.99 && t > 50) break;
    }

    // Final metrics
    updateSupportVectorsLinear();
    const finalTrainAcc = calcTrainAccLinear();
    const finalTestAcc  = calcTestAccLinear();
    const finalLoss     = calcLinearLoss();
    accElem.textContent     = (finalTrainAcc * 100).toFixed(1) + '%';
    lossElem.textContent    = finalLoss.toFixed(4);
    testAccElem.textContent = (finalTestAcc * 100).toFixed(1) + '%';
    svCountElem.textContent = supportVectorsLinear.length.toString();

    drawCanvas();
    updateKKTLinear();
  }

  function calcTrainAccLinear() {
    let correct = 0;
    for (const pt of data) {
      const pred = (weights.w[0]*pt.x1 + weights.w[1]*pt.x2 + weights.b >= 0) ? 1 : -1;
      if (pred === pt.y) correct++;
    }
    return data.length ? correct / data.length : 0;
  }
  function calcTestAccLinear() {
    let correct = 0;
    for (const pt of testData) {
      const pred = (weights.w[0]*pt.x1 + weights.w[1]*pt.x2 + weights.b >= 0) ? 1 : -1;
      if (pred === pt.y) correct++;
    }
    return testData.length ? correct / testData.length : 0;
  }
  function calcLinearLoss() {
    // SVM objective: ½||w||² + C ∑ hinge
    let hingeSum = 0;
    for (const pt of data) {
      const margin = pt.y * (weights.w[0]*pt.x1 + weights.w[1]*pt.x2 + weights.b);
      if (margin < 1) hingeSum += (1 - margin);
    }
    const reg = 0.5 * (weights.w[0]*weights.w[0] + weights.w[1]*weights.w[1]);
    return reg + C * hingeSum;
  }

  let supportVectorsLinear = [];
  function updateSupportVectorsLinear() {
    supportVectorsLinear = [];
    const tol = 1e-6;
    for (const pt of data) {
      const margin = pt.y * (weights.w[0]*pt.x1 + weights.w[1]*pt.x2 + weights.b);
      if (margin <= 1 + tol) {
        supportVectorsLinear.push(pt);
      }
    }
  }

  function updateKKTLinear() {
    if (!hasTrainedOnce) {
      kktElem.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
      return;
    }
    let satisfied = 0, total = data.length, svViol = 0, nonSVViol = 0;
    let html = '<h4>KKT Conditions (Linear):</h4>';
    for (const pt of data) {
      const margin = pt.y * (weights.w[0]*pt.x1 + weights.w[1]*pt.x2 + weights.b);
      const isSV = margin <= 1 + 1e-3;
      let ok = true;
      if (isSV) {
        if (Math.abs(margin - 1) > 1e-2) { ok = false; svViol++; }
      } else {
        if (margin < 1 - 1e-3) { ok = false; nonSVViol++; }
      }
      if (ok) satisfied++;
    }
    const pct = total ? ((satisfied/total)*100).toFixed(1) : '0.0';
    html += `<div class="kkt-summary">KKT Satisfied: ${satisfied}/${total} (${pct}%)</div>`;
    html += `<div class="kkt-breakdown">`
         +   `<div>• Support vectors (margin ≤ 1): ${supportVectorsLinear.length}</div>`
         +   `<div>• SV margin‐violations: ${svViol}</div>`
         +   `<div>• Non‐SV margin‐violations: ${nonSVViol}</div>`
         + `</div>`;
    if (supportVectorsLinear.length > 0) {
      html += `<div class="sv-details"><h5>Example SVs:</h5>`;
      for (let i = 0; i < Math.min(5, supportVectorsLinear.length); i++) {
        const s = supportVectorsLinear[i];
        const m = (s.y*(weights.w[0]*s.x1 + weights.w[1]*s.x2 + weights.b)).toFixed(3);
        html += `<div class="sv-item">y=${s.y}, (x₁,x₂)=(${s.x1.toFixed(2)},${s.x2.toFixed(2)}), margin=${m}</div>`;
      }
      if (supportVectorsLinear.length > 5) {
        html += `<div class="sv-item">… and ${supportVectorsLinear.length - 5} more</div>`;
      }
      html += `</div>`;
    }
    kktElem.innerHTML = html;
  }

  // —═════════════════════════════════════════════
  // 2B) RBF via Random Fourier Features + Pegasos 
  // —═════════════════════════════════════════════
  async function trainRBFSVM() {
    // 1) Initialize RFF if first time
    if (randomWeights.length === 0) {
      initializeKernelApproximation();
    }

    const n = data.length;
    lambda = 1.0 / C;

    for (; iterationCount < maxIterations; iterationCount++) {
      const t   = iterationCount + 1;
      const eta = 1.0 / (lambda * t);

      // 2) Sample random point
      const idx = Math.floor(Math.random() * n);
      const { x1, x2, y } = data[idx];

      // 3) Compute φ(x) with correct scaling: φ_i(x) = sqrt(2/D) * cos(ω_i · x + b_i)
      const phi = computeApproximateFeatures(x1, x2);

      // 4) Compute functional margin f(x) = w·φ(x) + b
      let fx = approxBias;
      for (let i = 0; i < phi.length; i++) {
        fx += approxWeights[i] * phi[i];
      }
      const margin = y * fx;

      // 5) Pegasos update in RFF space
      if (margin < 1) {
        // approxWeights ← (1 − ηλ) approxWeights + η y φ
        for (let i = 0; i < approxWeights.length; i++) {
          approxWeights[i] = (1 - eta * lambda) * approxWeights[i] + eta * y * phi[i];
        }
        // approxBias ← approxBias + η y
        approxBias += eta * y;
      } else {
        // approxWeights ← (1 − ηλ) approxWeights
        for (let i = 0; i < approxWeights.length; i++) {
          approxWeights[i] = (1 - eta * lambda) * approxWeights[i];
        }
        // no update to bias
      }

      // 6) Every 10 iterations, update metrics + draw
      if (t % 10 === 0) {
        const trainAcc = calcTrainAccRBF();
        const trainLoss = calcRBFLoss();
        const testAcc  = calcTestAccRBF();
        accElem.textContent     = (trainAcc * 100).toFixed(1) + '%';
        lossElem.textContent    = trainLoss.toFixed(4);
        testAccElem.textContent = (testAcc * 100).toFixed(1) + '%';

        updateSupportVectorsRBF();
        svCountElem.textContent = supportVectorsRBF.length.toString();

        const xR = getXRange();
        const yR = getYRange();
        drawCanvas();               // clears axes + (if linear) boundary + points
        drawRBFRegion(xR, yR);      // shade decision region
        drawDataPoints(xR, yR);     // draw points on top
        await new Promise(r => setTimeout(r, 5));
      }

      // Early stopping if trainAcc > 0.99
      if (calcTrainAccRBF() > 0.99 && t > 50) break;
    }

    // Final metrics
    updateSupportVectorsRBF();
    const finalTrainAcc = calcTrainAccRBF();
    const finalTestAcc  = calcTestAccRBF();
    const finalLoss     = calcRBFLoss();
    accElem.textContent     = (finalTrainAcc * 100).toFixed(1) + '%';
    lossElem.textContent    = finalLoss.toFixed(4);
    testAccElem.textContent = (finalTestAcc * 100).toFixed(1) + '%';
    svCountElem.textContent = supportVectorsRBF.length.toString();

    const xR = getXRange();
    const yR = getYRange();
    drawCanvas();
    drawRBFRegion(xR, yR);
    drawDataPoints(xR, yR);
    updateKKTRBF();
  }

  // Initialize Random Fourier Features (Rahimi & Recht, 2007) 
  function initializeKernelApproximation() {
    numRandomFeatures = 200; 
    randomWeights     = [];
    randomBiases      = [];
    approxWeights     = new Array(numRandomFeatures).fill(0);
    approxBias        = 0;

    // Sample ω_i ~ N(0, 2γ I), b_i ~ Uniform(0, 2π)
    for (let i = 0; i < numRandomFeatures; i++) {
      const w1 = gaussianRandom() * Math.sqrt(2 * gamma);
      const w2 = gaussianRandom() * Math.sqrt(2 * gamma);
      randomWeights.push([w1, w2]);
      randomBiases.push(Math.random() * 2 * Math.PI);
    }
  }

  // Compute φ(x) vector with proper scaling: φ_i(x) = sqrt(2/D) * cos(ω_i · x + b_i)
  function computeApproximateFeatures(x1, x2) {
    const D = numRandomFeatures;
    const scale = Math.sqrt(2.0 / D);
    const features = new Array(D);
    for (let i = 0; i < D; i++) {
      const proj = randomWeights[i][0]*x1 + randomWeights[i][1]*x2 + randomBiases[i];
      features[i] = scale * Math.cos(proj);
    }
    return features;
  }

  function calcTrainAccRBF() {
    let correct = 0;
    for (const pt of data) {
      const phi = computeApproximateFeatures(pt.x1, pt.x2);
      let fx = approxBias;
      for (let i = 0; i < phi.length; i++) fx += approxWeights[i] * phi[i];
      const pred = fx >= 0 ? 1 : -1;
      if (pred === pt.y) correct++;
    }
    return data.length ? correct / data.length : 0;
  }
  function calcTestAccRBF() {
    let correct = 0;
    for (const pt of testData) {
      const phi = computeApproximateFeatures(pt.x1, pt.x2);
      let fx = approxBias;
      for (let i = 0; i < phi.length; i++) fx += approxWeights[i] * phi[i];
      const pred = fx >= 0 ? 1 : -1;
      if (pred === pt.y) correct++;
    }
    return testData.length ? correct / testData.length : 0;
  }
  function calcRBFLoss() {
    // ½ ||w||² + C ∑ hinge, where w is in RFF‐space
    let hingeSum = 0;
    for (const pt of data) {
      const phi = computeApproximateFeatures(pt.x1, pt.x2);
      let fx = approxBias;
      for (let i = 0; i < phi.length; i++) fx += approxWeights[i] * phi[i];
      const margin = pt.y * fx;
      if (margin < 1) hingeSum += (1 - margin);
    }
    let normW = 0;
    for (let i = 0; i < approxWeights.length; i++) normW += approxWeights[i] * approxWeights[i];
    const reg = 0.5 * normW;
    return reg + C * hingeSum;
  }

  let supportVectorsRBF = [];
  function updateSupportVectorsRBF() {
    supportVectorsRBF = [];
    const tol = 1e-6;
    for (const pt of data) {
      const phi = computeApproximateFeatures(pt.x1, pt.x2);
      let fx = approxBias;
      for (let i = 0; i < phi.length; i++) fx += approxWeights[i] * phi[i];
      const margin = pt.y * fx;
      if (margin <= 1 + tol) {
        supportVectorsRBF.push(pt);
      }
    }
  }

  function updateKKTRBF() {
    if (!hasTrainedOnce) {
      kktElem.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
      return;
    }
    let satisfied = 0, total = data.length, svViol = 0, nonSVViol = 0;
    let html = '<h4>KKT Conditions (RBF via RFF):</h4>';
    for (const pt of data) {
      const phi = computeApproximateFeatures(pt.x1, pt.x2);
      let fx = approxBias;
      for (let i = 0; i < phi.length; i++) fx += approxWeights[i] * phi[i];
      const margin = pt.y * fx;
      const isSV = margin <= 1 + 1e-3;
      let ok = true;
      if (isSV) {
        if (Math.abs(margin - 1) > 1e-2) { ok = false; svViol++; }
      } else {
        if (margin < 1 - 1e-3) { ok = false; nonSVViol++; }
      }
      if (ok) satisfied++;
    }
    const pct = total ? ((satisfied/total)*100).toFixed(1) : '0.0';
    html += `<div class="kkt-summary">KKT Satisfied: ${satisfied}/${total} (${pct}%)</div>`;
    html += `<div class="kkt-breakdown">`
         +   `<div>• Support vectors (margin ≤ 1): ${supportVectorsRBF.length}</div>`
         +   `<div>• SV margin-violations: ${svViol}</div>`
         +   `<div>• Non-SV margin-violations: ${nonSVViol}</div>`
         + `</div>`;
    if (supportVectorsRBF.length > 0) {
      html += `<div class="sv-details"><h5>Example SVs:</h5>`;
      for (let i = 0; i < Math.min(5, supportVectorsRBF.length); i++) {
        const s = supportVectorsRBF[i];
        const phi = computeApproximateFeatures(s.x1, s.x2);
        let fx = approxBias;
        for (let j = 0; j < phi.length; j++) fx += approxWeights[j] * phi[j];
        const m = (s.y * fx).toFixed(3);
        html += `<div class="sv-item">y=${s.y}, (x₁,x₂)=(${s.x1.toFixed(2)},${s.x2.toFixed(2)}), margin=${m}</div>`;
      }
      if (supportVectorsRBF.length > 5) {
        html += `<div class="sv-item">… and ${supportVectorsRBF.length - 5} more</div>`;
      }
      html += `</div>`;
    }
    kktElem.innerHTML = html;
  }

  // —═════════════════════════════════════════════
  // 3) DRAWING (axes + linear boundary + data points + RBF region)
  // —═════════════════════════════════════════════
  function drawCanvas() {
    ctx.clearRect(0, 0, canvasW, canvasH);
    const xR = getXRange();
    const yR = getYRange();
    drawAxes(xR, yR);

    if (hasTrainedOnce && kernelType === 'linear') {
      drawLinearBoundary(xR, yR);
    }
    drawDataPoints(xR, yR);
  }

  function getXRange() {
    const allPts = data.concat(testData);
    const xs = allPts.map(pt => pt.x1);
    const mn = Math.min(...xs), mx = Math.max(...xs);
    const pad = Math.max((mx - mn)*0.15, 0.1);
    return { min: mn - pad, max: mx + pad };
  }
  function getYRange() {
    const allPts = data.concat(testData);
    const ys = allPts.map(pt => pt.x2);
    const mn = Math.min(...ys), mx = Math.max(...ys);
    const pad = Math.max((mx - mn)*0.15, 0.1);
    return { min: mn - pad, max: mx + pad };
  }

  function drawAxes(xR, yR) {
    const plotW = canvasW - 2*50;
    const plotH = canvasH - 2*50;
    const xScale = plotW / (xR.max - xR.min);
    const yScale = plotH / (yR.max - yR.min);

    // grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    const yStep = (yR.max - yR.min)/10;
    for (let y = Math.ceil(yR.min/yStep)*yStep; y <= yR.max; y += yStep) {
      const cy = canvasH - 50 - (y - yR.min)*yScale;
      ctx.beginPath(); ctx.moveTo(50, cy); ctx.lineTo(canvasW - 50, cy); ctx.stroke();
    }
    const xStep = (xR.max - xR.min)/10;
    for (let x = Math.ceil(xR.min/xStep)*xStep; x <= xR.max; x += xStep) {
      const cx = 50 + (x - xR.min)*xScale;
      ctx.beginPath(); ctx.moveTo(cx, 50); ctx.lineTo(cx, canvasH - 50); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    // x-axis (y=0)
    const y0 = canvasH - 50 - (0 - yR.min)*yScale;
    ctx.beginPath(); ctx.moveTo(50, y0); ctx.lineTo(canvasW - 50, y0); ctx.stroke();
    // y-axis (x=0)
    const x0 = 50 + (0 - xR.min)*xScale;
    ctx.beginPath(); ctx.moveTo(x0, 50); ctx.lineTo(x0, canvasH - 50); ctx.stroke();
  }

  function drawLinearBoundary(xR, yR) {
    if (Math.abs(weights.w[1]) < 1e-6) return;
    const plotW = canvasW - 2*50;
    const plotH = canvasH - 2*50;
    const xScale = plotW / (xR.max - xR.min);
    const yScale = plotH / (yR.max - yR.min);

    const pts = [];
    for (let x = xR.min; x <= xR.max; x += (xR.max - xR.min)/200) {
      const y = -(weights.w[0]*x + weights.b) / weights.w[1];
      if (y < yR.min || y > yR.max) continue;
      const cx = 50 + (x - xR.min)*xScale;
      const cy = canvasH - 50 - (y - yR.min)*yScale;
      pts.push({ x: cx, y: cy });
    }
    if (pts.length < 2) return;
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Draw margins ±1
    drawMarginLine(xR, yR, +1, '#95a5a6');
    drawMarginLine(xR, yR, -1, '#95a5a6');
  }

  function drawMarginLine(xR, yR, offset, color) {
    if (Math.abs(weights.w[1]) < 1e-6) return;
    const plotW = canvasW - 2*50;
    const plotH = canvasH - 2*50;
    const xScale = plotW / (xR.max - xR.min);
    const yScale = plotH / (yR.max - yR.min);

    const pts = [];
    for (let x = xR.min; x <= xR.max; x += (xR.max - xR.min)/200) {
      const y = -(weights.w[0]*x + weights.b - offset) / weights.w[1];
      if (y < yR.min || y > yR.max) continue;
      const cx = 50 + (x - xR.min)*xScale;
      const cy = canvasH - 50 - (y - yR.min)*yScale;
      pts.push({ x: cx, y: cy });
    }
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawDataPoints(xR, yR) {
    const plotW = canvasW - 2*50;
    const plotH = canvasH - 2*50;
    const xScale = plotW / (xR.max - xR.min);
    const yScale = plotH / (yR.max - yR.min);

    // Training points
    for (const pt of data) {
      const cx = 50 + (pt.x1 - xR.min)*xScale;
      const cy = canvasH - 50 - (pt.x2 - yR.min)*yScale;
      let isSV = false;
      if (hasTrainedOnce) {
        if (kernelType === 'linear') {
          const margin = pt.y * (weights.w[0]*pt.x1 + weights.w[1]*pt.x2 + weights.b);
          isSV = (margin <= 1 + 1e-6);
        } else {
          const phi = computeApproximateFeatures(pt.x1, pt.x2);
          let fx = approxBias;
          for (let i = 0; i < phi.length; i++) fx += approxWeights[i] * phi[i];
          const margin = pt.y * fx;
          isSV = (margin <= 1 + 1e-6);
        }
      }
      ctx.fillStyle = pt.y === 1 ? '#e74c3c' : '#3498db';
      if (isSV) {
        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      }
      ctx.beginPath(); ctx.arc(cx, cy, isSV ? 7 : 5, 0, 2*Math.PI);
      ctx.fill(); ctx.stroke();
    }

    // Test points (semi‐transparent)
    for (const pt of testData) {
      const cx = 50 + (pt.x1 - xR.min)*xScale;
      const cy = canvasH - 50 - (pt.x2 - yR.min)*yScale;
      ctx.fillStyle = pt.y === 1 ? 'rgba(231,76,60,0.5)' : 'rgba(52,152,219,0.5)';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(cx - 4, cy - 4, 8, 8);
      ctx.fill(); ctx.stroke();
    }
  }

  // —═════════════════════════════════════════════
  // 4) DRAW RBF DECISION REGION (background shading)
  // —═════════════════════════════════════════════
  function drawRBFRegion(xR, yR) {
    if (randomWeights.length === 0) return; // not initialized

    const plotW = canvasW - 2*50;
    const plotH = canvasH - 2*50;
    const xScale = plotW / (xR.max - xR.min);
    const yScale = plotH / (yR.max - yR.min);

    const gridSize = 200;
    const dx = (xR.max - xR.min) / gridSize;
    const dy = (yR.max - yR.min) / gridSize;

    ctx.globalAlpha = 0.25;
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = xR.min + i * dx;
        const y = yR.min + j * dy;
        const phi = computeApproximateFeatures(x, y);
        let fx = approxBias;
        for (let k = 0; k < phi.length; k++) {
          fx += approxWeights[k] * phi[k];
        }
        const pred = fx >= 0 ? 1 : -1;
        const color = pred === 1 ? 'rgba(231,76,60,0.1)' : 'rgba(52,152,219,0.1)';
        const cx = 50 + (x - xR.min)*xScale;
        const cy = canvasH - 50 - (y - yR.min)*yScale;
        ctx.fillStyle = color;
        ctx.fillRect(cx, cy, xScale * dx + 1, yScale * dy + 1);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // ―――――――――――――――――――――――――――――――――――――――――――
  //  Utility: Gaussian random (Box–Muller)
  // ―――――――――――――――――――――――――――――――――――――――――――
  function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // ―――――――――――――――――――――――――――――――――――――――――――
  //  Utility: Handle window resize
  // ―――――――――――――――――――――――――――――――――――――――――――
  function handleResize() {
    const parent = canvas.parentElement;
    const wPx    = parent.clientWidth;
    const ratio  = canvasH / canvasW;
    canvas.style.width  = `${wPx}px`;
    canvas.style.height = `${wPx * ratio}px`;
    drawCanvas();
  }

  // ―――――――――――――――――――――――――――――――――――――――――――
  // INITIALIZE + DRAW
  // ―――――――――――――――――――――――――――――――――――――――――――
  generateData();
  handleResize();
});

// ―――――――――――――――――――――――――――――――――――――――――――――
// References
// [1] Shalev‐Shwartz, S., Singer, Y., & Srebro, N. (2007). 
//     “Pegasos: Primal Estimated Sub‐Gradient Solver for SVM,” ICML.
//     Pegasos uses ηₜ = 1/(λ t), λ = 1/C for provable convergence. 
// [2] Rahimi, A., & Recht, B. (2007). 
//     “Random Features for Large‐Scale Kernel Machines,” NIPS.
//     φ_i(x) = √(2/D) cos(ω_i · x + b_i), ω_i ∼ N(0, 2γI). 
