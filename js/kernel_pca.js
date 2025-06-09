// Kernel PCA Interactive Demo
// Comprehensive visualization of PCA, Kernel PCA, and Autoencoders

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('kernel_pca_visualizer');
    
    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // Create HTML structure
    container.innerHTML = `
        <div class="kpca-container">
            <div class="kpca-layout">
                
                <div class="kpca-visualization">
                    <div class="canvas-container">
                        <div class="instruction">Kernel PCA - Non-linear Dimensionality Reduction</div>
                        
                        <!-- Tab navigation -->
                        <div class="tab-nav">
                            <button class="tab-btn active" data-tab="comparison">PCA Comparison</button>
                            <button class="tab-btn" data-tab="algorithm">Algorithm Steps</button>
                            <button class="tab-btn" data-tab="autoencoder">Autoencoder</button>
                        </div>
                        
                        <!-- Tab content -->
                        <div class="tab-content">
                            <!-- Comparison Tab -->
                            <div id="comparison-tab" class="tab-pane active">
                                <div class="visualization-grid">
                                    <div class="viz-panel">
                                        <h4>Original Data</h4>
                                        <canvas id="original-canvas" width="300" height="300"></canvas>
                                        <p class="graph-explanation">Input data points in their native 2D space. Different colors represent different classes/clusters.</p>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Standard PCA</h4>
                                        <canvas id="pca-canvas" width="300" height="300"></canvas>
                                        <p class="graph-explanation">Linear PCA projection. Finds directions of maximum variance using linear combinations of original features.</p>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Kernel PCA</h4>
                                        <canvas id="kpca-canvas" width="300" height="300"></canvas>
                                        <p class="graph-explanation">Non-linear projection that transforms curved/complex structures into linearly separable representations. "Unfolds" non-linear patterns.</p>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Eigenvalue Comparison</h4>
                                        <canvas id="variance-canvas" width="300" height="300"></canvas>
                                        <p class="graph-explanation">Compares eigenvalues between PCA and Kernel PCA. Both represent variance along principal components, but in different spaces: PCA in original space, Kernel PCA in feature space.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Algorithm Tab -->
                            <div id="algorithm-tab" class="tab-pane">
                                <div class="algorithm-container">
                                    <div class="step-controls">
                                        <button id="step-back" class="step-btn">◀ Previous</button>
                                        <span id="step-indicator">Step 1 / 5</span>
                                        <button id="step-forward" class="step-btn">Next ▶</button>
                                        <button id="step-auto" class="step-btn">Auto Play</button>
                                    </div>
                                    <canvas id="algorithm-canvas" width="900" height="400"></canvas>
                                    <div id="step-description" class="step-description"></div>
                                </div>
                            </div>
                            
                            <!-- Autoencoder Tab -->
                            <div id="autoencoder-tab" class="tab-pane">
                                <div class="autoencoder-grid">
                                    <div class="viz-panel">
                                        <h4>Autoencoder Architecture</h4>
                                        <canvas id="ae-architecture-canvas" width="400" height="300"></canvas>
                                        <p class="graph-explanation">Neural network that learns to compress and reconstruct data through a bottleneck layer.</p>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Autoencoder vs KPCA</h4>
                                        <canvas id="ae-projection-canvas" width="400" height="300"></canvas>
                                        <p class="graph-explanation">Side-by-side comparison of dimensionality reduction methods on the same dataset.</p>
                                    </div>
                                </div>
                                <div class="ae-controls">
                                    <button id="train-ae" class="primary-btn">Train Autoencoder</button>
                                    <div id="ae-progress" class="progress-info"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="btn-container">
                            <button id="compute-btn" class="primary-btn">Compute Kernel PCA</button>
                            <button id="generate-btn" class="secondary-btn">Generate New Data</button>
                        </div>
                        
                        <div class="expected-behavior">
                            <h3>Expected Behavior by Dataset:</h3>
                            <div class="behavior-grid">
                                <div class="behavior-item">
                                    <strong>Concentric Circles:</strong> Kernel PCA should separate inner/outer circles into distinct clusters. Linear PCA cannot achieve this separation.
                                </div>
                                <div class="behavior-item">
                                    <strong>Two Moons:</strong> Kernel PCA should separate the two crescent shapes. Linear PCA will show overlapping clusters.
                                </div>
                                <div class="behavior-item">
                                    <strong>Gaussian Blobs:</strong> Both methods should work similarly since the structure is already linear.
                                </div>
                                <div class="behavior-item">
                                    <strong>Spiral:</strong> Kernel PCA may show more organized structure by "unwinding" the spiral pattern.
                                </div>
                            </div>
                            
                            <div class="implementation-note">
                                <h4>Implementation Notes:</h4>
                                <p><strong>Academic Source:</strong> Based on Cross Validated and multiple academic sources</p>
                                <p><strong>Key Formula:</strong> Projections = eigenvectors × √eigenvalues (NOT divided by √eigenvalues)</p>
                                <p><strong>Eigenvalues:</strong> Both PCA and Kernel PCA eigenvalues represent variance - just in different spaces</p>
                                <p><strong>Expected Result:</strong> Linear separation, not preservation of curved structures</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="controls-panel">
                    <div class="control-group">
                        <label for="dataset-select">Dataset:</label>
                        <select id="dataset-select" class="full-width">
                            <option value="circles" selected>Concentric Circles</option>
                            <option value="moons">Two Moons</option>
                            <option value="blobs">Gaussian Blobs</option>
                            <option value="spiral">Spiral</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="kernel-select">Kernel:</label>
                        <select id="kernel-select" class="full-width">
                            <option value="linear">Linear</option>
                            <option value="rbf" selected>RBF (Gaussian)</option>
                            <option value="poly">Polynomial</option>
                        </select>
                    </div>

                    <div class="control-group" id="gamma-container">
                        <label for="gamma-parameter">RBF γ (gamma):</label>
                        <input type="range" id="gamma-parameter" min="-2" max="2" step="0.1" value="0" class="full-width">
                        <span id="gamma-display">γ = 1.0</span>
                        <div class="param-hint">Higher γ = More localized influence</div>
                    </div>
                    
                    <div class="control-group" id="degree-container" style="display: none;">
                        <label for="degree-parameter">Polynomial Degree:</label>
                        <input type="range" id="degree-parameter" min="2" max="5" step="1" value="3" class="full-width">
                        <span id="degree-display">d = 3</span>
                    </div>
                    
                    <div class="control-group" id="coef-container" style="display: none;">
                        <label for="coef-parameter">Coefficient:</label>
                        <input type="range" id="coef-parameter" min="0" max="2" step="0.1" value="1" class="full-width">
                        <span id="coef-display">c = 1.0</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="components">Components:</label>
                        <input type="range" id="components" min="1" max="4" step="1" value="2" class="full-width">
                        <span id="components-display">2</span>
                        <div class="param-hint">Number of principal components to extract</div>
                    </div>
                    
                    <div class="control-group">
                        <label for="noise-level">Noise Level:</label>
                        <input type="range" id="noise-level" min="0" max="0.3" step="0.05" value="0.05" class="full-width">
                        <span id="noise-display">0.05</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="sample-size">Sample Size:</label>
                        <input type="range" id="sample-size" min="50" max="300" step="50" value="150" class="full-width">
                        <span id="sample-size-display">150</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .kpca-container {
            font-family: Arial, sans-serif;
            margin-bottom: 20px;
        }
        
        .kpca-layout {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        @media (min-width: 992px) {
            .kpca-layout {
                flex-direction: row;
            }
            
            .kpca-visualization {
                flex: 3;
                order: 1;
            }
            
            .controls-panel {
                flex: 1;
                order: 2;
            }
        }
        
        .canvas-container {
            display: flex;
            flex-direction: column;
        }
        
        .tab-nav {
            display: flex;
            gap: 5px;
            margin: 10px 0;
            border-bottom: 2px solid #ddd;
        }
        
        .tab-btn {
            padding: 10px 15px;
            border: none;
            background: #f8f9fa;
            cursor: pointer;
            border-radius: 4px 4px 0 0;
            transition: all 0.3s;
        }
        
        .tab-btn.active {
            background: #3498db;
            color: white;
        }
        
        .tab-pane {
            display: none;
            padding: 20px 0;
        }
        
        .tab-pane.active {
            display: block;
        }
        
        .visualization-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        @media (max-width: 768px) {
            .visualization-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .viz-panel {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .viz-panel h4 {
            margin: 0 0 10px 0;
            font-size: 1rem;
        }
        
        .viz-panel canvas {
            border: 1px solid #ddd;
            background: white;
            max-width: 100%;
            height: auto;
        }
        
        .graph-explanation {
            font-size: 0.85rem;
            color: #666;
            margin: 10px 0 0 0;
            text-align: left;
            line-height: 1.4;
        }
        
        .controls-panel {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .control-group {
            margin-bottom: 15px;
        }
        
        .control-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .full-width {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .param-hint {
            font-size: 0.8rem;
            color: #666;
            margin-top: 4px;
            font-style: italic;
        }
        
        .instruction {
            text-align: center;
            margin-bottom: 10px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .primary-btn, .secondary-btn {
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 15px;
            font-size: 1rem;
            cursor: pointer;
            width: 100%;
            margin-bottom: 10px;
        }
        
        .primary-btn {
            background-color: #3498db;
        }
        
        .primary-btn:hover {
            background-color: #2980b9;
        }
        
        .primary-btn:disabled {
            background-color: #95a5a6;
            cursor: not-allowed;
        }
        
        .secondary-btn {
            background-color: #95a5a6;
        }
        
        .secondary-btn:hover {
            background-color: #7f8c8d;
        }
        
        .btn-container {
            margin-top: 20px;
        }
        
        .kpca-visualization {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .step-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .step-btn {
            padding: 8px 15px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 4px;
        }
        
        .step-btn:hover {
            background: #f0f0f0;
        }
        
        #step-indicator {
            font-weight: bold;
        }
        
        .step-description {
            margin-top: 15px;
            padding: 15px;
            background: #fff;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        
        .algorithm-container {
            text-align: center;
        }
        
        .autoencoder-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        @media (max-width: 768px) {
            .autoencoder-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .ae-controls {
            text-align: center;
            margin-top: 20px;
        }
        
        .progress-info {
            margin-top: 10px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .expected-behavior {
            margin-top: 20px;
            padding: 15px;
            background: #f0f7ff;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        
        .expected-behavior h3 {
            margin: 0 0 15px 0;
            font-size: 1rem;
            color: #2c3e50;
        }
        
        .behavior-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        @media (max-width: 768px) {
            .behavior-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .behavior-item {
            font-size: 0.85rem;
            line-height: 1.4;
            padding: 8px;
            background: white;
            border-radius: 4px;
        }
        
        .behavior-item strong {
            color: #2c3e50;
        }
        
        .implementation-note {
            margin-top: 15px;
            padding: 12px;
            background: #fff3cd;
            border: 1px solid #ffeeba;
            border-radius: 4px;
        }
        
        .implementation-note h4 {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            color: #856404;
        }
        
        .implementation-note p {
            margin: 4px 0;
            font-size: 0.8rem;
            line-height: 1.3;
        }
    `;
    
    document.head.appendChild(styleElement);

    // Get DOM elements
    const datasetSelect = document.getElementById('dataset-select');
    const kernelSelect = document.getElementById('kernel-select');
    const gammaContainer = document.getElementById('gamma-container');
    const gammaInput = document.getElementById('gamma-parameter');
    const gammaDisplay = document.getElementById('gamma-display');
    const degreeContainer = document.getElementById('degree-container');
    const degreeInput = document.getElementById('degree-parameter');
    const degreeDisplay = document.getElementById('degree-display');
    const coefContainer = document.getElementById('coef-container');
    const coefInput = document.getElementById('coef-parameter');
    const coefDisplay = document.getElementById('coef-display');
    const componentsInput = document.getElementById('components');
    const componentsDisplay = document.getElementById('components-display');
    const noiseInput = document.getElementById('noise-level');
    const noiseDisplay = document.getElementById('noise-display');
    const sampleSizeInput = document.getElementById('sample-size');
    const sampleSizeDisplay = document.getElementById('sample-size-display');
    const computeBtn = document.getElementById('compute-btn');
    const generateBtn = document.getElementById('generate-btn');
    const trainAeBtn = document.getElementById('train-ae');
    
    // Canvas elements
    const originalCanvas = document.getElementById('original-canvas');
    const pcaCanvas = document.getElementById('pca-canvas');
    const kpcaCanvas = document.getElementById('kpca-canvas');
    const varianceCanvas = document.getElementById('variance-canvas');
    const algorithmCanvas = document.getElementById('algorithm-canvas');
    const aeArchCanvas = document.getElementById('ae-architecture-canvas');
    const aeProjCanvas = document.getElementById('ae-projection-canvas');
    
    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Info elements
    const aeProgressElement = document.getElementById('ae-progress');
    
    // State variables
    let data = [];
    let labels = [];
    let pcaResult = null;
    let kpcaResult = null;
    let currentStep = 0;
    let autoplayInterval = null;
    let aeModel = null;
    let aeProjection = null;
    
    // Kernel parameters
    let gamma = 1.0;
    let degree = 3;
    let coef = 1.0;
    
    // Matrix operations
    function matrixMultiply(A, B) {
        const m = A.length;
        const n = A[0].length;
        const p = B[0].length;
        const C = Array(m).fill().map(() => Array(p).fill(0));
        
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < p; j++) {
                for (let k = 0; k < n; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    }
    
    function transpose(matrix) {
        return matrix[0].map((_, i) => matrix.map(row => row[i]));
    }
    
    function gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    
    // Dataset generation functions
    function generateBlobsData(n, noise) {
        data = [];
        labels = [];
        
        // Three Gaussian blobs
        const centers = [[-2, -2], [2, 2], [0, 2]];
        const pointsPerCluster = Math.floor(n / centers.length);
        
        for (let c = 0; c < centers.length; c++) {
            const numPoints = (c === centers.length - 1) ? n - pointsPerCluster * (centers.length - 1) : pointsPerCluster;
            for (let i = 0; i < numPoints; i++) {
                const x = centers[c][0] + gaussianRandom() * 0.5 + gaussianRandom() * noise;
                const y = centers[c][1] + gaussianRandom() * 0.5 + gaussianRandom() * noise;
                data.push([x, y]);
                labels.push(c);
            }
        }
    }
    
    function generateCirclesData(n, noise) {
        data = [];
        labels = [];
        const n_inner = Math.floor(n / 2);
        
        // Inner circle
        for (let i = 0; i < n_inner; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const r = 0.5 + gaussianRandom() * noise;
            data.push([r * Math.cos(angle), r * Math.sin(angle)]);
            labels.push(0);
        }
        
        // Outer circle
        for (let i = 0; i < n - n_inner; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const r = 1.5 + gaussianRandom() * noise;
            data.push([r * Math.cos(angle), r * Math.sin(angle)]);
            labels.push(1);
        }
    }
    
    function generateMoonsData(n, noise) {
        data = [];
        labels = [];
        const n_half = Math.floor(n / 2);
        
        // First moon
        for (let i = 0; i < n_half; i++) {
            const angle = Math.random() * Math.PI;
            const x = Math.cos(angle) + gaussianRandom() * noise;
            const y = Math.sin(angle) + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(0);
        }
        
        // Second moon
        for (let i = 0; i < n - n_half; i++) {
            const angle = Math.random() * Math.PI;
            const x = 1 - Math.cos(angle) + gaussianRandom() * noise;
            const y = 0.5 - Math.sin(angle) + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(1);
        }
    }
    
    function generateSpiralData(n, noise) {
        data = [];
        labels = [];
        const n_half = Math.floor(n / 2);
        
        // First spiral
        for (let i = 0; i < n_half; i++) {
            const t = i / n_half * 3 * Math.PI;
            const x = t * Math.cos(t) / 10 + gaussianRandom() * noise;
            const y = t * Math.sin(t) / 10 + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(0);
        }
        
        // Second spiral (rotated by 180 degrees)
        for (let i = 0; i < n - n_half; i++) {
            const t = i / (n - n_half) * 3 * Math.PI;
            const x = -t * Math.cos(t) / 10 + gaussianRandom() * noise;
            const y = -t * Math.sin(t) / 10 + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(1);
        }
    }
    
    // Kernel functions
    function linearKernel(x1, x2) {
        let sum = 0;
        for (let i = 0; i < x1.length; i++) {
            sum += x1[i] * x2[i];
        }
        return sum;
    }
    
    function rbfKernel(x1, x2, gamma) {
        let sum = 0;
        for (let i = 0; i < x1.length; i++) {
            sum += (x1[i] - x2[i]) * (x1[i] - x2[i]);
        }
        return Math.exp(-gamma * sum);
    }
    
    function polyKernel(x1, x2, degree, gamma, coef) {
        let dot = 0;
        for (let i = 0; i < x1.length; i++) {
            dot += x1[i] * x2[i];
        }
        return Math.pow(gamma * dot + coef, degree);
    }
    
    // Compute kernel matrix
    function computeKernelMatrix(data, kernelType) {
        const n = data.length;
        const K = [];
        
        for (let i = 0; i < n; i++) {
            K[i] = [];
            for (let j = 0; j < n; j++) {
                switch (kernelType) {
                    case 'linear':
                        K[i][j] = linearKernel(data[i], data[j]);
                        break;
                    case 'rbf':
                        K[i][j] = rbfKernel(data[i], data[j], gamma);
                        break;
                    case 'poly':
                        K[i][j] = polyKernel(data[i], data[j], degree, gamma, coef);
                        break;
                }
            }
        }
        
        return K;
    }
    
    // Center kernel matrix - Following Schölkopf et al. (1998) formula
    function centerKernelMatrix(K) {
        const n = K.length;
        const K_centered = [];
        
        // Compute mean of each row and column
        const rowMeans = [];
        const colMeans = [];
        let totalMean = 0;
        
        for (let i = 0; i < n; i++) {
            rowMeans[i] = 0;
            colMeans[i] = 0;
        }
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rowMeans[i] += K[i][j];
                colMeans[j] += K[i][j];
                totalMean += K[i][j];
            }
        }
        
        for (let i = 0; i < n; i++) {
            rowMeans[i] /= n;
            colMeans[i] /= n;
        }
        totalMean /= (n * n);
        
        // Center the kernel matrix: K̃ = K - (1/n)1K - (1/n)K1 + (1/n²)1K1
        for (let i = 0; i < n; i++) {
            K_centered[i] = [];
            for (let j = 0; j < n; j++) {
                K_centered[i][j] = K[i][j] - rowMeans[i] - colMeans[j] + totalMean;
            }
        }
        
        return K_centered;
    }
    
    // Jacobi eigendecomposition for symmetric matrices
    function jacobiEigendecomposition(matrix, numComponents = null) {
        const n = matrix.length;
        if (n === 0) {
            return { eigenvalues: [], eigenvectors: [] };
        }
        
        // Handle 1x1 matrix special case
        if (n === 1) {
            const eigenvalues = [matrix[0][0]];
            const eigenvectors = [[1]];
            
            if (numComponents !== null && numComponents < 1) {
                return { eigenvalues: [], eigenvectors: [] };
            }
            
            return { eigenvalues, eigenvectors };
        }
        
        const maxIterations = 100;
        const tolerance = 1e-10;
        
        // Initialize
        let A = matrix.map(row => [...row]);
        let V = Array(n).fill().map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Find largest off-diagonal element
            let maxVal = 0;
            let p = 0, q = 1;
            
            // Ensure we have at least a 2x2 matrix
            if (n < 2) break;
            
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (Math.abs(A[i][j]) > maxVal) {
                        maxVal = Math.abs(A[i][j]);
                        p = i;
                        q = j;
                    }
                }
            }
            
            if (maxVal < tolerance) break;
            
            // Calculate rotation angle
            const theta = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
            const c = Math.cos(theta);
            const s = Math.sin(theta);
            
            // Update A
            const App = c * c * A[p][p] + s * s * A[q][q] - 2 * c * s * A[p][q];
            const Aqq = s * s * A[p][p] + c * c * A[q][q] + 2 * c * s * A[p][q];
            
            A[p][p] = App;
            A[q][q] = Aqq;
            A[p][q] = 0;
            A[q][p] = 0;
            
            for (let i = 0; i < n; i++) {
                if (i !== p && i !== q) {
                    const Aip = c * A[i][p] - s * A[i][q];
                    const Aiq = s * A[i][p] + c * A[i][q];
                    A[i][p] = A[p][i] = Aip;
                    A[i][q] = A[q][i] = Aiq;
                }
            }
            
            // Update V
            for (let i = 0; i < n; i++) {
                const Vip = c * V[i][p] - s * V[i][q];
                const Viq = s * V[i][p] + c * V[i][q];
                V[i][p] = Vip;
                V[i][q] = Viq;
            }
        }
        
        // Extract eigenvalues and eigenvectors
        const eigenvalues = [];
        const eigenvectors = [];
        
        for (let i = 0; i < n; i++) {
            eigenvalues.push(A[i][i]);
            eigenvectors.push(V.map(row => row[i]));
        }
        
        // Sort by eigenvalue (descending)
        const sorted = eigenvalues.map((val, idx) => ({ val, vec: eigenvectors[idx] }))
            .sort((a, b) => b.val - a.val);
        
        const sortedEigenvalues = sorted.map(item => item.val);
        const sortedEigenvectors = sorted.map(item => item.vec);
        
        if (numComponents !== null && numComponents < n) {
            return {
                eigenvalues: sortedEigenvalues.slice(0, numComponents),
                eigenvectors: sortedEigenvectors.slice(0, numComponents)
            };
        }
        
        return { eigenvalues: sortedEigenvalues, eigenvectors: sortedEigenvectors };
    }
    
    // Standard PCA
    function computePCA(data, numComponents) {
        if (!data || data.length === 0) {
            return {
                projection: [],
                eigenvalues: [],
                eigenvectors: [],
                mean: [],
                centered: []
            };
        }
        
        if (!data[0] || data[0].length === 0) {
            return {
                projection: [],
                eigenvalues: [],
                eigenvectors: [],
                mean: [],
                centered: []
            };
        }
        
        const n = data.length;
        const d = data[0].length;
        
        // Can't extract more components than data dimensions
        const actualComponents = Math.min(Math.max(numComponents, 0), d);
        
        // Compute mean
        const mean = [];
        for (let j = 0; j < d; j++) {
            mean[j] = 0;
            for (let i = 0; i < n; i++) {
                mean[j] += data[i][j];
            }
            mean[j] /= n;
        }
        
        // Center data
        const centered = data.map(point => point.map((val, idx) => val - mean[idx]));
        
        // Compute covariance matrix
        const cov = [];
        for (let i = 0; i < d; i++) {
            cov[i] = [];
            for (let j = 0; j < d; j++) {
                cov[i][j] = 0;
                for (let k = 0; k < n; k++) {
                    cov[i][j] += centered[k][i] * centered[k][j];
                }
                cov[i][j] /= (n - 1);
            }
        }
        
        // Eigendecomposition
        const eigen = jacobiEigendecomposition(cov, actualComponents);
        
        // Ensure we have valid eigenvectors
        if (!eigen.eigenvectors || eigen.eigenvectors.length === 0) {
            return {
                projection: Array(n).fill().map(() => Array(numComponents).fill(0)),
                eigenvalues: Array(numComponents).fill(0),
                eigenvectors: Array(numComponents).fill().map(() => Array(d).fill(0)),
                mean,
                centered
            };
        }
        
        // Project data
        const projection = [];
        for (let i = 0; i < n; i++) {
            const proj = [];
            for (let j = 0; j < actualComponents; j++) {
                let sum = 0;
                for (let k = 0; k < d; k++) {
                    sum += centered[i][k] * eigen.eigenvectors[j][k];
                }
                proj.push(sum);
            }
            // Pad with zeros if requested more components than available
            for (let j = actualComponents; j < numComponents; j++) {
                proj.push(0);
            }
            projection.push(proj);
        }
        
        // Pad eigenvalues and eigenvectors with zeros if needed
        const paddedEigenvalues = eigen.eigenvalues.slice(); // Create copy
        const paddedEigenvectors = eigen.eigenvectors.slice(); // Create copy
        
        for (let i = actualComponents; i < numComponents; i++) {
            paddedEigenvalues.push(0);
            paddedEigenvectors.push(Array(d).fill(0));
        }
        
        return {
            projection,
            eigenvalues: paddedEigenvalues,
            eigenvectors: paddedEigenvectors,
            mean,
            centered
        };
    }
    
    // Kernel PCA implementation - Corrected based on academic sources
    function computeKernelPCA(data, kernelType, numComponents) {
        if (!data || data.length === 0) {
            return {
                projection: [],
                eigenvalues: [],
                eigenvectors: [],
                kernelMatrix: [],
                centeredKernelMatrix: []
            };
        }
        
        const n = data.length;
        
        // Compute kernel matrix
        const K = computeKernelMatrix(data, kernelType);
        
        // Center kernel matrix
        const K_centered = centerKernelMatrix(K);
        
        // Eigendecomposition
        const eigen = jacobiEigendecomposition(K_centered, numComponents);
        
        // For Kernel PCA, the projections are eigenvectors scaled by sqrt(eigenvalues)
        // This is the correct academic formulation
        const projection = [];
        
        for (let i = 0; i < n; i++) {
            const proj = [];
            for (let j = 0; j < numComponents; j++) {
                if (j < eigen.eigenvectors.length && eigen.eigenvalues[j] > 1e-10) {
                    // Correct projection: eigenvector * sqrt(eigenvalue)
                    proj.push(eigen.eigenvectors[j][i] * Math.sqrt(eigen.eigenvalues[j]));
                } else {
                    proj.push(0);
                }
            }
            projection.push(proj);
        }
        
        return {
            projection,
            eigenvalues: eigen.eigenvalues,
            eigenvectors: eigen.eigenvectors,
            kernelMatrix: K,
            centeredKernelMatrix: K_centered
        };
    }
    
    // Autoencoder implementation with full backpropagation
    class SimpleAutoencoder {
        constructor(inputDim, hiddenDim, latentDim) {
            this.inputDim = inputDim;
            this.hiddenDim = hiddenDim;
            this.latentDim = latentDim;
            
            // Initialize weights with Xavier initialization
            const scale1 = Math.sqrt(2.0 / inputDim);
            const scale2 = Math.sqrt(2.0 / hiddenDim);
            const scale3 = Math.sqrt(2.0 / latentDim);
            const scale4 = Math.sqrt(2.0 / hiddenDim);
            
            // Encoder weights
            this.W1 = this.randomMatrix(hiddenDim, inputDim, scale1);
            this.b1 = Array(hiddenDim).fill(0);
            this.W2 = this.randomMatrix(latentDim, hiddenDim, scale2);
            this.b2 = Array(latentDim).fill(0);
            
            // Decoder weights
            this.W3 = this.randomMatrix(hiddenDim, latentDim, scale3);
            this.b3 = Array(hiddenDim).fill(0);
            this.W4 = this.randomMatrix(inputDim, hiddenDim, scale4);
            this.b4 = Array(inputDim).fill(0);
        }
        
        randomMatrix(rows, cols, scale) {
            const matrix = [];
            for (let i = 0; i < rows; i++) {
                matrix[i] = [];
                for (let j = 0; j < cols; j++) {
                    matrix[i][j] = (Math.random() - 0.5) * 2 * scale;
                }
            }
            return matrix;
        }
        
        relu(x) {
            return x > 0 ? x : 0;
        }
        
        reluDerivative(x) {
            return x > 0 ? 1 : 0;
        }
        
        forward(input) {
            // Validate input
            if (!input || input.length !== this.inputDim) {
                console.error('Invalid input to autoencoder:', input);
                return {
                    output: Array(this.inputDim).fill(0),
                    latent: Array(this.latentDim).fill(0),
                    z1: Array(this.hiddenDim).fill(0),
                    a1: Array(this.hiddenDim).fill(0),
                    z2: Array(this.latentDim).fill(0),
                    z3: Array(this.hiddenDim).fill(0),
                    a3: Array(this.hiddenDim).fill(0),
                    z4: Array(this.inputDim).fill(0)
                };
            }
            
            // Encoder
            const z1 = this.addBias(this.matrixVectorMultiply(this.W1, input), this.b1);
            const a1 = z1.map(x => this.relu(x));
            
            const z2 = this.addBias(this.matrixVectorMultiply(this.W2, a1), this.b2);
            const latent = z2; // Linear activation in latent layer
            
            // Decoder
            const z3 = this.addBias(this.matrixVectorMultiply(this.W3, latent), this.b3);
            const a3 = z3.map(x => this.relu(x));
            
            const z4 = this.addBias(this.matrixVectorMultiply(this.W4, a3), this.b4);
            const output = z4; // Linear activation in output
            
            return { output, latent, z1, a1, z2, z3, a3, z4 };
        }
        
        matrixVectorMultiply(matrix, vector) {
            if (!matrix || !vector || matrix.length === 0 || vector.length === 0) {
                console.error('Invalid matrix or vector for multiplication');
                return [];
            }
            
            const result = [];
            for (let i = 0; i < matrix.length; i++) {
                let sum = 0;
                for (let j = 0; j < Math.min(matrix[i].length, vector.length); j++) {
                    sum += matrix[i][j] * vector[j];
                }
                result.push(sum);
            }
            return result;
        }
        
        addBias(vector, bias) {
            if (!vector || !bias) return vector || [];
            
            const result = [];
            for (let i = 0; i < vector.length; i++) {
                result[i] = vector[i] + (bias[i] || 0);
            }
            return result;
        }
        
        // Proper backpropagation implementation
        train(data, epochs = 100, learningRate = 0.01) {
            const n = data.length;
            if (n === 0) return;
            
            let totalLoss = 0;
            
            for (let epoch = 0; epoch < epochs; epoch++) {
                totalLoss = 0;
                
                // Mini-batch gradient descent
                for (let i = 0; i < n; i++) {
                    const input = data[i];
                    
                    // Forward pass
                    const { output, latent, z1, a1, z2, z3, a3, z4 } = this.forward(input);
                    
                    // Calculate loss (MSE)
                    let loss = 0;
                    for (let j = 0; j < this.inputDim; j++) {
                        const diff = output[j] - input[j];
                        loss += diff * diff;
                    }
                    totalLoss += loss;
                    
                    // Backward pass
                    const lr = learningRate * (1.0 / (1.0 + epoch * 0.01)); // Learning rate decay
                    
                    // Output layer gradients
                    const dL_dz4 = [];
                    for (let j = 0; j < this.inputDim; j++) {
                        dL_dz4[j] = 2.0 * (output[j] - input[j]) / n;
                    }
                    
                    // Hidden layer 2 gradients
                    const dL_da3 = this.vectorMatrixMultiply(dL_dz4, this.W4);
                    const dL_dz3 = [];
                    for (let j = 0; j < this.hiddenDim; j++) {
                        dL_dz3[j] = dL_da3[j] * this.reluDerivative(z3[j]);
                    }
                    
                    // Latent layer gradients
                    const dL_dlatent = this.vectorMatrixMultiply(dL_dz3, this.W3);
                    const dL_dz2 = dL_dlatent; // Linear activation
                    
                    // Hidden layer 1 gradients
                    const dL_da1 = this.vectorMatrixMultiply(dL_dz2, this.W2);
                    const dL_dz1 = [];
                    for (let j = 0; j < this.hiddenDim; j++) {
                        dL_dz1[j] = dL_da1[j] * this.reluDerivative(z1[j]);
                    }
                    
                    // Update weights and biases
                    // W4 and b4
                    for (let j = 0; j < this.inputDim; j++) {
                        for (let k = 0; k < this.hiddenDim; k++) {
                            this.W4[j][k] -= lr * dL_dz4[j] * a3[k];
                        }
                        this.b4[j] -= lr * dL_dz4[j];
                    }
                    
                    // W3 and b3
                    for (let j = 0; j < this.hiddenDim; j++) {
                        for (let k = 0; k < this.latentDim; k++) {
                            this.W3[j][k] -= lr * dL_dz3[j] * latent[k];
                        }
                        this.b3[j] -= lr * dL_dz3[j];
                    }
                    
                    // W2 and b2
                    for (let j = 0; j < this.latentDim; j++) {
                        for (let k = 0; k < this.hiddenDim; k++) {
                            this.W2[j][k] -= lr * dL_dz2[j] * a1[k];
                        }
                        this.b2[j] -= lr * dL_dz2[j];
                    }
                    
                    // W1 and b1
                    for (let j = 0; j < this.hiddenDim; j++) {
                        for (let k = 0; k < this.inputDim; k++) {
                            this.W1[j][k] -= lr * dL_dz1[j] * input[k];
                        }
                        this.b1[j] -= lr * dL_dz1[j];
                    }
                }
                
                // Update progress
                if (epoch % 20 === 0 && aeProgressElement) {
                    const avgLoss = totalLoss / n;
                    aeProgressElement.textContent = `Training... Epoch ${epoch}/${epochs}, Loss: ${avgLoss.toFixed(4)}`;
                }
            }
            
            // Final update
            if (aeProgressElement) {
                const avgLoss = totalLoss / n;
                aeProgressElement.textContent = `Training complete! Final loss: ${avgLoss.toFixed(4)}`;
            }
        }
        
        vectorMatrixMultiply(vector, matrix) {
            const result = [];
            for (let j = 0; j < matrix[0].length; j++) {
                let sum = 0;
                for (let i = 0; i < vector.length; i++) {
                    sum += vector[i] * matrix[i][j];
                }
                result.push(sum);
            }
            return result;
        }
        
        encode(data) {
            if (!data || data.length === 0) return [];
            
            const encoded = [];
            for (let i = 0; i < data.length; i++) {
                try {
                    const { latent } = this.forward(data[i]);
                    // Ensure we always return 2D points
                    encoded.push([
                        latent[0] || 0,
                        latent[1] || 0
                    ]);
                } catch (error) {
                    console.error('Encoding error for point', i, error);
                    encoded.push([0, 0]);
                }
            }
            return encoded;
        }
    }
    
    // Drawing functions
    function drawData(canvas, data, projection, title) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Check if we have data
        if (!data || data.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', width / 2, height / 2);
            return;
        }
        
        // Use projection if available, otherwise use original data
        // For projections with more than 2 components, use only first 2 for visualization
        const drawData = projection && projection.length > 0 ? projection.map(p => [p[0] || 0, p[1] || 0]) : data;
        
        // Find data bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const point of drawData) {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
        }
        
        // Add padding
        const padding = 0.1 * Math.max(maxX - minX, maxY - minY, 0.1);
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        
        // X-axis
        const yZero = height - ((0 - minY) / (maxY - minY)) * height;
        ctx.beginPath();
        ctx.moveTo(0, yZero);
        ctx.lineTo(width, yZero);
        ctx.stroke();
        
        // Y-axis
        const xZero = ((0 - minX) / (maxX - minX)) * width;
        ctx.beginPath();
        ctx.moveTo(xZero, 0);
        ctx.lineTo(xZero, height);
        ctx.stroke();
        
        // Draw data points
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12'];
        
        for (let i = 0; i < drawData.length; i++) {
            const x = ((drawData[i][0] - minX) / (maxX - minX)) * width;
            const y = height - ((drawData[i][1] - minY) / (maxY - minY)) * height;
            
            ctx.fillStyle = colors[labels[i] % colors.length];
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    function drawVariance(canvas, pcaEigenvalues, kpcaEigenvalues) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!pcaEigenvalues || !kpcaEigenvalues || pcaEigenvalues.length === 0 || kpcaEigenvalues.length === 0) return;
        
        const numComponents = Math.min(pcaEigenvalues.length, kpcaEigenvalues.length, 4);
        const barWidth = width / (numComponents * 2 + 1) * 0.7;
        const maxHeight = height * 0.7;
        const maxVal = Math.max(...pcaEigenvalues.slice(0, numComponents), ...kpcaEigenvalues.slice(0, numComponents), 1);
        
        // Draw title
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('Eigenvalue Comparison', width / 2, 20);
        
        // Draw bars
        for (let i = 0; i < numComponents; i++) {
            // PCA bar
            const pcaHeight = (pcaEigenvalues[i] / maxVal) * maxHeight;
            const pcaX = (i * 2 + 0.5) * width / (numComponents * 2 + 1) + barWidth / 2;
            
            ctx.fillStyle = '#3498db';
            ctx.fillRect(pcaX - barWidth / 2, height - pcaHeight - 30, barWidth, pcaHeight);
            
            // Value label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(pcaEigenvalues[i].toFixed(2), pcaX, height - pcaHeight - 35);
            
            // KPCA bar
            const kpcaHeight = (kpcaEigenvalues[i] / maxVal) * maxHeight;
            const kpcaX = (i * 2 + 1.5) * width / (numComponents * 2 + 1) + barWidth / 2;
            
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(kpcaX - barWidth / 2, height - kpcaHeight - 30, barWidth, kpcaHeight);
            
            // Value label
            ctx.fillStyle = '#333';
            ctx.fillText(kpcaEigenvalues[i].toFixed(2), kpcaX, height - kpcaHeight - 35);
            
            // Component label
            ctx.fillText(`PC${i + 1}`, (pcaX + kpcaX) / 2, height - 10);
        }
        
        // Legend
        ctx.font = '12px Arial';
        ctx.fillStyle = '#3498db';
        ctx.fillRect(10, 35, 15, 15);
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.fillText('PCA (original space)', 30, 47);
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(10, 55, 15, 15);
        ctx.fillStyle = '#333';
        ctx.fillText('KPCA (feature space)', 30, 67);
    }
    
    // Algorithm visualization
    function drawAlgorithmStep(step) {
        const ctx = algorithmCanvas.getContext('2d');
        const width = algorithmCanvas.width;
        const height = algorithmCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const steps = [
            {
                title: 'Step 1: Original Data',
                description: 'Start with the original data points in their native space.',
                draw: () => {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                    drawData(tempCanvas, data, null, 'Original Data');
                    ctx.drawImage(tempCanvas, 0, 0);
                }
            },
            {
                title: 'Step 2: Compute Kernel Matrix',
                description: 'Calculate pairwise similarities using the kernel function K(xi, xj).',
                draw: () => {
                    if (kpcaResult && kpcaResult.kernelMatrix && kpcaResult.kernelMatrix.length > 0) {
                        drawKernelMatrix(algorithmCanvas, kpcaResult.kernelMatrix, 'Kernel Matrix K');
                    } else {
                        const ctx = algorithmCanvas.getContext('2d');
                        ctx.font = '14px Arial';
                        ctx.fillStyle = '#666';
                        ctx.textAlign = 'center';
                        ctx.fillText('Run Kernel PCA to see kernel matrix', algorithmCanvas.width / 2, algorithmCanvas.height / 2);
                    }
                }
            },
            {
                title: 'Step 3: Center Kernel Matrix',
                description: 'Center the kernel matrix in feature space: K̃ = K - 1K - K1 + 1K1',
                draw: () => {
                    if (kpcaResult && kpcaResult.centeredKernelMatrix && kpcaResult.centeredKernelMatrix.length > 0) {
                        drawKernelMatrix(algorithmCanvas, kpcaResult.centeredKernelMatrix, 'Centered Kernel Matrix K̃');
                    } else {
                        const ctx = algorithmCanvas.getContext('2d');
                        ctx.font = '14px Arial';
                        ctx.fillStyle = '#666';
                        ctx.textAlign = 'center';
                        ctx.fillText('Run Kernel PCA to see centered kernel matrix', algorithmCanvas.width / 2, algorithmCanvas.height / 2);
                    }
                }
            },
            {
                title: 'Step 4: Eigendecomposition',
                description: 'Find eigenvalues and eigenvectors of the centered kernel matrix.',
                draw: () => {
                    if (kpcaResult && kpcaResult.eigenvalues && kpcaResult.eigenvalues.length > 0) {
                        drawEigenvalues(algorithmCanvas, kpcaResult.eigenvalues);
                    } else {
                        const ctx = algorithmCanvas.getContext('2d');
                        ctx.font = '14px Arial';
                        ctx.fillStyle = '#666';
                        ctx.textAlign = 'center';
                        ctx.fillText('Run Kernel PCA to see eigenvalues', algorithmCanvas.width / 2, algorithmCanvas.height / 2);
                    }
                }
            },
            {
                title: 'Step 5: Project Data',
                description: 'Project data onto principal components in feature space.',
                draw: () => {
                    if (kpcaResult && kpcaResult.projection && kpcaResult.projection.length > 0) {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = width;
                        tempCanvas.height = height;
                        drawData(tempCanvas, data, kpcaResult.projection, 'Kernel PCA Projection');
                        ctx.drawImage(tempCanvas, 0, 0);
                    } else {
                        ctx.font = '14px Arial';
                        ctx.fillStyle = '#666';
                        ctx.textAlign = 'center';
                        ctx.fillText('Run Kernel PCA to see projection', width / 2, height / 2);
                    }
                }
            }
        ];
        
        const currentStepData = steps[step];
        document.getElementById('step-indicator').textContent = `Step ${step + 1} / ${steps.length}`;
        document.getElementById('step-description').innerHTML = `
            <h4>${currentStepData.title}</h4>
            <p>${currentStepData.description}</p>
        `;
        
        currentStepData.draw();
    }
    
    function drawKernelMatrix(canvas, matrix, title = '') {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!matrix || matrix.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No matrix data available', width / 2, height / 2);
            return;
        }
        
        const n = Math.min(matrix.length, 50); // Limit size for visualization
        const availableHeight = height - 40;
        const cellSize = Math.min(availableHeight / n, width * 0.8 / n);
        const matrixSize = cellSize * n;
        const offsetX = (width - matrixSize) / 2;
        const offsetY = 30;
        
        // Title
        if (title) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(title, width / 2, 20);
        }
        
        // Find min and max values for color scaling
        let minVal = Infinity, maxVal = -Infinity;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                minVal = Math.min(minVal, matrix[i][j]);
                maxVal = Math.max(maxVal, matrix[i][j]);
            }
        }
        
        // Draw matrix
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const val = (matrix[i][j] - minVal) / (maxVal - minVal);
                const intensity = Math.floor(val * 255);
                
                // Blue to red gradient
                const r = intensity;
                const g = 0;
                const b = 255 - intensity;
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(offsetX + j * cellSize, offsetY + i * cellSize, cellSize - 1, cellSize - 1);
            }
        }
        
        // Color bar
        const barWidth = 20;
        const barHeight = matrixSize;
        const barX = offsetX + matrixSize + 20;
        const barY = offsetY;
        
        // Gradient
        for (let i = 0; i < barHeight; i++) {
            const val = 1 - i / barHeight;
            const intensity = Math.floor(val * 255);
            ctx.fillStyle = `rgb(${intensity}, 0, ${255 - intensity})`;
            ctx.fillRect(barX, barY + i, barWidth, 1);
        }
        
        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(maxVal.toFixed(2), barX + barWidth + 5, barY + 10);
        ctx.fillText(minVal.toFixed(2), barX + barWidth + 5, barY + barHeight);
    }
    
    function drawEigenvalues(canvas, eigenvalues) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!eigenvalues || eigenvalues.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No eigenvalues available', width / 2, height / 2);
            return;
        }
        
        const n = Math.min(eigenvalues.length, 10);
        const barWidth = width * 0.6 / n;
        const offsetX = width * 0.2;
        const maxHeight = height * 0.6;
        const maxVal = Math.max(...eigenvalues.slice(0, n));
        
        // Title
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('Eigenvalues (sorted)', width / 2, 30);
        
        // Draw bars
        for (let i = 0; i < n; i++) {
            const barHeight = (eigenvalues[i] / maxVal) * maxHeight;
            const x = offsetX + i * barWidth;
            const y = height - barHeight - 50;
            
            ctx.fillStyle = '#3498db';
            ctx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, barHeight);
            
            // Value label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(eigenvalues[i].toFixed(2), x + barWidth / 2, y - 5);
            
            // Index label
            ctx.fillText(`λ${i + 1}`, x + barWidth / 2, height - 35);
        }
        
        // Cumulative variance
        const total = eigenvalues.reduce((a, b) => a + b, 0);
        let cumulative = 0;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < n; i++) {
            cumulative += eigenvalues[i] / total;
            const x = offsetX + (i + 0.5) * barWidth;
            const y = height - 50 - cumulative * maxHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Legend
        ctx.font = '12px Arial';
        ctx.fillStyle = '#3498db';
        ctx.fillRect(width - 150, 40, 15, 15);
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.fillText('Eigenvalues', width - 130, 52);
        
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width - 150, 65);
        ctx.lineTo(width - 135, 65);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.fillText('Cumulative %', width - 130, 69);
    }
    
    // Autoencoder visualization
    function drawAutoencoderArchitecture() {
        const ctx = aeArchCanvas.getContext('2d');
        const width = aeArchCanvas.width;
        const height = aeArchCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw network architecture
        const layers = [
            { size: 2, name: 'Input' },
            { size: 4, name: 'Hidden 1' },
            { size: 2, name: 'Latent' },
            { size: 4, name: 'Hidden 2' },
            { size: 2, name: 'Output' }
        ];
        
        const layerSpacing = width / (layers.length + 1);
        const nodeRadius = 8;
        
        // Draw connections
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        
        for (let l = 0; l < layers.length - 1; l++) {
            const x1 = (l + 1) * layerSpacing;
            const x2 = (l + 2) * layerSpacing;
            
            for (let i = 0; i < layers[l].size; i++) {
                const y1 = height / 2 + (i - layers[l].size / 2 + 0.5) * 30;
                
                for (let j = 0; j < layers[l + 1].size; j++) {
                    const y2 = height / 2 + (j - layers[l + 1].size / 2 + 0.5) * 30;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1 + nodeRadius, y1);
                    ctx.lineTo(x2 - nodeRadius, y2);
                    ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        for (let l = 0; l < layers.length; l++) {
            const x = (l + 1) * layerSpacing;
            
            for (let i = 0; i < layers[l].size; i++) {
                const y = height / 2 + (i - layers[l].size / 2 + 0.5) * 30;
                
                // Node
                ctx.fillStyle = l === 2 ? '#e74c3c' : '#3498db';
                ctx.beginPath();
                ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Layer labels
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(layers[l].name, x, height - 20);
        }
        
        // Title
        ctx.font = '14px Arial';
        ctx.fillText('Autoencoder Architecture', width / 2, 20);
    }
    
    function drawAutoencoderComparison() {
        const ctx = aeProjCanvas.getContext('2d');
        const width = aeProjCanvas.width;
        const height = aeProjCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!aeProjection || !kpcaResult || !aeProjection.length || !kpcaResult.projection) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Train autoencoder to see comparison', width / 2, height / 2);
            return;
        }
        
        // Split canvas
        const halfWidth = width / 2;
        
        // Draw KPCA on left
        ctx.save();
        ctx.translate(0, 0);
        ctx.scale(0.5, 1);
        
        const tempCanvas1 = document.createElement('canvas');
        tempCanvas1.width = width;
        tempCanvas1.height = height;
        drawData(tempCanvas1, data, kpcaResult.projection, 'KPCA');
        ctx.drawImage(tempCanvas1, 0, 0);
        
        ctx.restore();
        
        // Draw AE on right
        ctx.save();
        ctx.translate(halfWidth, 0);
        ctx.scale(0.5, 1);
        
        const tempCanvas2 = document.createElement('canvas');
        tempCanvas2.width = width;
        tempCanvas2.height = height;
        drawData(tempCanvas2, data, aeProjection, 'Autoencoder');
        ctx.drawImage(tempCanvas2, 0, 0);
        
        ctx.restore();
        
        // Labels
        ctx.font = '12px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('Kernel PCA', halfWidth / 2, 20);
        ctx.fillText('Autoencoder', halfWidth + halfWidth / 2, 20);
        
        // Divider
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(halfWidth, 30);
        ctx.lineTo(halfWidth, height);
        ctx.stroke();
    }
    
    // Event handlers
    function handleDatasetChange() {
        generateData();
        setTimeout(() => {
            computeProjections();
        }, 50);
    }
    
    function handleKernelChange() {
        const kernel = kernelSelect.value;
        
        // Show/hide relevant parameter controls
        gammaContainer.style.display = kernel === 'rbf' || kernel === 'poly' ? 'block' : 'none';
        degreeContainer.style.display = kernel === 'poly' ? 'block' : 'none';
        coefContainer.style.display = kernel === 'poly' ? 'block' : 'none';
        
        // Update gamma label for polynomial kernel
        if (kernel === 'poly') {
            document.querySelector('#gamma-container label').textContent = 'Polynomial γ (scaling):';
        } else {
            document.querySelector('#gamma-container label').textContent = 'RBF γ (gamma):';
        }
    }
    
    function handleParameterChange() {
        gamma = Math.pow(10, parseFloat(gammaInput.value));
        gammaDisplay.textContent = `γ = ${gamma.toFixed(2)}`;
        
        degree = parseInt(degreeInput.value);
        degreeDisplay.textContent = `d = ${degree}`;
        
        coef = parseFloat(coefInput.value);
        coefDisplay.textContent = `c = ${coef.toFixed(1)}`;
        
        componentsDisplay.textContent = componentsInput.value;
        
        const noise = parseFloat(noiseInput.value);
        noiseDisplay.textContent = noise.toFixed(2);
        
        const sampleSize = parseInt(sampleSizeInput.value);
        sampleSizeDisplay.textContent = sampleSize;
    }
    
    function generateData() {
        const dataset = datasetSelect.value;
        const n = parseInt(sampleSizeInput.value);
        const noise = parseFloat(noiseInput.value);
        
        switch (dataset) {
            case 'blobs':
                generateBlobsData(n, noise);
                break;
            case 'circles':
                generateCirclesData(n, noise);
                break;
            case 'moons':
                generateMoonsData(n, noise);
                break;
            case 'spiral':
                generateSpiralData(n, noise);
                break;
        }
        
        // Reset AE
        aeModel = null;
        aeProjection = null;
        aeProgressElement.textContent = '';
        
        // Ensure data is available
        if (data && data.length > 0) {
            drawData(originalCanvas, data, null, 'Original Data');
        }
    }
    
    function computeProjections() {
        if (!data || data.length === 0) {
            console.warn('No data available for projection');
            return;
        }
        
        const numComponents = parseInt(componentsInput.value);
        
        // Compute standard PCA
        pcaResult = computePCA(data, numComponents);
        
        // Compute Kernel PCA
        kpcaResult = computeKernelPCA(data, kernelSelect.value, numComponents);
        
        // Update visualizations
        drawData(originalCanvas, data, null, 'Original Data');
        drawData(pcaCanvas, data, pcaResult.projection, 'PCA Projection');
        drawData(kpcaCanvas, data, kpcaResult.projection, 'Kernel PCA Projection');
        drawVariance(varianceCanvas, pcaResult.eigenvalues, kpcaResult.eigenvalues);
        
        // Update other tabs
        drawAlgorithmStep(currentStep);
        drawAutoencoderArchitecture();
        drawAutoencoderComparison();
    }
    
    function trainAutoencoder() {
        if (!data || data.length === 0) {
            aeProgressElement.textContent = 'No data available. Generate data first!';
            return;
        }
        
        trainAeBtn.disabled = true;
        aeProgressElement.textContent = 'Initializing autoencoder...';
        
        // Create and train autoencoder with 2D input, 4 hidden units, 2D latent space
        aeModel = new SimpleAutoencoder(2, 4, 2);
        
        setTimeout(() => {
            try {
                // Train with smaller learning rate for stability
                aeModel.train(data, 100, 0.1);
                aeProjection = aeModel.encode(data);
                
                drawAutoencoderComparison();
                trainAeBtn.disabled = false;
            } catch (error) {
                console.error('Autoencoder training error:', error);
                aeProgressElement.textContent = 'Training failed: ' + error.message;
                trainAeBtn.disabled = false;
            }
        }, 100);
    }
    
    // Tab handling
    function handleTabClick(e) {
        const targetTab = e.target.dataset.tab;
        
        // Update active states
        tabBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        tabPanes.forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `${targetTab}-tab`) {
                pane.classList.add('active');
            }
        });
    }
    
    // Algorithm step controls
    function handleStepForward() {
        if (currentStep < 4) {
            currentStep++;
            drawAlgorithmStep(currentStep);
        }
    }
    
    function handleStepBack() {
        if (currentStep > 0) {
            currentStep--;
            drawAlgorithmStep(currentStep);
        }
    }
    
    function handleAutoplay() {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
            autoplayInterval = null;
            document.getElementById('step-auto').textContent = 'Auto Play';
        } else {
            autoplayInterval = setInterval(() => {
                currentStep = (currentStep + 1) % 5;
                drawAlgorithmStep(currentStep);
            }, 2000);
            document.getElementById('step-auto').textContent = 'Stop';
        }
    }
    
    // Add event listeners
    datasetSelect.addEventListener('change', handleDatasetChange);
    kernelSelect.addEventListener('change', handleKernelChange);
    gammaInput.addEventListener('input', handleParameterChange);
    degreeInput.addEventListener('input', handleParameterChange);
    coefInput.addEventListener('input', handleParameterChange);
    componentsInput.addEventListener('input', handleParameterChange);
    noiseInput.addEventListener('input', handleParameterChange);
    sampleSizeInput.addEventListener('input', handleParameterChange);
    
    computeBtn.addEventListener('click', computeProjections);
    generateBtn.addEventListener('click', () => {
        generateData();
        setTimeout(() => {
            computeProjections();
        }, 50);
    });
    trainAeBtn.addEventListener('click', trainAutoencoder);
    
    tabBtns.forEach(btn => btn.addEventListener('click', handleTabClick));
    
    document.getElementById('step-forward').addEventListener('click', handleStepForward);
    document.getElementById('step-back').addEventListener('click', handleStepBack);
    document.getElementById('step-auto').addEventListener('click', handleAutoplay);
    
    // Initialize
    handleParameterChange();
    handleKernelChange();
    
    // Generate initial data and compute projections
    generateData();
    
    // Wait for DOM to be fully ready before computing projections
    requestAnimationFrame(() => {
        computeProjections();
    });
});