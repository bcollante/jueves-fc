const POSITIONS = ["Arquero", "Defensa", "Medio", "Delantero"];
const FIELD_POSITIONS = ["Defensa", "Medio", "Delantero"];
const STORE_KEY = "jueves-fc-state-v1";

const samplePlayers = [
  ["Andres", 5, ["Medio", "Delantero"]],
  ["Beto", 3, ["Defensa", "Medio"]],
  ["Carlos", 4, ["Defensa"]],
  ["Dani", 2, ["Delantero"]],
  ["Esteban", 4, ["Arquero", "Defensa"]],
  ["Fede", 3, ["Medio"]],
  ["Gabo", 5, ["Delantero"]],
  ["Hugo", 2, ["Defensa"]],
  ["Ivan", 3, ["Arquero", "Medio"]],
  ["Juan", 4, ["Medio", "Delantero"]],
  ["Leo", 1, ["Defensa"]],
  ["Mateo", 3, ["Medio"]]
];

let state = loadState();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  viewTitle: $("#viewTitle"),
  playerCount: $("#playerCount"),
  availableCount: $("#availableCount"),
  matchCount: $("#matchCount"),
  playersTable: $("#playersTable"),
  playerForm: $("#playerForm"),
  bulkPlayersForm: $("#bulkPlayersForm"),
  bulkPlayersText: $("#bulkPlayersText"),
  bulkImportFeedback: $("#bulkImportFeedback"),
  seedPlayersBtn: $("#seedPlayersBtn"),
  matchForm: $("#matchForm"),
  matchDate: $("#matchDate"),
  teamSize: $("#teamSize"),
  matchPlace: $("#matchPlace"),
  matchSummary: $("#matchSummary"),
  availableGrid: $("#availableGrid"),
  markAllBtn: $("#markAllBtn"),
  clearAvailableBtn: $("#clearAvailableBtn"),
  drawBtn: $("#drawBtn"),
  teamAList: $("#teamAList"),
  teamBList: $("#teamBList"),
  teamAFormation: $("#teamAFormation"),
  teamBFormation: $("#teamBFormation"),
  drawInsight: $("#drawInsight"),
  resultForm: $("#resultForm"),
  goalsA: $("#goalsA"),
  goalsB: $("#goalsB"),
  matchHistory: $("#matchHistory"),
  rankingTable: $("#rankingTable")
};

function loadState() {
  const fallback = {
    players: [],
    match: {
      date: new Date().toISOString().slice(0, 10),
      teamSize: 5,
      place: ""
    },
    draw: null,
    results: []
  };

  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[char];
  });
}

function normalizeToken(value) {
  return String(value).trim().toLowerCase();
}

function normalizePosition(value) {
  const token = normalizeToken(value);
  if (!token) return null;
  if (["arquero", "portero", "arco"].includes(token)) return "Arquero";
  if (["defensa", "def", "central", "lateral"].includes(token)) return "Defensa";
  if (["medio", "volante", "mediocampo", "media"].includes(token)) return "Medio";
  if (["delantero", "del", "ataque", "atacante", "punta"].includes(token)) return "Delantero";
  return POSITIONS.find((position) => normalizeToken(position) === token) || null;
}

function parsePositions(value) {
  const positions = String(value || "")
    .split(/[,+/|]/)
    .map(normalizePosition)
    .filter(Boolean);

  return [...new Set(positions)];
}

function splitBulkLine(line) {
  if (line.includes(";")) return line.split(";");
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(",")) return line.split(",");
  if (line.includes(" - ")) return line.split(" - ");
  return [line];
}

function parseBulkPlayers(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = splitBulkLine(line).map((part) => part.trim()).filter(Boolean);
      const rawRating = Number(parts[1]);
      const hasRating = Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5;
      const positionsText = hasRating ? parts.slice(2).join(",") : parts.slice(1).join(",");

      return {
        name: parts[0],
        rating: hasRating ? rawRating : 3,
        positions: parsePositions(positionsText)
      };
    })
    .filter((player) => player.name);
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function availablePlayers() {
  return state.players.filter((player) => player.available);
}

function teamTotal(team) {
  return team.reduce((sum, player) => sum + Number(player.rating), 0);
}

function positionCounts(team) {
  return POSITIONS.reduce((counts, position) => {
    counts[position] = team.filter((player) => player.positions.includes(position)).length;
    return counts;
  }, {});
}

function formationTargets(team) {
  const hasKeeper = team.some((player) => player.positions.includes("Arquero"));
  const keeperCount = hasKeeper ? 1 : 0;
  const fielders = Math.max(team.length - keeperCount, 0);
  const profiles = {
    0: [0, 0, 0],
    1: [1, 0, 0],
    2: [1, 0, 1],
    3: [1, 1, 1],
    4: [1, 2, 1],
    5: [2, 2, 1],
    6: [2, 2, 2],
    7: [2, 3, 2],
    8: [3, 3, 2],
    9: [3, 4, 2],
    10: [4, 4, 2]
  };
  const profile =
    profiles[fielders] ||
    (() => {
      const defense = Math.max(1, Math.round(fielders * 0.36));
      const midfield = Math.max(1, Math.round(fielders * 0.38));
      return [defense, midfield, Math.max(1, fielders - defense - midfield)];
    })();

  return {
    Arquero: keeperCount,
    Defensa: profile[0],
    Medio: profile[1],
    Delantero: profile[2]
  };
}

function chooseFormationLine(player, buckets, targets) {
  const eligible = player.positions.filter((position) => FIELD_POSITIONS.includes(position));
  const candidates = eligible.length ? eligible : FIELD_POSITIONS;

  return candidates
    .slice()
    .sort((a, b) => {
      const shortageA = targets[a] - buckets[a].length;
      const shortageB = targets[b] - buckets[b].length;
      return shortageB - shortageA || buckets[a].length - buckets[b].length;
    })[0];
}

function buildFormation(team) {
  const targets = formationTargets(team);
  const buckets = POSITIONS.reduce((result, position) => {
    result[position] = [];
    return result;
  }, {});
  const assigned = new Set();

  if (targets.Arquero) {
    const keeper = team
      .filter((player) => player.positions.includes("Arquero"))
      .sort((a, b) => a.positions.length - b.positions.length || a.name.localeCompare(b.name))[0];

    if (keeper) {
      buckets.Arquero.push(keeper);
      assigned.add(keeper.id);
    }
  }

  team
    .filter((player) => !assigned.has(player.id))
    .sort((a, b) => a.positions.length - b.positions.length || a.name.localeCompare(b.name))
    .forEach((player) => {
      buckets[chooseFormationLine(player, buckets, targets)].push(player);
    });

  const label = POSITIONS.map((position) => buckets[position].length).join("-");
  return { buckets, label };
}

function teamPositionPenalty(team, teamSize) {
  const counts = positionCounts(team);
  const hasKeeper = counts.Arquero > 0;
  const defensiveBase = counts.Defensa + counts.Arquero;
  const attackBase = counts.Delantero + counts.Medio;
  let penalty = 0;

  if (!hasKeeper) penalty += 5;
  if (defensiveBase === 0) penalty += 4;
  if (attackBase === 0) penalty += 4;
  if (teamSize >= 5 && counts.Medio === 0) penalty += 2;

  return penalty;
}

function drawScore(teamA, teamB, teamSize) {
  const ratingDiff = Math.abs(teamTotal(teamA) - teamTotal(teamB));
  const aCounts = positionCounts(teamA);
  const bCounts = positionCounts(teamB);
  const positionDiff = POSITIONS.reduce(
    (sum, position) => sum + Math.abs(aCounts[position] - bCounts[position]),
    0
  );
  const structurePenalty = teamPositionPenalty(teamA, teamSize) + teamPositionPenalty(teamB, teamSize);

  return ratingDiff * 10 + positionDiff * 3 + structurePenalty * 7;
}

function combinations(items, size, limit = 12000) {
  const result = [];
  const combo = [];

  function walk(start) {
    if (result.length >= limit) return;
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let index = start; index <= items.length - (size - combo.length); index += 1) {
      combo.push(items[index]);
      walk(index + 1);
      combo.pop();
    }
  }

  walk(0);
  return result;
}

function makeDraw() {
  const players = availablePlayers();
  const teamSize = Number(state.match.teamSize);
  const needed = teamSize * 2;

  if (players.length < needed) {
    throw new Error(`Faltan ${needed - players.length} jugadores para armar dos equipos de ${teamSize}.`);
  }

  const selected = players
    .slice()
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
    .slice(0, needed);
  const allCombos = combinations(selected, teamSize);
  let best = null;

  for (const teamA of allCombos) {
    const teamAIds = new Set(teamA.map((player) => player.id));
    const teamB = selected.filter((player) => !teamAIds.has(player.id));
    const score = drawScore(teamA, teamB, teamSize);
    const balance = Math.abs(teamTotal(teamA) - teamTotal(teamB));

    if (!best || score < best.score || (score === best.score && balance < best.balance)) {
      best = { teamA, teamB, score, balance };
    }
  }

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    teamA: best.teamA.map((player) => player.id),
    teamB: best.teamB.map((player) => player.id),
    score: best.score
  };
}

function getPlayer(id) {
  return state.players.find((player) => player.id === id);
}

function drawTeams() {
  if (!state.draw) return { teamA: [], teamB: [] };
  return {
    teamA: state.draw.teamA.map(getPlayer).filter(Boolean),
    teamB: state.draw.teamB.map(getPlayer).filter(Boolean)
  };
}

function rankPlayers() {
  const rows = new Map(
    state.players.map((player) => [
      player.id,
      { id: player.id, name: player.name, pts: 0, played: 0, won: 0, tied: 0, lost: 0, gf: 0, gc: 0 }
    ])
  );

  for (const result of state.results) {
    const aWon = result.goalsA > result.goalsB;
    const bWon = result.goalsB > result.goalsA;

    for (const id of result.teamA) {
      const row = rows.get(id);
      if (!row) continue;
      row.played += 1;
      row.gf += result.goalsA;
      row.gc += result.goalsB;
      row.pts += aWon ? 3 : bWon ? 0 : 1;
      row.won += aWon ? 1 : 0;
      row.tied += !aWon && !bWon ? 1 : 0;
      row.lost += bWon ? 1 : 0;
    }

    for (const id of result.teamB) {
      const row = rows.get(id);
      if (!row) continue;
      row.played += 1;
      row.gf += result.goalsB;
      row.gc += result.goalsA;
      row.pts += bWon ? 3 : aWon ? 0 : 1;
      row.won += bWon ? 1 : 0;
      row.tied += !aWon && !bWon ? 1 : 0;
      row.lost += aWon ? 1 : 0;
    }
  }

  return Array.from(rows.values()).sort(
    (a, b) =>
      b.pts - a.pts ||
      b.won - a.won ||
      b.gf - b.gc - (a.gf - a.gc) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name)
  );
}

function playerPills(player) {
  return `<div class="pill-row">${player.positions.map((position) => `<span class="pill">${escapeHtml(position)}</span>`).join("")}</div>`;
}

function ratingEditor(player) {
  return `
    <select class="inline-select" data-action="update-rating" data-id="${player.id}" aria-label="Puntaje de ${escapeHtml(player.name)}">
      ${[1, 2, 3, 4, 5]
        .map((rating) => `<option value="${rating}" ${player.rating === rating ? "selected" : ""}>${rating}</option>`)
        .join("")}
    </select>
  `;
}

function positionEditor(player) {
  return `
    <div class="position-editor" aria-label="Posiciones de ${escapeHtml(player.name)}">
      ${POSITIONS.map(
        (position) => `
          <label>
            <input
              type="checkbox"
              data-action="update-position"
              data-id="${player.id}"
              data-position="${position}"
              ${player.positions.includes(position) ? "checked" : ""}
            />
            ${position}
          </label>
        `
      ).join("")}
    </div>
  `;
}

function renderPlayersTable() {
  if (!state.players.length) {
    elements.playersTable.innerHTML = `<tr><td colspan="5" class="empty">Todavia no hay jugadores.</td></tr>`;
    return;
  }

  elements.playersTable.innerHTML = state.players
    .map(
      (player) => `
        <tr data-player-row="${player.id}">
          <td><strong>${escapeHtml(player.name)}</strong></td>
          <td>${ratingEditor(player)}</td>
          <td>${positionEditor(player)}</td>
          <td>
            <label class="switch">
              <input type="checkbox" data-action="toggle-player" data-id="${player.id}" ${player.available ? "checked" : ""} />
              Si
            </label>
          </td>
          <td><button class="danger" type="button" data-action="delete-player" data-id="${player.id}">Quitar</button></td>
        </tr>
      `
    )
    .join("");
}

function renderMatch() {
  elements.matchDate.value = state.match.date;
  elements.teamSize.value = state.match.teamSize;
  elements.matchPlace.value = state.match.place || "";
  elements.matchSummary.innerHTML = `
    <span>Fecha: <strong>${escapeHtml(state.match.date)}</strong></span>
    <span>Formato: <strong>${state.match.teamSize} vs ${state.match.teamSize}</strong></span>
    <span>Cancha: <strong>${escapeHtml(state.match.place || "Por definir")}</strong></span>
  `;
}

function renderAvailable() {
  if (!state.players.length) {
    elements.availableGrid.innerHTML = `<div class="empty">Agrega jugadores para seleccionar disponibles.</div>`;
    return;
  }

  elements.availableGrid.innerHTML = state.players
    .map(
      (player) => `
        <label class="player-card ${player.available ? "is-selected" : ""}">
          <header>
            <strong>${escapeHtml(player.name)}</strong>
            <span class="rating">${player.rating}/5</span>
          </header>
          ${playerPills(player)}
          <span class="switch">
            <input type="checkbox" data-action="toggle-player" data-id="${player.id}" ${player.available ? "checked" : ""} />
            Disponible
          </span>
        </label>
      `
    )
    .join("");
}

function renderTeam(list, team) {
  list.innerHTML = team.length
    ? team
        .map(
          (player) => `
            <li>
              <span><strong>${escapeHtml(player.name)}</strong><br />${escapeHtml(player.positions.join(", "))}</span>
            </li>
          `
        )
        .join("")
    : `<li class="empty">Sin sorteo todavia.</li>`;
}

function renderFormation(container, team) {
  if (!team.length) {
    container.innerHTML = "";
    return;
  }

  const formation = buildFormation(team);
  container.innerHTML = `
    <div class="formation-meta">
      <span>Formacion ${escapeHtml(formation.label)}</span>
    </div>
    <div class="pitch" aria-label="Formacion del equipo">
      ${POSITIONS.map(
        (position) => `
          <div class="pitch-line">
            <span class="line-label">${position}</span>
            <div class="line-players">
              ${
                formation.buckets[position].length
                  ? formation.buckets[position]
                      .map((player) => `<span class="player-token">${escapeHtml(player.name)}</span>`)
                      .join("")
                  : `<span class="player-token is-empty">Libre</span>`
              }
            </div>
          </div>
        `
      ).join("")}
    </div>
  `;
}

function renderDraw() {
  const { teamA, teamB } = drawTeams();
  renderTeam(elements.teamAList, teamA);
  renderTeam(elements.teamBList, teamB);
  renderFormation(elements.teamAFormation, teamA);
  renderFormation(elements.teamBFormation, teamB);

  if (!state.draw) {
    elements.drawInsight.innerHTML = `<span>Selecciona disponibles y sortea para ver el balance.</span>`;
    return;
  }

  const aCounts = positionCounts(teamA);
  const bCounts = positionCounts(teamB);
  elements.drawInsight.innerHTML = `
    <span>Arqueros: <strong>${aCounts.Arquero}</strong> vs <strong>${bCounts.Arquero}</strong></span>
    <span>Defensa: <strong>${aCounts.Defensa}</strong> vs <strong>${bCounts.Defensa}</strong></span>
    <span>Medio: <strong>${aCounts.Medio}</strong> vs <strong>${bCounts.Medio}</strong></span>
    <span>Delantero: <strong>${aCounts.Delantero}</strong> vs <strong>${bCounts.Delantero}</strong></span>
  `;
}

function renderHistory() {
  if (!state.results.length) {
    elements.matchHistory.innerHTML = `<div class="empty">No hay resultados guardados.</div>`;
    return;
  }

  elements.matchHistory.innerHTML = state.results
    .slice()
    .reverse()
    .map(
      (result) => `
        <div class="history-item">
          <span><strong>${escapeHtml(result.date)}</strong> ${escapeHtml(result.place || "")}</span>
          <span>Equipo A ${result.goalsA} - ${result.goalsB} Equipo B</span>
        </div>
      `
    )
    .join("");
}

function renderRanking() {
  const ranking = rankPlayers();
  if (!ranking.length) {
    elements.rankingTable.innerHTML = `<tr><td colspan="10" class="empty">Todavia no hay ranking.</td></tr>`;
    return;
  }

  elements.rankingTable.innerHTML = ranking
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(row.name)}</strong></td>
          <td>${row.pts}</td>
          <td>${row.played}</td>
          <td>${row.won}</td>
          <td>${row.tied}</td>
          <td>${row.lost}</td>
          <td>${row.gf}</td>
          <td>${row.gc}</td>
          <td>${row.gf - row.gc}</td>
        </tr>
      `
    )
    .join("");
}

function renderStats() {
  elements.playerCount.textContent = state.players.length;
  elements.availableCount.textContent = availablePlayers().length;
  elements.matchCount.textContent = state.results.length;
}

function render() {
  renderStats();
  renderPlayersTable();
  renderMatch();
  renderAvailable();
  renderDraw();
  renderHistory();
  renderRanking();
}

function switchView(viewName) {
  $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewName));
  $$(".view").forEach((view) => view.classList.remove("is-active"));
  $(`#${viewName}View`).classList.add("is-active");
  elements.viewTitle.textContent = $(`.nav-item[data-view="${viewName}"]`).textContent;
}

document.addEventListener("click", (event) => {
  const navItem = event.target.closest(".nav-item");
  const action = event.target.dataset.action;

  if (navItem) {
    switchView(navItem.dataset.view);
    return;
  }

  if (action === "delete-player") {
    const id = event.target.dataset.id;
    state.players = state.players.filter((player) => player.id !== id);
    state.draw = null;
    saveState();
  }
});

document.addEventListener("change", (event) => {
  const action = event.target.dataset.action;

  if (action === "toggle-player") {
    const player = getPlayer(event.target.dataset.id);
    if (!player) return;
    player.available = event.target.checked;
    state.draw = null;
    saveState();
  }

  if (action === "update-rating") {
    const player = getPlayer(event.target.dataset.id);
    if (!player) return;
    player.rating = Number(event.target.value);
    state.draw = null;
    saveState();
  }

  if (action === "update-position") {
    const player = getPlayer(event.target.dataset.id);
    const row = event.target.closest("[data-player-row]");
    if (!player || !row) return;
    const positions = Array.from(row.querySelectorAll('input[data-action="update-position"]:checked')).map(
      (input) => input.dataset.position
    );
    player.positions = positions.length ? positions : ["Medio"];
    state.draw = null;
    saveState();
  }
});

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(elements.playerForm);
  const positions = form.getAll("positions");
  const player = {
    id: uid(),
    name: form.get("name").trim(),
    rating: Number(form.get("rating")),
    positions: positions.length ? positions : ["Medio"],
    available: true
  };

  state.players.push(player);
  elements.playerForm.reset();
  $("#playerRating").value = "3";
  saveState();
});

elements.bulkPlayersForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const existingNames = new Set(state.players.map((player) => normalizeToken(player.name)));
  const parsedPlayers = parseBulkPlayers(elements.bulkPlayersText.value);
  const newPlayers = [];

  for (const player of parsedPlayers) {
    const key = normalizeToken(player.name);
    if (existingNames.has(key)) continue;
    existingNames.add(key);
    newPlayers.push({
      id: uid(),
      name: player.name,
      rating: player.rating,
      positions: player.positions.length ? player.positions : ["Medio"],
      available: true
    });
  }

  if (!newPlayers.length) {
    elements.bulkImportFeedback.textContent = parsedPlayers.length
      ? "La lista no tiene jugadores nuevos."
      : "Pega al menos un nombre.";
    return;
  }

  state.players.push(...newPlayers);
  state.draw = null;
  elements.bulkPlayersText.value = "";
  elements.bulkImportFeedback.textContent = `${newPlayers.length} jugadores importados.`;
  saveState();
});

elements.seedPlayersBtn.addEventListener("click", () => {
  if (state.players.length && !confirm("Esto agregara jugadores de ejemplo a la plantilla actual. Continuar?")) return;
  state.players.push(
    ...samplePlayers.map(([name, rating, positions]) => ({
      id: uid(),
      name,
      rating,
      positions,
      available: true
    }))
  );
  saveState();
});

elements.matchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.match = {
    date: elements.matchDate.value,
    teamSize: Number(elements.teamSize.value),
    place: elements.matchPlace.value.trim()
  };
  state.draw = null;
  saveState();
  switchView("available");
});

elements.markAllBtn.addEventListener("click", () => {
  state.players.forEach((player) => {
    player.available = true;
  });
  state.draw = null;
  saveState();
});

elements.clearAvailableBtn.addEventListener("click", () => {
  state.players.forEach((player) => {
    player.available = false;
  });
  state.draw = null;
  saveState();
});

elements.drawBtn.addEventListener("click", () => {
  try {
    state.draw = makeDraw();
    saveState();
  } catch (error) {
    elements.drawInsight.innerHTML = `<span>${error.message}</span>`;
  }
});

elements.resultForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.draw) {
    elements.matchHistory.innerHTML = `<div class="empty">Primero debes sortear equipos.</div>`;
    return;
  }

  state.results.push({
    id: uid(),
    date: state.match.date,
    place: state.match.place,
    goalsA: Number(elements.goalsA.value),
    goalsB: Number(elements.goalsB.value),
    teamA: [...state.draw.teamA],
    teamB: [...state.draw.teamB]
  });
  state.draw = null;
  saveState();
  switchView("ranking");
});

render();
