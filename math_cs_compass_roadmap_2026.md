# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota  
**Last Updated:** 4/22/2026 
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

### Section III: Probability & Statistics (23 pages, expanding)
- **Foundations & Inference:** Probability, distributions, covariance, MVN, MLE, hypothesis testing, linear regression.
- **Bayesian & Stochastic:** Bayesian inference, exponential family, Fisher information matrix, decision theory, Markov chains, Monte Carlo, importance sampling, Gaussian processes.
- **Measure-Theoretic Probability (3 pages, deepening phase active):** Random variables as measurable functions, expectation as Lebesgue integral, convergence theorems, limit theorems & product measures, **Radon-Nikodym theorem (prob-24, completed 4/22/2026)**. **Phase 2c continues** with Conditional Expectation (prob-25) and Regular Conditional Distributions (prob-26); **Phase 2d–2e** (Variational Inference foundation, Stochastic Calculus) deferred with trigger-based revisit policy — bringing Section III to the graduate-level depth already achieved in Sections I (Lie theory) and II (Functional Analysis block).

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
(linalg-27~30) ✅       Smooth Manifolds         │              │                       disc-XX: Categories
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

## Phase 2c–2e: Section III Measure-Theoretic Deepening (May 2026 onward)

### Motivation & Strategic Context

As of April 2026, the curriculum exhibits an **asymmetry in graduate-level depth** across sections:

- **Section I** reached graduate level through the Lie theory series (linalg-27~30, 4 pages).
- **Section II** reached graduate level through the Functional Analysis block (calc-23~28) and Lp theory (calc-30/31), 10 pages total.
- **Section III** has only **2 measure-theoretic pages** (prob-22/23). Classical probability ends at prob-21 (Gaussian Processes), with measure-theoretic probability added as a thin bridge.

This imbalance became apparent during the peer review of **prob-23** (4/22/2026), which revealed several critical gaps:

1. **Radon-Nikodym theorem is invoked without proof across at least three pages** — prob-22 defines the PDF as \(f_X = dP_X/d\lambda\), lp_spaces.html references it for Lp duality, and prob-23 previews conditional expectation as a Radon-Nikodym derivative. Yet no page actually proves the theorem. This is a **name-lending pattern without mathematical content**.
2. **Variational Inference is not formally isolated.** ml-12 (VAE) introduces VI as a pedagogical preamble to VAE, but there is no foundation page defining ELBO rigorously or treating VI as a general inference framework. This was already flagged in the Deferred Items table (#345) but without a concrete trigger.
3. **Uniform integrability, Kolmogorov extension, and Fubini proofs** are delegated to external references (Durrett, Folland) in prob-23, which violates Instruction v2's "no formal in-body citations" rule but also reflects a real structural gap: these theorems have no dedicated home in the curriculum.
4. **Fubini/Tonelli placement in Section III** rather than Section II was re-examined during the review. The placement is justified by (a) narrative cohesion — i.i.d. sampling and product measures are the natural consumer, (b) the hexagonal compass map shows a three-node cluster (calc-30 ↔ prob-22 ↔ prob-23) that visually anchors the measure-theoretic tools across Section II/III, and (c) the functional usage of Fubini in this curriculum is concentrated in probability/statistics/ML rather than pure analysis. This placement is **retained**, but the cross-section dependency is now explicit: future Section II pages (e.g., calc-32 Fourier) that need Fubini will ref-link to prob-23.

### Design Philosophy

Phase 2c–2e elevates Section III to the same graduate-level depth as Sections I and II, while maintaining the **"three application domains as viewpoints"** philosophy. Each phase creates a **plateau** where accumulated tools are applied to a class of 2026-era ML/AI problems, and from which the next mathematical foundation is motivated:

- **Phase 2c plateau:** Bayesian rigor, Lp duality closure, KL regularization foundation (RLHF).
- **Phase 2d plateau:** VAE/ELBO rigorous treatment, amortized inference, connection to diffusion models as hierarchical VI.
- **Phase 2e plateau:** Diffusion model SDE foundation, score matching, Neural SDE / Neural ODE.

These plateaus collectively unlock the modern ML frontier (as of 2026): Bayesian Neural Networks, RLHF/DPO alignment, score-based diffusion, flow matching, and the information-theoretic bounds relevant to PAC-Bayes generalization.

### Page Count Realism

Drawing on the **Lie group series expansion pattern** (planned 2 → actual 4 pages), Phase 2c–2e pages are expected to follow the same 1.5–2× expansion factor. Initial estimates are therefore conservative lower bounds; final structure is determined during drafting.

---

### Phase 2c: Radon-Nikodym Track (3 pages — 1 complete, 2 in progress)

**Goal:** Close the Radon-Nikodym name-usage debt and provide rigorous foundations for measure-theoretic Bayesian inference, including the continuous-case conditional distribution machinery.

**Status update (4/22/2026):** Original Phase 2c plan was 2 pages (prob-24 + combined CE/RegCondDist prob-25). During prob-25 scoping, Regular Conditional Distributions was split off into its own page (prob-26) following the Lie-series precedent: Polish space topology is a new conceptual paradigm for Section III, and combining algebraic CE properties with Polish-space disintegration would target ~1500 lines on a single page. The split keeps each page focused and at a sane size.

#### prob-24: Signed Measures & Radon-Nikodym Theorem ✅ (completed 4/22/2026, 1226 lines)
- **Topics covered:** Signed measures, Jordan-Hahn decomposition, absolute continuity, mutual singularity, ε-δ characterization of absolute continuity (with finite-hypothesis counterexample), Radon-Nikodym theorem proved via von Neumann's L² method, uniqueness via zero-integral lemma, chain rule and change-of-variables Proposition (statement (i) → (ii), proof (ii) full → (i) corollary), ML insight box (Bayesian posterior density, score in diffusion models, importance sampling, KL divergence and RLHF), Looking Ahead with three retroactive closures and four future horizons.
- **Lebesgue decomposition:** Excluded from main text per Phase 2c plan; referenced in Looking Ahead only.
- **Proof method:** von Neumann's L² method, as planned. Cross-section bridge to calc-25 (`#T-riesz_representation`) and calc-31 (`#T-riesz_fischer`) confirmed in §4.2 proof.
- **Anchor count:** 9 theorem/definition anchors (`T-radon_nikodym`, `T-rn_chain_rule`, `T-hahn_decomposition`, `T-jordan_decomposition`, `T-absolute_continuity_epsilon_delta`, `D-signed_measure`, `D-total_variation`, `D-absolute_continuity`, `D-mutual_singularity`). **All anchor IDs use the `T-foo_bar` / `D-foo_bar` underscore convention adopted concurrently with prob-24 completion**; pre-prob-24 pages retain their existing hyphen anchors.
- **Critical review outcome:** 12-unit critical review identified 17 MAJOR + 27 MINOR issues; all addressed via 3-round fix application (CRITICAL/MAJOR → MINOR → final sweep). One genuine proof bug caught (ε-δ characterization: non-monotonic A_n requires `limsup` not `lim`).
- **Retroactive closures pending application (3 ref-link diffs prepared, awaiting Yusuke local apply):**
  - `measure_probability.html` (prob-22) L278–284: PDF existence licensed by prob-24 RN theorem
  - `dual_spaces.html` (calc-25) L126–129: \((L^p)^* \cong L^q\) converse direction licensed by prob-24
  - `limit_theorems_product_measures.html` (prob-23) L712: conditional expectation preview ref-link to prob-24 (and forward to prob-25 once that page exists)
- **Reference verified:** Durrett Ch. 1 & 5, Folland Ch. 3, Conway (Riesz representation bridge).

#### prob-25: Conditional Expectation (1 page, drafting handout v1 created 4/22/2026)
- **Topics:** Conditional expectation \(\mathbb{E}[X | \mathcal{G}]\) defined as Radon-Nikodym derivative of the signed measure \(\nu_X(A) = \int_A X d\mathbb{P}\) with respect to \(\mathbb{P}|_\mathcal{G}\); existence and a.s. uniqueness as one-line corollary of prob-24; defining property (averaging identity); recovery of the discrete case (\(\mathbb{E}[X|A_i]\) consistent with abstract definition); algebraic properties (linearity, monotonicity, take-out, independence collapse, Jensen for CE, \(L^p\) contraction); \(L^2\) projection characterization; tower property; ML applications (EM algorithm, Q-learning value functions, Bayesian posterior predictive, VI ELBO); 4 forward horizons.
- **Continuous case framing:** §2.4 explicitly defers \(\mathbb{E}[X|Y=y]\) (continuous case as a function of \(y\)) to prob-26 with descriptive forward link, citing the need for Polish space machinery and disintegration.
- **Estimated size:** 860–1160 lines.
- **ML connection:** EM algorithm (E-step is CE), Q-value (state value as CE of return; Bellman = tower property), Bayesian posterior predictive (CE under posterior), Variational Inference (ELBO terms reducible to CE-like integrals).
- **Prereqs:** prob-24.
- **References:** Durrett Ch. 5, Billingsley (alternate treatment).
- **Filename:** `conditional_expectation.html`. Icon: `𝔼[·|𝒢]`.

#### prob-26: Regular Conditional Distributions (1 page, scope sketch in prob-25 handout §8)
- **Topics:** Polish space hypothesis (separable + complete metric), counterexample showing non-Polish settings where regular conditional distribution fails to exist, disintegration theorem (statement + proof sketch via approximation by partitions), construction of regular versions \(P(\cdot|x)\) such that \(\mathbb{E}[f(Y)|X=x] = \int f(y) P(dy|x)\) holds pointwise (not just a.s.), Markov kernels and transition kernels (preview to Markov chains / SDEs), Bayesian inference rigorously licensed for continuous parameters.
- **Strategic role:** Promoted from "trigger-based" to "Phase 2c third committed page" because prob-25 §2.4 and §5.2 forward-link to it; trigger-based status would leave prob-25's deferral orphaned.
- **Estimated size:** 700–1000 lines.
- **Prereqs:** prob-25, calc-29 (Topological Spaces — Polish space requires topology + metric completeness; calc-29 covers Hausdorff/second-countability infrastructure).
- **References:** Folland Ch. 5, Kallenberg Ch. 6 (disintegration theorem).
- **Filename:** `regular_conditional_distributions.html`.

**Phase 2c outcome (revised):** Four deferred items simultaneously resolved upon Phase 2c completion: #340 Lp duality (via prob-24 RN), #341 Conditional expectation (via prob-25), partial #345 Variational Inference foundation (via prob-25 §3 properties needed for ELBO), and Bayesian continuous-parameter inference rigor (via prob-26 disintegration). Section III has a rigorous conditional expectation framework + regular conditional distribution machinery, enabling all downstream Bayesian/VI/martingale/SDE development.

---

### Phase 2d: Variational Inference (estimated ~1–2 pages, timing TBD, page IDs deferred)

**Goal:** Treat Variational Inference as a first-class inference framework, not merely as a VAE preamble.

**Rationale for independence from ml-12 (VAE):** The VI section inside ml-12 (`vae.html`) is pedagogically motivated (leading toward VAE). A dedicated foundation page is required because:
- The ELBO decomposition \(\log p(x) = \text{ELBO}(q) + D_{KL}(q \| p(\cdot | x))\) admits a **rigorous proof only after conditional expectation (prob-25) is in place**.
- CAVI (coordinate ascent VI), SVI (stochastic VI), black-box VI, and the variational perspective on diffusion models are not covered in ml-12.
- Deferred item #345 ("Variational Inference — Implicit in ml-12 but never formally isolated") has been pending since the 3/28 roadmap revision.

#### prob-XX: Variational Inference — ELBO & Mean-Field (~1 page, likely; may expand)
- **Topics:** Intractable posteriors and variational family selection. ELBO exact decomposition (rigorous proof using prob-25). Mean-field factorization, Coordinate Ascent VI (CAVI) with Bayesian Gaussian Mixture example. α-divergence alternatives (brief).
- **Prereqs:** prob-24, prob-25, prob-12 (Shannon-level KL).
- **ML connection:** Bayesian GMM, topic models (LDA), variational Bayesian inference in graphical models.
- **Tentative filename:** `variational_inference.html`.

#### prob-XX (conditional): Stochastic & Amortized VI (~1 page, if split occurs)
- **Topics:** Reparameterization trick (elevated from ml-12), score function estimator, Black-box VI, Stochastic VI (Hoffman et al. 2013). Normalizing flows as variational families. Variational perspective on diffusion models (hierarchical VI).
- **Possible merge with the VI page above:** If the VI page stays tight at 1 page, this material can be compressed into its "Looking Ahead" section or split only if drafting demands expansion.
- **ML connection:** VAE amortized posterior, Normalizing Flows, Diffusion ELBO (MIT 6.S184 perspective).
- **Prereqs:** Phase 2d VI page, ml-12 (VAE, retroactive retrofit target).
- **Tentative filename:** `stochastic_amortized_vi.html` (if split occurs).

**Phase 2d outcome:** Deferred item #345 fully resolved. ml-12 (VAE) receives retroactive ref-links to the Phase 2d page(s). Foundation established for future ml-XX pages on diffusion models, flow matching, and Bayesian Neural Networks.

---

### Phase 2e: Stochastic Calculus Light (estimated ~2–3 pages, timing TBD, page IDs deferred)

**Goal:** Provide the continuous-time stochastic foundation required for modern generative AI (score-based diffusion, Neural SDE, continuous-time RL).

**Strategic 2026 AI/ML commitment:** Diffusion models are the dominant paradigm for generative AI as of 2026 (Stable Diffusion, Sora, molecular/audio generation). The mathematical foundation involves Brownian motion, Itô integral, SDE, and Fokker-Planck equations. MIT course 6.S184 (2026) teaches this explicitly as "Generative AI with SDEs." Without Phase 2e, the curriculum cannot rigorously bridge to this frontier.

**Scope "light" definition:** Construction of Brownian motion, Itô integral (basic definition + key properties), Itô's lemma, SDE as a solution concept, Fokker-Planck for the marginal density. **Excluded:** Stratonovich calculus (brief mention), Malliavin calculus, jump processes, stochastic control theory.

#### prob-XX: Brownian Motion — Construction & Properties (~1 page, likely; may split)
- **Topics:** Brownian motion axioms (Gaussian increments, independence, continuity), existence (Kolmogorov extension theorem + Kolmogorov-Čentsov continuity, or Lévy-Ciesielski construction), quadratic variation, nowhere-differentiable paths.
- **Retroactive closure:** prob-23 L529's forward-reference to Kolmogorov extension theorem materializes here.
- **Tentative filename:** `brownian_motion.html`.

#### prob-XX: Itô Integral & Itô's Lemma (~1 page, likely)
- **Topics:** Predictable processes, Itô integral for elementary processes, extension via L² isometry, Itô's lemma (one-dimensional), SDE existence and uniqueness (statement level).
- **Prereqs:** Brownian motion page above, prob-24 (for measure-change preview), calc-31 (L² completeness).
- **Tentative filename:** `ito_integral.html`.

#### prob-XX: SDE & Fokker-Planck Equation (~1 page, likely)
- **Topics:** SDE solution theory overview, generator of a diffusion, Fokker-Planck equation for the marginal density, Girsanov theorem (statement + intuition), score function interpretation.
- **ML connection:** Score-based diffusion models (DDPM, continuous-time formulation), Neural SDE, Langevin dynamics for sampling, Fokker-Planck as dual of the reverse-time SDE in diffusion generation.
- **Prereqs:** Itô integral page above, prob-24 (Girsanov uses RN derivative).
- **Tentative filename:** `sde_fokker_planck.html`.

**Phase 2e outcome:** Deferred item #342 resolved. Direct commitment to 2026 generative AI foundation. Enables future ml-XX pages on diffusion models, flow matching, Neural ODEs, and score matching.
---

### Phase 2e: Stochastic Calculus Light (estimated 2–3 pages, timing TBD)

**Goal:** Provide the continuous-time stochastic foundation required for modern generative AI (score-based diffusion, Neural SDE, continuous-time RL).

**Strategic 2026 AI/ML commitment:** Diffusion models are the dominant paradigm for generative AI as of 2026 (Stable Diffusion, Sora, molecular/audio generation). The mathematical foundation involves Brownian motion, Itô integral, SDE, and Fokker-Planck equations. MIT course 6.S184 (2026) teaches this explicitly as "Generative AI with SDEs." Without Phase 2e, the curriculum cannot rigorously bridge to this frontier.

**Scope "light" definition:** Construction of Brownian motion, Itô integral (basic definition + key properties), Itô's lemma, SDE as a solution concept, Fokker-Planck for the marginal density. **Excluded:** Stratonovich calculus (brief mention), Malliavin calculus, jump processes, stochastic control theory.

#### prob-28: Brownian Motion — Construction & Properties (1 page, likely; may split)
- **Topics:** Brownian motion axioms (Gaussian increments, independence, continuity), existence (Kolmogorov extension theorem + Kolmogorov-Čentsov continuity, or Lévy-Ciesielski construction), quadratic variation, nowhere-differentiable paths.
- **Retroactive closure:** prob-23 L529's forward-reference to Kolmogorov extension theorem materializes here.

#### prob-29: Itô Integral & Itô's Lemma (1 page, likely)
- **Topics:** Predictable processes, Itô integral for elementary processes, extension via L² isometry, Itô's lemma (one-dimensional), SDE existence and uniqueness (statement level).
- **Prereqs:** prob-28, prob-24 (for measure-change preview), calc-31 (L² completeness).

#### prob-30: SDE & Fokker-Planck Equation (1 page, likely)
- **Topics:** SDE solution theory overview, generator of a diffusion, Fokker-Planck equation for the marginal density, Girsanov theorem (statement + intuition), score function interpretation.
- **ML connection:** Score-based diffusion models (DDPM, continuous-time formulation), Neural SDE, Langevin dynamics for sampling, Fokker-Planck as dual of the reverse-time SDE in diffusion generation.
- **Prereqs:** prob-29, prob-24 (Girsanov uses RN derivative).

**Phase 2e outcome:** Deferred item #342 resolved. Direct commitment to 2026 generative AI foundation. Enables future ml-XX pages on diffusion models, flow matching, Neural ODEs, and score matching.

---

### Phase 2f (optional, further deepening): Specialized Topics

If Section III deepening continues beyond Phase 2e, the following pages become natural candidates. These are **not committed** and remain in the deferred items pool, but are flagged here for continuity.

- **prob-XX: Variational Representations & f-Divergences** (1 page). Donsker-Varadhan variational formula, f-divergences (Hellinger, χ², α-divergence), Pinsker's inequality. Foundation for MINE (Mutual Information Neural Estimator), f-GAN, InfoNCE (contrastive learning), PAC-Bayes bounds. **Prereqs:** prob-24, prob-12, calc-25.
- **prob-XX: Uniform Integrability & Martingale Convergence** (1–2 pages). UI, Vitali convergence theorem, filtrations and martingales (discrete time), Doob's martingale convergence theorem. Foundation for stochastic approximation / RL theory, optional stopping. **Retroactive closure:** prob-23 L290's UI forward-reference. **Prereqs:** prob-24, prob-25.
- **prob-XX: Characteristic Functions & CLT (Rigorous)** (1 page). Characteristic functions as Fourier transforms of probability measures, Lévy continuity theorem, rigorous CLT proof. **Connection to calc-32 (Fourier in Hilbert).** **Prereqs:** prob-24, calc-32.

### Execution Sequence

Phase 2c is committed; Phase 2d/2e/2f timing depends on interleaving with Phase 3 (Smooth Manifolds), ml-13 (GNN), and Phase 4 (Representation Theory). Candidate orderings:

- **Order A (Section III sprint):** prob-24 → prob-25 → prob-26 → Phase 2d (VI) → Phase 2e (Brownian/Itô/SDE), continuous.
- **Order B (balanced interleave):** prob-24 → prob-25 → prob-26 → calc-32 → manifold series → Phase 2d → ...
- **Order C (deferred revisit):** prob-24 → prob-25 → prob-26, then return to Phase 3 (manifolds) / ml-13 / Phase 4 (rep theory), and revisit Phase 2d/2e only when a concrete ML page (VAE retrofit, diffusion model page) creates pressure.

**Current default:** Order C. Phase 2c (prob-24/25/26) is committed and should be completed before any Phase 2d/2e judgement. Phase 2d/2e triggers are: (a) starting a dedicated ml-XX diffusion model page, (b) starting a dedicated ml-XX Bayesian Neural Networks page, (c) starting a dedicated ml-XX RLHF/DPO alignment page.
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
| prob-24 | `radon_nikodym.html` | ✅ (4/22/2026) |

### Planned Pages (ID assigned)

| Page ID | Planned Filename | Status |
|---------|-----------------|--------|
| calc-32 | `fourier_hilbert.html` | Next |
| ml-13 | `graph_neural_networks.html` | Next |
| **prob-25** | `conditional_expectation.html` | **Phase 2c — drafting handout v1 created 4/22/2026** |
| **prob-26** | `regular_conditional_distributions.html` | **Phase 2c — after prob-25** |

### Planned Pages (ID deferred — assigned at drafting time)

| Series | Est. Pages | Planned Filenames | Status |
|--------|-----------|-------------------|--------|
| Smooth Manifolds (calc-XX) | ~3 | `smooth_manifolds.html`, `tangent_spaces.html`, `vector_fields_flows.html` | After ml-13 |
| Riemannian Metrics (calc-XX) | ~2 | `riemannian_metrics.html`, TBD | After manifold series |
| Representation Theory (linalg-XX) | ~3–4 | TBD | After manifold series |
| ml-14 | 1 | `equivariant_nn.html` | After representation theory |
| **Variational Inference (prob-XX, Phase 2d)** | ~1–2 | `variational_inference.html` (+ possibly `stochastic_amortized_vihtml`) | Triggered by Phase 2c completion (prob-25 + prob-26) + VAE retrofit / Bayesian NN / diffusion ml-page demand |
| **Stochastic Calculus (prob-XX, Phase 2e)** | ~2–3 | `brownian_motion.html`, `ito_integral.html`, `sde_fokker_planck.html` | Triggered by diffusion ml-page / Neural SDE / physical AI page demand |
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

These topics are explicitly deferred — not forgotten, but not on the critical path for 2026. Items linked to Phase 2c–2e show their resolution path.

| Item | Why Deferred | Trigger to Revisit |
|------|--------------|-------------------|
| **Schwartz Space & Distributions** | Requires measure-theoretic machinery beyond calc-30; primarily needed for PDE theory | If a PDE or generalized function page is planned |
| **Pontryagin Duality** (Fourier on groups) | Elegant but requires locally compact abelian groups + Haar measure; far from current scope | After linalg-27~30 (Lie groups) + calc-32 (Fourier) + linalg-XX (representation theory), if harmonic analysis track emerges |
| **Spectral Theory of the Laplacian** (continuous) | Natural extension of calc-27 + calc-32; connects Fourier eigenfunctions to Laplace-Beltrami | After calc-XX (Riemannian Metrics), as bridge to geometric spectral theory |
| **Lp Duality via Radon-Nikodym** | Full proof of (Lp)* ≅ Lq requires Radon-Nikodym derivative | **→ Phase 2c (prob-24):** The RN theorem is the critical bridge; calc-31 retrofit will ref-link to prob-24 after completion |
| **Conditional Expectation (Radon-Nikodym)** | Measure-theoretic conditional expectation, filtrations, martingale basics | **→ Phase 2c (prob-25):** Conditional expectation proper (filtrations, martingale basics remain deferred to separate Phase 2f candidate page) |
| **Continuous-Time Stochastic Processes** | Brownian motion, Itô integral, SDEs; requires solid measure-theoretic probability | **→ Phase 2e (prob-XX, ~2–3 pages):** Triggered by diffusion model / Neural SDE / physical AI page demand |
| **Fiber Bundles & Gauge Theory** | Requires mature manifold theory + Lie groups (linalg-27~30) | If GDL viewpoint page demands gauge equivariance machinery |
| **String Diagrams** | Categorical tool; requires disc-XX (Category Theory) | After CDL viewpoint page is planned |
| **Variational Inference** | Implicit in ml-12 (VAE) but never formally isolated | **→ Phase 2d (prob-XX, ~1–2 pages):** Triggered by the need for rigorous ELBO foundation; ml-12 VAE page will receive retroactive ref-links after completion |
| **Uniform Integrability & Martingale Convergence** (NEW) | UI + Vitali convergence theorem + discrete-time martingale basics + Doob convergence | **→ Phase 2f candidate page.** Triggered by RL theory / stochastic approximation / bandit algorithms pages; prereq: Phase 2c complete. Resolves prob-23 L290 UI forward-reference. |
| **Variational Representations & f-Divergences** (NEW) | Donsker-Varadhan formula, f-divergences, Pinsker's inequality; foundation for MINE / f-GAN / InfoNCE / PAC-Bayes | **→ Phase 2f candidate page.** Triggered by contrastive learning / mutual information estimation / generalization theory pages; prereq: Phase 2c complete. |
| **Characteristic Functions & CLT (Rigorous)** (NEW) | Measure-theoretic version of CLT via characteristic functions + Lévy continuity theorem | **→ Phase 2f candidate page.** Triggered by advanced asymptotic statistics or Gaussian process limiting behavior pages; prereq: Phase 2c + calc-32 (Fourier in Hilbert). |

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
## Changelog
- **4/22/2026 (PM):** prob-24 completed; Phase 2c restructured.
  - **prob-24 (`radon_nikodym.html`) completed**: 1226 lines after critical review. von Neumann L² proof delivered as planned. 9 theorem/definition anchors registered using new `T-foo_bar` / `D-foo_bar` underscore convention. 12-unit critical review identified 17 MAJOR + 27 MINOR issues, all resolved across 3 fix rounds. One genuine proof bug caught (ε-δ characterization required `limsup` not `lim` for non-monotonic sequence). Chain rule + change-of-variables retained as Proposition inside §4 with statement order (i) → (ii) and proof order (ii) full → (i) corollary (per author decision during drafting).
  - **Anchor naming convention update**: `T-` and `D-` prefix retained, but the body separator switched from hyphen to underscore (e.g., `T-radon_nikodym`, not `T-radon-nikodym`). Effective from prob-24 onward. Pre-prob-24 pages (prob-22, prob-23, calc-XX, etc.) retain their existing hyphen anchors.
  - **prob-25 scope split**: Original Phase 2c plan combined Conditional Expectation + Regular Conditional Distributions into a single prob-25. During prob-25 scoping, this was split: Polish space topology constitutes a new conceptual paradigm for Section III (entire section so far is pure measure-theoretic without topology), and the combined page would target ~1500 lines. Lie-series precedent (planned 2 → actual 4 pages) directly applies. New plan: prob-25 = Conditional Expectation only; prob-26 = Regular Conditional Distributions only.
  - **prob-26 promoted to Phase 2c committed**: Originally Regular Conditional Distributions was implicit within prob-25. After the split, prob-26 is **committed as Phase 2c third page**, not deferred. Reason: prob-25 §2.4 and §5.2 forward-link to Regular Conditional Distributions; trigger-based status would orphan those forward links.
  - **prob-25 drafting handout v1 created** (`prob25_drafting_handout.md`, 390 lines). Includes: page identity, strategic position, 5-section plan (§1 Why CE / §2 Definition via RN / §3 Properties / §4 ML applications / §5 Looking Ahead), notation conventions, 10-anchor ID registry, dependency audit, self-review checklist, prob-26 outlook (sketched §1–§5), 3-round drafting plan, tone calibration, open questions.
  - **Phase 2d/2e ID de-numbering**: Future Phase 2d (VI) and Phase 2e (Brownian/Itô/SDE) pages downgraded from concrete IDs (`prob-26/27` for VI, `prob-28/29/30` for SDE) to `prob-XX` placeholders. Rationale: every recently-drafted page series has expanded mid-drafting (Lie 2→4, calc-30 split into 30+31, prob-25 split into 25+26). Concrete IDs for unwritten future pages create cascading ID-shift work each time a split occurs. Deferred-ID convention (already used for manifold/rep theory/discrete tracks) applied uniformly across Section III future pages.
  - **Retroactive ref-link diffs prepared** for 3 existing pages (awaiting Yusuke local apply): `dual_spaces.html` L126–129 (Lp duality license), `measure_probability.html` L278–284 (PDF existence license), `limit_theorems_product_measures.html` L712 (CE preview ref-link). All use `T-radon_nikodym` underscore anchor.
- **4/22/2026:** Section III Measure-Theoretic Deepening plan (Phase 2c–2e) formally adopted.
  - **Trigger:** Peer review of prob-23 (`limit_theorems_product_measures.html`) exposed several structural gaps: (a) Radon-Nikodym invoked without proof across prob-22, calc-30, and prob-23 Looking Ahead (name-lending without mathematical content); (b) Variational Inference never formally isolated despite being implicit in ml-12 VAE; (c) forward-references to uniform integrability, Kolmogorov extension, Fubini proofs all delegated to external standard texts — reflecting a real curriculum gap, not just Instruction v2 citation violations.
  - **Root cause:** Section III had only 2 measure-theoretic pages (prob-22/23) while Sections I (Lie theory, 4 pages) and II (Functional Analysis block, 10 pages) reached graduate-level depth. Section III was under-developed relative to its importance for 2026 ML/AI (Bayesian inference, RLHF KL regularization, diffusion models, VAE/ELBO).
  - **Commitment:** Phase 2c (prob-24/25: Radon-Nikodym + Conditional Expectation) is committed; Phase 2d (prob-26/27: Variational Inference) and Phase 2e (prob-28/29/30: Stochastic Calculus) are planned with trigger-based revisit policy.
  - **Decision records:**
    - **Fubini/Tonelli remains in Section III (prob-23)** despite its natural home being Section II. Rationale: (a) i.i.d. sampling is the primary consumer; (b) compass map visual structure (calc-30 ↔ prob-22 ↔ prob-23 three-node cluster) anchors the measure-theoretic tools across Section II/III; (c) the web-of-reinforcement architecture is not a linear book. Future Section II pages (calc-32 Fourier) that need Fubini will ref-link to prob-23.
    - **Lebesgue decomposition excluded from prob-24 main text.** Rationale: three "decomposition" theorems in sequence (Hahn, Lebesgue, Radon-Nikodym) creates pedagogical clutter. RN-as-density is the primary target; Lebesgue decomposition referenced in Looking Ahead only.
    - **Change of Variables / Chain Rule (RN version) retained as Proposition inside prob-24 §4**, not promoted to a dedicated page. Rationale: a standalone "Change of Variables" page would need to span Jacobian-type, pushforward-type, RN-type, and Girsanov-type variants, making it either thin or scope-diffuse. Each variant is better housed in its natural context. Pushforward-type is already at prob-22 (`#T-change-of-variable`); RN-type will sit at prob-24; Girsanov-type will sit at future Phase 2e page.
    - **Radon-Nikodym proof method:** von Neumann's L² method, not Durrett's "greedy function" method. Rationale: uses calc-25 (Riesz Representation Theorem on Hilbert spaces) and calc-31 (L² completeness), making the proof a deliberate cross-section bridge.
  - **Deferred items reorganized:** #340 (Lp Duality), #341 (Conditional Expectation), #342 (Continuous-Time SP), #345 (Variational Inference) all received concrete trigger paths (→ Phase 2c/2d/2e). Three new items added: Uniform Integrability & Martingale Convergence, Variational Representations & f-Divergences, Characteristic Functions & CLT (Rigorous) — flagged as Phase 2f candidates.
  - **prob-23 peer review outcome:** All 🔴 and selected 🟡 items addressed via str_replace diffs (integrability hypothesis added to Proposition and Strong Law, UI iff binding fixed in two locations, formal citations rewritten to descriptive attribution in four locations, Fubini statement strengthened with a.e. inner/outer integrability, product premeasure σ-additivity verification made explicit, i.i.d. definition extended to infinite sequences, change-of-variable ref-link added to worked example, DCT vs Leibniz rule distinction clarified, event independence 2^n propagation noted). HTML structure verified (tag balance, anchor preservation).
  - **Filename Registry:** prob-24 (`radon_nikodym.html`), prob-25 (`conditional_expectation.html`) added. Phase 2d/2e candidates listed with deferred ID convention.
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