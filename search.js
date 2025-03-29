document.addEventListener("DOMContentLoaded", fetchPages);

const pagesToIndex = [
    "index.html",
    "basic.html",
    "random_variables.html",
    "gamma.html",
    "gaussian.html",
    "student.html",
    "covariance.html",
    "correlation.html",
    "mvn.html",
    "mle.html",
    "linear_regression.html",
    "entropy.html",
    "convergence.html",
    "bayesian.html",
    "expfamily.html",
    "fisher_info.html",
    "decision_theory.html",
    "markov.html",
]; 

let searchIndex;
let documents = [];

async function fetchPages() {
    let pagePromises = pagesToIndex.map(async (page) => {
        try {
            let response = await fetch(page);
            let text = await response.text();
            let tempElement = document.createElement("div");
            tempElement.innerHTML = text;

            // Extract main content (modify selector if needed)
            let content = tempElement.querySelector("main") || tempElement.body;
            let textContent = content.innerText;

            return { id: page, text: textContent, url: page };
        } catch (error) {
            console.error(`Failed to fetch ${page}:`, error);
            return null;
        }
    });

    documents = (await Promise.all(pagePromises)).filter(doc => doc !== null);
    buildSearchIndex();
}

function buildSearchIndex() {
    searchIndex = lunr(function () {
        this.ref("id");
        this.field("text");

        documents.forEach((doc) => this.add(doc));
    });
}

function searchFunction() {
    let query = document.getElementById("search-box").value.trim();
    let results = document.getElementById("search-results");
    results.innerHTML = "";

    if (query.length > 0 && searchIndex) {
        let matches = searchIndex.search(query);
        matches.forEach((match) => {
            let doc = documents.find((d) => d.id === match.ref);
            let li = document.createElement("li");
            li.innerHTML = `<a href="${doc.url}">${doc.url} - ${doc.text.substring(0, 100)}...</a>`;
            results.appendChild(li);
        });
    }
}
