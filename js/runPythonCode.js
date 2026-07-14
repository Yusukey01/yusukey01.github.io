let pyodide;
let pyodideReadyPromise = null;

// Lazy load Pyodide and only the required packages on demand.
// The ready-promise is memoized so concurrent clicks share ONE load —
// the previous `if (pyodide) return` guard only worked after the await
// completed, so two quick clicks started two full Pyodide downloads.
function loadPyodideAndPackages() {
    if (!pyodideReadyPromise) {
        pyodideReadyPromise = (async () => {
            const py = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.3/full/"
            });
            await py.loadPackage("numpy");
            pyodide = py;
            console.log("Pyodide and numpy loaded successfully.");
        })().catch(err => {
            pyodideReadyPromise = null;  // allow retry after a failed load
            throw err;
        });
    }
    return pyodideReadyPromise;
}

// Run Python code and capture output dynamically
async function runPythonCode(button) {
    // Find the closest container that holds the code and output.
    const container = button.closest('.code-container');
    const pythonCode = container.querySelector('.python-code').textContent;
    const outputContainer = container.querySelector('.python-output');

    // Guard against concurrent runs from the same button and give the
    // user feedback during the (multi-second) first-time runtime load.
    if (button.disabled) return;
    button.disabled = true;
    outputContainer.textContent = pyodide
        ? "Running..."
        : "Loading Python runtime (first run only)...";

    try {
        await loadPyodideAndPackages();

        let capturedOutput = [];
        if (typeof pyodide.setStdout === 'function') {
            // Capture real stdout/stderr (handles print(..., sep=, end=),
            // sys.stdout.write, and library output).
            pyodide.setStdout({ batched: line => capturedOutput.push(line) });
            pyodide.setStderr({ batched: line => capturedOutput.push(line) });
        } else {
            // Fallback for older Pyodide: override print
            pyodide.globals.set("print", function(...args) {
                capturedOutput.push(args.join(" "));
            });
        }

        // Run the Python code
        await pyodide.runPythonAsync(pythonCode);

        // Display captured output
        outputContainer.textContent = capturedOutput.join("\n");
    } catch (error) {
        // Display error if execution fails
        outputContainer.textContent = `Error: ${error.message}`;
        console.error("Execution error:", error);
    } finally {
        button.disabled = false;
    }
}

// Event listener to run Python code when needed (example: button click)
//document.getElementById('run-python-button').addEventListener('click', runPythonCode);