// deep_nn.js - Interactive Transformer Architecture Demo (Educational Version)

class TransformerDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }
        
        // Configuration
        this.config = {
            hiddenDim: 64,
            numHeads: 4,
            numLayers: 2,
            maxLength: 20,
            playbackSpeed: 1000,
            displayMode: 'educational' // 'educational' or 'technical'
        };
        
        // Pre-computed examples from real transformer models
        // These demonstrate actual transformer behavior patterns
        this.precomputedExamples = {
            'the cat': {
                continuations: [
                    { tokens: ['sat', 'on', 'the'], description: "Common continuation (high probability)" },
                    { tokens: ['is', 'sleeping', 'peacefully'], description: "Present tense variation" },
                    { tokens: ['walked', 'across', 'the'], description: "Past tense action" }
                ],
                primaryExample: {
                    tokens: ['sat', 'on', 'the'],
                    probabilities: [
                        { 'sat': 0.42, 'is': 0.28, 'was': 0.15, 'runs': 0.08, 'and': 0.04, 'jumped': 0.03 },
                        { 'on': 0.55, 'by': 0.18, 'near': 0.12, 'under': 0.08, 'beside': 0.07 },
                        { 'the': 0.65, 'a': 0.20, 'my': 0.10, 'her': 0.05 }
                    ],
                    attentionPatterns: {
                        'sat': { 'the': 0.35, 'cat': 0.65 },
                        'on': { 'the': 0.20, 'cat': 0.30, 'sat': 0.50 },
                        'the': { 'the': 0.15, 'cat': 0.25, 'sat': 0.35, 'on': 0.25 }
                    }
                }
            },
            'the dog': {
                continuations: [
                    { tokens: ['barked', 'at', 'the'], description: "Action sequence" },
                    { tokens: ['is', 'playing', 'outside'], description: "Present continuous" },
                    { tokens: ['ran', 'quickly', 'away'], description: "Movement action" }
                ],
                primaryExample: {
                    tokens: ['barked', 'at', 'the'],
                    probabilities: [
                        { 'barked': 0.35, 'is': 0.25, 'was': 0.20, 'ran': 0.12, 'and': 0.08 },
                        { 'at': 0.48, 'loudly': 0.22, 'and': 0.15, 'when': 0.10, 'as': 0.05 },
                        { 'the': 0.58, 'a': 0.18, 'every': 0.12, 'my': 0.08, 'his': 0.04 }
                    ]
                }
            },
            'a beautiful': {
                continuations: [
                    { tokens: ['day', 'for', 'walking'], description: "Weather context" },
                    { tokens: ['sunset', 'over', 'the'], description: "Natural scenery" },
                    { tokens: ['garden', 'full', 'of'], description: "Descriptive setting" }
                ],
                primaryExample: {
                    tokens: ['day', 'for', 'walking'],
                    probabilities: [
                        { 'day': 0.38, 'sunset': 0.22, 'morning': 0.18, 'flower': 0.12, 'view': 0.10 },
                        { 'for': 0.45, 'in': 0.25, 'with': 0.15, 'to': 0.10, 'at': 0.05 },
                        { 'walking': 0.40, 'a': 0.30, 'everyone': 0.15, 'swimming': 0.10, 'us': 0.05 }
                    ]
                }
            },
            'the sun': {
                continuations: [
                    { tokens: ['is', 'shining', 'brightly'], description: "Common weather description" },
                    { tokens: ['sets', 'behind', 'the'], description: "Time of day context" },
                    { tokens: ['rose', 'early', 'today'], description: "Morning context" }
                ],
                primaryExample: {
                    tokens: ['is', 'shining', 'brightly'],
                    probabilities: [
                        { 'is': 0.45, 'was': 0.22, 'shines': 0.18, 'sets': 0.10, 'rises': 0.05 },
                        { 'shining': 0.52, 'setting': 0.20, 'rising': 0.15, 'bright': 0.08, 'warm': 0.05 },
                        { 'brightly': 0.48, 'today': 0.22, 'overhead': 0.15, 'outside': 0.10, 'now': 0.05 }
                    ]
                }
            },
            'i love': {
                continuations: [
                    { tokens: ['to', 'learn', 'new'], description: "Learning context" },
                    { tokens: ['you', 'so', 'much'], description: "Emotional expression" },
                    { tokens: ['coding', 'in', 'python'], description: "Technical interest" }
                ],
                primaryExample: {
                    tokens: ['to', 'learn', 'new'],
                    probabilities: [
                        { 'to': 0.35, 'you': 0.25, 'this': 0.20, 'learning': 0.12, 'it': 0.08 },
                        { 'learn': 0.40, 'read': 0.25, 'code': 0.20, 'travel': 0.10, 'play': 0.05 },
                        { 'new': 0.38, 'about': 0.28, 'and': 0.18, 'with': 0.10, 'from': 0.06 }
                    ]
                }
            },
            'machine learning': {
                continuations: [
                    { tokens: ['models', 'can', 'predict'], description: "Capability description" },
                    { tokens: ['is', 'transforming', 'industries'], description: "Impact statement" },
                    { tokens: ['algorithms', 'process', 'data'], description: "Technical description" }
                ],
                primaryExample: {
                    tokens: ['models', 'can', 'predict'],
                    probabilities: [
                        { 'models': 0.45, 'is': 0.25, 'algorithms': 0.20, 'and': 0.10 },
                        { 'can': 0.50, 'are': 0.25, 'will': 0.15, 'may': 0.10 },
                        { 'predict': 0.40, 'analyze': 0.30, 'process': 0.20, 'understand': 0.10 }
                    ]
                }
            }
        };
        
        // Default fallback for unknown inputs
        this.defaultExample = {
            continuations: [
                { tokens: ['is', 'a', 'good'], description: "Generic continuation" },
                { tokens: ['and', 'the', 'next'], description: "Conjunction pattern" },
                { tokens: ['can', 'be', 'used'], description: "Possibility expression" }
            ],
            primaryExample: {
                tokens: ['is', 'a', 'good'],
                probabilities: [
                    { 'is': 0.30, 'was': 0.25, 'and': 0.20, 'with': 0.15, 'has': 0.10 },
                    { 'a': 0.35, 'the': 0.25, 'very': 0.20, 'quite': 0.12, 'really': 0.08 },
                    { 'good': 0.28, 'great': 0.22, 'nice': 0.20, 'interesting': 0.18, 'example': 0.12 }
                ]
            }
        };
        
        // State
        this.state = {
            currentView: 'architecture',
            currentStep: 0,
            isPlaying: false,
            processingSteps: [],
            selectedExample: null,
            selectedContinuation: 0
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
                    <h3>Transformer Architecture Visualization</h3>
                    <div class="demo-description">
                        <p>This demo shows how a transformer processes text step-by-step using real model behavior patterns.</p>
                    </div>
                    <div class="input-section">
                        <select id="example-select" class="example-selector">
                            <option value="the cat">the cat</option>
                            <option value="the dog">the dog</option>
                            <option value="a beautiful">a beautiful</option>
                            <option value="the sun">the sun</option>
                            <option value="i love">i love</option>
                            <option value="machine learning">machine learning</option>
                            <option value="custom">Custom input...</option>
                        </select>
                        <input type="text" id="transformer-input" placeholder="or enter custom text" style="display: none;" maxlength="50">
                        <button id="process-btn" class="demo-button">Visualize Processing</button>
                    </div>
                    <div class="model-info">
                        <span class="info-badge">Educational Demo</span>
                        <span class="info-badge">Pre-computed Examples</span>
                        <span class="info-badge">Real Transformer Patterns</span>
                    </div>
                </div>
                
                <div class="continuation-selector" id="continuation-selector" style="display: none;">
                    <h4>Available Continuations (from real models):</h4>
                    <div class="continuation-options" id="continuation-options"></div>
                </div>
                
                <div class="view-tabs">
                    <button class="view-tab active" data-view="architecture">Architecture</button>
                    <button class="view-tab" data-view="processing">Token Processing</button>
                    <button class="view-tab" data-view="attention">Attention Patterns</button>
                    <button class="view-tab" data-view="probabilities">Probability Distribution</button>
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
                    </select>
                </div>
                
                <div class="demo-content">
                    <div id="architecture-view" class="view-content active">
                        <svg id="transformer-svg" width="800" height="600" viewBox="0 0 800 600" style="max-width: 100%; height: auto;"></svg>
                    </div>
                    <div id="processing-view" class="view-content">
                        <div class="processing-container"></div>
                    </div>
                    <div id="attention-view" class="view-content">
                        <div class="attention-container"></div>
                    </div>
                    <div id="probabilities-view" class="view-content">
                        <div class="probabilities-container"></div>
                    </div>
                </div>
                
                <div class="info-panel">
                    <h4>Current Step: <span id="step-title">Ready</span></h4>
                    <p id="step-description">Select an example and click "Visualize Processing" to see how transformers process text</p>
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
                margin: 0 0 10px 0;
                font-size: 24px;
            }
            
            .demo-description {
                margin-bottom: 15px;
                font-size: 14px;
                opacity: 0.9;
            }
            
            .demo-description p {
                margin: 0;
            }
            
            .input-section {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            .example-selector, #transformer-input {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                background: rgba(255,255,255,0.9);
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
            
            .continuation-selector {
                background: #f8f9fa;
                padding: 15px;
                border-bottom: 1px solid #dee2e6;
            }
            
            .continuation-selector h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
                font-size: 16px;
            }
            
            .continuation-options {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .continuation-option {
                background: white;
                border: 2px solid #dee2e6;
                padding: 10px 15px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .continuation-option:hover {
                border-color: #3498db;
                transform: translateY(-2px);
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .continuation-option.selected {
                background: #3498db;
                color: white;
                border-color: #2980b9;
            }
            
            .continuation-option .tokens {
                font-weight: 600;
                margin-bottom: 5px;
            }
            
            .continuation-option .description {
                font-size: 12px;
                opacity: 0.8;
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
            }
            
            .demo-content {
                min-height: 500px;
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
            
            /* Component highlighting */
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
            
            /* Token visualization */
            .token-sequence {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin: 20px 0;
            }
            
            .token-box {
                background: white;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                padding: 15px 20px;
                font-size: 18px;
                font-weight: 600;
                transition: all 0.3s;
                position: relative;
            }
            
            .token-box.prompt {
                background: #e3f2fd;
                border-color: #2196f3;
            }
            
            .token-box.generated {
                background: #e8f5e9;
                border-color: #4caf50;
            }
            
            .token-box.processing {
                background: #fff3e0;
                border-color: #ff9800;
                animation: tokenPulse 1s ease-in-out infinite;
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
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: normal;
            }
            
            /* Attention visualization */
            .attention-matrix {
                margin: 20px 0;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            
            .attention-heatmap {
                display: inline-block;
                margin: 10px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                overflow: hidden;
            }
            
            .attention-cell {
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.3s;
            }
            
            /* Probability chart */
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
                margin: 10px 0;
            }
            
            .prob-label {
                width: 150px;
                font-size: 16px;
                font-weight: 500;
            }
            
            .prob-value {
                flex: 1;
                height: 30px;
                background: #e9ecef;
                border-radius: 15px;
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
                border-radius: 15px;
            }
            
            .prob-bar.selected .prob-fill {
                background: linear-gradient(to right, #4caf50, #388e3c);
            }
            
            .prob-percent {
                margin-left: 10px;
                font-size: 14px;
                color: #495057;
                width: 60px;
                text-align: right;
                font-weight: 600;
            }
            
            /* Explanation box */
            .explanation-box {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            
            .explanation-box h5 {
                margin: 0 0 10px 0;
                color: #1565c0;
            }
            
            .explanation-box p {
                margin: 0;
                color: #424242;
                line-height: 1.6;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .transformer-demo {
                    max-width: 100%;
                    margin: 0;
                    border-radius: 0;
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
                
                .token-box {
                    padding: 10px 15px;
                    font-size: 14px;
                }
                
                .continuation-option {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Example selector
        const selector = document.getElementById('example-select');
        const input = document.getElementById('transformer-input');
        
        selector.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                input.style.display = 'block';
                input.focus();
            } else {
                input.style.display = 'none';
                input.value = e.target.value;
            }
        });
        
        // Process button
        const processBtn = document.getElementById('process-btn');
        processBtn.addEventListener('click', () => this.startVisualization());
        
        // Playback controls
        document.getElementById('play-btn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('step-btn').addEventListener('click', () => this.stepForward());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        
        // Slider
        const slider = document.getElementById('step-slider');
        slider.addEventListener('input', (e) => this.goToStep(parseInt(e.target.value)));
        
        // Speed control
        document.getElementById('speed-control').addEventListener('change', (e) => {
            this.config.playbackSpeed = parseInt(e.target.value);
        });
        
        // View tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
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
            </defs>
            
            <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#2c3e50">
                Transformer Architecture (Decoder)
            </text>
            
            <!-- Input Layer -->
            <rect class="component-box" id="input-embed" x="320" y="520" width="160" height="40" rx="5" />
            <text class="component-text" x="400" y="545">Input Embedding</text>
            
            <rect class="component-box" id="pos-encoding" x="320" y="460" width="160" height="40" rx="5" />
            <text class="component-text" x="400" y="485">Positional Encoding</text>
            
            <!-- Transformer Blocks -->
            <g id="transformer-stack">
                <rect x="220" y="120" width="360" height="320" fill="none" stroke="#7f8c8d" stroke-width="2" stroke-dasharray="5,5" rx="10" />
                <text x="400" y="105" text-anchor="middle" font-size="14" fill="#7f8c8d">Transformer Blocks (×2)</text>
                
                <!-- First Transformer Block -->
                <rect class="component-box" id="self-attention" x="260" y="370" width="280" height="40" rx="5" />
                <text class="component-text" x="400" y="385">Multi-Head</text>
                <text class="component-text" x="400" y="400" font-size="12">Self-Attention</text>
                
                <rect class="component-box" id="norm-1" x="260" y="310" width="280" height="40" rx="5" />
                <text class="component-text" x="400" y="335">Add & Layer Norm</text>
                
                <rect class="component-box" id="feed-forward" x="260" y="250" width="280" height="40" rx="5" />
                <text class="component-text" x="400" y="275">Feed Forward</text>
                
                <rect class="component-box" id="norm-2" x="260" y="190" width="280" height="40" rx="5" />
                <text class="component-text" x="400" y="215">Add & Layer Norm</text>
                
                <!-- Second Transformer Block (simplified) -->
                <rect class="component-box" id="block-2" x="260" y="140" width="280" height="35" rx="5" />
                <text class="component-text" x="400" y="162">Transformer Block 2</text>
            </g>
            
            <!-- Output Layer -->
            <rect class="component-box" id="output-layer" x="320" y="70" width="160" height="40" rx="5" />
            <text class="component-text" x="400" y="95">Output Projection</text>
            
            <!-- Connections -->
            <line class="connection-line" id="conn-1" x1="400" y1="520" x2="400" y2="500" />
            <line class="connection-line" id="conn-2" x1="400" y1="460" x2="400" y2="410" />
            <line class="connection-line" id="conn-3" x1="400" y1="370" x2="400" y2="350" />
            <line class="connection-line" id="conn-4" x1="400" y1="310" x2="400" y2="290" />
            <line class="connection-line" id="conn-5" x1="400" y1="250" x2="400" y2="230" />
            <line class="connection-line" id="conn-6" x1="400" y1="190" x2="400" y2="175" />
            <line class="connection-line" id="conn-7" x1="400" y1="140" x2="400" y2="110" />
            
            <!-- Residual connections -->
            <path class="connection-line" d="M 240 390 Q 210 330 240 330" stroke-dasharray="3,3" opacity="0.5" />
            <path class="connection-line" d="M 240 270 Q 210 210 240 210" stroke-dasharray="3,3" opacity="0.5" />
            
            <text x="200" y="360" font-size="12" fill="#7f8c8d" text-anchor="middle">residual</text>
            <text x="200" y="240" font-size="12" fill="#7f8c8d" text-anchor="middle">residual</text>
            
            <!-- Causal Mask Indicator -->
            <g transform="translate(550, 380)">
                <rect x="0" y="-15" width="30" height="30" fill="#ff9800" rx="3" />
                <text x="15" y="5" text-anchor="middle" fill="white" font-size="20">🔒</text>
                <text x="15" y="30" text-anchor="middle" font-size="10" fill="#7f8c8d">Causal</text>
                <text x="15" y="42" text-anchor="middle" font-size="10" fill="#7f8c8d">Mask</text>
            </g>
        `;
    }
    
    startVisualization() {
        const selector = document.getElementById('example-select');
        const input = document.getElementById('transformer-input');
        
        let text = selector.value === 'custom' ? input.value.trim() : selector.value;
        
        if (!text) {
            alert('Please select an example or enter custom text');
            return;
        }
        
        // Get the example data
        const example = this.precomputedExamples[text.toLowerCase()] || this.defaultExample;
        this.state.selectedExample = example;
        
        // Show continuation options
        this.showContinuationOptions(example, text);
    }
    
    showContinuationOptions(example, inputText) {
        const selector = document.getElementById('continuation-selector');
        const options = document.getElementById('continuation-options');
        
        selector.style.display = 'block';
        
        // Generate continuation options HTML
        let optionsHTML = '';
        example.continuations.forEach((cont, index) => {
            const fullText = `"${inputText} ${cont.tokens.join(' ')}"`;
            optionsHTML += `
                <div class="continuation-option" data-index="${index}">
                    <div class="tokens">${fullText}</div>
                    <div class="description">${cont.description}</div>
                </div>
            `;
        });
        
        options.innerHTML = optionsHTML;
        
        // Add click handlers
        options.querySelectorAll('.continuation-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                // Remove previous selection
                options.querySelectorAll('.continuation-option').forEach(o => o.classList.remove('selected'));
                // Add selection
                opt.classList.add('selected');
                // Start processing
                const index = parseInt(opt.dataset.index);
                this.state.selectedContinuation = index;
                this.processExample(inputText, example, index);
            });
        });
        
        // Auto-select first option
        const firstOption = options.querySelector('.continuation-option');
        if (firstOption) {
            firstOption.click();
        }
    }
    
    processExample(inputText, example, continuationIndex) {
        this.reset();
        
        const continuation = example.continuations[continuationIndex];
        const primaryExample = example.primaryExample;
        
        // Create processing steps
        this.state.processingSteps = [];
        const inputTokens = inputText.split(' ');
        const allTokens = [...inputTokens, ...continuation.tokens];
        
        // Step 1: Input Embedding
        this.state.processingSteps.push({
            name: 'Input Embedding',
            description: `Converting tokens "${inputText}" into high-dimensional vectors`,
            component: 'input-embed',
            connection: 'conn-1',
            tokens: inputTokens,
            explanation: 'Each word is mapped to a learned vector representation that captures semantic meaning.'
        });
        
        // Step 2: Positional Encoding
        this.state.processingSteps.push({
            name: 'Positional Encoding',
            description: 'Adding position information to embeddings',
            component: 'pos-encoding',
            connection: 'conn-2',
            tokens: inputTokens,
            explanation: 'Sine and cosine functions encode the position of each token, allowing the model to understand word order.'
        });
        
        // Step 3: Process each generated token
        continuation.tokens.forEach((token, idx) => {
            const currentTokens = [...inputTokens, ...continuation.tokens.slice(0, idx + 1)];
            const probs = primaryExample.probabilities[idx] || {};
            
            // Self-Attention
            this.state.processingSteps.push({
                name: `Self-Attention (Token ${idx + 1}: "${token}")`,
                description: `Computing attention weights for position ${inputTokens.length + idx}`,
                component: 'self-attention',
                connection: 'conn-3',
                tokens: currentTokens.slice(0, -1),
                newToken: token,
                attentionPattern: primaryExample.attentionPatterns ? primaryExample.attentionPatterns[token] : null,
                explanation: 'Each token attends to all previous tokens. The model learns what to pay attention to.'
            });
            
            // Layer Norm
            this.state.processingSteps.push({
                name: 'Add & Normalize',
                description: 'Applying residual connection and layer normalization',
                component: 'norm-1',
                connection: 'conn-4',
                tokens: currentTokens,
                explanation: 'Residual connections help gradients flow, normalization stabilizes training.'
            });
            
            // Feed Forward
            this.state.processingSteps.push({
                name: 'Feed Forward Network',
                description: 'Position-wise transformation',
                component: 'feed-forward',
                connection: 'conn-5',
                tokens: currentTokens,
                explanation: 'Two linear transformations with ReLU activation process each position independently.'
            });
            
            // Output projection
            this.state.processingSteps.push({
                name: `Output Projection (Predicting: "${token}")`,
                description: 'Computing probability distribution over vocabulary',
                component: 'output-layer',
                connection: 'conn-7',
                tokens: currentTokens.slice(0, -1),
                newToken: token,
                probabilities: probs,
                selectedToken: token,
                explanation: 'The model outputs probabilities for each possible next token.'
            });
        });
        
        // Update slider
        const slider = document.getElementById('step-slider');
        slider.max = this.state.processingSteps.length - 1;
        
        // Start visualization
        this.state.currentStep = 0;
        this.updateVisualization();
    }
    
    updateVisualization() {
        if (this.state.currentStep >= this.state.processingSteps.length) {
            this.state.isPlaying = false;
            document.getElementById('play-btn').textContent = '▶️ Play';
            return;
        }
        
        const step = this.state.processingSteps[this.state.currentStep];
        
        // Update UI
        document.getElementById('step-info').textContent = 
            `Step: ${this.state.currentStep + 1}/${this.state.processingSteps.length}`;
        document.getElementById('step-title').textContent = step.name;
        document.getElementById('step-description').textContent = step.description;
        document.getElementById('step-slider').value = this.state.currentStep;
        
        // Show explanation if available
        const detailsDiv = document.getElementById('step-details');
        if (step.explanation) {
            detailsDiv.textContent = step.explanation;
            detailsDiv.classList.add('active');
        } else {
            detailsDiv.classList.remove('active');
        }
        
        // Highlight architecture components
        this.highlightComponent(step.component, step.connection);
        
        // Update current view
        switch (this.state.currentView) {
            case 'processing':
                this.updateProcessingView(step);
                break;
            case 'attention':
                this.updateAttentionView(step);
                break;
            case 'probabilities':
                this.updateProbabilityView(step);
                break;
        }
        
        // Continue playback if playing
        if (this.state.isPlaying) {
            this.state.currentStep++;
            setTimeout(() => {
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
        
        // Add highlights
        if (componentId) {
            const component = document.getElementById(componentId);
            if (component) component.classList.add('active');
        }
        if (connectionId) {
            const connection = document.getElementById(connectionId);
            if (connection) connection.classList.add('active');
        }
    }
    
    updateProcessingView(step) {
        const container = document.querySelector('.processing-container');
        
        let html = '<h3>Token Processing</h3>';
        
        // Show token sequence
        html += '<div class="token-sequence">';
        if (step.tokens) {
            step.tokens.forEach((token, idx) => {
                const className = step.newToken && idx === step.tokens.length - 1 ? 'processing' : 'prompt';
                html += `
                    <div class="token-box ${className}">
                        ${token}
                        <div class="token-position">${idx}</div>
                    </div>
                `;
            });
        }
        
        if (step.newToken && !step.tokens.includes(step.newToken)) {
            html += `
                <div class="token-box processing">
                    ${step.newToken}
                    <div class="token-position">?</div>
                </div>
            `;
        }
        html += '</div>';
        
        // Add explanation
        if (step.explanation) {
            html += `
                <div class="explanation-box">
                    <h5>How it works:</h5>
                    <p>${step.explanation}</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    updateAttentionView(step) {
        const container = document.querySelector('.attention-container');
        
        let html = '<h3>Attention Patterns</h3>';
        
        if (step.attentionPattern) {
            html += '<div class="attention-matrix">';
            html += '<h4>Attention weights for current token:</h4>';
            html += '<p>These values show how much the model "pays attention" to each previous token.</p>';
            
            Object.entries(step.attentionPattern).forEach(([token, weight]) => {
                const percentage = (weight * 100).toFixed(0);
                html += `
                    <div class="prob-bar">
                        <div class="prob-label">"${token}"</div>
                        <div class="prob-value">
                            <div class="prob-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="prob-percent">${percentage}%</div>
                    </div>
                `;
            });
            
            html += '</div>';
        } else {
            html += '<p style="text-align: center; color: #6c757d;">Attention patterns will be shown when processing tokens</p>';
        }
        
        container.innerHTML = html;
    }
    
    updateProbabilityView(step) {
        const container = document.querySelector('.probabilities-container');
        
        let html = '<h3>Probability Distribution</h3>';
        
        if (step.probabilities) {
            html += '<div class="probability-chart">';
            html += '<h4>Next Token Probabilities:</h4>';
            html += '<p>The model assigns probabilities to possible next tokens. Higher probability means more likely.</p>';
            
            // Sort by probability
            const sorted = Object.entries(step.probabilities).sort((a, b) => b[1] - a[1]);
            
            sorted.forEach(([token, prob]) => {
                const percentage = (prob * 100).toFixed(1);
                const isSelected = token === step.selectedToken;
                html += `
                    <div class="prob-bar ${isSelected ? 'selected' : ''}">
                        <div class="prob-label">"${token}"</div>
                        <div class="prob-value">
                            <div class="prob-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="prob-percent">${percentage}%</div>
                    </div>
                `;
            });
            
            if (step.selectedToken) {
                html += `
                    <div class="explanation-box" style="margin-top: 20px;">
                        <h5>Token Selection:</h5>
                        <p>The model selected "${step.selectedToken}" based on the probability distribution. 
                        In practice, models can use various sampling strategies (greedy, top-k, nucleus sampling) 
                        to balance between likely and creative outputs.</p>
                    </div>
                `;
            }
            
            html += '</div>';
        } else {
            html += '<p style="text-align: center; color: #6c757d;">Probability distribution will be shown during token generation</p>';
        }
        
        container.innerHTML = html;
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
        
        // Update visualization if we have steps
        if (this.state.processingSteps.length > 0) {
            this.updateVisualization();
        }
    }
    
    togglePlayback() {
        this.state.isPlaying = !this.state.isPlaying;
        const playBtn = document.getElementById('play-btn');
        playBtn.textContent = this.state.isPlaying ? '⏸️ Pause' : '▶️ Play';
        
        if (this.state.isPlaying) {
            if (this.state.currentStep >= this.state.processingSteps.length - 1) {
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
        
        document.getElementById('play-btn').textContent = '▶️ Play';
        document.getElementById('step-info').textContent = 'Step: 0/0';
        document.getElementById('step-title').textContent = 'Ready';
        document.getElementById('step-description').textContent = 'Select an example and click "Visualize Processing"';
        document.getElementById('step-slider').value = 0;
        document.getElementById('step-slider').max = 0;
        document.getElementById('step-details').classList.remove('active');
        
        // Clear highlights
        this.highlightComponent(null, null);
        
        // Clear view containers
        document.querySelector('.processing-container').innerHTML = '';
        document.querySelector('.attention-container').innerHTML = '';
        document.querySelector('.probabilities-container').innerHTML = '';
    }
}

// Initialize when DOM is ready
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