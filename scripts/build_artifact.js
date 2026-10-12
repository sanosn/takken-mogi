/* =========================================================
   Artifact（claude.ai 上のページ）用の1ファイルを作る
   使い方:  node scripts/build_artifact.js
   出力:    dist/takken-sofukushu.html
   - index.html に questions.js を埋め込んで1ファイルにする
   - Artifact では使えない部分（<html>/<head> の枠、マニフェスト、
     オフライン用のサービスワーカー）を取り除く
   ========================================================= */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const questions = fs.readFileSync(path.join(root, "questions.js"), "utf8");

const replaceOnce = (from, to) => {
  const found = from instanceof RegExp ? from.test(html) : html.includes(from);
  if (!found) {
    throw new Error("見つかりません: " + from);
  }
  html = html.replace(from, to);
};

// 1. 文書の枠（Artifact 側で自動的に付く）
replaceOnce(/<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, "");
replaceOnce(/<meta charset="utf-8">\s*/, "");
replaceOnce(/<meta name="viewport"[^>]*>\s*/, "");
html = html.replace(/<meta name="(apple-mobile-web-app-[^"]+|mobile-web-app-capable|theme-color)"[^>]*>\s*/g, "");
replaceOnce(/<link rel="manifest"[^>]*>\s*/, "");
replaceOnce(/<link rel="apple-touch-icon"[^>]*>\s*/, "");
replaceOnce(/<\/head>\s*<body>\s*/i, "");
replaceOnce(/\s*<\/body>\s*<\/html>\s*$/i, "\n");

// 2. 問題データを埋め込む
if (questions.includes("</script")) throw new Error("questions.js に </script が含まれています");
replaceOnce('<script src="questions.js"></script>', `<script>\n${questions}</script>`);

// 3. サービスワーカー（Artifact では動かない）
replaceOnce(/\n\/\/ オフラインで使えるようにする[\s\S]*?\n}\n/, "\n");

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist", "takken-sofukushu.html");
fs.writeFileSync(out, html, "utf8");
console.log("作成しました: " + out + "（" + Math.round(Buffer.byteLength(html) / 1024) + " KB）");
