# Desktop Defender

Jogo de defesa de núcleo no navegador (PT-BR). Proteja o núcleo a qualquer custo.

## Como jogar

- Abra `index.html` no navegador, ou rode um servidor local:
  - `python3 -m http.server 8000`
  - depois acesse `http://127.0.0.1:8000`

## Controles

- **WASD** — mover
- **Mouse** — mirar
- **Clique** — atirar
- **Space** ou **Q** — ativar habilidade ativa
- **Shift** ou **E** — usar super (quando carregado)
- **P** — pausar

## Sistema de Efeitos

O jogo inclui um sistema de efeitos que modifica as stats do jogador:

### Tipos de Efeitos
- **Buffs** — melhorias temporárias (Tiro Rápido, Velocidade, Poder de Fogo, Escudo)
- **Debuffs** — penalidades temporárias (Lentidão, Travamento)
- **Passivos** — efeitos permanentes até o fim da partida (Catador, Resiliência)
- **Ativos** — habilidades ativadas manualmente (Pulso EMP)
- **Super** — habilidades poderosas carregadas por abates (Devastação)

### Drops
- Inimigos têm chance de soltar efeitos ao serem derrotados
- Colete os hexágonos brilhantes para obter novos efeitos
- Efeitos podem empilhar dependendo do tipo

### Carga de Super
- Elimine inimigos para carregar a barra de Super (+5 por abate)
- Ondas perfeitas (sem dano ao núcleo) concedem +15 de carga
- Use Shift/E quando totalmente carregado para devastar todos os inimigos

## Estrutura

- `index.html` — markup e HUD
- `css/styles.css` — estilos
- `js/effects.js` — sistema de efeitos e catálogo
- `js/drops.js` — sistema de drops
- `js/abilities.js` — habilidades ativas e super
- `js/game.js` — lógica principal do jogo
