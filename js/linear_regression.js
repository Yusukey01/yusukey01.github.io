import React, { useState, useEffect, useRef } from 'react';

const LinearRegressionDemo = () => {
  const [points, setPoints] = useState([]);
  const [regression, setRegression] = useState(null);
  const [showResiduals, setShowResiduals] = useState(false);
  const [showEquation, setShowEquation] = useState(true);
  const [degree, setDegree] = useState(1);
  const [errorMetric, setErrorMetric] = useState("MSE");
  const [selectedExample, setSelectedExample] = useState("none");
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef(null);
  
  // Responsive dimensions
  const getCanvasDimensions = () => {
    // Base dimensions for desktop
    const baseWidth = 600;
    const baseHeight = 400;
    
    // For mobile
    if (isMobile) {
      return {
        width: 320,
        height: 300,
        padding: 30
      };
    }
    
    // For desktop
    return {
      width: baseWidth,
      height: baseHeight,
      padding: 40
    };
  };
  
  const { width, height, padding } = getCanvasDimensions();
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Generate sample datasets
  const generateExampleData = (type) => {
    let newPoints = [];
    
    if (type === "linear") {
      // Linear relationship
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 0.8 * x + 0.1 + (Math.random() - 0.5) * 0.1;
        newPoints.push({ x, y });
      }
    } else if (type === "quadratic") {
      // Quadratic relationship
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 1.5 * x * x + 0.1 + (Math.random() - 0.5) * 0.1;
        newPoints.push({ x, y });
      }
    } else if (type === "cubic") {
      // Cubic relationship
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 3 * Math.pow(x, 3) - 1.5 * Math.pow(x, 2) + 0.5 * x + 0.1 + (Math.random() - 0.5) * 0.1;
        newPoints.push({ x, y });
      }
    } else if (type === "sinusoidal") {
      // Sinusoidal relationship
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 0.8 + 0.1;
        const y = 0.4 * Math.sin(10 * x) + 0.5 + (Math.random() - 0.5) * 0.05;
        newPoints.push({ x, y });
      }
    }
    
    setPoints(newPoints);
    setSelectedExample(type);
  };
  
  const clearPoints = () => {
    setPoints([]);
    setRegression(null);
    setSelectedExample("none");
  };
  
  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX - padding) / (width - 2 * padding);
    const y = 1 - ((e.clientY - rect.top) * scaleY - padding) / (height - 2 * padding);
    
    // Ensure points are within the visible area
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setPoints([...points, { x, y }]);
    }
  };
  
  // Function to calculate polynomial regression
  const calculateRegression = () => {
    if (points.length < 2) {
      setRegression(null);
      return;
    }
    
    // Prepare matrices for normal equation: X^T X β = X^T y
    const X = [];
    const Y = [];
    
    // Build design matrix X with polynomial terms
    for (const point of points) {
      const row = [];
      for (let i = 0; i <= degree; i++) {
        row.push(Math.pow(point.x, i));
      }
      X.push(row);
      Y.push(point.y);
    }
    
    // Calculate X^T X
    const XtX = [];
    for (let i = 0; i <= degree; i++) {
      XtX[i] = [];
      for (let j = 0; j <= degree; j++) {
        let sum = 0;
        for (let k = 0; k < X.length; k++) {
          sum += X[k][i] * X[k][j];
        }
        XtX[i][j] = sum;
      }
    }
    
    // Calculate X^T y
    const XtY = [];
    for (let i = 0; i <= degree; i++) {
      let sum = 0;
      for (let k = 0; k < X.length; k++) {
        sum += X[k][i] * Y[k];
      }
      XtY[i] = sum;
    }
    
    // Solve the system using Gaussian elimination
    const coefficients = solveSystem(XtX, XtY);
    
    // Calculate predictions and error
    let mse = 0;
    let mae = 0;
    const predictions = [];
    
    for (let i = 0; i < points.length; i++) {
      let predicted = 0;
      for (let j = 0; j <= degree; j++) {
        predicted += coefficients[j] * Math.pow(points[i].x, j);
      }
      predictions.push(predicted);
      
      const error = points[i].y - predicted;
      mse += error * error;
      mae += Math.abs(error);
    }
    
    mse /= points.length;
    mae /= points.length;
    
    setRegression({
      coefficients,
      predictions,
      mse,
      mae
    });
  };
  
  // Gaussian elimination to solve the system
  const solveSystem = (A, b) => {
    const n = A.length;
    const augMatrix = A.map((row, i) => [...row, b[i]]);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(augMatrix[j][i]) > Math.abs(augMatrix[maxRow][i])) {
          maxRow = j;
        }
      }
      
      // Swap rows
      [augMatrix[i], augMatrix[maxRow]] = [augMatrix[maxRow], augMatrix[i]];
      
      // Eliminate below
      for (let j = i + 1; j < n; j++) {
        const factor = augMatrix[j][i] / augMatrix[i][i];
        for (let k = i; k <= n; k++) {
          augMatrix[j][k] -= factor * augMatrix[i][k];
        }
      }
    }
    
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augMatrix[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augMatrix[i][j] * x[j];
      }
      x[i] /= augMatrix[i][i];
    }
    
    return x;
  };
  
  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    // Draw the coordinate system
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = isMobile ? '12px Arial' : '14px Arial';
    ctx.fillText('X', width - padding + 10, height - padding + 4);
    ctx.fillText('Y', padding - 15, padding - 10);
    
    // Draw points
    ctx.fillStyle = '#3498db';
    for (const point of points) {
      const x = padding + point.x * (width - 2 * padding);
      const y = height - padding - point.y * (height - 2 * padding);
      ctx.beginPath();
      ctx.arc(x, y, isMobile ? 4 : 5, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw regression line/curve if available
    if (regression) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i <= 100; i++) {
        const x = i / 100;
        let y = 0;
        for (let j = 0; j <= degree; j++) {
          y += regression.coefficients[j] * Math.pow(x, j);
        }
        
        // Clip to canvas boundaries
        if (y < 0) y = 0;
        if (y > 1) y = 1;
        
        const canvasX = padding + x * (width - 2 * padding);
        const canvasY = height - padding - y * (height - 2 * padding);
        
        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      }
      ctx.stroke();
      
      // Draw residuals if enabled
      if (showResiduals) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const predicted = regression.predictions[i];
          
          const x = padding + point.x * (width - 2 * padding);
          const y = height - padding - point.y * (height - 2 * padding);
          const predY = height - padding - predicted * (height - 2 * padding);
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, predY);
          ctx.stroke();
        }
      }
    }
    
  }, [points, regression, showResiduals, degree, width, height, padding, isMobile]);
  
  useEffect(() => {
    if (points.length >= 2) {
      calculateRegression();
    }
  }, [points, degree]);
  
  // Format coefficients for display
  const formatEquation = () => {
    if (!regression) return "Need at least 2 points";
    
    let equation = "y = ";
    regression.coefficients.forEach((coef, index) => {
      // Round coefficient to 4 decimal places
      const roundedCoef = Math.round(coef * 10000) / 10000;
      
      if (index === 0) {
        equation += roundedCoef;
      } else if (index === 1) {
        if (roundedCoef >= 0) equation += " + " + roundedCoef + "x";
        else equation += " - " + Math.abs(roundedCoef) + "x";
      } else {
        if (roundedCoef >= 0) equation += " + " + roundedCoef + "x^" + index;
        else equation += " - " + Math.abs(roundedCoef) + "x^" + index;
      }
    });
    
    return equation;
  };
  
  const formatError = () => {
    if (!regression) return "";
    
    const error = errorMetric === "MSE" ? regression.mse : regression.mae;
    return `${errorMetric}: ${Math.round(error * 10000) / 10000}`;
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800">Interactive Linear Regression Demo</h2>
      
      <div className="mb-6 flex flex-wrap gap-2 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Polynomial Degree:</label>
          <select 
            value={degree} 
            onChange={(e) => setDegree(parseInt(e.target.value))}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-xs md:text-sm rounded-lg p-2"
          >
            <option value={1}>Linear (Degree 1)</option>
            <option value={2}>Quadratic (Degree 2)</option>
            <option value={3}>Cubic (Degree 3)</option>
            <option value={4}>Quartic (Degree 4)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Error Metric:</label>
          <select 
            value={errorMetric} 
            onChange={(e) => setErrorMetric(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-xs md:text-sm rounded-lg p-2"
          >
            <option value="MSE">Mean Squared Error</option>
            <option value="MAE">Mean Absolute Error</option>
          </select>
        </div>
        
        <div className="flex items-end">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showResiduals}
              onChange={() => setShowResiduals(!showResiduals)}
              className="form-checkbox h-4 w-4 md:h-5 md:w-5 text-blue-600"
            />
            <span className="ml-2 text-xs md:text-sm text-gray-700">Show Residuals</span>
          </label>
        </div>
        
        <div className="flex items-end">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showEquation}
              onChange={() => setShowEquation(!showEquation)}
              className="form-checkbox h-4 w-4 md:h-5 md:w-5 text-blue-600"
            />
            <span className="ml-2 text-xs md:text-sm text-gray-700">Show Equation</span>
          </label>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-xs md:text-sm text-gray-600 mb-2">
          Example Datasets:
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => generateExampleData("linear")}
            className={`px-2 py-1 text-xs md:text-sm rounded ${selectedExample === "linear" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            Linear
          </button>
          <button 
            onClick={() => generateExampleData("quadratic")}
            className={`px-2 py-1 text-xs md:text-sm rounded ${selectedExample === "quadratic" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            Quadratic
          </button>
          <button 
            onClick={() => generateExampleData("cubic")}
            className={`px-2 py-1 text-xs md:text-sm rounded ${selectedExample === "cubic" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            Cubic
          </button>
          <button 
            onClick={() => generateExampleData("sinusoidal")}
            className={`px-2 py-1 text-xs md:text-sm rounded ${selectedExample === "sinusoidal" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            Sinusoidal
          </button>
          <button 
            onClick={clearPoints}
            className="px-2 py-1 text-xs md:text-sm rounded bg-red-600 text-white"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="mb-4 text-xs md:text-sm text-gray-600">
        Click on the plot area below to add data points manually.
      </div>
      
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="border border-gray-300 bg-gray-50 rounded-lg mb-4 cursor-crosshair mx-auto touch-manipulation"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {showEquation && regression && (
        <div className="mb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center md:space-x-4">
            <div className="p-2 md:p-3 bg-gray-100 rounded-lg mb-2 md:mb-0 overflow-x-auto w-full md:w-auto">
              <span className="text-sm md:text-lg font-mono">{formatEquation()}</span>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <span className="text-xs md:text-sm font-mono">{formatError()}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-xs md:text-sm text-gray-700">
        <h3 className="font-semibold mb-1 md:mb-2">How to use this demo:</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Select a polynomial degree (higher degrees can fit more complex patterns)</li>
          <li>Use the example datasets or add your own points by clicking on the graph</li>
          <li>Toggle "Show Residuals" to visualize the error between actual and predicted values</li>
          <li>Observe how the best-fit line or curve and error metrics change as you add or remove points</li>
          <li>Try different degrees with the same data to see the effect of overfitting</li>
        </ol>
      </div>
      
    </div>
  );
};

export default LinearRegressionDemo;