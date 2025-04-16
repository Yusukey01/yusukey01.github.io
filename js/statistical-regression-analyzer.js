
// statistical-regression-analyzer.js - A vanilla JavaScript implementation for statistical linear regression analysis

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('statistical-regression-analyzer');
    
    if (!container) {
        console.error('Container element not found!');
        return;
    }
    
    // Create HTML structure for the tool
    container.innerHTML = `
        <div class="regression-analyzer">
            <div class="controls-section">
                <div class="control-group">
                    <h3>Data Input</h3>
                    <div class="upload-controls">
                        <button id="upload-csv-btn" class="primary-btn">Upload CSV</button>
                        <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
                        <span>Or use sample data:</span>
                        <div class="sample-buttons">
                            <button id="sample-linear-btn" class="sample-btn">Linear</button>
                            <button id="sample-nonlinear-btn" class="sample-btn">Nonlinear</button>
                            <button id="sample-heteroscedastic-btn" class="sample-btn">Heteroscedastic</button>
                            <button id="sample-outliers-btn" class="sample-btn">With Outliers</button>
                        </div>
                    </div>
                </div>
                
                <div class="control-group" id="variable-selectors" style="display: none;">
                    <h3>Select Variables</h3>
                    <div class="selector-row">
                        <div class="selector">
                            <label for="x-variable">Independent Variable (X):</label>
                            <select id="x-variable"></select>
                        </div>
                        <div class="selector">
                            <label for="y-variable">Dependent Variable (Y):</label>
                            <select id="y-variable"></select>
                        </div>
                    </div>
                    <div class="checkbox-controls">
                        <label>
                            <input type="checkbox" id="show-prediction-intervals" checked>
                            Show 95% Prediction Intervals
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="results-section" id="results-section" style="display: none;">
                <div class="chart-container">
                    <h3>Regression Model</h3>
                    <div id="equation-display" class="equation-display"></div>
                    <canvas id="regression-chart"></canvas>
                </div>
                
                <div class="stats-container">
                    <h3>Statistical Summary</h3>
                    <div class="stats-grid">
                        <div class="stats-card">
                            <h4>Model Fit</h4>
                            <table class="stats-table">
                                <tr>
                                    <td>R-squared:</td>
                                    <td id="r-squared">-</td>
                                </tr>
                                <tr>
                                    <td>Mean Squared Error:</td>
                                    <td id="mse">-</td>
                                </tr>
                                <tr>
                                    <td>Root MSE:</td>
                                    <td id="rmse">-</td>
                                </tr>
                                <tr>
                                    <td>Mean Absolute Error:</td>
                                    <td id="mae">-</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div class="stats-card">
                            <h4>Coefficient Estimates</h4>
                            <table class="stats-table">
                                <tr>
                                    <td>Intercept:</td>
                                    <td id="intercept">-</td>
                                </tr>
                                <tr>
                                    <td>Slope:</td>
                                    <td id="slope">-</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div class="stats-card">
                            <h4>Significance Tests</h4>
                            <table class="stats-table">
                                <tr>
                                    <td>p-value (Slope):</td>
                                    <td id="p-value">-</td>
                                </tr>
                                <tr>
                                    <td>t-statistic (Slope):</td>
                                    <td id="t-statistic">-</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div class="stats-card">
                            <h4>Confidence Intervals (95%)</h4>
                            <table class="stats-table">
                                <tr>
                                    <td>Slope CI:</td>
                                    <td id="slope-ci">-</td>
                                </tr>
                                <tr>
                                    <td>Intercept CI:</td>
                                    <td id="intercept-ci">-</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="diagnostics-container">
                    <h3>Residual Analysis</h3>
                    <div class="chart-toggle">
                        <label>
                            <input type="checkbox" id="toggle-residual-plot">
                            Show Standardized Residuals
                        </label>
                    </div>
                    <canvas id="residual-chart"></canvas>
                    
                    <div class="diagnostics-interpretation">
                        <h4>Diagnostic Checks</h4>
                        <div class="checks-grid">
                            <div class="check-item">
                                <h5>Linearity</h5>
                                <p>Look for random scatter of residuals around zero.</p>
                            </div>
                            <div class="check-item">
                                <h5>Homoscedasticity</h5>
                                <p>Check for constant spread of residuals across all X values.</p>
                            </div>
                            <div class="check-item">
                                <h5>Normality</h5>
                                <p>Most standardized residuals should fall between -2 and +2.</p>
                            </div>
                            <div class="check-item">
                                <h5>Outliers</h5>
                                <p>Look for points with standardized residuals beyond ±3.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="data-preview" id="data-preview" style="display: none;">
                <h3>Data Preview <span id="row-count"></span></h3>
                <div class="table-container">
                    <table id="data-table" class="data-table">
                        <thead id="table-head"></thead>
                        <tbody id="table-body"></tbody>
                    </table>
                </div>
            </div>
            
            <div class="placeholder" id="placeholder">
                <p>Upload a CSV file or select a sample dataset to start analyzing.</p>
                <p>This tool will help you visualize linear regression models with statistical insights.</p>
            </div>
        </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .regression-analyzer {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f9f9fb;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .controls-section {
            margin-bottom: 20px;
        }
        
        .control-group {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            padding: 16px;
            margin-bottom: 16px;
        }
        
        .control-group h3 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 16px;
            color: #333;
        }
        
        .upload-controls {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
        }
        
        .primary-btn {
            background-color: #0366d6;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .primary-btn:hover {
            background-color: #0256b9;
        }
        
        .sample-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .sample-btn {
            background-color: #f1f8ff;
            color: #0366d6;
            border: 1px solid #c8e1ff;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 12px;
            cursor: pointer;
        }
        
        .sample-btn:hover {
            background-color: #dbedff;
        }
        
        .sample-btn.active {
            background-color: #0366d6;
            color: white;
        }
        
        .selector-row {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 12px;
        }
        
        .selector {
            flex: 1;
            min-width: 200px;
        }
        
        .selector label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            color: #555;
        }
        
        .selector select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .checkbox-controls {
            margin-top: 12px;
        }
        
        .checkbox-controls label {
            display: flex;
            align-items: center;
            font-size: 14px;
            color: #555;
            cursor: pointer;
        }
        
        .checkbox-controls input {
            margin-right: 8px;
        }
        
        .results-section {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .chart-container, .stats-container, .diagnostics-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            padding: 16px;
        }
        
        .chart-container h3, .stats-container h3, .diagnostics-container h3 {
            margin-top: 0;
            margin-bottom: 16px;
            font-size: 16px;
            color: #333;
        }
        
        .equation-display {
            background-color: #f6f8fa;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-family: monospace;
            font-size: 14px;
        }
        
        canvas {
            width: 100%;
            height: 300px;
            margin-bottom: 8px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
        }
        
        .stats-card {
            background-color: #f6f8fa;
            border-radius: 8px;
            padding: 12px;
        }
        
        .stats-card h4 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 14px;
            color: #333;
        }
        
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        
        .stats-table td {
            padding: 4px 0;
        }
        
        .stats-table td:first-child {
            color: #555;
        }
        
        .stats-table td:last-child {
            text-align: right;
            font-family: monospace;
            font-weight: 500;
        }
        
        .chart-toggle {
            margin-bottom: 12px;
        }
        
        .chart-toggle label {
            display: flex;
            align-items: center;
            font-size: 14px;
            color: #555;
            cursor: pointer;
        }
        
        .chart-toggle input {
            margin-right: 8px;
        }
        
        .diagnostics-interpretation {
            margin-top: 20px;
        }
        
        .diagnostics-interpretation h4 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 14px;
            color: #333;
        }
        
        .checks-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        
        .check-item {
            background-color: #f6f8fa;
            border-radius: 8px;
            padding: 10px;
        }
        
        .check-item h5 {
            margin-top: 0;
            margin-bottom: 8px;
            font-size: 13px;
            color: #333;
        }
        
        .check-item p {
            margin: 0;
            font-size: 12px;
            color: #555;
            line-height: 1.4;
        }
        
        .data-preview {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            padding: 16px;
            margin-top: 20px;
        }
        
        .data-preview h3 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 16px;
            color: #333;
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        
        .data-table th {
            text-align: left;
            padding: 8px;
            background-color: #f6f8fa;
            border-bottom: 1px solid #ddd;
            font-weight: 600;
            color: #333;
        }
        
        .data-table td {
            padding: 8px;
            border-bottom: 1px solid #eee;
            color: #555;
        }
        
        .placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            text-align: center;
            color: #666;
            padding: 20px;
        }
        
        .placeholder p {
            margin: 8px 0;
        }
        
        @media (max-width: 768px) {
            .selector-row {
                flex-direction: column;
                gap: 12px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(styleElement);
    
    // Initialize Chart.js dynamically
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js';
    scriptElement.onload = initializeAnalyzer;
    document.head.appendChild(scriptElement);
    
    function initializeAnalyzer() {
        // Variables to store state
        let data = [];
        let columns = [];
        let xColumn = '';
        let yColumn = '';
        let regressionResults = null;
        let regressionChart = null;
        let residualChart = null;
        let currentSample = null;
        
        // Get DOM elements
        const csvFileInput = document.getElementById('csv-file-input');
        const uploadCsvBtn = document.getElementById('upload-csv-btn');
        const variableSelectors = document.getElementById('variable-selectors');
        const xVariableSelect = document.getElementById('x-variable');
        const yVariableSelect = document.getElementById('y-variable');
        const showPredictionIntervalsCheckbox = document.getElementById('show-prediction-intervals');
        const toggleResidualPlotCheckbox = document.getElementById('toggle-residual-plot');
        const resultsSection = document.getElementById('results-section');
        const dataPreview = document.getElementById('data-preview');
        const placeholder = document.getElementById('placeholder');
        const tableHead = document.getElementById('table-head');
        const tableBody = document.getElementById('table-body');
        const rowCount = document.getElementById('row-count');
        
        // Sample data buttons
        const sampleLinearBtn = document.getElementById('sample-linear-btn');
        const sampleNonlinearBtn = document.getElementById('sample-nonlinear-btn');
        const sampleHeteroscedasticBtn = document.getElementById('sample-heteroscedastic-btn');
        const sampleOutliersBtn = document.getElementById('sample-outliers-btn');
        
        // Statistics elements
        const equationDisplay = document.getElementById('equation-display');
        const rSquaredElement = document.getElementById('r-squared');
        const mseElement = document.getElementById('mse');
        const rmseElement = document.getElementById('rmse');
        const maeElement = document.getElementById('mae');
        const interceptElement = document.getElementById('intercept');
        const slopeElement = document.getElementById('slope');
        const pValueElement = document.getElementById('p-value');
        const tStatisticElement = document.getElementById('t-statistic');
        const slopeCIElement = document.getElementById('slope-ci');
        const interceptCIElement = document.getElementById('intercept-ci');
        
        // Event listeners
        uploadCsvBtn.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', handleFileUpload);
        xVariableSelect.addEventListener('change', handleVariableChange);
        yVariableSelect.addEventListener('change', handleVariableChange);
        showPredictionIntervalsCheckbox.addEventListener('change', updateRegressionChart);
        toggleResidualPlotCheckbox.addEventListener('change', updateResidualChart);
        
        sampleLinearBtn.addEventListener('click', () => loadSampleData('linear'));
        sampleNonlinearBtn.addEventListener('click', () => loadSampleData('nonlinear'));
        sampleHeteroscedasticBtn.addEventListener('click', () => loadSampleData('heteroscedastic'));
        sampleOutliersBtn.addEventListener('click', () => loadSampleData('outliers'));
        
        // Helper function to compute linear regression
        function computeRegression(data, xKey, yKey) {
            // Extract x and y values
            const xs = data.map(d => parseFloat(d[xKey]));
            const ys = data.map(d => parseFloat(d[yKey]));
            
            // Calculate means
            const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
            const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
            
            // Calculate coefficients
            let numerator = 0;
            let denominator = 0;
            
            for (let i = 0; i < xs.length; i++) {
                numerator += (xs[i] - xMean) * (ys[i] - yMean);
                denominator += Math.pow(xs[i] - xMean, 2);
            }
            
            const slope = numerator / denominator;
            const intercept = yMean - slope * xMean;
            
            // Calculate predictions and residuals
            const predictions = xs.map(x => intercept + slope * x);
            const residuals = ys.map((y, i) => y - predictions[i]);
            
            // Calculate R-squared
            const ssTotal = ys.map(y => Math.pow(y - yMean, 2)).reduce((a, b) => a + b, 0);
            const ssResidual = residuals.map(r => Math.pow(r, 2)).reduce((a, b) => a + b, 0);
            const rSquared = 1 - (ssResidual / ssTotal);
            
            // Calculate standard error of regression
            const n = xs.length;
            const standardError = Math.sqrt(ssResidual / (n - 2));
            
            // Calculate standard error of coefficients
            const seSlope = standardError / Math.sqrt(denominator);
            const seIntercept = standardError * Math.sqrt(1/n + Math.pow(xMean, 2)/denominator);
            
            // Calculate t-statistics
            const tSlope = slope / seSlope;
            const tIntercept = intercept / seIntercept;
            
            // Calculate p-values (using normal approximation)
            const pSlope = 2 * (1 - normalCDF(Math.abs(tSlope)));
            const pIntercept = 2 * (1 - normalCDF(Math.abs(tIntercept)));
            
            // Calculate confidence intervals (95%)
            const criticalT = 1.96; // Approximation for large samples
            const ciSlopeWidth = criticalT * seSlope;
            const ciInterceptWidth = criticalT * seIntercept;
            
            // Calculate prediction intervals
            const predictionIntervals = xs.map(x => {
                const predictedY = intercept + slope * x;
                // Calculate the standard error of prediction
                const sePrediction = standardError * Math.sqrt(1 + 1/n + Math.pow(x - xMean, 2)/denominator);
                const piWidth = criticalT * sePrediction;
                
                return {
                    x: x,
                    y: predictedY,
                    yLower: predictedY - piWidth,
                    yUpper: predictedY + piWidth
                };
            });
            
            // Calculate metrics
            const mse = ssResidual / n;
            const mae = residuals.map(r => Math.abs(r)).reduce((a, b) => a + b, 0) / n;
            const rmse = Math.sqrt(mse);
            
            // Calculate standardized residuals
            const standardizedResiduals = residuals.map(r => r / standardError);
            
            return {
                slope,
                intercept,
                rSquared,
                predictions,
                residuals,
                standardizedResiduals,
                mse,
                mae,
                rmse,
                equation: `y = ${intercept.toFixed(4)} + ${slope.toFixed(4)}x`,
                slopeCI: [slope - ciSlopeWidth, slope + ciSlopeWidth],
                interceptCI: [intercept - ciInterceptWidth, intercept + ciInterceptWidth],
                pValues: { slope: pSlope, intercept: pIntercept },
                tValues: { slope: tSlope, intercept: tIntercept },
                standardErrors: { slope: seSlope, intercept: seIntercept, regression: standardError },
                predictionIntervals,
                xMean,
                yMean
            };
        }
        
        // Normal CDF approximation
        function normalCDF(x) {
            const t = 1 / (1 + 0.2316419 * Math.abs(x));
            const d = 0.3989423 * Math.exp(-x * x / 2);
            const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
            return x > 0 ? 1 - p : p;
        }
        
        // Helper function to create sample datasets
        function createSampleData(type) {
            const n = 50;
            let sampleData = [];
            
            if (type === 'linear') {
                // y = 2x + 5 + noise
                for (let i = 0; i < n; i++) {
                    const x = i / (n - 1) * 10;
                    const noise = (Math.random() - 0.5) * 3;
                    const y = 2 * x + 5 + noise;
                    sampleData.push({ x, y });
                }
            } else if (type === 'nonlinear') {
                // y = 0.5x² + 2x + 3 + noise
                for (let i = 0; i < n; i++) {
                    const x = i / (n - 1) * 10;
                    const noise = (Math.random() - 0.5) * 5;
                    const y = 0.5 * x * x + 2 * x + 3 + noise;
                    sampleData.push({ x, y });
                }
            } else if (type === 'heteroscedastic') {
                // Increasing variance
                for (let i = 0; i < n; i++) {
                    const x = i / (n - 1) * 10;
                    const variance = 0.5 + x * 0.5;
                    const noise = (Math.random() - 0.5) * variance * 5;
                    const y = 3 * x + 2 + noise;
                    sampleData.push({ x, y });
                }
            } else if (type === 'outliers') {
                // With outliers
                for (let i = 0; i < n; i++) {
                    const x = i / (n - 1) * 10;
                    let noise = (Math.random() - 0.5) * 2;
                    
                    // Add occasional outliers
                    if (Math.random() < 0.1) {
                        noise = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 5);
                    }
                    
                    const y = 1.5 * x + 4 + noise;
                    sampleData.push({ x, y });
                }
            }
            
            return sampleData;
        }
        
        // Handle file upload
        function handleFileUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const csvData = event.target.result;
                parseCSV(csvData);
            };
            reader.readAsText(file);
        }
        
        // Parse CSV data
        function parseCSV(csvText) {
            // Simple CSV parser (for a more robust solution, consider using PapaParse)
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            const parsedData = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                parsedData.push(row);
            }
            
            // Reset current sample
            resetSampleButtons();
            
            // Set data and columns
            data = parsedData;
            columns = headers;
            
            // Update UI
            populateVariableSelectors();
            updateDataPreview();
            
            // Show variable selectors
            variableSelectors.style.display = 'block';
            placeholder.style.display = 'none';
            dataPreview.style.display = 'block';
            
            // Set default X and Y if available
            if (columns.length >= 2) {
                xColumn = columns[0];
                yColumn = columns[1];
                xVariableSelect.value = xColumn;
                yVariableSelect.value = yColumn;
                handleVariableChange();
            }
        }
        
        // Load sample data
        function loadSampleData(type) {
            // Reset other sample buttons
            resetSampleButtons();
            
            // Set active button
            if (type === 'linear') sampleLinearBtn.classList.add('active');
            if (type === 'nonlinear') sampleNonlinearBtn.classList.add('active');
            if (type === 'heteroscedastic') sampleHeteroscedasticBtn.classList.add('active');
            if (type === 'outliers') sampleOutliersBtn.classList.add('active');
            
            currentSample = type;
            
            // Generate data
            data = createSampleData(type);
            columns = ['x', 'y'];
            
            // Update UI
            populateVariableSelectors();
            updateDataPreview();
            
            // Show variable selectors
            variableSelectors.style.display = 'block';
            placeholder.style.display = 'none';
            dataPreview.style.display = 'block';
            
            // Set X and Y
            xColumn = 'x';
            yColumn = 'y';
            xVariableSelect.value = xColumn;
            yVariableSelect.value = yColumn;
            handleVariableChange();
        }
        
        // Reset sample buttons
        function resetSampleButtons() {
            sampleLinearBtn.classList.remove('active');
            sampleNonlinearBtn.classList.remove('active');
            sampleHeteroscedasticBtn.classList.remove('active');
            sampleOutliersBtn.classList.remove('active');
            currentSample = null;
        }
        
        // Populate variable selectors
        function populateVariableSelectors() {
            xVariableSelect.innerHTML = '';
            yVariableSelect.innerHTML = '';
            
            columns.forEach(column => {
                const xOption = document.createElement('option');
                xOption.value = column;
                xOption.textContent = column;
                xVariableSelect.appendChild(xOption);
                
                const yOption = document.createElement('option');
                yOption.value = column;
                yOption.textContent = column;
                yVariableSelect.appendChild(yOption);
            });
        }
        
        // Update data preview
        function updateDataPreview() {
            if (!data.length) return;
            
            // Update row count
            rowCount.textContent = `(${data.length} rows)`;
            
            // Table headers
            let headerRow = '<tr>';
            columns.forEach(column => {
                headerRow += `<th>${column}</th>`;
            });
            headerRow += '</tr>';
            tableHead.innerHTML = headerRow;

            // Table body - show first 10 rows
            let bodyRows = '';
            const maxRows = Math.min(data.length, 10);
            for (let i = 0; i < maxRows; i++) {
                bodyRows += '<tr>';
                columns.forEach(column => {
                    bodyRows += `<td>${data[i][column]}</td>`;
                });
                bodyRows += '</tr>';
            }
            tableBody.innerHTML = bodyRows;
            }

            // Handle variable change
            function handleVariableChange() {
            xColumn = xVariableSelect.value;
            yColumn = yVariableSelect.value;

            if (xColumn && yColumn && data.length > 1) {
                // Calculate regression
                regressionResults = computeRegression(data, xColumn, yColumn);
                
                // Update UI
                updateStatistics();
                initializeCharts();
                resultsSection.style.display = 'block';
            }
            }

            // Update statistics display
            function updateStatistics() {
            if (!regressionResults) return;

            // Update equation
            equationDisplay.textContent = regressionResults.equation;

            // Update statistics
            rSquaredElement.textContent = regressionResults.rSquared.toFixed(4);
            mseElement.textContent = regressionResults.mse.toFixed(4);
            rmseElement.textContent = regressionResults.rmse.toFixed(4);
            maeElement.textContent = regressionResults.mae.toFixed(4);

            interceptElement.textContent = regressionResults.intercept.toFixed(4);
            slopeElement.textContent = regressionResults.slope.toFixed(4);

            const pValue = regressionResults.pValues.slope;
            pValueElement.textContent = pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4);
            tStatisticElement.textContent = regressionResults.tValues.slope.toFixed(4);

            slopeCIElement.textContent = `[${regressionResults.slopeCI[0].toFixed(4)}, ${regressionResults.slopeCI[1].toFixed(4)}]`;
            interceptCIElement.textContent = `[${regressionResults.interceptCI[0].toFixed(4)}, ${regressionResults.interceptCI[1].toFixed(4)}]`;
            }

            // Initialize charts
            function initializeCharts() {
            initializeRegressionChart();
            initializeResidualChart();
            }

            // Initialize regression chart
            function initializeRegressionChart() {
            const ctx = document.getElementById('regression-chart').getContext('2d');

            // Destroy previous chart if it exists
            if (regressionChart) {
                regressionChart.destroy();
            }

            // Prepare data
            const chartData = {
                datasets: [
                    // Scatter plot for data points
                    {
                        label: 'Data Points',
                        data: data.map(d => ({
                            x: parseFloat(d[xColumn]),
                            y: parseFloat(d[yColumn])
                        })),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        pointRadius: 4,
                        type: 'scatter'
                    }
                ]
            };

            // Add regression line
            if (regressionResults) {
                // Find min and max x values
                const xValues = data.map(d => parseFloat(d[xColumn]));
                const minX = Math.min(...xValues);
                const maxX = Math.max(...xValues);
                
                // Create line data
                const lineData = [
                    { x: minX, y: regressionResults.intercept + regressionResults.slope * minX },
                    { x: maxX, y: regressionResults.intercept + regressionResults.slope * maxX }
                ];
                
                chartData.datasets.push({
                    label: 'Regression Line',
                    data: lineData,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    type: 'line'
                });
                
                // Add prediction intervals if checked
                if (showPredictionIntervalsCheckbox.checked) {
                    // Sort intervals by x value
                    const sortedIntervals = [...regressionResults.predictionIntervals]
                        .sort((a, b) => a.x - b.x);
                    
                    // Add upper bound
                    chartData.datasets.push({
                        label: 'Upper 95% Prediction',
                        data: sortedIntervals.map(p => ({ x: p.x, y: p.yUpper })),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                        type: 'line'
                    });
                    
                    // Add lower bound
                    chartData.datasets.push({
                        label: 'Lower 95% Prediction',
                        data: sortedIntervals.map(p => ({ x: p.x, y: p.yLower })),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                        type: 'line'
                    });
                }
            }

            // Create chart
            regressionChart = new Chart(ctx, {
                type: 'scatter',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: xColumn
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: yColumn
                            }
                        }
                    }
                }
            });
            }

            // Initialize residual chart
            function initializeResidualChart() {
            const ctx = document.getElementById('residual-chart').getContext('2d');

            // Destroy previous chart if it exists
            if (residualChart) {
                residualChart.destroy();
            }

            if (!regressionResults) return;

            // Prepare data based on checkbox
            const isStandardized = toggleResidualPlotCheckbox.checked;
            const residualData = data.map((d, i) => {
                const x = isStandardized ? 
                    regressionResults.predictions[i] : 
                    parseFloat(d[xColumn]);
                
                const y = isStandardized ? 
                    regressionResults.standardizedResiduals[i] : 
                    regressionResults.residuals[i];
                
                return { x, y };
            });

            // Create chart
            residualChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: isStandardized ? 'Standardized Residuals' : 'Residuals',
                        data: residualData,
                        backgroundColor: 'rgba(153, 102, 255, 0.6)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: isStandardized ? 'Predicted Values' : xColumn
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: isStandardized ? 'Standardized Residuals' : 'Residuals'
                            },
                            grid: {
                                color: (context) => {
                                    if (context.tick.value === 0) {
                                        return 'rgba(255, 0, 0, 0.5)';
                                    }
                                    return 'rgba(0, 0, 0, 0.1)';
                                }
                            }
                        }
                    }
                }
            });
            }

            // Update regression chart when prediction intervals checkbox changes
            function updateRegressionChart() {
            initializeRegressionChart();
            }

            // Update residual chart when checkbox changes
            function updateResidualChart() {
            initializeResidualChart();
            }
        }
    });