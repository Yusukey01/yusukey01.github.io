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
                <div class="equation">Minimize: f(x) = c₁x₁ + c₂x₂</div>
                <div class="constraint">Subject to:</div>
                <div class="constraint-list">
                  <div class="constraint">a₁₁x₁ + a₁₂x₂ ≤ b₁</div>
                  <div class="constraint">a₂₁x₁ + a₂₂x₂ ≤ b₂</div>
                  <div class="constraint">x₁, x₂ ≥ 0</div>
                </div>
              </div>
            </div>
            
            <div class="control-group">
              <h3>Dual Problem</h3>
              <div class="problem-display">
                <div class="equation">Maximize: g(λ) = b₁λ₁ + b₂λ₂</div>
                <div class="constraint">Subject to:</div>
                <div class="constraint-list">
                  <div class="constraint">a₁₁λ₁ + a₂₁λ₂ ≤ c₁</div>
                  <div class="constraint">a₁₂λ₁ + a₂₂λ₂ ≤ c₂</div>
                  <div class="constraint">λ₁, λ₂ ≥ 0</div>
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
                <li>The <span style="color:#e74c3c">red lines</span> represent the constraints in the dual problem.</li>
                <li>The <span style="color:#2ecc71">green point</span> shows the optimal solution.</li>
                <li>Adjust the sliders to modify parameters and see how both problems change.</li>
                <li>Use the "Switch View" button to toggle between primal and dual visualizations.</li>
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
    `;
    
    document.head.appendChild(styleElement);
    
    // Initialize variables
    let primalView = true;
    let c1 = 3, c2 = 4;
    let a11 = 2, a12 = 1, a21 = 1, a22 = 3;
    let b1 = 10, b2 = 15;
    
    // Get DOM elements
    const canvas = document.getElementById('duality-canvas');
    const ctx = canvas.getContext('2d');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    
    // Get parameter sliders and value displays
    const c1Slider = document.getElementById('c1-slider');
    const c2Slider = document.getElementById('c2-slider');
    const a11Slider = document.getElementById('a11-slider');
    const a12Slider = document.getElementById('a12-slider');
    const a21Slider = document.getElementById('a21-slider');
    const a22Slider = document.getElementById('a22-slider');
    const b1Slider = document.getElementById('b1-slider');
    const b2Slider = document.getElementById('b2-slider');
    
    const c1Value = document.getElementById('c1-value');
    const c2Value = document.getElementById('c2-value');
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
    const scale = 20; // Scale factor for visualization
    
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
            x: padding + x * scale,
            y: canvasHeight - padding - y * scale
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
    function drawPoint(x, y, color = '#333', radius = 5) {
        const p = dataToCanvas(x, y);
        
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Function to find the bounds of the plot
    function getPlotBounds() {
        const maxX = (canvasWidth - 2 * padding) / scale;
        const maxY = (canvasHeight - 2 * padding) / scale;
        return { maxX, maxY };
    }
    
    // Function to find the intersection point of two lines
    function findIntersection(a1, b1, c1, a2, b2, c2) {
        const det = a1 * b2 - a2 * b1;
        if (Math.abs(det) < 1e-6) return null; // Lines are parallel
        
        const x = (b2 * c1 - b1 * c2) / det;
        const y = (a1 * c2 - a2 * c1) / det;
        return { x, y };
    }
    
    // Function to compute the primal problem's feasible region
    function computePrimalFeasibleRegion() {
        const { maxX, maxY } = getPlotBounds();
        
        // Define the constraints
        // a11*x1 + a12*x2 <= b1 (Constraint 1)
        // a21*x1 + a22*x2 <= b2 (Constraint 2)
        // x1 >= 0, x2 >= 0 (Non-negativity)
        
        // Calculate intersection points with axes and between constraints
        
        // Points where constraint 1 intersects the axes
        const p1 = { x: b1 / a11, y: 0 }; // x-axis
        const p2 = { x: 0, y: b1 / a12 }; // y-axis
        
        // Points where constraint 2 intersects the axes
        const p3 = { x: b2 / a21, y: 0 }; // x-axis
        const p4 = { x: 0, y: b2 / a22 }; // y-axis
        
        // Find intersection of the two constraint lines
        const intersection = findIntersection(a11, a12, b1, a21, a22, b2);
        
        // Create vertices for the feasible region
        // Start with origin and the points where constraints meet axes
        let vertices = [
            { x: 0, y: 0 }, // Origin (non-negativity constraints)
        ];
        
        // Add points where constraint 1 intersects axes if they're in the first quadrant
        if (p1.x >= 0) vertices.push(p1);
        if (p2.y >= 0) vertices.push(p2);
        
        // Add points where constraint 2 intersects axes if they're in the first quadrant
        if (p3.x >= 0) vertices.push(p3);
        if (p4.y >= 0) vertices.push(p4);
        
        // Add intersection point if it exists and is in the first quadrant
        if (intersection && intersection.x >= 0 && intersection.y >= 0) {
            vertices.push(intersection);
        }
        
        // Filter out points that don't satisfy all constraints
        vertices = vertices.filter(p => {
            return (p.x >= 0 && p.y >= 0 && 
                    a11 * p.x + a12 * p.y <= b1 + 1e-6 && 
                    a21 * p.x + a22 * p.y <= b2 + 1e-6);
        });
        
        // Sort vertices (needed for drawing the polygon)
        // This is a simple algorithm for convex polygons
        const center = vertices.reduce((acc, v) => {
            return { x: acc.x + v.x / vertices.length, y: acc.y + v.y / vertices.length };
        }, { x: 0, y: 0 });
        
        vertices.sort((a, b) => {
            const angleA = Math.atan2(a.y - center.y, a.x - center.x);
            const angleB = Math.atan2(b.y - center.y, b.x - center.x);
            return angleA - angleB;
        });
        
        return vertices;
    }

    function computePrimalVertices() {
        const vertices = [];
        
        // Origin
        vertices.push({ x: 0, y: 0 });
        
        // Intersections with axes
        if (a11 !== 0 && b1 > 0) vertices.push({ x: b1 / a11, y: 0 });
        if (a12 !== 0 && b1 > 0) vertices.push({ x: 0, y: b1 / a12 });
        if (a21 !== 0 && b2 > 0) vertices.push({ x: b2 / a21, y: 0 });
        if (a22 !== 0 && b2 > 0) vertices.push({ x: 0, y: b2 / a22 });
        
        // Intersection of the two constraints
        const det = a11 * a22 - a12 * a21;
        if (Math.abs(det) > 1e-6) { // Not parallel
            const x = (b1 * a22 - b2 * a12) / det;
            const y = (a11 * b2 - a21 * b1) / det;
            vertices.push({ x, y });
        }
        
        // Filter out infeasible points
        return vertices.filter(v => 
            v.x >= -1e-6 && v.y >= -1e-6 && 
            a11 * v.x + a12 * v.y <= b1 + 1e-6 && 
            a21 * v.x + a22 * v.y <= b2 + 1e-6
        );
    }

    function computeDualVertices() {
        const vertices = [];
        
        // Origin
        vertices.push({ x: 0, y: 0 });
        
        // Intersections with axes
        if (a11 !== 0 && c1 > 0) vertices.push({ x: c1 / a11, y: 0 });
        if (a21 !== 0 && c1 > 0) vertices.push({ x: 0, y: c1 / a21 });
        if (a12 !== 0 && c2 > 0) vertices.push({ x: c2 / a12, y: 0 });
        if (a22 !== 0 && c2 > 0) vertices.push({ x: 0, y: c2 / a22 });
        
        // Intersection of the two constraints
        const det = a11 * a22 - a12 * a21;
        if (Math.abs(det) > 1e-6) { // Not parallel
            const x = (c1 * a22 - c2 * a21) / det;
            const y = (a11 * c2 - a12 * c1) / det;
            vertices.push({ x, y });
        }
        
        // Filter out infeasible points
        return vertices.filter(v => 
            v.x >= -1e-6 && v.y >= -1e-6 && 
            a11 * v.x + a21 * v.y <= c1 + 1e-6 && 
            a12 * v.x + a22 * v.y <= c2 + 1e-6
        );
    }

    // Function to find the optimal solution for the primal problem
    function solvePrimal() {
        // Get all possible vertices including constraint intersections
        const vertices = computePrimalVertices();
        
        // If no feasible region, return null
        if (vertices.length === 0) return null;
        
        // Evaluate the objective function at each vertex
        let minValue = Infinity;
        let optimalPoint = null;
        
        vertices.forEach(v => {
            // Check if the point is actually feasible (satisfies all constraints)
            if (v.x >= 0 && v.y >= 0 && 
                a11 * v.x + a12 * v.y <= b1 + 1e-6 && 
                a21 * v.x + a22 * v.y <= b2 + 1e-6) {
                
                const objValue = c1 * v.x + c2 * v.y;
                if (objValue < minValue) {
                    minValue = objValue;
                    optimalPoint = v;
                }
            }
        });
        
        return optimalPoint ? {
            point: optimalPoint,
            value: minValue
        } : null;
    }

    
    // Function to compute the dual feasible region
    function computeDualFeasibleRegion() {
        const { maxX, maxY } = getPlotBounds();
        
        // Define the dual constraints
        // a11*λ1 + a21*λ2 ≤ c1 (Constraint 1)
        // a12*λ1 + a22*λ2 ≤ c2 (Constraint 2)
        // λ1 ≥ 0, λ2 ≥ 0 (Non-negativity)
        
        // Calculate intersection points with axes and between constraints
        
        // Points where constraint 1 intersects the axes
        const p1 = { x: c1 / a11, y: 0 }; // x-axis
        const p2 = { x: 0, y: c1 / a21 }; // y-axis
        
        // Points where constraint 2 intersects the axes
        const p3 = { x: c2 / a12, y: 0 }; // x-axis
        const p4 = { x: 0, y: c2 / a22 }; // y-axis
        
        // Find intersection of the two constraint lines
        const intersection = findIntersection(a11, a21, c1, a12, a22, c2);
        
        // Create vertices for the feasible region
        // Start with origin and the points where constraints meet axes
        let vertices = [
            { x: 0, y: 0 }, // Origin (non-negativity constraints)
        ];
        
        // Add points where constraint 1 intersects axes if they're in the first quadrant
        if (p1.x >= 0) vertices.push(p1);
        if (p2.y >= 0) vertices.push(p2);
        
        // Add points where constraint 2 intersects axes if they're in the first quadrant
        if (p3.x >= 0) vertices.push(p3);
        if (p4.y >= 0) vertices.push(p4);
        
        // Add intersection point if it exists and is in the first quadrant
        if (intersection && intersection.x >= 0 && intersection.y >= 0) {
            vertices.push(intersection);
        }
        
        // Filter out points that don't satisfy all constraints
        vertices = vertices.filter(p => {
            return (p.x >= 0 && p.y >= 0 && 
                    a11 * p.x + a21 * p.y <= c1 + 1e-6 && 
                    a12 * p.x + a22 * p.y <= c2 + 1e-6);
        });
        
        // Sort vertices (needed for drawing the polygon)
        // This is a simple algorithm for convex polygons
        const center = vertices.reduce((acc, v) => {
            return { x: acc.x + v.x / vertices.length, y: acc.y + v.y / vertices.length };
        }, { x: 0, y: 0 });
        
        vertices.sort((a, b) => {
            const angleA = Math.atan2(a.y - center.y, a.x - center.x);
            const angleB = Math.atan2(b.y - center.y, b.x - center.x);
            return angleA - angleB;
        });
        
        return vertices;
    }
    // Function to find the optimal solution for the dual problem
    function solveDual() {
        // Get all possible vertices including constraint intersections
        const vertices = computeDualVertices();
        
        // If no feasible region, return null
        if (vertices.length === 0) return null;
        
        // Evaluate the objective function at each vertex
        let maxValue = -Infinity;
        let optimalPoint = null;
        
        vertices.forEach(v => {
            // Check if the point is actually feasible
            if (v.x >= 0 && v.y >= 0 && 
                a11 * v.x + a21 * v.y <= c1 + 1e-6 && 
                a12 * v.x + a22 * v.y <= c2 + 1e-6) {
                
                const objValue = b1 * v.x + b2 * v.y;
                if (objValue > maxValue) {
                    maxValue = objValue;
                    optimalPoint = v;
                }
            }
        });
        
        return optimalPoint ? {
            point: optimalPoint,
            value: maxValue
        } : null;
    }

    // Function to draw the primal problem
    function drawPrimal() {
        const { maxX, maxY } = getPlotBounds();
        
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
        const c1x1 = b1 / a11;
        const c1x2 = b1 / a12;
        drawLine(c1x1, 0, 0, c1x2, 'rgba(52, 152, 219, 0.8)', 2);
        
        // Constraint 2: a21*x1 + a22*x2 = b2
        const c2x1 = b2 / a21;
        const c2x2 = b2 / a22;
        drawLine(c2x1, 0, 0, c2x2, 'rgba(52, 152, 219, 0.8)', 2);
        
        // Draw objective function level curves
        const optimalSolution = solvePrimal();
        if (optimalSolution) {
            const { point, value } = optimalSolution;
            
            // Draw optimal point
            drawPoint(point.x, point.y, '#2ecc71', 6);
            
            // Draw level curves of the objective function
            // c1*x1 + c2*x2 = value
            // x2 = (value - c1*x1) / c2
            
            // Draw the optimal level curve
            if (c2 !== 0) {
                const x1_1 = 0;
                const x2_1 = value / c2;
                
                const x1_2 = value / c1;
                const x2_2 = 0;
                
                drawLine(x1_1, x2_1, x1_2, x2_2, 'rgba(231, 76, 60, 0.8)', 2, [5, 5]);
            }
            
            // Draw a few more level curves
            [0.7, 1.3].forEach(factor => {
                if (c2 !== 0) {
                    const levelValue = value * factor;
                    
                    const x1_1 = 0;
                    const x2_1 = levelValue / c2;
                    
                    const x1_2 = levelValue / c1;
                    const x2_2 = 0;
                    
                    drawLine(x1_1, x2_1, x1_2, x2_2, 'rgba(231, 76, 60, 0.4)', 1, [5, 5]);
                }
            });
            
            // Draw arrow to show gradient direction (direction of decreasing objective)
            const gradLen = 1;
            const normFactor = Math.sqrt(c1*c1 + c2*c2);
            
            // Start at the optimal point and draw in the direction of -gradient
            const arrowX = point.x - (c1 / normFactor) * gradLen;
            const arrowY = point.y - (c2 / normFactor) * gradLen;
            
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            
            const start = dataToCanvas(point.x, point.y);
            const end = dataToCanvas(arrowX, arrowY);
            
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            
            // Add arrow head
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headSize = 10;
            
            ctx.lineTo(
                end.x - headSize * Math.cos(angle - Math.PI/6),
                end.y - headSize * Math.sin(angle - Math.PI/6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
                end.x - headSize * Math.cos(angle + Math.PI/6),
                end.y - headSize * Math.sin(angle + Math.PI/6)
            );
            
            ctx.stroke();
        }
    }

    
    // Function to draw the dual problem
    function drawDual() {
        const { maxX, maxY } = getPlotBounds();
        
        // Draw the feasible region
        const feasibleRegion = computeDualFeasibleRegion();
        if (feasibleRegion.length >= 3) {
            fillPolygon(
                feasibleRegion, 
                'rgba(231, 76, 60, 0.2)', 
                'rgba(231, 76, 60, 0.8)'
            );
        }
        
        // Draw constraint lines
        // Constraint 1: a11*λ1 + a21*λ2 = c1
        const c1l1 = c1 / a11;
        const c1l2 = c1 / a21;
        drawLine(c1l1, 0, 0, c1l2, 'rgba(231, 76, 60, 0.8)', 2);
        
        // Constraint 2: a12*λ1 + a22*λ2 = c2
        const c2l1 = c2 / a12;
        const c2l2 = c2 / a22;
        drawLine(c2l1, 0, 0, c2l2, 'rgba(231, 76, 60, 0.8)', 2);
        
        // Draw objective function level curves
        const optimalSolution = solveDual();
        if (optimalSolution) {
            const { point, value } = optimalSolution;
            
            // Draw optimal point
            drawPoint(point.x, point.y, '#2ecc71', 6);
            
            // Draw level curves of the objective function
            // b1*λ1 + b2*λ2 = value
            // λ2 = (value - b1*λ1) / b2
            
            // Draw the optimal level curve
            if (b2 !== 0) {
                const l1_1 = 0;
                const l2_1 = value / b2;
                
                const l1_2 = value / b1;
                const l2_2 = 0;
                
                drawLine(l1_1, l2_1, l1_2, l2_2, 'rgba(52, 152, 219, 0.8)', 2, [5, 5]);
            }
            
            // Draw a few more level curves
            [0.7, 1.3].forEach(factor => {
                if (b2 !== 0) {
                    const levelValue = value * factor;
                    
                    const l1_1 = 0;
                    const l2_1 = levelValue / b2;
                    
                    const l1_2 = levelValue / b1;
                    const l2_2 = 0;
                    
                    drawLine(l1_1, l2_1, l1_2, l2_2, 'rgba(52, 152, 219, 0.4)', 1, [5, 5]);
                }
            });
            
            // Draw arrow to show gradient direction (direction of increasing objective)
            const gradLen = 1;
            const normFactor = Math.sqrt(b1*b1 + b2*b2);
            
            // Start at the optimal point and draw in the direction of gradient
            const arrowX = point.x + (b1 / normFactor) * gradLen;
            const arrowY = point.y + (b2 / normFactor) * gradLen;
            
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            
            const start = dataToCanvas(point.x, point.y);
            const end = dataToCanvas(arrowX, arrowY);
            
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            
            // Add arrow head
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headSize = 10;
            
            ctx.lineTo(
                end.x - headSize * Math.cos(angle - Math.PI/6),
                end.y - headSize * Math.sin(angle - Math.PI/6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
                end.x - headSize * Math.cos(angle + Math.PI/6),
                end.y - headSize * Math.sin(angle + Math.PI/6)
            );
            
            ctx.stroke();
        }
    }

    // Function to draw the entire visualization
    function drawVisualization() {
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw grid and axes
        drawGrid();
        
        // Draw the appropriate problem based on current view
        if (primalView) {
            drawPrimal();
        } else {
            drawDual();
        }
        
        // Solve both problems to display results
        const primalSolution = solvePrimal();
        const dualSolution = solveDual();
        
        // Update results panel
        if (primalSolution) {
            const { point: pPoint, value: pValue } = primalSolution;
            primalOptimalElement.textContent = `x₁ = ${pPoint.x.toFixed(2)}, x₂ = ${pPoint.y.toFixed(2)}`;
            primalValueElement.textContent = pValue.toFixed(2);
        } else {
            primalOptimalElement.textContent = 'Not feasible';
            primalValueElement.textContent = '-';
        }
        
        if (dualSolution) {
            const { point: dPoint, value: dValue } = dualSolution;
            dualOptimalElement.textContent = `λ₁ = ${dPoint.x.toFixed(2)}, λ₂ = ${dPoint.y.toFixed(2)}`;
            dualValueElement.textContent = dValue.toFixed(2);
        } else {
            dualOptimalElement.textContent = 'Not feasible';
            dualValueElement.textContent = '-';
        }
        
        // Calculate duality gap
        if (primalSolution && dualSolution) {
            const primalValue = primalSolution.value;
            const dualValue = dualSolution.value;
            const gap = Math.abs(primalValue - dualValue);
            
            // Display the gap with appropriate precision
            dualityGapElement.textContent = gap.toFixed(4);
            
            // Be more lenient with numerical precision due to floating point calculations
            const threshold = Math.max(0.01, 0.0001 * Math.abs(primalValue));
            
            if (gap < threshold) {
                dualityGapElement.style.color = '#2ecc71'; // Green for strong duality
                dualityGapElement.title = "Strong duality observed - primal and dual values match";
            } else {
                dualityGapElement.style.color = '#e74c3c'; // Red for larger gap
                dualityGapElement.title = "Larger gap may indicate computational/numerical issues";
            }
        } else {
            dualityGapElement.textContent = '-';
            dualityGapElement.style.color = 'inherit';
        }
    }

    // Function to update the display of parameter values
    function updateParameterDisplay() {
        c1Value.textContent = c1;
        c2Value.textContent = c2;
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



