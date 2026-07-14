/**
 * MATH-CS COMPASS: Section Card Generator
 * @author Yusuke Yokota
 * @version 2.0.0
 *
 * Generates topic cards dynamically from centralized curriculum.json data.
 * This ensures consistency between section pages and the compass map.
 *
 * v2.0.0 — compact grouped redesign:
 *  - Cards are grouped under topicGroup headings (titles come from
 *    curriculum.json "topicGroupTitles"; Title Case fallback for
 *    unknown slugs).
 *  - The WHOLE card is a link (previously only the title was clickable).
 *  - Keywords render as one muted, comma-separated line (CSS-clamped);
 *    the "+N more" tooltip interaction is gone — it conflicted with the
 *    card-level link and hid information behind a hover.
 *  - Each card carries id="{part.id}" so section pages support deep
 *    links like linear_algebra.html#linalg-7.
 *  - Badges render as compact pills (Demo / Code).
 *  - Section accent color is exposed as --tcard-accent on the container
 *    (value from curriculum.json sectionColors).
 *
 * Markup produced (new class names — the legacy .card styles used on the
 * homepage are untouched):
 *   <div class="tcard-group">
 *     <h3 class="tcard-group-title"><span class="tcard-group-dot"></span>
 *         Group Name <span class="tcard-group-count">(N)</span></h3>
 *     <div class="tcard-grid">
 *       <a class="tcard" href="..." id="linalg-7">
 *         <div class="tcard-top">
 *           <span class="tcard-icon">∇</span>
 *           <span class="tcard-num">Part 7</span>
 *           <span class="tcard-badge">Demo</span>
 *         </div>
 *         <h4 class="tcard-title">Orthogonality</h4>
 *         <p class="tcard-keywords">Inner product, Orthogonality, ...</p>
 *       </a>
 *       ...
 *     </div>
 *   </div>
 */

const SectionCards = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        dataPath: '/data/curriculum.json'
    };

    const BADGE_LABELS = {
        'interactive': 'Demo',
        'code': 'Code'
    };

    let curriculumData = null;

    /**
     * Derive the display part-number from a topic id (e.g. "linalg-7" -> 7).
     * The id suffix is the single source of truth; the old `part` field is
     * redundant and being phased out.
     */
    function partNumberFromId(id) {
        const m = /(\d+)$/.exec(id || '');
        return m ? m[1] : '';
    }

    /**
     * Display title for a topicGroup slug: curriculum.json
     * "topicGroupTitles" first, Title Case fallback.
     */
    function groupTitle(slug, data) {
        const map = (data && data.topicGroupTitles) || {};
        if (map[slug]) return map[slug];
        if (!slug) return 'Other';
        return slug.split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    /**
     * Fetch and cache the curriculum data
     */
    async function loadData() {
        if (curriculumData) return curriculumData;

        try {
            const response = await fetch(CONFIG.dataPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            curriculumData = await response.json();
            console.log('SectionCards: Curriculum data loaded successfully');
            return curriculumData;
        } catch (error) {
            console.error('SectionCards: Failed to load curriculum data:', error);
            return null;
        }
    }

    /**
     * Create a single card element (an <a> — the whole card is the link).
     */
    function createCard(part) {
        const card = document.createElement('a');
        card.className = 'tcard';
        card.href = part.url;
        if (part.id) {
            card.id = part.id;                 // deep-link anchor
            card.setAttribute('data-part-id', part.id);
        }

        // Top row: icon + part number + badges
        const top = document.createElement('div');
        top.className = 'tcard-top';

        const icon = document.createElement('span');
        icon.className = 'tcard-icon';
        icon.textContent = part.icon || '';
        top.appendChild(icon);

        const num = document.createElement('span');
        num.className = 'tcard-num';
        num.textContent = 'Part ' + partNumberFromId(part.id);
        top.appendChild(num);

        (part.badges || []).forEach(badge => {
            const b = document.createElement('span');
            b.className = `tcard-badge tcard-badge-${badge}`;
            b.textContent = BADGE_LABELS[badge] || badge;
            top.appendChild(b);
        });

        card.appendChild(top);

        // Title
        const title = document.createElement('h4');
        title.className = 'tcard-title';
        title.textContent = part.title || part.id;
        card.appendChild(title);

        // Keywords: full list, one muted line, clamped by CSS
        if (part.keywords && part.keywords.length > 0) {
            const kw = document.createElement('p');
            kw.className = 'tcard-keywords';
            kw.textContent = part.keywords.join(', ');
            kw.title = part.keywords.join(', ');   // full list on hover
            card.appendChild(kw);
        }

        return card;
    }

    /**
     * Render all cards for a section, grouped by topicGroup
     * @param {string} sectionId - The section identifier (I, II, III, IV, V)
     * @param {string} containerId - The container element ID (default: 'topic-cards-container')
     */
    async function renderSection(sectionId, containerId = 'topic-cards-container') {
        const data = await loadData();
        if (!data) {
            console.error('SectionCards: Could not load curriculum data');
            return;
        }

        const section = data.sections[sectionId];
        if (!section) {
            console.error(`SectionCards: Section "${sectionId}" not found in curriculum data`);
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`SectionCards: Container "#${containerId}" not found in DOM`);
            return;
        }

        // Section accent color for hover glows etc.
        const accent = (data.sectionColors && data.sectionColors[sectionId]) || '#3498db';
        container.style.setProperty('--tcard-accent', accent);

        // Clear existing content
        container.innerHTML = '';

        // Group parts by topicGroup in curriculum (first-appearance) order
        const order = [];
        const byGroup = {};
        section.parts.forEach(part => {
            const g = part.topicGroup || 'other';
            if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
            byGroup[g].push(part);
        });

        order.forEach(g => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'tcard-group';

            const h = document.createElement('h3');
            h.className = 'tcard-group-title';
            const dot = document.createElement('span');
            dot.className = 'tcard-group-dot';
            h.appendChild(dot);
            h.appendChild(document.createTextNode(groupTitle(g, data) + ' '));
            const count = document.createElement('span');
            count.className = 'tcard-group-count';
            count.textContent = '(' + byGroup[g].length + ')';
            h.appendChild(count);
            groupDiv.appendChild(h);

            const grid = document.createElement('div');
            grid.className = 'tcard-grid';
            byGroup[g].forEach(part => grid.appendChild(createCard(part)));
            groupDiv.appendChild(grid);

            container.appendChild(groupDiv);
        });

        console.log(`SectionCards: Rendered ${section.parts.length} cards in ${order.length} groups for Section ${sectionId}`);

        // If the URL carries a deep link to a part id, scroll to it.
        if (location.hash) {
            const target = document.getElementById(location.hash.slice(1));
            if (target && target.classList.contains('tcard')) {
                target.scrollIntoView({ block: 'center' });
                target.classList.add('tcard-highlight');
            }
        }
    }

    /**
     * Get section data (for use in other scripts)
     */
    async function getSectionData(sectionId) {
        const data = await loadData();
        return data?.sections[sectionId] || null;
    }

    /**
     * Get all parts across all sections (for compass map)
     */
    async function getAllParts() {
        const data = await loadData();
        if (!data) return [];

        const allParts = [];

        if (data.homeNode) {
            allParts.push({ ...data.homeNode, section: 'HOME' });
        }

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
     */
    async function getCurriculumData() {
        return await loadData();
    }

    /**
     * Initialize the section cards
     */
    function init(sectionId, options = {}) {
        Object.assign(CONFIG, options);

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