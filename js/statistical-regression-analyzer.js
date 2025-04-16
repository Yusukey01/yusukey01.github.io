import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, ScatterChart, Line, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ReferenceLine
} from 'recharts';
import * as Papa from 'papaparse';
import * as math from 'mathjs';

// Helper function to compute linear regression
function computeRegression(data, xKey, yKey) {
  // Extract x and y values
  const xs = data.map(d => parseFloat(d[xKey]));
  const ys = data.map(d => parseFloat(d[yKey]));
  
  // Calculate means
  const xMean = math.mean(xs);
  const yMean = math.mean(ys);
  
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
  const pSlope = 2 * (1 - math.erf(Math.abs(tSlope) / Math.sqrt(2)));
  const pIntercept = 2 * (1 - math.erf(Math.abs(tIntercept) / Math.sqrt(2)));
  
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
  
  return {
    slope,
    intercept,
    rSquared,
    predictions,
    residuals,
    mse,
    mae,
    rmse,
    equation: `y = ${intercept.toFixed(4)} + ${slope.toFixed(4)}x`,
    slopeCI: [slope - ciSlopeWidth, slope + ciSlopeWidth],
    interceptCI: [intercept - ciInterceptWidth, intercept + ciInterceptWidth],
    pValues: { slope: pSlope, intercept: pIntercept },
    tValues: { slope: tSlope, intercept: tIntercept },
    standardErrors: { slope: seSlope, intercept: seIntercept, regression: standardError },
    predictionIntervals
  };
}

// Helper function to create sample datasets
function createSampleData(type) {
  const n = 50;
  let data = [];
  
  if (type === 'linear') {
    // y = 2x + 5 + noise
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1) * 10;
      const noise = (Math.random() - 0.5) * 3;
      const y = 2 * x + 5 + noise;
      data.push({ x, y });
    }
  } else if (type === 'nonlinear') {
    // y = 0.5x² + 2x + 3 + noise
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1) * 10;
      const noise = (Math.random() - 0.5) * 5;
      const y = 0.5 * x * x + 2 * x + 3 + noise;
      data.push({ x, y });
    }
  } else if (type === 'heteroscedastic') {
    // Increasing variance
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1) * 10;
      const variance = 0.5 + x * 0.5;
      const noise = (Math.random() - 0.5) * variance * 5;
      const y = 3 * x + 2 + noise;
      data.push({ x, y });
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
      data.push({ x, y });
    }
  }
  
  return data;
}

function RegressionAnalyzer() {
  const [data, setData] = useState([]);
  const [currentTab, setCurrentTab] = useState('data');
  const [xColumn, setXColumn] = useState('x');
  const [yColumn, setYColumn] = useState('y');
  const [columns, setColumns] = useState([]);
  const [results, setResults] = useState(null);
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true);
  const [showResidualPlot, setShowResidualPlot] = useState(false);
  const [currentSample, setCurrentSample] = useState('none');
  const fileInputRef = useRef(null);
  
  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.data && results.data.length > 0) {
            setCurrentSample('none');
            setData(results.data);
            setColumns(results.meta.fields || []);
            if (results.meta.fields && results.meta.fields.length >= 2) {
              setXColumn(results.meta.fields[0]);
              setYColumn(results.meta.fields[1]);
            }
          }
        }
      });
    }
  };
  
  // Load a sample dataset
  const loadSampleData = (type) => {
    const sampleData = createSampleData(type);
    setCurrentSample(type);
    setData(sampleData);
    setColumns(['x', 'y']);
    setXColumn('x');
    setYColumn('y');
  };
  
  // Run regression analysis when data or selected columns change
  useEffect(() => {
    if (data.length > 0 && xColumn && yColumn) {
      const results = computeRegression(data, xColumn, yColumn);
      setResults(results);
    }
  }, [data, xColumn, yColumn]);
  
  // Format data for charts
  const getChartData = () => {
    if (!data.length || !results) return [];
    
    return data.map((d, i) => ({
      [xColumn]: parseFloat(d[xColumn]),
      [yColumn]: parseFloat(d[yColumn]),
      predicted: results.predictions[i],
      residual: results.residuals[i],
      standardized_residual: results.residuals[i] / results.standardErrors.regression
    }));
  };
  
  const getPredictionIntervalData = () => {
    if (!results) return [];
    
    return results.predictionIntervals.map(pi => ({
      x: pi.x,
      y: pi.y,
      yLower: pi.yLower,
      yUpper: pi.yUpper
    }));
  };
  
  // Handle column selection
  const handleXColumnChange = (e) => {
    setXColumn(e.target.value);
  };
  
  const handleYColumnChange = (e) => {
    setYColumn(e.target.value);
  };
  
  // Clear data
  const clearData = () => {
    setData([]);
    setCurrentSample('none');
    setResults(null);
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="regression-analyzer-container">
      <div className="tabs">
        <button 
          className={`tab ${currentTab === 'data' ? 'active' : ''}`} 
          onClick={() => setCurrentTab('data')}
        >
          Data & Model
        </button>
        <button 
          className={`tab ${currentTab === 'viz' ? 'active' : ''}`} 
          onClick={() => setCurrentTab('viz')}
          disabled={!results}
        >
          Visualization
        </button>
        <button 
          className={`tab ${currentTab === 'stats' ? 'active' : ''}`} 
          onClick={() => setCurrentTab('stats')}
          disabled={!results}
        >
          Statistical Analysis
        </button>
        <button 
          className={`tab ${currentTab === 'diagnostics' ? 'active' : ''}`} 
          onClick={() => setCurrentTab('diagnostics')}
          disabled={!results}
        >
          Diagnostics
        </button>
      </div>
      
      <div className="tab-content">
        {currentTab === 'data' && (
          <div className="data-panel">
            <div className="data-controls">
              <div className="control-group">
                <h3>1. Load Data</h3>
                <div className="data-buttons">
                  <button className="primary-button" onClick={triggerFileInput}>
                    Upload CSV
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept=".csv"
                  />
                  <div className="sample-datasets">
                    <span>Or use sample data: </span>
                    <button 
                      className={`sample-btn ${currentSample === 'linear' ? 'active' : ''}`} 
                      onClick={() => loadSampleData('linear')}
                    >
                      Linear
                    </button>
                    <button 
                      className={`sample-btn ${currentSample === 'nonlinear' ? 'active' : ''}`} 
                      onClick={() => loadSampleData('nonlinear')}
                    >
                      Nonlinear
                    </button>
                    <button 
                      className={`sample-btn ${currentSample === 'heteroscedastic' ? 'active' : ''}`} 
                      onClick={() => loadSampleData('heteroscedastic')}
                    >
                      Heteroscedastic
                    </button>
                    <button 
                      className={`sample-btn ${currentSample === 'outliers' ? 'active' : ''}`} 
                      onClick={() => loadSampleData('outliers')}
                    >
                      With Outliers
                    </button>
                  </div>
                </div>
              </div>
              
              {data.length > 0 && (
                <>
                  <div className="control-group">
                    <h3>2. Select Variables</h3>
                    <div className="variable-selectors">
                      <div className="selector">
                        <label htmlFor="x-column">Independent variable (X):</label>
                        <select id="x-column" value={xColumn} onChange={handleXColumnChange}>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div className="selector">
                        <label htmlFor="y-column">Dependent variable (Y):</label>
                        <select id="y-column" value={yColumn} onChange={handleYColumnChange}>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="control-group">
                    <button className="secondary-button" onClick={clearData}>
                      Clear Data
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {data.length > 0 && (
              <div className="data-preview">
                <h3>Data Preview</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {columns.map(col => (
                          <th key={col}>{col}</th>
                        ))}
                        {results && (
                          <>
                            <th>Predicted</th>
                            <th>Residual</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {columns.map(col => (
                            <td key={col}>{row[col]}</td>
                          ))}
                          {results && (
                            <>
                              <td>{results.predictions[i].toFixed(4)}</td>
                              <td>{results.residuals[i].toFixed(4)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 10 && (
                    <div className="table-footer">
                      Showing 10 of {data.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {!data.length && (
              <div className="placeholder">
                <p>Upload a CSV file or select a sample dataset to start.</p>
                <p>Your CSV file should contain numerical data for regression analysis.</p>
              </div>
            )}
          </div>
        )}
        
        {currentTab === 'viz' && results && (
          <div className="viz-panel">
            <div className="chart-controls">
              <div className="toggle-group">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={showConfidenceIntervals}
                    onChange={() => setShowConfidenceIntervals(!showConfidenceIntervals)}
                  />
                  <span>Show 95% Prediction Intervals</span>
                </label>
              </div>
            </div>
            
            <div className="chart-container">
              <h3>Regression Model</h3>
              <div className="equation-display">
                <strong>Regression Equation:</strong> {results.equation}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={xColumn} 
                    type="number" 
                    label={{ value: xColumn, position: 'insideBottom', offset: -10 }} 
                  />
                  <YAxis 
                    dataKey={yColumn} 
                    type="number"
                    label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value) => value.toFixed(4)}
                    labelFormatter={(value) => `${xColumn}: ${value.toFixed(4)}`}
                  />
                  <Legend />
                  
                  {/* Data points */}
                  <Scatter name="Data Points" data={getChartData()} fill="#8884d8" />
                  
                  {/* Regression line */}
                  <Line
                    name="Regression Line"
                    type="monotone"
                    dataKey="predicted"
                    data={getChartData()}
                    stroke="#ff7300"
                    dot={false}
                    activeDot={false}
                  />
                  
                  {/* Prediction intervals */}
                  {showConfidenceIntervals && (
                    <>
                      <Line
                        name="Upper Prediction Bound"
                        type="monotone"
                        dataKey="yUpper"
                        data={getPredictionIntervalData()}
                        stroke="#82ca9d"
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={false}
                      />
                      <Line
                        name="Lower Prediction Bound"
                        type="monotone"
                        dataKey="yLower"
                        data={getPredictionIntervalData()}
                        stroke="#82ca9d"
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={false}
                      />
                    </>
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {currentTab === 'stats' && results && (
          <div className="stats-panel">
            <div className="stats-header">
              <h3>Statistical Summary</h3>
              <p className="stats-description">
                This section provides statistical measures of the regression model's 
                accuracy and the significance of its parameters.
              </p>
            </div>
            
            <div className="stats-grid">
              <div className="stats-card">
                <h4>Model Fit</h4>
                <ul className="stats-list">
                  <li>
                    <span className="stat-label">R-squared:</span>
                    <span className="stat-value">{results.rSquared.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">Mean Squared Error:</span>
                    <span className="stat-value">{results.mse.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">Root Mean Squared Error:</span>
                    <span className="stat-value">{results.rmse.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">Mean Absolute Error:</span>
                    <span className="stat-value">{results.mae.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">Standard Error:</span>
                    <span className="stat-value">{results.standardErrors.regression.toFixed(4)}</span>
                  </li>
                </ul>
              </div>
              
              <div className="stats-card">
                <h4>Coefficient Estimates</h4>
                <ul className="stats-list">
                  <li>
                    <span className="stat-label">Intercept:</span>
                    <span className="stat-value">{results.intercept.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">Slope:</span>
                    <span className="stat-value">{results.slope.toFixed(4)}</span>
                  </li>
                </ul>
              </div>
              
              <div className="stats-card">
                <h4>Standard Errors</h4>
                <ul className="stats-list">
                  <li>
                    <span className="stat-label">SE Intercept:</span>
                    <span className="stat-value">{results.standardErrors.intercept.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">SE Slope:</span>
                    <span className="stat-value">{results.standardErrors.slope.toFixed(4)}</span>
                  </li>
                </ul>
              </div>
              
              <div className="stats-card">
                <h4>Confidence Intervals (95%)</h4>
                <ul className="stats-list">
                  <li>
                    <span className="stat-label">Intercept CI:</span>
                    <span className="stat-value">
                      [{results.interceptCI[0].toFixed(4)}, {results.interceptCI[1].toFixed(4)}]
                    </span>
                  </li>
                  <li>
                    <span className="stat-label">Slope CI:</span>
                    <span className="stat-value">
                      [{results.slopeCI[0].toFixed(4)}, {results.slopeCI[1].toFixed(4)}]
                    </span>
                  </li>
                </ul>
              </div>
              
              <div className="stats-card">
                <h4>Significance Tests</h4>
                <ul className="stats-list">
                  <li>
                    <span className="stat-label">t-value (Intercept):</span>
                    <span className="stat-value">{results.tValues.intercept.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">p-value (Intercept):</span>
                    <span className="stat-value">
                      {results.pValues.intercept < 0.0001 ? "< 0.0001" : results.pValues.intercept.toFixed(4)}
                    </span>
                  </li>
                  <li>
                    <span className="stat-label">t-value (Slope):</span>
                    <span className="stat-value">{results.tValues.slope.toFixed(4)}</span>
                  </li>
                  <li>
                    <span className="stat-label">p-value (Slope):</span>
                    <span className="stat-value">
                      {results.pValues.slope < 0.0001 ? "< 0.0001" : results.pValues.slope.toFixed(4)}
                    </span>
                  </li>
                </ul>
              </div>
              
              <div className="stats-card interpretation">
                <h4>Interpretation</h4>
                <div className="interpretation-text">
                  <p>
                    <strong>R-squared:</strong> {results.rSquared.toFixed(4) * 100}% of the variance in {yColumn} 
                    is explained by {xColumn}.
                  </p>
                  <p>
                    <strong>Slope:</strong> For each unit increase in {xColumn}, {yColumn} changes 
                    by {results.slope.toFixed(4)} units on average.
                  </p>
                  <p>
                    <strong>Significance:</strong> The relationship between {xColumn} and {yColumn} is 
                    {results.pValues.slope < 0.05 ? 
                      " statistically significant (p < 0.05)." : 
                      " not statistically significant (p > 0.05)."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {currentTab === 'diagnostics' && results && (
          <div className="diagnostics-panel">
            <div className="chart-controls">
              <div className="toggle-group">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={showResidualPlot}
                    onChange={() => setShowResidualPlot(!showResidualPlot)}
                  />
                  <span>Show Standardized Residuals</span>
                </label>
              </div>
            </div>
            
            <div className="chart-container">
              <h3>Residual Analysis</h3>
              <p className="chart-description">
                Residuals should be randomly distributed around zero with no visible patterns for a good model fit.
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={showResidualPlot ? "predicted" : xColumn} 
                    type="number" 
                    label={{ 
                      value: showResidualPlot ? "Predicted Values" : xColumn, 
                      position: 'insideBottom', 
                      offset: -10 
                    }} 
                  />
                  <YAxis 
                    dataKey={showResidualPlot ? "standardized_residual" : "residual"} 
                    type="number"
                    label={{ 
                      value: showResidualPlot ? "Standardized Residuals" : "Residuals", 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => value.toFixed(4)}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
                  <Scatter 
                    name={showResidualPlot ? "Standardized Residuals" : "Residuals"} 
                    data={getChartData()} 
                    fill="#8884d8" 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            <div className="diagnostics-interpretation">
              <h3>Diagnostic Checks</h3>
              <div className="checks-grid">
                <div className="check-card">
                  <h4>Linearity</h4>
                  <p>
                    Check if residuals show patterns against predicted values or X. 
                    Patterns suggest the relationship may not be linear.
                  </p>
                </div>
                <div className="check-card">
                  <h4>Homoscedasticity</h4>
                  <p>
                    Residuals should have constant variance across all predicted values.
                    A funnel shape indicates heteroscedasticity.
                  </p>
                </div>
                <div className="check-card">
                  <h4>Normality</h4>
                  <p>
                    For valid inference, residuals should be normally distributed.
                    Many standardized residuals beyond ±2 suggest non-normality.
                  </p>
                </div>
                <div className="check-card">
                  <h4>Outliers</h4>
                  <p>
                    Look for points with standardized residuals beyond ±3, which
                    may exert undue influence on the regression model.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {currentTab !== 'data' && !results && (
          <div className="placeholder">
            <p>No regression results available. Please load data and select variables first.</p>
          </div>
        )}
      </div>
      
      <div className="learning-notes">
        <h3>Statistical Concepts in Linear Regression:</h3>
        <ul>
          <li><strong>Parameter Estimation:</strong> Regression coefficients are estimated using least squares, which minimizes the sum of squared residuals.</li>
          <li><strong>Confidence Intervals:</strong> Provide a range of plausible values for the true parameters with a specified confidence level (e.g., 95%).</li>
          <li><strong>Prediction Intervals:</strong> Account for both the uncertainty in estimating the population mean and the random variation of individual observations.</li>
          <li><strong>Hypothesis Testing:</strong> Evaluates whether regression coefficients are significantly different from zero using t-tests.</li>
          <li><strong>Assumptions:</strong> Linear regression assumes linearity, independence, homoscedasticity, and normally distributed errors.</li>
          <li><strong>Diagnostics:</strong> Residual analysis helps verify if model assumptions are met and identifies potential issues.</li>
        </ul>
      </div>
    </div>
  );
}

// Add all our CSS styles
// Add the style tag to the document
const styleElement = document.createElement('style');
styleElement.textContent = `
.regression-analyzer-container {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f9f9fb;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #e1e4e8;
  overflow-x: auto;
}

.tab {
  padding: 12px 16px;
  border: none;
  background: none;
  color: #586069;
  cursor: pointer;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab:hover {
  color: #0366d6;
  background-color: #f6f8fa;
}

.tab.active {
  color: #0366d6;
  border-bottom: 2px solid #0366d6;
}

.tab:disabled {
  color: #c0c0c0;
  cursor: not-allowed;
}

.tab-content {
  padding: 20px;
  min-height: 300px;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #586069;
  text-align: center;
  padding: 0 30px;
}

.placeholder p {
  margin: 10px 0;
}

/* Data Panel */
.data-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.data-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-group h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #24292e;
  font-size: 16px;
}

.data-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.primary-button {
  background-color: #0366d6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.primary-button:hover {
  background-color: #0258b8;
}

.secondary-button {
  background-color: #e1e4e8;
  color: #24292e;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.secondary-button:hover {
  background-color: #d1d5da;
}

.sample-datasets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.sample-datasets span {
  font-size: 14px;
  color: #586069;
}

.sample-btn {
  background-color: #f1f8ff;
  color: #0366d6;
  border: 1px solid #c8e1ff;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.sample-btn:hover {
  background-color: #e1f0ff;
}

.sample-btn.active {
  background-color: #0366d6;
  color: white;
  border-color: #0366d6;
}

.variable-selectors {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.selector {
  flex: 1;
  min-width: 200px;
}

.selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #586069;
  font-size: 14px;
}

.selector select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.data-preview {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

.data-preview h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #24292e;
  font-size: 16px;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 10px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  background-color: #f6f8fa;
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #e1e4e8;
  font-weight: 600;
  color: #24292e;
}

.data-table td {
  padding: 10px;
  border-bottom: 1px solid #e1e4e8;
  color: #586069;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.table-footer {
  text-align: right;
  color: #586069;
  font-size: 12px;
  margin-top: 8px;
}

/* Visualization Panel */
.viz-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-controls {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

.toggle-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle input {
  margin-right: 8px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

.chart-container h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #24292e;
  font-size: 16px;
}

.chart-description {
  color: #586069;
  font-size: 14px;
  margin-bottom: 16px;
}

.equation-display {
  background-color: #f6f8fa;
  padding: 10px 16px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-family: monospace;
  font-size: 14px;
}

/* Statistics Panel */
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-header {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

.stats-header h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #24292e;
  font-size: 16px;
}

.stats-description {
  color: #586069;
  font-size: 14px;
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.stats-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

.stats-card h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #24292e;
  font-size: 14px;
  font-weight: 600;
}

.stats-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.stats-list li {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.stat-label {
  color: #586069;
}

.stat-value {
  font-weight: 500;
  color: #24292e;
  font-family: monospace;
}

.stats-card.interpretation {
  grid-column: span 2;
}

.interpretation-text {
  color: #24292e;
  font-size: 14px;
  line-height: 1.6;
}

.interpretation-text p {
  margin-top: 0;
  margin-bottom: 12px;
}

.interpretation-text p:last-child {
  margin-bottom: 0;
}

/* Diagnostics Panel */
.diagnostics-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.diagnostics-interpretation {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

.diagnostics-interpretation h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #24292e;
  font-size: 16px;
}

.checks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.check-card {
  background-color: #f6f8fa;
  border-radius: 8px;
  padding: 12px;
}

.check-card h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #24292e;
  font-size: 14px;
  font-weight: 600;
}

.check-card p {
  margin: 0;
  color: #586069;
  font-size: 13px;
  line-height: 1.5;
}

/* Learning notes */
.learning-notes {
  background: #f0f7ff;
  border-radius: 8px;
  padding: 16px;
  margin-top: 30px;
  border-left: 4px solid #0366d6;
}

.learning-notes h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #24292e;
  font-size: 16px;
}

.learning-notes ul {
  margin: 0;
  padding-left: 20px;
}

.learning-notes li {
  margin-bottom: 8px;
  color: #24292e;
  font-size: 14px;
  line-height: 1.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-card.interpretation {
    grid-column: auto;
  }
  
  .variable-selectors {
    flex-direction: column;
    gap: 12px;
  }
  
  .selector {
    width: 100%;
  }
}
`;
document.head.appendChild(styleElement);

// Default component to export
export default function StatisticalRegressionAnalyzer() {
  return (
    <div className="regression-analyzer-container">
      <RegressionAnalyzer />
    </div>
  );
}