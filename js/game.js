(function(){
  "use strict";

  /* ============ STORAGE ============ */
  const LB_KEY = "dd_leaderboard";
  const BEST_KEY = "dd_bestscore";
  const ACH_KEY = "dd_achievements";
  const STATS_KEY = "dd_stats";
  const MAX_BOARD = 10;

  const DEFAULT_STATS = {
    gamesPlayed:0, totalKills:0, totalTankKills:0,
    bestWave:0, bestCombo:1, totalPlaytime:0
  };

  async function loadStats(){
    try{
      const r = await window.storage.get(STATS_KEY, false);
      if(!r) return {...DEFAULT_STATS};
      return {...DEFAULT_STATS, ...JSON.parse(r.value)};
    }catch(e){ return {...DEFAULT_STATS}; }
  }
  async function saveStats(s){
    try{ await window.storage.set(STATS_KEY, JSON.stringify(s), false); }
    catch(e){ console.error("storage save failed", e); }
  }
  async function loadAchievements(){
    try{
      const r = await window.storage.get(ACH_KEY, false);
      if(!r) return [];
      const v = JSON.parse(r.value);
      return Array.isArray(v) ? v : [];
    }catch(e){ return []; }
  }
  async function saveAchievements(list){
    try{ await window.storage.set(ACH_KEY, JSON.stringify(list), false); }
    catch(e){ console.error("storage save failed", e); }
  }

  /* ============ MANAGERS INITIALIZATION ============ */
  const metaManager = new window.MetaManager();
  const economyManager = new window.EconomyManager();
  const runSaveManager = new window.RunSaveManager();
  const fireModeManager = new window.FireModeManager();
  const botManager = new window.BotManager();
  
  // Make managers accessible globally for meta UI
  window.metaManager = metaManager;
  window.economyManager = economyManager;

  /* ============ ACHIEVEMENTS DEFINITIONS ============ */
  const ACHIEVEMENTS = [
    { id:"first_blood", tier:"bronze", icon:"01", name:"PRIMEIRO CONTATO", desc:"Destrua seu primeiro inimigo." },
    { id:"wave_5",       tier:"bronze", icon:"05", name:"ONDA 5", desc:"Alcance a onda 5 em uma partida." },
    { id:"wave_10",      tier:"silver", icon:"10", name:"ONDA 10", desc:"Alcance a onda 10 em uma partida." },
    { id:"wave_15",      tier:"gold",   icon:"15", name:"ONDA 15", desc:"Alcance a onda 15 em uma partida." },
    { id:"combo_max",    tier:"silver", icon:"x8", name:"COMBO MÁXIMO", desc:"Alcance o combo x8." },
    { id:"perfect_wave", tier:"silver", icon:"PW", name:"ONDA PERFEITA", desc:"Complete uma onda sem o núcleo sofrer dano." },
    { id:"multi_kill",   tier:"bronze", icon:"MK", name:"ABATE MÚLTIPLO", desc:"Elimine 3 inimigos em menos de meio segundo." },
    { id:"tank_hunter",  tier:"silver", icon:"TH", name:"CAÇADOR DE TANQUES", desc:"Destrua 20 tanques (acumulado).", goal:20, statKey:"totalTankKills" },
    { id:"sharpshooter", tier:"gold",   icon:"SS", name:"ATIRADOR DE ELITE", desc:"Termine uma partida com 85%+ de precisão (mín. 40 tiros)." },
    { id:"veteran",      tier:"gold",   icon:"VT", name:"VETERANO", desc:"Destrua 500 inimigos no total (acumulado).", goal:500, statKey:"totalKills" },
    { id:"survivor",     tier:"bronze", icon:"05m", name:"SOBREVIVENTE", desc:"Sobreviva 5 minutos em uma única partida." },
    { id:"score_10k",    tier:"bronze", icon:"10K", name:"PONTUAÇÃO 10K", desc:"Alcance 10.000 pontos em uma partida." },
    { id:"score_50k",    tier:"gold",   icon:"50K", name:"PONTUAÇÃO 50K", desc:"Alcance 50.000 pontos em uma partida." },
  ];
  const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a=>[a.id,a]));

  let unlockedSet = new Set();
  let newlyUnlocked = [];
  let statsCache = {...DEFAULT_STATS};
  async function initAchievements(){
    unlockedSet = new Set(await loadAchievements());
    statsCache = await loadStats();
  }

  function checkLiveAchievements(){
    if(statsCache.totalKills + sessionKills >= 1) unlockAchievement("first_blood");
    if(statsCache.totalTankKills + sessionTankKills >= 20) unlockAchievement("tank_hunter");
    if(statsCache.totalKills + sessionKills >= 500) unlockAchievement("veteran");
    if(score >= 10000) unlockAchievement("score_10k");
    if(score >= 50000) unlockAchievement("score_50k");
    if(elapsed >= 300) unlockAchievement("survivor");
  }
  async function unlockAchievement(id){
    if(unlockedSet.has(id)) return;
    unlockedSet.add(id);
    newlyUnlocked.push(id);
    await saveAchievements([...unlockedSet]);
    const def = ACH_BY_ID[id];
    if(def) showToast(def);
    sfx.wave();
  }
  function showToast(def){
    const wrap = document.getElementById("toast-wrap");
    if(!wrap) return;
    const div = document.createElement("div");
    div.className = "toast";
    div.innerHTML = `<div class="toast-icon">${def.icon}</div><div class="toast-text"><div class="toast-eyebrow">CONQUISTA DESBLOQUEADA</div><div class="toast-title">${def.name}</div></div>`;
    wrap.appendChild(div);
    setTimeout(()=>div.remove(), 3600);
  }

  async function loadLeaderboard(){
    try{
      const r = await window.storage.get(LB_KEY, false);
      if(!r) return [];
      const v = JSON.parse(r.value);
      return Array.isArray(v) ? v : [];
    }catch(e){ return []; }
  }
  async function saveLeaderboard(list){
    try{ await window.storage.set(LB_KEY, JSON.stringify(list), false); }
    catch(e){ console.error("storage save failed", e); }
  }
  async function loadBest(){
    try{
      const r = await window.storage.get(BEST_KEY, false);
      return r ? (parseInt(r.value,10)||0) : 0;
    }catch(e){ return 0; }
  }
  async function saveBest(v){
    try{ await window.storage.set(BEST_KEY, String(v), false); }
    catch(e){ console.error("storage save failed", e); }
  }

  /* ============ CANVAS / SCALING ============ */
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");
  const W = 960, H = 600; // logical resolution
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  function resize(){
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener("resize", resize);
  resize();

  function toLogical(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    return { x:(clientX-rect.left)*sx, y:(clientY-rect.top)*sy };
  }

  /* ============ AUDIO (WebAudio synth, no assets) ============ */
  let actx = null;
  function ac(){
    if(!actx){
      try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ actx=null; }
    }
    return actx;
  }
  function beep(freq, dur, type, vol, glideTo){
    const a = ac(); if(!a) return;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, a.currentTime);
    if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, a.currentTime+dur);
    gain.gain.setValueAtTime(vol!=null?vol:0.08, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+dur);
    osc.connect(gain).connect(a.destination);
    osc.start();
    osc.stop(a.currentTime+dur);
  }
  const sfx = {
    shoot(){ beep(620,0.05,"square",0.045,420); },
    hit(){ beep(180,0.08,"sawtooth",0.05,70); },
    kill(){ beep(500,0.12,"triangle",0.07,120); },
    coreHit(){ beep(110,0.25,"sawtooth",0.09,60); },
    wave(){ beep(300,0.18,"triangle",0.08,700); },
    gameover(){ beep(200,0.5,"sawtooth",0.09,40); },
    ui(){ beep(440,0.05,"square",0.04,440); }
  };

  /* ============ INPUT ============ */
  const keys = {};
  window.addEventListener("keydown",(e)=>{
    const key = e.key.toLowerCase();
    keys[key] = true;
    
    if(key==="p" || e.key==="Escape"){
      if(state==="playing"){ pauseGame(); }
      else if(state==="paused"){ resumeGame(); }
    }
    
    // Fire mode switching (1-3)
    if(state==="playing"){
      if(key==="1") fireModeManager.switchMode("standard");
      if(key==="2") fireModeManager.switchMode("spread");
      if(key==="3") fireModeManager.switchMode("rail");
      if(key==="4") fireModeManager.switchMode("burst");
      
      // Bot placement
      if(key==="b"){
        state = "botmenu";
        showOnly("botmenu");
        renderBotMenu();
        sfx.ui();
      }
    }
    
    // Active ability (Space or Q)
    if(state==="playing" && (key===" " || key==="q")){
      const activated = effectsManager.useActive();
      if(activated === "emp_blast"){
        abilitiesHandler.triggerEMP(player.x, player.y);
        sfx.wave();
      }
    }
    
    // Super ability (Shift or E) - when super is charged
    if(state==="playing" && (e.key==="Shift" || key==="e")){
      const activated = effectsManager.useSuper();
      if(activated === "devastation"){
        const result = abilitiesHandler.triggerDevastating(enemies, particles, score, combo);
        score += result.totalScore;
        sessionKills += result.kills;
        effectsManager.addSuperCharge(10); // small bonus for using super
        floatText(core.x, core.y - 50, "DEVASTAÇÃO!", "#ff9d47");
        shake = Math.max(shake, 15);
        sfx.gameover(); // big sound
        checkLiveAchievements();
      }
    }
  });
  window.addEventListener("keyup",(e)=>{ keys[e.key.toLowerCase()] = false; });

  const mouse = { x:W/2, y:H/2-100, down:false };
  canvas.addEventListener("mousemove",(e)=>{
    const p = toLogical(e.clientX, e.clientY);
    mouse.x = p.x; mouse.y = p.y;
    
    // Update bot placement ghost
    if(botManager.placementMode){
      botManager.updateGhostPosition(p.x, p.y);
    }
  });
  canvas.addEventListener("mousedown",(e)=>{ 
    mouse.down = true;
    
    // Handle bot placement
    if(botManager.placementMode){
      const totals = economyManager.getRunTotals();
      const result = botManager.placeBot(mouse.x, mouse.y, core.x, core.y, core.radius, {w:W, h:H}, totals.gold);
      
      if(result.success){
        economyManager.runGold -= result.cost;
        sfx.wave();
        floatText(mouse.x, mouse.y - 20, "-" + result.cost + " 💰", "#ffd23f");
      } else {
        floatText(mouse.x, mouse.y - 20, result.reason, "#ff4d6d");
        sfx.ui();
      }
    }
  });
  window.addEventListener("mouseup",(e)=>{ mouse.down = false; });
  canvas.addEventListener("contextmenu",(e)=>e.preventDefault());

  /* ============ GAME STATE ============ */
  let state = "menu"; // menu | playing | paused | gameover | leaderboard | wavecomplete | botmenu
  const core = { x:W/2, y:H/2, radius:34, hp:100, maxHp:100 };
  const player = { x:W/2, y:H/2+150, radius:13, angle:-Math.PI/2, speed:230, baseSpeed:230 };
  let bullets = [], enemies = [], particles = [], floaters = [];
  let score = 0, wave = 1, combo = 1, comboTimer = 0, spawnTimer = 0.6, waveAnnounceTimer = 0, shake = 0, fireCooldown = 0, elapsed = 0, bestScore = 0;

  // sessão atual (para conquistas/estatísticas)
  let sessionShots = 0, sessionHits = 0, sessionKills = 0, sessionTankKills = 0;
  let bestComboThisRun = 1, tookDamageThisWave = false, killTimestamps = [];
  
  // Meta base stats (loaded on game start)
  let metaBaseStats = {
    bulletDamage: 1.0,
    fireRate: 1.0,
    coreMaxHp: 100
  };

  // Effects & abilities systems
  const effectsManager = new window.EffectsManager();
  const dropManager = new window.DropManager();
  const abilitiesHandler = new window.AbilitiesHandler();

  async function resetGame(){
    bullets = []; enemies = []; particles = []; floaters = [];
    score = 0; wave = 1; combo = 1; comboTimer = 0;
    spawnTimer = 0.6; waveAnnounceTimer = 0; shake = 0; fireCooldown = 0; elapsed = 0;
    
    // Load meta and apply to base stats
    const meta = await metaManager.loadMeta();
    metaBaseStats = {
      bulletDamage: 1.0,
      fireRate: 1.0,
      coreMaxHp: 100
    };
    metaBaseStats = metaManager.applyMetaToBaseStats(meta, metaBaseStats);
    
    core.maxHp = metaBaseStats.coreMaxHp;
    core.hp = core.maxHp;
    
    player.x = W/2; player.y = H/2+150;
    sessionShots = 0; sessionHits = 0; sessionKills = 0; sessionTankKills = 0;
    bestComboThisRun = 1; tookDamageThisWave = false; killTimestamps = [];
    newlyUnlocked = [];
    
    effectsManager.reset();
    dropManager.reset();
    abilitiesHandler.reset();
    economyManager.reset();
    fireModeManager.reset();
    botManager.reset();
    
    // Give starter effects for testing
    effectsManager.addEffect("emp_blast"); // active ability
    effectsManager.addEffect("devastation"); // super ability
    
    document.getElementById("corebar-fill").style.width = "100%";
    document.getElementById("corebar-fill").style.background = "linear-gradient(90deg, var(--core-dim), var(--core))";
  }

  /* ============ HELPERS ============ */
  function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
  function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
  function rand(a,b){ return a + Math.random()*(b-a); }

  function spawnEdgePoint(){
    const side = Math.floor(rand(0,4));
    const pad = 30;
    if(side===0) return {x:rand(0,W), y:-pad};
    if(side===1) return {x:W+pad, y:rand(0,H)};
    if(side===2) return {x:rand(0,W), y:H+pad};
    return {x:-pad, y:rand(0,H)};
  }

  const ENEMY_TYPES = {
    basic:{ hp:2, speed:72, radius:14, score:10, color:"#ff4d6d", glow:"rgba(255,77,109,0.55)" },
    fast: { hp:1, speed:140, radius:9,  score:15, color:"#ffd23f", glow:"rgba(255,210,63,0.55)" },
    tank: { hp:7, speed:42, radius:21,  score:35, color:"#b479ff", glow:"rgba(180,121,255,0.55)" }
  };

  function pickType(){
    const r = Math.random();
    if(wave < 3) return "basic";
    if(wave < 5) return r < 0.75 ? "basic" : "fast";
    if(wave < 8) return r < 0.55 ? "basic" : (r < 0.85 ? "fast" : "tank");
    return r < 0.4 ? "basic" : (r < 0.75 ? "fast" : "tank");
  }

  function spawnEnemy(){
    const key = pickType();
    const def = ENEMY_TYPES[key];
    const p = spawnEdgePoint();
    const hpMult = 1 + (wave-1)*0.14;
    const spMult = 1 + (wave-1)*0.045;
    enemies.push({
      type:key, x:p.x, y:p.y,
      hp: Math.ceil(def.hp*hpMult), maxHp: Math.ceil(def.hp*hpMult),
      speed: def.speed*Math.min(spMult,2.2),
      radius: def.radius, color: def.color, glow: def.glow, score: def.score,
      wobble: rand(0,Math.PI*2)
    });
  }

  function spawnParticles(x,y,color,count,speedMax){
    for(let i=0;i<count;i++){
      const a = rand(0,Math.PI*2);
      const sp = rand(20,speedMax||140);
      particles.push({
        x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
        life: rand(0.25,0.6), age:0, color, size: rand(1.5,3.5)
      });
    }
  }

  function floatText(x,y,text,color){
    floaters.push({x,y,text,color,age:0,life:0.8});
  }

  /* ============ UPDATE ============ */
  function updatePlayer(dt){
    const mods = effectsManager.computeMods();
    
    // Apply movement speed mod
    const effectiveSpeed = player.baseSpeed * mods.moveSpeed;
    
    let dx=0, dy=0;
    if(keys["w"]||keys["arrowup"]) dy -= 1;
    if(keys["s"]||keys["arrowdown"]) dy += 1;
    if(keys["a"]||keys["arrowleft"]) dx -= 1;
    if(keys["d"]||keys["arrowright"]) dx += 1;
    if(dx||dy){
      const len = Math.hypot(dx,dy);
      dx/=len; dy/=len;
      player.x = clamp(player.x + dx*effectiveSpeed*dt, player.radius+4, W-player.radius-4);
      player.y = clamp(player.y + dy*effectiveSpeed*dt, player.radius+4, H-player.radius-4);
    }
    player.angle = Math.atan2(mouse.y-player.y, mouse.x-player.x);

    // Apply fire rate mod from effects AND meta
    const baseCooldown = 0.14;
    const effectiveCooldown = fireModeManager.getFireCooldown(baseCooldown / (mods.fireRate * metaBaseStats.fireRate));
    
    fireCooldown -= dt;
    
    // Check burst state
    const fireMode = fireModeManager.getCurrentMode();
    if(fireMode.behavior === "burst"){
      // Handle burst firing
      if(mouse.down && fireCooldown<=0 && !fireModeManager.burstState){
        fireModeManager.startFire();
      }
      
      if(fireModeManager.canFire() && fireCooldown<=0){
        fireCooldown = effectiveCooldown;
        fireBullets(fireMode, mods);
        fireModeManager.onShotFired();
      }
    } else {
      // Normal firing
      if(mouse.down && fireCooldown<=0){
        fireCooldown = effectiveCooldown;
        fireBullets(fireMode, mods);
      }
    }

    // Check for drop pickups
    const pickedDrop = dropManager.checkPickup(player.x, player.y, player.radius);
    if (pickedDrop) {
      if(pickedDrop.type === 'effect'){
        effectsManager.addEffect(pickedDrop.id);
        const def = window.EFFECTS_CATALOG[pickedDrop.id];
        if (def) {
          floatText(player.x, player.y - 20, def.name, def.color);
          sfx.wave();
        }
      } else if(pickedDrop.type === 'firemode'){
        fireModeManager.unlockMode(pickedDrop.id);
        const mode = window.FIRE_MODES[pickedDrop.id];
        if(mode){
          floatText(player.x, player.y - 20, mode.name, mode.color);
          sfx.wave();
        }
      }
    }
  }
  
  function fireBullets(fireMode, mods){
    const baseDamage = metaBaseStats.bulletDamage * mods.bulletDamage * fireMode.damageMod;
    
    if(fireMode.behavior === "spread" || fireMode.behavior === "burst"){
      // Multiple projectiles
      for(let i=0; i<fireMode.projectileCount; i++){
        const spreadOffset = (i - (fireMode.projectileCount-1)/2) * fireMode.spreadAngle;
        const a = player.angle + spreadOffset;
        bullets.push({
          x: player.x+Math.cos(a)*player.radius*1.4,
          y: player.y+Math.sin(a)*player.radius*1.4,
          vx: Math.cos(a)*640, vy: Math.sin(a)*640, life:1.1,
          damage: baseDamage,
          pierce: fireMode.pierce,
          color: fireMode.color
        });
      }
    } else {
      // Single projectile
      const a = player.angle + rand(-0.03,0.03);
      bullets.push({
        x: player.x+Math.cos(a)*player.radius*1.4,
        y: player.y+Math.sin(a)*player.radius*1.4,
        vx: Math.cos(a)*640, vy: Math.sin(a)*640, life:1.1,
        damage: baseDamage,
        pierce: fireMode.pierce,
        color: fireMode.color
      });
    }
    
    sessionShots += 1;
    sfx.shoot();
    shake = Math.max(shake, 1.5);
  }

  function updateBullets(dt){
    for(let i=bullets.length-1;i>=0;i--){
      const b = bullets[i];
      b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
      if(b.life<=0 || b.x<-20||b.x>W+20||b.y<-20||b.y>H+20){ bullets.splice(i,1); }
    }
  }

  function updateEnemies(dt){
    const mods = effectsManager.computeMods();
    
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      e.wobble += dt*4;
      
      // Apply EMP slow effect
      const enemySpeed = e.empSlowed ? e.speed * 0.3 : e.speed;
      
      const ang = Math.atan2(core.y-e.y, core.x-e.x);
      e.x += Math.cos(ang)*enemySpeed*dt;
      e.y += Math.sin(ang)*enemySpeed*dt;

      if(dist(e.x,e.y,core.x,core.y) < core.radius+e.radius*0.6){
        const baseDmg = e.type==="tank" ? 22 : (e.type==="fast" ? 6 : 10);
        
        // Apply ward protection
        const wardProtection = botManager.getWardProtection(core.x, core.y);
        const finalDmg = baseDmg * mods.coreDamageReduction * wardProtection;
        
        core.hp = clamp(core.hp - finalDmg, 0, core.maxHp);
        spawnParticles(e.x,e.y,e.color,26,220);
        shake = Math.max(shake, 8);
        combo = 1; comboTimer = 0;
        tookDamageThisWave = true;
        sfx.coreHit();
        updateCoreBar();
        enemies.splice(i,1);
        if(core.hp<=0){ triggerGameOver(); return; }
        continue;
      }

      for(let j=bullets.length-1;j>=0;j--){
        const b = bullets[j];
        if(dist(b.x,b.y,e.x,e.y) < e.radius){
          // Pierce mechanic
          if(!b.pierce){
            bullets.splice(j,1);
          } else {
            b.pierceHits = (b.pierceHits || 0) + 1;
            if(b.pierceHits >= 3) bullets.splice(j,1);
          }
          
          sessionHits += 1;
          const bulletDmg = b.damage || 1;
          e.hp -= bulletDmg;
          spawnParticles(b.x,b.y,e.color,4,90);
          if(e.hp<=0){
            comboTimer = 2.2;
            combo = clamp(combo+1, 1, 8);
            bestComboThisRun = Math.max(bestComboThisRun, combo);
            const gained = e.score*combo;
            score += gained;
            floatText(e.x,e.y-10, "+"+gained, "#ffd23f");
            spawnParticles(e.x,e.y,e.color,22,190);
            shake = Math.max(shake, 4);
            sfx.kill();
            
            // Economy: award kill
            economyManager.awardKill(e.type);
            
            // Try to spawn drop
            dropManager.trySpawnDrop(e.x, e.y, mods.dropChance);
            
            // Add super charge
            effectsManager.addSuperCharge(5);
            
            enemies.splice(i,1);

            sessionKills += 1;
            if(e.type==="tank") sessionTankKills += 1;
            if(combo>=8) unlockAchievement("combo_max");

            killTimestamps.push(elapsed);
            killTimestamps = killTimestamps.filter(t=>elapsed-t<=0.5);
            if(killTimestamps.length>=3){
              const bonus = 40*combo;
              score += bonus;
              floatText(e.x,e.y-26, "MULTI +"+bonus, "#ff9d47");
              unlockAchievement("multi_kill");
            }

            checkWaveUp();
            checkLiveAchievements();
          }
          break;
        }
      }
    }
  }

  function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.age += dt;
      if(p.age>=p.life){ particles.splice(i,1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt;
      p.vx *= 0.94; p.vy *= 0.94;
    }
    for(let i=floaters.length-1;i>=0;i--){
      const f = floaters[i];
      f.age += dt;
      f.y -= dt*28;
      if(f.age>=f.life) floaters.splice(i,1);
    }
  }

  let lastWaveScoreThreshold = 0;
  function checkWaveUp(){
    const threshold = 400 + (wave-1)*60;
    if(score - lastWaveScoreThreshold >= threshold){
      lastWaveScoreThreshold = score;

      // Award wave completion
      economyManager.awardWaveComplete(wave, !tookDamageThisWave);

      if(!tookDamageThisWave){
        const bonus = 100 + wave*20;
        score += bonus;
        floatText(core.x, core.y-core.radius-16, "ONDA PERFEITA +"+bonus, "#2bffd0");
        unlockAchievement("perfect_wave");
        // Bonus super charge for perfect wave
        effectsManager.addSuperCharge(15);
      }
      tookDamageThisWave = false;

      wave += 1;
      
      // Check for checkpoint opportunity
      if(runSaveManager.canSaveAtWave(wave)){
        showWaveComplete();
      } else {
        announceWave();
      }

      if(wave>=5) unlockAchievement("wave_5");
      if(wave>=10) unlockAchievement("wave_10");
      if(wave>=15) unlockAchievement("wave_15");
      checkLiveAchievements();
    }
  }
  function announceWave(){
    sfx.wave();
    const el = document.getElementById("wavebanner");
    el.textContent = "ONDA " + wave;
    el.classList.add("show");
    waveAnnounceTimer = 1.4;
  }

  function updateSpawns(dt){
    spawnTimer -= dt;
    const interval = clamp(1.35 - wave*0.06, 0.32, 1.35);
    if(spawnTimer<=0){
      spawnTimer = interval;
      spawnEnemy();
      if(wave>=4 && Math.random()<0.18) spawnEnemy();
    }
  }

  function updateCoreBar(){
    const pct = Math.max(0,(core.hp/core.maxHp)*100);
    const fill = document.getElementById("corebar-fill");
    fill.style.width = pct+"%";
    if(pct < 30) fill.style.background = "linear-gradient(90deg, #7a1220, var(--danger))";
    else if(pct < 60) fill.style.background = "linear-gradient(90deg, #7a5a12, var(--amber))";
    else fill.style.background = "linear-gradient(90deg, var(--core-dim), var(--core))";
  }

  function updateHUD(){
    document.getElementById("hud-score").textContent = String(score).padStart(6,"0");
    document.getElementById("hud-wave").textContent = String(wave).padStart(2,"0");
    document.getElementById("hud-combo").textContent = "x"+combo;
    
    // Update economy display
    const totals = economyManager.getRunTotals();
    document.getElementById("run-gold").textContent = totals.gold;
    document.getElementById("run-xp").textContent = totals.xp;
    
    // Update fire modes HUD
    const modes = fireModeManager.getUnlockedModes();
    const fireModesHud = document.getElementById("firemodes-hud");
    fireModesHud.innerHTML = modes.map((mode, idx) => {
      const keyMap = {standard:"1", spread:"2", rail:"3", burst:"4"};
      const key = keyMap[mode.id] || "";
      const timeDisplay = mode.timeLeft === Infinity ? "∞" : Math.ceil(mode.timeLeft) + "s";
      const locked = mode.timeLeft === 0 && mode.id !== "standard";
      
      return `<div class="firemode-badge ${mode.active ? "active" : ""} ${locked ? "locked" : ""}">
        <div class="firemode-name">${mode.name}</div>
        <div class="firemode-key">${key}</div>
        ${mode.id !== "standard" ? `<div class="firemode-time">${timeDisplay}</div>` : ""}
      </div>`;
    }).join('');
    
    // Update effects HUD
    const effectsHud = document.getElementById("effects-hud");
    const activeEffects = effectsManager.getActiveEffects();
    
    effectsHud.innerHTML = activeEffects.map(effect => {
      let timeDisplay;
      
      if (effect.def.type === 'active') {
        // Show cooldown for active ability
        if (effect.cooldownRemaining > 0) {
          timeDisplay = Math.ceil(effect.cooldownRemaining) + 's CD';
        } else {
          timeDisplay = 'PRONTO';
        }
      } else if (effect.def.type === 'super') {
        // Show charge for super ability
        timeDisplay = Math.floor(effect.chargePercent) + '%';
      } else if (effect.def.duration === Infinity) {
        timeDisplay = '∞';
      } else {
        timeDisplay = Math.ceil(effect.timeLeft) + 's';
      }
      
      const stackDisplay = (effect.stackCount && effect.stackCount > 1) 
        ? ` x${effect.stackCount}` 
        : '';
      
      return `<div class="effect-badge ${effect.def.type}">
        <div class="effect-icon">${effect.def.icon}</div>
        <div class="effect-info">
          <div class="effect-name">${effect.def.name}${stackDisplay}</div>
          <div class="effect-timer">${timeDisplay}</div>
        </div>
      </div>`;
    }).join('');
    
    // Update super bar
    const superPct = effectsManager.getSuperChargePercent();
    const superFill = document.getElementById("superbar-fill");
    superFill.style.width = superPct + "%";
    
    const superPercent = document.getElementById("superbar-percent");
    superPercent.textContent = Math.floor(superPct) + "%";
    
    if(superPct >= 100){
      superFill.classList.add("charged");
    } else {
      superFill.classList.remove("charged");
    }
  }

  /* ============ RENDER ============ */
  let bgOffset = 0;
  function render(dt){
    ctx.save();
    ctx.clearRect(0,0,W,H);

    // shake
    let ox=0, oy=0;
    if(shake>0){
      ox = rand(-shake,shake); oy = rand(-shake,shake);
      shake = Math.max(0, shake - dt*26);
    }
    ctx.translate(ox,oy);

    // background grid
    bgOffset = (bgOffset + dt*8) % 40;
    ctx.fillStyle = "#060a12";
    ctx.fillRect(-10,-10,W+20,H+20);
    ctx.strokeStyle = "rgba(43,255,208,0.045)";
    ctx.lineWidth = 1;
    for(let x=-40+bgOffset; x<W+40; x+=40){
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
    }
    for(let y=-40+bgOffset*0.6; y<H+40; y+=40){
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }

    // core
    const pulse = 1 + Math.sin(elapsed*3)*0.04;
    const grad = ctx.createRadialGradient(core.x,core.y,4,core.x,core.y,core.radius*2.4);
    const hpPct = core.hp/core.maxHp;
    const coreColor = hpPct<0.3 ? "#ff4d6d" : (hpPct<0.6 ? "#ffb347" : "#2bffd0");
    grad.addColorStop(0, coreColor+"aa");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(core.x,core.y,core.radius*2.4,0,Math.PI*2); ctx.fill();

    ctx.save();
    ctx.translate(core.x,core.y);
    ctx.rotate(elapsed*0.3);
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a = i*Math.PI/3;
      const r = core.radius*pulse;
      const px = Math.cos(a)*r, py = Math.sin(a)*r;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.fillStyle = "#0c1526";
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 18;
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.shadowBlur = 0;
    ctx.fillStyle = coreColor;
    ctx.font = "700 10px 'Chakra Petch'";
    ctx.textAlign = "center";
    ctx.fillText("CORE", core.x, core.y+3);

    // particles
    for(const p of particles){
      const t = 1 - p.age/p.life;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*t,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // enemies
    for(const e of enemies){
      const wob = Math.sin(e.wobble)*2;
      ctx.save();
      ctx.translate(e.x, e.y+wob*0.2);
      ctx.shadowColor = e.glow;
      ctx.shadowBlur = 14;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      if(e.type==="fast"){
        ctx.moveTo(0,-e.radius); ctx.lineTo(e.radius*0.8,e.radius*0.8); ctx.lineTo(-e.radius*0.8,e.radius*0.8);
      } else if(e.type==="tank"){
        const sides=6;
        for(let i=0;i<sides;i++){
          const a = i*Math.PI*2/sides;
          const px=Math.cos(a)*e.radius, py=Math.sin(a)*e.radius;
          if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
      } else {
        ctx.arc(0,0,e.radius,0,Math.PI*2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if(e.hp<e.maxHp){
        const w = e.radius*2;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(e.x-w/2, e.y-e.radius-9, w, 3);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x-w/2, e.y-e.radius-9, w*(e.hp/e.maxHp), 3);
      }
    }

    // bullets
    ctx.shadowBlur = 8;
    for(const b of bullets){
      ctx.shadowColor = b.color || "#57d9ff";
      ctx.fillStyle = b.color || "#eaf6ff";
      if(b.pierce){
        ctx.shadowBlur = 12;
        const size = 4;
        ctx.fillRect(b.x - size/2, b.y - size/2, size, size);
      } else {
        ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.shadowColor = "#57d9ff";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#0d1e2c";
    ctx.strokeStyle = "#57d9ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.radius*1.5, 0);
    ctx.lineTo(-player.radius*0.9, player.radius*0.9);
    ctx.lineTo(-player.radius*0.4, 0);
    ctx.lineTo(-player.radius*0.9, -player.radius*0.9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // drops
    ctx.shadowBlur = 0;
    dropManager.render(ctx);
    
    // bots
    botManager.render(ctx);

    // abilities (EMP wave)
    abilitiesHandler.render(ctx);

    // floating score text
    ctx.textAlign = "center";
    ctx.font = "700 13px 'Chakra Petch'";
    for(const f of floaters){
      ctx.globalAlpha = 1 - f.age/f.life;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  /* ============ LOOP ============ */
  let lastTime = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now-lastTime)/1000);
    lastTime = now;

    if(state==="playing"){
      elapsed += dt;
      updatePlayer(dt);
      updateBullets(dt);
      updateEnemies(dt);
      updateParticles(dt);
      updateSpawns(dt);
      effectsManager.update(dt);
      dropManager.update(dt);
      abilitiesHandler.update(dt, enemies);
      fireModeManager.update(dt);
      botManager.update(dt, enemies, core, bullets);
      comboTimer -= dt;
      if(comboTimer<=0) combo = 1;
      if(waveAnnounceTimer>0){
        waveAnnounceTimer -= dt;
        if(waveAnnounceTimer<=0) document.getElementById("wavebanner").classList.remove("show");
      }
      updateHUD();
    }
    render(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ============ STATE / SCREENS ============ */
  const el = {
    menu: document.getElementById("menu"),
    pause: document.getElementById("pausepanel"),
    gameover: document.getElementById("gameover"),
    leaderboard: document.getElementById("leaderboard"),
    achievements: document.getElementById("achievements"),
    upgradehub: document.getElementById("upgrade-hub"),
    wavecomplete: document.getElementById("wavecomplete"),
    botmenu: document.getElementById("bot-menu"),
    hud: document.getElementById("hud"),
  };
  function showOnly(name){
    for(const k in el) el[k].classList.add("hidden");
    if(name) el[name].classList.remove("hidden");
  }

  async function goMenu(){
    state = "menu";
    showOnly("menu");
    const best = await loadBest();
    document.getElementById("menu-best").textContent = "RECORDE: " + best;
    await initAchievements();
    document.getElementById("menu-stats").innerHTML =
      `<span>MAIOR ONDA: <b>${statsCache.bestWave}</b></span><span>ABATES TOTAIS: <b>${statsCache.totalKills}</b></span><span>PARTIDAS: <b>${statsCache.gamesPlayed}</b></span>`;
    
    // Check for saved run
    const hasSave = await runSaveManager.checkHasSave();
    const continueBtn = document.getElementById("btn-continue");
    const continueBadge = document.getElementById("continue-badge");
    
    if(hasSave){
      const save = await runSaveManager.loadSave();
      if(save && save.wave){
        continueBtn.classList.remove("hidden");
        continueBadge.classList.remove("hidden");
        document.getElementById("continue-wave").textContent = save.wave;
      } else {
        continueBtn.classList.add("hidden");
        continueBadge.classList.add("hidden");
      }
    } else {
      continueBtn.classList.add("hidden");
      continueBadge.classList.add("hidden");
    }
  }

  function achIconOrProgress(def){
    if(def.goal && def.statKey){
      const current = Math.min(def.goal, statsCache[def.statKey] || 0);
      return `<div class="ach-progress">${current}/${def.goal}</div>`;
    }
    return "";
  }
  async function renderAchievements(){
    statsCache = await loadStats();
    unlockedSet = new Set(await loadAchievements());
    document.getElementById("ach-stats-line").innerHTML =
      `<span>${unlockedSet.size}/${ACHIEVEMENTS.length} DESBLOQUEADAS</span>`;
    document.getElementById("ach-grid").innerHTML = ACHIEVEMENTS.map(def=>{
      const unlocked = unlockedSet.has(def.id);
      return `<div class="ach-card tier-${def.tier} ${unlocked?"unlocked":""}">
        <div class="ach-icon">${def.icon}</div>
        <div>
          <div class="ach-name">${def.name}</div>
          <div class="ach-desc">${def.desc}</div>
          ${unlocked ? "" : achIconOrProgress(def)}
        </div>
      </div>`;
    }).join("");
  }

  async function startGame(fromSave = false){
    if(fromSave){
      const save = await runSaveManager.loadSave();
      if(!save){
        await startGame(false);
        return;
      }
      
      // Restore state from save
      await resetGame();
      
      wave = save.wave;
      score = save.score;
      combo = save.combo;
      core.hp = save.coreHp;
      economyManager.runGold = save.runGold || 0;
      economyManager.runXp = save.runXp || 0;
      elapsed = save.elapsed || 0;
      sessionKills = save.sessionKills || 0;
      sessionTankKills = save.sessionTankKills || 0;
      sessionShots = save.sessionShots || 0;
      sessionHits = save.sessionHits || 0;
      
      // Restore managers
      if(save.bots){
        botManager.restore(save.bots);
      }
      if(save.ownedActive){
        effectsManager.ownedActiveAbility = save.ownedActive;
      }
      if(save.ownedSuper){
        effectsManager.ownedSuperAbility = save.ownedSuper;
      }
      if(save.superCharge !== undefined){
        effectsManager.superCharge = save.superCharge;
      }
      if(save.fireModes){
        fireModeManager.restore(save.fireModes);
      }
      
      lastWaveScoreThreshold = score;
    } else {
      await resetGame();
    }
    
    state = "playing";
    showOnly(null);
    el.hud.classList.remove("hidden");
    updateHUD();
    updateCoreBar();
  }

  function pauseGame(){
    if(state!=="playing") return;
    state = "paused";
    showOnly("pause");
    sfx.ui();
  }
  function resumeGame(){
    if(state!=="paused") return;
    state = "playing";
    showOnly(null);
    el.hud.classList.remove("hidden");
    lastTime = performance.now();
  }

  let pendingScore = 0, pendingWave = 1;
  async function triggerGameOver(){
    state = "gameover";
    sfx.gameover();
    pendingScore = score; pendingWave = wave;
    
    // Credit economy to meta
    await economyManager.creditToMeta();
    
    // Clear any saved run
    await runSaveManager.clearSave();
    
    showOnly("gameover");
    document.getElementById("gameover-score").textContent = String(pendingScore).padStart(6,"0");
    document.getElementById("gameover-wave").textContent = "ONDA ALCANÇADA: " + pendingWave;

    const accuracy = sessionShots>0 ? Math.round((sessionHits/sessionShots)*100) : 0;
    if(accuracy>=85 && sessionShots>=40) await unlockAchievement("sharpshooter");
    checkLiveAchievements();

    statsCache.gamesPlayed += 1;
    statsCache.totalKills += sessionKills;
    statsCache.totalTankKills += sessionTankKills;
    statsCache.bestWave = Math.max(statsCache.bestWave, pendingWave);
    statsCache.bestCombo = Math.max(statsCache.bestCombo, bestComboThisRun);
    statsCache.totalPlaytime += elapsed;
    await saveStats(statsCache);

    document.getElementById("go-stats").innerHTML =
      `<span>PRECISÃO: <b>${accuracy}%</b></span><span>ABATES: <b>${sessionKills}</b></span><span>MAIOR COMBO: <b>x${bestComboThisRun}</b></span>`;
    const unlockedHolder = document.getElementById("go-unlocked");
    if(newlyUnlocked.length){
      unlockedHolder.innerHTML = newlyUnlocked.map(id=>{
        const def = ACH_BY_ID[id];
        return `<div class="go-ach-chip"><div class="ach-icon">${def.icon}</div>${def.name}</div>`;
      }).join("");
    } else {
      unlockedHolder.innerHTML = "";
    }

    const best = await loadBest();
    const isNewBest = pendingScore > best;
    document.getElementById("newbest-tag").classList.toggle("hidden", !isNewBest);
    if(isNewBest) await saveBest(pendingScore);

    const board = await loadLeaderboard();
    const qualifies = board.length < MAX_BOARD || pendingScore > (board[board.length-1]?.score||0);
    const form = document.getElementById("nameform");
    if(qualifies && pendingScore>0){
      form.classList.remove("hidden");
      document.getElementById("nameinput").value = "";
      setTimeout(()=>document.getElementById("nameinput").focus(), 50);
    } else {
      form.classList.add("hidden");
    }
  }

  async function renderLeaderboard(){
    const board = await loadLeaderboard();
    const holder = document.getElementById("board-holder");
    if(!board.length){
      holder.innerHTML = '<div class="board-empty">NENHUM RESULTADO AINDA — SEJA O PRIMEIRO</div>';
      return;
    }
    let rows = board.slice(0,MAX_BOARD).map((r,i)=>
      `<tr><td class="rank">${i+1}</td><td>${escapeHtml(r.name)}</td><td class="num">${r.score}</td><td class="num">${r.wave}</td></tr>`
    ).join("");
    holder.innerHTML = `<table class="board">
      <tr><th></th><th>NOME</th><th style="text-align:right;">PONTOS</th><th style="text-align:right;">ONDA</th></tr>
      ${rows}
    </table>`;
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  
  /* ============ WAVE COMPLETE / CHECKPOINT ============ */
  function showWaveComplete(){
    state = "wavecomplete";
    showOnly("wavecomplete");
    const totals = economyManager.getRunTotals();
    document.getElementById("wave-summary").innerHTML = 
      `Onda ${wave} — +${totals.gold} 💰 +${totals.xp} ⭐`;
    
    const saveBtn = document.getElementById("btn-save-quit");
    if(runSaveManager.canSaveAtWave(wave)){
      saveBtn.classList.remove("hidden");
    } else {
      saveBtn.classList.add("hidden");
    }
    
    sfx.wave();
  }
  
  async function saveAndQuit(){
    // Credit economy first
    await economyManager.creditToMeta();
    
    // Save run state
    const gameState = {
      wave, score, combo,
      coreHp: core.hp,
      runGold: 0, // Already credited
      runXp: 0,   // Already credited
      bots: botManager.serialize(),
      ownedActive: effectsManager.ownedActiveAbility,
      ownedSuper: effectsManager.ownedSuperAbility,
      superCharge: effectsManager.superCharge,
      fireModeId: fireModeManager.currentMode,
      fireModes: fireModeManager.serialize(),
      elapsed,
      sessionKills,
      sessionTankKills,
      sessionShots,
      sessionHits
    };
    
    await runSaveManager.saveSave(gameState);
    
    // Reset economy for next session
    economyManager.reset();
    
    sfx.ui();
    goMenu();
  }
  
  /* ============ BOT MENU ============ */
  function renderBotMenu(){
    const totals = economyManager.getRunTotals();
    const canPlace = botManager.canPlaceBot(wave);
    const limit = botManager.getBotLimit(wave);
    
    document.getElementById("bot-grid").innerHTML = Object.values(window.BOT_TYPES).map(type => {
      const canAfford = totals.gold >= type.cost;
      const disabled = !canPlace || !canAfford;
      
      return `<div class="bot-card ${disabled ? 'disabled' : ''}" data-bot-type="${type.id}">
        <div class="bot-icon">🤖</div>
        <div class="bot-name">${type.name}</div>
        <div class="bot-role">${type.role}</div>
        <div class="bot-cost">${type.cost} 💰</div>
      </div>`;
    }).join('') + `<div style="grid-column: 1/-1; text-align:center; color:var(--text-dim); font-size:11px;">Bots: ${botManager.bots.length}/${limit}</div>`;
    
    // Add click handlers
    document.querySelectorAll('.bot-card').forEach(card => {
      card.addEventListener('click', () => {
        if(card.classList.contains('disabled')) return;
        const botType = card.getAttribute('data-bot-type');
        if(botManager.startPlacement(botType)){
          state = "playing";
          showOnly(null);
          el.hud.classList.remove("hidden");
          sfx.ui();
        }
      });
    });
  }
  
  /* ============ UPGRADE HUB ============ */
  async function renderUpgradeHub(){
    state = "upgradehub";
    showOnly("upgradehub");
    
    const meta = await metaManager.loadMeta();
    
    document.getElementById("meta-gold").textContent = meta.gold;
    document.getElementById("meta-xp").textContent = meta.xp;
    document.getElementById("meta-level").textContent = meta.level;
    
    const upgrades = [
      {
        id: "power",
        title: "PODER DE FOGO",
        desc: "Aumenta o dano base dos projéteis",
        effect: "+8% dano por nível"
      },
      {
        id: "fire_rate",
        title: "CADÊNCIA",
        desc: "Aumenta a velocidade de tiro",
        effect: "+4% cadência por nível"
      },
      {
        id: "core_hp",
        title: "INTEGRIDADE DO NÚCLEO",
        desc: "Aumenta o HP máximo do núcleo",
        effect: "+10 HP por nível"
      }
    ];
    
    document.getElementById("upgrade-grid").innerHTML = upgrades.map(upgrade => {
      const level = meta[upgrade.id] || 0;
      const cost = window.getUpgradeCost(level);
      const canAfford = meta.gold >= cost;
      const maxLevel = level >= 20;
      
      return `<div class="upgrade-card">
        <div class="upgrade-header">
          <div class="upgrade-title">${upgrade.title}</div>
          <div class="upgrade-level">NÍVEL ${level}</div>
        </div>
        <div class="upgrade-desc">${upgrade.desc}</div>
        <div class="upgrade-effect">${upgrade.effect}</div>
        <button class="upgrade-btn" data-attr="${upgrade.id}" ${!canAfford || maxLevel ? 'disabled' : ''}>
          ${maxLevel ? 'MÁXIMO' : `MELHORAR (${cost} 💰)`}
        </button>
      </div>`;
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(btn.disabled) return;
        const attr = btn.getAttribute('data-attr');
        const result = await metaManager.upgrade(attr);
        
        if(result.success){
          sfx.wave();
          await renderUpgradeHub(); // Refresh
        } else {
          floatText(W/2, H/2, result.reason, "#ff4d6d");
          sfx.ui();
        }
      });
    });
  }

  /* ============ BUTTONS ============ */
  document.getElementById("btn-play").onclick = ()=>{ sfx.ui(); startGame(false); };
  document.getElementById("btn-continue").onclick = ()=>{ sfx.ui(); startGame(true); };
  document.getElementById("btn-upgrade").onclick = async ()=>{ sfx.ui(); await renderUpgradeHub(); };
  document.getElementById("btn-board").onclick = async ()=>{ sfx.ui(); await renderLeaderboard(); state="leaderboard"; showOnly("leaderboard"); };
  document.getElementById("btn-board-back").onclick = ()=>{ sfx.ui(); goMenu(); };

  document.getElementById("btn-ach").onclick = async ()=>{ sfx.ui(); await renderAchievements(); state="achievements"; showOnly("achievements"); };
  document.getElementById("btn-ach-back").onclick = ()=>{ sfx.ui(); goMenu(); };
  
  document.getElementById("btn-upgrade-back").onclick = ()=>{ sfx.ui(); goMenu(); };

  document.getElementById("btn-resume").onclick = ()=>{ sfx.ui(); resumeGame(); };
  document.getElementById("btn-restart-pause").onclick = ()=>{ sfx.ui(); startGame(false); };
  document.getElementById("btn-quit-pause").onclick = ()=>{ sfx.ui(); goMenu(); };
  
  document.getElementById("btn-next-wave").onclick = ()=>{ 
    sfx.ui(); 
    state = "playing";
    showOnly(null);
    el.hud.classList.remove("hidden");
    announceWave();
  };
  document.getElementById("btn-save-quit").onclick = ()=>{ saveAndQuit(); };
  
  document.getElementById("btn-bot-cancel").onclick = ()=>{
    sfx.ui();
    botManager.cancelPlacement();
    state = "playing";
    showOnly(null);
    el.hud.classList.remove("hidden");
  };

  document.getElementById("btn-retry").onclick = ()=>{ sfx.ui(); startGame(false); };
  document.getElementById("btn-quit-go").onclick = ()=>{ sfx.ui(); goMenu(); };

  document.getElementById("nameform").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const input = document.getElementById("nameinput");
    let name = (input.value||"").trim().toUpperCase().slice(0,10);
    if(!name) name = "ANONIMO";
    const board = await loadLeaderboard();
    board.push({ name, score: pendingScore, wave: pendingWave, date: Date.now() });
    board.sort((a,b)=> b.score-a.score);
    const trimmed = board.slice(0, MAX_BOARD);
    await saveLeaderboard(trimmed);
    document.getElementById("nameform").classList.add("hidden");
    sfx.wave();
  });

  /* ============ INIT ============ */
  goMenu();
})();
