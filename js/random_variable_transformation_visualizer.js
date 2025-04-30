// monte_carlo_visualizer.js
// A visualizer for Monte Carlo approximation of credible intervals

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
              <select id="distribution-type" class="full-width">
                <option value="normal">Normal Distribution</option>
                <option value="gamma">Gamma Distribution</option>
                <option value="beta">Beta Distribution</option>
                <option value="bimodal">Bimodal Distribution</option>
              </select>
            </label>
          </div>
          <div class="instruction">Visualizing Monte Carlo approximation of credible intervals</div>
          <div id="canvas-wrapper">
            <canvas id="monte-carlo-canvas" width="800" height="500"></canvas>
          </div>
          <div class="legend">
            <div class="legend-item"><span class="legend-color true"></span> True Distribution</div>
            <div class="legend-item"><span class="legend-color samples"></span> Monte Carlo Samples</div>
            <div class="legend-item"><span class="legend-color credible"></span> Credible Interval</div>
          </div>
        </div>
        
        <div class="controls-panel">
          <div class="control-group">
            <label for="sample-size">Number of Samples:</label>
            <input type="range" id="sample-size" min="10" max="10000" step="10" value="1000" class="full-width">
            <span id="sample-size-value">1000</span>
          </div>
          
          <div class="control-group">
            <label for="credible-interval">Credible Interval (%):</label>
            <input type="range" id="credible-interval" min="50" max="99" step="1" value="95" class="full-width">
            <span id="credible-interval-value">95%</span>
          </div>
          
          <div class="control-group" id="normal-params">
            <label>Normal Distribution Parameters:</label>
            <div class="param-inputs">
              <div class="param-input">
                <label>Mean (μ):</label>
                <input type="number" id="normal-mean" value="0" step="0.1" class="param-field">
              </div>
              <div class="param-input">
                <label>Std Dev (σ):</label>
                <input type="number" id="normal-std" value="1" min="0.1" step="0.1" class="param-field">
              </div>
            </div>
          </div>
          
          <div class="control-group" id="gamma-params" style="display: none;">
            <label>Gamma Distribution Parameters:</label>
            <div class="param-inputs">
              <div class="param-input">
                <label>Shape (α):</label>
                <input type="number" id="gamma-shape" value="2" min="0.1" step="0.1" class="param-field">
              </div>
              <div class="param-input">
                <label>Rate (β):</label>
                <input type="number" id="gamma-rate" value="1" min="0.1" step="0.1" class="param-field">
              </div>
            </div>
          </div>
          
          <div class="control-group" id="beta-params" style="display: none;">
            <label>Beta Distribution Parameters:</label>
            <div class="param-inputs">
              <div class="param-input">
                <label>Alpha (α):</label>
                <input type="number" id="beta-alpha" value="2" min="0.1" step="0.1" class="param-field">
              </div>
              <div class="param-input">
                <label>Beta (β):</label>
                <input type="number" id="beta-beta" value="5" min="0.1" step="0.1" class="param-field">
              </div>
            </div>
          </div>
          
          <div class="control-group" id="bimodal-params" style="display: none;">
            <label>Bimodal Distribution Parameters:</label>
            <div class="param-inputs">
              <div class="param-input">
                <label>Mean 1:</label>
                <input type="number" id="bimodal-mean1" value="-2" step="0.1" class="param-field">
              </div>
              <div class="param-input">
                <label>Mean 2:</label>
                <input type="number" id="bimodal-mean2" value="2" step="0.1" class="param-field">
              </div>
              <div class="param-input">
                <label>Std Dev:</label>
                <input type="number" id="bimodal-std" value="1" min="0.1" step="0.1" class="param-field">
              </div>
              <div class="param-input">
                <label>Weight:</label>
                <input type="number" id="bimodal-weight" value="0.5" min="0" max="1" step="0.1" class="param-field">
              </div>
            </div>
          </div>
          
          <div class="results-box">
            <h3>Monte Carlo Results:</h3>
            <div class="result-row">
              <div class="result-label">Credible Interval:</div>
              <div class="result-value" id="result-ci">[0.000, 0.000]</div>
            </div>
            <div class="result-row">
              <div class="result-label">Theoretical CI:</div>
              <div class="result-value" id="result-theoretical">[0.000, 0.000]</div>
            </div>
            <div class="result-row">
              <div class="result-label">Approximation Error:</div>
              <div class="result-value" id="result-error">0.000</div>
            </div>
          </div>
          
          <button id="resample-btn" class="primary-btn">Generate New Samples</button>
          
          <div class="explanation-container">
            <h3>How Monte Carlo Approximation Works</h3>
            <p>Monte Carlo approximation estimates credible intervals by:</p>
            <ol>
              <li>Drawing many random samples from the posterior distribution</li>
              <li>Sorting the samples in ascending order</li>
              <li>Finding the appropriate quantiles (e.g., 2.5% and 97.5% for a 95% interval)</li>
            </ol>
            <p>As the number of samples increases, the Monte Carlo approximation becomes more accurate.</p>
            <p>The formula used is:<br>
            <code>l ≈ θ<sup>(⌈S×α/2⌉)</sup>, u ≈ θ<sup>(⌈S×(1-α/2)⌉)</sup></code></p>
            <p>Where <code>S</code> is the number of samples and <code>α</code> is the significance level.</p>
          </div>
          
          <div class="explanation-container" style="margin-top: 15px;">
            <h3>Why Monte Carlo Methods Are Important</h3>
            <p>The bimodal distribution (a mixture of two normal distributions) represents an important case where:</p>
            <ul>
              <li>The distribution has complex shape with two distinct peaks</li>
              <li>Theoretical credible intervals cannot be easily derived analytically</li>
              <li>Monte Carlo methods provide a practical numerical solution</li>
            </ul>
            <p>For distributions like normal, gamma, and beta, theoretical credible intervals can be calculated using their known quantile functions. However, for multimodal distributions like our bimodal example, Monte Carlo methods become essential as analytical solutions are either extremely complex or unavailable.</p>
            <p>This demonstrates why Monte Carlo methods are so powerful in Bayesian statistics—they can handle arbitrary posterior distributions regardless of complexity.</p>
          </div>
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
    
    #monte-carlo-canvas {
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
    
    .param-inputs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
    }
    
    .param-field {
      width: 80px;
      padding: 5px;
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
    
    .legend-color.true {
      background-color: #3498db;
    }
    
    .legend-color.samples {
      background-color: #95a5a6;
    }
    
    .legend-color.credible {
      background-color: #e74c3c;
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
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .result-label {
      font-weight: bold;
    }
    
    .result-value {
      font-family: monospace;
    }
    
    .explanation-container {
      background-color: #f4f8f9;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #3498db;
      margin-top: 20px;
    }
    
    .explanation-container h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 1rem;
    }
    
    .explanation-container p, .explanation-container ol {
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .explanation-container code {
      background-color: #f1f1f1;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
    }
  `;
  
  document.head.appendChild(styleElement);
  
  // Get DOM elements
  const canvas = document.getElementById('monte-carlo-canvas');
  const ctx = canvas.getContext('2d');
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Control elements
  const distributionSelect = document.getElementById('distribution-type');
  const sampleSizeInput = document.getElementById('sample-size');
  const sampleSizeValue = document.getElementById('sample-size-value');
  const credibleIntervalInput = document.getElementById('credible-interval');
  const credibleIntervalValue = document.getElementById('credible-interval-value');
  const resampleBtn = document.getElementById('resample-btn');
  
  // Parameter controls
  const normalParams = document.getElementById('normal-params');
  const gammaParams = document.getElementById('gamma-params');
  const betaParams = document.getElementById('beta-params');
  const bimodalParams = document.getElementById('bimodal-params');
  
  // Normal distribution parameters
  const normalMean = document.getElementById('normal-mean');
  const normalStd = document.getElementById('normal-std');
  
  // Gamma distribution parameters
  const gammaShape = document.getElementById('gamma-shape');
  const gammaRate = document.getElementById('gamma-rate');
  
  // Beta distribution parameters
  const betaAlpha = document.getElementById('beta-alpha');
  const betaBeta = document.getElementById('beta-beta');
  
  // Bimodal distribution parameters
  const bimodalMean1 = document.getElementById('bimodal-mean1');
  const bimodalMean2 = document.getElementById('bimodal-mean2');
  const bimodalStd = document.getElementById('bimodal-std');
  const bimodalWeight = document.getElementById('bimodal-weight');
  
  // Result elements
  const resultCI = document.getElementById('result-ci');
  const resultTheoretical = document.getElementById('result-theoretical');
  const resultError = document.getElementById('result-error');
  
  // State variables
  let samples = [];
  let distType = 'normal';
  let sampleSize = 1000;
  let credibleInterval = 0.95; // 95% by default
  
  // Drawing settings
  const plotMargin = 50;
  const plotWidth = canvasWidth - 2 * plotMargin;
  const plotHeight = canvasHeight - 2 * plotMargin;
  
  // Distribution functions
  function normalPDF(x, mean, std) {
    return jStat.normal.pdf(x, mean, std);
  }  
  
  function gammaPDF(x, shape, rate) {
    return jStat.gamma.pdf(x, shape, 1/rate);
  }
  
  
  function betaPDF(x, alpha, beta) {
    return jStat.beta.pdf(x, alpha, beta);
  }
  
  
  function bimodalPDF(x, mean1, mean2, std, weight) {
    const pdf1 = normalPDF(x, mean1, std);
    const pdf2 = normalPDF(x, mean2, std);
    return weight * pdf1 + (1 - weight) * pdf2;
  }
  
  // Random number generation from distributions
  
  function generateNormalSample(mean, std) {
    return jStat.normal.sample(mean, std);
  }
  
  function generateGammaSample(shape, rate) {
    return jStat.gamma.sample(shape, 1 / rate);
  }
  
  function generateBetaSample(alpha, beta) {
    return jStat.beta.sample(alpha, beta);
  }

  function generateBimodalSample(mean1, mean2, std, weight) {
    if (Math.random() < weight) {
      return jStat.normal.sample(mean1, std);
    } else {
      return jStat.normal.sample(mean2, std);
    }
  }
  
  // Function to generate samples based on the current distribution
  function generateSamples() {
    samples = [];
    
    for (let i = 0; i < sampleSize; i++) {
      let sample;
      
      switch (distType) {
        case 'normal':
          sample = generateNormalSample(
            parseFloat(normalMean.value),
            parseFloat(normalStd.value)
          );
          break;
        
        case 'gamma':
          sample = generateGammaSample(
            parseFloat(gammaShape.value),
            parseFloat(gammaRate.value)
          );
          break;
        
        case 'beta':
          sample = generateBetaSample(
            parseFloat(betaAlpha.value),
            parseFloat(betaBeta.value)
          );
          break;
        
        case 'bimodal':
          sample = generateBimodalSample(
            parseFloat(bimodalMean1.value),
            parseFloat(bimodalMean2.value),
            parseFloat(bimodalStd.value),
            parseFloat(bimodalWeight.value)
          );
          break;
      }
      
      samples.push(sample);
    }
    
    // Sort the samples for Monte Carlo approximation
    samples.sort((a, b) => a - b);
    
    // Calculate the credible interval
    calculateCredibleInterval();
  }
  
  // Calculate the credible interval from the samples
  function calculateCredibleInterval() {
    const alpha = 1 - credibleInterval;
    
    // Calculate indices for the credible interval boundaries
    const lowerIndex = Math.ceil(sampleSize * (alpha / 2));
    const upperIndex = Math.ceil(sampleSize * (1 - alpha / 2)) - 1;
    
    // Get the Monte Carlo approximated credible interval
    const lower = samples[lowerIndex];
    const upper = samples[upperIndex];
    
    // Calculate theoretical credible interval
    let theoreticalLower, theoreticalUpper;
    let error = 0;
    
    try {
      switch (distType) {
        case 'normal':
          const mean = parseFloat(normalMean.value);
          const std = parseFloat(normalStd.value);
          
          // Use direct quantile function instead of z-score
          theoreticalLower = normalQuantile(alpha / 2, mean, std);
          theoreticalUpper = normalQuantile(1 - alpha / 2, mean, std);
          
          // Calculate error as average percentage difference
          const lowerError = Math.abs((lower - theoreticalLower) / Math.abs(theoreticalLower));
          const upperError = Math.abs((upper - theoreticalUpper) / Math.abs(theoreticalUpper));
          error = ((lowerError + upperError) / 2) * 100;
          break;
          
        case 'gamma':
          const shape = parseFloat(gammaShape.value);
          const rate = parseFloat(gammaRate.value);
          
          // Use improved gamma quantile function
          theoreticalLower = gammaQuantile(alpha / 2, shape, rate);
          theoreticalUpper = gammaQuantile(1 - alpha / 2, shape, rate);
          
          // Calculate error with proper error checking
          if (theoreticalLower !== 0 && !isNaN(theoreticalLower) && isFinite(theoreticalLower) &&
              theoreticalUpper !== 0 && !isNaN(theoreticalUpper) && isFinite(theoreticalUpper)) {
              
            const gammaLowerError = Math.abs((lower - theoreticalLower) / Math.abs(theoreticalLower));
            const gammaUpperError = Math.abs((upper - theoreticalUpper) / Math.abs(theoreticalUpper));
            error = ((gammaLowerError + gammaUpperError) / 2) * 100;
            
            // Clip very large errors to 100% for display
            if (error > 100) error = 100;
          } else {
            error = "Calculation issue";
          }
          break;
          
        case 'beta':
          const betaA = parseFloat(betaAlpha.value);
          const betaB = parseFloat(betaBeta.value);
          
          // Use improved beta quantile function
          theoreticalLower = betaQuantile(alpha / 2, betaA, betaB);
          theoreticalUpper = betaQuantile(1 - alpha / 2, betaA, betaB);
          
          // Calculate error with proper error checking
          if (theoreticalLower !== 0 && !isNaN(theoreticalLower) && isFinite(theoreticalLower) &&
              theoreticalUpper !== 0 && !isNaN(theoreticalUpper) && isFinite(theoreticalUpper)) {
              
            const betaLowerError = Math.abs((lower - theoreticalLower) / Math.abs(theoreticalLower));
            const betaUpperError = Math.abs((upper - theoreticalUpper) / Math.abs(theoreticalUpper));
            error = ((betaLowerError + betaUpperError) / 2) * 100;
            
            // Clip very large errors to 100% for display
            if (error > 100) error = 100;
          } else {
            error = "Calculation issue";
          }
          break;
          
          case 'bimodal':
            // Use the empirical values from Monte Carlo sampling
            theoreticalLower = lower;
            theoreticalUpper = upper;
            error = "Monte Carlo estimate"; 
          break;
          
      }
    } catch (e) {
      // Handle any errors in the calculations
      console.error("Error calculating theoretical CI:", e);
      theoreticalLower = "Error";
      theoreticalUpper = "Error";
      error = "Calculation error";
    }
    
    // Update the result display
    resultCI.textContent = `[${lower.toFixed(3)}, ${upper.toFixed(3)}]`;
    
    if (typeof theoreticalLower === 'number' && !isNaN(theoreticalLower) && isFinite(theoreticalLower) &&
        typeof theoreticalUpper === 'number' && !isNaN(theoreticalUpper) && isFinite(theoreticalUpper)) {
      resultTheoretical.textContent = `[${theoreticalLower.toFixed(3)}, ${theoreticalUpper.toFixed(3)}]`;
      
      if (typeof error === 'number') {
        resultError.textContent = `${error.toFixed(2)}%`;
      } else {
        resultError.textContent = error;
      }
    } else {
      resultTheoretical.textContent = `[${theoreticalLower}, ${theoreticalUpper}]`;
      resultError.textContent = error;
    }
    
    // Draw the canvas with updated credible interval
    drawCanvas();
  }
  
  // normal quantile function
  function normalQuantile(p, mean, std) {
    return jStat.normal.inv(p, mean, std);
  }

  // gamma quantile function
  function gammaQuantile(p, shape, rate) {
    return jStat.gamma.inv(p, shape, 1/rate);
  }
  
  // beta quantile function
  function betaQuantile(p, alpha, beta) {
    return jStat.beta.inv(p, alpha, beta);
  }
  
  
  // Function to draw the canvas
  function drawCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw coordinate axes
    drawAxes();
    
    // Calculate display range based on samples
    const xRange = calculateRange();
    
    // Draw true distribution
    drawDistribution(xRange);
    
    // Draw histogram of samples
    drawHistogram(xRange);
    
    // Draw credible interval markers
    drawCredibleInterval(xRange);
  }
  
  // Calculate appropriate display range based on the samples
  function calculateRange() {
    if (samples.length === 0) {
      // Default range if no samples yet
      return { min: -5, max: 5 };
    }
    
    const padding = 0.1; // 10% padding on each side
    
    // Different default ranges for different distributions
    let min, max;
    
    switch (distType) {
      case 'normal':
        const mean = parseFloat(normalMean.value);
        const std = parseFloat(normalStd.value);
        min = mean - 4 * std;
        max = mean + 4 * std;
        break;
      
      case 'gamma':
        min = 0;
        max = Math.max(10, samples[samples.length - 1] * 1.2);
        break;
      
      case 'beta':
        min = 0;
        max = 1;
        break;
      
      case 'bimodal':
        const mean1 = parseFloat(bimodalMean1.value);
        const mean2 = parseFloat(bimodalMean2.value);
        std = parseFloat(bimodalStd.value);
        min = Math.min(mean1, mean2) - 4 * std;
        max = Math.max(mean1, mean2) + 4 * std;
        break;
    }
    
    // Ensure min-max includes all samples with padding
    min = Math.min(min, samples[0] - Math.abs(samples[0] * padding));
    max = Math.max(max, samples[samples.length - 1] + Math.abs(samples[samples.length - 1] * padding));
    
    return { min, max };
  }
  
  // Draw coordinate axes
  function drawAxes() {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(plotMargin, canvasHeight - plotMargin);
    ctx.lineTo(canvasWidth - plotMargin, canvasHeight - plotMargin);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(plotMargin, plotMargin);
    ctx.lineTo(plotMargin, canvasHeight - plotMargin);
    ctx.stroke();
    
    // X-axis label
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('θ (Parameter Value)', canvasWidth / 2, canvasHeight - 10);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Density', 0, 0);
    ctx.restore();
  }
  
  // Draw the true distribution
  function drawDistribution(xRange) {
    const { min, max } = xRange;
    const step = (max - min) / 200;
    
    let maxDensity = 0;
    const points = [];
    
    // Calculate points for the distribution curve
    for (let x = min; x <= max; x += step) {
      let density;
      
      switch (distType) {
        case 'normal':
          density = normalPDF(
            x, 
            parseFloat(normalMean.value), 
            parseFloat(normalStd.value)
          );
          break;
        
        case 'gamma':
          density = gammaPDF(
            x, 
            parseFloat(gammaShape.value),
            parseFloat(gammaRate.value)
          );
          break;
        
        case 'beta':
          density = betaPDF(
            x, 
            parseFloat(betaAlpha.value),
            parseFloat(betaBeta.value)
          );
          break;
        
        case 'bimodal':
          density = bimodalPDF(
            x, 
            parseFloat(bimodalMean1.value),
            parseFloat(bimodalMean2.value),
            parseFloat(bimodalStd.value),
            parseFloat(bimodalWeight.value)
          );
          break;
      }
      
      maxDensity = Math.max(maxDensity, density);
      points.push({ x, density });
    }
    
    // Scale points and draw the curve
    const xScale = plotWidth / (max - min);
    const yScale = plotHeight / maxDensity;
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    points.forEach((point, i) => {
      const canvasX = plotMargin + (point.x - min) * xScale;
      const canvasY = canvasHeight - plotMargin - point.density * yScale;
      
      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    });
    
    ctx.stroke();
  }
  
  // Draw a histogram of the samples
  function drawHistogram(xRange) {
    const { min, max } = xRange;
    const numBins = Math.min(50, Math.ceil(Math.sqrt(sampleSize)));
    const binWidth = (max - min) / numBins;
    
    const bins = new Array(numBins).fill(0);
    
    // Count samples into bins
    samples.forEach(sample => {
      const binIndex = Math.floor((sample - min) / binWidth);
      if (binIndex >= 0 && binIndex < numBins) {
        bins[binIndex]++;
      }
    });
    
    const maxCount = Math.max(...bins);
    
    // Draw the histogram
    ctx.fillStyle = 'rgba(149, 165, 166, 0.5)';
    
    for (let i = 0; i < numBins; i++) {
      const height = (bins[i] / maxCount) * plotHeight * 0.8; // Scale height to 80% of plot height
      
      const x = plotMargin + i * (plotWidth / numBins);
      const y = canvasHeight - plotMargin - height;
      const width = plotWidth / numBins - 1;
      
      ctx.fillRect(x, y, width, height);
    }
  }
  
  // Draw the credible interval markers
  function drawCredibleInterval(xRange) {
    const { min, max } = xRange;
    const alpha = 1 - credibleInterval;
    
    // Calculate indices for the credible interval boundaries
    const lowerIndex = Math.ceil(sampleSize * (alpha / 2));
    const upperIndex = Math.ceil(sampleSize * (1 - alpha / 2)) - 1;
    
    if (lowerIndex >= samples.length || upperIndex >= samples.length) return;
    
    // Get the Monte Carlo approximated credible interval
    const lower = samples[lowerIndex];
    const upper = samples[upperIndex];
    
    // Convert to canvas coordinates
    const xScale = plotWidth / (max - min);
    const lowerX = plotMargin + (lower - min) * xScale;
    const upperX = plotMargin + (upper - min) * xScale;
    
    // Draw vertical lines for the credible interval boundaries
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Lower bound
    ctx.beginPath();
    ctx.moveTo(lowerX, plotMargin);
    ctx.lineTo(lowerX, canvasHeight - plotMargin);
    ctx.stroke();
    
    // Upper bound
    ctx.beginPath();
    ctx.moveTo(upperX, plotMargin);
    ctx.lineTo(upperX, canvasHeight - plotMargin);
    ctx.stroke();
    
    // Reset line dash
    ctx.setLineDash([]);
    
    // Draw shaded area between the boundaries
    ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
    ctx.fillRect(lowerX, plotMargin, upperX - lowerX, plotHeight);
    
    // Add labels for the boundaries
    ctx.fillStyle = '#e74c3c';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    ctx.fillText(lower.toFixed(2), lowerX, canvasHeight - plotMargin + 20);
    ctx.fillText(upper.toFixed(2), upperX, canvasHeight - plotMargin + 20);
    
    // Add credible interval percentage label
    ctx.font = '14px Arial';
    ctx.fillText(`${Math.round(credibleInterval * 100)}% Credible Interval`, (lowerX + upperX) / 2, plotMargin - 10);
  }
  
  // Handle distribution type change
  function handleDistributionChange() {
    distType = distributionSelect.value;
    
    // Show/hide relevant parameter controls
    normalParams.style.display = distType === 'normal' ? 'block' : 'none';
    gammaParams.style.display = distType === 'gamma' ? 'block' : 'none';
    betaParams.style.display = distType === 'beta' ? 'block' : 'none';
    bimodalParams.style.display = distType === 'bimodal' ? 'block' : 'none';
    
    // Generate new samples
    generateSamples();
  }
  
  // Handle sample size change
  function handleSampleSizeChange() {
    sampleSize = parseInt(sampleSizeInput.value);
    sampleSizeValue.textContent = sampleSize.toLocaleString();
    
    // Generate new samples
    generateSamples();
  }
  
  // Handle credible interval change
  function handleCredibleIntervalChange() {
    credibleInterval = parseInt(credibleIntervalInput.value) / 100;
    credibleIntervalValue.textContent = `${credibleIntervalInput.value}%`;
    
    // Recalculate credible interval with existing samples
    calculateCredibleInterval();
  }
  
  // Handle parameter changes
  function handleParameterChange() {
    // Generate new samples when parameters change
    generateSamples();
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
  
  // Add event listeners
  distributionSelect.addEventListener('change', handleDistributionChange);
  sampleSizeInput.addEventListener('input', handleSampleSizeChange);
  credibleIntervalInput.addEventListener('input', handleCredibleIntervalChange);
  resampleBtn.addEventListener('click', generateSamples);
  
  // Add parameter input change listeners
  document.querySelectorAll('.param-field').forEach(input => {
    input.addEventListener('change', handleParameterChange);
  });
  
  window.addEventListener('resize', handleResize);
  
  // Initialize the visualization
  generateSamples();
  handleResize();
  
  // Add some explanatory text to complement the course material
  const explanationText = document.createElement('div');
  explanationText.className = 'explanation-box';
  explanationText.innerHTML = `
    <p>This interactive demo demonstrates the Monte Carlo approximation technique for finding credible intervals in Bayesian statistics.</p>
    <p>The key formula is: l ≈ θ<sup>(⌈S×α/2⌉)</sup>, u ≈ θ<sup>(⌈S×(1-α/2)⌉)</sup></p>
    <p>where l is the lower bound, u is the upper bound, S is the number of samples, and α is the significance level (e.g., 0.05 for a 95% credible interval).</p>
    <p>As the number of samples increases, you'll notice the Monte Carlo approximation converges toward the theoretical value for distributions where it's known.</p>
  `;
  
  container.appendChild(explanationText);
});