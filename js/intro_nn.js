// An interactive demo for neural networks classification

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('neural_network_visualizer');

    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // Train the model using gradient descent with backpropagation
    async function trainModel() {
        if (isTraining) return;
        isTraining = true;
        if (trainBtn) {
            trainBtn.textContent = 'Training...';
            trainBtn.disabled = true;
        }

        let iterations = 0;
        let previousLoss = Infinity;
        let currentLoss = calculateLoss();

        const minLossChange = 1e-6;

        while (iterations < maxIterations && Math.abs(previousLoss - currentLoss) > minLossChange) {
            previousLoss = currentLoss;
            
            // Forward pass and backward pass for all training data
            const gradients = computeGradients();
            
            // Update weights using gradients
            updateWeights(gradients);
            
            // Calculate new loss
            currentLoss = calculateLoss();
            
            // Update display every 10 iterations to avoid UI freezes
            if (iterations % 10 === 0) {
                if (lossElement) lossElement.textContent = currentLoss.toFixed(4);
                if (accuracyElement) accuracyElement.textContent = (calculateAccuracy() * 100).toFixed(1) + '%';
                updateWeightDisplay();
                drawCanvas();
                
                // Pause to allow UI to update
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            iterations++;
        }

        // Final update
        if (lossElement) lossElement.textContent = currentLoss.toFixed(4);
        if (accuracyElement) accuracyElement.textContent = (calculateAccuracy() * 100).toFixed(1) + '%';
        if (testAccuracyElement) {
            const testAcc = calculateTestAccuracy();
            testAccuracyElement.textContent = (testAcc * 100).toFixed(1) + '%';
        }
        updateWeightDisplay();
        drawCanvas();

        isTraining = false;
        if (trainBtn) {
            trainBtn.textContent = 'Train Model';
            trainBtn.disabled = false;
        }
    }

    // Compute gradients using backpropagation
    function computeGradients() {
        const numHidden = hiddenUnits;
        const gradients = {
            W1: Array(2).fill(0).map(() => Array(numHidden).fill(0)),
            b1: Array(numHidden).fill(0),
            W2: Array(numHidden).fill(0),
            b2: 0
        };

        for (const point of data) {
            const { x1, x2, y } = point;
            const inputs = [x1, x2];
            
            // Forward pass
            const forward = forwardPass(inputs);
            const { hiddenActivations, output } = forward;
            
            // Backward pass
            const outputError = output - y;
            
            // Output layer gradients
            for (let i = 0; i < numHidden; i++) {
                gradients.W2[i] += outputError * hiddenActivations[i];
            }
            gradients.b2 += outputError;
            
            // Hidden layer gradients
            for (let i = 0; i < numHidden; i++) {
                const hiddenError = outputError * weights.W2[i] * reluDerivative(hiddenActivations[i]);
                
                for (let j = 0; j < 2; j++) {
                    gradients.W1[j][i] += hiddenError * inputs[j];
                }
                gradients.b1[i] += hiddenError;
            }
        }
        
        // Average gradients and add regularization
        const n = data.length;
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < numHidden; j++) {
                gradients.W1[i][j] = gradients.W1[i][j] / n + regularization * weights.W1[i][j];
            }
        }
        
        for (let i = 0; i < numHidden; i++) {
            gradients.b1[i] /= n;
            gradients.W2[i] = gradients.W2[i] / n + regularization * weights.W2[i];
        }
        gradients.b2 /= n;
        
        return gradients;
    }

    // Update weights using computed gradients
    function updateWeights(gradients) {
        const numHidden = hiddenUnits;
        
        // Update W1
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < numHidden; j++) {
                weights.W1[i][j] -= learningRate * gradients.W1[i][j];
            }
        }
        
        // Update b1
        for (let i = 0; i < numHidden; i++) {
            weights.b1[i] -= learningRate * gradients.b1[i];
        }
        
        // Update W2
        for (let i = 0; i < numHidden; i++) {
            weights.W2[i] -= learningRate * gradients.W2[i];
        }
        
        // Update b2
        weights.b2 -= learningRate * gradients.b2;
    }

    // Forward pass through the network
    function forwardPass(inputs) {
        const numHidden = hiddenUnits;
        
        // Hidden layer computation: z1 = W1^T * x + b1
        const hiddenPreActivations = Array(numHidden).fill(0);
        for (let i = 0; i < numHidden; i++) {
            hiddenPreActivations[i] = weights.b1[i];
            for (let j = 0; j < 2; j++) {
                hiddenPreActivations[i] += weights.W1[j][i] * inputs[j];
            }
        }
        
        // Apply ReLU activation: a1 = ReLU(z1)
        const hiddenActivations = hiddenPreActivations.map(z => relu(z));
        
        // Output layer computation: z2 = W2^T * a1 + b2
        let outputPreActivation = weights.b2;
        for (let i = 0; i < numHidden; i++) {
            outputPreActivation += weights.W2[i] * hiddenActivations[i];
        }
        
        // Apply sigmoid activation: y = σ(z2)
        const output = sigmoid(outputPreActivation);
        
        return {
            hiddenPreActivations,
            hiddenActivations,
            outputPreActivation,
            output
        };
    }

    // ReLU activation function
    function relu(x) {
        return Math.max(0, x);
    }

    // ReLU derivative
    function reluDerivative(x) {
        return x > 0 ? 1 : 0;
    }

    // Sigmoid function
    function sigmoid(z) {
        if (z < -20) return 0;
        if (z > 20) return 1;
        return 1 / (1 + Math.exp(-z));
    }

    // Predict probability for a single data point
    function predict(x1, x2) {
        const inputs = [x1, x2];
        const forward = forwardPass(inputs);
        return forward.output;
    }

    // Calculate accuracy on training data
    function calculateAccuracy() {
        let correct = 0;
        
        for (const point of data) {
            const { x1, x2, y } = point;
            const prediction = predict(x1, x2);
            const predictedClass = prediction >= 0.5 ? 1 : 0;
            
            if (predictedClass === y) {
                correct++;
            }
        }
        
        return data.length > 0 ? correct / data.length : 0;
    }

    // Calculate test accuracy
    function calculateTestAccuracy() {
        let correct = 0;
        
        for (const point of testData) {
            const { x1, x2, y } = point;
            const prediction = predict(x1, x2);
            const predictedClass = prediction >= 0.5 ? 1 : 0;
            
            if (predictedClass === y) {
                correct++;
            }
        }
        
        return testData.length > 0 ? correct / testData.length : 0;
    }

    // Calculate binary cross-entropy loss
    function calculateLoss() {
        let loss = 0;
        
        for (const point of data) {
            const { x1, x2, y } = point;
            const prediction = predict(x1, x2);
            
            // Binary cross-entropy loss
            const eps = 1e-15;
            const safeP = Math.min(Math.max(prediction, eps), 1 - eps);
            loss += -y * Math.log(safeP) - (1 - y) * Math.log(1 - safeP);
        }
        
        // Add L2 regularization term
        let regularizationTerm = 0;
        
        // Regularize W1
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < hiddenUnits; j++) {
                regularizationTerm += weights.W1[i][j] * weights.W1[i][j];
            }
        }
        
        // Regularize W2
        for (let i = 0; i < hiddenUnits; i++) {
            regularizationTerm += weights.W2[i] * weights.W2[i];
        }
        
        loss = loss / data.length + (regularization / 2) * regularizationTerm;
        return loss;
    }

    // Update weight display
    function updateWeightDisplay() {
        if (!weightValuesContainer) return;
        
        weightValuesContainer.innerHTML = '';
        
        // Hidden layer weights
        const hiddenSection = document.createElement('div');
        hiddenSection.className = 'weight-section';
        hiddenSection.innerHTML = '<h4>Hidden Layer (W₁, b₁):</h4>';
        
        for (let i = 0; i < hiddenUnits; i++) {
            const neuronDiv = document.createElement('div');
            neuronDiv.className = 'neuron-weights';
            neuronDiv.innerHTML = `
                <div class="weight-item">
                    <span class="weight-label">h${i+1} ← x₁:</span>
                    <span class="weight-value">${weights.W1[0][i].toFixed(3)}</span>
                </div>
                <div class="weight-item">
                    <span class="weight-label">h${i+1} ← x₂:</span>
                    <span class="weight-value">${weights.W1[1][i].toFixed(3)}</span>
                </div>
                <div class="weight-item">
                    <span class="weight-label">h${i+1} bias:</span>
                    <span class="weight-value">${weights.b1[i].toFixed(3)}</span>
                </div>
            `;
            hiddenSection.appendChild(neuronDiv);
        }
        
        // Output layer weights
        const outputSection = document.createElement('div');
        outputSection.className = 'weight-section';
        outputSection.innerHTML = '<h4>Output Layer (W₂, b₂):</h4>';
        
        for (let i = 0; i < hiddenUnits; i++) {
            const weightItem = document.createElement('div');
            weightItem.className = 'weight-item';
            weightItem.innerHTML = `
                <span class="weight-label">y ← h${i+1}:</span>
                <span class="weight-value">${weights.W2[i].toFixed(3)}</span>
            `;
            outputSection.appendChild(weightItem);
        }
        
        const biasItem = document.createElement('div');
        biasItem.className = 'weight-item';
        biasItem.innerHTML = `
            <span class="weight-label">y bias:</span>
            <span class="weight-value">${weights.b2.toFixed(3)}</span>
        `;
        outputSection.appendChild(biasItem);
        
        weightValuesContainer.appendChild(hiddenSection);
        weightValuesContainer.appendChild(outputSection);
    }

    // Draw decision boundary
    function drawDecisionBoundary(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        
        // For neural networks, we need to sample the decision boundary
        const points = [];
        const resolution = 100;
        
        for (let i = 0; i <= resolution; i++) {
            for (let j = 0; j <= resolution; j++) {
                const x1 = xRange.min + (i / resolution) * (xRange.max - xRange.min);
                const x2 = yRange.min + (j / resolution) * (yRange.max - yRange.min);
                const prob = predict(x1, x2);
                
                if (Math.abs(prob - 0.5) < 0.02) { // Near decision boundary
                    const canvasX = plotMargin + (x1 - xRange.min) * xScale;
                    const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
                    points.push({ x: canvasX, y: canvasY });
                }
            }
        }
        
        // Draw boundary points
        ctx.fillStyle = '#2ecc71';
        for (const point of points) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Draw data points
    function drawDataPoints(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // Draw training data points
        for (const point of data) {
            const { x1, x2, y } = point;
            
            const canvasX = plotMargin + (x1 - xRange.min) * xScale;
            const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
            
            ctx.fillStyle = y === 1 ? '#e74c3c' : '#3498db';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        
        // Draw test data points
        for (const point of testData) {
            const { x1, x2, y } = point;
            
            const canvasX = plotMargin + (x1 - xRange.min) * xScale;
            const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
            
            ctx.fillStyle = y === 1 ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.rect(canvasX - 4, canvasY - 4, 8, 8);
            ctx.fill();
            ctx.stroke();
        }
        
        // Draw demo point if in demo mode
        if (isDemoMode) {
            const canvasX = plotMargin + (demoPoint.x1 - xRange.min) * xScale;
            const canvasY = canvasHeight - plotMargin - (demoPoint.x2 - yRange.min) * yScale;
            
            // Draw larger, highlighted demo point
            ctx.fillStyle = '#9b59b6';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Draw coordinates label
            ctx.fillStyle = '#9b59b6';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`(${demoPoint.x1.toFixed(2)}, ${demoPoint.x2.toFixed(2)})`, canvasX, canvasY - 15);
        }
    }

    // Draw the canvas
    function drawCanvas() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const xRange = calculateXRange();
        const yRange = calculateYRange();
        
        drawAxes(xRange, yRange);
        
        if (weights.W1.length > 0) {
            drawProbabilityContours(xRange, yRange);
            drawDecisionBoundary(xRange, yRange);
        }
        
        drawDataPoints(xRange, yRange);
        
        // Draw demo mode overlay if active
        if (isDemoMode) {
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(plotMargin - 2, plotMargin - 2, plotWidth + 4, plotHeight + 4);
            ctx.setLineDash([]);
            
            // Add instruction text
            ctx.fillStyle = '#9b59b6';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('DEMO MODE - Click to select a point', canvasWidth / 2, 30);
        }
    }

    // Calculate X range for display
    function calculateXRange() {
        const allPoints = [...data, ...testData];
        const xValues = allPoints.map(point => point.x1);
        const min = Math.min(...xValues);
        const max = Math.max(...xValues);
        
        const padding = Math.max((max - min) * 0.1, 0.1);
        return { min: min - padding, max: max + padding };
    }

    // Calculate Y range for display
    function calculateYRange() {
        const allPoints = [...data, ...testData];
        const yValues = allPoints.map(point => point.x2);
        const min = Math.min(...yValues);
        const max = Math.max(...yValues);
        
        const padding = Math.max((max - min) * 0.1, 0.1);
        return { min: min - padding, max: max + padding };
    }

    // Draw probability contours
    function drawProbabilityContours(xRange, yRange) {
        const contourCanvas = document.createElement('canvas');
        contourCanvas.width = plotWidth;
        contourCanvas.height = plotHeight;
        const contourCtx = contourCanvas.getContext('2d');
        
        const imageData = contourCtx.createImageData(plotWidth, plotHeight);
        
        for (let i = 0; i < plotWidth; i++) {
            for (let j = 0; j < plotHeight; j++) {
                const x1 = xRange.min + (i / plotWidth) * (xRange.max - xRange.min);
                const x2 = yRange.max - (j / plotHeight) * (yRange.max - yRange.min);
                const probability = predict(x1, x2);
                const pixelIndex = (j * plotWidth + i) * 4;
                
                if (probability < 0.5) {
                    imageData.data[pixelIndex] = 52;
                    imageData.data[pixelIndex + 1] = 152;
                    imageData.data[pixelIndex + 2] = 219;
                    imageData.data[pixelIndex + 3] = Math.round(255 * (0.5 - probability) * 0.5);
                } else {
                    imageData.data[pixelIndex] = 231;
                    imageData.data[pixelIndex + 1] = 76;
                    imageData.data[pixelIndex + 2] = 60;
                    imageData.data[pixelIndex + 3] = Math.round(255 * (probability - 0.5) * 0.5);
                }
            }
        }
        
        contourCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(
            contourCanvas,
            0, 0, plotWidth, plotHeight,
            plotMargin, plotMargin, plotWidth, plotHeight
        );
    }

    // Handle window resize
    function handleResize() {
        const parent = canvas.parentElement;
        const width = parent.clientWidth;
        const ratio = canvasHeight / canvasWidth;
        
        canvas.style.width = width + 'px';
        canvas.style.height = (width * ratio) + 'px';
        
        drawCanvas();
    }

    // Handle parameter changes
    function handleRegularizationChange() {
        regularization = Math.pow(10, parseFloat(regInput.value));
        regDisplay.textContent = `λ = ${regularization.toFixed(regularization < 0.01 ? 4 : regularization < 0.1 ? 3 : regularization < 1 ? 2 : 1)}`;
    }

    function handleLearningRateChange() {
        learningRate = Math.pow(10, parseFloat(learningRateInput.value));
        learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 1);
    }

    function handleIterationsChange() {
        maxIterations = parseInt(iterationsInput.value);
        iterationsDisplay.textContent = maxIterations.toString();
    }

    function handleHiddenUnitsChange() {
        hiddenUnits = parseInt(hiddenUnitsInput.value);
        hiddenUnitsDisplay.textContent = hiddenUnits.toString();
        initializeWeights(); // Reinitialize weights when architecture changes
        updateWeightDisplay();
        drawCanvas();
        drawNetworkGraph();
        showForwardPassSteps();
    }

    // Create HTML structure
    container.innerHTML = `
        <div class="visualizer-container">
            <div class="visualizer-layout">
                <div class="canvas-container">
                    <div class="instruction">Neural Network Classification (Input → Hidden → Output)</div>
                    <div id="canvas-wrapper">
                        <canvas id="neural-network-canvas" width="800" height="500"></canvas>
                    </div>
                    <div class="legend">
                        <div class="legend-item"><span class="legend-color class0"></span> Train Class 0</div>
                        <div class="legend-item"><span class="legend-color class1"></span> Train Class 1</div>
                        <div class="legend-item"><span class="legend-color test-class0"></span> Test Class 0</div>
                        <div class="legend-item"><span class="legend-color test-class1"></span> Test Class 1</div>
                        <div class="legend-item"><span class="legend-color boundary"></span> Decision Boundary</div>
                        <div class="legend-item"><span class="legend-color probability"></span> Probability Contours</div>
                    </div>

                    <div class="btn-container">
                        <button id="train-btn" class="primary-btn">Train Model</button>
                        <button id="generate-btn" class="secondary-btn">Generate New Data</button>
                    </div>
                </div>

                <div class="network-visualization">
                    <h3>Network Architecture & Forward Pass</h3>
                    <div class="demo-controls">
                        <button id="demo-point-btn" class="demo-btn">Demo Point</button>
                        <span id="demo-coordinates">Click to select a point</span>
                    </div>
                    <div id="network-graph-container">
                        <canvas id="network-graph" width="600" height="300"></canvas>
                    </div>
                    <div id="computation-steps"></div>
                </div>

                <div class="controls-panel">
                    <div class="control-group">
                        <label for="hidden-units">Hidden Units:</label>
                        <input type="range" id="hidden-units" min="2" max="10" step="1" value="4" class="full-width">
                        <span id="hidden-units-display">4</span>
                    </div>

                    <div class="control-group">
                        <label for="regularization">Regularization (λ):</label>
                        <input type="range" id="regularization" min="-3" max="2" step="0.1" value="-2" class="full-width">
                        <span id="regularization-display">λ = 0.01</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="learning-rate">Learning Rate:</label>
                        <input type="range" id="learning-rate" min="-3" max="0" step="0.1" value="-1" class="full-width">
                        <span id="learning-rate-display">0.1</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="iterations">Max Iterations:</label>
                        <input type="range" id="iterations" min="10" max="1000" step="10" value="200" class="full-width">
                        <span id="iterations-display">200</span>
                    </div>
                    
                    <div class="results-box">
                        <h3>Model Performance:</h3>
                        <div class="result-row">
                            <div class="result-label">Accuracy:</div>
                            <div class="result-value" id="accuracy">0.0%</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Loss:</div>
                            <div class="result-value" id="loss">0.000</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Test Accuracy:</div>
                            <div class="result-value" id="test-accuracy">0.0%</div>
                        </div>
                    </div>
                    
                    <div class="weight-visualization">
                        <h3>Network Weights:</h3>
                        <div id="weight-values-container"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .visualizer-container {
            font-family: Arial, sans-serif;
            margin-bottom: 20px;
        }
        
        .visualizer-layout {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        @media (min-width: 992px) {
            .visualizer-layout {
                flex-direction: row;
            }
            
            .canvas-container {
                flex: 3;
                order: 1;
            }
            
            .controls-panel {
                flex: 2;
                order: 2;
            }
        }
        
        .canvas-container {
            display: flex;
            flex-direction: column;
        }
        
        #canvas-wrapper {
            position: relative;
            width: 100%;
        }
        
        #neural-network-canvas {
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
            max-width: 100%;
            height: auto;
            display: block;
        }
        
        .controls-panel {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .control-group {
            margin-bottom: 15px;
        }
        
        .control-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .full-width {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .instruction {
            text-align: center;
            margin-bottom: 10px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .legend {
            margin-top: 10px;
            display: flex;
            gap: 15px;
            font-size: 0.9rem;
            color: #666;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
        }
        
        .legend-color {
            display: inline-block;
            width: 12px;
            height: 12px;
            margin-right: 5px;
            border-radius: 2px;
        }

        .legend-color.test-class0 {
            background-color: rgba(52, 152, 219, 0.5);
        }

        .legend-color.test-class1 {
            background-color: rgba(231, 76, 60, 0.5);
        }
        
        .legend-color.class0 {
            background-color: #3498db;
        }
        
        .legend-color.class1 {
            background-color: #e74c3c;
        }
        
        .legend-color.boundary {
            background-color: #2ecc71;
        }
        
        .legend-color.probability {
            background: linear-gradient(90deg, rgba(41, 128, 185, 0.3), rgba(231, 76, 60, 0.3));
        }
        
        .primary-btn, .secondary-btn {
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 15px;
            font-size: 1rem;
            cursor: pointer;
            width: 100%;
            margin-bottom: 10px;
        }
        
        .primary-btn {
            background-color: #3498db;
        }
        
        .primary-btn:hover {
            background-color: #2980b9;
        }
        
        .secondary-btn {
            background-color: #95a5a6;
        }
        
        .secondary-btn:hover {
            background-color: #7f8c8d;
        }
        
        .results-box {
            background-color: #f0f7ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .results-box h3, .weight-visualization h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1rem;
        }
        
        .result-row {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 5px;
        }
        
        .result-label {
            font-weight: bold;
            flex-basis: 40%;
        }
        
        .result-value {
            font-family: monospace;
            flex-basis: 60%;
        }
        
        .weight-visualization {
            margin-bottom: 20px;
        }
        
        #weight-values-container {
            font-family: monospace;
            font-size: 0.8rem;
        }
        
        .weight-section {
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 4px;
        }
        
        .weight-section h4 {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            color: #333;
        }
        
        .neuron-weights {
            margin-bottom: 8px;
            padding: 8px;
            background-color: white;
            border-radius: 3px;
            border-left: 3px solid #3498db;
        }
        
        .weight-item {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
        }
        
        .weight-label {
            font-weight: bold;
        }
        
        .weight-value {
            text-align: right;
        }
        
        .btn-container {
            margin-bottom: 20px;
        }
        
        .network-visualization {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .network-visualization h3 {
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.1rem;
            color: #333;
        }
        
        .demo-controls {
            margin-bottom: 15px;
            text-align: center;
        }
        
        .demo-btn {
            background-color: #9b59b6;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            margin-right: 10px;
        }
        
        .demo-btn:hover {
            background-color: #8e44ad;
        }
        
        #demo-coordinates {
            font-family: monospace;
            font-size: 0.9rem;
            color: #666;
        }
        
        #network-graph-container {
            text-align: center;
            margin-bottom: 15px;
        }
        
        #network-graph {
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
            max-width: 100%;
            height: auto;
        }
        
        #computation-steps {
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-family: monospace;
            font-size: 0.85rem;
            line-height: 1.4;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .step-section {
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f9f9f9;
            border-left: 4px solid #3498db;
            border-radius: 0 4px 4px 0;
        }
        
        .step-title {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
            font-size: 0.9rem;
        }
        
        .step-computation {
            color: #34495e;
            margin: 4px 0;
        }
        
        .step-result {
            color: #27ae60;
            font-weight: bold;
            margin: 4px 0;
        }
        
        .neuron-active {
            background-color: #e8f5e8 !important;
            border-color: #27ae60 !important;
        }
        
        .neuron-inactive {
            background-color: #fdf2f2 !important;
            border-color: #e74c3c !important;
        }
    `;

    document.head.appendChild(styleElement);
    
    // Get DOM elements
    const canvas = document.getElementById('neural-network-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Network graph elements
    const networkCanvas = document.getElementById('network-graph');
    const networkCtx = networkCanvas.getContext('2d');
    const networkCanvasWidth = networkCanvas.width;
    const networkCanvasHeight = networkCanvas.height;
    
    // Control elements
    const hiddenUnitsInput = document.getElementById('hidden-units');
    const hiddenUnitsDisplay = document.getElementById('hidden-units-display');
    const regInput = document.getElementById('regularization');
    const regDisplay = document.getElementById('regularization-display');
    const learningRateInput = document.getElementById('learning-rate');
    const learningRateDisplay = document.getElementById('learning-rate-display');
    const iterationsInput = document.getElementById('iterations');
    const iterationsDisplay = document.getElementById('iterations-display');
    const trainBtn = document.getElementById('train-btn');
    const generateBtn = document.getElementById('generate-btn');
    const demoPointBtn = document.getElementById('demo-point-btn');
    const demoCoordinates = document.getElementById('demo-coordinates');
    const computationSteps = document.getElementById('computation-steps');

    // Results elements 
    const accuracyElement = document.getElementById('accuracy');
    const testAccuracyElement = document.getElementById('test-accuracy');
    const lossElement = document.getElementById('loss');
    const weightValuesContainer = document.getElementById('weight-values-container');
        
    // State variables
    let data = []; // Training data
    let testData = []; // Test data
    let weights = { W1: [], b1: [], W2: [], b2: 0 }; // Network weights
    let hiddenUnits = 4;
    let regularization = 0.01;
    let learningRate = 0.1;
    let maxIterations = 200;
    let isTraining = false;
    let demoPoint = { x1: 0.5, x2: 0.3 }; // Demo point for forward pass visualization
    let isDemoMode = false;
    
    // Drawing settings
    const plotMargin = 50;
    const plotWidth = canvasWidth - 2 * plotMargin;
    const plotHeight = canvasHeight - 2 * plotMargin;
    
    // Initialize values from inputs
    hiddenUnits = parseInt(hiddenUnitsInput.value);
    hiddenUnitsDisplay.textContent = hiddenUnits.toString();
    regularization = Math.pow(10, parseFloat(regInput.value));
    regDisplay.textContent = `λ = ${regularization.toFixed(regularization < 0.01 ? 4 : regularization < 0.1 ? 3 : regularization < 1 ? 2 : 1)}`;
    learningRate = Math.pow(10, parseFloat(learningRateInput.value));
    learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 1);
    maxIterations = parseInt(iterationsInput.value);
    iterationsDisplay.textContent = maxIterations.toString();
    
    // Add event listeners
    hiddenUnitsInput.addEventListener('input', handleHiddenUnitsChange);
    regInput.addEventListener('input', handleRegularizationChange);
    learningRateInput.addEventListener('input', handleLearningRateChange);
    iterationsInput.addEventListener('input', handleIterationsChange);
    trainBtn.addEventListener('click', trainModel);
    generateBtn.addEventListener('click', generateData);
    demoPointBtn.addEventListener('click', handleDemoPoint);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', handleResize);

    // Handle canvas click for demo point selection
    function handleCanvasClick(event) {
        if (!isDemoMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const canvasX = (event.clientX - rect.left) * scaleX;
        const canvasY = (event.clientY - rect.top) * scaleY;
        
        // Check if click is within the plot area
        if (canvasX < plotMargin || canvasX > canvasWidth - plotMargin || 
            canvasY < plotMargin || canvasY > canvasHeight - plotMargin) {
            return; // Click outside plot area
        }
        
        // Convert canvas coordinates to data coordinates
        const xRange = calculateXRange();
        const yRange = calculateYRange();
        
        const x1 = xRange.min + ((canvasX - plotMargin) / plotWidth) * (xRange.max - xRange.min);
        const x2 = yRange.max - ((canvasY - plotMargin) / plotHeight) * (yRange.max - yRange.min);
        
        // Update demo point
        demoPoint = { x1, x2 };
        demoCoordinates.textContent = `Demo Point: (${x1.toFixed(2)}, ${x2.toFixed(2)})`;
        
        // Update visualizations
        drawCanvas();
        
        // Small delay to ensure canvas is updated before network graph
        setTimeout(() => {
            drawNetworkGraph();
            showForwardPassSteps();
        }, 10);
    }

    // Handle demo point button
    function handleDemoPoint() {
        isDemoMode = !isDemoMode;
        if (isDemoMode) {
            demoPointBtn.textContent = 'Exit Demo';
            demoPointBtn.style.backgroundColor = '#e74c3c';
            demoCoordinates.textContent = 'Click on the plot to select a demo point';
            canvas.style.cursor = 'crosshair';
        } else {
            demoPointBtn.textContent = 'Demo Point';
            demoPointBtn.style.backgroundColor = '#9b59b6';
            demoCoordinates.textContent = 'Click to select a point';
            canvas.style.cursor = 'default';
        }
        drawCanvas();
        drawNetworkGraph();
        showForwardPassSteps();
    }

    // Draw network graph visualization
    function drawNetworkGraph() {
        networkCtx.clearRect(0, 0, networkCanvasWidth, networkCanvasHeight);
        
        // Check if weights are properly initialized
        const weightsValid = weights.W1 && 
                           Array.isArray(weights.W1) && 
                           weights.W1.length > 0 && 
                           Array.isArray(weights.W1[0]) &&
                           weights.W2 && 
                           Array.isArray(weights.W2) && 
                           weights.W2.length > 0;
        
        if (!weightsValid) {
            // Draw placeholder message
            networkCtx.fillStyle = '#7f8c8d';
            networkCtx.font = '16px Arial';
            networkCtx.textAlign = 'center';
            networkCtx.fillText('Generate data to see network architecture', networkCanvasWidth / 2, networkCanvasHeight / 2);
            return;
        }
        
        const layerSpacing = networkCanvasWidth / 4;
        const inputX = layerSpacing;
        const hiddenX = layerSpacing * 2;
        const outputX = layerSpacing * 3;
        
        // Calculate neuron positions
        const inputPositions = [
            { x: inputX, y: networkCanvasHeight * 0.3, label: 'x₁', value: demoPoint.x1 },
            { x: inputX, y: networkCanvasHeight * 0.7, label: 'x₂', value: demoPoint.x2 }
        ];
        
        const hiddenPositions = [];
        for (let i = 0; i < hiddenUnits; i++) {
            const y = networkCanvasHeight * (0.1 + 0.8 * i / Math.max(hiddenUnits - 1, 1));
            hiddenPositions.push({ 
                x: hiddenX, 
                y: y, 
                label: `h${i+1}`,
                value: 0 // Will be calculated during forward pass
            });
        }
        
        const outputPosition = { 
            x: outputX, 
            y: networkCanvasHeight * 0.5, 
            label: 'y',
            value: 0 // Will be calculated during forward pass
        };
        
        // Calculate forward pass values for demo point
        try {
            const forward = forwardPass([demoPoint.x1, demoPoint.x2]);
            
            // Update hidden layer values
            for (let i = 0; i < hiddenUnits && i < forward.hiddenActivations.length; i++) {
                hiddenPositions[i].value = forward.hiddenActivations[i];
            }
            outputPosition.value = forward.output;
        } catch (e) {
            console.warn('Error in forward pass:', e);
            // Use default values of 0
        }
        
        // Draw connections with weights
        drawConnections(inputPositions, hiddenPositions, weights.W1, 'input-hidden');
        drawConnections(hiddenPositions, [outputPosition], weights.W2, 'hidden-output');
        
        // Draw neurons
        drawNeurons(inputPositions, 'input');
        drawNeurons(hiddenPositions, 'hidden');
        drawNeurons([outputPosition], 'output');
        
        // Draw layer labels
        drawLayerLabels();
    }

    // Draw connections between layers
    function drawConnections(fromLayer, toLayer, weightMatrix, connectionType) {
        // Safety check for weight matrix
        if (!weightMatrix || (Array.isArray(weightMatrix) && weightMatrix.length === 0)) {
            return;
        }
        
        // Handle different weight matrix structures
        let allWeights = [];
        try {
            if (connectionType === 'input-hidden') {
                // weightMatrix is 2D array: weights.W1[input][hidden]
                if (!Array.isArray(weightMatrix) || !Array.isArray(weightMatrix[0])) {
                    return;
                }
                allWeights = weightMatrix.flat();
            } else {
                // weightMatrix is 1D array: weights.W2[hidden]
                if (!Array.isArray(weightMatrix)) {
                    return;
                }
                allWeights = weightMatrix;
            }
        } catch (e) {
            console.warn('Error processing weight matrix:', e);
            return;
        }
        
        const maxWeight = Math.max(...allWeights.map(w => Math.abs(w || 0)));
        
        for (let i = 0; i < fromLayer.length; i++) {
            for (let j = 0; j < toLayer.length; j++) {
                let weight;
                try {
                    if (connectionType === 'input-hidden') {
                        weight = weightMatrix[i] && weightMatrix[i][j] !== undefined ? weightMatrix[i][j] : 0;
                    } else {
                        weight = weightMatrix[j] !== undefined ? weightMatrix[j] : 0;
                    }
                } catch (e) {
                    weight = 0;
                }
                
                // Ensure weight is a number
                if (typeof weight !== 'number' || isNaN(weight)) {
                    weight = 0;
                }
                
                const normalizedWeight = maxWeight > 0 ? weight / maxWeight : 0;
                
                // Color and thickness based on weight
                const opacity = Math.min(Math.abs(normalizedWeight), 1);
                const color = weight >= 0 ? `rgba(46, 204, 113, ${opacity + 0.2})` : `rgba(231, 76, 60, ${opacity + 0.2})`;
                const thickness = Math.max(1, Math.abs(normalizedWeight) * 3);
                
                networkCtx.strokeStyle = color;
                networkCtx.lineWidth = thickness;
                
                networkCtx.beginPath();
                networkCtx.moveTo(fromLayer[i].x + 15, fromLayer[i].y);
                networkCtx.lineTo(toLayer[j].x - 15, toLayer[j].y);
                networkCtx.stroke();
                
                // Draw weight label
                const midX = (fromLayer[i].x + toLayer[j].x) / 2;
                const midY = (fromLayer[i].y + toLayer[j].y) / 2;
                
                networkCtx.fillStyle = '#333';
                networkCtx.font = '10px monospace';
                networkCtx.textAlign = 'center';
                networkCtx.fillText(weight.toFixed(2), midX, midY - 2);
            }
        }
    }

    // Draw neurons
    function drawNeurons(positions, layerType) {
        for (const pos of positions) {
            // Determine neuron color based on activation
            let fillColor = '#ecf0f1';
            let strokeColor = '#bdc3c7';
            
            if (layerType === 'hidden') {
                const activation = pos.value;
                if (activation > 0.1) {
                    fillColor = '#e8f5e8';
                    strokeColor = '#27ae60';
                } else {
                    fillColor = '#fdf2f2';
                    strokeColor = '#e74c3c';
                }
            } else if (layerType === 'output') {
                const prob = pos.value;
                if (prob > 0.5) {
                    fillColor = '#ffe8e8';
                    strokeColor = '#e74c3c';
                } else {
                    fillColor = '#e8f4f8';
                    strokeColor = '#3498db';
                }
            }
            
            // Draw neuron circle
            networkCtx.fillStyle = fillColor;
            networkCtx.strokeStyle = strokeColor;
            networkCtx.lineWidth = 2;
            
            networkCtx.beginPath();
            networkCtx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
            networkCtx.fill();
            networkCtx.stroke();
            
            // Draw neuron label
            networkCtx.fillStyle = '#2c3e50';
            networkCtx.font = 'bold 12px Arial';
            networkCtx.textAlign = 'center';
            networkCtx.fillText(pos.label, pos.x, pos.y + 4);
            
            // Draw activation value below neuron
            networkCtx.fillStyle = '#7f8c8d';
            networkCtx.font = '10px monospace';
            networkCtx.fillText(pos.value.toFixed(3), pos.x, pos.y + 30);
        }
    }

    // Draw layer labels
    function drawLayerLabels() {
        networkCtx.fillStyle = '#34495e';
        networkCtx.font = 'bold 14px Arial';
        networkCtx.textAlign = 'center';
        
        const layerSpacing = networkCanvasWidth / 4;
        
        networkCtx.fillText('Input Layer', layerSpacing, 25);
        networkCtx.fillText('Hidden Layer', layerSpacing * 2, 25);
        networkCtx.fillText('(ReLU)', layerSpacing * 2, 40);
        networkCtx.fillText('Output Layer', layerSpacing * 3, 25);
        networkCtx.fillText('(Sigmoid)', layerSpacing * 3, 40);
    }

    // Show detailed forward pass computation steps
    function showForwardPassSteps() {
        if (!weights.W1 || weights.W1.length === 0 || !weights.W2 || weights.W2.length === 0) {
            computationSteps.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Generate data and train the model to see forward pass steps.</p>';
            return;
        }
        
        const forward = forwardPass([demoPoint.x1, demoPoint.x2]);
        let html = '';
        
        // Input layer
        html += `
            <div class="step-section">
                <div class="step-title">1. Input Layer</div>
                <div class="step-computation">x₁ = ${demoPoint.x1.toFixed(3)}</div>
                <div class="step-computation">x₂ = ${demoPoint.x2.toFixed(3)}</div>
            </div>
        `;
        
        // Hidden layer computation
        html += `
            <div class="step-section">
                <div class="step-title">2. Hidden Layer (Linear Transformation)</div>
        `;
        
        for (let i = 0; i < hiddenUnits; i++) {
            const z = weights.b1[i] + weights.W1[0][i] * demoPoint.x1 + weights.W1[1][i] * demoPoint.x2;
            html += `
                <div class="step-computation">
                    z${i+1} = b${i+1} + w₁₍${i+1}₎×x₁ + w₂₍${i+1}₎×x₂
                </div>
                <div class="step-computation">
                    z${i+1} = ${weights.b1[i].toFixed(3)} + ${weights.W1[0][i].toFixed(3)}×${demoPoint.x1.toFixed(3)} + ${weights.W1[1][i].toFixed(3)}×${demoPoint.x2.toFixed(3)}
                </div>
                <div class="step-result">z${i+1} = ${z.toFixed(3)}</div>
            `;
        }
        
        html += '</div>';
        
        // ReLU activation
        html += `
            <div class="step-section">
                <div class="step-title">3. Hidden Layer (ReLU Activation)</div>
        `;
        
        for (let i = 0; i < hiddenUnits; i++) {
            const z = forward.hiddenPreActivations[i];
            const a = forward.hiddenActivations[i];
            html += `
                <div class="step-computation">h${i+1} = ReLU(z${i+1}) = max(0, ${z.toFixed(3)})</div>
                <div class="step-result">h${i+1} = ${a.toFixed(3)}</div>
            `;
        }
        
        html += '</div>';
        
        // Output layer
        html += `
            <div class="step-section">
                <div class="step-title">4. Output Layer (Linear Transformation)</div>
                <div class="step-computation">z_out = b_out + Σ(w_out[i] × h[i])</div>
                <div class="step-computation">z_out = ${weights.b2.toFixed(3)} + `;
        
        for (let i = 0; i < hiddenUnits; i++) {
            if (i > 0) html += ' + ';
            html += `${weights.W2[i].toFixed(3)}×${forward.hiddenActivations[i].toFixed(3)}`;
        }
        
        html += `</div><div class="step-result">z_out = ${forward.outputPreActivation.toFixed(3)}</div>`;
        html += '</div>';
        
        // Sigmoid activation
        html += `
            <div class="step-section">
                <div class="step-title">5. Output Layer (Sigmoid Activation)</div>
                <div class="step-computation">y = σ(z_out) = 1 / (1 + e^(-z_out))</div>
                <div class="step-computation">y = 1 / (1 + e^(-${forward.outputPreActivation.toFixed(3)}))</div>
                <div class="step-result">y = ${forward.output.toFixed(3)}</div>
                <div class="step-result">Predicted Class: ${forward.output >= 0.5 ? '1' : '0'} (${(forward.output * 100).toFixed(1)}% confidence)</div>
            </div>
        `;
        
        computationSteps.innerHTML = html;
    }

    // Generate dataset
    function generateData() {
        const numPoints = 100;
        const trainSize = 70;
        const allPoints = [];
        
        // Generate data with non-linear separation (XOR-like or circular pattern)
        const pattern = Math.random() > 0.5 ? 'xor' : 'circle';
        
        for (let i = 0; i < numPoints; i++) {
            const x1 = Math.random() * 2 - 1; // Range: -1 to 1
            const x2 = Math.random() * 2 - 1; // Range: -1 to 1
            
            let y;
            if (pattern === 'xor') {
                // XOR-like pattern
                y = (x1 > 0) ^ (x2 > 0) ? 1 : 0;
                // Add some noise to make it more realistic
                if (Math.random() < 0.1) y = 1 - y;
            } else {
                // Circular pattern
                const radius = Math.sqrt(x1 * x1 + x2 * x2);
                y = radius < 0.6 ? 1 : 0;
                // Add some noise
                if (Math.random() < 0.1) y = 1 - y;
            }
            
            allPoints.push({ x1, x2, y });
        }
        
        // Shuffle for random train-test split
        for (let i = allPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]];
        }
        
        // Split into training and test sets
        data = allPoints.slice(0, trainSize);
        testData = allPoints.slice(trainSize);
        
        // Initialize weights BEFORE calling any drawing functions
        initializeWeights();
        
        // Update display
        if (accuracyElement) accuracyElement.textContent = '0.0%';
        if (lossElement) lossElement.textContent = '0.000';
        if (testAccuracyElement) testAccuracyElement.textContent = '0.0%';
        
        // Now safe to call drawing functions
        drawCanvas();
        updateWeightDisplay();
        
        // Small delay to ensure weights are fully initialized
        setTimeout(() => {
            drawNetworkGraph();
            showForwardPassSteps();
        }, 10);
    }

    // Initialize weights using Xavier/Glorot initialization
    function initializeWeights() {
        const inputSize = 2;
        const outputSize = 1;
        
        // Initialize W1 (input to hidden) with Xavier initialization
        weights.W1 = Array(inputSize).fill(0).map(() => Array(hiddenUnits).fill(0));
        const w1Scale = Math.sqrt(2.0 / (inputSize + hiddenUnits));
        for (let i = 0; i < inputSize; i++) {
            for (let j = 0; j < hiddenUnits; j++) {
                weights.W1[i][j] = (Math.random() - 0.5) * 2 * w1Scale;
            }
        }
        
        // Initialize b1 (hidden bias) to small random values
        weights.b1 = Array(hiddenUnits).fill(0).map(() => (Math.random() - 0.5) * 0.01);
        
        // Initialize W2 (hidden to output) with Xavier initialization
        const w2Scale = Math.sqrt(2.0 / (hiddenUnits + outputSize));
        weights.W2 = Array(hiddenUnits).fill(0).map(() => (Math.random() - 0.5) * 2 * w2Scale);
        
        // Initialize b2 (output bias) to small random value
        weights.b2 = (Math.random() - 0.5) * 0.01;
    }

    // Draw coordinate axes
    function drawAxes(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // Draw grid lines
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        const yStep = (yRange.max - yRange.min) / 10;
        for (let y = Math.ceil(yRange.min / yStep) * yStep; y <= yRange.max; y += yStep) {
            const canvasY = canvasHeight - plotMargin - (y - yRange.min) * yScale;
            
            ctx.beginPath();
            ctx.moveTo(plotMargin, canvasY);
            ctx.lineTo(canvasWidth - plotMargin, canvasY);
            ctx.stroke();
        }
        
        // Vertical grid lines
        const xStep = (xRange.max - xRange.min) / 10;
        for (let x = Math.ceil(xRange.min / xStep) * xStep; x <= xRange.max; x += xStep) {
            const canvasX = plotMargin + (x - xRange.min) * xScale;
            
            ctx.beginPath();
            ctx.moveTo(canvasX, plotMargin);
            ctx.lineTo(canvasX, canvasHeight - plotMargin);
            ctx.stroke();
        }
        
        // Draw axes
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        
        // X-axis
        const yZeroPos = canvasHeight - plotMargin - (-yRange.min) * yScale;
        ctx.beginPath();
        ctx.moveTo(plotMargin, yZeroPos);
        ctx.lineTo(canvasWidth - plotMargin, yZeroPos);
        ctx.stroke();
        
        // Y-axis
        const xZeroPos = plotMargin + (-xRange.min) * xScale;
        ctx.beginPath();
        ctx.moveTo(xZeroPos, plotMargin);
        ctx.lineTo(xZeroPos, canvasHeight - plotMargin);
        ctx.stroke();
    }

    // Initialize the visualization
    generateData();
    handleResize();
    
    // Set initial demo coordinates display
    demoCoordinates.textContent = `Demo Point: (${demoPoint.x1.toFixed(2)}, ${demoPoint.x2.toFixed(2)})`;
    
    // Initialize network visualization
    setTimeout(() => {
        drawNetworkGraph();
        showForwardPassSteps();
    }, 50);

    generateData();
    handleResize();

});