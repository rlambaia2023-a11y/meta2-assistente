# Assistente de estudo Ray-Ban Meta 2 — v0.1

## A verdade importante antes de tudo

O Ray-Ban Meta 2 **não roda app de terceiros dentro do óculos sozinho**.
O que funciona na prática, e é o que todos os projetos abaixo usam:

1. Óculos pareado com o celular (iPhone ou Android)
2. App companheiro no celular, usando o **Meta Wearables DAT SDK** oficial
3. No app Meta AI do celular: **Ajustes > App Info > tocar 5x no número da versão > ativar Developer Mode**
4. O app companheiro pega câmera + microfone do óculos e devolve áudio no alto-falante do óculos

Ou seja: a "IA do óculos" é o celular + nuvem. O óculos é câmera, microfone e fone.

## Repositórios pesquisados no GitHub (hoje, 24/10)

### Base recomendada — VisionClaw (2.600 ⭐, atualizado hoje)
https://github.com/Intent-Lab/VisionClaw
- TypeScript, iOS + Android, Gemini Live API + OpenClaw opcional
- Voz + visão em tempo real, ~1 quadro por segundo, áudio bidirecional
- Busca na web via OpenClaw, resposta falada
- É a base mais completa para "falo, ele vê, ele responde no ouvido"
- Atenção: o gateway padrão dele é piloto privado, sem código de acesso público. Para uso próprio, suba o `gateway/` dele ou use só o modo Gemini Live.

### Alternativa iPhone, mais privada — OpenVision (169 ⭐, atualizado hoje)
https://github.com/rayl15/OpenVision
- Swift, iOS 18+, 5 backends: MLX local, Apple Intelligence, OpenAI, Gemini Live, OpenClaw
- Busca ao vivo com Tavily (grátis) + DuckDuckGo de fallback, voz Kokoro local
- Tem modo offline com SmolVLM2. Bom se quiser custo zero e privacidade.

### Alternativa focada em estudo — RayBan Meta NoteBuddy (19 ⭐, atualizado hoje)
https://github.com/Alphonso84/RayBan_Meta_NoteBuddy
- Swift, iOS 26+, Meta Wearables SDK, OCR com Vision, resumo, flashcards e quiz
- É o mais próximo do seu sistema de correção: fotografa apostila, vira card de estudo
- Roteamento de áudio automático para o alto-falante do óculos

### Oficial da Meta — meta-wearables-dat-ios / meta-wearables-webapp
- https://github.com/facebook/meta-wearables-dat-ios — SDK oficial de câmera/stream
- https://github.com/facebook/meta-wearables-webapp — toolkit oficial (focado no modelo Display, serve de referência)

### Outros úteis
- GlassFlow (Intent-Lab): transcrição ao vivo + Gemini Live
- hermes-glasses: voz + visão, captura pela câmera do óculos, mapeamento de botão

## Nosso projeto (esta pasta)

Não reinventei o app do óculos. Criei o **cérebro em português** que pluga nessas bases:

- `server.js` — backend sem dependências, Node 20+
  - `GET /health`
  - `POST /api/foto` — `{ imagem_base64, pergunta?, modo: "resumo" | "questao-estudo" | "duvida" }`
  - `POST /api/duvida` — `{ pergunta }` — pesquisa em tempo real (Brave, mesma chave do PC) e responde curto
  - Resposta sempre: `{ fala, fontes, confianca }` — `fala` é o texto exato que o app deve falar, sem markdown, sem lista longa
- `prompts.md` — o prompt do sistema para colar no VisionClaw/OpenVision, com as regras de áudio curto e humanizado
- `.env.example` — chaves, sem valores

## Como usar no dia a dia (quando o app companheiro estiver instalado)

1. Coloque o óculos, abra o app companheiro no celular
2. "Tire uma foto e resuma" → foto → backend → resumo de 15 a 25 segundos no ouvido
3. "Tenho uma dúvida: ..." → backend pesquisa em tempo real → resposta mais certa, com grau de certeza, no ouvido
4. Para treino: fotografe um simulado → ele fala a resposta + o porquê curto + dica para decorar

## Limite que eu mantive de propósito

Este projeto é para **estudo e revisão: simulados, apostilas, slides**.
Não configurei um "modo prova ao vivo" que sussurra só a letra durante uma prova oficial em andamento. Isso é cola, pode anular a prova e manchar o histórico na faculdade. A mesma tecnologia, usada antes da prova para aprender o porquê, te deixa mais rápido na hora sem esse risco.

## Testar agora (sem óculos e sem chave)

```bash
cd ~/workspace/meta2-assistente
MODO_DEMO=1 PORT=3103 node server.js
curl http://localhost:3103/health
curl -X POST http://localhost:3103/api/duvida -H 'Content-Type: application/json' -d '{"pergunta":"teste"}'
```

Com chave de verdade: defina `OPENAI_API_KEY` e, para pesquisa ao vivo, `BRAVE_API_KEY`, e reinicie.

## Versão web (v0.4, 25/10 — evolução nas 3 frentes)

Novos modos no backend e na página: Flashcards (`POST /api/foto` com
`modo: "flashcards"`, devolve `cards`) e Quiz falado (`modo: "quiz"`, devolve
`perguntas` com alternativas, índice da correta e explicação), além de
histórico local dos últimos 30 resumos no navegador. Sem chave, os dois modos
devolvem exemplos de demonstração claramente marcados, não o conteúdo da foto.
Frente 1 (chaves no Railway) e frente 3 (OpenVision) estão detalhadas em
`WEB.md` e `IPHONE.md`. Teste local em modo demo em 25/10: `/health` ok,
flashcards e quiz demo ok, página com Histórico, Flashcards e Quiz falado ok.

## Versão web (v0.3, 24/10 — pedido do usuário: qualquer navegador, iPhone ou Android)

Sem Mac/Xcode: abra `http://IP-DO-PC:3103` na mesma Wi-Fi, ou suba para o
Railway e abra o link público em qualquer celular. Guia completo em `WEB.md`.
Página em `public/index.html`: foto (câmera do celular ou foto do óculos na
galeria), dúvida por voz/digitada, resposta falada em pt-BR via voz do
navegador. Limite: navegador não acessa a câmera do óculos ao vivo — para
isso, continua valendo o OpenVision nativo.

## IA grátis com Gemini (v0.5, 26/10)

O backend agora usa `GEMINI_API_KEY` por padrão (Google AI Studio, grátis),
pela base compatível com OpenAI do Gemini, modelo padrão `gemini-2.5-flash`.
A OpenAI continua funcionando como opção paga. Detalhes e passo a passo em `WEB.md`.
