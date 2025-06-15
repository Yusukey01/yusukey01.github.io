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
                            <button class="tab-btn active" data-tab="visualization">Visualization</button>
                            <button class="tab-btn" data-tab="autoencoder">Autoencoder</button>
                            <button class="tab-btn" data-tab="analysis">Analysis</button>
                        </div>
                        
                        <!-- Tab content -->
                        <div class="tab-content">
                            <!-- Visualization tab -->
                            <div id="visualization-tab" class="tab-pane active">
                                <div class="canvas-grid">
                                    <canvas id="original-canvas" width="300" height="300"></canvas>
                                    <canvas id="pca-canvas" width="300" height="300"></canvas>
                                    <canvas id="kpca-canvas" width="300" height="300"></canvas>
                                </div>
                                <canvas id="variance-canvas" width="900" height="200"></canvas>
                            </div>
                            
                            <!-- Autoencoder tab -->
                            <div id="autoencoder-tab" class="tab-pane">
                                <div class="ae-container">
                                    <canvas id="ae-arch-canvas" width="600" height="300"></canvas>
                                    <canvas id="ae-proj-canvas" width="600" height="300"></canvas>
                                    <div class="ae-controls">
                                        <button id="train-ae-btn">Train Autoencoder</button>
                                        <div id="ae-progress"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Analysis tab -->
                            <div id="analysis-tab" class="tab-pane">
                                <div class="analysis-container">
                                    <div id="kernel-matrix-info"></div>
                                    <div id="gamma-suggestion"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Controls panel -->
                <div class="kpca-controls">
                    <div class="control-group">
                        <label for="dataset-select">Dataset:</label>
                        <select id="dataset-select">
                            <option value="blobs">Gaussian Blobs</option>
                            <option value="circles">Concentric Circles</option>
                            <option value="moons">Two Moons</option>
                            <option value="spiral">Spiral</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label for="kernel-select">Kernel:</label>
                        <select id="kernel-select">
                            <option value="linear">Linear</option>
                            <option value="rbf">RBF</option>
                            <option value="poly">Polynomial</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label for="gamma-input">Gamma (RBF):</label>
                        <input type="range" id="gamma-input" min="0.1" max="10" step="0.1" value="1.0">
                        <span id="gamma-value">1.0</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="degree-input">Degree (Poly):</label>
                        <input type="range" id="degree-input" min="2" max="5" step="1" value="3">
                        <span id="degree-value">3</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="coef-input">Coefficient (Poly):</label>
                        <input type="range" id="coef-input" min="0" max="2" step="0.1" value="1.0">
                        <span id="coef-value">1.0</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="components-input">Components:</label>
                        <input type="range" id="components-input" min="1" max="2" step="1" value="2">
                        <span id="components-value">2</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="noise-input">Noise:</label>
                        <input type="range" id="noise-input" min="0" max="0.5" step="0.01" value="0.1">
                        <span id="noise-value">0.1</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="sample-size-input">Sample Size:</label>
                        <input type="range" id="sample-size-input" min="100" max="1000" step="100" value="300">
                        <span id="sample-size-value">300</span>
                    </div>
                    
                    <button id="compute-btn">Compute</button>
                </div>
            </div>
        </div>
    `;

    // Get DOM elements
    const elements = {
        // Canvas elements
        originalCanvas: document.getElementById('original-canvas'),
        pcaCanvas: document.getElementById('pca-canvas'),
        kpcaCanvas: document.getElementById('kpca-canvas'),
        varianceCanvas: document.getElementById('variance-canvas'),
        aeArchCanvas: document.getElementById('ae-arch-canvas'),
        aeProjCanvas: document.getElementById('ae-proj-canvas'),
        
        // Control elements
        datasetSelect: document.getElementById('dataset-select'),
        kernelSelect: document.getElementById('kernel-select'),
        gammaInput: document.getElementById('gamma-input'),
        degreeInput: document.getElementById('degree-input'),
        coefInput: document.getElementById('coef-input'),
        componentsInput: document.getElementById('components-input'),
        noiseInput: document.getElementById('noise-input'),
        sampleSizeInput: document.getElementById('sample-size-input'),
        computeBtn: document.getElementById('compute-btn'),
        trainAeBtn: document.getElementById('train-ae-btn'),
        
        // Value displays
        gammaValue: document.getElementById('gamma-value'),
        degreeValue: document.getElementById('degree-value'),
        coefValue: document.getElementById('coef-value'),
        componentsValue: document.getElementById('components-value'),
        noiseValue: document.getElementById('noise-value'),
        sampleSizeValue: document.getElementById('sample-size-value'),
        
        // Info elements
        kernelMatrixInfo: document.getElementById('kernel-matrix-info'),
        gammaSuggestion: document.getElementById('gamma-suggestion'),
        aeProgressElement: document.getElementById('ae-progress'),
        
        // Tab elements
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane')
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

    // Utility Functions
    const utils = {
        gaussianRandom() {
            if (utils.spareRandom !== null) {
                const val = utils.spareRandom;
                utils.spareRandom = null;
                return val;
            }
            
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            
            const mag = Math.sqrt(-2.0 * Math.log(u));
            utils.spareRandom = mag * Math.cos(2.0 * Math.PI * v);
            return mag * Math.sin(2.0 * Math.PI * v);
        },

        randomMatrix(rows, cols, scale = 1.0) {
            return Array(rows).fill(0).map(() => 
                Array(cols).fill(0).map(() => utils.gaussianRandom() * scale)
            );
        },

        zeroMatrix(rows, cols) {
            return Array(rows).fill(0).map(() => Array(cols).fill(0));
        },

        matrixVectorMultiply(matrix, vector) {
            return matrix.map(row => 
                row.reduce((sum, val, i) => sum + val * vector[i], 0)
            );
        },

        vectorMatrixMultiply(vector, matrix) {
            return matrix[0].map((_, colIndex) =>
                vector.reduce((sum, val, rowIndex) => sum + val * matrix[rowIndex][colIndex], 0)
            );
        },

        addBias(vector, bias) {
            return vector.map((val, i) => val + bias[i]);
        }
    };

    // Data Generation Functions
    const dataGenerators = {
        generateBlobsData(n, noise) {
            const data = [];
            const labels = [];
            const centers = [[-2, -2], [2, 2], [0, 2]];
            const pointsPerCluster = Math.floor(n / centers.length);
            
            for (let c = 0; c < centers.length; c++) {
                const numPoints = (c === centers.length - 1) ? n - pointsPerCluster * (centers.length - 1) : pointsPerCluster;
                const [cx, cy] = centers[c];
                
                for (let i = 0; i < numPoints; i++) {
                    const x = cx + utils.gaussianRandom() * 0.5 + utils.gaussianRandom() * noise;
                    const y = cy + utils.gaussianRandom() * 0.5 + utils.gaussianRandom() * noise;
                    data.push([x, y]);
                    labels.push(c);
                }
            }
            return { data, labels };
        },

        generateCirclesData(n, noise) {
            const data = [];
            const labels = [];
            const pointsPerCircle = Math.floor(n / 2);
            
            // Inner circle
            for (let i = 0; i < pointsPerCircle; i++) {
                const angle = (i / pointsPerCircle) * 2 * Math.PI;
                const r = 1 + utils.gaussianRandom() * noise;
                data.push([r * Math.cos(angle), r * Math.sin(angle)]);
                labels.push(0);
            }
            
            // Outer circle
            for (let i = 0; i < n - pointsPerCircle; i++) {
                const angle = (i / (n - pointsPerCircle)) * 2 * Math.PI;
                const r = 3 + utils.gaussianRandom() * noise;
                data.push([r * Math.cos(angle), r * Math.sin(angle)]);
                labels.push(1);
            }
            
            return { data, labels };
        },

        generateMoonsData(n, noise) {
            const data = [];
            const labels = [];
            const pointsPerMoon = Math.floor(n / 2);
            
            // First moon
            for (let i = 0; i < pointsPerMoon; i++) {
                const angle = (i / pointsPerMoon) * Math.PI;
                const x = Math.cos(angle) + utils.gaussianRandom() * noise;
                const y = Math.sin(angle) + utils.gaussianRandom() * noise;
                data.push([x, y]);
                labels.push(0);
            }
            
            // Second moon
            for (let i = 0; i < n - pointsPerMoon; i++) {
                const angle = (i / (n - pointsPerMoon)) * Math.PI;
                const x = 1 - Math.cos(angle) + utils.gaussianRandom() * noise;
                const y = 0.5 - Math.sin(angle) + utils.gaussianRandom() * noise;
                data.push([x, y]);
                labels.push(1);
            }
            
            return { data, labels };
        },

        generateSpiralData(n, noise) {
            const data = [];
            const labels = [];
            const pointsPerSpiral = Math.floor(n / 2);
            
            // First spiral
            for (let i = 0; i < pointsPerSpiral; i++) {
                const angle = (i / pointsPerSpiral) * 4 * Math.PI;
                const r = angle / 4;
                const x = r * Math.cos(angle) + utils.gaussianRandom() * noise;
                const y = r * Math.sin(angle) + utils.gaussianRandom() * noise;
                data.push([x, y]);
                labels.push(0);
            }
            
            // Second spiral
            for (let i = 0; i < n - pointsPerSpiral; i++) {
                const angle = (i / (n - pointsPerSpiral)) * 4 * Math.PI;
                const r = angle / 4;
                const x = -r * Math.cos(angle) + utils.gaussianRandom() * noise;
                const y = -r * Math.sin(angle) + utils.gaussianRandom() * noise;
                data.push([x, y]);
                labels.push(1);
            }
            
            return { data, labels };
        }
    };

    // Kernel Functions
    const kernels = {
        linear(x1, x2) {
            return x1.reduce((sum, val, i) => sum + val * x2[i], 0);
        },

        rbf(x1, x2, gamma) {
            const diff = x1.reduce((sum, val, i) => sum + Math.pow(val - x2[i], 2), 0);
            return Math.exp(-gamma * diff);
        },

        poly(x1, x2, degree, gamma, coef) {
            const dot = x1.reduce((sum, val, i) => sum + val * x2[i], 0);
            return Math.pow(gamma * dot + coef, degree);
        }
    };

    // Improved Autoencoder Implementation
    class SimpleAutoencoder {
        constructor(inputDim, hiddenDim, latentDim) {
            this.inputDim = inputDim;
            this.hiddenDim = hiddenDim;
            this.latentDim = latentDim;
            
            // He initialization for better gradient flow
            const scale1 = Math.sqrt(2.0 / inputDim);
            const scale2 = Math.sqrt(2.0 / hiddenDim);
            const scale3 = Math.sqrt(2.0 / latentDim);
            const scale4 = Math.sqrt(2.0 / hiddenDim);
            
            // Encoder weights
            this.W1 = utils.randomMatrix(hiddenDim, inputDim, scale1);
            this.b1 = new Array(hiddenDim).fill(0);
            this.W2 = utils.randomMatrix(latentDim, hiddenDim, scale2);
            this.b2 = new Array(latentDim).fill(0);
            
            // Decoder weights - Initialize as transpose for better symmetry
            this.W3 = utils.randomMatrix(hiddenDim, latentDim, scale3);
            this.b3 = new Array(hiddenDim).fill(0);
            this.W4 = utils.randomMatrix(inputDim, hiddenDim, scale4);
            this.b4 = new Array(inputDim).fill(0);
            
            // Batch normalization parameters
            this.bn1_gamma = new Array(hiddenDim).fill(1);
            this.bn1_beta = new Array(hiddenDim).fill(0);
            this.bn1_running_mean = new Array(hiddenDim).fill(0);
            this.bn1_running_var = new Array(hiddenDim).fill(1);
        }

        // Activation functions
        tanh(x) {
            return Math.tanh(x);
        }

        tanhDerivative(x) {
            const t = Math.tanh(x);
            return 1 - t * t;
        }

        leakyRelu(x, alpha = 0.1) {
            return x > 0 ? x : alpha * x;
        }

        leakyReluDerivative(x, alpha = 0.1) {
            return x > 0 ? 1 : alpha;
        }

        // Improved batch normalization with momentum and epsilon
        batchNorm(z, gamma, beta, running_mean, running_var, training = true, momentum = 0.9) {
            const eps = 1e-5;
            let mean, variance;
            
            if (training) {
                // Compute batch statistics
                mean = z.reduce((sum, val) => sum + val, 0) / z.length;
                variance = z.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / z.length;
                
                // Update running statistics with momentum
                for (let i = 0; i < z.length; i++) {
                    running_mean[i] = momentum * running_mean[i] + (1 - momentum) * mean;
                    running_var[i] = momentum * running_var[i] + (1 - momentum) * variance;
                }
            } else {
                mean = running_mean;
                variance = running_var;
            }
            
            // Normalize and scale with epsilon for numerical stability
            return z.map((val, i) => 
                gamma[i] * (val - mean) / Math.sqrt(variance + eps) + beta[i]
            );
        }

        forward(input, training = false) {
            if (!input || input.length !== this.inputDim) {
                throw new Error('Invalid input dimensions');
            }
            
            // Encoder
            const z1 = utils.addBias(utils.matrixVectorMultiply(this.W1, input), this.b1);
            const a1 = this.batchNorm(z1, this.bn1_gamma, this.bn1_beta, 
                                    this.bn1_running_mean, this.bn1_running_var, training);
            const h1 = a1.map(x => this.leakyRelu(x));
            
            const z2 = utils.addBias(utils.matrixVectorMultiply(this.W2, h1), this.b2);
            const latent = z2.map(x => this.tanh(x));
            
            // Decoder
            const z3 = utils.addBias(utils.matrixVectorMultiply(this.W3, latent), this.b3);
            const h3 = z3.map(x => this.leakyRelu(x));
            
            const z4 = utils.addBias(utils.matrixVectorMultiply(this.W4, h3), this.b4);
            const output = z4; // Linear output for regression
            
            return { output, latent, z1, a1, h1, z2, z3, h3, z4 };
        }

        train(data, epochs = 500, initialLearningRate = 0.01, batchSize = 32) {
            const n = data.length;
            if (n === 0) return;
            
            // Initialize optimizer state
            const m = this.initializeCache();
            const v = this.initializeCache();
            
            // Learning rate schedule with warmup and cosine decay
            const warmupEpochs = Math.floor(epochs * 0.1);
            const lrSchedule = (epoch) => {
                if (epoch < warmupEpochs) {
                    return initialLearningRate * (epoch / warmupEpochs);
                }
                const progress = (epoch - warmupEpochs) / (epochs - warmupEpochs);
                return initialLearningRate * 0.5 * (1 + Math.cos(Math.PI * progress));
            };
            
            // Training loop
            for (let epoch = 0; epoch < epochs; epoch++) {
                const currentLr = lrSchedule(epoch);
                
                // Shuffle data
                const indices = Array.from({length: n}, (_, i) => i);
                for (let i = n - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                
                let totalLoss = 0;
                
                // Mini-batch training
                for (let batch = 0; batch < n; batch += batchSize) {
                    const batchEnd = Math.min(batch + batchSize, n);
                    const batchGradients = this.initializeGradients();
                    
                    // Accumulate gradients over batch
                    for (let idx = batch; idx < batchEnd; idx++) {
                        const i = indices[idx];
                        const input = data[i];
                        
                        try {
                            const { output, latent, z1, a1, h1, z2, z3, h3, z4 } = this.forward(input, true);
                            
                            // Calculate loss (MSE + L2 regularization)
                            let loss = 0;
                            for (let j = 0; j < this.inputDim; j++) {
                                const diff = output[j] - input[j];
                                loss += diff * diff;
                            }
                            
                            // Add L2 regularization
                            const lambda = 1e-4;
                            for (let j = 0; j < this.latentDim; j++) {
                                loss += lambda * latent[j] * latent[j];
                            }
                            
                            totalLoss += loss;
                            
                            // Backward pass
                            const batchNorm = 1.0 / (batchEnd - batch);
                            
                            // Output layer gradients
                            const dL_dz4 = new Array(this.inputDim);
                            for (let j = 0; j < this.inputDim; j++) {
                                dL_dz4[j] = 2.0 * (output[j] - input[j]) * batchNorm;
                            }
                            
                            // Hidden layer 2 gradients
                            const dL_dh3 = utils.vectorMatrixMultiply(dL_dz4, this.W4);
                            const dL_dz3 = new Array(this.hiddenDim);
                            for (let j = 0; j < this.hiddenDim; j++) {
                                dL_dz3[j] = dL_dh3[j] * this.leakyReluDerivative(z3[j]);
                            }
                            
                            // Latent layer gradients
                            const dL_dlatent_rec = utils.vectorMatrixMultiply(dL_dz3, this.W3);
                            const dL_dlatent = new Array(this.latentDim);
                            for (let j = 0; j < this.latentDim; j++) {
                                dL_dlatent[j] = dL_dlatent_rec[j] * this.tanhDerivative(z2[j]) 
                                            + 2 * lambda * latent[j] * batchNorm;
                            }
                            
                            // Hidden layer 1 gradients
                            const dL_dh1 = utils.vectorMatrixMultiply(dL_dlatent, this.W2);
                            const dL_da1 = new Array(this.hiddenDim);
                            for (let j = 0; j < this.hiddenDim; j++) {
                                dL_da1[j] = dL_dh1[j] * this.leakyReluDerivative(a1[j]);
                            }
                            
                            // Accumulate gradients
                            this.accumulateGradients(batchGradients, {
                                dL_dz4, dL_dz3, dL_dlatent, dL_da1,
                                input, h1, latent, h3
                            });
                            
                        } catch (error) {
                            console.error('Error in batch processing:', error);
                            continue;
                        }
                    }
                    
                    // Apply Adam updates
                    const t = epoch * Math.ceil(n / batchSize) + Math.floor(batch / batchSize) + 1;
                    const beta1 = 0.9;
                    const beta2 = 0.999;
                    const epsilon = 1e-8;
                    const lr = currentLr * Math.sqrt(1 - Math.pow(beta2, t)) / (1 - Math.pow(beta1, t));
                    
                    this.applyGradients(batchGradients, m, v, lr, beta1, beta2, epsilon);
                }
                
                // Update progress
                if (epoch % 20 === 0) {
                    const avgLoss = totalLoss / n;
                    console.log(`Epoch ${epoch}/${epochs}, Loss: ${avgLoss.toFixed(4)}`);
                }
            }
        }

        accumulateGradients(gradients, computed) {
            const { dL_dz4, dL_dz3, dL_dlatent, dL_da1, input, h1, latent, h3 } = computed;
            
            // W4 and b4
            for (let j = 0; j < this.inputDim; j++) {
                const grad = dL_dz4[j];
                for (let k = 0; k < this.hiddenDim; k++) {
                    gradients.W4[j][k] += grad * h3[k];
                }
                gradients.b4[j] += grad;
            }
            
            // W3 and b3
            for (let j = 0; j < this.hiddenDim; j++) {
                const grad = dL_dz3[j];
                for (let k = 0; k < this.latentDim; k++) {
                    gradients.W3[j][k] += grad * latent[k];
                }
                gradients.b3[j] += grad;
            }
            
            // W2 and b2
            for (let j = 0; j < this.latentDim; j++) {
                const grad = dL_dlatent[j];
                for (let k = 0; k < this.hiddenDim; k++) {
                    gradients.W2[j][k] += grad * h1[k];
                }
                gradients.b2[j] += grad;
            }
            
            // W1 and b1
            for (let j = 0; j < this.hiddenDim; j++) {
                const grad = dL_da1[j];
                for (let k = 0; k < this.inputDim; k++) {
                    gradients.W1[j][k] += grad * input[k];
                }
                gradients.b1[j] += grad;
            }
        }

        applyGradients(gradients, m, v, lr, beta1, beta2, epsilon) {
            const maxGradNorm = 1.0;
            
            // Compute gradient norms for clipping
            const gradNorms = {
                W1: this.countGradNorm(gradients.W1),
                W2: this.countGradNorm(gradients.W2),
                W3: this.countGradNorm(gradients.W3),
                W4: this.countGradNorm(gradients.W4),
                b1: Math.sqrt(gradients.b1.reduce((sum, g) => sum + g * g, 0)),
                b2: Math.sqrt(gradients.b2.reduce((sum, g) => sum + g * g, 0)),
                b3: Math.sqrt(gradients.b3.reduce((sum, g) => sum + g * g, 0)),
                b4: Math.sqrt(gradients.b4.reduce((sum, g) => sum + g * g, 0))
            };
            
            // Find maximum norm
            const maxNorm = Math.max(
                gradNorms.W1, gradNorms.W2, gradNorms.W3, gradNorms.W4,
                gradNorms.b1, gradNorms.b2, gradNorms.b3, gradNorms.b4
            );
            
            // Compute clipping coefficient
            const clipCoef = maxNorm > maxGradNorm ? maxGradNorm / maxNorm : 1.0;
            
            // Update weights with gradient clipping
            this.updateWeights(this.W1, gradients.W1, m.W1, v.W1, lr * clipCoef, beta1, beta2, epsilon);
            this.updateWeights(this.W2, gradients.W2, m.W2, v.W2, lr * clipCoef, beta1, beta2, epsilon);
            this.updateWeights(this.W3, gradients.W3, m.W3, v.W3, lr * clipCoef, beta1, beta2, epsilon);
            this.updateWeights(this.W4, gradients.W4, m.W4, v.W4, lr * clipCoef, beta1, beta2, epsilon);
            
            // Update biases
            this.updateBias(this.b1, gradients.b1, m.b1, v.b1, lr * clipCoef, beta1, beta2, epsilon);
            this.updateBias(this.b2, gradients.b2, m.b2, v.b2, lr * clipCoef, beta1, beta2, epsilon);
            this.updateBias(this.b3, gradients.b3, m.b3, v.b3, lr * clipCoef, beta1, beta2, epsilon);
            this.updateBias(this.b4, gradients.b4, m.b4, v.b4, lr * clipCoef, beta1, beta2, epsilon);
        }

        countGradNorm(grad) {
            return Math.sqrt(grad.reduce((sum, row) => 
                sum + row.reduce((rowSum, g) => rowSum + g * g, 0), 0
            ));
        }

        updateWeights(W, grad, m, v, lr, beta1, beta2, epsilon) {
            for (let i = 0; i < W.length; i++) {
                for (let j = 0; j < W[i].length; j++) {
                    m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad[i][j];
                    v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad[i][j] * grad[i][j];
                    W[i][j] -= lr * m[i][j] / (Math.sqrt(v[i][j]) + epsilon);
                }
            }
        }

        updateBias(b, grad, m, v, lr, beta1, beta2, epsilon) {
            for (let i = 0; i < b.length; i++) {
                m[i] = beta1 * m[i] + (1 - beta1) * grad[i];
                v[i] = beta2 * v[i] + (1 - beta2) * grad[i] * grad[i];
                b[i] -= lr * m[i] / (Math.sqrt(v[i]) + epsilon);
            }
        }

        initializeCache() {
            return {
                W1: utils.zeroMatrix(this.hiddenDim, this.inputDim),
                b1: new Array(this.hiddenDim).fill(0),
                W2: utils.zeroMatrix(this.latentDim, this.hiddenDim),
                b2: new Array(this.latentDim).fill(0),
                W3: utils.zeroMatrix(this.hiddenDim, this.latentDim),
                b3: new Array(this.hiddenDim).fill(0),
                W4: utils.zeroMatrix(this.inputDim, this.hiddenDim),
                b4: new Array(this.inputDim).fill(0)
            };
        }

        initializeGradients() {
            return {
                W1: utils.zeroMatrix(this.hiddenDim, this.inputDim),
                b1: new Array(this.hiddenDim).fill(0),
                W2: utils.zeroMatrix(this.latentDim, this.hiddenDim),
                b2: new Array(this.latentDim).fill(0),
                W3: utils.zeroMatrix(this.hiddenDim, this.latentDim),
                b3: new Array(this.hiddenDim).fill(0),
                W4: utils.zeroMatrix(this.inputDim, this.hiddenDim),
                b4: new Array(this.inputDim).fill(0)
            };
        }

        encode(data) {
            if (!data || data.length === 0) return [];
            
            const encoded = new Array(data.length);
            for (let i = 0; i < data.length; i++) {
                try {
                    const { latent } = this.forward(data[i]);
                    encoded[i] = [latent[0] || 0, latent[1] || 0];
                } catch (error) {
                    console.error('Encoding error for point', i, error);
                    encoded[i] = [0, 0];
                }
            }
            return encoded;
        }
    }

    // Event handlers
    function handleDatasetChange() {
        const datasetType = elements.datasetSelect.value;
        const n = parseInt(elements.sampleSizeInput.value);
        const noise = parseFloat(elements.noiseInput.value);
        
        // Generate new data
        switch (datasetType) {
            case 'blobs':
                ({ data, labels } = dataGenerators.generateBlobsData(n, noise));
                break;
            case 'circles':
                ({ data, labels } = dataGenerators.generateCirclesData(n, noise));
                break;
            case 'moons':
                ({ data, labels } = dataGenerators.generateMoonsData(n, noise));
                break;
            case 'spiral':
                ({ data, labels } = dataGenerators.generateSpiralData(n, noise));
                break;
        }
        
        // Auto-adjust gamma for RBF kernel
        if (elements.kernelSelect.value === 'rbf') {
            gamma = suggestGammaForDataset(data, datasetType);
            elements.gammaInput.value = gamma;
            elements.gammaValue.textContent = gamma.toFixed(2);
        }
        
        // Update visualizations
        drawData(elements.originalCanvas, data, null, 'Original Data');
        drawData(elements.pcaCanvas, data, null, 'PCA Projection');
        drawData(elements.kpcaCanvas, data, null, 'Kernel PCA Projection');
        drawVariance(elements.varianceCanvas, null, null);
        
        // Reset autoencoder
        aeModel = null;
        aeProjection = null;
        drawAutoencoderArchitecture();
        drawAutoencoderComparison();
    }

    function handleKernelChange() {
        const kernelType = elements.kernelSelect.value;
        
        // Show/hide relevant controls
        elements.gammaInput.parentElement.style.display = kernelType === 'rbf' ? 'block' : 'none';
        elements.degreeInput.parentElement.style.display = kernelType === 'poly' ? 'block' : 'none';
        elements.coefInput.parentElement.style.display = kernelType === 'poly' ? 'block' : 'none';
        
        // Auto-adjust gamma for RBF kernel
        if (kernelType === 'rbf' && data.length > 0) {
            gamma = suggestGammaForDataset(data, elements.datasetSelect.value);
            elements.gammaInput.value = gamma;
            elements.gammaValue.textContent = gamma.toFixed(2);
        }
    }

    function handleParameterChange() {
        // Update displayed values
        elements.gammaValue.textContent = elements.gammaInput.value;
        elements.degreeValue.textContent = elements.degreeInput.value;
        elements.coefValue.textContent = elements.coefInput.value;
        elements.componentsValue.textContent = elements.componentsInput.value;
        elements.noiseValue.textContent = elements.noiseInput.value;
        elements.sampleSizeValue.textContent = elements.sampleSizeInput.value;
        
        // Update internal state
        gamma = parseFloat(elements.gammaInput.value);
        degree = parseInt(elements.degreeInput.value);
        coef = parseFloat(elements.coefInput.value);
    }

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
    elements.trainAeBtn.addEventListener('click', trainAutoencoder);
    elements.tabBtns.forEach(btn => btn.addEventListener('click', handleTabClick));

    // Initialize
    handleDatasetChange();
    handleKernelChange();
    handleParameterChange();
});

// ... rest of the existing code (utility functions, data generators, kernels, autoencoder) ...