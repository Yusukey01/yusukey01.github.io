// orthogonality_visualizer.js
// A vanilla JavaScript implementation of the Orthogonality Visualizer

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('orthogonality-visualizer');
    
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
                <select id="demo-type" class="full-width">
                  <option value="projection">Orthogonal Projection</option>
                  <option value="gramschmidt">Gram-Schmidt Process</option>
                </select>
              </label>
            </div>
            <div class="instruction" id="instruction-text">Drag the vectors to see orthogonal projection</div>
            <div id="canvas-wrapper">
              <canvas id="orthogonality-canvas" width="800" height="500"></canvas>
            </div>
            <div class="legend" id="legend-container">
              <div class="legend-item"><span class="legend-color vector-a"></span> Vector u</div>
              <div class="legend-item"><span class="legend-color vector-b"></span> Vector v</div>
              <div class="legend-item"><span class="legend-color projection"></span> Projection of u onto v</div>
              <div class="legend-item"><span class="legend-color orthogonal"></span> Residual z (orthogonal)</div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="equation-display" id="equation-container">
              <div class="equation-title">Projection Formula:</div>
              <div id="inner-product" class="equation">proj_v u = (u·v / ||v||²) × v</div>
            </div>
  
            <div class="control-group" id="vector-controls">
              <label id="control-label">Vector Coordinates:</label>
              <div class="vector-inputs">
                <div class="vector-input">
                  <label>u = </label>
                  <input type="number" id="vec-a-x" value="4" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-a-y" value="0" step="0.5" min="-10" max="10">
                </div>
                <div class="vector-input">
                  <label>v = </label>
                  <input type="number" id="vec-b-x" value="0" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-b-y" value="3" step="0.5" min="-10" max="10">
                </div>
              </div>
              <button id="projection-reset-btn" class="secondary-btn" style="margin-top: 15px;">Reset</button>
            </div>
            
            <div class="control-group" id="gramschmidt-controls" style="display: none;">
              <button id="generate-vectors-btn" class="primary-btn">Generate Random Vectors</button>
              <button id="step-btn" class="primary-btn">Step Through Process</button>
              <button id="reset-btn" class="secondary-btn">Reset</button>
            </div>
  
            <div class="explanation-container">
              <h3 id="explanation-title">Orthogonal Vectors</h3>
              <div id="explanation-content">
                <p>Two vectors are <strong>orthogonal</strong> when their inner product equals zero.</p>
                <p>For vectors in ℝ<sup>n</sup>: u·v = u₁v₁ + u₂v₂ + ... + uₙvₙ</p>
                <p>In this 2D example: u·v = u₁v₁ + u₂v₂</p>
                <p>When vectors are orthogonal, they form a 90° angle.</p>
                <p>Try moving the vectors to see how the inner product changes!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      #orthogonality-visualizer .visualizer-container {
        background: rgba(15, 20, 25, 0.98);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e8eaed;
      }
      
      #orthogonality-visualizer .visualizer-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      @media (min-width: 992px) {
        #orthogonality-visualizer .visualizer-layout {
          flex-direction: row;
        }
        
        #orthogonality-visualizer .canvas-container {
          flex: 3;
          order: 1;
        }
        
        #orthogonality-visualizer .controls-panel {
          flex: 2;
          order: 2;
          max-width: 400px;
        }
      }
      
      #orthogonality-visualizer .controls-panel {
        background: rgba(20, 28, 40, 0.95);
        padding: 15px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      
      #orthogonality-visualizer .canvas-container {
        display: flex;
        flex-direction: column;
      }
      
      #orthogonality-visualizer #canvas-wrapper {
        position: relative;
        width: 100%;
      }
      
      #orthogonality-visualizer .visualization-mode-toggle {
        margin-bottom: 10px;
      }
      
      #orthogonality-visualizer .visualization-mode-toggle select {
        width: 100%;
        padding: 10px 15px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: #e8eaed;
        font-size: 0.9rem;
        cursor: pointer;
      }
      
      #orthogonality-visualizer .visualization-mode-toggle select:focus {
        border-color: #64b4ff;
        outline: none;
      }
      
      #orthogonality-visualizer .visualization-mode-toggle select option {
        background: #1a2332;
        color: #e8eaed;
      }
      
      #orthogonality-visualizer .control-group {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }
      
      #orthogonality-visualizer .control-group label {
        display: block;
        font-weight: bold;
        margin-bottom: 10px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.85rem;
      }
      
      #orthogonality-visualizer .vector-inputs {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      #orthogonality-visualizer .vector-input {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      #orthogonality-visualizer .vector-input label {
        font-weight: bold;
        margin-bottom: 0;
        font-family: 'Courier New', monospace;
        font-size: 1rem;
        color: #64b4ff;
        min-width: 30px;
      }
      
      #orthogonality-visualizer .vector-input input {
        width: 55px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        text-align: center;
        color: #64b4ff;
        font-family: 'Courier New', monospace;
      }
      
      #orthogonality-visualizer .vector-input input:focus {
        border-color: #64b4ff;
        outline: none;
        box-shadow: 0 0 0 2px rgba(100, 180, 255, 0.2);
      }
      
      #orthogonality-visualizer .equation-display {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }
      
      #orthogonality-visualizer .equation-title {
        font-weight: bold;
        font-size: 0.9rem;
        color: #64b4ff;
        margin-bottom: 8px;
      }
      
      #orthogonality-visualizer .equation {
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        color: #2ecc71;
        background: rgba(0, 0, 0, 0.2);
        padding: 8px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      #orthogonality-visualizer .status {
        font-weight: bold;
        padding: 6px 10px;
        border-radius: 4px;
        text-align: center;
        margin-top: 8px;
      }
      
      #orthogonality-visualizer .status.orthogonal {
        background: rgba(46, 204, 113, 0.15);
        border: 1px solid rgba(46, 204, 113, 0.3);
        color: #2ecc71;
      }
      
      #orthogonality-visualizer .status.not-orthogonal {
        background: rgba(231, 76, 60, 0.15);
        border: 1px solid rgba(231, 76, 60, 0.3);
        color: #e74c3c;
      }
      
      #orthogonality-visualizer .instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.5);
      }
      
      #orthogonality-visualizer #orthogonality-canvas {
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        background: linear-gradient(135deg, #0a0f18 0%, #0f1419 100%);
        max-width: 100%;
        height: auto;
        cursor: crosshair;
        touch-action: manipulation;
        display: block;
      }
      
      #orthogonality-visualizer .legend {
        margin-top: 10px;
        display: flex;
        gap: 15px;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
        justify-content: center;
        flex-wrap: wrap;
      }
      
      #orthogonality-visualizer .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      #orthogonality-visualizer .legend-color {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }
      
      #orthogonality-visualizer .legend-color.vector-a {
        background-color: #3498db;
      }
      
      #orthogonality-visualizer .legend-color.vector-b {
        background-color: #e74c3c;
      }
      
      #orthogonality-visualizer .legend-color.orthogonal {
        background-color: #2ecc71;
      }
      
      #orthogonality-visualizer .legend-color.projection {
        background-color: #9b59b6;
      }
      
      #orthogonality-visualizer .primary-btn {
        width: 100%;
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        margin-bottom: 8px;
        transition: all 0.2s ease;
        background: linear-gradient(135deg, #1565c0, #42a5f5);
        border: 1px solid #64b4ff;
        color: white;
      }
      
      #orthogonality-visualizer .primary-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(66, 165, 245, 0.3);
      }
      
      #orthogonality-visualizer .secondary-btn {
        width: 100%;
        padding: 10px 15px;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        margin-bottom: 8px;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.7);
      }
      
      #orthogonality-visualizer .secondary-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      #orthogonality-visualizer .explanation-container {
        background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(39, 174, 96, 0.05));
        border: 1px solid rgba(46, 204, 113, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-top: 12px;
      }
      
      #orthogonality-visualizer .explanation-container h3 {
        margin-top: 0;
        margin-bottom: 8px;
        color: #2ecc71;
        font-size: 0.95rem;
      }
      
      #orthogonality-visualizer #explanation-content {
        font-size: 0.85rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.7);
      }
      
      #orthogonality-visualizer #explanation-content p {
        margin: 6px 0;
      }
      
      #orthogonality-visualizer #explanation-content strong {
        color: #e8eaed;
      }
      
      @media (max-width: 768px) {
        #orthogonality-visualizer .vector-inputs {
          gap: 12px;
        }
        
        #orthogonality-visualizer .vector-input input {
          width: 60px;
          padding: 10px;
          font-size: 16px;
        }
        
        #orthogonality-visualizer .primary-btn, 
        #orthogonality-visualizer .secondary-btn {
          padding: 12px;
          font-size: 16px;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Get DOM elements
    const canvas = document.getElementById('orthogonality-canvas');
    const ctx = canvas.getContext('2d');
    const demoTypeSelect = document.getElementById('demo-type');
    const instructionText = document.getElementById('instruction-text');
    const innerProductDisplay = document.getElementById('inner-product');
    const explanationTitle = document.getElementById('explanation-title');
    const explanationContent = document.getElementById('explanation-content');
    const legendContainer = document.getElementById('legend-container');
    const vectorControls = document.getElementById('vector-controls');
    const gramSchmidtControls = document.getElementById('gramschmidt-controls');
    
    // Vector input elements
    const vecAXInput = document.getElementById('vec-a-x');
    const vecAYInput = document.getElementById('vec-a-y');
    const vecBXInput = document.getElementById('vec-b-x');
    const vecBYInput = document.getElementById('vec-b-y');
    
    // Get projection reset button
    const projectionResetBtn = document.getElementById('projection-reset-btn');
    
    // Gram-Schmidt buttons
    const generateVectorsBtn = document.getElementById('generate-vectors-btn');
    const stepBtn = document.getElementById('step-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    // Canvas dimensions and scaling
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const origin = { x: canvasWidth / 2, y: canvasHeight / 2 };
    const scale = 30; // pixels per unit
    
    // State variables
    let demoType = 'projection';
    let vectorA = { x: 4, y: 0 };
    let vectorB = { x: 0, y: 3 };
    let draggingVector = null;
    let hoveredVector = null;
    let gramSchmidtStep = 0;
    let gramSchmidtVectors = [];
    let orthogonalVectors = [];
    
    // Event state
    let isDragging = false;
    let startX, startY;
    let lastTouchX, lastTouchY;
    
    // Utility functions
    function dot(v1, v2) {
      return v1.x * v2.x + v1.y * v2.y;
    }
    
    function magnitude(v) {
      return Math.sqrt(v.x * v.x + v.y * v.y);
    }
    
    function normalize(v) {
      const mag = magnitude(v);
      return { x: v.x / mag, y: v.y / mag };
    }
    
    function scalarMultiply(v, scalar) {
      return { x: v.x * scalar, y: v.y * scalar };
    }
    
    function vectorAdd(v1, v2) {
      return { x: v1.x + v2.x, y: v1.y + v2.y };
    }
    
    function vectorSubtract(v1, v2) {
      return { x: v1.x - v2.x, y: v1.y - v2.y };
    }
    
    function canvasToVector(x, y) {
      return {
        x: (x - origin.x) / scale,
        y: (origin.y - y) / scale
      };
    }
    
    function vectorToCanvas(v) {
      return {
        x: origin.x + v.x * scale,
        y: origin.y - v.y * scale
      };
    }
    
    function projectVector(v, onto) {
        // Standard projection formula: proj_{onto}(v) = (v·onto / onto·onto) × onto
        const dotProduct = dot(v, onto);
        const ontoSquared = dot(onto, onto);

        // Avoid division by zero
        if (Math.abs(ontoSquared) < 0.00001) {
            return { x: 0, y: 0 };
        }
        
        return scalarMultiply(onto, dotProduct / ontoSquared);
    }
    
    function drawGrid() {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Grid spacing
      const gridSize = scale;
      const numLinesH = Math.floor(canvasHeight / gridSize);
      const numLinesW = Math.floor(canvasWidth / gridSize);
      
      // Draw horizontal grid lines
      for (let i = -numLinesH/2; i <= numLinesH/2; i++) {
        const y = origin.y - i * gridSize;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
        
        // Draw labels for every other line
        if (i !== 0 && i % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.font = '12px Arial';
          ctx.fillText(i, origin.x + 5, y - 5);
        }
      }
      
      // Draw vertical grid lines
      for (let i = -numLinesW/2; i <= numLinesW/2; i++) {
        const x = origin.x + i * gridSize;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
        
        // Draw labels for every other line
        if (i !== 0 && i % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.font = '12px Arial';
          ctx.fillText(i, x + 5, origin.y + 15);
        }
      }
      
      // Draw axes with thicker lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      
      // x-axis
      ctx.beginPath();
      ctx.moveTo(0, origin.y);
      ctx.lineTo(canvasWidth, origin.y);
      ctx.stroke();
      
      // y-axis
      ctx.beginPath();
      ctx.moveTo(origin.x, 0);
      ctx.lineTo(origin.x, canvasHeight);
      ctx.stroke();
      
      // Labels for axes with background for visibility
      ctx.font = 'bold 16px Arial';
      
      // X label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(canvasWidth - 20, origin.y - 15, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6666';
      ctx.fillText('X', canvasWidth - 26, origin.y - 10);
      
      // Y label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(origin.x + 15, 20, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#66ff66';
      ctx.fillText('Y', origin.x + 8, 25);
    }
     
    function drawVector(v, color, label, isHovered = false) {
      const start = { x: origin.x, y: origin.y };
      const end = vectorToCanvas(v);
      
      const arrowSize = 10;
      const angle = Math.atan2(start.y - end.y, end.x - start.x);
      
      // Draw the vector line
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 4 : 2;
      ctx.stroke();
      
      // Draw the arrowhead
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - arrowSize * Math.cos(angle - Math.PI / 6),
        end.y + arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        end.x - arrowSize * Math.cos(angle + Math.PI / 6),
        end.y + arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      
      // Draw label with background
      const labelX = end.x + 15 * Math.cos(angle);
      const labelY = end.y - 15 * Math.sin(angle);
      
      ctx.font = 'bold 16px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(labelX - 5, labelY - 16, textWidth + 10, 22);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX - 5, labelY - 16, textWidth + 10, 22);
      
      ctx.fillStyle = color;
      ctx.fillText(label, labelX, labelY);
      
      // Draw vector endpoint handle for dragging
      if (isHovered || draggingVector === label) {
        ctx.beginPath();
        ctx.arc(end.x, end.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Return the endpoint for hit testing
      return end;
    }
    
    function drawProjection(from, onto, color = '#9b59b6') {
      // Calculate the projection
      const projection = projectVector(from, onto);
      const projPoint = vectorToCanvas(projection);
      const fromPoint = vectorToCanvas(from);
      
      // Draw projection vector
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(projPoint.x, projPoint.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw dashed line from point to projection
      ctx.beginPath();
      ctx.moveTo(fromPoint.x, fromPoint.y);
      ctx.lineTo(projPoint.x, projPoint.y);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw projection point
      ctx.beginPath();
      ctx.arc(projPoint.x, projPoint.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Draw right angle marker if orthogonal
      const dotProd = dot(from, onto);
      if (Math.abs(dotProd) < 0.001) {
        // Create a small square at the projection point to indicate 90° angle
        const size = 8;
        ctx.beginPath();
        ctx.moveTo(projPoint.x, projPoint.y);
        ctx.lineTo(projPoint.x + size, projPoint.y);
        ctx.lineTo(projPoint.x + size, projPoint.y - size);
        ctx.lineTo(projPoint.x, projPoint.y - size);
        ctx.closePath();
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      return projection;
    }
    
    function drawOrthogonalityDemo() {
      drawGrid();
      
      // Draw vectors
      const endA = drawVector(vectorA, '#3498db', 'u', hoveredVector === 'u');
      const endB = drawVector(vectorB, '#e74c3c', 'v', hoveredVector === 'v');
      
      // Calculate and display the inner product
      const innerProduct = dot(vectorA, vectorB);
      innerProductDisplay.textContent = `u·v = (${vectorA.x} × ${vectorB.x}) + (${vectorA.y} × ${vectorB.y}) = ${innerProduct.toFixed(2)}`;
      
      // Display orthogonality status
      if (Math.abs(innerProduct) < 0.1) {
        
        // Draw the 90-degree angle marker
        const angleMarkerRadius = 30;
        const angleStartPoint = vectorToCanvas(scalarMultiply(normalize(vectorA), angleMarkerRadius / scale));
        const angleEndPoint = vectorToCanvas(scalarMultiply(normalize(vectorB), angleMarkerRadius / scale));
        
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, angleMarkerRadius, 
                -Math.atan2(vectorA.y, vectorA.x), 
                -Math.atan2(vectorB.y, vectorB.x), 
                true);
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw "90°" label
        const midAngle = (Math.atan2(vectorA.y, vectorA.x) + Math.atan2(vectorB.y, vectorB.x)) / 2;
        const labelPos = {
          x: origin.x + (angleMarkerRadius + 15) * Math.cos(midAngle),
          y: origin.y - (angleMarkerRadius + 15) * Math.sin(midAngle)
        };
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('90°', labelPos.x - 10, labelPos.y + 5);
      }
    }
    
    function drawProjectionDemo() {
      drawGrid();
      
      // Draw vectors
      const endA = drawVector(vectorA, '#3498db', 'u', hoveredVector === 'u');
      const endB = drawVector(vectorB, '#e74c3c', 'v', hoveredVector === 'v');
      
      // Calculate and draw projection
      const projection = drawProjection(vectorA, vectorB);
      
      // Calculate residual vector (the orthogonal part)
      const residual = vectorSubtract(vectorA, projection);
      
      // Draw residual vector if significant
    if (magnitude(residual) > 0.1) {
      // Draw the residual vector from origin using the calculated residual
      const residualEnd = vectorToCanvas(residual);
      
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);  // Start from origin
      ctx.lineTo(residualEnd.x, residualEnd.y);  // Draw to the calculated residual endpoint
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Label the residual vector
      ctx.font = '16px Arial';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText('z', residualEnd.x + 10, residualEnd.y - 10);
      
      // Optionally draw a dashed parallelogram to show the vector addition relationship
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(vectorToCanvas(projection).x, vectorToCanvas(projection).y);
      ctx.lineTo(vectorToCanvas(vectorA).x, vectorToCanvas(vectorA).y);
      ctx.lineTo(residualEnd.x, residualEnd.y);
      ctx.closePath();
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      }
      
      // Calculate and display formula
      const projMagnitude = magnitude(projection);
      const projUnitVector = normalize(vectorB);
      // Calculate and display formula with both projection and residual on separate lines
      innerProductDisplay.innerHTML = `proj<sub>v</sub> u = (${projection.x.toFixed(2)}, ${projection.y.toFixed(2)})
      <br>residual z = u - proj<sub>v</sub> u = (${residual.x.toFixed(2)}, ${residual.y.toFixed(2)})`;
    }
    
    function getOrthogonalVectorColor(index) {
        // A consistent color palette with good contrast
        const colors = [
          '#3498db', // Blue for first vector
          '#e74c3c', // Red for second vector
          '#9b59b6', // Purple for third vector
          '#2ecc71', // Green for fourth vector
          '#f39c12'  // Orange for fifth vector (if needed)
        ];
        
        return colors[index % colors.length];
    }

    function drawGramSchmidtDemo() {
        drawGrid();
  
        // Draw the original vectors first (faded)
        gramSchmidtVectors.forEach((v, i) => {
            const endPoint = vectorToCanvas(v);
            
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.strokeStyle = 'rgba(153, 153, 153, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Label
            ctx.font = '16px Arial';
            ctx.fillStyle = '#999';
            ctx.fillText(`x₍${i+1}₎`, endPoint.x + 10, endPoint.y - 10);
        });
        
        // Draw the orthogonalized vectors that have been processed
        orthogonalVectors.forEach((v, i) => {
            const color = getOrthogonalVectorColor(i);
            const label = `v₍${i+1}₎`;
            drawVector(v, color, label);
        });
        
        // Update the inner product display
        if (orthogonalVectors.length >= 2) {
            const v1 = orthogonalVectors[0];
            const v2 = orthogonalVectors[1];
            const dotProduct = dot(v1, v2).toFixed(2);
            
            innerProductDisplay.textContent = `v₍1₎·v₍2₎ = (${v1.x.toFixed(1)} × ${v2.x.toFixed(1)}) + (${v1.y.toFixed(1)} × ${v2.y.toFixed(1)}) = ${dotProduct}`;
            
           
        } else {
            innerProductDisplay.textContent = 'Click "Step Through Process" to start';
        }
        
        // Add step counter
        if (gramSchmidtVectors.length > 0) {
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#333';
            ctx.fillText(`Step: ${orthogonalVectors.length}/${gramSchmidtVectors.length}`, 20, 30);
        }
        
        // If we're currently calculating a projection in the demo, show it
        if (gramSchmidtStep > 0 && gramSchmidtStep <= gramSchmidtVectors.length && orthogonalVectors.length < gramSchmidtVectors.length) {
            const currentIdx = orthogonalVectors.length;
            const currentVector = gramSchmidtVectors[currentIdx];
            
            // Draw the current vector we're processing
            const currentEnd = vectorToCanvas(currentVector);
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(currentEnd.x, currentEnd.y);
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.font = '16px Arial';
            ctx.fillStyle = '#f39c12';
            ctx.fillText(`x₍${currentIdx+1}₎`, currentEnd.x + 15, currentEnd.y);
            
            // Show projections onto each orthogonal vector
            let sumProjection = { x: 0, y: 0 };
            let yOffset = 70; // starting y position for displaying calculations
            
            // Add a title for the projection calculations display
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#333';
            ctx.fillText('Projection Calculations:', 20, 50);
            
            orthogonalVectors.forEach((v, i) => {
            const proj = projectVector(currentVector, v);
            sumProjection = vectorAdd(sumProjection, proj);
            
            // Draw each projection with a different opacity
            const projColor = getOrthogonalVectorColor(i);
            drawProjection(currentVector, v, projColor);
            
            // Display calculation values
            const dotProd = dot(currentVector, v).toFixed(2);
            const vDotV = dot(v, v).toFixed(2);
            const factor = (dotProd / vDotV).toFixed(2);
            
            ctx.font = '12px Arial';
            ctx.fillStyle = projColor;
            ctx.fillText(`proj_v${i+1}(x${currentIdx+1}) = (${dotProd} / ${vDotV}) × v${i+1} = ${factor} × (${v.x.toFixed(1)}, ${v.y.toFixed(1)})`, 20, yOffset);
            yOffset += 20; // move down for next calculation
            });
            
            // Draw the difference vector (the part that will be orthogonal)
            const difference = vectorSubtract(currentVector, sumProjection);
            const diffEnd = vectorToCanvas(difference);
            
            // Draw from origin
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(diffEnd.x, diffEnd.y);
            ctx.strokeStyle = getOrthogonalVectorColor(currentIdx); // Use consistent coloring
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Label
            ctx.font = '16px Arial';
            ctx.fillStyle = getOrthogonalVectorColor(currentIdx);
            ctx.fillText(`v₍${currentIdx+1}₎`, diffEnd.x + 10, diffEnd.y - 10);
            
            // Display the final calculation for new orthogonal vector
            ctx.font = '12px Arial';
            ctx.fillStyle = getOrthogonalVectorColor(currentIdx);
            ctx.fillText(`v${currentIdx+1} = x${currentIdx+1} - sum(projections) = (${currentVector.x.toFixed(1)}, ${currentVector.y.toFixed(1)}) - (${sumProjection.x.toFixed(1)}, ${sumProjection.y.toFixed(1)}) = (${difference.x.toFixed(1)}, ${difference.y.toFixed(1)})`, 20, yOffset + 20);
        }                
    }
    
    function drawCanvas() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      if (demoType === 'projection') {
        drawProjectionDemo();
      } else if (demoType === 'gramschmidt') {
        drawGramSchmidtDemo();
      }
    }
    
    // Gram-Schmidt process functions
    function generateRandomVectors(count = 3) {
      gramSchmidtVectors = [];
      
      // Generate random vectors with larger magnitudes
      for (let i = 0; i < count; i++) {
        // Larger range (-6 to 6) for better visibility
        const x = (Math.random() * 12) - 6;
        const y = (Math.random() * 12) - 6;
        gramSchmidtVectors.push({ x, y });
      }
      
      // Ensure they're not too small - minimum magnitude of 3
      gramSchmidtVectors = gramSchmidtVectors.map(v => {
        if (magnitude(v) < 3) {
          return scalarMultiply(normalize(v), 3 + Math.random() * 2);
        }
        return v;
      });
      
      orthogonalVectors = [];
      gramSchmidtStep = 0;
      
      drawCanvas();
    }
    
    function gramSchmidtProcess() {
        if (gramSchmidtVectors.length === 0) {
            generateRandomVectors();
            return;
        }
        
        // If we're just starting, add the first vector
        if (orthogonalVectors.length === 0) {
        // Copy the first vector
        orthogonalVectors.push({ ...gramSchmidtVectors[0] });
        gramSchmidtStep = 1;
        drawCanvas();
        return;
        }
        
        // If we've processed all vectors, reset
        if (orthogonalVectors.length >= gramSchmidtVectors.length) {
        orthogonalVectors = [];
        gramSchmidtStep = 0;
        drawCanvas();
        return;
        }
        
        // Process the next vector
        const currentIdx = orthogonalVectors.length;
        const currentVector = gramSchmidtVectors[currentIdx];
        
        // Calculate the sum of all projections onto previous orthogonal vectors
        let sumProjection = { x: 0, y: 0 };
        orthogonalVectors.forEach(v => {
        const proj = projectVector(currentVector, v);
        sumProjection = vectorAdd(sumProjection, proj);
        });
        
        // The new orthogonal vector is the difference between the original vector and the sum of projections
        const newOrthogonalVector = vectorSubtract(currentVector, sumProjection);
        
        // Add the new orthogonal vector to our list
        orthogonalVectors.push(newOrthogonalVector);
        
        // Increment the step counter
        gramSchmidtStep++;
        
        drawCanvas();
    }
    
    function updateLegend() {
    if (demoType === 'gramschmidt') {
      let legendHTML = `
        <div class="legend-item"><span class="legend-color" style="background-color: #999;"></span> Original vectors</div>
        <div class="legend-item"><span class="legend-color" style="background-color: #f39c12;"></span> Current vector</div>
      `;
      
      // Add dynamically generated legend items for orthogonal vectors
      for (let i = 0; i < Math.min(gramSchmidtVectors.length, 3); i++) {
        const color = getOrthogonalVectorColor(i);
        legendHTML += `<div class="legend-item"><span class="legend-color" style="background-color: ${color};"></span> v₍${i+1}₎ (orthogonal)</div>`;
      }
      
      legendContainer.innerHTML = legendHTML;
    }
  }

    // Demo type change handling
    function updateDemoType() {
      demoType = demoTypeSelect.value;
      
      // Update UI based on demo type
      if (demoType === 'projection') {
        explanationTitle.textContent = 'Orthogonal Projection';
        explanationContent.innerHTML = `
          <p>The <strong>orthogonal projection</strong> of vector u onto vector v is:</p>
          <p>proj<sub>v</sub> u = (u·v / ||v||²) × v</p>
          <p>This decomposes u into two components:</p>
          <p>u = proj<sub>v</sub> u + z</p>
          <p>where z is <strong>orthogonal</strong> to v (z·v = 0)</p>
          <p>This is the <strong>orthogonal decomposition</strong> of u.</p>
        `;
        
        instructionText.textContent = 'Drag vectors to see orthogonal projection';
        
        legendContainer.innerHTML = `
          <div class="legend-item"><span class="legend-color vector-a"></span> Vector u</div>
          <div class="legend-item"><span class="legend-color vector-b"></span> Vector v</div>
          <div class="legend-item"><span class="legend-color projection"></span> Projection of u onto v</div>
          <div class="legend-item"><span class="legend-color orthogonal"></span> Residual z (orthogonal)</div>
        `;
        
        vectorControls.style.display = 'block';
        gramSchmidtControls.style.display = 'none';
        
      } else if (demoType === 'gramschmidt') {
        explanationTitle.textContent = 'Gram-Schmidt Process';
        explanationContent.innerHTML = `
          <p>The <strong>Gram-Schmidt process</strong> transforms a set of vectors into an orthogonal set.</p>
          <p>Starting with vectors {x₁, x₂, ..., xₙ}:</p>
          <p>1. v₁ = x₁</p>
          <p>2. v₂ = x₂ - proj<sub>v₁</sub>x₂</p>
          <p>3. v₃ = x₃ - proj<sub>v₁</sub>x₃ - proj<sub>v₂</sub>x₃</p>
          <p>Each new vector v<sub>k</sub> is x<sub>k</sub> minus its projections onto all previous v<sub>i</sub>.</p>
          <p>The resulting vectors {v₁, v₂, ..., vₙ} form an orthogonal set.</p>
        `;
        
        instructionText.textContent = 'Step through the process to see orthogonalization';
        
        legendContainer.innerHTML = `
          <div class="legend-item"><span class="legend-color" style="background-color: #999;"></span> Original vectors</div>
          <div class="legend-item"><span class="legend-color" style="background-color: #f39c12;"></span> Current vector</div>
          <div class="legend-item"><span class="legend-color vector-a"></span> First orthogonal vector</div>
          <div class="legend-item"><span class="legend-color vector-b"></span> Second orthogonal vector</div>
        `;
        
        vectorControls.style.display = 'none';
        gramSchmidtControls.style.display = 'block';
        
        // Initialize Gram-Schmidt demo if needed
        if (gramSchmidtVectors.length === 0) {
          generateRandomVectors();
        }
      }
      
      drawCanvas();
    }
    
    // Function to reset projection vectors to default values
    function resetProjectionVectors() {
      console.log("Reset button clicked");
      vectorA = { x: 4, y: 0 };
      vectorB = { x: 0, y: 3 };
      
      vecAXInput.value = vectorA.x;
      vecAYInput.value = vectorA.y;
      vecBXInput.value = vectorB.x;
      vecBYInput.value = vectorB.y;
      
      drawCanvas();
    }
    
    // Event handlers
    function handleMouseMove(e) {
      if (!isDragging || demoType === 'gramschmidt') return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      const vector = canvasToVector(x, y);
      
      // Update the dragged vector's coordinates
      if (draggingVector === 'u') {
        vectorA = vector;
        vecAXInput.value = vector.x.toFixed(1);
        vecAYInput.value = vector.y.toFixed(1);
      } else if (draggingVector === 'v') {
        vectorB = vector;
        vecBXInput.value = vector.x.toFixed(1);
        vecBYInput.value = vector.y.toFixed(1);
      }
      
      drawCanvas();
    }
    
    function handleMouseDown(e) {
      if (demoType === 'gramschmidt') return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      // Check if we clicked on a vector endpoint
      const endA = vectorToCanvas(vectorA);
      const endB = vectorToCanvas(vectorB);
      
      const distA = Math.sqrt(Math.pow(x - endA.x, 2) + Math.pow(y - endA.y, 2));
      const distB = Math.sqrt(Math.pow(x - endB.x, 2) + Math.pow(y - endB.y, 2));
      
      if (distA < 15) {
        isDragging = true;
        draggingVector = 'u';
      } else if (distB < 15) {
        isDragging = true;
        draggingVector = 'v';
      }
      
      startX = x;
      startY = y;
    }
    
    function handleMouseUp() {
      isDragging = false;
      draggingVector = null;
    }
    
    function handleMouseOut() {
      isDragging = false;
      hoveredVector = null;
      drawCanvas();
    }
    
    function handleVectorInputChange() {
      vectorA.x = parseFloat(vecAXInput.value) || 0;
      vectorA.y = parseFloat(vecAYInput.value) || 0;
      vectorB.x = parseFloat(vecBXInput.value) || 0;
      vectorB.y = parseFloat(vecBYInput.value) || 0;
      
      drawCanvas();
    }

    function handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling when touching the canvas
        
        if (demoType === 'gramschmidt') return;
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        
        // Check if we touched a vector endpoint
        const endA = vectorToCanvas(vectorA);
        const endB = vectorToCanvas(vectorB);
        
        const distA = Math.sqrt(Math.pow(x - endA.x, 2) + Math.pow(y - endA.y, 2));
        const distB = Math.sqrt(Math.pow(x - endB.x, 2) + Math.pow(y - endB.y, 2));
        
        if (distA < 30) { // Increased touch target for mobile
          isDragging = true;
          draggingVector = 'u';
        } else if (distB < 30) {
          isDragging = true;
          draggingVector = 'v';
        }
        
        lastTouchX = x;
        lastTouchY = y;
      }
      
      function handleTouchMove(e) {
        e.preventDefault();
        
        if (!isDragging || demoType === 'gramschmidt') return;
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        
        const vector = canvasToVector(x, y);
        
        // Update the dragged vector's coordinates
        if (draggingVector === 'u') {
          vectorA = vector;
          vecAXInput.value = vector.x.toFixed(1);
          vecAYInput.value = vector.y.toFixed(1);
        } else if (draggingVector === 'v') {
          vectorB = vector;
          vecBXInput.value = vector.x.toFixed(1);
          vecBYInput.value = vector.y.toFixed(1);
        }
        
        lastTouchX = x;
        lastTouchY = y;
        
        drawCanvas();
      }
      
      function handleTouchEnd(e) {
        isDragging = false;
        draggingVector = null;
      }
    
    // Adding event listeners
    demoTypeSelect.addEventListener('change', updateDemoType);
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', handleMouseOut);
    
    vecAXInput.addEventListener('input', handleVectorInputChange);
    vecAYInput.addEventListener('input', handleVectorInputChange);
    vecBXInput.addEventListener('input', handleVectorInputChange);
    vecBYInput.addEventListener('input', handleVectorInputChange);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    
    // Add event listener for projection reset button directly
    if (projectionResetBtn) {
      projectionResetBtn.addEventListener('click', resetProjectionVectors);
      console.log("Reset button connected directly");
    } else {
      console.error("Projection reset button not found during initialization");
    }
    
    generateVectorsBtn.addEventListener('click', () => generateRandomVectors());
    stepBtn.addEventListener('click', gramSchmidtProcess);
    resetBtn.addEventListener('click', () => {
      orthogonalVectors = [];
      gramSchmidtStep = 0;
      drawCanvas();
    });
    
    // Initialize
    updateDemoType();
  });