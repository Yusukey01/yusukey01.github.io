# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 3/03/2026  
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML. 

Our ultimate destinations are the two pillars of next-generation AI architecture:
1. **Geometric Deep Learning (GDL):** Unifying network architectures through symmetry, invariance, and continuous manifolds (Lie Groups, Gauges).
2. **Categorical Deep Learning (CDL):** Unifying network operations through compositionality, structural abstraction, and discrete relationships (Category Theory, Quivers, String Diagrams).

---

## Current Coverage (as of 3/03/2026)

### Section I: Linear Algebra to Algebraic Foundations (26 pages)
- **Core Linear Algebra:** Linear equations, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry, SVD, trace/norms, Kronecker products, Woodbury identity, stochastic matrices, graph Laplacians
- **Abstract Algebra:** Groups, cyclic/permutation groups, structural group theory, classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, Integral domains
- **Field Theory:** Extension Fields, Geometry of Symmetry (D_n, SO(3), SE(3)), Algebraic Extensions, Finite Fields

### Section II: Calculus to Optimization & Analysis (28 pages)
- **Derivatives & Optimization:** Gradients, Jacobians, matrix calculus, Newton's method, KKT, Duality
- **Analysis & Measure Theory:** Riemann integration, measure theory, Lebesgue integration
- **Fourier Analysis:** Fourier series, Fourier transform, FFT
- **Metric Space Analysis:** Metric spaces, convergence, continuity, completeness, connectedness, compactness, Metric Equivalence (Homeomorphism)
- **Functional Analysis (Intro):** Banach & Hilbert Spaces, Lp Spaces, Geometry of Unit Balls
- **Functional Analysis (Advanced):** Bounded Operators, Dual Spaces, Riesz Representation, Weak Topologies, Spectral Theory, RKHS **(NEW)**

### Section III: Probability & Statistics (21 pages)
- **Foundations & Distributions:** Basic probability, random variables, Gamma/Beta, Gaussian, Student's t
- **Multivariate & Inference:** Covariance, correlation, MVN, Dirichlet, Wishart, MLE, hypothesis testing, linear regression, convergence
- **Bayesian & Stochastic:** Bayesian inference, exponential family, Fisher information, decision theory, Markov chains, Monte Carlo, Importance sampling, Gaussian processes

### Section IV: Discrete Mathematics & Algorithms (9 pages completed, 8+ planned)
- **Computation & Logic:** Graph theory, combinatorics, automata theory, Boolean logic, context-free languages, Turing machines, time complexity, Eulerian/Hamiltonian, P vs NP
- **Upcoming (Topological & Categorical Track):** Network flows, Random walks, Discrete Geometry, Simplicial Complexes, Quivers, Category Theory.

### Section V: Machine Learning (12 pages)
- **Foundations & Deep Learning:** Intro to ML, Regularized regression, Classification, SVM, Neural networks, Automatic differentiation, Deep NN (CNNs/Transformers)
- **Unsupervised & Physical AI:** PCA & Autoencoders, Clustering, Reinforcement learning, Natural Gradient Descent, Variational Autoencoders (VAE)

**Total: 96 pages completed**

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

## Section II Expansion: The Functional Analysis Bridge (calc-24 ~ calc-28)

This block fills the critical gap between basic Linear Algebra/Calculus and the rigorous Differential Geometry needed for Geometric Deep Learning.

**calc-24: Bounded Linear Operators**
*   **Key Concepts:** Bounded Linear Operator, Operator Norm, Space B(X,Y).
*   **Author's Note / Idea:** 
    *   Strictly **avoid** the term "Linear Manifold" for affine subspaces here. In modern GDL contexts, "Manifold" implies curved topological manifolds. Using it for flat subspaces will cause massive confusion later. 
    *   Emphasize that operators are "infinite-dimensional matrices" and the norm measures their "gain" or "stretch."

**calc-25: Dual Spaces & Riesz Representation**
*   **Key Concepts:** Linear Functional, Dual Space X*, Riesz Representation Theorem, Bra-ket notation.
*   **Author's Note / Idea:** 
    *   *Crucial for GDL:* Establish that gradients are **covectors** (elements of dual space), not vectors. 
    *   The Riesz theorem is the mathematical machinery (Musical Isomorphisms $\sharp, \flat$) that converts a covector into a vector using the inner product (metric). This is the direct prerequisite for understanding Tangent vs. Cotangent spaces.

**calc-26: Weak Topologies & Banach-Alaoglu**
*   **Key Concepts:** Weak Convergence, Weak* Topology, Banach-Alaoglu Theorem, Reflexive Space.
*   **Author's Note / Idea:** 
    *   *Optimization Connection:* In infinite dimensions (function spaces), the unit ball isn't compact in the strong norm. 
    *   We introduce Weak topologies to "weaken" the criteria for convergence, recovering compactness (Banach-Alaoglu) to guarantee that optimization problems (like finding the best neural network function) actually have solutions.

**calc-27: Spectral Theory of Compact Operators**
*   **Key Concepts:** Compact Operator, Spectrum, Adjoint Operator, Spectral Theorem.
*   **Author's Note / Idea:** 
    *   This is the infinite-dimensional generalization of SVD/Eigendecomposition. 
    *   It explains why we can perform spectral analysis on continuous operators (like the Manifold Laplacian) just like we do on discrete matrices.

**calc-28: RKHS & Kernel Methods**
*   **Key Concepts:** Reproducing Kernel Hilbert Space, Kernel Trick, Mercer's Theorem.
*   **Author's Note / Idea:** 
    *   *The Grand Synthesis:* Use the tools from 24-27 (Boundedness, Riesz, Spectral) to fully explain why Kernel Methods (SVMs, GPs) work mathematically.
    *   This closes the loop on classical ML theory before moving to Manifolds.

---

## Updated Schedule (2026)

| Month | Track A (Discrete / Category) | Track B (Analysis / Geometry) |
|-------|-------------------------------|-------------------------------|
| **Mar** | **Algebraic Ext / Finite Fields** ✅ | **Functional Analysis (calc-24 to 28)** 🔄 |
| **Apr** | Network Flow, Random Walks | Topological Spaces |
| **May** | Discrete Geom, Simplicial Complexes | Smooth Manifolds & Tangent Spaces |
| **Jun** | Intro to Quivers & Category Theory | Riemannian Metrics & Geodesics |
| **Jul** | Monoidal Categories | Lie Groups & Lie Algebras |
| **Aug** | String Diagrams (Categorical AI) | Fiber Bundles & Gauge Theory |
| **Sep** | - | **GEOMETRIC DEEP LEARNING (GDL)** |
| **Oct** | **CATEGORICAL DEEP LEARNING (CDL)**| - |

---

## Changelog
- **3/03/2026:** Inserted the **Functional Analysis Block (calc-24 to calc-28)** into Section II. 
    - Added specific pedagogical notes: "Avoid 'Linear Manifold'", "Gradient is a Covector", "Weak Topology for Optimization Existence", and "Riesz as Musical Isomorphism".
- **3/03/2026:** Consolidated Intro to Functional Analysis into `calc-23`.
- **3/01/2026:** Added Section I-25, 26 (Algebraic Extensions, Finite Fields).


