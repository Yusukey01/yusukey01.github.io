/**
 * MATH-CS COMPASS: Section Card Generator
 * @author Yusuke Yokota
 * @version 1.0.0
 * 
 * Generates topic cards dynamically from centralized curriculum.json data.
 * This ensures consistency between section pages and the compass map.
 * 
 * Usage:
 *   1. Include this script in your section page
 *   2. Add a container with id="topic-cards-container"
 *   3. Call: SectionCards.init('I') where 'I' is the section number
 */

const SectionCards = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        dataPath: '/data/curriculum.json',
        maxKeywords: 4 // Maximum keywords to display per card
    };

    let curriculumData = null;

    /**
     * Fetch and cache the curriculum data
     */
    async function loadData() {
        if (curriculumData) return curriculumData;
        
        try {
            const response = await fetch(CONFIG.dataPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            curriculumData = await response.json();
            return curriculumData;
        } catch (error) {
            console.error('Failed to load curriculum data:', error);
            return null;
        }
    }

    /**
     * Create a single card element
     * @param {Object} part - The part data from curriculum.json
     * @param {string} baseUrl - The base URL for this section
     * @returns {HTMLElement} The card element
     */
    function createCard(part, baseUrl) {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-part-id', part.id);

        // Card icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'card-icon';
        iconDiv.textContent = part.icon;
        card.appendChild(iconDiv);

        // Card title with link
        const titleH3 = document.createElement('h3');
        const titleLink = document.createElement('a');
        titleLink.href = part.url;
        titleLink.textContent = `Part ${part.part}: ${part.title}`;
        titleH3.appendChild(titleLink);
        card.appendChild(titleH3);

        // Keywords (limited to maxKeywords)
        if (part.keywords && part.keywords.length > 0) {
            const keywordsDiv = document.createElement('div');
            keywordsDiv.className = 'keywords';
            
            // Add badges as the first keywords (matching original style)
            if (part.badges && part.badges.length > 0) {
                part.badges.forEach(badge => {
                    const badgeSpan = document.createElement('span');
                    const strong = document.createElement('strong');
                    if (badge === 'code') {
                        strong.textContent = 'Code Included';
                    } else if (badge === 'interactive') {
                        strong.textContent = 'Interactive Demo';
                    }
                    badgeSpan.appendChild(strong);
                    keywordsDiv.appendChild(badgeSpan);
                });
            }
            
            const displayKeywords = part.keywords.slice(0, CONFIG.maxKeywords);
            const remainingCount = part.keywords.length - CONFIG.maxKeywords;
            
            displayKeywords.forEach(keyword => {
                const span = document.createElement('span');
                span.textContent = keyword;
                keywordsDiv.appendChild(span);
            });

            // Show "+N more" if there are more keywords
            if (remainingCount > 0) {
                const moreSpan = document.createElement('span');
                moreSpan.className = 'keywords-more';
                moreSpan.textContent = `+${remainingCount} more`;
                moreSpan.title = part.keywords.slice(CONFIG.maxKeywords).join(', ');
                keywordsDiv.appendChild(moreSpan);
            }
            
            card.appendChild(keywordsDiv);
        }

        return card;
    }

    /**
     * Render all cards for a section
     * @param {string} sectionId - The section identifier (I, II, III, IV, V)
     * @param {string} containerId - The container element ID (default: 'topic-cards-container')
     */
    async function renderSection(sectionId, containerId = 'topic-cards-container') {
        const data = await loadData();
        if (!data) {
            console.error('Could not load curriculum data');
            return;
        }

        const section = data.sections[sectionId];
        if (!section) {
            console.error(`Section "${sectionId}" not found`);
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container "#${containerId}" not found`);
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create cards container
        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'topic-cards';

        // Generate cards for each part
        section.parts.forEach(part => {
            const card = createCard(part, section.baseUrl);
            cardsDiv.appendChild(card);
        });

        container.appendChild(cardsDiv);
    }

    /**
     * Get section data (for use in other scripts)
     * @param {string} sectionId - The section identifier
     * @returns {Object|null} Section data or null
     */
    async function getSectionData(sectionId) {
        const data = await loadData();
        return data?.sections[sectionId] || null;
    }

    /**
     * Get all parts across all sections (for compass map)
     * @returns {Array} Array of all parts with section info
     */
    async function getAllParts() {
        const data = await loadData();
        if (!data) return [];

        const allParts = [];
        
        // Add home node
        if (data.homeNode) {
            allParts.push({
                ...data.homeNode,
                section: 'HOME'
            });
        }

        // Add all parts from all sections
        Object.entries(data.sections).forEach(([sectionId, section]) => {
            section.parts.forEach(part => {
                allParts.push({
                    ...part,
                    section: sectionId,
                    fullUrl: section.baseUrl + part.url
                });
            });
        });

        return allParts;
    }

    /**
     * Get the curriculum data (for compass map)
     * @returns {Object|null} Full curriculum data
     */
    async function getCurriculumData() {
        return await loadData();
    }

    /**
     * Initialize the section cards
     * @param {string} sectionId - The section identifier (I, II, III, IV, V)
     * @param {Object} options - Optional configuration overrides
     */
    function init(sectionId, options = {}) {
        // Merge options
        Object.assign(CONFIG, options);

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                renderSection(sectionId, options.containerId);
            });
        } else {
            renderSection(sectionId, options.containerId);
        }
    }

    // Public API
    return {
        init,
        renderSection,
        getSectionData,
        getAllParts,
        getCurriculumData,
        loadData
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SectionCards;
}