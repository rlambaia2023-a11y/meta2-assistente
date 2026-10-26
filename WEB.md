# Web — qualquer navegador, iPhone ou Android (v0.3, 24/10)

Sem Mac, sem Xcode, sem instalar app nativo. Abra o endereço no navegador
do celular e use.

## O que a web faz

- 📷 Tirar foto pela câmera do celular, ou escolher da galeria uma foto
  já tirada pelo óculos (o app Meta AI salva a foto do óculos na galeria)
- 🎙️ Falar a dúvida (ditado do navegador — no Chrome Android funciona bem;
  no Safari do iPhone, se o ditado não aparecer, digite a dúvida)
- ▶️ Enviar e ouvir: o servidor analisa/resume/pesquisa e o navegador fala
  a resposta em pt-BR. Se o áudio do celular estiver saindo no óculos por
  Bluetooth, a voz sai no óculos. Se não, sai no celular.
- Modos: Resumo, Questão de estudo, Dúvida, Flashcards e Quiz falado (v0.4, 25/10)
- 🗂️ Flashcards: a IA cria 5 a 8 cards da foto, frente e verso, toque para revelar
- 🎯 Quiz falado: 5 perguntas de múltipla escolha, lidas em voz, com acertos e explicação
- 🕘 Histórico: os últimos 30 resumos ficam salvos só neste navegador, com botão para ouvir de novo

## Frente 1: ligar de verdade no Railway (25/10, pendente do usuário)

O serviço já está no ar em https://meta2-assistente-production.up.railway.app,
mas `/health` ainda mostra `ia_configurada: false` e `pesquisa_configurada: false`.
Só o dono da conta consegue colocar as chaves, então faça assim, sem colar
nenhuma chave no chat:

1. Railway > projeto humble-reflection > serviço meta2-assistente > Variables
2. `GEMINI_API_KEY` (obrigatória para responder de verdade, gratis no Google AI Studio)
3. `BRAVE_API_KEY` (opcional, pesquisa em tempo real)
4. `APP_USER` + `APP_PASSWORD` (recomendado para a versão web pública)
5. Redeploy, depois confira `/health`: tem que mostrar `ia_configurada: true`
6. Teste final: na página, modo Resumo, com uma foto real de apostila, e confira
   se a voz sai no celular e, se o óculos for a saída Bluetooth, no óculos

Sem essas chaves, a versão nova continua funcionando em demonstração, com
cards e quiz de exemplo claramente marcados como exemplo, e não como conteúdo
da sua foto.

## Limite honesto da versão web

O navegador **não acessa a câmera do óculos em tempo real** como o app
nativo OpenVision faz via DAT SDK. Na web o fluxo é:
óculos tira a foto > foto cai na galeria > você seleciona aqui > ouve o resumo.
Para streaming ao vivo do que o óculos está vendo, continua valendo o
OpenVision nativo. A web resolve o pedido de "rodar em qualquer navegador"
sem depender de Mac.

## Rodar agora, na mesma rede (teste rápido)

No PC ou servidor onde está esta pasta:

```bash
cd meta2-assistente
MODO_DEMO=1 node server.js
```

No celular, na mesma Wi-Fi, abra: `http://IP-DO-PC:3103`
(no PC, descubra o IP com `ipconfig` no Windows ou `hostname -I` no Linux).
No iPhone: Safari > Compartilhar > Adicionar à Tela de Início, vira "app".

## Rodar em qualquer lugar — Railway, passo a passo (pronto para subir)

Arquivos prontos nesta pasta: `Dockerfile` (node:22-slim, sem dependências),
`railway.json` (builder DOCKERFILE, igual ao sistema de correção),
`.gitignore` / `.dockerignore` (sem `.env`, sem `node_modules`), e o servidor
já respeita a `PORT` do Railway. Não precisa de Volume: o app é stateless,
não tem banco.

1. **GitHub:** crie um repo novo (ex.: `meta2-assistente`) e suba esta pasta
   inteira para ele. Se quiser, eu subo por aqui quando você confirmar o
   nome do repo — o fluxo é o mesmo do `fbbrmuseia`.
2. **Railway:** New Project > Deploy from GitHub Repo > selecione o repo.
   O Railway detecta o Dockerfile e inicia o deploy sozinho.
3. **Variáveis** (Railway > serviço > Variables):
   - `GEMINI_API_KEY` — só depois do teste em demo
   - `BRAVE_API_KEY` — opcional, pesquisa em tempo real
   - `APP_USER` + `APP_PASSWORD` — **recomendado**: sem senha, qualquer pessoa
     com o link usa sua chave de IA. Com senha, o navegador pede login antes
     de abrir a página.
   - Não precisa definir `PORT` — o Railway define sozinho.
4. **Domínio:** Settings > Networking > Generate Domain. Vai sair algo como
   `meta2-assistente-production.up.railway.app`.
5. **Teste, nesta ordem:**
   - Abra o link: sem senha configurada, a página abre; com senha, pede login
   - `https://SEU-LINK/health` mostra `ok: true`
   - Na página, modo Resumo, sem foto, com uma dúvida de teste: em modo demo
     (sem `GEMINI_API_KEY`) ele avisa que falta a chave — isso é o esperado
   - Depois de colocar as chaves, repita com uma foto real e confira se a
     voz sai no celular (e no óculos, se ele for a saída Bluetooth)
6. **No iPhone:** Safari > Compartilhar > Adicionar à Tela de Início, vira "app".

Se o deploy falhar, me mande o print/log do Railway que eu ajusto — os
erros mais comuns são repo sem o Dockerfile na raiz ou variável com espaço.

## Teste feito nesta VM

- `GET /` devolve a página web, `GET /health` ok
- `POST /api/foto` e `POST /v1/chat/completions` em modo demo devolvem
  o campo `fala` no formato esperado pelo front-end
- Falta testar com chave real + voz no celular do usuário (próximo passo)

## Versão web (v0.5, 26/10 — Gemini grátis, sem OpenAI paga)

Sem Mac/Xcode e sem conta OpenAI paga: abra `http://IP-DO-PC:3103` na mesma Wi-Fi, ou suba para o
Railway e abra o link público em qualquer celular. Guia completo em `WEB.md`.
Página em `public/index.html`: foto (câmera do celular ou foto do óculos na
galeria), dúvida por voz/digitada, resposta falada em pt-BR via voz do
navegador. Limite: navegador não acessa a câmera do óculos ao vivo — para
isso, continua valendo o OpenVision nativo.

### Chave grátis em 3 passos (só no Railway, nunca no chat)

1. Entre em aistudio.google.com/apikey com sua conta Google
2. Clique em Create API key e copie a chave
3. No Railway (projeto humble-reflection > serviço meta2-assistente > Variables),
   crie `GEMINI_API_KEY` com essa chave. Opcional: `GEMINI_MODEL=gemini-3.8-flash`
   (já é o padrão) e `BRAVE_API_KEY` para pesquisa em tempo real.
4. O Railway redeploya sozinho. Confira `/health`: tem que mostrar
   `ia_configurada: true` e `provedor: "gemini"`.

Limites do plano grátis: há limite de requisições por minuto/dia (varia por
modelo e aparece no painel do AI Studio), e no plano grátis o Google pode usar
prompts/respostas para melhorar os produtos — não envie dados sensíveis.
Não há mais volta à OpenAI neste backend: o provedor é só Gemini. Se houver variáveis OPENAI_* antigas no Railway, apague-as, pois são ignoradas. Na v0.6, a chamada interna também deixou de usar a base compatível com OpenAI do Gemini e passou a usar a API nativa `generateContent`.
