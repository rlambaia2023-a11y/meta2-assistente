// Assistente de ESTUDO para Ray-Ban Meta (2a geracao) — versao 0.1
// Sem dependencias externas: so Node 20+ (fetch nativo).
// Arquitetura real:
//   Oculos (camera + microfone + alto-falante) <-> App companheiro no celular
//   (VisionClaw / OpenVision, via Meta Wearables DAT SDK + Developer Mode)
//   <-> este backend (visao + pesquisa em tempo real) -> texto curto -> o app FALA.
// O oculos sozinho nao roda app de terceiros: nao existe "instalar no oculos".
// Uso previsto: simulados, apostilas, slides e revisao — NAO prova oficial em andamento.
//
// Variaveis de ambiente (nunca commitar valores):
//   PORT=3103 (padrao)
//   OPENAI_API_KEY + OPENAI_BASE_URL (opcional, padrao api.openai.com)
//   OPENAI_VISION_MODEL (padrao gpt-4o-mini)
//   BRAVE_API_KEY (opcional, mesma chave ja usada no PC p/ Correcao Inteligente)
//   MODO_DEMO=1 (responde sem chamar IA, so para testar o pipeline foto->audio)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };

const PORT = Number(process.env.PORT || 3103);

// ---------- Prompt do sistema: e o coracao do "so o resumo, por audio" ----------
export const SYSTEM_PROMPT = `Voce e um assistente de estudo falado, em portugues brasileiro, humanizado e direto.
Regras absolutas de fala:
- Responda APENAS o que sera falado no alto-falante do oculos. Nada de markdown, listas longas, emojis ou explicacao extra.
- Resumo: no maximo 3 frases curtas, cerca de 15 a 25 segundos de fala.
- Duvida: responda a duvida com a informacao mais certa que encontrar, em 2 a 4 frases, e diga o grau de certeza ("tenho bastante certeza" / "provavel" / "nao tenho certeza").
- Se a imagem estiver ilegivel ou cortada, diga isso em uma frase e peca para aproximar ou tirar de novo. Nunca invente o que nao da para ler.
- Questao de ESTUDO (simulado/treino): primeiro diga a resposta em uma frase com o porquê curto, depois, se couber, uma dica para decorar. Nunca responda apenas com uma letra seca sem o porquê: o objetivo e aprender, nao decorar a letra.
- Linguagem natural, como um colega explicando, sem abertura de chatbot ("Claro!", "Otima pergunta!").
- Nunca afirme 100% de certeza em saude: diga a fonte quando houver pesquisa.`;

// Pesquisa em tempo real na Brave Search API (mesmo padrao do sistema de correcao).
async function pesquisarBrave(consulta) {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return [];
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(consulta)}&count=5&search_lang=pt&country=BR`;
    const r = await fetch(url, { headers: { "Accept": "application/json", "X-Subscription-Token": key } });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.web?.results || []).slice(0, 5).map((x) => ({ titulo: x.title, url: x.url, trecho: x.description || "" }));
  } catch { return []; }
}

// Chamada de visao/texto via API compativel com OpenAI. Se nao houver chave, retorna null.
async function chamarIA({ texto, imagemBase64, contextoPesquisa, promptSistema }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const userParts = [{ type: "text", text: texto }];
  if (imagemBase64) {
    const dataUrl = imagemBase64.startsWith("data:") ? imagemBase64 : `data:image/jpeg;base64,${imagemBase64}`;
    userParts.push({ type: "image_url", image_url: { url: dataUrl } });
  }
  const contexto = contextoPesquisa?.length
    ? `\n\nResultados de pesquisa em tempo real (use-os, nao invente):\n${contextoPesquisa.map((f, i) => `${i + 1}. ${f.titulo} — ${f.trecho} (${f.url})`).join("\n")}`
    : "";
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      model, temperature: 0.2, max_tokens: 400,
      messages: [
        { role: "system", content: promptSistema || SYSTEM_PROMPT },
        { role: "user", content: [...userParts.slice(0, 1), { type: "text", text: (texto + contexto) }, ...userParts.slice(1)] },
      ],
    }),
  });
  if (!r.ok) throw new Error(`IA retornou ${r.status}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || "").trim();
}

// Extrai o primeiro objeto JSON de um texto (a IA as vezes devolve com cercas de codigo).
function extrairJson(texto) {
  if (!texto) return null;
  const limpo = String(texto).replace(/```json|```/g, "").trim();
  const ini = limpo.indexOf("{"), fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try { return JSON.parse(limpo.slice(ini, fim + 1)); } catch { return null; }
}

function lerJson(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 12 * 1024 * 1024) req.destroy(); });
    req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch { reject(new Error("JSON invalido")); } });
    req.on("error", reject);
  });
}

function enviar(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj, null, 2));
}

const server = http.createServer(async (req, res) => {
  try {
    // Senha opcional (igual ao sistema de correcao): se APP_USER + APP_PASSWORD
    // estiverem definidos no Railway, tudo exceto /health exige Basic Auth.
    // Sem elas, o site fica aberto — use assim so para testar em modo demo,
    // nunca com chave de IA paga e link publico.
    if (process.env.APP_USER && process.env.APP_PASSWORD) {
      const pathname0 = new URL(req.url, "http://localhost").pathname;
      if (pathname0 !== "/health") {
        const auth = req.headers.authorization || "";
        const esperado = "Basic " + Buffer.from(`${process.env.APP_USER}:${process.env.APP_PASSWORD}`).toString("base64");
        if (auth !== esperado) {
          res.writeHead(401, { "WWW-Authenticate": 'Basic realm="meta2-assistente"', "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ erro: "Login necessario." }));
        }
      }
    }
    // Web app: qualquer navegador, iPhone ou Android.
    if (req.method === "GET") {
      const pathname = new URL(req.url, "http://localhost").pathname;
      if (pathname === "/" || pathname === "/index.html" || pathname === "/manifest.json") {
        const file = pathname === "/" ? "index.html" : pathname.slice(1);
        const full = path.join(PUBLIC_DIR, file);
        if (fs.existsSync(full) && full.startsWith(PUBLIC_DIR)) {
          res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream" });
          return res.end(fs.readFileSync(full));
        }
      }
    }
    if (req.method === "GET" && req.url === "/health") {
      return enviar(res, 200, { ok: true, servico: "meta2-assistente", ia_configurada: Boolean(process.env.OPENAI_API_KEY), pesquisa_configurada: Boolean(process.env.BRAVE_API_KEY), modo_demo: process.env.MODO_DEMO === "1" });
    }

    // POST /api/foto — { imagem_base64, pergunta?, modo: "resumo" | "questao-estudo" | "duvida" }
    if (req.method === "POST" && req.url === "/api/foto") {
      const body = await lerJson(req);
      const modo = body.modo || "resumo";
      const pergunta = (body.pergunta || "").trim();
      if (!body.imagem_base64 && !pergunta) return enviar(res, 400, { erro: "Envie imagem_base64 ou pergunta." });

      if (process.env.MODO_DEMO === "1" || !process.env.OPENAI_API_KEY) {
        const demo = process.env.MODO_DEMO === "1";
        const falaBase = demo
          ? "Modo de teste: recebi sua foto. Aqui vai sair o resumo falado quando a chave da IA estiver configurada."
          : "Falta configurar a chave da IA. No servidor, defina OPENAI_API_KEY e reinicie, que eu passo a responder de verdade.";
        if (modo === "flashcards") {
          return enviar(res, 200, {
            fala: demo ? "Exemplo de demonstração, não é o conteúdo da sua foto. Com a chave configurada, aqui viram os flashcards da sua apostila." : falaBase,
            modo, fontes: [], confianca: "demo/sem-chave",
            cards: demo ? [
              { frente: "Exemplo: o que é miose?", verso: "Miose é a constrição da pupila, por ação do músculo esfíncter da íris." },
              { frente: "Exemplo: qual nervo comanda a miose?", verso: "O parassimpático, pelo nervo oculomotor." },
              { frente: "Exemplo: o que causa midríase?", verso: "Dilatação da pupila, o oposto da miose, por ação simpática ou bloqueio parassimpático." },
            ] : [],
            observacao: "Configure OPENAI_API_KEY (e BRAVE_API_KEY para pesquisa em tempo real).",
          });
        }
        if (modo === "quiz") {
          return enviar(res, 200, {
            fala: demo ? "Exemplo de demonstração, não é o conteúdo da sua foto. Com a chave configurada, aqui vira um quiz falado da sua apostila." : falaBase,
            modo, fontes: [], confianca: "demo/sem-chave",
            perguntas: demo ? [
              { pergunta: "Exemplo: miose é constrição ou dilatação da pupila?", alternativas: ["Constrição", "Dilatação", "Tremor", "Desvio"], correta: 0, explicacao: "Miose é a constrição, feita pelo esfíncter da íris." },
              { pergunta: "Exemplo: midríase é o oposto de miose?", alternativas: ["Não", "Sim", "Só em criança", "Só à noite"], correta: 1, explicacao: "Sim, midríase é a dilatação da pupila." },
            ] : [],
            observacao: "Configure OPENAI_API_KEY (e BRAVE_API_KEY para pesquisa em tempo real).",
          });
        }
        return enviar(res, 200, {
          fala: falaBase,
          modo, fontes: [], confianca: "demo/sem-chave", observacao: "Configure OPENAI_API_KEY (e BRAVE_API_KEY para pesquisa em tempo real).",
        });
      }

      // Modos estruturados novos (v0.4): flashcards e quiz devolvem JSON alem da fala.
      if (modo === "flashcards" || modo === "quiz") {
        const fontes = pergunta ? await pesquisarBrave(pergunta) : [];
        const promptJson = "Voce devolve APENAS um objeto JSON valido, sem markdown, sem texto fora do JSON, em portugues brasileiro.";
        const instrucaoJson = modo === "flashcards"
          ? `A partir da foto e da pergunta, crie 5 a 8 flashcards de estudo. Formato exato: {"resumo":"uma frase do tema","cards":[{"frente":"pergunta curta","verso":"resposta curta com o porquê"}]}. Pergunta do usuario: ${pergunta || "(esta na foto)"}`
          : `A partir da foto e da pergunta, crie 5 perguntas de multipla escolha para revisao. Formato exato: {"resumo":"uma frase do tema","perguntas":[{"pergunta":"texto","alternativas":["a","b","c","d"],"correta":0,"explicacao":"porquê curto"}]}. O indice correta vai de 0 a 3. Pergunta do usuario: ${pergunta || "(esta na foto)"}`;
        const textoJson = await chamarIA({ texto: instrucaoJson, imagemBase64: body.imagem_base64 || null, contextoPesquisa: fontes, promptSistema: promptJson });
        const dados = extrairJson(textoJson) || {};
        return enviar(res, 200, {
          fala: dados.resumo || (modo === "flashcards" ? "Flashcards prontos. Toque em um card para ver a resposta." : "Quiz pronto. Vou ler a primeira pergunta para você."),
          modo, fontes: fontes.map((f) => f.url), confianca: fontes.length ? "com-pesquisa" : "sem-pesquisa",
          cards: Array.isArray(dados.cards) ? dados.cards : [],
          perguntas: Array.isArray(dados.perguntas) ? dados.perguntas : [],
        });
      }

      const fontes = pergunta ? await pesquisarBrave(pergunta) : [];
      const instrucao = modo === "questao-estudo"
        ? `Esta e uma questao de ESTUDO (simulado/treino), nao uma prova oficial em andamento. Transcreva o enunciado com fidelidade, analise as alternativas e responda falando: a resposta + o porquê curto + dica para decorar. Pergunta do usuario: ${pergunta || "(esta na foto)"}`
        : modo === "duvida"
        ? `Responda esta duvida falando, com base na foto e na pesquisa em tempo real: ${pergunta || "(veja a foto)"}`
        : `Resuma o que esta na foto falando, em no maximo 3 frases. Se for texto longo, resuma so o essencial. Pergunta do usuario: ${pergunta || "(nenhuma, so resuma)"}`;
      const fala = await chamarIA({ texto: instrucao, imagemBase64: body.imagem_base64 || null, contextoPesquisa: fontes });
      return enviar(res, 200, { fala, modo, fontes: fontes.map((f) => f.url), confianca: fontes.length ? "com-pesquisa" : "sem-pesquisa" });
    }

    // POST /api/duvida — so voz/texto, sem foto: { pergunta }
    if (req.method === "POST" && req.url === "/api/duvida") {
      const body = await lerJson(req);
      const pergunta = (body.pergunta || "").trim();
      if (!pergunta) return enviar(res, 400, { erro: "Envie pergunta." });
      if (process.env.MODO_DEMO === "1") {
        return enviar(res, 200, { fala: "Modo de teste: recebi sua duvida. Aqui vai sair a resposta pesquisada em tempo real quando a chave da IA estiver configurada.", fontes: [], confianca: "demo" });
      }
      if (!process.env.OPENAI_API_KEY) {
        return enviar(res, 200, { fala: "Ainda falta configurar a chave da IA para eu pesquisar e responder de verdade.", fontes: [], confianca: "sem-chave" });
      }
      const fontes = await pesquisarBrave(pergunta);
      const fala = await chamarIA({ texto: `Responda falando esta duvida: ${pergunta}`, imagemBase64: null, contextoPesquisa: fontes });
      return enviar(res, 200, { fala, fontes: fontes.map((f) => f.url), confianca: fontes.length ? "com-pesquisa" : "sem-pesquisa" });
    }

    // POST /v1/chat/completions — compatibilidade OpenAI para o OpenVision.
    // Permite apontar o backend "OpenAI" do OpenVision para este servidor:
    // base URL = http://<seu-servidor>:3103/v1  (ou o /api/foto direto, se preferir).
    // O OpenVision ja fala o texto de volta no alto-falante do oculos.
    if (req.method === "POST" && req.url === "/v1/chat/completions") {
      const body = await lerJson(req);
      const messages = Array.isArray(body.messages) ? body.messages : [];
      let pergunta = "", imagemBase64 = null;
      for (const m of messages) {
        if (m.role !== "user") continue;
        if (typeof m.content === "string") pergunta = m.content;
        else if (Array.isArray(m.content)) {
          for (const p of m.content) {
            if (p.type === "text") pergunta += (pergunta ? " " : "") + p.text;
            if (p.type === "image_url") imagemBase64 = p.image_url?.url || null;
          }
        }
      }
      let fala;
      if (process.env.MODO_DEMO === "1" || !process.env.OPENAI_API_KEY) {
        fala = "Modo de teste do seu assistente de estudo: recebi sua foto ou duvida. Com a chave da IA configurada, aqui vai o resumo falado em portugues, curto e humanizado.";
      } else {
        const fontes = pergunta ? await pesquisarBrave(pergunta) : [];
        fala = await chamarIA({ texto: pergunta || "Resuma o que esta na foto falando, em no maximo 3 frases.", imagemBase64, contextoPesquisa: fontes });
      }
      return enviar(res, 200, { id: "chatcmpl-meta2", object: "chat.completion", model: body.model || "meta2-assistente", choices: [{ index: 0, message: { role: "assistant", content: fala }, finish_reason: "stop" }] });
    }

    return enviar(res, 404, { erro: "Rota nao encontrada. Use GET /health, POST /api/foto ou POST /api/duvida." });
  } catch (e) {
    return enviar(res, 500, { erro: String(e.message || e) });
  }
});

server.listen(PORT, () => console.log(`meta2-assistente ouvindo em http://localhost:${PORT} (GET /health)`));
