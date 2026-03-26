# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 4/15/2026 (Reflecting completion of Homology arc, integration of Geometry, and restored development principles)  
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML. 

Our ultimate destinations are the two pillars of next-generation AI architecture:
1. **Geometric Deep Learning (GDL):** Unifying network architectures through symmetry, invariance, and continuous manifolds (Lie Groups, Gauges).
2. **Categorical Deep Learning (CDL):** Unifying network operations through compositionality, structural abstraction, and discrete relationships (Category Theory, Quivers, String Diagrams).

**Architectural Principle:** There is no isolated "Geometry" section. Geometric concepts are inherently distributed across our foundational sections: Algebraic structures (Lie Groups) belong to **Section I**, Continuous topological/metric structures (Smooth Manifolds) belong to **Section II**, and combinatorial/mesh structures (Simplicial Complexes, DDG) belong to **Section IV**. They synthesize in **Section V** (Machine Learning).

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

## The Grand Convergence: GDL and CDL

With the completion of `disc-15` (Intro to Homology), the discrete topology track is complete. We now systematically build the continuous and algebraic geometric layers within their respective sections before unifying them in Section V.

    SECTION IV (Discrete)                         SECTION II (Analysis/Topology)
    ═════════════════════                         ══════════════════════════════
    Planar Graphs & Euler (disc-12)               Metric Spaces & Topology (calc-16~22)
    Incidence & ∂₁ (disc-13)                      Measure Theory & Integrals (calc-10~12)
    Simplicial Complexes & ∂ₖ (disc-14)           Functional Analysis & RKHS (calc-23~28)
    Intro to Homology (disc-15) ✅                           │
              │                                              ▼
              │                            ┌─ TOPOLOGY & MANIFOLDS (Next) ─┐
              │                            │ calc-29: Topological Spaces   │
              │                            │ calc-30: Smooth Manifolds     │
              │                            │ calc-31: Riemannian Metrics   │
              │                            └───────────────┬───────────────┘
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
              ▼                            ▼
    ┌───────────────────┐        ┌───────────────────┐
    │ SECTION V (ML)    │        │ SECTION V (ML)    │
    │ ml-14: CATEGORICAL│        │ ml-13: GEOMETRIC  │
    │ DEEP LEARNING     │ ◀────▶ │ DEEP LEARNING     │
    └───────────────────┘        └───────────────────┘

---

## Immediate Next Steps (Phase 2: Continuous Geometry in Section II)

We pause Section IV and shift to Section II to prepare the continuous geometry required by **John M. Lee's *Introduction to Smooth Manifolds***.

### 1. `calc-29`: Topological Spaces & Manifold Prerequisites
- **Goal:** Bridge Metric Spaces (`calc-16~22`) to axiomatic topology.
- **Gap Analysis (What Lee requires vs. what we have):**
  *(Note: Open/closed sets, convergence, continuity, and compactness are already covered in calc-16~22).*
  The following pending concepts must be introduced:
  - Axiomatic definition of topology (open-set axioms)
  - Basis for a topology, second countability
  - Hausdorff (T₂) separation axiom
  - Product, Quotient, and Subspace (induced) topologies
  - Paracompactness and Partitions of Unity
- **Proposed Structure (1–2 Pages):**
  1. **Axiomatic Definition:** Why we generalize beyond metrics.
  2. **Basis & Second Countability:** Lindelöf properties.
  3. **Separation Axioms:** Why manifolds require Hausdorff.
  4. **Constructions:** Subspace, product, and quotient topologies (e.g., torus as quotient).
  5. **Paracompactness & Partitions of Unity:** Stitching local structures into global ones.

### 2. `calc-30`: Smooth Manifolds & Tangent Spaces
- **Goal:** Introduce the core objects of differential geometry.
- **Topics:** Topological manifolds, Smooth structures (Atlases & Charts), Tangent vectors (as derivations), The Tangent Bundle, Pushforwards (Differential).

### 3. `calc-31`: Riemannian Metrics & Geodesics
- **Goal:** Introduce geometry (distance, angles, curvature) on manifolds.
- **Topics:** Inner products on tangent spaces, The metric tensor ($g$), Geodesics, and the continuous Laplace-Beltrami operator $\Delta_g$.

---

## Phase 3: The Confluence (Summer 2026)

### Algebraic Geometry in Section I
- **`linalg-27`: Lie Groups & Lie Algebras**
  - Building on `linalg-24` (Geometry of Symmetry). Matrix Lie groups, the exponential map, Lie brackets, and the translation of continuous symmetries into linear algebra.

### Discrete Differential Geometry (DDG) in Section IV
- **`disc-18`: Discrete Exterior Calculus & Hodge Theory**
  - Translating `calc-31` (Continuous) onto `disc-14` (Simplicial Complexes).
  - Cotangent weights, the Discrete Hodge Star, and the Hodge Decomposition theorem ($H_k \cong \ker \Delta_k$).

### Category Theory in Section IV
- **`disc-16`: Quivers and Directed Graphs** (Bridge to categories).
- **`disc-17`: Intro to Category Theory** (Categories, Functors, Natural Transformations).

---

## Deferred & Optional Items (Non-Blocking)

These items were identified during the Functional Analysis block completion but are deferred to maintain momentum toward GDL/CDL.

### 1. Lebesgue Integration Supplement (Priority: Medium)
- **Context:** `calc-25` (Dual Spaces) references Hölder's inequality and Lₚ duality but defers the proof.
- **Content:** Hölder's/Minkowski's inequalities, Lₚ completeness (Riesz-Fischer), dual of Lₚ via Radon-Nikodym.
- **Placement:** New page `calc-12b` (between Lebesgue and Metric Spaces). 
- **Trigger:** Only if Lₚ duality detailed proof is strictly required for measure-theoretic probability.

### 2. Fourier Analysis in Pure Math (Priority: Low-Medium)
- **Context:** Current Fourier pages (`calc-14`, `calc-15`) are engineering-focused.
- **Content:** Plancherel Theorem (L² isometry of Fourier transform) and Riemann-Lebesgue Lemma. This cleanly applies `calc-23` (Hilbert spaces) and connects to `calc-27` (Spectral theory).
- **Placement:** New page `calc-15b`.
- **Trigger:** Natural pause between topology and manifolds.

---

## Updated Schedule (2026)

| Month | Sections I & IV (Algebra & Discrete) | Section II (Analysis / Geometry) | Section V (ML) |
|-------|--------------------------------------|----------------------------------|----------------|
| **Mar** | `disc-12`~`14` (Simplicial) ✅       | `calc-24`~`28` (FA Block) ✅     | — |
| **Apr** | `disc-15` (Homology) ✅              | —                                | — |
| **May** | —                                    | **`calc-29`** (Topological Spaces) <br> **`calc-30`** (Smooth Manifolds) | — |
| **Jun** | —                                    | **`calc-31`** (Riemannian Metrics) | — |
| **Jul** | **`linalg-27`** (Lie Groups) <br> **`disc-18`** (Discrete Ext. Calculus) | — | — |
| **Aug** | **`disc-16`~`17`** (Category Theory) | —                                | **`ml-13`** (GDL) |
| **Sep** | **`disc-19`** (String Diagrams)      | Fiber Bundles & Gauge Theory (Optional) | **`ml-14`** (CDL) |

**Optional Insertions Pipeline:**
- *Lebesgue supplement (Hölder/Minkowski)*: Insert if needed for advanced probability.
- *Fourier in L² (Plancherel)*: Insert after `calc-29` before Laplace-Beltrami if time permits.

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

---

## Changelog
- **4/15/2026:** Verified `curriculum_light.json` to confirm 102 completed pages. Officially marked `disc-12` ~ `disc-15` (Homology arc) as complete. Refined Architectural Alignment: Ensured geometric topics are strictly distributed across existing sections (Section I, II, IV) leading to convergence in Section V. Restored missing detailed requirements for `calc-29`, deferred tasks, and development principles from March planning.
- **3/20/2026:** Completed full Functional Analysis block (calc-24 through calc-28). Updated schedule to reflect completion and next phase (Topological Spaces → Lee preparation). Added gap analysis for Lee prerequisites. 
- **3/03/2026:** Consolidated Intro to Functional Analysis into `calc-23`. Added Section I-25, 26 (Algebraic Extensions, Finite Fields).