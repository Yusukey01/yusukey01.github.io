document.addEventListener("DOMContentLoaded", fetchPages);

let searchIndex;
let documents = [];

// Fetch the search index from the JSON file
async function fetchPages() {
    try {
        let response = await fetch("search-index.json");
        documents = await response.json();
        console.log("✅ Loaded search index:", documents);
        buildSearchIndex();
    } catch (error) {
        console.error("❌ Failed to load search index:", error);
    }
}

// Build Lunr.js search index
function buildSearchIndex() {
    searchIndex = lunr(function () {
        this.ref("id");
        this.field("text");

        documents.forEach((doc) => this.add(doc));
    });
}

// Search function triggered on typing in the search box
function searchFunction() {
    let query = document.getElementById("search-box").value.trim();
    let results = document.getElementById("search-results");
    results.innerHTML = "";

    if (query.length > 0 && searchIndex) {
        let matches = searchIndex.search(query);
        console.log("🔍 Search Query:", query);
        console.log("🔍 Matches Found:", matches);

        if (matches.length === 0) {
            results.innerHTML = "<li>No results found.</li>";
        }

        matches.forEach((match) => {
            let doc = documents.find((d) => d.id === match.ref);
            let li = document.createElement("li");
            li.innerHTML = `<a href="${doc.url}">${doc.url} - ${doc.text.substring(0, 100)}...</a>`;
            results.appendChild(li);
        });
    }
}