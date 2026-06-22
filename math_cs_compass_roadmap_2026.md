# MATH-CS COMPASS: Curriculum Roadmap & Development Plan (v6)

**Author:** Yusuke Yokota
**Last Updated:** 6/22/2026
**Website:** https://math-cs-compass.com

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science,
addressing the gap where CS students struggle with mathematical foundations while math students
lack awareness of applications. The primary focus is rigorous mathematical foundations for
modern AI/ML, with continuous expansion into adjacent domains (GDL, CDL, cryptography,
stochastic analysis).

**Total: 199 pages as of 6/22/2026.** Breakdown: I (linalg) 40 / II (calc) 99 / III (prob) 26 /
IV (disc) 17 / V (ml) 17. `curriculum.json` is authoritative.

**Five active tracks (planned in one pass on 2026/6/3)**; detail in the Part 2 overview:
- Phase 2e (continuous-time generative foundations, Section III) — awaiting Øksendal purchase
- Rep Theory (GDL continuous leg, Section I+V) — **complete (linalg-31~40 incl. Peter–Weyl + ml-16); GDL-mandatory scope fully satisfied, no remaining work**
- CDL (category theory, Section IV+V) — awaiting Leinster reading
- Crypto (through PQC, Section IV+I) — mood-driven
- TDL (GDL discrete leg, Section IV+V) — **SNN (ml-17) complete; discrete leg landed. Only optional persistent-homology branch (disc-18) remains**

---

## Part 1 — Application Domains: Pillar vs. Viewpoint

(v1 Part 1 retained. GDL two-leg structure added to 1.2.)

### 1.1 Two orthogonal axes
- **Pillar (vertical thread)**: a structural thread that multiple Sections converge into; a
  load-bearing column.
- **Viewpoint (re-visit at different heights)**: a perspective returned to repeatedly at higher
  mathematical altitude, never "completed."
These are independent. A domain can be Pillar and Viewpoint / Viewpoint only / Pillar only / neither.

### 1.2 Classification of the three domains (GDL two-leg added)

| Domain | Pillar? | Viewpoint? | Production maturity (2026) | Site treatment |
|---|---|---|---|---|
| **GDL** | ✅ | ✅ | High (AlphaFold, MACE, EquiformerV3, equivariant robotics) | **Pillar and Viewpoint** — **two-leg** (below) |
| **CDL** | ⚠️ Pre-pillar | ✅ | R&D (Coend $31M, no product) | Slow-burn parallel track |
| **Quantum** | ⚠️ Latent | ✅ | Limited (PQC is separate, see Crypto) | Viewpoint via Insight Box |

**GDL two-leg structure (made explicit in v2, detailed in Part 3)**:
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

## Part 2 — Active-Track Overview (new in v2, index layer)

A unified view of the five tracks. Per-track detail is authoritative in the individual handouts.

### 2.1 Track table

| Track | GDL relation | Section | Start status | Purchase | Handout |
|---|---|---|---|---|---|
| **Phase 2e** continuous-time generative | — | III | **awaiting Øksendal purchase** (then Page1 BM+Itō) | **Øksendal 6th ed.** | `phase2e_handout_v1` |
| **Rep Theory** | **continuous leg** | I (rep) + V (Equiv NN) | **linalg-31~40 (incl. Peter–Weyl) + ml-16 complete; GDL-mandatory scope fully satisfied** | Hall 2nd ed. (on hand) | `rep_handout_v10` (archival) |
| **CDL** category theory | — | IV (cats) + V (CDL bridge) | **awaiting Leinster reading** (Stage 0) | none | `cdl_track_handout_v1` |
| **Crypto** through PQC | — | IV (s1) + I (s2-7) | **mood-driven** | none | `crypto_track_handout_v1` |
| **TDL** | **discrete leg** | IV (existing Hodge) + V (SNN) | **SNN (ml-17) complete; discrete leg landed. Optional persistent-homology branch (disc-18) remains** | TDL book (free) | `tdl_track_handout_v2` |

### 2.2 Shared structural pattern (this session's finding)

All five tracks share the same shape:
- **"The mathematical content is owned by its native Section; identity shifts to Section V at
  the ML/application point."** Rep (math=I, Equiv NN=V) / CDL (cats=IV, bridge=V) / Crypto
  (math=I, quantum=V bridge) / TDL (Hodge=IV, SNN=V) / Phase 2e (math=III, landing ml-14/15 = existing V).
- This is a consistent expression of the site principle "application is viewpoint, mathematics
  is owner" (Part 1).
- **Obsolescence-resistance principle** (established in Crypto §0.5 / Phase 2e): write the
  enduring mathematics thickly (continuous-time generation, LWE hardness), not the individual
  method (diffusion, ML-KEM). When methods are replaced, the foundation survives.

### 2.3 Start priority (mood-driven dispatch; no single order enforced)

- **External deadline pressure**: CDL (asymmetric preparation cost, MUST cover but slow).
- **Application in current production**: Phase 2e (diffusion/FM), Crypto stage 7 (PQC deploying now).
- **GDL pillar internal progress**: Rep Theory (**complete through Peter–Weyl, linalg-40; no remaining GDL-mandatory work**), TDL (**discrete leg landed via SNN ml-17; only optional persistent-homology branch remains**).
- All mood-driven. If one track stalls, others proceed (Part 13 principle 7).

### 2.4 The only hard ordering constraint

Section V quantum page (Part 7) <- Crypto stage 1–4 (establishing what Shor breaks). No forced
order between any other tracks.

---

## Part 3 — GDL Pillar (two-leg: continuous Rep + discrete TDL)

In v1 the GDL discussion (old Part 2) and Rep Theory (old Part 8) were separate; v2 consolidates
them under the GDL pillar. GDL stands on two legs (Part 1.2).

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
**Remaining**: persistent homology (disc-18) only — optional TDA branch off disc-15's other forecast,
not GDL-mandatory. Future / mood-driven.
**Detail**: site pages + `tdl_track_handout_v2`.

### 3.5 Rejoining of the two legs (Hodge, future deep connection)
Continuous Hodge (differential forms: Lee Ch.14 complete = calc-82/83/84; orientations Ch.15
complete = calc-85~89; integration Ch.16 through Riemannian = calc-90/91/92 complete) and discrete
Hodge (simplicial complexes, disc-13/15 existing) share the same structure.
DEC (Part 12 deferred) will be the reclamation hub bridging both legs. calc-91 Stokes is the
continuous-side origin sitting on the de Rham / DEC critical path (manifold handout v24). Recorded for
now; the relevant Part 12 entries are "Spectral Laplacian" and "DEC."

### 3.6 GDL track sequencing (current)
Both legs' GDL-mandatory scope is complete. Continuous leg: manifold spine + Ch.14~16 + rep theory
+ Peter–Weyl + Equivariant NN (ml-16) — done; only Corners/Densities deferred (not on any active path).
Discrete leg: disc-13~15 + SNN (ml-17) — done; optional persistent-homology branch (disc-18) remains.
Forward-pointer obligation: each GDL page carries forward-pointers to "the next mathematics."

---

## Part 4 — Phase 2e: Continuous-Time Generative Foundations (Active Slow-Burn)

Build stochastic analysis (Brownian motion -> Itō -> SDE -> Fokker-Planck) in Section III, to
justify from below the continuous-time machinery that ml-14 (diffusion) / ml-15 (flow matching)
use as given.

### 4.1 Role update (v1 -> v2)
v1 framed this as "continuous-time basis for diffusion, landing at ml-14." But **ml-15
flow_matching already exists** and fully develops the continuous-time machinery in ML language
(its body performs the calculation where the score term cancels the diffusion term, collapsing
the Fokker-Planck equation to the continuity equation).
 -> Role purified to "**justify from below the continuous-time objects ml-14/15 use as given.**"
Landing point ml-14 -> **ml-14 + ml-15**. The biggest callback is the FP page proving ml-15's
cancellation calculation from below.

### 4.2 Significance in the Flow Matching era
Diffusion is being displaced by FM in practice (FLUX, SD3 are rectified flow), but **both are
ODE/SDE representations of the same object** (Stochastic Interpolants). Phase 2e is not
diffusion-specific but "the continuous-time basis unifying diffusion and FM." Its significance
strengthened, not weakened, in the FM era.

### 4.3 Three-page structure (Section III, prob-XX)

| Page | scope | downstream callback |
|---|---|---|
| 1 `brownian_motion_ito.html` | Wiener-process axioms, existence (Kolmogorov+Čentsov), path pathology, Itō integral L² construction, Itō formula | ml-15's \(\mathbf{w}_t, d\mathbf{w}_t\) |
| 2 `sde_diffusion.html` | SDE definition, existence-uniqueness (Lipschitz/Picard), OU/Langevin, generator, Dynkin, Girsanov | ml-15's σ_t-tuned SDE |
| 3 `fokker_planck_diffusion_model.html` | FP = adjoint of generator, heat eq (calc-33), score, reverse-time SDE | **justifies ml-15's special-case machinery from below (biggest callback)** |

prereqs: Page1 <- prob-23, prob-21, calc-23 / Page2 <- Page1, prob-24 / Page3 <- Page2, calc-33.

### 4.4 Reference / start
- primary: Øksendal (SDE proper, **purchase required** — Springer Universitext 6th ed.,
  ISBN 978-3-540-04758-2) + Durrett (measure-theoretic substrate, on hand) + Holderrieth-Erives
  (FM/diffusion unification, the V-side bridge, free, already used on the ML side).
- No OT book -> FM/rectified flow/OT are forward-pointers only (no href).
- Rigor calibration (whether to add Karatzas-Shreve) decided after seeing scope. On hold.
- **Start status: awaiting Øksendal purchase** (then Page1 BM+Itō). Zero new prereqs;
  the only blocker is acquiring Øksendal. Dependency audit already complete.
- track-character: a CS author learning pure math while writing (same class as CDL).
- Detail: `phase2e_handout_v1`.

### 4.5 Notes (overload, see Part 9 ledger)
- `D-infinitesimal_generator` exists on the Lie side -> SDE generator must use `D-sde_generator`.
- `score_function` triple collision (Fisher/data/continuous) -> Page3 ref-links ml-14's
  `D-score_function_data_gradient`, does not define a new one.

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

### 5.2 Placement decision (v2, resolving the ultimate question)
**owner = Section IV**. Applying the topicGroup principle — a category-theory page's identity is
"a discrete/combinatorial algebraic structure with composition" (a category = objects + morphisms
+ composition), which is Section IV's identity itself. That category theory cites Vect/Hilb as
examples is *usage*, not the object. Corroboration: formal methods (disc-16/17 Lean) = type
theory = the twin of category theory (Curry-Howard-Lambek).

**"Cross-Section spanning" is not a placement problem but a ref-link direction problem**: a
category page (IV) citing examples from I/II just means ref-links pointing outward; the owner
stays IV (precedents: Crypto stage4 -> V, Peter-Weyl -> II).

**Spanning is the greatest weapon — reclamation hub design**: the stage 1 page **intentionally
bundles** ref-links to examples in Sections I/II/IV, letting the reader see at a glance "the
groups from Section I, the Banach spaces from Section II — they were all categories." The Section
IV category page becomes the site-wide callback hub. The manifold Q7 (differential \(dF_p\) =
functor; calc-45/46 `T-differential_properties`/`T-global_differential_properties`) connects here.

### 5.3 Track structure (per handout §3, ~6-9p, expansion expected)

| Stage | Placement | Content |
|---|---|---|
| 0 | — | Yusuke reads Leinster Ch.1–2 (**start trigger**, bulk of the investment cost) |
| 1 | disc-XX (IV) | categories/functors/natural transformations / Yoneda / adjunction (+ site-wide hub ref-links) |
| 2 | disc-XX (IV) | limits/colimits / monads / Kan extensions |
| 3 | disc-XX (IV) | applied: quivers/database functors / string diagrams |
| 4 | ml-XX (V) | CDL bridge: Para, lenses, monad on Para (primer for the Gavranović paper) |
| 5 | ml-XX (V) | CDL Overview: revisit the whole site from a categorical viewpoint |

stage 3 -> 4 is the IV -> V crossing (identity shifts from math to ML application).

### 5.4 Reference / start
- Leinster *Basic Category Theory* (rigorous, IV, **free** arXiv:1612.09375, CC BY-NC-SA, v2 2025/8)
- Fong & Spivak *Seven Sketches* (applied, **free** arXiv:1803.05316, CC BY 4.0; v1's missing url resolved)
- **Both free, no purchase.** Leinster himself includes poset/monoid examples in the book (an
  entry-design option).
- **Start status: awaiting Leinster reading (Stage 0).** Learn-while-writing (Yusuke new to it).
- Detail: `cdl_track_handout_v1`.

### 5.5 Status monitoring (as of 2026/5/9, re-verify via web)
Research front: ICML 2024 position paper (Gavranović et al.), ACT 2025/2026. Industry: Coend
($31M). **No production deployment.** -> slow-burn continues. Status-shift triggers: Coend ships a
product / a CDL architecture wins a benchmark / a major framework adds categorical primitives /
a second well-funded entrant.

### 5.6 Notes (Part 9 ledger)
- `adjoint` triple overload (Lie adjoint representation / FA operator adjoint / CDL adjoint
  functor) -> CDL uses `D-adjoint_functor`.
- v1 Part 3.6 correction: "lattice in disc-1/2/3" is wrong (actually Graph/Combi/ToC).
  No poset/lattice page exists; monoid undefined -> entry via Leinster examples or existing assets
  (Set/Grp/Vect/Ban/Hilb/Top).

---

## Part 6 — Crypto Track (stage 7 completion assumed, (C) Section split)

The site's most under-covered area relative to importance (a canonical math <-> CS bridge). Upgraded
to assume stage 7 (PQC capstone) completion, driven by 2026 PQC production deployment.

### 6.1 Placement decision (v2, (C) stage split)
Applying the topicGroup principle per stage -> a single Section is untenable; identity splits:

| Stage | Section | identity |
|---|---|---|
| 1 classical crypto foundations | **IV** | computational security (application of complexity, disc-7/9) |
| 2 public-key & number theory (DH/RSA/DLP) | **I** | group structure, Euler φ, CRT, finite fields |
| 3 ECC | **I** | elliptic-curve group |
| 4 quantum threat | **I** | crypto compromise + PQC motivation (Shor proper in Section V, below) |
| 5 lattice foundations | **I** | lattices = discrete modules / geometry |
| 6 LWE/Module-LWE | **I** | error-perturbed linear algebra over modules |
| 7 NIST PQC standards | **I** | specs / deployment (viewpoint, thin) |

Entry point = existing linalg-26 (Finite Fields). stage 1(IV) -> 2(I) is the only Section crossing,
bridged with forward/back-links. Double callback: complexity theory reclaimed at stage 1, algebra
at stage 2+.

### 6.2 Stage 7 upgrade rationale (2026 PQC production deployment)
ML-KEM ships in production at AWS default, Chromium default TLS, Apple PQ3, Microsoft SymCrypt.
FIPS 140-2 sunsets 2026/9, CNSA 2.0 at 2027/1, Google deadline 2029. HNDL threat. -> Stopping at
stage 3/4 means "not covering PQC that is in live production," conflicting with the mission.
**Terminal = stage 7 fixed.**

### 6.3 ⚠️ Obsolescence-resistance design principle (most important, shared core of all tracks)
Individual algorithms go obsolete (FIPS 206/FALCON added 2026, HQC selected 2025/3, parameters
revised).
- **Enduring layer (thick, stage 5–6)**: the hardness mathematics. Why LWE/Module-LWE is hard =
  reduction to worst-case lattice problems (SVP/CVP), lattice geometry. Unchanged since Regev 2005.
- **Obsolescing layer (thin, viewpoint, stage 7)**: individual specs (Kyber parameters, FIPS
  numbers). Forward-pointer marking "the 2026 standards," not cataloged.

Same shape as Phase 2e (math, not method). The answer to "where to go after learning the
concepts" = root deeply in the hardness mathematics, keep individual specs as viewpoint.

### 6.4 ⚠️ stage 4 / quantum owner separation
- The Shor/Grover quantum-algorithm proper -> **owned by the Section V quantum page** (Part 7).
- stage 4 (Section I) identity = "the result that crypto is broken by quantum + PQC motivation"
  only. Shor's quantum detail is not written; ref-link to Section V. It is the consequence of the
  "why will the RSA/ECC built in stage 2-3 break" story.
- **Bidirectional bridge**: stage4 -> V (Shor detail), V -> stage2-3 (the target RSA/ECDH). Consistent
  with Part 7's hard dependency (quantum page <- Crypto stage 1-4).

### 6.5 Reference / start
- stage 1-4 primary: Menezes *Handbook of Applied Cryptography* (**free** cacr.uwaterloo.ca/hac/,
  all 15 chapters, author-sanctioned). 1996, so lattice/PQC are out of scope.
- stage 5-6 primary: **Peikert *A Decade of Lattice Cryptography*** (**free** IACR ePrint
  2015/939). SIS/LWE/Module-LWE hardness and worst-case reduction = heart of PQC mathematics.
- stage 7 specs: FIPS 203/204/205 documents + CACR PQC materials (specs not math, thin).
- **All free, no purchase.** Nguyen-Vallée/Bernstein-Lange consolidated into Peikert after review.
- **Start status: mood-driven** (timing by interest, terminal at stage 7). Pause only at the
  coherent points stage 3/4/7 (Part 13 failure-mode avoidance).
- Detail: `crypto_track_handout_v1`.

### 6.6 Notes (Part 9 ledger)
`lattice` is polysemous (order-theoretic lattice vs integer lattice) -> crypto side uses
`D-integer_lattice` etc. explicitly.

---

## Part 7 — Quantum: Three Sub-Domains, Section V Single-Page

(v1 Part 4 retained. Bridge with Crypto stage 4 made explicit in 7.4.)

### 7.1 Three sub-domains
| Sub-domain | Mathematical core | 2026 production |
|---|---|---|
| A quantum theory (physics) | Hilbert space + spectral theory + Fourier; unitary evolution; observables | 100-year established |
| B quantum computation | A + tensor product (qubits) + circuits + Shor/Grover/VQE + error correction | NISQ; no production deployment |
| C PQC | lattices + LWE/Module-LWE + codes + hashes + elliptic curves | **production-deployed** ( -> Crypto Part 6, stage 5-7) |

### 7.2 Placement
- **A+B**: a single Section V viewpoint page (ml-XX). A's mathematics is covered by the existing
  FA block (calc-23/25/27/32), so no dedicated math page is needed. B covers qubits, circuits,
  Shor/Grover/VQE at viewpoint level. A Section V viewpoint alongside ml-13/Equivariant NN, not a pillar.
- **C (PQC)**: belongs to the **Crypto Track (Part 6), stages 5-7**. Section I. Crypto, not Quantum.
- **pace**: A+B off the active path, trigger-tolerant.

### 7.3 What is NOT done
- No standalone "Quantum Section" (the no-isolated-Geometry/Physics-section principle).
- No pillar status for Quantum overall (whether C grows to pillar grade is a Crypto Track matter).

### 7.4 ⚠️ hard dependency (the only forced order)
The Section V quantum page (A+B) must explain Shor, assuming the reader knows "what Shor breaks."
 -> **Crypto stage 1–4 must be complete before the quantum page is written.** The reverse is not
required (no need to reach PQC=stage5+ before the quantum page). stage 4 establishes "what is
broken" in Section I -> the quantum page develops Shor proper in Section V (the bidirectional
bridge of Part 6.4).

---

## Part 8 — Reference Acquisition Status (new in v2)

References for the five tracks plus existing ones, by acquisition status. **One purchase remains:
Øksendal 6th ed. (Phase 2e).** Hall 2nd ed. (Rep Theory) is now on hand. All other references are free.

### 8.1 Active-track references (status)

| Track | reference | status |
|---|---|---|
| Phase 2e | **Øksendal *SDE*** (registered III, Springer Universitext 6th ed., ISBN 978-3-540-04758-2) / Durrett (registered III, on hand) / Holderrieth-Erives *FM & Diffusion* (registered V, arXiv:2506.02070, free) | ⚠️ **Øksendal purchase required**; Durrett + Holderrieth free |
| Rep Theory | **Hall *Lie Groups…* 2nd ed.** (registered I, GTM 222, ISBN 9783319134666) | ✅ on hand; used for linalg-31~40 (incl. Peter–Weyl §12.3) |
| Rep Theory (applied) | Gerken et al. (AI Review 2023, arXiv:2105.13926) / Esteves (arXiv:2004.05154) / Brehmer et al. (TMLR 2024, arXiv:2410.23179) | placed as ml-16 in-page References; **not** added to `references.json` (no papers category) |
| CDL | Leinster *Basic Category Theory* (registered IV, arXiv:1612.09375, v2 2025/8) / Fong-Spivak *Seven Sketches* (registered IV/V, arXiv:1803.05316 <- url to add) | ✅ both free |
| Crypto | Menezes *Handbook* (registered I, cacr.uwaterloo.ca/hac/) / **Peikert** *Decade of Lattice Crypto* (unregistered, IACR ePrint 2015/939) / FIPS 203-205 + CACR materials | ✅ all free |
| TDL | Hajij et al. *Topological Deep Learning* (**registered** IV/V, tdlbook.org) / Edelsbrunner-Harer (registered IV) — Lim *Hodge Laplacians on Graphs* **not used** (ml-17 did not need it) | ✅ all free |

### 8.2 Pending references.json additions (at start)
- Fong-Spivak url field (CDL, edit existing entry)
- Peikert (Crypto, at stage 5 start, url=eprint.iacr.org/2015/939)

### 8.3 Trigger-based, not yet acquired (future)
- Amari *Information Geometry* (when an information-geometry page is planned; entry point calc-81 secured)
- Nielsen-Chuang *Quantum Computation* (if the Section V quantum page is written)

---

## Part 9 — Overload Ledger (new in v2)

Collected homonyms (the same symbol used for different concepts across Sections/contexts). Always
cross-check before naming a new anchor. The manifold handout §2 overload notes are merged here.

| Symbol/term | Use 1 | Use 2 | Use 3 | Handling |
|---|---|---|---|---|
| `adjoint` | Lie adjoint representation `D-adjoint_representation_Ad/ad` | FA operator adjoint `T-existence_of_adjoint`/`D-self_adjoint_operator` | CDL adjoint functor (new) | CDL uses `D-adjoint_functor`/`T-adjunction` |
| `infinitesimal_generator` | Lie one-param subgroup `D-infinitesimal_generator` | SDE generator (new) | — | SDE uses `D-sde_generator` |
| `score_function` | Fisher `D-score_function` (∇_θ) | data `D-score_function_data_gradient` (∇_x, ml-14) | continuous score (Phase2e Page3) | Page3 ref-links ml-14, no new one |
| `lattice` | order-theoretic lattice (future FA) | integer lattice (crypto, new) | — | crypto uses `D-integer_lattice` |
| `\hat{g}` | tangent-cotangent map (calc-81) | product metric (calc-78 separated to `g(+)g̃`) | — | already separated (manifold §2) |
| `F_*` | pushforward (calc-61) | induced Lie alg hom (calc-63) | — | state assumption (manifold §2) |
| `character` | (planned in rep theory) | possibly existing in coding theory etc. | — | grep required at Rep start |

---

## Part 10 — Filename Registry (planned pages)

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
| TDL: Persistent Homology | ~1–2 | IV | TBD (next id disc-18; disc-16/17 occupied by Formal Methods) | optional branch (disc-15 forecast); new concepts (filtration / persistence module / barcode / stability) -> page-count uncertain; ref = Edelsbrunner-Harer (existing); detail in `tdl_track_handout_v2` §4 |
| Phase 2e | 3+ | III | `brownian_motion_ito.html`, `sde_diffusion.html`, `fokker_planck_diffusion_model.html` | **awaiting Øksendal purchase** (Part 4; splits anticipated) |
| CDL Track | ~6–9 | IV + V | TBD | awaiting Leinster reading (Part 5) |
| Crypto Track | varies (7 stages) | **IV(s1) + I(s2-7)** | TBD (entry linalg-26) | mood-driven (Part 6, stage 7 terminal) |
| Section V Quantum (A+B) | 1 | V | TBD | after Crypto stage 1–4 (Part 7.4) |
| Regular Conditional Distributions | ~1 | III | `regular_conditional_distributions.html` | Phase 2e prereq (SDE/path-space measure) |
| Advanced VI topics | ~1–2 | III | TBD | individually triggered by ML-application pressure |
| DEC | ~1–2 | IV | TBD | continuous <-> discrete Hodge bridge (Part 3.5); backlog |
| GDL Overview | 1 | V | TBD | backlog |

---

## Part 11 — Completed Tracks Log

Completed tracks (on index.html, no planned pages).

### Major completed tracks
| Track | Pages | Completed | Notes |
|---|---|---|---|
| **Functional Analysis block (Conway)** | **calc-93~99** | **6/16–6/19/2026** | topicGroup `functional-analysis`, Conway-ordered (Hahn–Banach -> four-pillars/Baire -> LCS -> separation HB -> Krein–Milman -> Riesz \(C(X)^*=M(X)\) -> Stone–Weierstrass). Built as Peter–Weyl's Stone–Weierstrass prerequisite chain. Owner-absent debt tracked in Part 12. Detail: `rep_handout_v10` §5.3 (archival). |
| **Peter–Weyl** | **linalg-40** | **6/20/2026** | `peter_weyl.html`, topicGroup `representation-theory`. Compact-group non-commutative Fourier = harmonic-analysis core of the GDL continuous leg. Route = Hall §12.3. \(K=S^1\) degeneration recovers calc-32 Fourier (伏線回収). Closes the rep track's GDL-mandatory scope. Detail: `rep_handout_v10` §5.2 (archival). |
| Smooth Manifolds (Lee Ch.1–16 through Riemannian integration) | calc-36~81 (spine) + calc-42/45/47/52/59 + calc-82~92 (Ch.14 forms / Ch.15 orientations / Ch.16 integration) | 6/3 (Ch.1–13); 6/7 (Ch.14); 6/10 (Ch.15); 6/15/2026 (Ch.16) | Manifold spine through Riemannian metrics, differential forms, orientations, integration (form + Lie-group Haar, Stokes/Green, Riemannian integration + divergence). Mathematical landing of the GDL continuous leg; Peter–Weyl Haar substrate in calc-90. Remaining = Corners / Densities (Part 12). Detail: `manifold_handout_v24` / `ch16_integration_handout_v12`. |
| Representation Theory (Hall) | linalg-31~40 + ml-16 | 6/8/2026 (ml-16); rep mainline earlier; 6/20/2026 (Peter–Weyl linalg-40) | Complexification + group/Lie-algebra representations -> irreducible classification -> complete reducibility / Schur -> Clebsch-Gordan -> Wigner-Eckart (linalg-31~39) -> **Peter–Weyl (linalg-40)**, landing at Equivariant NN (ml-16, Section V). GDL continuous leg's representation-theory spine, **now complete through compact-group harmonic analysis**. GDL-mandatory scope fully satisfied; only the GDL-unnecessary deep-dive (Part II: semisimple / Verma / Weyl character formula) remains. Detail: `rep_handout_v10` (archival). |
| Formal Methods | disc-16, disc-17 | 5/14/2026 | Section IV third pillar (disc-4,16,17). Bidirectional bridge with disc-12 (Four Color Theorem). The Curry-Howard-Lambek connection point for CDL. |

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

---

## Part 12 — Deferred Items (Non-Blocking)

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

## Part 13 — Key Learnings & Development Principles

1. **Notation consistency is non-negotiable**: calligraphic for spaces (𝒳,𝒴,𝒵,ℋ,𝒳*,𝒳**),
   functionals as φ, operator norm ‖φ‖_𝒳*. New Section II pages match calc-23~28.
2. **Cross-page linking**: verify filenames/anchors against reality before linking. No in-body
   citations. Forward links use descriptive text (no href) until the target exists.
3. **Application-viewpoint philosophy**: use Insight Boxes and the Tessera to connect abstract
   theorems to applications without breaking main-text proofs. Application domains introduced when
   tools are ready (asymmetric, Parts 1-7).
4. **Fisher vs Hessian**: the real distinction is reparametrization invariance (Čencov) vs
   loss-dependence and non-guaranteed positive-definiteness, not "global vs local."
5. **Page count estimation**: new conceptual paradigms expand 1.5–4×. Defer ID assignment to
   drafting. Calibrations: Lie groups 2 -> 4, calc-30 1 -> 2, Phase 2c 2 -> 3, Fourier-PDE 1 -> 3,
   CDL 6 -> 12 anticipated. **New strongest data point (Peter–Weyl, 6/2026): a ~2-page target
   spawned a 7-page prerequisite block (the FA block calc-93~99).** A single dependency audit
   (§12.3 needs Stone–Weierstrass) recursively pulled in SW's entire Conway chain. The lesson is
   not just "pages expand" but "a dependency audit can reveal that the *prerequisite* is the real
   project" — the audit is what caught it before drafting, exactly as intended (Pre-Writing
   Dependency Audit pays off).
6. **Per-topic prior-knowledge calibration**: set track-character per topic (Lie=expert,
   CDL/Phase2e/Rep/TDL=learn-while-writing).
7. **Mood-driven dispatch**: no single order enforced. If one track stalls, others proceed. The
   only hard ordering is Section V quantum <- Crypto stage 1-4 (Part 7.4).
8. **[v2 added] All-tracks isomorphic structure**: "mathematical content owned by its native
   Section; identity moves to Section V at the ML/application point." Rep/CDL/Crypto/TDL/Phase2e
   all take this shape (Part 2.2).
9. **[v2 added] Obsolescence-resistance principle**: write the enduring mathematics thickly, not
   the individual method. diffusion -> FM, ML-KEM -> next-gen: when methods swap, the foundation
   survives (Parts 4.2, 6.3).
10. **[v2 added] topicGroup is decided by identity**: place a page by what it *is* (its
    mathematical object), not what it is *used for*. The Crypto (C) split, CDL Section IV, and
    quantum owner separation are all applications of this principle.
11. **Single ownership**: each T-/D- anchor has exactly one owner site-wide. grep previews.json +
    HTML before assigning. Overloads are managed in the Part 9 ledger.
12. **Handout-driven continuity**: session state is authoritative in this roadmap and the
    handouts; memory carries protocol/philosophy only. Per-track detail is single-source-of-truth
    in `*_handout_v1.md`.

---

**This roadmap (v5) is the index layer.** Per-track prereq verification, collisions, owner
candidates, physical-book inspection items, and resume-time greps are authoritative in the
individual handouts for the still-active tracks: `phase2e_handout_v1` / `cdl_track_handout_v1` /
`crypto_track_handout_v1` / `tdl_track_handout_v2` / `manifold_handout_v24` /
`ch16_integration_handout_v12`. The completed Representation-Theory track (incl. Peter–Weyl and the
FA block) is archived in `rep_handout_v10`, which absorbed the spent `peter_weyl_handout_v1` and
`fa_block_screening_handout_v5`.