// linear_regression_visualizer.js
// An improved vanilla JavaScript implementation of the Linear Regression Visualizer

document.addEventListener('DOMContentLoaded', function() {
  // Get the container element
  const container = document.getElementById('linear-regression-visualizer');
  
  if (!container) {
    console.error('Container element not found!');
    return;
  }
  
  // Create HTML structure
  container.innerHTML = `
    <div class="visualizer-container">
      <div class="visualizer-layout">
        <div class="canvas-container">
          <div class="instruction">Click on the plot area to add data points</div>
          <canvas id="regression-canvas" width="800" height="500"></canvas>
          <div class="legend">
            <div class="legend-item"><span class="legend-color data"></span> Data points</div>
            <div class="legend-item"><span class="legend-color regression"></span> Regression line</div>
            <div class="legend-item"><span class="legend-color residual"></span> Residuals</div>
          </div>
        </div>
        
        <div class="controls-panel">
          <div class="control-group">
            <label for="polynomial-degree">Polynomial Degree:</label>
            <select id="polynomial-degree" class="full-width">
              <option value="1">Linear (Degree 1)</option>
              <option value="2">Quadratic (Degree 2)</option>
              <option value="3">Cubic (Degree 3)</option>
              <option value="4">Quartic (Degree 4)</option>
            </select>
          </div>
          
          <div class="control-group">
            <label for="error-metric">Error Metric:</label>
            <select id="error-metric" class="full-width">
              <option value="mse">Mean Squared Error (MSE)</option>
              <option value="mae">Mean Absolute Error (MAE)</option>
            </select>
          </div>
          
          <div class="toggle-group">
            <label class="toggle-control">
              <input type="checkbox" id="show-residuals" checked>
              <span class="toggle-label">Show Residuals</span>
            </label>
            
            <label class="toggle-control">
              <input type="checkbox" id="show-equation" checked>
              <span class="toggle-label">Show Equation</span>
            </label>
          </div>
          
          <div class="equation-display" id="equation-container">
            <div class="equation-title">Best Fit Equation:</div>
            <div id="regression-equation" class="equation">y = 0</div>
            <div id="error-value" class="error-metric">MSE: 0.0000</div>
          </div>
          
          <div class="example-datasets">
            <label>Example Datasets:</label>
            <div class="dataset-buttons">
              <button id="linear-data" class="dataset-btn">Linear</button>
              <button id="quadratic-data" class="dataset-btn">Quadratic</button>
              <button id="cubic-data" class="dataset-btn">Cubic</button>
              <button id="sinusoidal-data" class="dataset-btn">Sinusoidal</button>
              <button id="clear-data" class="clear-btn">Clear</button>
            </div>
          </div>
          
          <div class="how-to-use">
            <h3>How to use this demo:</h3>
            <ol>
              <li>Select a polynomial degree (higher degrees can fit more complex patterns)</li>
              <li>Use the example datasets or add your own points by clicking on the graph</li>
              <li>Toggle "Show Residuals" to visualize the error between actual and predicted values</li>
              <li>Observe how the best-fit line or curve and error metrics change as you add or remove points</li>
              <li>Try different degrees with the same data to see the effect of overfitting</li>
            </ol>
          </div>
        </div>
      </div>
      
      <div class="learning-notes">
        <h3>Side Notes:</h3>
        <ul>
          <li>Linear regression finds coefficients (β) that minimize the sum of squared residuals</li>
          <li>The normal equation (X<sup>T</sup>X)β = X<sup>T</sup>y solves for these optimal coefficients</li>
          <li>Polynomial regression is still "linear" in terms of parameters, as explained in your notes</li>
          <li>Residuals represent the difference between observed and predicted values</li>
          <li>MSE (Mean Squared Error) and MAE (Mean Absolute Error) quantify model performance</li>
        </ul>
      </div>
    </div>
  `;
  
  // Add styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .visualizer-container {
      margin-bottom: 20px;
    }
    
    .visualizer-layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    /* Canvas first on mobile, controls second */
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
    
    .controls-panel {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .canvas-container {
      display: flex;
      flex-direction: column;
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
    
    .toggle-group {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .toggle-control {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    
    .toggle-label {
      margin-left: 8px;
    }
    
    .example-datasets {
      margin-bottom: 20px;
    }
    
    .example-datasets label {
      display: block;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .dataset-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .dataset-btn, .clear-btn {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    
    .dataset-btn {
      background-color: #e9ecef;
      color: #333;
    }
    
    .dataset-btn:hover {
      background-color: #dee2e6;
    }
    
    .dataset-btn.active {
      background-color: #3498db;
      color: white;
    }
    
    .clear-btn {
      background-color: #e74c3c;
      color: white;
    }
    
    .clear-btn:hover {
      background-color: #c0392b;
    }
    
    .equation-display {
      background-color: #f0f7ff;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .equation-title {
      font-weight: bold;
      font-size: 0.9rem;
    }
    
    .equation {
      font-family: monospace;
      font-size: 1.1rem;
      background: white;
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
    }
    
    .error-metric {
      font-family: monospace;
      font-size: 0.9rem;
      color: #666;
      background: white;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    
    .instruction {
      text-align: center;
      margin-bottom: 10px;
      font-size: 0.9rem;
      color: #666;
    }
    
    #regression-canvas {
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
      max-width: 100%;
      height: auto;
      cursor: crosshair;
      touch-action: manipulation;
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
    
    .legend-color.data {
      background-color: #3498db;
    }
    
    .legend-color.regression {
      background-color: #e74c3c;
    }
    
    .legend-color.residual {
      background-color: #2ecc71;
    }
    
    .how-to-use {
      background-color: #f4f8f9;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #3498db;
      margin-bottom: 20px;
    }
    
    .how-to-use h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 1rem;
      color: #2c3e50;
    }
    
    .how-to-use ol {
      padding-left: 20px;
      margin-bottom: 0;
      font-size: 0.9rem;
    }
    
    .how-to-use li {
      margin-bottom: 5px;
    }
    
    .learning-notes {
      background-color: #f0f7ff;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      border-left: 4px solid #3498db;
    }
    
    .learning-notes h3 {
      margin-top: 0;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    
    .learning-notes ul {
      padding-left: 20px;
      margin-bottom: 0;
    }
    
    .learning-notes li {
      margin-bottom: 5px;
    }
    
    /* Mobile specific styles */
    @media (max-width: 768px) {
      .dataset-btn, .clear-btn {
        padding: 10px 12px; /* Larger touch targets on mobile */
        font-size: 1rem;
      }
      
      .equation {
        font-size: 0.9rem;
      }
      
      .toggle-group {
        flex-direction: column;
        gap: 10px;
      }
      
      .toggle-control {
        padding: 8px 0;
      }
      
      /* Make checkboxes larger on mobile */
      .toggle-control input[type="checkbox"] {
        width: 20px;
        height: 20px;
      }
      
      .toggle-label {
        font-size: 1rem;
      }
      
      /* Ensure better spacing on small screens */
      .canvas-container {
        margin-bottom: 15px;
      }
      
      /* Make dropdown selects larger for touch */
      .full-width {
        padding: 12px;
        font-size: 16px;
      }
    }
  `;
  
  document.head.appendChild(styleElement);
  
  // Initialize canvas and variables
  const canvas = document.getElementById('regression-canvas');
  const ctx = canvas.getContext('2d');
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 50; // Increased padding to make the graph area clearer
  
  // Points array to store data
  let points = [];
  let regression = null;
  let activeDataset = null;
  
  // Get DOM elements
  const degreeSelect = document.getElementById('polynomial-degree');
  const errorMetricSelect = document.getElementById('error-metric');
  const showResidualsCheckbox = document.getElementById('show-residuals');
  const showEquationCheckbox = document.getElementById('show-equation');
  const equationContainer = document.getElementById('equation-container');
  const equationElement = document.getElementById('regression-equation');
  const errorValueElement = document.getElementById('error-value');
  
  const linearDataBtn = document.getElementById('linear-data');
  const quadraticDataBtn = document.getElementById('quadratic-data');
  const cubicDataBtn = document.getElementById('cubic-data');
  const sinusoidalDataBtn = document.getElementById('sinusoidal-data');
  const clearDataBtn = document.getElementById('clear-data');
  
  // Helper functions
  function dataToCanvas(point) {
    return {
      x: padding + point.x * (canvasWidth - 2 * padding),
      y: canvasHeight - padding - point.y * (canvasHeight - 2 * padding)
    };
  }
  
  function canvasToData(x, y) {
    return {
      x: (x - padding) / (canvasWidth - 2 * padding),
      y: (canvasHeight - padding - y) / (canvasHeight - 2 * padding)
    };
  }
  
  // Generate example datasets
  function generateDataset(type) {
    // Clear existing dataset buttons
    document.querySelectorAll('.dataset-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Set active dataset
    activeDataset = type;
    
    // Highlight active button
    if (type === 'linear') linearDataBtn.classList.add('active');
    if (type === 'quadratic') quadraticDataBtn.classList.add('active');
    if (type === 'cubic') cubicDataBtn.classList.add('active');
    if (type === 'sinusoidal') sinusoidalDataBtn.classList.add('active');
    
    // Clear existing points
    points = [];
    
    // Generate new points based on dataset type
    if (type === 'linear') {
      // Linear relationship
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 0.8 * x + 0.1 + (Math.random() - 0.5) * 0.1;
        points.push({ x, y });
      }
    } else if (type === 'quadratic') {
      // Quadratic relationship
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 1.5 * x * x + 0.1 + (Math.random() - 0.5) * 0.1;
        points.push({ x, y });
      }
    } else if (type === 'cubic') {
      // Cubic relationship
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 3 * Math.pow(x, 3) - 1.5 * Math.pow(x, 2) + 0.5 * x + 0.1 + (Math.random() - 0.5) * 0.1;
        points.push({ x, y });
      }
    } else if (type === 'sinusoidal') {
      // Sinusoidal relationship
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 0.4 * Math.sin(10 * x) + 0.5 + (Math.random() - 0.5) * 0.05;
        points.push({ x, y });
      }
    }
    
    // Calculate regression with the new points
    calculateRegression();
    
    // Redraw canvas
    drawCanvas();
  }
  
  // Linear regression calculation
  function calculateRegression() {
    if (points.length < 2) {
      regression = null;
      updateEquationDisplay();
      return;
    }
    
    const degree = parseInt(degreeSelect.value);
    
    // Prepare matrices for normal equation: X^T X β = X^T y
    const X = [];
    const Y = [];
    
    // Build design matrix X with polynomial terms
    for (const point of points) {
      const row = [];
      for (let i = 0; i <= degree; i++) {
        row.push(Math.pow(point.x, i));
      }
      X.push(row);
      Y.push(point.y);
    }
    
    // Calculate X^T X
    const XtX = [];
    for (let i = 0; i <= degree; i++) {
      XtX[i] = [];
      for (let j = 0; j <= degree; j++) {
        let sum = 0;
        for (let k = 0; k < X.length; k++) {
          sum += X[k][i] * X[k][j];
        }
        XtX[i][j] = sum;
      }
    }
    
    // Calculate X^T y
    const XtY = [];
    for (let i = 0; i <= degree; i++) {
      let sum = 0;
      for (let k = 0; k < X.length; k++) {
        sum += X[k][i] * Y[k];
      }
      XtY[i] = sum;
    }
    
    // Solve the system using Gaussian elimination
    const coefficients = solveSystem(XtX, XtY);
    
    // Calculate predictions and error metrics
    let mse = 0;
    let mae = 0;
    const predictions = [];
    
    for (let i = 0; i < points.length; i++) {
      let predicted = 0;
      for (let j = 0; j <= degree; j++) {
        predicted += coefficients[j] * Math.pow(points[i].x, j);
      }
      predictions.push(predicted);
      
      const error = points[i].y - predicted;
      mse += error * error;
      mae += Math.abs(error);
    }
    
    mse /= points.length;
    mae /= points.length;
    
    regression = {
      coefficients,
      predictions,
      mse,
      mae
    };
    
    updateEquationDisplay();
  }
  
  // Gaussian elimination to solve the system
  function solveSystem(A, b) {
    const n = A.length;
    const augMatrix = A.map((row, i) => [...row, b[i]]);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(augMatrix[j][i]) > Math.abs(augMatrix[maxRow][i])) {
          maxRow = j;
        }
      }
      
      // Swap rows
      [augMatrix[i], augMatrix[maxRow]] = [augMatrix[maxRow], augMatrix[i]];
      
      // Eliminate below
      for (let j = i + 1; j < n; j++) {
        const factor = augMatrix[j][i] / augMatrix[i][i];
        for (let k = i; k <= n; k++) {
          augMatrix[j][k] -= factor * augMatrix[i][k];
        }
      }
    }
    
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augMatrix[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augMatrix[i][j] * x[j];
      }
      x[i] /= augMatrix[i][i];
    }
    
    return x;
  }
  
  // Update equation display
  function updateEquationDisplay() {
    if (!regression) {
      equationElement.textContent = "y = (Need at least 2 points)";
      errorValueElement.textContent = "";
      return;
    }
    
    // Format equation string
    let equation = "y = ";
    regression.coefficients.forEach((coef, index) => {
      // Round coefficient to 4 decimal places
      const roundedCoef = Math.round(coef * 10000) / 10000;
      
      if (index === 0) {
        equation += roundedCoef;
      } else if (index === 1) {
        if (roundedCoef >= 0) equation += " + " + roundedCoef + "x";
        else equation += " - " + Math.abs(roundedCoef) + "x";
      } else {
        if (roundedCoef >= 0) equation += " + " + roundedCoef + "x^" + index;
        else equation += " - " + Math.abs(roundedCoef) + "x^" + index;
      }
    });
    
    equationElement.textContent = equation;
    
    // Format error metric
    const errorMetric = errorMetricSelect.value;
    const error = errorMetric === 'mse' ? regression.mse : regression.mae;
    errorValueElement.textContent = `${errorMetric.toUpperCase()}: ${Math.round(error * 10000) / 10000}`;
    
    // Show/hide equation container based on checkbox
    equationContainer.style.display = showEquationCheckbox.checked ? 'block' : 'none';
  }
  
  // Drawing functions
  function drawGrid() {
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Calculate grid spacing
    const gridSizeX = (canvasWidth - 2 * padding) / 10;
    const gridSizeY = (canvasHeight - 2 * padding) / 10;
    
    // Draw vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + i * gridSizeX;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvasHeight - padding);
      ctx.stroke();
      
      // Draw tick labels on x-axis
      if (i % 2 === 0) {
        const label = (i / 10).toFixed(1);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, canvasHeight - padding + 20);
      }
    }
    
    // Draw horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = canvasHeight - padding - i * gridSizeY;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvasWidth - padding, y);
      ctx.stroke();
      
      // Draw tick labels on y-axis
      if (i % 2 === 0) {
        const label = (i / 10).toFixed(1);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(label, padding - 10, y + 4);
      }
    }
    
    // Draw axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    
    // x-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvasHeight - padding);
    ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
    ctx.stroke();
    
    // y-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvasHeight - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();
    
    // Axis labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('X', canvasWidth - padding + 25, canvasHeight - padding + 25);
    ctx.textAlign = 'right';
    ctx.fillText('Y', padding - 20, padding - 15);
  }
  
  function drawPoints() {
    ctx.fillStyle = '#3498db';
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 1.5;
    
    points.forEach(point => {
      const canvasPoint = dataToCanvas(point);
      ctx.beginPath();
      ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2); // Larger points for better visibility
      ctx.fill();
      ctx.stroke();
    });
  }
  
  function drawRegressionCurve() {
    if (!regression) return;
    
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const degree = parseInt(degreeSelect.value);
    const numPoints = 100;
    
    for (let i = 0; i <= numPoints; i++) {
      const x = i / numPoints;
      
      // Calculate y using polynomial
      let y = 0;
      for (let j = 0; j <= degree; j++) {
        y += regression.coefficients[j] * Math.pow(x, j);
      }
      
      // Clip to visible area
      y = Math.max(0, Math.min(1, y));
      
      const canvasPoint = dataToCanvas({ x, y });
      
      if (i === 0) {
        ctx.moveTo(canvasPoint.x, canvasPoint.y);
      } else {
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      }
    }
    
    ctx.stroke();
  }
  
  function drawResiduals() {
    if (!regression || !showResidualsCheckbox.checked) return;
    
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    
    points.forEach((point, index) => {
      const canvasPoint = dataToCanvas(point);
      
      // Calculate predicted y using polynomial
      let predictedY = 0;
      for (let j = 0; j <= regression.coefficients.length - 1; j++) {
        predictedY += regression.coefficients[j] * Math.pow(point.x, j);
      }
      
      const canvasPredicted = dataToCanvas({ x: point.x, y: predictedY });
      
      // Draw vertical line from point to regression curve
      ctx.beginPath();
      ctx.moveTo(canvasPoint.x, canvasPoint.y);
      ctx.lineTo(canvasPoint.x, canvasPredicted.y);
      ctx.stroke();
    });
  }
  
  function drawCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    drawGrid();
    drawPoints();
    drawRegressionCurve();
    drawResiduals();
  }
  
  // Event handlers
  function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Convert canvas coordinates to data coordinates
    const dataPoint = canvasToData(clickX, clickY);
    
    // Ensure point is within bounds
    if (dataPoint.x >= 0 && dataPoint.x <= 1 && dataPoint.y >= 0 && dataPoint.y <= 1) {
      points.push(dataPoint);
      
      // Reset active dataset when manually adding points
      activeDataset = null;
      document.querySelectorAll('.dataset-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Calculate regression with new point
      calculateRegression();
      
      // Redraw canvas
      drawCanvas();
    }
  }
  
  function handleDegreeChange() {
    calculateRegression();
    drawCanvas();
  }
  
  function handleErrorMetricChange() {
    updateEquationDisplay();
  }
  
  function handleShowResidualsChange() {
    drawCanvas();
  }
  
  function handleShowEquationChange() {
    updateEquationDisplay();
  }
  
  function handleResetClick() {
    points = [];
    regression = null;
    activeDataset = null;
    
    document.querySelectorAll('.dataset-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    updateEquationDisplay();
    drawCanvas();
  }
  
  // Handle touch events for mobile devices
  function handleTouchStart(e) {
    e.preventDefault(); // Prevent scrolling when touching the canvas
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;
    
    // Convert canvas coordinates to data coordinates
    const dataPoint = canvasToData(touchX, touchY);
    
    // Ensure point is within bounds
    if (dataPoint.x >= 0 && dataPoint.x <= 1 && dataPoint.y >= 0 && dataPoint.y <= 1) {
      points.push(dataPoint);
      
      // Reset active dataset when manually adding points
      activeDataset = null;
      document.querySelectorAll('.dataset-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Calculate regression with new point
      calculateRegression();
      
      // Redraw canvas
      drawCanvas();
    }
  }
  
  // Add event listeners
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  degreeSelect.addEventListener('change', handleDegreeChange);
  errorMetricSelect.addEventListener('change', handleErrorMetricChange);
  showResidualsCheckbox.addEventListener('change', handleShowResidualsChange);
  showEquationCheckbox.addEventListener('change', handleShowEquationChange);
  
  linearDataBtn.addEventListener('click', () => generateDataset('linear'));
  quadraticDataBtn.addEventListener('click', () => generateDataset('quadratic'));
  cubicDataBtn.addEventListener('click', () => generateDataset('cubic'));
  sinusoidalDataBtn.addEventListener('click', () => generateDataset('sinusoidal'));
  clearDataBtn.addEventListener('click', handleResetClick);
  
  // Handle window resize to make canvas responsive
  function handleResize() {
    const parent = canvas.parentElement;
    const ratio = canvas.height / canvas.width;
    const newWidth = parent.clientWidth;
    const newHeight = newWidth * ratio;
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
    
    drawCanvas();
  }
  
  window.addEventListener('resize', handleResize);
  handleResize();
  
  // Initialize canvas with example data
  generateDataset('linear');
});