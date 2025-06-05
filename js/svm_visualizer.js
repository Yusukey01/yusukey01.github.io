// An interactive demo for Support Vector Machines (SVM)
// Fixed version with proper RBF kernel support

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
        
        let iterations = 0;
        const maxIter = maxIterations;
        let bestAccuracy = 0;
        let stagnantIterations = 0;
        let currentLearningRate = learningRate;
        
        console.log(`Starting SVM training with C=${C}, kernel=${kernelType}, lr=${learningRate}`);
        
        // Main training loop
        while (iterations < maxIter) {
            // Mini-batch SGD for better convergence
            const batchSize = kernelType === 'rbf' ? 5 : 1;
            
            for (let b = 0; b < batchSize; b++) {
                const idx = Math.floor(Math.random() * data.length);
                const point = data[idx];
                
                if (kernelType === 'linear') {
                    // Linear kernel: standard primal SGD
                    const decision = computeDecisionFunction(point.x1, point.x2);
                    const margin = point.y * decision;
                    
                    if (margin < 1) {
                        // Subgradient of hinge loss
                        weights.w[0] += currentLearningRate * (C * point.y * point.x1 - weights.w[0]);
                        weights.w[1] += currentLearningRate * (C * point.y * point.x2 - weights.w[1]);
                        weights.b += currentLearningRate * C * point.y;
                    } else {
                        // Only regularization
                        weights.w[0] *= (1 - currentLearningRate);
                        weights.w[1] *= (1 - currentLearningRate);
                    }
                } else if (kernelType === 'rbf') {
                    // RBF kernel with Random Fourier Features
                    const phi = computeApproximateFeatures(point.x1, point.x2);
                    const decision = computeApproximateDecision(phi);
                    const margin = point.y * decision;
                    
                    // Reduced learning rate for RBF
                    const rbfLr = currentLearningRate * 0.1;
                    
                    if (margin < 1) {
                        // Update with hinge loss gradient
                        for (let i = 0; i < approximateWeights.length; i++) {
                            approximateWeights[i] += rbfLr * (C * point.y * phi[i] - approximateWeights[i]);
                        }
                        approximateBias += rbfLr * C * point.y;
                    } else {
                        // Only regularization
                        for (let i = 0; i < approximateWeights.length; i++) {
                            approximateWeights[i] *= (1 - rbfLr);
                        }
                    }
                }
            }
            
            // Update metrics every 10 iterations
            if (iterations % 10 === 0) {
                const currentAccuracy = calculateAccuracy();
                const currentLoss = calculateSVMLoss();
                const testAcc = calculateTestAccuracy();
                
                // Track improvements
                if (currentAccuracy > bestAccuracy + 0.005) {
                    bestAccuracy = currentAccuracy;
                    stagnantIterations = 0;
                } else {
                    stagnantIterations++;
                }
                
                // Adaptive learning rate decay
                if (stagnantIterations > 100 && stagnantIterations % 50 === 0) {
                    currentLearningRate *= 0.9;
                    console.log(`Reduced learning rate to ${currentLearningRate.toFixed(6)}`);
                }
                
                // Update display
                updateSupportVectors();
                
                if (accuracyElement) accuracyElement.textContent = (currentAccuracy * 100).toFixed(1) + '%';
                if (lossElement) lossElement.textContent = currentLoss.toFixed(4);
                if (testAccuracyElement) testAccuracyElement.textContent = (testAcc * 100).toFixed(1) + '%';
                if (supportVectorCountElement) supportVectorCountElement.textContent = supportVectors.length.toString();
                
                drawCanvas();
                
                if (iterations % 50 === 0) {
                    console.log(`Iteration ${iterations}: Loss=${currentLoss.toFixed(4)}, Accuracy=${(currentAccuracy*100).toFixed(1)}%, Test=${(testAcc*100).toFixed(1)}%, SVs=${supportVectors.length}`);
                }
                
                // Early stopping
                if (currentAccuracy > 0.98 && iterations > 100) {
                    console.log(`Early stopping: High accuracy reached (${(currentAccuracy*100).toFixed(1)}%)`);
                    break;
                }
                
                if (stagnantIterations > 300 && iterations > 200) {
                    console.log(`Early stopping: No improvement for 300 iterations`);
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 5));
            }
            
            iterations++;
        }

        // Mark training complete
        hasTrainedOnce = true;

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
        updateKKTConditions();

        console.log(`SVM training completed: ${iterations} iterations, Final accuracy: ${(finalAccuracy*100).toFixed(1)}%, Test accuracy: ${(finalTestAcc*100).toFixed(1)}%, Support vectors: ${supportVectors.length}`);

        isTraining = false;

        if (trainBtn) {
            trainBtn.textContent = 'Train SVM (Continue)';
            trainBtn.disabled = false;
        }
    }

    // Initialize kernel approximation for RBF
    function initializeKernelApproximation() {
        // Use Random Fourier Features approximation
        numRandomFeatures = 200; // Good balance between accuracy and speed
        
        // Initialize random weights for Fourier features
        randomWeights = [];
        randomBiases = [];
        
        // Scale gamma based on data distribution
        const effectiveGamma = gamma * 0.5; // Adjust for typical data scale
        
        for (let i = 0; i < numRandomFeatures; i++) {
            // Sample from Gaussian distribution
            const w1 = gaussianRandom() * Math.sqrt(2 * effectiveGamma);
            const w2 = gaussianRandom() * Math.sqrt(2 * effectiveGamma);
            randomWeights.push([w1, w2]);
            
            // Random bias from uniform distribution
            randomBiases.push(Math.random() * 2 * Math.PI);
        }
        
        // Initialize weights for cosine AND sine features
        const totalFeatures = numRandomFeatures * 2;
        approximateWeights = new Array(totalFeatures).fill(0).map(() => gaussianRandom() * 0.01);
        approximateBias = gaussianRandom() * 0.01;
        
        kernelApproximation = true;
        console.log(`Initialized RBF kernel approximation with ${numRandomFeatures} random features (${totalFeatures} total), effective gamma=${effectiveGamma.toFixed(3)}`);
    }

    // Compute approximate features using Random Fourier Features
    function computeApproximateFeatures(x1, x2) {
        const features = [];
        const scale = Math.sqrt(2.0 / numRandomFeatures);
        
        for (let i = 0; i < numRandomFeatures; i++) {
            const projection = randomWeights[i][0] * x1 + randomWeights[i][1] * x2 + randomBiases[i];
            features.push(scale * Math.cos(projection));
            features.push(scale * Math.sin(projection));
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
            const phi = computeApproximateFeatures(x1, x2);
            return computeApproximateDecision(phi);
        }
        return 0;
    }

    // Calculate SVM loss (hinge loss + regularization)
    function calculateSVMLoss() {
        let hingeLoss = 0;
        
        for (const point of data) {
            const decision = computeDecisionFunction(point.x1, point.x2);
            const margin = point.y * decision;
            hingeLoss += Math.max(0, 1 - margin);
        }
        
        // Regularization term
        let regTerm = 0;
        if (kernelType === 'linear') {
            regTerm = 0.5 * (weights.w[0]**2 + weights.w[1]**2);
        } else if (kernelType === 'rbf') {
            for (const w of approximateWeights) {
                regTerm += w * w;
            }
            regTerm *= 0.5;
        }
        
        // Standard SVM loss formulation
        return regTerm + C * hingeLoss / data.length;
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
    function updateSupportVectors() {
        supportVectors = [];
        
        if (!hasTrainedOnce && iterations < 10) return;
        
        for (const point of data) {
            const decision = computeDecisionFunction(point.x1, point.x2);
            const functionalMargin = point.y * decision;
            
            // A point is a support vector if it's within or violating the margin
            if (functionalMargin <= 1.01) { // Small tolerance
                const slack = Math.max(0, 1 - functionalMargin);
                
                supportVectors.push({
                    x1: point.x1,
                    x2: point.x2,
                    y: point.y,
                    margin: functionalMargin,
                    slackVariable: slack,
                    alpha: slack > 0 ? C : C * (1.01 - functionalMargin) / 0.01
                });
            }
        }
        
        // Log only occasionally to avoid spam
        if (iterations % 50 === 0 || !isTraining) {
            const svCount = supportVectors.length;
            const svPercentage = (svCount / data.length * 100).toFixed(1);
            console.log(`Support vectors: ${svCount}/${data.length} (${svPercentage}%)`);
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
        let total = data.length;
        
        for (const point of data) {
            const decision = computeDecisionFunction(point.x1, point.x2);
            const functionalMargin = point.y * decision;
            
            const sv = supportVectors.find(sv => 
                Math.abs(sv.x1 - point.x1) < 1e-6 && Math.abs(sv.x2 - point.x2) < 1e-6);
            
            let conditionsMet = true;
            
            if (!sv) {
                // Non-support vector: should have margin >= 1
                if (functionalMargin < 0.99) {
                    conditionsMet = false;
                }
            } else {
                // Support vector: should be on or within margin
                if (functionalMargin > 1.01 && sv.slackVariable < 1e-6) {
                    conditionsMet = false;
                }
            }
            
            if (conditionsMet) satisfied++;
        }
        
        const percentage = (satisfied / total * 100).toFixed(1);
        html += `<div class="kkt-summary">KKT Satisfied: ${satisfied}/${total} points (${percentage}%)</div>`;
        
        if (kernelType === 'rbf') {
            html += `<div class="kkt-note">Note: Using ${numRandomFeatures * 2} features (Random Fourier approximation)</div>`;
        }
        
        kktConditionsElement.innerHTML = html;
    }

    // RBF kernel function (for visualization purposes)
    function rbfKernel(x1, x2, y1, y2) {
        const diff1 = x1 - y1;
        const diff2 = x2 - y2;
        return Math.exp(-gamma * (diff1 * diff1 + diff2 * diff2));
    }

    // Draw decision boundary and margin
    function drawDecisionBoundary(xRange, yRange) {
        if (!hasTrainedOnce) return;
        
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        if (kernelType === 'linear') {
            drawLinearBoundary(xRange, yRange, xScale, yScale);
        } else {
            drawRBFBoundary(xRange, yRange);
        }
    }

    // Draw linear decision boundary
    function drawLinearBoundary(xRange, yRange, xScale, yScale) {
        if (Math.abs(weights.w[1]) < 1e-6) return; // Avoid division by zero
        
        // Decision boundary: w0*x1 + w1*x2 + b = 0
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
            
            // Draw margins
            drawMarginLine(xRange, yRange, xScale, yScale, 1);
            drawMarginLine(xRange, yRange, xScale, yScale, -1);
        }
    }

    // Draw margin lines for linear SVM
    function drawMarginLine(xRange, yRange, xScale, yScale, offset) {
        if (Math.abs(weights.w[1]) < 1e-6) return;
        
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
            for (const point of points) {
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Draw RBF decision boundary using contours
    function drawRBFBoundary(xRange, yRange) {
        const resolution = 50; // Balance between quality and performance
        const xStep = (xRange.max - xRange.min) / resolution;
        const yStep = (yRange.max - yRange.min) / resolution;
        
        // Create decision value grid
        const grid = [];
        for (let i = 0; i <= resolution; i++) {
            grid[i] = [];
            for (let j = 0; j <= resolution; j++) {
                const x1 = xRange.min + i * xStep;
                const x2 = yRange.min + j * yStep;
                grid[i][j] = computeDecisionFunction(x1, x2);
            }
        }
        
        // Draw background regions
        const imageData = ctx.createImageData(plotWidth, plotHeight);
        for (let px = 0; px < plotWidth; px++) {
            for (let py = 0; py < plotHeight; py++) {
                const x1 = xRange.min + (px / plotWidth) * (xRange.max - xRange.min);
                const x2 = yRange.max - (py / plotHeight) * (yRange.max - yRange.min);
                const decision = computeDecisionFunction(x1, x2);
                
                const idx = (py * plotWidth + px) * 4;
                if (decision < 0) {
                    // Class -1 region (blue)
                    imageData.data[idx] = 52;
                    imageData.data[idx + 1] = 152;
                    imageData.data[idx + 2] = 219;
                    imageData.data[idx + 3] = Math.min(50, Math.abs(decision) * 25);
                } else {
                    // Class +1 region (red)
                    imageData.data[idx] = 231;
                    imageData.data[idx + 1] = 76;
                    imageData.data[idx + 2] = 60;
                    imageData.data[idx + 3] = Math.min(50, Math.abs(decision) * 25);
                }
            }
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = plotWidth;
        tempCanvas.height = plotHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, plotMargin, plotMargin);
        
        // Draw decision boundary contour
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        
        // Find and draw contour lines
        for (let level of [0]) { // Decision boundary at f(x) = 0
            ctx.beginPath();
            let started = false;
            
            for (let i = 0; i < resolution; i++) {
                for (let j = 0; j < resolution; j++) {
                    const val = grid[i][j];
                    const nextI = grid[i + 1] ? grid[i + 1][j] : val;
                    const nextJ = grid[i][j + 1];
                    
                    if ((val < level && nextI >= level) || (val >= level && nextI < level) ||
                        (val < level && nextJ >= level) || (val >= level && nextJ < level)) {
                        const x = plotMargin + (i + 0.5) * xStep * plotWidth / (xRange.max - xRange.min);
                        const y = plotMargin + plotHeight - (j + 0.5) * yStep * plotHeight / (yRange.max - yRange.min);
                        
                        if (!started) {
                            ctx.moveTo(x, y);
                            started = true;
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                }
            }
            ctx.stroke();
        }
    }

    // Draw data points with support vectors highlighted
    function drawDataPoints(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // Draw training points
        for (const point of data) {
            const canvasX = plotMargin + (point.x1 - xRange.min) * xScale;
            const canvasY = canvasHeight - plotMargin - (point.x2 - yRange.min) * yScale;
            
            const isSV = supportVectors.some(sv => 
                Math.abs(sv.x1 - point.x1) < 1e-6 && Math.abs(sv.x2 - point.x2) < 1e-6);
            
            // Set colors
            ctx.fillStyle = point.y === 1 ? '#e74c3c' : '#3498db';
            ctx.strokeStyle = isSV ? '#f39c12' : '#fff';
            ctx.lineWidth = isSV ? 3 : 1;
            
            // Draw point
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, isSV ? 7 : 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        
        // Draw test points
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

    // Calculate range with padding
    function calculateRange(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.15;
        return { min: min - padding, max: max + padding };
    }

    // Draw coordinate axes
    function drawAxes(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // Grid lines
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        
        // Draw grid
        for (let i = 0; i <= 10; i++) {
            const x = plotMargin + (i / 10) * plotWidth;
            const y = plotMargin + (i / 10) * plotHeight;
            
            ctx.beginPath();
            ctx.moveTo(x, plotMargin);
            ctx.lineTo(x, canvasHeight - plotMargin);
            ctx.moveTo(plotMargin, y);
            ctx.lineTo(canvasWidth - plotMargin, y);
            ctx.stroke();
        }
        
        // Draw axes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        
        const xZero = plotMargin + (-xRange.min) * xScale;
        const yZero = canvasHeight - plotMargin - (-yRange.min) * yScale;
        
        ctx.beginPath();
        ctx.moveTo(plotMargin, yZero);
        ctx.lineTo(canvasWidth - plotMargin, yZero);
        ctx.moveTo(xZero, plotMargin);
        ctx.lineTo(xZero, canvasHeight - plotMargin);
        ctx.stroke();
    }

    // Parameter change handlers
    function handleCParameterChange() {
        C = Math.pow(10, parseFloat(cInput.value));
        cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
    }

    function handleLearningRateChange() {
        learningRate = Math.pow(10, parseFloat(learningRateInput.value));
        learningRateDisplay.textContent = learningRate.toFixed(learningRate < 0.01 ? 4 : learningRate < 0.1 ? 3 : 2);
    }

    function handleIterationsChange() {
        maxIterations = parseInt(iterationsInput.value);
        iterationsDisplay.textContent = maxIterations.toString();
    }

    function handleKernelChange() {
        kernelType = kernelSelect.value;
        gammaContainer.style.display = kernelType === 'rbf' ? 'block' : 'none';
        
        // Reset model
        initializeWeights();
        kernelApproximation = false;
        supportVectors = [];
        hasTrainedOnce = false;
        
        // Reset display
        resetDisplay();
        drawCanvas();
    }

    function handleGammaChange() {
        gamma = Math.pow(10, parseFloat(gammaInput.value));
        gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : 2)}`;
        if (kernelType === 'rbf' && hasTrainedOnce) {
            kernelApproximation = false;
        }
    }

    // Reset display metrics
    function resetDisplay() {
        if (accuracyElement) accuracyElement.textContent = '0.0%';
        if (lossElement) lossElement.textContent = '0.000';
        if (testAccuracyElement) testAccuracyElement.textContent = '0.0%';
        if (supportVectorCountElement) supportVectorCountElement.textContent = '0';
        if (kktConditionsElement) {
            kktConditionsElement.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
        }
        if (trainBtn) trainBtn.textContent = 'Train SVM';
    }

    // Generate dataset
    function generateData() {
        const numPoints = 120;
        const trainSize = 80;
        let allPoints = [];
        
        const pattern = Math.random() > 0.5 ? 'linear' : 'circular';
        
        if (pattern === 'linear') {
            // Generate linearly separable data with some overlap
            const w_true = [0.8, 0.5];
            const margin = 0.8;
            
            for (let i = 0; i < numPoints; i++) {
                const x1 = (Math.random() - 0.5) * 4;
                const x2 = (Math.random() - 0.5) * 4;
                
                const decision = w_true[0] * x1 + w_true[1] * x2;
                let y;
                
                if (Math.random() < 0.9) {
                    // 90% clearly separated
                    y = decision > 0 ? 1 : -1;
                    const offset = (Math.random() * 0.5 + 0.5) * margin;
                    const norm = Math.sqrt(w_true[0]**2 + w_true[1]**2);
                    
                    allPoints.push({
                        x1: x1 + y * offset * w_true[0] / norm,
                        x2: x2 + y * offset * w_true[1] / norm,
                        y: y
                    });
                } else {
                    // 10% near boundary
                    y = decision > 0 ? 1 : -1;
                    if (Math.random() < 0.3) y = -y; // Some misclassified
                    allPoints.push({ x1, x2, y });
                }
            }
        } else {
            // Generate circular pattern
            const innerRadius = 0.8;
            const outerRadius = 1.6;
            
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * 2 * Math.PI;
                let radius, y;
                
                if (Math.random() < 0.85) {
                    // 85% clearly separated
                    if (Math.random() < 0.5) {
                        radius = Math.random() * innerRadius * 0.8;
                        y = 1;
                    } else {
                        radius = outerRadius + Math.random() * 0.8;
                        y = -1;
                    }
                } else {
                    // 15% in boundary region
                    radius = innerRadius + Math.random() * (outerRadius - innerRadius);
                    y = radius < (innerRadius + outerRadius) / 2 ? 1 : -1;
                    if (Math.random() < 0.2) y = -y;
                }
                
                const x1 = radius * Math.cos(angle);
                const x2 = radius * Math.sin(angle);
                allPoints.push({ x1, x2, y });
            }
        }
        
        // Shuffle data
        for (let i = allPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]];
        }
        
        // Split into train/test
        data = allPoints.slice(0, trainSize);
        testData = allPoints.slice(trainSize);
        
        console.log(`Generated ${pattern} pattern: ${data.length} training, ${testData.length} test`);
        
        // Reset model
        initializeWeights();
        supportVectors = [];
        hasTrainedOnce = false;
        kernelApproximation = false;
        iterations = 0;
        
        // Reset display
        resetDisplay();
        drawCanvas();
    }

    // Initialize SVM weights
    function initializeWeights() {
        weights.w = [gaussianRandom() * 0.1, gaussianRandom() * 0.1];
        weights.b = gaussianRandom() * 0.1;
        
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

    // Create HTML structure
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
                        <input type="range" id="iterations" min="100" max="1000" step="50" value="500" class="full-width">
                        <span id="iterations-display">500</span>
                    </div>
                    
                    <div class="results-box">
                        <h3>SVM Performance:</h3>
                        <div class="result-row">
                            <div class="result-label">Training Accuracy:</div>
                            <div class="result-value" id="accuracy">0.0%</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Test Accuracy:</div>
                            <div class="result-value" id="test-accuracy">0.0%</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Loss:</div>
                            <div class="result-value" id="loss">0.000</div>
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

    // Add styles
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
        
        .primary-btn:disabled {
            background-color: #95a5a6;
            cursor: not-allowed;
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
    let learningRate = 0.01;
    let maxIterations = 500;
    let kernelType = 'linear';
    let isTraining = false;
    let hasTrainedOnce = false;
    let iterations = 0;
    
    // Kernel approximation variables
    let kernelApproximation = false;
    let numRandomFeatures = 200;
    let randomWeights = [];
    let randomBiases = [];
    let approximateWeights = [];
    let approximateBias = 0;
    
    // Drawing settings
    const plotMargin = 50;
    const plotWidth = canvasWidth - 2 * plotMargin;
    const plotHeight = canvasHeight - 2 * plotMargin;
    
    // Initialize values from inputs
    C = Math.pow(10, parseFloat(cInput.value));
    cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
    gamma = Math.pow(10, parseFloat(gammaInput.value));
    gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : 2)}`;
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