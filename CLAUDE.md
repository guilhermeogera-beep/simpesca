# Simulador de Pesca — Documentação do Projeto

## ⚡ Arquitetura ATUAL: Bluetooth (BLE) + PWA no GitHub

> **Esta é a versão em uso.** A versão antiga (Wi-Fi AP + vídeos no SD servidos pelo ESP32) foi abandonada porque o streaming de vídeo grande pelo Wi-Fi do ESP32-C3 causava travamento/brownout. A documentação dela continua abaixo como referência histórica.

**Como funciona:**
- O **app web (PWA)** é hospedado no GitHub Pages: `https://guilhermeogera-beep.github.io/simpesca/`
- O usuário instala o PWA e **baixa os vídeos** (1x, com internet) — ficam em cache offline
- No local sem internet, abre o app (carrega do cache) e conecta no ESP32 por **Bluetooth (Web Bluetooth)**
- O **ESP32 só controla o motor** (recebe a potência 0–100 por BLE e aplica no DAC). Sem Wi-Fi, sem SD, sem HTTP.

**Por que BLE:** páginas HTTPS (GitHub) não podem abrir `ws://` (mixed content), e Service Worker (cache offline) exige HTTPS. Web Bluetooth funciona a partir de HTTPS e offline. Limitação: **iPhone não tem Web Bluetooth** (usar PC com Chrome/Edge ou Android).

### Hardware da versão BLE
- ESP32-C3 Mini
- MCP4725 (I2C 0x60) — motor, saída 1.0–3.5V
- **AS5600** (I2C 0x36) — encoder magnético de ângulo absoluto (mede a linha recolhida)
- Tudo no MESMO barramento I2C: SDA=8, SCL=9. AS5600 também: VCC=3.3V, GND, ímã diametral no eixo.

### Arquivos da versão BLE
```
esp32_bluetooth/
  esp32_bluetooth.ino    — firmware BLE (BLE nativo do ESP32 + MCP4725 + AS5600)

site/  ← FONTE CANÔNICA do PWA (publicar em /simpesca/ no GitHub)
  index.html             — landing: instalar PWA + baixar vídeos (barra de progresso)
  player.html            — app principal: BLE, vídeos, rampa→motor, linha ao vivo, nome+ranking
  dashboard.html         — editor de curva POR PONTOS (90s) + copiar/colar curva + calibração encoder
  ranking.html           — ranking dos jogadores (metros recolhidos), por sim, ordenado
  service-worker.js      — cache: SHELL (rede-primeiro) + MEDIA (vídeos, persistente)
  manifest.json          — manifesto do PWA
```
> **NOTA (OneDrive):** o PWA estava na "Área de Trabalho/simulador de pesca", mas o OneDrive
> desidratou/moveu essa pasta. A cópia confiável passou a ser `site/` aqui no projeto.
> **Ícones e vídeos** (`icons/`, `video0..2.mp4`) já estão no GitHub — só re-suba os .html/.js.

### BLE — protocolo
- Service UUID: `a1b2c3d4-0001-4a5b-8c6d-1234567890ab`
- **Motor** `a1b2c3d4-0002-...` (WRITE + WRITE_NR): app escreve **1 byte (0–100)** = potência %.
- **Linha** `a1b2c3d4-0003-...` (READ + NOTIFY + WRITE): ESP32 **notifica** a contagem do encoder
  como **int32 little-endian** (4096 contagens/volta); app **escreve** qualquer valor para **zerar**.
- Ao desconectar, o ESP32 **zera o motor** (segurança) e volta a anunciar.
- **Trava de segurança (watchdog):** o app envia a potência ~10x/s durante a sim; se o ESP32 ficar
  `MOTOR_TIMEOUT_MS` (1200ms) **sem comando** com o motor ligado, ele **zera o DAC sozinho** —
  cobre queda de BLE/app travado mesmo se o `onDisconnect` não disparar. No app, perder a conexão
  **pausa a simulação** em andamento (`gattserverdisconnected` → `pausarSim`).
- Gatilhos processados **no app (JS)**; o ESP32 só recebe potência e envia a contagem.

### Encoder / Ranking (no app)
- `metros = (contagem / 4096) × metrosPorVolta` (× -1 se inverter direção).
- **Player conta só o que RECOLHEU (ganhos):** acumula apenas os deltas positivos (`metrosGanhos`)
  enquanto a flag `contando` está ligada. Liga em `iniciarSim`, desliga em `pausarSim`/`encerrarSim`
  — ou seja, **ao acabar os 90s a leitura para**. `metrosAtuais()` retorna `metrosGanhos` (vai pro HUD e ranking).
- **Por jogada vs. acumulado:** o `metrosGanhos` (HUD/ranking) **zera a cada jogo** via
  `novoJogoContadores()` (em `iniciarSim`) — mas isso **NÃO zera o encoder**. A **linha do carretel**
  (`linhaCarretel()` = `contagemParaMetros(contagemEncoder)`, posição absoluta) **acumula entre jogadores**
  e só zera no **re-spool manual** (`zerarEncoder`: botão **⟲ LINHA** no player / **⟲ Zerar contagem** no dashboard).
- **Dashboard (teste):** card mostra Ganhos / Perdidos (deltas do teste) e **📍 Linha no carretel** (= `linhaCarretel`, o que dispara a trava).
- Calibração em `localStorage`: `simpesca_cal_mpv` (metros por volta), `simpesca_cal_inv` ('0'/'1'),
  `simpesca_cal_limite` (**limite de linha em m**, padrão 50 — total que o carretel/vara comporta).
  Ajustável no dashboard (inclui assistente: zerar → recolher X m → calcular m/volta).
- **Limite de linha (trava de segurança):** `simpesca_cal_limite` (padrão **-50**; aceita **+ ou −**),
  ajustável no dashboard (card de contadores). O **player NÃO mostra** o limite (HUD exibe só os metros).
  A trava usa a **linha absoluta do carretel** `linhaCarretel()` (posição líquida do encoder, que
  **ACUMULA entre jogadores**) comparada por **valor absoluto**: quando `|linhaCarretel| ≥ |limite|`,
  o motor para — no player `pausarSim`, no dashboard `stopSim`+`aplicarMotor(0)` (flag `travaAtiva`).
- **Bloqueio enquanto travado:** `aplicarMotor` (player e dashboard) força **0** enquanto `travado()`,
  então play/manual **não rodam o motor** acima do limite. A linha mora **no app/encoder** (não precisa
  reiniciar o ESP): libera no **re-spool** (`zerarEncoder` — ⟲ LINHA no player / ⟲ Zerar contagem no
  dashboard, que também manda zerar a contagem no ESP) ou quando a linha cai abaixo do limite.
  **Não zera entre jogadas** (de propósito: a linha é compartilhada e pode acabar ao longo das jogadas).
- Ranking em `localStorage` `simpesca_ranking`: `[{nome, metros, sim, data}]`. Nome digitado
  antes de cada jogada; salvo ao terminar o vídeo. Visualização em `ranking.html` **e** num
  **painel sobreposto dentro do `player.html`** (`abrirRanking()`/`rankingOverlay`) — assim o botão
  🏆 RANKING **não navega** e o **Bluetooth não cai** (Web Bluetooth morre ao trocar de página).
- Ao terminar, o `player.html` mostra a **posição dentro da mesma Sim** (🥇/🥈/🥉 + "Nº de N"),
  com aviso de **"Novo recorde!"** (1º lugar) ou **"Primeira jogada!"** (1ª vez na sim).

---

## 🔜 Pendências / próximos passos

1. ✅ **FEITO — Editor por pontos.** O `dashboard.html` agora monta a curva clicando/arrastando
   pontos `{t, pot}` na linha do tempo; o player interpola essa curva. Conversão automática dos
   perfis antigos (gatilhos→pontos). Inclui copiar/colar curva entre Sims.
2. Calibrar o encoder AS5600 no dashboard quando o módulo chegar.
3. Subir o vídeo definitivo de 90s. (O SW usa **rede-primeiro** no app, então o HTML novo entra
   sozinho online; só os **vídeos** podem exigir rebaixar se trocarem — ou bumpar `MEDIA_CACHE`.)

### Motor (no app) — MODELO POR PONTOS (atual)
A potência agora é uma **curva de pontos** `{t, pot}` por simulação. O motor segue a
**interpolação linear** entre pontos consecutivos (`interpolarPontos(pontos, t)`), no tempo
do vídeo (player) ou no preview (dashboard).
- Storage: `simpesca_pontos_A|B|C` (array de `{t, pot}`).
- **Migração automática:** se não houver pontos salvos, o app converte os gatilhos antigos
  (`simpesca_gatilhos_*` ou os padrões embutidos `GATILHOS_PADRAO`) em pontos via
  `gatilhosParaPontos()` (amostra as fases sub/pico/trans/pico2/desc como pontos).
- O formato antigo de **gatilhos** (sub1→pico1→trans→pico2→desc) virou só fonte de migração;
  o editor visual passou a ser por pontos (clicar/arrastar). Import aceita os dois formatos.

### Editor de pontos — seleção e atalhos (dashboard)
- **Clique** = novo ponto · **arraste** = mover · **clique no ponto** = editar (t/pot) ou remover.
- **Ctrl+clique** marca vários pontos (ficam verdes); **arrastar um marcado move o grupo todo**
  (`iniciarDragGrupo`, mantém a forma e trava nas bordas 0–90s / 0–100%). **Ctrl+C** copia os
  marcados; passe o mouse sobre a Sim destino e **Ctrl+V** cola (adiciona). **Delete** remove
  marcados, **Esc** limpa.
- Clipboard único `clip={pts,modo}`: 📄 copia a curva inteira (`modo:'replace'`), Ctrl+C copia os
  pontos marcados (`modo:'add'`); 📋/Ctrl+V colam respeitando o modo. `simHover` define o destino do Ctrl+V.

### Gerador de briga por espécie (dashboard)
- Botões 🐟 **Pirarará / Tambaqui / Tucunaré** geram uma curva de pontos `{t,pot}` com a "assinatura"
  de cada peixe na Sim escolhida (`selEspecieSim`). Funções `fightPirarara/Tambaqui/Tucunare()` +
  `gerarEspecie(nome)`. Têm **aleatoriedade** (`rnd`): cada clique gera uma variação; os pontos
  ficam editáveis normalmente depois. Modelo: Pirarará = alta sustentada + mergulhos longos;
  Tambaqui = surtos circulares repetidos; Tucunaré = cabeçadas rápidas + saltos (slack→tranco), errático.

### Duração da simulação
- A timeline do dashboard vai até **90s** (constante `DURACAO=90`).
- No **player**, a duração da simulação = duração do **vídeo** (gatilhos disparam por
  `video.currentTime`; a sim termina quando o vídeo acaba). Subindo um vídeo de 90s, a
  simulação passa a durar 90s sem alterar código.

### ⚠️ Ao trocar os vídeos (ou qualquer arquivo cacheado)
O Service Worker serve do cache. Para forçar o app a baixar os novos vídeos, **incremente a
versão** do cache: troque `simpesca-v2` → `simpesca-v3` em `service-worker.js` (const
`CACHE_NAME`) e em `index.html` (const `CACHE_NAME`). Senão o app continua servindo o vídeo antigo.

---

## Visão Geral (versão Wi-Fi — HISTÓRICA)

Simulador de pesca que roda em um **ESP32**, controlando um motor via DAC (MCP4725) conforme perfis de "trancos" configurados pelo usuário. A interface web é servida pelo próprio ESP32 via Wi-Fi AP.

**Hardware principal:**
- ESP32-C3 Mini
- DAC MCP4725 (endereço I2C 0x60) — saída 1.0V–3.5V (0%–100%)
- Leitor de Cartão SD (3.3V)

### Pinagem
| Componente | Pino ESP32-C3 |
|-----------|--------------|
| **I2C (MCP4725)** |  |
| SDA | GPIO 8 |
| SCL | GPIO 9 |
| **SPI (Leitor SD)** |  |
| CS | GPIO 4 |
| MOSI | GPIO 7 |
| MISO | GPIO 5 |
| SCK | GPIO 6 |

---

## Estrutura de Arquivos

```
esp32_sem_sd/
  esp32_sem_sd.ino       — firmware principal do ESP32
  dashboard_progmem.h    — HTML do dashboard (armazenado em PROGMEM)
  player_progmem.h       — HTML do player (armazenado em PROGMEM)
  antigo/                — versão anterior do dashboard
  novo/                  — versão em desenvolvimento do dashboard
simulação A.json         — perfil de gatilhos exportado (Sim A)
simulação B.json         — perfil de gatilhos exportado (Sim B)
simulação c.json         — perfil de gatilhos exportado (Sim C)
Simalação D.json         — perfil de gatilhos exportado (Sim D)
parte para ler SD.txt    — trecho de código para versão com SD
```

---

## Firmware — `esp32_sem_sd.ino`

### Configuração Wi-Fi
- Modo **Access Point**: SSID `SimuladorPesca`, senha `pesca1234`
- IP fixo: `192.168.4.1`

### Rotas HTTP (porta 80)
| Rota | Handler | Descrição |
|------|---------|-----------|
| `/` | `handleRoot()` | Serve o dashboard de configuração |
| `/player` | `handlePlayer()` | Serve o player com vídeos |
| `/video?n=0\|1\|2` | `handleVideo()` | Stream de vídeo (video0.mp4, video1.mp4, video2.mp4) do cartão SD |

### WebSocket (porta 81) — `onWebSocketEvent()`
Recebe mensagens JSON do browser e aplica no DAC:

| `tipo` | Campos | Ação |
|--------|--------|------|
| `manual` | `pot` (0–100) | Aplica potência diretamente no DAC (controle manual pelo slider) |
| `play` | — | Loga início da simulação |
| `pause` | — | Loga pausa |
| `stop` | — | Zera o DAC |
| `ts` | `t`, `pot` | Aplica a potência calculada pelo JS no DAC |
| `gatilhos` | `dados[]` | Recebe o perfil (processamento é local no JS) |

Após toda mensagem, responde com `{"tipo":"status","pot":X.X}`.

### Funções de DAC
- **`percentToDAC(pct)`** — converte 0–100% para valor de 12 bits (0–4095) no range 1.0V–3.5V
- **`aplicarDAC(pct)`** — aplica a potência no MCP4725 e loga no Serial

---

## Dashboard — `dashboard_progmem.h`

Interface web de **configuração** dos perfis de trancos. Armazenada em PROGMEM como string C.

### Estrutura de Simulações
Três simulações independentes (**Sim A**, **Sim B**, **Sim C**), cada uma com seu próprio array de gatilhos e storage key no localStorage.

### Motor de Rampa (JavaScript)
Replica no browser a mesma lógica de rampa que seria executada no ESP32. Permite visualizar a potência em tempo real sem depender da resposta do hardware.

Fases de cada gatilho (em ordem):
1. **sub1** — subida da força inicial (`potIni`) até o pico 1 (`pot`) em `sub` ms
2. **pico1** — mantém `pot` por `pico` ms
3. **trans** — transição de `pot` para pico 2 (`pot2`) em `trans` ms (opcional)
4. **pico2** — mantém `pot2` por `pico2` ms (opcional)
5. **desc** — descida até força final (`potFim`) em `desc` ms

### Estrutura de um Gatilho (objeto JS)
```js
{
  t: 12.5,      // tempo de disparo em segundos
  potIni: 0,    // força inicial (%)
  pot: 80,      // força pico 1 (%)
  sub: 300,     // duração da subida (ms)
  pico: 800,    // duração do pico 1 (ms)
  pot2: 40,     // força pico 2 (%)
  trans: 400,   // duração da transição (ms)
  pico2: 1200,  // duração do pico 2 (ms)
  desc: 600,    // duração da descida (ms)
  potFim: 0     // força final (%)
}
```

### Funções Principais do Dashboard
| Função | Descrição |
|--------|-----------|
| `playSimulador()` | Inicia a simulação ativa (timer de 100ms) |
| `pauseSimulador()` | Pausa, congela a rampa |
| `stopSimulador()` | Para e zera tudo |
| `dispararGatilho(g)` | Inicia a rampa de um gatilho |
| `tickRampa()` | Avança a rampa frame a frame (chamada a cada 100ms) |
| `resetarRampa()` | Zera estado da rampa e potência |
| `atualizarInterfaceTempo()` | Atualiza displays de tempo e playheads das 3 sims |
| `renderTimeline()` | Redesenha os marcadores de gatilhos na timeline da sim ativa |
| `abrirEditor(i)` | Abre o painel de edição do gatilho de índice `i` |
| `fecharEditor()` | Fecha o editor |
| `removerBlocoSelecionado()` | Remove o gatilho selecionado |
| `ordenarGatilhos()` | Ordena os gatilhos por tempo crescente |
| `iniciarArrasto(e, i, idxSim)` | Inicia drag de um bloco na timeline |
| `arrastarBloco(e)` | Atualiza posição do bloco sendo arrastado |
| `pararArrasto()` | Finaliza drag, salva e ordena |
| `setupContainerClick(idx)` | Registra handler de clique no fundo da timeline para criar gatilhos |
| `salvarLocal()` | Salva gatilhos da sim ativa no localStorage |
| `carregarLocal(idx)` | Carrega gatilhos de uma sim do localStorage |
| `limparLocal()` | Apaga todos os gatilhos da sim ativa |
| `salvarGatilhos()` | Sincroniza perfil com o ESP32 via WebSocket |
| `exportarJSON()` | Exporta perfil da sim ativa como arquivo `.json` |
| `importarJSON(event)` | Importa perfil de um arquivo `.json` |
| `conectarWS()` | Conecta ao WebSocket do ESP32 (reconecta a cada 3s) |
| `enviarWS(obj)` | Envia objeto JSON pelo WebSocket |
| `atualizarGauge(pct)` | Atualiza o gauge principal de tensão/potência |
| `atualizarSimGauge(idx, pct)` | Atualiza o mini gauge de uma simulação |
| `atualizarStatusMotor(pct)` | Atualiza o badge de status no header conforme potência |
| `log(msg, tipo)` | Adiciona linha ao terminal de eventos |

### Storage Keys (localStorage)
- Sim A: `simpesca_gatilhos_A`
- Sim B: `simpesca_gatilhos_B`
- Sim C: `simpesca_gatilhos_C`

---

## Player — `player_progmem.h`

Tela de **exibição** da simulação para o usuário final (a vara de pesca). Abre em fullscreen ao pressionar play.

### Fluxo de uso
1. Usuário clica no botão ▶ de uma simulação → `iniciarContagem('A'|'B'|'C')`
2. Contador regressivo de 5 segundos → `entrarFullscreenEPlay(id)`
3. Entra em fullscreen + inicia vídeo + dispara gatilhos via `iniciarSim(id)`
4. Clique no vídeo durante play → `pausarSim(id)` (overlay de pausa)
5. Vídeo termina → zera motor, sai do fullscreen

### Funções Principais do Player
| Função | Descrição |
|--------|-----------|
| `iniciarContagem(id)` | Exibe countdown de 5s antes de iniciar a sim |
| `entrarFullscreenEPlay(id)` | Solicita fullscreen e chama `iniciarSim` |
| `iniciarSim(id)` | Inicia vídeo, timer de gatilhos (100ms) e envia `play` ao ESP32 |
| `pausarSim(id)` | Pausa vídeo, congela rampa, exibe overlay de pausa |
| `continuarSim()` | Retoma a sim pausada |
| `reiniciarSim()` | Reinicia do zero, sai do fullscreen |
| `dispararGatilho(sim, g)` | Inicia rampa para um gatilho (mesmo algoritmo do dashboard) |
| `tickRampa(sim)` | Avança a rampa de uma sim (chamada a cada 100ms) |
| `aplicarMotor(pct)` | Envia potência ao ESP32 e atualiza badge do header |
| `carregarGatilhos(key)` | Lê gatilhos do localStorage (salvos pelo dashboard) |
| `conectarWS()` | Conecta ao WebSocket (reconecta a cada 3s) |
| `enviarWS(obj)` | Envia JSON pelo WebSocket |
| `mostrarToast(msg)` | Exibe notificação temporária (1.5s) |

### Vídeos
Servidos pelo ESP32 via `/video?n=0`, `/video?n=1`, `/video?n=2` a partir do cartão SD.

**Formato esperado no SD:**
```
/video0.mp4
/video1.mp4
/video2.mp4
```

---

## Dependências Arduino
- `WiFi.h` — Wi-Fi embutido do ESP32
- `WebServer.h` — servidor HTTP
- `WebSocketsServer.h` — arduinoWebSockets by Markus Sattler
- `Wire.h` — I2C
- `SPI.h` — SPI embutido do ESP32
- `SD.h` — leitor de cartão SD
- `Adafruit_MCP4725` — DAC
- `ArduinoJson` — parse de JSON pelo Benoit Blanchon
