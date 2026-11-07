// Compara as decisões do motor atual com o baseline congelado (saida/baseline). Uso: node tests/comparar_baseline.js
const fs = require("fs"), path = require("path");
const { classificar } = require("../engine");
const D = require("../dados");
const base = path.join(__dirname, "..", "saida", "baseline");
const lotes = [...new Set(D.carregar().agenda.map((x) => x.lote_remessa))].sort();
let iguais = 0, difs = [];
for (const l of lotes) {
  const antes = JSON.parse(fs.readFileSync(path.join(base, l + ".json"), "utf8")).decisoes;
  const depois = classificar(l).decisoes;
  if (antes.length !== depois.length) { difs.push(`${l}: ${antes.length} vs ${depois.length} títulos`); continue; }
  antes.forEach((a, i) => { const b = depois[i];
    const k = JSON.stringify([a.titulo_id, a.decisao, a.motivo, a.valor, a.assinatura, a.alcada, a.aprovador]) === JSON.stringify([b.titulo_id, b.decisao, b.motivo, b.valor, b.assinatura, b.alcada, b.aprovador]);
    if (k) iguais++; else difs.push(`${l} ${a.titulo_id}: [${a.decisao}] ${a.motivo.slice(0, 70)}  →  [${b.decisao}] ${b.motivo.slice(0, 70)}`); });
}
console.log(`lotes: ${lotes.length} | decisões idênticas: ${iguais} | diferentes: ${difs.length}`);
difs.forEach((d) => console.log(" -", d));
