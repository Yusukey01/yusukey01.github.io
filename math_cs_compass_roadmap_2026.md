# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 3/28/2026 
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

## Current Coverage (as of 4/27/2026)

### Section I: Linear Algebra to Algebraic Foundations (26 pages) ✅
- **Core Linear Algebra (14 pages):** Linear systems, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry/SVD, trace/norms, Kronecker, Woodbury, stochastic matrices, graph Laplacians.
- **Abstract Algebra (8 pages):** Groups, cyclic/permutation, structural group theory, classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, integral domains.
- **Field Theory (4 pages):** Extension fields, geometry of symmetry (Dₙ, SO(3), SE(3)), algebraic extensions, finite fields.

### Section II: Calculus to Optimization & Analysis (28 pages) ✅
- **Derivatives & Integration (9+3 pages):** Gradients, Jacobians, Newton's method, KKT, Duality, Riemann integration, measure theory, Lebesgue integration.
- **Fourier Analysis (2 pages):** Fourier series, Fourier transform & FFT.
- **Metric Spaces & Topology (7 pages):** Metric spaces, convergence, continuity, completeness, connectedness, compactness, metric equivalence (homeomorphism).
- **Functional Analysis (6 pages):** Banach & Hilbert spaces, bounded operators, dual spaces & Riesz representation, weak topologies & Banach-Alaoglu, spectral theory of compact operators, RKHS & kernel methods.

### Section III: Probability & Statistics (21 pages) ✅
- **Foundations & Inference:** Probability, distributions, covariance, MVN, MLE, hypothesis testing, linear regression.
- **Bayesian & Stochastic:** Bayesian inference, exponential family, Fisher information matrix, decision theory, Markov chains, Monte Carlo, importance sampling, Gaussian processes.

### Section IV: Discrete Mathematics & Algorithms (15 pages)
- **Computation & Graph Theory (11 pages):** Graph theory, combinatorics, automata, Boolean logic, context-free languages, Turing machines, time complexity, Eulerian/Hamiltonian, P vs NP, network flow, trees.
- **Discrete Topology Arc (4 pages) ✅:** Planar graphs (Euler's formula), incidence structure, simplicial complexes, intro to homology (Betti numbers, Euler-Poincaré).

### Section V: Machine Learning (12 pages) ✅
- **Foundations & Deep Learning:** Intro to ML, regularized regression, classification, SVM, neural networks, automatic differentiation, deep NN (CNNs/Transformers).
- **Unsupervised & Physical AI:** PCA & autoencoders, clustering, reinforcement learning, natural gradient descent, variational autoencoders (VAE).

**Total: 102 pages.**

---

## Dependency Map

Rather than a linear convergence diagram with terminal goals, the curriculum forms a **web of mutual reinforcement**. Each arrow represents prerequisite knowledge; each application viewpoint (marked with ◈) motivates return to deeper foundations.

```
SECTION I (Algebra)          SECTION II (Analysis)          SECTION III (Probability)     SECTION IV (Discrete)
═══════════════════          ═════════════════════          ═════════════════════════     ═════════════════════
Groups & Rings               Metric Spaces (calc-16~22)✅    Foundations & Inference       Graphs & Combinatorics
(linalg-15~22)✅                     │                       (prob-1~13) ✅                (disc-01~11)✅
     │                             │                              │                            │
Geometry of Symmetry✅        Functional Analysis            Bayesian & Stochastic         Planar Graphs & Euler
(linalg-24: Dₙ,SO(3),SE(3)) (calc-23~28: FA Block) ✅     (prob-14~21) ✅               (disc-12)✅
     │                             │                              │                            │
     │                       ┌─────┴──────────────┐              │                       Incidence & ∂₁
     │                       │                    │              │                       (disc-13)✅
     │                calc-29: Topological   calc-30: Lp         │                       Simplicial Complexes
     │                Spaces (axioms,        Spaces &            │                       (disc-14)✅
     │                basis, Hausdorff,      Riesz-Fischer       │                            │
     │                product/quotient)      (Hölder,            │                       Intro to Homology
     │                       │               Minkowski)          │                       (disc-15) ✅
     │                       │                    │              │                            │
     │                       │                    ├──────── prob-22: Measure-             │
     │                       │                    │         Theoretic Probability          │
     │                       │                    │         (RV as measurable fn,          │
     │                       │                    │          convergence thms,             │
     │                       │               calc-31:        Fubini)                       │
     │                       │               Fourier in           │                            │
     │                       │               Hilbert Spaces       │                            │
     ├───────────────────────┤                    │              │                            │
     │                       │                    │              │                            │
linalg-27: Lie Groups  calc-32: Smooth            │              │                       disc-16: Quivers
& Lie Algebras ◀──────▶ Manifolds &               │              │                       disc-17: Categories
     │                  Tangent Spaces             │              │                            │
     │                       │                    │              │                            │
linalg-28: Represent.  calc-33: Riemannian        │              │                       disc-18: Discrete
Theory (Intro)         Metrics & Geodesics        │              │                       Ext. Calculus (DEC)
     │                       │                    │              │                            │
     ▼                       ▼                    ▼              ▼                            ▼
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

                           SECTION V: Application Viewpoints
                           (each ◈ motivates return to deeper foundations)

  ◈ ml-13: Graph Neural Networks ← disc-15, linalg-14 (Graph Laplacian)
  ◈ ml-14: Equivariant Neural Networks ← linalg-24 (SO(3)/SE(3)), ml-13
  ◈ ml-15: GDL Overview ← calc-33, linalg-27, ml-14
  ◈ ml-16: CDL Overview ← disc-17 (Category Theory), ml-13
  ◈ Quantum computation topics ← calc-31 (Fourier/Hilbert), calc-27 (Spectral)
```

---

## Phase 2: Immediate Next Steps (May–July 2026)

### Section II — Pure Analysis & Topology

#### calc-29: Topological Spaces & Manifold Prerequisites
- **Status:** Skeleton complete (5 sections with detailed TODO comments).
- **Goal:** Bridge metric spaces (calc-16~22) to axiomatic topology. Prepare for Lee Ch. 1–2.
- **Sections:** From Metrics to Axioms → Bases & Countability → Hausdorff & Separation → Subspace/Product/Quotient Topologies → Paracompactness & Partitions of Unity.

#### calc-30: Lp Spaces & Riesz-Fischer
- **Goal:** Formalize completeness of function spaces, closing the proof debt from calc-25 (Hölder's inequality deferred) and grounding the Lp duality used throughout the FA block.
- **Topics:** Hölder's inequality (full proof), Minkowski's inequality, Riesz-Fischer theorem (completeness of Lp), complex Lp spaces.
- **Narrative:** Why probability, signal processing, and quantum mechanics all require a complete function space.

### Section III — Measure-Theoretic Probability

#### prob-22: Measure-Theoretic Probability
- **Timing:** Concurrent with calc-30 (June). calc-30 attacks Lp from the analysis side; prob-22 illuminates it from the probability side. Together they close the gap between calc-11/12 (measure & Lebesgue) and prob-1~21 (classical probability).
- **Goal:** Translate the measure-theoretic machinery of calc-11 (σ-algebras, probability measures) and calc-12 (Lebesgue integral, a.e./a.s.) into the language of Section III, providing the rigorous foundation that prob-1~13 assumed informally.
- **Prereqs:** calc-11 (Measure Theory), calc-12 (Lebesgue Integration), prob-2 (Random Variables), prob-13 (Convergence).
- **Sections:**
  1. **Random Variables as Measurable Functions** — \(X: (\Omega, \mathcal{F}) \to (\mathbb{R}, \mathcal{B})\); measurability condition \(X^{-1}(B) \in \mathcal{F}\). Distribution as pushforward measure \(P_X = \mathbb{P} \circ X^{-1}\). Connection to prob-2's intuitive definition.
  2. **Expectation as Lebesgue Integral** — Unify discrete sums and continuous integrals under \(\mathbb{E}[X] = \int X \, d\mathbb{P}\). PDF as Radon-Nikodym derivative \(f = dP_X / d\lambda\). Reinterpret prob-4 (Gaussian) and prob-9 (MLE) in this framework.
  3. **Convergence Theorems for Probability** — Monotone Convergence Theorem, Fatou's Lemma, Dominated Convergence Theorem — each with probabilistic interpretation (when can we exchange limits and expectations?). Connect to prob-13's modes of convergence (a.s., in probability, in distribution).
  4. **Independence and Product Measures** — σ-algebra independence as generalization of prob-1's \(P(A \cap B) = P(A)P(B)\). Product measure and Fubini's theorem (justifying interchange of integration order). Application: why i.i.d. sampling works.
- **Insight Box:** "\(X \in L^p\) means \(\mathbb{E}[|X|^p] < \infty\)" — preview of calc-30's Lp spaces as the natural home for random variables with finite moments. Hölder's inequality as a statement about moment conditions.

#### calc-31: Fourier Analysis in Hilbert Spaces
- **Goal:** Elevate Fourier analysis from engineering tools (calc-14, calc-15) to pure functional analysis.
- **Topics:** Plancherel's theorem (Fourier as unitary operator on L²), Riemann-Lebesgue lemma, Heisenberg's uncertainty principle as a mathematical theorem.
- **Connections:** calc-27 (spectral theory) provides the abstract framework; this page instantiates it concretely. Insight Boxes connect to quantum mechanics (unitary evolution, measurement) and signal processing (Nyquist-Shannon as a Hilbert space projection).

### Section I — Lie Groups

#### linalg-27: Lie Groups & Lie Algebras
- **Timing:** After calc-29 (needs quotient/product topology), interleaved with calc-30/31.
- **Goal:** Formalize the continuous symmetry groups previewed in linalg-24.
- **Topics:** Matrix Lie groups (GL, SL, O, SO, U, SU), the exponential map, Lie algebra as tangent space at identity, Lie brackets, one-parameter subgroups.
- **Prereqs:** linalg-24 (Geometry of Symmetry), calc-29 (topological spaces — specifically quotient topology for G/H).

### Section V — Bridge Pages Toward GDL

Rather than jumping from ml-12 (Natural Gradient Descent) directly to a "GDL" page, we insert bridge topics that build intuition progressively:

#### ml-13: Graph Neural Networks
- **Goal:** Show how discrete symmetry (permutation invariance) constrains network architecture.
- **Prereqs:** disc-15 (Homology — graph-level features), linalg-14 (Graph Laplacian — spectral convolution).
- **Key insight:** Message passing = local, permutation-equivariant aggregation. This is the simplest instance of the GDL principle.

#### ml-14: Equivariant Neural Networks
- **Goal:** Generalize from permutation invariance to continuous group equivariance (SO(3), SE(3)).
- **Prereqs:** linalg-24 (SO(3)/SE(3)), ml-13 (GNN as permutation-equivariant case).
- **Key insight:** "The architecture encodes the symmetry" — once this is clear, the reader naturally asks for a unifying framework.

At this point, readers have seen permutation equivariance (GNN), rotation/translation equivariance (Equivariant NN), and Riemannian structure (NGD). The unifying language is GDL — which becomes not a lesson to teach but a pattern the reader has already experienced.

---

## Phase 3: Manifolds & Confluence (Summer–Autumn 2026)

### Section II — Manifolds

#### calc-32: Smooth Manifolds & Tangent Spaces
- **Topics:** Topological manifolds, smooth structures (atlases & charts), tangent vectors as derivations, the tangent bundle, pushforwards.
- **Prereqs:** calc-29 (Hausdorff, second countable, paracompact).

#### calc-33: Riemannian Metrics & Geodesics
- **Topics:** Inner products on tangent spaces, metric tensor g, geodesics, Laplace-Beltrami operator Δ_g.
- **Prereqs:** calc-32, calc-25 (Riesz — musical isomorphisms extend to manifolds).

### Section I — Representation Theory

#### linalg-28: Representation Theory (Intro)
- **Topics:** Group representations, irreducible representations, Schur's lemma, character theory (finite groups).
- **Prereqs:** linalg-27 (Lie groups), linalg-22 (classification of finite abelian groups).
- **Connection:** Bridges to Peter-Weyl theorem (the "Fourier analysis on groups" story, linking back to calc-31).

### Section IV — Discrete Differential Geometry & Categories

#### disc-16: Quivers & Directed Graphs
- **Prereqs:** disc-01 (Graph Theory), linalg-15 (Groups — path algebras use group-like structure).
- **Timing:** After linalg-27/28 (representation theory provides richer context for quiver representations).

#### disc-17: Intro to Category Theory
- **Topics:** Categories, functors, natural transformations.
- **Prereqs:** disc-16 (quivers as motivating example), familiarity with multiple algebraic structures from Sections I–IV.

#### disc-18: Discrete Exterior Calculus & Hodge Theory
- **Goal:** Translate continuous calculus (calc-33) onto discrete meshes (disc-14).
- **Topics:** Discrete differential forms, cotangent weights, discrete Hodge star, Hodge decomposition (H_k ≅ ker Δ_k).
- **Prereqs:** disc-14 (simplicial complexes), calc-33 (Riemannian metrics).

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
| **Axiomatic topology (open-set axioms)** | ❌ Mentioned but not formal | Ch. 2 definition of manifold | **calc-29 §1** |
| **Basis for a topology, second countable** | ❌ | Ch. 2 (manifold definition) | **calc-29 §2** |
| **Hausdorff separation axiom** | ❌ | Ch. 2 (manifold definition) | **calc-29 §3** |
| **Product topology** | ❌ | Ch. 2 (products of manifolds) | **calc-29 §4** |
| **Quotient topology** | ❌ | Ch. 3 (quotient manifolds, Lie groups) | **calc-29 §4** |
| **Subspace (induced) topology** | ❌ Implicit | Ch. 2 (submanifolds) | **calc-29 §4** |
| **Paracompactness, partition of unity** | ❌ | Ch. 2 (existence of Riemannian metrics) | **calc-29 §5** |

---

## Updated Schedule (2026)

| Month | Section I (Algebra) | Section II (Analysis/Geometry) | Section III (Probability) | Section IV (Discrete) | Section V (ML) |
|-------|---------------------|-------------------------------|--------------------------|----------------------|----------------|
| **Mar** | Algebraic Ext / Finite Fields ✅ | FA Block (calc-24~28) ✅ | — | disc-12~14 (Simplicial) ✅ | — |
| **Apr** | — | — | — | disc-15 (Homology) ✅ | — |
| **May** | — | **calc-29** (Topological Spaces) | — | — | — |
| **Jun** | **linalg-27** (Lie Groups) | **calc-30** (Lp & Riesz-Fischer) | **prob-22** (Measure-Theoretic Probability) | — | — |
| **Jul** | — | **calc-31** (Fourier in Hilbert Spaces) | — | — | **ml-13** (GNN) |
| **Aug** | linalg-28 (Rep Theory) | **calc-32** (Smooth Manifolds) | — | — | ml-14 (Equivariant NN) |
| **Sep** | — | **calc-33** (Riemannian Metrics) | — | disc-16~17 (Quivers, Categories) | — |
| **Oct+** | — | — | — | disc-18 (DEC & Hodge) | GDL / CDL viewpoints |

**Notes on pacing:**
- May is dedicated to calc-29 alone — it is dense (5 substantial sections) and requires careful Lee reading.
- June is the busiest month: three independent tracks (linalg-27, calc-30, prob-22). calc-30 and prob-22 are complementary — the same Lp material viewed from analysis and probability respectively — so writing them in tandem is efficient. linalg-27 provides a change of pace.
- Manifold pages (calc-32, 33) are deliberately spaced — Lee Ch. 1–3 requires deep reading.
- Section IV resumes in September once the continuous geometry is mature enough for DEC to cross-reference.
- Section V bridge pages (ml-13, ml-14) can be written whenever their prerequisites are met; scheduled here as interleaving options.

---

## Deferred Items (Non-Blocking)

These topics are explicitly deferred — not forgotten, but not on the critical path for 2026.

| Item | Why Deferred | Trigger to Revisit |
|------|--------------|-------------------|
| **Schwartz Space & Distributions** | Requires measure-theoretic machinery beyond calc-30; primarily needed for PDE theory | If a PDE or generalized function page is planned |
| **Pontryagin Duality** (Fourier on groups) | Elegant but requires locally compact abelian groups + Haar measure; far from current scope | After linalg-27 (Lie groups) + calc-31 (Fourier), if harmonic analysis track emerges |
| **Spectral Theory of the Laplacian** (continuous) | Natural extension of calc-27 + calc-31; connects Fourier eigenfunctions to Laplace-Beltrami | After calc-33 (Riemannian Metrics), as bridge to geometric spectral theory |
| **Lp Duality via Radon-Nikodym** | Full proof of (Lp)* ≅ Lq requires Radon-Nikodym derivative | After prob-22 (Measure-Theoretic Probability) and calc-30 (Lp Spaces) provide the foundation |
| **Conditional Expectation (Radon-Nikodym)** | Measure-theoretic conditional expectation, filtrations, martingale basics | After prob-22; if stochastic calculus or advanced Bayesian pages are planned |
| **Continuous-Time Stochastic Processes** | Brownian motion, Itô integral, SDEs; requires solid measure-theoretic probability | After prob-22; if physical AI, financial math, or diffusion model pages are planned |
| **Fiber Bundles & Gauge Theory** | Requires mature manifold theory (calc-32, 33) + Lie groups (linalg-27) | If GDL viewpoint page demands gauge equivariance machinery |
| **String Diagrams** | Categorical tool; requires disc-17 (Category Theory) | After CDL viewpoint page is planned |

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

---

## Filename Registry (Forward Links)

| Page ID | Planned Filename | Status |
|---------|-----------------|--------|
| calc-27 | `spectral_theory.html` | Draft |
| calc-28 | `rkhs.html` | Draft |
| calc-29 | `topological_spaces.html` | Skeleton |
| calc-30 | `lp_spaces.html` | Planned |
| calc-31 | `fourier_hilbert.html` | Planned |
| calc-32 | `smooth_manifolds.html` | Planned |
| calc-33 | `riemannian_metrics.html` | Planned |
| linalg-27 | `lie_groups.html` | Planned |
| linalg-28 | `representation_theory.html` | Planned |
| prob-22 | `measure_probability.html` | Planned |
| ml-13 | `graph_neural_networks.html` | Planned |
| ml-14 | `equivariant_nn.html` | Planned |
| disc-16 | `quivers.html` | Planned |
| disc-17 | `category_theory.html` | Planned |
| disc-18 | `discrete_exterior_calculus.html` | Planned |

---

## Reference Map: Books × Pages

Which books serve which pages. All references are listed on the site-wide index; this map tracks primary usage for development planning.

### Currently on index.html (18 books + 3 new additions)

| Book | Primary Pages (existing) | Primary Pages (planned) | Notes |
|------|-------------------------|------------------------|-------|
| Boyd & Vandenberghe — *Convex Optimization* | calc-07 (KKT), calc-08 (Duality) | — | Complete for current needs |
| Bronstein et al. — *Geometric Deep Learning* | Insight Boxes across site | ml-13 (GNN), ml-14 (Equivariant NN), ml-15 (GDL overview) | The "destination viewpoint" text; referenced but not followed as primary textbook |
| Cormen et al. — *Introduction to Algorithms* | disc-01~11 | — | Complete for current needs |
| **Conway — *A Course in Functional Analysis*** | **calc-23~28 (entire FA block)** | **calc-30 (Lp), calc-31 (Fourier/Hilbert)** | **Primary reference for all of Section II advanced analysis** |
| Lay — *Linear Algebra and Its Applications* | linalg-01~10 | — | Complete for current needs |
| Diestel — *Graph Theory* | disc-01, disc-12 (Planar Graphs) | — | Complete for current needs |
| **Durrett — *Probability: Theory and Examples*** | prob-13 (Convergence) | **prob-22 (Measure-Theoretic Probability)** | **Primary reference for measure-theoretic probability; convergence theorems (MCT, DCT, Fatou)** |
| Gallian — *Contemporary Abstract Algebra* | linalg-15~22 (Groups through Integral Domains) | — | Complete for current needs |
| Horn & Johnson — *Matrix Analysis* | linalg-09~13 (SVD, Trace, Kronecker, etc.) | — | Complete for current needs |
| **Lee — *Introduction to Smooth Manifolds*** | — | **calc-29 (Topological Spaces, Appendix A), calc-32 (Smooth Manifolds, Ch.1-3), calc-33 (Riemannian Metrics)** | **Primary reference for the manifold track; calc-29 uses Appendix A exclusively** |
| Menezes et al. — *Handbook of Applied Cryptography* | linalg-26 (Finite Fields) | — | Niche; only if crypto pages expand |
| Merris — *Combinatorics* | disc-02 (Combinatorics) | — | Complete for current needs |
| Murphy Book 1 — *Probabilistic ML: Introduction* | ml-01~08 | ml-13 (GNN) | General ML reference |
| Murphy Book 2 — *Probabilistic ML: Advanced* | ml-09~12 (NGD, VAE), prob-16 (FIM) | ml-14 (Equivariant NN) | Covers information geometry at applied level; sufficient until Amari is needed |
| O'Searcoid — *Metric Spaces* | calc-16~22 (entire Metric Spaces block) | — | Complete for current needs |
| Sipser — *Introduction to the Theory of Computation* | disc-05~09 (Automata through P vs NP) | — | Complete for current needs |
| **Stein & Shakarchi — *Fourier Analysis*** | calc-14, calc-15 (Fourier Series, FFT) | **calc-31 (Fourier in Hilbert Spaces — Plancherel, Riemann-Lebesgue)** | **Also covers Lp basics useful for calc-30** |
| **Stillwell — *Naive Lie Theory*** | linalg-24 (Geometry of Symmetry) | **linalg-27 (Lie Groups & Lie Algebras)** | **Accessible intro; supplement with Lee Ch.7+ for rigorous treatment** |

### New additions to index.html

| Book | Primary Pages (planned) | Notes |
|------|------------------------|-------|
| **Edelsbrunner & Harer — *Computational Topology*** | disc-14 (Simplicial Complexes), disc-15 (Homology) — retroactive reference | Persistent homology / TDA if that track opens; primary CS-oriented topology text |
| **Fong & Spivak — *An Invitation to Applied Category Theory*** | **disc-16 (Quivers), disc-17 (Category Theory), ml-16 (CDL overview)** | **Primary reference for the applied category / CDL track; string diagrams covered here** |
| **Leinster — *Basic Category Theory*** | **disc-17 (Category Theory) — adjunctions, universal properties** | **Rigorous pure complement to Fong & Spivak; free PDF on arXiv** |

### Not yet on index.html (acquire when triggered)

| Book | Trigger | Pages |
|------|---------|-------|
| Amari — *Information Geometry and Its Applications* (2016) | After calc-32/33 (manifolds) if information geometry page is planned | Future info geometry page; deepens ml-12 (NGD) |
| Nielsen & Chuang — *Quantum Computation and Quantum Information* (2010) | If a dedicated quantum computation page is planned | Future quantum pages; supplements calc-31 (Fourier/Hilbert) |

---

## Changelog

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