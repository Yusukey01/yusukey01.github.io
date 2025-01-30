let pyodide;

async function loadPyodideAndPackages() { 
    pyodide = await loadPyodide(); 
    await pyodide.loadPackage("numpy");
    console.log("Pyodide and numpy loaded successfully."); 
} 

async function runPythonCode() { 
    const pythonCode = document.querySelector('.python-code').textContent; 
    const outputContainer = document.getElementById('output'); 
    outputContainer.innerHTML = ""; 
    try { 
        let capturedOutput = []; 
        pyodide.globals.set("print", function(...args) { 
            capturedOutput.push(args.join(" ")); 
        }); 
        await pyodide.runPythonAsync(pythonCode); 
        outputContainer.textContent = capturedOutput.join("\n"); 
    } catch (error) { 
        outputContainer.textContent = `Error: ${error.message}`; 
        console.error("Execution error:", error); } 
    } 
    
loadPyodideAndPackages(); 
