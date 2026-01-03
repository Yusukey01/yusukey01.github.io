document.addEventListener("DOMContentLoaded", function () {
    const updateLog = document.getElementById("update-log");

    // Fetch update logs from the JSON file
    fetch("updates.json") 
        .then(response => response.json())
        .then(updates => {
            // Group updates by their date property
            const groupedUpdates = updates.reduce((acc, update) => {
                const date = update.date;
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(update);
                return acc;
            }, {});

            // Sort dates in descending order (newest first)
            const sortedDates = Object.keys(groupedUpdates).sort((a, b) => new Date(b) - new Date(a));

            // Create HTML structure for each date group
            sortedDates.forEach(date => {
                const dateHeading = document.createElement("h4");
                dateHeading.textContent = `${date}:`;
                updateLog.appendChild(dateHeading);

                groupedUpdates[date].forEach(update => {
                    let updateItem = document.createElement("p");
                    
                    // Check if a URL is provided in the JSON
                    // If URL exists, wrap content in an <a> tag; otherwise, use bold text
                    const contentHtml = update.url 
                        ? `<a href="${update.url}" class="log-link"><strong>${update.content}</strong></a>` 
                        : `<strong>${update.content}</strong>`;
                    
                    updateItem.innerHTML = `&nbsp;&nbsp;&nbsp;${contentHtml}`;
                    updateLog.appendChild(updateItem);
                });
            });
        })
        .catch(error => console.error("Error loading updates:", error));
});