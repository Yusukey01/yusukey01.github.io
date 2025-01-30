document.addEventListener("DOMContentLoaded", function () {
    const updateLog = document.getElementById("update-log");

    fetch("updates.json") // Load the update logs from an external file
        .then(response => response.json())
        .then(updates => {
            // Group updates by date
            const groupedUpdates = updates.reduce((acc, update) => {
                const date = update.date;
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(update);
                return acc;
            }, {});

            // Sort the dates
            const sortedDates = Object.keys(groupedUpdates).sort((a, b) => new Date(b) - new Date(a));

            // Create an HTML structure for each date group
            sortedDates.forEach(date => {
                const dateHeading = document.createElement("h4");
                dateHeading.textContent = `Updates on ${date}`;
                updateLog.appendChild(dateHeading);

                groupedUpdates[date].forEach(update => {
                    let updateItem = document.createElement("p");
                    updateItem.innerHTML = `<strong>${update.content}</strong>`;
                    updateLog.appendChild(updateItem);
                });
            });
        })
        .catch(error => console.error("Error loading updates:", error));
});
