// An interactive demo for Support Vector Machines (SVM)
// Corrected version with proper RBF kernel support

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('svm_visualizer');

    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // SVM training with kernel approximation for RBF
    async function trainSVM() {
        if (isTraining) return;
        isTraining = true;
        if (trainBtn) {
            trainBtn.textContent = 'Training...';
            trainBtn.disabled = true;
        }

        // Initialize kernel-specific parameters
        if (kernelType === 'rbf' && !kernelApproximation) {
            initializeKernelApproximation();
        }

        // Initialize alphas for all data points
        alphas = new Array(data.length).fill(0);
        
        let iterations = 0;
        const maxIter = maxIterations;
        let bestAccuracy = 0;
        let stagnantIterations = 0;
        let currentLearningRate = learningRate; // Use local variable for adaptive learning
        
        console.log(`Starting SVM training with C=${C}, kernel=${kernelType}, lr=${learningRate}`);
        
        // Main training loop
        while (iterations < maxIter) {
            // SGD: sample a random point
            const idx = Math.floor(Math.random() * data.length);
            const point = data[idx];
            
            if (kernelType === 'linear') {
                // Linear kernel: standard SGD update
                const decision = computeDecisionFunction(point.x1, point.x2);
                const margin = point.y * decision;
                
                if (margin < 1) {
                    // Point is within margin or misclassified
                    // Update: w = w - lr * (lambda * w - C * y * x)
                    weights.w[0] = weights.w[0] - currentLearningRate * (weights.w[0] / (C * data.length) - point.y * point.x1);
                    weights.w[1] = weights.w[1] - currentLearningRate * (weights.w[1] / (C * data.length) - point.y * point.x2);
                    weights.b = weights.b + currentLearningRate * point.y;
                } else {
                    // Point is correctly classified with good margin
                    weights.w[0] = weights.w[0] - currentLearningRate * weights.w[0] / (C * data.length);
                    weights.w[1] = weights.w[1] - currentLearningRate * weights.w[1] / (C * data.length);
                }
            } else if (kernelType === 'rbf') {
                // RBF kernel: use approximated features
                const phi = computeApproximateFeatures(point.x1, point.x2);
                const decision = computeApproximateDecision(phi);
                const margin = point.y * decision;
                
                if (margin < 1) {
                    // Update approximated weights
                    for (let i = 0; i < approximateWeights.length; i++) {
                        approximateWeights[i] = approximateWeights[i] - 
                            currentLearningRate * (approximateWeights[i] / (C * data.length) - point.y * phi[i]);
                    }
                    approximateBias = approximateBias + currentLearningRate * point.y;
                } else {
                    // Only regularization
                    for (let i = 0; i < approximateWeights.length; i++) {
                        approximateWeights[i] = approximateWeights[i] - 
                            currentLearningRate * approximateWeights[i] / (C * data.length);
                    }
                }
            }
        
            // Calculate current metrics every 10 iterations
            if (iterations % 10 === 0) {
                const currentAccuracy = calculateAccuracy();
                const currentLoss = calculateSVMLoss();
                
                // Track improvements
                if (currentAccuracy > bestAccuracy + 0.005) {
                    bestAccuracy = currentAccuracy;
                    stagnantIterations = 0;
                } else {
                    stagnantIterations++;
                }
                
               // Adaptive learning rate with kernel-specific decay
                if (stagnantIterations > 50 && stagnantIterations % 50 === 0) {
                    const decayFactor = kernelType === 'rbf' ? 0.95 : 0.9;
                    currentLearningRate *= decayFactor;
                    console.log(`Reduced learning rate to ${currentLearningRate.toFixed(6)}`);
                }

                // Early stopping conditions
                if (currentAccuracy > 0.98 && iterations > 100) { // Changed from 50 to 100
                    console.log(`Early stopping: High accuracy reached (${(currentAccuracy*100).toFixed(1)}%)`);
                    break;
                }
                
                if (stagnantIterations > 300 && iterations > 200) { // Increased from 200 to 300
                    console.log(`Early stopping: No improvement for 300 iterations`);
                    break;
                }
                
                // Update display
                if (iterations > 0) { // Only update support vectors after first iteration
                    updateSupportVectors(iterations);
                }
                const testAcc = calculateTestAccuracy();
                
                if (accuracyElement) accuracyElement.textContent = (currentAccuracy * 100).toFixed(1) + '%';
                if (lossElement) lossElement.textContent = currentLoss.toFixed(4);
                if (testAccuracyElement) testAccuracyElement.textContent = (testAcc * 100).toFixed(1) + '%';
                if (supportVectorCountElement) supportVectorCountElement.textContent = supportVectors.length.toString();
                
                drawCanvas();
                
                if (iterations % 50 === 0) {
                    console.log(`Iteration ${iterations}: Loss=${currentLoss.toFixed(4)}, Accuracy=${(currentAccuracy*100).toFixed(1)}%, Support Vectors=${supportVectors.length}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 5));
            }
            
            iterations++;
        }

        // Mark that training has occurred
        hasTrainedOnce = true;

        // Final update
        updateSupportVectors(iterations);
        const finalAccuracy = calculateAccuracy();
        const finalTestAcc = calculateTestAccuracy();
        const finalLoss = calculateSVMLoss();
        
        if (accuracyElement) accuracyElement.textContent = (finalAccuracy * 100).toFixed(1) + '%';
        if (lossElement) lossElement.textContent = finalLoss.toFixed(4);
        if (testAccuracyElement) testAccuracyElement.textContent = (finalTestAcc * 100).toFixed(1) + '%';
        if (supportVectorCountElement) supportVectorCountElement.textContent = supportVectors.length.toString();
        
        drawCanvas();
        updateKKTConditions();

        console.log(`SVM training completed: ${iterations} iterations, Final accuracy: ${(finalAccuracy*100).toFixed(1)}%, Support vectors: ${supportVectors.length}`);

        isTraining = false;

        if (trainBtn) {
            trainBtn.textContent = hasTrainedOnce ? 'Train SVM (Continue)' : 'Train SVM';
            trainBtn.disabled = false;
        }
    }

    // Initialize kernel approximation for RBF
    function initializeKernelApproximation() {
        // Use Random Fourier Features approximation
        // Number of random features (higher = better approximation but slower)
        numRandomFeatures = 300; // Increased from 200 for better approximation
        
        // Initialize random weights for Fourier features
        randomWeights = [];
        randomBiases = [];
        
        // Ensure gamma is reasonable
        const effectiveGamma = Math.min(gamma, 1.0); // Cap gamma to prevent instability
        
        for (let i = 0; i < numRandomFeatures; i++) {
            // Sample from Gaussian distribution scaled by gamma
            const w1 = gaussianRandom() * Math.sqrt(2 * effectiveGamma);
            const w2 = gaussianRandom() * Math.sqrt(2 * effectiveGamma);
            randomWeights.push([w1, w2]);
            
            // Random bias from uniform distribution
            randomBiases.push(Math.random() * 2 * Math.PI);
        }
        
        // Initialize approximate weights with small random values
        approximateWeights = [];
        for (let i = 0; i < numRandomFeatures * 2; i++) {
            approximateWeights.push((Math.random() - 0.5) * 0.01);
        }
        approximateBias = (Math.random() - 0.5) * 0.01;
        
        kernelApproximation = true;
        console.log(`Initialized RBF kernel approximation with ${numRandomFeatures} random features, gamma=${effectiveGamma.toFixed(3)}`);
    }

    // Compute approximate features using Random Fourier Features
    function computeApproximateFeatures(x1, x2) {
        const features = [];
        const scale = Math.sqrt(1.0 / numRandomFeatures); // Changed from 2.0/numRandomFeatures
        
        for (let i = 0; i < numRandomFeatures; i++) {
            const projection = randomWeights[i][0] * x1 + randomWeights[i][1] * x2 + randomBiases[i];
            features.push(scale * Math.cos(projection));
            features.push(scale * Math.sin(projection)); // ADD sine component
        }
        
        return features;
    }

    // Compute decision using approximate features
    function computeApproximateDecision(features) {
        let decision = approximateBias;
        for (let i = 0; i < features.length; i++) {
            decision += approximateWeights[i] * features[i];
        }
        return decision;
    }

    // Gaussian random number generator (Box-Muller transform)
    function gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // Compute decision function value
    function computeDecisionFunction(x1, x2) {
        if (kernelType === 'linear') {
            return weights.w[0] * x1 + weights.w[1] * x2 + weights.b;
        } else if (kernelType === 'rbf') {
            // Always use approximate features for RBF
            const phi = computeApproximateFeatures(x1, x2);
            return computeApproximateDecision(phi);
        }
        return 0;
    }

    // Calculate SVM loss (hinge loss + regularization)
    function calculateSVMLoss() {
        let hingeLoss = 0;
        let totalSlack = 0;
        
        for (const point of data) {
            const decision = computeDecisionFunction(point.x1, point.x2);
            const margin = point.y * decision;
            if (margin < 1) {
                const slack = 1 - margin;
                hingeLoss += slack;
                totalSlack += slack;
            }
        }
        
        // Regularization term
        let regTerm = 0;
        if (kernelType === 'linear') {
            regTerm = 0.5 * (weights.w[0] * weights.w[0] + weights.w[1] * weights.w[1]);
        } else if (kernelType === 'rbf' && kernelApproximation) {
            // Regularization for approximate weights
            for (let i = 0; i < approximateWeights.length; i++) {
                regTerm += approximateWeights[i] * approximateWeights[i];
            }
            regTerm *= 0.5;
        }
        
        // SVM loss = regularization + C * sum_of_slack_variables
        return regTerm + C * totalSlack;
    }


    // Predict class for a point
    function predict(x1, x2) {
        const decision = computeDecisionFunction(x1, x2);
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

    // Update support vectors based on current model
    function updateSupportVectors(currentIteration) {
        supportVectors = [];

        if (!hasTrainedOnce && (!currentIteration || currentIteration === 0)) return;

        const tolerance = 1e-2;

        // Recompute margins and identify only violators
        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            const decision = computeDecisionFunction(point.x1, point.x2);
            const margin = point.y * decision;

            // Only count as support vector if inside margin or misclassified
            if (margin < 1 - tolerance) {
                supportVectors.push({
                    x1: point.x1,
                    x2: point.x2,
                    y: point.y,
                    alpha: C,  // approximate
                    slackVariable: 1 - margin,
                    margin: margin
                });
            }
        }

        const totalPoints = data.length;
        const svCount = supportVectors.length;
        const svPercentage = (svCount / totalPoints * 100).toFixed(1);

        if (currentIteration % 50 === 0 || currentIteration === maxIterations) {
            console.log(`Support Vector Analysis: ${svCount}/${totalPoints} (${svPercentage}%)`);
        }
    }


    // Check KKT conditions
    function updateKKTConditions() {
        if (!kktConditionsElement || !hasTrainedOnce) {
            if (kktConditionsElement) {
                kktConditionsElement.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
            }
            return;
        }
        
        let html = '<h4>KKT Conditions Check:</h4>';
        
        let satisfied = 0;
        let total = 0;
        
        for (const point of data) {
            const decision = computeDecisionFunction(point.x1, point.x2);
            const functionalMargin = point.y * decision;
            
            const sv = supportVectors.find(sv => 
                Math.abs(sv.x1 - point.x1) < 1e-6 && Math.abs(sv.x2 - point.x2) < 1e-6);
            const alpha = sv ? sv.alpha : 0;
            const isSupporVector = alpha > 1e-6;
            
            total++;
            let conditionsMet = true;
            
            if (!isSupporVector) {
                // Non-support vectors: should have good margin
                if (functionalMargin < 1.0 - 1e-3) {
                    conditionsMet = false;
                }
            } else {
                // Support vectors: check complementary slackness
                if (alpha <= 0 || alpha > C + 1e-6) {
                    conditionsMet = false;
                }
                
                const expectedSlack = Math.max(0, 1 - functionalMargin);
                const actualSlack = sv.slackVariable;
                
                if (Math.abs(expectedSlack - actualSlack) > 1e-3) {
                    conditionsMet = false;
                }
            }
            
            if (conditionsMet) satisfied++;
        }
        
        const percentage = total > 0 ? (satisfied / total * 100).toFixed(1) : '0.0';
        html += `<div class="kkt-summary">KKT Satisfied: ${satisfied}/${total} points (${percentage}%)</div>`;
        
        if (kernelType === 'rbf' && kernelApproximation) {
            html += `<div class="kkt-note">Note: Using ${numRandomFeatures} random features for RBF approximation</div>`;
        }
        
        kktConditionsElement.innerHTML = html;
    }

    // Draw decision boundary and margin
    function drawDecisionBoundary(xRange, yRange) {
        if (!hasTrainedOnce) {
            return;
        }
        
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        if (kernelType === 'linear' && weights.w[0] !== 0 && weights.w[1] !== 0) {
            drawLinearBoundary(xRange, yRange, xScale, yScale);
        } else {
            drawContourBoundary(xRange, yRange);
        }
    }

    // Draw linear decision boundary
    function drawLinearBoundary(xRange, yRange, xScale, yScale) {
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
            drawMarginBoundaries(xRange, yRange, xScale, yScale, 1);
            drawMarginBoundaries(xRange, yRange, xScale, yScale, -1);
        }
    }

    // Draw margin boundaries
    function drawMarginBoundaries(xRange, yRange, xScale, yScale, offset) {
        const points = [];
        for (let x1 = xRange.min; x1 <= xRange.max; x1 += (xRange.max - xRange.min) / 100) {
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

    // Draw contour-based decision boundary
    function drawContourBoundary(xRange, yRange) {
        const contourCanvas = document.createElement('canvas');
        contourCanvas.width = plotWidth;
        contourCanvas.height = plotHeight;
        const contourCtx = contourCanvas.getContext('2d');
        
        const imageData = contourCtx.createImageData(plotWidth, plotHeight);
        
        // Use lower resolution for performance
        const step = 2;
        
        for (let i = 0; i < plotWidth; i += step) {
            for (let j = 0; j < plotHeight; j += step) {
                const x1 = xRange.min + (i / plotWidth) * (xRange.max - xRange.min);
                const x2 = yRange.max - (j / plotHeight) * (yRange.max - yRange.min);
                const decision = computeDecisionFunction(x1, x2);
                
                // Fill a square of pixels
                for (let di = 0; di < step && i + di < plotWidth; di++) {
                    for (let dj = 0; dj < step && j + dj < plotHeight; dj++) {
                        const pixelIndex = ((j + dj) * plotWidth + (i + di)) * 4;
                        
                        if (decision < 0) {
                            imageData.data[pixelIndex] = 52;
                            imageData.data[pixelIndex + 1] = 152;
                            imageData.data[pixelIndex + 2] = 219;
                            imageData.data[pixelIndex + 3] = Math.round(Math.min(255 * Math.abs(decision) * 0.1, 127));
                        } else {
                            imageData.data[pixelIndex] = 231;
                            imageData.data[pixelIndex + 1] = 76;
                            imageData.data[pixelIndex + 2] = 60;
                            imageData.data[pixelIndex + 3] = Math.round(Math.min(255 * Math.abs(decision) * 0.1, 127));
                        }
                    }
                }
            }
        }
        
        contourCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(contourCanvas, 0, 0, plotWidth, plotHeight, plotMargin, plotMargin, plotWidth, plotHeight);
        
        drawBoundaryContour(xRange, yRange);
    }

    // Draw the decision boundary as a contour line
    function drawBoundaryContour(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        
        const points = [];
        const resolution = 60; // Reduced for performance
        
        for (let i = 0; i <= resolution; i++) {
            for (let j = 0; j <= resolution; j++) {
                const x1 = xRange.min + (i / resolution) * (xRange.max - xRange.min);
                const x2 = yRange.min + (j / resolution) * (yRange.max - yRange.min);
                const decision = computeDecisionFunction(x1, x2);
                
                if (Math.abs(decision) < 0.05) {
                    const canvasX = plotMargin + (x1 - xRange.min) * xScale;
                    const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * yScale;
                    
                    if (canvasX >= plotMargin && canvasX <= canvasWidth - plotMargin &&
                        canvasY >= plotMargin && canvasY <= canvasHeight - plotMargin) {
                        points.push({ x: canvasX, y: canvasY });
                    }
                }
            }
        }
        
        ctx.fillStyle = '#2c3e50';
        for (const point of points) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
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
            
            const isSupportVector = hasTrainedOnce && supportVectors.some(sv => 
                Math.abs(sv.x1 - point.x1) < 1e-6 && Math.abs(sv.x2 - point.x2) < 1e-6);
            
            ctx.fillStyle = point.y === 1 ? '#e74c3c' : '#3498db';
            
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
            
            // Draw slack variable visualization
            if (isSupportVector) {
                const sv = supportVectors.find(s => 
                    Math.abs(s.x1 - point.x1) < 1e-6 && Math.abs(s.x2 - point.x2) < 1e-6);
                if (sv && sv.slackVariable > 0.1) {
                    ctx.strokeStyle = '#e67e22';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(canvasX, canvasY, 10 + sv.slackVariable * 5, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
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
        
        const xRange = calculateXRange();
        const yRange = calculateYRange();
        
        drawAxes(xRange, yRange);
        drawDecisionBoundary(xRange, yRange);
        drawDataPoints(xRange, yRange);
    }

    // Calculate X range for display
    function calculateXRange() {
        const allPoints = [...data, ...testData];
        const xValues = allPoints.map(point => point.x1);
        const min = Math.min(...xValues);
        const max = Math.max(...xValues);
        
        const padding = Math.max((max - min) * 0.15, 0.1);
        return { min: min - padding, max: max + padding };
    }

    // Calculate Y range for display
    function calculateYRange() {
        const allPoints = [...data, ...testData];
        const yValues = allPoints.map(point => point.x2);
        const min = Math.min(...yValues);
        const max = Math.max(...yValues);
        
        const padding = Math.max((max - min) * 0.15, 0.1);
        return { min: min - padding, max: max + padding };
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

    // Handle parameter changes
    function handleCParameterChange() {
        C = Math.pow(10, parseFloat(cInput.value));
        cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
        regularizationTerm = 1.0 / C; // Update regularization term
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

    function handleKernelChange() {
        kernelType = kernelSelect.value;
        if (kernelType === 'rbf') {
            gammaContainer.style.display = 'block';
        } else {
            gammaContainer.style.display = 'none';
        }
        
        // Reset everything when kernel changes
        initializeWeights();
        kernelApproximation = false;
        supportVectors = [];
        hasTrainedOnce = false;
        alphas = new Array(data.length).fill(0); // Reset alphas
        
        // Reset display
        if (accuracyElement) accuracyElement.textContent = '0.0%';
        if (lossElement) lossElement.textContent = '0.000';
        if (testAccuracyElement) testAccuracyElement.textContent = '0.0%';
        if (supportVectorCountElement) supportVectorCountElement.textContent = '0';
        if (kktConditionsElement) kktConditionsElement.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
        if (trainBtn) trainBtn.textContent = 'Train SVM';
        
        drawCanvas();
    }

    function handleGammaChange() {
        gamma = Math.pow(10, parseFloat(gammaInput.value));
        gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : gamma < 1 ? 2 : 1)}`;
        // Re-initialize kernel approximation if using RBF
        if (kernelType === 'rbf' && hasTrainedOnce) {
            kernelApproximation = false;
        }
    }

    // Generate dataset
    function generateData() {
        const numPoints = 120;
        const trainSize = 80;
        let allPoints = [];
        
        const pattern = Math.random() > 0.5 ? 'linear' : 'circular';
        
        hasTrainedOnce = false;
        if (trainBtn) trainBtn.textContent = 'Train SVM';
        
        if (pattern === 'linear') {
            // Linear pattern with some overlap to make it more challenging
            const w_true = [0.8, 0.5]; // True separating hyperplane
            const b_true = 0;
            
            for (let i = 0; i < numPoints; i++) {
                const x1 = (Math.random() - 0.5) * 4;
                const x2 = (Math.random() - 0.5) * 4;
                
                const decision = w_true[0] * x1 + w_true[1] * x2 + b_true;
                
                let y;
                if (Math.random() < 0.9) {
                    // 90% of points are correctly labeled with margin
                    const margin = 0.5 + Math.random() * 0.5;
                    if (decision > 0) {
                        y = 1;
                        // Push point away from boundary
                        const norm = Math.sqrt(w_true[0]**2 + w_true[1]**2);
                        allPoints.push({
                            x1: x1 + margin * w_true[0] / norm,
                            x2: x2 + margin * w_true[1] / norm,
                            y: y
                        });
                    } else {
                        y = -1;
                        // Push point away from boundary
                        const norm = Math.sqrt(w_true[0]**2 + w_true[1]**2);
                        allPoints.push({
                            x1: x1 - margin * w_true[0] / norm,
                            x2: x2 - margin * w_true[1] / norm,
                            y: y
                        });
                    }
                } else {
                    // 10% near boundary or misclassified
                    y = decision > 0 ? 1 : -1;
                    if (Math.random() < 0.3) {
                        y = -y; // Flip label for some noise
                    }
                    allPoints.push({ x1, x2, y });
                }
            }
        } else {
            // Circular pattern - better separated for RBF demo
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * 2 * Math.PI;
                let radius, y;
                
                if (Math.random() < 0.85) {
                    // Clearly separated
                    if (Math.random() < 0.5) {
                        // Inner class - well inside
                        radius = Math.random() * 0.7; // Reduced from 0.8
                        y = 1;
                    } else {
                        // Outer class - well outside
                        radius = 1.5 + Math.random() * 0.8; // Adjusted for better separation
                        y = -1;
                    }
                } else {
                    // Near boundary (around radius 1.0)
                    radius = 0.9 + Math.random() * 0.3;
                    y = radius < 1.05 ? 1 : -1;
                    
                    // Add some misclassified points
                    if (Math.random() < 0.2) {
                        y = -y;
                    }
                }
                
                const x1 = radius * Math.cos(angle);
                const x2 = radius * Math.sin(angle);
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
        
        console.log(`Generated ${pattern} pattern: ${data.length} training, ${testData.length} test`);
        
        // Initialize with random weights (not aligned with true boundary)
        initializeWeights();
        supportVectors = [];
        hasTrainedOnce = false;
        kernelApproximation = false;
        alphas = new Array(data.length).fill(0); // Reset alphas
        
        // Update support vectors
        updateSupportVectors();
        
        // Reset metrics
        if (accuracyElement) accuracyElement.textContent = '0.0%';
        if (lossElement) lossElement.textContent = '0.000';
        if (testAccuracyElement) testAccuracyElement.textContent = '0.0%';
        if (supportVectorCountElement) supportVectorCountElement.textContent = '0';
        if (kktConditionsElement) kktConditionsElement.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
        if (trainBtn) trainBtn.textContent = 'Train SVM';
        
        drawCanvas();
    }

    // Initialize SVM weights
    function initializeWeights() {
        // Initialize linear weights with small random values
        weights.w = [
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        ];
        weights.b = (Math.random() - 0.5) * 0.1;
        
        // Reset kernel approximation
        randomWeights = [];
        randomBiases = [];
        approximateWeights = [];
        approximateBias = 0;
        
        console.log('Initialized SVM weights:', weights);
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

    // Create HTML structure (same as original)
    container.innerHTML = `
        <div class="svm-container">
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
                        <label for="kernel-select">Kernel:</label>
                        <select id="kernel-select" class="full-width">
                            <option value="linear">Linear</option>
                            <option value="rbf">RBF (Gaussian)</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="c-parameter">Regularization (C):</label>
                        <input type="range" id="c-parameter" min="-2" max="3" step="0.1" value="0" class="full-width">
                        <span id="c-display">C = 1.0</span>
                        <div class="param-hint">Higher C = Less regularization, tighter fit</div>
                    </div>

                    <div class="control-group" id="gamma-container" style="display: none;">
                        <label for="gamma-parameter">RBF Gamma (γ):</label>
                        <input type="range" id="gamma-parameter" min="-2" max="1" step="0.1" value="-0.5" class="full-width">
                        <span id="gamma-display">γ = 0.32</span>
                        <div class="param-hint">Higher γ = Tighter decision boundary</div>
                    </div>
                    
                    <div class="control-group">
                        <label for="learning-rate">Learning Rate:</label>
                        <input type="range" id="learning-rate" min="-3" max="-1" step="0.1" value="-2" class="full-width">
                        <span id="learning-rate-display">0.01</span>
                    </div>
                    
                    <div class="control-group">
                        <label for="iterations">Max Iterations:</label>
                        <input type="range" id="iterations" min="50" max="1000" step="50" value="300" class="full-width">
                        <span id="iterations-display">300</span>
                    </div>
                    
                    <div class="results-box">
                        <h3>SVM Performance:</h3>
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
                        <div class="result-row">
                            <div class="result-label">Support Vectors:</div>
                            <div class="result-value" id="support-vector-count">0</div>
                        </div>
                        <div class="result-hint">Support vectors are the critical points that define the decision boundary</div>
                    </div>
                    
                    <div class="kkt-conditions" id="kkt-conditions">
                        <h4>KKT Conditions:</h4>
                        <div>Train the model to see KKT conditions</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add styles (same as original)
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .svm-container {
            font-family: Arial, sans-serif;
            margin-bottom: 20px;
        }
        
        .svm-layout {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        @media (min-width: 992px) {
            .svm-layout {
                flex-direction: row;
            }
            
            .svm-visualization {
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
        
        #svm-canvas {
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
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .param-hint {
            font-size: 0.8rem;
            color: #666;
            margin-top: 4px;
            font-style: italic;
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

        .legend-color.class-pos {
            background-color: #e74c3c;
        }
        
        .legend-color.class-neg {
            background-color: #3498db;
        }

        .legend-color.test-pos {
            background-color: rgba(231, 76, 60, 0.5);
        }
        
        .legend-color.test-neg {
            background-color: rgba(52, 152, 219, 0.5);
        }
        
        .legend-color.support-vector {
            background-color: #f39c12;
            border: 2px solid #f39c12;
            border-radius: 50%;
        }
        
        .legend-color.decision-boundary {
            background-color: #2c3e50;
        }
        
        .legend-color.margin {
            background: repeating-linear-gradient(45deg, #95a5a6, #95a5a6 3px, transparent 3px, transparent 6px);
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
        
        .results-box h3 {
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
            flex-basis: 60%;
        }
        
        .result-value {
            font-family: monospace;
            flex-basis: 40%;
            text-align: right;
        }
        
        .result-hint {
            font-size: 0.8rem;
            color: #666;
            font-style: italic;
            margin-top: 8px;
            text-align: center;
        }
        
        .kkt-conditions {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #9b59b6;
        }
        
        .kkt-conditions h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: #9b59b6;
        }
        
        .kkt-summary {
            font-weight: bold;
            margin-bottom: 10px;
            color: #27ae60;
        }
        
        .kkt-note {
            font-size: 0.85rem;
            color: #7f8c8d;
            font-style: italic;
            margin-top: 8px;
        }
        
        .kkt-breakdown {
            font-size: 0.9rem;
            margin-bottom: 10px;
            padding: 8px;
            background-color: white;
            border-radius: 4px;
            border-left: 3px solid #9b59b6;
        }
        
        .kkt-breakdown div {
            margin: 3px 0;
        }
        
        .sv-details {
            margin-top: 10px;
            padding: 10px;
            background-color: white;
            border-radius: 4px;
        }
        
        .sv-details h5 {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            color: #333;
        }
        
        .sv-item {
            font-family: monospace;
            font-size: 0.8rem;
            margin: 2px 0;
            padding: 2px 4px;
            background-color: #f8f9fa;
            border-radius: 2px;
        }
        
        .btn-container {
            margin-bottom: 20px;
        }
        
        .svm-visualization {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
    `;

    document.head.appendChild(styleElement);
    
    // Get DOM elements
    const canvas = document.getElementById('svm-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Control elements
    const kernelSelect = document.getElementById('kernel-select');
    const cInput = document.getElementById('c-parameter');
    const cDisplay = document.getElementById('c-display');
    const gammaContainer = document.getElementById('gamma-container');
    const gammaInput = document.getElementById('gamma-parameter');
    const gammaDisplay = document.getElementById('gamma-display');
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
    const kktConditionsElement = document.getElementById('kkt-conditions');
        
    // State variables
    let data = [];
    let testData = [];
    let weights = { w: [0, 0], b: 0 };
    let supportVectors = [];
    let C = 1.0;
    let gamma = 0.32;
    let regularizationTerm = 1.0;
    let learningRate = 0.01;
    let maxIterations = 300;
    let kernelType = 'linear';
    let isTraining = false;
    let hasTrainedOnce = false;
    
    // Kernel approximation variables
    let kernelApproximation = false;
    let numRandomFeatures = 100;
    let randomWeights = [];
    let randomBiases = [];
    let approximateWeights = [];
    let approximateBias = 0;

    let alphas = [];
    
    // Drawing settings
    const plotMargin = 50;
    const plotWidth = canvasWidth - 2 * plotMargin;
    const plotHeight = canvasHeight - 2 * plotMargin;
    
    // Initialize values from inputs
    C = Math.pow(10, parseFloat(cInput.value));
    cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
    regularizationTerm = 1.0 / C;
    gamma = Math.pow(10, parseFloat(gammaInput.value));
    gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : gamma < 1 ? 2 : 1)}`;
    learningRate = Math.pow(10, parseFloat(learningRateInput.value));
    learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 2);
    maxIterations = parseInt(iterationsInput.value);
    iterationsDisplay.textContent = maxIterations.toString();
    
    // Add event listeners
    kernelSelect.addEventListener('change', handleKernelChange);
    cInput.addEventListener('input', handleCParameterChange);
    gammaInput.addEventListener('input', handleGammaChange);
    learningRateInput.addEventListener('input', handleLearningRateChange);
    iterationsInput.addEventListener('input', handleIterationsChange);
    trainBtn.addEventListener('click', trainSVM);
    generateBtn.addEventListener('click', generateData);
    window.addEventListener('resize', handleResize);

    // Initialize the visualization
    generateData();
    handleResize();
});