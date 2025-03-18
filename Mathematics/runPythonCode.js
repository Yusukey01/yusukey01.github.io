let pyodide;

// Lazy load Pyodide and only the required packages on demand
async function loadPyodideAndPackages() {
    if (pyodide) return; // Avoid reloading if Pyodide is already loaded

    // Load Pyodide with the index URL for the required version
    pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.3/full/"
    });

    // Dynamically load numpy package only when needed
    await pyodide.loadPackage("numpy");
    console.log("Pyodide and numpy loaded successfully.");
}

// Run Python code and capture output dynamically
async function runPythonCode(button) {
     // Find the closest container that holds the code and output.
     const container = button.closest('.code-container');
     const pythonCode = container.querySelector('.python-code').textContent;
     const outputContainer = container.querySelector('.python-output');
     outputContainer.innerHTML = ""; // Clear previous output
    try {
        await loadPyodideAndPackages();  // Ensure Pyodide and numpy are loaded before running Python code

        let capturedOutput = [];
        // Override print function to capture output
        pyodide.globals.set("print", function(...args) {
            capturedOutput.push(args.join(" "));
        });

        // Run the Python code
        await pyodide.runPythonAsync(pythonCode);

        // Display captured output
        outputContainer.textContent = capturedOutput.join("\n");
    } catch (error) {
        // Display error if execution fails
        outputContainer.textContent = `Error: ${error.message}`;
        console.error("Execution error:", error);
    }
}

// Event listener to run Python code when needed (example: button click)
document.getElementById('run-python-button').addEventListener('click', runPythonCode);

