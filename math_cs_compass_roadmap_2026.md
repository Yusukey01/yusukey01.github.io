# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 2/05/2026  
**Website:** https://math-cs-compass.com  

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML, with the ultimate goal of covering **Geometric Deep Learning** — now a core paradigm in the AI industry (2026).

---

## Current Coverage (as of 2/05/2026)

### Section I: Linear Algebra to Algebraic Foundations (24 pages)
- **Core Linear Algebra (Parts 1-14):** Linear equations, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry, SVD, trace/norms, Kronecker products, Woodbury identity, stochastic matrices, graph Laplacians
- **Abstract Algebra (Parts 15-22):** Groups, cyclic/permutation groups, structural group theory (cosets, Lagrange, normal subgroups, isomorphism theorems), classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, Integral domains (ED ⊂ PID ⊂ UFD hierarchy)
- **Field Theory (Parts 23-24):** Extension Fields (🔄 in progress), Geometry of Symmetry (Dihedral Groups, SO(3)/SE(3) introduction)
- **Upcoming:** Algebraic Extensions (GDL path), Finite Fields (Crypto path)

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

**Total: ~86 pages completed**

---

## Abstract Algebra Track: The Bifurcation

### Current Structure (Parts 15-24)

```
GROUPS (linalg-15 to 18) ✅
├── Introduction to Groups
├── Cyclic & Permutation Groups  
├── Structural Group Theory (Cosets, Lagrange, Normal Subgroups, Isomorphism Theorems)
└── Classification of Finite Abelian Groups

RINGS & DOMAINS (linalg-19 to 22) ✅
├── Rings & Fields (Introduction)
├── Ideals & Factor Rings
├── Polynomial Rings
└── Integral Domains (ED ⊂ PID ⊂ UFD)

FIELD EXTENSIONS (linalg-23 to 24) 🔄
├── Extension Fields (Ch 20 — SHARED FOUNDATION) 🔄
│   ├── Fundamental Theorem of Field Theory
│   ├── Splitting Fields
│   ├── Simple Extensions: F(a) ≅ F[x]/⟨p(x)⟩
│   └── Crossroads: Two Paths Forward
│
└── Geometry of Symmetry (linalg-24) ✅
    ├── Dihedral Groups D_n
    ├── SO(3) & SE(3) Introduction (with visualizers)
    └── Bridge to Manifolds & Lie Theory
```

### The Bifurcation: Two Paths from Extension Fields

```
                    Extension Fields (linalg-23)
                    ══════════════════════════════
                    │ Fundamental Theorem
                    │ Splitting Fields  
                    │ F(a) ≅ F[x]/⟨p(x)⟩
                    │ Crossroads: Two Paths
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │  ALGEBRAIC PATH     │         │   CRYPTO PATH       │
    │  (GDL Destination)  │         │   (Security Apps)   │
    └─────────────────────┘         └─────────────────────┘
              │                                 │
              ▼                                 ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │ algebraic_ext.html  │         │ finite_fields.html  │
    │ (linalg-25)         │         │ (linalg-26)         │
    │─────────────────────│         │─────────────────────│
    │ • Algebraic vs      │         │ • Classification:   │
    │   Transcendental    │         │   GF(p^n) exists    │
    │ • Degree [E:F]      │         │   and is unique     │
    │ • Finite Extensions │         │ • Cyclic mult group │
    │ • Tower Law:        │         │ • Subfield Lattice  │
    │   [K:F]=[K:E][E:F]  │         │ • Frobenius Auto    │
    │                     │         │ • Perfect Fields    │
    └─────────────────────┘         └─────────────────────┘
              │                                 │
              ▼                                 ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │ Lie Groups          │         │ Applied Crypto      │
    │ (convergence with   │         │ • AES (GF(2^8))     │
    │  Analysis track)    │         │ • ECC              │
    │                     │         │ • Reed-Solomon      │
    │ → Geometric DL      │         │ • Post-Quantum      │
    └─────────────────────┘         └─────────────────────┘
```

### Detailed Content: Algebraic Extensions (linalg-25)

**Chapter 21 from Gallian — GDL PATH**

| Section | Content | CS/AI Connection |
|---------|---------|------------------|
| Algebraic vs Transcendental | Definition, examples (√2 vs π) | Symbolic vs numeric computation |
| Degree of Extension [E:F] | dim_F(E) as vector space | **Dimension counting** for Lie groups |
| Finite Extensions | [E:F] < ∞ ⟹ algebraic | Decidability of algebraic operations |
| Tower Law | [K:F] = [K:E][E:F] | **Why SO(3) is 3D, SE(3) is 6D** |
| Algebraic Closure | Every polynomial splits | Universal computation environment |

**Key Theorem for GDL:**
The Tower Law explains why dimensions multiply when composing extensions — this is exactly why SE(3) = SO(3) ⋉ ℝ³ has dimension 3 + 3 = 6.

### Detailed Content: Finite Fields (linalg-26)

**Chapters 22 + Ch 20 extras — CRYPTO PATH**

| Section | Content | Application |
|---------|---------|-------------|
| Classification | GF(p^n) exists and is unique | Standard field for implementations |
| Cyclic Multiplicative Group | GF(p^n)* ≅ ℤ_{p^n-1} | Discrete log problem (ECC security) |
| Subfield Lattice | GF(p^m) ⊆ GF(p^n) ⟺ m \| n | Hierarchical code construction |
| Frobenius Automorphism | φ(a) = a^p generates Gal(GF(p^n)/GF(p)) | Efficient field arithmetic |
| **Zeros of Irreducibles** | Formal derivative (algebraic), Criterion for multiple zeros, Multiple zeros theorem | Moved from Ch 20 |
| Perfect Fields & Separability | Every irreducible is separable; f(x) has multiple zero ⟺ f(x) = g(x^p) | Why char 2 fields work cleanly for crypto |

**Key Applications:**
- **AES:** GF(2^8) with irreducible x^8 + x^4 + x^3 + x + 1
- **ECC:** Prime fields GF(p) or binary fields GF(2^m)
- **Reed-Solomon:** GF(2^8) for QR codes, GF(2^16) for storage

---

## Analysis Track: Path to Manifolds

### Current Structure

```
METRIC SPACES (calc-16 to 22) — Following Ó Searcóid
═══════════════════════════════════════════════════════════════════════
Part  | Title                    | Status   | Content
──────┼──────────────────────────┼──────────┼─────────────────────────
16    | Metric Spaces            | ✅ DONE  | Distance, boundary, open/closed
17    | Convergence & Boundedness| ✅ DONE  | Sequences, Cauchy, diameter
18    | Continuity               | ✅ DONE  | ε-δ, uniform, Lipschitz
19    | Completeness             | ✅ DONE  | Banach fixed-point theorem
20    | Connectedness            | ✅ DONE  | Path-connectedness, IVT
21    | Compactness              | ✅ DONE  | Open covers, Heine-Borel, EVT
22    | Homeomorphism            | 🔄 PROG  | Topological equivalence
═══════════════════════════════════════════════════════════════════════
```

### Upcoming: Functional Analysis Bridge

```
FUNCTIONAL ANALYSIS BRIDGE (calc-23 to 25) — NEW
═══════════════════════════════════════════════════════════════════════
Part  | Title                    | Status   | Content
──────┼──────────────────────────┼──────────┼─────────────────────────
23    | Normed & Banach Spaces   | ❌ TODO  | L^p spaces, completeness
24    | Hilbert Spaces & RKHS    | ❌ TODO  | Inner products, kernels
25    | Synthesis: Foundations   | ❌ TODO  | Big picture before manifolds
═══════════════════════════════════════════════════════════════════════
```

### Future: Geometry Track

```
GEOMETRY (calc-26 to 29) — Path to GDL
═══════════════════════════════════════════════════════════════════════
Part  | Title                    | Status   | Content
──────┼──────────────────────────┼──────────┼─────────────────────────
26    | Topological Spaces       | ❌ TODO  | Beyond metric spaces
27    | Smooth Manifolds         | ❌ TODO  | Charts, atlases
28    | Tangent Spaces           | ❌ TODO  | Tangent bundle, gradients
29    | Lie Groups & Algebras    | ❌ TODO  | Convergence point!
═══════════════════════════════════════════════════════════════════════
```

---

## The Convergence: Algebra Meets Analysis

```
ALGEBRA TRACK                              ANALYSIS TRACK
═══════════════                            ═══════════════
Groups (15-18)                             Metric Spaces (16-21)
    │                                           │
    ▼                                           ▼
Rings (19-22)                              Homeomorphisms (22)
    │                                           │
    ▼                                           ▼
Extension Fields (23)                      Banach/Hilbert (23-24)
    │                                           │
    ├── Algebraic Ext (25)                      │
    │       │                                   │
    │       ▼                                   ▼
    │   Geometry of Symmetry (24)          Synthesis (25)
    │   (D_n, SO(3), SE(3))                     │
    │       │                                   │
    │       └───────────┬───────────────────────┘
    │                   │
    │                   ▼
    │           ┌───────────────┐
    │           │  LIE GROUPS   │
    │           │  (calc-29)    │
    │           │───────────────│
    │           │ Groups that   │
    │           │ are Manifolds │
    │           └───────────────┘
    │                   │
    │                   ▼
    │           ┌───────────────┐
    │           │  GEOMETRIC    │
    │           │  DEEP         │
    │           │  LEARNING     │
    │           └───────────────┘
    │
    └── Finite Fields (26)
            │
            ▼
    ┌───────────────┐
    │  CRYPTOGRAPHY │
    │  & CODING     │
    └───────────────┘
```

---

## Updated Schedule (2026)

| Month | Track A (Algebra) | Track B (Analysis) |
|-------|-------------------|-------------------|
| Jan | Integral Domains ✅ | Metric Spaces (intro) ✅ |
| Feb | Extension Fields 🔄 | Convergence, Continuity ✅ |
| Mar | Geometry of Symmetry (D_n, SO/SE) ✅ | Completeness, Connectedness ✅ |
| Apr | Algebraic Extensions | Compactness ✅ |
| May | Finite Fields | Homeomorphisms 🔄 |
| Jun | — | **Normed & Banach Spaces** |
| Jul | — | **Hilbert Spaces & RKHS** |
| Aug | — | **Synthesis Page** |
| Sep | **Lie Groups (intro)** | **Topological Spaces** |
| Oct | Lie Algebras | **Smooth Manifolds** |
| Nov | — | Tangent Spaces |
| Dec | **CONVERGENCE: Lie Groups as Manifolds** |

---

## Page Index: Section I (Linear Algebra & Abstract Algebra)

| Part | Topic ID | Title | Status |
|------|----------|-------|--------|
| 1-14 | linalg-1 to 14 | Core Linear Algebra | ✅ |
| 15 | linalg-15 | Introduction to Groups | ✅ |
| 16 | linalg-16 | Cyclic & Permutation Groups | ✅ |
| 17 | linalg-17 | Structural Group Theory | ✅ |
| 18 | linalg-18 | Classification of Finite Abelian Groups | ✅ |
| 19 | linalg-19 | Rings & Fields | ✅ |
| 20 | linalg-20 | Ideals & Factor Rings | ✅ |
| 21 | linalg-21 | Polynomial Rings | ✅ |
| 22 | linalg-22 | Integral Domains | ✅ |
| 23 | linalg-23 | **Extension Fields** | 🔄 |
| 24 | linalg-24 | **Geometry of Symmetry** (D_n, SO/SE) | ✅ |
| 25 | linalg-25 | Algebraic Extensions (GDL path) | ❌ |
| 26 | linalg-26 | Finite Fields (Crypto path) | ❌ |

---

## Key References

### Abstract Algebra Track
- Gallian, *Contemporary Abstract Algebra*
  - Ch 20: Extension Fields (linalg-23)
  - Ch 21: Algebraic Extensions (linalg-25)
  - Ch 22: Finite Fields (linalg-26)

### Analysis Track
- Ó Searcóid, *Metric Spaces* (Chapters 1-13)
- Conway, *A Course in Functional Analysis*
- Kreyszig, *Introductory Functional Analysis with Applications*

### Geometry Track (future)
- Lee, *Introduction to Smooth Manifolds*
- Hall, *Lie Groups, Lie Algebras, and Representations*

### Geometric Deep Learning
- Bronstein et al., *Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges* (2021)

---

## Summary

**Goal:** Build rigorous mathematical foundations for Geometric Deep Learning

**Key Updates (2/05/2026):**
1. **Bifurcation Structure:** Extension Fields (linalg-23) is now the shared foundation, leading to:
   - **Algebraic Extensions (linalg-25):** Tower Law → Lie Groups → GDL
   - **Finite Fields (linalg-26):** GF(p^n) → Cryptography
2. **Geometry of Symmetry (linalg-24):** Dihedral groups + SO(3)/SE(3) visualizers bridge discrete algebra to continuous Lie theory
3. **Convergence Point:** Lie Groups (calc-29) where Algebra and Analysis tracks meet

**Timeline:** ~16-20 additional pages needed, targeting completion by early 2027

---

## Changelog

- **2/05/2026:** Restructured algebra track with bifurcation (Extension Fields → Algebraic Extensions OR Finite Fields). Added Geometry of Symmetry (linalg-24) with D_n, SO(3), SE(3). Updated page numbering.
- **2/03/2026:** Added Functional Analysis Bridge (Phase 1.5) with Banach spaces, Hilbert spaces, and synthesis page.
- **2/02/2026:** Initial roadmap with metric space focus.