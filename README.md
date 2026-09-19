# Desktop Defender

Jogo de defesa de núcleo no navegador (PT-BR). Proteja o núcleo a qualquer custo.

## Como jogar

- **Desktop**: Abra `index.html` no navegador, ou rode um servidor local:
  - `python3 -m http.server 8000`
  - depois acesse `http://127.0.0.1:8000`
- **Mobile**: Acesse pelo navegador móvel (Chrome Android / Safari iOS)
  - **Orientação obrigatória**: Landscape (horizontal)
  - O jogo bloqueará automaticamente em modo portrait com uma mensagem clara
  - Suporte completo a controles touch dual-stick em landscape

## Modos de Jogo

### Single Player
Modo clássico com 1 jogador defendendo o núcleo.

### Multiplayer Local (2 Jogadores)
Dois jogadores no mesmo computador defendem UM núcleo compartilhado em modo cooperativo.

- **Núcleo compartilhado**: HP único para ambos jogadores
- **Recursos compartilhados**: Pool único de ouro e XP da run
- **Score compartilhado**: Pontuação única para o time
- **Bots e progressão meta**: Compartilhados na sessão; meta permanente por dispositivo

## Controles

### Jogador 1 (P1)
- **WASD** — mover
- **Mouse** — mirar
- **Clique esquerdo** — atirar (primário)
- **Clique direito (RMB)** — rajada pesada (tiro secundário, 8s recarga)
- **1-4** — trocar modo de tiro (quando desbloqueado)
- **B** — abrir menu de bots de defesa
- **Space** ou **Q** — ativar habilidade ativa
- **Shift** ou **E** — usar super (quando carregado)
- **P** ou **Esc** — pausar
- **H** ou **?** — mostrar/ocultar controles durante a partida

### Jogador 2 (P2) - Multiplayer Local
- **IJKL** — mover
- **TFGH** — mirar (direção do tiro)
- **Space** — atirar

**Nota**: No modo multiplayer local v1, apenas P1 controla modos de tiro, bots e habilidades especiais. P2 foca em movimento e tiro básico.

### Controles Mobile

**Desktop Defender** suporta jogo single-player em dispositivos móveis com controles touch otimizados. **O jogo requer orientação landscape (horizontal)** e bloqueará automaticamente gameplay em portrait.

#### Modo Landscape (Horizontal) - Obrigatório
- **Joystick esquerdo** — mover jogador
- **Joystick direito** — mirar manualmente (dual-stick)
- **Botão ATIRAR** — disparar tiro primário
- **Botão RAJADA** — rajada pesada (equivalente ao RMB)
- **Botão MODO** — ciclar entre modos de tiro desbloqueados
- **Botão BOTS** — abrir menu de colocação de bots
- **Botão ATIVA** — usar habilidade ativa (quando disponível)
- **Botão SUPER** — usar super (quando carregado)
- **Botão PAUSE** — pausar o jogo

#### Modo Portrait (Vertical)
- **Bloqueado**: O jogo exibe um overlay instruindo o jogador a girar o dispositivo
- A tentativa de lock da orientação via API é feita automaticamente após o primeiro gesto (funciona em alguns navegadores Android, geralmente falha no iOS)
- Gameplay pausado até que o dispositivo seja girado para landscape

**Notas Mobile:**
- Modo multiplayer local não está disponível em dispositivos touch
- Landscape obrigatório para controle dual-stick completo
- Todos os botões têm tamanho mínimo de 44px para fácil toque
- Suporte a safe-area para dispositivos com notch
- Áudio desbloqueado automaticamente no primeiro toque

## Features

### Progressão Meta
- **Hub de Aprimoramento** no menu principal
- Gaste ouro para melhorar poder, cadência e HP do núcleo
- **Loadout de Bots**: configure até 3 bots prioritários que serão sugeridos durante partidas
- Upgrades e configurações persistem entre partidas
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

### Tiro Secundário (RMB)
- **Rajada Pesada** — botão direito do mouse dispara 3 projéteis de alto dano
- Recarga independente de 8 segundos
- 4x o dano base do tiro primário
- Projéteis disparados em cone estreito para precisão
- Feedback visual e sonoro distinto

### Bots de Defesa
- **Artilheiro** — ataca inimigos próximos automaticamente
- **Médico** — regenera HP do núcleo periodicamente
- **Guardião** — aura que reduz dano ao núcleo (melhorável)
- Coloque até 2 + floor(onda/5) bots por vez
- Custo em ouro da run
- Guardiões podem ser melhorados com ouro para aumentar alcance e proteção
- **Loadout**: configure bots prioritários no Hub de Aprimoramento
- **Notificações automáticas** quando você tem ouro suficiente para colocar/melhorar bots do loadout

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
- `js/storage.js` — camada de abstração de persistência (localStorage)
- `js/meta.js` — sistema de progressão e upgrades
- `js/economy.js` — sistema de economia (ouro/XP)
- `js/run-save.js` — checkpoint e save de partida
- `js/fire-modes.js` — modos de tiro alternativos
- `js/bots.js` — bots de defesa colocáveis
- `js/effects.js` — sistema de efeitos e catálogo
- `js/drops.js` — sistema de drops
- `js/abilities.js` — habilidades ativas e super
- `js/players.js` — sistema de jogadores multiplayer
- `js/game.js` — lógica principal do jogo
