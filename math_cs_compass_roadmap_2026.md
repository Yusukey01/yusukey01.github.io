# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 2/02/2026  
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML, with the ultimate goal of covering **Geometric Deep Learning** — now a core paradigm in the AI industry (2026).

---

## Current Coverage (as of 2/02/2026)

### Section I: Linear Algebra to Algebraic Foundations (21 pages)
- **Core Linear Algebra (Parts 1-14):** Linear equations, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry, SVD, trace/norms, Kronecker products, Woodbury identity, stochastic matrices, graph Laplacians
- **Abstract Algebra (Parts 15-21):** Groups, cyclic/permutation groups, structural group theory (cosets, Lagrange, normal subgroups, isomorphism theorems), classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings
- **In Progress:** Integral domains (ED ⊂ PID ⊂ UFD hierarchy)

### Section II: Calculus to Optimization & Analysis (21 pages)
- **Derivatives (Parts 1-5):** Gradients, Jacobians, matrix calculus, scalar functions of matrices
- **Optimization (Parts 6-9):** Mean value theorem, gradient descent, Newton's method, constrained optimization (KKT)
- **Analysis (Parts 10-12):** Riemann integration, measure theory, Lebesgue integration
- **Fourier (Parts 14-15):** Fourier series, Fourier transform, FFT
- **Full analysis track(Part 16, 17, 18, 19, 20, 21 - in Prgress)** 

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

**Total: ~82 pages completed**

---

## Gap Analysis: Path to Geometric Deep Learning

### What's Missing

```
Current Foundation                    Missing for GDL
─────────────────────                ─────────────────
✅ Linear Algebra                    
✅ Groups (Abstract Algebra)         ❌ Lie Groups & Lie Algebras
✅ Metric Spaces (intro)             ❌ Analysis Track (Ch.13 Equivalence)
✅ Optimization                      
✅ Probability/Bayesian              
✅ Graph Laplacians                  ❌ Spectral Graph Theory (deeper)
✅ Fourier Transform                 ❌ Harmonic Analysis on Groups
                                     ❌ Smooth Manifolds
                                     ❌ Tangent Spaces & Differential Forms
                                     ❌ Riemannian Geometry
                                     ❌ Fiber Bundles & Gauge Theory
```

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

## Development Roadmap

### Phase 1: Complete Analysis Foundation (HIGH PRIORITY)
*Prerequisite for properly defining manifolds*

| Priority | Page | Content | Reference |
|----------|------|---------|-----------|
| 1 | Convergence & Boundedness | Sequences, convergence, Cauchy, bounds, diameter | Ó Searcóid Ch. 6-7 |
| 2 | Continuity | ε-δ, sequential, topological characterization, uniform continuity, Lipschitz | Ch. 8-9 |
| 3 | Completeness & Fixed-Point | Full treatment, Banach fixed-point theorem, completion | Ch. 10 |
| 4 | Connectedness | Connected sets, path-connectedness, IVT | Ch. 11 |
| 5 | Compactness | Open covers, sequential compactness, Heine-Borel, EVT | Ch. 12 |
| 6 | Homeomorphisms | Topological equivalence, toward manifolds | Ch. 13 |

**Estimated time:** 6 pages, 2-3 months

### Phase 2: Bridge to Geometry (HIGH PRIORITY)
*The critical path to Geometric DL*

| Priority | Page | Content |
|----------|------|---------|
| 7 | Topological Spaces | Beyond metric spaces, general topology |
| 8 | Smooth Manifolds | Charts, atlases, smooth structure |
| 9 | Tangent Spaces & Vectors | Tangent vectors, tangent bundle, gradients on manifolds |
| 10 | Lie Groups (intro) | Groups that are manifolds, SO(3), SE(3) |
| 11 | Lie Algebras | Tangent space at identity, exponential map |

**Estimated time:** 5 pages, 2-3 months

### Phase 3: Riemannian Geometry (MEDIUM-HIGH)
*Required for geodesics, natural gradients*

| Priority | Page | Content |
|----------|------|---------|
| 12 | Riemannian Metrics | Inner products on tangent spaces, distance on manifolds |
| 13 | Connections & Covariant Derivatives | Parallel transport, Levi-Civita connection |
| 14 | Geodesics | Shortest paths, geodesic equations |
| 15 | Curvature | Riemann curvature tensor, sectional curvature |

**Estimated time:** 4 pages, 2 months

### Phase 4: Geometric Deep Learning Applications (MEDIUM)
*Connect theory to modern architectures*

| Priority | Page | Content |
|----------|------|---------|
| 16 | Equivariant Neural Networks | Group equivariance, steerable CNNs |
| 17 | Message Passing & GNNs (geometric) | Geometric perspective on graph networks |
| 18 | Diffusion Models (geometric) | Score matching on manifolds |
| 19 | Natural Gradient & Information Geometry | Fisher metric, natural gradient descent |

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
| 🔄 | Integral Domains | In progress (ED ⊂ PID ⊂ UFD) |
| ❌ | Field Extensions | Extension fields, algebraic extensions, minimal polynomials |
| ❌ | Finite Fields | GF(p^n), applications to cryptography |
| ❌ | **Lie Groups** | Groups that are smooth manifolds |
| ❌ | Lie Algebras | Infinitesimal structure |

---

## Suggested Schedule (2026)

| Month | Track A (Algebra) | Track B (Analysis) |
|-------|-------------------|-------------------|
| Jan | Integral Domains | Metric Spaces (intro) ✅ |
| Feb | Field Extensions | Convergence & Boundedness　✅|
| Mar | Finite Fields | Continuity　✅|
| Apr | **Lie Groups (intro)** | Completeness ✅ |
| May | Lie Algebras | Connectedness ✅|
| Jun | — | Compactness ✅|
| Jul | — | Homeomorphisms |
| Aug | — | **Smooth Manifolds** |
| Sep | **CONVERGENCE: Lie Groups as Manifolds** |
| Oct+ | Riemannian Geometry, GDL Applications |

---

## Key References

### Analysis Track
- **Primary:** Ó Searcóid, *Metric Spaces* (Chapters 1-13)
- Supporting: Rudin, *Principles of Mathematical Analysis*

### Abstract Algebra Track
- **Primary:** Gallian, *Contemporary Abstract Algebra*
- Supporting: Dummit & Foote, *Abstract Algebra*

### Geometry Track (future)
- Lee, *Introduction to Smooth Manifolds*
- do Carmo, *Riemannian Geometry*
- Hall, *Lie Groups, Lie Algebras, and Representations*

### Geometric Deep Learning
- Bronstein et al., *Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges* (2021)

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
- Ch. 1-5: Metric spaces, distance, boundary, open/closed, balls (Completed)
- Ch. 6-7: Convergence, boundedness (Completed)
- Ch. 8-9: Continuity, Uniform Continuity, and Lipschitz Stability (Completed)
    * Classification: Contraction ($k \leq 1$) vs. Strong Contraction ($k < 1$) per Source.
    * Integration: Connection to WGAN stability and RL Bellman operators.
- Ch. 10: Completeness (Next Page)
    * Full treatment of Cauchy sequences and Banach Fixed-Point Theorem.
- Ch. 11: Connectedness
- Ch. 12: Compactness
- Ch. 13: Homeomorphisms

---

## Summary

**Goal:** Build rigorous mathematical foundations for Geometric Deep Learning

**Strategy:** Parallel development of Analysis track (toward manifolds) and Algebra track (toward Lie groups), converging at "Lie groups as smooth manifolds"

**Timeline:** ~15-19 additional pages needed, targeting completion by late 2026

**Key insight:** The algebra foundation (groups, rings) is already strong. The critical gap is the analysis track (convergence → manifolds) which must be completed to properly define geometric structures.
