// deep_nn.js - Interactive Transformer Architecture Demo (Improved)

class TransformerDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }
        
        // Configuration
        this.config = {
            vocab: ['<PAD>', '<START>', '<END>', 'the', 'cat', 'sat', 'on', 'mat', 'dog', 'runs', 'fast', 'is', 'a', 'big', 'small', 'red', 'blue', 'green', 'happy', 'sad', 'quick', 'slow', 'jumps', 'sleeps', 'eats', 'drinks', 'plays', 'walks', 'talks', 'thinks'],
            hiddenDim: 64,
            numHeads: 4,
            numLayers: 2,
            maxLength: 10,
            playbackSpeed: 1000,
            posEncodingBase: 10000
        };
        
        // State
        this.state = {
            currentView: 'architecture',
            currentStep: 0,
            isPlaying: false,
            processingSteps: [],
            attentionWeights: []
        };
        
        // Event cleanup
        this.eventCleanup = [];
        
        // Prevent multiple style injections
        if (!document.getElementById('transformer-demo-styles')) {
            this.setupStyles();
        }
        
        this.init();
    }
    
    init() {
        try {
            this.container.innerHTML = this.getTemplate();
            this.setupEventListeners();
            this.drawArchitecture();
        } catch (error) {
            console.error('Error initializing TransformerDemo:', error);
            this.container.innerHTML = '<p style="color: red;">Error loading demo. Please refresh the page.</p>';
        }
    }
    
    getTemplate() {
        return `
            <div class="transformer-demo">
                <div class="demo-header">
                    <h3>Interactive Transformer Demo</h3>
                    <div class="input-section">
                        <input type="text" id="transformer-input" placeholder="Enter text (e.g., 'the cat')" value="the cat" maxlength="50">
                        <button id="process-btn" class="demo-button">Process Text</button>
                    </div>
                </div>
                
                <div class="view-tabs">
                    <button class="view-tab active" data-view="architecture">Architecture</button>
                    <button class="view-tab" data-view="dataflow">Data Flow</button>
                    <button class="view-tab" data-view="attention">Attention Patterns</button>
                    <button class="view-tab" data-view="output">Output Generation</button>
                </div>
                
                <div class="playback-controls">
                    <button id="play-btn" class="control-btn" title="Play/Pause">▶️ Play</button>
                    <button id="step-btn" class="control-btn" title="Step Forward">Step ➡️</button>
                    <button id="reset-btn" class="control-btn" title="Reset">Reset</button>
                    <input type="range" id="step-slider" min="0" max="100" value="0">
                    <span id="step-info">Step: 0/0</span>
                    <label for="speed-control" style="margin-left: 20px;">Speed:</label>
                    <select id="speed-control">
                        <option value="2000">0.5x</option>
                        <option value="1000" selected>1x</option>
                        <option value="500">2x</option>
                        <option value="250">4x</option>
                    </select>
                </div>
                
                <div class="demo-content">
                    <div id="architecture-view" class="view-content active">
                        <svg id="transformer-svg" width="800" height="600" viewBox="0 0 800 600"></svg>
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
                    <h4>Current Step: <span id="step-title">Ready</span></h4>
                    <p id="step-description">Click "Process Text" to begin the visualization</p>
                    <div id="step-details" class="step-details"></div>
                </div>
            </div>
        `;
    }
    
    setupStyles() {
        const style = document.createElement('style');
        style.id = 'transformer-demo-styles';
        style.textContent = `
            .transformer-demo {
                max-width: 1000px;
                margin: 0 auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border: 1px solid #e0e0e0;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .demo-header {
                background: #2c3e50;
                color: white;
                padding: 20px;
            }
            
            .demo-header h3 {
                margin: 0 0 15px 0;
                font-size: 24px;
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
                background: rgba(255,255,255,0.9);
            }
            
            .demo-button, .control-btn {
                padding: 10px 20px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.3s;
            }
            
            .demo-button:hover, .control-btn:hover {
                background: #2980b9;
                transform: translateY(-1px);
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            
            .demo-button:active, .control-btn:active {
                transform: translateY(0);
                box-shadow: none;
            }
            
            .demo-button:disabled, .control-btn:disabled {
                background: #95a5a6;
                cursor: not-allowed;
                transform: none;
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
                position: relative;
            }
            
            .view-tab:hover {
                background: rgba(255,255,255,0.1);
            }
            
            .view-tab.active {
                background: #fff;
                color: #2c3e50;
                font-weight: 600;
            }
            
            .view-tab.active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: #3498db;
            }
            
            .playback-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 15px;
                background: #ecf0f1;
                border-bottom: 1px solid #bdc3c7;
                flex-wrap: wrap;
            }
            
            .control-btn {
                padding: 8px 15px;
                font-size: 14px;
            }
            
            #step-slider {
                flex: 1;
                min-width: 200px;
                margin: 0 10px;
                cursor: pointer;
            }
            
            #speed-control {
                padding: 5px;
                border: 1px solid #bdc3c7;
                border-radius: 3px;
                background: white;
            }
            
            .demo-content {
                min-height: 600px;
                background: white;
                position: relative;
                overflow: auto;
            }
            
            .view-content {
                display: none;
                padding: 20px;
                animation: fadeIn 0.3s ease-in-out;
            }
            
            .view-content.active {
                display: block;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .info-panel {
                background: #ecf0f1;
                padding: 20px;
                border-top: 1px solid #bdc3c7;
            }
            
            .info-panel h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
            }
            
            #step-title {
                color: #3498db;
            }
            
            #step-description {
                margin: 0;
                color: #555;
                line-height: 1.6;
            }
            
            .step-details {
                margin-top: 15px;
                padding: 10px;
                background: rgba(52, 152, 219, 0.1);
                border-radius: 5px;
                font-family: monospace;
                font-size: 14px;
                display: none;
            }
            
            .step-details.active {
                display: block;
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
                filter: brightness(1.1);
            }
            
            .component-box.active {
                fill: #e74c3c;
                stroke: #c0392b;
                animation: pulse 1s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .component-text {
                fill: white;
                font-size: 14px;
                text-anchor: middle;
                pointer-events: none;
                font-weight: 500;
            }
            
            .connection-line {
                stroke: #34495e;
                stroke-width: 2;
                fill: none;
                marker-end: url(#arrowhead);
                transition: all 0.3s;
            }
            
            .connection-line.active {
                stroke: #e74c3c;
                stroke-width: 3;
                animation: flowAnimation 1s linear infinite;
            }
            
            @keyframes flowAnimation {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -20; }
            }
            
            /* Data flow styles */
            .tensor-view {
                background: #f8f9fa;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
                transition: all 0.3s;
            }
            
            .tensor-view:hover {
                border-color: #3498db;
                box-shadow: 0 2px 10px rgba(52, 152, 219, 0.2);
            }
            
            .tensor-shape {
                font-family: 'Courier New', monospace;
                color: #495057;
                margin-bottom: 10px;
                font-size: 16px;
                font-weight: bold;
            }
            
            .tensor-preview {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
                gap: 5px;
                max-height: 200px;
                overflow-y: auto;
                padding: 10px;
                background: white;
                border-radius: 5px;
            }
            
            .tensor-value {
                background: #e9ecef;
                padding: 8px;
                text-align: center;
                border-radius: 3px;
                font-size: 12px;
                font-family: monospace;
                transition: all 0.2s;
            }
            
            .tensor-value:hover {
                background: #dee2e6;
                transform: scale(1.05);
            }
            
            /* Attention heatmap styles */
            .attention-heatmap {
                display: inline-block;
                margin: 10px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                overflow: hidden;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .attention-heatmap h4 {
                margin: 0;
                padding: 10px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }
            
            .attention-grid {
                display: grid;
                padding: 5px;
                background: white;
            }
            
            .attention-cell {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-size: 11px;
                transition: all 0.3s;
                cursor: pointer;
                position: relative;
            }
            
            .attention-cell:hover {
                transform: scale(1.1);
                z-index: 10;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            
            .attention-label {
                background: #f8f9fa;
                font-weight: bold;
                font-size: 10px;
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
                padding: 15px;
                min-width: 100px;
                text-align: center;
                transition: all 0.3s;
            }
            
            .token-box:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            
            .token-box.generated {
                background: #d4edda;
                border-color: #28a745;
                animation: popIn 0.3s ease-in-out;
            }
            
            @keyframes popIn {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .token-value {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .token-prob {
                font-size: 12px;
                color: #6c757d;
                margin-top: 5px;
            }
            
            .probability-chart {
                margin: 20px 0;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            
            .probability-chart h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
            }
            
            .prob-bar {
                display: flex;
                align-items: center;
                margin: 8px 0;
                transition: all 0.2s;
            }
            
            .prob-bar:hover {
                transform: translateX(5px);
            }
            
            .prob-label {
                width: 120px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .prob-value {
                flex: 1;
                height: 24px;
                background: #e9ecef;
                border-radius: 12px;
                position: relative;
                overflow: hidden;
            }
            
            .prob-fill {
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                background: linear-gradient(to right, #3498db, #2980b9);
                transition: width 0.5s ease-in-out;
                border-radius: 12px;
            }
            
            .prob-percent {
                margin-left: 10px;
                font-size: 13px;
                color: #495057;
                width: 60px;
                text-align: right;
                font-weight: 600;
            }
            
            /* Loading and error states */
            .loading {
                text-align: center;
                padding: 40px;
                color: #6c757d;
            }
            
            .error {
                color: #e74c3c;
                background: #ffe5e5;
                padding: 15px;
                border-radius: 5px;
                margin: 10px;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .transformer-demo {
                    max-width: 100%;
                    margin: 0;
                    border-radius: 0;
                }
                
                #transformer-svg {
                    width: 100%;
                    height: auto;
                }
                
                .view-tab {
                    font-size: 12px;
                    padding: 10px 5px;
                }
                
                .playback-controls {
                    flex-wrap: wrap;
                }
                
                #step-slider {
                    width: 100%;
                    margin: 10px 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Process button
        const processBtn = document.getElementById('process-btn');
        const processFn = () => this.processText();
        processBtn.addEventListener('click', processFn);
        this.eventCleanup.push(() => processBtn.removeEventListener('click', processFn));
        
        // Enter key on input
        const input = document.getElementById('transformer-input');
        const enterFn = (e) => { if (e.key === 'Enter') this.processText(); };
        input.addEventListener('keypress', enterFn);
        this.eventCleanup.push(() => input.removeEventListener('keypress', enterFn));
        
        // Playback controls
        const playBtn = document.getElementById('play-btn');
        const playFn = () => this.togglePlayback();
        playBtn.addEventListener('click', playFn);
        this.eventCleanup.push(() => playBtn.removeEventListener('click', playFn));
        
        const stepBtn = document.getElementById('step-btn');
        const stepFn = () => this.stepForward();
        stepBtn.addEventListener('click', stepFn);
        this.eventCleanup.push(() => stepBtn.removeEventListener('click', stepFn));
        
        const resetBtn = document.getElementById('reset-btn');
        const resetFn = () => this.reset();
        resetBtn.addEventListener('click', resetFn);
        this.eventCleanup.push(() => resetBtn.removeEventListener('click', resetFn));
        
        // Slider
        const slider = document.getElementById('step-slider');
        const sliderFn = (e) => this.goToStep(parseInt(e.target.value));
        slider.addEventListener('input', sliderFn);
        this.eventCleanup.push(() => slider.removeEventListener('input', sliderFn));
        
        // Speed control
        const speedControl = document.getElementById('speed-control');
        const speedFn = (e) => { this.config.playbackSpeed = parseInt(e.target.value); };
        speedControl.addEventListener('change', speedFn);
        this.eventCleanup.push(() => speedControl.removeEventListener('change', speedFn));
        
        // View tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            const tabFn = (e) => this.switchView(e.target.dataset.view);
            tab.addEventListener('click', tabFn);
            this.eventCleanup.push(() => tab.removeEventListener('click', tabFn));
        });
    }
    
    drawArchitecture() {
        const svg = document.getElementById('transformer-svg');
        if (!svg) return;
        
        svg.innerHTML = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#34495e" />
                </marker>
                <linearGradient id="componentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#3498db;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2980b9;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Title -->
            <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#2c3e50">Transformer Architecture</text>
            
            <!-- Input -->
            <rect class="component-box" id="input-embed" x="350" y="520" width="100" height="40" rx="5" />
            <text class="component-text" x="400" y="545">Input Embed</text>
            
            <rect class="component-box" id="pos-encoding" x="350" y="460" width="100" height="40" rx="5" />
            <text class="component-text" x="400" y="485">Pos Encoding</text>
            
            <!-- Encoder Stack -->
            <g id="encoder-stack">
                <rect x="250" y="140" width="300" height="300" fill="none" stroke="#7f8c8d" stroke-width="2" stroke-dasharray="5,5" rx="10" />
                <text x="400" y="130" text-anchor="middle" font-size="16" font-weight="bold" fill="#2c3e50">Encoder Stack</text>
                
                <!-- Layer 1 -->
                <rect class="component-box" id="enc-self-attn-1" x="300" y="370" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="395">Multi-Head Attention</text>
                
                <rect class="component-box" id="enc-norm-1" x="300" y="310" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="335">Add & Layer Norm</text>
                
                <rect class="component-box" id="enc-ff-1" x="300" y="250" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="275">Feed Forward</text>
                
                <rect class="component-box" id="enc-norm-2" x="300" y="190" width="200" height="40" rx="5" />
                <text class="component-text" x="400" y="215">Add & Layer Norm</text>
                
                <!-- Layer 2 (simplified) -->
                <rect class="component-box" id="enc-layer-2" x="300" y="150" width="200" height="30" rx="5" />
                <text class="component-text" x="400" y="170">Encoder Layer 2</text>
            </g>
            
            <!-- Output -->
            <rect class="component-box" id="output" x="350" y="70" width="100" height="40" rx="5" />
            <text class="component-text" x="400" y="95">Output</text>
            
            <!-- Connections -->
            <line class="connection-line" id="conn-1" x1="400" y1="520" x2="400" y2="500" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-2" x1="400" y1="460" x2="400" y2="410" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-3" x1="400" y1="370" x2="400" y2="350" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-4" x1="400" y1="310" x2="400" y2="290" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-5" x1="400" y1="250" x2="400" y2="230" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-6" x1="400" y1="190" x2="400" y2="180" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-7" x1="400" y1="150" x2="400" y2="110" stroke-dasharray="5,5" />
            
            <!-- Skip connections -->
            <path class="connection-line" d="M 280 390 Q 250 330 280 330" stroke-dasharray="3,3" opacity="0.5" />
            <path class="connection-line" d="M 280 270 Q 250 210 280 210" stroke-dasharray="3,3" opacity="0.5" />
            
            <!-- Labels for skip connections -->
            <text x="240" y="360" font-size="12" fill="#7f8c8d" text-anchor="middle">residual</text>
            <text x="240" y="240" font-size="12" fill="#7f8c8d" text-anchor="middle">residual</text>
        `;
    }
    
    processText() {
        const input = document.getElementById('transformer-input').value.trim();
        if (!input) {
            this.showError('Please enter some text to process');
            return;
        }
        
        // Disable process button during processing
        const processBtn = document.getElementById('process-btn');
        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';
        
        try {
            this.reset();
            
            // Tokenize input
            const tokens = this.tokenize(input);
            
            // Initialize processing steps
            this.initializeProcessingSteps(tokens);
            
            // Start visualization
            this.state.currentStep = 0;
            this.updateVisualization();
            
            // Switch to data flow view
            this.switchView('dataflow');
            
            processBtn.textContent = 'Process Text';
            processBtn.disabled = false;
            
        } catch (error) {
            console.error('Error processing text:', error);
            this.showError('Error processing text. Please try again.');
            processBtn.textContent = 'Process Text';
            processBtn.disabled = false;
        }
    }
    
    tokenize(text) {
        const words = text.toLowerCase().split(/\s+/);
        const tokens = ['<START>'];
        
        for (const word of words) {
            if (this.config.vocab.includes(word)) {
                tokens.push(word);
            } else {
                // For unknown words, use '<PAD>' token
                tokens.push('<PAD>');
            }
        }
        
        tokens.push('<END>');
        
        // Limit sequence length
        if (tokens.length > this.config.maxLength) {
            tokens.splice(this.config.maxLength - 1, tokens.length - this.config.maxLength);
            tokens.push('<END>');
        }
        
        return tokens;
    }
    
    initializeProcessingSteps(tokens) {
        this.state.processingSteps = [];
        
        // Step 1: Input Embedding
        const embeddings = this.generateEmbeddings(tokens);
        this.state.processingSteps.push({
            name: 'Input Embedding',
            description: `Converting tokens "${tokens.join(' ')}" to ${this.config.hiddenDim}-dimensional embeddings`,
            component: 'input-embed',
            connection: 'conn-1',
            data: embeddings,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            tokens: tokens
        });
        
        // Step 2: Positional Encoding
        const posEncoded = this.addPositionalEncoding(embeddings);
        this.state.processingSteps.push({
            name: 'Positional Encoding',
            description: 'Adding sinusoidal position information to embeddings',
            component: 'pos-encoding',
            connection: 'conn-2',
            data: posEncoded,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            details: 'Using sine and cosine functions with different frequencies for each dimension'
        });
        
        // Step 3-6: Encoder Layers
        let encoderOutput = posEncoded;
        for (let layer = 0; layer < this.config.numLayers; layer++) {
            const layerSteps = this.processEncoderLayer(encoderOutput, tokens, layer);
            this.state.processingSteps.push(...layerSteps);
            encoderOutput = layerSteps[layerSteps.length - 1].data;
        }
        
        // Step 7: Output Generation
        const output = this.generateOutput(encoderOutput, tokens);
        this.state.processingSteps.push({
            name: 'Output Generation',
            description: 'Generating next token predictions from encoder output',
            component: 'output',
            connection: 'conn-7',
            data: output,
            shape: `[${tokens.length}, ${this.config.vocab.length}]`,
            tokens: tokens,
            details: 'Computing probability distribution over vocabulary for each position'
        });
        
        // Update slider
        const slider = document.getElementById('step-slider');
        slider.max = this.state.processingSteps.length - 1;
    }
    
    generateEmbeddings(tokens) {
        return tokens.map(token => {
            const embedding = new Array(this.config.hiddenDim);
            const tokenIdx = this.config.vocab.indexOf(token);
            
            // Simple deterministic embedding based on token index
            for (let i = 0; i < this.config.hiddenDim; i++) {
                embedding[i] = Math.sin(tokenIdx * (i + 1) * 0.1) * 0.5 + 
                               Math.cos(tokenIdx * (i + 1) * 0.05) * 0.3;
            }
            
            return embedding;
        });
    }
    
    addPositionalEncoding(embeddings) {
        const encoded = [];
        const C = this.config.posEncodingBase;
        
        for (let pos = 0; pos < embeddings.length; pos++) {
            const posEncoding = [];
            
            for (let i = 0; i < this.config.hiddenDim; i++) {
                if (i % 2 === 0) {
                    posEncoding[i] = Math.sin(pos / Math.pow(C, i / this.config.hiddenDim));
                } else {
                    posEncoding[i] = Math.cos(pos / Math.pow(C, (i - 1) / this.config.hiddenDim));
                }
            }
            
            // Add to embeddings
            encoded[pos] = embeddings[pos].map((val, idx) => val + posEncoding[idx] * 0.1);
        }
        
        return encoded;
    }
    
    processEncoderLayer(input, tokens, layerNum) {
        const steps = [];
        const connectionBase = layerNum === 0 ? 3 : 6;
        
        // Multi-head attention
        const attention = this.multiHeadAttention(input, tokens);
        steps.push({
            name: `Multi-Head Attention (Layer ${layerNum + 1})`,
            description: `Computing self-attention with ${this.config.numHeads} heads`,
            component: layerNum === 0 ? 'enc-self-attn-1' : 'enc-layer-2',
            connection: `conn-${connectionBase}`,
            data: attention.output,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            attentionWeights: attention.weights,
            details: `Each head attends to all positions with learned attention patterns`
        });
        
        // Add & Norm
        const norm1 = this.layerNorm(this.residualAdd(input, attention.output));
        steps.push({
            name: `Add & Norm (Layer ${layerNum + 1})`,
            description: 'Residual connection and layer normalization',
            component: layerNum === 0 ? 'enc-norm-1' : 'enc-layer-2',
            connection: `conn-${connectionBase + 1}`,
            data: norm1,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            details: 'Stabilizes training and enables gradient flow'
        });
        
        // Feed-forward
        const ffOutput = this.feedForward(norm1);
        steps.push({
            name: `Feed Forward (Layer ${layerNum + 1})`,
            description: 'Position-wise feed-forward network',
            component: layerNum === 0 ? 'enc-ff-1' : 'enc-layer-2',
            connection: `conn-${connectionBase + 2}`,
            data: ffOutput,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            details: 'Two linear transformations with ReLU activation'
        });
        
        // Add & Norm
        const norm2 = this.layerNorm(this.residualAdd(norm1, ffOutput));
        steps.push({
            name: `Add & Norm 2 (Layer ${layerNum + 1})`,
            description: 'Second residual connection and layer normalization',
            component: layerNum === 0 ? 'enc-norm-2' : 'enc-layer-2',
            connection: layerNum === 0 ? 'conn-6' : 'conn-7',
            data: norm2,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            details: 'Final output of encoder layer'
        });
        
        return steps;
    }
    
    multiHeadAttention(input, tokens) {
        const seqLen = input.length;
        const headDim = Math.floor(this.config.hiddenDim / this.config.numHeads);
        const weights = [];
        const outputs = [];
        
        // Simulate attention for each head
        for (let h = 0; h < this.config.numHeads; h++) {
            const headWeights = [];
            
            for (let i = 0; i < seqLen; i++) {
                const row = [];
                let sum = 0;
                
                // Calculate attention scores
                for (let j = 0; j < seqLen; j++) {
                    // Simple attention score based on position distance and randomness
                    const distance = Math.abs(i - j);
                    const score = Math.exp(-distance * 0.3) + Math.random() * 0.2;
                    row.push(score);
                    sum += score;
                }
                
                // Normalize to get attention weights
                headWeights.push(row.map(v => v / sum));
            }
            
            weights.push(headWeights);
        }
        
        // Combine outputs from all heads
        for (let i = 0; i < seqLen; i++) {
            const combined = new Array(this.config.hiddenDim).fill(0);
            
            for (let h = 0; h < this.config.numHeads; h++) {
                for (let j = 0; j < seqLen; j++) {
                    const weight = weights[h][i][j];
                    for (let d = 0; d < headDim; d++) {
                        const dimIdx = h * headDim + d;
                        if (dimIdx < this.config.hiddenDim) {
                            combined[dimIdx] += input[j][dimIdx] * weight;
                        }
                    }
                }
            }
            
            outputs.push(combined);
        }
        
        return { output: outputs, weights: weights };
    }
    
    feedForward(input) {
        const hiddenSize = this.config.hiddenDim * 4; // Typical expansion factor
        
        return input.map(vec => {
            // First linear layer with ReLU
            const hidden = vec.map((v, i) => {
                // Simulate linear transformation
                const transformed = v * 2 + Math.sin(i * 0.1) * 0.5;
                return Math.max(0, transformed); // ReLU
            });
            
            // Second linear layer (projection back)
            return hidden.map((v, i) => v * 0.5 + Math.cos(i * 0.1) * 0.2);
        });
    }
    
    residualAdd(input1, input2) {
        return input1.map((vec, i) => 
            vec.map((val, j) => val + input2[i][j])
        );
    }
    
    layerNorm(input) {
        return input.map(vec => {
            // Calculate mean
            const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
            
            // Calculate variance
            const variance = vec.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vec.length;
            const std = Math.sqrt(variance + 1e-5);
            
            // Normalize
            return vec.map(v => (v - mean) / std);
        });
    }
    
    generateOutput(encoderOutput, tokens) {
        // Generate vocabulary predictions for each position
        const output = [];
        
        for (let i = 0; i < encoderOutput.length; i++) {
            const logits = [];
            
            // Compute logits for each vocabulary word
            for (let v = 0; v < this.config.vocab.length; v++) {
                let score = 0;
                
                // Simple scoring based on encoder output
                for (let d = 0; d < this.config.hiddenDim; d++) {
                    score += encoderOutput[i][d] * Math.sin((v + 1) * (d + 1) * 0.1);
                }
                
                // Add bias based on token frequency (simulate learned bias)
                score += Math.cos(v * 0.5) * 2;
                
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
        if (this.state.currentStep >= this.state.processingSteps.length) {
            this.state.isPlaying = false;
            document.getElementById('play-btn').textContent = '▶️ Play';
            return;
        }
        
        const step = this.state.processingSteps[this.state.currentStep];
        
        // Update step info
        document.getElementById('step-info').textContent = 
            `Step: ${this.state.currentStep + 1}/${this.state.processingSteps.length}`;
        document.getElementById('step-title').textContent = step.name;
        document.getElementById('step-description').textContent = step.description;
        document.getElementById('step-slider').value = this.state.currentStep;
        
        // Show step details if available
        const detailsDiv = document.getElementById('step-details');
        if (step.details) {
            detailsDiv.textContent = step.details;
            detailsDiv.classList.add('active');
        } else {
            detailsDiv.classList.remove('active');
        }
        
        // Update architecture highlighting
        this.highlightComponent(step.component, step.connection);
        
        // Update current view
        switch (this.state.currentView) {
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
        if (this.state.isPlaying) {
            setTimeout(() => {
                this.state.currentStep++;
                this.updateVisualization();
            }, this.config.playbackSpeed);
        }
    }
    
    highlightComponent(componentId, connectionId) {
        // Clear all highlights
        document.querySelectorAll('.component-box').forEach(box => {
            box.classList.remove('active');
        });
        
        document.querySelectorAll('.connection-line').forEach(line => {
            line.classList.remove('active');
        });
        
        // Highlight current component
        if (componentId) {
            const component = document.getElementById(componentId);
            if (component) {
                component.classList.add('active');
            }
        }
        
        // Highlight current connection
        if (connectionId) {
            const connection = document.getElementById(connectionId);
            if (connection) {
                connection.classList.add('active');
            }
        }
    }
    
    updateDataFlowView(step) {
        const container = document.querySelector('.dataflow-container');
        
        let html = `
            <h3>${step.name}</h3>
            <div class="tensor-view">
                <div class="tensor-shape">Shape: ${step.shape}</div>
        `;
        
        if (step.tokens && step.name === 'Input Embedding') {
            html += `
                <div style="margin: 10px 0;">
                    <strong>Tokens:</strong> ${step.tokens.join(' → ')}
                </div>
            `;
        }
        
        html += `
                <div class="tensor-preview">
                    ${this.renderTensorPreview(step.data)}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    renderTensorPreview(data) {
        if (!data || data.length === 0) return '<div class="loading">No data available</div>';
        
        let html = '';
        const maxRows = 3;
        const maxCols = 10;
        
        // Show first few values of first few vectors
        for (let i = 0; i < Math.min(data.length, maxRows); i++) {
            for (let j = 0; j < Math.min(data[i].length, maxCols); j++) {
                const value = data[i][j].toFixed(3);
                const intensity = Math.abs(data[i][j]);
                const color = data[i][j] >= 0 ? 
                    `rgba(52, 152, 219, ${intensity})` : 
                    `rgba(231, 76, 60, ${intensity})`;
                
                html += `<div class="tensor-value" style="background: ${color}; color: ${intensity > 0.5 ? 'white' : 'black'}">${value}</div>`;
            }
            
            if (data[i].length > maxCols) {
                html += `<div class="tensor-value">...</div>`;
            }
        }
        
        if (data.length > maxRows) {
            html += `<div class="tensor-value" style="grid-column: 1 / -1; text-align: center;">... ${data.length - maxRows} more rows ...</div>`;
        }
        
        return html;
    }
    
    updateAttentionView(step) {
        const container = document.querySelector('.attention-container');
        
        if (!step.attentionWeights) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">No attention weights for this step</p>';
            return;
        }
        
        const tokens = step.tokens || this.state.processingSteps.find(s => s.tokens)?.tokens || [];
        
        container.innerHTML = '<h3>Attention Patterns</h3>';
        
        // Create container for attention heads
        const headsContainer = document.createElement('div');
        headsContainer.style.display = 'flex';
        headsContainer.style.flexWrap = 'wrap';
        headsContainer.style.gap = '20px';
        headsContainer.style.justifyContent = 'center';
        
        // Show attention weights for each head
        step.attentionWeights.forEach((headWeights, h) => {
            const heatmap = document.createElement('div');
            heatmap.className = 'attention-heatmap';
            
            const title = document.createElement('h4');
            title.textContent = `Head ${h + 1}`;
            heatmap.appendChild(title);
            
            const grid = document.createElement('div');
            grid.className = 'attention-grid';
            grid.style.gridTemplateColumns = `repeat(${tokens.length + 1}, 40px)`;
            
            // Add corner cell
            const corner = document.createElement('div');
            corner.className = 'attention-cell attention-label';
            grid.appendChild(corner);
            
            // Add column labels
            tokens.forEach(token => {
                const label = document.createElement('div');
                label.className = 'attention-cell attention-label';
                label.textContent = token.substring(0, 4);
                label.title = token;
                grid.appendChild(label);
            });
            
            // Add rows
            headWeights.forEach((row, i) => {
                // Row label
                const rowLabel = document.createElement('div');
                rowLabel.className = 'attention-cell attention-label';
                rowLabel.textContent = tokens[i].substring(0, 4);
                rowLabel.title = tokens[i];
                grid.appendChild(rowLabel);
                
                // Weight cells
                row.forEach((weight, j) => {
                    const cell = document.createElement('div');
                    cell.className = 'attention-cell';
                    
                    // Color based on weight intensity
                    const intensity = Math.floor(weight * 255);
                    const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                    cell.style.background = color;
                    cell.style.color = intensity < 128 ? 'black' : 'white';
                    cell.textContent = weight.toFixed(2);
                    cell.title = `${tokens[i]} → ${tokens[j]}: ${weight.toFixed(4)}`;
                    
                    grid.appendChild(cell);
                });
            });
            
            heatmap.appendChild(grid);
            headsContainer.appendChild(heatmap);
        });
        
        container.appendChild(headsContainer);
    }
    
    updateOutputView(step) {
        const container = document.querySelector('.output-container');
        
        if (!step.data || step.name !== 'Output Generation') {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">Output generation not yet reached</p>';
            return;
        }
        
        const tokens = step.tokens;
        const predictions = step.data;
        
        // Create token generation visualization
        let html = '<h3>Token Generation</h3><div class="token-generation">';
        
        tokens.forEach((token, i) => {
            const isLast = i === tokens.length - 1;
            html += `
                <div class="token-box ${isLast ? 'generated' : ''}">
                    <div class="token-value">${token}</div>
                    ${!isLast ? '<div class="token-prob">Input Token</div>' : '<div class="token-prob">Next Token?</div>'}
                </div>
            `;
        });
        
        html += '</div>';
        
        // Show next token probabilities for the position before <END>
        const lastPredictionIdx = predictions.length - 2;
        if (lastPredictionIdx >= 0) {
            html += `
                <div class="probability-chart">
                    <h4>Next Token Probabilities (after "${tokens[lastPredictionIdx]}")</h4>
                    ${this.renderProbabilityChart(predictions[lastPredictionIdx])}
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Animate probability bars
        setTimeout(() => {
            document.querySelectorAll('.prob-fill').forEach(fill => {
                const width = fill.dataset.width;
                if (width) {
                    fill.style.width = width;
                }
            });
        }, 100);
    }
    
    renderProbabilityChart(probs) {
        if (!probs) return '';
        
        // Get top 10 predictions
        const topIndices = probs
            .map((p, i) => ({ prob: p, idx: i }))
            .sort((a, b) => b.prob - a.prob)
            .slice(0, 10);
        
        return topIndices.map(({ prob, idx }) => {
            const percent = (prob * 100).toFixed(1);
            return `
                <div class="prob-bar">
                    <div class="prob-label">${this.config.vocab[idx]}</div>
                    <div class="prob-value">
                        <div class="prob-fill" data-width="${percent}%" style="width: 0"></div>
                    </div>
                    <div class="prob-percent">${percent}%</div>
                </div>
            `;
        }).join('');
    }
    
    switchView(view) {
        this.state.currentView = view;
        
        // Update tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });
        
        // Update content
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.toggle('active', content.id === `${view}-view`);
        });
        
        // Update visualization for current step
        if (this.state.processingSteps.length > 0) {
            this.updateVisualization();
        }
    }
    
    togglePlayback() {
        this.state.isPlaying = !this.state.isPlaying;
        const playBtn = document.getElementById('play-btn');
        playBtn.textContent = this.state.isPlaying ? '⏸️ Pause' : '▶️ Play';
        
        if (this.state.isPlaying) {
            if (this.state.currentStep >= this.state.processingSteps.length) {
                this.state.currentStep = 0;
            }
            this.updateVisualization();
        }
    }
    
    stepForward() {
        if (this.state.currentStep < this.state.processingSteps.length - 1) {
            this.state.currentStep++;
            this.updateVisualization();
        }
    }
    
    goToStep(step) {
        this.state.currentStep = Math.min(step, this.state.processingSteps.length - 1);
        this.updateVisualization();
    }
    
    reset() {
        this.state.currentStep = 0;
        this.state.isPlaying = false;
        this.state.processingSteps = [];
        this.state.attentionWeights = [];
        
        document.getElementById('play-btn').textContent = '▶️ Play';
        document.getElementById('step-info').textContent = 'Step: 0/0';
        document.getElementById('step-title').textContent = 'Ready';
        document.getElementById('step-description').textContent = 'Click "Process Text" to begin the visualization';
        document.getElementById('step-slider').value = 0;
        document.getElementById('step-details').classList.remove('active');
        
        this.highlightComponent(null, null);
        
        // Clear all views
        document.querySelector('.dataflow-container').innerHTML = '';
        document.querySelector('.attention-container').innerHTML = '';
        document.querySelector('.output-container').innerHTML = '';
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        this.container.insertBefore(errorDiv, this.container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    destroy() {
        // Clean up event listeners
        this.eventCleanup.forEach(cleanup => cleanup());
        this.eventCleanup = [];
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transformer_demo')) {
        window.transformerDemo = new TransformerDemo('transformer_demo');
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.transformerDemo && typeof window.transformerDemo.destroy === 'function') {
        window.transformerDemo.destroy();
    }
});