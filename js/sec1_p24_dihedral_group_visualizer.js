// dihedral_group_visualizer.js
// A vanilla JavaScript implementation of the Dihedral Group D₆ Visualizer
// Demonstrates discrete symmetry operations on a regular hexagon

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('dihedral-group-visualizer');
    
    if (!container) {
        console.error('Dihedral group visualizer container not found!');
        return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="dihedral-visualizer-container">
        <div class="dihedral-visualizer-layout">
          <div class="dihedral-canvas-container">
            <div class="instruction" id="dihedral-instruction">Click group elements to apply discrete symmetry transformations (instant snap)</div>
            <div id="dihedral-canvas-wrapper">
              <canvas id="dihedral-canvas" width="500" height="500"></canvas>
            </div>
            <div class="dihedral-legend" id="dihedral-legend">
              <div class="legend-item"><span class="legend-color rotation-color"></span> Rotations (r<sup>k</sup>)</div>
              <div class="legend-item"><span class="legend-color reflection-color"></span> Reflections (r<sup>k</sup>s)</div>
              <div class="legend-item"><span class="legend-color axis-color"></span> Reflection axes</div>
            </div>
          </div>
          
          <div class="dihedral-controls-panel">
            <div class="dihedral-state-display" id="state-display">
              <div class="state-title">Current State</div>
              <div class="state-content">
                <div class="state-row">
                  <span class="state-label">Element:</span>
                  <span id="current-element" class="state-value element-display">e</span>
                </div>
                <div class="state-row">
                  <span class="state-label">Type:</span>
                  <span id="element-type" class="state-value">Identity</span>
                </div>
                <div class="state-row">
                  <span class="state-label">Order:</span>
                  <span id="element-order" class="state-value">|e| = 1</span>
                </div>
                <div class="state-row">
                  <span class="state-label">Permutation:</span>
                  <span id="element-permutation" class="state-value permutation-display">(1)(2)(3)(4)(5)(6)</span>
                </div>
              </div>
            </div>
            
            <div class="dihedral-matrix-display" id="matrix-display">
              <div class="matrix-title">2×2 Matrix Representation</div>
              <div class="matrix-content" id="matrix-content">
                <div class="matrix-bracket left">[</div>
                <div class="matrix-values">
                  <div class="matrix-row">
                    <span id="m00">1.00</span>
                    <span id="m01">0.00</span>
                  </div>
                  <div class="matrix-row">
                    <span id="m10">0.00</span>
                    <span id="m11">1.00</span>
                  </div>
                </div>
                <div class="matrix-bracket right">]</div>
              </div>
              <div class="matrix-properties">
                <span id="det-value">det = 1</span>
                <span id="orthogonal-check">Orthogonal ✓</span>
              </div>
            </div>

            <div class="dihedral-elements-group">
              <div class="elements-section">
                <div class="section-header rotation-header">
                  <span class="section-icon">↻</span>
                  Rotations ⟨r⟩ (cyclic subgroup of order 6)
                </div>
                <div class="elements-grid" id="rotation-buttons">
                  <button class="element-btn rotation-btn active" data-element="e" title="Identity (0°)">
                    <span class="element-symbol">e</span>
                    <span class="element-angle">0°</span>
                  </button>
                  <button class="element-btn rotation-btn" data-element="r" title="Rotation by 60°">
                    <span class="element-symbol">r</span>
                    <span class="element-angle">60°</span>
                  </button>
                  <button class="element-btn rotation-btn" data-element="r2" title="Rotation by 120°">
                    <span class="element-symbol">r²</span>
                    <span class="element-angle">120°</span>
                  </button>
                  <button class="element-btn rotation-btn" data-element="r3" title="Rotation by 180°">
                    <span class="element-symbol">r³</span>
                    <span class="element-angle">180°</span>
                  </button>
                  <button class="element-btn rotation-btn" data-element="r4" title="Rotation by 240°">
                    <span class="element-symbol">r⁴</span>
                    <span class="element-angle">240°</span>
                  </button>
                  <button class="element-btn rotation-btn" data-element="r5" title="Rotation by 300°">
                    <span class="element-symbol">r⁵</span>
                    <span class="element-angle">300°</span>
                  </button>
                </div>
              </div>
              
              <div class="elements-section">
                <div class="section-header reflection-header">
                  <span class="section-icon">↔</span>
                  Reflections (coset ⟨r⟩s)
                </div>
                <div class="elements-grid" id="reflection-buttons">
                  <button class="element-btn reflection-btn" data-element="s" title="Reflection across axis at 0°">
                    <span class="element-symbol">s</span>
                    <span class="element-angle">axis 0°</span>
                  </button>
                  <button class="element-btn reflection-btn" data-element="rs" title="Reflection across axis at 30°">
                    <span class="element-symbol">rs</span>
                    <span class="element-angle">axis 30°</span>
                  </button>
                  <button class="element-btn reflection-btn" data-element="r2s" title="Reflection across axis at 60°">
                    <span class="element-symbol">r²s</span>
                    <span class="element-angle">axis 60°</span>
                  </button>
                  <button class="element-btn reflection-btn" data-element="r3s" title="Reflection across axis at 90°">
                    <span class="element-symbol">r³s</span>
                    <span class="element-angle">axis 90°</span>
                  </button>
                  <button class="element-btn reflection-btn" data-element="r4s" title="Reflection across axis at 120°">
                    <span class="element-symbol">r⁴s</span>
                    <span class="element-angle">axis 120°</span>
                  </button>
                  <button class="element-btn reflection-btn" data-element="r5s" title="Reflection across axis at 150°">
                    <span class="element-symbol">r⁵s</span>
                    <span class="element-angle">axis 150°</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="dihedral-composition-group">
              <div class="composition-title">Group Composition (g₂ ∘ g₁)</div>
              <div class="composition-description">Apply g₁ first, then g₂ (read right to left)</div>
              <div class="composition-controls">
                <select id="compose-g2" class="compose-select">
                  <option value="e">e</option>
                  <option value="r">r</option>
                  <option value="r2">r²</option>
                  <option value="r3">r³</option>
                  <option value="r4">r⁴</option>
                  <option value="r5">r⁵</option>
                  <option value="s">s</option>
                  <option value="rs">rs</option>
                  <option value="r2s">r²s</option>
                  <option value="r3s">r³s</option>
                  <option value="r4s">r⁴s</option>
                  <option value="r5s">r⁵s</option>
                </select>
                <span class="compose-operator">∘</span>
                <select id="compose-g1" class="compose-select">
                  <option value="e">e</option>
                  <option value="r">r</option>
                  <option value="r2">r²</option>
                  <option value="r3">r³</option>
                  <option value="r4">r⁴</option>
                  <option value="r5">r⁵</option>
                  <option value="s">s</option>
                  <option value="rs">rs</option>
                  <option value="r2s">r²s</option>
                  <option value="r3s">r³s</option>
                  <option value="r4s">r⁴s</option>
                  <option value="r5s">r⁵s</option>
                </select>
                <span class="compose-equals">=</span>
                <span id="compose-result" class="compose-result">e</span>
              </div>
              <button id="apply-composition" class="primary-btn">Apply Result</button>
              <div class="composition-note" id="composition-note"></div>
            </div>
            
            <div class="dihedral-info-group">
              <div class="info-title">D₆ Group Properties</div>
              <div class="info-content">
                <p><strong>Order:</strong> |D₆| = 12 (6 rotations + 6 reflections)</p>
                <p><strong>Generators:</strong> ⟨r, s⟩ where r⁶ = e, s² = e</p>
                <p><strong>Key relation:</strong> srs⁻¹ = r⁻¹ (conjugation inverts rotation)</p>
                <p><strong>Non-abelian:</strong> rs ≠ sr (try it with composition!)</p>
                <p><strong>Normal subgroup:</strong> ⟨r⟩ ◁ D₆</p>
              </div>
            </div>
            
            <button id="reset-btn" class="secondary-btn">Reset to Identity</button>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .dihedral-visualizer-container {
        margin-bottom: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e8eaed;
      }
      
      .dihedral-visualizer-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      @media (min-width: 992px) {
        .dihedral-visualizer-layout {
          flex-direction: row;
        }
        
        .dihedral-canvas-container {
          flex: 1;
          order: 1;
        }
        
        .dihedral-controls-panel {
          flex: 1;
          order: 2;
          max-width: 450px;
        }
      }
      
      .dihedral-controls-panel {
        background: rgba(20, 28, 40, 0.95);
        padding: 15px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      
      .dihedral-canvas-container {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      #dihedral-canvas-wrapper {
        position: relative;
        width: 100%;
        max-width: 500px;
      }
      
      #dihedral-canvas {
        width: 100%;
        height: auto;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        background: linear-gradient(135deg, #0a0f18 0%, #0f1419 100%);
      }
      
      .instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.5);
      }
      
      .dihedral-legend {
        margin-top: 10px;
        display: flex;
        gap: 20px;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .legend-color {
        width: 14px;
        height: 14px;
        border-radius: 3px;
      }
      
      .rotation-color { background: #3498db; }
      .reflection-color { background: #e74c3c; }
      .axis-color { 
        background: transparent;
        border: 2px dashed #f39c12;
      }
      
      /* State Display */
      .dihedral-state-display {
        background: rgba(21, 101, 192, 0.15);
        border: 1px solid rgba(21, 101, 192, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 15px;
      }
      
      .state-title {
        font-weight: bold;
        font-size: 0.95rem;
        color: #64b4ff;
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .state-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .state-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .state-label {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.85rem;
      }
      
      .state-value {
        color: #e8eaed;
        font-family: 'Courier New', monospace;
        font-size: 0.95rem;
      }
      
      .element-display {
        font-size: 1.2rem;
        font-weight: bold;
        color: #64b4ff;
      }
      
      .permutation-display {
        font-size: 0.8rem;
        color: #2ecc71;
      }
      
      /* Matrix Display */
      .dihedral-matrix-display {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 15px;
      }
      
      .matrix-title {
        font-weight: bold;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 10px;
      }
      
      .matrix-content {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 5px;
        margin-bottom: 10px;
      }
      
      .matrix-bracket {
        font-size: 2.5rem;
        font-weight: 100;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1;
      }
      
      .matrix-values {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .matrix-row {
        display: flex;
        gap: 20px;
      }
      
      .matrix-row span {
        width: 50px;
        text-align: right;
        font-family: 'Courier New', monospace;
        color: #64b4ff;
        font-size: 1rem;
      }
      
      .matrix-properties {
        display: flex;
        justify-content: center;
        gap: 20px;
        font-size: 0.85rem;
      }
      
      .matrix-properties span {
        padding: 4px 10px;
        background: rgba(46, 204, 113, 0.15);
        border: 1px solid rgba(46, 204, 113, 0.3);
        border-radius: 4px;
        color: #2ecc71;
      }
      
      /* Elements Grid */
      .dihedral-elements-group {
        margin-bottom: 15px;
      }
      
      .elements-section {
        margin-bottom: 12px;
      }
      
      .section-header {
        font-size: 0.85rem;
        font-weight: 600;
        padding: 8px 10px;
        border-radius: 4px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .section-icon {
        font-size: 1rem;
      }
      
      .rotation-header {
        background: rgba(52, 152, 219, 0.2);
        border-left: 3px solid #3498db;
        color: #64b4ff;
      }
      
      .reflection-header {
        background: rgba(231, 76, 60, 0.2);
        border-left: 3px solid #e74c3c;
        color: #e74c3c;
      }
      
      .elements-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
      }
      
      .element-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 8px 4px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      
      .element-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
      
      .element-btn.active {
        border-width: 2px;
      }
      
      .rotation-btn.active {
        background: rgba(52, 152, 219, 0.3);
        border-color: #3498db;
        box-shadow: 0 0 10px rgba(52, 152, 219, 0.3);
      }
      
      .reflection-btn.active {
        background: rgba(231, 76, 60, 0.3);
        border-color: #e74c3c;
        box-shadow: 0 0 10px rgba(231, 76, 60, 0.3);
      }
      
      .element-symbol {
        font-family: 'Times New Roman', serif;
        font-size: 1.1rem;
        font-weight: bold;
        color: #e8eaed;
      }
      
      .element-angle {
        font-size: 0.65rem;
        color: rgba(255, 255, 255, 0.5);
      }
      
      /* Composition Group */
      .dihedral-composition-group {
        background: rgba(106, 27, 154, 0.15);
        border: 1px solid rgba(106, 27, 154, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 15px;
      }
      
      .composition-title {
        font-weight: bold;
        font-size: 0.95rem;
        color: #ab47bc;
        margin-bottom: 4px;
      }
      
      .composition-description {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 10px;
      }
      
      .composition-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      
      .compose-select {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #e8eaed;
        font-family: 'Times New Roman', serif;
        font-size: 1rem;
        cursor: pointer;
      }
      
      .compose-select:focus {
        border-color: #ab47bc;
        outline: none;
      }
      
      .compose-operator, .compose-equals {
        font-size: 1.2rem;
        color: rgba(255, 255, 255, 0.6);
      }
      
      .compose-result {
        font-family: 'Times New Roman', serif;
        font-size: 1.2rem;
        font-weight: bold;
        color: #ab47bc;
        padding: 6px 12px;
        background: rgba(171, 71, 188, 0.2);
        border-radius: 4px;
        min-width: 40px;
        text-align: center;
      }
      
      .composition-note {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
        min-height: 1.2em;
        margin-top: 8px;
      }
      
      .composition-note.highlight {
        color: #f39c12;
      }
      
      /* Info Group */
      .dihedral-info-group {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 15px;
      }
      
      .info-title {
        font-weight: bold;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 8px;
      }
      
      .info-content {
        font-size: 0.85rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .info-content p {
        margin: 4px 0;
      }
      
      .info-content strong {
        color: #e8eaed;
      }
      
      /* Buttons */
      .primary-btn, .secondary-btn {
        width: 100%;
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }
      
      .primary-btn {
        background: linear-gradient(135deg, #6a1b9a, #ab47bc);
        color: white;
        margin-bottom: 8px;
      }
      
      .primary-btn:hover {
        background: linear-gradient(135deg, #7b1fa2, #ba68c8);
        transform: translateY(-1px);
      }
      
      .secondary-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e8eaed;
      }
      
      .secondary-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .elements-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .composition-controls {
          flex-direction: column;
          gap: 6px;
        }
        
        .composition-controls > * {
          width: 100%;
          text-align: center;
        }
        
        .compose-operator, .compose-equals {
          display: block;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    // ========== MATHEMATICAL DATA STRUCTURES ==========
    
    // Display names for elements
    const ELEMENT_DISPLAY = {
        'e': 'e', 'r': 'r', 'r2': 'r²', 'r3': 'r³', 'r4': 'r⁴', 'r5': 'r⁵',
        's': 's', 'rs': 'rs', 'r2s': 'r²s', 'r3s': 'r³s', 'r4s': 'r⁴s', 'r5s': 'r⁵s'
    };
    
    // Group elements with their mathematical properties
    // For rotations: element r^k rotates by k*60° counterclockwise
    // For reflections: element r^k*s reflects across axis at k*30°
    const D6_ELEMENTS = {
        'e':   { rotationAngle: 0,   isReflection: false, order: 1,  axisAngle: null },
        'r':   { rotationAngle: 60,  isReflection: false, order: 6,  axisAngle: null },
        'r2':  { rotationAngle: 120, isReflection: false, order: 3,  axisAngle: null },
        'r3':  { rotationAngle: 180, isReflection: false, order: 2,  axisAngle: null },
        'r4':  { rotationAngle: 240, isReflection: false, order: 3,  axisAngle: null },
        'r5':  { rotationAngle: 300, isReflection: false, order: 6,  axisAngle: null },
        's':   { rotationAngle: 0,   isReflection: true,  order: 2,  axisAngle: 0 },
        'rs':  { rotationAngle: 60,  isReflection: true,  order: 2,  axisAngle: 30 },
        'r2s': { rotationAngle: 120, isReflection: true,  order: 2,  axisAngle: 60 },
        'r3s': { rotationAngle: 180, isReflection: true,  order: 2,  axisAngle: 90 },
        'r4s': { rotationAngle: 240, isReflection: true,  order: 2,  axisAngle: 120 },
        'r5s': { rotationAngle: 300, isReflection: true,  order: 2,  axisAngle: 150 }
    };
    
    // Cayley table for D₆: CAYLEY_TABLE[g2][g1] = g2 ∘ g1 (apply g1 first, then g2)
    // This is computed using the relations: r⁶ = e, s² = e, sr = r⁻¹s = r⁵s
    const CAYLEY_TABLE = {
        'e':   { 'e':'e',   'r':'r',   'r2':'r2', 'r3':'r3', 'r4':'r4', 'r5':'r5', 's':'s',   'rs':'rs',   'r2s':'r2s', 'r3s':'r3s', 'r4s':'r4s', 'r5s':'r5s' },
        'r':   { 'e':'r',   'r':'r2',  'r2':'r3', 'r3':'r4', 'r4':'r5', 'r5':'e',  's':'rs',  'rs':'r2s',  'r2s':'r3s', 'r3s':'r4s', 'r4s':'r5s', 'r5s':'s' },
        'r2':  { 'e':'r2',  'r':'r3',  'r2':'r4', 'r3':'r5', 'r4':'e',  'r5':'r',  's':'r2s', 'rs':'r3s',  'r2s':'r4s', 'r3s':'r5s', 'r4s':'s',   'r5s':'rs' },
        'r3':  { 'e':'r3',  'r':'r4',  'r2':'r5', 'r3':'e',  'r4':'r',  'r5':'r2', 's':'r3s', 'rs':'r4s',  'r2s':'r5s', 'r3s':'s',   'r4s':'rs',  'r5s':'r2s' },
        'r4':  { 'e':'r4',  'r':'r5',  'r2':'e',  'r3':'r',  'r4':'r2', 'r5':'r3', 's':'r4s', 'rs':'r5s',  'r2s':'s',   'r3s':'rs',  'r4s':'r2s', 'r5s':'r3s' },
        'r5':  { 'e':'r5',  'r':'e',   'r2':'r',  'r3':'r2', 'r4':'r3', 'r5':'r4', 's':'r5s', 'rs':'s',    'r2s':'rs',  'r3s':'r2s', 'r4s':'r3s', 'r5s':'r4s' },
        's':   { 'e':'s',   'r':'r5s', 'r2':'r4s','r3':'r3s','r4':'r2s','r5':'rs', 's':'e',   'rs':'r5',   'r2s':'r4',  'r3s':'r3',  'r4s':'r2',  'r5s':'r' },
        'rs':  { 'e':'rs',  'r':'s',   'r2':'r5s','r3':'r4s','r4':'r3s','r5':'r2s','s':'r',   'rs':'e',    'r2s':'r5',  'r3s':'r4',  'r4s':'r3',  'r5s':'r2' },
        'r2s': { 'e':'r2s', 'r':'rs',  'r2':'s',  'r3':'r5s','r4':'r4s','r5':'r3s','s':'r2',  'rs':'r',    'r2s':'e',   'r3s':'r5',  'r4s':'r4',  'r5s':'r3' },
        'r3s': { 'e':'r3s', 'r':'r2s', 'r2':'rs', 'r3':'s',  'r4':'r5s','r5':'r4s','s':'r3',  'rs':'r2',   'r2s':'r',   'r3s':'e',   'r4s':'r5',  'r5s':'r4' },
        'r4s': { 'e':'r4s', 'r':'r3s', 'r2':'r2s','r3':'rs', 'r4':'s',  'r5':'r5s','s':'r4',  'rs':'r3',   'r2s':'r2',  'r3s':'r',   'r4s':'e',   'r5s':'r5' },
        'r5s': { 'e':'r5s', 'r':'r4s', 'r2':'r3s','r3':'r2s','r4':'rs', 'r5':'s',  's':'r5',  'rs':'r4',   'r2s':'r3',  'r3s':'r2',  'r4s':'r',   'r5s':'e' }
    };
    
    // ========== CANVAS AND STATE ==========
    
    const canvas = document.getElementById('dihedral-canvas');
    const ctx = canvas.getContext('2d');
    
    // State
    let currentElement = 'e';
    
    // DOM elements
    const currentElementDisplay = document.getElementById('current-element');
    const elementTypeDisplay = document.getElementById('element-type');
    const elementOrderDisplay = document.getElementById('element-order');
    const elementPermutationDisplay = document.getElementById('element-permutation');
    const m00 = document.getElementById('m00');
    const m01 = document.getElementById('m01');
    const m10 = document.getElementById('m10');
    const m11 = document.getElementById('m11');
    const detValue = document.getElementById('det-value');
    const orthogonalCheck = document.getElementById('orthogonal-check');
    const composeG1 = document.getElementById('compose-g1');
    const composeG2 = document.getElementById('compose-g2');
    const composeResult = document.getElementById('compose-result');
    const compositionNote = document.getElementById('composition-note');
    const applyCompositionBtn = document.getElementById('apply-composition');
    const resetBtn = document.getElementById('reset-btn');
    
    // ========== MATHEMATICAL FUNCTIONS ==========
    
    /**
     * Compute the 2x2 matrix for a group element
     * Rotation by θ: [[cos(θ), -sin(θ)], [sin(θ), cos(θ)]]
     * Reflection across axis at angle α: [[cos(2α), sin(2α)], [sin(2α), -cos(2α)]]
     */
    function getMatrix(element) {
        const elem = D6_ELEMENTS[element];
        const θ = elem.rotationAngle * Math.PI / 180;
        
        if (!elem.isReflection) {
            // Pure rotation matrix
            return [
                [Math.cos(θ), -Math.sin(θ)],
                [Math.sin(θ),  Math.cos(θ)]
            ];
        } else {
            // Reflection matrix: reflect across line at angle α
            // This is equivalent to rotation by θ followed by reflection across x-axis
            // Or: reflection across axis at angle θ/2
            const α = elem.axisAngle * Math.PI / 180;
            return [
                [Math.cos(2 * α),  Math.sin(2 * α)],
                [Math.sin(2 * α), -Math.cos(2 * α)]
            ];
        }
    }
    
    /**
     * Compute the permutation of vertices for a group element
     * Vertices are labeled 1-6 starting at the right and going counterclockwise
     */
    function getPermutation(element) {
        const elem = D6_ELEMENTS[element];
        const k = Math.round(elem.rotationAngle / 60) % 6;
        
        if (!elem.isReflection) {
            // Rotation r^k: vertex i maps to vertex ((i - 1 + k) % 6) + 1
            // In cycle notation, this is (1 2 3 4 5 6) applied k times
            const result = [];
            for (let i = 1; i <= 6; i++) {
                result.push(((i - 1 - k + 600) % 6) + 1);
            }
            return result;
        } else {
            // Reflection r^k*s: first reflect (s fixes vertex 1, swaps 2↔6, 3↔5, fixes 4 for s)
            // Then apply r^k
            // s as permutation: [1, 6, 5, 4, 3, 2] (vertex i goes to position s(i))
            // r^k*s: vertex i → position of r^k(s(i))
            
            // Actually, let's think about where each vertex GOES
            // For s (reflection across axis through vertices 1 and 4):
            // vertex 1 stays at 1, vertex 2 goes to 6, vertex 3 goes to 5, etc.
            const sPermutation = [1, 6, 5, 4, 3, 2]; // where vertex i goes under s
            
            // For r^k*s, we first apply s, then r^k
            // r^k shifts positions by k counterclockwise
            const result = [];
            for (let i = 0; i < 6; i++) {
                // Vertex (i+1) under s goes to position sPermutation[i]
                // Then r^k rotates that position
                const afterS = sPermutation[i];
                const afterRkS = ((afterS - 1 + k) % 6) + 1;
                result.push(afterRkS);
            }
            return result;
        }
    }
    
    /**
     * Convert permutation to cycle notation string
     */
    function permutationToCycleNotation(perm) {
        // perm[i] is where vertex (i+1) goes
        const visited = new Array(6).fill(false);
        const cycles = [];
        
        for (let start = 0; start < 6; start++) {
            if (visited[start]) continue;
            
            const cycle = [];
            let current = start;
            
            while (!visited[current]) {
                visited[current] = true;
                cycle.push(current + 1);
                // Find where this vertex goes
                current = perm[current] - 1;
            }
            
            if (cycle.length > 0) {
                cycles.push(cycle);
            }
        }
        
        // Format cycles
        if (cycles.length === 6 && cycles.every(c => c.length === 1)) {
            return '(1)(2)(3)(4)(5)(6)'; // Identity
        }
        
        return cycles
            .filter(c => c.length > 1)
            .map(c => '(' + c.join(' ') + ')')
            .join('') || '(1)';
    }
    
    /**
     * Apply matrix transformation to a point
     */
    function transformPoint(matrix, x, y) {
        return {
            x: matrix[0][0] * x + matrix[0][1] * y,
            y: matrix[1][0] * x + matrix[1][1] * y
        };
    }
    
    // ========== DRAWING FUNCTIONS ==========
    
    function drawCanvas() {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.35;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw subtle grid
        drawGrid(centerX, centerY, radius);
        
        // Draw reflection axes (behind hexagon)
        drawReflectionAxes(centerX, centerY, radius * 1.3);
        
        // Draw the hexagon with current transformation
        drawHexagon(centerX, centerY, radius);
        
        // Draw coordinate axes
        drawAxes(centerX, centerY, radius);
    }
    
    function drawGrid(cx, cy, radius) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        const gridSpacing = radius / 3;
        const extent = radius * 1.5;
        
        // Vertical lines
        for (let x = -extent; x <= extent; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(cx + x, cy - extent);
            ctx.lineTo(cx + x, cy + extent);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = -extent; y <= extent; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(cx - extent, cy + y);
            ctx.lineTo(cx + extent, cy + y);
            ctx.stroke();
        }
    }
    
    function drawAxes(cx, cy, radius) {
        const extent = radius * 1.2;
        
        // X-axis
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - extent, cy);
        ctx.lineTo(cx + extent, cy);
        ctx.stroke();
        
        // X-axis arrow
        ctx.beginPath();
        ctx.moveTo(cx + extent, cy);
        ctx.lineTo(cx + extent - 8, cy - 4);
        ctx.lineTo(cx + extent - 8, cy + 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
        ctx.fill();
        
        // Y-axis (pointing up)
        ctx.strokeStyle = 'rgba(100, 255, 100, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cx, cy + extent);
        ctx.lineTo(cx, cy - extent);
        ctx.stroke();
        
        // Y-axis arrow
        ctx.beginPath();
        ctx.moveTo(cx, cy - extent);
        ctx.lineTo(cx - 4, cy - extent + 8);
        ctx.lineTo(cx + 4, cy - extent + 8);
        ctx.closePath();
        ctx.fillStyle = 'rgba(100, 255, 100, 0.4)';
        ctx.fill();
        
        // Labels
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.fillText('x', cx + extent - 5, cy + 15);
        ctx.fillStyle = 'rgba(100, 255, 100, 0.6)';
        ctx.fillText('y', cx + 8, cy - extent + 12);
    }
    
    function drawReflectionAxes(cx, cy, length) {
        const elem = D6_ELEMENTS[currentElement];
        
        // Draw all 6 reflection axes faintly
        for (let k = 0; k < 6; k++) {
            const angle = k * 30 * Math.PI / 180;
            const isCurrentAxis = elem.isReflection && elem.axisAngle === k * 30;
            
            ctx.strokeStyle = isCurrentAxis 
                ? 'rgba(243, 156, 18, 0.8)' 
                : 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = isCurrentAxis ? 2 : 1;
            ctx.setLineDash(isCurrentAxis ? [8, 4] : [4, 4]);
            
            ctx.beginPath();
            ctx.moveTo(cx - length * Math.cos(angle), cy + length * Math.sin(angle));
            ctx.lineTo(cx + length * Math.cos(angle), cy - length * Math.sin(angle));
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    function drawHexagon(cx, cy, radius) {
        const elem = D6_ELEMENTS[currentElement];
        const matrix = getMatrix(currentElement);
        
        // Calculate vertex positions
        // Start at angle 0 (right side) and go counterclockwise
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3; // 60° intervals
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            // Apply transformation
            const transformed = transformPoint(matrix, x, y);
            vertices.push({
                x: cx + transformed.x,
                y: cy - transformed.y, // Flip y for canvas coordinates
                originalIndex: i + 1
            });
        }
        
        // Draw filled hexagon
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        
        // Fill with gradient based on transformation type
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        if (elem.isReflection) {
            gradient.addColorStop(0, 'rgba(231, 76, 60, 0.3)');
            gradient.addColorStop(1, 'rgba(231, 76, 60, 0.1)');
        } else {
            gradient.addColorStop(0, 'rgba(52, 152, 219, 0.3)');
            gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)');
        }
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw edges
        ctx.strokeStyle = elem.isReflection ? '#e74c3c' : '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw vertices and labels
        const permutation = getPermutation(currentElement);
        
        for (let i = 0; i < 6; i++) {
            const v = vertices[i];
            
            // Vertex dot
            ctx.beginPath();
            ctx.arc(v.x, v.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? '#f39c12' : '#e8eaed'; // Highlight vertex 1
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Label showing where this vertex came from
            // permutation[i] tells us where original vertex (i+1) goes
            // We want to show the original label at each transformed position
            const originalVertex = i + 1;
            
            // Find which original vertex ended up here
            let labelAtThisPosition = originalVertex;
            for (let j = 0; j < 6; j++) {
                if (permutation[j] === originalVertex) {
                    labelAtThisPosition = j + 1;
                    break;
                }
            }
            
            // Position label outside the hexagon
            const labelRadius = radius + 25;
            const angle = i * Math.PI / 3;
            const labelX = cx + labelRadius * Math.cos(angle);
            const labelY = cy - labelRadius * Math.sin(angle);
            
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = labelAtThisPosition === 1 ? '#f39c12' : '#e8eaed';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelAtThisPosition.toString(), labelX, labelY);
        }
        
        // Draw small reference indicator for original position of vertex 1
        if (currentElement !== 'e') {
            const refAngle = 0;
            const refX = cx + (radius + 40) * Math.cos(refAngle);
            const refY = cy - (radius + 40) * Math.sin(refAngle);
            
            ctx.font = '10px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('(ref)', refX, refY + 12);
        }
    }
    
    // ========== UI UPDATE FUNCTIONS ==========
    
    function updateStateDisplay() {
        const elem = D6_ELEMENTS[currentElement];
        const matrix = getMatrix(currentElement);
        const permutation = getPermutation(currentElement);
        
        // Update element info
        currentElementDisplay.textContent = ELEMENT_DISPLAY[currentElement];
        
        if (currentElement === 'e') {
            elementTypeDisplay.textContent = 'Identity';
        } else if (elem.isReflection) {
            elementTypeDisplay.textContent = `Reflection (axis at ${elem.axisAngle}°)`;
        } else {
            elementTypeDisplay.textContent = `Rotation by ${elem.rotationAngle}°`;
        }
        
        elementOrderDisplay.textContent = `|${ELEMENT_DISPLAY[currentElement]}| = ${elem.order}`;
        elementPermutationDisplay.textContent = permutationToCycleNotation(permutation);
        
        // Update matrix display
        m00.textContent = matrix[0][0].toFixed(2);
        m01.textContent = matrix[0][1].toFixed(2);
        m10.textContent = matrix[1][0].toFixed(2);
        m11.textContent = matrix[1][1].toFixed(2);
        
        // Compute determinant
        const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
        detValue.textContent = `det = ${det.toFixed(0)}`;
        
        // Check orthogonality (should always be true for D_n)
        orthogonalCheck.textContent = elem.isReflection ? 'Orthogonal (det=-1)' : 'Orthogonal (det=1)';
        
        // Update button states
        document.querySelectorAll('.element-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.element === currentElement) {
                btn.classList.add('active');
            }
        });
    }
    
    function updateComposition() {
        const g1 = composeG1.value;
        const g2 = composeG2.value;
        const result = CAYLEY_TABLE[g2][g1];
        
        composeResult.textContent = ELEMENT_DISPLAY[result];
        
        // Check if this demonstrates non-commutativity
        const reverseResult = CAYLEY_TABLE[g1][g2];
        if (result !== reverseResult) {
            compositionNote.textContent = `Note: ${ELEMENT_DISPLAY[g1]} ∘ ${ELEMENT_DISPLAY[g2]} = ${ELEMENT_DISPLAY[reverseResult]} ≠ ${ELEMENT_DISPLAY[result]} (non-abelian!)`;
            compositionNote.classList.add('highlight');
        } else {
            compositionNote.textContent = '';
            compositionNote.classList.remove('highlight');
        }
    }
    
    function applyElement(element) {
        currentElement = element;
        updateStateDisplay();
        drawCanvas();
    }
    
    // ========== EVENT HANDLERS ==========
    
    // Element button clicks
    document.querySelectorAll('.element-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyElement(btn.dataset.element);
        });
    });
    
    // Composition selects
    composeG1.addEventListener('change', updateComposition);
    composeG2.addEventListener('change', updateComposition);
    
    // Apply composition button
    applyCompositionBtn.addEventListener('click', () => {
        const g1 = composeG1.value;
        const g2 = composeG2.value;
        const result = CAYLEY_TABLE[g2][g1];
        applyElement(result);
    });
    
    // Reset button
    resetBtn.addEventListener('click', () => {
        applyElement('e');
        composeG1.value = 'e';
        composeG2.value = 'e';
        updateComposition();
    });
    
    // Handle window resize
    function handleResize() {
        const wrapper = document.getElementById('dihedral-canvas-wrapper');
        const size = Math.min(wrapper.clientWidth, 500);
        canvas.width = size;
        canvas.height = size;
        drawCanvas();
    }
    
    window.addEventListener('resize', handleResize);
    
    // ========== INITIALIZATION ==========
    
    handleResize();
    updateStateDisplay();
    updateComposition();
    drawCanvas();
});