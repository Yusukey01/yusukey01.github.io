
//======================================================================
// 1. Common FFT Utilities
//======================================================================

const FFTUtils = {
    
    // --- Complex Number Operations ---
    complexAdd: (a, b) => ({ real: a.real + b.real, imag: a.imag + b.imag }),
    complexSubtract: (a, b) => ({ real: a.real - b.real, imag: a.imag - b.imag }),
    complexMultiply: (a, b) => ({
        real: a.real * b.real - a.imag * b.imag,
        imag: a.real * b.imag + a.imag * b.real
    }),
    complexExp: (theta) => ({ real: Math.cos(theta), imag: Math.sin(theta) }),
    complexMagnitude: (c) => Math.sqrt(c.real * c.real + c.imag * c.imag),

    /**
     * Bit-reversal (for 1D FFT)
     *
     */
    reverseBits: (x, bits) => {
        let reversed = 0;
        for (let i = 0; i < bits; i++) {
            reversed = (reversed << 1) | (x & 1);
            x >>= 1;
        }
        return reversed;
    },

    /**
     * 1D Fast Fourier Transform (Cooley-Tukey, Iterative)
     * Assumes 'data' is an array of complex objects {real, imag}.
     *
     */
    fft1D: (data) => {
        const n = data.length;
        if (n <= 1) return data;
        
        // Assumes n is a power of 2
        const bits = Math.log2(n);

        // Bit-reversal permutation
        const reversed = new Array(n);
        for (let i = 0; i < n; i++) {
            reversed[i] = data[FFTUtils.reverseBits(i, bits)];
        }
        
        // Cooley-Tukey FFT
        for (let size = 2; size <= n; size *= 2) {
            const halfsize = size / 2;
            for (let i = 0; i < n; i += size) {
                for (let j = 0; j < halfsize; j++) {
                    const l = i + j;
                    const r = i + j + halfsize;
                    const twiddle = FFTUtils.complexExp(-2 * Math.PI * j / size);
                    
                    const t = FFTUtils.complexMultiply(reversed[r], twiddle);
                    reversed[r] = FFTUtils.complexSubtract(reversed[l], t);
                    reversed[l] = FFTUtils.complexAdd(reversed[l], t);
                }
            }
        }
        
        return reversed;
    },

    /**
     * 1D Inverse Fast Fourier Transform
     *
     */
    ifft1D: (data) => {
        const n = data.length;
        // Complex conjugate
        const conjugated = data.map(x => ({ real: x.real, imag: -x.imag }));
        // Forward FFT
        const fft = FFTUtils.fft1D(conjugated);
        // Conjugate and scale
        return fft.map(x => ({ real: x.real / n, imag: -x.imag / n }));
    },

    /**
     * 2D Fast Fourier Transform
     *
     */
    fft2D: (data, width, height) => {
        const complex = new Array(width * height);
        
        // Initialize complex array from real data
        for (let i = 0; i < complex.length; i++) {
            complex[i] = { real: data[i], imag: 0 };
        }
        
        // FFT on rows
        for (let y = 0; y < height; y++) {
            const row = complex.slice(y * width, (y + 1) * width);
            const fftRow = FFTUtils.fft1D(row);
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
            const fftCol = FFTUtils.fft1D(col);
            for (let y = 0; y < height; y++) {
                complex[y * width + x] = fftCol[y];
            }
        }
        
        // Shift zero frequency to center
        return FFTUtils.fftShift2D(complex, width, height);
    },

    /**
     * 2D Inverse Fast Fourier Transform
     *
     */
    ifft2D: (data, width, height) => {
        // Inverse shift
        const unshifted = FFTUtils.fftShift2D(data, width, height);
        
        // IFFT on rows
        for (let y = 0; y < height; y++) {
            const row = unshifted.slice(y * width, (y + 1) * width);
            const ifftRow = FFTUtils.ifft1D(row);
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
            const ifftCol = FFTUtils.ifft1D(col);
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
    },

    /**
     * 2D FFT Shift (moves zero-frequency component to center)
     *
     */
    fftShift2D: (data, width, height) => {
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
    },

    /**
     * Gaussian random number generator (for 1D demo noise)
     *
     */
    gaussianRandom: (() => {
        let spareRandom = null;
        return () => {
            if (spareRandom !== null) {
                const val = spareRandom;
                spareRandom = null;
                return val;
            }
            
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            
            const mag = Math.sqrt(-2.0 * Math.log(u));
            spareRandom = mag * Math.cos(2.0 * Math.PI * v);
            return mag * Math.sin(2.0 * Math.PI * v);
        };
    })()
};


//======================================================================
// 2. 1D Fourier Transform Visualizer (Refactored from FT2_visualizer.js)
//    Now uses FFTUtils for core logic.
//======================================================================

class FourierVisualizer1D {
    constructor(container) {
        if (!container) {
            console.warn('1D Visualizer container not found!');
            return;
        }
        this.container = container;
        this.elements = {}; // To store DOM elements
        this.init();
    }

    /**
     * Creates UI HTML and gets DOM elements
     *
     */
    init() {
        this.container.innerHTML = `
            <div class="fourier-container">
                <div class="fourier-layout">
                    <div class="fourier-visualization">
                        <div class="canvas-panel">
                            <div class="plot-title">Time Domain (Signal)</div>
                            <canvas id="time-domain-canvas" width="600" height="200"></canvas>
                            <div class="plot-xlabel">Time (s)</div>
                        </div>
                        <div class="canvas-panel">
                            <div class="plot-title">Frequency Domain (Magnitude Spectrum)</div>
                            <canvas id="freq-domain-canvas" width="600" height="200"></canvas>
                            <div class="plot-xlabel">Frequency (Hz)</div>
                        </div>
                    </div>
                    <div class="controls-panel">
                        <div class="control-group">
                            <label for="fs-select">Sampling Rate (Hz):</label>
                            <select id="fs-select" class="form-select full-width">
                                <option value="512" selected>512 Hz (Power of 2)</option>
                                <option value="1024">1024 Hz (Power of 2)</option>
                            </select>
                        </div>
                        <div class="control-group-separator">Component 1</div>
                        <div class="control-group">
                            <label for="comp1-freq" class="form-label">Frequency 1 (Hz): <span id="comp1-freq-display">50 Hz</span></label>
                            <input type="range" id="comp1-freq" min="1" max="255" step="1" value="50" class="form-range full-width">
                        </div>
                        <div class="control-group">
                            <label for="comp1-amp" class="form-label">Amplitude 1: <span id="comp1-amp-display">1.0</span></label>
                            <input type="range" id="comp1-amp" min="0" max="1.5" step="0.05" value="1.0" class="form-range full-width">
                        </div>
                        <div class="control-group-separator">Component 2</div>
                        <div class="control-group">
                            <label for="comp2-freq" class="form-label">Frequency 2 (Hz): <span id="comp2-freq-display">120 Hz</span></label>
                            <input type="range" id="comp2-freq" min="1" max="255" step="1" value="120" class="form-range full-width">
                        </div>
                        <div class="control-group">
                            <label for="comp2-amp" class="form-label">Amplitude 2: <span id="comp2-amp-display">0.5</span></label>
                            <input type="range" id="comp2-amp" min="0" max="1.5" step="0.05" value="0.5" class="form-range full-width">
                        </div>
                        <div class="control-group-separator">Noise</div>
                        <div class="control-group">
                            <label for="noise-level" class="form-label">Noise Amplitude: <span id="noise-display">0.3</span></label>
                            <input type="range" id="noise-level" min="0" max="1.0" step="0.05" value="0.3" class="form-range full-width">
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles dynamically
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .fourier-layout { display: flex; flex-direction: column; gap: 20px; }
            @media (min-width: 992px) { .fourier-layout { flex-direction: row; } .fourier-visualization { flex: 3; order: 1; } .controls-panel { flex: 1; order: 2; } }
            .fourier-visualization { background-color: #f8f9fa; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; gap: 20px; }
            .canvas-panel { width: 100%; }
            .canvas-panel canvas { width: 100%; height: auto; background-color: #ffffff; border: 1px solid #ddd; border-radius: 4px; }
            .plot-title { font-weight: bold; text-align: center; margin-bottom: 5px; font-size: 0.9rem; }
            .plot-xlabel { text-align: center; font-size: 0.8rem; color: #666; margin-top: 2px; }
            .controls-panel { background-color: #f8f9fa; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
            .control-group { margin-bottom: 15px; }
            .control-group-separator { font-weight: bold; color: #0056b3; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 20px 0 15px 0; }
            .control-group label { display: block; font-weight: bold; margin-bottom: 8px; }
            .full-width { width: 100%; }
        `;
        document.head.appendChild(styleElement);

        // Cache DOM elements
        this.elements = {
            fsSelect: this.container.querySelector('#fs-select'),
            comp1Freq: this.container.querySelector('#comp1-freq'),
            comp1Amp: this.container.querySelector('#comp1-amp'),
            comp2Freq: this.container.querySelector('#comp2-freq'),
            comp2Amp: this.container.querySelector('#comp2-amp'),
            noiseLevel: this.container.querySelector('#noise-level'),
            comp1FreqDisplay: this.container.querySelector('#comp1-freq-display'),
            comp1AmpDisplay: this.container.querySelector('#comp1-amp-display'),
            comp2FreqDisplay: this.container.querySelector('#comp2-freq-display'),
            comp2AmpDisplay: this.container.querySelector('#comp2-amp-display'),
            noiseDisplay: this.container.querySelector('#noise-display'),
            timeCanvas: this.container.querySelector('#time-domain-canvas'),
            freqCanvas: this.container.querySelector('#freq-domain-canvas')
        };
        
        // Set up event listeners
        Object.values(this.elements).forEach(el => {
            if (el && el.tagName === 'CANVAS') return;
            if (el) {
                const eventType = (el.tagName === 'SELECT') ? 'change' : 'input';
                el.addEventListener(eventType, () => this.handleParameterChange());
            }
        });
        
        // Initial draw
        this.handleParameterChange();
    }

    /**
     * Generates signal and computes FFT
     *
     */
    computeSignalAndFFT() {
        const fs = parseInt(this.elements.fsSelect.value);
        const f1 = parseFloat(this.elements.comp1Freq.value);
        const a1 = parseFloat(this.elements.comp1Amp.value);
        const f2 = parseFloat(this.elements.comp2Freq.value);
        const a2 = parseFloat(this.elements.comp2Amp.value);
        const noiseAmp = parseFloat(this.elements.noiseLevel.value);

        const n = fs;
        const time = [];
        const signal = [];
        const complexSignal = [];

        for (let i = 0; i < n; i++) {
            const t = i / fs;
            time.push(t);
            const val1 = a1 * Math.sin(2 * Math.PI * f1 * t);
            const val2 = a2 * Math.sin(2 * Math.PI * f2 * t);
            const noise = noiseAmp * FFTUtils.gaussianRandom();
            const sample = val1 + val2 + noise;
            
            signal.push(sample);
            complexSignal.push({ real: sample, imag: 0 }); // Create complex array
        }

        // *** Refactoring Point ***
        // Use FFTUtils.fft1D instead of internal recursive FFT
        const fftResult = FFTUtils.fft1D(complexSignal);
        
        const fftMag = fftResult.map(c => FFTUtils.complexMagnitude(c) / n);
        const n_half = Math.floor(n / 2);
        const positiveMag = fftMag.slice(0, n_half);
        
        // Double amplitude for single-sided spectrum
        for (let i = 1; i < n_half; i++) {
            positiveMag[i] *= 2;
        }

        const frequencies = [];
        for (let i = 0; i < n_half; i++) {
            frequencies.push(i * fs / n);
        }

        return { time, signal, frequencies, positiveMag, fs };
    }

    /**
     * Draws axes on a canvas
     *
     */
    drawAxes(ctx, w, h, xLabel = 'X', yLabel = 'Y') {
        const pad = 30;
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(pad, pad / 2);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(w - pad / 2, h - pad);
        ctx.stroke();
    }

    /**
     * Draws the time-domain signal
     *
     */
    drawTimeDomain(canvas, time, signal) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const pad = 30;
        ctx.clearRect(0, 0, w, h);
        this.drawAxes(ctx, w, h, '', 'Amplitude');

        let maxAmp = Math.max(...signal.map(Math.abs));
        maxAmp = Math.max(maxAmp, 1.0); // Ensure at least +/- 1 range
        
        const N_TO_DRAW = Math.min(signal.length, 200); // Draw first 200 samples
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < N_TO_DRAW; i++) {
            const x = pad + (time[i] / time[N_TO_DRAW-1]) * (w - pad * 1.5);
            const y = (h / 2) - (signal[i] / maxAmp) * (h / 2 - pad / 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    /**
     * Draws the frequency-domain spectrum
     *
     */
    drawFreqDomain(canvas, frequencies, fftMagnitude, fs) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const pad = 30;
        ctx.clearRect(0, 0, w, h);
        this.drawAxes(ctx, w, h, '', 'Magnitude');

        let maxMag = Math.max(...fftMagnitude);
        maxMag = Math.max(maxMag, 0.5); // Min peak height
        
        const maxFreq = fs / 2;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, h - pad); // Start at (0, 0)

        for (let i = 0; i < frequencies.length; i++) {
            const x = pad + (frequencies[i] / maxFreq) * (w - pad * 1.5);
            const y = (h - pad) - (fftMagnitude[i] / maxMag) * (h - pad * 1.5);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    /**
     * Main update handler
     *
     */
    handleParameterChange() {
        // Update display labels
        this.elements.comp1FreqDisplay.textContent = `${this.elements.comp1Freq.value} Hz`;
        this.elements.comp1AmpDisplay.textContent = `${parseFloat(this.elements.comp1Amp.value).toFixed(2)}`;
        this.elements.comp2FreqDisplay.textContent = `${this.elements.comp2Freq.value} Hz`;
        this.elements.comp2AmpDisplay.textContent = `${parseFloat(this.elements.comp2Amp.value).toFixed(2)}`;
        this.elements.noiseDisplay.textContent = `${parseFloat(this.elements.noiseLevel.value).toFixed(2)}`;

        // Adjust max frequency based on Nyquist
        const fs = parseInt(this.elements.fsSelect.value);
        const nyquist = Math.floor(fs / 2);
        this.elements.comp1Freq.max = nyquist - 1;
        this.elements.comp2Freq.max = nyquist - 1;

        // Re-compute and re-draw
        const { time, signal, frequencies, positiveMag } = this.computeSignalAndFFT();
        this.drawTimeDomain(this.elements.timeCanvas, time, signal);
        this.drawFreqDomain(this.elements.freqCanvas, frequencies, positiveMag, fs);
    }
}


//======================================================================
// 3. 2D Fourier Transform Visualizer (Refactored from fourier_transform_visualizer.js)
//    Now uses FFTUtils for core logic.
//======================================================================

class FourierVisualizer2D {
    constructor(container) {
        if (!container) {
            console.warn('2D Visualizer container not found!');
            return;
        }
        this.container = container;
        this.imageData = null;
        this.originalImageData = null;
        this.fftData = null;
        this.magnitudeSpectrum = null;
        this.phaseSpectrum = null;
        this.filterMask = null;
        this.isProcessing = false;
        
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
    
    /**
     * Creates UI HTML and gets DOM elements
     *
     */
    init() {
        // Using Bootstrap-friendly classes (form-label, form-range, form-check, btn, etc.)
        this.container.innerHTML = `
            <div class="fft-visualizer">
                <div class="controls-panel">
                    <div class="control-section">
                        <h3>Image Input</h3>
                        <div class="input-controls">
                            <input type="file" id="imageUpload" accept="image/*" style="display: none;">
                            <button class="btn btn-primary" onclick="document.getElementById('imageUpload').click()">
                                Upload Image
                            </button>
                            <div class="preset-images btn-group mt-2">
                                <button class="btn btn-outline-secondary btn-preset" data-preset="pattern">Pattern</button>
                                <button class="btn btn-outline-secondary btn-preset" data-preset="text">Text</button>
                                <button class="btn btn-outline-secondary btn-preset" data-preset="photo">Photo</button>
                                <button class="btn btn-outline-secondary btn-preset" data-preset="noise">Noise</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h3>Frequency Domain Filters</h3>
                        <div class="filter-controls">
                            <div class="form-check"><input type="radio" class="form-check-input" name="filter" value="none" id="filterNone" checked><label class="form-check-label" for="filterNone">No Filter</label></div>
                            <div class="form-check"><input type="radio" class="form-check-input" name="filter" value="lowpass" id="filterLowpass"><label class="form-check-label" for="filterLowpass">Low-pass (Blur)</label></div>
                            <div class="form-check"><input type="radio" class="form-check-input" name="filter" value="highpass" id="filterHighpass"><label class="form-check-label" for="filterHighpass">High-pass (Edges)</label></div>
                            <div class="form-check"><input type="radio" class="form-check-input" name="filter" value="bandpass" id="filterBandpass"><label class="form-check-label" for="filterBandpass">Band-pass</label></div>
                            <div class="form-check"><input type="radio" class="form-check-input" name="filter" value="notch" id="filterNotch"><label class="form-check-label" for="filterNotch">Notch (Remove Pattern)</label></div>
                            <div class="form-check"><input type="radio" class="form-check-input" name="filter" value="custom" id="filterCustom"><label class="form-check-label" for="filterCustom">Custom Mask</label></div>
                        </div>
                        
                        <div id="filterParams" class="filter-params mt-3">
                            <div class="param-group" id="lowpassParams" style="display: none;">
                                <label class="form-label">Cutoff Frequency: <span id="lowpassValue">30</span></label>
                                <input type="range" class="form-range" id="lowpassRadius" min="5" max="100" value="30">
                            </div>
                            <div class="param-group" id="highpassParams" style="display: none;"><label class="form-label">Cutoff: <span id="highpassValue">10</span></label><input type="range" class="form-range" id="highpassRadius" min="1" max="50" value="10"></div>
                            <div class="param-group" id="bandpassParams" style="display: none;"><label class="form-label">Inner: <span id="bandpassInnerValue">10</span></label><input type="range" class="form-range" id="bandpassInner" min="1" max="50" value="10"><label class="form-label mt-2">Outer: <span id="bandpassOuterValue">50</span></label><input type="range" class="form-range" id="bandpassOuter" min="10" max="100" value="50"></div>
                            <div class="param-group" id="customParams" style="display: none;"><p>Click and drag on the magnitude spectrum to mask regions.</p><button class="btn btn-secondary btn-sm" id="clearMask">Clear Mask</button></div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h3>Applications</h3>
                        <div class="application-controls">
                            <div class="compression-control">
                                <label class="form-label">Compression: <span id="compressionValue">100%</span></label>
                                <input type="range" class="form-range" id="compression" min="1" max="100" value="100">
                                <div class="form-text">Keeping top <span id="coeffCount">100%</span> of coefficients</div>
                            </div>
                            <button class="btn btn-secondary mt-2" id="denoise">Auto-Remove Periodic Noise</button>
                            <button class="btn btn-secondary mt-2" id="sharpen">Sharpen Image</button>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h3>Visualization Options</h3>
                        <div class="form-check"><input type="checkbox" class="form-check-input" id="logScale" checked><label class="form-check-label" for="logScale">Logarithmic Scale (Magnitude)</label></div>
                        <div class="form-check"><input type="checkbox" class="form-check-input" id="showPhase"><label class="form-check-label" for="showPhase">Show Phase Spectrum</label></div>
                        <div class="form-check"><input type="checkbox" class="form-check-input" id="showFilter"><label class="form-check-label" for="showFilter">Show Filter Response</label></div>
                    </div>
                </div>
                
                <div class="visualization-area">
                    <div class="row">
                        <div class="col-md-6 image-panel"><h4>Original Image</h4><canvas id="originalCanvas" width="256" height="256" class="img-fluid"></canvas></div>
                        <div class="col-md-6 image-panel"><h4>Processed Image</h4><canvas id="processedCanvas" width="256" height="256" class="img-fluid"></canvas></div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-md-4 spectrum-panel"><h4>Magnitude Spectrum</h4><canvas id="magnitudeCanvas" width="256" height="256" class="img-fluid"></canvas></div>
                        <div class="col-md-4 spectrum-panel" id="phasePanel" style="display: none;"><h4>Phase Spectrum</h4><canvas id="phaseCanvas" width="256" height="256" class="img-fluid"></canvas></div>
                        <div class="col-md-4 spectrum-panel" id="filterPanel" style="display: none;"><h4>Filter Response</h4><canvas id="filterCanvas" width="256" height="256" class="img-fluid"></canvas></div>
                    </div>
                    <div class="info-panel mt-3">
                        <div class="spinner-border text-primary" id="processingIndicator" style="display: none;" role="status"><span class="visually-hidden">Processing...</span></div>
                        <div class="stats form-text">
                            <span>Image Size: <strong id="imageSize">-</strong></span> | 
                            <span>Processing Time: <strong id="processingTime">-</strong> ms</span> | 
                            <span>Compression Ratio: <strong id="compressionRatio">1:1</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles dynamically
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .fft-visualizer { display: grid; grid-template-columns: 1fr; gap: 20px; }
            @media (min-width: 992px) { .fft-visualizer { grid-template-columns: 300px 1fr; } }
            .controls-panel { border-right: 1px solid #ddd; padding-right: 20px; }
            .control-section { margin-bottom: 25px; }
            .visualization-area { padding-left: 20px; }
            .image-panel canvas, .spectrum-panel canvas { width: 100%; height: auto; max-width: 256px; border: 1px solid #ccc; }
        `;
        document.head.appendChild(styleElement);
        
        this.setupCanvases();
        this.setupEventListeners();
        this.loadDefaultImage();
    }
    
    // (The following methods are copied from fourier_transform_visualizer.js
    // with no significant changes, as they are mostly UI/logic related.
    // The core FFT/IFFT calls are refactored below.)
    //
    
    // --- UI and Event Listeners (Copied, no change) ---
    
    setupCanvases() {
        this.originalCanvas = this.container.querySelector('#originalCanvas');
        this.processedCanvas = this.container.querySelector('#processedCanvas');
        this.magnitudeCanvas = this.container.querySelector('#magnitudeCanvas');
        this.phaseCanvas = this.container.querySelector('#phaseCanvas');
        this.filterCanvas = this.container.querySelector('#filterCanvas');
        
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.processedCtx = this.processedCanvas.getContext('2d');
        this.magnitudeCtx = this.magnitudeCanvas.getContext('2d');
        this.phaseCtx = this.phaseCanvas.getContext('2d');
        this.filterCtx = this.filterCanvas.getContext('2d');
        
        this.setupMaskDrawing();
    }
    
    setupMaskDrawing() {
        let isDrawing = false;
        
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
        
        this.magnitudeCanvas.addEventListener('mouseleave', () => { isDrawing = false; });
    }
    
    drawMaskPoint(e) {
        const rect = this.magnitudeCanvas.getBoundingClientRect();
        const canvas = this.magnitudeCanvas;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (!this.filterMask) {
            this.filterMask = new Array(256 * 256).fill(1);
        }
        
        const centerX = Math.floor(x);
        const centerY = Math.floor(y);
        const radius = 10; // Brush radius
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const px = centerX + dx;
                    const py = centerY + dy;
                    if (px >= 0 && px < 256 && py >= 0 && py < 256) {
                        this.filterMask[py * 256 + px] = 0; // Set mask to 0 (block)
                    }
                }
            }
        }
        this.visualizeMagnitudeSpectrum(); // Show the mask in real-time
    }
    
    setupEventListeners() {
        this.container.querySelector('#imageUpload').addEventListener('change', (e) => this.handleImageUpload(e));
        this.container.querySelectorAll('.btn-preset').forEach(btn => btn.addEventListener('click', (e) => this.loadPresetImage(e.target.dataset.preset)));
        this.container.querySelectorAll('input[name="filter"]').forEach(radio => radio.addEventListener('change', (e) => {
            this.settings.filterType = e.target.value;
            this.updateFilterUI();
            this.applyFilter();
        }));
        
        this.container.querySelector('#lowpassRadius').addEventListener('input', (e) => {
            this.settings.filterRadius = parseInt(e.target.value);
            this.container.querySelector('#lowpassValue').textContent = e.target.value;
            this.applyFilter();
        });
        this.container.querySelector('#highpassRadius').addEventListener('input', (e) => {
            this.settings.highPassRadius = parseInt(e.target.value);
            this.container.querySelector('#highpassValue').textContent = e.target.value;
            this.applyFilter();
        });
        this.container.querySelector('#bandpassInner').addEventListener('input', (e) => {
            this.settings.bandPassInner = parseInt(e.target.value);
            this.container.querySelector('#bandpassInnerValue').textContent = e.target.value;
            this.applyFilter();
        });
        this.container.querySelector('#bandpassOuter').addEventListener('input', (e) => {
            this.settings.bandPassOuter = parseInt(e.target.value);
            this.container.querySelector('#bandpassOuterValue').textContent = e.target.value;
            this.applyFilter();
        });
        this.container.querySelector('#compression').addEventListener('input', (e) => {
            this.settings.compressionLevel = parseInt(e.target.value);
            this.container.querySelector('#compressionValue').textContent = e.target.value + '%';
            this.container.querySelector('#coeffCount').textContent = e.target.value + '%';
            this.applyCompression();
        });
        
        this.container.querySelector('#logScale').addEventListener('change', (e) => {
            this.settings.logScale = e.target.checked;
            this.visualizeMagnitudeSpectrum();
        });
        this.container.querySelector('#showPhase').addEventListener('change', (e) => {
            this.settings.showPhase = e.target.checked;
            this.container.querySelector('#phasePanel').style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) this.visualizePhaseSpectrum();
        });
        this.container.querySelector('#showFilter').addEventListener('change', (e) => {
            this.container.querySelector('#filterPanel').style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) this.visualizeFilter();
        });
        
        this.container.querySelector('#denoise').addEventListener('click', () => this.applyDenoising());
        this.container.querySelector('#sharpen').addEventListener('click', () => this.applySharpen());
        this.container.querySelector('#clearMask').addEventListener('click', () => {
            this.filterMask = null; // Clear the custom mask
            this.applyFilter();
        });
    }
    
    updateFilterUI() {
        this.container.querySelectorAll('.param-group').forEach(group => group.style.display = 'none');
        const paramMap = { 'lowpass': 'lowpassParams', 'highpass': 'highpassParams', 'bandpass': 'bandpassParams', 'custom': 'customParams' };
        if (paramMap[this.settings.filterType]) {
            this.container.querySelector(`#${paramMap[this.settings.filterType]}`).style.display = 'block';
        }
    }
    
    // --- Image Loading (Copied, no change) ---
    
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => this.loadImage(img);
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    loadImage(img) {
        this.originalCanvas.width = 256;
        this.originalCanvas.height = 256;
        this.originalCtx.drawImage(img, 0, 0, 256, 256);
        this.originalImageData = this.originalCtx.getImageData(0, 0, 256, 256);
        this.imageData = this.originalCtx.getImageData(0, 0, 256, 256);
        this.container.querySelector('#imageSize').textContent = '256×256';
        this.processImage();
    }
    
    loadDefaultImage() {
        const canvas = this.originalCanvas;
        const ctx = this.originalCtx;
        const width = 256, height = 256;
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#44f');
        gradient.addColorStop(1, '#f44');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(width/2, height/2, 20 + i * 20, 0, 2 * Math.PI);
            ctx.stroke();
        }
        this.originalImageData = ctx.getImageData(0, 0, width, height);
        this.imageData = ctx.getImageData(0, 0, width, height);
        this.container.querySelector('#imageSize').textContent = '256×256';
        this.processImage();
    }
    
    loadPresetImage(preset) {
        const canvas = this.originalCanvas;
        const ctx = this.originalCtx;
        const width = 256, height = 256;
        ctx.clearRect(0, 0, width, height);
        
        switch(preset) {
            case 'pattern':
                const squareSize = 16;
                for (let y = 0; y < height; y += squareSize) {
                    for (let x = 0; x < width; x += squareSize) {
                        ctx.fillStyle = ((x / squareSize + y / squareSize) % 2 === 0) ? '#000' : '#fff';
                        ctx.fillRect(x, y, squareSize, squareSize);
                    }
                }
                break;
            case 'text':
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('FOURIER', width/2, height/2 - 30);
                break;
            case 'photo':
                const radialGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
                radialGradient.addColorStop(0, '#ffeeaa');
                radialGradient.addColorStop(1, '#442211');
                ctx.fillStyle = radialGradient;
                ctx.fillRect(0, 0, width, height);
                break;
            case 'noise':
                ctx.fillStyle = '#667788';
                ctx.fillRect(0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4;
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
        this.container.querySelector('#imageSize').textContent = '256×256';
        this.processImage();
    }

    toGrayscale(imageData) {
        const data = imageData.data;
        const gray = new Float32Array(256 * 256);
        for (let i = 0; i < gray.length; i++) {
            const idx = i * 4;
            // Luminance formula
            gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
        return gray;
    }

    // --- Core Processing (Refactored) ---
    
    processImage() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.container.querySelector('#processingIndicator').style.display = 'block';
        const startTime = performance.now();
        
        const grayData = this.toGrayscale(this.imageData);
        
        // *** Refactoring Point ***
        // Use FFTUtils.fft2D instead of internal this.fft2D
        this.fftData = FFTUtils.fft2D(grayData, 256, 256);
        
        this.calculateSpectrums();
        this.visualizeMagnitudeSpectrum();
        if (this.settings.showPhase) this.visualizePhaseSpectrum();
        
        this.applyFilter();
        
        const endTime = performance.now();
        this.container.querySelector('#processingTime').textContent = `${Math.round(endTime - startTime)} ms`;
        this.container.querySelector('#processingIndicator').style.display = 'none';
        this.isProcessing = false;
    }

    // --- Spectrum Calculation & Visualization (Copied, no change) ---
    
    calculateSpectrums() {
        const size = 256 * 256;
        this.magnitudeSpectrum = new Float32Array(size);
        this.phaseSpectrum = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            // Use FFTUtils.complexMagnitude
            this.magnitudeSpectrum[i] = FFTUtils.complexMagnitude(this.fftData[i]);
            this.phaseSpectrum[i] = Math.atan2(this.fftData[i].imag, this.fftData[i].real);
        }
    }

    visualizeMagnitudeSpectrum() {
        const width = 256;
        const height = 256;
        const imageData = this.magnitudeCtx.createImageData(width, height);
        const data = imageData.data;
        let maxMag = 0;
        // Find max magnitude (excluding DC component for better contrast)
        for (let i = 1; i < this.magnitudeSpectrum.length; i++) {
            if (this.magnitudeSpectrum[i] > maxMag) maxMag = this.magnitudeSpectrum[i];
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                let value = this.magnitudeSpectrum[idx];
                if (this.settings.logScale) {
                    value = Math.log(1 + value);
                    maxMag = Math.log(1 + maxMag); // Adjust max for log scale
                }
                value = Math.floor((value / maxMag) * 255);
                
                // Show custom mask as red overlay
                if (this.filterMask && this.filterMask[idx] === 0) {
                    data[idx * 4] = 255; data[idx * 4 + 1] = 0; data[idx * 4 + 2] = 0; data[idx * 4 + 3] = 128; // Red overlay
                } else {
                    data[idx * 4] = value; data[idx * 4 + 1] = value; data[idx * 4 + 2] = value; data[idx * 4 + 3] = 255; // Grayscale
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
                // Map phase from [-PI, PI] to [0, 255]
                const value = Math.floor((this.phaseSpectrum[idx] + Math.PI) / (2 * Math.PI) * 255);
                data[idx * 4] = value; data[idx * 4 + 1] = value; data[idx * 4 + 2] = value; data[idx * 4 + 3] = 255;
            }
        }
        this.phaseCtx.putImageData(imageData, 0, 0);
    }

    // --- Filter Application (Refactored) ---
    
    applyFilter() {
        if (!this.fftData) return;
        
        const filter = this.createFilterMask();
        const filteredFFT = new Array(this.fftData.length);
        for (let i = 0; i < this.fftData.length; i++) {
            // Apply filter mask
            filteredFFT[i] = {
                real: this.fftData[i].real * filter[i],
                imag: this.fftData[i].imag * filter[i]
            };
        }
        
        // *** Refactoring Point ***
        // Use FFTUtils.ifft2D instead of internal this.ifft2D
        const filtered = FFTUtils.ifft2D(filteredFFT, 256, 256);
        
        this.displayProcessedImage(filtered);
        if (this.container.querySelector('#showFilter').checked) {
            this.visualizeFilter();
        }
    }

    // --- Filter Creation & Applications (Copied, no change) ---

    createFilterMask() {
        const width = 256, height = 256;
        const centerX = width / 2, centerY = height / 2;
        const mask = new Float32Array(width * height);
        
        switch(this.settings.filterType) {
            case 'lowpass':
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                        // Butterworth filter (n=2)
                        mask[y * width + x] = 1 / (1 + Math.pow(distance / this.settings.filterRadius, 4));
                    }
                }
                break;
            case 'highpass':
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                        // Butterworth high-pass
                        mask[y * width + x] = 1 - (1 / (1 + Math.pow(distance / this.settings.highPassRadius, 4)));
                    }
                }
                break;
            case 'bandpass':
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                        const lowpass = 1 / (1 + Math.pow(distance / this.settings.bandPassOuter, 4));
                        const highpass = 1 - (1 / (1 + Math.pow(distance / this.settings.bandPassInner, 4)));
                        mask[y * width + x] = lowpass * highpass;
                    }
                }
                break;
            case 'custom':
                if (this.filterMask) {
                    for (let i = 0; i < mask.length; i++) mask[i] = this.filterMask[i];
                } else {
                    mask.fill(1); // Pass all if no mask drawn
                }
                break;
            case 'notch':
                mask.fill(1);
                const threshold = this.findNoiseThreshold();
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = y * width + x;
                        // Skip DC component
                        if (Math.abs(x - centerX) > 5 || Math.abs(y - centerY) > 5) {
                            if (this.magnitudeSpectrum[idx] > threshold) {
                                // Create a Gaussian notch
                                const notchSize = 5;
                                for (let dy = -notchSize; dy <= notchSize; dy++) {
                                    for (let dx = -notchSize; dx <= notchSize; dx++) {
                                        const nx = x + dx; const ny = y + dy;
                                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                            const dist = Math.sqrt(dx * dx + dy * dy);
                                            if (dist <= notchSize) mask[ny * width + nx] *= Math.exp(-(dist * dist) / (2 * notchSize));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                break;
            default: // 'none'
                mask.fill(1); // Pass all frequencies
        }
        return mask;
    }
    
    findNoiseThreshold() {
        // Simple heuristic: find top 1% magnitude coefficients (excluding DC)
        const sorted = Array.from(this.magnitudeSpectrum).sort((a, b) => b - a);
        return sorted[Math.floor(sorted.length * 0.01)];
    }
    
    displayProcessedImage(data) {
        const width = 256, height = 256;
        const imageData = this.processedCtx.createImageData(width, height);
        const pixels = imageData.data;
        // Normalize for display
        let min = Math.min(...data);
        let max = Math.max(...data);
        
        for (let i = 0; i < data.length; i++) {
            const value = Math.floor((data[i] - min) / (max - min) * 255);
            pixels[i * 4] = value; pixels[i * 4 + 1] = value; pixels[i * 4 + 2] = value; pixels[i * 4 + 3] = 255;
        }
        this.processedCtx.putImageData(imageData, 0, 0);
    }
    
    visualizeFilter() {
        const filter = this.createFilterMask();
        const width = 256, height = 256;
        const imageData = this.filterCtx.createImageData(width, height);
        const data = imageData.data;
        for (let i = 0; i < filter.length; i++) {
            const value = Math.floor(filter[i] * 255);
            data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
        }
        this.filterCtx.putImageData(imageData, 0, 0);
    }
    
    applyCompression() {
        if (!this.fftData) return;
        // Create an array of coefficients with their magnitudes and indices
        const coefficients = this.fftData.map((complex, index) => ({
            index: index,
            magnitude: this.magnitudeSpectrum[index],
            complex: complex
        })).sort((a, b) => b.magnitude - a.magnitude); // Sort by magnitude
        
        const keepCount = Math.floor(coefficients.length * this.settings.compressionLevel / 100);
        const compressedFFT = new Array(this.fftData.length).fill({ real: 0, imag: 0 });
        
        // Keep only the top N coefficients
        for (let i = 0; i < keepCount; i++) {
            compressedFFT[coefficients[i].index] = coefficients[i].complex;
        }
        
        this.container.querySelector('#compressionRatio').textContent = `${Math.round(100 / this.settings.compressionLevel)}:1`;
        
        // *** Refactoring Point ***
        const compressed = FFTUtils.ifft2D(compressedFFT, 256, 256);
        this.displayProcessedImage(compressed);
    }
    
    applyDenoising() {
        this.container.querySelector('input[name="filter"][value="notch"]').checked = true;
        this.settings.filterType = 'notch';
        this.updateFilterUI();
        this.applyFilter();
    }
    
    applySharpen() {
        if (!this.fftData) return;
        const width = 256, height = 256, centerX = width / 2, centerY = height / 2;
        const alpha = 0.5; // Sharpening factor
        const filteredFFT = new Array(this.fftData.length);
        
        // High-frequency emphasis filter (1 + alpha * high-pass)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                const highpass = 1 - Math.exp(-(distance * distance) / (2 * 30 * 30)); // Gaussian high-pass
                const filter = 1 + alpha * highpass;
                filteredFFT[idx] = {
                    real: this.fftData[idx].real * filter,
                    imag: this.fftData[idx].imag * filter
                };
            }
        }
        
        // *** Refactoring Point ***
        const sharpened = FFTUtils.ifft2D(filteredFFT, 256, 256);
        this.displayProcessedImage(sharpened);
    }
}

//======================================================================
// 4. Initialize Visualizers on DOM Load
//======================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize 1D demo
    const demo1DContainer = document.getElementById('fourier_visualizer_1d');
    if (demo1DContainer) {
        new FourierVisualizer1D(demo1DContainer);
    }

    // Initialize 2D demo
    const demo2DContainer = document.getElementById('fourier_visualizer_2d');
    if (demo2DContainer) {
        new FourierVisualizer2D(demo2DContainer);
    }
});