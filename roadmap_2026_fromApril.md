# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 4/15/2026 (Reflecting completion of Homology arc, integration of Geometry, and restored development principles)  
**Website:** https://math-cs-compass.com  

---

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML. 

Our ultimate destinations are the three pillars of next-generation AI architecture:
1. **Geometric Deep Learning (GDL):** Unifying network architectures through symmetry, invariance, and continuous manifolds (Lie Groups, Gauges).
2. **Categorical Deep Learning (CDL):** Unifying network operations through compositionality, structural abstraction, and discrete relationships (Category Theory, Quivers, String Diagrams).
3. **Quantum Machine Learning (QML):** Unifying quantum computation and statistical learning through Hilbert space geometry, unitary operators (Fourier), and quantum natural gradients.

**Architectural Principle:** There is no isolated "Geometry" or "Physics" section. Geometric and Quantum concepts are inherently distributed across our foundational sections: Algebraic structures (Lie Groups, Tensor Products) belong to **Section I**, Continuous topological/metric structures (Smooth Manifolds, Hilbert Spaces, Unitary Operators) belong to **Section II**, and combinatorial/mesh structures (Simplicial Complexes, DDG) belong to **Section IV**. They synthesize in **Section V** (Machine Learning).

---

## Current Coverage (Verified via JSON — 102 Pages Total)

### Section I: Linear Algebra to Algebraic Foundations (26 pages) ✅
- **Core Linear Algebra:** Linear systems, matrix algebra, vector spaces, eigenvalues, orthogonality, SVD, trace/norms, Kronecker, Woodbury, stochastic matrices, graph Laplacians.
- **Abstract Algebra & Field Theory:** Groups, rings, fields, classification of finite abelian groups, geometry of symmetry (Dₙ, SO(3), SE(3)), algebraic extensions, finite fields.

### Section II: Calculus to Optimization & Analysis (28 pages) ✅
- **Derivatives & Integration:** Gradients, Jacobians, Newton's method, Constrained Opt, Duality, Riemann, Measure Theory, Lebesgue.
- **Fourier & Metric Spaces:** Fourier series/transform, metric spaces, convergence, completeness, compactness, metric equivalence.
- **Functional Analysis:** Banach/Hilbert spaces, Bounded operators, Dual spaces & Riesz, Weak topologies, Spectral theory, RKHS & kernel methods.

### Section III: Probability & Statistics (21 pages) ✅
- **Foundations & Inference:** Probability, Distributions, Covariance, MVN, MLE, Hypothesis testing, Linear regression.
- **Bayesian & Stochastic:** Bayesian inference, Exponential family, Fisher information matrix (FIM), Decision theory, Markov chains, Monte Carlo, Gaussian processes.

### Section IV: Discrete Mathematics & Algorithms (15 pages) 🚀
- **Computation & Graph Theory:** Graph theory, combinatorics, automata, Boolean logic, Turing machines, P vs NP, Network flow, Trees.
- **Discrete Topology Arc (Completed):** Planar Graphs (Euler's formula), Incidence Structure, Simplicial Complexes, Intro to Homology (Betti numbers, Euler-Poincaré).

### Section V: Machine Learning (12 pages) ✅
- **Foundations & Deep Learning:** Regularized regression, SVM, Neural networks, Auto-diff, CNNs/Transformers.
- **Unsupervised & Physical AI:** PCA, Clustering, RL, Natural gradient descent, VAE.

---

## The Grand Convergence: GDL, CDL, and QML

With the completion of `disc-15` (Intro to Homology), the discrete topology track is complete. We now systematically build the continuous and algebraic geometric layers within their respective sections before unifying them in Section V.

    SECTION IV (Discrete)                         SECTION II (Analysis/Topology)
    ═════════════════════                         ══════════════════════════════
    Planar Graphs & Euler (disc-12)               Metric Spaces & Topology (calc-16~22)
    Incidence & ∂₁ (disc-13)                      Measure Theory & Integrals (calc-10~12)
    Simplicial Complexes & ∂ₖ (disc-14)           Functional Analysis & RKHS (calc-23~28)
    Intro to Homology (disc-15) ✅                           │
              │                                              ▼
              │                            ┌─ PURE ANALYSIS & TOPOLOGY (Next) ─┐
              │                            │ calc-29: Topological Spaces       │
              │                            │ calc-30: Lp Spaces & Riesz-Fischer│
              │                            │ calc-31: Fourier in Hilbert Spaces│
              │                            ├─ MANIFOLDS ───────────────────────┤
              │                            │ calc-32: Smooth Manifolds         │
              │                            │ calc-33: Riemannian Metrics       │
              │                            └───────────────┬───────────────────┘
              ▼                                            │
    ┌───────────────────────────────┐                      │
    │ CATEGORY THEORY ARC           │                      │
    │ disc-16: Quivers & Graphs     │                      │
    │ disc-17: Category Theory Intro│                      │
    └─────────┬─────────────────────┘                      │
              │                                            │
              │    ┌───────────────────────────────┐       │
              │    │ DISCRETE DIFFERENTIAL GEOMETRY│       │
              │    │ disc-18: DEC & Hodge Star     │ ◀─────┤
              │    └───────────────┬───────────────┘       │
              │                    │                       │
              │                    ▼                       ▼
              │    ┌───────────────────────────────────────────────┐
              │    │ SECTION I (Algebra)                           │
              │    │ linalg-27: Lie Groups & Lie Algebras          │
              │    │ linalg-28: Representation Theory (Intro)      │
              │    └───────────────────────┬───────────────────────┘
              ▼                            ▼                       ▼
    ┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
    │ SECTION V (ML)    │        │ SECTION V (ML)    │        │ SECTION V (ML)    │
    │ ml-14: CATEGORICAL│ ◀────▶ │ ml-13: GEOMETRIC  │ ◀────▶ │ ml-15: QUANTUM    │
    │ DEEP LEARNING     │        │ DEEP LEARNING     │        │ MACHINE LEARNING  │
    └───────────────────┘        └───────────────────┘        └───────────────────┘

---

## Immediate Next Steps (Phase 2: Continuous Geometry in Section II)

We pause Section IV and shift to Section II to prepare the advanced analysis and continuous geometry required for GDL and QML.

### 1. `calc-29`: Topological Spaces & Manifold Prerequisites
- **Goal:** Bridge Metric Spaces (`calc-16~22`) to axiomatic topology.
- **Topics:** Axiomatic definition of topology, Basis & Second countability, Hausdorff (T₂) separation axiom, Product/Quotient/Subspace topologies, Paracompactness and Partitions of Unity.

### 2. `calc-30`: Lp Spaces & Riesz-Fischer
- **Goal:** Formalize the completeness of function spaces, closing the "holes" left by Riemann integration, which is essential for probability and quantum mechanics.
- **Topics:** Hölder's inequality, Minkowski's inequality, Riesz-Fischer theorem (Completeness of Lp).
- **Narrative:** Why probability and quantum mechanics require a complete space.

### 3. `calc-31`: Fourier Analysis in Hilbert Spaces
- **Goal:** Elevate Fourier analysis from engineering tools to pure functional analysis, laying the groundwork for Quantum Fourier Transform.
- **Topics:** Plancherel's Theorem (Fourier as a unitary operator on L²), Riemann-Lebesgue Lemma, Heisenberg's Uncertainty Principle as a mathematical theorem.
- **Narrative:** Connection to Shor's algorithm and the computational supremacy of quantum mechanics.

### 4. `calc-32`: Smooth Manifolds & Tangent Spaces
- **Goal:** Introduce the core objects of differential geometry.
- **Topics:** Topological manifolds, Smooth structures (Atlases & Charts), Tangent vectors (as derivations), The Tangent Bundle, Pushforwards.

### 5. `calc-33`: Riemannian Metrics & Geodesics
- **Goal:** Introduce geometry (distance, angles, curvature) on manifolds.
- **Topics:** Inner products on tangent spaces, The metric tensor ($g$), Geodesics, and the continuous Laplace-Beltrami operator $\Delta_g$.

---

## Phase 3: The Confluence (Summer/Autumn 2026)

### Algebraic Geometry in Section I
- **`linalg-27`: Lie Groups & Lie Algebras**
  - Building on `linalg-24` (Geometry of Symmetry). Matrix Lie groups, the exponential map, Lie brackets, and the translation of continuous symmetries into linear algebra.

### Discrete Differential Geometry (DDG) in Section IV
- **`disc-18`: Discrete Exterior Calculus & Hodge Theory**
  - Translating `calc-33` (Continuous) onto `disc-14` (Simplicial Complexes).
  - Cotangent weights, the Discrete Hodge Star, and the Hodge Decomposition theorem ($H_k \cong \ker \Delta_k$).

### Category Theory in Section IV
- **`disc-16`: Quivers and Directed Graphs** (Bridge to categories).
- **`disc-17`: Intro to Category Theory** (Categories, Functors, Natural Transformations).
---

## Deferred & Optional Items (Non-Blocking)

- *None at this time.* 
(Previous deferred items regarding Lebesgue and Fourier analysis were promoted to the core curriculum (`calc-30`, `calc-31`) to rigorously support the new QML track)

---

## Updated Schedule (2026)

| Month | Sections I & IV (Algebra & Discrete) | Section II (Analysis / Geometry) | Section V (ML) |
|-------|--------------------------------------|----------------------------------|----------------|
| **Mar** | `disc-12`~`14` (Simplicial) ✅       | `calc-24`~`28` (FA Block) ✅     | — |
| **Apr** | `disc-15` (Homology)               | —                                | — |
| **May** | —                                    | **`calc-29`** (Topological Spaces) <br> **`calc-30`** (Lp Spaces & Riesz-Fischer) <br> **`calc-31`** (Fourier in Hilbert Spaces) | — |
| **Jun** | —                                    | **`calc-32`** (Smooth Manifolds) <br> **`calc-33`** (Riemannian Metrics) | — |
| **Jul** | **`linalg-27`** (Lie Groups) <br> **`disc-18`** (Discrete Ext. Calculus) | — | — |
| **Aug** | **`disc-16`~`17`** (Category Theory) | —                                | **`ml-13`** (GDL) |
| **Sep** | **`disc-19`** (String Diagrams)      | Fiber Bundles & Gauge Theory (Optional) | **`ml-14`** (CDL) <br> **`ml-15`** (QML) |

---

## Key Learnings & Development Principles

To ensure rigorous quality and consistency across the curriculum, the following principles are strictly enforced:

1. **Notation Consistency is Non-Negotiable:** 
   - Use calligraphic letters for spaces: $\mathcal{X}, \mathcal{Y}, \mathcal{Z}, \mathcal{H}, \mathcal{X}^*, \mathcal{X}^{**}$.
   - Functionals as $\varphi$; operator norm as $\|\varphi\|_{\mathcal{X}^*}$. 
   - All new pages in Section II must match the notation established in `calc-23`~`28`.
2. **Cross-Page Linking:** Links must be verified against actual curriculum filenames and anchor IDs before inclusion.
3. **No In-Body Citations:** References are handled in a site-wide reference index only.
4. **Critical AI Usage:** Third-party AI suggestions must be evaluated critically, not accepted wholesale.
5. **Zero Tolerance for Proof Gaps:** Circular reasoning, incomplete definitions, and missing logical bridges must be explicitly addressed.
6. **Forward Links:** For unwritten pages, use descriptive text only (no `<a href>`). Convert to actual links only when the target page is created.
7. **Narrative & UI Integration:** Utilize `Insight Box` and the knowledge map's `Tessera` to continuously link abstract theorems (e.g., Banach-Alaoglu, Riesz-Fischer) to their ultimate historical or AI/QML applications without breaking the formal proofs in the main text.

---

## Changelog
- **Late April 2026:** Elevated Lp completeness and pure Fourier analysis to the core curriculum (`calc-30`, `calc-31`) following strategic review. Added Quantum Machine Learning (QML) as the third ultimate destination of Section V. Shifted Manifolds to `calc-32`, `calc-33`.
- **4/15/2026:** Verified `curriculum_light.json` to confirm 102 completed pages. Officially marked `disc-12` ~ `disc-15` (Homology arc) as complete. Refined Architectural Alignment: Ensured geometric topics are strictly distributed across existing sections (Section I, II, IV) leading to convergence in Section V. Restored missing detailed requirements for `calc-29`, deferred tasks, and development principles from March planning.
- **3/20/2026:** Completed full Functional Analysis block (calc-24 through calc-28). Updated schedule to reflect completion and next phase (Topological Spaces → Lee preparation). Added gap analysis for Lee prerequisites. 
- **3/03/2026:** Consolidated Intro to Functional Analysis into `calc-23`. Added Section I-25, 26 (Algebraic Extensions, Finite Fields).