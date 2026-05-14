# MATH-CS COMPASS: Curriculum Roadmap & Development Plan

**Author:** Yusuke Yokota
**Last Updated:** 5/14/2026
**Website:** https://math-cs-compass.com

---

## Project Overview

MATH-CS COMPASS is an educational platform bridging pure mathematics and computer science, addressing the gap where CS students struggle with mathematical foundations while math students lack awareness of practical applications. The primary focus is providing rigorous mathematical foundations for modern AI/ML, with continuous expansion into adjacent domains (geometric deep learning, categorical deep learning, cryptography, stochastic analysis).

**Total: 120 pages as of 5/14/2026.**

---

## Part 1 — Application Domains: Pillar vs. Viewpoint

An earlier framing treated **GDL, CDL, and Quantum** uniformly as "viewpoints, not terminal goals." The three domains are **not symmetric** in 2026, and this roadmap reflects that asymmetry.

### 1.1 Two orthogonal axes

A clean separation of two concepts that were previously conflated:

- **Pillar (vertical thread)**: Whether the domain functions as a structural thread that multiple Sections converge into. A pillar is a load-bearing column — site geometry depends on it.
- **Viewpoint (re-visit at different heights)**: Whether the domain is encountered repeatedly across the curriculum, each time from a different mathematical altitude, without ever being "completed." A viewpoint is open-ended; the reader returns to it after acquiring more mathematical machinery and sees it differently.

These are **independent**. A domain can be:
- Pillar ∧ Viewpoint (structurally central AND open-ended)
- Viewpoint only (recurring perspective without dedicated structural thread)
- Pillar only (structural backbone with a clear endpoint) — this case rarely fits MATH-CS COMPASS philosophy
- Neither (peripheral application reference)

### 1.2 Classification of the three domains

| Domain | Pillar? | Viewpoint? | Production maturity (2026) | Site treatment |
|---|---|---|---|---|
| **GDL** | ✅ Yes | ✅ Yes | High (AlphaFold, MACE, equivariant robotics) | **Pillar ∧ Viewpoint** — full track |
| **CDL** | ⚠️ Pre-pillar (will likely become pillar within ~2–3 yr) | ✅ Yes | R&D stage (Coend $31M funding; no deployed product) | **Slow-burn parallel track** — start now, do not wait for production maturity |
| **Quantum** | ⚠️ Latent | ✅ Yes | Limited (error-correction codes; molecular simulation niches) | **Viewpoint via Insight Boxes** — no dedicated track planned |

The asymmetry reflects empirical reality, not stylistic preference.

### 1.3 Authorial scale

**Background**: Yusuke holds a US double major in mathematics and computer science from a non-elite institution; self-described as broad-but-shallow undergraduate coverage.

**Operational implication**: prior knowledge varies sharply by topic. Lie theory was familiar (linalg-27~30 ran in expert-reviewer mode); category theory and continuous-time stochastic analysis are not (CDL and Phase 2e are learn-while-writing). Track-character assignments must be calibrated per topic, not against a global expertise label.

---

## Part 2 — GDL: Pillar AND Viewpoint

### 2.1 Why GDL is a pillar

Three independent reasons (any one would suffice; together they are decisive):

1. **Mathematical thickness**: Lie groups, Riemannian geometry, fiber bundles, representation theory, and graph spectral theory all converge into GDL. No other application domain on the site has this many distinct mathematical threads naturally pointing at it.

2. **Production maturity (2026)**: equivariant networks, GNNs, SE(3)-Transformers, neural operators on manifolds have moved from research stage into deployed applications (AlphaFold, MACE/Allegro for molecular design, SE(3)-equivariant robotics policies). This is empirical fact, independent of any "Physical AI" marketing framing.

3. **Independent forward growth**: robotics × ML will continue expanding for reasons grounded in information theory, not market trend. Manipulation tasks have geometric structure that is physical, not coordinate-system-dependent — architectures lacking equivariance pay a sample-efficiency cost for principled reasons. This argument does not require predicting any specific company or product trajectory.

### 2.2 Why GDL is also a viewpoint (not a destination)

The "pillar" framing does not contradict the original viewpoint principle. The two coexist because **a thick pillar looks different at different heights**:

- A reader at ml-13 (GNN) sees only "permutation-equivariant message passing on discrete graphs."
- After the manifold series, the same reader can revisit GDL and ask about continuous symmetries.
- After representation theory, irreducible decomposition reframes equivariance.
- After calc-32 (Fourier on Hilbert spaces), Peter-Weyl bridges GDL back to harmonic analysis on groups.

Each return visit happens at a higher mathematical altitude. The pillar is not climbed-and-finished; it is **passed through repeatedly, at progressively deeper levels of understanding**.

### 2.3 Open-ended GDL (forward-pointer obligation)

Every GDL-related page must include forward-pointers to "the next mathematics" the reader could pursue from there:

- **ml-13 (GNN)** → manifold series, representation theory, spectral graph theory
- **ml-XX (Equivariant NN)** → fiber bundles, gauge theory, information geometry
- **ml-XX (GDL Overview)** → Hodge theory, stochastic geometry, geometric measure theory

This obligation is **not stated explicitly in each page**. Readers will infer the open-endedness from the forward-pointer structure across pages without need for a meta-declaration.

### 2.4 Track sequencing (already in current roadmap; no change)

`ml-13 (GNN) → manifold series (calc-XX, ~3 pages) → representation theory (linalg-XX, ~3–4 pages) → ml-XX (Equivariant NN) → ml-XX (GDL Overview)`

The earlier-planned `calc-32 (Fourier in Hilbert Spaces)` has been completed and remains a prerequisite capstone for the Peter-Weyl bridge later in the sequence. With `ml-13` and `calc-32` already complete, the active ordering from here is: manifold series → representation theory → `ml-XX` (Equivariant NN).

---

## Part 3 — CDL: Pre-Pillar Slow-Burn Track

### 3.1 Status (verified by web search)

- **Research front**: ICML 2024 position paper (Gavranović, Lessard, Dudzik, von Glehn, Araújo, Veličković — "Categorical Deep Learning is an Algebraic Theory of All Architectures"); active research community at ACT (Applied Category Theory) annual conferences (ACT 2025 Florida; ACT 2026 Tallinn scheduled July).
- **Industry transition signal**: Bruno Gavranović founded **Coend**, a company dedicated to CDL R&D, with reported $31M funding. CV claim, not press release; treated as a non-trivial signal but not as production-deployment evidence.
- **Production deployment**: **None as of 2026/5/9**. CDL does not appear in standard 2026 industrial deep-learning use-case surveys; PyTorch/TensorFlow/JAX do not treat categorical structures as first-class primitives.

### 3.2 Why CDL must be developed now, not later

Two independent arguments converge:

**(a) Convergence of the mathematics**: Continuing to deepen Section IV (graph theory → simplicial complexes → homology), Section I (groups → rings → fields → Lie groups), and Section II (continuous maps → functional analysis) **inevitably leads into the language of categories**. The site already implicitly contains category-theoretic structure (functors between Set, Grp, Ring, Vect_F, Top, Ban, Hilb are all latent); not naming these is a deliberate scope discipline that becomes harder to maintain as the curriculum deepens.

**(b) Asymmetry of preparation cost**: The mathematical preparation for CDL is **deep and not skippable**. There is no shortcut to the mathematics. If CDL applications begin maturing in 2027–2028 (a plausible scenario given the Coend trajectory), retroactively building category theory at speed would be infeasible. Pre-positioning the mathematics is the only viable strategy.

These arguments together establish CDL as **MUST cover, but slow**. It cannot be added to Section V proactively (no production applications yet to reference), but the mathematical foundations in Section IV must be built starting now.

### 3.3 Yusuke's prerequisite state and pace strategy

**Important context**: Yusuke does not currently know category theory. Unlike the Lie group series (where Yusuke had prior knowledge and operated in fact-check mode), the CDL track requires Yusuke to **learn alongside the writing process**.

Pace strategy adopted: **(γ) Trial parallel mode** — start with Stage 1's first page in parallel-learning mode (Yusuke reads Leinster Ch.1, Claude proposes site adaptation, Yusuke reviews as learner-reviewer rather than expert-reviewer). After this first page, reassess whether to continue parallel or shift mode.

Rationale: Yusuke's own learning rhythm with category theory is unknown; cannot be predicted from Lie theory experience. The first page acts as calibration probe.

### 3.4 Reference acquisition

Both primary references are **freely available as official PDFs** (verified):

| Reference | Status | Access |
|---|---|---|
| Leinster, *Basic Category Theory* (CUP 2014) | Already in `references.json`, `url` field populated | https://arxiv.org/abs/1612.09375 |
| Fong & Spivak, *Seven Sketches in Compositionality* (CUP 2019) | In `references.json`, **but `url` field missing** — needs update | https://arxiv.org/abs/1803.05316 (also: https://dspivak.net/7Sketches.pdf, http://brendanfong.com/fong_spivak_an_invitation.pdf) |

**Action item**: Add Fong & Spivak `url` field to `references.json` (low priority; cosmetic).

Roles:
- **Leinster**: Primary for the rigorous-pure side. Yoneda, adjunction, limits, Kan extension. The CDL paper's mathematical machinery (2-categories, monads on Para) sits on top of Leinster's Chapter 1–6 as bedrock.
- **Fong & Spivak**: Primary for the applied / intuitive side. Database functors, Petri nets, monoidal categories, string diagrams. Provides the "what is this for" complement to Leinster's "what does this mean."

Both books are necessary; they are not redundant. Standard pairing in the ACT community.

### 3.5 CDL track structure (proposed, not yet ratified)

Six stages, ~6–9 total pages, estimated 6 months to 1+ year of slow-burn parallel work:

| Stage | Est. pages | Content | Site location |
|---|---|---|---|
| **Stage 0** | 0 | Yusuke reads Leinster Ch.1–2 (most of investment cost lives here) | — |
| **Stage 1** | 2–3 | Categories, functors, natural transformations / Yoneda / adjunction (intro level) | `disc-XX` (Section IV) |
| **Stage 2** | 1–2 | Limits & colimits / monads / Kan extensions (as needed) | `disc-XX` |
| **Stage 3** | 1–2 | Applied flavor: quivers as functors / database functors / string diagrams | `disc-XX` |
| **Stage 4** | 1 | CDL bridge: 2-categories of Para, lenses, monads on Para — primer for the Gavranović paper | `ml-XX` |
| **Stage 5** (future) | 1 | CDL Overview: revisit the entire site from a categorical viewpoint | `ml-XX` |

Total: **6–9 pages**, larger than the Lie group series (4 pages). Page-count expansion is expected — the Lie series went 2 → 4; the CDL series may go 6 → 12. Page IDs (`XX`) deferred until drafting.

### 3.6 Site existing content as concrete-example library

A non-obvious strategic advantage: when Stage 1 begins, the site already contains a rich library of category-theoretic examples. The Stage 1 pages can use these as **already-familiar concrete instances**, dramatically lowering the explanatory burden:

- **Monoid as one-object category** — invoke linalg-15 (groups) for objects/morphisms/composition
- **Poset as thin category** — invoke disc-1 / disc-2 / disc-3 lattice content
- **Vect_F as canonical category** — invoke any Section I page
- **Top, Ban, Hilb as categories** — invoke calc-29, calc-23, etc.
- **Set, Grp, Ring functors** — invoke linalg-15 ~ linalg-22 as object library

This is an **originality opportunity**: rather than "introducing categories abstractly then giving examples," the site can introduce categories **as the language that names what readers have already been working with for 100+ pages**. This framing is rare in standard textbooks and aligns with the site's principle of using delayed payoff and retroactive recognition as a primary source of pedagogical originality.

### 3.7 Monitoring obligation

Yusuke's stated commitment: periodic monitoring of CDL project trajectory (Coend, ACT conferences, ICML/NeurIPS CDL papers). When production deployment signals appear, **the CDL track shifts from slow-burn to active**, and Section V CDL pages move from `[deferred]` to `[next]` status.

Trigger candidates for status shift:
- Coend ships first deployable product
- A CDL-based architecture wins on a standard benchmark
- A major framework (PyTorch, JAX, equinox, etc.) adds first-class categorical primitives
- A second well-funded company enters the CDL space

Until then: parallel slow-burn, mathematics-only.

---

## Part 4 — Quantum: Three Sub-Domains, Section V Single-Page Treatment

"Quantum" as a single application domain is misleading: **what is called "Quantum" is actually three sub-domains with very different mathematical requirements and very different production-maturity levels**. Treating them uniformly would either over-invest in immature areas or under-invest in already-deployed ones.

### 4.1 Three sub-domains

| Sub-domain | Mathematical core | 2026 production status |
|---|---|---|
| **A — Quantum theory (physics)** | Hilbert space + spectral theory + Fourier; unitary evolution; observables as self-adjoint operators; measurement | 100-year-established classical theory; no novelty |
| **B — Quantum computation** | Sub-domain A + tensor product structure (qubits) + quantum circuits + algorithms (Shor, Grover, VQE) + error correction | NISQ era; first documented practical quantum advantage cases (e.g., IonQ × Ansys medical-device simulation, 2025); Harvard/QuEra: fault-tolerant systems plausibly arrive late this decade. **No production deployment yet.** |
| **C — Post-quantum cryptography (PQC)** | Lattice theory + LWE / Module-LWE problem + coding theory + hash functions + elliptic curves | **Already production-deployed**: NIST finalized FIPS 203 (ML-KEM), 204 (ML-DSA), 205 (SLH-DSA) in August 2024; Google has enabled ML-KEM in Chrome; Microsoft deployed PQC in Azure and Windows; AWS likewise. End users already use it daily. CNSA 2.0 mandates quantum-safe systems for new US national-security deployments by January 2027. |

The asymmetry is decisive: **A is mathematically settled but applied; B is research-active but not deployed; C is mathematically novel for the site AND already deployed at planet scale**.

### 4.2 Site placement decision

**Sub-domain A + B**: combined into **a single Section V viewpoint page** ("Quantum Information Science Overview" or similar — `ml-XX`).
- Rationale: A's mathematics is fully covered by the existing FA block (calc-23, 25, 27, 32); a dedicated math page is unnecessary. B introduces tensor product structure, qubit encoding, and headline algorithms (Shor, Grover, VQE) at a viewpoint level. One Section V page suffices to give the reader a structured tour of both, with ref-links back into Section II for the underlying machinery.
- Position alongside ml-13 (GNN) and ml-XX (Equivariant NN) as a Section V viewpoint, **not** a pillar.
- **Pace**: not on the active path. Trigger-tolerant; can be written when GDL main-track work creates breathing room.

**Sub-domain C**: belongs in **Section I**, as an extension of the existing crypto entry point at linalg-26 (Finite Fields).
- Rationale: linalg-26 already establishes the algebraic groundwork for cryptography; Menezes et al. *Handbook of Applied Cryptography* is already in `references.json` (currently tagged niche — **this tag must be lifted if the crypto track is activated**).
- Section I post-30 expansion is a structurally natural site location; no Section IV detour needed.
- **Pace**: see Part 5 (Crypto Track).

### 4.3 What is NOT done

- **No "Quantum Section"**. The architectural principle "no isolated Geometry / Physics section" applies. Quantum content distributes across existing sections.
- **No `ml-XX (Quantum Overview)` separate from the A+B combined page**. One page covers the viewpoint.
- **No pillar status for Quantum overall**. The C sub-domain (PQC) might mature into a pillar-grade track via the Crypto Track (Part 5), but that is a Crypto Track question, not a Quantum question.

### 4.4 Sub-domain B → Crypto Track dependency (important)

The Section V quantum page (A+B) must explain Shor's algorithm, which requires the reader to know **what Shor breaks**. This forces a dependency:

> **Before the Section V quantum page can be written, the Crypto Track must have covered classical encryption + public-key cryptography + at minimum a description of what RSA / ECDH protect.**

This is a hard prerequisite. Without it, Shor's algorithm reduces to "this breaks something" with no concrete referent, and the page fails its viewpoint role.

The reverse is not required: the Crypto Track does **not** need to reach PQC before the quantum page is written. Coverage stages 1–3 (and stage 4's Shor description) of the Crypto Track suffice.

---

## Part 5 — Crypto Track (Low Priority, Mood-Driven)

### 5.1 Position and self-assessment

The Crypto Track sits at low priority in the roadmap — below GDL main-track, below CDL slow-burn — and is **mood-driven** in the precise sense: it is neither scheduled nor trigger-based, but driven by Yusuke's interest level on a given day. It functions as a switch destination when CDL slow-burn fatigue accumulates, or when GDL main-track work needs a contrast.

**Self-assessment (recorded explicitly, not a passing remark)**: cryptography is, by any reasonable measure, the **most under-covered area of the entire site relative to its importance**. It is unambiguously mathematics; it is unambiguously CS; it is unambiguously a math ↔ CS bridge — exactly the kind of content the site name *MATH-CS COMPASS* points at. That it is currently untouched reflects an honest accident of curriculum sequencing, not a principled exclusion. The roadmap acknowledges this asymmetry explicitly so future decisions are anchored against it: **"low priority" does not mean "low importance" — it means "deferred for reasons of bandwidth, not principle."**

### 5.2 Why it is nonetheless low priority

Three reasons converge:

1. **Long mathematical runway**: PQC requires understanding what classical cryptography is, why it works, what RSA / ECDH are, and only then does the lattice-based path become meaningful. Without classical cryptography first, there is nowhere to start — the path is unexpectedly long. Like CDL, this track has no shortcut: each layer requires the one below it.

2. **No structural blocker**: unlike CDL (which the site's deepening curriculum will inevitably collide with), the Crypto Track can be deferred indefinitely without breaking other tracks. The site's other content does not flow toward cryptography in the way it flows toward category theory.

3. **Hard dependency only with Section V quantum page**: see §4.4. The Crypto Track must reach a minimum coverage point before the Section V quantum page can be written, but that quantum page itself is also low-priority, so the constraint propagates naturally without forcing premature work.

### 5.3 Coverage outline (page-count estimates deferred)

The full track, if completed end-to-end, has seven natural stages. **Page counts are not estimated** — Yusuke may stop the track at any stage, and the right cutoff depends on developments not visible in 2026/5/9:

| Stage | Topic | Mathematical content | Section placement |
|---|---|---|---|
| **1** | Classical cryptography foundations | Symmetric encryption, encryption / decryption duality, Kerckhoffs's principle, computational-complexity-based security definitions | Section I (extension of linalg-26 or new dedicated page) |
| **2** | Public-key cryptography & number-theoretic foundations | Diffie-Hellman, RSA, discrete logarithm problem, integer factorization problem, modular arithmetic in cryptographic context | Section I |
| **3** | Elliptic curve cryptography (ECC) | Elliptic curve groups, ECDH, ECDSA, modern usage (TLS, Bitcoin) | Section I |
| **4** | Quantum threat & Shor's algorithm | Shor's algorithm sketch, what it breaks (RSA, ECDH), Grover's bound on symmetric ciphers — **interfaces with Section V quantum page** | Section I (with cross-link to Section V) |
| **5** | Lattice theory foundations | Lattices in ℝⁿ, SVP / CVP problems, LLL algorithm, lattice-based hardness assumptions | Section I |
| **6** | LWE / Module-LWE | Learning With Errors problem, Module-LWE, security reductions, structured-lattice variants | Section I |
| **7** | NIST PQC standards overview | ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205); deployment context | Section I (capstone) |

**Realistic stop-points** (any of these is a legitimate end-state for the track):
- **After stage 3**: classical cryptography is complete; site has rounded out its CS-bridge coverage; PQC remains forward-pointer only.
- **After stage 4**: stages 1–3 + Shor's description; minimum required to write the Section V quantum page; no PQC.
- **After stage 7**: full track; Section I has a substantial crypto sub-track of 6–10 pages; PQC is a site capstone.

### 5.4 Reference status

Already in `references.json`:
- **Menezes, van Oorschot, Vanstone**, *Handbook of Applied Cryptography* (CRC, 1997) — currently sections: ["I"], tagged as niche entry for linalg-26. **Action when Crypto Track activates**: lift the niche tag in roadmap.

Not yet in `references.json`, **likely needed when track reaches stage 5+**:
- A standard lattice cryptography reference. Options to evaluate at activation time: *Lattice-Based Cryptography* (Nguyen-Vallée 2010), Peikert's *A Decade of Lattice Cryptography* (2016 survey), or the Bernstein-Lange survey work. **Decision deferred to track activation**.

### 5.5 Pace and ownership

- **Owner**: Yusuke's mood. No schedule.
- **Failure mode to avoid**: starting the track ambitiously, then abandoning mid-stage, leaving Section I in an asymmetric state. Mitigation: **respect natural stop-points (stage 3, stage 4, stage 7)**. Closing at one of these leaves Section I in a coherent state regardless of whether the track ever resumes.
- **Coordination with Section V quantum page**: if Yusuke decides to write the Section V quantum page, stages 1–4 of the Crypto Track must be complete first. This is the only hard ordering constraint involving the Crypto Track.

---

## Part 6 — Phase 2e: Stochastic Calculus (Active Slow-Burn)

**Promotion**: trigger-based → active slow-burn track. Joins CDL as the second concurrent slow-burn track running parallel to the GDL main track.

**Yusuke's familiarity level (β)**: name-recognition and concept-level grasp of Brownian motion, Itō integral, SDE — but no prior structured reading of Durrett's later chapters or Karatzas-Shreve. Yusuke's self-assessment: trivia-level familiarity, not domain expertise. Yusuke is a CS author, not a probabilist by training.

**Mode: Trial Parallel** (same protocol as CDL):
- Start with one page (Brownian motion) and assess pace before committing to the full track.
- Yusuke learns the material alongside the writing process; Claude's role is closer to learner-reviewer's reference than expert-reviewer's verifier.
- After the first page, decide whether to continue parallel or shift to focused-burst mode.

**First page**: `prob-XX` Brownian Motion (`brownian_motion.html`). Natural starting point because:
- prob-23 carries a forward-reference to Kolmogorov extension theorem that this page retroactively closes.
- BM construction (Kolmogorov extension + Kolmogorov-Čentsov continuity, or Lévy-Ciesielski) is the gateway to the entire stochastic-calculus track.
- No prereq dependencies on other active tracks — BM page can proceed independently.

**Track scope**: 2–3 pages.

| Page | Filename | Topics |
|---|---|---|
| `prob-XX` | `brownian_motion.html` | BM axioms, existence (Kolmogorov extension + Kolmogorov-Čentsov, or Lévy-Ciesielski), quadratic variation, nowhere-differentiable paths |
| `prob-XX` | `ito_integral.html` | Predictable processes, Itō integral via L² isometry extension, Itō's lemma (1D), SDE existence-uniqueness (statement-level) |
| `prob-XX` | `sde_fokker_planck.html` | SDE solution overview, diffusion generator, Fokker-Planck equation, Girsanov (statement + intuition), score function interpretation |

**Application priority anchor**: diffusion models are currently in production (Stable Diffusion, DALL-E, Sora, Veo), and the site already covers them at the discrete-DDPM/DDIM level in `ml-14` (Intro to Diffusion Models). Phase 2e provides the continuous-time foundations — Brownian motion, Itō calculus, Fokker-Planck — that `ml-14` deliberately defers; together the two complete what Murphy MLBook2 Ch.25 compresses.

**Track-character note (recorded explicitly)**: Phase 2e is structurally a **CS-author-learns-pure-math project**, not a "CS author writes pure math from prior knowledge" project. This places it in the same category as the CDL slow-burn track:

| Track | Out-of-specialty domain for Yusuke | Authoring mode |
|---|---|---|
| **CDL slow-burn** | Category theory | Learning = writing (trial parallel) |
| **Phase 2e slow-burn** | Stochastic analysis | Learning = writing (trial parallel) |

Both contrast with the **Lie group series** (linalg-27~30), where Yusuke had prior knowledge and operated in expert-reviewer / fact-check mode. The two slow-burn tracks share a different rhythm: slower per-page progress, more dialog at the conceptual layer, page-count expansion likely (CDL: 6→9 anticipated; Phase 2e: 2-3 may grow if learning gaps surface).

**Soft prereq from the Fourier-PDE pages (calc-33/34/35, completed)**: the Fokker-Planck page builds directly on calc-33 (heat equation) — Fokker-Planck is a parabolic PDE, the heat equation generalized with a drift term. The completed heat equation page already covers the spectral and kernel machinery the Fokker-Planck page will cite.

**Bandwidth note**: with Phase 2e promoted, the active track inventory is:
1. **GDL main track** (manifolds → rep theory → ml-XX (Equivariant NN)); ml-13 and calc-32 already complete
2. **CDL slow-burn** (Stage 0: Yusuke reads Leinster Ch.1)
3. **Phase 2e slow-burn** (BM page first)
4. **Crypto Track** (mood-driven, no schedule)

This is a **4-track configuration**. Sustainability check is implicitly delegated to Yusuke's mood-driven prioritization across sessions; if any one track stalls, the others continue. The roadmap does not enforce a single sequence.

## Part 7 — Phase 3: Smooth Manifolds

Lee Ch. 1–3 + Ch. 8 require ≥3 pages. Page IDs are assigned at drafting time.

### 7.1 calc-XX: Smooth Manifolds & Atlases (~1 page, `smooth_manifolds.html`)

Topological manifolds, charts, atlases, transition maps, smooth structure, smooth maps. **Payoff:** calc-29's Hausdorff + second-countability are revealed as specifications excluding pathological spaces. **Prereqs:** calc-29, linalg-27~30.

### 7.2 calc-XX: Tangent Spaces & The Pushforward (~1 page, `tangent_spaces.html`)

Tangent vectors (curves and derivations), \(T_pM\), pushforward / differential, Jacobian in local coordinates. **CS angle:** pushforward = forward propagation Jacobian; pullback ↔ backprop. **Payoff:** \(T_I G\) from linalg-29 is a special case of the abstract tangent space.

### 7.3 calc-XX: Vector Fields, Flows & The Tangent Bundle (~1 page, `vector_fields_flows.html`)

\(TM\), vector fields, integral curves and flows, Lie bracket of vector fields. **CS angle:** ODE solvers on manifolds; Neural ODE and fluid simulation as flows. **Payoff:** the matrix commutator \([A, B] = AB - BA\) from linalg-29 is revealed as the matrix representation of the Lie bracket of vector fields.

### 7.4 calc-XX: Riemannian Metrics & Beyond (~2 pages, scope TBD)

Inner products on tangent spaces, metric tensor \(g\), geodesics, Levi-Civita connection, curvature, Laplace-Beltrami \(\Delta_g\). Likely splits into 2 pages (metrics & geodesics vs. curvature & Laplace-Beltrami). **Prereqs:** manifold series above, calc-25 (Riesz — musical isomorphisms).

---

## Part 8 — Phase 4: Representation Theory & Equivariance

### 8.1 linalg-XX: Representation Theory (~3–4 pages)

Group representations, subrepresentations, irreducibility, Maschke, Schur, character theory (finite groups), Lie group representations, Peter-Weyl. Finite group representations fill ≥2 pages; Lie group representations add 1–2 more. **Connection:** Peter-Weyl bridges back to calc-32 (Fourier as harmonic analysis on groups). **Prereqs:** linalg-27~30, linalg-22.

### 8.2 ml-XX: Equivariant Neural Networks (`equivariant_nn.html`)

Generalize from permutation invariance (GNN) to continuous group equivariance (SO(3), SE(3)). **Key insight:** "The architecture encodes the symmetry." **Prereqs:** linalg-27~30, linalg-XX (rep theory), ml-13.

At this point, readers have seen permutation equivariance (GNN), rotation/translation equivariance (Equivariant NN), and Riemannian structure (NGD). The unifying language is GDL — which becomes not a lesson to teach but a pattern the reader has already experienced.

---

## Part 9 — Filename Registry

Forward-link target reservations for **planned pages**. Completed pages are tracked in `curriculum.json` (authoritative); this registry exists to lock in filenames before drafting so cross-page references can be written ahead of time.

### Planned Pages (ID deferred — assigned at drafting time)

| Track | Est. Pages | Planned Filenames | Trigger / status |
|--------|-----------|-------------------|--------|
| Smooth Manifolds (calc-XX) | ~3 | `smooth_manifolds.html`, `tangent_spaces.html`, `vector_fields_flows.html` | Next |
| Riemannian Metrics (calc-XX) | ~2 | `riemannian_metrics.html`, TBD | After manifold series |
| Representation Theory (linalg-XX) | ~3–4 | TBD | After manifold series |
| Equivariant NN (ml-XX) | 1 | `equivariant_nn.html` | After rep theory |
| Section V Quantum Page (ml-XX) | 1 | TBD | After Crypto Track stages 1–4 |
| Stochastic Calculus (prob-XX) | ~2–3 | `brownian_motion.html`, `ito_integral.html`, `sde_fokker_planck.html` | Active slow-burn (Part 6) |
| CDL Track (disc-XX, ml-XX) | ~6–9 | TBD | Active slow-burn (Part 3) |
| Crypto Track (linalg-XX) | varies | TBD | Mood-driven (Part 5) |
| Regular Conditional Distributions (prob-XX) | ~1 | `regular_conditional_distributions.html` | Phase 2e prerequisite (SDE / path-space measures) |
| Advanced VI topics (prob-XX) | ~1–2 | TBD | Triggered individually by ML-application pressure |
| DEC (disc-XX) | ~1–2 | TBD | Backlog |
| GDL Overview (ml-XX) | 1 | TBD | Backlog |

---

## Part 10 — Reference Map: Books × Pages

This map tracks primary usage for development planning. The site-wide reference index (`data/references.json`) is authoritative for bibliography format.

### Currently active for in-progress / planned tracks

| Book | Pages (existing → planned) | Role |
|------|----------------------------|------|
| **Conway — *A Course in Functional Analysis*** | calc-23~28, calc-30~32 | Primary for all of Section II advanced analysis |
| **Durrett — *Probability: Theory and Examples*** | prob-13, prob-22~26 → Phase 2e | Primary for measure-theoretic probability and stochastic calculus |
| **Lee — *Introduction to Smooth Manifolds*** | calc-29 → calc-XX manifold series, calc-XX Riemannian | Primary for manifold track |
| **Stein & Shakarchi — *Fourier Analysis*** | calc-14, calc-15, calc-32, calc-33, calc-34, calc-35 | Primary for Fourier and classical PDE applications |
| **Stillwell — *Naive Lie Theory*** | linalg-24, linalg-27~30 | Primary for Lie group series; supplement with Lee Ch.7+ for rigorous treatment |
| **Leinster — *Basic Category Theory*** | → CDL track Stages 1–2 | Primary for rigorous-pure side of CDL track; free PDF on arXiv |
| **Fong & Spivak — *Seven Sketches in Compositionality*** | → CDL track Stages 3 (and motivation throughout) | Primary for applied / intuitive side of CDL track; free PDF on arXiv |
| **Menezes et al. — *Handbook of Applied Cryptography*** | linalg-26 → Crypto Track (Part 5) | Primary for Crypto Track; previously tagged niche, lifted as of 5/9/2026 |
| Bronstein et al. — *Geometric Deep Learning* | Insight Boxes site-wide, ml-13 → ml-XX (Equivariant NN), ml-XX (GDL overview) | "Destination viewpoint" text; referenced not followed |
| Murphy Book 1 — *Probabilistic ML: Introduction* | ml-01~08, ml-13 | General ML reference |
| Murphy Book 2 — *Probabilistic ML: Advanced* | ml-09~12, ml-14, prob-16, prob-26 → Phase 2e (continuous-time diffusion) | Information geometry at applied level; sufficient until Amari is needed |

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
- **Edelsbrunner & Harer** *Computational Topology* → disc-14, disc-15

### Not yet on index.html (acquire when triggered)

- **Amari** *Information Geometry and Its Applications* (2016) — after manifold series if info-geometry page is planned (deepens ml-12 NGD)
- **Nielsen & Chuang** *Quantum Computation* (2010) — if Section V quantum page (Part 4) is written (supplements calc-32)
- **Lattice cryptography reference** (Nguyen-Vallée, Peikert survey, or Bernstein-Lange) — when Crypto Track reaches stage 5+ (lattice foundations)

---

## Part 11 — Deferred Items (Non-Blocking)

Topics explicitly deferred — not forgotten, but not on the critical path.

| Item | Trigger to Revisit |
|------|-------------------|
| Schwartz Space & Distributions | If a PDE or generalized function page is planned beyond calc-33/34/35 |
| Pontryagin Duality (Fourier on groups) | After linalg-27~30 + calc-32 + linalg-XX (rep theory), if harmonic analysis track emerges |
| Spectral Theory of the Laplacian (continuous) | After calc-XX (Riemannian Metrics), as bridge to geometric spectral theory |
| Regular Conditional Distributions | Phase 2e companion — required for SDE / Itô filtration. Not blocking prob-26 (VI works under density assumption). |
| Fiber Bundles & Gauge Theory | If GDL viewpoint page demands gauge equivariance machinery |
| String Diagrams | After CDL Stage 4 (CDL bridge page); part of Stage 4 if applicable |
| Advanced VI topics (normalizing flows, IWAE, EP, wake-sleep, hierarchical / structured / implicit posteriors) | Triggered individually by ML-application pressure |
| Uniform Integrability & Martingale Convergence | Triggered by RL theory / stochastic approximation / bandit algorithms. Resolves prob-23 UI forward-reference. |
| Variational Representations & f-Divergences | Triggered by contrastive learning / MI estimation / generalization theory (foundation for MINE, f-GAN, InfoNCE, PAC-Bayes) |
| Characteristic Functions & CLT (Rigorous) | Triggered by advanced asymptotic statistics; prereq: calc-32 |

---

## Part 12 — Key Learnings & Development Principles

1. **Notation Consistency is Non-Negotiable:** Calligraphic letters for spaces (\(\mathcal{X}, \mathcal{Y}, \mathcal{Z}, \mathcal{H}, \mathcal{X}^*, \mathcal{X}^{**}\)); functionals as \(\varphi\); operator norm as \(\|\varphi\|_{\mathcal{X}^*}\). All new Section II pages match the notation in calc-23~28.

2. **Cross-Page Linking & References:** Links verified against actual filenames and anchor IDs before inclusion. No in-body citations — references handled in the site-wide reference index only. Forward links use descriptive text only (no `<a href>`) until target page exists.

3. **Application Viewpoint Philosophy:** Use Insight Boxes and the map's Tessera to connect abstract theorems to applications without breaking formal proofs in main text. Application domains introduced when tools are ready — not forced prematurely. (Asymmetric across domains: see Parts 1–5.)

4. **Fisher Information vs. Hessian Distinction:** The real distinction is reparametrization invariance (Čencov's theorem) vs. loss-dependence and non-guaranteed positive definiteness — not "global vs. local."

5. **Page Count Estimation:** Topics requiring new conceptual paradigms consistently expand 1.5–4× initial estimates. Plan for expansion and defer ID assignment until drafting begins. Calibrations: Lie group series (planned 2 → actual 4), calc-30 split (1 → 2), Phase 2c (planned 2 → actual 3), Fourier-PDE pages (Claude initially proposed 1 → ratified as 3, delivered as calc-33/34/35). The CDL track is expected to follow this pattern (proposed ~6–9, may grow to 9–12+).

6. **Per-topic prior-knowledge calibration (added 2026/5/9):** Yusuke's prior knowledge varies sharply by topic. Lie theory was familiar (linalg-27~30 ran in expert-reviewer mode); category theory and continuous-time stochastic analysis are not (CDL and Phase 2e are learn-while-writing). Track-character assignments must be calibrated per topic, not against a global expertise label.

7. **Mood-driven dispatch over forced sequencing (added 2026/5/9):** the active 4-track configuration (GDL main + CDL + Phase 2e + Crypto) does not enforce a single sequence. Yusuke prioritizes per session; if any one track stalls, the others continue.