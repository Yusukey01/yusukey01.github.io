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
            
            // Xavier/Glorot initialization for better gradient flow
            const scale1 = Math.sqrt(6.0 / (inputDim + hiddenDim));
            const scale2 = Math.sqrt(6.0 / (hiddenDim + hiddenDim)); // Second hidden layer
            const scale3 = Math.sqrt(6.0 / (hiddenDim + latentDim));
            const scale4 = Math.sqrt(6.0 / (latentDim + hiddenDim));
            const scale5 = Math.sqrt(6.0 / (hiddenDim + hiddenDim));
            const scale6 = Math.sqrt(6.0 / (hiddenDim + inputDim));
            
            // Deeper encoder: Input -> Hidden1 -> Hidden2 -> Latent
            this.W1 = this.randomMatrix(hiddenDim, inputDim, scale1);
            this.b1 = new Array(hiddenDim).fill(0);
            this.W2 = this.randomMatrix(hiddenDim, hiddenDim, scale2);
            this.b2 = new Array(hiddenDim).fill(0);
            this.W3 = this.randomMatrix(latentDim, hiddenDim, scale3);
            this.b3 = new Array(latentDim).fill(0);
            
            // Deeper decoder: Latent -> Hidden3 -> Hidden4 -> Output
            this.W4 = this.randomMatrix(hiddenDim, latentDim, scale4);
            this.b4 = new Array(hiddenDim).fill(0);
            this.W5 = this.randomMatrix(hiddenDim, hiddenDim, scale5);
            this.b5 = new Array(hiddenDim).fill(0);
            this.W6 = this.randomMatrix(inputDim, hiddenDim, scale6);
            this.b6 = new Array(inputDim).fill(0);
            
            // Dropout parameters for regularization
            this.dropoutRate = 0.1;
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
    
    // Autoencoder visualization
    function drawAutoencoderArchitecture() {
        const ctx = elements.aeArchCanvas.getContext('2d');
        const width = elements.aeArchCanvas.width;
        const height = elements.aeArchCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw network architecture
        const layers = [
            { size: 2, name: 'Input' },
            { size: 8, name: 'Hidden 1' },
            { size: 2, name: 'Latent' },
            { size: 8, name: 'Hidden 2' },
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
        
        // Update other tabs
        drawAutoencoderArchitecture();
        drawAutoencoderComparison();
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
   
    // training function with better parameters
    function trainAutoencoder() {
        if (!data || data.length === 0) {
            elements.aeProgressElement.textContent = 'No data available. Generate data first!';
            return;
        }
        
        elements.trainAeBtn.disabled = true;
        elements.aeProgressElement.textContent = 'Initializing autoencoder...';
        
        // Normalize data for better training
        const { normalized: normalizedData, mean, std } = normalizeData(data);
        
        // Create autoencoder with better architecture
        // Use more hidden units for complex datasets
        const hiddenSize = elements.datasetSelect.value === 'moons' ? 16 : 8;
        aeModel = new SimpleAutoencoder(2, hiddenSize, 2);
        
        setTimeout(() => {
            try {
                // Train with dataset-specific parameters
                let epochs, lr, batchSize;
                
                switch (elements.datasetSelect.value) {
                    case 'moons':
                        epochs = 500;
                        lr = 0.005;
                        batchSize = 32;
                        break;
                    case 'circles':
                        epochs = 400;
                        lr = 0.008;
                        batchSize = 32;
                        break;
                    case 'spiral':
                        epochs = 600;
                        lr = 0.003;
                        batchSize = 16;
                        break;
                    default:
                        epochs = 300;
                        lr = 0.01;
                        batchSize = 32;
                }
                
                // Train on normalized data
                aeModel.train(normalizedData, epochs, lr, batchSize);
                
                // Get encoded representation
                const normalizedProjection = aeModel.encode(normalizedData);
                
                // Scale back for visualization
                aeProjection = scaleProjectionForVisualization(normalizedProjection, data);
                
                drawAutoencoderComparison();
                elements.trainAeBtn.disabled = false;
                
                // Show reconstruction quality
                let reconstructionError = 0;
                for (let i = 0; i < normalizedData.length; i++) {
                    const { output } = aeModel.forward(normalizedData[i]);
                    for (let j = 0; j < 2; j++) {
                        const diff = output[j] - normalizedData[i][j];
                        reconstructionError += diff * diff;
                    }
                }
                reconstructionError = Math.sqrt(reconstructionError / normalizedData.length);
                
                if (elements.aeProgressElement) {
                    elements.aeProgressElement.innerHTML += 
                        `<br>Reconstruction RMSE: ${reconstructionError.toFixed(4)}`;
                }
                
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