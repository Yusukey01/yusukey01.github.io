/**
 * SVD Visualization 
 * Vanilla JavaScript implementation for direct browser use
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get container and create necessary elements
    const container = document.getElementById('svd-visualization-container');
    if (!container) return;
  
    // Clear the container (in case this script runs multiple times)
    container.innerHTML = '';
  
    // Set up the main elements
    container.innerHTML = `
      <div class="svd-visualizer">
        <div class="visualizer-top">
          <div class="canvas-container">
            <canvas id="svd-canvas" width="400" height="400" class="border"></canvas>
            <div class="step-controls">
              <button id="prev-step-btn" class="btn">Previous</button>
              <span id="step-indicator">1/5</span>
              <button id="next-step-btn" class="btn btn-primary">Next</button>
            </div>
            <div class="step-description">
              <h3 id="step-title">Step 1: Standard Basis & Unit Circle</h3>
              <p id="step-detail">This is our starting point with the standard basis vectors i and j, and the unit circle.</p>
            </div>
          </div>
          <div class="matrix-controls">
            <h3>Matrix A</h3>
            <div class="matrix-input">
            <div class="matrix-bracket">[</div>
            <div class="matrix-cells" id="matrix-display">
                <input type="text" id="m00" value="3" inputmode="decimal" aria-label="Matrix element row 1 column 1">
                <input type="text" id="m01" value="1" inputmode="decimal" aria-label="Matrix element row 1 column 2">
                <input type="text" id="m10" value="1" inputmode="decimal" aria-label="Matrix element row 2 column 1">
                <input type="text" id="m11" value="2" inputmode="decimal" aria-label="Matrix element row 2 column 2">
            </div>
            <div class="matrix-bracket">]</div>
            </div>
            
            <h3>Singular Values</h3>
            <div class="singular-values" id="singular-values">
              <div class="singular-value">σ₁ = 0.00</div>
              <div class="singular-value">σ₂ = 0.00</div>
            </div>

           <div class="svd-matrices">
  <h3>SVD Decomposition</h3>
  <div class="matrix-formula">
    <div class="matrix-component">
      <div class="matrix-label">A</div>
      <div class="matrix-with-brackets">
        <div class="matrix-bracket matrix-bracket-left">[</div>
        <div class="matrix-content" id="a-matrix-display">
          <!-- Will be filled dynamically -->
        </div>
        <div class="matrix-bracket matrix-bracket-right">]</div>
      </div>
    </div>
    
    <div class="matrix-equals-sign">=</div>
    
    <div class="matrix-component">
      <div class="matrix-label">U</div>
      <div class="matrix-with-brackets">
        <div class="matrix-bracket matrix-bracket-left">[</div>
        <div class="matrix-content" id="u-matrix-display">
          <!-- Will be filled dynamically -->
        </div>
        <div class="matrix-bracket matrix-bracket-right">]</div>
      </div>
    </div>
    
    <div class="matrix-operator">×</div>
    
    <div class="matrix-component">
      <div class="matrix-label">Σ</div>
      <div class="matrix-with-brackets">
        <div class="matrix-bracket matrix-bracket-left">[</div>
        <div class="matrix-content" id="sigma-matrix-display">
          <!-- Will be filled dynamically -->
        </div>
        <div class="matrix-bracket matrix-bracket-right">]</div>
      </div>
    </div>
    
    <div class="matrix-operator">×</div>
    
    <div class="matrix-component">
      <div class="matrix-label">V<sup>T</sup></div>
      <div class="matrix-with-brackets">
        <div class="matrix-bracket matrix-bracket-left">[</div>
        <div class="matrix-content" id="vt-matrix-display">
          <!-- Will be filled dynamically -->
        </div>
        <div class="matrix-bracket matrix-bracket-right">]</div>
      </div>
    </div>
  </div>
  <div id="matrix-verification" class="matrix-verification"></div>
</div>
            
            <h3>Preset Matrices</h3>
            <div class="preset-buttons" id="preset-buttons">
              <button class="preset-btn" data-matrix="identity">Identity</button>
              <button class="preset-btn" data-matrix="scaling">Scaling</button>
              <button class="preset-btn" data-matrix="rotation">Rotation</button>
              <button class="preset-btn" data-matrix="shear">Shear</button>
              <button class="preset-btn" data-matrix="symmetric">Symmetric</button>
              <button class="preset-btn" data-matrix="reflection">Reflection</button>
            </div>
            
        
        <div class="svd-info">
          <h3>SVD Decomposition: A = UΣV<sup>T</sup></h3>
          <p><strong>Description:</strong> SVD decomposes any matrix A into the product of three matrices: A = UΣV<sup>T</sup>, where:</p>
          <ul>
            <li>U contains the left singular vectors (orthogonal)</li>
            <li>Σ is a diagonal matrix with singular values</li>
            <li>V<sup>T</sup> contains the right singular vectors (orthogonal)</li>
          </ul>
          <p>Geometrically, this represents: rotation (V<sup>T</sup>) → scaling (Σ) → rotation (U)</p>
        </div>
      </div>
    `;
  
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .svd-visualizer {
        font-family: Arial, sans-serif;
        max-width: 1000px;
        margin: 0 auto;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .visualizer-top {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      @media (min-width: 768px) {
        .visualizer-top {
          flex-direction: row;
        }
        
        .canvas-container {
          flex: 1;
        }
        
        .matrix-controls {
          width: 250px;
        }
      }
      
      canvas {
        background: white;
        border: 1px solid #ddd;
        max-width: 100%;
        height: auto;
      }
      
      .btn {
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: #f0f0f0;
      }
      
      .btn:hover {
        background: #e0e0e0;
      }
      
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .btn-primary {
        background: #3498db;
        color: white;
      }
      
      .btn-primary:hover {
        background: #2980b9;
      }
      
      .btn-success {
        background: #2ecc71;
        color: white;
      }
      
      .step-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
      }
      
      .step-description {
        margin-top: 15px;
      }
      
      .step-description h3 {
        font-size: 16px;
        margin-bottom: 5px;
      }
      
      .step-description p {
        font-size: 14px;
        margin: 0;
        color: #555;
      }
      
      .matrix-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 5px;
        margin-bottom: 15px;
      }
      
      .matrix-cell {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        padding: 8px;
        text-align: center;
        border-radius: 4px;
      }
      
      .singular-values {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 5px;
        margin-bottom: 15px;
      }
      
      .singular-value {
        background: #f0e6ff;
        border: 1px solid #d4c4f9;
        padding: 8px;
        text-align: center;
        border-radius: 4px;
      }
      
      .preset-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 5px;
        margin-bottom: 15px;
      }
      
      .preset-btn {
        background: #f0f0f0;
        border: 1px solid #ddd;
        padding: 5px;
        text-align: center;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      
      .preset-btn:hover {
        background: #e0e0e0;
      }
      
      .custom-matrix-input {
        margin-top: 15px;
      }
      
      textarea {
        width: 100%;
        height: 60px;
        padding: 8px;
        box-sizing: border-box;
        font-family: monospace;
        margin-bottom: 8px;
        border-radius: 4px;
        border: 1px solid #ddd;
      }
      
      .custom-matrix-buttons {
        display: flex;
        gap: 5px;
      }
      
      .svd-info {
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
      }
      
      .svd-info h3 {
        margin-top: 0;
        margin-bottom: 10px;
      }
      
      .svd-info ul {
        padding-left: 25px;
        margin-bottom: 10px;
      }
      
      .svd-info li {
        margin-bottom: 5px;
      }

      .svd-matrices {
    margin-top: 15px;
    }

        .svd-matrix-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: space-between;
    margin-bottom: 15px;
    }

        .svd-matrix-component {
    display: flex;
    flex-direction: column;
    align-items: center;
    }

        .matrix-label {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 18px;
    }

        .matrix-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
    border: 1px solid #aaa;
    padding: 6px;
    background: #f8f8f8;
    border-radius: 4px;
    }

    /* Container for the entire formula */
.matrix-formula {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* Start from left for better scrolling */
  gap: 8px;
  margin: 15px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow-x: auto; /* Enable horizontal scrolling */
  width: 100%;
  min-width: 0; /* Needed for proper flexbox scrolling */
  scrollbar-width: thin; /* For Firefox */
}

/* For Webkit browsers - nicer scrollbar */
.matrix-formula::-webkit-scrollbar {
  height: 6px;
}

.matrix-formula::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.matrix-formula::-webkit-scrollbar-track {
  background-color: #f0f0f0;
}

/* Matrix containers */
.matrix-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  border: 1px solid #aaa;
  padding: 6px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  min-width: 60px; /* Ensure minimum width */
  flex-shrink: 0; /* Prevent shrinking */
}

/* Individual matrix cells */
.matrix-cell {
  padding: 4px !important;
  font-size: 13px !important;
  text-align: center;
  min-width: 30px; /* Ensure minimum width for cell content */
}

/* Operators between matrices */
.matrix-equals-sign, .matrix-operator {
  font-size: 20px;
  font-weight: bold;
  padding: 0 3px;
  flex-shrink: 0; /* Prevent shrinking */
}

/* Matrix components (label + matrix) */
.matrix-component {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0; /* Prevent shrinking */
}

/* Matrix labels */
.matrix-label {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 16px;
  text-align: center;
}

/* Media query for desktop */
@media (min-width: 768px) {
  .matrix-controls {
    width: 320px !important; /* Adjust width based on needs */
    max-width: 380px;
  }
  
  /* Ensure visible scroll indicator */
  .matrix-formula::after {
    content: '';
    padding-right: 5px;
  }
}
/* Matrix with brackets display style */
.matrix-with-brackets {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.matrix-bracket {
  font-size: 2.5rem;
  font-weight: lighter;
  line-height: 1;
  color: #555;
}

.matrix-bracket-left {
  margin-right: 5px;
}

.matrix-bracket-right {
  margin-left: 5px;
}

.matrix-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 4px;
}

.matrix-cell-display {
  width: 40px;
  height: 28px;
  text-align: center;
  font-size: 14px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Special cell styles */
.diagonal-element {
  font-weight: bold;
  background-color: #e6f7ff;
  color: #0066cc;
  border-color: #b3d9ff;
}

.zero-element {
  color: #999;
  background-color: #f9f9f9;
  border-color: #e6e6e6;
}

// Add these styles to the style element
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
    `;
    
    document.head.appendChild(style);
  
    // Get DOM references
    const canvas = document.getElementById('svd-canvas');
    const ctx = canvas.getContext('2d');
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    const stepIndicator = document.getElementById('step-indicator');
    const stepTitle = document.getElementById('step-title');
    const stepDetail = document.getElementById('step-detail');
    const matrixDisplay = document.getElementById('matrix-display');
    const singularValuesDisplay = document.getElementById('singular-values');
    const presetButtons = document.getElementById('preset-buttons').querySelectorAll('.preset-btn');
    const uMatrixDisplay = document.getElementById('u-matrix-display');
    const sigmaMatrixDisplay = document.getElementById('sigma-matrix-display');
    const vtMatrixDisplay = document.getElementById('vt-matrix-display');
    const m00Input = document.getElementById('m00');
    const m01Input = document.getElementById('m01');
    const m10Input = document.getElementById('m10');
    const m11Input = document.getElementById('m11');
    // SVD Visualization state
    let state = {
      matrix: [
        [3, 1],
        [1, 2]
      ],
      showStep: 0, // 0: basis, 1: V, 2: Sigma, 3: U, 4: transform
      svd: null
    };
  
    // Predefined matrices
    const presetMatrices = {
      identity: [[1, 0], [0, 1]],
      scaling: [[2, 0], [0, 0.5]],
      rotation: [[0.7071, -0.7071], [0.7071, 0.7071]],
      shear: [[1, 0.5], [0, 1]],
      symmetric: [[3, 1], [1, 2]],
      reflection: [[-1, 0], [0, 1]]
    };
  
    // Calculate SVD for a 2x2 matrix
    function calculateSVD(m) {
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
      if (Math.abs(mtm[0][1]) > 1e-10) {
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
      if (v2NormCorrected > 1e-10) {
        v2 = [v2[0] / v2NormCorrected, v2[1] / v2NormCorrected];
      }
      
      // Compute left singular vectors (U)
      let u1, u2;
      if (singularValues[0] > 1e-10) {
        u1 = [
          (m[0][0] * v1[0] + m[0][1] * v1[1]) / singularValues[0],
          (m[1][0] * v1[0] + m[1][1] * v1[1]) / singularValues[0]
        ];
      } else {
        u1 = [1, 0];
      }
      
      if (singularValues[1] > 1e-10) {
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
    }
  
    // Draw the visualization
    function draw() {
      const gridSize = canvas.width;
      const center = gridSize / 2;
      const scale = 30;
      
      // Clear canvas
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
      
      // Calculate SVD if needed
      if (!state.svd) {
        state.svd = calculateSVD(state.matrix);
      }
      
      const svd = state.svd;
      
      // Draw unit circle for all steps
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, scale, 0, 2 * Math.PI);
      ctx.stroke();
      
      // STEP 0: Standard basis
      if (state.showStep === 0) {
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
      else if (state.showStep === 1) {
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
      else if (state.showStep === 2) {
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
      else if (state.showStep === 3) {
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
      else if (state.showStep === 4) {
        // Draw transformed unit circle
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        for (let angle = 0; angle <= 2 * Math.PI; angle += 0.01) {
          const x = Math.cos(angle);
          const y = Math.sin(angle);
          
          // Transform the point
          const tx = state.matrix[0][0] * x + state.matrix[0][1] * y;
          const ty = state.matrix[1][0] * x + state.matrix[1][1] * y;
          
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
        ctx.lineTo(center + state.matrix[0][0] * scale, center - state.matrix[1][0] * scale);
        ctx.stroke();
        
        // Transformed y basis vector
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(center + state.matrix[0][1] * scale, center - state.matrix[1][1] * scale);
        ctx.stroke();
        
        // Label transformed basis vectors
        ctx.fillStyle = 'brown';
        ctx.font = '16px Arial';
        ctx.fillText('A(i)', center + state.matrix[0][0] * scale + 5, center - state.matrix[1][0] * scale - 5);
        ctx.fillText('A(j)', center + state.matrix[0][1] * scale + 5, center - state.matrix[1][1] * scale - 5);
        
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
    }
  
    // Update the matrix display
    function updateMatrixDisplay() {
        // Update matrix display
        matrixDisplay.innerHTML = '';
        state.matrix.forEach(row => {
        row.forEach(val => {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell';
            cell.textContent = val.toFixed(2);
            matrixDisplay.appendChild(cell);
        });
        });
        
        // Update singular values display
        const svd = state.svd;
        singularValuesDisplay.innerHTML = '';
        svd.S.forEach((val, idx) => {
        const singularValue = document.createElement('div');
        singularValue.className = 'singular-value';
        singularValue.textContent = `σ${idx+1} = ${val.toFixed(2)}`;
        singularValuesDisplay.appendChild(singularValue);
        });
    }
    
    // With this function:
    function updateMatrixDisplay() {
        // Just update the input values
        m00Input.value = state.matrix[0][0];
        m01Input.value = state.matrix[0][1];
        m10Input.value = state.matrix[1][0];
        m11Input.value = state.matrix[1][1];
        
        // Update singular values display
        const svd = state.svd;
        singularValuesDisplay.innerHTML = '';
        svd.S.forEach((val, idx) => {
        const singularValue = document.createElement('div');
        singularValue.className = 'singular-value';
        singularValue.textContent = `σ${idx+1} = ${val.toFixed(2)}`;
        singularValuesDisplay.appendChild(singularValue);
        });
    }
    

    // Update the SVD matrix displays
    function updateSVDMatrices() {
        const svd = state.svd;
        
        // Update original A matrix display with brackets format
        const aMatrixDisplay = document.getElementById('a-matrix-display');
        aMatrixDisplay.innerHTML = '';
        state.matrix.forEach(row => {
        row.forEach(val => {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell-display';
            cell.textContent = val.toFixed(2);
            aMatrixDisplay.appendChild(cell);
        });
        });
        
        // Update U matrix with brackets format
        const uMatrixDisplay = document.getElementById('u-matrix-display');
        uMatrixDisplay.innerHTML = '';
        svd.U.forEach(row => {
        row.forEach(val => {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell-display';
            cell.textContent = val.toFixed(2);
            uMatrixDisplay.appendChild(cell);
        });
        });
        
        // Update Sigma matrix with brackets format (diagonal)
        const sigmaMatrixDisplay = document.getElementById('sigma-matrix-display');
        sigmaMatrixDisplay.innerHTML = '';
        for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell-display';
            if (i === j) {
            cell.textContent = svd.S[i].toFixed(2);
            cell.classList.add('diagonal-element');
            } else {
            cell.textContent = '0.00';
            cell.classList.add('zero-element');
            }
            sigmaMatrixDisplay.appendChild(cell);
        }
        }
        
        // Update V^T matrix with brackets format
        const vtMatrixDisplay = document.getElementById('vt-matrix-display');
        vtMatrixDisplay.innerHTML = '';
        for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell-display';
            cell.textContent = svd.V[j][i].toFixed(2); // Note the transpose: j and i are swapped
            vtMatrixDisplay.appendChild(cell);
        }
        }
        
        // Verification code remains the same...
    }
    
    // Update step information
    function updateStepInfo() {
      // Update step indicator
      stepIndicator.textContent = `${state.showStep + 1}/5`;
      
      // Update step title
      const stepTitles = [
        "Step 1: Standard Basis & Unit Circle",
        "Step 2: Right Singular Vectors (V)",
        "Step 3: Apply Scaling (Σ)",
        "Step 4: Left Singular Vectors (U)",
        "Step 5: Complete Transformation"
      ];
      stepTitle.textContent = stepTitles[state.showStep];
      
      // Update step details
      const stepDetails = [
        "This is our starting point with the standard basis vectors i and j, and the unit circle.",
        "The right singular vectors (v₁, v₂) form an orthonormal basis. They are the eigenvectors of A^T A.",
        "The singular values (σ₁, σ₂) scale the right singular vectors, stretching or compressing them. Original vectors shown faded.",
        "The left singular vectors (u₁, u₂) show where the scaled vectors end up after rotation, forming another orthonormal basis. Previous step shown faded.",
        "The complete transformation A maps the unit circle to an ellipse. The transformed basis vectors align with the left singular vectors scaled by singular values."
      ];
      stepDetail.textContent = stepDetails[state.showStep];
      
      // Update button states
      prevBtn.disabled = state.showStep === 0;
      nextBtn.disabled = state.showStep === 4;
    }
  
    // Set a new matrix and update the visualization
    function setMatrix(matrix) {
      state.matrix = matrix;
      state.svd = calculateSVD(matrix);
      updateMatrixDisplay();
      updateSVDMatrices();
      draw();
    }
  
    // Event listeners
    prevBtn.addEventListener('click', function() {
      if (state.showStep > 0) {
        state.showStep--;
        updateStepInfo();
        draw();
      }
    });
  
    nextBtn.addEventListener('click', function() {
      if (state.showStep < 4) {
        state.showStep++;
        updateStepInfo();
        draw();
      }
    });
  
    // Preset matrix buttons
    presetButtons.forEach(button => {
      button.addEventListener('click', function() {
        const matrixName = this.getAttribute('data-matrix');
        if (presetMatrices[matrixName]) {
          setMatrix(presetMatrices[matrixName]);
        }
      });
    });

    // Add these lines where the old event listeners were:
    m00Input.addEventListener('input', handleMatrixInput);
    m01Input.addEventListener('input', handleMatrixInput);
    m10Input.addEventListener('input', handleMatrixInput);
    m11Input.addEventListener('input', handleMatrixInput);
    



    // Initialize visualization
    state.svd = calculateSVD(state.matrix);
    updateMatrixDisplay();
    updateSVDMatrices(); // Add this line
    updateStepInfo();
    draw();

    function handleMatrixInput() {
        // Get values from inputs
        const m00 = parseFloat(m00Input.value) || 0;
        const m01 = parseFloat(m01Input.value) || 0;
        const m10 = parseFloat(m10Input.value) || 0;
        const m11 = parseFloat(m11Input.value) || 0;
        
        // Update matrix
        state.matrix = [
          [m00, m01],
          [m10, m11]
        ];
        
        // Update visualization
        state.svd = calculateSVD(state.matrix);
        updateSVDMatrices();
        draw();
      }
  });