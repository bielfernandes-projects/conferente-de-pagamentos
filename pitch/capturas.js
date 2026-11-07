// Prints da tela real do Conferente (plano B da demo). Abre a página no Chrome sem cabeça, rola até o trecho e tira o print.
//   node capturas.js   (precisa de conferente/saida/index.html: rode `node conferente/pagina.js` antes)
const fs = require("fs"), os = require("os"), path = require("path"), { spawnSync } = require("child_process");
const PAGINA = path.join(__dirname, "..", "conferente", "saida", "index.html");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(fs.existsSync);
if (!CHROME || !fs.existsSync(PAGINA)) { console.error("faltam o Chrome/Edge ou a página gerada"); process.exit(1); }
fs.mkdirSync(path.join(__dirname, "assets"), { recursive: true });

const DIA = "dia-2026-11-03";   // dia da demo: lote do Meridiano às 10h
const alvos = [
  { nome: "tela-resumo", sel: null, w: 1280, h: 880 },
  { nome: "tela-dossie", sel: "[...document.querySelectorAll('#passo-ligar .card')].find((c) => c.textContent.includes('Embalarte'))", w: 1280, h: 700 },
  { nome: "tela-caso", sel: "[...document.querySelectorAll('.linha')].find((l) => l.textContent.includes('TP429865'))", w: 1280, h: 300 },
];
const base = fs.readFileSync(PAGINA, "utf8");
for (const a of alvos) {
  // extrai o trecho para uma página limpa (mesmos estilos, dentro de um cartão branco), em vez de rolar a janela
  const js = a.sel ? `<script>(()=>{const el=${a.sel};if(!el)return;const w=document.createElement('main');w.className='wrap';w.style.paddingTop='24px';const h=document.createElement('div');h.className='card';h.appendChild(el.cloneNode(true));w.appendChild(h);document.body.innerHTML='';document.body.appendChild(w)})()</script>` : "";
  const tmp = path.join(os.tmpdir(), `captura-${a.nome}.html`);
  fs.writeFileSync(tmp, base.replace("</body>", js + "</body>"));
  const out = path.join(__dirname, "assets", a.nome + ".png");
  const r = spawnSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${path.join(os.tmpdir(), "chrome-capturas")}`, `--window-size=${a.w},${a.h}`, `--screenshot=${out}`, "file:///" + tmp.replace(/\\/g, "/") + "#" + DIA], { encoding: "utf8" });
  console.log(a.nome, fs.existsSync(out) ? Math.round(fs.statSync(out).size / 1024) + " KB" : "FALHOU " + (r.stderr || "").slice(0, 120));
}
