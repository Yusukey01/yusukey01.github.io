// deep_nn.js - (Revised) Interactive Transformer Architecture Demo (GPT-style Decoder)

class TransformerDemo {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }
        
        // Configuration with expanded vocabulary (as per existing file)
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
        this.inputSequence = ['<START>']; // Start with the <START> token
        this.eventCleanup = [];
        this.posEncodingCache = new Map();
        this.maskCache = new Map();

        // Initialize the UI and event listeners
        this.initializeUI();
    }

    // =========================================================================
    // CORE TRANSFORMER ARCHITECTURE METHODS (Existing Code - Omitted for brevity)
    // =========================================================================
    
    // Example placeholder for existing core logic
    _performEmbedding(token) { 
        // Logic for converting token to a vector (omitted)
        return `Embedding(${token})`; 
    }

    _applyPositionalEncoding(vector, position) {
        // Logic for adding positional encoding (omitted)
        return `Vector + POS(${position})`;
    }

    _runDecoderStack(inputVector) {
        // Logic for running vectors through N decoder blocks (omitted)
        return 'DecoderOutput';
    }

    _runLinearProjection(decoderOutput) {
        // Logic for projecting to vocabulary size (omitted)
        return 'Logits';
    }
    
    // Your existing createCausalMask method would go here
    // createCausalMask(size) { ... }

    // =========================================================================
    // NEW: SOFTMAX SIMULATION AND DISPLAY LOGIC (Replaces Grammar Rules)
    // =========================================================================

    /**
     * @method simulateSoftmaxOutput
     * @description Simulates the output of the final Softmax layer by assigning random, normalized probabilities
     * to a small subset of the vocabulary. This accurately demonstrates the mechanism 
     * (probabilistic prediction) without needing a trained model.
     * @param {Array<string>} vocab The vocabulary list from this.config.vocab.
     * @returns {Array<{token: string, probability: number}>} A list of top predicted tokens and their probabilities.
     */
    simulateSoftmaxOutput(vocab) {
        const numPredictions = 5;
        const tokens = [...vocab]; 

        // Filter out special tokens
        const filteredTokens = tokens.filter(t => !['<UNK>', '<PAD>', '<START>', '<END>'].includes(t));

        // Simple random selection of 5 tokens
        const selectedTokens = [];
        const tokensToSelect = Math.min(filteredTokens.length, numPredictions); 
        
        // Randomly select tokens without replacement
        for (let i = 0; i < tokensToSelect; i++) {
            const randomIndex = Math.floor(Math.random() * filteredTokens.length);
            selectedTokens.push(filteredTokens.splice(randomIndex, 1)[0]);
        }
        
        // 1. Assign random "logits" (scores)
        let logits = selectedTokens.map(() => Math.random() * 10); 
        
        // 2. Apply Softmax: e^x / sum(e^x)
        // Softmax converts logits into a probability distribution.
        const exponentials = logits.map(l => Math.exp(l));
        const sumExp = exponentials.reduce((a, b) => a + b, 0);
        
        const predictions = selectedTokens.map((token, index) => ({
            token: token,
            // Round probability to 3 decimal places for clean display
            probability: parseFloat((exponentials[index] / sumExp).toFixed(3))
        }));
        
        // 3. Sort by probability (highest first) and return
        predictions.sort((a, b) => b.probability - a.probability);
        
        return predictions;
    }
    
    /**
     * @method displaySoftmaxResults
     * @description Updates the UI to show the probabilistic output.
     * @param {Array<{token: string, probability: number}>} predictions The list of top tokens and probabilities.
     */
    displaySoftmaxResults(predictions) {
        const container = document.querySelector('.generation-container'); // Assuming you have a generation output area
        
        let html = '<h3>Softmax Output (Simulated)</h3>';
        html += '<p class="note">A trained model generates these probabilities based on context. In this **untrained demo**, they are random, but illustrate the final prediction mechanism.</p>';
        html += '<table>';
        html += '<tr><th>Token</th><th>Probability</th><th>Visual</th></tr>';

        // Calculate total for visual bar (optional, but good for demo)
        const maxProb = predictions[0] ? predictions[0].probability : 1; 

        predictions.forEach(p => {
            const width = (p.probability / maxProb) * 100; // Relative width for bar
            html += `<tr>
                <td><strong>${p.token}</strong></td>
                <td>${(p.probability * 100).toFixed(1)}%</td>
                <td><div style="height: 15px; width: ${width}%; background-color: #6495ED; border-radius: 3px;"></div></td>
            </tr>`;
        });

        html += '</table>';
        container.innerHTML = html;
    }


    // =========================================================================
    // MAIN GENERATION LOGIC (UPDATED)
    // =========================================================================

    /**
     * @method runNextTokenPrediction
     * @description The main function to run the Transformer and generate the next token.
     * NOTE: This is the function that must be updated to replace old grammar logic.
     */
    runNextTokenPrediction() {
        // --- STEP 1: Process Input (Keep your existing logic) ---
        // 1. Get current sequence (this.inputSequence)
        // 2. Run through Embedding + Positional Encoding (omitted placeholder)
        const embeddings = this.inputSequence.map((token, i) => this._applyPositionalEncoding(this._performEmbedding(token), i));
        
        // 3. Run through Decoder Stack (omitted placeholder)
        const decoderOutput = this._runDecoderStack(embeddings);
        
        // 4. Run through Linear Projection to get Logits (omitted placeholder)
        const logits = this._runLinearProjection(decoderOutput);

        // --- STEP 2: Softmax and Display (NEW LOGIC) ---
        
        // OLD LOGIC REMOVED: 
        // const nextWord = this.applyGrammarRules(currentSentence); 
        
        // NEW LOGIC: Simulate the probabilistic Softmax output
        const softmaxPredictions = this.simulateSoftmaxOutput(this.config.vocab);
        
        // Display the results honestly, as a probability distribution
        this.displaySoftmaxResults(softmaxPredictions);

        // --- STEP 3: Auto-continue (Optional for demo) ---
        // If you want the demo to auto-continue, you could choose the top token here:
        // const nextToken = softmaxPredictions[0].token;
        // this.inputSequence.push(nextToken);
        // this.updateDataflow(nextToken); // Update the visual flow
    }
    
    // =========================================================================
    // UTILITY AND UI METHODS (Existing Code - Simplified)
    // =========================================================================
    
    initializeUI() {
        // Your logic to set up buttons, input fields, and containers goes here.
        // Make sure you have a button that calls this.runNextTokenPrediction()
    }

    // Your existing showError method would go here
    showError(message) { /* ... */ }

    // Your existing destroy method would go here
    destroy() { 
        this.eventCleanup.forEach(cleanup => cleanup());
        this.eventCleanup = [];
        if (this.posEncodingCache) { this.posEncodingCache.clear(); }
        if (this.maskCache) { this.maskCache.clear(); }
        if (this.container) { this.container.innerHTML = ''; }
    }
}

// Initialize the demo when the page loads (as per existing file)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transformer_demo')) {
        window.transformerDemo = new TransformerDemo('transformer_demo');
    }
});

// Clean up on page unload (as per existing file)
window.addEventListener('beforeunload', () => {
    if (window.transformerDemo && typeof window.transformerDemo.destroy === 'function') {
        window.transformerDemo.destroy();
    }
});