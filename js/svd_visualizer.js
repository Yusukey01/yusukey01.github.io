import React, { useState, useEffect, useRef } from 'react';

// SVD Visualization Component
const SVDVisualization = () => {
  const [matrix, setMatrix] = useState([
    [3, 1],
    [1, 2]
  ]);
  const [showSteps, setShowSteps] = useState(0);
  const [customMatrix, setCustomMatrix] = useState(false);
  const [matrixInput, setMatrixInput] = useState('3,1\n1,2');
  const canvasRef = useRef(null);
  const gridSize = 400;
  const center = gridSize / 2;
  // Adjusted scale to prevent vectors from going off-canvas
  const scale = 30;

  // Calculate SVD for a 2x2 matrix
  const calculateSVD = (m) => {
    // Calculate eigenvalues and eigenvectors of M^T * M
    const mtm = [
      [m[0][0] * m[0][0] + m[1][0] * m[1][0], m[0][0] * m[0][1] + m[1][0] * m[1][1]],
      [m[0][0] * m[0][1] + m[1][0] * m[1][1], m[0][1] * m[0][1] + m[1][1] * m[1][1]]
    ];
    
    // Get eigenvalues
    const trace = mtm[0][0] + mtm[1][1];
    const det = mtm[0][0] * mtm[1][1] - mtm[0][1] * mtm[1][0];
    const sqrtTerm = Math.sqrt(trace * trace - 4 * det);
    
    const eigenvalue1 = (trace + sqrtTerm) / 2;
    const eigenvalue2 = (trace - sqrtTerm) / 2;
    
    // Singular values are square roots of eigenvalues
    const singularValues = [Math.sqrt(eigenvalue1), Math.sqrt(eigenvalue2)];
    
    // Compute right singular vectors (V)
    let v1, v2;
    if (mtm[0][1] !== 0) {
      v1 = [mtm[0][1], eigenvalue1 - mtm[0][0]];
      v2 = [mtm[0][1], eigenvalue2 - mtm[0][0]];
    } else {
      v1 = [1, 0];
      v2 = [0, 1];
    }
    
    // Normalize v1
    const v1Norm = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    v1 = [v1[0] / v1Norm, v1[1] / v1Norm];
    
    // Normalize v2
    const v2Norm = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    v2 = [v2[0] / v2Norm, v2[1] / v2Norm];
    
    // Make sure v2 is orthogonal to v1
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    v2 = [v2[0] - dot * v1[0], v2[1] - dot * v1[1]];
    const v2NormCorrected = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    v2 = [v2[0] / v2NormCorrected, v2[1] / v2NormCorrected];
    
    // Compute left singular vectors (U)
    let u1, u2;
    if (singularValues[0] > 0.0001) {
      u1 = [
        (m[0][0] * v1[0] + m[0][1] * v1[1]) / singularValues[0],
        (m[1][0] * v1[0] + m[1][1] * v1[1]) / singularValues[0]
      ];
    } else {
      u1 = [1, 0];
    }
    
    if (singularValues[1] > 0.0001) {
      u2 = [
        (m[0][0] * v2[0] + m[0][1] * v2[1]) / singularValues[1],
        (m[1][0] * v2[0] + m[1][1] * v2[1]) / singularValues[1]
      ];
    } else {
      // Handle the case of a singular matrix
      u2 = [-u1[1], u1[0]]; // Orthogonal to u1
    }
    
    return {
      U: [u1, u2],
      S: singularValues,
      V: [v1, v2]
    };
  };

  // Draw the visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, gridSize, gridSize);
    
    // Draw coordinate grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let x = -5; x <= 5; x++) {
      ctx.beginPath();
      ctx.moveTo(center + x * scale, 0);
      ctx.lineTo(center + x * scale, gridSize);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = -5; y <= 5; y++) {
      ctx.beginPath();
      ctx.moveTo(0, center - y * scale);
      ctx.lineTo(gridSize, center - y * scale);
      ctx.stroke();
    }
    
    // Draw x and y axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // x-axis
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(gridSize, center);
    ctx.stroke();
    
    // y-axis
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, gridSize);
    ctx.stroke();
    
    // Calculate SVD
    const svd = calculateSVD(matrix);
    
    // Draw unit circle for all steps
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, scale, 0, 2 * Math.PI);
    ctx.stroke();
    
    // STEP 0: Standard basis
    if (showSteps === 0) {
      // Draw original basis vectors
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      
      // x basis vector (i)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + scale, center);
      ctx.stroke();
      
      // y basis vector (j)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center, center - scale);
      ctx.stroke();
      
      // Label basis vectors
      ctx.fillStyle = 'blue';
      ctx.font = '16px Arial';
      ctx.fillText('i', center + scale + 5, center + 15);
      ctx.fillText('j', center + 5, center - scale - 5);
    }
    
    // STEP 1: Right singular vectors (V)
    else if (showSteps === 1) {
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;
      
      // First right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[0][0] * scale, center - svd.V[0][1] * scale);
      ctx.stroke();
      
      // Second right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[1][0] * scale, center - svd.V[1][1] * scale);
      ctx.stroke();
      
      // Label V vectors
      ctx.fillStyle = 'green';
      ctx.font = '16px Arial';
      ctx.fillText('v₁', center + svd.V[0][0] * scale + 5, center - svd.V[0][1] * scale);
      ctx.fillText('v₂', center + svd.V[1][0] * scale + 5, center - svd.V[1][1] * scale);
    }
    
    // STEP 2: Scaling (Σ)
    else if (showSteps === 2) {
      // First show the original V vectors in light green
      ctx.strokeStyle = 'rgba(0, 128, 0, 0.3)';
      ctx.lineWidth = 1;
      
      // First right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[0][0] * scale, center - svd.V[0][1] * scale);
      ctx.stroke();
      
      // Second right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[1][0] * scale, center - svd.V[1][1] * scale);
      ctx.stroke();
      
      // Then show the scaled vectors
      ctx.strokeStyle = 'purple';
      ctx.lineWidth = 2;
      
      // Scaled first right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[0][0] * scale * svd.S[0], center - svd.V[0][1] * scale * svd.S[0]);
      ctx.stroke();
      
      // Scaled second right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[1][0] * scale * svd.S[1], center - svd.V[1][1] * scale * svd.S[1]);
      ctx.stroke();
      
      // Label Σ vectors
      ctx.fillStyle = 'purple';
      ctx.font = '16px Arial';
      ctx.fillText('σ₁v₁', center + svd.V[0][0] * scale * svd.S[0] + 5, center - svd.V[0][1] * scale * svd.S[0] - 5);
      ctx.fillText('σ₂v₂', center + svd.V[1][0] * scale * svd.S[1] + 5, center - svd.V[1][1] * scale * svd.S[1] - 5);
    }
    
    // STEP 3: Left singular vectors (U)
    else if (showSteps === 3) {
      // Draw scaled vectors first in light purple
      ctx.strokeStyle = 'rgba(128, 0, 128, 0.3)';
      ctx.lineWidth = 1;
      
      // Scaled first right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[0][0] * scale * svd.S[0], center - svd.V[0][1] * scale * svd.S[0]);
      ctx.stroke();
      
      // Scaled second right singular vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + svd.V[1][0] * scale * svd.S[1], center - svd.V[1][1] * scale * svd.S[1]);
      ctx.stroke();
      
      // Draw U vectors in red
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      
      // Draw unit vectors scaled by singular values
      const u1_scaled = [svd.U[0][0] * svd.S[0], svd.U[0][1] * svd.S[0]];
      const u2_scaled = [svd.U[1][0] * svd.S[1], svd.U[1][1] * svd.S[1]];
      
      // First left singular vector (scaled)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + u1_scaled[0] * scale, center - u1_scaled[1] * scale);
      ctx.stroke();
      
      // Second left singular vector (scaled)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + u2_scaled[0] * scale, center - u2_scaled[1] * scale);
      ctx.stroke();
      
      // Label U vectors
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.fillText('u₁σ₁', center + u1_scaled[0] * scale + 5, center - u1_scaled[1] * scale - 5);
      ctx.fillText('u₂σ₂', center + u2_scaled[0] * scale + 5, center - u2_scaled[1] * scale - 5);
    }
    
    // STEP 4: Complete transformation
    else if (showSteps === 4) {
      // Draw transformed unit circle
      ctx.strokeStyle = 'orange';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      for (let angle = 0; angle <= 2 * Math.PI; angle += 0.01) {
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        
        // Transform the point
        const tx = matrix[0][0] * x + matrix[0][1] * y;
        const ty = matrix[1][0] * x + matrix[1][1] * y;
        
        if (angle === 0) {
          ctx.moveTo(center + tx * scale, center - ty * scale);
        } else {
          ctx.lineTo(center + tx * scale, center - ty * scale);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
      
      // Draw transformed basis vectors
      ctx.strokeStyle = 'brown';
      ctx.lineWidth = 2;
      
      // Transformed x basis vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + matrix[0][0] * scale, center - matrix[1][0] * scale);
      ctx.stroke();
      
      // Transformed y basis vector
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + matrix[0][1] * scale, center - matrix[1][1] * scale);
      ctx.stroke();
      
      // Label transformed basis vectors
      ctx.fillStyle = 'brown';
      ctx.font = '16px Arial';
      ctx.fillText('A(i)', center + matrix[0][0] * scale + 5, center - matrix[1][0] * scale - 5);
      ctx.fillText('A(j)', center + matrix[0][1] * scale + 5, center - matrix[1][1] * scale - 5);
      
      // Add U vectors (with reduced opacity) to show connection
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      
      // First left singular vector (scaled)
      const u1_scaled = [svd.U[0][0] * svd.S[0], svd.U[0][1] * svd.S[0]];
      const u2_scaled = [svd.U[1][0] * svd.S[1], svd.U[1][1] * svd.S[1]];
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + u1_scaled[0] * scale, center - u1_scaled[1] * scale);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + u2_scaled[0] * scale, center - u2_scaled[1] * scale);
      ctx.stroke();
    }
  }, [matrix, showSteps]);

  const handleMatrixInputChange = (e) => {
    setMatrixInput(e.target.value);
  };

  const applyCustomMatrix = () => {
    try {
      const rows = matrixInput.trim().split('\n');
      if (rows.length !== 2) throw new Error('Must be a 2x2 matrix');
      
      const newMatrix = rows.map(row => {
        const values = row.split(',').map(v => parseFloat(v.trim()));
        if (values.length !== 2) throw new Error('Each row must have 2 values');
        if (values.some(isNaN)) throw new Error('All values must be numbers');
        return values;
      });
      
      setMatrix(newMatrix);
      setCustomMatrix(false);
    } catch (error) {
      alert(`Invalid matrix input: ${error.message}`);
    }
  };

  // Predefined matrices to demonstrate different transformations
  const presetMatrices = [
    { name: "Identity", matrix: [[1, 0], [0, 1]] },
    { name: "Scaling", matrix: [[2, 0], [0, 0.5]] },
    { name: "Rotation", matrix: [[0.7071, -0.7071], [0.7071, 0.7071]] },
    { name: "Shear", matrix: [[1, 0.5], [0, 1]] },
    { name: "Symmetric", matrix: [[3, 1], [1, 2]] },
    { name: "Reflection", matrix: [[-1, 0], [0, 1]] }
  ];

  const svd = calculateSVD(matrix);

  return (
    <div className="flex flex-col items-center w-full bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Singular Value Decomposition (SVD) Visualizer</h2>
      
      <div className="flex flex-col md:flex-row w-full gap-4">
        <div className="flex-1 border p-4 rounded">
          <canvas ref={canvasRef} width={gridSize} height={gridSize} className="border bg-white w-full h-auto" />
          
          <div className="mt-4 flex items-center justify-center space-x-2">
            <button 
              onClick={() => setShowSteps(prev => Math.max(0, prev - 1))}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              disabled={showSteps === 0}
            >
              Previous
            </button>
            <span className="px-2">{showSteps + 1}/5</span>
            <button 
              onClick={() => setShowSteps(prev => Math.min(4, prev + 1))}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={showSteps === 4}
            >
              Next
            </button>
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold text-lg">Step {showSteps + 1}: 
              {showSteps === 0 && " Standard Basis & Unit Circle"}
              {showSteps === 1 && " Right Singular Vectors (V)"}
              {showSteps === 2 && " Apply Scaling (Σ)"}
              {showSteps === 3 && " Left Singular Vectors (U)"}
              {showSteps === 4 && " Complete Transformation"}
            </h3>
            <p className="text-sm mt-1">
              {showSteps === 0 && "This is our starting point with the standard basis vectors i and j, and the unit circle."}
              {showSteps === 1 && "The right singular vectors (v₁, v₂) form an orthonormal basis. They are the eigenvectors of A^T A."}
              {showSteps === 2 && "The singular values (σ₁, σ₂) scale the right singular vectors, stretching or compressing them. Original vectors shown faded."}
              {showSteps === 3 && "The left singular vectors (u₁, u₂) show where the scaled vectors end up after rotation, forming another orthonormal basis. Previous step shown faded."}
              {showSteps === 4 && "The complete transformation A maps the unit circle to an ellipse. The transformed basis vectors align with the left singular vectors scaled by singular values."}
            </p>
          </div>
        </div>
        
        <div className="md:w-64 p-4 border rounded">
          <h3 className="font-bold mb-2">Matrix A</h3>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {matrix.map((row, i) => (
              row.map((val, j) => (
                <div key={`${i}-${j}`} className="text-center border p-2 rounded bg-gray-50">
                  {val.toFixed(2)}
                </div>
              ))
            ))}
          </div>
          
          <h3 className="font-bold mb-2">Singular Values</h3>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="text-center border p-2 rounded bg-purple-50">σ₁ = {svd.S[0].toFixed(2)}</div>
            <div className="text-center border p-2 rounded bg-purple-50">σ₂ = {svd.S[1].toFixed(2)}</div>
          </div>
          
          <h3 className="font-bold mb-2">Preset Matrices</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {presetMatrices.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setMatrix(preset.matrix)}
                className="bg-gray-100 hover:bg-gray-200 text-sm py-1 px-2 rounded"
              >
                {preset.name}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCustomMatrix(true)}
            className="w-full bg-blue-100 hover:bg-blue-200 py-1 px-3 rounded"
          >
            Custom Matrix
          </button>
          
          {customMatrix && (
            <div className="mt-4">
              <textarea
                value={matrixInput}
                onChange={handleMatrixInputChange}
                placeholder="Format: a,b\nc,d"
                className="w-full p-2 border rounded h-20 text-sm"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={applyCustomMatrix}
                  className="flex-1 bg-green-600 text-white py-1 px-3 rounded hover:bg-green-700"
                >
                  Apply
                </button>
                <button
                  onClick={() => setCustomMatrix(false)}
                  className="flex-1 bg-gray-300 py-1 px-3 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full mt-4 p-4 border rounded bg-gray-50">
        <h3 className="font-bold mb-2">SVD Decomposition: A = UΣV<sup>T</sup></h3>
        <div className="text-sm">
          <p className="mb-2"><strong>Description:</strong> SVD decomposes any matrix A into the product of three matrices: A = UΣV<sup>T</sup>, where:</p>
          <ul className="list-disc pl-6 mb-2 space-y-1">
            <li>U contains the left singular vectors (orthogonal)</li>
            <li>Σ is a diagonal matrix with singular values</li>
            <li>V<sup>T</sup> contains the right singular vectors (orthogonal)</li>
          </ul>
          <p>Geometrically, this represents: rotation (V<sup>T</sup>) → scaling (Σ) → rotation (U)</p>
        </div>
      </div>
    </div>
  );
};

export default SVDVisualization;