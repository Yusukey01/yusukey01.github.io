# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 2/03/2026  
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML, with the ultimate goal of covering **Geometric Deep Learning** — now a core paradigm in the AI industry (2026).

---

## Current Coverage (as of 2/03/2026)

### Section I: Linear Algebra to Algebraic Foundations (22 pages)
- **Core Linear Algebra (Parts 1-14):** Linear equations, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry, SVD, trace/norms, Kronecker products, Woodbury identity, stochastic matrices, graph Laplacians
- **Abstract Algebra (Parts 15-22):** Groups, cyclic/permutation groups, structural group theory (cosets, Lagrange, normal subgroups, isomorphism theorems), classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, Integral domains (ED ⊂ PID ⊂ UFD hierarchy)
- **In Progress:** Part 23 Extension Fields

### Section II: Calculus to Optimization & Analysis (22 pages)
- **Derivatives (Parts 1-5):** Gradients, Jacobians, matrix calculus, scalar functions of matrices
- **Optimization (Parts 6-9):** Mean value theorem, gradient descent, Newton's method, constrained optimization (KKT)
- **Analysis (Parts 10-13):** Riemann integration, measure theory, Lebesgue integration
- **Fourier (Parts 14-15):** Fourier series, Fourier transform, FFT
- **Metric Space Analysis (Parts 16-21):** Metric spaces, convergence & boundedness, continuity (ε-δ, uniform, Lipschitz), completeness & Banach fixed-point, connectedness, compactness
- **In Progress:** Part 22 Homeomorphism

### Section III: Probability & Statistics (21 pages)
- **Foundations (Parts 1-2):** Basic probability, random variables
- **Distributions (Parts 3-5):** Gamma/Beta, Gaussian, Student's t
- **Multivariate (Parts 6-8):** Covariance, correlation, MVN, Dirichlet, Wishart
- **Inference (Parts 9-13):** MLE, hypothesis testing, linear regression, convergence
- **Bayesian (Parts 14-19):** Bayesian inference, exponential family, Fisher information, decision theory, Markov chains, Monte Carlo
- **Advanced (Parts 20-21):** Importance sampling, Gaussian processes

### Section IV: Discrete Mathematics & Algorithms (9 pages)
- Graph theory, combinatorics, automata theory, Boolean logic, context-free languages, Turing machines, time complexity, P vs NP

### Section V: Machine Learning (10 pages)
- Intro to ML, regularized regression, classification, neural networks, autodiff, SVM, PCA & autoencoders, clustering, deep neural networks (CNNs, transformers), reinforcement learning

**Total: ~84 pages completed**

---

## Gap Analysis: Path to Geometric Deep Learning

### What's Missing

```
Current Foundation                    Missing for GDL
─────────────────────                ─────────────────
✅ Linear Algebra                    
✅ Groups (Abstract Algebra)         ❌ Lie Groups & Lie Algebras
✅ Metric Spaces (Ch.1-12)           ❌ Homeomorphisms (Ch.13) 🔄
✅ Optimization                      ❌ Banach Spaces & L^p Theory
✅ Probability/Bayesian              ❌ Hilbert Spaces & RKHS
✅ Graph Laplacians                  ❌ Spectral Graph Theory (deeper)
✅ Fourier Transform                 ❌ Harmonic Analysis on Groups
                                     ❌ Smooth Manifolds
                                     ❌ Tangent Spaces & Differential Forms
                                     ❌ Riemannian Geometry
                                     ❌ Fiber Bundles & Gauge Theory
```

### Why Functional Analysis Matters (2026 Update)

Recent developments in AI/ML have made **Banach spaces** and **Hilbert spaces** increasingly critical:

| Area | Mathematical Structure | Why It Matters |
|------|----------------------|----------------|
| **Adversarial Robustness** | L^∞ norms, L^1 perturbations | Certified defenses require understanding non-L² norms |
| **Lipschitz Networks** | Banach space operators | 1-Lipschitz constraints in ℓ^∞ for robustness guarantees |
| **Neural Operators** | Banach-valued functions | Learning mappings between infinite-dimensional spaces |
| **Kernel Methods (RKHS)** | Hilbert space structure | Representer theorem, Gaussian processes, kernel PCA |
| **Operator Learning** | Banach space approximation | DeepONet, Fourier Neural Operators |
| **Diffusion Models** | L² function spaces | Score matching requires Hilbert space theory |

**Key insight:** L² (Hilbert) gets most attention, but L^1 and L^∞ are essential for robustness theory. A complete foundation requires understanding the full L^p family within Banach space theory.

### Why Geometric Deep Learning Matters (2026)

Geometric Deep Learning has moved from niche research to foundational paradigm:

| Area | Geometric Structure |
|------|---------------------|
| Graph Neural Networks (GNNs) | Graphs as discrete manifolds |
| Transformers | Attention on structured spaces |
| Equivariant Networks | Symmetry groups (SO(3), SE(3)) for proteins, molecules |
| Diffusion Models | Score functions on data manifolds |
| Latent Spaces (VAEs) | Learned manifold structure |
| Robotics / Control | Configuration spaces as manifolds |
| Physics-Informed ML | PDEs on manifolds |
| LLM Representations | Hyperbolic embeddings, representation geometry |

---

## The Space Hierarchy: Why This Order Matters

Understanding the relationships between mathematical spaces is essential for modern ML theory:

```
                         Vector Space
                              │
                              ▼
                        Normed Space
                         (has ‖·‖)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
        Banach Space                  Inner Product Space
      (complete normed)                   (has ⟨·,·⟩)
               │                             │
               │                  ┌──────────┘
               ▼                  ▼
          L^p spaces          Hilbert Space
        (L¹, L^∞, etc.)    (complete inner product)
                                  │
                                  ▼
                            L² space, RKHS

    ─────────────────────────────────────────────────────

         Metric Space ──→ Topological Space ──→ Manifold
```

**Why this matters for AI/ML:**
- **Banach spaces** (L^p for p ≠ 2) → Adversarial robustness, sparse regularization
- **Hilbert spaces** (L²) → Kernel methods, spectral theory, optimization
- **L² is special** — it's BOTH a Banach space AND a Hilbert space
- **Manifolds** require topological foundations built on metric/normed spaces

---

## Development Roadmap

### Phase 1: Complete Metric Space Foundation (NEARLY DONE)
*Following Ó Searcóid's Metric Spaces*

| Priority | Page | Content | Status |
|----------|------|---------|--------|
| 1 | Metric Spaces (Ch.1-5) | Distance, boundary, open/closed, balls | ✅ calc-16 |
| 2 | Convergence & Boundedness (Ch.6-7) | Sequences, Cauchy, bounds, diameter | ✅ calc-17 |
| 3 | Continuity (Ch.8-9) | ε-δ, uniform, Lipschitz, contractions | ✅ calc-18 |
| 4 | Completeness (Ch.10) | Banach fixed-point theorem, completion | ✅ calc-19 |
| 5 | Connectedness (Ch.11) | Path-connectedness, IVT | ✅ calc-20 |
| 6 | Compactness (Ch.12) | Open covers, Heine-Borel, EVT | ✅ calc-21 |
| 7 | Homeomorphisms (Ch.13) | Topological equivalence | 🔄 calc-22 |

### Phase 1.5: Functional Analysis Bridge (NEW - HIGH PRIORITY)
*Essential for modern ML theory*

| Priority | Page | Content | Topic ID |
|----------|------|---------|----------|
| 8 | **Normed & Banach Spaces** | Norms, completeness, L^p spaces (L¹, L², L^∞), dual spaces | calc-23 |
| | | *CS Applications:* Adversarial robustness (L^∞), sparse regularization (L¹), Lipschitz networks |
| 9 | **Inner Product & Hilbert Spaces** | Inner products, orthogonality, Riesz representation, projection theorem | calc-24 |
| | | *CS Applications:* RKHS preview, kernel methods foundation, Gaussian processes |
| 10 | **Synthesis: Foundations to Geometry** | The big picture recap, hierarchy diagram, transition to manifolds | calc-25 |
| | | *Connects:* Measure Theory + Metric Spaces + Algebra → Manifolds |

**Estimated time:** 3 pages, 1.5-2 months

### Phase 2: Bridge to Geometry (HIGH PRIORITY)
*The critical path to Geometric DL*

| Priority | Page | Content | Topic ID |
|----------|------|---------|----------|
| 11 | Topological Spaces | Beyond metric spaces, general topology, basis, continuity | calc-26 |
| 12 | Smooth Manifolds | Charts, atlases, smooth structure, examples (S², T²) | calc-27 |
| 13 | Tangent Spaces & Vectors | Tangent vectors, tangent bundle, gradients on manifolds | calc-28 |
| 14 | Lie Groups (intro) | Groups that are manifolds, SO(3), SE(3) | calc-29 |
| 15 | Lie Algebras | Tangent space at identity, exponential map | calc-30 |

**Estimated time:** 5 pages, 2-3 months

### Phase 3: Riemannian Geometry (MEDIUM-HIGH)
*Required for geodesics, natural gradients*

| Priority | Page | Content |
|----------|------|---------|
| 16 | Riemannian Metrics | Inner products on tangent spaces, distance on manifolds |
| 17 | Connections & Covariant Derivatives | Parallel transport, Levi-Civita connection |
| 18 | Geodesics | Shortest paths, geodesic equations |
| 19 | Curvature | Riemann curvature tensor, sectional curvature |

**Estimated time:** 4 pages, 2 months

### Phase 4: Geometric Deep Learning Applications (MEDIUM)
*Connect theory to modern architectures*

| Priority | Page | Content |
|----------|------|---------|
| 20 | Equivariant Neural Networks | Group equivariance, steerable CNNs |
| 21 | Message Passing & GNNs (geometric) | Geometric perspective on graph networks |
| 22 | Diffusion Models (geometric) | Score matching on manifolds |
| 23 | Natural Gradient & Information Geometry | Fisher metric, natural gradient descent |

**Estimated time:** 4 pages, 2 months

### Phase 5: Advanced Topics (LOWER PRIORITY)

| Page | Content |
|------|---------|
| Fiber Bundles | Principal bundles, gauge equivariance |
| Differential Forms | Exterior algebra, integration on manifolds |
| de Rham Cohomology | Topological invariants |

---

## Parallel Track: Abstract Algebra Completion

Alongside the analysis track, complete the algebraic foundations:

| Status | Page | Content |
|--------|------|---------|
| ✅ | Groups (linalg-15,16,17,18) | Complete |
| ✅ | Rings (linalg-19,20,21) | Complete |
| ✅ | Integral Domains (linalg-22) | ED ⊂ PID ⊂ UFD hierarchy |
| 🔄 | Extension Fields (linalg-23) | Extension fields, algebraic extensions, minimal polynomials |
| ❌ | Finite Fields (linalg-24) | GF(p^n), applications to cryptography |
| ❌ | **Lie Groups** | Groups that are smooth manifolds (convergence with Analysis track) |
| ❌ | Lie Algebras | Infinitesimal structure |

---

## Suggested Schedule (2026)

| Month | Track A (Algebra) | Track B (Analysis) |
|-------|-------------------|-------------------|
| Jan | Integral Domains ✅ | Metric Spaces (intro) ✅ |
| Feb | Extension Fields 🔄 | Convergence, Continuity ✅ |
| Mar | Extension Fields (cont.) | Completeness, Connectedness ✅ |
| Apr | Finite Fields | Compactness ✅ |
| May | — | Homeomorphisms 🔄 |
| Jun | — | **Normed & Banach Spaces** |
| Jul | — | **Hilbert Spaces & RKHS** |
| Aug | — | **Synthesis Page** |
| Sep | **Lie Groups (intro)** | **Topological Spaces** |
| Oct | Lie Algebras | **Smooth Manifolds** |
| Nov | — | Tangent Spaces |
| Dec | **CONVERGENCE: Lie Groups as Manifolds** |

---

## Detailed Content Outlines for New Pages

### calc-23: Normed Spaces & Banach Spaces

**Motivation:** Why do we need more structure than metric spaces?

**Core Content:**
1. **Normed Vector Spaces**
   - Definition: ‖·‖ satisfying positivity, homogeneity, triangle inequality
   - Every norm induces a metric: d(x,y) = ‖x - y‖
   - But not every metric comes from a norm!

2. **L^p Spaces**
   - Definition: ‖f‖_p = (∫|f|^p)^{1/p}
   - L¹: Total variation, sparse signals
   - L²: Energy, inner product structure (bridge to Hilbert)
   - L^∞: Supremum norm, worst-case bounds
   - Inclusion relations: L^∞ ⊂ L² ⊂ L¹ (on finite measure spaces)

3. **Banach Spaces**
   - Definition: Complete normed space
   - L^p spaces are Banach (Riesz-Fischer theorem)
   - Examples: ℓ^p sequence spaces, C[a,b] with sup norm

4. **CS Applications**
   - L^∞ robustness: Adversarial perturbations bounded by ‖δ‖_∞ ≤ ε
   - L¹ regularization: Sparsity-inducing penalties
   - Lipschitz networks: 1-Lipschitz in ℓ^∞ for certified robustness
   - Neural operators: Learning between Banach spaces

### calc-24: Inner Product Spaces & Hilbert Spaces

**Motivation:** Why is L² so special in ML?

**Core Content:**
1. **Inner Product Spaces**
   - Definition: ⟨·,·⟩ satisfying linearity, symmetry, positive-definiteness
   - Induced norm: ‖x‖ = √⟨x,x⟩
   - Cauchy-Schwarz inequality
   - Parallelogram law (characterizes inner product spaces)

2. **Hilbert Spaces**
   - Definition: Complete inner product space
   - L² is the canonical example
   - Orthogonality, orthonormal bases
   - Projection theorem

3. **Riesz Representation Theorem**
   - Every bounded linear functional comes from inner product
   - Foundation for kernel methods

4. **RKHS Preview**
   - Reproducing property: f(x) = ⟨f, K_x⟩
   - Connection to kernel methods (SVM, GP)
   - Why evaluation functionals must be bounded

5. **CS Applications**
   - Kernel trick: Implicit infinite-dimensional inner products
   - Gaussian processes: Functions as Hilbert space elements
   - L² loss: Why MSE is so natural
   - Spectral methods: Eigenfunction expansions

### calc-25: Synthesis — Foundations to Geometry

**Purpose:** Consolidate understanding before manifolds

**Core Content:**
1. **The Big Picture**
   - Three pillars: Analysis (metric/normed spaces) + Algebra (groups/rings) + Measure Theory
   - How they converge at manifolds

2. **What We've Built**
   - Metric spaces → Topological structure (open sets, continuity)
   - Normed/Banach → Linear structure + completeness
   - Hilbert → Geometric structure (angles, projections)
   - Groups → Symmetry structure

3. **Why Manifolds?**
   - Local Euclidean structure + global topology
   - Combining linear algebra (tangent spaces) with topology
   - Preview: Charts, atlases, smooth structure

4. **The Lie Group Convergence**
   - Groups that are also manifolds
   - Algebra track meets Analysis track
   - Examples: SO(3), SE(3) in robotics

---

## Key References

### Analysis Track
- Ó Searcóid, *Metric Spaces* (Chapters 1-13)
- John B. Conway, *A Course in Functional Analysis*, 2nd ed.
- Kreyszig, *Introductory Functional Analysis with Applications*

### Abstract Algebra Track
- Gallian, *Contemporary Abstract Algebra*

### Geometry Track (future)
- Lee, *Introduction to Smooth Manifolds*
- do Carmo, *Riemannian Geometry*
- Hall, *Lie Groups, Lie Algebras, and Representations*

### Geometric Deep Learning
- Bronstein et al., *Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges* (2021)

### Functional Analysis in ML (2024-2025 papers)
- Adcock et al., "Near-optimal learning of Banach-valued functions via deep neural networks" (2024)
- "Neural reproducing kernel Banach spaces and representer theorems for deep networks" (2024)
- "Universal approximation property of Banach space-valued random feature models" (2024)

---

## Technical Notes

### Website Structure
- Jekyll-based static site
- Centralized curriculum data in `curriculum.json`
- Hexagonal knowledge map visualization
- Schema.org LearningResource markup for SEO

### Content Guidelines
- Emphasize motivation and "why" before definitions
- Connect abstract concepts to ML/CS applications
- Use insight boxes for practical connections
- Avoid pure mathematical examples without application context
- Follow textbook chapter ordering for rigor

### Current Metric Spaces Page Structure
Following Ó Searcóid's *Metric Spaces* (Structural approach):
- Ch. 1-5: Metric spaces, distance, boundary, open/closed, balls ✅
- Ch. 6-7: Convergence, boundedness ✅
- Ch. 8-9: Continuity, Uniform Continuity, Lipschitz ✅
- Ch. 10: Completeness, Banach Fixed-Point ✅
- Ch. 11: Connectedness ✅
- Ch. 12: Compactness ✅
- Ch. 13: Homeomorphisms 🔄

### New Functional Analysis Pages Structure
Following Conway's *Functional Analysis* approach:
- Normed Spaces → Banach Spaces → L^p theory
- Inner Product Spaces → Hilbert Spaces → RKHS
- Synthesis page bridges to Lee's *Smooth Manifolds*

---

## Summary

**Goal:** Build rigorous mathematical foundations for Geometric Deep Learning

**Strategy:** 
1. Complete metric space foundation (Homeomorphisms)
2. **NEW:** Add functional analysis bridge (Banach & Hilbert spaces)
3. Parallel development of Analysis track (toward manifolds) and Algebra track (toward Lie groups)
4. Convergence at "Lie groups as smooth manifolds"

**Updated Timeline:** ~18-22 additional pages needed, targeting completion by early 2027

**Key insight:** The algebra foundation (groups, rings) is strong. The analysis track now includes proper functional analysis (Banach/Hilbert spaces) which is essential for understanding modern ML theory — particularly adversarial robustness, kernel methods, and neural operators. This investment in foundations will pay dividends when explaining Riemannian geometry and geometric deep learning applications.

---

## Changelog

- **2/03/2026:** Added Functional Analysis Bridge (Phase 1.5) with Banach spaces, Hilbert spaces, and synthesis page. Updated gap analysis to reflect importance of L^p spaces in modern AI. Revised schedule accordingly.
- **2/02/2026:** Initial roadmap with metric space focus.