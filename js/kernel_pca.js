// Kernel PCA Interactive Demo

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
                                        <h4>Explained Variance Ratio</h4>
                                        <canvas id="variance-canvas" width="300" height="300"></canvas>
                                        <p class="graph-explanation">Proportion of variance explained by each principal component. Shows relative importance of components in capturing data variation.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Autoencoder Tab -->
                            <div id="autoencoder-tab" class="tab-pane">
                                <div class="autoencoder-grid">
                                    <div class="viz-panel">
                                        <h4>Original vs Reconstructed</h4>
                                        <canvas id="reconstruction-canvas" width="400" height="300"></canvas>
                                        <p class="graph-explanation">Shows how the 1D bottleneck autoencoder projects 2D data onto a 1D manifold (curve). Some information loss is expected when compressing 2D → 1D → 2D.</p>
                                    </div>
                                    <div class="viz-panel">
                                        <h4>1D Latent Representation</h4>
                                        <canvas id="latent-1d-canvas" width="400" height="300"></canvas>
                                        <p class="graph-explanation">Visualization of how data points are arranged in the 1D latent space. Colors show which cluster each point belongs to. Good representations group similar points together.</p>
                                    </div>
                                </div>
                                <div class="ae-controls">
                                    <button id="train-ae" class="primary-btn">Train 1D Autoencoder</button>
                                    <div id="ae-progress" class="progress-info"></div>
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
                        <input type="range" id="gamma-parameter" min="-1" max="2" step="0.1" value="1" class="full-width">
                        <span id="gamma-display">γ = 10.0</span>
                        <div class="param-hint">Controls kernel width. Higher = more local influence</div>
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
        reconstructionCanvas: document.getElementById('reconstruction-canvas'),
        latent1dCanvas: document.getElementById('latent-1d-canvas'),
        
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
    let aeModel = null;
    let aeProjection = null;
    
    // Better default gamma for RBF kernel
    let gamma = 1.0;  
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
        if (n === 0) return [];
        
        const K = new Array(n);
        
        // Validate gamma for RBF kernel
        if (kernelType === 'rbf' && gamma <= 0) {
            console.warn('Invalid gamma value, using default');
            gamma = 1.0;
        }
        
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
                        val = polyKernel(dataI, data[j], degree, 1.0, coef);
                        break;
                }
                K[i][j] = K[j][i] = val; // Exploit symmetry
            }
        }
        
        return K;
    }
    
   // kernel matrix centering with correct formula
    function centerKernelMatrix(K) {
        const n = K.length;
        if (n === 0) return K;
        
        // Create centered kernel matrix
        const K_centered = new Array(n);
        for (let i = 0; i < n; i++) {
            K_centered[i] = new Array(n);
        }
        
        // Compute the mean of each row and column, and overall mean
        const rowMeans = new Array(n).fill(0);
        const colMeans = new Array(n).fill(0);
        let overallMean = 0;
        
        // Compute row sums (which equal column sums for symmetric matrix)
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rowMeans[i] += K[i][j];
                colMeans[j] += K[i][j];
            }
        }
        
        // Convert sums to means
        for (let i = 0; i < n; i++) {
            rowMeans[i] /= n;
            colMeans[i] /= n;
            overallMean += rowMeans[i];
        }
        overallMean /= n;
        
        // Apply double centering formula:
        // K̃_ij = K_ij - (1/n)∑_k K_ik - (1/n)∑_k K_kj + (1/n²)∑_kl K_kl
        // Which simplifies to: K̃_ij = K_ij - rowMean_i - colMean_j + overallMean
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                K_centered[i][j] = K[i][j] - rowMeans[i] - colMeans[j] + overallMean;
            }
        }
        
        return K_centered;
    }
    
    // Jacobi eigendecomposition
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
            eigenPairs.push({
                value: A[i][i],
                vector: eigenvector
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
    
    // regularization to kernel matrix for numerical stability
    function regularizeKernelMatrix(K, epsilon = 1e-6) {
        const n = K.length;
        const K_reg = K.map(row => [...row]);
        
        // Add small value to diagonal for numerical stability
        for (let i = 0; i < n; i++) {
            K_reg[i][i] += epsilon;
        }
        
        return K_reg;
    }

    // Update computeKernelPCA to use regularization
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
        
        // Check if kernel matrix is degenerate and warn
        if (isKernelMatrixDegenerate(K)) {
            console.warn('Kernel matrix is nearly diagonal - results may be poor');
        }
        
        // Center kernel matrix
        const K_centered = centerKernelMatrix(K);
        
        // Regularize for numerical stability
        const K_regularized = regularizeKernelMatrix(K_centered, 1e-8);
        
        // Eigendecomposition of centered kernel matrix
        const eigen = jacobiEigendecomposition(K_regularized);
        
        // Sort and filter valid eigenvalues/eigenvectors
        const eigenPairs = [];
        for (let i = 0; i < eigen.eigenvalues.length; i++) {
            // Use a slightly higher threshold for numerical stability
            if (eigen.eigenvalues[i] > 1e-8) {  
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
        
        const projection = new Array(n);
        const validEigenvalues = [];
        const validEigenvectors = [];
        
        // Extract eigenvalues and eigenvectors
        for (let j = 0; j < selectedPairs.length; j++) {
            const { value: lambda, vector: alpha } = selectedPairs[j];
            validEigenvalues.push(lambda);
            validEigenvectors.push(alpha);
        }
        
        // Check if we have enough valid components
        if (validEigenvectors.length === 0) {
            console.error('No valid eigenvectors found! Kernel matrix may be degenerate.');
            
            // Return zero projections
            for (let i = 0; i < n; i++) {
                projection[i] = new Array(numComponents).fill(0);
            }
            
            return {
                projection,
                eigenvalues: new Array(numComponents).fill(0),
                eigenvectors: [],
                kernelMatrix: K,
                centeredKernelMatrix: K_centered
            };
        }

        // Project data
        for (let i = 0; i < n; i++) {
            projection[i] = new Array(numComponents).fill(0);
            
            // Project using k_i^T U Λ^(-1/2)
            for (let j = 0; j < validEigenvectors.length; j++) {
                let sum = 0;
                const eigenvector = validEigenvectors[j];
                const sqrtLambda = Math.sqrt(validEigenvalues[j]);
                
                // Use centered kernel matrix for projection
                for (let k = 0; k < n; k++) {
                    sum += K_centered[i][k] * eigenvector[k];
                }
                projection[i][j] = sum / sqrtLambda;
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
            eigenvectors: validEigenvectors,
            kernelMatrix: K,
            centeredKernelMatrix: K_centered
        };
    }
    
    // autoencoder implementation for nonlinear dimensionality reduction
    class SimpleAutoencoder {
        constructor(inputDim, hiddenDim, latentDim) {
            this.inputDim = inputDim;
            this.hiddenDim = hiddenDim;
            this.latentDim = latentDim;
            
            // Xavier/Glorot initialization for mixed activations
            const scale1 = Math.sqrt(2.0 / (inputDim + hiddenDim));
            const scale2 = Math.sqrt(2.0 / (hiddenDim + latentDim));
            const scale3 = Math.sqrt(2.0 / (latentDim + hiddenDim));
            const scale4 = Math.sqrt(2.0 / (hiddenDim + inputDim));
          
            // Simple 4-layer architecture: Input -> Hidden -> Latent -> Hidden -> Output
            this.W1 = this.randomMatrix(hiddenDim, inputDim, scale1);
            this.b1 = new Array(hiddenDim).fill(0);
            this.W2 = this.randomMatrix(latentDim, hiddenDim, scale2);
            this.b2 = new Array(latentDim).fill(0);
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
        
        zeroMatrix(rows, cols) {
            return Array(rows).fill().map(() => Array(cols).fill(0));
        }
        
        // ReLU activation for stability
        relu(x) {
            return Math.max(0, x);
        }
        
        reluDerivative(x) {
            return x > 0 ? 1 : 0;
        }
        
        // Tanh for bounded latent space
        tanh(x) {
            return Math.tanh(x);
        }
        
        tanhDerivative(x) {
            const t = Math.tanh(x);
            return 1 - t * t;
        }
        
        forward(input, training = false) {
            if (!input || input.length !== this.inputDim) {
                return {
                    output: new Array(this.inputDim).fill(0),
                    latent: new Array(this.latentDim).fill(0),
                    intermediates: {}
                };
            }
            
            // Encoder: Input -> Hidden -> Latent
            const z1 = this.addBias(this.matrixVectorMultiply(this.W1, input), this.b1);
            const a1 = z1.map(x => this.relu(x));
            
            const z2 = this.addBias(this.matrixVectorMultiply(this.W2, a1), this.b2);
            const latent = z2;
            
            // Decoder: Latent -> Hidden -> Output
            const z3 = this.addBias(this.matrixVectorMultiply(this.W3, latent), this.b3);
            const a3 = z3.map(x => this.relu(x));
            
            const z4 = this.addBias(this.matrixVectorMultiply(this.W4, a3), this.b4);
            const output = z4; // Linear output
            
            return { 
                output, 
                latent, 
                intermediates: { z1, a1, z2, z3, a3, z4 }
            };
        }
        
        train(data, epochs = 500, learningRate = 0.01, batchSize = 16) {
            const n = data.length;
            if (n === 0) return;
            
            const momentum = 0.9;
            const decay = 0.995;
            const m = this.initializeCache();

            let totalLoss = 0;
            for (let epoch = 0; epoch < epochs; epoch++) {
                totalLoss = 0;
                const currentLr = learningRate * Math.pow(decay, epoch / 100);
                
                // Shuffle data
                const indices = Array.from({length: n}, (_, i) => i);
                for (let i = n - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                
                // Mini-batch training
                for (let batch = 0; batch < n; batch += batchSize) {
                    const batchEnd = Math.min(batch + batchSize, n);
                    const batchGradients = this.initializeGradients();
                    
                    for (let idx = batch; idx < batchEnd; idx++) {
                        const i = indices[idx];
                        const input = data[i];
                        
                        const { output, intermediates } = this.forward(input, true);
                        
                        // Reconstruction loss only
                        let loss = 0;
                        for (let j = 0; j < this.inputDim; j++) {
                            const diff = output[j] - input[j];
                            loss += diff * diff;
                        }
                        totalLoss += loss;
                        
                        this.backpropagate(batchGradients, input, intermediates, 1.0 / (batchEnd - batch));
                    }
                    
                    this.applyGradients(batchGradients, m, currentLr, momentum);
                }
                
                if (epoch % 50 === 0 && elements.aeProgressElement) {
                    const avgLoss = totalLoss / n;
                    elements.aeProgressElement.textContent = `Training... Epoch ${epoch}/${epochs}, Loss: ${avgLoss.toFixed(4)}`;
                }
            }
            
            if (elements.aeProgressElement) {
                const avgLoss = totalLoss / n;
                elements.aeProgressElement.textContent = `Training complete! Final loss: ${avgLoss.toFixed(4)}`;
            }
        }
        
        backpropagate(batchGradients, input, intermediates, batchNorm) {
            const { z1, a1, z2, z3, a3, z4 } = intermediates;
            
            // Output gradients
            const dL_dz4 = z4.map((val, j) => 2.0 * (val - input[j]) * batchNorm);
            
            // Decoder hidden gradients
            const dL_da3 = this.vectorMatrixMultiply(dL_dz4, this.W4);
            const dL_dz3 = dL_da3.map((val, j) => val * this.reluDerivative(z3[j]));
            
            // Latent gradients
            const dL_dlatent = this.vectorMatrixMultiply(dL_dz3, this.W3);
            const dL_dz2 = dL_dlatent; 
            
            // Encoder hidden gradients
            const dL_da1 = this.vectorMatrixMultiply(dL_dz2, this.W2);
            const dL_dz1 = dL_da1.map((val, j) => val * this.reluDerivative(z1[j]));
            
           this.accumulateGradients(batchGradients, {
                dL_dz1, dL_dz2, dL_dz3, dL_dz4,
                input, a1, latent: z2, a3
            });
        }
        
        accumulateGradients(gradients, computed) {
            const { dL_dz1, dL_dz2, dL_dz3, dL_dz4, input, a1, latent, a3 } = computed;
            
            // Output layer
            for (let j = 0; j < this.inputDim; j++) {
                const grad = dL_dz4[j];
                for (let k = 0; k < this.hiddenDim; k++) {
                    gradients.W4[j][k] += grad * a3[k];
                }
                gradients.b4[j] += grad;
            }
            
            // Decoder hidden
            for (let j = 0; j < this.hiddenDim; j++) {
                const grad = dL_dz3[j];
                for (let k = 0; k < this.latentDim; k++) {
                    gradients.W3[j][k] += grad * latent[k];
                }
                gradients.b3[j] += grad;
            }
            
            // Latent layer
            for (let j = 0; j < this.latentDim; j++) {
                const grad = dL_dz2[j];
                for (let k = 0; k < this.hiddenDim; k++) {
                    gradients.W2[j][k] += grad * a1[k];
                }
                gradients.b2[j] += grad;
            }
            
            // Encoder hidden
            for (let j = 0; j < this.hiddenDim; j++) {
                const grad = dL_dz1[j];
                for (let k = 0; k < this.inputDim; k++) {
                    gradients.W1[j][k] += grad * input[k];
                }
                gradients.b1[j] += grad;
            }
        }
        
        applyGradients(gradients, m, lr, momentum) {
            // gradient clipping
            const clipValue = 5.0;
            const clipGradients = (grad) => {
                for (let i = 0; i < grad.length; i++) {
                    if (Array.isArray(grad[i])) {
                        for (let j = 0; j < grad[i].length; j++) {
                            grad[i][j] = Math.max(-clipValue, Math.min(clipValue, grad[i][j]));
                        }
                    } else {
                        grad[i] = Math.max(-clipValue, Math.min(clipValue, grad[i]));
                    }
                }
            };
            
            clipGradients(gradients.W1); clipGradients(gradients.b1);
            clipGradients(gradients.W2); clipGradients(gradients.b2);
            clipGradients(gradients.W3); clipGradients(gradients.b3);
            clipGradients(gradients.W4); clipGradients(gradients.b4);
            
            this.updateWeightsWithMomentum(this.W4, gradients.W4, m.W4, lr, momentum);
            this.updateBiasWithMomentum(this.b4, gradients.b4, m.b4, lr, momentum);
            this.updateWeightsWithMomentum(this.W3, gradients.W3, m.W3, lr, momentum);
            this.updateBiasWithMomentum(this.b3, gradients.b3, m.b3, lr, momentum);
            this.updateWeightsWithMomentum(this.W2, gradients.W2, m.W2, lr, momentum);
            this.updateBiasWithMomentum(this.b2, gradients.b2, m.b2, lr, momentum);
            this.updateWeightsWithMomentum(this.W1, gradients.W1, m.W1, lr, momentum);
            this.updateBiasWithMomentum(this.b1, gradients.b1, m.b1, lr, momentum);
        }
        
        updateWeightsWithMomentum(W, grad, m, lr, momentum) {
            for (let i = 0; i < W.length; i++) {
                for (let j = 0; j < W[i].length; j++) {
                    m[i][j] = momentum * m[i][j] + lr * grad[i][j];
                    W[i][j] -= m[i][j];
                }
            }
        }
        
        updateBiasWithMomentum(b, grad, m, lr, momentum) {
            for (let i = 0; i < b.length; i++) {
                m[i] = momentum * m[i] + lr * grad[i];
                b[i] -= m[i];
            }
        }
        
        // Helper methods remain the same
        matrixVectorMultiply(matrix, vector) {
            if (!matrix || !vector || matrix.length === 0 || vector.length === 0) {
                return [];
            }
            const result = new Array(matrix.length);
            for (let i = 0; i < matrix.length; i++) {
                let sum = 0;
                const row = matrix[i];
                for (let j = 0; j < Math.min(row.length, vector.length); j++) {
                    sum += row[j] * vector[j];
                }
                result[i] = sum;
            }
            return result;
        }
        
        addBias(vector, bias) {
            if (!vector || !bias) return vector || [];
            return vector.map((val, i) => val + (bias[i] || 0));
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
        
        initializeCache() {
            return {
                W1: this.zeroMatrix(this.hiddenDim, this.inputDim),
                b1: new Array(this.hiddenDim).fill(0),
                W2: this.zeroMatrix(this.latentDim, this.hiddenDim),
                b2: new Array(this.latentDim).fill(0),
                W3: this.zeroMatrix(this.hiddenDim, this.latentDim),
                b3: new Array(this.hiddenDim).fill(0),
                W4: this.zeroMatrix(this.inputDim, this.hiddenDim),
                b4: new Array(this.inputDim).fill(0)
            };
        }
        
        initializeGradients() {
            return this.initializeCache();
        }
        
        encode(data) {
            if (!data || data.length === 0) return [];
            const encoded = new Array(data.length);
            for (let i = 0; i < data.length; i++) {
                try {
                    const { latent } = this.forward(data[i], false);
                    encoded[i] = [
                        latent[0] || 0,
                        this.latentDim > 1 ? (latent[1] || 0) : (latent[0] || 0)
                    ];
                } catch (error) {
                    encoded[i] = [0, 0];
                }
            }
            return encoded;
        }
    }
    
    // drawing function with error handling
    function drawData(canvas, data, projection, title) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Add title
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);
        
        // Check if we have data
        if (!data || data.length === 0) {
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', width / 2, height / 2);
            return;
        }
        
        // Use projection if available, otherwise use original data
        let drawData;
        if (projection && projection.length > 0) {
            // Validate projection dimensions
            if (!projection[0] || projection[0].length < 2) {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('Invalid projection dimensions', width / 2, height / 2);
                return;
            }
            drawData = projection.map(p => [p[0] || 0, p[1] || 0]);
        } else {
            drawData = data;
        }
        
        // Find data bounds with safety checks
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const point of drawData) {
            if (!point || point.length < 2) continue;
            const x = point[0];
            const y = point[1];
            if (!isFinite(x) || !isFinite(y)) continue;
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        
        // Check if we found valid bounds
        if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Invalid data bounds', width / 2, height / 2);
            return;
        }
        
        // Calculate range and padding
        const xRange = maxX - minX;
        const yRange = maxY - minY;
        const range = Math.max(xRange, yRange, 0.1);
        const padding = 0.15 * range;
        
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        // Update ranges after padding
        const finalXRange = maxX - minX;
        const finalYRange = maxY - minY;
        
        // Drawing area (leave space for title)
        const drawTop = 30;
        const drawHeight = height - drawTop - 10;
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        
        // X-axis (only if 0 is in range)
        if (minY <= 0 && maxY >= 0) {
            const yZero = drawTop + drawHeight - ((0 - minY) / finalYRange) * drawHeight;
            ctx.beginPath();
            ctx.moveTo(5, yZero);
            ctx.lineTo(width - 5, yZero);
            ctx.stroke();
        }
        
        // Y-axis (only if 0 is in range)
        if (minX <= 0 && maxX >= 0) {
            const xZero = 5 + ((0 - minX) / finalXRange) * (width - 10);
            ctx.beginPath();
            ctx.moveTo(xZero, drawTop);
            ctx.lineTo(xZero, height - 10);
            ctx.stroke();
        }
        
        // Draw data points
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#34495e'];
        
        for (let i = 0; i < drawData.length; i++) {
            const point = drawData[i];
            if (!point || point.length < 2) continue;
            
            const x = point[0];
            const y = point[1];
            if (!isFinite(x) || !isFinite(y)) continue;
            
            const px = 5 + ((x - minX) / finalXRange) * (width - 10);
            const py = drawTop + drawHeight - ((y - minY) / finalYRange) * drawHeight;
            
            // Skip points outside canvas
            if (px < 0 || px > width || py < 0 || py > height) continue;
            
            ctx.fillStyle = colors[labels[i] % colors.length];
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add border for better visibility
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Add axis labels if space permits
        if (width > 200) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            
            // X-axis label
            ctx.fillText('PC1', width / 2, height - 2);
            
            // Y-axis label
            ctx.save();
            ctx.translate(10, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('PC2', 0, 0);
            ctx.restore();
        }
    }

    
    // variance visualization
    function drawVariance(canvas, pcaEigenvalues, kpcaEigenvalues) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!pcaEigenvalues || !kpcaEigenvalues || pcaEigenvalues.length === 0 || kpcaEigenvalues.length === 0) return;
        
        // Calculate explained variance ratio
        const pcaTotal = pcaEigenvalues.reduce((a, b) => a + b, 0);
        const kpcaTotal = kpcaEigenvalues.reduce((a, b) => a + b, 0);
        
        const pcaRatios = pcaTotal > 0 ? pcaEigenvalues.map(e => e / pcaTotal) : pcaEigenvalues.map(() => 0);
        const kpcaRatios = kpcaTotal > 0 ? kpcaEigenvalues.map(e => e / kpcaTotal) : kpcaEigenvalues.map(() => 0);
        
        const numComponents = Math.min(pcaRatios.length, kpcaRatios.length, 4);
        const barWidth = width / (numComponents * 2 + 1) * 0.7;
        const maxHeight = height * 0.7;
        
        // Draw title
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('Explained Variance Ratio', width / 2, 20);
        
        // Draw bars
        for (let i = 0; i < numComponents; i++) {
            // PCA bar
            const pcaHeight = pcaRatios[i] * maxHeight;
            const pcaX = (i * 2 + 0.5) * width / (numComponents * 2 + 1) + barWidth / 2;
            
            ctx.fillStyle = '#3498db';
            ctx.fillRect(pcaX - barWidth / 2, height - pcaHeight - 30, barWidth, pcaHeight);
            
            // Value label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText((pcaRatios[i] * 100).toFixed(1) + '%', pcaX, height - pcaHeight - 35);
            
            // KPCA bar
            const kpcaHeight = kpcaRatios[i] * maxHeight;
            const kpcaX = (i * 2 + 1.5) * width / (numComponents * 2 + 1) + barWidth / 2;
            
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(kpcaX - barWidth / 2, height - kpcaHeight - 30, barWidth, kpcaHeight);
            
            // Value label
            ctx.fillStyle = '#333';
            ctx.fillText((kpcaRatios[i] * 100).toFixed(1) + '%', kpcaX, height - kpcaHeight - 35);
            
            // Component label
            ctx.fillText(`PC${i + 1}`, (pcaX + kpcaX) / 2, height - 10);
        }
        
        // Legend
        ctx.font = '12px Arial';
        ctx.fillStyle = '#3498db';
        ctx.fillRect(10, 35, 15, 15);
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.fillText('PCA', 30, 47);
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(10, 55, 15, 15);
        ctx.fillStyle = '#333';
        ctx.fillText('Kernel PCA', 30, 67);
        
        // Show cumulative variance
        const pcaCumulative = pcaRatios.slice(0, numComponents).reduce((a, b) => a + b, 0);
        const kpcaCumulative = kpcaRatios.slice(0, numComponents).reduce((a, b) => a + b, 0);
        
        ctx.font = '11px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText(`Cumulative: PCA ${(pcaCumulative * 100).toFixed(1)}%, KPCA ${(kpcaCumulative * 100).toFixed(1)}%`, 
                     width / 2, height - 45);
    }

    // Draw original vs reconstructed data comparison
   function drawReconstructionComparison() {
        const ctx = elements.reconstructionCanvas.getContext('2d');
        const width = elements.reconstructionCanvas.width;
        const height = elements.reconstructionCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!aeModel || !data || data.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Train autoencoder to see reconstruction', width / 2, height / 2);
            return;
        }
        
        // Get normalization parameters and normalize data
        const { normalized: normalizedData, mean, std } = normalizeData(data);
        
        // Get reconstructions in normalized space
        const reconstructedNormalized = [];
        for (let i = 0; i < normalizedData.length; i++) {
            const { output } = aeModel.forward(normalizedData[i], false);
            reconstructedNormalized.push(output);
        }
        
        // Denormalize back to original scale
        const reconstructedOriginal = reconstructedNormalized.map(point => [
            point[0] * std[0] + mean[0],
            point[1] * std[1] + mean[1]
        ]);
        
        // Split canvas and draw both datasets
        const halfWidth = width / 2;
        
       // Draw original on left
        ctx.save();
        ctx.rect(0, 0, halfWidth - 1, height);  // <-- FIX: use rect() then clip()
        ctx.clip();
        drawDataSubset(ctx, data, 'Original', 0, 0, halfWidth, height);
        ctx.restore();

        // Draw reconstructed on right
        ctx.save();
        ctx.rect(halfWidth + 1, 0, halfWidth - 1, height);  // <-- FIX: use rect() then clip()
        ctx.clip();
        drawDataSubset(ctx, reconstructedOriginal, 'Reconstructed', halfWidth, 0, halfWidth, height);
        ctx.restore();
        
        // Draw divider
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(halfWidth, 30);
        ctx.lineTo(halfWidth, height - 10);
        ctx.stroke();
        
        // Show reconstruction error
        let totalError = 0;
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < 2; j++) {
                const diff = reconstructedOriginal[i][j] - data[i][j];
                totalError += diff * diff;
            }
        }
        const rmse = Math.sqrt(totalError / (data.length * 2));
        
        ctx.font = '11px Arial';
        ctx.fillStyle = rmse < 0.3 ? '#27ae60' : rmse < 0.6 ? '#f39c12' : '#e74c3c';
        ctx.textAlign = 'center';
        ctx.fillText(`RMSE: ${rmse.toFixed(3)}`, width / 2, height - 5);
    }

    // Helper function for drawing data subsets
    function drawDataSubset(ctx, drawData, title, offsetX, offsetY, canvasWidth, canvasHeight) {
        if (!drawData || drawData.length === 0) return;
        
        // Find bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const point of drawData) {
            if (!point || point.length < 2) continue;
            const [x, y] = point;
            if (!isFinite(x) || !isFinite(y)) continue;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        
        // Add padding
        const range = Math.max(maxX - minX, maxY - minY, 0.1);
        const padding = 0.1 * range;
        minX -= padding; maxX += padding; minY -= padding; maxY += padding;
        
        const xRange = maxX - minX;
        const yRange = maxY - minY;
        
        // Drawing area
        const drawTop = offsetY + 25;
        const drawHeight = canvasHeight - 35;
        const drawLeft = offsetX + 5;
        const drawWidth = canvasWidth - 10;
        
        // Title
        ctx.font = '12px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(title, offsetX + canvasWidth / 2, offsetY + 15);
        
        // Draw points
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#34495e'];
        
        for (let i = 0; i < drawData.length; i++) {
            const point = drawData[i];
            if (!point || point.length < 2) continue;
            
            const [x, y] = point;
            if (!isFinite(x) || !isFinite(y)) continue;
            
            const px = drawLeft + ((x - minX) / xRange) * drawWidth;
            const py = drawTop + drawHeight - ((y - minY) / yRange) * drawHeight;
            
            if (px < drawLeft || px > drawLeft + drawWidth || py < drawTop || py > drawTop + drawHeight) continue;
            
            ctx.fillStyle = colors[labels[i] % colors.length];
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Draw 1D latent space visualization
    function drawLatent1D() {
        const ctx = elements.latent1dCanvas.getContext('2d');
        const width = elements.latent1dCanvas.width;
        const height = elements.latent1dCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!aeModel || !data || data.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Train 1D autoencoder to see latent space', width / 2, height / 2);
            return;
        }
        
        // Get 1D latent representations
        const { normalized: normalizedData } = normalizeData(data);
        const latentValues = [];
        
        for (let i = 0; i < normalizedData.length; i++) {
            const { latent } = aeModel.forward(normalizedData[i], false);
            latentValues.push(latent[0]); // Only first component for 1D
        }
        
        // Find latent range
        const minLatent = Math.min(...latentValues);
        const maxLatent = Math.max(...latentValues);
        const latentRange = maxLatent - minLatent;
        
        // Draw title
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('1D Latent Space Visualization', width / 2, 20);
        
        // Draw latent line
        const lineY = height / 2;
        const lineStartX = 50;
        const lineEndX = width - 50;
        const lineLength = lineEndX - lineStartX;
        
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lineStartX, lineY);
        ctx.lineTo(lineEndX, lineY);
        ctx.stroke();
        
        // Draw points on latent line
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#34495e'];
        
        for (let i = 0; i < latentValues.length; i++) {
            const latentVal = latentValues[i];
            const x = lineStartX + ((latentVal - minLatent) / latentRange) * lineLength;
            
            ctx.fillStyle = colors[labels[i] % colors.length];
            ctx.beginPath();
            ctx.arc(x, lineY, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Add labels
        ctx.font = '10px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Low latent values', lineStartX, lineY + 20);
        ctx.fillText('High latent values', lineEndX, lineY + 20);
        
        // Show latent range
        ctx.fillText(`Range: [${minLatent.toFixed(2)}, ${maxLatent.toFixed(2)}]`, width / 2, height - 20);
    }
    
    
    // Compute median pairwise distance for gamma suggestion
    function computeMedianPairwiseDistance(data, sampleSize = 100) {
        if (!data || data.length < 2) return 1.0;
        
        const n = Math.min(data.length, sampleSize);
        const distances = [];
        
        // Sample random pairs to compute distances
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let dist = 0;
                for (let k = 0; k < data[i].length; k++) {
                    const diff = data[i][k] - data[j][k];
                    dist += diff * diff;
                }
                distances.push(Math.sqrt(dist));
            }
        }
        
        // Find median
        distances.sort((a, b) => a - b);
        const median = distances[Math.floor(distances.length / 2)];
        
        return median > 0 ? median : 1.0;
    }

    // Dataset-specific gamma recommendations
    const DATASET_GAMMA_HINTS = {
        'circles': { 
            base: 0.5, 
            hint: 'Concentric circles need moderate gamma for radial separation' 
        },
        'moons': { 
            base: 5.0,
            hint: 'Two moons need high gamma to capture local curved structure' 
        },
        'blobs': { 
            base: 0.1, 
            hint: 'Gaussian blobs need low gamma for global structure' 
        },
        'spiral': { 
            base: 2.0, 
            hint: 'Spirals need balanced gamma for following the curve' 
        }
    };
    
    //  gamma suggestion based on dataset characteristics
    function suggestGammaForDataset(data, datasetType) {
        // Get base gamma for dataset type
        const datasetHint = DATASET_GAMMA_HINTS[datasetType] || { base: 1.0 };
        
        // Compute actual data statistics
        const medianDist = computeMedianPairwiseDistance(data);
        console.log(`Dataset: ${datasetType}, Median distance: ${medianDist}`);
        
        // For two moons, we need special handling
        if (datasetType === 'moons') {
                       const targetSimilarity = 0.2;
            const suggestedGamma = -Math.log(targetSimilarity) / (medianDist * medianDist);
            console.log(`Two moons: suggested gamma = ${suggestedGamma}`);
            return suggestedGamma;
        }
        
        // For other datasets, use the standard scaling
        const scaleAdjustment = 2.0 / medianDist;
        return datasetHint.base * scaleAdjustment;
    }

    // analyze the kernel matrix quality
    function analyzeKernelMatrixForMoons(K, labels) {
        const n = K.length;
        if (n === 0) return;
        
        // Calculate average within-class and between-class similarities
        let withinClassSim = 0;
        let betweenClassSim = 0;
        let withinCount = 0;
        let betweenCount = 0;
        
        // Also track local neighborhood similarities
        let localWithinSim = 0;
        let localBetweenSim = 0;
        let localCount = 0;
        
        for (let i = 0; i < n; i++) {
            // Find k nearest neighbors based on kernel values
            const neighbors = [];
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    neighbors.push({ idx: j, sim: K[i][j] });
                }
            }
            neighbors.sort((a, b) => b.sim - a.sim);
            
            // Analyze top 10 neighbors
            const k = Math.min(10, neighbors.length);
            for (let nIdx = 0; nIdx < k; nIdx++) {
                const j = neighbors[nIdx].idx;
                if (labels[i] === labels[j]) {
                    localWithinSim += neighbors[nIdx].sim;
                } else {
                    localBetweenSim += neighbors[nIdx].sim;
                }
                localCount++;
            }
            
            // Global statistics
            for (let j = i + 1; j < n; j++) {
                if (labels[i] === labels[j]) {
                    withinClassSim += K[i][j];
                    withinCount++;
                } else {
                    betweenClassSim += K[i][j];
                    betweenCount++;
                }
            }
        }
        
        withinClassSim /= withinCount;
        betweenClassSim /= betweenCount;
        localWithinSim /= localCount;
        localBetweenSim /= localCount;
        
        console.log('Two moons kernel analysis:', {
            globalWithinClassSim: withinClassSim.toFixed(4),
            globalBetweenClassSim: betweenClassSim.toFixed(4),
            globalRatio: (withinClassSim / betweenClassSim).toFixed(2),
            localWithinClassSim: localWithinSim.toFixed(4),
            localBetweenClassSim: localBetweenSim.toFixed(4),
            localRatio: (localWithinSim / localBetweenSim).toFixed(2)
        });
        
        // For two moons, we want strong LOCAL separation
        if (localWithinSim / localBetweenSim < 2.0) {
            console.warn('Poor local separation - gamma might be too low');
        } else if (localWithinSim / localBetweenSim > 50) {
            console.warn('Too much locality - gamma might be too high');
        }
        
        return { withinClassSim, betweenClassSim, localWithinSim, localBetweenSim };
    }
    

    function handleDatasetChange() {
        generateData();
        
        // Update gamma for RBF kernel based on dataset
        if (data && data.length > 0 && elements.kernelSelect.value === 'rbf') {
            // Normalize data first
            const { normalized: normalizedData } = normalizeData(data);
            
            // Get dataset-specific gamma
            const datasetType = elements.datasetSelect.value;
            const suggestedGamma = suggestGammaForDataset(normalizedData, datasetType);
            
            // Set gamma
            gamma = suggestedGamma;
            
            // Update slider
            const logGamma = Math.log10(gamma);
            elements.gammaInput.value = Math.max(-1, Math.min(2, logGamma)).toString();
            
            // Update display
            if (gamma < 1) {
                elements.gammaDisplay.textContent = `γ = ${gamma.toFixed(3)}`;
            } else {
                elements.gammaDisplay.textContent = `γ = ${gamma.toFixed(2)}`;
            }
            
            // Update hint with dataset-specific info
            const hint = document.querySelector('#gamma-container .param-hint');
            const datasetHint = DATASET_GAMMA_HINTS[datasetType];
            if (hint && datasetHint) {
                hint.style.color = '#666';
                hint.textContent = datasetHint.hint + ` (γ = ${gamma.toFixed(3)})`;
            }
            
            console.log(`Set gamma to ${gamma} for ${datasetType} dataset`);
        }
        
        requestAnimationFrame(() => {
            computeProjections();
        });
    }

    // Add visual feedback when gamma is adjusted
    function addGammaAdjustmentFeedback() {
        elements.gammaInput.addEventListener('input', function() {    
            // Recompute projections with slight delay to avoid too many updates
            clearTimeout(window.gammaUpdateTimeout);
            window.gammaUpdateTimeout = setTimeout(() => {
                computeProjections();
            }, 300);
        });
    }
    

    // Add debug information for kernel matrix
    function debugKernelMatrix(K) {
        if (!K || K.length === 0) return;
        
        // Check if kernel matrix is valid
        let minVal = Infinity, maxVal = -Infinity;
        let avgVal = 0;
        const n = K.length;
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const val = K[i][j];
                minVal = Math.min(minVal, val);
                maxVal = Math.max(maxVal, val);
                avgVal += val;
            }
        }
        avgVal /= (n * n);
        
        console.log('Kernel matrix stats:', {
            min: minVal,
            max: maxVal,
            avg: avgVal,
            size: n
        });
        
        // Check if matrix is too uniform (all values similar)
        if (maxVal - minVal < 0.01) {
            console.warn('Kernel matrix values are too uniform. Try adjusting gamma.');
        }
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
    
    // parameter handling and default values
    function handleParameterChange() {
        // Use more appropriate gamma range for demonstration
        gamma = Math.pow(10, parseFloat(elements.gammaInput.value));
        
        // Show more precision for small values
        if (gamma < 1) {
            elements.gammaDisplay.textContent = `γ = ${gamma.toFixed(3)}`;
        } else if (gamma < 10) {
            elements.gammaDisplay.textContent = `γ = ${gamma.toFixed(2)}`;
        } else {
            elements.gammaDisplay.textContent = `γ = ${gamma.toFixed(1)}`;
        }
        
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

    // Add a helper to check if kernel matrix is degenerate
    function isKernelMatrixDegenerate(K) {
        if (!K || K.length === 0) return true;
        
        const n = K.length;
        let offDiagonalMax = 0;
        
        // Find maximum off-diagonal element
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    offDiagonalMax = Math.max(offDiagonalMax, K[i][j]);
                }
            }
        }
        
        // If all off-diagonal elements are near zero, the matrix is degenerate
        return offDiagonalMax < 0.01;
    }

    // Add a helper to check if kernel matrix is degenerate
    function isKernelMatrixDegenerate(K) {
        if (!K || K.length === 0) return true;
        
        const n = K.length;
        let offDiagonalMax = 0;
        
        // Find maximum off-diagonal element
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    offDiagonalMax = Math.max(offDiagonalMax, K[i][j]);
                }
            }
        }
        
        // If all off-diagonal elements are near zero, the matrix is degenerate
        return offDiagonalMax < 0.01;
    }

    // Enhanced debug function
    function debugKernelMatrix(K) {
        if (!K || K.length === 0) return;
        
        // Check if kernel matrix is valid
        let minVal = Infinity, maxVal = -Infinity;
        let avgVal = 0;
        let offDiagAvg = 0;
        let diagAvg = 0;
        const n = K.length;
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const val = K[i][j];
                minVal = Math.min(minVal, val);
                maxVal = Math.max(maxVal, val);
                avgVal += val;
                
                if (i === j) {
                    diagAvg += val;
                } else {
                    offDiagAvg += val;
                }
            }
        }
        avgVal /= (n * n);
        diagAvg /= n;
        offDiagAvg /= (n * (n - 1));
        
        console.log('Kernel matrix stats:', {
            min: minVal,
            max: maxVal,
            avg: avgVal,
            diagAvg: diagAvg,
            offDiagAvg: offDiagAvg,
            size: n
        });
        
        // Check if matrix is degenerate
        if (isKernelMatrixDegenerate(K)) {
            console.warn('⚠️ Kernel matrix is degenerate! Off-diagonal values too small.');
            console.warn('Try decreasing gamma (move slider left) for RBF kernel.');
            
            // Show warning in UI
            const hint = document.querySelector('#gamma-container .param-hint');
            if (hint && elements.kernelSelect.value === 'rbf') {
                hint.style.color = '#e74c3c';
                hint.textContent = '⚠️ Gamma too high! Try moving slider left.';
            }
        } else {
            // Reset hint color if matrix is good
            const hint = document.querySelector('#gamma-container .param-hint');
            if (hint) {
                hint.style.color = '#666';
            }
        }
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
    
    // Normalize data to have zero mean and unit variance per feature
    function normalizeData(data) {
        if (!data || data.length === 0) return { normalized: [], mean: [], std: [] };
        
        const n = data.length;
        const d = data[0].length;
        
        // Compute mean
        const mean = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < d; j++) {
                mean[j] += data[i][j];
            }
        }
        for (let j = 0; j < d; j++) {
            mean[j] /= n;
        }
        
        // Compute standard deviation
        const std = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < d; j++) {
                const diff = data[i][j] - mean[j];
                std[j] += diff * diff;
            }
        }
        for (let j = 0; j < d; j++) {
            std[j] = Math.sqrt(std[j] / (n - 1));
            // Avoid division by zero
            if (std[j] < 1e-10) std[j] = 1;
        }
        
        // Normalize
        const normalized = new Array(n);
        for (let i = 0; i < n; i++) {
            normalized[i] = new Array(d);
            for (let j = 0; j < d; j++) {
                normalized[i][j] = (data[i][j] - mean[j]) / std[j];
            }
        }
        
        return { normalized, mean, std };
    }

    function computeProjections() {
        if (!data || data.length === 0) {
            console.warn('No data available for projection');
            return;
        }
        
        const numComponents = parseInt(elements.componentsInput.value);
        
        // Compute standard PCA
        pcaResult = computePCA(data, numComponents);
        
        // Normalize data for kernel PCA
        const { normalized: normalizedData } = normalizeData(data);
        
        // Auto-adjust gamma if using RBF kernel
        if (elements.kernelSelect.value === 'rbf') {
            const datasetType = elements.datasetSelect.value;
        
        }
        
        // Compute Kernel PCA on normalized data
        kpcaResult = computeKernelPCA(normalizedData, elements.kernelSelect.value, numComponents);
        
        // Special analysis for two moons
        if (elements.datasetSelect.value === 'moons' && kpcaResult.kernelMatrix) {
            analyzeKernelMatrixForMoons(kpcaResult.kernelMatrix, labels);
        }
        
        // Scale kernel PCA projection for better visualization
        kpcaResult.projectionScaled = scaleProjectionForVisualization(
            kpcaResult.projection, 
            data
        );
        
        // Debug kernel matrix
        if (kpcaResult.kernelMatrix) {
            debugKernelMatrix(kpcaResult.kernelMatrix);
        }
        
        // Update visualizations - use scaled projection for kernel PCA
        drawData(elements.originalCanvas, data, null, 'Original Data');
        drawData(elements.pcaCanvas, data, pcaResult.projection, 'PCA Projection');
        drawData(elements.kpcaCanvas, data, kpcaResult.projectionScaled || kpcaResult.projection, 'Kernel PCA Projection');
        drawVariance(elements.varianceCanvas, pcaResult.eigenvalues, kpcaResult.eigenvalues);
        
        // Update Autoencoder tab
        drawReconstructionComparison();
        drawLatent1D();
    }
    

    
    // Scaling function for visualization
    function scaleProjectionForVisualization(projection, referenceData) {
        if (!projection || projection.length === 0) return projection;
        
        // Compute scale of reference data
        let refScale = 0;
        for (let i = 0; i < referenceData.length; i++) {
            for (let j = 0; j < referenceData[i].length; j++) {
                refScale = Math.max(refScale, Math.abs(referenceData[i][j]));
            }
        }
        
        // Compute scale of projection
        let projScale = 0;
        for (let i = 0; i < projection.length; i++) {
            for (let j = 0; j < Math.min(2, projection[i].length); j++) {
                projScale = Math.max(projScale, Math.abs(projection[i][j]));
            }
        }
        
        if (projScale < 1e-10 || refScale < 1e-10) return projection;
        
        // Scale projection to match reference scale
        const scaleFactor = refScale / projScale * 0.8; // 0.8 to keep some margin
        
        return projection.map(row => 
            row.map(val => val * scaleFactor)
        );
    }

    // Enhanced training function for 1D autoencoder
    function trainAutoencoder() {
        if (!data || data.length === 0) {
            elements.aeProgressElement.textContent = 'No data available. Generate data first!';
            return;
        }
        
        elements.trainAeBtn.disabled = true;
        elements.aeProgressElement.textContent = 'Initializing 1D autoencoder...';
        
        const { normalized: normalizedData } = normalizeData(data);
        
        // Conservative parameters for better convergence
        let hiddenSize, epochs, lr, batchSize;
        
       switch (elements.datasetSelect.value) {
            case 'moons':
                hiddenSize = 32; epochs = 1000; lr = 0.003; batchSize = 64;
                break;
            case 'circles':
                hiddenSize = 24; epochs = 800; lr = 0.005; batchSize = 64;
                break;
            case 'spiral':
                hiddenSize = 64; epochs = 1500; lr = 0.002; batchSize = 32;
                break;
            case 'blobs':
                hiddenSize = 16; epochs = 500; lr = 0.008; batchSize = 64;
                break;
            default:
                hiddenSize = 24; epochs = 800; lr = 0.005; batchSize = 64;
        }
        
        aeModel = new SimpleAutoencoder(2, hiddenSize, 1);
        
        setTimeout(() => {
            try {
                aeModel.train(normalizedData, epochs, lr, batchSize);
                
                drawReconstructionComparison();
                drawLatent1D();
                
                elements.trainAeBtn.disabled = false;
                
                // Calculate and display reconstruction error
                let totalError = 0;
                for (let i = 0; i < normalizedData.length; i++) {
                    const { output } = aeModel.forward(normalizedData[i], false);
                    for (let j = 0; j < 2; j++) {
                        const diff = output[j] - normalizedData[i][j];
                        totalError += diff * diff;
                    }
                }
                const rmse = Math.sqrt(totalError / (normalizedData.length * 2));
                
                if (elements.aeProgressElement) {
                    elements.aeProgressElement.innerHTML += `<br>Reconstruction RMSE: ${rmse.toFixed(4)}`;
                    
                    // Adjust thresholds based on dataset complexity
                    let excellentThreshold, goodThreshold;
                    switch (elements.datasetSelect.value) {
                        case 'blobs':
                            excellentThreshold = 0.3; goodThreshold = 0.5;
                            break;
                        case 'circles':
                            excellentThreshold = 0.5; goodThreshold = 0.7;
                            break;
                        case 'moons':
                            excellentThreshold = 0.4; goodThreshold = 0.6;
                            break;
                        case 'spiral':
                            excellentThreshold = 0.6; goodThreshold = 0.8;
                            break;
                        default:
                            excellentThreshold = 0.4; goodThreshold = 0.6;
                    }
                    
                    if (rmse < excellentThreshold) {
                        elements.aeProgressElement.innerHTML += '<br><span style="color: green;">✓ Excellent 1D reconstruction!</span>';
                    } else if (rmse < goodThreshold) {
                        elements.aeProgressElement.innerHTML += '<br><span style="color: orange;">✓ Good 1D reconstruction</span>';
                    } else {
                        elements.aeProgressElement.innerHTML += '<br><span style="color: red;">⚠️ High reconstruction error</span>';
                    }
                    
                    elements.aeProgressElement.innerHTML += '<br><small style="color: #666;">Note: 1D bottleneck projects data onto a curve</small>';
                }
                
            } catch (error) {
                console.error('Training error:', error);
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
    
    
    // Initialize
    gamma = 1.0;  // Start with reasonable defaul
    handleParameterChange();
    handleKernelChange();
    addGammaAdjustmentFeedback();

    // Generate initial data with proper gamma
    elements.datasetSelect.value = 'circles';  // Start with circles dataset
    // Generate initial data and compute projections
    generateData();

    // Set initial gamma based on dataset
    if (data && data.length > 0) {
        const { normalized: normalizedData } = normalizeData(data);
        const suggestedGamma = suggestGammaForDataset(normalizedData, 'circles');
        gamma = suggestedGamma;
        
        // Update UI
        const logGamma = Math.log10(gamma);
        elements.gammaInput.value = Math.max(-1, Math.min(2, logGamma)).toString();
        elements.gammaDisplay.textContent = `γ = ${gamma.toFixed(3)}`;
    }

    // Compute projections after a short delay to ensure everything is ready
    setTimeout(() => {
        computeProjections();
        
        // Show initial hint
        const hint = document.querySelector('#gamma-container .param-hint');
        if (hint) {
            hint.textContent = 'Adjust slider to control kernel width. Left = wider, Right = narrower';
        }
    }, 100);

    
    // keyboard shortcuts for quick gamma adjustment
    document.addEventListener('keydown', function(e) {
        if (elements.kernelSelect.value !== 'rbf') return;
        
        if (e.key === '[') {
            // Decrease gamma
            const currentLog = parseFloat(elements.gammaInput.value);
            elements.gammaInput.value = (currentLog - 0.1).toString();
            handleParameterChange();
            computeProjections();
        } else if (e.key === ']') {
            // Increase gamma
            const currentLog = parseFloat(elements.gammaInput.value);
            elements.gammaInput.value = (currentLog + 0.1).toString();
            handleParameterChange();
            computeProjections();
        }
    });


    const gammaContainer = document.getElementById('gamma-container');
    if (gammaContainer) {
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset γ';
        resetBtn.style.cssText = 'margin-left: 10px; padding: 2px 8px; font-size: 0.8rem;';
        resetBtn.onclick = function() {
            handleDatasetChange();  // This will reset gamma to optimal value
        };
        
        const gammaDisplay = document.getElementById('gamma-display');
        if (gammaDisplay) {
            gammaDisplay.parentNode.insertBefore(resetBtn, gammaDisplay.nextSibling);
        }
    }
    
});