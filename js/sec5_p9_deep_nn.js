// sec5_p9_deep_nn.js — Deep NN page: Transformer exact-inference walkthrough (v2 rebuild)
// [Core IIFE] TfCore: DOM-free, Node-requirable pure math.
// Every quantity the UI displays is computed exactly at toy dimension by this core.
// No training. Certificates: softmax row-stochasticity, LayerNorm eps-corrected
// moment identity, zero-init residual identity, PE linear-shift (rotation) theorem,
// and the headline: permutation equivariance of the unmasked block without PE,
// with measured breaking under PE / causal mask (negative controls).

var TfCore = (function () {
    'use strict';

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

    // ---------- dense matrix helpers (row-major array-of-rows) ----------
    function zeros(r, c) {
        var M = new Array(r);
        for (var i = 0; i < r; i++) { M[i] = new Float64Array(c); }
        return M;
    }
    function randMat(r, c, scale, randn) {
        var M = zeros(r, c);
        for (var i = 0; i < r; i++) for (var j = 0; j < c; j++) M[i][j] = randn() * scale;
        return M;
    }
    function rows(M) { return M.length; }
    function cols(M) { return M[0].length; }
    function matmul(A, B) {
        if (cols(A) !== rows(B)) {
            throw new Error('matmul dim mismatch: (' + rows(A) + 'x' + cols(A) + ')(' + rows(B) + 'x' + cols(B) + ')');
        }
        var n = rows(A), k = cols(A), m = cols(B);
        var C = zeros(n, m);
        for (var i = 0; i < n; i++) {
            for (var p = 0; p < k; p++) {
                var a = A[i][p];
                if (a === 0) continue;
                for (var j = 0; j < m; j++) C[i][j] += a * B[p][j];
            }
        }
        return C;
    }
    function transpose(A) {
        var T = zeros(cols(A), rows(A));
        for (var i = 0; i < rows(A); i++) for (var j = 0; j < cols(A); j++) T[j][i] = A[i][j];
        return T;
    }
    function addM(A, B) {
        if (rows(A) !== rows(B) || cols(A) !== cols(B)) throw new Error('addM dim mismatch');
        var C = zeros(rows(A), cols(A));
        for (var i = 0; i < rows(A); i++) for (var j = 0; j < cols(A); j++) C[i][j] = A[i][j] + B[i][j];
        return C;
    }
    function hconcat(list) {
        var n = rows(list[0]), total = 0, t;
        for (t = 0; t < list.length; t++) total += cols(list[t]);
        var C = zeros(n, total);
        for (var i = 0; i < n; i++) {
            var off = 0;
            for (t = 0; t < list.length; t++) {
                for (var j = 0; j < cols(list[t]); j++) C[i][off + j] = list[t][i][j];
                off += cols(list[t]);
            }
        }
        return C;
    }
    function frobDiff(A, B) {
        var s = 0;
        for (var i = 0; i < rows(A); i++) for (var j = 0; j < cols(A); j++) {
            var d = A[i][j] - B[i][j]; s += d * d;
        }
        return Math.sqrt(s);
    }
    function permuteRows(A, perm) {
        var C = zeros(rows(A), cols(A));
        for (var i = 0; i < rows(A); i++) for (var j = 0; j < cols(A); j++) C[i][j] = A[perm[i]][j];
        return C;
    }

    // ---------- model configuration (single source of truth) ----------
    var VOCAB = ['the', 'cat', 'sat', 'on', 'a', 'mat', 'dog', 'ran', 'to', 'and'];
    var CFG = {
        dModel: 8, nHeads: 2, dK: 4, dV: 4, dFfn: 16,
        vocab: VOCAB.length, C: 10000, eps: 1e-5,
        maxSeq: 6
    };
    var SENTENCE = ['the', 'cat', 'sat'];           // demo input, single source
    var DEFAULT_SEED = 2297; // validated: greedy rollout 'the cat sat on a mat', readable dist

    function tokenIdsOf(words) {
        return words.map(function (w) {
            var k = VOCAB.indexOf(w);
            if (k < 0) throw new Error('unknown token: ' + w);
            return k;
        });
    }

    // ---------- positional encoding (page: D-sinusoidal_positional_encoding) ----------
    // p_{i,2j} = sin(i / C^{2j/d}),  p_{i,2j+1} = cos(i / C^{2j/d})
    function peVector(pos, d, C) {
        var v = new Float64Array(d);
        for (var j = 0; 2 * j < d; j++) {
            var omega = 1 / Math.pow(C, (2 * j) / d);
            v[2 * j] = Math.sin(pos * omega);
            if (2 * j + 1 < d) v[2 * j + 1] = Math.cos(pos * omega);
        }
        return v;
    }
    function peMatrix(n, d, C) {
        var M = new Array(n);
        for (var i = 0; i < n; i++) M[i] = peVector(i, d, C);
        return M;
    }
    // Rotation matrix Phi(k) with PE(pos+k) = Phi(k) PE(pos): block-diagonal 2x2 rotations.
    function peShiftMatrix(k, d, C) {
        var Phi = zeros(d, d);
        for (var j = 0; 2 * j + 1 < d; j++) {
            var omega = 1 / Math.pow(C, (2 * j) / d);
            var c = Math.cos(k * omega), s = Math.sin(k * omega);
            Phi[2 * j][2 * j] = c;      Phi[2 * j][2 * j + 1] = s;
            Phi[2 * j + 1][2 * j] = -s; Phi[2 * j + 1][2 * j + 1] = c;
        }
        return Phi;
    }

    // ---------- softmax (row-wise), optional causal mask ----------
    // causal: entry (i,j) with j > i is masked (score -> -Infinity, weight -> exactly 0).
    function softmaxRows(S, causal) {
        var n = rows(S), m = cols(S);
        var W = zeros(n, m);
        for (var i = 0; i < n; i++) {
            var mx = -Infinity, j;
            for (j = 0; j < m; j++) {
                if (causal && j > i) continue;
                if (S[i][j] > mx) mx = S[i][j];
            }
            var sum = 0;
            for (j = 0; j < m; j++) {
                if (causal && j > i) { W[i][j] = 0; continue; }
                W[i][j] = Math.exp(S[i][j] - mx);
                sum += W[i][j];
            }
            for (j = 0; j < m; j++) W[i][j] /= sum;
        }
        return W;
    }
    function softmaxVec(v) {
        var mx = -Infinity, i, s = 0;
        for (i = 0; i < v.length; i++) if (v[i] > mx) mx = v[i];
        var out = new Float64Array(v.length);
        for (i = 0; i < v.length; i++) { out[i] = Math.exp(v[i] - mx); s += out[i]; }
        for (i = 0; i < v.length; i++) out[i] /= s;
        return out;
    }

    // ---------- LayerNorm (page convention: sigma = sqrt(var + eps); gamma=1, beta=0) ----------
    // Normalizes each token vector (row) over the feature dimension.
    function layerNorm(X, eps) {
        var n = rows(X), d = cols(X);
        var Z = zeros(n, d), mu = new Float64Array(n), sg = new Float64Array(n);
        for (var i = 0; i < n; i++) {
            var m = 0, j;
            for (j = 0; j < d; j++) m += X[i][j];
            m /= d;
            var v = 0;
            for (j = 0; j < d; j++) { var t = X[i][j] - m; v += t * t; }
            v /= d;
            var s = Math.sqrt(v + eps);
            for (j = 0; j < d; j++) Z[i][j] = (X[i][j] - m) / s;
            mu[i] = m; sg[i] = s;
        }
        return { out: Z, mu: mu, sigma: sg };
    }

    // ---------- attention (page: D-scaled_dot_product_attention, per-head d_k scale) ----------
    function attentionHead(X, Wq, Wk, Wv, causal) {
        var Q = matmul(X, Wq), K = matmul(X, Wk), V = matmul(X, Wv);
        var S = matmul(Q, transpose(K));
        var scale = 1 / Math.sqrt(cols(Q));
        for (var i = 0; i < rows(S); i++) for (var j = 0; j < cols(S); j++) S[i][j] *= scale;
        var W = softmaxRows(S, causal);
        var out = matmul(W, V);
        return { Q: Q, K: K, V: V, scores: S, weights: W, out: out };
    }
    // page: D-multi_head_attention — heads concatenated then projected by Wo.
    function mha(X, p, causal) {
        var heads = [], outs = [];
        for (var h = 0; h < p.heads.length; h++) {
            var hd = attentionHead(X, p.heads[h].Wq, p.heads[h].Wk, p.heads[h].Wv, causal);
            heads.push(hd); outs.push(hd.out);
        }
        var concat = hconcat(outs);
        var out = matmul(concat, p.Wo);
        return { heads: heads, concat: concat, out: out };
    }

    // ---------- position-wise FFN (ReLU) ----------
    function relu(M) {
        var C = zeros(rows(M), cols(M));
        for (var i = 0; i < rows(M); i++) for (var j = 0; j < cols(M); j++) C[i][j] = M[i][j] > 0 ? M[i][j] : 0;
        return C;
    }
    function ffn(X, W1, W2) {
        var H = relu(matmul(X, W1));
        return { hidden: H, out: matmul(H, W2) };
    }

    // ---------- residual add (page: D-residual_block) ----------
    function residualAdd(F, X) { return addM(F, X); }

    // ---------- one decoder-style block (post-LN, page pseudocode convention) ----------
    // Z  = LayerNorm(MHA(X) + X)
    // out= LayerNorm(FFN(Z) + Z)
    function block(X, p, causal) {
        var att = mha(X, p, causal);
        var res1 = residualAdd(att.out, X);
        var ln1 = layerNorm(res1, CFG.eps);
        var ff = ffn(ln1.out, p.W1, p.W2);
        var res2 = residualAdd(ff.out, ln1.out);
        var ln2 = layerNorm(res2, CFG.eps);
        return { att: att, res1: res1, ln1: ln1, ffn: ff, res2: res2, ln2: ln2, out: ln2.out };
    }

    // ---------- parameters ----------
    function createParams(seed) {
        var randn = makeRandn(mulberry32(seed));
        var d = CFG.dModel;
        var p = { seed: seed, E: randMat(CFG.vocab, d, 1.0, randn), heads: [] };
        for (var h = 0; h < CFG.nHeads; h++) {
            p.heads.push({
                Wq: randMat(d, CFG.dK, 1 / Math.sqrt(d), randn),
                Wk: randMat(d, CFG.dK, 1 / Math.sqrt(d), randn),
                Wv: randMat(d, CFG.dV, 1 / Math.sqrt(d), randn)
            });
        }
        p.Wo = randMat(CFG.nHeads * CFG.dV, d, 1 / Math.sqrt(CFG.nHeads * CFG.dV), randn);
        p.W1 = randMat(d, CFG.dFfn, 1 / Math.sqrt(d), randn);
        p.W2 = randMat(CFG.dFfn, d, 1 / Math.sqrt(CFG.dFfn), randn);
        p.Wu = randMat(d, CFG.vocab, 1 / Math.sqrt(d), randn);
        return p;
    }

    // ---------- full forward pass (exact inference, all intermediates returned) ----------
    // opts: { usePE: bool, causal: bool }
    function forward(tokenIds, p, opts) {
        var n = tokenIds.length, d = CFG.dModel;
        if (n < 1 || n > CFG.maxSeq) throw new Error('sequence length out of range');
        var emb = zeros(n, d);
        for (var i = 0; i < n; i++) for (var j = 0; j < d; j++) emb[i][j] = p.E[tokenIds[i]][j];
        var PE = peMatrix(n, d, CFG.C);
        var X = opts.usePE ? addM(emb, PE) : emb;
        var blk = block(X, p, opts.causal);
        var last = n - 1;
        var logits = new Float64Array(CFG.vocab);
        for (var t = 0; t < CFG.vocab; t++) {
            var s = 0;
            for (var k = 0; k < d; k++) s += blk.out[last][k] * p.Wu[k][t];
            logits[t] = s;
        }
        var probs = softmaxVec(logits);
        var argmax = 0;
        for (var q = 1; q < CFG.vocab; q++) if (probs[q] > probs[argmax]) argmax = q;
        return {
            tokenIds: tokenIds.slice(), emb: emb, PE: PE, X: X, blk: blk,
            lastIndex: last, logits: logits, probs: probs, argmax: argmax
        };
    }
    function greedyStep(tokenIds, p, opts) {
        var f = forward(tokenIds, p, opts);
        return { forward: f, nextId: f.argmax, appended: tokenIds.concat([f.argmax]) };
    }

    // ---------- equivariance experiment (headline) ----------
    // f = one block, unmasked, acting on a raw feature matrix X. Measures ||f(PX) - P f(X)||_F
    // in three configurations: plain / with PE added inside f / with causal mask.
    function equivarianceResiduals(p, X, perm) {
        var n = rows(X);
        var PE = peMatrix(n, cols(X), CFG.C);
        var PX = permuteRows(X, perm);

        function run(cfgPE, cfgMask, M) {
            var inp = cfgPE ? addM(M, PE) : M;
            return block(inp, p, cfgMask).out;
        }
        function resid(cfgPE, cfgMask) {
            var fPX = run(cfgPE, cfgMask, PX);
            var PfX = permuteRows(run(cfgPE, cfgMask, X), perm);
            return frobDiff(fPX, PfX);
        }
        return { plain: resid(false, false), withPE: resid(true, false), withMask: resid(false, true) };
    }

    // ---------- self-tests ----------
    function runSelfTests() {
        var failures = [];
        function check(name, cond, detail) {
            if (!cond) failures.push(name + (detail ? ' — ' + detail : ''));
        }
        try {
            var p = createParams(DEFAULT_SEED);
            var ids = tokenIdsOf(SENTENCE);
            var f = forward(ids, p, { usePE: true, causal: true });
            var i, j, t;

            // T1: softmax row-stochasticity + causal zeros (on the actual displayed weights)
            for (var h = 0; h < f.blk.att.heads.length; h++) {
                var W = f.blk.att.heads[h].weights;
                for (i = 0; i < rows(W); i++) {
                    var s = 0;
                    for (j = 0; j < cols(W); j++) {
                        s += W[i][j];
                        check('T1 nonneg', W[i][j] >= 0, 'h' + h + ' (' + i + ',' + j + ')');
                        if (j > i) check('T1 causal zero', W[i][j] === 0, 'h' + h + ' (' + i + ',' + j + ')');
                    }
                    check('T1 row sum', Math.abs(s - 1) < 1e-12, 'h' + h + ' row ' + i + ' sum=' + s);
                }
            }
            // probs is also a softmax output
            var ps = 0;
            for (t = 0; t < f.probs.length; t++) ps += f.probs[t];
            check('T1 prob sum', Math.abs(ps - 1) < 1e-12, 'sum=' + ps);

            // T2: LayerNorm eps-corrected moment identity (page formula: sigma = sqrt(var+eps))
            // mean(out_row) = 0 exactly (fp), var(out_row) = v/(v+eps) where v is the input row variance.
            function checkLN(Xin) {
                var ln = layerNorm(Xin, CFG.eps);
                for (var r = 0; r < rows(Xin); r++) {
                    var d = cols(Xin), m = 0, k;
                    for (k = 0; k < d; k++) m += ln.out[r][k];
                    m /= d;
                    check('T2 mean', Math.abs(m) < 1e-12, 'row ' + r + ' mean=' + m);
                    var mi = 0;
                    for (k = 0; k < d; k++) mi += Xin[r][k];
                    mi /= d;
                    var v = 0;
                    for (k = 0; k < d; k++) { var u = Xin[r][k] - mi; v += u * u; }
                    v /= d;
                    var vo = 0;
                    for (k = 0; k < d; k++) { var w = ln.out[r][k]; vo += w * w; } // mean is 0
                    vo /= d;
                    check('T2 var identity', Math.abs(vo - v / (v + CFG.eps)) < 1e-10,
                        'row ' + r + ' got ' + vo + ' expected ' + v / (v + CFG.eps));
                }
            }
            checkLN(f.blk.res1);
            var constRow = [new Float64Array([3, 3, 3, 3, 3, 3, 3, 3])];
            checkLN(constRow); // v=0 -> output exactly 0 vector; identity gives 0

            // T3: zero-initialized residual block is exactly the identity map (D-residual_block live)
            var pz = createParams(DEFAULT_SEED);
            for (h = 0; h < pz.heads.length; h++) {
                pz.heads[h].Wv = zeros(CFG.dModel, CFG.dV); // V = 0 -> attention output exactly 0
            }
            pz.Wo = zeros(CFG.nHeads * CFG.dV, CFG.dModel);
            var attZ = mha(f.X, pz, true);
            var resZ = residualAdd(attZ.out, f.X);
            var same = true;
            for (i = 0; i < rows(f.X); i++) for (j = 0; j < cols(f.X); j++) {
                if (resZ[i][j] !== f.X[i][j]) same = false;
            }
            check('T3 zero-F residual identity', same);

            // T4: PE linear-shift theorem: PE(pos+k) = Phi(k) PE(pos), Phi block rotation
            for (var k4 = 1; k4 <= 4; k4++) {
                var Phi = peShiftMatrix(k4, CFG.dModel, CFG.C);
                for (var pos = 0; pos <= 9; pos++) {
                    var lhs = peVector(pos + k4, CFG.dModel, CFG.C);
                    var rhsIn = [peVector(pos, CFG.dModel, CFG.C)];
                    var rhs = matmul(rhsIn, transpose(Phi))[0]; // row-vector convention: p Phi^T
                    var dmax = 0;
                    for (j = 0; j < CFG.dModel; j++) dmax = Math.max(dmax, Math.abs(lhs[j] - rhs[j]));
                    check('T4 PE shift', dmax < 1e-9, 'k=' + k4 + ' pos=' + pos + ' err=' + dmax);
                }
            }

            // T5 (HEADLINE): permutation equivariance f(PX) = P f(X) for the unmasked,
            // PE-free block; PE and causal mask each break it measurably (negative controls).
            var rng5 = makeRandn(mulberry32(2026));
            var X5 = randMat(5, CFG.dModel, 1.0, rng5);
            var perm = [2, 0, 4, 1, 3];
            var eq = equivarianceResiduals(p, X5, perm);
            check('T5 equivariance (plain)', eq.plain < 1e-9, 'resid=' + eq.plain);
            check('T5 negative control (PE)', eq.withPE > 0.05, 'resid=' + eq.withPE);
            check('T5 negative control (mask)', eq.withMask > 0.05, 'resid=' + eq.withMask);

            // T6: attention matrix path agrees with the per-row weighted-sum definition,
            // recomputed independently (own dot products, own softmax, own 1/sqrt(d_k)).
            var hd = f.blk.att.heads[0];
            var n6 = rows(hd.Q), dk = cols(hd.Q);
            for (i = 0; i < n6; i++) {
                var sc = new Float64Array(n6), mx = -Infinity;
                for (j = 0; j < n6; j++) {
                    var dp = 0;
                    for (t = 0; t < dk; t++) dp += hd.Q[i][t] * hd.K[j][t];
                    sc[j] = dp / Math.sqrt(dk);
                    if (j <= i && sc[j] > mx) mx = sc[j]; // causal
                }
                var Z6 = 0, w6 = new Float64Array(n6);
                for (j = 0; j <= i; j++) { w6[j] = Math.exp(sc[j] - mx); Z6 += w6[j]; }
                for (j = 0; j < n6; j++) w6[j] = j <= i ? w6[j] / Z6 : 0;
                for (t = 0; t < cols(hd.V); t++) {
                    var acc = 0;
                    for (j = 0; j < n6; j++) acc += w6[j] * hd.V[j][t];
                    check('T6 weighted-sum def', Math.abs(acc - hd.out[i][t]) < 1e-12,
                        '(' + i + ',' + t + ') diff=' + Math.abs(acc - hd.out[i][t]));
                }
            }

            // T7: displayed distribution equals softmax of independently recomputed logits
            // from the LAST row of the block output; greedy step appends the argmax.
            var last7 = ids.length - 1;
            var lg7 = new Float64Array(CFG.vocab), mx7 = -Infinity;
            for (t = 0; t < CFG.vocab; t++) {
                var s7 = 0;
                for (j = 0; j < CFG.dModel; j++) s7 += f.blk.out[last7][j] * p.Wu[j][t];
                lg7[t] = s7;
                if (s7 > mx7) mx7 = s7;
            }
            var Z7 = 0, pr7 = new Float64Array(CFG.vocab);
            for (t = 0; t < CFG.vocab; t++) { pr7[t] = Math.exp(lg7[t] - mx7); Z7 += pr7[t]; }
            var am7 = 0;
            for (t = 0; t < CFG.vocab; t++) { pr7[t] /= Z7; if (pr7[t] > pr7[am7]) am7 = t; }
            for (t = 0; t < CFG.vocab; t++) {
                check('T7 prob recompute', Math.abs(pr7[t] - f.probs[t]) < 1e-12, 'token ' + t);
            }
            var gs = greedyStep(ids, p, { usePE: true, causal: true });
            check('T7 greedy argmax', gs.nextId === am7 && gs.appended[gs.appended.length - 1] === am7);

            // T8: PE pinned to the page's worked example: d=4, pos=2 ->
            // [sin 2, cos 2, sin 0.02, cos 0.02]
            var pin = peVector(2, 4, 10000);
            var expect = [Math.sin(2), Math.cos(2), Math.sin(0.02), Math.cos(0.02)];
            for (j = 0; j < 4; j++) {
                check('T8 PE page pin', Math.abs(pin[j] - expect[j]) < 1e-15, 'j=' + j);
            }

            // T9: displayed sentence/vocab single source of truth
            check('T9 sentence in vocab', ids.length === 3);
        } catch (e) {
            failures.push('EXCEPTION: ' + (e && e.message ? e.message : String(e)));
        }
        return failures;
    }

    return {
        CFG: CFG, VOCAB: VOCAB, SENTENCE: SENTENCE, DEFAULT_SEED: DEFAULT_SEED,
        mulberry32: mulberry32, makeRandn: makeRandn,
        zeros: zeros, matmul: matmul, transpose: transpose, addM: addM,
        frobDiff: frobDiff, permuteRows: permuteRows,
        peVector: peVector, peMatrix: peMatrix, peShiftMatrix: peShiftMatrix,
        softmaxRows: softmaxRows, softmaxVec: softmaxVec, layerNorm: layerNorm,
        attentionHead: attentionHead, mha: mha, ffn: ffn, residualAdd: residualAdd,
        block: block, createParams: createParams, forward: forward, greedyStep: greedyStep,
        tokenIdsOf: tokenIdsOf, equivarianceResiduals: equivarianceResiduals,
        runSelfTests: runSelfTests
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = TfCore; }

/* =========================================================================
 * [UI IIFE] Transformer exact-inference walkthrough.
 * Refuses to render if TfCore.runSelfTests() reports failures.
 * Every number shown below is computed by TfCore on the current sequence
 * and the current seed — nothing is hardcoded.
 * ========================================================================= */
(function () {
    'use strict';

    function init() {
        var container = document.getElementById('transformer_demo');
        if (!container) return;
        if (container.dataset.tfInit) return;   /* idempotency guard */
        container.dataset.tfInit = '1';

        var failures = TfCore.runSelfTests();
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

        var C = {
            island: 'rgba(20,28,40,0.95)',
            panel: 'rgba(255,255,255,0.04)',
            panelBorder: 'rgba(255,255,255,0.10)',
            plotBg: '#101826',
            text: 'rgba(255,255,255,0.88)',
            muted: 'rgba(255,255,255,0.55)',
            accent: '#4da3ff',
            pos: '77,163,255',      /* rgb for positive cells */
            neg: '255,107,94',      /* rgb for negative cells */
            good: '#2ecc71',
            warn: '#ffa726',
            newTok: '#69f0ae'
        };

        /* ---------------- state ---------------- */
        var state = {
            seed: TfCore.DEFAULT_SEED,
            params: TfCore.createParams(TfCore.DEFAULT_SEED),
            tokenIds: TfCore.tokenIdsOf(TfCore.SENTENCE),
            baseLen: TfCore.SENTENCE.length,
            step: 0,
            head: 0,
            permSeed: 1,
            trace: null
        };
        function recompute() {
            state.trace = TfCore.forward(state.tokenIds, state.params, { usePE: true, causal: true });
        }
        recompute();

        /* ---------------- styles (scoped under mount id) ---------------- */
        if (!document.getElementById('tf-flow-styles')) {
            var style = document.createElement('style');
            style.id = 'tf-flow-styles';
            style.textContent =
                '#transformer_demo .tf-demo{background:' + C.island + ';border:1px solid ' + C.panelBorder + ';border-radius:8px;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:' + C.text + ';}' +
                '#transformer_demo .tf-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid ' + C.panelBorder + ';padding-bottom:14px;}' +
                '#transformer_demo .tf-title{font-size:1.15rem;font-weight:bold;color:' + C.accent + ';}' +
                '#transformer_demo .tf-sub{font-size:0.78rem;color:' + C.muted + ';margin-top:3px;}' +
                '#transformer_demo .tf-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}' +
                '#transformer_demo .tf-btn{background:#1a2333;color:' + C.accent + ';border:1px solid ' + C.accent + ';border-radius:4px;padding:5px 14px;cursor:pointer;font-weight:bold;font-size:0.85rem;}' +
                '#transformer_demo .tf-btn:hover:not(:disabled){background:' + C.accent + ';color:#000;}' +
                '#transformer_demo .tf-btn:disabled{opacity:0.35;cursor:not-allowed;}' +
                '#transformer_demo .tf-body{display:flex;gap:20px;margin-top:18px;}' +
                '@media (max-width:900px){#transformer_demo .tf-body{flex-direction:column;}}' +
                '#transformer_demo .tf-svg-wrap{flex:0 0 290px;background:' + C.plotBg + ';border-radius:8px;padding:14px 0;border:1px solid ' + C.panelBorder + ';align-self:flex-start;position:sticky;top:12px;}' +
                '#transformer_demo .tf-panel{flex:1;min-width:0;}' +
                '#transformer_demo .tf-step-title{color:' + C.warn + ';font-size:1.15rem;font-weight:bold;margin:0 0 8px 0;}' +
                '#transformer_demo .tf-step-desc{font-size:0.9rem;color:rgba(255,255,255,0.75);line-height:1.55;margin:0 0 12px 0;}' +
                '#transformer_demo .tf-step-desc b{color:' + C.newTok + ';}' +
                '#transformer_demo .tf-step-desc code{font-family:"JetBrains Mono",Consolas,monospace;color:' + C.accent + ';font-size:0.85em;}' +
                '#transformer_demo .tf-viz{background:#111820;padding:14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);overflow-x:auto;}' +
                '#transformer_demo .tf-mats{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;}' +
                '#transformer_demo .tf-mat{display:inline-block;}' +
                '#transformer_demo .tf-mat-label{font-family:"JetBrains Mono",Consolas,monospace;font-size:0.72rem;color:' + C.muted + ';margin-bottom:5px;}' +
                '#transformer_demo table.tf-grid{border-collapse:collapse;}' +
                '#transformer_demo table.tf-grid td{border:1px solid rgba(255,255,255,0.08);font-family:"JetBrains Mono",Consolas,monospace;font-size:0.66rem;padding:2px 4px;text-align:right;color:' + C.text + ';min-width:30px;}' +
                '#transformer_demo table.tf-grid td.tf-hdr{border:none;color:' + C.muted + ';font-size:0.62rem;text-align:center;padding:1px 3px;}' +
                '#transformer_demo table.tf-grid td.tf-sum{border:none;color:' + C.good + ';font-size:0.66rem;padding-left:8px;text-align:left;white-space:nowrap;}' +
                '#transformer_demo .tf-op{font-size:1.3rem;font-weight:bold;color:rgba(255,255,255,0.4);align-self:center;}' +
                '#transformer_demo .tf-tokens{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid ' + C.panelBorder + ';align-items:center;}' +
                '#transformer_demo .tf-token{background:rgba(77,163,255,0.15);border:1px solid rgba(77,163,255,0.35);padding:4px 9px;border-radius:4px;font-family:"JetBrains Mono",Consolas,monospace;font-size:0.82rem;color:#fff;}' +
                '#transformer_demo .tf-token-new{background:rgba(105,240,174,0.18);border-color:rgba(105,240,174,0.55);color:' + C.newTok + ';font-weight:bold;}' +
                '#transformer_demo .tf-prob-row{display:flex;align-items:center;gap:8px;margin:3px 0;}' +
                '#transformer_demo .tf-prob-label{width:44px;font-family:"JetBrains Mono",Consolas,monospace;font-size:0.8rem;text-align:right;}' +
                '#transformer_demo .tf-prob-bg{flex:1;height:11px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden;}' +
                '#transformer_demo .tf-prob-fill{height:100%;}' +
                '#transformer_demo .tf-prob-val{width:52px;font-size:0.74rem;color:' + C.muted + ';text-align:right;font-family:"JetBrains Mono",Consolas,monospace;}' +
                '#transformer_demo .tf-stat{font-family:"JetBrains Mono",Consolas,monospace;font-size:0.74rem;color:' + C.muted + ';margin-top:8px;line-height:1.6;}' +
                '#transformer_demo .tf-htabs{display:flex;gap:6px;margin-bottom:10px;}' +
                '#transformer_demo .tf-htab{background:#1a2333;color:' + C.muted + ';border:1px solid ' + C.panelBorder + ';border-radius:4px;padding:3px 10px;cursor:pointer;font-size:0.78rem;}' +
                '#transformer_demo .tf-htab.tf-on{color:' + C.accent + ';border-color:' + C.accent + ';}' +
                '#transformer_demo table.tf-eq{border-collapse:collapse;font-family:"JetBrains Mono",Consolas,monospace;font-size:0.8rem;}' +
                '#transformer_demo table.tf-eq td,#transformer_demo table.tf-eq th{border:1px solid rgba(255,255,255,0.12);padding:5px 12px;text-align:left;color:' + C.text + ';font-weight:normal;}' +
                '#transformer_demo table.tf-eq th{color:' + C.muted + ';font-size:0.72rem;}' +
                '#transformer_demo .comp-box{fill:#222b38;stroke:#445870;stroke-width:2;}' +
                '#transformer_demo .comp-text{fill:#bbb;font-size:13px;font-weight:500;text-anchor:middle;dominant-baseline:middle;pointer-events:none;}' +
                '#transformer_demo .comp-line{stroke:#445870;stroke-width:3;fill:none;}' +
                '#transformer_demo .comp-box.active{fill:#ff9800;stroke:#fff;}' +
                '#transformer_demo .comp-text.active{fill:#000;font-weight:bold;}' +
                '#transformer_demo .comp-line.active{stroke:' + C.newTok + ';}';
            document.head.appendChild(style);
        }

        /* ---------------- helpers ---------------- */
        function fmt2(v) { return v.toFixed(2); }
        function cellBg(v, vmax) {
            if (vmax <= 0) return 'transparent';
            var a = Math.min(1, Math.abs(v) / vmax) * 0.55;
            return 'rgba(' + (v >= 0 ? C.pos : C.neg) + ',' + a.toFixed(3) + ')';
        }
        function words() { return state.tokenIds.map(function (id) { return TfCore.VOCAB[id]; }); }

        /* Numeric heatmap table. opts: {label, rowLabels, colLabels, rowSums, maskAbove, small} */
        function matTable(M, opts) {
            var n = M.length, m = M[0].length, i, j;
            var vmax = 0;
            for (i = 0; i < n; i++) for (j = 0; j < m; j++) {
                if (opts.maskAbove && j > i) continue; /* masked entries never reach softmax */
                if (isFinite(M[i][j])) vmax = Math.max(vmax, Math.abs(M[i][j]));
            }
            var h = '<div class="tf-mat"><div class="tf-mat-label">' + opts.label + '</div><table class="tf-grid">';
            if (opts.colLabels) {
                h += '<tr><td class="tf-hdr"></td>';
                for (j = 0; j < m; j++) h += '<td class="tf-hdr">' + opts.colLabels[j] + '</td>';
                if (opts.rowSums) h += '<td class="tf-hdr"></td>';
                h += '</tr>';
            }
            for (i = 0; i < n; i++) {
                h += '<tr>';
                h += '<td class="tf-hdr">' + (opts.rowLabels ? opts.rowLabels[i] : '') + '</td>';
                var s = 0;
                for (j = 0; j < m; j++) {
                    var masked = opts.maskAbove && j > i;
                    s += M[i][j];
                    h += masked
                        ? '<td style="color:rgba(255,255,255,0.25);">&minus;&infin;</td>'
                        : '<td style="background:' + cellBg(M[i][j], vmax) + (opts.small ? ';font-size:0.58rem;min-width:24px;padding:1px 2px;' : '') + '">' + fmt2(M[i][j]) + '</td>';
                }
                if (opts.rowSums) h += '<td class="tf-sum">&Sigma; = ' + s.toFixed(3) + '</td>';
                h += '</tr>';
            }
            return h + '</table></div>';
        }
        function dimLabels(m, base) {
            var out = [];
            for (var j = 0; j < m; j++) out.push(base + j);
            return out;
        }

        /* ---------------- step definitions ---------------- */
        var STEPS = [
            {
                title: '1. Input Sequence',
                boxes: [], lines: [],
                desc: function () {
                    return 'The model receives a sequence of tokens over a toy vocabulary of ' + TfCore.CFG.vocab +
                        ' words. All quantities in the following steps are <b>computed exactly</b> for this sequence ' +
                        'at dimension <code>d_model = ' + TfCore.CFG.dModel + '</code> with untrained (seeded random) weights.';
                },
                viz: function () {
                    return '<div class="tf-stat">vocabulary: [ ' + TfCore.VOCAB.join(', ') + ' ]<br>' +
                        'current sequence: &quot;' + words().join(' ') + '&quot; (' + state.tokenIds.length + ' tokens)</div>';
                }
            },
            {
                title: '2. Embedding + Positional Encoding',
                boxes: ['tf-box-embed', 'tf-box-pos'], lines: ['tf-line-in-embed', 'tf-line-embed-pos', 'tf-line-pos-mha'],
                desc: function () {
                    return 'Each token id selects a row of the embedding matrix. Because self-attention by itself is ' +
                        'permutation-equivariant (see step 10), the sinusoidal positional encoding ' +
                        '<code>p<sub>i,2j</sub> = sin(i / C<sup>2j/d</sup>)</code>, <code>p<sub>i,2j+1</sub> = cos(i / C<sup>2j/d</sup>)</code> ' +
                        'is <b>added</b> to inject token order: <code>X = E + PE</code>.';
                },
                viz: function () {
                    var t = state.trace, cl = dimLabels(TfCore.CFG.dModel, 'd');
                    return '<div class="tf-mats">' +
                        matTable(t.emb, { label: 'E (token embeddings)', rowLabels: words(), colLabels: cl }) +
                        '<div class="tf-op">+</div>' +
                        matTable(t.PE, { label: 'PE (positional encoding)', rowLabels: dimLabels(t.PE.length, 'pos '), colLabels: cl }) +
                        '<div class="tf-op">=</div>' +
                        matTable(t.X, { label: 'X = E + PE', rowLabels: words(), colLabels: cl }) +
                        '</div>';
                }
            },
            {
                title: '3. Masked Self-Attention (per head)',
                boxes: ['tf-box-mha'], lines: ['tf-line-mha-norm1', 'tf-line-res1'],
                desc: function () {
                    return 'Each head projects <code>X</code> to queries, keys, and values, then computes ' +
                        '<code>softmax(QK<sup>&#8868;</sup> / &radic;d<sub>k</sub>)V</code> row-wise, with a <b>causal mask</b>: ' +
                        'position <code>i</code> may attend only to positions <code>j &le; i</code>. Masked scores are ' +
                        '&minus;&infin;, so their weights are exactly 0 and every row still sums to exactly 1.';
                },
                viz: function () {
                    var t = state.trace, hd = t.blk.att.heads[state.head], w = words();
                    var tabs = '<div class="tf-htabs">';
                    for (var h = 0; h < t.blk.att.heads.length; h++) {
                        tabs += '<button class="tf-htab' + (h === state.head ? ' tf-on' : '') + '" data-head="' + h + '">Head ' + (h + 1) + '</button>';
                    }
                    tabs += '</div>';
                    return tabs + '<div class="tf-mats">' +
                        matTable(hd.scores, { label: 'scores QK&#8868;/&radic;d_k (masked)', rowLabels: w, colLabels: w, maskAbove: true }) +
                        matTable(hd.weights, { label: 'attention weights (softmax rows)', rowLabels: w, colLabels: w, rowSums: true }) +
                        matTable(hd.out, { label: 'head output = weights &middot; V', rowLabels: w, colLabels: dimLabels(TfCore.CFG.dV, 'v') }) +
                        '</div>';
                }
            },
            {
                title: '4. Add & LayerNorm',
                boxes: ['tf-box-norm1'], lines: ['tf-line-norm1-ffn'],
                desc: function () {
                    return 'The heads are concatenated, projected by <code>W<sub>o</sub></code>, and the input is added back ' +
                        '(<b>residual connection</b>): <code>Z = LayerNorm(MHA(X) + X)</code>. LayerNorm normalizes each ' +
                        'token vector with <code>&sigma; = &radic;(var + &epsilon;)</code>, so each output row has mean exactly 0 ' +
                        'and variance exactly <code>v/(v + &epsilon;)</code> &mdash; verifiable below.';
                },
                viz: function () {
                    var t = state.trace, cl = dimLabels(TfCore.CFG.dModel, 'd');
                    var st = '<div class="tf-stat">';
                    for (var i = 0; i < t.blk.ln1.out.length; i++) {
                        var d = TfCore.CFG.dModel, m = 0, v = 0, j;
                        for (j = 0; j < d; j++) m += t.blk.ln1.out[i][j];
                        m /= d;
                        for (j = 0; j < d; j++) { var u = t.blk.ln1.out[i][j] - m; v += u * u; }
                        v /= d;
                        st += 'row &quot;' + words()[i] + '&quot;: mean = ' + m.toExponential(1) + ', variance = ' + v.toFixed(6) + '<br>';
                    }
                    st += '</div>';
                    return '<div class="tf-mats">' +
                        matTable(t.blk.res1, { label: 'MHA(X) + X', rowLabels: words(), colLabels: cl }) +
                        '<div class="tf-op">&rarr;</div>' +
                        matTable(t.blk.ln1.out, { label: 'Z = LayerNorm(MHA(X) + X)', rowLabels: words(), colLabels: cl }) +
                        '</div>' + st;
                }
            },
            {
                title: '5. Feed-Forward Network',
                boxes: ['tf-box-ffn'], lines: ['tf-line-ffn-norm2', 'tf-line-res2'],
                desc: function () {
                    return 'A position-wise two-layer network <code>ReLU(Z W<sub>1</sub>) W<sub>2</sub></code> is applied to ' +
                        'each token vector independently (<code>d_ffn = ' + TfCore.CFG.dFfn + '</code>). Acting row-wise, ' +
                        'it preserves the permutation-equivariance of the block.';
                },
                viz: function () {
                    var t = state.trace;
                    return '<div class="tf-mats">' +
                        matTable(t.blk.ffn.hidden, { label: 'hidden = ReLU(Z W&#8321;)  (' + state.tokenIds.length + '&times;' + TfCore.CFG.dFfn + ')', rowLabels: words(), colLabels: dimLabels(TfCore.CFG.dFfn, ''), small: true }) +
                        matTable(t.blk.ffn.out, { label: 'FFN(Z) = hidden &middot; W&#8322;', rowLabels: words(), colLabels: dimLabels(TfCore.CFG.dModel, 'd') }) +
                        '</div>';
                }
            },
            {
                title: '6. Add & LayerNorm (block output)',
                boxes: ['tf-box-norm2'], lines: ['tf-line-norm2-linear'],
                desc: function () {
                    return 'A second residual connection and normalization completes the block: ' +
                        '<code>out = LayerNorm(FFN(Z) + Z)</code>. If the sublayer were zero-initialized, the residual sum ' +
                        '<code>F(z) + z</code> would be <b>exactly</b> the identity map &mdash; this is why very deep stacks of ' +
                        'such blocks remain trainable.';
                },
                viz: function () {
                    var t = state.trace;
                    return '<div class="tf-mats">' +
                        matTable(t.blk.out, { label: 'block output (contextualized token vectors)', rowLabels: words(), colLabels: dimLabels(TfCore.CFG.dModel, 'd') }) +
                        '</div>';
                }
            },
            {
                title: '7. Output Projection',
                boxes: ['tf-box-linear'], lines: ['tf-line-linear-softmax'],
                desc: function () {
                    return 'The vector of the <b>last</b> token is projected onto the vocabulary: ' +
                        '<code>logits = out<sub>last</sub> W<sub>u</sub></code>, one raw score per vocabulary word.';
                },
                viz: function () {
                    var t = state.trace;
                    var row = [Array.prototype.slice.call(t.logits)];
                    return '<div class="tf-mats">' +
                        matTable([Array.prototype.slice.call(t.blk.out[t.lastIndex])], { label: 'out[&quot;' + words()[t.lastIndex] + '&quot;]  (1&times;' + TfCore.CFG.dModel + ')', rowLabels: [''], colLabels: dimLabels(TfCore.CFG.dModel, 'd') }) +
                        '<div class="tf-op">&middot; W<sub>u</sub> &rarr;</div>' +
                        matTable(row, { label: 'logits  (1&times;' + TfCore.CFG.vocab + ')', rowLabels: [''], colLabels: TfCore.VOCAB }) +
                        '</div>';
                }
            },
            {
                title: '8. Softmax over the Vocabulary',
                boxes: ['tf-box-softmax'], lines: ['tf-line-softmax-out'],
                desc: function () {
                    return 'Softmax converts the logits into a probability distribution (these bars are the actual computed ' +
                        'values; they sum to exactly 1). The highest-probability token is the greedy prediction.';
                },
                viz: function () {
                    var t = state.trace, h = '', order = [];
                    for (var k = 0; k < TfCore.CFG.vocab; k++) order.push(k);
                    order.sort(function (a, b) { return t.probs[b] - t.probs[a]; });
                    for (var r = 0; r < order.length; r++) {
                        var k2 = order[r], p = t.probs[k2], isMax = (k2 === t.argmax);
                        h += '<div class="tf-prob-row"><div class="tf-prob-label"' + (isMax ? ' style="color:' + C.newTok + ';font-weight:bold;"' : '') + '>' + TfCore.VOCAB[k2] + '</div>' +
                            '<div class="tf-prob-bg"><div class="tf-prob-fill" style="width:' + (p * 100).toFixed(1) + '%;background:' + (isMax ? C.newTok : C.accent) + ';"></div></div>' +
                            '<div class="tf-prob-val">' + (p * 100).toFixed(1) + '%</div></div>';
                    }
                    return h;
                }
            },
            {
                title: '9. Autoregressive Generation',
                boxes: [], lines: [],
                desc: function () {
                    return 'The predicted token is appended to the sequence and the <b>entire forward pass reruns</b> on the ' +
                        'longer sequence (steps 2&ndash;8 update accordingly). The weights are untrained, so the continuation ' +
                        'is whatever this particular random parameter draw produces &mdash; displayed honestly, not scripted.';
                },
                viz: function () {
                    var atCap = state.tokenIds.length >= TfCore.CFG.maxSeq;
                    return '<div><button class="tf-btn" id="tf-predict"' + (atCap ? ' disabled' : '') + '>Predict next token &#9654;</button>' +
                        ' <button class="tf-btn" id="tf-reset-seq"' + (state.tokenIds.length === state.baseLen ? ' disabled' : '') + '>Reset sequence</button>' +
                        (atCap ? '<div class="tf-stat">maximum demo sequence length (' + TfCore.CFG.maxSeq + ') reached.</div>' : '') +
                        '<div class="tf-stat">greedy prediction after &quot;' + words().join(' ') + '&quot;: ' +
                        '<span style="color:' + C.newTok + ';">' + TfCore.VOCAB[state.trace.argmax] + '</span>' +
                        ' (p = ' + (state.trace.probs[state.trace.argmax] * 100).toFixed(1) + '%)</div></div>';
                }
            },
            {
                title: '10. Symmetry Check: Permutation Equivariance',
                boxes: [], lines: [],
                desc: function () {
                    return 'The headline identity: for the block <code>f</code> <b>without</b> positional encoding and ' +
                        '<b>without</b> the causal mask, permuting the input rows permutes the output rows the same way: ' +
                        '<code>f(PX) = P f(X)</code> exactly. Adding PE or the mask <b>breaks</b> the symmetry by a measurable ' +
                        'amount &mdash; which is precisely why they inject order. The residuals below are computed live on a ' +
                        'random feature matrix <code>X</code> and permutation <code>P</code>.';
                },
                viz: function () {
                    var rng = TfCore.makeRandn(TfCore.mulberry32(state.permSeed * 7919 + 1));
                    var X = TfCore.zeros(5, TfCore.CFG.dModel);
                    for (var i = 0; i < 5; i++) for (var j = 0; j < TfCore.CFG.dModel; j++) X[i][j] = rng();
                    var perm = [2, 0, 4, 1, 3];
                    var eq = TfCore.equivarianceResiduals(state.params, X, perm);
                    function row(name, v, exact) {
                        return '<tr><td>' + name + '</td><td style="color:' + (exact ? C.good : C.warn) + ';">' + v.toExponential(3) + '</td><td>' + (exact ? 'equivariant (&asymp; machine precision)' : 'symmetry broken') + '</td></tr>';
                    }
                    return '<table class="tf-eq"><tr><th>configuration</th><th>&Vert;f(PX) &minus; P f(X)&Vert;<sub>F</sub></th><th>verdict</th></tr>' +
                        row('plain block (no PE, no mask)', eq.plain, true) +
                        row('+ positional encoding', eq.withPE, false) +
                        row('+ causal mask', eq.withMask, false) +
                        '</table><div style="margin-top:10px;"><button class="tf-btn" id="tf-shuffle">Re-randomize X</button></div>';
                }
            }
        ];

        /* ---------------- static markup ---------------- */
        var svgHTML =
            '<svg width="290" height="615" viewBox="0 0 350 720" style="display:block;margin:0 auto;">' +
            '<defs>' +
            '<marker id="tf-arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse" viewBox="0 0 10 10"><path d="M0,0 L10,5 L0,10 z" fill="#445870"/></marker>' +
            '<marker id="tf-arrow-active" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse" viewBox="0 0 10 10"><path d="M0,0 L10,5 L0,10 z" fill="#69f0ae"/></marker>' +
            '</defs>' +
            '<text x="175" y="705" fill="#888" text-anchor="middle" font-size="14">Inputs</text>' +
            '<line id="tf-line-in-embed" class="comp-line" x1="175" y1="690" x2="175" y2="645" marker-end="url(#tf-arrow)"/>' +
            '<rect id="tf-box-embed" class="comp-box" x="75" y="600" width="200" height="40" rx="6"/>' +
            '<text id="tf-text-embed" class="comp-text" x="175" y="620">Embedding</text>' +
            '<line id="tf-line-embed-pos" class="comp-line" x1="175" y1="600" x2="175" y2="565" marker-end="url(#tf-arrow)"/>' +
            '<rect id="tf-box-pos" class="comp-box" x="75" y="520" width="200" height="40" rx="6"/>' +
            '<text id="tf-text-pos" class="comp-text" x="175" y="540">Positional Encoding</text>' +
            '<line id="tf-line-pos-mha" class="comp-line" x1="175" y1="520" x2="175" y2="465" marker-end="url(#tf-arrow)"/>' +
            '<rect x="35" y="170" width="280" height="300" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="5,5" rx="10"/>' +
            '<text x="50" y="160" fill="#888" font-size="12">Transformer Block</text>' +
            '<rect id="tf-box-mha" class="comp-box" x="75" y="420" width="200" height="40" rx="6"/>' +
            '<text id="tf-text-mha" class="comp-text" x="175" y="440">Masked Self-Attention</text>' +
            '<line id="tf-line-mha-norm1" class="comp-line" x1="175" y1="420" x2="175" y2="375" marker-end="url(#tf-arrow)"/>' +
            '<path id="tf-line-res1" class="comp-line" d="M 175 490 L 45 490 L 45 355 L 75 355" marker-end="url(#tf-arrow)"/>' +
            '<rect id="tf-box-norm1" class="comp-box" x="75" y="340" width="200" height="30" rx="6"/>' +
            '<text id="tf-text-norm1" class="comp-text" x="175" y="355">Add &amp; Norm</text>' +
            '<line id="tf-line-norm1-ffn" class="comp-line" x1="175" y1="340" x2="175" y2="305" marker-end="url(#tf-arrow)"/>' +
            '<rect id="tf-box-ffn" class="comp-box" x="75" y="260" width="200" height="40" rx="6"/>' +
            '<text id="tf-text-ffn" class="comp-text" x="175" y="280">Feed Forward</text>' +
            '<line id="tf-line-ffn-norm2" class="comp-line" x1="175" y1="260" x2="175" y2="215" marker-end="url(#tf-arrow)"/>' +
            '<path id="tf-line-res2" class="comp-line" d="M 175 320 L 45 320 L 45 195 L 75 195" marker-end="url(#tf-arrow)"/>' +
            '<rect id="tf-box-norm2" class="comp-box" x="75" y="180" width="200" height="30" rx="6"/>' +
            '<text id="tf-text-norm2" class="comp-text" x="175" y="195">Add &amp; Norm</text>' +
            '<line id="tf-line-norm2-linear" class="comp-line" x1="175" y1="180" x2="175" y2="135" marker-end="url(#tf-arrow)"/>' +
            '<rect id="tf-box-linear" class="comp-box" x="75" y="100" width="200" height="30" rx="6"/>' +
            '<text id="tf-text-linear" class="comp-text" x="175" y="115">Linear</text>' +
            '<line id="tf-line-linear-softmax" class="comp-line" x1="175" y1="100" x2="175" y2="55" marker-end="url(#tf-arrow)"/>' +
            '<rect id="tf-box-softmax" class="comp-box" x="75" y="20" width="200" height="30" rx="6"/>' +
            '<text id="tf-text-softmax" class="comp-text" x="175" y="35">Softmax</text>' +
            '<line id="tf-line-softmax-out" class="comp-line" x1="175" y1="18" x2="175" y2="5" marker-end="url(#tf-arrow)"/>' +
            '</svg>';

        container.innerHTML =
            '<div class="tf-demo">' +
            '<div class="tf-header"><div><div class="tf-title">Decoder Transformer: Exact Forward Pass</div>' +
            '<div class="tf-sub">seed <span id="tf-seed"></span> &middot; every displayed number is computed, none are scripted</div></div>' +
            '<div class="tf-controls">' +
            '<button class="tf-btn" id="tf-new-weights">New weights</button>' +
            '<button class="tf-btn" id="tf-reset-all">Reset demo</button>' +
            '<button class="tf-btn" id="tf-prev">&#9664; Prev</button>' +
            '<span id="tf-step-ind" style="font-family:monospace;font-size:0.85rem;"></span>' +
            '<button class="tf-btn" id="tf-next">Next &#9654;</button>' +
            '</div></div>' +
            '<div class="tf-body">' +
            '<div class="tf-svg-wrap">' + svgHTML + '</div>' +
            '<div class="tf-panel"><div class="tf-step-title" id="tf-title"></div>' +
            '<div class="tf-step-desc" id="tf-desc"></div>' +
            '<div class="tf-viz" id="tf-viz"></div>' +
            '<div class="tf-tokens" id="tf-tokens"></div></div>' +
            '</div></div>';

        function q(id) { return container.querySelector('#' + id); }

        /* ---------------- rendering ---------------- */
        function renderTokens() {
            var h = '<span style="color:' + C.muted + ';font-size:0.75rem;">sequence:</span>';
            for (var i = 0; i < state.tokenIds.length; i++) {
                var isNew = i >= state.baseLen;
                h += '<span class="tf-token' + (isNew ? ' tf-token-new' : '') + '">' + TfCore.VOCAB[state.tokenIds[i]] + '</span>';
            }
            q('tf-tokens').innerHTML = h;
        }

        function render() {
            var st = STEPS[state.step];
            q('tf-prev').disabled = (state.step === 0);
            q('tf-next').disabled = (state.step === STEPS.length - 1);
            q('tf-step-ind').textContent = (state.step + 1) + ' / ' + STEPS.length;
            q('tf-seed').textContent = String(state.seed);
            q('tf-title').textContent = st.title;
            q('tf-desc').innerHTML = st.desc();
            q('tf-viz').innerHTML = st.viz();
            renderTokens();

            /* SVG highlighting */
            var els = container.querySelectorAll('.comp-box, .comp-text, .comp-line');
            for (var e = 0; e < els.length; e++) els[e].classList.remove('active');
            var lines = container.querySelectorAll('.comp-line');
            for (e = 0; e < lines.length; e++) lines[e].setAttribute('marker-end', 'url(#tf-arrow)');
            st.boxes.forEach(function (id) {
                var b = q(id); if (b) b.classList.add('active');
                var t = q(id.replace('tf-box-', 'tf-text-')); if (t) t.classList.add('active');
            });
            st.lines.forEach(function (id) {
                var l = q(id);
                if (l) { l.classList.add('active'); l.setAttribute('marker-end', 'url(#tf-arrow-active)'); }
            });

            /* per-step dynamic controls */
            var predict = q('tf-predict');
            if (predict) predict.addEventListener('click', function () {
                if (state.tokenIds.length >= TfCore.CFG.maxSeq) return;
                var gs = TfCore.greedyStep(state.tokenIds, state.params, { usePE: true, causal: true });
                state.tokenIds = gs.appended;
                recompute(); render();
            });
            var resetSeq = q('tf-reset-seq');
            if (resetSeq) resetSeq.addEventListener('click', function () {
                state.tokenIds = TfCore.tokenIdsOf(TfCore.SENTENCE);
                recompute(); render();
            });
            var shuffle = q('tf-shuffle');
            if (shuffle) shuffle.addEventListener('click', function () {
                state.permSeed += 1; render();
            });
            var tabs = container.querySelectorAll('.tf-htab');
            for (var tb = 0; tb < tabs.length; tb++) {
                tabs[tb].addEventListener('click', function (ev) {
                    state.head = parseInt(ev.currentTarget.getAttribute('data-head'), 10);
                    render();
                });
            }
        }

        /* ---------------- global controls ---------------- */
        q('tf-prev').addEventListener('click', function () {
            if (state.step > 0) { state.step -= 1; render(); }
        });
        q('tf-next').addEventListener('click', function () {
            if (state.step < STEPS.length - 1) { state.step += 1; render(); }
        });
        q('tf-new-weights').addEventListener('click', function () {
            state.seed = 1 + Math.floor(Math.random() * 99999);
            state.params = TfCore.createParams(state.seed);
            state.tokenIds = TfCore.tokenIdsOf(TfCore.SENTENCE);
            recompute(); render();
        });
        q('tf-reset-all').addEventListener('click', function () {
            state.seed = TfCore.DEFAULT_SEED;
            state.params = TfCore.createParams(TfCore.DEFAULT_SEED);
            state.tokenIds = TfCore.tokenIdsOf(TfCore.SENTENCE);
            state.step = 0; state.head = 0; state.permSeed = 1;
            recompute(); render();
        });

        render();
    }

    if (typeof document === 'undefined') { return; }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();