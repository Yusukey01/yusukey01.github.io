// An interactive demo for Support Vector Machines (SVM)

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('svm_visualizer');

    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // SVM training using Stochastic Gradient Descent
    async function trainSVM() {
        if (isTraining) return;
        isTraining = true;
        if (trainBtn) {
            trainBtn.textContent = 'Training...';
            trainBtn.disabled = true;
        }

        let iterations = 0;
        const maxIter = maxIterations;
        let bestAccuracy = 0;
        let stagnantIterations = 0;
        
        console.log(`Starting SVM training with C=${C}, kernel=${kernelType}, lr=${learningRate}`);
        
        while (iterations < maxIter) {
            const previousW = [...weights.w];
            const previousB = weights.b;
            
            // SGD: sample a random point
            const idx = Math.floor(Math.random() * data.length);
            const point = data[idx];
            
            // Compute functional margin
            const decision = computeDecisionFunction(point.x1, point.x2);
            const margin = point.y * decision;
            
            // SGD update rules for SVM
            if (margin < 1) {
                // Point is within margin or misclassified: update both w and b
                for (let i = 0; i < 2; i++) {
                    const feature = i === 0 ? point.x1 : point.x2;
                    weights.w[i] = weights.w[i] - learningRate * (regularizationTerm * weights.w[i] - point.y * feature);
                }
                weights.b = weights.b - learningRate * (-point.y);
            } else {
                // Point is correctly classified with good margin: only regularization
                for (let i = 0; i < 2; i++) {
                    weights.w[i] = weights.w[i] - learningRate * regularizationTerm * weights.w[i];
                }
            }
            
            // Calculate current metrics
            const currentAccuracy = calculateAccuracy();
            const currentLoss = calculateSVMLoss();
            
            // Track improvements
            if (currentAccuracy > bestAccuracy + 0.005) {
                bestAccuracy = currentAccuracy;
                stagnantIterations = 0;
            } else {
                stagnantIterations++;
            }
            
            // Adaptive learning rate
            if (stagnantIterations > 50 && stagnantIterations % 25 === 0) {
                learningRate *= 0.95;
            }
            
            // Early stopping
            if (currentAccuracy > 0.98) {
                console.log(`Early stopping: High accuracy reached (${(currentAccuracy*100).toFixed(1)}%)`);
                break;
            }
            
            if (stagnantIterations > 100) {
                console.log(`Early stopping: No improvement for 100 iterations`);
                break;
            }
            
            // Update display every 10 iterations
            if (iterations % 10 === 0) {
                updateSupportVectors();
                const testAcc = calculateTestAccuracy();
                
                if (accuracyElement) accuracyElement.textContent = (currentAccuracy * 100).toFixed(1) + '%';
                if (lossElement) lossElement.textContent = currentLoss.toFixed(4);
                if (testAccuracyElement) testAccuracyElement.textContent = (testAcc * 100).toFixed(1) + '%';
                if (supportVectorCountElement) supportVectorCountElement.textContent = supportVectors.length.toString();
                
                drawCanvas();
                
                if (iterations % 25 === 0) {
                    console.log(`Iteration ${iterations}: Loss=${currentLoss.toFixed(4)}, Accuracy=${(currentAccuracy*100).toFixed(1)}%, Support Vectors=${supportVectors.length}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 5));
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
        updateKKTConditions();

        console.log(`SVM training completed: ${iterations} iterations, Final accuracy: ${(finalAccuracy*100).toFixed(1)}%, Support vectors: ${supportVectors.length}`);

        isTraining = false;
        hasTrainedOnce = true;

        if (trainBtn) {
            trainBtn.textContent = hasTrainedOnce ? 'Train SVM (Continue)' : 'Train SVM';
            trainBtn.disabled = false;
        }
    }

    // Compute decision function value
    function computeDecisionFunction(x1, x2) {
        if (kernelType === 'linear') {
            return weights.w[0] * x1 + weights.w[1] * x2 + weights.b;
        } else if (kernelType === 'rbf') {
            // For RBF kernel, use support vector representation
            let result = 0;
            for (const sv of supportVectors) {
                const k = rbfKernel(x1, x2, sv.x1, sv.x2);
                result += sv.alpha * sv.y * k;
            }
            return result + weights.b;
        }
        return 0;
    }

    // RBF kernel function
    function rbfKernel(x1, x2, xi1, xi2) {
        const diff1 = x1 - xi1;
        const diff2 = x2 - xi2;
        const distSq = diff1 * diff1 + diff2 * diff2;
        return Math.exp(-gamma * distSq);
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

    // Calculate SVM loss (hinge loss + regularization)
    function calculateSVMLoss() {
        let hingeLoss = 0;
        for (const point of data) {
            const decision = computeDecisionFunction(point.x1, point.x2);
            const margin = point.y * decision;
            if (margin < 1) {
                hingeLoss += (1 - margin);
            }
        }
        
        // Regularization term
        const regTerm = kernelType === 'linear' ? 
            0.5 * (weights.w[0] * weights.w[0] + weights.w[1] * weights.w[1]) :
            0.5 * supportVectors.reduce((sum, sv) => sum + sv.alpha * sv.alpha, 0);
        
        return C * hingeLoss / data.length + regTerm;
    }

    // Update support vectors based on current model
    function updateSupportVectors() {
        supportVectors = [];
        
        // Don't identify support vectors if model hasn't been trained
        if (!hasTrainedOnce) {
            return;
        }
        
        // Calculate decision values for all points to get proper scaling
        const allDecisions = data.map(point => {
            const decision = computeDecisionFunction(point.x1, point.x2);
            return { point, decision, margin: point.y * decision };
        });
        
        // Sort by margin to find the points closest to the decision boundary
        allDecisions.sort((a, b) => a.margin - b.margin);
        
        for (const item of allDecisions) {
            const { point, decision, margin } = item;
            
            // A point is a support vector if:
            // 1. It's misclassified (margin < 0)
            // 2. It's exactly on the margin boundary (margin ≈ 1)
            // 3. It's within the margin (0 < margin < 1)
            // But NOT if it's well beyond the margin (margin > 1.1)
            
            const isSupporVector = margin < 1.05; // Stricter threshold
            
            if (isSupporVector) {
                const alpha = Math.max(0, C * Math.max(0, 1 - margin)); // More realistic alpha
                const slackVar = Math.max(0, 1 - margin);
                
                supportVectors.push({
                    x1: point.x1,
                    x2: point.x2,
                    y: point.y,
                    alpha: alpha,
                    slackVariable: slackVar,
                    margin: margin
                });
            }
        }
        
        console.log(`Updated support vectors: ${supportVectors.length}/${data.length} points (${(supportVectors.length/data.length*100).toFixed(1)}%)`);
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
            const margin = point.y * decision;
            const sv = supportVectors.find(sv => sv.x1 === point.x1 && sv.x2 === point.x2);
            const alpha = sv ? sv.alpha : 0;
            
            total++;
            
            // KKT conditions for SVM
            let conditionsMet = true;
            
            // 1. α ≥ 0
            if (alpha < -1e-6) conditionsMet = false;
            
            // 2. yi(w·xi + b) ≥ 1 - ξi (feasibility)
            const slackVar = Math.max(0, 1 - margin);
            if (margin < 1 - slackVar - 1e-6) conditionsMet = false;
            
            // 3. Complementary slackness: α(yi(w·xi + b) - 1 + ξi) = 0
            if (alpha > 1e-6 && Math.abs(margin - 1 + slackVar) > 1e-3) conditionsMet = false;
            
            if (conditionsMet) satisfied++;
        }
        
        const percentage = total > 0 ? (satisfied / total * 100).toFixed(1) : '0.0';
        html += `<div class="kkt-summary">Satisfied: ${satisfied}/${total} points (${percentage}%)</div>`;
        
        // Show support vector details
        if (supportVectors.length > 0) {
            html += '<div class="sv-details"><h5>Support Vectors:</h5>';
            for (let i = 0; i < Math.min(supportVectors.length, 5); i++) {
                const sv = supportVectors[i];
                html += `<div class="sv-item">α=${sv.alpha.toFixed(3)}, ξ=${sv.slackVariable.toFixed(3)}, margin=${sv.margin.toFixed(3)}</div>`;
            }
            if (supportVectors.length > 5) {
                html += `<div class="sv-item">... and ${supportVectors.length - 5} more</div>`;
            }
            html += '</div>';
        } else {
            html += '<div class="sv-details">No support vectors found yet.</div>';
        }
        
        kktConditionsElement.innerHTML = html;
    }

    // Draw decision boundary and margin
    function drawDecisionBoundary(xRange, yRange) {
        // Only draw decision boundary if model has been trained
        if (!hasTrainedOnce) {
            return;
        }
        
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // For linear SVM, draw analytical solution
        if (kernelType === 'linear' && weights.w[0] !== 0 && weights.w[1] !== 0) {
            drawLinearBoundary(xRange, yRange, xScale, yScale);
        } else {
            // For RBF or when linear solution is degenerate, draw contour
            drawContourBoundary(xRange, yRange);
        }
    }

    // Draw linear decision boundary
    function drawLinearBoundary(xRange, yRange, xScale, yScale) {
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
            drawMarginBoundaries(xRange, yRange, xScale, yScale, 1);
            drawMarginBoundaries(xRange, yRange, xScale, yScale, -1);
        }
    }

    // Draw margin boundaries
    function drawMarginBoundaries(xRange, yRange, xScale, yScale, offset) {
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

    // Draw contour-based decision boundary (for RBF kernel)
    function drawContourBoundary(xRange, yRange) {
        const contourCanvas = document.createElement('canvas');
        contourCanvas.width = plotWidth;
        contourCanvas.height = plotHeight;
        const contourCtx = contourCanvas.getContext('2d');
        
        const imageData = contourCtx.createImageData(plotWidth, plotHeight);
        
        for (let i = 0; i < plotWidth; i++) {
            for (let j = 0; j < plotHeight; j++) {
                const x1 = xRange.min + (i / plotWidth) * (xRange.max - xRange.min);
                const x2 = yRange.max - (j / plotHeight) * (yRange.max - yRange.min);
                const decision = computeDecisionFunction(x1, x2);
                const pixelIndex = (j * plotWidth + i) * 4;
                
                if (decision < 0) {
                    imageData.data[pixelIndex] = 52; // Blue for class -1
                    imageData.data[pixelIndex + 1] = 152;
                    imageData.data[pixelIndex + 2] = 219;
                    imageData.data[pixelIndex + 3] = Math.round(Math.min(255 * Math.abs(decision) * 0.1, 127));
                } else {
                    imageData.data[pixelIndex] = 231; // Red for class +1
                    imageData.data[pixelIndex + 1] = 76;
                    imageData.data[pixelIndex + 2] = 60;
                    imageData.data[pixelIndex + 3] = Math.round(Math.min(255 * Math.abs(decision) * 0.1, 127));
                }
            }
        }
        
        contourCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(contourCanvas, 0, 0, plotWidth, plotHeight, plotMargin, plotMargin, plotWidth, plotHeight);
        
        // Draw decision boundary contour
        drawBoundaryContour(xRange, yRange);
    }

    // Draw the decision boundary as a contour line
    function drawBoundaryContour(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        
        const points = [];
        const resolution = 80;
        
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
        
        // Draw boundary points
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
            
            // Check if this point is a support vector (only if model has been trained)
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
            
            // Draw slack variable visualization for misclassified support vectors
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
        regularizationTerm = 1.0 / C; // For SGD formulation
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
        initializeWeights();
        drawCanvas();
    }

    function handleGammaChange() {
        gamma = Math.pow(10, parseFloat(gammaInput.value));
        gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : gamma < 1 ? 2 : 1)}`;
    }

    // Generate dataset
    function generateData() {
        const numPoints = 80;
        const trainSize = 60;
        let allPoints = [];
        
        const pattern = Math.random() > 0.5 ? 'linear' : 'circular';
        
        hasTrainedOnce = false;
        if (trainBtn) trainBtn.textContent = 'Train SVM';
        
        if (pattern === 'linear') {
            // Linearly separable data with some noise
            for (let i = 0; i < numPoints; i++) {
                const x1 = (Math.random() - 0.5) * 4;
                const x2 = (Math.random() - 0.5) * 4;
                
                // Simple linear separation with some noise
                const boundary = 0.5 * x1 + 0.3 * x2 + Math.random() * 0.3 - 0.15;
                const y = boundary > 0 ? 1 : -1;
                
                allPoints.push({ x1, x2, y });
            }
        } else {
            // Circular pattern - better for RBF kernel
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 2;
                const x1 = radius * Math.cos(angle);
                const x2 = radius * Math.sin(angle);
                
                // Circular boundary
                const y = (x1 * x1 + x2 * x2) < 1.5 ? 1 : -1;
                
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
        
        // Initialize weights
        initializeWeights();
        supportVectors = [];
        hasTrainedOnce = false; // Reset training state
        
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
        if (kernelType === 'linear') {
            // Initialize linear SVM weights
            weights.w = [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1];
            weights.b = Math.random() * 0.2 - 0.1;
        } else {
            // For RBF kernel, we'll use support vector representation
            weights.w = [0, 0]; // Not used for RBF
            weights.b = 0;
        }
        
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
    let data = []; // Training data
    let testData = []; // Test data
    let weights = { w: [0, 0], b: 0 }; // SVM weights
    let supportVectors = []; // Support vectors
    let C = 1.0; // Regularization parameter
    let gamma = 0.32; // RBF kernel parameter
    let regularizationTerm = 1.0; // 1/C for SGD
    let learningRate = 0.01;
    let maxIterations = 300;
    let kernelType = 'linear';
    let isTraining = false;
    let hasTrainedOnce = false;
    
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