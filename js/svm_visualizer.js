 document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('svm_visualizer');
        if (!container) {
            console.error('Container element not found!');
            return;
        }

        // Create HTML structure
        container.innerHTML = `
            <div class="svm-container">
                <h1>Interactive Support Vector Machine Demo</h1>
                <div class="svm-layout">
                    
                    <div class="svm-visualization">
                        <div class="canvas-container">
                            <div class="instruction">Support Vector Machine - Maximum Margin Classification</div>
                            <div id="canvas-wrapper">
                                <canvas id="svm-canvas" width="800" height="500"></canvas>
                            </div>
                            <div class="legend">
                                <div class="legend-item"><span class="legend-color class-pos"></span> Train Class +1</div>
                                <div class="legend-item"><span class="legend-color class-neg"></span> Train Class -1</div>
                                <div class="legend-item"><span class="legend-color test-pos"></span> Test Class +1</div>
                                <div class="legend-item"><span class="legend-color test-neg"></span> Test Class -1</div>
                                <div class="legend-item"><span class="legend-color support-vector"></span> Support Vector</div>
                                <div class="legend-item"><span class="legend-color decision-boundary"></span> Decision Boundary</div>
                                <div class="legend-item"><span class="legend-color margin"></span> Margin</div>
                            </div>

                            <div class="btn-container">
                                <button id="train-btn" class="primary-btn">Train SVM</button>
                                <button id="generate-btn" class="secondary-btn">Generate New Data</button>
                            </div>
                        </div>
                    </div>

                    <div class="controls-panel">
                        <div class="control-group">
                            <label for="c-parameter">Regularization (C):</label>
                            <input type="range" id="c-parameter" min="-2" max="3" step="0.1" value="1" class="full-width">
                            <span id="c-display">C = 10.0</span>
                            <div class="param-hint">Higher C = Less regularization, tighter fit</div>
                        </div>
                        
                        <div class="control-group">
                            <label for="learning-rate">Learning Rate:</label>
                            <input type="range" id="learning-rate" min="-3" max="-0.5" step="0.1" value="-1.5" class="full-width">
                            <span id="learning-rate-display">0.032</span>
                        </div>
                        
                        <div class="control-group">
                            <label for="iterations">Max Iterations:</label>
                            <input type="range" id="iterations" min="100" max="5000" step="100" value="2000" class="full-width">
                            <span id="iterations-display">2000</span>
                        </div>
                        
                        <div class="results-box">
                            <h3>SVM Performance:</h3>
                            <div class="result-row">
                                <div class="result-label">Train Accuracy:</div>
                                <div class="result-value" id="accuracy">0.0%</div>
                            </div>
                            <div class="result-row">
                                <div class="result-label">Test Accuracy:</div>
                                <div class="result-value" id="test-accuracy">0.0%</div>
                            </div>
                            <div class="result-row">
                                <div class="result-label">Loss:</div>
                                <div class="result-value" id="loss">0.0000</div>
                            </div>
                            <div class="result-row">
                                <div class="result-label">Support Vectors:</div>
                                <div class="result-value" id="support-vector-count">0</div>
                            </div>
                            <div class="result-hint">Support vectors are points that lie on or within the margin</div>
                        </div>
                        
                        <div class="svm-info">
                            <h4>About this Demo:</h4>
                            <p>This demo implements a linear SVM using Stochastic Gradient Descent (SGD) on the primal formulation.</p>
                            <p>The objective function is: J(w,b) = ½||w||² + C∑max(0, 1 - yᵢ(w·xᵢ + b))</p>
                            <div class="warning">Note: RBF kernel implementation has been removed as it requires dual formulation for proper implementation.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Get DOM elements
        const canvas = document.getElementById('svm-canvas');
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Control elements
        const cInput = document.getElementById('c-parameter');
        const cDisplay = document.getElementById('c-display');
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
        const supportVectorCountElement = document.getElementById('support-vector-count');
            
        // State variables
        let data = []; // Training data
        let testData = []; // Test data
        let weights = { w: [0, 0], b: 0 }; // SVM weights
        let supportVectors = []; // Support vectors
        let C = 10.0; // Default regularization parameter
        let learningRate = 0.032; // Default learning rate
        let maxIterations = 2000; // Default max iterations
        let isTraining = false;
        let hasTrainedOnce = false;
        
        // Drawing settings
        const plotMargin = 50;
        const plotWidth = canvasWidth - 2 * plotMargin;
        const plotHeight = canvasHeight - 2 * plotMargin;

        // Fixed SVM training using correct SGD update rules
        async function trainSVM() {
            console.log('Train button clicked, starting training...');
            if (isTraining) {
                console.log('Already training, returning');
                return;
            }
            
            if (data.length === 0) {
                console.error('No data to train on!');
                return;
            }
            
            isTraining = true;
            
            if (trainBtn) {
                trainBtn.textContent = 'Training...';
                trainBtn.disabled = true;
            }

            // Small delay to ensure UI updates
            await new Promise(resolve => setTimeout(resolve, 10));

            let iterations = 0;
            const maxIter = maxIterations;
            let bestAccuracy = 0;
            let stagnantIterations = 0;
            let currentLearningRate = learningRate;
            
            console.log(`Starting SVM training with C=${C}, lr=${learningRate}`);
            
            // Initialize weights if first training
            if (!hasTrainedOnce) {
                initializeWeights();
            }
            
            while (iterations < maxIter) {
                // Show immediate feedback on first iteration
                if (iterations === 0) {
                    drawCanvas();
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                
                // SGD: sample a random point
                const idx = Math.floor(Math.random() * data.length);
                const point = data[idx];
                
                // Compute decision value
                const decision = weights.w[0] * point.x1 + weights.w[1] * point.x2 + weights.b;
                const margin = point.y * decision;
                
                // Fixed SGD update rules for primal SVM
                // Objective: J(w,b) = (1/2)||w||² + C∑max(0, 1 - yᵢ(w·xᵢ + b))
                if (margin < 1) {
                    // Point violates margin: gradient includes both regularization and loss terms
                    // ∂J/∂w = w - C·yᵢ·xᵢ
                    // ∂J/∂b = -C·yᵢ
                    weights.w[0] = weights.w[0] - currentLearningRate * (weights.w[0] - C * point.y * point.x1);
                    weights.w[1] = weights.w[1] - currentLearningRate * (weights.w[1] - C * point.y * point.x2);
                    weights.b = weights.b - currentLearningRate * (-C * point.y);
                } else {
                    // Point is correctly classified with good margin: only regularization gradient
                    // ∂J/∂w = w
                    // ∂J/∂b = 0
                    weights.w[0] = weights.w[0] - currentLearningRate * weights.w[0];
                    weights.w[1] = weights.w[1] - currentLearningRate * weights.w[1];
                    // b doesn't change
                }
                
                // Calculate current metrics every 10 iterations
                if (iterations % 10 === 0 || iterations === 0) {
                    const currentAccuracy = calculateAccuracy();
                    const currentLoss = calculateSVMLoss();
                    
                    // Track improvements
                    if (currentAccuracy > bestAccuracy + 0.01) {
                        bestAccuracy = currentAccuracy;
                        stagnantIterations = 0;
                    } else {
                        stagnantIterations++;
                    }
                    
                    // Adaptive learning rate decay (less aggressive)
                    if (stagnantIterations > 100 && stagnantIterations % 100 === 0) {
                        currentLearningRate *= 0.95;
                    }
                    
                    // Early stopping for good accuracy
                    if (currentAccuracy >= 0.98 && iterations > 200) {
                        console.log(`Early stopping: High accuracy reached (${(currentAccuracy*100).toFixed(1)}%)`);
                        break;
                    }
                    
                    // Stop if loss is very low
                    if (currentLoss < 0.01 && iterations > 200) {
                        console.log(`Early stopping: Low loss reached (${currentLoss.toFixed(4)})`);
                        break;
                    }
                    
                    // Update display
                    updateSupportVectors();
                    const testAcc = calculateTestAccuracy();
                    
                    if (accuracyElement) accuracyElement.textContent = (currentAccuracy * 100).toFixed(1) + '%';
                    if (lossElement) lossElement.textContent = currentLoss.toFixed(4);
                    if (testAccuracyElement) testAccuracyElement.textContent = (testAcc * 100).toFixed(1) + '%';
                    if (supportVectorCountElement) supportVectorCountElement.textContent = supportVectors.length.toString();
                    
                    drawCanvas();
                    
                    // Log progress
                    if (iterations % 100 === 0) {
                        console.log(`Iteration ${iterations}: Loss=${currentLoss.toFixed(4)}, Accuracy=${(currentAccuracy*100).toFixed(1)}%`);
                        // Update button to show progress
                        if (trainBtn) {
                            trainBtn.textContent = `Training... ${Math.round(iterations/maxIter*100)}%`;
                        }
                    }
                    
                    // Allow UI updates
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
                
                iterations++;
            }

            // Final update
            updateSupportVectors();
            const finalAccuracy = calculateAccuracy();
            const finalTestAcc = calculateTestAccuracy();
            const finalLoss = calculateSVMLoss();
            
            if (accuracyElement) accuracyElement.textContent = (finalAccuracy * 100).toFixed(1) + '%';
            if (lossElement) lossElement.textContent = finalLoss.toFixed(4);
            if (testAccuracyElement) testAccuracyElement.textContent = (finalTestAcc * 100).toFixed(1) + '%';
            if (supportVectorCountElement) supportVectorCountElement.textContent = supportVectors.length.toString();
            
            drawCanvas();

            console.log(`SVM training completed: ${iterations} iterations, Final accuracy: ${(finalAccuracy*100).toFixed(1)}%`);

            isTraining = false;
            hasTrainedOnce = true;

            if (trainBtn) {
                trainBtn.textContent = 'Train SVM (Continue)';
                trainBtn.disabled = false;
            }
        }

        // Predict class for a point
        function predict(x1, x2) {
            const decision = weights.w[0] * x1 + weights.w[1] * x2 + weights.b;
            return decision >= 0 ? 1 : -1;
        }

        // Calculate accuracy on training data
        function calculateAccuracy() {
            let correct = 0;
            for (const point of data) {
                const prediction = predict(point.x1, point.x2);
                if (prediction === point.y) correct++;
            }
            return data.length > 0 ? correct / data.length : 0;
        }

        // Calculate test accuracy
        function calculateTestAccuracy() {
            let correct = 0;
            for (const point of testData) {
                const prediction = predict(point.x1, point.x2);
                if (prediction === point.y) correct++;
            }
            return testData.length > 0 ? correct / testData.length : 0;
        }

        // Calculate SVM loss (hinge loss + regularization)
        function calculateSVMLoss() {
            let hingeLoss = 0;
            for (const point of data) {
                const decision = weights.w[0] * point.x1 + weights.w[1] * point.x2 + weights.b;
                const margin = point.y * decision;
                if (margin < 1) {
                    hingeLoss += (1 - margin);
                }
            }
            
            // Regularization term: (1/2)||w||²
            const regTerm = 0.5 * (weights.w[0] * weights.w[0] + weights.w[1] * weights.w[1]);
            
            // Total loss: (1/2)||w||² + C * average_hinge_loss
            return regTerm + C * hingeLoss / data.length;
        }

        // Update support vectors based on current model
        function updateSupportVectors() {
            supportVectors = [];
            
            if (!hasTrainedOnce) {
                return;
            }
            
            for (const point of data) {
                const decision = weights.w[0] * point.x1 + weights.w[1] * point.x2 + weights.b;
                const functionalMargin = point.y * decision;
                
                // In primal SVM with SGD, we consider points with margin ≤ 1 as support vectors
                // These are the points that contribute to the loss
                if (functionalMargin <= 1.0 + 1e-6) {
                    supportVectors.push({
                        x1: point.x1,
                        x2: point.x2,
                        y: point.y,
                        margin: functionalMargin
                    });
                }
            }
        }

        // Draw decision boundary and margin
        function drawDecisionBoundary(xRange, yRange) {
            if (!hasTrainedOnce) {
                return;
            }
            
            const xScale = plotWidth / (xRange.max - xRange.min);
            const yScale = plotHeight / (yRange.max - yRange.min);
            
            // For linear SVM, draw analytical solution
            if (weights.w[1] !== 0) {
                // Decision boundary: w0*x1 + w1*x2 + b = 0
                // x2 = -(w0*x1 + b) / w1
                const points = [];
                for (let x1 = xRange.min; x1 <= xRange.max; x1 += (xRange.max - xRange.min) / 100) {
                    const x2 = -(weights.w[0] * x1 + weights.b) / weights.w[1];
                    if (x2 >= yRange.min && x2 <= yRange.max) {
                        const canvasX = plotMargin + (x1 - xRange.min) * xScale;
                        const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
                        points.push({ x: canvasX, y: canvasY });
                    }
                }
                
                if (points.length > 1) {
                    // Draw decision boundary
                    ctx.strokeStyle = '#2c3e50';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.stroke();
                    
                    // Draw margin boundaries
                    drawMarginBoundary(xRange, yRange, xScale, yScale, 1);
                    drawMarginBoundary(xRange, yRange, xScale, yScale, -1);
                }
            }
        }

        // Draw margin boundary
        function drawMarginBoundary(xRange, yRange, xScale, yScale, offset) {
            const points = [];
            for (let x1 = xRange.min; x1 <= xRange.max; x1 += (xRange.max - xRange.min) / 100) {
                // Margin boundary: w0*x1 + w1*x2 + b = ±1
                const x2 = -(weights.w[0] * x1 + weights.b - offset) / weights.w[1];
                if (x2 >= yRange.min && x2 <= yRange.max) {
                    const canvasX = plotMargin + (x1 - xRange.min) * xScale;
                    const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
                    points.push({ x: canvasX, y: canvasY });
                }
            }
            
            if (points.length > 1) {
                ctx.strokeStyle = '#95a5a6';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw data points with support vectors highlighted
        function drawDataPoints(xRange, yRange) {
            const xScale = plotWidth / (xRange.max - xRange.min);
            const yScale = plotHeight / (yRange.max - yRange.min);
            
            // Draw training data points
            for (const point of data) {
                const canvasX = plotMargin + (point.x1 - xRange.min) * xScale;
                const canvasY = canvasHeight - plotMargin - (point.x2 - yRange.min) * yScale;
                
                // Check if this point is a support vector
                const isSupportVector = hasTrainedOnce && supportVectors.some(sv => 
                    Math.abs(sv.x1 - point.x1) < 1e-6 && Math.abs(sv.x2 - point.x2) < 1e-6);
                
                // Color based on class
                ctx.fillStyle = point.y === 1 ? '#e74c3c' : '#3498db';
                
                // Different styling for support vectors
                if (isSupportVector) {
                    ctx.strokeStyle = '#f39c12';
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                }
                
                ctx.beginPath();
                ctx.arc(canvasX, canvasY, isSupportVector ? 7 : 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
            
            // Draw test data points
            for (const point of testData) {
                const canvasX = plotMargin + (point.x1 - xRange.min) * xScale;
                const canvasY = canvasHeight - plotMargin - (point.x2 - yRange.min) * yScale;
                
                ctx.fillStyle = point.y === 1 ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                
                ctx.beginPath();
                ctx.rect(canvasX - 4, canvasY - 4, 8, 8);
                ctx.fill();
                ctx.stroke();
            }
        }

        // Draw the canvas
        function drawCanvas() {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            const xRange = calculateRange(data.concat(testData).map(p => p.x1));
            const yRange = calculateRange(data.concat(testData).map(p => p.x2));
            
            drawAxes(xRange, yRange);
            drawDecisionBoundary(xRange, yRange);
            drawDataPoints(xRange, yRange);
        }

        // Calculate range for display
        function calculateRange(values) {
            if (values.length === 0) return { min: -1, max: 1 };
            const min = Math.min(...values);
            const max = Math.max(...values);
            const padding = Math.max((max - min) * 0.15, 0.5);
            return { min: min - padding, max: max + padding };
        }

        // Draw coordinate axes
        function drawAxes(xRange, yRange) {
            const xScale = plotWidth / (xRange.max - xRange.min);
            const yScale = plotHeight / (yRange.max - yRange.min);
            
            // Draw grid lines
            ctx.strokeStyle = '#eee';
            ctx.lineWidth = 1;
            
            // Grid lines
            const steps = 10;
            for (let i = 0; i <= steps; i++) {
                // Horizontal lines
                const y = yRange.min + (yRange.max - yRange.min) * i / steps;
                const canvasY = canvasHeight - plotMargin - (y - yRange.min) * yScale;
                ctx.beginPath();
                ctx.moveTo(plotMargin, canvasY);
                ctx.lineTo(canvasWidth - plotMargin, canvasY);
                ctx.stroke();
                
                // Vertical lines
                const x = xRange.min + (xRange.max - xRange.min) * i / steps;
                const canvasX = plotMargin + (x - xRange.min) * xScale;
                ctx.beginPath();
                ctx.moveTo(canvasX, plotMargin);
                ctx.lineTo(canvasX, canvasHeight - plotMargin);
                ctx.stroke();
            }
            
            // Draw axes
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            
            // X-axis
            const yZero = canvasHeight - plotMargin - (0 - yRange.min) * yScale;
            if (yZero >= plotMargin && yZero <= canvasHeight - plotMargin) {
                ctx.beginPath();
                ctx.moveTo(plotMargin, yZero);
                ctx.lineTo(canvasWidth - plotMargin, yZero);
                ctx.stroke();
            }
            
            // Y-axis
            const xZero = plotMargin + (0 - xRange.min) * xScale;
            if (xZero >= plotMargin && xZero <= canvasWidth - plotMargin) {
                ctx.beginPath();
                ctx.moveTo(xZero, plotMargin);
                ctx.lineTo(xZero, canvasHeight - plotMargin);
                ctx.stroke();
            }
        }

        // Handle parameter changes
        function handleCParameterChange() {
            C = Math.pow(10, parseFloat(cInput.value));
            cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
        }

        function handleLearningRateChange() {
            const sliderValue = parseFloat(learningRateInput.value);
            learningRate = Math.pow(10, sliderValue);
            learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 2);
        }

        function handleIterationsChange() {
            maxIterations = parseInt(iterationsInput.value);
            iterationsDisplay.textContent = maxIterations.toString();
        }

        // Generate dataset
        function generateData() {
            const numPoints = 80;
            const trainSize = 60;
            let allPoints = [];
            
            hasTrainedOnce = false;
            if (trainBtn) trainBtn.textContent = 'Train SVM';
            
            // Generate linearly separable data with better separation
            for (let i = 0; i < numPoints; i++) {
                const x1 = (Math.random() - 0.5) * 4;
                const x2 = (Math.random() - 0.5) * 4;
                
                // Create a clear linear separation with less noise
                const boundary = 0.7 * x1 + 0.3 * x2;
                const noise = (Math.random() - 0.5) * 0.3; // Reduced noise
                const y = (boundary + noise) > 0 ? 1 : -1;
                
                // Add only 3% mislabeled points for some challenge
                if (Math.random() < 0.03) {
                    allPoints.push({ x1, x2, y: -y });
                } else {
                    allPoints.push({ x1, x2, y });
                }
            }
            
            // Shuffle and split
            for (let i = allPoints.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]];
            }
            
            data = allPoints.slice(0, trainSize);
            testData = allPoints.slice(trainSize);
            
            console.log(`Generated linear pattern: ${data.length} training, ${testData.length} test`);
            
            // Reset state
            initializeWeights();
            supportVectors = [];
            hasTrainedOnce = false;
            
            // Reset metrics
            if (accuracyElement) accuracyElement.textContent = '0.0%';
            if (lossElement) lossElement.textContent = '0.0000';
            if (testAccuracyElement) testAccuracyElement.textContent = '0.0%';
            if (supportVectorCountElement) supportVectorCountElement.textContent = '0';
            
            drawCanvas();
        }

        // Initialize SVM weights
        function initializeWeights() {
            // Better initialization using small random values
            weights.w = [Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05];
            weights.b = Math.random() * 0.1 - 0.05;
            console.log('Initialized SVM weights:', weights);
        }

        // Handle window resize
        function handleResize() {
            const parent = canvas.parentElement;
            const width = Math.min(parent.clientWidth, 800);
            const ratio = canvasHeight / canvasWidth;
            
            canvas.style.width = width + 'px';
            canvas.style.height = (width * ratio) + 'px';
            
            drawCanvas();
        }

        // Initialize values from inputs
        C = Math.pow(10, parseFloat(cInput.value));
        cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
        learningRate = Math.pow(10, parseFloat(learningRateInput.value));
        learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 2);
        maxIterations = parseInt(iterationsInput.value);
        iterationsDisplay.textContent = maxIterations.toString();
        
        console.log(`Initial parameters: C=${C}, lr=${learningRate}, maxIter=${maxIterations}`);
        
        // Add event listeners
        if (cInput) cInput.addEventListener('input', handleCParameterChange);
        if (learningRateInput) learningRateInput.addEventListener('input', handleLearningRateChange);
        if (iterationsInput) iterationsInput.addEventListener('input', handleIterationsChange);
        if (trainBtn) {
            trainBtn.addEventListener('click', trainSVM);
            console.log('Train button found and listener attached');
        } else {
            console.error('Train button not found!');
        }
        if (generateBtn) generateBtn.addEventListener('click', generateData);
        window.addEventListener('resize', handleResize);
        
        console.log('Event listeners attached, initializing visualization...');

        // Initialize the visualization
        generateData();
        handleResize();
    });