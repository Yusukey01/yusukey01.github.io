# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 5/9/2026 
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

## Current Coverage (as of 5/9/2026)

### Section I: Linear Algebra to Algebraic Foundations (30 pages) ✅
- **Core Linear Algebra (14 pages):** Linear systems, transformations, matrix algebra, determinants, vector spaces, eigenvalues, orthogonality, least squares, symmetry/SVD, trace/norms, Kronecker, Woodbury, stochastic matrices, graph Laplacians.
- **Abstract Algebra (8 pages):** Groups, cyclic/permutation, structural group theory, classification of finite abelian groups, rings & fields, ideals & factor rings, polynomial rings, integral domains.
- **Field Theory & Continuous Symmetry (8 pages):** Extension fields, geometry of symmetry (Dₙ, SO(3), SE(3)), algebraic extensions, finite fields, Lie groups, matrix exponential, Lie algebras & bracket, Lie correspondence.

### Section II: Calculus to Optimization & Analysis (31 pages) ✅
- **Derivatives & Integration (9+3 pages):** Gradients, Jacobians, Newton's method, KKT, Duality, Riemann integration, measure theory, Lebesgue integration.
- **Fourier Analysis (2 pages):** Fourier series, Fourier transform & FFT.
- **Metric Spaces & Topology (8 pages):** Metric spaces, convergence, continuity, completeness, connectedness, compactness, metric equivalence (homeomorphism), topological spaces.
- **Functional Analysis (8 pages):** Banach & Hilbert spaces, bounded operators, dual spaces & Riesz representation, weak topologies & Banach-Alaoglu, spectral theory of compact operators, RKHS & kernel methods, Lp spaces (construction & inequalities), Lp completeness & convergence (Riesz-Fischer, MCT/Fatou/DCT, convergence modes).

### Section III: Probability & Statistics (26 pages as of 5/9/2026, Phase 2c complete)
- **Foundations & Inference:** Probability, distributions, covariance, MVN, MLE, hypothesis testing, linear regression.
- **Bayesian & Stochastic:** Bayesian inference, exponential family, Fisher information matrix, decision theory, Markov chains, Monte Carlo, importance sampling, Gaussian processes.
- **Measure-Theoretic Probability (5 pages, Phase 2c closed 5/9/2026):** Random variables as measurable functions, expectation as Lebesgue integral, convergence theorems, limit theorems & product measures, **Radon-Nikodym theorem (prob-24, completed 4/22/2026, refined 5/4/2026)**, **Conditional expectation (prob-25, completed 5/4/2026)**, **Variational Inference (prob-26, completed 5/9/2026)**. **Phase 2e** (Stochastic Calculus) and the demoted Regular Conditional Distributions remain trigger-based — Section III now matches the graduate-level depth already achieved in Sections I (Lie theory) and II (Functional Analysis block).

### Section IV: Discrete Mathematics & Algorithms (15 pages)
- **Computation & Graph Theory (11 pages):** Graph theory, combinatorics, automata, Boolean logic, context-free languages, Turing machines, time complexity, Eulerian/Hamiltonian, P vs NP, network flow, trees.
- **Discrete Topology Arc (4 pages) ✅:** Planar graphs (Euler's formula), incidence structure, simplicial complexes, intro to homology (Betti numbers, Euler-Poincaré).

### Section V: Machine Learning (12 pages) ✅
- **Foundations & Deep Learning:** Intro to ML, regularized regression, classification, SVM, neural networks, automatic differentiation, deep NN (CNNs/Transformers).
- **Unsupervised & Physical AI:** PCA & autoencoders, clustering, reinforcement learning, natural gradient descent, variational autoencoders (VAE).

**Total: 112 pages.**

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
     │                Spaces ✅              Construction ✅    │                       (disc-14)✅
     │                       │                    │              │                            │
     │                       │             calc-31: Lp           │                       Intro to Homology
     │                       │             Completeness ✅       │                       (disc-15) ✅
     │                       │                    │              │                            │
     │                       │                    ├──────── prob-22&23: Measure-              │
     │                       │                    │         Theoretic Prob. ✅✅             │
     │                       │                    │              │                            │
     │                       │               calc-32:            │                            │
     │                       │               Fourier in          │                            │
     │                       │               Hilbert Spaces      │                            │
     ├───────────────────────┤                    │              │                            │
     │                       │                    │              │                            │
Lie Group Series        calc-XX (~3 pp):          │              │                       disc-XX: Quivers
(linalg-27~30) ✅       Smooth Manifolds          │              │                      disc-XX: Categories
     │            ◀────▶ (Atlases, Tangent       │              │                            │
     │                   Spaces, Vector Fields)   │              │                            │
     │                       │                    │              │                            │
     │                  calc-XX (~2 pp):          │              │                       disc-XX: Discrete
     │                  Riemannian Metrics        │              │                       Ext. Calculus (DEC)
     │                  & Curvature               │              │                            │
     │                       │                    │              │                            │
linalg-XX (~3-4 pp):         │                    │              │                            │
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

## Phase 2b: Current & Near-Term Work

### calc-32: Fourier Analysis in Hilbert Spaces (1 page)
Capstone page synthesising existing machinery rather than introducing new foundations: Plancherel (Fourier as unitary on L²), Riemann-Lebesgue, Heisenberg uncertainty as mathematical theorem. Insight Boxes connect to quantum mechanics (unitary evolution, measurement) and signal processing (Nyquist-Shannon as Hilbert space projection). All heavy prereqs done (calc-23, 25, 27, 31, prob-22 DCT); group-theoretic / Peter-Weyl deferred to post-rep-theory.

### ml-13: Graph Neural Networks (1 page)
Introduces the GDL principle in its simplest form: message passing = local, permutation-equivariant aggregation. Plants forward references to the manifold series — when the reader asks "what about continuous symmetries? curved spaces?", the manifold pages answer. **Prereqs:** disc-15 (graph-level features), linalg-14 (Graph Laplacian — spectral convolution).

---

## Phase 2c–2e: Section III Measure-Theoretic Deepening (May 2026 onward)

**Fubini/Tonelli placement decision:** retained in Section III (prob-23) rather than Section II. Justification: narrative cohesion (i.i.d. sampling and product measures are the natural consumer); compass-map three-node cluster (calc-30 ↔ prob-22 ↔ prob-23) visually anchors the measure-theoretic tools across Section II/III; functional usage concentrated in probability/statistics/ML. Future Section II pages (e.g., calc-32 Fourier) that need Fubini ref-link to prob-23.

### Plateaus (the "viewpoint" payoff for each phase)

- **Phase 2c plateau ✅ (realized 5/9/2026):** Bayesian rigor + Lp duality closure + KL regularization foundation (RLHF) + VAE/ELBO rigorous treatment + amortized inference + connection to diffusion models as hierarchical VI.
- **Phase 2e plateau:** Diffusion model SDE foundation, score matching, Neural SDE / Neural ODE.

These plateaus collectively unlock the modern ML frontier (as of 2026): Bayesian Neural Networks, RLHF/DPO alignment, score-based diffusion, flow matching, and the information-theoretic bounds relevant to PAC-Bayes generalization.

---

### Phase 2c: Radon-Nikodym Track (3 pages — all complete ✅, closed 5/9/2026)

#### prob-24: Signed Measures & Radon-Nikodym Theorem ✅ (4/22/2026, refined 5/4/2026, 1253 lines, `radon_nikodym.html`)
- **Note for downstream pages:** `T-foo_bar` / `D-foo_bar` underscore anchor convention adopted concurrently with prob-24; pre-prob-24 pages retain hyphen anchors.

#### prob-25: Conditional Expectation ✅ (5/4/2026, 956 lines, `conditional_expectation.html`)
- **Honest-framing convention (calibration anchor for all subsequent ML-bridge pages):** §1 fourth paragraph and §4 closing observation paragraph establish "in idealised form X; in practice approximated by Y; the rigorous existence licenses the construction" + the meta-observation that "this is a fact about today's implementations, not a verdict on the necessity of the underlying mathematics" (with the historical analogy of Hilbert spaces preceding QM and measure theory preceding modern probability).

#### prob-26: Variational Inference ✅ (5/9/2026, 1191 lines, `variational_inference.html`)
- **Open backlog:** vae.html ELBO + reparameterization sections to be retrofitted with ref-links to prob-26's `D-elbo`, `T-elbo_lower_bound`, `T-reparameterization_gradient`. Tracked separately from Phase 2c.

**Phase 2c outcome (closed 5/9/2026):** Resolves deferred items #340 (Lp duality), #341 (Conditional Expectation), #345 (VI foundation). Regular Conditional Distributions remains demoted to trigger-based future work; prob-26 covers the variational *workaround* (q-tractable approximation under density assumption), which is the path actually taken in modern ML.

---

### Phase 2e: Stochastic Calculus Light (estimated ~2–3 pages, timing TBD, page IDs deferred)

**Goal:** Provide the continuous-time stochastic foundation required for modern generative AI (score-based diffusion, Neural SDE, continuous-time RL). Diffusion models are the dominant generative-AI paradigm as of 2026; without Phase 2e, the curriculum cannot rigorously bridge to this frontier.

**Scope "light":** Brownian motion construction, Itô integral (basic + key properties), Itô's lemma, SDE as solution concept, Fokker-Planck for marginal density. **Excluded:** Stratonovich (brief mention only), Malliavin calculus, jump processes, stochastic control.

#### prob-XX: Brownian Motion — Construction & Properties (`brownian_motion.html`, ~1 page; may split)
- **Topics:** BM axioms (Gaussian increments, independence, continuity), existence (Kolmogorov extension + Kolmogorov-Čentsov continuity, or Lévy-Ciesielski), quadratic variation, nowhere-differentiable paths.
- **Retroactive closure:** prob-23 Kolmogorov extension forward-reference materializes here.

#### prob-XX: Itô Integral & Itô's Lemma (`ito_integral.html`, ~1 page)
- **Topics:** Predictable processes, Itô integral for elementary processes then L² isometry extension, Itô's lemma (1D), SDE existence and uniqueness (statement-level).
- **Prereqs:** BM page, prob-24, calc-31.

#### prob-XX: SDE & Fokker-Planck Equation (`sde_fokker_planck.html`, ~1 page)
- **Topics:** SDE solution theory overview, diffusion generator, Fokker-Planck for marginal density, Girsanov (statement + intuition), score function interpretation.
- **ML connection:** Score-based diffusion (DDPM continuous-time), Neural SDE, Langevin sampling, Fokker-Planck as dual of reverse-time SDE in diffusion generation.
- **Prereqs:** Itô integral page, prob-24 (Girsanov uses RN derivative).

**Phase 2e outcome:** Resolves deferred item #342. Enables future ml-XX pages on diffusion models, flow matching, Neural ODEs, and score matching.

---

### Phase 2f (optional, further deepening): Specialized Topics

If Section III deepening continues beyond Phase 2e, the following pages are natural candidates. **Not committed** — kept in deferred items pool.

- **prob-XX: Variational Representations & f-Divergences** (1 page). Donsker-Varadhan, f-divergences (Hellinger, χ², α), Pinsker. Foundation for MINE, f-GAN, InfoNCE, PAC-Bayes. Prereqs: prob-24, prob-12, calc-25.
- **prob-XX: Uniform Integrability & Martingale Convergence** (1–2 pages). UI, Vitali convergence, filtrations and discrete-time martingales, Doob's convergence theorem. Foundation for stochastic approximation / RL theory, optional stopping. Resolves prob-23 UI forward-reference. Prereqs: prob-24, prob-25.
- **prob-XX: Characteristic Functions & CLT (Rigorous)** (1 page). Characteristic functions as Fourier transforms of probability measures, Lévy continuity, rigorous CLT. Connection to calc-32. Prereqs: prob-24, calc-32.

### Execution Sequence

Phase 2c is closed (prob-24 ✅ / prob-25 ✅ / prob-26 ✅). **Current default (5/9/2026):** return to Phase 3 (manifolds) / ml-13 / Phase 4 (rep theory). Phase 2e is revisited only when a concrete ML page creates pressure — triggers: (a) diffusion model rigorous foundation page, (b) continuous-time RL / Neural SDE page. Regular Conditional Distributions (the original prob-26 plan) is also a Phase 2e trigger, since SDE / path-space measures require regular conditional distributions on Polish spaces.

---

## Phase 3: Smooth Manifolds (Summer 2026)

The original plan (1 page for calc-32) was inadequate; Lee Ch. 1–3 + Ch. 8 require ≥3 pages. Page IDs assigned at drafting time.

### calc-XX: Smooth Manifolds & Atlases (~1 page)
Topological manifolds, charts, atlases, transition maps, smooth structure, smooth maps. **Payoff:** calc-29's Hausdorff + second-countability are revealed as specifications excluding pathological spaces. **Prereqs:** calc-29, linalg-27~30.

### calc-XX: Tangent Spaces & The Pushforward (~1 page)
Tangent vectors (curves and derivations), \(T_pM\), pushforward / differential, Jacobian in local coordinates. **CS angle:** pushforward = forward propagation Jacobian; pullback ↔ backprop. **Payoff:** \(T_I G\) from linalg-29 is a special case of the abstract tangent space.

### calc-XX: Vector Fields, Flows & The Tangent Bundle (~1 page)
\(TM\), vector fields, integral curves and flows, Lie bracket of vector fields. **CS angle:** ODE solvers on manifolds; Neural ODE and fluid simulation as flows. **Payoff:** the matrix commutator \([A, B] = AB - BA\) from linalg-29 is revealed as the matrix representation of the Lie bracket of vector fields.

### calc-XX: Riemannian Metrics & Beyond (~2 pages, scope TBD)
Inner products on tangent spaces, metric tensor \(g\), geodesics, Levi-Civita connection, curvature, Laplace-Beltrami \(\Delta_g\). Likely splits into 2 pages (metrics & geodesics vs. curvature & Laplace-Beltrami). **Prereqs:** manifold series above, calc-25 (Riesz — musical isomorphisms).

---

## Phase 4: Representation Theory & Equivariance (Autumn 2026)

### linalg-XX: Representation Theory (~3–4 pages)
Group representations, subrepresentations, irreducibility, Maschke, Schur, character theory (finite groups), Lie group representations, Peter-Weyl. Finite group representations fill ≥2 pages; Lie group representations add 1–2 more. **Connection:** Peter-Weyl bridges back to calc-32 (Fourier as harmonic analysis on groups). **Prereqs:** linalg-27~30, linalg-22.

### ml-14: Equivariant Neural Networks
Generalize from permutation invariance (GNN) to continuous group equivariance (SO(3), SE(3)). **Key insight:** "The architecture encodes the symmetry." **Prereqs:** linalg-27~30, linalg-XX (rep theory), ml-13.

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
| prob-24 | `radon_nikodym.html` | ✅ |
| prob-25 | `conditional_expectation.html` | ✅ |
| prob-26 | `variational_inference.html` | ✅ |

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
| ml-14 | 1 | `equivariant_nn.html` | After rep theory |
| Stochastic Calculus (prob-XX, Phase 2e) | ~2–3 | `brownian_motion.html`, `ito_integral.html`, `sde_fokker_planck.html` | Triggered by diffusion / Neural SDE / physical AI page demand |
| Regular Conditional Distributions (prob-XX) | ~1 | `regular_conditional_distributions.html` | Phase 2e prerequisite (SDE / path-space measures) |
| Advanced VI topics (prob-XX) | ~1–2 | TBD (`normalizing_flows.html`, `expectation_propagation.html`, `iwae_tighter_bounds.html` candidates) | Triggered individually by ML-application pressure |
| Quivers (disc-XX) | ~1 | `quivers.html` | Backlog |
| Category Theory (disc-XX) | ~2–3 | TBD | Backlog |
| DEC (disc-XX) | ~1–2 | TBD | Backlog |
| GDL / CDL Overview (ml-XX) | 2 | TBD | Backlog |

---

## Reference Map: Books × Pages

All references are listed on the site-wide index; this map tracks primary usage for development planning.

### Currently active for in-progress / planned tracks

| Book | Pages (existing → planned) | Role |
|------|----------------------------|------|
| **Conway — *A Course in Functional Analysis*** | calc-23~28 (FA block), calc-30, calc-31 → calc-32 | Primary for all of Section II advanced analysis |
| **Durrett — *Probability: Theory and Examples*** | prob-13, prob-22~26 → Phase 2e | Primary for measure-theoretic probability |
| **Lee — *Introduction to Smooth Manifolds*** | calc-29 → calc-XX manifold series, calc-XX Riemannian | Primary for manifold track |
| **Stein & Shakarchi — *Fourier Analysis*** | calc-14, calc-15 → calc-32 (Plancherel, Riemann-Lebesgue) | Also covers Lp basics |
| **Stillwell — *Naive Lie Theory*** | linalg-24, linalg-27~30 | Primary for Lie group series; supplement with Lee Ch.7+ for rigorous treatment |
| Bronstein et al. — *Geometric Deep Learning* | Insight Boxes site-wide → ml-13, ml-14, ml-XX (GDL overview) | "Destination viewpoint" text; referenced not followed |
| Murphy Book 1 — *Probabilistic ML: Introduction* | ml-01~08 → ml-13 | General ML reference |
| Murphy Book 2 — *Probabilistic ML: Advanced* | ml-09~12, prob-16, prob-26 → ml-14 | Information geometry at applied level; sufficient until Amari is needed |

### Completed tracks (no planned pages; on index.html)

- **Lay** *Linear Algebra* → linalg-01~10
- **Gallian** *Contemporary Abstract Algebra* → linalg-15~22
- **Horn & Johnson** *Matrix Analysis* → linalg-09~13
- **Boyd & Vandenberghe** *Convex Optimization* → calc-07, calc-08
- **O'Searcoid** *Metric Spaces* → calc-16~22
- **Cormen et al.** *Introduction to Algorithms* → disc-01~11
- **Sipser** *Theory of Computation* → disc-05~09
- **Diestel** *Graph Theory* → disc-01, disc-12
- **Merris** *Combinatorics* → disc-02
- **Menezes et al.** *Handbook of Applied Cryptography* → linalg-26 (niche; only if crypto pages expand)

### New additions to index.html

| Book | Planned Pages | Role |
|------|---------------|------|
| Edelsbrunner & Harer — *Computational Topology* | disc-14, disc-15 (retroactive) | Persistent homology / TDA if track opens |
| Fong & Spivak — *Applied Category Theory* | disc-XX (Quivers), disc-XX (Categories), ml-XX (CDL overview) | Primary for applied category / CDL track |
| Leinster — *Basic Category Theory* | disc-XX (Categories) | Rigorous pure complement to Fong & Spivak; free PDF on arXiv |

### Not yet on index.html (acquire when triggered)

- **Amari** *Information Geometry and Its Applications* (2016) — after manifold series if info-geometry page is planned (deepens ml-12 NGD)
- **Nielsen & Chuang** *Quantum Computation* (2010) — if a dedicated quantum page is planned (supplements calc-32)

---

## Deferred Items (Non-Blocking)

Topics explicitly deferred — not forgotten, but not on the critical path for 2026.

| Item | Trigger to Revisit |
|------|-------------------|
| Schwartz Space & Distributions | If a PDE or generalized function page is planned |
| Pontryagin Duality (Fourier on groups) | After linalg-27~30 + calc-32 + linalg-XX (rep theory), if harmonic analysis track emerges |
| Spectral Theory of the Laplacian (continuous) | After calc-XX (Riemannian Metrics), as bridge to geometric spectral theory |
| Continuous-Time Stochastic Processes | **→ Phase 2e (prob-XX, ~2–3 pages):** triggered by diffusion model / Neural SDE / physical AI page demand |
| Regular Conditional Distributions | **→ Phase 2e prerequisite** (Polish space + disintegration; required for SDE / Itô filtration). Not blocking prob-26 (VI works under density assumption). |
| Fiber Bundles & Gauge Theory | If GDL viewpoint page demands gauge equivariance machinery |
| String Diagrams | After CDL viewpoint page is planned |
| Advanced VI topics (normalizing flows, IWAE, EP, wake-sleep, hierarchical / structured / implicit posteriors — Murphy MLBook2 Ch.10 sections deliberately out of prob-26 scope) | Triggered individually by ML-application pressure (e.g., normalizing flows ← diffusion model rigorous foundation; EP ← graphical-model inference; IWAE ← tighter-bound research) |
| Uniform Integrability & Martingale Convergence | **→ Phase 2f candidate.** Triggered by RL theory / stochastic approximation / bandit algorithms. Resolves prob-23 UI forward-reference. |
| Variational Representations & f-Divergences | **→ Phase 2f candidate.** Triggered by contrastive learning / MI estimation / generalization theory (foundation for MINE, f-GAN, InfoNCE, PAC-Bayes) |
| Characteristic Functions & CLT (Rigorous) | **→ Phase 2f candidate.** Triggered by advanced asymptotic statistics; prereq: calc-32 |

---

## Key Learnings & Development Principles

1. **Notation Consistency is Non-Negotiable:** Calligraphic letters for spaces (\(\mathcal{X}, \mathcal{Y}, \mathcal{Z}, \mathcal{H}, \mathcal{X}^*, \mathcal{X}^{**}\)); functionals as \(\varphi\); operator norm as \(\|\varphi\|_{\mathcal{X}^*}\). All new Section II pages match the notation in calc-23~28.

2. **Cross-Page Linking & References:** Links verified against actual filenames and anchor IDs before inclusion. No in-body citations — references handled in the site-wide reference index only. Forward links use descriptive text only (no `<a href>`) until target page exists.

3. **Application Viewpoint Philosophy:** Use Insight Boxes and the map's Tessera to connect abstract theorems to applications without breaking formal proofs in main text. Application domains (GDL, CDL, quantum) introduced when tools are ready — not forced prematurely.

4. **Fisher Information vs. Hessian Distinction:** The real distinction is reparametrization invariance (Čencov's theorem) vs. loss-dependence and non-guaranteed positive definiteness — not "global vs. local."

5. **Page Count Estimation:** Topics requiring new conceptual paradigms consistently expand 1.5–4× initial estimates. Plan for expansion and defer ID assignment until drafting begins. Calibrations: Lie group series (planned 2 → actual 4), calc-30 split (1 → 2), Phase 2c (planned 2 → actual 3).

---

## Changelog

- **5/9/2026:** prob-26 (Variational Inference) completed; Phase 2c closed. Total pages 111 → 112.
- **5/4/2026:** prob-25 (Conditional Expectation) completed; prob-26 redesigned RegCondDist → VI; Phase 2d absorbed into 2c; ML-bridge honest-framing convention canonized.
- **4/22/2026:** prob-24 (Radon-Nikodym) completed; Phase 2c–2e plan adopted; `T-foo_bar` underscore anchor convention adopted (prob-24 onward).
- **4/21/2026:** calc-30 split into calc-30 + calc-31; Fourier/Hilbert renumbered to calc-32.
- **4/5/2026:** Lie group series expanded 2 → 4 pages (linalg-27~30); deferred ID (`XX`) convention adopted.
- **3/31/2026:** prob-22, prob-23 completed.
- **3/29/2026:** calc-29, calc-30 completed.
- **3/28/2026:** Major roadmap revision — "three application domains as viewpoints" framing adopted; QML removed as named destination; web-of-mutual-reinforcement dependency map; Filename Registry and Reference Map added.
- **3/27/2026:** Curriculum verified at 102 pages; disc-12~15 marked complete.
- **3/20/2026:** FA block (calc-24~28) completed.
- **3/03/2026:** Intro to FA consolidated into calc-23; linalg-25, 26 added.
- **3/01/2026:** linalg-25, 26 (Algebraic Extensions, Finite Fields) added.
- **3/01/2026:** Section I-25, 26 (Algebraic Extensions, Finite Fields) added.