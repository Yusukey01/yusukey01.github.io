// sec5_p9_deep_nn.js - Transformer Architecture Data Flow Demo
// Visualizes how data flows through a single Transformer block (Self-Attention, Add & Norm, FFN)

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
                title: '1. Input Sequence & Embedding',
                desc: 'A sequence of words (e.g., "The cat sat") is converted into dense vectors. <br><br><b>Formulation:</b><br> <b>X</b> = Embed(Tokens)',
                activeBoxes: ['box-embed'],
                activeLines: []
            },
            {
                id: 'pos',
                title: '2. Positional Encoding',
                desc: 'Since Self-Attention processes all tokens in parallel, we add sine/cosine positional signals to the embeddings so the model knows the word order.<br><br><b>Formulation:</b><br> <b>X</b> = <b>X</b> + PosEncoding',
                activeBoxes: ['box-pos'],
                activeLines: ['line-in-pos']
            },
            {
                id: 'mha',
                title: '3. Multi-Head Self-Attention',
                desc: 'The input <b>X</b> is split into Queries (<i>Q</i>), Keys (<i>K</i>), and Values (<i>V</i>). Each token computes attention scores with every other token to capture context.<br><br><b>Formulation:</b><br> <b>Z</b><sub>attn</sub> = Softmax(<i>Q K</i><sup>T</sup> / &radic;d) <i>V</i>',
                activeBoxes: ['box-mha'],
                activeLines: ['line-pos-mha']
            },
            {
                id: 'norm1',
                title: '4. Add & Layer Normalization 1',
                desc: 'A <b>Residual Connection</b> adds the original input <b>X</b> to the attention output to prevent vanishing gradients. The result is then normalized.<br><br><b>Formulation:</b><br> <b>Z</b><sub>1</sub> = LayerNorm(<b>Z</b><sub>attn</sub> + <b>X</b>)',
                activeBoxes: ['box-norm1'],
                activeLines: ['line-mha-norm1', 'line-res1']
            },
            {
                id: 'ffn',
                title: '5. Feed-Forward Network',
                desc: 'The contextualized vectors are passed through a position-wise fully connected network with a ReLU activation. This applies non-linear transformations to each token independently.<br><br><b>Formulation:</b><br> <b>F</b> = max(0, <b>Z</b><sub>1</sub><i>W</i><sub>1</sub> + <i>b</i><sub>1</sub>)<i>W</i><sub>2</sub> + <i>b</i><sub>2</sub>',
                activeBoxes: ['box-ffn'],
                activeLines: ['line-norm1-ffn']
            },
            {
                id: 'norm2',
                title: '6. Add & Layer Normalization 2',
                desc: 'Another residual connection adds the input of the FFN to its output, followed by a final layer normalization.<br><br><b>Formulation:</b><br> <b>Z</b><sub>out</sub> = LayerNorm(<b>F</b> + <b>Z</b><sub>1</sub>)',
                activeBoxes: ['box-norm2'],
                activeLines: ['line-ffn-norm2', 'line-res2']
            },
            {
                id: 'output',
                title: '7. Block Output',
                desc: 'The Transformer block has finished processing the sequence. These enriched, context-aware representations can now be passed to the next Transformer block, or to a final classifier/generator.<br><br><b>Result:</b><br> 1 Block Completed.',
                activeBoxes: [],
                activeLines: ['line-norm2-out']
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
                gap: 30px;
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
                justify-content: center;
            }
            .tf-step-title {
                color: #ffa726; font-size: 1.4rem; font-weight: bold; margin-bottom: 15px;
            }
            .tf-step-desc {
                font-size: 1rem; color: #ccc; line-height: 1.6;
            }
            .tf-step-desc b { color: #69f0ae; }
            .tf-step-desc i { font-family: "JetBrains Mono", monospace; color: #64b4ff; font-style: normal; }

            /* SVG Elements */
            .comp-box {
                fill: #222b38;
                stroke: #445870;
                stroke-width: 2;
                transition: all 0.3s;
                rx: 6; ry: 6;
            }
            .comp-text {
                fill: #bbb;
                font-size: 14px;
                font-weight: 500;
                text-anchor: middle;
                dominant-baseline: middle;
                pointer-events: none;
                transition: all 0.3s;
            }
            .comp-line {
                stroke: #445870;
                stroke-width: 3;
                fill: none;
                transition: all 0.3s;
            }
            
            /* Active States */
            .comp-box.active {
                fill: #ff9800;
                stroke: #fff;
                filter: drop-shadow(0 0 8px rgba(255, 152, 0, 0.6));
            }
            .comp-text.active {
                fill: #000;
                font-weight: bold;
            }
            .comp-line.active {
                stroke: #69f0ae;
                filter: drop-shadow(0 0 5px rgba(105, 240, 174, 0.6));
            }
        `;
        document.head.appendChild(style);
    }

    renderUI() {
        // Build the SVG Architecture
        const svgHTML = `
            <svg width="350" height="480" viewBox="0 0 350 480">
                <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#445870" class="marker-arrow" />
                    </marker>
                    <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#69f0ae" />
                    </marker>
                </defs>

                <!-- Input -->
                <text x="175" y="460" fill="#888" text-anchor="middle" font-size="14">Inputs (Words)</text>
                <line id="line-in-pos" class="comp-line" x1="175" y1="440" x2="175" y2="400" marker-end="url(#arrow)" />
                
                <!-- Embedding & Pos -->
                <rect id="box-embed" class="comp-box" x="75" y="360" width="200" height="40" />
                <text id="text-embed" class="comp-text" x="175" y="380">Input Embedding</text>
                
                <rect id="box-pos" class="comp-box" x="75" y="310" width="200" height="40" />
                <text id="text-pos" class="comp-text" x="175" y="330">Positional Encoding</text>

                <!-- Connection to MHA -->
                <line id="line-pos-mha" class="comp-line" x1="175" y1="310" x2="175" y2="260" marker-end="url(#arrow)" />

                <!-- Transformer Block Boundary -->
                <rect x="40" y="30" width="270" height="260" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="5,5" rx="10" />
                <text x="50" y="50" fill="#888" font-size="12">Transformer Block</text>

                <!-- MHA -->
                <rect id="box-mha" class="comp-box" x="75" y="220" width="200" height="40" />
                <text id="text-mha" class="comp-text" x="175" y="240">Multi-Head Attention</text>

                <line id="line-mha-norm1" class="comp-line" x1="175" y1="220" x2="175" y2="190" marker-end="url(#arrow)" />
                
                <!-- Residual 1 -->
                <path id="line-res1" class="comp-line" d="M 175 285 L 55 285 L 55 170 L 75 170" marker-end="url(#arrow)" />

                <!-- Add & Norm 1 -->
                <rect id="box-norm1" class="comp-box" x="75" y="150" width="200" height="40" />
                <text id="text-norm1" class="comp-text" x="175" y="170">Add & Layer Norm</text>

                <line id="line-norm1-ffn" class="comp-line" x1="175" y1="150" x2="175" y2="120" marker-end="url(#arrow)" />

                <!-- Residual 2 -->
                <path id="line-res2" class="comp-line" d="M 175 135 L 55 135 L 55 60 L 75 60" marker-end="url(#arrow)" />

                <!-- FFN -->
                <rect id="box-ffn" class="comp-box" x="75" y="80" width="200" height="40" />
                <text id="text-ffn" class="comp-text" x="175" y="100">Feed Forward</text>

                <line id="line-ffn-norm2" class="comp-line" x1="175" y1="80" x2="175" y2="60" />

                <!-- Add & Norm 2 -->
                <rect id="box-norm2" class="comp-box" x="75" y="40" width="200" height="30" />
                <text id="text-norm2" class="comp-text" x="175" y="55">Add & Layer Norm</text>

                <!-- Output -->
                <line id="line-norm2-out" class="comp-line" x1="175" y1="40" x2="175" y2="15" marker-end="url(#arrow)" />
            </svg>
        `;

        this.container.innerHTML = `
            <div class="tf-demo">
                <div class="tf-header">
                    <div class="tf-title">Transformer Block: Forward Pass</div>
                    <div class="tf-controls">
                        <button id="tf-prev" class="tf-btn">◄ Prev Step</button>
                        <span id="tf-step-indicator" style="font-size: 0.95rem; width: 60px; text-align: center;"></span>
                        <button id="tf-next" class="tf-btn">Next Step ►</button>
                    </div>
                </div>
                <div class="tf-body">
                    <div class="tf-svg-container">
                        ${svgHTML}
                    </div>
                    <div class="tf-panel">
                        <div id="tf-panel-title" class="tf-step-title"></div>
                        <div id="tf-panel-desc" class="tf-step-desc"></div>
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
            // Reset marker color
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
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TransformerFlowDemo('transformer_demo');
});