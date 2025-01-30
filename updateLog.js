<script> 
        document.addEventListener("DOMContentLoaded", function () {
            const updateLog = document.getElementById("update-log");
        
            fetch("updates.json") // Load the update logs from an external file
                .then(response => response.json())
                .then(updates => {
                    // Display updates in the scrollable log
                    updates.forEach(update => {
                        let updateItem = document.createElement("p");
                        updateItem.innerHTML = `<strong>Update (${update.date}):</strong> ${update.content}`;
                        updateLog.appendChild(updateItem);
                    });
                })
                .catch(error => console.error("Error loading updates:", error));
        });
        </script>