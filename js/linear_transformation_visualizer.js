import { useState, useEffect, useRef } from 'react';

const LinearTransformationVisualizer = () => {
  // Canvas dimensions
  const canvasWidth = 600;
  const canvasHeight = 600;
  const gridSize = 40; // Size of grid cells
  
  // State for transformation matrix
  const [matrix, setMatrix] = useState([[1, 0], [0, 1]]); // Identity matrix to start
  const [animationProgress, setAnimationProgress] = useState(1); // 0 to 1 for animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [shape, setShape] = useState([
    [-2, -2], [2, -2], [2, 2], [-2, 2] // Simple square
  ]);
  const [originalShape, setOriginalShape] = useState([
    [-2, -2], [2, -2], [2, 2], [-2, 2]
  ]);
  
  // Canvas references
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Preset transformations
  const presetTransformations = {
    identity: [[1, 0], [0, 1]],
    rotate90: [[0, -1], [1, 0]],
    rotate180: [[-1, 0], [0, -1]],
    scale2: [[2, 0], [0, 2]],
    scaleX: [[2, 0], [0, 1]],
    scaleY: [[1, 0], [0, 2]],
    reflectX: [[1, 0], [0, -1]],
    reflectY: [[-1, 0], [0, 1]],
    reflectOrigin: [[-1, 0], [0, -1]],
    shearX: [[1, 1], [0, 1]],
    shearY: [[1, 0], [1, 1]],
    custom: [[1, 0], [0, 1]]
  };
  
  // Apply matrix to a point
  const transformPoint = (point, progress = 1) => {
    const [x, y] = point;
    // Use the identity matrix mixed with the target matrix based on progress
    const m = matrix.map((row, i) => 
      row.map((val, j) => (1 - progress) * presetTransformations.identity[i][j] + progress * val)
    );
    
    return [
      m[0][0] * x + m[0][1] * y,
      m[1][0] * x + m[1][1] * y
    ];
  };
  
  // Convert grid coordinates to canvas coordinates
  const gridToCanvas = (point) => {
    const [x, y] = point;
    return [
      canvasWidth / 2 + x * gridSize,
      canvasHeight / 2 - y * gridSize // Y is inverted in canvas
    ];
  };
  
  // Draw grid
  const drawGrid = (ctx) => {
    const gridLines = canvasWidth / gridSize;
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Draw horizontal grid lines
    for (let i = 0; i <= gridLines; i++) {
      const y = i * gridSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
    
    // Draw vertical grid lines
    for (let i = 0; i <= gridLines; i++) {
      const x = i * gridSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
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
    
    // Add axis labels and numbers
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // x-axis labels
    for (let i = -Math.floor(gridLines/2); i <= Math.floor(gridLines/2); i++) {
      if (i === 0) continue; // Skip origin
      const x = canvasWidth / 2 + i * gridSize;
      ctx.fillText(i.toString(), x, canvasHeight / 2 + 20);
    }
    
    // y-axis labels
    for (let i = -Math.floor(gridLines/2); i <= Math.floor(gridLines/2); i++) {
      if (i === 0) continue; // Skip origin
      const y = canvasHeight / 2 - i * gridSize;
      ctx.fillText((-i).toString(), canvasWidth / 2 - 20, y);
    }
    
    // Origin label
    ctx.fillText('0', canvasWidth / 2 - 20, canvasHeight / 2 + 20);
  };
  
  // Draw the shape
  const drawShape = (ctx, shapePoints, color = '#3498db', fillColor = 'rgba(52, 152, 219, 0.2)') => {
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
  };
  
  // Draw the current state of the canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw coordinate grid
    drawGrid(ctx);
    
    // Draw original shape (faded)
    drawShape(ctx, originalShape, '#999', 'rgba(153, 153, 153, 0.1)');
    
    // Draw transformed shape
    const transformedShape = shape.map(point => transformPoint(point, animationProgress));
    drawShape(ctx, transformedShape);
    
    // Draw transformation vectors
    if (animationProgress > 0) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 1.5;
      
      for (let i = 0; i < originalShape.length; i++) {
        const start = gridToCanvas(originalShape[i]);
        const end = gridToCanvas(transformedShape[i]);
        
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
    
    // Draw basis vectors if we're at full transformation
    if (animationProgress === 1) {
      const i_hat = transformPoint([1, 0]);
      const j_hat = transformPoint([0, 1]);
      
      // Draw i-hat
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const origin = gridToCanvas([0, 0]);
      const i_hat_point = gridToCanvas(i_hat);
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(i_hat_point[0], i_hat_point[1]);
      ctx.stroke();
      
      // Draw j-hat
      ctx.strokeStyle = '#9b59b6';
      ctx.beginPath();
      const j_hat_point = gridToCanvas(j_hat);
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(j_hat_point[0], j_hat_point[1]);
      ctx.stroke();
      
      // Label basis vectors
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText('î', (origin[0] + i_hat_point[0]) / 2 + 10, (origin[1] + i_hat_point[1]) / 2 + 10);
      ctx.fillStyle = '#9b59b6';
      ctx.fillText('ĵ', (origin[0] + j_hat_point[0]) / 2 + 10, (origin[1] + j_hat_point[1]) / 2 + 10);
    }
  };
  
  // Effect to draw canvas whenever animation progress or matrix changes
  useEffect(() => {
    drawCanvas();
  }, [matrix, animationProgress, shape]);
  
  // Matrix input handler
  const handleMatrixInput = (row, col, value) => {
    // Allow negative sign, decimal point, and numbers
    // This regex allows an optional minus sign, followed by digits, an optional decimal point, and more digits
    const newMatrix = [...matrix];
    
    // Just store the raw string value initially
    newMatrix[row][col] = value;
    
    // Convert to number when applying (if valid)
    if (value === '' || value === '-' || value === '.') {
      // Keep the text as is when typing
      setMatrix(newMatrix);
    } else {
      const numValue = parseFloat(value);
      // Only update if it's a valid number
      if (!isNaN(numValue)) {
        newMatrix[row][col] = numValue;
        setMatrix(newMatrix);
      }
    }
  };
  
  // Handle preset selection
  const handlePresetChange = (e) => {
    const preset = e.target.value;
    if (preset in presetTransformations) {
      setMatrix([...presetTransformations[preset]]);
    }
  };
  
  // Animation functions
  const startAnimation = () => {
    setAnimationProgress(0);
    setIsAnimating(true);
    
    const startTime = Date.now();
    const duration = 1000; // 1 second animation
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setAnimationProgress(progress);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };
  
  // Reset shape and animation
  const resetTransformation = () => {
    // Reset the matrix to identity matrix
    setMatrix([...presetTransformations.identity]);
    
    // Reset animation
    setAnimationProgress(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsAnimating(false);
    
    // Short delay to ensure it resets visually
    setTimeout(() => {
      setAnimationProgress(1);
    }, 50);
  };
  
  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Handle custom shape selection
  const handleShapeChange = (e) => {
    const shapeType = e.target.value;
    let newShape = [];
    
    switch (shapeType) {
      case 'square':
        newShape = [[-2, -2], [2, -2], [2, 2], [-2, 2]];
        break;
      case 'triangle':
        newShape = [[0, 3], [-3, -2], [3, -2]];
        break;
      case 'rectangle':
        newShape = [[-3, -1.5], [3, -1.5], [3, 1.5], [-3, 1.5]];
        break;
      case 'pentagon':
        newShape = [[0, 3], [-2.9, 0.9], [-1.8, -2.4], [1.8, -2.4], [2.9, 0.9]];
        break;
      default:
        newShape = [[-2, -2], [2, -2], [2, 2], [-2, 2]];
    }
    
    setShape(newShape);
    setOriginalShape([...newShape]);
    resetTransformation();
  };
  
  // Calculate determinant of the transformation matrix
  const calculateDeterminant = () => {
    return (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]).toFixed(2);
  };
  
  return (
    <div className="section-content">
      <h2>Interactive Linear Transformation Visualizer</h2>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3 bg-gray-50 p-4 rounded-lg">
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Preset Transformations:</label>
            <select 
              className="w-full p-3 border rounded focus:outline-none focus:border-blue-500 text-base"
              onChange={handlePresetChange}
            >
              <option value="identity">Identity (no change)</option>
              <option value="rotate90">Rotate 90° clockwise</option>
              <option value="rotate180">Rotate 180°</option>
              <option value="scale2">Scale by 2</option>
              <option value="scaleX">Scale X by 2</option>
              <option value="scaleY">Scale Y by 2</option>
              <option value="reflectX">Reflect across X-axis</option>
              <option value="reflectY">Reflect across Y-axis</option>
              <option value="reflectOrigin">Reflect through origin</option>
              <option value="shearX">Shear X</option>
              <option value="shearY">Shear Y</option>
              <option value="custom">Custom Matrix</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Select Shape:</label>
            <select 
              className="w-full p-3 border rounded focus:outline-none focus:border-blue-500 text-base"
              onChange={handleShapeChange}
            >
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="rectangle">Rectangle</option>
              <option value="pentagon">Pentagon</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Transformation Matrix:</label>
            <div className="matrix-input">
              <div className="flex items-center justify-center mb-4">
                <div className="text-2xl mr-2">[</div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={matrix[0][0]}
                    onChange={(e) => handleMatrixInput(0, 0, e.target.value)}
                    className="w-20 h-12 p-2 text-center border rounded focus:outline-none focus:border-blue-500 text-lg"
                    inputMode="decimal"
                    aria-label="Matrix element row 1 column 1"
                  />
                  <input
                    type="text"
                    value={matrix[0][1]}
                    onChange={(e) => handleMatrixInput(0, 1, e.target.value)}
                    className="w-20 h-12 p-2 text-center border rounded focus:outline-none focus:border-blue-500 text-lg"
                    inputMode="decimal"
                    aria-label="Matrix element row 1 column 2"
                  />
                  <input
                    type="text"
                    value={matrix[1][0]}
                    onChange={(e) => handleMatrixInput(1, 0, e.target.value)}
                    className="w-20 h-12 p-2 text-center border rounded focus:outline-none focus:border-blue-500 text-lg"
                    inputMode="decimal"
                    aria-label="Matrix element row 2 column 1"
                  />
                  <input
                    type="text"
                    value={matrix[1][1]}
                    onChange={(e) => handleMatrixInput(1, 1, e.target.value)}
                    className="w-20 h-12 p-2 text-center border rounded focus:outline-none focus:border-blue-500 text-lg"
                    inputMode="decimal"
                    aria-label="Matrix element row 2 column 2"
                  />
                </div>
                <div className="text-2xl ml-2">]</div>
              </div>
              <div className="text-sm text-gray-600 text-center">
                <p>Enter any values to create custom transformations</p>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              <strong>Determinant:</strong> {calculateDeterminant()}
            </p>
            <div className="text-sm text-gray-600">
              <p>• Determinant = 0: The transformation collapses space</p>
              <p>• Determinant greater than 0: Preserves orientation</p>
              <p>• Determinant less than 0: Reverses orientation</p>
              <p>• |Determinant|: Area scale factor</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={startAnimation}
              disabled={isAnimating}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 text-base font-medium w-full"
            >
              Animate Transform
            </button>
            <button
              onClick={resetTransformation}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-base font-medium w-full"
            >
              Reset
            </button>
          </div>
        </div>
        
        <div className="w-full lg:w-2/3">
          <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="border border-gray-300 rounded bg-white touch-manipulation"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-2">
            <p><span className="inline-block w-3 h-3 bg-gray-400 mr-1"></span> Original shape</p>
            <p><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Transformed shape</p>
            <p><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> î unit vector (1,0) transformed</p>
            <p><span className="inline-block w-3 h-3 bg-purple-500 mr-1"></span> ĵ unit vector (0,1) transformed</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h3>Understanding Linear Transformations</h3>
        <p>A linear transformation preserves vector addition and scalar multiplication. When represented as a matrix, it shows how basis vectors are transformed.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="font-bold">Properties of Linear Transformations:</h4>
            <ul className="list-disc pl-5">
              <li>Origin remains fixed (maps to itself)</li>
              <li>Straight lines remain straight</li>
              <li>Parallel lines stay parallel</li>
              <li>The ratio of lengths on the same line is preserved</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold">Matrix Effects:</h4>
            <ul className="list-disc pl-5">
              <li><strong>Rotation:</strong> Rotates points around the origin</li>
              <li><strong>Scaling:</strong> Stretches or shrinks space</li>
              <li><strong>Reflection:</strong> Flips space across a line</li>
              <li><strong>Shearing:</strong> Slants space in one direction</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinearTransformationVisualizer;