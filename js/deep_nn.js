// deep_nn.js - (FIXED) Interactive Transformer Architecture Demo

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
        
        // Initialize embeddings and projection weights/biases
        this.initializeEmbeddings();
        this.initializeProjectionWeights();
        
        // Caches
        this.posEncodingCache = new Map();
        this.maskCache = new Map();
        
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
        // Create random embedding matrix with better initialization
        this.embeddings = {};
        const scale = Math.sqrt(1.0 / this.config.hiddenDim);
        
        for (const token of this.config.vocab) {
            this.embeddings[token] = [];
            for (let i = 0; i < this.config.hiddenDim; i++) {
                // Initialize with scaled random values
                this.embeddings[token].push((Math.random() - 0.5) * 2 * scale);
            }
        }
    }
    
    initializeProjectionWeights() {
        // Create projection weights for output layer (logits)
        this.projectionWeights = [];
        // Create a separate bias vector
        this.projectionBiases = new Array(this.config.vocab.length).fill(0);
        
        // Initialize weights with Xavier/Glorot initialization
        const scale = Math.sqrt(2.0 / (this.config.hiddenDim + this.config.vocab.length));
        
        for (let v = 0; v < this.config.vocab.length; v++) {
            this.projectionWeights[v] = [];
            for (let h = 0; h < this.config.hiddenDim; h++) {
                this.projectionWeights[v][h] = (Math.random() - 0.5) * 2 * scale;
            }
        }
        
        // Apply linguistic biases to the BIAS vector
        
        // Severely penalize special tokens
        ['<PAD>', '<START>', '<END>', '<UNK>'].forEach(token => {
            const idx = this.config.vocab.indexOf(token);
            if (idx !== -1) {
                this.projectionBiases[idx] -= 10.0; // Stronger penalty
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
        
        // Apply category-based biases more carefully
        Object.entries(tokenCategories).forEach(([category, tokens]) => {
            tokens.forEach(token => {
                const idx = this.config.vocab.indexOf(token);
                if (idx !== -1) {
                    // More moderate positive bias for common words
                    this.projectionBiases[idx] += 0.5; 
                }
            });
        });
    }
    
    // Add layer normalization helper
    layerNorm(tensor) {
        if (!tensor || tensor.length === 0) return tensor;
        
        // Calculate mean
        const mean = tensor.reduce((sum, val) => sum + val, 0) / tensor.length;
        
        // Calculate variance
        const variance = tensor.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / tensor.length;
        
        // Normalize
        const std = Math.sqrt(variance + 1e-5); // Add small epsilon for stability
        return tensor.map(val => (val - mean) / std);
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
                
                <div class="view-content architecture-view active" id="architecture-view">
                    <svg id="architecture-svg" viewBox="0 0 800 600"></svg>
                </div>
                
                <div class="view-content generation-view" id="generation-view">
                    <div class="generation-container"></div>
                </div>
                
                <div class="view-content attention-view" id="attention-view">
                    <div class="attention-container"></div>
                </div>
                
                <div class="view-content dataflow-view" id="dataflow-view">
                    <div class="dataflow-container"></div>
                </div>
                
                <div class="controls-section">
                    <div class="playback-controls">
                        <button id="play-btn" class="control-btn">▶️ Play</button>
                        <button id="step-btn" class="control-btn">⏭️ Step</button>
                        <button id="reset-btn" class="control-btn">🔄 Reset</button>
                        <span id="step-info">Step: 0/0</span>
                    </div>
                    <div class="step-slider-container">
                        <input type="range" id="step-slider" min="0" max="0" value="0">
                    </div>
                    <div id="step-details" class="step-details">
                        <h4 id="step-title">Ready</h4>
                        <p id="step-description">Enter text and click "Start Generation" to begin</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupStyles() {
        const style = document.createElement('style');
        style.id = 'transformer-demo-styles';
        style.textContent = `
            .transformer-demo {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 1200px;
                margin: 20px auto;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            .demo-header {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .demo-header h3 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 24px;
            }
            
            .input-section {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            #transformer-input {
                flex: 1;
                padding: 10px;
                font-size: 16px;
                border: 2px solid #ddd;
                border-radius: 6px;
                transition: border-color 0.3s;
            }
            
            #transformer-input:focus {
                outline: none;
                border-color: #3498db;
            }
            
            .demo-button {
                padding: 10px 20px;
                font-size: 16px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .demo-button:hover:not(:disabled) {
                background: #2980b9;
            }
            
            .demo-button:disabled {
                background: #95a5a6;
                cursor: not-allowed;
            }
            
            .model-info {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .info-badge {
                padding: 4px 10px;
                background: #ecf0f1;
                color: #34495e;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .view-tabs {
                display: flex;
                gap: 5px;
                margin-bottom: 20px;
                background: #ecf0f1;
                padding: 5px;
                border-radius: 8px;
            }
            
            .view-tab {
                padding: 8px 16px;
                background: transparent;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
                font-weight: 500;
                color: #7f8c8d;
            }
            
            .view-tab:hover {
                background: rgba(52, 152, 219, 0.1);
            }
            
            .view-tab.active {
                background: white;
                color: #2c3e50;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .view-content {
                display: none;
                min-height: 400px;
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .view-content.active {
                display: block;
            }
            
            .architecture-view svg {
                width: 100%;
                height: auto;
                min-height: 500px;
            }
            
            .component {
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .component:hover .component-rect {
                filter: brightness(1.1);
            }
            
            .component.highlighted .component-rect {
                stroke: #e74c3c;
                stroke-width: 3;
                filter: drop-shadow(0 0 10px rgba(231, 76, 60, 0.5));
            }
            
            .controls-section {
                background: white;
                border-radius: 8px;
                padding: 20px;
            }
            
            .playback-controls {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .control-btn {
                padding: 8px 16px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.3s;
            }
            
            .control-btn:hover:not(:disabled) {
                background: #2980b9;
            }
            
            .control-btn:disabled {
                background: #95a5a6;
                cursor: not-allowed;
            }
            
            #step-info {
                margin-left: 10px;
                font-weight: 500;
                color: #34495e;
            }
            
            .step-slider-container {
                margin-bottom: 15px;
            }
            
            #step-slider {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #ecf0f1;
                outline: none;
                -webkit-appearance: none;
            }
            
            #step-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #3498db;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            #step-slider::-webkit-slider-thumb:hover {
                background: #2980b9;
            }
            
            .step-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #3498db;
            }
            
            .step-details.active {
                background: #fff9e6;
                border-left-color: #f39c12;
            }
            
            .step-details h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
                font-size: 18px;
            }
            
            .step-details p {
                margin: 0;
                color: #7f8c8d;
                line-height: 1.5;
            }
            
            .generation-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .token-sequence {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .token {
                padding: 8px 12px;
                background: white;
                border: 2px solid #3498db;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                position: relative;
            }
            
            .token.new {
                background: #e8f6ff;
                border-color: #2980b9;
                animation: tokenAppear 0.5s ease;
            }
            
            .token.generated {
                background: #d4edda;
                border-color: #27ae60;
            }
            
            .token-index {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #e74c3c;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
            }
            
            @keyframes tokenAppear {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .prob-chart {
                padding: 15px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
            }
            
            .prob-bar {
                display: grid;
                grid-template-columns: 100px 1fr 60px;
                gap: 10px;
                align-items: center;
                margin-bottom: 8px;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.3s;
            }
            
            .prob-bar:hover {
                background: #f0f0f0;
            }
            
            .prob-bar.selected {
                background: #e8f6ff;
                border: 1px solid #3498db;
            }
            
            .prob-label {
                font-family: 'Courier New', monospace;
                font-weight: bold;
                text-align: right;
            }
            
            .prob-value {
                background: #f0f0f0;
                height: 24px;
                border-radius: 12px;
                overflow: hidden;
                position: relative;
            }
            
            .prob-fill {
                height: 100%;
                background: linear-gradient(90deg, #3498db, #2980b9);
                border-radius: 12px;
                transition: width 0.5s ease;
            }
            
            .prob-bar.selected .prob-fill {
                background: linear-gradient(90deg, #27ae60, #229954);
            }
            
            .prob-percent {
                font-size: 12px;
                font-weight: bold;
                color: #34495e;
            }
            
            .attention-container {
                padding: 20px;
            }
            
            .attention-matrix {
                display: grid;
                gap: 2px;
                margin: 20px 0;
                max-width: 600px;
                margin: 0 auto;
            }
            
            .attention-cell {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .attention-cell:hover {
                transform: scale(1.1);
                z-index: 10;
            }
            
            .matrix-labels {
                display: grid;
                gap: 2px;
            }
            
            .matrix-label {
                padding: 4px;
                text-align: center;
                font-size: 12px;
                font-weight: bold;
                background: #ecf0f1;
                border-radius: 4px;
            }
            
            .dataflow-container {
                padding: 20px;
            }
            
            .dataflow-stage {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
            }
            
            .dataflow-stage h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
            }
            
            .tensor-view {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
                gap: 4px;
                padding: 10px;
                background: white;
                border-radius: 6px;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .tensor-value {
                padding: 8px;
                text-align: center;
                font-size: 11px;
                font-family: 'Courier New', monospace;
                border-radius: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .error {
                background: #fee;
                color: #c00;
                padding: 10px;
                border-radius: 6px;
                margin-bottom: 10px;
                border-left: 4px solid #c00;
            }
            
            .loading {
                text-align: center;
                padding: 40px;
                color: #95a5a6;
            }
            
            .loading::after {
                content: '...';
                display: inline-block;
                animation: dots 1.5s steps(4, end) infinite;
            }
            
            @keyframes dots {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Process button
        const processBtn = document.getElementById('process-btn');
        const processBtnHandler = () => this.processInput();
        processBtn.addEventListener('click', processBtnHandler);
        this.eventCleanup.push(() => processBtn.removeEventListener('click', processBtnHandler));
        
        // View tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            const tabHandler = (e) => this.switchView(e.target.dataset.view);
            tab.addEventListener('click', tabHandler);
            this.eventCleanup.push(() => tab.removeEventListener('click', tabHandler));
        });
        
        // Playback controls
        const playBtn = document.getElementById('play-btn');
        const playBtnHandler = () => this.togglePlayback();
        playBtn.addEventListener('click', playBtnHandler);
        this.eventCleanup.push(() => playBtn.removeEventListener('click', playBtnHandler));
        
        const stepBtn = document.getElementById('step-btn');
        const stepBtnHandler = () => this.stepForward();
        stepBtn.addEventListener('click', stepBtnHandler);
        this.eventCleanup.push(() => stepBtn.removeEventListener('click', stepBtnHandler));
        
        const resetBtn = document.getElementById('reset-btn');
        const resetBtnHandler = () => this.reset();
        resetBtn.addEventListener('click', resetBtnHandler);
        this.eventCleanup.push(() => resetBtn.removeEventListener('click', resetBtnHandler));
        
        // Step slider
        const stepSlider = document.getElementById('step-slider');
        const sliderHandler = (e) => this.goToStep(parseInt(e.target.value));
        stepSlider.addEventListener('input', sliderHandler);
        this.eventCleanup.push(() => stepSlider.removeEventListener('input', sliderHandler));
        
        // Enter key on input
        const inputField = document.getElementById('transformer-input');
        const inputHandler = (e) => {
            if (e.key === 'Enter') this.processInput();
        };
        inputField.addEventListener('keypress', inputHandler);
        this.eventCleanup.push(() => inputField.removeEventListener('keypress', inputHandler));
    }
    
    drawArchitecture() {
        const svg = document.getElementById('architecture-svg');
        if (!svg) return;
        
        // Clear existing content
        svg.innerHTML = '';
        
        // Create component groups
        const components = [
            { id: 'input', x: 50, y: 500, width: 120, height: 40, label: 'Input Tokens', color: '#3498db' },
            { id: 'embedding', x: 50, y: 420, width: 120, height: 40, label: 'Embeddings', color: '#9b59b6' },
            { id: 'pos-encoding', x: 200, y: 420, width: 120, height: 40, label: 'Positional\nEncoding', color: '#e67e22' },
            { id: 'transformer-1', x: 125, y: 320, width: 120, height: 60, label: 'Transformer\nLayer 1', color: '#27ae60' },
            { id: 'transformer-2', x: 125, y: 220, width: 120, height: 60, label: 'Transformer\nLayer 2', color: '#27ae60' },
            { id: 'output', x: 125, y: 120, width: 120, height: 40, label: 'Output\nProjection', color: '#e74c3c' },
            { id: 'vocab', x: 125, y: 40, width: 120, height: 40, label: 'Vocab Logits', color: '#34495e' }
        ];
        
        // Create attention detail boxes
        const attentionDetails = [
            { x: 350, y: 300, width: 180, height: 100, label: 'Multi-Head\nCausal Attention' },
            { x: 550, y: 300, width: 150, height: 100, label: 'Feed-Forward\nNetwork' }
        ];
        
        // Draw connections
        const connections = [
            { from: 'input', to: 'embedding' },
            { from: 'embedding', to: 'transformer-1', type: 'merge' },
            { from: 'pos-encoding', to: 'transformer-1', type: 'merge' },
            { from: 'transformer-1', to: 'transformer-2' },
            { from: 'transformer-2', to: 'output' },
            { from: 'output', to: 'vocab' }
        ];
        
        connections.forEach(conn => {
            const fromComp = components.find(c => c.id === conn.from);
            const toComp = components.find(c => c.id === conn.to);
            
            if (fromComp && toComp) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromComp.x + fromComp.width / 2);
                line.setAttribute('y1', fromComp.y);
                line.setAttribute('x2', toComp.x + toComp.width / 2);
                line.setAttribute('y2', toComp.y + toComp.height);
                line.setAttribute('stroke', '#bdc3c7');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('marker-end', 'url(#arrowhead)');
                svg.appendChild(line);
            }
        });
        
        // Draw components
        components.forEach(comp => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.classList.add('component');
            g.setAttribute('data-component', comp.id);
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.classList.add('component-rect');
            rect.setAttribute('x', comp.x);
            rect.setAttribute('y', comp.y);
            rect.setAttribute('width', comp.width);
            rect.setAttribute('height', comp.height);
            rect.setAttribute('fill', comp.color);
            rect.setAttribute('rx', '6');
            rect.setAttribute('stroke', '#2c3e50');
            rect.setAttribute('stroke-width', '1');
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', comp.x + comp.width / 2);
            text.setAttribute('y', comp.y + comp.height / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', '14');
            text.setAttribute('font-weight', 'bold');
            
            // Handle multi-line labels
            const lines = comp.label.split('\n');
            if (lines.length > 1) {
                lines.forEach((line, i) => {
                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    tspan.textContent = line;
                    tspan.setAttribute('x', comp.x + comp.width / 2);
                    tspan.setAttribute('dy', i === 0 ? -(lines.length - 1) * 6 : 12);
                    text.appendChild(tspan);
                });
            } else {
                text.textContent = comp.label;
            }
            
            g.appendChild(rect);
            g.appendChild(text);
            svg.appendChild(g);
        });
        
        // Draw attention details
        attentionDetails.forEach(detail => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', detail.x);
            rect.setAttribute('y', detail.y);
            rect.setAttribute('width', detail.width);
            rect.setAttribute('height', detail.height);
            rect.setAttribute('fill', '#ecf0f1');
            rect.setAttribute('stroke', '#95a5a6');
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('stroke-dasharray', '5,5');
            rect.setAttribute('rx', '4');
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', detail.x + detail.width / 2);
            text.setAttribute('y', detail.y + detail.height / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', '#7f8c8d');
            text.setAttribute('font-size', '12');
            
            const lines = detail.label.split('\n');
            lines.forEach((line, i) => {
                const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                tspan.textContent = line;
                tspan.setAttribute('x', detail.x + detail.width / 2);
                tspan.setAttribute('dy', i === 0 ? -(lines.length - 1) * 6 : 12);
                text.appendChild(tspan);
            });
            
            g.appendChild(rect);
            g.appendChild(text);
            svg.appendChild(g);
        });
        
        // Add arrow marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#bdc3c7');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        // Add connecting lines from transformer layers to detail boxes
        const detailLines = [
            { from: { x: 245, y: 350 }, to: { x: 350, y: 350 } },
            { from: { x: 245, y: 250 }, to: { x: 350, y: 320 } },
            { from: { x: 530, y: 350 }, to: { x: 550, y: 350 } }
        ];
        
        detailLines.forEach(line => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            path.setAttribute('x1', line.from.x);
            path.setAttribute('y1', line.from.y);
            path.setAttribute('x2', line.to.x);
            path.setAttribute('y2', line.to.y);
            path.setAttribute('stroke', '#95a5a6');
            path.setAttribute('stroke-width', '1');
            path.setAttribute('stroke-dasharray', '3,3');
            svg.appendChild(path);
        });
    }
    
    async processInput() {
        const input = document.getElementById('transformer-input').value.trim();
        if (!input) {
            this.showError('Please enter some text');
            return;
        }
        
        // Disable button during processing
        const processBtn = document.getElementById('process-btn');
        processBtn.disabled = true;
        processBtn.textContent = 'Generating...';
        
        try {
            // Reset state
            this.reset();
            
            // Tokenize input
            const tokens = this.tokenize(input);
            
            // Generate tokens autoregressively
            await this.generateTokens(tokens);
            
        } catch (error) {
            console.error('Error processing input:', error);
            this.showError('An error occurred during processing');
        } finally {
            processBtn.disabled = false;
            processBtn.textContent = 'Start Generation';
        }
    }
    
    tokenize(text) {
        // Simple whitespace tokenization
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        
        // Map words to vocabulary
        return words.map(word => {
            if (this.config.vocab.includes(word)) {
                return word;
            }
            return '<UNK>';
        });
    }
    
    async generateTokens(initialTokens) {
        this.state.isGenerating = true;
        let currentTokens = [...initialTokens];
        const maxGeneratedTokens = 5; // Generate up to 5 new tokens
        
        for (let step = 0; step < maxGeneratedTokens; step++) {
            // Create processing steps for this generation
            const genSteps = [];
            
            // Step 1: Show current sequence
            genSteps.push({
                type: 'sequence',
                title: `Token Generation - Step ${step + 1}`,
                description: `Generating token ${step + 1} of ${maxGeneratedTokens}`,
                data: {
                    tokens: currentTokens,
                    highlight: currentTokens.length - 1
                }
            });
            
            // Step 2: Forward pass through transformer
            const { logits, attentionMaps } = this.forwardPass(currentTokens);
            
            genSteps.push({
                type: 'forward',
                title: 'Forward Pass',
                description: 'Processing sequence through transformer layers',
                data: {
                    tokens: currentTokens,
                    logits: logits,
                    attention: attentionMaps
                }
            });
            
            // Step 3: Sample next token
            const probs = this.softmax(logits[logits.length - 1], this.config.temperature);
            const nextTokenIdx = this.sampleFromDistribution(probs);
            const nextToken = this.config.vocab[nextTokenIdx];
            
            genSteps.push({
                type: 'sampling',
                title: 'Token Selection',
                description: `Selected "${nextToken}" with probability ${(probs[nextTokenIdx] * 100).toFixed(1)}%`,
                data: {
                    probs: probs,
                    selected: nextTokenIdx,
                    token: nextToken
                }
            });
            
            // Add token to sequence
            currentTokens.push(nextToken);
            this.state.generatedTokens.push(nextToken);
            
            // Add steps to global state
            this.state.processingSteps.push(...genSteps);
            
            // Update visualization for immediate feedback
            this.updateVisualization();
            
            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Stop if we hit END token or max length
            if (nextToken === '<END>' || currentTokens.length >= this.config.maxLength) {
                break;
            }
        }
        
        this.state.isGenerating = false;
        
        // Update slider range
        const slider = document.getElementById('step-slider');
        slider.max = this.state.processingSteps.length - 1;
    }
    
    forwardPass(tokens) {
        // Convert tokens to embeddings
        const embeddings = tokens.map(token => [...this.embeddings[token]]);
        
        // Add positional encoding
        const posEncoded = this.addPositionalEncoding(embeddings);
        
        // Process through transformer layers
        let hidden = posEncoded;
        const attentionMaps = [];
        
        for (let layer = 0; layer < this.config.numLayers; layer++) {
            const { output, attention } = this.transformerLayer(hidden, layer);
            hidden = output;
            attentionMaps.push(attention);
        }
        
        // Apply layer normalization to the final hidden states
        const normalized = hidden.map(h => this.layerNorm(h));
        
        // Project to vocabulary
        const logits = normalized.map(h => this.projectToVocab(h));
        
        return { logits, attentionMaps };
    }
    
    addPositionalEncoding(embeddings) {
        return embeddings.map((emb, pos) => {
            const encoded = [...emb];
            for (let i = 0; i < this.config.hiddenDim; i++) {
                const angle = pos / Math.pow(this.config.posEncodingBase, (2 * i) / this.config.hiddenDim);
                if (i % 2 === 0) {
                    encoded[i] += Math.sin(angle) * 0.1; // Scale down position encoding
                } else {
                    encoded[i] += Math.cos(angle) * 0.1;
                }
            }
            return encoded;
        });
    }
    
    transformerLayer(input, layerIdx) {
        // Multi-head causal attention
        const { output: attnOutput, weights } = this.multiHeadAttention(input);
        
        // Residual connection and layer norm
        const attnNormed = input.map((inp, i) => {
            const residual = inp.map((val, j) => val + attnOutput[i][j]);
            return this.layerNorm(residual);
        });
        
        // Feed-forward network
        const ffOutput = this.feedForward(attnNormed);
        
        // Residual connection and layer norm
        const output = attnNormed.map((inp, i) => {
            const residual = inp.map((val, j) => val + ffOutput[i][j]);
            return this.layerNorm(residual);
        });
        
        return { output, attention: weights };
    }
    
    multiHeadAttention(input) {
        const seqLen = input.length;
        const headDim = Math.floor(this.config.hiddenDim / this.config.numHeads);
        
        // Initialize attention weights
        const attentionWeights = Array(seqLen).fill(null).map(() => Array(seqLen).fill(0));
        
        // Process each head
        const headOutputs = [];
        for (let head = 0; head < this.config.numHeads; head++) {
            const startIdx = head * headDim;
            const endIdx = startIdx + headDim;
            
            // Extract head dimensions
            const headInput = input.map(vec => vec.slice(startIdx, endIdx));
            
            // Compute attention for this head
            const scores = [];
            for (let i = 0; i < seqLen; i++) {
                const queryVec = headInput[i];
                const rowScores = [];
                
                for (let j = 0; j < seqLen; j++) {
                    if (j > i) {
                        // Causal masking
                        rowScores.push(-Infinity);
                    } else {
                        const keyVec = headInput[j];
                        const score = this.dotProduct(queryVec, keyVec) / Math.sqrt(headDim);
                        rowScores.push(score);
                    }
                }
                scores.push(rowScores);
            }
            
            // Apply softmax to get attention weights
            const weights = scores.map(row => this.softmax(row, 1.0));
            
            // Accumulate attention weights
            for (let i = 0; i < seqLen; i++) {
                for (let j = 0; j < seqLen; j++) {
                    attentionWeights[i][j] += weights[i][j] / this.config.numHeads;
                }
            }
            
            // Apply attention
            const headOutput = [];
            for (let i = 0; i < seqLen; i++) {
                const weighted = Array(headDim).fill(0);
                for (let j = 0; j <= i; j++) {
                    const valueVec = headInput[j];
                    for (let k = 0; k < headDim; k++) {
                        weighted[k] += weights[i][j] * valueVec[k];
                    }
                }
                headOutput.push(weighted);
            }
            
            headOutputs.push(headOutput);
        }
        
        // Concatenate head outputs
        const output = [];
        for (let i = 0; i < seqLen; i++) {
            const concatenated = [];
            for (let head = 0; head < this.config.numHeads; head++) {
                concatenated.push(...headOutputs[head][i]);
            }
            output.push(concatenated);
        }
        
        return { output, weights: attentionWeights };
    }
    
    feedForward(input) {
        return input.map(vec => {
            // Simple 2-layer FFN with ReLU
            const hidden = vec.map(val => Math.max(0, val * 0.5 + 0.1)); // First layer with ReLU
            return hidden.map(val => val * 0.5); // Second layer
        });
    }
    
    projectToVocab(hiddenState) {
        const logits = [];
        
        for (let v = 0; v < this.config.vocab.length; v++) {
            let logit = this.projectionBiases[v]; // Start with bias
            
            // Add weighted sum of hidden state
            for (let h = 0; h < this.config.hiddenDim; h++) {
                logit += hiddenState[h] * this.projectionWeights[v][h];
            }
            
            logits.push(logit);
        }
        
        // Apply a small amount of regularization to prevent extreme values
        const maxLogit = Math.max(...logits);
        const minLogit = Math.min(...logits);
        const range = maxLogit - minLogit;
        
        if (range > 20) {
            // Clip extreme values
            return logits.map(l => {
                if (l > maxLogit - range * 0.1) return maxLogit - range * 0.1;
                if (l < minLogit + range * 0.1) return minLogit + range * 0.1;
                return l;
            });
        }
        
        return logits;
    }
    
    softmax(logits, temperature = 1.0) {
        // Adjust logits with temperature
        const scaledLogits = logits.map(l => l / temperature);
        
        // Compute stable softmax
        const maxLogit = Math.max(...scaledLogits.filter(l => l !== -Infinity));
        const expValues = scaledLogits.map(l => {
            if (l === -Infinity) return 0;
            return Math.exp(l - maxLogit);
        });
        
        const sumExp = expValues.reduce((sum, val) => sum + val, 0);
        
        // Avoid division by zero
        if (sumExp === 0) {
            // Return uniform distribution
            return logits.map(() => 1 / logits.length);
        }
        
        return expValues.map(val => val / sumExp);
    }
    
    sampleFromDistribution(probs) {
        const random = Math.random();
        let cumSum = 0;
        
        for (let i = 0; i < probs.length; i++) {
            cumSum += probs[i];
            if (random < cumSum) {
                return i;
            }
        }
        
        // Fallback to last index
        return probs.length - 1;
    }
    
    dotProduct(vec1, vec2) {
        return vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
    }
    
    highlightComponent(layerType, layerIndex) {
        // Remove existing highlights
        document.querySelectorAll('.component').forEach(comp => {
            comp.classList.remove('highlighted');
        });
        
        // Add new highlight
        if (layerType) {
            const componentMap = {
                'input': 'input',
                'embedding': 'embedding',
                'positional': 'pos-encoding',
                'transformer': layerIndex !== undefined ? `transformer-${layerIndex + 1}` : 'transformer-1',
                'output': 'output',
                'vocab': 'vocab'
            };
            
            const componentId = componentMap[layerType];
            const component = document.querySelector(`[data-component="${componentId}"]`);
            if (component) {
                component.classList.add('highlighted');
            }
        }
    }
    
    updateVisualization() {
        const step = this.state.processingSteps[this.state.currentStep];
        if (!step) return;
        
        // Update step info
        document.getElementById('step-info').textContent = 
            `Step: ${this.state.currentStep + 1}/${this.state.processingSteps.length}`;
        document.getElementById('step-title').textContent = step.title || 'Processing';
        document.getElementById('step-description').textContent = step.description || '';
        document.getElementById('step-slider').value = this.state.currentStep;
        document.getElementById('step-details').classList.add('active');
        
        // Update view-specific content
        switch (this.state.currentView) {
            case 'generation':
                this.updateGenerationView(step);
                break;
            case 'attention':
                this.updateAttentionView(step);
                break;
            case 'dataflow':
                this.updateDataflowView(step);
                break;
        }
        
        // Highlight architecture component
        if (step.type === 'embedding') {
            this.highlightComponent('embedding');
        } else if (step.type === 'positional') {
            this.highlightComponent('positional');
        } else if (step.type === 'forward') {
            this.highlightComponent('transformer', 0);
        } else if (step.type === 'sampling') {
            this.highlightComponent('vocab');
        }
        
        // Continue playback if playing
        if (this.state.isPlaying && this.state.currentStep < this.state.processingSteps.length - 1) {
            setTimeout(() => {
                if (this.state.isPlaying) {
                    this.state.currentStep++;
                    this.updateVisualization();
                }
            }, this.config.playbackSpeed);
        } else if (this.state.isPlaying) {
            this.state.isPlaying = false;
            document.getElementById('play-btn').textContent = '▶️ Play';
        }
    }
    
    updateGenerationView(step) {
        const container = document.querySelector('.generation-container');
        if (!container) return;
        
        let html = '';
        
        if (step.type === 'sequence' || step.type === 'forward' || step.type === 'sampling') {
            // Show token sequence
            const tokens = step.data.tokens || [];
            html += '<div class="generation-step">';
            html += '<h4>Sequence before generation:</h4>';
            html += '<div class="token-sequence">';
            
            tokens.forEach((token, idx) => {
                const isNew = idx === tokens.length - 1 && step.type === 'sampling';
                const isGenerated = idx >= (tokens.length - this.state.generatedTokens.length);
                html += `
                    <div class="token ${isNew ? 'new' : ''} ${isGenerated ? 'generated' : ''}">
                        ${token}
                        <span class="token-index">${idx}</span>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Show newly generated token if in sampling step
            if (step.type === 'sampling' && step.data.token) {
                html += '<h4>Newly generated token:</h4>';
                html += '<div class="token-sequence">';
                html += `
                    <div class="token new">
                        ${step.data.token}
                        <div style="font-size: 12px; margin-top: 4px;">
                            ${(step.data.probs[step.data.selected] * 100).toFixed(1)}%
                        </div>
                    </div>
                `;
                html += '</div>';
            }
            
            // Show complete sequence if we have generated tokens
            if (this.state.generatedTokens.length > 0) {
                html += '<h4>Complete sequence:</h4>';
                html += '<div class="token-sequence">';
                
                const allTokens = [...tokens];
                allTokens.forEach((token, idx) => {
                    const isGenerated = this.state.generatedTokens.includes(token) && 
                                      idx >= (allTokens.length - this.state.generatedTokens.length);
                    html += `
                        <div class="token ${isGenerated ? 'generated' : ''}">
                            ${token}
                            <span class="token-index">${idx}</span>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            // Show probability distribution for next token
            if (step.data.probs) {
                const tokens = step.data.tokens || [];
                const contextTokens = tokens.slice(-4).join(' ');
                
                html += '<div class="prob-chart">';
                html += `<h4>Next Token Probabilities (Temperature: ${this.config.temperature})</h4>`;
                html += `<p style="font-size: 14px; color: #7f8c8d;">Predicting token to follow: "${contextTokens}"</p>`;
                html += this.renderProbabilityChart(step.data.probs, step.data.selected);
                html += '</div>';
            }
            
            html += '<div style="margin-top: 20px; padding: 15px; background: #e8f6ff; border-radius: 8px;">';
            html += `<strong>Current Step:</strong> ${step.title} (Step ${this.state.currentStep + 1})`;
            if (step.data.token) {
                html += `<br><strong>Selected "${step.data.token}"</strong> (${(step.data.probs[step.data.selected] * 100).toFixed(1)}% probability)`;
            }
            html += '</div>';
            
            html += '</div>';
        }
        
        container.innerHTML = html;
        
        // Animate probability bars
        setTimeout(() => {
            document.querySelectorAll('.prob-fill').forEach(fill => {
                const width = fill.dataset.width;
                fill.style.width = width;
            });
        }, 50);
    }
    
    updateAttentionView(step) {
        const container = document.querySelector('.attention-container');
        if (!container) return;
        
        let html = '<div class="attention-view">';
        
        if (step.data && step.data.attention && step.data.attention.length > 0) {
            const tokens = step.data.tokens || [];
            const attention = step.data.attention[step.data.attention.length - 1]; // Show last layer
            
            html += '<h4>Causal Attention Weights (Last Layer)</h4>';
            html += '<p style="color: #7f8c8d; margin-bottom: 20px;">Showing how each token attends to previous tokens (darker = stronger attention)</p>';
            
            // Create attention matrix visualization
            const size = Math.min(tokens.length, 10); // Limit size for display
            html += `<div class="attention-matrix" style="grid-template-columns: repeat(${size + 1}, 1fr);">`;
            
            // Header row
            html += '<div></div>'; // Empty corner
            for (let j = 0; j < size; j++) {
                html += `<div class="matrix-label">${tokens[j]}</div>`;
            }
            
            // Matrix rows
            for (let i = 0; i < size; i++) {
                html += `<div class="matrix-label">${tokens[i]}</div>`;
                for (let j = 0; j < size; j++) {
                    if (j > i) {
                        // Masked (future) positions
                        html += '<div class="attention-cell" style="background: #ecf0f1; cursor: not-allowed;">-</div>';
                    } else {
                        const weight = attention[i][j];
                        const intensity = Math.min(weight, 1);
                        const color = `rgba(52, 152, 219, ${intensity})`;
                        html += `
                            <div class="attention-cell" 
                                 style="background: ${color};"
                                 title="${tokens[i]} → ${tokens[j]}: ${(weight * 100).toFixed(1)}%">
                                ${(weight * 100).toFixed(0)}%
                            </div>
                        `;
                    }
                }
            }
            
            html += '</div>';
            
            // Explanation
            html += '<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">';
            html += '<h5 style="margin-top: 0;">Understanding Causal Attention:</h5>';
            html += '<ul style="margin: 10px 0; padding-left: 20px;">';
            html += '<li>Each row shows what a token "looks at"</li>';
            html += '<li>Gray cells are masked (can\'t see future tokens)</li>';
            html += '<li>Darker blue = stronger attention weight</li>';
            html += '<li>Each row sums to 100% (softmax normalization)</li>';
            html += '</ul>';
            html += '</div>';
        } else {
            html += '<p class="loading">No attention data available for this step</p>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    updateDataflowView(step) {
        const container = document.querySelector('.dataflow-container');
        if (!container) return;
        
        let html = '<div class="dataflow-view">';
        
        if (step.data) {
            // Show different data based on step type
            if (step.data.tokens) {
                html += '<div class="dataflow-stage">';
                html += '<h4>Input Tokens</h4>';
                html += '<div class="tensor-view">';
                step.data.tokens.forEach((token, idx) => {
                    html += `<div class="tensor-value" style="background: #3498db; color: white;">${token}</div>`;
                });
                html += '</div>';
                html += '</div>';
            }
            
            if (step.data.embeddings) {
                html += '<div class="dataflow-stage">';
                html += '<h4>Token Embeddings</h4>';
                html += '<p style="font-size: 12px; color: #7f8c8d;">Hidden dimension: ${this.config.hiddenDim}</p>';
                html += '<div class="tensor-view">';
                html += this.renderTensor(step.data.embeddings);
                html += '</div>';
                html += '</div>';
            }
            
            if (step.data.hidden) {
                html += '<div class="dataflow-stage">';
                html += '<h4>Hidden States</h4>';
                html += '<div class="tensor-view">';
                html += this.renderTensor(step.data.hidden);
                html += '</div>';
                html += '</div>';
            }
            
            if (step.data.logits) {
                html += '<div class="dataflow-stage">';
                html += '<h4>Output Logits (Last Token)</h4>';
                html += '<p style="font-size: 12px; color: #7f8c8d;">Raw scores before softmax</p>';
                html += '<div class="tensor-view">';
                const lastLogits = step.data.logits[step.data.logits.length - 1];
                html += this.renderTensor(lastLogits, true);
                html += '</div>';
                html += '</div>';
            }
            
            if (step.data.probs) {
                html += '<div class="dataflow-stage">';
                html += '<h4>Probability Distribution</h4>';
                html += '<p style="font-size: 12px; color: #7f8c8d;">After softmax with temperature=${this.config.temperature}</p>';
                html += '<div class="tensor-view">';
                html += this.renderTensor(step.data.probs, true);
                html += '</div>';
                html += '</div>';
            }
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    renderTensor(data, showTokens = false) {
        if (!data) return '<div class="loading">No data</div>';
        
        // Handle 1D array (logits, probabilities)
        if (Array.isArray(data) && !Array.isArray(data[0])) {
            let html = '';
            
            // If showing tokens, sort by value and show top entries
            if (showTokens) {
                const indexed = data.map((val, idx) => ({
                    value: val,
                    token: this.config.vocab[idx],
                    index: idx
                }));
                indexed.sort((a, b) => b.value - a.value);
                
                const maxShow = 20;
                for (let i = 0; i < Math.min(indexed.length, maxShow); i++) {
                    const item = indexed[i];
                    const percent = (item.value * 100).toFixed(1);
                    const intensity = Math.min(Math.abs(item.value), 1);
                    const color = item.value >= 0 ? 
                        `rgba(52, 152, 219, ${intensity})` : 
                        `rgba(231, 76, 60, ${intensity})`;
                    
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
            
            // Regular tensor display
            const maxVals = 20;
            for (let i = 0; i < Math.min(data.length, maxVals); i++) {
                const value = data[i].toFixed(3);
                const intensity = Math.min(Math.abs(data[i]), 1);
                const color = data[i] >= 0 ? 
                    `rgba(52, 152, 219, ${intensity})` : 
                    `rgba(231, 76, 60, ${intensity})`;
                
                html += `<div class="tensor-value" style="background: ${color}; color: ${intensity > 0.5 ? 'white' : 'black'}">${value}</div>`;
            }
            
            if (data.length > maxVals) {
                html += `<div class="tensor-value">... ${data.length - maxVals} more</div>`;
            }
            
            return html;
        }
        
        // Handle 2D array (embeddings, hidden states)
        if (Array.isArray(data) && Array.isArray(data[0])) {
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

        // Fallback for unknown data structures
        return '<div class="loading">Cannot render data</div>';
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
            const token = this.config.vocab[idx];
            
            if (!token) return ''; // Safety check
            
            return `
                <div class="prob-bar ${isSelected ? 'selected' : ''}">
                    <div class="prob-label">${token}</div>
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
            if (this.state.currentStep >= this.state.processingSteps.length -1) {
                this.state.currentStep = 0;
            } else {
                 this.state.currentStep++;
            }
            this.updateVisualization();
        }
    }
    
    stepForward() {
        this.state.isPlaying = false;
        document.getElementById('play-btn').textContent = '▶️ Play';
        if (this.state.currentStep < this.state.processingSteps.length - 1) {
            this.state.currentStep++;
            this.updateVisualization();
        }
    }
    
    goToStep(step) {
        this.state.isPlaying = false;
        document.getElementById('play-btn').textContent = '▶️ Play';
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
        document.getElementById('step-slider').max = 0;
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
        
        // Clear caches
        if (this.posEncodingCache) {
            this.posEncodingCache.clear();
        }
        if (this.maskCache) {
            this.maskCache.clear();
        }
        
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