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

### Section III: Probability & Statistics (25 pages as of 5/4/2026, expanding to 26 with prob-26 in progress)
- **Foundations & Inference:** Probability, distributions, covariance, MVN, MLE, hypothesis testing, linear regression.
- **Bayesian & Stochastic:** Bayesian inference, exponential family, Fisher information matrix, decision theory, Markov chains, Monte Carlo, importance sampling, Gaussian processes.
- **Measure-Theoretic Probability (4 pages, deepening phase active):** Random variables as measurable functions, expectation as Lebesgue integral, convergence theorems, limit theorems & product measures, **Radon-Nikodym theorem (prob-24, completed 4/22/2026, refined 5/4/2026)**, **Conditional expectation (prob-25, completed 5/4/2026)**. **Phase 2c continues** with prob-26 = Variational Inference (Murphy Ch.10 core, redesigned 5/4/2026 from original Regular Conditional Distributions plan). **Phase 2e** (Stochastic Calculus) deferred with trigger-based revisit policy — bringing Section III to the graduate-level depth already achieved in Sections I (Lie theory) and II (Functional Analysis block).

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

- **Phase 2c plateau:** Bayesian rigor + Lp duality closure + KL regularization foundation (RLHF) + VAE/ELBO rigorous treatment + amortized inference + connection to diffusion models as hierarchical VI. (Originally split as 2c-RN/CE + 2d-VI; consolidated 5/4/2026 when prob-26 was redesigned as VI.)
- **Phase 2e plateau:** Diffusion model SDE foundation, score matching, Neural SDE / Neural ODE.

These plateaus collectively unlock the modern ML frontier (as of 2026): Bayesian Neural Networks, RLHF/DPO alignment, score-based diffusion, flow matching, and the information-theoretic bounds relevant to PAC-Bayes generalization.

### Page Count Realism

Drawing on the **Lie group series expansion pattern** (planned 2 → actual 4 pages), Phase 2c–2e pages are expected to follow the same 1.5–2× expansion factor. Initial estimates are therefore conservative lower bounds; final structure is determined during drafting.

---

### Phase 2c: Radon-Nikodym Track (3 pages — 2 complete, 1 in handout-ready state)

**Status update (5/4/2026):** Original Phase 2c plan was 2 pages (prob-24 + combined CE/RegCondDist prob-25). During prob-25 scoping (4/22), Regular Conditional Distributions was split off into prob-26 following the Lie-series precedent. On 5/4, after prob-25 completion, the prob-26 *content* was redesigned: Regular Conditional Distributions → Variational Inference (Murphy Ch.10 core). The Lie-series-style 1.5–2× expansion factor still holds — the 3-page Phase 2c structure stands, only the prob-26 contents changed. See prob-26 entry below for the pivot rationale.

#### prob-24: Signed Measures & Radon-Nikodym Theorem ✅ (completed 4/22/2026, refined 5/4/2026 to 1253 lines)
- **Topics covered:** Signed measures, Jordan-Hahn decomposition, absolute continuity, mutual singularity, ε-δ characterization of absolute continuity (with finite-hypothesis counterexample), Radon-Nikodym theorem proved via von Neumann's L² method, uniqueness via zero-integral lemma, chain rule and change-of-variables Proposition (statement (i) → (ii), proof (ii) full → (i) corollary), ML insight box (Bayesian posterior density, score in diffusion models, importance sampling, KL divergence and RLHF), Looking Ahead with three retroactive closures and four future horizons.
- **Lebesgue decomposition:** Excluded from main text per Phase 2c plan; referenced in Looking Ahead only.
- **Proof method:** von Neumann's L² method, as planned. Cross-section bridge to calc-25 (`#T-riesz_representation`) and calc-31 (`#T-riesz_fischer`) confirmed in §4.2 proof.
- **Anchor count:** 9 theorem/definition anchors (`T-radon_nikodym`, `T-rn_chain_rule`, `T-hahn_decomposition`, `T-jordan_decomposition`, `T-absolute_continuity_epsilon_delta`, `D-signed_measure`, `D-total_variation`, `D-absolute_continuity`, `D-mutual_singularity`). **All anchor IDs use the `T-foo_bar` / `D-foo_bar` underscore convention adopted concurrently with prob-24 completion**; pre-prob-24 pages retain their existing hyphen anchors.
- **Critical review outcome:** 12-unit critical review identified 17 MAJOR + 27 MINOR issues; all addressed via 3-round fix application (CRITICAL/MAJOR → MINOR → final sweep). One genuine proof bug caught (ε-δ characterization: non-monotonic A_n requires `limsup` not `lim`).
- **5/4 honest-framing refinement (Section III ML-bridge audit):** Caught and corrected 3 MAJOR + 2 MEDIUM "rigorous-object as algorithm-input" overclaims in §4 (ML applications): "almost every ML quantity is a RN derivative" → "many, at the foundational level"; "score integrates exactly the RN derivative" → "plays the role, in the dynamics, of the RN derivative; implementation does not compute the derivative directly"; "RN derivative is the object that algorithms compute with" → 4-application breakdown distinguishing "what licenses the construction" vs "what each algorithm actually does"; KL/RLHF "enforced by structural property" → "estimated by sample averages of log-ratios". §1 + §5.3 + "Next Chapter" paragraph also retrofitted with `class="ref-link"` to prob-25's `T-conditional_expectation_definition`. Net: +29 lines, qualitative improvement to ML-bridge honesty calibrated against the philosophy "rigorous existence licenses; whether the derivative is itself computed depends on the algorithm".
- **Retroactive closures (applied 5/4/2026):**
  - `measure_probability.html` (prob-22) L278–284: PDF existence licensed by prob-24 RN theorem ✅
  - `dual_spaces.html` (calc-25) L126–129: \((L^p)^* \cong L^q\) converse direction licensed by prob-24 ✅
  - `limit_theorems_product_measures.html` (prob-23) L749: conditional expectation preview ref-link to prob-25's `T-conditional_expectation_definition` ✅ (forward target prob-25 now exists)
- **Reference verified:** Durrett Ch. 1 & 5, Folland Ch. 3, Conway (Riesz representation bridge).

#### prob-25: Conditional Expectation ✅ (completed 5/4/2026, 956 lines)
- **Topics:** Conditional expectation \(\mathbb{E}[X | \mathcal{G}]\) defined as Radon-Nikodym derivative of the signed measure \(\nu_X(A) = \int_A X d\mathbb{P}\) with respect to \(\mathbb{P}|_\mathcal{G}\); existence and a.s. uniqueness as one-line corollary of prob-24; defining property (averaging identity); recovery of the discrete case (\(\mathbb{E}[X|A_i]\) consistent with abstract definition); algebraic properties (linearity, monotonicity, take-out, independence collapse, Jensen for CE, \(L^p\) contraction); \(L^2\) projection characterization (RN corollary, leveraging calc-25 `T-projection_theorem_hilbert`); tower property; ML applications (EM algorithm with Jensen-for-CE convergence proof, Bellman equation as tower property in disguise, Bayesian posterior predictive, ELBO); §4 closing Looking Ahead with two threads (deferred continuous case + martingale/SDE/diffusion/VI direction) + philosophical observation paragraph on the mathematics-implementation gap and the hypothesis that future ML systems may invoke the construction more directly.
- **Continuous case framing (final):** §2.4 identifies the pointwise reading \(y \mapsto \mathbb{E}[X|Y=y]\) as the topic of regular conditional distributions in measure-theoretic probability, *without* specifying a particular page that develops it. The deferral is honest and topic-based, not page-promised. Five locations originally written as "the next chapter" / "the upcoming page on regular conditional distributions" were retrofitted to general topic references on 5/4, in line with the hypertext-not-sequential-reading philosophy.
- **Honest-framing convention (defining commitment of this page):** §1 fourth paragraph and §4 closing observation paragraph both record the position that current ML implementations rarely instantiate the rigorous CE object directly (idealised form vs. density-based / MC-sampling / surrogate approximations), but that "this is a fact about today's implementations, not a verdict on the necessity of the underlying mathematics" — citing the historical pattern of Hilbert spaces preceding quantum mechanics and measure theory preceding modern probability. This framing is the calibration anchor for all subsequent ML-bridge pages.
- **Final size:** 956 lines (within 860–1160 estimate). 11 theorem blocks, 13 proof blocks, 9 ref-links.
- **Anchor count:** 10 new IDs (`T-conditional_expectation_definition`, `T-ce_discrete_recovery`, `T-ce_linearity`, `T-ce_monotonicity`, `T-ce_take_out`, `T-ce_independence`, `T-ce_jensen`, `T-ce_lp_contraction`, `T-ce_l2_projection`, `T-ce_tower`).
- **Prereqs:** `["prob-24", "calc-25"]`. (calc-25 for `T-projection_theorem_hilbert` directly invoked in §3.3, not transitively via prob-24.)
- **References:** Durrett Ch. 5.
- **Filename:** `conditional_expectation.html`. Icon: `𝔼[·|𝒢]`.

#### prob-26: Variational Inference (1 page, drafting handout v1 created 5/4/2026) — **redesigned from original Regular Conditional Distributions plan**
- **Major pivot rationale (5/4/2026):** Original Phase 2c plan had prob-26 = Regular Conditional Distributions (Polish space + disintegration). Discussion during prob-25 completion exposed two issues with that plan: (a) measure-theoretic regular conditional distributions are a topic in *measure-theoretic probability* with limited direct ML utility — they would be needed if Phase 2e SDE / path-space measures pages were active, but those are themselves trigger-based; (b) the ML-bridge philosophy of the curriculum makes Variational Inference, which has been a deferred backlog item (#345) since 3/28 and which prob-25 §4 already foreshadows, the more natural next page. The Regular Conditional Distributions topic is **demoted to trigger-based** (to be authored if Phase 2e SDE work demands the pointwise reading); no orphaning concern, because prob-25 §2.4 was retrofitted on 5/4 to cite "the regular-conditional-distribution framework in measure-theoretic probability" as a topic, *not* as a specific page.
- **Reference calibration:** Murphy *Probabilistic ML: Advanced Topics* (MLBook2) Chapter 10 (pp. 439–482, 45 subsections). prob-26 covers the **core only** (Murphy 10.1.1, 10.1.2, 10.1.4, 10.2.1, 10.2.3, 10.3.1); deliberately out-of-scope: 10.4 (more accurate posteriors), 10.5 (tighter bounds), 10.6 (wake-sleep), 10.7 (EP). The decision rule is: include topics that are foundational + used in current ML practice + provable in 1 page using prob-25 conditional-expectation tools; defer topics that warrant their own dedicated pages (normalizing flows, IWAE, EP, wake-sleep) to trigger-based future work.
- **Section structure (5 sections, ~690–960 lines):**
  - §1 Why Variational Inference? — intractable posterior + variational reformulation + prob-25 connection
  - §2 The ELBO and the KL Decomposition — ELBO definition, Jensen-based lower bound, exact KL decomposition (rigorous proof using prob-25), mean-field intro
  - §3 Computing the ELBO Gradient — gradient interchange problem, reparameterization trick (rigorous version of vae.html's), score function (REINFORCE) estimator, bias-variance trade-off
  - §4 Coordinate Ascent VI and Stochastic VI — CAVI derivation + Bayesian GMM sketch, Stochastic VI (Hoffman et al. 2013) with natural-gradient connection to natural_gd.html
  - §5 Looking Ahead — VAE / amortized VI (forward link to vae.html, which exists), variational programme generalisations (general topic references, no specific-page promises), honest acknowledgement of out-of-scope
- **Anchor plan (7 new IDs):** `D-elbo` (ownership migrates from vae.html to prob-26 post-publication; vae.html becomes ref-linker), `T-elbo_lower_bound`, `T-elbo_kl_decomposition`, `T-reparameterization_gradient`, `T-score_function_estimator`, `T-cavi_update`, `D-svi`.
- **Prereqs:** `["prob-25", "prob-12"]`. (prob-25 for CE / Jensen-for-CE / averaging identity; prob-12 / `Probability/entropy.html` for `D-kl_divergence` and analytic `T-jensen_inequality`.)
- **Cross-page dependencies:** vae.html (forward and backward), natural_gd.html (`D-fisher_information_matrix`, `D-natural_gradient` via §4.3 SVI bridge), prob-23 `T-dct` (gradient interchange justification), prob-24 `T-radon_nikodym` (dq/dp existence for KL).
- **Post-publication backlog:** vae.html ELBO + reparameterization sections to be retrofitted with ref-links to prob-26 (separate from prob-26 round 1 work).
- **References:** Murphy MLBook2 Ch. 10 (primary); Wainwright & Jordan, Blei et al. review (descriptive citations only).
- **Filename:** `variational_inference.html`. Icon: candidate `ELBO` / `q*` / `D_KL` (verify uniqueness against curriculum.json before commit).

**Phase 2c outcome (revised 5/4/2026):** Three deferred items resolved upon Phase 2c completion: #340 Lp duality (via prob-24 RN), #341 Conditional expectation (via prob-25), #345 Variational Inference foundation (via prob-26 — see below). Section III now has a rigorous Radon-Nikodym + conditional expectation + variational inference framework, enabling all downstream Bayesian/martingale/SDE/diffusion development. The Bayesian-continuous-parameter rigor item (originally targeted by Regular Conditional Distributions) is reframed: prob-26 §2.3 + §3 cover the variational *workaround* (q-tractable approximation under density assumption), which is the path actually taken in modern ML; the strict pointwise rigor via disintegration is demoted to trigger-based future work.

**Section III ML-bridge honest-framing audit (5/4/2026):** Concurrent with prob-25 completion, a systematic sweep was conducted across all four Section III pages (prob-22, 23, 24, 25) plus two Section V pages that ref-link to them (vae.html, natural_gd.html). The sweep caught and corrected a recurring overclaim pattern: "ML algorithm X *is* / *computes with* / *rests on* the rigorous mathematical object Y" where the implementation actually uses density-based approximation, Monte Carlo sampling, or learned neural surrogates. 12 corrections total (3 MAJOR + 5 MEDIUM + 2 MINOR + retroactive ref-link plumbing). The replacement framing — "in idealised form X; in practice approximated by Y; the rigorous existence licenses the construction" — was canonized in prob-25 §1 fourth paragraph and §4 closing observation paragraph, and serves as the calibration anchor for all future ML-bridge writing. Net file changes: prob-22 +3, prob-23 +7+1=+8, prob-24 +29, prob-25 itself written with this framing, vae.html +31, natural_gd.html +4. See "Completed Work / 5/4 honest-framing audit" section for the full corrections log.

---

### Phase 2d: Variational Inference — **ABSORBED INTO PHASE 2c (5/4/2026)**

The original Phase 2d plan (1–2 separate VI pages) is **superseded** by the prob-26 redesign of 5/4/2026. prob-26 = Variational Inference (Murphy Ch.10 core) covers what was originally split as "ELBO & Mean-Field" + part of "Stochastic & Amortized VI". Topics deliberately deferred from prob-26 — normalizing flows as variational families, IWAE / multi-sample bounds, expectation propagation, wake-sleep, hierarchical / structured / implicit posteriors — are demoted to **trigger-based future work** in the deferred items pool. Each could become its own page when a downstream ML page (diffusion model rigorous foundation, Bayesian Neural Networks, etc.) creates pressure.

**Backlog-style retrofit triggered by Phase 2c completion:** vae.html ELBO definition + Jensen proof + reparameterization trick exposition will be retrofitted to ref-link to prob-26's anchors (`D-elbo`, `T-elbo_lower_bound`, `T-reparameterization_gradient`) post-publication of prob-26. This is a separate backlog item, not part of any Phase.

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

### Phase 2f (optional, further deepening): Specialized Topics

If Section III deepening continues beyond Phase 2e, the following pages become natural candidates. These are **not committed** and remain in the deferred items pool, but are flagged here for continuity.

- **prob-XX: Variational Representations & f-Divergences** (1 page). Donsker-Varadhan variational formula, f-divergences (Hellinger, χ², α-divergence), Pinsker's inequality. Foundation for MINE (Mutual Information Neural Estimator), f-GAN, InfoNCE (contrastive learning), PAC-Bayes bounds. **Prereqs:** prob-24, prob-12, calc-25.
- **prob-XX: Uniform Integrability & Martingale Convergence** (1–2 pages). UI, Vitali convergence theorem, filtrations and martingales (discrete time), Doob's martingale convergence theorem. Foundation for stochastic approximation / RL theory, optional stopping. **Retroactive closure:** prob-23 L290's UI forward-reference. **Prereqs:** prob-24, prob-25.
- **prob-XX: Characteristic Functions & CLT (Rigorous)** (1 page). Characteristic functions as Fourier transforms of probability measures, Lévy continuity theorem, rigorous CLT proof. **Connection to calc-32 (Fourier in Hilbert).** **Prereqs:** prob-24, calc-32.

### Execution Sequence

Phase 2c is committed; Phase 2e/2f timing depends on interleaving with Phase 3 (Smooth Manifolds), ml-13 (GNN), and Phase 4 (Representation Theory). Candidate orderings (Phase 2d removed — absorbed into Phase 2c via prob-26 redesign):

- **Order A (Section III sprint, original):** prob-24 → prob-25 → prob-26 (now VI) → Phase 2e (Brownian/Itô/SDE), continuous.
- **Order B (balanced interleave):** prob-24 → prob-25 → prob-26 (now VI) → calc-32 → manifold series → Phase 2e → ...
- **Order C (deferred revisit):** prob-24 → prob-25 → prob-26 (now VI), then return to Phase 3 (manifolds) / ml-13 / Phase 4 (rep theory), and revisit Phase 2e only when a concrete ML page (diffusion model rigorous foundation page) creates pressure.

**Current default (5/4/2026):** Order C. Phase 2c (prob-24 ✅ / prob-25 ✅ / prob-26 in handout-ready state) closes upon prob-26 completion. Phase 2e triggers are: (a) starting a dedicated ml-XX diffusion model rigorous foundation page, (b) starting a dedicated ml-XX continuous-time RL / Neural SDE page. Regular Conditional Distributions (the original prob-26 plan) is also a Phase 2e trigger, since SDE / path-space measures require regular conditional distributions on Polish spaces.
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
| prob-22 | `measure_probability.html` | ✅ (refined 5/4/2026 for ML-bridge framing) |
| prob-23 | `limit_theorems_product_measures.html` | ✅ (refined 5/4/2026 for ML-bridge framing + retroactive ref-link to prob-25) |
| prob-24 | `radon_nikodym.html` | ✅ (4/22/2026, refined 5/4/2026 to 1253 lines) |
| **prob-25** | `conditional_expectation.html` | ✅ **(5/4/2026, 956 lines)** |

### Planned Pages (ID assigned)

| Page ID | Planned Filename | Status |
|---------|-----------------|--------|
| calc-32 | `fourier_hilbert.html` | Next |
| ml-13 | `graph_neural_networks.html` | Next |
| **prob-26** | `variational_inference.html` | **Phase 2c — drafting handout v1 created 5/4/2026 (Murphy Ch.10 core, redesigned from original Regular Conditional Distributions plan)** |

### Planned Pages (ID deferred — assigned at drafting time)

| Series | Est. Pages | Planned Filenames | Status |
|--------|-----------|-------------------|--------|
| Smooth Manifolds (calc-XX) | ~3 | `smooth_manifolds.html`, `tangent_spaces.html`, `vector_fields_flows.html` | After ml-13 |
| Riemannian Metrics (calc-XX) | ~2 | `riemannian_metrics.html`, TBD | After manifold series |
| Representation Theory (linalg-XX) | ~3–4 | TBD | After manifold series |
| ml-14 | 1 | `equivariant_nn.html` | After representation theory |
| **Stochastic Calculus (prob-XX, Phase 2e)** | ~2–3 | `brownian_motion.html`, `ito_integral.html`, `sde_fokker_planck.html` | Triggered by diffusion ml-page / Neural SDE / physical AI page demand |
| **Regular Conditional Distributions (prob-XX, demoted from Phase 2c)** | ~1 | `regular_conditional_distributions.html` | Triggered by Phase 2e SDE / path-space measures pages (Polish-space disintegration is required for Itô calculus filtration foundations) |
| **Advanced VI topics (prob-XX, demoted from original Phase 2d)** | ~1–2 | TBD (`normalizing_flows.html`, `expectation_propagation.html`, `iwae_tighter_bounds.html` candidates) | Triggered by individual ML-application pressure: normalizing flows by diffusion model rigorous foundation, EP by graphical-model inference work, IWAE by tighter-bound research applications |
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
| **Continuous-Time Stochastic Processes** | Brownian motion, Itô integral, SDEs; requires solid measure-theoretic probability | **→ Phase 2e (prob-XX, ~2–3 pages):** Triggered by diffusion model / Neural SDE / physical AI page demand |
| **Regular Conditional Distributions** (NEW, demoted from Phase 2c on 5/4/2026) | Polish space + disintegration theorem; required for pointwise reading of \(\mathbb{E}[X\|Y=y]\) and for path-space measures in stochastic calculus | **→ Phase 2e prerequisite** (will be authored when SDE / Itô filtration work creates pressure); not blocking for prob-26 = VI which works under density assumption |
| **Fiber Bundles & Gauge Theory** | Requires mature manifold theory + Lie groups (linalg-27~30) | If GDL viewpoint page demands gauge equivariance machinery |
| **String Diagrams** | Categorical tool; requires disc-XX (Category Theory) | After CDL viewpoint page is planned |
| **Advanced VI topics** (NEW, demoted from original Phase 2d on 5/4/2026) | Normalizing flows as variational families, IWAE / multi-sample bounds, expectation propagation, wake-sleep, hierarchical / structured / implicit posteriors — all topics from Murphy MLBook2 Ch.10 deliberately excluded from prob-26's core scope | **→ Triggered individually by ML-application pressure:** normalizing flows by diffusion model rigorous foundation, EP by graphical-model inference work, IWAE by tighter-bound research applications |
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
- **5/4/2026 (post prob-25 completion):** Phase 2c third-page redesign + Section III ML-bridge honest-framing audit + Filename Registry consolidation.
  - **prob-25 (`conditional_expectation.html`) completed**: 956 lines (within 860–1160 estimate). 11 theorem blocks, 13 proof blocks, 9 ref-links. 10 new anchor IDs registered. Final structure: 4 sections (Why CE / Definition via RN / Properties / In Practice) — original §5 Looking Ahead absorbed as a closing paragraph in §4 per Yusuke's "1 paragraph at the end is enough" verdict during drafting.
  - **prob-25 honest-framing convention established**: §1 fourth paragraph and §4 closing observation paragraph jointly establish the framing "in idealised form X; in practice approximated by Y; the rigorous existence licenses the construction" + the meta-observation that "this is a fact about today's implementations, not a verdict on the necessity of the underlying mathematics" with the historical analogy of Hilbert spaces preceding QM and measure theory preceding modern probability. This framing is canonized for all future ML-bridge pages.
  - **prob-25 5-location specific-page reference removal**: Original prob-25 wrote "the next chapter" / "the upcoming page on regular conditional distributions" in 5 locations (§2 intro, §2.2 closing, §2.4, §4 Bayesian, §4 Looking Ahead). All five retrofitted to general topic references ("a topic in measure-theoretic probability", "the regular-conditional-distribution framework") without specific-page promises. Triggered by Yusuke's observation that the site is hypertext-not-sequential — pages are independent reading units, not chapters in a book.
  - **prob-26 redesigned: Regular Conditional Distributions → Variational Inference**: Original Phase 2c plan had prob-26 = RegCondDist (Polish + disintegration). After (a) discussion of what current ML actually uses, (b) Yusuke's confirmation that "ML doesn't currently use this" doesn't imply "math is not needed" (so RegCondDist still has long-term curriculum value), but (c) redesign rationale that VI is more directly downstream of prob-25 §4 + has been a deferred backlog item since 3/28, prob-26 is redesigned around Murphy MLBook2 Chapter 10 core (10.1.1, 10.1.2, 10.1.4, 10.2.1, 10.2.3, 10.3.1). RegCondDist demoted to trigger-based future work (will be authored when Phase 2e SDE / path-space measures pages create pressure). prob-25 §2.4 retrofit on 5/4 left no orphaned forward link.
  - **Phase 2d absorbed into Phase 2c**: prob-26 = VI covers what was originally Phase 2d's first page. Topics deliberately deferred — normalizing flows, IWAE, EP, wake-sleep — demoted to trigger-based "Advanced VI topics" in deferred items pool.
  - **prob-26 drafting handout v1 created** (`prob26_drafting_handout.md`, 422 lines). Includes: page identity, strategic position with Murphy Ch.10 include/defer/out-of-scope decision table, 5-section plan, 7-anchor ID registry, dependency audit (with vae.html `D-elbo` ownership migration plan), self-review checklist, 3-round drafting plan, 5 open questions to resolve during drafting, post-publication checklist.
  - **Section III ML-bridge honest-framing audit (12 corrections)**: Systematic sweep across prob-22, 23, 24, 25 + vae.html + natural_gd.html. Caught and corrected recurring overclaim pattern "ML algorithm X *is* / *computes with* the rigorous mathematical object Y". Specific corrections: (a) prob-22 L304 "VAEs routinely operate on mixed distributions" → "discrete-latent VAEs (Gumbel-Softmax, VQ-VAE) and hybrid models require dominating-measure-free framework"; (b) prob-22 L685 "DCT justifies SGD" → "DCT licenses, under stated regularity hypotheses, the gradient interchange in SGD"; (c) prob-23 L353 "DCT is the theoretical foundation of SGD ... gradient clipping motivated by DCT failure" → "one rigorous ingredient + Pascanu-Mikolov-Bengio 2013 historical attribution + DCT-failure interpretation labeled as interpretive"; (d) prob-24 §4 — 4 separate corrections detailed in prob-24 status entry above; (e) vae.html L80–91 measure-theoretic framing → "idealised abstract framework that the densities and ELBO decomposition implemented here approximate"; (f) vae.html L72–78 "posterior variance proxies epistemic uncertainty" → epistemic-vs-aleatoric distinction + Kendall & Gal 2017 reference + caveat that VAE encoder doesn't separate the two; (g) vae.html L460 "real-world systems use VAE σ for OOD detection" → "pedagogical analogy + Nalisnick et al. 2019 published failures of generative-model OOD detection"; (h) vae.html L344+L389 hand-coded encoder mapping presented as "VAE essential property" → explicitly framed as "hand-design a fixed mapping for pedagogical demo, not learned"; (i) natural_gd.html L195 "the correct (information-geometric) metric" → "the information-geometric metric ... not universally the 'correct' notion of distance for every learning problem". Net file deltas: prob-22 +3, prob-23 +8, prob-24 +29, prob-25 written with framing, vae.html +31, natural_gd.html +4. The conventions established here serve as the calibration anchor for prob-26 and all subsequent ML-bridge writing.
  - **prob-23/24 retroactive ref-link plumbing applied**: 4 pre-existing CE forward references in prob-23 (L749) and prob-24 (§1, §5.3 closing, §5 "Next Chapter") wired to prob-25's `T-conditional_expectation_definition` with `class="ref-link"`. prob-24 "Next Chapter" paragraph also corrected to align with prob-25's continuous-case deferral framing ("subsumes both discrete and continuous case" → "discrete recovered verbatim; continuous requires further machinery, taken up separately").
  - **curriculum.json prob-25 entry prepared** (`curriculum_prob25_entry.json`, ready for Yusuke manual merge): part 25, icon `𝔼[·|𝒢]`, prereqs `["prob-24", "calc-25"]`, sections list reflects 4-section final structure, mapCoords null per protocol, description and tesseraMessage calibrated to prob-22/23 length norms (description 436 chars, tesseraMessage 148 chars).
  - **Roadmap consolidation**: Phase 2d section replaced with "ABSORBED" marker; Phase 2c heading updated to "2 complete, 1 in handout-ready state"; Filename Registry's prob-25 row moved from Planned to Completed Pages; prob-26 row updated to `variational_inference.html`; Order C language updated to remove Phase 2d references. Section III page count updated from 23 → 25 (prob-24, 25 added).
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