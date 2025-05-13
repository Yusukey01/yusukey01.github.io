// ridge_regression.js
// An interactive demo for ridge regression vs. linear regression

document.addEventListener('DOMContentLoaded', function() {
  // Get the container element
  const container = document.getElementById('ridge_regression_visualizer');
  
  if (!container) {
    console.error('Container element not found!');
    return;
  }
  
  // Create HTML structure
  container.innerHTML = `
    <div class="visualizer-container">
      <div class="visualizer-layout">
        <div class="canvas-container">
          <div class="visualization-mode-toggle">
            <label class="toggle-control">
              <select id="dataset-type" class="full-width">
                <option value="linear">Simple Linear Data</option>
                <option value="polynomial">Polynomial Data</option>
                <option value="noisy">Noisy Data</option>
                <option value="outliers">Data with Outliers</option>
              </select>
            </label>
          </div>
          <div class="instruction">Comparing Linear Regression vs. Ridge Regression</div>
          <div id="canvas-wrapper">
            <canvas id="ridge-regression-canvas" width="800" height="500"></canvas>
          </div>
          <div class="legend">
            <div class="legend-item"><span class="legend-color training"></span> Training Data</div>
            <div class="legend-item"><span class="legend-color test"></span> Test Data</div>
            <div class="legend-item"><span class="legend-color linear"></span> Linear Regression</div>
            <div class="legend-item"><span class="legend-color ridge"></span> Ridge Regression</div>
            <div class="legend-item"><span class="legend-color true"></span> True Function</div>
          </div>
        </div>
        
        <div class="controls-panel">
          <div class="control-group">
            <label for="lambda-value">Regularization Parameter (λ):</label>
            <input type="range" id="lambda-value" min="0" max="5" step="0.1" value="0.5" class="full-width">
            <span id="lambda-display">λ = 0.5</span>
          </div>
          
          <div class="control-group">
            <label for="train-size">Training Set Size:</label>
            <input type="range" id="train-size" min="5" max="50" step="1" value="15" class="full-width">
            <span id="train-size-display">15 points</span>
          </div>
          
          <div class="control-group">
            <label for="noise-level">Noise Level:</label>
            <input type="range" id="noise-level" min="0" max="2" step="0.1" value="0.5" class="full-width">
            <span id="noise-level-display">0.5</span>
          </div>
          
          <div class="control-group" id="polynomial-params">
            <label for="polynomial-degree">Polynomial Degree:</label>
            <input type="range" id="polynomial-degree" min="1" max="15" step="1" value="3" class="full-width">
            <span id="polynomial-degree-display">3</span>
          </div>
          
          <div class="results-box">
            <h3>Regression Results:</h3>
            <div class="result-row">
              <div class="result-label">Linear Regression:</div>
              <div class="result-value" id="linear-train-error">Train MSE: 0.000</div>
              <div class="result-value" id="linear-test-error">Test MSE: 0.000</div>
            </div>
            <div class="result-row">
              <div class="result-label">Ridge Regression:</div>
              <div class="result-value" id="ridge-train-error">Train MSE: 0.000</div>
              <div class="result-value" id="ridge-test-error">Test MSE: 0.000</div>
            </div>
            <div class="result-row">
              <div class="result-label">Weights L2 Norm:</div>
              <div class="result-value" id="linear-weights">Linear: 0.000</div>
              <div class="result-value" id="ridge-weights">Ridge: 0.000</div>
            </div>
          </div>
          
          <div class="weight-visualization">
            <h3>Weight Comparison:</h3>
            <div id="weight-bars-container"></div>
          </div>
          
          <button id="generate-btn" class="primary-btn">Generate New Data</button>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .visualizer-container {
      font-family: Arial, sans-serif;
      margin-bottom: 20px;
    }
    
    .visualizer-layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    @media (min-width: 992px) {
      .visualizer-layout {
        flex-direction: row;
      }
      
      .canvas-container {
        flex: 3;
        order: 1;
      }
      
      .controls-panel {
        flex: 2;
        order: 2;
      }
    }
    
    .canvas-container {
      display: flex;
      flex-direction: column;
    }
    
    #canvas-wrapper {
      position: relative;
      width: 100%;
    }
    
    #ridge-regression-canvas {
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
    
    .control-group {
      margin-bottom: 20px;
    }
    
    .control-group label {
      display: block;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .full-width {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
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
    
    .legend-item {
      display: flex;
      align-items: center;
    }
    
    .legend-color {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 5px;
      border-radius: 2px;
    }
    
    .legend-color.training {
      background-color: #3498db;
    }
    
    .legend-color.test {
      background-color: #9b59b6;
    }
    
    .legend-color.linear {
      background-color: #e74c3c;
    }
    
    .legend-color.ridge {
      background-color: #2ecc71;
    }
    
    .legend-color.true {
      background-color: #f39c12;
    }
    
    .primary-btn {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 15px;
      font-size: 1rem;
      cursor: pointer;
      width: 100%;
      margin-bottom: 15px;
    }
    
    .primary-btn:hover {
      background-color: #2980b9;
    }
    
    .results-box {
      background-color: #f0f7ff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .results-box h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 1rem;
    }
    
    .result-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .result-label {
      font-weight: bold;
      flex-basis: 100%;
    }
    
    .result-value {
      font-family: monospace;
      flex: 1;
    }
    
    .weight-visualization {
      margin-bottom: 20px;
    }
    
    .weight-visualization h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 1rem;
    }
    
    #weight-bars-container {
      display: flex;
      flex-direction: column;
      gap: 5px;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .weight-bar-row {
      display: flex;
      align-items: center;
      height: 20px;
      margin-bottom: 5px;
    }
    
    .weight-bar-label {
      width: 60px;
      font-size: 0.8rem;
    }
    
    .weight-bar-container {
      flex: 1;
      height: 18px;
      background-color: #eee;
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    }
    
    .weight-bar {
      height: 100%;
      position: absolute;
      transition: width 0.3s ease;
    }
    
    .weight-bar.linear {
      background-color: rgba(231, 76, 60, 0.7);
      border-right: 1px solid #c0392b;
    }
    
    .weight-bar.ridge {
      background-color: rgba(46, 204, 113, 0.7);
      border-right: 1px solid #27ae60;
    }
  `;
  
  document.head.appendChild(styleElement);
  
  // Get DOM elements
  const canvas = document.getElementById('ridge-regression-canvas');
  const ctx = canvas.getContext('2d');
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Control elements
  const datasetSelect = document.getElementById('dataset-type');
  const lambdaInput = document.getElementById('lambda-value');
  const lambdaDisplay = document.getElementById('lambda-display');
  const trainSizeInput = document.getElementById('train-size');
  const trainSizeDisplay = document.getElementById('train-size-display');
  const noiseLevelInput = document.getElementById('noise-level');
  const noiseLevelDisplay = document.getElementById('noise-level-display');
  const polynomialDegreeInput = document.getElementById('polynomial-degree');
  const polynomialDegreeDisplay = document.getElementById('polynomial-degree-display');
  const generateBtn = document.getElementById('generate-btn');
  
  // Result elements
  const linearTrainError = document.getElementById('linear-train-error');
  const linearTestError = document.getElementById('linear-test-error');
  const ridgeTrainError = document.getElementById('ridge-train-error');
  const ridgeTestError = document.getElementById('ridge-test-error');
  const linearWeightsNorm = document.getElementById('linear-weights');
  const ridgeWeightsNorm = document.getElementById('ridge-weights');
  const weightBarsContainer = document.getElementById('weight-bars-container');
  
  // State variables
  let trainingData = [];
  let testData = [];
  let linearWeights = [];
  let ridgeWeights = [];
  let datasetType = 'linear';
  let lambda = 0.5;
  let trainSize = 15;
  let noiseLevel = 0.5;
  let polynomialDegree = 3;
  
  // Drawing settings
  const plotMargin = 50;
  const plotWidth = canvasWidth - 2 * plotMargin;
  const plotHeight = canvasHeight - 2 * plotMargin;

  // Functions to generate different types of datasets
  function generateData() {
    const totalPoints = trainSize * 2; // Half for training, half for testing
    const xMin = -5;
    const xMax = 5;
    const xStep = (xMax - xMin) / (totalPoints - 1);
    
    const allPoints = [];
    
    // Generate x values
    for (let i = 0; i < totalPoints; i++) {
      const x = xMin + i * xStep;
      allPoints.push({ x });
    }
    
    // Shuffle the array
    for (let i = allPoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]];
    }
    
    // Generate y values based on dataset type
    for (let i = 0; i < allPoints.length; i++) {
      const x = allPoints[i].x;
      let y = 0;
      
      switch (datasetType) {
        case 'linear':
          // y = 2x + 1 + noise
          y = 2 * x + 1;
          break;
        
        case 'polynomial':
          // y = 0.1x^3 - 0.5x^2 + 1.2x + 2 + noise
          y = 0.1 * Math.pow(x, 3) - 0.5 * Math.pow(x, 2) + 1.2 * x + 2;
          break;
        
        case 'noisy':
          // y = sin(x) + noise
          y = Math.sin(x);
          break;
        
        case 'outliers':
          // y = 1.5x + 2 with occasional outliers
          y = 1.5 * x + 2;
          if (Math.random() < 0.15) { // 15% chance of outlier
            y += (Math.random() < 0.5 ? -1 : 1) * Math.random() * 10;
          }
          break;
      }
      
      // Add noise
      y += (Math.random() * 2 - 1) * noiseLevel;
      
      allPoints[i].y = y;
    }
    
    // Split into training and test sets
    trainingData = allPoints.slice(0, trainSize);
    testData = allPoints.slice(trainSize, 2 * trainSize);
    
    // Fit models
    fitModels();
    
    // Draw the canvas
    drawCanvas();
  }

  // Create design matrix for polynomial regression
  function createDesignMatrix(data, degree) {
    const X = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = [1]; // Intercept term
      
      for (let j = 1; j <= degree; j++) {
        row.push(Math.pow(data[i].x, j));
      }
      
      X.push(row);
    }
    
    return X;
  }

  // Matrix multiplication: A * B
  function matrixMultiply(A, B) {
    const result = [];
    
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      
      for (let j = 0; j < B[0].length; j++) {
        let sum = 0;
        
        for (let k = 0; k < A[0].length; k++) {
          sum += A[i][k] * B[k][j];
        }
        
        result[i][j] = sum;
      }
    }
    
    return result;
  }

  // Matrix transpose
  function transpose(A) {
    const result = [];
    
    for (let j = 0; j < A[0].length; j++) {
      result[j] = [];
      
      for (let i = 0; i < A.length; i++) {
        result[j][i] = A[i][j];
      }
    }
    
    return result;
  }

  // Matrix addition: A + B
  function matrixAdd(A, B) {
    const result = [];
    
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      
      for (let j = 0; j < A[0].length; j++) {
        result[i][j] = A[i][j] + B[i][j];
      }
    }
    
    return result;
  }

  // Matrix inverse (using simplified approach for demo)
  function matrixInverse(A) {
    // Only for 1x1 to NxN matrices
    const n = A.length;
    
    if (n === 1) {
      return [[1 / A[0][0]]];
    }
    
    // For larger matrices, we'll use LU decomposition
    // This is a simplified approach and not as numerically stable as proper libraries
    // Create identity matrix
    const I = [];
    for (let i = 0; i < n; i++) {
      I[i] = [];
      for (let j = 0; j < n; j++) {
        I[i][j] = i === j ? 1 : 0;
      }
    }
    
    // Gauss-Jordan elimination with partial pivoting
    const augmented = [];
    for (let i = 0; i < n; i++) {
      augmented[i] = [...A[i], ...I[i]];
    }
    
    // Forward elimination with partial pivoting
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      let maxVal = Math.abs(augmented[i][i]);
      
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(augmented[j][i]);
        if (absVal > maxVal) {
          maxVal = absVal;
          maxRow = j;
        }
      }
      
      // Check if matrix is singular or near-singular
      if (maxVal < 1e-10) {
        throw new Error("Matrix is singular or near-singular");
      }
      
      // Swap rows if needed
      if (maxRow !== i) {
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      }
      
      // Normalize pivot row
      const pivot = augmented[i][i];
      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      // Eliminate rows
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          const factor = augmented[j][i];
          for (let k = i; k < 2 * n; k++) {
            augmented[j][k] -= factor * augmented[i][k];
          }
        }
      }
    }
    
    // Extract inverse
    const inverse = [];
    for (let i = 0; i < n; i++) {
      inverse[i] = augmented[i].slice(n);
    }
    
    return inverse;
  }

  // Fit linear regression and ridge regression models
  function fitModels() {
    const degree = parseInt(polynomialDegreeInput.value);
    
    // Create design matrices
    const X_train = createDesignMatrix(trainingData, degree);
    const y_train = trainingData.map(point => [point.y]);
    
    const X_test = createDesignMatrix(testData, degree);
    const y_test = testData.map(point => [point.y]);
    
    // Compute X^T * X
    const XtX = matrixMultiply(transpose(X_train), X_train);
    
    // Compute X^T * y
    const Xty = matrixMultiply(transpose(X_train), y_train);
    
    // Linear regression: w = (X^T * X)^(-1) * X^T * y
    try {
      // Add a small regularization term to prevent singularity
      const minLambda = 1e-6;
      const effectiveLambda = Math.max(lambda, minLambda);
      
      // Create identity matrix for regularization
      const identity = [];
      for (let i = 0; i < XtX.length; i++) {
        identity[i] = [];
        for (let j = 0; j < XtX[0].length; j++) {
          identity[i][j] = i === j ? effectiveLambda : 0;
        }
      }
      
      // Add regularization to X^T * X
      const regularized = matrixAdd(XtX, identity);
      
      // Try to compute inverse
      const XtX_inv = matrixInverse(regularized);
      
      // Compute weights
      linearWeights = matrixMultiply(XtX_inv, Xty).flat();
      
      // For ridge regression, use a larger lambda
      const ridgeLambda = Math.max(effectiveLambda * 2, 0.1);
      const ridgeIdentity = [];
      for (let i = 0; i < XtX.length; i++) {
        ridgeIdentity[i] = [];
        for (let j = 0; j < XtX[0].length; j++) {
          ridgeIdentity[i][j] = i === j ? ridgeLambda : 0;
        }
      }
      
      const ridgeRegularized = matrixAdd(XtX, ridgeIdentity);
      const ridge_inv = matrixInverse(ridgeRegularized);
      ridgeWeights = matrixMultiply(ridge_inv, Xty).flat();
      
      // Calculate errors
      const linear_train_preds = matrixMultiply(X_train, [linearWeights]).flat();
      const ridge_train_preds = matrixMultiply(X_train, [ridgeWeights]).flat();
      
      const linear_test_preds = matrixMultiply(X_test, [linearWeights]).flat();
      const ridge_test_preds = matrixMultiply(X_test, [ridgeWeights]).flat();
      
      const linear_train_mse = calculateMSE(linear_train_preds, y_train.flat());
      const ridge_train_mse = calculateMSE(ridge_train_preds, y_train.flat());
      
      const linear_test_mse = calculateMSE(linear_test_preds, y_test.flat());
      const ridge_test_mse = calculateMSE(ridge_test_preds, y_test.flat());
      
      // Update result display
      linearTrainError.textContent = `Train MSE: ${linear_train_mse.toFixed(3)}`;
      linearTestError.textContent = `Test MSE: ${linear_test_mse.toFixed(3)}`;
      
      ridgeTrainError.textContent = `Train MSE: ${ridge_train_mse.toFixed(3)}`;
      ridgeTestError.textContent = `Test MSE: ${ridge_test_mse.toFixed(3)}`;
      
      // Calculate L2 norms
      const linear_l2 = Math.sqrt(linearWeights.slice(1).reduce((sum, w) => sum + w * w, 0));
      const ridge_l2 = Math.sqrt(ridgeWeights.slice(1).reduce((sum, w) => sum + w * w, 0));
      
      linearWeightsNorm.textContent = `Linear: ${linear_l2.toFixed(3)}`;
      ridgeWeightsNorm.textContent = `Ridge: ${ridge_l2.toFixed(3)}`;
      
      // Update weight bars visualization
      updateWeightBars();
      
    } catch (e) {
      console.error("Error fitting models:", e);
      // Handle singular matrix case
      linearTrainError.textContent = "Increase λ";
      linearTestError.textContent = "Error";
      ridgeTrainError.textContent = "Increase λ";
      ridgeTestError.textContent = "Error";
      
      // Clear weights
      linearWeights = [];
      ridgeWeights = [];
      
      // Update weight bars visualization
      updateWeightBars();
    }
  }

  // Calculate Mean Squared Error
  function calculateMSE(predictions, actual) {
    let sum = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      sum += Math.pow(predictions[i] - actual[i], 2);
    }
    
    return sum / predictions.length;
  }

  // Update weight bars visualization
  function updateWeightBars() {
    weightBarsContainer.innerHTML = '';
    
    // Determine max absolute weight for scaling
    const allWeights = [...linearWeights, ...ridgeWeights];
    const maxAbsWeight = Math.max(...allWeights.map(w => Math.abs(w)));
    
    // Create bars for each weight
    for (let i = 0; i < linearWeights.length; i++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'weight-bar-row';
      
      const labelEl = document.createElement('div');
      labelEl.className = 'weight-bar-label';
      labelEl.textContent = i === 0 ? 'Bias' : `w${i}`;
      
      const containerEl = document.createElement('div');
      containerEl.className = 'weight-bar-container';
      
      // Linear weight bar
      const linearBarEl = document.createElement('div');
      linearBarEl.className = 'weight-bar linear';
      const linearWidth = (Math.abs(linearWeights[i]) / maxAbsWeight) * 100;
      linearBarEl.style.width = `${linearWidth}%`;
      linearBarEl.style.left = linearWeights[i] >= 0 ? '50%' : `${50 - linearWidth}%`;
      linearBarEl.title = `Linear: ${linearWeights[i].toFixed(3)}`;
      
      // Ridge weight bar
      const ridgeBarEl = document.createElement('div');
      ridgeBarEl.className = 'weight-bar ridge';
      const ridgeWidth = (Math.abs(ridgeWeights[i]) / maxAbsWeight) * 100;
      ridgeBarEl.style.width = `${ridgeWidth}%`;
      ridgeBarEl.style.left = ridgeWeights[i] >= 0 ? '50%' : `${50 - ridgeWidth}%`;
      ridgeBarEl.title = `Ridge: ${ridgeWeights[i].toFixed(3)}`;
      
      // Add a center line
      const centerLine = document.createElement('div');
      centerLine.style.position = 'absolute';
      centerLine.style.left = '50%';
      centerLine.style.top = '0';
      centerLine.style.bottom = '0';
      centerLine.style.width = '1px';
      centerLine.style.backgroundColor = '#888';
      
      containerEl.appendChild(centerLine);
      containerEl.appendChild(linearBarEl);
      containerEl.appendChild(ridgeBarEl);
      
      rowEl.appendChild(labelEl);
      rowEl.appendChild(containerEl);
      
      weightBarsContainer.appendChild(rowEl);
    }
  }

  // Draw the canvas
  function drawCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw coordinate axes
    drawAxes();
    
    // Calculate display range based on data
    const xRange = calculateXRange();
    const yRange = calculateYRange();
    
    // Draw true function if applicable
    drawTrueFunction(xRange, yRange);
    
    // Draw regression lines
    drawRegressionLines(xRange, yRange);
    
    // Draw data points
    drawDataPoints(xRange, yRange);
  }

  // Calculate appropriate X range for display
  function calculateXRange() {
    const allPoints = [...trainingData, ...testData];
    
    if (allPoints.length === 0) {
      return { min: -5, max: 5 };
    }
    
    const xValues = allPoints.map(point => point.x);
    let min = Math.min(...xValues);
    let max = Math.max(...xValues);
    
    // Add some padding
    const padding = (max - min) * 0.1;
    min -= padding;
    max += padding;
    
    return { min, max };
  }

  // Calculate appropriate Y range for display
  function calculateYRange() {
    const allPoints = [...trainingData, ...testData];
    
    if (allPoints.length === 0) {
      return { min: -5, max: 5 };
    }
    
    const yValues = allPoints.map(point => point.y);
    let min = Math.min(...yValues);
    let max = Math.max(...yValues);
    
    // Add predicted values to ensure they're in view
    if (linearWeights.length > 0 && ridgeWeights.length > 0) {
      const xRange = calculateXRange();
      const numPoints = 100;
      const xStep = (xRange.max - xRange.min) / (numPoints - 1);
      
      for (let i = 0; i < numPoints; i++) {
        const x = xRange.min + i * xStep;
        
        // Generate features
        const features = [1];
        for (let j = 1; j <= polynomialDegree; j++) {
          features.push(Math.pow(x, j));
        }
        
        // Calculate predictions
        let linearPred = 0;
        let ridgePred = 0;
        
        for (let j = 0; j < features.length; j++) {
          if (j < linearWeights.length) {
            linearPred += features[j] * linearWeights[j];
          }
          
          if (j < ridgeWeights.length) {
            ridgePred += features[j] * ridgeWeights[j];
          }
        }
        
        min = Math.min(min, linearPred, ridgePred);
        max = Math.max(max, linearPred, ridgePred);
      }
    }
    
    // Add some padding
    const padding = (max - min) * 0.1;
    min -= padding;
    max += padding;
    
    return { min, max };
  }

  // Draw coordinate axes
  function drawAxes() {
    const xRange = calculateXRange();
    const yRange = calculateYRange();
    
    // Calculate scale
    const xScale = plotWidth / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);
    
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    const yAxisPos = canvasHeight - plotMargin - (-yRange.min) * yScale;
    ctx.moveTo(plotMargin, yAxisPos);
    ctx.lineTo(canvasWidth - plotMargin, yAxisPos);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    const xAxisPos = plotMargin + (-xRange.min) * xScale;
    ctx.moveTo(xAxisPos, plotMargin);
    ctx.lineTo(xAxisPos, canvasHeight - plotMargin);
    ctx.stroke();
    
    // Draw x-axis ticks and labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333';
    
    const xStep = (xRange.max - xRange.min) / 5;
    for (let x = Math.ceil(xRange.min / xStep) * xStep; x <= xRange.max; x += xStep) {
      const xPos = plotMargin + (x - xRange.min) * xScale;
      
      // Draw tick
      ctx.beginPath();
      ctx.moveTo(xPos, yAxisPos - 5);
      ctx.lineTo(xPos, yAxisPos + 5);
      ctx.stroke();
      
      // Draw label
      ctx.fillText(x.toFixed(1), xPos, yAxisPos + 8);
    }
    
    // Draw y-axis ticks and labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const yStep = (yRange.max - yRange.min) / 5;
    for (let y = Math.ceil(yRange.min / yStep) * yStep; y <= yRange.max; y += yStep) {
      const yPos = canvasHeight - plotMargin - (y - yRange.min) * yScale;
      
      // Draw tick
      ctx.beginPath();
      ctx.moveTo(xAxisPos - 5, yPos);
      ctx.lineTo(xAxisPos + 5, yPos);
      ctx.stroke();
      
      // Draw label
      ctx.fillText(y.toFixed(1), xAxisPos - 8, yPos);
    }
  }

  // Draw the true function
  function drawTrueFunction(xRange, yRange) {
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    
    // Calculate scale
    const xScale = plotWidth / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);
    
    ctx.beginPath();
    
    const numPoints = 100;
    const xStep = (xRange.max - xRange.min) / (numPoints - 1);
    
    for (let i = 0; i < numPoints; i++) {
      const x = xRange.min + i * xStep;
      let y;
      
      switch (datasetType) {
        case 'linear':
          y = 2 * x + 1;
          break;
        
        case 'polynomial':
          y = 0.1 * Math.pow(x, 3) - 0.5 * Math.pow(x, 2) + 1.2 * x + 2;
          break;
        
        case 'noisy':
          y = Math.sin(x);
          break;
        
        case 'outliers':
          y = 1.5 * x + 2;
          break;
      }
      
      const canvasX = plotMargin + (x - xRange.min) * xScale;
      const canvasY = canvasHeight - plotMargin - (y - yRange.min) * yScale;
      
      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw regression lines
  function drawRegressionLines(xRange, yRange) {
    // Only draw if we have weights
    if (linearWeights.length === 0 || ridgeWeights.length === 0) {
      return;
    }
    
    // Calculate scale
    const xScale = plotWidth / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);
    
    const numPoints = 100;
    const xStep = (xRange.max - xRange.min) / (numPoints - 1);
    
    // Draw linear regression line
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < numPoints; i++) {
      const x = xRange.min + i * xStep;
      
      // Generate features for polynomial regression
      const features = [1]; // Start with bias term
      for (let j = 1; j <= polynomialDegree; j++) {
        features.push(Math.pow(x, j));
      }
      
      // Calculate prediction using dot product
      let y = 0;
      for (let j = 0; j < Math.min(features.length, linearWeights.length); j++) {
        y += features[j] * linearWeights[j];
      }
      
      const canvasX = plotMargin + (x - xRange.min) * xScale;
      const canvasY = canvasHeight - plotMargin - (y - yRange.min) * yScale;
      
      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    
    ctx.stroke();
    
    // Draw ridge regression line
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < numPoints; i++) {
      const x = xRange.min + i * xStep;
      
      // Generate features for polynomial regression
      const features = [1]; // Start with bias term
      for (let j = 1; j <= polynomialDegree; j++) {
        features.push(Math.pow(x, j));
      }
      
      // Calculate prediction using dot product
      let y = 0;
      for (let j = 0; j < Math.min(features.length, ridgeWeights.length); j++) {
        y += features[j] * ridgeWeights[j];
      }
      
      const canvasX = plotMargin + (x - xRange.min) * xScale;
      const canvasY = canvasHeight - plotMargin - (y - yRange.min) * yScale;
      
      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    
    ctx.stroke();
  }

  // Draw data points
  function drawDataPoints(xRange, yRange) {
    // Calculate scale
    const xScale = plotWidth / (xRange.max - xRange.min);
    const yScale = plotHeight / (yRange.max - yRange.min);
    
    // Draw training data points
    ctx.fillStyle = '#3498db';
    for (const point of trainingData) {
      const canvasX = plotMargin + (point.x - xRange.min) * xScale;
      const canvasY = canvasHeight - plotMargin - (point.y - yRange.min) * yScale;
      
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw test data points
    ctx.fillStyle = '#9b59b6';
    for (const point of testData) {
      const canvasX = plotMargin + (point.x - xRange.min) * xScale;
      const canvasY = canvasHeight - plotMargin - (point.y - yRange.min) * yScale;
      
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Handle window resize
  function handleResize() {
    // Maintain aspect ratio but scale to window size
    const parent = canvas.parentElement;
    const ratio = canvasHeight / canvasWidth;
    const newWidth = parent.clientWidth;
    const newHeight = newWidth * ratio;
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
    
    drawCanvas();
  }

  // Handle dataset type change
  function handleDatasetChange() {
    datasetType = datasetSelect.value;
    generateData();
  }

  // Handle lambda change
  function handleLambdaChange() {
    lambda = parseFloat(lambdaInput.value);
    lambdaDisplay.textContent = `λ = ${lambda.toFixed(1)}`;
    
    // Just refit models without generating new data
    fitModels();
    drawCanvas();
  }

  // Handle training size change
  function handleTrainSizeChange() {
    trainSize = parseInt(trainSizeInput.value);
    trainSizeDisplay.textContent = `${trainSize} points`;
    
    // Generate new data
    generateData();
  }

  // Handle noise level change
  function handleNoiseLevelChange() {
    noiseLevel = parseFloat(noiseLevelInput.value);
    noiseLevelDisplay.textContent = noiseLevel.toFixed(1);
    
    // Generate new data
    generateData();
  }

  // Handle polynomial degree change
  function handlePolynomialDegreeChange() {
    polynomialDegree = parseInt(polynomialDegreeInput.value);
    polynomialDegreeDisplay.textContent = polynomialDegree;
    
    // Just refit models without generating new data
    fitModels();
    drawCanvas();
  }

  // Add event listeners
  datasetSelect.addEventListener('change', handleDatasetChange);
  lambdaInput.addEventListener('input', handleLambdaChange);
  trainSizeInput.addEventListener('input', handleTrainSizeChange);
  noiseLevelInput.addEventListener('input', handleNoiseLevelChange);
  polynomialDegreeInput.addEventListener('input', handlePolynomialDegreeChange);
  generateBtn.addEventListener('click', generateData);
  
  window.addEventListener('resize', handleResize);
  
  // Initialize the visualization
  generateData();
  handleResize();
}); 