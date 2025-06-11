// Kernel PCA Interactive Demo - FULLY CORRECTED VERSION
// Fixed projection bug based on academic sources and mlxtend

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
                        <input type="range" id="gamma-parameter" min="-2" max="2" step="0.1" value="0.7" class="full-width">
                        <span id="gamma-display">γ = 5.0</span>
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
        
    `;
    
    document.head.appendChild(styleElement);

    // Get DOM elements - cache all references at once
    const elements = {
        datasetSelect: document.getElementById('dataset-select'),
        kernelSelect: document.getElementById('kernel-select'),
        gammaContainer: document.getElementById('gamma-container'),
        gammaInput: document.getElementById('gamma-parameter'),
        gammaDisplay: document.getElementById('gamma-display'),
        degreeContainer: document.getElementById('degree-container'),
        degreeInput: document.getElementById('degree-parameter'),
        degreeDisplay: document.getElementById('degree-display'),
        coefContainer: document.getElementById('coef-container'),
        coefInput: document.getElementById('coef-parameter'),
        coefDisplay: document.getElementById('coef-display'),
        componentsInput: document.getElementById('components'),
        componentsDisplay: document.getElementById('components-display'),
        noiseInput: document.getElementById('noise-level'),
        noiseDisplay: document.getElementById('noise-display'),
        sampleSizeInput: document.getElementById('sample-size'),
        sampleSizeDisplay: document.getElementById('sample-size-display'),
        computeBtn: document.getElementById('compute-btn'),
        generateBtn: document.getElementById('generate-btn'),
        trainAeBtn: document.getElementById('train-ae'),
        
        // Canvas elements
        originalCanvas: document.getElementById('original-canvas'),
        pcaCanvas: document.getElementById('pca-canvas'),
        kpcaCanvas: document.getElementById('kpca-canvas'),
        varianceCanvas: document.getElementById('variance-canvas'),
        algorithmCanvas: document.getElementById('algorithm-canvas'),
        aeArchCanvas: document.getElementById('ae-architecture-canvas'),
        aeProjCanvas: document.getElementById('ae-projection-canvas'),
        
        // Tab elements
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        
        // Info elements
        aeProgressElement: document.getElementById('ae-progress')
    };
    
    // State variables
    let data = [];
    let labels = [];
    let pcaResult = null;
    let kpcaResult = null;
    let currentStep = 0;
    let autoplayInterval = null;
    let aeModel = null;
    let aeProjection = null;
    
    // Initial gamma to proper range for circles/moons
    let gamma = 5.0;  // Good default for RBF kernel with circles/moons
    let degree = 3;
    let coef = 1.0;
    
    // Box-Muller transform for Gaussian random numbers
    let spareRandom = null;
    function gaussianRandom() {
        if (spareRandom !== null) {
            const val = spareRandom;
            spareRandom = null;
            return val;
        }
        
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        
        const mag = Math.sqrt(-2.0 * Math.log(u));
        spareRandom = mag * Math.cos(2.0 * Math.PI * v);
        return mag * Math.sin(2.0 * Math.PI * v);
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
            const [cx, cy] = centers[c];
            
            for (let i = 0; i < numPoints; i++) {
                const x = cx + gaussianRandom() * 0.5 + gaussianRandom() * noise;
                const y = cy + gaussianRandom() * 0.5 + gaussianRandom() * noise;
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
            const diff = x1[i] - x2[i];
            sum += diff * diff;
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
        const K = new Array(n);
        
        for (let i = 0; i < n; i++) {
            K[i] = new Array(n);
            const dataI = data[i];
            
            for (let j = 0; j <= i; j++) {
                let val;
                switch (kernelType) {
                    case 'linear':
                        val = linearKernel(dataI, data[j]);
                        break;
                    case 'rbf':
                        val = rbfKernel(dataI, data[j], gamma);
                        break;
                    case 'poly':
                        val = polyKernel(dataI, data[j], degree, gamma, coef);
                        break;
                }
                K[i][j] = K[j][i] = val; // Exploit symmetry
            }
        }
        
        return K;
    }
    
    // Proper kernel matrix centering
    function centerKernelMatrix(K) {
        const n = K.length;
        if (n === 0) return K;
        
        // Compute row means
        const rowMeans = new Array(n);
        let totalMean = 0;
        
        for (let i = 0; i < n; i++) {
            let sum = 0;
            const Ki = K[i];
            for (let j = 0; j < n; j++) {
                sum += Ki[j];
            }
            rowMeans[i] = sum / n;
            totalMean += rowMeans[i];
        }
        totalMean /= n;
        
        // Apply centering formula: K̃_ij = K_ij - rowMean_i - rowMean_j + totalMean
        const K_centered = new Array(n);
        for (let i = 0; i < n; i++) {
            K_centered[i] = new Array(n);
            const Ki = K[i];
            const rowMeanI = rowMeans[i];
            
            for (let j = 0; j < n; j++) {
                K_centered[i][j] = Ki[j] - rowMeanI - rowMeans[j] + totalMean;
            }
        }
        
        return K_centered;
    }
    
    // Improved Jacobi eigendecomposition with better convergence
    function jacobiEigendecomposition(matrix, numComponents = null) {
        const n = matrix.length;
        if (n === 0) {
            return { eigenvalues: [], eigenvectors: [] };
        }
        
        if (n === 1) {
            const eigenvalues = [matrix[0][0]];
            const eigenvectors = [[1]];
            
            if (numComponents !== null && numComponents < 1) {
                return { eigenvalues: [], eigenvectors: [] };
            }
            
            return { eigenvalues, eigenvectors };
        }
        
        const maxIterations = 500;  // Increased iterations for better convergence
        const tolerance = 1e-14;    // Tighter tolerance
        
        // Initialize
        let A = matrix.map(row => [...row]);
        let V = Array(n).fill().map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
        
        // Keep track of off-diagonal sum for convergence check
        let prevOffDiagSum = Infinity;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Find largest off-diagonal element
            let maxVal = 0;
            let p = 0, q = 1;
            let offDiagSum = 0;
            
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const absVal = Math.abs(A[i][j]);
                    offDiagSum += absVal;
                    if (absVal > maxVal) {
                        maxVal = absVal;
                        p = i;
                        q = j;
                    }
                }
            }
            
            // Check convergence
            if (maxVal < tolerance || Math.abs(offDiagSum - prevOffDiagSum) < tolerance) break;
            prevOffDiagSum = offDiagSum;
            
            // Calculate rotation angle
            const diff = A[q][q] - A[p][p];
            const theta = Math.abs(diff) < 1e-10 ? Math.PI / 4 : 0.5 * Math.atan2(2 * A[p][q], diff);
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
        const eigenPairs = [];
        
        for (let i = 0; i < n; i++) {
            const eigenvector = V.map(row => row[i]);
            // Normalize eigenvector to unit length
            const norm = Math.sqrt(eigenvector.reduce((sum, val) => sum + val * val, 0));
            const normalizedEigenvector = norm > 0 ? eigenvector.map(val => val / norm) : eigenvector;
            
            eigenPairs.push({
                value: A[i][i],
                vector: normalizedEigenvector
            });
        }
        
        // Sort by eigenvalue (descending)
        eigenPairs.sort((a, b) => b.value - a.value);
        
        const sortedEigenvalues = eigenPairs.map(pair => pair.value);
        const sortedEigenvectors = eigenPairs.map(pair => pair.vector);
        
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
        const mean = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
            const point = data[i];
            for (let j = 0; j < d; j++) {
                mean[j] += point[j];
            }
        }
        for (let j = 0; j < d; j++) {
            mean[j] /= n;
        }
        
        // Center data
        const centered = new Array(n);
        for (let i = 0; i < n; i++) {
            centered[i] = new Array(d);
            const point = data[i];
            for (let j = 0; j < d; j++) {
                centered[i][j] = point[j] - mean[j];
            }
        }
        
        // Compute covariance matrix
        const cov = new Array(d);
        for (let i = 0; i < d; i++) {
            cov[i] = new Array(d).fill(0);
        }
        
        for (let i = 0; i < d; i++) {
            for (let j = i; j < d; j++) {
                let sum = 0;
                for (let k = 0; k < n; k++) {
                    sum += centered[k][i] * centered[k][j];
                }
                cov[i][j] = cov[j][i] = sum / (n - 1);
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
        const projection = new Array(n);
        for (let i = 0; i < n; i++) {
            projection[i] = new Array(numComponents).fill(0);
            const centeredPoint = centered[i];
            
            for (let j = 0; j < actualComponents; j++) {
                let sum = 0;
                const eigenvector = eigen.eigenvectors[j];
                for (let k = 0; k < d; k++) {
                    sum += centeredPoint[k] * eigenvector[k];
                }
                projection[i][j] = sum;
            }
        }
        
        // Pad eigenvalues and eigenvectors with zeros if needed
        const paddedEigenvalues = [...eigen.eigenvalues];
        const paddedEigenvectors = [...eigen.eigenvectors];
        
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
    
    // Kernel PCA
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
        
        // Eigendecomposition of centered kernel matrix
        const eigen = jacobiEigendecomposition(K_centered);
        
        // Sort and filter valid eigenvalues/eigenvectors
        const eigenPairs = [];
        for (let i = 0; i < eigen.eigenvalues.length; i++) {
            if (eigen.eigenvalues[i] > 1e-10) {  // Only positive eigenvalues
                eigenPairs.push({
                    value: eigen.eigenvalues[i],
                    vector: eigen.eigenvectors[i]
                });
            }
        }
        
        // Sort by eigenvalue descending
        eigenPairs.sort((a, b) => b.value - a.value);
        
        // Select top numComponents
        const selectedPairs = eigenPairs.slice(0, Math.min(numComponents, eigenPairs.length));
        
        // y_i = sum_j (alpha_j * K_centered[i,j]) where alpha_j = eigenvector_j / sqrt(eigenvalue_j)
        
        const projection = new Array(n);
        const validEigenvalues = [];
        const normalizedEigenvectors = [];
        
        // First normalize the eigenvectors
        for (const { value: lambda, vector: alpha } of selectedPairs) {
            const sqrtLambda = Math.sqrt(lambda);
            const normalizedAlpha = [];

            // simple for–of over each entry
            for (const val of alpha) {
                normalizedAlpha.push(val / sqrtLambda);
            }

            validEigenvalues.push(lambda);
            normalizedEigenvectors.push(normalizedAlpha);
        }
                
        // For each data point i, project onto each principal component
        for (let i = 0; i < n; i++) {
            projection[i] = new Array(numComponents).fill(0);
            
            // For each principal component
            for (let j = 0; j < normalizedEigenvectors.length; j++) {
                // The projection is the dot product of the i-th row of K_centered 
                // with the j-th normalized eigenvector
                let proj = 0;
                const alpha = normalizedEigenvectors[j];
                for (let k = 0; k < n; k++) {
                    proj += K_centered[i][k] * alpha[k];
                }
                projection[i][j] = proj;
            }
        }
        
        // Pad eigenvalues if needed
        const paddedEigenvalues = [...validEigenvalues];
        for (let i = validEigenvalues.length; i < numComponents; i++) {
            paddedEigenvalues.push(0);
        }
        
        return {
            projection,
            eigenvalues: paddedEigenvalues,
            eigenvectors: normalizedEigenvectors,
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
            this.b1 = new Array(hiddenDim).fill(0);
            this.W2 = this.randomMatrix(latentDim, hiddenDim, scale2);
            this.b2 = new Array(latentDim).fill(0);
            
            // Decoder weights
            this.W3 = this.randomMatrix(hiddenDim, latentDim, scale3);
            this.b3 = new Array(hiddenDim).fill(0);
            this.W4 = this.randomMatrix(inputDim, hiddenDim, scale4);
            this.b4 = new Array(inputDim).fill(0);
        }
        
        randomMatrix(rows, cols, scale) {
            const matrix = new Array(rows);
            for (let i = 0; i < rows; i++) {
                matrix[i] = new Array(cols);
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
                    output: new Array(this.inputDim).fill(0),
                    latent: new Array(this.latentDim).fill(0),
                    z1: new Array(this.hiddenDim).fill(0),
                    a1: new Array(this.hiddenDim).fill(0),
                    z2: new Array(this.latentDim).fill(0),
                    z3: new Array(this.hiddenDim).fill(0),
                    a3: new Array(this.hiddenDim).fill(0),
                    z4: new Array(this.inputDim).fill(0)
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
            
            const result = new Array(matrix.length);
            for (let i = 0; i < matrix.length; i++) {
                let sum = 0;
                const row = matrix[i];
                const len = Math.min(row.length, vector.length);
                for (let j = 0; j < len; j++) {
                    sum += row[j] * vector[j];
                }
                result[i] = sum;
            }
            return result;
        }
        
        addBias(vector, bias) {
            if (!vector || !bias) return vector || [];
            
            const result = new Array(vector.length);
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
                    const dL_dz4 = new Array(this.inputDim);
                    for (let j = 0; j < this.inputDim; j++) {
                        dL_dz4[j] = 2.0 * (output[j] - input[j]) / n;
                    }
                    
                    // Hidden layer 2 gradients
                    const dL_da3 = this.vectorMatrixMultiply(dL_dz4, this.W4);
                    const dL_dz3 = new Array(this.hiddenDim);
                    for (let j = 0; j < this.hiddenDim; j++) {
                        dL_dz3[j] = dL_da3[j] * this.reluDerivative(z3[j]);
                    }
                    
                    // Latent layer gradients
                    const dL_dlatent = this.vectorMatrixMultiply(dL_dz3, this.W3);
                    const dL_dz2 = dL_dlatent; // Linear activation
                    
                    // Hidden layer 1 gradients
                    const dL_da1 = this.vectorMatrixMultiply(dL_dz2, this.W2);
                    const dL_dz1 = new Array(this.hiddenDim);
                    for (let j = 0; j < this.hiddenDim; j++) {
                        dL_dz1[j] = dL_da1[j] * this.reluDerivative(z1[j]);
                    }
                    
                    // Update weights and biases
                    // W4 and b4
                    for (let j = 0; j < this.inputDim; j++) {
                        const grad = dL_dz4[j];
                        for (let k = 0; k < this.hiddenDim; k++) {
                            this.W4[j][k] -= lr * grad * a3[k];
                        }
                        this.b4[j] -= lr * grad;
                    }
                    
                    // W3 and b3
                    for (let j = 0; j < this.hiddenDim; j++) {
                        const grad = dL_dz3[j];
                        for (let k = 0; k < this.latentDim; k++) {
                            this.W3[j][k] -= lr * grad * latent[k];
                        }
                        this.b3[j] -= lr * grad;
                    }
                    
                    // W2 and b2
                    for (let j = 0; j < this.latentDim; j++) {
                        const grad = dL_dz2[j];
                        for (let k = 0; k < this.hiddenDim; k++) {
                            this.W2[j][k] -= lr * grad * a1[k];
                        }
                        this.b2[j] -= lr * grad;
                    }
                    
                    // W1 and b1
                    for (let j = 0; j < this.hiddenDim; j++) {
                        const grad = dL_dz1[j];
                        for (let k = 0; k < this.inputDim; k++) {
                            this.W1[j][k] -= lr * grad * input[k];
                        }
                        this.b1[j] -= lr * grad;
                    }
                }
                
                // Update progress
                if (epoch % 20 === 0 && elements.aeProgressElement) {
                    const avgLoss = totalLoss / n;
                    elements.aeProgressElement.textContent = `Training... Epoch ${epoch}/${epochs}, Loss: ${avgLoss.toFixed(4)}`;
                }
            }
            
            // Final update
            if (elements.aeProgressElement) {
                const avgLoss = totalLoss / n;
                elements.aeProgressElement.textContent = `Training complete! Final loss: ${avgLoss.toFixed(4)}`;
            }
        }
        
        vectorMatrixMultiply(vector, matrix) {
            const result = new Array(matrix[0].length);
            for (let j = 0; j < matrix[0].length; j++) {
                let sum = 0;
                for (let i = 0; i < vector.length; i++) {
                    sum += vector[i] * matrix[i][j];
                }
                result[j] = sum;
            }
            return result;
        }
        
        encode(data) {
            if (!data || data.length === 0) return [];
            
            const encoded = new Array(data.length);
            for (let i = 0; i < data.length; i++) {
                try {
                    const { latent } = this.forward(data[i]);
                    // Ensure we always return 2D points
                    encoded[i] = [
                        latent[0] || 0,
                        latent[1] || 0
                    ];
                } catch (error) {
                    console.error('Encoding error for point', i, error);
                    encoded[i] = [0, 0];
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
        const range = Math.max(maxX - minX, maxY - minY, 0.1);
        const padding = 0.1 * range;
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
    
    // Autoencoder visualization
    function drawAutoencoderArchitecture() {
        const ctx = elements.aeArchCanvas.getContext('2d');
        const width = elements.aeArchCanvas.width;
        const height = elements.aeArchCanvas.height;
        
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
        const ctx = elements.aeProjCanvas.getContext('2d');
        const width = elements.aeProjCanvas.width;
        const height = elements.aeProjCanvas.height;
        
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
        requestAnimationFrame(() => {
            computeProjections();
        });
    }
    
    function handleKernelChange() {
        const kernel = elements.kernelSelect.value;
        
        // Show/hide relevant parameter controls
        elements.gammaContainer.style.display = kernel === 'rbf' || kernel === 'poly' ? 'block' : 'none';
        elements.degreeContainer.style.display = kernel === 'poly' ? 'block' : 'none';
        elements.coefContainer.style.display = kernel === 'poly' ? 'block' : 'none';
        
        // Update gamma label for polynomial kernel
        if (kernel === 'poly') {
            document.querySelector('#gamma-container label').textContent = 'Polynomial γ (scaling):';
        } else {
            document.querySelector('#gamma-container label').textContent = 'RBF γ (gamma):';
        }
    }
    
    // Better parameter handling and default values
    function handleParameterChange() {
        // Use more appropriate gamma range for demonstration
        gamma = Math.pow(10, parseFloat(elements.gammaInput.value));
        elements.gammaDisplay.textContent = `γ = ${gamma.toFixed(1)}`;
        
        degree = parseInt(elements.degreeInput.value);
        elements.degreeDisplay.textContent = `d = ${degree}`;
        
        coef = parseFloat(elements.coefInput.value);
        elements.coefDisplay.textContent = `c = ${coef.toFixed(1)}`;
        
        elements.componentsDisplay.textContent = elements.componentsInput.value;
        
        const noise = parseFloat(elements.noiseInput.value);
        elements.noiseDisplay.textContent = noise.toFixed(2);
        
        const sampleSize = parseInt(elements.sampleSizeInput.value);
        elements.sampleSizeDisplay.textContent = sampleSize;
    }
    
    function generateData() {
        const dataset = elements.datasetSelect.value;
        const n = parseInt(elements.sampleSizeInput.value);
        const noise = parseFloat(elements.noiseInput.value);
        
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
        elements.aeProgressElement.textContent = '';
        
        // Ensure data is available
        if (data && data.length > 0) {
            drawData(elements.originalCanvas, data, null, 'Original Data');
        }
    }
    
    function computeProjections() {
        if (!data || data.length === 0) {
            console.warn('No data available for projection');
            return;
        }
        
        const numComponents = parseInt(elements.componentsInput.value);
        
        // Compute standard PCA
        pcaResult = computePCA(data, numComponents);
        
        // Compute Kernel PCA
        kpcaResult = computeKernelPCA(data, elements.kernelSelect.value, numComponents);
        
        // Update visualizations
        drawData(elements.originalCanvas, data, null, 'Original Data');
        drawData(elements.pcaCanvas, data, pcaResult.projection, 'PCA Projection');
        drawData(elements.kpcaCanvas, data, kpcaResult.projection, 'Kernel PCA Projection');
        drawVariance(elements.varianceCanvas, pcaResult.eigenvalues, kpcaResult.eigenvalues);
        
        // Update other tabs
        drawAlgorithmStep(currentStep);
        drawAutoencoderArchitecture();
        drawAutoencoderComparison();
    }
    
    function trainAutoencoder() {
        if (!data || data.length === 0) {
            elements.aeProgressElement.textContent = 'No data available. Generate data first!';
            return;
        }
        
        elements.trainAeBtn.disabled = true;
        elements.aeProgressElement.textContent = 'Initializing autoencoder...';
        
        // Create and train autoencoder with 2D input, 4 hidden units, 2D latent space
        aeModel = new SimpleAutoencoder(2, 4, 2);
        
        setTimeout(() => {
            try {
                // Train with smaller learning rate for stability
                aeModel.train(data, 100, 0.1);
                aeProjection = aeModel.encode(data);
                
                drawAutoencoderComparison();
                elements.trainAeBtn.disabled = false;
            } catch (error) {
                console.error('Autoencoder training error:', error);
                elements.aeProgressElement.textContent = 'Training failed: ' + error.message;
                elements.trainAeBtn.disabled = false;
            }
        }, 100);
    }
    
    // Tab handling
    function handleTabClick(e) {
        const targetTab = e.target.dataset.tab;
        
        // Update active states
        elements.tabBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        elements.tabPanes.forEach(pane => {
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
    elements.datasetSelect.addEventListener('change', handleDatasetChange);
    elements.kernelSelect.addEventListener('change', handleKernelChange);
    elements.gammaInput.addEventListener('input', handleParameterChange);
    elements.degreeInput.addEventListener('input', handleParameterChange);
    elements.coefInput.addEventListener('input', handleParameterChange);
    elements.componentsInput.addEventListener('input', handleParameterChange);
    elements.noiseInput.addEventListener('input', handleParameterChange);
    elements.sampleSizeInput.addEventListener('input', handleParameterChange);
    
    elements.computeBtn.addEventListener('click', computeProjections);
    elements.generateBtn.addEventListener('click', () => {
        generateData();
        requestAnimationFrame(() => {
            computeProjections();
        });
    });
    elements.trainAeBtn.addEventListener('click', trainAutoencoder);
    
    elements.tabBtns.forEach(btn => btn.addEventListener('click', handleTabClick));
    
    document.getElementById('step-forward').addEventListener('click', handleStepForward);
    document.getElementById('step-back').addEventListener('click', handleStepBack);
    document.getElementById('step-auto').addEventListener('click', handleAutoplay);
    
    // Initialize
    handleParameterChange();
    handleKernelChange();
    
    // Better default gamma for demonstration
    elements.gammaInput.value = "0.7";  // Sets gamma = 5.0, good for circles/moons
    handleParameterChange();
    
    // Generate initial data and compute projections
    generateData();
    
    // Wait for DOM to be fully ready before computing projections
    requestAnimationFrame(() => {
        computeProjections();
    });
});