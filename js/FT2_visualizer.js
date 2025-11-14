// Fourier Transform Interactive Demo

document.addEventListener('DOMContentLoaded', function() {
    // Get the container element
    const container = document.getElementById('fourier_visualizer');
    
    if (!container) {
        console.warn('Container element #fourier_visualizer not found! Demo will not load.');
        return;
    }

    // --- 1. Create HTML structure ---
    container.innerHTML = `
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
                        <select id="fs-select" class="full-width">
                            <option value="512" selected>512 Hz (Power of 2)</option>
                            <option value="1024">1024 Hz (Power of 2)</option>
                        </select>
                    </div>

                    <div class="control-group-separator">Component 1</div>
                    <div class="control-group">
                        <label for="comp1-freq">Frequency 1 (Hz):</label>
                        <input type="range" id="comp1-freq" min="1" max="255" step="1" value="50" class="full-width">
                        <span id="comp1-freq-display">50 Hz</span>
                    </div>
                    <div class="control-group">
                        <label for="comp1-amp">Amplitude 1:</label>
                        <input type="range" id="comp1-amp" min="0" max="1.5" step="0.05" value="1.0" class="full-width">
                        <span id="comp1-amp-display">1.0</span>
                    </div>

                    <div class="control-group-separator">Component 2</div>
                    <div class="control-group">
                        <label for="comp2-freq">Frequency 2 (Hz):</label>
                        <input type="range" id="comp2-freq" min="1" max="255" step="1" value="120" class="full-width">
                        <span id="comp2-freq-display">120 Hz</span>
                    </div>
                    <div class="control-group">
                        <label for="comp2-amp">Amplitude 2:</label>
                        <input type="range" id="comp2-amp" min="0" max="1.5" step="0.05" value="0.5" class="full-width">
                        <span id="comp2-amp-display">0.5</span>
                    </div>

                    <div class="control-group-separator">Noise</div>
                    <div class="control-group">
                        <label for="noise-level">Noise Amplitude:</label>
                        <input type="range" id="noise-level" min="0" max="1.0" step="0.05" value="0.3" class="full-width">
                        <span id="noise-display">0.3</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- 2. Add styles ---
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .fourier-container {
            font-family: Arial, sans-serif;
            margin-bottom: 20px;
        }
        
        .fourier-layout {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        @media (min-width: 992px) {
            .fourier-layout {
                flex-direction: row;
            }
            
            .fourier-visualization {
                flex: 3;
                order: 1;
            }
            
            .controls-panel {
                flex: 1;
                order: 2;
            }
        }
        
        .fourier-visualization {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .canvas-panel {
            width: 100%;
        }

        .canvas-panel canvas {
            width: 100%;
            height: auto;
            background-color: #ffffff;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .plot-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 5px;
            font-size: 0.9rem;
        }

        .plot-xlabel {
            text-align: center;
            font-size: 0.8rem;
            color: #666;
            margin-top: 2px;
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

        .control-group-separator {
            font-weight: bold;
            color: #3498db;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin: 20px 0 15px 0;
        }
        
        .control-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .full-width {
            width: 100%;
            padding: 0; /* Sliders default */
        }

        /* Standardize select dropdowns */
        select.full-width {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(styleElement);

    // --- 3. Get DOM elements ---
    const elements = {
        fsSelect: document.getElementById('fs-select'),
        comp1Freq: document.getElementById('comp1-freq'),
        comp1Amp: document.getElementById('comp1-amp'),
        comp2Freq: document.getElementById('comp2-freq'),
        comp2Amp: document.getElementById('comp2-amp'),
        noiseLevel: document.getElementById('noise-level'),
        
        comp1FreqDisplay: document.getElementById('comp1-freq-display'),
        comp1AmpDisplay: document.getElementById('comp1-amp-display'),
        comp2FreqDisplay: document.getElementById('comp2-freq-display'),
        comp2AmpDisplay: document.getElementById('comp2-amp-display'),
        noiseDisplay: document.getElementById('noise-display'),
        
        timeCanvas: document.getElementById('time-domain-canvas'),
        freqCanvas: document.getElementById('freq-domain-canvas')
    };

    // --- 4. Helper Functions ---

    /**
     * Generates a random number from a standard normal distribution (Box-Muller transform).
     * Used for adding Gaussian noise.
     */
    let spareRandom = null;
    function gaussianRandom() {
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
    }

    // --- 5. Core FFT and Signal Generation Logic ---

    // Complex number helpers
    const addComplex = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
    const subtractComplex = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
    const multiplyComplex = (a, b) => ({
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    });
    const magnitudeComplex = (a) => Math.sqrt(a.re * a.re + a.im * a.im);

    /**
     * Implements the Cooley-Tukey Radix-2 FFT algorithm.
     * Assumes `signal` is an array of real numbers and its length is a power of 2.
     * @param {number[]} signal - Array of real-valued signal samples.
     * @returns {object[]} Array of complex numbers {re, im}.
     */
    function fft(signal) {
        const N = signal.length;

        // Convert real signal to complex signal
        let complexSignal = signal.map(val => ({ re: val, im: 0 }));

        function fftRecursive(sig) {
            const n = sig.length;
            if (n === 1) {
                return [sig[0]];
            }

            const even = [];
            const odd = [];
            for (let i = 0; i < n; i++) {
                if (i % 2 === 0) {
                    even.push(sig[i]);
                } else {
                    odd.push(sig[i]);
                }
            }

            const fftEven = fftRecursive(even);
            const fftOdd = fftRecursive(odd);

            const result = new Array(n);
            for (let k = 0; k < n / 2; k++) {
                const angle = -2 * Math.PI * k / n;
                const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };
                const term = multiplyComplex(twiddle, fftOdd[k]);

                result[k] = addComplex(fftEven[k], term);
                result[k + n / 2] = subtractComplex(fftEven[k], term);
            }
            return result;
        }

        return fftRecursive(complexSignal);
    }

    /**
     * Generates the signal and computes its FFT based on current control values.
     */
    function computeSignalAndFFT() {
        // Get parameters from controls
        const fs = parseInt(elements.fsSelect.value);
        const f1 = parseFloat(elements.comp1Freq.value);
        const a1 = parseFloat(elements.comp1Amp.value);
        const f2 = parseFloat(elements.comp2Freq.value);
        const a2 = parseFloat(elements.comp2Amp.value);
        const noiseAmp = parseFloat(elements.noiseLevel.value);

        const n = fs; // Number of samples (1 second duration)
        const time = [];
        const signal = [];

        // Generate time vector and signal
        for (let i = 0; i < n; i++) {
            const t = i / fs;
            time.push(t);

            const val1 = a1 * Math.sin(2 * Math.PI * f1 * t);
            const val2 = a2 * Math.sin(2 * Math.PI * f2 * t);
            const noise = noiseAmp * gaussianRandom();
            
            signal.push(val1 + val2 + noise);
        }

        // Compute FFT
        const fftResult = fft(signal);
        
        // Get magnitude (and scale by N, then multiply by 2 for single-sided spectrum)
        const fftMag = fftResult.map(c => magnitudeComplex(c) / n);
        
        // Only need positive frequencies (first half of array)
        const n_half = Math.floor(n / 2);
        const positiveMag = fftMag.slice(0, n_half);
        
        // Double the amplitude for all except DC (0 Hz) and Nyquist
        for (let i = 1; i < n_half; i++) {
            positiveMag[i] *= 2;
        }

        // Generate frequency axis
        const frequencies = [];
        for (let i = 0; i < n_half; i++) {
            frequencies.push(i * fs / n);
        }

        return { time, signal, frequencies, positiveMag, fs };
    }

    // --- 6. Drawing Functions ---

    /**
     * Draws axes on a canvas.
     */
    function drawAxes(ctx, w, h, xLabel = 'X', yLabel = 'Y') {
        const pad = 30;
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#333';

        // Y Axis
        ctx.beginPath();
        ctx.moveTo(pad, pad / 2);
        ctx.lineTo(pad, h - pad);
        ctx.stroke();

        // X Axis
        ctx.beginPath();
        ctx.moveTo(pad, h - pad);
        ctx.lineTo(w - pad / 2, h - pad);
        ctx.stroke();

        // Labels
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, w / 2, h - pad / 4);
        
        ctx.translate(pad / 2, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }

    /**
     * Draws the time-domain signal.
     */
    function drawTimeDomain(canvas, time, signal) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const pad = 30;

        ctx.clearRect(0, 0, w, h);
        drawAxes(ctx, w, h, '', 'Amplitude');

        // Find data bounds
        let maxAmp = -Infinity;
        for (const s of signal) {
            maxAmp = Math.max(maxAmp, Math.abs(s));
        }
        maxAmp = Math.max(maxAmp, 1.0); // Ensure at least +/- 1 range
        
        const totalTime = time[time.length - 1];
        
        // Only draw first N samples to avoid crowding
        const N_TO_DRAW = Math.min(signal.length, 200);

        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < N_TO_DRAW; i++) {
            // Scale data to canvas coordinates
            const x = pad + (time[i] / time[N_TO_DRAW-1]) * (w - pad * 1.5);
            const y = (h / 2) - (signal[i] / maxAmp) * (h / 2 - pad / 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    /**
     * Draws the frequency-domain spectrum.
     */
    function drawFreqDomain(canvas, frequencies, fftMagnitude, fs) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const pad = 30;

        ctx.clearRect(0, 0, w, h);
        drawAxes(ctx, w, h, '', 'Magnitude');

        // Find data bounds
        let maxMag = -Infinity;
        for (const m of fftMagnitude) {
            maxMag = Math.max(maxMag, m);
        }
        maxMag = Math.max(maxMag, 0.5); // Min peak height
        
        const maxFreq = fs / 2;

        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, h - pad); // Start at (0, 0)

        for (let i = 0; i < frequencies.length; i++) {
            // Scale data to canvas coordinates
            const x = pad + (frequencies[i] / maxFreq) * (w - pad * 1.5);
            const y = (h - pad) - (fftMagnitude[i] / maxMag) * (h - pad * 1.5);
            
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // --- 7. Main Update and Event Handlers ---

    /**
     * Main function to update the visualization
     */
    function updateVisualization() {
        // 1. Generate new data
        const { time, signal, frequencies, positiveMag, fs } = computeSignalAndFFT();
        
        // 2. Draw Time Domain
        drawTimeDomain(elements.timeCanvas, time, signal);
        
        // 3. Draw Frequency Domain
        drawFreqDomain(elements.freqCanvas, frequencies, positiveMag, fs);
    }

    /**
     * Handles changes from any control
     */
    function handleParameterChange() {
        // Update display labels
        elements.comp1FreqDisplay.textContent = `${elements.comp1Freq.value} Hz`;
        elements.comp1AmpDisplay.textContent = `${parseFloat(elements.comp1Amp.value).toFixed(2)}`;
        elements.comp2FreqDisplay.textContent = `${elements.comp2Freq.value} Hz`;
        elements.comp2AmpDisplay.textContent = `${parseFloat(elements.comp2Amp.value).toFixed(2)}`;
        elements.noiseDisplay.textContent = `${parseFloat(elements.noiseLevel.value).toFixed(2)}`;

        // Adjust max frequency for Freq 1 and Freq 2 sliders
        // Max freq should be Nyquist (fs / 2)
        const fs = parseInt(elements.fsSelect.value);
        const nyquist = Math.floor(fs / 2);
        elements.comp1Freq.max = nyquist - 1;
        elements.comp2Freq.max = nyquist - 1;

        // Trigger redraw
        updateVisualization();
    }

    // --- 8. Add Event Listeners ---
    [
        elements.fsSelect,
        elements.comp1Freq,
        elements.comp1Amp,
        elements.comp2Freq,
        elements.comp2Amp,
        elements.noiseLevel
    ].forEach(el => {
        const eventType = (el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(eventType, handleParameterChange);
    });

    // --- 9. Initial Call ---
    handleParameterChange(); // Initial draw on load
});