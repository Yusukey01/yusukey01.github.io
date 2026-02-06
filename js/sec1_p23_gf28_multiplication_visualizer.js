// gf28_multiplication_visualizer.js
// Interactive visualizer for GF(2^8) multiplication in AES
// Demonstrates the isomorphism F[x]/<p(x)> ≅ GF(2^8) in practice

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('gf28-multiplication-visualizer');
    
    if (!container) {
        console.error('GF(2^8) multiplication visualizer container not found!');
        return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="gf28-visualizer-container">
        <div class="gf28-visualizer-layout">
          <div class="gf28-input-section">
            <div class="instruction" id="gf28-instruction">
              Enter two bytes (00-FF) or select preset examples to see step-by-step field multiplication
            </div>
            
            <div class="gf28-input-panel">
              <div class="input-group">
                <label for="input-a">Element A (hex):</label>
                <div class="input-wrapper">
                  <input type="text" id="input-a" class="hex-input" value="53" maxlength="2">
                  <span class="hex-prefix">0x</span>
                </div>
                <div class="binary-display" id="binary-a">0101 0011</div>
                <div class="polynomial-display" id="poly-a">x⁶ + x⁴ + x + 1</div>
              </div>
              
              <div class="multiply-symbol">×</div>
              
              <div class="input-group">
                <label for="input-b">Element B (hex):</label>
                <div class="input-wrapper">
                  <input type="text" id="input-b" class="hex-input" value="CA" maxlength="2">
                  <span class="hex-prefix">0x</span>
                </div>
                <div class="binary-display" id="binary-b">1100 1010</div>
                <div class="polynomial-display" id="poly-b">x⁷ + x⁶ + x³ + x</div>
              </div>
            </div>
            
            <div class="preset-examples">
              <div class="preset-title">Preset Examples:</div>
              <div class="preset-buttons">
                <button class="preset-btn" data-a="02" data-b="87">AES MixColumns</button>
                <button class="preset-btn" data-a="53" data-b="CA">General Example</button>
                <button class="preset-btn" data-a="57" data-b="83">From Spec</button>
                <button class="preset-btn" data-a="01" data-b="FF">Identity Test</button>
              </div>
            </div>
            
            <button id="calculate-btn" class="primary-btn">Calculate A × B in GF(2⁸)</button>
          </div>
          
          <div class="gf28-result-section">
            <div class="result-header">
              <div class="result-title">Multiplication Result</div>
              <div class="result-value" id="result-hex">0x00</div>
            </div>
            
            <div class="step-container" id="step-container">
              <div class="step-placeholder">
                Click "Calculate" to see step-by-step multiplication
              </div>
            </div>
            
            <div class="theory-connection">
              <div class="theory-title">💡 Theory → Practice</div>
              <div class="theory-content">
                <div class="theory-point">
                  <span class="theory-label">Isomorphism:</span>
                  <span class="theory-text">GF(2⁸) ≅ F₂[x] / ⟨p(x)⟩</span>
                </div>
                <div class="theory-point">
                  <span class="theory-label">Irreducible p(x):</span>
                  <span class="theory-text">x⁸ + x⁴ + x³ + x + 1 = 0x11B</span>
                </div>
                <div class="theory-point">
                  <span class="theory-label">Reduction:</span>
                  <span class="theory-text">x⁸ ≡ x⁴ + x³ + x + 1 (XOR 0x1B)</span>
                </div>
                <div class="theory-point">
                  <span class="theory-label">Hardware:</span>
                  <span class="theory-text">Left shift + conditional XOR with 0x1B</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .gf28-visualizer-container {
        margin-bottom: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e8eaed;
      }
      
      .gf28-visualizer-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      @media (min-width: 992px) {
        .gf28-visualizer-layout {
          flex-direction: row;
        }
        
        .gf28-input-section {
          flex: 0 0 400px;
        }
        
        .gf28-result-section {
          flex: 1;
        }
      }
      
      .instruction {
        text-align: center;
        margin-bottom: 15px;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.4;
      }
      
      /* Input Panel */
      .gf28-input-panel {
        background: rgba(20, 28, 40, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 15px;
      }
      
      .input-group {
        margin-bottom: 20px;
      }
      
      .input-group label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 600;
      }
      
      .input-wrapper {
        position: relative;
        display: inline-block;
        width: 100%;
      }
      
      .hex-prefix {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.4);
        font-family: 'Courier New', monospace;
        font-size: 1.1rem;
        pointer-events: none;
      }
      
      .hex-input {
        width: 100%;
        padding: 12px 12px 12px 42px;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: #64b4ff;
        font-family: 'Courier New', monospace;
        font-size: 1.3rem;
        font-weight: bold;
        text-transform: uppercase;
        transition: all 0.2s ease;
      }
      
      .hex-input:focus {
        outline: none;
        border-color: #64b4ff;
        background: rgba(21, 101, 192, 0.15);
      }
      
      .hex-input.invalid {
        border-color: #e74c3c;
        background: rgba(231, 76, 60, 0.1);
      }
      
      .binary-display {
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.95rem;
        color: #2ecc71;
        text-align: center;
        letter-spacing: 2px;
      }
      
      .polynomial-display {
        margin-top: 6px;
        font-family: 'Times New Roman', serif;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
        font-style: italic;
      }
      
      .multiply-symbol {
        text-align: center;
        font-size: 2rem;
        color: rgba(255, 255, 255, 0.4);
        margin: 10px 0;
      }
      
      /* Preset Examples */
      .preset-examples {
        background: rgba(106, 27, 154, 0.15);
        border: 1px solid rgba(106, 27, 154, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 15px;
      }
      
      .preset-title {
        font-size: 0.85rem;
        color: #ab47bc;
        margin-bottom: 10px;
        font-weight: 600;
      }
      
      .preset-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      
      .preset-btn {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #e8eaed;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .preset-btn:hover {
        background: rgba(171, 71, 188, 0.3);
        border-color: #ab47bc;
      }
      
      .primary-btn {
        width: 100%;
        padding: 14px 20px;
        background: linear-gradient(135deg, #1565c0, #1976d2);
        border: none;
        border-radius: 6px;
        color: white;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .primary-btn:hover {
        background: linear-gradient(135deg, #1976d2, #2196f3);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(21, 101, 192, 0.4);
      }
      
      .primary-btn:active {
        transform: translateY(0);
      }
      
      /* Result Section */
      .gf28-result-section {
        background: rgba(20, 28, 40, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 20px;
      }
      
      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .result-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .result-value {
        font-family: 'Courier New', monospace;
        font-size: 1.5rem;
        font-weight: bold;
        color: #2ecc71;
        padding: 8px 16px;
        background: rgba(46, 204, 113, 0.15);
        border-radius: 6px;
        border: 1px solid rgba(46, 204, 113, 0.3);
      }
      
      /* Step Container */
      .step-container {
        min-height: 300px;
        margin-bottom: 20px;
      }
      
      .step-placeholder {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.95rem;
      }
      
      .calculation-step {
        margin-bottom: 20px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 3px solid #64b4ff;
        border-radius: 4px;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .step-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #64b4ff;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .step-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: rgba(21, 101, 192, 0.3);
        border-radius: 50%;
        font-size: 0.8rem;
      }
      
      .step-content {
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        line-height: 1.8;
        color: #e8eaed;
      }
      
      .step-operation {
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        margin: 6px 0;
      }
      
      .step-binary {
        color: #2ecc71;
        letter-spacing: 1px;
      }
      
      .step-hex {
        color: #64b4ff;
      }
      
      .step-reduction {
        background: rgba(230, 126, 34, 0.15);
        border-left: 2px solid #e67e22;
      }
      
      .step-xor {
        color: #f39c12;
      }
      
      .step-explanation {
        margin-top: 8px;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      /* Theory Connection */
      .theory-connection {
        background: rgba(230, 126, 34, 0.15);
        border: 1px solid rgba(230, 126, 34, 0.3);
        border-radius: 8px;
        padding: 15px;
      }
      
      .theory-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #f39c12;
        margin-bottom: 12px;
      }
      
      .theory-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .theory-point {
        display: flex;
        gap: 8px;
        font-size: 0.85rem;
        line-height: 1.4;
      }
      
      .theory-label {
        color: rgba(255, 255, 255, 0.6);
        min-width: 90px;
        font-weight: 600;
      }
      
      .theory-text {
        color: #e8eaed;
        font-family: 'Courier New', monospace;
      }
      
      @media (max-width: 768px) {
        .preset-buttons {
          grid-template-columns: 1fr;
        }
        
        .result-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    // JavaScript Logic
    const inputA = document.getElementById('input-a');
    const inputB = document.getElementById('input-b');
    const binaryA = document.getElementById('binary-a');
    const binaryB = document.getElementById('binary-b');
    const polyA = document.getElementById('poly-a');
    const polyB = document.getElementById('poly-b');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultHex = document.getElementById('result-hex');
    const stepContainer = document.getElementById('step-container');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    // AES irreducible polynomial: x^8 + x^4 + x^3 + x + 1 = 0x11B
    const REDUCTION_MASK = 0x1B;
    
    // Convert hex string to number
    function hexToNum(hex) {
        const num = parseInt(hex, 16);
        return isNaN(num) ? null : num;
    }
    
    // Convert number to binary string with spacing
    function numToBinary(num) {
        const bin = num.toString(2).padStart(8, '0');
        return bin.slice(0, 4) + ' ' + bin.slice(4);
    }
    
    // Convert number to polynomial representation
    function numToPolynomial(num) {
        const terms = [];
        for (let i = 7; i >= 0; i--) {
            if (num & (1 << i)) {
                if (i === 0) {
                    terms.push('1');
                } else if (i === 1) {
                    terms.push('x');
                } else {
                    terms.push(`x${superscript(i)}`);
                }
            }
        }
        return terms.length > 0 ? terms.join(' + ') : '0';
    }
    
    // Convert number to superscript
    function superscript(n) {
        const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
        return n.toString().split('').map(d => superscripts[d]).join('');
    }
    
    // GF(2^8) multiplication
    function gf28Multiply(a, b) {
        let result = 0;
        let temp = a;
        const steps = [];
        
        // Step 1: Show initial setup
        steps.push({
            title: 'Step 1: Initial Setup',
            content: `
                <div class="step-operation">
                    a = <span class="step-hex">0x${a.toString(16).toUpperCase().padStart(2, '0')}</span> = 
                    <span class="step-binary">${numToBinary(a)}</span>
                </div>
                <div class="step-operation">
                    b = <span class="step-hex">0x${b.toString(16).toUpperCase().padStart(2, '0')}</span> = 
                    <span class="step-binary">${numToBinary(b)}</span>
                </div>
                <div class="step-explanation">
                    Polynomial form: a(x) = ${numToPolynomial(a)}<br>
                    Polynomial form: b(x) = ${numToPolynomial(b)}
                </div>
            `
        });
        
        // Step 2: Polynomial multiplication (peasant multiplication in GF(2))
        const multSteps = [];
        for (let i = 0; i < 8; i++) {
            if (b & 1) {
                result ^= temp;
                multSteps.push(`
                    <div class="step-operation">
                        Bit ${i}: b[${i}] = 1 → result ^= temp = 
                        <span class="step-binary">${numToBinary(temp)}</span>
                        (<span class="step-hex">0x${temp.toString(16).toUpperCase().padStart(2, '0')}</span>)
                    </div>
                `);
            }
            
            const hibit = temp & 0x80;
            temp <<= 1;
            
            if (hibit) {
                temp ^= REDUCTION_MASK;
                multSteps.push(`
                    <div class="step-operation step-reduction">
                        Overflow detected (x⁸ term) → shift & <span class="step-xor">XOR with 0x1B</span><br>
                        temp = <span class="step-binary">${numToBinary(temp & 0xFF)}</span>
                        (<span class="step-hex">0x${(temp & 0xFF).toString(16).toUpperCase().padStart(2, '0')}</span>)
                    </div>
                `);
            } else if (i < 7) {
                multSteps.push(`
                    <div class="step-operation">
                        No overflow → temp <<= 1 = 
                        <span class="step-binary">${numToBinary(temp & 0xFF)}</span>
                    </div>
                `);
            }
            
            b >>= 1;
            temp &= 0xFF;
        }
        
        steps.push({
            title: 'Step 2: Polynomial Multiplication (Russian Peasant Method)',
            content: multSteps.join(''),
            explanation: 'We multiply by repeatedly doubling and adding, reducing modulo p(x) whenever x⁸ appears'
        });
        
        // Step 3: Final result
        steps.push({
            title: 'Step 3: Final Result',
            content: `
                <div class="step-operation">
                    result = <span class="step-hex">0x${result.toString(16).toUpperCase().padStart(2, '0')}</span> = 
                    <span class="step-binary">${numToBinary(result)}</span>
                </div>
                <div class="step-explanation">
                    Polynomial form: ${numToPolynomial(result)}
                </div>
            `,
            explanation: 'This is the unique element in GF(2⁸) representing the product in F₂[x]/⟨p(x)⟩'
        });
        
        return { result, steps };
    }
    
    // Update displays for an input
    function updateDisplay(input, binaryDisplay, polyDisplay) {
        const hex = input.value.toUpperCase();
        const num = hexToNum(hex);
        
        if (num === null || num > 255) {
            input.classList.add('invalid');
            binaryDisplay.textContent = '---- ----';
            polyDisplay.textContent = 'Invalid input';
        } else {
            input.classList.remove('invalid');
            binaryDisplay.textContent = numToBinary(num);
            polyDisplay.textContent = numToPolynomial(num);
        }
    }
    
    // Calculate and display result
    function calculate() {
        const a = hexToNum(inputA.value);
        const b = hexToNum(inputB.value);
        
        if (a === null || b === null || a > 255 || b > 255) {
            stepContainer.innerHTML = `
                <div class="step-placeholder" style="color: #e74c3c;">
                    Please enter valid hex values (00-FF)
                </div>
            `;
            return;
        }
        
        const { result, steps } = gf28Multiply(a, b);
        
        // Update result display
        resultHex.textContent = '0x' + result.toString(16).toUpperCase().padStart(2, '0');
        
        // Display steps
        stepContainer.innerHTML = steps.map((step, index) => `
            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">${index + 1}</span>
                    ${step.title}
                </div>
                <div class="step-content">
                    ${step.content}
                    ${step.explanation ? `<div class="step-explanation">${step.explanation}</div>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // Event listeners
    inputA.addEventListener('input', () => updateDisplay(inputA, binaryA, polyA));
    inputB.addEventListener('input', () => updateDisplay(inputB, binaryB, polyB));
    
    calculateBtn.addEventListener('click', calculate);
    
    // Preset buttons
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            inputA.value = btn.dataset.a;
            inputB.value = btn.dataset.b;
            updateDisplay(inputA, binaryA, polyA);
            updateDisplay(inputB, binaryB, polyB);
            calculate();
        });
    });
    
    // Initialize displays
    updateDisplay(inputA, binaryA, polyA);
    updateDisplay(inputB, binaryB, polyB);
    
    // Auto-calculate on Enter key
    inputA.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') calculate();
    });
    inputB.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') calculate();
    });
});