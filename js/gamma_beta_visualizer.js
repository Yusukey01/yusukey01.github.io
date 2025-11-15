
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
    function drawAxes(xMin, xMax) {
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
        const xTickCount = 5;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        
        for (let i = 0; i <= xTickCount; i++) {
            const x = padding.left + (i / xTickCount) * graphWidth;
            const xValue = xMin + (i / xTickCount) * (xMax - xMin);
            
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
        
        // Use fixed 0.5 increment for y-axis as requested
        const yTickStep = 0.5;
        const yTickCount = 6; 
        
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= yTickCount; i++) {
            const yValue = i * yTickStep;
            const y = canvasHeight - padding.bottom - (yValue / (yTickStep * yTickCount)) * graphHeight;
            
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
        
        // Add label indicating curve goes to infinity if we have asymptotes
        const hasLeftAsymptote = (currentDistribution === 'gamma' && gammaParameters.alpha < 1) || 
                                (currentDistribution === 'beta' && betaParameters.alpha < 1);
                                
        const hasRightAsymptote = (currentDistribution === 'beta' && betaParameters.beta < 1);
        
        if (hasLeftAsymptote || hasRightAsymptote) {
            ctx.save();
            ctx.font = 'italic 12px Arial';
            ctx.fillStyle = '#3498db';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.restore();
        }
        
        // Add x and y labels directly on the graph
        // x-axis label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('x', padding.left + graphWidth/2, canvasHeight - padding.bottom + 30);
        
        // y-axis label (f(x))
        ctx.save();
        ctx.translate(padding.left - 35, padding.top + graphHeight/2);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('f(x)', 0, 0);
        ctx.restore();
    }

    function drawPdfCurve() {
        const graphWidth = canvasWidth - padding.left - padding.right;
        const graphHeight = canvasHeight - padding.top - padding.bottom;
        
        // Get proper x-range
        let xMin, xMax;
        if (currentDistribution === 'gamma') {
            const range = getGammaXRange(gammaParameters.alpha, gammaParameters.beta);
            xMin = range.min;
            xMax = range.max;
        } else {
            xMin = 0;
            xMax = 1;
        }
        
        // Calculate maximum PDF value for scaling - but now we'll handle infinity differently
        const yTickStep = 0.5;
        const maxYTicks = 5; // This gives us 0, 0.5, 1.0, 1.5, 2.0
        const maxYDisplayed = maxYTicks * yTickStep; // Maximum Y value displayed on axis (2.0)
        
        // For edges that approach infinity, we need special handling
        const hasLeftAsymptote = (currentDistribution === 'gamma' && gammaParameters.alpha < 1) || 
                                (currentDistribution === 'beta' && betaParameters.alpha < 1);
                                
        const hasRightAsymptote = (currentDistribution === 'beta' && betaParameters.beta < 1);
        
        // Store points for path construction
        const points = [];
        
        // Calculate points for the curve with better edge handling
        const numPoints = 200;
        for (let i = 0; i <= numPoints; i++) {
            // Use non-linear spacing to get more points near the edges where we have asymptotes
            let t, xValue;
            
            if (hasLeftAsymptote && hasRightAsymptote) {
                // U-shaped Beta - need more points at both edges
                // Map t from [0,1] to a value that clusters points at both edges
                if (i <= numPoints/2) {
                    // First half: focus on left edge
                    t = Math.pow(i / (numPoints/2), 4); // Higher power = more clustering
                    xValue = xMin + t * (xMax - xMin) * 0.5; // Left half of domain
                } else {
                    // Second half: focus on right edge
                    t = 1 - Math.pow((numPoints - i) / (numPoints/2), 4);
                    xValue = xMin + (xMax - xMin) * (0.5 + 0.5 * t); // Right half of domain
                }
            } else if (hasLeftAsymptote) {
                // More points near left edge
                t = Math.pow(i / numPoints, 4); // Higher power = more clustering at edge
                xValue = xMin + t * (xMax - xMin);
            } else if (hasRightAsymptote) {
                // More points near right edge
                t = 1 - Math.pow(1 - i / numPoints, 4);
                xValue = xMin + t * (xMax - xMin);
            } else {
                // Regular spacing
                t = i / numPoints;
                xValue = xMin + t * (xMax - xMin);
            }
            
            // Calculate PDF value
            let pdfValue;
            if (currentDistribution === 'gamma') {
                pdfValue = calculateGammaPdf(xValue, gammaParameters.alpha, gammaParameters.beta);
            } else {
                pdfValue = calculateBetaPdf(xValue, betaParameters.alpha, betaParameters.beta);
            }
            
            // Map to canvas coordinates - handle infinity properly
            const x = padding.left + ((xValue - xMin) / (xMax - xMin)) * graphWidth;
            
            // For y-value, we need to scale and handle infinity
            let y;
            if (!isFinite(pdfValue) || pdfValue > maxYDisplayed) {
                // For infinite or very large values, cap at the top of the graph
                y = padding.top;
            } else {
                // Normal scaling for finite values within display range
                y = canvasHeight - padding.bottom - (pdfValue / maxYDisplayed) * graphHeight;
            }
            
            points.push({ x, y, xValue });
        }
        
        // Special handling for asymptotes: add extra vertical segments to make curve look like it's
        // approaching infinity
        let extendedPoints = [...points];
        
        if (hasLeftAsymptote) {
            // Find the points near the left edge
            const leftEdgePoints = points.filter(p => p.xValue < (xMin + (xMax - xMin) * 0.02))
                .sort((a, b) => a.xValue - b.xValue);
            
            if (leftEdgePoints.length > 0) {
                // Add a vertical segment at the leftmost point
                const edgePoint = leftEdgePoints[0];
                extendedPoints.push({
                    x: edgePoint.x,
                    y: padding.top, // Top of graph
                    xValue: edgePoint.xValue
                });
            }
        }
        
        if (hasRightAsymptote && currentDistribution === 'beta') {
            // Find the points near the right edge
            const rightEdgePoints = points.filter(p => p.xValue > (xMax - (xMax - xMin) * 0.02))
                .sort((a, b) => b.xValue - a.xValue);
            
            if (rightEdgePoints.length > 0) {
                // Add a vertical segment at the rightmost point
                const edgePoint = rightEdgePoints[0];
                extendedPoints.push({
                    x: edgePoint.x,
                    y: padding.top, // Top of graph
                    xValue: edgePoint.xValue
                });
            }
        }
        
        // Sort points by x-coordinate to ensure proper drawing order
        extendedPoints.sort((a, b) => a.xValue - b.xValue);
        
        // Draw the curve
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        
        // Special drawing approach for curves with asymptotes
        if (hasLeftAsymptote || hasRightAsymptote) {
            // For curves with asymptotes, we need to draw separate path segments
            // to avoid connecting across the asymptotes
            
            let currentSegment = [];
            let inAsymptote = false;
            
            for (let i = 0; i < extendedPoints.length; i++) {
                const point = extendedPoints[i];
                const isAtTop = point.y <= padding.top + 2; // Allow small tolerance
                
                // If we're starting a new segment
                if (currentSegment.length === 0) {
                    currentSegment.push(point);
                    inAsymptote = isAtTop;
                    continue;
                }
                
                // Check if we're transitioning between regular curve and asymptote
                if (isAtTop !== inAsymptote) {
                    // We've hit a transition - draw the current segment
                    if (currentSegment.length > 0) {
                        ctx.beginPath();
                        ctx.moveTo(currentSegment[0].x, currentSegment[0].y);
                        for (let j = 1; j < currentSegment.length; j++) {
                            ctx.lineTo(currentSegment[j].x, currentSegment[j].y);
                        }
                        ctx.stroke();
                    }
                    
                    // Start a new segment
                    currentSegment = [point];
                    inAsymptote = isAtTop;
                } else {
                    // Continue current segment
                    currentSegment.push(point);
                }
            }
            
            // Draw final segment
            if (currentSegment.length > 0) {
                ctx.beginPath();
                ctx.moveTo(currentSegment[0].x, currentSegment[0].y);
                for (let j = 1; j < currentSegment.length; j++) {
                    ctx.lineTo(currentSegment[j].x, currentSegment[j].y);
                }
                ctx.stroke();
            }
        } else {
            // For curves without asymptotes, we can draw the entire curve at once
            ctx.beginPath();
            ctx.moveTo(extendedPoints[0].x, extendedPoints[0].y);
            for (let i = 1; i < extendedPoints.length; i++) {
                ctx.lineTo(extendedPoints[i].x, extendedPoints[i].y);
            }
            ctx.stroke();
        }
        
        // Fill the area under the curve - but here we just use the original points
        // to avoid filling up to infinity
        ctx.beginPath();
        
        // Start at the bottom left
        ctx.moveTo(padding.left, canvasHeight - padding.bottom);
        
        // Draw curve (using original points, not extended ones with infinity markers)
        for (let i = 0; i < points.length; i++) {
            // Cap y-value at the top of the visible area
            const y = Math.max(points[i].y, padding.top);
            ctx.lineTo(points[i].x, y);
        }
        
        // Close the path back to the x-axis
        ctx.lineTo(padding.left + graphWidth, canvasHeight - padding.bottom);
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.fill();
        
        // Draw axes with fixed scale
        drawAxes(xMin, xMax);
    }
    
    function drawCanvas() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);   
        // Let drawPdfCurve handle both the curve and axes with proper range
        drawPdfCurve();
    }
    
    // Distribution calculations
    function calculateGammaPdf(x, alpha, beta) {
        if (x < 0) return 0; // Support is [0, ∞)
        
        // For x = 0 exactly
        if (x === 0) {
            if (alpha < 1) return Number.POSITIVE_INFINITY; // Approaches infinity
            if (alpha === 1) return beta; // Exponential case: exactly beta at x=0
            return 0; // alpha > 1: PDF is 0 at x=0
        }
        
        // For extremely small x values near 0 (but not exactly 0)
        if (x < 1e-10) {
            if (alpha < 1) {
                // For alpha < 1, approaches infinity as x → 0
                return Number.POSITIVE_INFINITY;
            } else if (alpha === 1) {
                // For alpha = 1 (exponential), finite value at x = 0
                return beta;
            } else {
                // For alpha > 1, PDF approaches 0 as x → 0
                return 0;
            }
        }
        
        // Normal calculation using log space for numerical stability
        try {
            const logGammaAlpha = logGammaFunction(alpha);
            const logPdf = alpha * Math.log(beta) - logGammaAlpha + (alpha - 1) * Math.log(x) - beta * x;
            return Math.exp(logPdf);
        } catch (e) {
            console.error("Error calculating gamma PDF:", e);
            return 0;
        }
    }

    function calculateBetaPdf(x, alpha, beta) {
        // Support is [0,1]
        if (x <= 0 || x >= 1) {
            // Handle exact boundary points correctly
            if (x === 0) {
                if (alpha < 1) return Number.POSITIVE_INFINITY;
                if (alpha === 1) return beta >= 1 ? 1 : beta;
                return 0; // alpha > 1
            }
            if (x === 1) {
                if (beta < 1) return Number.POSITIVE_INFINITY;
                if (beta === 1) return alpha >= 1 ? 1 : alpha;
                return 0; // beta > 1
            }
            return 0; // Outside [0,1]
        }
        
        // Normal calculation for non-edge points
        try {
            const logBetaVal = logBetaFunction(alpha, beta);
            const logPdf = -logBetaVal + (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x);
            return Math.exp(logPdf);
        } catch (e) {
            console.error("Error calculating beta PDF:", e);
            return 0;
        }
    }
    
    // Approximation of the gamma function using Stirling's formula for larger values
    // and a numerical approximation for smaller values
    function logGammaFunction(z) {
        // Special cases
        if (z === 1 || z === 2) return 0; // log(1) = 0
        if (z === 0.5) return Math.log(Math.sqrt(Math.PI));
        
        // Use Lanczos approximation for log-gamma
        // Based on numerical recipes implementation
        const c = [
          76.18009172947146,
          -86.50532032941677,
          24.01409824083091,
          -1.231739572450155,
          0.1208650973866179e-2,
          -0.5395239384953e-5
        ];
        
        let sum = 1.000000000190015;
        let xx = z;
        let y = xx;
        
        for (let j = 0; j < 6; j++) {
          sum += c[j] / ++y;
        }
        
        const ser = sum;
        y = xx + 5.5;
        y -= (xx + 0.5) * Math.log(y);
        
        return -y + Math.log(2.5066282746310005 * ser / xx);
      }
      
      // Log of Beta function
      function logBetaFunction(a, b) {
        return logGammaFunction(a) + logGammaFunction(b) - logGammaFunction(a + b);
      }
      
      // Improved function to get a better x-range for Gamma distribution
      function getGammaXRange(alpha, beta) {
        // For alpha <= 1, the mode is at 0, otherwise at (alpha-1)/beta
        const mode = alpha <= 1 ? 0 : (alpha - 1) / beta;
        
        // For gamma, mean = alpha/beta, variance = alpha/beta^2
        const mean = alpha / beta;
        const stdDev = Math.sqrt(alpha) / beta;
        
        // Set range to cover mean + 3*stdDev, but at least to mode*3 to ensure good coverage
        const maxX = Math.max(mode * 3, mean + 3 * stdDev);
        
        // Return reasonable bounds
        return {
          min: 0,
          max: Math.min(Math.max(maxX, 5), 20) // Limit between 5 and 20
        };
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