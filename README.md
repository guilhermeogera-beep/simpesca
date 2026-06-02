# Simulador de Pesca — PWA v2

## Estrutura de arquivos no GitHub/ESP32

```
/
├── index.html        ← App principal
├── sw.js             ← Service Worker (offline)
├── manifest.json     ← Config PWA
├── icon-192.png      ← Seu ícone (já existente)
├── icon-512.png      ← Seu ícone (já existente)
├── leve.mp4          ← Vídeo da simulação Leve
├── media.mp4         ← Vídeo da simulação Média
└── pesada.mp4        ← Vídeo da simulação Pesada
```

## Como usar no celular

### Android (Chrome)
1. Conecte no Wi-Fi do ESP32
2. Abra `http://192.168.4.1` — os vídeos carregam automaticamente
3. Menu ⋮ → "Adicionar à tela inicial"
4. Da próxima vez: abre pelo ícone, funciona offline!

### iPhone (Safari)
1. Conecte no Wi-Fi do ESP32
2. Abra `http://192.168.4.1` no Safari
3. Botão compartilhar → "Adicionar à Tela de Início"
4. Da próxima vez: abre pelo ícone, funciona offline!

## As 4 abas

| Aba         | Vídeo        | Gatilhos         |
|-------------|-------------|------------------|
| 🪶 Leve     | leve.mp4    | Fixos (4 gatilhos, até 35%) |
| 🎯 Média    | media.mp4   | Fixos (5 gatilhos, até 65%) |
| 💪 Pesada   | pesada.mp4  | Fixos (6 gatilhos, até 100%) |
| ✏️ Custom   | Você escolhe | Editáveis pelo usuário |

## Ajustar os gatilhos das simulações fixas

Edite o array `SIMULACOES` no `index.html`:

```js
{ start: 5, stop: 10, force: 30, ramp: 80 }
//         ↑ ini(s)  ↑ fim(s)  ↑ força%  ↑ rampa(ms)
```
