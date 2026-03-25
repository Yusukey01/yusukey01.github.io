// sec4_p12_graph_coloring.js
// Interactive Planar Graph Coloring Demo — MATH-CS COMPASS Section IV
// Presets: K₄, Icosahedron, Petersen graph
// Features: vertex coloring, conflict detection, Kempe chain visualization,
//           Euler formula stats, success detection

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('graph-coloring-demo');
    if (!container) return;

    // ================================================================
    // MODULE 1: GRAPH DATA
    // ================================================================

    // Each graph: { name, vertices: [{x,y}], edges: [[i,j]], faces: number|null, planar: bool, chi: number|null, chromatic: number }
    // Coordinates normalized to [0, 1] range, mapped to canvas later

    function makeK4() {
        const cx = 0.5, cy = 0.5, R = 0.35;
        const verts = [];
        for (let i = 0; i < 3; i++) {
            const a = -Math.PI/2 + (2*Math.PI*i)/3;
            verts.push({ x: cx + R*Math.cos(a), y: cy + R*Math.sin(a) });
        }
        verts.push({ x: cx, y: cy }); // center vertex
        const edges = [[0,1],[1,2],[2,0],[0,3],[1,3],[2,3]];
        return {
            name: 'K₄  (Complete Graph)',
            vertices: verts,
            edges: edges,
            faces: 4,
            planar: true,
            chromatic: 4,
            description: 'The smallest complete graph requiring 4 colors.'
        };
    }

    function makeIcosahedron() {
        // Icosahedron skeleton: 12 vertices, 30 edges, 20 faces, χ(G)=4
        // Use a planar-ish layout: top vertex, ring of 5, ring of 5, bottom vertex
        const verts = [];
        const cx = 0.5, cy = 0.5;
        // Top vertex
        verts.push({ x: cx, y: 0.06 });
        // Upper ring (5 vertices)
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI/2 + (2*Math.PI*i)/5;
            verts.push({ x: cx + 0.30*Math.cos(a), y: 0.28 + 0.14*Math.sin(a) });
        }
        // Lower ring (5 vertices)
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI/2 + Math.PI/5 + (2*Math.PI*i)/5;
            verts.push({ x: cx + 0.30*Math.cos(a), y: 0.62 + 0.14*Math.sin(a) });
        }
        // Bottom vertex
        verts.push({ x: cx, y: 0.94 });

        const edges = [
            // Top to upper ring
            [0,1],[0,2],[0,3],[0,4],[0,5],
            // Upper ring cycle
            [1,2],[2,3],[3,4],[4,5],[5,1],
            // Upper to lower ring (zigzag)
            [1,6],[2,6],[2,7],[3,7],[3,8],[4,8],[4,9],[5,9],[5,10],[1,10],
            // Lower ring cycle
            [6,7],[7,8],[8,9],[9,10],[10,6],
            // Lower ring to bottom
            [6,11],[7,11],[8,11],[9,11],[10,11]
        ];
        return {
            name: 'Icosahedron  (12 vertices)',
            vertices: verts,
            edges: edges,
            faces: 20,
            planar: true,
            chromatic: 4,
            description: 'Platonic solid skeleton. Planar, χ = 4. A real challenge with 4 colors!'
        };
    }

    function makePetersen() {
        // Petersen graph: 10 vertices, 15 edges, non-planar, χ(G)=3
        // Layout: outer pentagon + inner pentagram
        const verts = [];
        const cx = 0.5, cy = 0.5;
        // Outer ring
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI/2 + (2*Math.PI*i)/5;
            verts.push({ x: cx + 0.38*Math.cos(a), y: cy + 0.38*Math.sin(a) });
        }
        // Inner ring
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI/2 + (2*Math.PI*i)/5;
            verts.push({ x: cx + 0.18*Math.cos(a), y: cy + 0.18*Math.sin(a) });
        }
        const edges = [
            // Outer cycle
            [0,1],[1,2],[2,3],[3,4],[4,0],
            // Spokes
            [0,5],[1,6],[2,7],[3,8],[4,9],
            // Inner pentagram (skip-1 connections)
            [5,7],[7,9],[9,6],[6,8],[8,5]
        ];
        return {
            name: 'Petersen Graph  (non-planar)',
            vertices: verts,
            edges: edges,
            faces: null,
            planar: false,
            chromatic: 3,
            description: 'Non-planar (contains K₃,₃ subdivision). Euler\'s formula does not apply.'
        };
    }

    const PRESETS = [makeK4(), makeIcosahedron(), makePetersen()];
    const COLORS = [
        '#e53935', // red
        '#1e88e5', // blue
        '#43a047', // green
        '#ffb300', // amber
        '#8e24aa'  // purple (5th color)
    ];
    const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Amber', 'Purple'];
    const UNCOLORED = -1;

    // ================================================================
    // MODULE 6: UI SHELL (HTML + CSS)
    // ================================================================

    container.innerHTML = `
      <div class="gcv-container">
        <div class="gcv-layout">
          <div class="gcv-canvas-area">
            <div class="gcv-toolbar">
              <div class="gcv-preset-btns" id="gcv-preset-btns"></div>
            </div>
            <div class="gcv-canvas-wrapper" id="gcv-canvas-wrapper">
              <canvas id="gcv-canvas" width="600" height="600"></canvas>
            </div>
            <div class="gcv-palette" id="gcv-palette"></div>
            <div class="gcv-instruction" id="gcv-instruction">
              Select a graph above, then click vertices to assign colors.
            </div>
          </div>
          <div class="gcv-panel">
            <div class="gcv-card">
              <div class="gcv-card-title">Graph Properties</div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">Graph</span><span class="gcv-stat-val" id="gcv-name">—</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">V (vertices)</span><span class="gcv-stat-val" id="gcv-V">—</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">E (edges)</span><span class="gcv-stat-val" id="gcv-E">—</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">F (faces)</span><span class="gcv-stat-val" id="gcv-F">—</span></div>
              <div class="gcv-stat-row gcv-stat-highlight"><span class="gcv-stat-label">χ = V − E + F</span><span class="gcv-stat-val" id="gcv-chi">—</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">δ(G) (min deg)</span><span class="gcv-stat-val" id="gcv-delta">—</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">Planar</span><span class="gcv-stat-val" id="gcv-planar">—</span></div>
            </div>
            <div class="gcv-card">
              <div class="gcv-card-title">Coloring Status</div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">χ(G) (chromatic #)</span><span class="gcv-stat-val" id="gcv-chromatic">—</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">Colors used</span><span class="gcv-stat-val" id="gcv-used">0</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">Vertices colored</span><span class="gcv-stat-val" id="gcv-colored">0 / 0</span></div>
              <div class="gcv-stat-row"><span class="gcv-stat-label">Conflicts</span><span class="gcv-stat-val" id="gcv-conflicts">0</span></div>
              <div class="gcv-status" id="gcv-status"></div>
            </div>
            <div class="gcv-card">
              <div class="gcv-card-title">Kempe Chains</div>
              <div class="gcv-card-subtitle">Select two colors to highlight their Kempe chain components.</div>
              <div class="gcv-kempe-row" id="gcv-kempe-row"></div>
              <div class="gcv-kempe-info" id="gcv-kempe-info"></div>
            </div>
            <div class="gcv-btn-row">
              <button class="gcv-btn" id="gcv-clear-btn">↺ Clear Colors</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .gcv-container {
        margin: 12px 0 24px 0;
        font-family: 'Exo 2', 'Segoe UI', sans-serif;
        color: #e8eaed;
        -webkit-font-smoothing: antialiased;
      }
      .gcv-layout {
        display: flex; flex-direction: column; gap: 20px;
      }
      @media (min-width: 1000px) {
        .gcv-layout { flex-direction: row; }
        .gcv-canvas-area { flex: 1.2; order: 1; min-width: 0; }
        .gcv-panel { flex: 1; order: 2; max-width: 360px; }
      }
      .gcv-canvas-area {
        display: flex; flex-direction: column; align-items: center;
      }
      .gcv-toolbar {
        display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; justify-content: center;
      }
      .gcv-preset-btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
      .gcv-preset-btn {
        padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(171, 71, 188, 0.3);
        background: rgba(106, 27, 154, 0.15); color: #ce93d8; cursor: pointer;
        font-size: 0.78rem; font-family: inherit; transition: all 0.2s;
      }
      .gcv-preset-btn:hover { background: rgba(106, 27, 154, 0.35); border-color: rgba(171, 71, 188, 0.6); }
      .gcv-preset-btn.active {
        background: rgba(106, 27, 154, 0.5); border-color: #ab47bc; color: #f3e5f5;
        box-shadow: 0 0 12px rgba(171, 71, 188, 0.3);
      }
      .gcv-canvas-wrapper {
        position: relative; width: 100%; max-width: 600px;
      }
      #gcv-canvas {
        width: 100%; height: auto; border: 1px solid rgba(171, 71, 188, 0.15);
        border-radius: 8px; background: #0b0e14; cursor: pointer; display: block;
        touch-action: none;
      }
      .gcv-palette {
        display: flex; gap: 8px; margin-top: 10px; align-items: center;
      }
      .gcv-color-btn {
        width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.15);
        cursor: pointer; transition: all 0.2s; position: relative;
      }
      .gcv-color-btn:hover { transform: scale(1.15); }
      .gcv-color-btn.active {
        border-color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.4);
        transform: scale(1.15);
      }
      .gcv-color-btn.eraser {
        background: #0b0e14 !important;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; color: rgba(255,255,255,0.5);
      }
      .gcv-instruction {
        font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 8px; text-align: center;
      }
      .gcv-panel { display: flex; flex-direction: column; gap: 12px; }
      .gcv-card {
        background: rgba(15, 20, 30, 0.7); border: 1px solid rgba(171, 71, 188, 0.12);
        border-radius: 8px; padding: 14px 16px;
      }
      .gcv-card-title {
        font-size: 0.82rem; font-weight: 700; color: #ce93d8; letter-spacing: 0.04em;
        margin-bottom: 10px; text-transform: uppercase;
      }
      .gcv-card-subtitle {
        font-size: 0.72rem; color: rgba(255,255,255,0.35); margin: -6px 0 10px 0;
      }
      .gcv-stat-row {
        display: flex; justify-content: space-between; padding: 3px 0;
        font-size: 0.78rem; border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      .gcv-stat-label { color: rgba(255,255,255,0.55); }
      .gcv-stat-val { color: #e8eaed; font-weight: 600; font-variant-numeric: tabular-nums; }
      .gcv-stat-highlight {
        background: rgba(106, 27, 154, 0.12); border-radius: 4px; padding: 4px 6px;
        margin: 2px -6px; border: none;
      }
      .gcv-stat-highlight .gcv-stat-val { color: #ce93d8; }
      .gcv-status {
        margin-top: 8px; padding: 8px 10px; border-radius: 6px; font-size: 0.78rem;
        font-weight: 600; text-align: center; min-height: 20px; transition: all 0.3s;
      }
      .gcv-status.success {
        background: rgba(67, 160, 71, 0.15); border: 1px solid rgba(67, 160, 71, 0.4);
        color: #69f0ae;
      }
      .gcv-status.conflict {
        background: rgba(229, 57, 53, 0.1); border: 1px solid rgba(229, 57, 53, 0.3);
        color: #ef9a9a;
      }
      .gcv-status.info {
        background: rgba(106, 27, 154, 0.1); border: 1px solid rgba(171, 71, 188, 0.2);
        color: #ce93d8;
      }
      .gcv-kempe-row {
        display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;
      }
      .gcv-kempe-pair {
        display: flex; align-items: center; gap: 3px; padding: 4px 8px;
        border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer; font-size: 0.72rem; color: rgba(255,255,255,0.5);
        transition: all 0.2s;
      }
      .gcv-kempe-pair:hover { border-color: rgba(171, 71, 188, 0.4); }
      .gcv-kempe-pair.active {
        border-color: #ab47bc; background: rgba(106, 27, 154, 0.2); color: #e8eaed;
      }
      .gcv-kempe-dot {
        width: 10px; height: 10px; border-radius: 50%; display: inline-block;
      }
      .gcv-kempe-info { font-size: 0.72rem; color: rgba(255,255,255,0.4); }
      .gcv-btn-row { display: flex; gap: 8px; }
      .gcv-btn {
        flex: 1; padding: 8px 12px; border-radius: 6px;
        border: 1px solid rgba(171, 71, 188, 0.3); background: rgba(106, 27, 154, 0.15);
        color: #ce93d8; cursor: pointer; font-size: 0.78rem; font-family: inherit;
        transition: all 0.2s;
      }
      .gcv-btn:hover { background: rgba(106, 27, 154, 0.35); border-color: #ab47bc; }
    `;
    document.head.appendChild(styleEl);

    // ================================================================
    // MODULE 2: RENDERING
    // ================================================================

    const canvas = document.getElementById('gcv-canvas');
    const ctx = canvas.getContext('2d');
    let W = 600, H = 600;

    let currentGraph = null;
    let vertexColors = [];   // array of color indices (UNCOLORED = -1)
    let selectedColor = 0;   // index into COLORS
    let hoveredVertex = -1;
    let kempeHighlight = null; // { colorA, colorB, components: [[vertexIndices], ...] } or null

    const VERTEX_RADIUS = 14;
    const VERTEX_RADIUS_LARGE = 16; // for K4

    function getR() {
        if (!currentGraph) return VERTEX_RADIUS;
        return currentGraph.vertices.length <= 6 ? VERTEX_RADIUS_LARGE : VERTEX_RADIUS;
    }

    function toCanvas(v) {
        const pad = 40;
        return { x: pad + v.x * (W - 2*pad), y: pad + v.y * (H - 2*pad) };
    }

    function getConflicts() {
        if (!currentGraph) return [];
        const conflicts = [];
        for (const [i, j] of currentGraph.edges) {
            if (vertexColors[i] !== UNCOLORED && vertexColors[j] !== UNCOLORED
                && vertexColors[i] === vertexColors[j]) {
                conflicts.push([i, j]);
            }
        }
        return conflicts;
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        if (!currentGraph) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '16px "Exo 2", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Select a graph above to begin.', W/2, H/2);
            return;
        }

        const g = currentGraph;
        const R = getR();
        const conflicts = getConflicts();
        const conflictSet = new Set(conflicts.map(([i,j]) => i + ',' + j));

        // Draw edges
        for (const [i, j] of g.edges) {
            const a = toCanvas(g.vertices[i]);
            const b = toCanvas(g.vertices[j]);
            const isConflict = conflictSet.has(i+','+j) || conflictSet.has(j+','+i);

            // Kempe chain highlight
            let isKempe = false;
            if (kempeHighlight) {
                const cA = kempeHighlight.colorA, cB = kempeHighlight.colorB;
                const ci = vertexColors[i], cj = vertexColors[j];
                if ((ci === cA || ci === cB) && (cj === cA || cj === cB)) {
                    // Check if i and j are in the same kempe component
                    for (const comp of kempeHighlight.components) {
                        if (comp.includes(i) && comp.includes(j)) { isKempe = true; break; }
                    }
                }
            }

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            if (isConflict) {
                ctx.strokeStyle = 'rgba(229, 57, 53, 0.8)';
                ctx.lineWidth = 3;
                ctx.shadowColor = 'rgba(229, 57, 53, 0.5)';
                ctx.shadowBlur = 8;
            } else if (isKempe) {
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
                ctx.shadowBlur = 6;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 0;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw vertices
        for (let i = 0; i < g.vertices.length; i++) {
            const p = toCanvas(g.vertices[i]);
            const c = vertexColors[i];
            const isHovered = (i === hoveredVertex);

            // Kempe dimming: if kempe is active, dim vertices not in kempe colors
            let dimmed = false;
            if (kempeHighlight) {
                const ci = vertexColors[i];
                if (ci !== kempeHighlight.colorA && ci !== kempeHighlight.colorB) {
                    dimmed = true;
                }
            }

            // Outer glow
            if (isHovered && !dimmed) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, R + 6, 0, Math.PI * 2);
                ctx.fillStyle = c !== UNCOLORED
                    ? COLORS[c].replace(')', ', 0.2)').replace('rgb', 'rgba')
                    : 'rgba(171, 71, 188, 0.15)';
                ctx.fill();
            }

            // Main circle
            ctx.beginPath();
            ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
            if (c !== UNCOLORED) {
                ctx.fillStyle = dimmed ? adjustAlpha(COLORS[c], 0.25) : COLORS[c];
            } else {
                ctx.fillStyle = dimmed ? 'rgba(30, 35, 50, 0.4)' : 'rgba(30, 35, 50, 0.9)';
            }
            ctx.fill();

            // Border
            ctx.strokeStyle = isHovered
                ? 'rgba(255,255,255,0.7)'
                : (c !== UNCOLORED ? 'rgba(255,255,255,0.25)' : 'rgba(171, 71, 188, 0.3)');
            ctx.lineWidth = isHovered ? 2 : 1.2;
            ctx.stroke();

            // Vertex label
            ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)';
            ctx.font = `${R < 15 ? 10 : 11}px "Exo 2", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(i, p.x, p.y);
        }
    }

    function adjustAlpha(hex, alpha) {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // ================================================================
    // MODULE 3: INTERACTION
    // ================================================================

    function hitVertex(cx, cy) {
        if (!currentGraph) return -1;
        const R = getR() + 4;
        for (let i = 0; i < currentGraph.vertices.length; i++) {
            const p = toCanvas(currentGraph.vertices[i]);
            const dx = cx - p.x, dy = cy - p.y;
            if (dx*dx + dy*dy < R*R) return i;
        }
        return -1;
    }

    function getEventPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { cx: (clientX - rect.left) * scaleX, cy: (clientY - rect.top) * scaleY };
    }

    canvas.addEventListener('mousemove', function(e) {
        const { cx, cy } = getEventPos(e);
        const prev = hoveredVertex;
        hoveredVertex = hitVertex(cx, cy);
        if (hoveredVertex !== prev) draw();
        canvas.style.cursor = hoveredVertex >= 0 ? 'pointer' : 'default';
    });

    canvas.addEventListener('mouseleave', function() {
        hoveredVertex = -1;
        draw();
    });

    canvas.addEventListener('click', function(e) {
        const { cx, cy } = getEventPos(e);
        const v = hitVertex(cx, cy);
        if (v < 0 || !currentGraph) return;

        if (selectedColor === UNCOLORED) {
            vertexColors[v] = UNCOLORED;
        } else {
            vertexColors[v] = selectedColor;
        }

        kempeHighlight = null; // clear kempe on color change
        updateKempePairs();
        draw();
        updatePanel();
    });

    // Touch support
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const { cx, cy } = getEventPos(e);
        const v = hitVertex(cx, cy);
        if (v < 0 || !currentGraph) return;
        if (selectedColor === UNCOLORED) {
            vertexColors[v] = UNCOLORED;
        } else {
            vertexColors[v] = selectedColor;
        }
        kempeHighlight = null;
        updateKempePairs();
        draw();
        updatePanel();
    }, { passive: false });

    // ================================================================
    // MODULE 4: INFO PANEL
    // ================================================================

    function updatePanel() {
        if (!currentGraph) return;
        const g = currentGraph;

        document.getElementById('gcv-name').textContent = g.name;
        document.getElementById('gcv-V').textContent = g.vertices.length;
        document.getElementById('gcv-E').textContent = g.edges.length;
        document.getElementById('gcv-F').textContent = g.faces !== null ? g.faces : '—';

        if (g.planar && g.faces !== null) {
            const chi = g.vertices.length - g.edges.length + g.faces;
            document.getElementById('gcv-chi').textContent = chi;
        } else {
            document.getElementById('gcv-chi').textContent = g.planar ? '—' : 'N/A (non-planar)';
        }

        // Min degree
        const deg = new Array(g.vertices.length).fill(0);
        for (const [i, j] of g.edges) { deg[i]++; deg[j]++; }
        document.getElementById('gcv-delta').textContent = Math.min(...deg);

        document.getElementById('gcv-planar').textContent = g.planar ? 'Yes' : 'No';
        document.getElementById('gcv-chromatic').textContent = g.chromatic;

        // Coloring stats
        const usedSet = new Set(vertexColors.filter(c => c !== UNCOLORED));
        const numColored = vertexColors.filter(c => c !== UNCOLORED).length;
        const conflicts = getConflicts();

        document.getElementById('gcv-used').textContent = usedSet.size;
        document.getElementById('gcv-colored').textContent = numColored + ' / ' + g.vertices.length;
        document.getElementById('gcv-conflicts').textContent = conflicts.length;

        // Status message
        const statusEl = document.getElementById('gcv-status');
        if (numColored === g.vertices.length && conflicts.length === 0) {
            const usedCount = usedSet.size;
            if (usedCount <= g.chromatic) {
                statusEl.className = 'gcv-status success';
                statusEl.textContent = usedCount === g.chromatic
                    ? '✓ Optimal! ' + usedCount + ' colors = χ(G)'
                    : '✓ Valid coloring with ' + usedCount + ' colors!';
            } else {
                statusEl.className = 'gcv-status success';
                statusEl.textContent = '✓ Valid coloring! Can you do it with fewer colors?';
            }
        } else if (conflicts.length > 0) {
            statusEl.className = 'gcv-status conflict';
            statusEl.textContent = '✗ ' + conflicts.length + ' conflict' + (conflicts.length > 1 ? 's' : '') + ' — adjacent vertices share a color.';
        } else if (numColored > 0) {
            statusEl.className = 'gcv-status info';
            statusEl.textContent = (g.vertices.length - numColored) + ' vertices remaining.';
        } else {
            statusEl.className = 'gcv-status';
            statusEl.textContent = '';
        }
    }

    // ================================================================
    // MODULE 5: KEMPE CHAIN VIEWER
    // ================================================================

    let kempeSelection = [null, null]; // two color indices

    function computeKempeChains(colorA, colorB) {
        if (!currentGraph) return [];
        const g = currentGraph;
        // Find vertices colored with colorA or colorB
        const relevant = [];
        for (let i = 0; i < g.vertices.length; i++) {
            if (vertexColors[i] === colorA || vertexColors[i] === colorB) {
                relevant.push(i);
            }
        }
        if (relevant.length === 0) return [];

        // Build adjacency among relevant vertices
        const adj = {};
        for (const v of relevant) adj[v] = [];
        for (const [i, j] of g.edges) {
            if (adj[i] !== undefined && adj[j] !== undefined) {
                adj[i].push(j);
                adj[j].push(i);
            }
        }

        // BFS to find connected components
        const visited = new Set();
        const components = [];
        for (const v of relevant) {
            if (visited.has(v)) continue;
            const comp = [];
            const queue = [v];
            visited.add(v);
            while (queue.length > 0) {
                const u = queue.shift();
                comp.push(u);
                for (const w of adj[u]) {
                    if (!visited.has(w)) {
                        visited.add(w);
                        queue.push(w);
                    }
                }
            }
            components.push(comp);
        }
        return components;
    }

    function buildKempePairs() {
        const row = document.getElementById('gcv-kempe-row');
        row.innerHTML = '';
        // Generate all pairs of colors that are actually used
        const used = [...new Set(vertexColors.filter(c => c !== UNCOLORED))].sort();
        if (used.length < 2) {
            document.getElementById('gcv-kempe-info').textContent = 'Need ≥ 2 colors assigned to see Kempe chains.';
            return;
        }
        document.getElementById('gcv-kempe-info').textContent = '';

        for (let a = 0; a < used.length; a++) {
            for (let b = a + 1; b < used.length; b++) {
                const cA = used[a], cB = used[b];
                const pair = document.createElement('div');
                pair.className = 'gcv-kempe-pair';
                pair.innerHTML = `<span class="gcv-kempe-dot" style="background:${COLORS[cA]}"></span>` +
                    `<span style="color:rgba(255,255,255,0.3)">–</span>` +
                    `<span class="gcv-kempe-dot" style="background:${COLORS[cB]}"></span>`;
                pair.addEventListener('click', function() {
                    // Toggle
                    if (kempeHighlight && kempeHighlight.colorA === cA && kempeHighlight.colorB === cB) {
                        kempeHighlight = null;
                        pair.classList.remove('active');
                    } else {
                        // Deactivate all
                        row.querySelectorAll('.gcv-kempe-pair').forEach(p => p.classList.remove('active'));
                        pair.classList.add('active');
                        const components = computeKempeChains(cA, cB);
                        kempeHighlight = { colorA: cA, colorB: cB, components };
                        const info = document.getElementById('gcv-kempe-info');
                        info.textContent = components.length + ' Kempe chain' + (components.length !== 1 ? 's' : '') +
                            ' (' + COLOR_NAMES[cA] + '–' + COLOR_NAMES[cB] + ')';
                    }
                    draw();
                });
                row.appendChild(pair);
            }
        }
    }

    function updateKempePairs() {
        kempeHighlight = null;
        buildKempePairs();
    }

    // ================================================================
    // INITIALIZATION: Preset buttons, palette, wiring
    // ================================================================

    // Preset buttons
    const presetContainer = document.getElementById('gcv-preset-btns');
    PRESETS.forEach(function(preset, idx) {
        const btn = document.createElement('button');
        btn.className = 'gcv-preset-btn';
        btn.textContent = preset.name;
        btn.addEventListener('click', function() {
            presetContainer.querySelectorAll('.gcv-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadGraph(idx);
        });
        presetContainer.appendChild(btn);
    });

    // Color palette
    const paletteContainer = document.getElementById('gcv-palette');
    COLORS.forEach(function(color, idx) {
        const btn = document.createElement('div');
        btn.className = 'gcv-color-btn' + (idx === 0 ? ' active' : '');
        btn.style.background = color;
        btn.title = COLOR_NAMES[idx];
        btn.addEventListener('click', function() {
            paletteContainer.querySelectorAll('.gcv-color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = idx;
        });
        paletteContainer.appendChild(btn);
    });
    // Eraser
    const eraser = document.createElement('div');
    eraser.className = 'gcv-color-btn eraser';
    eraser.innerHTML = '✕';
    eraser.title = 'Eraser';
    eraser.addEventListener('click', function() {
        paletteContainer.querySelectorAll('.gcv-color-btn').forEach(b => b.classList.remove('active'));
        eraser.classList.add('active');
        selectedColor = UNCOLORED;
    });
    paletteContainer.appendChild(eraser);

    // Clear button
    document.getElementById('gcv-clear-btn').addEventListener('click', function() {
        if (!currentGraph) return;
        vertexColors = new Array(currentGraph.vertices.length).fill(UNCOLORED);
        kempeHighlight = null;
        updateKempePairs();
        draw();
        updatePanel();
    });

    function loadGraph(idx) {
        currentGraph = PRESETS[idx];
        vertexColors = new Array(currentGraph.vertices.length).fill(UNCOLORED);
        selectedColor = 0;
        hoveredVertex = -1;
        kempeHighlight = null;

        // Reset palette selection
        paletteContainer.querySelectorAll('.gcv-color-btn').forEach(function(b, i) {
            b.classList.toggle('active', i === 0);
        });

        // Update instruction
        const instrEl = document.getElementById('gcv-instruction');
        instrEl.textContent = currentGraph.description;

        updateKempePairs();
        draw();
        updatePanel();
    }

    // Resize handler
    function handleResize() {
        const wrapper = document.getElementById('gcv-canvas-wrapper');
        const size = Math.min(wrapper.clientWidth, 600);
        canvas.width = size;
        canvas.height = size;
        W = size;
        H = size;
        draw();
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    // Initial state: no graph loaded
    draw();
});