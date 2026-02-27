// sec5_p9_deep_nn.js - Mathematical Transformer Architecture Demo
// Visualizes the exact matrix operations (Q, K, V, Softmax) inside a Transformer block

class TransformerDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`[TransformerDemo] Container #${containerId} not found`);
            return;
        }
        
        // --- 1. Matrix Operations Utility ---
        this.Mat = {
            mul: (A, B) => A.map(row => B[0].map((_, i) => row.reduce((sum, val, j) => sum + val * B[j][i], 0))),
            add: (A, B) => A.map((row, i) => row.map((val, j) => val + B[i][j])),
            transpose: A => A[0].map((_, i) => A.map(row => row[i])),
            scale: (A, s) => A.map(row => row.map(val => val * s)),
            softmax: A => A.map(row => {
                const max = Math.max(...row);
                const exps = row.map(v => Math.exp(v - max));
                const sum = exps.reduce((a, b) => a + b, 0);
                return exps.map(v => v / sum);
            }),
            format: (A, prec=2) => {
                if (!Array.isArray(A[0])) A = [A];
                return `<table class="matrix-table">` + 
                       A.map(row => `<tr>${row.map(val => `<td>${val.toFixed(prec)}</td>`).join('')}</tr>`).join('') +
                       `</table>`;
            }
        };

        // --- 2. Model Parameters (Toy Example: d=4) ---
        this.d = 4;
        this.tokens = ["The", "cat", "sat"];
        
        // Input Embeddings (X) [3 x 4]
        this.X = [
            [ 0.5,  0.1, -0.2,  0.8], // The
            [-0.4,  0.9,  0.5, -0.1], // cat
            [ 0.2, -0.3,  0.8,  0.4]  // sat
        ];

        // Weight Matrices (W_q, W_k, W_v) [4 x 4]
        // Chosen specifically to highlight "cat" and "sat" relationship
        this.W_q = [
            [ 1.0,  0.0, -0.5,  0.2],
            [ 0.0,  1.2,  0.1, -0.3],
            [-0.5,  0.1,  1.0,  0.0],
            [ 0.2, -0.3,  0.0,  0.8]
        ];
        
        this.W_k = [
            [ 0.8,  0.1, -0.2,  0.0],
            [ 0.1,  0.9,  0.3, -0.1],
            [-0.2,  0.3,  1.1,  0.2],
            [ 0.0, -0.1,  0.2,  0.7]
        ];

        this.W_v = [
            [ 0.5, -0.1,  0.0,  0.2],
            [ 0.1,  0.6, -0.2,  0.0],
            [ 0.0,  0.2,  0.8, -0.1],
            [-0.2,  0.0,  0.1,  0.9]
        ];

        // --- 3. Compute Forward Pass ---
        this.Q = this.Mat.mul(this.X, this.W_q);
        this.K = this.Mat.mul(this.X, this.W_k);
        this.V = this.Mat.mul(this.X, this.W_v);
        
        this.scores = this.Mat.mul(this.Q, this.Mat.transpose(this.K));
        this.scaled_scores = this.Mat.scale(this.scores, 1 / Math.sqrt(this.d));
        this.attention_weights = this.Mat.softmax(this.scaled_scores);
        
        this.Z = this.Mat.mul(this.attention_weights, this.V);

        // --- 4. State Management ---
        this.state = {
            step: 0,
            maxSteps: 5
        };

        // Inject Styles
        this.injectStyles();
        
        // Render Initial UI
        this.renderUI();
        this.updateStep();
    }

    injectStyles() {
        if (document.getElementById('transformer-math-styles')) return;
        const style = document.createElement('style');
        style.id = 'transformer-math-styles';
        style.textContent = `
            .tf-demo {
                background: rgba(10, 14, 22, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 20px;
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
                color: #e8ecf1;
            }
            .tf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 10px;
            }
            .tf-title { font-size: 1.1rem; font-weight: bold; color: #64b4ff; }
            .tf-controls { display: flex; gap: 10px; }
            .tf-btn {
                background: #1a2333; color: #64b4ff;
                border: 1px solid #64b4ff; border-radius: 4px;
                padding: 5px 15px; cursor: pointer; transition: 0.2s;
            }
            .tf-btn:hover:not(:disabled) { background: #64b4ff; color: #000; }
            .tf-btn:disabled { opacity: 0.5; cursor: not-allowed; border-color: #555; color: #555; }
            
            .tf-content {
                display: flex;
                flex-direction: column;
                gap: 20px;
                min-height: 400px;
            }
            .tf-step-title {
                color: #ffa726; font-size: 1.2rem; margin-bottom: 10px;
            }
            .tf-step-desc {
                font-family: sans-serif; font-size: 0.9rem; color: #aaa; margin-bottom: 15px;
                line-height: 1.5;
            }
            .tf-math-container {
                display: flex; align-items: center; justify-content: center;
                gap: 15px; flex-wrap: wrap;
                background: #0d1117; padding: 20px; border-radius: 6px;
            }
            .tf-matrix-box {
                display: flex; flex-direction: column; align-items: center;
            }
            .tf-matrix-label {
                margin-bottom: 8px; font-weight: bold; color: #69f0ae;
            }
            .matrix-table {
                border-collapse: collapse; background: #161b22;
                border-left: 2px solid #555; border-right: 2px solid #555;
            }
            .matrix-table td {
                padding: 6px 10px; text-align: right;
                font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.05);
            }
            .tf-operator { font-size: 1.5rem; color: #888; font-weight: bold; }
            
            /* Heatmap colors for Attention Weights */
            .heatmap-td { color: #fff; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }

    renderUI() {
        this.container.innerHTML = `
            <div class="tf-demo">
                <div class="tf-header">
                    <div class="tf-title">Self-Attention Mathematical Trace</div>
                    <div class="tf-controls">
                        <button id="tf-prev" class="tf-btn">◄ Prev</button>
                        <span id="tf-step-count" style="align-self: center; font-size: 0.9rem;"></span>
                        <button id="tf-next" class="tf-btn">Next ►</button>
                    </div>
                </div>
                <div id="tf-content" class="tf-content"></div>
            </div>
        `;
        document.getElementById('tf-prev').addEventListener('click', () => {
            if (this.state.step > 0) { this.state.step--; this.updateStep(); }
        });
        document.getElementById('tf-next').addEventListener('click', () => {
            if (this.state.step < this.state.maxSteps) { this.state.step++; this.updateStep(); }
        });
    }

    // Helper to add word labels to matrices
    withLabels(matrixHTML, isAttention = false) {
        const rows = matrixHTML.split('<tr>');
        let newHtml = rows[0]; // `<table ...>`
        for(let i=1; i<rows.length; i++) {
            newHtml += `<tr><td style="color:#ffa726; border:none; padding-right:15px;">${this.tokens[i-1]}</td>` + rows[i];
        }
        return newHtml;
    }

    // Special formatting for attention matrix to act as heatmap
    formatAttention(A) {
        let html = `<table class="matrix-table" style="border:none;">`;
        // Header
        html += `<tr><td style="border:none;"></td>` + this.tokens.map(t => `<td style="color:#ffa726; border:none; text-align:center;">${t}</td>`).join('') + `</tr>`;
        
        A.forEach((row, i) => {
            html += `<tr><td style="color:#ffa726; border:none; padding-right:15px;">${this.tokens[i]}</td>`;
            row.forEach(val => {
                // Map 0-1 to a blue-ish intensity
                const intensity = Math.floor(val * 255);
                const bg = `rgba(100, 180, 255, ${val.toFixed(2)})`;
                html += `<td class="heatmap-td" style="background:${bg}; border:1px solid #333;">${val.toFixed(3)}</td>`;
            });
            html += `</tr>`;
        });
        html += `</table>`;
        return html;
    }

    updateStep() {
        document.getElementById('tf-prev').disabled = this.state.step === 0;
        document.getElementById('tf-next').disabled = this.state.step === this.state.maxSteps;
        document.getElementById('tf-step-count').innerText = `Step ${this.state.step} / ${this.state.maxSteps}`;

        const content = document.getElementById('tf-content');
        let html = '';

        switch(this.state.step) {
            case 0:
                html = `
                    <div class="tf-step-title">Step 0: Input Embeddings (X)</div>
                    <div class="tf-step-desc">
                        We start with a sequence of 3 words: <strong>"The", "cat", "sat"</strong>.<br>
                        Each word has been converted into a dense vector of dimension \(d=4\).<br>
                        This matrix \(\mathbf{X} \in \mathbb{R}^{3 \times 4}\) is the input to the Self-Attention layer.
                    </div>
                    <div class="tf-math-container">
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Input Matrix X</div>
                            ${this.withLabels(this.Mat.format(this.X))}
                        </div>
                    </div>
                `;
                break;
            case 1:
                html = `
                    <div class="tf-step-title">Step 1: Compute Q, K, V</div>
                    <div class="tf-step-desc">
                        The input \(\mathbf{X}\) is multiplied by three learned weight matrices 
                        \(\mathbf{W}^Q, \mathbf{W}^K, \mathbf{W}^V\) to produce the <strong>Queries (Q)</strong>, <strong>Keys (K)</strong>, and <strong>Values (V)</strong>.<br>
                        \(\mathbf{Q} = \mathbf{X}\mathbf{W}^Q, \quad \mathbf{K} = \mathbf{X}\mathbf{W}^K, \quad \mathbf{V} = \mathbf{X}\mathbf{W}^V\)
                    </div>
                    <div class="tf-math-container">
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Queries (Q)</div>
                            ${this.withLabels(this.Mat.format(this.Q))}
                        </div>
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Keys (K)</div>
                            ${this.withLabels(this.Mat.format(this.K))}
                        </div>
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Values (V)</div>
                            ${this.withLabels(this.Mat.format(this.V))}
                        </div>
                    </div>
                `;
                break;
            case 2:
                html = `
                    <div class="tf-step-title">Step 2: Compute Attention Scores</div>
                    <div class="tf-step-desc">
                        We calculate how much each word should attend to every other word by taking the dot product of their Queries and Keys: 
                        \(\mathbf{Q}\mathbf{K}^\top\).<br>
                        For example, the score between "cat" (Query) and "sat" (Key) is high, indicating a strong relationship.
                    </div>
                    <div class="tf-math-container">
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Q</div>
                            ${this.Mat.format(this.Q)}
                        </div>
                        <div class="tf-operator">×</div>
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">K^T</div>
                            ${this.Mat.format(this.Mat.transpose(this.K))}
                        </div>
                        <div class="tf-operator">=</div>
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Scores (Q K^T)</div>
                            ${this.withLabels(this.Mat.format(this.scores))}
                        </div>
                    </div>
                `;
                break;
            case 3:
                html = `
                    <div class="tf-step-title">Step 3: Scale and Softmax</div>
                    <div class="tf-step-desc">
                        To prevent gradients from vanishing, we scale the scores by \(\frac{1}{\sqrt{d}}\) (here \(1/\sqrt{4} = 0.5\)).<br>
                        Then, we apply the <strong>Softmax</strong> function to each row so the weights sum to 1.0. 
                        Notice how "cat" pays significant attention to "sat".
                    </div>
                    <div class="tf-math-container">
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Attention Weights (\(\alpha\))</div>
                            ${this.formatAttention(this.attention_weights)}
                        </div>
                    </div>
                `;
                break;
            case 4:
                html = `
                    <div class="tf-step-title">Step 4: Compute Final Output (Z)</div>
                    <div class="tf-step-desc">
                        Finally, we multiply the Attention Weights by the Values matrix \(\mathbf{V}\): 
                        \(\mathbf{Z} = \alpha \mathbf{V}\).<br>
                        The output for each word is now a <strong>context-aware</strong> mixture of all other words' Values.
                    </div>
                    <div class="tf-math-container">
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">\(\alpha\)</div>
                            ${this.Mat.format(this.attention_weights)}
                        </div>
                        <div class="tf-operator">×</div>
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">V</div>
                            ${this.Mat.format(this.V)}
                        </div>
                        <div class="tf-operator">=</div>
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Contextualized Output (Z)</div>
                            ${this.withLabels(this.Mat.format(this.Z))}
                        </div>
                    </div>
                `;
                break;
            case 5:
                html = `
                    <div class="tf-step-title">Summary: The Self-Attention Equation</div>
                    <div class="tf-step-desc">
                        We have successfully traced the core equation of the Transformer architecture:
                        <div style="font-size:1.3rem; text-align:center; padding:15px; margin: 15px 0; background:rgba(100,180,255,0.1); border-radius:8px;">
                            \(\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left(\frac{\mathbf{Q}\mathbf{K}^\top}{\sqrt{d}}\right)\mathbf{V}\)
                        </div>
                        This output \(\mathbf{Z}\) is then passed through a Residual Connection (\(\mathbf{Z} + \mathbf{X}\)), Layer Normalization, and a Feed-Forward network to complete one full Transformer block.
                    </div>
                    <div class="tf-math-container">
                        <div class="tf-matrix-box">
                            <div class="tf-matrix-label">Final Output Matrix Z</div>
                            ${this.withLabels(this.Mat.format(this.Z))}
                        </div>
                    </div>
                `;
                break;
        }

        content.innerHTML = html;
        // Trigger MathJax to re-render the injected math formulas
        if (window.MathJax) {
            window.MathJax.typesetPromise([content]);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TransformerDemo('transformer_demo');
});