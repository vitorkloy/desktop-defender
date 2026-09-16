# Notas de Implementação

## Issue #4 - Sistema de Progressão e Economia
### Status: ✅ COMPLETO

Todas as features da issue #4 foram implementadas conforme a especificação.

## Issue #11 - Multiplayer Local 2P
### Status: ✅ COMPLETO

Modo multiplayer local cooperativo (2 jogadores) implementado seguindo a Arquitetura A da issue.

### Estrutura de Arquivos Criados/Modificados

```
js/
├── players.js (NOVO)  # Sistema de gerenciamento de jogadores e input
├── game.js (MOD)      # Refatorado para suportar múltiplos jogadores
├── index.html (MOD)   # Botão multiplayer e controles atualizados
└── README.md (MOD)    # Documentação dos controles
```

### Decisões de Design

#### Controles
**Problema**: Como 2 jogadores usam 1 teclado + 1 mouse?

**Solução v1**:
- P1: WASD + mouse aim + click shoot (controles completos)
- P2: IJKL move + TFGH aim + Space shoot (tiro básico)
- P1 mantém modos de tiro, bots, habilidades (simplifica interface para P2)

#### Recursos Compartilhados
- ✅ HP do núcleo: compartilhado (1 núcleo para ambos)
- ✅ Ouro/XP da run: pool único
- ✅ Score: compartilhado
- ✅ Bots: compartilhados
- ✅ Modos de tiro: compartilhados
- ✅ Habilidades: compartilhadas (P1 ativa)

**Documentação**: Escolha documentada no README e PR.

#### Cores dos Jogadores
- P1: Azul (`#57d9ff`) - mantém cor original
- P2: Laranja (`#ff9d47`) - contraste claro

### Arquitetura

#### PlayersManager
Responsável por gerenciar o estado de todos os jogadores:

```javascript
playersManager.reset("single")   // 1 jogador
playersManager.reset("local2p")  // 2 jogadores
playersManager.getPlayer(id)     // Buscar jogador por ID
playersManager.getAllPlayers()   // Todos os jogadores
playersManager.isMultiplayer()   // Checar modo
```

Cada player tem:
- id, x, y, radius, angle
- speed, baseSpeed
- color, glow
- controls ("player1" ou "player2")
- fireCooldown, aimX, aimY

#### InputManager
Centraliza todo o input do jogo:

```javascript
inputManager.getP1Movement()        // { dx, dy }
inputManager.getP2Movement()        // { dx, dy }
inputManager.getP2AimDirection()    // { x, y }
inputManager.isP1Fire()             // bool
inputManager.isP2Fire()             // bool
```

### Refatoração do game.js

#### Antes (single-player)
```javascript
const player = { x, y, ... };
updatePlayer(dt);
fireBullets();
```

#### Depois (multiplayer-ready)
```javascript
playersManager.reset(mode);
updatePlayers(dt);  // itera sobre todos
fireBullets(player, ...);  // recebe player
```

### Serialização/Save
Estado multiplayer é salvo em checkpoints:

```javascript
{
  mode: "local2p",
  players: [
    { id: 1, x, y, angle, controls: "player1" },
    { id: 2, x, y, angle, controls: "player2" }
  ],
  ...
}
```

### HUD Multiplayer
- Indicadores P1/P2 acima dos jogadores quando `isMultiplayer()`
- Recursos (ouro/XP) mostram pool compartilhado
- Core HP único para ambos

### Testes
✅ 10/10 testes unitários passando (PlayersManager, InputManager)
✅ Sintaxe validada em todos os arquivos
✅ Single-player intacto (sem regressões)
✅ Save/load suporta multiplayer
✅ Servidor respondendo corretamente

### Limitações v1 (Documentadas)
- P2 não controla modos de tiro, bots ou habilidades
- Aim do P2 é por teclado (TFGH), não mouse
- Sem suporte a gamepad
- Sem modo PvP
- Sem sincronização online

### Próximos Passos Sugeridos
1. Balanceamento de dificuldade para 2P
2. Contador individual de kills por jogador
3. Suporte a gamepad para P2
4. Modo online (Arquitetura B)

---

## Issue #4 - Sistema de Progressão

## Estrutura de Arquivos Criados

```
js/
├── meta.js           # Sistema de progressão (power, fire_rate, core_hp)
├── economy.js        # Economia (ouro + XP, payouts)
├── run-save.js       # Checkpoint de onda (save/load)
├── fire-modes.js     # Modos de tiro alternativos
└── bots.js           # Bots de defesa colocáveis
```

## Ordem de Carregamento (index.html)

1. meta.js
2. economy.js
3. run-save.js
4. fire-modes.js
5. bots.js
6. effects.js
7. drops.js
8. abilities.js
9. game.js

Esta ordem garante que todos os managers estejam disponíveis quando game.js inicializar.

## Pipeline de Stats Derivados

```
metaBase (meta.js)
    ↓
fireMode mods (fire-modes.js)
    ↓
effects.computeMods() (effects.js)
    ↓
Final Stats
```

Exemplo para bulletDamage:
- Meta base: 1.0 * (1 + power * 0.08)
- Fire mode: * fireMode.damageMod
- Effects: * mods.bulletDamage
- Final: todas as multiplicações aplicadas

## Managers Globais

Os seguintes managers são exportados para `window`:

- `window.metaManager` - MetaManager
- `window.economyManager` - EconomyManager
- `window.MetaManager` - classe (para construção)
- `window.EconomyManager` - classe
- `window.RunSaveManager` - classe
- `window.FireModeManager` - classe
- `window.BotManager` - classe
- `window.BOT_TYPES` - catálogo de bots
- `window.FIRE_MODES` - catálogo de fire modes

## Persistência (localStorage)

### Chaves Novas
- `dd_meta` - Progressão meta (power, fire_rate, core_hp, gold, xp, level)
- `dd_runsave` - Save de run (wave, score, bots, etc.)

### Chaves Existentes (mantidas)
- `dd_leaderboard` - Ranking
- `dd_bestscore` - Recorde
- `dd_achievements` - Conquistas
- `dd_stats` - Estatísticas globais

## Flow de Economia

### Durante a Run
1. Kill enemy → `economyManager.awardKill(type)`
2. Wave complete → `economyManager.awardWaveComplete(wave, perfect)`
3. Recursos acumulam em `economyManager.runGold` e `economyManager.runXp`

### Ao Creditar
1. Game over → `economyManager.creditToMeta()` → atualiza meta
2. Checkpoint save → `economyManager.creditToMeta()` → atualiza meta → `economyManager.reset()`

## Flow de Checkpoint

### Salvar
1. Wave elegível (múltiplo de 5) → mostra overlay "Wave Complete"
2. User clica "SALVAR E SAIR"
3. `saveAndQuit()`:
   - Credita economia ao meta
   - Serializa estado completo
   - Salva em localStorage
   - Retorna ao menu

### Continuar
1. Menu detecta save → mostra badge e botão "CONTINUAR"
2. User clica "CONTINUAR"
3. `startGame(true)`:
   - Carrega save
   - Restaura todos os managers
   - Retoma gameplay

## Controles Novos

- **1-4**: Trocar modo de tiro (quando desbloqueado)
- **B**: Abrir menu de bots
- **Mouse**: Ao colocar bot, clique posiciona

## Fire Modes

### Desbloqueio
- Standard sempre disponível
- Outros 3 modos via drops (hexágonos coloridos)

### Mecânicas
- **Spread**: 5 projéteis, spread angle 0.6 rad
- **Rail**: Pierce até 3 alvos, 3x damage, cooldown 0.4x
- **Burst**: 3 shots rápidos, burst delay 0.08s

## Bots

### AI
- **Gunner**: busca enemy mais próximo no range → atira
- **Medic**: checa se core.hp < maxHp → cura +3
- **Ward**: aura passiva, calcula wardProtection multiplicador

### Upgrade
- Só Ward pode ser upgradado
- Cada upgrade: +20 range, -0.05 damage reduction (min 0.3)

## Testes Realizados

✅ Sintaxe de todos os JS files válida
✅ Ordem de carregamento correta
✅ Managers exportados corretamente
✅ Git push bem-sucedido
✅ PR criado: https://github.com/vitorkloy/desktop-defender/pull/5

## Próximos Passos (se necessário)

1. Teste manual no navegador
2. Ajustes de balance (valores de custo, payouts, etc.)
3. Feedback do usuário
4. Possíveis melhorias de UI/UX

## Notas Técnicas

- **Vanilla JS**: Sem bundler, sem transpilação
- **IIFE modules**: Cada arquivo é self-contained
- **Global exports**: Via `window.X = Y`
- **Async/await**: Usado para storage operations
- **Event delegation**: Usado para bot/upgrade card clicks
