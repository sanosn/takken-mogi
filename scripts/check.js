/* =========================================================
   問題データの機械チェック（見直し工程 その1）
   使い方:  node scripts/check.js [過去問テキストのフォルダ]
   - 形式の不整合（ID重複・項目の抜け・○×と解説の食い違い など）
   - 過去問の文章との重複（著作権対策。フォルダを指定したときだけ）
   - 本試験の出題数の表（EXAM_FREQ）が全論点をカバーしているか
   - 数字まとめ（NUMBERS）の項目の抜け
   問題が見つかったら「NG」を表示して終了コード1で終わる
   ========================================================= */
const fs = require("fs");
const path = require("path");
const { QUESTIONS, LAW_AS_OF, EXAM_FREQ, NUMBERS } = require("../questions.js");

const FIELDS = ["権利関係", "法令上の制限", "税・価格", "宅建業法", "5問免除"];
const PREFIX = { "権利関係": "ken", "法令上の制限": "ho", "税・価格": "zei", "宅建業法": "gyo", "5問免除": "men" };
const errors = [];
const warns = [];
const ng = (q, msg) => errors.push(`${q.id || "(idなし)"}: ${msg}`);

// ---- 1. 形式チェック ----
const ids = new Set();
const texts = new Map();
for (const q of QUESTIONS) {
  for (const k of ["id", "f", "t", "q", "e", "b"]) {
    if (typeof q[k] !== "string" || !q[k].trim()) ng(q, `項目 ${k} が空`);
  }
  if (typeof q.a !== "boolean") ng(q, "答え a が true/false ではない");
  if (ids.has(q.id)) ng(q, "ID が重複");
  ids.add(q.id);
  if (!FIELDS.includes(q.f)) ng(q, `分野名が不正: ${q.f}`);
  else if (!q.id.startsWith(PREFIX[q.f] + "-")) ng(q, `IDの略号と分野が合わない（${q.f}）`);
  // 解説の書き出しと答えが一致しているか
  if (q.a === true && !q.e.startsWith("正しい。")) ng(q, "答えは○なのに解説が「正しい。」で始まっていない");
  if (q.a === false && !q.e.startsWith("誤り。")) ng(q, "答えは×なのに解説が「誤り。」で始まっていない");
  // 問題文の重複
  const key = q.q.replace(/\s/g, "");
  if (texts.has(key)) ng(q, `問題文が ${texts.get(key)} と同じ`);
  texts.set(key, q.id);
  // ○×問題として答えがあいまいになりやすい表現
  if (/(すべて|必ず|一切)/.test(q.q)) warns.push(`${q.id}: 「すべて/必ず/一切」を含む（答えがあいまいでないか確認）`);
  if (q.q.length > 160) warns.push(`${q.id}: 問題文が長い（${q.q.length}文字）`);
}

// ---- 1-2. 出題数の表と数字まとめ ----
const topicKeys = new Set(QUESTIONS.map(q => q.f + "／" + q.t));
for (const k of topicKeys) {
  if (!(k in EXAM_FREQ)) errors.push(`EXAM_FREQ: 論点「${k}」の出題数がない`);
}
for (const [k, v] of Object.entries(EXAM_FREQ)) {
  if (!topicKeys.has(k)) errors.push(`EXAM_FREQ: 「${k}」に当たる問題がない（論点名の書き間違い？）`);
  if (typeof v !== "number" || v <= 0) errors.push(`EXAM_FREQ: 「${k}」の値が不正`);
}
for (const k of topicKeys) {
  const n = QUESTIONS.filter(q => q.f + "／" + q.t === k).length;
  // 本試験の1問あたり、少なくとも4問は用意する（少ないと答えを丸暗記してしまう）
  if (n < Math.max(3, Math.ceil(EXAM_FREQ[k] * 4))) warns.push(`論点「${k}」は年${EXAM_FREQ[k]}問出るのに${n}問しかない（目安${Math.max(3, Math.ceil(EXAM_FREQ[k] * 4))}問）`);
}
NUMBERS.forEach((x, i) => {
  for (const k of ["f", "item", "v", "b"]) if (typeof x[k] !== "string" || !x[k].trim()) errors.push(`NUMBERS[${i}]: 項目 ${k} が空`);
  if (!FIELDS.includes(x.f)) errors.push(`NUMBERS[${i}]: 分野名が不正: ${x.f}`);
});

// ---- 2. 過去問との重複チェック（著作権対策） ----
const N = 20; // この文字数以上の一致を「重複」とみなす
const pastDir = process.argv[2];
if (pastDir) {
  const norm = s => s.replace(/[\s　]/g, "");
  const grams = new Set();
  const files = fs.readdirSync(pastDir).filter(f => f.endsWith(".txt"));
  for (const f of files) {
    const t = norm(fs.readFileSync(path.join(pastDir, f), "utf8"));
    for (let i = 0; i + N <= t.length; i++) grams.add(t.slice(i, i + N));
  }
  for (const q of QUESTIONS) {
    for (const [label, s] of [["問題文", q.q], ["解説", q.e]]) {
      const t = norm(s);
      for (let i = 0; i + N <= t.length; i++) {
        if (grams.has(t.slice(i, i + N))) {
          ng(q, `${label}に過去問と${N}文字以上一致する部分あり:「${t.slice(i, i + N)}」`);
          break;
        }
      }
    }
  }
  console.log(`過去問との重複チェック: ${files.length}ファイルと照合（${N}文字一致で検出）`);
} else {
  console.log("過去問との重複チェック: スキップ（フォルダ未指定）");
}

// ---- 3. 集計 ----
console.log(`法令基準日: ${LAW_AS_OF}　問題数: ${QUESTIONS.length}　論点数: ${topicKeys.size}　年間出題数の合計: ${Object.values(EXAM_FREQ).reduce((a, b) => a + b, 0).toFixed(1)}　数字まとめ: ${NUMBERS.length}項目`);
for (const f of FIELDS) {
  const qs = QUESTIONS.filter(q => q.f === f);
  const o = qs.filter(q => q.a).length;
  console.log(`  ${f}: ${qs.length}問（○${o} / ×${qs.length - o}）`);
}
const oAll = QUESTIONS.filter(q => q.a).length;
const ratio = oAll / QUESTIONS.length;
console.log(`  ○の割合: ${Math.round(ratio * 100)}%`);
if (ratio > 0.7 || ratio < 0.3) warns.push(`○の割合が偏っている（${Math.round(ratio * 100)}%）`);

warns.forEach(w => console.log("注意 " + w));
if (errors.length) {
  errors.forEach(e => console.log("NG " + e));
  console.log(`\nNG ${errors.length}件`);
  process.exit(1);
}
console.log("\nOK 不整合は見つかりませんでした");
