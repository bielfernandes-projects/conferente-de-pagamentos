// Arquivos de saída (saida/): lotes do motor, rodada do agente e histórico. Único lugar que sabe os nomes e os cortes de data.
const fs = require("fs"), path = require("path");
const P = require("./politica");

const DIR = path.join(__dirname, "saida");
const ler = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const gravar = (f, obj) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(path.join(DIR, f), JSON.stringify(obj, null, 1)); };
const diaDoArquivo = (f) => { const m = /^RM(\d{4})(\d{2})(\d{2})-(MER|LIT)\.json$/.exec(f); return m && `${m[1]}-${m[2]}-${m[3]}`; };

module.exports = {
  DIR,
  escreverLote: (res) => gravar(res.lote + ".json", res),
  lerLote: ler,
  // arquivos de lote até a data de corte (padrão: a semana avaliada), em ordem
  listarLotes: (ate = P.LOTES_ATE) => fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => diaDoArquivo(f) && diaDoArquivo(f) <= ate).sort() : [],
  arquivoDoLote: (dia, banco) => `RM${dia}-${banco}.json`,
  existe: (f) => fs.existsSync(path.join(DIR, f)),
  lerAgente: () => ler("agente_semana.json"),
  gravarAgente: (nome, obj) => gravar(nome, obj),
  lerHistorico: () => (fs.existsSync(path.join(DIR, "historico.json")) ? ler("historico.json") : []),
  anexarHistorico: (entrada) => { const h = module.exports.lerHistorico(); h.push(entrada); gravar("historico.json", h); },
  copiarParaHistorico: (origem, destino) => { fs.mkdirSync(path.join(DIR, "historico"), { recursive: true }); fs.copyFileSync(path.join(DIR, origem), path.join(DIR, "historico", destino)); },
};
