# Funcionalidades Implementadas

Este documento descreve as duas novas funcionalidades implementadas no Desktop Defender.

## Issue #9: Tiro Secundário (RMB)

### Descrição
Implementado um sistema de tiro secundário ativado pelo botão direito do mouse (RMB) que funciona independentemente dos modos de tiro primários (1-4).

### Características Técnicas
- **Tipo**: Rajada Pesada (Heavy Burst)
- **Ativação**: Clique direito do mouse (button 2)
- **Projéteis**: 3 projéteis por disparo
- **Dano**: 4.0x o dano base (vs. 1.0x do tiro padrão)
- **Recarga**: 8 segundos fixos
- **Spread**: 0.25 radianos (cone estreito para precisão)
- **Velocidade**: 720 pixels/s (vs. 640 pixels/s do primário)
- **Duração**: 1.2s lifetime por projétil

### Implementação
1. **Variável de Estado** (`secondaryFire`):
   - `cooldown`: tempo restante até próximo disparo
   - `maxCooldown`: 8.0 segundos
   - `damage`: 4.0x multiplicador
   - `projectileCount`: 3 projéteis
   - `spreadAngle`: 0.25 radianos
   - `color`: "#ff9d47" (laranja)

2. **Controle de Input**:
   - Adicionado `mouse.rightDown` para rastrear estado do RMB
   - Previne menu de contexto com `e.preventDefault()` no canvas
   - Só dispara quando `state === "playing"` e `cooldown <= 0`

3. **Função `fireSecondaryWeapon()`**:
   - Aplica modificadores de efeitos e meta stats
   - Cria 3 projéteis em formação de cone
   - Marca projéteis com `isSecondary: true`
   - Som distinto (frequência 380Hz → 280Hz)
   - Feedback visual com shake de câmera (3 unidades)
   - Texto flutuante "RAJADA PESADA"

4. **HUD Personalizado**:
   - Barra de recarga no canto inferior direito
   - Mostra "PRONTO" quando disponível
   - Mostra tempo restante em segundos durante recarga
   - Animação de pulso quando pronto
   - Cor laranja (#ff9d47) para diferenciação visual

5. **Integração com Sistema de Pausa**:
   - Não dispara durante pause, overlays ou menu de bots
   - Cooldown continua durante o jogo, pausa durante pause

### Arquivos Modificados
- `js/game.js`: Sistema principal, input, HUD
- `index.html`: Elemento `#secondarybar-wrap`
- `css/styles.css`: Estilos para `#secondarybar-*` e animações
- `README.md`: Documentação de controles e funcionalidade

---

## Issue #12: Loadout de Bots + Notificações

### Descrição
Sistema de configuração persistente de bots prioritários no menu principal, com notificações automáticas durante partidas quando o jogador pode colocar ou melhorar bots.

### Características do Loadout

1. **Capacidade**: Até 3 bots configuráveis
2. **Persistência**: Salvos no meta (localStorage)
3. **Tipos Suportados**:
   - Artilheiro (bot_gunner)
   - Médico (bot_medic)
   - Guardião (bot_ward)

4. **Configurações por Bot**:
   - Tipo do bot
   - `preferUpgrade` (apenas Guardião): se deve sugerir melhorias

### Interface de Loadout

**Localização**: Menu "APRIMORAR" → aba "LOADOUT DE BOTS"

**Componentes**:
1. **Lista de Loadout**:
   - Mostra bots configurados com ícone, nome e função
   - Toggle "Melhorar" para Guardiões (ativa/desativa preferência)
   - Botão "×" para remover do loadout
   - Mensagem quando vazio

2. **Grid de Bots Disponíveis**:
   - Cards clicáveis para cada tipo de bot
   - Desabilitados se já estão no loadout ou loadout cheio
   - Visual claro de estado (ativo/desabilitado)

### Sistema de Notificações In-Run

**Lógica de Disparo**:
1. Verifica a cada frame durante `state === "playing"`
2. Cooldown de 10 segundos entre notificações
3. Prioridades:
   - **1ª**: Próximo bot do loadout (se slot disponível + ouro suficiente)
   - **2ª**: Upgrade de Guardião (se marcado `preferUpgrade` + ouro suficiente)

**Verificação de Slot Disponível**:
```javascript
const limit = 2 + Math.floor(wave / 5)
botManager.bots.length < limit
```

**Verificação de Custo**:
- Colocação: `runGold >= BOT_TYPES[type].cost`
- Upgrade: `runGold >= 30` (custo de upgrade do Guardião)

**Banner de Notificação**:
- Aparece no topo central da tela
- Animação de entrada suave (transform + opacity)
- Dois botões:
  - **"COLOCAR"/"MELHORAR"** (primário): abre modo de colocação ou menu de bots
  - **"DEPOIS"** (secundário): dispensa notificação
- Estilo consistente com overlays do jogo
- Border verde (#2bffd0) para destaque

### Integração com Sistema de Colocação

1. **Auto-seleção**: 
   - Ao clicar "COLOCAR" na notificação, inicia modo de colocação com o tipo correto
   - Pré-seleciona o bot do loadout automaticamente

2. **Rastreamento de Índice**:
   - `nextBotLoadoutIndex` incrementa ao colocar bot do loadout
   - Reseta em `resetGame()`
   - Garante ordem correta das sugestões

3. **Feedback Visual**:
   - Notificação desaparece ao interagir
   - Toast de custo ao colocar bot
   - Som de confirmação

### Arquivos Modificados

**Backend**:
- `js/meta.js`: 
  - Adicionado `botLoadout` ao `DEFAULT_META`
  - Métodos: `getBotLoadout()`, `setBotLoadout()`, `addBotToLoadout()`, `removeBotFromLoadout()`, `toggleBotUpgradePreference()`

**Frontend**:
- `js/game.js`:
  - Variáveis: `botLoadout`, `nextBotLoadoutIndex`, `lastBotNotificationTime`
  - Funções: `checkBotLoadoutNotifications()`, `showBotNotification()`, `openBotMenuFromNotif()`, `dismissBotNotification()`
  - `renderBotLoadout()`: UI completa de configuração
  - Integração em `resetGame()` e loop principal

**HTML**:
- `index.html`:
  - Sistema de tabs no upgrade hub
  - Containers `#hub-content-upgrades` e `#hub-content-bots`
  - Estrutura de loadout list e available bots grid
  - Banner de notificação `#bot-notification-banner`

**CSS**:
- `css/styles.css`:
  - Estilos para tabs (`.hub-tab`, `.hub-content`)
  - Estilos de loadout (`.loadout-*`)
  - Estilos de notificação (`.bot-notif-*`)
  - Cards de bots disponíveis (`.available-bot-*`)
  - Animações e transições

**Documentação**:
- `README.md`: Seção sobre loadout e notificações

---

## Números de Balance Escolhidos

### Tiro Secundário
- **Recarga: 8 segundos** — Equilíbrio entre poder e disponibilidade
- **Dano: 4.0x** — Significativo mas não overpowered (3 projéteis × 4 = 12x DPS instantâneo)
- **Spread: 0.25 rad** — Cone estreito mantém precisão em médio alcance
- **Cooldown visual**: Incentiva uso tático, não spam

### Notificações de Bot
- **Cooldown: 10 segundos** — Previne spam, mantém informativo
- **Prioridade**: Colocação > Upgrade — Expandir defesa antes de melhorar
- **Trigger**: Gold suficiente + slot disponível — Jogador sempre pode agir

### Justificativa
Os números foram escolhidos para:
1. Tiro secundário ser **impactante mas não substituir primário**
2. Notificações serem **úteis sem interromper gameplay**
3. Loadout de 3 bots cobrir **diversidade sem complexidade excessiva**
4. Sistema escalar naturalmente com progressão (limite de bots aumenta com ondas)

---

## Testes Manuais Sugeridos

### Tiro Secundário
1. ✓ RMB dispara durante gameplay
2. ✓ Não dispara durante pause/overlays
3. ✓ Cooldown visual funciona corretamente
4. ✓ Som e feedback distinto do primário
5. ✓ Não abre menu de contexto no canvas
6. ✓ Projéteis têm dano correto (observar inimigos)
7. ✓ Reseta cooldown ao começar nova partida

### Loadout de Bots
1. ✓ Tab "LOADOUT DE BOTS" aparece no hub
2. ✓ Adicionar/remover bots funciona
3. ✓ Toggle de upgrade em Guardião funciona
4. ✓ Limita a 3 bots
5. ✓ Persiste entre sessões (reload página)
6. ✓ Cards de bots desabilitam corretamente

### Notificações
1. ✓ Notificação aparece quando tem ouro suficiente
2. ✓ Respeita cooldown de 10s
3. ✓ Botão "COLOCAR" inicia modo de colocação
4. ✓ Botão "DEPOIS" dispensa notificação
5. ✓ Prioriza próximo bot do loadout
6. ✓ Sugere upgrade de Guardião quando configurado
7. ✓ Índice incrementa ao colocar bot correto

---

## Compatibilidade

### Não Quebra
- ✓ Sistema de storage existente
- ✓ Checkpoint/Continue
- ✓ Ranking e conquistas
- ✓ Quit confirm
- ✓ Overlay de controles
- ✓ Modos de tiro (1-4)
- ✓ Sistema de efeitos
- ✓ Colocação manual de bots (tecla B)

### Adiciona Sem Conflito
- Novo recurso (tiro secundário) independente de modos primários
- Loadout como camada opcional sobre sistema de bots existente
- Notificações não bloqueiam interação, apenas informam

---

## Notas de Implementação

### Escolhas de Design

1. **Tiro Secundário como Rajada Pesada**:
   - Alternativas consideradas: cone de espalhamento largo, granada AOE
   - Escolhido burst por clareza de identidade e facilidade de balance
   - Mantém skill ceiling (aim precision matters)

2. **Loadout no Hub de Aprimoramento**:
   - Alternativa: Menu principal separado
   - Escolhido integrar por consistência temática (meta progression)
   - Tabs permitem expansão futura (exemplo: loadout de efeitos)

3. **Notificação não-modal**:
   - Alternativa: Popup que pausa jogo
   - Escolhido banner dismissível por não interromper flow
   - Jogador mantém controle total

### Extensibilidade

O código está estruturado para permitir:
- Adicionar mais tipos de tiro secundário (array de opções)
- Expandir loadout para incluir efeitos/modos de tiro
- Adicionar mais slots de loadout (ajustar limite)
- Configurar prioridade de notificações por usuário
- Implementar loadouts salvos múltiplos (profiles)

### Performance

- Verificação de notificação: O(1) com early return
- Render de loadout: Apenas quando aba ativa
- Sem impacto em gameplay loop (checks são baratos)
- DOM updates minimizados (só quando interação)
