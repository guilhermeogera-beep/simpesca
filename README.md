# Simulador de Pesca — Configuração Completa

## Arquitetura

```
GitHub Pages                    ESP32 (Wi-Fi AP)              Celular
───────────────────────────    ─────────────────────────    ────────
  leve.mp4                      index.html                  Navegador
  media.mp4      ←─ internet ─→ sw.js                  ←─ Wi-Fi
  pesada.mp4                    manifest.json
                                icon-192.png
                                icon-512.png
                                (via LittleFS)
```

Os **vídeos** ficam no GitHub Pages (grande, 1ª vez com internet).
A **página PWA** (HTML/JS/JSON) fica no ESP32 via LittleFS (pequena, sempre rápida).

---

## Passo 1: Preparar o GitHub

Estrutura final do repositório `SImulador-de-pesca`:

```
/
├── index.html         ← copie do arquivo gerado
├── sw.js              ← copie do arquivo gerado
├── manifest.json      ← copie do arquivo gerado
├── icon-192.png       ← seu ícone (192x192)
├── icon-512.png       ← seu ícone (512x512)
├── leve.mp4           ← seu vídeo (~60s)
├── media.mp4          ← seu vídeo (~60s)
└── pesada.mp4         ← seu vídeo (~60s)
```

**Ative o GitHub Pages:**
1. Vá para Settings do repositório
2. Pages → Source → "Deploy from a branch"
3. Branch: `main` (ou `master`)
4. Save

Aguarde 1-2 minutos. Depois acesse: `https://guilhermeogera-beep.github.io/SImulador-de-pesca/`

---

## Passo 2: Preparar o ESP32

### 2.1 Instalar bibliotecas na Arduino IDE

**Gerenciador de Bibliotecas:**
- `Adafruit MCP4725` (busque por "MCP4725")
- `ESP32 LittleFS` (busque por "LittleFS")

### 2.2 Instalar ferramenta de upload

Baixe o **ESP32 LittleFS Data Upload plugin** (procure no Google).

Extraia dentro de `Arduino/tools/` — a pasta deve ficar:
```
Arduino/tools/ESP32LittleFS/tool/esp32littlefs.jar
```

Reinicie a Arduino IDE.

### 2.3 Preparar os arquivos para upload

Na pasta do seu sketch `.ino`, crie uma pasta `data`:

```
sketches/
└── simulador_pesca/
    ├── simulador_pesca_esp32_final.ino
    └── data/
        ├── index.html       ← copie do arquivo gerado
        ├── sw.js            ← copie do arquivo gerado
        ├── manifest.json    ← copie do arquivo gerado
        ├── icon-192.png     ← seu ícone
        └── icon-512.png     ← seu ícone
```

**NÃO coloque os vídeos (MP4) na pasta `data` — eles ficam no GitHub!**

### 2.4 Fazer upload

1. **Conecte o ESP32** via USB
2. **Abra** o sketch `.ino` na Arduino IDE
3. **Ferramentas → Placa → ESP32 Dev Module** (ou sua variante)
4. **Ferramentas → Porta** → selecione a USB
5. **Ferramentas → ESP32 LittleFS Data Upload** ← sobe os 5 arquivos na pasta `data`
6. **Verificar → Fazer Upload** ← sobe o código .ino

Se aparecer `SPIFFS error`, force a formatação:
- Ferramentas → Erase All Flash Before Sketch Upload

---

## Passo 3: Usar no Celular

### Android (Chrome)
1. Conecte no Wi-Fi: **"simulador de pesca"** (senha: 12345678)
2. Abra: `http://192.168.4.1`
3. Aguarde carregar os vídeos do GitHub (~30s, 1ª vez)
4. Menu ⋮ → **"Adicionar à tela inicial"**
5. Da próxima vez: abre pelo ícone, funciona offline!

### iPhone (Safari)
1. Conecte no Wi-Fi: **"simulador de pesca"** (senha: 12345678)
2. Abra: `http://192.168.4.1` no Safari
3. Botão compartilhar ⬆️ → **"Adicionar à Tela de Início"**
4. Da próxima vez: abre pelo ícone, funciona offline!

---

## Passo 4: Testar

1. **Verificar arquivos no LittleFS:**
   - Abra `http://192.168.4.1/info` no celular
   - Deve listar: index.html, sw.js, manifest.json, icon-192.png, icon-512.png

2. **Carregar um vídeo:**
   - Abra a aba "Leve" (deve carregar leve.mp4 do GitHub)
   - Se der erro, verifique a internet do celular

3. **Testar o motor:**
   - Conecte o DAC MCP4725 aos pinos 8 (SDA) e 9 (SCL) do ESP32
   - Monitor Serial deve mostrar `[OK] MCP4725 DAC conectado`
   - Abra a aba "Leve" e aperte Play — o motor deve acionar nos tempos certos

---

## Ajustar os gatilhos

No `index.html`, procure por:

```js
const SIMULACOES = [
  {
    nome: 'Pesca Leve',
    video: BASE_URL + '/leve.mp4',
    gatilhos: [
      { start: 5, stop: 10, force: 30, ramp: 80 },
      // start = início (segundo)
      // stop  = fim (segundo)
      // force = força do motor (0-100%)
      // ramp  = rampa suave (ms)
```

Edite e faça commit no GitHub. A página PWA atualiza automaticamente!

---

## Solução de problemas

| Problema | Solução |
|----------|---------|
| Vídeos não carregam no celular | Verifique internet; recarregue a página (F5) |
| "ESP32 desconectado" no display | Verifique se o Wi-Fi está conectado ao "simulador de pesca" |
| DAC não responde | Verifique os cabos SDA (pino 8) e SCL (pino 9) |
| LittleFS error no upload | Ferramentas > Erase All Flash Before Sketch Upload |
| Não encontra "ESP32 LittleFS" | Reinstale a biblioteca via Gerenciador |

---

## Endpoints da API

| Endpoint | Método | Parâmetros | Descrição |
|----------|--------|-----------|-----------|
| `/setDAC` | GET | `value` (0-100), `rampa` (ms) | Envia comando ao motor |
| `/getStatus` | GET | — | Retorna `{atual, alvo}` |
| `/info` | GET | — | Diagnóstico do LittleFS |

---

## Arquivos inclusos

- `index.html` — App PWA (4 abas, vídeos do GitHub)
- `sw.js` — Service Worker (cache offline)
- `manifest.json` — Config PWA (ícones, nome, etc)
- `simulador_pesca_esp32_final.ino` — Código do ESP32

Bom simulado! 🎣
