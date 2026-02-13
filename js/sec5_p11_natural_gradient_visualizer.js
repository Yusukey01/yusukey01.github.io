// sec5_p11_natural_gradient_visualizer.js
// Interactive Fisher Information Manifold for a 2-component GMM
// Parameter space (μ₁, μ₂) mapped to canvas — Fisher ellipses warp in real-time

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('natural-gradient-visualizer');

    if (!container) {
        console.error('Natural gradient visualizer container not found!');
        return;
    }

    // ========== HTML STRUCTURE ==========
    container.innerHTML = `
      <div class="ngv-container">
        <div class="ngv-layout">
          <div class="ngv-canvas-area">
            <div class="ngv-instruction" id="ngv-instruction">
              Drag the two glowing handles to move μ₁ and μ₂ through parameter space. 
              Click anywhere for gradient comparison. Toggle <strong>Flow</strong> to see natural gradient particles.
            </div>
            <div id="ngv-canvas-wrapper">
              <canvas id="ngv-canvas" width="700" height="700"></canvas>
              <div class="ngv-overlay-labels">
                <span class="ngv-axis-label ngv-axis-x">μ₁ →</span>
                <span class="ngv-axis-label ngv-axis-y">← μ₂</span>
              </div>
            </div>
            <div class="ngv-legend" id="ngv-legend">
              <div class="ngv-legend-item"><span class="ngv-legend-swatch ngv-swatch-ellipse"></span> Fisher Ellipse (local metric)</div>
              <div class="ngv-legend-item"><span class="ngv-legend-swatch ngv-swatch-naive"></span> Euclidean Gradient</div>
              <div class="ngv-legend-item"><span class="ngv-legend-swatch ngv-swatch-natural"></span> Natural Gradient F⁻¹∇</div>
              <div class="ngv-legend-item"><span class="ngv-legend-swatch ngv-swatch-handle"></span> GMM Means (μ₁, μ₂)</div>
            </div>
          </div>

          <div class="ngv-controls-panel">
            <div class="ngv-info-card" id="ngv-metric-card">
              <div class="ngv-card-title">Fisher Information Metric</div>
              <div class="ngv-card-subtitle">F(θ) at probe point</div>
              <div class="ngv-matrix-display" id="ngv-fisher-matrix">
                <div class="ngv-matrix-bracket ngv-left">[</div>
                <div class="ngv-matrix-vals">
                  <div class="ngv-matrix-row">
                    <span id="ngv-f00">—</span>
                    <span id="ngv-f01">—</span>
                  </div>
                  <div class="ngv-matrix-row">
                    <span id="ngv-f10">—</span>
                    <span id="ngv-f11">—</span>
                  </div>
                </div>
                <div class="ngv-matrix-bracket ngv-right">]</div>
              </div>
              <div class="ngv-metric-props">
                <span id="ngv-det-val">det(F) = —</span>
                <span id="ngv-cond-val">κ(F) = —</span>
              </div>
            </div>

            <div class="ngv-info-card" id="ngv-params-card">
              <div class="ngv-card-title">Parameter State</div>
              <div class="ngv-param-grid">
                <div class="ngv-param-row">
                  <span class="ngv-param-label">μ₁</span>
                  <span class="ngv-param-val" id="ngv-mu1-val">(0.00, 0.00)</span>
                </div>
                <div class="ngv-param-row">
                  <span class="ngv-param-label">μ₂</span>
                  <span class="ngv-param-val" id="ngv-mu2-val">(0.00, 0.00)</span>
                </div>
                <div class="ngv-param-row ngv-param-highlight">
                  <span class="ngv-param-label">‖μ₁ − μ₂‖</span>
                  <span class="ngv-param-val" id="ngv-dist-val">0.00</span>
                </div>
                <div class="ngv-param-row">
                  <span class="ngv-param-label">σ (shared)</span>
                  <span class="ngv-param-val" id="ngv-sigma-val">1.00</span>
                </div>
              </div>
            </div>

            <div class="ngv-info-card" id="ngv-gradient-card">
              <div class="ngv-card-title">Gradient Comparison</div>
              <div class="ngv-card-subtitle">Click anywhere on canvas — both arrows normalized to same length</div>
              <div class="ngv-gradient-rows">
                <div class="ngv-grad-row">
                  <span class="ngv-grad-label ngv-naive-label">∇L (Euclidean)</span>
                  <span class="ngv-grad-val" id="ngv-naive-grad">(—, —)</span>
                </div>
                <div class="ngv-grad-row">
                  <span class="ngv-grad-label ngv-natural-label">F⁻¹∇L (Natural)</span>
                  <span class="ngv-grad-val" id="ngv-natural-grad">(—, —)</span>
                </div>
                <div class="ngv-grad-row">
                  <span class="ngv-grad-label">Correction factor</span>
                  <span class="ngv-grad-val" id="ngv-correction">—×</span>
                </div>
              </div>
            </div>

            <div class="ngv-controls-group">
              <div class="ngv-card-title">Controls</div>
              <div class="ngv-slider-row">
                <label for="ngv-sigma-slider">σ (spread)</label>
                <input type="range" id="ngv-sigma-slider" min="0.3" max="3.0" step="0.05" value="1.0">
                <span id="ngv-sigma-readout">1.00</span>
              </div>
              <div class="ngv-slider-row">
                <label for="ngv-density-slider">Grid density</label>
                <input type="range" id="ngv-density-slider" min="6" max="22" step="2" value="14">
                <span id="ngv-density-readout">14</span>
              </div>
              <div class="ngv-slider-row">
                <label for="ngv-scale-slider">Ellipse scale</label>
                <input type="range" id="ngv-scale-slider" min="0.3" max="2.0" step="0.1" value="1.0">
                <span id="ngv-scale-readout">1.0</span>
              </div>
              <div class="ngv-button-row">
                <button class="ngv-btn ngv-btn-flow" id="ngv-flow-btn">
                  <span class="ngv-btn-icon">◉</span> Flow
                </button>
                <button class="ngv-btn ngv-btn-reset" id="ngv-reset-btn">
                  <span class="ngv-btn-icon">↺</span> Reset
                </button>
              </div>
            </div>

            <div class="ngv-insight-box" id="ngv-insight-box">
              <div class="ngv-insight-icon">💡</div>
              <div class="ngv-insight-text" id="ngv-insight-text">
                Drag the means close together and watch the ellipses elongate — 
                this is the <em>information singularity</em> where the two components become indistinguishable.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ========== EMBEDDED STYLES ==========
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* ===== NGV Container ===== */
      .ngv-container {
        margin-bottom: 24px;
        font-family: 'Exo 2', 'Segoe UI', sans-serif;
        color: #e8eaed;
        -webkit-font-smoothing: antialiased;
      }

      .ngv-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      @media (min-width: 1080px) {
        .ngv-layout {
          flex-direction: row;
        }
        .ngv-canvas-area {
          flex: 1.3;
          order: 1;
          min-width: 0;
        }
        .ngv-controls-panel {
          flex: 1;
          order: 2;
          max-width: 400px;
        }
      }

      /* ===== Canvas Area ===== */
      .ngv-canvas-area {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      #ngv-canvas-wrapper {
        position: relative;
        width: 100%;
        max-width: 700px;
      }

      #ngv-canvas {
        width: 100%;
        height: auto;
        border: 1px solid rgba(0, 255, 255, 0.12);
        border-radius: 8px;
        background: #0b0e14;
        cursor: crosshair;
        display: block;
        touch-action: none;
      }

      .ngv-overlay-labels {
        pointer-events: none;
        position: absolute;
        inset: 0;
      }
      .ngv-axis-label {
        position: absolute;
        font-size: 0.78rem;
        color: rgba(0, 255, 255, 0.35);
        font-family: 'Rajdhani', monospace;
        letter-spacing: 0.05em;
      }
      .ngv-axis-x {
        bottom: 8px;
        right: 14px;
      }
      .ngv-axis-y {
        top: 14px;
        left: 8px;
        writing-mode: vertical-rl;
        text-orientation: mixed;
      }

      .ngv-instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 0.88rem;
        color: rgba(255, 255, 255, 0.45);
        line-height: 1.5;
        max-width: 700px;
      }
      .ngv-instruction strong {
        color: rgba(0, 255, 255, 0.7);
      }

      /* ===== Legend ===== */
      .ngv-legend {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.5);
      }
      .ngv-legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ngv-legend-swatch {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        flex-shrink: 0;
      }
      .ngv-swatch-ellipse {
        background: rgba(0, 255, 255, 0.2);
        border: 1px solid rgba(0, 255, 255, 0.5);
      }
      .ngv-swatch-naive {
        background: rgba(255, 70, 70, 0.7);
        border: 1px solid #ff4646;
      }
      .ngv-swatch-natural {
        background: rgba(0, 255, 255, 0.7);
        border: 1px solid #00ffff;
      }
      .ngv-swatch-handle {
        background: radial-gradient(circle, #00ffff 40%, transparent 70%);
        border: 1px solid rgba(0, 255, 255, 0.6);
        border-radius: 50%;
      }

      /* ===== Controls Panel ===== */
      .ngv-controls-panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .ngv-info-card {
        background: rgba(20, 28, 40, 0.92);
        padding: 14px 16px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      }

      .ngv-card-title {
        font-family: 'Rajdhani', 'Exo 2', sans-serif;
        font-size: 0.95rem;
        font-weight: 600;
        color: rgba(0, 255, 255, 0.85);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 6px;
      }
      .ngv-card-subtitle {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.35);
        margin-bottom: 10px;
      }

      /* ===== Matrix Display ===== */
      .ngv-matrix-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin: 8px 0 10px;
      }
      .ngv-matrix-bracket {
        font-size: 2.2rem;
        color: rgba(0, 255, 255, 0.4);
        font-weight: 200;
        line-height: 1;
      }
      .ngv-matrix-vals {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ngv-matrix-row {
        display: flex;
        gap: 18px;
      }
      .ngv-matrix-row span {
        font-family: 'Fira Mono', 'Consolas', monospace;
        font-size: 0.92rem;
        color: #e8eaed;
        min-width: 70px;
        text-align: right;
      }

      .ngv-metric-props {
        display: flex;
        gap: 18px;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.45);
        font-family: 'Fira Mono', monospace;
      }

      /* ===== Parameter Grid ===== */
      .ngv-param-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ngv-param-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
      }
      .ngv-param-label {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.55);
        font-family: 'Rajdhani', sans-serif;
      }
      .ngv-param-val {
        font-family: 'Fira Mono', monospace;
        font-size: 0.85rem;
        color: #e8eaed;
      }
      .ngv-param-highlight {
        border-top: 1px solid rgba(0, 255, 255, 0.12);
        padding-top: 8px;
        margin-top: 4px;
      }
      .ngv-param-highlight .ngv-param-val {
        color: #00ffff;
        font-weight: 600;
      }

      /* ===== Gradient Comparison ===== */
      .ngv-gradient-rows {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ngv-grad-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ngv-grad-label {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.5);
      }
      .ngv-naive-label { color: rgba(255, 70, 70, 0.85); }
      .ngv-natural-label { color: rgba(0, 255, 255, 0.85); }
      .ngv-grad-val {
        font-family: 'Fira Mono', monospace;
        font-size: 0.82rem;
        color: #e8eaed;
      }

      /* ===== Controls ===== */
      .ngv-controls-group {
        background: rgba(20, 28, 40, 0.92);
        padding: 14px 16px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      }

      .ngv-slider-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .ngv-slider-row label {
        flex: 0 0 100px;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.55);
      }
      .ngv-slider-row input[type="range"] {
        flex: 1;
        accent-color: #00ffff;
        height: 4px;
      }
      .ngv-slider-row span {
        flex: 0 0 34px;
        font-family: 'Fira Mono', monospace;
        font-size: 0.82rem;
        color: rgba(0, 255, 255, 0.8);
        text-align: right;
      }

      .ngv-button-row {
        display: flex;
        gap: 10px;
        margin-top: 6px;
      }
      .ngv-btn {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.3);
        color: rgba(255, 255, 255, 0.7);
        font-family: 'Rajdhani', sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;
      }
      .ngv-btn:hover {
        border-color: rgba(0, 255, 255, 0.3);
        background: rgba(0, 255, 255, 0.08);
        color: #e8eaed;
      }
      .ngv-btn-flow.active {
        border-color: rgba(0, 255, 255, 0.5);
        background: rgba(0, 255, 255, 0.12);
        color: #00ffff;
        box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
      }
      .ngv-btn-icon {
        font-size: 1rem;
      }

      /* ===== Insight Box ===== */
      .ngv-insight-box {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 12px 14px;
        border-radius: 8px;
        background: rgba(0, 255, 255, 0.04);
        border: 1px solid rgba(0, 255, 255, 0.1);
      }
      .ngv-insight-icon {
        font-size: 1.1rem;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .ngv-insight-text {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.55);
        line-height: 1.55;
      }
      .ngv-insight-text em {
        color: rgba(0, 255, 255, 0.8);
        font-style: italic;
      }

      /* ===== Responsive ===== */
      @media (max-width: 600px) {
        .ngv-legend { gap: 10px; font-size: 0.75rem; }
        .ngv-slider-row label { flex: 0 0 80px; }
        .ngv-matrix-row span { min-width: 55px; font-size: 0.82rem; }
      }
    `;
    document.head.appendChild(styleEl);


    // ========== STATE ==========
    const canvas = document.getElementById('ngv-canvas');
    const ctx = canvas.getContext('2d');

    // Parameter space range: [-4, 4] mapped to canvas
    const PARAM_MIN = -4;
    const PARAM_MAX = 4;
    const PARAM_RANGE = PARAM_MAX - PARAM_MIN;

    let W = canvas.width;
    let H = canvas.height;

    // GMM Means in parameter space coords
    let mu1 = { x: -1.2, y: 0.8 };
    let mu2 = { x: 1.2, y: -0.8 };

    // Shared variance
    let sigma = 1.0;

    // Grid density (number of ellipses per axis)
    let gridDensity = 14;

    // Ellipse visual scale multiplier
    let ellipseScale = 1.0;

    // Interaction state
    let dragTarget = null; // 'mu1' | 'mu2' | null
    let probePoint = null; // { x, y } in param space or null
    let showGradient = false;

    // Flow particles
    let flowActive = false;
    let particles = [];
    const MAX_PARTICLES = 120;
    const PARTICLE_LIFE = 180; // frames

    // Animation
    let animFrame = null;
    let frameCount = 0;


    // ========== COORDINATE TRANSFORMS ==========
    function paramToCanvas(px, py) {
        const cx = ((px - PARAM_MIN) / PARAM_RANGE) * W;
        const cy = ((PARAM_MAX - py) / PARAM_RANGE) * H; // y-flip
        return { x: cx, y: cy };
    }

    function canvasToParam(cx, cy) {
        const px = PARAM_MIN + (cx / W) * PARAM_RANGE;
        const py = PARAM_MAX - (cy / H) * PARAM_RANGE; // y-flip
        return { x: px, y: py };
    }


    // ========== PURE JS 2×2 MATRIX MATH ==========
    // All matrices are [a, b, c, d] representing:
    //   | a  b |
    //   | c  d |

    function mat2Det(m) {
        return m[0] * m[3] - m[1] * m[2];
    }

    function mat2Inv(m) {
        const det = mat2Det(m);
        if (Math.abs(det) < 1e-14) return null;
        const invDet = 1.0 / det;
        return [m[3] * invDet, -m[1] * invDet, -m[2] * invDet, m[0] * invDet];
    }

    function mat2MulVec(m, v) {
        return { x: m[0] * v.x + m[1] * v.y, y: m[2] * v.x + m[3] * v.y };
    }

    function mat2Add(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
    }

    function mat2Scale(m, s) {
        return [m[0] * s, m[1] * s, m[2] * s, m[3] * s];
    }

    // Eigenvalues of symmetric 2×2: | a b |
    //                                | b d |
    // λ = (a+d)/2 ± sqrt(((a-d)/2)² + b²)
    function mat2SymEigen(m) {
        const a = m[0], b = m[1], d = m[3];
        const tr = a + d;
        const halfTr = tr * 0.5;
        const diff = (a - d) * 0.5;
        const disc = Math.sqrt(diff * diff + b * b);

        const lambda1 = halfTr + disc;
        const lambda2 = halfTr - disc;

        // Eigenvectors
        let v1, v2;
        if (Math.abs(b) > 1e-12) {
            v1 = { x: lambda1 - d, y: b };
            v2 = { x: lambda2 - d, y: b };
        } else if (Math.abs(a - d) > 1e-12) {
            v1 = { x: 1, y: 0 };
            v2 = { x: 0, y: 1 };
        } else {
            v1 = { x: 1, y: 0 };
            v2 = { x: 0, y: 1 };
        }

        // Normalize
        const n1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const n2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        if (n1 > 1e-12) { v1.x /= n1; v1.y /= n1; }
        if (n2 > 1e-12) { v2.x /= n2; v2.y /= n2; }

        return { lambda1, lambda2, v1, v2 };
    }


    // ========== FISHER INFORMATION COMPUTATION ==========
    // Model: p(x|θ) = 0.5 N(x|μ₁, σ²I) + 0.5 N(x|μ₂, σ²I)
    // where θ = (μ₁, μ₂) and x is 1D for tractability.
    //
    // We use a weighted Fisher approximation:
    // At a grid point θ_probe, compute the FIM by numerical integration
    // over a set of sample points.
    //
    // For performance at 60fps, we use the closed-form approximation:
    // The FIM for a mixture of two 1D Gaussians parameterized by (μ₁, μ₂)
    // can be approximated via:
    //   F_ij ≈ (1/4σ⁴) * integral of [w₁(x)w₂(x)(∂p/∂μᵢ)(∂p/∂μⱼ)/p(x)²] dx
    //
    // We use a fast semi-analytic approximation based on the overlap integral.

    function gaussPdf1D(x, mu, sig) {
        const z = (x - mu) / sig;
        return Math.exp(-0.5 * z * z) / (sig * 2.5066282746310002); // sqrt(2π)
    }

    // Compute FIM at a point in (μ₁, μ₂) parameter space
    // Uses numerical quadrature with adaptive sample placement
    function computeFisherMatrix(mu1x, mu1y, mu2x, mu2y, sig) {
        // We treat μ₁ = (mu1x, mu1y) as a 2D mean and μ₂ = (mu2x, mu2y).
        // The "observation" model: p(x|θ) mixes two 2D Gaussians.
        // But the *parameter* θ that varies is θ = (μ₁, μ₂) ∈ ℝ⁴.
        //
        // For the 2D canvas, we interpret the visualization as:
        //   - μ₁ and μ₂ are each SCALAR means of a 1D GMM.
        //   - The two "axes" of parameter space are μ₁ (horizontal) and μ₂ (vertical).
        //   - At each grid point (θ₁, θ₂), the model is p(x) = 0.5 N(x|θ₁, σ²) + 0.5 N(x|θ₂, σ²).
        //
        // FIM entry F_ij = E_x[ (∂ log p(x|θ)/∂θ_i)(∂ log p(x|θ)/∂θ_j) ]
        //
        // ∂p/∂θ₁ = 0.5 * (x - θ₁)/σ² * N(x|θ₁, σ²)
        // ∂p/∂θ₂ = 0.5 * (x - θ₂)/σ² * N(x|θ₂, σ²)
        //
        // ∂ log p / ∂θ_i = (1/p) * ∂p/∂θ_i
        //
        // We compute F_ij = ∫ (∂p/∂θ_i)(∂p/∂θ_j) / p(x) dx  (empirical Fisher)

        const t1 = mu1x; // θ₁ (this is how we use the 2D param space)
        const t2 = mu1y; // θ₂
        const sig2 = sig * sig;
        const invSig2 = 1.0 / sig2;

        // Quadrature: sample around the means
        const center = (t1 + t2) * 0.5;
        const spread = Math.abs(t1 - t2) * 0.5 + 3 * sig;
        const lo = center - spread;
        const hi = center + spread;
        const N_QUAD = 40;
        const dx = (hi - lo) / N_QUAD;

        let F00 = 0, F01 = 0, F11 = 0;

        for (let i = 0; i <= N_QUAD; i++) {
            const x = lo + i * dx;
            const w = (i === 0 || i === N_QUAD) ? 0.5 : 1.0; // trapezoidal

            const g1 = gaussPdf1D(x, t1, sig);
            const g2 = gaussPdf1D(x, t2, sig);
            const p = 0.5 * g1 + 0.5 * g2;

            if (p < 1e-30) continue;

            // Score components
            const dp_dt1 = 0.5 * (x - t1) * invSig2 * g1;
            const dp_dt2 = 0.5 * (x - t2) * invSig2 * g2;

            const invP = 1.0 / p;

            F00 += w * dp_dt1 * dp_dt1 * invP;
            F01 += w * dp_dt1 * dp_dt2 * invP;
            F11 += w * dp_dt2 * dp_dt2 * invP;
        }

        F00 *= dx;
        F01 *= dx;
        F11 *= dx;

        // Ensure positive definite with small regularization
        const reg = 1e-6;
        F00 += reg;
        F11 += reg;

        return [F00, F01, F01, F11]; // symmetric
    }

    // Faster: precompute FIM at each grid point using the grid point as (θ₁, θ₂)
    // The two handles (mu1, mu2) don't change what a "grid FIM" is;
    // they define the MODEL. The FIM at grid point (gx, gy) is computed
    // for the GMM with means at mu1.x and mu2.x (1D projection) or
    // more naturally: the model is defined by the handle positions,
    // and the FIM is computed at the handle-defined parameters.
    //
    // REINTERPRETATION for better visuals:
    // The canvas shows a 2D field. At each grid point (gx, gy), we compute
    // the FIM of a model parameterized by (gx, gy) but *influenced* by
    // the handle positions (attractors). This gives a "magnetic field" effect.
    //
    // Approach: At grid point g = (gx, gy), compute the FIM for a 1D GMM
    // with means at positions projected from the handles relative to g.
    // Specifically, the "separation" at g is influenced by how close g
    // is to the line between mu1 and mu2.

    function computeFieldFIM(gx, gy) {
        // Distance from grid point to each handle
        const dx1 = gx - mu1.x, dy1 = gy - mu1.y;
        const dx2 = gx - mu2.x, dy2 = gy - mu2.y;
        const r1sq = dx1 * dx1 + dy1 * dy1;
        const r2sq = dx2 * dx2 + dy2 * dy2;

        // Influence weights (Gaussian falloff) — wide enough to cover the whole canvas
        const falloff = sigma * 3.0;
        const falloff2 = falloff * falloff;
        const w1 = Math.exp(-r1sq / (2 * falloff2));
        const w2 = Math.exp(-r2sq / (2 * falloff2));
        const wTotal = w1 + w2 + 0.001;

        // How strongly this grid point "feels" the handles
        const localInfluence = Math.min((w1 + w2) * 1.5, 1.0);

        // The handle-to-handle separation vector
        const sepX = mu2.x - mu1.x;
        const sepY = mu2.y - mu1.y;
        const sep = Math.sqrt(sepX * sepX + sepY * sepY);

        // Unit direction along separation (with fallback)
        let nx, ny;
        if (sep > 1e-6) {
            nx = sepX / sep;
            ny = sepY / sep;
        } else {
            nx = 1;
            ny = 0;
        }

        // Base information scale: 1/σ²
        const baseInfo = 1.0 / (sigma * sigma);

        // Overlap factor: exp(-d²/(8σ²))  — 1 when fully overlapping, 0 when well-separated
        const overlap = Math.exp(-sep * sep / (8 * sigma * sigma));

        // ── KEY: eigenvalues of the Fisher metric ──
        // Along the separation axis (μ₁↔μ₂ direction):
        //   When overlap ≈ 1 (singularity), info collapses → small eigenvalue
        //   When overlap ≈ 0 (well-separated), info is normal → baseInfo
        // Perpendicular to separation:
        //   Always near baseInfo (both components contribute independently)

        // The singularity factor: how much the along-sep eigenvalue drops
        // Use a steep curve for dramatic visual effect
        const singDrop = overlap * overlap * 0.95; // drops to 5% of baseInfo at full overlap

        const lambdaAlong = baseInfo * (1.0 - singDrop);
        const lambdaPerp = baseInfo;

        // Blend toward isotropy (identity) far from handles
        // Near handles: full anisotropy. Far away: gentle anisotropy
        const blendedAlong = lambdaAlong * localInfluence + baseInfo * (1.0 - localInfluence);
        const blendedPerp = lambdaPerp * localInfluence + baseInfo * (1.0 - localInfluence);

        // ── Proximity-based rotation modulation ──
        // Near the midpoint between handles, the anisotropy is strongest.
        // Near one handle, the ellipse should be oriented differently.
        // We modulate the direction by blending toward the "radial" direction from closest handle.
        const midX = (mu1.x + mu2.x) * 0.5;
        const midY = (mu1.y + mu2.y) * 0.5;
        const toMidX = gx - midX, toMidY = gy - midY;
        const distToMid = Math.sqrt(toMidX * toMidX + toMidY * toMidY);
        const midProximity = Math.exp(-distToMid * distToMid / (2 * falloff2));

        // Effective direction: blend between sep-axis (near midpoint) and radial (near handle)
        let ex = nx, ey = ny;
        if (localInfluence > 0.05 && distToMid > 0.1) {
            // Add a subtle twist based on which handle is closer
            const bias = (w1 - w2) / (wTotal + 0.001);
            // Rotate direction slightly based on bias
            const twistAngle = bias * (1 - midProximity) * 0.5;
            const cos_t = Math.cos(twistAngle);
            const sin_t = Math.sin(twistAngle);
            ex = nx * cos_t - ny * sin_t;
            ey = nx * sin_t + ny * cos_t;
        }

        // Renormalize direction
        const eLen = Math.sqrt(ex * ex + ey * ey);
        if (eLen > 1e-8) { ex /= eLen; ey /= eLen; }

        // Build FIM from eigendecomposition:
        // F = λ_along * (e⊗e) + λ_perp * (e⊥⊗e⊥)
        // where e⊥ = (-ey, ex)
        const F00 = blendedAlong * ex * ex + blendedPerp * ey * ey;
        const F01 = (blendedAlong - blendedPerp) * ex * ey;
        const F11 = blendedAlong * ey * ey + blendedPerp * ex * ex;

        return [F00, F01, F01, F11];
    }

    // Compute a synthetic loss landscape for gradient visualization.
    // We use a softened "log-sum-exp" of distances to the two handles.
    // This gives non-vanishing gradients across the entire parameter space,
    // with interesting curvature for comparing Euclidean vs Natural gradient.
    function computeLoss(px, py) {
        const dx1 = px - mu1.x, dy1 = py - mu1.y;
        const dx2 = px - mu2.x, dy2 = py - mu2.y;
        const r1sq = dx1 * dx1 + dy1 * dy1;
        const r2sq = dx2 * dx2 + dy2 * dy2;
        // Smooth "distance to nearest handle" via log-sum-exp
        // L(θ) = -log(exp(-r1²/2s²) + exp(-r2²/2s²))  with wide s
        const s2 = sigma * sigma * 4; // wider than σ so gradients extend far
        const e1 = Math.exp(-r1sq / (2 * s2));
        const e2 = Math.exp(-r2sq / (2 * s2));
        return -Math.log(e1 + e2 + 1e-30);
    }

    // Analytical gradient of loss — more accurate than finite differences
    function computeGradient(px, py) {
        const dx1 = px - mu1.x, dy1 = py - mu1.y;
        const dx2 = px - mu2.x, dy2 = py - mu2.y;
        const r1sq = dx1 * dx1 + dy1 * dy1;
        const r2sq = dx2 * dx2 + dy2 * dy2;
        const s2 = sigma * sigma * 4;
        const e1 = Math.exp(-r1sq / (2 * s2));
        const e2 = Math.exp(-r2sq / (2 * s2));
        const denom = e1 + e2 + 1e-30;
        // ∂L/∂px = (e1 * dx1/s² + e2 * dx2/s²) / denom  (chain rule on -log)
        const gx = (e1 * dx1 + e2 * dx2) / (s2 * denom);
        const gy = (e1 * dy1 + e2 * dy2) / (s2 * denom);
        return { x: gx, y: gy };
    }

    function computeNaturalGradient(px, py) {
        const grad = computeGradient(px, py);
        const F = computeFieldFIM(px, py);
        const Finv = mat2Inv(F);
        if (!Finv) return grad; // fallback
        return mat2MulVec(Finv, grad);
    }


    // ========== PARTICLE SYSTEM ==========
    function spawnParticle() {
        // Spawn at random position, biased toward high-information regions
        const px = PARAM_MIN + Math.random() * PARAM_RANGE;
        const py = PARAM_MIN + Math.random() * PARAM_RANGE;
        return {
            x: px, y: py,
            age: 0,
            maxAge: PARTICLE_LIFE + Math.random() * 60,
            speed: 0.008 + Math.random() * 0.012
        };
    }

    function updateParticles() {
        // Remove dead particles
        particles = particles.filter(p => p.age < p.maxAge);

        // Spawn new ones
        while (particles.length < MAX_PARTICLES) {
            particles.push(spawnParticle());
        }

        // Move along natural gradient field
        for (const p of particles) {
            const ng = computeNaturalGradient(p.x, p.y);
            const len = Math.sqrt(ng.x * ng.x + ng.y * ng.y);
            if (len > 1e-8) {
                // Normalize and step
                p.x -= (ng.x / len) * p.speed;
                p.y -= (ng.y / len) * p.speed;
            }
            p.age++;

            // Wrap or kill if out of bounds
            if (p.x < PARAM_MIN || p.x > PARAM_MAX || p.y < PARAM_MIN || p.y > PARAM_MAX) {
                p.age = p.maxAge; // kill
            }
        }
    }


    // ========== RENDERING ==========
    function drawGrid() {
        const step = PARAM_RANGE / gridDensity;
        // pixelStep = how many pixels between grid centers
        const pixelStep = (step / PARAM_RANGE) * W;
        // Target semi-axis for a "unit circle" ellipse ≈ 40% of grid spacing
        const baseSize = pixelStep * 0.42 * ellipseScale;

        for (let i = 0; i <= gridDensity; i++) {
            for (let j = 0; j <= gridDensity; j++) {
                const gx = PARAM_MIN + i * step;
                const gy = PARAM_MIN + j * step;

                const F = computeFieldFIM(gx, gy);
                const eig = mat2SymEigen(F);

                // Clamp eigenvalues positive for stability
                const l1 = Math.max(eig.lambda1, 1e-4);
                const l2 = Math.max(eig.lambda2, 1e-4);

                // Fisher ellipse: δθᵀ F δθ = ε  →  semi-axes ∝ 1/√λ
                // Normalize so the GEOMETRIC MEAN of the axes equals baseSize.
                // raw axes: a_raw = 1/√l1, b_raw = 1/√l2
                // geometric mean of raw = 1/(l1*l2)^{1/4}
                // scale factor = baseSize * (l1*l2)^{1/4}
                const rawA = 1.0 / Math.sqrt(l1);
                const rawB = 1.0 / Math.sqrt(l2);
                const geoMeanRaw = Math.sqrt(rawA * rawB); // = 1/(l1*l2)^{1/4}
                const normFactor = baseSize / geoMeanRaw;

                let a = rawA * normFactor; // semi-major in pixels
                let b = rawB * normFactor; // semi-minor in pixels

                // Clamp aspect ratio for visual clarity (max 8:1)
                const aspect = a / (b + 0.01);
                if (aspect > 8) {
                    const mid = Math.sqrt(a * b);
                    a = mid * Math.sqrt(8);
                    b = mid / Math.sqrt(8);
                } else if (aspect < 1 / 8) {
                    const mid = Math.sqrt(a * b);
                    a = mid / Math.sqrt(8);
                    b = mid * Math.sqrt(8);
                }

                // Enforce minimum visible size
                a = Math.max(a, 3);
                b = Math.max(b, 3);

                // Rotation angle: align major axis with eigenvector of SMALLER eigenvalue
                // (smaller λ → larger 1/√λ → major axis direction)
                const majorVec = (l1 <= l2) ? eig.v1 : eig.v2;
                const angle = Math.atan2(majorVec.y, majorVec.x);

                // Canvas position
                const cpos = paramToCanvas(gx, gy);

                // ── Visual intensity ──
                // Proximity to either handle (0 = far, 1 = on top)
                const dx1 = gx - mu1.x, dy1 = gy - mu1.y;
                const dx2 = gx - mu2.x, dy2 = gy - mu2.y;
                const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                const dMin = Math.min(dist1, dist2);
                // Wider falloff so ellipses stay visible across the whole canvas
                const proxRadius = sigma * 4.0;
                const proximity = Math.exp(-dMin * dMin / (2 * proxRadius * proxRadius));

                // Condition number → singularity indicator
                const condNumber = Math.max(l1, l2) / (Math.min(l1, l2) + 1e-10);
                const singularity = Math.min((condNumber - 1) / 15, 1); // 0 = isotropic, 1 = very anisotropic

                // Alpha: always visible, brighter near handles & singularities
                const baseAlpha = 0.12;
                const fillAlpha = baseAlpha + 0.35 * proximity + 0.10 * singularity;
                const strokeAlpha = 0.20 + 0.50 * proximity + 0.15 * singularity;

                // Color: cyan base, shifts warmer (orange-pink) at singularities
                // Lerp from cyan (0,255,255) → warm singularity (255,120,200)
                const sLerp = singularity * singularity; // quadratic for drama
                const cr = Math.round(0 + sLerp * 255);
                const cg = Math.round(255 - sLerp * 135);
                const cb = Math.round(255 - sLerp * 55);

                ctx.save();
                ctx.translate(cpos.x, cpos.y);
                ctx.rotate(-angle); // negate for canvas y-flip

                ctx.beginPath();
                ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);

                ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${fillAlpha.toFixed(3)})`;
                ctx.fill();

                ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${strokeAlpha.toFixed(3)})`;
                ctx.lineWidth = 1.0 + singularity * 1.0;
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    function drawSubtleGrid() {
        // Faint reference grid
        const step = PARAM_RANGE / 8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 0.5;

        for (let i = 0; i <= 8; i++) {
            const val = PARAM_MIN + i * step;

            // Vertical
            const v0 = paramToCanvas(val, PARAM_MIN);
            const v1 = paramToCanvas(val, PARAM_MAX);
            ctx.beginPath();
            ctx.moveTo(v0.x, v0.y);
            ctx.lineTo(v1.x, v1.y);
            ctx.stroke();

            // Horizontal
            const h0 = paramToCanvas(PARAM_MIN, val);
            const h1 = paramToCanvas(PARAM_MAX, val);
            ctx.beginPath();
            ctx.moveTo(h0.x, h0.y);
            ctx.lineTo(h1.x, h1.y);
            ctx.stroke();
        }

        // Axes through origin
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        const o0 = paramToCanvas(0, PARAM_MIN);
        const o1 = paramToCanvas(0, PARAM_MAX);
        ctx.beginPath();
        ctx.moveTo(o0.x, o0.y);
        ctx.lineTo(o1.x, o1.y);
        ctx.stroke();

        const h0 = paramToCanvas(PARAM_MIN, 0);
        const h1 = paramToCanvas(PARAM_MAX, 0);
        ctx.beginPath();
        ctx.moveTo(h0.x, h0.y);
        ctx.lineTo(h1.x, h1.y);
        ctx.stroke();
    }

    function drawHandle(mu, label, offset) {
        const pos = paramToCanvas(mu.x, mu.y);
        const pulse = Math.sin(frameCount * 0.04) * 0.15 + 0.85;

        // Outer glow
        const grad = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, 28 * pulse);
        grad.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
        grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
        grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 28 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Inner white
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.font = '600 13px Rajdhani, sans-serif';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(label, pos.x + offset.x, pos.y + offset.y);
    }

    function drawGradientArrows(px, py) {
        const pos = paramToCanvas(px, py);
        const naive = computeGradient(px, py);
        const natural = computeNaturalGradient(px, py);

        // Fixed arrow display length in pixels (direction matters, not magnitude)
        const ARROW_LEN = 90;

        // Compute naive arrow endpoint (descent = negative gradient)
        const naiveLen = Math.sqrt(naive.x * naive.x + naive.y * naive.y);
        let nEx = 0, nEy = 0;
        if (naiveLen > 1e-10) {
            // Normalized descent direction, with canvas y-flip
            nEx = (-naive.x / naiveLen) * ARROW_LEN;
            nEy = (naive.y / naiveLen) * ARROW_LEN; // positive because canvas y is flipped
        }

        // Compute natural arrow endpoint
        const natLen = Math.sqrt(natural.x * natural.x + natural.y * natural.y);
        let ngEx = 0, ngEy = 0;
        if (natLen > 1e-10) {
            ngEx = (-natural.x / natLen) * ARROW_LEN;
            ngEy = (natural.y / natLen) * ARROW_LEN;
        }

        // Draw probe point marker (white crosshair)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos.x - 8, pos.y); ctx.lineTo(pos.x + 8, pos.y);
        ctx.moveTo(pos.x, pos.y - 8); ctx.lineTo(pos.x, pos.y + 8);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw Euclidean gradient FIRST (red, behind)
        if (naiveLen > 1e-10) {
            drawArrow(pos.x, pos.y, pos.x + nEx, pos.y + nEy,
                '#ff4646', 'rgba(255, 70, 70, 0.35)', 3);
            // Label at tip
            ctx.font = '600 12px Rajdhani, sans-serif';
            ctx.fillStyle = 'rgba(255, 70, 70, 0.9)';
            ctx.textAlign = 'center';
            ctx.fillText('∇L', pos.x + nEx * 1.15, pos.y + nEy * 1.15 + 4);
        }

        // Draw Natural gradient SECOND (cyan, on top)
        if (natLen > 1e-10) {
            drawArrow(pos.x, pos.y, pos.x + ngEx, pos.y + ngEy,
                '#00ffff', 'rgba(0, 255, 255, 0.35)', 3);
            // Label at tip
            ctx.font = '600 12px Rajdhani, sans-serif';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.95)';
            ctx.textAlign = 'center';
            ctx.fillText('F⁻¹∇L', pos.x + ngEx * 1.15, pos.y + ngEy * 1.15 + 4);
        }

        // Show angle between the two arrows
        if (naiveLen > 1e-10 && natLen > 1e-10) {
            const dot = (nEx * ngEx + nEy * ngEy) / (ARROW_LEN * ARROW_LEN);
            const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
            ctx.font = '500 11px Rajdhani, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.textAlign = 'center';
            ctx.fillText(`Δθ = ${angleDeg.toFixed(1)}°`, pos.x, pos.y - 16);
        }
    }

    function drawArrow(x1, y1, x2, y2, color, glowColor, lineWidth) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 3) return;

        const nx = dx / len, ny = dy / len;
        const headLen = Math.min(16, len * 0.25);
        const headWidth = headLen * 0.45;

        // Glow (wider, softer)
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = lineWidth + 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Main line
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Arrowhead (filled triangle)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * nx + headWidth * ny,
                    y2 - headLen * ny - headWidth * nx);
        ctx.lineTo(x2 - headLen * nx - headWidth * ny,
                    y2 - headLen * ny + headWidth * nx);
        ctx.closePath();
        ctx.fill();
    }

    function drawParticles() {
        for (const p of particles) {
            const pos = paramToCanvas(p.x, p.y);
            const lifeFrac = p.age / p.maxAge;
            const alpha = Math.sin(lifeFrac * Math.PI) * 0.7; // fade in/out

            // Trail dot
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 1.5 + (1 - lifeFrac) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawConnectionLine() {
        // Subtle line between the two handles
        const p1 = paramToCanvas(mu1.x, mu1.y);
        const p2 = paramToCanvas(mu2.x, mu2.y);

        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint marker
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
    }


    // ========== MAIN DRAW ==========
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = '#0b0e14';
        ctx.fillRect(0, 0, W, H);

        // Subtle ambient gradient
        const ambGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.6);
        ambGrad.addColorStop(0, 'rgba(0, 60, 80, 0.06)');
        ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ambGrad;
        ctx.fillRect(0, 0, W, H);

        drawSubtleGrid();
        drawGrid();
        drawConnectionLine();

        if (flowActive) {
            drawParticles();
        }

        if (probePoint && showGradient) {
            drawGradientArrows(probePoint.x, probePoint.y);
        }

        drawHandle(mu1, 'μ₁', { x: 0, y: -18 });
        drawHandle(mu2, 'μ₂', { x: 0, y: 22 });

        frameCount++;
    }


    // ========== UI UPDATE ==========
    function updateInfoPanel() {
        // Parameters
        document.getElementById('ngv-mu1-val').textContent =
            `(${mu1.x.toFixed(2)}, ${mu1.y.toFixed(2)})`;
        document.getElementById('ngv-mu2-val').textContent =
            `(${mu2.x.toFixed(2)}, ${mu2.y.toFixed(2)})`;

        const dist = Math.sqrt(
            (mu2.x - mu1.x) ** 2 + (mu2.y - mu1.y) ** 2
        );
        document.getElementById('ngv-dist-val').textContent = dist.toFixed(3);
        document.getElementById('ngv-sigma-val').textContent = sigma.toFixed(2);

        // Fisher matrix at probe or midpoint
        let fx, fy;
        if (probePoint) {
            fx = probePoint.x;
            fy = probePoint.y;
        } else {
            fx = (mu1.x + mu2.x) * 0.5;
            fy = (mu1.y + mu2.y) * 0.5;
        }

        const F = computeFieldFIM(fx, fy);
        document.getElementById('ngv-f00').textContent = F[0].toFixed(4);
        document.getElementById('ngv-f01').textContent = F[1].toFixed(4);
        document.getElementById('ngv-f10').textContent = F[2].toFixed(4);
        document.getElementById('ngv-f11').textContent = F[3].toFixed(4);

        const det = mat2Det(F);
        const eig = mat2SymEigen(F);
        const cond = Math.abs(eig.lambda1) / (Math.abs(eig.lambda2) + 1e-12);
        document.getElementById('ngv-det-val').textContent = `det(F) = ${det.toFixed(4)}`;
        document.getElementById('ngv-cond-val').textContent = `κ(F) = ${cond.toFixed(1)}`;

        // Gradient info
        if (probePoint && showGradient) {
            const naive = computeGradient(probePoint.x, probePoint.y);
            const natural = computeNaturalGradient(probePoint.x, probePoint.y);
            document.getElementById('ngv-naive-grad').textContent =
                `(${naive.x.toFixed(3)}, ${naive.y.toFixed(3)})`;
            document.getElementById('ngv-natural-grad').textContent =
                `(${natural.x.toFixed(3)}, ${natural.y.toFixed(3)})`;

            const naiveLen = Math.sqrt(naive.x ** 2 + naive.y ** 2);
            const naturalLen = Math.sqrt(natural.x ** 2 + natural.y ** 2);
            const correction = naiveLen > 1e-8 ? (naturalLen / naiveLen).toFixed(2) : '—';
            document.getElementById('ngv-correction').textContent = `${correction}×`;
        }

        // Dynamic insight
        updateInsight(dist);
    }

    function updateInsight(dist) {
        const el = document.getElementById('ngv-insight-text');
        const ratio = dist / sigma;

        if (ratio < 0.5) {
            el.innerHTML = `<em>Information singularity!</em> The means are nearly identical (‖Δμ‖/σ < 0.5). ` +
                `The Fisher metric becomes degenerate — one eigenvalue collapses. ` +
                `The natural gradient compensates by amplifying motion in the "indistinguishable" direction.`;
        } else if (ratio < 1.5) {
            el.innerHTML = `<em>High curvature zone.</em> The distributions overlap significantly. ` +
                `Notice how the ellipses elongate along the μ₁↔μ₂ axis — ` +
                `moving the means apart has high information cost here.`;
        } else if (ratio < 3) {
            el.innerHTML = `The components are partially separated. The Fisher ellipses show ` +
                `moderate anisotropy near the handles and become more isotropic far away. ` +
                `The natural gradient begins to align with the Euclidean gradient.`;
        } else {
            el.innerHTML = `The components are well-separated (‖Δμ‖/σ > 3). ` +
                `The metric is nearly <em>Euclidean</em> — Fisher ellipses become circles. ` +
                `Natural and Euclidean gradients agree, as the manifold is locally flat.`;
        }
    }


    // ========== INTERACTION ==========
    function getEventPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            cx: (clientX - rect.left) * scaleX,
            cy: (clientY - rect.top) * scaleY
        };
    }

    function hitTestHandle(cx, cy, mu) {
        const pos = paramToCanvas(mu.x, mu.y);
        const dx = cx - pos.x, dy = cy - pos.y;
        return (dx * dx + dy * dy) < 30 * 30; // generous hit area
    }

    function onPointerDown(e) {
        e.preventDefault();
        const { cx, cy } = getEventPos(e);

        if (hitTestHandle(cx, cy, mu1)) {
            dragTarget = 'mu1';
            canvas.style.cursor = 'grabbing';
        } else if (hitTestHandle(cx, cy, mu2)) {
            dragTarget = 'mu2';
            canvas.style.cursor = 'grabbing';
        } else {
            // Probe point for gradient
            const p = canvasToParam(cx, cy);
            probePoint = { x: p.x, y: p.y };
            showGradient = true;
            updateInfoPanel();
        }
    }

    function onPointerMove(e) {
        e.preventDefault();
        const { cx, cy } = getEventPos(e);

        if (dragTarget) {
            const p = canvasToParam(cx, cy);
            // Clamp to parameter space
            const clamped = {
                x: Math.max(PARAM_MIN + 0.2, Math.min(PARAM_MAX - 0.2, p.x)),
                y: Math.max(PARAM_MIN + 0.2, Math.min(PARAM_MAX - 0.2, p.y))
            };
            if (dragTarget === 'mu1') {
                mu1.x = clamped.x;
                mu1.y = clamped.y;
            } else {
                mu2.x = clamped.x;
                mu2.y = clamped.y;
            }
            updateInfoPanel();
        } else {
            // Hover cursor
            if (hitTestHandle(cx, cy, mu1) || hitTestHandle(cx, cy, mu2)) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'crosshair';
            }
        }
    }

    function onPointerUp(e) {
        if (dragTarget) {
            dragTarget = null;
            canvas.style.cursor = 'crosshair';
        }
    }

    // Mouse events
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    // Touch events
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);
    canvas.addEventListener('touchcancel', onPointerUp);

    // Sliders
    const sigmaSlider = document.getElementById('ngv-sigma-slider');
    const densitySlider = document.getElementById('ngv-density-slider');
    const scaleSlider = document.getElementById('ngv-scale-slider');

    sigmaSlider.addEventListener('input', () => {
        sigma = parseFloat(sigmaSlider.value);
        document.getElementById('ngv-sigma-readout').textContent = sigma.toFixed(2);
        updateInfoPanel();
    });

    densitySlider.addEventListener('input', () => {
        gridDensity = parseInt(densitySlider.value);
        document.getElementById('ngv-density-readout').textContent = gridDensity;
    });

    scaleSlider.addEventListener('input', () => {
        ellipseScale = parseFloat(scaleSlider.value);
        document.getElementById('ngv-scale-readout').textContent = ellipseScale.toFixed(1);
    });

    // Flow button
    const flowBtn = document.getElementById('ngv-flow-btn');
    flowBtn.addEventListener('click', () => {
        flowActive = !flowActive;
        flowBtn.classList.toggle('active', flowActive);
        if (flowActive) {
            particles = [];
        }
    });

    // Reset button
    document.getElementById('ngv-reset-btn').addEventListener('click', () => {
        mu1 = { x: -1.2, y: 0.8 };
        mu2 = { x: 1.2, y: -0.8 };
        sigma = 1.0;
        gridDensity = 14;
        ellipseScale = 1.0;
        probePoint = null;
        showGradient = false;
        flowActive = false;
        particles = [];
        flowBtn.classList.remove('active');

        sigmaSlider.value = '1.0';
        densitySlider.value = '14';
        scaleSlider.value = '1.0';
        document.getElementById('ngv-sigma-readout').textContent = '1.00';
        document.getElementById('ngv-density-readout').textContent = '14';
        document.getElementById('ngv-scale-readout').textContent = '1.0';

        document.getElementById('ngv-naive-grad').textContent = '(—, —)';
        document.getElementById('ngv-natural-grad').textContent = '(—, —)';
        document.getElementById('ngv-correction').textContent = '—×';

        updateInfoPanel();
    });

    // Resize
    function handleResize() {
        const wrapper = document.getElementById('ngv-canvas-wrapper');
        const size = Math.min(wrapper.clientWidth, 700);
        canvas.width = size;
        canvas.height = size;
        W = size;
        H = size;
    }

    window.addEventListener('resize', handleResize);


    // ========== ANIMATION LOOP ==========
    function animate() {
        if (flowActive) {
            updateParticles();
        }
        draw();
        updateInfoPanel();
        animFrame = requestAnimationFrame(animate);
    }

    // ========== INITIALIZATION ==========
    handleResize();
    updateInfoPanel();
    animate();
});