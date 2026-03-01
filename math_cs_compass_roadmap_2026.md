# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 3/01/2026  
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML. 

Our ultimate destinations are the two pillars of next-generation AI architecture:
1. **Geometric Deep Learning (GDL):** Unifying network architectures through symmetry, invariance, and continuous manifolds (Lie Groups, Gauges).
2. **Categorical Deep Learning (CDL):** Unifying network operations through compositionality, structural abstraction, and discrete relationships (Category Theory, Quivers, String Diagrams).

---

## Current Coverage (as of 2/27/2026)

### Section I: Linear Algebra to Algebraic Foundations (26 pages)
- **Core Linear Algebra (Parts 1-14):** Linear equations, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry, SVD, trace/norms, Kronecker products, Woodbury identity, stochastic matrices, graph Laplacians
- **Abstract Algebra (Parts 15-22):** Groups, cyclic/permutation groups, structural group theory (cosets, Lagrange, normal subgroups, isomorphism theorems), classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, Integral domains (ED ⊂ PID ⊂ UFD hierarchy)
- **Field Theory (Parts 23-26):** Extension Fields, Geometry of Symmetry (Dihedral Groups, SO(3)/SE(3) introduction, Algebraic Extensions, Finite Fields)

### Section II: Calculus to Optimization & Analysis (22 pages)
- **Derivatives (Parts 1-5):** Gradients, Jacobians, matrix calculus, scalar functions of matrices
- **Optimization (Parts 6-9, 13):** Mean value theorem, gradient descent, Newton's method, constrained optimization (KKT), Duality
- **Analysis (Parts 10-12):** Riemann integration, measure theory, Lebesgue integration
- **Fourier (Parts 14-15):** Fourier series, Fourier transform, FFT
- **Metric Space Analysis (Parts 16-22):** Metric spaces, convergence & boundedness, continuity (ε-δ, uniform, Lipschitz), completeness & Banach fixed-point, connectedness, compactness, Metric Equivalence (Homeomorphism)

### Section III: Probability & Statistics (21 pages)
- **Foundations (Parts 1-2):** Basic probability, random variables
- **Distributions (Parts 3-5):** Gamma/Beta, Gaussian, Student's t
- **Multivariate (Parts 6-8):** Covariance, correlation, MVN, Dirichlet, Wishart
- **Inference (Parts 9-13):** MLE, hypothesis testing, linear regression, convergence
- **Bayesian (Parts 14-20):** Bayesian inference, exponential family, Fisher information, decision theory, Markov chains, Monte Carlo, Importance sampling
- **Stochastic Processes (Part 21):** Gaussian processes

### Section IV: Discrete Mathematics & Algorithms (9 pages completed, 8+ planned)
- **Computation & Logic (Parts 1-9):** Graph theory, combinatorics, automata theory, Boolean logic, context-free languages, Turing machines, time complexity, Eulerian/Hamiltonian, P vs NP
- **Upcoming (Topological & Categorical Track):** Network flows, Random walks, Discrete Geometry, Simplicial Complexes, Quivers, Category Theory.

### Section V: Machine Learning (12 pages)
- **Statistical Learning (Parts 1-3, 6):** Intro to ML, Regularized regression, Classification, SVM
- **Deep Learning (Parts 4-5, 9):** Neural networks, Automatic differentiation, Deep NN (CNNs/Transformers)
- **Unsupervised Learning (Parts 7-8):** PCA & Autoencoders, Clustering
- **Physical AI & Uncertainty (Parts 10-12):** Reinforcement learning, Natural Gradient Descent, Variational Autoencoders (VAE)

**Total: 90 pages completed**

---

## Section IV Expansion: Path to Topological & Categorical AI

Currently, Section IV covers classic theoretical computer science. To bridge the gap toward Geometric and Categorical Deep Learning, we will expand this section into advanced discrete structures.

| Part | Topic | CS/AI Connection |
|------|-------|------------------|
| **10** | **Network Flow** | Max-flow/Min-cut, foundational for discrete optimization. |
| **11** | **Random Walks on Graphs** | PageRank, connection to Graph Laplacians (linalg-14), diffusion models on discrete spaces. |
| **12** | **Discrete Geometry** | Convex hulls, Voronoi diagrams, Delaunay triangulations. Bridging continuous spaces to discrete meshes. |
| **13** | **Simplicial Complexes** | High-dimensional graph generalizations. Foundation for Topological Data Analysis (TDA) and Simplicial Neural Networks. |
| **14** | **Discrete Exterior Calculus (DEC)** | Discretizing differential forms. Essential for running physics/GDL on meshes (e.g., fluid dynamics on 3D objects). |
| **15** | **Introduction to Quivers** | Directed multigraphs and their representations. The discrete scaffolding for Category Theory. |
| **16** | **Category Theory Basics** | Objects, Morphisms, Functors, Natural Transformations. "The mathematics of mathematics." |
| **17** | **Monoidal Categories & String Diagrams** | The formal language of compositionality. The absolute foundation of **Categorical Deep Learning**. |

---

## The Grand Convergence: GDL and CDL

The entire MATH-CS COMPASS curriculum is designed to converge into two ultimate paradigms.

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
          │   Geometry of Symmetry (I)                Functional Analysis &
          │   (D_n, SO(3), SE(3))                     Differential Geometry (II)
          │       │                                        │
          │       └─────────────────┬──────────────────────┘
          │                         │
          │                         ▼
          │                 ┌───────────────┐
          │                 │  LIE GROUPS   │
          │                 │  & MANIFOLDS  │
          │                 └───────┬───────┘
          │                         │
          ▼                         ▼
┌───────────────────┐     ┌───────────────────┐
│ CATEGORICAL DEEP  │     │  GEOMETRIC DEEP   │
│ LEARNING (CDL)    │ ◀─▶ │  LEARNING (GDL)   │
│───────────────────│     │───────────────────│
│ • String Diagrams │     │ • Equivariance    │
│ • Functorial AI   │     │ • Gauge Theory    │
│ • Compositionality│     │ • Geodesics       │
└───────────────────┘     └───────────────────┘
          │                         │
          └────────────┬────────────┘
                       ▼
             ┌───────────────────┐
             │ PHYSICAL AI /     │
             │ AGI FOUNDATIONS   │
             └───────────────────┘
```

---

## Updated Schedule (2026)

| Month | Track A (Algebra / Discrete) | Track B (Analysis / ML) |
|-------|------------------------------|-------------------------|
| Jan | Integral Domains ✅ | Metric Spaces (intro) ✅ |
| Feb | Extension Fields, Geom of Symmetry ✅ | Convergence, Completeness, VAE ✅ |
| Mar | **Network Flow, Random Walks (IV)** | Metric Equivalence, Homeomorphisms ✅ |
| Apr | **Discrete Geometry, Simplicial Comp.** | Normed & Banach Spaces |
| May | Algebraic Extensions ✅ / Finite Fields ✅ | Hilbert Spaces & RKHS |
| Jun | **Intro to Quivers & Category Theory** | Synthesis Page |
| Jul | **String Diagrams (Categorical AI)** | Topological Spaces |
| Aug | Lie Algebras | Smooth Manifolds |
| Sep | - | Tangent Spaces |
| Oct | **CONVERGENCE: Lie Groups as Manifolds** | - |
| Nov | **Categorical Deep Learning Module** | **Geometric Deep Learning Module** |

---

## Key References

### Abstract Algebra & Category Theory Track
- Gallian, *Contemporary Abstract Algebra*
- Fong & Spivak, *Seven Sketches in Compositionality: An Invitation to Applied Category Theory*
- Bradley, Gavranović, et al., *Categorical Deep Learning: An Algebraic Theory of Architectures* (2024+)

### Discrete Geometry & TDA
- Edelsbrunner & Harer, *Computational Topology: An Introduction*
- Crane et al., *Discrete Differential Geometry: An Applied Introduction* (for DEC)

### Analysis & Geometry Track
- Ó Searcóid, *Metric Spaces*
- Lee, *Introduction to Smooth Manifolds*
- Hall, *Lie Groups, Lie Algebras, and Representations*

### Geometric Deep Learning
- Bronstein et al., *Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges* (2021)

---
## Summary

**Goal:** Build rigorous mathematical foundations converging into Geometric Deep Learning (GDL) and Categorical Deep Learning (CDL).

**Key Updates (2/27/2026):**
1. **Added CDL as a Pillar:** Category Theory and String Diagrams are now explicit goals alongside GDL, reflecting modern AI architectural theory.
2. **Section IV Overhaul:** Planned the expansion of Discrete Math into TDA (Simplicial Complexes), discrete geometry (DEC), and category theory (Quivers).
3. **Section V Restructuring:** Integrated Natural Gradient Descent and VAEs under the new "Physical AI" group, formalizing the link between manifolds, uncertainty, and embodiment.

**Timeline:** Continuous expansion targeting the GDL/CDL convergence by late 2026.

## Changelog
- **3/01/2026:** Added Section I-25, 26. 
- **2/16/2026:** Added Section V Part 11 Natural Gradient Descent
- **2/05/2026:** Restructured algebra track with bifurcation (Extension Fields → Algebraic Extensions OR Finite Fields). Added Geometry of Symmetry (linalg-24) with D_n, SO(3), SE(3). Updated page numbering.
- **2/03/2026:** Added Functional Analysis Bridge (Phase 1.5) with Banach spaces, Hilbert spaces, and synthesis page.
- **2/02/2026:** Initial roadmap with metric space focus.