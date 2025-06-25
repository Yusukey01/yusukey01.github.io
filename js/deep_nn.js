// Transformer Architecture Interactive Demo
// Based on "Attention is All You Need" (Vaswani et al., 2017)
// Educational visualization - not a real translation model

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
            <div class="demo-notice">
                <h3>⚠️ Educational Visualization</h3>
                <p>This demo shows <strong>HOW</strong> transformers work, not actual translation. Real models have millions of parameters learned from data.</p>
                <p>What you'll see:</p>
                <ul>
                    <li>How text flows through encoder/decoder architectures</li>
                    <li>How attention mechanisms work (with simulated weights)</li>
                    <li>The difference between encoder-decoder and decoder-only models</li>
                </ul>
            </div>

            <div class="architecture-selector">
                <label class="radio-label">
                    <input type="radio" name="architecture" value="encoder-decoder" checked>
                    <span>Encoder-Decoder (Original Transformer)</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="architecture" value="decoder-only">
                    <span>Decoder-only (GPT-style)</span>
                </label>
            </div>

            <div class="input-section">
                <div class="input-area">
                    <label>Input Text (any English sentence):</label>
                    <textarea id="input-text" placeholder="Enter text here...">The cat sat on the mat</textarea>
                    <button id="process-btn" class="primary-btn">Visualize Architecture</button>
                </div>
                <div class="demo-options">
                    <label>
                        <input type="checkbox" id="show-math" checked>
                        Show Mathematical Operations
                    </label>
                    <label>
                        <input type="checkbox" id="animate-flow" checked>
                        Animate Data Flow
                    </label>
                </div>
            </div>

            <div class="architecture-flow" id="architecture-flow">
                <!-- Dynamic content will be inserted here -->
            </div>

            <div class="info-panel">
                <h3>Understanding the Visualization</h3>
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

        .demo-notice {
            background: #fff3e0;
            border: 2px solid #ff9800;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .demo-notice h3 {
            margin-top: 0;
            color: #e65100;
        }

        .demo-notice ul {
            margin-bottom: 0;
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

        .input-area label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }

        .input-area {
            margin-bottom: 15px;
        }

        #input-text {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: none;
            height: 50px;
            box-sizing: border-box;
        }

        .primary-btn {
            padding: 10px 20px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }

        .primary-btn:hover {
            background: #2980b9;
        }

        .demo-options {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }

        .demo-options label {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
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
            opacity: 0;
            animation: fadeIn 0.5s forwards;
        }

        @keyframes fadeIn {
            to { opacity: 1; }
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
            opacity: 0;
            animation: fadeIn 0.5s 0.2s forwards;
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
            position: relative;
        }

        .token:hover {
            background: #3498db;
            color: white;
            transform: translateY(-2px);
        }

        .token.highlighted {
            background: #e74c3c;
            color: white;
        }

        .token-index {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #95a5a6;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
        }

        .matrix-viz {
            margin: 15px 0;
            overflow-x: auto;
        }

        .attention-grid {
            display: inline-block;
            border: 1px solid #ddd;
            background: white;
        }

        .attention-cell {
            width: 50px;
            height: 50px;
            display: inline-block;
            text-align: center;
            line-height: 50px;
            font-size: 11px;
            border: 1px solid #eee;
            transition: all 0.3s;
        }

        .attention-cell:hover {
            transform: scale(1.1);
            z-index: 10;
            position: relative;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .math-notation {
            background: #e3f2fd;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
        }

        .embedding-viz {
            display: flex;
            gap: 10px;
            margin: 10px 0;
            align-items: flex-end;
        }

        .embedding-vector {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        }

        .embedding-bar {
            width: 30px;
            background: #3498db;
            transition: all 0.3s;
        }

        .position-encoding {
            display: flex;
            gap: 5px;
            margin: 10px 0;
        }

        .position-wave {
            width: 80px;
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

        .layer-norm {
            display: inline-block;
            padding: 5px 10px;
            background: #e3f2fd;
            border-radius: 4px;
            margin: 5px;
        }

        .cross-attention {
            background: #fff3e0;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }

        .simulated-output {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
        }

        .attention-explanation {
            background: #f3e5f5;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 14px;
        }

        @media (max-width: 768px) {
            .architecture-selector {
                flex-direction: column;
                gap: 10px;
            }
            
            .token-display {
                flex-direction: column;
            }

            .demo-options {
                flex-direction: column;
                gap: 10px;
            }
        }
    `;
    
    document.head.appendChild(styleElement);

    // State variables
    let currentArchitecture = 'encoder-decoder';
    let tokens = [];
    let showMath = true;
    let animateFlow = true;

    // DOM elements
    const elements = {
        architectureRadios: document.querySelectorAll('input[name="architecture"]'),
        inputText: document.getElementById('input-text'),
        processBtn: document.getElementById('process-btn'),
        architectureFlow: document.getElementById('architecture-flow'),
        architectureInfo: document.getElementById('architecture-info'),
        showMathCheckbox: document.getElementById('show-math'),
        animateFlowCheckbox: document.getElementById('animate-flow')
    };

    // Tokenization function
    function tokenize(text) {
        // Simple whitespace tokenization for demo
        return text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    }

    // Create positional encoding visualization
    function createPositionalEncodingVisualization(length) {
        const container = document.createElement('div');
        container.className = 'position-encoding';
        
        for (let pos = 0; pos < Math.min(length, 4); pos++) {
            const canvas = document.createElement('canvas');
            canvas.className = 'position-wave';
            canvas.width = 80;
            canvas.height = 60;
            
            const ctx = canvas.getContext('2d');
            
            // Draw sine wave for even dimensions
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x < 80; x++) {
                const angle = (x / 80) * 2 * Math.PI + (pos * Math.PI / 3);
                const y = 30 + 15 * Math.sin(angle);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            
            // Draw cosine wave for odd dimensions
            ctx.strokeStyle = '#3498db';
            ctx.beginPath();
            for (let x = 0; x < 80; x++) {
                const angle = (x / 80) * 2 * Math.PI + (pos * Math.PI / 3);
                const y = 30 + 15 * Math.cos(angle);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            
            // Label
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText(`Pos ${pos}`, 25, 55);
            
            container.appendChild(canvas);
        }
        
        if (length > 4) {
            const more = document.createElement('div');
            more.style.alignSelf = 'center';
            more.style.fontSize = '20px';
            more.textContent = '...';
            container.appendChild(more);
        }
        
        return container;
    }

    // Create token display with indices
    function createTokenDisplay(tokens, startIndex = 0) {
        const container = document.createElement('div');
        container.className = 'token-display';
        
        tokens.forEach((token, idx) => {
            const tokenEl = document.createElement('div');
            tokenEl.className = 'token';
            tokenEl.textContent = token;
            
            const indexEl = document.createElement('div');
            indexEl.className = 'token-index';
            indexEl.textContent = startIndex + idx;
            tokenEl.appendChild(indexEl);
            
            tokenEl.addEventListener('mouseenter', () => {
                // Highlight related tokens in attention matrices
                document.querySelectorAll(`.attn-row-${startIndex + idx}, .attn-col-${startIndex + idx}`).forEach(cell => {
                    cell.style.border = '2px solid #e74c3c';
                });
            });
            
            tokenEl.addEventListener('mouseleave', () => {
                document.querySelectorAll('.attention-cell').forEach(cell => {
                    cell.style.border = '1px solid #eee';
                });
            });
            
            container.appendChild(tokenEl);
        });
        
        return container;
    }

    // Create embedding visualization
    function createEmbeddingVisualization(tokens) {
        const container = document.createElement('div');
        container.className = 'embedding-viz';
        
        tokens.slice(0, 8).forEach(token => {
            const vectorDiv = document.createElement('div');
            vectorDiv.className = 'embedding-vector';
            
            // Create 8 dimensions for visualization
            for (let i = 0; i < 8; i++) {
                const bar = document.createElement('div');
                bar.className = 'embedding-bar';
                // Random values for visualization
                const value = Math.random() * 0.8 + 0.2;
                bar.style.height = `${value * 40}px`;
                bar.style.opacity = value;
                vectorDiv.appendChild(bar);
            }
            
            const label = document.createElement('div');
            label.textContent = token.substring(0, 5);
            label.style.fontSize = '11px';
            label.style.marginTop = '5px';
            vectorDiv.appendChild(label);
            
            container.appendChild(vectorDiv);
        });
        
        if (tokens.length > 8) {
            const more = document.createElement('div');
            more.style.alignSelf = 'center';
            more.textContent = '...';
            more.style.fontSize = '20px';
            more.style.padding = '0 10px';
            container.appendChild(more);
        }
        
        return container;
    }

    // Generate attention patterns
    function generateAttentionWeights(queryTokens, keyTokens, type = 'self') {
        const weights = [];
        
        for (let i = 0; i < queryTokens.length; i++) {
            weights[i] = [];
            for (let j = 0; j < keyTokens.length; j++) {
                let weight = 0.1; // Base attention
                
                if (type === 'self') {
                    // Self-attention patterns
                    if (i === j) weight = 0.5; // Tokens attend to themselves
                    if (Math.abs(i - j) === 1) weight = 0.3; // Adjacent tokens
                    
                    // Linguistic patterns
                    const queryToken = queryTokens[i];
                    const keyToken = keyTokens[j];
                    
                    // Articles attend to nouns
                    if ((queryToken === 'the' || queryToken === 'a') && j === i + 1) weight = 0.4;
                    // Verbs attend to subjects and objects
                    if (queryToken === 'is' || queryToken === 'was' || queryToken === 'are') {
                        if (j === i - 1 || j === i + 1) weight = 0.4;
                    }
                } else if (type === 'cross') {
                    // Cross-attention (decoder to encoder)
                    // Simulate alignment
                    if (Math.abs(i - j) <= 1) weight = 0.4;
                    // Some randomness for realism
                    weight += Math.random() * 0.2;
                } else if (type === 'masked') {
                    // Masked self-attention (causal)
                    if (j > i) {
                        weight = 0; // Can't attend to future
                    } else {
                        weight = 1 / (i + 1); // Uniform over past
                    }
                }
                
                weights[i][j] = weight;
            }
            
            // Normalize weights (softmax)
            if (type !== 'masked' || i > 0) {
                const sum = weights[i].reduce((a, b) => a + b, 0);
                if (sum > 0) {
                    weights[i] = weights[i].map(w => w / sum);
                }
            }
        }
        
        return weights;
    }

    // Visualize attention weights
    function createAttentionVisualization(queryTokens, keyTokens, weights, title = "Attention Weights") {
        const container = document.createElement('div');
        
        const titleEl = document.createElement('h4');
        titleEl.textContent = title;
        container.appendChild(titleEl);
        
        const explanation = document.createElement('div');
        explanation.className = 'attention-explanation';
        explanation.textContent = 'Each row shows where a query token attends. Darker = stronger attention.';
        container.appendChild(explanation);
        
        const matrixContainer = document.createElement('div');
        matrixContainer.className = 'matrix-viz';
        
        const grid = document.createElement('div');
        grid.className = 'attention-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `repeat(${keyTokens.length + 1}, 50px)`;
        
        // Header row
        const empty = document.createElement('div');
        empty.className = 'attention-cell';
        empty.style.background = '#f8f9fa';
        grid.appendChild(empty);
        
        keyTokens.forEach((token, idx) => {
            const cell = document.createElement('div');
            cell.className = `attention-cell attn-col-${idx}`;
            cell.textContent = token.substring(0, 5);
            cell.style.fontWeight = 'bold';
            cell.style.background = '#f8f9fa';
            cell.style.fontSize = '10px';
            grid.appendChild(cell);
        });
        
        // Weight rows
        queryTokens.forEach((token, i) => {
            const rowLabel = document.createElement('div');
            rowLabel.className = `attention-cell attn-row-${i}`;
            rowLabel.textContent = token.substring(0, 5);
            rowLabel.style.fontWeight = 'bold';
            rowLabel.style.background = '#f8f9fa';
            rowLabel.style.fontSize = '10px';
            grid.appendChild(rowLabel);
            
            keyTokens.forEach((_, j) => {
                const cell = document.createElement('div');
                cell.className = `attention-cell attn-row-${i} attn-col-${j}`;
                const weight = weights[i][j];
                
                // Color based on weight
                const intensity = Math.floor(weight * 255);
                cell.style.backgroundColor = `rgba(52, 152, 219, ${weight})`;
                cell.style.color = weight > 0.5 ? 'white' : 'black';
                cell.textContent = weight.toFixed(2);
                
                // Tooltip on hover
                cell.title = `${queryTokens[i]} → ${keyTokens[j]}: ${weight.toFixed(3)}`;
                
                grid.appendChild(cell);
            });
        });
        
        matrixContainer.appendChild(grid);
        container.appendChild(matrixContainer);
        
        return container;
    }

    // Create encoder component
    function createEncoderComponent(tokens) {
        const encoder = document.createElement('div');
        encoder.className = 'flow-component';
        encoder.innerHTML = '<h3>Encoder</h3>';
        
        // Step 1: Embeddings
        const embSection = document.createElement('div');
        embSection.innerHTML = '<h4>Step 1: Token Embeddings</h4>';
        embSection.innerHTML += '<p>Each token is converted to a high-dimensional vector (typically 512 dimensions).</p>';
        embSection.appendChild(createTokenDisplay(tokens));
        embSection.appendChild(createEmbeddingVisualization(tokens));
        
        if (showMath) {
            const math = document.createElement('div');
            math.className = 'math-notation';
            math.innerHTML = 'X = [Embed(token₁), Embed(token₂), ..., Embed(tokenₙ)]';
            embSection.appendChild(math);
        }
        encoder.appendChild(embSection);
        
        // Step 2: Positional encoding
        const posSection = document.createElement('div');
        posSection.innerHTML = '<h4>Step 2: + Positional Encoding</h4>';
        posSection.innerHTML += '<p>Sine/cosine waves encode position information since attention has no inherent order.</p>';
        posSection.appendChild(createPositionalEncodingVisualization(tokens.length));
        
        if (showMath) {
            const math = document.createElement('div');
            math.className = 'math-notation';
            math.innerHTML = 'PE(pos, 2i) = sin(pos/10000^(2i/d))<br>PE(pos, 2i+1) = cos(pos/10000^(2i/d))';
            posSection.appendChild(math);
        }
        encoder.appendChild(posSection);
        
        // Step 3: Self-attention
        const attSection = document.createElement('div');
        attSection.innerHTML = '<h4>Step 3: Multi-Head Self-Attention</h4>';
        attSection.innerHTML += '<p>Each token can attend to all other tokens to build contextual representations.</p>';
        
        const selfAttentionWeights = generateAttentionWeights(tokens, tokens, 'self');
        attSection.appendChild(createAttentionVisualization(tokens, tokens, selfAttentionWeights, "Self-Attention"));
        
        if (showMath) {
            const math = document.createElement('div');
            math.className = 'math-notation';
            math.innerHTML = 'Attention(Q,K,V) = softmax(QK^T/√d_k)V';
            attSection.appendChild(math);
        }
        encoder.appendChild(attSection);
        
        // Step 4: Feed-forward
        const ffSection = document.createElement('div');
        ffSection.innerHTML = '<h4>Step 4: Feed-Forward Network</h4>';
        ffSection.innerHTML += '<p>Two linear transformations with ReLU activation, applied to each position.</p>';
        
        if (showMath) {
            const math = document.createElement('div');
            math.className = 'math-notation';
            math.innerHTML = 'FFN(x) = max(0, xW₁ + b₁)W₂ + b₂';
            ffSection.appendChild(math);
        }
        
        ffSection.innerHTML += '<div class="layer-norm">Add & Norm</div>';
        encoder.appendChild(ffSection);
        
        return encoder;
    }

    // Create decoder component
    function createDecoderComponent(inputTokens, outputTokens, showCrossAttention = true) {
        const decoder = document.createElement('div');
        decoder.className = 'flow-component';
        decoder.innerHTML = '<h3>Decoder</h3>';
        
        // Output tokens for demo
        if (!outputTokens || outputTokens.length === 0) {
            outputTokens = ['<START>', 'the', 'chat', 's\'est', 'assis', 'sur', 'le', 'tapis', '<END>'];
        }
        
        // Step 1: Output embeddings
        const embSection = document.createElement('div');
        embSection.innerHTML = '<h4>Step 1: Output Embeddings (shifted right)</h4>';
        embSection.innerHTML += '<p>During training, the target sequence is shifted right. During inference, we generate one token at a time.</p>';
        embSection.appendChild(createTokenDisplay(outputTokens));
        decoder.appendChild(embSection);
        
        // Step 2: Masked self-attention
        const maskedAttSection = document.createElement('div');
        maskedAttSection.innerHTML = '<h4>Step 2: Masked Multi-Head Self-Attention</h4>';
        maskedAttSection.innerHTML += '<p>Each position can only attend to earlier positions (causal masking).</p>';
        
        const maskedWeights = generateAttentionWeights(outputTokens, outputTokens, 'masked');
        maskedAttSection.appendChild(createAttentionVisualization(
            outputTokens, 
            outputTokens, 
            maskedWeights, 
            "Masked Self-Attention (Causal)"
        ));
        decoder.appendChild(maskedAttSection);
        
        // Step 3: Cross-attention (if encoder-decoder)
        if (showCrossAttention && inputTokens && inputTokens.length > 0) {
            const crossAttSection = document.createElement('div');
            crossAttSection.className = 'cross-attention';
            crossAttSection.innerHTML = '<h4>Step 3: Cross-Attention (Encoder-Decoder Attention)</h4>';
            crossAttSection.innerHTML += '<p>Decoder queries attend to encoder outputs. This is how the decoder "sees" the input.</p>';
            
            const crossWeights = generateAttentionWeights(outputTokens, inputTokens, 'cross');
            crossAttSection.appendChild(createAttentionVisualization(
                outputTokens,
                inputTokens,
                crossWeights,
                "Cross-Attention (Decoder → Encoder)"
            ));
            decoder.appendChild(crossAttSection);
        }
        
        // Step 4: Feed-forward
        const ffSection = document.createElement('div');
        ffSection.innerHTML = '<h4>Step 4: Feed-Forward Network</h4>';
        ffSection.innerHTML += '<div class="layer-norm">Add & Norm after each sub-layer</div>';
        decoder.appendChild(ffSection);
        
        return decoder;
    }

    // Process input
    function processInput() {
        const inputText = elements.inputText.value.trim();
        if (!inputText) {
            alert('Please enter some text to visualize.');
            return;
        }
        
        tokens = tokenize(inputText);
        if (tokens.length === 0) {
            alert('Please enter valid text.');
            return;
        }
        
        elements.architectureFlow.innerHTML = '';
        
        // Add delay for animation
        const addComponent = (component, delay = 0) => {
            if (animateFlow) {
                component.style.animationDelay = `${delay}s`;
            } else {
                component.style.animation = 'none';
                component.style.opacity = '1';
            }
            elements.architectureFlow.appendChild(component);
        };
        
        let delay = 0;
        
        // Input display
        const inputDiv = document.createElement('div');
        inputDiv.className = 'flow-component';
        inputDiv.innerHTML = `<h3>Input: "${tokens.join(' ')}"</h3>`;
        addComponent(inputDiv, delay);
        delay += 0.3;
        
        // Arrow
        const arrow1 = document.createElement('div');
        arrow1.className = 'flow-arrow';
        arrow1.textContent = '↓';
        addComponent(arrow1, delay);
        delay += 0.2;
        
        if (currentArchitecture === 'encoder-decoder') {
            // Encoder
            const encoder = createEncoderComponent(tokens);
            addComponent(encoder, delay);
            delay += 0.3;
            
            // Arrow
            const arrow2 = document.createElement('div');
            arrow2.className = 'flow-arrow';
            arrow2.textContent = '↓';
            addComponent(arrow2, delay);
            delay += 0.2;
            
            // Decoder
            const decoder = createDecoderComponent(tokens, null, true);
            addComponent(decoder, delay);
            delay += 0.3;
            
            // Output
            const outputDiv = document.createElement('div');
            outputDiv.className = 'flow-component simulated-output';
            outputDiv.innerHTML = `
                <h3>Output Generation</h3>
                <p>In a real model, this would be the translated text. Each output token is generated by:</p>
                <ol>
                    <li>Computing attention over previous outputs (masked self-attention)</li>
                    <li>Attending to encoder outputs (cross-attention)</li>
                    <li>Passing through feed-forward layers</li>
                    <li>Applying softmax to get token probabilities</li>
                </ol>
                <p><strong>Note:</strong> This demo shows random attention patterns. Real models learn these patterns from millions of examples.</p>
            `;
            addComponent(outputDiv, delay);
            
        } else {
            // Decoder-only architecture
            const fullSequence = ['<START>', ...tokens, '<SEP>', 'generated', 'text', 'would', 'appear', 'here'];
            
            const decoder = createDecoderComponent([], fullSequence, false);
            decoder.querySelector('h3').textContent = 'Transformer Decoder (Autoregressive)';
            addComponent(decoder, delay);
            delay += 0.3;
            
            // Output explanation
            const outputDiv = document.createElement('div');
            outputDiv.className = 'flow-component simulated-output';
            outputDiv.innerHTML = `
                <h3>Autoregressive Generation</h3>
                <p>Decoder-only models (like GPT) process everything as one sequence:</p>
                <ul>
                    <li>Input and output are concatenated</li>
                    <li>Each position can only see previous positions (causal masking)</li>
                    <li>No separate encoder or cross-attention needed</li>
                    <li>More flexible: can handle any text generation task</li>
                </ul>
                <p><strong>Key insight:</strong> Everything is framed as "predict the next token"</p>
            `;
            addComponent(outputDiv, delay);
        }
        
        updateArchitectureInfo();
    }

    // Update architecture info
    function updateArchitectureInfo() {
        const info = elements.architectureInfo;
        
        if (currentArchitecture === 'encoder-decoder') {
            info.innerHTML = `
                <h4>Encoder-Decoder Architecture (Vaswani et al., 2017)</h4>
                <table class="info-table">
                    <tr>
                        <th>Component</th>
                        <th>Purpose</th>
                        <th>Key Feature</th>
                    </tr>
                    <tr>
                        <td>Encoder</td>
                        <td>Process input sequence</td>
                        <td>Bidirectional attention (sees all tokens)</td>
                    </tr>
                    <tr>
                        <td>Decoder</td>
                        <td>Generate output sequence</td>
                        <td>Causal attention (only sees past)</td>
                    </tr>
                    <tr>
                        <td>Cross-Attention</td>
                        <td>Connect encoder to decoder</td>
                        <td>Decoder queries, encoder keys/values</td>
                    </tr>
                </table>
                <p><strong>Best for:</strong> Sequence-to-sequence tasks where input and output are different (translation, summarization)</p>
                <p><strong>Examples:</strong> Original Transformer, T5, BART, mT5</p>
            `;
        } else {
            info.innerHTML = `
                <h4>Decoder-Only Architecture (Radford et al., 2018)</h4>
                <table class="info-table">
                    <tr>
                        <th>Component</th>
                        <th>Purpose</th>
                        <th>Key Feature</th>
                    </tr>
                    <tr>
                        <td>Decoder Stack</td>
                        <td>Process entire sequence</td>
                        <td>Causal masking throughout</td>
                    </tr>
                    <tr>
                        <td>Self-Attention</td>
                        <td>Build representations</td>
                        <td>Can only attend to past positions</td>
                    </tr>
                    <tr>
                        <td>No Cross-Attention</td>
                        <td>Simpler architecture</td>
                        <td>Everything is one sequence</td>
                    </tr>
                </table>
                <p><strong>Best for:</strong> Language modeling, text generation, any task that can be framed as completion</p>
                <p><strong>Examples:</strong> GPT, GPT-2, GPT-3, GPT-4, LLaMA, PaLM</p>
            `;
        }
        
        info.innerHTML += `
            <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 4px;">
                <strong>Key Parameters in Real Models:</strong>
                <ul style="margin: 5px 0;">
                    <li><strong>d_model:</strong> Hidden size (512-4096)</li>
                    <li><strong>n_heads:</strong> Number of attention heads (8-64)</li>
                    <li><strong>n_layers:</strong> Number of encoder/decoder layers (6-96)</li>
                    <li><strong>vocab_size:</strong> Number of tokens (30k-100k+)</li>
                </ul>
            </div>
        `;
    }

    // Event listeners
    elements.architectureRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentArchitecture = e.target.value;
            processInput();
        });
    });

    elements.processBtn.addEventListener('click', processInput);
    
    elements.inputText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processInput();
        }
    });
    
    elements.showMathCheckbox.addEventListener('change', (e) => {
        showMath = e.target.checked;
    });
    
    elements.animateFlowCheckbox.addEventListener('change', (e) => {
        animateFlow = e.target.checked;
    });

    // Initialize with sample
    processInput();
});