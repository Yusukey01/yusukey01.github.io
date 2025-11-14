// 2D Fourier Transform Visualizer for Image Processing
// Mathematical implementation and interactive visualization

class FourierTransformVisualizer {
    constructor(container) {
        this.container = container;
        this.imageData = null;
        this.originalImageData = null;
        this.fftData = null;
        this.magnitudeSpectrum = null;
        this.phaseSpectrum = null;
        this.filterMask = null;
        this.isProcessing = false;
        
        // Visualization settings
        this.settings = {
            filterType: 'none',
            filterRadius: 30,
            highPassRadius: 10,
            bandPassInner: 10,
            bandPassOuter: 50,
            logScale: true,
            showPhase: false,
            compressionLevel: 100,
            customMaskEnabled: false
        };
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupEventListeners();
        this.loadDefaultImage();
    }
    
    createUI() {
        this.container.innerHTML = `
            <div class="fft-visualizer">
                <div class="controls-panel">
                    <div class="control-section">
                        <h3>Image Input</h3>
                        <div class="input-controls">
                            <input type="file" id="imageUpload" accept="image/*" style="display: none;">
                            <button class="btn-primary" onclick="document.getElementById('imageUpload').click()">
                                Upload Image
                            </button>
                            <div class="preset-images">
                                <button class="btn-preset" data-preset="pattern">Test Pattern</button>
                                <button class="btn-preset" data-preset="text">Text</button>
                                <button class="btn-preset" data-preset="photo">Photo</button>
                                <button class="btn-preset" data-preset="noise">Periodic Noise</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h3>Frequency Domain Filters</h3>
                        <div class="filter-controls">
                            <label>
                                <input type="radio" name="filter" value="none" checked>
                                No Filter
                            </label>
                            <label>
                                <input type="radio" name="filter" value="lowpass">
                                Low-pass (Blur)
                            </label>
                            <label>
                                <input type="radio" name="filter" value="highpass">
                                High-pass (Edges)
                            </label>
                            <label>
                                <input type="radio" name="filter" value="bandpass">
                                Band-pass
                            </label>
                            <label>
                                <input type="radio" name="filter" value="notch">
                                Notch (Remove Pattern)
                            </label>
                            <label>
                                <input type="radio" name="filter" value="custom">
                                Custom Mask
                            </label>
                        </div>
                        
                        <div id="filterParams" class="filter-params">
                            <div class="param-group" id="lowpassParams" style="display: none;">
                                <label>Cutoff Frequency: <span id="lowpassValue">30</span></label>
                                <input type="range" id="lowpassRadius" min="5" max="100" value="30">
                            </div>
                            
                            <div class="param-group" id="highpassParams" style="display: none;">
                                <label>Cutoff Frequency: <span id="highpassValue">10</span></label>
                                <input type="range" id="highpassRadius" min="1" max="50" value="10">
                            </div>
                            
                            <div class="param-group" id="bandpassParams" style="display: none;">
                                <label>Inner Radius: <span id="bandpassInnerValue">10</span></label>
                                <input type="range" id="bandpassInner" min="1" max="50" value="10">
                                <label>Outer Radius: <span id="bandpassOuterValue">50</span></label>
                                <input type="range" id="bandpassOuter" min="10" max="100" value="50">
                            </div>
                            
                            <div class="param-group" id="customParams" style="display: none;">
                                <p>Click and drag on the frequency spectrum to mask regions</p>
                                <button class="btn-secondary" id="clearMask">Clear Mask</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h3>Applications</h3>
                        <div class="application-controls">
                            <div class="compression-control">
                                <label>Compression: <span id="compressionValue">100%</span></label>
                                <input type="range" id="compression" min="1" max="100" value="100">
                                <div class="compression-info">
                                    Keeping top <span id="coeffCount">100%</span> of coefficients
                                </div>
                            </div>
                            
                            <button class="btn-secondary" id="denoise">Remove Periodic Noise</button>
                            <button class="btn-secondary" id="sharpen">Sharpen Image</button>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h3>Visualization Options</h3>
                        <label>
                            <input type="checkbox" id="logScale" checked>
                            Logarithmic Scale (Magnitude)
                        </label>
                        <label>
                            <input type="checkbox" id="showPhase">
                            Show Phase Spectrum
                        </label>
                        <label>
                            <input type="checkbox" id="showFilter">
                            Show Filter Response
                        </label>
                    </div>
                </div>
                
                <div class="visualization-area">
                    <div class="image-row">
                        <div class="image-panel">
                            <h4>Original Image</h4>
                            <canvas id="originalCanvas" width="256" height="256"></canvas>
                        </div>
                        
                        <div class="image-panel">
                            <h4>Processed Image</h4>
                            <canvas id="processedCanvas" width="256" height="256"></canvas>
                        </div>
                    </div>
                    
                    <div class="spectrum-row">
                        <div class="spectrum-panel">
                            <h4>Magnitude Spectrum</h4>
                            <canvas id="magnitudeCanvas" width="256" height="256"></canvas>
                            <div class="spectrum-info">
                                <small>Center = DC component (zero frequency)</small>
                            </div>
                        </div>
                        
                        <div class="spectrum-panel" id="phasePanel" style="display: none;">
                            <h4>Phase Spectrum</h4>
                            <canvas id="phaseCanvas" width="256" height="256"></canvas>
                        </div>
                        
                        <div class="spectrum-panel" id="filterPanel" style="display: none;">
                            <h4>Filter Response</h4>
                            <canvas id="filterCanvas" width="256" height="256"></canvas>
                        </div>
                    </div>
                    
                    <div class="info-panel">
                        <div class="processing-indicator" id="processingIndicator" style="display: none;">
                            Processing...
                        </div>
                        <div class="stats">
                            <span>Image Size: <strong id="imageSize">-</strong></span>
                            <span>Processing Time: <strong id="processingTime">-</strong> ms</span>
                            <span>Compression Ratio: <strong id="compressionRatio">1:1</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupCanvases();
    }
    
    setupCanvases() {
        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
        this.magnitudeCanvas = document.getElementById('magnitudeCanvas');
        this.phaseCanvas = document.getElementById('phaseCanvas');
        this.filterCanvas = document.getElementById('filterCanvas');
        
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.processedCtx = this.processedCanvas.getContext('2d');
        this.magnitudeCtx = this.magnitudeCanvas.getContext('2d');
        this.phaseCtx = this.phaseCanvas.getContext('2d');
        this.filterCtx = this.filterCanvas.getContext('2d');
        
        // Setup custom mask drawing
        this.setupMaskDrawing();
    }
    
    setupMaskDrawing() {
        let isDrawing = false;
        let brushSize = 10;
        
        this.magnitudeCanvas.addEventListener('mousedown', (e) => {
            if (this.settings.filterType === 'custom') {
                isDrawing = true;
                this.drawMaskPoint(e);
            }
        });
        
        this.magnitudeCanvas.addEventListener('mousemove', (e) => {
            if (isDrawing && this.settings.filterType === 'custom') {
                this.drawMaskPoint(e);
            }
        });
        
        this.magnitudeCanvas.addEventListener('mouseup', () => {
            isDrawing = false;
            if (this.settings.filterType === 'custom') {
                this.applyFilter();
            }
        });
        
        this.magnitudeCanvas.addEventListener('mouseleave', () => {
            isDrawing = false;
        });
    }
    
    drawMaskPoint(e) {
        const rect = this.magnitudeCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (!this.filterMask) {
            this.filterMask = new Array(256 * 256).fill(1);
        }
        
        // Draw circular mask point
        const centerX = Math.floor(x);
        const centerY = Math.floor(y);
        const radius = 10;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const px = centerX + dx;
                    const py = centerY + dy;
                    if (px >= 0 && px < 256 && py >= 0 && py < 256) {
                        this.filterMask[py * 256 + px] = 0;
                    }
                }
            }
        }
        
        this.visualizeMagnitudeSpectrum();
    }
    
    setupEventListeners() {
        // Image upload
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });
        
        // Preset images
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadPresetImage(e.target.dataset.preset);
            });
        });
        
        // Filter selection
        document.querySelectorAll('input[name="filter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.filterType = e.target.value;
                this.updateFilterUI();
                this.applyFilter();
            });
        });
        
        // Filter parameters
        document.getElementById('lowpassRadius').addEventListener('input', (e) => {
            this.settings.filterRadius = parseInt(e.target.value);
            document.getElementById('lowpassValue').textContent = e.target.value;
            this.applyFilter();
        });
        
        document.getElementById('highpassRadius').addEventListener('input', (e) => {
            this.settings.highPassRadius = parseInt(e.target.value);
            document.getElementById('highpassValue').textContent = e.target.value;
            this.applyFilter();
        });
        
        document.getElementById('bandpassInner').addEventListener('input', (e) => {
            this.settings.bandPassInner = parseInt(e.target.value);
            document.getElementById('bandpassInnerValue').textContent = e.target.value;
            this.applyFilter();
        });
        
        document.getElementById('bandpassOuter').addEventListener('input', (e) => {
            this.settings.bandPassOuter = parseInt(e.target.value);
            document.getElementById('bandpassOuterValue').textContent = e.target.value;
            this.applyFilter();
        });
        
        // Compression
        document.getElementById('compression').addEventListener('input', (e) => {
            this.settings.compressionLevel = parseInt(e.target.value);
            document.getElementById('compressionValue').textContent = e.target.value + '%';
            document.getElementById('coeffCount').textContent = e.target.value + '%';
            this.applyCompression();
        });
        
        // Visualization options
        document.getElementById('logScale').addEventListener('change', (e) => {
            this.settings.logScale = e.target.checked;
            this.visualizeMagnitudeSpectrum();
        });
        
        document.getElementById('showPhase').addEventListener('change', (e) => {
            this.settings.showPhase = e.target.checked;
            document.getElementById('phasePanel').style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                this.visualizePhaseSpectrum();
            }
        });
        
        document.getElementById('showFilter').addEventListener('change', (e) => {
            document.getElementById('filterPanel').style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                this.visualizeFilter();
            }
        });
        
        // Application buttons
        document.getElementById('denoise').addEventListener('click', () => {
            this.applyDenoising();
        });
        
        document.getElementById('sharpen').addEventListener('click', () => {
            this.applySharpen();
        });
        
        document.getElementById('clearMask').addEventListener('click', () => {
            this.filterMask = null;
            this.applyFilter();
        });
    }
    
    updateFilterUI() {
        // Hide all parameter groups
        document.querySelectorAll('.param-group').forEach(group => {
            group.style.display = 'none';
        });
        
        // Show relevant parameter group
        const paramMap = {
            'lowpass': 'lowpassParams',
            'highpass': 'highpassParams',
            'bandpass': 'bandpassParams',
            'custom': 'customParams'
        };
        
        if (paramMap[this.settings.filterType]) {
            document.getElementById(paramMap[this.settings.filterType]).style.display = 'block';
        }
    }
    
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    this.loadImage(img);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    loadImage(img) {
        // Resize to 256x256 for processing
        this.originalCanvas.width = 256;
        this.originalCanvas.height = 256;
        this.originalCtx.drawImage(img, 0, 0, 256, 256);
        
        this.originalImageData = this.originalCtx.getImageData(0, 0, 256, 256);
        this.imageData = this.originalCtx.getImageData(0, 0, 256, 256);
        
        document.getElementById('imageSize').textContent = '256×256';
        
        this.processImage();
    }
    
    loadDefaultImage() {
        // Create a test pattern
        const canvas = this.originalCanvas;
        const ctx = this.originalCtx;
        const width = 256;
        const height = 256;
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#4444ff');
        gradient.addColorStop(1, '#ff4444');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add some geometric patterns
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw circles
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(width/2, height/2, 20 + i * 20, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
        
        this.originalImageData = ctx.getImageData(0, 0, width, height);
        this.imageData = ctx.getImageData(0, 0, width, height);
        
        document.getElementById('imageSize').textContent = '256×256';
        
        this.processImage();
    }
    
    loadPresetImage(preset) {
        const canvas = this.originalCanvas;
        const ctx = this.originalCtx;
        const width = 256;
        const height = 256;
        
        ctx.clearRect(0, 0, width, height);
        
        switch(preset) {
            case 'pattern':
                // Checkerboard pattern
                const squareSize = 16;
                for (let y = 0; y < height; y += squareSize) {
                    for (let x = 0; x < width; x += squareSize) {
                        if ((x / squareSize + y / squareSize) % 2 === 0) {
                            ctx.fillStyle = '#000000';
                        } else {
                            ctx.fillStyle = '#ffffff';
                        }
                        ctx.fillRect(x, y, squareSize, squareSize);
                    }
                }
                break;
                
            case 'text':
                // Text image
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('FOURIER', width/2, height/2 - 30);
                ctx.fillText('TRANSFORM', width/2, height/2 + 30);
                break;
                
            case 'photo':
                // Simulated photo with gradients
                const radialGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
                radialGradient.addColorStop(0, '#ffeeaa');
                radialGradient.addColorStop(0.5, '#ff8844');
                radialGradient.addColorStop(1, '#442211');
                ctx.fillStyle = radialGradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add some "detail"
                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * width;
                    const y = Math.random() * height;
                    const size = Math.random() * 20 + 5;
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, 2 * Math.PI);
                    ctx.fill();
                }
                break;
                
            case 'noise':
                // Image with periodic noise
                // Base image
                const baseGradient = ctx.createLinearGradient(0, 0, width, height);
                baseGradient.addColorStop(0, '#667788');
                baseGradient.addColorStop(1, '#223344');
                ctx.fillStyle = baseGradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add periodic noise (sine wave pattern)
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4;
                        // Add horizontal and vertical periodic noise
                        const noise = Math.sin(x * 0.3) * 30 + Math.sin(y * 0.3) * 30;
                        data[idx] = Math.min(255, Math.max(0, data[idx] + noise));
                        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + noise));
                        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + noise));
                    }
                }
                
                ctx.putImageData(imageData, 0, 0);
                break;
        }
        
        this.originalImageData = ctx.getImageData(0, 0, width, height);
        this.imageData = ctx.getImageData(0, 0, width, height);
        
        document.getElementById('imageSize').textContent = '256×256';
        
        this.processImage();
    }
    
    processImage() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        document.getElementById('processingIndicator').style.display = 'block';
        
        const startTime = performance.now();
        
        // Convert to grayscale for processing
        const grayData = this.toGrayscale(this.imageData);
        
        // Perform 2D FFT
        this.fftData = this.fft2D(grayData, 256, 256);
        
        // Calculate magnitude and phase
        this.calculateSpectrums();
        
        // Visualize results
        this.visualizeMagnitudeSpectrum();
        if (this.settings.showPhase) {
            this.visualizePhaseSpectrum();
        }
        
        // Apply current filter
        this.applyFilter();
        
        const endTime = performance.now();
        document.getElementById('processingTime').textContent = Math.round(endTime - startTime);
        
        document.getElementById('processingIndicator').style.display = 'none';
        this.isProcessing = false;
    }
    
    toGrayscale(imageData) {
        const data = imageData.data;
        const gray = new Float32Array(256 * 256);
        
        for (let i = 0; i < gray.length; i++) {
            const idx = i * 4;
            // Use luminance formula
            gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
        
        return gray;
    }
    
    // 2D FFT implementation
    fft2D(data, width, height) {
        const complex = new Array(width * height);
        
        // Initialize complex array
        for (let i = 0; i < complex.length; i++) {
            complex[i] = { real: data[i], imag: 0 };
        }
        
        // FFT on rows
        for (let y = 0; y < height; y++) {
            const row = complex.slice(y * width, (y + 1) * width);
            const fftRow = this.fft1D(row);
            for (let x = 0; x < width; x++) {
                complex[y * width + x] = fftRow[x];
            }
        }
        
        // FFT on columns
        for (let x = 0; x < width; x++) {
            const col = new Array(height);
            for (let y = 0; y < height; y++) {
                col[y] = complex[y * width + x];
            }
            const fftCol = this.fft1D(col);
            for (let y = 0; y < height; y++) {
                complex[y * width + x] = fftCol[y];
            }
        }
        
        // Shift zero frequency to center
        return this.fftShift2D(complex, width, height);
    }
    
    // 1D FFT using Cooley-Tukey algorithm
    fft1D(data) {
        const n = data.length;
        if (n <= 1) return data;
        
        // Bit-reversal permutation
        const reversed = new Array(n);
        for (let i = 0; i < n; i++) {
            reversed[i] = data[this.reverseBits(i, Math.log2(n))];
        }
        
        // Cooley-Tukey FFT
        for (let size = 2; size <= n; size *= 2) {
            const halfsize = size / 2;
            const step = n / size;
            for (let i = 0; i < n; i += size) {
                for (let j = 0; j < halfsize; j++) {
                    const l = i + j;
                    const r = i + j + halfsize;
                    const twiddle = this.complexExp(-2 * Math.PI * j / size);
                    
                    const t = this.complexMultiply(reversed[r], twiddle);
                    reversed[r] = this.complexSubtract(reversed[l], t);
                    reversed[l] = this.complexAdd(reversed[l], t);
                }
            }
        }
        
        return reversed;
    }
    
    reverseBits(x, bits) {
        let reversed = 0;
        for (let i = 0; i < bits; i++) {
            reversed = (reversed << 1) | (x & 1);
            x >>= 1;
        }
        return reversed;
    }
    
    complexExp(theta) {
        return { real: Math.cos(theta), imag: Math.sin(theta) };
    }
    
    complexMultiply(a, b) {
        return {
            real: a.real * b.real - a.imag * b.imag,
            imag: a.real * b.imag + a.imag * b.real
        };
    }
    
    complexAdd(a, b) {
        return { real: a.real + b.real, imag: a.imag + b.imag };
    }
    
    complexSubtract(a, b) {
        return { real: a.real - b.real, imag: a.imag - b.imag };
    }
    
    fftShift2D(data, width, height) {
        const shifted = new Array(width * height);
        const halfW = Math.floor(width / 2);
        const halfH = Math.floor(height / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const shiftX = (x + halfW) % width;
                const shiftY = (y + halfH) % height;
                shifted[y * width + x] = data[shiftY * width + shiftX];
            }
        }
        
        return shifted;
    }
    
    calculateSpectrums() {
        const size = 256 * 256;
        this.magnitudeSpectrum = new Float32Array(size);
        this.phaseSpectrum = new Float32Array(size);
        
        for (let i = 0; i < size; i++) {
            const real = this.fftData[i].real;
            const imag = this.fftData[i].imag;
            
            this.magnitudeSpectrum[i] = Math.sqrt(real * real + imag * imag);
            this.phaseSpectrum[i] = Math.atan2(imag, real);
        }
    }
    
    visualizeMagnitudeSpectrum() {
        const width = 256;
        const height = 256;
        const imageData = this.magnitudeCtx.createImageData(width, height);
        const data = imageData.data;
        
        // Find max magnitude for normalization (excluding DC component)
        let maxMag = 0;
        for (let i = 1; i < this.magnitudeSpectrum.length; i++) {
            if (this.magnitudeSpectrum[i] > maxMag) {
                maxMag = this.magnitudeSpectrum[i];
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                let value = this.magnitudeSpectrum[idx];
                
                // Apply log scale if enabled
                if (this.settings.logScale) {
                    value = Math.log(1 + value);
                    maxMag = Math.log(1 + maxMag);
                }
                
                // Normalize to 0-255
                value = Math.floor((value / maxMag) * 255);
                
                // Apply custom mask if exists
                if (this.filterMask && this.filterMask[idx] === 0) {
                    // Show masked areas in red
                    data[idx * 4] = 255;
                    data[idx * 4 + 1] = 0;
                    data[idx * 4 + 2] = 0;
                    data[idx * 4 + 3] = 128;
                } else {
                    data[idx * 4] = value;
                    data[idx * 4 + 1] = value;
                    data[idx * 4 + 2] = value;
                    data[idx * 4 + 3] = 255;
                }
            }
        }
        
        this.magnitudeCtx.putImageData(imageData, 0, 0);
    }
    
    visualizePhaseSpectrum() {
        const width = 256;
        const height = 256;
        const imageData = this.phaseCtx.createImageData(width, height);
        const data = imageData.data;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                // Map phase from [-π, π] to [0, 255]
                const value = Math.floor((this.phaseSpectrum[idx] + Math.PI) / (2 * Math.PI) * 255);
                
                data[idx * 4] = value;
                data[idx * 4 + 1] = value;
                data[idx * 4 + 2] = value;
                data[idx * 4 + 3] = 255;
            }
        }
        
        this.phaseCtx.putImageData(imageData, 0, 0);
    }
    
    applyFilter() {
        if (!this.fftData) return;
        
        // Create filter mask
        const filter = this.createFilterMask();
        
        // Apply filter in frequency domain
        const filteredFFT = new Array(this.fftData.length);
        for (let i = 0; i < this.fftData.length; i++) {
            filteredFFT[i] = {
                real: this.fftData[i].real * filter[i],
                imag: this.fftData[i].imag * filter[i]
            };
        }
        
        // Inverse FFT to get filtered image
        const filtered = this.ifft2D(filteredFFT, 256, 256);
        
        // Display filtered image
        this.displayProcessedImage(filtered);
        
        // Visualize filter if enabled
        if (document.getElementById('showFilter').checked) {
            this.visualizeFilter();
        }
    }
    
    createFilterMask() {
        const width = 256;
        const height = 256;
        const centerX = width / 2;
        const centerY = height / 2;
        const mask = new Float32Array(width * height);
        
        switch(this.settings.filterType) {
            case 'lowpass':
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const distance = Math.sqrt(
                            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                        );
                        // Butterworth filter
                        mask[y * width + x] = 1 / (1 + Math.pow(distance / this.settings.filterRadius, 4));
                    }
                }
                break;
                
            case 'highpass':
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const distance = Math.sqrt(
                            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                        );
                        mask[y * width + x] = 1 - (1 / (1 + Math.pow(distance / this.settings.highPassRadius, 4)));
                    }
                }
                break;
                
            case 'bandpass':
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const distance = Math.sqrt(
                            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                        );
                        const lowpass = 1 / (1 + Math.pow(distance / this.settings.bandPassOuter, 4));
                        const highpass = 1 - (1 / (1 + Math.pow(distance / this.settings.bandPassInner, 4)));
                        mask[y * width + x] = lowpass * highpass;
                    }
                }
                break;
                
            case 'custom':
                if (this.filterMask) {
                    for (let i = 0; i < mask.length; i++) {
                        mask[i] = this.filterMask[i];
                    }
                } else {
                    mask.fill(1);
                }
                break;
                
            case 'notch':
                // Initialize to 1 (pass all frequencies)
                mask.fill(1);
                
                // Find and remove periodic noise peaks
                const threshold = this.findNoiseThreshold();
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = y * width + x;
                        // Skip DC component
                        if (Math.abs(x - centerX) > 5 || Math.abs(y - centerY) > 5) {
                            if (this.magnitudeSpectrum[idx] > threshold) {
                                // Create notch filter at this frequency
                                const notchSize = 5;
                                for (let dy = -notchSize; dy <= notchSize; dy++) {
                                    for (let dx = -notchSize; dx <= notchSize; dx++) {
                                        const nx = x + dx;
                                        const ny = y + dy;
                                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                            const dist = Math.sqrt(dx * dx + dy * dy);
                                            if (dist <= notchSize) {
                                                mask[ny * width + nx] *= Math.exp(-(dist * dist) / (2 * notchSize));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                break;
                
            default:
                mask.fill(1);
        }
        
        return mask;
    }
    
    findNoiseThreshold() {
        // Simple threshold detection for periodic noise
        const sorted = Array.from(this.magnitudeSpectrum).sort((a, b) => b - a);
        // Take top 1% as potential noise peaks
        return sorted[Math.floor(sorted.length * 0.01)];
    }
    
    ifft2D(data, width, height) {
        // Inverse shift
        const unshifted = this.fftShift2D(data, width, height);
        
        // IFFT on rows
        for (let y = 0; y < height; y++) {
            const row = unshifted.slice(y * width, (y + 1) * width);
            const ifftRow = this.ifft1D(row);
            for (let x = 0; x < width; x++) {
                unshifted[y * width + x] = ifftRow[x];
            }
        }
        
        // IFFT on columns
        for (let x = 0; x < width; x++) {
            const col = new Array(height);
            for (let y = 0; y < height; y++) {
                col[y] = unshifted[y * width + x];
            }
            const ifftCol = this.ifft1D(col);
            for (let y = 0; y < height; y++) {
                unshifted[y * width + x] = ifftCol[y];
            }
        }
        
        // Extract real part
        const result = new Float32Array(width * height);
        for (let i = 0; i < result.length; i++) {
            result[i] = unshifted[i].real;
        }
        
        return result;
    }
    
    ifft1D(data) {
        const n = data.length;
        // Conjugate
        const conjugated = data.map(x => ({ real: x.real, imag: -x.imag }));
        // Forward FFT
        const fft = this.fft1D(conjugated);
        // Conjugate and scale
        return fft.map(x => ({ real: x.real / n, imag: -x.imag / n }));
    }
    
    displayProcessedImage(data) {
        const width = 256;
        const height = 256;
        const imageData = this.processedCtx.createImageData(width, height);
        const pixels = imageData.data;
        
        // Normalize data to 0-255
        let min = Math.min(...data);
        let max = Math.max(...data);
        
        for (let i = 0; i < data.length; i++) {
            const value = Math.floor((data[i] - min) / (max - min) * 255);
            pixels[i * 4] = value;
            pixels[i * 4 + 1] = value;
            pixels[i * 4 + 2] = value;
            pixels[i * 4 + 3] = 255;
        }
        
        this.processedCtx.putImageData(imageData, 0, 0);
    }
    
    visualizeFilter() {
        const filter = this.createFilterMask();
        const width = 256;
        const height = 256;
        const imageData = this.filterCtx.createImageData(width, height);
        const data = imageData.data;
        
        for (let i = 0; i < filter.length; i++) {
            const value = Math.floor(filter[i] * 255);
            data[i * 4] = value;
            data[i * 4 + 1] = value;
            data[i * 4 + 2] = value;
            data[i * 4 + 3] = 255;
        }
        
        this.filterCtx.putImageData(imageData, 0, 0);
    }
    
    applyCompression() {
        if (!this.fftData) return;
        
        // Sort coefficients by magnitude
        const coefficients = [];
        for (let i = 0; i < this.fftData.length; i++) {
            coefficients.push({
                index: i,
                magnitude: this.magnitudeSpectrum[i],
                complex: this.fftData[i]
            });
        }
        
        coefficients.sort((a, b) => b.magnitude - a.magnitude);
        
        // Keep only top percentage of coefficients
        const keepCount = Math.floor(coefficients.length * this.settings.compressionLevel / 100);
        const compressedFFT = new Array(this.fftData.length);
        
        // Initialize with zeros
        for (let i = 0; i < compressedFFT.length; i++) {
            compressedFFT[i] = { real: 0, imag: 0 };
        }
        
        // Restore top coefficients
        for (let i = 0; i < keepCount; i++) {
            const coeff = coefficients[i];
            compressedFFT[coeff.index] = coeff.complex;
        }
        
        // Update compression ratio display
        const ratio = Math.round(100 / this.settings.compressionLevel);
        document.getElementById('compressionRatio').textContent = `${ratio}:1`;
        
        // Inverse FFT and display
        const compressed = this.ifft2D(compressedFFT, 256, 256);
        this.displayProcessedImage(compressed);
    }
    
    applyDenoising() {
        // Set to notch filter mode
        document.querySelector('input[name="filter"][value="notch"]').checked = true;
        this.settings.filterType = 'notch';
        this.updateFilterUI();
        this.applyFilter();
    }
    
    applySharpen() {
        // Apply high-frequency emphasis
        if (!this.fftData) return;
        
        const width = 256;
        const height = 256;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Create sharpening filter (1 + α * high-pass)
        const alpha = 0.5;
        const filteredFFT = new Array(this.fftData.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const distance = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                
                // High-frequency emphasis filter
                const highpass = 1 - Math.exp(-(distance * distance) / (2 * 30 * 30));
                const filter = 1 + alpha * highpass;
                
                filteredFFT[idx] = {
                    real: this.fftData[idx].real * filter,
                    imag: this.fftData[idx].imag * filter
                };
            }
        }
        
        const sharpened = this.ifft2D(filteredFFT, 256, 256);
        this.displayProcessedImage(sharpened);
    }
}

// Initialize visualizer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('fourier-demo');
        if (container) {
            new FourierTransformVisualizer(container);
        }
    });
} else {
    const container = document.getElementById('fourier-demo');
    if (container) {
        new FourierTransformVisualizer(container);
    }
}