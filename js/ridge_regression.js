// ridge_regression.js
// An interactive demo for ridge regression vs. linear regression

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element with more robust error handling
    const container = document.getElementById('ridge_regression_visualizer');
    
    if (!container) {
      console.error('Ridge regression container not found!');
      // Try to create a fallback container
      const fallbackContainer = document.createElement('div');
      fallbackContainer.id = 'ridge_regression_visualizer';
      fallbackContainer.style.border = '1px solid red';
      fallbackContainer.style.padding = '10px';
      fallbackContainer.innerHTML = '<p>Ridge regression visualizer container not found. Adding fallback container.</p>';
      
      // Try to find a reasonable place to insert it
      const sections = document.querySelectorAll('.section-content');
      if (sections.length > 0) {
        // Insert before the Lasso Regression section if possible
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].textContent.includes('Lasso Regression')) {
            sections[i].parentNode.insertBefore(fallbackContainer, sections[i]);
            console.log('Inserted fallback container before Lasso section');
            // Reinitialize after creating the container
            setTimeout(() => {
              console.log('Attempting to initialize visualization in fallback container');
              initializeVisualization(fallbackContainer);
            }, 100);
            return;
          }
        }
        // Otherwise insert after the last section
        sections[sections.length - 1].appendChild(fallbackContainer);
        console.log('Inserted fallback container at end of content');
        // Reinitialize after creating the container
        setTimeout(() => {
          console.log('Attempting to initialize visualization in fallback container');
          initializeVisualization(fallbackContainer);
        }, 100);
      }
      return;
    }
    
    // Proceed with initialization
    initializeVisualization(container);
  });
  

// Break out initialization into a separate function for reuse
function initializeVisualization(container) {
    // Check if container exists
    if (!container) {
      console.error('Container still not found in initializeVisualization');
      return;
    }
    
    console.log('Initializing ridge regression visualization in container:', container);
    
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
    
    // Get control elements
    const canvas = document.getElementById('ridge-regression-canvas');
    
    // Check if canvas exists
    if (!canvas) {
      console.error('Canvas element not found!');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas context not available!');
      return;
    }
    
    console.log('Canvas and context successfully initialized');
    
    // Continue with the rest of the initialization...
    // Get DOM elements
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
    
    // Check if all required elements exist
    if (!datasetSelect || !lambdaInput || !lambdaDisplay || !trainSizeInput || 
        !trainSizeDisplay || !noiseLevelInput || !noiseLevelDisplay || 
        !polynomialDegreeInput || !polynomialDegreeDisplay || !generateBtn ||
        !linearTrainError || !linearTestError || !ridgeTrainError || !ridgeTestError ||
        !linearWeightsNorm || !ridgeWeightsNorm || !weightBarsContainer) {
      console.error('One or more required elements not found!');
      return;
    }
    
    console.log('All control elements successfully initialized');
    
    // Add event listeners
    datasetSelect.addEventListener('change', handleDatasetChange);
    lambdaInput.addEventListener('input', handleLambdaChange);
    trainSizeInput.addEventListener('input', handleTrainSizeChange);
    noiseLevelInput.addEventListener('input', handleNoiseLevelChange);
    polynomialDegreeInput.addEventListener('input', handlePolynomialDegreeChange);
    generateBtn.addEventListener('click', generateData);
    
    window.addEventListener('resize', handleResize);
    
    // Initialize the visualization
    console.log('Generating initial data...');
    generateData();
    handleResize();
    
    console.log('Ridge regression visualization fully initialized');
  }