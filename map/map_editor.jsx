import React, { useState, useMemo } from 'react';

// Current tile coordinates extracted from curriculum.json
const EXISTING_TILES = [
  // Home
  { id: 'home', q: 0, r: 0, section: 'HOME', title: 'Home' },
  
  // Section I - Linear Algebra (blue) - extends left/down
  { id: 'linalg-1', q: -1, r: 1, section: 'I', title: 'Linear Equations' },
  { id: 'linalg-2', q: -1, r: 2, section: 'I', title: 'Linear Transformation' },
  { id: 'linalg-3', q: -2, r: 1, section: 'I', title: 'Matrix Algebra' },
  { id: 'linalg-4', q: -2, r: 2, section: 'I', title: 'Determinants' },
  { id: 'linalg-5', q: -2, r: 3, section: 'I', title: 'Vector Spaces' },
  { id: 'linalg-6', q: -3, r: 2, section: 'I', title: 'Eigenvalues' },
  { id: 'linalg-7', q: -3, r: 3, section: 'I', title: 'Orthogonality' },
  { id: 'linalg-8', q: -3, r: 4, section: 'I', title: 'Least-Squares' },
  { id: 'linalg-9', q: -4, r: 3, section: 'I', title: 'Symmetry' },
  { id: 'linalg-10', q: -4, r: 4, section: 'I', title: 'Trace & Norms' },
  { id: 'linalg-11', q: -4, r: 5, section: 'I', title: 'Kronecker' },
  { id: 'linalg-12', q: -5, r: 4, section: 'I', title: 'Woodbury' },
  { id: 'linalg-13', q: -5, r: 5, section: 'I', title: 'Stochastic' },
  { id: 'linalg-14', q: -5, r: 6, section: 'I', title: 'Graph Laplacian' },
  { id: 'linalg-15', q: -6, r: 5, section: 'I', title: 'Abstract Algebra' },
  { id: 'linalg-16', q: -6, r: 6, section: 'I', title: 'Finite Groups' },
  { id: 'linalg-17', q: -6, r: 7, section: 'I', title: 'Structural Groups' },
  { id: 'linalg-18', q: -7, r: 6, section: 'I', title: 'Abelian Classification' },
  { id: 'linalg-19', q: -7, r: 7, section: 'I', title: 'Rings & Fields' },
  { id: 'linalg-20', q: -7, r: 8, section: 'I', title: 'Ideals' },
  { id: 'linalg-21', q: -8, r: 7, section: 'I', title: 'Polynomial Rings' },
  
  // Section II - Calculus (green) - extends left/up
  { id: 'calc-1', q: -1, r: 0, section: 'II', title: 'Derivative ℝⁿ→ℝ' },
  { id: 'calc-2', q: -1, r: -1, section: 'II', title: 'Jacobian' },
  { id: 'calc-3', q: -2, r: 0, section: 'II', title: 'Matrix Calculus' },
  { id: 'calc-4', q: -2, r: -1, section: 'II', title: 'Numerical' },
  { id: 'calc-5', q: -2, r: -2, section: 'II', title: 'det Derivative' },
  { id: 'calc-6', q: -3, r: -1, section: 'II', title: 'MVT' },
  { id: 'calc-7', q: -3, r: -2, section: 'II', title: 'Gradient Descent' },
  { id: 'calc-8', q: -4, r: -1, section: 'II', title: "Newton's Method" },
  { id: 'calc-9', q: -3, r: 0, section: 'II', title: 'Constrained Opt' },
  { id: 'calc-10', q: -4, r: -2, section: 'II', title: 'Riemann' },
  { id: 'calc-11', q: -4, r: 0, section: 'II', title: 'Measure Theory' },
  { id: 'calc-12', q: -5, r: -1, section: 'II', title: 'Lebesgue' },
  { id: 'calc-13', q: -5, r: -2, section: 'II', title: 'Duality' },
  { id: 'calc-14', q: -5, r: 0, section: 'II', title: 'Fourier Series' },
  { id: 'calc-15', q: -6, r: -1, section: 'II', title: 'Fourier Transform' },
  
  // Section III - Probability (red) - extends right/up
  { id: 'prob-1', q: 0, r: -1, section: 'III', title: 'Basic Probability' },
  { id: 'prob-2', q: 1, r: -1, section: 'III', title: 'Random Variables' },
  { id: 'prob-3', q: 0, r: -2, section: 'III', title: 'Gamma & Beta' },
  { id: 'prob-4', q: 1, r: -2, section: 'III', title: 'Gaussian' },
  { id: 'prob-5', q: 2, r: -2, section: 'III', title: "Student's t" },
  { id: 'prob-6', q: 0, r: -3, section: 'III', title: 'Covariance' },
  { id: 'prob-7', q: 1, r: -3, section: 'III', title: 'Correlation' },
  { id: 'prob-8', q: 2, r: -3, section: 'III', title: 'Multivariate' },
  { id: 'prob-9', q: 0, r: -4, section: 'III', title: 'MLE' },
  { id: 'prob-10', q: 1, r: -4, section: 'III', title: 'Hypothesis Testing' },
  { id: 'prob-11', q: 2, r: -4, section: 'III', title: 'Linear Regression' },
  { id: 'prob-12', q: 3, r: -3, section: 'III', title: 'Entropy' },
  { id: 'prob-13', q: 3, r: -4, section: 'III', title: 'Convergence' },
  { id: 'prob-14', q: 3, r: -2, section: 'III', title: 'Bayesian Stats' },
  { id: 'prob-15', q: 4, r: -2, section: 'III', title: 'Exp Family' },
  { id: 'prob-16', q: 4, r: -3, section: 'III', title: 'Fisher Info' },
  { id: 'prob-17', q: 4, r: -4, section: 'III', title: 'Decision Theory' },
  { id: 'prob-18', q: 5, r: -3, section: 'III', title: 'Markov Chains' },
  { id: 'prob-19', q: 5, r: -4, section: 'III', title: 'Monte Carlo' },
  { id: 'prob-20', q: 5, r: -2, section: 'III', title: 'Importance Sampling' },
  { id: 'prob-21', q: 6, r: -3, section: 'III', title: 'Gaussian Processes' },
  
  // Section IV - Discrete (purple) - extends right/down
  { id: 'disc-1', q: 0, r: 1, section: 'IV', title: 'Graph Theory' },
  { id: 'disc-2', q: 2, r: 2, section: 'IV', title: 'Combinatorics' },
  { id: 'disc-3', q: 0, r: 2, section: 'IV', title: 'Automata' },
  { id: 'disc-4', q: 1, r: 2, section: 'IV', title: 'Boolean Logic' },
  { id: 'disc-5', q: -1, r: 3, section: 'IV', title: 'Context-Free' },
  { id: 'disc-6', q: 0, r: 3, section: 'IV', title: 'Turing Machines' },
  { id: 'disc-7', q: 1, r: 3, section: 'IV', title: 'Time Complexity' },
  { id: 'disc-8', q: 0, r: 4, section: 'IV', title: 'Eulerian' },
  { id: 'disc-9', q: 1, r: 4, section: 'IV', title: 'Class NP' },
  
  // Section V - ML (orange) - extends right/up area
  { id: 'ml-1', q: 1, r: 0, section: 'V', title: 'Intro ML' },
  { id: 'ml-2', q: 1, r: 1, section: 'V', title: 'Regularized Regression' },
  { id: 'ml-3', q: 2, r: 0, section: 'V', title: 'Classification' },
  { id: 'ml-4', q: 2, r: -1, section: 'V', title: 'Neural Networks' },
  { id: 'ml-5', q: 2, r: 1, section: 'V', title: 'Autodiff' },
  { id: 'ml-6', q: 3, r: 0, section: 'V', title: 'SVM' },
  { id: 'ml-7', q: 3, r: -1, section: 'V', title: 'PCA & Autoencoders' },
  { id: 'ml-8', q: 3, r: 1, section: 'V', title: 'Clustering' },
  { id: 'ml-9', q: 4, r: 0, section: 'V', title: 'Deep NN' },
  { id: 'ml-10', q: 4, r: -1, section: 'V', title: 'Reinforcement Learning' },
];

const SECTION_COLORS = {
  'HOME': '#888888',
  'I': '#1565c0',
  'II': '#2e7d32',
  'III': '#c62828',
  'IV': '#6a1b9a',
  'V': '#ef6c00',
  'EMPTY': '#2a2a2a'
};

const SECTION_NAMES = {
  'HOME': 'Home',
  'I': 'Linear Algebra',
  'II': 'Calculus',
  'III': 'Probability',
  'IV': 'Discrete Math',
  'V': 'Machine Learning'
};

export default function HexMapEditor() {
  const [selectedTile, setSelectedTile] = useState(null);
  const [showEmptySlots, setShowEmptySlots] = useState(true);
  const [highlightSection, setHighlightSection] = useState(null);
  
  const hexSize = 32;
  
  // Build occupied map
  const occupiedMap = useMemo(() => {
    const map = new Map();
    EXISTING_TILES.forEach(tile => {
      map.set(`${tile.q},${tile.r}`, tile);
    });
    return map;
  }, []);
  
  // Find bounds
  const bounds = useMemo(() => {
    let minQ = 0, maxQ = 0, minR = 0, maxR = 0;
    EXISTING_TILES.forEach(t => {
      minQ = Math.min(minQ, t.q);
      maxQ = Math.max(maxQ, t.q);
      minR = Math.min(minR, t.r);
      maxR = Math.max(maxR, t.r);
    });
    // Add padding for empty slot detection
    return { minQ: minQ - 2, maxQ: maxQ + 2, minR: minR - 2, maxR: maxR + 2 };
  }, []);
  
  // Generate empty slots (neighbors of existing tiles)
  const emptySlots = useMemo(() => {
    const slots = [];
    const checked = new Set();
    
    // Hex neighbor offsets (pointy-top)
    const neighbors = [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]
    ];
    
    EXISTING_TILES.forEach(tile => {
      neighbors.forEach(([dq, dr]) => {
        const nq = tile.q + dq;
        const nr = tile.r + dr;
        const key = `${nq},${nr}`;
        
        if (!occupiedMap.has(key) && !checked.has(key)) {
          checked.add(key);
          
          // Find which sections this empty slot borders
          const borderingSection = new Set();
          neighbors.forEach(([ddq, ddr]) => {
            const nnKey = `${nq + ddq},${nr + ddr}`;
            const neighbor = occupiedMap.get(nnKey);
            if (neighbor) borderingSection.add(neighbor.section);
          });
          
          slots.push({
            q: nq,
            r: nr,
            section: 'EMPTY',
            borderingSection: Array.from(borderingSection)
          });
        }
      });
    });
    
    return slots;
  }, [occupiedMap]);
  
  // Convert hex coords to pixel
  const hexToPixel = (q, r) => {
    const x = hexSize * Math.sqrt(3) * (q + r / 2);
    const y = hexSize * (3 / 2) * r;
    return { x, y };
  };
  
  // Calculate viewBox
  const viewBox = useMemo(() => {
    const allTiles = [...EXISTING_TILES, ...emptySlots];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    allTiles.forEach(tile => {
      const { x, y } = hexToPixel(tile.q, tile.r);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    
    const padding = hexSize * 2;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }, [emptySlots]);
  
  // Draw hexagon path
  const hexPath = (cx, cy, size) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 6) + (i * Math.PI / 3);
      points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return `M${points.join('L')}Z`;
  };
  
  const renderTile = (tile, isEmpty = false) => {
    const { x, y } = hexToPixel(tile.q, tile.r);
    const color = SECTION_COLORS[tile.section];
    const isHighlighted = highlightSection && (
      tile.section === highlightSection || 
      (isEmpty && tile.borderingSection?.includes(highlightSection))
    );
    const isSelected = selectedTile && selectedTile.q === tile.q && selectedTile.r === tile.r;
    
    const opacity = isEmpty ? 0.3 : (isHighlighted || !highlightSection ? 1 : 0.3);
    
    return (
      <g key={`${tile.q},${tile.r}`} 
         onClick={() => setSelectedTile(tile)}
         style={{ cursor: 'pointer' }}>
        <path
          d={hexPath(x, y, hexSize * 0.9)}
          fill={color}
          fillOpacity={opacity}
          stroke={isSelected ? '#fff' : isEmpty ? '#444' : 'rgba(255,255,255,0.3)'}
          strokeWidth={isSelected ? 3 : 1}
          strokeDasharray={isEmpty ? '4,2' : 'none'}
        />
        {!isEmpty && (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="7"
            fontWeight="bold"
            opacity={opacity}
          >
            {tile.id.replace(/^[a-z]+-/, '')}
          </text>
        )}
        {isEmpty && (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#666"
            fontSize="6"
          >
            {tile.q},{tile.r}
          </text>
        )}
      </g>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-xl font-bold mb-4">MATH-CS COMPASS - Map Layout Editor</h1>
      
      <div className="flex gap-4 mb-4 flex-wrap">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showEmptySlots}
            onChange={(e) => setShowEmptySlots(e.target.checked)}
            className="w-4 h-4"
          />
          Show empty slots
        </label>
        
        <div className="flex gap-2 items-center">
          <span className="text-sm">Highlight:</span>
          <button
            onClick={() => setHighlightSection(null)}
            className={`px-2 py-1 text-xs rounded ${!highlightSection ? 'bg-white text-black' : 'bg-gray-700'}`}
          >
            All
          </button>
          {Object.entries(SECTION_NAMES).filter(([k]) => k !== 'HOME').map(([key, name]) => (
            <button
              key={key}
              onClick={() => setHighlightSection(key === highlightSection ? null : key)}
              className="px-2 py-1 text-xs rounded"
              style={{ 
                background: highlightSection === key ? SECTION_COLORS[key] : '#374151',
                opacity: highlightSection === key ? 1 : 0.7
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap text-sm">
        {Object.entries(SECTION_NAMES).map(([key, name]) => (
          <div key={key} className="flex items-center gap-1">
            <div 
              className="w-4 h-4 rounded"
              style={{ background: SECTION_COLORS[key] }}
            />
            <span>{key}: {name}</span>
          </div>
        ))}
      </div>
      
      {/* Selected tile info */}
      {selectedTile && (
        <div className="bg-gray-800 p-3 rounded mb-4 text-sm">
          <h3 className="font-bold mb-1">
            {selectedTile.section === 'EMPTY' ? 'Empty Slot' : selectedTile.title}
          </h3>
          <p><strong>Coordinates:</strong> q={selectedTile.q}, r={selectedTile.r}</p>
          {selectedTile.id && <p><strong>ID:</strong> {selectedTile.id}</p>}
          {selectedTile.borderingSection && (
            <p><strong>Borders sections:</strong> {selectedTile.borderingSection.join(', ')}</p>
          )}
          {selectedTile.section === 'EMPTY' && (
            <p className="mt-2 text-green-400">
              ✓ Available for new tile
            </p>
          )}
        </div>
      )}
      
      {/* SVG Map */}
      <div className="bg-gray-950 rounded overflow-auto" style={{ maxHeight: '60vh' }}>
        <svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className="w-full"
          style={{ minHeight: '400px' }}
        >
          {/* Grid lines for reference */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#222" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#grid)" />
          
          {/* Empty slots (render first, behind) */}
          {showEmptySlots && emptySlots.map(tile => renderTile(tile, true))}
          
          {/* Existing tiles */}
          {EXISTING_TILES.map(tile => renderTile(tile, false))}
        </svg>
      </div>
      
      {/* Stats */}
      <div className="mt-4 text-sm text-gray-400">
        <p>Total tiles: {EXISTING_TILES.length} | Available empty slots: {emptySlots.length}</p>
        <p className="mt-2">
          <strong>Section counts:</strong>{' '}
          {Object.entries(SECTION_NAMES).map(([key]) => {
            const count = EXISTING_TILES.filter(t => t.section === key).length;
            return count > 0 ? `${key}: ${count}` : null;
          }).filter(Boolean).join(' | ')}
        </p>
      </div>
      
      {/* Suggested empty coordinates by section */}
      <div className="mt-4 bg-gray-800 p-3 rounded text-sm">
        <h3 className="font-bold mb-2">Suggested Empty Slots by Section Border:</h3>
        {Object.entries(SECTION_NAMES).filter(([k]) => k !== 'HOME').map(([section, name]) => {
          const sectionSlots = emptySlots.filter(s => 
            s.borderingSection.includes(section) && s.borderingSection.length === 1
          );
          return (
            <div key={section} className="mb-1">
              <span style={{ color: SECTION_COLORS[section] }}>{name}:</span>{' '}
              {sectionSlots.length > 0 
                ? sectionSlots.slice(0, 5).map(s => `(${s.q},${s.r})`).join(', ')
                : 'None (check borders)'}
              {sectionSlots.length > 5 && ` +${sectionSlots.length - 5} more`}
            </div>
          );
        })}
      </div>
    </div>
  );
}