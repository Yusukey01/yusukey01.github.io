# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 4/21/2026 
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML.

### Three Application Domains

The curriculum serves three broad application domains. These are **not terminal goals** but recurring **viewpoints** — intermediate plateaus where accumulated mathematical tools illuminate a class of real-world problems, and simultaneously reveal deeper mathematics worth pursuing.

1. **Geometric Deep Learning (GDL):** Symmetry, invariance, and continuous geometry applied to network architectures. Draws on Lie groups, Riemannian geometry, and fiber bundles.
2. **Categorical Deep Learning (CDL):** Compositionality, structural abstraction, and functorial reasoning applied to network operations. Draws on category theory, quivers, and string diagrams.
3. **Quantum Computation & Quantum Theory:** Unitary evolution, spectral decomposition, and Hilbert space geometry applied to computation and physics. Emerges naturally from Fourier analysis, Lp completeness, and operator theory.

**Design philosophy:** Rather than building toward these domains as endpoints, we develop rigorous mathematical foundations and introduce application domains at the moment sufficient tools are in hand — the same way Natural Gradient Descent (ml-12) previewed Riemannian geometry before manifolds were formally defined. Each "viewpoint" page motivates further mathematical depth, creating a virtuous cycle: **math → application preview → deeper math → richer application.**

### Architectural Principle

There is no isolated "Geometry" or "Physics" section. Geometric and quantum concepts are inherently distributed across foundational sections:

- **Section I** (Algebra): Lie groups, tensor products, representation theory
- **Section II** (Analysis): Smooth manifolds, Hilbert spaces, unitary operators, spectral theory
- **Section IV** (Discrete): Simplicial complexes, discrete differential geometry, quivers
- **Section V** (ML): Application viewpoints — GNN, equivariant networks, GDL intro, CDL intro

---

## Current Coverage (as of 4/5/2026)

### Section I: Linear Algebra to Algebraic Foundations (30 pages) ✅
- **Core Linear Algebra (14 pages):** Linear systems, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry/SVD, trace/norms, Kronecker, Woodbury, stochastic matrices, graph Laplacians.
- **Abstract Algebra (8 pages):** Groups, cyclic/permutation, structural group theory, classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, integral domains.
- **Field Theory & Continuous Symmetry (8 pages):** Extension fields, geometry of symmetry (Dₙ, SO(3), SE(3)), algebraic extensions, finite fields, Lie groups, matrix exponential, Lie algebras & bracket, Lie correspondence.

### Section II: Calculus to Optimization & Analysis (31 pages) ✅
- **Derivatives & Integration (9+3 pages):** Gradients, Jacobians, Newton's method, KKT, Duality, Riemann integration, measure theory, Lebesgue integration.
- **Fourier Analysis (2 pages):** Fourier series, Fourier transform & FFT.
- **Metric Spaces & Topology (8 pages):** Metric spaces, convergence, continuity, completeness, connectedness, compactness, metric equivalence (homeomorphism), topological spaces.
- **Functional Analysis (8 pages):** Banach & Hilbert spaces, bounded operators, dual spaces & Riesz representation, weak topologies & Banach-Alaoglu, spectral theory of compact operators, RKHS & kernel methods, Lp spaces (construction & inequalities), Lp completeness & convergence (Riesz-Fischer, MCT/Fatou/DCT, convergence modes).

### Section III: Probability & Statistics (23 pages) ✅
- **Foundations & Inference:** Probability, distributions, covariance, MVN, MLE, hypothesis testing, linear regression.
- **Bayesian & Stochastic:** Bayesian inference, exponential family, Fisher information matrix, decision theory, Markov chains, Monte Carlo, importance sampling, Gaussian processes.
- **Measure-Theoretic Probability (2 pages):** Random variables as measurable functions, expectation as Lebesgue integral, convergence theorems, limit theorems & product measures.

### Section IV: Discrete Mathematics & Algorithms (15 pages)
- **Computation & Graph Theory (11 pages):** Graph theory, combinatorics, automata, Boolean logic, context-free languages, Turing machines, time complexity, Eulerian/Hamiltonian, P vs NP, network flow, trees.
- **Discrete Topology Arc (4 pages) ✅:** Planar graphs (Euler's formula), incidence structure, simplicial complexes, intro to homology (Betti numbers, Euler-Poincaré).

### Section V: Machine Learning (12 pages) ✅
- **Foundations & Deep Learning:** Intro to ML, regularized regression, classification, SVM, neural networks, automatic differentiation, deep NN (CNNs/Transformers).
- **Unsupervised & Physical AI:** PCA & autoencoders, clustering, reinforcement learning, natural gradient descent, variational autoencoders (VAE).

**Total: 111 pages.**

---

## Dependency Map

Rather than a linear convergence diagram with terminal goals, the curriculum forms a **web of mutual reinforcement**. Each arrow represents prerequisite knowledge; each application viewpoint (marked with ◈) motivates return to deeper foundations.

```
SECTION I (Algebra)          SECTION II (Analysis)          SECTION III (Probability)     SECTION IV (Discrete)
═══════════════════          ═════════════════════          ═════════════════════════     ═════════════════════
Groups & Rings               Metric Spaces (calc-16~22)✅    Foundations & Inference       Graphs & Combinatorics
(linalg-15~22)✅                   │                          (prob-1~13) ✅                (disc-01~11)✅
     │                             │                             │                            │
Geometry of Symmetry✅        Functional Analysis            Bayesian & Stochastic         Planar Graphs & Euler
(linalg-24: Dₙ,SO(3),SE(3)) (calc-23~28: FA Block) ✅     (prob-14~21) ✅               (disc-12)✅
     │                             │                             │                            │
     │                       ┌─────┴──────────────┐              │                       Incidence & ∂₁
     │                       │                    │              │                       (disc-13)✅
     │                calc-29: Topological   calc-30: Lp         │                       Simplicial Complexes
     │                Spaces ✅              Construction ✅      │                       (disc-14)✅
     │                       │                    │              │                            │
     │                       │             calc-31: Lp           │                       Intro to Homology
     │                       │             Completeness ✅       │                       (disc-15) ✅
     │                       │                    │              │                            │
     │                       │                    ├──────── prob-22&23: Measure-              │
     │                       │                    │         Theoretic Prob. ✅✅               │
     │                       │                    │              │                            │
     │                       │               calc-32:            │                            │
     │                       │               Fourier in          │                            │
     │                       │               Hilbert Spaces      │                            │
     ├───────────────────────┤                    │              │                            │
     │                       │                    │              │                            │
Lie Group Series        calc-XX (~3 pp):          │              │                       disc-XX: Quivers
(linalg-27~30) ✅       Smooth Manifolds          │              │                       disc-XX: Categories
     │            ◀────▶ (Atlases, Tangent         │              │                            │
     │                   Spaces, Vector Fields)    │              │                            │
     │                       │                    │              │                            │
     │                  calc-XX (~2 pp):           │              │                       disc-XX: Discrete
     │                  Riemannian Metrics         │              │                       Ext. Calculus (DEC)
     │                  & Curvature                │              │                            │
     │                       │                    │              │                            │
linalg-XX (~3-4 pp):        │                    │              │                            │
Representation Theory        │                    │              │                            │
     │                       │                    │              │                            │
     ▼                       ▼                    ▼              ▼                            ▼
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

                           SECTION V: Application Viewpoints
                           (each ◈ motivates return to deeper foundations)

  ◈ ml-13: Graph Neural Networks ← disc-15, linalg-14 (Graph Laplacian)
       Introduces GDL principle via discrete symmetry; foreshadows manifold series
  ◈ ml-14: Equivariant Neural Networks ← linalg-27~30, linalg-XX (Rep. Theory), ml-13
  ◈ ml-XX: GDL Overview ← calc-XX (Riemannian), linalg-27~30, ml-14
  ◈ ml-XX: CDL Overview ← disc-XX (Category Theory), ml-13
  ◈ Quantum computation topics ← calc-32 (Fourier/Hilbert), calc-27 (Spectral)
```

---

## Completed Work

### Phase 1 — Completed Early (March 2026)
- **calc-29** (Topological Spaces)
- **calc-30** (Lp Spaces — Construction & Inequalities)
- **calc-31** (Lp Completeness & Convergence) — split from original calc-30 in April 2026; see Changelog 4/21/2026
- **prob-22 & prob-23** (Measure-Theoretic Probability)

### Phase 2a — Lie Group Series (April 2026) ✅
Originally planned as 2 pages (linalg-27 & 28), expanded to 4 pages during drafting:

| Page ID | Filename | Title |
|---------|----------|-------|
| linalg-27 | `lie_groups.html` | Lie Groups: Matrix Groups and Continuous Symmetry |
| linalg-28 | `matrix_exponential.html` | The Matrix Exponential |
| linalg-29 | `lie_algebras.html` | Lie Algebras and the Lie Bracket |
| linalg-30 | `lie_correspondence.html` | The Lie Correspondence |

**Lesson learned:** Topics requiring new conceptual paradigms (here, the passage from discrete to continuous symmetry) consistently expand beyond initial estimates. This pattern is expected to recur for smooth manifolds, representation theory, and category theory.

---

## Phase 2b: Current & Near-Term Work

### calc-32: Fourier Analysis in Hilbert Spaces (1 page)
- **Goal:** Elevate Fourier analysis from engineering tools (calc-14, calc-15) to pure functional analysis. Capstone page that synthesizes existing machinery rather than introducing new foundations.
- **Topics:** Plancherel's theorem (Fourier as unitary operator on L²), Riemann-Lebesgue lemma, Heisenberg's uncertainty principle as a mathematical theorem.
- **Connections:** calc-27 (spectral theory) provides the abstract framework; this page instantiates it concretely. Insight Boxes connect to quantum mechanics (unitary evolution, measurement) and signal processing (Nyquist-Shannon as a Hilbert space projection).
- **Why 1 page:** All heavy prerequisites are done (calc-23 Hilbert spaces, calc-25 Riesz, calc-27 spectral theory, calc-31 Lp completeness, prob-22 DCT). The content is convergence of existing tools, not new foundation-building. Group-theoretic Fourier analysis (Peter-Weyl) is deferred to after representation theory.
- **Note on numbering:** Originally assigned calc-31; renumbered to calc-32 when the original calc-30 was split into calc-30 (construction) + calc-31 (completeness) in April 2026.

### ml-13: Graph Neural Networks (1 page)
- **Goal:** Show how discrete symmetry (permutation invariance) constrains network architecture. Introduces the GDL principle in its simplest form.
- **Prereqs:** disc-15 (Homology — graph-level features), linalg-14 (Graph Laplacian — spectral convolution).
- **Key insight:** Message passing = local, permutation-equivariant aggregation. This is the simplest instance of the GDL principle.
- **Critical role:** This page plants forward references to the manifold series (calc-32+). When the reader asks "what about continuous symmetries? curved spaces?" — the manifold pages answer that question. Must be written with this foreshadowing in mind.

---

## Phase 3: Smooth Manifolds (Summer 2026)

The original plan (1 page for calc-32) was recognized as inadequate during the Lie group expansion. Lee's *Introduction to Smooth Manifolds* Ch. 1–3 and Ch. 8 require at minimum 3 pages. Page IDs will be assigned when drafting begins.

### calc-XX: Smooth Manifolds & Atlases (~1 page)
- **Topics:** Topological manifolds, charts (local coordinate systems), atlases, transition maps, smooth structure, smooth maps between manifolds.
- **CS angle:** A manifold is a data structure that is locally Euclidean — local tensor operations apply, but global consistency requires the atlas machinery.
- **Payoff:** calc-29's Hausdorff and second countability conditions are revealed as specifications that exclude pathological spaces.
- **Prereqs:** calc-29, linalg-27~30.

### calc-XX: Tangent Spaces & The Pushforward (~1 page)
- **Topics:** Tangent vectors (equivalence classes of curves; derivations), tangent space T_pM, differential/pushforward (dF or F_*), Jacobian matrix in local coordinates.
- **CS angle:** The pushforward of a map between manifolds is the Jacobian of neural network forward propagation. The dual (pullback) corresponds to backpropagation.
- **Payoff:** T_I G from the Lie group series (linalg-29) is revealed as a special case of the abstract tangent space.
- **Prereqs:** Previous manifold page.

### calc-XX: Vector Fields, Flows & The Tangent Bundle (~1 page)
- **Topics:** Tangent bundle TM, vector fields, integral curves and flows, Lie bracket of vector fields [X, Y].
- **CS angle:** ODE solvers on manifolds. Neural ODE and fluid simulation as flows on manifolds.
- **Payoff:** The matrix commutator [A, B] = AB − BA from linalg-29 is revealed as the matrix representation of the Lie bracket of vector fields — a higher level of abstraction.
- **Prereqs:** Previous manifold page.

### calc-XX: Riemannian Metrics & Beyond (~2 pages, scope TBD)
- **Topics:** Inner products on tangent spaces, metric tensor g, geodesics, Levi-Civita connection, curvature, Laplace-Beltrami operator Δ_g.
- **Prereqs:** Manifold series above, calc-25 (Riesz — musical isomorphisms extend to manifolds).
- **Note:** Likely splits into at least 2 pages (metrics & geodesics vs. curvature & Laplace-Beltrami). Final structure determined during drafting.

---

## Phase 4: Representation Theory & Equivariance (Autumn 2026)

### linalg-XX: Representation Theory (~3–4 pages)
- **Topics:** Group representations, subrepresentations, irreducibility, Maschke's theorem, Schur's lemma, character theory (finite groups), Lie group representations and Peter-Weyl.
- **Prereqs:** linalg-27~30 (Lie group series), linalg-22 (classification of finite abelian groups).
- **Connection:** Peter-Weyl theorem bridges back to calc-32 (Fourier as a special case of harmonic analysis on groups).
- **Note:** Page count estimated at 3–4 based on the Lie group experience. Finite group representations alone (Maschke, Schur, character tables) fill at least 2 pages; Lie group representations add 1–2 more.

### ml-14: Equivariant Neural Networks
- **Goal:** Generalize from permutation invariance to continuous group equivariance (SO(3), SE(3)).
- **Prereqs:** linalg-27~30 (Lie groups), linalg-XX (representation theory), ml-13 (GNN).
- **Key insight:** "The architecture encodes the symmetry" — once this is clear, the reader naturally asks for a unifying framework, which is GDL.

At this point, readers have seen permutation equivariance (GNN), rotation/translation equivariance (Equivariant NN), and Riemannian structure (NGD). The unifying language is GDL — which becomes not a lesson to teach but a pattern the reader has already experienced.

---

## Phase 5: Categorical Foundations & Viewpoints (Future)

### Section IV — Discrete Differential Geometry & Categories

Page IDs deferred. Estimated scope:

- **Quivers & Directed Graphs** (~1 page) — Prereqs: disc-01, linalg-15.
- **Category Theory** (~2–3 pages) — Categories, functors, natural transformations, adjunctions. Prereqs: quivers as motivating example, familiarity with algebraic structures from Sections I–IV.
- **Discrete Exterior Calculus & Hodge Theory** (~1–2 pages) — Discrete differential forms, Hodge star, Hodge decomposition. Prereqs: disc-14 (simplicial complexes), calc-XX (Riemannian metrics).

### Section V — Ultimate Viewpoints

- **GDL Overview** ← calc-XX (Riemannian), linalg-27~30, ml-14
- **CDL Overview** ← disc-XX (Category Theory), ml-13

---

## Lee Preparation: Gap Analysis for calc-29

What calc-16~22 already cover vs. what Lee's *Introduction to Smooth Manifolds* requires:

| Concept | Current Status | Lee Requirement | Action |
|---------|---------------|-----------------|--------|
| Open/closed sets, interior, boundary, closure | ✅ calc-16 | Assumed | — |
| Convergence, Cauchy sequences | ✅ calc-17 | Assumed | — |
| Continuity (ε-δ, topological) | ✅ calc-18 | Assumed | — |
| Completeness, Banach fixed-point | ✅ calc-19 | — | — |
| Connectedness, path-connectedness | ✅ calc-20 | Ch. 4 (Lee) | — |
| Compactness, Heine-Borel, sequential | ✅ calc-21 | Ch. 4 (Lee) | — |
| Homeomorphism, topological invariants | ✅ calc-22 | Ch. 2 (Lee) | — |
| **Axiomatic topology (open-set axioms)** | ❌ Mentioned but not formal | Ch. 2 definition of manifold | **calc-29 §1** ✅ |
| **Basis for a topology, second countable** | ❌ | Ch. 2 (manifold definition) | **calc-29 §2** ✅ |
| **Hausdorff separation axiom** | ❌ | Ch. 2 (manifold definition) | **calc-29 §3** ✅ |
| **Product topology** | ❌ | Ch. 2 (products of manifolds) | **calc-29 §4** ✅ |
| **Quotient topology** | ❌ | Ch. 3 (quotient manifolds, Lie groups) | **calc-29 §4** ✅ |
| **Subspace (induced) topology** | ❌ Implicit | Ch. 2 (submanifolds) | **calc-29 §4** ✅ |
| **Paracompactness, partition of unity** | ❌ | Ch. 2 (existence of Riemannian metrics) | **calc-29 §5** ✅ |

---

## Filename Registry (Forward Links)

### Completed Pages

| Page ID | Filename | Status |
|---------|----------|--------|
| calc-27 | `spectral_theory.html` | ✅ |
| calc-28 | `rkhs.html` | ✅ |
| calc-29 | `topological_spaces.html` | ✅ |
| calc-30 | `lp_spaces.html` | ✅ |
| calc-31 | `lp_completeness.html` | ✅ |
| linalg-27 | `lie_groups.html` | ✅ |
| linalg-28 | `matrix_exponential.html` | ✅ |
| linalg-29 | `lie_algebras.html` | ✅ |
| linalg-30 | `lie_correspondence.html` | ✅ |
| prob-22 | `measure_probability.html` | ✅ |
| prob-23 | `limit_theorems_product_measures.html` | ✅ |

### Planned Pages (ID assigned)

| Page ID | Planned Filename | Status |
|---------|-----------------|--------|
| calc-32 | `fourier_hilbert.html` | Next |
| ml-13 | `graph_neural_networks.html` | Next |

### Planned Pages (ID deferred — assigned at drafting time)

| Series | Est. Pages | Planned Filenames | Status |
|--------|-----------|-------------------|--------|
| Smooth Manifolds (calc-XX) | ~3 | `smooth_manifolds.html`, `tangent_spaces.html`, `vector_fields_flows.html` | After ml-13 |
| Riemannian Metrics (calc-XX) | ~2 | `riemannian_metrics.html`, TBD | After manifold series |
| Representation Theory (linalg-XX) | ~3–4 | TBD | After manifold series |
| ml-14 | 1 | `equivariant_nn.html` | After representation theory |
| Quivers (disc-XX) | ~1 | `quivers.html` | Backlog |
| Category Theory (disc-XX) | ~2–3 | TBD | Backlog |
| DEC (disc-XX) | ~1–2 | TBD | Backlog |
| GDL Overview (ml-XX) | 1 | TBD | Backlog |
| CDL Overview (ml-XX) | 1 | TBD | Backlog |

---

## Reference Map: Books × Pages

Which books serve which pages. All references are listed on the site-wide index; this map tracks primary usage for development planning.

### Currently on index.html (18 books + 3 new additions)

| Book | Primary Pages (existing) | Primary Pages (planned) | Notes |
|------|-------------------------|------------------------|-------|
| Boyd & Vandenberghe — *Convex Optimization* | calc-07 (KKT), calc-08 (Duality) | — | Complete for current needs |
| Bronstein et al. — *Geometric Deep Learning* | Insight Boxes across site | ml-13 (GNN), ml-14 (Equivariant NN), ml-XX (GDL overview) | The "destination viewpoint" text; referenced but not followed as primary textbook |
| Cormen et al. — *Introduction to Algorithms* | disc-01~11 | — | Complete for current needs |
| **Conway — *A Course in Functional Analysis*** | **calc-23~28 (entire FA block), calc-30 (Lp construction), calc-31 (Lp completeness)** | **calc-32 (Fourier/Hilbert)** | **Primary reference for all of Section II advanced analysis** |
| Lay — *Linear Algebra and Its Applications* | linalg-01~10 | — | Complete for current needs |
| Diestel — *Graph Theory* | disc-01, disc-12 (Planar Graphs) | — | Complete for current needs |
| **Durrett — *Probability: Theory and Examples*** | prob-13 (Convergence) | **prob-22 (Measure-Theoretic Probability)** | **Primary reference for measure-theoretic probability; convergence theorems (MCT, DCT, Fatou)** |
| Gallian — *Contemporary Abstract Algebra* | linalg-15~22 (Groups through Integral Domains) | — | Complete for current needs |
| Horn & Johnson — *Matrix Analysis* | linalg-09~13 (SVD, Trace, Kronecker, etc.) | — | Complete for current needs |
| **Lee — *Introduction to Smooth Manifolds*** | calc-29 (Appendix A) | **calc-XX (Manifold series, Ch.1–3, 8), calc-XX (Riemannian)** | **Primary reference for the manifold track** |
| Menezes et al. — *Handbook of Applied Cryptography* | linalg-26 (Finite Fields) | — | Niche; only if crypto pages expand |
| Merris — *Combinatorics* | disc-02 (Combinatorics) | — | Complete for current needs |
| Murphy Book 1 — *Probabilistic ML: Introduction* | ml-01~08 | ml-13 (GNN) | General ML reference |
| Murphy Book 2 — *Probabilistic ML: Advanced* | ml-09~12 (NGD, VAE), prob-16 (FIM) | ml-14 (Equivariant NN) | Covers information geometry at applied level; sufficient until Amari is needed |
| O'Searcoid — *Metric Spaces* | calc-16~22 (entire Metric Spaces block) | — | Complete for current needs |
| Sipser — *Introduction to the Theory of Computation* | disc-05~09 (Automata through P vs NP) | — | Complete for current needs |
| **Stein & Shakarchi — *Fourier Analysis*** | calc-14, calc-15 (Fourier Series, FFT) | **calc-32 (Fourier in Hilbert Spaces — Plancherel, Riemann-Lebesgue)** | **Also covers Lp basics useful for calc-30/31** |
| **Stillwell — *Naive Lie Theory*** | linalg-24 (Geometry of Symmetry) | **linalg-27~30 (Lie Group Series)** | **Accessible intro; supplement with Lee Ch.7+ for rigorous treatment** |

### New additions to index.html

| Book | Primary Pages (planned) | Notes |
|------|------------------------|-------|
| **Edelsbrunner & Harer — *Computational Topology*** | disc-14 (Simplicial Complexes), disc-15 (Homology) — retroactive reference | Persistent homology / TDA if that track opens; primary CS-oriented topology text |
| **Fong & Spivak — *An Invitation to Applied Category Theory*** | **disc-XX (Quivers), disc-XX (Category Theory), ml-XX (CDL overview)** | **Primary reference for the applied category / CDL track; string diagrams covered here** |
| **Leinster — *Basic Category Theory*** | **disc-XX (Category Theory) — adjunctions, universal properties** | **Rigorous pure complement to Fong & Spivak; free PDF on arXiv** |

### Not yet on index.html (acquire when triggered)

| Book | Trigger | Pages |
|------|---------|-------|
| Amari — *Information Geometry and Its Applications* (2016) | After manifold series if information geometry page is planned | Future info geometry page; deepens ml-12 (NGD) |
| Nielsen & Chuang — *Quantum Computation and Quantum Information* (2010) | If a dedicated quantum computation page is planned | Future quantum pages; supplements calc-32 (Fourier/Hilbert) |

---

## Deferred Items (Non-Blocking)

These topics are explicitly deferred — not forgotten, but not on the critical path for 2026.

| Item | Why Deferred | Trigger to Revisit |
|------|--------------|-------------------|
| **Schwartz Space & Distributions** | Requires measure-theoretic machinery beyond calc-30; primarily needed for PDE theory | If a PDE or generalized function page is planned |
| **Pontryagin Duality** (Fourier on groups) | Elegant but requires locally compact abelian groups + Haar measure; far from current scope | After linalg-27~30 (Lie groups) + calc-32 (Fourier) + linalg-XX (representation theory), if harmonic analysis track emerges |
| **Spectral Theory of the Laplacian** (continuous) | Natural extension of calc-27 + calc-32; connects Fourier eigenfunctions to Laplace-Beltrami | After calc-XX (Riemannian Metrics), as bridge to geometric spectral theory |
| **Lp Duality via Radon-Nikodym** | Full proof of (Lp)* ≅ Lq requires Radon-Nikodym derivative | After prob-22 (Measure-Theoretic Probability) and calc-30/31 (Lp Spaces & Completeness) provide the foundation |
| **Conditional Expectation (Radon-Nikodym)** | Measure-theoretic conditional expectation, filtrations, martingale basics | After prob-22; if stochastic calculus or advanced Bayesian pages are planned |
| **Continuous-Time Stochastic Processes** | Brownian motion, Itô integral, SDEs; requires solid measure-theoretic probability | After prob-22; if physical AI, financial math, or diffusion model pages are planned |
| **Fiber Bundles & Gauge Theory** | Requires mature manifold theory + Lie groups (linalg-27~30) | If GDL viewpoint page demands gauge equivariance machinery |
| **String Diagrams** | Categorical tool; requires disc-XX (Category Theory) | After CDL viewpoint page is planned |
| **Variational Inference** | Implicit in ml-12 (VAE) but never formally isolated | Low priority; reassess after prob-22 arc settles |

---

## Key Learnings & Development Principles

1. **Notation Consistency is Non-Negotiable:**
   - Calligraphic letters for spaces: \(\mathcal{X}, \mathcal{Y}, \mathcal{Z}, \mathcal{H}, \mathcal{X}^*, \mathcal{X}^{**}\).
   - Functionals as \(\varphi\); operator norm as \(\|\varphi\|_{\mathcal{X}^*}\).
   - All new pages in Section II must match the notation established in calc-23~28.

2. **Cross-Page Linking:** Links must be verified against actual curriculum filenames and anchor IDs before inclusion.

3. **No In-Body Citations:** References are handled in a site-wide reference index only.

4. **Critical AI Usage:** Third-party AI suggestions must be evaluated critically, not accepted wholesale.

5. **Zero Tolerance for Proof Gaps:** Circular reasoning, incomplete definitions, and missing logical bridges must be explicitly addressed.

6. **Forward Links:** For unwritten pages, use descriptive text only (no `<a href>`). Convert to actual links only when the target page is created.

7. **Application Viewpoint Philosophy:** Use Insight Boxes and the knowledge map's Tessera to connect abstract theorems to applications without breaking formal proofs in the main text. Application domains (GDL, CDL, quantum) are introduced when tools are ready — not forced prematurely.

8. **Fisher Information vs. Hessian Distinction:** The real distinction is reparametrization invariance (Čencov's theorem) vs. loss-dependence and non-guaranteed positive definiteness — not "global vs. local."

9. **Theorem Numbering in LaTeX:** When environments share a counter, hardcoded numbers in Appendix/Discussion are fragile — use `\Cref{label}` throughout.

10. **Page Count Estimation:** Topics requiring new conceptual paradigms consistently expand to 3–4× initial estimates. Plan for expansion and defer ID assignment until drafting begins. The Lie group series (2 → 4 pages) is the baseline calibration.

---

## Changelog
- **4/21/2026:** calc-30 split into calc-30 + calc-31; Fourier/Hilbert renumbered to calc-32.
  - **Rationale:** Original calc-30 (`lp_spaces.html`, 1826 lines) covered both the construction of Lp as a normed space (Hölder, Minkowski) and the deep completeness theory (Riesz-Fischer, MCT/Fatou/DCT, convergence modes, applications). The size and conceptual bifurcation made it unwieldy and hard to reference precisely from downstream pages (prob-22/23, future Fourier).
  - **Split boundary:** calc-30 now ends at Minkowski's inequality (concluding with Lp as a normed space). calc-31 (`lp_completeness.html`) opens with the Riesz-Fischer theorem, develops the MCT/Fatou/DCT toolkit, and continues through the convergence-modes landscape and applications.
  - **Renumbering consequence:** Originally planned calc-31 (Fourier in Hilbert Spaces) → now calc-32. All downstream references (Peter-Weyl connection in linalg-XX; Pontryagin / Laplacian spectral / quantum in Deferred Items; Nielsen & Chuang trigger) updated.
  - **Note on the manifold series:** Historical 4/5/2026 changelog below references "calc-32 (Smooth Manifolds)" — that assignment was superseded even before this update (manifold series moved to `calc-XX` deferred IDs on 4/5). After this 4/21 update, calc-32 = Fourier in Hilbert Spaces; manifold series remains at calc-XX.
  - **Cross-section ref updates:** prob-22 (1 ref: MCT → lp_completeness), prob-23 (10 refs: all section/theorem anchors → lp_completeness) — all rewritten.
  - **curriculum.json:** calc-30 entry updated (title, keywords, description, sections trimmed); calc-31 entry added as parts[30] with prereqs=[calc-30, calc-23, calc-12, calc-19] and icon `Σ‖fₙ‖` (non-colliding within Section II). `reservedSlots` already had `{q:7, r:-3}` pre-allocated for this slot.
  - **Pattern confirmation:** This is a new instance of the "topics requiring new conceptual paradigms expand 2–4×" lesson. The Riesz-Fischer proof + convergence-mode landscape together constitute a distinct pedagogical unit that deserves its own page; the split was motivated not by mechanical length but by the conceptual separation between "normed structure" and "completeness theory."
  - **No change to total planned curriculum scope** — only re-partitioning of existing content plus a clean +1 page count from the split.
- **4/5/2026:** Major roadmap restructuring.
  - Reflected Lie group series expansion: linalg-27~30 (4 pages) now complete. linalg-27 (Lie Groups), linalg-28 (Matrix Exponential), linalg-29 (Lie Algebras), linalg-30 (Lie Correspondence).
  - Adopted deferred ID convention: unassigned future pages use XX instead of premature numbered IDs.
  - Planned manifold series split: calc-32 (Smooth Manifolds & Tangent Spaces) → calc-XX (~3 pages: Atlases, Tangent Spaces/Pushforward, Vector Fields/Flows). Riemannian metrics estimated at ~2 pages.
  - Representation theory (formerly linalg-29) deferred to linalg-XX (~3–4 pages), after manifold series.
  - Revised implementation order: linalg-27~30 → calc-31 → ml-13 → calc-XX (manifolds) → linalg-XX (rep. theory) → ml-14.
  - *(Superseded by 4/21/2026: calc-30 split into calc-30/31; Fourier/Hilbert renumbered to calc-32. Updated order: calc-30/31 (both complete) → calc-32 (Fourier) → ml-13 → manifolds → rep. theory → ml-14.)*
  - ml-13 elevated to pre-manifold position: introduces GDL principle and plants forward references to manifold series.
  - Added "Page Count Estimation" to Key Learnings.
  - Added Variational Inference to Deferred Items.
  - Updated page counts: 110 total (was 102).
- **3/31/2026:** Finished prob-22 and prob-23. Updated Schedule & Sprint Plan.
- **3/29/2026:** Finished calc-29 and calc-30.
- **3/28/2026:** Major roadmap revision following strategic review.
  - Replaced "three pillars / terminal goals" framing with "three application domains as viewpoints" philosophy.
  - Removed QML as a named destination; quantum computation emerges naturally from Fourier/Lp/spectral track.
  - Promoted calc-30 (Lp Spaces) and calc-31 (Fourier in Hilbert Spaces) to core curriculum.
  - Added prob-22 (Measure-Theoretic Probability) to Section III — bridges calc-11/12 (measure theory, Lebesgue) to prob-1~21 (classical probability). Scheduled concurrently with calc-30 in June.
  - Added Section V bridge pages: ml-13 (GNN), ml-14 (Equivariant NN) before GDL overview.
  - Restored Lee Gap Analysis table from March roadmap.
  - Restored and expanded Deferred Items with explicit triggers (added conditional expectation, continuous-time processes).
  - Replaced linear convergence diagram with web-of-mutual-reinforcement dependency map (now includes Section III).
  - Added Filename Registry for forward links.
  - Introduced linalg-27 (Lie Groups) into Phase 2 interleaved with analysis pages.
  - Added Reference Map: full book × page mapping for existing 18 references + 3 new additions (Edelsbrunner & Harer, Fong & Spivak, Leinster) + 2 future acquisitions (Amari, Nielsen & Chuang).
- **3/27/2026:** Verified curriculum to confirm 102 completed pages. Marked disc-12~15 complete.
- **3/20/2026:** Completed FA block (calc-24~28). Added Lee gap analysis and deferred items.
- **3/03/2026:** Consolidated Intro to Functional Analysis into calc-23. Added linalg-25, 26.
- **3/01/2026:** Added Section I-25, 26 (Algebraic Extensions, Finite Fields).