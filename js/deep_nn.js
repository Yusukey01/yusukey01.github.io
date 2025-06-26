/**
 * Optimized Interactive Attention Mechanism Visualizer with Training
 * 
 * This integrated version includes:
 * 1. Complete attention mechanism visualization
 * 2. Training module to demonstrate learning
 * 3. Multiple training tasks
 * 4. Real-time visualization of learning progress
 */

// Configuration constants
const CONFIG = {
    CANVAS_SIZES: {
        matrix: { width: 200, height: 150 },
        attention: { width: 300, height: 300 },
        multihead: { width: 180, height: 180 },
        concat: { width: 600, height: 200 },
        position: { width: 600, height: 200 }
    },
    COLORS: {
        primary: '#3498db',
        secondary: '#e74c3c',
        success: '#2ecc71',
        warning: '#f39c12',
        info: '#95a5a6',
        dark: '#2c3e50',
        light: '#ecf0f1',
        attentionHue: 210
    },
    DEFAULTS: {
        embeddingDim: 8,
        numHeads: 2,
        temperature: 1.0,
        sentence: "The cat sat on mat"
    }
};

// Matrix utility functions
const MatrixUtils = {
    initialize(rows, cols, scale = 0.5) {
        return Array.from({length: rows}, () => 
            Array.from({length: cols}, () => (Math.random() - 0.5) * scale)
        );
    },
    
    multiply(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        
        const result = new Array(rowsA);
        for (let i = 0; i < rowsA; i++) {
            result[i] = new Array(colsB);
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    },
    
    transpose(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        return Array.from({length: cols}, (_, j) =>
            Array.from({length: rows}, (_, i) => matrix[i][j])
        );
    },
    
    softmax(scores, temperature = 1.0) {
        const expScores = scores.map(score => Math.exp(score / temperature));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        return expScores.map(exp => exp / sumExp);
    }
};

// Canvas drawing utilities
class CanvasUtils {
    static drawMatrix(canvas, matrix, colorScale = false) {
        const ctx = canvas.getContext('2d');
        const rows = matrix.length;
        const cols = matrix[0].length;
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const value = matrix[i][j];
                
                if (colorScale) {
                    const intensity = Math.max(0, Math.min(1, (value + 1) / 2));
                    ctx.fillStyle = `hsl(${CONFIG.COLORS.attentionHue}, 70%, ${90 - intensity * 40}%)`;
                } else {
                    const gray = Math.floor(255 - Math.abs(value) * 100);
                    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                }
                
                ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth - 1, cellHeight - 1);
                
                if (cellWidth > 30 && cellHeight > 20) {
                    ctx.fillStyle = Math.abs(value) > 0.5 ? 'white' : 'black';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value.toFixed(2), 
                        j * cellWidth + cellWidth / 2, 
                        i * cellHeight + cellHeight / 2
                    );
                }
            }
        }
    }
    
    static drawAttentionMatrix(canvas, matrix, tokens, onHover) {
        const ctx = canvas.getContext('2d');
        const size = matrix.length;
        const cellSize = canvas.width / (size + 1);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < size; i++) {
            // Top labels
            ctx.save();
            ctx.translate(cellSize * (i + 1) + cellSize / 2, cellSize / 2);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(tokens[i], 0, 0);
            ctx.restore();
            
            // Left labels
            ctx.fillText(tokens[i], cellSize / 2, cellSize * (i + 1) + cellSize / 2);
        }
        
        // Draw attention values
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const value = matrix[i][j];
                const intensity = Math.min(1, Math.max(0, value));
                
                const lightness = 90 - intensity * 60;
                ctx.fillStyle = `hsl(${CONFIG.COLORS.attentionHue}, 70%, ${lightness}%)`;
                
                ctx.fillRect(
                    cellSize * (j + 1) + 1,
                    cellSize * (i + 1) + 1,
                    cellSize - 2,
                    cellSize - 2
                );
                
                if (cellSize > 40) {
                    ctx.fillStyle = intensity > 0.5 ? 'white' : 'black';
                    ctx.font = '10px Arial';
                    ctx.fillText(
                        value.toFixed(3),
                        cellSize * (j + 1) + cellSize / 2,
                        cellSize * (i + 1) + cellSize / 2
                    );
                }
            }
        }
        
        // Mouse hover handler
        if (onHover) {
            const handleMouseMove = (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const col = Math.floor(x / cellSize) - 1;
                const row = Math.floor(y / cellSize) - 1;
                
                if (row >= 0 && row < size && col >= 0 && col < size) {
                    onHover(row, col, matrix[row][col]);
                } else {
                    onHover(-1, -1, 0);
                }
            };
            
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseleave', () => onHover(-1, -1, 0));
        }
    }
}

// Training module class
class AttentionTrainer {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.learningRate = 0.01;
        this.epochs = 100;
        this.currentEpoch = 0;
        this.isTraining = false;
        this.trainingHistory = [];
        this.initialized = false;
        
        // Training task configurations
        this.tasks = {
            nextWord: {
                name: "Next Word Prediction",
                description: "Learn to attend to words that help predict the next word",
                createTargets: this.createNextWordTargets.bind(this),
                loss: this.crossEntropyLoss.bind(this)
            },
            copyTask: {
                name: "Copy Task",
                description: "Learn to attend to specific positions (diagonal attention)",
                createTargets: this.createCopyTargets.bind(this),
                loss: this.mseLoss.bind(this)
            },
            similarity: {
                name: "Word Similarity",
                description: "Learn to attend to semantically related words",
                createTargets: this.createSimilarityTargets.bind(this),
                loss: this.mseLoss.bind(this)
            }
        };
        
        this.currentTask = 'nextWord';
        
        // Initialize trainable parameters
        this.initializeParameters();
    }
    
    initializeParameters() {
        const dim = parseInt(this.visualizer.elements.embedding_dim.value);
        
        // Initialize with small random values
        this.Wq = MatrixUtils.initialize(dim, dim, 0.1);
        this.Wk = MatrixUtils.initialize(dim, dim, 0.1);
        this.Wv = MatrixUtils.initialize(dim, dim, 0.1);
        
        // Store original weights
        this.originalWq = null;
        this.originalWk = null;
        this.originalWv = null;
    }
    
    createTrainingUI() {
        return `
            <div class="training-section">
                <h3>Training Section</h3>
                
                <div class="training-controls">
                    <div class="task-selector">
                        <label>Training Task:</label>
                        <select id="training-task">
                            ${Object.entries(this.tasks).map(([key, task]) => 
                                `<option value="${key}">${task.name}</option>`
                            ).join('')}
                        </select>
                        <p class="task-description">${this.tasks[this.currentTask].description}</p>
                    </div>
                    
                    <div class="training-params">
                        <div class="param-group">
                            <label>Learning Rate:</label>
                            <input type="range" id="learning-rate" min="0.001" max="0.1" step="0.001" value="${this.learningRate}">
                            <span id="lr-display">${this.learningRate}</span>
                        </div>
                        
                        <div class="param-group">
                            <label>Epochs:</label>
                            <input type="range" id="num-epochs" min="10" max="500" step="10" value="${this.epochs}">
                            <span id="epochs-display">${this.epochs}</span>
                        </div>
                    </div>
                    
                    <div class="training-buttons">
                        <button id="train-btn" class="train-button">Start Training</button>
                        <button id="reset-btn" class="reset-button">Reset Weights</button>
                    </div>
                    
                    <div class="training-progress" style="display: none;">
                        <div class="progress-bar">
                            <div id="progress-fill" class="progress-fill"></div>
                        </div>
                        <p>Epoch: <span id="current-epoch">0</span> / <span id="total-epochs">${this.epochs}</span></p>
                        <p>Loss: <span id="current-loss">-</span></p>
                    </div>
                </div>
                
                <div class="training-visualization">
                    <div class="loss-chart">
                        <h4>Training Loss</h4>
                        <canvas id="loss-chart" width="400" height="200"></canvas>
                    </div>
                    
                    <div class="attention-evolution">
                        <h4>Attention Pattern Evolution</h4>
                        <div class="evolution-grid" id="evolution-grid"></div>
                    </div>
                </div>
                
                <div class="training-insights">
                    <h4>What's Happening?</h4>
                    <div id="training-explanation">
                        <p>Click "Start Training" to see how attention patterns emerge through learning!</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Training task implementations
    createNextWordTargets(tokens, embeddings) {
        const seqLen = tokens.length;
        const targets = [];
        
        for (let i = 0; i < seqLen; i++) {
            const targetRow = new Array(seqLen).fill(0);
            for (let j = 0; j <= i; j++) {
                targetRow[j] = Math.exp(-(i - j) * 0.5);
            }
            const sum = targetRow.reduce((a, b) => a + b, 0);
            targets.push(targetRow.map(v => v / sum));
        }
        
        return targets;
    }
    
    createCopyTargets(tokens, embeddings) {
        const seqLen = tokens.length;
        const targets = [];
        
        for (let i = 0; i < seqLen; i++) {
            const targetRow = new Array(seqLen).fill(0);
            targetRow[i] = 1.0;
            targets.push(targetRow);
        }
        
        return targets;
    }
    
    createSimilarityTargets(tokens, embeddings) {
        const seqLen = tokens.length;
        const targets = [];
        
        for (let i = 0; i < seqLen; i++) {
            const targetRow = new Array(seqLen).fill(0);
            for (let j = 0; j < seqLen; j++) {
                const shared = this.countSharedChars(tokens[i], tokens[j]);
                targetRow[j] = shared / Math.max(tokens[i].length, tokens[j].length);
            }
            targetRow[i] += 0.5;
            const sum = targetRow.reduce((a, b) => a + b, 0);
            targets.push(targetRow.map(v => v / sum));
        }
        
        return targets;
    }
    
    countSharedChars(str1, str2) {
        const chars1 = new Set(str1.split(''));
        const chars2 = new Set(str2.split(''));
        let shared = 0;
        chars1.forEach(char => {
            if (chars2.has(char)) shared++;
        });
        return shared;
    }
    
    mseLoss(predicted, target) {
        let loss = 0;
        for (let i = 0; i < predicted.length; i++) {
            for (let j = 0; j < predicted[i].length; j++) {
                const diff = predicted[i][j] - target[i][j];
                loss += diff * diff;
            }
        }
        return loss / (predicted.length * predicted[0].length);
    }
    
    crossEntropyLoss(predicted, target) {
        let loss = 0;
        const epsilon = 1e-7;
        
        for (let i = 0; i < predicted.length; i++) {
            for (let j = 0; j < predicted[i].length; j++) {
                loss -= target[i][j] * Math.log(predicted[i][j] + epsilon);
            }
        }
        return loss / predicted.length;
    }
    
    forward(embeddings, temperature = 1.0) {
        const Q = MatrixUtils.multiply(embeddings, this.Wq);
        const K = MatrixUtils.multiply(embeddings, this.Wk);
        const V = MatrixUtils.multiply(embeddings, this.Wv);
        
        const attention = this.visualizer.computeAttention(Q, K, V, temperature);
        
        return {
            Q, K, V,
            attentionWeights: attention.weights,
            output: attention.output
        };
    }
    
    backward(embeddings, attentionWeights, target, learningRate) {
        const seqLen = embeddings.length;
        const dim = embeddings[0].length;
        
        // Compute attention weight gradients
        const dWeights = [];
        for (let i = 0; i < seqLen; i++) {
            dWeights[i] = [];
            for (let j = 0; j < seqLen; j++) {
                dWeights[i][j] = 2 * (attentionWeights[i][j] - target[i][j]) / seqLen;
            }
        }
        
        // Simplified gradient updates
        for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
                let gradQ = 0;
                let gradK = 0;
                
                for (let s = 0; s < seqLen; s++) {
                    for (let t = 0; t < seqLen; t++) {
                        const errorSignal = dWeights[s][t];
                        gradQ += errorSignal * embeddings[s][i] * 0.1;
                        gradK += errorSignal * embeddings[t][i] * 0.1;
                    }
                }
                
                this.Wq[i][j] -= learningRate * gradQ;
                this.Wk[i][j] -= learningRate * gradK;
            }
        }
    }
    
    async train() {
        this.isTraining = true;
        this.trainingHistory = [];
        
        const trainBtn = document.getElementById('train-btn');
        trainBtn.textContent = 'Training...';
        trainBtn.disabled = true;
        
        const progressSection = document.querySelector('.training-progress');
        progressSection.style.display = 'block';
        
        // Get current sentence and embeddings
        const sentence = this.visualizer.elements.input_sentence.value.trim();
        if (!sentence) {
            alert('Please enter a sentence first!');
            this.stopTraining();
            return;
        }
        
        // Store original weights
        if (!this.originalWq) {
            this.storeOriginalWeights();
        }
        
        this.visualizer.processAttention();
        const tokens = this.visualizer.state.tokens;
        const embeddings = this.visualizer.state.embeddings;
        
        // Create targets
        const task = this.tasks[this.currentTask];
        const targets = task.createTargets(tokens, embeddings);
        
        // Capture initial state
        this.captureAttentionSnapshot(0);
        
        // Training loop
        for (let epoch = 0; epoch < this.epochs; epoch++) {
            if (!this.isTraining) break;
            
            this.currentEpoch = epoch + 1;
            
            // Forward pass
            const result = this.forward(embeddings);
            
            // Compute loss
            const loss = task.loss(result.attentionWeights, targets);
            this.trainingHistory.push(loss);
            
            // Backward pass
            this.backward(embeddings, result.attentionWeights, targets, this.learningRate);
            
            // Update UI
            this.updateTrainingProgress(epoch + 1, loss);
            
            // Update visualization periodically
            if (epoch % 10 === 0 || epoch === this.epochs - 1) {
                this.updateVisualizerWeights();
                this.captureAttentionSnapshot(epoch + 1);
            }
            
            // Small delay for visualization
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        this.stopTraining();
        this.showTrainingInsights();
    }
    
    storeOriginalWeights() {
        const dim = this.Wq.length;
        this.originalWq = Array.from({length: dim}, (_, i) => [...this.Wq[i]]);
        this.originalWk = Array.from({length: dim}, (_, i) => [...this.Wk[i]]);
        this.originalWv = Array.from({length: dim}, (_, i) => [...this.Wv[i]]);
    }
    
    stopTraining() {
        this.isTraining = false;
        const trainBtn = document.getElementById('train-btn');
        trainBtn.textContent = 'Start Training';
        trainBtn.disabled = false;
    }
    
    updateTrainingProgress(epoch, loss) {
        document.getElementById('current-epoch').textContent = epoch;
        document.getElementById('current-loss').textContent = loss.toFixed(4);
        document.getElementById('progress-fill').style.width = 
            `${(epoch / this.epochs) * 100}%`;
        
        this.updateLossChart();
    }
    
    updateLossChart() {
        const canvas = document.getElementById('loss-chart');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (this.trainingHistory.length < 2) return;
        
        const minLoss = Math.min(...this.trainingHistory);
        const maxLoss = Math.max(...this.trainingHistory);
        const range = maxLoss - minLoss || 1;
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(30, height - 30);
        ctx.lineTo(width - 10, height - 30);
        ctx.moveTo(30, height - 30);
        ctx.lineTo(30, 10);
        ctx.stroke();
        
        // Draw loss curve
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < this.trainingHistory.length; i++) {
            const x = 30 + (i / (this.epochs - 1)) * (width - 40);
            const y = height - 30 - ((this.trainingHistory[i] - minLoss) / range) * (height - 40);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Draw labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Epochs', width / 2, height - 5);
        
        ctx.save();
        ctx.translate(10, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Loss', 0, 0);
        ctx.restore();
    }
    
    captureAttentionSnapshot(epoch) {
        const result = this.forward(this.visualizer.state.embeddings);
        const grid = document.getElementById('evolution-grid');
        
        const snapshot = document.createElement('div');
        snapshot.className = 'evolution-snapshot';
        
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        
        this.drawMiniAttention(canvas, result.attentionWeights);
        
        const label = document.createElement('p');
        label.textContent = `Epoch ${epoch}`;
        
        snapshot.appendChild(canvas);
        snapshot.appendChild(label);
        
        if (epoch === 0) {
            grid.innerHTML = '';
        }
        grid.appendChild(snapshot);
    }
    
    drawMiniAttention(canvas, weights) {
        const ctx = canvas.getContext('2d');
        const size = weights.length;
        const cellSize = canvas.width / size;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const value = weights[i][j];
                const intensity = Math.min(1, Math.max(0, value));
                const lightness = 90 - intensity * 60;
                
                ctx.fillStyle = `hsl(210, 70%, ${lightness}%)`;
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
            }
        }
    }
    
    updateVisualizerWeights() {
        // Update the main visualizer with trained weights
        this.visualizer.state.Q = MatrixUtils.multiply(this.visualizer.state.embeddings, this.Wq);
        this.visualizer.state.K = MatrixUtils.multiply(this.visualizer.state.embeddings, this.Wk);
        this.visualizer.state.V = MatrixUtils.multiply(this.visualizer.state.embeddings, this.Wv);
        
        const attention = this.visualizer.computeAttention(
            this.visualizer.state.Q,
            this.visualizer.state.K,
            this.visualizer.state.V
        );
        
        this.visualizer.state.attentionScores = attention.scores;
        this.visualizer.state.attentionWeights = attention.weights;
        this.visualizer.state.outputVectors = attention.output;
        
        this.visualizer.updateVisualizations();
    }
    
    showTrainingInsights() {
        const explanations = {
            nextWord: `
                <p><strong>Training Complete!</strong></p>
                <p>The model learned to attend to previous words when predicting the next word. 
                Notice how the attention pattern now shows a triangular structure - each position 
                attends more strongly to recent previous positions.</p>
                <p>This is similar to how language models learn causal attention patterns!</p>
            `,
            copyTask: `
                <p><strong>Training Complete!</strong></p>
                <p>The model learned to attend to the same position (diagonal attention). 
                This creates an identity mapping where each token primarily attends to itself.</p>
                <p>This pattern is useful for tasks that require preserving positional information!</p>
            `,
            similarity: `
                <p><strong>Training Complete!</strong></p>
                <p>The model learned to attend to tokens with similar characters. 
                Words that share letters now have stronger attention connections.</p>
                <p>This demonstrates how attention can learn semantic relationships!</p>
            `
        };
        
        document.getElementById('training-explanation').innerHTML = 
            explanations[this.currentTask];
    }
    
    reset() {
        this.initializeParameters();
        this.trainingHistory = [];
        this.currentEpoch = 0;
        
        // Restore original weights if available
        if (this.originalWq) {
            const dim = this.originalWq.length;
            this.Wq = Array.from({length: dim}, (_, i) => [...this.originalWq[i]]);
            this.Wk = Array.from({length: dim}, (_, i) => [...this.originalWk[i]]);
            this.Wv = Array.from({length: dim}, (_, i) => [...this.originalWv[i]]);
        }
        
        // Reset progress UI
        document.getElementById('current-epoch').textContent = '0';
        document.getElementById('current-loss').textContent = '-';
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('evolution-grid').innerHTML = '';
        
        // Clear loss chart
        const canvas = document.getElementById('loss-chart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Reset main visualizer
        this.visualizer.processAttention();
        
        document.getElementById('training-explanation').innerHTML = 
            '<p>Weights reset! Click "Start Training" to begin training.</p>';
    }
    
    attachEventListeners() {
        if (this.initialized) return;
        
        // Task selector
        document.getElementById('training-task').addEventListener('change', (e) => {
            this.currentTask = e.target.value;
            document.querySelector('.task-description').textContent = 
                this.tasks[this.currentTask].description;
            this.reset();
        });
        
        // Parameter controls
        document.getElementById('learning-rate').addEventListener('input', (e) => {
            this.learningRate = parseFloat(e.target.value);
            document.getElementById('lr-display').textContent = this.learningRate;
        });
        
        document.getElementById('num-epochs').addEventListener('input', (e) => {
            this.epochs = parseInt(e.target.value);
            document.getElementById('epochs-display').textContent = this.epochs;
            document.getElementById('total-epochs').textContent = this.epochs;
        });
        
        // Training buttons
        document.getElementById('train-btn').addEventListener('click', () => {
            if (!this.isTraining) {
                this.train();
            } else {
                this.stopTraining();
            }
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
        });
        
        this.initialized = true;
    }
}

// Main visualizer class with training
class AttentionVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container element not found!');
            return;
        }
        
        this.state = {
            tokens: [],
            embeddings: [],
            Q: null,
            K: null,
            V: null,
            attentionScores: [],
            attentionWeights: [],
            outputVectors: [],
            multiHeadResults: [],
            activeTab: 'single',
            selectedHead: 0
        };
        
        this.trainer = null;
        this.init();
    }
    
    init() {
        this.createHTML();
        this.createStyles();
        this.cacheElements();
        this.attachEventListeners();
        this.updateParameterDisplays();
        
        // Initialize training module
        this.initializeTraining();
    }
    
    initializeTraining() {
        this.trainer = new AttentionTrainer(this);
    }
    
    createHTML() {
        const html = new HTMLGenerator();
        this.container.innerHTML = html.generate();
    }
    
    createStyles() {
        const styles = new StyleGenerator();
        const styleElement = document.createElement('style');
        styleElement.textContent = styles.generate();
        document.head.appendChild(styleElement);
    }
    
    cacheElements() {
        // Cache all elements by ID
        const elementIds = [
            'input-sentence', 'process-btn', 'embedding-dim', 'num-heads', 'temperature',
            'computation-info', 'token-embeddings', 'query-matrix', 'key-matrix',
            'value-matrix', 'attention-scores', 'attention-weights', 'output-values',
            'score-detail', 'head-buttons', 'all-heads-grid', 'selected-head-details',
            'current-head-num', 'head-query-matrix', 'head-key-matrix', 'head-value-matrix',
            'head-attention-scores', 'head-attention-weights', 'concat-visualization',
            'position-encoding-viz', 'tokens-no-position', 'position-vectors-grid',
            'position-hover-info', 'embedding-canvas', 'position-canvas', 'final-canvas',
            'final-tokens-position'
        ];
        
        this.elements = {};
        elementIds.forEach(id => {
            this.elements[id.replace(/-/g, '_')] = document.getElementById(id);
        });
        
        // Cache display elements
        this.elements.dim_display = document.getElementById('dim-display');
        this.elements.heads_display = document.getElementById('heads-display');
        this.elements.temp_display = document.getElementById('temp-display');
        
        // Cache tab elements
        this.elements.vizTabs = document.querySelectorAll('.viz-tab');
        this.elements.vizPanes = document.querySelectorAll('.viz-pane');
    }
    
    attachEventListeners() {
        // Process button
        this.elements.process_btn.addEventListener('click', () => this.processAttention());
        this.elements.input_sentence.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processAttention();
        });
        
        // Parameter controls
        this.elements.embedding_dim.addEventListener('input', () => this.updateParameterDisplays());
        this.elements.num_heads.addEventListener('input', () => this.updateParameterDisplays());
        this.elements.temperature.addEventListener('input', () => this.updateParameterDisplays());
        
        // Tab switching
        this.elements.vizTabs.forEach(tab => 
            tab.addEventListener('click', (e) => this.handleTabClick(e))
        );
    }
    
    updateParameterDisplays() {
        this.elements.dim_display.textContent = this.elements.embedding_dim.value;
        this.elements.heads_display.textContent = this.elements.num_heads.value;
        this.elements.temp_display.textContent = this.elements.temperature.value;
        
        // Update visualizations if needed
        if (this.state.activeTab === 'position') {
            this.updatePositionalEncoding();
        }
        
        // Reinitialize trainer parameters if dimension changed
        if (this.trainer) {
            const currentDim = parseInt(this.elements.embedding_dim.value);
            if (this.trainer.Wq.length !== currentDim) {
                this.trainer.initializeParameters();
            }
        }
    }
    
    handleTabClick(e) {
        const targetTab = e.target.dataset.tab;
        
        // Update active states
        this.elements.vizTabs.forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        
        this.elements.vizPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `${targetTab}-tab`);
        });
        
        this.state.activeTab = targetTab;
        
        // Process tab-specific content
        if (targetTab === 'multi' && this.state.tokens.length > 0) {
            this.processMultiHeadAttention();
        } else if (targetTab === 'position') {
            this.updatePositionalEncoding();
        } else if (targetTab === 'training') {
            this.trainer.attachEventListeners();
        }
    }
    
    // Core processing methods
    tokenize(sentence) {
        return sentence.toLowerCase().split(/\s+/).filter(token => token.length > 0);
    }
    
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    createEmbeddings(tokens, dim) {
        return tokens.map(token => {
            let hash = 0;
            for (let j = 0; j < token.length; j++) {
                hash = ((hash << 5) - hash) + token.charCodeAt(j);
                hash = hash & hash;
            }
            
            return Array.from({length: dim}, (_, j) => 
                (this.seededRandom(hash + j * 1000) - 0.5) * 0.5
            );
        });
    }
    
    computeAttention(Q, K, V, temperature = 1.0) {
        const seqLen = Q.length;
        const dim = K[0].length;
        
        // Compute QK^T
        const scores = MatrixUtils.multiply(Q, MatrixUtils.transpose(K));
        
        // Scale by sqrt(d_k)
        const scaledScores = scores.map(row => 
            row.map(score => score / Math.sqrt(dim))
        );
        
        // Apply softmax to each row
        const weights = scaledScores.map(row => MatrixUtils.softmax(row, temperature));
        
        // Compute weighted values
        const output = MatrixUtils.multiply(weights, V);
        
        return { scores: scaledScores, weights, output };
    }
    
    processAttention() {
        const sentence = this.elements.input_sentence.value.trim();
        if (!sentence) {
            alert('Please enter a sentence');
            return;
        }
        
        const dim = parseInt(this.elements.embedding_dim.value);
        const temperature = parseFloat(this.elements.temperature.value);
        
        // Tokenize and create embeddings
        this.state.tokens = this.tokenize(sentence);
        this.state.embeddings = this.createEmbeddings(this.state.tokens, dim);
        
        // Create Q, K, V matrices
        const Wq = MatrixUtils.initialize(dim, dim);
        const Wk = MatrixUtils.initialize(dim, dim);
        const Wv = MatrixUtils.initialize(dim, dim);
        
        this.state.Q = MatrixUtils.multiply(this.state.embeddings, Wq);
        this.state.K = MatrixUtils.multiply(this.state.embeddings, Wk);
        this.state.V = MatrixUtils.multiply(this.state.embeddings, Wv);
        
        // Compute attention
        const attention = this.computeAttention(this.state.Q, this.state.K, this.state.V, temperature);
        this.state.attentionScores = attention.scores;
        this.state.attentionWeights = attention.weights;
        this.state.outputVectors = attention.output;
        
        // Update visualizations
        this.updateVisualizations();
        
        // Process other tabs if active
        if (this.state.activeTab === 'multi') {
            this.processMultiHeadAttention();
        } else if (this.state.activeTab === 'position') {
            this.updatePositionalEncoding();
        }
    }
    
    updateVisualizations() {
        // Display token embeddings
        this.displayTokenEmbeddings();
        
        // Draw matrices
        CanvasUtils.drawMatrix(this.elements.query_matrix, this.state.Q, true);
        CanvasUtils.drawMatrix(this.elements.key_matrix, this.state.K, true);
        CanvasUtils.drawMatrix(this.elements.value_matrix, this.state.V, true);
        
        // Draw attention scores with hover
        CanvasUtils.drawAttentionMatrix(
            this.elements.attention_scores, 
            this.state.attentionScores, 
            this.state.tokens,
            (row, col, value) => {
                if (row >= 0 && col >= 0) {
                    const dim = this.state.K[0].length;
                    this.elements.score_detail.textContent = 
                        `${this.state.tokens[row]} → ${this.state.tokens[col]}: QK^T = ${(value * Math.sqrt(dim)).toFixed(3)}, scaled = ${value.toFixed(3)}`;
                } else {
                    this.elements.score_detail.textContent = '';
                }
            }
        );
        
        // Draw attention weights
        CanvasUtils.drawAttentionMatrix(
            this.elements.attention_weights, 
            this.state.attentionWeights, 
            this.state.tokens
        );
        
        // Display output values
        this.displayOutputValues();
        
        // Update computation info
        this.updateComputationInfo();
    }
    
    displayTokenEmbeddings() {
        this.elements.token_embeddings.innerHTML = this.state.tokens.map((token, idx) => `
            <div class="token-box">
                <div class="token-label">${token}</div>
                <div class="token-vector">[${this.state.embeddings[idx].slice(0, 3).map(v => v.toFixed(2)).join(', ')}...]</div>
            </div>
        `).join('');
    }
    
    displayOutputValues() {
        this.elements.output_values.innerHTML = this.state.tokens.map((token, idx) => `
            <div class="token-box">
                <div class="token-label">${token}</div>
                <div class="token-vector">[${this.state.outputVectors[idx].slice(0, 3).map(v => v.toFixed(2)).join(', ')}...]</div>
            </div>
        `).join('');
    }
    
    updateComputationInfo() {
        const dim = parseInt(this.elements.embedding_dim.value);
        this.elements.computation_info.innerHTML = `
            <p><strong>Tokens:</strong> ${this.state.tokens.length}</p>
            <p><strong>Embedding dim:</strong> ${dim}</p>
            <p><strong>Q, K, V shape:</strong> [${this.state.tokens.length}, ${dim}]</p>
            <p><strong>Attention shape:</strong> [${this.state.tokens.length}, ${this.state.tokens.length}]</p>
        `;
    }
    
    // Multi-head attention methods
    processMultiHeadAttention() {
        const dim = parseInt(this.elements.embedding_dim.value);
        const numHeads = parseInt(this.elements.num_heads.value);
        const temperature = parseFloat(this.elements.temperature.value);
        const headDim = Math.floor(dim / numHeads);
        
        // Clear previous content
        this.elements.head_buttons.innerHTML = '';
        this.elements.all_heads_grid.innerHTML = '';
        this.state.multiHeadResults = [];
        
        const headDetails = [];
        
        // Process each head
        for (let h = 0; h < numHeads; h++) {
            // Create separate projections for each head
            const Wq = MatrixUtils.initialize(dim, headDim);
            const Wk = MatrixUtils.initialize(dim, headDim);
            const Wv = MatrixUtils.initialize(dim, headDim);
            
            const Qh = MatrixUtils.multiply(this.state.embeddings, Wq);
            const Kh = MatrixUtils.multiply(this.state.embeddings, Wk);
            const Vh = MatrixUtils.multiply(this.state.embeddings, Wv);
            
            const attention = this.computeAttention(Qh, Kh, Vh, temperature);
            
            headDetails.push({
                Q: Qh,
                K: Kh,
                V: Vh,
                scores: attention.scores,
                weights: attention.weights,
                output: attention.output
            });
            
            this.state.multiHeadResults.push(attention);
            
            // Create UI elements
            this.createHeadButton(h, headDetails[h]);
            this.createMiniVisualization(h, attention);
        }
        
        // Select first head by default
        this.elements.head_buttons.firstChild.classList.add('active');
        this.showHeadDetails(0, headDetails[0]);
        
        // Visualize concatenation
        this.visualizeConcatenation(headDetails);
    }
    
    createHeadButton(index, details) {
        const btn = document.createElement('button');
        btn.className = 'head-btn';
        btn.textContent = `Head ${index + 1}`;
        btn.dataset.head = index;
        btn.addEventListener('click', () => this.showHeadDetails(index, details));
        this.elements.head_buttons.appendChild(btn);
    }
    
    createMiniVisualization(index, attention) {
        const miniViz = document.createElement('div');
        miniViz.className = 'mini-head-viz';
        miniViz.innerHTML = `<h6>Head ${index + 1}</h6>`;
        
        const canvas = document.createElement('canvas');
        canvas.width = CONFIG.CANVAS_SIZES.multihead.width;
        canvas.height = CONFIG.CANVAS_SIZES.multihead.height;
        miniViz.appendChild(canvas);
        
        CanvasUtils.drawAttentionMatrix(canvas, attention.weights, this.state.tokens);
        
        this.elements.all_heads_grid.appendChild(miniViz);
    }
    
    showHeadDetails(headIndex, details) {
        // Update active button
        document.querySelectorAll('.head-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.head == headIndex);
        });
        
        // Update head number displays
        this.elements.current_head_num.textContent = headIndex + 1;
        document.querySelectorAll('.current-head-num').forEach(span => {
            span.textContent = headIndex + 1;
        });
        
        // Show details section
        this.elements.selected_head_details.style.display = 'block';
        
        // Draw matrices
        CanvasUtils.drawMatrix(this.elements.head_query_matrix, details.Q, true);
        CanvasUtils.drawMatrix(this.elements.head_key_matrix, details.K, true);
        CanvasUtils.drawMatrix(this.elements.head_value_matrix, details.V, true);
        
        // Draw attention scores and weights
        CanvasUtils.drawAttentionMatrix(
            this.elements.head_attention_scores, 
            details.scores, 
            this.state.tokens,
            (row, col, value) => {
                if (row >= 0 && col >= 0) {
                    const dim = details.K[0].length;
                    this.elements.score_detail.textContent = 
                        `Head ${headIndex + 1}: ${this.state.tokens[row]} → ${this.state.tokens[col]}: score = ${value.toFixed(3)}`;
                }
            }
        );
        
        CanvasUtils.drawAttentionMatrix(
            this.elements.head_attention_weights, 
            details.weights, 
            this.state.tokens
        );
    }
    
    visualizeConcatenation(headDetails) {
        const canvas = this.elements.concat_visualization;
        const ctx = canvas.getContext('2d');
        const numHeads = headDetails.length;
        const tokenCount = this.state.tokens.length;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Drawing parameters
        const headWidth = canvas.width / (numHeads + 1);
        const tokenHeight = 30;
        const startY = 20;
        
        // Colors for different heads
        const colors = [CONFIG.COLORS.primary, CONFIG.COLORS.secondary, CONFIG.COLORS.success, CONFIG.COLORS.warning];
        
        // Draw each head's output
        for (let h = 0; h < numHeads; h++) {
            const x = h * headWidth + 10;
            
            // Draw head label
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Head ${h + 1}`, x + headWidth / 2, startY - 5);
            
            // Draw tokens for this head
            for (let t = 0; t < tokenCount; t++) {
                const y = startY + t * tokenHeight;
                
                // Draw box
                ctx.fillStyle = colors[h % colors.length];
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, y, headWidth - 20, tokenHeight - 5);
                
                // Draw token
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#333';
                ctx.font = '11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.state.tokens[t], x + headWidth / 2, y + tokenHeight / 2);
            }
        }
        
        // Draw concatenation arrow
        const arrowX = numHeads * headWidth;
        const arrowY = startY + (tokenCount * tokenHeight) / 2;
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(arrowX - 10, arrowY);
        ctx.lineTo(arrowX + 30, arrowY);
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(arrowX + 30, arrowY);
        ctx.lineTo(arrowX + 25, arrowY - 5);
        ctx.lineTo(arrowX + 25, arrowY + 5);
        ctx.closePath();
        ctx.fill();
        
        // Draw output
        const outputX = arrowX + 40;
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(outputX, startY, headWidth - 20, tokenCount * tokenHeight - 5);
        
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Concat + W^O', outputX + (headWidth - 20) / 2, startY - 5);
        
        // Draw final tokens
        for (let t = 0; t < tokenCount; t++) {
            const y = startY + t * tokenHeight;
            ctx.font = '11px Arial';
            ctx.fillText(this.state.tokens[t], outputX + (headWidth - 20) / 2, y + tokenHeight / 2);
        }
    }
    
    // Positional encoding methods
    updatePositionalEncoding() {
        const dim = parseInt(this.elements.embedding_dim.value);
        const maxLen = this.state.tokens.length > 0 ? Math.max(this.state.tokens.length, 10) : 20;
        
        this.drawPositionalEncodingPattern(maxLen, dim);
        this.visualizePositionalEncodingSteps();
    }
    
    computePositionalEncoding(pos, dim) {
        const encoding = [];
        for (let i = 0; i < dim; i++) {
            const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dim);
            encoding[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
        }
        return encoding;
    }
    
    drawPositionalEncodingPattern(maxLen, dim) {
        const canvas = this.elements.position_encoding_viz;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Calculate cell sizes
        const cellWidth = width / maxLen;
        const cellHeight = height / dim;
        
        // Draw positional encoding heatmap
        for (let pos = 0; pos < maxLen; pos++) {
            const encoding = this.computePositionalEncoding(pos, dim);
            for (let i = 0; i < dim; i++) {
                const value = encoding[i];
                const intensity = (value + 1) / 2; // Normalize to [0, 1]
                
                // Use different colors for sin (even) and cos (odd) dimensions
                if (i % 2 === 0) {
                    // Sin - use warm colors
                    ctx.fillStyle = value >= 0 
                        ? `hsl(30, 70%, ${90 - intensity * 40}%)`
                        : `hsl(200, 70%, ${50 + (1 - intensity) * 40}%)`;
                } else {
                    // Cos - use cool colors
                    ctx.fillStyle = value >= 0 
                        ? `hsl(120, 70%, ${90 - intensity * 40}%)`
                        : `hsl(280, 70%, ${50 + (1 - intensity) * 40}%)`;
                }
                
                ctx.fillRect(
                    pos * cellWidth,
                    i * cellHeight,
                    cellWidth - 1,
                    cellHeight - 1
                );
            }
        }
        
        // Add hover interaction
        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const pos = Math.floor(x / cellWidth);
            const dimIdx = Math.floor(y / cellHeight);
            
            if (pos >= 0 && pos < maxLen && dimIdx >= 0 && dimIdx < dim) {
                const value = this.computePositionalEncoding(pos, dim)[dimIdx];
                const funcType = dimIdx % 2 === 0 ? 'sin' : 'cos';
                const i = Math.floor(dimIdx / 2);
                const angle = pos / Math.pow(10000, (2 * i) / dim);
                
                this.elements.position_hover_info.textContent = 
                    `Position ${pos}, Dimension ${dimIdx}: ${funcType}(${pos}/10000^(${2*i}/${dim})) = ${funcType}(${angle.toFixed(4)}) = ${value.toFixed(4)}`;
            }
        };
        
        canvas.onmouseleave = () => {
            this.elements.position_hover_info.textContent = 'Hover over the pattern to see values';
        };
    }
    
    visualizePositionalEncodingSteps() {
        const dim = parseInt(this.elements.embedding_dim.value);
        
        // Use example tokens if none are processed yet
        const displayTokens = this.state.tokens.length > 0 ? this.state.tokens : ['the', 'cat', 'sat', 'on', 'mat'];
        const displayEmbeddings = this.state.tokens.length > 0 ? this.state.embeddings : this.createEmbeddings(displayTokens, dim);
        
        // Step 1: Show tokens without position
        this.elements.tokens_no_position.innerHTML = displayTokens.map(token => `
            <div class="token-box">
                <div class="token-label">${token}</div>
                <div style="font-size: 12px; color: #e74c3c;">No position info!</div>
            </div>
        `).join('');
        
        // Step 3: Show individual position vectors
        this.elements.position_vectors_grid.innerHTML = '';
        const numPositions = Math.min(displayTokens.length, 10);
        
        for (let pos = 0; pos < numPositions; pos++) {
            const posBox = document.createElement('div');
            posBox.className = 'position-vector-box';
            
            const title = document.createElement('h6');
            title.textContent = `Position ${pos}`;
            if (pos < displayTokens.length) {
                title.textContent += ` (${displayTokens[pos]})`;
            }
            posBox.appendChild(title);
            
            const pattern = document.createElement('div');
            pattern.className = 'position-pattern';
            
            const encoding = this.computePositionalEncoding(pos, dim);
            
            // Show visual pattern
            for (let i = 0; i < Math.min(dim, 8); i++) {
                const dimBox = document.createElement('div');
                dimBox.className = 'position-dim';
                const value = encoding[i];
                const intensity = (value + 1) / 2;
                
                if (i % 2 === 0) {
                    dimBox.style.backgroundColor = value >= 0 
                        ? `hsl(30, 70%, ${90 - intensity * 40}%)`
                        : `hsl(200, 70%, ${50 + (1 - intensity) * 40}%)`;
                } else {
                    dimBox.style.backgroundColor = value >= 0 
                        ? `hsl(120, 70%, ${90 - intensity * 40}%)`
                        : `hsl(280, 70%, ${50 + (1 - intensity) * 40}%)`;
                }
                
                dimBox.title = `d${i}: ${value.toFixed(3)}`;
                pattern.appendChild(dimBox);
            }
            
            if (dim > 8) {
                const more = document.createElement('span');
                more.style.fontSize = '10px';
                more.style.color = '#666';
                more.textContent = '...';
                pattern.appendChild(more);
            }
            
            posBox.appendChild(pattern);
            
            // Add numeric values
            const values = document.createElement('div');
            values.style.fontSize = '10px';
            values.style.color = '#666';
            values.style.marginTop = '5px';
            values.textContent = '[' + encoding.slice(0, 3).map(v => v.toFixed(2)).join(', ') + '...]';
            posBox.appendChild(values);
            
            this.elements.position_vectors_grid.appendChild(posBox);
        }
        
        // Step 4: Show addition visualization
        const numExamples = Math.min(5, displayTokens.length);
        
        // Draw embeddings matrix
        CanvasUtils.drawMatrix(this.elements.embedding_canvas, displayEmbeddings.slice(0, numExamples), true);
        
        // Draw position encodings matrix
        const positionEncodings = [];
        for (let i = 0; i < numExamples; i++) {
            positionEncodings.push(this.computePositionalEncoding(i, dim));
        }
        CanvasUtils.drawMatrix(this.elements.position_canvas, positionEncodings, true);
        
        // Draw final embeddings + positions
        const finalEmbeddings = [];
        for (let i = 0; i < numExamples; i++) {
            const combined = [];
            for (let j = 0; j < dim; j++) {
                combined.push(displayEmbeddings[i][j] + positionEncodings[i][j]);
            }
            finalEmbeddings.push(combined);
        }
        CanvasUtils.drawMatrix(this.elements.final_canvas, finalEmbeddings, true);
        
        // Show final tokens with position
        this.elements.final_tokens_position.innerHTML = displayTokens.slice(0, numExamples).map((token, idx) => `
            <div class="token-box">
                <div class="token-label">${token}</div>
                <div style="font-size: 12px; color: #27ae60;">Position ${idx}</div>
                <div class="token-vector" style="font-size: 10px; margin-top: 3px;">
                    [${finalEmbeddings[idx].slice(0, 3).map(v => v.toFixed(2)).join(', ')}...]
                </div>
            </div>
        `).join('');
    }
}

// HTML Generator class with training tab
class HTMLGenerator {
    generate() {
        return `
            <div class="attention-container">
                <div class="attention-layout">
                    <div class="attention-visualization">
                        ${this.inputSection()}
                        ${this.tabs()}
                        <div class="viz-content">
                            ${this.singleHeadTab()}
                            ${this.multiHeadTab()}
                            ${this.positionalTab()}
                            ${this.trainingTab()}
                        </div>
                    </div>
                    ${this.controlsPanel()}
                </div>
            </div>
        `;
    }
    
    inputSection() {
        return `
            <div class="input-section">
                <h3>Input Sentence</h3>
                <input type="text" id="input-sentence" value="${CONFIG.DEFAULTS.sentence}" placeholder="Enter a short sentence...">
                <button id="process-btn" class="primary-btn">Process with Attention</button>
            </div>
        `;
    }
    
    tabs() {
        return `
            <div class="visualization-tabs">
                <button class="viz-tab active" data-tab="single">Single-Head Attention</button>
                <button class="viz-tab" data-tab="multi">Multi-Head Attention</button>
                <button class="viz-tab" data-tab="position">Positional Encoding</button>
                <button class="viz-tab" data-tab="training">Training</button>
            </div>
        `;
    }
    
    singleHeadTab() {
        const steps = [
            { title: 'Step 1: Token Embeddings', content: '<div id="token-embeddings"></div>' },
            { title: 'Step 2: Query, Key, Value Projections', content: this.qkvMatrices() },
            { title: 'Step 3: Attention Scores (QK<sup>T</sup>/√d<sub>k</sub>)', content: this.attentionScoresSection() },
            { title: 'Step 4: Attention Weights (Softmax)', content: this.attentionWeightsSection() },
            { title: 'Step 5: Attended Values', content: '<div id="output-values"></div>' }
        ];
        
        return `
            <div id="single-tab" class="viz-pane active">
                <div class="attention-steps">
                    ${steps.map(step => this.stepSection(step.title, step.content)).join('')}
                </div>
            </div>
        `;
    }
    
    multiHeadTab() {
        return `
            <div id="multi-tab" class="viz-pane">
                <div class="multi-head-container">
                    <div class="head-selector">
                        <label>Select Head to View Details:</label>
                        <div id="head-buttons"></div>
                    </div>
                    
                    <div class="multi-head-overview">
                        <h4>All Heads Attention Patterns</h4>
                        <div id="all-heads-grid"></div>
                    </div>
                    
                    <div id="selected-head-details" style="display: none;">
                        <h4>Head <span id="current-head-num">1</span> Detailed View</h4>
                        ${this.headDetailsSection()}
                    </div>
                    
                    <div class="concat-section">
                        <h4>Concatenation & Output Projection</h4>
                        <canvas id="concat-visualization" width="${CONFIG.CANVAS_SIZES.concat.width}" height="${CONFIG.CANVAS_SIZES.concat.height}"></canvas>
                        <p class="formula">MultiHead(Q,K,V) = Concat(head<sub>1</sub>, ..., head<sub>h</sub>)W<sup>O</sup></p>
                    </div>
                </div>
            </div>
        `;
    }
    
    positionalTab() {
        return `
            <div id="position-tab" class="viz-pane">
                <div class="position-encoding">
                    ${this.stepSection('Why Positional Encoding?', 
                        '<p>Attention mechanisms have no inherent notion of word order. Positional encodings add position information to help the model understand sequence structure.</p>')}
                    ${this.stepSection('Step 1: Token Embeddings Without Position', '<div id="tokens-no-position"></div>')}
                    ${this.stepSection('Step 2: Sinusoidal Positional Encoding Pattern', this.positionEncodingPattern())}
                    ${this.stepSection('Step 3: Individual Position Vectors', '<div id="position-vectors-grid"></div>')}
                    ${this.stepSection('Step 4: Embeddings + Positional Encoding', this.embeddingAddition())}
                    ${this.positionalProperties()}
                </div>
            </div>
        `;
    }
    
    trainingTab() {
        // This will be filled by the trainer
        return `
            <div id="training-tab" class="viz-pane">
                <!-- Training content will be inserted here -->
            </div>
        `;
    }
    
    stepSection(title, content) {
        return `
            <div class="step-section">
                <h4>${title}</h4>
                ${content}
            </div>
        `;
    }
    
    qkvMatrices() {
        return `
            <div class="qkv-matrices">
                ${['Query', 'Key', 'Value'].map(type => `
                    <div class="matrix-display">
                        <h5>${type.charAt(0)} (${type})</h5>
                        <canvas id="${type.toLowerCase()}-matrix" width="${CONFIG.CANVAS_SIZES.matrix.width}" height="${CONFIG.CANVAS_SIZES.matrix.height}"></canvas>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    attentionScoresSection() {
        return `
            <canvas id="attention-scores" width="${CONFIG.CANVAS_SIZES.attention.width}" height="${CONFIG.CANVAS_SIZES.attention.height}"></canvas>
            <div class="score-info">
                <span>Hover over cells to see score calculation</span>
                <div id="score-detail"></div>
            </div>
        `;
    }
    
    attentionWeightsSection() {
        return `
            <canvas id="attention-weights" width="${CONFIG.CANVAS_SIZES.attention.width}" height="${CONFIG.CANVAS_SIZES.attention.height}"></canvas>
            <div class="weight-legend">
                <span>0.0</span>
                <div class="gradient-bar"></div>
                <span>1.0</span>
            </div>
        `;
    }
    
    headDetailsSection() {
        return `
            <div class="step-section">
                <h5>Q, K, V Projections (Head <span class="current-head-num">1</span>)</h5>
                <div class="qkv-matrices">
                    ${['Query', 'Key', 'Value'].map(type => `
                        <div class="matrix-display">
                            <h6>${type.charAt(0)}</h6>
                            <canvas id="head-${type.toLowerCase()}-matrix" width="150" height="120"></canvas>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="step-section">
                <h5>Attention Scores & Weights</h5>
                <div class="attention-comparison">
                    <div>
                        <h6>Scores (QK<sup>T</sup>/√d<sub>k</sub>)</h6>
                        <canvas id="head-attention-scores" width="200" height="200"></canvas>
                    </div>
                    <div>
                        <h6>Weights (Softmax)</h6>
                        <canvas id="head-attention-weights" width="200" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
    }
    
    positionEncodingPattern() {
        return `
            <canvas id="position-encoding-viz" width="${CONFIG.CANVAS_SIZES.position.width}" height="${CONFIG.CANVAS_SIZES.position.height}"></canvas>
            <div class="encoding-formula">
                <p>PE(pos, 2i) = sin(pos/10000<sup>2i/d</sup>)</p>
                <p>PE(pos, 2i+1) = cos(pos/10000<sup>2i/d</sup>)</p>
            </div>
            <div id="position-hover-info">Hover over the pattern to see values</div>
        `;
    }
    
    embeddingAddition() {
        return `
            <div class="encoding-addition">
                <canvas id="embedding-canvas" width="180" height="150"></canvas>
                <span class="plus-sign">+</span>
                <canvas id="position-canvas" width="180" height="150"></canvas>
                <span class="equals-sign">=</span>
                <canvas id="final-canvas" width="180" height="150"></canvas>
            </div>
            <div id="final-tokens-position"></div>
        `;
    }
    
    positionalProperties() {
        const properties = [
            { title: 'Unique Encoding', desc: 'Each position has a unique encoding vector' },
            { title: 'Relative Position', desc: 'Model can learn to attend based on relative positions' },
            { title: 'Extrapolation', desc: 'Can handle sequences longer than training data' }
        ];
        
        return this.stepSection('Positional Encoding Properties', `
            <div class="properties-grid">
                ${properties.map(prop => `
                    <div class="property-box">
                        <h5>${prop.title}</h5>
                        <p>${prop.desc}</p>
                    </div>
                `).join('')}
            </div>
        `);
    }
    
    controlsPanel() {
        return `
            <div class="controls-panel">
                <h3>Parameters</h3>
                
                <div class="control-group">
                    <label for="embedding-dim">Embedding Dimension (d<sub>model</sub>):</label>
                    <input type="range" id="embedding-dim" min="4" max="16" step="2" value="${CONFIG.DEFAULTS.embeddingDim}">
                    <span id="dim-display">${CONFIG.DEFAULTS.embeddingDim}</span>
                </div>
                
                <div class="control-group">
                    <label for="num-heads">Number of Attention Heads:</label>
                    <input type="range" id="num-heads" min="1" max="4" step="1" value="${CONFIG.DEFAULTS.numHeads}">
                    <span id="heads-display">${CONFIG.DEFAULTS.numHeads}</span>
                </div>
                
                <div class="control-group">
                    <label for="temperature">Temperature (for visualization):</label>
                    <input type="range" id="temperature" min="0.5" max="2.0" step="0.1" value="${CONFIG.DEFAULTS.temperature}">
                    <span id="temp-display">${CONFIG.DEFAULTS.temperature}</span>
                </div>
                
                <div class="info-panel">
                    <h4>Current Computation:</h4>
                    <div id="computation-info">
                        <p>Click "Process with Attention" to start</p>
                    </div>
                </div>
                
                <div class="formula-panel">
                    <h4>Key Formulas:</h4>
                    <div class="formula">
                        Attention(Q,K,V) = softmax(QK<sup>T</sup>/√d<sub>k</sub>)V
                    </div>
                    <div class="formula">
                        MultiHead = Concat(head<sub>1</sub>, ..., head<sub>h</sub>)W<sup>O</sup>
                    </div>
                </div>
            </div>
        `;
    }
}

// Style Generator class with training styles
class StyleGenerator {
    generate() {
        return `
            ${this.baseStyles()}
            ${this.trainingStyles()}
        `;
    }
    
    baseStyles() {
        return `
            .attention-container {
                font-family: Arial, sans-serif;
                margin: 20px 0;
            }
            
            .attention-layout {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            .attention-visualization {
                flex: 1;
                min-width: 600px;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            
            .controls-panel {
                width: 300px;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                height: fit-content;
            }
            
            .input-section {
                margin-bottom: 20px;
            }
            
            .input-section h3 {
                margin-bottom: 10px;
            }
            
            #input-sentence {
                width: 100%;
                padding: 10px;
                font-size: 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 10px;
            }
            
            .primary-btn {
                background: ${CONFIG.COLORS.primary};
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
                transition: background 0.3s;
            }
            
            .primary-btn:hover {
                background: #2980b9;
            }
            
            .visualization-tabs {
                display: flex;
                gap: 5px;
                margin-bottom: 20px;
                border-bottom: 2px solid #ddd;
            }
            
            .viz-tab {
                padding: 10px 20px;
                border: none;
                background: #f0f0f0;
                cursor: pointer;
                border-radius: 4px 4px 0 0;
                transition: all 0.3s;
            }
            
            .viz-tab.active {
                background: ${CONFIG.COLORS.primary};
                color: white;
            }
            
            .viz-pane {
                display: none;
            }
            
            .viz-pane.active {
                display: block;
            }
            
            .step-section {
                margin-bottom: 30px;
                padding: 15px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .step-section h4 {
                margin-bottom: 15px;
                color: ${CONFIG.COLORS.dark};
            }
            
            .qkv-matrices {
                display: flex;
                gap: 20px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .matrix-display {
                text-align: center;
            }
            
            .matrix-display h5, .matrix-display h6 {
                margin-bottom: 10px;
                color: #34495e;
            }
            
            canvas {
                border: 1px solid #ddd;
                background: white;
            }
            
            #attention-scores, #attention-weights {
                display: block;
                margin: 0 auto;
            }
            
            .score-info {
                text-align: center;
                margin-top: 10px;
                font-size: 14px;
                color: #666;
            }
            
            #score-detail {
                margin-top: 5px;
                font-family: monospace;
                background: #f0f0f0;
                padding: 5px;
                border-radius: 4px;
                min-height: 25px;
            }
            
            .weight-legend {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-top: 10px;
            }
            
            .gradient-bar {
                width: 200px;
                height: 20px;
                background: linear-gradient(to right, #f0f0f0, ${CONFIG.COLORS.primary});
                border: 1px solid #ddd;
            }
            
            .control-group {
                margin-bottom: 20px;
            }
            
            .control-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            
            .control-group input[type="range"] {
                width: calc(100% - 50px);
                margin-right: 10px;
            }
            
            .info-panel, .formula-panel {
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
            }
            
            .formula {
                margin: 10px 0;
                padding: 10px;
                background: #f0f0f0;
                border-radius: 4px;
                font-family: 'Times New Roman', serif;
                text-align: center;
            }
            
            #token-embeddings, #output-values {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .token-box {
                padding: 10px;
                background: #e3f2fd;
                border-radius: 4px;
                text-align: center;
                min-width: 60px;
            }
            
            .token-label {
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .token-vector {
                font-size: 12px;
                font-family: monospace;
            }
            
            .multi-head-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .head-selector {
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .head-selector label {
                display: block;
                margin-bottom: 10px;
                font-weight: bold;
            }
            
            #head-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .head-btn {
                padding: 8px 16px;
                border: 2px solid ${CONFIG.COLORS.primary};
                background: white;
                color: ${CONFIG.COLORS.primary};
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .head-btn.active {
                background: ${CONFIG.COLORS.primary};
                color: white;
            }
            
            .head-btn:hover {
                background: #e3f2fd;
            }
            
            .head-btn.active:hover {
                background: #2980b9;
            }
            
            .multi-head-overview {
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            #all-heads-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .mini-head-viz {
                text-align: center;
            }
            
            .mini-head-viz h6 {
                margin: 0 0 5px 0;
                color: #34495e;
                font-size: 14px;
            }
            
            #selected-head-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .attention-comparison {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                justify-items: center;
            }
            
            .attention-comparison > div {
                text-align: center;
            }
            
            .concat-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                text-align: center;
            }
            
            .encoding-addition {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .plus-sign, .equals-sign {
                font-size: 24px;
                font-weight: bold;
                color: #333;
            }
            
            #position-vectors-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }
            
            .position-vector-box {
                background: white;
                padding: 10px;
                border-radius: 4px;
                border: 1px solid #ddd;
            }
            
            .position-vector-box h6 {
                margin: 0 0 10px 0;
                color: #34495e;
                font-size: 14px;
            }
            
            .position-pattern {
                display: flex;
                gap: 2px;
                margin-bottom: 5px;
            }
            
            .position-dim {
                width: 15px;
                height: 15px;
                border-radius: 2px;
                cursor: help;
            }
            
            .properties-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .property-box {
                background: #f0f0f0;
                padding: 15px;
                border-radius: 4px;
            }
            
            .property-box h5 {
                margin: 0 0 8px 0;
                color: ${CONFIG.COLORS.dark};
            }
            
            .property-box p {
                margin: 0;
                font-size: 14px;
                color: #666;
            }
            
            .encoding-formula {
                text-align: center;
                margin: 10px 0;
                font-family: 'Times New Roman', serif;
            }
            
            .encoding-formula p {
                margin: 5px 0;
            }
            
            @media (max-width: 768px) {
                .attention-layout {
                    flex-direction: column;
                }
                
                .attention-visualization {
                    min-width: auto;
                }
                
                .controls-panel {
                    width: 100%;
                }
                
                .qkv-matrices {
                    flex-direction: column;
                    align-items: center;
                }
                
                .attention-comparison {
                    grid-template-columns: 1fr;
                }
                
                #all-heads-grid {
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                }
                
                .encoding-addition {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .properties-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }
    
    trainingStyles() {
        return `
            .training-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-top: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .training-controls {
                margin-bottom: 20px;
            }
            
            .task-selector {
                margin-bottom: 15px;
            }
            
            .task-selector select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .task-description {
                margin-top: 5px;
                font-size: 14px;
                color: #666;
                font-style: italic;
            }
            
            .training-params {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .param-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                font-size: 14px;
            }
            
            .param-group input[type="range"] {
                width: calc(100% - 50px);
                margin-right: 10px;
            }
            
            .training-buttons {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .train-button, .reset-button {
                flex: 1;
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .train-button {
                background: #27ae60;
                color: white;
            }
            
            .train-button:hover:not(:disabled) {
                background: #229954;
            }
            
            .train-button:disabled {
                background: #95a5a6;
                cursor: not-allowed;
            }
            
            .reset-button {
                background: #e74c3c;
                color: white;
            }
            
            .reset-button:hover {
                background: #c0392b;
            }
            
            .training-progress {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                text-align: center;
            }
            
            .progress-bar {
                width: 100%;
                height: 20px;
                background: #ecf0f1;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            }
            
            .progress-fill {
                height: 100%;
                background: #3498db;
                width: 0%;
                transition: width 0.3s;
            }
            
            .training-visualization {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
            }
            
            .loss-chart, .attention-evolution {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
            }
            
            .evolution-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 10px;
                margin-top: 10px;
            }
            
            .evolution-snapshot {
                text-align: center;
            }
            
            .evolution-snapshot canvas {
                border: 1px solid #ddd;
                background: white;
            }
            
            .evolution-snapshot p {
                margin-top: 5px;
                font-size: 12px;
                color: #666;
            }
            
            .training-insights {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #2196f3;
            }
            
            .training-insights h4 {
                margin-top: 0;
                color: #1976d2;
            }
            
            #training-explanation {
                font-size: 14px;
                line-height: 1.6;
            }
            
            @media (max-width: 768px) {
                .training-params {
                    grid-template-columns: 1fr;
                }
                
                .training-visualization {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }
}

// Initialize the visualizer with training when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const visualizer = new AttentionVisualizer('transformer_demo');
    
    // Add training content after initialization
    if (visualizer.container && visualizer.trainer) {
        const trainingTab = document.getElementById('training-tab');
        if (trainingTab) {
            trainingTab.innerHTML = visualizer.trainer.createTrainingUI();
        }
    }
    
    // Make visualizer available globally for debugging
    window.attentionVisualizer = visualizer;
});