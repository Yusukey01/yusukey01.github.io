/**
 * Training Module for Attention Mechanism Visualizer
 * 
 * This module adds training capabilities to demonstrate how attention
 * patterns emerge through learning on simple tasks.
 */

class AttentionTrainer {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.learningRate = 0.01;
        this.epochs = 100;
        this.currentEpoch = 0;
        this.isTraining = false;
        this.trainingHistory = [];
        
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
        
        // Output projection for next word prediction
        this.Wo = MatrixUtils.initialize(dim, dim, 0.1);
        
        // Initialize gradients
        this.gradients = {
            Wq: null,
            Wk: null,
            Wv: null,
            Wo: null
        };
    }
    
    // Create training UI
    createTrainingUI() {
        const html = `
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
        
        return html;
    }
    
    // Add training styles
    getTrainingStyles() {
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
    
    // Training task implementations
    createNextWordTargets(tokens, embeddings) {
        // For next word prediction, create targets where each position
        // should attend to previous positions with decreasing weight
        const seqLen = tokens.length;
        const targets = [];
        
        for (let i = 0; i < seqLen; i++) {
            const targetRow = new Array(seqLen).fill(0);
            for (let j = 0; j <= i; j++) {
                // Exponentially decreasing attention to previous positions
                targetRow[j] = Math.exp(-(i - j) * 0.5);
            }
            // Normalize
            const sum = targetRow.reduce((a, b) => a + b, 0);
            targets.push(targetRow.map(v => v / sum));
        }
        
        return targets;
    }
    
    createCopyTargets(tokens, embeddings) {
        // For copy task, create diagonal attention pattern
        const seqLen = tokens.length;
        const targets = [];
        
        for (let i = 0; i < seqLen; i++) {
            const targetRow = new Array(seqLen).fill(0);
            targetRow[i] = 1.0; // Attend only to same position
            targets.push(targetRow);
        }
        
        return targets;
    }
    
    createSimilarityTargets(tokens, embeddings) {
        // For similarity task, create targets based on token similarity
        const seqLen = tokens.length;
        const targets = [];
        
        // Simple similarity: tokens with shared characters
        for (let i = 0; i < seqLen; i++) {
            const targetRow = new Array(seqLen).fill(0);
            for (let j = 0; j < seqLen; j++) {
                // Count shared characters
                const shared = this.countSharedChars(tokens[i], tokens[j]);
                targetRow[j] = shared / Math.max(tokens[i].length, tokens[j].length);
            }
            // Add self-attention bias
            targetRow[i] += 0.5;
            // Normalize
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
    
    // Loss functions
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
        const epsilon = 1e-7; // Small value to avoid log(0)
        
        for (let i = 0; i < predicted.length; i++) {
            for (let j = 0; j < predicted[i].length; j++) {
                loss -= target[i][j] * Math.log(predicted[i][j] + epsilon);
            }
        }
        return loss / predicted.length;
    }
    
    // Forward pass with current parameters
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
    
    // Backward pass (simplified gradient computation)
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
        
        // Simplified gradient updates for Q, K matrices
        // This is a very simplified version for demonstration
        for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
                // Update query weights to increase attention to target positions
                let gradQ = 0;
                let gradK = 0;
                
                for (let s = 0; s < seqLen; s++) {
                    for (let t = 0; t < seqLen; t++) {
                        const errorSignal = dWeights[s][t];
                        // Approximate gradients
                        gradQ += errorSignal * embeddings[s][i] * 0.1;
                        gradK += errorSignal * embeddings[t][i] * 0.1;
                    }
                }
                
                this.Wq[i][j] -= learningRate * gradQ;
                this.Wk[i][j] -= learningRate * gradK;
            }
        }
        
        // Keep V weights small random values for now
        // In a real implementation, we'd compute proper gradients
    }
    
    // Training loop
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
        
        this.visualizer.processAttention(); // Ensure we have tokens and embeddings
        const tokens = this.visualizer.state.tokens;
        const embeddings = this.visualizer.state.embeddings;
        
        // Create targets based on selected task
        const task = this.tasks[this.currentTask];
        const targets = task.createTargets(tokens, embeddings);
        
        // Capture initial attention pattern
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
            
            // Update attention visualization in main visualizer
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
        
        // Find min and max loss for scaling
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
        
        // Draw mini attention matrix
        this.drawMiniAttention(canvas, result.attentionWeights);
        
        const label = document.createElement('p');
        label.textContent = `Epoch ${epoch}`;
        
        snapshot.appendChild(canvas);
        snapshot.appendChild(label);
        
        if (epoch === 0) {
            grid.innerHTML = ''; // Clear previous snapshots
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
    }
}

// Integration with main visualizer
// Add this to the main visualizer's init method:
function integrateTraining(visualizer) {
    // Create trainer instance
    const trainer = new AttentionTrainer(visualizer);
    
    // Add training tab to the main interface
    const tabsContainer = document.querySelector('.visualization-tabs');
    const trainingTab = document.createElement('button');
    trainingTab.className = 'viz-tab';
    trainingTab.dataset.tab = 'training';
    trainingTab.textContent = 'Training';
    tabsContainer.appendChild(trainingTab);
    
    // Add training pane
    const vizContent = document.querySelector('.viz-content');
    const trainingPane = document.createElement('div');
    trainingPane.id = 'training-tab';
    trainingPane.className = 'viz-pane';
    trainingPane.innerHTML = trainer.createTrainingUI();
    vizContent.appendChild(trainingPane);
    
    // Add training styles
    const styleElement = document.createElement('style');
    styleElement.textContent = trainer.getTrainingStyles();
    document.head.appendChild(styleElement);
    
    // Update tab click handler in main visualizer
    const originalHandleTabClick = visualizer.handleTabClick.bind(visualizer);
    visualizer.handleTabClick = function(e) {
        originalHandleTabClick(e);
        if (e.target.dataset.tab === 'training') {
            trainer.attachEventListeners();
        }
    };
    
    return trainer;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AttentionTrainer, integrateTraining };
}