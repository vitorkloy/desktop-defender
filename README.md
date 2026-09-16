# Desktop Defender

Jogo de defesa de núcleo no navegador (PT-BR). Proteja o núcleo a qualquer custo.

## Como jogar

- Abra `index.html` no navegador, ou rode um servidor local:
  - `python3 -m http.server 8000`
  - depois acesse `http://127.0.0.1:8000`

## Controles

- **WASD** — mover
- **Mouse** — mirar
- **Clique esquerdo** — atirar
- **1-4** — trocar modo de tiro (quando desbloqueado)
- **B** — abrir menu de bots de defesa
- **Space** ou **Q** — ativar habilidade ativa
- **Shift** ou **E** — usar super (quando carregado)
- **P** ou **Esc** — pausar
- **H** ou **?** — mostrar/ocultar controles durante a partida

## Features

### Progressão Meta
- **Hub de Aprimoramento** no menu principal
- Gaste ouro para melhorar poder, cadência e HP do núcleo
- Upgrades persistem entre partidas
- XP determina seu nível de conta

### Economia
- Ganhe ouro e XP ao derrotar inimigos
- Bônus por completar ondas
- Bônus aumentado em ondas perfeitas (sem dano ao núcleo)
- Recursos creditados ao morrer ou salvar checkpoint

### Checkpoint de Onda
- A partir da onda 5 (e a cada 5 ondas), você pode salvar e sair
- Retome exatamente de onde parou
- Um slot de save por vez

### Modos de Tiro
- **PADRÃO (1)** — tiro contínuo clássico
- **ESPALHADO (2)** — 5 projéteis em leque, duração limitada
- **FEIXE (3)** — alto dano com perfuração, duração limitada
- **RAJADA (4)** — 3 disparos rápidos por clique, duração limitada
- Desbloqueie modos através de drops durante a run

### Bots de Defesa
- **Artilheiro** — ataca inimigos próximos automaticamente
- **Médico** — regenera HP do núcleo periodicamente
- **Guardião** — aura que reduz dano ao núcleo (melhorável)
- Coloque até 2 + floor(onda/5) bots por vez
- Custo em ouro da run
- Guardiões podem ser melhorados com ouro para aumentar alcance e proteção

## Sistema de Efeitos

O jogo inclui um sistema de efeitos que modifica as stats do jogador:

### Tipos de Efeitos
- **Buffs** — melhorias temporárias (Tiro Rápido, Velocidade, Poder de Fogo, Escudo)
- **Debuffs** — penalidades temporárias (Lentidão, Travamento)
- **Passivos** — efeitos permanentes até o fim da partida (Catador, Resiliência)
- **Ativos** — habilidades ativadas manualmente (Pulso EMP)
- **Super** — habilidades poderosas carregadas por abates (Devastação)

### Drops
- Inimigos têm chance de soltar efeitos e modos de tiro ao serem derrotados
- Colete os hexágonos brilhantes para obter novos efeitos
- Efeitos podem empilhar dependendo do tipo

### Carga de Super
- Elimine inimigos para carregar a barra de Super (+5 por abate)
- Ondas perfeitas (sem dano ao núcleo) concedem +15 de carga
- Use Shift/E quando totalmente carregado para devastar todos os inimigos

## Estrutura

- `index.html` — markup e HUD
- `css/styles.css` — estilos
- `js/meta.js` — sistema de progressão e upgrades
- `js/economy.js` — sistema de economia (ouro/XP)
- `js/run-save.js` — checkpoint e save de partida
- `js/fire-modes.js` — modos de tiro alternativos
- `js/bots.js` — bots de defesa colocáveis
- `js/effects.js` — sistema de efeitos e catálogo
- `js/drops.js` — sistema de drops
- `js/abilities.js` — habilidades ativas e super
- `js/game.js` — lógica principal do jogo
