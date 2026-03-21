# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 3/20/2026  
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML. 

Our ultimate destinations are the two pillars of next-generation AI architecture:
1. **Geometric Deep Learning (GDL):** Unifying network architectures through symmetry, invariance, and continuous manifolds (Lie Groups, Gauges).
2. **Categorical Deep Learning (CDL):** Unifying network operations through compositionality, structural abstraction, and discrete relationships (Category Theory, Quivers, String Diagrams).

**Primary Reference for Geometry Track:** *Introduction to Smooth Manifolds* by John M. Lee (2nd Edition).

---

## Current Coverage (as of 3/20/2026)

### Section I: Linear Algebra to Algebraic Foundations (26 pages)
- **Core Linear Algebra (14 pages):** Linear equations, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry/SVD, trace/norms, Kronecker products, Woodbury identity, stochastic matrices, graph Laplacians
- **Abstract Algebra (8 pages):** Groups, cyclic/permutation groups, structural group theory, classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, integral domains
- **Field Theory (4 pages):** Extension fields, geometry of symmetry (Dₙ, SO(3), SE(3)), algebraic extensions, finite fields

### Section II: Calculus to Optimization & Analysis (28 pages)
- **Derivatives & Optimization (9 pages):** Gradients, Jacobians, matrix calculus, Newton's method, KKT, Duality
- **Analysis & Measure Theory (3 pages):** Riemann integration, measure theory, Lebesgue integration
- **Fourier Analysis (3 pages):** Fourier series, Fourier transform & FFT
- **Metric Space Analysis (7 pages):** Metric spaces, convergence, continuity, completeness, connectedness, compactness, metric equivalence (homeomorphism)
- **Functional Analysis — Intro (1 page):** Banach & Hilbert spaces, Lₚ spaces, geometry of unit balls
- **Functional Analysis — Advanced (5 pages):** Bounded operators, dual spaces & Riesz representation, weak topologies & Banach-Alaoglu, spectral theory of compact operators, RKHS & kernel methods ✅ **COMPLETE**
- **General Topology (planned, ~1 page):** Topological spaces beyond metrics — Lee preparation

### Section III: Probability & Statistics (21 pages)
- **Foundations & Distributions:** Basic probability, random variables, Gamma/Beta, Gaussian, Student's t
- **Multivariate & Inference:** Covariance, correlation, MVN, Dirichlet, Wishart, MLE, hypothesis testing, linear regression, convergence
- **Bayesian & Stochastic:** Bayesian inference, exponential family, Fisher information, decision theory, Markov chains, Monte Carlo, importance sampling, Gaussian processes

### Section IV: Discrete Mathematics & Algorithms (9 pages completed, expansion planned)
- **Computation & Logic:** Graph theory, combinatorics, automata theory, Boolean logic, context-free languages, Turing machines, time complexity, Eulerian/Hamiltonian, P vs NP
- **Upcoming (Topological & Categorical Track):** Network flows, random walks, simplicial complexes, intro to homology, quivers, category theory

### Section V: Machine Learning (12 pages)
- **Foundations & Deep Learning:** Intro to ML, regularized regression, classification, SVM, neural networks, automatic differentiation, deep NN (CNNs/Transformers)
- **Unsupervised & Physical AI:** PCA & autoencoders, clustering, reinforcement learning, natural gradient descent, variational autoencoders (VAE)

**Page count:** Section I (26) + Section II (28) + Section III (21) + Section IV (9) + Section V (12) = **96 pages**. Of Section II's 28, calc-27 and calc-28 are in draft (pending publication).

---

## The Grand Convergence: GDL and CDL

```text
ALGEBRA & DISCRETE TRACK                      ANALYSIS & PROBABILITY TRACK
════════════════════════                      ════════════════════════════
Groups, Rings, Fields (I)                     Metric Spaces & Topology (II)
Graphs, Simplicial Complexes (IV)             Measure Theory & Integrals (II)
Quivers & Categories (IV)                     Stochastic Processes & FIM (III)
          │                                                │
          ├── Algebraic Ext (I)                            │
          │       │                                        │
          │       ▼                                        ▼
          │   Geometry of Symmetry (I)            ┌─ Functional Analysis ─┐
          │   (D_n, SO(3), SE(3))                 │ calc-23: Banach/Hilbert│
          │       │                               │ calc-24: Operators     │
          │       │                               │ calc-25: Duals/Riesz   │
          │       │                               │ calc-26: Weak Top.     │
          │       │                               │ calc-27: Spectral      │
          │       │                               │ calc-28: RKHS    ✅    │
          │       │                               └────────┬───────────────┘
          │       │                                        │
          │       │                               Topological Spaces (next)
          │       │                                        │
          │       └─────────────────┬──────────────────────┘
          │                         │
          │                         ▼
          │                 ┌───────────────┐
          │                 │  SMOOTH       │   ← Lee, Intro to Smooth Manifolds
          │                 │  MANIFOLDS    │
          │                 └───────┬───────┘
          │                         │
          │                 ┌───────────────┐
          │                 │  LIE GROUPS   │
          │                 │  & ALGEBRAS   │
          │                 └───────┬───────┘
          │                         │
          ▼                         ▼
┌───────────────────┐     ┌───────────────────┐
│ CATEGORICAL DEEP  │     │  GEOMETRIC DEEP   │
│ LEARNING (CDL)    │ ◀─▶ │  LEARNING (GDL)   │
└───────────────────┘     └───────────────────┘
```

---

## Completed: Functional Analysis Block (calc-23 ~ calc-28)

All six pages form a complete arc from abstract spaces to applied kernel methods.

| ID | Title | Status | Key Achievement |
|----|-------|--------|-----------------|
| calc-23 | Banach & Hilbert Spaces | ✅ Published | Spaces where functions live; L¹/L² geometry |
| calc-24 | Bounded Linear Operators | ✅ Published | Continuity = boundedness; operator norm |
| calc-25 | Dual Spaces & Riesz Representation | ✅ Published | Gradient is a covector; Musical Isomorphisms ♯♭ |
| calc-26 | Weak Topologies & Banach-Alaoglu | ✅ Published | Regularization Guarantee; existence of minimizers |
| calc-27 | Spectral Theory of Compact Operators | ✅ Draft | Infinite-dim SVD; Karhunen-Loève; Laplacian eigenfunctions |
| calc-28 | RKHS & Kernel Methods | ✅ Draft | Grand Synthesis: Mercer + Representer Theorem |

---

## Next: Topological Spaces (Lee Preparation)

### Gap Analysis: What calc-16~22 Already Cover vs. What Lee Requires

| Concept | Current Status | Lee Requirement | Action |
|---------|---------------|-----------------|--------|
| Open/closed sets, interior, boundary, closure | ✅ calc-16 | Assumed | — |
| Convergence, Cauchy sequences | ✅ calc-17 | Assumed | — |
| Continuity (ε-δ, topological) | ✅ calc-18 | Assumed | — |
| Completeness, Banach fixed-point | ✅ calc-19 | — | — |
| Connectedness, path-connectedness | ✅ calc-20 | Ch. 4 (Lee) | — |
| Compactness, Heine-Borel, sequential | ✅ calc-21 | Ch. 4 (Lee) | — |
| Homeomorphism, topological invariants | ✅ calc-22 | Ch. 2 (Lee) | — |
| **Axiomatic topology (open-set axioms)** | ❌ Mentioned but not formal | Ch. 2 definition of manifold | **New page** |
| **Basis for a topology, second countable** | ❌ | Ch. 2 (manifold definition) | **New page** |
| **Hausdorff separation axiom** | ❌ | Ch. 2 (manifold definition) | **New page** |
| **Product topology** | ❌ | Ch. 2 (products of manifolds) | **New page** |
| **Quotient topology** | ❌ | Ch. 3 (quotient manifolds, Lie groups) | **New page** |
| **Subspace (induced) topology** | ❌ Implicit | Ch. 2 (submanifolds) | **New page** |
| **Paracompactness, partition of unity** | ❌ | Ch. 2 (existence of Riemannian metrics) | **New page** |

### Proposed Structure: 1–2 Pages

**Option: Single page covering all Lee prerequisites**

One comprehensive page (calc-29: "Topological Spaces & Manifold Prerequisites") structured as:
1. **Axiomatic Definition** — topology as a collection of open sets; why we generalize beyond metrics
2. **Basis & Second Countability** — basis for a topology; first/second countable; Lindelöf
3. **Separation Axioms** — T₁, Hausdorff (T₂); why manifolds require Hausdorff
4. **Constructions** — subspace topology, product topology, quotient topology (with examples: torus as quotient, product manifolds)
5. **Paracompactness & Partitions of Unity** — definition; every second-countable Hausdorff manifold is paracompact; why this matters (stitching local structures into global ones)

This is dense but feasible as a single page if we treat metric space results as "already proven" and focus on the new abstract-topology layer. If it gets too long during writing, we split into two: (a) Axiomatic topology + separation + constructions, (b) Paracompactness & partitions of unity.

---

## Deferred Items: Fourier & Lebesgue Continuations

### Lebesgue Integration Supplement (Priority: Medium)

**Origin:** calc-25 (Dual Spaces) references Hölder's inequality and Lₚ duality but defers the proof to "a future Lebesgue page." 

**Content:** Hölder's inequality (full proof), Minkowski's inequality, Lₚ completeness (Riesz-Fischer), dual of Lₚ via Radon-Nikodym.

**Placement:** New page between calc-12 (Lebesgue Integration) and calc-16 (Metric Spaces), or as calc-12b.

**Urgency:** Not a blocker for Lee's manifolds. Becomes necessary if we write a dedicated Lₚ Duality page or need Radon-Nikodym for measure-theoretic probability.

### Fourier Analysis: Pure Mathematics Continuation (Priority: Low-Medium)

**Origin:** calc-14 (Fourier Series) and calc-15 (Fourier Transform & FFT) are engineering-focused. With calc-23~28 now complete, several natural pure-math topics emerge:

| Topic | Connection to Existing Pages | Urgency |
|-------|------------------------------|---------|
| **Plancherel Theorem** (L² isometry of Fourier transform) | calc-23 (Hilbert space isometry), calc-27 (unitary equivalence) | Medium — clean application of FA |
| **Riemann-Lebesgue Lemma** (L¹ → C₀) | calc-12 (Lebesgue), calc-24 (bounded operators) | Low |
| **Schwartz Space & Distributions** | calc-25 (dual spaces as "generalized functions") | Low — needed for PDE theory |
| **Pontryagin Duality** (Fourier on groups) | Section I abstract algebra, future Lie groups | Low — elegant but far out |
| **Spectral Theory of the Laplacian** (Fourier as eigenfunctions of -d²/dx²) | calc-27 (spectral theorem), future Laplace-Beltrami | Medium — bridges Fourier to manifolds |

**Recommendation:** A single page "Fourier Analysis in L²" covering Plancherel + Riemann-Lebesgue would be the highest-value addition. It concretely instantiates the abstract Hilbert space isometry (calc-23) and connects to the spectral theory of the Laplacian (calc-27). Defer Schwartz/distributions and Pontryagin until the PDE or Lie group stage.

**Placement:** After calc-15 (FFT), as calc-15b or a new Part number.

---

## Updated Schedule (2026)

| Month | Track A (Discrete / Category) | Track B (Analysis / Geometry) | Notes |
|-------|-------------------------------|-------------------------------|-------|
| **Mar** | Algebraic Ext / Finite Fields ✅ | Functional Analysis (calc-24~28) ✅ | **Complete** |
| **Apr (early)** | — | **Topological Spaces** (calc-29) | Lee preparation; 1–2 pages |
| **Apr (late)** | Network Flow, Random Walks | *Begin reading Lee Ch. 1–2* | Track A expansion starts |
| **May** | Simplicial Complexes, Intro Homology | **Smooth Manifolds & Tangent Spaces** | Lee Ch. 1–3 |
| **Jun** | Quivers & Intro Category Theory | **Riemannian Metrics & Geodesics** | Lee + do Carmo |
| **Jul** | Monoidal Categories | **Lie Groups & Lie Algebras** | Convergence of Tracks A & B |
| **Aug** | String Diagrams (Categorical AI) | Fiber Bundles & Gauge Theory | |
| **Sep** | — | **GEOMETRIC DEEP LEARNING (GDL)** | Bronstein et al. |
| **Oct** | **CATEGORICAL DEEP LEARNING (CDL)** | — | |

### Optional Insertions (Not Blocking Main Track)

| Item | Best Timing | Trigger |
|------|-------------|---------|
| Lebesgue supplement (Hölder/Minkowski) | Before Lₚ duality is needed in detail | If a student asks; or before measure-theoretic probability pages |
| Fourier in L² (Plancherel) | After Topological Spaces, before Laplace-Beltrami | Natural pause between topology and manifolds |

---

## Key Learnings & Principles (Updated)

- **Notation consistency is non-negotiable**: calligraphic \(\mathcal{X}, \mathcal{Y}, \mathcal{Z}, \mathcal{H}, \mathcal{X}^*, \mathcal{X}^{**}\); functionals as \(\varphi\); operator norm as \(\|\varphi\|_{\mathcal{X}^*}\). All new pages must match calc-23~28.
- **Cross-page links must be verified** against actual curriculum filenames and anchor IDs before inclusion.
- **No in-body citations**: References are handled in a site-wide reference index only.
- **Third-party AI suggestions should be evaluated critically**, not accepted wholesale.
- **Proof gaps matter**: circular reasoning, incomplete definitions, and missing logical bridges (e.g., weak lower semicontinuity in calc-26) must be addressed.
- **Forward links to unwritten pages**: Use descriptive text only (no `<a href>`); convert to links when page is created.
- **Spectral Theory (calc-27) forward link**: `spectral_theory.html` — use this filename when creating the page.
- **RKHS (calc-28) forward link**: `rkhs.html` — use this filename when creating the page.

---

## Changelog
- **3/20/2026:** Completed full Functional Analysis block (calc-24 through calc-28). Updated schedule to reflect completion and next phase (Topological Spaces → Lee preparation). Added gap analysis for Lee prerequisites. Added deferred items section (Fourier continuation, Lebesgue supplement). Revised convergence diagram to show FA block as complete.
- **3/03/2026:** Inserted the **Functional Analysis Block (calc-24 to calc-28)** into Section II.
    - Added specific pedagogical notes: "Avoid 'Linear Manifold'", "Gradient is a Covector", "Weak Topology for Optimization Existence", and "Riesz as Musical Isomorphism".
- **3/03/2026:** Consolidated Intro to Functional Analysis into `calc-23`.
- **3/01/2026:** Added Section I-25, 26 (Algebraic Extensions, Finite Fields).