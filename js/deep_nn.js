// deep_nn.js - Interactive Transformer Architecture Demo (GPT-style Decoder)

class TransformerDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }
        
        // Configuration with expanded vocabulary
        this.config = {
            vocab: [
                '<PAD>', '<START>', '<END>', '<UNK>',
                // Common words
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'after',
                // Common nouns
                'cat', 'dog', 'bird', 'fish', 'mouse', 'lion', 'tiger', 'bear', 'fox',
                'house', 'home', 'room', 'door', 'window', 'table', 'chair', 'bed',
                'car', 'bus', 'train', 'plane', 'boat', 'bike',
                'tree', 'flower', 'grass', 'sky', 'sun', 'moon', 'star', 'cloud',
                'water', 'fire', 'earth', 'air', 'rain', 'snow', 'wind',
                'food', 'bread', 'milk', 'cheese', 'apple', 'banana',
                'person', 'man', 'woman', 'child', 'boy', 'girl', 'friend',
                // Common verbs
                'is', 'are', 'was', 'were', 'be', 'been', 'being',
                'have', 'has', 'had', 'do', 'does', 'did',
                'will', 'would', 'could', 'should', 'may', 'might', 'must',
                'go', 'goes', 'went', 'gone', 'going',
                'run', 'runs', 'ran', 'running',
                'walk', 'walks', 'walked', 'walking',
                'eat', 'eats', 'ate', 'eating',
                'sleep', 'sleeps', 'slept', 'sleeping',
                'sit', 'sits', 'sat', 'sitting',
                'stand', 'stands', 'stood', 'standing',
                'play', 'plays', 'played', 'playing',
                'jump', 'jumps', 'jumped', 'jumping',
                'talk', 'talks', 'talked', 'talking',
                'see', 'sees', 'saw', 'seen', 'seeing',
                'look', 'looks', 'looked', 'looking',
                'make', 'makes', 'made', 'making',
                'think', 'thinks', 'thought', 'thinking',
                'know', 'knows', 'knew', 'knowing',
                'want', 'wants', 'wanted', 'wanting',
                'like', 'likes', 'liked', 'liking',
                'love', 'loves', 'loved', 'loving',
                'need', 'needs', 'needed', 'needing',
                // Common adjectives
                'big', 'small', 'large', 'little', 'long', 'short', 'tall', 'wide',
                'good', 'bad', 'great', 'fine', 'nice', 'beautiful', 'pretty',
                'new', 'old', 'young', 'fresh', 'ancient',
                'hot', 'cold', 'warm', 'cool', 'frozen',
                'fast', 'slow', 'quick', 'rapid',
                'happy', 'sad', 'angry', 'glad', 'sorry',
                'red', 'blue', 'green', 'yellow', 'black', 'white', 'brown',
                'one', 'two', 'three', 'four', 'five', 'many', 'some', 'all'
            ],
            hiddenDim: 64,
            numHeads: 4,
            numLayers: 2,
            maxLength: 20,
            playbackSpeed: 1000,
            posEncodingBase: 10000,
            temperature: 0.8,
            topK: 10
        };
        
        // Initialize embeddings matrix with random values
        this.initializeEmbeddings();
        this.initializeProjectionWeights();
        
        // State
        this.state = {
            currentView: 'architecture',
            currentStep: 0,
            isPlaying: false,
            processingSteps: [],
            attentionWeights: [],
            generatedTokens: [],
            isGenerating: false
        };
        
        // Event cleanup
        this.eventCleanup = [];
        
        // Prevent multiple style injections
        if (!document.getElementById('transformer-demo-styles')) {
            this.setupStyles();
        }
        
        this.init();
    }
    
    initializeEmbeddings() {
        // Create random embedding matrix
        this.embeddings = {};
        for (const token of this.config.vocab) {
            this.embeddings[token] = [];
            for (let i = 0; i < this.config.hiddenDim; i++) {
                // Initialize with small random values
                this.embeddings[token].push((Math.random() - 0.5) * 0.2);
            }
        }
    }
    
    initializeProjectionWeights() {
        // Create projection weights for output layer
        this.projectionWeights = [];
        
        // Initialize with Xavier/Glorot initialization
        const scale = Math.sqrt(2.0 / (this.config.hiddenDim + this.config.vocab.length));
        
        for (let v = 0; v < this.config.vocab.length; v++) {
            this.projectionWeights[v] = [];
            for (let h = 0; h < this.config.hiddenDim; h++) {
                this.projectionWeights[v][h] = (Math.random() - 0.5) * scale * 0.1; // Smaller weights
            }
        }
        
        // Create more realistic biases based on token type
        // This simulates what a trained model might learn
        
        // Severely penalize special tokens
        ['<PAD>', '<START>', '<END>', '<UNK>'].forEach(token => {
            const idx = this.config.vocab.indexOf(token);
            if (idx !== -1) {
                this.projectionWeights[idx].forEach((_, i) => {
                    this.projectionWeights[idx][i] -= 1.0;
                });
            }
        });
        
        // Create linguistic categories with appropriate biases
        const tokenCategories = {
            articles: ['the', 'a', 'an'],
            commonVerbs: ['is', 'was', 'are', 'were', 'has', 'have', 'had'],
            actionVerbs: ['runs', 'walks', 'jumps', 'sits', 'sleeps', 'plays', 'eats'],
            commonNouns: ['cat', 'dog', 'house', 'car', 'man', 'woman', 'boy', 'girl'],
            adjectives: ['big', 'small', 'happy', 'sad', 'good', 'bad', 'new', 'old'],
            conjunctions: ['and', 'but', 'or'],
            prepositions: ['in', 'on', 'at', 'with', 'by', 'for', 'to']
        };
        
        // Apply category-based biases
        Object.entries(tokenCategories).forEach(([category, tokens]) => {
            tokens.forEach(token => {
                const idx = this.config.vocab.indexOf(token);
                if (idx !== -1) {
                    // Small positive bias for common words
                    this.projectionWeights[idx].forEach((_, i) => {
                        this.projectionWeights[idx][i] += Math.random() * 0.1;
                    });
                }
            });
        });
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
                    <h3>GPT-Style Decoder Transformer Demo</h3>
                    <div class="input-section">
                        <input type="text" id="transformer-input" placeholder="Enter prompt text (e.g., 'the cat')" value="the cat" maxlength="50">
                        <button id="process-btn" class="demo-button">Start Generation</button>
                    </div>
                    <div class="model-info">
                        <span class="info-badge">Autoregressive</span>
                        <span class="info-badge">Causal Attention</span>
                        <span class="info-badge">Decoder-only</span>
                        <span class="info-badge">Vocab: ${this.config.vocab.length} tokens</span>
                    </div>
                </div>
                
                <div class="view-tabs">
                    <button class="view-tab active" data-view="architecture">Architecture</button>
                    <button class="view-tab" data-view="generation">Token Generation</button>
                    <button class="view-tab" data-view="attention">Causal Attention</button>
                    <button class="view-tab" data-view="dataflow">Data Flow</button>
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
                    <label for="temperature-control" style="margin-left: 20px;">Temperature:</label>
                    <select id="temperature-control">
                        <option value="0.5">0.5 (focused)</option>
                        <option value="0.8" selected>0.8 (balanced)</option>
                        <option value="1.0">1.0 (creative)</option>
                        <option value="1.2">1.2 (very creative)</option>
                    </select>
                </div>
                
                <div class="demo-content">
                    <div id="architecture-view" class="view-content active">
                        <svg id="transformer-svg" width="800" height="600" viewBox="0 0 800 600"></svg>
                    </div>
                    <div id="generation-view" class="view-content">
                        <div class="generation-container"></div>
                    </div>
                    <div id="attention-view" class="view-content">
                        <div class="attention-container"></div>
                    </div>
                    <div id="dataflow-view" class="view-content">
                        <div class="dataflow-container"></div>
                    </div>
                </div>
                
                <div class="info-panel">
                    <h4>Current Step: <span id="step-title">Ready</span></h4>
                    <p id="step-description">Click "Start Generation" to begin autoregressive text generation</p>
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
            
            .model-info {
                margin-top: 15px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .info-badge {
                background: rgba(255,255,255,0.2);
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: 500;
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
            
            #speed-control, #temperature-control {
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
                margin: 0 0 10px 0;
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
            
            /* Generation view styles */
            .generation-sequence {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .generation-sequence h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
            }
            
            .token-sequence {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .sequence-token {
                background: white;
                border: 2px solid #dee2e6;
                border-radius: 5px;
                padding: 10px 15px;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.3s;
                position: relative;
                min-width: 60px;
                text-align: center;
            }
            
            .sequence-token.prompt {
                background: #e3f2fd;
                border-color: #2196f3;
            }
            
            .sequence-token.generated {
                background: #e8f5e9;
                border-color: #4caf50;
                animation: tokenAppear 0.5s ease-in-out;
            }
            
            .sequence-token.generating {
                background: #fff3e0;
                border-color: #ff9800;
                animation: tokenPulse 1s ease-in-out infinite;
            }
            
            @keyframes tokenAppear {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes tokenPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .token-position {
                position: absolute;
                top: -10px;
                right: -10px;
                background: #3498db;
                color: white;
                font-size: 10px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: normal;
            }
            
            /* Causal attention mask visualization */
            .causal-mask-demo {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .mask-grid {
                display: grid;
                gap: 2px;
                margin-top: 15px;
                justify-content: center;
            }
            
            .mask-cell {
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                transition: all 0.3s;
            }
            
            .mask-cell.allowed {
                background: #4caf50;
                color: white;
            }
            
            .mask-cell.masked {
                background: #f44336;
                color: white;
            }
            
            .mask-cell.current {
                background: #ff9800;
                color: white;
                animation: pulse 1s ease-in-out infinite;
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
            
            .attention-cell.masked-attention {
                background: #ffebee !important;
                color: #c62828 !important;
                opacity: 0.3;
            }
            
            .attention-label {
                background: #f8f9fa;
                font-weight: bold;
                font-size: 10px;
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
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 5px;
                max-height: 300px;
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
            
            /* Probability distribution */
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
            
            .prob-bar.selected {
                background: #e3f2fd;
                padding: 5px;
                margin-left: -5px;
                border-radius: 5px;
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
            
            .prob-bar.selected .prob-fill {
                background: linear-gradient(to right, #4caf50, #388e3c);
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
            
            /* Debug info */
            .debug-info {
                background: #f0f0f0;
                padding: 10px;
                margin: 10px 0;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
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
                
                .mask-cell {
                    width: 25px;
                    height: 25px;
                    font-size: 10px;
                }
                
                .tensor-preview {
                    grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Process button
        const processBtn = document.getElementById('process-btn');
        const processFn = () => this.startGeneration();
        processBtn.addEventListener('click', processFn);
        this.eventCleanup.push(() => processBtn.removeEventListener('click', processFn));
        
        // Enter key on input
        const input = document.getElementById('transformer-input');
        const enterFn = (e) => { if (e.key === 'Enter') this.startGeneration(); };
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
        
        // Temperature control
        const tempControl = document.getElementById('temperature-control');
        const tempFn = (e) => { this.config.temperature = parseFloat(e.target.value); };
        tempControl.addEventListener('change', tempFn);
        this.eventCleanup.push(() => tempControl.removeEventListener('change', tempFn));
        
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
            <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#2c3e50">GPT-Style Decoder Architecture</text>
            
            <!-- Input -->
            <rect class="component-box" id="token-embed" x="320" y="520" width="160" height="40" rx="5" />
            <text class="component-text" x="400" y="545">Token Embedding</text>
            
            <rect class="component-box" id="pos-encoding" x="320" y="460" width="160" height="40" rx="5" />
            <text class="component-text" x="400" y="485">Positional Encoding</text>
            
            <!-- Decoder Stack -->
            <g id="decoder-stack">
                <rect x="220" y="120" width="360" height="320" fill="none" stroke="#7f8c8d" stroke-width="2" stroke-dasharray="5,5" rx="10" />
                <text x="400" y="110" text-anchor="middle" font-size="16" font-weight="bold" fill="#2c3e50">Decoder Stack (Autoregressive)</text>
                
                <!-- Layer 1 -->
                <g id="decoder-layer-1">
                    <rect class="component-box" id="dec-masked-attn-1" x="260" y="370" width="280" height="40" rx="5" />
                    <text class="component-text" x="400" y="385">Masked Multi-Head</text>
                    <text class="component-text" x="400" y="400" font-size="12">Self-Attention</text>
                    
                    <rect class="component-box" id="dec-norm-1" x="260" y="310" width="280" height="40" rx="5" />
                    <text class="component-text" x="400" y="335">Add & Layer Norm</text>
                    
                    <rect class="component-box" id="dec-ff-1" x="260" y="250" width="280" height="40" rx="5" />
                    <text class="component-text" x="400" y="275">Feed Forward</text>
                    
                    <rect class="component-box" id="dec-norm-2" x="260" y="190" width="280" height="40" rx="5" />
                    <text class="component-text" x="400" y="215">Add & Layer Norm</text>
                </g>
                
                <!-- Layer 2 (simplified) -->
                <rect class="component-box" id="dec-layer-2" x="260" y="140" width="280" height="35" rx="5" />
                <text class="component-text" x="400" y="162">Decoder Layer 2</text>
            </g>
            
            <!-- Output Head -->
            <rect class="component-box" id="output-projection" x="320" y="70" width="160" height="40" rx="5" />
            <text class="component-text" x="400" y="95">Output Projection</text>
            
            <!-- Connections -->
            <line class="connection-line" id="conn-1" x1="400" y1="520" x2="400" y2="500" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-2" x1="400" y1="460" x2="400" y2="410" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-3" x1="400" y1="370" x2="400" y2="350" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-4" x1="400" y1="310" x2="400" y2="290" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-5" x1="400" y1="250" x2="400" y2="230" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-6" x1="400" y1="190" x2="400" y2="175" stroke-dasharray="5,5" />
            <line class="connection-line" id="conn-7" x1="400" y1="140" x2="400" y2="110" stroke-dasharray="5,5" />
            
            <!-- Skip connections -->
            <path class="connection-line" d="M 240 390 Q 210 330 240 330" stroke-dasharray="3,3" opacity="0.5" />
            <path class="connection-line" d="M 240 270 Q 210 210 240 210" stroke-dasharray="3,3" opacity="0.5" />
            
            <!-- Labels -->
            <text x="200" y="360" font-size="12" fill="#7f8c8d" text-anchor="middle">residual</text>
            <text x="200" y="240" font-size="12" fill="#7f8c8d" text-anchor="middle">residual</text>
            
            <!-- Causal mask indicator -->
            <g transform="translate(550, 380)">
                <rect x="0" y="-15" width="30" height="30" fill="#ff9800" rx="3" />
                <text x="15" y="5" text-anchor="middle" fill="white" font-size="20">🔒</text>
                <text x="15" y="30" text-anchor="middle" font-size="10" fill="#7f8c8d">Causal</text>
                <text x="15" y="42" text-anchor="middle" font-size="10" fill="#7f8c8d">Mask</text>
            </g>
        `;
    }
    
    startGeneration() {
        const input = document.getElementById('transformer-input').value.trim();
        if (!input) {
            this.showError('Please enter some text to start generation');
            return;
        }
        
        // Disable process button during processing
        const processBtn = document.getElementById('process-btn');
        processBtn.disabled = true;
        processBtn.textContent = 'Generating...';
        
        try {
            this.reset();
            
            // Tokenize input
            const promptTokens = this.tokenize(input);
            this.state.generatedTokens = [...promptTokens];
            
            // Initialize generation steps
            this.initializeGenerationSteps(promptTokens);
            
            // Start visualization
            this.state.currentStep = 0;
            this.updateVisualization();
            
            // Switch to generation view
            this.switchView('generation');
            
            processBtn.textContent = 'Start Generation';
            processBtn.disabled = false;
            
        } catch (error) {
            console.error('Error starting generation:', error);
            this.showError('Error starting generation. Please try again.');
            processBtn.textContent = 'Start Generation';
            processBtn.disabled = false;
        }
    }
    
    tokenize(text) {
        const words = text.toLowerCase().split(/\s+/);
        const tokens = [];
        
        for (const word of words) {
            if (this.config.vocab.includes(word)) {
                tokens.push(word);
            } else {
                // For unknown words, try to find a similar one or use <UNK>
                const similar = this.findSimilarToken(word);
                tokens.push(similar || '<UNK>');
            }
        }
        
        return tokens;
    }
    
    findSimilarToken(word) {
        // Simple similarity check - find tokens that start with the same letters
        const candidates = this.config.vocab.filter(token => 
            token.startsWith(word.substring(0, 2)) && token !== '<PAD>' && token !== '<START>' && token !== '<END>' && token !== '<UNK>'
        );
        
        if (candidates.length > 0) {
            // Return the shortest matching candidate
            return candidates.sort((a, b) => a.length - b.length)[0];
        }
        
        return null;
    }
    
    initializeGenerationSteps(promptTokens) {
        this.state.processingSteps = [];
        this.state.generatedTokens = [];
        
        // Store the sequence as it builds
        let currentSequence = [...promptTokens];
        
        // Generate tokens one by one (autoregressive)
        const numTokensToGenerate = 3;
        
        for (let genStep = 0; genStep < numTokensToGenerate; genStep++) {
            // Process the ENTIRE sequence up to this point
            const sequenceSoFar = [...currentSequence];
            
            // Step 1: Token Embedding for entire sequence
            const embeddings = this.generateEmbeddings(sequenceSoFar);
            this.state.processingSteps.push({
                name: `Token Embedding (Step ${genStep + 1})`,
                description: `Embedding ${sequenceSoFar.length} tokens: "${sequenceSoFar.join(' ')}"`,
                component: 'token-embed',
                connection: 'conn-1',
                data: embeddings,
                shape: `[${sequenceSoFar.length}, ${this.config.hiddenDim}]`,
                tokens: sequenceSoFar,
                generationStep: genStep,
                phase: 'embedding',
                promptLength: promptTokens.length,
                isGenerating: true
            });
            
            // Step 2: Positional Encoding
            const posEncoded = this.addPositionalEncoding(embeddings);
            this.state.processingSteps.push({
                name: `Positional Encoding (Step ${genStep + 1})`,
                description: `Adding position information for ${sequenceSoFar.length} positions`,
                component: 'pos-encoding',
                connection: 'conn-2',
                data: posEncoded,
                shape: `[${sequenceSoFar.length}, ${this.config.hiddenDim}]`,
                tokens: sequenceSoFar,
                generationStep: genStep,
                phase: 'encoding',
                promptLength: promptTokens.length
            });
            
            // Step 3-6: Decoder Layers with Causal Masking
            let decoderOutput = posEncoded;
            for (let layer = 0; layer < this.config.numLayers; layer++) {
                const layerSteps = this.processDecoderLayer(decoderOutput, sequenceSoFar, layer, genStep);
                layerSteps.forEach(step => {
                    step.promptLength = promptTokens.length;
                    step.currentPosition = sequenceSoFar.length - 1; // Focus on last position
                });
                this.state.processingSteps.push(...layerSteps);
                decoderOutput = layerSteps[layerSteps.length - 1].data;
            }
            
            // Step 7: Output Projection - ONLY from the LAST position
            const lastPositionHidden = decoderOutput[decoderOutput.length - 1];
            const logits = this.projectToVocab(lastPositionHidden, sequenceSoFar);
            const probs = this.softmaxWithTemperature(logits, this.config.temperature);
            
            this.state.processingSteps.push({
                name: `Output Projection (Step ${genStep + 1})`,
                description: `Predicting next token after: "${sequenceSoFar.join(' ')}"`,
                component: 'output-projection',
                connection: 'conn-7',
                data: probs,
                shape: `[${this.config.vocab.length}]`,
                tokens: sequenceSoFar,
                generationStep: genStep,
                phase: 'output',
                logits: logits,
                promptLength: promptTokens.length,
                lastPosition: sequenceSoFar.length - 1
            });
            
            // Step 8: Sample next token
            const nextToken = this.sampleToken(probs, sequenceSoFar);
            const nextTokenProb = probs[this.config.vocab.indexOf(nextToken)];
            
            // Add the new token to our sequence
            currentSequence.push(nextToken);
            this.state.generatedTokens.push(nextToken);
            
            this.state.processingSteps.push({
                name: `Token Selection (Step ${genStep + 1})`,
                description: `Selected "${nextToken}" (${(nextTokenProb * 100).toFixed(1)}% probability)`,
                component: 'output-projection',
                data: { 
                    token: nextToken, 
                    probs: probs,
                    probability: nextTokenProb,
                    sequenceBefore: [...sequenceSoFar],
                    sequenceAfter: [...currentSequence]
                },
                tokens: [...currentSequence], // Full sequence including new token
                generationStep: genStep,
                phase: 'selection',
                isNewToken: true,
                selectedIndex: this.config.vocab.indexOf(nextToken),
                promptLength: promptTokens.length
            });
        }
        
        // Update slider
        const slider = document.getElementById('step-slider');
        slider.max = this.state.processingSteps.length - 1;
    }
    
    generateEmbeddings(tokens) {
        // Use pre-initialized embeddings
        return tokens.map(token => {
            if (this.embeddings[token]) {
                return [...this.embeddings[token]]; // Return copy
            } else {
                // Fallback for unknown tokens
                return this.embeddings['<UNK>'] || new Array(this.config.hiddenDim).fill(0).map(() => (Math.random() - 0.5) * 0.1);
            }
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
    
    processDecoderLayer(input, tokens, layerNum, genStep) {
        const steps = [];
        const connectionBase = layerNum === 0 ? 3 : 6;
        
        // Masked Multi-head attention
        const attention = this.maskedMultiHeadAttention(input, tokens);
        steps.push({
            name: `Masked Self-Attention (Layer ${layerNum + 1})`,
            description: `Computing causal self-attention with ${this.config.numHeads} heads`,
            component: layerNum === 0 ? 'dec-masked-attn-1' : 'dec-layer-2',
            connection: `conn-${connectionBase}`,
            data: attention.output,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            attentionWeights: attention.weights,
            causalMask: attention.mask,
            details: `Causal mask prevents attending to future tokens`,
            generationStep: genStep,
            phase: 'attention'
        });
        
        // Add & Norm
        const norm1 = this.layerNorm(this.residualAdd(input, attention.output));
        steps.push({
            name: `Add & Norm (Layer ${layerNum + 1})`,
            description: 'Residual connection and layer normalization',
            component: layerNum === 0 ? 'dec-norm-1' : 'dec-layer-2',
            connection: `conn-${connectionBase + 1}`,
            data: norm1,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            generationStep: genStep,
            phase: 'norm'
        });
        
        // Feed-forward
        const ffOutput = this.feedForward(norm1);
        steps.push({
            name: `Feed Forward (Layer ${layerNum + 1})`,
            description: 'Position-wise feed-forward network',
            component: layerNum === 0 ? 'dec-ff-1' : 'dec-layer-2',
            connection: `conn-${connectionBase + 2}`,
            data: ffOutput,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            details: 'Two linear transformations with ReLU',
            generationStep: genStep,
            phase: 'feedforward'
        });
        
        // Add & Norm
        const norm2 = this.layerNorm(this.residualAdd(norm1, ffOutput));
        steps.push({
            name: `Add & Norm 2 (Layer ${layerNum + 1})`,
            description: 'Second residual connection and layer normalization',
            component: layerNum === 0 ? 'dec-norm-2' : 'dec-layer-2',
            connection: layerNum === 0 ? 'conn-6' : 'conn-7',
            data: norm2,
            shape: `[${tokens.length}, ${this.config.hiddenDim}]`,
            generationStep: genStep,
            phase: 'norm2'
        });
        
        return steps;
    }
    
    maskedMultiHeadAttention(input, tokens) {
        const seqLen = input.length;
        const headDim = Math.floor(this.config.hiddenDim / this.config.numHeads);
        const weights = [];
        const outputs = [];
        
        // Create causal mask
        const mask = this.createCausalMask(seqLen);
        
        // Simulate attention for each head
        for (let h = 0; h < this.config.numHeads; h++) {
            const headWeights = [];
            
            for (let i = 0; i < seqLen; i++) {
                const row = [];
                let sum = 0;
                
                // Calculate attention scores with causal masking
                for (let j = 0; j < seqLen; j++) {
                    if (mask[i][j]) {
                        // Simple attention pattern with some randomness
                        let score = 1.0;
                        
                        // Recent positions get higher attention
                        const distance = i - j;
                        score *= Math.exp(-distance * 0.2);
                        
                        // Add some head-specific patterns
                        if (h === 0) {
                            // First head focuses on recent tokens
                            score *= Math.exp(-distance * 0.3);
                        } else if (h === 1) {
                            // Second head looks at first token more
                            if (j === 0) score *= 2.0;
                        }
                        
                        // Add small random noise
                        score += Math.random() * 0.1;
                        
                        row.push(score);
                        sum += score;
                    } else {
                        // Masked out (future position)
                        row.push(0);
                    }
                }
                
                // Normalize to get attention weights
                if (sum > 0) {
                    headWeights.push(row.map(v => v / sum));
                } else {
                    headWeights.push(row);
                }
            }
            
            weights.push(headWeights);
        }
        
        // Combine outputs from all heads
        for (let i = 0; i < seqLen; i++) {
            const combined = new Array(this.config.hiddenDim).fill(0);
            
            for (let h = 0; h < this.config.numHeads; h++) {
                for (let j = 0; j < seqLen; j++) {
                    const weight = weights[h][i][j];
                    if (weight > 0) {
                        for (let d = 0; d < headDim; d++) {
                            const dimIdx = h * headDim + d;
                            if (dimIdx < this.config.hiddenDim) {
                                combined[dimIdx] += input[j][dimIdx] * weight;
                            }
                        }
                    }
                }
            }
            
            outputs.push(combined);
        }
        
        return { output: outputs, weights: weights, mask: mask };
    }
    
    createCausalMask(seqLen) {
        const mask = [];
        for (let i = 0; i < seqLen; i++) {
            const row = [];
            for (let j = 0; j < seqLen; j++) {
                // Can only attend to positions <= i (causal mask)
                row.push(j <= i);
            }
            mask.push(row);
        }
        return mask;
    }
    
    feedForward(input) {
        const hiddenSize = this.config.hiddenDim * 4; // Typical expansion factor
        
        return input.map(vec => {
            // First linear layer with ReLU
            const hidden = [];
            for (let h = 0; h < hiddenSize; h++) {
                let value = 0;
                for (let i = 0; i < vec.length; i++) {
                    // Simulate random weights
                    value += vec[i] * (Math.sin((h + 1) * (i + 1) * 0.1) * 0.5);
                }
                hidden.push(Math.max(0, value)); // ReLU
            }
            
            // Second linear layer (projection back)
            const output = [];
            for (let i = 0; i < this.config.hiddenDim; i++) {
                let value = 0;
                for (let h = 0; h < hiddenSize; h++) {
                    // Simulate random weights
                    value += hidden[h] * (Math.cos((i + 1) * (h + 1) * 0.1) * 0.3);
                }
                output.push(value);
            }
            
            return output;
        });
    }
    
    residualAdd(input1, input2) {
        return input1.map((vec, i) => 
            vec.map((val, j) => val + input2[i][j])
        );
    }
    
    layerNorm(input) {
        return input.map(vec => {
            const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
            const variance = vec.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vec.length;
            const std = Math.sqrt(variance + 1e-5);
            return vec.map(v => (v - mean) / std);
        });
    }
    
    projectToVocab(hiddenState, currentSequence) {
        // Use pre-initialized projection weights
        const logits = [];
        
        // Base projection
        for (let v = 0; v < this.config.vocab.length; v++) {
            let score = 0;
            
            // Dot product with projection weights
            for (let h = 0; h < this.config.hiddenDim; h++) {
                score += hiddenState[h] * this.projectionWeights[v][h];
            }
            
            logits.push(score);
        }
        
        // Normalize logits to reasonable range
        const meanLogit = logits.reduce((a, b) => a + b, 0) / logits.length;
        const stdLogit = Math.sqrt(logits.reduce((a, b) => a + Math.pow(b - meanLogit, 2), 0) / logits.length);
        
        // Standardize and scale
        for (let v = 0; v < logits.length; v++) {
            logits[v] = (logits[v] - meanLogit) / (stdLogit + 1e-5) * 2.0;
        }
        
        // Apply context-aware adjustments
        const token = currentSequence[currentSequence.length - 1] || '';
        const secondLastToken = currentSequence[currentSequence.length - 2] || '';
        
        for (let v = 0; v < this.config.vocab.length; v++) {
            const candidateToken = this.config.vocab[v];
            
            // Strong penalties for special tokens
            if (['<PAD>', '<START>', '<END>', '<UNK>'].includes(candidateToken)) {
                logits[v] -= 10.0;
                continue;
            }
            
            // Context-based boosts
            if (token === 'the' || token === 'a' || token === 'an') {
                // After articles, boost nouns and adjectives
                if (['cat', 'dog', 'house', 'car', 'tree', 'bird', 'man', 'woman', 'boy', 'girl'].includes(candidateToken)) {
                    logits[v] += 3.0;
                } else if (['big', 'small', 'red', 'blue', 'happy', 'old', 'new', 'good', 'little', 'great'].includes(candidateToken)) {
                    logits[v] += 2.5;
                }
                // Penalize another article or verb immediately after
                if (['the', 'a', 'an', 'is', 'was', 'are'].includes(candidateToken)) {
                    logits[v] -= 4.0;
                }
            } else if (['cat', 'dog', 'bird', 'man', 'woman', 'boy', 'girl', 'car', 'house', 'tree'].includes(token)) {
                // After nouns, boost verbs
                if (['is', 'was', 'runs', 'walks', 'jumps', 'sits', 'sleeps', 'plays', 'eats', 'likes', 'loves'].includes(candidateToken)) {
                    logits[v] += 4.0;
                } else if (['and', 'or', 'but', 'with'].includes(candidateToken)) {
                    logits[v] += 2.0;
                }
                // Slight penalty for adjectives right after nouns
                if (['big', 'small', 'red', 'blue'].includes(candidateToken)) {
                    logits[v] -= 1.0;
                }
            } else if (['is', 'was', 'are', 'were'].includes(token)) {
                // After be-verbs, strongly boost adjectives and -ing forms
                if (['happy', 'sad', 'big', 'small', 'good', 'bad', 'old', 'new', 'fast', 'slow', 'beautiful', 'nice'].includes(candidateToken)) {
                    logits[v] += 4.0;
                } else if (candidateToken.endsWith('ing')) {
                    logits[v] += 3.5;
                } else if (['a', 'an', 'the'].includes(candidateToken)) {
                    logits[v] += 2.0;
                } else if (['very', 'so', 'quite'].includes(candidateToken)) {
                    logits[v] += 2.5;
                }
            } else if (candidateToken.endsWith('ing')) {
                // After -ing verbs, boost prepositions and conjunctions
                if (['and', 'or', 'but', 'on', 'in', 'at', 'with', 'to'].includes(candidateToken)) {
                    logits[v] += 2.5;
                }
            } else if (['happy', 'sad', 'big', 'small', 'fast', 'slow'].includes(token)) {
                // After adjectives, boost "and", periods, or nouns
                if (['and', 'but', 'or'].includes(candidateToken)) {
                    logits[v] += 2.0;
                } else if (['cat', 'dog', 'car', 'house', 'one'].includes(candidateToken)) {
                    logits[v] += 1.5;
                }
            }
            
            // Special handling for specific sequences to ensure grammatical output
            if (currentSequence.length >= 2) {
                const twoBack = currentSequence[currentSequence.length - 2] || '';
                
                // "X was Y" patterns
                if (twoBack === 'was' || twoBack === 'is') {
                    // After "was/is [adjective]", avoid another adjective
                    if (['big', 'small', 'happy', 'sad', 'new', 'old', 'good', 'bad'].includes(token)) {
                        if (['big', 'small', 'happy', 'sad', 'new', 'old', 'good', 'bad'].includes(candidateToken)) {
                            logits[v] -= 4.0;
                        }
                        // Boost conjunctions, prepositions, or end-of-thought words
                        if (['and', 'but', 'when', 'because', 'so'].includes(candidateToken)) {
                            logits[v] += 3.0;
                        }
                    }
                }
                
                // Prevent awkward adjective chains
                if (['big', 'small', 'new', 'old', 'good', 'bad'].includes(token) && 
                    ['big', 'small', 'new', 'old', 'good', 'bad', 'short', 'long', 'fast', 'slow'].includes(candidateToken)) {
                    logits[v] -= 5.0;
                }
            }
            
            // Boost sentence-ending or transitional tokens after 4+ words
            if (currentSequence.length >= 4) {
                if (['and', 'but', 'so', 'then'].includes(candidateToken)) {
                    logits[v] += 1.5;
                }
            }
            
            // Avoid repeating recent words
            const recentTokens = currentSequence.slice(-4);
            if (recentTokens.includes(candidateToken)) {
                logits[v] -= 2.0;
            }
            
            // Common bigram patterns
            const commonBigrams = {
                'the': ['cat', 'dog', 'house', 'car', 'big', 'small', 'red', 'blue'],
                'cat': ['is', 'was', 'sat', 'runs', 'sleeps', 'and'],
                'is': ['big', 'small', 'happy', 'running', 'sleeping', 'a', 'the', 'very'],
                'was': ['big', 'small', 'happy', 'running', 'sleeping', 'a', 'the', 'very'],
                'and': ['the', 'a', 'it', 'then', 'he', 'she'],
                'very': ['big', 'small', 'happy', 'good', 'nice', 'fast'],
                'a': ['cat', 'dog', 'big', 'small', 'good', 'nice', 'red', 'blue']
            };
            
            if (commonBigrams[token] && commonBigrams[token].includes(candidateToken)) {
                logits[v] += 2.0;
            }
        }
        
        return logits;
    }
    
    softmaxWithTemperature(logits, temperature) {
        // Apply temperature scaling
        const scaledLogits = logits.map(l => l / temperature);
        
        // For numerical stability, subtract max
        const maxLogit = Math.max(...scaledLogits);
        const expLogits = scaledLogits.map(l => Math.exp(l - maxLogit));
        const sumExp = expLogits.reduce((a, b) => a + b, 0);
        
        // Ensure we don't divide by zero
        if (sumExp === 0) {
            // Uniform distribution as fallback
            return new Array(logits.length).fill(1.0 / logits.length);
        }
        
        const probs = expLogits.map(e => e / sumExp);
        
        // Ensure probabilities sum to 1 (handle numerical errors)
        const probSum = probs.reduce((a, b) => a + b, 0);
        if (Math.abs(probSum - 1.0) > 0.001) {
            return probs.map(p => p / probSum);
        }
        
        return probs;
    }
    
    sampleToken(probs, currentSequence) {
        // Get the last token for context
        const lastToken = currentSequence[currentSequence.length - 1] || '';
        
        // Get top K indices with their probabilities
        const indexed = probs.map((p, i) => ({ 
            prob: p, 
            idx: i, 
            token: this.config.vocab[i] 
        }));
        indexed.sort((a, b) => b.prob - a.prob);
        
        // Filter out invalid choices based on context
        const filtered = indexed.filter((item) => {
            const token = item.token;
            
            // Always exclude special tokens unless extremely likely
            if (['<PAD>', '<START>', '<END>', '<UNK>'].includes(token)) {
                return item.prob > 0.8;
            }
            
            // Prevent immediate repetition
            if (token === lastToken) {
                return false;
            }
            
            // Prevent repetition of recent words
            const recentTokens = currentSequence.slice(-3);
            if (recentTokens.includes(token)) {
                return false;
            }
            
            // Grammar-based filtering
            if (lastToken === 'and' || lastToken === 'or' || lastToken === 'but') {
                // After conjunctions, don't allow adjectives without articles
                if (['big', 'small', 'happy', 'sad', 'new', 'old', 'fast', 'slow'].includes(token)) {
                    return false;
                }
            }
            
            if (lastToken === 'the' || lastToken === 'a' || lastToken === 'an') {
                // After articles, don't allow verbs or other articles
                if (['is', 'was', 'are', 'were', 'the', 'a', 'an'].includes(token)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Take top-k from filtered list
        let topIndices = filtered.slice(0, Math.min(this.config.topK, filtered.length));
        
        // If we filtered out too many options, be less strict
        if (topIndices.length < 3) {
            // Just exclude special tokens and exact repetition
            topIndices = indexed
                .filter(item => !['<PAD>', '<START>', '<END>', '<UNK>'].includes(item.token) && item.token !== lastToken)
                .slice(0, this.config.topK);
        }
        
        // If still no options, use original top-k
        if (topIndices.length === 0) {
            topIndices = indexed.slice(0, this.config.topK);
        }
        
        // Renormalize probabilities
        const sumTopK = topIndices.reduce((sum, item) => sum + item.prob, 0);
        if (sumTopK === 0) {
            // Uniform distribution as fallback
            topIndices.forEach(item => item.prob = 1.0 / topIndices.length);
        } else {
            topIndices.forEach(item => item.prob = item.prob / sumTopK);
        }
        
        // Temperature-adjusted sampling
        const temp = this.config.temperature;
        if (temp < 0.1) {
            // Greedy: pick the most likely
            return topIndices[0].token;
        }
        
        // Sample from distribution
        const random = Math.random();
        let cumsum = 0;
        
        for (let i = 0; i < topIndices.length; i++) {
            cumsum += topIndices[i].prob;
            if (random < cumsum) {
                return topIndices[i].token;
            }
        }
        
        // Fallback
        return topIndices[0].token;
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
            case 'generation':
                this.updateGenerationView(step);
                break;
            case 'attention':
                this.updateAttentionView(step);
                break;
            case 'dataflow':
                this.updateDataFlowView(step);
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
    
    updateGenerationView(step) {
        const container = document.querySelector('.generation-container');
        
        const promptLength = step.promptLength || this.tokenize(document.getElementById('transformer-input').value).length;
        const generationStep = step.generationStep || 0;
        
        let html = `
            <div class="generation-sequence">
                <h4>Token Generation - Step ${generationStep + 1}</h4>
        `;
        
        // For selection phase, show before and after sequences
        if (step.phase === 'selection' && step.data && step.data.sequenceBefore && step.data.sequenceAfter) {
            // Show sequence before selection
            html += '<p style="color: #666; margin: 10px 0;">Sequence before generation:</p>';
            html += '<div class="token-sequence">';
            
            step.data.sequenceBefore.forEach((token, idx) => {
                const tokenClass = idx < promptLength ? 'sequence-token prompt' : 'sequence-token generated';
                html += `
                    <div class="${tokenClass}">
                        ${token}
                        <div class="token-position">${idx}</div>
                    </div>
                `;
            });
            html += '</div>';
            
            // Show newly generated token
            html += '<p style="color: #666; margin: 20px 0 10px 0;">Newly generated token:</p>';
            html += '<div class="token-sequence">';
            html += `
                <div class="sequence-token generating">
                    ${step.data.token}
                    <div style="margin-top: 5px; font-size: 12px;">
                        ${(step.data.probability * 100).toFixed(1)}%
                    </div>
                </div>
            `;
            html += '</div>';
            
            // Show complete sequence
            html += '<p style="color: #666; margin: 20px 0 10px 0;">Complete sequence:</p>';
            html += '<div class="token-sequence">';
            
            step.data.sequenceAfter.forEach((token, idx) => {
                let tokenClass = 'sequence-token';
                if (idx < promptLength) {
                    tokenClass += ' prompt';
                } else if (idx === step.data.sequenceAfter.length - 1) {
                    tokenClass += ' generating';
                } else {
                    tokenClass += ' generated';
                }
                
                html += `
                    <div class="${tokenClass}">
                        ${token}
                        <div class="token-position">${idx}</div>
                    </div>
                `;
            });
            html += '</div>';
            
        } else {
            // For other phases, show current sequence
            html += '<div class="token-sequence">';
            
            const tokens = step.tokens || [];
            tokens.forEach((token, idx) => {
                let tokenClass = 'sequence-token';
                if (idx < promptLength) {
                    tokenClass += ' prompt';
                } else if (idx < promptLength + generationStep) {
                    tokenClass += ' generated';
                } else if (idx === promptLength + generationStep && step.phase === 'output') {
                    tokenClass += ' generating';
                }
                
                html += `
                    <div class="${tokenClass}">
                        ${token}
                        <div class="token-position">${idx}</div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        html += '</div>';
        
        // Show causal mask for attention steps (only for small sequences)
        if (step.causalMask && step.tokens && step.tokens.length <= 8) {
            html += this.renderCausalMask(step.causalMask, step.tokens);
        }
        
        // Show probability distribution for output phase
        if (step.phase === 'output' && step.data && Array.isArray(step.data)) {
            html += `
                <div class="probability-chart">
                    <h4>Next Token Probabilities (Temperature: ${this.config.temperature})</h4>
                    <p style="color: #666; margin-bottom: 15px;">
                        Predicting token to follow: "${(step.tokens || []).join(' ')}"
                    </p>
                    ${this.renderProbabilityChart(step.data, step.selectedIndex)}
                </div>
            `;
        }
        
        // Show details for attention phase
        if (step.phase === 'attention' && step.currentPosition !== undefined) {
            const currentToken = step.tokens && step.tokens[step.currentPosition] ? step.tokens[step.currentPosition] : '';
            html += `
                <div class="debug-info">
                    <strong>Processing position:</strong> ${step.currentPosition} (last token: "${currentToken}")
                    <br>
                    <strong>Attention:</strong> This position can attend to positions 0-${step.currentPosition}
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Animate probability bars
        if (step.phase === 'output') {
            setTimeout(() => {
                document.querySelectorAll('.prob-fill').forEach(fill => {
                    const width = fill.dataset.width;
                    if (width) {
                        fill.style.width = width;
                    }
                });
            }, 100);
        }
    }
    
    renderCausalMask(mask, tokens) {
        let html = `
            <div class="causal-mask-demo">
                <h4>Causal Attention Mask</h4>
                <p style="margin: 10px 0; color: #666;">Each token can only attend to previous tokens (autoregressive)</p>
                <div class="mask-grid" style="grid-template-columns: repeat(${tokens.length + 1}, 30px);">
        `;
        
        // Header row
        html += '<div class="mask-cell"></div>';
        tokens.forEach((token, idx) => {
            html += `<div class="mask-cell attention-label" title="${token}">${idx}</div>`;
        });
        
        // Mask rows
        mask.forEach((row, i) => {
            html += `<div class="mask-cell attention-label" title="${tokens[i]}">${i}</div>`;
            row.forEach((allowed, j) => {
                const cellClass = allowed ? 'allowed' : 'masked';
                const title = allowed ? 
                    `Token ${i} (${tokens[i]}) CAN attend to token ${j} (${tokens[j]})` :
                    `Token ${i} (${tokens[i]}) CANNOT attend to token ${j} (${tokens[j]})`;
                html += `<div class="mask-cell ${cellClass}" title="${title}">${allowed ? '✓' : '✗'}</div>`;
            });
        });
        
        html += '</div></div>';
        return html;
    }
    
    updateAttentionView(step) {
        const container = document.querySelector('.attention-container');
        
        if (!step.attentionWeights) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">No attention weights for this step</p>';
            return;
        }
        
        const tokens = step.tokens || [];
        const mask = step.causalMask;
        
        container.innerHTML = '<h3>Causal Self-Attention Patterns</h3>';
        
        if (mask) {
            container.innerHTML += '<p style="color: #666; margin-bottom: 20px;">Red cells indicate masked positions (cannot attend to future tokens)</p>';
        }
        
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
            tokens.forEach((token, idx) => {
                const label = document.createElement('div');
                label.className = 'attention-cell attention-label';
                label.textContent = idx;
                label.title = token;
                grid.appendChild(label);
            });
            
            // Add rows
            headWeights.forEach((row, i) => {
                // Row label
                const rowLabel = document.createElement('div');
                rowLabel.className = 'attention-cell attention-label';
                rowLabel.textContent = i;
                rowLabel.title = tokens[i];
                grid.appendChild(rowLabel);
                
                // Weight cells
                row.forEach((weight, j) => {
                    const cell = document.createElement('div');
                    cell.className = 'attention-cell';
                    
                    // Check if this position is masked
                    const isMasked = mask && !mask[i][j];
                    
                    if (isMasked) {
                        cell.className += ' masked-attention';
                        cell.textContent = '—';
                        cell.title = `Masked: ${tokens[i]} cannot attend to future token ${tokens[j]}`;
                    } else {
                        // Color based on weight intensity
                        const intensity = Math.floor(weight * 255);
                        const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                        cell.style.background = color;
                        cell.style.color = intensity < 128 ? 'black' : 'white';
                        cell.textContent = weight.toFixed(2);
                        cell.title = `${tokens[i]} → ${tokens[j]}: ${weight.toFixed(4)}`;
                    }
                    
                    grid.appendChild(cell);
                });
            });
            
            heatmap.appendChild(grid);
            headsContainer.appendChild(heatmap);
        });
        
        container.appendChild(headsContainer);
    }
    
    updateDataFlowView(step) {
        const container = document.querySelector('.dataflow-container');
        
        let html = `
            <h3>${step.name}</h3>
            <div class="tensor-view">
                <div class="tensor-shape">Shape: ${step.shape}</div>
        `;
        
        if (step.tokens && step.phase === 'embedding') {
            html += `
                <div style="margin: 10px 0;">
                    <strong>Tokens:</strong> ${step.tokens.map((t, i) => 
                        `<span style="background: ${i < this.tokenize(document.getElementById('transformer-input').value).length ? '#e3f2fd' : '#e8f5e9'}; 
                        padding: 2px 6px; border-radius: 3px; margin: 0 2px;">${t}</span>`
                    ).join('')}
                </div>
            `;
        }
        
        if (step.phase === 'output' && step.logits) {
            html += '<div style="margin: 10px 0;"><strong>Output Type:</strong> Logits → Probabilities (via softmax)</div>';
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
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return '<div class="loading">No data available</div>';
        }
        
        // Handle 1D array (probability distribution)
        if (Array.isArray(data) && typeof data[0] === 'number') {
            let html = '';
            const maxShow = 20;
            
            // Sort by probability to show most likely tokens
            const indexed = data.map((p, i) => ({ prob: p, idx: i, token: this.config.vocab[i] }));
            indexed.sort((a, b) => b.prob - a.prob);
            
            for (let i = 0; i < Math.min(indexed.length, maxShow); i++) {
                const item = indexed[i];
                const value = item.prob.toFixed(4);
                const percent = (item.prob * 100).toFixed(1);
                const intensity = Math.min(item.prob * 5, 1); // Scale for visibility
                const color = `rgba(52, 152, 219, ${intensity})`;
                
                html += `
                    <div class="tensor-value" style="background: ${color}; color: ${intensity > 0.5 ? 'white' : 'black'}">
                        <div style="font-size: 10px; opacity: 0.7;">${item.token}</div>
                        <div>${percent}%</div>
                    </div>
                `;
            }
            
            if (indexed.length > maxShow) {
                html += `<div class="tensor-value">... ${indexed.length - maxShow} more</div>`;
            }
            
            return html;
        }
        
        // Handle 2D array (embeddings, hidden states)
        let html = '';
        const maxRows = 3;
        const maxCols = 10;
        
        for (let i = 0; i < Math.min(data.length, maxRows); i++) {
            for (let j = 0; j < Math.min(data[i].length, maxCols); j++) {
                const value = data[i][j].toFixed(3);
                const intensity = Math.min(Math.abs(data[i][j]), 1);
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
    
    renderProbabilityChart(probs, selectedIndex) {
        if (!probs) return '';
        
        // Get top K predictions
        const indexed = probs.map((p, i) => ({ prob: p, idx: i }));
        indexed.sort((a, b) => b.prob - a.prob);
        const topIndices = indexed.slice(0, this.config.topK);
        
        return topIndices.map(({ prob, idx }) => {
            const percent = (prob * 100).toFixed(1);
            const isSelected = idx === selectedIndex;
            
            return `
                <div class="prob-bar ${isSelected ? 'selected' : ''}">
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
        this.state.generatedTokens = [];
        this.state.isGenerating = false;
        
        document.getElementById('play-btn').textContent = '▶️ Play';
        document.getElementById('step-info').textContent = 'Step: 0/0';
        document.getElementById('step-title').textContent = 'Ready';
        document.getElementById('step-description').textContent = 'Click "Start Generation" to begin autoregressive text generation';
        document.getElementById('step-slider').value = 0;
        document.getElementById('step-details').classList.remove('active');
        
        this.highlightComponent(null, null);
        
        // Clear all views
        document.querySelector('.generation-container').innerHTML = '';
        document.querySelector('.attention-container').innerHTML = '';
        document.querySelector('.dataflow-container').innerHTML = '';
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