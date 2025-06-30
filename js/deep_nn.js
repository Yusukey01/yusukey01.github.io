// deep_nn.js - Interactive Transformer Demo
// This creates a complete transformer visualization when included in a page with a div#transformer_demo

(function() {
    'use strict';

    // Utility functions for matrix operations
    class MatrixUtils {
        static create(rows, cols, initializer = () => Math.random() * 0.02 - 0.01) {
            return Array(rows).fill(0).map(() => 
                Array(cols).fill(0).map(() => initializer())
            );
        }

        static multiply(A, B) {
            if (!A || !B || A[0].length !== B.length) {
                throw new Error('Invalid matrix dimensions for multiplication');
            }
            
            const result = [];
            for (let i = 0; i < A.length; i++) {
                result[i] = [];
                for (let j = 0; j < B[0].length; j++) {
                    let sum = 0;
                    for (let k = 0; k < B.length; k++) {
                        sum += A[i][k] * B[k][j];
                    }
                    result[i][j] = sum;
                }
            }
            return result;
        }

        static transpose(matrix) {
            const rows = matrix.length;
            const cols = matrix[0].length;
            const result = Array(cols).fill(0).map(() => Array(rows).fill(0));
            
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    result[j][i] = matrix[i][j];
                }
            }
            return result;
        }

        static add(A, B) {
            return A.map((row, i) => row.map((val, j) => val + B[i][j]));
        }

        static softmax(scores) {
            const maxScore = Math.max(...scores);
            const expScores = scores.map(s => Math.exp(s - maxScore));
            const sumExp = expScores.reduce((a, b) => a + b, 0);
            return expScores.map(s => s / sumExp);
        }
    }

    // Simple Transformer implementation
    class SimpleTransformer {
        constructor() {
            this.config = {
                vocabSize: 100,
                hiddenDim: 32,
                numHeads: 2,
                numLayers: 2,
                maxLength: 10
            };

            this.initVocabulary();
            this.initWeights();
        }

        initVocabulary() {
            // Simple vocabulary
            this.vocab = {
                '<PAD>': 0,
                '<START>': 1,
                '<END>': 2,
                '<UNK>': 3,
                'hello': 4,
                'world': 5,
                'the': 6,
                'cat': 7,
                'dog': 8,
                'is': 9,
                'happy': 10,
                'sad': 11,
                'big': 12,
                'small': 13,
                'red': 14,
                'blue': 15,
                'good': 16,
                'bad': 17,
                'day': 18,
                'night': 19,
                // French words
                'bonjour': 20,
                'monde': 21,
                'le': 22,
                'chat': 23,
                'chien': 24,
                'est': 25,
                'heureux': 26,
                'triste': 27,
                // Sentiment
                'positive': 30,
                'negative': 31,
                'neutral': 32
            };

            this.reverseVocab = {};
            for (const [word, idx] of Object.entries(this.vocab)) {
                this.reverseVocab[idx] = word;
            }

            this.translations = {
                'hello': 'bonjour',
                'world': 'monde',
                'the': 'le',
                'cat': 'chat',
                'dog': 'chien',
                'is': 'est',
                'happy': 'heureux',
                'sad': 'triste'
            };
        }

        initWeights() {
            const d = this.config.hiddenDim;
            
            // Embeddings
            this.embeddings = MatrixUtils.create(this.config.vocabSize, d);
            
            // Positional encoding
            this.posEncoding = this.createPositionalEncoding();
            
            // Simple attention weights
            this.Wq = MatrixUtils.create(d, d);
            this.Wk = MatrixUtils.create(d, d);
            this.Wv = MatrixUtils.create(d, d);
            this.Wo = MatrixUtils.create(d, d);
            
            // Output projection
            this.outputProj = MatrixUtils.create(d, this.config.vocabSize);
        }

        createPositionalEncoding() {
            const encoding = [];
            const d = this.config.hiddenDim;
            
            for (let pos = 0; pos < this.config.maxLength; pos++) {
                encoding[pos] = [];
                for (let i = 0; i < d; i++) {
                    const angle = pos / Math.pow(10000, 2 * Math.floor(i / 2) / d);
                    encoding[pos][i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
                }
            }
            return encoding;
        }

        tokenize(text) {
            const words = text.toLowerCase().trim().split(/\s+/);
            return words.map(w => this.vocab[w] || this.vocab['<UNK>']);
        }

        embed(tokens) {
            const embedded = tokens.map(t => [...this.embeddings[t]]);
            
            // Add positional encoding
            for (let i = 0; i < embedded.length && i < this.posEncoding.length; i++) {
                for (let j = 0; j < embedded[i].length; j++) {
                    embedded[i][j] += this.posEncoding[i][j] * 0.1;
                }
            }
            
            return embedded;
        }

        attention(Q, K, V) {
            const scores = MatrixUtils.multiply(Q, MatrixUtils.transpose(K));
            const d_k = K[0].length;
            
            // Scale scores
            for (let i = 0; i < scores.length; i++) {
                for (let j = 0; j < scores[i].length; j++) {
                    scores[i][j] /= Math.sqrt(d_k);
                }
            }
            
            // Apply softmax to each row
            const weights = scores.map(row => MatrixUtils.softmax(row));
            
            // Apply attention to values
            const output = MatrixUtils.multiply(weights, V);
            
            return { output, weights };
        }

        encode(tokens) {
            const steps = [];
            
            // Embedding
            let x = this.embed(tokens);
            steps.push({
                name: 'Input Embedding + Positional Encoding',
                data: x,
                description: 'Convert tokens to vectors and add position information'
            });
            
            // Simple self-attention
            const Q = MatrixUtils.multiply(x, this.Wq);
            const K = MatrixUtils.multiply(x, this.Wk);
            const V = MatrixUtils.multiply(x, this.Wv);
            
            const { output: attnOut, weights: attnWeights } = this.attention(Q, K, V);
            
            steps.push({
                name: 'Self-Attention',
                data: attnOut,
                weights: attnWeights,
                description: 'Tokens attend to each other'
            });
            
            // Output projection
            const encoded = MatrixUtils.multiply(attnOut, this.Wo);
            
            steps.push({
                name: 'Encoder Output',
                data: encoded,
                description: 'Final encoder representation'
            });
            
            return { output: encoded, steps };
        }

        translate(text) {
            const tokens = this.tokenize(text);
            const { output, steps } = this.encode(tokens);
            
            // Simple word-by-word translation
            const translated = tokens.map(t => {
                const word = this.reverseVocab[t];
                const trans = this.translations[word];
                return trans ? this.vocab[trans] : t;
            });
            
            return {
                input: tokens,
                output: translated,
                steps,
                type: 'translation'
            };
        }

        complete(text) {
            const tokens = this.tokenize(text);
            const { output, steps } = this.encode(tokens);
            
            // Simple completion
            const completions = ['is', 'great', 'today'];
            const completed = completions.map(w => ({
                token: this.vocab[w] || this.vocab['<UNK>'],
                prob: 0.7 + Math.random() * 0.3
            }));
            
            return {
                input: tokens,
                output: completed,
                steps,
                type: 'completion'
            };
        }

        analyzeSentiment(text) {
            const tokens = this.tokenize(text);
            const { output, steps } = this.encode(tokens);
            
            // Simple sentiment
            const positiveWords = ['happy', 'good', 'great'];
            const negativeWords = ['sad', 'bad', 'terrible'];
            
            let sentiment = 'neutral';
            let score = 0.5;
            
            tokens.forEach(t => {
                const word = this.reverseVocab[t];
                if (positiveWords.includes(word)) {
                    sentiment = 'positive';
                    score = 0.8;
                } else if (negativeWords.includes(word)) {
                    sentiment = 'negative';
                    score = 0.2;
                }
            });
            
            return {
                input: tokens,
                output: [{
                    token: this.vocab[sentiment],
                    prob: score
                }],
                steps,
                sentiment,
                score,
                type: 'sentiment'
            };
        }
    }

    // Main Visualizer class
    class TransformerVisualizer {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) {
                console.error('Container not found:', containerId);
                return;
            }

            this.transformer = new SimpleTransformer();
            this.currentStep = 0;
            this.steps = [];
            
            this.init();
        }

        init() {
            this.container.innerHTML = this.createHTML();
            this.addStyles();
            this.setupElements();
            this.attachListeners();
            this.drawArchitecture();
        }

        createHTML() {
            return `
                <div class="tf-demo">
                    <div class="tf-header">
                        <h3>Interactive Transformer Demo</h3>
                        <p>See how Transformers process text step by step</p>
                    </div>
                    
                    <div class="tf-content">
                        <div class="tf-controls">
                            <div class="tf-section">
                                <h4>Task</h4>
                                <select id="tf-task">
                                    <option value="translation">Translation (EN→FR)</option>
                                    <option value="completion">Text Completion</option>
                                    <option value="sentiment">Sentiment Analysis</option>
                                </select>
                            </div>
                            
                            <div class="tf-section">
                                <h4>Input</h4>
                                <input type="text" id="tf-input" value="hello world" />
                                <button id="tf-process">Process</button>
                            </div>
                            
                            <div class="tf-section">
                                <h4>Model Info</h4>
                                <div class="tf-stats">
                                    <div>Layers: 2</div>
                                    <div>Heads: 2</div>
                                    <div>Dim: 32</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tf-viz">
                            <div class="tf-tabs">
                                <button class="tf-tab active" data-tab="arch">Architecture</button>
                                <button class="tf-tab" data-tab="flow">Data Flow</button>
                                <button class="tf-tab" data-tab="attn">Attention</button>
                                <button class="tf-tab" data-tab="output">Output</button>
                            </div>
                            
                            <div class="tf-panels">
                                <div class="tf-panel active" id="tf-arch">
                                    <canvas id="tf-arch-canvas" width="600" height="400"></canvas>
                                </div>
                                
                                <div class="tf-panel" id="tf-flow">
                                    <div id="tf-flow-content"></div>
                                </div>
                                
                                <div class="tf-panel" id="tf-attn">
                                    <canvas id="tf-attn-canvas" width="400" height="400"></canvas>
                                </div>
                                
                                <div class="tf-panel" id="tf-output">
                                    <div class="tf-tokens">
                                        <h4>Input Tokens</h4>
                                        <div id="tf-input-tokens"></div>
                                    </div>
                                    <div class="tf-tokens">
                                        <h4>Output</h4>
                                        <div id="tf-output-tokens"></div>
                                    </div>
                                    <div class="tf-result">
                                        <h4>Result</h4>
                                        <div id="tf-result"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tf-playback">
                        <button id="tf-prev">←</button>
                        <button id="tf-play">Play</button>
                        <button id="tf-next">→</button>
                        <span id="tf-step-info">Step 0 / 0</span>
                    </div>
                </div>
            `;
        }

        addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .tf-demo {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .tf-header {
                    text-align: center;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                
                .tf-header h3 {
                    margin: 0 0 10px 0;
                    color: #333;
                }
                
                .tf-header p {
                    margin: 0;
                    color: #666;
                }
                
                .tf-content {
                    display: grid;
                    grid-template-columns: 250px 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                
                .tf-controls {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .tf-section {
                    margin-bottom: 20px;
                }
                
                .tf-section h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                }
                
                .tf-section input,
                .tf-section select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-bottom: 10px;
                }
                
                .tf-section button {
                    width: 100%;
                    padding: 10px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .tf-section button:hover {
                    background: #0056b3;
                }
                
                .tf-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    font-size: 14px;
                }
                
                .tf-stats div {
                    padding: 5px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    text-align: center;
                }
                
                .tf-viz {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .tf-tabs {
                    display: flex;
                    background: #f8f9fa;
                    border-bottom: 1px solid #ddd;
                }
                
                .tf-tab {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 14px;
                    color: #666;
                }
                
                .tf-tab.active {
                    color: #007bff;
                    border-bottom: 2px solid #007bff;
                }
                
                .tf-panels {
                    padding: 20px;
                    min-height: 400px;
                }
                
                .tf-panel {
                    display: none;
                }
                
                .tf-panel.active {
                    display: block;
                }
                
                #tf-arch-canvas,
                #tf-attn-canvas {
                    border: 1px solid #eee;
                    display: block;
                    margin: 0 auto;
                }
                
                .tf-flow-step {
                    background: #f8f9fa;
                    padding: 15px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    border: 2px solid transparent;
                }
                
                .tf-flow-step.active {
                    border-color: #007bff;
                }
                
                .tf-flow-step h5 {
                    margin: 0 0 10px 0;
                    color: #333;
                }
                
                .tf-flow-step p {
                    margin: 0;
                    color: #666;
                    font-size: 14px;
                }
                
                .tf-tokens {
                    margin-bottom: 20px;
                }
                
                .tf-tokens h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                }
                
                .tf-token {
                    display: inline-block;
                    padding: 5px 10px;
                    margin: 5px;
                    background: #e9ecef;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 14px;
                }
                
                .tf-token.highlight {
                    background: #007bff;
                    color: white;
                }
                
                .tf-result {
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    font-size: 18px;
                    text-align: center;
                }
                
                .tf-playback {
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    text-align: center;
                }
                
                .tf-playback button {
                    padding: 8px 16px;
                    margin: 0 5px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .tf-playback button:hover {
                    background: #f8f9fa;
                }
                
                #tf-step-info {
                    margin-left: 20px;
                    color: #666;
                }
                
                @media (max-width: 768px) {
                    .tf-content {
                        grid-template-columns: 1fr;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        setupElements() {
            this.elements = {
                task: document.getElementById('tf-task'),
                input: document.getElementById('tf-input'),
                process: document.getElementById('tf-process'),
                tabs: document.querySelectorAll('.tf-tab'),
                panels: document.querySelectorAll('.tf-panel'),
                archCanvas: document.getElementById('tf-arch-canvas'),
                attnCanvas: document.getElementById('tf-attn-canvas'),
                flowContent: document.getElementById('tf-flow-content'),
                inputTokens: document.getElementById('tf-input-tokens'),
                outputTokens: document.getElementById('tf-output-tokens'),
                result: document.getElementById('tf-result'),
                prev: document.getElementById('tf-prev'),
                play: document.getElementById('tf-play'),
                next: document.getElementById('tf-next'),
                stepInfo: document.getElementById('tf-step-info')
            };
        }

        attachListeners() {
            this.elements.process.addEventListener('click', () => this.process());
            
            this.elements.tabs.forEach(tab => {
                tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
            });
            
            this.elements.prev.addEventListener('click', () => this.prevStep());
            this.elements.next.addEventListener('click', () => this.nextStep());
            this.elements.play.addEventListener('click', () => this.togglePlay());
            
            this.elements.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.process();
            });
        }

        switchTab(tabName) {
            this.elements.tabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            this.elements.panels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `tf-${tabName}`);
            });
            
            if (tabName === 'attn' && this.attentionWeights) {
                this.drawAttention();
            }
        }

        process() {
            const task = this.elements.task.value;
            const text = this.elements.input.value.trim();
            
            if (!text) return;
            
            let result;
            switch (task) {
                case 'translation':
                    result = this.transformer.translate(text);
                    break;
                case 'completion':
                    result = this.transformer.complete(text);
                    break;
                case 'sentiment':
                    result = this.transformer.analyzeSentiment(text);
                    break;
            }
            
            this.displayResult(result);
            this.steps = result.steps || [];
            this.currentStep = 0;
            this.updateStepDisplay();
        }

        displayResult(result) {
            // Input tokens
            this.elements.inputTokens.innerHTML = '';
            result.input.forEach(tokenId => {
                const token = document.createElement('div');
                token.className = 'tf-token';
                token.textContent = this.transformer.reverseVocab[tokenId] || `[${tokenId}]`;
                this.elements.inputTokens.appendChild(token);
            });
            
            // Output tokens
            this.elements.outputTokens.innerHTML = '';
            if (result.type === 'translation') {
                result.output.forEach(tokenId => {
                    const token = document.createElement('div');
                    token.className = 'tf-token highlight';
                    token.textContent = this.transformer.reverseVocab[tokenId] || `[${tokenId}]`;
                    this.elements.outputTokens.appendChild(token);
                });
            } else {
                result.output.forEach(item => {
                    const token = document.createElement('div');
                    token.className = 'tf-token highlight';
                    token.textContent = this.transformer.reverseVocab[item.token] || `[${item.token}]`;
                    if (item.prob) {
                        token.textContent += ` (${Math.round(item.prob * 100)}%)`;
                    }
                    this.elements.outputTokens.appendChild(token);
                });
            }
            
            // Final result
            let finalText = '';
            switch (result.type) {
                case 'translation':
                    finalText = result.output.map(t => 
                        this.transformer.reverseVocab[t] || ''
                    ).join(' ');
                    break;
                case 'completion':
                    const input = result.input.map(t => 
                        this.transformer.reverseVocab[t] || ''
                    ).join(' ');
                    const completion = result.output.map(item => 
                        this.transformer.reverseVocab[item.token] || ''
                    ).join(' ');
                    finalText = `${input} ${completion}`;
                    break;
                case 'sentiment':
                    finalText = `Sentiment: ${result.sentiment} (${Math.round(result.score * 100)}%)`;
                    break;
            }
            this.elements.result.textContent = finalText;
            
            // Update flow
            this.updateFlowDisplay(result.steps);
            
            // Store attention weights if available
            const attnStep = result.steps.find(s => s.weights);
            if (attnStep) {
                this.attentionWeights = attnStep.weights;
            }
        }

        updateFlowDisplay(steps) {
            this.elements.flowContent.innerHTML = '';
            
            steps.forEach((step, i) => {
                const div = document.createElement('div');
                div.className = 'tf-flow-step';
                div.innerHTML = `
                    <h5>${step.name}</h5>
                    <p>${step.description}</p>
                `;
                this.elements.flowContent.appendChild(div);
            });
        }

        updateStepDisplay() {
            this.elements.stepInfo.textContent = `Step ${this.currentStep + 1} / ${this.steps.length}`;
            
            document.querySelectorAll('.tf-flow-step').forEach((el, i) => {
                el.classList.toggle('active', i === this.currentStep);
            });
        }

        prevStep() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.updateStepDisplay();
            }
        }

        nextStep() {
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.updateStepDisplay();
            }
        }

        togglePlay() {
            // Simple play functionality
            if (this.playing) {
                this.playing = false;
                this.elements.play.textContent = 'Play';
                clearInterval(this.playInterval);
            } else {
                this.playing = true;
                this.elements.play.textContent = 'Pause';
                this.playInterval = setInterval(() => {
                    if (this.currentStep < this.steps.length - 1) {
                        this.nextStep();
                    } else {
                        this.togglePlay();
                    }
                }, 1500);
            }
        }

        drawArchitecture() {
            const ctx = this.elements.archCanvas.getContext('2d');
            const w = this.elements.archCanvas.width;
            const h = this.elements.archCanvas.height;
            
            ctx.clearRect(0, 0, w, h);
            
            // Simple architecture diagram
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            
            // Input
            this.drawBox(ctx, w/2 - 50, 30, 100, 30, 'Input', '#3498db');
            this.drawArrow(ctx, w/2, 60, w/2, 90);
            
            // Embedding
            this.drawBox(ctx, w/2 - 50, 90, 100, 30, 'Embedding', '#e74c3c');
            this.drawArrow(ctx, w/2, 120, w/2, 150);
            
            // Encoder
            ctx.strokeStyle = '#333';
            ctx.strokeRect(w/2 - 80, 150, 160, 100);
            ctx.fillStyle = '#333';
            ctx.fillText('Encoder', w/2, 145);
            
            this.drawBox(ctx, w/2 - 60, 170, 120, 25, 'Self-Attention', '#3498db');
            this.drawBox(ctx, w/2 - 60, 205, 120, 25, 'Feed Forward', '#2ecc71');
            
            this.drawArrow(ctx, w/2, 250, w/2, 280);
            
            // Output
            this.drawBox(ctx, w/2 - 50, 280, 100, 30, 'Output', '#9b59b6');
        }

        drawBox(ctx, x, y, w, h, text, color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = 'white';
            ctx.fillText(text, x + w/2, y + h/2 + 5);
        }

        drawArrow(ctx, x1, y1, x2, y2) {
            ctx.strokeStyle = '#666';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(x2 - 5, y2 - 5);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2 + 5, y2 - 5);
            ctx.stroke();
        }

        drawAttention() {
            if (!this.attentionWeights) return;
            
            const ctx = this.elements.attnCanvas.getContext('2d');
            const w = this.elements.attnCanvas.width;
            const h = this.elements.attnCanvas.height;
            
            ctx.clearRect(0, 0, w, h);
            
            const weights = this.attentionWeights;
            const size = weights.length;
            const cellSize = Math.min(w, h) / size;
            
            // Draw heatmap
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const value = weights[i][j];
                    const intensity = Math.floor(255 * (1 - value));
                    ctx.fillStyle = `rgb(${intensity}, ${intensity}, 255)`;
                    ctx.fillRect(j * cellSize, i * cellSize, cellSize - 1, cellSize - 1);
                }
            }
            
            // Add labels if space permits
            if (cellSize > 20) {
                ctx.fillStyle = '#333';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                
                for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                        const value = weights[i][j];
                        ctx.fillStyle = value > 0.5 ? 'white' : 'black';
                        ctx.fillText(value.toFixed(2), j * cellSize + cellSize/2, i * cellSize + cellSize/2 + 4);
                    }
                }
            }
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        const container = document.getElementById('transformer_demo');
        if (container) {
            new TransformerVisualizer('transformer_demo');
        }
    }
})();