// RBF Kernel SVM with SMO (Sequential Minimal Optimization) solver
// Solves the dual problem to properly handle kernels and KKT conditions

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('svm_visualizer');
    
    if (!container) {
        console.error('Container element not found!');
        return;
    }

    // RBF Kernel SVM using SMO algorithm
    class RBFKernelSVM {
        constructor(C = 1.0, gamma = 0.5, tol = 0.001, maxPasses = 100) {
            this.C = C;
            this.gamma = gamma;
            this.tol = tol;
            this.maxPasses = maxPasses;
            this.b = 0;
            this.X = [];
            this.y = [];
            this.alphas = [];
            this.kernelCache = new Map();
            this.errorCache = new Map();
        }

        // RBF kernel function K(x1, x2) = exp(-gamma * ||x1 - x2||^2)
        kernel(x1, x2) {
            const key = `${x1.x1},${x1.x2}-${x2.x1},${x2.x2}`;
            if (this.kernelCache.has(key)) {
                return this.kernelCache.get(key);
            }
            
            const diff1 = x1.x1 - x2.x1;
            const diff2 = x1.x2 - x2.x2;
            const distSq = diff1 * diff1 + diff2 * diff2;
            const result = Math.exp(-this.gamma * distSq);
            
            this.kernelCache.set(key, result);
            return result;
        }

        // Compute decision function f(x) = Σ αᵢyᵢK(xᵢ,x) + b
        decisionFunction(x) {
            let result = 0;
            for (let i = 0; i < this.X.length; i++) {
                if (this.alphas[i] > 0) {
                    result += this.alphas[i] * this.y[i] * this.kernel(this.X[i], x);
                }
            }
            return result + this.b;
        }

        // Compute error E_i = f(x_i) - y_i
        computeError(i) {
            if (this.errorCache.has(i)) {
                return this.errorCache.get(i);
            }
            
            const error = this.decisionFunction(this.X[i]) - this.y[i];
            this.errorCache.set(i, error);
            return error;
        }

        // Select second alpha using maximum step heuristic
        selectSecondAlpha(i1, E1) {
            let i2 = -1;
            let maxStep = 0;
            let E2 = 0;

            // Try to select alpha that maximizes |E1 - E2|
            for (let i = 0; i < this.X.length; i++) {
                if (i === i1) continue;
                
                const tempE2 = this.computeError(i);
                const step = Math.abs(E1 - tempE2);
                
                if (step > maxStep) {
                    maxStep = step;
                    i2 = i;
                    E2 = tempE2;
                }
            }

            // If no good second alpha found, select randomly
            if (i2 === -1) {
                do {
                    i2 = Math.floor(Math.random() * this.X.length);
                } while (i2 === i1);
                E2 = this.computeError(i2);
            }

            return { i2, E2 };
        }

        // Take optimization step for alpha pair
        takeStep(i1, i2) {
            if (i1 === i2) return false;

            const alpha1 = this.alphas[i1];
            const alpha2 = this.alphas[i2];
            const y1 = this.y[i1];
            const y2 = this.y[i2];
            const E1 = this.computeError(i1);
            const E2 = this.computeError(i2);

            const s = y1 * y2;

            // Compute bounds L and H
            let L, H;
            if (y1 !== y2) {
                L = Math.max(0, alpha2 - alpha1);
                H = Math.min(this.C, this.C + alpha2 - alpha1);
            } else {
                L = Math.max(0, alpha2 + alpha1 - this.C);
                H = Math.min(this.C, alpha2 + alpha1);
            }

            if (L === H) return false;

            // Compute eta (second derivative)
            const k11 = this.kernel(this.X[i1], this.X[i1]);
            const k12 = this.kernel(this.X[i1], this.X[i2]);
            const k22 = this.kernel(this.X[i2], this.X[i2]);
            const eta = k11 + k22 - 2 * k12;

            let alpha2New;
            if (eta > 0) {
                // Normal case
                alpha2New = alpha2 + y2 * (E1 - E2) / eta;
                alpha2New = Math.min(H, Math.max(L, alpha2New));
            } else {
                // Unusual case: eta <= 0
                // Try the endpoints
                const f1 = y1 * (E1 + this.b) - alpha1 * k11 - s * alpha2 * k12;
                const f2 = y2 * (E2 + this.b) - s * alpha1 * k12 - alpha2 * k22;
                const L1 = alpha1 + s * (alpha2 - L);
                const H1 = alpha1 + s * (alpha2 - H);
                const objL = L1 * f1 + L * f2 + 0.5 * L1 * L1 * k11 + 0.5 * L * L * k22 + s * L * L1 * k12;
                const objH = H1 * f1 + H * f2 + 0.5 * H1 * H1 * k11 + 0.5 * H * H * k22 + s * H * H1 * k12;
                
                if (objL < objH - 1e-8) {
                    alpha2New = L;
                } else if (objL > objH + 1e-8) {
                    alpha2New = H;
                } else {
                    alpha2New = alpha2;
                }
            }

            // Check if change is significant
            if (Math.abs(alpha2New - alpha2) < 1e-8 * (alpha2 + alpha2New + 1e-8)) {
                return false;
            }

            // Update alpha1
            const alpha1New = alpha1 + s * (alpha2 - alpha2New);

            // Update threshold b
            const b1 = E1 + y1 * (alpha1New - alpha1) * k11 + y2 * (alpha2New - alpha2) * k12 + this.b;
            const b2 = E2 + y1 * (alpha1New - alpha1) * k12 + y2 * (alpha2New - alpha2) * k22 + this.b;

            if (0 < alpha1New && alpha1New < this.C) {
                this.b = b1;
            } else if (0 < alpha2New && alpha2New < this.C) {
                this.b = b2;
            } else {
                this.b = (b1 + b2) / 2;
            }

            // Update alphas
            this.alphas[i1] = alpha1New;
            this.alphas[i2] = alpha2New;

            // Clear error cache for updated alphas
            this.errorCache.delete(i1);
            this.errorCache.delete(i2);

            return true;
        }

        // Examine if alpha violates KKT conditions
        examineAlpha(i2) {
            const y2 = this.y[i2];
            const alpha2 = this.alphas[i2];
            const E2 = this.computeError(i2);
            const r2 = E2 * y2;

            // Check KKT conditions:
            // α = 0 => yf(x) ≥ 1
            // 0 < α < C => yf(x) = 1
            // α = C => yf(x) ≤ 1
            if ((r2 < -this.tol && alpha2 < this.C) || (r2 > this.tol && alpha2 > 0)) {
                // Select best i1
                let i1 = -1;
                
                // Try non-boundary alphas first
                const nonBoundary = [];
                for (let i = 0; i < this.X.length; i++) {
                    if (this.alphas[i] > 0 && this.alphas[i] < this.C) {
                        nonBoundary.push(i);
                    }
                }

                if (nonBoundary.length > 1) {
                    const { i2: bestI1 } = this.selectSecondAlpha(i2, E2);
                    if (this.takeStep(bestI1, i2)) return 1;
                }

                // Try all non-boundary alphas
                for (const i of nonBoundary) {
                    if (this.takeStep(i, i2)) return 1;
                }

                // Try all alphas
                const startPoint = Math.floor(Math.random() * this.X.length);
                for (let i = 0; i < this.X.length; i++) {
                    i1 = (startPoint + i) % this.X.length;
                    if (this.takeStep(i1, i2)) return 1;
                }
            }
            return 0;
        }

        // Main SMO training loop
        train(data) {
            // Initialize
            this.X = data.map(point => ({ x1: point.x1, x2: point.x2 }));
            this.y = data.map(point => point.y);
            this.alphas = new Array(data.length).fill(0);
            this.b = 0;
            this.kernelCache.clear();
            this.errorCache.clear();

            let passes = 0;
            let examineAll = true;
            let numChanged = 0;

            console.log(`Starting SMO training with C=${this.C}, gamma=${this.gamma}`);

            while (passes < this.maxPasses && (numChanged > 0 || examineAll)) {
                numChanged = 0;

                if (examineAll) {
                    // Examine all training examples
                    for (let i = 0; i < this.X.length; i++) {
                        numChanged += this.examineAlpha(i);
                    }
                } else {
                    // Examine only non-boundary alphas
                    for (let i = 0; i < this.X.length; i++) {
                        if (this.alphas[i] > 0 && this.alphas[i] < this.C) {
                            numChanged += this.examineAlpha(i);
                        }
                    }
                }

                if (examineAll) {
                    examineAll = false;
                } else if (numChanged === 0) {
                    examineAll = true;
                }

                passes++;
                
                if (passes % 10 === 0) {
                    const svCount = this.alphas.filter(a => a > 1e-8).length;
                    console.log(`SMO pass ${passes}: ${svCount} support vectors`);
                }
            }

            console.log(`SMO training completed in ${passes} passes`);
            return this.getSupportVectors();
        }

        // Get support vectors with proper alpha values
        getSupportVectors() {
            const supportVectors = [];
            
            for (let i = 0; i < this.X.length; i++) {
                if (this.alphas[i] > 1e-8) {
                    const functionalMargin = this.y[i] * this.decisionFunction(this.X[i]);
                    const slackVariable = Math.max(0, 1 - functionalMargin);
                    
                    supportVectors.push({
                        x1: this.X[i].x1,
                        x2: this.X[i].x2,
                        y: this.y[i],
                        alpha: this.alphas[i],
                        slackVariable: slackVariable,
                        margin: functionalMargin,
                        index: i
                    });
                }
            }
            
            return supportVectors;
        }

        // Check KKT conditions
        checkKKTConditions(data) {
            let satisfied = 0;
            let total = data.length;
            const results = [];

            for (let i = 0; i < data.length; i++) {
                const point = { x1: data[i].x1, x2: data[i].x2 };
                const y = data[i].y;
                const alpha = this.alphas[i] || 0;
                const functionalMargin = y * this.decisionFunction(point);
                
                let violated = false;
                let violation = "";

                // KKT conditions:
                // 1. α = 0 => yf(x) ≥ 1
                // 2. 0 < α < C => yf(x) = 1 
                // 3. α = C => yf(x) ≤ 1
                
                if (alpha < 1e-8) {
                    // α = 0
                    if (functionalMargin < 1 - this.tol) {
                        violated = true;
                        violation = `α=0 but yf(x)=${functionalMargin.toFixed(3)} < 1`;
                    }
                } else if (alpha > this.C - 1e-8) {
                    // α = C
                    if (functionalMargin > 1 + this.tol) {
                        violated = true;
                        violation = `α=C but yf(x)=${functionalMargin.toFixed(3)} > 1`;
                    }
                } else {
                    // 0 < α < C
                    if (Math.abs(functionalMargin - 1) > this.tol) {
                        violated = true;
                        violation = `0<α<C but yf(x)=${functionalMargin.toFixed(3)} ≠ 1`;
                    }
                }

                if (!violated) satisfied++;
                
                results.push({
                    satisfied: !violated,
                    alpha: alpha,
                    margin: functionalMargin,
                    violation: violation
                });
            }

            return { satisfied, total, percentage: (satisfied / total * 100), results };
        }

        // Calculate accuracy
        calculateAccuracy(data) {
            let correct = 0;
            for (const point of data) {
                const prediction = this.predict(point);
                if (prediction === point.y) correct++;
            }
            return data.length > 0 ? correct / data.length : 0;
        }

        // Predict class for a point
        predict(point) {
            const decision = this.decisionFunction(point);
            return decision >= 0 ? 1 : -1;
        }
    }

    // State variables
    let svmModel = null;
    let data = [];
    let testData = [];
    let supportVectors = [];
    let isTraining = false;
    
    // Parameters
    let C = 1.0;
    let gamma = 0.5;
    
    // Training function
    async function trainSVM() {
        if (isTraining) return;
        isTraining = true;
        
        if (trainBtn) {
            trainBtn.textContent = 'Training...';
            trainBtn.disabled = true;
        }

        // Create and train model
        svmModel = new RBFKernelSVM(C, gamma, 0.001, 100);
        
        // Run training in next tick to allow UI update
        await new Promise(resolve => setTimeout(resolve, 10));
        
        supportVectors = svmModel.train(data);
        
        // Update metrics
        const trainAccuracy = svmModel.calculateAccuracy(data);
        const testAccuracy = svmModel.calculateAccuracy(testData);
        const kktCheck = svmModel.checkKKTConditions(data);
        
        if (accuracyElement) accuracyElement.textContent = (trainAccuracy * 100).toFixed(1) + '%';
        if (testAccuracyElement) testAccuracyElement.textContent = (testAccuracy * 100).toFixed(1) + '%';
        if (supportVectorCountElement) supportVectorCountElement.textContent = supportVectors.length.toString();
        
        // Update KKT conditions display
        updateKKTDisplay(kktCheck);
        
        drawCanvas();
        
        console.log(`Training completed: ${supportVectors.length} support vectors, Train accuracy: ${(trainAccuracy*100).toFixed(1)}%`);

        isTraining = false;
        if (trainBtn) {
            trainBtn.textContent = 'Train RBF-SVM';
            trainBtn.disabled = false;
        }
    }

    // Update KKT conditions display
    function updateKKTDisplay(kktCheck) {
        if (!kktConditionsElement) return;
        
        let html = '<h4>KKT Conditions Check:</h4>';
        html += `<div class="kkt-summary">KKT Satisfied: ${kktCheck.satisfied}/${kktCheck.total} points (${kktCheck.percentage.toFixed(1)}%)</div>`;
        
        // Show breakdown
        const nonSV = kktCheck.results.filter(r => r.alpha < 1e-8).length;
        const boundarySV = kktCheck.results.filter(r => r.alpha > 1e-8 && r.alpha < C - 1e-8).length;
        const boundedSV = kktCheck.results.filter(r => r.alpha > C - 1e-8).length;
        
        html += '<div class="kkt-breakdown">';
        html += `<div>• Non-support vectors (α=0): ${nonSV}</div>`;
        html += `<div>• Boundary SVs (0<α<C): ${boundarySV}</div>`;
        html += `<div>• Bounded SVs (α=C): ${boundedSV}</div>`;
        html += '</div>';
        
        // Show some violations if any
        const violations = kktCheck.results.filter(r => !r.satisfied).slice(0, 3);
        if (violations.length > 0) {
            html += '<div class="kkt-violations"><h5>Sample violations:</h5>';
            for (const v of violations) {
                html += `<div class="violation-item">${v.violation}</div>`;
            }
            html += '</div>';
        }
        
        kktConditionsElement.innerHTML = html;
    }

    // Draw decision boundary using contours
    function drawDecisionBoundary(xRange, yRange) {
        if (!svmModel) return;
        
        const resolution = 50;
        const xStep = (xRange.max - xRange.min) / resolution;
        const yStep = (yRange.max - yRange.min) / resolution;
        
        // Create a canvas for the background
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = plotWidth;
        bgCanvas.height = plotHeight;
        const bgCtx = bgCanvas.getContext('2d');
        const imageData = bgCtx.createImageData(plotWidth, plotHeight);
        
        // Compute decision values for background
        for (let i = 0; i < plotWidth; i++) {
            for (let j = 0; j < plotHeight; j++) {
                const x1 = xRange.min + (i / plotWidth) * (xRange.max - xRange.min);
                const x2 = yRange.max - (j / plotHeight) * (yRange.max - yRange.min);
                const decision = svmModel.decisionFunction({ x1, x2 });
                
                const pixelIndex = (j * plotWidth + i) * 4;
                
                // Color based on decision value
                const intensity = Math.min(Math.abs(decision) * 0.1, 1);
                if (decision < 0) {
                    imageData.data[pixelIndex] = 52;
                    imageData.data[pixelIndex + 1] = 152;
                    imageData.data[pixelIndex + 2] = 219;
                    imageData.data[pixelIndex + 3] = Math.floor(intensity * 100);
                } else {
                    imageData.data[pixelIndex] = 231;
                    imageData.data[pixelIndex + 1] = 76;
                    imageData.data[pixelIndex + 2] = 60;
                    imageData.data[pixelIndex + 3] = Math.floor(intensity * 100);
                }
            }
        }
        
        bgCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(bgCanvas, 0, 0, plotWidth, plotHeight, plotMargin, plotMargin, plotWidth, plotHeight);
        
        // Draw decision boundary contour
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        
        // Find contour points
        const contourPoints = [];
        for (let i = 0; i <= resolution; i++) {
            for (let j = 0; j <= resolution; j++) {
                const x1 = xRange.min + i * xStep;
                const x2 = yRange.min + j * yStep;
                const decision = svmModel.decisionFunction({ x1, x2 });
                
                if (Math.abs(decision) < 0.1) {
                    const canvasX = plotMargin + (x1 - xRange.min) * plotWidth / (xRange.max - xRange.min);
                    const canvasY = canvasHeight - plotMargin - (x2 - yRange.min) * plotHeight / (yRange.max - yRange.min);
                    contourPoints.push({ x: canvasX, y: canvasY });
                }
            }
        }
        
        // Draw contour points
        ctx.fillStyle = '#2c3e50';
        for (const point of contourPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Draw data points with support vectors highlighted
    function drawDataPoints(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // Draw all data points
        for (const point of data) {
            const canvasX = plotMargin + (point.x1 - xRange.min) * xScale;
            const canvasY = canvasHeight - plotMargin - (point.x2 - yRange.min) * yScale;
            
            // Check if this is a support vector
            const sv = supportVectors.find(s => 
                Math.abs(s.x1 - point.x1) < 1e-6 && Math.abs(s.x2 - point.x2) < 1e-6);
            
            ctx.fillStyle = point.y === 1 ? '#e74c3c' : '#3498db';
            
            if (sv) {
                // Support vector - draw with highlight
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 3;
                
                // Indicate if it's bounded (α = C)
                if (sv.alpha > C - 1e-6) {
                    ctx.setLineDash([5, 3]);
                }
            } else {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
            }
            
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, sv ? 7 : 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw test data
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

    // Main draw function
    function drawCanvas() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const xRange = calculateRange(data.concat(testData).map(p => p.x1));
        const yRange = calculateRange(data.concat(testData).map(p => p.x2));
        
        drawAxes(xRange, yRange);
        
        if (svmModel) {
            drawDecisionBoundary(xRange, yRange);
        }
        
        drawDataPoints(xRange, yRange);
    }

    // Calculate range with padding
    function calculateRange(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.15;
        return { min: min - padding, max: max + padding };
    }

    // Draw axes
    function drawAxes(xRange, yRange) {
        const xScale = plotWidth / (xRange.max - xRange.min);
        const yScale = plotHeight / (yRange.max - yRange.min);
        
        // Draw grid
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 10; i++) {
            const x = plotMargin + (i / 10) * plotWidth;
            const y = plotMargin + (i / 10) * plotHeight;
            
            ctx.beginPath();
            ctx.moveTo(plotMargin, y);
            ctx.lineTo(canvasWidth - plotMargin, y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x, plotMargin);
            ctx.lineTo(x, canvasHeight - plotMargin);
            ctx.stroke();
        }
        
        // Draw main axes
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        
        const xZero = plotMargin + (-xRange.min) * xScale;
        const yZero = canvasHeight - plotMargin - (-yRange.min) * yScale;
        
        ctx.beginPath();
        ctx.moveTo(plotMargin, yZero);
        ctx.lineTo(canvasWidth - plotMargin, yZero);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(xZero, plotMargin);
        ctx.lineTo(xZero, canvasHeight - plotMargin);
        ctx.stroke();
    }

    // Generate nonlinear dataset
    function generateData() {
        const numPoints = 120;
        const trainSize = 80;
        let allPoints = [];
        
        const pattern = Math.random() > 0.5 ? 'circles' : 'moons';
        
        if (pattern === 'circles') {
            // Circular pattern
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * 2 * Math.PI;
                let radius, y;
                
                if (Math.random() < 0.5) {
                    // Inner circle
                    radius = 0.6 + (Math.random() - 0.5) * 0.4;
                    y = 1;
                } else {
                    // Outer circle
                    radius = 1.5 + (Math.random() - 0.5) * 0.6;
                    y = -1;
                }
                
                const x1 = radius * Math.cos(angle);
                const x2 = radius * Math.sin(angle);
                allPoints.push({ x1, x2, y });
            }
        } else {
            // Two moons pattern
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * Math.PI;
                const radius = 1 + (Math.random() - 0.5) * 0.3;
                
                if (Math.random() < 0.5) {
                    // Upper moon
                    const x1 = radius * Math.cos(angle);
                    const x2 = radius * Math.sin(angle);
                    allPoints.push({ x1, x2, y: 1 });
                } else {
                    // Lower moon
                    const x1 = radius * Math.cos(angle) + 0.5;
                    const x2 = -radius * Math.sin(angle) - 0.5;
                    allPoints.push({ x1, x2, y: -1 });
                }
            }
        }
        
        // Shuffle and split
        for (let i = allPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]];
        }
        
        data = allPoints.slice(0, trainSize);
        testData = allPoints.slice(trainSize);
        
        svmModel = null;
        supportVectors = [];
        
        // Reset displays
        if (accuracyElement) accuracyElement.textContent = '0.0%';
        if (testAccuracyElement) testAccuracyElement.textContent = '0.0%';
        if (supportVectorCountElement) supportVectorCountElement.textContent = '0';
        if (kktConditionsElement) {
            kktConditionsElement.innerHTML = '<h4>KKT Conditions:</h4><div>Train the model to see KKT conditions</div>';
        }
        
        drawCanvas();
        
        console.log(`Generated ${pattern} pattern: ${data.length} training, ${testData.length} test`);
    }

    // Parameter handlers
    function handleCParameterChange() {
        C = Math.pow(10, parseFloat(cInput.value));
        cDisplay.textContent = `C = ${C.toFixed(C < 0.01 ? 4 : C < 0.1 ? 3 : C < 1 ? 2 : 1)}`;
    }

    function handleGammaChange() {
        gamma = Math.pow(10, parseFloat(gammaInput.value));
        gammaDisplay.textContent = `γ = ${gamma.toFixed(gamma < 0.01 ? 4 : gamma < 0.1 ? 3 : gamma < 1 ? 2 : 1)}`;
    }

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
                        <div class="instruction">RBF Kernel SVM - Nonlinear Classification with Dual Problem</div>
                        <div id="canvas-wrapper">
                            <canvas id="svm-canvas" width="800" height="500"></canvas>
                        </div>
                        <div class="legend">
                            <div class="legend-item"><span class="legend-color class-pos"></span> Train Class +1</div>
                            <div class="legend-item"><span class="legend-color class-neg"></span> Train Class -1</div>
                            <div class="legend-item"><span class="legend-color test-pos"></span> Test Class +1</div>
                            <div class="legend-item"><span class="legend-color test-neg"></span> Test Class -1</div>
                            <div class="legend-item"><span class="legend-color support-vector"></span> Support Vector</div>
                            <div class="legend-item"><span class="legend-color bounded-sv"></span> Bounded SV (α=C)</div>
                        </div>
                        <div class="btn-container">
                            <button id="train-btn" class="primary-btn">Train RBF-SVM</button>
                            <button id="generate-btn" class="secondary-btn">Generate New Data</button>
                        </div>
                    </div>
                </div>

                <div class="controls-panel">
                    <div class="control-group">
                        <label for="c-parameter">Regularization (C):</label>
                        <input type="range" id="c-parameter" min="-2" max="3" step="0.1" value="0" class="full-width">
                        <span id="c-display">C = 1.0</span>
                        <div class="param-hint">Higher C = Less regularization, tighter fit</div>
                    </div>

                    <div class="control-group">
                        <label for="gamma-parameter">RBF Gamma (γ):</label>
                        <input type="range" id="gamma-parameter" min="-2" max="1" step="0.1" value="-0.3" class="full-width">
                        <span id="gamma-display">γ = 0.50</span>
                        <div class="param-hint">Higher γ = More complex decision boundary</div>
                    </div>
                    
                    <div class="results-box">
                        <h3>Model Performance:</h3>
                        <div class="result-row">
                            <div class="result-label">Train Accuracy:</div>
                            <div class="result-value" id="accuracy">0.0%</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Test Accuracy:</div>
                            <div class="result-value" id="test-accuracy">0.0%</div>
                        </div>
                        <div class="result-row">
                            <div class="result-label">Support Vectors:</div>
                            <div class="result-value" id="support-vector-count">0</div>
                        </div>
                        <div class="result-hint">Uses SMO algorithm to solve the dual problem</div>
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
            }
            
            .controls-panel {
                flex: 2;
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
        
        .legend-color.bounded-sv {
            background-color: #f39c12;
            border: 2px dashed #f39c12;
            border-radius: 50%;
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
        
        .kkt-violations {
            margin-top: 10px;
        }
        
        .kkt-violations h5 {
            margin: 0 0 5px 0;
            font-size: 0.9rem;
            color: #e74c3c;
        }
        
        .violation-item {
            font-family: monospace;
            font-size: 0.8rem;
            color: #e74c3c;
            margin: 2px 0;
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
    const cInput = document.getElementById('c-parameter');
    const cDisplay = document.getElementById('c-display');
    const gammaInput = document.getElementById('gamma-parameter');
    const gammaDisplay = document.getElementById('gamma-display');
    const trainBtn = document.getElementById('train-btn');
    const generateBtn = document.getElementById('generate-btn');

    // Result elements
    const accuracyElement = document.getElementById('accuracy');
    const testAccuracyElement = document.getElementById('test-accuracy');
    const supportVectorCountElement = document.getElementById('support-vector-count');
    const kktConditionsElement = document.getElementById('kkt-conditions');
    
    // Drawing settings
    const plotMargin = 50;
    const plotWidth = canvasWidth - 2 * plotMargin;
    const plotHeight = canvasHeight - 2 * plotMargin;
    
    // Initialize
    C = Math.pow(10, parseFloat(cInput.value));
    cDisplay.textContent = `C = ${C.toFixed(1)}`;
    gamma = Math.pow(10, parseFloat(gammaInput.value));
    gammaDisplay.textContent = `γ = ${gamma.toFixed(2)}`;
    
    // Add event listeners
    cInput.addEventListener('input', handleCParameterChange);
    gammaInput.addEventListener('input', handleGammaChange);
    trainBtn.addEventListener('click', trainSVM);
    generateBtn.addEventListener('click', generateData);
    window.addEventListener('resize', handleResize);

    // Initialize
    generateData();
    handleResize();
});