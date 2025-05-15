// cross_validation.js
// An interactive demo for ridge regression with cross-validation

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('cross_validation_visualizer');
    
    if (!container) {
      console.error('Container element not found!');
      return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="visualizer-container">
        <div class="visualizer-layout">
          <div class="canvas-container">
            <div class="instruction">Ridge Regression with K-Fold Cross-Validation</div>
            <div id="canvas-wrapper">
              <canvas id="cv-regression-canvas" width="800" height="500"></canvas>
            </div>
            <div class="legend">
              <div class="legend-item"><span class="legend-color training"></span> Training Data</div>
              <div class="legend-item"><span class="legend-color validation"></span> Validation Data</div>
              <div class="legend-item"><span class="legend-color test"></span> Test Data (Held Out)</div>
              <div class="legend-item"><span class="legend-color model"></span> Ridge Regression</div>
              <div class="legend-item"><span class="legend-color true"></span> True Function</div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="cv-plot-container">
              <h3>Cross-Validation Error</h3>
              <canvas id="cv-error-plot" width="400" height="250"></canvas>
            </div>
            
            <div class="control-group">
              <label for="k-folds">Number of Folds (K):</label>
              <input type="range" id="k-folds" min="2" max="10" step="1" value="5" class="full-width">
              <span id="k-folds-display">5 folds</span>
            </div>
            
            <div class="control-group">
              <label for="lambda-range">Regularization Parameter Search Space:</label>
              <div class="lambda-range-controls">
                <div>
                  <label for="lambda-min">Min λ:</label>
                  <input type="number" id="lambda-min" min="0.001" max="1" step="0.001" value="0.001" class="number-input">
                </div>
                <div>
                  <label for="lambda-max">Max λ:</label>
                  <input type="number" id="lambda-max" min="1" max="100" step="1" value="100" class="number-input">
                </div>
                <div>
                  <label for="lambda-steps">Steps:</label>
                  <input type="number" id="lambda-steps" min="5" max="50" step="1" value="20" class="number-input">
                </div>
              </div>
            </div>
            
            <div class="control-group">
              <label for="train-size">Total Dataset Size:</label>
              <input type="range" id="train-size" min="20" max="100" step="5" value="50" class="full-width">
              <span id="train-size-display">50 points</span>
            </div>
            
            <div class="control-group">
              <label for="test-percentage">Test Set Percentage:</label>
              <input type="range" id="test-percentage" min="10" max="40" step="5" value="20" class="full-width">
              <span id="test-percentage-display">20%</span>
            </div>
            
            <div class="control-group">
              <label for="noise-level">Noise Level:</label>
              <input type="range" id="noise-level" min="0" max="2" step="0.1" value="0.8" class="full-width">
              <span id="noise-level-display">0.8</span>
            </div>
            
            <div class="control-group">
              <label for="polynomial-degree">Polynomial Degree:</label>
              <input type="range" id="polynomial-degree" min="1" max="15" step="1" value="9" class="full-width">
              <span id="polynomial-degree-display">9</span>
            </div>
            
            <div class="results-box">
              <h3>Cross-Validation Results:</h3>
              <div class="result-row">
                <div class="result-label">Optimal λ:</div>
                <div class="result-value" id="optimal-lambda">λ = 0.000</div>
              </div>
              <div class="result-row">
                <div class="result-label">CV Error:</div>
                <div class="result-value" id="cv-error">MSE: 0.000</div>
              </div>
              <div class="result-row">
                <div class="result-label">Test Error:</div>
                <div class="result-value" id="test-error">MSE: 0.000</div>
              </div>
              <div class="result-row">
                <div class="result-label">Model Complexity:</div>
                <div class="result-value" id="model-complexity">L2 Norm: 0.000</div>
              </div>
            </div>
            
            <div class="fold-visualization">
              <h3>Cross-Validation Folds:</h3>
              <div id="fold-container"></div>
            </div>
            
            <button id="run-cv-btn" class="primary-btn">Run Cross-Validation</button>
            <button id="generate-btn" class="secondary-btn">Generate New Data</button>
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
      
      #cv-regression-canvas {
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
      
      .cv-plot-container {
        margin-bottom: 20px;
      }
      
      .cv-plot-container h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1rem;
      }
      
      #cv-error-plot {
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        max-width: 100%;
        height: auto;
        display: block;
      }
      
      .control-group {
        margin-bottom: 20px;
      }
      
      .control-group label {
        display: block;
        font-weight: bold;
        margin-bottom: 8px;
      }
      
      .lambda-range-controls {
        display: flex;
        gap: 10px;
        justify-content: space-between;
      }
      
      .lambda-range-controls > div {
        flex: 1;
      }
      
      .lambda-range-controls label {
        font-weight: normal;
        font-size: 0.8rem;
      }
      
      .number-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
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
      
      .legend-color.validation {
        background-color: #e74c3c;
      }
      
      .legend-color.test {
        background-color: #9b59b6;
      }
      
      .legend-color.model {
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
        margin-bottom: 10px;
      }
      
      .primary-btn:hover {
        background-color: #2980b9;
      }
      
      .secondary-btn {
        background-color: #95a5a6;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 10px 15px;
        font-size: 1rem;
        cursor: pointer;
        width: 100%;
        margin-bottom: 15px;
      }
      
      .secondary-btn:hover {
        background-color: #7f8c8d;
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
        width: 40%;
      }
      
      .result-value {
        font-family: monospace;
        width: 55%;
      }
      
      .fold-visualization {
        margin-bottom: 20px;
      }
      
      .fold-visualization h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1rem;
      }
      
      #fold-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .fold-row {
        display: flex;
        height: 20px;
        background-color: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .fold-segment {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        color: white;
      }
      
      .fold-segment.train {
        background-color: #3498db;
      }
      
      .fold-segment.validate {
        background-color: #e74c3c;
      }
      
      .fold-segment.test {
        background-color: #9b59b6;
      }
      
      .fold-label {
        font-size: 0.8rem;
        font-weight: bold;
        margin-right: 5px;
      }
      
      .fold-active {
        box-shadow: 0 0 0 2px #2ecc71;
      }
      
      .current-cv-status {
        font-size: 0.9rem;
        margin-top: 10px;
        padding: 8px;
        border-radius: 4px;
        background-color: #f0f7ff;
        display: none;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Get DOM elements
    const canvas = document.getElementById('cv-regression-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
  
    const cvCanvas = document.getElementById('cv-error-plot');
    const cvCtx = cvCanvas.getContext('2d');
    const cvCanvasWidth = cvCanvas.width;
    const cvCanvasHeight = cvCanvas.height;
  
    // Control elements
    const kFoldsInput = document.getElementById('k-folds');
    const kFoldsDisplay = document.getElementById('k-folds-display');
    const lambdaMinInput = document.getElementById('lambda-min');
    const lambdaMaxInput = document.getElementById('lambda-max');
    const lambdaStepsInput = document.getElementById('lambda-steps');
    const trainSizeInput = document.getElementById('train-size');
    const trainSizeDisplay = document.getElementById('train-size-display');
    const testPercentageInput = document.getElementById('test-percentage');
    const testPercentageDisplay = document.getElementById('test-percentage-display');
    const noiseLevelInput = document.getElementById('noise-level');
    const noiseLevelDisplay = document.getElementById('noise-level-display');
    const polynomialDegreeInput = document.getElementById('polynomial-degree');
    const polynomialDegreeDisplay = document.getElementById('polynomial-degree-display');
    const runCvBtn = document.getElementById('run-cv-btn');
    const generateBtn = document.getElementById('generate-btn');
    
    // Result elements
    const optimalLambdaElement = document.getElementById('optimal-lambda');
    const cvErrorElement = document.getElementById('cv-error');
    const testErrorElement = document.getElementById('test-error');
    const modelComplexityElement = document.getElementById('model-complexity');
    const foldContainer = document.getElementById('fold-container');
    
    // State variables
    let allData = [];
    let trainingData = [];
    let testData = [];
    let folds = [];
    let currentFold = -1;
    let currentFoldTraining = [];
    let currentFoldValidation = [];
    let lambdaValues = [];
    let cvErrors = [];
    let optimalLambda = 1.0;
    let optimalWeights = [];
    let isCvRunning = false;
    
    // Parameters
    let kFolds = 5;
    let totalSize = 50;
    let testPercentage = 20;
    let noiseLevel = 0.8;
    let polynomialDegree = 9;
    let lambdaMin = 0.001;
    let lambdaMax = 100;
    let lambdaSteps = 20;
    
    // Drawing settings
    const plotMargin = 50;
    const plotWidth = canvasWidth - 2 * plotMargin;
    const plotHeight = canvasHeight - 2 * plotMargin;
    
    // Generate dataset
    function generateData() {
        totalSize = parseInt(trainSizeInput.value);
        noiseLevel = parseFloat(noiseLevelInput.value);
        testPercentage = parseInt(testPercentageInput.value);
        polynomialDegree = parseInt(polynomialDegreeInput.value);

      const testSize = Math.floor(totalSize * (testPercentage / 100));
      const trainSize = totalSize - testSize;
      
      allData = [];
      
      // Generate x values
      const xMin = -1;
      const xMax = 1;
      
      for (let i = 0; i < totalSize; i++) {
        const x = Math.random() * (xMax - xMin) + xMin;
        
        // Generate y value (polynomial function with noise)
        const yTrue = 0.8 * Math.pow(x, 3) - 0.5 * Math.pow(x, 2) + 0.3 * x + 1;
        const y = yTrue + (Math.random() * 2 - 1) * noiseLevel;
        
        allData.push({ x, y, yTrue });
      }
      
      // Shuffle the data
      for (let i = allData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allData[i], allData[j]] = [allData[j], allData[i]];
      }
      
      // Split into training and test sets
      trainingData = allData.slice(0, trainSize);
      testData = allData.slice(trainSize);
      
      // Create cross-validation folds
      createCvFolds();
      
      // Reset CV results

        lambdaValues = [];
        cvErrors = [];
        optimalLambda = 1.0;
        optimalWeights = [];
        currentFold = -1;
        currentFoldTraining = [];
        currentFoldValidation = [];
     
      // Update the fold visualization
      updateFoldVisualization();
      
      // Draw the canvas
      drawCanvas();
      drawCvErrorPlot();
    }
    
    // Create cross-validation folds
    function createCvFolds() {
      folds = [];
      const foldSize = Math.floor(trainingData.length / kFolds);
      
      // Create a copy of the training data
      const shuffledTraining = [...trainingData];
      
      // Shuffle the data
      for (let i = shuffledTraining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTraining[i], shuffledTraining[j]] = [shuffledTraining[j], shuffledTraining[i]];
      }
      
      // Create the folds
      for (let i = 0; i < kFolds; i++) {
        const start = i * foldSize;
        const end = (i === kFolds - 1) ? shuffledTraining.length : start + foldSize;
        folds.push(shuffledTraining.slice(start, end));
      }
    }
    
    // Run cross-validation
    async function runCrossValidation() {
      if (isCvRunning) return;
      
      isCvRunning = true;
      runCvBtn.disabled = true;
      runCvBtn.textContent = 'Running...';
      
      // Generate lambda values
      lambdaValues = [];
      for (let i = 0; i < lambdaSteps; i++) {
        const t = i / (lambdaSteps - 1);
        // Use logarithmic scale for lambda values
        const lambda = Math.exp(Math.log(lambdaMin) * (1 - t) + Math.log(lambdaMax) * t);
        lambdaValues.push(lambda);
      }
      
      // Initialize cv errors array
      cvErrors = Array(lambdaValues.length).fill(0);
      
      // For each fold
      for (let foldIndex = 0; foldIndex < kFolds; foldIndex++) {
        // Set current fold for visualization
        currentFold = foldIndex;
        
        // Create validation set from current fold
        currentFoldValidation = folds[foldIndex];
        
        // Create training set from all other folds
        currentFoldTraining = [];
        for (let i = 0; i < kFolds; i++) {
          if (i !== foldIndex) {
            currentFoldTraining = currentFoldTraining.concat(folds[i]);
          }
        }
        
        // Update the fold visualization
        updateFoldVisualization();
        
        // Draw the canvas with current fold
        drawCanvas();
        
        // For each lambda value
        for (let lambdaIndex = 0; lambdaIndex < lambdaValues.length; lambdaIndex++) {
          const lambda = lambdaValues[lambdaIndex];
          
          // Fit the model
          const weights = fitRidgeRegression(currentFoldTraining, lambda);
          
          // Calculate validation error
          const validationError = calculateMSE(
            predictValues(currentFoldValidation, weights),
            currentFoldValidation.map(point => point.y)
          );
          
          // Add to cv errors
          cvErrors[lambdaIndex] += validationError / kFolds;
          
          // Update the CV error plot
          drawCvErrorPlot();
          
          // Add a small delay for visualization
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Find optimal lambda (minimum CV error)
      let minErrorIndex = 0;
      for (let i = 1; i < cvErrors.length; i++) {
        if (cvErrors[i] < cvErrors[minErrorIndex]) {
          minErrorIndex = i;
        }
      }
      
      optimalLambda = lambdaValues[minErrorIndex];
      
      // Fit the model with optimal lambda on all training data
      optimalWeights = fitRidgeRegression(trainingData, optimalLambda);
      
      // Calculate test error
      const testPredictions = predictValues(testData, optimalWeights);
      const testError = calculateMSE(testPredictions, testData.map(point => point.y));
      
      // Calculate L2 norm of weights (excluding bias term)
      const weightL2Norm = Math.sqrt(optimalWeights.slice(1).reduce((sum, w) => sum + w * w, 0));
      
      // Update results
      optimalLambdaElement.textContent = `λ = ${optimalLambda.toFixed(optimalLambda < 0.01 ? 4 : optimalLambda < 0.1 ? 3 : optimalLambda < 1 ? 2 : 1)}`;
      cvErrorElement.textContent = `MSE: ${cvErrors[minErrorIndex].toFixed(3)}`;
      testErrorElement.textContent = `MSE: ${testError.toFixed(3)}`;
      modelComplexityElement.textContent = `L2 Norm: ${weightL2Norm.toFixed(3)}`;
      
      // Reset visualization
      currentFold = -1;
      currentFoldTraining = [];
      currentFoldValidation = [];
      
      // Update fold visualization
      updateFoldVisualization();
      
      // Draw the canvas with final model
      drawCanvas();
      
      // Re-enable the CV button
      isCvRunning = false;
      runCvBtn.disabled = false;
      runCvBtn.textContent = 'Run Cross-Validation';
    }
    
    // Fit ridge regression
    function fitRidgeRegression(data, lambda) {
      // Create design matrix
      const X = createDesignMatrix(data, polynomialDegree);
      const y = data.map(point => [point.y]);
      
      // Compute X^T * X
      const XtX = matrixMultiply(transpose(X), X);
      
      // Compute X^T * y
      const Xty = matrixMultiply(transpose(X), y);
      
      // Add regularization
      const regMatrix = [];
      for (let i = 0; i < XtX.length; i++) {
        regMatrix[i] = [];
        for (let j = 0; j < XtX[0].length; j++) {
          regMatrix[i][j] = i === j ? lambda : 0;
        }
      }
      
      const regularized = matrixAdd(XtX, regMatrix);
      
      // Compute (X^T * X + lambda * I)^(-1)
      const invMatrix = matrixInverse(regularized);
      
      // Compute weights = (X^T * X + lambda * I)^(-1) * X^T * y
      const weightMatrix = matrixMultiply(invMatrix, Xty);
      
      // Convert to 1D array
      return weightMatrix.map(row => row[0]);
    }
    
    // Predict values using the model
    function predictValues(data, weights) {
      const X = createDesignMatrix(data, polynomialDegree);
      const predictions = [];
      
      for (let i = 0; i < X.length; i++) {
        let pred = 0;
        for (let j = 0; j < weights.length; j++) {
          pred += X[i][j] * weights[j];
        }
        predictions.push(pred);
      }
      
      return predictions;
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
      if (A[0].length !== B.length) {
        console.error("Matrix dimensions do not match");
        return [];
      }
      
      const result = [];
      const rowsA = A.length;
      const colsB = B[0].length;
      
      for (let i = 0; i < rowsA; i++) {
        result[i] = [];
        for (let j = 0; j < colsB; j++) {
          let sum = 0;
          for (let k = 0; k < B.length; k++) {
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
      const rows = A.length;
      const cols = A[0].length;
      
      for (let j = 0; j < cols; j++) {
        result[j] = [];
        for (let i = 0; i < rows; i++) {
          result[j][i] = A[i][j];
        }
      }
      
      return result;
    }
    
    // Matrix addition: A + B
    function matrixAdd(A, B) {
      const result = [];
      const rows = A.length;
      const cols = A[0].length;
      
      for (let i = 0; i < rows; i++) {
        result[i] = [];
        for (let j = 0; j < cols; j++) {
          result[i][j] = A[i][j] + B[i][j];
        }
      }
      
      return result;
    }
    
    // Matrix inverse with numerical stability
    function matrixInverse(A) {
      const n = A.length;
      
      // Create a copy of A to avoid modifying the original
      const matrix = [];
      for (let i = 0; i < n; i++) {
        matrix[i] = [...A[i]];
      }
      
      // Create identity matrix for result
      const result = [];
      for (let i = 0; i < n; i++) {
        result[i] = [];
        for (let j = 0; j < n; j++) {
          result[i][j] = i === j ? 1 : 0;
        }
      }
      
      // Gaussian elimination with partial pivoting
      for (let i = 0; i < n; i++) {
        // Find pivot
        let maxVal = Math.abs(matrix[i][i]);
        let maxRow = i;
        
        for (let k = i + 1; k < n; k++) {
          if (Math.abs(matrix[k][i]) > maxVal) {
            maxVal = Math.abs(matrix[k][i]);
            maxRow = k;
          }
        }
        
        // Check for numerical stability
        if (maxVal < 1e-10) {
          // Add small value to diagonal for stability
          matrix[i][i] += 1e-10;
        }
        
        // Swap rows if needed
        if (maxRow !== i) {
          [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
          [result[i], result[maxRow]] = [result[maxRow], result[i]];
        }
        
        // Scale row
        const pivot = matrix[i][i];
        for (let j = 0; j < n; j++) {
          matrix[i][j] /= pivot;
          result[i][j] /= pivot;
        }
        
        // Eliminate other rows
        for (let k = 0; k < n; k++) {
          if (k !== i) {
            const factor = matrix[k][i];
            for (let j = 0; j < n; j++) {
              matrix[k][j] -= factor * matrix[i][j];
              result[k][j] -= factor * result[i][j];
            }
          }
        }
      }
      
      return result;
    }
    
    // Calculate Mean Squared Error
    function calculateMSE(predictions, actual) {
      if (predictions.length !== actual.length) {
        console.error("Mismatched lengths in MSE calculation");
        return 0;
      }
      
      let sum = 0;
      for (let i = 0; i < predictions.length; i++) {
        const diff = predictions[i] - actual[i];
        sum += diff * diff;
      }
      
      return sum / predictions.length;
    }
    
    // Update fold visualization
    function updateFoldVisualization() {
      foldContainer.innerHTML = '';
      
      // Add overall dataset row
      const datasetRow = document.createElement('div');
      datasetRow.className = 'fold-row';
      
      // Add label
      const datasetLabel = document.createElement('div');
      datasetLabel.className = 'fold-label';
      datasetLabel.textContent = 'Dataset:';
      datasetLabel.style.marginRight = '5px';
      
      // Add training segment
      const trainSegment = document.createElement('div');
      trainSegment.className = 'fold-segment train';
      trainSegment.style.width = `${100 - testPercentage}%`;
      trainSegment.textContent = 'Training';
      
      // Add test segment
      const testSegment = document.createElement('div');
      testSegment.className = 'fold-segment test';
      testSegment.style.width = `${testPercentage}%`;
      testSegment.textContent = 'Test';
      
      datasetRow.appendChild(datasetLabel);
      datasetRow.appendChild(trainSegment);
      datasetRow.appendChild(testSegment);
      foldContainer.appendChild(datasetRow);
      
      // Add fold rows
      for (let i = 0; i < kFolds; i++) {
        const foldRow = document.createElement('div');
        foldRow.className = 'fold-row';
        if (i === currentFold) {
          foldRow.classList.add('fold-active');
        }
        
        // Add label
        const foldLabel = document.createElement('div');
        foldLabel.className = 'fold-label';
        foldLabel.textContent = `Fold ${i + 1}:`;
        foldLabel.style.marginRight = '5px';
        
        // Calculate segment sizes
        const segmentWidth = (100 - testPercentage) / kFolds;
        
        for (let j = 0; j < kFolds; j++) {
          const segment = document.createElement('div');
          
          if (i === currentFold && j === i) {
            segment.className = 'fold-segment validate';
            segment.textContent = 'Validate';
          } else {
            segment.className = 'fold-segment train';
            segment.textContent = 'Train';
          }
          
          segment.style.width = `${segmentWidth}%`;
          foldRow.appendChild(segment);
        }
        
        // Add test segment (not used in CV)
        const unusedSegment = document.createElement('div');
        unusedSegment.className = 'fold-segment test';
        unusedSegment.style.width = `${testPercentage}%`;
        unusedSegment.textContent = 'Not Used';
        unusedSegment.style.opacity = '0.5';
        
        foldRow.appendChild(foldLabel);
        foldRow.appendChild(unusedSegment);
        foldContainer.appendChild(foldRow);
      }
    }
    
    // Draw the canvas
    function drawCanvas() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw coordinate axes
      drawAxes();
      
      // Calculate display range
      const xRange = calculateXRange();
      const yRange = calculateYRange();
      
      // Draw true function
      drawTrueFunction(xRange, yRange);
      
      // Draw model if we have optimal weights
      if (optimalWeights.length > 0) {
        drawRidgeRegressionLine(xRange, yRange, optimalWeights);
      }
      
      // Draw data points
      drawDataPoints(xRange, yRange);
    }
    
    // Calculate X range for display
    function calculateXRange() {
      const xValues = allData.map(point => point.x);
      let min = Math.min(...xValues);
      let max = Math.max(...xValues);
      
      // Add padding
      const padding = (max - min) * 0.1;
      return { min: min - padding, max: max + padding };
    }
    
    // Calculate Y range for display
    function calculateYRange() {
      const yValues = allData.map(point => point.y);
      let min = Math.min(...yValues);
      let max = Math.max(...yValues);
      
      // Add padding
      const padding = (max - min) * 0.2;
      return { min: min - padding, max: max + padding };
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
        const y = 0.8 * Math.pow(x, 3) - 0.5 * Math.pow(x, 2) + 0.3 * x + 1;
        
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
    
    // Draw ridge regression line
    function drawRidgeRegressionLine(xRange, yRange, weights) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      
      // Calculate scale
      const xScale = plotWidth / (xRange.max - xRange.min);
      const yScale = plotHeight / (yRange.max - yRange.min);
      
      ctx.beginPath();
      
      const numPoints = 100;
      const xStep = (xRange.max - xRange.min) / (numPoints - 1);
      
      for (let i = 0; i < numPoints; i++) {
        const x = xRange.min + i * xStep;
        
        // Generate features
        const features = [1]; // Intercept
        for (let j = 1; j <= polynomialDegree; j++) {
          features.push(Math.pow(x, j));
        }
        
        // Calculate prediction
        let y = 0;
        for (let j = 0; j < Math.min(features.length, weights.length); j++) {
          y += features[j] * weights[j];
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
      
      // Draw grid lines
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      
      // Horizontal grid lines
      const yStep = (yRange.max - yRange.min) / 10;
      for (let y = Math.ceil(yRange.min / yStep) * yStep; y <= yRange.max; y += yStep) {
        const canvasY = canvasHeight - plotMargin - (y - yRange.min) * yScale;
        
        ctx.beginPath();
        ctx.moveTo(plotMargin, canvasY);
        ctx.lineTo(canvasWidth - plotMargin, canvasY);
        ctx.stroke();
      }
      
      // Vertical grid lines
      const xStep = (xRange.max - xRange.min) / 10;
      for (let x = Math.ceil(xRange.min / xStep) * xStep; x <= xRange.max; x += xStep) {
        const canvasX = plotMargin + (x - xRange.min) * xScale;
        
        ctx.beginPath();
        ctx.moveTo(canvasX, plotMargin);
        ctx.lineTo(canvasX, canvasHeight - plotMargin);
        ctx.stroke();
      }
      
      // Helper function to draw a point
      function drawPoint(point, color) {
        const canvasX = plotMargin + (point.x - xRange.min) * xScale;
        const canvasY = canvasHeight - plotMargin - (point.y - yRange.min) * yScale;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw all points based on current state
      if (currentFold >= 0) {
        // During cross-validation
        // Draw validation points
        for (const point of currentFoldValidation) {
          drawPoint(point, '#e74c3c'); // Red for validation
        }
        
        // Draw training points
        for (const point of currentFoldTraining) {
          drawPoint(point, '#3498db'); // Blue for training
        }
        
        // Draw test points
        for (const point of testData) {
          drawPoint(point, '#9b59b6'); // Purple for test
        }
      } else {
        // Normal display
        // Draw training points
        for (const point of trainingData) {
          drawPoint(point, '#3498db'); // Blue for training
        }
        
        // Draw test points
        for (const point of testData) {
          drawPoint(point, '#9b59b6'); // Purple for test
        }
      }
    }
    
    // Draw CV error plot
    function drawCvErrorPlot() {
      cvCtx.clearRect(0, 0, cvCanvasWidth, cvCanvasHeight);
      
      // If no lambda values, don't draw anything
      if (lambdaValues.length === 0) {
        cvCtx.font = '14px Arial';
        cvCtx.fillStyle = '#666';
        cvCtx.textAlign = 'center';
        cvCtx.textBaseline = 'middle';
        cvCtx.fillText('Run cross-validation to see error plot', cvCanvasWidth / 2, cvCanvasHeight / 2);
        return;
      }
      
      // Set margins and plot dimensions
      const margin = { top: 20, right: 20, bottom: 40, left: 50 };
      const width = cvCanvasWidth - margin.left - margin.right;
      const height = cvCanvasHeight - margin.top - margin.bottom;
      
      // Calculate y-scale (CV error)
      const maxError = Math.max(...cvErrors) * 1.1;
      const yScale = height / maxError;
      
      // Draw axes
      cvCtx.strokeStyle = '#333';
      cvCtx.lineWidth = 1;
      
      // Y-axis
      cvCtx.beginPath();
      cvCtx.moveTo(margin.left, margin.top);
      cvCtx.lineTo(margin.left, margin.top + height);
      cvCtx.lineTo(margin.left + width, margin.top + height);
      cvCtx.stroke();
      
      // Draw y-axis ticks and labels
      cvCtx.textAlign = 'right';
      cvCtx.textBaseline = 'middle';
      cvCtx.font = '12px Arial';
      cvCtx.fillStyle = '#333';
      
      const numYTicks = 5;
      for (let i = 0; i <= numYTicks; i++) {
        const y = maxError * (i / numYTicks);
        const yPos = margin.top + height - (y * yScale)
        
        cvCtx.beginPath();
        cvCtx.moveTo(margin.left - 5, yPos);
        cvCtx.lineTo(margin.left, yPos);
        cvCtx.stroke();
        
        cvCtx.fillText(y.toFixed(2), margin.left - 8, yPos);
      }
      
      // Draw x-axis ticks and labels
      cvCtx.textAlign = 'center';
      cvCtx.textBaseline = 'top';
      
      // Use logarithmic scale for x-axis
      const logMin = Math.log(lambdaMin);
      const logMax = Math.log(lambdaMax);
      const logRange = logMax - logMin;
      
      const numXTicks = 5;
      for (let i = 0; i <= numXTicks; i++) {
        const t = i / numXTicks;
        const logLambda = logMin + t * logRange;
        const lambda = Math.exp(logLambda);
        
        const xPos = margin.left + width * t;
        
        cvCtx.beginPath();
        cvCtx.moveTo(xPos, margin.top + height);
        cvCtx.lineTo(xPos, margin.top + height + 5);
        cvCtx.stroke();
        
        cvCtx.fillText(lambda.toFixed(lambda < 0.01 ? 3 : lambda < 0.1 ? 2 : lambda < 1 ? 1 : 0), xPos, margin.top + height + 8);
      }
      
      // Draw axis labels
      cvCtx.textAlign = 'center';
      cvCtx.font = '11px Arial';
      cvCtx.fillText('Regularization Parameter (λ)', margin.left + width / 2, margin.top + height + 20);
      
      cvCtx.save();
      cvCtx.translate(10, margin.top + height / 2);
      cvCtx.rotate(-Math.PI / 2);
      cvCtx.textAlign = 'center';
      cvCtx.fillText('MSE', 0, 0);
      cvCtx.restore();
      
      // Draw grid lines
      cvCtx.strokeStyle = '#eee';
      cvCtx.lineWidth = 1;
      
      // Horizontal grid lines
      for (let i = 1; i <= numYTicks; i++) {
        const y = maxError * (1 - i / numYTicks);
        const yPos = margin.top + y * yScale;
        
        cvCtx.beginPath();
        cvCtx.moveTo(margin.left, yPos);
        cvCtx.lineTo(margin.left + width, yPos);
        cvCtx.stroke();
      }
      
      // Vertical grid lines
      for (let i = 1; i < numXTicks; i++) {
        const t = i / numXTicks;
        const xPos = margin.left + width * t;
        
        cvCtx.beginPath();
        cvCtx.moveTo(xPos, margin.top);
        cvCtx.lineTo(xPos, margin.top + height);
        cvCtx.stroke();
      }
      
      // Draw CV error curve
      if (cvErrors.length > 0) {
        cvCtx.strokeStyle = '#e74c3c';
        cvCtx.lineWidth = 2;
        cvCtx.beginPath();
        
        for (let i = 0; i < lambdaValues.length; i++) {
          const logLambda = Math.log(lambdaValues[i]);
          const t = (logLambda - logMin) / logRange;
          const xPos = margin.left + width * t;
          const yPos = margin.top + height - (cvErrors[i] * yScale)
          
          if (i === 0) {
            cvCtx.moveTo(xPos, yPos);
          } else {
            cvCtx.lineTo(xPos, yPos);
          }
        }
        
        cvCtx.stroke();
        
        // Add points
        for (let i = 0; i < lambdaValues.length; i++) {
          const logLambda = Math.log(lambdaValues[i]);
          const t = (logLambda - logMin) / logRange;
          const xPos = margin.left + width * t;
          const yPos = margin.top + (maxError - cvErrors[i]) * yScale;
          
          cvCtx.fillStyle = '#e74c3c';
          cvCtx.beginPath();
          cvCtx.arc(xPos, yPos, 3, 0, 2 * Math.PI);
          cvCtx.fill();
        }
        
        // Mark optimal lambda
        if (optimalLambda > 0) {
            const logOptimal = Math.log(optimalLambda);
            const tOptimal = (logOptimal - logMin) / logRange;
            const xPos = margin.left + width * tOptimal;
            
            // Find the corresponding error - FIXED
            const index = lambdaValues.findIndex(lambda => lambda === optimalLambda);
            const error = index >= 0 ? cvErrors[index] : 0;
            const yPos = margin.top + height - (error * yScale);

            // Draw vertical line
            cvCtx.strokeStyle = '#2ecc71';
            cvCtx.lineWidth = 2;
            cvCtx.setLineDash([5, 3]);
            cvCtx.beginPath();
            cvCtx.moveTo(xPos, margin.top + height);
            cvCtx.lineTo(xPos, margin.top);
            cvCtx.stroke();
            cvCtx.setLineDash([]);
          
            // Draw point
            cvCtx.fillStyle = '#2ecc71';
            cvCtx.beginPath();
            cvCtx.arc(xPos, yPos, 6, 0, 2 * Math.PI);
            cvCtx.fill();
            
            cvCtx.fillStyle = '#fff';
            cvCtx.beginPath();
            cvCtx.arc(xPos, yPos, 4, 0, 2 * Math.PI);
            cvCtx.fill();
            
            // Add label
            cvCtx.fillStyle = '#2ecc71';
            cvCtx.font = 'bold 12px Arial';
            cvCtx.textAlign = 'center';
            cvCtx.textBaseline = 'bottom';
            cvCtx.fillText('Optimal λ', xPos, margin.top - 5);
        }
      }
    }
    
    // Handle parameter changes
    function handleKFoldsChange() {
      kFolds = parseInt(kFoldsInput.value);
      kFoldsDisplay.textContent = `${kFolds} folds`;
      createCvFolds();
      updateFoldVisualization();
    }
    
    function handleTrainSizeChange() {
      totalSize = parseInt(trainSizeInput.value);
      trainSizeDisplay.textContent = `${totalSize} points`;
      generateData();
    }
    
    function handleTestPercentageChange() {
      testPercentage = parseInt(testPercentageInput.value);
      testPercentageDisplay.textContent = `${testPercentage}%`;
      generateData();
    }
    
    function handleNoiseLevelChange() {
      noiseLevel = parseFloat(noiseLevelInput.value);
      noiseLevelDisplay.textContent = noiseLevel.toFixed(1);
      generateData();
    }
    
    function handlePolynomialDegreeChange() {
        polynomialDegree = parseInt(polynomialDegreeInput.value);
        polynomialDegreeDisplay.textContent = polynomialDegree.toString();
      
        if (lambdaValues.length > 0 && optimalLambda > 0) {
          optimalWeights = fitRidgeRegression(trainingData, optimalLambda);
        }
      
        drawCanvas();
    }
    
    function handleLambdaRangeChange() {
      lambdaMin = parseFloat(lambdaMinInput.value);
      lambdaMax = parseFloat(lambdaMaxInput.value);
      lambdaSteps = parseInt(lambdaStepsInput.value);
      
      // Reset CV results
      lambdaValues = [];
      cvErrors = [];
      drawCvErrorPlot();
    }
    
    // Add event listeners
    kFoldsInput.addEventListener('input', handleKFoldsChange);
    trainSizeInput.addEventListener('input', handleTrainSizeChange);
    testPercentageInput.addEventListener('input', handleTestPercentageChange);
    noiseLevelInput.addEventListener('input', handleNoiseLevelChange);
    polynomialDegreeInput.addEventListener('input', handlePolynomialDegreeChange);
    lambdaMinInput.addEventListener('input', handleLambdaRangeChange);
    lambdaMaxInput.addEventListener('input', handleLambdaRangeChange);
    lambdaStepsInput.addEventListener('input', handleLambdaRangeChange);
    runCvBtn.addEventListener('click', runCrossValidation);
    generateBtn.addEventListener('click', generateData);
    
    // Handle window resize
    function handleResize() {
      const cvParent = cvCanvas.parentElement;
      const cvWidth = cvParent.clientWidth;
      cvCanvas.style.width = cvWidth + 'px';
      cvCanvas.style.height = (cvWidth * cvCanvasHeight / cvCanvasWidth) + 'px';
      
      const canvasParent = canvas.parentElement;
      const canvasWidth = canvasParent.clientWidth;
      canvas.style.width = canvasWidth + 'px';
      canvas.style.height = (canvasWidth * canvasHeight / canvas.width) + 'px';
      
      drawCanvas();
      drawCvErrorPlot();
    }
    
    window.addEventListener('resize', handleResize);
    
    // Initialize
    generateData();
    handleResize();
  });