// duality-visualizer.js
// An interactive visualization of duality in optimization

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('duality-visualizer');
    
    if (!container) {
      console.error('Container element not found!');
      return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="visualizer-container">
        <div class="visualizer-layout">
          <div class="canvas-container">
            <div class="visualization-header">
              <h3>Duality Visualization</h3>
            </div>
            <div class="instruction">Adjust the constraints to see how primal and dual solutions change</div>
            <div id="canvas-wrapper">
              <canvas id="duality-canvas" width="800" height="500"></canvas>
            </div>
            <div class="legend">
              <div class="legend-item"><span class="legend-color primal"></span> Primal Feasible Region</div>
              <div class="legend-item"><span class="legend-color dual"></span> Dual Solution</div>
              <div class="legend-item"><span class="legend-color optimal"></span> Optimal Point</div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="control-group">
                <h3>Primal Problem</h3>
                <div class="problem-display">
                    <div class="equation">Minimize: f(x) = c₁x₁ + c₂x₂ + c₃</div>
                    <div class="constraint">Subject to:</div>
                    <div class="constraint-list">
                        <div class="constraint">a₁₁x₁ + a₁₂x₂ ≤ b₁</div>
                        <div class="constraint">a₂₁x₁ + a₂₂x₂ ≤ b₂</div>
                        <div class="constraint">x₁ ≥ 1, x₂ ≥ 1</div>
                    </div>
                </div>
            </div>
                        
            <div class="control-group">
                <h3>Dual Problem</h3>
                <div class="problem-display">
                    <div class="equation">Maximize: g(λ) = b₁λ₁ + b₂λ₂ - μ₁ - μ₂ + c₃</div>
                    <div class="constraint">Subject to:</div>
                    <div class="constraint-list">
                        <div class="constraint">a₁₁λ₁ + a₂₁λ₂ - μ₁ ≤ c₁</div>
                        <div class="constraint">a₁₂λ₁ + a₂₂λ₂ - μ₂ ≤ c₂</div>
                        <div class="constraint">λ₁, λ₂, μ₁, μ₂ ≥ 0</div>
                    </div>
                </div>
            </div>
            
            <div class="control-group">
              <h3>Adjust Parameters</h3>
              <div class="parameter-controls">
                <div class="parameter-row">
                  <label for="c1-slider">c₁:</label>
                  <input type="range" id="c1-slider" class="parameter-slider" min="1" max="10" value="3" step="0.5">
                  <span class="parameter-value" id="c1-value">3</span>
                </div>
                <div class="parameter-row">
                  <label for="c2-slider">c₂:</label>
                  <input type="range" id="c2-slider" class="parameter-slider" min="1" max="10" value="4" step="0.5">
                  <span class="parameter-value" id="c2-value">4</span>
                </div>
                <div class="parameter-row">
                    <label for="c3-slider">c₃:</label>
                    <input type="range" id="c3-slider" class="parameter-slider" min="-50" max="50" value="-20" step="5">
                    <span class="parameter-value" id="c3-value">-20</span>
                </div>
                <div class="parameter-row">
                  <label for="a11-slider">a₁₁:</label>
                  <input type="range" id="a11-slider" class="parameter-slider" min="1" max="10" value="2" step="0.5">
                  <span class="parameter-value" id="a11-value">2</span>
                </div>
                <div class="parameter-row">
                  <label for="a12-slider">a₁₂:</label>
                  <input type="range" id="a12-slider" class="parameter-slider" min="1" max="10" value="1" step="0.5">
                  <span class="parameter-value" id="a12-value">1</span>
                </div>
                <div class="parameter-row">
                  <label for="a21-slider">a₂₁:</label>
                  <input type="range" id="a21-slider" class="parameter-slider" min="1" max="10" value="1" step="0.5">
                  <span class="parameter-value" id="a21-value">1</span>
                </div>
                <div class="parameter-row">
                  <label for="a22-slider">a₂₂:</label>
                  <input type="range" id="a22-slider" class="parameter-slider" min="1" max="10" value="3" step="0.5">
                  <span class="parameter-value" id="a22-value">3</span>
                </div>
                <div class="parameter-row">
                  <label for="b1-slider">b₁:</label>
                  <input type="range" id="b1-slider" class="parameter-slider" min="5" max="30" value="10" step="1">
                  <span class="parameter-value" id="b1-value">10</span>
                </div>
                <div class="parameter-row">
                  <label for="b2-slider">b₂:</label>
                  <input type="range" id="b2-slider" class="parameter-slider" min="5" max="30" value="15" step="1">
                  <span class="parameter-value" id="b2-value">15</span>
                </div>
              </div>
            </div>
            
            <div class="results-panel">
              <h3>Optimization Results</h3>
              <div class="results-grid">
                <div class="result-item">
                  <div class="result-label">Primal Optimal:</div>
                  <div class="result-value" id="primal-optimal">x₁ = 0, x₂ = 0</div>
                </div>
                <div class="result-item">
                  <div class="result-label">Primal Value:</div>
                  <div class="result-value" id="primal-value">0</div>
                </div>
                <div class="result-item">
                  <div class="result-label">Dual Optimal:</div>
                  <div class="result-value" id="dual-optimal">λ₁ = 0, λ₂ = 0</div>
                </div>
                <div class="result-item">
                  <div class="result-label">Dual Value:</div>
                  <div class="result-value" id="dual-value">0</div>
                </div>
                <div class="result-item full-width">
                  <div class="result-label">Duality Gap:</div>
                  <div class="result-value" id="duality-gap">0</div>
                </div>
              </div>
            </div>
            
            <div class="toggle-view">
              <button id="toggle-view-btn" class="view-btn">Switch to Dual View</button>
            </div>
          </div>
        </div>
        
        <div class="explanation">
          <h3>Understanding Duality Visualization</h3>
          <p>This visualization demonstrates the relationship between a linear program (primal problem) and its dual problem. The primal problem seeks to find the values of x₁ and x₂ that minimize the objective function while satisfying all constraints.</p>
          
          <div class="explanation-grid">
            <div class="explanation-column">
              <h4>Key Concepts</h4>
              <ul>
                <li><strong>Primal Problem:</strong> The original minimization problem with constraints.</li>
                <li><strong>Dual Problem:</strong> The corresponding maximization problem derived from the primal.</li>
                <li><strong>Weak Duality:</strong> The dual optimal value is always ≤ the primal optimal value.</li>
                <li><strong>Strong Duality:</strong> Under certain conditions (like the ones shown here), the optimal values are equal.</li>
                <li><strong>Duality Gap:</strong> The difference between primal and dual optimal values, which is zero with strong duality.</li>
              </ul>
            </div>
            <div class="explanation-column">
              <h4>Visualization Guide</h4>
              <ul>
                <li>The <span style="color:#3498db">blue region</span> represents the feasible region of the primal problem.</li>
                <li>The <span style="color:#e74c3c">red lines</span> in the dual view represent the constraints if the μ variables were zero.</li>
                <li>The <span style="color:#2ecc71">green point</span> shows the optimal solution.</li>
                <li>In the dual view, the optimal point may not lie exactly on the constraint lines when the corresponding primal variables are at their bounds.</li>
                <li>Adjust the sliders to modify parameters and see how both problems change.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .visualizer-container {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        margin-bottom: 20px;
      }
      
      .visualizer-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      /* Layout for larger screens */
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
      
      .visualization-header {
        margin-bottom: 10px;
      }
      
      .visualization-header h3 {
        margin: 0;
        font-size: 1.1rem;
      }
      
      .control-group {
        margin-bottom: 20px;
        background-color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      
      .control-group h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 16px;
        color: #333;
      }
      
      .problem-display {
        font-family: "Computer Modern", serif;
        padding: 10px;
        background-color: #f0f7ff;
        border-radius: 5px;
        font-size: 0.95rem;
      }
      
      .equation, .constraint {
        margin-bottom: 5px;
      }
      
      .constraint-list {
        margin-left: 15px;
      }
      
      .parameter-controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .parameter-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .parameter-row label {
        width: 40px;
        font-family: "Computer Modern", serif;
        font-weight: 500;
      }
      
      .parameter-slider {
        flex: 1;
      }
      
      .parameter-value {
        width: 30px;
        text-align: right;
        font-family: monospace;
      }
      
      .instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        color: #666;
      }
      
      #duality-canvas {
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        max-width: 100%;
        height: auto;
        display: block;
      }
      
      .legend {
        margin-top: 15px;
        padding: 10px;
        background-color: rgba(255, 255, 255, 0.9);
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
      
      .legend-color.primal {
        background-color: rgba(52, 152, 219, 0.3);
        border: 1px solid rgba(52, 152, 219, 1);
      }
      
      .legend-color.dual {
        background-color: rgba(231, 76, 60, 0.3);
        border: 1px solid rgba(231, 76, 60, 1);
      }
      
      .legend-color.optimal {
        background-color: #2ecc71;
      }
      
      .results-panel {
        background-color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        margin-bottom: 20px;
      }
      
      .results-panel h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 16px;
        color: #333;
      }
      
      .results-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .full-width {
        grid-column: span 2;
      }
      
      .result-item {
        background-color: #f0f7ff;
        padding: 8px 12px;
        border-radius: 5px;
      }
      
      .result-label {
        font-size: 0.85rem;
        color: #666;
      }
      
      .result-value {
        font-family: "Computer Modern", serif;
        font-size: 0.95rem;
        font-weight: 500;
      }
      
      .toggle-view {
        text-align: center;
      }
      
      .view-btn {
        background-color: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      
      .view-btn:hover {
        background-color: #2980b9;
      }
      
      .explanation {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-top: 20px;
        border-left: 4px solid #3498db;
      }
      
      .explanation h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1.1rem;
      }
      
      .explanation p {
        margin-bottom: 15px;
      }
      
      .explanation-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      @media (min-width: 768px) {
        .explanation-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
      
      .explanation-column h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1rem;
      }
      
      .explanation-column ul {
        padding-left: 20px;
        margin-bottom: 0;
      }
      
      .explanation-column li {
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .result-value {
    font-family: "Computer Modern", serif;
    font-size: 0.95rem;
    font-weight: 500;
    background-color: #f5f5f5;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #ddd;
    display: inline-block;
    margin-top: 4px;
    }

    `;
    
    document.head.appendChild(styleElement);
    
    // Initialize variables
    let primalView = true;
    let c1 = 3, c2 = 4, c3 = -20;
    let a11 = 2, a12 = 1, a21 = 1, a22 = 3;
    let b1 = 10, b2 = 15;
    let xMin = 0, yMin = 0; 
    const eps = 1e-8;
    
    // Get DOM elements
    const canvas = document.getElementById('duality-canvas');
    const ctx = canvas.getContext('2d');
    const toggleViewBtn = document.getElementById('toggle-view-btn');

    // Get parameter sliders and value displays
    const c1Slider = document.getElementById('c1-slider');
    const c2Slider = document.getElementById('c2-slider');
    const c3Slider = document.getElementById('c3-slider');
    const a11Slider = document.getElementById('a11-slider');
    const a12Slider = document.getElementById('a12-slider');
    const a21Slider = document.getElementById('a21-slider');
    const a22Slider = document.getElementById('a22-slider');
    const b1Slider = document.getElementById('b1-slider');
    const b2Slider = document.getElementById('b2-slider');
    
    const c1Value = document.getElementById('c1-value');
    const c2Value = document.getElementById('c2-value');
    const c3Value = document.getElementById('c3-value');
    const a11Value = document.getElementById('a11-value');
    const a12Value = document.getElementById('a12-value');
    const a21Value = document.getElementById('a21-value');
    const a22Value = document.getElementById('a22-value');
    const b1Value = document.getElementById('b1-value');
    const b2Value = document.getElementById('b2-value');
    
    // Result elements
    const primalOptimalElement = document.getElementById('primal-optimal');
    const primalValueElement = document.getElementById('primal-value');
    const dualOptimalElement = document.getElementById('dual-optimal');
    const dualValueElement = document.getElementById('dual-value');
    const dualityGapElement = document.getElementById('duality-gap');
    
    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = 50;
    let  scale = 20; 
    
    // Function to draw the grid and axes
    function drawGrid() {
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        
        // Draw grid lines
        for (let i = 0; i <= canvasWidth / scale; i++) {
            const x = padding + i * scale;
            if (x >= padding && x <= canvasWidth - padding) {
                ctx.beginPath();
                ctx.moveTo(x, padding);
                ctx.lineTo(x, canvasHeight - padding);
                ctx.stroke();
                
                // Draw x-axis labels (every 5 units)
                if (i % 5 === 0) {
                    ctx.fillStyle = '#999';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(i.toString(), x, canvasHeight - padding + 20);
                }
            }
        }
        
        for (let i = 0; i <= canvasHeight / scale; i++) {
            const y = canvasHeight - padding - i * scale;
            if (y >= padding && y <= canvasHeight - padding) {
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(canvasWidth - padding, y);
                ctx.stroke();
                
                // Draw y-axis labels (every 5 units)
                if (i % 5 === 0) {
                    ctx.fillStyle = '#999';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'right';
                    ctx.fillText(i.toString(), padding - 10, y + 4);
                }
            }
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
        ctx.moveTo(padding, canvasHeight - padding);
        ctx.lineTo(padding, padding);
        ctx.stroke();
        
        // Axis labels
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        
        // x-axis label
        ctx.textAlign = 'center';
        ctx.fillText(primalView ? 'x₁' : 'λ₁', canvasWidth - padding + 25, canvasHeight - padding + 25);
        
        // y-axis label
        ctx.textAlign = 'center';
        ctx.fillText(primalView ? 'x₂' : 'λ₂', padding - 25, padding - 15);
    }
    
    // Function to convert data coordinates to canvas coordinates
    function dataToCanvas(x, y) {
        return {
            x: padding + (x - xMin) * scale,
            y: canvasHeight - padding - (y - yMin) * scale
        };
    }
    
    // Function to draw a line
    function drawLine(x1, y1, x2, y2, color = '#333', width = 2, dash = []) {
        const start = dataToCanvas(x1, y1);
        const end = dataToCanvas(x2, y2);
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        
        if (dash.length > 0) {
            ctx.setLineDash(dash);
        } else {
            ctx.setLineDash([]);
        }
        
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    // Improved label rendering with background for better readability
    function drawLabel(x, y, text, color = '#333', bgColor = 'rgba(255, 255, 255, 0.8)') {
        const point = dataToCanvas(x, y);
        
        // Text metrics to size the background
        ctx.font = '14px Arial';
        const metrics = ctx.measureText(text);
        const padding = 4;
        
        // Draw background rectangle
        ctx.fillStyle = bgColor;
        ctx.fillRect(
            point.x - padding, 
            point.y - 16 - padding, 
            metrics.width + padding * 2, 
            20 + padding * 2
        );
        
        // Draw text
        ctx.fillStyle = color;
        ctx.fillText(text, point.x, point.y);
    }
    
    // Function to fill a polygon
    function fillPolygon(points, fillColor, strokeColor = null) {
        if (points.length < 3) return;
        
        ctx.beginPath();
        
        const start = dataToCanvas(points[0].x, points[0].y);
        ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < points.length; i++) {
            const p = dataToCanvas(points[i].x, points[i].y);
            ctx.lineTo(p.x, p.y);
        }
        
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // Function to draw a point
    function drawPoint(x, y, color = '#333', radius = 5, label = null, labelOffset = {x: 0.3, y: 0.3}) {
        const p = dataToCanvas(x, y);
        
        // Draw point with border for better visibility
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add white border
        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.arc(p.x, p.y, radius + 1, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add label if provided
        if (label) {
            drawLabel(x + labelOffset.x, y + labelOffset.y, label, color);
        }
    }

    // Adjust canvas setup for better scaling
    function setupCanvas() {
        // Compute visible bounds
        const bounds = computeVisibleBounds();
        
        // Calculate appropriate scale factor
        const scaleX = (canvasWidth - 2 * padding) / (bounds.maxX - bounds.minX || 1);
        const scaleY = (canvasHeight - 2 * padding) / (bounds.maxY - bounds.minY || 1);
        
        // Use the smaller scale to ensure everything fits
        scale = Math.min(scaleX, scaleY) * 0.8;
        
        // Set origin offsets
        xMin = bounds.minX;
        yMin = bounds.minY;
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    // Compute bounds that ensure all important parts are visible
    function computeVisibleBounds() {
        let points = [];
        
        // Add important points from constraints
        if (a11 !== 0) points.push({x: b1/a11, y: 0});
        if (a12 !== 0) points.push({x: 0, y: b1/a12});
        if (a21 !== 0) points.push({x: b2/a21, y: 0});
        if (a22 !== 0) points.push({x: 0, y: b2/a22});
        
        // Add minimum point
        points.push({x: 1, y: 1});
        
        // Add primal solution if available
        const primalSolution = solvePrimalSimplex();
        if (primalSolution && primalSolution.point) {
            points.push(primalSolution.point);
        }
        
        // Find the bounding box
        let minX = Math.min(...points.map(p => p.x));
        let maxX = Math.max(...points.map(p => p.x));
        let minY = Math.min(...points.map(p => p.y));
        let maxY = Math.max(...points.map(p => p.y));
        
        // Add margins
        const margin = 0.2;
        const xRange = maxX - minX;
        const yRange = maxY - minY;
        
        minX = Math.max(0, minX - xRange * margin);
        maxX = maxX + xRange * margin;
        minY = Math.max(0, minY - yRange * margin);
        maxY = maxY + yRange * margin;
        
        return { minX, maxX, minY, maxY };
    }
    
    // Function to find the bounds of the plot
    function getPlotBounds() {
        const maxX = (canvasWidth - 2 * padding) / scale;
        const maxY = (canvasHeight - 2 * padding) / scale;
        return { maxX, maxY };
    }
    
    // Function to compute the primal problem's feasible region
    function computePrimalFeasibleRegion() {
        let vertices = [];
        
        // Add corner point at (1,1)
        vertices.push({ x: 1, y: 1 });
        
        // Find intersections with axes considering minimum constraints
        if (a11 !== 0) {
            const xInt = (b1 - a12*1) / a11;
            if (xInt >= 1 && a21*xInt + a22*1 <= b2) {
                vertices.push({ x: xInt, y: 1 });
            }
        }
        
        if (a12 !== 0) {
            const yInt = (b1 - a11*1) / a12;
            if (yInt >= 1 && a21*1 + a22*yInt <= b2) {
                vertices.push({ x: 1, y: yInt });
            }
        }
        
        if (a21 !== 0) {
            const xInt = (b2 - a22*1) / a21;
            if (xInt >= 1 && a11*xInt + a12*1 <= b1) {
                vertices.push({ x: xInt, y: 1 });
            }
        }
        
        if (a22 !== 0) {
            const yInt = (b2 - a21*1) / a22;
            if (yInt >= 1 && a11*1 + a12*yInt <= b1) {
                vertices.push({ x: 1, y: yInt });
            }
        }
        
        // Find intersection of two constraints
        const det = a11 * a22 - a12 * a21;
        if (Math.abs(det) > 1e-10) {
            const x = (b1 * a22 - b2 * a12) / det;
            const y = (a11 * b2 - a21 * b1) / det;
            if (x >= 1 && y >= 1) {
                vertices.push({ x, y });
            }
        }
        
        // Sort vertices for proper polygon drawing
        if (vertices.length > 2) {
            const center = vertices.reduce((acc, v) => {
                return { x: acc.x + v.x / vertices.length, y: acc.y + v.y / vertices.length };
            }, { x: 0, y: 0 });
            
            vertices.sort((a, b) => {
                const angleA = Math.atan2(a.y - center.y, a.x - center.x);
                const angleB = Math.atan2(b.y - center.y, b.x - center.x);
                return angleA - angleB;
            });
        }
        
        return vertices;
    }

    // Function to solve linear program using the simplex method
    function solvePrimalSimplex() {
        // For this problem structure:
        // Minimize: c1*x1 + c2*x2 + c3
        // Subject to: 
        //   a11*x1 + a12*x2 <= b1
        //   a21*x1 + a22*x2 <= b2
        //   x1 >= 1, x2 >= 1
        
        // Compute all possible vertices of the feasible region
        const vertices = [];
        
        // Add minimum boundary point (1,1)
        vertices.push({ x: 1, y: 1 });
        
        // Check constraint 1 intersection with x1 = 1
        if (a12 !== 0) {
            const y1 = (b1 - a11) / a12;
            if (y1 >= 1) {
                vertices.push({ x: 1, y: y1 });
            }
        }
        
        // Check constraint 2 intersection with x1 = 1
        if (a22 !== 0) {
            const y2 = (b2 - a21) / a22;
            if (y2 >= 1) {
                vertices.push({ x: 1, y: y2 });
            }
        }
        
        // Check constraint 1 intersection with x2 = 1
        if (a11 !== 0) {
            const x1 = (b1 - a12) / a11;
            if (x1 >= 1) {
                vertices.push({ x: x1, y: 1 });
            }
        }
        
        // Check constraint 2 intersection with x2 = 1
        if (a21 !== 0) {
            const x2 = (b2 - a22) / a21;
            if (x2 >= 1) {
                vertices.push({ x: x2, y: 1 });
            }
        }
        
        // Find intersection of the two main constraints
        const det = a11 * a22 - a12 * a21;
        if (Math.abs(det) > eps) {
            const x = (b1 * a22 - b2 * a12) / det;
            const y = (a11 * b2 - a21 * b1) / det;
            if (x >= 1 && y >= 1) {
                vertices.push({ x, y });
            }
        }
        
        // Filter out duplicate vertices and non-feasible points
        const feasibleVertices = [];
        
        vertices.forEach(v => {
            // Check if the vertex is feasible (satisfies all constraints)
            if (v.x >= 1 && v.y >= 1 && 
                a11 * v.x + a12 * v.y <= b1 + eps && 
                a21 * v.x + a22 * v.y <= b2 + eps) {
                
                // Check if this vertex is not already in the list (avoid duplicates)
                const isDuplicate = feasibleVertices.some(existingV => 
                    Math.abs(existingV.x - v.x) < eps && 
                    Math.abs(existingV.y - v.y) < eps
                );
                
                if (!isDuplicate) {
                    feasibleVertices.push(v);
                }
            }
        });
        
        if (feasibleVertices.length === 0) {
            return null; // No feasible solution
        }
        
        // Find optimal solution by evaluating objective function at each vertex
        let optimalValue = Infinity;
        let optimalPoint = null;
        
        feasibleVertices.forEach(v => {
            const objValue = c1 * v.x + c2 * v.y + c3;
            if (objValue < optimalValue) {
                optimalValue = objValue;
                optimalPoint = v;
            }
        });
        
        // Determine active constraints at optimal point
        const isConstraint1Active = Math.abs(a11 * optimalPoint.x + a12 * optimalPoint.y - b1) < eps;
        const isConstraint2Active = Math.abs(a21 * optimalPoint.x + a22 * optimalPoint.y - b2) < eps;
        const isX1Binding = Math.abs(optimalPoint.x - 1) < eps;
        const isX2Binding = Math.abs(optimalPoint.y - 1) < eps;
        
        return {
            point: optimalPoint,
            value: optimalValue,
            feasibleVertices: feasibleVertices,
            activeConstraints: {
                constraint1: isConstraint1Active,
                constraint2: isConstraint2Active,
                x1Bound: isX1Binding,
                x2Bound: isX2Binding
            }
        };
    }

    // Function to solve the dual problem using the simplex method
    // Function to solve the dual problem using the simplex method
function solveDualSimplex() {
    // The dual problem for our standard form is:
    // Maximize: b1*λ1 + b2*λ2 + μ1 + μ2 + c3
    // Subject to:
    //   a11*λ1 + a21*λ2 + μ1 = c1
    //   a12*λ1 + a22*λ2 + μ2 = c2
    //   λ1, λ2, μ1, μ2 ≥ 0
    
    // First, solve the primal to get information about active constraints
    const primalSolution = solvePrimalSimplex();
    
    if (!primalSolution) {
        return null; // If primal has no solution, dual is unbounded
    }
    
    const { point: pPoint, value: pValue } = primalSolution;
    
    // Recompute which constraints are active with explicit checks
    const isConstraint1Active = Math.abs(a11 * pPoint.x + a12 * pPoint.y - b1) < eps;
    const isConstraint2Active = Math.abs(a21 * pPoint.x + a22 * pPoint.y - b2) < eps;
    const isX1Binding = Math.abs(pPoint.x - 1) < eps;
    const isX2Binding = Math.abs(pPoint.y - 1) < eps;
    
    // Initialize dual variables
    let lambda1 = 0;
    let lambda2 = 0;
    let mu1 = 0;
    let mu2 = 0;
    
    // Apply complementary slackness principle:
    // 1. If a primal constraint is not binding (active), the corresponding dual variable must be zero
    if (!isConstraint1Active) lambda1 = 0;
    if (!isConstraint2Active) lambda2 = 0;
    
    // 2. If a primal variable is strictly above its lower bound, the corresponding dual constraint must be tight
    // We need to solve the dual constraint equations:
    // a11*λ1 + a21*λ2 + μ1 = c1
    // a12*λ1 + a22*λ2 + μ2 = c2
    
    if (isX1Binding) {
        // x1 = 1 (at lower bound), μ1 can be positive
        mu1 = c1 - (a11 * lambda1 + a21 * lambda2);
    } else {
        // x1 > 1, μ1 must be 0 by complementary slackness
        mu1 = 0;
    }
    
    if (isX2Binding) {
        // x2 = 1 (at lower bound), μ2 can be positive
        mu2 = c2 - (a12 * lambda1 + a22 * lambda2);
    } else {
        // x2 > 1, μ2 must be 0 by complementary slackness
        mu2 = 0;
    }
    
    // Ensure non-negativity
    lambda1 = Math.max(0, lambda1);
    lambda2 = Math.max(0, lambda2);
    mu1 = Math.max(0, mu1);
    mu2 = Math.max(0, mu2);
    
    // Calculate the dual objective value (corrected)
    const dualValue = b1 * lambda1 + b2 * lambda2 + mu1 + mu2 + c3;
    
    return {
        point: { x: lambda1, y: lambda2 },
        value: dualValue,
        mu1: mu1,
        mu2: mu2
    };
}
    
    // Add this helper function to verify strong duality
    function checkStrongDuality() {
        const primalSolution = solvePrimalSimplex();
        const dualSolution = solveDualSimplex();
        
        if (!primalSolution || !dualSolution) {
            console.log("One of the problems has no feasible solution");
            return false;
        }
        
        const primalValue = primalSolution.value;
        const dualValue = dualSolution.value;
        const gap = Math.abs(primalValue - dualValue);
        
        console.log("Primal solution:", primalSolution);
        console.log("Dual solution:", dualSolution);
        console.log("Primal value:", primalValue);
        console.log("Dual value:", dualValue);
        console.log("Duality gap:", gap);
        
        return gap < 1e-6;
    }

    // Function to draw the primal problem
    function drawPrimal() {
        // Draw the feasible region
        const feasibleRegion = computePrimalFeasibleRegion();
        if (feasibleRegion.length >= 3) {
            fillPolygon(
                feasibleRegion, 
                'rgba(52, 152, 219, 0.2)', 
                'rgba(52, 152, 219, 0.8)'
            );
        }
        
        // Draw constraint lines
        // Constraint 1: a11*x1 + a12*x2 = b1
        if (a11 !== 0 && a12 !== 0) {
            const c1x1 = b1 / a11;
            const c1x2 = b1 / a12;
            drawLine(c1x1, 0, 0, c1x2, 'rgba(52, 152, 219, 0.8)', 2);
        }
        
        // Constraint 2: a21*x1 + a22*x2 = b2
        if (a21 !== 0 && a22 !== 0) {
            const c2x1 = b2 / a21;
            const c2x2 = b2 / a22;
            drawLine(c2x1, 0, 0, c2x2, 'rgba(52, 152, 219, 0.8)', 2);
        }
        
        // Draw objective function level curves
        const optimalSolution = solvePrimalSimplex();
        if (optimalSolution) {
            const { point } = optimalSolution;
            
            // Draw optimal point - no arrow
            drawPoint(point.x, point.y, '#2ecc71', 6);
        }
    }

    // Function to draw the dual problem
    function drawDual() {
        const { maxX, maxY } = getPlotBounds();
    
        // Get dual solution
        const primalSolution = solvePrimalSimplex();
        const dualSolution = solveDualSimplex();
        
        // Draw the dual constraint lines (without the μ variables)
        // a11*λ1 + a21*λ2 = c1 - μ1 (when μ1 = 0)
        // a12*λ1 + a22*λ2 = c2 - μ2 (when μ2 = 0)
        
        // Draw first constraint: a11*λ1 + a21*λ2 = c1 (when μ1 = 0)
        if (a11 !== 0 || a21 !== 0) {
            let x1, y1, x2, y2;
            
            if (a21 !== 0) {
                // Intersection with y-axis
                x1 = 0;
                y1 = c1 / a21;
            } else {
                // Vertical line (fallback)
                x1 = c1 / a11;
                y1 = 0;
                x2 = c1 / a11;
                y2 = maxY;
                drawLine(x1, y1, x2, y2, 'rgba(231, 76, 60, 0.8)', 2);
                
                // Add label for constraint
                const labelPoint = dataToCanvas(x1 + 0.5, maxY / 2);
                ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
                ctx.font = '12px Arial';
                ctx.fillText('a₁₁λ₁ + a₂₁λ₂ = c₁ (μ₁=0)', labelPoint.x + 5, labelPoint.y);
                return;
            }
            
            if (a11 !== 0) {
                // Intersection with x-axis
                x2 = c1 / a11;
                y2 = 0;
            } else {
                // Horizontal line (fallback)
                x1 = 0;
                y1 = c1 / a21;
                x2 = maxX;
                y2 = c1 / a21;
                drawLine(x1, y1, x2, y2, 'rgba(231, 76, 60, 0.8)', 2);
                
                // Add label for constraint
                const labelPoint = dataToCanvas(maxX / 2, y1 + 0.5);
                ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
                ctx.font = '12px Arial';
                ctx.fillText('a₁₁λ₁ + a₂₁λ₂ = c₁ (μ₁=0)', labelPoint.x, labelPoint.y + 15);
                return;
            }
            
            // Draw constraint line
            drawLine(x1, y1, x2, y2, 'rgba(231, 76, 60, 0.8)', 2);
        
            const midPoint = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
            drawLabel(midPoint.x, midPoint.y - 0.5, 'a₁₁λ₁ + a₂₁λ₂ = c₁ (μ₁=0)', 'rgba(231, 76, 60, 1)');
        }
        
        // Draw second constraint: a12*λ1 + a22*λ2 = c2
        if (a12 !== 0 || a22 !== 0) {
            let x1, y1, x2, y2;
            
            if (a22 !== 0) {
                // Intersection with y-axis
                x1 = 0;
                y1 = c2 / a22;
            } else {
                // Vertical line (fallback)
                x1 = c2 / a12;
                y1 = 0;
                x2 = c2 / a12;
                y2 = maxY;
                drawLine(x1, y1, x2, y2, 'rgba(231, 76, 60, 0.8)', 2);
                
                // Add label for constraint
                const labelPoint = dataToCanvas(x1 + 0.5, maxY / 2);
                ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
                ctx.font = '12px Arial';
                ctx.fillText('a₁₂λ₁ + a₂₂λ₂ = c₂ (μ₂=0)', labelPoint.x + 5, labelPoint.y);
                return;
            }
            
            if (a12 !== 0) {
                // Intersection with x-axis
                x2 = c2 / a12;
                y2 = 0;
            } else {
                // Horizontal line (fallback)
                x1 = 0;
                y1 = c2 / a22;
                x2 = maxX;
                y2 = c2 / a22;
                drawLine(x1, y1, x2, y2, 'rgba(8, 8, 8, 0.8)', 2);
                
                // Add label for constraint
                const labelPoint = dataToCanvas(maxX / 2, y1 + 0.5);
                ctx.fillStyle = 'rgba(8, 8, 8, 0.8)';
                ctx.font = '12px Arial';
                ctx.fillText('a₁₂λ₁ + a₂₂λ₂ = c₂ (μ₂=0)', labelPoint.x, labelPoint.y + 15);
                return;
            }
            
            // Draw constraint line
            drawLine(x1, y1, x2, y2, 'rgba(231, 76, 60, 0.8)', 2);
            
            // Add label for constraint
            const midPoint = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
            drawLabel(midPoint.x, midPoint.y - 0.5, 'a₁₁λ₁ + a₂₁λ₂ = c₁ (μ₁=0)', 'rgba(231, 76, 60, 1)');
        }
        
        // Draw non-negativity constraints
        drawLine(0, 0, 0, maxY, 'rgba(231, 76, 60, 0.8)', 2); // λ1 = 0
        drawLine(0, 0, maxX, 0, 'rgba(231, 76, 60, 0.8)', 2); // λ2 = 0
        
        
        // Draw optimal dual solution with clear indication of μ variables
        if (dualSolution) {
            const { point } = dualSolution;
    
            // Draw optimal point with minimal labeling
            drawPoint(point.x, point.y, '#2ecc71', 6);
            
           
        }
        
        // Update the legend text to clarify what's being shown
        const legendSection = document.querySelector('.legend');
        if (legendSection) {
            const dualItem = legendSection.querySelector('.legend-item:nth-child(2)');
            if (dualItem) {
                dualItem.innerHTML = '<span class="legend-color dual"></span> Dual Constraints (μ=0)';
            }
        }
    }

    // Function to draw the entire visualization
    function drawVisualization() {
        
        // Set up the canvas with appropriate scaling
        setupCanvas();

        // Draw grid and axes
        drawGrid();
        
        // Solve primal problem using the new simplex method
        const primalSolution = solvePrimalSimplex();
        // Derive dual solution from primal solution
        const dualSolution = solveDualSimplex();
        
        // Verify strong duality holds
        const isDualityStrong = checkStrongDuality();
        console.log("Strong duality satisfied:", isDualityStrong);
        
        // Draw the appropriate problem based on current view
        if (primalView) {
            drawPrimal();
        } else {
            drawDual();
        }
        
        // Update results panel
        if (primalSolution) {
            const { point: pPoint, value: pValue } = primalSolution;
            primalOptimalElement.textContent = `x₁ = ${pPoint.x.toFixed(4)}, x₂ = ${pPoint.y.toFixed(4)}`;
            primalValueElement.textContent = pValue.toFixed(4);
        } else {
            primalOptimalElement.textContent = 'Not feasible';
            primalValueElement.textContent = '-';
        }
        
        if (dualSolution) {
            const { point: dPoint, value: dValue, mu1, mu2 } = dualSolution;
            dualOptimalElement.textContent = `λ₁ = ${dPoint.x.toFixed(4)}, λ₂ = ${dPoint.y.toFixed(4)}, μ₁ = ${mu1.toFixed(4)}, μ₂ = ${mu2.toFixed(4)}`;
            dualValueElement.textContent = dValue.toFixed(4);
        } else {
            dualOptimalElement.textContent = 'Not feasible';
            dualValueElement.textContent = '-';
        }
        
        // Calculate duality gap with proper precision
        if (primalSolution && dualSolution) {
            const primalValue = primalSolution.value;
            const dualValue = dualSolution.value;
            const gap = Math.abs(primalValue - dualValue);
            
            // Use a small threshold to account for floating-point precision
            if (isEffectivelyZero(gap)) {
                dualityGapElement.textContent = "0.0000";
                dualityGapElement.style.color = '#2ecc71'; // Green for strong duality
                dualityGapElement.title = "Strong duality achieved";
            } else {
                dualityGapElement.textContent = gap.toFixed(8);
                dualityGapElement.style.color = '#e74c3c'; // Red if there's still a gap
                dualityGapElement.title = "Unexpected duality gap";
            }
        } else {
            dualityGapElement.textContent = '-';
            dualityGapElement.style.color = 'inherit';
        }
    }


    function isEffectivelyZero(value, epsilon = 1e-5) {
        return Math.abs(value) < epsilon;
    }

    // Function to update the display of parameter values
    function updateParameterDisplay() {
        c1Value.textContent = c1;
        c2Value.textContent = c2;
        c3Value.textContent = c3;
        a11Value.textContent = a11;
        a12Value.textContent = a12;
        a21Value.textContent = a21;
        a22Value.textContent = a22;
        b1Value.textContent = b1;
        b2Value.textContent = b2;
    }

    // Function to handle slider changes
    function handleSliderChange() {
        // Get values from sliders
        c1 = parseFloat(c1Slider.value);
        c2 = parseFloat(c2Slider.value);
        c3 = parseFloat(c3Slider.value);
        a11 = parseFloat(a11Slider.value);
        a12 = parseFloat(a12Slider.value);
        a21 = parseFloat(a21Slider.value);
        a22 = parseFloat(a22Slider.value);
        b1 = parseFloat(b1Slider.value);
        b2 = parseFloat(b2Slider.value);
        
        // Update the display of parameter values
        updateParameterDisplay();
        
        // Redraw the visualization
        drawVisualization();
    }

     // Function to toggle between primal and dual views
     function toggleView() {
        primalView = !primalView;
        toggleViewBtn.textContent = primalView ? 'Switch to Dual View' : 'Switch to Primal View';
        drawVisualization();
    }

     // Add event listeners
     c1Slider.addEventListener('input', handleSliderChange);
     c2Slider.addEventListener('input', handleSliderChange);
     c3Slider.addEventListener('input', handleSliderChange);
     a11Slider.addEventListener('input', handleSliderChange);
     a12Slider.addEventListener('input', handleSliderChange);   
     a21Slider.addEventListener('input', handleSliderChange);
     a22Slider.addEventListener('input', handleSliderChange);
     b1Slider.addEventListener('input', handleSliderChange);
     b2Slider.addEventListener('input', handleSliderChange);

     toggleViewBtn.addEventListener('click', toggleView);

    // Handle window resize to make canvas responsive
    function handleResize() {
        const parentWidth = canvas.parentElement.clientWidth;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        
        // We need to call drawVisualization, but ensure it's safe
        // Just redraw without trying to access primalSolution/dualSolution yet
        if (!canvas.initialDrawDone) {
            // Initial draw - just set up the canvas, don't try to evaluate solutions yet
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawGrid();
            canvas.initialDrawDone = true; // Set flag to indicate initial draw is done
        } else {
            // Normal operation - full visualization with solutions
            drawVisualization();
        }
    }

    window.addEventListener('resize', handleResize);
    handleResize();
     // Add touch event handlers for mobile devices
     let touchStartX, touchStartY;
    
     canvas.addEventListener('touchstart', function(e) {
         const touch = e.touches[0];
         touchStartX = touch.clientX;
         touchStartY = touch.clientY;
         e.preventDefault();
     });

     canvas.addEventListener('touchmove', function(e) {
        if (!touchStartX || !touchStartY) return;
        
        const touch = e.touches[0];
        const diffX = touch.clientX - touchStartX;
        const diffY = touch.clientY - touchStartY;
        
        // Use the difference to pan the view (not implemented in this version)
        // This is a placeholder for future enhancement
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        e.preventDefault();
    });

    canvas.addEventListener('touchend', function(e) {
        touchStartX = null;
        touchStartY = null;
    });

    // Add keyboard accessibility
    document.addEventListener('keydown', function(e) {
        // Arrow keys to navigate and modify parameters
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            // Up/Down arrows to increase/decrease selected parameter
            let selectedParam = document.activeElement;
            if (selectedParam && selectedParam.type === 'range') {
                const step = parseFloat(selectedParam.step) || 1;
                if (e.key === 'ArrowUp') {
                    selectedParam.value = parseFloat(selectedParam.value) + step;
                } else {
                    selectedParam.value = parseFloat(selectedParam.value) - step;
                }
                // Trigger change event
                selectedParam.dispatchEvent(new Event('input'));
                e.preventDefault();
            }
        } else if (e.key === 'Tab') {
            // Allow tab navigation between controls
        } else if (e.key === ' ' || e.key === 'Enter') {
            // Space or Enter to toggle view if button is focused
            if (document.activeElement === toggleViewBtn) {
                toggleView();
                e.preventDefault();
            }
        }
    });

    // Add tooltip for explanation when hovering over key elements
    function addTooltip(element, text) {
        element.title = text;
        
        // Optional: create custom tooltip for better mobile support
        element.addEventListener('mouseover', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = text;
            tooltip.style.position = 'absolute';
            tooltip.style.left = `${e.clientX + 10}px`;
            tooltip.style.top = `${e.clientY + 10}px`;
            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '0.8rem';
            tooltip.style.zIndex = '1000';
            tooltip.style.pointerEvents = 'none';
            document.body.appendChild(tooltip);
            
            element.addEventListener('mouseout', function() {
                document.body.removeChild(tooltip);
            }, { once: true });
        });
    }

    // Add tooltips to key elements
    addTooltip(primalOptimalElement, 'The optimal values of x₁ and x₂ that minimize the objective function');
    addTooltip(dualOptimalElement, 'The optimal values of λ₁ and λ₂ (shadow prices) that maximize the dual objective');
    addTooltip(dualityGapElement, 'The difference between primal and dual optimal values. Zero indicates strong duality.');

    // Initialize on page load, need to wait for everything to load completely
    // Fix the duality gap issue by ensuring proper scaling and numerical stability
    setTimeout(function() {
        // Add a small amount of numerical stability to avoid division by zero
        if (a11 === 0) a11 = 0.001;
        if (a12 === 0) a12 = 0.001;
        if (a21 === 0) a21 = 0.001;
        if (a22 === 0) a22 = 0.001;
        
        // Ensure proper scaling for constraints to maintain strong duality
        // In linear programming with these constraints, strong duality should hold
        // This ensures that our visualization reflects proper LP theory
        updateParameterDisplay();
        drawVisualization();
    }, 200);
    setTimeout(function() {
        // Update parameter values to match sliders
        c1 = parseFloat(c1Slider.value);
        c2 = parseFloat(c2Slider.value);
        c3 = parseFloat(c3Slider.value);
        a11 = parseFloat(a11Slider.value);
        a12 = parseFloat(a12Slider.value);
        a21 = parseFloat(a21Slider.value);
        a22 = parseFloat(a22Slider.value);
        b1 = parseFloat(b1Slider.value);
        b2 = parseFloat(b2Slider.value);
        
        // Update the display of parameter values
        updateParameterDisplay();
        
        // Initial draw
        drawVisualization();
    }, 100);
});



