// linear_transformation_visualizer.js
// A vanilla JavaScript implementation of the Linear Transformation Visualizer

document.addEventListener('DOMContentLoaded', function() {
  // Get the container element
  const container = document.getElementById('linear-transformation-visualizer');
  
  if (!container) {
    console.error('Container element not found!');
    return;
  }
  
  // Create HTML structure
  container.innerHTML = `
    <div class="visualizer-container">
      <div class="controls-panel">
        <div class="control-group">
          <label for="preset-transform">Preset Transformations:</label>
          <select id="preset-transform" class="full-width">
            <option value="identity">Identity (no change)</option>
            <option value="rotate90CW">Rotate 90° clockwise</option>
            <option value="rotate90CCW">Rotate 90° counterclockwise</option>
            <option value="rotate180">Rotate 180°</option>
            <option value="scale2">Scale by 2</option>
            <option value="scaleX">Scale X by 2</option>
            <option value="scaleY">Scale Y by 2</option>
            <option value="reflectX">Reflect across X-axis</option>
            <option value="reflectY">Reflect across Y-axis</option>
            <option value="reflectOrigin">Reflect through origin</option>
            <option value="shearX">Shear X</option>
            <option value="shearY">Shear Y</option>
          </select>
        </div>
        
        <div class="control-group">
          <label for="shape-select">Select Shape:</label>
          <select id="shape-select" class="full-width">
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
            <option value="rectangle">Rectangle</option>
            <option value="pentagon">Pentagon</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>Transformation Matrix:</label>
          <div class="matrix-input">
            <div class="matrix-bracket">[</div>
            <div class="matrix-cells">
              <input type="text" id="m00" value="1" inputmode="decimal" aria-label="Matrix element row 1 column 1" title="Matrix element row 1 column 1">
              <input type="text" id="m01" value="0" inputmode="decimal" aria-label="Matrix element row 1 column 2" title="Matrix element row 1 column 2">
              <input type="text" id="m10" value="0" inputmode="decimal" aria-label="Matrix element row 2 column 1" title="Matrix element row 2 column 1">
              <input type="text" id="m11" value="1" inputmode="decimal" aria-label="Matrix element row 2 column 2" title="Matrix element row 2 column 2">
            </div>
            <div class="matrix-bracket">]</div>
          </div>
          <div class="matrix-hint">Enter any values to create custom transformations</div>
        </div>
        
        <div class="control-group">
          <div class="determinant-info">
            <strong>Determinant:</strong> <span id="determinant-value">1.00</span>
            <div class="determinant-props">
              <p>• Determinant = 0: The transformation collapses space</p>
              <p>• Determinant greater than 0: Preserves orientation</p>
              <p>• Determinant less than 0: Reverses orientation</p>
            </div>
          </div>
        </div>
        
        <div class="button-group">
          <button id="animate-btn" class="primary-btn">Animate Transform</button>
          <button id="reset-btn" class="secondary-btn">Reset</button>
        </div>
      </div>
      
      <div class="canvas-container">
        <canvas id="transform-canvas" width="600" height="600"></canvas>
        <div class="legend">
          <div class="legend-item"><span class="legend-color original"></span> Original shape</div>
          <div class="legend-item"><span class="legend-color transformed"></span> Transformed shape</div>
        </div>
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
    }
    
    @media (min-width: 992px) {
      .visualizer-container {
        flex-direction: row;
      }
    }
    
    .controls-panel {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      flex: 1;
    }
    
    .canvas-container {
      flex: 2;
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
    
    .matrix-input {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 15px 0;
    }
    
    .matrix-bracket {
      font-size: 2rem;
      margin: 0 5px;
    }
    
    .matrix-cells {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 10px;
    }
    
    .matrix-cells input {
      width: 60px;
      height: 40px;
      text-align: center;
      font-size: 1.1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .matrix-hint {
      text-align: center;
      font-size: 0.9rem;
      color: #666;
      margin-top: 5px;
    }
    
    .determinant-info {
      margin-bottom: 10px;
    }
    
    .determinant-props {
      font-size: 0.9rem;
      color: #666;
      margin-top: 5px;
    }
    
    .button-group {
      display: flex;
      gap: 10px;
    }
    
    .primary-btn, .secondary-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    
    .primary-btn {
      background-color: #3498db;
      color: white;
    }
    
    .secondary-btn {
      background-color: #6c757d;
      color: white;
    }
    
    .primary-btn:hover {
      background-color: #2980b9;
    }
    
    .secondary-btn:hover {
      background-color: #5a6268;
    }
    
    #transform-canvas {
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
      max-width: 100%;
      height: auto;
    }
    
    .legend {
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
      font-size: 0.9rem;
      color: #666;
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
    
    .legend-color.original {
      background-color: #999;
    }
    
    .legend-color.transformed {
      background-color: #3498db;
    }
    
    .legend-color.i-hat {
      background-color: #2ecc71;
    }
    
    .legend-color.j-hat {
      background-color: #9b59b6;
    }
    
    .explanation {
      margin-top: 30px;
    }
    
    .explanation h3 {
      margin-bottom: 10px;
    }
    
    .explanation-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin-top: 15px;
    }
    
    @media (min-width: 768px) {
      .explanation-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  `;
  
  document.head.appendChild(styleElement);
  
  // Initialize canvas and variables
  const canvas = document.getElementById('transform-canvas');
  const ctx = canvas.getContext('2d');
  
  const canvasWidth = 600;
  const canvasHeight = 600;
  const gridSize = 20;
  
  // Get DOM elements
  const presetSelect = document.getElementById('preset-transform');
  const shapeSelect = document.getElementById('shape-select');
  const m00Input = document.getElementById('m00');
  const m01Input = document.getElementById('m01');
  const m10Input = document.getElementById('m10');
  const m11Input = document.getElementById('m11');
  const determinantValue = document.getElementById('determinant-value');
  const animateBtn = document.getElementById('animate-btn');
  const resetBtn = document.getElementById('reset-btn');
  
  // Transformation matrix
  let matrix = [
    [1, 0],
    [0, 1]
  ];
  
  // Animation state
  let animationProgress = 1;
  let isAnimating = false;
  let animationId = null;
  
  // Modified shapes to be in the first quadrant
  const shapes = {
    square: [[1, 1], [5, 1], [5, 5], [1, 5]],
    triangle: [[3, 6], [0, 1], [6, 1]],
    rectangle: [[1, 2], [7, 2], [7, 5], [1, 5]],
    pentagon: [[4, 7], [1.15, 4.93], [2.24, 1.57], [5.76, 1.57], [6.85, 4.93]]
  };
  
  // Current shape
  let currentShape = [...shapes.square];
  let originalShape = [...shapes.square];
  
  // Preset transformations
  const presetTransformations = {
    identity: [[1, 0], [0, 1]],
    rotate90CW: [[0, 1], [-1, 0]],
    rotate90CCW: [[0, -1], [1, 0]],
    rotate180: [[-1, 0], [0, -1]],
    scale2: [[2, 0], [0, 2]],
    scaleX: [[2, 0], [0, 1]],
    scaleY: [[1, 0], [0, 2]],
    reflectX: [[1, 0], [0, -1]],
    reflectY: [[-1, 0], [0, 1]],
    reflectOrigin: [[-1, 0], [0, -1]],
    shearX: [[1, 1], [0, 1]],
    shearY: [[1, 0], [1, 1]]
  };
  
  // Helper functions
  function gridToCanvas(point) {
    const [x, y] = point;
    return [
      canvasWidth / 2 + x * gridSize,
      canvasHeight / 2 - y * gridSize
    ];
  }
  
  function transformPoint(point, progress = 1) {
    const [x, y] = point;
    const identityMatrix = [[1, 0], [0, 1]];
    
    // Interpolate between identity and target matrix
    const m = [
      [
        (1 - progress) * identityMatrix[0][0] + progress * matrix[0][0],
        (1 - progress) * identityMatrix[0][1] + progress * matrix[0][1]
      ],
      [
        (1 - progress) * identityMatrix[1][0] + progress * matrix[1][0],
        (1 - progress) * identityMatrix[1][1] + progress * matrix[1][1]
      ]
    ];
    
    return [
      m[0][0] * x + m[0][1] * y,
      m[1][0] * x + m[1][1] * y
    ];
  }
  
  function calculateDeterminant() {
    return (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]).toFixed(2);
  }
  
  function updateDeterminant() {
    determinantValue.textContent = calculateDeterminant();
  }
  
  function updateMatrixInputs() {
    m00Input.value = matrix[0][0];
    m01Input.value = matrix[0][1];
    m10Input.value = matrix[1][0];
    m11Input.value = matrix[1][1];
    updateDeterminant();
  }
  
  // Drawing functions
  function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    const gridLines = canvasWidth / gridSize;
    
    // Calculate grid range based on canvas size
    const maxGridCoord = Math.ceil(canvasWidth / (2 * gridSize));
    
    // Draw horizontal grid lines (correspond to integer y values)
    for (let y = -maxGridCoord; y <= maxGridCoord; y++) {
        const canvasY = canvasHeight / 2 - y * gridSize;
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(canvasWidth, canvasY);
        ctx.stroke();
    }
    
    // Draw vertical grid lines (correspond to integer x values)
    for (let x = -maxGridCoord; x <= maxGridCoord; x++) {
        const canvasX = canvasWidth / 2 + x * gridSize;
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, canvasHeight);
        ctx.stroke();
    }
    
    // Draw x and y axes with thicker lines
    ctx.strokeStyle = '#999';
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
  }
  
  function drawShape(shapePoints, color = '#3498db', fillColor = 'rgba(52, 152, 219, 0.2)') {
    ctx.strokeStyle = color;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    const startPoint = gridToCanvas(shapePoints[0]);
    ctx.moveTo(startPoint[0], startPoint[1]);
    
    for (let i = 1; i < shapePoints.length; i++) {
      const point = gridToCanvas(shapePoints[i]);
      ctx.lineTo(point[0], point[1]);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw the points as small circles
    ctx.fillStyle = color;
    shapePoints.forEach(point => {
      const [x, y] = gridToCanvas(point);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
  
  function drawTransformationVectors(originalPoints, transformedPoints) {
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    
    for (let i = 0; i < originalPoints.length; i++) {
      const start = gridToCanvas(originalPoints[i]);
      const end = gridToCanvas(transformedPoints[i]);
      
      ctx.beginPath();
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();
      
      // Draw arrowhead
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      ctx.beginPath();
      ctx.moveTo(end[0], end[1]);
      ctx.lineTo(
        end[0] - 10 * Math.cos(angle - Math.PI / 6),
        end[1] - 10 * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        end[0] - 10 * Math.cos(angle + Math.PI / 6),
        end[1] - 10 * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#e74c3c';
      ctx.fill();
    }
  }
  
  function drawCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw coordinate grid
    drawGrid();
    
    // Draw original shape (faded)
    drawShape(originalShape, '#999', 'rgba(153, 153, 153, 0.1)');
    
    // Draw transformed shape
    const transformedShape = currentShape.map(point => transformPoint(point, animationProgress));
    drawShape(transformedShape);
    
    // Draw transformation vectors
    if (animationProgress > 0) {
      drawTransformationVectors(originalShape, transformedShape);
    }
    
    // Draw basis vectors if we're at full transformation
    if (animationProgress === 1) {
      drawBasisVectors();
    }
  }
  
  // Interaction handlers
  function handlePresetChange() {
    const preset = presetSelect.value;
    matrix = [...presetTransformations[preset]];
    updateMatrixInputs();
    drawCanvas();
  }
  
  function handleShapeChange() {
    const shapeType = shapeSelect.value;
    currentShape = [...shapes[shapeType]];
    originalShape = [...shapes[shapeType]];
    drawCanvas();
  }
  
  function handleMatrixInput() {
    // Get values from inputs
    const m00 = parseFloat(m00Input.value) || 0;
    const m01 = parseFloat(m01Input.value) || 0;
    const m10 = parseFloat(m10Input.value) || 0;
    const m11 = parseFloat(m11Input.value) || 0;
    
    // Update matrix
    matrix = [
      [m00, m01],
      [m10, m11]
    ];
    
    updateDeterminant();
    drawCanvas();
  }
  
  function startAnimation() {
    if (isAnimating) return;
    
    isAnimating = true;
    animateBtn.disabled = true;
    
    // Reset animation progress
    animationProgress = 0;
    
    const startTime = Date.now();
    const duration = 1000; // 1 second animation
    
    function animate() {
      const elapsed = Date.now() - startTime;
      animationProgress = Math.min(elapsed / duration, 1);
      
      drawCanvas();
      
      if (animationProgress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        isAnimating = false;
        animateBtn.disabled = false;
      }
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  function resetTransformation() {
    // Cancel any running animation
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    // Reset to identity matrix
    matrix = [...presetTransformations.identity];
    updateMatrixInputs();
    
    // Reset animation state
    isAnimating = false;
    animateBtn.disabled = false;
    
    // Clear and redraw
    animationProgress = 0;
    setTimeout(() => {
      animationProgress = 1;
      drawCanvas();
    }, 50);
  }
  
  // Add event listeners
  presetSelect.addEventListener('change', handlePresetChange);
  shapeSelect.addEventListener('change', handleShapeChange);
  
  m00Input.addEventListener('input', handleMatrixInput);
  m01Input.addEventListener('input', handleMatrixInput);
  m10Input.addEventListener('input', handleMatrixInput);
  m11Input.addEventListener('input', handleMatrixInput);
  
  animateBtn.addEventListener('click', startAnimation);
  resetBtn.addEventListener('click', resetTransformation);
  
  // Initialize
  updateDeterminant();
  drawCanvas();
});