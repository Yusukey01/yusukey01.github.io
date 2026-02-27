// sec5_p9_deep_nn.js - Transformer Autoregressive Flow Demo
// Visualizes how data flows through a Decoder-only Transformer (like GPT) to predict the next word.

class TransformerFlowDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`[TransformerDemo] Container #${containerId} not found`);
            return;
        }

        // Define the steps of the forward pass
        this.steps = [
            {
                id: 'input',
                title: '1. Input Sequence',
                desc: 'The current sequence of words is tokenized. Today\'s LLMs (like GPT) are <b>Decoder-only</b> models. They process the entire current sequence at once.<br><br><i>Current Input: "The", "cat", "sat"</i>',
                activeBoxes: ['box-embed'],
                activeLines: ['line-in-pos']
            },
            {
                id: 'pos',
                title: '2. Embedding & Positional Encoding',
                desc: 'Words are mapped to dense vectors (Embeddings). Since the network processes everything in parallel, we add sine/cosine signals so it knows the word order.<br><br><b>X</b> = Embed(Tokens) + PosEncoding',
                activeBoxes: ['box-pos', 'box-embed'],
                activeLines: ['line-pos-mha']
            },
            {
                id: 'mha',
                title: '3. Masked Multi-Head Attention',
                desc: 'Each word looks at <b>past</b> words to gather context. A <b>Causal Mask</b> prevents words from looking at future tokens (e.g., "cat" cannot attend to "sat").<br><br><b>Z</b><sub>attn</sub> = Softmax(<i>Mask</i>(<i>Q K</i><sup>T</sup>)) <i>V</i>',
                activeBoxes: ['box-mha'],
                activeLines: ['line-mha-norm1', 'line-res1']
            },
            {
                id: 'norm1',
                title: '4. Add & Layer Normalization',
                desc: 'The original input is added back (Residual Connection) to prevent gradients from vanishing, and the result is normalized to stabilize training.<br><br><b>Z</b><sub>1</sub> = LayerNorm(<b>Z</b><sub>attn</sub> + <b>X</b>)',
                activeBoxes: ['box-norm1'],
                activeLines: ['line-norm1-ffn']
            },
            {
                id: 'ffn',
                title: '5. Feed-Forward Network',
                desc: 'The vectors pass through a fully connected network with non-linear activation (ReLU/GELU). This is where the model accesses its "memorized knowledge".',
                activeBoxes: ['box-ffn'],
                activeLines: ['line-ffn-norm2', 'line-res2']
            },
            {
                id: 'norm2',
                title: '6. Add & Layer Normalization',
                desc: 'Another residual connection and normalization step. The Transformer Block outputs a highly contextualized vector for the <b>last token</b> ("sat").',
                activeBoxes: ['box-norm2'],
                activeLines: ['line-norm2-linear']
            },
            {
                id: 'linear',
                title: '7. Output Projection (Linear)',
                desc: 'The contextualized vector of the last token is projected into the size of the entire vocabulary (e.g., 50,000 words). These are raw scores called <b>Logits</b>.',
                activeBoxes: ['box-linear'],
                activeLines: ['line-linear-softmax']
            },
            {
                id: 'softmax',
                title: '8. Softmax (Next Word Probabilities)',
                desc: 'The Softmax function converts logits into a <b>probability distribution</b> (summing to 100%). <br>Based on context, words like <i>"on"</i> or <i>"down"</i> get the highest scores.',
                activeBoxes: ['box-softmax'],
                activeLines: ['line-softmax-out']
            },
            {
                id: 'autoregressive',
                title: '9. Autoregressive Generation',
                desc: 'The model samples the highest probability word (<b>"on"</b>). This word is then <b>appended to the input</b> ("The cat sat on"), and the entire one-way process repeats to predict the <i>next</i> word. This is how LLMs write text!',
                activeBoxes: [],
                activeLines: []
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
            .tf-demo {
                background: rgba(10, 14, 22, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #e8ecf1;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .tf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 15px;
            }
            .tf-title { font-size: 1.2rem; font-weight: bold; color: #64b4ff; }
            .tf-controls { display: flex; gap: 10px; align-items: center; }
            .tf-btn {
                background: #1a2333; color: #64b4ff;
                border: 1px solid #64b4ff; border-radius: 4px;
                padding: 6px 16px; cursor: pointer; transition: 0.2s; font-weight: bold;
            }
            .tf-btn:hover:not(:disabled) { background: #64b4ff; color: #000; }
            .tf-btn:disabled { opacity: 0.4; cursor: not-allowed; border-color: #555; color: #555; }
            
            .tf-body {
                display: flex;
                gap: 20px;
                align-items: stretch;
            }
            @media (max-width: 768px) {
                .tf-body { flex-direction: column; }
            }
            .tf-svg-container {
                flex: 1;
                background: #0d1117;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px 0;
            }
            .tf-panel {
                flex: 1;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
                padding: 25px;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
            }
            .tf-step-title {
                color: #ffa726; font-size: 1.3rem; font-weight: bold; margin-bottom: 15px;
            }
            .tf-step-desc {
                font-size: 1rem; color: #ccc; line-height: 1.6; margin-bottom: 20px;
            }
            .tf-step-desc b { color: #69f0ae; }
            .tf-step-desc i { font-family: "JetBrains Mono", monospace; color: #64b4ff; font-style: normal; }

            /* Tokens Display */
            .tf-tokens-container {
                display: flex;
                align-items: center;
                gap: 8px;
                background: #161b22;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.05);
                margin-top: auto;
                flex-wrap: wrap;
            }
            .tf-token {
                background: rgba(100, 180, 255, 0.15);
                border: 1px solid rgba(100, 180, 255, 0.3);
                padding: 5px 10px;
                border-radius: 4px;
                font-family: "JetBrains Mono", monospace;
                color: #fff;
            }
            .tf-token-new {
                background: rgba(105, 240, 174, 0.2);
                border: 1px solid rgba(105, 240, 174, 0.5);
                color: #69f0ae;
                font-weight: bold;
                animation: popIn 0.5s ease-out;
            }
            @keyframes popIn {
                0% { transform: scale(0.5); opacity: 0; }
                80% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); }
            }

            /* Probabilities Chart */
            .tf-prob-chart {
                display: flex; flex-direction: column; gap: 8px;
            }
            .tf-prob-row {
                display: flex; align-items: center; gap: 10px;
            }
            .tf-prob-label { width: 45px; font-family: "JetBrains Mono", monospace; font-size: 0.9rem; text-align: right;}
            .tf-prob-bar-bg { flex: 1; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; }
            .tf-prob-bar-fill { height: 100%; transition: width 0.4s ease; }
            .tf-prob-val { width: 40px; font-size: 0.8rem; color: #888; text-align: right;}

            /* SVG Elements */
            .comp-box {
                fill: #222b38; stroke: #445870; stroke-width: 2; transition: all 0.3s; rx: 6; ry: 6;
            }
            .comp-text {
                fill: #bbb; font-size: 14px; font-weight: 500; text-anchor: middle; dominant-baseline: middle; pointer-events: none; transition: all 0.3s;
            }
            .comp-line {
                stroke: #445870; stroke-width: 3; fill: none; transition: all 0.3s;
            }
            /* Active States */
            .comp-box.active { fill: #ff9800; stroke: #fff; filter: drop-shadow(0 0 8px rgba(255, 152, 0, 0.6)); }
            .comp-text.active { fill: #000; font-weight: bold; }
            .comp-line.active { stroke: #69f0ae; filter: drop-shadow(0 0 5px rgba(105, 240, 174, 0.6)); }
        `;
        document.head.appendChild(style);
    }

    renderUI() {
        // Build the SVG Architecture
        const svgHTML = `
            <svg width="350" height="540" viewBox="0 0 350 540">
                <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#445870" />
                    </marker>
                    <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#69f0ae" />
                    </marker>
                </defs>

                <!-- Input -->
                <text x="175" y="520" fill="#888" text-anchor="middle" font-size="14">Inputs (Words)</text>
                <line id="line-in-pos" class="comp-line" x1="175" y1="500" x2="175" y2="460" marker-end="url(#arrow)" />
                
                <!-- Embedding & Pos -->
                <rect id="box-embed" class="comp-box" x="75" y="420" width="200" height="40" />
                <text id="text-embed" class="comp-text" x="175" y="440">Input Embedding</text>
                
                <rect id="box-pos" class="comp-box" x="75" y="370" width="200" height="40" />
                <text id="text-pos" class="comp-text" x="175" y="390">Positional Encoding</text>

                <!-- Connection to MHA -->
                <line id="line-pos-mha" class="comp-line" x1="175" y1="370" x2="175" y2="320" marker-end="url(#arrow)" />

                <!-- Transformer Block Boundary -->
                <rect x="40" y="160" width="270" height="150" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="5,5" rx="10" />
                <text x="50" y="175" fill="#888" font-size="12">Transformer Block (xN)</text>

                <!-- MHA -->
                <rect id="box-mha" class="comp-box" x="75" y="280" width="200" height="30" />
                <text id="text-mha" class="comp-text" x="175" y="295">Masked Multi-Head Attn</text>

                <line id="line-mha-norm1" class="comp-line" x1="175" y1="280" x2="175" y2="260" marker-end="url(#arrow)" />
                <path id="line-res1" class="comp-line" d="M 175 345 L 55 345 L 55 245 L 75 245" marker-end="url(#arrow)" />

                <!-- Norm 1 -->
                <rect id="box-norm1" class="comp-box" x="75" y="230" width="200" height="30" />
                <text id="text-norm1" class="comp-text" x="175" y="245">Add & Norm</text>

                <line id="line-norm1-ffn" class="comp-line" x1="175" y1="230" x2="175" y2="210" marker-end="url(#arrow)" />
                <path id="line-res2" class="comp-line" d="M 175 220 L 55 220 L 55 185 L 75 185" marker-end="url(#arrow)" />

                <!-- FFN -->
                <rect id="box-ffn" class="comp-box" x="75" y="180" width="200" height="30" />
                <text id="text-ffn" class="comp-text" x="175" y="195">Feed Forward</text>

                <line id="line-ffn-norm2" class="comp-line" x1="175" y1="180" x2="175" y2="150" />

                <!-- Norm 2 -->
                <rect id="box-norm2" class="comp-box" x="75" y="130" width="200" height="30" />
                <text id="text-norm2" class="comp-text" x="175" y="145">Add & Norm</text>

                <!-- Connection to Linear -->
                <line id="line-norm2-linear" class="comp-line" x1="175" y1="130" x2="175" y2="100" marker-end="url(#arrow)" />

                <!-- Linear (Output Projection) -->
                <rect id="box-linear" class="comp-box" x="75" y="70" width="200" height="30" />
                <text id="text-linear" class="comp-text" x="175" y="85">Linear (Vocab Size)</text>

                <line id="line-linear-softmax" class="comp-line" x1="175" y1="70" x2="175" y2="40" marker-end="url(#arrow)" />

                <!-- Softmax -->
                <rect id="box-softmax" class="comp-box" x="75" y="10" width="200" height="30" />
                <text id="text-softmax" class="comp-text" x="175" y="25">Softmax (Probabilities)</text>
                
                <line id="line-softmax-out" class="comp-line" x1="175" y1="10" x2="175" y2="-5" marker-end="url(#arrow)" />
            </svg>
        `;

        this.container.innerHTML = `
            <div class="tf-demo">
                <div class="tf-header">
                    <div class="tf-title">Autoregressive LLM Forward Pass</div>
                    <div class="tf-controls">
                        <button id="tf-prev" class="tf-btn">◄ Prev</button>
                        <span id="tf-step-indicator" style="font-size: 0.95rem; width: 60px; text-align: center;"></span>
                        <button id="tf-next" class="tf-btn">Next ►</button>
                    </div>
                </div>
                <div class="tf-body">
                    <div class="tf-svg-container">
                        ${svgHTML}
                    </div>
                    <div class="tf-panel">
                        <div id="tf-panel-title" class="tf-step-title"></div>
                        <div id="tf-panel-desc" class="tf-step-desc"></div>
                        
                        <div id="tf-prob-area" style="display:none;">
                            <div class="tf-prob-chart">
                                <div class="tf-prob-row">
                                    <div class="tf-prob-label" style="color:#69f0ae">on</div>
                                    <div class="tf-prob-bar-bg"><div class="tf-prob-bar-fill" style="width:0%; background:#69f0ae;" id="bar-1"></div></div>
                                    <div class="tf-prob-val" id="val-1">0%</div>
                                </div>
                                <div class="tf-prob-row">
                                    <div class="tf-prob-label">down</div>
                                    <div class="tf-prob-bar-bg"><div class="tf-prob-bar-fill" style="width:0%; background:#64b4ff;" id="bar-2"></div></div>
                                    <div class="tf-prob-val" id="val-2">0%</div>
                                </div>
                                <div class="tf-prob-row">
                                    <div class="tf-prob-label">quietly</div>
                                    <div class="tf-prob-bar-bg"><div class="tf-prob-bar-fill" style="width:0%; background:#64b4ff;" id="bar-3"></div></div>
                                    <div class="tf-prob-val" id="val-3">0%</div>
                                </div>
                            </div>
                        </div>

                        <div class="tf-tokens-container" id="tf-tokens">
                            <!-- Tokens injected dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('tf-prev').addEventListener('click', () => {
            if (this.currentStep > 0) { this.currentStep--; this.updateStep(); }
        });
        document.getElementById('tf-next').addEventListener('click', () => {
            if (this.currentStep < this.steps.length - 1) { this.currentStep++; this.updateStep(); }
        });
    }

    updateStep() {
        // Update Buttons
        document.getElementById('tf-prev').disabled = (this.currentStep === 0);
        document.getElementById('tf-next').disabled = (this.currentStep === this.steps.length - 1);
        document.getElementById('tf-step-indicator').innerText = `${this.currentStep + 1} / ${this.steps.length}`;

        const stepData = this.steps[this.currentStep];

        // Update Panel Text
        document.getElementById('tf-panel-title').innerHTML = stepData.title;
        document.getElementById('tf-panel-desc').innerHTML = stepData.desc;

        // Reset all SVG active states
        document.querySelectorAll('.comp-box').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.comp-text').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.comp-line').forEach(el => {
            el.classList.remove('active');
            if(el.hasAttribute('marker-end')) el.setAttribute('marker-end', 'url(#arrow)');
        });

        // Apply active states for current step
        stepData.activeBoxes.forEach(id => {
            const box = document.getElementById(id);
            const text = document.getElementById(id.replace('box-', 'text-'));
            if (box) box.classList.add('active');
            if (text) text.classList.add('active');
        });

        stepData.activeLines.forEach(id => {
            const line = document.getElementById(id);
            if (line) {
                line.classList.add('active');
                if(line.hasAttribute('marker-end')) line.setAttribute('marker-end', 'url(#arrow-active)');
            }
        });

        // Update UI logic (Probabilities and Tokens)
        const probArea = document.getElementById('tf-prob-area');
        const tokenContainer = document.getElementById('tf-tokens');
        
        // Render Sequence
        if (this.currentStep < 7) {
            probArea.style.display = 'none';
            tokenContainer.innerHTML = `
                <div class="tf-token">The</div>
                <div class="tf-token">cat</div>
                <div class="tf-token">sat</div>
            `;
        } else if (this.currentStep === 7) {
            // Softmax: Show probabilities
            probArea.style.display = 'block';
            setTimeout(() => {
                document.getElementById('bar-1').style.width = '65%'; document.getElementById('val-1').innerText = '65%';
                document.getElementById('bar-2').style.width = '20%'; document.getElementById('val-2').innerText = '20%';
                document.getElementById('bar-3').style.width = '10%'; document.getElementById('val-3').innerText = '10%';
            }, 50);
            tokenContainer.innerHTML = `
                <div class="tf-token">The</div>
                <div class="tf-token">cat</div>
                <div class="tf-token">sat</div>
            `;
        } else if (this.currentStep === 8) {
            // Autoregressive: append "on"
            probArea.style.display = 'block';
            tokenContainer.innerHTML = `
                <div class="tf-token">The</div>
                <div class="tf-token">cat</div>
                <div class="tf-token">sat</div>
                <div class="tf-token tf-token-new">on</div>
                <div style="color: #64b4ff; font-weight:bold; margin-left:10px;">&olarr; Loop!</div>
            `;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TransformerFlowDemo('transformer_demo');
});