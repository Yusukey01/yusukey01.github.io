// sec5_p12_vae_uncertainty.js — VAE Uncertainty in Robotic Manipulation (v9 rebuild)
// [Core IIFE] VaeCore: DOM-free, THREE-free, Node-requirable pure math.
// The 3D choreography (v8.2) is preserved in the UI layer; this core owns
// every quantity the demo DISPLAYS or DECIDES on: analytic 2-link IK (with
// an honest clamped flag), the grip-point torque, the damped Euler step,
// the page's hand-designed encoder map, the KL closed form (with a
// DISCLOSED sigma floor replacing v1's silent 1e-9), ghost-arm offsets
// matching the page's displayed formula (horizontal only), the EMA sample
// smoothing, and the abort decision. Page constants live here once.

var VaeCore = (function () {
    'use strict';

    // ---------- constants (single source of truth; page prose quotes these) ----------
    var CONST = {
        // arm geometry
        L1: 24, L2: 22, BASE_Y: 3.5,
        // box geometry & placement
        BW: 12, BH: 18, BD: 12,
        BP: { x: 34, y: 0, z: 0 },
        GRIP_Y: 22.25,           // = BH + 4.25 (suction manifold: shaft 0.75 + housing 1.5 + plate 0.8 + cups 1.2)
        WRIST_X_OFF: -8,         // wrist sits 8 behind box center (= -(BW/2 + 2))
        // choreography waypoints
        HOME: { x: 8, y: 46, z: 0 },
        PRE_LIFT_H: 5,
        LIFT_MAX: 16,            // v9: within IK reach (v8.2's 40 saturated the arm silently)
        // encoder map (page: mu = 0.07 (tau_x, tau_z); sigma = 0.011 |tau|)
        MU_GAIN: 0.07,
        SIG_GAIN: 0.011,
        SIG_FLOOR: 0.05,         // disclosed floor for the KL display (KL -> inf as sigma -> 0)
        // ghost arms (page: t = t_p + mu * s_mu + sigma * eps * s_sigma, horizontal)
        GHOST_S_MU: 12,
        GHOST_S_SIG: 18,
        EMA_ALPHA: 0.92,
        NG: 5,
        // physics & display
        G: 9.81,
        DEFAULT_I: 4.5,
        ROT_DISPLAY_GAIN: 0.008, // disclosed orientation-integration display gain
        GRIP_FACTOR: 1.6,        // commanded grip force = 1.6 * m * g (disclosed safety factor)
        // defaults
        DEFAULT_MASS: 8,
        DEFAULT_COM: { x: 2, y: -3, z: 1.5 },
        DEFAULT_THR: 1.8,
        DEFAULT_CD: 28
    };
    CONST.HOVER = { x: CONST.BP.x + CONST.WRIST_X_OFF, y: CONST.GRIP_Y + 14, z: CONST.BP.z };
    CONST.BOX_TOP = { x: CONST.BP.x + CONST.WRIST_X_OFF, y: CONST.GRIP_Y, z: CONST.BP.z };
    CONST.LIFT_TOP = { x: CONST.BP.x + CONST.WRIST_X_OFF, y: CONST.GRIP_Y + CONST.LIFT_MAX, z: CONST.BP.z };

    // ---------- tiny vector helpers (plain objects) ----------
    function v3(x, y, z) { return { x: x, y: y, z: z }; }
    function sub(a, b) { return v3(a.x - b.x, a.y - b.y, a.z - b.z); }
    function add(a, b) { return v3(a.x + b.x, a.y + b.y, a.z + b.z); }
    function scale(a, s) { return v3(a.x * s, a.y * s, a.z * s); }
    function cross(a, b) {
        return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }
    function vlen(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); }
    function dist(a, b) { return vlen(sub(a, b)); }

    // ---------- seeded RNG ----------
    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function makeRandn(rng) {
        var spare = null;
        return function () {
            if (spare !== null) { var s = spare; spare = null; return s; }
            var u, v, r;
            do { u = rng(); } while (u <= 1e-12);
            v = rng();
            r = Math.sqrt(-2 * Math.log(u));
            spare = r * Math.sin(2 * Math.PI * v);
            return r * Math.cos(2 * Math.PI * v);
        };
    }

    // ---------- analytic 2-link IK (v8.2 geometry, plus honest clamped flag) ----------
    function solveIK(tgt) {
        var bY = CONST.BASE_Y, L1 = CONST.L1, L2 = CONST.L2;
        var dx = Math.sqrt(tgt.x * tgt.x + tgt.z * tgt.z);
        var dy = tgt.y - bY;
        var dRaw = Math.sqrt(dx * dx + dy * dy);
        var clamped = false;
        var d = dRaw;
        if (d > L1 + L2 - 0.5) { d = L1 + L2 - 0.5; clamped = true; }
        var hA = Math.atan2(tgt.z, tgt.x);
        var cE = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
        if (cE > 0.999) { cE = 0.999; clamped = true; }
        if (cE < -0.999) { cE = -0.999; clamped = true; }
        var eA = Math.acos(cE);
        var al = Math.atan2(dy, dx < 0.001 ? 0.001 : dx);
        var be = Math.atan2(L2 * Math.sin(eA), L1 + L2 * Math.cos(eA));
        var sA = al + be;
        var eR = L1 * Math.cos(sA), eY = L1 * Math.sin(sA);
        var wR = eR + L2 * Math.cos(sA - eA), wY = eY + L2 * Math.sin(sA - eA);
        var ch = Math.cos(hA), sh = Math.sin(hA);
        return {
            base: v3(0, bY, 0),
            elbow: v3(eR * ch, bY + eY, eR * sh),
            wrist: v3(wR * ch, bY + wY, wR * sh),
            clamped: clamped
        };
    }
    // gripper hangs forward of the IK wrist, centered over the box column
    function gripPos(wrist) {
        return v3(wrist.x - CONST.WRIST_X_OFF, wrist.y, wrist.z);
    }

    // ---------- physics ----------
    function comWorld(boxPos, com) {
        return v3(boxPos.x + com.x, boxPos.y + CONST.BH / 2 + com.y, boxPos.z + com.z);
    }
    // tau = (r_com - r_grip) x (-m g yhat)
    function torqueAbout(gripPt, comW, mass, g) {
        return cross(sub(comW, gripPt), v3(0, -mass * g, 0));
    }
    // damped Euler: I dw/dt = tau - Cd w  (explicit step)
    function physStep(av, tau, I, Cd, dt) {
        var ax = (tau.x - Cd * av.x) / I;
        var ay = (tau.y - Cd * av.y) / I;
        var az = (tau.z - Cd * av.z) / I;
        return v3(av.x + ax * dt, av.y + ay * dt, av.z + az * dt);
    }
    // orientation increment shown on screen: angle = |w| * dt * ROT_DISPLAY_GAIN
    // (display gain is a named, page-disclosed constant — not physics)
    function rotIncrement(av, dt) {
        var m = vlen(av);
        var angle = m * dt * CONST.ROT_DISPLAY_GAIN;
        if (m < 1e-12) return { axis: v3(0, 1, 0), angle: 0 };
        return { axis: scale(av, 1 / m), angle: angle };
    }

    // ---------- hand-designed encoder (page formulas, constants above) ----------
    function vaeMap(tau) {
        var t = vlen(tau);
        return {
            mu: [CONST.MU_GAIN * tau.x, CONST.MU_GAIN * tau.z],
            sig: CONST.SIG_GAIN * t
        };
    }
    // KL[ N(mu, sigma^2 I_2) || N(0, I_2) ] with the disclosed sigma floor
    function klIso2(mu, sig) {
        var s = Math.max(sig, CONST.SIG_FLOOR);
        var s2 = s * s;
        var m2 = mu[0] * mu[0] + mu[1] * mu[1];
        return 0.5 * (m2 + 2 * s2 - 2 * Math.log(s2) - 2);
    }
    // ghost end-effector offset: horizontal only, matching the page formula
    function ghostOffset(mu, sig, eps) {
        return {
            dx: CONST.GHOST_S_MU * mu[0] + CONST.GHOST_S_SIG * sig * eps.x,
            dy: 0,
            dz: CONST.GHOST_S_MU * mu[1] + CONST.GHOST_S_SIG * sig * eps.y
        };
    }
    function emaStep(prev, sample, alpha) {
        return alpha * prev + (1 - alpha) * sample;
    }
    // stationary std of the EMA of iid N(0,1): sqrt((1-a)/(1+a))
    function emaStationaryStd(alpha) {
        return Math.sqrt((1 - alpha) / (1 + alpha));
    }
    function decision(sig, thr) {
        return sig > thr ? 'ABORT' : 'LIFT_OK';
    }
    function gripForce(mass, s) {
        return s * mass * CONST.G * CONST.GRIP_FACTOR;
    }

    // ---------- story-level convenience: torque at grasp geometry ----------
    // Grip point sits on the box column at the current wrist height; the box is
    // rigidly attached, so r = comW - grip is HEIGHT-INDEPENDENT:
    // r = (com.x, const, com.z) and tau = m g (com.z, 0, -com.x).
    function graspTorque(com, mass) {
        var wrist = solveIK(CONST.BOX_TOP).wrist;
        var gp = gripPos(wrist);
        var comW = comWorld(CONST.BP, com);
        return torqueAbout(gp, comW, mass, CONST.G);
    }

    // ---------- self-tests ----------
    function runSelfTests() {
        var failures = [];
        function check(name, cond, detail) {
            if (!cond) failures.push(name + (detail ? ' — ' + detail : ''));
        }
        try {
            var i, ik;

            // T0: vector-algebra spec pins. The demo only ever crosses with a
            // vertical force (b.x = b.z-ish structure), which hides component
            // mutants — pin cross() on GENERIC vectors, plus antisymmetry.
            var c0 = cross(v3(1, 2, 3), v3(4, 5, 6));
            check('T0 cross generic', c0.x === -3 && c0.y === 6 && c0.z === -3, JSON.stringify(c0));
            var cA = cross(v3(2, -1, 0.5), v3(-0.3, 4, 1.2)), cB = cross(v3(-0.3, 4, 1.2), v3(2, -1, 0.5));
            check('T0 cross antisymmetric', cA.x === -cB.x && cA.y === -cB.y && cA.z === -cB.z);
            // comWorld geometric definition pin: the CoM marker sits at box
            // half-height plus the user offset (tau is height-independent, so
            // torque tests cannot see this — pin the definition directly)
            var cw0 = comWorld(v3(0, 0, 0), v3(0, 0, 0));
            check('T0 comWorld half-height', cw0.x === 0 && cw0.y === CONST.BH / 2 && cw0.z === 0, JSON.stringify(cw0));

            // T1: FK o IK = identity on reachable targets; link lengths preserved
            var rng = mulberry32(11);
            for (i = 0; i < 60; i++) {
                var r = 6 + rng() * 38;                    // within [6, 44] < 45.4
                var th = rng() * Math.PI * 0.9 + 0.05;     // elevation
                var ph = rng() * Math.PI * 2;              // azimuth
                var tgt = v3(r * Math.cos(th) * Math.cos(ph),
                    CONST.BASE_Y + r * Math.sin(th),
                    r * Math.cos(th) * Math.sin(ph));
                ik = solveIK(tgt);
                check('T1 link1 length', Math.abs(dist(ik.base, ik.elbow) - CONST.L1) < 1e-9,
                    'got ' + dist(ik.base, ik.elbow));
                check('T1 link2 length', Math.abs(dist(ik.elbow, ik.wrist) - CONST.L2) < 1e-9,
                    'got ' + dist(ik.elbow, ik.wrist));
                if (!ik.clamped) {
                    check('T1 wrist = target', dist(ik.wrist, tgt) < 1e-9, 'err ' + dist(ik.wrist, tgt));
                }
            }

            // T2: honest failure flag + choreography reachability
            check('T2 unreachable flags', solveIK(v3(26, 62.25, 0)).clamped === true, 'v8.2 lift top must clamp');
            check('T2 too-close flags', solveIK(v3(0.5, CONST.BASE_Y + 0.5, 0)).clamped === true);
            [['HOME', CONST.HOME], ['HOVER', CONST.HOVER], ['BOX_TOP', CONST.BOX_TOP], ['LIFT_TOP', CONST.LIFT_TOP]].forEach(function (wp) {
                var s = solveIK(wp[1]);
                check('T2 waypoint reachable: ' + wp[0], s.clamped === false && dist(s.wrist, wp[1]) < 1e-9);
            });

            // T3: torque pins — exact zero under the grip axis; |tau| = m g d for
            // horizontal offset d; right-hand-rule direction
            var gp3 = v3(34, 27, 0);
            var m3 = 8;
            check('T3 zero on axis', vlen(torqueAbout(gp3, v3(34, 5, 0), m3, CONST.G)) === 0);
            var t3 = torqueAbout(gp3, v3(34 + 2.5, 5, 0), m3, CONST.G); // d = 2.5 in +x
            check('T3 magnitude', Math.abs(vlen(t3) - m3 * CONST.G * 2.5) < 1e-9, 'got ' + vlen(t3));
            check('T3 direction', Math.abs(t3.z + m3 * CONST.G * 2.5) < 1e-9 && t3.x === 0 && t3.y === 0,
                JSON.stringify(t3));
            // vertical offset does not change tau (rigid attachment claim)
            var t3b = torqueAbout(gp3, v3(34 + 2.5, -40, 0), m3, CONST.G);
            check('T3 height-independent', Math.abs(vlen(t3b) - vlen(t3)) < 1e-9);

            // T4: damped Euler — steady state w -> tau/Cd; free decay is monotone
            var tau4 = v3(100, 0, -50), I4 = CONST.DEFAULT_I, Cd4 = 28;
            var w = v3(0, 0, 0);
            for (i = 0; i < 2000; i++) w = physStep(w, tau4, I4, Cd4, 0.005);
            check('T4 steady state', Math.abs(w.x - tau4.x / Cd4) < 1e-6 && Math.abs(w.z - tau4.z / Cd4) < 1e-6,
                'w=(' + w.x + ',' + w.z + ')');
            var prev = vlen(w), mono = true;
            for (i = 0; i < 400; i++) {
                w = physStep(w, v3(0, 0, 0), I4, Cd4, 0.005);
                var cur = vlen(w);
                if (cur > prev + 1e-12) mono = false;
                prev = cur;
            }
            check('T4 free decay monotone', mono && prev < 1e-3, 'final ' + prev);

            // T5: encoder map pinned to the page constants
            var tau5 = v3(30, 7, -40);
            var e5 = vaeMap(tau5);
            check('T5 mu pin', Math.abs(e5.mu[0] - 0.07 * 30) < 1e-12 && Math.abs(e5.mu[1] - 0.07 * -40) < 1e-12);
            check('T5 sigma pin', Math.abs(e5.sig - 0.011 * Math.sqrt(30 * 30 + 49 + 1600)) < 1e-12);

            // T6: KL — matches independent per-dimension sum; zero iff (mu=0, s=1);
            // the disclosed floor takes over below SIG_FLOOR
            function klRef(mu, s) {
                var se = Math.max(s, CONST.SIG_FLOOR), acc = 0;
                for (var j = 0; j < 2; j++) acc += 0.5 * (mu[j] * mu[j] + se * se - Math.log(se * se) - 1);
                return acc;
            }
            [[[0.3, -0.7], 0.4], [[0, 0], 1.0], [[2, 1], 2.5], [[1, 1], 0.01]].forEach(function (cfg) {
                check('T6 KL matches 2-term sum', Math.abs(klIso2(cfg[0], cfg[1]) - klRef(cfg[0], cfg[1])) < 1e-12,
                    JSON.stringify(cfg));
            });
            check('T6 KL zero at prior', klIso2([0, 0], 1.0) === 0);
            check('T6 KL positive off-prior', klIso2([0.5, 0], 1.0) > 0 && klIso2([0, 0], 0.5) > 0);
            check('T6 floor engages', isFinite(klIso2([0, 0], 0)) &&
                klIso2([0, 0], 0) === klIso2([0, 0], CONST.SIG_FLOOR));
            check('T6 monotone in |mu|', klIso2([1, 0], 1) < klIso2([2, 0], 1));

            // T7: ghost offsets — horizontal-only spec pin; seeded mean -> s_mu * mu;
            // EMA stationary std matches sqrt((1-a)/(1+a))
            var mu7 = [0.4, -0.2], sig7 = 1.5;
            check('T7 dy is zero', ghostOffset(mu7, sig7, { x: 0.7, y: -1.1 }).dy === 0);
            var randn = makeRandn(mulberry32(99));
            var ex = 0, ey = 0, N7 = 20000, sx = 0, sumx = 0;
            var mdx = 0, mdz = 0;
            var samples = [];
            for (i = 0; i < N7; i++) {
                ex = emaStep(ex, randn(), CONST.EMA_ALPHA);
                ey = emaStep(ey, randn(), CONST.EMA_ALPHA);
                if (i > 200) { // discard burn-in
                    var off = ghostOffset(mu7, sig7, { x: ex, y: ey });
                    mdx += off.dx; mdz += off.dz;
                    samples.push(ex);
                }
            }
            var n7 = N7 - 201;
            mdx /= n7; mdz /= n7;
            check('T7 mean dx -> s_mu*mu0', Math.abs(mdx - CONST.GHOST_S_MU * mu7[0]) < 0.5, 'got ' + mdx);
            check('T7 mean dz -> s_mu*mu1', Math.abs(mdz - CONST.GHOST_S_MU * mu7[1]) < 0.5, 'got ' + mdz);
            for (i = 0; i < samples.length; i++) sumx += samples[i];
            var mx7 = sumx / samples.length;
            for (i = 0; i < samples.length; i++) { var d7 = samples[i] - mx7; sx += d7 * d7; }
            var std7 = Math.sqrt(sx / samples.length);
            var stdTheory = emaStationaryStd(CONST.EMA_ALPHA);
            check('T7 EMA stationary std', Math.abs(std7 - stdTheory) < 0.05 * stdTheory,
                'got ' + std7 + ' theory ' + stdTheory);

            // T8: decision boundary — strictly greater aborts
            check('T8 above aborts', decision(1.81, 1.8) === 'ABORT');
            check('T8 at threshold lifts', decision(1.8, 1.8) === 'LIFT_OK');
            check('T8 below lifts', decision(0.4, 1.8) === 'LIFT_OK');

            // T9: grip force disclosure constant
            check('T9 grip force', Math.abs(gripForce(8, 1) - 1.6 * 8 * CONST.G) < 1e-12);

            // T10: the page's story, as tests. Default sliders (mass 8,
            // com (2,-3,1.5), thr 1.8) must ABORT; a small offset must LIFT_OK.
            var tauD = graspTorque(CONST.DEFAULT_COM, CONST.DEFAULT_MASS);
            var eD = vaeMap(tauD);
            check('T10 default sigma value', Math.abs(eD.sig - 0.011 * 8 * CONST.G * 2.5) < 1e-9,
                'got ' + eD.sig);
            check('T10 default run aborts', decision(eD.sig, CONST.DEFAULT_THR) === 'ABORT',
                'sigma=' + eD.sig);
            var tauS = graspTorque({ x: 0.5, y: -3, z: 0 }, CONST.DEFAULT_MASS);
            var eS = vaeMap(tauS);
            check('T10 small offset lifts', decision(eS.sig, CONST.DEFAULT_THR) === 'LIFT_OK',
                'sigma=' + eS.sig);
            // rot increment display gain pin
            var ri = rotIncrement(v3(0, 0, 3), 0.02);
            check('T10 rot display gain', Math.abs(ri.angle - 3 * 0.02 * CONST.ROT_DISPLAY_GAIN) < 1e-15);
        } catch (e) {
            failures.push('EXCEPTION: ' + (e && e.message ? e.message : String(e)));
        }
        return failures;
    }

    return {
        CONST: CONST,
        v3: v3, sub: sub, add: add, scale: scale, cross: cross, vlen: vlen, dist: dist,
        mulberry32: mulberry32, makeRandn: makeRandn,
        solveIK: solveIK, gripPos: gripPos,
        comWorld: comWorld, torqueAbout: torqueAbout, physStep: physStep, rotIncrement: rotIncrement,
        vaeMap: vaeMap, klIso2: klIso2, ghostOffset: ghostOffset,
        emaStep: emaStep, emaStationaryStd: emaStationaryStd,
        decision: decision, gripForce: gripForce, graspTorque: graspTorque,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = VaeCore; }

/* =========================================================================
 * [UI IIFE] 3D grasp simulation (v8.2 choreography preserved).
 * Refuses to render if VaeCore.runSelfTests() reports failures — the gate
 * runs BEFORE three.js is even fetched. All displayed/decided quantities
 * (IK, torque, dynamics, encoder map, KL, ghost offsets, abort decision)
 * are computed by VaeCore; this layer only renders them.
 * ========================================================================= */
(function () {
    'use strict';

    function init() {
        var container = document.getElementById('simulation-container');
        if (!container) return;
        if (container.dataset.vaeInit) return;   /* idempotency guard */
        container.dataset.vaeInit = '1';

        var failures = VaeCore.runSelfTests();
        if (failures.length) {
            container.innerHTML =
                '<div style="background:rgba(40,20,24,0.95);border:1px solid #ff6b5e;' +
                'border-radius:8px;padding:20px;color:#ffb3ab;font-family:monospace;font-size:0.85rem;">' +
                '<strong>Demo disabled: mathematical self-tests failed.</strong><br>' +
                '<pre style="white-space:pre-wrap;">' +
                failures.map(function (f) {
                    return f.replace(/&/g, '&amp;').replace(/</g, '&lt;');
                }).join('\n') + '</pre></div>';
            return;
        }

        var K = VaeCore.CONST;

        // ========== HTML ==========
        container.innerHTML = [
          '<div class="vr"><div class="vl">',
          '<div class="vv">',
            '<div class="vtb"><span class="vtt">PHYSICAL AI \u2014 VAE Uncertainty Simulation</span><span class="vth">Orbit: drag \u00B7 Zoom: scroll \u00B7 Pan: right-drag</span></div>',
            '<div class="vcw" id="vcw"><div id="vm"></div>',
              '<div class="vhb" id="vhb">STATE: IDLE</div>',
              '<div class="vco" id="vco"><div class="vci">\u26A0</div><div class="vct">CRITICAL UNCERTAINTY</div><div class="vcd" id="vcd">ABORTING LIFT</div></div>',
              '<div class="vso" id="vso"><div class="vsi">\u2713</div><div class="vst">LIFT SUCCESSFUL</div><div class="vsd" id="vsd">Safe \u03C3 maintained</div></div>',
            '</div>',
            '<div class="vlg">',
              '<span class="vli"><i class="vd vda"></i>Primary Arm</span>',
              '<span class="vli"><i class="vd vdg"></i>Ghost Arms (\u03C3)</span>',
              '<span class="vli"><i class="vd vdc"></i>Center of Mass</span>',
              '<span class="vli"><i class="vd vdt"></i>Torque Vector</span>',
            '</div>',
          '</div>',
          '<div class="vp">',
            '<div class="vc"><div class="vch">VAE Latent Space <em>q(z|x)</em></div><div class="vcs">Posterior from torque feedback</div><div class="vlw"><canvas id="lcv" width="260" height="260"></canvas></div>',
              '<div class="vr2"><span class="vrl">\u03BC</span><span class="vrv" id="dmu">(0.00, 0.00)</span></div>',
              '<div class="vr2"><span class="vrl">\u03C3</span><span class="vrv" id="dsig">0.000</span></div>',
              '<div class="vr2 vrh"><span class="vrl">KL(q\u2016p)</span><span class="vrv" id="dkl">0.000</span></div>',
            '</div>',
            '<div class="vc"><div class="vch">Physics Telemetry</div><div class="vtg">',
              '<div class="vte"><span class="vtl">Torque \u03C4</span><span class="vtv" id="dtau">(0, 0, 0)</span></div>',
              '<div class="vte"><span class="vtl">|\u03C4|</span><span class="vtv" id="ddt">0.000</span></div>',
              '<div class="vte"><span class="vtl">Tilt (\u00B0)</span><span class="vtv" id="dtlt">(0.0, 0.0)</span></div>',
              '<div class="vte"><span class="vtl">Grip Force</span><span class="vtv" id="dgf">0.0 N</span></div>',
            '</div></div>',
            '<div class="vc"><div class="vch">Center of Mass Offset</div><div class="vcs">From box geometric center (y is vertical)</div>',
              '<div class="vsr"><label>CoM X</label><input type="range" id="scx" min="-5" max="5" step="0.5" value="2"><span id="dcx">2.0</span></div>',
              '<div class="vsr"><label>CoM Y</label><input type="range" id="scy" min="-8" max="0" step="0.5" value="-3"><span id="dcy">-3.0</span></div>',
              '<div class="vsr"><label>CoM Z</label><input type="range" id="scz" min="-5" max="5" step="0.5" value="1.5"><span id="dcz">1.5</span></div>',
            '</div>',
            '<div class="vc"><div class="vch">Simulation Parameters</div>',
              '<div class="vsr"><label>Box Mass</label><input type="range" id="sma" min="1" max="20" step="0.5" value="8"><span id="dma">8.0 kg</span></div>',
              '<div class="vsr"><label>\u03C3 Threshold</label><input type="range" id="sth" min="0.5" max="3.0" step="0.1" value="1.8"><span id="dth">1.80</span></div>',
              '<div class="vsr"><label>Damping C_d</label><input type="range" id="sdp" min="10" max="50" step="1" value="28"><span id="ddp">28</span></div>',
            '</div>',
            '<div class="vbr"><button class="vb vbg" id="bgo">\u25B6 Execute Sequence</button><button class="vb vbs" id="brs">\u21BA Reset</button></div>',
            '<div class="vsf"><div class="vsfl">Uncertainty \u03C3</div><div class="vsft"><div class="vsfb" id="sfb"></div><div class="vsfm" id="sfm"></div></div><div class="vsfn"><span>0</span><span class="vsfc" id="sfc">0.00</span><span>3.0</span></div></div>',
          '</div>',
          '</div></div>'
        ].join('');

        // ========== CSS ==========
        if (!document.getElementById('vae-styles')) {
        var sty = document.createElement('style');
        sty.id = 'vae-styles';
        sty.textContent = [
'#simulation-container .vr{width:100%;font-family:"JetBrains Mono","Fira Code","SF Mono",monospace;color:#e8ecf1;background:#060810;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.05)}',
'#simulation-container .vl{display:flex;min-height:720px}',
'@media(max-width:1100px){#simulation-container .vl{flex-direction:column}}',
'#simulation-container .vv{flex:1 1 62%;display:flex;flex-direction:column;background:#060810}',
'#simulation-container .vtb{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.05)}',
'#simulation-container .vtt{font-size:.72rem;font-weight:700;color:#ffa726;letter-spacing:.06em}',
'#simulation-container .vth{font-size:.58rem;color:rgba(255,255,255,.24)}',
'#simulation-container .vcw{flex:1;position:relative;min-height:520px}',
'#simulation-container #vm{position:absolute;inset:0}#simulation-container #vm canvas{display:block;width:100%!important;height:100%!important}',
'#simulation-container .vhb{position:absolute;top:10px;left:10px;padding:5px 16px;border-radius:4px;font-size:.64rem;font-weight:800;letter-spacing:.14em;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.1);color:#64b4ff;backdrop-filter:blur(8px);z-index:10;pointer-events:none;transition:all .3s}',
'#simulation-container .vhb.sl{color:#ffa726;border-color:rgba(255,167,38,.4);box-shadow:0 0 20px rgba(255,167,38,.15)}',
'#simulation-container .vhb.sp{color:#26c6da;border-color:rgba(38,198,218,.4);box-shadow:0 0 20px rgba(38,198,218,.15)}',
'#simulation-container .vhb.sc{color:#ff5252;border-color:rgba(255,82,82,.5);box-shadow:0 0 24px rgba(255,82,82,.22);animation:vbp .5s ease-in-out infinite alternate}',
'#simulation-container .vhb.ss{color:#69f0ae;border-color:rgba(105,240,174,.4);box-shadow:0 0 20px rgba(105,240,174,.15)}',
'@keyframes vbp{from{opacity:.6}to{opacity:1}}',
'#simulation-container .vco{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(140,10,10,.14);backdrop-filter:blur(3px);z-index:20;pointer-events:none;opacity:0;transition:opacity .4s}',
'#simulation-container .vco.on{opacity:1}',
'#simulation-container .vci{font-size:3.4rem;color:#ff5252;animation:vcp .65s ease-in-out infinite alternate}',
'@keyframes vcp{from{transform:scale(1);opacity:.5}to{transform:scale(1.15);opacity:1}}',
'#simulation-container .vct{font-size:1.2rem;font-weight:800;color:#ff5252;letter-spacing:.16em;margin-top:5px}',
'#simulation-container .vcd{font-size:.68rem;color:rgba(255,82,82,.7);margin-top:3px}',
'#simulation-container .vso{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,140,30,.12);backdrop-filter:blur(3px);z-index:20;pointer-events:none;opacity:0;transition:opacity .4s}',
'#simulation-container .vso.on{opacity:1}',
'#simulation-container .vsi{font-size:3.4rem;color:#69f0ae;animation:vsp .65s ease-in-out infinite alternate}',
'@keyframes vsp{from{transform:scale(1);opacity:.5}to{transform:scale(1.15);opacity:1}}',
'#simulation-container .vst{font-size:1.2rem;font-weight:800;color:#69f0ae;letter-spacing:.16em;margin-top:5px}',
'#simulation-container .vsd{font-size:.68rem;color:rgba(105,240,174,.7);margin-top:3px}',
'#simulation-container .vlg{display:flex;gap:16px;padding:7px 14px;background:rgba(0,0,0,.3);border-top:1px solid rgba(255,255,255,.04);flex-wrap:wrap}',
'#simulation-container .vli{display:flex;align-items:center;gap:5px;font-size:.6rem;color:rgba(255,255,255,.38)}',
'#simulation-container .vd{display:inline-block;width:8px;height:8px;border-radius:2px}',
'#simulation-container .vda{background:#8a9aaa}#simulation-container .vdg{background:rgba(255,167,38,.5)}#simulation-container .vdc{background:#ff5252}#simulation-container .vdt{background:#69f0ae}',
'#simulation-container .vp{flex:0 0 330px;max-width:330px;display:flex;flex-direction:column;gap:8px;padding:10px;background:rgba(10,14,22,.97);border-left:1px solid rgba(255,255,255,.04);overflow-y:auto;max-height:810px}',
'@media(max-width:1100px){#simulation-container .vp{flex:none;max-width:none;max-height:none;border-left:none;border-top:1px solid rgba(255,255,255,.04);display:grid;grid-template-columns:1fr 1fr;gap:8px}}',
'#simulation-container .vc{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.055);border-radius:8px;padding:10px 12px}',
'#simulation-container .vch{font-weight:700;font-size:.76rem;color:rgba(255,255,255,.8);margin-bottom:1px}#simulation-container .vch em{font-style:normal;color:#ffa726}',
'#simulation-container .vcs{font-size:.58rem;color:rgba(255,255,255,.28);margin-bottom:7px}',
'#simulation-container .vlw{display:flex;justify-content:center;margin:5px 0}',
'#simulation-container #lcv{border-radius:6px;border:1px solid rgba(255,255,255,.06);background:#040608}',
'#simulation-container .vr2{display:flex;justify-content:space-between;font-size:.7rem;padding:1px 0}',
'#simulation-container .vrl{color:rgba(255,255,255,.35)}#simulation-container .vrv{font-family:"JetBrains Mono",monospace;color:#64b4ff}#simulation-container .vrh .vrv{color:#ffa726}',
'#simulation-container .vtg{display:grid;grid-template-columns:1fr 1fr;gap:5px}',
'#simulation-container .vte{background:rgba(0,0,0,.25);border-radius:4px;padding:5px 7px}',
'#simulation-container .vtl{display:block;font-size:.54rem;color:rgba(255,255,255,.3);margin-bottom:1px}',
'#simulation-container .vtv{font-size:.68rem;color:#69f0ae;font-family:"JetBrains Mono",monospace}',
'#simulation-container .vsr{display:flex;align-items:center;gap:7px;margin-bottom:4px}',
'#simulation-container .vsr label{width:72px;font-size:.66rem;color:rgba(255,255,255,.42);flex-shrink:0}',
'#simulation-container .vsr input[type=range]{flex:1;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.06);height:5px;border-radius:3px;cursor:pointer;outline:none}',
'#simulation-container .vsr input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:#ef6c00;border-radius:50%;cursor:pointer;transition:transform .12s}',
'#simulation-container .vsr input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.3)}',
'#simulation-container .vsr input[type=range]::-moz-range-thumb{width:13px;height:13px;background:#ef6c00;border-radius:50%;border:none;cursor:pointer}',
'#simulation-container .vsr span{width:52px;text-align:right;font-size:.66rem;color:#ffa726;font-family:"JetBrains Mono",monospace;flex-shrink:0}',
'#simulation-container .vbr{display:flex;gap:7px}',
'#simulation-container .vb{flex:1;padding:10px;border:none;border-radius:6px;font-weight:700;font-family:inherit;font-size:.74rem;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:5px}',
'#simulation-container .vbg{background:linear-gradient(135deg,#ef6c00,#ff9800);color:#fff}',
'#simulation-container .vbg:hover{box-shadow:0 4px 18px rgba(239,108,0,.3);transform:translateY(-1px)}',
'#simulation-container .vbg:disabled{opacity:.32;cursor:not-allowed;transform:none;box-shadow:none}',
'#simulation-container .vbs{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6)}',
'#simulation-container .vbs:hover{background:rgba(255,255,255,.09);color:#fff}',
'#simulation-container .vsf{padding:6px 0}#simulation-container .vsfl{font-size:.6rem;color:rgba(255,255,255,.32);margin-bottom:3px}',
'#simulation-container .vsft{position:relative;height:7px;background:rgba(255,255,255,.04);border-radius:4px;overflow:visible}',
'#simulation-container .vsfb{height:100%;border-radius:4px;background:linear-gradient(90deg,#69f0ae,#ffa726,#ff5252);width:0%;transition:width .12s}',
'#simulation-container .vsfm{position:absolute;top:-3px;width:2px;height:13px;background:#ff5252;border-radius:1px;left:60%;transition:left .12s}',
'#simulation-container .vsfn{display:flex;justify-content:space-between;font-size:.54rem;color:rgba(255,255,255,.22);margin-top:2px}',
'#simulation-container .vsfc{color:#ffa726;font-weight:700}'
        ].join('\n');
        document.head.appendChild(sty);
        }

        // ========== LOAD THREE.JS (after the gate) ==========
        if (!window.THREE) {
            var scr = document.createElement('script');
            scr.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            scr.onload = function () {
                var oc = document.createElement('script');
                oc.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                oc.onload = boot; document.head.appendChild(oc);
            }; document.head.appendChild(scr);
        } else if (!window.THREE.OrbitControls) {
            var oc2 = document.createElement('script');
            oc2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
            oc2.onload = boot; document.head.appendChild(oc2);
        } else { boot(); }

        function boot() {
            if (!window.THREE || !THREE.OrbitControls) { setTimeout(boot, 80); return; }

            // === DOM ===
            var mt=document.getElementById('vm'),badge=document.getElementById('vhb'),
                critO=document.getElementById('vco'),critD=document.getElementById('vcd'),
                succO=document.getElementById('vso'),succD=document.getElementById('vsd'),
                lcv=document.getElementById('lcv'),lx=lcv.getContext('2d');
            var $mu=document.getElementById('dmu'),$si=document.getElementById('dsig'),
                $kl=document.getElementById('dkl'),$ta=document.getElementById('dtau'),
                $dt=document.getElementById('ddt'),$ti=document.getElementById('dtlt'),
                $gf=document.getElementById('dgf'),$fb=document.getElementById('sfb'),
                $fm=document.getElementById('sfm'),$fc=document.getElementById('sfc');
            var bGo=document.getElementById('bgo'),bRs=document.getElementById('brs');

            // === CONSTANTS (math constants come from VaeCore.CONST) ===
            var BW=K.BW,BH=K.BH,BD=K.BD;
            var BP=new THREE.Vector3(K.BP.x,K.BP.y,K.BP.z);
            var LR=2.0,JR=2.5;
            // vacuum gripper (v11): 4-cup suction manifold, warehouse style.
            // TOTAL HEIGHT = SHAFT_H + HOUS_H + PLATE_H + CUP_H
            //             = 0.75 + 1.5 + 0.8 + 1.2 = 4.25 = GRIP_Y - BH exactly,
            // so the cup faces touch the box top at GRASP and every CONST /
            // waypoint / certificate is untouched. Only heights are constrained;
            // radii are free, so the assembly is sized to read against the box.
            var SHAFT_H=0.75, SHAFT_R=1.0;
            var HOUS_H=1.5, HOUS_R=2.2;
            var PLATE_H=0.8, PLATE_W=7;
            var CUP_H=1.2, CUP_R=1.4, CUP_OFF=2.2;
            var SP_OPEN=BD+12, SP_CLOSED=BD+1.8; // retained: drives bellows compression only
            var NG=K.NG;
            var PRE_LIFT_H=K.PRE_LIFT_H, PRE_LIFT_WAIT=0.5;

            function tv(p){return new THREE.Vector3(p.x,p.y,p.z);}

            // === STATES ===
            var ST={IDLE:0,APPROACH:1,DESCEND:2,GRASP:3,PRE_LIFT:4,LIFT_OK:5,ABORT:6,DONE:7};
            var STN=['IDLE','APPROACH','DESCEND','GRASP','PRE_LIFT','LIFT_OK','ABORT','DONE'];
            var state=ST.IDLE,stT=0,running=false;

            // === PHYSICS STATE ===
            var P={I:K.DEFAULT_I,Cd:K.DEFAULT_CD,mass:K.DEFAULT_MASS,
                com:{x:K.DEFAULT_COM.x,y:K.DEFAULT_COM.y,z:K.DEFAULT_COM.z},
                tau:{x:0,y:0,z:0},av:{x:0,y:0,z:0},
                tQ:new THREE.Quaternion(),gF:0,lH:0,det:false};

            // === VAE STATE (seeded) ===
            var randn=VaeCore.makeRandn(VaeCore.mulberry32(2026));
            var V={mu:[0,0],sig:0,kl:0,hist:[],eps:[],thr:K.DEFAULT_THR};
            for(var i=0;i<NG;i++)V.eps.push({x:0,y:0});
            var vSnap=null;

            var eeT=tv(K.HOME);
            var gSp=SP_OPEN;
            var boxAttached=false;
            var boxGripOff=new THREE.Vector3();

            var HOME=tv(K.HOME), HOVER=tv(K.HOVER), BOX_TOP_PT=tv(K.BOX_TOP);
            var GRASP_WRIST_Y=K.GRIP_Y;

            // === THREE.JS SCENE (v8.2 verbatim) ===
            var W=mt.clientWidth||800,H=Math.max(mt.clientHeight||520,480);
            var scene=new THREE.Scene();
            scene.background=new THREE.Color(0x050710);
            scene.fog=new THREE.FogExp2(0x050710,0.002);
            var cam=new THREE.PerspectiveCamera(46,W/H,0.5,500);
            cam.position.set(60,48,55);
            var ren=new THREE.WebGLRenderer({antialias:true});
            ren.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
            ren.setSize(W,H);
            ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;
            ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.15;
            mt.appendChild(ren.domElement);
            var orb=new THREE.OrbitControls(cam,ren.domElement);
            orb.enableDamping=true;orb.dampingFactor=0.07;
            orb.target.set(16,14,0);orb.minDistance=25;orb.maxDistance=170;orb.update();

            scene.add(new THREE.AmbientLight(0x2a2a44,0.45));
            var dL=new THREE.DirectionalLight(0xffeedd,1.1);
            dL.position.set(30,70,50);dL.castShadow=true;
            dL.shadow.mapSize.set(1024,1024);
            dL.shadow.camera.left=-60;dL.shadow.camera.right=60;
            dL.shadow.camera.top=60;dL.shadow.camera.bottom=-60;
            dL.shadow.camera.near=1;dL.shadow.camera.far=180;scene.add(dL);
            var fL=new THREE.DirectionalLight(0x6680bb,0.28);fL.position.set(-30,25,-25);scene.add(fL);
            var rL=new THREE.PointLight(0xff7700,0.4,140);rL.position.set(-20,50,40);scene.add(rL);
            var bL=new THREE.PointLight(0x2266ff,0.2,100);bL.position.set(40,30,-30);scene.add(bL);

            var gnd=new THREE.Mesh(new THREE.PlaneGeometry(240,240),
                new THREE.MeshStandardMaterial({color:0x10141c,roughness:0.94,metalness:0.06}));
            gnd.rotation.x=-Math.PI/2;gnd.position.y=-0.1;gnd.receiveShadow=true;scene.add(gnd);
            scene.add(new THREE.GridHelper(130,26,0x1c2030,0x141820));

            var mM=new THREE.MeshStandardMaterial({color:0x3e4856,metalness:0.92,roughness:0.18});
            var mJ=new THREE.MeshStandardMaterial({color:0x2e3640,metalness:0.95,roughness:0.14});
            var mG=new THREE.MeshStandardMaterial({color:0x586878,metalness:0.88,roughness:0.2});
            var mBx=new THREE.MeshStandardMaterial({color:0x1e3a6a,transparent:true,opacity:0.38,roughness:0.45,metalness:0.12,side:THREE.DoubleSide});
            var mEd=new THREE.LineBasicMaterial({color:0x4488cc,transparent:true,opacity:0.5});
            var mCm=new THREE.MeshStandardMaterial({color:0xff1a1a,emissive:0xff0808,emissiveIntensity:0.8});
            function gM(){return new THREE.MeshStandardMaterial({color:0xff9800,metalness:0.2,roughness:0.5,transparent:true,opacity:0,depthWrite:false});}

            // === PRIMARY ARM ===
            var arm=new THREE.Group();scene.add(arm);
            var ped=new THREE.Mesh(new THREE.CylinderGeometry(6,7.8,3.5,32),mJ);
            ped.position.set(0,1.75,0);ped.castShadow=true;arm.add(ped);
            var bRng=new THREE.Mesh(new THREE.CylinderGeometry(8,8,0.5,32),mM);
            bRng.position.set(0,0.25,0);bRng.castShadow=true;arm.add(bRng);
            var j0=new THREE.Mesh(new THREE.SphereGeometry(JR,28,28),mJ);
            j0.position.set(0,3.5,0);j0.castShadow=true;arm.add(j0);
            var l1=new THREE.Mesh(new THREE.CylinderGeometry(LR,LR,1,20),mM);
            l1.castShadow=true;arm.add(l1);
            var j1=new THREE.Mesh(new THREE.SphereGeometry(JR,28,28),mJ);
            j1.castShadow=true;arm.add(j1);
            var l2=new THREE.Mesh(new THREE.CylinderGeometry(LR*0.85,LR,1,20),mM);
            l2.castShadow=true;arm.add(l2);
            var j2=new THREE.Mesh(new THREE.SphereGeometry(JR*0.75,24,24),mJ);
            j2.castShadow=true;arm.add(j2);
            var conn=new THREE.Mesh(new THREE.CylinderGeometry(LR*0.9,LR*0.9,1,14),mM);
            conn.castShadow=true;arm.add(conn);
            var mGB=new THREE.MeshStandardMaterial({color:0x8494a8,metalness:0.65,roughness:0.3});
            var mCup=new THREE.MeshStandardMaterial({color:0x37424e,metalness:0.05,roughness:0.9});
            var shaft=new THREE.Mesh(new THREE.CylinderGeometry(SHAFT_R,SHAFT_R,SHAFT_H,14),mGB);
            shaft.castShadow=true;arm.add(shaft);
            var hous=new THREE.Mesh(new THREE.CylinderGeometry(HOUS_R,HOUS_R*0.9,HOUS_H,20),mGB);
            hous.castShadow=true;arm.add(hous);
            var plate=new THREE.Mesh(new THREE.BoxGeometry(PLATE_W,PLATE_H,PLATE_W),mGB);
            plate.castShadow=true;arm.add(plate);
            var cups=[];
            for(var ci=0;ci<4;ci++){
                var cup=new THREE.Mesh(new THREE.CylinderGeometry(CUP_R*0.6,CUP_R,CUP_H,18),mCup);
                cup.castShadow=true;arm.add(cup);cups.push(cup);
            }

            // === GHOST ARMS ===
            var ghosts=[];
            for(var gi=0;gi<NG;gi++){
                var gg={l1:new THREE.Mesh(new THREE.CylinderGeometry(LR,LR,1,10),gM()),
                    j1:new THREE.Mesh(new THREE.SphereGeometry(JR,14,14),gM()),
                    l2:new THREE.Mesh(new THREE.CylinderGeometry(LR*0.85,LR,1,10),gM()),
                    j2:new THREE.Mesh(new THREE.SphereGeometry(JR*0.75,14,14),gM()),
                    conn:new THREE.Mesh(new THREE.CylinderGeometry(LR*0.7,LR*0.7,1,8),gM()),
                    shaft:new THREE.Mesh(new THREE.CylinderGeometry(SHAFT_R,SHAFT_R,SHAFT_H,8),gM()),
                    hous:new THREE.Mesh(new THREE.CylinderGeometry(HOUS_R,HOUS_R*0.9,HOUS_H,10),gM()),
                    plate:new THREE.Mesh(new THREE.BoxGeometry(PLATE_W,PLATE_H,PLATE_W),gM()),
                    cups:[new THREE.Mesh(new THREE.CylinderGeometry(CUP_R*0.6,CUP_R,CUP_H,10),gM()),
                        new THREE.Mesh(new THREE.CylinderGeometry(CUP_R*0.6,CUP_R,CUP_H,10),gM()),
                        new THREE.Mesh(new THREE.CylinderGeometry(CUP_R*0.6,CUP_R,CUP_H,10),gM()),
                        new THREE.Mesh(new THREE.CylinderGeometry(CUP_R*0.6,CUP_R,CUP_H,10),gM())]};
                gg.parts=[gg.l1,gg.j1,gg.l2,gg.j2,gg.conn,gg.shaft,gg.hous,gg.plate,
                    gg.cups[0],gg.cups[1],gg.cups[2],gg.cups[3]];
                gg.parts.forEach(function(p){p.visible=false;scene.add(p);});
                ghosts.push(gg);
            }

            // === BOX ===
            var bxG=new THREE.Group();bxG.position.copy(BP);scene.add(bxG);
            var bxM=new THREE.Mesh(new THREE.BoxGeometry(BW,BH,BD),mBx);
            bxM.position.y=BH/2;bxM.castShadow=true;bxG.add(bxM);
            var bxE=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW,BH,BD)),mEd);
            bxE.position.y=BH/2;bxG.add(bxE);
            var cS=new THREE.Mesh(new THREE.SphereGeometry(1.6,22,22),mCm);
            function syncCoM(){cS.position.set(P.com.x,BH/2+P.com.y,P.com.z);}
            syncCoM();bxG.add(cS);
            var cR=new THREE.Mesh(new THREE.RingGeometry(2.2,2.9,32),
                new THREE.MeshBasicMaterial({color:0xff3333,transparent:true,opacity:0.2,side:THREE.DoubleSide}));
            cR.position.copy(cS.position);bxG.add(cR);
            var tArr=null;

            // === POSE HELPERS (IK math lives in VaeCore) ===
            function posC(m,a,b){
                m.position.copy(a.clone().add(b).multiplyScalar(0.5));
                m.scale.set(1,a.distanceTo(b),1);
                m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
            }
            function solveIK3(tgt){
                var s=VaeCore.solveIK(tgt);
                return {base:tv(s.base),elbow:tv(s.elbow),wrist:tv(s.wrist),clamped:s.clamped};
            }
            function gripPos3(ik){ return tv(VaeCore.gripPos(ik.wrist)); }
            function poseArm(ik,sp){
                posC(l1,ik.base,ik.elbow); j1.position.copy(ik.elbow);
                posC(l2,ik.elbow,ik.wrist); j2.position.copy(ik.wrist);
                var gp=gripPos3(ik);
                posC(conn,ik.wrist,gp);
                // sp in [SP_CLOSED, SP_OPEN] -> cup compression c in [0.72, 1]
                var c=0.72+0.28*Math.min(1,Math.max(0,(sp-SP_CLOSED)/(SP_OPEN-SP_CLOSED)));
                var cupH=CUP_H*c, drop=SHAFT_H+HOUS_H+PLATE_H+CUP_H;
                shaft.position.set(gp.x, gp.y-SHAFT_H/2, gp.z); shaft.quaternion.identity();
                hous.position.set(gp.x, gp.y-SHAFT_H-HOUS_H/2, gp.z); hous.quaternion.identity();
                plate.position.set(gp.x, gp.y-SHAFT_H-HOUS_H-PLATE_H/2, gp.z); plate.quaternion.identity();
                for(var qi=0;qi<4;qi++){
                    var ox=(qi<2?-1:1)*CUP_OFF, oz=(qi%2===0?-1:1)*CUP_OFF;
                    cups[qi].scale.set(1,c,1);
                    cups[qi].position.set(gp.x+ox, gp.y-drop+cupH/2, gp.z+oz);
                    cups[qi].quaternion.identity();
                }
            }
            function poseGh(g,ik,sp,op){
                posC(g.l1,ik.base,ik.elbow); g.j1.position.copy(ik.elbow);
                posC(g.l2,ik.elbow,ik.wrist); g.j2.position.copy(ik.wrist);
                var gp=gripPos3(ik);
                posC(g.conn,ik.wrist,gp);
                var c=0.72+0.28*Math.min(1,Math.max(0,(sp-SP_CLOSED)/(SP_OPEN-SP_CLOSED)));
                var cupH=CUP_H*c, drop=SHAFT_H+HOUS_H+PLATE_H+CUP_H;
                g.shaft.position.set(gp.x,gp.y-SHAFT_H/2,gp.z); g.shaft.quaternion.identity();
                g.hous.position.set(gp.x,gp.y-SHAFT_H-HOUS_H/2,gp.z); g.hous.quaternion.identity();
                g.plate.position.set(gp.x,gp.y-SHAFT_H-HOUS_H-PLATE_H/2,gp.z); g.plate.quaternion.identity();
                for(var qi=0;qi<4;qi++){
                    var ox=(qi<2?-1:1)*CUP_OFF, oz=(qi%2===0?-1:1)*CUP_OFF;
                    g.cups[qi].scale.set(1,c,1);
                    g.cups[qi].position.set(gp.x+ox,gp.y-drop+cupH/2,gp.z+oz);
                    g.cups[qi].quaternion.identity();
                }
                g.parts.forEach(function(p){p.visible=true;p.material.opacity=op;});
            }
            function hideGh(g){g.parts.forEach(function(p){p.visible=false;});}

            // === PHYSICS / VAE (all math via VaeCore) ===
            function stepPhysAndPose(dt,gp){
                var comW=VaeCore.comWorld(bxG.position,P.com);
                P.tau=VaeCore.torqueAbout({x:gp.x,y:gp.y,z:gp.z},comW,P.mass,K.G);
                if(P.det){
                    P.av=VaeCore.physStep(P.av,P.tau,P.I,P.Cd,dt);
                    var ri=VaeCore.rotIncrement(P.av,dt);
                    if(ri.angle>1e-9){
                        P.tQ.multiply(new THREE.Quaternion().setFromAxisAngle(tv(ri.axis),ri.angle)).normalize();
                    }
                }
            }
            function stepVAE(){
                var e=VaeCore.vaeMap(P.tau);
                V.mu=e.mu;V.sig=e.sig;
                for(var i=0;i<NG;i++){
                    V.eps[i].x=VaeCore.emaStep(V.eps[i].x,randn(),K.EMA_ALPHA);
                    V.eps[i].y=VaeCore.emaStep(V.eps[i].y,randn(),K.EMA_ALPHA);
                }
                V.kl=VaeCore.klIso2(V.mu,V.sig);
                V.hist.push([V.mu[0],V.mu[1],V.sig]);if(V.hist.length>250)V.hist.shift();
            }
            function showTA(tauScaled){
                if(tArr){bxG.remove(tArr);tArr=null;}
                var len=tauScaled.length();if(len<0.05)return;
                var al=Math.min(len*1.8,28);
                tArr=new THREE.ArrowHelper(tauScaled.clone().normalize(),new THREE.Vector3(0,BH,0),al,0x69f0ae,al*0.18,al*0.09);
                bxG.add(tArr);
            }
            function doGhosts(){
                for(var i=0;i<NG;i++){
                    var off=VaeCore.ghostOffset(V.mu,V.sig,V.eps[i]);
                    var gt=eeT.clone();gt.x+=off.dx;gt.y+=off.dy;gt.z+=off.dz;
                    poseGh(ghosts[i],solveIK3(gt),gSp,Math.min(0.24,V.sig*0.15));
                }
            }

            // === LIFT FRAME: rigid parenting ===
            function doLiftFrame(dt){
                var ik=solveIK3(eeT);
                var gp=gripPos3(ik);
                bxG.position.set(gp.x+boxGripOff.x,gp.y+boxGripOff.y,gp.z+boxGripOff.z);
                stepPhysAndPose(dt,gp);
                bxG.quaternion.copy(P.tQ);
                showTA(tv(P.tau).multiplyScalar(0.0015));
                stepVAE();
                doGhosts();
            }

            // === STATE MACHINE (v8.2 choreography; lift cap now within IK reach) ===
            function sm(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
            function lr(a,b,t){return a+(b-a)*t;}

            function tickSt(dt){
                stT+=dt;var t=stT;
                switch(state){
                case ST.IDLE:
                    eeT.copy(HOME);gSp=SP_OPEN;break;

                case ST.APPROACH:{
                    var d=1.6,s=sm(t/d);
                    eeT.set(lr(HOME.x,HOVER.x,s),lr(HOME.y,HOVER.y,s),lr(HOME.z,HOVER.z,s));
                    gSp=SP_OPEN;
                    if(t>=d)setSt(ST.DESCEND);break;}

                case ST.DESCEND:{
                    var d=1.3,s=sm(t/d);
                    var rawY=lr(HOVER.y,BOX_TOP_PT.y,s);
                    eeT.set(BP.x+K.WRIST_X_OFF, Math.max(rawY,GRASP_WRIST_Y), BP.z);
                    gSp=SP_OPEN;
                    if(t>=d)setSt(ST.GRASP);break;}

                case ST.GRASP:{
                    var d=1.0,s=sm(t/d);
                    eeT.copy(BOX_TOP_PT);
                    var raw=lr(SP_OPEN,SP_CLOSED,s);
                    gSp=Math.max(raw,SP_CLOSED);
                    P.gF=VaeCore.gripForce(P.mass,s);
                    if(t>=d){
                        var ik=solveIK3(eeT);
                        var gp=gripPos3(ik);
                        // suction (v11): exact contact -- cup faces sit on the box
                        // top, so the carry offset is the raw grasp-time offset.
                        // (The finger-era EPS_GAP seating clearance is gone.)
                        boxGripOff.copy(BP).sub(gp);
                        boxAttached=true;
                        setSt(ST.PRE_LIFT);
                    }break;}

                case ST.PRE_LIFT:{
                    var liftPhase=Math.min(t,0.4);
                    var liftS=sm(liftPhase/0.4);
                    P.lH=PRE_LIFT_H*liftS;
                    eeT.set(BP.x+K.WRIST_X_OFF, GRASP_WRIST_Y+P.lH, BP.z);
                    gSp=SP_CLOSED;
                    if(t>0.12&&!P.det) P.det=true;
                    if(P.det) doLiftFrame(dt);
                    if(t>=0.4+PRE_LIFT_WAIT){
                        if(VaeCore.decision(V.sig,V.thr)==='ABORT') setSt(ST.ABORT);
                        else setSt(ST.LIFT_OK);
                    }break;}

                case ST.LIFT_OK:{
                    var speed=14;
                    P.lH=PRE_LIFT_H+speed*t;
                    if(P.lH>K.LIFT_MAX)P.lH=K.LIFT_MAX;
                    eeT.set(BP.x+K.WRIST_X_OFF, GRASP_WRIST_Y+P.lH, BP.z);
                    gSp=SP_CLOSED;
                    doLiftFrame(dt);
                    if(VaeCore.decision(V.sig,V.thr)==='ABORT'){setSt(ST.ABORT);break;}
                    if(P.lH>=K.LIFT_MAX){
                        P.det=false;P.av={x:0,y:0,z:0};
                        var ik=solveIK3(eeT);var gp=gripPos3(ik);
                        bxG.position.set(gp.x+boxGripOff.x,gp.y+boxGripOff.y,gp.z+boxGripOff.z);
                        vSnap={mu:[V.mu[0],V.mu[1]],sig:V.sig,kl:V.kl,eps:V.eps.map(function(e){return{x:e.x,y:e.y};})};
                        succO.classList.add('on');
                        succD.textContent='LIFT COMPLETE \u2014 \u03C3 = '+V.sig.toFixed(3)+' < threshold '+V.thr.toFixed(2);
                        setSt(ST.DONE);
                    }
                    break;}

                case ST.ABORT:{
                    var d=2.8;
                    if(t<1.2){
                        var ls=sm(t/1.2);
                        P.lH=Math.max(0,P.lH*(1-ls));
                        eeT.set(BP.x+K.WRIST_X_OFF,GRASP_WRIST_Y+P.lH,BP.z);
                        gSp=SP_CLOSED;
                        if(P.det) doLiftFrame(dt);
                        ghosts.forEach(function(g){g.parts.forEach(function(p){p.material.opacity*=0.92;});});
                    } else if(t<1.8){
                        var rs=sm((t-1.2)/0.6);
                        gSp=lr(SP_CLOSED,SP_OPEN,rs);
                        eeT.set(BP.x+K.WRIST_X_OFF,GRASP_WRIST_Y+2,BP.z);
                        if(boxAttached){
                            boxAttached=false;P.det=false;
                            bxG.position.copy(BP);bxG.quaternion.identity();
                            P.tau={x:0,y:0,z:0};P.av={x:0,y:0,z:0};P.tQ.identity();
                        }
                        ghosts.forEach(hideGh);
                    } else {
                        var hs=sm((t-1.8)/1.0);
                        eeT.set(lr(BP.x+K.WRIST_X_OFF,HOME.x,hs),lr(GRASP_WRIST_Y+2,HOME.y,hs),lr(BP.z,HOME.z,hs));
                        gSp=SP_OPEN;
                    }
                    if(t>=d){
                        P.det=false;P.av={x:0,y:0,z:0};P.tau={x:0,y:0,z:0};
                        bxG.position.copy(BP);bxG.quaternion.identity();
                        setSt(ST.DONE);
                    }
                    break;}

                case ST.DONE:
                    break;
                }
            }

            function setSt(s){
                state=s;stT=0;
                if(s===ST.ABORT){
                    critO.classList.add('on');
                    critD.textContent='ABORTING LIFT \u2014 \u03C3 = '+V.sig.toFixed(3)+' > threshold '+V.thr.toFixed(2);
                    vSnap={mu:[V.mu[0],V.mu[1]],sig:V.sig,kl:V.kl,eps:V.eps.map(function(e){return{x:e.x,y:e.y};})};
                } else if(s!==ST.DONE) {
                    critO.classList.remove('on');
                }
                if(s===ST.DONE){
                    running=false;bGo.disabled=true;
                    if(vSnap){V.mu=[vSnap.mu[0],vSnap.mu[1]];V.sig=vSnap.sig;V.kl=vSnap.kl;
                        for(var i=0;i<NG&&i<vSnap.eps.length;i++){V.eps[i]={x:vSnap.eps[i].x,y:vSnap.eps[i].y};}}
                }
                if(s===ST.IDLE){running=false;bGo.disabled=false;ghosts.forEach(hideGh);}
            }

            function softReset(){
                P.tau={x:0,y:0,z:0};P.av={x:0,y:0,z:0};P.tQ.identity();
                P.gF=0;P.lH=0;P.det=false;
                V.mu=[0,0];V.sig=0;V.kl=0;V.hist=[];
                for(var i=0;i<NG;i++)V.eps[i]={x:0,y:0};
                randn=VaeCore.makeRandn(VaeCore.mulberry32(2026));
                bxG.position.copy(BP);bxG.quaternion.identity();
                boxAttached=false;boxGripOff.set(0,0,0);
                eeT.copy(HOME);gSp=SP_OPEN;
                vSnap=null;
                ghosts.forEach(hideGh);
                if(tArr){bxG.remove(tArr);tArr=null;}
                critO.classList.remove('on');
                succO.classList.remove('on');
            }

            function fullReset(){
                softReset();
                var sliderDefaults={scx:'2',scy:'-3',scz:'1.5',sma:'8',sth:'1.8',sdp:'28'};
                for(var sid in sliderDefaults){
                    var sl=document.getElementById(sid);
                    if(sl){sl.value=sliderDefaults[sid];sl.dispatchEvent(new Event('input'));}
                }
                lx.fillStyle='#040608';lx.fillRect(0,0,lcv.width,lcv.height);
            }

            // === LATENT SPACE CANVAS ===
            // Scale fits |mu| + sigma as well as the threshold: positions and
            // radii are all TRUE — v8.2's mu-position clamp is removed.
            function drawLat(){
                var w=lcv.width,h=lcv.height,cx=w/2,cy=h/2;
                var muN=Math.sqrt(V.mu[0]*V.mu[0]+V.mu[1]*V.mu[1]);
                var refMax=Math.max(3.0,V.sig,muN+V.sig,V.thr);
                var sc=(w/2*0.4)/refMax;
                if(state===ST.DONE){lx.fillStyle='#040608';} else {lx.fillStyle='rgba(4,6,8,.14)';}
                lx.fillRect(0,0,w,h);
                var gridStep=Math.max(1,Math.round(refMax/3));
                lx.strokeStyle='rgba(255,255,255,.025)';lx.lineWidth=0.5;
                for(var i=-5;i<=5;i++){var gv=i*gridStep;var px=cx+gv*sc;var py=cy-gv*sc;
                    if(px>0&&px<w){lx.beginPath();lx.moveTo(px,0);lx.lineTo(px,h);lx.stroke();}
                    if(py>0&&py<h){lx.beginPath();lx.moveTo(0,py);lx.lineTo(w,py);lx.stroke();}}
                lx.strokeStyle='rgba(255,255,255,.08)';lx.lineWidth=1;
                lx.beginPath();lx.moveTo(cx,0);lx.lineTo(cx,h);lx.stroke();
                lx.beginPath();lx.moveTo(0,cy);lx.lineTo(w,cy);lx.stroke();
                var thrR=V.thr*sc;
                lx.strokeStyle='rgba(255,82,82,.35)';lx.lineWidth=1.5;
                lx.setLineDash([4,4]);lx.beginPath();lx.arc(cx,cy,thrR,0,Math.PI*2);lx.stroke();lx.setLineDash([]);
                if(V.sig>0.008){
                    var sr=V.sig*sc;
                    var mx=cx+V.mu[0]*sc, my=cy-V.mu[1]*sc;
                    var gr=lx.createRadialGradient(mx,my,0,mx,my,sr*2.2);
                    gr.addColorStop(0,'rgba(255,152,0,.24)');gr.addColorStop(0.5,'rgba(255,152,0,.06)');gr.addColorStop(1,'rgba(255,152,0,0)');
                    lx.fillStyle=gr;lx.beginPath();lx.arc(mx,my,sr*2.2,0,Math.PI*2);lx.fill();
                    lx.strokeStyle='rgba(255,167,38,.5)';lx.lineWidth=1.4;
                    lx.beginPath();lx.arc(mx,my,sr,0,Math.PI*2);lx.stroke();
                    lx.fillStyle='rgba(255,167,38,.6)';
                    for(var i=0;i<NG;i++){lx.beginPath();lx.arc(mx+V.eps[i].x*sr,my-V.eps[i].y*sr,2.4,0,Math.PI*2);lx.fill();}
                    lx.fillStyle='#ff9800';lx.beginPath();lx.arc(mx,my,3.5,0,Math.PI*2);lx.fill();
                }
                lx.fillStyle='rgba(100,180,255,.35)';lx.beginPath();lx.arc(cx,cy,2.8,0,Math.PI*2);lx.fill();
                if(V.hist.length>2){
                    lx.strokeStyle='rgba(255,167,38,.1)';lx.lineWidth=1;lx.beginPath();
                    for(var i=0;i<V.hist.length;i++){var hx=cx+V.hist[i][0]*sc,hy=cy-V.hist[i][1]*sc;i===0?lx.moveTo(hx,hy):lx.lineTo(hx,hy);}
                    lx.stroke();}
                lx.fillStyle='rgba(255,255,255,.22)';lx.font='9px JetBrains Mono,monospace';
                lx.fillText('z\u2081',w-18,cy-4);lx.fillText('z\u2082',cx+5,12);
            }

            // === UI ===
            function updUI(){
                $mu.textContent='('+V.mu[0].toFixed(3)+', '+V.mu[1].toFixed(3)+')';
                $si.textContent=V.sig.toFixed(3);
                $kl.textContent=(V.kl||0).toFixed(3);
                $ta.textContent='('+P.tau.x.toFixed(1)+', '+P.tau.y.toFixed(1)+', '+P.tau.z.toFixed(1)+')';
                $dt.textContent=VaeCore.vlen(P.tau).toFixed(3);
                var eu=new THREE.Euler().setFromQuaternion(P.tQ);
                $ti.textContent='('+(eu.x*180/Math.PI).toFixed(1)+', '+(eu.z*180/Math.PI).toFixed(1)+')';
                $gf.textContent=P.gF.toFixed(1)+' N';
                $fb.style.width=Math.min(V.sig/3,1)*100+'%';
                $fc.textContent=V.sig.toFixed(2);
                $fm.style.left=Math.min(V.thr/3,1)*100+'%';
                badge.textContent='STATE: '+STN[state];
                badge.className='vhb';
                if(state===ST.PRE_LIFT)badge.classList.add('sp');
                else if(state===ST.LIFT_OK)badge.classList.add('ss');
                else if(state===ST.ABORT)badge.classList.add('sc');
                else if(state===ST.DONE){badge.classList.add(succO.classList.contains('on')?'ss':'sc');}
                else if(state===ST.GRASP||state===ST.DESCEND)badge.classList.add('sl');
            }

            // === SLIDERS ===
            function bn(sid,did,fmt,cb){
                var sl=document.getElementById(sid),sp=document.getElementById(did);
                var f=function(){var v=parseFloat(sl.value);sp.textContent=fmt(v);cb(v);};
                sl.addEventListener('input',f);f();
            }
            bn('scx','dcx',function(v){return v.toFixed(1);},function(v){P.com.x=v;syncCoM();cR.position.copy(cS.position);});
            bn('scy','dcy',function(v){return v.toFixed(1);},function(v){P.com.y=v;syncCoM();cR.position.copy(cS.position);});
            bn('scz','dcz',function(v){return v.toFixed(1);},function(v){P.com.z=v;syncCoM();cR.position.copy(cS.position);});
            bn('sma','dma',function(v){return v.toFixed(1)+' kg';},function(v){P.mass=v;});
            bn('sth','dth',function(v){return v.toFixed(2);},function(v){V.thr=v;drawLat();});
            bn('sdp','ddp',function(v){return ''+v;},function(v){P.Cd=v;});

            // === BUTTONS ===
            bGo.addEventListener('click',function(){
                if(running)return;running=true;bGo.disabled=true;
                softReset();setSt(ST.APPROACH);
            });
            bRs.addEventListener('click',function(){
                fullReset();setSt(ST.IDLE);running=false;bGo.disabled=false;
            });

            // === ANIMATION LOOP ===
            var clk=new THREE.Clock();
            (function loop(){
                requestAnimationFrame(loop);
                var dt=Math.min(clk.getDelta(),0.05);
                if(running||state!==ST.IDLE)tickSt(dt);
                poseArm(solveIK3(eeT),gSp);
                cR.rotation.x+=dt*0.6;cR.rotation.z+=dt*0.4;
                updUI();drawLat();orb.update();ren.render(scene,cam);
            })();

            window.addEventListener('resize',function(){
                var w=mt.clientWidth||800,h=Math.max(mt.clientHeight||520,480);
                cam.aspect=w/h;cam.updateProjectionMatrix();ren.setSize(w,h);
            });
            lx.fillStyle='#040608';lx.fillRect(0,0,lcv.width,lcv.height);
        } // end boot
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();