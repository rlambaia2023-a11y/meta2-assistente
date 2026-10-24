# iPhone — OpenVision + NoteBuddy (escolha do usuário, 24/10)

## Papel de cada app — não instale os dois para a mesma coisa

- **OpenVision = uso no dia a dia, com o óculos na rua/na faculdade.**
  Voz + visão ao vivo, wake word "Ok Vision", resposta falada no alto-falante do óculos,
  busca ao vivo (Tavily grátis, DuckDuckGo de fallback).
- **NoteBuddy = hora de estudar sentado.**
  Fotografa apostila/slide pelo óculos, OCR, vira card, resumo, flashcard e quiz.
  Não é para conversa ao vivo, é para montar material de revisão.

Os dois usam o mesmo pareamento Meta. Não dá para usar os dois ao mesmo tempo
com a câmera do óculos — escolha um por sessão.

## Requisitos reais (confira antes de compilar)

| | OpenVision | NoteBuddy |
|---|---|---|
| iPhone | iOS 18+ (MLX local pede 15 Pro/16/17) | iOS 26+ |
| Apple Intelligence local | iOS 26+, 15 Pro ou mais novo | iOS 26+ (Foundation Models) |
| Mac para compilar | Xcode 15+ | Xcode 16+ |
| Conta Apple | gratuita serve para instalar no seu próprio iPhone | idem |
| Meta | App Meta AI + Developer Mode + App ID Meta Developer | App Meta AI + Developer Mode |

Ponto crítico: **compilar app iOS exige Mac com Xcode.** Você hoje tem PC Windows.
Sem Mac, as opções são: pedir um Mac emprestado, usar um Mac em nuvem, ou
esperar uma build pronta/TestFlight do projeto — não tem como gerar o .ipa
no Windows. Não vou fingir que dá.

## Passo a passo OpenVision (o primeiro a instalar)

1. No iPhone, app Meta AI > Ajustes > App Info > toque 5x no número da versão
   > ative Developer Mode.
2. Em https://developer.meta.com, crie um app e anote:
   `META_APP_ID` e o Client Token no formato `AR|SEU_APP_ID|SEU_TOKEN`.
3. No Mac:
   ```bash
   git clone https://github.com/rayl15/OpenVision.git
   cd OpenVision
   cp Config.xcconfig.example Config.xcconfig
   cp OpenVision/Config/Config.swift.example OpenVision/Config/Config.swift
   ```
   Preencha em `Config.xcconfig`: `DEVELOPMENT_TEAM`, `PRODUCT_BUNDLE_IDENTIFIER`
   (ex.: `com.seunome.openvision`), `META_APP_ID`, `CLIENT_TOKEN` e
   `APP_LINK_URL_SCHEME = openvision`.
4. Abra no Xcode, ligue o iPhone por USB, selecione o iPhone como destino e rode.
   Na primeira vez, no iPhone: Ajustes > Geral > VPN e Gerenciamento de Dispositivo
   > confie no seu certificado de desenvolvedor.
5. No app OpenVision > Ajustes:
   - Backend para começar: **Gemini Live** (voz + visão ao vivo, precisa de chave
     Gemini em https://aistudio.google.com/apikey) — ou **OpenAI** se preferir.
   - Voz: Apple (padrão) ou Kokoro local, se quiser offline.
   - Busca: coloque a chave Tavily gratuita; sem ela, usa DuckDuckGo.
   - Cole o prompt de `prompts.md` deste projeto onde o app permitir
     personalizar o comportamento — ele força resumo curto em pt-BR.
6. No app, toque em conectar os óculos e siga o registro via app Meta AI.
7. Teste sem sair de casa, nesta ordem:
   - "Ok Vision, tire uma foto e me diga o que é isto" (aposte num livro)
   - "Ok Vision, resuma isto em poucas frases"
   - "Ok Vision, qual a dose máxima de lidocaína com vasoconstritor para 70 kg?"
     (aqui ele deve pesquisar e responder curto, com certeza)

## Usando nosso backend como backend OpenAI do OpenVision (opcional, v0.2)

Se quiser que o OpenVision fale exatamente no nosso padrão pt-BR de estudo,
aponte o backend OpenAI dele para este servidor:

- Base URL: `http://<IP-do-seu-servidor>:3103/v1`
- Modelo: `meta2-assistente`
- Endpoint implementado: `POST /v1/chat/completions` (formato OpenAI).
- Com `OPENAI_API_KEY` + `BRAVE_API_KEY` no servidor, ele faz visão + pesquisa
  em tempo real e devolve só o texto falado. Sem chave, devolve aviso em modo demo.

Atenção: expor esse servidor na internet exige senha/rede privada. Por padrão,
use só na sua rede ou via Tailscale, nunca aberto sem autenticação.

## Passo a passo NoteBuddy (depois, para montar decks)

1. Requisitos: iPhone com iOS 26+, Xcode 16+, app Meta AI instalado.
2. Clone https://github.com/Alphonso84/RayBan_Meta_NoteBuddy
   (o README dele cita o nome antigo do repo no clone — use o link acima).
3. Abra o `.xcodeproj`, deixe o Xcode baixar o Meta Wearables SDK via Swift
   Package Manager, ajuste Signing para seu time e um bundle ID único.
4. Ative Developer Mode no app Meta AI (mesmo passo do OpenVision).
5. Rode no iPhone, aba Settings > Connect Glasses, depois aba Scan:
   aponte para a apostila, espere a borda ficar verde, capture, revise o
   resumo e salve no deck da matéria (ex.: Anestesiologia, Periodontia).

## O que falta você me dizer para eu fechar a build

1. Modelo do iPhone e versão do iOS (ex.: 15 Pro, iOS 26)?
2. Você tem acesso a um Mac com Xcode, ou prefere que eu deixe tudo pronto
   para compilar quando tiver?
3. Backend: prefere Gemini Live direto no OpenVision, ou nosso servidor
   com Brave + OpenAI (precisa das chaves no servidor)?
