
// A vanilla JavaScript implementation of the Gamma & Beta Distribution Visualizer

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('gamma-beta-visualizer');
    
    if (!container) {
      console.error('Container element not found!');
      return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="visualizer-container">
        <div class="controls-panel">
          <div class="distribution-selector">
            <label>Select Distribution:</label>
            <div class="toggle-distribution">
              <button id="gamma-btn" class="distribution-btn active">Gamma Distribution</button>
              <button id="beta-btn" class="distribution-btn">Beta Distribution</button>
            </div>
          </div>
          
          <div id="gamma-controls" class="parameter-controls">
            <h3>Gamma Distribution Parameters</h3>
            <div class="parameter-group">
              <label for="gamma-alpha">Shape parameter (α):</label>
              <input type="range" id="gamma-alpha" min="0.1" max="10" step="0.1" value="2">
              <span class="parameter-value" id="gamma-alpha-value">2.0</span>
            </div>
            
            <div class="parameter-group">
              <label for="gamma-beta">Rate parameter (β):</label>
              <input type="range" id="gamma-beta" min="0.1" max="5" step="0.1" value="1">
              <span class="parameter-value" id="gamma-beta-value">1.0</span>
            </div>
            
            <div class="distribution-properties">
              <div class="property">
                <span class="property-label">Mean:</span>
                <span class="property-value" id="gamma-mean">2.0</span>
              </div>
              <div class="property">
                <span class="property-label">Variance:</span>
                <span class="property-value" id="gamma-variance">2.0</span>
              </div>
            </div>
          </div>
          
          <div id="beta-controls" class="parameter-controls" style="display: none;">
            <h3>Beta Distribution Parameters</h3>
            <div class="parameter-group">
              <label for="beta-alpha">Parameter (α):</label>
              <input type="range" id="beta-alpha" min="0.1" max="10" step="0.1" value="2">
              <span class="parameter-value" id="beta-alpha-value">2.0</span>
            </div>
            
            <div class="parameter-group">
              <label for="beta-beta">Parameter (β):</label>
              <input type="range" id="beta-beta" min="0.1" max="10" step="0.1" value="2">
              <span class="parameter-value" id="beta-beta-value">2.0</span>
            </div>
            
            <div class="distribution-properties">
              <div class="property">
                <span class="property-label">Mean:</span>
                <span class="property-value" id="beta-mean">0.5</span>
              </div>
              <div class="property">
                <span class="property-label">Variance:</span>
                <span class="property-value" id="beta-variance">0.05</span>
              </div>
            </div>
          </div>
          
          <div class="special-cases">
            <h3>Special Cases</h3>
            <div id="gamma-special-cases">
              <button class="special-case-btn" data-alpha="1" data-beta="1">Exponential (α=1)</button>
              <button class="special-case-btn" data-alpha="2" data-beta="0.5">Chi-Squared (df=4)</button>
              <button class="special-case-btn" data-alpha="9" data-beta="2">Erlang (k=9, λ=2)</button>
            </div>
            
            <div id="beta-special-cases" style="display: none;">
              <button class="special-case-btn" data-alpha="1" data-beta="1">Uniform (α=1, β=1)</button>
              <button class="special-case-btn" data-alpha="0.5" data-beta="0.5">Arcsine (α=0.5, β=0.5)</button>
              <button class="special-case-btn" data-alpha="2" data-beta="5">Asymmetric (α=2, β=5)</button>
            </div>
          </div>
        </div>
        
        <div class="visualization-panel">
          <canvas id="distribution-canvas" width="600" height="400"></canvas>
          <div class="chart-labels">
            <div class="x-label">x</div>
            <div class="y-label">f(x)</div>
          </div>
          <div class="pdf-formula" id="gamma-formula">
            <span>PDF: f(x) = </span>
            <span class="formula-content">
              β<sup>α</sup> / Γ(α) · x<sup>α-1</sup>e<sup>-βx</sup>, x ≥ 0
            </span>
          </div>
          <div class="pdf-formula" id="beta-formula" style="display: none;">
            <span>PDF: f(x) = </span>
            <span class="formula-content">
              1 / B(α,β) · x<sup>α-1</sup>(1-x)<sup>β-1</sup>, x ∈ [0,1]
            </span>
          </div>
        </div>
      </div>
      
      <div class="explanation-section">
        <h3>Key Properties</h3>
        <div id="gamma-explanation">
          <ul>
            <li>The <strong>Gamma distribution</strong> models continuous positive random variables.</li>
            <li>The parameter α controls the shape of the distribution. Increasing α shifts the distribution right and makes it more symmetric.</li>
            <li>The parameter β is the rate parameter. Increasing β compresses the distribution horizontally.</li>
            <li>Special cases include:
              <ul>
                <li>Exponential distribution when α = 1</li>
                <li>Chi-squared distribution when α = k/2 and β = 1/2 (k is degrees of freedom)</li>
                <li>Erlang distribution when α is a positive integer</li>
              </ul>
            </li>
          </ul>
        </div>
        
        <div id="beta-explanation" style="display: none;">
          <ul>
            <li>The <strong>Beta distribution</strong> models random variables constrained to the interval [0, 1].</li>
            <li>Parameters α and β control the shape of the distribution. The distribution becomes more concentrated as either parameter increases.</li>
            <li>When α = β = 1, it becomes the uniform distribution.</li>
            <li>When α = β, the distribution is symmetric about 0.5.</li>
            <li>When α < 1 and β < 1, the distribution is U-shaped.</li>
          </ul>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .visualizer-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      @media (min-width: 992px) {
        .visualizer-container {
          flex-direction: row;
        }
        
        .controls-panel {
          flex: 1;
        }
        
        .visualization-panel {
          flex: 2;
        }
      }
      
      .controls-panel {
        background-color: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .distribution-selector {
        margin-bottom: 20px;
      }
      
      .toggle-distribution {
        display: flex;
        margin-top: 8px;
      }
      
      .distribution-btn {
        flex: 1;
        padding: 10px;
        background-color: #e9ecef;
        border: 1px solid #ced4da;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      .distribution-btn:first-child {
        border-radius: 4px 0 0 4px;
      }
      
      .distribution-btn:last-child {
        border-radius: 0 4px 4px 0;
      }
      
      .distribution-btn.active {
        background-color: #3498db;
        color: white;
        border-color: #3498db;
      }
      
      .parameter-controls {
        margin-bottom: 20px;
      }
      
      .parameter-controls h3 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 1.1rem;
        color: #333;
      }
      
      .parameter-group {
        margin-bottom: 16px;
      }
      
      .parameter-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .parameter-group input[type="range"] {
        width: 100%;
        margin-bottom: 8px;
      }
      
      .parameter-value {
        font-weight: 600;
        color: #3498db;
      }
      
      .distribution-properties {
        background-color: white;
        padding: 12px;
        border-radius: 4px;
        margin-top: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .property {
        display: flex;
        gap: 8px;
      }
      
      .property-label {
        font-weight: 500;
      }
      
      .property-value {
        color: #333;
      }
      
      .special-cases {
        margin-top: 20px;
      }
      
      .special-cases h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 1.1rem;
        color: #333;
      }
      
      .special-case-btn {
        margin-right: 8px;
        margin-bottom: 8px;
        padding: 8px 12px;
        background-color: #f0f7ff;
        border: 1px solid #d0e0f0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .special-case-btn:hover {
        background-color: #e1effe;
      }
      
      .visualization-panel {
        position: relative;
      }
      
      #distribution-canvas {
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        max-width: 100%;
        height: auto;
      }
      
      .chart-labels {
        position: relative;
        height: 20px;  /* Add some height to ensure labels have space */
        margin-top: 10px;  /* Add space between canvas and labels */
      }
      
      .x-label {
        position: absolute;
        bottom: -30px;  /* Changed from -40px to -30px */
        left: 50%;      /* Center the label */
        transform: translateX(-50%);  /* Center the label precisely */
        font-weight: 500;
        }
      
      .y-label {
        position: absolute;
        left: -30px;
        top: -220px;
        transform: rotate(-90deg);
        font-weight: 500;
      }
      
      .pdf-formula {
        margin-top: 20px;
        padding: 12px;
        background-color: #f5f5f5;
        border-radius: 4px;
        border-left: 4px solid #3498db;
        font-family: 'Times New Roman', serif;
      }
      
      .formula-content {
        font-size: 1.1rem;
      }
      
      .explanation-section {
        margin-top: 30px;
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #3498db;
      }
      
      .explanation-section h3 {
        margin-top: 0;
        margin-bottom: 16px;
        color: #333;
      }
      
      .explanation-section ul {
        padding-left: 20px;
        margin-bottom: 0;
      }
      
      .explanation-section li {
        margin-bottom: 8px;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Get DOM elements
    const gammaBtn = document.getElementById('gamma-btn');
    const betaBtn = document.getElementById('beta-btn');
    
    const gammaControls = document.getElementById('gamma-controls');
    const betaControls = document.getElementById('beta-controls');
    
    const gammaSpecialCases = document.getElementById('gamma-special-cases');
    const betaSpecialCases = document.getElementById('beta-special-cases');
    
    const gammaFormula = document.getElementById('gamma-formula');
    const betaFormula = document.getElementById('beta-formula');
    
    const gammaExplanation = document.getElementById('gamma-explanation');
    const betaExplanation = document.getElementById('beta-explanation');
    
    const gammaAlphaSlider = document.getElementById('gamma-alpha');
    const gammaBetaSlider = document.getElementById('gamma-beta');
    const gammaAlphaValue = document.getElementById('gamma-alpha-value');
    const gammaBetaValue = document.getElementById('gamma-beta-value');
    
    const betaAlphaSlider = document.getElementById('beta-alpha');
    const betaBetaSlider = document.getElementById('beta-beta');
    const betaAlphaValue = document.getElementById('beta-alpha-value');
    const betaBetaValue = document.getElementById('beta-beta-value');
    
    const gammaMean = document.getElementById('gamma-mean');
    const gammaVariance = document.getElementById('gamma-variance');
    const betaMean = document.getElementById('beta-mean');
    const betaVariance = document.getElementById('beta-variance');
    
    const canvas = document.getElementById('distribution-canvas');
    const ctx = canvas.getContext('2d');
    
    // Current distribution state
    let currentDistribution = 'gamma';
    let gammaParameters = { alpha: 2, beta: 1 };
    let betaParameters = { alpha: 2, beta: 2 };
    
    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = { left: 50, right: 30, top: 30, bottom: 50 };
    
    // Drawing functions
    function drawAxes() {
      const graphWidth = canvasWidth - padding.left - padding.right;
      const graphHeight = canvasHeight - padding.top - padding.bottom;
      
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      
      // x-axis
      ctx.beginPath();
      ctx.moveTo(padding.left, canvasHeight - padding.bottom);
      ctx.lineTo(padding.left + graphWidth, canvasHeight - padding.bottom);
      ctx.stroke();
      
      // y-axis
      ctx.beginPath();
      ctx.moveTo(padding.left, canvasHeight - padding.bottom);
      ctx.lineTo(padding.left, padding.top);
      ctx.stroke();
      
      // Draw x-axis ticks and grid lines
      const xTickCount = currentDistribution === 'gamma' ? 10 : 5;
      const xMax = currentDistribution === 'gamma' ? 10 : 1;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      
      for (let i = 0; i <= xTickCount; i++) {
        const x = padding.left + (i / xTickCount) * graphWidth;
        const xValue = (i / xTickCount) * xMax;
        
        // Tick mark
        ctx.beginPath();
        ctx.moveTo(x, canvasHeight - padding.bottom);
        ctx.lineTo(x, canvasHeight - padding.bottom + 5);
        ctx.stroke();
        
        // Grid line (lighter color)
        ctx.save();
        ctx.strokeStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(x, canvasHeight - padding.bottom);
        ctx.lineTo(x, padding.top);
        ctx.stroke();
        ctx.restore();
        
        // Tick label
        ctx.fillText(xValue.toFixed(1), x, canvasHeight - padding.bottom + 10);
      }
      
      // Calculate nice y-axis scale based on max PDF value
      const maxPdfValue = getMaxPdfValue();
      const yTickCount = 5;
      const yTickStep = Math.ceil(maxPdfValue / yTickCount * 10) / 10;
      
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      for (let i = 0; i <= yTickCount; i++) {
        const yValue = i * yTickStep;
        const y = canvasHeight - padding.bottom - (yValue / (yTickStep * yTickCount)) * graphHeight;
        
        if (y < padding.top) continue;
        
        // Tick mark
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left - 5, y);
        ctx.stroke();
        
        // Grid line
        ctx.save();
        ctx.strokeStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + graphWidth, y);
        ctx.stroke();
        ctx.restore();
        
        // Tick label
        ctx.fillText(yValue.toFixed(1), padding.left - 10, y);
      }
    }
    
    function drawPdfCurve() {
      const graphWidth = canvasWidth - padding.left - padding.right;
      const graphHeight = canvasHeight - padding.top - padding.bottom;
      
      const numPoints = 200;
      const xMax = currentDistribution === 'gamma' ? 10 : 1;
      
      // Calculate y-scale based on max PDF value
      const maxPdfValue = getMaxPdfValue();
      const yScale = graphHeight / (maxPdfValue * 1.1); // Add 10% margin at the top
      
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let i = 0; i <= numPoints; i++) {
        const xValue = (i / numPoints) * xMax;
        let pdfValue;
        
        if (currentDistribution === 'gamma') {
          pdfValue = calculateGammaPdf(xValue, gammaParameters.alpha, gammaParameters.beta);
        } else {
          pdfValue = calculateBetaPdf(xValue, betaParameters.alpha, betaParameters.beta);
        }
        
        const x = padding.left + (xValue / xMax) * graphWidth;
        const y = canvasHeight - padding.bottom - pdfValue * yScale;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Fill the area under the curve
      ctx.lineTo(padding.left + graphWidth, canvasHeight - padding.bottom);
      ctx.lineTo(padding.left, canvasHeight - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
      ctx.fill();
    }
    
    function drawCanvas() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawAxes();
      drawPdfCurve();
    }
    
    // Distribution calculations
    function calculateGammaPdf(x, alpha, beta) {
      if (x <= 0) return 0;
      
      // Calculate gamma PDF: (beta^alpha * x^(alpha-1) * e^(-beta*x)) / Gamma(alpha)
      const gammaAlpha = calculateGammaFunction(alpha);
      const coef = Math.pow(beta, alpha) / gammaAlpha;
      const xTerm = Math.pow(x, alpha - 1);
      const expTerm = Math.exp(-beta * x);
      
      return coef * xTerm * expTerm;
    }
    
    function calculateBetaPdf(x, alpha, beta) {
      if (x < 0 || x > 1) return 0;
      
      // Calculate beta PDF: x^(alpha-1) * (1-x)^(beta-1) / B(alpha, beta)
      const betaFunc = calculateBetaFunction(alpha, beta);
      const xTerm = Math.pow(x, alpha - 1);
      const oneMinus = Math.pow(1 - x, beta - 1);
      
      return xTerm * oneMinus / betaFunc;
    }
    
    // Approximation of the gamma function using Stirling's formula for larger values
    // and a numerical approximation for smaller values
    function calculateGammaFunction(z) {
      if (z === 1 || z === 2) return 1; // Gamma(1) = Gamma(2) = 1
      if (z === 0.5) return Math.sqrt(Math.PI); // Gamma(0.5) = sqrt(π)
      
      // For integer values, use factorial
      if (z > 0 && Math.abs(z - Math.round(z)) < 1e-10) {
        let result = 1;
        for (let i = 1; i < z; i++) {
          result *= i;
        }
        return result;
      }
      
      // For small values, use recursion: Γ(z) = Γ(z+1) / z
      if (z < 0.5) {
        return Math.PI / (Math.sin(Math.PI * z) * calculateGammaFunction(1 - z));
      }
      
      // For other values, use Lanczos approximation
      const p = [
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
      ];
      
      const g = 7;
      z -= 1;
      let a = 0.99999999999980993;
      
      for (let i = 0; i < p.length; i++) {
        a += p[i] / (z + i + 1);
      }
      
      const t = z + g + 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * a;
    }
    
    function calculateBetaFunction(a, b) {
      // B(a,b) = Γ(a)·Γ(b) / Γ(a+b)
      return (calculateGammaFunction(a) * calculateGammaFunction(b)) / calculateGammaFunction(a + b);
    }
    
    function getMaxPdfValue() {
      // Find approximate max value of the PDF for vertical scaling
      let maxVal = 0;
      
      if (currentDistribution === 'gamma') {
        const alpha = gammaParameters.alpha;
        const beta = gammaParameters.beta;
        
        // For gamma, mode is at (alpha-1)/beta for alpha > 1, and at 0 for alpha <= 1
        let mode = alpha <= 1 ? 0.01 : (alpha - 1) / beta;
        
        // Check a range of values around the mode
        for (let x = Math.max(0.01, mode * 0.5); x <= mode * 1.5; x += 0.01) {
          const pdf = calculateGammaPdf(x, alpha, beta);
          maxVal = Math.max(maxVal, pdf);
        }
      } else {
        const alpha = betaParameters.alpha;
        const beta = betaParameters.beta;
        
        // For beta, mode is at (alpha-1)/(alpha+beta-2) for alpha,beta > 1
        let mode;
        if (alpha <= 1 && beta <= 1) {
          // Both ≤ 1, check endpoints and middle
          const vals = [0.01, 0.5, 0.99];
          for (let x of vals) {
            const pdf = calculateBetaPdf(x, alpha, beta);
            maxVal = Math.max(maxVal, pdf);
          }
        } else if (alpha <= 1) {
          // Alpha ≤ 1, mode at left endpoint
          mode = 0.01;
        } else if (beta <= 1) {
          // Beta ≤ 1, mode at right endpoint
          mode = 0.99;
        } else {
          // Both > 1, mode is at (alpha-1)/(alpha+beta-2)
          mode = (alpha - 1) / (alpha + beta - 2);
        }
        
        // Check a range of values
        for (let x = 0.01; x <= 0.99; x += 0.01) {
          const pdf = calculateBetaPdf(x, alpha, beta);
          maxVal = Math.max(maxVal, pdf);
        }
      }
      
      return maxVal;
    }
    
    // Update statistics
    function updateGammaStats() {
      const alpha = gammaParameters.alpha;
      const beta = gammaParameters.beta;
      
      // Mean = alpha / beta
      const mean = alpha / beta;
      
      // Variance = alpha / beta^2
      const variance = alpha / (beta * beta);
      
      gammaMean.textContent = mean.toFixed(3);
      gammaVariance.textContent = variance.toFixed(3);
    }
    
    function updateBetaStats() {
      const alpha = betaParameters.alpha;
      const beta = betaParameters.beta;
      
      // Mean = alpha / (alpha + beta)
      const mean = alpha / (alpha + beta);
      
      // Variance = (alpha * beta) / ((alpha + beta)^2 * (alpha + beta + 1))
      const variance = (alpha * beta) / 
                      (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
      
      betaMean.textContent = mean.toFixed(3);
      betaVariance.textContent = variance.toFixed(3);
    }
    
    // Event handlers
    function switchToGamma() {
      currentDistribution = 'gamma';
      
      // Update UI
      gammaBtn.classList.add('active');
      betaBtn.classList.remove('active');
      
      gammaControls.style.display = 'block';
      betaControls.style.display = 'none';
      
      gammaSpecialCases.style.display = 'block';
      betaSpecialCases.style.display = 'none';
      
      gammaFormula.style.display = 'block';
      betaFormula.style.display = 'none';
      
      gammaExplanation.style.display = 'block';
      betaExplanation.style.display = 'none';
      
      // Redraw
      drawCanvas();
    }
    
    function switchToBeta() {
      currentDistribution = 'beta';
      
      // Update UI
      gammaBtn.classList.remove('active');
      betaBtn.classList.add('active');
      
      gammaControls.style.display = 'none';
      betaControls.style.display = 'block';
      
      gammaSpecialCases.style.display = 'none';
      betaSpecialCases.style.display = 'block';
      
      gammaFormula.style.display = 'none';
      betaFormula.style.display = 'block';
      
      gammaExplanation.style.display = 'none';
      betaExplanation.style.display = 'block';
      
      // Redraw
      drawCanvas();
    }
    
    function handleGammaAlphaChange() {
      const value = parseFloat(gammaAlphaSlider.value);
      gammaParameters.alpha = value;
      gammaAlphaValue.textContent = value.toFixed(1);
      
      updateGammaStats();
      drawCanvas();
    }
    
    function handleGammaBetaChange() {
      const value = parseFloat(gammaBetaSlider.value);
      gammaParameters.beta = value;
      gammaBetaValue.textContent = value.toFixed(1);
      
      updateGammaStats();
      drawCanvas();
    }
    
    function handleBetaAlphaChange() {
      const value = parseFloat(betaAlphaSlider.value);
      betaParameters.alpha = value;
      betaAlphaValue.textContent = value.toFixed(1);
      
      updateBetaStats();
      drawCanvas();
    }
    
    function handleBetaBetaChange() {
      const value = parseFloat(betaBetaSlider.value);
      betaParameters.beta = value;
      betaBetaValue.textContent = value.toFixed(1);
      
      updateBetaStats();
      drawCanvas();
    }
    
    function handleSpecialCaseClick(event) {
      const button = event.target;
      if (!button.classList.contains('special-case-btn')) return;
      
      const alpha = parseFloat(button.dataset.alpha);
      const beta = parseFloat(button.dataset.beta);
      
      if (currentDistribution === 'gamma') {
        gammaParameters.alpha = alpha;
        gammaParameters.beta = beta;
        
        gammaAlphaSlider.value = alpha;
        gammaBetaSlider.value = beta;
        gammaAlphaValue.textContent = alpha.toFixed(1);
        gammaBetaValue.textContent = beta.toFixed(1);
        
        updateGammaStats();
      } else {
        betaParameters.alpha = alpha;
        betaParameters.beta = beta;
        
        betaAlphaSlider.value = alpha;
        betaBetaSlider.value = beta;
        betaAlphaValue.textContent = alpha.toFixed(1);
        betaBetaValue.textContent = beta.toFixed(1);
        
        updateBetaStats();
      }
      
      drawCanvas();
    }
    
    // Add event listeners
    gammaBtn.addEventListener('click', switchToGamma);
    betaBtn.addEventListener('click', switchToBeta);
    
    gammaAlphaSlider.addEventListener('input', handleGammaAlphaChange);
    gammaBetaSlider.addEventListener('input', handleGammaBetaChange);
    
    betaAlphaSlider.addEventListener('input', handleBetaAlphaChange);
    betaBetaSlider.addEventListener('input', handleBetaBetaChange);
    
    // Add event listeners to special case buttons
    document.querySelectorAll('.special-case-btn').forEach(button => {
      button.addEventListener('click', handleSpecialCaseClick);
    });
    
    // Handle window resize to make canvas responsive
    function handleResize() {
      const parent = canvas.parentElement;
      const ratio = canvasHeight / canvasWidth;
      const newWidth = parent.clientWidth;
      const newHeight = newWidth * ratio;
      
      canvas.style.width = newWidth + 'px';
      canvas.style.height = newHeight + 'px';
      
      drawCanvas();
    }
    
    window.addEventListener('resize', handleResize);
    
    // Initialize
    updateGammaStats();
    updateBetaStats();
    drawCanvas();
    handleResize();
  });