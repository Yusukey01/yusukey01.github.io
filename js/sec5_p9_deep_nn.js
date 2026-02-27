// sec5_p9_deep_nn.js - Transformer Visualizer: Architecture Flow + Matrix Shape Trace
// Shows high-level data flow and the shape of matrix operations at each step.

class TransformerFlowDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`[TransformerDemo] Container #${containerId} not found`);
            return;
        }

        // --- Model Hyperparameters (for visualization) ---
        this.config = {
            num_tokens: 3,
            d_model: 4,
            d_ffn: 16, // FFN inner dimension
            vocab_size: 8 // Illustrative vocab size
        };
        
        // --- Forward Pass Steps ---
        this.steps = [
            {
                id: 'input',
                title: '1. Input Sequence',
                desc: 'The model receives a sequence of tokens. For this demo, our input is <b>"The cat sat"</b>.',
                activeBoxes: [], activeLines: [],
                matrix_viz: null
            },
            {
                id: 'embed',
                title: '2. Embedding & Positional Encoding',
                desc: 'Each token is converted into a dense vector of dimension <i>d_model</i>. Positional signals are added to inform the model of the word order.<br><br><b>Output Shape:</b> (num_tokens, d_model)',
                activeBoxes: ['box-embed', 'box-pos'], activeLines: ['line-in-embed', 'line-embed-pos', 'line-pos-mha'],
                matrix_viz: {
                    op: 'result',
                    A_dims: [this.config.num_tokens, this.config.d_model], A_label: 'X (Input Embeddings)'
                }
            },
            {
                id: 'mha',
                title: '3. Masked Multi-Head Attention',
                desc: 'The core of the Transformer. The model calculates similarity scores between all token pairs to understand context. A mask prevents tokens from "seeing" future tokens.<br><br><b>Core Calculation:</b> Scores = Softmax(Mask(Q K<sup>T</sup> / &radic;d_k)) V',
                activeBoxes: ['box-mha'], activeLines: ['line-mha-norm1', 'line-res1'],
                matrix_viz: {
                    op: '×',
                    A_dims: [this.config.num_tokens, this.config.d_model], A_label: 'Q',
                    B_dims: [this.config.d_model, this.config.num_tokens], B_label: 'K^T',
                    C_dims: [this.config.num_tokens, this.config.num_tokens], C_label: 'Attention Scores'
                }
            },
            {
                id: 'norm1',
                title: '4. Add & Layer Normalization',
                desc: 'The original input is added back (<b>Residual Connection</b>) to help gradients flow. The result is then normalized to stabilize training.<br><br><b>Calculation:</b> LayerNorm(Attention_Output + X)',
                activeBoxes: ['box-norm1'], activeLines: ['line-norm1-ffn'],
                 matrix_viz: {
                    op: '+',
                    A_dims: [this.config.num_tokens, this.config.d_model], A_label: 'Attention Output',
                    B_dims: [this.config.num_tokens, this.config.d_model], B_label: 'X (from Residual)',
                    C_dims: [this.config.num_tokens, this.config.d_model], C_label: 'Normalized Output'
                }
            },
            {
                id: 'ffn',
                title: '5. Feed-Forward Network',
                desc: 'The contextualized vectors are passed through a simple two-layer neural network. This is often where the model recalls factual knowledge.<br><br><b>Calculation:</b> ReLU(Z W<sub>1</sub> + b<sub>1</sub>) W<sub>2</sub> + b<sub>2</sub>',
                activeBoxes: ['box-ffn'], activeLines: ['line-ffn-norm2', 'line-res2'],
                matrix_viz: {
                    op: '×',
                    A_dims: [this.config.num_tokens, this.config.d_model], A_label: 'Input to FFN',
                    B_dims: [this.config.d_model, this.config.d_ffn], B_label: 'W_1',
                    C_dims: [this.config.num_tokens, this.config.d_ffn], C_label: 'Hidden Layer'
                }
            },
            {
                id: 'norm2',
                title: '6. Add & Layer Normalization',
                desc: 'A second residual connection and normalization step. The block now outputs refined, context-aware vectors for each token.',
                activeBoxes: ['box-norm2'], activeLines: ['line-norm2-linear'],
                matrix_viz: { op: 'result', A_dims: [this.config.num_tokens, this.config.d_model], A_label: 'Block Output' }
            },
            {
                id: 'linear',
                title: '7. Output Projection (Linear)',
                desc: 'The vector for the <b>last</b> token ("sat") is passed through a final linear layer that projects it to the size of the vocabulary. The output values are called <b>Logits</b>.',
                activeBoxes: ['box-linear'], activeLines: ['line-linear-softmax'],
                matrix_viz: {
                    op: '×',
                    A_dims: [1, this.config.d_model], A_label: 'Last Token Vector',
                    B_dims: [this.config.d_model, this.config.vocab_size], B_label: 'W_vocab',
                    C_dims: [1, this.config.vocab_size], C_label: 'Logits'
                }
            },
            {
                id: 'softmax',
                title: '8. Softmax',
                desc: 'The Softmax function converts the logits into a probability distribution over the entire vocabulary. The token with the highest probability is our prediction for the next word.',
                activeBoxes: ['box-softmax'], activeLines: ['line-softmax-out'],
                matrix_viz: { op: 'softmax' }
            },
            {
                id: 'autoregressive',
                title: '9. Autoregressive Loop',
                desc: 'The model predicts <b>"on"</b>. This word is appended to the input, forming "The cat sat on". The entire one-way process repeats to generate the next word. This is the essence of autoregressive LLMs.',
                activeBoxes: [], activeLines: [],
                matrix_viz: { op: 'loop' }
            }
        ];

        this.currentStep = 0;

        this.injectStyles();
        this.renderUI();
        this.updateStep();
    }

    injectStyles() {
        if (document.getElementById('tf-flow-styles')) return;
        const style = document.createElement('style');
        style.id = 'tf-flow-styles';
        style.textContent = `
            .tf-demo { background: rgba(10, 14, 22, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e8ecf1; }
            .tf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 15px; }
            .tf-title { font-size: 1.2rem; font-weight: bold; color: #64b4ff; }
            .tf-controls { display: flex; gap: 10px; align-items: center; }
            .tf-btn { background: #1a2333; color: #64b4ff; border: 1px solid #64b4ff; border-radius: 4px; padding: 6px 16px; cursor: pointer; transition: 0.2s; font-weight: bold; }
            .tf-btn:hover:not(:disabled) { background: #64b4ff; color: #000; }
            .tf-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            .tf-body { display: flex; gap: 20px; margin-top: 20px; }
            @media (max-width: 850px) { .tf-body { flex-direction: column; } }
            .tf-svg-container { flex: 0 0 350px; background: #0d1117; border-radius: 8px; padding: 20px 0; border: 1px solid rgba(255,255,255,0.1); }
            .tf-panel { flex: 1; display: flex; flex-direction: column; }
            .tf-step-title { color: #ffa726; font-size: 1.3rem; font-weight: bold; margin: 0 0 10px 0; }
            .tf-step-desc { font-size: 0.95rem; color: #ccc; line-height: 1.6; margin: 0; }
            .tf-step-desc b { color: #69f0ae; } .tf-step-desc i { font-family: "JetBrains Mono", monospace; color: #64b4ff; font-style: normal; }
            .tf-matrix-viz { margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 15px; flex-wrap: wrap; background: #161b22; padding: 20px; border-radius: 8px; min-height: 150px; }
            .pseudo-matrix { display: flex; flex-direction: column; align-items: center; }
            .matrix-label { font-family: "JetBrains Mono", monospace; margin-bottom: 8px; font-size: 0.8rem; color: #888; }
            .matrix-grid { display: grid; gap: 4px; border: 1px solid #444; padding: 4px; background: rgba(0,0,0,0.2); }
            .matrix-cell { width: 6px; height: 6px; background-color: #30363d; border-radius: 1px; }
            .viz-op { font-size: 2rem; font-weight: bold; color: #555; }
            .tf-prob-chart { width: 100%; display: flex; flex-direction: column; gap: 8px; }
            .tf-prob-row { display: flex; align-items: center; gap: 10px; }
            .tf-prob-label { width: 45px; font-family: "JetBrains Mono", monospace; font-size: 0.9rem; text-align: right;}
            .tf-prob-bar-bg { flex: 1; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; }
            .tf-prob-bar-fill { height: 100%; transition: width 0.4s ease; }
            .tf-prob-val { width: 40px; font-size: 0.8rem; color: #888; text-align: right;}
            .tf-tokens-container { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 20px; padding-top:15px; border-top: 1px solid rgba(255,255,255,0.1); }
            .tf-token { background: rgba(100, 180, 255, 0.15); border: 1px solid rgba(100, 180, 255, 0.3); padding: 5px 10px; border-radius: 4px; font-family: "JetBrains Mono", monospace; color: #fff; }
            .tf-token-new { background: rgba(105, 240, 174, 0.2); border: 1px solid rgba(105, 240, 174, 0.5); color: #69f0ae; font-weight: bold; animation: popIn 0.5s ease-out; }
            @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
            /* SVG States */
            .comp-box { fill: #222b38; stroke: #445870; stroke-width: 2; transition: all 0.3s; rx: 6; ry: 6; }
            .comp-text { fill: #bbb; font-size: 14px; font-weight: 500; text-anchor: middle; dominant-baseline: middle; pointer-events: none; transition: all 0.3s; }
            .comp-line { stroke: #445870; stroke-width: 3; fill: none; transition: all 0.3s; }
            .comp-box.active { fill: #ff9800; stroke: #fff; } .comp-text.active { fill: #000; font-weight: bold; }
            .comp-line.active { stroke: #69f0ae; }
        `;
        document.head.appendChild(style);
    }
    
    createPseudoMatrix(rows, cols, label) {
        const gridStyle = `grid-template-columns: repeat(${cols}, 1fr);`;
        let cells = '';
        for (let i = 0; i < rows * cols; i++) {
            cells += '<div class="matrix-cell"></div>';
        }
        return `
            <div class="pseudo-matrix">
                <div class="matrix-label">${label} (${rows}x${cols})</div>
                <div class="matrix-grid" style="${gridStyle}">${cells}</div>
            </div>
        `;
    }

    renderMatrixViz(vizData) {
        if (!vizData) return '<div style="flex:1;"></div>';
        if (vizData.op === 'result') {
            return this.createPseudoMatrix(vizData.A_dims[0], vizData.A_dims[1], vizData.A_label);
        }
        if (vizData.op === 'softmax') {
            return `
                <div class="tf-prob-chart">
                    <div class="tf-prob-row">
                        <div class="tf-prob-label" style="color:#69f0ae">on</div>
                        <div class="tf-prob-bar-bg"><div class="tf-prob-bar-fill" style="width:65%; background:#69f0ae;"></div></div>
                        <div class="tf-prob-val">65%</div>
                    </div>
                    <div class="tf-prob-row">
                        <div class="tf-prob-label">down</div>
                        <div class="tf-prob-bar-bg"><div class="tf-prob-bar-fill" style="width:20%; background:#64b4ff;"></div></div>
                        <div class="tf-prob-val">20%</div>
                    </div>
                    <div class="tf-prob-row">
                        <div class="tf-prob-label">...</div>
                        <div class="tf-prob-bar-bg"><div class="tf-prob-bar-fill" style="width:15%; background:#444;"></div></div>
                        <div class="tf-prob-val">15%</div>
                    </div>
                </div>`;
        }
        if (vizData.op === 'loop') {
             return `<div style="font-size: 1rem; color: #888; text-align: center; flex:1;">The cycle repeats with the new sequence.</div>`;
        }

        return `
            ${this.createPseudoMatrix(vizData.A_dims[0], vizData.A_dims[1], vizData.A_label)}
            <div class="viz-op">${vizData.op}</div>
            ${this.createPseudoMatrix(vizData.B_dims[0], vizData.B_dims[1], vizData.B_label)}
            <div class="viz-op">=</div>
            ${this.createPseudoMatrix(vizData.C_dims[0], vizData.C_dims[1], vizData.C_label)}
        `;
    }

    renderUI() {
        const svgHTML = `<svg width="350" height="540" viewBox="0 0 350 540"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0 0, 8 4, 0 8" fill="#445870"/></marker><marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0 0, 8 4, 0 8" fill="#69f0ae"/></marker></defs><text x="175" y="520" fill="#888" text-anchor="middle" font-size="14">Inputs</text><line id="line-in-embed" class="comp-line" x1="175" y1="500" x2="175" y2="460" marker-end="url(#arrow)"/><rect id="box-embed" class="comp-box" x="75" y="420" width="200" height="40"/><text id="text-embed" class="comp-text" x="175" y="440">Embedding</text><line id="line-embed-pos" class="comp-line" x1="175" y1="420" x2="175" y2="410" marker-end="url(#arrow)"/><rect id="box-pos" class="comp-box" x="75" y="370" width="200" height="40"/><text id="text-pos" class="comp-text" x="175" y="390">Positional Encoding</text><line id="line-pos-mha" class="comp-line" x1="175" y1="370" x2="175" y2="320" marker-end="url(#arrow)"/><rect x="40" y="155" width="270" height="195" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="5,5" rx="10"/><text x="55" y="175" fill="#888" font-size="12">Transformer Block</text><rect id="box-mha" class="comp-box" x="75" y="280" width="200" height="40"/><text id="text-mha" class="comp-text" x="175" y="300">Masked M-H Attention</text><line id="line-mha-norm1" class="comp-line" x1="175" y1="280" x2="175" y2="250" marker-end="url(#arrow)"/><path id="line-res1" class="comp-line" d="M 175 360 L 55 360 L 55 235 L 75 235" marker-end="url(#arrow)"/><rect id="box-norm1" class="comp-box" x="75" y="220" width="200" height="30"/><text id="text-norm1" class="comp-text" x="175" y="235">Add & Norm</text><line id="line-norm1-ffn" class="comp-line" x1="175" y1="220" x2="175" y2="200" marker-end="url(#arrow)"/><path id="line-res2" class="comp-line" d="M 175 210 L 55 210 L 55 175 L 75 175" marker-end="url(#arrow)"/><rect id="box-ffn" class="comp-box" x="75" y="170" width="200" height="30"/><text id="text-ffn" class="comp-text" x="175" y="185">Feed Forward</text><line id="line-ffn-norm2" class="comp-line" x1="175" y1="170" x2="175" y2="145"/><rect id="box-norm2" class="comp-box" x="75" y="115" width="200" height="30"/><text id="text-norm2" class="comp-text" x="175" y="130">Add & Norm</text><line id="line-norm2-linear" class="comp-line" x1="175" y1="115" x2="175" y2="85" marker-end="url(#arrow)"/><rect id="box-linear" class="comp-box" x="75" y="55" width="200" height="30"/><text id="text-linear" class="comp-text" x="175" y="70">Linear</text><line id="line-linear-softmax" class="comp-line" x1="175" y1="55" x2="175" y2="25" marker-end="url(#arrow)"/><rect id="box-softmax" class="comp-box" x="75" y="-5" width="200" height="30"/><text id="text-softmax" class="comp-text" x="175" y="10">Softmax</text><line id="line-softmax-out" class="comp-line" x1="175" y1="-5" x2="175" y2="-25" marker-end="url(#arrow)"/></svg>`;

        this.container.innerHTML = `<div class="tf-demo"><div class="tf-header"><div class="tf-title">Decoder Transformer: Forward Pass</div><div class="tf-controls"><button id="tf-prev" class="tf-btn">◄ Prev</button><span id="tf-step-indicator"></span><button id="tf-next" class="tf-btn">Next ►</button></div></div><div class="tf-body"><div class="tf-svg-container">${svgHTML}</div><div class="tf-panel"><div id="tf-panel-title"></div><p id="tf-panel-desc"></p><div id="tf-matrix-viz" class="tf-matrix-viz"></div><div id="tf-tokens-container" class="tf-tokens-container"></div></div></div></div>`;
        document.getElementById('tf-prev').addEventListener('click', () => { if (this.currentStep > 0) { this.currentStep--; this.updateStep(); }});
        document.getElementById('tf-next').addEventListener('click', () => { if (this.currentStep < this.steps.length - 1) { this.currentStep++; this.updateStep(); }});
    }

    updateStep() {
        document.getElementById('tf-prev').disabled = (this.currentStep === 0);
        document.getElementById('tf-next').disabled = (this.currentStep === this.steps.length - 1);
        document.getElementById('tf-step-indicator').innerText = `${this.currentStep + 1} / ${this.steps.length}`;

        const stepData = this.steps[this.currentStep];

        document.getElementById('tf-panel-title').innerHTML = stepData.title;
        document.getElementById('tf-panel-desc').innerHTML = stepData.desc;
        document.getElementById('tf-matrix-viz').innerHTML = this.renderMatrixViz(stepData.matrix_viz);

        // Token display logic
        const tokenContainer = document.getElementById('tf-tokens-container');
        if (this.currentStep < this.steps.length - 1) {
             tokenContainer.innerHTML = `<div class="tf-token">The</div><div class="tf-token">cat</div><div class="tf-token">sat</div>`;
        } else {
             tokenContainer.innerHTML = `<div class="tf-token">The</div><div class="tf-token">cat</div><div class="tf-token">sat</div><div class="tf-token tf-token-new">on</div>`;
        }

        // SVG Highlighting
        document.querySelectorAll('.comp-box, .comp-text, .comp-line').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.comp-line[marker-end]').forEach(el => el.setAttribute('marker-end', 'url(#arrow)'));

        stepData.activeBoxes.forEach(id => {
            const box = document.getElementById(id); if (box) box.classList.add('active');
            const text = document.getElementById(id.replace('box-', 'text-')); if (text) text.classList.add('active');
        });
        stepData.activeLines.forEach(id => {
            const line = document.getElementById(id);
            if (line) {
                line.classList.add('active');
                if(line.hasAttribute('marker-end')) line.setAttribute('marker-end', 'url(#arrow-active)');
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TransformerFlowDemo('transformer_demo');
});