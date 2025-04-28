// random_variable_transformation_visualizer.js
// A JavaScript implementation of the Random Variable Transformation Visualizer
// Includes both invertible and non-invertible transformation visualizations

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('random_variable_transformation_visualizer');
    
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
                <select id="transformation-type" class="full-width">
                  <option value="invertible">Invertible Transformation (Jacobian Method)</option>
                  <option value="noninvertible">Non-Invertible Transformation (Monte Carlo Method)</option>
                </select>
              </label>
            </div>
            <div class="instruction" id="instruction-text">Observe how the PDF of X transforms into the PDF of Y = f(X)</div>
            <div id="canvas-wrapper">
              <canvas id="transformation-canvas" width="800" height="500"></canvas>
            </div>
            <div class="legend">
              <div class="legend-item"><span class="legend-color input"></span> Input distribution p<sub>X</sub>(x)</div>
              <div class="legend-item"><span class="legend-color output"></span> Output distribution p<sub>Y</sub>(y)</div>
              <div class="legend-item"><span class="legend-color mapping"></span> Transformation y = f(x)</div>
              <div class="legend-item" id="mc-samples-legend" style="display: none;"><span class="legend-color samples"></span> Monte Carlo samples</div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="control-group" id="input-distribution-control">
              <label for="input-distribution">Input Distribution p<sub>X</sub>(x):</label>
              <select id="input-distribution" class="full-width">
                <option value="normal">Normal Distribution (Gaussian)</option>
                <option value="uniform">Uniform Distribution</option>
                <option value="exponential">Exponential Distribution</option>
                <option value="beta">Beta Distribution</option>
                <option value="gamma">Gamma Distribution</option>
              </select>
            </div>
            
            <div class="param-group" id="normal-params">
              <label>Normal Distribution Parameters:</label>
              <div class="param-row">
                <div class="param-field">
                  <label for="normal-mean">Mean (μ):</label>
                  <input type="number" id="normal-mean" value="0" step="0.5">
                </div>
                <div class="param-field">
                  <label for="normal-std">Std Dev (σ):</label>
                  <input type="number" id="normal-std" value="1" min="0.1" step="0.1">
                </div>
              </div>
            </div>
            
            <div class="param-group" id="uniform-params" style="display: none;">
              <label>Uniform Distribution Parameters:</label>
              <div class="param-row">
                <div class="param-field">
                  <label for="uniform-min">Min (a):</label>
                  <input type="number" id="uniform-min" value="-3" step="0.5">
                </div>
                <div class="param-field">
                  <label for="uniform-max">Max (b):</label>
                  <input type="number" id="uniform-max" value="3" step="0.5">
                </div>
              </div>
            </div>
            
            <div class="param-group" id="exponential-params" style="display: none;">
              <label>Exponential Distribution Parameters:</label>
              <div class="param-row">
                <div class="param-field">
                  <label for="exponential-rate">Rate (λ):</label>
                  <input type="number" id="exponential-rate" value="1" min="0.1" step="0.1">
                </div>
              </div>
            </div>
            
            <div class="param-group" id="beta-params" style="display: none;">
              <label>Beta Distribution Parameters:</label>
              <div class="param-row">
                <div class="param-field">
                  <label for="beta-alpha">Alpha (α):</label>
                  <input type="number" id="beta-alpha" value="2" min="0.1" step="0.1">
                </div>
                <div class="param-field">
                  <label for="beta-beta">Beta (β):</label>
                  <input type="number" id="beta-beta" value="2" min="0.1" step="0.1">
                </div>
              </div>
            </div>
            
            <div class="param-group" id="gamma-params" style="display: none;">
              <label>Gamma Distribution Parameters:</label>
              <div class="param-row">
                <div class="param-field">
                  <label for="gamma-shape">Shape (k):</label>
                  <input type="number" id="gamma-shape" value="2" min="0.1" step="0.1">
                </div>
                <div class="param-field">
                  <label for="gamma-scale">Scale (θ):</label>
                  <input type="number" id="gamma-scale" value="1" min="0.1" step="0.1">
                </div>
              </div>
            </div>
            
            <div class="control-group" id="transformation-function-control">
              <label for="transformation-function">Transformation Function y = f(x):</label>
              <select id="transformation-function" class="full-width">
                <option value="quadratic">Quadratic: y = x²</option>
                <option value="exp">Exponential: y = e^x</option>
                <option value="log">Logarithmic: y = ln(x)</option>
                <option value="abs">Absolute Value: y = |x|</option>
              </select>
            </div>

            <div class="control-group" id="monte-carlo-control" style="display: none;">
              <label for="num-samples">Number of Monte Carlo Samples:</label>
              <input type="range" id="num-samples" min="100" max="10000" step="100" value="1000">
              <span id="num-samples-value">1000</span>
              <div class="help-text">More samples = better approximation, but slower</div>
            </div>
            
           <div class="control-group" id="bin-count-control">
                <label for="bin-count">Histogram Bin Count:</label>
                <input type="range" id="bin-count" min="10" max="100" step="5" value="50">
                <span id="bin-count-value">50</span>
            </div>

            <div class="equation-display" id="equation-container">
              <div class="equation-title">Transformation Formula:</div>
              <div id="transformation-equation" class="equation">p<sub>Y</sub>(y) = p<sub>X</sub>(x) · |dx/dy|</div>
              <div id="jacobian-equation" class="equation">= p<sub>X</sub>(f<sup>-1</sup>(y)) · |1/f'(f<sup>-1</sup>(y))|</div>
            </div>
            
            <div class="button-group">
              <button id="reset-btn" class="secondary-btn">Reset to Defaults</button>
            </div>
            
            <div class="explanation-container">
              <h3 id="explanation-title">Random Variable Transformation</h3>
              <div id="explanation-content">
                <p><strong>Invertible Transformation:</strong> When Y = f(X) is invertible, we can use the change of variable formula with the Jacobian determinant:</p>
                <p>p<sub>Y</sub>(y) = p<sub>X</sub>(f<sup>-1</sup>(y)) · |dx/dy|</p>
                <p>For non-invertible transformations, we use Monte Carlo simulation to approximate the output distribution.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .visualizer-container {
        margin-bottom: 20px;
        font-family: Arial, sans-serif;
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
      
      #canvas-wrapper {
        position: relative;
        width: 100%;
      }
      
      .visualization-mode-toggle {
        margin-bottom: 10px;
        background-color: #f0f7ff;
        padding: 8px 12px;
        border-radius: 4px;
        border-left: 3px solid #3498db;
      }
      
      .control-group, .param-group {
        margin-bottom: 20px;
      }
      
      .control-group label, .param-group > label {
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
      
      .param-row {
        display: flex;
        gap: 10px;
      }
      
      .param-field {
        flex: 1;
      }
      
      .param-field label {
        display: block;
        margin-bottom: 5px;
        font-size: 0.9rem;
      }
      
      .param-field input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .toggle-control {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      .toggle-label {
        margin-left: 8px;
      }
      
      .button-group {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .primary-btn, .secondary-btn {
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: bold;
      }
      
      .primary-btn {
        background-color: #3498db;
        color: white;
      }
      
      .primary-btn:hover {
        background-color: #2980b9;
      }
      
      .secondary-btn {
        background-color: #e9ecef;
        color: #333;
      }
      
      .secondary-btn:hover {
        background-color: #dee2e6;
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
        font-family: "Computer Modern", serif;
        font-size: 1.1rem;
        background: white;
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
      }
      
      .instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        color: #666;
      }
      
      #transformation-canvas {
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        max-width: 100%;
        height: auto;
        display: block;
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
      
      .legend-color.input {
        background-color: #3498db;
      }
      
      .legend-color.output {
        background-color: #e74c3c;
      }
      
      .legend-color.mapping {
        background-color: #2ecc71;
      }
      
      .legend-color.samples {
        background-color: #9b59b6;
      }
      
      .explanation-container {
        background-color: #f4f8f9;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #3498db;
        margin-bottom: 20px;
      }
      
      .explanation-container h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1rem;
        color: #2c3e50;
      }
      
      .explanation-container p {
        margin-bottom: 8px;
        font-size: 0.9rem;
      }
      
      .help-text {
        font-size: 0.8rem;
        color: #666;
        margin-top: 5px;
      }
      
      /* Mobile specific styles */
      @media (max-width: 768px) {
        .param-row {
          flex-direction: column;
          gap: 10px;
        }
        
        .button-group {
          flex-direction: column;
        }
        
        .primary-btn, .secondary-btn {
          width: 100%;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Get DOM elements
    const transformationType = document.getElementById('transformation-type');
    const inputDistribution = document.getElementById('input-distribution');
    const transformationFunction = document.getElementById('transformation-function');
    const resetBtn = document.getElementById('reset-btn');
    const binCount = document.getElementById('bin-count');
    const binCountValue = document.getElementById('bin-count-value');
    const numSamples = document.getElementById('num-samples');
    const numSamplesValue = document.getElementById('num-samples-value');
    const monteCarloControl = document.getElementById('monte-carlo-control');
    const mcSamplesLegend = document.getElementById('mc-samples-legend');
    const transformationEquation = document.getElementById('transformation-equation');
    const jacobianEquation = document.getElementById('jacobian-equation');
    const explanationTitle = document.getElementById('explanation-title');
    const explanationContent = document.getElementById('explanation-content');
    const normalParams = document.getElementById('normal-params');
    const uniformParams = document.getElementById('uniform-params');
    const exponentialParams = document.getElementById('exponential-params');
    const betaParams = document.getElementById('beta-params');
    const gammaParams = document.getElementById('gamma-params');
    const binCountControl = document.getElementById('bin-count-control');
    // Input distribution parameters
    const normalMean = document.getElementById('normal-mean');
    const normalStd = document.getElementById('normal-std');
    const uniformMin = document.getElementById('uniform-min');
    const uniformMax = document.getElementById('uniform-max');
    const exponentialRate = document.getElementById('exponential-rate');
    const betaAlpha = document.getElementById('beta-alpha');
    const betaBeta = document.getElementById('beta-beta');
    const gammaShape = document.getElementById('gamma-shape');
    const gammaScale = document.getElementById('gamma-scale');
    
    // Canvas and context
    const canvas = document.getElementById('transformation-canvas');
    const ctx = canvas.getContext('2d');
    
    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = 50;
    const plotWidth = canvasWidth - 2 * padding;
    const plotHeight = canvasHeight - 2 * padding;
    
    // Default parameters
    let defaultParams = {
      transformationType: 'invertible',
      inputDistribution: 'normal',
      transformationFunction: 'quadratic',
      normalMean: 0,
      normalStd: 1,
      uniformMin: -3,
      uniformMax: 3,
      exponentialRate: 1,
      betaAlpha: 2,
      betaBeta: 2,
      gammaShape: 2,
      gammaScale: 1,
      binCount: 50,
      numSamples: 1000
    };
    
    // Current parameters
    let params = Object.assign({}, defaultParams);
    
   // Initialize visualization
function initialize() {
    // Set up event listeners with immediate updates
    transformationType.addEventListener('change', function() {
      params.transformationType = this.value;
      updateTransformationType();
      updateVisualization();
    });
    
    inputDistribution.addEventListener('change', function() {
      params.inputDistribution = this.value;
      updateInputDistribution();
      updateVisualization();
    });
    
    transformationFunction.addEventListener('change', function() {
      params.transformationFunction = this.value;
      updateTransformationFunction();
      updateVisualization();
    });
    
    binCount.addEventListener('input', function() {
      params.binCount = parseInt(this.value);
      binCountValue.textContent = params.binCount;
      updateVisualization();
    });
    
    numSamples.addEventListener('input', function() {
      params.numSamples = parseInt(this.value);
      numSamplesValue.textContent = params.numSamples;
      updateVisualization();
    });
    
    resetBtn.addEventListener('click', resetParameters);
    
    // Input distribution parameter event listeners with immediate updates
    normalMean.addEventListener('input', function() {
      params.normalMean = parseFloat(this.value);
      updateVisualization();
    });
    
    normalStd.addEventListener('input', function() {
      params.normalStd = parseFloat(this.value);
      updateVisualization();
    });
    
    uniformMin.addEventListener('input', function() {
      params.uniformMin = parseFloat(this.value);
      updateVisualization();
    });
    
    uniformMax.addEventListener('input', function() {
      params.uniformMax = parseFloat(this.value);
      updateVisualization();
    });
    
    exponentialRate.addEventListener('input', function() {
      params.exponentialRate = parseFloat(this.value);
      updateVisualization();
    });
    
    betaAlpha.addEventListener('input', function() {
      params.betaAlpha = parseFloat(this.value);
      updateVisualization();
    });
    
    betaBeta.addEventListener('input', function() {
      params.betaBeta = parseFloat(this.value);
      updateVisualization();
    });
    
    gammaShape.addEventListener('input', function() {
      params.gammaShape = parseFloat(this.value);
      updateVisualization();
    });
    
    gammaScale.addEventListener('input', function() {
      params.gammaScale = parseFloat(this.value);
      updateVisualization();
    });
    
    // Update UI based on initial parameters
    updateTransformationType();
    updateInputDistribution();
    updateTransformationFunction();
    
    // Initial visualization
    updateVisualization();
  }
    
    // Update transformation type UI
    function updateTransformationType() {
      if (params.transformationType === 'invertible') {
        monteCarloControl.style.display = 'none';
        mcSamplesLegend.style.display = 'none';
        jacobianEquation.style.display = 'block';
        binCountControl.style.display = 'none';
        explanationTitle.textContent = 'Invertible Transformation (Jacobian Method)';
        explanationContent.innerHTML = `
          <p>When Y = f(X) is invertible, we can compute p<sub>Y</sub>(y) using the change of variable formula:</p>
          <p>p<sub>Y</sub>(y) = p<sub>X</sub>(f<sup>-1</sup>(y)) · |dx/dy|</p>
          <p>Where |dx/dy| is the absolute value of the Jacobian determinant. For a 1D transformation, this is just |1/f'(x)|.</p>
          <p>This method is exact but requires that the transformation function is invertible.</p>
        `;
      } else {
        monteCarloControl.style.display = 'block';
        mcSamplesLegend.style.display = 'inline-flex';
        jacobianEquation.style.display = 'none';
        binCountControl.style.display = 'block';
        explanationTitle.textContent = 'Non-Invertible Transformation (Monte Carlo Method)';
        explanationContent.innerHTML = `
          <p>When Y = f(X) is not invertible (or difficult to invert), we can use Monte Carlo simulation:</p>
          <ol>
            <li>Generate many samples from the input distribution p<sub>X</sub>(x)</li>
            <li>Transform each sample using y = f(x)</li>
            <li>Estimate p<sub>Y</sub>(y) using a histogram of the transformed samples</li>
          </ol>
          <p>This method is approximate but works for any transformation function.</p>
        `;
      }
      
      // Update the transformation function options based on invertibility
      updateTransformationFunctionOptions();
    }
    
    // Update input distribution UI
    function updateInputDistribution() {
      // Hide all parameter groups
      normalParams.style.display = 'none';
      uniformParams.style.display = 'none';
      exponentialParams.style.display = 'none';
      betaParams.style.display = 'none';
      gammaParams.style.display = 'none';
      
      // Show the appropriate parameter group
      switch (params.inputDistribution) {
        case 'normal':
          normalParams.style.display = 'block';
          break;
        case 'uniform':
          uniformParams.style.display = 'block';
          break;
        case 'exponential':
          exponentialParams.style.display = 'block';
          break;
        case 'beta':
          betaParams.style.display = 'block';
          break;
        case 'gamma':
          gammaParams.style.display = 'block';
          break;
      }
      
      // Update the transformation function options based on input distribution
      updateTransformationFunctionOptions();
    }
    
    // Update transformation function UI
    function updateTransformationFunction() {
      // Update the transformation equation
      updateTransformationEquation();
    }
    
    // Update transformation function options based on input distribution and invertibility
    function updateTransformationFunctionOptions() {
      // Clear existing options
      transformationFunction.innerHTML = '';
      
      // Default options for invertible transformations
      const invertibleOptions = [
        { value: 'linear', text: 'Linear: y = ax + b' },
        { value: 'quadratic', text: 'Quadratic: y = x²' },
        { value: 'exp', text: 'Exponential: y = e^x' }
      ];
      
      // Add options for non-invertible transformations
      const nonInvertibleOptions = [
        { value: 'abs', text: 'Absolute Value: y = |x|' },
        { value: 'modulo', text: 'Modulo: y = x mod 1' },
        { value: 'discretize', text: 'Discretize: y = ⌊x⌋' }
      ];
      
      // Special options for special distributions
      if (params.inputDistribution === 'exponential' || params.inputDistribution === 'gamma' || params.inputDistribution === 'beta') {
        invertibleOptions.push({ value: 'log', text: 'Logarithmic: y = ln(x)' });
      } 
      
      // Add options based on transformation type
      let options = invertibleOptions;
      if (params.transformationType === 'noninvertible') {
        options = invertibleOptions.concat(nonInvertibleOptions);
      }
      
      // Populate the select element
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        transformationFunction.appendChild(optionElement);
      });
      
      // Set the current value
      if (options.some(option => option.value === params.transformationFunction)) {
        transformationFunction.value = params.transformationFunction;
      } else {
        // Default to first option if current selection is invalid
        transformationFunction.value = options[0].value;
        params.transformationFunction = options[0].value;
      }
      
      // Update the transformation equation
      updateTransformationEquation();
    }
    
    // Update the transformation equation display
    function updateTransformationEquation() {
      let formula = '';
      let jacobian = '';
      let inverse = '';
      
      switch (params.transformationFunction) {
        case 'quadratic':
          formula = 'y = x²';
          jacobian = '|dx/dy| = 1/(2√y)';
          inverse = 'x = ±√y';
          transformationEquation.innerHTML = `p<sub>Y</sub>(y) = p<sub>X</sub>(√y) · 1/(2√y) + p<sub>X</sub>(-√y) · 1/(2√y)`;
          break;
        case 'exp':
          formula = 'y = e^x';
          jacobian = '|dx/dy| = 1/y';
          inverse = 'x = ln(y)';
          transformationEquation.innerHTML = `p<sub>Y</sub>(y) = p<sub>X</sub>(ln(y)) · 1/y`;
          break;
        case 'log':
          formula = 'y = ln(x)';
          jacobian = '|dx/dy| = e^y';
          inverse = 'x = e^y';
          transformationEquation.innerHTML = `p<sub>Y</sub>(y) = p<sub>X</sub>(e<sup>y</sup>) · e<sup>y</sup>`;
          break;
        case 'abs':
          formula = 'y = |x|';
          jacobian = 'Not invertible';
          inverse = 'x = ±y';
          transformationEquation.innerHTML = `p<sub>Y</sub>(y) = p<sub>X</sub>(y) + p<sub>X</sub>(-y)`;
          break;
        case 'modulo':
          formula = 'y = x mod 1';
          jacobian = 'Not invertible';
          inverse = 'x = y + k';
          transformationEquation.innerHTML = `p<sub>Y</sub>(y) = Σ p<sub>X</sub>(y + k)`;
          break;
        case 'discretize':
          formula = 'y = ⌊x⌋';
          jacobian = 'Not invertible';
          inverse = 'x ∈ [y, y+1)';
          transformationEquation.innerHTML = `p<sub>Y</sub>(y) = ∫<sub>y</sub><sup>y+1</sup> p<sub>X</sub>(x) dx`;
          break;
      }
      
      if (params.transformationType === 'noninvertible') {
        jacobianEquation.innerHTML = `(Using Monte Carlo with ${params.numSamples} samples)`;
      } else {
        jacobianEquation.innerHTML = `where ${jacobian} for ${inverse}`;
      }
    }
    
    // Reset parameters to defaults
    function resetParameters() {
      params = Object.assign({}, defaultParams);
      
      // Update UI
      transformationType.value = params.transformationType;
      inputDistribution.value = params.inputDistribution;
      normalMean.value = params.normalMean;
      normalStd.value = params.normalStd;
      uniformMin.value = params.uniformMin;
      uniformMax.value = params.uniformMax;
      exponentialRate.value = params.exponentialRate;
      betaAlpha.value = params.betaAlpha;
      betaBeta.value = params.betaBeta;
      gammaShape.value = params.gammaShape;
      gammaScale.value = params.gammaScale;
      binCount.value = params.binCount;
      binCountValue.textContent = params.binCount;
      numSamples.value = params.numSamples;
      numSamplesValue.textContent = params.numSamples;
      
      // Update UI based on reset parameters
      updateTransformationType();
      updateInputDistribution();
      updateTransformationFunction();
      
      // Update visualization
      updateVisualization();
    }
    
    // Main visualization update function
    function updateVisualization() {
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      console.log("Updating visualization with parameters:", JSON.stringify(params));
      
      // Draw grid and axes
      drawGrid();

      
      // Generate input distribution
      const inputPDF = generateInputPDF();
      
      // Transform distribution
      let outputPDF;
      if (params.transformationType === 'invertible') {
        outputPDF = transformDistributionJacobian(inputPDF);
      } else {
        outputPDF = transformDistributionMonteCarlo(inputPDF);
      }
      
      // Draw input and output distributions
      drawDistribution(inputPDF, '#3498db');
      drawDistribution(outputPDF, '#e74c3c');
      
      // Draw transformation function
      drawTransformationFunction();
    }
    
    // Generate input PDF based on selected distribution
    function generateInputPDF() {
      // Range of x values to compute the PDF over
      const min = -6;
      const max = 6;
      const step = (max - min) / 200;
      
      // Initialize PDF array
      const pdf = [];
      
      // Generate x values and corresponding PDF values
      for (let x = min; x <= max; x += step) {
        let p = 0;
        
        switch (params.inputDistribution) {
          case 'normal':
            p = normalPDF(x, params.normalMean, params.normalStd);
            break;
          case 'uniform':
            p = uniformPDF(x, params.uniformMin, params.uniformMax);
            break;
          case 'exponential':
            p = exponentialPDF(x, params.exponentialRate);
            break;
          case 'beta':
            // Scale beta from [0,1] to [-6,6] for visualization
            scaledX = (x + 6) / 12;
            if (scaledX >= 0 && scaledX <= 1) {
              p = betaPDF(scaledX, params.betaAlpha, params.betaBeta) / 12;
            }
            break;
          case 'gamma':
            if (x >= 0) {
              p = gammaPDF(x, params.gammaShape, params.gammaScale);
            }
            break;
        }
        
        pdf.push({ x, p });
      }
      
      return pdf;
    }
    
    // Transform distribution using Jacobian method (for invertible transformations)
    function transformDistributionJacobian(inputPDF) {
      // Range of y values to compute the transformed PDF over
      const min = -6;
      const max = 6;
      const step = (max - min) / 200;
      
      // Initialize transformed PDF array
      const transformedPDF = [];
      
      // Generate y values and corresponding transformed PDF values
      for (let y = min; y <= max; y += step) {
        let p = 0;
        
        // Compute the transformed PDF based on the transformation function
        switch (params.transformationFunction) {
            case 'linear':
                // y = ax + b, x = (y-b)/a
                const a = 2; // Same values as above
                const b = 1;
                const x_linear = (y - b) / a;
                p = interpolatePDF(inputPDF, x_linear) / Math.abs(a);
                break;
          case 'quadratic':
            // y = x^2, x = ±√y
            if (y >= 0) {
              const x1 = Math.sqrt(y);
              const x2 = -Math.sqrt(y);
              const p1 = interpolatePDF(inputPDF, x1) / (2 * Math.sqrt(y));
              const p2 = interpolatePDF(inputPDF, x2) / (2 * Math.sqrt(y));
              p = p1 + p2;
            }
            break;
          case 'exp':
            // y = e^x, x = ln(y)
            if (y > 0) {
              const x = Math.log(y);
              p = interpolatePDF(inputPDF, x) / y;
            }
            break;
          case 'log':
            // y = ln(x), x = e^y
            const x_log = Math.exp(y);
            p = interpolatePDF(inputPDF, x_log) * x_log;
            break;
        }
        
        transformedPDF.push({ x: y, p });
      }
      
      return transformedPDF;
    }
    
    // Transform distribution using Monte Carlo method (for non-invertible transformations)
    function transformDistributionMonteCarlo(inputPDF) {
      // Generate samples from the input distribution
      const samples = generateSamples(params.numSamples);
      
      // Transform samples
      const transformedSamples = samples.map(x => transformSample(x));

      // Sort samples
        const sortedSamples = transformedSamples.slice().sort((a, b) => a - b);

        // Set alpha level
        const alpha = 0.05; // (or get it dynamically from UI)

        // Find approximate quantiles
        const lowerIndex = Math.ceil((alpha / 2) * sortedSamples.length) - 1;
        const upperIndex = Math.ceil((1 - alpha / 2) * sortedSamples.length) - 1;

        // Guard against out of bounds
        const lowerBound = sortedSamples[Math.max(0, lowerIndex)];
        const upperBound = sortedSamples[Math.min(sortedSamples.length - 1, upperIndex)];

        // Report the credible interval
        console.log(`Estimated ${(1-alpha)*100}% credible interval: [${lowerBound}, ${upperBound}]`);


      // Compute histogram of transformed samples
      const histogram = computeHistogram(transformedSamples, params.binCount);
      
      // Convert histogram to PDF
      const transformedPDF = histogramToPDF(histogram);
      
      // Draw the Monte Carlo samples if in non-invertible mode
      if (params.transformationType === 'noninvertible') {
        drawScatterplot(samples, transformedSamples);
      }
      
      return transformedPDF;
    }
    
    // Generate samples from the input distribution
    function generateSamples(numSamples) {
      const samples = [];
      
      for (let i = 0; i < numSamples; i++) {
        let sample;
        
        switch (params.inputDistribution) {
          case 'normal':
            sample = randomNormal(params.normalMean, params.normalStd);
            break;
          case 'uniform':
            sample = randomUniform(params.uniformMin, params.uniformMax);
            break;
          case 'exponential':
            sample = randomExponential(params.exponentialRate);
            break;
          case 'beta':
            // Scale back to [-6,6] for visualization
            sample = randomBeta(params.betaAlpha, params.betaBeta) * 12 - 6;
            break;
          case 'gamma':
            sample = randomGamma(params.gammaShape, params.gammaScale);
            break;
        }
        
        samples.push(sample);
      }
      
      return samples;
    }
    
    // Transform a single sample
    function transformSample(x) {
      switch (params.transformationFunction) {
        case 'linear':
            const a = 2; // make these configurable parameters if desired
            const b = 1;
        return a * x + b;
        case 'quadratic':
          return x * x;
        case 'exp':
          return Math.exp(x);
        case 'log':
          return x > 0 ? Math.log(x) : -10; // Default value for negative inputs
        case 'abs':
          return Math.abs(x);
        case 'modulo':
          return ((x % 1) + 1) % 1; // Ensure result is in [0,1]
        case 'discretize':
          return Math.floor(x);
      }
    }
    
    // Compute histogram from samples
    function computeHistogram(samples, binCount) {
      // Find min and max values
      let min = Math.min(...samples);
      let max = Math.max(...samples);
      
      // Add a small buffer
      const buffer = (max - min) * 0.1;
      min -= buffer;
      max += buffer;
      
      // Initialize bins
      const bins = new Array(binCount).fill(0);
      const binWidth = (max - min) / binCount;
      
      // Count samples in each bin
      samples.forEach(sample => {
        const binIndex = Math.floor((sample - min) / binWidth);
        if (binIndex >= 0 && binIndex < binCount) {
          bins[binIndex]++;
        }
      });
      
      // Return histogram data
      return {
        bins,
        min,
        max,
        binWidth
      };
    }
    
    // Convert histogram to PDF
    function histogramToPDF(histogram) {
      const { bins, min, max, binWidth } = histogram;
      const pdf = [];
      
      // Normalize histogram to get PDF
      const totalSamples = bins.reduce((sum, count) => sum + count, 0);
      const normalizationFactor = 1 / (totalSamples * binWidth);
      
      // Convert bins to PDF points
      for (let i = 0; i < bins.length; i++) {
        const x = min + (i + 0.5) * binWidth;
        const p = bins[i] * normalizationFactor;
        pdf.push({ x, p });
      }
      
      return pdf;
    }
    
    // Interpolate PDF value at a given x
    function interpolatePDF(pdf, x) {
      // Find the two points in the PDF that bracket x
      let left = 0;
      let right = pdf.length - 1;
      
      // Check if x is outside the range
      if (x <= pdf[left].x) {
        return pdf[left].p;
      }
      if (x >= pdf[right].x) {
        return pdf[right].p;
      }
      
      // Binary search to find the bracketing points
      while (right - left > 1) {
        const mid = Math.floor((left + right) / 2);
        if (pdf[mid].x < x) {
          left = mid;
        } else {
          right = mid;
        }
      }
      
      // Linear interpolation
      const dx = pdf[right].x - pdf[left].x;
      const dp = pdf[right].p - pdf[left].p;
      const t = (x - pdf[left].x) / dx;
      
      return pdf[left].p + t * dp;
    }
    
    // Draw grid and axes
    function drawGrid() {
      // Draw grid
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      
      // Vertical grid lines
      for (let x = 0; x <= 10; x++) {
        const xPos = padding + (x / 10) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(xPos, padding);
        ctx.lineTo(xPos, canvasHeight - padding);
        ctx.stroke();
      }
      
      // Horizontal grid lines
      for (let y = 0; y <= 10; y++) {
        const yPos = padding + (y / 10) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(padding, yPos);
        ctx.lineTo(canvasWidth - padding, yPos);
        ctx.stroke();
      }
      
      // Draw axes
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      
      // x-axis
      ctx.beginPath();
      ctx.moveTo(padding, canvasHeight - padding);
      ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
      ctx.stroke();
      
      // y-axis
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvasHeight - padding);
      ctx.stroke();
      
      // Draw origin
      const originX = padding + plotWidth / 2;
      const originY = canvasHeight - padding;
      
      ctx.beginPath();
      ctx.moveTo(originX, originY - 5);
      ctx.lineTo(originX, originY + 5);
      ctx.stroke();
      
      // Draw axis labels
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      
      // x-axis labels
      for (let x = -5; x <= 5; x++) {
        const xPos = padding + ((x + 5) / 10) * plotWidth;
        ctx.fillText(x.toString(), xPos, canvasHeight - padding + 15);
      }
      
      // y-axis labels
      ctx.textAlign = 'right';
      for (let y = 0; y <= 1; y += 0.2) {
        const yPos = canvasHeight - padding - y * plotHeight;
        ctx.fillText(y.toFixed(1), padding - 5, yPos + 4);
      }
      
      // Axis titles
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      
      // x-axis title
      ctx.fillText('x / y', canvasWidth / 2, canvasHeight - 10);
      
      // y-axis title
      ctx.save();
      ctx.translate(15, canvasHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Probability Density', 0, 0);
      ctx.restore();
    }
    
    // Draw a distribution
    function drawDistribution(pdf, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Find the maximum PDF value for scaling
      const maxP = Math.max(...pdf.map(point => point.p));
      const scaleFactor = maxP > 0 ? plotHeight / maxP : plotHeight;
      
      // Draw the PDF curve
      for (let i = 0; i < pdf.length; i++) {
        const { x, p } = pdf[i];
        
        // Map x from [-6,6] to canvas coordinates
        const canvasX = padding + ((x + 6) / 12) * plotWidth;
        
        // Map p to canvas coordinates (inverted, since canvas y grows downward)
        const canvasY = canvasHeight - padding - p * scaleFactor;
        
        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      }
      
      ctx.stroke();
    }
    
    // Draw the transformation function
    // Draw the transformation function
function drawTransformationFunction() {
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Range of x values for the transformation function
    const min = -6;
    const max = 6;
    const step = (max - min) / 200;
    
    let started = false; // Add this flag to track if we've started the path
    
    // Draw the transformation curve
    for (let x = min; x <= max; x += step) {
      const y = transformSample(x);
      
      // Skip points that would be outside the visible area
      if (y < -6 || y > 6) {
        started = false; // Reset the flag when we encounter points outside range
        continue;
      }
      
      // Map x from [-6,6] to canvas coordinates
      const canvasX = padding + ((x + 6) / 12) * plotWidth;
      
      // Map y from [-6,6] to canvas coordinates
      const canvasY = canvasHeight - padding - ((y + 6) / 12) * plotHeight;
      
      if (!started) {
        ctx.moveTo(canvasX, canvasY);
        started = true;
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    
    ctx.stroke();
  }
    
    // Draw a scatterplot of input and output samples (for Monte Carlo method)
    function drawScatterplot(inputSamples, outputSamples) {
        // Draw points
        ctx.fillStyle = '#9b59b6';
        ctx.globalAlpha = 0.3;
        
        for (let i = 0; i < inputSamples.length; i++) {
          const x = inputSamples[i];
          const y = outputSamples[i];
          
          // Skip points that would be outside the visible area
          if (x < -6 || x > 6 || y < -6 || y > 6) {
            continue;
          }
          
          // Map x from [-6,6] to canvas coordinates
          const canvasX = padding + ((x + 6) / 12) * plotWidth;
          
          // Map y from [-6,6] to canvas coordinates - FIXED to match drawTransformationFunction
          const canvasY = canvasHeight - padding - ((y + 6) / 12) * plotHeight;
          
          // Draw a small circle
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        ctx.globalAlpha = 1.0;
      }

    // PDF functions for different distributions
    
    // Normal distribution PDF
    function normalPDF(x, mean, std) {
      const factor = 1 / (std * Math.sqrt(2 * Math.PI));
      const exponent = -0.5 * Math.pow((x - mean) / std, 2);
      return factor * Math.exp(exponent);
    }
    
    // Uniform distribution PDF
    function uniformPDF(x, min, max) {
      if (x >= min && x <= max) {
        return 1 / (max - min);
      }
      return 0;
    }
    
    // Exponential distribution PDF
    function exponentialPDF(x, rate) {
      if (x >= 0) {
        return rate * Math.exp(-rate * x);
      }
      return 0;
    }
    
    // Beta distribution PDF
    function betaPDF(x, alpha, beta) {
      if (x < 0 || x > 1) {
        return 0;
      }
      
      // Compute Beta function factor
      const betaFunction = factorial(alpha - 1) * factorial(beta - 1) / factorial(alpha + beta - 1);
      
      return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1) / betaFunction;
    }
    
    // Gamma distribution PDF
    function gammaPDF(x, shape, scale) {
      if (x < 0) {
        return 0;
      }
      
      const factor = 1 / (Math.pow(scale, shape) * factorial(shape - 1));
      return factor * Math.pow(x, shape - 1) * Math.exp(-x / scale);
    }
    
    // Factorial approximation for gamma and beta distributions
    function factorial(n) {
      if (n < 0) {
        return 1;
      }
      
      if (n < 1) {
        return 1;
      }
      
      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }
      return result;
    }
    
    // Random number generators for different distributions
    
    // Random normal (Box-Muller transform)
    function randomNormal(mean, std) {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return mean + std * z;
    }
    
    // Random uniform
    function randomUniform(min, max) {
      return min + Math.random() * (max - min);
    }
    
    // Random exponential
    function randomExponential(rate) {
      return -Math.log(1 - Math.random()) / rate;
    }
    
    // Random beta (approximation)
    function randomBeta(alpha, beta) {
      // Naive approximation: use normal with matching mean and scaled variance
      const mean = alpha / (alpha + beta);
      const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
      
      // Generate a normal random variable and squish it to [0,1]
      let value = randomNormal(mean, Math.sqrt(variance));
      return Math.max(0, Math.min(1, value));
    }
    
    // Random gamma (approximation)
    function randomGamma(shape, scale) {
      // For integer shape, sum of exponentials
      if (Math.abs(shape - Math.round(shape)) < 0.0001 && shape > 0) {
        let result = 0;
        for (let i = 0; i < shape; i++) {
          result += randomExponential(1);
        }
        return result * scale;
      }
      
      // Otherwise use approximation with normal
      const mean = shape * scale;
      const variance = shape * scale * scale;
      
      // Generate a normal random variable and ensure it's positive
      let value = randomNormal(mean, Math.sqrt(variance));
      return Math.max(0, value);
    }
    
    // Initialize the visualization
    initialize();
  });