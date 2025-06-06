// An interactive demo for logistic regression classification

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('logistic_regression_visualizer');

    if (!container) {
    console.error('Container element not found!');
    return;
    }

    // Train the model using gradient descent
    async function trainModel() {
        if (isTraining) return;
        isTraining = true;
        if (trainBtn) {
            trainBtn.textContent = 'Training...';
            trainBtn.disabled = true;
        }

        const numFeatures = 3;
        let iterations = 0;
        let previousLoss = Infinity;
        let currentLoss = calculateLoss();

        const minLossChange = 1e-6;

        while (iterations < maxIterations && Math.abs(previousLoss - currentLoss) > minLossChange) {
            previousLoss = currentLoss;
            
            // Calculate gradients
            const gradients = Array(numFeatures).fill(0);
            
            for (const point of data) {
            const { x1, x2, y } = point;
            const features = generateFeatures(x1, x2);
            const prediction = predict(x1, x2);
            const error = prediction - y;
            
            // Update gradients
            for (let i = 0; i < numFeatures; i++) {
                gradients[i] += error * features[i];
            }
            }
            
            // Apply regularization to gradients (skip bias term)
            for (let i = 1; i < numFeatures; i++) {
            gradients[i] = gradients[i] / data.length + regularization * weights[i];
            }
            
            // Update weights
            for (let i = 0; i < numFeatures; i++) {
            weights[i] -= learningRate * gradients[i];
            }
            
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

    // Calculate accuracy
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
            if (prediction > 0 && prediction < 1) {
            loss += -y * Math.log(prediction) - (1 - y) * Math.log(1 - prediction);
            } else {
            // Handle edge cases where prediction is 0 or 1
            const eps = 1e-15;
            const safeP = Math.min(Math.max(prediction, eps), 1 - eps);
            loss += -y * Math.log(safeP) - (1 - y) * Math.log(1 - safeP);
            }
        }
  
        // Add L2 regularization term
        let regularizationTerm = 0;
        for (let i = 1; i < weights.length; i++) { // Skip bias term
            regularizationTerm += weights[i] * weights[i];
        }
        
        loss = loss / data.length + (regularization / 2) * regularizationTerm;
        return loss;
    }

    // Update weight display
    function updateWeightDisplay() {
        if (!weightValuesContainer) return; // Guard clause
        
        weightValuesContainer.innerHTML = '';
        
        // Add each weight to the display
        const featureNames = ['Bias (w₀)'];
        
        // Linear terms
        featureNames.push('x₁', 'x₂');
        
        for (let i = 0; i < weights.length; i++) {
            const weightItem = document.createElement('div');
            weightItem.className = 'weight-item';
            
            const label = document.createElement('span');
            label.className = 'weight-label';
            label.textContent = featureNames[i] || `w${i}`;
            
            const value = document.createElement('span');
            value.className = 'weight-value';
            value.textContent = weights[i].toFixed(4);
            
            weightItem.appendChild(label);
            weightItem.appendChild(value);
            weightValuesContainer.appendChild(weightItem);
        }
    }
    
    // Draw decision boundary
    function drawDecisionBoundary(xRange, yRange) {
        // Calculate scale
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        
        // For linear model: w0 + w1*x1 + w2*x2 = 0
        
        if (Math.abs(weights[2]) < 1e-10) {
            // Vertical line (or no boundary if w1 is also near zero)
            if (Math.abs(weights[1]) > 1e-10) {
                const x1 = -weights[0] / weights[1];
                const canvasX = plotMargin + (x1 - xRange.min) * xScale;
                
                ctx.beginPath();
                ctx.moveTo(canvasX, plotMargin);
                ctx.lineTo(canvasX, canvasHeight - plotMargin);
                ctx.stroke();
            }
        } else {
            // Normal line
            const x1Start = xRange.min;
            const x1End = xRange.max;
            
            const x2Start = (-weights[0] - weights[1] * x1Start) / weights[2];
            const x2End = (-weights[0] - weights[1] * x1End) / weights[2];
            
            const startX = plotMargin + (x1Start - xRange.min) * xScale;
            const startY = canvasHeight - plotMargin - (x2Start - yRange.min) * yScale;
            const endX = plotMargin + (x1End - xRange.min) * xScale;
            const endY = canvasHeight - plotMargin - (x2End - yRange.min) * yScale;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }
  
  
    // Draw data points
    function drawDataPoints(xRange, yRange) {
        // Calculate scale
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // Draw training data points
        for (const point of data) {
            const { x1, x2, y } = point;
            
            const canvasX = plotMargin + (x1 - xRange.min) * xScale;
            const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
            
            // Color based on class (for training data)
            ctx.fillStyle = y === 1 ? '#e74c3c' : '#3498db';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            // Draw point as circle
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        
        // Draw test data points with different appearance
        for (const point of testData) {
            const { x1, x2, y } = point;
            
            const canvasX = plotMargin + (x1 - xRange.min) * xScale;
            const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
            
            // Color based on class (for test data - lighter colors)
            ctx.fillStyle = y === 1 ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            // Draw point as square to distinguish from training data
            ctx.beginPath();
            ctx.rect(canvasX - 4, canvasY - 4, 8, 8);
            ctx.fill();
            ctx.stroke();
        }
    }

    // Draw the canvas
    function drawCanvas() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Calculate the display range
        const xRange = calculateXRange();
        const yRange = calculateYRange();
        
        // Draw grid and axes
        drawAxes(xRange, yRange);
        
        // Draw decision boundary and probability contours
        if (weights.length > 0) {
            drawProbabilityContours(xRange, yRange); 
            drawDecisionBoundary(xRange, yRange);
        }
        
        // Draw data points
        drawDataPoints(xRange, yRange);
    }

    // Calculate X range for display
    function calculateXRange() {
        const allPoints = [...data, ...testData];
        const xValues = allPoints.map(point => point.x1);
        const min = Math.min(...xValues);
        const max = Math.max(...xValues);
        
        // Add padding
        const padding = Math.max((max - min) * 0.1, 0.1);

        return { min: min - padding, max: max + padding };
    }

    // Calculate Y range for display
    function calculateYRange() {
        const allPoints = [...data, ...testData]; 
        const yValues = allPoints.map(point => point.x2);
        const min = Math.min(...yValues);
        const max = Math.max(...yValues);
        
        // Add padding
        const padding = Math.max((max - min) * 0.1, 0.1);
        return { min: min - padding, max: max + padding };
    }

    // Draw probability contours function
    function drawProbabilityContours(xRange, yRange) {
    
        // Create canvas for contour map
        const contourCanvas = document.createElement('canvas');
        contourCanvas.width = plotWidth;
        contourCanvas.height = plotHeight;
        const contourCtx = contourCanvas.getContext('2d');
        
        // Create image data for contour map
        const imageData = contourCtx.createImageData(plotWidth, plotHeight);
        
        // Fill image data
        for (let i = 0; i < plotWidth; i++) {

            for (let j = 0; j < plotHeight; j++) {

                const x1 = xRange.min + (i / plotWidth) * (xRange.max - xRange.min);
                const x2 = yRange.max - (j / plotHeight) * (yRange.max - yRange.min);
                const probability = predict(x1, x2);
                const pixelIndex = (j * plotWidth + i) * 4;
                
                // Set pixel color based on probability
                if (probability < 0.5) {
                    // Blue for class 0
                    imageData.data[pixelIndex] = 52;
                    imageData.data[pixelIndex + 1] = 152;
                    imageData.data[pixelIndex + 2] = 219;
                    imageData.data[pixelIndex + 3] = Math.round(255 * (0.5 - probability) * 0.5);
                } else {
                    // Red for class 1
                    imageData.data[pixelIndex] = 231;
                    imageData.data[pixelIndex + 1] = 76;
                    imageData.data[pixelIndex + 2] = 60;
                    imageData.data[pixelIndex + 3] = Math.round(255 * (probability - 0.5) * 0.5);
                }
            }
        }

        // Put image data on contour canvas
        contourCtx.putImageData(imageData, 0, 0);
        
        // Draw contour canvas on main canvas
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
    
    // Handle regularization change
    function handleRegularizationChange() {
        regularization = Math.pow(10, parseFloat(regInput.value));
        regDisplay.textContent = `λ = ${regularization.toFixed(regularization < 0.01 ? 4 : regularization < 0.1 ? 3 : regularization < 1 ? 2 : 1)}`;
    }
    
    // Handle learning rate change
    function handleLearningRateChange() {
        learningRate = Math.pow(10, parseFloat(learningRateInput.value));
        learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 1);
    }
    
    // Handle iterations change
    function handleIterationsChange() {
        maxIterations = parseInt(iterationsInput.value);
        iterationsDisplay.textContent = maxIterations.toString();
    }
  
    // Create HTML structure
    container.innerHTML = `
        <div class="visualizer-container">
            <div class="visualizer-layout">
                <div class="canvas-container">
                    <div class="instruction">Logistic Regression Classification</div>
                        <div id="canvas-wrapper">
                            <canvas id="logistic-regression-canvas" width="800" height="500"></canvas>
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

                   
                    
                    <div class="controls-panel">
                    <div class="control-group">
                        <label for="regularization">Regularization (λ):</label>
                        <input type="range" id="regularization" min="-3" max="2" step="0.1" value="-1" class="full-width">
                        <span id="regularization-display">λ = 0.1</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="learning-rate">Learning Rate:</label>
                        <input type="range" id="learning-rate" min="-3" max="0" step="0.1" value="-1" class="full-width">
                        <span id="learning-rate-display">0.1</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="iterations">Max Iterations:</label>
                        <input type="range" id="iterations" min="10" max="1000" step="10" value="100" class="full-width">
                        <span id="iterations-display">100</span>
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
                        <h3>Model Coefficients:</h3>
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
        
        #logistic-regression-canvas {
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
        
        .results-box h3, .weight-visualization h3, .logistic-function-plot h3 {
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
        font-size: 0.9rem;
        }
        
        .weight-item {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px dashed #ddd;
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
        
        .logistic-function-plot {
        margin-top: 20px;
        }
    `;
  
    document.head.appendChild(styleElement);
    
    // Get DOM elements
    const canvas = document.getElementById('logistic-regression-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Control elements
    const regInput = document.getElementById('regularization');
    const regDisplay = document.getElementById('regularization-display');
    const learningRateInput = document.getElementById('learning-rate');
    const learningRateDisplay = document.getElementById('learning-rate-display');
    const iterationsInput = document.getElementById('iterations');
    const iterationsDisplay = document.getElementById('iterations-display');
    const trainBtn = document.getElementById('train-btn');
    const generateBtn = document.getElementById('generate-btn');

    // Results elements 
    const accuracyElement = document.getElementById('accuracy');
    const testAccuracyElement = document.getElementById('test-accuracy');
    const lossElement = document.getElementById('loss');
    const weightValuesContainer = document.getElementById('weight-values-container');
        
    // State variables
    let data = []; // Array of objects {x1, x2, y}
    let weights = []; // Model coefficients [w0, w1, w2, ...]
    let testData = []; // Add this with your other state variables
    let regularization = 0.1;
    let learningRate = 0.1;
    let maxIterations = 100;
    let isTraining = false;
    
    // Drawing settings
    const plotMargin = 50;
    const plotWidth = canvasWidth - 2 * plotMargin;
    const plotHeight = canvasHeight - 2 * plotMargin;
    
    // Initialize values from inputs
    regularization = Math.pow(10, parseFloat(regInput.value));
    regDisplay.textContent = `λ = ${regularization.toFixed(regularization < 0.01 ? 4 : regularization < 0.1 ? 3 : regularization < 1 ? 2 : 1)}`;
    learningRate = Math.pow(10, parseFloat(learningRateInput.value));
    learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 1);
    maxIterations = parseInt(iterationsInput.value);
    iterationsDisplay.textContent = maxIterations.toString();
    
    // Add event listeners - MOVED AFTER DOM ELEMENTS ARE CREATED
    regInput.addEventListener('input', handleRegularizationChange);
    learningRateInput.addEventListener('input', handleLearningRateChange);
    iterationsInput.addEventListener('input', handleIterationsChange);
    trainBtn.addEventListener('click', trainModel);
    generateBtn.addEventListener('click', generateData);
    window.addEventListener('resize', handleResize);
  
    // Generate dataset
    function generateData() {
        const numPoints = 100; // Total number of points
        const trainSize = 70;  // Number of points for training (70%)
        const allPoints = [];  
        
        // Create a linear separator with some margin
        const slope = Math.random() * 2 - 1; // Random slope between -1 and 1
        const intercept = Math.random() * 0.5; // Small random intercept
        
        for (let i = 0; i < numPoints; i++) {
            const x1 = Math.random() * 2 - 1; // Range: -1 to 1
            const x2 = Math.random() * 2 - 1; // Range: -1 to 1
            
            // Determine class based on which side of the line the point falls
            const lineValue = slope * x1 + intercept;
            let y = x2 > lineValue ? 1 : 0;
            
            // Add small random margin to make it cleaner
            if (Math.abs(x2 - lineValue) < 0.1) {
            continue; // Skip points too close to the boundary
            }
            
            allPoints.push({ x1, x2, y });
        }
        
        // Shuffle the array for random train-test split
        for (let i = allPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]];
        }
        
        // Split into training and test sets
        data = allPoints.slice(0, trainSize); // Training data
        testData = allPoints.slice(trainSize);  // Test data
        
        // Initialize weights with zeros
        initializeWeights();
        
        // Make sure these elements exist before trying to update them
        if (accuracyElement) accuracyElement.textContent = '0.0%';
        if (lossElement) lossElement.textContent = '0.000';
        
        // Draw canvas
        drawCanvas();
        updateWeightDisplay();
    }  
  
    // Draw coordinate axes
    function drawAxes(xRange, yRange) {
        // Calculate scale
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

    // Initialize weights
    function initializeWeights() {
        const numFeatures = 3
        weights = Array(numFeatures).fill(0);
        
        // Initialize with small random values for better convergence
        for (let i = 0; i < weights.length; i++) {
        weights[i] = (Math.random() - 0.5) * 0.01;
        }
    }
  
    // Generate polynomial features for a single data point
    function generateFeatures(x1, x2) {
        const features = [1]; // Intercept term
        // First degree
        features.push(x1, x2);
        return features;
    }
    
    // Sigmoid function: f(z) = 1 / (1 + exp(-z))
    function sigmoid(z) {
        if (z < -20) return 0; // Prevent underflow for extremely negative values
        if (z > 20) return 1;  // Prevent overflow for extremely positive values
        return 1 / (1 + Math.exp(-z));
    }
  
    // Predict probability for a single data point
    function predict(x1, x2) {
        const features = generateFeatures(x1, x2);
        let z = 0;
        
        // Compute the dot product of features and weights
        for (let i = 0; i < features.length; i++) {
        z += features[i] * weights[i];
        }
        
        return sigmoid(z);
    }
  
    // Calculate binary cross-entropy loss
    function calculateLoss() {
        let loss = 0;
        
        for (const point of data) {
        const { x1, x2, y } = point;
        const prediction = predict(x1, x2);
        
        // Binary cross-entropy loss
        if (prediction > 0 && prediction < 1) {
            loss += -y * Math.log(prediction) - (1 - y) * Math.log(1 - prediction);
        } else {
            // Handle edge cases where prediction is 0 or 1
            const eps = 1e-15;
            const safeP = Math.min(Math.max(prediction, eps), 1 - eps);
            loss += -y * Math.log(safeP) - (1 - y) * Math.log(1 - safeP);
        }
        }
        
        // Add L2 regularization term
        let regularizationTerm = 0;
        for (let i = 1; i < weights.length; i++) { // Skip bias term
        regularizationTerm += weights[i] * weights[i];
        }
        
        loss = loss / data.length + (regularization / 2) * regularizationTerm;
        return loss;
    }

    // Initialize the visualization explicitly
    generateData();
    handleResize();

});