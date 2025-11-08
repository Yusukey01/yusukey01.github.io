// deep_nn.js - Interactive Transformer Architecture Demo (GPT-style Decoder)

class TransformerDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }
        
        // Configuration with expanded vocabulary (KEEP existing config)
        this.config = {
            vocab: [
                '<PAD>', '<START>', '<END>', '<UNK>',
                // Common words
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'after',
                // Common nouns
                'cat', 'dog', 'bird', 'fish', 'mouse', 'lion', 'tiger', 'bear', 'fox',
                'house', 'home', 'room', 'door', 'window', 'table', 'chair', 'bed',
                'car', 'bus', 'train', 'plane', 'boat', 'bike',
                'tree', 'flower', 'grass', 'sky', 'sun', 'moon', 'star', 'cloud',
                'water', 'fire', 'earth', 'air', 'rain', 'snow', 'wind',
                'food', 'bread', 'milk', 'cheese', 'apple', 'banana',
                'person', 'man', 'woman', 'child', 'boy', 'girl', 'friend',
                // Common verbs
                'run', 'walk', 'jump', 'sleep', 'eat', 'drink', 'see', 'hear', 'smell',
                'touch', 'know', 'think', 'feel', 'say', 'tell', 'ask', 'make', 'do',
                'go', 'come', 'take', 'give', 'live', 'work', 'study', 'play', 'read', 'write'
            ],
            // Other configuration settings (like model dimensions, layers, etc.)
            d_model: 512,
            n_heads: 8,
            n_layers: 6,
        };

        // State variables
        this.inputSequence = ['<START>'];
        this.eventCleanup = [];
        this.posEncodingCache = new Map();
        this.maskCache = new Map();

        // Inject styles first, then initialize UI
        this.injectStyles();
        this.initializeUI();
    }

    // =========================================================================
    // CORE TRANSFORMER ARCHITECTURE METHODS (PLACE YOUR ORIGINAL CODE HERE)
    // =========================================================================
    
    // NOTE: Replace these placeholders with your original, complex implementation!
    
    _performEmbedding(token) { 
        // YOUR ORIGINAL LOGIC FOR EMBEDDING
        return null; // Replace with actual vector
    }

    _applyPositionalEncoding(vector, position) {
        // YOUR ORIGINAL LOGIC FOR POSITIONAL ENCODING
        return null; // Replace with actual vector
    }

    _runDecoderStack(inputVector) {
        // YOUR ORIGINAL LOGIC FOR THE DECODER BLOCKS (Attention, Feed-Forward, etc.)
        return null; // Replace with final decoder output
    }

    _runLinearProjection(decoderOutput) {
        // YOUR ORIGINAL LOGIC FOR LINEAR PROJECTION (Logits calculation)
        return null; // Replace with Logits vector
    }
    
    // createCausalMask(size) { ... } // Your masking function

    // =========================================================================
    // NEW: SOFTMAX SIMULATION AND DISPLAY LOGIC (Replaces Grammar Rules)
    // =========================================================================

    /**
     * @method simulateSoftmaxOutput
     * @description Simulates the output of the final Softmax layer.
     */
    simulateSoftmaxOutput(vocab) {
        const numPredictions = 5;
        const tokens = [...vocab]; 

        const filteredTokens = tokens.filter(t => !['<UNK>', '<PAD>', '<START>', '<END>'].includes(t));

        const selectedTokens = [];
        const tokensToSelect = Math.min(filteredTokens.length, numPredictions); 
        
        for (let i = 0; i < tokensToSelect; i++) {
            const randomIndex = Math.floor(Math.random() * filteredTokens.length);
            selectedTokens.push(filteredTokens.splice(randomIndex, 1)[0]);
        }
        
        let logits = selectedTokens.map(() => Math.random() * 10); 
        
        // Apply Softmax: e^x / sum(e^x)
        const exponentials = logits.map(l => Math.exp(l));
        const sumExp = exponentials.reduce((a, b) => a + b, 0);
        
        const predictions = selectedTokens.map((token, index) => ({
            token: token,
            probability: parseFloat((exponentials[index] / sumExp).toFixed(3))
        }));
        
        predictions.sort((a, b) => b.probability - a.probability);
        
        return predictions;
    }
    
    /**
     * @method displaySoftmaxResults
     * @description Updates the UI to show the probabilistic output.
     */
    displaySoftmaxResults(predictions) {
        const container = document.querySelector('.generation-container'); 
        if (!container) {
            this.showError("Could not find the '.generation-container' element to display results.");
            return;
        }

        let html = '<h3>Softmax Output (Simulated)</h3>';
        html += '<p class="note">A trained model generates these probabilities based on context. In this **untrained demo**, they are random, but accurately illustrate the final **Softmax** mechanism.</p>';
        html += '<table class="softmax-table">';
        html += '<thead><tr><th>Token</th><th>Probability</th><th>Visual Representation</th></tr></thead>';
        html += '<tbody>';

        const maxProb = predictions.length > 0 ? predictions[0].probability : 1; 

        predictions.forEach(p => {
            const width = (p.probability / maxProb) * 100; 
            
            html += `<tr>
                <td><strong>${p.token}</strong></td>
                <td>${(p.probability * 100).toFixed(1)}%</td>
                <td>
                    <div class="softmax-bar-container">
                        <div class="softmax-bar" style="width: ${width}%;"></div>
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }


    // =========================================================================
    // MAIN GENERATION LOGIC (UPDATED)
    // =========================================================================

    /**
     * @method runNextTokenPrediction
     * @description Runs the Transformer inference to predict the next token.
     */
    runNextTokenPrediction() {
        // --- STEP 1: Run Transformer Pipeline (Uses your existing logic) ---
        
        const embeddings = this.inputSequence.map((token, i) => this._applyPositionalEncoding(this._performEmbedding(token), i));
        
        const decoderOutput = this._runDecoderStack(embeddings);
        
        // This calculates the logits but is NOT used to pick the next word, 
        // fulfilling the pedagogical requirement of the untrained demo.
        const logits = this._runLinearProjection(decoderOutput); 

        // --- STEP 2: Softmax Simulation (NEW LOGIC replaces old grammar rules) ---
        
        const softmaxPredictions = this.simulateSoftmaxOutput(this.config.vocab);
        
        this.displaySoftmaxResults(softmaxPredictions);
    }
    
    // =========================================================================
    // UTILITY AND UI METHODS (KEEP/ADD utility functions)
    // =========================================================================
    
    /**
     * @method injectStyles
     * @description Injects the necessary CSS for the new Softmax visualization into the document head.
     */
    injectStyles() {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            /* --- Styles for Utility Elements (Used by showError) --- */
            .error {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                padding: 10px 20px;
                margin-bottom: 20px;
                border-radius: 6px;
                font-weight: bold;
            }

            /* --- Softmax Prediction Display Styles (NEW VISUALIZATION) --- */
            .generation-container {
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-top: 20px;
                background-color: #f9f9f9;
            }

            .generation-container .note {
                font-size: 0.9em;
                color: #666;
                margin-bottom: 15px;
                border-left: 4px solid #6495ED; 
                padding-left: 12px;
            }

            .softmax-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 1.05em;
            }

            .softmax-table th, .softmax-table td {
                padding: 10px 15px;
                text-align: left;
                border-bottom: 1px solid #eee;
            }

            .softmax-table th {
                background-color: #f1f1f1;
                font-weight: bold;
                text-transform: uppercase;
            }

            .softmax-bar-container {
                width: 100%;
                height: 20px;
                background-color: #e9e9e9;
                border-radius: 4px;
                overflow: hidden; 
            }

            .softmax-bar {
                height: 100%; 
                background-color: #6495ED; 
                transition: width 0.5s ease-out; 
            }
        `;
        document.head.appendChild(style);
    }
    
    initializeUI() {
        // YOUR ORIGINAL UI INITIALIZATION CODE GOES HERE (buttons, input fields, etc.)
    }
    
    clearDisplay() {
        document.querySelector('.generation-container').innerHTML = '';
        document.querySelector('.attention-container').innerHTML = '';
        document.querySelector('.dataflow-container').innerHTML = '';
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        this.container.insertBefore(errorDiv, this.container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    destroy() {
        this.eventCleanup.forEach(cleanup => cleanup());
        this.eventCleanup = [];
        
        if (this.posEncodingCache) {
            this.posEncodingCache.clear();
        }
        if (this.maskCache) {
            this.maskCache.clear();
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transformer_demo')) {
        window.transformerDemo = new TransformerDemo('transformer_demo');
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.transformerDemo && typeof window.transformerDemo.destroy === 'function') {
        window.transformerDemo.destroy();
    }
});