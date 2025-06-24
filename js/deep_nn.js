// Transformer Architecture Interactive Demo
// Based on "Attention is All You Need" (Vaswani et al., 2017)

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('transformer_demo');
    
    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // Create HTML structure
    container.innerHTML = `
        <div class="transformer-container">
            <div class="architecture-selector">
                <label class="radio-label">
                    <input type="radio" name="architecture" value="encoder-decoder" checked>
                    <span>Encoder-Decoder (Vaswani et al., 2017)</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="architecture" value="decoder-only">
                    <span>Decoder-only (GPT-style)</span>
                </label>
            </div>

            <div class="input-section">
                <div class="task-selector">
                    <label>Task:</label>
                    <select id="task-select">
                        <option value="translation">Translation (EN→FR)</option>
                        <option value="completion">Text Completion</option>
                        <option value="qa">Question Answering</option>
                    </select>
                </div>
                <div class="input-area">
                    <textarea id="input-text" placeholder="Enter text here...">Hello world</textarea>
                    <button id="process-btn" class="primary-btn">Process</button>
                </div>
            </div>

            <div class="architecture-flow" id="architecture-flow">
                <!-- Dynamic content will be inserted here -->
            </div>

            <div class="info-panel">
                <h3>Architecture Details</h3>
                <div id="architecture-info"></div>
            </div>
        </div>
    `;

    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .transformer-container {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .architecture-selector {
            display: flex;
            gap: 30px;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .radio-label {
            display: flex;
            align-items: center;
            cursor: pointer;
        }

        .radio-label input {
            margin-right: 8px;
        }

        .input-section {
            margin-bottom: 30px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }

        .task-selector {
            margin-bottom: 15px;
        }

        .task-selector select {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-left: 10px;
        }

        .input-area {
            display: flex;
            gap: 10px;
        }

        #input-text {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: none;
            height: 50px;
        }

        .primary-btn {
            padding: 10px 20px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .primary-btn:hover {
            background: #2980b9;
        }

        .architecture-flow {
            margin-bottom: 30px;
        }

        .flow-component {
            margin: 20px 0;
            padding: 20px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            position: relative;
        }

        .flow-component h3 {
            margin-top: 0;
            color: #2c3e50;
        }

        .flow-arrow {
            text-align: center;
            font-size: 24px;
            color: #3498db;
            margin: 10px 0;
        }

        .token-display {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin: 10px 0;
        }

        .token {
            padding: 8px 12px;
            background: #ecf0f1;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .token:hover {
            background: #3498db;
            color: white;
        }

        .token.selected {
            background: #e74c3c;
            color: white;
        }

        .matrix-viz {
            margin: 15px 0;
            overflow-x: auto;
        }

        .attention-grid {
            display: inline-block;
            border: 1px solid #ddd;
        }

        .attention-cell {
            width: 40px;
            height: 40px;
            display: inline-block;
            text-align: center;
            line-height: 40px;
            font-size: 12px;
            border: 1px solid #eee;
        }

        .embedding-viz {
            display: flex;
            gap: 10px;
            margin: 10px 0;
        }

        .embedding-vector {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .embedding-bar {
            width: 30px;
            background: #3498db;
            margin: 2px;
            transition: all 0.3s;
        }

        .position-encoding {
            display: flex;
            gap: 5px;
            margin: 10px 0;
        }

        .position-wave {
            width: 60px;
            height: 60px;
            border: 1px solid #ddd;
        }

        .info-panel {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .info-table th, .info-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        .info-table th {
            background: #ecf0f1;
        }

        .decoder-output {
            margin: 10px 0;
            padding: 15px;
            background: #e8f5e9;
            border-radius: 4px;
        }

        .cross-attention {
            background: #fff3e0;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }

        canvas {
            border: 1px solid #ddd;
            margin: 10px 0;
        }

        .layer-norm {
            display: inline-block;
            padding: 5px 10px;
            background: #e3f2fd;
            border-radius: 4px;
            margin: 5px;
        }

        @media (max-width: 768px) {
            .architecture-selector {
                flex-direction: column;
                gap: 10px;
            }
            
            .token-display {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(styleElement);

    // State variables
    let currentArchitecture = 'encoder-decoder';
    let currentTask = 'translation';
    let tokens = [];
    let selectedTokenIndex = -1;

    // Simplified vocabulary for demonstration
    const vocabulary = {
        'hello': 0, 'world': 1, 'the': 2, 'weather': 3, 'is': 4, 
        'good': 5, 'bad': 6, 'today': 7, 'tomorrow': 8, 'what': 9,
        'capital': 10, 'of': 11, 'france': 12, 'paris': 13, 'bonjour': 14,
        'monde': 15, 'le': 16, 'temps': 17, 'est': 18, 'beau': 19,
        'sunny': 20, 'rainy': 21, '<PAD>': 22, '<START>': 23, '<END>': 24
    };

    const vocabReverse = Object.fromEntries(Object.entries(vocabulary).map(([k, v]) => [v, k]));

    // Model parameters (following Vaswani et al., 2017)
    const d_model = 512;  // Model dimension
    const n_heads = 8;    // Number of attention heads
    const d_k = 64;       // Dimension of K, Q, V (d_model / n_heads)

    // DOM elements
    const elements = {
        architectureRadios: document.querySelectorAll('input[name="architecture"]'),
        taskSelect: document.getElementById('task-select'),
        inputText: document.getElementById('input-text'),
        processBtn: document.getElementById('process-btn'),
        architectureFlow: document.getElementById('architecture-flow'),
        architectureInfo: document.getElementById('architecture-info')
    };

    // Tokenization function
    function tokenize(text) {
        return text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    }

    // Create positional encoding (Vaswani et al., 2017, Section 3.5)
    function getPositionalEncoding(position, dimension) {
        const encoding = [];
        for (let i = 0; i < dimension; i++) {
            const angle = position / Math.pow(10000, (2 * i) / dimension);
            encoding.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
        }
        return encoding;
    }

    // Scaled dot-product attention (Vaswani et al., 2017, Eq. 1)
    function scaledDotProductAttention(Q, K, V, mask = null) {
        const seq_len = Q.length;
        const d_k = Q[0].length;
        
        // Compute attention scores
        const scores = [];
        for (let i = 0; i < seq_len; i++) {
            scores[i] = [];
            for (let j = 0; j < seq_len; j++) {
                let score = 0;
                for (let k = 0; k < d_k; k++) {
                    score += Q[i][k] * K[j][k];
                }
                scores[i][j] = score / Math.sqrt(d_k);
            }
        }

        // Apply mask if provided (for decoder self-attention)
        if (mask) {
            for (let i = 0; i < seq_len; i++) {
                for (let j = 0; j < seq_len; j++) {
                    if (mask[i][j] === 0) {
                        scores[i][j] = -Infinity;
                    }
                }
            }
        }

        // Apply softmax
        const attention_weights = [];
        for (let i = 0; i < seq_len; i++) {
            const exp_scores = scores[i].map(s => Math.exp(s));
            const sum_exp = exp_scores.reduce((a, b) => a + b, 0);
            attention_weights[i] = exp_scores.map(e => e / sum_exp);
        }

        // Apply attention to values
        const output = [];
        for (let i = 0; i < seq_len; i++) {
            output[i] = new Array(V[0].length).fill(0);
            for (let j = 0; j < seq_len; j++) {
                for (let k = 0; k < V[0].length; k++) {
                    output[i][k] += attention_weights[i][j] * V[j][k];
                }
            }
        }

        return { output, attention_weights };
    }

    // Create causal mask for decoder
    function createCausalMask(size) {
        const mask = [];
        for (let i = 0; i < size; i++) {
            mask[i] = [];
            for (let j = 0; j < size; j++) {
                mask[i][j] = i >= j ? 1 : 0;
            }
        }
        return mask;
    }

    // Visualize tokens
    function createTokenDisplay(tokens, containerId) {
        const container = document.createElement('div');
        container.className = 'token-display';
        
        tokens.forEach((token, idx) => {
            const tokenEl = document.createElement('div');
            tokenEl.className = 'token';
            tokenEl.textContent = token;
            tokenEl.dataset.index = idx;
            
            tokenEl.addEventListener('click', () => {
                document.querySelectorAll('.token').forEach(t => t.classList.remove('selected'));
                tokenEl.classList.add('selected');
                selectedTokenIndex = idx;
                updateAttentionVisualization();
            });
            
            container.appendChild(tokenEl);
        });
        
        return container;
    }

    // Visualize embeddings
    function createEmbeddingVisualization(tokens) {
        const container = document.createElement('div');
        container.className = 'embedding-viz';
        
        tokens.forEach(token => {
            const vectorDiv = document.createElement('div');
            vectorDiv.className = 'embedding-vector';
            
            // Create random embedding values for visualization
            for (let i = 0; i < 8; i++) {
                const bar = document.createElement('div');
                bar.className = 'embedding-bar';
                const value = Math.random() * 0.8 + 0.2;
                bar.style.height = `${value * 40}px`;
                bar.style.opacity = value;
                vectorDiv.appendChild(bar);
            }
            
            const label = document.createElement('div');
            label.textContent = token;
            label.style.fontSize = '12px';
            vectorDiv.appendChild(label);
            
            container.appendChild(vectorDiv);
        });
        
        return container;
    }

    // Visualize positional encoding
    function createPositionalEncodingVisualization(length) {
        const container = document.createElement('div');
        container.className = 'position-encoding';
        
        for (let pos = 0; pos < Math.min(length, 6); pos++) {
            const canvas = document.createElement('canvas');
            canvas.className = 'position-wave';
            canvas.width = 60;
            canvas.height = 60;
            
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            
            // Draw sine wave
            ctx.beginPath();
            for (let x = 0; x < 60; x++) {
                const angle = (x / 60) * 2 * Math.PI + (pos * Math.PI / 3);
                const y = 30 + 20 * Math.sin(angle);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            
            // Label
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText(`Pos ${pos}`, 15, 55);
            
            container.appendChild(canvas);
        }
        
        if (length > 6) {
            const more = document.createElement('div');
            more.style.alignSelf = 'center';
            more.textContent = '...';
            container.appendChild(more);
        }
        
        return container;
    }

    // Visualize attention weights
    function createAttentionVisualization(tokens, weights) {
        const container = document.createElement('div');
        container.className = 'matrix-viz';
        
        const grid = document.createElement('div');
        grid.className = 'attention-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `repeat(${tokens.length + 1}, 40px)`;
        
        // Header row
        const empty = document.createElement('div');
        empty.className = 'attention-cell';
        grid.appendChild(empty);
        
        tokens.forEach(token => {
            const cell = document.createElement('div');
            cell.className = 'attention-cell';
            cell.textContent = token.substring(0, 4);
            cell.style.fontWeight = 'bold';
            grid.appendChild(cell);
        });
        
        // Weight rows
        tokens.forEach((token, i) => {
            const rowLabel = document.createElement('div');
            rowLabel.className = 'attention-cell';
            rowLabel.textContent = token.substring(0, 4);
            rowLabel.style.fontWeight = 'bold';
            grid.appendChild(rowLabel);
            
            tokens.forEach((_, j) => {
                const cell = document.createElement('div');
                cell.className = 'attention-cell';
                const weight = weights[i][j];
                cell.style.backgroundColor = `rgba(52, 152, 219, ${weight})`;
                cell.style.color = weight > 0.5 ? 'white' : 'black';
                cell.textContent = weight.toFixed(2);
                grid.appendChild(cell);
            });
        });
        
        container.appendChild(grid);
        return container;
    }

    // Create encoder component
    function createEncoderComponent(tokens) {
        const encoder = document.createElement('div');
        encoder.className = 'flow-component';
        encoder.innerHTML = '<h3>Encoder</h3>';
        
        // Input embeddings
        const embSection = document.createElement('div');
        embSection.innerHTML = '<h4>1. Input Embeddings</h4>';
        embSection.appendChild(createTokenDisplay(tokens));
        embSection.appendChild(createEmbeddingVisualization(tokens));
        encoder.appendChild(embSection);
        
        // Positional encoding
        const posSection = document.createElement('div');
        posSection.innerHTML = '<h4>2. + Positional Encoding</h4>';
        posSection.appendChild(createPositionalEncodingVisualization(tokens.length));
        encoder.appendChild(posSection);
        
        // Self-attention
        const attSection = document.createElement('div');
        attSection.innerHTML = '<h4>3. Multi-Head Self-Attention</h4>';
        
        // Create simple attention weights for visualization
        const simpleWeights = [];
        for (let i = 0; i < tokens.length; i++) {
            simpleWeights[i] = [];
            for (let j = 0; j < tokens.length; j++) {
                // Simulate attention pattern
                const dist = Math.abs(i - j);
                simpleWeights[i][j] = Math.exp(-dist * 0.5) / 2;
            }
            // Normalize
            const sum = simpleWeights[i].reduce((a, b) => a + b, 0);
            simpleWeights[i] = simpleWeights[i].map(w => w / sum);
        }
        
        attSection.appendChild(createAttentionVisualization(tokens, simpleWeights));
        encoder.appendChild(attSection);
        
        // Add & Norm
        const normSection = document.createElement('div');
        normSection.innerHTML = '<h4>4. Add & Norm</h4>';
        normSection.innerHTML += '<div class="layer-norm">LayerNorm(x + Attention(x))</div>';
        encoder.appendChild(normSection);
        
        // Feed-forward
        const ffSection = document.createElement('div');
        ffSection.innerHTML = '<h4>5. Position-wise Feed-Forward</h4>';
        ffSection.innerHTML += '<div>FFN(x) = ReLU(xW₁ + b₁)W₂ + b₂</div>';
        ffSection.innerHTML += '<div class="layer-norm">LayerNorm(x + FFN(x))</div>';
        encoder.appendChild(ffSection);
        
        return encoder;
    }

    // Create decoder component
    function createDecoderComponent(inputTokens, outputTokens, showCrossAttention = true) {
        const decoder = document.createElement('div');
        decoder.className = 'flow-component';
        decoder.innerHTML = '<h3>Decoder</h3>';
        
        // Output embeddings
        const embSection = document.createElement('div');
        embSection.innerHTML = '<h4>1. Output Embeddings (shifted right)</h4>';
        embSection.appendChild(createTokenDisplay(outputTokens));
        decoder.appendChild(embSection);
        
        // Masked self-attention
        const maskedAttSection = document.createElement('div');
        maskedAttSection.innerHTML = '<h4>2. Masked Multi-Head Self-Attention</h4>';
        
        // Create causal mask visualization
        const causalWeights = [];
        for (let i = 0; i < outputTokens.length; i++) {
            causalWeights[i] = [];
            for (let j = 0; j < outputTokens.length; j++) {
                if (j > i) {
                    causalWeights[i][j] = 0;
                } else {
                    causalWeights[i][j] = 1 / (i + 1);
                }
            }
        }
        
        maskedAttSection.appendChild(createAttentionVisualization(outputTokens, causalWeights));
        decoder.appendChild(maskedAttSection);
        
        // Cross-attention (if encoder-decoder)
        if (showCrossAttention) {
            const crossAttSection = document.createElement('div');
            crossAttSection.className = 'cross-attention';
            crossAttSection.innerHTML = '<h4>3. Cross-Attention (to Encoder)</h4>';
            crossAttSection.innerHTML += '<p>Queries from decoder, Keys & Values from encoder</p>';
            
            // Create cross-attention weights
            const crossWeights = [];
            for (let i = 0; i < outputTokens.length; i++) {
                crossWeights[i] = [];
                for (let j = 0; j < inputTokens.length; j++) {
                    // Simulate some attention pattern
                    crossWeights[i][j] = Math.random() * 0.5 + 0.25;
                }
                // Normalize
                const sum = crossWeights[i].reduce((a, b) => a + b, 0);
                crossWeights[i] = crossWeights[i].map(w => w / sum);
            }
            
            const crossGrid = createAttentionVisualization(inputTokens, crossWeights);
            crossAttSection.appendChild(crossGrid);
            decoder.appendChild(crossAttSection);
        }
        
        // Feed-forward
        const ffSection = document.createElement('div');
        ffSection.innerHTML = '<h4>4. Position-wise Feed-Forward</h4>';
        ffSection.innerHTML += '<div class="layer-norm">LayerNorm(x + FFN(x))</div>';
        decoder.appendChild(ffSection);
        
        return decoder;
    }

    // Process input based on architecture and task
    function processInput() {
        const inputText = elements.inputText.value.trim();
        if (!inputText) return;
        
        tokens = tokenize(inputText);
        elements.architectureFlow.innerHTML = '';
        
        if (currentArchitecture === 'encoder-decoder') {
            processEncoderDecoder(tokens);
        } else {
            processDecoderOnly(tokens);
        }
        
        updateArchitectureInfo();
    }

    // Process with encoder-decoder architecture
    function processEncoderDecoder(inputTokens) {
        const flow = elements.architectureFlow;
        
        // Input
        const inputDiv = document.createElement('div');
        inputDiv.className = 'flow-component';
        inputDiv.innerHTML = `<h3>Input: "${inputTokens.join(' ')}"</h3>`;
        flow.appendChild(inputDiv);
        
        // Arrow
        flow.innerHTML += '<div class="flow-arrow">↓</div>';
        
        // Encoder
        flow.appendChild(createEncoderComponent(inputTokens));
        
        // Arrow
        flow.innerHTML += '<div class="flow-arrow">↓</div>';
        
        // Decoder
        let outputTokens;
        if (currentTask === 'translation') {
            outputTokens = ['<START>', 'bonjour', 'monde', '<END>'];
        } else if (currentTask === 'qa') {
            outputTokens = ['<START>', 'paris', '<END>'];
        } else {
            outputTokens = ['<START>', 'sunny', 'today', '<END>'];
        }
        
        flow.appendChild(createDecoderComponent(inputTokens, outputTokens, true));
        
        // Output
        flow.innerHTML += '<div class="flow-arrow">↓</div>';
        const outputDiv = document.createElement('div');
        outputDiv.className = 'flow-component decoder-output';
        outputDiv.innerHTML = `<h3>Output: "${outputTokens.slice(1, -1).join(' ')}"</h3>`;
        flow.appendChild(outputDiv);
    }

    // Process with decoder-only architecture
    function processDecoderOnly(inputTokens) {
        const flow = elements.architectureFlow;
        
        // Prepare prompt based on task
        let fullTokens;
        if (currentTask === 'translation') {
            fullTokens = ['translate:', ...inputTokens, 'to', 'french:', 'bonjour', 'monde'];
        } else if (currentTask === 'qa') {
            fullTokens = [...inputTokens, 'answer:', 'paris'];
        } else {
            fullTokens = [...inputTokens, 'sunny', 'today'];
        }
        
        // Input
        const inputDiv = document.createElement('div');
        inputDiv.className = 'flow-component';
        inputDiv.innerHTML = `<h3>Input Sequence: "${fullTokens.join(' ')}"</h3>`;
        inputDiv.innerHTML += '<p style="color: #666;">Everything processed as one sequence</p>';
        flow.appendChild(inputDiv);
        
        // Arrow
        flow.innerHTML += '<div class="flow-arrow">↓</div>';
        
        // Single decoder
        const decoder = createDecoderComponent([], fullTokens, false);
        decoder.querySelector('h3').textContent = 'Transformer Decoder (Autoregressive)';
        flow.appendChild(decoder);
        
        // Output
        flow.innerHTML += '<div class="flow-arrow">↓</div>';
        const outputDiv = document.createElement('div');
        outputDiv.className = 'flow-component decoder-output';
        
        let outputText;
        if (currentTask === 'translation') {
            outputText = 'bonjour monde';
        } else if (currentTask === 'qa') {
            outputText = 'paris';
        } else {
            outputText = 'sunny today';
        }
        
        outputDiv.innerHTML = `<h3>Generated: "${outputText}"</h3>`;
        outputDiv.innerHTML += '<p style="color: #666;">Tokens generated one at a time, each attending to all previous tokens</p>';
        flow.appendChild(outputDiv);
    }

    // Update architecture info panel
    function updateArchitectureInfo() {
        const info = elements.architectureInfo;
        
        if (currentArchitecture === 'encoder-decoder') {
            info.innerHTML = `
                <table class="info-table">
                    <tr>
                        <th>Component</th>
                        <th>Description</th>
                    </tr>
                    <tr>
                        <td>Encoder</td>
                        <td>Processes entire input with bidirectional attention</td>
                    </tr>
                    <tr>
                        <td>Decoder</td>
                        <td>Generates output autoregressively with causal masking</td>
                    </tr>
                    <tr>
                        <td>Cross-Attention</td>
                        <td>Decoder attends to encoder output (Q from decoder, K,V from encoder)</td>
                    </tr>
                    <tr>
                        <td>Use Cases</td>
                        <td>Translation, summarization, seq2seq tasks</td>
                    </tr>
                    <tr>
                        <td>Examples</td>
                        <td>Original Transformer, T5, BART</td>
                    </tr>
                </table>
                <p style="margin-top: 10px; font-style: italic;">
                    Reference: Vaswani et al. (2017) "Attention is All You Need"
                </p>
            `;
        } else {
            info.innerHTML = `
                <table class="info-table">
                    <tr>
                        <th>Component</th>
                        <th>Description</th>
                    </tr>
                    <tr>
                        <td>Architecture</td>
                        <td>Decoder-only with causal (left-to-right) attention</td>
                    </tr>
                    <tr>
                        <td>Processing</td>
                        <td>All tasks framed as next-token prediction</td>
                    </tr>
                    <tr>
                        <td>Attention Mask</td>
                        <td>Causal mask prevents attending to future tokens</td>
                    </tr>
                    <tr>
                        <td>Advantages</td>
                        <td>Simpler, more flexible, better scaling</td>
                    </tr>
                    <tr>
                        <td>Examples</td>
                        <td>GPT, GPT-2, GPT-3, LLaMA</td>
                    </tr>
                </table>
                <p style="margin-top: 10px; font-style: italic;">
                    References: Radford et al. (2018, 2019), Brown et al. (2020)
                </p>
            `;
        }
    }

    // Update attention visualization when token is selected
    function updateAttentionVisualization() {
        // This would update the attention weights visualization
        // to show attention patterns for the selected token
        console.log(`Token ${selectedTokenIndex} selected`);
    }

    // Event listeners
    elements.architectureRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentArchitecture = e.target.value;
            processInput();
        });
    });

    elements.taskSelect.addEventListener('change', (e) => {
        currentTask = e.target.value;
        
        // Update placeholder text
        if (currentTask === 'translation') {
            elements.inputText.placeholder = 'Enter English text to translate...';
            elements.inputText.value = 'Hello world';
        } else if (currentTask === 'completion') {
            elements.inputText.placeholder = 'Enter text to complete...';
            elements.inputText.value = 'The weather is';
        } else if (currentTask === 'qa') {
            elements.inputText.placeholder = 'Enter a question...';
            elements.inputText.value = 'What is the capital of France';
        }
    });

    elements.processBtn.addEventListener('click', processInput);
    
    elements.inputText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processInput();
        }
    });

    // Initialize
    processInput();
});