// leitor de CSV compartilhado
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "base-de-dados", "GoHacks_Talent_2026_bases_csv", "pagamentos");
module.exports.DIR = DIR;
module.exports.csv = function csv(file, sep = ",") {
  const t = fs.readFileSync(path.join(DIR, file), "utf8").replace(/^\uFEFF/, "");
  const rows = []; let r = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === sep) { r.push(f); f = ""; }
    else if (c === "\n") { r.push(f.replace(/\r$/, "")); rows.push(r); r = []; f = ""; }
    else f += c;
  }
  if (f || r.length) { r.push(f); rows.push(r); }
  const h = rows.shift();
  return rows.filter((x) => x.length === h.length).map((x) => Object.fromEntries(h.map((k, i) => [k, x[i]])));
};
