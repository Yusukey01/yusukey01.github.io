// vector_space_visualizer.js
// A vanilla JavaScript implementation of the Vector Space Visualizer

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('vector-space-visualizer');
    
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
                <input type="checkbox" id="mode-3d"> 
                <span class="toggle-label">Enable 3D Mode (Experimental)</span>
              </label>
            </div>
            <div class="instruction">Click on the grid to add vectors</div>
            <div id="canvas-wrapper">
              <canvas id="vector-canvas" width="600" height="600"></canvas>
            </div>
            <div class="legend">
              <div class="legend-item"><span class="legend-color user-vector"></span> User Vectors</div>
              <div class="legend-item"><span class="legend-color span-vector"></span> Vector in Span</div>
              <div class="legend-item"><span class="legend-color linear-combo"></span> Linear Combination</div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="control-group">
              <h3>Vector Space Concepts</h3>
              <div class="concept-buttons">
                <button id="linear-combo-btn" class="concept-btn active">Linear Combinations</button>
                <button id="span-btn" class="concept-btn">Span</button>
                <button id="linear-indep-btn" class="concept-btn">Linear Independence</button>
                <button id="subspace-btn" class="concept-btn">Subspaces</button>
                <button id="basis-btn" class="concept-btn">Basis</button>
              </div>
            </div>
            
            <div class="concept-explanation" id="concept-explanation">
              <h3>Linear Combinations</h3>
              <p>A linear combination is formed by multiplying vectors by scalars and adding them together. For example, c₁v₁ + c₂v₂, where c₁ and c₂ are scalars.</p>
              <p>Add two vectors by clicking on the grid, then use the sliders below to create different linear combinations.</p>
            </div>
            
            <div class="vectors-panel" id="vectors-panel">
              <h3>Your Vectors</h3>
              <div id="vectors-list" class="vectors-list">
                <!-- Vectors will be added here dynamically -->
              </div>
              
              <div class="linear-combo-controls" id="linear-combo-controls">
                <h4>Linear Combination Weights</h4>
                <div id="weight-sliders" class="weight-sliders">
                  <!-- Weight sliders will be added here dynamically -->
                </div>
                <div id="linear-combo-equation" class="linear-combo-equation">
                  <!-- Linear combination equation will be shown here -->
                </div>
              </div>
            </div>
            
            <div class="button-group">
              <button id="clear-btn" class="btn btn-danger">Clear All Vectors</button>
              <button id="example-btn" class="btn btn-secondary">Show Example</button>
            </div>
            
            <div class="vector-operations" id="vector-operations">
              <h3>Vector Operations</h3>
              <div id="operation-controls" class="operation-controls">
                <!-- Operation specific controls will appear here -->
              </div>
            </div>
          </div>
        </div>
        
        <div class="learning-notes">
          <h3>Key Vector Space Properties:</h3>
          <ul>
            <li><strong>Closure under addition:</strong> If u and v are in the vector space, then u + v is also in the vector space.</li>
            <li><strong>Closure under scalar multiplication:</strong> If v is in the vector space and c is a scalar, then cv is also in the vector space.</li>
            <li><strong>Linear Combination:</strong> An expression of the form c₁v₁ + c₂v₂ + ... + cₙvₙ where c₁, c₂, ..., cₙ are scalars and v₁, v₂, ..., vₙ are vectors.</li>
            <li><strong>Span:</strong> The set of all possible linear combinations of a set of vectors. Span{v₁, v₂, ..., vₙ} represents the smallest subspace containing those vectors.</li>
            <li><strong>Linear Independence:</strong> A set of vectors is linearly independent if none of the vectors can be written as a linear combination of the others.</li>
            <li><strong>Basis:</strong> A linearly independent set of vectors that spans the entire vector space.</li>
          </ul>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .visualizer-container {
        font-family: Arial, sans-serif;
        margin: 20px 0;
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
        }
        
        .controls-panel {
          flex: 2;
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
      
      .visualization-mode-toggle {
        margin-bottom: 10px;
        background-color: #f0f7ff;
        padding: 8px 12px;
        border-radius: 4px;
        border-left: 3px solid #3498db;
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
      
      .control-group h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
      }
      
      .concept-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .concept-btn {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f8f8f8;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .concept-btn:hover {
        background-color: #e8e8e8;
      }
      
      .concept-btn.active {
        background-color: #3498db;
        color: white;
        border-color: #2980b9;
      }
      
      .concept-explanation {
        background-color: #f0f7ff;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 3px solid #3498db;
      }
      
      .concept-explanation h3 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 16px;
        color: #2c3e50;
      }
      
      .concept-explanation p {
        margin: 0 0 8px 0;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .vectors-panel {
        margin-bottom: 20px;
      }
      
      .vectors-panel h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
      }
      
      .vectors-list {
        margin-bottom: 15px;
      }
      
      .vector-item {
        display: flex;
        align-items: center;
        background-color: #f5f5f5;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 8px;
        border-left: 3px solid #3498db;
      }
      
      .vector-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }
      
      .vector-coords {
        font-family: monospace;
        flex-grow: 1;
      }
      
      .vector-remove {
        background: none;
        border: none;
        color: #e74c3c;
        cursor: pointer;
        font-size: 16px;
      }
      
      .linear-combo-controls {
        background-color: #f5f5f5;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 15px;
      }
      
      .linear-combo-controls h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 14px;
      }
      
      .weight-slider {
        margin-bottom: 10px;
      }
      
      .weight-slider-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        font-size: 14px;
      }
      
      .weight-slider-input {
        width: 100%;
      }
      
      .linear-combo-equation {
        font-family: monospace;
        background-color: white;
        padding: 8px;
        border-radius: 4px;
        margin-top: 10px;
        font-size: 14px;
        text-align: center;
      }
      
      .button-group {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .btn-danger {
        background-color: #e74c3c;
        color: white;
      }
      
      .btn-danger:hover {
        background-color: #c0392b;
      }
      
      .btn-secondary {
        background-color: #95a5a6;
        color: white;
      }
      
      .btn-secondary:hover {
        background-color: #7f8c8d;
      }
      
      .vector-operations {
        background-color: #f5f5f5;
        padding: 12px;
        border-radius: 8px;
      }
      
      .vector-operations h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
      }
      
      .instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 14px;
        color: #666;
      }
      
      #vector-canvas {
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        max-width: 100%;
        height: auto;
        cursor: crosshair;
      }
      
      .legend {
        margin-top: 10px;
        display: flex;
        gap: 15px;
        font-size: 14px;
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
      
      .legend-color.user-vector {
        background-color: #3498db;
      }
      
      .legend-color.span-vector {
        background-color: #2ecc71;
      }
      
      .legend-color.linear-combo {
        background-color: #e74c3c;
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
        margin-bottom: 8px;
      }
      
      .operation-controls {
        margin-top: 10px;
      }
      
      .toggle-control {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      .toggle-label {
        margin-left: 8px;
      }
      
      /* 3D specific styles */
      .axes-label {
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Initialize variables
    let is3DMode = false;
    let currentConcept = 'linear-combo';
    const userVectors = [];
    let linearComboVector = null;
    
    // Get DOM elements
    const mode3DCheckbox = document.getElementById('mode-3d');
    const vectorCanvas = document.getElementById('vector-canvas');
    const ctx = vectorCanvas.getContext('2d');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const clearBtn = document.getElementById('clear-btn');
    const exampleBtn = document.getElementById('example-btn');
    const vectorsList = document.getElementById('vectors-list');
    const weightSliders = document.getElementById('weight-sliders');
    const linearComboEquation = document.getElementById('linear-combo-equation');
    const conceptButtons = document.querySelectorAll('.concept-btn');
    const conceptExplanation = document.getElementById('concept-explanation');
    const linearComboControls = document.getElementById('linear-combo-controls');
    const vectorOperations = document.getElementById('vector-operations');
    const operationControls = document.getElementById('operation-controls');
    
    // Set canvas dimensions
    const canvasWidth = 600;
    const canvasHeight = 600;
    const gridSize = 20;
    
    // Colors
    const colors = {
      grid: '#ddd',
      axes: '#666',
      userVector: '#3498db',
      spanVector: '#2ecc71',
      linearCombo: '#e74c3c',
      background: '#fff'
    };
    
    // Create container for 3D renderer
    const container3D = document.createElement('div');
    container3D.id = 'renderer-container';
    container3D.style.display = 'none';
    container3D.style.width = '100%';
    container3D.style.height = '600px';
    container3D.style.borderRadius = '4px';
    container3D.style.backgroundColor = '#fff';
    container3D.style.overflow = 'hidden';
    canvasWrapper.appendChild(container3D);
    
    // Helper functions
    function canvasToGrid(x, y) {
      return {
        x: (x - canvasWidth / 2) / gridSize,
        y: (canvasHeight / 2 - y) / gridSize
      };
    }
    
    function gridToCanvas(x, y) {
      return {
        x: canvasWidth / 2 + x * gridSize,
        y: canvasHeight / 2 - y * gridSize
      };
    }
    
    function roundToGrid(value) {
      return Math.round(value * 2) / 2;
    }
    
    // Drawing functions for 2D
    function drawGrid() {
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      
      // Calculate grid range based on canvas size
      const gridRange = Math.ceil(canvasWidth / (2 * gridSize));
      
      // Draw vertical grid lines
      for (let x = -gridRange; x <= gridRange; x++) {
        ctx.beginPath();
        ctx.moveTo(canvasWidth / 2 + x * gridSize, 0);
        ctx.lineTo(canvasWidth / 2 + x * gridSize, canvasHeight);
        ctx.stroke();
      }
      
      // Draw horizontal grid lines
      for (let y = -gridRange; y <= gridRange; y++) {
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2 - y * gridSize);
        ctx.lineTo(canvasWidth, canvasHeight / 2 - y * gridSize);
        ctx.stroke();
      }
      
      // Draw axes with thicker lines
      ctx.strokeStyle = colors.axes;
      ctx.lineWidth = 2;
      
      // x-axis
      ctx.beginPath();
      ctx.moveTo(0, canvasHeight / 2);
      ctx.lineTo(canvasWidth, canvasHeight / 2);
      ctx.stroke();
      
      // y-axis
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2, 0);
      ctx.lineTo(canvasWidth / 2, canvasHeight);
      ctx.stroke();
      
      // Add axis labels and ticks
      ctx.fillStyle = colors.axes;
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // x-axis label
      ctx.fillText('x', canvasWidth - 15, canvasHeight / 2 + 15);
      
      // y-axis label
      ctx.fillText('y', canvasWidth / 2 + 15, 15);
      
      // Draw ticks on x-axis
      for (let x = -gridRange; x <= gridRange; x++) {
        if (x !== 0 && x % 5 === 0) {
          const tickX = canvasWidth / 2 + x * gridSize;
          ctx.beginPath();
          ctx.moveTo(tickX, canvasHeight / 2 - 5);
          ctx.lineTo(tickX, canvasHeight / 2 + 5);
          ctx.stroke();
          ctx.fillText(x.toString(), tickX, canvasHeight / 2 + 15);
        }
      }
      
      // Draw ticks on y-axis
      for (let y = -gridRange; y <= gridRange; y++) {
        if (y !== 0 && y % 5 === 0) {
          const tickY = canvasHeight / 2 - y * gridSize;
          ctx.beginPath();
          ctx.moveTo(canvasWidth / 2 - 5, tickY);
          ctx.lineTo(canvasWidth / 2 + 5, tickY);
          ctx.stroke();
          ctx.fillText(y.toString(), canvasWidth / 2 - 15, tickY);
        }
      }
    }
    
    function drawVector(from, to, color, lineWidth = 2, drawArrow = true) {
      const fromCanvas = gridToCanvas(from.x, from.y);
      const toCanvas = gridToCanvas(to.x, to.y);
      
      // Draw the line
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(fromCanvas.x, fromCanvas.y);
      ctx.lineTo(toCanvas.x, toCanvas.y);
      ctx.stroke();
      
      // Draw the arrowhead
      if (drawArrow) {
        const angle = Math.atan2(toCanvas.y - fromCanvas.y, toCanvas.x - fromCanvas.x);
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6; // 30 degrees
        
        ctx.beginPath();
        ctx.moveTo(toCanvas.x, toCanvas.y);
        ctx.lineTo(
          toCanvas.x - arrowLength * Math.cos(angle - arrowAngle),
          toCanvas.y - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.lineTo(
          toCanvas.x - arrowLength * Math.cos(angle + arrowAngle),
          toCanvas.y - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
    
    function drawUserVectors() {
      userVectors.forEach((vector, index) => {
        const origin = { x: 0, y: 0 };
        drawVector(origin, vector, colors.userVector);
        
        // Add a label near the vector
        const labelPos = gridToCanvas(vector.x * 0.8, vector.y * 0.8);
        ctx.fillStyle = colors.userVector;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`v${index + 1}`, labelPos.x, labelPos.y);
      });
    }
    
    function drawLinearCombination() {
      if (!linearComboVector || userVectors.length === 0) return;
      
      const origin = { x: 0, y: 0 };
      
      // Draw component vectors with dashed lines
      ctx.setLineDash([5, 5]);
      userVectors.forEach((vector, index) => {
        // Get weight from slider or default to 1
        const weightInput = document.getElementById(`weight-${index}`);
        const weight = weightInput ? parseFloat(weightInput.value) : 1;
        
        if (weight !== 0) {
          // Draw scaled vector if weight is not zero
          const scaledVector = { x: vector.x * weight, y: vector.y * weight };
          
          // If we have multiple vectors, place them end-to-end
          let startPoint = origin;
          
          // For the first vector or if there's only one vector
          if (index === 0) {
            startPoint = origin;
          } 
          // For subsequent vectors, start from where the previous ended
          else {
            // Calculate sum of previous vectors
            startPoint = { x: 0, y: 0 };
            for (let i = 0; i < index; i++) {
              const prevWeight = document.getElementById(`weight-${i}`).value;
              startPoint.x += userVectors[i].x * prevWeight;
              startPoint.y += userVectors[i].y * prevWeight;
            }
          }
          
          // End point is the start plus the scaled vector
          const endPoint = { 
            x: startPoint.x + scaledVector.x, 
            y: startPoint.y + scaledVector.y 
          };
          
          // Draw component with dashed line
          drawVector(startPoint, endPoint, colors.userVector, 1.5, false);
        }
      });
      ctx.setLineDash([]);
      
      // Draw the final linear combination vector
      drawVector(origin, linearComboVector, colors.linearCombo);
      
      // Add a label
      const labelPos = gridToCanvas(linearComboVector.x * 0.8, linearComboVector.y * 0.8);
      ctx.fillStyle = colors.linearCombo;
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('linear combo', labelPos.x, labelPos.y);
    }
    
    function drawSpan() {
      if (userVectors.length === 0) return;
      
      if (userVectors.length === 1) {
        // Draw the spanning line (1D subspace)
        const vector = userVectors[0];
        const scale = 15; // Scale factor to extend the line
        
        const start = { x: -vector.x * scale, y: -vector.y * scale };
        const end = { x: vector.x * scale, y: vector.y * scale };
        
        ctx.strokeStyle = colors.spanVector;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const startCanvas = gridToCanvas(start.x, start.y);
        const endCanvas = gridToCanvas(end.x, end.y);
        ctx.moveTo(startCanvas.x, startCanvas.y);
        ctx.lineTo(endCanvas.x, endCanvas.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label the span
        ctx.fillStyle = colors.spanVector;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelPos = gridToCanvas(vector.x * 1.2, vector.y * 1.2);
        ctx.fillText('span', labelPos.x, labelPos.y);
      } 
      else if (userVectors.length === 2) {
        // Check if vectors are linearly independent (not parallel)
        const v1 = userVectors[0];
        const v2 = userVectors[1];
        const determinant = v1.x * v2.y - v1.y * v2.x;
        
        if (Math.abs(determinant) < 0.001) {
          // Vectors are linearly dependent, draw a line
          const vector = v1; // Use the first vector
          const scale = 15;
          
          const start = { x: -vector.x * scale, y: -vector.y * scale };
          const end = { x: vector.x * scale, y: vector.y * scale };
          
          ctx.strokeStyle = colors.spanVector;
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          const startCanvas = gridToCanvas(start.x, start.y);
          const endCanvas = gridToCanvas(end.x, end.y);
          ctx.moveTo(startCanvas.x, startCanvas.y);
          ctx.lineTo(endCanvas.x, endCanvas.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Label
          ctx.fillStyle = colors.spanVector;
          ctx.font = '14px Arial';
          ctx.fillText('span (1D)', gridToCanvas(vector.x * 1.2, vector.y * 1.2).x, 
                                gridToCanvas(vector.x * 1.2, vector.y * 1.2).y);
        } 
        else {
          // Vectors span a plane (2D)
          // Draw a parallelogram to represent the span
          const scale = 2;
          const corner1 = { x: v1.x * scale, y: v1.y * scale };
          const corner2 = { x: v2.x * scale, y: v2.y * scale };
          const corner3 = { x: v1.x * scale + v2.x * scale, y: v1.y * scale + v2.y * scale };
          const corner4 = { x: v1.x * scale - v2.x * scale, y: v1.y * scale - v2.y * scale };
          
          // Draw the parallelogram with dashed lines
          ctx.strokeStyle = colors.spanVector;
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          
          // Draw the boundary
          ctx.beginPath();
          const c1 = gridToCanvas(corner1.x, corner1.y);
          const c2 = gridToCanvas(corner2.x, corner2.y);
          const c3 = gridToCanvas(corner3.x, corner3.y);
          const c4 = gridToCanvas(-corner1.x, -corner1.y);
          const c5 = gridToCanvas(-corner2.x, -corner2.y);
          const c6 = gridToCanvas(-corner3.x, -corner3.y);
          
          // Connect the points to form a shape representing the span
          ctx.moveTo(c4.x, c4.y);
          ctx.lineTo(c5.x, c5.y);
          ctx.lineTo(c6.x, c6.y);
          ctx.lineTo(c3.x, c3.y);
          ctx.lineTo(c1.x, c1.y);
          ctx.lineTo(c2.x, c2.y);
          
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Label the span
          ctx.fillStyle = colors.spanVector;
          ctx.font = '14px Arial';
          ctx.fillText('span (2D)', gridToCanvas((corner1.x + corner2.x) / 2, (corner1.y + corner2.y) / 2).x, 
                                gridToCanvas((corner1.x + corner2.x) / 2, (corner1.y + corner2.y) / 2).y);
        }
      }
    }
    
    function drawBasis() {
      if (userVectors.length === 0) return;
      
      // Check if vectors form a basis
      if (userVectors.length === 2) {
        const v1 = userVectors[0];
        const v2 = userVectors[1];
        const determinant = v1.x * v2.y - v1.y * v2.x;
        
        if (Math.abs(determinant) < 0.001) {
          // Not a basis (linearly dependent)
          ctx.fillStyle = '#e74c3c';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Not a basis (linearly dependent vectors)', canvasWidth / 2, 30);
        } else {
          // Is a basis for R2
          ctx.fillStyle = '#2ecc71';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Forms a basis for ℝ²', canvasWidth / 2, 30);
          
          // Draw coordinate system with these basis vectors
          drawBasisCoordinateSystem(v1, v2);
        }
      } 
      else if (userVectors.length === 1) {
        // Not a basis for R2 (insufficient vectors)
        ctx.fillStyle = '#e74c3c';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Not a basis for ℝ² (need 2 linearly independent vectors)', canvasWidth / 2, 30);
      }
      else if (userVectors.length > 2) {
        // Not a basis (too many vectors)
        ctx.fillStyle = '#e74c3c';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Not a basis for ℝ² (too many vectors)', canvasWidth / 2, 30);
      }
    }
    
    function drawBasisCoordinateSystem(v1, v2) {
      // Draw lighter grid lines for the new coordinate system
      ctx.strokeStyle = 'rgba(46, 204, 113, 0.2)';
      ctx.lineWidth = 1;
      
      const range = 10;
      
      // Draw grid lines parallel to v1
      for (let i = -range; i <= range; i++) {
        if (i === 0) continue; // Skip the origin line
        
        ctx.beginPath();
        const start = { x: i * v2.x, y: i * v2.y };
        const end = { 
          x: i * v2.x + range * v1.x, 
          y: i * v2.y + range * v1.y 
        };
        
        const startCanvas = gridToCanvas(start.x, start.y);
        const endCanvas = gridToCanvas(end.x, end.y);
        ctx.moveTo(startCanvas.x, startCanvas.y);
        ctx.lineTo(endCanvas.x, endCanvas.y);
        ctx.stroke();
      }
      
      // Draw grid lines parallel to v2
      for (let i = -range; i <= range; i++) {
        if (i === 0) continue; // Skip the origin line
        
        ctx.beginPath();
        const start = { x: i * v1.x, y: i * v1.y };
        const end = { 
          x: i * v1.x + range * v2.x, 
          y: i * v1.y + range * v2.y 
        };
        
        const startCanvas = gridToCanvas(start.x, start.y);
        const endCanvas = gridToCanvas(end.x, end.y);
        ctx.moveTo(startCanvas.x, startCanvas.y);
        ctx.lineTo(endCanvas.x, endCanvas.y);
        ctx.stroke();
      }
      
      // Draw coordinate numbers on new basis
      ctx.fillStyle = colors.spanVector;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        
        // Label points on v1 axis
        const v1Point = { x: i * v1.x, y: i * v1.y };
        const v1Canvas = gridToCanvas(v1Point.x, v1Point.y);
        ctx.fillText(`(${i},0)`, v1Canvas.x + 15, v1Canvas.y - 15);
        
        // Label points on v2 axis
        const v2Point = { x: i * v2.x, y: i * v2.y };
        const v2Canvas = gridToCanvas(v2Point.x, v2Point.y);
        ctx.fillText(`(0,${i})`, v2Canvas.x + 15, v2Canvas.y - 15);
      }
    }
    
    function drawLinearIndependence() {
      if (userVectors.length <= 1) {
        // Can't determine independence with just one vector
        ctx.fillStyle = '#3498db';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Need at least 2 vectors to check linear independence', canvasWidth / 2, 30);
        return;
      }
      
      // Check if vectors are linearly independent (for 2D case)
      let isIndependent = true;
      let explanation = '';
      
      if (userVectors.length === 2) {
        const v1 = userVectors[0];
        const v2 = userVectors[1];
        
        // Check if one is a scalar multiple of the other
        const determinant = v1.x * v2.y - v1.y * v2.x;
        
        if (Math.abs(determinant) < 0.001) {
          isIndependent = false;
          
          // Determine relationship
          if (Math.abs(v1.x) < 0.001 && Math.abs(v1.y) < 0.001) {
            explanation = 'v₁ is the zero vector';
          } else if (Math.abs(v2.x) < 0.001 && Math.abs(v2.y) < 0.001) {
            explanation = 'v₂ is the zero vector';
          } else {
            // Find scalar relationship
            let scalar = 0;
            if (Math.abs(v1.x) > 0.001) {
              scalar = v2.x / v1.x;
            } else {
              scalar = v2.y / v1.y;
            }
            explanation = `v₂ = ${scalar.toFixed(2)} · v₁`;
          }
        }
      } else if (userVectors.length > 2) {
        
        let foundDependency = false;
        
        // Check each vector to see if it's a linear combination of the others
        for (let i = 0; i < userVectors.length && !foundDependency; i++) {
            const testVector = userVectors[i];
            
            // Try to express this vector as a combination of all the others
            // This would require solving a system of equations
            // For simplicity, let's check if this vector is parallel to any other vector
            for (let j = 0; j < userVectors.length && !foundDependency; j++) {
            if (i === j) continue; // Skip comparing a vector to itself
            
            const otherVector = userVectors[j];
            
            // Check if vectors are parallel (one is scalar multiple of the other)
            if ((Math.abs(testVector.x) < 0.001 && Math.abs(testVector.y) < 0.001) || 
                (Math.abs(otherVector.x) < 0.001 && Math.abs(otherVector.y) < 0.001)) {
                // One is a zero vector
                foundDependency = true;
                isIndependent = false;
                
                if (Math.abs(testVector.x) < 0.001 && Math.abs(testVector.y) < 0.001) {
                explanation = `v${i+1} is the zero vector`;
                } else {
                explanation = `v${j+1} is the zero vector`;
                }
            } else if (Math.abs(testVector.x * otherVector.y - testVector.y * otherVector.x) < 0.001) {
                // Vectors are parallel
                foundDependency = true;
                isIndependent = false;
                
                // Find scalar relationship
                let scalar = 0;
                if (Math.abs(otherVector.x) > 0.001) {
                scalar = testVector.x / otherVector.x;
                } else {
                scalar = testVector.y / otherVector.y;
                }
                explanation = `v${i+1} = ${scalar.toFixed(2)} · v${j+1}`;
            }
            }
        }
        // If no dependency was found, the vectors are linearly independent
        if (!foundDependency) {
            isIndependent = true;
        }
            
      }
      
      // Draw results on canvas
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      
      if (isIndependent) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('Vectors are linearly independent', canvasWidth / 2, 30);
      } else {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('Vectors are linearly dependent', canvasWidth / 2, 30);
        ctx.fillText(explanation, canvasWidth / 2, 55);
      }
    }
    
    function drawSubspace() {
      if (userVectors.length === 0) return;
      
      // In R², possible subspaces are:
      // 1. The origin (0D)
      // 2. A line through the origin (1D)
      // 3. The entire plane (2D)
      
      let subspaceDimension = 0;
      let explanation = '';
      
      if (userVectors.length === 1) {
        const v = userVectors[0];
        
        // Check if the vector is non-zero
        if (Math.abs(v.x) > 0.001 || Math.abs(v.y) > 0.001) {
          subspaceDimension = 1;
          explanation = 'Line through the origin (1D subspace)';
          
          // Draw the line
          const scale = 15;
          
          ctx.strokeStyle = colors.spanVector;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          
          const start = gridToCanvas(-v.x * scale, -v.y * scale);
          const end = gridToCanvas(v.x * scale, v.y * scale);
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          subspaceDimension = 0;
          explanation = 'Only the origin (0D subspace)';
        }
      } else if (userVectors.length >= 2) {
        // Check if vectors are linearly independent
        const v1 = userVectors[0];
        const v2 = userVectors[1];
        const determinant = v1.x * v2.y - v1.y * v2.x;
        
        if (Math.abs(determinant) < 0.001) {
          // Vectors are linearly dependent
          if ((Math.abs(v1.x) < 0.001 && Math.abs(v1.y) < 0.001) &&
              (Math.abs(v2.x) < 0.001 && Math.abs(v2.y) < 0.001)) {
            subspaceDimension = 0;
            explanation = 'Only the origin (0D subspace)';
          } else {
            subspaceDimension = 1;
            explanation = 'Line through the origin (1D subspace)';
            
            // Draw the line using the non-zero vector
            const v = (Math.abs(v1.x) > 0.001 || Math.abs(v1.y) > 0.001) ? v1 : v2;
            const scale = 15;
            
            ctx.strokeStyle = colors.spanVector;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            
            const start = gridToCanvas(-v.x * scale, -v.y * scale);
            const end = gridToCanvas(v.x * scale, v.y * scale);
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else {
          // Vectors are linearly independent
          subspaceDimension = 2;
          explanation = 'The entire plane (2D subspace)';
          
          // Draw a shaded region representing the plane
          ctx.fillStyle = 'rgba(46, 204, 113, 0.1)';
          ctx.beginPath();
          
          // Create a large rectangle covering the visible area
          const gridRange = Math.ceil(canvasWidth / (2 * gridSize));
          
          ctx.rect(0, 0, canvasWidth, canvasHeight);
          ctx.fill();
        }
      }
      
      // Display the subspace information
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.spanVector;
      ctx.fillText(`Subspace dimension: ${subspaceDimension}`, canvasWidth / 2, 30);
      ctx.fillText(explanation, canvasWidth / 2, 55);
    }
    
    // Draw canvas function
    function drawCanvas() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawGrid();
      drawUserVectors();
      
      // Draw different visualizations based on current concept
      if (currentConcept === 'linear-combo') {
        drawLinearCombination();
      } else if (currentConcept === 'span') {
        drawSpan();
      } else if (currentConcept === 'basis') {
        drawBasis();
      } else if (currentConcept === 'linear-indep') {
        drawLinearIndependence();
      } else if (currentConcept === 'subspace') {
        drawSubspace();
      }
    }
    
    // Function to update the vectors list UI
    function updateVectorsList() {
      vectorsList.innerHTML = '';
      
      userVectors.forEach((vector, index) => {
        const vectorItem = document.createElement('div');
        vectorItem.className = 'vector-item';
        
        const vectorColor = document.createElement('div');
        vectorColor.className = 'vector-color';
        vectorColor.style.backgroundColor = colors.userVector;
        
        const vectorCoords = document.createElement('div');
        vectorCoords.className = 'vector-coords';
        vectorCoords.textContent = `v${index + 1} = (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)})`;
        
        const vectorRemove = document.createElement('button');
        vectorRemove.className = 'vector-remove';
        vectorRemove.innerHTML = '&times;';
        vectorRemove.onclick = () => {
          userVectors.splice(index, 1);
          updateVectorsList();
          updateWeightSliders();
          calculateLinearCombo();
          drawCanvas();
        };
        
        vectorItem.appendChild(vectorColor);
        vectorItem.appendChild(vectorCoords);
        vectorItem.appendChild(vectorRemove);
        vectorsList.appendChild(vectorItem);
      });
    }
    
    // Function to update weight sliders
    function updateWeightSliders() {
      weightSliders.innerHTML = '';
      
      userVectors.forEach((vector, index) => {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'weight-slider';
        
        const sliderLabel = document.createElement('div');
        sliderLabel.className = 'weight-slider-label';
        
        const sliderName = document.createElement('span');
        sliderName.textContent = `Weight for v${index + 1}:`;
        
        const sliderValue = document.createElement('span');
        sliderValue.id = `weight-value-${index}`;
        sliderValue.textContent = '1.0';
        
        sliderLabel.appendChild(sliderName);
        sliderLabel.appendChild(sliderValue);
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `weight-${index}`;
        slider.className = 'weight-slider-input';
        slider.min = '-5';
        slider.max = '5';
        slider.step = '0.5';
        slider.value = '1';
        
        slider.oninput = () => {
          document.getElementById(`weight-value-${index}`).textContent = slider.value;
          calculateLinearCombo();
          drawCanvas();
        };
        
        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(slider);
        weightSliders.appendChild(sliderContainer);
      });
      
      // Show/hide linear combo controls based on whether we have vectors
      if (userVectors.length > 0) {
        linearComboControls.style.display = 'block';
      } else {
        linearComboControls.style.display = 'none';
      }
    }
    
    // Calculate linear combination from weight sliders
    function calculateLinearCombo() {
      if (userVectors.length === 0) {
        linearComboVector = null;
        linearComboEquation.textContent = '';
        return;
      }
      
      linearComboVector = { x: 0, y: 0 };
      let equation = '';
      
      userVectors.forEach((vector, index) => {
        const weightInput = document.getElementById(`weight-${index}`);
        if (!weightInput) return;
        
        const weight = parseFloat(weightInput.value);
        linearComboVector.x += vector.x * weight;
        linearComboVector.y += vector.y * weight;
        
        // Add term to equation
        if (index > 0) {
          equation += ' + ';
        }
        
        equation += `${weight.toFixed(1)} · v${index + 1}`;
      });
      
      // Show the equation
      linearComboEquation.textContent = equation + ` = (${linearComboVector.x.toFixed(1)}, ${linearComboVector.y.toFixed(1)})`;
    }
    
    function convertToBasisCoordinates(x, y) {
      if (userVectors.length !== 2) return;
      
      const v1 = userVectors[0];
      const v2 = userVectors[1];
      
      // Check if vectors are linearly independent
      const determinant = v1.x * v2.y - v1.y * v2.x;
      if (Math.abs(determinant) < 0.001) {
        alert('Cannot convert: basis vectors are linearly dependent.');
        return;
      }
      
      // Solve the system of equations:
      // a*v1.x + b*v2.x = x
      // a*v1.y + b*v2.y = y
      
      // Using Cramer's rule
      const a = (x * v2.y - y * v2.x) / determinant;
      const b = (v1.x * y - v1.y * x) / determinant;
      
      // Display result
      alert(`The point (${x},${y}) in standard coordinates is (${a.toFixed(2)},${b.toFixed(2)}) in the basis {v₁,v₂}.`);
      
      // Mark the point on the canvas
      const point = { x, y };
      drawSpecialPoint(point, `(${a.toFixed(1)},${b.toFixed(1)})_B`);
    }
    
    function drawSpecialPoint(point, label) {
      const canvasPoint = gridToCanvas(point.x, point.y);
      
      // Draw point
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw label
      ctx.fillStyle = '#e74c3c';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, canvasPoint.x, canvasPoint.y - 15);
    }
    
    // Event handlers
    function handleCanvasClick(e) {
      if (is3DMode) return; // 3D mode has its own handlers
      
      const rect = vectorCanvas.getBoundingClientRect();
      const scaleX = vectorCanvas.width / rect.width;
      const scaleY = vectorCanvas.height / rect.height;
      
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;
      
      // Convert to grid coordinates and round to nearest grid point
      const gridPoint = canvasToGrid(clickX, clickY);
      gridPoint.x = roundToGrid(gridPoint.x);
      gridPoint.y = roundToGrid(gridPoint.y);
      
      // Add new vector
      userVectors.push(gridPoint);
      
      // Update UI
      updateVectorsList();
      updateWeightSliders();
      calculateLinearCombo();
      drawCanvas();
    }
    
    function handleModeChange() {
      is3DMode = mode3DCheckbox.checked;
      
      if (is3DMode) {
        // Switch to 3D mode
        vectorCanvas.style.display = 'none';
        container3D.style.display = 'block';
        
        // Initialize 3D visualization
        init3DVisualization();
      } else {
        // Switch back to 2D mode
        vectorCanvas.style.display = 'block';
        container3D.style.display = 'none';
        
        // Redraw canvas
        drawCanvas();
      }
    }
    
    function handleConceptChange(concept) {
      // Update active concept
      currentConcept = concept;
      
      // Update button styles
      conceptButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id.startsWith(concept)) {
          btn.classList.add('active');
        }
      });
      
      // Update explanation text
      const explanations = {
        'linear-combo': `
          <h3>Linear Combinations</h3>
          <p>A linear combination is formed by multiplying vectors by scalars and adding them together. For example, c₁v₁ + c₂v₂, where c₁ and c₂ are scalars.</p>
          <p>Add two vectors by clicking on the grid, then use the sliders below to create different linear combinations.</p>
        `,
        'span': `
          <h3>Span</h3>
          <p>The span of a set of vectors is the set of all possible linear combinations of those vectors. It's the smallest subspace containing all the vectors.</p>
          <p>In ℝ², the span of:</p>
          <ul>
            <li>One non-zero vector is a line through the origin</li>
            <li>Two linearly independent vectors is the entire plane</li>
          </ul>
        `,
        'linear-indep': `
          <h3>Linear Independence</h3>
          <p>A set of vectors is linearly independent if none of the vectors can be written as a linear combination of the others.</p>
          <p>For example, vectors v₁ and v₂ are linearly independent if the only solution to c₁v₁ + c₂v₂ = 0 is c₁ = c₂ = 0.</p>
        `,
        'subspace': `
          <h3>Subspaces</h3>
          <p>A subspace is a subset of a vector space that is itself a vector space. It must contain the zero vector and be closed under addition and scalar multiplication.</p>
          <p>In ℝ², the only subspaces are:</p>
          <ul>
            <li>The origin (0D)</li>
            <li>Lines through the origin (1D)</li>
            <li>The entire plane (2D)</li>
          </ul>
        `,
        'basis': `
          <h3>Basis</h3>
          <p>A basis is a linearly independent set of vectors that spans the entire vector space.</p>
          <p>In ℝ², a basis consists of exactly 2 linearly independent vectors. These vectors can be used as a coordinate system for the space.</p>
          <p>Add two linearly independent vectors to see a coordinate system based on them.</p>
        `
      };
      
      conceptExplanation.innerHTML = explanations[concept];
      
      // Show/hide specific controls
      if (concept === 'linear-combo') {
        linearComboControls.style.display = userVectors.length > 0 ? 'block' : 'none';
      } else {
        linearComboControls.style.display = 'none';
      }
      
      // Add concept-specific operations
      updateOperationControls(concept);
      
      // Redraw the canvas
      drawCanvas();
    }
    
    function updateOperationControls(concept) {
      operationControls.innerHTML = '';
      
      if (concept === 'linear-combo' && userVectors.length > 0) {
        // Add a "Show parallelogram" button for linear combinations
        const showParallelogramBtn = document.createElement('button');
        showParallelogramBtn.textContent = 'Show Parallelogram';
        showParallelogramBtn.className = 'btn btn-secondary';
        showParallelogramBtn.onclick = () => {
          // Force weights to 1 to show the parallelogram rule
          if (userVectors.length >= 2) {
            document.getElementById('weight-0').value = '1';
            document.getElementById('weight-value-0').textContent = '1';
            document.getElementById('weight-1').value = '1';
            document.getElementById('weight-value-1').textContent = '1';
            calculateLinearCombo();
            drawCanvas();
          }
        };
        operationControls.appendChild(showParallelogramBtn);
      }
      
      if (concept === 'basis' && userVectors.length === 2) {
        // Add a "Convert to basis" button to show coordinates in this basis
        const findCoordsBtn = document.createElement('button');
        findCoordsBtn.textContent = 'Convert Point to Basis Coordinates';
        findCoordsBtn.className = 'btn btn-secondary';
        findCoordsBtn.onclick = () => {
          // Prompt the user for a point in standard coordinates
          const pointStr = prompt('Enter a point in standard coordinates (x,y):', '3,2');
          if (pointStr) {
            const coords = pointStr.split(',').map(c => parseFloat(c.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              convertToBasisCoordinates(coords[0], coords[1]);
            } else {
              alert('Invalid coordinates. Please enter two numbers separated by a comma.');
            }
          }
        };
        operationControls.appendChild(findCoordsBtn);
      }
    }
    
    function clearAllVectors() {
      userVectors.length = 0;
      linearComboVector = null;
      updateVectorsList();
      updateWeightSliders();
      drawCanvas();
    }
    
    // 3D visualization (experimental)
    function init3DVisualization() {
      // Load Three.js library dynamically
      if (typeof THREE === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => {
          // Also load OrbitControls
          const controlsScript = document.createElement('script');
          controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js';
          controlsScript.onload = setup3DScene;
          document.head.appendChild(controlsScript);
        };
        document.head.appendChild(script);
      } else {
        setup3DScene();
      }
    }
    
    function setup3DScene() {
      const width = container3D.clientWidth;
      const height = 600;
      
      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);
      
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
      
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      container3D.innerHTML = '';
      container3D.appendChild(renderer.domElement);
      
      // Add controls for rotation
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      
      // Add coordinate axes
      const axesHelper = new THREE.AxesHelper(10);
      scene.add(axesHelper);
      
      // Add grid
      const gridHelper = new THREE.GridHelper(20, 20);
      gridHelper.rotation.x = Math.PI / 2;
      scene.add(gridHelper);
      
      // Add axis labels
      addAxisLabel('X', 11, 0, 0, scene);
      addAxisLabel('Y', 0, 11, 0, scene);
      addAxisLabel('Z', 0, 0, 11, scene);
      
      // Add reference vectors (standard basis)
      const origin = new THREE.Vector3(0, 0, 0);
      
      // e1 = (1,0,0)
      addVector(origin, new THREE.Vector3(10, 0, 0), 0xff0000, scene);
      
      // e2 = (0,1,0)
      addVector(origin, new THREE.Vector3(0, 10, 0), 0x00ff00, scene);
      
      // e3 = (0,0,1)
      addVector(origin, new THREE.Vector3(0, 0, 10), 0x0000ff, scene);
      
      // Function to render the scene
      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      
      // Add event listener for clicking in 3D space
      renderer.domElement.addEventListener('dblclick', event => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / width) * 2 - 1;
        mouse.y = -(event.clientY / height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Create a plane for intersection at y=0
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        // Round to nearest 0.5
        intersectPoint.x = Math.round(intersectPoint.x * 2) / 2;
        intersectPoint.z = Math.round(intersectPoint.z * 2) / 2;
        intersectPoint.y = 0;
        
        // Add a new user vector in 3D
        const newVector = { 
          x: intersectPoint.x, 
          y: intersectPoint.z,  // Map z-coordinate to y for compatibility with 2D
          z: 0 // For now, keep vectors in the xy-plane
        };
        
        userVectors.push(newVector);
        addUserVector(newVector, scene);
        
        updateVectorsList();
        updateWeightSliders();
        calculateLinearCombo();
      });
      
      // Function to add a user vector
      function addUserVector(vector, scene) {
        const origin = new THREE.Vector3(0, 0, 0);
        const vecEnd = new THREE.Vector3(vector.x, vector.z, vector.y);
        addVector(origin, vecEnd, 0x3498db, scene);
      }
      
      // Start animation loop
      animate();
      
      // Add existing user vectors to the scene
      userVectors.forEach(vector => {
        addUserVector(vector, scene);
      });
    }
    
    function addAxisLabel(text, x, y, z, scene) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      
      context.fillStyle = 'rgba(255, 255, 255, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = 'Bold 40px Arial';
      context.fillStyle = x > 0 ? 'red' : (y > 0 ? 'green' : 'blue');
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(x, y, z);
      sprite.scale.set(1, 1, 1);
      scene.add(sprite);
    }
    
    function addVector(from, to, color, scene) {
      // Create the arrow
      const direction = new THREE.Vector3().subVectors(to, from).normalize();
      const length = from.distanceTo(to);
      
      const arrowHelper = new THREE.ArrowHelper(
        direction,
        from,
        length,
        color,
        length * 0.1,  // Head length
        length * 0.05   // Head width
      );
      
      scene.add(arrowHelper);
      return arrowHelper;
    }

    //example
    function loadExample() {
        clearAllVectors();
        
        // Add example vectors based on current concept
        if (currentConcept === 'linear-combo' || currentConcept === 'span') {
        userVectors.push({ x: 3, y: 1 });
        userVectors.push({ x: 1, y: 2 });
        } else if (currentConcept === 'linear-indep') {
        userVectors.push({ x: 3, y: 1 });
        userVectors.push({ x: 1, y: 2 });
        // Add a linearly dependent vector
        userVectors.push({ x: 6, y: 2 });
        } else if (currentConcept === 'subspace') {
        userVectors.push({ x: 2, y: 1 });
        userVectors.push({ x: -4, y: -2 });
        } else if (currentConcept === 'basis') {
        userVectors.push({ x: 2, y: 1 });
        userVectors.push({ x: -1, y: 2 });
        }
        
        updateVectorsList();
        updateWeightSliders();
        calculateLinearCombo();
        drawCanvas();
    }
    
    // Add event listeners
    vectorCanvas.addEventListener('click', handleCanvasClick);
    mode3DCheckbox.addEventListener('change', handleModeChange);
    clearBtn.addEventListener('click', clearAllVectors);
    exampleBtn.addEventListener('click', loadExample);
    

    //  concept button handlers
    conceptButtons.forEach(button => {
        button.addEventListener('click', function() {
        // Extract concept name properly
        let id = this.id;
        let concept = '';
        
        if (id === 'linear-combo-btn') {
            concept = 'linear-combo';
        } else if (id === 'span-btn') {
            concept = 'span';
        } else if (id === 'linear-indep-btn') {
            concept = 'linear-indep';
        } else if (id === 'subspace-btn') {
            concept = 'subspace';
        } else if (id === 'basis-btn') {
            concept = 'basis';
        }
        
        handleConceptChange(concept);
        });
    });
    
    // Initialize with default concept
    handleConceptChange(currentConcept);
    
    // Initial draw
    drawCanvas();
  });