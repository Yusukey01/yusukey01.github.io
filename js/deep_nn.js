// Interactive Attention Mechanism Visualizer

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('transformer_demo');
    
    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // Create HTML structure
    container.innerHTML = `
        <div class="attention-container">
            <div class="attention-layout">
                <div class="attention-visualization">
                    <div class="input-section">
                        <h3>Input Sentence</h3>
                        <input type="text" id="input-sentence" value="The cat sat on mat" placeholder="Enter a short sentence...">
                        <button id="process-btn" class="primary-btn">Process with Attention</button>
                    </div>
                    
                    <div class="visualization-tabs">
                        <button class="viz-tab active" data-tab="single">Single-Head Attention</button>
                        <button class="viz-tab" data-tab="multi">Multi-Head Attention</button>
                        <button class="viz-tab" data-tab="position">Positional Encoding</button>
                    </div>
                    
                    <div class="viz-content">
                        <!-- Single-Head Attention Tab -->
                        <div id="single-tab" class="viz-pane active">
                            <div class="attention-steps">
                                <div class="step-section">
                                    <h4>Step 1: Token Embeddings</h4>
                                    <div id="token-embeddings"></div>
                                </div>
                                
                                <div class="step-section">
                                    <h4>Step 2: Query, Key, Value Projections</h4>
                                    <div class="qkv-matrices">
                                        <div class="matrix-display">
                                            <h5>Q (Query)</h5>
                                            <canvas id="query-matrix" width="200" height="150"></canvas>
                                        </div>
                                        <div class="matrix-display">
                                            <h5>K (Key)</h5>
                                            <canvas id="key-matrix" width="200" height="150"></canvas>
                                        </div>
                                        <div class="matrix-display">
                                            <h5>V (Value)</h5>
                                            <canvas id="value-matrix" width="200" height="150"></canvas>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="step-section">
                                    <h4>Step 3: Attention Scores (QK<sup>T</sup>/√d<sub>k</sub>)</h4>
                                    <canvas id="attention-scores" width="300" height="300"></canvas>
                                    <div class="score-info">
                                        <span>Hover over cells to see score calculation</span>
                                        <div id="score-detail"></div>
                                    </div>
                                </div>
                                
                                <div class="step-section">
                                    <h4>Step 4: Attention Weights (Softmax)</h4>
                                    <canvas id="attention-weights" width="300" height="300"></canvas>
                                    <div class="weight-legend">
                                        <span>0.0</span>
                                        <div class="gradient-bar"></div>
                                        <span>1.0</span>
                                    </div>
                                </div>
                                
                                <div class="step-section">
                                    <h4>Step 5: Attended Values</h4>
                                    <div id="output-values"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Multi-Head Attention Tab -->
                        <div id="multi-tab" class="viz-pane">
                            <div class="multi-head-grid">
                                <div id="head-visualizations"></div>
                                <div class="concat-section">
                                    <h4>Concatenated & Projected Output</h4>
                                    <canvas id="multi-output" width="400" height="150"></canvas>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Positional Encoding Tab -->
                        <div id="position-tab" class="viz-pane">
                            <div class="position-encoding">
                                <h4>Sinusoidal Positional Encoding</h4>
                                <canvas id="position-encoding-viz" width="600" height="300"></canvas>
                                <div class="encoding-info">
                                    <p>PE(pos, 2i) = sin(pos/10000<sup>2i/d</sup>)</p>
                                    <p>PE(pos, 2i+1) = cos(pos/10000<sup>2i/d</sup>)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="controls-panel">
                    <h3>Parameters</h3>
                    
                    <div class="control-group">
                        <label for="embedding-dim">Embedding Dimension (d<sub>model</sub>):</label>
                        <input type="range" id="embedding-dim" min="4" max="16" step="2" value="8">
                        <span id="dim-display">8</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="num-heads">Number of Attention Heads:</label>
                        <input type="range" id="num-heads" min="1" max="4" step="1" value="2">
                        <span id="heads-display">2</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="temperature">Temperature (for visualization):</label>
                        <input type="range" id="temperature" min="0.5" max="2.0" step="0.1" value="1.0">
                        <span id="temp-display">1.0</span>
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
            </div>
        </div>
    `;

    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
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
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
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
            background: #3498db;
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
            color: #2c3e50;
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
        
        .matrix-display h5 {
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
            background: linear-gradient(to right, #f0f0f0, #3498db);
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
        
        .multi-head-grid {
            display: grid;
            gap: 20px;
        }
        
        #head-visualizations {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .head-viz {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .head-viz h5 {
            margin-bottom: 10px;
            text-align: center;
            color: #34495e;
        }
        
        .concat-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
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
        }
    `;
    document.head.appendChild(styleElement);

    // Get DOM elements
    const elements = {
        inputSentence: document.getElementById('input-sentence'),
        processBtn: document.getElementById('process-btn'),
        embeddingDim: document.getElementById('embedding-dim'),
        dimDisplay: document.getElementById('dim-display'),
        numHeads: document.getElementById('num-heads'),
        headsDisplay: document.getElementById('heads-display'),
        temperature: document.getElementById('temperature'),
        tempDisplay: document.getElementById('temp-display'),
        computationInfo: document.getElementById('computation-info'),
        
        // Visualization elements
        tokenEmbeddings: document.getElementById('token-embeddings'),
        queryMatrix: document.getElementById('query-matrix'),
        keyMatrix: document.getElementById('key-matrix'),
        valueMatrix: document.getElementById('value-matrix'),
        attentionScores: document.getElementById('attention-scores'),
        attentionWeights: document.getElementById('attention-weights'),
        outputValues: document.getElementById('output-values'),
        scoreDetail: document.getElementById('score-detail'),
        
        // Multi-head elements
        headVisualizations: document.getElementById('head-visualizations'),
        multiOutput: document.getElementById('multi-output'),
        
        // Positional encoding
        positionEncodingViz: document.getElementById('position-encoding-viz'),
        
        // Tabs
        vizTabs: document.querySelectorAll('.viz-tab'),
        vizPanes: document.querySelectorAll('.viz-pane')
    };

    // State variables
    let tokens = [];
    let embeddings = [];
    let Q, K, V;
    let attentionScores = [];
    let attentionWeights = [];
    let outputVectors = [];
    let multiHeadResults = [];

    // Helper functions
    function tokenize(sentence) {
        // Simple tokenization by splitting on spaces and converting to lowercase
        return sentence.toLowerCase().split(/\s+/).filter(token => token.length > 0);
    }

    function initializeRandomMatrix(rows, cols, scale = 0.5) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                matrix[i][j] = (Math.random() - 0.5) * scale;
            }
        }
        return matrix;
    }

    function createEmbeddings(tokens, dim) {
        // Create random embeddings for each token
        const embeddings = [];
        for (let token of tokens) {
            const embedding = [];
            // Use a simple hash to get consistent embeddings for same tokens
            let hash = 0;
            for (let i = 0; i < token.length; i++) {
                hash = ((hash << 5) - hash) + token.charCodeAt(i);
                hash = hash & hash;
            }
            Math.seedrandom(hash); // Use seeded random for consistency
            for (let i = 0; i < dim; i++) {
                embedding.push((Math.random() - 0.5) * 0.5);
            }
            embeddings.push(embedding);
        }
        return embeddings;
    }

    function matrixMultiply(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const rowsB = B.length;
        const colsB = B[0].length;
        
        if (colsA !== rowsB) {
            throw new Error('Invalid matrix dimensions for multiplication');
        }
        
        const result = [];
        for (let i = 0; i < rowsA; i++) {
            result[i] = [];
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    function transpose(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const result = [];
        for (let j = 0; j < cols; j++) {
            result[j] = [];
            for (let i = 0; i < rows; i++) {
                result[j][i] = matrix[i][j];
            }
        }
        return result;
    }

    function softmax(scores, temperature = 1.0) {
        const expScores = scores.map(score => Math.exp(score / temperature));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        return expScores.map(exp => exp / sumExp);
    }

    function computeAttention(Q, K, V, temperature = 1.0) {
        const seqLen = Q.length;
        const dim = K[0].length;
        
        // Compute QK^T
        const scores = matrixMultiply(Q, transpose(K));
        
        // Scale by sqrt(d_k)
        const scaledScores = scores.map(row => 
            row.map(score => score / Math.sqrt(dim))
        );
        
        // Apply softmax to each row
        const weights = scaledScores.map(row => softmax(row, temperature));
        
        // Compute weighted values
        const output = matrixMultiply(weights, V);
        
        return { scores: scaledScores, weights, output };
    }

    // Visualization functions
    function drawMatrix(canvas, matrix, title = '', colorScale = false) {
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
                    // Use color to represent values
                    const intensity = Math.max(0, Math.min(1, (value + 1) / 2));
                    const hue = 210; // Blue hue
                    ctx.fillStyle = `hsl(${hue}, 70%, ${90 - intensity * 40}%)`;
                } else {
                    // Grayscale
                    const gray = Math.floor(255 - Math.abs(value) * 100);
                    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                }
                
                ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth - 1, cellHeight - 1);
                
                // Draw value text if space allows
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

    function drawAttentionMatrix(canvas, matrix, tokens, onHover) {
        const ctx = canvas.getContext('2d');
        const size = matrix.length;
        const cellSize = canvas.width / (size + 1); // +1 for labels
        
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
                
                // Color based on attention weight
                const hue = 210;
                const lightness = 90 - intensity * 60;
                ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
                
                ctx.fillRect(
                    cellSize * (j + 1) + 1,
                    cellSize * (i + 1) + 1,
                    cellSize - 2,
                    cellSize - 2
                );
                
                // Draw value if cell is large enough
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
            canvas.onmousemove = (e) => {
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
            
            canvas.onmouseleave = () => {
                onHover(-1, -1, 0);
            };
        }
    }

    function drawPositionalEncoding(canvas, maxLen = 20, dim = 8) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Calculate positional encodings
        const encodings = [];
        for (let pos = 0; pos < maxLen; pos++) {
            encodings[pos] = [];
            for (let i = 0; i < dim; i++) {
                const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dim);
                encodings[pos][i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
            }
        }
        
        // Draw heatmap
        const cellWidth = width / maxLen;
        const cellHeight = height / dim;
        
        for (let pos = 0; pos < maxLen; pos++) {
            for (let i = 0; i < dim; i++) {
                const value = encodings[pos][i];
                const intensity = (value + 1) / 2; // Normalize to [0, 1]
                
                ctx.fillStyle = value >= 0 
                    ? `hsl(30, 70%, ${90 - intensity * 40}%)`  // Warm colors for positive
                    : `hsl(210, 70%, ${90 - (1 - intensity) * 40}%)`; // Cool colors for negative
                
                ctx.fillRect(
                    pos * cellWidth,
                    i * cellHeight,
                    cellWidth - 1,
                    cellHeight - 1
                );
            }
        }
        
        // Draw axes labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Position labels
        for (let pos = 0; pos < maxLen; pos += 5) {
            ctx.fillText(pos.toString(), pos * cellWidth + cellWidth / 2, height - 5);
        }
        
        // Dimension labels
        ctx.save();
        ctx.translate(10, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Embedding Dimension', 0, 0);
        ctx.restore();
    }

    function displayTokenEmbeddings() {
        elements.tokenEmbeddings.innerHTML = '';
        
        tokens.forEach((token, idx) => {
            const tokenBox = document.createElement('div');
            tokenBox.className = 'token-box';
            
            const label = document.createElement('div');
            label.className = 'token-label';
            label.textContent = token;
            
            const vector = document.createElement('div');
            vector.className = 'token-vector';
            vector.textContent = '[' + embeddings[idx].slice(0, 3).map(v => v.toFixed(2)).join(', ') + '...]';
            
            tokenBox.appendChild(label);
            tokenBox.appendChild(vector);
            elements.tokenEmbeddings.appendChild(tokenBox);
        });
    }

    function displayOutputValues() {
        elements.outputValues.innerHTML = '';
        
        tokens.forEach((token, idx) => {
            const tokenBox = document.createElement('div');
            tokenBox.className = 'token-box';
            
            const label = document.createElement('div');
            label.className = 'token-label';
            label.textContent = token;
            
            const vector = document.createElement('div');
            vector.className = 'token-vector';
            vector.textContent = '[' + outputVectors[idx].slice(0, 3).map(v => v.toFixed(2)).join(', ') + '...]';
            
            tokenBox.appendChild(label);
            tokenBox.appendChild(vector);
            elements.outputValues.appendChild(tokenBox);
        });
    }

    function processAttention() {
        const sentence = elements.inputSentence.value.trim();
        if (!sentence) return;
        
        const dim = parseInt(elements.embeddingDim.value);
        const numHeads = parseInt(elements.numHeads.value);
        const temperature = parseFloat(elements.temperature.value);
        
        // Tokenize and create embeddings
        tokens = tokenize(sentence);
        embeddings = createEmbeddings(tokens, dim);
        
        // Create Q, K, V matrices (simple linear projections)
        const Wq = initializeRandomMatrix(dim, dim);
        const Wk = initializeRandomMatrix(dim, dim);
        const Wv = initializeRandomMatrix(dim, dim);
        
        Q = matrixMultiply(embeddings, Wq);
        K = matrixMultiply(embeddings, Wk);
        V = matrixMultiply(embeddings, Wv);
        
        // Compute attention
        const attention = computeAttention(Q, K, V, temperature);
        attentionScores = attention.scores;
        attentionWeights = attention.weights;
        outputVectors = attention.output;
        
        // Update visualizations
        displayTokenEmbeddings();
        drawMatrix(elements.queryMatrix, Q, 'Query', true);
        drawMatrix(elements.keyMatrix, K, 'Key', true);
        drawMatrix(elements.valueMatrix, V, 'Value', true);
        
        // Draw attention scores with hover
        drawAttentionMatrix(elements.attentionScores, attentionScores, tokens, (row, col, value) => {
            if (row >= 0 && col >= 0) {
                const dim = K[0].length;
                elements.scoreDetail.textContent = 
                    `${tokens[row]} → ${tokens[col]}: QK^T = ${(value * Math.sqrt(dim)).toFixed(3)}, scaled = ${value.toFixed(3)}`;
            } else {
                elements.scoreDetail.textContent = '';
            }
        });
        
        // Draw attention weights
        drawAttentionMatrix(elements.attentionWeights, attentionWeights, tokens);
        
        displayOutputValues();
        
        // Update computation info
        elements.computationInfo.innerHTML = `
            <p><strong>Tokens:</strong> ${tokens.length}</p>
            <p><strong>Embedding dim:</strong> ${dim}</p>
            <p><strong>Q, K, V shape:</strong> [${tokens.length}, ${dim}]</p>
            <p><strong>Attention shape:</strong> [${tokens.length}, ${tokens.length}]</p>
        `;
        
        // Process multi-head attention if on that tab
        if (document.querySelector('.viz-tab.active').dataset.tab === 'multi') {
            processMultiHeadAttention();
        }
    }

    function processMultiHeadAttention() {
        const dim = parseInt(elements.embeddingDim.value);
        const numHeads = parseInt(elements.numHeads.value);
        const temperature = parseFloat(elements.temperature.value);
        const headDim = Math.floor(dim / numHeads);
        
        elements.headVisualizations.innerHTML = '';
        multiHeadResults = [];
        
        for (let h = 0; h < numHeads; h++) {
            // Create separate projections for each head
            const Wq = initializeRandomMatrix(dim, headDim);
            const Wk = initializeRandomMatrix(dim, headDim);
            const Wv = initializeRandomMatrix(dim, headDim);
            
            const Qh = matrixMultiply(embeddings, Wq);
            const Kh = matrixMultiply(embeddings, Wk);
            const Vh = matrixMultiply(embeddings, Wv);
            
            const attention = computeAttention(Qh, Kh, Vh, temperature);
            multiHeadResults.push(attention);
            
            // Create visualization for this head
            const headDiv = document.createElement('div');
            headDiv.className = 'head-viz';
            
            const title = document.createElement('h5');
            title.textContent = `Head ${h + 1}`;
            headDiv.appendChild(title);
            
            const canvas = document.createElement('canvas');
            canvas.width = 250;
            canvas.height = 250;
            headDiv.appendChild(canvas);
            
            drawAttentionMatrix(canvas, attention.weights, tokens);
            
            elements.headVisualizations.appendChild(headDiv);
        }
        
        // Visualize concatenated output
        const ctx = elements.multiOutput.getContext('2d');
        ctx.clearRect(0, 0, elements.multiOutput.width, elements.multiOutput.height);
        
        // Simple visualization showing concatenation
        const segmentWidth = elements.multiOutput.width / numHeads;
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12'];
        
        for (let h = 0; h < numHeads; h++) {
            ctx.fillStyle = colors[h % colors.length];
            ctx.globalAlpha = 0.3;
            ctx.fillRect(h * segmentWidth, 0, segmentWidth - 2, elements.multiOutput.height);
            
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Head ${h + 1}`, h * segmentWidth + segmentWidth / 2, elements.multiOutput.height / 2);
        }
    }

    // Event handlers
    function handleTabClick(e) {
        const targetTab = e.target.dataset.tab;
        
        // Update active states
        elements.vizTabs.forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        
        elements.vizPanes.forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `${targetTab}-tab`) {
                pane.classList.add('active');
            }
        });
        
        // Process specific visualizations
        if (targetTab === 'multi' && tokens.length > 0) {
            processMultiHeadAttention();
        } else if (targetTab === 'position') {
            const dim = parseInt(elements.embeddingDim.value);
            drawPositionalEncoding(elements.positionEncodingViz, 20, dim);
        }
    }

    function updateParameterDisplays() {
        elements.dimDisplay.textContent = elements.embeddingDim.value;
        elements.headsDisplay.textContent = elements.numHeads.value;
        elements.tempDisplay.textContent = elements.temperature.value;
    }

    // Add event listeners
    elements.processBtn.addEventListener('click', processAttention);
    elements.inputSentence.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processAttention();
        }
    });
    
    elements.embeddingDim.addEventListener('input', updateParameterDisplays);
    elements.numHeads.addEventListener('input', updateParameterDisplays);
    elements.temperature.addEventListener('input', updateParameterDisplays);
    
    elements.vizTabs.forEach(tab => tab.addEventListener('click', handleTabClick));
    
    // Initialize
    updateParameterDisplays();
    
    // Add seedrandom for consistent random numbers
    !function(a,b){function c(c,j,k){var n=[];j=1==j?{entropy:!0}:j||{};var s=g(f(j.entropy?[c,i(a)]:null==c?h():c,3),n),t=new d(n),u=function(){for(var a=t.g(m),b=p,c=0;q>a;)a=(a+c)*l,b*=l,c=t.g(1);for(;a>=r;)a/=2,b/=2,c>>>=1;return(a+c)/b};return u.int32=function(){return 0|t.g(4)},u.quick=function(){return t.g(4)/4294967296},u.double=u,g(i(t.S),a),(j.pass||k||function(a,c,d,f){return f&&(f.S&&e(f,t),a.state=function(){return e(t,{})}),d?(b[o]=a,c):a})(u,s,"global"in j?j.global:this==b,j.state)}function d(a){var b,c=a.length,d=this,e=0,f=d.i=d.j=0,g=d.S=[];for(c||(a=[c++]);l>e;)g[e]=e++;for(e=0;l>e;e++)g[e]=g[f=s&f+a[e%c]+(b=g[e])],g[f]=b;(d.g=function(a){for(var b,c=0,e=d.i,f=d.j,g=d.S;a--;)b=g[e=s&e+1],c=c*l+g[s&(g[e]=g[f=s&f+b])+(g[f]=b)];return d.i=e,d.j=f,c})(l)}function e(a,b){return b.i=a.i,b.j=a.j,b.S=a.S.slice(),b}function f(a,b){var c,d=[],e=typeof a;if(b&&"object"==e)for(c in a)try{d.push(f(a[c],b-1))}catch(g){}return d.length?d:"string"==e?a:a+"\0"}function g(a,b){for(var c,d=a+"",e=0;e<d.length;)b[s&e]=s&(c^=19*b[s&e])+d.charCodeAt(e++);return i(b)}function h(){try{if(j)return i(j.randomBytes(l));var b=new Uint8Array(l);return(k.crypto||k.msCrypto).getRandomValues(b),i(b)}catch(c){var d=k.navigator,e=d&&d.plugins;return[+new Date,k,e,k.screen,i(a)]}}function i(a){return String.fromCharCode.apply(0,a)}var j,k=this,l=256,m=6,n=52,o="random",p=b.pow(l,m),q=b.pow(2,n),r=2*q,s=l-1;if(b["seed"+o]=c,g(b.random(),a),"object"==typeof module&&module.exports){module.exports=c;try{j=require("crypto")}catch(t){}}else"function"==typeof define&&define.amd&&define(function(){return c})}([],Math);
    Math.seedrandom = function(seed) {
        return Math.random;
    };
});