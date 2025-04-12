// linear_regression_visualizer.js
// A vanilla JavaScript implementation of the Linear Regression Visualizer with 3D mode
// Includes both 2D and 3D visualization options

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('linear-regression-visualizer');
    
    if (!container) {
      console.error('Container element not found!');
      return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="visualizer-container">
        <div class="visualizer-layout">
          <div class="canvas-container">
            <div class="visualization-mode-toggle">
              <label class="toggle-control">
                <input type="checkbox" id="mode-3d"> 
                <span class="toggle-label">Enable 3D Mode (Two Features)</span>
              </label>
            </div>
            <div class="instruction">Click on the plot area to add data points</div>
            <div id="canvas-wrapper">
              <canvas id="regression-canvas" width="800" height="500"></canvas>
            </div>
            <div class="legend">
              <div class="legend-item"><span class="legend-color data"></span> Data points</div>
              <div class="legend-item"><span class="legend-color regression"></span> Regression curve/surface</div>
              <div class="legend-item"><span class="legend-color residual"></span> Residuals</div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="control-group" id="degree-control">
              <label for="polynomial-degree">Polynomial Degree:</label>
              <select id="polynomial-degree" class="full-width">
                <option value="1">Linear (Degree 1)</option>
                <option value="2">Quadratic (Degree 2)</option>
                <option value="3">Cubic (Degree 3)</option>
                <option value="4">Quartic (Degree 4)</option>
              </select>
            </div>
            
            <div class="control-group">
              <label for="error-metric">Error Metric:</label>
              <select id="error-metric" class="full-width">
                <option value="mse">Mean Squared Error (MSE)</option>
                <option value="mae">Mean Absolute Error (MAE)</option>
              </select>
            </div>
            
            <div class="toggle-group">
              <label class="toggle-control">
                <input type="checkbox" id="show-residuals" checked>
                <span class="toggle-label">Show Residuals</span>
              </label>
              
              <label class="toggle-control">
                <input type="checkbox" id="show-equation" checked>
                <span class="toggle-label">Show Equation</span>
              </label>
            </div>
            
            <div class="equation-display" id="equation-container">
              <div class="equation-title">Best Fit Equation:</div>
              <div id="regression-equation" class="equation">y = 0</div>
              <div id="error-value" class="error-metric">MSE: 0.0000</div>
            </div>
            
            <div class="example-datasets">
              <label>Example Datasets:</label>
              <div class="dataset-buttons">
                <button id="linear-data" class="dataset-btn">Linear</button>
                <button id="quadratic-data" class="dataset-btn">Quadratic</button>
                <button id="cubic-data" class="dataset-btn">Cubic</button>
                <button id="sinusoidal-data" class="dataset-btn">Sinusoidal</button>
                <button id="clear-data" class="clear-btn">Clear</button>
              </div>
            </div>
            
            <div class="how-to-use">
              <h3>How to use this demo:</h3>
              <ol>
                <li>Toggle between 2D (one feature) and 3D (two features) modes</li>
                <li>Select a polynomial degree (higher degrees can fit more complex patterns)</li>
                <li>Use the example datasets or add your own points by clicking on the plot</li>
                <li>Toggle "Show Residuals" to visualize the error between actual and predicted values</li>
                <li>Observe how the best-fit curve/surface and error metrics change</li>
                <li>In 3D mode (only quadratic), drag to rotate the view and see different angles</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div class="learning-notes">
            <h3>Side Notes:</h3>
            <ul>
                <li>Linear regression finds coefficients (β) that minimize the sum of squared residuals</li>
                <li>The normal equation (X<sup>T</sup>X)β = X<sup>T</sup>y solves for these optimal coefficients</li>
                <li>In 3D mode, we're using a fixed quadratic model with two features (x,y)</li>
                <li>Real machine learning applications often use many features (4D, 5D, or more) even though we can't visualize them</li>
                <li>Polynomial regression is still "linear" in terms of parameters</li>
                <li>MSE (Mean Squared Error) and MAE (Mean Absolute Error) quantify model performance</li>
            </ul>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .visualizer-container {
        margin-bottom: 20px;
      }
      
      .visualizer-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      /* Canvas first on mobile, controls second */
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
      
      .controls-panel {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
      
      .canvas-container {
        display: flex;
        flex-direction: column;
      }
      
      #canvas-wrapper {
        position: relative;
        width: 100%;
      }
      
      .visualization-mode-toggle {
        margin-bottom: 10px;
        background-color: #f0f7ff;
        padding: 8px 12px;
        border-radius: 4px;
        border-left: 3px solid #3498db;
      }
      
      .control-group {
        margin-bottom: 20px;
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
      
      .toggle-group {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .toggle-control {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      .toggle-label {
        margin-left: 8px;
      }
      
      .example-datasets {
        margin-bottom: 20px;
      }
      
      .example-datasets label {
        display: block;
        font-weight: bold;
        margin-bottom: 8px;
      }
      
      .dataset-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }
      
      .dataset-btn, .clear-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      
      .dataset-btn {
        background-color: #e9ecef;
        color: #333;
      }
      
      .dataset-btn:hover {
        background-color: #dee2e6;
      }
      
      .dataset-btn.active {
        background-color: #3498db;
        color: white;
      }
      
      .clear-btn {
        background-color: #e74c3c;
        color: white;
      }
      
      .clear-btn:hover {
        background-color: #c0392b;
      }
      
      .equation-display {
        background-color: #f0f7ff;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .equation-title {
        font-weight: bold;
        font-size: 0.9rem;
      }
      
      .equation {
        font-family: monospace;
        font-size: 1.1rem;
        background: white;
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
      }
      
      .error-metric {
        font-family: monospace;
        font-size: 0.9rem;
        color: #666;
        background: white;
        padding: 4px 8px;
        border-radius: 4px;
        display: inline-block;
      }
      
      .instruction {
        text-align: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        color: #666;
      }
      
      #regression-canvas {
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
        max-width: 100%;
        height: auto;
        cursor: crosshair;
        touch-action: manipulation;
        display: block;
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
      
      .legend-color.data {
        background-color: #3498db;
      }
      
      .legend-color.regression {
        background-color: #e74c3c;
      }
      
      .legend-color.residual {
        background-color: #2ecc71;
      }
      
      .how-to-use {
        background-color: #f4f8f9;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #3498db;
        margin-bottom: 20px;
      }
      
      .how-to-use h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1rem;
        color: #2c3e50;
      }
      
      .how-to-use ol {
        padding-left: 20px;
        margin-bottom: 0;
        font-size: 0.9rem;
      }
      
      .how-to-use li {
        margin-bottom: 5px;
      }
      
      .learning-notes {
        background-color: #f0f7ff;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
        border-left: 4px solid #3498db;
      }
      
      .learning-notes h3 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #2c3e50;
      }
      
      .learning-notes ul {
        padding-left: 20px;
        margin-bottom: 0;
      }
      
      .learning-notes li {
        margin-bottom: 5px;
      }
      
      /* Mobile specific styles */
      @media (max-width: 768px) {
        .dataset-btn, .clear-btn {
          padding: 10px 12px; /* Larger touch targets on mobile */
          font-size: 1rem;
        }
        
        .equation {
          font-size: 0.9rem;
        }
        
        .toggle-group {
          flex-direction: column;
          gap: 10px;
        }
        
        .toggle-control {
          padding: 8px 0;
        }
        
        /* Make checkboxes larger on mobile */
        .toggle-control input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }
        
        .toggle-label {
          font-size: 1rem;
        }
        
        /* Ensure better spacing on small screens */
        .canvas-container {
          margin-bottom: 15px;
        }
        
        /* Make dropdown selects larger for touch */
        .full-width {
          padding: 12px;
          font-size: 16px;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Load the three.js library dynamically
    function loadScript(url, callback) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.onload = callback;
      document.head.appendChild(script);
    }
    
    // First, load Three.js
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', function() {
      // Then, load OrbitControls
      loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js', initializeVisualizer);
    });
    
    function initializeVisualizer() {
      // Initialize variables
      let is3DMode = false;
      let points2D = []; // [{x, y}]
      let points3D = []; // [{x, y, z}]
      let regression2D = null;
      let regression3D = null;
      let activeDataset = null;
      
      // Scene variables
      let scene, camera, renderer, controls;
      let dataPointsMesh, regressionSurfaceMesh, residualsMesh;
      
      // Get DOM elements
      const mode3DCheckbox = document.getElementById('mode-3d');
      const degreeSelect = document.getElementById('polynomial-degree');
      const degreeControl = document.getElementById('degree-control');
      const errorMetricSelect = document.getElementById('error-metric');
      const showResidualsCheckbox = document.getElementById('show-residuals');
      const showEquationCheckbox = document.getElementById('show-equation');
      const equationContainer = document.getElementById('equation-container');
      const equationElement = document.getElementById('regression-equation');
      const errorValueElement = document.getElementById('error-value');
      const instructionText = document.querySelector('.instruction');
      
      const linearDataBtn = document.getElementById('linear-data');
      const quadraticDataBtn = document.getElementById('quadratic-data');
      const cubicDataBtn = document.getElementById('cubic-data');
      const sinusoidalDataBtn = document.getElementById('sinusoidal-data');
      const clearDataBtn = document.getElementById('clear-data');
      
      const canvasWrapper = document.getElementById('canvas-wrapper');
      const canvas2D = document.getElementById('regression-canvas');
      const ctx = canvas2D.getContext('2d');
      
      // Canvas dimensions
      const canvasWidth = canvas2D.width;
      const canvasHeight = canvas2D.height;
      const padding = 50;
      
      // Create a container for the 3D renderer
      const container3D = document.createElement('div');
      container3D.id = 'renderer-container';
      container3D.style.display = 'none';
      container3D.style.width = '100%';
      container3D.style.height = '500px';
      container3D.style.borderRadius = '4px';
      container3D.style.backgroundColor = '#fff';
      container3D.style.overflow = 'hidden';
      canvasWrapper.appendChild(container3D);
      
      // Helper functions for 2D visualization
      function dataToCanvas(point) {
        return {
          x: padding + point.x * (canvasWidth - 2 * padding),
          y: canvasHeight - padding - point.y * (canvasHeight - 2 * padding)
        };
      }
      
      function canvasToData(x, y) {
        return {
          x: (x - padding) / (canvasWidth - 2 * padding),
          y: (canvasHeight - padding - y) / (canvasHeight - 2 * padding)
        };
      }
      
      // Initialize 3D scene
      function init3DScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        
        // Camera
        camera = new THREE.PerspectiveCamera(60, canvasWrapper.clientWidth / 500, 0.1, 1000);
        camera.position.set(1.5, 1.5, 1.5);
        camera.lookAt(0.5, 0.5, 0.5);
        
        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(canvasWrapper.clientWidth, 500);
        container3D.innerHTML = '';
        container3D.appendChild(renderer.domElement);
        
        // Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0.5, 0.5, 0.5);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enableZoom = true;
        controls.addEventListener('change', render3D);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Axes
        addAxes();

        // Create grids for all three planes
        //  xy plane (horizontal "floor" grid)
        const xyGrid = new THREE.GridHelper(1, 10);
        xyGrid.position.set(0.5, 0, 0.5);
        scene.add(xyGrid);

        //  xz plane (vertical grid)
        const xzGrid = new THREE.GridHelper(1, 10);
        xzGrid.rotation.x = Math.PI / 2; // Rotate to be vertical
        xzGrid.position.set(0.5, 0.5, 0);
        scene.add(xzGrid);

        //  yz plane (vertical grid)
        const yzGrid = new THREE.GridHelper(1, 10);
        yzGrid.rotation.z = Math.PI / 2; // Rotate to be vertical
        yzGrid.position.set(0, 0.5, 0.5);
        scene.add(yzGrid);
        // Make grids semi-transparent for better visibility
        xzGrid.material.opacity = 0.2;
        xzGrid.material.transparent = true;
        xyGrid.material.opacity = 0.2;
        xyGrid.material.transparent = true;
        yzGrid.material.opacity = 0.2;
        yzGrid.material.transparent = true;
        
        // Event listener for clicking in 3D space
        renderer.domElement.addEventListener('mousedown', handle3DClick);
        renderer.domElement.addEventListener('touchstart', handle3DTouchStart, { passive: false });
        
        // Initial render
        render3D();
      }
      
      function addAxes() {
         // Create custom black axes
          const material = new THREE.LineBasicMaterial({ color: 0x000000 });
          
          // X-axis
          const xPoints = [];
          xPoints.push(new THREE.Vector3(0, 0, 0));
          xPoints.push(new THREE.Vector3(1, 0, 0));
          const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
          const xAxis = new THREE.Line(xGeometry, material);
          scene.add(xAxis);
          
          // Y-axis
          const yPoints = [];
          yPoints.push(new THREE.Vector3(0, 0, 0));
          yPoints.push(new THREE.Vector3(0, 0, 1)); // Changed: y now points along z
          const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
          const yAxis = new THREE.Line(yGeometry, material);
          scene.add(yAxis);
          
          // Z-axis
          const zPoints = [];
          zPoints.push(new THREE.Vector3(0, 0, 0));
          zPoints.push(new THREE.Vector3(0, 1, 0)); // Changed: z now points along y
          const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
          const zAxis = new THREE.Line(zGeometry, material);
          scene.add(zAxis);
          
          // Labels - updated to match new orientation
          addLabel('X', 1.1, 0, 0);
          addLabel('Y', 0, 0, 1.1);
          addLabel('Z', 0, 1.1, 0);
      }
      
      function addLabel(text, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        context.fillStyle = 'rgba(255, 255, 255, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = '48px Arial';
        context.fillStyle = 'rgba(0, 0, 0, 1)';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.1, 0.05, 1);
        scene.add(sprite);
      }
      
      function render3D() {
        if (renderer) {
          renderer.render(scene, camera);
        }
      }
      
      function handle3DClick(event) {
        if (!is3DMode) return;
        
        // Get normalized device coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        // Raycast to the XZ plane (y = 0)
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        // Check if point is within bounds [0,1] for x and z
        if (intersectPoint.x >= 0 && intersectPoint.x <= 1 && 
            intersectPoint.z >= 0 && intersectPoint.z <= 1) {
          
          // Generate a random height between 0.1 and 0.9
          const y = Math.random() * 0.8 + 0.1;
          
          // Add the new point
          points3D.push({
            x: intersectPoint.x,
            y: y,
            z: intersectPoint.z
          });
          
          // Reset active dataset
          activeDataset = null;
          document.querySelectorAll('.dataset-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Calculate 3D regression
          calculate3DRegression();
          
          // Update visualization
          update3DVisualization();
        }
      }
      
      function handle3DTouchStart(event) {
        event.preventDefault();
        
        if (!is3DMode) return;
        
        const touch = event.touches[0];
        const fakeEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY
        };
        
        handle3DClick(fakeEvent);
      }
      
      // Generate example datasets
      function generateDataset(type) {
        // Clear existing dataset buttons
        document.querySelectorAll('.dataset-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // Set active dataset
        activeDataset = type;
        
        // Highlight active button
        if (type === 'linear') linearDataBtn.classList.add('active');
        if (type === 'quadratic') quadraticDataBtn.classList.add('active');
        if (type === 'cubic') cubicDataBtn.classList.add('active');
        if (type === 'sinusoidal') sinusoidalDataBtn.classList.add('active');
        
        if (is3DMode) {
          // Clear existing points for 3D
          points3D = [];

          // Helper function for adding noise and clamping values
          function addNoiseAndClamp(value) {
            return Math.max(0.05, Math.min(0.95, value + (Math.random() - 0.5) * 0.05));
          }
          
          // Generate new 3D points based on dataset type
          if (type === 'linear') {
            // Linear relationship: z = 0.4x + 0.5y + 0.1
            for (let i = 0; i < 50; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = Math.random() * 0.8 + 0.1;
              const z = 0.4 * x + 0.5 * y + 0.1 + (Math.random() - 0.5) * 0.1;
              points3D.push({ x, y, z: addNoiseAndClamp(z) });
            }
          } else if (type === 'quadratic') {
            // Quadratic relationship: z = 0.8x² + 0.2y² + 0.1
            for (let i = 0; i < 50; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = Math.random() * 0.8 + 0.1;
              const z = 0.8 * x * x + 0.2 * y * y + 0.1 + (Math.random() - 0.5) * 0.1;
              points3D.push({ x, y, z: addNoiseAndClamp(z) });
            }
          } else if (type === 'cubic') {
            // Cubic relationship:
            for (let i = 0; i < 50; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = Math.random() * 0.8 + 0.1;
              const z = 0.8 * Math.pow(x, 3) - 0.6 * Math.pow(y, 2) + 0.3 * x * y + 0.3;
              points3D.push({ x, y, z: addNoiseAndClamp(z) });
            }
          } else if (type === 'sinusoidal') {
            // Sinusoidal relationship: z = 0.3sin(5x) + 0.3sin(5y) + 0.5
            for (let i = 0; i < 50; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = Math.random() * 0.8 + 0.1;
              const z = 0.3 * Math.sin(5 * x) + 0.3 * Math.sin(5 * y) + 0.5 + (Math.random() - 0.5) * 0.05;
              points3D.push({ x, y, z: addNoiseAndClamp(z) });
            }
          }
          
          // Calculate regression and update visualization
          calculate3DRegression();
          update3DVisualization();
        } else {
          // Clear existing points for 2D
          points2D = [];
          
          // Generate new 2D points based on dataset type
          if (type === 'linear') {
            // Linear relationship
            for (let i = 0; i < 20; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = 0.8 * x + 0.1 + (Math.random() - 0.5) * 0.1;
              points2D.push({ x, y });
            }
          } else if (type === 'quadratic') {
            // Quadratic relationship
            for (let i = 0; i < 20; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = 1.5 * x * x + 0.1 + (Math.random() - 0.5) * 0.1;
              points2D.push({ x, y });
            }
          } else if (type === 'cubic') {
            // Cubic relationship
            for (let i = 0; i < 20; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = 3 * Math.pow(x, 3) - 1.5 * Math.pow(x, 2) + 0.5 * x + 0.1 + (Math.random() - 0.5) * 0.1;
              points2D.push({ x, y });
            }
          } else if (type === 'sinusoidal') {
            // Sinusoidal relationship
            for (let i = 0; i < 30; i++) {
              const x = Math.random() * 0.8 + 0.1;
              const y = 0.4 * Math.sin(10 * x) + 0.5 + (Math.random() - 0.5) * 0.05;
              points2D.push({ x, y });
            }
          }
          
          // Calculate regression and redraw canvas
          calculateRegression2D();
          drawCanvas();
        }
      }
      
      // 2D Regression calculation
      function calculateRegression2D() {
        if (points2D.length < 2) {
          regression2D = null;
          updateEquationDisplay();
          return;
        }
        
        const degree = parseInt(degreeSelect.value);
        
        // Prepare matrices for normal equation: X^T X β = X^T y
        const X = [];
        const Y = [];
        
        // Build design matrix X with polynomial terms
        for (const point of points2D) {
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
        
        // Calculate predictions and error metrics
        let mse = 0;
        let mae = 0;
        const predictions = [];
        
        for (let i = 0; i < points2D.length; i++) {
            let predicted = 0;
            for (let j = 0; j <= degree; j++) {
              predicted += coefficients[j] * Math.pow(points2D[i].x, j);
            }
            predictions.push(predicted);
            
            const error = points2D[i].y - predicted;
            mse += error * error;
            mae += Math.abs(error);
          }
          
          mse /= points2D.length;
          mae /= points2D.length;
          
          regression2D = {
            coefficients,
            predictions,
            mse,
            mae
          };
          
          updateEquationDisplay();
        }
        
        // 3D Regression calculation
        function calculate3DRegression() {
          if (points3D.length < 4) { // Need more points for 3D
            regression3D = null;
            updateEquationDisplay();
            return;
          }
          
          const degree = 2; // Fixed degree for 3D visualization (quadratic surface)
          
          // Prepare matrices for multivariate regression
          const X = [];
          const Z = []; // Output is Z in 3D case
          
          // Build design matrix with terms: 1, x, y, x^2, xy, y^2
          for (const point of points3D) {
            const row = [
              1,              // constant term
              point.x,        // x term
              point.y,        // y term
              point.x * point.x,  // x^2 term
              point.x * point.y,  // xy term
              point.y * point.y   // y^2 term
            ];
            X.push(row);
            Z.push(point.z);
          }
          
          // Calculate X^T X
          const XtX = [];
          for (let i = 0; i < 6; i++) {
            XtX[i] = [];
            for (let j = 0; j < 6; j++) {
              let sum = 0;
              for (let k = 0; k < X.length; k++) {
                sum += X[k][i] * X[k][j];
              }
              XtX[i][j] = sum;
            }
          }
          
          // Calculate X^T z
          const XtZ = [];
          for (let i = 0; i < 6; i++) {
            let sum = 0;
            for (let k = 0; k < X.length; k++) {
              sum += X[k][i] * Z[k];
            }
            XtZ[i] = sum;
          }
          
          // Solve the system using Gaussian elimination
          const coefficients = solveSystem(XtX, XtZ);
          
          // Calculate predictions and error metrics
          let mse = 0;
          let mae = 0;
          const predictions = [];
          
          for (let i = 0; i < points3D.length; i++) {
            const point = points3D[i];
            const predicted = coefficients[0] + 
                             coefficients[1] * point.x + 
                             coefficients[2] * point.y + 
                             coefficients[3] * point.x * point.x + 
                             coefficients[4] * point.x * point.y + 
                             coefficients[5] * point.y * point.y;
            
            predictions.push(predicted);
            
            const error = point.z - predicted;
            mse += error * error;
            mae += Math.abs(error);
          }
          
          mse /= points3D.length;
          mae /= points3D.length;
          
          regression3D = {
            coefficients,
            predictions,
            mse,
            mae
          };
          
          updateEquationDisplay();
        }
        
        // Gaussian elimination to solve the system (same for 2D and 3D)
        function solveSystem(A, b) {
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
            
            // Check for singular matrix
            if (Math.abs(augMatrix[i][i]) < 1e-10) {
              continue; // Skip to next iteration if pivot is too small
            }
            
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
            if (Math.abs(augMatrix[i][i]) > 1e-10) {
              x[i] /= augMatrix[i][i];
            }
          }
          
          return x;
        }
        
        // Update equation display based on current mode
        function updateEquationDisplay() {
          const regression = is3DMode ? regression3D : regression2D;
          
          if (!regression) {
            equationElement.textContent = is3DMode ? 
              "z = (Need at least 4 points for 3D)" : 
              "y = (Need at least 2 points)";
            errorValueElement.textContent = "";
            return;
          }
          
          // Format equation string
          let equation = is3DMode ? "z = " : "y = ";
          
          if (is3DMode) {
            // 3D equation format: z = a + bx + cy + dx² + exy + fy²
            const terms = [
              regression.coefficients[0], // constant
              regression.coefficients[1] + "x", // x term
              regression.coefficients[2] + "y", // y term
              regression.coefficients[3] + "x²", // x² term
              regression.coefficients[4] + "xy", // xy term
              regression.coefficients[5] + "y²" // y² term
            ];
            
            equation += formatTerms(terms);
          } else {
            // 2D equation format: y = a + bx + cx² + ...
            const terms = regression.coefficients.map((coef, index) => {
              if (index === 0) return coef;
              if (index === 1) return coef + "x";
              return coef + "x^" + index;
            });
            
            equation += formatTerms(terms);
          }
          
          equationElement.textContent = equation;
          
          // Format error metric
          const errorMetric = errorMetricSelect.value;
          const error = errorMetric === 'mse' ? regression.mse : regression.mae;
          errorValueElement.textContent = `${errorMetric.toUpperCase()}: ${Math.round(error * 10000) / 10000}`;
          
          // Show/hide equation container based on checkbox
          equationContainer.style.display = showEquationCheckbox.checked ? 'block' : 'none';
        }
        
        // Helper function to format equation terms
        function formatTerms(terms) {
          let result = "";
          let first = true;
          
          for (let i = 0; i < terms.length; i++) {
            if (typeof terms[i] === 'number') {
              const roundedCoef = Math.round(terms[i] * 10000) / 10000;
              if (roundedCoef === 0) continue;
              
              if (first) {
                result += roundedCoef;
                first = false;
              } else {
                result += roundedCoef >= 0 ? " + " + roundedCoef : " - " + Math.abs(roundedCoef);
              }
            } else {
              const parts = terms[i].split(/([a-z^²]+)/);
              const coef = parseFloat(parts[0]);
              const roundedCoef = Math.round(coef * 10000) / 10000;
              if (roundedCoef === 0) continue;
              
              const variable = parts[1];
              
              if (first) {
                result += roundedCoef + variable;
                first = false;
              } else {
                result += roundedCoef >= 0 ? 
                  " + " + roundedCoef + variable : 
                  " - " + Math.abs(roundedCoef) + variable;
              }
            }
          }
          
          return result === "" ? "0" : result;
        }
        
        // Drawing functions for 2D Canvas
        function drawGrid() {
          ctx.strokeStyle = '#eee';
          ctx.lineWidth = 1;
          
          // Calculate grid spacing
          const gridSizeX = (canvasWidth - 2 * padding) / 10;
          const gridSizeY = (canvasHeight - 2 * padding) / 10;
          
          // Draw vertical grid lines
          for (let i = 0; i <= 10; i++) {
            const x = padding + i * gridSizeX;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, canvasHeight - padding);
            ctx.stroke();
            
            // Draw tick labels on x-axis
            if (i % 2 === 0) {
              const label = (i / 10).toFixed(1);
              ctx.fillStyle = '#666';
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(label, x, canvasHeight - padding + 20);
            }
          }
          
          // Draw horizontal grid lines
          for (let i = 0; i <= 10; i++) {
            const y = canvasHeight - padding - i * gridSizeY;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvasWidth - padding, y);
            ctx.stroke();
            
            // Draw tick labels on y-axis
            if (i % 2 === 0) {
              const label = (i / 10).toFixed(1);
              ctx.fillStyle = '#666';
              ctx.font = '12px Arial';
              ctx.textAlign = 'right';
              ctx.fillText(label, padding - 10, y + 4);
            }
          }
          
          // Draw axes
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 2;
          
          // x-axis
          ctx.beginPath();
          ctx.moveTo(padding, canvasHeight - padding);
          ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
          ctx.stroke();
          
          // y-axis
          ctx.beginPath();
          ctx.moveTo(padding, canvasHeight - padding);
          ctx.lineTo(padding, padding);
          ctx.stroke();
          
          // Axis labels
          ctx.fillStyle = '#333';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('X', canvasWidth - padding + 25, canvasHeight - padding + 25);
          ctx.textAlign = 'right';
          ctx.fillText('Y', padding - 20, padding - 15);
        }
        
        function drawPoints() {
          ctx.fillStyle = '#3498db';
          ctx.strokeStyle = '#2980b9';
          ctx.lineWidth = 1.5;
          
          points2D.forEach(point => {
            const canvasPoint = dataToCanvas(point);
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, 6, 0, Math.PI * 2); // Larger points for better visibility
            ctx.fill();
            ctx.stroke();
          });
        }
        
        function drawRegressionCurve() {
          if (!regression2D) return;
          
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          
          const degree = parseInt(degreeSelect.value);
          const numPoints = 100;
          
          for (let i = 0; i <= numPoints; i++) {
            const x = i / numPoints;
            
            // Calculate y using polynomial
            let y = 0;
            for (let j = 0; j <= degree; j++) {
              y += regression2D.coefficients[j] * Math.pow(x, j);
            }
            
            // Clip to visible area
            y = Math.max(0, Math.min(1, y));
            
            const canvasPoint = dataToCanvas({ x, y });
            
            if (i === 0) {
              ctx.moveTo(canvasPoint.x, canvasPoint.y);
            } else {
              ctx.lineTo(canvasPoint.x, canvasPoint.y);
            }
          }
          
          ctx.stroke();
        }
        
        function drawResiduals() {
          if (!regression2D || !showResidualsCheckbox.checked) return;
          
          ctx.strokeStyle = '#2ecc71';
          ctx.lineWidth = 2;
          
          points2D.forEach((point, index) => {
            const canvasPoint = dataToCanvas(point);
            
            // Calculate predicted y using polynomial
            let predictedY = 0;
            for (let j = 0; j <= regression2D.coefficients.length - 1; j++) {
              predictedY += regression2D.coefficients[j] * Math.pow(point.x, j);
            }
            
            const canvasPredicted = dataToCanvas({ x: point.x, y: predictedY });
            
            // Draw vertical line from point to regression curve
            ctx.beginPath();
            ctx.moveTo(canvasPoint.x, canvasPoint.y);
            ctx.lineTo(canvasPoint.x, canvasPredicted.y);
            ctx.stroke();
          });
        }
        
        function drawCanvas() {
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          
          drawGrid();
          drawPoints();
          drawRegressionCurve();
          drawResiduals();
        }
        
        // 3D Visualization functions
        function update3DVisualization() {
          // Clear previous meshes
          if (dataPointsMesh) scene.remove(dataPointsMesh);
          if (regressionSurfaceMesh) scene.remove(regressionSurfaceMesh);
          if (residualsMesh) scene.remove(residualsMesh);
          
          // Create data points
          const dataPointsGeometry = new THREE.BufferGeometry();
          const positions = [];
          const colors = [];
          
          points3D.forEach(point => {
            positions.push(point.x, point.y, point.z);
            colors.push(0.2, 0.6, 0.9); // Blue
          });
          
          dataPointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          dataPointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          
          const pointsMaterial = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true
          });
          
          dataPointsMesh = new THREE.Points(dataPointsGeometry, pointsMaterial);
          scene.add(dataPointsMesh);
          
          // Create regression surface if we have coefficients
          if (regression3D) {
            // Create a surface grid
            const gridResolution = 20;
            const surfaceGeometry = new THREE.BufferGeometry();
            const surfacePositions = [];
            const surfaceIndices = [];
            
            // Generate vertices
            for (let i = 0; i <= gridResolution; i++) {
              const y = i / gridResolution;
              for (let j = 0; j <= gridResolution; j++) {
                const x = j / gridResolution;
                
                // Calculate z using the regression formula
                const z = regression3D.coefficients[0] + 
                         regression3D.coefficients[1] * x + 
                         regression3D.coefficients[2] * y + 
                         regression3D.coefficients[3] * x * x + 
                         regression3D.coefficients[4] * x * y + 
                         regression3D.coefficients[5] * y * y;
                
                // Clamp z to avoid extreme values
                const clampedZ = Math.max(0, Math.min(1, z));
                
                surfacePositions.push(x, y, clampedZ);
              }
            }
            
            // Generate indices for triangles
            for (let i = 0; i < gridResolution; i++) {
              for (let j = 0; j < gridResolution; j++) {
                const a = i * (gridResolution + 1) + j;
                const b = i * (gridResolution + 1) + (j + 1);
                const c = (i + 1) * (gridResolution + 1) + j;
                const d = (i + 1) * (gridResolution + 1) + (j + 1);
                
                // First triangle
                surfaceIndices.push(a, b, c);
                // Second triangle
                surfaceIndices.push(b, d, c);
              }
            }
            
            surfaceGeometry.setIndex(surfaceIndices);
            surfaceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(surfacePositions, 3));
            surfaceGeometry.computeVertexNormals();
            
            const surfaceMaterial = new THREE.MeshBasicMaterial({     
              color: 0xe74c3c, 
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.7,
              wireframe: false
            });
            
            regressionSurfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
            scene.add(regressionSurfaceMesh);
            
            // Add residuals if enabled
            if (showResidualsCheckbox.checked) {
              const residualsGeometry = new THREE.BufferGeometry();
              const residualPositions = [];
              
              points3D.forEach(point => {
                // Calculate predicted z value
                const predictedZ = regression3D.coefficients[0] + 
                                  regression3D.coefficients[1] * point.x + 
                                  regression3D.coefficients[2] * point.y + 
                                  regression3D.coefficients[3] * point.x * point.x + 
                                  regression3D.coefficients[4] * point.x * point.y + 
                                  regression3D.coefficients[5] * point.y * point.y;
                
                // Create line from point to prediction
                residualPositions.push(point.x, point.y, point.z);
                residualPositions.push(point.x, point.y, predictedZ);
              });
              
              residualsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(residualPositions, 3));
              
              const residualsMaterial = new THREE.LineBasicMaterial({
                color: 0x2ecc71,
                linewidth: 2
              });
              
              residualsMesh = new THREE.LineSegments(residualsGeometry, residualsMaterial);
              scene.add(residualsMesh);
            }
          }
          
          render3D();
        }
        
        // Event handlers
        function handleModeChange() {
          is3DMode = mode3DCheckbox.checked;
          
          if (is3DMode) {
            // Switch to 3D mode
            canvas2D.style.display = 'none';
            container3D.style.display = 'block';
            instructionText.textContent = "Click on the plot area to add data points (will generate random height)";
            
            // Initialize 3D scene if not already done
            if (!scene) {
              init3DScene();
            }
            
            // Make sure we have some 3D data
            if (points3D.length === 0) {
              generateDataset('linear');
            } else {
              update3DVisualization();
            }
            
            // Update degree select for 3D (restrict to quadratic)
            degreeSelect.value = "2";
            degreeSelect.disabled = true;
            
            // Update equation display
            updateEquationDisplay();
          } else {
            // Switch to 2D mode
            canvas2D.style.display = 'block';
            container3D.style.display = 'none';
            instructionText.textContent = "Click on the plot area to add data points";
            
            // Re-enable degree select
            degreeSelect.disabled = false;
            
            // Make sure we have some 2D data
            if (points2D.length === 0) {
              generateDataset('linear');
            } else {
              calculateRegression2D();
              drawCanvas();
            }
            
            // Update equation display
            updateEquationDisplay();
          }
        }
        
        function handleCanvasClick(e) {
          if (is3DMode) return; // Handle 3D clicks separately
          
          const rect = canvas2D.getBoundingClientRect();
          const scaleX = canvas2D.width / rect.width;
          const scaleY = canvas2D.height / rect.height;
          
          const clickX = (e.clientX - rect.left) * scaleX;
          const clickY = (e.clientY - rect.top) * scaleY;
          
          // Convert canvas coordinates to data coordinates
          const dataPoint = canvasToData(clickX, clickY);
          
          // Ensure point is within bounds
          if (dataPoint.x >= 0 && dataPoint.x <= 1 && dataPoint.y >= 0 && dataPoint.y <= 1) {
            points2D.push(dataPoint);
            
            // Reset active dataset when manually adding points
            activeDataset = null;
            document.querySelectorAll('.dataset-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            
            // Calculate regression with new point
            calculateRegression2D();
            
            // Redraw canvas
            drawCanvas();
          }
        }
        
        function handleTouchStart(e) {
          e.preventDefault();
          
          if (is3DMode) return; // Handle 3D touches separately
          
          const touch = e.touches[0];
          const rect = canvas2D.getBoundingClientRect();
          const scaleX = canvas2D.width / rect.width;
          const scaleY = canvas2D.height / rect.height;
          
          const touchX = (touch.clientX - rect.left) * scaleX;
          const touchY = (touch.clientY - rect.top) * scaleY;
          
          // Convert canvas coordinates to data coordinates
          const dataPoint = canvasToData(touchX, touchY);
          
          // Ensure point is within bounds
          if (dataPoint.x >= 0 && dataPoint.x <= 1 && dataPoint.y >= 0 && dataPoint.y <= 1) {
            points2D.push(dataPoint);
            
            // Reset active dataset
            activeDataset = null;
            document.querySelectorAll('.dataset-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            
            // Calculate regression with new point
            calculateRegression2D();
            
            // Redraw canvas
            drawCanvas();
          }
        }
        
        function handleDegreeChange() {
          if (!is3DMode) {
            calculateRegression2D();
            drawCanvas();
          }
        }
        
        function handleErrorMetricChange() {
          updateEquationDisplay();
        }
        
        function handleShowResidualsChange() {
          if (is3DMode) {
            update3DVisualization();
          } else {
            drawCanvas();
          }
        }
        
        function handleShowEquationChange() {
          updateEquationDisplay();
        }
        
        function handleResetClick() {
          if (is3DMode) {
            points3D = [];
            regression3D = null;
            update3DVisualization();
          } else {
            points2D = [];
            regression2D = null;
            drawCanvas();
          }
          
          activeDataset = null;
          document.querySelectorAll('.dataset-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          
          updateEquationDisplay();
        }
        
        // Add event listeners
        mode3DCheckbox.addEventListener('change', handleModeChange);
        canvas2D.addEventListener('click', handleCanvasClick);
        canvas2D.addEventListener('touchstart', handleTouchStart, { passive: false });
        
        degreeSelect.addEventListener('change', handleDegreeChange);
        errorMetricSelect.addEventListener('change', handleErrorMetricChange);
        showResidualsCheckbox.addEventListener('change', handleShowResidualsChange);
        showEquationCheckbox.addEventListener('change', handleShowEquationChange);
        
        linearDataBtn.addEventListener('click', () => generateDataset('linear'));
        quadraticDataBtn.addEventListener('click', () => generateDataset('quadratic'));
        cubicDataBtn.addEventListener('click', () => generateDataset('cubic'));
        sinusoidalDataBtn.addEventListener('click', () => generateDataset('sinusoidal'));
        clearDataBtn.addEventListener('click', handleResetClick);
        
        // Handle window resize to make canvas responsive
        function handleResize() {
          // Resize 2D canvas
          const parent = canvasWrapper;
          const ratio = canvasHeight / canvasWidth;
          const newWidth = parent.clientWidth;
          const newHeight = newWidth * ratio;
          
          canvas2D.style.width = newWidth + 'px';
          canvas2D.style.height = newHeight + 'px';
          
          drawCanvas();
          
          // Resize 3D renderer if it exists
          if (renderer) {
            renderer.setSize(parent.clientWidth, 500);
            render3D();
          }
        }
        
        window.addEventListener('resize', handleResize);
        handleResize();
        
        // Initialize with 2D mode
        generateDataset('linear');
      }
    });