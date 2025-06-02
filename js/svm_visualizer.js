// svm_visualizer.js
//
// Updated SVM visualizer to support both Linear (Pegasos) and RBF‐Kernel (libsvm.js) modes.
// Option A: Integrate libsvm.js for non‐linear SVM training & visualization.
//
// Prerequisite: Include libsvm.js in your HTML before this script.
//    <script src="https://unpkg.com/libsvm-js@0.6.0/lib/libsvm.js"></script>
//
// References:
// [1] Shalev‐Shwartz, S., Singer, Y., Srebro, N., & Cotter, A. (2007). Pegasos: Primal Estimated sub‐gradient SOlver for SVM. ICML 2007.
// [2] Shalev‐Shwartz, S. (2012). Online Learning: SVMs, Perceptrons, Pegasos, and All That. MIT OCW.
// [3] libsvm‐js: https://github.com/mljs/libsvm
//
// Note: This file assumes libsvm.js is loaded and available via window.LibSVM.

document.addEventListener('DOMContentLoaded', function() {
  // —————————————————————————————————————————————
  // State + DOM Elements
  // —————————————————————————————————————————————
  let data = [];            // training points: {x1, x2, y}
  let testData = [];        // test points
  let w = [0, 0];           // weight vector for linear SVM
  let b = 0;                // bias for linear SVM
  let C = 1.0;              // regularization (user sets via slider)
  let lambda = 1.0 / C;     // Pegasos λ = 1/C
  let maxIterations = 300;  // number of SGD steps for linear mode
  let iterationCount = 0;   // global counter for Pegasos η_t = 1/(λ·t)
  let gamma = 0.1;          // RBF kernel width (user sets via slider)
  let bestAccuracy = 0;     // track best train‐accuracy seen
  let supportVectors = [];  // for linear mode: any point with margin ≤ 1
  let svmModel = null;      // for kernel mode: trained libsvm.js model
  let hasTrainedOnce = false;
  let isTraining = false;

  // DOM elements
  let kernelSelect, cInput, cDisplay, gammaInput, gammaDisplay,
      iterationsInput, iterationsDisplay,
      trainBtn, generateBtn,
      accuracyElement, lossElement, testAccuracyElement,
      supportVectorCountElement, kktConditionsElement;
  let canvas, ctx, canvasWidth, canvasHeight;
  const plotMargin = 50;

  // Initialize DOM + HTML structure
  const container = document.getElementById('svm_visualizer');
  if (!container) {
    console.error('Container element not found!');
    return;
  }
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
              <div class="legend-item"><span class="legend-color class-pos"></span> Train Class +1</div>
              <div class="legend-item"><span class="legend-color class-neg"></span> Train Class -1</div>
              <div class="legend-item"><span class="legend-color test-pos"></span> Test Class +1</div>
              <div class="legend-item"><span class="legend-color test-neg"></span> Test Class -1</div>
              <div class="legend-item"><span class="legend-color support-vector"></span> Support Vector</div>
              <div class="legend-item"><span class="legend-color decision-boundary"></span> Decision Boundary</div>
              <div class="legend-item"><span class="legend-color margin"></span> Margin (±1 / Decision Region)</div>
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
              <option value="rbf">RBF (via libsvm.js)</option>
            </select>
          </div>

          <div class="control-group">
            <label for="c-parameter">Regularization (C):</label>
            <input type="range" id="c-parameter" min="-2" max="3" step="0.1" value="0" class="full-width">
            <span id="c-display">C = 1.0</span>
            <div class="param-hint">Higher C = less regularization (narrower margin)</div>
          </div>

          <div class="control-group">
            <label for="gamma-parameter">Gamma (RBF only):</label>
            <input type="range" id="gamma-parameter" min="-3" max="1" step="0.1" value="-1" class="full-width">
            <span id="gamma-display">γ = 0.1</span>
            <div class="param-hint">RBF: K(x,z)=exp(−γ||x−z||²)</div>
          </div>

          <div class="control-group">
            <label for="iterations">Max Iterations (SGD steps for linear):</label>
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
              Linear uses Pegasos ηₜ=1/(λ·t), λ=1/C. RBF uses libsvm.js with chosen C &amp; γ.
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

  // Attach CSS styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .svm-container { font-family: Arial, sans-serif; margin-bottom: 20px; }
    .svm-layout { display: flex; flex-direction: column; gap: 20px; }
    @media (min-width: 992px) {
      .svm-layout { flex-direction: row; }
      .svm-visualization { flex: 3; order: 1; }
      .controls-panel     { flex: 2; order: 2; }
    }
    .canvas-container { display: flex; flex-direction: column; }
    #canvas-wrapper { position: relative; width: 100%; }
    #svm-canvas {
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
      max-width: 100%;
      height: auto;
      display: block;
    }
    .controls-panel {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .control-group { margin-bottom: 15px; }
    .control-group label { display: block; font-weight: bold; margin-bottom: 8px; }
    .full-width {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .param-hint {
      font-size: 0.8rem;
      color: #666;
      margin-top: 4px;
      font-style: italic;
    }
    .instruction {
      text-align: center;
      margin-bottom: 10px;
      font-size: 0.9rem;
      color: #666;
    }
    .legend {
      margin-top: 10px;
      display: flex;
      gap: 15px;
      font-size: 0.9rem;
      color: #666;
      justify-content: center;
      flex-wrap: wrap;
    }
    .legend-item { display: flex; align-items: center; }
    .legend-color {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 5px;
      border-radius: 2px;
    }
    .legend-color.class-pos      { background-color: #e74c3c; }
    .legend-color.class-neg      { background-color: #3498db; }
    .legend-color.test-pos       { background-color: rgba(231,76,60,0.5); }
    .legend-color.test-neg       { background-color: rgba(52,152,219,0.5); }
    .legend-color.support-vector { background-color: #f39c12; border: 2px solid #f39c12; border-radius: 50%; }
    .legend-color.decision-boundary { background-color: #2c3e50; }
    .legend-color.margin         { background: repeating-linear-gradient(45deg, #95a5a6, #95a5a6 3px, transparent 3px, transparent 6px); }
    .primary-btn, .secondary-btn {
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 15px;
      font-size: 1rem;
      cursor: pointer;
      width: 100%;
      margin-bottom: 10px;
    }
    .primary-btn { background-color: #3498db; }
    .primary-btn:hover { background-color: #2980b9; }
    .secondary-btn { background-color: #95a5a6; }
    .secondary-btn:hover { background-color: #7f8c8d; }
    .results-box {
      background-color: #f0f7ff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .results-box h3 { margin-top: 0; margin-bottom: 10px; font-size: 1rem; }
    .result-row { display: flex; flex-wrap: wrap; margin-bottom: 5px; }
    .result-label { font-weight: bold; flex-basis: 60%; }
    .result-value {
      font-family: monospace;
      flex-basis: 40%;
      text-align: right;
    }
    .result-hint {
      font-size: 0.8rem;
      color: #666;
      font-style: italic;
      margin-top: 8px;
      text-align: center;
    }
    .kkt-conditions {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #9b59b6;
    }
    .kkt-conditions h4 {
      margin-top: 0;
      margin-bottom: 10px;
      color: #9b59b6;
    }
    .kkt-summary { font-weight: bold; margin-bottom: 10px; color: #27ae60; }
    .kkt-breakdown {
      font-size: 0.9rem;
      margin-bottom: 10px;
      padding: 8px;
      background-color: white;
      border-radius: 4px;
      border-left: 3px solid #9b59b6;
    }
    .kkt-breakdown div { margin: 3px 0; }
    .sv-details {
      margin-top: 10px;
      padding: 10px;
      background-color: white;
      border-radius: 4px;
    }
    .sv-details h5 {
      margin: 0 0 8px 0;
      font-size: 0.9rem;
      color: #333;
    }
    .sv-item {
      font-family: monospace;
      font-size: 0.8rem;
      margin: 2px 0;
      padding: 2px 4px;
      background-color: #f8f9fa;
      border-radius: 2px;
    }
    .btn-container { margin-bottom: 20px; }
    .svm-visualization {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
  `;
  document.head.appendChild(styleElement);

  // Grab DOM elements
  canvas = document.getElementById('svm-canvas');
  ctx = canvas.getContext('2d');
  canvasWidth = canvas.width;
  canvasHeight = canvas.height;

  kernelSelect            = document.getElementById('kernel-select');
  cInput                  = document.getElementById('c-parameter');
  cDisplay                = document.getElementById('c-display');
  gammaInput              = document.getElementById('gamma-parameter');
  gammaDisplay            = document.getElementById('gamma-display');
  iterationsInput         = document.getElementById('iterations');
  iterationsDisplay       = document.getElementById('iterations-display');
  trainBtn                = document.getElementById('train-btn');
  generateBtn             = document.getElementById('generate-btn');
  accuracyElement         = document.getElementById('accuracy');
  lossElement             = document.getElementById('loss');
  testAccuracyElement     = document.getElementById('test-accuracy');
  supportVectorCountElement = document.getElementById('support-vector-count');
  kktConditionsElement    = document.getElementById('kkt-conditions');

  // —————————————————————————————————————————————
  // INITIAL PARAMETER SETUP
  // —————————————————————————————————————————————
  function handleCParameterChange() {
    C = Math.pow(10, parseFloat(cInput.value));
    cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
    lambda = 1.0 / C; // for Pegasos
  }
  function handleGammaParameterChange() {
    gamma = Math.pow(10, parseFloat(gammaInput.value));
    gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : gamma < 1 ? 2 : 1)}`;
  }
  function handleIterationsChange() {
    maxIterations = parseInt(iterationsInput.value);
    iterationsDisplay.textContent = maxIterations.toString();
  }
  function handleKernelChange() {
    // No additional UI toggles needed; we just branch on kernelSelect in trainModel()
  }

  cInput.addEventListener('input', handleCParameterChange);
  gammaInput.addEventListener('input', handleGammaParameterChange);
  iterationsInput.addEventListener('input', handleIterationsChange);
  kernelSelect.addEventListener('change', handleKernelChange);
  trainBtn.addEventListener('click', trainModel);
  generateBtn.addEventListener('click', generateData);
  window.addEventListener('resize', handleResize);

  // Initialize slider displays
  C = Math.pow(10, parseFloat(cInput.value));
  cDisplay.textContent = `C = ${C.toFixed(1)}`;
  lambda = 1.0 / C;
  gamma = Math.pow(10, parseFloat(gammaInput.value));
  gammaDisplay.textContent = `γ = ${gamma.toFixed(1)}`;
  maxIterations = parseInt(iterationsInput.value);
  iterationsDisplay.textContent = maxIterations.toString();

  // —————————————————————————————————————————————
  // 1) DATA GENERATION (linear vs. circular)
  // —————————————————————————————————————————————
  function generateData() {
    const numPoints = 150;
    const trainSize = 100;
    let allPoints = [];

    const pattern = Math.random() > 0.5 ? 'linear' : 'circular';
    hasTrainedOnce = false;
    svmModel = null;

    if (pattern === 'linear') {
      for (let i = 0; i < numPoints; i++) {
        const x1 = (Math.random() - 0.5) * 4;
        const x2 = (Math.random() - 0.5) * 4;
        const boundary = 0.8 * x1 + 0.5 * x2;
        if (Math.random() < 0.85) {
          const y = boundary > 0 ? 1 : -1;
          allPoints.push({ x1, x2, y });
        } else {
          const noise = (Math.random() - 0.5) * 1.0;
          const noisyBoundary = boundary + noise;
          const y = noisyBoundary > 0 ? 1 : -1;
          allPoints.push({ x1, x2, y });
        }
      }
    } else {
      for (let i = 0; i < numPoints; i++) {
        const angle = Math.random() * 2 * Math.PI;
        let radius, y;
        if (Math.random() < 0.8) {
          if (Math.random() < 0.5) {
            radius = Math.random() * 0.8;
            y = 1;
          } else {
            radius = 1.8 + Math.random() * 0.7;
            y = -1;
          }
        } else {
          radius = 1.0 + (Math.random() - 0.5) * 0.8;
          y = radius < 1.3 ? 1 : -1;
          if (Math.random() < 0.3) y = -y;
        }
        const x1 = radius * Math.cos(angle);
        const x2 = radius * Math.sin(angle);
        allPoints.push({ x1, x2, y });
      }
    }

    // Shuffle
    for (let i = allPoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]];
    }

    data = allPoints.slice(0, trainSize);
    testData = allPoints.slice(trainSize);

    // Reinitialize
    initializeWeights();
    supportVectors = [];
    iterationCount = 0;
    bestAccuracy = 0;
    hasTrainedOnce = false;
    svmModel = null;

    // Reset metrics & UI
    accuracyElement.textContent = '0.0%';
    lossElement.textContent = '0.0000';
    testAccuracyElement.textContent = '0.0%';
    supportVectorCountElement.textContent = '0';
    kktConditionsElement.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';

    drawCanvas();
  }

  function initializeWeights() {
    w = [Math.random() * 0.01, Math.random() * 0.01];
    b = 0;
    iterationCount = 0;
    bestAccuracy = 0;
  }

  // —————————————————————————————————————————————
  // 2) TRAINING (branch on kernel)
  // —————————————————————————————————————————————
  async function trainModel() {
    if (isTraining) return;
    isTraining = true;
    const kernel = kernelSelect.value;

    trainBtn.disabled = true;
    trainBtn.textContent = kernel === 'linear' ? 'Training Linear...' : 'Training RBF...';

    if (kernel === 'linear') {
      await trainLinearSVM();
    } else {
      await trainKernelSVM();
    }

    trainBtn.disabled = false;
    trainBtn.textContent = 'Train SVM';
    isTraining = false;
    hasTrainedOnce = true;
  }

  // — Linear Pegasos Training — 
  async function trainLinearSVM() {
    console.log(`Pegasos Linear SVM: C=${C}, λ=${lambda}, maxIter=${maxIterations}`);
    for (; iterationCount < maxIterations; iterationCount++) {
      const t = iterationCount + 1;
      const eta = 1.0 / (lambda * t);
      const idx = Math.floor(Math.random() * data.length);
      const { x1, x2, y } = data[idx];
      const dot = w[0] * x1 + w[1] * x2 + b;
      const margin = y * dot;

      if (margin < 1) {
        w[0] = (1 - eta * lambda) * w[0] + eta * y * x1;
        w[1] = (1 - eta * lambda) * w[1] + eta * y * x2;
        b += eta * y;
      } else {
        w[0] = (1 - eta * lambda) * w[0];
        w[1] = (1 - eta * lambda) * w[1];
      }

      if (t % 10 === 0) {
        const currAcc = calculateAccuracy();
        const currLoss = calculateLinearSVMLoss();
        const testAcc = calculateTestAccuracy();
        if (currAcc > bestAccuracy + 0.005) {
          bestAccuracy = currAcc;
        }
        accuracyElement.textContent = (currAcc * 100).toFixed(1) + '%';
        lossElement.textContent = currLoss.toFixed(4);
        testAccuracyElement.textContent = (testAcc * 100).toFixed(1) + '%';
        updateSupportVectors();
        supportVectorCountElement.textContent = supportVectors.length.toString();
        drawCanvas();
        await new Promise(r => setTimeout(r, 5));
      }

      const trainAccNow = calculateAccuracy();
      if (trainAccNow >= 0.99) {
        console.log(`Early stop at iter ${t}, trainAcc=${(trainAccNow*100).toFixed(1)}%`);
        break;
      }
    }

    updateSupportVectors();
    const finalAcc = calculateAccuracy();
    const finalTestAcc = calculateTestAccuracy();
    const finalLoss = calculateLinearSVMLoss();
    accuracyElement.textContent     = (finalAcc * 100).toFixed(1) + '%';
    lossElement.textContent         = finalLoss.toFixed(4);
    testAccuracyElement.textContent = (finalTestAcc * 100).toFixed(1) + '%';
    supportVectorCountElement.textContent = supportVectors.length.toString();
    drawCanvas();
    updateKKTLinear();
    console.log(`Linear SVM done at iter ${iterationCount}, trainAcc=${(finalAcc*100).toFixed(1)}%, SV=${supportVectors.length}`);
  }

  // — Kernel SVM Training via libsvm.js —
  async function trainKernelSVM() {
    if (!window.LibSVM) {
      alert('libsvm.js not loaded. Please include it before this script.');
      return;
    }
    console.log(`Training RBF SVM: C=${C}, γ=${gamma}`);

    // Prepare data
    const { labels, features } = prepareLibSVMData(data);
    const options = {
      kernel: 'RBF',
      C: C,
      gamma: gamma,
      probabilityEstimates: false
    };
    svmModel = new window.LibSVM(options);
    await svmModel.train({ x: features, y: labels });

    // Compute train/test accuracy
    let correctTrain = 0;
    for (const pt of data) {
      const pred = svmModel.predictSync([pt.x1, pt.x2]);
      if (pred === pt.y) correctTrain++;
    }
    const trainAcc = (correctTrain / data.length);

    let correctTest = 0;
    for (const pt of testData) {
      const pred = svmModel.predictSync([pt.x1, pt.x2]);
      if (pred === pt.y) correctTest++;
    }
    const testAcc = (correctTest / testData.length);

    accuracyElement.textContent     = (trainAcc * 100).toFixed(1) + '%';
    testAccuracyElement.textContent = (testAcc * 100).toFixed(1) + '%';

    // Get support vectors (libsvm.js provides indices or vector list)
    const svs = svmModel.getSupportVectorsSync();
    supportVectorCountElement.textContent = svs.length.toString();

    // Draw decision region + points
    const xRange = calculateXRange();
    const yRange = calculateYRange();
    drawCanvas();         // clears existing
    drawRBFBoundary(svmModel, xRange, yRange);
    drawDataPoints(xRange, yRange);
    updateKKTKernel(svmModel);

    console.log(`RBF SVM done: trainAcc=${(trainAcc*100).toFixed(1)}%, SV=${svs.length}`);
  }

  // —————————————————————————————————————————————
  // 3) LOSS / ACCURACY / SUPPORT‐VECTOR CALCULATIONS
  // —————————————————————————————————————————————
  function calculateAccuracy() {
    let correct = 0;
    for (const pt of data) {
      const pred = predictLinear(pt.x1, pt.x2);
      if (pred === pt.y) correct++;
    }
    return data.length > 0 ? correct / data.length : 0;
  }
  function calculateTestAccuracy() {
    let correct = 0;
    for (const pt of testData) {
      const pred = predictLinear(pt.x1, pt.x2);
      if (pred === pt.y) correct++;
    }
    return testData.length > 0 ? correct / testData.length : 0;
  }
  function calculateLinearSVMLoss() {
    let hingeSum = 0;
    for (const pt of data) {
      const margin = pt.y * (w[0]*pt.x1 + w[1]*pt.x2 + b);
      if (margin < 1) hingeSum += (1 - margin);
    }
    const regTerm = 0.5 * lambda * (w[0]*w[0] + w[1]*w[1]);
    return regTerm + (hingeSum / data.length);
  }
  function predictLinear(x1, x2) {
    const score = w[0]*x1 + w[1]*x2 + b;
    return score >= 0 ? 1 : -1;
  }
  function updateSupportVectors() {
    supportVectors = [];
    if (!hasTrainedOnce) return;
    const tol = 1e-6;
    for (const pt of data) {
      const margin = pt.y * (w[0]*pt.x1 + w[1]*pt.x2 + b);
      if (margin <= 1 + tol) {
        supportVectors.push({
          x1: pt.x1,
          x2: pt.x2,
          y: pt.y,
          margin: margin
        });
      }
    }
  }

  function updateKKTLinear() {
    if (!kktConditionsElement || !hasTrainedOnce) {
      kktConditionsElement.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
      return;
    }
    let html = '<h4>KKT Conditions Check (Linear):</h4>';
    let satisfied = 0;
    let total = data.length;
    let svViolations = 0;
    let nonSVViolations = 0;
    for (const pt of data) {
      const margin = pt.y * (w[0]*pt.x1 + w[1]*pt.x2 + b);
      const isSV = margin <= 1 + 1e-3;
      let condOK = true;
      if (isSV) {
        if (Math.abs(margin - 1) > 1e-2) {
          condOK = false; svViolations++;
        }
      } else {
        if (margin < 1 - 1e-3) {
          condOK = false; nonSVViolations++;
        }
      }
      if (condOK) satisfied++;
    }
    const pct = total>0 ? ((satisfied/total)*100).toFixed(1) : '0.0';
    html += `<div class="kkt-summary">KKT Satisfied: ${satisfied}/${total} (${pct}%)</div>`;
    html += `<div class="kkt-breakdown">`;
    html += `<div>• Support vectors (margin ≤ 1): ${supportVectors.length}</div>`;
    html += `<div>• SV margin‐violations: ${svViolations}</div>`;
    html += `<div>• Non‐SV margin‐violations: ${nonSVViolations}</div>`;
    html += `</div>`;
    if (supportVectors.length > 0) {
      html += `<div class="sv-details"><h5>Example Support Vectors:</h5>`;
      for (let i = 0; i < Math.min(5, supportVectors.length); i++) {
        const sv = supportVectors[i];
        html += `<div class="sv-item">y=${sv.y}, (x₁,x₂)=(${sv.x1.toFixed(2)},${sv.x2.toFixed(2)}), margin=${sv.margin.toFixed(3)}</div>`;
      }
      if (supportVectors.length > 5) {
        html += `<div class="sv-item">… and ${supportVectors.length - 5} more</div>`;
      }
      html += `</div>`;
    }
    kktConditionsElement.innerHTML = html;
  }

  // —————————————————————————————————————————————
  // 4) KERNEL HELPERS (libsvm.js)
  // —————————————————————————————————————————————
  function prepareLibSVMData(dataArray) {
    const labels = dataArray.map(pt => (pt.y === 1 ? 1 : -1));
    const features = dataArray.map(pt => [pt.x1, pt.x2]);
    return { labels, features };
  }

  function drawRBFBoundary(svm, xRange, yRange) {
    const plotWidth  = canvasWidth  - 2*plotMargin;
    const plotHeight = canvasHeight - 2*plotMargin;
    const xScale = plotWidth  / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);

    const gridSize = 200;
    const dx = (xRange.max - xRange.min)/gridSize;
    const dy = (yRange.max - yRange.min)/gridSize;

    ctx.globalAlpha = 0.3;
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = xRange.min + i*dx;
        const y = yRange.min + j*dy;
        const pred = svm.predictSync([x, y]);
        const color = pred === 1 ? 'rgba(231,76,60,0.1)' : 'rgba(52,152,219,0.1)';
        const canvasX = plotMargin + (x - xRange.min)*xScale;
        const canvasY = canvasHeight - plotMargin - (y - yRange.min)*yScale;
        ctx.fillStyle = color;
        ctx.fillRect(canvasX, canvasY, xScale*dx + 1, yScale*dy + 1);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  function updateKKTKernel(svm) {
    if (!kktConditionsElement || !hasTrainedOnce) return;
    const alphas = svm.getAlphaSync();
    const svs = svm.getSupportVectorsSync();
    const labels = svm.getLabelsSync();

    let satisfied = 0;
    let svViolations = 0;
    let nonsvViolations = 0;
    let html = '<h4>KKT Conditions Check (RBF):</h4>';

    for (let i = 0; i < labels.length; i++) {
      const α_i = alphas[i];
      const y_i = labels[i];
      const x_i = svs[i];
      const rawScore = svm.predictSync(x_i, { kernelDecision: true }); 
      const margin = y_i * rawScore;

      let condOK = true;
      if (α_i > 1e-8 && α_i < C - 1e-8) {
        if (Math.abs(margin - 1) > 1e-2) { condOK = false; svViolations++; }
      } else if (α_i < 1e-8) {
        if (margin < 1 - 1e-3) { condOK = false; nonsvViolations++; }
      } else {
        if (margin > 1 + 1e-3) { condOK = false; svViolations++; }
      }
      if (condOK) satisfied++;

      if (i < 5) {
        html += `<div>α=${α_i.toFixed(3)}, y=${y_i}, margin=${margin.toFixed(3)}, OK=${condOK}</div>`;
      }
    }
    const total = labels.length;
    const pct = total > 0 ? ((satisfied/total)*100).toFixed(1) : '0.0';
    html = `<div class="kkt-summary">KKT Satisfied: ${satisfied}/${total} (${pct}%)</div>` +
           `<div>SV‐violations: ${svViolations}, NonSV‐violations: ${nonsvViolations}</div>` +
           html;
    kktConditionsElement.innerHTML = html;
  }

  // —————————————————————————————————————————————
  // 5) DRAWING (axes / data points / boundary)
  // —————————————————————————————————————————————
  function drawCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const xRange = calculateXRange();
    const yRange = calculateYRange();
    drawAxes(xRange, yRange);

    if (hasTrainedOnce && kernelSelect.value === 'linear') {
      drawLinearBoundary(xRange, yRange);
    }
    drawDataPoints(xRange, yRange);
  }

  function calculateXRange() {
    const allPts = data.concat(testData);
    const xs = allPts.map(pt => pt.x1);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const pad = Math.max((maxX - minX)*0.15, 0.1);
    return { min: minX - pad, max: maxX + pad };
  }
  function calculateYRange() {
    const allPts = data.concat(testData);
    const ys = allPts.map(pt => pt.x2);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = Math.max((maxY - minY)*0.15, 0.1);
    return { min: minY - pad, max: maxY + pad };
  }

  function drawAxes(xRange, yRange) {
    const plotWidth  = canvasWidth  - 2*plotMargin;
    const plotHeight = canvasHeight - 2*plotMargin;
    const xScale = plotWidth  / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);

    // grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    const yStep = (yRange.max - yRange.min) / 10;
    for (let y = Math.ceil(yRange.min / yStep)*yStep; y <= yRange.max; y += yStep) {
      const canvasY = canvasHeight - plotMargin - (y - yRange.min) * yScale;
      ctx.beginPath();
      ctx.moveTo(plotMargin, canvasY);
      ctx.lineTo(canvasWidth - plotMargin, canvasY);
      ctx.stroke();
    }
    const xStep = (xRange.max - xRange.min) / 10;
    for (let x = Math.ceil(xRange.min / xStep)*xStep; x <= xRange.max; x += xStep) {
      const canvasX = plotMargin + (x - xRange.min) * xScale;
      ctx.beginPath();
      ctx.moveTo(canvasX, plotMargin);
      ctx.lineTo(canvasWidth - plotMargin, canvasX);
      ctx.stroke();
    }
    // axes
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    const yZeroPos = canvasHeight - plotMargin - (0 - yRange.min)*yScale;
    ctx.beginPath();
    ctx.moveTo(plotMargin, yZeroPos);
    ctx.lineTo(canvasWidth - plotMargin, yZeroPos);
    ctx.stroke();
    const xZeroPos = plotMargin + (0 - xRange.min)*xScale;
    ctx.beginPath();
    ctx.moveTo(xZeroPos, plotMargin);
    ctx.lineTo(xZeroPos, canvasHeight - plotMargin);
    ctx.stroke();
  }

  function drawLinearBoundary(xRange, yRange) {
    if (!hasTrainedOnce) return;
    const plotWidth  = canvasWidth  - 2*plotMargin;
    const plotHeight = canvasHeight - 2*plotMargin;
    const xScale = plotWidth  / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);

    if (Math.abs(w[1]) < 1e-6) return;
    const points = [];
    for (let x = xRange.min; x <= xRange.max; x += (xRange.max - xRange.min)/200) {
      const y = -(w[0]*x + b) / w[1];
      if (y < yRange.min || y > yRange.max) continue;
      const canvasX = plotMargin + (x - xRange.min)*xScale;
      const canvasY = canvasHeight - plotMargin - (y - yRange.min)*yScale;
      points.push({x: canvasX, y: canvasY});
    }
    if (points.length < 2) return;
    // decision boundary
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    // margins
    drawMarginLine(xRange, yRange, +1, '#95a5a6');
    drawMarginLine(xRange, yRange, -1, '#95a5a6');
  }

  function drawMarginLine(xRange, yRange, offset, color) {
    const plotWidth  = canvasWidth  - 2*plotMargin;
    const plotHeight = canvasHeight - 2*plotMargin;
    const xScale = plotWidth  / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);

    if (Math.abs(w[1]) < 1e-6) return;
    const pts = [];
    for (let x = xRange.min; x <= xRange.max; x += (xRange.max - xRange.min)/200) {
      const y = -(w[0]*x + b - offset) / w[1];
      if (y < yRange.min || y > yRange.max) continue;
      const canvasX = plotMargin + (x - xRange.min)*xScale;
      const canvasY = canvasHeight - plotMargin - (y - yRange.min)*yScale;
      pts.push({x: canvasX, y: canvasY});
    }
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5,5]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawDataPoints(xRange, yRange) {
    const plotWidth  = canvasWidth  - 2*plotMargin;
    const plotHeight = canvasHeight - 2*plotMargin;
    const xScale = plotWidth  / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);

    // Training points
    for (const pt of data) {
      const canvasX = plotMargin + (pt.x1 - xRange.min)*xScale;
      const canvasY = canvasHeight - plotMargin - (pt.x2 - yRange.min)*yScale;
      let isSV = false;
      if (hasTrainedOnce) {
        if (kernelSelect.value === 'linear') {
          isSV = (pt.y*(w[0]*pt.x1 + w[1]*pt.x2 + b) <= 1 + 1e-6);
        } else if (svmModel) {
          // check if (x1,x2) is among svmModel.getSupportVectorsSync()
          const svs = svmModel.getSupportVectorsSync();
          isSV = svs.some(sv => Math.abs(sv[0] - pt.x1) < 1e-6 && Math.abs(sv[1] - pt.x2) < 1e-6 && pt.y === pt.y);
        }
      }
      ctx.fillStyle = pt.y === 1 ? '#e74c3c' : '#3498db';
      if (isSV) {
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
      }
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, isSV ? 7 : 5, 0, 2*Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Test points
    for (const pt of testData) {
      const canvasX = plotMargin + (pt.x1 - xRange.min)*xScale;
      const canvasY = canvasHeight - plotMargin - (pt.x2 - yRange.min)*yScale;
      ctx.fillStyle = pt.y === 1 ? 'rgba(231,76,60,0.5)' : 'rgba(52,152,219,0.5)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(canvasX - 4, canvasY - 4, 8, 8);
      ctx.fill();
      ctx.stroke();
    }
  }

  function handleResize() {
    const parent = canvas.parentElement;
    const wPx = parent.clientWidth;
    const ratio = canvasHeight / canvasWidth;
    canvas.style.width = wPx + 'px';
    canvas.style.height = (wPx * ratio) + 'px';
    drawCanvas();
  }

  // —————————————————————————————————————————————
  // INITIALIZE + DRAW
  // —————————————————————————————————————————————
  generateData();
  handleResize();
});
