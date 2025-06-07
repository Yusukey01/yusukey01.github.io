// Kernel PCA Interactive Demo
// Comprehensive visualization of PCA, Kernel PCA, Lipschitz continuity, and Autoencoders

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
                            <button class="tab-btn" data-tab="lipschitz">Lipschitz Analysis</button>
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
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Standard PCA</h4>
                                        <canvas id="pca-canvas" width="300" height="300"></canvas>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Kernel PCA</h4>
                                        <canvas id="kpca-canvas" width="300" height="300"></canvas>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Explained Variance</h4>
                                        <canvas id="variance-canvas" width="300" height="300"></canvas>
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
                            
                            <!-- Lipschitz Tab -->
                            <div id="lipschitz-tab" class="tab-pane">
                                <div class="lipschitz-grid">
                                    <div class="viz-panel">
                                        <h4>Lipschitz Constant Estimation</h4>
                                        <canvas id="lipschitz-canvas" width="400" height="300"></canvas>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Stability Analysis</h4>
                                        <canvas id="stability-canvas" width="400" height="300"></canvas>
                                    </div>
                                </div>
                                <div id="lipschitz-info" class="info-panel"></div>
                            </div>
                            
                            <!-- Autoencoder Tab -->
                            <div id="autoencoder-tab" class="tab-pane">
                                <div class="autoencoder-grid">
                                    <div class="viz-panel">
                                        <h4>Autoencoder Architecture</h4>
                                        <canvas id="ae-architecture-canvas" width="400" height="300"></canvas>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>Autoencoder Projection</h4>
                                        <canvas id="ae-projection-canvas" width="400" height="300"></canvas>
                                    </div>
                                </div>
                                <div class="ae-controls">
                                    <button id="train-ae" class="primary-btn">Train Autoencoder</button>
                                    <div id="ae-progress" class="progress-bar"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="btn-container">
                            <button id="compute-btn" class="primary-btn">Compute Kernel PCA</button>
                            <button id="generate-btn" class="secondary-btn">Generate New Data</button>
                        </div>
                    </div>
                </div>

                <div class="controls-panel">
                    <div class="control-group">
                        <label for="dataset-select">Dataset:</label>
                        <select id="dataset-select" class="full-width">
                            <option value="linear">Linear</option>
                            <option value="circles" selected>Concentric Circles</option>
                            <option value="moons">Two Moons</option>
                            <option value="swiss">Swiss Roll (3D)</option>
                            <option value="spiral">Spiral</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="kernel-select">Kernel:</label>
                        <select id="kernel-select" class="full-width">
                            <option value="linear">Linear</option>
                            <option value="rbf" selected>RBF (Gaussian)</option>
                            <option value="poly">Polynomial</option>
                            <option value="sigmoid">Sigmoid</option>
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
                        <input type="range" id="components" min="1" max="3" step="1" value="2" class="full-width">
                        <span id="components-display">2</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="noise-level">Noise Level:</label>
                        <input type="range" id="noise-level" min="0" max="0.5" step="0.05" value="0.1" class="full-width">
                        <span id="noise-display">0.10</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="sample-size">Sample Size:</label>
                        <input type="range" id="sample-size" min="50" max="500" step="50" value="200" class="full-width">
                        <span id="sample-size-display">200</span>
                    </div>
                    
                    <div class="control-group">
                        <label>
                            <input type="checkbox" id="show-math"> Show Mathematical Details
                        </label>
                    </div>
                    
                    <div class="results-box">
                        <h3>Performance Metrics:</h3>
                        <div class="result-row">
                            <div class="result-label">PCA Variance:</div>
                            <div class="result-value" id="pca-variance">0.0%</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">KPCA Variance:</div>
                            <div class="result-value" id="kpca-variance">0.0%</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Lipschitz Constant:</div>
                            <div class="result-value" id="lipschitz-constant">-</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Computation Time:</div>
                            <div class="result-value" id="comp-time">0 ms</div>
                        </div>
                    </div>
                    
                    <div class="math-details" id="math-details" style="display: none;">
                        <h4>Mathematical Details:</h4>
                        <div id="math-content"></div>
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
        
        .secondary-btn {
            background-color: #95a5a6;
        }
        
        .secondary-btn:hover {
            background-color: #7f8c8d;
        }
        
        .results-box {
            background-color: #f0f7ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .results-box h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1rem;
        }
        
        .result-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .result-label {
            font-weight: bold;
        }
        
        .result-value {
            font-family: monospace;
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
        
        .lipschitz-grid, .autoencoder-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .info-panel {
            margin-top: 15px;
            padding: 15px;
            background: #fff;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        
        .ae-controls {
            text-align: center;
            margin-top: 20px;
        }
        
        .progress-bar {
            margin-top: 10px;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: #3498db;
            transition: width 0.3s;
        }
        
        .math-details {
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            font-size: 0.9rem;
        }
        
        .math-details h4 {
            margin-top: 0;
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
    const showMathCheckbox = document.getElementById('show-math');
    const mathDetails = document.getElementById('math-details');
    const computeBtn = document.getElementById('compute-btn');
    const generateBtn = document.getElementById('generate-btn');
    
    // Canvas elements
    const originalCanvas = document.getElementById('original-canvas');
    const pcaCanvas = document.getElementById('pca-canvas');
    const kpcaCanvas = document.getElementById('kpca-canvas');
    const varianceCanvas = document.getElementById('variance-canvas');
    const algorithmCanvas = document.getElementById('algorithm-canvas');
    const lipschitzCanvas = document.getElementById('lipschitz-canvas');
    const stabilityCanvas = document.getElementById('stability-canvas');
    const aeArchCanvas = document.getElementById('ae-architecture-canvas');
    const aeProjCanvas = document.getElementById('ae-projection-canvas');
    
    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Result elements
    const pcaVarianceElement = document.getElementById('pca-variance');
    const kpcaVarianceElement = document.getElementById('kpca-variance');
    const lipschitzConstantElement = document.getElementById('lipschitz-constant');
    const compTimeElement = document.getElementById('comp-time');
    
    // State variables
    let data = [];
    let labels = [];
    let pcaProjection = null;
    let kpcaProjection = null;
    let kernelMatrix = null;
    let eigenvectors = null;
    let eigenvalues = null;
    let currentStep = 0;
    let autoplayInterval = null;
    
    // Kernel parameters
    let gamma = 1.0;
    let degree = 3;
    let coef = 1.0;
    
    // Helper functions
    function gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    
    // Dataset generation functions
    function generateLinearData(n, noise) {
        data = [];
        labels = [];
        for (let i = 0; i < n; i++) {
            const x = (Math.random() - 0.5) * 4;
            const y = 0.5 * x + (Math.random() - 0.5) * 2 + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(x > 0 ? 1 : 0);
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
    
    function generateSwissRollData(n, noise) {
        data = [];
        labels = [];
        
        for (let i = 0; i < n; i++) {
            const t = 1.5 * Math.PI * (1 + 2 * Math.random());
            const x = t * Math.cos(t) + gaussianRandom() * noise;
            const y = (Math.random() - 0.5) * 4;
            const z = t * Math.sin(t) + gaussianRandom() * noise;
            data.push([x, y, z]);
            labels.push(Math.floor(t / (3 * Math.PI) * 3));
        }
    }
    
    function generateSpiralData(n, noise) {
        data = [];
        labels = [];
        const n_half = Math.floor(n / 2);
        
        // First spiral
        for (let i = 0; i < n_half; i++) {
            const t = i / n_half * 4 * Math.PI;
            const r = t / (4 * Math.PI);
            const x = r * Math.cos(t) + gaussianRandom() * noise;
            const y = r * Math.sin(t) + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(0);
        }
        
        // Second spiral
        for (let i = 0; i < n - n_half; i++) {
            const t = i / (n - n_half) * 4 * Math.PI;
            const r = t / (4 * Math.PI);
            const x = r * Math.cos(t + Math.PI) + gaussianRandom() * noise;
            const y = r * Math.sin(t + Math.PI) + gaussianRandom() * noise;
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
    
    function polyKernel(x1, x2, degree, coef) {
        let dot = 0;
        for (let i = 0; i < x1.length; i++) {
            dot += x1[i] * x2[i];
        }
        return Math.pow(coef * dot + 1, degree);
    }
    
    function sigmoidKernel(x1, x2, gamma, coef) {
        let dot = 0;
        for (let i = 0; i < x1.length; i++) {
            dot += x1[i] * x2[i];
        }
        return Math.tanh(gamma * dot + coef);
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
                        K[i][j] = polyKernel(data[i], data[j], degree, coef);
                        break;
                    case 'sigmoid':
                        K[i][j] = sigmoidKernel(data[i], data[j], gamma, coef);
                        break;
                }
            }
        }
        
        return K;
    }
    
    // Center kernel matrix
    function centerKernelMatrix(K) {
        const n = K.length;
        const K_centered = [];
        
        // Compute row and column means
        const rowMeans = [];
        const colMeans = [];
        let totalMean = 0;
        
        for (let i = 0; i < n; i++) {
            let rowSum = 0;
            let colSum = 0;
            for (let j = 0; j < n; j++) {
                rowSum += K[i][j];
                colSum += K[j][i];
            }
            rowMeans[i] = rowSum / n;
            colMeans[i] = colSum / n;
            totalMean += rowSum;
        }
        totalMean /= (n * n);
        
        // Center the kernel matrix
        for (let i = 0; i < n; i++) {
            K_centered[i] = [];
            for (let j = 0; j < n; j++) {
                K_centered[i][j] = K[i][j] - rowMeans[i] - colMeans[j] + totalMean;
            }
        }
        
        return K_centered;
    }
    
    // Simple eigendecomposition using power iteration (for demo purposes)
    function eigenDecomposition(matrix, numComponents) {
        const n = matrix.length;
        const eigenvectors = [];
        const eigenvalues = [];
        
        // Create a copy of the matrix
        let A = matrix.map(row => [...row]);
        
        for (let comp = 0; comp < numComponents && comp < n; comp++) {
            // Initialize random vector
            let v = [];
            let norm = 0;
            for (let i = 0; i < n; i++) {
                v[i] = Math.random() - 0.5;
                norm += v[i] * v[i];
            }
            norm = Math.sqrt(norm);
            for (let i = 0; i < n; i++) {
                v[i] /= norm;
            }
            
            // Power iteration
            for (let iter = 0; iter < 100; iter++) {
                // Multiply A by v
                const Av = [];
                for (let i = 0; i < n; i++) {
                    Av[i] = 0;
                    for (let j = 0; j < n; j++) {
                        Av[i] += A[i][j] * v[j];
                    }
                }
                
                // Compute eigenvalue
                let lambda = 0;
                for (let i = 0; i < n; i++) {
                    lambda += v[i] * Av[i];
                }
                
                // Normalize
                norm = 0;
                for (let i = 0; i < n; i++) {
                    norm += Av[i] * Av[i];
                }
                norm = Math.sqrt(norm);
                
                if (norm > 1e-10) {
                    for (let i = 0; i < n; i++) {
                        v[i] = Av[i] / norm;
                    }
                }
            }
            
            // Store eigenvector and eigenvalue
            eigenvectors.push([...v]);
            
            // Compute final eigenvalue
            let lambda = 0;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    lambda += v[i] * A[i][j] * v[j];
                }
            }
            eigenvalues.push(lambda);
            
            // Deflate matrix
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    A[i][j] -= lambda * v[i] * v[j];
                }
            }
        }
        
        return { eigenvectors, eigenvalues };
    }
    
    // Standard PCA
    function computePCA(data, numComponents) {
        const n = data.length;
        const d = data[0].length;
        
        // Compute mean
        const mean = [];
        for (let j = 0; j < d; j++) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
                sum += data[i][j];
            }
            mean[j] = sum / n;
        }
        
        // Center data
        const centered = [];
        for (let i = 0; i < n; i++) {
            centered[i] = [];
            for (let j = 0; j < d; j++) {
                centered[i][j] = data[i][j] - mean[j];
            }
        }
        
        // Compute covariance matrix
        const cov = [];
        for (let i = 0; i < d; i++) {
            cov[i] = [];
            for (let j = 0; j < d; j++) {
                let sum = 0;
                for (let k = 0; k < n; k++) {
                    sum += centered[k][i] * centered[k][j];
                }
                cov[i][j] = sum / (n - 1);
            }
        }
        
        // Eigendecomposition
        const { eigenvectors, eigenvalues } = eigenDecomposition(cov, numComponents);
        
        // Project data
        const projection = [];
        for (let i = 0; i < n; i++) {
            projection[i] = [];
            for (let j = 0; j < numComponents; j++) {
                let sum = 0;
                for (let k = 0; k < d; k++) {
                    sum += centered[i][k] * eigenvectors[j][k];
                }
                projection[i][j] = sum;
            }
        }
        
        return { projection, eigenvalues, eigenvectors, mean };
    }
    
    // Kernel PCA
    function computeKernelPCA(data, kernelType, numComponents) {
        const startTime = performance.now();
        
        // Compute kernel matrix
        kernelMatrix = computeKernelMatrix(data, kernelType);
        
        // Center kernel matrix
        const K_centered = centerKernelMatrix(kernelMatrix);
        
        // Eigendecomposition
        const eigen = eigenDecomposition(K_centered, numComponents);
        eigenvectors = eigen.eigenvectors;
        eigenvalues = eigen.eigenvalues;
        
        // Normalize eigenvectors
        const n = data.length;
        for (let i = 0; i < numComponents; i++) {
            const lambda = eigenvalues[i];
            if (lambda > 1e-10) {
                const factor = 1 / Math.sqrt(lambda);
                for (let j = 0; j < n; j++) {
                    eigenvectors[i][j] *= factor;
                }
            }
        }
        
        // Project data
        const projection = [];
        for (let i = 0; i < n; i++) {
            projection[i] = [];
            for (let j = 0; j < numComponents; j++) {
                projection[i][j] = eigenvalues[j] * eigenvectors[j][i];
            }
        }
        
        const endTime = performance.now();
        compTimeElement.textContent = `${(endTime - startTime).toFixed(1)} ms`;
        
        return { projection, eigenvalues, eigenvectors };
    }
    
    // Estimate Lipschitz constant
    function estimateLipschitzConstant(data, kernelType) {
        const n = Math.min(data.length, 50); // Sample for efficiency
        let maxRatio = 0;
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const x1 = data[i];
                const x2 = data[j];
                
                // Compute input distance
                let inputDist = 0;
                for (let k = 0; k < x1.length; k++) {
                    inputDist += (x1[k] - x2[k]) * (x1[k] - x2[k]);
                }
                inputDist = Math.sqrt(inputDist);
                
                if (inputDist < 1e-10) continue;
                
                // Compute kernel difference
                let k1, k2;
                switch (kernelType) {
                    case 'linear':
                        k1 = linearKernel(x1, x1);
                        k2 = linearKernel(x1, x2);
                        break;
                    case 'rbf':
                        k1 = rbfKernel(x1, x1, gamma);
                        k2 = rbfKernel(x1, x2, gamma);
                        break;
                    case 'poly':
                        k1 = polyKernel(x1, x1, degree, coef);
                        k2 = polyKernel(x1, x2, degree, coef);
                        break;
                    case 'sigmoid':
                        k1 = sigmoidKernel(x1, x1, gamma, coef);
                        k2 = sigmoidKernel(x1, x2, gamma, coef);
                        break;
                }
                
                const kernelDiff = Math.abs(k1 - k2);
                const ratio = kernelDiff / inputDist;
                
                if (ratio > maxRatio) {
                    maxRatio = ratio;
                }
            }
        }
        
        return maxRatio;
    }
    
    // Drawing functions
    function drawData(canvas, data, projection, title) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Find data bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        const drawData = projection || data;
        
        for (const point of drawData) {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
        }
        
        // Add padding
        const padding = 0.1 * Math.max(maxX - minX, maxY - minY);
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        // Draw data points
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];
        
        for (let i = 0; i < drawData.length; i++) {
            const x = (drawData[i][0] - minX) / (maxX - minX) * width;
            const y = height - (drawData[i][1] - minY) / (maxY - minY) * height;
            
            ctx.fillStyle = colors[labels[i] % colors.length];
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    function drawVariance(canvas, pcaEigenvalues, kpcaEigenvalues) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Normalize eigenvalues
        const pcaTotal = pcaEigenvalues.reduce((a, b) => a + b, 0);
        const kpcaTotal = kpcaEigenvalues.reduce((a, b) => a + b, 0);
        
        const pcaNorm = pcaEigenvalues.map(v => v / pcaTotal);
        const kpcaNorm = kpcaEigenvalues.map(v => v / kpcaTotal);
        
        const numComponents = Math.min(pcaNorm.length, kpcaNorm.length);
        const barWidth = width / (numComponents * 2 + 1) * 0.8;
        const maxHeight = height * 0.8;
        
        // Draw bars
        for (let i = 0; i < numComponents; i++) {
            // PCA bar
            const pcaHeight = pcaNorm[i] * maxHeight;
            const pcaX = (i * 2 + 0.5) * width / (numComponents * 2 + 1);
            ctx.fillStyle = '#3498db';
            ctx.fillRect(pcaX - barWidth / 2, height - pcaHeight - 10, barWidth, pcaHeight);
            
            // KPCA bar
            const kpcaHeight = kpcaNorm[i] * maxHeight;
            const kpcaX = (i * 2 + 1.5) * width / (numComponents * 2 + 1);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(kpcaX - barWidth / 2, height - kpcaHeight - 10, barWidth, kpcaHeight);
            
            // Labels
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`PC${i + 1}`, (pcaX + kpcaX) / 2, height - 2);
        }
        
        // Legend
        ctx.font = '12px Arial';
        ctx.fillStyle = '#3498db';
        ctx.fillRect(10, 10, 15, 15);
        ctx.fillStyle = '#333';
        ctx.fillText('PCA', 30, 22);
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(80, 10, 15, 15);
        ctx.fillStyle = '#333';
        ctx.fillText('KPCA', 100, 22);
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
                    drawData(algorithmCanvas, data, null, 'Original Data');
                }
            },
            {
                title: 'Step 2: Compute Kernel Matrix',
                description: 'Calculate pairwise similarities using the kernel function K(xi, xj).',
                draw: () => {
                    if (kernelMatrix) {
                        drawKernelMatrix(algorithmCanvas, kernelMatrix);
                    }
                }
            },
            {
                title: 'Step 3: Center Kernel Matrix',
                description: 'Center the kernel matrix in feature space: K̃ = K - 1K - K1 + 1K1',
                draw: () => {
                    if (kernelMatrix) {
                        const centered = centerKernelMatrix(kernelMatrix);
                        drawKernelMatrix(algorithmCanvas, centered);
                    }
                }
            },
            {
                title: 'Step 4: Eigendecomposition',
                description: 'Find eigenvalues and eigenvectors of the centered kernel matrix.',
                draw: () => {
                    drawEigenvalues(algorithmCanvas);
                }
            },
            {
                title: 'Step 5: Project Data',
                description: 'Project data onto principal components in feature space.',
                draw: () => {
                    if (kpcaProjection) {
                        drawData(algorithmCanvas, data, kpcaProjection, 'Kernel PCA Projection');
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
    
    function drawKernelMatrix(canvas, matrix) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const n = matrix.length;
        const cellSize = Math.min(width, height) * 0.8 / n;
        const offsetX = (width - cellSize * n) / 2;
        const offsetY = (height - cellSize * n) / 2;
        
        // Find min and max values
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
                const color = Math.floor(val * 255);
                ctx.fillStyle = `rgb(${color}, ${color}, ${255 - color})`;
                ctx.fillRect(offsetX + j * cellSize, offsetY + i * cellSize, cellSize - 1, cellSize - 1);
            }
        }
    }
    
    function drawEigenvalues(canvas) {
        if (!eigenvalues) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const n = Math.min(eigenvalues.length, 10);
        const barWidth = width * 0.8 / n;
        const offsetX = width * 0.1;
        const maxHeight = height * 0.7;
        const maxVal = Math.max(...eigenvalues.slice(0, n));
        
        for (let i = 0; i < n; i++) {
            const barHeight = (eigenvalues[i] / maxVal) * maxHeight;
            const x = offsetX + i * barWidth;
            
            ctx.fillStyle = '#3498db';
            ctx.fillRect(x + barWidth * 0.1, height - barHeight - 30, barWidth * 0.8, barHeight);
            
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`λ${i + 1}`, x + barWidth / 2, height - 10);
        }
        
        ctx.font = '14px Arial';
        ctx.fillText('Eigenvalues', width / 2, 20);
    }
    
    // Lipschitz analysis
    function drawLipschitzAnalysis() {
        const ctx = lipschitzCanvas.getContext('2d');
        const width = lipschitzCanvas.width;
        const height = lipschitzCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const kernels = ['linear', 'rbf', 'poly', 'sigmoid'];
        const lipschitzConstants = [];
        
        // Compute Lipschitz constants for each kernel
        for (const kernel of kernels) {
            const L = estimateLipschitzConstant(data, kernel);
            lipschitzConstants.push(L);
        }
        
        // Draw bar chart
        const barWidth = width * 0.8 / kernels.length;
        const offsetX = width * 0.1;
        const maxHeight = height * 0.7;
        const maxL = Math.max(...lipschitzConstants);
        
        for (let i = 0; i < kernels.length; i++) {
            const barHeight = (lipschitzConstants[i] / maxL) * maxHeight;
            const x = offsetX + i * barWidth;
            
            ctx.fillStyle = '#3498db';
            ctx.fillRect(x + barWidth * 0.1, height - barHeight - 40, barWidth * 0.8, barHeight);
            
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(kernels[i], x + barWidth / 2, height - 20);
            ctx.fillText(lipschitzConstants[i].toFixed(2), x + barWidth / 2, height - barHeight - 45);
        }
        
        ctx.font = '14px Arial';
        ctx.fillText('Lipschitz Constants by Kernel', width / 2, 20);
    }
    
    function drawStabilityAnalysis() {
        const ctx = stabilityCanvas.getContext('2d');
        const width = stabilityCanvas.width;
        const height = stabilityCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Show how projection changes with perturbation
        const perturbationLevels = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
        const colors = ['#3498db', '#2980b9', '#1abc9c', '#16a085', '#e74c3c', '#c0392b'];
        
        for (let p = 0; p < perturbationLevels.length; p++) {
            const perturbation = perturbationLevels[p];
            
            // Add perturbation to data
            const perturbedData = data.map(point => 
                point.map(x => x + gaussianRandom() * perturbation)
            );
            
            // Compute kernel PCA on perturbed data
            const result = computeKernelPCA(perturbedData, kernelSelect.value, 2);
            
            // Draw projection
            ctx.globalAlpha = 1 - p * 0.15;
            for (let i = 0; i < result.projection.length; i++) {
                const x = (result.projection[i][0] + 3) / 6 * width;
                const y = height - (result.projection[i][1] + 3) / 6 * height;
                
                ctx.fillStyle = colors[p];
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText('Stability under Perturbation', width / 2, 20);
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
        const nodeRadius = 10;
        
        // Draw connections
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        
        for (let l = 0; l < layers.length - 1; l++) {
            const x1 = (l + 1) * layerSpacing;
            const x2 = (l + 2) * layerSpacing;
            
            for (let i = 0; i < layers[l].size; i++) {
                const y1 = height / 2 + (i - layers[l].size / 2 + 0.5) * 30;
                
                for (let j = 0; j < layers[l + 1].size; j++) {
                    const y2 = height / 2 + (j - layers[l + 1].size / 2 + 0.5) * 30;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        for (let l = 0; l < layers.length; l++) {
            const x = (l + 1) * layerSpacing;
            
            for (let i = 0; i < layers[l].size; i++) {
                const y = height / 2 + (i - layers[l].size / 2 + 0.5) * 30;
                
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
    }
    
    // Event handlers
    function handleDatasetChange() {
        generateData();
        drawData(originalCanvas, data, null, 'Original Data');
    }
    
    function handleKernelChange() {
        const kernel = kernelSelect.value;
        
        // Show/hide relevant parameter controls
        gammaContainer.style.display = (kernel === 'rbf' || kernel === 'sigmoid') ? 'block' : 'none';
        degreeContainer.style.display = kernel === 'poly' ? 'block' : 'none';
        coefContainer.style.display = (kernel === 'poly' || kernel === 'sigmoid') ? 'block' : 'none';
        
        updateMathDetails();
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
            case 'linear':
                generateLinearData(n, noise);
                break;
            case 'circles':
                generateCirclesData(n, noise);
                break;
            case 'moons':
                generateMoonsData(n, noise);
                break;
            case 'swiss':
                generateSwissRollData(n, noise);
                break;
            case 'spiral':
                generateSpiralData(n, noise);
                break;
        }
        
        drawData(originalCanvas, data, null, 'Original Data');
    }
    
    function computeProjections() {
        const numComponents = parseInt(componentsInput.value);
        
        // Compute standard PCA
        const pcaResult = computePCA(data, numComponents);
        pcaProjection = pcaResult.projection;
        
        // Compute Kernel PCA
        const kpcaResult = computeKernelPCA(data, kernelSelect.value, numComponents);
        kpcaProjection = kpcaResult.projection;
        
        // Update visualizations
        drawData(pcaCanvas, data, pcaProjection, 'PCA Projection');
        drawData(kpcaCanvas, data, kpcaProjection, 'Kernel PCA Projection');
        drawVariance(varianceCanvas, pcaResult.eigenvalues, kpcaResult.eigenvalues);
        
        // Update metrics
        const pcaTotalVar = pcaResult.eigenvalues.reduce((a, b) => a + b, 0);
        const pcaExplained = pcaResult.eigenvalues.slice(0, numComponents).reduce((a, b) => a + b, 0);
        pcaVarianceElement.textContent = `${(pcaExplained / pcaTotalVar * 100).toFixed(1)}%`;
        
        const kpcaTotalVar = kpcaResult.eigenvalues.reduce((a, b) => a + b, 0);
        const kpcaExplained = kpcaResult.eigenvalues.slice(0, numComponents).reduce((a, b) => a + b, 0);
        kpcaVarianceElement.textContent = `${(kpcaExplained / kpcaTotalVar * 100).toFixed(1)}%`;
        
        // Estimate Lipschitz constant
        const L = estimateLipschitzConstant(data, kernelSelect.value);
        lipschitzConstantElement.textContent = L.toFixed(3);
        
        // Update other tabs
        drawAlgorithmStep(currentStep);
        drawLipschitzAnalysis();
        drawStabilityAnalysis();
        drawAutoencoderArchitecture();
    }
    
    function updateMathDetails() {
        if (!showMathCheckbox.checked) return;
        
        const kernel = kernelSelect.value;
        let mathContent = '';
        
        switch (kernel) {
            case 'linear':
                mathContent = `
                    <p><strong>Linear Kernel:</strong></p>
                    <p>\\(k(x, y) = x^T y\\)</p>
                    <p>Equivalent to standard PCA</p>
                `;
                break;
            case 'rbf':
                mathContent = `
                    <p><strong>RBF (Gaussian) Kernel:</strong></p>
                    <p>\\(k(x, y) = \\exp(-\\gamma \\|x - y\\|^2)\\)</p>
                    <p>Maps to infinite-dimensional space</p>
                    <p>Current \\(\\gamma = ${gamma.toFixed(2)}\\)</p>
                `;
                break;
            case 'poly':
                mathContent = `
                    <p><strong>Polynomial Kernel:</strong></p>
                    <p>\\(k(x, y) = (c \\cdot x^T y + 1)^d\\)</p>
                    <p>Captures polynomial relationships</p>
                    <p>Current \\(d = ${degree}\\), \\(c = ${coef.toFixed(1)}\\)</p>
                `;
                break;
            case 'sigmoid':
                mathContent = `
                    <p><strong>Sigmoid Kernel:</strong></p>
                    <p>\\(k(x, y) = \\tanh(\\gamma x^T y + c)\\)</p>
                    <p>Similar to neural network activation</p>
                    <p>Current \\(\\gamma = ${gamma.toFixed(2)}\\), \\(c = ${coef.toFixed(1)}\\)</p>
                `;
                break;
        }
        
        mathContent += `
            <hr>
            <p><strong>Kernel PCA Algorithm:</strong></p>
            <ol>
                <li>Compute kernel matrix: \\(K_{ij} = k(x_i, x_j)\\)</li>
                <li>Center: \\(\\tilde{K} = K - \\mathbf{1}_m K - K \\mathbf{1}_m + \\mathbf{1}_m K \\mathbf{1}_m\\)</li>
                <li>Eigendecomposition: \\(\\tilde{K} = V \\Lambda V^T\\)</li>
                <li>Project: \\(z_i = \\sum_{j=1}^m \\alpha_{ij} k(x_j, x)\\)</li>
            </ol>
        `;
        
        document.getElementById('math-content').innerHTML = mathContent;
        
        // Re-render math
        if (window.MathJax) {
            MathJax.typesetPromise([document.getElementById('math-content')]);
        }
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
    showMathCheckbox.addEventListener('change', () => {
        mathDetails.style.display = showMathCheckbox.checked ? 'block' : 'none';
        updateMathDetails();
    });
    
    computeBtn.addEventListener('click', computeProjections);
    generateBtn.addEventListener('click', generateData);
    
    tabBtns.forEach(btn => btn.addEventListener('click', handleTabClick));
    
    document.getElementById('step-forward').addEventListener('click', handleStepForward);
    document.getElementById('step-back').addEventListener('click', handleStepBack);
    document.getElementById('step-auto').addEventListener('click', handleAutoplay);
    
    // Initialize
    handleParameterChange();
    handleKernelChange();
    generateData();
    computeProjections();
});