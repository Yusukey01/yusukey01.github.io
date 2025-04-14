// A Three JS implementation for 3D visualization of orthogonality concepts

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('orthogonality-visualizer-3d');
    
    if (!container) {
      console.error('3D container element not found!');
      return;
    }
    
    // Create HTML structure
    container.innerHTML = `
      <div class="visualizer-container">
        <div class="visualizer-layout">
          <div class="canvas-container">
            <div class="visualization-mode-toggle">
              <label class="toggle-control">
                <select id="demo-type-3d" class="full-width">
                  <option value="projection3d">3D Orthogonal Projection</option>
                  <option value="gramschmidt3d">3D Gram-Schmidt Process</option>
                </select>
              </label>
            </div>
            <div class="instruction" id="instruction-text-3d">Drag to rotate the 3D space and see orthogonal projection</div>
            <div id="canvas-wrapper-3d" style="position: relative;">
              <div id="three-canvas-container" style="width: 100%; height: 500px;"></div>
            </div>
            <div class="legend" id="legend-container-3d">
              <div class="legend-item"><span class="legend-color vector-a"></span> Vector u</div>
              <div class="legend-item"><span class="legend-color vector-b"></span> Vector v</div>
              <div class="legend-item"><span class="legend-color vector-c"></span> Vector w</div>
              <div class="legend-item"><span class="legend-color projection"></span> Projection</div>
              <div class="legend-item"><span class="legend-color orthogonal"></span> Orthogonal component</div>
            </div>
          </div>
          
          <div class="controls-panel">
            <div class="equation-display" id="equation-container-3d">
              <div class="equation-title">Projection Formula in 3D:</div>
              <div id="inner-product-3d" class="equation">proj_v u = (u·v / ||v||²) × v</div>
            </div>
  
            <div class="control-group" id="vector-controls-3d">
              <label id="control-label-3d">Vector Coordinates (3D):</label>
              <div class="vector-inputs">
                <div class="vector-input">
                  <label>u = </label>
                  <input type="number" id="vec-a-x-3d" value="2" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-a-y-3d" value="5" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-a-z-3d" value="-2" step="0.5" min="-10" max="10">
                </div>
                <div class="vector-input">
                  <label>v = </label>
                  <input type="number" id="vec-b-x-3d" value="-1" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-b-y-3d" value="0" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-b-z-3d" value="4" step="0.5" min="-10" max="10">
                </div>
                <div class="vector-input" id="vec-c-input-3d" style="display: none;">
                  <label>w = </label>
                  <input type="number" id="vec-c-x-3d" value="0" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-c-y-3d" value="0" step="0.5" min="-10" max="10">
                  <input type="number" id="vec-c-z-3d" value="1" step="0.5" min="-10" max="10">
                </div>
              </div>
              <button id="projection-reset-btn-3d" class="secondary-btn" style="margin-top: 15px;">Reset</button>
            </div>
            
            <div class="control-group" id="gramschmidt-controls-3d" style="display: none;">
              <button id="generate-vectors-btn-3d" class="primary-btn">Generate Random Vectors</button>
              <button id="step-btn-3d" class="primary-btn">Step Through Process</button>
              <button id="reset-btn-3d" class="secondary-btn">Reset</button>
            </div>
  
            <div class="explanation-container">
              <h3 id="explanation-title-3d">3D Orthogonal Vectors</h3>
              <div id="explanation-content-3d">
                <p>In 3D space, two vectors u, v are <strong>orthogonal</strong> when their inner product equals zero.</p>
                <p>For vectors in ℝ³: u·v = u₁v₁ + u₂v₂ + u₃v₃</p>
                <p>Orthogonal vectors form a 90° angle in space.</p>
                <p>You can manipulate the vectors by changing their coordinates in the input fields.</p>
                <p>Try rotating the 3D view to examine the spatial relationships!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .vector-input input {
        width: 50px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        text-align: center;
      }
      
      .legend-color.vector-c {
        background-color: #27ae60;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // script loading section
    if (!window.THREE) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        
        // Only load OrbitControls after Three.js is loaded
        script.onload = function() {
            const orbitScript = document.createElement('script');
            orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
            
                const transformScript = document.createElement('script');
                transformScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js';
                transformScript.onload = () => {
                    initializeVisualization();
                };
                document.head.appendChild(transformScript);

            document.head.appendChild(orbitScript);
        };   
        document.head.appendChild(script);
    }else{
        // If THREE is already available, just load OrbitControls
        if (!THREE.OrbitControls) {
            const orbitScript = document.createElement('script');
            orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
            
                const transformScript = document.createElement('script');
                transformScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js';
                transformScript.onload = () => {
                    initializeVisualization();
                };
                document.head.appendChild(transformScript);

            document.head.appendChild(orbitScript);
        } else {
            // Both THREE and OrbitControls are already available
            initializeVisualization();
        }
    } 
    
    function initializeVisualization() {
        // Wait for OrbitControls to load
        if (!THREE.OrbitControls) {
        setTimeout(initializeVisualization, 100);
        return;
        }
        
        // Get DOM elements
        const demoTypeSelect = document.getElementById('demo-type-3d');
        const instructionText = document.getElementById('instruction-text-3d');
        const innerProductDisplay = document.getElementById('inner-product-3d');
        const orthogonalStatus = document.getElementById('orthogonal-status-3d');
        const explanationTitle = document.getElementById('explanation-title-3d');
        const explanationContent = document.getElementById('explanation-content-3d');
        const legendContainer = document.getElementById('legend-container-3d');
        const vectorControls = document.getElementById('vector-controls-3d');
        const gramSchmidtControls = document.getElementById('gramschmidt-controls-3d');
        const vecCInput = document.getElementById('vec-c-input-3d');
        
        // Vector input elements
        const vecAXInput = document.getElementById('vec-a-x-3d');
        const vecAYInput = document.getElementById('vec-a-y-3d');
        const vecAZInput = document.getElementById('vec-a-z-3d');
        const vecBXInput = document.getElementById('vec-b-x-3d');
        const vecBYInput = document.getElementById('vec-b-y-3d');
        const vecBZInput = document.getElementById('vec-b-z-3d');
        const vecCXInput = document.getElementById('vec-c-x-3d');
        const vecCYInput = document.getElementById('vec-c-y-3d');
        const vecCZInput = document.getElementById('vec-c-z-3d');
        
        // Buttons
        const projectionResetBtn = document.getElementById('projection-reset-btn-3d');
        const generateVectorsBtn = document.getElementById('generate-vectors-btn-3d');
        const stepBtn = document.getElementById('step-btn-3d');
        const resetBtn = document.getElementById('reset-btn-3d');
        
        // Three.js setup
        const canvasContainer = document.getElementById('three-canvas-container');
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f9fa);

        function createAxis(p1, p2, color) {
            const material = new THREE.LineBasicMaterial({ color: color });
            
            // Create positive direction
            const geometryPositive = new THREE.BufferGeometry();
            geometryPositive.setAttribute('position', new THREE.Float32BufferAttribute([
                0, 0, 0, p2.x, p2.y, p2.z
            ], 3));
            const linePositive = new THREE.Line(geometryPositive, material);
            
            // Create negative direction
            const geometryNegative = new THREE.BufferGeometry();
            geometryNegative.setAttribute('position', new THREE.Float32BufferAttribute([
                0, 0, 0, -p2.x, -p2.y, -p2.z
            ], 3));
            const lineNegative = new THREE.Line(geometryNegative, material);
            
            // Group both lines
            const axisGroup = new THREE.Group();
            axisGroup.add(linePositive);
            axisGroup.add(lineNegative);
            axisGroup.userData.isAxis = true;
            
            return axisGroup;
        }
        
        // Create gridded planes with transparency
        function createGriddedPlane(color, rotationAxis, rotationAngle) {
            const group = new THREE.Group();
            
            // Create the semi-transparent colored plane with increased transparency
            const planeGeometry = new THREE.PlaneGeometry(10, 10);
            const planeMaterial = new THREE.MeshBasicMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.05, 
                side: THREE.DoubleSide
            });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            group.add(plane);
            
            // Create grid lines on the plane with increased transparency
            const gridSize = 10;
            const divisions = 10;
            const spacing = gridSize / divisions;
            const gridMaterial = new THREE.LineBasicMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.2
            });
            
            // Create horizontal grid lines
            for (let i = -gridSize/2; i <= gridSize/2; i += spacing) {
                const lineGeometry = new THREE.BufferGeometry();
                lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                    -gridSize/2, i, 0, 
                    gridSize/2, i, 0
                ], 3));
                const line = new THREE.Line(lineGeometry, gridMaterial);
                group.add(line);
            }
            
            // Create vertical grid lines
            for (let i = -gridSize/2; i <= gridSize/2; i += spacing) {
                const lineGeometry = new THREE.BufferGeometry();
                lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                    i, -gridSize/2, 0, 
                    i, gridSize/2, 0
                ], 3));
                const line = new THREE.Line(lineGeometry, gridMaterial);
                group.add(line);
            }
            
            // Apply rotation if specified
            if (rotationAxis && rotationAngle !== undefined) {
                if (rotationAxis === 'x') {
                    group.rotation.x = rotationAngle;
                } else if (rotationAxis === 'y') {
                    group.rotation.y = rotationAngle;
                } else if (rotationAxis === 'z') {
                    group.rotation.z = rotationAngle;
                }
            }
            
            return group;
        }
       
        // XY plane (horizontal in math notation, XZ in Three.js)
        const xyPlane = createGriddedPlane(0x000000);
        xyPlane.rotation.x = Math.PI/2;  // Rotate around X axis to be horizontal
        scene.add(xyPlane);

        // XZ plane (vertical in math notation, front wall) (XY in Three.js)
        const xzPlane = createGriddedPlane(0x000000);
        scene.add(xzPlane);

        // YZ plane (vertical in math notation, side wall) (ZY in Three.js)
        const yzPlane = createGriddedPlane(0x000000);
        yzPlane.rotation.y = Math.PI/2;  // Rotate around Y axis to create side wall
        scene.add(yzPlane);
                

        // Create X, Y, Z text labels using sprites for simplicity
        function createTextSprite(text, position, color) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;
            
            context.font = 'Bold 32px Arial';
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 32, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({map: texture});
            const sprite = new THREE.Sprite(material);
            
            sprite.position.copy(position);
            sprite.scale.set(1, 1, 1);
            sprite.isAxisLabel = true;
            
            return sprite;
        }

       // Create black axes with proper mathematical orientation
        const axisMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

        // X-axis 
        const xPoints = [];
        xPoints.push(new THREE.Vector3(-5, 0, 0)); 
        xPoints.push(new THREE.Vector3(5, 0, 0));
        const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
        const xAxis = new THREE.Line(xGeometry, axisMaterial);
        scene.add(xAxis);

        // Y-axis
        const yPoints = [];
        yPoints.push(new THREE.Vector3(0, 0, -5));  // Y in math is Z in Three.js
        yPoints.push(new THREE.Vector3(0, 0, 5));
        const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
        const yAxis = new THREE.Line(yGeometry, axisMaterial);
        scene.add(yAxis);

        // Z-axis
        const zPoints = [];
        zPoints.push(new THREE.Vector3(0, -5, 0));  // Z in math is Y in Three.js
        zPoints.push(new THREE.Vector3(0, 5, 0));
        const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
        const zAxis = new THREE.Line(zGeometry, axisMaterial);
        scene.add(zAxis);

        // Add axis labels with correct positions
        const xLabel = createTextSprite('X', new THREE.Vector3(5.5, 0, 0), '#000000');
        scene.add(xLabel);
        const yLabel = createTextSprite('Y', new THREE.Vector3(0, 0, 5.5), '#000000');
        scene.add(yLabel);
        const zLabel = createTextSprite('Z', new THREE.Vector3(0, 5.5, 0), '#000000');
        scene.add(zLabel);

        // Create camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(8, 8, 8);
        camera.lookAt(0, 0, 0);
        
        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        canvasContainer.appendChild(renderer.domElement);
        
        // Responsive canvas
        window.addEventListener('resize', () => {
            const newWidth = canvasContainer.clientWidth;
            const newHeight = canvasContainer.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        });
      
        // Add orbit controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;

        function addRotationControls() {
            // Get reference to the canvas wrapper
            const canvasWrapper = document.getElementById('canvas-wrapper-3d');
            
            // Create container for rotation controls
            const rotationControlsContainer = document.createElement('div');
            rotationControlsContainer.className = 'rotation-controls';
            
            rotationControlsContainer.className = 'rotation-controls';
            rotationControlsContainer.style.position = 'absolute';
            rotationControlsContainer.style.bottom = '20px';
            rotationControlsContainer.style.right = '20px';
            rotationControlsContainer.style.display = 'grid';
            rotationControlsContainer.style.gridTemplateColumns = 'repeat(3, 40px)';
            rotationControlsContainer.style.gridTemplateRows = 'repeat(3, 40px)';
            rotationControlsContainer.style.gap = '5px';
            rotationControlsContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
            rotationControlsContainer.style.borderRadius = '8px';
            rotationControlsContainer.style.padding = '5px';
            rotationControlsContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';

            canvasWrapper.appendChild(rotationControlsContainer);
        
            // Create rotation buttons
            const directions = [
                { icon: '↑', col: 2, row: 1, rotate: function() { rotateCamera(0, -0.2, 0); } }, // Up
                { icon: '↓', col: 2, row: 3, rotate: function() { rotateCamera(0, 0.2, 0); } },  // Down
                { icon: '←', col: 1, row: 2, rotate: function() { rotateCamera(-0.2, 0, 0); } },  // Left
                { icon: '→', col: 3, row: 2, rotate: function() { rotateCamera(0.2, 0, 0); } },   // Right
            ];
            
            directions.forEach(dir => {
                const button = document.createElement('button');
                button.innerText = dir.icon;
                button.style.gridColumn = dir.col;
                button.style.gridRow = dir.row;
                button.style.width = '40px';
                button.style.height = '40px';
                button.style.fontSize = '20px';
                button.style.border = '1px solid #ccc';
                button.style.borderRadius = '4px';
                button.style.backgroundColor = '#f0f0f0';
                button.style.cursor = 'pointer';
                button.addEventListener('click', dir.rotate);
                button.addEventListener('touchstart', dir.rotate);
                rotationControlsContainer.appendChild(button);
            });
            
            // reset view button
            const resetButton = document.createElement('button');
            resetButton.innerText = '⟲';
            resetButton.style.gridColumn = 2;
            resetButton.style.gridRow = 2;
            resetButton.style.width = '40px';
            resetButton.style.height = '40px';
            resetButton.style.fontSize = '20px';
            resetButton.style.border = '1px solid #ccc';
            resetButton.style.borderRadius = '4px';
            resetButton.style.backgroundColor = '#e0e0e0';
            resetButton.style.cursor = 'pointer';
            resetButton.addEventListener('click', resetCameraView);
            resetButton.addEventListener('touchstart', resetCameraView);
            rotationControlsContainer.appendChild(resetButton);
        
            function rotateCamera(x, y, z) {
                // Orbit around target
                const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
                
                // Rotate around vertical axis (y-axis)
                if (x !== 0) {
                    const angleX = x;
                    const cosX = Math.cos(angleX);
                    const sinX = Math.sin(angleX);
                    
                    const newX = offset.x * cosX - offset.z * sinX;
                    const newZ = offset.x * sinX + offset.z * cosX;
                    
                    offset.x = newX;
                    offset.z = newZ;
                }
                
                // Rotate around horizontal axis (x-axis)
                if (y !== 0) {
                    const angleY = y;
                    const cosY = Math.cos(angleY);
                    const sinY = Math.sin(angleY);
                    
                    const newY = offset.y * cosY - offset.z * sinY;
                    const newZ = offset.y * sinY + offset.z * cosY;
                    
                    offset.y = newY;
                    offset.z = newZ;
                }
                
                // Update camera position
                camera.position.copy(controls.target).add(offset);
                camera.lookAt(controls.target);
                
                // Update controls to match
                controls.update();
            }
            
            function resetCameraView() {
                camera.position.set(8, 8, 8);
                camera.lookAt(0, 0, 0);
                controls.target.set(0, 0, 0);
                controls.update();
            }
        }

        addRotationControls();

        controls.enabled = true;
        controls.enableRotate = false; 
      
        // State variables
        let demoType = 'projection3d';
        let vectorA = { x: 2, y: 5, z: -2 };
        let vectorB = { x: -1, y: 0, z: 4 };
        let vectorC = { x: 0, y: 0, z: 1 };
        let gramSchmidtStep = 0;
        let gramSchmidtVectors = [];
        let orthogonalVectors = [];
      
        // Object references for updating
        const objects = {
            vectorA: null,
            vectorB: null,
            vectorC: null,
            projection: null,
            orthogonal: null,
            projectionLine: null,
            orthogonalLine: null,
            gramSchmidtOrigVectors: [],
            gramSchmidtOrthVectors: [],
            projectionLines: [],
            angles: [],
            labels: []
        };
      
        // Utility functions
        function dot(v1, v2) {
            return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        }
        
        function magnitude(v) {
            return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        }
        
        function normalize(v) {
            const mag = magnitude(v);
            if (mag < 0.00001) return { x: 0, y: 0, z: 0 };
            return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
        }
        
        function scalarMultiply(v, scalar) {
            return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
        }
        
        function vectorAdd(v1, v2) {
            return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
        }
      
        function vectorSubtract(v1, v2) {
            return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
        }
      
        function projectVector(v, onto) {
            // Standard projection formula: proj_{onto}(v) = (v·onto / onto·onto) × onto
            const dotProduct = dot(v, onto);
            const ontoSquared = dot(onto, onto);
            
            // Avoid division by zero
            if (Math.abs(ontoSquared) < 0.00001) {
            return { x: 0, y: 0, z: 0 };
            }
            
            return scalarMultiply(onto, dotProduct / ontoSquared);
        }
      
        function createArrow(from, to, color, headLength = 0.2, headWidth = 0.1) {
            // Create Three.js vector directly from our math vectors
            // In our math: X is left/right, Y is front/back, Z is up/down
            // In Three.js: X is left/right, Y is up/down, Z is front/back
            const fromThreeJS = new THREE.Vector3(from.x, from.z, from.y);
            const toThreeJS = new THREE.Vector3(to.x, to.z, to.y);
            
            // Calculate direction using Three.js vectors
            const direction = new THREE.Vector3().subVectors(toThreeJS, fromThreeJS);
            const length = direction.length();
            direction.normalize();
            
            // Arrow body
            const arrowGeometry = new THREE.CylinderGeometry(0.05, 0.05, length - headLength, 8);
            const arrowMaterial = new THREE.MeshBasicMaterial({ color: color });
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            
            // Tag the arrow body with vector info
            arrow.userData.vectorArrow = true;
            arrow.userData.vectorType = color === 0x3498db ? 'u' : (color === 0xe74c3c ? 'v' : null);
            
            // Position and orient
            arrow.position.copy(fromThreeJS);
            arrow.position.add(direction.clone().multiplyScalar(length / 2));
            arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            
            // Arrow head
            const headGeometry = new THREE.ConeGeometry(headWidth, headLength, 8);
            const head = new THREE.Mesh(headGeometry, arrowMaterial);
            
            // Tag the arrow head with vector info
            head.userData.vectorArrow = true;
            head.userData.vectorType = color === 0x3498db ? 'u' : (color === 0xe74c3c ? 'v' : null);
            
            head.position.copy(fromThreeJS);
            head.position.add(direction.clone().multiplyScalar(length - headLength / 2));
            head.quaternion.copy(arrow.quaternion);
            
            // Group
            const arrowGroup = new THREE.Group();
            arrowGroup.add(arrow);
            arrowGroup.add(head);
            
            // Tag the group with vector info
            arrowGroup.userData.vectorArrow = true;
            arrowGroup.userData.vectorType = color === 0x3498db ? 'u' : (color === 0xe74c3c ? 'v' : null);
            
            return arrowGroup;
        }

        function createDashedLine(from, to, color) {
            const points = [];
            // Convert from math coordinates to Three.js coordinates
            points.push(new THREE.Vector3(from.x, from.z, from.y));
            points.push(new THREE.Vector3(to.x, to.z, to.y));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({
                color: color,
                dashSize: 0.1,
                gapSize: 0.05,
            });
            
            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();
            
            return line;
        }
      
        function updateProjectionDemo() {
            // Clear previous objects
            if (objects.vectorA) scene.remove(objects.vectorA);
            if (objects.vectorB) scene.remove(objects.vectorB);
            if (objects.projection) scene.remove(objects.projection);
            if (objects.orthogonal) scene.remove(objects.orthogonal);
            if (objects.projectionLine) scene.remove(objects.projectionLine);
            if (objects.orthogonalLine) scene.remove(objects.orthogonalLine);
            
            objects.labels.forEach(label => scene.remove(label));
            objects.labels = [];
            
            objects.angles.forEach(angle => scene.remove(angle));
            objects.angles = [];
            
            // Create vectors
            const origin = { x: 0, y: 0, z: 0 };
            objects.vectorA = createArrow(origin, vectorA, 0x3498db);
            objects.vectorB = createArrow(origin, vectorB, 0xe74c3c);
            
            scene.add(objects.vectorA);
            scene.add(objects.vectorB);
            
            // Calculate projection
            const dotProduct = dot(vectorA, vectorB);
            const magnitudeB = magnitude(vectorB);
            const magnitudeBSquared = magnitudeB * magnitudeB;
            
            // Avoid division by zero
            const projection = magnitudeBSquared > 0.00001 ? 
                projectVector(vectorA, vectorB) : 
                { x: 0, y: 0, z: 0 };
                
            objects.projection = createArrow(origin, projection, 0x9b59b6);
            scene.add(objects.projection);
            
            // Calculate orthogonal component
            const orthogonal = vectorSubtract(vectorA, projection);
            
            // Draw orthogonal component if significant
            if (magnitude(orthogonal) > 0.01) {
                objects.orthogonal = createArrow(projection, vectorA, 0x2ecc71);
                scene.add(objects.orthogonal);
                
                // Add dashed line from origin to vector A tip
                objects.projectionLine = createDashedLine(origin, projection, 0x666666);
                objects.orthogonalLine = createDashedLine(projection, vectorA, 0x666666);
                
                scene.add(objects.projectionLine);
                scene.add(objects.orthogonalLine);
            }
            
            // Add orthogonality indicator
            createOrthogonalityIndicator();
            
            // Update projection formula display
            const scalarFactor = magnitudeBSquared > 0.00001 ? 
                (dotProduct / magnitudeBSquared).toFixed(2) : "0";
                
            innerProductDisplay.innerHTML = `
                proj<sub>v</sub> u = <span style="color:#3498db">(u·v)</span> / <span style="color:#e74c3c">||v||²</span> × v<br>
                = (${vectorA.x.toFixed(1)}×${vectorB.x.toFixed(1)} + ${vectorA.y.toFixed(1)}×${vectorB.y.toFixed(1)} + ${vectorA.z.toFixed(1)}×${vectorB.z.toFixed(1)}) / ${magnitudeBSquared.toFixed(2)} × (${vectorB.x.toFixed(1)}, ${vectorB.y.toFixed(1)}, ${vectorB.z.toFixed(1)})<br>
                = ${scalarFactor} × (${vectorB.x.toFixed(1)}, ${vectorB.y.toFixed(1)}, ${vectorB.z.toFixed(1)})<br>
                = (${projection.x.toFixed(2)}, ${projection.y.toFixed(2)}, ${projection.z.toFixed(2)})
            `;
        }
        
        function getOrthogonalVectorColor(index) {
            const colors = [
            0x3498db, // Blue for first vector
            0xe74c3c, // Red for second vector
            0x27ae60, // Green for third vector
            0x9b59b6, // Purple for fourth vector
            0xf39c12  // Orange for fifth vector
            ];
            
            return colors[index % colors.length];
        }
      
        function updateGramSchmidtDemo() {
            // Clear previous objects
            objects.gramSchmidtOrigVectors.forEach(v => scene.remove(v));
            objects.gramSchmidtOrthVectors.forEach(v => scene.remove(v));
            objects.projectionLines.forEach(l => scene.remove(l));
            objects.angles.forEach(a => scene.remove(a));
            objects.labels.forEach(label => scene.remove(label));
            
            objects.gramSchmidtOrigVectors = [];
            objects.gramSchmidtOrthVectors = [];
            objects.projectionLines = [];
            objects.angles = [];
            objects.labels = [];
        
            const origin = { x: 0, y: 0, z: 0 };
        
            // Draw original vectors (faded)
            gramSchmidtVectors.forEach((v, i) => {
                const arrow = createArrow(origin, v, 0x999999);
                arrow.material = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.5 });
                scene.add(arrow);
                objects.gramSchmidtOrigVectors.push(arrow);
            });
        
            // Draw orthogonalized vectors
            orthogonalVectors.forEach((v, i) => {
                if (magnitude(v) > 0.01) {
                    const arrow = createArrow(origin, v, getOrthogonalVectorColor(i));
                    scene.add(arrow);
                    objects.gramSchmidtOrthVectors.push(arrow);
                }
            });
            
            // Add orthogonality indicators if we have at least 2 orthogonal vectors
            if (orthogonalVectors.length >= 2) {
            createOrthogonalityIndicator();
            }
        
            // Display step counter
            let statusText = '';
            if (orthogonalVectors.length === 0) {
            statusText = 'Click "Step Through Process" to start';
            } else if (orthogonalVectors.length < gramSchmidtVectors.length) {
            statusText = `Step ${orthogonalVectors.length} of ${gramSchmidtVectors.length}`;
            } else {
            statusText = 'Process complete! All vectors are orthogonal';
            }
            
            // Update inner product display for the orthogonal vectors
            if (orthogonalVectors.length >= 2) {
            // Calculate all dot products between orthogonal vectors
            let allOrthogonal = true;
            let dotProductText = '';
            
            for (let i = 0; i < orthogonalVectors.length; i++) {
                for (let j = i + 1; j < orthogonalVectors.length; j++) {
                    const dotProd = dot(orthogonalVectors[i], orthogonalVectors[j]);
                    dotProductText += `v₍${i+1}₎·v₍${j+1}₎ = ${dotProd.toFixed(2)}, `;
                    if (Math.abs(dotProd) > 0.1) allOrthogonal = false;
                }
            }
          
            innerProductDisplay.textContent = dotProductText.slice(0, -2); 
          
            if (allOrthogonal) {
                orthogonalStatus.textContent = 'All vectors are orthogonal to each other';
                orthogonalStatus.className = 'status orthogonal';
            } else {
                orthogonalStatus.textContent = 'Continue the process for full orthogonalization';
                orthogonalStatus.className = 'status not-orthogonal';
            }
            } else {
                innerProductDisplay.textContent = statusText;
                orthogonalStatus.textContent = 'Gram-Schmidt creates orthogonal vectors';
                orthogonalStatus.className = 'status orthogonal';
            }
        
            // Show current step visualization
            if (gramSchmidtStep > 0 && orthogonalVectors.length < gramSchmidtVectors.length) {
                const currentIdx = orthogonalVectors.length;
                const currentVector = gramSchmidtVectors[currentIdx];
                
                // Draw the current vector being processed (highlighted)
                const currentArrow = createArrow(origin, currentVector, 0xf39c12);
                scene.add(currentArrow);
                objects.gramSchmidtOrigVectors.push(currentArrow);
                
                // Draw projections onto previous orthogonal vectors
                let sumProjection = { x: 0, y: 0, z: 0 };
                
                orthogonalVectors.forEach((v, i) => {
                    if (magnitude(v) > 0.01) {
                        const proj = projectVector(currentVector, v);
                        sumProjection = vectorAdd(sumProjection, proj);
                        
                        // Draw projection
                        const projArrow = createArrow(origin, proj, getOrthogonalVectorColor(i), 0.15, 0.08);
                        projArrow.material = new THREE.MeshBasicMaterial({ 
                            color: getOrthogonalVectorColor(i),
                            transparent: true,
                            opacity: 0.7 - i * 0.2
                        });
                        scene.add(projArrow);
                        objects.projectionLines.push(projArrow);
                        
                        // Draw dashed line
                        const dashLine = createDashedLine(proj, currentVector, 0x666666);
                        scene.add(dashLine);
                        objects.projectionLines.push(dashLine);
                    }
                });
          
                // Draw the resulting orthogonal vector
                const difference = vectorSubtract(currentVector, sumProjection);
                if (magnitude(difference) > 0.01) {
                    const orthArrow = createArrow(origin, difference, getOrthogonalVectorColor(currentIdx));
                    scene.add(orthArrow);
                    objects.projectionLines.push(orthArrow);
                }
            }
        }//updateGramSchmidtDemo ends
      
        // Add labels for axes
        function createAxisLabels() {
            // Remove existing labels if any
            scene.children.forEach(child => {
            if (child.isAxisLabel) scene.remove(child);
            });
            
            // Create X, Y, Z text labels using sprites for simplicity
            function createTextSprite(text, position, color) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 64;
                canvas.height = 64;
                
                context.font = 'Bold 32px Arial';
                context.fillStyle = color;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(text, 32, 32);
                
                const texture = new THREE.CanvasTexture(canvas);
                const material = new THREE.SpriteMaterial({map: texture});
                const sprite = new THREE.Sprite(material);
                
                sprite.position.copy(position);
                sprite.scale.set(1, 1, 1);
                sprite.isAxisLabel = true;
                
                return sprite;
            }
            // X axis label
            const xLabel = createTextSprite('X', new THREE.Vector3(5.5, 0, 0), '#000000');
            scene.add(xLabel);
            // Y axis label
            const yLabel = createTextSprite('Y', new THREE.Vector3(0, 0, 5.5), '#000000'); 
            scene.add(yLabel);
            // Z axis label
            const zLabel = createTextSprite('Z', new THREE.Vector3(0, 5.5, 0), '#000000');
            scene.add(zLabel);

        }//createAxisLabels end

        // Create a visual indicator for orthogonal angles
        function createOrthogonalityIndicator() {
            // Clear any existing indicators
            objects.angles.forEach(angle => scene.remove(angle));
            objects.angles = [];
            
            if (demoType === 'projection3d') {
            // Create a right angle indicator between the projection and orthogonal component
                const projection = projectVector(vectorA, vectorB);
                const orthogonal = vectorSubtract(vectorA, projection);
                
                // Only add if both vectors have significant magnitude
                if (magnitude(projection) > 0.1 && magnitude(orthogonal) > 0.1) {
                    const rightAngle = createRightAngleMarker(projection, orthogonal, 0.3);
                    scene.add(rightAngle);
                    objects.angles.push(rightAngle);
                }
            } else if (demoType === 'gramschmidt3d' && orthogonalVectors.length >= 2) {
                // Add right angle markers between orthogonal vectors
                for (let i = 0; i < orthogonalVectors.length; i++) {
                    for (let j = i+1; j < orthogonalVectors.length; j++) {
                        if (magnitude(orthogonalVectors[i]) > 0.1 && magnitude(orthogonalVectors[j]) > 0.1) {
                            const rightAngle = createRightAngleMarker(
                            orthogonalVectors[i], 
                            orthogonalVectors[j], 
                            0.3
                            );
                            scene.add(rightAngle);
                            objects.angles.push(rightAngle);
                        }
                    }
                }
            }
        }//createOrthogonalityIndicator end
        
        function createRightAngleMarker(v1, v2, size) {
            const group = new THREE.Group();
            
            // Normalize the vectors
            const v1norm = normalize(v1);
            const v2norm = normalize(v2);
            
            // Create the right angle marker lines
            const material = new THREE.LineBasicMaterial({ color: 0x2ecc71, linewidth: 2 });
            
            // Convert coordinates to Three.js system
            const p1 = new THREE.Vector3(
                v1norm.x * size,
                v1norm.z * size,  // Z in math is Y in Three.js
                v1norm.y * size   // Y in math is Z in Three.js
            );
            
            // Second point (corner of the right angle)
            const p2 = new THREE.Vector3(
                v1norm.x * size + v2norm.x * size,
                v1norm.z * size + v2norm.z * size,
                v1norm.y * size + v2norm.y * size
            );
            
            // Third point along the second unit vector
            const p3 = new THREE.Vector3(
                v2norm.x * size,
                v2norm.z * size,
                v2norm.y * size
            );
            
            // Create the geometry and line
            const rightAngleGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2, p3]);
            const rightAngleLine = new THREE.Line(rightAngleGeometry, material);
            
            group.add(rightAngleLine);
            return group;
        } //createRightAngleMarker
        
        function updateDemo() {
            if (demoType === 'projection3d') {
            updateProjectionDemo();
            } else {
            updateGramSchmidtDemo();
            }
        }
        
        function updateDemoType() {
            demoType = demoTypeSelect.value;
            
            // Clear all existing objects from the scene first
            if (objects.vectorA) scene.remove(objects.vectorA);
            if (objects.vectorB) scene.remove(objects.vectorB);
            if (objects.vectorC) scene.remove(objects.vectorC);
            if (objects.projection) scene.remove(objects.projection);
            if (objects.orthogonal) scene.remove(objects.orthogonal);
            if (objects.projectionLine) scene.remove(objects.projectionLine);
            if (objects.orthogonalLine) scene.remove(objects.orthogonalLine);
            
            objects.gramSchmidtOrigVectors.forEach(v => scene.remove(v));
            objects.gramSchmidtOrthVectors.forEach(v => scene.remove(v));
            objects.projectionLines.forEach(l => scene.remove(l));
            objects.angles.forEach(a => scene.remove(a));
            objects.labels.forEach(label => scene.remove(label));
            
            objects.gramSchmidtOrigVectors = [];
            objects.gramSchmidtOrthVectors = [];
            objects.projectionLines = [];
            objects.angles = [];
            objects.labels = [];

            // Update UI based on demo type
            // In the updateDemoType function where it sets instructionText:
            if (demoType === 'projection3d') {
                explanationTitle.textContent = '3D Orthogonal Projection';
                explanationContent.innerHTML = `
                    <p>The <strong>orthogonal projection</strong> of vector u onto vector v in 3D space is:</p>
                    <p>proj<sub>v</sub> u = (u·v / ||v||²) × v</p>
                    <p>This decomposes u into two perpendicular components in 3D.</p>
                    <p>The orthogonal decomposition: u = proj<sub>v</sub> u + z</p>
                    <p>where z is <strong>orthogonal</strong> to v (z·v = 0)</p>
                `;
                
                instructionText.textContent = 'Touch and drag vectors to change them. Use arrow buttons to rotate view.';
                
                legendContainer.innerHTML = `
                    <div class="legend-item"><span class="legend-color vector-a"></span> Vector u</div>
                    <div class="legend-item"><span class="legend-color vector-b"></span> Vector v</div>
                    <div class="legend-item"><span class="legend-color projection"></span> Projection of u onto v</div>
                    <div class="legend-item"><span class="legend-color orthogonal"></span> Residual z (orthogonal)</div>
                `;
                
                vectorControls.style.display = 'block';
                gramSchmidtControls.style.display = 'none';
                vecCInput.style.display = 'none';
                
                updateProjectionDemo();
            } else if (demoType === 'gramschmidt3d') {
                explanationTitle.textContent = '3D Gram-Schmidt Process';
                explanationContent.innerHTML = `
                <p>The <strong>Gram-Schmidt process</strong> transforms a set of vectors into an orthogonal set in 3D space.</p>
                <p>Starting with vectors {x₁, x₂, x₃}:</p>
                <p>1. v₁ = x₁</p>
                <p>2. v₂ = x₂ - proj<sub>v₁</sub>x₂</p>
                <p>3. v₃ = x₃ - proj<sub>v₁</sub>x₃ - proj<sub>v₂</sub>x₃</p>
                <p>Unlike in 2D, three orthogonal vectors can fully exist in 3D space.</p>
                <p>This relationship is essential in many 3D applications, including computer graphics and robotics.</p>
                `;
                
                instructionText.textContent = 'Step through the process to see 3D orthogonalization';
                
                legendContainer.innerHTML = `
                    <div class="legend-item"><span class="legend-color" style="background-color: #999;"></span> Original vectors</div>
                    <div class="legend-item"><span class="legend-color" style="background-color: #f39c12;"></span> Current vector</div>
                    <div class="legend-item"><span class="legend-color vector-a"></span> First orthogonal vector</div>
                    <div class="legend-item"><span class="legend-color vector-b"></span> Second orthogonal vector</div>
                    <div class="legend-item"><span class="legend-color vector-c"></span> Third orthogonal vector</div>
                `;
            
                vectorControls.style.display = 'none';
                gramSchmidtControls.style.display = 'block';
                vecCInput.style.display = 'block';
                
                // Initialize Gram-Schmidt demo if needed
                if (gramSchmidtVectors.length === 0) {
                    generateRandomVectors(3);
                }
                updateGramSchmidtDemo();
            }

        }//updateDemoType end
        
        // Event handlers
        function handleVectorInputChange() {
            vectorA = {
            x: parseFloat(vecAXInput.value) || 0,
            y: parseFloat(vecAYInput.value) || 0,
            z: parseFloat(vecAZInput.value) || 0
            };
            
            vectorB = {
            x: parseFloat(vecBXInput.value) || 0,
            y: parseFloat(vecBYInput.value) || 0,
            z: parseFloat(vecBZInput.value) || 0
            };
            
            vectorC = {
            x: parseFloat(vecCXInput.value) || 0,
            y: parseFloat(vecCYInput.value) || 0,
            z: parseFloat(vecCZInput.value) || 0
            };
            
            updateDemo();
        }
        
        function resetDemo() {
            // Reset the scene
            if (demoType === 'projection3d') {
            vectorA = { x: 2, y: 5, z: -2 };
            vectorB = { x: -1, y: 0, z: 4 };
            vectorC = { x: 0, y: 0, z: 1 };
            
            vecAXInput.value = vectorA.x;
            vecAYInput.value = vectorA.y;
            vecAZInput.value = vectorA.z;
            vecBXInput.value = vectorB.x;
            vecBYInput.value = vectorB.y;
            vecBZInput.value = vectorB.z;
            vecCXInput.value = vectorC.x;
            vecCYInput.value = vectorC.y;
            vecCZInput.value = vectorC.z;
            
            updateProjectionDemo();
            } else {
            orthogonalVectors = [];
            gramSchmidtStep = 0;
            updateGramSchmidtDemo();
            }
        }
        
        // Handle window resize
        function onWindowResize() {
            const width = canvasContainer.clientWidth;
            const height = canvasContainer.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            
            renderer.setSize(width, height);
        }
        
        window.addEventListener('resize', onWindowResize);
        
        // Initialize the axis labels
        createAxisLabels();
        
        // Set up the animation loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update(); // Only required if controls.enableDamping = true
            renderer.render(scene, camera);
        }
        
        // Initialize event listeners
        demoTypeSelect.addEventListener('change', updateDemoType);
        
        vecAXInput.addEventListener('input', handleVectorInputChange);
        vecAYInput.addEventListener('input', handleVectorInputChange);
        vecAZInput.addEventListener('input', handleVectorInputChange);
        vecBXInput.addEventListener('input', handleVectorInputChange);
        vecBYInput.addEventListener('input', handleVectorInputChange);
        vecBZInput.addEventListener('input', handleVectorInputChange);
        vecCXInput.addEventListener('input', handleVectorInputChange);
        vecCYInput.addEventListener('input', handleVectorInputChange);
        vecCZInput.addEventListener('input', handleVectorInputChange);
        
        projectionResetBtn.addEventListener('click', resetDemo);
        generateVectorsBtn.addEventListener('click', () => generateRandomVectors(3));
        stepBtn.addEventListener('click', gramSchmidtProcess);
        resetBtn.addEventListener('click', resetDemo);
        
       // Start the visualization
        updateDemoType();
        animate();
        updateDemoType();      
        
        // Track dragging state
        let isDragging = false;
        let selectedVector = null;
        let dragPlane = new THREE.Plane();
        let dragOffset = new THREE.Vector3();
        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();

        // Update this function
function onMouseDown(event) {
    // Prevent default behavior
    event.preventDefault();
    
    // Only process drag in projection3d mode
    if (demoType !== 'projection3d') return;
    
    // Get normalized mouse position
    updateMousePosition(event);
    
    // Raycast to find vectors
    raycaster.setFromCamera(mouse, camera);
    
    // Check intersections with all objects in the scene
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    let vectorType = null;
    
    // Find vector arrows in the intersected objects
    for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        
        // Check the object and parent objects for vector data
        if (obj.userData && obj.userData.vectorArrow) {
            vectorType = obj.userData.vectorType;
            break;
        }
        
        if (obj.parent && obj.parent.userData && obj.parent.userData.vectorArrow) {
            vectorType = obj.parent.userData.vectorType;
            break;
        }
        
        if (obj.parent && obj.parent.parent && obj.parent.parent.userData && obj.parent.parent.userData.vectorArrow) {
            vectorType = obj.parent.parent.userData.vectorType;
            break;
        }
    }
    
    if (vectorType) {
        console.log("Selected vector:", vectorType); // Debug output
        isDragging = true;
        selectedVector = vectorType;
        
        // Create a drag plane aligned with the camera view
        const cameraPosition = camera.position.clone();
        const center = new THREE.Vector3(0, 0, 0);
        const normal = new THREE.Vector3().subVectors(cameraPosition, center).normalize();
        dragPlane.setFromNormalAndCoplanarPoint(normal, center);
        
        // Set drag offset
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersection);
        
        const vectorData = selectedVector === 'u' ? vectorA : vectorB;
        // Convert math coords to Three.js coords
        const vectorThreeJS = new THREE.Vector3(
            vectorData.x,
            vectorData.z,  // Z in math is Y in Three.js
            vectorData.y   // Y in math is Z in Three.js
        );
        
        dragOffset.subVectors(intersection, vectorThreeJS);
        
        // Prevent event from triggering orbit controls
        event.stopPropagation();
    }
}

        function onMouseMove(event) {
            if (!isDragging || !selectedVector) return;
            
            // Prevent default behavior
            event.preventDefault();
            
            // Update mouse position
            updateMousePosition(event);
            
            // Raycast to the drag plane
            raycaster.setFromCamera(mouse, camera);
            const intersection = new THREE.Vector3();
            
            if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                // Calculate new position by subtracting the drag offset
                const newPosition = intersection.clone().sub(dragOffset);
                
                // We need to convert from Three.js coords to our math coords
                // In Three.js: X = X, Y = Z, Z = Y
                const mathPosition = {
                    x: Math.round(newPosition.x * 2) / 2,
                    y: Math.round(newPosition.z * 2) / 2, // Z in Three.js is Y in math
                    z: Math.round(newPosition.y * 2) / 2  // Y in Three.js is Z in math
                };
                
                // Update vector coordinates
                if (selectedVector === 'u') {
                    vectorA = mathPosition;
                    
                    // Update input fields
                    vecAXInput.value = vectorA.x;
                    vecAYInput.value = vectorA.y;
                    vecAZInput.value = vectorA.z;
                } else if (selectedVector === 'v') {
                    vectorB = mathPosition;
                    
                    // Update input fields
                    vecBXInput.value = vectorB.x;
                    vecBYInput.value = vectorB.y;
                    vecBZInput.value = vectorB.z;
                }
                
                // Update visualization
                updateProjectionDemo();
            }
            
            // Prevent orbit controls from activating
            event.stopPropagation();
        }

        function onMouseUp(event) {
            // Check if we were dragging
            if (isDragging) {
                isDragging = false;
                selectedVector = null;
                
                // Re-enable orbit controls
                controls.enabled = true;
                
                // Prevent event propagation
                event.stopPropagation();
                event.preventDefault();
            }
        }

        function updateMousePosition(event) {
            
            const canvasRect = renderer.domElement.getBoundingClientRect();
            
            // Support both mouse and touch events
            let clientX, clientY;
            
            // For touch events
            if (event.touches && event.touches.length) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } 
            // For mouse events
            else {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            
            mouse.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
            mouse.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
        }

        // Mouse events with separate event handlers
        renderer.domElement.addEventListener('mousedown', onMouseDown, false);
        renderer.domElement.addEventListener('mousemove', onMouseMove, false);
        document.addEventListener('mouseup', onMouseUp, false);

        // Touch events
        renderer.domElement.addEventListener('touchstart', onMouseDown, false);
        renderer.domElement.addEventListener('touchmove', onMouseMove, false);
        document.addEventListener('touchend', onMouseUp, false);


        function generateRandomVectors(count) {
            // Clear previous vectors
            gramSchmidtVectors = [];
            orthogonalVectors = [];
            gramSchmidtStep = 0;
            
            // Generate random vectors
            for (let i = 0; i < count; i++) {
              gramSchmidtVectors.push({
                x: Math.random() * 8 - 4, // Range: -4 to 4
                y: Math.random() * 8 - 4,
                z: Math.random() * 8 - 4
              });
            }   
            updateGramSchmidtDemo();
        }
          
        function gramSchmidtProcess() {
            // Perform one step of the Gram-Schmidt process
            if (orthogonalVectors.length >= gramSchmidtVectors.length) {
              // Process is complete
              return;
            }
            
            // Increment step counter
            gramSchmidtStep++;
            
            const currentVector = gramSchmidtVectors[orthogonalVectors.length];
            
            if (orthogonalVectors.length === 0) {
                // First vector is just normalized
                orthogonalVectors.push({
                    x: currentVector.x,
                    y: currentVector.y,
                    z: currentVector.z
                });
            } else {
              // Calculate projections onto all previous orthogonal vectors
              let result = { x: currentVector.x, y: currentVector.y, z: currentVector.z };
              
              orthogonalVectors.forEach(v => {
                // Calculate projection
                const projection = projectVector(currentVector, v);
                
                // Subtract from the result
                result = vectorSubtract(result, projection);
              });
              
              // Add the new orthogonal vector
              if (magnitude(result) > 0.01) {
                orthogonalVectors.push(result);
              } else {
                // Handle linear dependency case - generate a random perpendicular vector
                // This is a simplified approach for the visualization
                const perpVector = {
                  x: Math.random() * 4 - 2,
                  y: Math.random() * 4 - 2,
                  z: Math.random() * 4 - 2
                };
                
                // Make it orthogonal to all existing vectors
                let orthoVector = perpVector;
                orthogonalVectors.forEach(v => {
                  const proj = projectVector(orthoVector, v);
                  orthoVector = vectorSubtract(orthoVector, proj);
                });
                
                if (magnitude(orthoVector) > 0.01) {
                  orthogonalVectors.push(orthoVector);
                }
              }
            }   
            updateGramSchmidtDemo();
        }
    }// Close initializeVisualization function
}); 
