import "./style.css";
import { Arena, SURVIVAL_SECONDS } from "./engine.mjs";
import { Renderer } from "./render.mjs";
import { Sound } from "./audio.mjs";
import {
  freshSave,
  validateSave,
  WEAPONS,
  COMBOS,
  comboKey,
  skillNames,
  talentCost,
  replaceTalents,
  replaceGear,
  weaponCost,
} from "./model.mjs";
const $ = (s) => document.querySelector(s);
const KEY = "whey-of-the-slime:v1";
let warning = "";
let save = freshSave();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) save = validateSave(JSON.parse(raw));
} catch {
  warning =
    "La sauvegarde est illisible ou inaccessible. Exportez vos progrès avant de quitter.";
}
let storageFailed = false;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    storageFailed = false;
  } catch {
    if (!storageFailed) {
      storageFailed = true;
      toast("Sauvegarde locale indisponible : exportez vos progrès.", true);
    }
  }
}
const sound = new Sound();
sound.muted = save.muted;
let game = null,
  difficulty = 1,
  tab = "play",
  overlay = null,
  endResult = null,
  last = 0,
  uiClock = 0;
let keys = new Set(),
  stick = { x: 0, y: 0 },
  joystickPointer = null,
  nameInput = "";
const formatTime = (n) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
const escaped = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const colors = ["citron vert", "azur", "violette"];
const jelly = (wallet, kind = "") =>
  wallet
    .map(
      (n, i) =>
        `<span class="jelly j${i}" title="Gelée ${colors[i]} ${kind}"><i></i>${n.toLocaleString("fr-FR")}</span>`,
    )
    .join("");
const costText = (cost, i = 0) =>
  `<span class="jelly j${i}"><i></i>${cost}</span>`;
const titles = ["Le vestiaire", "Le dojo des slimes", "La salle interdite"];
$("#app").innerHTML = `
<header class="topbar"><a class="brand" href="#" aria-label="Whey of the Slime, préparation"><span class="brand-icon">W<span>•</span></span><span>WHEY <em>of the</em> SLIME<small>NO PAIN. ALL GAIN.</small></span></a><div class="top-actions"><span class="prototype">PROTOTYPE · 01</span><button id="mute" class="icon-button" aria-label="Couper le son"></button><button id="help" class="icon-button" aria-label="Comment jouer">?</button><button id="mobile-storage" class="icon-button" aria-label="Exporter / importer la sauvegarde">S</button></div></header>
<main class="shell"><aside class="sidebar"><div class="eyebrow">LE PROGRAMME DU JOUR</div><nav aria-label="Préparation"><button data-tab="play"><span>01</span> Entrer dans l’arène <b><span class="arrow" aria-hidden="true"></span></b></button><button data-tab="body"><span>02</span> Le bonhomme <b><span class="arrow" aria-hidden="true"></span></b></button><button data-tab="gear"><span>03</span> L’arsenal <b><span class="arrow" aria-hidden="true"></span></b></button><button data-tab="codex"><span>04</span> Le codex <b><span class="arrow" aria-hidden="true"></span></b></button></nav><div class="wallet"><div class="eyebrow">VOTRE PETIT PACTOLE</div><h3>Gelées de personnage</h3><div id="body-wallet"></div><h3>Gelées d’armement</h3><div id="gear-wallet"></div><p>La fonte se mérite.<br>La gelée aussi.</p></div><div class="sidebar-bottom"><span class="local-dot"></span> Sauvegarde sur cet appareil<button id="storage">Exporter / importer <span class="arrow" aria-hidden="true"></span></button></div></aside>
<section class="workspace"><div class="section-heading"><div><div class="eyebrow" id="section-kicker">SURVIVRE. SOULEVER. RECOMMENCER.</div><h1 id="section-title">C’est l’heure du <em>bulk.</em></h1></div><span class="chapter">EST. 2026<br>GYM & SLIME CLUB</span></div><div class="play-layout" id="play-layout"><section class="arena-column"><div class="arena-top"><span><i class="live-dot"></i> <span id="arena-label">ZONE D’ÉCHAUFFEMENT</span></span><span id="timer">${formatTime(SURVIVAL_SECONDS)}</span></div><div class="arena-wrap"><canvas id="arena" aria-label="Arène de jeu. Déplacement avec ZQSD, WASD ou les flèches ; Espace pour esquiver ; E pour le pouvoir spécial."></canvas><div id="hud" hidden><div class="hud-health"><span id="hp-label"></span><div class="meter hp"><i id="hp-fill"></i></div></div><button id="pause" aria-label="Mettre en pause">II</button><div class="rage-label"><span>RAGE</span><span id="rage-label">0 %</span></div><div class="meter rage"><i id="rage-fill"></i></div><div id="boss-hud" hidden><span>LE ROI DU BULK</span><div class="meter boss"><i id="boss-fill"></i></div></div><button id="mobile-stats">≡ Stats</button></div><div id="arena-overlay" class="arena-overlay"></div><div id="touch-controls" hidden><div id="joystick" aria-label="Joystick de déplacement"><span></span></div><div class="touch-actions"><button id="special">W<span>35 rage</span></button><button id="dash"><span class="arrow" aria-hidden="true"></span><span>DASH</span></button></div></div></div><div class="arena-bottom"><span>ARÈNE FERMÉE · ${SURVIVAL_SECONDS} S + BOSS</span><span>100 % MUSCLE / 0 % SÉRIEUX</span></div></section><aside id="run-panel" class="run-panel"></aside></div><section id="content" hidden></section></section></main>
<footer><span>WHEY OF THE SLIME</span><span>Du muscle. De la gelée. Aucun jour de repos.</span><span>SANS COMPTE · SANS SERVEUR</span></footer><div id="toast" role="status" aria-live="polite"></div><dialog id="dialog"></dialog><input type="file" id="import-file" accept="application/json,.json" hidden>`;
const renderer = new Renderer($("#arena"));
function toast(message, important = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = "show" + (important ? " important" : "");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = ""), important ? 8000 : 4200);
}
function updateWallet() {
  $("#body-wallet").innerHTML = jelly(save.body);
  $("#gear-wallet").innerHTML = jelly(save.gear);
  $("#mute").textContent = save.muted ? "OFF" : "ON";
  $("#mute").setAttribute(
    "aria-label",
    save.muted ? "Activer le son" : "Couper le son",
  );
}
function renderPanel() {
  const panel = $("#run-panel");
  if (game && !game.ended) {
    panel.innerHTML = `<div class="eyebrow">SESSION EN COURS</div><h2>Pas de repos.<br><em>Que du muscle.</em></h2><div class="stat-grid"><div><small>SLIMES ÉCLATÉS</small><strong id="kills-stat">${game.kills}</strong></div><div><small>PALIER</small><strong>0${difficulty}</strong></div></div><div class="panel-divider"></div><div class="eyebrow">DANS CHAQUE MAIN</div>${save.weapons.map((w, i) => `<div class="weapon-mini"><span style="color:${WEAPONS[w].color}">${WEAPONS[w].icon}</span><div>${WEAPONS[w].name}<small>Main ${i ? "droite" : "gauche"} · niv. ${save.levels[w]}</small></div></div>`).join("")}<div class="panel-divider"></div><div class="eyebrow">RAMASSÉ CETTE SESSION</div><h3>Personnage</h3><div id="run-body">${jelly(game.gainedBody)}</div><h3>Armement</h3><div id="run-gear">${jelly(game.gainedGear)}</div><div class="tip"><b>Le conseil du coach</b>Enchaîne les éliminations pour garder ta rage. Le pouvoir combiné consomme 35 points de rage.</div><button class="button secondary full" id="panel-pause">Pause / statistiques</button>`;
    $("#panel-pause").onclick = () => pause();
    return;
  }
  panel.innerHTML = `<div class="eyebrow">CHOISIS TA DOSE</div><h2>Petit slime.<br><em>Gros problème.</em></h2><p class="muted">${SURVIVAL_SECONDS} secondes d’effort. Un boss bien épais. Toute la gelée est à toi, même en cas de défaite.</p><div class="difficulty-list">${titles.map((title, i) => `<button class="difficulty ${difficulty === i + 1 ? "selected" : ""}" data-difficulty="${i + 1}" ${save.unlocked < i + 1 ? "disabled" : ""}><span class="difficulty-number">0${i + 1}</span><span>${title}<small>${i === 0 ? "La première prise de masse" : i === 1 ? "Ça commence à coller" : "Réservé aux gros bras"}</small></span><b>${save.unlocked < i + 1 ? "⌑" : difficulty === i + 1 ? "●" : "○"}</b></button>`).join("")}</div><div class="panel-divider"></div><div class="eyebrow">LE DUO DU JOUR <button class="text-link" id="change-gear">CHANGER <span class="arrow" aria-hidden="true"></span></button></div>${save.weapons.map((w, i) => `<div class="weapon-mini"><span style="color:${WEAPONS[w].color}">${WEAPONS[w].icon}</span><div>${WEAPONS[w].name}<small>Main ${i ? "droite" : "gauche"} · niv. ${save.levels[w]}</small></div></div>`).join("")}<button class="button primary full" id="start">C’EST PARTI <span><span class="arrow" aria-hidden="true"></span></span></button><div class="hint">Pas de perte de gelée. Juste un peu d’ego.</div>`;
  panel.querySelectorAll("[data-difficulty]").forEach(
    (b) =>
      (b.onclick = () => {
        difficulty = Number(b.dataset.difficulty);
        renderPanel();
      }),
  );
  $("#change-gear").onclick = () => setTab("gear");
  $("#start").onclick = start;
}
function renderOverlay() {
  const el = $("#arena-overlay");
  if (!game) {
    el.className = "arena-overlay intro";
    el.innerHTML = `<div class="arena-badge">BIENVENUE AU GYM</div><h2>BEAST MODE.<br><span>SLIME EDITION.</span></h2><p>Ils sont mous.<br>Tu ne l’es pas.</p><div class="controls-hint"><span>ZQSD / WASD / FLÈCHES</span><span>ESPACE · DASH &nbsp; E · SPÉCIAL</span><span class="mobile-hint">JOYSTICK · DASH · POUVOIR COMBINÉ</span></div>`;
    return;
  }
  if (overlay === "pause") {
    el.className = "arena-overlay paused";
    el.innerHTML = `<div class="overlay-card"><span class="eyebrow">ON SOUFFLE UN COUP</span><h2>Pause protéinée.</h2><p>Le chrono et les slimes attendront.</p><div class="pause-stats"><span>Éliminations <b>${game.kills}</b></span><span>Temps <b>${formatTime(game.time)}</b></span><span>Bonus de dégâts rage <b>+${Math.round(game.rage * (0.35 + save.skills[2] * 0.12))} %</b></span></div><button id="resume" class="button primary full">REPRENDRE <span class="arrow" aria-hidden="true"></span></button><button id="leave" class="button secondary full">Quitter et garder mes gelées</button></div>`;
    $("#resume").onclick = resume;
    $("#leave").onclick = leave;
    return;
  }
  if (game.ended) {
    el.className = "arena-overlay paused";
    el.innerHTML = `<div class="overlay-card"><span class="eyebrow">${endResult?.win ? "BOSS ÉCLATÉ. EGO GONFLÉ." : "LA FONTE ATTENDRA."}</span><h2>${endResult?.win ? "Bien joué, gros bras." : "Même les muscles fondent."}</h2><p>${endResult?.win ? (difficulty < 3 ? "La difficulté suivante est débloquée." : "Tu as conquis les trois salles !") : "Chaque run te rend plus fort. Tes gelées sont en sécurité."}</p><div class="result-numbers"><strong>${game.kills}<small>SLIMES</small></strong><strong>${formatTime(game.time)}<small>SURVIE</small></strong></div><h3>Personnage</h3><div>${jelly(game.gainedBody)}</div><h3>Armement</h3><div>${jelly(game.gainedGear)}</div><button id="return" class="button primary full">AU VESTIAIRE <span class="arrow" aria-hidden="true"></span></button></div>`;
    $("#return").onclick = () => {
      game = null;
      overlay = null;
      finishToLobby();
      setTab("play");
    };
    return;
  }
  el.className = "arena-overlay empty";
  el.replaceChildren();
}
function setTab(next) {
  if (game && !game.ended && next !== "play") {
    pause();
    return;
  }
  tab = next;
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("#play-layout").hidden = tab !== "play";
  $("#content").hidden = tab === "play";
  const headings = {
    play: [
      "SURVIVRE. SOULEVER. RECOMMENCER.",
      "C’est l’heure du <em>bulk.</em>",
    ],
    body: ["UNE RÉPÉTITION DE PLUS.", "Fabrique ton <em>monstre.</em>"],
    gear: ["DEUX MAINS. ZÉRO FINESSE.", "La salle des <em>machines.</em>"],
    codex: ["LE SAVOIR, C’EST DU MUSCLE.", "Petites <em>découvertes.</em>"],
  };
  $("#section-kicker").textContent = headings[tab][0];
  $("#section-title").innerHTML = headings[tab][1];
  updateWallet();
  if (tab === "play") {
    renderPanel();
    renderOverlay();
  } else if (tab === "body") renderBody();
  else if (tab === "gear") renderGear();
  else renderCodex();
}
function start() {
  sound.unlock();
  keys.clear();
  resetStick();
  overlay = null;
  endResult = null;
  game = new Arena(save, difficulty, (type, data) => {
    if (type === "loot") {
      save.body[data.color] += data.body;
      save.gear[data.color] += data.gear;
      save.earnedBody[data.color] += data.body;
      save.earnedGear[data.color] += data.gear;
      persist();
    }
    if (type === "special") {
      sound.play("special");
      if (!save.codex.includes(data)) {
        save.codex.push(data);
        persist();
        toast(`Combinaison découverte : ${COMBOS[data][0]} !`);
      }
    }
    if (
      type === "kill" ||
      type === "hurt" ||
      type === "dash" ||
      type === "attack"
    )
      sound.play(type);
    if (type === "boss")
      toast("LE ROI DU BULK arrive. Évite son cercle rouge !", true);
    if (type === "end") {
      endResult = data;
      save.runs++;
      save.bestKills = Math.max(save.bestKills, data.kills);
      if (data.win)
        save.unlocked = Math.max(save.unlocked, Math.min(3, difficulty + 1));
      persist();
      keys.clear();
      resetStick();
      renderOverlay();
    }
  });
  setTab("play");
  $("#hud").hidden = false;
  $("#touch-controls").hidden = false;
  $("#arena-label").textContent = titles[difficulty - 1].toUpperCase();
  document.body.classList.add("playing");
  $("#arena").setAttribute("tabindex", "0");
  $("#arena").focus({ preventScroll: true });
}
function pause() {
  if (!game || game.ended) return;
  game.paused = true;
  overlay = "pause";
  keys.clear();
  resetStick();
  renderOverlay();
  $("#resume")?.focus({ preventScroll: true });
}
function resume() {
  if (!game || game.ended) return;
  game.paused = false;
  overlay = null;
  renderOverlay();
  $("#arena").focus({ preventScroll: true });
}
function leave() {
  game = null;
  overlay = null;
  persist();
  document.body.classList.remove("playing");
  $("#hud").hidden = true;
  $("#touch-controls").hidden = true;
  setTab("play");
  toast("Session quittée. Toutes les gelées collectées sont conservées.");
}
function finishToLobby() {
  document.body.classList.remove("playing");
  $("#hud").hidden = true;
  $("#touch-controls").hidden = true;
}
function renderBody() {
  const descriptions = [
    "+15 % de dégâts par rang. La subtilité, c’est surfait.",
    "+25 PV, déplacement et recharge du dash améliorés par rang.",
    "La rage amplifie davantage les dégâts et monte plus vite.",
  ];
  $("#content").innerHTML =
    `<div class="content-note">Les talents sont permanents, mais jamais définitifs : retire un rang pour récupérer son coût exact. Chaque branche utilise sa couleur de gelée.</div><div class="talent-grid">${skillNames.map((name, i) => `<article class="card talent-card"><span class="eyebrow">BRANCHE 0${i + 1} · GELÉE ${colors[i].toUpperCase()}</span><div class="talent-icon">${["✦", "♥", "ϟ"][i]}</div><h2>${name}</h2><p>${descriptions[i]}</p><div class="nodes">${Array.from({ length: 5 }, (_, n) => `<span class="${save.skills[i] > n ? "filled" : ""}">${n + 1}</span>`).join("")}</div><div class="talent-actions"><button class="button secondary" data-body-minus="${i}" ${!save.skills[i] ? "disabled" : ""}>− Retirer</button><button class="button primary" data-body-plus="${i}" ${save.skills[i] >= 5 || save.body[i] < talentCost(save.skills[i]) ? "disabled" : ""}>${save.skills[i] >= 5 ? "MAX" : `+ ${costText(talentCost(save.skills[i]), i)}`}</button></div></article>`).join("")}</div><div class="content-note">Gelée azur à partir du palier 2, violette au palier 3. Les anciens paliers restent accessibles pour farmer.</div>${presetUI("body")}`;
  $("[data-body-plus]");
  document.querySelectorAll("[data-body-plus]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.bodyPlus,
          c = talentCost(save.skills[i]);
        if (save.skills[i] < 5 && save.body[i] >= c) {
          save.body[i] -= c;
          save.skills[i]++;
          changed("body");
        }
      }),
  );
  document.querySelectorAll("[data-body-minus]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.bodyMinus;
        if (save.skills[i]) {
          save.skills[i]--;
          save.body[i] += talentCost(save.skills[i]);
          changed("body");
        }
      }),
  );
  bindPresets("body");
}
function renderGear() {
  const talents = ["Brûlure", "Ralentissement", "Fragilité"];
  $("#content").innerHTML =
    `<div class="content-note">Un niveau commun par famille d’arme. Deux arbres indépendants. Une seule configuration pour ton duo complet.</div><div class="weapon-shop">${Object.entries(
      WEAPONS,
    )
      .map(([id, w]) => {
        const level = save.levels[id],
          cost = level ? weaponCost(level) : 15;
        return `<article class="card shop-card"><div class="shop-icon" style="color:${w.color}">${w.icon}</div><div><h3>${w.name} <small>${level ? "NIV. " + level : "À DÉBLOQUER"}</small></h3><p>${w.subtitle}</p></div><button class="button ${level ? "secondary" : "primary"}" data-buy="${id}" ${level >= 5 || save.gear[0] < cost ? "disabled" : ""}>${level >= 5 ? "MAX" : `${level ? "Améliorer" : "Acheter"} ${costText(cost)}`}</button></article>`;
      })
      .join("")}</div><div class="hands-grid">${[0, 1]
      .map(
        (hand) =>
          `<article class="card hand-card"><div class="eyebrow">MAIN ${hand ? "DROITE" : "GAUCHE"}</div><label class="sr-only" for="weapon-${hand}">Arme main ${hand ? "droite" : "gauche"}</label><select id="weapon-${hand}" data-hand="${hand}">${Object.entries(
            WEAPONS,
          )
            .filter(([id]) => save.levels[id])
            .map(
              ([id, w]) =>
                `<option value="${id}" ${save.weapons[hand] === id ? "selected" : ""}>${w.name} · niveau ${save.levels[id]}</option>`,
            )
            .join(
              "",
            )}</select><p>Les talents de cette main sont conservés quand tu changes d’arme.</p>${talents.map((name, i) => `<div class="effect-row"><div><b>${["♨", "❄", "◇"][i]} ${name}</b><small>${["10 dégâts/s · durée accrue", "Vitesse ennemie réduite de 50 %", "La cible subit +30 % de dégâts"][i]}</small><span class="effect-ranks">${Array.from({ length: 3 }, (_, n) => `<i class="${save.talents[hand][i] > n ? "filled" : ""}"></i>`).join("")}</span></div><div class="effect-buttons"><button aria-label="Retirer ${name} main ${hand + 1}" data-remove="${hand},${i}" ${!save.talents[hand][i] ? "disabled" : ""}>−</button><button aria-label="Acheter ${name} main ${hand + 1}" data-add="${hand},${i}" ${save.talents[hand][i] >= 3 || save.gear[i] < talentCost(save.talents[hand][i]) ? "disabled" : ""}>+ ${costText(talentCost(save.talents[hand][i]), i)}</button></div></div>`).join("")}</article>`,
      )
      .join(
        "",
      )}</div><div class="combo-strip"><span>✦</span><div><b>Pouvoir combiné · 35 rage</b><p>${save.codex.includes(comboKey(save.weapons)) ? COMBOS[comboKey(save.weapons)][0] : "Combinaison inconnue. Utilise-la en combat pour la découvrir."}</p></div></div>${presetUI("gear")}`;
  document.querySelectorAll("[data-buy]").forEach(
    (b) =>
      (b.onclick = () => {
        const w = b.dataset.buy,
          level = save.levels[w],
          cost = level ? weaponCost(level) : 15;
        if (level < 5 && save.gear[0] >= cost) {
          save.gear[0] -= cost;
          save.levels[w]++;
          changed("gear");
          toast(`${WEAPONS[w].name} ${level ? "améliorés" : "débloqués"} !`);
        }
      }),
  );
  document.querySelectorAll("[data-hand]").forEach(
    (s) =>
      (s.onchange = () => {
        save.weapons[+s.dataset.hand] = s.value;
        changed("gear");
      }),
  );
  for (const action of ["add", "remove"])
    document.querySelectorAll(`[data-${action}]`).forEach(
      (b) =>
        (b.onclick = () => {
          const [hand, i] = b.dataset[action].split(",").map(Number),
            n = save.talents[hand][i];
          if (action === "add" && n < 3 && save.gear[i] >= talentCost(n)) {
            save.gear[i] -= talentCost(n);
            save.talents[hand][i]++;
          } else if (action === "remove" && n > 0) {
            save.talents[hand][i]--;
            save.gear[i] += talentCost(n - 1);
          }
          changed("gear");
        }),
    );
  bindPresets("gear");
}
function presetUI(kind) {
  const presets = kind === "body" ? save.bodyPresets : save.gearPresets;
  return `<article class="card preset-card"><div><span class="eyebrow">CONFIGURATIONS ${kind === "body" ? "DU PERSONNAGE" : "DU DUO"}</span><h3>Garde ta recette.</h3><p>12 configurations maximum. Le chargement rembourse les talents actuels et vérifie le coût complet avant tout changement.</p></div><div class="preset-form"><label class="sr-only" for="preset-name">Nom de la configuration</label><input id="preset-name" maxlength="32" placeholder="Ex. Le shaker du dimanche" value="${escaped(nameInput)}"><button class="button secondary" id="save-preset">Sauvegarder</button></div><div class="presets">${presets.length ? presets.map((p, i) => `<div><span>${escaped(p.name)}</span><button data-load="${i}" class="text-link">Équiper <span class="arrow" aria-hidden="true"></span></button><button data-delete="${i}" class="text-link" aria-label="Supprimer ${escaped(p.name)}">×</button></div>`).join("") : '<span class="muted">Aucune recette enregistrée. À toi de jouer.</span>'}</div></article>`;
}
function bindPresets(kind) {
  const presets = kind === "body" ? save.bodyPresets : save.gearPresets;
  $("#preset-name").oninput = (e) => (nameInput = e.target.value);
  $("#save-preset").onclick = () => {
    const name = nameInput.trim();
    if (!name) {
      toast("Donne un nom à ta configuration.");
      return;
    }
    const index = presets.findIndex((p) => p.name === name);
    if (index < 0 && presets.length >= 12) {
      toast("12 configurations maximum. Supprime une ancienne recette.");
      return;
    }
    const p =
      kind === "body"
        ? { name, skills: [...save.skills] }
        : {
            name,
            weapons: [...save.weapons],
            talents: save.talents.map((t) => [...t]),
          };
    if (index >= 0) presets[index] = p;
    else presets.push(p);
    nameInput = "";
    changed(kind);
    toast("Configuration sauvegardée.");
  };
  document.querySelectorAll("[data-load]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = presets[+b.dataset.load];
        if (kind === "body") {
          const wallet = replaceTalents(save.body, save.skills, p.skills);
          if (!wallet) {
            toast(
              "Pas assez de gelée pour cette configuration. Aucun changement effectué.",
            );
            return;
          }
          save.body = wallet;
          save.skills = [...p.skills];
        } else {
          const wallet = replaceGear(save, p);
          if (!wallet) {
            toast(
              "Armes non débloquées ou gelées insuffisantes. Aucun changement effectué.",
            );
            return;
          }
          save.gear = wallet;
          save.weapons = [...p.weapons];
          save.talents = p.talents.map((t) => [...t]);
        }
        changed(kind);
        toast(`Configuration « ${p.name} » équipée.`);
      }),
  );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        presets.splice(+b.dataset.delete, 1);
        changed(kind);
      }),
  );
}
function changed(kind) {
  persist();
  updateWallet();
  kind === "body" ? renderBody() : renderGear();
}
function renderCodex() {
  $("#content").innerHTML =
    `<div class="codex-summary"><strong>${save.codex.length}<span>/ 6</span></strong><div><h2>Recettes de destruction.</h2><p>Utilise un pouvoir combiné en combat pour découvrir son nom et son effet.</p></div></div><div class="codex-grid">${Object.entries(
      COMBOS,
    )
      .map(([key, c]) => {
        const known = save.codex.includes(key);
        return `<article class="card codex-card ${known ? "known" : ""}"><div class="eyebrow">${known ? "COMBINAISON DÉCOUVERTE" : "RECETTE SECRÈTE"}</div><div class="codex-symbol">${known ? "✦" : "?"}</div><h3>${known ? c[0] : "Un peu de mystère."}</h3><p>${known ? c[1] : "Deux armes, une idée probablement mauvaise."}</p><small>${
          known
            ? key
                .split("+")
                .map((w) => WEAPONS[w].name)
                .join(" + ")
            : "À découvrir dans l’arène"
        }</small></article>`;
      })
      .join(
        "",
      )}</div><div class="card bestiary"><h2>Connais ta gelée.</h2><div><p><b class="green">● Vert · Classique</b> Poursuit le joueur. Résiste partiellement à la brûlure.</p><p><b class="blue">◆ Bleu · Sprinteur</b> Petit et rapide. Résiste partiellement au ralentissement.</p><p><b class="purple">▲ Violet · Chargeur</b> Massif. Annonce une charge. Résiste partiellement à la fragilité.</p></div><p>La couleur indique le type ; la taille, la puissance. Le boss géant reprend la couleur du palier et déclenche une onde de choc annoncée au sol.</p></div>`;
}
function showDialog(content) {
  const d = $("#dialog");
  d.innerHTML = `<button class="dialog-close icon-button" aria-label="Fermer">×</button>${content}`;
  d.querySelector(".dialog-close").onclick = () => d.close();
  d.showModal();
}
$("#storage").onclick = () => {
  showDialog(
    `<span class="eyebrow">LOCAL, ET ÇA RESTE LOCAL.</span><h2>Tes progrès, dans ta poche.</h2><p>La sauvegarde reste dans ce navigateur. Effacer les données du site l’efface aussi. Exporte un fichier pour la conserver ou changer d’appareil.</p><button id="export" class="button primary full">Exporter la sauvegarde ↓</button><button id="import" class="button secondary full">Importer une sauvegarde ↑</button><p class="muted">L’import remplace la progression actuelle après confirmation. Aucun fichier n’est envoyé à un serveur.</p>`,
  );
  $("#export").onclick = () => {
    const blob = new Blob([JSON.stringify(save, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "whey-of-the-slime-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("#import").onclick = () => $("#import-file").click();
};
$("#mobile-storage").onclick = () => {
  if (game && !game.ended) pause();
  $("#storage").click();
};
$("#import-file").onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error("Fichier trop volumineux.");
    const imported = validateSave(JSON.parse(await file.text()));
    if (!confirm("Remplacer la progression actuelle par cette sauvegarde ?"))
      return;
    save = imported;
    sound.muted = save.muted;
    persist();
    $("#dialog").close();
    setTab(tab);
    toast("Sauvegarde importée.");
  } catch (error) {
    toast(`Import refusé : ${error.message}`, true);
  } finally {
    e.target.value = "";
  }
};
$("#help").onclick = () => {
  if (game && !game.ended) pause();
  showDialog(
    `<span class="eyebrow">LE BRIEF DU COACH</span><h2>Un programme simple.</h2><p>Survis ${SURVIVAL_SECONDS} secondes, puis bats le boss. Les slimes continuent d’arriver pendant le boss. Garde tes gelées même si tu perds ou quittes le combat.</p><ul><li>Déplacement : ZQSD, WASD, flèches ou joystick tactile.</li><li>Dash : Espace ou bouton <span class="arrow" aria-hidden="true"></span>. Invulnérable brièvement.</li><li>Pouvoir combiné : E ou W tactile, coûte 35 rage.</li><li>Pause : Échap, P ou bouton II.</li><li>Les attaques visent automatiquement.</li></ul><p>Les gelées d’armement sont un drop supplémentaire à 30 %. Les couleurs azur et violette se débloquent aux paliers 2 et 3. Dépense tes gelées entre les runs.</p><p>Les talents de brûlure, ralentissement et fragilité amplifient aussi ton pouvoir combiné.</p>`,
  );
};
$("#mute").onclick = () => {
  sound.unlock();
  save.muted = !save.muted;
  sound.muted = save.muted;
  persist();
  updateWallet();
};
$(".brand").onclick = (e) => {
  e.preventDefault();
  if (game && !game.ended) pause();
  else {
    game = null;
    finishToLobby();
    setTab("play");
  }
};
$("[data-tab]");
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      if (game?.ended) {
        game = null;
        finishToLobby();
      }
      setTab(b.dataset.tab);
    }),
);
$("#pause").onclick = pause;
$("#mobile-stats").onclick = pause;
$("#dash").onpointerdown = (e) => {
  e.preventDefault();
  sound.unlock();
  game?.dash();
};
$("#special").onpointerdown = (e) => {
  e.preventDefault();
  sound.unlock();
  if (game && !game.special() && game.rage < 35)
    toast("Il faut 35 rage. Enchaîne les éliminations !");
};
function resetStick() {
  stick = { x: 0, y: 0 };
  joystickPointer = null;
  $("#joystick span").style.transform = "translate(0px,0px)";
}
const joystick = $("#joystick");
function moveStick(e) {
  if (joystickPointer !== e.pointerId) return;
  const r = joystick.getBoundingClientRect(),
    x = e.clientX - r.left - r.width / 2,
    y = e.clientY - r.top - r.height / 2,
    len = Math.hypot(x, y),
    max = r.width * 0.32;
  stick = { x: x / Math.max(max, len), y: y / Math.max(max, len) };
  $("#joystick span").style.transform =
    `translate(${stick.x * max}px,${stick.y * max}px)`;
}
joystick.onpointerdown = (e) => {
  e.preventDefault();
  sound.unlock();
  joystickPointer = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  moveStick(e);
};
joystick.onpointermove = moveStick;
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  joystick.addEventListener(event, (e) => {
    if (e.pointerId === joystickPointer) resetStick();
  });
window.addEventListener("keydown", (e) => {
  if (
    ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
      document.activeElement?.tagName,
    ) ||
    $("#dialog").open
  )
    return;
  const k = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
    e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === "escape" || k === "p") {
    if (game?.paused) resume();
    else pause();
  }
  if (k === " ") game?.dash();
  if (k === "e") game?.special();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  if (game && !game.ended) pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game && !game.ended) pause();
});
window.addEventListener("pagehide", persist);
function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - last) / 1000 || 0);
  last = timestamp;
  const input = {
    x:
      stick.x +
      (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
      (keys.has("a") || keys.has("q") || keys.has("arrowleft") ? 1 : 0),
    y:
      stick.y +
      (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
      (keys.has("w") || keys.has("z") || keys.has("arrowup") ? 1 : 0),
  };
  if (game) game.update(dt, input);
  if (tab === "play")
    renderer.draw(
      game,
      timestamp / 1000,
      Math.hypot(input.x, input.y) > 0.1 && !game?.paused,
    );
  uiClock += dt;
  if (uiClock > 0.1 && game) {
    uiClock = 0;
    const p = game.player;
    $("#timer").textContent = game.boss
      ? "BOSS"
      : formatTime(Math.max(0, SURVIVAL_SECONDS - game.time));
    $("#hp-label").textContent = `${Math.ceil(p.hp)} / ${p.maxHp} PV`;
    $("#hp-fill").style.width = `${(p.hp / p.maxHp) * 100}%`;
    $("#rage-fill").style.width = `${game.rage}%`;
    $("#rage-label").textContent = `${Math.floor(game.rage)} %`;
    $("#dash").classList.toggle("cooldown", p.dash > 0);
    $("#dash span").textContent =
      p.dash > 0 ? p.dash.toFixed(1) + " s" : "DASH";
    $("#special").classList.toggle("ready", game.rage >= 35);
    $("#boss-hud").hidden = !game.boss;
    if (game.boss)
      $("#boss-fill").style.width =
        `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
    if ($("#kills-stat")) $("#kills-stat").textContent = game.kills;
    if ($("#run-body")) $("#run-body").innerHTML = jelly(game.gainedBody);
    if ($("#run-gear")) $("#run-gear").innerHTML = jelly(game.gainedGear);
    updateWallet();
  }
  requestAnimationFrame(loop);
}
setTab("play");
requestAnimationFrame(loop);
if (warning) toast(warning, true);
