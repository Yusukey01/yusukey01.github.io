// Clustering Interactive Demo

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('clustering_visualizer');
    
    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // Create HTML structure
    container.innerHTML = `
        <div class="clustering-container">
            <div class="clustering-layout">
                
                <div class="clustering-visualization">
                    <div class="canvas-container">
                        <div class="instruction">Clustering Algorithms - Interactive Exploration</div>
                        
                        <!-- Tab navigation -->
                        <div class="tab-nav">
                            <button class="tab-btn active" data-tab="kmeans">K-means Clustering</button>
                            <button class="tab-btn" data-tab="vectorquant">Vector Quantization</button>
                            <button class="tab-btn" data-tab="spectral">Spectral Clustering</button>
                        </div>
                        
                        <!-- Tab content -->
                        <div class="tab-content">
                            <!-- K-means Tab -->
                            <div id="kmeans-tab" class="tab-pane active">
                                <div class="kmeans-container">
                                    <canvas id="kmeans-canvas" width="600" height="400"></canvas>
                                    <div class="iteration-info">
                                        <span id="iteration-display">Iteration: 0</span>
                                        <span id="converged-display"></span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Vector Quantization Tab -->
                            <div id="vectorquant-tab" class="tab-pane">
                                <div class="vq-container">
                                    <div class="image-comparison">
                                        <div class="image-panel">
                                            <h4>Original Image</h4>
                                            <canvas id="original-image-canvas" width="300" height="300"></canvas>
                                        </div>
                                        <div class="image-panel">
                                            <h4>Quantized Image (<span id="color-count">16</span> colors)</h4>
                                            <canvas id="quantized-image-canvas" width="300" height="300"></canvas>
                                        </div>
                                    </div>
                                    <div class="vq-controls">
                                        <button id="quantize-btn" class="primary-btn">Quantize Image</button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Spectral Clustering Tab -->
                            <div id="spectral-tab" class="tab-pane">
                                <div class="spectral-container">
                                    <div class="spectral-grid">
                                        <div class="spectral-panel">
                                            <h4>Data & Similarity Graph</h4>
                                            <canvas id="spectral-graph-canvas" width="300" height="300"></canvas>
                                        </div>
                                        <div class="spectral-panel">
                                            <h4>Spectral Clustering Result</h4>
                                            <canvas id="spectral-result-canvas" width="300" height="300"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="btn-container">
                            <button id="run-clustering-btn" class="primary-btn">Run Clustering</button>
                            <button id="generate-data-btn" class="secondary-btn">Generate New Data</button>
                        </div>
                    </div>
                </div>

                <div class="controls-panel">
                    <div class="control-group">
                        <label for="dataset-select">Dataset:</label>
                        <select id="dataset-select" class="full-width">
                            <option value="blobs" selected>Gaussian Blobs</option>
                            <option value="moons">Two Moons</option>
                            <option value="circles">Concentric Circles</option>
                            <option value="anisotropic">Anisotropic</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="num-clusters">Number of Clusters (K):</label>
                        <input type="range" id="num-clusters" min="2" max="6" step="1" value="3" class="full-width">
                        <span id="k-display">K = 3</span>
                    </div>

                    <div class="control-group" id="init-method-group">
                        <label for="init-method">Initialization Method:</label>
                        <select id="init-method" class="full-width">
                            <option value="random">Random</option>
                            <option value="kmeans++" selected>K-means++</option>
                        </select>
                    </div>

                    <div class="control-group" id="vq-colors-group" style="display: none;">
                        <label for="vq-colors">Number of Colors:</label>
                        <input type="range" id="vq-colors" min="2" max="32" step="2" value="8" class="full-width">
                        <span id="vq-colors-display">8 colors</span>
                    </div>

                    <div class="control-group" id="vq-image-group" style="display: none;">
                        <label for="image-select">Select Image:</label>
                        <select id="image-select" class="full-width">
                            <option value="landscape">Generated Landscape</option>
                            <option value="portrait">Generated Portrait</option>
                            <option value="abstract">Generated Abstract</option>
                            <option value="upload">Upload Your Own</option>
                        </select>
                        <input type="file" id="image-upload" accept="image/*" style="display: none; margin-top: 10px;" class="full-width">
                    </div>

                    <div class="control-group" id="spectral-sigma-group" style="display: none;">
                        <label for="spectral-sigma">Similarity σ (RBF kernel):</label>
                        <input type="range" id="spectral-sigma" min="-1" max="1" step="0.1" value="0" class="full-width">
                        <span id="sigma-display">σ = 1.0</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="sample-size">Sample Size:</label>
                        <input type="range" id="sample-size" min="50" max="300" step="50" value="150" class="full-width">
                        <span id="sample-size-display">150</span>
                    </div>

                    <div class="control-group">
                        <label for="noise-level">Noise Level:</label>
                        <input type="range" id="noise-level" min="0" max="0.3" step="0.05" value="0.05" class="full-width">
                        <span id="noise-display">0.05</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .clustering-container {
            font-family: Arial, sans-serif;
            margin-bottom: 20px;
        }
        
        .clustering-layout {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        @media (min-width: 992px) {
            .clustering-layout {
                flex-direction: row;
            }
            
            .clustering-visualization {
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
        
        .kmeans-container {
            text-align: center;
        }
        
        .iteration-info {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        
        .iteration-info span {
            margin: 0 10px;
        }
        
        .vq-container {
            text-align: center;
        }
        
        .image-comparison {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .image-panel {
            text-align: center;
        }
        
        .image-panel h4 {
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        
        .image-panel canvas {
            border: 1px solid #ddd;
            background: white;
        }
        
        .spectral-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        @media (max-width: 768px) {
            .spectral-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .spectral-panel {
            text-align: center;
        }
        
        .spectral-panel h4 {
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        
        .spectral-panel canvas {
            border: 1px solid #ddd;
            background: white;
            max-width: 100%;
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
        
        .clustering-visualization {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .vq-controls {
            margin-top: 20px;
        }
    `;
    
    document.head.appendChild(styleElement);

    // Get DOM elements
    const elements = {
        datasetSelect: document.getElementById('dataset-select'),
        numClustersInput: document.getElementById('num-clusters'),
        kDisplay: document.getElementById('k-display'),
        initMethodSelect: document.getElementById('init-method'),
        sampleSizeInput: document.getElementById('sample-size'),
        sampleSizeDisplay: document.getElementById('sample-size-display'),
        noiseLevelInput: document.getElementById('noise-level'),
        noiseDisplay: document.getElementById('noise-display'),
        runClusteringBtn: document.getElementById('run-clustering-btn'),
        generateDataBtn: document.getElementById('generate-data-btn'),
        
        // K-means specific
        kmeansCanvas: document.getElementById('kmeans-canvas'),
        iterationDisplay: document.getElementById('iteration-display'),
        convergedDisplay: document.getElementById('converged-display'),
        
        // Vector quantization specific
        vqColorsInput: document.getElementById('vq-colors'),
        vqColorsDisplay: document.getElementById('vq-colors-display'),
        imageSelect: document.getElementById('image-select'),
        originalImageCanvas: document.getElementById('original-image-canvas'),
        quantizedImageCanvas: document.getElementById('quantized-image-canvas'),
        quantizeBtn: document.getElementById('quantize-btn'),
        colorCountSpan: document.getElementById('color-count'),
        imageUpload: document.getElementById('image-upload'),

        // Spectral clustering specific
        spectralSigmaInput: document.getElementById('spectral-sigma'),
        sigmaDisplay: document.getElementById('sigma-display'),
        spectralGraphCanvas: document.getElementById('spectral-graph-canvas'),
        spectralResultCanvas: document.getElementById('spectral-result-canvas'),
        
        // Tab elements
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        
        // Control groups
        initMethodGroup: document.getElementById('init-method-group'),
        vqColorsGroup: document.getElementById('vq-colors-group'),
        vqImageGroup: document.getElementById('vq-image-group'),
        spectralSigmaGroup: document.getElementById('spectral-sigma-group')
    };
    
    // State variables
    let data = [];
    let labels = [];
    let currentTab = 'kmeans';
    let kmeansResult = null;
    let spectralResult = null;
    
    // Clustering colors
    const clusterColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#34495e'];
    
    // Random number generation
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
        
        const k = parseInt(elements.numClustersInput.value);
        const centers = [];
        
        // Generate random centers
        for (let i = 0; i < k; i++) {
            centers.push([
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4
            ]);
        }
        
        const pointsPerCluster = Math.floor(n / k);
        
        for (let c = 0; c < k; c++) {
            const numPoints = (c === k - 1) ? n - pointsPerCluster * (k - 1) : pointsPerCluster;
            const [cx, cy] = centers[c];
            
            for (let i = 0; i < numPoints; i++) {
                const x = cx + gaussianRandom() * 0.5 + gaussianRandom() * noise;
                const y = cy + gaussianRandom() * 0.5 + gaussianRandom() * noise;
                data.push([x, y]);
                labels.push(c);
            }
        }
    }
    
    function generateMoonsData(n, noise) {
        data = [];
        labels = [];
        const n_half = Math.floor(n / 2);
        
        for (let i = 0; i < n_half; i++) {
            const angle = Math.random() * Math.PI;
            const x = Math.cos(angle) + gaussianRandom() * noise;
            const y = Math.sin(angle) + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(0);
        }
        
        for (let i = 0; i < n - n_half; i++) {
            const angle = Math.random() * Math.PI;
            const x = 1 - Math.cos(angle) + gaussianRandom() * noise;
            const y = 0.5 - Math.sin(angle) + gaussianRandom() * noise;
            data.push([x, y]);
            labels.push(1);
        }
    }
    
    function generateCirclesData(n, noise) {
        data = [];
        labels = [];
        const n_inner = Math.floor(n / 2);
        
        for (let i = 0; i < n_inner; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const r = 0.5 + gaussianRandom() * noise;
            data.push([r * Math.cos(angle), r * Math.sin(angle)]);
            labels.push(0);
        }
        
        for (let i = 0; i < n - n_inner; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const r = 1.5 + gaussianRandom() * noise;
            data.push([r * Math.cos(angle), r * Math.sin(angle)]);
            labels.push(1);
        }
    }
    
    function generateAnisotropicData(n, noise) {
        data = [];
        labels = [];
        
        const k = parseInt(elements.numClustersInput.value);
        const pointsPerCluster = Math.floor(n / k);
        
        for (let c = 0; c < k; c++) {
            const numPoints = (c === k - 1) ? n - pointsPerCluster * (k - 1) : pointsPerCluster;
            const angle = (c / k) * 2 * Math.PI;
            const cx = Math.cos(angle) * 2;
            const cy = Math.sin(angle) * 2;
            
            for (let i = 0; i < numPoints; i++) {
                const x = cx + gaussianRandom() * (0.3 + c * 0.1) + gaussianRandom() * noise;
                const y = cy + gaussianRandom() * 0.3 + gaussianRandom() * noise;
                data.push([x, y]);
                labels.push(c);
            }
        }
    }
    
    // K-means algorithm implementation
    class KMeans {
        constructor(k, initMethod = 'kmeans++', maxIter = 100) {
            this.k = k;
            this.initMethod = initMethod;
            this.maxIter = maxIter;
            this.centers = [];
            this.assignments = [];
            this.iterations = 0;
            this.converged = false;
        }
        
        // K-means++ initialization (Arthur & Vassilvitskii, 2007)
        initializeCentersKMeansPlusPlus(data) {
            const n = data.length;
            const centers = [];
            
            // Choose first center randomly
            centers.push([...data[Math.floor(Math.random() * n)]]);
            
            // Choose remaining centers
            for (let c = 1; c < this.k; c++) {
                const distances = new Array(n);
                let totalDist = 0;
                
                // Compute distance to nearest center for each point
                for (let i = 0; i < n; i++) {
                    let minDist = Infinity;
                    for (const center of centers) {
                        const dist = this.euclideanDistance(data[i], center);
                        minDist = Math.min(minDist, dist);
                    }
                    distances[i] = minDist * minDist; // D(x)^2 weighting
                    totalDist += distances[i];
                }
                
                // Choose new center with probability proportional to D(x)^2
                let cumSum = 0;
                const r = Math.random() * totalDist;
                for (let i = 0; i < n; i++) {
                    cumSum += distances[i];
                    if (cumSum >= r) {
                        centers.push([...data[i]]);
                        break;
                    }
                }
            }
            
            return centers;
        }
        
        initializeCentersRandom(data) {
            const n = data.length;
            const centers = [];
            const used = new Set();
            
            while (centers.length < this.k) {
                const idx = Math.floor(Math.random() * n);
                if (!used.has(idx)) {
                    used.add(idx);
                    centers.push([...data[idx]]);
                }
            }
            
            return centers;
        }
        
        euclideanDistance(p1, p2) {
            let sum = 0;
            for (let i = 0; i < p1.length; i++) {
                const diff = p1[i] - p2[i];
                sum += diff * diff;
            }
            return Math.sqrt(sum);
        }
        
        assignClusters(data) {
            const n = data.length;
            const assignments = new Array(n);
            
            for (let i = 0; i < n; i++) {
                let minDist = Infinity;
                let bestCluster = 0;
                
                for (let c = 0; c < this.k; c++) {
                    const dist = this.euclideanDistance(data[i], this.centers[c]);
                    if (dist < minDist) {
                        minDist = dist;
                        bestCluster = c;
                    }
                }
                
                assignments[i] = bestCluster;
            }
            
            return assignments;
        }
        
        updateCenters(data, assignments) {
            const newCenters = Array(this.k).fill(null).map(() => 
                Array(data[0].length).fill(0)
            );
            const counts = new Array(this.k).fill(0);
            
            // Sum points in each cluster
            for (let i = 0; i < data.length; i++) {
                const cluster = assignments[i];
                counts[cluster]++;
                for (let d = 0; d < data[i].length; d++) {
                    newCenters[cluster][d] += data[i][d];
                }
            }
            
            // Compute means
            for (let c = 0; c < this.k; c++) {
                if (counts[c] > 0) {
                    for (let d = 0; d < newCenters[c].length; d++) {
                        newCenters[c][d] /= counts[c];
                    }
                } else {
                    // Reinitialize empty clusters
                    newCenters[c] = [...data[Math.floor(Math.random() * data.length)]];
                }
            }
            
            return newCenters;
        }
        
        hasConverged(oldCenters, newCenters, tolerance = 1e-4) {
            for (let c = 0; c < this.k; c++) {
                const dist = this.euclideanDistance(oldCenters[c], newCenters[c]);
                if (dist > tolerance) {
                    return false;
                }
            }
            return true;
        }
        
        fit(data) {
            // Initialize centers
            if (this.initMethod === 'kmeans++') {
                this.centers = this.initializeCentersKMeansPlusPlus(data);
            } else {
                this.centers = this.initializeCentersRandom(data);
            }
            
            // Lloyd's algorithm
            for (let iter = 0; iter < this.maxIter; iter++) {
                this.iterations = iter + 1;
                
                // Assignment step
                this.assignments = this.assignClusters(data);
                
                // Update step
                const oldCenters = this.centers.map(c => [...c]);
                this.centers = this.updateCenters(data, this.assignments);
                
                // Check convergence
                if (this.hasConverged(oldCenters, this.centers)) {
                    this.converged = true;
                    break;
                }
            }
            
            return {
                centers: this.centers,
                assignments: this.assignments,
                iterations: this.iterations,
                converged: this.converged
            };
        }
    }
    
    // Spectral clustering implementation
    class SpectralClustering {
        constructor(k, sigma = 1.0) {
            this.k = k;
            this.sigma = sigma;
        }
        
        // Compute similarity matrix using RBF kernel
        computeSimilarityMatrix(data) {
            const n = data.length;
            const W = Array(n).fill(null).map(() => Array(n).fill(0));
            
            for (let i = 0; i < n; i++) {
                for (let j = i; j < n; j++) {
                    if (i === j) {
                        W[i][j] = 0; // No self-loops
                    } else {
                        let sum = 0;
                        for (let d = 0; d < data[i].length; d++) {
                            const diff = data[i][d] - data[j][d];
                            sum += diff * diff;
                        }
                        const similarity = Math.exp(-sum / (2 * this.sigma * this.sigma));
                        W[i][j] = W[j][i] = similarity;
                    }
                }
            }
            
            return W;
        }
        
        // Compute degree matrix
        computeDegreeMatrix(W) {
            const n = W.length;
            const D = Array(n).fill(null).map(() => Array(n).fill(0));
            
            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    sum += W[i][j];
                }
                D[i][i] = sum;
            }
            
            return D;
        }
        
        // Compute normalized Laplacian L = I - D^(-1/2) * W * D^(-1/2)
        computeNormalizedLaplacian(W, D) {
            const n = W.length;
            const L = Array(n).fill(null).map(() => Array(n).fill(0));
            
            // Compute D^(-1/2)
            const DInvSqrt = Array(n).fill(null).map(() => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                if (D[i][i] > 0) {
                    DInvSqrt[i][i] = 1 / Math.sqrt(D[i][i]);
                }
            }
            
            // Compute normalized Laplacian
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    let sum = 0;
                    for (let k = 0; k < n; k++) {
                        sum += DInvSqrt[i][k] * W[k][j] * DInvSqrt[j][j];
                    }
                    L[i][j] = (i === j ? 1 : 0) - sum;
                }
            }
            
            return L;
        }
        
        // Power iteration for finding eigenvectors
        powerIteration(matrix, numVectors) {
            const n = matrix.length;
            const eigenvectors = [];
            const eigenvalues = [];
            
            // Modified matrix for deflation
            let A = matrix.map(row => [...row]);
            
            for (let vec = 0; vec < numVectors; vec++) {
                // Random initialization
                let v = Array(n).fill(0).map(() => Math.random() - 0.5);
                
                // Normalize
                let norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
                v = v.map(x => x / norm);
                
                let lambda = 0;
                const maxIter = 1000;
                
                for (let iter = 0; iter < maxIter; iter++) {
                    // Matrix-vector multiplication
                    const Av = Array(n).fill(0);
                    for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                            Av[i] += A[i][j] * v[j];
                        }
                    }
                    
                    // Compute eigenvalue
                    lambda = v.reduce((sum, vi, i) => sum + vi * Av[i], 0);
                    
                    // Update eigenvector
                    norm = Math.sqrt(Av.reduce((sum, x) => sum + x * x, 0));
                    if (norm > 1e-10) {
                        v = Av.map(x => x / norm);
                    } else {
                        break;
                    }
                }
                
                eigenvectors.push(v);
                eigenvalues.push(lambda);
                
                // Deflation
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        A[i][j] -= lambda * v[i] * v[j];
                    }
                }
            }
            
            return { eigenvectors, eigenvalues };
        }
        
        fit(data) {
            const n = data.length;
            
            // Step 1: Form similarity matrix
            const W = this.computeSimilarityMatrix(data);
            
            // Step 2: Compute degree matrix
            const D = this.computeDegreeMatrix(W);
            
            // Step 3: Form normalized Laplacian
            const L = this.computeNormalizedLaplacian(W, D);
            
            // Step 4: Find smallest k eigenvectors
            // For normalized Laplacian, we want smallest eigenvalues
            // Since power iteration finds largest, we use I - L
            const IminusL = L.map((row, i) => 
                row.map((val, j) => (i === j ? 1 : 0) - val)
            );
            
            const { eigenvectors } = this.powerIteration(IminusL, this.k);
            
            // Step 5: Form matrix Y from eigenvectors
            const Y = Array(n).fill(null).map(() => Array(this.k).fill(0));
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < this.k; j++) {
                    Y[i][j] = eigenvectors[j][i];
                }
            }
            
            // Step 6: Normalize rows of Y
            for (let i = 0; i < n; i++) {
                const norm = Math.sqrt(Y[i].reduce((sum, x) => sum + x * x, 0));
                if (norm > 0) {
                    for (let j = 0; j < this.k; j++) {
                        Y[i][j] /= norm;
                    }
                }
            }
            
            // Step 7: Cluster rows of Y using k-means
            const kmeans = new KMeans(this.k, 'kmeans++');
            const result = kmeans.fit(Y);
            
            return {
                assignments: result.assignments,
                similarityMatrix: W,
                embedding: Y
            };
        }
    }
    
    // Generate sample images for vector quantization
    function generateSampleImage(type, canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const width = canvas.width;
        const height = canvas.height;
        
        if (type === 'landscape') {
            // Sky gradient
            const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
            skyGradient.addColorStop(0, '#87CEEB');
            skyGradient.addColorStop(1, '#E0F6FF');
            ctx.fillStyle = skyGradient;
            ctx.fillRect(0, 0, width, height * 0.6);
            
            // Ground
            ctx.fillStyle = '#228B22';
            ctx.fillRect(0, height * 0.6, width, height * 0.4);
            
            // Sun
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(width * 0.8, height * 0.2, 30, 0, 2 * Math.PI);
            ctx.fill();
            
            // Mountains
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            ctx.moveTo(0, height * 0.6);
            ctx.lineTo(width * 0.3, height * 0.3);
            ctx.lineTo(width * 0.5, height * 0.6);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(width * 0.4, height * 0.6);
            ctx.lineTo(width * 0.7, height * 0.35);
            ctx.lineTo(width, height * 0.6);
            ctx.closePath();
            ctx.fill();
            
            // Trees
            for (let i = 0; i < 5; i++) {
                const x = width * (0.1 + i * 0.15);
                const y = height * 0.6;
                
                // Trunk
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x - 5, y - 20, 10, 20);
                
                // Leaves
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.moveTo(x, y - 50);
                ctx.lineTo(x - 20, y - 20);
                ctx.lineTo(x + 20, y - 20);
                ctx.closePath();
                ctx.fill();
            }
        } else if (type === 'portrait') {
            // Background
            ctx.fillStyle = '#F0E68C';
            ctx.fillRect(0, 0, width, height);
            
            // Face
            ctx.fillStyle = '#FDBCB4';
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, 80, 0, 2 * Math.PI);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(width / 2 - 30, height / 2 - 20, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(width / 2 + 30, height / 2 - 20, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Mouth
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2 + 10, 30, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();
            
            // Hair
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.arc(width / 2, height / 2 - 60, 90, Math.PI, 2 * Math.PI);
            ctx.fill();
        } else if (type === 'abstract') {
            // Random colorful shapes
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#F4A261', '#E76F51'];
            
            // Background
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(0, 0, width, height);
            
            // Random circles
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const r = Math.random() * 40 + 10;
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // Random rectangles
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < 10; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const w = Math.random() * 60 + 20;
                const h = Math.random() * 60 + 20;
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
            }
            
            ctx.globalAlpha = 1.0;
        }
    }
    
    // Extract pixels from canvas
    function getPixelsFromCanvas(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = [];
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            pixels.push([
                imageData.data[i],     // R
                imageData.data[i + 1], // G
                imageData.data[i + 2]  // B
            ]);
        }
        
        return pixels;
    }
    
    // Apply quantized colors to canvas
    function applyQuantizedColors(canvas, pixels, centers, assignments) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        
        for (let i = 0; i < assignments.length; i++) {
            const cluster = assignments[i];
            const color = centers[cluster];
            
            imageData.data[i * 4] = Math.round(color[0]);
            imageData.data[i * 4 + 1] = Math.round(color[1]);
            imageData.data[i * 4 + 2] = Math.round(color[2]);
            imageData.data[i * 4 + 3] = 255; // Alpha
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Drawing functions
    function drawClustering(canvas, data, assignments, centers, showGraph = false, W = null) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!data || data.length === 0) return;
        
        // Find data bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const point of data) {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
        }
        
        const xRange = maxX - minX;
        const yRange = maxY - minY;
        const range = Math.max(xRange, yRange, 0.1);
        const padding = 0.1 * range;
        
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        const finalXRange = maxX - minX;
        const finalYRange = maxY - minY;
        
        // Draw similarity graph edges if requested
        if (showGraph && W) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            
            // Only draw edges with significant weight
            const threshold = 0.1;
            
            for (let i = 0; i < data.length; i++) {
                for (let j = i + 1; j < data.length; j++) {
                    if (W[i][j] > threshold) {
                        const x1 = 10 + ((data[i][0] - minX) / finalXRange) * (width - 20);
                        const y1 = 10 + ((maxY - data[i][1]) / finalYRange) * (height - 20);
                        const x2 = 10 + ((data[j][0] - minX) / finalXRange) * (width - 20);
                        const y2 = 10 + ((maxY - data[j][1]) / finalYRange) * (height - 20);
                        
                        ctx.globalAlpha = W[i][j];
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1.0;
        }
        
        // Draw data points
        for (let i = 0; i < data.length; i++) {
            const x = 10 + ((data[i][0] - minX) / finalXRange) * (width - 20);
            const y = 10 + ((maxY - data[i][1]) / finalYRange) * (height - 20);
            
            ctx.fillStyle = clusterColors[assignments[i] % clusterColors.length];
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Draw cluster centers if provided
        if (centers) {
            for (let c = 0; c < centers.length; c++) {
                const x = 10 + ((centers[c][0] - minX) / finalXRange) * (width - 20);
                const y = 10 + ((maxY - centers[c][1]) / finalYRange) * (height - 20);
                
                // Draw cross for center
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x - 10, y);
                ctx.lineTo(x + 10, y);
                ctx.moveTo(x, y - 10);
                ctx.lineTo(x, y + 10);
                ctx.stroke();
                
                // Draw colored center
                ctx.fillStyle = clusterColors[c % clusterColors.length];
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
        }
    }
    
    // Run clustering based on current tab
    function runClustering() {
        if (!data || data.length === 0) {
            generateData();
        }
        
        const k = parseInt(elements.numClustersInput.value);
        
        if (currentTab === 'kmeans') {
            // K-means clustering
            const initMethod = elements.initMethodSelect.value;
            const kmeans = new KMeans(k, initMethod);
            kmeansResult = kmeans.fit(data);
            
            // Update display
            elements.iterationDisplay.textContent = `Iterations: ${kmeansResult.iterations}`;
            elements.convergedDisplay.textContent = kmeansResult.converged ? 
                '✓ Converged' : '✗ Max iterations reached';
            elements.convergedDisplay.style.color = kmeansResult.converged ? '#2ecc71' : '#e74c3c';
            
            // Draw result
            drawClustering(elements.kmeansCanvas, data, kmeansResult.assignments, kmeansResult.centers);
            
        } else if (currentTab === 'spectral') {
            // Spectral clustering
            const sigma = Math.pow(10, parseFloat(elements.spectralSigmaInput.value));
            const spectral = new SpectralClustering(k, sigma);
            spectralResult = spectral.fit(data);
            
            // Draw similarity graph
            drawClustering(elements.spectralGraphCanvas, data, labels, null, true, spectralResult.similarityMatrix);
            
            // Draw clustering result
            drawClustering(elements.spectralResultCanvas, data, spectralResult.assignments, null);
        }
    }
    
    // Generate data based on selected dataset
    function generateData() {
        const dataset = elements.datasetSelect.value;
        const n = parseInt(elements.sampleSizeInput.value);
        const noise = parseFloat(elements.noiseLevelInput.value);
        
        switch (dataset) {
            case 'blobs':
                generateBlobsData(n, noise);
                break;
            case 'moons':
                generateMoonsData(n, noise);
                break;
            case 'circles':
                generateCirclesData(n, noise);
                break;
            case 'anisotropic':
                generateAnisotropicData(n, noise);
                break;
        }
        
        // Clear previous results
        kmeansResult = null;
        spectralResult = null;
        elements.iterationDisplay.textContent = 'Iteration: 0';
        elements.convergedDisplay.textContent = '';
        
        // Draw initial data
        if (currentTab === 'kmeans' && data.length > 0) {
            drawClustering(elements.kmeansCanvas, data, labels, null);
        } else if (currentTab === 'spectral' && data.length > 0) {
            drawClustering(elements.spectralGraphCanvas, data, labels, null);
            drawClustering(elements.spectralResultCanvas, data, labels, null);
        }
    }
    
    // Handle tab switching
    function handleTabClick(e) {
        const targetTab = e.target.dataset.tab;
        currentTab = targetTab;
        
        // Update active states
        elements.tabBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        elements.tabPanes.forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `${targetTab}-tab`) {
                pane.classList.add('active');
            }
        });
        
        // Show/hide relevant controls
        if (targetTab === 'kmeans') {
            elements.initMethodGroup.style.display = 'block';
            elements.vqColorsGroup.style.display = 'none';
            elements.vqImageGroup.style.display = 'none';
            elements.spectralSigmaGroup.style.display = 'none';
            
            // Draw current k-means result if available
            if (kmeansResult) {
                drawClustering(elements.kmeansCanvas, data, kmeansResult.assignments, kmeansResult.centers);
            } else if (data.length > 0) {
                drawClustering(elements.kmeansCanvas, data, labels, null);
            }
            
        } else if (targetTab === 'vectorquant') {
            elements.initMethodGroup.style.display = 'none';
            elements.vqColorsGroup.style.display = 'block';
            elements.vqImageGroup.style.display = 'block';
            elements.spectralSigmaGroup.style.display = 'none';
            
            // Generate initial image
            generateSampleImage(elements.imageSelect.value, elements.originalImageCanvas);
            
        } else if (targetTab === 'spectral') {
            elements.initMethodGroup.style.display = 'none';
            elements.vqColorsGroup.style.display = 'none';
            elements.vqImageGroup.style.display = 'none';
            elements.spectralSigmaGroup.style.display = 'block';
            
            // Draw current spectral result if available
            if (spectralResult) {
                drawClustering(elements.spectralGraphCanvas, data, labels, null, true, spectralResult.similarityMatrix);
                drawClustering(elements.spectralResultCanvas, data, spectralResult.assignments, null);
            } else if (data.length > 0) {
                drawClustering(elements.spectralGraphCanvas, data, labels, null);
                drawClustering(elements.spectralResultCanvas, data, labels, null);
            }
        }
    }
    
    // Handle parameter changes
    function handleParameterChange() {
        const k = parseInt(elements.numClustersInput.value);
        elements.kDisplay.textContent = `K = ${k}`;
        
        const sampleSize = parseInt(elements.sampleSizeInput.value);
        elements.sampleSizeDisplay.textContent = sampleSize;
        
        const noise = parseFloat(elements.noiseLevelInput.value);
        elements.noiseDisplay.textContent = noise.toFixed(2);

        const vqColors = parseInt(elements.vqColorsInput.value);
        elements.vqColorsDisplay.textContent = `${vqColors} colors`;
        elements.colorCountSpan.textContent = vqColors;
                
        const sigma = Math.pow(10, parseFloat(elements.spectralSigmaInput.value));
        elements.sigmaDisplay.textContent = `σ = ${sigma.toFixed(2)}`;
    }
    
    // Vector quantization
    function quantizeImage() {
        const k = parseInt(elements.vqColorsInput.value);
        
        // Get pixels from original image
        const pixels = getPixelsFromCanvas(elements.originalImageCanvas);
        
        // Run K-means on pixel colors
        const kmeans = new KMeans(k, 'kmeans++', 50);
        const result = kmeans.fit(pixels);
        
        // Apply quantized colors
        applyQuantizedColors(elements.quantizedImageCanvas, pixels, result.centers, result.assignments);
    }
    
    // Add event listeners
    elements.datasetSelect.addEventListener('change', generateData);
    elements.numClustersInput.addEventListener('input', handleParameterChange);
    elements.sampleSizeInput.addEventListener('input', handleParameterChange);
    elements.noiseLevelInput.addEventListener('input', handleParameterChange);
    elements.vqColorsInput.addEventListener('input', handleParameterChange);
    elements.spectralSigmaInput.addEventListener('input', handleParameterChange);
    
    elements.runClusteringBtn.addEventListener('click', runClustering);
    elements.generateDataBtn.addEventListener('click', generateData);
    elements.quantizeBtn.addEventListener('click', quantizeImage);
    
    elements.imageSelect.addEventListener('change', () => {
        generateSampleImage(elements.imageSelect.value, elements.originalImageCanvas);
    });

    elements.imageSelect.addEventListener('change', () => {
        if (elements.imageSelect.value === 'upload') {
            elements.imageUpload.style.display = 'block';
        } else {
            elements.imageUpload.style.display = 'none';
            generateSampleImage(elements.imageSelect.value, elements.originalImageCanvas);
        }
    });

    elements.imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = elements.originalImageCanvas;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    
                    // Scale image to fit canvas
                    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                    const x = (canvas.width - img.width * scale) / 2;
                    const y = (canvas.height - img.height * scale) / 2;
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    elements.tabBtns.forEach(btn => btn.addEventListener('click', handleTabClick));
    
    // Initialize
    handleParameterChange();
    generateData();
    
    // Generate initial image for vector quantization
    generateSampleImage('landscape', elements.originalImageCanvas);
});