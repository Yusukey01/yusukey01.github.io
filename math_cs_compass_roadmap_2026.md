# MATH-CS COMPASS: Curriculum Roadmap & Development Plan (v9)

**Author:** Yusuke Yokota
**Last Updated:** 7/6/2026
**Website:** https://math-cs-compass.com

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science,
addressing the gap where CS students struggle with mathematical foundations while math students
lack awareness of applications. The primary focus is rigorous mathematical foundations for
modern AI/ML, with continuous expansion into adjacent domains (GDL, CDL, cryptography,
stochastic analysis).

**Total: 226 pages.** I (linalg) 43 / II (calc) 99 / III (prob) 26 / IV (disc) 40 / V (ml) 18. `curriculum.json` is authoritative.

**Five tracks** (status + full detail in Part 2):
- Phase 2e — stochastic analysis track (III, Øksendal Ch.2–8 body + dispersed app landings) — ⏸ awaiting Øksendal purchase
- Rep Theory — GDL continuous leg (I+V) — ✅ complete
- CDL — category theory (IV+V) — 🔄 Stage 2 in progress
- Crypto — through PQC incl. Quantum (IV+I) + Section V landing (ml-18, stage 5) — ✅ complete
- TDL — GDL discrete leg (IV+V) — ✅ landed (optional persistent-homology branch remains)

---

## Part 1 — Application Domains: Pillar vs. Viewpoint

### 1.1 Two orthogonal axes
- **Pillar (vertical thread)**: a structural thread that multiple Sections converge into; a
  load-bearing column.
- **Viewpoint (re-visit at different heights)**: a perspective returned to repeatedly at higher
  mathematical altitude, never "completed."
These are independent. A domain can be Pillar and Viewpoint / Viewpoint only / Pillar only / neither.

### 1.2 Classification of the three domains

| Domain | Pillar? | Viewpoint? | Production maturity (2026) | Site treatment |
|---|---|---|---|---|
| **GDL** | ✅ | ✅ | High (AlphaFold, MACE, EquiformerV3, equivariant robotics) | **Pillar and Viewpoint** — **two-leg** (below) |
| **CDL** | ⚠️ Pre-pillar | ✅ | R&D (Coend $31M, no product) | Slow-burn parallel track |
| **Quantum** | ⚠️ Latent | ✅ | Limited (PQC is separate, see Crypto) | Viewpoint via Insight Box |

**GDL two-leg structure** (detailed in Part 3):
- **Continuous leg**: manifold -> Riemannian -> representation theory -> Equivariant NN
  (SO(3)/SE(3) continuous symmetry) = Rep Theory track.
- **Discrete leg**: GNN (ml-13) -> simplicial complexes / Hodge (disc-13~15) -> SNN/TDL
  (ml-17, **complete**; higher-order interactions) = TDL track. TDL is a subfield of GDL (confirmed 2026).
- The two legs will eventually **rejoin via Hodge theory** (continuous Hodge = differential
  forms / discrete Hodge = simplicial complexes, bridged by DEC).

### 1.3 Authorial scale
Yusuke holds a US double major in math and CS (non-elite institution), self-described as
broad-but-shallow. Prior knowledge varies sharply by topic: Lie theory was familiar
(expert-reviewer mode); category theory, stochastic analysis, representation theory, and TDL are
learn-while-writing. Track-character is calibrated per topic, not against a global label.

---

## Part 2 — Active-Track Overview (index layer)

A unified view of the five tracks. Per-track detail is authoritative in the individual handouts.

### 2.1 Track table

| Track | GDL relation | Section | Start status | Purchase | Handout |
|---|---|---|---|---|---|
| **Phase 2e** stochastic analysis | — | III | **awaiting Øksendal purchase**; scope upgraded v2 (Ch.2–8 body, 4p prob-27~30 + dispersed app landings) | **Øksendal 6th ed.** | `phase2e_handout_v2` |
| **Rep Theory** | **continuous leg** | I (rep) + V (Equiv NN) | **linalg-31~40 (incl. Peter–Weyl) + ml-16 complete; GDL-mandatory scope fully satisfied** | Hall 2nd ed. (on hand) | `rep_handout_v10` (archival) |
| **CDL** category theory | — | IV (cats) + V (CDL bridge) | **Stage 2 in progress: disc-18~28 published (Leinster Ch.1–5 done); next = Ch.6 §6.1 = disc-41 (fixed; Ch.6 total 5–6p, PDF-scoped)** | none (both primary free) | `cdl_track_handout_v13` |
| **Crypto** through PQC | — | IV (classical + Shor + lattice-computation + PQC) + I (algebra + quantum bg + lattice geometry) + **V (LWE landing ml-18, `security`)** | **✅ COMPLETE (mainline arc + ZKP + stage 5 Section V landing)** | none | `crypto_track_handout_v27` |
| **TDL** | **discrete leg** | IV (existing Hodge) + V (SNN) | **SNN (ml-17) complete; discrete leg landed. Optional persistent-homology branch (disc-XX) remains** | TDL book (free) | `tdl_track_handout_v2` |

### 2.2 Shared structural pattern

Four of the five tracks share the same shape:
- **"The mathematical content is owned by its native Section; identity shifts to Section V at
  the ML/application point."** Rep (math=I, Equiv NN=V) / CDL (cats=IV, bridge=V) /
  TDL (Hodge=IV, SNN=V) / Phase 2e (math=III, landing ml-14/15 = existing V).
- **Crypto is the partial exception (updated 2026-07-06, handout §0.9):** the *quantum* half has
  no Section V landing — Shor/PQC own Section IV (algorithm) and Section I (quantum/lattice geometry),
  and Section V owns no quantum mathematics (the old quantum "Section V bridge" idea stays **dropped**,
  handout §0.8). But the *LWE* half now **does** land in Section V: **ml-18 (`security` group, crypto
  stage 5)** reads LWE as noisy regression + ring homomorphism (noise duality), a genuine ML/application
  landing. Crucially this does **not** break "mathematics is owner": ml-18 owns no crypto mathematics —
  disc-38/39 remain the native owners, ml-18 only ref-links them and adds the ML *reading* (landing ≠ owner).
- This is a consistent expression of the site principle "application is viewpoint, mathematics
  is owner" (Part 1).
- **Obsolescence-resistance principle** (established in Crypto §0.5 / Phase 2e): write the
  enduring mathematics thickly (continuous-time generation, LWE hardness), not the individual
  method (diffusion, ML-KEM). When methods are replaced, the foundation survives.

### 2.3 Start priority (mood-driven; no single order enforced)

No forced order — if one track stalls, others proceed (Part 12 principle 7). After crypto
completion the remaining active work is **CDL (Stage 2), Phase 2e (awaiting purchase), and the
optional TDL persistent-homology branch**. Dispatch by interest: CDL carries the only real deadline
pressure (asymmetric prep cost); Phase 2e is unblocked the moment Øksendal is acquired. The former
hard-ordering constraint (Shor after crypto substrate + linalg-41) is fully discharged — nothing
blocks anything now.

---

## Part 3 — GDL Pillar (two-leg: continuous Rep + discrete TDL)

GDL stands on two legs (Part 1.2): a continuous leg (Rep Theory) and a discrete leg (TDL).

### 3.1 Why GDL is a pillar (three independent reasons)
1. **Mathematical thickness**: Lie groups, Riemannian geometry, fiber bundles, representation
   theory, and spectral graph theory all converge into GDL.
2. **Production maturity (2026)**: equivariant nets, GNNs, SE(3)-Transformers, EquiformerV3, MACE
   have moved from research to deployment (AlphaFold, molecular design, equivariant robotics).
3. **Independent forward growth**: robotics × ML keeps expanding for information-theoretic
   reasons; architectures lacking equivariance pay a principled sample-efficiency cost.

### 3.2 Why it is also a viewpoint
A thick pillar looks different at different heights. At ml-13 (GNN) the reader sees only
"permutation-equivariant message passing on discrete graphs"; after the manifold series,
continuous symmetry; after representation theory, irreducible decomposition; after calc-32,
Peter-Weyl bridges to harmonic analysis. The pillar is passed through repeatedly, each time at
deeper understanding.

### 3.3 Continuous leg — Representation Theory track

**COMPLETE.** Section I (rep theory linalg-31~40) + Section V (Equivariant NN, ml-16).
Wiring: Lie groups -> group representations -> irreducible decomposition -> Schur -> Equivariant NN,
with Peter–Weyl (linalg-40) reclaiming calc-32 Fourier. GDL-mandatory scope fully satisfied; only the
GDL-unnecessary deep-dive (semisimple / Verma / Weyl character formula) remains.
**Detail**: site pages + `rep_handout_v10` (archival: route, owners, symbol conventions, deep-dive trigger map).

### 3.4 Discrete leg — TDL (Topological Deep Learning) track

**SNN (ml-17) COMPLETE — discrete leg landed.** Section IV (Hodge existing in disc-13/15) + Section V
(SNN, ml-17). GNN (ml-13) generalized pairwise -> higher-order via the Hodge Laplacian; \(\ker L_k \cong H_k\)
makes the propagation operator report holes. TDL is a subfield of GDL (GNNs = pairwise; TDL = n-body
over simplicial/cellular complexes). Reference: TDL book (tdlbook.org, registered) + Edelsbrunner-Harer.
**Remaining**: persistent homology (disc-XX) only — optional TDA branch off disc-15's other forecast,
not GDL-mandatory. Future / mood-driven.
**Detail**: site pages + `tdl_track_handout_v2`.

### 3.5 Rejoining of the two legs (Hodge, future deep connection)
Continuous Hodge (differential forms: Lee Ch.14 complete = calc-82/83/84; orientations Ch.15
complete = calc-85~89; integration Ch.16 through Riemannian = calc-90/91/92 complete) and discrete
Hodge (simplicial complexes, disc-13/15 existing) share the same structure.
DEC (Part 11 deferred) will be the reclamation hub bridging both legs. calc-91 Stokes is the
continuous-side origin sitting on the de Rham / DEC critical path (manifold handout v24). Recorded for
now; the relevant Part 11 entries are "Spectral Laplacian" and "DEC."

Both legs' GDL-mandatory scope is complete (continuous: Rep Theory + Peter–Weyl + ml-16; discrete:
SNN ml-17). Standing obligation: each GDL page carries forward-pointers to "the next mathematics."

---

## Part 4 — Phase 2e: Stochastic Analysis Track (Active Slow-Burn)

Build a stochastic-analysis track in Section III from **Øksendal Ch.2–8** (the mathematical body:
Brownian motion → Itō → SDE → diffusions/generator/Fokker-Planck), with the "with Applications"
chapters (Ch.6, 9–12) dispersed as landings/bridges rather than laid out in chapter order. One
strand of this — the BM→Itō→SDE→FP path — justifies from below the continuous-time machinery that
ml-14 (diffusion) / ml-15 (flow matching) use as given; but the track's range is the analysis
itself, not only the generative-model support.

### 4.1 Scope upgrade (v1 → v2)
v1 scoped Phase 2e narrowly as "justify ml-14/15's continuous-time objects from below," 3 pages
(BM+Itō / SDE / FP) — only Øksendal Ch.2–5. v2 (after ToC review): one Øksendal volume covers the
intended range in full. Of the 12 chapters, **Ch.2–8 are the mathematical body**; Ch.6, 9–12 are
application chapters. Therefore:
- **Track body = Øksendal Ch.2–8**, owned in Section III (v1's 3 pages + a diffusions/generator page).
- **Application chapters are NOT poured into Section III in chapter order** (violates the topicGroup
  principle: a page is placed by *what it is*, not *what it is used for*). They are dispersed as
  landings/bridges when the site's callback structure demands them — the same tracks-isomorphic
  structure as crypto (Peikert not followed in chapter order; SIS/LWE owned, applications landed in V).
- **Martingale theory stays "touched only"** — Øksendal itself does not systematize it (introduces
  it minimally as a tool for the Itō integral; Ch.4 "Itô Formula and the Martingale Representation
  Theorem" is the sole locus, and only to the representation theorem). The site follows suit:
  Doob's maximal inequality / optional stopping / convergence theorems are **not owned**; filtration
  and adapted processes are owned minimally as Itō-integral scaffolding. A full martingale
  systematization, if ever done, is Durrett territory and split off as the Part 11 deferred item
  "Uniform Integrability & Martingale Convergence."

### 4.2 Significance in the Flow Matching era
Diffusion is being displaced by FM in practice (FLUX, SD3 are rectified flow), but **both are
ODE/SDE representations of the same object** (Stochastic Interpolants). The generative-support
strand is not diffusion-specific but "the continuous-time basis unifying diffusion and FM." Its
significance strengthened, not weakened, in the FM era. Obsolescence-resistance concentrates the
value in the self-contained mathematics (Ch.2–8), not the method.

### 4.3 Track-body structure (Section III; free ids prob-27~30, assigned at drafting)

| Page | Øksendal | scope | callback / bridge |
|---|---|---|---|
| 1 `brownian_motion_ito.html` | Ch.3–4 | Wiener-process axioms, existence (Kolmogorov+Čentsov), path pathology, Itō integral L² construction, Itō formula | ml-15's \(\mathbf{w}_t, d\mathbf{w}_t\) |
| 2 `sde_diffusion.html` | Ch.5 | SDE definition, existence-uniqueness (Lipschitz/Picard), OU/Langevin, generator, Dynkin, Girsanov | ml-15's σ_t-tuned SDE |
| 3 `fokker_planck_diffusion_model.html` | Ch.8 (fwd) | FP = adjoint of generator (Kolmogorov forward), heat eq (calc-33), score, reverse-time SDE | **justifies ml-15's special-case machinery from below (biggest callback)** |
| 4 `diffusions_generator.html` | Ch.7–8 | Itō diffusions, strong Markov (built fresh, not from prob-18), stopping time + first hitting, generator as diffusion-process operator, Dynkin general form, Kolmogorov backward (paired with Page3 forward) | resolvent → calc-27's unbounded-\(-\Delta\) foreshadow; FP adjoint → calc-27 `T-existence_of_adjoint` |

prereqs: Page1 <- prob-23, prob-21, calc-23 / Page2 <- Page1, prob-24 / Page3 <- Page2, calc-33 /
Page4 <- Page2, Page3. Page3(forward) ↔ Page4(backward) cross-linked. Page4 splits into
"strong Markov & stopping" + "generator & Kolmogorov equations" if volume forces it (Lie 2→4,
FA 2→7 precedent). All four pages close on existing foundations — **zero new prereqs**.

### 4.4 Application-chapter dispersal (post-body, callback-driven; forward-pointers only for now)

| Øksendal | math | placement | trigger |
|---|---|---|---|
| Ch.9 Feynman-Kac | probabilistic rep ↔ parabolic PDE | **Section II bridge** (calc-33~35; also calc-27 `T-existence_of_adjoint`) | a PDE-probabilistic-interpretation page |
| Ch.10 Optimal Stopping | stopping time / optimal stopping / free boundary | **Section V landing** (RL/optimal control) | an RL-theory or optimal-stopping-ML page (stopping-time *definition* owned by Page4) |
| Ch.11 Stochastic Control | HJB | **Section V landing** (RL) | continuous-time limit of ml-10's discrete Bellman (`T-bellman_optimality`); ml-10 is discrete-only with no forward-pointer → new one-directional landing, ml-10 unchanged |
| Ch.6 Filtering | Kalman-Bucy | deferred | a state-space/Kalman ML page (low priority) |
| Ch.12 Finance | Black-Scholes | **out of scope** | — (ML/CS-orientation mismatch) |

### 4.5 Reference / start
- primary: Øksendal (SDE proper, **purchase required** — Springer Universitext 6th ed.,
  ISBN 978-3-540-04758-2) + Durrett (measure-theoretic substrate, on hand) + Holderrieth-Erives
  (FM/diffusion unification, the V-side bridge, free, already used on the ML side).
- No OT book -> FM/rectified flow/OT are forward-pointers only (no href).
- Rigor calibration (whether to add Karatzas-Shreve) decided after seeing scope. On hold.
- **Start status: awaiting Øksendal purchase** (then Page1 BM+Itō). Zero new prereqs;
  the only blocker is acquiring Øksendal. Dependency audit complete (body 4 pages).
- track-character: a CS author learning pure math while writing (same class as CDL).
- Detail: `phase2e_handout_v2`.

### 4.6 Notes (overload / owner facts, see Part 8 ledger)
- `D-infinitesimal_generator` exists on the Lie/differential-geometry side (owner = calc-64
  `integral_curves.html`) -> SDE generator must use `D-sde_generator`. Page4 receives it by
  ref-link (does not re-own).
- `score_function` triple collision (Fisher/data/continuous) -> Page3 ref-links ml-14's
  `D-score_function_data_gradient`, does not define a new one.
- `characteristic` is an overloaded word (4 owners incl. ring characteristic `D-characteristic`)
  -> Øksendal's characteristic operator folded into the generator rather than owned separately.
- prob-18 (`markov.html`) is a graphical-models (first-order Markov) page, **not** a stochastic-
  process Markov-chain page -> Page4 does not depend on it; strong Markov is built fresh, prob-18
  gets a loose back-link only, not a prereq.
- Page4 anchor set (`D-ito_diffusion`, `D-stopping_time`, `T-strong_markov_property`,
  `T-kolmogorov_backward`) collision-checked free (2026-07-11); `martingale`/`stopping`/`adapted`/
  `semigroup`/`dynkin` have zero existing owners.

---

## Part 5 — CDL: Pre-Pillar Slow-Burn Track

Build category theory in Section IV and name the categorical structure already latent across the
site (the culmination of the callback philosophy). Pre-position the mathematics before CDL
applications mature.

### 5.1 Why now (MUST cover but slow)
- **Convergence of the mathematics**: deepening Section IV (graph -> simplicial -> homology),
  I (group -> ring -> field -> Lie), II (continuous map -> FA) leads inevitably into the language of categories.
- **Asymmetric preparation cost**: category-theory preparation is deep and not skippable. If CDL
  applications mature in 2027-2028, building it at speed is infeasible -> pre-positioning is the
  only strategy.
- **The structural deadline is starting slowly now itself**. Unlike other tracks, deferring this
  one creates a trap later.

### 5.2 Placement decision (owner Section)
**owner = Section IV**. Applying the topicGroup principle — a category-theory page's identity is
"a discrete/combinatorial algebraic structure with composition" (a category = objects + morphisms
+ composition), which is Section IV's identity itself. That category theory cites Vect/Hilb as
examples is *usage*, not the object. Corroboration: formal methods (disc-16/17 Lean) = type
theory = the twin of category theory (Curry-Howard-Lambek).

**"Cross-Section spanning" is not a placement problem but a ref-link direction problem**: a
category page (IV) citing examples from I/II just means ref-links pointing outward; the owner
stays IV (precedents: Peter-Weyl math owned in II while ml-16 lands in V; the same outward-ref-link pattern).

**Spanning is the greatest weapon — reclamation hub design**: the stage 1 page **intentionally
bundles** ref-links to examples in Sections I/II/IV, letting the reader see at a glance "the
groups from Section I, the Banach spaces from Section II — they were all categories." The Section
IV category page becomes the site-wide callback hub. The manifold Q7 (differential \(dF_p\) =
functor; calc-45/46 `T-differential_properties`/`T-global_differential_properties`) connects here.

### 5.3 Track structure (per handout; Ch.1–5 = 11p done, Ch.6 = 5–6p PDF-scoped)

Progress (2026-06-24): **Stage 0/1 done, Stage 2 in progress.** disc-18~28 published (Leinster Ch.1–5 done).

| Stage | Placement | Content | Status |
|---|---|---|---|
| 0 | — | Yusuke reads Leinster (start trigger) | ✅ done |
| 1 | disc-18~24 (IV) | categories/functors/natural transformations (disc-18, Ch.1) / adjunction (disc-19/20, Ch.2) / interlude on sets (disc-21, Ch.3) / representables & Yoneda (disc-22/23/24, Ch.4) (+ site-wide hub ref-links) | ✅ done |
| 2 | disc-25~28 (IV) | limits/colimits (disc-25/26/27/28, Ch.5); **next = disc-41: Ch.6 §6.1 (limits via representables/adjoints), then §6.2 disc-42~44 (pointwise/density), §6.3 disc-45~46 (RAPL/LAPC, CCC)** — Ch.6 total 5–6p, PDF-scoped (disc-29~40 consumed by crypto) | 🔄 in progress |
| 3 | disc-XX (IV) | applied: quivers/database functors / string diagrams | pending |
| 4 | ml-XX (V) | CDL bridge: Para, lenses, **monad on Para** (primer for the Gavranović paper) | pending |
| 5 | ml-XX (V) | CDL Overview / intro: revisit the whole site from a categorical viewpoint | pending |

**monad / Kan extension handling (handout v10 §3):** the old §5.3 placed "monads / Kan extensions" in Stage 2, but (a) **monad has no dedicated treatment in either Leinster or Fong-Spivak, so it gets no standalone page in IV** — instead it is introduced as a monad on Para in the window-model at **Stage 4 (Section V)**. (b) **Kan extension has no chapter in either primary** (acquisition flag: Riehl / nLab, not yet in references.json). Stage 2's actual content is Leinster Ch.5 (limits/colimits) + Ch.6 (adjoint↔limit interaction).

stage 3 -> 4 is the IV -> V crossing (identity shifts from math to ML application).

### 5.4 Reference / start
- Leinster *Basic Category Theory* (rigorous, IV, **free** arXiv:1612.09375, CC BY-NC-SA, v2 2025/8)
- Fong & Spivak *Seven Sketches* (applied, **free** arXiv:1803.05316, CC BY 4.0)
- **Both free, no purchase.** Leinster himself includes poset/monoid examples in the book (an
  entry-design option).
- **Section V CDL intro (≈ Stage 5) is deferred as a future task** (handout v10 §3.3). When written, **restrict to the established layer (Backprop as Functor LICS2019 / Categorical Foundations of Gradient-Based Learning ESOP2022 / Parametric Lenses arXiv:2404.00408)**, and frame the ICML 2024 position paper's "all architectures" claim honestly as an ongoing research direction, not settled theory. The CDL intro is where disc-20's monad foreshadowing pays off.
- Detail: `cdl_track_handout_v13`.

### 5.5 Status monitoring (web-verified 2026-06-24)
The field has accumulated (peer-reviewed established layer + recent survey), but the frontier is
still conjectural (the survey itself flags weighted optics etc. as open) and there is **no
production deployment** (no categorical primitives in PyTorch/JAX) -> slow-burn, mathematics-only.
Status-shift triggers: Coend ships a product / a CDL architecture wins a benchmark / a major
framework adds categorical primitives / a second well-funded entrant. Paper list: handout §3.3.

### 5.6 Notes (Part 8 ledger)
- `adjoint` triple overload (Lie adjoint representation / FA operator adjoint / CDL adjoint
  functor) -> CDL uses `D-adjoint_functor`.
- Category-page entry correction: "lattice in disc-1/2/3" is wrong (actually Graph/Combi/ToC).
  No poset/lattice page exists; monoid undefined -> entry via Leinster examples or existing assets
  (Set/Grp/Vect/Ban/Hilb/Top).

---

## Part 6 — Crypto Track (✅ COMPLETE — includes Quantum + Section V landing ml-18)

The former standalone "Quantum" plan is absorbed here — quantum computation shipped as part of the crypto stack (Shor = attack, lattices = defense), not as a separate track.

Complete through PQC. Realized placement below; all policy/lessons/per-page detail live in
`crypto_track_handout_v27` (single source of truth) + `curriculum.json`/`previews.json`. Only the
**placement outcomes that the topicGroup principle produced** are kept here, as the canonical worked
example of Part 12 principle 10.

### 6.1 Realized placement

| Layer | Pages | Section | topicGroup |
|---|---|---|---|
| Classical foundations + public-key + number theory + signatures | disc-29~34 | IV | `cryptography` |
| Quantum background (qubit/measurement/evolution/QFT) | linalg-41 | I | `quantum` (new) |
| Shor (attack) | disc-35 | IV | `cryptography` |
| Lattice geometry (lattice + dual, Minkowski) | linalg-42/43 | I | `lattice` (new) |
| Lattice computational problems (SVP/GapSVP/SIVP/BDD) | disc-36 | IV | `computation` |
| SIS / LWE / Ring-Module-LWE + ML-KEM | disc-37/38/39 | IV | `cryptography` |
| ZKP (off-mainline) | disc-40 | IV | `cryptography` |
| **LWE Section V landing (stage 5): noise duality — estimation + homomorphism views** | **ml-18** | **V** | **`security` (new)** |

Mainline arc = attack (Shor) -> defense (geometry -> computational problems -> SIS -> LWE ->
Ring/Module-LWE + ML-KEM) -> **stage 5 Section V landing (ml-18)**. Stage 5 reads LWE (disc-38) as
noisy regression (ref-links ml-2 Ridge/Lasso) + ring homomorphism (ref-links disc-39); it owns **no**
new crypto mathematics — disc-38/39 stay the native owners, ml-18 adds only the ML *reading* (landing
≠ owner, handout §0.9). New topicGroup **`security`** (Section V, holds future FHE/DP/ZKP × ML landings).
Primaries: HAC + de Wolf + Regev (courses) + Peikert; all free, all registered in `references.json`.

### 6.2 Placement decisions the topicGroup principle forced (the worked example)
- **Split by identity, not by track.** Lattice *geometry* is pure math -> Section I (new `lattice`
  group); lattice *computational problems* are complexity -> Section IV `computation` (joining
  intractable_problems disc-3/5/6/7/9); the crypto constructions (SIS/LWE) are applications ->
  Section IV `cryptography`. Placing everything in Section I would have been wrong on this.
- **Shor -> Section IV** (algorithm), ref-linking linalg-41 for the quantum substrate. Quantum
  computation is not ML: no Section V quantum owner exists; Grover/VQE/QEC would also be Section IV
  (not built — no trigger).
- **ECC dropped** (isolated, quantum-obsolete, absent from HAC; structural preview via disc-33 suffices).
- **No standalone PQC-specs page** — ML-KEM/FIPS deployment is thin viewpoint inside disc-38/39
  (obsolescence-resistance: write the hardness mathematics thickly, specs thin).
- **Stage 5 landing forced a new Section V group (`security`).** ml-18 lands in Section V (its ML
  element = reading LWE as regression, ref-linking ml-2). But topicGroup **must not cross sections**:
  the `cryptography` group belongs to Section IV, so it cannot be reused on a Section V page. The
  existing Section V groups (`ml-foundations`/`deep-learning`/`generative-models`) all mismatch by
  content (ml-18 is neither a base learning method, an NN architecture, nor a generative model).
  Hence a new Section-V-local group `security` — sized to hold future landings (FHE/DP/ZKP × ML),
  not a singleton. Reusing a prereq's group (ml-2 = `ml-foundations`) would have been wrong: ml-18
  is not a foundation. (landing ≠ owner: disc-38/39 keep the crypto mathematics; handout §0.9.)
- 🔴 **Site-wide permanent rule (handout §0.7/§6):** never write factoring/DLP as a permanent
  security anchor, nor lattices as "in-principle quantum-safe" — the known/conjecture register is
  mandatory on all crypto pages. Enforced; recorded here only as a cross-page invariant.

---


## Part 7 — Reference Acquisition Status

References for the five tracks plus existing ones, by acquisition status. **One purchase remains:
Øksendal 6th ed. (Phase 2e).** Hall 2nd ed. (Rep Theory) is now on hand. All other references are free.

### 7.1 Active-track references (status)

| Track | reference | status |
|---|---|---|
| Phase 2e | **Øksendal *SDE*** (registered III, Springer Universitext 6th ed., ISBN 978-3-540-04758-2) / Durrett (registered III, on hand) / Holderrieth-Erives *FM & Diffusion* (registered V, arXiv:2506.02070, free) | ⚠️ **Øksendal purchase required**; Durrett + Holderrieth free |
| Rep Theory | **Hall *Lie Groups…* 2nd ed.** (registered I, GTM 222, ISBN 9783319134666) | ✅ on hand; used for linalg-31~40 (incl. Peter–Weyl §12.3) |
| Rep Theory (applied) | Gerken et al. (AI Review 2023, arXiv:2105.13926) / Esteves (arXiv:2004.05154) / Brehmer et al. (TMLR 2024, arXiv:2410.23179) | placed as ml-16 in-page References; **not** added to `references.json` (no papers category) |
| CDL | Leinster *Basic Category Theory* (registered IV, arXiv:1612.09375, v2 2025/8) / Fong-Spivak *Seven Sketches* (registered IV/V, arXiv:1803.05316) | ✅ both free |
| Crypto (✅ done) | Menezes *Handbook* / de Wolf *Quantum Computing* (books) / Regev *Lattices in CS* (**`courses`**) / Peikert *Decade of Lattice Crypto* (books) / FIPS 203-205 | ✅ all free, all registered |
| TDL | Hajij et al. *Topological Deep Learning* (registered IV/V, tdlbook.org) / Edelsbrunner-Harer (registered IV) | ✅ all free |

### 7.2 Not yet acquired (trigger-based)
- Amari *Information Geometry* (when an information-geometry page is planned; entry point calc-81 secured)

---

## Part 8 — Overload Ledger

Collected homonyms (the same symbol used for different concepts across Sections/contexts). Always
cross-check before naming a new anchor. The manifold handout §2 overload notes are merged here.

| Symbol/term | Use 1 | Use 2 | Use 3 | Handling |
|---|---|---|---|---|
| `adjoint` | Lie adjoint representation `D-adjoint_representation_Ad/ad` | FA operator adjoint `T-existence_of_adjoint`/`D-self_adjoint_operator` | CDL adjoint functor (new) | CDL uses `D-adjoint_functor`/`T-adjunction` |
| `infinitesimal_generator` | Lie one-param subgroup `D-infinitesimal_generator` (owner calc-64 `integral_curves.html`) | SDE generator (new) | — | SDE uses `D-sde_generator`; Page4 ref-links, no re-own |
| `score_function` | Fisher `D-score_function` (∇_θ) | data `D-score_function_data_gradient` (∇_x, ml-14) | continuous score (Phase2e Page3) | Page3 ref-links ml-14, no new one |
| `lattice` | order-theoretic lattice (future FA) | integer lattice (crypto, new) | — | crypto uses `D-integer_lattice` |
| `\hat{g}` | tangent-cotangent map (calc-81) | product metric (calc-78 separated to `g(+)g̃`) | — | already separated (manifold §2) |
| `F_*` | pushforward (calc-61) | induced Lie alg hom (calc-63) | — | state assumption (manifold §2) |
| `character` | (planned in rep theory) | possibly existing in coding theory etc. | — | grep required at Rep start |

---

## Part 9 — Filename Registry (planned pages)

Completed pages are authoritative in `curriculum.json`. This table reserves filenames before
drafting so cross-page references can be written ahead. IDs assigned at drafting time.

| Track | Est. Pages | Section | Planned Filenames | Trigger / status |
|---|---|---|---|---|
| Representation Theory | linalg-31~40 (done) | I | (complete) | ✅ complete (GDL continuous leg, Part 3.3; incl. Peter–Weyl linalg-40) |
| Equivariant NN | ml-16 (done) | V | `equivariant_nn.html` | ✅ complete (title "Symmetry & Representation Theory in ML") |
| Manifold Ch.14 Differential Forms | calc-82/83/84 (done) | II | (complete) | ✅ complete (topicGroup `differential-forms`) |
| Manifold Ch.15 Orientations | calc-85~89 (done) | II | (complete) | ✅ complete (topicGroup `orientations`; + augmentations calc-45/52/59) |
| Manifold Ch.16 Integration (through Riemannian) | calc-90/91/92 (done) | II | (complete) | ✅ complete (topicGroup `integration`; form integration + Haar / Stokes + Green / Riemannian integration + divergence theorem + classical Stokes); Peter–Weyl Haar substrate complete (calc-90); ch16 handout v12 |
| Manifold Ch.16 Corners / Densities | ~1–2 | II | TBD | **defer decision pending** (not on any active path now Peter–Weyl is done); Corners = de Rham foreshadowing (Cor 16.27), Densities = calc-89 orientation-covering callback + GDL ℝP²; **next free id = calc-100** (calc-93~99 consumed by the FA block) |
| Peter–Weyl | linalg-40 (done) | I | `peter_weyl.html` | ✅ **complete** (Hall §12.3; Haar via calc-90, Stone–Weierstrass via calc-99; closed the rep track's GDL-mandatory scope) |
| Functional Analysis block (Conway) | calc-93~99 (done) | II | (complete) | ✅ **complete** (topicGroup `functional-analysis`; Peter–Weyl's Stone–Weierstrass prerequisite chain) |
| TDL: Simplicial NN | ml-17 (done) | V | `simplicial_neural_networks.html` | ✅ **complete** (GDL discrete leg landed, Part 3.4; Hodge Laplacian message passing, \(\ker L_k\cong H_k\); 2026-06-21) |
| TDL: Persistent Homology | ~1–2 | IV | TBD (disc-XX; ID assigned at drafting — disc-41~46 reserved by CDL Ch.6) | optional branch (disc-15 forecast); new concepts (filtration / persistence module / barcode / stability) -> page-count uncertain; ref = Edelsbrunner-Harer (existing); detail in `tdl_track_handout_v2` §4 |
| Phase 2e | 4 (body) + dispersed | III | `brownian_motion_ito.html`, `sde_diffusion.html`, `fokker_planck_diffusion_model.html`, `diffusions_generator.html` (prob-27~30) | **awaiting Øksendal purchase** (Part 4; Ch.2–8 body, app chapters dispersed; splits anticipated) |
| CDL Track | Ch.1–5 = 11 done, Ch.6 = 5–6p | IV + V | disc-18~28 (`categories_functors_naturality` ~ `functors_and_limits`); next = disc-41 (Ch.6 §6.1), through disc-46 | 🔄 Stage 2: Leinster Ch.1–5 done, next = Ch.6 §6.1 = disc-41 (fixed; disc-29~40 consumed by crypto); detail `cdl_track_handout_v13` (Part 5) |
| Crypto Track (incl. Quantum + V landing) | disc-29~40 + linalg-41/42/43 + **ml-18** (done) | IV + I + **V** | (see `curriculum.json`) | ✅ **COMPLETE** — placement in Part 6, detail in `crypto_track_handout_v27` |
| Grover / VQE / QEC | — | IV | TBD | not built; no active trigger (algorithm=IV rule reserved) |
| Regular Conditional Distributions | ~1 | III | `regular_conditional_distributions.html` | Phase 2e *companion* (path-space measure refinement); non-blocking — body 4 pages close without it |
| Advanced VI topics | ~1–2 | III | TBD | individually triggered by ML-application pressure |
| DEC | ~1–2 | IV | TBD | continuous <-> discrete Hodge bridge (Part 3.5); backlog |
| GDL Overview | 1 | V | TBD | backlog |

---

## Part 10 — Completed Tracks Log

Completed tracks (on index.html, no planned pages).

### Major completed tracks
| Track | Pages | Completed | Notes |
|---|---|---|---|
| Representation Theory (Hall) — incl. Peter–Weyl + FA block | linalg-31~40 + ml-16 + calc-93~99 | 6/8–6/20/2026 | GDL continuous leg: group/Lie-algebra reps -> irreducible classification -> Schur -> Clebsch-Gordan/Wigner-Eckart -> Peter–Weyl (linalg-40, recovers calc-32 Fourier), landing at Equivariant NN (ml-16). FA block (calc-93~99, `functional-analysis`) built as Peter–Weyl's Stone–Weierstrass prerequisite. GDL-mandatory scope complete. Deep-dive deferred (Part 11). Detail: `rep_handout_v10`. |
| Smooth Manifolds (Lee Ch.1–16 through Riemannian integration) | calc-36~81 + calc-42/45/47/52/59 + calc-82~92 | 6/3–6/15/2026 | Manifold spine + differential forms (Ch.14) + orientations (Ch.15) + integration (Ch.16: Haar, Stokes/Green, Riemannian, divergence). Mathematical landing of the GDL continuous leg; Peter–Weyl Haar substrate in calc-90. Corners/Densities deferred (Part 11). Detail: `manifold_handout_v24` / `ch16_integration_handout_v12`. |
| **Crypto Track (through PQC, incl. Quantum + V landing)** | **disc-29~40 + linalg-41/42/43 + ml-18** | **~7/6/2026** | Full attack->defense arc + ZKP + **stage 5 Section V landing (ml-18, LWE as noise-duality, new `security` group)**. New topicGroups `quantum` (linalg-41), `lattice` (linalg-42/43), **`security` (ml-18, Section V)**. Placement + deviations in Part 6; full detail in `crypto_track_handout_v27`. |
| Formal Methods | disc-16, disc-17 | 5/14/2026 | Section IV third pillar (disc-4,16,17). Bidirectional bridge with disc-12 (Four Color Theorem). Curry-Howard-Lambek connection point for CDL. |

### Completed reference -> page mapping
- Lay *Linear Algebra* -> linalg-01~10
- Gallian *Contemporary Abstract Algebra* -> linalg-15~22
- Horn & Johnson *Matrix Analysis* -> linalg-09~13
- Boyd & Vandenberghe *Convex Optimization* -> calc-07, calc-08
- O'Searcoid *Metric Spaces* -> calc-16~22
- Lee *Introduction to Smooth Manifolds* -> calc-29, calc-36~81, calc-42, calc-82~92 (Ch.14 forms + Ch.15 orientations + Ch.16 integration)
- Conway *Functional Analysis* -> calc-23~28, calc-30~32, **calc-93~99 (FA block: Hahn–Banach, four-pillars/Baire, LCS, separation HB, Krein–Milman, Riesz \(C(X)^*=M(X)\) [Appendix C], Stone–Weierstrass [V §8])**
- Stein & Shakarchi *Fourier Analysis* -> calc-14, calc-15, calc-32~35
- Stillwell *Naive Lie Theory* -> linalg-24, linalg-27~30
- Hall *Lie Groups, Lie Algebras, and Representations* 2nd ed. -> linalg-31~40 (incl. Peter–Weyl, §12.3)
- Durrett *Probability* -> prob-13, prob-22~26
- Cormen *Introduction to Algorithms* -> disc-01~11
- Sipser *Theory of Computation* -> disc-05~09
- Diestel *Graph Theory* -> disc-01, disc-12
- Merris *Combinatorics* -> disc-02
- Edelsbrunner & Harer *Computational Topology* -> disc-14, disc-15
- Avigad et al. *Lean* -> disc-16, disc-17
- Murphy Book1/Book2 *Probabilistic ML* -> ml-01~12, prob-16, prob-26 etc.
- Menezes et al. *Handbook of Applied Cryptography* -> disc-29~34, disc-40 (§10.4 ZKP)
- de Wolf *Quantum Computing: Lecture Notes* -> linalg-41, disc-35 (Ch.1/4/5/6)
- Regev *Lattices in Computer Science* (courses) -> linalg-42/43, disc-36
- Peikert *A Decade of Lattice Cryptography* -> disc-36, disc-37/38/39

---

## Part 11 — Deferred Items (Non-Blocking)

| Item | Trigger to Revisit |
|---|---|
| Schwartz Space & Distributions | a PDE/generalized-function page beyond calc-33/34/35 |
| Pontryagin Duality | after rep theory + calc-32, if a harmonic-analysis track emerges |
| **Rep Theory deep-dive (Hall Part II)** | **semisimple Lie algebras / root systems / Weyl group / Verma modules / Weyl character formula. The "classification" machinery, deliberately excluded by Route B (GDL needs completeness, not classification — SU(2)/SO(3) examples already owned in linalg-36/37). Trigger = a topic genuinely needing general-compact-group structure or highest-weight theory; GDL-unnecessary** |
| **Spectral Theory of the Laplacian (continuous)** | **continuous <-> discrete Hodge bridge (Part 3.5); precursor to GDL two-leg rejoining** |
| **DEC (Discrete Exterior Calculus)** | **reclamation hub for continuous Hodge (Lee Ch.14+, integration calc-90/91/92 complete; calc-91 Stokes = continuous-side origin) + discrete Hodge (disc-13/15 existing); bridges both GDL legs** |
| Regular Conditional Distributions | Phase 2e companion (SDE/Itō filtration); non-blocking for prob-26 |
| Fiber Bundles & Gauge Theory | when a GDL viewpoint demands gauge equivariance; manifold Q8. calc-89 (\(\mathbb{RP}^2\) nonorientable, orientation double cover \(S^2 \to \mathbb{RP}^2\)) now supplies the topological stage for the diffusion-MRI gauge-equivariant-CNN example (both the direct-on-\(\mathbb{RP}^2\) and lift-to-\(S^2\) approaches); frame/principal bundle itself remains out of Lee scope and needs a separate resource |
| **Optimal Transport** | **FM straight-path optimality. Phase 2e uses forward-pointers only; OT-book acquisition is the trigger** |
| **Phase 2e app: Feynman-Kac** | **Øksendal Ch.9. Section II bridge (calc-33~35 PDE + calc-27 `T-existence_of_adjoint`); trigger = a PDE-probabilistic-interpretation page. Body Page3/4 own the substrate** |
| **Phase 2e app: Optimal Stopping / HJB** | **Øksendal Ch.10–11. Section V landing (RL/optimal control); continuous-time limit of ml-10 discrete Bellman (`T-bellman_optimality`), new one-directional link, ml-10 unchanged. Stopping-time definition owned by Page4** |
| String Diagrams | after CDL Stage 4 (or part of Stage 4) |
| Persistent Homology | TDL optional branch (disc-15 forecast, Part 3.4) |
| Uniform Integrability & Martingale Convergence | RL theory / stochastic approximation; resolves prob-23 UI forward-ref |
| Variational Representations & f-Divergences | contrastive learning / MI estimation (MINE, f-GAN, InfoNCE, PAC-Bayes) |
| Characteristic Functions & CLT (rigorous) | advanced asymptotic statistics; prereq calc-32 |
| Information Geometry (Amari) | an information-geometry page; entry point calc-81 secured (musical iso, NGD insight-box) |
| **Induced Representations & Frobenius Reciprocity** | **gauge-equivariant CNN math foundation (homogeneous space \(G/K\), intertwiners on induced reps; Gerken et al. in-page-referenced at ml-16 but no owner exists — ml-16 reintroduces in prose). Trigger = a gauge-equivariant GDL page, or a serious non-compact SE(3) treatment. GDL-unnecessary at present; rep deep-dive layer alongside Hall Part II** |
| **Manifold Ch.16 Corners + Homotopy Invariance** | **de Rham foreshadowing trinity (calc-91 Cor 16.15 + Thm 16.26 + Cor 16.27); trigger = Ch.17 de Rham start, or standalone. Not on any active path now Peter–Weyl is done. Next free id = calc-100 (calc-93~99 consumed by the FA block)** |
| **Manifold Ch.16 Densities + nonorientable divergence theorem (Thm 16.48)** | **calc-89 orientation-covering callback + GDL ℝP² (diffusion-MRI gauge-equivariant CNN base); trigger = GDL ℝP² page or de Rham batch. Next free id = calc-100** |
| **FA-block owner debt (from calc-93~99 construction)** | **owner-absent, currently prose/self-contained-handled: Banach quotient space \(\mathcal{X}/\mathcal{M}\) + quotient norm + quotient dual (SW avoided via direct seminorm-dominated HB); quotient/annihilator dimension duality (Conway Thm 2.2); one-point compactification; Urysohn lemma; polar decomposition \(\mu=h\|\mu\|\); \(C_0(X)\) dense in \(L^1(\nu)\). Trigger = future FA / measure / topology page expansion. All deferred to avoid scope blowup** |

---

## Part 12 — Key Learnings & Development Principles

1. **Notation consistency is non-negotiable**: calligraphic for spaces (𝒳,𝒴,𝒵,ℋ,𝒳*,𝒳**),
   functionals as φ, operator norm ‖φ‖_𝒳*. New Section II pages match calc-23~28.
2. **Cross-page linking**: verify filenames/anchors against reality before linking. No in-body
   citations. Forward links use descriptive text (no href) until the target exists.
3. **Application-viewpoint philosophy**: use Insight Boxes and the Tessera to connect abstract
   theorems to applications without breaking main-text proofs. Application domains introduced when
   tools are ready (asymmetric, Parts 1-6).
4. **Fisher vs Hessian**: the real distinction is reparametrization invariance (Čencov) vs
   loss-dependence and non-guaranteed positive-definiteness, not "global vs local."
5. **Page count estimation**: new conceptual paradigms expand 1.5–4×. Defer ID assignment to
   drafting. Calibrations: Lie groups 2 -> 4, calc-30 1 -> 2, Phase 2c 2 -> 3, Fourier-PDE 1 -> 3,
   CDL 6 -> 12 anticipated (**actual: 11 pages for disc-18~28 = close to prediction, covering Ch.1–5**; more expected at Ch.6+). **New strongest data point (Peter–Weyl, 6/2026): a ~2-page target
   spawned a 7-page prerequisite block (the FA block calc-93~99).** A single dependency audit
   (§12.3 needs Stone–Weierstrass) recursively pulled in SW's entire Conway chain. The lesson is
   not just "pages expand" but "a dependency audit can reveal that the *prerequisite* is the real
   project" — the audit is what caught it before drafting, exactly as intended (Pre-Writing
   Dependency Audit pays off).
6. **Per-topic prior-knowledge calibration**: set track-character per topic (Lie=expert,
   CDL/Phase2e/Rep/TDL=learn-while-writing).
7. **Mood-driven dispatch**: no single order enforced. If one track stalls, others proceed. The
   former hard ordering (layer-2 Shor <- crypto stage 1-2 + layer-1 linalg-41) is now fully
   **discharged** — the entire crypto/quantum stack (disc-35~40) shipped + Section V landing ml-18 (stage 5, Part 6). No hard
   ordering constraint remains in the plan.
8. **Tracks-isomorphic structure**: "mathematical content owned by its native
   Section; identity moves to Section V at the ML/application point." Rep/CDL/TDL/Phase2e take this
   shape; Crypto is a **partial** exception (owns IV/I): its quantum half has no Section V landing,
   but the LWE half landed via **ml-18** (`security` group, stage 5) as noise-duality — owner still
   native (disc-38/39), landing ≠ owner (Part 2.2, handout §0.9).
9. **Obsolescence-resistance principle**: write the enduring mathematics thickly, not
   the individual method. diffusion -> FM, ML-KEM -> next-gen: when methods swap, the foundation
   survives (Parts 4.2, 6.2).
10. **topicGroup is decided by identity**: place a page by what it *is* (its
    mathematical object), not what it is *used for*. The crypto/lattice/quantum placement split
    (Part 6.2), CDL in Section IV, and quantum owner separation are all applications of this principle.
11. **Single ownership**: each T-/D- anchor has exactly one owner site-wide. grep previews.json +
    HTML before assigning. Overloads are managed in the Part 8 ledger.
12. **Handout-driven continuity**: session state is authoritative in this roadmap and the
    handouts; memory carries protocol/philosophy only. Per-track detail is single-source-of-truth
    in `*_handout_v1.md`.

---

**This roadmap is the index layer.** Per-track prereq verification, collisions, owner
candidates, physical-book inspection items, and resume-time greps are authoritative in the
individual handouts for the **still-active tracks**: `phase2e_handout_v2` / `cdl_track_handout_v13` /
`tdl_track_handout_v2` (optional persistent-homology branch only).

**Completed-track handouts (archival):** `crypto_track_handout_v27` (crypto through
PQC + ZKP + **stage 5 Section V landing ml-18** — completion record; v26 added the `security`-group
landing, so the track can extend into Section V `security` pages (FHE/DP/ZKP × ML) without a new track),
`rep_handout_v10` (Rep
Theory incl. Peter–Weyl + FA block; absorbed the spent `peter_weyl_handout_v1` and
`fa_block_screening_handout_v5`), `manifold_handout_v24` / `ch16_integration_handout_v12` (manifold
spine through Riemannian integration; only Corners/Densities deferred).

**Next active work** = CDL Stage 2 (Leinster Ch.6 §6.1 = disc-41, fixed) or Phase 2e
(on Øksendal purchase); the crypto track is closed.