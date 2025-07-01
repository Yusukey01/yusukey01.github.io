// deep_nn.js - Interactive Transformer Architecture Demo

class TransformerDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.vocab = ['<PAD>', '<START>', '<END>', 'the', 'cat', 'sat', 'on', 'mat', 'dog', 'runs', 'fast', 'is', 'a', 'big', 'small', 'red', 'blue', 'green', 'happy', 'sad', 'quick', 'slow', 'jumps', 'sleeps', 'eats', 'drinks', 'plays', 'walks', 'talks', 'thinks'];
        this.hiddenDim = 64;
        this.numHeads = 4;
        this.numLayers = 2;
        this.maxLength = 10;
        
        this.currentView = 'architecture';
        this.currentStep = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1000;
        
        this.processingSteps = [];
        this.attentionWeights = [];
        
        this.init();
    }
    
    init() {
        this.container.innerHTML = `
            <div class="transformer-demo">
                <div class="demo-header">
                    <h3>Interactive Transformer Demo</h3>
                    <div class="input-section">
                        <input type="text" id="transformer-input" placeholder="Enter text (e.g., 'the cat')" value="the cat">
                        <button id="process-btn">Process Text</button>
                    </div>
                </div>
                
                <div class="view-tabs">
                    <button class="view-tab active" data-view="architecture">Architecture</button>
                    <button class="view-tab" data-view="dataflow">Data Flow</button>
                    <button class="view-tab" data-view="attention">Attention Patterns</button>
                    <button class="view-tab" data-view="output">Output Generation</button>
                </div>
                
                <div class="playback-controls">
                    <button id="play-btn">▶️ Play</button>
                    <button id="step-btn">Step ➡️</button>
                    <button id="reset-btn">Reset</button>
                    <input type="range" id="step-slider" min="0" max="100" value="0">
                    <span id="step-info">Step: 0/0</span>
                </div>
                
                <div class="demo-content">
                    <div id="architecture-view" class="view-content active">
                        <svg id="transformer-svg" width="800" height="600"></svg>
                    </div>
                    <div id="dataflow-view" class="view-content">
                        <div class="dataflow-container"></div>
                    </div>
                    <div id="attention-view" class="view-content">
                        <div class="attention-container"></div>
                    </div>
                    <div id="output-view" class="view-content">
                        <div class="output-container"></div>
                    </div>
                </div>
                
                <div class="info-panel">
                    <h4>Current Step</h4>
                    <p id="step-description">Click "Process Text" to begin</p>
                </div>
            </div>
        `;
        
        this.setupStyles();
        this.setupEventListeners();
        this.drawArchitecture();
    }
    
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .transformer-demo {
                max-width: 1000px;
                margin: 0 auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .demo-header {
                background: #2c3e50;
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
            }
            
            .input-section {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            #transformer-input {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 5px;
                font-size: 16px;
            }
            
            #process-btn {
                padding: 10px 20px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                transition: background 0.3s;
            }
            
            #process-btn:hover {
                background: #2980b9;
            }
            
            .view-tabs {
                display: flex;
                background: #34495e;
            }
            
            .view-tab {
                flex: 1;
                padding: 15px;
                background: none;
                border: none;
                color: #bdc3c7;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s;
            }
            
            .view-tab.active {
                background: #fff;
                color: #2c3e50;
            }
            
            .playback-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 15px;
                background: #ecf0f1;
                border-bottom: 1px solid #bdc3c7;
            }
            
            .playback-controls button {
                padding: 8px 15px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .playback-controls button:hover {
                background: #2980b9;
            }
            
            #step-slider {
                flex: 1;
                margin: 0 10px;
            }
            
            .demo-content {
                min-height: 600px;
                background: white;
                position: relative;
            }
            
            .view-content {
                display: none;
                padding: 20px;
            }
            
            .view-content.active {
                display: block;
            }
            
            .info-panel {
                background: #ecf0f1;
                padding: 20px;
                border-radius: 0 0 10px 10px;
            }
            
            .info-panel h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
            }
            
            #step-description {
                margin: 0;
                color: #555;
            }
            
            /* Architecture SVG styles */
            .component-box {
                fill: #3498db;
                stroke: #2980b9;
                stroke-width: 2;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .component-box:hover {
                fill: #2980b9;
            }
            
            .component-box.active {
                fill: #e74c3c;
                stroke: #c0392b;
            }
            
            .component-text {
                fill: white;
                font-size: 14px;
                text-anchor: middle;
                pointer-events: none;
            }
            
            .connection-line {
                stroke: #34495e;
                stroke-width: 2;
                fill: none;
                marker-end: url(#arrowhead);
            }
            
            .connection-line.active {
                stroke: #e74c3c;
                stroke-width: 3;
            }
            
            /* Data flow styles */
            .tensor-view {
                background: #f8f9fa;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
            }
            
            .tensor-shape {
                font-family: monospace;
                color: #495057;
                margin-bottom: 10px;
            }
            
            .tensor-preview {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
                gap: 5px;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .tensor-value {
                background: #e9ecef;
                padding: 5px;
                text-align: center;
                border-radius: 3px;
                font-size: 12px;
                font-family: monospace;
            }
            
            /* Attention heatmap styles */
            .attention-heatmap {
                display: inline-block;
                margin: 10px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                overflow: hidden;
            }
            
            .attention-cell {
                width: 40px;
                height: 40px;
                display: inline-block;
                text-align: center;
                line-height: 40px;
                font-size: 12px;
                transition: all 0.3s;
            }
            
            .attention-label {
                background: #f8f9fa;
                font-weight: bold;
            }
            
            /* Output generation styles */
            .token-generation {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin: 20px 0;
            }
            
            .token-box {
                background: #f8f9fa;
                border: 2px solid #dee2e6;
                border-radius: 5px;
                padding: 10px;
                min-width: 80px;
                text-align: center;
            }
            
            .token-box.generated {
                background: #d4edda;
                border-color: #28a745;
            }
            
            .token-prob {
                font-size: 12px;
                color: #6c757d;
                margin-top: 5px;
            }
            
            .probability-chart {
                margin: 20px 0;
            }
            
            .prob-bar {
                display: flex;
                align-items: center;
                margin: 5px 0;
            }
            
            .prob-label {
                width: 100px;
                font-size: 14px;
            }
            
            .prob-value {
                flex: 1;
                height: 20px;
                background: #e9ecef;
                border-radius: 3px;
                position: relative;
                overflow: hidden;
            }
            
            .prob-fill {
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                background: #3498db;
                transition: width 0.3s;
            }
            
            .prob-percent {
                margin-left: 10px;
                font-size: 12px;
                color: #6c757d;
                width: 50px;
                text-align: right;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        document.getElementById('process-btn').addEventListener('click', () => this.processText());
        document.getElementById('play-btn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('step-btn').addEventListener('click', () => this.stepForward());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        document.getElementById('step-slider').addEventListener('input', (e) => this.goToStep(e.target.value));
        
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
    }
    
    drawArchitecture() {
        const svg = document.getElementById('transformer-svg');
        svg.innerHTML = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#34495e" />
                </marker>
            </defs>
            
            <!-- Input -->
            <rect class="component-box" id="input-embed" x="350" y="500" width="100" height="40" rx="5" />
            <text class="component-text" x="400" y="525">Input Embed</text>
            
            <rect class="component-box" id="pos-encoding" x="350" y="440" width="100" height="40" rx="5" />
            <text class="component-text" x="400" y="465">Pos Encoding</text>
            
            <!-- Encoder Stack -->
            <g id="encoder-stack">
                <rect x="250" y="120" width="300" height="300" fill="none" stroke="#7f8c8d" stroke-width="2" stroke-dasharray="5,5" rx="10" />
                <text x="400" y="110" text-anchor="middle" font-size="16" font-weight="bold" fill="#2c3e50">Encoder</text>
                
                <!-- Layer 1 -->
                <rect class="component-box" id="enc-self-attn-1" x="300" y="350" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="375">Multi-Head Attention</text>
                
                <rect class="component-box" id="enc-norm-1" x="300" y="290" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="315">Layer Norm</text>
                
                <rect class="component-box" id="enc-ff-1" x="300" y="230" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="255">Feed Forward</text>
                
                <rect class="component-box" id="enc-norm-2" x="300" y="170" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="195">Layer Norm</text>
                
                <!-- Layer 2 (simplified) -->
                <rect class="component-box" id="enc-layer-2" x="300" y="130" width="200" height="30" rx="5" />
                <text class="component-text" x="400" y="150">Encoder Layer 2</text>
            </g>
            
            <!-- Output -->
            <rect class="component-box" id="output" x="350" y="50" width="100" height="40" rx="5" />
            <text class="component-text" x="400" y="75">Output</text>
            
            <!-- Connections -->
            <line class="connection-line" x1="400" y1="500" x2="400" y2="480" />
            <line class="connection-line" x1="400" y1="440" x2="400" y2="390" />
            <line class="connection-line" x1="400" y1="350" x2="400" y2="330" />
            <line class="connection-line" x1="400" y1="290" x2="400" y2="270" />
            <line class="connection-line" x1="400" y1="230" x2="400" y2="210" />
            <line class="connection-line" x1="400" y1="170" x2="400" y2="160" />
            <line class="connection-line" x1="400" y1="130" x2="400" y2="90" />
            
            <!-- Skip connections -->
            <path class="connection-line" d="M 280 370 Q 250 310 280 310" stroke-dasharray="3,3" />
            <path class="connection-line" d="M 280 250 Q 250 190 280 190" stroke-dasharray="3,3" />
        `;
    }
    
    processText() {
        const input = document.getElementById('transformer-input').value.trim();
        if (!input) return;
        
        this.reset();
        
        // Tokenize input
        const tokens = this.tokenize(input);
        
        // Initialize processing steps
        this.initializeProcessingSteps(tokens);
        
        // Start visualization
        this.currentStep = 0;
        this.updateVisualization();
        
        // Switch to data flow view
        this.switchView('dataflow');
    }
    
    tokenize(text) {
        const words = text.toLowerCase().split(/\s+/);
        const tokens = ['<START>'];
        
        for (const word of words) {
            if (this.vocab.includes(word)) {
                tokens.push(word);
            } else {
                // For unknown words, use the first matching vocab word or '<PAD>'
                tokens.push('<PAD>');
            }
        }
        
        tokens.push('<END>');
        return tokens;
    }
    
    initializeProcessingSteps(tokens) {
        this.processingSteps = [];
        
        // Step 1: Input Embedding
        const embeddings = this.generateEmbeddings(tokens);
        this.processingSteps.push({
            name: 'Input Embedding',
            description: `Converting tokens "${tokens.join(' ')}" to ${this.hiddenDim}-dimensional embeddings`,
            component: 'input-embed',
            data: embeddings,
            shape: `[${tokens.length}, ${this.hiddenDim}]`
        });
        
        // Step 2: Positional Encoding
        const posEncoded = this.addPositionalEncoding(embeddings);
        this.processingSteps.push({
            name: 'Positional Encoding',
            description: 'Adding sinusoidal position information to embeddings',
            component: 'pos-encoding',
            data: posEncoded,
            shape: `[${tokens.length}, ${this.hiddenDim}]`
        });
        
        // Step 3-6: Encoder Layers
        let encoderOutput = posEncoded;
        for (let layer = 0; layer < this.numLayers; layer++) {
            const layerSteps = this.processEncoderLayer(encoderOutput, tokens, layer);
            this.processingSteps.push(...layerSteps);
            encoderOutput = layerSteps[layerSteps.length - 1].data;
        }
        
        // Step 7: Output Generation
        const output = this.generateOutput(encoderOutput, tokens);
        this.processingSteps.push({
            name: 'Output Generation',
            description: 'Generating next token predictions from encoder output',
            component: 'output',
            data: output,
            shape: `[${tokens.length}, ${this.vocab.length}]`,
            tokens: tokens
        });
        
        // Update slider
        const slider = document.getElementById('step-slider');
        slider.max = this.processingSteps.length - 1;
    }
    
    generateEmbeddings(tokens) {
        return tokens.map(token => {
            const embedding = new Array(this.hiddenDim);
            const tokenIdx = this.vocab.indexOf(token);
            
            // Simple deterministic embedding based on token index
            for (let i = 0; i < this.hiddenDim; i++) {
                embedding[i] = Math.sin(tokenIdx * (i + 1) * 0.1) * 0.5;
            }
            
            return embedding;
        });
    }
    
    addPositionalEncoding(embeddings) {
        const encoded = [];
        const C = 10000;
        
        for (let pos = 0; pos < embeddings.length; pos++) {
            const posEncoding = [];
            
            for (let i = 0; i < this.hiddenDim; i++) {
                if (i % 2 === 0) {
                    posEncoding[i] = Math.sin(pos / Math.pow(C, i / this.hiddenDim));
                } else {
                    posEncoding[i] = Math.cos(pos / Math.pow(C, (i - 1) / this.hiddenDim));
                }
            }
            
            // Add to embeddings
            encoded[pos] = embeddings[pos].map((val, idx) => val + posEncoding[idx] * 0.1);
        }
        
        return encoded;
    }
    
    processEncoderLayer(input, tokens, layerNum) {
        const steps = [];
        
        // Multi-head attention
        const attention = this.multiHeadAttention(input, tokens);
        steps.push({
            name: `Multi-Head Attention (Layer ${layerNum + 1})`,
            description: `Computing self-attention with ${this.numHeads} heads`,
            component: layerNum === 0 ? 'enc-self-attn-1' : 'enc-layer-2',
            data: attention.output,
            shape: `[${tokens.length}, ${this.hiddenDim}]`,
            attentionWeights: attention.weights
        });
        
        // Add & Norm
        const norm1 = this.layerNorm(this.residualAdd(input, attention.output));
        steps.push({
            name: `Add & Norm (Layer ${layerNum + 1})`,
            description: 'Residual connection and layer normalization',
            component: layerNum === 0 ? 'enc-norm-1' : 'enc-layer-2',
            data: norm1,
            shape: `[${tokens.length}, ${this.hiddenDim}]`
        });
        
        // Feed-forward
        const ffOutput = this.feedForward(norm1);
        steps.push({
            name: `Feed Forward (Layer ${layerNum + 1})`,
            description: 'Position-wise feed-forward network',
            component: layerNum === 0 ? 'enc-ff-1' : 'enc-layer-2',
            data: ffOutput,
            shape: `[${tokens.length}, ${this.hiddenDim}]`
        });
        
        // Add & Norm
        const norm2 = this.layerNorm(this.residualAdd(norm1, ffOutput));
        steps.push({
            name: `Add & Norm 2 (Layer ${layerNum + 1})`,
            description: 'Second residual connection and layer normalization',
            component: layerNum === 0 ? 'enc-norm-2' : 'enc-layer-2',
            data: norm2,
            shape: `[${tokens.length}, ${this.hiddenDim}]`
        });
        
        return steps;
    }
    
    multiHeadAttention(input, tokens) {
        const seqLen = input.length;
        const headDim = this.hiddenDim / this.numHeads;
        const weights = [];
        const outputs = [];
        
        // Simulate attention for each head
        for (let h = 0; h < this.numHeads; h++) {
            const headWeights = [];
            
            for (let i = 0; i < seqLen; i++) {
                const row = [];
                for (let j = 0; j < seqLen; j++) {
                    // Simple attention score based on position distance
                    const score = Math.exp(-Math.abs(i - j) * 0.5) + Math.random() * 0.1;
                    row.push(score);
                }
                
                // Normalize
                const sum = row.reduce((a, b) => a + b, 0);
                headWeights.push(row.map(v => v / sum));
            }
            
            weights.push(headWeights);
        }
        
        // Combine outputs from all heads
        for (let i = 0; i < seqLen; i++) {
            const combined = new Array(this.hiddenDim).fill(0);
            
            for (let h = 0; h < this.numHeads; h++) {
                for (let j = 0; j < seqLen; j++) {
                    const weight = weights[h][i][j];
                    for (let d = 0; d < headDim; d++) {
                        combined[h * headDim + d] += input[j][h * headDim + d] * weight;
                    }
                }
            }
            
            outputs.push(combined);
        }
        
        return { output: outputs, weights: weights };
    }
    
    feedForward(input) {
        return input.map(vec => {
            // Simple 2-layer MLP
            const hidden = vec.map(v => Math.max(0, v * 2 + 0.1)); // ReLU
            return hidden.map(v => v * 0.5); // Linear projection
        });
    }
    
    residualAdd(input1, input2) {
        return input1.map((vec, i) => vec.map((val, j) => val + input2[i][j]));
    }
    
    layerNorm(input) {
        return input.map(vec => {
            const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
            const variance = vec.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vec.length;
            const std = Math.sqrt(variance + 1e-5);
            
            return vec.map(v => (v - mean) / std);
        });
    }
    
    generateOutput(encoderOutput, tokens) {
        // Generate vocabulary predictions for each position
        const output = [];
        
        for (let i = 0; i < encoderOutput.length; i++) {
            const logits = [];
            
            for (let v = 0; v < this.vocab.length; v++) {
                // Simple scoring based on encoder output
                let score = 0;
                for (let d = 0; d < this.hiddenDim; d++) {
                    score += encoderOutput[i][d] * Math.sin(v * d * 0.1);
                }
                logits.push(score);
            }
            
            // Apply softmax
            const maxLogit = Math.max(...logits);
            const expLogits = logits.map(l => Math.exp(l - maxLogit));
            const sumExp = expLogits.reduce((a, b) => a + b, 0);
            const probs = expLogits.map(e => e / sumExp);
            
            output.push(probs);
        }
        
        return output;
    }
    
    updateVisualization() {
        if (this.currentStep >= this.processingSteps.length) {
            this.isPlaying = false;
            document.getElementById('play-btn').textContent = '▶️ Play';
            return;
        }
        
        const step = this.processingSteps[this.currentStep];
        
        // Update step info
        document.getElementById('step-info').textContent = `Step: ${this.currentStep + 1}/${this.processingSteps.length}`;
        document.getElementById('step-description').textContent = step.description;
        document.getElementById('step-slider').value = this.currentStep;
        
        // Update architecture highlighting
        this.highlightComponent(step.component);
        
        // Update current view
        switch (this.currentView) {
            case 'dataflow':
                this.updateDataFlowView(step);
                break;
            case 'attention':
                this.updateAttentionView(step);
                break;
            case 'output':
                this.updateOutputView(step);
                break;
        }
        
        // Continue playback if playing
        if (this.isPlaying) {
            setTimeout(() => {
                this.currentStep++;
                this.updateVisualization();
            }, this.playbackSpeed);
        }
    }
    
    highlightComponent(componentId) {
        document.querySelectorAll('.component-box').forEach(box => {
            box.classList.remove('active');
        });
        
        document.querySelectorAll('.connection-line').forEach(line => {
            line.classList.remove('active');
        });
        
        if (componentId) {
            const component = document.getElementById(componentId);
            if (component) {
                component.classList.add('active');
            }
        }
    }
    
    updateDataFlowView(step) {
        const container = document.querySelector('.dataflow-container');
        container.innerHTML = `
            <h3>${step.name}</h3>
            <div class="tensor-view">
                <div class="tensor-shape">Shape: ${step.shape}</div>
                <div class="tensor-preview">
                    ${this.renderTensorPreview(step.data)}
                </div>
            </div>
        `;
    }
    
    renderTensorPreview(data) {
        if (!data || data.length === 0) return '';
        
        let html = '';
        const maxShow = 10;
        
        // Show first few values of first few vectors
        for (let i = 0; i < Math.min(data.length, 3); i++) {
            for (let j = 0; j < Math.min(data[i].length, maxShow); j++) {
                const value = data[i][j].toFixed(3);
                html += `<div class="tensor-value">${value}</div>`;
            }
            if (data[i].length > maxShow) {
                html += `<div class="tensor-value">...</div>`;
            }
        }
        
        return html;
    }
    
    updateAttentionView(step) {
        const container = document.querySelector('.attention-container');
        
        if (!step.attentionWeights) {
            container.innerHTML = '<p>No attention weights for this step</p>';
            return;
        }
        
        const tokens = this.processingSteps.find(s => s.tokens).tokens;
        
        container.innerHTML = '<h3>Attention Patterns</h3>';
        
        // Show attention weights for each head
        step.attentionWeights.forEach((headWeights, h) => {
            const heatmap = document.createElement('div');
            heatmap.className = 'attention-heatmap';
            heatmap.innerHTML = `<h4>Head ${h + 1}</h4>`;
            
            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = `repeat(${tokens.length + 1}, 40px)`;
            
            // Add labels
            grid.innerHTML += '<div class="attention-cell attention-label"></div>';
            tokens.forEach(token => {
                grid.innerHTML += `<div class="attention-cell attention-label">${token.substring(0, 4)}</div>`;
            });
            
            // Add weights
            headWeights.forEach((row, i) => {
                grid.innerHTML += `<div class="attention-cell attention-label">${tokens[i].substring(0, 4)}</div>`;
                row.forEach(weight => {
                    const intensity = Math.floor(weight * 255);
                    const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                    grid.innerHTML += `<div class="attention-cell" style="background: ${color}; color: ${intensity < 128 ? 'black' : 'white'}">${weight.toFixed(2)}</div>`;
                });
            });
            
            heatmap.appendChild(grid);
            container.appendChild(heatmap);
        });
    }
    
    updateOutputView(step) {
        const container = document.querySelector('.output-container');
        
        if (!step.data || step.name !== 'Output Generation') {
            container.innerHTML = '<p>Output generation not yet reached</p>';
            return;
        }
        
        const tokens = step.tokens;
        const predictions = step.data;
        
        container.innerHTML = `
            <h3>Token Generation</h3>
            <div class="token-generation">
                ${tokens.map((token, i) => `
                    <div class="token-box ${i === tokens.length - 1 ? 'generated' : ''}">
                        <div>${token}</div>
                        ${i < tokens.length - 1 ? `<div class="token-prob">Input</div>` : ''}
                    </div>
                `).join('')}
            </div>
            
            <h3>Next Token Probabilities</h3>
            <div class="probability-chart">
                ${this.renderProbabilityChart(predictions[predictions.length - 2])}
            </div>
        `;
    }
    
    renderProbabilityChart(probs) {
        if (!probs) return '';
        
        // Get top 10 predictions
        const topIndices = probs
            .map((p, i) => ({ prob: p, idx: i }))
            .sort((a, b) => b.prob - a.prob)
            .slice(0, 10);
        
        return topIndices.map(({ prob, idx }) => `
            <div class="prob-bar">
                <div class="prob-label">${this.vocab[idx]}</div>
                <div class="prob-value">
                    <div class="prob-fill" style="width: ${prob * 100}%"></div>
                </div>
                <div class="prob-percent">${(prob * 100).toFixed(1)}%</div>
            </div>
        `).join('');
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Update tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });
        
        // Update content
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.toggle('active', content.id === `${view}-view`);
        });
        
        // Update visualization for current step
        if (this.processingSteps.length > 0) {
            this.updateVisualization();
        }
    }
    
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        document.getElementById('play-btn').textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Play';
        
        if (this.isPlaying) {
            if (this.currentStep >= this.processingSteps.length) {
                this.currentStep = 0;
            }
            this.updateVisualization();
        }
    }
    
    stepForward() {
        if (this.currentStep < this.processingSteps.length - 1) {
            this.currentStep++;
            this.updateVisualization();
        }
    }
    
    goToStep(step) {
        this.currentStep = parseInt(step);
        this.updateVisualization();
    }
    
    reset() {
        this.currentStep = 0;
        this.isPlaying = false;
        this.processingSteps = [];
        this.attentionWeights = [];
        
        document.getElementById('play-btn').textContent = '▶️ Play';
        document.getElementById('step-info').textContent = 'Step: 0/0';
        document.getElementById('step-description').textContent = 'Click "Process Text" to begin';
        document.getElementById('step-slider').value = 0;
        
        this.highlightComponent(null);
        
        // Clear all views
        document.querySelector('.dataflow-container').innerHTML = '';
        document.querySelector('.attention-container').innerHTML = '';
        document.querySelector('.output-container').innerHTML = '';
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transformer_demo')) {
        new TransformerDemo('transformer_demo');
    }
});